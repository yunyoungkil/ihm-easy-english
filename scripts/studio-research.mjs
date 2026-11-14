// 스튜디오 조사 목록 수집기 1단계: 로그인·브라우저 없이 시험 가능한 순수 함수.
// 설계: knowledge/decisions/2026-11-14-research-source-design-draft.md 2·3절.

export const STUDIO_RESEARCH_PATH = 'data/youtube/studio-research.json';
export const STUDIO_FOLDS_MIN = 10; // allow-literal: 설계 3절 제안 값(가설)
export const MAX_SUBSCRIBERS = 100000; // allow-literal: 설계 3절 제안 값(가설), market-demand.mjs와 같은 값
export const CANDIDATE_TTL_DAYS = 30; // allow-literal: 설계 3절 제안 값(가설)
export const ROW_CAP = 1200; // allow-literal: 설계 3절 제안 값(가설)
export const SCROLL_CAP = 150; // allow-literal: 설계 3절 제안 값(가설)
export const NO_GROWTH_LIMIT = 4; // allow-literal: 설계 3절 제안 값(가설)
export const POSSIBLE_CAP_ROWS = 1000; // allow-literal: 11/14 쇼츠 최근 업로드가 정확히 1000줄
export const MIN_PARSE_RATE = 0.9; // allow-literal: 설계 2절 실패 처리 기준
export const RUNS_KEEP = 60; // allow-literal: 설계 2절 runs 최근 60개
// 출처: scripts/outlier-report.mjs 243줄 RELEVANT_TITLE_RE (export되지 않아 같은 식을 복사)
const RELEVANT_TITLE_RE = /영어|영단어|english|발음|파닉스|phonics|단어|회화|듣기|리스닝|스피킹|문법|원어민|미드|읽는/i;
const EXCLUDE_TITLE_RE = /맞춤법|국어|#예능|#유머/;
const HANGUL_RE = /[가-힣]/;

const UNIT = {천: 1e3, 만: 1e4, 억: 1e8};

export function parseKoreanCount(text) {
  if (text == null) return null;
  const m = String(text).replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(천|만|억)?/);
  if (!m) return null;
  const n = Number(m[1]) * (UNIT[m[2]] || 1);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function parseCardText(text) {
  const t = String(text ?? '');
  // 카드 글자 순서: 길이, 제목, 채널, 구독자, 배수, 조회수, 업로드 시점(2026-11-14 실제 화면). 제목에 "10배"가 있어도 섞이지 않게
  // 마지막 "구독자" 뒤쪽만 읽고, 배수는 구독자 바로 뒤의 것만 받는다. 최근 업로드처럼 배수 뱃지가 없는 카드는 null.
  const idx = t.lastIndexOf('구독자');
  const tail = idx >= 0 ? t.slice(idx) : '';
  const foldM = tail.match(/^구독자\s*[\d.,]+\s*(?:천|만|억)?\s*명?\s*(\d+(?:\.\d+)?)\s*배/);
  const subM = tail.match(/^구독자\s*([\d.,]+\s*(?:천|만|억)?)\s*명?/);
  const viewM = tail.match(/조회수\s*([\d.,]+\s*(?:천|만|억)?)\s*회?/);
  const upM = tail.match(/(\d+\s*(?:초|분|시간|일|주|개월|년)\s*전)/);
  const durM = t.match(/(?<![\d:])(\d{1,2}(?::\d{2}){1,2})(?![\d:])/);
  return {
    studioFolds: foldM ? Math.round(Number(foldM[1])) : null,
    studioSubscribers: subM ? parseKoreanCount(subM[1]) : null,
    studioViews: viewM ? parseKoreanCount(viewM[1]) : null,
    uploadedText: upM ? upM[1] : null,
    durationText: durM ? durM[1] : null,
  };
}

export function passesA(card) {
  return Number.isFinite(card?.studioFolds) && card.studioFolds >= STUDIO_FOLDS_MIN
    && Number.isFinite(card?.studioSubscribers) && card.studioSubscribers < MAX_SUBSCRIBERS;
}

export function passesB(meta, ourChannelId) {
  const title = meta?.title ?? '';
  if (!title) return {pass: false, reason: 'no-title'};
  if (ourChannelId && meta.channelId === ourChannelId) return {pass: false, reason: 'our-channel'};
  if (!HANGUL_RE.test(title)) return {pass: false, reason: 'no-hangul'};
  if (EXCLUDE_TITLE_RE.test(title)) return {pass: false, reason: 'excluded-word'};
  if (!RELEVANT_TITLE_RE.test(title)) return {pass: false, reason: 'not-english-learning'};
  return {pass: true, reason: null};
}

export function mergeCandidates(existing, incoming, nowISO) {
  const out = {};
  const nowMs = Date.parse(nowISO);
  const ttlMs = CANDIDATE_TTL_DAYS * 86400000;
  const keys = new Set([...Object.keys(existing || {}), ...Object.keys(incoming || {})]);
  for (const id of keys) {
    const a = existing?.[id];
    const b = incoming?.[id];
    let merged;
    if (a && b) {
      merged = {
        ...a, ...b,
        firstSeenAt: a.firstSeenAt <= b.firstSeenAt ? a.firstSeenAt : b.firstSeenAt,
        lastSeenAt: a.lastSeenAt >= b.lastSeenAt ? a.lastSeenAt : b.lastSeenAt,
        // 본 날 수: 더 늦은 날짜가 들어올 때만 1을 더한다(같은 날 두 번 돌리거나 두 PC가 합칠 때 부풀지 않게)
        timesSeen: String(b.lastSeenAt).slice(0, 10) > String(a.lastSeenAt).slice(0, 10)
          ? (a.timesSeen || 1) + 1 : Math.max(a.timesSeen || 1, b.timesSeen || 1),
      };
    } else {
      merged = {...(a || b)};
      if (b && !a) merged.timesSeen = b.timesSeen || 1;
    }
    if (nowMs - Date.parse(merged.lastSeenAt) > ttlMs) continue;
    out[id] = merged;
  }
  return out;
}

export function decideEndReason({rowCount, noGrowthStreak, scrolls}) {
  const possibleCap = rowCount === POSSIBLE_CAP_ROWS;
  let endReason = null;
  if (noGrowthStreak >= NO_GROWTH_LIMIT) endReason = 'no-more';
  else if (rowCount >= ROW_CAP) endReason = 'row-cap';
  else if (scrolls >= SCROLL_CAP) endReason = 'scroll-cap';
  return {endReason, possibleCap};
}

export function judgeScreen({listed, parsedRate, filterKept, isRecent}) {
  if (!listed) return {changed: true, reason: 'zero-rows'};
  if (filterKept === false) return {changed: true, reason: 'filter-lost'};
  // isRecent: 호출하는 쪽이 배수가 빈 줄을 성공으로 쳐서 parsedRate를 계산한다.
  if (!(parsedRate >= MIN_PARSE_RATE)) return {changed: true, reason: isRecent ? 'parse-rate-low-recent' : 'parse-rate-low'};
  return {changed: false, reason: null};
}

export function emptyStore(channelId) {
  return {schemaVersion: 1, channelId, updatedAt: null, filterVersion: 1, runs: [], candidates: {}};
}

export function appendRun(store, run) {
  const same = (r) => run.date && run.format && run.list && r.date === run.date && r.format === run.format && r.list === run.list;
  return {...store, runs: [...(store.runs || []).filter((r) => !same(r)), run].slice(-RUNS_KEEP)};
}

// ───────── 브라우저 수집기 (읽기 전용: 주소로 이동하고 스크롤만 한다. 클릭하는 것은 없다) ─────────
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {setupStudioChrome, STUDIO_PORT} from './setup-studio-chrome.mjs';
import {acquireLock} from './studio-export.mjs';
import {OUR_CHANNEL_ID} from './youtube-publisher.mjs';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const storePath = join(projectDir, STUDIO_RESEARCH_PATH);
const rawPath = join(projectDir, 'data', 'youtube', 'studio-research-raw.json');
const FORMATS = {LONGFORM: 'CONTENT_TYPE_FILTER_VIDEOS', SHORTS: 'CONTENT_TYPE_FILTER_SHORTS'};
const FEEDS = {outliers: 'LANDING_PAGE_FEED_TYPE_CHANNEL_RELEVANT_OUTLIERS', recent: 'LANDING_PAGE_FEED_TYPE_CHANNEL_RELEVANT_AND_RECENT'};
const SCROLL_WAIT_MS = 1300; // allow-literal: 시제품이 잰 값(목록이 늘어나기를 기다리는 시간)
const FIRST_PAINT_WAIT_MS = 6000; // allow-literal: 시제품과 같은 첫 화면 대기
const API_TIMEOUT_MS = 20000; // allow-literal: 다른 수집 코드와 같은 요청 제한 시간
const SOUND_TOPIC_RE = /발음|소리|파닉스/; // 자기 강화 점검용 "발음·소리" 주제(설계 7절 2번)
const readJsonOr = (path, fallback) => { if (!existsSync(path)) return fallback; try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };
function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), {recursive: true});
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

// 후보 파일이 있는데 못 읽으면 오류를 던진다(빈 파일로 덮어써 후보와 기록을 잃지 않게). BOM은 벗겨서 읽는다.
function readStoreStrict(path) {
  if (!existsSync(path)) return null;
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  try { return JSON.parse(text); } catch (e) { throw new Error(`${STUDIO_RESEARCH_PATH}를 읽을 수 없음(충돌 표시나 깨진 글자 확인): ${e.message}`); }
}

export function listUrl(format, feed) {
  const filter = JSON.stringify({contentTypeFilter: FORMATS[format], landingPageFeedType: FEEDS[feed]});
  return `https://studio.youtube.com/channel/${OUR_CHANNEL_ID}/analytics/hub_research?filter=${encodeURIComponent(filter)}`;
}

const extractRows = (page) => page.evaluate(() => {
  const rows = new Map();
  for (const a of document.querySelectorAll('a[href*="watch?v="], a[href*="/shorts/"]')) {
    const m = a.href.match(/(?:watch\?v=|\/shorts\/)([A-Za-z0-9_-]{11})/);
    if (!m || rows.has(m[1])) continue;
    // 롱폼 카드는 .ytLockupViewModelHost, 쇼츠 카드는 ytm-shorts-lockup-view-model (2026-11-14 실제 화면 확인)
    const el = a.closest('.ytLockupViewModelHost, ytm-shorts-lockup-view-model');
    if (!el) continue;
    rows.set(m[1], {videoId: m[1], text: el.innerText.replace(/\s+/g, ' ').trim()});
  }
  return [...rows.values()];
});

async function scrollList(page) {
  let last = -1, streak = 0, scrolls = 0, end = {endReason: null, possibleCap: false};
  while (!end.endReason) {
    await page.mouse.move(800, 600);
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(SCROLL_WAIT_MS);
    const n = (await extractRows(page)).length;
    scrolls++;
    if (n === last) streak++; else { streak = 0; last = n; }
    end = decideEndReason({rowCount: n, noGrowthStreak: streak, scrolls});
  }
  return end;
}

async function readList(page, format, feed) {
  const t0 = Date.now();
  await page.goto(listUrl(format, feed), {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(FIRST_PAINT_WAIT_MS);
  const url = decodeURIComponent(page.url());
  const filterKept = url.includes(FORMATS[format]) && url.includes(FEEDS[feed]);
  const end = await scrollList(page);
  const rows = (await extractRows(page)).map((r, i) => ({videoId: r.videoId, studioRank: i + 1, ...parseCardText(r.text)}));
  const parsed = rows.filter((r) => r.studioSubscribers != null && (feed === 'recent' || r.studioFolds != null)).length;
  return {rows, filterKept, ...end, parsedRate: rows.length ? parsed / rows.length : 0,
    foldsMissing: rows.filter((r) => r.studioFolds == null).length, ms: Date.now() - t0};
}

const isoSeconds = (iso) => { const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || ''); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : null; };

async function fetchMeta(ids) {
  if (!process.env.YOUTUBE_API_KEY) {
    const envPath = join(projectDir, '.env');
    if (existsSync(envPath)) { try { process.loadEnvFile(envPath); } catch { /* 키가 없으면 아래에서 실패 */ } }
  }
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) throw new Error('YOUTUBE_API_KEY가 없음(.env 확인)');
  const meta = {};
  for (let i = 0; i < ids.length; i += 50) {
    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.search = new URLSearchParams({part: 'snippet,contentDetails', id: ids.slice(i, i + 50).join(','), key}).toString();
    const res = await fetch(url, {signal: AbortSignal.timeout(API_TIMEOUT_MS)});
    if (!res.ok) throw new Error(`videos.list 실패 (${res.status})`);
    for (const it of (await res.json()).items || []) {
      meta[it.id] = {title: it.snippet.title, channelId: it.snippet.channelId, channelTitle: it.snippet.channelTitle,
        publishedAt: it.snippet.publishedAt, durationSeconds: isoSeconds(it.contentDetails?.duration)};
    }
  }
  return meta;
}

export async function collectStudioResearch({now = new Date()} = {}) {
  const nowISO = now.toISOString();
  const chrome = await setupStudioChrome({launchIfDown: true});
  if (!chrome.supported || chrome.login !== 'logged-in') {
    throw new Error(`Studio-Automation 크롬에 채널 소유 계정 로그인이 필요함 (상태: ${chrome.login || chrome.error || chrome.reason})`);
  }
  const release = acquireLock();
  let browser = null, page = null;
  const result = {ok: true, runs: [], errors: []};
  try {
    browser = await chromium.connectOverCDP(`http://localhost:${STUDIO_PORT}`);
    page = await browser.contexts()[0].newPage();
    await page.setViewportSize({width: 1600, height: 1000});
    let store = readStoreStrict(storePath) || emptyStore(OUR_CHANNEL_ID);
    const prevRaw = readJsonOr(rawPath, {lists: {}, recentFirstSeen: {}});
    const raw = {updatedAt: nowISO, lists: {}, recentFirstSeen: prevRaw.recentFirstSeen || {}, outliersFirstSeen: prevRaw.outliersFirstSeen || {}};
    const incoming = {};
    const date = nowISO.slice(0, 10);
    for (const format of Object.keys(FORMATS)) {
      try {
        const out = await readList(page, format, 'outliers');
        const verdict = judgeScreen({listed: out.rows.length, parsedRate: out.parsedRate, filterKept: out.filterKept, isRecent: false});
        if (verdict.changed) throw new Error(`${format} 화면이 바뀜(${verdict.reason}) - 이 형식은 저장하지 않음`);
        const passedA = out.rows.filter(passesA);
        const meta = await fetchMeta(passedA.map((r) => r.videoId));
        const passed = [];
        for (const r of passedA) {
          const m = meta[r.videoId];
          if (m && passesB(m, OUR_CHANNEL_ID).pass) passed.push({...r, ...m});
        }
        const prevIds = new Set((prevRaw.lists[`${format}|outliers`] || []).map((r) => r.videoId));
        const curIds = new Set(out.rows.map((r) => r.videoId));
        for (const r of passed) {
          incoming[r.videoId] = {videoId: r.videoId, format, title: r.title, channelId: r.channelId, channelTitle: r.channelTitle,
            publishedAt: r.publishedAt, durationSeconds: r.durationSeconds, studioFolds: r.studioFolds,
            studioSubscribers: r.studioSubscribers, studioViews: r.studioViews, studioRank: r.studioRank,
            firstSeenAt: nowISO, lastSeenAt: nowISO, timesSeen: 1};
        }
        raw.lists[`${format}|outliers`] = out.rows;
        // 실적 우수 목록에 처음 나타난 날(최근 업로드 첫 발견일과 비교해 "며칠 뒤 나타나는가"를 재기 위한 측정값)
        for (const r of out.rows) if (!raw.outliersFirstSeen[r.videoId]) raw.outliersFirstSeen[r.videoId] = date;
        store = appendRun(store, {date, format, list: 'outliers', listed: out.rows.length, endReason: out.endReason,
          possibleCap: out.possibleCap, foldsMissing: out.foldsMissing, passedA: passedA.length, passed: passed.length,
          newSinceLastRun: prevIds.size ? [...curIds].filter((id) => !prevIds.has(id)).length : null,
          goneSinceLastRun: prevIds.size ? [...prevIds].filter((id) => !curIds.has(id)).length : null,
          ourTopicShare: passed.length ? passed.filter((r) => SOUND_TOPIC_RE.test(r.title)).length / passed.length : null,
          ms: out.ms});
        result.runs.push(store.runs.at(-1));
        // 최근 업로드는 1단계 동안 측정용으로만 읽고 이 PC에만 둔다(후보로 쓰지 않는다)
        const rec = await readList(page, format, 'recent');
        const recVerdict = judgeScreen({listed: rec.rows.length, parsedRate: rec.parsedRate, filterKept: rec.filterKept, isRecent: true});
        if (!recVerdict.changed) {
          raw.lists[`${format}|recent`] = rec.rows;
          for (const r of rec.rows) if (!raw.recentFirstSeen[r.videoId]) raw.recentFirstSeen[r.videoId] = date;
        } else {
          result.errors.push(`${format} 최근 업로드 화면이 바뀜(${recVerdict.reason})`);
        }
      } catch (err) {
        result.ok = false;
        result.errors.push(String(err.message || err).slice(0, 300));
      }
    }
    if (result.runs.length) {
      store = {...store, channelId: OUR_CHANNEL_ID, updatedAt: nowISO, filterVersion: 1,
        candidates: mergeCandidates(store.candidates, incoming, nowISO)};
      writeJsonAtomic(storePath, store);
      writeJsonAtomic(rawPath, raw);
    }
  } finally {
    await page?.close().catch(() => {});
    await browser?.close().catch(() => {});
    release();
  }
  if (!result.ok) result.error = result.errors.join(' / ');
  return result;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFile)) {
  collectStudioResearch().then((r) => { console.log(JSON.stringify(r, null, 2)); if (!r.ok) process.exitCode = 1; }).catch((e) => { console.error(e.message); process.exitCode = 1; });
}

