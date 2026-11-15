import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  RATIO_METHOD,
  MIN_AGE_DAYS,
  MIN_PEER_VIDEOS,
  STALE_CHANNEL_DAYS,
  computePeerRatio,
  isComparableRatio,
  comparableRatioOrNull,
  ratioTier,
  formatRatioLabel,
} from '../peer-ratio.mjs';

// 칸 이름은 실제 data/youtube/market-demand.json 의 topOutliers 와 같다(viewCount, publishedAt, isShort, videoId).
const NOW = new Date('2026-11-15T00:00:00Z');
const DAY = 86_400_000;
const daysAgo = (n) => new Date(NOW.getTime() - n * DAY).toISOString();
const vid = (videoId, viewCount, ageDays, isShort = true) => ({videoId, viewCount, publishedAt: daysAgo(ageDays), isShort});

// 같은 채널·같은 형식(쇼츠) 최근 영상 6편: 자기 자신은 따로 둔다.
const peers = [
  vid('p1', 1000, 20), vid('p2', 2000, 25), vid('p3', 3000, 30), vid('p4', 4000, 40), vid('p5', 5000, 50), vid('p6', 6000, 60),
];

test('배수 = 이 영상 누적 조회수 ÷ 같은 채널·같은 형식 영상 조회수 중앙값(자기 제외)', () => {
  const self = vid('me', 70_000, 10);
  const r = computePeerRatio({video: self, channelVideos: [self, ...peers], now: NOW});
  assert.equal(r.ratioStatus, 'ok');
  assert.equal(r.ratioMethod, RATIO_METHOD);
  assert.equal(r.ratioMethod, 'peer-median-views-v2');
  assert.equal(r.ratioDenominator, 3500); // 1000~6000의 중앙값
  assert.equal(r.ratioPeerCount, 6);
  assert.equal(r.outlierRatio, 20); // 70000 / 3500
  assert.equal(r.ratioComputedAt, NOW.toISOString());
});

test('자기 자신이 비교 대상에 들어 있어도 분모에서 뺀다', () => {
  const self = vid('me', 70_000, 10);
  const withSelf = computePeerRatio({video: self, channelVideos: [self, ...peers], now: NOW});
  const withoutSelf = computePeerRatio({video: self, channelVideos: peers, now: NOW});
  assert.equal(withSelf.ratioDenominator, withoutSelf.ratioDenominator);
  assert.equal(withSelf.outlierRatio, withoutSelf.outlierRatio);
});

test('쇼츠는 쇼츠끼리, 롱폼은 롱폼끼리만 비교한다', () => {
  const longs = [1, 2, 3, 4, 5, 6].map((n) => vid('L' + n, 900_000 * n, 20 + n, false));
  const self = vid('me', 70_000, 10, true);
  const r = computePeerRatio({video: self, channelVideos: [self, ...longs, ...peers], now: NOW});
  assert.equal(r.ratioDenominator, 3500);
  assert.equal(r.ratioPeerCount, 6);
});

test('공개 7일 미만이면 배수를 만들지 않고 "측정 중"이다', () => {
  assert.equal(MIN_AGE_DAYS, 7);
  const self = vid('me', 70_000, 3);
  const r = computePeerRatio({video: self, channelVideos: [self, ...peers], now: NOW});
  assert.equal(r.ratioStatus, 'measuring');
  assert.equal(r.outlierRatio, null);
  assert.equal(r.ratioDenominator, null);
  assert.equal(r.ratioMethod, RATIO_METHOD);
});

test('비교할 같은 형식 영상이 최소 표본 미만이면 판정하지 않는다(대신값 없음)', () => {
  const self = vid('me', 70_000, 10);
  const few = peers.slice(0, MIN_PEER_VIDEOS - 1);
  const r = computePeerRatio({video: self, channelVideos: [self, ...few], now: NOW});
  assert.equal(r.ratioStatus, 'hold');
  assert.equal(r.outlierRatio, null);
  assert.equal(r.ratioPeerCount, MIN_PEER_VIDEOS - 1);
  assert.match(r.ratioReason, /표본/);
});

test('공개 7일 미만 영상은 비교 대상에서 뺀다(아직 조회가 덜 쌓인 영상이 분모를 깎지 않게)', () => {
  const self = vid('me', 70_000, 10);
  const young = [vid('y1', 5, 1), vid('y2', 6, 2), vid('y3', 7, 3)];
  const r = computePeerRatio({video: self, channelVideos: [self, ...peers, ...young], now: NOW});
  assert.equal(r.ratioDenominator, 3500);
  assert.equal(r.ratioPeerCount, 6);
});

test('채널의 가장 최근 업로드가 오래됐으면 기준이 낡았으니 판정 보류', () => {
  assert.equal(STALE_CHANNEL_DAYS, 30);
  // 실제 사례 모양: 마지막 업로드가 1년 넘게 전인 채널의 오래된 영상
  const old = [1, 2, 3, 4, 5, 6].map((n) => vid('o' + n, 100 * n, 400 + n * 10));
  const self = vid('me', 539_520, 724);
  const r = computePeerRatio({video: self, channelVideos: [self, ...old], now: NOW});
  assert.equal(r.ratioStatus, 'hold');
  assert.equal(r.outlierRatio, null);
  assert.match(r.ratioReason, /최근 업로드/);
});

test('형식을 알 수 없으면(isShort null) 판정하지 않는다', () => {
  const self = {...vid('me', 70_000, 10), isShort: null};
  const r = computePeerRatio({video: self, channelVideos: [self, ...peers], now: NOW});
  assert.equal(r.ratioStatus, 'hold');
  assert.equal(r.outlierRatio, null);
});

test('조회수가 숫자가 아닌 영상은 비교 대상으로 세지 않는다', () => {
  const self = vid('me', 70_000, 10);
  const broken = [{videoId: 'b1', viewCount: NaN, publishedAt: daysAgo(30), isShort: true}, {videoId: 'b2', viewCount: null, publishedAt: daysAgo(30), isShort: true}];
  const r = computePeerRatio({video: self, channelVideos: [self, ...peers, ...broken], now: NOW});
  assert.equal(r.ratioPeerCount, 6);
  assert.equal(r.ratioDenominator, 3500);
});

test('자기 조회수가 숫자가 아니면 판정 보류이고 배수는 null이다', () => {
  const self = {...vid('me', 0, 10), viewCount: null};
  const r = computePeerRatio({video: self, channelVideos: [self, ...peers], now: NOW});
  assert.equal(r.ratioStatus, 'hold');
  assert.equal(r.outlierRatio, null);
});

test('isComparableRatio / comparableRatioOrNull: 새 방식 + ok + 유한한 값만 비교에 쓴다', () => {
  const ok = {outlierRatio: 20, ratioMethod: RATIO_METHOD, ratioStatus: 'ok'};
  assert.equal(isComparableRatio(ok), true);
  assert.equal(comparableRatioOrNull(ok), 20);
  // 옛 방식(ratioMethod 칸이 없음): 값은 남아 있어도 새 값과 비교하지 않는다.
  const legacy = {outlierRatio: 570};
  assert.equal(isComparableRatio(legacy), false);
  assert.equal(comparableRatioOrNull(legacy), null);
  // 측정 중·보류·null
  assert.equal(comparableRatioOrNull({outlierRatio: null, ratioMethod: RATIO_METHOD, ratioStatus: 'measuring'}), null);
  assert.equal(comparableRatioOrNull({outlierRatio: null, ratioMethod: RATIO_METHOD, ratioStatus: 'hold'}), null);
  assert.equal(comparableRatioOrNull(null), null);
  assert.equal(comparableRatioOrNull(undefined), null);
});

test('ratioTier: 새 방식 ok(0) < 옛 방식(1) < 측정 중·보류·값 없음(2) 순으로 묶는다', () => {
  assert.equal(ratioTier({outlierRatio: 3, ratioMethod: RATIO_METHOD, ratioStatus: 'ok'}), 0);
  assert.equal(ratioTier({outlierRatio: 570}), 1);
  assert.equal(ratioTier({outlierRatio: null, ratioMethod: RATIO_METHOD, ratioStatus: 'measuring'}), 2);
  assert.equal(ratioTier({}), 2);
});

test('formatRatioLabel: 새 방식·옛 방식·측정 중·보류·값 없음을 서로 다르게 보여 준다', () => {
  assert.equal(formatRatioLabel({outlierRatio: 19.6, ratioMethod: RATIO_METHOD, ratioStatus: 'ok'}), '19.6배');
  assert.equal(formatRatioLabel({outlierRatio: 570}), '옛 방식 570배(참고용)');
  assert.equal(formatRatioLabel({outlierRatio: null, ratioMethod: RATIO_METHOD, ratioStatus: 'measuring'}), '측정 중');
  assert.equal(formatRatioLabel({outlierRatio: null, ratioMethod: RATIO_METHOD, ratioStatus: 'hold'}), '판정 보류');
  assert.equal(formatRatioLabel({}), '측정 전');
  assert.equal(formatRatioLabel(null), '측정 전');
});
