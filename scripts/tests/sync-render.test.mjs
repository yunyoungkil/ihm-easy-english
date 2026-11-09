import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {packageFolderFor, syncRender} from '../sync-render-to-package.mjs';

const NOW = Date.parse('2026-11-09T06:00:00Z');

const setup = ({project = 'ep25-shorts-pool-pull', packageName = project, packageFiles = {}, renderAgeMs = 60_000} = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'sync-render-'));
  const projectDir = join(root, 'videos', project);
  mkdirSync(join(projectDir, 'renders'), {recursive: true});
  writeFileSync(join(projectDir, 'hyperframes.json'), '{}');
  const render = join(projectDir, 'renders', `${project}_2026-11-09_14-38-02.mp4`);
  writeFileSync(render, 'NEW-RENDER');
  const when = new Date(NOW - renderAgeMs);
  utimesSync(render, when, when);
  const packageDir = join(root, 'output', 'upload-packages', packageName);
  mkdirSync(packageDir, {recursive: true});
  for (const [name, body] of Object.entries(packageFiles)) writeFileSync(join(packageDir, name), body);
  return {root, projectDir, packageDir};
};

test('프로젝트 이름과 같은 패키지 폴더, 또는 -longform 폴더를 찾는다', () => {
  const {root} = setup({project: 'ep20-world-rl', packageName: 'ep20-world-rl-longform'});
  assert.equal(packageFolderFor(join(root, 'videos', 'ep20-world-rl'), join(root, 'output', 'upload-packages')), join(root, 'output', 'upload-packages', 'ep20-world-rl-longform'));
  assert.equal(packageFolderFor(join(root, 'videos', 'ep99-none'), join(root, 'output', 'upload-packages')), null);
});

test('패키지에 검색어 이름 영상이 있으면 같은 이름으로 덮어쓴다', () => {
  const {root, projectDir, packageDir} = setup({packageFiles: {'Pool_Shorts.mp4': 'OLD'}});
  const r = syncRender({projectDir, packagesRoot: join(root, 'output', 'upload-packages'), now: NOW});
  assert.equal(r.status, 'copied');
  assert.equal(readFileSync(join(packageDir, 'Pool_Shorts.mp4'), 'utf8'), 'NEW-RENDER');
});

test('쇼츠가 예약되어 있으면 건드리지 않는다', () => {
  const {root, projectDir, packageDir} = setup({packageFiles: {'Pool_Shorts.mp4': 'OLD', 'shorts-status.json': JSON.stringify({status: 'scheduled'})}});
  const r = syncRender({projectDir, packagesRoot: join(root, 'output', 'upload-packages'), now: NOW});
  assert.equal(r.status, 'skipped');
  assert.match(r.reason, /예약|공개|업로드/);
  assert.equal(readFileSync(join(packageDir, 'Pool_Shorts.mp4'), 'utf8'), 'OLD');
});

test('롱폼이 공개·예약 상태이면 건드리지 않는다', () => {
  for (const status of ['scheduled', 'published', 'uploaded']) {
    const {root, projectDir, packageDir} = setup({project: 'ep24-long-short-i', packageFiles: {'Long.mp4': 'OLD', 'status.json': JSON.stringify({status})}});
    const r = syncRender({projectDir, packagesRoot: join(root, 'output', 'upload-packages'), now: NOW});
    assert.equal(r.status, 'skipped', status);
    assert.equal(readFileSync(join(packageDir, 'Long.mp4'), 'utf8'), 'OLD');
  }
});

test('롱폼이 ready_to_upload면 덮어쓴다', () => {
  const {root, projectDir, packageDir} = setup({project: 'ep29-b-vs-v', packageFiles: {'Long.mp4': 'OLD', 'status.json': JSON.stringify({status: 'ready_to_upload'})}});
  assert.equal(syncRender({projectDir, packagesRoot: join(root, 'output', 'upload-packages'), now: NOW}).status, 'copied');
  assert.equal(readFileSync(join(packageDir, 'Long.mp4'), 'utf8'), 'NEW-RENDER');
});

test('패키지 폴더가 없거나 영상 이름을 정할 수 없으면 복사하지 않고 알린다', () => {
  const none = setup({project: 'ep30-new', packageName: 'other'});
  assert.equal(syncRender({projectDir: none.projectDir, packagesRoot: join(none.root, 'output', 'upload-packages'), now: NOW}).status, 'skipped');
  const noName = setup({packageFiles: {'title.txt': 'x'}});
  const r = syncRender({projectDir: noName.projectDir, packagesRoot: join(noName.root, 'output', 'upload-packages'), now: NOW});
  assert.equal(r.status, 'skipped');
  assert.match(r.reason, /이름/);
});

test('오래된 렌더 파일(이번 렌더가 아님)은 복사하지 않는다', () => {
  const {root, projectDir, packageDir} = setup({packageFiles: {'Pool_Shorts.mp4': 'OLD'}, renderAgeMs: 3 * 60 * 60 * 1000});
  const r = syncRender({projectDir, packagesRoot: join(root, 'output', 'upload-packages'), now: NOW});
  assert.equal(r.status, 'skipped');
  assert.equal(readFileSync(join(packageDir, 'Pool_Shorts.mp4'), 'utf8'), 'OLD');
  assert.ok(existsSync(join(packageDir, 'Pool_Shorts.mp4')));
});
