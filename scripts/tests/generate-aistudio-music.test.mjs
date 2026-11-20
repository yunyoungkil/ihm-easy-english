import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseArgs,
  parseSections,
  validateMusicPrompt,
  extensionForAudio,
  stripAudioMetadata,
  DEFAULT_MODEL,
  DEFAULT_SECTIONS,
  RUN_BUTTON,
} from '../generate-aistudio-music.mjs';

test('RUN_BUTTON: 실제 클래스 ctrl-enter-submits(끝에 s)를 잡는다(2026-11-21, s 없는 이름만 찾다가 3분 헛기다림)', () => {
  assert.match(RUN_BUTTON, /button\.ctrl-enter-submits\b/);
  assert.match(RUN_BUTTON, /Generate/);
});

test('parseArgs: 기본값(Composer 모드, Lyria 3.5, 3구간, 메타 정리)과 필수 인자를 검사한다', () => {
  const a = parseArgs(['--prompt', 'Instrumental only, 95 BPM, warm felt piano', '--output', 'bgm.mp3']);
  assert.equal(a.model, DEFAULT_MODEL);
  assert.equal(a.mode, 'composer');
  assert.equal(a.keepMetadata, false);
  assert.equal(a.parsedSections.length, 3);
  assert.equal(a.parsedSections[0].type, 'Intro');

  assert.throws(() => parseArgs(['--output', 'bgm.mp3']), /--prompt/);
  assert.throws(() => parseArgs(['--prompt', 'Instrumental piano']), /--output/);
  assert.throws(() => parseArgs(['--prompt', 'Instrumental piano', '--output', 'a.mp3', '--mode', 'bad']), /--mode/);
});

test('validateMusicPrompt: 보컬·허밍 역효과 단어를 기본 차단하고 --allow-vocals로만 허용한다', () => {
  assert.throws(() => validateMusicPrompt('Calm piano, no vocals, no humming'), /허밍/);
  assert.throws(() => parseArgs(['--prompt', 'Soft beat with no lyrics', '--output', 'a.mp3']), /허밍/);
  assert.doesNotThrow(() => validateMusicPrompt('Soft beat with vocals', { allowVocals: true }));
  assert.doesNotThrow(() => validateMusicPrompt('Instrumental only, 96 BPM, warm acoustic guitar and light percussion'));
});

test('parseSections: 구간 문자열을 파싱하고 잘못된 형식·구간 이름을 막는다', () => {
  const list = parseSections(DEFAULT_SECTIONS);
  assert.deepEqual(list.map((s) => [s.type, s.start, s.end]), [
    ['Intro', '0:00', '0:06'],
    ['Verse', '0:06', '0:36'],
    ['Outro', '0:36', '0:44'],
  ]);
  const withNote = parseSections('Intro:0:00-0:05:Warm piano,Outro:0:05-0:15:Soft fade');
  assert.equal(withNote[0].prompt, 'Warm piano');
  assert.throws(() => parseSections('Invalid:0:00-0:10'), /지원하지 않는 구간/);
  assert.throws(() => parseSections('Intro-bad'), /형식/);
});

test('extensionForAudio & stripAudioMetadata: 확장자 정리 및 ffmpeg 메타데이터 제거를 검증한다', () => {
  assert.equal(extensionForAudio('audio/mpeg', 'track.wav'), 'track.mp3');
  assert.equal(extensionForAudio('audio/wav', 'dir/track'), 'dir/track.wav');

  const tmp = mkdtempSync(join(tmpdir(), 'lyria-music-'));
  try {
    const file = join(tmp, 'track.mp3');
    writeFileSync(file, 'raw-mp3');
    let seenArgs = null;
    stripAudioMetadata(file, (_bin, args) => {
      seenArgs = args;
      writeFileSync(args[args.length - 1], 'clean-mp3');
      return { status: 0, stderr: '' };
    });
    assert.ok(seenArgs.includes('-map_metadata') && seenArgs.includes('-1') && seenArgs.includes('-c:a'));
    assert.throws(() => stripAudioMetadata(file, () => ({ status: 1, stderr: 'err' })), /메타데이터 정리/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
