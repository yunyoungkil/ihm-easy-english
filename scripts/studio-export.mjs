import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {setupStudioChrome, STUDIO_PORT} from './setup-studio-chrome.mjs';
import {extractZip, ingestZipFile} from './studio-auto-ingest.mjs';
import {OUR_CHANNEL_ID} from './youtube-publisher.mjs';

/**
 * 유튜브 스튜디오 "고급 모드" 영상별 표를 읽기 전용으로 내려받아 저장한다 (2026-11-13).
 * API에 없는 값(썸네일 노출수·클릭률, 신규/재방문 시청자, 계속 시청함)을 매일 자동으로 모은다.
 * 사람이 CSV를 받아 폴더에 넣는 수동 단계를 없앤다.
 * - 같은 zip을 기존 가져오기(imports/youtube-studio → 서버 스캔)에도 넘긴다(노출수·CTR 칸은 그쪽이 읽는다).
 * - 전체 14칸은 data/youtube/studio-metrics.json에 기간별로 저장한다.
 * 주소의 time_period·t_metrics 값은 2026-11-13에 스튜디오 화면을 직접 눌러 읽은 것이다.
 */
const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const studioMetricsPath = join(projectDir, 'data', 'youtube', 'studio-metrics.json');
const studioImportDir = resolve(process.env.YOUTUBE_STUDIO_EXPORT_DIR || join(projectDir, 'imports', 'youtube-studio'));

/** 받을 기간. key는 스튜디오 주소의 time_period 값. */
export const STUDIO_PERIODS = Object.freeze([
  {key: 'week', label: '지난 7일'},
  {key: '4_weeks', label: '지난 28일'},
  {key: 'lifetime', label: '전체'},
]);

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

// 2026-11-13 실제 파일(표 데이터.csv)의 머리글 그대로. 하나라도 없으면 스튜디오가 바뀐 것이므로 실패시킨다.
const COLUMNS = Object.freeze({
  '콘텐츠': 'videoId', '동영상 제목': 'title', '동영상 게시 시간': 'publishedAt', '길이': 'durationSec',
  '평균 시청 지속 시간': 'avgViewDurationSec', '평균 조회율 (%)': 'avgViewPercent', '신규 시청자': 'newViewers',
  '재방문 시청자': 'returningViewers', '계속 시청함 (%)': 'stayedToWatchPercent', '조회수': 'views',
  '시청 시간(단위: 시간)': 'watchHours', '구독자': 'subscribers', '썸네일 노출수': 'impressions', '썸네일 클릭률 (%)': 'ctrPercent',
});

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

const numberOrNull = (v) => {
  const s = String(v ?? '').trim();
  if (s === '' || s === '—' || s === '-') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const durationOrNull = (v) => {
  const s = String(v ?? '').trim();
  if (!s || s === '—') return null;
  const parts = s.split(':').map(Number);
  if (parts.some((p) => !Number.isFinite(p))) return null;
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
  const metricsOf = (r) => ({
    avgViewDurationSec: durationOrNull(r[idx.avgViewDurationSec]),
    avgViewPercent: numberOrNull(r[idx.avgViewPercent]),
    newViewers: numberOrNull(r[idx.newViewers]),
    returningViewers: numberOrNull(r[idx.returningViewers]),
    stayedToWatchPercent: numberOrNull(r[idx.stayedToWatchPercent]),
    views: numberOrNull(r[idx.views]),
    watchHours: numberOrNull(r[idx.watchHours]),
    subscribers: numberOrNull(r[idx.subscribers]),
    impressions: numberOrNull(r[idx.impressions]),
    ctrPercent: numberOrNull(r[idx.ctrPercent]),
  });
  let total = null;
  const videos = {};
  for (const r of rows.slice(1)) {
    const id = String(r[idx.videoId] || '').trim();
    if (id === '합계') { total = metricsOf(r); continue; }
    if (!id) continue;
    videos[id] = {...metricsOf(r), durationSec: numberOrNull(r[idx.durationSec]), publishedAt: dateOrNull(r[idx.publishedAt])};
  }
  return {total, videos};
}

async function downloadPeriod(page, period, workDir) {
  await page.goto(buildStudioExploreUrl({period}), {waitUntil: 'domcontentloaded'});
  await page.getByText('합계', {exact: true}).first().waitFor({timeout: 45000});
  await page.waitForTimeout(1500);
  await page.getByRole('button', {name: '현재 화면 내보내기'}).click();
  await page.waitForTimeout(800);
  const [download] = await Promise.all([page.waitForEvent('download', {timeout: 30000}), page.getByText('쉼표로 구분된 값(.csv)').click()]);
  const failure = await download.failure();
  if (failure) throw new Error(`내려받기 실패: ${failure}`);
  const name = download.suggestedFilename();
  // 이름을 스튜디오가 붙인 그대로 둔다: 기존 가져오기가 이 이름(콘텐츠 시작일_종료일 채널명)에서 기간을 읽는다.
  const zipPath = join(workDir, name);
  await download.saveAs(zipPath);
  return {zipPath, name};
}

/**
 * 기간별로 영상별 표를 받아 저장한다. 읽기 전용(스튜디오 값을 바꾸지 않는다).
 * 로그인이 안 돼 있으면 throw — 매일 루프가 "고장"으로 알려 준다.
 */
export async function collectStudioMetrics({periods = STUDIO_PERIODS, now = new Date(), ingest = true} = {}) {
  const chrome = await setupStudioChrome({launchIfDown: true});
  if (!chrome.supported || chrome.login !== 'logged-in') {
    throw new Error(`Studio-Automation 크롬에 채널 소유 계정 로그인이 필요함 (상태: ${chrome.login || chrome.error || chrome.reason}, 바탕화면 Studio-Automation 아이콘)`);
  }
  const work = mkdtempSync(join(tmpdir(), 'studio-export-'));
  const browser = await chromium.connectOverCDP(`http://localhost:${STUDIO_PORT}`);
  const saved = existsSync(studioMetricsPath) ? JSON.parse(readFileSync(studioMetricsPath, 'utf8')) : {schemaVersion: 1, periods: {}};
  const result = {done: [], failed: []};
  try {
    const ctx = browser.contexts()[0];
    const page = ctx.pages().find((p) => p.url().includes('studio.youtube.com')) || await ctx.newPage();
    await page.setViewportSize({width: 1600, height: 1000});
    for (const p of periods) {
      try {
        const {zipPath, name} = await downloadPeriod(page, p.key, work);
        const range = periodFromZipName(name);
        if (!range) throw new Error(`파일 이름에서 기간을 못 읽음: ${name}`);
        const dir = join(work, p.key);
        await extractZip(zipPath, dir);
        const table = parseStudioTable(readFileSync(join(dir, '표 데이터.csv'), 'utf8'));
        saved.periods[p.key] = {label: p.label, ...range, fetchedAt: now.toISOString(), total: table.total, videos: table.videos};
        // 기존 가져오기에도 같은 파일을 넘긴다(서버가 노출수·CTR을 영상에 연결한다). 이름은 스튜디오가 붙인 그대로 둔다.
        if (ingest) {
          mkdirSync(studioImportDir, {recursive: true});
          await ingestZipFile(zipPath, studioImportDir).catch(() => null);
        }
        result.done.push({period: p.key, ...range, videos: Object.keys(table.videos).length});
      } catch (err) {
        result.failed.push({period: p.key, error: String(err.message).split('\n')[0].slice(0, 200)});
      }
    }
  } finally {
    await browser.close().catch(() => {});
    rmSync(work, {recursive: true, force: true});
  }
  if (result.done.length) {
    saved.schemaVersion = 1;
    saved.channelId = OUR_CHANNEL_ID;
    saved.fetchedAt = now.toISOString();
    mkdirSync(dirname(studioMetricsPath), {recursive: true});
    writeFileSync(studioMetricsPath, `${JSON.stringify(saved, null, 2)}\n`, 'utf8');
  }
  if (!result.done.length) throw new Error(`스튜디오 표를 하나도 못 받음: ${result.failed.map((f) => `${f.period}(${f.error})`).join(', ')}`);
  return result;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFile)) {
  collectStudioMetrics().then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
