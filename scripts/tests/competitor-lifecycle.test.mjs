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

test('runD7AutonomousCycle: D+7 영상 성과를 검증하고 황금 광산 승격 및 시청자 검색어를 키워드 풀에 자율 편입한다', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  const catalog = [
    {
      videoId: 'v101',
      title: 'F와 P 발음 0.1초 구별법',
      publishedAt: '2026-11-10T12:00:00Z', // 8일 전 공개 (D+7 대상)
      views: 350,
    },
  ];
  const analyticsData = {
    summary: { medianViews: 200 }, // 350 / 200 = 1.75배 (1.5배↑ 황금광산 승격 요건 충족)
    searchTerms: [
      { insightTrafficSourceDetail: 'F 발음 원리', views: 50 },
      { insightTrafficSourceDetail: '이해하면', views: 30 }, // 불용어
    ],
  };
  const marketDemand = {
    trackedChannels: [
      {
        channelId: 'ch_fp',
        channelTitle: 'FP영어',
        status: LIFECYCLE_STATUS.CANDIDATE,
        topOutliers: [
          { title: 'F와 P 발음 차이' },
          { title: 'V와 B 소리 비밀' }, // 미커버 잔여 소재
        ],
      },
    ],
    byKeyword: [],
  };

  const result = runD7AutonomousCycle({
    marketDemandData: marketDemand,
    analyticsData,
    catalogVideos: catalog,
    now,
  });

  const updated = result.marketDemandData;
  assert.equal(updated.d7AutonomousCycle.status, 'completed');
  assert.equal(updated.d7AutonomousCycle.targetVideo.videoId, 'v101');
  assert.equal(updated.d7AutonomousCycle.targetVideo.ratio, 1.8);
  assert.equal(updated.trackedChannels[0].status, LIFECYCLE_STATUS.GOLD_MINE);
  assert.ok(result.promotedChannels.includes('FP영어'));
  assert.ok(updated.d7ProcessedVideoIds.includes('v101'));

  // 시청자 검색어 'F 발음 원리'가 키워드 풀에 신규 편입되었는지 검증
  const addedKw = updated.byKeyword.find((k) => k.keyword === 'F 발음 원리');
  assert.ok(addedKw != null);
  assert.equal(addedKw.source, 'd7_search_terms');
  // 불용어 '이해하면'은 걸러졌는지 검증
  assert.equal(updated.byKeyword.find((k) => k.keyword === '이해하면'), undefined);
});


