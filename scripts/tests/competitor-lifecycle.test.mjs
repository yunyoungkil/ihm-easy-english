import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LIFECYCLE_STATUS,
  extractKeywords,
  computeKeywordOverlap,
  isTopicAlreadyCovered,
  calculateTopicExhaustion,
  evaluateChannelLifecycle,
  syncAllTrackedChannels,
  runD7AutonomousCycle,
} from '../competitor-lifecycle.mjs';

test('extractKeywords: 불용어를 제거하고 2글자 이상 핵심 키워드를 추출한다', () => {
  const keywords = extractKeywords('F와 P 발음 차이 완벽 정리 #shorts');
  assert.ok(keywords.has('차이'));
  assert.ok(!keywords.has('발음')); // 불용어
  assert.ok(!keywords.has('shorts')); // 불용어
});

test('computeKeywordOverlap: 두 제목의 키워드 중복도를 계산한다', () => {
  const titleA = 'sheep ship 모음 구별법';
  const titleB = '양과 배 sheep vs ship 발음 연습';
  const overlap = computeKeywordOverlap(titleA, titleB);
  assert.ok(overlap > 0.3, `Overlap should be significant: ${overlap}`);
});

test('isTopicAlreadyCovered: 우리 카탈로그에 이미 다룬 주제인지 판정한다', () => {
  const catalog = [
    '[반복 듣기] F와 P를 0.1초 만에 구별하는 법 | F vs P 24쌍',
    'Sheep과 Ship 둘 다 쉽으로 읽으셨나요? 장단음 구별',
  ];
  assert.equal(isTopicAlreadyCovered('F와 P 발음 차이 소리 연습', catalog), true);
  assert.equal(isTopicAlreadyCovered('TH 발음 뻔데기 소리 완벽 정복', catalog), false);
});

test('calculateTopicExhaustion: 잔여 미커버 아웃라이어 수와 소진율을 계산한다', () => {
  const catalog = [
    'F vs P 24쌍 소리 연습',
    'R vs L 혀 위치와 구별법',
  ];
  const channel = {
    topOutliers: [
      { title: 'F와 P 발음 차이' }, // 커버됨
      { title: 'R과 L 발음 혀 위치' }, // 커버됨
      { title: 'TH 번데기 발음 원리' }, // 미커버
    ],
  };
  const result = calculateTopicExhaustion(channel, catalog);
  assert.equal(result.totalOutliers, 3);
  assert.equal(result.coveredCount, 2);
  assert.equal(result.uncoveredCount, 1);
  assert.equal(Math.round(result.exhaustionRate * 100), 67);
});

test('evaluateChannelLifecycle: 성과 배수 1.5배 이상이면 황금 광산으로 자동 승격된다', () => {
  const channel = {
    status: LIFECYCLE_STATUS.CANDIDATE,
    consecutiveFailures: 0,
    topOutliers: [{ title: 'TH 발음' }],
  };
  const evaluated = evaluateChannelLifecycle({
    channel,
    ourCatalogTitles: [],
    latestEpisodeRatio: 1.8,
    now: new Date('2026-11-11T12:00:00Z'),
  });
  assert.equal(evaluated.status, LIFECYCLE_STATUS.GOLD_MINE);
  assert.equal(evaluated.consecutiveFailures, 0);
  assert.ok(evaluated.statusReason.includes('황금 광산 승격'));
});

test('evaluateChannelLifecycle: 1회 실패는 경고 누적, 2회 연속 부진은 90일 자동 차단된다', () => {
  const channel = {
    status: LIFECYCLE_STATUS.CANDIDATE,
    consecutiveFailures: 0,
    topOutliers: [{ title: '미국식 연음' }],
  };
  const step1 = evaluateChannelLifecycle({
    channel,
    latestEpisodeRatio: 0.3, // 1회 실패
    now: new Date('2026-11-11T12:00:00Z'),
  });
  assert.equal(step1.status, LIFECYCLE_STATUS.CANDIDATE);
  assert.equal(step1.consecutiveFailures, 1);

  const step2 = evaluateChannelLifecycle({
    channel: step1,
    latestEpisodeRatio: 0.4, // 2회 연속 실패
    now: new Date('2026-11-18T12:00:00Z'),
  });
  assert.equal(step2.status, LIFECYCLE_STATUS.BLOCKED);
  assert.equal(step2.consecutiveFailures, 2);
  assert.ok(step2.blockedUntil != null);
  assert.ok(step2.statusReason.includes('자동 차단'));
});

test('evaluateChannelLifecycle: 아웃라이어를 전면 소진하면 명예 졸업(자동 삭제/보관) 처리된다', () => {
  const catalog = ['A 발음 완벽 정리', 'B 발음 완벽 정리'];
  const channel = {
    status: LIFECYCLE_STATUS.GOLD_MINE,
    topOutliers: [
      { title: 'A 발음 완벽 정리' },
      { title: 'B 발음 완벽 정리' },
    ],
  };
  const evaluated = evaluateChannelLifecycle({
    channel,
    ourCatalogTitles: catalog,
    now: new Date('2026-11-11T12:00:00Z'),
  });
  assert.equal(evaluated.status, LIFECYCLE_STATUS.GRADUATED);
  assert.ok(evaluated.statusReason.includes('명예 졸업'));
});

test('syncAllTrackedChannels: 전체 채널의 라이프사이클을 일괄 동기화한다', () => {
  const marketDemand = {
    trackedChannels: [
      {
        channelId: 'ch1',
        title: '발음 전문 채널',
        status: LIFECYCLE_STATUS.CANDIDATE,
        topOutliers: [{ title: 'TH 발음' }],
      },
    ],
  };
  const catalog = [{ title: '다른 영상' }];
  const synced = syncAllTrackedChannels(marketDemand, catalog);
  assert.equal(synced.trackedChannels.length, 1);
  assert.ok(synced.lifecycleSyncedAt != null);
  assert.ok(synced.trackedChannels[0].exhaustion != null);
});

// ---- runD7AutonomousCycle (2026-11-11 재작성): BRIEF "기획 근거"로 원천 채널을 찾고, 표본 부족이면 손대지 않는다 ----

const ch = (id, over = {}) => ({channelId: id, channelTitle: id, status: LIFECYCLE_STATUS.CANDIDATE, topOutliers: [{title: '아직 안 다룬 소재 ' + id}], ...over});
const outcome = (over = {}) => ({
  label: 'EP30', videoId: 'v30', verdict: 'worked', ratio: 1.8, ageDays: 8, reason: '같은 형식 중앙값 대비 1.8배',
  sources: {topic: 't', competitors: [{channelTitle: 'A', channelId: 'UC_A', videoId: 'x', sourceRatio: 5}], audience: null},
  ...over,
});
const cycle = (outcomes, md, extra = {}) => runD7AutonomousCycle({
  marketDemandData: {trackedChannels: [ch('UC_A'), ch('UC_B')], byKeyword: [], ...md},
  episodeOutcomes: outcomes, catalogVideos: [], now: new Date('2026-12-01T00:00:00Z'), ...extra,
});

test('runD7AutonomousCycle: 통한 편의 기획 근거 채널만 황금 광산으로 올린다', () => {
  const r = cycle([outcome()]);
  const [a, b] = r.marketDemandData.trackedChannels;
  assert.equal(a.status, LIFECYCLE_STATUS.GOLD_MINE);
  assert.equal(b.status, LIFECYCLE_STATUS.CANDIDATE);
  assert.deepEqual(r.promotedChannels, ['UC_A']);
  assert.ok(r.marketDemandData.d7ProcessedVideoIds.includes('v30'));
});

test('runD7AutonomousCycle: 보류·대기 판정은 채널 상태를 바꾸지 않고 처리 완료로 표시하지도 않는다', () => {
  const r = cycle([outcome({verdict: 'hold', ratio: 9, reason: '작은 표본'}), outcome({videoId: 'v31', verdict: 'pending', ratio: null})]);
  assert.ok(r.marketDemandData.trackedChannels.every((c) => c.status === LIFECYCLE_STATUS.CANDIDATE));
  assert.deepEqual(r.marketDemandData.d7ProcessedVideoIds, []);
});

test('runD7AutonomousCycle: 기획 근거가 없으면 제목이 비슷해도 어느 채널도 건드리지 않는다', () => {
  const r = cycle([outcome({sources: null})]);
  assert.ok(r.marketDemandData.trackedChannels.every((c) => c.status === LIFECYCLE_STATUS.CANDIDATE));
});

test('runD7AutonomousCycle: 이미 처리한 영상은 다시 반영하지 않는다', () => {
  const r = cycle([outcome({verdict: 'failed', ratio: 0.2})], {d7ProcessedVideoIds: ['v30']});
  assert.equal(r.marketDemandData.trackedChannels[0].consecutiveFailures || 0, 0);
});

test('runD7AutonomousCycle: 같은 채널 근거로 만든 두 편이 연달아 안 통하면 차단한다', () => {
  const r = cycle([outcome({verdict: 'failed', ratio: 0.3}), outcome({videoId: 'v31', verdict: 'failed', ratio: 0.2})]);
  assert.equal(r.marketDemandData.trackedChannels[0].status, LIFECYCLE_STATUS.BLOCKED);
});

test('runD7AutonomousCycle: 28일이 지난 편은 반영하지 않는다', () => {
  const r = cycle([outcome({ageDays: 40})]);
  assert.equal(r.marketDemandData.trackedChannels[0].status, LIFECYCLE_STATUS.CANDIDATE);
});

test('runD7AutonomousCycle: 판정 결과를 화면용으로 남긴다', () => {
  const r = cycle([outcome(), outcome({videoId: 'v31', label: 'EP31', verdict: 'hold', ratio: 2, reason: '작은 표본', sources: null})]);
  const saved = r.marketDemandData.episodeOutcomes;
  assert.equal(saved.length, 2);
  assert.deepEqual(saved.map((o) => o.verdict), ['worked', 'hold']);
});

test('runD7AutonomousCycle: 시청자 검색어는 지어낸 점수 없이 실제 검색 조회수만 붙여 편입한다', () => {
  const r = cycle([], {}, {analyticsData: {searchTerms: [{insightTrafficSourceDetail: 'F 발음 원리', views: 50}, {insightTrafficSourceDetail: '이해하면', views: 30}]}});
  const kw = r.marketDemandData.byKeyword.find((k) => k.keyword === 'F 발음 원리');
  assert.equal(kw.source, 'd7_search_terms');
  assert.equal(kw.searchViews, 50);
  assert.equal(kw.marketDemandScore, null);
  assert.equal(kw.opportunityScore, null);
  assert.equal(r.marketDemandData.byKeyword.find((k) => k.keyword === '이해하면'), undefined);
});

test('evaluateChannelLifecycle: 보통 성과(0.5~1.5배)는 연속 부진 횟수를 0으로 되돌린다', () => {
  const got = evaluateChannelLifecycle({channel: ch('UC_A', {consecutiveFailures: 1}), latestEpisodeRatio: 1.0});
  assert.equal(got.consecutiveFailures, 0);
});

test('runD7AutonomousCycle: 영어 학습과 상관없는 검색어나 채널 이름이 들어간 검색어는 넣지 않는다', () => {
  const terms = [
    '먼치킨 고양이',
    '한 명씩 정리한다 - skidrow277',
    'zlet-kytjly - 갑자기 난리남',
    'zlet-kytjly',
    '영어 발음',
    'right light',
  ];
  const r = cycle([], {}, {analyticsData: {searchTerms: terms.map((t) => ({insightTrafficSourceDetail: t, views: 3}))}});
  assert.deepEqual(r.marketDemandData.byKeyword.map((k) => k.keyword), ['영어 발음', 'right light']);
});

test('runD7AutonomousCycle: 이미 편입됐던 채널 슬러그/노이즈 d7_search_terms는 다음 순환에서 즉시 퇴장·고아 영상 반환한다', () => {
  const r = runD7AutonomousCycle({
    marketDemandData: {
      trackedChannels: [],
      byKeyword: [
        {keyword: 'zlet-kytjly - 갑자기 난리남', source: 'd7_search_terms', marketDemandScore: 47.5, topOutliers: [{videoId: 'NOISE_VID_1'}]},
        {keyword: '영어발음', source: 'd7_search_terms', marketDemandScore: 250, topOutliers: [{videoId: 'GOOD_VID_01'}]},
      ],
    },
    analyticsData: {
      searchTerms: [
        {insightTrafficSourceDetail: 'zlet-kytjly - 갑자기 난리남', views: 5},
        {insightTrafficSourceDetail: '영어발음', views: 4},
      ],
    },
    episodeOutcomes: [],
    catalogVideos: [],
    now: new Date('2026-11-12T06:30:00Z'),
  });
  assert.deepEqual(r.retiredKeywords, ['zlet-kytjly - 갑자기 난리남']);
  assert.deepEqual(r.orphanedVideoIds, ['NOISE_VID_1']);
  assert.deepEqual(r.marketDemandData.byKeyword.map((k) => k.keyword), ['영어발음']);
});

test('runD7AutonomousCycle: 새 d7_search_terms는 analyzedAt: null로 들어가고, 유입이 끊기면 7일 유예 후 퇴장·고아 영상 ID를 반환한다', () => {
  const nowDay1 = new Date('2026-11-12T00:00:00Z');
  const first = runD7AutonomousCycle({
    marketDemandData: {
      trackedChannels: [],
      byKeyword: [
        {keyword: '기존 수동 키워드', marketDemandScore: 80, topOutliers: [{videoId: 'KEEP_VID_01'}]},
        {keyword: '유지 영어발음', source: 'd7_search_terms', marketDemandScore: 90, analyzedAt: '2026-11-01T00:00:00Z', topOutliers: [{videoId: 'SHARED_VID1'}]},
        {keyword: '예전 영어단어', source: 'd7_search_terms', marketDemandScore: 70, analyzedAt: '2026-11-01T00:00:00Z', topOutliers: [{videoId: 'OLD_ORPHAN1'}, {videoId: 'SHARED_VID1'}]},
      ],
    },
    analyticsData: {searchTerms: [{insightTrafficSourceDetail: '유지 영어발음', views: 20}, {insightTrafficSourceDetail: '영단어', views: 15}]},
    episodeOutcomes: [],
    catalogVideos: [],
    now: nowDay1,
  });

  const newKw = first.marketDemandData.byKeyword.find((k) => k.keyword === '영단어');
  assert.equal(newKw.analyzedAt, null, '아직 분석 전이므로 analyzedAt은 null이어야 한다');
  assert.equal(newKw.marketDemandScore, null);
  const graceKw = first.marketDemandData.byKeyword.find((k) => k.keyword === '예전 영어단어');
  assert.ok(graceKw?.d7OutOfActiveSince, '첫 이탈 시 유예 시작 시각을 남긴다');
  assert.deepEqual(first.retiredKeywords, []);
  assert.deepEqual(first.orphanedVideoIds, []);

  // 7일 후에도 여전히 active searchTerms에 없으면 퇴장하고, 공유 안 되는 고아 videoId만 반환한다
  const afterGrace = runD7AutonomousCycle({
    marketDemandData: first.marketDemandData,
    analyticsData: {searchTerms: [{insightTrafficSourceDetail: '유지 영어발음', views: 25}, {insightTrafficSourceDetail: '영단어', views: 18}]},
    episodeOutcomes: [],
    catalogVideos: [],
    now: new Date(nowDay1.getTime() + 7 * 86400000 + 1000),
  });
  assert.deepEqual(afterGrace.retiredKeywords, ['예전 영어단어']);
  assert.deepEqual(afterGrace.orphanedVideoIds, ['OLD_ORPHAN1']);
  assert.equal(afterGrace.marketDemandData.byKeyword.find((k) => k.keyword === '예전 영어단어'), undefined);
  assert.ok(afterGrace.marketDemandData.byKeyword.find((k) => k.keyword === '기존 수동 키워드'), '수동 키워드는 D+7 순환이 삭제하지 않는다');
});

test('runD7AutonomousCycle: 띄어쓰기만 다른 검색어 중복은 1슬롯으로 통합하고 중복 별칭은 정리한다', () => {
  const r = runD7AutonomousCycle({
    marketDemandData: {
      trackedChannels: [],
      byKeyword: [
        {keyword: '영어발음', source: 'd7_search_terms', marketDemandScore: 76, analyzedAt: '2026-11-01T00:00:00Z', topOutliers: [{videoId: 'VID_KEEP_01'}]},
        {keyword: '영어 발음', source: 'd7_search_terms', marketDemandScore: 76, analyzedAt: '2026-11-01T00:00:00Z', topOutliers: [{videoId: 'VID_DUP_001'}]},
      ],
    },
    analyticsData: {
      searchTerms: [
        {insightTrafficSourceDetail: '영어발음', views: 11},
        {insightTrafficSourceDetail: '영어 발음', views: 10},
        {insightTrafficSourceDetail: '영어미드', views: 8},
      ],
    },
    episodeOutcomes: [],
    catalogVideos: [],
    now: new Date('2026-11-12T00:00:00Z'),
  });
  const kept = r.marketDemandData.byKeyword.filter((k) => k.keyword.replace(/\s+/g, '') === '영어발음');
  assert.equal(kept.length, 1);
  assert.equal(kept[0].searchViews, 21);
  assert.deepEqual(r.retiredKeywords, ['영어 발음']);
  assert.deepEqual(r.orphanedVideoIds, ['VID_DUP_001']);
});

test('runD7AutonomousCycle: searchTerms가 비어 있으면 기존 d7_search_terms 퇴장을 시작하지 않는다', () => {
  const r = runD7AutonomousCycle({
    marketDemandData: {
      trackedChannels: [],
      byKeyword: [{keyword: '영어발음', source: 'd7_search_terms', marketDemandScore: 76, topOutliers: []}],
    },
    analyticsData: {searchTerms: []},
    episodeOutcomes: [],
    catalogVideos: [],
    now: new Date('2026-11-12T00:00:00Z'),
  });
  assert.equal(r.marketDemandData.byKeyword.length, 1);
  assert.equal(r.marketDemandData.byKeyword[0].d7OutOfActiveSince, undefined);
});
