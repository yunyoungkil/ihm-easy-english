// 기준선(현재 최고 기록) 계산. 2026-11-13 사용자 결정: 우리 채널에는 "성공"이라는 말을 쓰지 않고,
// 형식·지표별 현재 최고를 기준선으로 두고 새 영상이 우리 편차보다 크게 넘으면 새 기준선으로 올린다.
// 지표는 있는 데이터로 세운다(사용자: 조회수와 시청 시간, 구독): 공개 첫 7일의 조회수 / 평균 시청 시간(초) / 구독 수.
// 영상끼리 같은 나이(공개 첫 7일)로 비교하고, 모든 숫자는 실제 파일에서 계산한다(손으로 쓴 값 없음).
// 근거: knowledge/decisions/2026-11-13-experiment-loop.md
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'youtube');
export const baselinesPath = join(dataDir, 'baselines.json');

const QUANTILE_MEDIAN = 0.5; // allow-literal: 분위수의 정의(중앙값)
const QUANTILE_UPPER = 0.75; // allow-literal: 분위수의 정의(상위 25% 경계)
export const FORMATS = ['SHORTS', 'LONGFORM'];
export const METRICS = {
  views7d: {label: '공개 7일 조회수', meaning: '제목·썸네일·소재(포장)', unit: '회'},
  watchSeconds7d: {label: '공개 7일 평균 시청 시간', meaning: '훅·화면·대본(내용). 영상이 길수록 유리해서 길이를 같이 본다', unit: '초'},
  subs7d: {label: '공개 7일 구독 수', meaning: '채널의 가치', unit: '명'},
};

/** 오름차순 정렬에서 floor(p*n)번째 값(n이 작아도 같은 방식으로 계산). */
export function quantile(values, p) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

const num = (x) => (x === null || x === undefined || x === '' || !Number.isFinite(Number(x)) ? null : Number(x));

function metricRows(format, metric, {catalog, views7d, lifetime}) {
  const videos = catalog.filter((v) => v.format === format);
  const rows = [];
  const push = (v, value) => { if (value !== null) rows.push({videoId: v.videoId, title: v.title, publishedAt: v.publishedAt, durationSeconds: num(v.durationSeconds), value}); };
  if (metric === 'views7d') {
    for (const v of videos) push(v, num(views7d?.[v.videoId]?.views7d));
    return rows;
  }
  const have = videos.map((v) => ({v, f: lifetime?.[v.videoId]?.first7d})).filter((x) => x.f && num(x.f.views) !== null);
  if (metric === 'subs7d') {
    for (const {v, f} of have) push(v, num(f.subscribersGained));
    return rows;
  }
  // 평균 시청 시간은 첫 7일 조회수가 형식 중앙값 이상인 영상만 본다(적은 조회수의 평균은 한 명 차이로 크게 흔들린다)
  const floor = quantile(have.map((x) => Number(x.f.views)), QUANTILE_MEDIAN);
  for (const {v, f} of have) if (Number(f.views) >= floor) push(v, num(f.averageViewDuration));
  return rows;
}

/** previous는 이전 baselines.json. 챔피언이 바뀌면 이전 챔피언을 history에 더한다(지우지 않는다). */
export function computeBaselines({catalog, views7d, lifetime, previous = null, now = new Date()}) {
  const out = {schemaVersion: 2, computedAt: now.toISOString(), formats: {}, history: [...(previous?.history || [])]};
  for (const format of FORMATS) {
    const entry = {metrics: {}};
    for (const metric of Object.keys(METRICS)) {
      const rows = metricRows(format, metric, {catalog, views7d, lifetime});
      const values = rows.map((r) => r.value);
      const champion = rows.reduce((best, r) => (!best || r.value > best.value ? r : best), null);
      const median = quantile(values, QUANTILE_MEDIAN);
      const upper = quantile(values, QUANTILE_UPPER);
      // 우리 데이터의 편차: 이보다 작은 차이는 평소 편차 안이라 "좋아졌다"고 말할 수 없다.
      // 중앙값이 0이면(구독 수처럼 대부분 0) 비율을 못 구하므로 상위 25%와 중앙값의 차(절대값)를 쓴다. 차가 0이면 기준선보다 1이라도 높아야 갱신이다.
      const ratio = median > 0 ? upper / median : null;
      let promoteAbove = null;
      if (champion && median !== null) promoteAbove = ratio ? champion.value * ratio : champion.value + (upper - median);
      const before = previous?.formats?.[format]?.metrics?.[metric]?.champion;
      if (before && champion && before.videoId !== champion.videoId) {
        out.history.push({format, metric, ...before, retiredAt: out.computedAt, replacedBy: champion.videoId});
      }
      entry.metrics[metric] = {
        label: METRICS[metric].label,
        meaning: METRICS[metric].meaning,
        unit: METRICS[metric].unit,
        n: rows.length,
        median,
        upper,
        spreadRatio: ratio,
        promoteRule: ratio ? '비율' : '차이',
        champion,
        promoteAbove,
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

/** 한 편의 세 지표를 한꺼번에 판정한다. metrics: {views7d, watchSeconds7d, subs7d}. */
export function judgeVideoMetrics({format, metrics}, baselines) {
  const per = {};
  for (const key of Object.keys(METRICS)) per[key] = {value: num(metrics?.[key]), ...judgeAgainstBaseline({format, metric: key, value: metrics?.[key]}, baselines)};
  const over = Object.keys(per).filter((k) => per[k].status === '갱신 기준 초과').map((k) => METRICS[k].label);
  return {per, summary: over.length ? `갱신 기준을 넘은 지표: ${over.join(', ')}` : '갱신 기준을 넘은 지표 없음'};
}

function readJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

export function buildFromDisk({now = new Date(), write = true} = {}) {
  const catalog = readJson(join(dataDir, 'catalog.json'), {videos: []}).videos;
  const views7d = readJson(join(dataDir, 'views-7d.json'), {videos: {}}).videos;
  const lifetime = readJson(join(dataDir, 'video-lifetime.json'), {videos: {}}).videos;
  const previous = readJson(baselinesPath, null);
  const result = computeBaselines({catalog, views7d, lifetime, previous, now});
  if (write) writeFileSync(baselinesPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && process.argv[1].endsWith('baseline.mjs')) {
  const r = buildFromDisk();
  for (const f of FORMATS) {
    for (const m of Object.values(r.formats[f].metrics)) {
      const bar = m.promoteAbove == null ? '없음' : Number(m.promoteAbove.toFixed(2));
      const len = m.champion?.durationSeconds ? `, 영상 ${m.champion.durationSeconds}초` : '';
      console.log(`${f} ${m.label}: n=${m.n}, 중앙값 ${m.median}, 상위25% ${m.upper}, 기준선 ${m.champion?.value ?? '없음'}${m.unit}${len}, 갱신 기준 ${bar} [${m.promoteRule}] (${(m.champion?.title || '').slice(0, 28)})`);
    }
  }
}
