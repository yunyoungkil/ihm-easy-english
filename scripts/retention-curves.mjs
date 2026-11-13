// 영상별 시청 유지 곡선(이탈 지점) 수집. 2026-11-13 사용자 결정: "어느 부분에서 이탈했는지"를 데이터로 보고 AI가 분석한다.
// YouTube Analytics API: dimensions=elapsedVideoTimeRatio, metrics=audienceWatchRatio,relativeRetentionPerformance, filters=video==ID.
// 실제 확인(2026-11-13): 시작일이 공개일이어야 점 100개가 나오고(공개일 이후로 잡으면 0개), 조회가 적은 영상(롱폼 204회)은 0개다.
// 우리 채널 읽기 전용 호출이다. 새 액세스 토큰은 메모리에서만 쓰고 토큰 파일은 건드리지 않는다.
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(projectDir, 'data', 'youtube');
export const retentionDir = join(dataDir, 'retention');
export const DEFAULT_PER_RUN = 10; // allow-literal: 한 번에 받을 영상 수(API 호출량을 작게 유지)
export const REFRESH_DAYS = 14; // allow-literal: 곡선을 다시 받는 간격(공개 직후 곡선은 계속 변한다)
const TOP_DROPS = 3; // allow-literal: 영상당 보여 줄 큰 이탈 구간 수

const quantileValue = (values, p) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : null;
};

/** rows: API 행 [elapsedVideoTimeRatio, audienceWatchRatio, relativeRetentionPerformance]. 1은 처음 시청 비율, 1보다 크면 다시 본 것. */
export function summarizeCurve(rows, durationSeconds) {
  const points = (rows || []).map(([ratio, watch, relative]) => ({ratio, watch, relative: relative ?? null}));
  if (points.length < 2) return {points, drops: [], watchAt: {}};
  const drops = [];
  for (let i = 1; i < points.length; i += 1) {
    drops.push({
      fromRatio: points[i - 1].ratio, toRatio: points[i].ratio,
      fromSec: Number((points[i - 1].ratio * durationSeconds).toFixed(1)), toSec: Number((points[i].ratio * durationSeconds).toFixed(1)),
      drop: Number((points[i - 1].watch - points[i].watch).toFixed(4)),
    });
  }
  const biggest = drops.filter((d) => d.drop > 0).sort((a, b) => b.drop - a.drop).slice(0, TOP_DROPS);
  const at = (ratio) => points.find((p) => Math.abs(p.ratio - ratio) < 1e-9)?.watch ?? null; // allow-literal: 부동소수점 비교 허용 오차
  return {points, drops: biggest, watchAt: {q1: at(0.25), half: at(0.5), q3: at(0.75), end: at(1)}}; // allow-literal: 영상 길이의 25·50·75·100% 지점
}

/** 받을 영상 고르기: 공개 7일 넘음, 형식 중앙값 이상 조회(적은 조회는 API가 점을 안 준다), 파일이 없거나 오래됨. */
export function selectTargets({catalog, existing = {}, now = new Date(), cap = DEFAULT_PER_RUN}) {
  const views = (v) => Number(v?.statistics?.viewCount);
  const floors = {};
  for (const fmt of ['SHORTS', 'LONGFORM']) floors[fmt] = quantileValue(catalog.filter((v) => v.format === fmt).map(views), 0.5); // allow-literal: 중앙값
  const day = 86400000; // allow-literal: 하루(ms)
  return catalog
    .filter((v) => v.privacyStatus === 'public' || v.privacyStatus === undefined)
    .filter((v) => now - new Date(v.publishedAt) >= 7 * day) // allow-literal: 공개 7일 뒤부터
    .filter((v) => views(v) >= floors[v.format])
    .filter((v) => !existing[v.videoId] || now - new Date(existing[v.videoId]) >= REFRESH_DAYS * day)
    .sort((a, b) => views(b) - views(a))
    .slice(0, cap);
}

export async function fetchCurve({videoId, publishedAt, endDate, accessToken, fetchImpl = fetch}) {
  const params = new URLSearchParams({
    ids: 'channel==MINE', startDate: publishedAt.slice(0, 10), endDate,
    dimensions: 'elapsedVideoTimeRatio', metrics: 'audienceWatchRatio,relativeRetentionPerformance', filters: `video==${videoId}`,
  });
  const res = await fetchImpl(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {headers: {Authorization: `Bearer ${accessToken}`}});
  const body = await res.json();
  if (!res.ok) throw new Error(`이탈 곡선 요청 실패(HTTP ${res.status}): ${String(body.error?.message || '').slice(0, 120)}`);
  return body.rows || [];
}

async function accessTokenFromDisk() {
  const env = Object.fromEntries(readFileSync(join(projectDir, '.env'), 'utf8').split(/\r?\n/)
    .map((l) => l.match(/^\s*(YOUTUBE_CLIENT_ID|YOUTUBE_CLIENT_SECRET)\s*=\s*(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].trim().replace(/^["']|["']$/g, '')]));
  const tokenPath = join(projectDir, '.youtube-oauth-token.json');
  if (!existsSync(tokenPath) || !env.YOUTUBE_CLIENT_ID) throw new Error('유튜브 로그인 정보(.env, 토큰 파일)가 없다');
  const tok = JSON.parse(readFileSync(tokenPath, 'utf8'));
  if (tok.access_token && tok.expires_at > Date.now() + 60000) return tok.access_token; // allow-literal: 만료 1분 전
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({client_id: env.YOUTUBE_CLIENT_ID, client_secret: env.YOUTUBE_CLIENT_SECRET, refresh_token: tok.refresh_token, grant_type: 'refresh_token'}),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`토큰 갱신 실패: ${body.error_description || body.error}`);
  return body.access_token;
}

export const curvePath = (videoId, dir = retentionDir) => join(dir, `${videoId}.json`);

export function loadExisting(dir = retentionDir, catalog = []) {
  const out = {};
  for (const v of catalog) {
    const p = curvePath(v.videoId, dir);
    if (existsSync(p)) { try { out[v.videoId] = JSON.parse(readFileSync(p, 'utf8')).fetchedAt; } catch { /* 깨진 파일은 다시 받는다 */ } }
  }
  return out;
}

export async function collect({now = new Date(), cap = DEFAULT_PER_RUN, accessToken = null, fetchImpl = fetch, dir = retentionDir} = {}) {
  const catalog = JSON.parse(readFileSync(join(dataDir, 'catalog.json'), 'utf8')).videos;
  mkdirSync(dir, {recursive: true});
  const targets = selectTargets({catalog, existing: loadExisting(dir, catalog), now, cap});
  const token = accessToken || (targets.length ? await accessTokenFromDisk() : null);
  const endDate = new Date(now - 86400000).toISOString().slice(0, 10); // allow-literal: 어제까지(오늘 데이터는 아직 없다)
  const result = {requested: targets.length, saved: 0, empty: 0, failed: []};
  for (const v of targets) {
    try {
      const rows = await fetchCurve({videoId: v.videoId, publishedAt: v.publishedAt, endDate, accessToken: token, fetchImpl});
      if (!rows.length) { result.empty += 1; writeFileSync(curvePath(v.videoId, dir), `${JSON.stringify({videoId: v.videoId, fetchedAt: now.toISOString(), empty: true}, null, 2)}\n`); continue; }
      const summary = summarizeCurve(rows, v.durationSeconds);
      writeFileSync(curvePath(v.videoId, dir), `${JSON.stringify({videoId: v.videoId, title: v.title, format: v.format, durationSeconds: v.durationSeconds, startDate: v.publishedAt.slice(0, 10), endDate, fetchedAt: now.toISOString(), ...summary}, null, 2)}\n`);
      result.saved += 1;
    } catch (err) { result.failed.push(`${v.videoId}: ${err.message}`); }
  }
  return result;
}

if (process.argv[1] && process.argv[1].endsWith('retention-curves.mjs')) {
  const r = await collect();
  console.log(`이탈 곡선: 요청 ${r.requested}, 저장 ${r.saved}, 점 없음 ${r.empty}, 실패 ${r.failed.length}`);
  for (const f of r.failed) console.log(`  실패 ${f}`);
}
