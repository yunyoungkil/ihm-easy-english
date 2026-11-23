// 국내·해외 한국 콘텐츠 실시간 트렌드 수집기 (2026-11-19 구축 · 2026-11-23 14일 누적 및 해외 한국 콘텐츠 확장).
// 근거: knowledge/decisions/2026-11-23-trend-loop-and-clip-rights.md
// 목적: 한국 유튜브·검색과 해외에서 뜨는 한국 콘텐츠 원재료를 최근 14일 누적으로 수집해
// `next-episode-input.md` 13절(기회 포착 레이더)에 공급한다.
//
// 원칙:
// - 무료·공식 공개 소스만 사용한다(크롬 로그인 자동화·유료 API 없음):
//   1) Google Trends 한국 일간 급상승 검색어 RSS (무료, 관련 한국어 보도 포함)
//   2) YouTube 한국 인기 급상승 동영상 API (videos.list chart=mostPopular regionCode=KR, 1 unit)
//   3) 해외에서 뜨는 한국 콘텐츠 YouTube API (search.list regionCode=US relevanceLanguage=en 최근 14일 조회순 + videos.list 통계, 101 units)
// - 하루 덮어쓰기 대신 최근 14일 날짜별 이력(history)을 누적해 며칠~몇 주 이어지는 중기 화제를 포착한다.
// - 창작 규칙이나 임의 카테고리/단어 필터를 코드에 하드코딩하지 않는다.
//   우리 3060 영어 사명과의 연결 여부와 녹이는 방식은 기획 단계에서 AI가 주도적으로 판단한다.
// - 한쪽 소스가 실패해도 다른 소스의 최신 결과는 저장하고, 실패한 쪽은 이전 정상 항목을 보존(stale 표시)한다.
//   전부 실패하면 기존 정상 데이터를 덮어쓰지 않고 실패를 알린다.
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const KOREAN_TRENDS_PATH = join(projectDir, 'data', 'youtube', 'korean-trends.json');
export const GOOGLE_TRENDS_KR_RSS_URL = 'https://trends.google.com/trending/rss?geo=KR';
export const YOUTUBE_POPULAR_KR_URL = 'https://www.googleapis.com/youtube/v3/videos';
export const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
export const DEFAULT_MAX_YOUTUBE_RESULTS = 20; // allow-literal: 한국 인기 급상승 수집 편수
export const DEFAULT_MAX_OVERSEAS_RESULTS = 10; // allow-literal: 해외 한국 콘텐츠 수집 편수
export const HISTORY_RETENTION_DAYS = 14; // allow-literal: 최근 14일 누적 보관 일수 (2026-11-23 결정)
export const OVERSEAS_KOREAN_QUERY = 'Korean OR K-drama OR K-pop OR Korea';
const FETCH_TIMEOUT_MS = 15000; // allow-literal: 외부 요청 제한 시간(ms)
const DAY_MS = 24 * 60 * 60 * 1000; // allow-literal: 하루(ms)
const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // allow-literal: KST UTC+9

export function toKstDate(dateInput = new Date()) {
  const ms = new Date(dateInput).getTime();
  if (!Number.isFinite(ms)) return null;
  return new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function decodeXmlEntities(text = '') {
  const s = String(text ?? '').replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1');
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .trim();
}

const tagText = (block, tag) => {
  const m = String(block || '').match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeXmlEntities(m[1]) : null;
};

const toIsoOrNull = (raw) => {
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

/** Google Trends 한국 일간 급상승 RSS XML → 구조화된 항목 배열. */
export function parseGoogleTrendsRss(xml = '') {
  const items = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(String(xml || ''))) !== null) {
    const block = m[1];
    const keyword = tagText(block, 'title');
    if (!keyword) continue;
    const approxTraffic = tagText(block, 'ht:approx_traffic');
    const publishedAt = toIsoOrNull(tagText(block, 'pubDate'));
    const newsItems = [];
    const newsRe = /<ht:news_item>([\s\S]*?)<\/ht:news_item>/gi;
    let nm;
    while ((nm = newsRe.exec(block)) !== null && newsItems.length < 3) {
      const nb = nm[1];
      const title = tagText(nb, 'ht:news_item_title');
      if (!title) continue;
      newsItems.push({
        title,
        source: tagText(nb, 'ht:news_item_source') || null,
        url: tagText(nb, 'ht:news_item_url') || null,
      });
    }
    items.push({
      source: 'google-trends-kr',
      keyword,
      approxTraffic: approxTraffic || null,
      publishedAt,
      newsItems,
    });
  }
  return items;
}

/** YouTube Data API videos.list 응답 → 구조화된 항목 배열. */
export function parseYoutubePopularKr(json = {}, sourceName = 'youtube-popular-kr') {
  const raw = Array.isArray(json?.items) ? json.items : [];
  return raw
    .filter((v) => v?.id && v?.snippet?.title)
    .map((v) => {
      const vc = v.statistics?.viewCount;
      const viewCount = vc != null && vc !== '' && Number.isFinite(Number(vc)) ? Number(vc) : null;
      return {
        source: sourceName,
        videoId: String(typeof v.id === 'object' ? v.id.videoId || '' : v.id).trim(),
        title: decodeXmlEntities(String(v.snippet.title)),
        channelId: v.snippet.channelId || null,
        channelTitle: v.snippet.channelTitle ? decodeXmlEntities(String(v.snippet.channelTitle)) : null,
        publishedAt: toIsoOrNull(v.snippet.publishedAt),
        categoryId: v.snippet.categoryId || null,
        viewCount,
      };
    })
    .filter((v) => v.videoId);
}

/** YouTube Data API search.list + videos.list(선택) 응답 → 해외 한국 콘텐츠 항목 배열. */
export function parseOverseasKoreanYoutube(searchJson = {}, statsJson = null) {
  const statsById = new Map();
  for (const v of Array.isArray(statsJson?.items) ? statsJson.items : []) {
    if (!v?.id) continue;
    const vc = v.statistics?.viewCount;
    const viewCount = vc != null && vc !== '' && Number.isFinite(Number(vc)) ? Number(vc) : null;
    statsById.set(String(v.id), {
      viewCount,
      categoryId: v.snippet?.categoryId || null,
    });
  }
  const raw = Array.isArray(searchJson?.items) ? searchJson.items : [];
  return raw
    .map((item) => {
      const videoId = String(typeof item?.id === 'object' ? item.id.videoId || '' : item?.id || '').trim();
      const title = item?.snippet?.title ? decodeXmlEntities(String(item.snippet.title)) : '';
      if (!videoId || !title) return null;
      const stat = statsById.get(videoId);
      const rawVc = item?.statistics?.viewCount;
      const fallbackVc = rawVc != null && rawVc !== '' && Number.isFinite(Number(rawVc)) ? Number(rawVc) : null;
      return {
        source: 'youtube-overseas-korean',
        videoId,
        title,
        channelId: item.snippet.channelId || null,
        channelTitle: item.snippet.channelTitle ? decodeXmlEntities(String(item.snippet.channelTitle)) : null,
        publishedAt: toIsoOrNull(item.snippet.publishedAt),
        categoryId: stat?.categoryId ?? item.snippet.categoryId ?? null,
        viewCount: stat ? stat.viewCount : fallbackVc,
      };
    })
    .filter(Boolean);
}

/**
 * 날짜별 14일 누적 이력을 갱신한다.
 * - v1 기존 파일(history 없음)을 읽었으면 기존 스냅샷을 1일치로 씨앗 보존한다.
 * - 같은 KST 날짜 재실행 시 해당 날짜 항목만 덮어쓰고, retentionDays 밖의 오래된 날짜는 정리한다.
 */
export function mergeTrendHistory(prevStore, todayEntry, {now = new Date(), retentionDays = HISTORY_RETENTION_DAYS} = {}) {
  const map = new Map();
  if (Array.isArray(prevStore?.history)) {
    for (const h of prevStore.history) {
      if (h && typeof h.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h.date)) {
        map.set(h.date, h);
      }
    }
  } else if (prevStore?.collectedAt && (prevStore.googleTrends?.length || prevStore.youtubePopular?.length || prevStore.overseasKorean?.length)) {
    const prevDate = toKstDate(prevStore.collectedAt);
    if (prevDate) {
      map.set(prevDate, {
        date: prevDate,
        collectedAt: prevStore.collectedAt,
        googleTrends: Array.isArray(prevStore.googleTrends) ? prevStore.googleTrends : [],
        youtubePopular: Array.isArray(prevStore.youtubePopular) ? prevStore.youtubePopular : [],
        overseasKorean: Array.isArray(prevStore.overseasKorean) ? prevStore.overseasKorean : [],
      });
    }
  }
  if (todayEntry?.date) {
    map.set(todayEntry.date, todayEntry);
  }
  const cutoffDate = toKstDate(new Date(now).getTime() - (retentionDays - 1) * DAY_MS);
  return [...map.values()]
    .filter((h) => !cutoffDate || h.date >= cutoffDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 14일 누적 이력에서 여러 날 반복·지속된 화제와 해외 한국 콘텐츠를 요약한다. */
export function summarizeRollingTrends(store) {
  const history = Array.isArray(store?.history) ? store.history : [];
  const gtMap = new Map();
  const ytMap = new Map();
  const overseasMap = new Map();

  for (const dayEntry of history) {
    const d = dayEntry?.date;
    if (!d) continue;
    for (const item of dayEntry.googleTrends || []) {
      const k = String(item?.keyword || '').trim();
      if (!k) continue;
      const key = k.toLowerCase();
      const prev = gtMap.get(key) || {
        keyword: k,
        dates: new Set(),
        approxTraffic: null,
        newsTitle: null,
        newsSource: null,
      };
      prev.dates.add(d);
      if (item.approxTraffic) prev.approxTraffic = item.approxTraffic;
      if (item.newsItems?.[0]?.title) {
        prev.newsTitle = item.newsItems[0].title;
        prev.newsSource = item.newsItems[0].source || null;
      }
      gtMap.set(key, prev);
    }
    for (const v of dayEntry.youtubePopular || []) {
      if (!v?.videoId) continue;
      const prev = ytMap.get(v.videoId) || {
        videoId: v.videoId,
        title: v.title,
        channelTitle: v.channelTitle || null,
        dates: new Set(),
        viewCount: null,
        source: v.source || 'youtube-popular-kr',
      };
      prev.dates.add(d);
      if (v.title) prev.title = v.title;
      if (v.viewCount != null) prev.viewCount = v.viewCount;
      ytMap.set(v.videoId, prev);
    }
    for (const v of dayEntry.overseasKorean || []) {
      if (!v?.videoId) continue;
      const prev = overseasMap.get(v.videoId) || {
        videoId: v.videoId,
        title: v.title,
        channelTitle: v.channelTitle || null,
        publishedAt: v.publishedAt || null,
        dates: new Set(),
        viewCount: null,
      };
      prev.dates.add(d);
      if (v.title) prev.title = v.title;
      if (v.viewCount != null) prev.viewCount = v.viewCount;
      overseasMap.set(v.videoId, prev);
    }
  }

  const finalizeDates = (entry) => {
    const sorted = [...entry.dates].sort();
    const {dates: _unused, ...rest} = entry;
    return {...rest, daysCount: sorted.length, firstSeen: sorted[0] || null, lastSeen: sorted[sorted.length - 1] || null};
  };

  const recurringGoogle = [...gtMap.values()]
    .map(finalizeDates)
    .filter((x) => x.daysCount >= 2)
    .sort((a, b) => b.daysCount - a.daysCount || String(b.lastSeen).localeCompare(String(a.lastSeen)));

  const recurringYoutube = [...ytMap.values()]
    .map(finalizeDates)
    .filter((x) => x.daysCount >= 2)
    .sort((a, b) => b.daysCount - a.daysCount || (b.viewCount ?? -1) - (a.viewCount ?? -1));

  const recentOverseas = [...overseasMap.values()]
    .map(finalizeDates)
    .sort((a, b) => (b.viewCount ?? -1) - (a.viewCount ?? -1) || b.daysCount - a.daysCount);

  return {
    historyDays: history.length,
    firstDate: history[0]?.date || null,
    lastDate: history[history.length - 1]?.date || null,
    recurringGoogle,
    recurringYoutube,
    recentOverseas,
  };
}

function readExistingStore(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')); } catch { return null; }
}

function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), {recursive: true});
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}

function loadApiKeyFromEnv() {
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  const envPath = join(projectDir, '.env');
  if (existsSync(envPath)) {
    try { process.loadEnvFile(envPath); } catch { /* ignore */ }
  }
  return process.env.YOUTUBE_API_KEY || null;
}

export async function collectKoreanTrends({
  now = new Date(),
  fetchImpl = fetch,
  apiKey = undefined,
  path = KOREAN_TRENDS_PATH,
  maxYoutubeResults = DEFAULT_MAX_YOUTUBE_RESULTS,
  maxOverseasResults = DEFAULT_MAX_OVERSEAS_RESULTS,
  retentionDays = HISTORY_RETENTION_DAYS,
} = {}) {
  const nowDate = new Date(now);
  const nowIso = nowDate.toISOString();
  const prev = readExistingStore(path);
  const resolvedKey = apiKey !== undefined ? apiKey : loadApiKeyFromEnv();

  // 1) Google Trends KR RSS
  let gtResult;
  let gtItems = null;
  try {
    const res = await fetchImpl(GOOGLE_TRENDS_KR_RSS_URL, {
      headers: {'User-Agent': 'Mozilla/5.0'},
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const parsed = parseGoogleTrendsRss(xml);
    if (!parsed.length) throw new Error('RSS 항목 0건');
    gtItems = parsed;
    gtResult = {ok: true, fetchedAt: nowIso, count: parsed.length, stale: false, error: null};
  } catch (err) {
    gtResult = {
      ok: false,
      fetchedAt: prev?.sources?.googleTrendsKr?.fetchedAt ?? null,
      count: Array.isArray(prev?.googleTrends) ? prev.googleTrends.length : 0,
      stale: Boolean(prev?.googleTrends?.length),
      error: String(err?.message || err).slice(0, 200),
    };
  }

  // 2) YouTube KR Popular Videos API (1 unit)
  let ytResult;
  let ytItems = null;
  if (!resolvedKey) {
    ytResult = {
      ok: false,
      fetchedAt: prev?.sources?.youtubePopularKr?.fetchedAt ?? null,
      count: Array.isArray(prev?.youtubePopular) ? prev.youtubePopular.length : 0,
      stale: Boolean(prev?.youtubePopular?.length),
      error: 'YOUTUBE_API_KEY 없음',
    };
  } else {
    try {
      const url = new URL(YOUTUBE_POPULAR_KR_URL);
      url.search = new URLSearchParams({
        part: 'snippet,statistics',
        chart: 'mostPopular',
        regionCode: 'KR',
        maxResults: String(maxYoutubeResults),
        key: resolvedKey,
      });
      const res = await fetchImpl(url, {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)});
      const json = await res.json();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${String(json?.error?.message || '').slice(0, 120)}`);
      const parsed = parseYoutubePopularKr(json);
      if (!parsed.length) throw new Error('YouTube 인기 급상승 0건');
      ytItems = parsed;
      ytResult = {ok: true, fetchedAt: nowIso, count: parsed.length, stale: false, error: null};
    } catch (err) {
      ytResult = {
        ok: false,
        fetchedAt: prev?.sources?.youtubePopularKr?.fetchedAt ?? null,
        count: Array.isArray(prev?.youtubePopular) ? prev.youtubePopular.length : 0,
        stale: Boolean(prev?.youtubePopular?.length),
        error: String(err?.message || err).slice(0, 200),
      };
    }
  }

  // 3) 해외에서 뜨는 한국 콘텐츠 YouTube API (search.list 100 units + videos.list 1 unit)
  let ovResult;
  let ovItems = null;
  if (!resolvedKey) {
    ovResult = {
      ok: false,
      fetchedAt: prev?.sources?.overseasKoreanYt?.fetchedAt ?? null,
      count: Array.isArray(prev?.overseasKorean) ? prev.overseasKorean.length : 0,
      stale: Boolean(prev?.overseasKorean?.length),
      error: 'YOUTUBE_API_KEY 없음',
    };
  } else {
    try {
      const publishedAfter = new Date(nowDate.getTime() - retentionDays * DAY_MS).toISOString();
      const searchUrl = new URL(YOUTUBE_SEARCH_URL);
      searchUrl.search = new URLSearchParams({
        part: 'snippet',
        type: 'video',
        q: OVERSEAS_KOREAN_QUERY,
        regionCode: 'US',
        relevanceLanguage: 'en',
        order: 'viewCount',
        publishedAfter,
        maxResults: String(maxOverseasResults),
        key: resolvedKey,
      });
      const sRes = await fetchImpl(searchUrl, {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)});
      const sJson = await sRes.json();
      if (!sRes.ok) throw new Error(`HTTP ${sRes.status}: ${String(sJson?.error?.message || '').slice(0, 120)}`);
      const ids = (Array.isArray(sJson?.items) ? sJson.items : [])
        .map((x) => (typeof x?.id === 'object' ? x.id.videoId : x?.id))
        .filter(Boolean);
      let statsJson = null;
      if (ids.length) {
        const statsUrl = new URL(YOUTUBE_POPULAR_KR_URL);
        statsUrl.search = new URLSearchParams({
          part: 'snippet,statistics',
          id: ids.join(','),
          key: resolvedKey,
        });
        const vRes = await fetchImpl(statsUrl, {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)});
        if (vRes.ok) statsJson = await vRes.json();
      }
      const parsed = parseOverseasKoreanYoutube(sJson, statsJson);
      if (!parsed.length) throw new Error('해외 한국 콘텐츠 0건');
      ovItems = parsed;
      ovResult = {ok: true, fetchedAt: nowIso, count: parsed.length, stale: false, error: null};
    } catch (err) {
      ovResult = {
        ok: false,
        fetchedAt: prev?.sources?.overseasKoreanYt?.fetchedAt ?? null,
        count: Array.isArray(prev?.overseasKorean) ? prev.overseasKorean.length : 0,
        stale: Boolean(prev?.overseasKorean?.length),
        error: String(err?.message || err).slice(0, 200),
      };
    }
  }

  const anyOk = gtResult.ok || ytResult.ok || ovResult.ok;
  const finalGt = gtItems ?? (Array.isArray(prev?.googleTrends) ? prev.googleTrends : []);
  const finalYt = ytItems ?? (Array.isArray(prev?.youtubePopular) ? prev.youtubePopular : []);
  const finalOv = ovItems ?? (Array.isArray(prev?.overseasKorean) ? prev.overseasKorean : []);
  const todayKey = toKstDate(nowDate);
  const history = anyOk
    ? mergeTrendHistory(prev, {
      date: todayKey,
      collectedAt: nowIso,
      googleTrends: finalGt,
      youtubePopular: finalYt,
      overseasKorean: finalOv,
    }, {now: nowDate, retentionDays})
    : (Array.isArray(prev?.history) ? prev.history : []);

  const store = {
    schemaVersion: 2,
    region: 'KR',
    retentionDays,
    collectedAt: anyOk ? nowIso : (prev?.collectedAt ?? null),
    lastAttemptAt: nowIso,
    sources: {
      googleTrendsKr: gtResult,
      youtubePopularKr: ytResult,
      overseasKoreanYt: ovResult,
    },
    googleTrends: finalGt,
    youtubePopular: finalYt,
    overseasKorean: finalOv,
    history,
  };

  if (anyOk) {
    writeJsonAtomic(path, store);
  }

  return {
    ok: anyOk,
    collectedAt: store.collectedAt,
    googleTrendsCount: store.googleTrends.length,
    youtubePopularCount: store.youtubePopular.length,
    overseasKoreanCount: store.overseasKorean.length,
    historyDays: store.history.length,
    sources: store.sources,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await collectKoreanTrends();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exitCode = 1;
}
