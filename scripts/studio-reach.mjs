// 유튜브 스튜디오 내보내기(노출수·CTR) 구간 값을 저장하고 고르는 규칙.
// 대시보드 서버(youtube-analytics-server.mjs)와 사분면 계산(matrix-diagnosis.mjs)이 같이 쓴다.

// CTR 칸이 비어 있으면 0이 아니라 null로 남긴다. 0으로 저장하면 나중에 "실제 CTR 0%"로 읽혀
// 영상이 클릭이 전혀 없는 것처럼 판정된다(2026-11-09 점검 3번).
export const toStoredCtr = (ctr) => (ctr == null ? null : Number(ctr));

const spanDays = (p) => {
  const start = Date.parse(p?.startDate || '');
  const end = Date.parse(p?.endDate || '');
  return Number.isFinite(start) && Number.isFinite(end) ? end - start : 0;
};

// CTR이 있는 구간 중 가장 최근에 끝난 구간을 고르고, 같은 날 끝나면 더 긴 구간(표본이 큰 쪽)을 고른다.
// 예전에는 종료일만 비교해 먼저 들어온 7일 구간이 28일 구간을 이길 수 있었다(점검 4번).
const latestBy = (periods, usable) =>
  Object.values(periods || {})
    .filter((p) => p && usable(p))
    .sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')) || spanDays(b) - spanDays(a))[0] || null;

export const pickLatestPeriod = (periods = {}) => latestBy(periods, (p) => p.ctr != null);

// 노출수만 쓰는 곳(표본 크기 판정)과 노출수·CTR을 같이 쓰는 곳(기획 입력)도 같은 규칙으로 고른다.
// 예전에는 두 곳이 "먼저 들어온 항목"을 골라서, 같은 날 끝나는 7일·28일·전체 구간 중 무엇이 쓰일지 들어온 순서에 달려 있었다(2026-11-13 Opus 리뷰 C-2).
export const pickLatestPeriodWithImpressions = (periods = {}, {needCtr = false} = {}) =>
  latestBy(periods, (p) => p.impressions != null && (!needCtr || p.ctr != null));
