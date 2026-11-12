import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  DEFAULT_BACKFILL_PER_RUN,
  DEFAULT_ON_DEMAND_LIMIT,
  TEMP_FAILURE_COOLDOWN_MS,
  createSerialReportQueue,
  executeBacklogTargets,
  executeCommentReport,
  executeScriptReport,
  extractReportVideoIds,
  hasBatchSystemFailure,
  isPermanentAnalysisFailure,
  pickRecentMarketDemandSlice,
  selectOutlierReportBacklog,
} from '../outlier-report-backlog.mjs';
import {aiAnalysisFailed} from '../analyze-outlier-comments.mjs';
import {classifyTranscriptError} from '../analyze-competitor-script.mjs';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const marketDemandPath = join(projectDir, 'data', 'youtube', 'market-demand.json');

test('리포트 파일명에서 11자리 videoId를 정확히 뽑고 비관련 파일은 무시한다', () => {
  const ids = extractReportVideoIds([
    '영어_공부법_jWhCS0bE7RY.md',
    '[파닉스]_ZGFuGU1e3i8.md',
    'readme.md',
    'not-a-report.txt',
    'short_abc.md',
  ]);
  assert.deepEqual([...ids].sort(), ['ZGFuGU1e3i8', 'jWhCS0bE7RY']);
});

test('영구 실패(자막 꺼짐·자막 없음·비공개·댓글 차단)와 일시 실패(429·네트워크)를 구분한다', () => {
  assert.equal(isPermanentAnalysisFailure('자막 추출 실패 (v1): 업로더가 이 영상의 자막 기능을 꺼놔서 자막을 가져올 수 없습니다.'), true);
  assert.equal(isPermanentAnalysisFailure('자막 추출 실패 (v2): 이 영상에는 가져올 수 있는 자막이 없습니다.'), true);
  assert.equal(isPermanentAnalysisFailure('자막 추출 실패 (v3): 이 영상을 찾을 수 없습니다(비공개이거나 삭제됐을 수 있습니다).'), true);
  assert.equal(isPermanentAnalysisFailure('YouTube Comment API failed (403): commentsDisabled'), true);

  assert.equal(isPermanentAnalysisFailure('Gemini API (gemini-2.5-flash) failed: 429 quota exceeded'), false);
  assert.equal(isPermanentAnalysisFailure('Gemini 댓글 분석이 결과를 돌려주지 않았습니다(쿼터·응답 형식 문제일 수 있음).'), false);
  assert.equal(isPermanentAnalysisFailure('fetch failed'), false);
  assert.equal(isPermanentAnalysisFailure(''), false);
});

test('byKeyword와 trackedChannels 양쪽에서 미분석 아웃라이어를 배수 내림차순·중복 제거해 고른다', () => {
  const md = {
    byKeyword: [
      {
        keyword: '영어공부법',
        topOutliers: [
          {videoId: 'kwHigh11111', outlierRatio: 143},
          {videoId: 'shared11111', outlierRatio: 25},
        ],
      },
    ],
    trackedChannels: [
      {
        channelId: 'UC1',
        status: 'candidate',
        topOutliers: [
          {videoId: 'chMid111111', outlierRatio: 40},
          {videoId: 'shared11111', outlierRatio: 25},
        ],
      },
      {
        channelId: 'UC_blocked',
        status: 'blocked',
        topOutliers: [{videoId: 'blocked1111', outlierRatio: 999}],
      },
      {
        channelId: 'UC_grad',
        status: 'graduated',
        topOutliers: [{videoId: 'grad1111111', outlierRatio: 888}],
      },
    ],
  };

  const result = selectOutlierReportBacklog(md, {
    existingCommentIds: new Set(['kwHigh11111']),
    existingScriptIds: new Set(['chMid111111']),
    limit: 3,
  });

  assert.deepEqual(result.commentTargets, ['chMid111111', 'shared11111']);
  assert.deepEqual(result.scriptTargets, ['kwHigh11111', 'shared11111']);
});

test('차단·졸업 채널의 영상이 byKeyword에도 들어 있으면 자동 분석 대상에서 제외한다', () => {
  const md = {
    byKeyword: [
      {keyword: 'k1', topOutliers: [{videoId: 'blocked1111', outlierRatio: 200}, {videoId: 'ok111111111', outlierRatio: 10}]},
    ],
    trackedChannels: [
      {channelId: 'UC_blocked', status: 'blocked', topOutliers: [{videoId: 'blocked1111', outlierRatio: 200}]},
    ],
  };

  const result = selectOutlierReportBacklog(md, {limit: 5});
  assert.deepEqual(result.commentTargets, ['ok111111111']);
  assert.deepEqual(result.scriptTargets, ['ok111111111']);
});

test('영구 실패한 종류만 건너뛰고, 일시 실패는 쿨다운 기간 후에만 다시 시도한다', () => {
  const now = new Date('2026-11-12T12:00:00Z');
  const recentFail = new Date(now.getTime() - 2 * 3600 * 1000).toISOString();
  const oldFail = new Date(now.getTime() - TEMP_FAILURE_COOLDOWN_MS - 60000).toISOString();

  const md = {
    byKeyword: [
      {
        keyword: 'k1',
        topOutliers: [
          {videoId: 'noSubs11111', outlierRatio: 100},
          {videoId: 'tempRecent1', outlierRatio: 80},
          {videoId: 'tempOld1111', outlierRatio: 60},
        ],
      },
    ],
  };

  const failures = {
    noSubs11111: {
      script: {message: '자막 추출 실패 (noSubs11111): 이 영상에는 가져올 수 있는 자막이 없습니다.', failedAt: oldFail},
    },
    tempRecent1: {
      comment: {message: 'Gemini API failed: 429', failedAt: recentFail},
    },
    tempOld1111: {
      comment: {message: 'Gemini API failed: 429', failedAt: oldFail},
    },
  };

  const result = selectOutlierReportBacklog(md, {failures, now, limit: 5});
  // noSubs11111은 대본은 영구 건너뜀, 댓글은 정상 대상
  assert.deepEqual(result.commentTargets, ['noSubs11111', 'tempOld1111']);
  assert.deepEqual(result.scriptTargets, ['tempRecent1', 'tempOld1111']);
});

test('빈 데이터나 null 입력에서도 오류 없이 빈 목록을 돌려준다', () => {
  assert.deepEqual(selectOutlierReportBacklog(null), {commentTargets: [], scriptTargets: []});
  assert.deepEqual(selectOutlierReportBacklog({byKeyword: [], trackedChannels: []}), {commentTargets: [], scriptTargets: []});
  assert.equal(DEFAULT_BACKFILL_PER_RUN, 3);
  assert.equal(DEFAULT_ON_DEMAND_LIMIT, 3);
});

test('배치 실행기: 자막 없음 같은 영구 실패는 skipped로 넘기고 다른 영상은 계속 처리한다', async () => {
  const res = await executeBacklogTargets(['v1', 'v2', 'v3'], async (vid) => {
    if (vid === 'v1') throw new Error('자막 추출 실패 (v1): 업로더가 이 영상의 자막 기능을 꺼놔서 자막을 가져올 수 없습니다.');
    if (vid === 'v2') throw new Error('fetch failed');
  });
  assert.deepEqual(res.done, ['v3']);
  assert.equal(res.skipped.length, 1);
  assert.equal(res.skipped[0].videoId, 'v1');
  assert.equal(res.failed.length, 1);
  assert.equal(res.failed[0].videoId, 'v2');
  assert.equal(hasBatchSystemFailure(res), false);

  const allSkipped = await executeBacklogTargets(['v1'], async () => {
    throw new Error('자막 추출 실패 (v1): 이 영상에는 가져올 수 있는 자막이 없습니다.');
  });
  assert.equal(hasBatchSystemFailure(allSkipped), false);

  const allFailed = await executeBacklogTargets(['v1'], async () => {
    throw new Error('Gemini API failed: 429');
  });
  assert.equal(hasBatchSystemFailure(allFailed), true);
});

test('실제 market-demand.json에서 고른 백필 대상에는 이미 리포트가 있는 영상이 포함되지 않는다', {skip: !existsSync(marketDemandPath) && 'market-demand.json 없음'}, () => {
  const md = JSON.parse(readFileSync(marketDemandPath, 'utf8').replace(/^\uFEFF/, ''));
  const existingCommentIds = extractReportVideoIds(
    existsSync(join(projectDir, 'output', 'insights')) ? readdirSync(join(projectDir, 'output', 'insights')) : [],
  );
  const existingScriptIds = extractReportVideoIds(
    existsSync(join(projectDir, 'output', 'script-insights')) ? readdirSync(join(projectDir, 'output', 'script-insights')) : [],
  );
  const picked = selectOutlierReportBacklog(md, {
    existingCommentIds,
    existingScriptIds,
    limit: DEFAULT_BACKFILL_PER_RUN,
  });
  assert.ok(picked.commentTargets.every((id) => !existingCommentIds.has(id)));
  assert.ok(picked.scriptTargets.every((id) => !existingScriptIds.has(id)));
  assert.ok(picked.commentTargets.length <= DEFAULT_BACKFILL_PER_RUN);
  assert.ok(picked.scriptTargets.length <= DEFAULT_BACKFILL_PER_RUN);
});

test('pickRecentMarketDemandSlice: 방금 갱신된 키워드·채널만 추리고 차단·졸업 정보는 유지한다', () => {
  const md = {
    byKeyword: [
      {keyword: 'oldKw', analyzedAt: '2026-11-01T00:00:00Z', topOutliers: [{videoId: 'oldVid11111', outlierRatio: 999}]},
      {keyword: 'newKw', analyzedAt: '2026-11-12T05:00:05Z', topOutliers: [{videoId: 'newVid11111', outlierRatio: 20}, {videoId: 'blockedVid1', outlierRatio: 300}]},
    ],
    trackedChannels: [
      {channelId: 'UC_old', status: 'candidate', analyzedAt: '2026-11-01T00:00:00Z', topOutliers: [{videoId: 'oldCh111111', outlierRatio: 500}]},
      {channelId: 'UC_blocked', status: 'blocked', analyzedAt: '2026-11-01T00:00:00Z', topOutliers: [{videoId: 'blockedVid1', outlierRatio: 300}]},
      {channelId: 'UC_new', status: 'candidate', analyzedAt: '2026-11-12T05:00:06Z', topOutliers: [{videoId: 'newChVid111', outlierRatio: 30}]},
    ],
  };

  const slice = pickRecentMarketDemandSlice(md, Date.parse('2026-11-12T05:00:00Z'));
  const picked = selectOutlierReportBacklog(slice, {limit: 5});
  assert.deepEqual(picked.commentTargets, ['newChVid111', 'newVid11111']);
  assert.deepEqual(picked.scriptTargets, ['newChVid111', 'newVid11111']);
});

test('직렬 리포트 큐: 동시 호출을 직렬 실행하고 같은 키는 중복 실행하지 않으며 실패 후에도 다음 작업을 이어간다', async () => {
  const queue = createSerialReportQueue();
  const events = [];
  let active = 0;
  let maxActive = 0;

  const t1 = queue.enqueue('comment:v1', async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    events.push('start:v1');
    await new Promise((r) => setTimeout(r, 15));
    events.push('end:v1');
    active -= 1;
    return 'res-v1';
  });
  const t1Dup = queue.enqueue('comment:v1', async () => {
    events.push('dup-should-not-run');
    return 'dup';
  });
  const t2Fail = queue.enqueue('script:v2', async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    events.push('fail:v2');
    active -= 1;
    throw new Error('boom');
  });
  const t3 = queue.enqueue('comment:v3', async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    events.push('run:v3');
    active -= 1;
    return 'res-v3';
  });

  assert.equal(t1.joined, false);
  assert.equal(t1Dup.joined, true);
  assert.equal(await t1.promise, 'res-v1');
  assert.equal(await t1Dup.promise, 'res-v1');
  await assert.rejects(t2Fail.promise, /boom/);
  assert.equal(await t3.promise, 'res-v3');
  assert.equal(maxActive, 1);
  assert.deepEqual(events, ['start:v1', 'end:v1', 'fail:v2', 'run:v3']);
  assert.equal(queue.pendingSize(), 0);

  // 완료된 키는 이후 다시 적재 가능해야 한다
  const t1Again = queue.enqueue('comment:v1', async () => 'res-v1-again');
  assert.equal(t1Again.joined, false);
  assert.equal(await t1Again.promise, 'res-v1-again');
});

test('리포트 큐 우선순위 및 방어 경계: 수동 요청(high)이 자동 백그라운드(low)보다 먼저 실행되고 음수/0 한도를 방어한다', async () => {
  const queue = createSerialReportQueue();
  const order = [];
  let markFirstStarted;
  const firstStarted = new Promise((r) => { markFirstStarted = r; });
  let releaseFirst;
  const firstGate = new Promise((r) => { releaseFirst = r; });

  const t1 = queue.enqueue('k1', async () => {
    order.push(1);
    markFirstStarted();
    await firstGate;
  });
  await firstStarted;
  const tLowA = queue.enqueue('kLowA', async () => { order.push('lowA'); }, {priority: 'low'});
  const tLowB = queue.enqueue('kLowB', async () => { order.push('lowB'); }, {priority: 'low'});
  // 대기 중인 low 작업을 high로 재요청하면 앞으로 승격된다
  const tLowBPromoted = queue.enqueue('kLowB', async () => { order.push('dup'); }, {priority: 'high'});
  const tHigh = queue.enqueue('kHigh', async () => { order.push('high'); }, {priority: 'high'});

  assert.equal(tLowBPromoted.joined, true);
  releaseFirst();
  await Promise.all([t1.promise, tLowA.promise, tLowB.promise, tLowBPromoted.promise, tHigh.promise]);
  assert.deepEqual(order, [1, 'lowB', 'high', 'lowA']);

  const md = {byKeyword: [{keyword: 'k', topOutliers: [{videoId: 'abc12345678', outlierRatio: 10}]}]};
  assert.deepEqual(selectOutlierReportBacklog(md, {limit: 0}), {commentTargets: [], scriptTargets: []});
  assert.deepEqual(selectOutlierReportBacklog(md, {limit: -3}), {commentTargets: [], scriptTargets: []});

  const mdFormatBlocked = {
    byKeyword: [{keyword: 'k', topOutliers: [{videoId: 'shortBlocked', outlierRatio: 99}]}],
    trackedChannels: [{
      channelId: 'UCb',
      status: 'blocked',
      topOutliers: [],
      topOutliersByFormat: {short: [{videoId: 'shortBlocked', outlierRatio: 99}]},
    }],
  };
  assert.deepEqual(selectOutlierReportBacklog(mdFormatBlocked), {commentTargets: [], scriptTargets: []});
});

test('자막 오류 분류: RequestBlocked/IP 차단/429는 일시 오류로 남기고 자막 꺼짐·없음·비공개만 영구 실패로 분류한다', () => {
  const ipBlocked = classifyTranscriptError(
    'Could not retrieve a transcript for the video abc! YouTube is blocking requests from your IP.',
    'RequestBlocked',
  );
  assert.equal(isPermanentAnalysisFailure(ipBlocked), false);

  const req429 = classifyTranscriptError('Could not retrieve a transcript: Too Many Requests (429)');
  assert.equal(isPermanentAnalysisFailure(req429), false);

  const disabled = classifyTranscriptError('Subtitles are disabled for this video', 'TranscriptsDisabled');
  assert.equal(isPermanentAnalysisFailure(disabled), true);

  const missing = classifyTranscriptError('No transcripts were found for any of the requested language codes', 'NoTranscriptFound');
  assert.equal(isPermanentAnalysisFailure(missing), true);

  const unavail = classifyTranscriptError('The video is no longer available', 'VideoUnavailable');
  assert.equal(isPermanentAnalysisFailure(unavail), true);
});

test('executeCommentReport: 비공개·댓글차단·빈댓글은 .md를 쓰지 않고 실패를 던져 배치 시스템 장애 은폐를 막는다', async () => {
  const failures = [];
  const saved = [];
  const notified = [];

  const baseDeps = {
    ytKey: 'yt',
    geminiKey: 'gm',
    analyzeCommentsWithGemini: async () => ({painPoints: ['p1']}),
    aiAnalysisFailed,
    generateMarkdownReport: () => '# md',
    formatInsightText: (x) => String(x),
    saveCommentFiles: async (item) => { saved.push(item); },
    recordAnalysisFailure: async (vid, kind, msg) => { failures.push({vid, kind, msg}); },
    clearAnalysisFailure: async () => {},
    notifyClients: (ev, data) => { notified.push({ev, data}); },
  };

  // 1) 비공개/삭제 영상은 null 반환 대신 예외를 던져 executeBacklogTargets가 skipped로 분류해야 한다
  const batch = await executeBacklogTargets(['privVid1111', 'quotaVid111'], async (vid) => {
    if (vid === 'privVid1111') {
      return executeCommentReport(vid, {
        ...baseDeps,
        fetchVideoDetails: async () => null,
        fetchComments: async () => [],
      });
    }
    return executeCommentReport(vid, {
      ...baseDeps,
      fetchVideoDetails: async () => ({videoId: vid, title: 'T', channelTitle: 'C'}),
      fetchComments: async () => [{text: 'c1'}],
      analyzeCommentsWithGemini: async () => null,
    });
  });
  assert.equal(batch.done.length, 0);
  assert.equal(batch.skipped.length, 1);
  assert.equal(batch.skipped[0].videoId, 'privVid1111');
  assert.equal(batch.failed.length, 1);
  assert.equal(hasBatchSystemFailure(batch), true);

  // 2) commentsDisabled와 댓글 0개도 빈 .md 파일을 만들지 않고 실패 처리한다
  await assert.rejects(
    () => executeCommentReport('disabledVid', {
      ...baseDeps,
      fetchVideoDetails: async () => ({videoId: 'disabledVid', title: 'T', channelTitle: 'C'}),
      fetchComments: async () => { throw new Error('영상(disabledVid)의 댓글 기능이 비활성화되어 있습니다 (commentsDisabled).'); },
    }),
    /commentsDisabled/,
  );
  await assert.rejects(
    () => executeCommentReport('zeroComments', {
      ...baseDeps,
      fetchVideoDetails: async () => ({videoId: 'zeroComments', title: 'T', channelTitle: 'C'}),
      fetchComments: async () => [],
    }),
    /수집된 댓글이 없어/,
  );

  assert.equal(saved.length, 0);
  assert.equal(notified.length, 0);
  assert.ok(failures.some((f) => f.vid === 'disabledVid' && isPermanentAnalysisFailure(f.msg)));
  assert.ok(failures.some((f) => f.vid === 'zeroComments' && !isPermanentAnalysisFailure(f.msg)));
});

test('executeScriptReport & 삭제 중단 가드: Gemini 실패 시 리포트 미저장, 중간 삭제 시 산출물·실패기록을 남기지 않는다', async () => {
  const recorded = [];
  const cleared = [];
  const notified = [];

  await assert.rejects(
    () => executeScriptReport('scriptFail1', {
      ytKey: 'yt',
      geminiKey: 'gm',
      analyzeSingleScript: async () => { throw new Error('Gemini 대본 분석 실패: 429'); },
      recordAnalysisFailure: async (vid, kind, msg) => { recorded.push({vid, kind, msg}); },
      clearAnalysisFailure: async (vid, kind) => { cleared.push({vid, kind}); },
      notifyClients: (ev, d) => { notified.push({ev, d}); },
    }),
    /429/,
  );
  assert.equal(recorded.length, 1);
  assert.equal(isPermanentAnalysisFailure(recorded[0].msg), false);

  // 작업 도중 사용자가 키워드/영상을 삭제해 shouldAbort가 true를 돌리면 실패 기록·알림·저장을 모두 건너뛴다
  const aborted = await executeScriptReport('deletedMid1', {
    ytKey: 'yt',
    geminiKey: 'gm',
    shouldAbort: () => true,
    analyzeSingleScript: async (_vid, opts) => (opts.shouldAbortWrite?.() ? null : {ok: true}),
    recordAnalysisFailure: async (vid, kind, msg) => { recorded.push({vid, kind, msg}); },
    clearAnalysisFailure: async (vid, kind) => { cleared.push({vid, kind}); },
    notifyClients: (ev, d) => { notified.push({ev, d}); },
  });
  assert.equal(aborted, null);
  assert.equal(recorded.length, 1);
  assert.equal(cleared.length, 0);
  assert.equal(notified.length, 0);
});
