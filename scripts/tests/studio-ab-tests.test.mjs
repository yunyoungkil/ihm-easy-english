import assert from 'node:assert/strict';
import test from 'node:test';
import {computeBaselines} from '../baseline.mjs';
import {settleAll} from '../sheet-outcomes.mjs';
import {applyEditScan, kindFromEditLines, mergeAbTests, parseTestLabel, selectEditScanTargets} from '../studio-ab-tests.mjs';

// 2026-11-13에 스튜디오에서 실제로 읽은 글자: 콘텐츠 목록의 "A/B 테스트 실행 중" / "A/B 테스트 완료됨", 편집 화면의 "제목 A/B 테스트"(테스트가 있는 영상)와 "A/B 테스팅"(테스트를 시작하는 버튼).

test('목록 표시: 실행 중/완료됨을 읽고, 없으면 null', () => {
  assert.equal(parseTestLabel('6:55\n여태 스펠링 다 읽으셨나요?\nA/B 테스트 완료됨\n공개'), 'completed');
  assert.equal(parseTestLabel('9:30\nA/B 테스트 실행 중'), 'running');
  assert.equal(parseTestLabel('6:31\n저도 이제 안 막힙니다'), null);
  assert.equal(parseTestLabel(null), null);
});

test('편집 화면: "제목 A/B 테스트" 줄이 있으면 제목 테스트, 시작 버튼 "A/B 테스팅"만 있으면 종류를 모른다(빈 배열)', () => {
  assert.deepEqual(kindFromEditLines(['동영상 세부정보', '제목 A/B 테스트', '여태 스펠링 다 읽으셨나요? K, B, W 소리 안 나는 진짜 이유 | 묵음 파닉스', '테스트 보고서 보기']), ['title']);
  assert.deepEqual(kindFromEditLines(['동영상 세부정보', 'A/B 테스팅', '썸네일', '눈에 띄고 시청자의 관심을 끄는 썸네일을 설정하세요. 자세히 알아보기']), []);
  assert.deepEqual(kindFromEditLines(['제목 A/B 테스트', '썸네일 A/B 테스트']), ['thumbnail', 'title']);
  // 긴 글줄(설명 본문 등)에 같은 말이 들어 있어도 종류로 읽지 않는다
  assert.deepEqual(kindFromEditLines(['이 영상에서는 제목 A/B 테스트에 대해 길게 설명하는 설명란의 아주 긴 한 줄입니다']), []);
});

test('저장 합치기: 새로 보이면 처음 본 때를 적고, 표시가 사라져도 이미 적은 상태는 지우지 않고, 실행 중이 완료됨으로 바뀐다', () => {
  const t1 = new Date('2026-11-13T00:00:00Z'), t2 = new Date('2026-11-14T00:00:00Z'), t3 = new Date('2026-11-15T00:00:00Z');
  let store = mergeAbTests({videos: {}}, [{videoId: 'AAAAAAAAAAA', state: 'running'}, {videoId: 'BBBBBBBBBBB', state: null}], t1);
  assert.deepEqual(Object.keys(store.videos), ['AAAAAAAAAAA'], '표시가 없는 영상은 기록하지 않는다');
  store.videos.AAAAAAAAAAA.kind = ['title'];
  store = mergeAbTests(store, [{videoId: 'AAAAAAAAAAA', state: 'completed'}], t2);
  assert.equal(store.videos.AAAAAAAAAAA.state, 'completed');
  assert.equal(store.videos.AAAAAAAAAAA.firstSeenAt, t1.toISOString());
  assert.deepEqual(store.videos.AAAAAAAAAAA.kind, ['title'], '읽어 둔 종류는 유지');
  store = mergeAbTests(store, [{videoId: 'AAAAAAAAAAA', state: null}], t3); // 완료 표시가 사라진 날
  assert.equal(store.videos.AAAAAAAAAAA.state, 'completed', '테스트를 건 적이 있다는 사실은 남는다');
  assert.equal(store.videos.AAAAAAAAAAA.lastSeenAt, t2.toISOString());
});

const studioRow = (impressions, clicks) => ({usable: true, impressions, clicks, ctrPercent: Number(((clicks / impressions) * 100).toFixed(2))});
const longVideo = (id, day) => ({videoId: id, title: `t-${id}`, publishedAt: `2026-03-${String(day).padStart(2, '0')}T00:00:00Z`, format: 'LONGFORM', durationSeconds: 400});
const f7 = {first7d: {views: 10, averageViewDuration: 100, subscribersGained: 0}};

test('기준선: 기준 영상에 A/B 테스트가 걸려 있으면 시안이 섞인 값이라고 표시하되 후보에서 빼지 않는다', () => {
  const ids = ['a', 'b', 'c'];
  const catalog = ids.map((id, i) => longVideo(id, i + 1));
  const lifetime = Object.fromEntries(ids.map((id) => [id, f7]));
  const studio = {a: studioRow(100, 2), b: studioRow(100, 9), c: studioRow(100, 3)};
  const tested = computeBaselines({catalog, views7d: {}, lifetime, studio, abTests: {b: {state: 'completed'}}});
  const ctr = tested.formats.LONGFORM.metrics.ctr7d;
  assert.equal(ctr.champion.videoId, 'b', '테스트가 걸렸다고 후보에서 빼지 않는다');
  assert.equal(ctr.champion.abTest, 'completed');
  assert.match(ctr.mixedNote, /시안이 섞인 값/);
  assert.equal(ctr.abTestedCount, 1);
  const plain = computeBaselines({catalog, views7d: {}, lifetime, studio});
  assert.equal(plain.formats.LONGFORM.metrics.ctr7d.mixedNote, null);
  assert.equal(plain.formats.LONGFORM.metrics.ctr7d.abTestedCount, 0);
  // 기존 세 지표에는 표시를 붙이지 않는다
  assert.equal(tested.formats.LONGFORM.metrics.views7d.mixedNote, undefined);
});

test('시트 정산: A/B 테스트가 걸린 영상의 노출수·클릭률 근거에는 시안이 섞였다는 표시가 붙는다', () => {
  const sheet = () => ({sourceVideoId: 'S', status: 'published', testVariables: [], results: [], borrowed: [{what: '철자 카드'}]});
  const outcomes = [{videoId: 'L1', format: 'LONGFORM', publishedAt: '2026-02-20T00:00:00Z', sources: {transformSheet: 'S'}}];
  const lifetime = {L1: {first7d: {startDate: '2026-02-01', endDate: '2026-02-07', views: 12, averageViewDuration: 80, subscribersGained: 1}}};
  const base = {outcomes, lifetime, baselines: {formats: {}}, catalog: [], now: new Date('2026-03-01T00:00:00Z'), studio: {L1: {usable: true, impressions: 140, clicks: 9, ctrPercent: 6.43}}};
  const r = settleAll({...base, sheets: [sheet()], abTests: {L1: {state: 'completed'}}});
  const result = r.updated[0].results[0];
  assert.equal(result.abTest, 'completed');
  assert.ok(result.flags.some((f) => f.startsWith('A/B 테스트가 걸린 영상')));
  const log = r.updated[0].borrowed[0].evidenceLog;
  assert.equal(log.find((e) => e.metric === 'ctr7d').abTest, 'completed');
  assert.equal(log.find((e) => e.metric === 'views7d').abTest, undefined, '조회수 근거에는 붙이지 않는다');
  const plain = settleAll({...base, sheets: [sheet()]});
  assert.equal(plain.updated[0].results[0].abTest, null);
  assert.deepEqual(plain.updated[0].results[0].flags, []);
});

test('편집 화면 읽기: 테스트 흔적이 있으면 목록 표시가 없어도 completed로 기록하고, 없으면 읽었다는 사실만 남긴다', () => {
  const now = new Date('2026-11-13T00:00:00Z');
  // 실제 관찰(2026-11-13): ROks87qezuU는 목록 표시가 사라졌어도 편집 화면에 "제목 A/B 테스트 / 테스트 보고서 보기"가 남아 있었다
  let store = applyEditScan({videos: {}}, 'ROks87qezuU', ['title'], now);
  assert.equal(store.videos.ROks87qezuU.state, 'completed');
  assert.deepEqual(store.videos.ROks87qezuU.kind, ['title']);
  assert.equal(store.scanned.ROks87qezuU.hasTest, true);
  // 테스트가 없는 영상은 videos에 넣지 않고 읽었다는 사실만 남긴다(기준선이 이 영상을 테스트 영상으로 세지 않게)
  store = applyEditScan(store, '--Ajwp-UvIk', [], now);
  assert.equal(store.videos['--Ajwp-UvIk'], undefined);
  assert.equal(store.scanned['--Ajwp-UvIk'].hasTest, false);
  // 목록에서 본 상태(running)는 편집 화면을 읽어도 덮어쓰지 않는다
  const running = applyEditScan({videos: {AAAAAAAAAAA: {state: 'running', kind: [], firstSeenAt: 'x', lastSeenAt: 'y'}}}, 'AAAAAAAAAAA', ['title'], now);
  assert.equal(running.videos.AAAAAAAAAAA.state, 'running');
  assert.deepEqual(running.videos.AAAAAAAAAAA.kind, ['title']);
});

test('편집 화면을 열 영상: 안 읽은 롱폼, 실행 중, 공개 14일 안에 하루 지난 것만 새 영상부터. 쇼츠는 읽지 않는다', () => {
  const now = new Date('2026-11-13T12:00:00Z');
  const v = (id, format, published) => ({videoId: id, format, publishedAt: published});
  const catalog = [v('newOne', 'LONGFORM', '2026-11-10T00:00:00Z'), v('oldDone', 'LONGFORM', '2026-08-01T00:00:00Z'), v('oldUnread', 'LONGFORM', '2026-07-01T00:00:00Z'),
    v('oldRunning', 'LONGFORM', '2026-09-01T00:00:00Z'), v('recentFresh', 'LONGFORM', '2026-11-05T00:00:00Z'), v('short1', 'SHORTS', '2026-11-12T00:00:00Z')];
  const listed = catalog.map((c) => ({videoId: c.videoId, state: c.videoId === 'oldRunning' ? 'running' : null}));
  const store = {scanned: {
    newOne: {at: '2026-11-11T00:00:00Z', hasTest: false}, // 공개 14일 안이고 이틀 전에 읽음 -> 다시
    oldDone: {at: '2026-10-01T00:00:00Z', hasTest: false}, // 오래된 영상, 이미 읽음 -> 안 읽음
    oldRunning: {at: '2026-10-01T00:00:00Z', hasTest: true}, // 목록에 실행 중이 보임 -> 다시
    recentFresh: {at: '2026-11-13T06:00:00Z', hasTest: false}, // 공개 14일 안이지만 6시간 전에 읽음 -> 안 읽음
  }};
  assert.deepEqual(selectEditScanTargets({store, listed, catalog, now}), ['newOne', 'oldRunning', 'oldUnread']);
});
