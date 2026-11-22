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

test('parseArgs: 기본값(9:16, 5초, 720p, Omni 1.2 Flash, 소리 유지 — 2026-11-21 변경)과 필수 인자를 검사한다', () => {
  const a = parseArgs(['--prompt', 'static camera of brass button', '--output', 'out.mp4']);
  assert.equal(a.model, DEFAULT_MODEL);
  assert.equal(a.aspect, '9:16');
  assert.equal(a.duration, DEFAULT_DURATION);
  assert.equal(a.resolution, DEFAULT_RESOLUTION);
  assert.equal(a.keepAudio, true);

  const b = parseArgs(['--prompt', 'x', '--output', 'out.mp4', '--aspect', '16:9', '--duration', '8', '--resolution', '1080p', '--keep-audio']);
  assert.equal(b.aspect, '16:9');
  assert.equal(b.duration, 8);
  assert.equal(b.resolution, '1080p');
  assert.equal(b.keepAudio, true);

  assert.throws(() => parseArgs(['--output', 'out.mp4']), /--prompt/);
  assert.throws(() => parseArgs(['--prompt', 'x']), /--output/);
});

test('parseArgs: --mute일 때만 무음 정리하고, --mute와 옛 --keep-audio를 같이 주면 막는다', () => {
  assert.equal(parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--mute']).keepAudio, false);
  assert.equal(parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--keep-audio']).keepAudio, true);
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--mute', '--keep-audio']), /--mute와 --keep-audio/);
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

// --- 첫·끝 장면, 참고 첨부, 지시문 파일(2026-11-21) ---
function withTmpFiles(names, fn) {
  const tmp = mkdtempSync(join(tmpdir(), 'omni-attach-'));
  try {
    const paths = names.map((n) => { const p = join(tmp, n); writeFileSync(p, 'x'); return p; });
    return fn(paths, tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

test('parseArgs: --image는 --first의 옛 이름이라 first와 image에 같은 값이 들어간다', () => {
  withTmpFiles(['a.png'], ([a]) => {
    const out = parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--image', a]);
    assert.equal(out.first, a);
    assert.equal(out.image, a);
    assert.equal(out.last, '');
    assert.deepEqual(out.refs, []);
    assert.equal(out.promptFile, '');
  });
});

test('parseArgs: --image와 --first를 같이 주면 막는다', () => {
  withTmpFiles(['a.png', 'b.png'], ([a, b]) => {
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--image', a, '--first', b]), /--image는 --first의 옛 이름/);
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--first', b, '--image', a]), /--image는 --first의 옛 이름/);
  });
});

test('parseArgs: --first·--ref(mp4 포함)·--last 조합과 --prompt-file', () => {
  withTmpFiles(['f.png', 'r1.jpg', 'r2.mp4', 'l.webp', 'p.txt'], ([f, r1, r2, l, p]) => {
    const out = parseArgs(['--output', 'o.mp4', '--first', f, '--ref', r1, '--ref', r2, '--last', l, '--prompt-file', p]);
    assert.equal(out.first, f);
    assert.equal(out.image, f);
    assert.deepEqual(out.refs, [r1, r2]);
    assert.equal(out.last, l);
    assert.equal(out.promptFile, p);
    assert.equal(out.prompt, 'x');
    assert.throws(() => parseArgs(['--prompt', 'y', '--prompt-file', p, '--output', 'o.mp4']), /--prompt-file/);
  });
});

test('parseArgs: 없는 --last·--first 파일과 영상 파일을 --first로 주는 것은 막는다', () => {
  withTmpFiles(['v.mp4'], ([v]) => {
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--last', 'no-such-file-12345.png']), /--last/);
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--first', 'no-such-file-12345.png']), /--first/);
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--first', v]), /--first/);
  });
});


test('parseArgs: 노드 계보 인자(--parent, --changed-var, --status)를 검증한다', () => {
  assert.equal(parseArgs(['--prompt', 'x', '--output', 'o.mp4']).lineage, null);
  withTmpFiles(['anchor.jpg'], ([anchor]) => {
    const out = parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--parent', anchor, '--changed-var', 'angle: low', '--status', 'candidate']);
    assert.deepEqual(out.lineage, { parent: anchor, changedVar: 'angle: low', status: 'candidate' });
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.mp4', '--status', 'invalid']), /--status/);
  });
});
