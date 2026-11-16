// 비교 시트의 컷 카드(scripts/sheet-card-templates.mjs) 시험. 2026-11-12.
// 배경: AI 이미지 모델이 철자를 4번 틀렸다(chocolate에서 엉뚱한 글자를 흐리게 처리). 글자가 핵심인 카드는 코드(HTML)로 그려
// 철자·강조 글자를 틀릴 수 없게 한다. "어느 글자가 사라지나"는 단어와 글자 위치로 적고, 앞·가운데·뒤 조각은 코드가 계산한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {splitWord, renderCardHtml, CARD_TEMPLATES} from '../sheet-card-templates.mjs';
import {validateSheet, cutTimes, rhythmProblem, ROW_KEYS} from '../transform-sheet.mjs';

test('사라지는 글자는 위치로 적고, 조각을 이으면 원래 단어가 된다(철자를 따로 쓰지 않는다)', () => {
  assert.deepEqual(splitWord('chocolate', [4, 5]), {before: 'choc', gone: 'o', after: 'late'});
  assert.deepEqual(splitWord('vegetable', [3, 4]), {before: 'veg', gone: 'e', after: 'table'});
  assert.deepEqual(splitWord('different', [4, 5]), {before: 'diff', gone: 'e', after: 'rent'});
  assert.deepEqual(splitWord('memory', [3, 4]), {before: 'mem', gone: 'o', after: 'ry'});
  for (const [w, d] of [['chocolate', [4, 5]], ['vegetable', [3, 4]]]) {
    const p = splitWord(w, d);
    assert.equal(p.before + p.gone + p.after, w);
  }
});

test('범위가 단어 밖이거나 비어 있으면 거부한다', () => {
  assert.throws(() => splitWord('chocolate', [4, 4]), /범위/);
  assert.throws(() => splitWord('chocolate', [4, 99]), /범위/);
  assert.throws(() => splitWord('chocolate', [-1, 2]), /범위/);
});

test('모음 사라짐 카드: 흐리게 처리되는 글자는 지정한 한 글자뿐이고 나머지는 그대로', () => {
  const html = renderCardHtml({template: 'vowel-drop', word: 'chocolate', drop: [4, 5], sound: '초클릿', pill: '빨리 말하면 거의 안 들려요'});
  assert.match(html, /<span>choc<\/span><span class="gone">o<\/span><span>late<\/span>/);
  assert.equal((html.match(/class="gone"/g) || []).length, 1);
  assert.match(html, /초클릿/);
  assert.match(html, /빨리 말하면 거의 안 들려요/);
});

test('모든 카드는 정해진 모양(768×1376 세로, 크림 배경)이고 외부에서 온 글자는 이스케이프한다', () => {
  for (const name of Object.keys(CARD_TEMPLATES)) assert.ok(CARD_TEMPLATES[name], name);
  const html = renderCardHtml({template: 'hook', word: 'chocolate', pill: '<script>x</script>'});
  assert.match(html, /zoom:2/);
  assert.match(html, /#F4EFE6/);
  assert.ok(!html.includes('<script>x'));
  assert.throws(() => renderCardHtml({template: '없는 틀'}), /카드 틀/);
});

test('단어 카드(한글 표기 ✗)와 정리표 카드: 단어·소리가 그대로 들어가고 정리표는 줄마다 하나씩', () => {
  const wrong = renderCardHtml({template: 'word-wrong', word: 'vegetable', written: '베지터블'});
  assert.match(wrong, /vegetable/);
  assert.match(wrong, /베지터블/);
  assert.match(wrong, /✗/);
  const recap = renderCardHtml({template: 'recap', rows: [{word: 'chocolate', sound: '초클릿'}, {word: 'vegetable', sound: '베즈터블'}], pill: '정리'});
  assert.equal((recap.match(/class="rrow"/g) || []).length, 2);
});

test('컷 시각은 cuts가 있으면 거기서, 없으면 times에서 읽는다', () => {
  assert.deepEqual(cutTimes({cuts: [{t: 0}, {t: 3}]}), [0, 3]);
  assert.deepEqual(cutTimes({times: [1, 2]}), [1, 2]);
  assert.deepEqual(cutTimes({}), []);
});

test('컷 간격이 거의 일정하면(리듬 없음) 문제로 알린다 — 긴 컷과 짧은 컷이 섞여야 한다', () => {
  assert.ok(rhythmProblem([0, 3.5, 7, 10.5, 14, 17.5, 21, 24.5, 28]));
  assert.equal(rhythmProblem([0, 2.2, 5.5, 9.5, 14, 17.3, 19.5, 22.8, 25, 28.3, 30.5, 35, 40, 44.5]), null);
  assert.equal(rhythmProblem([0, 5]), null, '컷이 너무 적으면 리듬은 보지 않는다(컷 수 규칙이 따로 잡는다)');
});

const row = (key, extra = {}) => ({key, competitor: {text: '경쟁'}, ours: {text: '우리'}, why: '이유', ...extra});
const plan = (cuts, extra = {}) => ({durationSeconds: 50, cuts, ...extra});
const sheetWith = (cutPlan) => ({
  sourceVideoId: 'AAAAAAAAAAA', topic: '소재', status: 'draft', format: 'SHORTS',
  identityShare: {ours: 30, competitor: 70, reason: '근거'},
  rows: ROW_KEYS.map((k) => (k === 'visual' ? row(k, {ours: {text: '우리', cutPlan}}) : row(k))),
  borrowed: [{fromVideoId: 'BBBBBBBBBBB', what: 'x', reason: 'r', evidence: 'e'}], rejected: [],
});
const cut = (t, extra = {}) => ({t, template: 'hook', word: 'chocolate', image: `images/x/cut-${t}.png`, ...extra});

test('컷 계획의 컷마다 이미지 파일이 있어야 한다(글자로만 적은 컷 금지)', () => {
  const cuts = [cut(0), cut(2.2), cut(5.5), cut(9.5), cut(14), cut(17.3)];
  assert.deepEqual(validateSheet(sheetWith(plan(cuts)), {imageExists: () => true}).filter((p) => p.includes('컷')), []);
  const noImage = cuts.map((c, i) => (i === 2 ? {...c, image: ''} : c));
  assert.ok(validateSheet(sheetWith(plan(noImage)), {imageExists: () => true}).some((p) => p.includes('컷 이미지')));
  assert.ok(validateSheet(sheetWith(plan(cuts)), {imageExists: () => false}).some((p) => p.includes('컷 이미지')));
});

test('컷 간격이 일정한 계획은 규칙이 실패한다', () => {
  const even = [0, 3.5, 7, 10.5, 14, 17.5, 21, 24.5, 28, 31.5].map((t) => cut(t));
  assert.ok(validateSheet(sheetWith(plan(even)), {imageExists: () => true}).some((p) => p.includes('일정')));
});

test('카드는 세로 프레임(384×688)의 폭 90% 이상, 높이 70% 이상을 채운다(경쟁의 꽉 찬 화면보다 빈약해 보이지 않게)', () => {
  const html = renderCardHtml({template: 'hook', word: 'chocolate', pill: '질문'});
  const block = (html.match(/\.card\{([^}]*)\}/) || [])[1] || '';
  const width = Number((block.match(/(?:^|;)width:(\d+)px/) || [])[1]);
  const minH = Number((block.match(/min-height:(\d+)px/) || [])[1]);
  assert.ok(width >= 384 * 0.9, `카드 폭 ${width}px가 프레임 폭의 90% 미만`);
  assert.ok(minH >= 688 * 0.7, `카드 최소 높이 ${minH}px가 프레임 높이의 70% 미만`);
});

test('큰 글자 기준: 영어 단어 56px 이상, 한글 소리 64px 이상, 알약 22px 이상(휴대폰에서 읽히게)', () => {
  const html = renderCardHtml({template: 'vowel-drop', word: 'chocolate', drop: [4, 5], sound: '초클릿', pill: 'x'});
  const px = (re) => Number((html.match(re) || [])[1]);
  assert.ok(px(/\.word\{font:900 (\d+)px/) >= 56);
  assert.ok(px(/\.ko\{font:900 (\d+)px/) >= 64);
  assert.ok(px(/\.pill\{[^}]*font:900 (\d+)px/) >= 22);
});

test('긴 문구는 글자 중간이 아니라 단어 단위로, 줄 길이가 고르게 줄바꿈한다(한 글자만 다음 줄로 넘어가지 않게)', () => {
  const html = renderCardHtml({template: 'vowel-drop', word: 'chocolate', drop: [4, 5], sound: '초클릿', pill: '빨리 말하면 거의 안 들려요'});
  assert.match(html, /\.pill\{[^}]*word-break:keep-all[^}]*text-wrap:balance/);
  assert.match(html, /\.say\{[^}]*word-break:keep-all[^}]*text-wrap:balance/);
});

test('칸 수 카드: 한글 글자마다 한 칸, 영어는 한 칸이다(2026-11-16)', () => {
  const html = renderCardHtml({template: 'syl-count', word: 'stress', syl: ['스', '트', '레', '스'], pill: '한글 4칸 → 영어 1마디'});
  assert.equal((html.match(/class="box"/g) || []).length, 4);
  assert.equal((html.match(/class="box one"/g) || []).length, 1);
  assert.ok(html.includes('stress'));
});

test('따라 말하기 카드: 단어와 점 3개가 있고 외부 글자는 이스케이프한다', () => {
  const html = renderCardHtml({template: 'say', word: 'stress', pill: '<b>따라</b>'});
  assert.equal((html.match(/<span><\/span>/g) || []).length, 3);
  assert.ok(!html.includes('<b>'));
});
