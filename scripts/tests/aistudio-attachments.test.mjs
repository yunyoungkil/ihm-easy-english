// scripts/aistudio-attachments.mjs 시험(2026-11-21). 브라우저는 부르지 않는다(attachFiles 제외).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  IMAGE_EXT,
  VIDEO_EXT,
  checkRefFile,
  readPromptArgs,
  orderAttachments,
  framePromptPrefix,
  composePrompt,
  sha256Prefix,
  buildPromptRecord,
  recordPathFor,
  writePromptRecord,
  TAKE_STATUSES,
  parseLineageArgs,
  readLineageTree,
} from '../aistudio-attachments.mjs';

function withTmp(fn) {
  const tmp = mkdtempSync(join(tmpdir(), 'aistudio-att-'));
  try { return fn(tmp); } finally { rmSync(tmp, { recursive: true, force: true }); }
}

test('확장자 목록', () => {
  assert.deepEqual(IMAGE_EXT, ['png', 'jpg', 'jpeg', 'webp']);
  assert.deepEqual(VIDEO_EXT, ['mp4', 'mov', 'webm']);
});

test('checkRefFile: 없는 파일과 잘못된 확장자를 막고 통과하면 path를 돌려준다', () => {
  withTmp((tmp) => {
    const ok = join(tmp, 'a.png');
    const gif = join(tmp, 'b.gif');
    writeFileSync(ok, 'x');
    writeFileSync(gif, 'x');
    assert.equal(checkRefFile(ok, IMAGE_EXT, '--ref'), ok);
    assert.throws(() => checkRefFile(join(tmp, 'none.png'), IMAGE_EXT, '--ref'), /--ref 파일을 찾지 못했습니다/);
    assert.throws(() => checkRefFile(gif, IMAGE_EXT, '--first'), /--first 파일 형식은 png, jpg, jpeg, webp 중 하나여야 합니다/);
  });
});

test('readPromptArgs: 둘 다 주면 오류, 파일은 앞뒤 공백을 정리해 읽는다', () => {
  withTmp((tmp) => {
    const p = join(tmp, 'p.txt');
    writeFileSync(p, '\n  지시문 한 줄\n두 번째 줄  \n', 'utf8');
    assert.equal(readPromptArgs({ prompt: '', promptFile: p }), '지시문 한 줄\n두 번째 줄');
    assert.equal(readPromptArgs({ prompt: '직접', promptFile: '' }), '직접');
    assert.equal(readPromptArgs({ prompt: '', promptFile: '' }), '');
    assert.throws(() => readPromptArgs({ prompt: 'x', promptFile: p }), /--prompt와 --prompt-file은 하나만/);
    assert.throws(() => readPromptArgs({ prompt: '', promptFile: join(tmp, 'none.txt') }), /--prompt-file 파일을 찾지 못했습니다/);
  });
});

test('orderAttachments: 첫 장면 → 참고(준 순서) → 끝 장면, 빈 값은 뺀다', () => {
  assert.deepEqual(
    orderAttachments({ first: 'f.png', refs: ['r1.png', 'r2.mp4'], last: 'l.png' }),
    [
      { path: 'f.png', role: 'first' },
      { path: 'r1.png', role: 'ref' },
      { path: 'r2.mp4', role: 'ref' },
      { path: 'l.png', role: 'last' },
    ],
  );
  assert.deepEqual(orderAttachments({ refs: ['r.png', ''] }), [{ path: 'r.png', role: 'ref' }]);
  assert.deepEqual(orderAttachments({}), []);
});

test('framePromptPrefix: 첫·끝 장면 안내 네 경우와 참고 문장', () => {
  assert.equal(framePromptPrefix([]), '');
  assert.equal(framePromptPrefix(orderAttachments({ refs: ['r.png'] })), '');
  assert.equal(
    framePromptPrefix(orderAttachments({ first: 'f.png' })),
    'Attached image 1 is the opening frame of the video.',
  );
  assert.equal(
    framePromptPrefix(orderAttachments({ last: 'l.png' })),
    'Attached image 1 is the final frame of the video.',
  );
  assert.equal(
    framePromptPrefix(orderAttachments({ first: 'f.png', last: 'l.png' })),
    'Attached image 1 is the opening frame and attached image 2 is the final frame; animate from the first to the last.',
  );
  assert.equal(
    framePromptPrefix(orderAttachments({ first: 'f.png', refs: ['r1.png', 'r2.png'], last: 'l.png' })),
    'Attached image 1 is the opening frame and attached image 4 is the final frame; animate from the first to the last. Other attached files are references.',
  );
  assert.equal(
    framePromptPrefix(orderAttachments({ last: 'l.png', refs: ['r.png'] })),
    'Attached image 2 is the final frame of the video. Other attached files are references.',
  );
});

test('composePrompt: prefix가 비면 그대로, 있으면 빈 줄 하나로 잇는다', () => {
  assert.equal(composePrompt('', 'hello'), 'hello');
  assert.equal(composePrompt('A.', 'hello'), 'A.\n\nhello');
});

test('sha256Prefix: 16자, 같은 내용이면 같은 값, 다른 내용이면 다른 값', () => {
  withTmp((tmp) => {
    const a = join(tmp, 'a.png');
    const b = join(tmp, 'b.png');
    const c = join(tmp, 'c.png');
    writeFileSync(a, 'same');
    writeFileSync(b, 'same');
    writeFileSync(c, 'other');
    assert.equal(sha256Prefix(a).length, 16);
    assert.match(sha256Prefix(a), /^[0-9a-f]{16}$/);
    assert.equal(sha256Prefix(a), sha256Prefix(b));
    assert.notEqual(sha256Prefix(a), sha256Prefix(c));
  });
});

test('buildPromptRecord: 상대경로(/), 역할·순서, 고정한 시각, promptFile null', () => {
  withTmp((tmp) => {
    const now = new Date('2026-11-21T01:02:03.000Z');
    const rec = buildPromptRecord({
      tool: 'aistudio-video',
      model: 'm',
      prompt: 'p',
      attachments: [
        { path: join(tmp, 'in', 'f.png'), role: 'first', sha256: 'aaaaaaaaaaaaaaaa' },
        { path: join(tmp, 'in', 'l.png'), role: 'last' },
      ],
      settings: { aspect: '9:16' },
      output: { file: join(tmp, 'out', 'clip.mp4'), bytes: 10 },
      cwd: tmp,
      now,
    });
    assert.deepEqual(rec, {
      tool: 'aistudio-video',
      model: 'm',
      createdAt: '2026-11-21T01:02:03.000Z',
      prompt: 'p',
      promptFile: null,
      attachments: [
        { order: 1, role: 'first', path: 'in/f.png', sha256: 'aaaaaaaaaaaaaaaa' },
        { order: 2, role: 'last', path: 'in/l.png', sha256: null },
      ],
      settings: { aspect: '9:16' },
      output: { bytes: 10, file: 'out/clip.mp4' },
    });
    const withFile = buildPromptRecord({ tool: 't', model: 'm', prompt: 'p', promptFile: join(tmp, 'p.txt'), output: { file: join(tmp, 'o.png') }, cwd: tmp, now });
    assert.equal(withFile.promptFile, 'p.txt');
    assert.deepEqual(withFile.attachments, []);
  });
});

test('recordPathFor / writePromptRecord: <파일>.prompt.json으로 저장하고 다시 읽으면 같다', () => {
  withTmp((tmp) => {
    const file = join(tmp, 'clip.mp4');
    assert.equal(recordPathFor(file), `${file}.prompt.json`);
    const rec = { tool: 't', prompt: '한글 지시문', attachments: [] };
    const path = writePromptRecord(file, rec);
    assert.equal(path, `${file}.prompt.json`);
    const text = readFileSync(path, 'utf8');
    assert.ok(text.endsWith('\n'));
    assert.deepEqual(JSON.parse(text), rec);
  });
});


test('parseLineageArgs / buildPromptRecord(lineage) / readLineageTree: 노드 계보를 저장하고 트리로 복원한다', () => {
  assert.deepEqual(TAKE_STATUSES, ['candidate', 'chosen', 'rejected']);
  assert.equal(parseLineageArgs({}), null);
  assert.throws(() => parseLineageArgs({ status: 'unknown' }), /--status/);

  withTmp((tmp) => {
    const anchor = join(tmp, 'anchor.png');
    const v1 = join(tmp, 'v1.png');
    const v2 = join(tmp, 'v2.mp4');
    writeFileSync(anchor, 'a');
    writeFileSync(v1, 'b');
    writeFileSync(v2, 'c');

    const lin1 = parseLineageArgs({ parent: anchor, changedVar: 'lighting: dimmer', status: 'chosen' });
    assert.deepEqual(lin1, { parent: anchor, changedVar: 'lighting: dimmer', status: 'chosen' });
    assert.throws(() => parseLineageArgs({ parent: join(tmp, 'none.png') }), /--parent/);

    writePromptRecord(anchor, buildPromptRecord({
      tool: 'aistudio-image', model: 'm', prompt: 'anchor', output: { file: anchor },
      lineage: { status: 'chosen' }, cwd: tmp,
    }));
    writePromptRecord(v1, buildPromptRecord({
      tool: 'aistudio-image', model: 'm', prompt: 'v1', output: { file: v1 },
      lineage: { ...lin1, parentSha256: sha256Prefix(anchor) }, cwd: tmp,
    }));
    writePromptRecord(v2, buildPromptRecord({
      tool: 'aistudio-video', model: 'omni', prompt: 'v2', output: { file: v2 },
      lineage: { parent: v1, changedVar: 'camera: push-in', status: 'rejected', parentSha256: sha256Prefix(v1) }, cwd: tmp,
    }));

    const tree = readLineageTree(tmp, tmp);
    assert.equal(tree.nodes.length, 3);
    assert.equal(tree.roots.length, 1);
    assert.equal(tree.roots[0].file, 'anchor.png');
    assert.equal(tree.roots[0].children[0].file, 'v1.png');
    assert.equal(tree.roots[0].children[0].changedVar, 'lighting: dimmer');
    assert.equal(tree.roots[0].children[0].children[0].file, 'v2.mp4');
    assert.equal(tree.roots[0].children[0].children[0].status, 'rejected');
  });
});
