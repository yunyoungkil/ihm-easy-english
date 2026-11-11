// 실제 유튜브 검색 화면으로 우리 썸네일을 비교하고, 잘된 썸네일을 모아 보여 준다 (2026-11-11 재설계).
//
// 예전 "A/B 피드 시뮬레이터 · AI CTR 예측기"를 대신한다. 그 도구는
//   - 비교 대상이 저장해 둔 경쟁 목록이었고, 모자라면 지어낸 영상(없는 채널, 무료 사진, Math.random 조회수)으로 채웠고,
//   - Gemini가 매긴 "예상 CTR"은 EP19에서 8.8~10.9%였는데 실제는 0.11%였다.
// 이제 패키지 태그에서 시청자가 칠 법한 검색어를 골라 한국 유튜브 검색 결과를 그대로 가져오고(하루 캐시),
// 그중 "구독자 수에 비해 조회가 크게 터진" 영상을 잘된 썸네일로 보여 준다. 점수를 지어내지 않는다.
//
// 사용량: 검색어 하나당 search.list 100 + videos.list 1 + channels.list 1 unit. 하루 기본 한도 10,000 unit.

import {existsSync, readFileSync, writeFileSync} from 'node:fs';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_VERSION = 2; // 2: 썸네일을 가장 큰 크기로 받음 — 그 전 캐시(작은 썸네일)는 새로 받는다
const RESULTS = 12;
const API = 'https://www.googleapis.com/youtube/v3';

// 영상 주제와 상관없이 거의 모든 편에 붙는 태그 — 검색어 후보에서는 맨 뒤로 보낸다.
const GENERIC_TAGS = new Set([
  '영어발음', '영어듣기', '영어리스닝', '기초영어회화', '원어민 발음', '파닉스', '영어공부혼자하기',
  '영어 발음 꿀팁', '영어 쉐도잉', '영어 리스닝 훈련', '영어 발음', '영어공부', '영어 듣기',
]);
const OUR_CHANNEL_WORDS = ['이해하면 쉬운영어', '이해하면쉬운영어'];

export const isShortDuration = (seconds) => Number(seconds) <= 180;

export function parseIsoDuration(iso = '') {
  const m = String(iso).match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const [, d, h, mi, s] = m;
  return Number(d || 0) * 86400 + Number(h || 0) * 3600 + Number(mi || 0) * 60 + Number(s || 0);
}

/** 태그에서 검색어 후보를 고른다. 짝 단어(영어 두 단어) > 영어가 든 태그 > 나머지 > 흔한 태그. 최대 5개. */
export function pickSearchQueries(tags = [], title = '') {
  const clean = tags.map((t) => String(t).trim()).filter(Boolean)
    .filter((t) => !OUR_CHANNEL_WORDS.some((w) => t.replace(/\s/g, '').includes(w.replace(/\s/g, ''))));
  const score = (t) => {
    if (GENERIC_TAGS.has(t)) return 0;
    // 영어 단어만 있는 검색어("very berry")는 같은 낱말의 노래·애니가 섞여 나온다(2026-11-11 실측).
    // 우리 시청자가 실제로 치는 "very berry 발음"처럼 학습 낱말이 붙은 태그를 먼저 쓴다.
    const learning = /(발음|구분|차이|뜻|듣기|읽는)/.test(t);
    if (learning && /[a-z]+\s+(vs\s+)?[a-z]+/i.test(t)) return 5;
    if (learning && /[a-z]/i.test(t)) return 4;
    if (/[a-z]+\s+(vs\s+)?[a-z]+/i.test(t)) return 3;
    if (/[a-z]/i.test(t)) return 2;
    return 1;
  };
  const ranked = clean.map((t, i) => ({t, s: score(t), i})).sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.t);
  const unique = [...new Set(ranked)].slice(0, 5);
  if (unique.length) return unique;
  const head = String(title).split('|')[0].trim();
  return head ? [head] : [];
}

// 구독자가 이보다 적으면 배수가 의미 없이 커진다(자동 음악 채널이 "구독자 대비 8,028배"로 나옴, 2026-11-11 실측).
export const MIN_WINNER_SUBS = 1000;

/** 같은 형식에서 구독자 대비 조회 배수가 큰 순. 우리 채널·구독자 비공개·구독자 1,000명 미만은 뺀다. */
export function rankWinners(videos = [], {format = 'LONGFORM', ourChannelId = null, limit = 12} = {}) {
  const wantShort = format === 'SHORTS';
  return videos
    .filter((x) => x && x.channelId !== ourChannelId && x.subs >= MIN_WINNER_SUBS && Number.isFinite(x.views))
    .filter((x) => isShortDuration(x.durationSeconds) === wantShort)
    .map((x) => ({...x, ratio: Math.round((x.views / x.subs) * 10) / 10}))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit);
}

export function insertOurThumbnail(feed = [], ours, position = 2) {
  const out = [...feed];
  out.splice(Math.min(position, out.length), 0, ours);
  return out;
}

const readCache = (path) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {schemaVersion: 1, queries: {}}; }
};

/**
 * 한국 유튜브 검색 결과를 받는다. 같은 검색어·형식은 24시간 동안 캐시를 쓴다.
 * @returns {Promise<{query:string, format:string, fetchedAt:string, fromCache:boolean, items:object[]}>}
 */
export async function fetchSearchFeed({query, format = 'LONGFORM', apiKey, cachePath, now = new Date(), fetchImpl = globalThis.fetch}) {
  if (!query) throw new Error('검색어가 없습니다');
  const key = `${format}::${query}`;
  const cache = cachePath && existsSync(cachePath) ? readCache(cachePath) : {schemaVersion: 1, queries: {}};
  const hit = cache.queries?.[key];
  if (hit && hit.version === CACHE_VERSION && now - new Date(hit.fetchedAt) < CACHE_TTL_MS) return {...hit, fromCache: true};
  if (!apiKey) throw new Error('.env에 YOUTUBE_API_KEY가 없습니다');

  const get = async (path, params) => {
    const res = await fetchImpl(`${API}/${path}?${new URLSearchParams({...params, key: apiKey})}`);
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `YouTube ${path} 실패`);
    return data;
  };

  const search = await get('search', {
    part: 'snippet', q: query, type: 'video', regionCode: 'KR', relevanceLanguage: 'ko', maxResults: String(RESULTS),
    ...(format === 'SHORTS' ? {videoDuration: 'short'} : {}),
  });
  const ids = (search.items || []).map((it) => it.id?.videoId).filter(Boolean);
  const videos = ids.length ? await get('videos', {part: 'snippet,statistics,contentDetails', id: ids.join(',')}) : {items: []};
  const channelIds = [...new Set((videos.items || []).map((it) => it.snippet?.channelId).filter(Boolean))];
  const channels = channelIds.length ? await get('channels', {part: 'statistics', id: channelIds.join(',')}) : {items: []};
  const subsOf = new Map((channels.items || []).map((c) => [c.id, c.statistics?.hiddenSubscriberCount ? null : Number(c.statistics?.subscriberCount)]));
  const byId = new Map((videos.items || []).map((it) => [it.id, it]));

  const items = ids.map((id) => byId.get(id)).filter(Boolean).map((it) => {
    const durationSeconds = parseIsoDuration(it.contentDetails?.duration);
    const subs = subsOf.get(it.snippet.channelId);
    return {
      videoId: it.id,
      title: it.snippet.title,
      channelId: it.snippet.channelId,
      channelTitle: it.snippet.channelTitle,
      publishedAt: it.snippet.publishedAt,
      // 가장 큰 크기부터. 작은 미리보기(medium 320px)를 피드 너비로 늘리면 흐려져서, 원본을 쓰는 우리 썸네일만
      // 선명해 보이는 착시가 생겼다(2026-11-11 사용자 발견). 4:3 크기(high·standard)의 위아래 검은 띠는 화면에서 잘라 낸다.
      thumbnail: ['maxres', 'standard', 'high', 'medium'].map((k) => it.snippet.thumbnails?.[k]?.url).find(Boolean) || `https://i.ytimg.com/vi/${it.id}/hqdefault.jpg`,
      views: Number(it.statistics?.viewCount) || 0,
      subs: Number.isFinite(subs) ? subs : null,
      durationSeconds,
      isShort: isShortDuration(durationSeconds),
    };
  });

  const entry = {query, format, version: CACHE_VERSION, fetchedAt: now.toISOString(), items};
  if (cachePath) {
    cache.queries = {...(cache.queries || {}), [key]: entry};
    writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf8');
  }
  return {...entry, fromCache: false};
}
