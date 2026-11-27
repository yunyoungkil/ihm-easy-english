// 안전한 받기 시험: 진짜 git으로 임시 원격(bare)과 클론 두 개(집 PC=a, 노트북=b)를 만든다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {safePull, isDataPath, describeResult} from '../safe-pull.mjs';

const git = (cwd, ...args) => execFileSync('git', ['-c', 'core.autocrlf=false', ...args], {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const write = (root, rel, text) => { mkdirSync(join(root, rel, '..'), {recursive: true}); writeFileSync(join(root, rel), text, 'utf8'); };
const read = (root, rel) => readFileSync(join(root, rel), 'utf8');

function setup() {
  const base = mkdtempSync(join(tmpdir(), 'safe-pull-'));
  const remote = join(base, 'remote.git');
  mkdirSync(remote);
  git(remote, 'init', '--bare', '-b', 'main');
  const seed = join(base, 'seed');
  mkdirSync(seed);
  git(seed, 'init', '-b', 'main');
  git(seed, 'config', 'user.email', 't@t'); git(seed, 'config', 'user.name', 't');
  write(seed, 'data/youtube/catalog.json', '{"v":1}\n');
  write(seed, 'data/youtube/packaging-cases.json', '{"cases":1}\n');
  write(seed, 'scripts/x.mjs', 'export const a = 1;\n');
  write(seed, 'README.md', 'hello\n');
  git(seed, 'add', '-A'); git(seed, 'commit', '-m', 'seed');
  git(seed, 'remote', 'add', 'origin', remote); git(seed, 'push', '-u', 'origin', 'main');
  const clone = (name) => {
    const dir = join(base, name);
    git(base, 'clone', remote, dir);
    git(dir, 'config', 'user.email', 't@t'); git(dir, 'config', 'user.name', 't'); git(dir, 'config', 'core.autocrlf', 'false');
    return dir;
  };
  return {base, remote, a: clone('pcA'), b: clone('pcB'), backupRoot: join(base, 'backup')};
}

/** 집 PC(a)가 파일을 고쳐 올린다. */
function pushFromA(a, files, msg = 'update') {
  for (const [rel, text] of Object.entries(files)) write(a, rel, text);
  git(a, 'add', ...Object.keys(files)); git(a, 'commit', '-m', msg); git(a, 'push');
}

test('① 노트북이 고친 자동 데이터 파일이 원격 변경과 부딪히면 백업 후 원격 것으로 맞추고 받는다', async () => {
  const {a, b, backupRoot} = setup();
  write(b, 'data/youtube/catalog.json', '{"v":"notebook"}\n');
  pushFromA(a, {'data/youtube/catalog.json': '{"v":2}\n'});
  const logs = [];
  const r = await safePull({projectDir: b, backupRoot, now: new Date('2026-11-27T01:02:03Z'), log: (m) => logs.push(m)});
  assert.equal(r.ok, true);
  assert.deepEqual(r.restored, ['data/youtube/catalog.json']);
  assert.equal(read(b, 'data/youtube/catalog.json'), '{"v":2}\n');
  assert.ok(r.backupDir.startsWith(backupRoot));
  assert.equal(read(r.backupDir, 'data/youtube/catalog.json'), '{"v":"notebook"}\n');
  assert.deepEqual(r.conflictsNonData, []);
  assert.equal(r.upToDate, false);
  assert.ok(logs.length > 0);
  assert.equal(git(b, 'status', '--porcelain', '--untracked-files=no'), '');
  assert.match(describeResult(r), /원격 것으로 맞추고 백업/);
});

test('① 스테이지된 변경도 같은 방식으로 처리한다', async () => {
  const {a, b, backupRoot} = setup();
  write(b, 'data/youtube/catalog.json', '{"v":"staged"}\n');
  git(b, 'add', 'data/youtube/catalog.json');
  pushFromA(a, {'data/youtube/catalog.json': '{"v":2}\n'});
  const r = await safePull({projectDir: b, backupRoot});
  assert.equal(r.ok, true);
  assert.deepEqual(r.restored, ['data/youtube/catalog.json']);
  assert.equal(read(b, 'data/youtube/catalog.json'), '{"v":2}\n');
  assert.equal(read(r.backupDir, 'data/youtube/catalog.json'), '{"v":"staged"}\n');
});

test('② 원격이 안 바꾼 사람 정리 파일은 그대로 남는다', async () => {
  const {a, b, backupRoot} = setup();
  write(b, 'data/youtube/packaging-cases.json', '{"cases":"mine"}\n');
  pushFromA(a, {'data/youtube/catalog.json': '{"v":2}\n'});
  const r = await safePull({projectDir: b, backupRoot});
  assert.equal(r.ok, true);
  assert.deepEqual(r.restored, []);
  assert.equal(r.backupDir, null);
  assert.equal(read(b, 'data/youtube/packaging-cases.json'), '{"cases":"mine"}\n');
  assert.equal(read(b, 'data/youtube/catalog.json'), '{"v":2}\n');
});

test('③ 코드 파일이 부딪히면 아무것도 건드리지 않고 받지 않는다(충돌 표시가 남지 않게)', async () => {
  const {a, b, backupRoot} = setup();
  const headBefore = git(b, 'rev-parse', 'HEAD');
  write(b, 'scripts/x.mjs', 'export const a = "notebook";\n');
  write(b, 'data/youtube/catalog.json', '{"from":"notebook"}\n');
  pushFromA(a, {'scripts/x.mjs': 'export const a = 2;\n', 'data/youtube/catalog.json': '{"from":"host"}\n'});
  const r = await safePull({projectDir: b, backupRoot});
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'conflict');
  assert.deepEqual(r.conflictsNonData, ['scripts/x.mjs']);
  assert.deepEqual(r.restored, []);
  // 받지 않았고(HEAD 그대로), 노트북 파일은 충돌 표시 없이 그대로, 데이터 파일도 맞추지 않음, stash도 없음
  assert.equal(git(b, 'rev-parse', 'HEAD'), headBefore);
  assert.equal(read(b, 'scripts/x.mjs'), 'export const a = "notebook";\n');
  assert.equal(read(b, 'data/youtube/catalog.json'), '{"from":"notebook"}\n');
  assert.equal(git(b, 'stash', 'list'), '');
  assert.ok(!existsSync(backupRoot));
});

test('④ 부딪힘이 없으면 그냥 받고 backupDir은 null이다', async () => {
  const {a, b, backupRoot} = setup();
  pushFromA(a, {'README.md': 'hello 2\n'});
  const r = await safePull({projectDir: b, backupRoot});
  assert.equal(r.ok, true);
  assert.equal(r.backupDir, null);
  assert.deepEqual(r.restored, []);
  assert.equal(r.upToDate, false);
  assert.equal(read(b, 'README.md'), 'hello 2\n');
  assert.ok(!existsSync(backupRoot));
  const again = await safePull({projectDir: b, backupRoot});
  assert.equal(again.ok, true);
  assert.equal(again.upToDate, true);
});

test('⑤ 원격(upstream)이 없으면 건너뛴다', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'safe-pull-noup-'));
  git(dir, 'init', '-b', 'main');
  git(dir, 'config', 'user.email', 't@t'); git(dir, 'config', 'user.name', 't'); git(dir, 'config', 'core.autocrlf', 'false');
  write(dir, 'a.txt', '1\n');
  git(dir, 'add', '-A'); git(dir, 'commit', '-m', 'x');
  const r = await safePull({projectDir: dir, backupRoot: join(dir, '..', 'unused-backup')});
  assert.deepEqual(r, {skipped: '원격 없음'});
  assert.match(describeResult(r), /원격 없음/);
});

test('fetch가 실패하면 던지지 않고 {ok:false, stage:fetch}를 돌려준다', async () => {
  const {b, backupRoot} = setup();
  git(b, 'remote', 'set-url', 'origin', join(tmpdir(), 'no-such-remote-dir.git'));
  const r = await safePull({projectDir: b, backupRoot});
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'fetch');
  assert.ok(r.error.length > 0);
});

test('⑥ isDataPath: 자동 데이터 경로만 맞는다', () => {
  for (const p of [
    'data/youtube/catalog.json',
    'data/youtube/retention/new.json',
    'data/blog/posts.json',
    'data/loop-host.json',
    'output/upload-packages/ep30/status.json',
    'output/upload-packages/ep30-shorts/shorts-status.json',
    'data\\youtube\\comments.json',
  ]) assert.equal(isDataPath(p), true, p);
  for (const p of [
    'scripts/x.mjs',
    'knowledge/now.md',
    'data/other/file.json',
    'data/youtubeX/a.json',
    'data/loop-host.json.bak',
    'output/upload-packages/ep30/video.mp4',
    'output/upload-packages/ep30/sub/status.json',
    'output/upload-packages/status.json',
  ]) assert.equal(isDataPath(p), false, p);
});

test('⑦ 백업은 최근 10회분만 남는다', async () => {
  const {a, b, backupRoot} = setup();
  for (let i = 0; i < 12; i += 1) {
    write(b, 'data/youtube/catalog.json', `{"local":${i}}\n`);
    pushFromA(a, {'data/youtube/catalog.json': `{"remote":${i}}\n`}, `u${i}`);
    const r = await safePull({projectDir: b, backupRoot, now: new Date(Date.UTC(2026, 10, 1 + i))});
    assert.equal(r.ok, true);
    assert.equal(r.restored.length, 1);
  }
  const dirs = readdirSync(backupRoot).sort();
  assert.equal(dirs.length, 10);
  assert.ok(dirs[0].startsWith('2026-11-03'), dirs[0]); // 가장 오래된 두 개(11-01, 11-02)가 지워졌다
  assert.ok(dirs[9].startsWith('2026-11-12'), dirs[9]);
});

test('바꿔 끼운 git으로 fetch 실패를 던지지 않고 알린다', async () => {
  const git2 = async (args) => {
    if (args[0] === 'rev-parse') return {code: 0, out: 'origin/main\n'};
    return {code: 1, out: 'network down'};
  };
  const r = await safePull({projectDir: '.', git: git2, backupRoot: join(tmpdir(), 'unused')});
  assert.deepEqual(r, {ok: false, stage: 'fetch', error: 'network down'});
});
