// 국내 실시간 트렌드 수집기 (2026-11-19 사용자 확정).
// 목적: 한국 유튜브·검색에서 지금 관심을 얻고 있는 국내 실시간 트렌드(영화·드라마·K-POP·뉴스 등)를
// 원재료 그대로 수집해 `next-episode-input.md` 13절(기회 포착 레이더)에 공급한다.
//
// 원칙:
// - 무료·공식 공개 소스 2곳만 사용한다(크롬 로그인 자동화·유료 API 없음):
//   1) Google Trends 한국 일간 급상승 검색어 RSS (무료, 관련 한국어 보도 포함)
//   2) YouTube 한국 인기 급상승 동영상 API (videos.list chart=mostPopular regionCode=KR, 하루 1 unit)
// - 원천·식별자·확인 시각·실패 상태를 보존한다.
// - 창작 규칙이나 임의 카테고리/단어 필터를 코드에 하드코딩하지 않는다.
//   영어 학습·3060 시청자와의 연결 여부와 표현 방식은 기획 단계에서 AI가 주도적으로 판단한다.
// - 한쪽 소스가 실패해도 다른 소스의 최신 결과는 저장하고, 실패한 쪽은 이전 정상 항목을 보존(stale 표시)한다.
//   둘 다 실패하면 기존 정상 데이터를 덮어쓰지 않고 실패를 알린다.
import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const KOREAN_TRENDS_PATH = join(projectDir, 'data', 'youtube', 'korean-trends.json');
export const GOOGLE_TRENDS_KR_RSS_URL = 'https://trends.google.com/trending/rss?geo=KR';
export const YOUTUBE_POPULAR_KR_URL = 'https://www.googleapis.com/youtube/v3/videos';
export const DEFAULT_MAX_YOUTUBE_RESULTS = 20; // allow-literal: 한국 인기 급상승 수집 편수
const FETCH_TIMEOUT_MS = 15000; // allow-literal: 외부 요청 제한 시간(ms)

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

/** YouTube Data API videos.list(chart=mostPopular, regionCode=KR) 응답 → 구조화된 항목 배열. */
export function parseYoutubePopularKr(json = {}) {
  const raw = Array.isArray(json?.items) ? json.items : [];
  return raw
    .filter((v) => v?.id && v?.snippet?.title)
    .map((v) => {
      const vc = v.statistics?.viewCount;
      const viewCount = vc != null && vc !== '' && Number.isFinite(Number(vc)) ? Number(vc) : null;
      return {
        source: 'youtube-popular-kr',
        videoId: String(v.id),
        title: String(v.snippet.title).trim(),
        channelId: v.snippet.channelId || null,
        channelTitle: v.snippet.channelTitle || null,
        publishedAt: toIsoOrNull(v.snippet.publishedAt),
        categoryId: v.snippet.categoryId || null,
        viewCount,
      };
    });
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
} = {}) {
  const nowIso = new Date(now).toISOString();
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

  const anyOk = gtResult.ok || ytResult.ok;
  const store = {
    schemaVersion: 1,
    region: 'KR',
    collectedAt: anyOk ? nowIso : (prev?.collectedAt ?? null),
    lastAttemptAt: nowIso,
    sources: {
      googleTrendsKr: gtResult,
      youtubePopularKr: ytResult,
    },
    googleTrends: gtItems ?? (Array.isArray(prev?.googleTrends) ? prev.googleTrends : []),
    youtubePopular: ytItems ?? (Array.isArray(prev?.youtubePopular) ? prev.youtubePopular : []),
  };

  if (anyOk) {
    writeJsonAtomic(path, store);
  }

  return {
    ok: anyOk,
    collectedAt: store.collectedAt,
    googleTrendsCount: store.googleTrends.length,
    youtubePopularCount: store.youtubePopular.length,
    sources: store.sources,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await collectKoreanTrends();
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exitCode = 1;
}
