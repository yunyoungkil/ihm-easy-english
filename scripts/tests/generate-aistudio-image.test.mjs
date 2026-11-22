// scripts/generate-aistudio-image.mjs의 인자 검사와 저장 형식 시험(2026-11-12). 브라우저는 부르지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseArgs, DEFAULT_MODEL, extensionFor, ASPECTS} from '../generate-aistudio-image.mjs';

test('기본값은 16:9, Nano Banana 2.1이고 프롬프트·저장 위치는 꼭 필요하다', () => {
  const a = parseArgs(['--prompt', '그림', '--output', 'a.png']);
  assert.equal(a.aspect, '16:9');
  assert.equal(a.model, DEFAULT_MODEL);
  assert.throws(() => parseArgs(['--output', 'a.png']), /--prompt/);
  assert.throws(() => parseArgs(['--prompt', 'x']), /--output/);
});

test('지원하지 않는 비율과 이상한 모델 이름은 막는다', () => {
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.png', '--aspect', '7:5']), /--aspect/);
  assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'a.png', '--model', 'a b;rm']), /--model/);
  for (const r of ['16:9', '9:16', '1:1', 'Auto']) assert.ok(ASPECTS.includes(r));
});

test('실제 이미지 형식(JPEG/PNG)과 저장 확장자가 다르면 확장자를 맞춘다', () => {
  assert.equal(extensionFor('image/jpeg', 'a.png'), 'a.jpg');
  assert.equal(extensionFor('image/png', 'a.jpg'), 'a.png');
  assert.equal(extensionFor('image/jpeg', 'a.jpeg'), 'a.jpeg');
  assert.equal(extensionFor('image/png', 'dir/a'), 'dir/a.png');
});

// --- 참고 그림·지시문 파일(2026-11-21) ---
function withTmp(fn) {
  const tmp = mkdtempSync(join(tmpdir(), 'aistudio-img-'));
  try { return fn(tmp); } finally { rmSync(tmp, {recursive: true, force: true}); }
}

test('--ref를 여러 번 주면 준 순서대로 refs에 담긴다(기본은 빈 배열)', () => {
  assert.deepEqual(parseArgs(['--prompt', 'x', '--output', 'a.png']).refs, []);
  withTmp((tmp) => {
    const a = join(tmp, 'a.png');
    const b = join(tmp, 'b.jpg');
    writeFileSync(a, 'x');
    writeFileSync(b, 'x');
    const out = parseArgs(['--prompt', 'x', '--output', 'o.png', '--ref', b, '--ref', a]);
    assert.deepEqual(out.refs, [b, a]);
  });
});

test('없는 --ref 파일과 지원하지 않는 확장자(.gif)는 막는다', () => {
  withTmp((tmp) => {
    const gif = join(tmp, 'a.gif');
    writeFileSync(gif, 'x');
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.png', '--ref', join(tmp, 'none.png')]), /--ref/);
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.png', '--ref', gif]), /--ref/);
  });
});

test('--prompt-file은 파일에서 지시문을 읽고, --prompt와 같이 주면 막는다', () => {
  withTmp((tmp) => {
    const p = join(tmp, 'p.txt');
    writeFileSync(p, '  파일 속 지시문\n', 'utf8');
    const out = parseArgs(['--prompt-file', p, '--output', 'o.png']);
    assert.equal(out.prompt, '파일 속 지시문');
    assert.equal(out.promptFile, p);
    assert.throws(() => parseArgs(['--prompt', 'x', '--prompt-file', p, '--output', 'o.png']), /--prompt-file/);
  });
});


test('노드 계보 인자(--parent, --changed-var, --status)를 검증해 lineage에 담는다', () => {
  assert.equal(parseArgs(['--prompt', 'x', '--output', 'o.png']).lineage, null);
  withTmp((tmp) => {
    const p = join(tmp, 'anchor.png');
    writeFileSync(p, 'x');
    const out = parseArgs(['--prompt', 'x', '--output', 'o.png', '--parent', p, '--changed-var', 'lighting: warm', '--status', 'chosen']);
    assert.deepEqual(out.lineage, {parent: p, changedVar: 'lighting: warm', status: 'chosen'});
    assert.throws(() => parseArgs(['--prompt', 'x', '--output', 'o.png', '--status', 'bad']), /--status/);
  });
});
