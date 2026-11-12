import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_KEYWORD_FAILURE_COOLDOWN_DAYS,
  DEFAULT_KEYWORD_REFRESH_DAYS,
  executeKeywordRefreshTargets,
  isQuotaOrAuthError,
  mergeKeywordAnalysisEntries,
  selectKeywordRefreshTargets,
  updateKeywordFailureMap,
} from '../keyword-backlog.mjs';
import {decideKeywordBackfill, runKeywordRefreshStep} from '../daily-loop.mjs';

const now = new Date('2026-11-12T05:00:00Z');
const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString();

test('selectKeywordRefreshTargets: 미분석 키워드(검색 유입 큰 순) → 14일 지난 오래된 키워드 순으로 최대 limit개 선택', () => {
  const md = {
    byKeyword: [
      {keyword: '신선한 키워드', marketDemandScore: 100, analyzedAt: daysAgo(2)},
      {keyword: '가장 오래된 키워드', marketDemandScore: 90, analyzedAt: daysAgo(30)},
      {keyword: '덜 오래된 키워드', marketDemandScore: 95, analyzedAt: daysAgo(15)},
      {keyword: '미분석 낮은 유입', marketDemandScore: null, searchViews: 5, analyzedAt: null},
      // 과거 버그로 발견 시각이 analyzedAt에 찍혔어도 emptyReason이 없으면 미분석으로 취급
      {keyword: '미분석 높은 유입', marketDemandScore: null, searchViews: 20, analyzedAt: daysAgo(1)},
    ],
  };

  const {targets} = selectKeywordRefreshTargets(md, {limit: 2, refreshDays: DEFAULT_KEYWORD_REFRESH_DAYS, now});
  assert.deepEqual(
    targets.map((t) => [t.keyword, t.reason]),
    [
      ['미분석 높은 유입', 'unanalyzed'],
      ['미분석 낮은 유입', 'unanalyzed'],
    ],
  );

  const nextBatch = selectKeywordRefreshTargets({
    byKeyword: md.byKeyword.filter((k) => k.marketDemandScore !== null),
  }, {limit: 2, refreshDays: 14, now});
  assert.deepEqual(
    nextBatch.targets.map((t) => [t.keyword, t.reason]),
    [
      ['가장 오래된 키워드', 'stale'],
      ['덜 오래된 키워드', 'stale'],
    ],
  );
});

test('selectKeywordRefreshTargets: 소형 채널 표본 0개(emptyReason) 및 최근 실패 키워드는 쿨다운 동안 건너뛴다', () => {
  const md = {
    byKeyword: [
      {keyword: '표본없음_최근', marketDemandScore: null, emptyReason: '소형 채널 표본 0개', analyzedAt: daysAgo(3)},
      {keyword: '표본없음_14일경과', marketDemandScore: null, emptyReason: '소형 채널 표본 0개', analyzedAt: daysAgo(15)},
      {keyword: '최근실패키워드', marketDemandScore: null, searchViews: 50, analyzedAt: null},
    ],
  };
  const failedKeywords = {
    최근실패키워드: {lastFailedAt: daysAgo(DEFAULT_KEYWORD_FAILURE_COOLDOWN_DAYS - 1), message: 'timeout'},
  };

  const res = selectKeywordRefreshTargets(md, {limit: 5, failedKeywords, now});
  assert.deepEqual(res.targets.map((t) => t.keyword), ['표본없음_14일경과']);
  assert.equal(res.skippedCount, 2);
});

test('executeKeywordRefreshTargets: 쿼터 초과 오류 시 즉시 배치를 중단하고 일반 오류는 다음 대상을 이어간다', async () => {
  const calledQuota = [];
  const quotaRes = await executeKeywordRefreshTargets(
    [{keyword: 'k1', reason: 'unanalyzed'}, {keyword: 'k2', reason: 'stale'}],
    async (kw) => {
      calledQuota.push(kw);
      throw new Error('YouTube API search failed: quotaExceeded (403)');
    },
  );
  assert.deepEqual(calledQuota, ['k1']);
  assert.equal(quotaRes.haltedOnQuota, true);
  assert.equal(quotaRes.failed.length, 1);

  const calledMixed = [];
  const mixedRes = await executeKeywordRefreshTargets(
    [{keyword: 'k1', reason: 'unanalyzed'}, {keyword: 'k2', reason: 'stale'}],
    async (kw) => {
      calledMixed.push(kw);
      if (kw === 'k1') throw new Error('temporary network error');
      return {queued: {comments: ['v1'], scripts: ['v1']}};
    },
  );
  assert.deepEqual(calledMixed, ['k1', 'k2']);
  assert.equal(mixedRes.haltedOnQuota, false);
  assert.equal(mixedRes.analyzed.length, 1);
  assert.equal(mixedRes.analyzed[0].queuedReports, 2);
  assert.equal(mixedRes.failed.length, 1);
  assert.equal(isQuotaOrAuthError('quotaExceeded'), true);
});

test('mergeKeywordAnalysisEntries: 재분석 결과 병합 시 source·searchViews·firstSeenAt을 보존한다', () => {
  const existing = [
    {
      keyword: '영단어',
      source: 'd7_search_terms',
      searchViews: 14,
      firstSeenAt: '2026-11-10T00:00:00Z',
      lastD7SyncedAt: '2026-11-12T00:00:00Z',
      marketDemandScore: null,
      opportunityScore: null,
      analyzedAt: null,
      topOutliers: [],
    },
  ];
  const merged = mergeKeywordAnalysisEntries(existing, [
    {
      keyword: '영단어',
      analyzedAt: '2026-11-12T05:00:00Z',
      marketDemandScore: 120.5,
      opportunityScore: 22.1,
      totalResults: 45000,
      videoCount: 5,
      emptyReason: null,
      topOutliers: [{videoId: 'VID_001', outlierRatio: 3.2}],
    },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].source, 'd7_search_terms');
  assert.equal(merged[0].searchViews, 14);
  assert.equal(merged[0].firstSeenAt, '2026-11-10T00:00:00Z');
  assert.equal(merged[0].marketDemandScore, 120.5);
});

test('updateKeywordFailureMap & daily-loop runKeywordRefreshStep 연동', async () => {
  const nextFailures = updateKeywordFailureMap(
    {old: {lastFailedAt: daysAgo(10), message: 'expired'}, okKw: {lastFailedAt: daysAgo(1), message: 'prev'}},
    {analyzed: [{keyword: 'okKw'}], failed: [{keyword: 'badKw', error: 'timeout'}], now},
  );
  assert.deepEqual(Object.keys(nextFailures), ['badKw']);

  const sel = decideKeywordBackfill({
    marketDemand: {byKeyword: [{keyword: '영단어', marketDemandScore: null, analyzedAt: null}]},
    now,
  });
  assert.equal(sel.hasWork, true);
  const posted = [];
  const stepRes = await runKeywordRefreshStep(sel, async (path, body) => {
    posted.push([path, body]);
    return {queued: {comments: ['v1'], scripts: []}};
  });
  assert.deepEqual(posted, [['/api/market-demand/run', {keyword: '영단어'}]]);
  assert.equal(stepRes.analyzed.length, 1);
  assert.equal(stepRes.analyzed[0].queuedReports, 1);
});

