import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  kstDate, kstWeekday, readQueue, shiftQueue, readPosts, appendPost,
  appendRun, readRuns, readPause, writePause,
} from '../blog/blog-store.mjs';

const UTC_BEFORE_KST_MIDNIGHT = new Date('2026-11-24T17:00:00Z'); // 한국은 11-25 02:00(수)

async function withDir(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'blog-store-'));
  try { await fn(dir); } finally { await rm(dir, {recursive: true, force: true}); }
}

test('kstDate/kstWeekday는 한국 시각 기준', () => {
  assert.equal(kstDate(UTC_BEFORE_KST_MIDNIGHT), '2026-11-25');
  assert.equal(kstWeekday(UTC_BEFORE_KST_MIDNIGHT), 3);
  // 한국 일요일 00:30 = UTC 토요일 15:30
  assert.equal(kstWeekday(new Date('2026-11-28T15:30:00Z')), 0);
});

test('빈 폴더는 기본값을 돌려준다', async () => {
  await withDir(async (dir) => {
    assert.deepEqual(await readQueue(dir), []);
    assert.deepEqual(await readPosts(dir), []);
    assert.deepEqual(await readRuns(dir), []);
    assert.deepEqual(await readPause(dir), {paused: false});
  });
});

test('appendRun 두 번이면 길이 2, 폴더가 없어도 만든다', async () => {
  await withDir(async (base) => {
    const dir = path.join(base, 'nested', 'blog');
    await appendRun(dir, {date: '2026-11-25', startedAt: 'a', outcome: 'published', topicId: 't1'});
    await appendRun(dir, {date: '2026-11-25', startedAt: 'b', outcome: 'queue-empty'});
    const runs = await readRuns(dir);
    assert.equal(runs.length, 2);
    assert.equal(runs[1].outcome, 'queue-empty');
    const raw = await readFile(path.join(dir, 'tech-runs.json'), 'utf8');
    assert.ok(raw.endsWith('\n'));
    assert.ok(raw.includes('\n  {'), '2칸 들여쓰기');
  });
});

test('appendPost는 쌓인다', async () => {
  await withDir(async (dir) => {
    const rec = {date: '2026-11-25', topicId: 't1', title: 'x', url: 'u', postId: 'p', sources: ['s'], productUrl: null};
    await appendPost(dir, rec);
    await appendPost(dir, {...rec, topicId: 't2'});
    const posts = await readPosts(dir);
    assert.deepEqual(posts.map((p) => p.topicId), ['t1', 't2']);
  });
});

test('shiftQueue는 id가 같은 주제만 뺀다', async () => {
  await withDir(async (dir) => {
    const mk = (id) => ({topicId: id, title: id, kind: 'fix', searchQuery: id, sourceHints: [], productHint: null});
    await writeFile(path.join(dir, 'tech-queue.json'), JSON.stringify([mk('a'), mk('b'), mk('c')]));
    await shiftQueue(dir, 'b');
    assert.deepEqual((await readQueue(dir)).map((t) => t.topicId), ['a', 'c']);
    const before = await readFile(path.join(dir, 'tech-queue.json'), 'utf8');
    await shiftQueue(dir, 'zzz');
    assert.equal(await readFile(path.join(dir, 'tech-queue.json'), 'utf8'), before, '없는 id는 파일을 그대로 둔다');
  });
});

test('writePause는 readPause로 읽힌다', async () => {
  await withDir(async (dir) => {
    await writePause(dir, '인증 실패', UTC_BEFORE_KST_MIDNIGHT);
    assert.deepEqual(await readPause(dir), {paused: true, since: '2026-11-24T17:00:00.000Z', reason: '인증 실패'});
  });
});
