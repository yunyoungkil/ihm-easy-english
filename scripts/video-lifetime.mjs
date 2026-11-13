// 영상별 전체 기간(공개일~어제) 시청률·평균 시청 시간·구독 수집. 2026-11-13.
// 이유: analytics-latest.json의 videoPerformance는 분석 기간(range) 안의 수치라, 기간 전에 올린 영상은 전체 1,986회인데 기간 안 7회로 잡혀
// 시청률 354% 같은 값이 나왔다. 영상별로 묻되 **시작일은 채널 첫 영상 공개일**로 잡는다. 영상 공개일로 잡으면 일부 영상(2026-06-22·07-12 쇼츠)이
// 카탈로그 조회수 1,218회인데 44회로 나왔다(공개일 이전에 이미 조회가 있었다). 채널 첫날로 잡으면 카탈로그와 같은 값이 나온다(확인 6편 중 5편 일치, 나머지 1편은 데이터 지연).
// 우리 채널 읽기 전용 호출이다. 새 액세스 토큰은 메모리에서만 쓴다.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {accessTokenFromDisk} from './retention-curves.mjs';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'youtube');
export const lifetimePath = join(dataDir, 'video-lifetime.json');
export const LIFETIME_PER_RUN = 40; // allow-literal: 한 번에 받을 영상 수(처음 91편은 사흘에 나눠 받는다)
export const LIFETIME_REFRESH_DAYS = 14; // allow-literal: 다시 받는 간격
const DAY_MS = 86400000; // allow-literal: 하루(ms)
const METRICS = ['views', 'averageViewPercentage', 'averageViewDuration', 'subscribersGained'];

export async function fetchLifetime({videoId, startDate, endDate, accessToken, fetchImpl = fetch}) {
  const params = new URLSearchParams({ids: 'channel==MINE', startDate, endDate, metrics: METRICS.join(','), filters: `video==${videoId}`});
  const res = await fetchImpl(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {headers: {Authorization: `Bearer ${accessToken}`}});
  const body = await res.json();
  if (!res.ok) throw new Error(`전체 기간 수치 요청 실패(HTTP ${res.status}): ${String(body.error?.message || '').slice(0, 120)}`);
  const row = body.rows?.[0];
  if (!row) return null;
  const names = body.columnHeaders.map((c) => c.name);
  return Object.fromEntries(names.map((n, i) => [n, row[i]]));
}

/** 공개 1일 넘은 공개 영상 중 아직 안 받았거나 14일 지난 것, 오래 안 받은 순. */
export function selectLifetimeTargets({catalog, existing = {}, now = new Date(), cap = LIFETIME_PER_RUN}) {
  return catalog
    .filter((v) => v.privacyStatus === 'public' || v.privacyStatus === undefined)
    .filter((v) => now - new Date(v.publishedAt) >= DAY_MS)
    .filter((v) => !existing[v.videoId]?.fetchedAt || now - new Date(existing[v.videoId].fetchedAt) >= LIFETIME_REFRESH_DAYS * DAY_MS)
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
  const result = {requested: targets.length, saved: 0, empty: 0, failed: []};
  for (const v of targets) {
    try {
      const m = await fetchLifetime({videoId: v.videoId, startDate, endDate, accessToken: token, fetchImpl});
      if (!m) { result.empty += 1; store.videos[v.videoId] = {fetchedAt: now.toISOString(), empty: true}; continue; }
      store.videos[v.videoId] = {fetchedAt: now.toISOString(), startDate, endDate, ...m};
      result.saved += 1;
    } catch (err) { result.failed.push(`${v.videoId}: ${err.message}`); }
  }
  store.updatedAt = now.toISOString();
  writeFileSync(path, `${JSON.stringify(store, null, 2)}\n`);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith('video-lifetime.mjs')) {
  const cap = process.argv.includes('--all') ? Infinity : LIFETIME_PER_RUN;
  const r = await collectLifetime({cap});
  console.log(`전체 기간 수치: 요청 ${r.requested}, 저장 ${r.saved}, 점 없음 ${r.empty}, 실패 ${r.failed.length}`);
  for (const f of r.failed) console.log(`  실패 ${f}`);
}
