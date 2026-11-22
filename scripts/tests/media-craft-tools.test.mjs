// scripts/media-craft-tools.mjs 시험(2026-11-22). 실제 ffmpeg/ffprobe로 임시 미디어를 만들어 6대 도구를 끝단까지 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  probeMedia,
  splitGrid,
  extractFrame,
  extractRefClip,
  unifyTone,
  detectBeatsFromPcm,
  detectBeats,
  parseSignalStats,
  compareVisualMetrics,
  parseCliArgs,
} from '../media-craft-tools.mjs';

function withTmp(fn) {
  const tmp = mkdtempSync(join(tmpdir(), 'media-craft-'));
  try { return fn(tmp); } finally { rmSync(tmp, { recursive: true, force: true }); }
}

function makeTestVideo(outPath, { color = '0x336699', duration = 2, withAudio = true } = {}) {
  const args = ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=${color}:s=180x120:r=10:d=${duration}`];
  if (withAudio) args.push('-f', 'lavfi', '-i', `sine=frequency=440:duration=${duration}`);
  args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p');
  if (withAudio) args.push('-c:a', 'aac');
  args.push(outPath);
  const res = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`test video 생성 실패: ${res.stderr}`);
}

test('splitGrid: 3x3 그리드 이미지 1장을 9개 패널로 정확히 크롭한다', () => {
  withTmp((tmp) => {
    const grid = join(tmp, 'grid.png');
    const res = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc=size=300x300:duration=1', '-frames:v', '1', grid], { encoding: 'utf8' });
    assert.equal(res.status, 0);

    const out = splitGrid({ input: grid, outDir: join(tmp, 'panels'), rows: 3, cols: 3, trimPx: 2 });
    assert.equal(out.files.length, 9);
    assert.equal(out.cellWidth, 96);
    assert.equal(out.cellHeight, 96);
    for (const f of out.files) assert.ok(existsSync(f));
    const p1 = probeMedia(out.files[0]);
    assert.equal(p1.width, 96);
    assert.equal(p1.height, 96);
  });
});

test('extractFrame / extractRefClip / unifyTone: 부분 수정 프레임·레퍼런스 클립·8bit 톤/속도 보정이 동작한다', () => {
  withTmp((tmp) => {
    const vid = join(tmp, 'src.mp4');
    makeTestVideo(vid, { color: '0x224466', duration: 3, withAudio: true });

    const frame = extractFrame({ input: vid, time: 1.0, output: join(tmp, 'f.png') });
    assert.ok(existsSync(frame.output));
    assert.equal(probeMedia(frame.output).width, 180);

    const refClip = extractRefClip({ input: vid, start: 0.5, duration: 1.5, output: join(tmp, 'ref.mp4'), mute: true });
    assert.ok(existsSync(refClip.output));
    const refMeta = probeMedia(refClip.output);
    assert.equal(refMeta.hasAudio, false);
    assert.ok(refMeta.durationSeconds >= 1.2 && refMeta.durationSeconds <= 1.8);

    const toned = unifyTone({ input: vid, output: join(tmp, 'clean.mp4'), brightness: 0.05, contrast: 1.05, saturation: 0.9, grain: 3, speed: 1.5 });
    assert.ok(existsSync(toned.output));
    const tonedMeta = probeMedia(toned.output);
    assert.equal(tonedMeta.hasAudio, true);
    assert.ok(tonedMeta.durationSeconds < 2.3);
  });
});

test('detectBeatsFromPcm & detectBeats: 120 BPM 주기 펄스에서 비트 시각과 BPM을 추출한다', () => {
  const sr = 16000;
  const durSec = 3;
  const buf = Buffer.alloc(sr * durSec * 2);
  // 0.5초 간격(120 BPM)으로 40ms 펄스 주입: 0.5, 1.0, 1.5, 2.0, 2.5초
  for (const beatSec of [0.5, 1.0, 1.5, 2.0, 2.5]) {
    const start = Math.floor(beatSec * sr);
    for (let j = 0; j < Math.floor(0.04 * sr); j += 1) {
      const val = Math.round(Math.sin((2 * Math.PI * 220 * j) / sr) * 28000);
      buf.writeInt16LE(val, (start + j) * 2);
    }
  }
  const pure = detectBeatsFromPcm(buf, sr, { threshold: 0.35, minGapSec: 0.25 });
  assert.ok(pure.beats.length >= 4);
  assert.ok(pure.bpm >= 115 && pure.bpm <= 125, `예상 120 BPM 근처, 실제 ${pure.bpm}`);

  // 무음은 bpm null, beats []
  const silent = detectBeatsFromPcm(Buffer.alloc(sr * 2), sr);
  assert.equal(silent.bpm, null);
  assert.deepEqual(silent.beats, []);

  // 실제 WAV 파일을 ffmpeg로 디코딩해 detectBeats 끝단 검증
  withTmp((tmp) => {
    const wav = join(tmp, 'click.wav');
    const jsonOut = join(tmp, 'beats.json');
    const mk = spawnSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'aevalsrc=if(lt(mod(t\\,0.5)\\,0.03)\\,0.8*sin(2*PI*300*t)\\,0):s=16000:d=2.5', wav], { encoding: 'utf8' });
    assert.equal(mk.status, 0);
    const res = detectBeats({ input: wav, output: jsonOut, threshold: 0.35, minGapSec: 0.25 });
    assert.ok(existsSync(jsonOut));
    assert.ok(res.beats.length >= 3);
    assert.deepEqual(JSON.parse(readFileSync(jsonOut, 'utf8')).beats, res.beats);
  });
});

test('parseSignalStats & compareVisualMetrics: 밝기·채도·움직임 수치를 실제 영상 두 편에서 대조한다', () => {
  const parsed = parseSignalStats('lavfi.signalstats.YAVG=100\nlavfi.signalstats.SATAVG=20\nlavfi.signalstats.YDIF=2.5\nlavfi.signalstats.YAVG=140\nlavfi.signalstats.SATAVG=40\nlavfi.signalstats.YDIF=5.5\n');
  assert.deepEqual(parsed, { sampledFrames: 2, avgBrightness: 120, avgSaturation: 30, avgMotionDiff: 4 });

  withTmp((tmp) => {
    const dark = join(tmp, 'dark.mp4');
    const bright = join(tmp, 'bright.mp4');
    makeTestVideo(dark, { color: '0x101010', duration: 2, withAudio: false });
    makeTestVideo(bright, { color: '0xe0e0e0', duration: 2, withAudio: false });
    const cmp = compareVisualMetrics({ ref: dark, ours: bright, fps: 2 });
    assert.ok(cmp.ours.avgBrightness > cmp.ref.avgBrightness + 100);
    assert.ok(cmp.diff.avgBrightness > 100);
    assert.equal(typeof cmp.ours.sceneCuts, 'number');
  });
});

test('parseCliArgs: 케밥 케이스 플래그·위치 인자·--mute 불리언을 파싱한다', () => {
  const { cmd, opts } = parseCliArgs(['extract-ref-clip', '--input', 'a.mp4', '--out-dir', 'd', '--trim-px', '4', '--mute']);
  assert.equal(cmd, 'extract-ref-clip');
  assert.deepEqual(opts, { _: [], input: 'a.mp4', outDir: 'd', trimPx: '4', mute: true });

  const pos = parseCliArgs(['lineage', 'videos/ep33-test-ai-craft/assets']);
  assert.equal(pos.cmd, 'lineage');
  assert.deepEqual(pos.opts, { _: ['videos/ep33-test-ai-craft/assets'] });
});
