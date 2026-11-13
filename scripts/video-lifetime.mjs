// 영상별 수치 수집: 전체 기간(lifetime)과 공개 첫 7일(first7d). 2026-11-13.
// 이유: analytics-latest.json의 videoPerformance는 분석 기간(range) 안 수치라, 기간 전에 올린 영상은 전체 1,986회인데 기간 안 7회로 잡혀
// 시청률 354% 같은 값이 나왔다. 영상별로 묻되 **lifetime의 시작일은 채널 첫 영상 공개일**로 잡는다. 영상 공개일로 잡으면 일부 영상(2026-06-22·07-12 쇼츠)이
// 카탈로그 조회수 1,218회인데 44회로 나왔다(공개일 이전에 이미 조회가 있었다). 채널 첫날로 잡으면 카탈로그와 같은 값이 나온다.
// first7d는 기준선(scripts/baseline.mjs)이 영상끼리 같은 나이로 비교하려고 받는다. 창은 views-7d.json과 같은 sevenDayWindow(공개일 포함 7일)이고,
// 공개 10일이 지난 뒤에만 받는다(유튜브 집계가 2~3일 늦는다). 한 번 받으면 바뀌지 않아 다시 받지 않는다.
// 우리 채널 읽기 전용 호출이다. 새 액세스 토큰은 메모리에서만 쓴다.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {dayWindow, sevenDayWindow, VIEWS_7D_READY_DAYS} from './planning-outcome.mjs';
import {accessTokenFromDisk} from './retention-curves.mjs';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'youtube');
export const lifetimePath = join(dataDir, 'video-lifetime.json');
export const LIFETIME_PER_RUN = 40; // allow-literal: 한 번에 처리할 영상 수(처음 80여 편은 이틀에 나눠 받는다)
export const LIFETIME_REFRESH_DAYS = 14; // allow-literal: 전체 기간 수치를 다시 받는 간격
const DAY_MS = 86400000; // allow-literal: 하루(ms)
const LIFETIME_METRICS = ['views', 'averageViewPercentage', 'averageViewDuration', 'subscribersGained'];
const FIRST7D_METRICS = ['views', 'averageViewDuration', 'subscribersGained', 'estimatedMinutesWatched'];

export async function fetchMetrics({videoId, startDate, endDate, metrics, accessToken, fetchImpl = fetch}) {
  const params = new URLSearchParams({ids: 'channel==MINE', startDate, endDate, metrics: metrics.join(','), filters: `video==${videoId}`});
  const res = await fetchImpl(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {headers: {Authorization: `Bearer ${accessToken}`}});
  const body = await res.json();
  if (!res.ok) throw new Error(`영상별 수치 요청 실패(HTTP ${res.status}): ${String(body.error?.message || '').slice(0, 120)}`);
  const row = body.rows?.[0];
  if (!row) return null;
  return Object.fromEntries(body.columnHeaders.map((c, i) => [c.name, row[i]]));
}

export const fetchLifetime = ({videoId, startDate, endDate, accessToken, fetchImpl}) => fetchMetrics({videoId, startDate, endDate, metrics: LIFETIME_METRICS, accessToken, fetchImpl});

// 첫 28일(2026-11-13 사용자 승인): 롱폼은 7일 안에 들어오는 조회가 46%뿐이라(쇼츠 99.5%) 천천히 붙는 조회를 놓치지 않으려고 같이 모아 둔다.
// 유튜브 문서도 28~90일로 넓혀 보라고 안내한다. 판정은 7일 기준 그대로이고 28일 값은 기록만 한다(기준선·평소는 아직 쓰지 않는다).
export const FIRST28D_DAYS = 28; // allow-literal: 첫 28일 창
export const FIRST28D_READY_DAYS = 31; // allow-literal: 28일 + 유튜브 분석 집계가 2~3일 늦는 몫
const ageDays = (v, now) => (now - new Date(v.publishedAt)) / DAY_MS;
const needsFirst7d = (v, entry, now) => ageDays(v, now) >= VIEWS_7D_READY_DAYS && !entry?.first7d;
const needsFirst28d = (v, entry, now) => ageDays(v, now) >= FIRST28D_READY_DAYS && !entry?.first28d;
const needsLifetime = (v, entry, now) => !entry?.fetchedAt || now - new Date(entry.fetchedAt) >= LIFETIME_REFRESH_DAYS * DAY_MS;

/** 공개 영상 중 전체 기간 수치가 없거나 14일 지났거나, 공개 10일이 지났는데 첫 7일 수치가 없는 것. 오래 안 받은 순. */
export function selectLifetimeTargets({catalog, existing = {}, now = new Date(), cap = LIFETIME_PER_RUN}) {
  return catalog
    .filter((v) => v.privacyStatus === 'public' || v.privacyStatus === undefined)
    .filter((v) => ageDays(v, now) >= 1) // allow-literal: 공개 하루 뒤부터
    .filter((v) => needsLifetime(v, existing[v.videoId], now) || needsFirst7d(v, existing[v.videoId], now) || needsFirst28d(v, existing[v.videoId], now))
    .sort((a, b) => String(existing[a.videoId]?.fetchedAt || '').localeCompare(String(existing[b.videoId]?.fetchedAt || '')))
    .slice(0, cap);
}

export async function collectLifetime({now = new Date(), cap = LIFETIME_PER_RUN, accessToken = null, fetchImpl = fetch, path = lifetimePath, catalog = null} = {}) {
  const videos = catalog || JSON.parse(readFileSync(join(dataDir, 'catalog.json'), 'utf8')).videos;
  const store = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {schemaVersion: 1, videos: {}};
  const targets = selectLifetimeTargets({catalog: videos, existing: store.videos, now, cap});
  const token = accessToken || (targets.length ? await accessTokenFromDisk() : null);
  const endDate = new Date(now - DAY_MS).toISOString().slice(0, 10);
  const startDate = videos.map((v) => v.publishedAt).sort()[0].slice(0, 10); // 채널 첫 영상 공개일
  const result = {requested: targets.length, saved: 0, first7d: 0, first28d: 0, empty: 0, failed: []};
  for (const v of targets) {
    const old = store.videos[v.videoId] || {};
    try {
      if (needsLifetime(v, old, now)) {
        const m = await fetchLifetime({videoId: v.videoId, startDate, endDate, accessToken: token, fetchImpl});
        if (!m) { result.empty += 1; store.videos[v.videoId] = {...old, fetchedAt: now.toISOString(), empty: true}; continue; }
        store.videos[v.videoId] = {...old, fetchedAt: now.toISOString(), startDate, endDate, empty: undefined, ...m};
        result.saved += 1;
      }
      if (needsFirst7d(v, store.videos[v.videoId], now)) {
        const w = sevenDayWindow(v.publishedAt);
        const m = await fetchMetrics({videoId: v.videoId, startDate: w.startDate, endDate: w.endDate, metrics: FIRST7D_METRICS, accessToken: token, fetchImpl});
        if (m) { store.videos[v.videoId] = {...store.videos[v.videoId], first7d: {startDate: w.startDate, endDate: w.endDate, fetchedAt: now.toISOString(), ...m}}; result.first7d += 1; }
      }
      if (needsFirst28d(v, store.videos[v.videoId], now)) {
        const w = dayWindow(v.publishedAt, FIRST28D_DAYS);
        const m = await fetchMetrics({videoId: v.videoId, startDate: w.startDate, endDate: w.endDate, metrics: FIRST7D_METRICS, accessToken: token, fetchImpl});
        if (m) { store.videos[v.videoId] = {...store.videos[v.videoId], first28d: {startDate: w.startDate, endDate: w.endDate, fetchedAt: now.toISOString(), ...m}}; result.first28d += 1; }
      }
    } catch (err) { result.failed.push(`${v.videoId}: ${err.message}`); }
  }
  store.updatedAt = now.toISOString();
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith('video-lifetime.mjs')) {
  const cap = process.argv.includes('--all') ? Infinity : LIFETIME_PER_RUN;
  const r = await collectLifetime({cap});
  console.log(`영상별 수치: 요청 ${r.requested}, 전체 기간 저장 ${r.saved}, 첫 7일 저장 ${r.first7d}, 첫 28일 저장 ${r.first28d}, 점 없음 ${r.empty}, 실패 ${r.failed.length}`);
  for (const f of r.failed) console.log(`  실패 ${f}`);
}
