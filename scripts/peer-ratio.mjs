// 경쟁 영상 "평소 대비 N배" 계산 (2026-11-15, 방향 점검 D `knowledge/audits/2026-11-15-direction-audit/d-benchmarking.md`).
//
// 예전 방식(ratioMethod 칸 없음): 누적 조회수 ÷ 공개 후 날수를 같은 채널 최근 영상들의 같은 값의 중앙값으로 나눴다.
//   쇼츠·롱폼이 섞이고, 자기 자신도 분모에 들어가고, 새 영상이 부풀고, 멈춘 채널이 분모를 무너뜨렸다.
//   같은 영상이 569.9 → 691.35 → 531.1로 사흘 만에 흔들렸다(`planning-outcome.mjs` 머리 주석이 같은 이유로 일평균을 버렸다).
// 새 방식(`peer-median-views-v2`): 이 영상의 누적 조회수 ÷ 같은 채널·같은 형식(쇼츠/롱폼) 최근 영상 조회수의 중앙값(자기 제외).
//   `outlierRatio` 칸 이름은 소비처 호환을 위해 그대로 두고 뜻만 바뀐다. 유튜브 스튜디오 배수(`studioFolds`)와는 정의가 달라 섞지 않는다.
//
// 아래 숫자는 전부 가설이다(knowledge/legacy/agents-archive-2026-11-27.md "대시보드 및 시스템 기능 설계 시 자동화 우선 원칙" 절 4번). 데이터가 쌓이면 근거를 보고 바꾼다.
// 값이 없으면 대신값을 만들지 않고 null과 사유(ratioStatus: 'measuring' | 'hold')를 남긴다.

export const RATIO_METHOD = 'peer-median-views-v2';

// 공개 7일 미만이면 "측정 중". 근거: 우리 영상 판정이 같은 7일 창을 쓴다(planning-outcome.mjs). 7일 안에서는 조회가 계속 몰려 숫자가 크게 움직인다.
export const MIN_AGE_DAYS = 7; // allow-literal: 가설 기준 일수, 근거는 위 주석
// 같은 형식 비교 영상이 이 수 미만이면 판정하지 않는다. 근거: 중앙값이 한두 편의 값과 같아지는 작은 표본을 막는다(market-demand.mjs LOW_SAMPLE_THRESHOLD 3보다 한 단계 엄격).
export const MIN_PEER_VIDEOS = 5; // allow-literal: 가설 최소 표본, 근거는 위 주석
// 채널의 가장 최근 업로드가 이 일수보다 오래됐으면 기준이 낡았다고 보고 "판정 보류".
// 근거: 감사 D에서 마지막 업로드 1년 전인 채널(klRk7F5k2TE)의 영상이 771배로 나왔다. 감사 권고값 30일을 그대로 쓴다.
export const STALE_CHANNEL_DAYS = 30; // allow-literal: 가설 기준 일수, 근거는 위 주석

const DAY_MS = 86_400_000;

const median = (values) => {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const round = (n, digits) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};
const ageDaysOf = (video, nowMs) => {
  const t = video?.publishedAt ? new Date(video.publishedAt).getTime() : NaN;
  return Number.isFinite(t) ? (nowMs - t) / DAY_MS : null;
};
const hasViews = (v) => v?.viewCount != null && v.viewCount !== '' && Number.isFinite(Number(v.viewCount));

/**
 * @param {{video: {videoId?: string, viewCount: number, publishedAt: string, isShort: boolean|null},
 *          channelVideos: Array<{videoId?: string, viewCount: number, publishedAt: string, isShort: boolean|null}>,
 *          now?: Date, minAgeDays?: number}} params
 *   channelVideos: 같은 채널에서 받아 둔 최근 영상(자기 자신이 들어 있어도 된다).
 *   minAgeDays: 읽기 전용 확인용. 기본값(MIN_AGE_DAYS)을 바꾸지 않는다.
 */
export function computePeerRatio({video, channelVideos = [], now = new Date(), minAgeDays = MIN_AGE_DAYS}) {
  const nowMs = now.getTime();
  const base = {ratioMethod: RATIO_METHOD, ratioComputedAt: now.toISOString(), outlierRatio: null, ratioDenominator: null, ratioPeerCount: 0};
  const hold = (reason, extra = {}) => ({...base, ...extra, ratioStatus: 'hold', ratioReason: reason});

  const age = ageDaysOf(video, nowMs);
  if (!hasViews(video) || age == null) return hold('이 영상의 조회수나 공개일을 알 수 없어 판정 보류');
  if (age < minAgeDays) {
    return {...base, ratioStatus: 'measuring', ratioReason: `공개 ${minAgeDays}일 미만(${round(age, 1)}일)이라 측정 중`};
  }
  if (video.isShort !== true && video.isShort !== false) return hold('쇼츠·롱폼 형식을 알 수 없어 판정 보류');

  // 채널 기준이 낡았는지: 받아 둔 영상 중 가장 최근 업로드(자기 포함)가 오래됐으면 보류.
  const ages = channelVideos.map((v) => ageDaysOf(v, nowMs)).filter((a) => a != null);
  const newestAge = ages.length ? Math.min(...ages, age) : age;
  if (newestAge > STALE_CHANNEL_DAYS) {
    return hold(`채널의 가장 최근 업로드가 ${Math.round(newestAge)}일 전이라 비교 기준이 낡아 판정 보류`);
  }

  const peers = channelVideos.filter((v) => v !== video
    && (!video.videoId || v.videoId !== video.videoId)
    && v.isShort === video.isShort
    && hasViews(v)
    && (ageDaysOf(v, nowMs) ?? -1) >= minAgeDays);
  if (peers.length < MIN_PEER_VIDEOS) {
    return hold(`같은 형식 비교 영상이 ${peers.length}편뿐이라(최소 ${MIN_PEER_VIDEOS}편) 표본 부족으로 판정 보류`, {ratioPeerCount: peers.length});
  }
  const denominator = median(peers.map((v) => Number(v.viewCount)));
  if (!denominator) {
    return hold('같은 형식 비교 영상의 조회수 중앙값이 0이라 판정 보류', {ratioPeerCount: peers.length});
  }
  return {
    ...base,
    outlierRatio: round(Number(video.viewCount) / denominator, 2),
    ratioDenominator: round(denominator, 1),
    ratioPeerCount: peers.length,
    ratioStatus: 'ok',
    ratioReason: null,
  };
}

/** 새 방식으로 계산됐고 값이 있는 배수인가. 옛 방식(ratioMethod 칸 없음)·측정 중·보류는 false. */
export function isComparableRatio(entry) {
  return Boolean(entry)
    && entry.ratioMethod === RATIO_METHOD
    && entry.ratioStatus === 'ok'
    && entry.outlierRatio != null
    && Number.isFinite(Number(entry.outlierRatio));
}

/** 비교·정렬·판정에 쓸 수 있는 배수만 숫자로, 아니면 null(대신값을 만들지 않는다). */
export function comparableRatioOrNull(entry) {
  return isComparableRatio(entry) ? Number(entry.outlierRatio) : null;
}

/** 정렬용 묶음: 0 = 새 방식 값, 1 = 옛 방식 값(참고용), 2 = 측정 중·보류·값 없음. 다른 묶음끼리는 숫자를 비교하지 않는다. */
export function ratioTier(entry) {
  if (isComparableRatio(entry)) return 0;
  if (entry && entry.ratioMethod == null && entry.outlierRatio != null && Number.isFinite(Number(entry.outlierRatio))) return 1;
  return 2;
}

/** 화면·문서에 쓰는 한 줄 라벨. */
export function formatRatioLabel(entry) {
  const tier = ratioTier(entry);
  if (tier === 0) return `${round(Number(entry.outlierRatio), 1)}배`;
  if (tier === 1) return `옛 방식 ${Math.round(Number(entry.outlierRatio))}배(참고용)`;
  if (entry?.ratioStatus === 'measuring') return '측정 중';
  if (entry?.ratioStatus === 'hold') return '판정 보류';
  return '측정 전';
}
