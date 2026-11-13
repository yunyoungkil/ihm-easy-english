// 비교 시트 결과 기록(scripts/sheet-outcomes.mjs): 첫 7일 수치가 생기면 시트 results와 borrowed[].evidenceLog에 더한다.
import assert from 'node:assert/strict';
import test from 'node:test';
import {computeBaselines} from '../baseline.mjs';
import {evidenceHtml, renderTransformSheetPage} from '../outlier-report-view.mjs';
import {metricsFromFirst7d, settleAll, settleSheet} from '../sheet-outcomes.mjs';
import {evidenceProblems} from '../transform-sheet.mjs';

const video = (id, format) => ({videoId: id, title: `t-${id}`, publishedAt: '2026-01-01T00:00:00Z', format, durationSeconds: 50});
const f7 = (views, averageViewDuration, subscribersGained) => ({first7d: {views, averageViewDuration, subscribersGained}});
const ids = ['s0', 's1', 's2', 's3', 's4'];
const baselines = computeBaselines({
  catalog: ids.map((id) => video(id, 'SHORTS')),
  views7d: Object.fromEntries(ids.map((id, i) => [id, {views7d: [100, 200, 300, 400, 1000][i]}])),
  lifetime: Object.fromEntries(ids.map((id, i) => [id, f7([100, 200, 300, 400, 1000][i], [10, 12, 14, 16, 18][i], [0, 0, 1, 0, 3][i])])),
});
const sheet = () => ({
  sourceVideoId: 'AAAAAAAAAAA', topic: 't', status: 'published', format: 'SHORTS',
  testVariables: [{variable: '훅 유형', hypothesis: 'h', measure: '조회수'}],
  borrowed: [{fromVideoId: 'BBBBBBBBBBB', what: '철자 카드 넘기기', reason: 'r', evidence: 'e'}, {fromVideoId: 'CCCCCCCCCCC', what: '3초 컷', reason: 'r', evidence: 'e'}],
});
const metrics = {views7d: 1400, watchSeconds7d: 10, subs7d: 3}; // 조회수만 갱신 기준(1000×400/300=1333.3) 초과, 구독 3은 기준선 3과 같아 기준선 이하

test('metricsFromFirst7d: 실제 first7d 칸 이름(views, averageViewDuration, subscribersGained)을 세 지표로 옮기고, 없으면 null', () => {
  assert.deepEqual(metricsFromFirst7d({views: 5, averageViewDuration: 21, subscribersGained: 0}), {views7d: 5, watchSeconds7d: 21, subs7d: 0});
  assert.equal(metricsFromFirst7d(undefined), null);
});

test('settleSheet: 결과와 가져온 것마다 근거 기록을 더하고, 시험 변수 이름을 함께 적고, 공개된 시트는 성적(outcome)도 채운다', () => {
  const now = new Date('2026-11-20T00:00:00Z');
  const {sheet: s, changed} = settleSheet({sheet: sheet(), videoId: 'VID', format: 'SHORTS', metrics, baselines, now});
  assert.equal(changed, true);
  assert.equal(s.results.length, 1);
  assert.equal(s.results[0].summary, '갱신 기준을 넘은 지표: 공개 7일 조회수');
  for (const b of s.borrowed) {
    assert.equal(b.evidenceLog.length, 3, '지표 세 개');
    const views = b.evidenceLog.find((e) => e.metric === 'views7d');
    assert.deepEqual([views.date, views.videoId, views.value, views.result, views.variables], ['2026-11-20', 'VID', 1400, '갱신 기준 초과', ['훅 유형']]);
    assert.equal(b.evidenceLog.find((e) => e.metric === 'watchSeconds7d').result, '기준선 이하');
  }
  assert.equal(s.outcome.views7d, 1400);
  assert.deepEqual(evidenceProblems(s), [], '만든 기록은 근거 기록 규칙을 통과한다');
});

test('settleSheet: 같은 영상은 두 번 기록하지 않고, 갈아 끼우지 않고 더한다(옛 기록이 남는다)', () => {
  const first = settleSheet({sheet: sheet(), videoId: 'V1', format: 'SHORTS', metrics, baselines}).sheet;
  assert.equal(settleSheet({sheet: first, videoId: 'V1', format: 'SHORTS', metrics, baselines}).changed, false);
  const second = settleSheet({sheet: first, videoId: 'V2', format: 'SHORTS', metrics: {views7d: 5, watchSeconds7d: 5, subs7d: 0}, baselines}).sheet;
  assert.equal(second.results.length, 2);
  assert.equal(second.borrowed[0].evidenceLog.length, 6, '기록이 3개에서 6개로 늘었고 첫 영상의 기록이 그대로다');
  assert.ok(second.borrowed[0].evidenceLog.slice(0, 3).every((e) => e.videoId === 'V1'));
});

test('settleAll: BRIEF의 비교 시트 ID와 영상 ID가 맞고 첫 7일 수치가 있는 편만 기록한다', () => {
  const outcomes = [
    {videoId: 'VID', format: 'SHORTS', sources: {transformSheet: 'AAAAAAAAAAA'}},
    {videoId: 'NOFIRST', format: 'SHORTS', sources: {transformSheet: 'AAAAAAAAAAA'}}, // 첫 7일 수치 없음
    {videoId: 'OTHER', format: 'SHORTS', sources: {transformSheet: null}}, // 시트를 안 가리킴
  ];
  const lifetime = {VID: f7(1400, 10, 3), OTHER: f7(1, 1, 0)};
  const {updated, settled} = settleAll({outcomes, sheets: [sheet()], lifetime, baselines});
  assert.equal(settled, 1);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].results[0].videoId, 'VID');
});

test('근거 기록 규칙: 지표·결과가 정해진 말이 아니면 문제로 알린다', () => {
  const bad = sheet();
  bad.borrowed[0].evidenceLog = [{date: '2026-11-20', videoId: 'V', metric: 'views7d', value: 1, result: '성공'}];
  assert.ok(evidenceProblems(bad).some((x) => x.includes('정해진 말이 아니다')));
  bad.borrowed[0].evidenceLog = [{date: '2026-11-20', videoId: 'V', metric: 'ctr', value: 1, result: '기준선 이하'}];
  assert.ok(evidenceProblems(bad).some((x) => x.includes('지표')));
  assert.deepEqual(evidenceProblems(sheet()), []);
});

test('시트 화면: 근거 기록이 없으면 시험 전이라 밝히고, 있으면 날짜·영상·지표·값·결과·시험 변수를 보여 주며 글자는 이스케이프한다', () => {
  assert.ok(evidenceHtml({}).includes('아직 시험 전'));
  const s = settleSheet({sheet: sheet(), videoId: 'V<1>', format: 'SHORTS', metrics, baselines}).sheet;
  const html = evidenceHtml(s.borrowed[0]);
  assert.ok(html.includes('결과 기록 3건') && html.includes('조회수 1400 → 갱신 기준 초과') && html.includes('시험 변수: 훅 유형') && html.includes('V&lt;1&gt;'), html);
  const report = {videoId: 'AAAAAAAAAAA', meta: {title: '경쟁', channelTitle: '채널'}};
  const page = renderTransformSheetPage({...s, schemaVersion: 1, identityShare: {ours: 30, competitor: 70, reason: 'r'}, rows: []}, report, []);
  assert.ok(page.includes('결과 기록 (공개 7일 뒤 자동)') && page.includes('갱신 기준을 넘은 지표: 공개 7일 조회수'));
});
