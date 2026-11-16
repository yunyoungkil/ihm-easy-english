// 매일 루프 데이터 자동 동기화(scripts/loop-data-sync.mjs). 진짜 git(임시 원격 + 임시 복제본 둘)으로 시험한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncData, decideHost, readHost, hostFilePath} from '../loop-data-sync.mjs';

const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8'}).trim();
const write = (root, rel, text) => { mkdirSync(join(root, rel, '..'), {recursive: true}); writeFileSync(join(root, rel), text, 'utf8'); };

/** 원격 하나와 거기서 복제한 PC 두 대(A, B)를 만든다. */
function setup() {
  const base = mkdtempSync(join(tmpdir(), 'loop-sync-'));
  const remote = join(base, 'remote.git');
  mkdirSync(remote);
  git(remote, 'init', '--bare', '-b', 'main');
  const seed = join(base, 'seed');
  mkdirSync(seed);
  git(seed, 'init', '-b', 'main');
  git(seed, 'config', 'user.email', 't@t'); git(seed, 'config', 'user.name', 't');
  write(seed, '.gitignore', 'data/youtube/outlier-frames/\n');
  write(seed, 'data/youtube/catalog.json', '{"v":1}\n');
  write(seed, 'data/youtube/outlier-comments/old.json', '{"old":1}\n');
  write(seed, 'src.mjs', 'export const a = 1;\n');
  git(seed, 'add', '-A'); git(seed, 'commit', '-m', 'seed');
  git(seed, 'remote', 'add', 'origin', remote); git(seed, 'push', '-u', 'origin', 'main');
  const clone = (name) => {
    const dir = join(base, name);
    git(base, 'clone', remote, dir);
    git(dir, 'config', 'user.email', 't@t'); git(dir, 'config', 'user.name', 't');
    return dir;
  };
  return {remote, a: clone('pcA'), b: clone('pcB')};
}

test('담당 PC가 데이터를 올리고, 코드·무시 파일·은퇴 예정 폴더는 올리지 않는다', async () => {
  const {remote, a} = setup();
  write(a, 'data/youtube/catalog.json', '{"v":2}\n');               // 수정
  write(a, 'data/youtube/retention/new.json', '{"points":[]}\n');    // 새 파일
  write(a, 'data/youtube/outlier-frames/f.jpg', 'x');                // 무시됨
  write(a, 'data/youtube/outlier-comments/new.json', '{"new":1}\n'); // 은퇴 예정
  write(a, 'src.mjs', 'export const a = 2;\n');                      // 코드
  const r = await syncData({projectDir: a, now: new Date('2026-11-16T00:00:00Z'), thisHost: 'PC-A'});
  assert.equal(r.pushed, true);
  assert.equal(r.committed, 3, '수정 1 + 새 파일 1 + 담당 PC 파일 1');
  const files = git(remote, 'ls-tree', '-r', '--name-only', 'main').split('\n');
  assert.ok(files.includes('data/youtube/retention/new.json'));
  assert.ok(files.includes('data/loop-host.json'));
  assert.ok(!files.includes('data/youtube/outlier-frames/f.jpg'));
  assert.ok(!files.includes('data/youtube/outlier-comments/new.json'));
  assert.equal(git(remote, 'show', 'main:src.mjs'), 'export const a = 1;', '코드는 올라가지 않았다');
  assert.match(git(a, 'status', '--porcelain'), /src\.mjs/, '코드 변경은 그대로 남아 있다');
  assert.equal(readHost(a), 'PC-A');
});

test('담당이 아닌 PC는 아무것도 올리지 않는다', async () => {
  const {remote, a, b} = setup();
  write(a, 'data/youtube/a.json', '{}\n');
  await syncData({projectDir: a, thisHost: 'PC-A'});
  git(b, 'pull', '--rebase');
  write(b, 'data/youtube/b.json', '{}\n');
  const before = git(remote, 'rev-parse', 'main');
  const r = await syncData({projectDir: b, thisHost: 'PC-B'});
  assert.match(r.skipped, /담당 PC가 아님/);
  assert.equal(git(remote, 'rev-parse', 'main'), before);
});

test('올릴 변경이 없으면 커밋하지 않는다', async () => {
  const {a} = setup();
  await syncData({projectDir: a, thisHost: 'PC-A'}); // 담당 파일만 올라감
  const r = await syncData({projectDir: a, thisHost: 'PC-A'});
  assert.equal(r.skipped, '올릴 변경 없음');
});

test('푸시가 거부되면 pull --rebase 뒤 한 번 더 올린다', async () => {
  const {remote, a, b} = setup();
  await syncData({projectDir: a, thisHost: 'PC-A'});
  git(b, 'pull', '--rebase');
  write(b, 'docs.md', 'x\n'); git(b, 'add', 'docs.md'); git(b, 'commit', '-m', 'other'); git(b, 'push'); // 다른 PC가 먼저 푸시
  write(a, 'data/youtube/retention/r.json', '{}\n');
  const r = await syncData({projectDir: a, thisHost: 'PC-A'});
  assert.equal(r.pushed, true);
  const files = git(remote, 'ls-tree', '-r', '--name-only', 'main').split('\n');
  assert.ok(files.includes('docs.md') && files.includes('data/youtube/retention/r.json'));
});

test('같은 데이터 파일이 부딪히면 rebase를 취소하고 실패로 알린다(force push 없음)', async () => {
  const {remote, a, b} = setup();
  await syncData({projectDir: a, thisHost: 'PC-A'});
  git(b, 'pull', '--rebase');
  write(b, 'data/youtube/catalog.json', '{"v":"B"}\n'); git(b, 'add', '-A'); git(b, 'commit', '-m', 'B'); git(b, 'push');
  write(a, 'data/youtube/catalog.json', '{"v":"A"}\n');
  const before = git(remote, 'rev-parse', 'main');
  await assert.rejects(() => syncData({projectDir: a, thisHost: 'PC-A'}), /pull --rebase도 실패/);
  assert.equal(git(remote, 'rev-parse', 'main'), before, '원격은 그대로');
  assert.ok(!existsSync(join(a, '.git', 'rebase-merge')), 'rebase가 남아 있지 않다');
});

test('담당 파일 읽기: 없음·깨짐은 null, 이름 비교는 대소문자를 가리지 않는다', () => {
  const base = mkdtempSync(join(tmpdir(), 'loop-host-'));
  assert.equal(readHost(base), null);
  assert.deepEqual(decideHost(base, 'X'), {allowed: true, claim: true, host: 'X'});
  write(base, 'data/loop-host.json', '{깨짐');
  assert.equal(readHost(base), null);
  writeFileSync(hostFilePath(base), JSON.stringify({host: 'Desktop-A'}), 'utf8');
  assert.equal(decideHost(base, 'DESKTOP-a').allowed, true);
  assert.equal(decideHost(base, 'Other').allowed, false);
  assert.equal(JSON.parse(readFileSync(hostFilePath(base), 'utf8')).host, 'Desktop-A');
});
