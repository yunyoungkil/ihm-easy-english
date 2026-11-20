#!/usr/bin/env node
// HyperFrames 영상 프로젝트의 배경음 더킹(carve.mjs)을 자동으로 찾아 적용하는 공용 유틸 & CLI(2026-11-20).
// 배경: 쇼츠 build-index.mjs를 다시 돌리면 index.html이 덮어쓰여 배경음 더킹(data-fx-carve)이 사라지는 사고가 있었음
// (knowledge/logs/2026-11.md 2026-11-07). 이제 빌드 스크립트 끝에서 runCarve()를 자동 호출하고,
// 직접 만든 index.html에서도 `npm run carve -- videos/<폴더>` 한 줄로 같은 검사를 통과한다.
//
// 사용:
//   node scripts/run-carve.mjs videos/ep33-shorts-swallowed-t [--bed bgm] [--strength 0.8] [--dry-run]
//   npm run carve -- videos/ep33-shorts-swallowed-t --dry-run
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const PROJECT_DIR = resolve(SCRIPT_DIR, '..');
export const DEFAULT_STRENGTH = 0.8;

/** 환경변수·Claude·Gemini(Antigravity)·프로젝트 폴더 순으로 carve.mjs를 찾는다. */
export function findCarveScript({ env = process.env, homeDir = homedir(), projectDir = PROJECT_DIR } = {}) {
  const candidates = [
    env?.CARVE_SCRIPT,
    join(homeDir, '.claude', 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs'),
    join(homeDir, '.gemini', 'antigravity', 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs'),
    join(homeDir, '.gemini', 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs'),
    join(homeDir, '.gemini', 'config', 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs'),
    join(projectDir, '.claude', 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs'),
    join(projectDir, '.agents', 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return null;
}

/** @hyperframes/core가 설치된 디렉터리(영상 폴더 우선, 없으면 프로젝트 루트)를 찾는다. */
export function findCoreDir(compDir, projectDir = PROJECT_DIR) {
  const candidates = [resolve(compDir), resolve(projectDir)];
  for (const dir of candidates) {
    if (existsSync(join(dir, 'node_modules', '@hyperframes', 'core'))) return dir;
  }
  return null;
}

/** HTML 안에 더킹 대상 배경음(<audio id="bgm" ...> 또는 bed id)이 들어 있는지 확인한다. */
export function htmlHasBed(html, bed = 'bgm') {
  const text = String(html || '');
  const escaped = String(bed).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`<audio\\b[^>]*\\bid\\s*=\\s*["']${escaped}["']`, 'i').test(text)
    || /<audio\b[^>]*\bdata-audio-group\s*=\s*["']bgm["']/i.test(text);
}

/** CLI 인자 파싱: 폴더 경로 또는 index.html 파일 경로를 둘 다 받는다. */
export function parseArgs(argv) {
  const out = { target: '', bed: 'bgm', strength: DEFAULT_STRENGTH, dryRun: false, skip: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--bed') { out.bed = argv[++i] || 'bgm'; continue; }
    if (a === '--strength') { out.strength = Number(argv[++i]); continue; }
    if (a === '--dry-run') { out.dryRun = true; continue; }
    if (a === '--no-carve') { out.skip = true; continue; }
    if (!a.startsWith('--') && !out.target) { out.target = a; }
  }
  if (!out.target) throw new Error('사용법: node scripts/run-carve.mjs <영상 폴더 또는 index.html> [--bed bgm] [--strength 0.8] [--dry-run]');
  if (!Number.isFinite(out.strength) || out.strength < 0 || out.strength > 1) {
    throw new Error('--strength는 0에서 1 사이 숫자여야 합니다');
  }
  return out;
}

/** 대상 경로(폴더 또는 html 파일)를 {compDir, compFile, compPath}로 정규화한다. */
export function resolveCompTarget(target) {
  const abs = resolve(target);
  if (existsSync(abs) && statSync(abs).isFile()) {
    return { compDir: dirname(abs), compFile: basename(abs), compPath: abs };
  }
  return { compDir: abs, compFile: 'index.html', compPath: join(abs, 'index.html') };
}

/**
 * 지정한 영상 폴더(또는 HTML)에 배경음 더킹(carve.mjs)을 실행한다.
 * - BGM 태그가 없으면 안전하게 건너뛴다(skipped: true).
 * - 실패 시 strict=true면 예외를 던지고, false면 경고 결과를 돌려준다.
 */
export function runCarve({
  target,
  dir,
  comp = 'index.html',
  bed = 'bgm',
  strength = DEFAULT_STRENGTH,
  dryRun = false,
  strict = true,
  projectDir = PROJECT_DIR,
  carveScript = undefined,
  coreDir = undefined,
  runner = spawnSync,
} = {}) {
  const resolved = target
    ? resolveCompTarget(target)
    : { compDir: resolve(dir), compFile: comp, compPath: join(resolve(dir), comp) };

  if (!existsSync(resolved.compPath)) {
    const msg = `index.html을 찾지 못했습니다: ${resolved.compPath}`;
    if (strict) throw new Error(msg);
    return { ok: false, skipped: false, reason: 'missing-comp', message: msg };
  }

  const html = readFileSync(resolved.compPath, 'utf8');
  if (!htmlHasBed(html, bed)) {
    return { ok: true, skipped: true, reason: 'no-bgm', message: `배경음(#${bed})이 없어 더킹을 건너뛰었습니다.` };
  }

  const carvePath = carveScript !== undefined ? carveScript : findCarveScript({ projectDir });
  if (!carvePath || !existsSync(carvePath)) {
    const msg = 'carve.mjs(hyperframes-audio 스킬)를 찾지 못해 더킹을 적용하지 못했습니다.';
    if (strict) throw new Error(msg);
    return { ok: false, skipped: false, reason: 'missing-carve', message: msg };
  }

  const resolvedCore = coreDir !== undefined ? coreDir : findCoreDir(resolved.compDir, projectDir);
  if (!resolvedCore) {
    const msg = '@hyperframes/core가 없어 더킹을 적용하지 못했습니다. 영상 폴더나 루트에서 npm ci 후 다시 실행하세요.';
    if (strict) throw new Error(msg);
    return { ok: false, skipped: false, reason: 'missing-core', message: msg };
  }

  const args = [carvePath, '--comp', resolved.compFile, '--bed', bed, '--strength', String(strength), '--core', resolvedCore];
  if (dryRun) args.push('--dry-run');

  const res = runner(process.execPath, args, { cwd: resolved.compDir, encoding: 'utf8' });
  if (res.status !== 0) {
    const detail = (res.stderr || res.stdout || res.error?.message || '').trim();
    const msg = `carve 실패 (종료 코드 ${res.status}): ${detail}`;
    if (strict) throw new Error(msg);
    return { ok: false, skipped: false, reason: 'exec-failed', message: msg };
  }

  const lines = String(res.stdout || '').trim().split(/\r?\n/).filter(Boolean);
  const summary = (lines.at(-1) || '더킹 적용 완료').trim();
  return { ok: true, skipped: false, dryRun, carvePath, coreDir: resolvedCore, summary, stdout: res.stdout || '' };
}

const isCli = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isCli) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.skip) {
      console.log('더킹 건너뜀(--no-carve)');
    } else {
      const r = runCarve({ target: opts.target, bed: opts.bed, strength: opts.strength, dryRun: opts.dryRun, strict: true });
      if (r.skipped) console.log(r.message);
      else console.log(`${opts.dryRun ? '[미리보기] ' : ''}더킹 완료: ${r.summary}`);
    }
  } catch (err) {
    console.error(`오류: ${err.message}`);
    process.exitCode = 1;
  }
}
