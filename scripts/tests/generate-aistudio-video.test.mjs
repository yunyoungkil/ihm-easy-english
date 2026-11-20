import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  parseArgs,
  extensionForVideo,
  stripVideoAudio,
  DEFAULT_MODEL,
  DEFAULT_DURATION,
  DEFAULT_RESOLUTION,
  ASPECTS,
  RESOLUTIONS,
  RUN_BUTTON,
} from '../generate-aistudio-video.mjs';

test('RUN_BUTTON: 실제 클래스 ctrl-enter-submits(끝에 s)를 잡는다(2026-11-21 확인)', () => {
  assert.match(RUN_BUTTON, /button\.ctrl-enter-submits\b/);
});

test('parseArgs: 기본값(9:16, 5초, 720p, Omni 1.2 Flash, 기본 무음 정리)과 필수 인자를 검사한다', () => {
  const a = parseArgs(['--prompt', 'static camera of brass button', '--output', 'out.mp4']);
  assert.equal(a.model, DEFAULT_MODEL);
  assert.equal(a.aspect, '9:16');
  assert.equal(a.duration, DEFAULT_DURATION);
  assert.equal(a.resolution, DEFAULT_RESOLUTION);
  assert.equal(a.keepAudio, false);

  const b = parseArgs(['--prompt', 'x', '--output', 'out.mp4', '--aspect', '16:9', '--duration', '8', '--resolution', '1080p', '--keep-audio']);
  assert.equal(b.aspect, '16:9');
  assert.equal(b.duration, 8);
  assert.equal(b.resolution, '1080p');
  assert.equal(b.keepAudio, true);

  assert.throws(() => parseArgs(['--output', 'out.mp4']), /--prompt/);
  assert.throws(() => parseArgs(['--prompt', 'x']), /--output/);
});

test('parseArgs: 1:1 비율·범위 밖 길이·미지원 해상도·없는 첨부 이미지를 막는다', () => {
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.mp4', '--aspect', '1:1']), /--aspect/);
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.mp4', '--duration', '2']), /--duration/);
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.mp4', '--duration', '20']), /--duration/);
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.mp4', '--resolution', '2k']), /--resolution/);
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.mp4', '--image', 'no-such-file-12345.jpg']), /--image/);
  assert.deepEqual(ASPECTS, ['Auto', '16:9', '9:16']);
  assert.deepEqual(RESOLUTIONS, ['360p', '720p', '1080p', '4k']);
});

test('extensionForVideo: MIME에 맞춰 확장자를 정리한다', () => {
  assert.equal(extensionForVideo('video/mp4', 'clip.mp4'), 'clip.mp4');
  assert.equal(extensionForVideo('video/mp4', 'clip.mov'), 'clip.mp4');
  assert.equal(extensionForVideo('video/webm; codecs=vp9', 'dir/clip'), 'dir/clip.webm');
});

test('stripVideoAudio: ffmpeg -an -c:v copy로 무음 교체하고 실패 시 예외를 던진다', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'omni-video-'));
  try {
    const target = join(tmp, 'clip.mp4');
    writeFileSync(target, 'orig');
    let seenArgs = null;
    stripVideoAudio(target, (_bin, args) => {
      seenArgs = args;
      writeFileSync(args[args.length - 1], 'muted');
      return { status: 0, stderr: '' };
    });
    assert.ok(seenArgs.includes('-an') && seenArgs.includes('-c:v') && seenArgs.includes('copy'));
    assert.throws(() => stripVideoAudio(target, () => ({ status: 1, stderr: 'bad' })), /무음 정리/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
