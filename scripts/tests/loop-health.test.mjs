import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLoopHealth} from '../loop-health.mjs';

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

test('"통함" 판정이 났는데 성공 패턴에 기록이 없으면 문제(배운 것을 기록하지 않음)', () => {
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
