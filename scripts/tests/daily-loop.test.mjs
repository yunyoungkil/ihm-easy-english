import test from 'node:test';
import assert from 'node:assert/strict';
import {decideDailySteps, decideOutlierBackfill, pickCommentTargets, runAudienceBackfillStep, COMPETITOR_REFRESH_DAYS, AUDIENCE_REFRESH_DAYS} from '../daily-loop.mjs';

const now = new Date('2026-11-20T20:00:00Z');
const ago = (d) => new Date(now.getTime() - d * 86400000).toISOString();

test('동기화는 매일 한다', () => {
  assert.equal(decideDailySteps({now, competitorsAnalyzedAt: ago(1), audienceDnaUpdatedAt: ago(1)}).sync, true);
});

test(`경쟁 채널은 ${COMPETITOR_REFRESH_DAYS}일이 지났거나 기록이 없을 때만 새로 받는다`, () => {
  assert.equal(decideDailySteps({now, competitorsAnalyzedAt: ago(COMPETITOR_REFRESH_DAYS - 1)}).competitors, false);
  assert.equal(decideDailySteps({now, competitorsAnalyzedAt: ago(COMPETITOR_REFRESH_DAYS + 0.1)}).competitors, true);
  assert.equal(decideDailySteps({now, competitorsAnalyzedAt: null}).competitors, true);
});

test(`시청자 고민은 ${AUDIENCE_REFRESH_DAYS}일이 지났거나 기록이 없을 때만 분석한다`, () => {
  assert.equal(decideDailySteps({now, audienceDnaUpdatedAt: ago(AUDIENCE_REFRESH_DAYS - 1)}).audience, false);
  assert.equal(decideDailySteps({now, audienceDnaUpdatedAt: ago(59)}).audience, true);
  assert.equal(decideDailySteps({now, audienceDnaUpdatedAt: null}).audience, true);
});

const ch = (id, status, outliers) => ({channelId: id, status, topOutliers: outliers});
const o = (videoId, outlierRatio) => ({videoId, outlierRatio});

test('댓글 분석 대상: 차단·졸업 채널은 빼고, 이미 분석한 영상은 빼고, 배수 큰 순으로 n개', () => {
  const md = {trackedChannels: [
    ch('A', 'candidate', [o('a1', 5), o('a2', 50)]),
    ch('B', 'gold_mine', [o('b1', 20)]),
    ch('C', 'blocked', [o('c1', 999)]),
    ch('D', 'graduated', [o('d1', 888)]),
  ]};
  assert.deepEqual(pickCommentTargets(md, new Set(['a2']), 3), ['b1', 'a1']);
});

test('같은 영상이 여러 채널·키워드에 있어도 한 번만 고른다', () => {
  const md = {trackedChannels: [ch('A', 'candidate', [o('x', 9)]), ch('B', 'candidate', [o('x', 9), o('y', 3)])]};
  assert.deepEqual(pickCommentTargets(md, new Set(), 3), ['x', 'y']);
});

// ---- 대시보드 실제 데이터 점검: 주요 통로가 오류 없이 내용을 내보내는가 ----
import {dashboardApiProblems, DASHBOARD_CHECKS} from '../daily-loop.mjs';

const okBodies = {
  '/api/dashboard': {channel: {title: 'x'}, recentVideos: [1]},
  '/api/episodes/summary': [{episode: 'EP1'}],
  '/api/market-demand': {byKeyword: [1], trackedChannels: [1]},
  '/api/knowledge-db': {audienceDna: {entries: [1]}},
  '/api/thumb-feed/packages': {packages: [1]},
  '/api/next-input': {outcomes: [], comparisons: {}},
  '/next-input': '<h1>다음 기획 입력</h1>',
  '/outlier-reports': '<h1>아웃라이어 리포트 3편</h1>',
  '/visual-library': '<h1>연출 자료집</h1>',
};
const resp = (over = {}) => DASHBOARD_CHECKS.map((c) => ({path: c.path, status: 200, body: okBodies[c.path], ...(over[c.path] || {})}));

test('주요 통로가 모두 200이고 내용이 있으면 문제 없음', () => {
  assert.deepEqual(dashboardApiProblems(resp()), []);
});

test('오류 응답이나 빈 내용이면 그 통로를 알린다', () => {
  const got = dashboardApiProblems(resp({
    '/api/market-demand': {status: 500, body: {error: 'boom'}},
    '/api/episodes/summary': {body: []},
  }));
  assert.equal(got.length, 2);
  assert.ok(got.some((p) => p.includes('/api/market-demand') && p.includes('500')));
  assert.ok(got.some((p) => p.includes('/api/episodes/summary') && p.includes('비어')));
});

test('백필 대상 선정: 키워드·채널 양쪽에서 댓글과 대본 대상을 각각 고르고, 영구 실패는 제외한다', () => {
  const md = {
    byKeyword: [{keyword: '영어', topOutliers: [o('kw1', 80), o('kw2', 30)]}],
    trackedChannels: [ch('A', 'candidate', [o('ch1', 50)])],
  };
  const failures = {
    kw1: {script: {message: '자막 추출 실패 (kw1): 이 영상에는 가져올 수 있는 자막이 없습니다.', failedAt: now.toISOString()}},
  };
  const got = decideOutlierBackfill({
    marketDemand: md,
    existingCommentIds: new Set(['ch1']),
    existingScriptIds: new Set(['kw2']),
    failures,
    now,
    commentLimit: 3,
    scriptLimit: 3,
  });
  assert.deepEqual(got.commentTargets, ['kw1', 'kw2']);
  assert.deepEqual(got.scriptTargets, ['ch1']);
  assert.equal(got.hasWork, true);
});

test('runAudienceBackfillStep: 영구 제약 건너뛰기는 통과시키고 시스템 전체 실패는 오류를 던진다', async () => {
  const okResult = await runAudienceBackfillStep(
    {commentTargets: ['v1', 'v2'], scriptTargets: ['v3'], hasWork: true},
    async (path, {videoId}) => {
      if (path === '/api/insights/analyze' && videoId === 'v1') {
        throw new Error('영상(v1)의 댓글 기능이 비활성화되어 있습니다 (commentsDisabled).');
      }
      return {ok: true};
    },
  );
  assert.deepEqual(okResult.comment.done, ['v2']);
  assert.equal(okResult.comment.skipped.length, 1);
  assert.deepEqual(okResult.script.done, ['v3']);

  await assert.rejects(
    () => runAudienceBackfillStep(
      {commentTargets: ['v1'], scriptTargets: ['v2'], hasWork: true},
      async () => { throw new Error('Gemini API failed: 429'); },
    ),
    /댓글:.*429.*대본:.*429/,
  );
});

test('2026-11-12 새로 만든 화면도 매일 점검한다: 다음 기획 입력·리포트 목록·연출 자료집은 HTML 글자로 제목을 확인한다', () => {
  const paths = DASHBOARD_CHECKS.map((c) => c.path);
  for (const path of ['/api/next-input', '/next-input', '/outlier-reports', '/visual-library']) assert.ok(paths.includes(path), path + ' 점검이 없다');
  assert.equal(DASHBOARD_CHECKS.find((c) => c.path === '/visual-library').html, true);
  const got = dashboardApiProblems(resp({'/visual-library': {body: '<h1>오류</h1>'}}));
  assert.ok(got.some((p) => p.includes('/visual-library') && p.includes('비어')));
});
