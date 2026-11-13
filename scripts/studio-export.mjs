import {closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, renameSync, rmSync, statSync, unlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {setupStudioChrome, STUDIO_PORT} from './setup-studio-chrome.mjs';
import {extractZip} from './studio-auto-ingest.mjs';
import {toStoredCtr} from './studio-reach.mjs';
import {OUR_CHANNEL_ID} from './youtube-publisher.mjs';

/**
 * 유튜브 스튜디오 "고급 모드" 영상별 표를 읽기 전용으로 내려받아 저장한다 (2026-11-13).
 * API에 없는 값(썸네일 노출수·클릭률, 신규/재방문 시청자, 계속 시청함)을 매일 자동으로 모은다.
 * 사람이 CSV를 받아 폴더에 넣는 수동 단계를 없앤다.
 * - 전체 14칸은 data/youtube/studio-metrics.json에 기간별 최신본으로 저장한다.
 * - 노출수·CTR은 90일(quarter) 값을 video-reach-manual.json의 고정 키 하나에 덮어쓴다.
 *   기존 폴더 가져오기(imports/youtube-studio)는 쓰지 않는다: 기간 이름이 매일 바뀌어 항목이 하루 200여 개씩 쌓이고,
 *   7일·전체 구간이 기존 90일 진단 구간을 밀어냈다(2026-11-13 Opus 리뷰 C).
 * 주소의 time_period·t_metrics 값은 2026-11-13에 스튜디오 화면을 직접 눌러 읽은 것이다.
 */
const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const studioMetricsPath = join(projectDir, 'data', 'youtube', 'studio-metrics.json');
export const reachPath = join(projectDir, 'data', 'youtube', 'video-reach-manual.json');
const lockPath = join(tmpdir(), 'studio-export.lock');
const LOCK_STALE_MS = 1800000; // allow-literal: 30분. 이보다 오래된 잠금은 죽은 실행의 것으로 본다
const DOWNLOAD_TIMEOUT_MS = 60000; // allow-literal: 내려받기·저장 대기 한계(60초)
const LOAD_TIMEOUT_MS = 45000; // allow-literal: 표가 뜰 때까지 기다리는 한계
const DAY_MS = 86400000; // allow-literal: 하루(ms)

/** 받을 기간. key는 스튜디오 주소의 time_period 값. */
export const STUDIO_PERIODS = Object.freeze([
  {key: 'week', label: '지난 7일'},
  {key: '4_weeks', label: '지난 28일'},
  {key: 'quarter', label: '지난 90일'},
  {key: 'lifetime', label: '전체'},
]);
/** 노출수·CTR을 video-reach-manual.json에 덮어쓸 기간과 그 키. 기존 진단이 쓰던 구간(약 90일)을 그대로 이어 간다. */
export const REACH_PERIOD = 'quarter';
export const ROLLING_REACH_KEY = 'studio-auto-quarter';
/** 기간 이름이 정한 일수(zip 이름의 시작~끝 날짜 차이). 스튜디오가 기간 값을 무시하고 기본값으로 바꿔 주면 잡는다. */
export const EXPECTED_DAYS = Object.freeze({week: 7, '4_weeks': 28, quarter: 90}); // allow-literal: 스튜디오 기간 정의

/** 표에 넣을 측정항목(주소의 t_metrics 값). 순서는 화면 열 순서가 아니라 선택 순서다. */
export const STUDIO_METRICS = Object.freeze([
  'AVERAGE_WATCH_TIME', 'AVERAGE_WATCH_PERCENTAGE', 'RECENT_VIEWERS', 'RETURNING_VIEWERS', 'SHORTS_FEED_IMPRESSIONS_VTR',
  'EXTERNAL_VIEWS', 'EXTERNAL_WATCH_TIME', 'SUBSCRIBERS_NET_CHANGE', 'VIDEO_THUMBNAIL_IMPRESSIONS', 'VIDEO_THUMBNAIL_IMPRESSIONS_VTR',
]);

export function buildStudioExploreUrl({channelId = OUR_CHANNEL_ID, period, dimension = 'VIDEO'}) {
  const q = new URLSearchParams({entity_type: 'CHANNEL', entity_id: channelId, time_period: period, explore_type: 'TABLE_AND_CHART', metrics_computation_type: 'DELTA', metric: 'EXTERNAL_VIEWS', granularity: 'DAY'});
  for (const m of STUDIO_METRICS) q.append('t_metrics', m);
  q.set('dimension', dimension);
  q.set('o_column', 'EXTERNAL_VIEWS');
  q.set('o_direction', 'ANALYTICS_ORDER_DIRECTION_DESC');
  return `https://studio.youtube.com/channel/${channelId}/analytics/hub_overview/explore?${q}`;
}

/** 내려받은 파일 이름 "콘텐츠 2026-11-06_2026-11-13 채널명.zip"에서 기간을 읽는다. */
export function periodFromZipName(name) {
  const m = String(name || '').match(/(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/);
  return m ? {startDate: m[1], endDate: m[2]} : null;
}

/** 스튜디오가 붙인 파일 이름이 예상한 모양인지(경로 조각이 섞이지 않았는지) 확인한다. */
export function isStudioZipName(name) {
  return /^콘텐츠 \d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2} [^\\/]+\.zip$/.test(String(name || ''));
}

/** zip 이름의 종료일은 "마지막 날의 다음 날"이다(화면은 ~11. 12.인데 이름은 11-13). 화면과 API(마지막 날 포함)에 맞춘 마지막 날. */
export function lastDayOf(endDate) {
  const t = Date.parse(`${endDate}T00:00:00Z`);
  return Number.isFinite(t) ? new Date(t - DAY_MS).toISOString().slice(0, 10) : null;
}

/** 기간 이름과 실제로 받은 구간 길이가 다르면 던진다(스튜디오가 기간 값을 무시하고 기본 28일로 바꿔 주는 경우 등). */
export function checkPeriodDays(key, range) {
  const expected = EXPECTED_DAYS[key];
  if (!expected) return;
  const days = Math.round((Date.parse(range.endDate) - Date.parse(range.startDate)) / DAY_MS);
  if (days !== expected) throw new Error(`${key}인데 ${days}일 구간을 받음(스튜디오가 기간 값을 바꿨는지 확인)`);
}

// 2026-11-13 실제 파일(표 데이터.csv)의 머리글 그대로. 하나라도 없으면 스튜디오가 바뀐 것이므로 실패시킨다.
const COLUMNS = Object.freeze({
  '콘텐츠': 'videoId', '동영상 제목': 'title', '동영상 게시 시간': 'publishedAt', '길이': 'durationSec',
  '평균 시청 지속 시간': 'avgViewDurationSec', '평균 조회율 (%)': 'avgViewPercent', '신규 시청자': 'newViewers',
  '재방문 시청자': 'returningViewers', '계속 시청함 (%)': 'stayedToWatchPercent', '조회수': 'views',
  '시청 시간(단위: 시간)': 'watchHours', '구독자': 'subscribers', '썸네일 노출수': 'impressions', '썸네일 클릭률 (%)': 'ctrPercent',
});
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** 따옴표 안의 쉼표·줄바꿈을 지키는 CSV 분리. */
export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  const src = String(text || '').replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); if (row.some((v) => v !== '')) rows.push(row); }
  return rows;
}

const isBlank = (s) => s === '' || s === '—' || s === '-';
// 빈칸·"—"는 null(없음). 그 밖에 숫자로 못 읽는 값(예: "1.63%")은 조용히 null로 바꾸지 않고 던진다 — 표기가 바뀌면 값이 전부 사라진 채 쌓인다.
const numberOrNull = (v, label) => {
  const s = String(v ?? '').trim();
  if (isBlank(s)) return null;
  const n = Number(s.replace(/,/g, ''));
  if (!Number.isFinite(n)) throw new Error(`숫자로 못 읽은 칸: ${label}="${s}" (스튜디오 표기가 바뀌었는지 확인)`);
  return n;
};
const durationOrNull = (v, label) => {
  const s = String(v ?? '').trim();
  if (isBlank(s)) return null;
  const parts = s.split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) throw new Error(`시간으로 못 읽은 칸: ${label}="${s}" (스튜디오 표기가 바뀌었는지 확인)`);
  return parts.reduce((sec, p) => sec * 60 + p, 0);
};
const dateOrNull = (v) => {
  const t = Date.parse(`${String(v || '').trim()} UTC`);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
};

/** 표 데이터.csv 글자 → {total, videos}. 값이 비었거나 "—"이면 null로 둔다(0으로 바꾸지 않는다). */
export function parseStudioTable(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error('표 데이터.csv 내용 부족');
  const headers = rows[0].map((h) => h.trim());
  const missing = Object.keys(COLUMNS).filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`스튜디오 표에 없는 칸: ${missing.join(', ')} (화면이 바뀌었는지 확인)`);
  const idx = Object.fromEntries(Object.entries(COLUMNS).map(([h, key]) => [key, headers.indexOf(h)]));
  const num = (r, key, label) => numberOrNull(r[idx[key]], label);
  const metricsOf = (r) => ({
    avgViewDurationSec: durationOrNull(r[idx.avgViewDurationSec], '평균 시청 지속 시간'),
    avgViewPercent: num(r, 'avgViewPercent', '평균 조회율 (%)'),
    newViewers: num(r, 'newViewers', '신규 시청자'),
    returningViewers: num(r, 'returningViewers', '재방문 시청자'),
    stayedToWatchPercent: num(r, 'stayedToWatchPercent', '계속 시청함 (%)'),
    views: num(r, 'views', '조회수'),
    watchHours: num(r, 'watchHours', '시청 시간(단위: 시간)'),
    subscribers: num(r, 'subscribers', '구독자'),
    impressions: num(r, 'impressions', '썸네일 노출수'),
    ctrPercent: num(r, 'ctrPercent', '썸네일 클릭률 (%)'),
  });
  let total = null;
  const videos = {};
  for (const r of rows.slice(1)) {
    const id = String(r[idx.videoId] || '').trim();
    if (id === '합계') { total = metricsOf(r); continue; }
    if (!id) continue;
    if (!VIDEO_ID.test(id)) throw new Error(`영상 ID가 아닌 줄: "${id.slice(0, 40)}" (표 모양이 바뀌었는지 확인)`);
    videos[id] = {...metricsOf(r), durationSec: num(r, 'durationSec', '길이'), publishedAt: dateOrNull(r[idx.publishedAt])};
  }
  // 전체 기간 합계는 신규·재방문을 0으로 적어 주지만 영상 줄은 모두 비어 있다. 계산하지 않은 값이므로 0이 아니라 null로 둔다.
  for (const k of ['newViewers', 'returningViewers']) {
    if (total && total[k] === 0 && Object.values(videos).every((v) => v[k] == null)) total[k] = null;
  }
  return {total, videos};
}

/**
 * 기간 표의 노출수·CTR을 video-reach-manual.json 영상 항목의 고정 키 하나에 덮어쓴다(날마다 키가 늘지 않는다).
 * 노출수가 없는 영상은 건너뛴다(0으로 채우지 않는다). 바뀐 영상 수를 돌려준다.
 */
export function mergeRollingReach(reach, videos, range, fetchedAt) {
  reach.videos ||= {};
  let merged = 0;
  for (const [id, v] of Object.entries(videos)) {
    if (v.impressions == null) continue;
    reach.videos[id] ||= {videoId: id, windows: {}, periods: {}};
    reach.videos[id].periods ||= {};
    reach.videos[id].periods[ROLLING_REACH_KEY] = {
      startDate: range.startDate,
      endDate: range.endDate,
      impressions: Math.round(v.impressions),
      ctr: toStoredCtr(v.ctrPercent),
      packageId: `youtube-${id}`,
      source: 'studio-export-rolling',
      fetchedAt,
    };
    merged++;
  }
  return merged;
}

const withTimeout = (promise, ms, what) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`${what} ${Math.round(ms / 1000)}초 안에 안 끝남`)), ms))]);

function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), {recursive: true});
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

function readJsonOr(path, fallback) {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

/** 두 실행(매일 루프와 손으로 실행)이 같은 크롬을 동시에 움직이지 않게 잠근다. */
function acquireLock() {
  try {
    if (existsSync(lockPath) && Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS) unlinkSync(lockPath);
    closeSync(openSync(lockPath, 'wx'));
  } catch (err) {
    if (err.code === 'EEXIST') throw new Error('스튜디오 수집이 이미 실행 중임(다른 실행이 끝난 뒤 다시)');
    throw err;
  }
  return () => { try { unlinkSync(lockPath); } catch {} };
}

async function downloadPeriod(page, period, workDir) {
  await page.goto(buildStudioExploreUrl({period}), {waitUntil: 'domcontentloaded'});
  if (page.url().includes('accounts.google.com')) {
    const err = new Error('Studio-Automation 크롬의 구글 로그인이 풀림(로그인 화면으로 이동됨)');
    err.loginNeeded = true;
    throw err;
  }
  await page.getByText('합계', {exact: true}).first().waitFor({timeout: LOAD_TIMEOUT_MS});
  await page.waitForTimeout(1500);
  await page.getByRole('button', {name: '현재 화면 내보내기'}).click();
  await page.waitForTimeout(800);
  const [download] = await Promise.all([page.waitForEvent('download', {timeout: DOWNLOAD_TIMEOUT_MS}), page.getByText('쉼표로 구분된 값(.csv)').click()]);
  const failure = await withTimeout(download.failure(), DOWNLOAD_TIMEOUT_MS, '내려받기');
  if (failure) throw new Error(`내려받기 실패: ${failure}`);
  const name = basename(download.suggestedFilename());
  if (!isStudioZipName(name)) throw new Error(`예상 밖의 파일 이름: ${name.slice(0, 80)}`);
  const zipPath = join(workDir, name);
  await withTimeout(download.saveAs(zipPath), DOWNLOAD_TIMEOUT_MS, '파일 저장');
  return {zipPath, name};
}

/**
 * 기간별로 영상별 표를 받아 저장한다. 읽기 전용(스튜디오 값을 바꾸지 않는다).
 * 받은 기간은 일부만 성공해도 먼저 저장하고, 실패한 기간이 하나라도 있으면 마지막에 던져 매일 루프가 고장으로 알리게 한다.
 */
export async function collectStudioMetrics({periods = STUDIO_PERIODS, now = new Date()} = {}) {
  const chrome = await setupStudioChrome({launchIfDown: true});
  if (!chrome.supported || chrome.login !== 'logged-in') {
    throw new Error(`Studio-Automation 크롬에 채널 소유 계정 로그인이 필요함 (상태: ${chrome.login || chrome.error || chrome.reason}, 바탕화면 Studio-Automation 아이콘)`);
  }
  const release = acquireLock();
  const work = mkdtempSync(join(tmpdir(), 'studio-export-'));
  const result = {done: [], failed: []};
  const tables = {};
  let browser = null;
  let page = null;
  try {
    browser = await chromium.connectOverCDP(`http://localhost:${STUDIO_PORT}`);
    // 사용자가 쓰던 스튜디오 탭을 건드리지 않게 항상 새 탭에서 한다.
    page = await browser.contexts()[0].newPage();
    await page.setViewportSize({width: 1600, height: 1000});
    for (const p of periods) {
      try {
        const {zipPath, name} = await downloadPeriod(page, p.key, work);
        const range = periodFromZipName(name);
        if (!range) throw new Error(`파일 이름에서 기간을 못 읽음: ${name}`);
        checkPeriodDays(p.key, range);
        const dir = join(work, p.key);
        await extractZip(zipPath, dir);
        const table = parseStudioTable(readFileSync(join(dir, '표 데이터.csv'), 'utf8'));
        tables[p.key] = {label: p.label, ...range, lastDay: lastDayOf(range.endDate), fetchedAt: now.toISOString(), total: table.total, videos: table.videos};
        result.done.push({period: p.key, ...range, videos: Object.keys(table.videos).length});
      } catch (err) {
        result.failed.push({period: p.key, error: String(err.message).split('\n')[0].slice(0, 200)});
        if (err.loginNeeded) break; // 로그인이 풀렸으면 남은 기간도 못 받는다
      }
    }
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {}); // CDP 연결만 끊고 크롬은 둔다
    release();
  }
  // 받은 것을 먼저 저장하고 나서 임시 폴더를 지운다(지우기가 EBUSY로 실패해도 받은 결과를 버리지 않는다).
  if (result.done.length) {
    const saved = readJsonOr(studioMetricsPath, {schemaVersion: 1, periods: {}});
    saved.periods ||= {};
    Object.assign(saved.periods, tables);
    saved.schemaVersion = 1;
    saved.channelId = OUR_CHANNEL_ID;
    saved.fetchedAt = now.toISOString();
    writeJsonAtomic(studioMetricsPath, saved);
    const reachTable = tables[REACH_PERIOD];
    if (reachTable) {
      const reach = readJsonOr(reachPath, {schemaVersion: 1, videos: {}});
      result.reachMerged = mergeRollingReach(reach, reachTable.videos, {startDate: reachTable.startDate, endDate: reachTable.endDate}, now.toISOString());
      reach.updatedAt = now.toISOString();
      writeJsonAtomic(reachPath, reach);
    }
  }
  try { rmSync(work, {recursive: true, force: true, maxRetries: 5, retryDelay: 200}); } catch {}
  if (result.failed.length) {
    throw new Error(`스튜디오 표 일부 실패: ${result.failed.map((f) => `${f.period}(${f.error})`).join(', ')} / 받은 기간: ${result.done.map((d) => d.period).join(', ') || '없음'}`);
  }
  return result;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFile)) {
  collectStudioMetrics().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
