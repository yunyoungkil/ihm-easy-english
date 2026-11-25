#!/usr/bin/env node
/**
 * public/fonts/google/manifest.json에 등록된 구글 폰트(OFL) 파일을
 * 프로젝트 공용 서랍(public/fonts/google/)에 내려받거나 확인한다.
 *
 * 사용법:
 *   node scripts/setup-google-fonts.mjs          # 없는 파일만 내려받기
 *   node scripts/setup-google-fonts.mjs --check  # 상태만 확인 (종료 코드 0/1)
 *   node scripts/setup-google-fonts.mjs --force  # 전체 다시 내려받기
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRAWER_DIR = join(ROOT, 'public', 'fonts', 'google');
const MANIFEST_PATH = join(DRAWER_DIR, 'manifest.json');

export function loadManifest(manifestPath = MANIFEST_PATH) {
  return JSON.parse(readFileSync(manifestPath, 'utf8'));
}

export function listExpectedFontFiles(manifest = loadManifest()) {
  const out = [];
  for (const font of manifest.fonts || []) {
    for (const f of font.files || []) {
      out.push({
        id: font.id,
        family: font.family,
        labelKo: font.labelKo,
        role: font.role,
        license: font.license,
        file: f.file,
        weight: f.weight,
        url: f.url,
      });
    }
  }
  return out;
}

export function checkDrawer({ drawerDir = DRAWER_DIR, manifestPath = MANIFEST_PATH } = {}) {
  const manifest = loadManifest(manifestPath);
  const expected = listExpectedFontFiles(manifest);
  const present = [];
  const missing = [];
  for (const item of expected) {
    const abs = join(drawerDir, item.file);
    if (existsSync(abs) && statSync(abs).size > 1024) {
      present.push({ ...item, bytes: statSync(abs).size });
    } else {
      missing.push(item);
    }
  }
  return { total: expected.length, present, missing };
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) throw new Error(`파일 크기가 비정상적으로 작음: ${buf.length}B (${url})`);
  writeFileSync(dest, buf);
  return buf.length;
}

async function main(argv) {
  const checkOnly = argv.includes('--check');
  const force = argv.includes('--force');
  mkdirSync(DRAWER_DIR, { recursive: true });

  const manifest = loadManifest();
  const items = listExpectedFontFiles(manifest);

  if (checkOnly) {
    const status = checkDrawer();
    console.log(`구글 폰트 공용 서랍 확인: ${status.present.length}/${status.total} 준비됨`);
    if (status.missing.length) {
      console.log('빠진 파일:', status.missing.map((m) => m.file).join(', '));
      process.exitCode = 1;
    }
    return;
  }

  let downloaded = 0;
  let reused = 0;
  let skipped = 0;
  const localNoto = join(ROOT, 'videos', 'ep36-everyday-words-unheard', 'assets', 'fonts', 'NotoSansKR-VF.ttf');

  for (const item of items) {
    const dest = join(DRAWER_DIR, item.file);
    if (!force && existsSync(dest) && statSync(dest).size > 1024) {
      skipped++;
      continue;
    }
    if (!force && item.file === 'NotoSansKR-VF.ttf' && existsSync(localNoto) && statSync(localNoto).size > 1024) {
      copyFileSync(localNoto, dest);
      reused++;
      console.log(`[로컬 복사] ${item.file} (${(statSync(dest).size / 1024 / 1024).toFixed(2)}MB)`);
      continue;
    }
    const bytes = await downloadFile(item.url, dest);
    downloaded++;
    console.log(`[내려받기] ${item.file} (${(bytes / 1024 / 1024).toFixed(2)}MB)`);
  }

  const after = checkDrawer();
  console.log(`완료: 전체 ${after.total}개 중 ${after.present.length}개 준비 (새로 받음 ${downloaded}, 로컬 복사 ${reused}, 기존 유지 ${skipped})`);
  if (after.missing.length) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((err) => {
    console.error('구글 폰트 준비 실패:', err.message);
    process.exitCode = 1;
  });
}
