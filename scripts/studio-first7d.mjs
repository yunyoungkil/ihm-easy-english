import {existsSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {setupStudioChrome, STUDIO_PORT} from './setup-studio-chrome.mjs';
import {extractZip} from './studio-auto-ingest.mjs';
import {acquireLock, downloadStudioCsv, numberOrNull, parseCsv} from './studio-export.mjs';
import {OUR_CHANNEL_ID} from './youtube-publisher.mjs';

/**
 * 영상별 "공개 첫 7일 썸네일 노출수·클릭률"을 스튜디오 영상별 날짜 표에서 읽어 저장한다 (2026-11-13 사용자 결정).
 * 유튜브 API에는 노출수·클릭률이 없다. 창(공개일부터 7일)은 API 첫 7일(video-lifetime.json first7d)과 같은 창을 쓴다.
 * 저장은 별도 파일: video-lifetime.json에 합치면 한쪽이 다른 쪽 값을 지우거나 다시 받지 않는다(Opus 설계 검토 1번).
 * 클릭 수는 하루 노출 x 클릭률(소수 둘째 자리)을 정수로 되살려 더한다 → 7일 클릭률 = 클릭 합 / 노출 합.
 * 날짜 표의 날짜가 어느 시간대인지는 짐작하지 않고, 날짜별 조회수 합을 API 첫 7일 조회수와 -1/0/+1일 옮겨 가며 맞춰 본다.
 */
const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const first7dPath = join(projectDir, 'data', 'youtube', 'studio-first7d.json');
const dataDir = join(projectDir, 'data', 'youtube');

export const DAYS_IN_WINDOW = 7; // allow-literal: 첫 7일의 정의
export const MAX_ATTEMPTS = 3; // allow-literal: 영상 하나가 3번 실패하면 다시 시도하지 않는다(매 실행 출력에는 계속 적는다)
export const DAILY_LIMIT = 12; // allow-literal: 매일 루프가 한 번에 처리하는 영상 수(영상당 약 20초, 새 영상부터)
const DAY_MS = 86400000; // allow-literal: 하루(ms)
const CTR_DECIMAL_TOLERANCE = 0.005; // allow-literal: 클릭률이 소수 둘째 자리 반올림이라 생기는 최대 오차(%p)
const SHIFTS = [-1, 0, 1]; // allow-literal: 창을 하루씩 앞뒤로 옮겨 보는 범위
const DAY_HEADERS = Object.freeze(['날짜', '썸네일 노출수', '썸네일 클릭률 (%)', '조회수']);

export function buildStudioDayUrl(videoId) {
  const q = new URLSearchParams({entity_type: 'VIDEO', entity_id: videoId, time_period: 'lifetime', explore_type: 'TABLE_AND_CHART', metrics_computation_type: 'DELTA', metric: 'VIDEO_THUMBNAIL_IMPRESSIONS', granularity: 'DAY'});
  for (const m of ['VIDEO_THUMBNAIL_IMPRESSIONS', 'VIDEO_THUMBNAIL_IMPRESSIONS_VTR', 'EXTERNAL_VIEWS']) q.append('t_metrics', m);
  q.set('dimension', 'DAY');
  q.set('o_column', 'DAY');
  q.set('o_direction', 'ANALYTICS_ORDER_DIRECTION_ASC');
  // 주소에 hub_overview/가 없으면 스튜디오가 "오류가 발생했습니다"를 보여 준다(2026-11-13 확인).
  return `https://studio.youtube.com/video/${videoId}/analytics/hub_overview/explore?${q}`;
}

/** 날짜 표(표 데이터.csv) → {total, days}. 머리글이 다르면 던진다. 빈칸·"—"는 null. */
export function parseStudioDayTable(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error('날짜 표 내용 부족');
  const headers = rows[0].map((h) => h.trim());
  if (headers.length !== DAY_HEADERS.length || DAY_HEADERS.some((h, i) => headers[i] !== h)) {
    throw new Error(`날짜 표 칸이 다름: ${headers.join(', ')} (화면이 바뀌었는지 확인)`);
  }
  const read = (r) => ({impressions: numberOrNull(r[1], DAY_HEADERS[1]), ctrPercent: numberOrNull(r[2], DAY_HEADERS[2]), views: numberOrNull(r[3], DAY_HEADERS[3])});
  let total = null;
  const days = [];
  for (const r of rows.slice(1)) {
    const key = String(r[0] || '').trim();
    if (key === '합계') { total = read(r); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) throw new Error(`날짜가 아닌 줄: "${key.slice(0, 30)}"`);
    days.push({date: key, ...read(r)});
  }
  return {total, days};
}

const finiteOrNull = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)); // Number(null)은 0이라 따로 거른다
const shiftDate = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const windowDates = (startDate, shift = 0) => Array.from({length: DAYS_IN_WINDOW}, (_, i) => shiftDate(startDate, i + shift));

/**
 * 창 안의 노출·클릭을 더한다. 클릭 수 = round(노출 x 클릭률 / 100). 반올림 허용 범위를 벗어나는 날이 있으면 ctrMethod를 "approx"로 표시한다.
 * 창 안에 표에 없는 날은 missingDays에 적는다. 스튜디오 날짜 표는 활동이 전혀 없는 날을 줄째로 생략한다(2026-11-13 확인: 빠진 날이 있는 54편 모두 날짜 표 조회수 합이 API와 같았다).
 * 그래서 여기서는 합에 넣지 않고(0으로 더한 것과 같다) 기록만 하고, 0으로 봐도 되는지는 usabilityOf가 조회수 합으로 확인한다.
 * 노출이 있는데 클릭률이 비어 있는 날은 계산 못 한 날(uncomputableDays)이라 따로 센다.
 */
export function first7dFromDays(days, {startDate}) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  let impressions = 0, clicks = 0, viewsSum = 0;
  let exact = true;
  const missingDays = [];
  const uncomputableDays = [];
  for (const date of windowDates(startDate)) {
    const d = byDate.get(date);
    if (!d || d.impressions === null) { missingDays.push(date); continue; }
    impressions += d.impressions;
    viewsSum += d.views ?? 0; // 날짜 표는 조회가 없는 날을 빈칸으로 둔다
    if (d.impressions === 0) continue;
    if (d.ctrPercent === null) { uncomputableDays.push(date); continue; }
    const raw = (d.impressions * d.ctrPercent) / 100;
    const rounded = Math.round(raw);
    if (Math.abs(raw - rounded) > (d.impressions * CTR_DECIMAL_TOLERANCE) / 100 + 1e-9) exact = false; // allow-literal: 부동소수 오차
    clicks += rounded;
  }
  return {
    impressions, clicks,
    ctrPercent: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : null, // allow-literal: 퍼센트 환산, 소수 둘째 자리
    ctrMethod: exact ? 'exact-clicks' : 'approx',
    viewsSum, missingDays, uncomputableDays,
  };
}

/** 날짜 표의 조회수 합을 API 첫 7일 조회수와 창을 -1/0/+1일 옮겨 가며 맞춰 보고, 어느 창이 API와 같은 날인지 데이터로 정한다. */
export function checkWindowAgainstApi(days, {startDate}, apiViews) {
  if (finiteOrNull(apiViews) === null) return {status: 'no-api', diffByShift: null};
  const byDate = new Map(days.map((d) => [d.date, d]));
  const diffByShift = {};
  for (const s of SHIFTS) {
    const sum = windowDates(startDate, s).reduce((acc, date) => acc + (byDate.get(date)?.views ?? 0), 0);
    diffByShift[s] = Math.abs(sum - Number(apiViews));
  }
  const best = Math.min(...Object.values(diffByShift));
  const winners = SHIFTS.filter((s) => diffByShift[s] === best);
  if (winners.length === 1) return {status: winners[0] === 0 ? 'match' : 'shifted', best: winners[0], diffByShift};
  return {status: winners.includes(0) ? 'ambiguous' : 'shifted', best: winners.includes(0) ? 0 : winners[0], diffByShift};
}

/**
 * 기준선에 쓸 수 있는 값인지: 창이 맞고(같거나 구분 안 됨), 클릭률을 못 구한 날이 없어야 한다.
 * 표에 없는 날(missingDays)은 날짜 표 조회수 합이 API 첫 7일 조회수와 정확히 같을 때만 "활동 없는 날 = 노출 0"으로 본다.
 * 조회수가 다르면(빠진 날에 조회가 있었을 수 있다) 쓰지 않는다. API 값을 모르면 확인할 수 없으니 쓰지 않는다.
 */
export function usabilityOf(check, first7d, {viewsSum = null, apiViews = null} = {}) {
  if (first7d.uncomputableDays?.length) return {usable: false, reason: `노출은 있는데 클릭률이 빈 날 ${first7d.uncomputableDays.length}일`};
  if (check.status === 'shifted') return {usable: false, reason: `창 불일치: 조회수 합이 ${check.best > 0 ? '+' : ''}${check.best}일 옮긴 창과 가장 가까움`};
  if (first7d.missingDays.length) {
    if (finiteOrNull(apiViews) === null) return {usable: false, reason: `창 안에 빠진 날 ${first7d.missingDays.length}일, API 조회수가 없어 0으로 봐도 되는지 확인 못 함`};
    if (viewsSum !== Number(apiViews)) return {usable: false, reason: `창 안에 빠진 날 ${first7d.missingDays.length}일이 있고 조회수 합(${viewsSum})이 API(${apiViews})와 다름`};
    return {usable: true, reason: null, missingTreatedAsZero: true};
  }
  return {usable: true, reason: null, missingTreatedAsZero: false};
}

/** 저장된 기록을 규칙이 바뀐 뒤 다시 계산한다(표 원본은 창 앞뒤 하루씩 days에 남아 있어 크롬 없이 가능). 바뀐 기록 수를 돌려준다. */
export function recomputeStore(store) {
  let changed = 0;
  for (const [id, r] of Object.entries(store.videos || {})) {
    if (!Array.isArray(r.days)) continue;
    const next = buildRecord({days: r.days, window: {startDate: r.startDate, endDate: r.endDate}, apiViews: r.apiViews7d, now: new Date(r.fetchedAt)});
    if (JSON.stringify(next) !== JSON.stringify(r)) { store.videos[id] = next; changed++; }
  }
  return changed;
}

/** 수집 대상: 공개됐고, API 첫 7일이 이미 있고(같은 창을 쓴다), 아직 스튜디오 값이 없고, 3번 실패하지 않은 영상. 공개가 오래된 것부터가 아니라 새 영상부터. */
export function selectTargets({catalog = [], lifetime = {}, store = {}}) {
  const have = store.videos || {};
  const failures = store.failures || {};
  return catalog
    .filter((v) => v.privacyStatus === 'public' && lifetime[v.videoId]?.first7d?.startDate && !have[v.videoId] && (failures[v.videoId]?.attempts || 0) < MAX_ATTEMPTS)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), {recursive: true});
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}
const readJsonOr = (path, fallback) => { if (!existsSync(path)) return fallback; try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };

/** 영상 하나의 날짜 표를 받아 첫 7일 값으로 만든다(저장은 부른 쪽이 한다). */
export function buildRecord({days, window, apiViews, now}) {
  const first7d = first7dFromDays(days, window);
  const check = checkWindowAgainstApi(days, window, apiViews);
  const use = usabilityOf(check, first7d, {viewsSum: first7d.viewsSum, apiViews});
  const keep = new Set([...windowDates(window.startDate, -1), ...windowDates(window.startDate), ...windowDates(window.startDate, 1)]); // 창 앞뒤 하루씩 원본을 남겨 나중에 다시 계산할 수 있게
  return {
    startDate: window.startDate, endDate: window.endDate, fetchedAt: now.toISOString(), source: 'studio-video-day-table',
    impressions: first7d.impressions, clicks: first7d.clicks, ctrPercent: first7d.ctrPercent, ctrMethod: first7d.ctrMethod,
    viewsSum: first7d.viewsSum, apiViews7d: finiteOrNull(apiViews),
    windowCheck: check, missingDays: first7d.missingDays, uncomputableDays: first7d.uncomputableDays, missingTreatedAsZero: use.missingTreatedAsZero === true, usable: use.usable, unusableReason: use.reason,
    days: days.filter((d) => keep.has(d.date)),
  };
}

/**
 * 대상 영상의 날짜 표를 받아 저장한다. 받은 것은 영상 하나마다 바로 저장한다(중간에 멈춰도 잃지 않는다).
 * 영상 하나만의 오류는 failures에 적고 계속하고, 로그인 풀림·칸 이름 바뀜 같은 전체 오류는 남은 영상을 멈추고 던진다.
 * 실패가 하나라도 있으면 마지막에 던져서 매일 루프가 고장으로 알리게 한다.
 */
export async function collectStudioFirst7d({limit = DAILY_LIMIT, only = null, now = new Date()} = {}) {
  const catalog = readJsonOr(join(dataDir, 'catalog.json'), {videos: []}).videos || [];
  const lifetime = readJsonOr(join(dataDir, 'video-lifetime.json'), {videos: {}}).videos || {};
  const store = readJsonOr(first7dPath, {schemaVersion: 1, videos: {}, failures: {}});
  store.videos ||= {};
  store.failures ||= {};
  let targets = selectTargets({catalog, lifetime, store});
  if (only) targets = catalog.filter((v) => v.videoId === only);
  const pending = targets.length;
  if (Number.isFinite(limit)) targets = targets.slice(0, limit);
  const result = {pending, requested: targets.length, saved: 0, unusable: 0, failed: []};
  if (!targets.length) return result;

  const chrome = await setupStudioChrome({launchIfDown: true});
  if (!chrome.supported || chrome.login !== 'logged-in') {
    throw new Error(`Studio-Automation 크롬에 채널 소유 계정 로그인이 필요함 (상태: ${chrome.login || chrome.error || chrome.reason})`);
  }
  const release = acquireLock();
  const work = mkdtempSync(join(tmpdir(), 'studio-first7d-'));
  let browser = null, page = null, fatal = null;
  try {
    browser = await chromium.connectOverCDP(`http://localhost:${STUDIO_PORT}`);
    page = await browser.contexts()[0].newPage();
    await page.setViewportSize({width: 1600, height: 1000});
    for (const v of targets) {
      const id = v.videoId;
      try {
        const api = lifetime[id]?.first7d;
        if (!api?.startDate) throw new Error('API 첫 7일 창이 없음');
        const {zipPath} = await downloadStudioCsv(page, buildStudioDayUrl(id), work);
        const dir = join(work, id);
        await extractZip(zipPath, dir);
        const table = parseStudioDayTable(readFileSync(join(dir, '표 데이터.csv'), 'utf8'));
        const record = buildRecord({days: table.days, window: {startDate: api.startDate, endDate: api.endDate}, apiViews: api.views, now});
        store.videos[id] = record;
        delete store.failures[id];
        result.saved++;
        if (!record.usable) result.unusable++;
      } catch (err) {
        const reason = String(err.message).split('\n')[0].slice(0, 200);
        const prev = store.failures[id] || {attempts: 0};
        store.failures[id] = {reason, lastTriedAt: now.toISOString(), attempts: prev.attempts + 1};
        result.failed.push({videoId: id, error: reason});
        // 전체에 걸린 오류(로그인 풀림, 표 칸 이름 바뀜)는 남은 영상도 같은 이유로 실패하므로 멈춘다.
        if (err.loginNeeded || /날짜 표 칸이 다름|구글 로그인/.test(reason)) { fatal = err; break; }
      }
      store.schemaVersion = 1;
      store.channelId = OUR_CHANNEL_ID;
      store.updatedAt = now.toISOString();
      writeJsonAtomic(first7dPath, store);
    }
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    release();
    try { rmSync(work, {recursive: true, force: true, maxRetries: 5, retryDelay: 200}); } catch {}
  }
  store.updatedAt = now.toISOString();
  writeJsonAtomic(first7dPath, store);
  if (fatal) throw new Error(`스튜디오 첫 7일 수집 중단: ${fatal.message} (저장 ${result.saved}편, 남은 대상 ${pending - result.saved}편)`);
  if (result.failed.length) {
    throw new Error(`스튜디오 첫 7일 수집 실패 ${result.failed.length}편: ${result.failed.slice(0, 3).map((f) => `${f.videoId}(${f.error})`).join(', ')}${result.failed.length > 3 ? ' 외' : ''} (저장 ${result.saved}편)`);
  }
  return result;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFile)) {
  const args = process.argv.slice(2);
  if (args.includes('--recompute')) {
    const store = readJsonOr(first7dPath, {schemaVersion: 1, videos: {}, failures: {}});
    const changed = recomputeStore(store);
    if (changed) writeJsonAtomic(first7dPath, store);
    const usable = Object.values(store.videos).filter((r) => r.usable).length;
    console.log(JSON.stringify({recomputed: changed, total: Object.keys(store.videos).length, usable}));
    process.exit(0);
  }
  const all = args.includes('--all');
  const limitIdx = args.indexOf('--limit');
  const idIdx = args.indexOf('--id');
  collectStudioFirst7d({limit: all ? Infinity : limitIdx >= 0 ? Number(args[limitIdx + 1]) : DAILY_LIMIT, only: idIdx >= 0 ? args[idIdx + 1] : null})
    .then((r) => console.log(JSON.stringify(r, null, 2)))
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}
