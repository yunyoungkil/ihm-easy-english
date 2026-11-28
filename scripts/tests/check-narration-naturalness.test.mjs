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

// ---- --compare: 경쟁 영상 말투 합계와 나란히 보기 (2026-11-15) ----
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareWithCompetitors, formatComparison, COMPARE } from '../check-narration-naturalness.mjs';
import { buildSpeechField, buildSpeechPatterns } from '../speech-stats.mjs';

// 실제 롱폼 받아쓰기(tpveKY5pnis)에서 뽑은 문장들 — 경쟁 쪽 기준을 만든다
const THEIR = '오늘은 영어의 기본 부터 시작해서 차근차근 읽고 말하고 쓸 수 있을 때까지 영어를 배워볼 건데요. 그 첫 시간으로 오늘은 알파벳을 배워볼 거예요. 자 그럼 시작하겠습니다. 자 영어에는 총 26가지의 문자가 있어요. 당연히 말의 가장 기본은 문자를 먼저 아는 것이겠죠. 그래서 말의 속도가 빨라질수록 이러한 현상이 좀 더 많이 생기죠. 여러분, 이거 왜 리스트니 아닐까요? 궁금한 적 없으세요?';
const patternsWith = (videoCount, kind = 'long') => buildSpeechPatterns(Array.from({ length: videoCount }, (_, i) => ({
  videoId: `v${String(i).padStart(10, '0')}`, meta: { channelTitle: '채널' },
  speech: buildSpeechField({ text: THEIR, source: 'transcript-api', kind, now: new Date('2026-11-15T00:00:00Z') }),
})), new Date('2026-11-15T00:00:00Z'));
// 우리 쇼츠 대본(OURS)처럼 "~라는 뜻의"가 있고 끝이 모두 해요체, 말버릇이 없는 글
const OURS_MD = wrap(
  '초콜릿, 어떻게 읽으세요?', '글자는 초콜릿, 소리는 초클릿처럼 들려요.', '빨리 말하면 가운데 글자 소리가 거의 안 들려요.', '영어도 비슷해요.',
  '채소 베지터블, 이렇게 읽기 쉬워요.', '여기도 가운데 소리가 거의 안 들려요.', '다르다는 뜻의 디퍼런트도 마찬가지예요.', '기억이라는 뜻의 메모리는요?',
  '멤리, 두 마디로 줄기도 해요.', '매일 쓰는 단어인데, 소리는 달랐어요.',
);

test('--compare 판정: 경쟁 영상이 3편 미만이면 비교하지 않는다', () => {
  assert.equal(COMPARE.MIN_VIDEOS, 3);
  const c = compareWithCompetitors(OURS_MD, patternsWith(COMPARE.MIN_VIDEOS - 1));
  assert.equal(c.ok, false);
  assert.match(c.reason, /부족/);
  assert.equal(compareWithCompetitors(OURS_MD, null).ok, false);
  assert.equal(compareWithCompetitors(OURS_MD, patternsWith(5), { kind: 'short' }).ok, false); // 쇼츠 기준은 0편
});

test('--compare 판정: 3편 이상이면 숫자를 나란히 놓고 크게 벗어난 항목을 짚는다', () => {
  const c = compareWithCompetitors(OURS_MD, patternsWith(COMPARE.MIN_VIDEOS));
  assert.equal(c.ok, true);
  assert.equal(c.theirs.dictFramePct, 0);
  assert.ok(c.ours.dictFramePct > 0);
  const text = c.flags.join('\n');
  assert.match(text, /사전 풀이 모양/); // 우리만 있음
  assert.match(text, /끝맺음이 한 가지에 쏠림/); // 해요체가 경쟁보다 15%p 넘게 많음
  assert.match(text, /말버릇/); // 우리 0, 경쟁은 있음
  const out = formatComparison(c).join('\n');
  assert.match(out, /우리 .*경쟁/);
  assert.match(out, /제안일 뿐/);
  assert.match(out, /사용자의 귀/);
});

test('--compare 판정: 경쟁과 같은 글이면 짚을 항목이 없다', () => {
  const c = compareWithCompetitors(wrap(...THEIR.split(/(?<=[.?])\s+/)), patternsWith(3));
  assert.equal(c.ok, true);
  assert.deepEqual(c.flags, []);
});

test('--compare CLI: 옵션이 없으면 비교 줄이 없고, 있으면 기준이 없다는 말이 나온다(종료코드는 그대로)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'naturalness-'));
  try {
    const file = join(dir, 'SCRIPT.md');
    writeFileSync(file, OURS_MD, 'utf8');
    const script = fileURLToPath(new URL('../check-narration-naturalness.mjs', import.meta.url));
    const plain = spawnSync(process.execPath, [script, file], { encoding: 'utf8' });
    assert.equal(plain.status, 0);
    assert.ok(!plain.stdout.includes('[비교]'));
    const withCompare = spawnSync(process.execPath, [script, file, '--compare'], { encoding: 'utf8' });
    assert.equal(withCompare.status, 0);
    assert.match(withCompare.stdout, /\[비교\]/);
    assert.ok(withCompare.stdout.startsWith(plain.stdout.trimEnd().split('\n')[0])); // 기본 출력 첫 줄은 같다
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('extractNarration: text 블록이 없는 표 형식 쇼츠 SCRIPT.md에서 한국어 나레이션 열을 추출하고 무나레이션 지시문은 건너뛴다', () => {
  const md = [
    '# EP35 쇼츠 대본',
    '| 컷 | 시작(초) | 길이(초) | 한국어 나레이션 (고유어 입말) | 원어민 음성 |',
    '|---:|---:|---:|---|---|',
    '| 0 | 0.0 | 4.0 | 연어 살몬, 영어에선 엘을 안 읽어요. | — |',
    '| 1 | 4.0 | 4.8 | *(무나레이션 — 순수 귀 증명)* | salmon |',
    '| 2 | 8.8 | 3.0 | 피 글자 빼고 리싯으로 읽어요. | receipt |',
  ].join('\n');
  const rows = extractNarration(md);
  assert.deepEqual(rows.map((r) => r.text), [
    '연어 살몬, 영어에선 엘을 안 읽어요.',
    '피 글자 빼고 리싯으로 읽어요.',
  ]);
  assert.equal(checkNarration(md).sentenceCount, 2);
});

test('구조 경고(2026-11-24): 컷마다 3~4문장 균일 요약 카드(uniform-cut-blocks)와 교과서 대칭(ai-symmetry-tics)을 잡는다', () => {
  const uniformBlocks = Array.from({ length: 6 }, (_, i) => [
    `### cut-0${i}`,
    '```text',
    `첫 번째 두 번째 세 번째 순서로 봅니다. 이것도 똑같아요. 저것도 마찬가지예요. 얘도 역시 똑같습니다.`,
    '```',
  ].join('\n')).join('\n\n');
  const ks = kinds(uniformBlocks);
  assert.ok(ks.includes('uniform-cut-blocks'));
  assert.ok(ks.includes('ai-symmetry-tics'));
});

test('--compare 구조 경고(2026-11-24): 권유 어미 과다와 입말 끊김(other) 부족을 짚는다', () => {
  // 경쟁 롱폼에 other(입말 끊김)가 20% 이상이고 command가 거의 없는 기준 생성 (한글 150자·문장 8개 이상 품질 통과)
  const HUMAN_WITH_OTHER = '자 여러분 이거 영어 듣기할 때 진짜 중요해요. 그냥 대충 넘어가면 평생 안 들려요. 바로 이 소리! 딱 한 박자. 근데 한국어는 글자마다 모음이 다 붙어서 소리가 달라요. 자음 뒤에 으가 막 붙어서 길게 늘어나죠. 진짜로요. 아, 여기 입 모양 잠깐 봐요. 완전 딴소리! 자 그러면 다음 단어로 넘어가 볼게요. 사실 처음엔 누구나 헷갈려요. 눈으로 보는 철자랑 귀로 들리는 소리가 완전히 다르거든요. 완전 딴판!';
  const pats = buildSpeechPatterns(Array.from({ length: 3 }, (_, i) => ({
    videoId: `h${String(i).padStart(10, '0')}`, meta: { channelTitle: `채널${i}` },
    speech: buildSpeechField({ text: HUMAN_WITH_OTHER, source: 'transcript-api', kind: 'long', now: new Date('2026-11-24T00:00:00Z') }),
  })), new Date('2026-11-24T00:00:00Z'));
  const ROBOT_MD = wrap(
    '지금부터 확인해 보세요.', '천천히 들어 보세요.', '눈으로 비교해 보세요.', '끝까지 지켜 보세요.',
    '첫 번째 원리입니다.', '두 번째 원리입니다.', '세 번째 원리입니다.', '정리하겠습니다.', '기억해 두세요.', '남겨 주세요.',
  );
  const c = compareWithCompetitors(ROBOT_MD, pats, { kind: 'long' });
  assert.equal(c.ok, true);
  const joined = c.flags.join('\n');
  assert.match(joined, /권유·지시 어미/);
  assert.match(joined, /명사·입말 끊김/);
});

test('lecture-style(2026-11-26): 딱딱한 강의체 2회 이상이면 비차단 warn, 1회 이하는 통과', () => {
  const stiff = wrap(
    '이번 시간에는 두 가지 표현을 알아보도록 하겠습니다.',
    '따라서 문맥을 정확히 파악하셔야 합니다.',
  );
  const r = checkNarration(stiff);
  const hit = r.issues.find((i) => i.kind === 'lecture-style');
  assert.ok(hit);
  assert.equal(hit.severity, 'warn');

  const natural = wrap('오늘은 두 가지만 비교해 볼게요.', '쉽게 말하면 방향 차이예요.');
  assert.ok(!kinds(natural).includes('lecture-style'));
});

// 2026-11-28 EP38: "나:" 줄로 쓴 통대본에서 나레이션을 하나도 못 뽑고 화면 지시문만 읽어,
// --compare가 "한글 문장을 찾지 못함"을 내는데도 통과로 셌다(사용자 지적 후 Gemini 검수로 드러남).
test('extractNarration: "나:" 통대본은 나: 줄만 뽑고 [화면]·[EN]·[쉼] 지시문은 뺀다', () => {
  const md = [
    '# 대본', '> 설명 줄', '## 0. 여는 장면',
    '[화면: 상자 뒷면 클로즈업. 펜이 글자를 짚는다.', '나: 상자 뒷면에 적힌 영어 단어 하나예요.',
    '[EN: instructions]', '[쉼 3초]', '나: 그런데 이 단어는 손뼉 세 번이면 끝나요.',
  ].join('\n');
  const rows = extractNarration(md);
  assert.deepEqual(rows.map((x) => x.text), ['상자 뒷면에 적힌 영어 단어 하나예요.', '그런데 이 단어는 손뼉 세 번이면 끝나요.']);
  assert.deepEqual(rows.map((x) => x.line), [5, 8]);
  const many = Array.from({ length: 10 }, (_, i) => `나: 이건 ${i + 1}번째 문장이에요.`).join('\n[화면: 그림]\n');
  const c = compareWithCompetitors(many, patternsWith(COMPARE.MIN_VIDEOS));
  assert.equal(c.ok, true);
  assert.equal(c.ours.sentences, 10);
});
