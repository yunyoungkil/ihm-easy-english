// 비교 시트(scripts/transform-sheet.mjs) 시험. 2026-11-12.
// 비교 시트 = 경쟁 영상 한 편(과 다른 잘된 리포트)을 우리 콘텐츠로 바꾸는 한 장. 리포트 안에서 좌우로 비교한다.
// 규칙: 경쟁 영상이 한 편뿐이면 안 되고, 가져온 것마다 이유가 있어야 하며, 뺀 것도 이유와 함께 남는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSheet, ROW_KEYS, sheetStage, borrowedSources} from '../transform-sheet.mjs';

const row = (key, extra = {}) => ({key, competitor: {text: '경쟁 쪽'}, ours: {text: '우리 쪽'}, why: '이유', ...extra});
const good = () => ({
  schemaVersion: 1,
  sourceVideoId: 'AAAAAAAAAAA',
  status: 'draft',
  format: 'SHORTS',
  topic: '가운데 모음이 사라지는 외래어',
  identityShare: {ours: 30, competitor: 70, reason: '확정 판정 0편이라 경쟁 쪽을 크게'},
  rows: ROW_KEYS.map((k) => (k === 'visual' ? row(k, {ours: {text: '우리 쪽', cutPlan: {durationSeconds: 50, times: [0, 2.2, 5.5, 9.5, 14, 17.3, 19.5, 22.8, 25, 28.3, 30.5, 35, 40, 44.5]}}}) : row(k))),
  borrowed: [{fromVideoId: 'BBBBBBBBBBB', what: '철자 카드 넘기기', reason: '소리가 바뀌는 글자를 눈으로 보여 줌', evidence: '2,380배 영상, 표본 1편(가설)'}],
  rejected: [{fromVideoId: 'CCCCCCCCCCC', what: '전문 강사 발언 인용', reason: '확인할 수 없는 수치 주장이라 뺀다'}],
});

test('모든 항목이 채워지고 가져온 것과 뺀 것에 이유가 있으면 통과한다', () => {
  assert.deepEqual(validateSheet(good()), []);
});

test('다른 리포트에서 가져온 것이 하나도 없으면(경쟁 영상 한 편만 본 것) 실패한다', () => {
  const s = good(); s.borrowed = [];
  assert.ok(validateSheet(s).some((p) => p.includes('다른 경쟁 영상')));
  assert.equal(borrowedSources(good()).length, 1);
});

test('가져온 것에 이유나 근거가 없으면 실패하고, 출처가 원본과 같은 영상이어도 실패한다', () => {
  const noReason = good(); noReason.borrowed[0].reason = '';
  assert.ok(validateSheet(noReason).some((p) => p.includes('이유')));
  const noEvidence = good(); noEvidence.borrowed[0].evidence = '';
  assert.ok(validateSheet(noEvidence).some((p) => p.includes('근거')));
  const same = good(); same.borrowed[0].fromVideoId = same.sourceVideoId;
  assert.ok(validateSheet(same).some((p) => p.includes('다른 경쟁 영상')));
});

test('뺀 것은 이유와 함께 남겨야 한다(실패·기각도 데이터)', () => {
  const s = good(); s.rejected = [{fromVideoId: 'CCCCCCCCCCC', what: 'x', reason: ''}];
  assert.ok(validateSheet(s).some((p) => p.includes('뺀')));
});

test('항목이 빠지거나 경쟁·우리 한쪽이 비면, 바꾼 이유가 없으면 실패한다', () => {
  const missing = good(); missing.rows = missing.rows.slice(1);
  assert.ok(validateSheet(missing).some((p) => p.includes(ROW_KEYS[0])));
  const empty = good(); empty.rows[1].ours = {text: ''};
  assert.ok(validateSheet(empty).some((p) => p.includes('우리')));
  const noWhy = good(); noWhy.rows[2].why = '';
  assert.ok(validateSheet(noWhy).some((p) => p.includes('바꾼 이유')));
});

test('우리 쪽 이미지가 적혀 있으면 실제 파일이 있어야 한다', () => {
  const s = good(); s.rows[0].ours.image = 'images/x/없는파일.png';
  assert.ok(validateSheet(s, {imageExists: () => false}).some((p) => p.includes('이미지')));
  assert.deepEqual(validateSheet(s, {imageExists: () => true}), []);
});

test('정체성 비율은 합이 100이고 근거가 있어야 한다', () => {
  const s = good(); s.identityShare = {ours: 40, competitor: 40, reason: 'x'};
  assert.ok(validateSheet(s).some((p) => p.includes('100')));
  const s2 = good(); s2.identityShare.reason = '';
  assert.ok(validateSheet(s2).some((p) => p.includes('근거')));
});

test('단계: 초안 → 승인 → 공개 → 성적 입력 순서만 허용하고, 성적이 있으면 measured', () => {
  assert.equal(sheetStage({status: 'draft'}), 'draft');
  assert.equal(sheetStage({status: 'published', outcome: {views7d: 12}}), 'measured');
  assert.equal(sheetStage({status: 'published'}), 'published');
  assert.ok(validateSheet({...good(), status: 'maybe'}).some((p) => p.includes('상태')));
});

import {renderTransformSheetPage, renderTransformSheetIndex, renderReportPage} from '../outlier-report-view.mjs';
import {renderNextEpisodeInput} from '../next-episode-input.mjs';
import {parsePlanningSources} from '../planning-outcome.mjs';

const report = {videoId: 'AAAAAAAAAAA', meta: {title: '경쟁 <영상>', channelTitle: '경쟁 채널', thumbnail: 'https://i.ytimg.com/vi/AAAAAAAAAAA/maxresdefault.jpg'}, frames: [{t: 3, file: '3.jpg'}], outlierRatio: 570};

test('시트 화면: 같은 행에 경쟁(왼쪽)과 우리(오른쪽), 바꾼 이유, 가져온 것·뺀 것을 보여 주고 글자는 이스케이프한다', () => {
  const s = good();
  s.rows[1] = row('thumbnail', {competitor: {text: '경쟁 썸네일 <b>', images: ['thumbnail']}, ours: {text: '우리 썸네일', image: 'images/AAAAAAAAAAA/thumb-A.png'}, why: '글자 수를 줄임'});
  s.rows[4] = row('visual', {competitor: {text: '컷', images: ['frame:3']}});
  const html = renderTransformSheetPage(s, report, []);
  assert.match(html, /경쟁 영상/);
  assert.match(html, /i\.ytimg\.com\/vi\/AAAAAAAAAAA\/maxresdefault\.jpg/);
  assert.match(html, /\/outlier-frames\/AAAAAAAAAAA\/3\.jpg/);
  assert.match(html, /\/transform-images\/AAAAAAAAAAA\/thumb-A\.png/);
  assert.match(html, /글자 수를 줄임/);
  assert.match(html, /철자 카드 넘기기/);
  assert.match(html, /전문 강사 발언 인용/);
  assert.match(html, /경쟁 70% · 우리 30%/);
  assert.ok(!html.includes('경쟁 썸네일 <b>'), '경쟁 썸네일 글자가 HTML로 실행되면 안 된다');
  assert.match(html, /&lt;b&gt;/);
});

test('시트 화면: 규칙을 어긴 시트는 빨간 경고로 어디가 비었는지 보여 준다', () => {
  const s = good(); s.borrowed = [];
  const html = renderTransformSheetPage(s, report, validateSheet(s));
  assert.match(html, /다른 경쟁 영상에서 가져온 것이 하나도 없다/);
});

test('시트 목록: 상태·소재·경쟁 영상 제목을 보여 주고 시트 화면 주소로 잇는다', () => {
  const html = renderTransformSheetIndex([{sheet: good(), report}]);
  assert.match(html, /\/transform-sheet\/AAAAAAAAAAA/);
  assert.match(html, /가운데 모음이 사라지는 외래어/);
  assert.match(html, /초안/);
});

test('우리 쪽 이미지가 여러 장(images)일 때도 하나하나 파일이 있어야 한다', () => {
  const s = good(); s.rows[4].ours.images = ['images/x/있음.jpg', 'images/x/없음.jpg'];
  const problems = validateSheet(s, {imageExists: (rel) => rel.endsWith('있음.jpg')});
  assert.equal(problems.filter((p) => p.includes('이미지')).length, 1);
  assert.ok(problems.some((p) => p.includes('없음.jpg')));
});

test('경쟁 영상 리포트 화면: 비교 시트가 있으면 시트 링크가 나오고, 없으면 안 나온다', () => {
  const r = {videoId: 'AAAAAAAAAAA', meta: {title: 't'}, analysis: {}, frames: [], pacing: {}, quoteCheck: {}, windowSeconds: 60};
  assert.match(renderReportPage(r, {hasSheet: true}), /\/transform-sheet\/AAAAAAAAAAA/);
  assert.doesNotMatch(renderReportPage(r), /\/transform-sheet\//);
});

test('다음 기획 입력: 비교 시트 현황(상태·가져온 영상 수)을 8절에 적는다', () => {
  const md = renderNextEpisodeInput({generatedAt: '2026-11-12T00:00:00Z', comparisons: {}, transformSheets: [{sourceVideoId: 'AAAAAAAAAAA', topic: '가운데 모음', status: 'draft', format: 'SHORTS', borrowedCount: 2, rejectedCount: 4}]});
  assert.match(md, /## 8\. 비교 시트/);
  assert.match(md, /가운데 모음/);
  assert.match(md, /\/transform-sheet\/AAAAAAAAAAA/);
  assert.doesNotMatch(md, /undefined|NaN/);
});

test('BRIEF 기획 근거의 비교 시트 줄을 읽는다', () => {
  const brief = '## 기획 근거\n- 비교 시트: SbQVBQoRciA (가운데 모음이 사라지는 외래어)\n\n## 다음\n';
  assert.equal(parsePlanningSources(brief).transformSheet, 'SbQVBQoRciA');
  assert.equal(parsePlanningSources('## 기획 근거\n- 경쟁 영상: 경쟁 근거 없음\n').transformSheet, null);
});

// ---- 컷 리듬 비교(2026-11-12 사용자: 우리도 경쟁 컷 수에 조금은 맞춰야 한다) ----
const withPlan = (times, duration = 50) => { const s = good(); s.rows.find((r) => r.key === 'visual').ours.cutPlan = {durationSeconds: duration, times}; return s; };
const withoutPlan = () => { const s = good(); delete s.rows.find((r) => r.key === 'visual').ours.cutPlan; return s; };

test('화면 연출 행에는 컷 계획(몇 초에 장면이 바뀌는지)이 있어야 한다', () => {
  assert.ok(validateSheet(withoutPlan()).some((p) => p.includes('컷 계획')));
  assert.deepEqual(validateSheet(withPlan([0, 4, 8, 12, 16])), []);
});

test('컷 계획은 시간 순서이고 영상 길이 안에 있어야 한다', () => {
  assert.ok(validateSheet(withPlan([0, 8, 4])).some((p) => p.includes('순서')));
  assert.ok(validateSheet(withPlan([0, 4, 99], 50)).some((p) => p.includes('길이')));
});

test('우리 컷 수가 경쟁의 절반 미만이면 실패한다(1분당 컷 수로 비교, 경쟁 컷 수가 없으면 비교하지 않는다)', () => {
  const comp = {perMinute: 17};
  const few = withPlan([0, 25]); // 50초에 2번 = 1분에 2.4번
  assert.ok(validateSheet(few, {competitorPacing: comp}).some((p) => p.includes('절반')));
  const enough = withPlan([0, 2.2, 5.5, 9.5, 14, 17.3, 19.5, 22.8, 25, 28.3, 30.5, 35, 40, 44.5]); // 1분에 16.8번
  assert.deepEqual(validateSheet(enough, {competitorPacing: comp}), []);
  assert.deepEqual(validateSheet(few, {competitorPacing: {perMinute: null}}), []);
  assert.deepEqual(validateSheet(few), []);
});

test('시트 화면: 경쟁 컷 시각과 우리 컷 계획을 같은 시간 막대로 보여 주고 1분당 컷 수를 적는다', () => {
  const s = withPlan([0, 10, 20, 30, 40]);
  const rep = {...report, windowSeconds: 53, pacing: {count: 3, perMinute: 17, times: [3, 10, 30]}};
  const html = renderTransformSheetPage(s, rep, []);
  assert.match(html, /컷 리듬/);
  assert.equal((html.match(/class="tick comp"/g) || []).length, 3);
  assert.equal((html.match(/class="tick ours"/g) || []).length, 5);
  assert.match(html, /경쟁 3번/);
  assert.match(html, /우리 계획 5번/);
});

test('시트 화면: 그림은 같은 높이로 제한하고 여러 장은 가로로 나란히 둔다', () => {
  const html = renderTransformSheetPage(good(), report, []);
  assert.match(html, /\.sheet-col \.imgs\{[^}]*flex-wrap:nowrap/);
  assert.match(html, /max-height:300px/);
});

test('컷 필름스트립: 경쟁 컷 프레임과 우리 컷 카드를 시간 순서로 이미지로 보여 주고 시각을 붙인다', () => {
  const s = good();
  const v = s.rows.find((r) => r.key === 'visual');
  v.ours.cutPlan = {durationSeconds: 50, cuts: [0, 2.2, 5.5, 9.5, 14, 17.3, 19.5].map((t, i) => ({t, template: 'hook', word: 'a', image: `images/AAAAAAAAAAA/cuts/cut-0${i}.png`}))};
  const rep = {...report, windowSeconds: 53, pacing: {count: 3, perMinute: 17, times: [9.5, 15, 17.3]}};
  const html = renderTransformSheetPage(s, rep, []);
  assert.equal((html.match(/class="film comp"/g) || []).length, 1);
  assert.equal((html.match(/src="\/outlier-frames\/AAAAAAAAAAA\/cut-0[0-2]\.jpg"/g) || []).length, 3);
  assert.equal((html.match(/src="\/transform-images\/AAAAAAAAAAA\/cuts\/cut-0[0-6]\.png"/g) || []).length, 7);
  assert.match(html, /<figcaption>9\.5초<\/figcaption>/);
  assert.match(html, /<figcaption>14초<\/figcaption>/);
});

test('컷 필름스트립은 가로 한 줄 스크롤이고, 그림은 300px 높이로 보이며 누르면 원본이 열린다', () => {
  const s = good();
  s.rows.find((r) => r.key === 'visual').ours.cutPlan = {durationSeconds: 50, cuts: [0, 2.2, 5.5, 9.5, 14, 17.3, 19.5].map((t, i) => ({t, template: 'hook', word: 'a', image: `images/AAAAAAAAAAA/cuts/cut-0${i}.png`}))};
  const rep = {...report, windowSeconds: 53, pacing: {count: 3, perMinute: 17, times: [9.5, 15, 17.3]}};
  const html = renderTransformSheetPage(s, rep, []);
  assert.match(html, /\.film\{[^}]*flex-wrap:nowrap[^}]*overflow-x:auto/);
  assert.match(html, /\.film img\{[^}]*height:300px/);
  assert.match(html, /<a href="\/transform-images\/AAAAAAAAAAA\/cuts\/cut-00\.png" target="_blank" rel="noopener"><img/);
  assert.match(html, /<a href="\/outlier-frames\/AAAAAAAAAAA\/cut-00\.jpg" target="_blank" rel="noopener"><img/);
});

test('이미지 주소에 파일 수정 시각(?v=)을 붙여, 그림을 다시 만들면 브라우저가 옛 파일을 쓰지 않게 한다', () => {
  const s = good();
  s.rows.find((r) => r.key === 'thumbnail').ours = {text: '우리', images: ['images/AAAAAAAAAAA/thumb-A.jpg']};
  s.rows.find((r) => r.key === 'visual').ours.cutPlan = {durationSeconds: 50, cuts: [0, 2.2, 5.5, 9.5, 14, 17.3, 19.5].map((t, i) => ({t, template: 'hook', word: 'a', image: `images/AAAAAAAAAAA/cuts/cut-0${i}.png`}))};
  const rep = {...report, windowSeconds: 53, pacing: {count: 3, perMinute: 17, times: [9.5, 15, 17.3]}};
  const html = renderTransformSheetPage(s, rep, [], {assetVersion: '1731420000'});
  assert.match(html, /src="\/transform-images\/AAAAAAAAAAA\/thumb-A\.jpg\?v=1731420000"/);
  assert.match(html, /src="\/transform-images\/AAAAAAAAAAA\/cuts\/cut-00\.png\?v=1731420000"/);
  assert.match(html, /src="\/outlier-frames\/AAAAAAAAAAA\/cut-00\.jpg\?v=1731420000"/);
  assert.match(html, /<a href="\/transform-images\/AAAAAAAAAAA\/cuts\/cut-00\.png\?v=1731420000"/);
  const none = renderTransformSheetPage(s, rep, []);
  assert.doesNotMatch(none, /\?v=/);
});

test('썸네일 시안 선택: 시트에 있는 시안만 고를 수 있고, 고르고 풀 수 있다', async () => {
  const {setThumbnailPick} = await import('../transform-sheet.mjs');
  const sheet = {rows: [{key: 'thumbnail', ours: {images: ['images/x/a.jpg', 'images/x/b.jpg']}}]};
  const one = setThumbnailPick(sheet, 'images/x/b.jpg', true);
  assert.deepEqual(one.thumbnailPicks, ['images/x/b.jpg']);
  const two = setThumbnailPick(one, 'images/x/a.jpg', true);
  assert.deepEqual(two.thumbnailPicks, ['images/x/a.jpg', 'images/x/b.jpg']);
  assert.deepEqual(setThumbnailPick(two, 'images/x/b.jpg', false).thumbnailPicks, ['images/x/a.jpg']);
  assert.throws(() => setThumbnailPick(sheet, 'images/x/zzz.jpg', true), /시안/);
});

test('시트 페이지의 썸네일 시안마다 체크박스가 있고 고른 것은 체크되어 보인다', async () => {
  const {renderTransformSheetPage} = await import('../outlier-report-view.mjs');
  const sheet = {sourceVideoId: 'AAAAAAAAAAA', topic: 't', status: 'draft', format: 'SHORTS', identityShare: {ours: 30, competitor: 70, reason: 'r'}, thumbnailPicks: ['images/x/b.jpg'],
    rows: [{key: 'thumbnail', competitor: {text: 'c'}, ours: {text: 'o', images: ['images/x/a.jpg', 'images/x/b.jpg']}, why: 'w'}], borrowed: [], rejected: []};
  const html = renderTransformSheetPage(sheet, null, []);
  assert.equal((html.match(/data-pick="/g) || []).length, 2);
  assert.match(html, /data-pick="images\/x\/b\.jpg" checked/);
  assert.doesNotMatch(html, /data-pick="images\/x\/a\.jpg" checked/);
});

test('제목 후보 선택: 시트의 후보만 고를 수 있고, 시안 체크박스는 이미지 오른쪽 위 모서리에 글자 없이 있다', async () => {
  const {setTitlePick} = await import('../transform-sheet.mjs');
  const {renderTransformSheetPage} = await import('../outlier-report-view.mjs');
  const sheet = {sourceVideoId: 'AAAAAAAAAAA', topic: 't', status: 'draft', format: 'SHORTS', identityShare: {ours: 30, competitor: 70, reason: 'r'}, titlePicks: [],
    rows: [{key: 'title', competitor: {text: 'c'}, ours: {text: 'o', titles: ['가', '나', '다']}, why: 'w'}, {key: 'thumbnail', competitor: {text: 'c'}, ours: {text: 'o', images: ['images/x/a.jpg']}, why: 'w'}], borrowed: [], rejected: []};
  const one = setTitlePick(sheet, '나', true);
  assert.deepEqual(one.titlePicks, ['나']);
  assert.throws(() => setTitlePick(sheet, '없는 제목', true), /후보/);
  const html = renderTransformSheetPage(one, null, []);
  assert.equal((html.match(/data-pick-title="/g) || []).length, 3);
  assert.match(html, /data-pick-title="나" checked/);
  assert.match(html, /\.pick input\{position:absolute;top:\d+px;right:\d+px/);
  assert.match(html, /\.thumbbox\{[^}]*overflow:auto/);
  assert.doesNotMatch(html, /이 시안 고르기/);
});

test('시트의 썸네일 시안은 유튜브 쇼츠 목록에 나오는 크기(가로 200px)로 보인다', async () => {
  const {renderTransformSheetPage} = await import('../outlier-report-view.mjs');
  const sheet = {sourceVideoId: 'AAAAAAAAAAA', topic: 't', status: 'draft', format: 'SHORTS', identityShare: {ours: 30, competitor: 70, reason: 'r'},
    rows: [{key: 'thumbnail', competitor: {text: 'c'}, ours: {text: 'o', images: ['images/x/a.jpg']}, why: 'w'}], borrowed: [], rejected: []};
  assert.match(renderTransformSheetPage(sheet, null, []), /\.pick img\.real\{width:200px/);
});

test('대본 규칙(schemaVersion 2): 컷마다 대본, 영어로 시작 금지, 컷 길이에 맞는 분량, 전체 대본은 컷 대본을 이은 것', async () => {
  const {validateSheet, fullScript, cutDurations, hangulSyllables, ROW_KEYS} = await import('../transform-sheet.mjs');
  const mk = (cuts, version = 2) => ({sourceVideoId: 'AAAAAAAAAAA', topic: 't', status: 'draft', schemaVersion: version, identityShare: {ours: 30, competitor: 70, reason: 'r'},
    rows: ROW_KEYS.map((k) => ({key: k, competitor: {text: 'c'}, ours: k === 'visual' ? {text: 'o', cutPlan: {durationSeconds: 30, cuts}} : {text: 'o'}, why: 'w'})),
    borrowed: [{fromVideoId: 'BBBBBBBBBBB', what: 'x', reason: 'r', evidence: 'e'}], rejected: []});
  const c = (t, narration) => ({t, template: 'hook', word: 'a', image: `i/${t}.png`, ...(narration === undefined ? {} : {narration})});
  const times = [0, 2.2, 5.5, 9.5, 14, 17.3, 19.5];
  const good = times.map((t) => c(t, '안녕하세요 반갑습니다'));
  assert.deepEqual(validateSheet(mk(good)).filter((p) => p.includes('대본')), []);
  assert.ok(validateSheet(mk(good.map((x, i) => (i === 3 ? c(x.t) : x)))).some((p) => p.includes('대본(narration)이 없다')));
  assert.ok(validateSheet(mk(good.map((x, i) => (i === 3 ? c(x.t, 'Chocolate 어떻게') : x)))).some((p) => p.includes('영어로 시작')));
  assert.ok(validateSheet(mk(good.map((x, i) => (i === 1 ? c(x.t, '가나다라마바사아자차카타파하가나다라마바사아자차카타파하') : x)))).some((p) => p.includes('너무 길다')));
  assert.deepEqual(validateSheet(mk(times.map((t) => c(t)), 1)).filter((p) => p.includes('대본')), [], '1판 시트는 대본이 없어도 된다');
  const plan = {durationSeconds: 30, cuts: [c(0, '하나'), c(10, '둘'), c(20, '셋')]};
  assert.deepEqual(fullScript(plan).text, '하나\n둘\n셋');
  assert.deepEqual(cutDurations(plan), [10, 10, 10]);
  assert.equal(hangulSyllables('초콜릿 abc 1'), 3);
});

test('시트 페이지: 컷 이미지 아래 컷 대본과, 아래에 컷 대본을 이은 전체 대본이 보인다', async () => {
  const {renderTransformSheetPage} = await import('../outlier-report-view.mjs');
  const cuts = [{t: 0, image: 'images/A/cuts/c0.png', narration: '첫째 줄'}, {t: 5, image: 'images/A/cuts/c1.png', narration: '둘째 줄'}];
  const sheet = {sourceVideoId: 'AAAAAAAAAAA', topic: 't', status: 'draft', format: 'SHORTS', identityShare: {ours: 30, competitor: 70, reason: 'r'},
    rows: [{key: 'visual', competitor: {text: 'c'}, ours: {text: 'o', cutPlan: {durationSeconds: 10, cuts}}, why: 'w'}], borrowed: [], rejected: []};
  const html = renderTransformSheetPage(sheet, null, []);
  assert.equal((html.match(/<div class="say">/g) || []).length, 2);
  assert.match(html, /class="card fullscript"/);
  assert.match(html, /첫째 줄<\/div><div><span class="meta">5초<\/span> 둘째 줄/);
});

test('완성형(2판) 시트는 설명글·태그·고정 댓글 칸이 있어야 하고, 대본이 약속한 고정 댓글이 비면 실패한다', async () => {
  const {validateSheet, ROW_KEYS} = await import('../transform-sheet.mjs');
  const cuts = [0, 2.2, 5.5, 9.5, 14, 17.3, 19.5].map((t) => ({t, template: 'hook', word: 'a', image: `i/${t}.png`, narration: t === 19.5 ? '정답은 고정 댓글에 있어요' : '안녕하세요'}));
  const tagList = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const pkg = {description: '설명 첫 줄', tags: tagList, tagCheck: tagList.map((tag) => ({tag, verdict: '맞음', reason: 'r'})), pinnedComment: '정답입니다'};
  const mk = (p) => ({sourceVideoId: 'AAAAAAAAAAA', topic: 't', status: 'draft', schemaVersion: 2, identityShare: {ours: 30, competitor: 70, reason: 'r'},
    rows: [...ROW_KEYS.map((k) => ({key: k, competitor: {text: 'c'}, ours: k === 'visual' ? {text: 'o', cutPlan: {durationSeconds: 30, cuts}} : {text: 'o'}, why: 'w'})), ...(p ? [{key: 'package', competitor: {text: 'c'}, ours: p, why: 'w'}] : [])],
    borrowed: [{fromVideoId: 'BBBBBBBBBBB', what: 'x', reason: 'r', evidence: 'e'}], rejected: []});
  const only = (s) => validateSheet(s).filter((x) => x.includes('설명글·태그·고정 댓글') || x.includes('package'));
  assert.deepEqual(only(mk(pkg)), []);
  assert.ok(only(mk(null)).length > 0, '칸이 없으면 실패');
  assert.ok(only(mk({...pkg, pinnedComment: ''})).some((x) => x.includes('약속했는데')));
  assert.ok(only(mk({...pkg, tags: ['a', 'b']})).some((x) => x.includes('태그가')));
  assert.ok(only(mk({...pkg, tagCheck: pkg.tagCheck.slice(1)})).some((x) => x.includes('확인한 기록')), '검색창에서 확인하지 않은 태그는 실패');
  assert.ok(only(mk({...pkg, tagCheck: pkg.tagCheck.map((c, i) => (i === 0 ? {...c, verdict: '안 맞음', reason: '뜻이 다름'} : c))})).some((x) => x.includes('안 맞는다')), '안 맞는 태그는 실패');
  assert.ok(only(mk({...pkg, description: '듣기 드릴 영상'})).some((x) => x.includes('금지어')));
  const v1 = mk(null); v1.schemaVersion = 1;
  assert.deepEqual(only(v1), [], '1판은 이 칸이 없어도 된다');
});

test('경쟁 설명글·태그는 리포트 값을 그대로 보여 주고, 태그가 없으면 없다고 밝힌다. 패키지는 시트에서 복사한다', async () => {
  const {renderTransformSheetPage} = await import('../outlier-report-view.mjs');
  const {packageFilesFromSheet} = await import('../package-from-sheet.mjs');
  const sheet = {sourceVideoId: 'AAAAAAAAAAA', topic: 't', status: 'draft', format: 'SHORTS', identityShare: {ours: 30, competitor: 70, reason: 'r'}, titlePicks: ['제목 하나'],
    rows: [{key: 'package', competitor: {text: 'c'}, ours: {text: 'o', description: '우리 설명', tags: ['태그1', '태그2'], pinnedComment: '우리 고정'}, why: 'w'}], borrowed: [], rejected: []};
  const html = renderTransformSheetPage(sheet, {videoId: 'AAAAAAAAAAA', meta: {description: '경쟁 설명 줄', tags: []}}, []);
  assert.match(html, /경쟁 설명 줄/);
  assert.match(html, /태그 없음/);
  assert.match(html, /우리 고정/);
  assert.match(renderTransformSheetPage(sheet, {videoId: 'AAAAAAAAAAA', meta: {}}, []), /저장 전/);
  const files = packageFilesFromSheet(sheet);
  assert.equal(files['title.txt'], '제목 하나\n');
  assert.equal(files['tags.txt'], '태그1, 태그2\n');
  assert.throws(() => packageFilesFromSheet({...sheet, titlePicks: []}), /제목을 1~3개/);
  const multi = packageFilesFromSheet({...sheet, titlePicks: ['가', '나', '다']});
  assert.equal(multi['title.txt'], '가\n');
  assert.equal(multi['title-variants.txt'], '가\n나\n다\n');
  assert.throws(() => packageFilesFromSheet({...sheet, titlePicks: ['1', '2', '3', '4']}), /제목을 1~3개/);
  const {packageImagesFromSheet} = await import('../package-from-sheet.mjs');
  assert.deepEqual(packageImagesFromSheet({thumbnailPicks: ['images/x/a.jpg', 'images/x/b.jpg', 'images/x/c.jpg']}).map((x) => x.to), ['thumbnail.jpg', 'thumbnail-variant-b.jpg', 'thumbnail-variant-c.jpg']);
  assert.throws(() => packageImagesFromSheet({thumbnailPicks: []}), /썸네일 시안을 1~3개/);
});

test('3판 시트는 시험 변수 1~2개(무엇을·왜·어느 지표로)와 용어 풀이 칸이 있어야 하고, 1·2판은 없어도 된다', async () => {
  const {experimentProblems, validateSheet} = await import('../transform-sheet.mjs');
  const base = {schemaVersion: 3, testVariables: [{variable: '훅 유형', hypothesis: '쇼츠 상위 영상이 질문형이다(작은 표본, 가설)', measure: '조회수'}], glossary: []};
  assert.deepEqual(experimentProblems(base), []);
  assert.ok(experimentProblems({...base, testVariables: []}).some((x) => x.includes('1~2개')));
  assert.ok(experimentProblems({...base, testVariables: [base.testVariables[0], base.testVariables[0], base.testVariables[0]]}).some((x) => x.includes('1~2개')), '3개는 너무 많다');
  assert.ok(experimentProblems({...base, testVariables: [{variable: '훅', hypothesis: '', measure: '조회수'}]}).some((x) => x.includes('hypothesis')));
  assert.ok(experimentProblems({...base, glossary: undefined}).some((x) => x.includes('glossary')));
  assert.ok(experimentProblems({...base, glossary: [{term: 'minimal pair', plain: ''}]}).some((x) => x.includes('term')));
  assert.deepEqual(experimentProblems({schemaVersion: 2}), []);
  assert.deepEqual(experimentProblems({schemaVersion: 1}), []);
  assert.ok(validateSheet({...good(), schemaVersion: 3}).some((x) => x.includes('시험 변수')), 'validateSheet가 3판 검사를 부른다');
});
