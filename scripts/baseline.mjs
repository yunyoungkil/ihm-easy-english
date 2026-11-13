// 기준선(현재 최고 기록) 계산. 2026-11-13 사용자 결정: 우리 채널에는 "성공"이라는 말을 쓰지 않고,
// 형식·지표별 현재 최고를 기준선으로 두고 새 영상이 우리 편차보다 크게 넘으면 새 기준선으로 올린다.
// 모든 숫자는 실제 파일에서 계산한다(손으로 쓴 값 없음). 근거: knowledge/decisions/2026-11-13-experiment-loop.md
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'youtube');
export const baselinesPath = join(dataDir, 'baselines.json');

const QUANTILE_MEDIAN = 0.5; // allow-literal: 분위수의 정의(중앙값)
const QUANTILE_UPPER = 0.75; // allow-literal: 분위수의 정의(상위 25% 경계)
const PER_THOUSAND = 1000; // allow-literal: "조회 1,000회당"의 단위
export const FORMATS = ['SHORTS', 'LONGFORM'];
export const METRICS = {
  views7d: {label: '공개 7일 조회수', meaning: '제목·썸네일·소재(포장)'},
  averageViewPercentage: {label: '평균 시청률(%)', meaning: '훅·화면·대본(내용)'},
  subscribersPerThousandViews: {label: '조회 1,000회당 구독', meaning: '채널의 가치'},
};

/** 오름차순 정렬에서 floor(p*n)번째 값(n이 작아도 같은 방식으로 계산). */
export function quantile(values, p) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

function metricRows(format, metric, {catalog, views7d, performance, range, lifetime}) {
  const videos = catalog.filter((v) => v.format === format);
  const rows = [];
  if (metric === 'views7d') {
    for (const v of videos) {
      const value = views7d?.[v.videoId]?.views7d;
      if (Number.isFinite(Number(value)) && value !== null) rows.push({videoId: v.videoId, title: v.title, publishedAt: v.publishedAt, value: Number(value)});
    }
    return rows;
  }
  if (lifetime) {
    // 영상별 전체 기간 수치(scripts/video-lifetime.mjs). 형식 중앙값 이상 조회 영상만 본다(적은 조회수의 비율은 흔들린다).
    const have = videos.map((v) => ({v, m: lifetime[v.videoId]})).filter((x) => x.m && !x.m.empty && Number(x.m.views) > 0);
    const lifetimeFloor = quantile(have.map((x) => Number(x.m.views)), QUANTILE_MEDIAN);
    for (const {v, m} of have) {
      if (Number(m.views) < lifetimeFloor) continue;
      const value = metric === 'subscribersPerThousandViews' ? (Number(m.subscribersGained) / Number(m.views)) * PER_THOUSAND : m[metric];
      if (Number.isFinite(Number(value))) rows.push({videoId: v.videoId, title: v.title, publishedAt: v.publishedAt, value: Number(value)});
    }
    return rows;
  }
  // 시청률·구독 전환은 analytics의 videoPerformance(range 안의 수치)에서 읽는다. range 시작 전에 올린 영상은 기간 안 조회수만 잡혀
  // (실제 확인: 전체 1,986회 영상이 기간 안 7회로 시청률 354%) 영상 전체 값이 아니므로 뺀다.
  // 그 안에서도 기간 안 조회수가 형식 중앙값 미만이면 뺀다(적은 조회수의 비율은 한 명 차이로 크게 흔들린다).
  const perfById = new Map((performance || []).map((p) => [p.video, p]));
  const inWindow = videos.filter((v) => !range?.startDate || String(v.publishedAt).slice(0, 10) >= range.startDate)
    .map((v) => ({v, p: perfById.get(v.videoId)})).filter((x) => x.p && Number.isFinite(Number(x.p.views)));
  const floor = quantile(inWindow.map((x) => Number(x.p.views)), QUANTILE_MEDIAN);
  for (const {v, p} of inWindow) {
    const value = p[metric];
    if (Number(p.views) >= floor && Number.isFinite(Number(value))) rows.push({videoId: v.videoId, title: v.title, publishedAt: v.publishedAt, value: Number(value)});
  }
  return rows;
}

/** previous는 이전 baselines.json. 챔피언이 바뀌면 이전 챔피언을 history에 더한다(지우지 않는다). */
export function computeBaselines({catalog, views7d, performance, range = null, lifetime = null, previous = null, now = new Date()}) {
  const out = {schemaVersion: 1, computedAt: now.toISOString(), formats: {}, history: [...(previous?.history || [])]};
  for (const format of FORMATS) {
    const entry = {metrics: {}};
    for (const metric of Object.keys(METRICS)) {
      const rows = metricRows(format, metric, {catalog, views7d, performance, range, lifetime});
      const values = rows.map((r) => r.value);
      const champion = rows.reduce((best, r) => (!best || r.value > best.value ? r : best), null);
      const median = quantile(values, QUANTILE_MEDIAN);
      const upper = quantile(values, QUANTILE_UPPER);
      // 우리 데이터의 편차: 이 비율보다 작은 차이는 평소 편차 안이라 "좋아졌다"고 말할 수 없다
      const spread = median > 0 ? upper / median : null;
      const before = previous?.formats?.[format]?.metrics?.[metric]?.champion;
      if (before && champion && before.videoId !== champion.videoId) {
        out.history.push({format, metric, ...before, retiredAt: out.computedAt, replacedBy: champion.videoId});
      }
      entry.metrics[metric] = {
        label: METRICS[metric].label,
        meaning: METRICS[metric].meaning,
        n: rows.length,
        median,
        upper,
        spreadRatio: spread,
        champion,
        promoteAbove: champion && spread ? champion.value * spread : null,
        confidence: '가설', // 갱신 뒤 같은 요소를 쓴 다음 영상이 중앙값 이상일 때까지 확정하지 않는다
      };
    }
    out.formats[format] = entry;
  }
  return out;
}

/** 새 영상 한 편의 값이 기준선을 넘는지. "성공" 대신 "갱신 기준 초과 / 기준선 이하 / 기준선 없음"으로 말한다. */
export function judgeAgainstBaseline({format, metric, value}, baselines) {
  const m = baselines?.formats?.[format]?.metrics?.[metric];
  if (!m?.champion || m.promoteAbove == null || !Number.isFinite(Number(value))) {
    return {status: '기준선 없음', baseline: m?.champion?.value ?? null, promoteAbove: null};
  }
  const v = Number(value);
  if (v > m.promoteAbove) return {status: '갱신 기준 초과', baseline: m.champion.value, promoteAbove: m.promoteAbove};
  if (v > m.champion.value) return {status: '기준선 위, 편차 안(갱신 아님)', baseline: m.champion.value, promoteAbove: m.promoteAbove};
  return {status: '기준선 이하', baseline: m.champion.value, promoteAbove: m.promoteAbove};
}

function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

export function buildFromDisk({now = new Date(), write = true} = {}) {
  const catalog = readJson(join(dataDir, 'catalog.json'), {videos: []}).videos;
  const views7d = readJson(join(dataDir, 'views-7d.json'), {videos: {}}).videos;
  const analytics = readJson(join(dataDir, 'analytics-latest.json'), {});
  const performance = analytics.videoPerformance || [];
  const lifetimeFile = readJson(join(dataDir, 'video-lifetime.json'), null);
  const previous = readJson(baselinesPath, null);
  const result = computeBaselines({catalog, views7d, performance, range: analytics.range, lifetime: lifetimeFile?.videos ?? null, previous, now});
  if (write) writeFileSync(baselinesPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith('baseline.mjs')) {
  const r = buildFromDisk();
  for (const f of FORMATS) {
    for (const m of Object.values(r.formats[f].metrics)) {
      const bar = m.promoteAbove == null ? '없음' : m.promoteAbove.toFixed(2);
      console.log(`${f} ${m.label}: n=${m.n}, 중앙값 ${m.median}, 상위25% ${m.upper}, 기준선 ${m.champion?.value ?? '없음'}, 갱신 기준 ${bar} (${(m.champion?.title || '').slice(0, 30)})`);
    }
  }
}
