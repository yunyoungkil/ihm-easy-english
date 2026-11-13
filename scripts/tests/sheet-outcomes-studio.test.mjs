import assert from 'node:assert/strict';
import test from 'node:test';
import {detailsFromStudio, metricsFromFirst7d, settleAll, studioWaitState} from '../sheet-outcomes.mjs';

// 2026-11-13: 롱폼은 스튜디오 첫 7일 값(노출·클릭률)이 들어온 뒤에 정산한다(값이 늦게 오면 그 영상의 클릭률 근거가 영영 빠지기 때문).
// 칸 이름은 실제 파일 그대로: video-lifetime.json first7d = {views, averageViewDuration, subscribersGained}, studio-first7d.json 기록 = {usable, impressions, clicks, ctrPercent}
const first7dApi = {startDate: '2026-02-01', endDate: '2026-02-07', views: 12, averageViewDuration: 80, subscribersGained: 1};
const studioOk = {usable: true, impressions: 140, clicks: 9, ctrPercent: 6.43};

test('정산 지표: 쓸 수 있는 스튜디오 값이 있으면 노출수·클릭률을 더하고, 없거나 쓸 수 없으면 세 지표만 낸다', () => {
  assert.deepEqual(metricsFromFirst7d(first7dApi), {views7d: 12, watchSeconds7d: 80, subs7d: 1});
  assert.deepEqual(metricsFromFirst7d(first7dApi, {...studioOk, usable: false}), {views7d: 12, watchSeconds7d: 80, subs7d: 1});
  assert.deepEqual(metricsFromFirst7d(first7dApi, studioOk), {views7d: 12, watchSeconds7d: 80, subs7d: 1, impressions7d: 140, ctr7d: 6.43});
  assert.equal(metricsFromFirst7d(first7dApi, {...studioOk, impressions: 0, ctrPercent: null}).ctr7d, null, '노출 0이면 클릭률을 0%로 적지 않는다');
  assert.deepEqual(detailsFromStudio(studioOk), {ctr7d: {clicks: 9, impressions: 140}});
  assert.deepEqual(detailsFromStudio(null), {});
});

test('정산 대기: 롱폼은 스튜디오 값을 기다리고, 31일이 지나거나 3번 실패하면 이유를 적고 클릭률 없이 정산한다. 쇼츠는 기다리지 않는다', () => {
  const now = new Date('2026-03-01T00:00:00Z');
  assert.equal(studioWaitState({format: 'LONGFORM', studio: null, publishedAt: '2026-02-20T00:00:00Z', now}).wait, true);
  const late = studioWaitState({format: 'LONGFORM', studio: null, publishedAt: '2026-01-20T00:00:00Z', now});
  assert.equal(late.wait, false);
  assert.match(late.note, /31일이 지남/);
  const failed = studioWaitState({format: 'LONGFORM', studio: null, failure: {attempts: 3, reason: '로그인'}, publishedAt: '2026-02-25T00:00:00Z', now});
  assert.equal(failed.wait, false);
  assert.match(failed.note, /측정 못 함/);
  assert.equal(studioWaitState({format: 'SHORTS', studio: null, publishedAt: '2026-02-28T00:00:00Z', now}).wait, false);
  assert.match(studioWaitState({format: 'LONGFORM', studio: {usable: false, unusableReason: '창 불일치'}, now}).note, /기준선에 쓰지 못함: 창 불일치/);
});

test('정산: 롱폼은 스튜디오 값이 오기 전에는 기록하지 않고, 값이 오면 노출수·클릭률 근거가 함께 기록된다', () => {
  const sheet = () => ({sourceVideoId: 'S', status: 'published', testVariables: [], results: [], borrowed: [{what: '철자 카드'}]});
  const outcomes = [{videoId: 'L1', format: 'LONGFORM', publishedAt: '2026-02-20T00:00:00Z', sources: {transformSheet: 'S'}}];
  const lifetime = {L1: {first7d: first7dApi}};
  const base = {outcomes, lifetime, baselines: {formats: {}}, catalog: [], now: new Date('2026-03-01T00:00:00Z')};
  assert.equal(settleAll({...base, sheets: [sheet()], studio: {}}).settled, 0, '값을 기다린다');
  const r = settleAll({...base, sheets: [sheet()], studio: {L1: studioOk}});
  assert.equal(r.settled, 1);
  const log = r.updated[0].borrowed[0].evidenceLog;
  assert.deepEqual(log.map((e) => e.metric).sort(), ['ctr7d', 'impressions7d', 'subs7d', 'views7d', 'watchSeconds7d']);
  const ctr = log.find((e) => e.metric === 'ctr7d');
  assert.equal(ctr.value, 6.43);
  assert.equal(ctr.views, 140, '클릭률의 표본 수는 조회가 아니라 노출이다');
  assert.equal(ctr.lowSample, true, '노출 140회는 1,000회 미만');
  assert.equal(log.find((e) => e.metric === 'views7d').views, 12);
  const shorts = [{videoId: 'S1', format: 'SHORTS', publishedAt: '2026-02-20T00:00:00Z', sources: {transformSheet: 'S'}}];
  assert.equal(settleAll({...base, outcomes: shorts, lifetime: {S1: {first7d: first7dApi}}, sheets: [sheet()], studio: {}}).settled, 1, '쇼츠는 기다리지 않는다');
});
