// 비교 시트 결과 기록(scripts/sheet-outcomes.mjs): 첫 7일 수치가 생기면 시트 results와 borrowed[].evidenceLog에 더한다.
import assert from 'node:assert/strict';
import test from 'node:test';
import {computeBaselines, USUAL_RESULTS} from '../baseline.mjs';
import {evidenceHtml, renderTransformSheetPage} from '../outlier-report-view.mjs';
import {groupResultsByVariable, metricsFromFirst7d, settleAll, settleSheet} from '../sheet-outcomes.mjs';
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

const newVideo = {publishedAt: '2026-02-01T00:00:00Z', durationSeconds: 50}; // 기준선 영상들(2026-01-01)보다 뒤에 나온 영상

test('settleSheet: 결과와 가져온 것마다 근거 기록을 더하고, 시험 변수 이름을 함께 적고, 공개된 시트는 성적(outcome)도 채운다', () => {
  const now = new Date('2026-11-20T00:00:00Z');
  const {sheet: s, changed} = settleSheet({sheet: sheet(), videoId: 'VID', format: 'SHORTS', metrics, baselines, video: newVideo, now});
  assert.equal(changed, true);
  assert.equal(s.results.length, 1);
  assert.equal(s.results[0].summary, '갱신 기준을 넘은 지표: 공개 7일 조회수 · 좋은 점 후보 지표: 공개 7일 조회수, 공개 7일 구독 수');
  for (const b of s.borrowed) {
    assert.equal(b.evidenceLog.length, 3, '지표 세 개');
    const views = b.evidenceLog.find((e) => e.metric === 'views7d');
    // 이김·짐은 평소 대비(result), 기준선 판정은 옆 칸(baselineResult)
    assert.deepEqual([views.date, views.videoId, views.value, views.result, views.baselineResult, views.variables], ['2026-11-20', 'VID', 1400, USUAL_RESULTS[0], '갱신 기준 초과', ['훅 유형']]);
    assert.equal(views.usual, 300, '평소 = 먼저 나온 같은 형식 최근 영상의 중앙값');
    const watch = b.evidenceLog.find((e) => e.metric === 'watchSeconds7d');
    assert.equal(watch.result, USUAL_RESULTS[1]);
    assert.equal(watch.baselineResult, '기준선 이하');
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
  const s = settleSheet({sheet: sheet(), videoId: 'V<1>', format: 'SHORTS', metrics, baselines, video: newVideo}).sheet;
  const html = evidenceHtml(s.borrowed[0]);
  assert.ok(html.includes('결과 기록 3건') && html.includes(`조회수 1400 → ${USUAL_RESULTS[0]} · 기준선 판정: 갱신 기준 초과`) && html.includes('시험 변수: 훅 유형') && html.includes('V&lt;1&gt;'), html);
  const report = {videoId: 'AAAAAAAAAAA', meta: {title: '경쟁', channelTitle: '채널'}};
  const page = renderTransformSheetPage({...s, schemaVersion: 1, identityShare: {ours: 30, competitor: 70, reason: 'r'}, rows: []}, report, []);
  assert.ok(page.includes('결과 기록 (공개 7일 뒤 자동)') && page.includes('갱신 기준을 넘은 지표: 공개 7일 조회수'));
});

test('옛 기록(result에 기준선 판정이 들어 있던 것)도 규칙을 통과하고, 새 baselineResult가 정해진 말이 아니면 문제로 알린다', () => {
  const old = sheet();
  old.borrowed[0].evidenceLog = [{date: '2026-11-20', videoId: 'V', metric: 'views7d', value: 1, result: '기준선 이하'}];
  assert.deepEqual(evidenceProblems(old), []);
  old.borrowed[0].evidenceLog = [{date: '2026-11-20', videoId: 'V', metric: 'views7d', value: 1, result: USUAL_RESULTS[1], baselineResult: '성공'}];
  assert.ok(evidenceProblems(old).some((x) => x.includes('기준선 판정')));
});

test('settleAll: 카탈로그에서 공개일·영상 길이를 찾아 평소 대비 판정에 쓴다', () => {
  const outcomes = [{videoId: 'VID', format: 'SHORTS', sources: {transformSheet: 'AAAAAAAAAAA'}}];
  // 카탈로그는 "이 영상보다 먼저 나온 영상"의 출처이기도 하다(정산이 늦어도 자기 자신과 뒤 영상을 뺀 기준선으로 판정하려고)
  const earlier = ids.map((id) => video(id, 'SHORTS'));
  const catalog = [...earlier, {videoId: 'VID', publishedAt: newVideo.publishedAt, format: 'SHORTS', durationSeconds: newVideo.durationSeconds}];
  const lifetime = {...Object.fromEntries(ids.map((id, i) => [id, f7([100, 200, 300, 400, 1000][i], [10, 12, 14, 16, 18][i], [0, 0, 1, 0, 3][i])])), VID: f7(1400, 10, 3)};
  const {updated} = settleAll({outcomes, sheets: [sheet()], lifetime, baselines, catalog});
  assert.equal(updated[0].results[0].metrics.views7d.usualStatus, USUAL_RESULTS[0]);
  const none = settleAll({outcomes, sheets: [sheet()], lifetime: {VID: f7(1400, 10, 3)}, baselines}).updated[0];
  assert.equal(none.results[0].metrics.views7d.usualStatus, USUAL_RESULTS[3], '공개일을 모르면 평소 없음');
});

test('같은 시험 변수를 쓴 영상은 형식별로 묶어 세고, 좋은 점 후보·신뢰 하향 건수만 센다(판정은 하지 않는다)', () => {
  const a = settleSheet({sheet: sheet(), videoId: 'V1', format: 'SHORTS', metrics, baselines, video: newVideo}).sheet; // 조회수 1400: 후보
  const b = settleSheet({sheet: {...sheet(), sourceVideoId: 'DDDDDDDDDDD'}, videoId: 'V2', format: 'SHORTS', metrics: {views7d: 5, watchSeconds7d: 1, subs7d: 0}, baselines, video: newVideo}).sheet; // 조회수 5: 신뢰 하향
  const groups = groupResultsByVariable([a, b]);
  assert.equal(groups.length, 1);
  assert.deepEqual([groups[0].format, groups[0].variable, groups[0].videoCount, groups[0].goodCount, groups[0].lowCount], ['SHORTS', '훅 유형', 2, 1, 1]);
  assert.deepEqual(groupResultsByVariable([]), []);
});

// ─── Opus 코드 리뷰(2026-11-13) 반영 ───
import {MIN_VIEWS_7D} from '../planning-outcome.mjs';
import {USUAL_RULE} from '../baseline.mjs';

test('리뷰 A: 정산이 늦어 기준선에 이미 들어간 영상은 자기 자신과 그 뒤 영상을 뺀 기준선으로 판정한다', () => {
  const base = ids.map((id) => video(id, 'SHORTS'));
  const cat = [...base, {videoId: 'VID', publishedAt: '2026-02-01T00:00:00Z', format: 'SHORTS', durationSeconds: 50, title: 'v'}, {videoId: 'LATER', publishedAt: '2026-03-01T00:00:00Z', format: 'SHORTS', durationSeconds: 50, title: 'l'}];
  const lifetime = {...Object.fromEntries(ids.map((id, i) => [id, f7([100, 200, 300, 400, 1000][i], [10, 12, 14, 16, 18][i], [0, 0, 1, 0, 3][i])])), VID: f7(5000, 18, 0), LATER: f7(9000, 30, 9)};
  const views7d = Object.fromEntries(Object.entries(lifetime).map(([id, x]) => [id, {views7d: x.first7d.views}]));
  const fileBaselines = computeBaselines({catalog: cat, views7d, lifetime}); // baselines.json: 이미 VID와 LATER가 들어 있다
  assert.equal(fileBaselines.formats.SHORTS.metrics.views7d.champion.videoId, 'LATER');
  const outcomes = [{videoId: 'VID', format: 'SHORTS', publishedAt: '2026-02-01T00:00:00Z', sources: {transformSheet: 'AAAAAAAAAAA'}}];
  const {updated} = settleAll({outcomes, sheets: [sheet()], lifetime, baselines: fileBaselines, catalog: cat});
  const p = updated[0].results[0].metrics.views7d;
  assert.equal(p.baseline, 1000, '그 영상보다 먼저 나온 영상만으로 만든 기준선(1000)과 비교한다');
  assert.equal(p.status, '갱신 기준 초과', '5000 > 1000×(400/300)');
});

test('리뷰 E: 근거 기록에 영상의 첫 7일 조회·표본 작음 표시·평소와 길이 보정 여부를 남기고 화면에도 보여 준다', () => {
  const small = settleSheet({sheet: sheet(), videoId: 'TINY', format: 'SHORTS', metrics: {views7d: 5, watchSeconds7d: 300, subs7d: 1}, baselines, video: newVideo}).sheet;
  const e = small.borrowed[0].evidenceLog.find((x) => x.metric === 'views7d');
  assert.equal(e.views, 5);
  assert.equal(e.lowSample, true, `조회 5회는 ${MIN_VIEWS_7D}회 미만`);
  assert.equal(small.results[0].lowSample, true);
  assert.deepEqual(small.results[0].usualRule, USUAL_RULE);
  const subs = small.borrowed[0].evidenceLog.find((x) => x.metric === 'subs7d');
  assert.match(subs.usualNote, /평소가 0/, '구독은 평소가 0이라 1명만 생겨도 후보가 되는 이유를 기록에 남긴다');
  const html = evidenceHtml(small.borrowed[0]);
  assert.ok(html.includes('표본 작음(조회 5회)') && html.includes('평소 ') && html.includes('길이 보정'), html);
  const g = groupResultsByVariable([small]);
  assert.equal(g[0].lowSampleCount, 1, '표본 작은 영상이 섞여 있다는 것을 묶음에서도 센다');
});

test('v4 시트 정산: episodeId(sheetIdOf)로 매칭·충돌 방지하고 references[].evidenceLog까지 누적·검증한다', () => {
  const v4a = {
    schemaVersion: 4, episodeId: 'ep32-shorts-word-merge', sourceVideoId: 'SHARED11111',
    topic: 'a', status: 'approved', format: 'SHORTS',
    testVariables: [{variable: '훅A', hypothesis: 'h', measure: '조회수'}],
    references: [{videoId: 'REF11111111', role: '훅', what: '원리A', reason: 'r', evidence: 'e', appliedTo: ['cut:0']}],
  };
  const v4b = {
    schemaVersion: 4, episodeId: 'ep33-shorts-swallowed-t', sourceVideoId: 'SHARED11111',
    topic: 'b', status: 'approved', format: 'SHORTS',
    testVariables: [{variable: '훅B', hypothesis: 'h', measure: '조회수'}],
    references: [{videoId: 'REF22222222', role: '전개', what: '원리B', reason: 'r', evidence: 'e', appliedTo: ['cut:1']}],
  };
  const v4NoSrc = {
    schemaVersion: 4, episodeId: 'ep35-shorts-no-source',
    topic: 'c', status: 'approved', format: 'SHORTS',
    testVariables: [{variable: '훅C', hypothesis: 'h', measure: '조회수'}],
    references: [{videoId: 'REF33333333', role: '결말', what: '원리C', reason: 'r', evidence: 'e', appliedTo: ['cut:2']}],
  };
  const outcomes = [
    {videoId: 'VID_A', format: 'SHORTS', sources: {transformSheet: 'ep32-shorts-word-merge'}},
    {videoId: 'VID_B', format: 'SHORTS', sources: {transformSheet: 'ep33-shorts-swallowed-t'}},
    {videoId: 'VID_C', format: 'SHORTS', sources: {transformSheet: 'ep35-shorts-no-source'}},
    {videoId: 'VID_AMBIG', format: 'SHORTS', sources: {transformSheet: 'SHARED11111'}}, // sourceVideoId가 2편에 겹치면 추측 매칭 금지
  ];
  const lifetime = {VID_A: f7(1400, 10, 3), VID_B: f7(600, 12, 1), VID_C: f7(900, 15, 2), VID_AMBIG: f7(1000, 10, 1)};
  const {updated, settled} = settleAll({outcomes, sheets: [v4a, v4b, v4NoSrc], lifetime, baselines});
  assert.equal(settled, 3, '고유 episodeId 3편만 정산되고 충돌하는 sourceVideoId는 건너뛴다');
  assert.deepEqual(updated.map((s) => s.episodeId).sort(), ['ep32-shorts-word-merge', 'ep33-shorts-swallowed-t', 'ep35-shorts-no-source']);
  for (const s of updated) {
    assert.equal(s.references[0].evidenceLog.length, 3, 'references[]에 지표 3건 기록');
    assert.deepEqual(evidenceProblems(s), [], 'references[].evidenceLog도 evidenceProblems를 통과한다');
    assert.ok(evidenceHtml(s.references[0]).includes('결과 기록 3건'));
  }
  const badRef = structuredClone(updated[0]);
  badRef.references[0].evidenceLog[0].result = '성공';
  assert.ok(evidenceProblems(badRef).some((m) => m.includes('명작 레퍼런스') && m.includes('정해진 말이 아니다')));
});
