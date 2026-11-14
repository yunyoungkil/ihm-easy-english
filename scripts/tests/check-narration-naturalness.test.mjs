import test from 'node:test';
import assert from 'node:assert/strict';
import { checkNarration, extractNarration, splitSentences } from '../check-narration-naturalness.mjs';

const wrap = (...lines) => '# 제목\n```text\n' + lines.join('\n') + '\n```\nEnglish only line.\n';
const kinds = (md) => checkNarration(md).issues.map((i) => i.kind);

test('extractNarration: text 블록의 한글 줄만, 영어 줄과 메모 줄은 제외', () => {
  const md = '```text\n오늘은 비와 브이입니다.\nIs this the best vest you have?\n- 메모 줄입니다\n```\n밖의 한글 줄.';
  assert.deepEqual(extractNarration(md).map((x) => x.line), [2]);
});

test('splitSentences: 마침표와 물음표 기준', () => {
  assert.equal(splitSentences([{ line: 1, text: '첫째입니다. 둘째인가요? 셋째!' }]).length, 3);
});

test('banned-phrase: EP21의 "속으신 겁니다"(error)', () => {
  const r = checkNarration(wrap('City, 사전에서 배운 대로 또박또박 "시티"라고 읽으셨다면, 사실 완벽하게 속으신 겁니다.'));
  assert.ok(r.issues.some((i) => i.kind === 'banned-phrase' && i.severity === 'error'));
});

test('banned-phrase: AGENTS 11번 약장수·번역투·reassurance', () => {
  assert.ok(kinds(wrap('이 영상 하나로 단숨에 꿰뚫어 드립니다.')).includes('banned-phrase'));
  assert.ok(kinds(wrap('귀에 힘을 집중하시고 들어 보세요.')).includes('banned-phrase'));
  assert.ok(kinds(wrap('이건 당신 탓이 아니에요.')).includes('banned-phrase'));
});

test('object-particle-missing: EP22의 "귀 뚫어 드리겠습니다"', () => {
  const r = checkNarration(wrap('평생 헷갈리던 과거형 발음의 원리를 완벽하게 귀 뚫어 드리겠습니다.'));
  assert.ok(r.issues.some((i) => i.kind === 'object-particle-missing'));
  assert.ok(!kinds(wrap('여러분의 귀를 확실하게 뚫어 드리겠습니다.')).includes('object-particle-missing'));
});

test('ending-repeat: ~는 겁니다 틀 3회 이상', () => {
  const md = wrap('그래서 끝소리가 바뀌는 겁니다.', '사실 이렇게 읽는 겁니다.', '이게 소리의 원리인 겁니다.', '다음으로 넘어갑니다.');
  assert.ok(kinds(md).includes('ending-repeat'));
  assert.ok(!kinds(wrap('그래서 끝소리가 바뀌는 겁니다.', '다음으로 넘어갑니다.')).includes('ending-repeat'));
});

test('sentence-opener-repeat: 솔직히 3회', () => {
  const md = wrap('솔직히 헷갈리죠.', '솔직히 저도 그랬어요.', '솔직히 다 똑같이 들려요.');
  assert.ok(kinds(md).includes('sentence-opener-repeat'));
});

test('long-chain: 긴 문장에 접속어미 3동작', () => {
  const md = wrap('궁금해서 원어민 영상을 수십 개 찾아서 슬로모션으로 돌려서 끝소리를 하나하나 들어봤습니다.');
  assert.ok(kinds(md).includes('long-chain'));
});

test('fabricated-first-person: 확인필요 등급', () => {
  const r = checkNarration(wrap('저도 이 단어들을 녹음해서 들어봤어요.'));
  const f = r.issues.find((i) => i.kind === 'fabricated-first-person');
  assert.ok(f);
  assert.equal(f.severity, '확인필요');
});

test('정상 문장은 통과: EP29 도입부', () => {
  const md = wrap('학창 시절부터 지금까지, 우리는 베스트셀러도 베스트, 입는 조끼도 베스트라고 똑같이 읽어왔습니다. 그런데 원어민 앞에서 이 단어를 말하면 전혀 엉뚱하게 알아듣습니다.');
  assert.equal(checkNarration(md).issues.length, 0);
});

test('jagged-lack: 길이가 똑같은 문장 8개', () => {
  const md = wrap(...Array.from({ length: 8 }, (_, i) => `이 소리는 이렇게 똑같은 길이로 읽습니다${i % 2 ? '요' : '다'}.`));
  assert.ok(kinds(md).includes('jagged-lack'));
});
