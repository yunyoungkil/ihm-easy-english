// 기준선(현재 최고 기록) 계산. 2026-11-13 사용자 결정: 우리 채널에는 "성공"이라는 말을 쓰지 않고,
// 형식·지표별 현재 최고를 기준선으로 두고 새 영상이 우리 편차보다 크게 넘으면 새 기준선으로 올린다.
// 지표는 있는 데이터로 세운다(사용자: 조회수와 시청 시간, 구독): 공개 첫 7일의 조회수 / 평균 시청 시간(초) / 구독 수.
// 2026-11-13 사용자 결정: 롱폼에는 공개 첫 7일 썸네일 노출수·클릭률도 더한다(스튜디오 값, data/youtube/studio-first7d.json, API에는 없다).
// 쇼츠는 조회의 0.39%만 썸네일 클릭에서 와서 포장을 못 보여 주므로 기준선이 아니라 참고(reference.firstWeekReach)로만 둔다.
// 영상끼리 같은 나이(공개 첫 7일)로 비교하고, 모든 숫자는 실제 파일에서 계산한다(손으로 쓴 값 없음).
// 근거: knowledge/decisions/2026-11-13-experiment-loop.md
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MIN_VIEWS_7D, WORKED_RATIO, FAILED_RATIO} from './planning-outcome.mjs';
import {SMALL_SAMPLE_IMPRESSIONS} from './growth-rules.mjs';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'youtube');
export const baselinesPath = join(dataDir, 'baselines.json');

const QUANTILE_MEDIAN = 0.5; // allow-literal: 분위수의 정의(중앙값)
const QUANTILE_UPPER = 0.75; // allow-literal: 분위수의 정의(상위 25% 경계)
const QUANTILE_LOWER = 0.25; // allow-literal: 분위수의 정의(하위 25% 경계)
// 2026-11-13 사용자 결정: 두 단계 판정. 1단계 "좋은 점 후보" = 평소의 1.5배 이상(루프를 자주 돌리는 재료), 2단계 "기준선 갱신"(가끔).
// "평소" = 같은 형식에서 비슷한 길이 최근 10편의 중앙값. 유튜브도 "일반적인 시청 지속 시간"을 비슷한 길이 최근 10개로 잡는다(고객센터 "콘텐츠 탭 분석 팁").
export const RECENT_COUNT = 10; // allow-literal: 평소를 정하는 최근 영상 수(유튜브 방식과 같음)
const RECENT_STORE = 30; // allow-literal: baselines.json에 남겨 둘 지표별 최근 영상 수(길이대별로 10편씩 나누어 쓸 만큼 넉넉히)
const MIN_BAND = 5; // allow-literal: 같은 길이대 영상이 이보다 적으면 길이 보정 없이 같은 형식 전체로 본다
const PER_THOUSAND = 1000; // allow-literal: "조회 1,000회당 구독"의 정의
const SECONDS_PER_MINUTE = 60; // allow-literal: 단위 환산
export const EMPTY_VIEW_MAX_RATIO = 0.1; // allow-literal: 사용자 결정(2026-11-13): 평균 시청이 영상 길이의 10% 미만이어야 "사실상 본 사람이 없다"고 본다(쇼츠에서 28~44%를 본 영상은 본 영상이다)
const MIN_SUSPECT_ROWS = 8; // allow-literal: 하위 25%가 최소 2편은 되는 표본 수. 이보다 적으면 빈 조회 의심을 판단하지 않는다
// 영구 기록되는 판정 문장에는 바꿀 수 있는 배율 숫자를 넣지 않는다(배율은 기본값 층이라 바뀔 수 있다). 쓴 배율은 기록에 USUAL_RULE로 따로 남는다.
export const USUAL_RESULTS = Object.freeze([
  '평소보다 확실히 높음 (좋은 점 후보)',
  '평소 수준',
  '평소보다 확실히 낮음 (신뢰 하향 기록)',
  '평소 없음',
]);
export const USUAL_RULE = Object.freeze({goodRatio: WORKED_RATIO, lowRatio: FAILED_RATIO});
export const FORMATS = ['SHORTS', 'LONGFORM'];
// sample: 이 값이 몇 번의 관찰에서 나왔는지의 단위와 "표본 작음" 기준. 조회수 지표는 조회 100회, 노출 지표는 노출 1,000회(growth-rules의 작은 표본 기준을 다시 쓴다).
const VIEW_SAMPLE = {unit: '조회', min: MIN_VIEWS_7D};
const IMPRESSION_SAMPLE = {unit: '노출', min: SMALL_SAMPLE_IMPRESSIONS};
export const METRICS = {
  views7d: {label: '공개 7일 조회수', meaning: '제목·썸네일·소재(포장)', unit: '회', sample: VIEW_SAMPLE},
  watchSeconds7d: {label: '공개 7일 평균 시청 시간', meaning: '훅·화면·대본(내용). 영상이 길수록 유리해서 길이를 같이 본다', unit: '초', sample: VIEW_SAMPLE},
  subs7d: {label: '공개 7일 구독 수', meaning: '채널의 가치', unit: '명', sample: VIEW_SAMPLE},
  impressions7d: {label: '공개 7일 썸네일 노출수', meaning: '유튜브가 얼마나 보여 줬는가(포장의 앞 단계). 스튜디오 값', unit: '회', sample: IMPRESSION_SAMPLE, studio: true},
  ctr7d: {label: '공개 7일 썸네일 클릭률', meaning: '제목·썸네일이 눌러 보게 했는가(포장). 클릭 수 합 ÷ 노출 합. 스튜디오 값', unit: '%', sample: IMPRESSION_SAMPLE, studio: true},
};
const BASE_METRICS = ['views7d', 'watchSeconds7d', 'subs7d'];
/** 형식별 기준선 지표. 쇼츠는 노출수·클릭률을 기준선으로 두지 않는다(참고 표시만). */
export const FORMAT_METRICS = {LONGFORM: Object.keys(METRICS), SHORTS: BASE_METRICS};
const PACKAGING_METRICS = ['views7d', 'impressions7d', 'ctr7d']; // 포장 지표: 빈 조회 의심 영상은 후보에서 뺀다
const PERCENT = 100; // allow-literal: 퍼센트 환산
const STUDIO_MAX_ATTEMPTS = 3; // allow-literal: studio-first7d.mjs의 MAX_ATTEMPTS와 같은 값(그쪽이 정하고 여기서는 "더 시도하지 않음"을 알아보는 데만 쓴다)

/** 오름차순 정렬에서 floor(p*n)번째 값(n이 작아도 같은 방식으로 계산). */
export function quantile(values, p) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

const num = (x) => (x === null || x === undefined || x === '' || !Number.isFinite(Number(x)) ? null : Number(x));

/** unfiltered: 평균 시청 시간의 조회 문턱(챔피언 후보용)을 적용하지 않은 전체 행. 평소는 이쪽으로 만든다(판정받는 영상은 문턱 없이 비교되므로). */
function metricRows(format, metric, {catalog, views7d, lifetime, studio}, {unfiltered = false} = {}) {
  const videos = catalog.filter((v) => v.format === format);
  const rows = [];
  // views: 이 값이 몇 번의 관찰(조회 또는 노출)에서 나왔는지(표본이 작은지 알려 주려고 같이 담는다). extra: 클릭률 판정에 쓰는 노출·클릭 수.
  const push = (v, value, views, extra = {}) => { if (value !== null) rows.push({videoId: v.videoId, title: v.title, publishedAt: v.publishedAt, durationSeconds: num(v.durationSeconds), value, views: num(views), ...extra}); };
  if (metric === 'impressions7d' || metric === 'ctr7d') {
    // 스튜디오 첫 7일 값: 창이 API와 맞고 빠진 날이 없는 기록(usable)만 쓴다. 빈칸을 0으로 채우지 않는다.
    const usable = videos.map((v) => ({v, s: studio?.[v.videoId]})).filter((x) => x.s?.usable === true && num(x.s.impressions) !== null);
    const extraOf = (s) => ({impressions: num(s.impressions), clicks: num(s.clicks)});
    if (metric === 'impressions7d') { for (const {v, s} of usable) push(v, num(s.impressions), s.impressions, extraOf(s)); return rows; }
    // 클릭률은 첫 7일 노출이 형식 중앙값 이상인 영상만 기준선 후보로 본다(노출 3회·클릭 1회 = 33%가 기준선이 되는 것을 막는다). 조회수 쪽 평균 시청 시간과 같은 방식.
    const withCtr = usable.filter((x) => num(x.s.ctrPercent) !== null);
    const floor = quantile(withCtr.map((x) => Number(x.s.impressions)), QUANTILE_MEDIAN);
    for (const {v, s} of withCtr) if (unfiltered || Number(s.impressions) >= floor) push(v, num(s.ctrPercent), s.impressions, extraOf(s));
    return rows;
  }
  if (metric === 'views7d') {
    for (const v of videos) { const x = num(views7d?.[v.videoId]?.views7d); push(v, x, x); }
    return rows;
  }
  const have = videos.map((v) => ({v, f: lifetime?.[v.videoId]?.first7d})).filter((x) => x.f && num(x.f.views) !== null);
  if (metric === 'subs7d') {
    for (const {v, f} of have) push(v, num(f.subscribersGained), f.views);
    return rows;
  }
  // 평균 시청 시간은 첫 7일 조회수가 형식 중앙값 이상인 영상만 본다(적은 조회수의 평균은 한 명 차이로 크게 흔들린다)
  const floor = quantile(have.map((x) => Number(x.f.views)), QUANTILE_MEDIAN);
  for (const {v, f} of have) if (unfiltered || Number(f.views) >= floor) push(v, num(f.averageViewDuration), f.views);
  return rows;
}

/**
 * 빈 조회 의심(2026-11-13 사용자 승인): 첫 7일 평균 시청이 같은 형식 하위 25% 이하이고 영상 길이 대비 비율도 하위 25% 이하이며, 그 비율이 영상 길이의 10% 미만인 영상.
 * 조회수가 높아도 사실상 본 사람이 없는 영상(예: 롱폼 EP19, 7일 조회 203회에 총 시청 5분)이라 거기서 배울 좋은 점이 없다.
 * 조회수 기준선 후보에서만 빼고 기록은 지우지 않는다. 길이 대비 비율을 함께 보는 이유: 짧은 쇼츠는 평균 시청이 짧아도 거의 끝까지 본 것이다.
 */
function emptyViewReport(format, {catalog, lifetime}) {
  const rows = [];
  for (const v of catalog.filter((x) => x.format === format)) {
    const avg = num(lifetime?.[v.videoId]?.first7d?.averageViewDuration);
    const dur = num(v.durationSeconds);
    if (avg !== null && dur) rows.push({id: v.videoId, avg, ratio: avg / dur});
  }
  if (rows.length < MIN_SUSPECT_ROWS) return new Map(); // 표본이 작으면 하위 25%를 믿을 수 없다
  const lowAvg = quantile(rows.map((r) => r.avg), QUANTILE_LOWER);
  const lowRatio = quantile(rows.map((r) => r.ratio), QUANTILE_LOWER);
  // 같은 값이 몰려도(예: 평균 시청 0초 영상이 25% 넘게) 규칙이 꺼지지 않게 "이하"로 센다.
  return new Map(rows.filter((r) => r.avg <= lowAvg && r.ratio <= lowRatio && r.ratio < EMPTY_VIEW_MAX_RATIO).map((r) => [r.id, r]));
}

export function emptyViewSuspects(format, data) {
  return new Set(emptyViewReport(format, data).keys());
}

/** 쇼츠 보강(2026-11-13 사용자 승인): 기준선이 아니라 참고로 보여 주는 값. 조회 1,000회당 구독, 시청률(평균 시청÷길이), 총 시청 시간(분). */
function referenceBlock(format, {catalog, lifetime, studio}) {
  const rows = [];
  for (const v of catalog.filter((x) => x.format === format)) {
    const f = lifetime?.[v.videoId]?.first7d;
    const views = num(f?.views);
    if (views === null) continue;
    rows.push({views, subs: num(f.subscribersGained) ?? 0, avg: num(f.averageViewDuration), dur: num(v.durationSeconds)});
  }
  const totalViews = rows.reduce((s, r) => s + r.views, 0);
  const totalSubs = rows.reduce((s, r) => s + r.subs, 0);
  const ratios = rows.filter((r) => r.avg !== null && r.dur).map((r) => r.avg / r.dur);
  const minutes = rows.filter((r) => r.avg !== null).map((r) => (r.views * r.avg) / SECONDS_PER_MINUTE);
  // 쇼츠의 첫 7일 노출·클릭률(스튜디오 값)은 기준선이 아니라 참고로만 보여 준다. 쇼츠 조회의 대부분은 피드에서 넘기다 본 것이라 썸네일 클릭률이 포장을 설명하지 못한다.
  const reach = catalog.filter((x) => x.format === format).map((x) => studio?.[x.videoId]).filter((s) => s?.usable === true && num(s.impressions) !== null);
  const reachImpressions = reach.reduce((acc, s) => acc + s.impressions, 0);
  const reachClicks = reach.reduce((acc, s) => acc + (num(s.clicks) ?? 0), 0);
  const firstWeekReach = reach.length
    ? {n: reach.length, medianImpressions: quantile(reach.map((s) => s.impressions), QUANTILE_MEDIAN), pooledCtrPercent: reachImpressions ? Number(((reachClicks / reachImpressions) * PERCENT).toFixed(2)) : null, totalImpressions: reachImpressions} // allow-literal: 소수 둘째 자리
    : null;
  return {
    ...(format === 'SHORTS' ? {firstWeekReach} : {}),
    subsPer1000Views: {value: totalViews ? (totalSubs / totalViews) * PER_THOUSAND : null, totalSubs, totalViews, n: rows.length},
    watchRatio: {median: quantile(ratios, QUANTILE_MEDIAN), n: ratios.length},
    totalWatchMinutes: {median: quantile(minutes, QUANTILE_MEDIAN), n: minutes.length},
    note: '기준선이 아니라 참고 표시다. 유튜브 추천 순위 신호에는 평균 시청 지속 시간과 평균 시청 비율(%)이 모두 들어가고, 썸네일 테스트의 승자는 시청 시간으로 정해진다. 시청률(%)은 아주 짧은 영상이 다시 보기로 100%를 넘겨서 기준선에서는 뺐다.',
  };
}

/** previous는 이전 baselines.json. 챔피언이 바뀌면 이전 챔피언을 history에 더한다(지우지 않는다). */
export function computeBaselines({catalog, views7d, lifetime, studio = {}, studioFailures = {}, previous = null, now = new Date()}) {
  const out = {schemaVersion: 2, computedAt: now.toISOString(), formats: {}, history: [...(previous?.history || [])]};
  for (const format of FORMATS) {
    // 길이 중앙값은 7일 조회 수치가 있는 영상으로만 구한다(비공개·예약 영상은 비교 대상이 아니다).
    const durations = metricRows(format, 'views7d', {catalog, views7d, lifetime}).map((r) => r.durationSeconds).filter((d) => d !== null);
    const lengthMedian = quantile(durations, QUANTILE_MEDIAN);
    // recent: 평소(최근 10편 중앙값)를 판정할 때 영상 길이대·공개 순서로 거를 수 있게 지표별 최근 영상을 길이대별로 최대 30편씩 남겨 둔다.
    const entry = {metrics: {}, lengthMedianSeconds: lengthMedian, recent: {}, reference: referenceBlock(format, {catalog, lifetime, studio})};
    const emptyView = emptyViewReport(format, {catalog, lifetime});
    for (const metric of FORMAT_METRICS[format]) {
      const rows = metricRows(format, metric, {catalog, views7d, lifetime, studio});
      const values = rows.map((r) => r.value);
      const byDate = (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      // 클릭률 판정은 노출·클릭 수가 필요해서 스튜디오 지표 행에는 함께 남긴다.
      const slim = (r) => ({videoId: r.videoId, publishedAt: r.publishedAt, durationSeconds: r.durationSeconds, value: r.value, ...(r.impressions !== undefined ? {impressions: r.impressions, clicks: r.clicks} : {})});
      const everyRow = metricRows(format, metric, {catalog, views7d, lifetime, studio}, {unfiltered: true}).sort(byDate);
      const isHigh = (r) => Number(r.durationSeconds) >= lengthMedian; // usualFor와 같은 길이대 나누기
      entry.recent[metric] = (lengthMedian === null
        ? everyRow.slice(0, RECENT_STORE)
        : [...everyRow.filter((r) => !isHigh(r)).slice(0, RECENT_STORE), ...everyRow.filter(isHigh).slice(0, RECENT_STORE)].sort(byDate)).map(slim);
      // 빈 조회 의심 영상은 포장 지표(조회수·노출수·클릭률) 기준선 후보에서만 뺀다(구독·시청 시간 기록은 실제 사람이 만든 값이라 그대로).
      const packaging = PACKAGING_METRICS.includes(metric);
      const candidates = packaging ? rows.filter((r) => !emptyView.has(r.videoId)) : rows;
      const pool = candidates.length ? candidates : rows;
      const champion = pool.reduce((best, r) => (!best || r.value > best.value ? r : best), null);
      const excluded = packaging
        ? rows.filter((r) => emptyView.has(r.videoId) && champion && r.value > champion.value).sort((a, b) => b.value - a.value)
          .map((r) => ({videoId: r.videoId, title: r.title, value: r.value, reason: `빈 조회 의심: 평균 시청 ${Number(emptyView.get(r.videoId).avg.toFixed(1))}초, 영상 길이의 ${Number((emptyView.get(r.videoId).ratio * 100).toFixed(1))}%`})) // allow-literal: 비율을 %로
        : [];
      const sample = METRICS[metric].sample;
      const lowSample = champion ? champion.views !== null && champion.views < sample.min : null;
      // 스튜디오 지표는 아직 따라잡는 중이면(수집한 영상 < API 첫 7일이 있는 영상) 이력을 쓰지 않는다: 과거 영상 값이 새로 들어오는 것이 "더 높은 기록이 나옴"으로 쌓이는 것을 막는다.
      const isStudio = METRICS[metric].studio === true;
      const eligible = catalog.filter((v) => v.format === format && lifetime?.[v.videoId]?.first7d).length;
      // 3번 실패해 더 시도하지 않는 영상(studio-first7d의 MAX_ATTEMPTS)도 "처리됨"으로 센다. 안 그러면 따라잡기가 영영 안 끝난다.
      const recorded = catalog.filter((v) => v.format === format && (studio?.[v.videoId] || (studioFailures?.[v.videoId]?.attempts || 0) >= STUDIO_MAX_ATTEMPTS)).length;
      const catchingUp = isStudio && recorded < eligible;
      const median = quantile(values, QUANTILE_MEDIAN);
      const upper = quantile(values, QUANTILE_UPPER);
      // 우리 데이터의 편차: 이보다 작은 차이는 평소 편차 안이라 "좋아졌다"고 말할 수 없다.
      // 중앙값이 0이면(구독 수처럼 대부분 0) 비율을 못 구하므로 상위 25%와 중앙값의 차(절대값)를 쓴다. 차가 0이면 기준선보다 1이라도 높아야 갱신이다.
      const ratio = median > 0 ? upper / median : null;
      let promoteAbove = null;
      if (champion && median !== null) promoteAbove = ratio ? champion.value * ratio : champion.value + (upper - median);
      const before = previous?.formats?.[format]?.metrics?.[metric]?.champion;
      if (before && champion && before.videoId !== champion.videoId && !catchingUp) {
        const wasExcluded = packaging && emptyView.has(before.videoId);
        out.history.push({format, metric, ...before, retiredAt: out.computedAt, replacedBy: champion.videoId, reason: wasExcluded ? '빈 조회 의심으로 기준선 후보에서 제외됨(더 낮은 기록이 새 기준선)' : '더 높은 기록이 나옴'});
      }
      entry.metrics[metric] = {
        label: METRICS[metric].label,
        meaning: METRICS[metric].meaning,
        unit: METRICS[metric].unit,
        n: rows.length,
        median,
        upper,
        spreadRatio: ratio,
        promoteRule: ratio ? '비율' : '차이',
        champion,
        promoteAbove,
        // 표본이 작아도 기준선을 비우지 않는다(사용자 목적: 기준이 있어야 비교와 학습이 돈다). 대신 "참고용"이라고 표시한다.
        lowSample,
        sampleNote: lowSample ? `표본 작음: 기준 영상의 첫 7일 ${sample.unit}${sample.unit === '노출' ? '이' : '가'} ${champion.views}회로 ${sample.min}회 미만 — 참고용(가설)` : null,
        ...(isStudio ? {coverage: {have: rows.length, recorded, eligible}, catchingUp, catchingUpNote: catchingUp ? `스튜디오 값을 아직 ${recorded}편만 받음(대상 ${eligible}편) — 다 받을 때까지 기준선 이력을 쓰지 않는다` : null} : {}),
        excluded,
        confidence: '가설', // 갱신 뒤 같은 요소를 쓴 다음 영상이 중앙값 이상일 때까지 확정하지 않는다
      };
    }
    out.formats[format] = entry;
  }
  return out;
}

/** 새 영상 한 편의 값이 기준선을 넘는지. "성공" 대신 "갱신 기준 초과 / 기준선 이하 / 기준선 없음"으로 말한다. */
export function judgeAgainstBaseline({format, metric, value}, baselines) {
  const m = baselines?.formats?.[format]?.metrics?.[metric];
  if (!m?.champion || m.promoteAbove == null || !Number.isFinite(Number(value))) {
    return {status: '기준선 없음', baseline: m?.champion?.value ?? null, promoteAbove: null};
  }
  const v = Number(value);
  if (v > m.promoteAbove) return {status: '갱신 기준 초과', baseline: m.champion.value, promoteAbove: m.promoteAbove};
  if (v > m.champion.value) return {status: '기준선 위, 편차 안(갱신 아님)', baseline: m.champion.value, promoteAbove: m.promoteAbove};
  return {status: '기준선 이하', baseline: m.champion.value, promoteAbove: m.promoteAbove};
}

/**
 * 평소(1단계 비교 기준): 같은 형식에서 이 영상보다 먼저 나온 영상 중 비슷한 길이대(형식 길이 중앙값 기준 같은 쪽) 최근 10편의 중앙값.
 * 같은 길이대 영상이 5편 미만이면 길이 보정 없이 같은 형식 전체로 보고 lengthAdjusted를 false로 남긴다. 앞선 영상이 없으면 null.
 */
export function usualFor({format, metric, durationSeconds = null, publishedAt = null, videoId = null}, baselines) {
  const entry = baselines?.formats?.[format];
  const list = entry?.recent?.[metric];
  if (!Array.isArray(list)) return null;
  const before = publishedAt ? Date.parse(publishedAt) : null;
  const pool = list.filter((r) => r.videoId !== videoId && (before === null || Date.parse(r.publishedAt) < before));
  if (!pool.length) return null;
  const mid = entry.lengthMedianSeconds;
  let use = pool;
  let lengthAdjusted = false;
  if (Number.isFinite(Number(durationSeconds)) && durationSeconds !== null && Number.isFinite(mid)) {
    const band = pool.filter((r) => (Number(r.durationSeconds) >= mid) === (Number(durationSeconds) >= mid));
    if (band.length >= MIN_BAND) { use = band; lengthAdjusted = true; }
  }
  const picked = use.slice(0, RECENT_COUNT); // recent는 공개일 내림차순
  if (metric === 'ctr7d') {
    // 클릭률의 평소는 최근 10편의 중앙값이 아니라 합산 클릭률(클릭 합 ÷ 노출 합)이다. 롱폼 첫 7일은 클릭이 0~1번인 영상이 많아 중앙값이 0%가 되면
    // 클릭 한 번만 있어도 전부 "좋은 점 후보"가 되기 때문이다(2026-11-13 사용자 승인, Opus 설계).
    const withReach = picked.filter((r) => num(r.impressions) !== null && num(r.clicks) !== null);
    const totalImpressions = withReach.reduce((acc, r) => acc + r.impressions, 0);
    if (!totalImpressions) return null;
    const totalClicks = withReach.reduce((acc, r) => acc + r.clicks, 0);
    return {value: Number(((totalClicks / totalImpressions) * PERCENT).toFixed(2)), n: withReach.length, lengthAdjusted, pooled: true}; // allow-literal: 소수 둘째 자리
  }
  return {value: quantile(picked.map((r) => r.value), QUANTILE_MEDIAN), n: picked.length, lengthAdjusted};
}

/** 화면에 보여 줄 평소: 판정에 실제로 쓰는 것과 같은 계산으로 짧은 쪽·긴 쪽을 따로 구한다(길이 중앙값 기준). 길이 중앙값이 없으면 null. */
export function usualBands(format, metric, baselines) {
  const mid = baselines?.formats?.[format]?.lengthMedianSeconds;
  if (!Number.isFinite(Number(mid)) || mid === null || mid === undefined) return null;
  return {mid, low: usualFor({format, metric, durationSeconds: mid - 1}, baselines), high: usualFor({format, metric, durationSeconds: mid}, baselines)};
}

/** 1단계 판정: 평소의 1.5배 이상이면 좋은 점 후보, 0.5배 미만이면 신뢰 하향 기록. 평소가 0이면 배율을 못 구해 0보다 큰 값을 후보로 본다. */
export function judgeAgainstUsual({value, usual, guard = null}) {
  const v = num(value);
  if (!usual || usual.value === null || usual.value === undefined || v === null) return {status: USUAL_RESULTS[3], usual: usual ?? null};
  const base = {usual};
  if (guard) {
    // 클릭률(2026-11-13 사용자 승인, Opus 설계): 노출이 적으면 클릭 한 번에 크게 흔들린다(노출 3회·클릭 1회 = 33%).
    // 클릭 한 번을 운으로 빼고도 평소의 1.5배여야 후보, 클릭 한 번을 더해도 평소의 0.5배 미만이어야 하향으로 본다.
    const clicks = num(guard.clicks);
    const impressions = num(guard.impressions);
    if (clicks === null || !impressions) return {status: USUAL_RESULTS[3], usual};
    const note = `클릭 1번 = ${Number(((1 / impressions) * PERCENT).toFixed(2))}%p`; // allow-literal: 소수 둘째 자리
    const lowerPct = (Math.max(clicks - 1, 0) / impressions) * PERCENT;
    const upperPct = ((clicks + 1) / impressions) * PERCENT;
    if (usual.value === 0) return clicks >= 2 ? {...base, status: USUAL_RESULTS[0], note: `평소가 0이라 클릭 2번 이상이면 후보로 본다. ${note}`} : {...base, status: USUAL_RESULTS[1], note}; // allow-literal: 클릭 한 번을 운으로 빼고 남는 수
    if (lowerPct >= usual.value * WORKED_RATIO) return {...base, status: USUAL_RESULTS[0], note};
    if (upperPct < usual.value * FAILED_RATIO) return {...base, status: USUAL_RESULTS[2], note};
    return {...base, status: USUAL_RESULTS[1], note};
  }
  if (usual.value === 0) return v > 0 ? {...base, status: USUAL_RESULTS[0], note: '평소가 0이라 배율은 못 구하고 0보다 크면 후보로 본다'} : {...base, status: USUAL_RESULTS[1]};
  if (v >= usual.value * WORKED_RATIO) return {...base, status: USUAL_RESULTS[0]};
  if (v < usual.value * FAILED_RATIO) return {...base, status: USUAL_RESULTS[2]};
  return {...base, status: USUAL_RESULTS[1]};
}

/**
 * 한 편의 세 지표를 한꺼번에 판정한다. metrics: {views7d, watchSeconds7d, subs7d}. video: {videoId, publishedAt, durationSeconds}(있으면 평소 대비도 판정).
 * 두 가지 판정이 나란히 나온다: status(2단계, 기준선) / usualStatus(1단계, 평소). 시트의 이김·짐은 usualStatus로 읽고 기준선 판정은 옆 칸이다.
 */
export function judgeVideoMetrics({format, metrics, video = {}, details = {}}, baselines) {
  const per = {};
  for (const key of FORMAT_METRICS[format] || BASE_METRICS) {
    // 스튜디오 지표는 값이 아직 없으면(수집 전) 판정에서 뺀다. "기준선 없음"으로 적어 놓으면 값이 들어온 뒤에도 같은 영상을 다시 기록하지 못한다.
    if (METRICS[key].studio === true && (metrics?.[key] === undefined || metrics?.[key] === null)) continue;
    // 공개일을 모르면 이 영상보다 먼저 나온 영상만으로 평소를 만들 수 없다(자기 자신이 섞인다) → 평소 없음
    const usual = video.publishedAt ? usualFor({format, metric: key, durationSeconds: video.durationSeconds ?? null, publishedAt: video.publishedAt, videoId: video.videoId ?? null}, baselines) : null;
    const ju = judgeAgainstUsual({value: metrics?.[key], usual, guard: key === 'ctr7d' ? details?.ctr7d ?? null : null});
    per[key] = {value: num(metrics?.[key]), ...judgeAgainstBaseline({format, metric: key, value: metrics?.[key]}, baselines), usual, usualStatus: ju.status, usualNote: ju.note ?? null};
  }
  const over = Object.keys(per).filter((k) => per[k].status === '갱신 기준 초과').map((k) => METRICS[k].label);
  const good = Object.keys(per).filter((k) => per[k].usualStatus === USUAL_RESULTS[0]).map((k) => METRICS[k].label);
  const base = over.length ? `갱신 기준을 넘은 지표: ${over.join(', ')}` : '갱신 기준을 넘은 지표 없음';
  // 클릭률은 평소보다 높은데 평균 시청 시간은 평소보다 낮으면 "누르게는 했지만 보지 않은" 낚시 의심. 상태는 그대로 두고 표시만 붙인다(2026-11-13 사용자 승인).
  const flags = [];
  if (per.ctr7d?.usualStatus === USUAL_RESULTS[0] && per.watchSeconds7d?.usualStatus === USUAL_RESULTS[2]) flags.push('낚시 의심: 클릭률은 평소보다 높은데 평균 시청 시간은 평소보다 낮음(누르게는 했지만 보지 않음)');
  return {per, flags, summary: good.length ? `${base} · 좋은 점 후보 지표: ${good.join(', ')}` : base};
}

function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

export function buildFromDisk({now = new Date(), write = true} = {}) {
  const catalog = readJson(join(dataDir, 'catalog.json'), {videos: []}).videos;
  const views7d = readJson(join(dataDir, 'views-7d.json'), {videos: {}}).videos;
  const lifetime = readJson(join(dataDir, 'video-lifetime.json'), {videos: {}}).videos;
  const previous = readJson(baselinesPath, null);
  const first7d = readJson(join(dataDir, 'studio-first7d.json'), {videos: {}, failures: {}});
  const result = computeBaselines({catalog, views7d, lifetime, studio: first7d.videos || {}, studioFailures: first7d.failures || {}, previous, now});
  if (write) writeFileSync(baselinesPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith('baseline.mjs')) {
  const r = buildFromDisk();
  for (const f of FORMATS) {
    for (const m of Object.values(r.formats[f].metrics)) {
      const bar = m.promoteAbove == null ? '없음' : Number(m.promoteAbove.toFixed(2));
      const len = m.champion?.durationSeconds ? `, 영상 ${m.champion.durationSeconds}초` : '';
      const flag = [m.sampleNote, ...(m.excluded || []).map((x) => `${x.videoId} 제외(${x.reason})`)].filter(Boolean).join(' / ');
      console.log(`${f} ${m.label}: n=${m.n}, 중앙값 ${m.median}, 상위25% ${m.upper}, 기준선 ${m.champion?.value ?? '없음'}${m.unit}${len}, 갱신 기준 ${bar} [${m.promoteRule}] (${(m.champion?.title || '').slice(0, 28)})${flag ? ` ※ ${flag}` : ''}`);
    }
  }
}
