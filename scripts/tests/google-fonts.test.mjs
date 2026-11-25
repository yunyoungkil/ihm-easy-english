import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDrawer, listExpectedFontFiles, loadManifest } from '../setup-google-fonts.mjs';
import { SYNC_ROOTS } from '../pc-sync.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('구글 폰트 공용 서랍 manifest는 4대 역할과 OFL 라이선스·공식 URL을 모두 갖춘다', () => {
  const manifest = loadManifest();
  assert.ok(Array.isArray(manifest.fonts) && manifest.fonts.length >= 10);
  const roles = new Set(manifest.fonts.map((f) => f.role));
  for (const required of ['ko-display', 'ko-body', 'ko-accent', 'en-display']) {
    assert.ok(roles.has(required), `역할 누락: ${required}`);
  }
  const ids = new Set();
  for (const item of listExpectedFontFiles(manifest)) {
    assert.equal(item.license, 'OFL-1.1', `비OFL 라이선스: ${item.id}`);
    assert.ok(
      item.url.startsWith('https://raw.githubusercontent.com/google/fonts/main/ofl/'),
      `공식 구글 폰트 URL 아님: ${item.url}`
    );
    ids.add(`${item.id}:${item.file}`);
  }
  assert.equal(ids.size, listExpectedFontFiles(manifest).length, '중복 파일 정의 없음');
});

test('specimen.html은 manifest에 등록된 모든 글자체 family를 포함한다', () => {
  const manifest = loadManifest();
  const html = readFileSync(join(ROOT, 'public', 'fonts', 'google', 'specimen.html'), 'utf8');
  for (const font of manifest.fonts) {
    assert.ok(html.includes(font.family), `specimen.html에 누락된 글자체: ${font.family}`);
  }
});

test('pc-sync SYNC_ROOTS에 public/fonts/google이 등록되어 두 대 PC 간 동기화된다', () => {
  assert.ok(
    SYNC_ROOTS.some((r) => r.rel === 'public/fonts/google' && r.mediaOnly === false),
    'SYNC_ROOTS에 public/fonts/google 누락'
  );
});

test('현재 PC의 구글 폰트 서랍은 manifest 기준 누락 없이 준비되어 있다', () => {
  const status = checkDrawer();
  assert.equal(status.missing.length, 0, `빠진 파일: ${status.missing.map((m) => m.file).join(', ')}`);
  assert.equal(status.present.length, status.total);
});
