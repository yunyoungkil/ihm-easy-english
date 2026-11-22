// 비교 시트의 결과 기록(근거 누적). 2026-11-13 사용자 결정: 근거는 갈아 끼우지 않고 더한다.
// 영상이 공개되고 첫 7일 수치(video-lifetime.json의 first7d)가 생기면, 그 영상의 BRIEF.md "비교 시트:" 줄이 가리키는 시트에
//  - sheet.results[]: 이 영상의 세 지표와 기준선 판정(갱신 기준 초과 / 편차 안 / 기준선 이하 / 기준선 없음)
//  - borrowed[].evidenceLog[]: 가져온 것마다 같은 영상의 지표별 결과(어떤 변수를 시험했는지 함께)
// 를 덧붙인다. 한 영상은 한 번만 기록한다. 판정은 이 영상이 들어가기 전의 baselines.json으로 한다(그래서 baselines 단계보다 먼저 돈다).
// 한 요소를 한 영상에 귀속하기 어려우니 시험한 변수(testVariables)를 함께 적어, 읽는 사람이 어느 변수 때문인지 가늠하게 한다.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {computeBaselines, judgeVideoMetrics, METRICS, stayedObservation, USUAL_RESULTS, USUAL_RULE} from './baseline.mjs';
import {loadEpisodeOutcomes, MIN_VIEWS_7D} from './planning-outcome.mjs';
import {loadSheets, sheetIdOf, sheetsDir} from './transform-sheet.mjs';
import {FIRST28D_READY_DAYS} from './video-lifetime.mjs';
import {MAX_ATTEMPTS as STUDIO_MAX_ATTEMPTS} from './studio-first7d.mjs';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(projectDir, 'data', 'youtube');

/**
 * first7d(영상별 수치, API)에서 기준선 세 지표 값을 꺼낸다. 첫 7일 수치가 없으면 null.
 * studio(studio-first7d.json의 영상 기록)가 있고 쓸 수 있는 값이면(창이 API와 맞고 빠진 날이 없음) 노출수·클릭률도 더한다.
 */
export function metricsFromFirst7d(first7d, studio = null, stayed = null) {
  if (!first7d) return null;
  const base = {views7d: first7d.views ?? null, watchSeconds7d: first7d.averageViewDuration ?? null, subs7d: first7d.subscribersGained ?? null};
  if (studio?.usable === true && studio.impressions !== null && studio.impressions !== undefined) {
    base.impressions7d = studio.impressions;
    base.ctr7d = studio.ctrPercent ?? null; // 노출이 0이면 클릭률을 계산할 수 없다(0%로 적지 않는다)
  }
  // 쇼츠 계속 시청함(2026-11-15, 스타일 시험 1차 지표): baseline.mjs stayedObservation이 쓸 수 있다고 본 기간 값만 넣는다(없으면 칸을 만들지 않는다).
  if (stayed && Number.isFinite(Number(stayed.value)) && stayed.value !== null) base.stayedToWatch = Number(stayed.value);
  return base;
}

/** 클릭률 판정에 쓰는 노출·클릭 수(클릭 한 번을 운으로 빼고 판정하려면 필요하다). 계속 시청함은 우연 폭을 구할 조회수와 값을 읽은 기간 표. */
export function detailsFromStudio(studio, stayed = null) {
  const out = studio?.usable === true && studio.ctrPercent !== null && studio.ctrPercent !== undefined ? {ctr7d: {clicks: studio.clicks, impressions: studio.impressions}} : {};
  if (stayed && Number.isFinite(Number(stayed.value)) && stayed.value !== null) out.stayedToWatch = {views: stayed.views ?? null, period: stayed.period ?? null, windowStart: stayed.windowStart ?? null, windowLastDay: stayed.windowLastDay ?? null};
  return out;
}

const DAY_MS = 86400000; // allow-literal: 하루(ms)

/**
 * 쇼츠는 계속 시청함(스타일 시험 1차 지표) 값이 생긴 뒤에 정산한다. 정산은 한 번뿐이라 먼저 기록하면 그 영상의 1차 지표가 영영 빠진다.
 * 스튜디오 기간 표(studioMetrics)가 아예 없으면 기다려도 값이 오지 않으므로 기다리지 않는다(예전과 같다). 공개일을 몰라도 값을 고를 수 없어 기다리지 않는다.
 * 기다리는 한도는 공개 31일(FIRST28D_READY_DAYS) — 90일 창은 그 뒤에도 첫 7일을 품지만, 수집이 31일 동안 안 되면 고장으로 보고 값 없이 정산하고 이유를 남긴다.
 */
export function stayedWaitState({format, stayed, studioMetrics, publishedAt, now = new Date()}) {
  if (format !== 'SHORTS' || stayed) return {wait: false, note: null};
  if (!studioMetrics || !publishedAt) return {wait: false, note: '계속 시청함 값 없음(스튜디오 기간 표 또는 공개일 없음) — 측정 못 함'};
  const age = (now.getTime() - Date.parse(publishedAt)) / DAY_MS;
  if (age >= FIRST28D_READY_DAYS) return {wait: false, note: '계속 시청함 값을 31일 안에 받지 못함 — 측정 못 함'};
  return {wait: true, note: null};
}

/**
 * 롱폼은 스튜디오 첫 7일 값(노출·클릭률)이 들어온 뒤에 정산한다. 값이 늦게 오면 그 영상의 클릭률 근거가 영영 빠지기 때문이다.
 * 기다리는 한도: 공개 31일(FIRST28D_READY_DAYS)까지, 또는 3번 실패해 더 시도하지 않는 영상. 그 뒤에는 클릭률 없이 정산하고 기록에 이유를 남긴다.
 * 쇼츠는 노출·클릭률을 기준선으로 두지 않으므로 기다리지 않는다.
 */
export function studioWaitState({format, studio, failure, publishedAt, now = new Date()}) {
  if (format !== 'LONGFORM' || studio) return {wait: false, note: studio && studio.usable !== true ? `스튜디오 첫 7일 값을 기준선에 쓰지 못함: ${studio.unusableReason}` : null};
  if ((failure?.attempts || 0) >= STUDIO_MAX_ATTEMPTS) return {wait: false, note: `스튜디오 첫 7일 값 수집 실패(${failure.reason}) — 노출수·클릭률 측정 못 함`};
  const age = publishedAt ? (now.getTime() - Date.parse(publishedAt)) / DAY_MS : null;
  if (age !== null && age >= FIRST28D_READY_DAYS) return {wait: false, note: '스튜디오 첫 7일 값을 받지 못한 채 31일이 지남 — 노출수·클릭률 측정 못 함'};
  return {wait: true, note: null};
}

/**
 * 한 시트에 한 영상의 결과를 더한다. 이미 기록한 영상이면 sheet를 그대로 돌려준다.
 * video: {publishedAt, durationSeconds}. 있어야 "평소"(이 영상보다 먼저 나온 비슷한 길이 최근 10편 중앙값)를 만들 수 있다.
 * 2026-11-13 사용자 결정: 이김·짐은 평소 대비(result)로 읽고, 기준선 판정은 옆 칸(baselineResult)에 따로 적는다.
 */
export function settleSheet({sheet, videoId, format, metrics, baselines, video = {}, details = {}, studioNote = null, abTest = null, now = new Date()}) {
  if (!sheetIdOf(sheet) || !videoId || !metrics) return {sheet, changed: false};
  if ((sheet.results || []).some((r) => r.videoId === videoId)) return {sheet, changed: false};
  const judged = judgeVideoMetrics({format, metrics, video: {videoId, ...video}, details}, baselines);
  const date = now.toISOString().slice(0, 10);
  const variables = (sheet.testVariables || []).map((v) => v.variable);
  // 표본이 작은 영상(첫 7일 조회 100회 미만)은 "좋은 점 후보"여도 근거가 약하다. 기록에 같이 남겨 읽는 사람이 알 수 있게 한다.
  const views = metrics.views7d ?? null;
  const lowSample = views !== null && views < MIN_VIEWS_7D;
  // 노출·클릭률 지표의 표본은 조회가 아니라 노출이다(조회 100회 기준을 노출에 잘못 쓰지 않는다).
  // 계속 시청함의 표본은 값을 읽은 기간 창의 조회수다(첫 7일 조회수와 거의 같지만 같은 창에서 센 수를 쓴다).
  const sampleOf = (metric) => (METRICS[metric]?.studio === true ? {count: metrics.impressions7d ?? null, min: METRICS[metric].sample.min}
    : METRICS[metric]?.periodApprox === true ? {count: details?.[metric]?.views ?? null, min: METRICS[metric].sample.min} : {count: views, min: MIN_VIEWS_7D});
  const lowFor = (metric) => { const s = sampleOf(metric); return s.count !== null && s.count < s.min; };
  // 제목·썸네일 A/B 테스트가 걸린 영상의 노출수·클릭률은 여러 시안이 섞인 값이다. 근거 기록에 표시해 읽는 사람이 한 시안의 근거로 쓰지 않게 한다.
  const flags = [...(judged.flags || []), ...(abTest && metrics.ctr7d !== undefined ? ['A/B 테스트가 걸린 영상: 노출수·클릭률은 시안이 섞인 값(어느 제목·썸네일 덕인지 가릴 수 없다)'] : [])];
  const results = [...(sheet.results || []), {videoId, settledAt: now.toISOString(), format, summary: judged.summary, flags, studioNote, abTest, variables, views7d: views, lowSample, usualRule: USUAL_RULE, metrics: judged.per}];
  const makeEvidence = () => Object.entries(judged.per).map(([metric, p]) => ({
    date, videoId, metric, value: p.value, views: sampleOf(metric).count, lowSample: lowFor(metric), ...(METRICS[metric]?.studio === true ? {abTest} : {}),
    ...(METRICS[metric]?.periodApprox === true ? {period: details?.[metric]?.period ?? null, approxNote: '공개 7일 값이 아니라 기간 값(가설)'} : {}),
    result: p.usualStatus, usual: p.usual?.value ?? null, usualN: p.usual?.n ?? null, lengthAdjusted: p.usual?.lengthAdjusted ?? null, usualNote: p.usualNote,
    baselineResult: p.status, baseline: p.baseline, promoteAbove: p.promoteAbove, variables,
  }));
  const borrowed = (sheet.borrowed || []).map((b) => ({
    ...b,
    evidenceLog: [...(b.evidenceLog || []), ...makeEvidence()],
  }));
  const references = Array.isArray(sheet.references)
    ? sheet.references.map((ref) => ({...ref, evidenceLog: [...(ref.evidenceLog || []), ...makeEvidence()]}))
    : undefined;
  const next = {...sheet, results, borrowed, ...(references !== undefined ? {references} : {})};
  if (sheet.status === 'published' || sheet.status === 'approved') {
    next.status = 'published';
    if (!next.publishedVideoId) next.publishedVideoId = videoId;
    next.outcome = {...(sheet.outcome || {}), views7d: metrics.views7d, watchSeconds7d: metrics.watchSeconds7d, subs7d: metrics.subs7d, ...(metrics.ctr7d !== undefined ? {impressions7d: metrics.impressions7d, ctr7d: metrics.ctr7d} : {}), ...(metrics.stayedToWatch !== undefined ? {stayedToWatch: metrics.stayedToWatch} : {})};
  }
  return {sheet: next, changed: true};
}

/**
 * 정산이 늦어 baselines.json에 이 영상이 이미 들어 있어도(자기가 챔피언이면 자기와 비교해 "기준선 이하"가 나온다), 그 영상 자신과 그 뒤에 나온 영상을 뺀 카탈로그로
 * 기준선을 다시 계산해 판정한다(2026-11-13 코드 리뷰). 카탈로그나 공개일을 모르면 받은 baselines를 그대로 쓴다.
 */
function baselinesBefore({video, videoId, catalog, views7d, lifetime, studio, studioFailures, studioMetrics, baselines, now}) {
  if (!catalog.length || !video.publishedAt) return baselines;
  const cutoff = Date.parse(video.publishedAt);
  const earlier = catalog.filter((v) => v.videoId !== videoId && Date.parse(v.publishedAt) < cutoff);
  const v7 = views7d ?? Object.fromEntries(Object.entries(lifetime || {}).filter(([, x]) => x?.first7d).map(([id, x]) => [id, {views7d: x.first7d.views}]));
  // 스튜디오 값도 넘겨야 노출수·클릭률 기준선이 "기준선 없음"으로 판정되지 않는다.
  // 계속 시청함은 기간 창이 밀려 지금 표에서 사라진 옛 쇼츠 값이 baselines.json에 고정돼 있으므로 그것도 넘긴다(earlier에 없는 영상은 metricRows가 거른다).
  return computeBaselines({catalog: earlier, views7d: v7, lifetime, studio, studioFailures, studioMetrics, stayedObserved: baselines?.formats?.SHORTS?.stayedToWatchObserved ?? null, now});
}

/** outcomes: loadEpisodeOutcomes 결과. 시트를 가리키는 편 중 첫 7일 수치가 있는 것만 기록한다. catalog: 공개일·영상 길이를 찾는 카탈로그 영상 목록. studioMetrics: studio-metrics.json(계속 시청함). */
export function settleAll({outcomes, sheets, lifetime, baselines, catalog = [], views7d = null, studio = {}, studioFailures = {}, abTests = {}, studioMetrics = null, now = new Date()}) {
  // v4 시트는 episodeId(sheetIdOf)가 고유 키다. sourceVideoId는 여러 시트가 공유할 수 있으므로 유일할 때만 하위 호환 별칭으로 연결한다.
  const byId = new Map();
  const sourceCounts = new Map();
  for (const s of sheets) {
    const sid = sheetIdOf(s);
    if (!sid) continue;
    byId.set(sid, s);
    if (s.sourceVideoId) sourceCounts.set(s.sourceVideoId, (sourceCounts.get(s.sourceVideoId) || 0) + 1);
  }
  const sourceAlias = new Map();
  for (const s of sheets) {
    const sid = sheetIdOf(s);
    if (sid && s.sourceVideoId && s.sourceVideoId !== sid && sourceCounts.get(s.sourceVideoId) === 1 && !byId.has(s.sourceVideoId)) {
      sourceAlias.set(s.sourceVideoId, sid);
    }
  }
  const catalogById = new Map(catalog.map((v) => [v.videoId, v]));
  const updatedIds = new Set();
  let settled = 0;
  for (const o of outcomes) {
    const rawSheetId = o.sources?.transformSheet;
    const sheetId = rawSheetId ? (byId.has(rawSheetId) ? rawSheetId : (sourceAlias.get(rawSheetId) || null)) : null;
    const c = catalogById.get(o.videoId);
    const video = {publishedAt: o.publishedAt ?? c?.publishedAt ?? null, durationSeconds: c?.durationSeconds ?? null};
    // 쇼츠 계속 시청함: 이미 고정해 둔 값이 있으면 그것, 없으면 지금 스튜디오 기간 표에서 쓸 수 있는 값.
    const stayed = o.format === 'SHORTS' && o.videoId
      ? baselines?.formats?.SHORTS?.stayedToWatchObserved?.[o.videoId] ?? stayedObservation({videoId: o.videoId, publishedAt: video.publishedAt}, studioMetrics)
      : null;
    const metrics = metricsFromFirst7d(lifetime?.[o.videoId]?.first7d, studio?.[o.videoId], stayed);
    if (!sheetId || !o.videoId || !metrics) continue;
    // 롱폼은 스튜디오 첫 7일 값이 들어온 뒤에 정산한다(늦게 오면 클릭률 근거가 영영 빠진다). 한도는 31일까지.
    const waiting = studioWaitState({format: o.format, studio: studio?.[o.videoId], failure: studioFailures?.[o.videoId], publishedAt: video.publishedAt, now});
    if (waiting.wait) continue;
    // 쇼츠는 계속 시청함(1차 지표) 값이 생긴 뒤에 정산한다. 한도는 31일까지.
    const stayedWait = stayedWaitState({format: o.format, stayed, studioMetrics, publishedAt: video.publishedAt, now});
    if (stayedWait.wait) continue;
    const note = [waiting.note, stayedWait.note].filter(Boolean).join(' / ') || null;
    const before = baselinesBefore({video, videoId: o.videoId, catalog, views7d, lifetime, studio, studioFailures, studioMetrics, baselines, now});
    const r = settleSheet({sheet: byId.get(sheetId), videoId: o.videoId, format: o.format, metrics, baselines: before, video, details: detailsFromStudio(studio?.[o.videoId], stayed), studioNote: note, abTest: abTests?.[o.videoId]?.state ?? null, now});
    if (r.changed) { byId.set(sheetId, r.sheet); updatedIds.add(sheetId); settled += 1; }
  }
  return {updated: [...updatedIds].map((id) => byId.get(id)), settled};
}

/**
 * 같은 시험 변수를 쓴 영상을 형식별로 묶어 본다(2026-11-13 사용자 승인: 롱폼은 한 편씩 보면 숫자가 작아 흔들리니 합쳐서 본다).
 * 영상 한 편은 지표 중 하나라도 평소의 1.5배 이상이면 "좋은 점 후보", 하나라도 0.5배 미만이면 "신뢰 하향"으로 센다(둘 다일 수 있다).
 * 변수 이름은 시트가 적은 그대로다(같은 말이어야 묶인다). 여기서는 판정하지 않고 건수만 센다 — 확정은 단계를 거친다.
 */
export function groupResultsByVariable(sheets) {
  const groups = new Map();
  for (const s of sheets || []) {
    for (const r of s.results || []) {
      const statuses = Object.values(r.metrics || {}).map((m) => m.usualStatus);
      const good = statuses.includes(USUAL_RESULTS[0]);
      const low = statuses.includes(USUAL_RESULTS[2]);
      // 지표 중 하나만 넘어도 후보로 세면 서로 묶여 움직이는 지표(조회수·노출수·클릭률)가 늘수록 후보가 부풀어 오른다. 지표별 개수를 따로 센다(goodByMetric).
      const goodMetrics = Object.entries(r.metrics || {}).filter(([, m]) => m.usualStatus === USUAL_RESULTS[0]).map(([k]) => k);
      for (const variable of r.variables || []) {
        const key = `${r.format}|${variable}`;
        const g = groups.get(key) || {format: r.format, variable, videos: [], goodCount: 0, lowCount: 0, lowSampleCount: 0, goodByMetric: {}};
        if (!g.videos.includes(r.videoId)) {
          g.videos.push(r.videoId); if (good) g.goodCount += 1; if (low) g.lowCount += 1; if (r.lowSample) g.lowSampleCount += 1;
          for (const k of goodMetrics) g.goodByMetric[k] = (g.goodByMetric[k] || 0) + 1;
        }
        groups.set(key, g);
      }
    }
  }
  return [...groups.values()].map((g) => ({...g, videoCount: g.videos.length})).sort((a, b) => b.videoCount - a.videoCount);
}

const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')) : fallback);

export function runSettle({now = new Date(), dir = sheetsDir} = {}) {
  const outcomes = loadEpisodeOutcomes(projectDir, now);
  const lifetime = readJson(join(dataDir, 'video-lifetime.json'), {videos: {}}).videos;
  const baselines = readJson(join(dataDir, 'baselines.json'), null);
  if (!baselines) return {settled: 0, note: '기준선 파일이 없어 건너뜀'};
  const catalog = readJson(join(dataDir, 'catalog.json'), {videos: []}).videos;
  const views7d = readJson(join(dataDir, 'views-7d.json'), {videos: {}}).videos;
  const first7d = readJson(join(dataDir, 'studio-first7d.json'), {videos: {}, failures: {}});
  const abTests = readJson(join(dataDir, 'studio-ab-tests.json'), {videos: {}}).videos || {};
  const studioMetrics = readJson(join(dataDir, 'studio-metrics.json'), null);
  const {updated, settled} = settleAll({outcomes, sheets: loadSheets(dir), lifetime, baselines, catalog, views7d, studio: first7d.videos || {}, studioFailures: first7d.failures || {}, abTests, studioMetrics, now});
  for (const s of updated) writeFileSync(join(dir, `${sheetIdOf(s)}.json`), `${JSON.stringify(s, null, 2)}\n`);
  return {settled, sheets: updated.map((s) => sheetIdOf(s))};
}

if (process.argv[1] && process.argv[1].endsWith('sheet-outcomes.mjs')) {
  console.log(JSON.stringify(runSettle()));
}
