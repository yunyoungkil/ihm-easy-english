// scripts/generate-aistudio-speech.mjs의 순수 함수 시험(2026-11-16). 브라우저는 부르지 않는다.
// 이 스크립트는 만들어 시험까지 했지만 EP30 음성은 사용자 결정으로 API(무료 키)로 만들었다. 화면 방식은 보관용이다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseArgs, validateText, spokenText, decodeAudioDataUrl, ALLOWED_TAGS, DEFAULT_VOICE} from '../generate-aistudio-speech.mjs';

test('기본 목소리는 Gero이고 대본·저장 위치는 꼭 필요하다', () => {
  const a = parseArgs(['--text', '안녕하세요.', '--output', 'a.wav']);
  assert.equal(a.voice, DEFAULT_VOICE);
  assert.equal(DEFAULT_VOICE, 'Gero');
  assert.throws(() => parseArgs(['--output', 'a.wav']), /--text/);
  assert.throws(() => parseArgs(['--text', '안녕']), /--output/);
  assert.throws(() => parseArgs(['--text', '안녕', '--output', 'a.wav', '--voice', 'gero;x']), /--voice/);
});

test('스타일 지시는 영어만 받는다(한글 지시문은 소리로 읽힐 수 있다)', () => {
  assert.throws(() => parseArgs(['--text', '안녕', '--output', 'a.wav', '--style', '차분하게']), /영어/);
  assert.doesNotThrow(() => parseArgs(['--text', '안녕', '--output', 'a.wav', '--style', 'calm and warm']));
});

test('태그는 화면 목록에 있는 영어 소문자만 허용한다', () => {
  assert.doesNotThrow(() => validateText('뜻이에요. <short pause> 몇 마디일까요?'));
  assert.doesNotThrow(() => validateText('<breath> 자, 시작합니다.'));
  assert.throws(() => validateText('안녕 <쉼>'), /한글 태그/);
  assert.throws(() => validateText('안녕 <Short Pause>'), /소문자/);
  assert.throws(() => validateText('안녕 <applause>'), /허용 목록/);
  assert.throws(() => validateText('안녕 <short pause'), /닫히지/);
  assert.ok(ALLOWED_TAGS.includes('short pause') && ALLOWED_TAGS.includes('long pause'));
  assert.equal(ALLOWED_TAGS.length, 40);
});

test('괄호 지시문과 빈 대본은 거부한다', () => {
  assert.throws(() => validateText('(차분하게) 안녕하세요'), /괄호 지시문/);
  assert.throws(() => validateText('안녕 [웃으며]'), /괄호 지시문/);
  assert.throws(() => validateText('   '), /비어/);
});

test('spokenText는 태그를 뺀 읽힐 글만 돌려준다', () => {
  assert.equal(spokenText('뜻이에요. <short pause> 몇 마디일까요?'), '뜻이에요. 몇 마디일까요?');
});

test('data:audio 주소를 파일 바이트로 풀고, 아닌 것은 거부한다', () => {
  const src = 'data:audio/wav;base64,' + Buffer.from('RIFFtest').toString('base64');
  const {mime, bytes} = decodeAudioDataUrl(src);
  assert.equal(mime, 'audio/wav');
  assert.equal(bytes.toString(), 'RIFFtest');
  assert.throws(() => decodeAudioDataUrl('blob:https://x/1'), /형식/);
});
