import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { htmlHasBed, parseArgs, findCarveScript, findCoreDir, runCarve } from '../run-carve.mjs';

test('htmlHasBed: id="bgm" 또는 data-audio-group="bgm" 오디오 태그를 감지한다', () => {
  assert.equal(htmlHasBed('<audio id="bgm" src="assets/bgm/track.mp3"></audio>'), true);
  assert.equal(htmlHasBed('<audio id="music" data-audio-group="bgm" src="a.mp3"></audio>'), true);
  assert.equal(htmlHasBed('<audio id="v1" data-audio-group="voiceover" src="v1.wav"></audio>'), false);
  assert.equal(htmlHasBed('<audio id="customBed" src="a.mp3"></audio>', 'customBed'), true);
});

test('parseArgs: 기본값과 --bed/--strength/--dry-run 옵션을 파싱하고 잘못된 강도를 막는다', () => {
  const a = parseArgs(['videos/ep33-shorts-swallowed-t', '--dry-run', '--strength', '0.6', '--bed', 'music']);
  assert.deepEqual(a, { target: 'videos/ep33-shorts-swallowed-t', bed: 'music', strength: 0.6, dryRun: true, skip: false });
  assert.throws(() => parseArgs([]), /사용법/);
  assert.throws(() => parseArgs(['videos/x', '--strength', '1.5']), /0에서 1/);
});

test('findCarveScript / findCoreDir: 환경변수·홈·프로젝트 폴더 순으로 실제 파일을 찾는다', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-carve-'));
  try {
    const fakeCarve = join(tmp, 'custom-carve.mjs');
    writeFileSync(fakeCarve, '// fake', 'utf8');
    assert.equal(findCarveScript({ env: { CARVE_SCRIPT: fakeCarve }, homeDir: tmp, projectDir: tmp }), fakeCarve);

    const fakeCore = join(tmp, 'node_modules', '@hyperframes', 'core');
    mkdirSync(fakeCore, { recursive: true });
    assert.equal(findCoreDir(join(tmp, 'videos', 'ep99'), tmp), tmp);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test('runCarve: BGM이 없으면 건너뛰고, BGM이 있으면 --core와 함께 carve.mjs를 실행한다', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'run-carve-exec-'));
  try {
    const fakeCarve = join(tmp, 'carve.mjs');
    writeFileSync(fakeCarve, '// fake', 'utf8');
    const compDir = join(tmp, 'videos', 'ep-test');
    mkdirSync(compDir, { recursive: true });

    // 1) BGM 없음 -> skipped
    writeFileSync(join(compDir, 'index.html'), '<audio id="v1" data-audio-group="voiceover"></audio>', 'utf8');
    const skipped = runCarve({ dir: compDir, carveScript: fakeCarve, coreDir: tmp });
    assert.equal(skipped.ok, true);
    assert.equal(skipped.skipped, true);
    assert.equal(skipped.reason, 'no-bgm');

    // 2) BGM 있음 -> runner 호출 인자 확인
    writeFileSync(join(compDir, 'index.html'), '<audio id="bgm" src="a.mp3"></audio><audio id="v1" data-audio-group="voiceover"></audio>', 'utf8');
    let called = null;
    const ok = runCarve({
      dir: compDir,
      dryRun: true,
      carveScript: fakeCarve,
      coreDir: tmp,
      runner: (bin, args, opts) => {
        called = { bin, args, opts };
        return { status: 0, stdout: 'line1\nCarved bgm: 7 lanes, max -18dB\n', stderr: '' };
      },
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.skipped, false);
    assert.equal(ok.summary, 'Carved bgm: 7 lanes, max -18dB');
    assert.deepEqual(called.args, [fakeCarve, '--comp', 'index.html', '--bed', 'bgm', '--strength', '0.8', '--core', tmp, '--dry-run']);
    assert.equal(called.opts.cwd, compDir);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
