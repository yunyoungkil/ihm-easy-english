import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLoopHealth, diagnoseWorkflowLoop} from '../loop-health.mjs';
import {buildBriefingContext} from '../growth-rules.mjs';

const now = new Date('2026-11-20T12:00:00Z');
const hoursAgo = (h) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d) => hoursAgo(d * 24);

const healthy = () => ({
  now,
  dailyLoop: {finishedAt: hoursAgo(7), steps: {server: {ok: true}, sync: {ok: true}, tests: {ok: true, result: {unit: '234/234', client: 'pass'}}}},
  analyticsSyncedAt: hoursAgo(7),
  catalogVideos: [{videoId: 'A', publishedAt: daysAgo(20), privacyStatus: 'public'}],
  views7d: {A: {views7d: 1200}},
  audienceDnaUpdatedAt: daysAgo(5),
  competitorsAnalyzedAt: daysAgo(3),
  episodeOutcomes: [],
  successPatternIds: [],
  episodesMissingSources: [],
});
const ids = (r) => r.problems.map((p) => p.id);

test('모두 정상이면 문제가 없다', () => {
  const r = checkLoopHealth(healthy());
  assert.equal(r.ok, true);
  assert.deepEqual(r.problems, []);
});

test('매일 루프 기록이 없거나 36시간 넘게 안 돌았으면 문제', () => {
  assert.deepEqual(ids(checkLoopHealth({...healthy(), dailyLoop: null})), ['loop-ran']);
  assert.deepEqual(ids(checkLoopHealth({...healthy(), dailyLoop: {...healthy().dailyLoop, finishedAt: hoursAgo(37)}})), ['loop-ran']);
});

test('루프 단계가 실패했으면 단계 이름과 오류를 알린다', () => {
  const dl = {finishedAt: hoursAgo(7), steps: {sync: {ok: true}, audience: {ok: false, error: 'Gemini 404'}}};
  const r = checkLoopHealth({...healthy(), dailyLoop: dl});
  assert.deepEqual(ids(r), ['loop-step']);
  assert.match(r.problems[0].text, /audience/);
  assert.match(r.problems[0].text, /Gemini 404/);
});

test('테스트나 화면 검사가 실패했으면 문제', () => {
  const dl = {finishedAt: hoursAgo(7), steps: {tests: {ok: false, error: '단위 테스트 2개 실패'}}};
  assert.deepEqual(ids(checkLoopHealth({...healthy(), dailyLoop: dl})), ['loop-step']);
});

test('동기화가 36시간보다 오래됐으면 문제', () => {
  assert.deepEqual(ids(checkLoopHealth({...healthy(), analyticsSyncedAt: hoursAgo(40)})), ['sync-stale']);
});

test('공개 12일이 지났는데 7일 조회가 없는 공개 영상이 있으면 문제(예약 영상은 빼고)', () => {
  const catalogVideos = [
    {videoId: 'A', publishedAt: daysAgo(20), privacyStatus: 'public'},
    {videoId: 'B', publishedAt: daysAgo(13), privacyStatus: 'public'},
    {videoId: 'C', publishedAt: daysAgo(11), privacyStatus: 'public'},
    {videoId: 'P', publishedAt: daysAgo(30), privacyStatus: 'private'},
  ];
  const r = checkLoopHealth({...healthy(), catalogVideos});
  assert.deepEqual(ids(r), ['views7d-gap']);
  assert.match(r.problems[0].text, /1편/);
});

test('시청자 고민 21일·경쟁 채널 10일보다 오래되면 문제', () => {
  assert.deepEqual(ids(checkLoopHealth({...healthy(), audienceDnaUpdatedAt: daysAgo(22)})), ['audience-stale']);
  assert.deepEqual(ids(checkLoopHealth({...healthy(), competitorsAnalyzedAt: daysAgo(11)})), ['competitors-stale']);
});

test('"통함" 판정이 났는데 통한 요소 기록에 기록이 없으면 문제(배운 것을 기록하지 않음)', () => {
  const episodeOutcomes = [{label: 'EP24 쇼츠', videoId: 'V', verdict: 'worked', ratio: 1.8}, {label: 'EP25', videoId: 'W', verdict: 'hold'}];
  const r = checkLoopHealth({...healthy(), episodeOutcomes});
  assert.deepEqual(ids(r), ['pattern-gap']);
  assert.match(r.problems[0].text, /EP24 쇼츠/);
  assert.equal(checkLoopHealth({...healthy(), episodeOutcomes, successPatternIds: ['V']}).ok, true);
});

test('기획 근거 칸이 빠진 새 편(EP30부터)이 있으면 문제', () => {
  const r = checkLoopHealth({...healthy(), episodesMissingSources: ['ep30-th-sound']});
  assert.deepEqual(ids(r), ['brief-sources']);
  assert.match(r.problems[0].text, /ep30-th-sound/);
});

test('다음 기획 입력 파일이 하루 넘게 안 만들어졌으면 문제', () => {
  assert.equal(checkLoopHealth({...healthy(), nextInputGeneratedAt: hoursAgo(7)}).ok, true);
  const r = checkLoopHealth({...healthy(), nextInputGeneratedAt: hoursAgo(50)});
  assert.deepEqual(ids(r), ['next-input-stale']);
  assert.deepEqual(ids(checkLoopHealth({...healthy(), nextInputGeneratedAt: null})), ['next-input-stale']);
});

test('기획 근거에 "다음 기획 입력" 인용이 없는 새 편(EP30부터)이 있으면 문제', () => {
  const r = checkLoopHealth({...healthy(), episodesMissingInputRef: ['ep30-th-sound']});
  assert.deepEqual(ids(r), ['brief-input']);
  assert.match(r.problems[0].text, /ep30-th-sound/);
});

test('합친 리포트가 예전 리포트 영상을 다 따라잡았는데 예전 리포트 파일이 남아 있으면 지울 차례라고 알린다', () => {
  const loop = (catchUp) => ({...healthy().dailyLoop, outlierReportCatchUp: catchUp});
  assert.equal(checkLoopHealth({...healthy(), dailyLoop: loop(4), oldReportFiles: 49}).ok, true, '따라잡는 중');
  assert.deepEqual(ids(checkLoopHealth({...healthy(), dailyLoop: loop(0), oldReportFiles: 49})), ['old-reports-done']);
  assert.equal(checkLoopHealth({...healthy(), dailyLoop: loop(0), oldReportFiles: 0}).ok, true, '이미 지움');
  assert.equal(checkLoopHealth({...healthy(), dailyLoop: loop(undefined), oldReportFiles: 49}).ok, true, '아직 기록 없음');
});

test('스튜디오 조사 목록: 파일이 없으면 아무것도 띄우지 않고, 3일 넘게 오래되면 research-stale', () => {
  assert.deepEqual(ids(checkLoopHealth({...healthy(), studioResearch: null})), []);
  assert.deepEqual(ids(checkLoopHealth({...healthy(), studioResearch: {updatedAt: daysAgo(1), runs: []}})), []);
  assert.deepEqual(ids(checkLoopHealth({...healthy(), studioResearch: {updatedAt: daysAgo(4), runs: []}})), ['research-stale']);
});

test('스튜디오 조사 목록: 한 형식의 통과 후보가 3일 연속 0이면 research-thin', () => {
  const run = (date, format, passed) => ({date, format, passed});
  const days = ['2026-11-18', '2026-11-19', '2026-11-20'];
  const thin = {updatedAt: hoursAgo(5), runs: days.flatMap((d) => [run(d, 'LONGFORM', 4), run(d, 'SHORTS', 0)])};
  const r = checkLoopHealth({...healthy(), studioResearch: thin});
  assert.deepEqual(ids(r), ['research-thin']);
  assert.match(r.problems[0].text, /SHORTS/);
  const short = {updatedAt: hoursAgo(5), runs: days.slice(1).map((d) => run(d, 'SHORTS', 0))};
  assert.deepEqual(ids(checkLoopHealth({...healthy(), studioResearch: short})), []);
  const recovered = {updatedAt: hoursAgo(5), runs: [run(days[0], 'SHORTS', 0), run(days[1], 'SHORTS', 2), run(days[2], 'SHORTS', 0)]};
  assert.deepEqual(ids(checkLoopHealth({...healthy(), studioResearch: recovered})), []);
});

test('diagnoseWorkflowLoop: 자동 루프 고장이 있으면 1순위로 진단하고 수정안을 제시한다', () => {
  const d = diagnoseWorkflowLoop({
    now,
    loopHealth: {ok: false, problems: [{id: 'sync-stale', text: '유튜브 동기화가 40시간 안 됐다'}]},
    studioResearch: {runs: [{date: '2026-11-19'}], candidates: {a: {}}},
  });
  assert.equal(d.severity, 'urgent');
  assert.match(d.area, /sync-stale/);
  assert.match(d.finding, /40시간/);
  assert.ok(d.proposal.length > 0);
});

test('diagnoseWorkflowLoop: 고장이 없으면 실제 데이터 업그레이드 후보 중 하루 1건씩 돌아가며 제시하고 브리핑 문장에 들어간다', () => {
  const input = {
    loopHealth: {ok: true, problems: []},
    dailyLoop: {outlierReportCatchUp: 1},
    studioResearch: {runs: [{date: '2026-11-18'}, {date: '2026-11-19'}], candidates: {a: {}, b: {}}},
    outlierReports: [{videoId: 'v1', ratioMethod: null, analysis: {}}],
    transformSheets: [{sourceVideoId: 's1', status: 'approved', results: []}],
    koreanTrends: null,
  };
  const d1 = diagnoseWorkflowLoop({...input, now: new Date('2026-11-19T12:00:00Z')});
  const d2 = diagnoseWorkflowLoop({...input, now: new Date('2026-11-20T12:00:00Z')});
  assert.equal(d1.severity, 'upgrade');
  assert.equal(d1.candidateCount, 4);
  assert.notEqual(d1.area, d2.area, '날짜가 바뀌면 다른 워크플로우 지점을 1건씩 순환 진단한다');

  const ctx = buildBriefingContext({briefing: {data: {}, workflowDiagnosis: d1}}, []);
  assert.ok(ctx.includes(`- 루프 진단 (1건): [${d1.area}]`), '브리핑 문맥에 루프 진단 1건 줄이 포함된다');
  assert.ok(ctx.includes('수정·업그레이드안:'));
});

test('diagnoseWorkflowLoop: 모든 항목이 정상·최신이면 healthy 상태로 다음 점검안을 돌려준다', () => {
  const d = diagnoseWorkflowLoop({
    now,
    loopHealth: {ok: true, problems: []},
    studioResearch: null,
    outlierReports: [{videoId: 'v1', ratioMethod: 'peer-median-views-v2', analysis: {teachesAdultEnglishSounds: true}}],
    transformSheets: [{sourceVideoId: 's1', status: 'published', results: [{videoId: 'x'}]}],
    koreanTrends: {sources: {googleTrendsKr: {ok: true}, youtubePopularKr: {ok: true}}},
  });
  assert.equal(d.severity, 'healthy');
  assert.equal(d.candidateCount, 0);
});
