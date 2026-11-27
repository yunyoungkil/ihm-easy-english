#!/usr/bin/env node
// 제작 중간 자동 안전 관문(2026-11-24): 음성 만들기 직전 · 영상 렌더링 직전 1층 불변 규칙을 코드로 강제한다.
// 클로드 코드(.claude/settings.json)와 안티그래비티(.agents/hooks.json) 두 환경의 훅 입출력 규격을 모두 지원하며,
// CLI(`npm run check-gate -- voice|render <videos/폴더>`)와 음성 생성기 내부에서도 같은 함수를 쓴다.
//
// 1층(불변)만 차단하고 2~3층(창작·연출·반복 참고)은 경고로만 알려 탈템플릿 원칙을 해치지 않는다.
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {basename, dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {findBannedTerms} from './banned-terms.mjs';
import {findRenderProject, isRenderCommand, scanProject} from './check-banned-terms.mjs';
import {checkNarration, extractNarration} from './check-narration-naturalness.mjs';
import {checkProject as checkTextLayout} from './check-text-layout.mjs';
import {PRE_V4_SHEETS, SPOKEN_DIGIT_RE, classifySheetProblems, loadSheets, sheetIdOf, sheetImageExists, sheetsDir as defaultSheetsDir} from './transform-sheet.mjs';

export const ALLOW_VOICE_GATE = 'ALLOW_VOICE_GATE';
export const ALLOW_RENDER_GATE = 'ALLOW_RENDER_GATE';
export const ALLOW_BANNED_TERMS = 'ALLOW_BANNED_TERMS';
export const MIN_MOBILE_FONT_PX = 34; // allow-literal: 1층 불변 모바일 최소 글자 크기(knowledge/rule-tiers.md 14번)
export const MIN_FACT_CHECK_CHARS = 100; // allow-literal: 빈 껍데기 FACT-CHECK.md 방지 하한
const INTERNAL_SLOP_DIR = join(fileURLToPath(import.meta.url), '..', '..', 'tools', 'slop-rewrite');
const EXTERNAL_SLOP_DIR_FALLBACK = 'C:\\Users\\yunyo\\Downloads\\slop-rewrite';
const VENDOR_SLOP_SCRIPT = join(INTERNAL_SLOP_DIR, '.claude', 'skills', 'slop-rewrite', 'scripts', 'check_ai_tells.py');
const FALLBACK_SLOP_SCRIPT = join(EXTERNAL_SLOP_DIR_FALLBACK, '.claude', 'skills', 'slop-rewrite', 'scripts', 'check_ai_tells.py');

export const EXTERNAL_SLOP_DIR = existsSync(VENDOR_SLOP_SCRIPT) ? INTERNAL_SLOP_DIR : EXTERNAL_SLOP_DIR_FALLBACK;
export const EXTERNAL_SLOP_SCRIPT = existsSync(VENDOR_SLOP_SCRIPT) ? VENDOR_SLOP_SCRIPT : FALLBACK_SLOP_SCRIPT;
// 대표님 취향 검사(writing-taste.md): 저장소가 공개라 git에 없고 두 PC가 구글 드라이브로 나눈다(scripts/pc-sync.mjs).
export const TASTE_SCRIPT = join(INTERNAL_SLOP_DIR, '.claude', 'skills', 'slop-rewrite', 'scripts', 'check_taste.py');
export const TASTE_FILE = join(INTERNAL_SLOP_DIR, 'taste', 'writing-taste.md');

const VOICE_COMMAND = /(?:^|[;&|\s])(?:node\s+)?["']?(?:[^"'\s]*[\\/])?(?:generate-aistudio-speech|generate-tts)\.mjs\b/;

/** 명령줄에서 음성 생성 명령인지 판별한다. */
export const isVoiceCommand = (command) => VOICE_COMMAND.test(String(command || ''));

const toNativePath = (p) =>
  process.platform === 'win32' ? String(p).replace(/^\/([a-zA-Z])\//, (_, d) => `${d.toUpperCase()}:/`) : String(p);

const stripQuotes = (s) => String(s || '').replace(/^["']|["']$/g, '');

/** 명령줄 문자열을 공백·따옴표 단위로 토큰화한다(파워셸·배시 공용). */
export function tokenizeCommand(command) {
  const tokens = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^']*)'|(\S+)/g;
  for (const m of String(command || '').matchAll(re)) {
    tokens.push(m[1] ?? m[2] ?? m[3]);
  }
  return tokens;
}

/** 출력 파일 경로(예: videos/ep35-shorts/assets/voice/n01.wav)에서 videos/<프로젝트> 폴더를 찾는다. */
export function findProjectDirFromOutput(outputPath, cwd = process.cwd()) {
  if (!outputPath) return null;
  let cur = dirname(resolve(toNativePath(cwd), toNativePath(stripQuotes(outputPath))));
  for (let i = 0; i < 8; i += 1) {
    const parent = dirname(cur);
    if (basename(parent).toLowerCase() === 'videos') return cur;
    if (existsSync(join(cur, 'FACT-CHECK.md')) || existsSync(join(cur, 'SCRIPT.md')) || existsSync(join(cur, 'hyperframes.json'))) {
      if (basename(parent).toLowerCase() === 'videos') return cur;
    }
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

/** 음성 생성 명령에서 --output, --text, 프로젝트 폴더를 꺼낸다. */
export function parseVoiceCommandInfo(command, cwd = process.cwd()) {
  const tokens = tokenizeCommand(command);
  let output = '';
  let text = '';
  let episode = '';
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    if (t === '--output' && tokens[i + 1]) { output = tokens[i + 1]; i += 1; }
    else if (t.startsWith('--output=')) output = t.slice('--output='.length);
    else if (t === '--text' && tokens[i + 1]) { text = tokens[i + 1]; i += 1; }
    else if (t.startsWith('--text=')) text = t.slice('--text='.length);
    else if (t === '--episode' && tokens[i + 1]) { episode = tokens[i + 1]; i += 1; }
    else if (t.startsWith('--episode=')) episode = t.slice('--episode='.length);
  }
  const projectDir = output ? findProjectDirFromOutput(output, cwd) : null;
  return {output, text, episode, projectDir};
}

/** EP30 이상 정규 제작 폴더인가(-test 실험 폴더 제외). */
export function isEpisodeRequiringSheet(projectDir) {
  const name = basename(resolve(projectDir));
  if (/-test\b/i.test(name)) return false;
  const m = name.match(/^ep(\d+)-/i);
  return Boolean(m && Number(m[1]) >= 30); // allow-literal: 비교 시트 전면 도입 시점(EP30+)
}

/** 프로젝트 폴더 이름과 짝이 맞는 비교 시트를 찾는다. */
export function findMatchingSheet(projectDir, sheetsRoot = defaultSheetsDir) {
  const slug = basename(resolve(projectDir));
  const direct = join(sheetsRoot, `${slug}.json`);
  if (existsSync(direct)) {
    try { return JSON.parse(readFileSync(direct, 'utf8').replace(/^\uFEFF/, '')); } catch { return null; }
  }
  for (const s of loadSheets(sheetsRoot)) {
    if (sheetIdOf(s) === slug) return s;
  }
  return null;
}

/** HTML/CSS에서 주석을 빼고 모바일 최소 글자 크기(34px) 미만 지정을 찾는다. 줄에 `allow-small-font:` 주석이 있으면 제외한다. */
export function findSmallFonts(html, minPx = MIN_MOBILE_FONT_PX) {
  const blank = (s) => s.replace(/[^\r\n]/g, ' ');
  const cleaned = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, blank);
  const hits = [];
  const lines = cleaned.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (/allow-small-font:\s*\S/.test(rawLine)) continue;
    const code = rawLine.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/, '');
    for (const m of code.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px\b/gi)) {
      const px = Number(m[1]);
      if (px > 0 && px < minPx) {
        hits.push({line: i + 1, px, raw: m[0]});
      }
    }
  }
  return hits;
}

/** 배경음(<audio id="bgm" 등)과 나레이션이 같이 있을 때 더킹(data-fx-carve)이 빠졌는지 검사한다. */
export function checkBgmDucking(html) {
  const text = String(html || '');
  const audioTags = [...text.matchAll(/<audio\b[^>]*>/gi)].map((m) => m[0]);
  if (!audioTags.length) return null;
  const bgmTags = audioTags.filter((tag) => /\bid\s*=\s*["']bgm["']/i.test(tag) || /\bsrc\s*=\s*["'][^"']*bgm[^"']*["']/i.test(tag));
  if (!bgmTags.length) return null;
  const hasVoice = audioTags.some((tag) => /data-audio-group\s*=\s*["']voiceover["']/i.test(tag) || /\bsrc\s*=\s*["'][^"']*voice[^"']*["']/i.test(tag));
  if (!hasVoice) return null;
  const missing = bgmTags.filter((tag) => !/data-fx-carve\s*=/i.test(tag));
  if (!missing.length) return null;
  return '배경음(<audio id="bgm">)에 더킹(data-fx-carve)이 빠져 있습니다 — 렌더링 전 배경음 줄이기(`npm run carve -- <폴더>`)를 적용하세요.';
}

/** 세로 쇼츠 화면에 0.5초 상단 훅 글자가 전혀 없는 빈 구성인지 검사한다. */
export function checkShortsTopHook(html) {
  const text = String(html || '');
  const w = Number((text.match(/data-width\s*=\s*["'](\d+)["']/i) || [])[1] || 0);
  const h = Number((text.match(/data-height\s*=\s*["'](\d+)["']/i) || [])[1] || 0);
  if (!(w > 0 && h > w)) return null; // 쇼츠(세로)가 아니면 건너뜀
  const bodyMatch = text.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const body = (bodyMatch ? bodyMatch[1] : text)
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!body.length) {
    return '쇼츠 화면에 보이는 글자(상단 0.5초 훅 포함)가 전혀 없습니다 — 1층 불변 규칙 위반입니다.';
  }
  return null;
}

function walkHtml(dir) {
  const files = [join(dir, 'index.html')];
  const compDir = join(dir, 'compositions');
  if (existsSync(compDir)) {
    const walk = (d) => {
      for (const entry of readdirSync(d, {withFileTypes: true})) {
        const p = join(d, entry.name);
        if (entry.isDirectory()) walk(p);
        else if (entry.name.endsWith('.html')) files.push(p);
      }
    };
    walk(compDir);
  }
  return files.filter((f) => existsSync(f));
}

function runOptionalExternalSlop(scriptPath) {
  if (!existsSync(EXTERNAL_SLOP_SCRIPT)) {
    return {available: false, blockers: ['필수 AI 티 검사기(slop-rewrite)를 찾을 수 없습니다. tools/slop-rewrite 설치를 확인하세요.'], note: ''};
  }
  try {
    execFileSync('python', ['-X', 'utf8', EXTERNAL_SLOP_SCRIPT, resolve(scriptPath), '--genre', '줄글', '--strict'], {
      cwd: EXTERNAL_SLOP_DIR,
      encoding: 'utf8',
      timeout: 20000,
    });
    return {available: true, blockers: [], note: '외부 slop-rewrite(67규칙) 통과'};
  } catch (err) {
    const out = `${err.stdout || ''}${err.stderr || ''}`.trim().split(/\r?\n/).slice(0, 6).join(' | ');
    return {available: true, blockers: [`외부 AI 말투 검사(slop-rewrite) 실패: ${out || err.message}`], note: ''};
  }
}

/**
 * 대표님 취향 검사를 참고 경고로 돌린다(2026-11-27 재검수: 드라이브로 나눈 취향 파일을 음성 관문이 안 돌렸다).
 * 막지 않는다 — 취향은 공식이 아니라 참고이고(채널 슬로건: 방법은 고정하지 않는다), 8개 중 3개는 사람만 판단하는 규칙이며,
 * 취향 파일이 아직 없는 PC도 있다. 파일이 없으면 안내 한 줄만 남긴다.
 */
export function runTasteCheck(scriptPath, {
  tasteFile = TASTE_FILE,
  tasteScript = TASTE_SCRIPT,
  run = (args) => execFileSync('python', args, {cwd: INTERNAL_SLOP_DIR, encoding: 'utf8', timeout: 20000}),
} = {}) {
  if (!existsSync(tasteScript) || !existsSync(tasteFile)) {
    return {warnings: [], note: '대표님 취향 검사: 이 PC에 취향 파일이 없어 건너뜀(npm run pc-sync 뒤 생김)'};
  }
  try {
    run(['-X', 'utf8', tasteScript, resolve(scriptPath), '--doc', tasteFile, '--strict']);
    return {warnings: [], note: '대표님 취향 검사 통과'};
  } catch (err) {
    const hits = String(err?.stdout || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => /\[W-\d+/.test(l));
    if (!hits.length) {
      const why = String(err?.stderr || err?.message || '').trim().split(/\r?\n/)[0];
      return {warnings: [`대표님 취향 검사를 돌리지 못했습니다: ${why}`], note: ''};
    }
    const shown = hits.slice(0, 5).map((l) => `대표님 취향(참고): ${l.replace(/^.*?:(\d+):\d+\s+/, '줄 $1 ')}`);
    if (hits.length > 5) shown.push(`대표님 취향(참고): …외 ${hits.length - 5}곳`);
    return {warnings: shown, note: ''};
  }
}

/**
 * 문턱 1: 음성 생성 직전 자동 검사.
 * - FACT-CHECK.md 존재·내용 확인
 * - 비교 시트 승인 상태(approved/published) 및 1층 차단 항목 0건 확인
 * - 대본/입력 문장의 금지어, 아라비아 숫자 입말, 한국어 자연스러움 오류 검사
 */
export function checkVoiceGate({projectDir = null, text = '', sheetsRoot = defaultSheetsDir, imageExists = null, skipSlop = false, preV4Sheets = PRE_V4_SHEETS} = {}) {
  const blockers = [];
  const warnings = [];
  const notes = [];
  const checkImg = imageExists || ((rel) => existsSync(join(sheetsRoot, rel)));

  if (text) {
    const banned = findBannedTerms(text);
    if (banned.length) {
      blockers.push(`음성 대본에 금지어(${[...new Set(banned.map((h) => h.term))].join(', ')})가 있습니다.`);
    }
    const digits = String(text).match(SPOKEN_DIGIT_RE);
    if (digits) {
      blockers.push(`음성 대본에 아라비아 숫자 입말(${digits.join(', ')})이 있습니다 — '네 글자·한 박자'처럼 고유어로 적으세요.`);
    }
  }

  if (projectDir) {
    const dir = resolve(projectDir);
    const factPath = join(dir, 'FACT-CHECK.md');
    if (!existsSync(factPath)) {
      blockers.push(`사실 확인 문서(FACT-CHECK.md)가 없습니다 (${basename(dir)}) — 팩트체크 없이 음성을 만들 수 없습니다.`);
    } else {
      const len = readFileSync(factPath, 'utf8').trim().length;
      if (len < MIN_FACT_CHECK_CHARS) {
        blockers.push(`FACT-CHECK.md 내용이 너무 짧습니다(${len}자, 최소 ${MIN_FACT_CHECK_CHARS}자) — 사실 확인을 채운 뒤 음성을 만드세요.`);
      }
    }

    const sheet = findMatchingSheet(dir, sheetsRoot);
    if (sheet) {
      if (sheet.status !== 'approved' && sheet.status !== 'published') {
        blockers.push(`비교 시트(${sheetIdOf(sheet)})가 아직 '${sheet.status}' 상태입니다 — 사용자 승인(approved) 후 음성을 만드세요.`);
      }
      // 프로젝트 폴더 이름 = 시트 안 이름이어야 한다(복사한 옛 시트의 이름·승인 상태로 지나가지 않게, 2026-11-27 재검수).
      const {blockers: sheetBlockers, warnings: sheetWarnings} = classifySheetProblems(sheet, {imageExists: checkImg, preV4Sheets, expectedId: basename(resolve(dir))});
      for (const b of sheetBlockers) blockers.push(`비교 시트 차단 항목: ${b}`);
      for (const w of sheetWarnings) warnings.push(`비교 시트 참고: ${w}`);
    } else if (isEpisodeRequiringSheet(dir)) {
      blockers.push(`비교 시트(data/youtube/transform-sheets/${basename(dir)}.json)가 없습니다 — 비교 시트 작성·승인 없이 음성을 만들 수 없습니다.`);
    }

    const scriptPath = join(dir, 'SCRIPT.md');
    if (existsSync(scriptPath)) {
      const md = readFileSync(scriptPath, 'utf8');
      const lines = extractNarration(md);
      const narText = lines.map((l) => l.text).join('\n');
      const banned = findBannedTerms(narText);
      if (banned.length) {
        blockers.push(`SCRIPT.md 나레이션에 금지어(${[...new Set(banned.map((h) => h.term))].join(', ')})가 있습니다.`);
      }
      const digits = narText.match(SPOKEN_DIGIT_RE);
      if (digits) {
        blockers.push(`SCRIPT.md 나레이션에 아라비아 숫자 입말(${[...new Set(digits)].join(', ')})이 있습니다.`);
      }
      const nat = checkNarration(md);
      for (const issue of nat.issues) {
        if (issue.severity === 'error') blockers.push(`SCRIPT.md 자연스러움 오류(줄 ${issue.line}): "${issue.match}" — ${issue.note}`);
        else warnings.push(`SCRIPT.md 참고(줄 ${issue.line}): "${issue.match}" — ${issue.note}`);
      }
      if (!skipSlop) {
        const slop = runOptionalExternalSlop(scriptPath);
        blockers.push(...slop.blockers);
        if (slop.note) notes.push(slop.note);
        const taste = runTasteCheck(scriptPath);
        warnings.push(...taste.warnings);
        if (taste.note) notes.push(taste.note);
      }
    }
  }

  return {ok: blockers.length === 0, blockers, warnings, notes};
}

/**
 * 문턱 2: 영상 렌더링 직전 자동 검사.
 * 1) 금지어(HTML·대본·프롬프트)  2) FACT-CHECK.md  3) 모바일 최소 글자 34px
 * 4) 배경음 더킹(data-fx-carve)  5) 쇼츠 상단 글자 존재  6) 화면 줄바꿈·넘침(Headless Chrome)
 */
export async function checkRenderGate({projectDir, runLayoutCheck = true, layoutChecker = checkTextLayout, skipBannedTerms = false} = {}) {
  const dir = resolve(projectDir);
  const blockers = [];
  const warnings = [];
  const notes = ['그림 파일 안에 그려진 글자와 네 모서리 워터마크는 눈으로 한 번 더 확인하세요.'];

  // 금지어 예외(ALLOW_BANNED_TERMS, 사용자가 이대로 렌더하라고 명시했을 때만)는 금지어 검사 하나만 건너뛴다.
  // 2026-11-27 재검수: 예전에는 이 표시 하나로 34px·더킹·화면 글자 검사까지 렌더 관문 전체가 꺼졌다.
  if (skipBannedTerms) {
    notes.push('금지어 검사는 사용자 예외 승인 표시로 건너뛰었고, 나머지 검사는 그대로 했습니다.');
  } else {
    const bannedHits = scanProject(dir);
    for (const hit of bannedHits.slice(0, 12)) {
      blockers.push(`금지어(${hit.file}:${hit.line}): "${hit.term}" | ${hit.context}`);
    }
    if (bannedHits.length > 12) blockers.push(`...외 금지어 ${bannedHits.length - 12}곳`);
  }

  if (isEpisodeRequiringSheet(dir)) {
    const factPath = join(dir, 'FACT-CHECK.md');
    if (!existsSync(factPath) || readFileSync(factPath, 'utf8').trim().length < MIN_FACT_CHECK_CHARS) {
      blockers.push(`사실 확인 문서(FACT-CHECK.md)가 없거나 비어 있습니다 (${basename(dir)}).`);
    }
  }

  for (const htmlFile of walkHtml(dir)) {
    const html = readFileSync(htmlFile, 'utf8');
    const rel = basename(htmlFile);
    for (const hit of findSmallFonts(html)) {
      blockers.push(`모바일 최소 글자 34px 미만(${rel}:${hit.line}): ${hit.raw} (1층 불변 하한 ${MIN_MOBILE_FONT_PX}px)`);
    }
    if (rel === 'index.html') {
      const duckErr = checkBgmDucking(html);
      if (duckErr) blockers.push(duckErr);
      const hookErr = checkShortsTopHook(html);
      if (hookErr) blockers.push(hookErr);
    }
  }

  // 빠른 정적 검사를 모두 통과한 경우에만 브라우저 기반 글자 넘침·줄바꿈 검사를 돌린다.
  if (blockers.length === 0 && runLayoutCheck && existsSync(join(dir, 'index.html'))) {
    try {
      const res = await layoutChecker(dir);
      for (const issue of (res?.issues || []).slice(0, 10)) {
        blockers.push(`화면 글자 깨짐(${issue.time}초 ${issue.kind}): ${issue.text || issue.detail || ''}`.trim());
      }
      if ((res?.issues || []).length > 10) blockers.push(`...외 화면 글자 문제 ${res.issues.length - 10}곳`);
    } catch (err) {
      warnings.push(`화면 글자 자동 검사를 실행하지 못했습니다(직접 확인 필요): ${err.message}`);
    }
  }

  return {ok: blockers.length === 0, blockers, warnings, notes};
}

/** 클로드 코드와 안티그래비티 훅 페이로드를 공통 형식으로 읽는다. */
export function parseHookInput(raw) {
  let input;
  try { input = JSON.parse(String(raw || '')); } catch { return null; }
  const isAntigravity = Boolean(input?.hookEventName || input?.toolCall);
  const command = isAntigravity
    ? String(input?.toolCall?.args?.CommandLine ?? '')
    : String(input?.tool_input?.command ?? '');
  const cwd = input?.cwd || input?.workspacePaths?.[0] || process.cwd();
  return {format: isAntigravity ? 'antigravity' : 'claude', command, cwd, raw: input};
}

function formatBlockMessage(title, result, allowEnv) {
  const lines = [
    `❌ ${title} (${result.blockers.length}건) — 실행을 멈췄습니다.`,
    ...result.blockers.map((b) => `  - ${b}`),
  ];
  if (result.warnings.length) {
    lines.push('참고 경고:');
    lines.push(...result.warnings.slice(0, 5).map((w) => `  · ${w}`));
  }
  lines.push(`문제를 고친 뒤 다시 실행하세요. 사용자가 명시적으로 예외를 승인한 경우에만 ${allowEnv}=1 을 붙입니다.`);
  return lines.join('\n');
}

/** 훅 실행기: 클로드 코드(exit 2 + stderr)와 안티그래비티(JSON decision: allow|deny + exit 0)를 모두 처리한다. */
export async function runHook(raw, {sheetsRoot = defaultSheetsDir, runLayoutCheck = true, layoutChecker = checkTextLayout, skipSlop = false, out = console.log, errOut = console.error} = {}) {
  const parsed = parseHookInput(raw);
  if (!parsed || !parsed.command) {
    if (parsed?.format === 'antigravity') out(JSON.stringify({decision: 'allow'}));
    return 0;
  }

  const allow = (msg = '') => {
    if (parsed.format === 'antigravity') out(JSON.stringify(msg ? {decision: 'allow', reason: msg} : {decision: 'allow'}));
    else if (msg) out(JSON.stringify({systemMessage: msg}));
    return 0;
  };
  const deny = (msg) => {
    if (parsed.format === 'antigravity') {
      out(JSON.stringify({decision: 'deny', reason: msg}));
      return 0;
    }
    errOut(msg);
    return 2;
  };

  // 1) 음성 생성 명령 관문
  // 금지어 예외 표시(ALLOW_BANNED_TERMS)는 렌더 전용이라 음성 관문을 건너뛰게 하지 않는다(2026-11-27 재검수).
  // 음성 도구 안쪽 관문(generate-aistudio-speech.mjs)도 이 표시를 보지 않는다.
  if (isVoiceCommand(parsed.command)) {
    if (parsed.command.includes(ALLOW_VOICE_GATE)) {
      return allow('음성 제작 관문: 사용자 예외 승인 표시가 있어 건너뜁니다.');
    }
    const info = parseVoiceCommandInfo(parsed.command, parsed.cwd);
    if (!info.projectDir && !info.text) return allow();
    const res = checkVoiceGate({projectDir: info.projectDir, text: info.text, sheetsRoot, skipSlop});
    if (!res.ok) return deny(formatBlockMessage('음성 제작 전 안전 관문 차단', res, ALLOW_VOICE_GATE));
    const tail = res.warnings.length ? ` (참고 경고 ${res.warnings.length}건)` : '';
    return allow(`음성 제작 전 안전 관문 통과${tail}`);
  }

  // 2) 영상 렌더링 명령 관문
  if (isRenderCommand(parsed.command)) {
    if (parsed.command.includes(ALLOW_RENDER_GATE)) {
      return allow('렌더링 안전 관문: 사용자 예외 승인 표시가 있어 건너뜁니다.');
    }
    const skipBannedTerms = parsed.command.includes(ALLOW_BANNED_TERMS);
    const projectDir = findRenderProject(parsed.command, parsed.cwd);
    if (!projectDir) {
      return allow('렌더링 안전 관문: 대상 프로젝트 폴더를 찾지 못해 건너뜁니다. `npm run check-gate -- render <폴더>`로 직접 확인하세요.');
    }
    const res = await checkRenderGate({projectDir, runLayoutCheck, layoutChecker, skipBannedTerms});
    if (!res.ok) return deny(formatBlockMessage('렌더링 전 안전 관문 차단', res, ALLOW_RENDER_GATE));
    const checked = skipBannedTerms ? '금지어는 사용자 예외로 건너뜀, 34px·더킹·화면 글자 확인 완료' : '금지어·34px·더킹·화면 글자 확인 완료';
    return allow(`렌더링 전 안전 관문 통과 (${checked}). ${res.notes[0]}`);
  }

  return allow();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--hook')) {
    const raw = readFileSync(0, 'utf8');
    process.exitCode = await runHook(raw);
    return;
  }
  const [mode, targetDir] = args.filter((a) => !a.startsWith('--'));
  const skipLayout = args.includes('--skip-layout');
  const skipSlop = args.includes('--skip-slop');
  const asJson = args.includes('--json');
  if (!mode || !targetDir || !['voice', 'render'].includes(mode)) {
    console.error('사용법: node scripts/production-gate.mjs <voice|render> <videos/프로젝트 폴더> [--skip-layout] [--json]');
    process.exitCode = 2;
    return;
  }
  const res = mode === 'voice'
    ? checkVoiceGate({projectDir: targetDir, skipSlop})
    : await checkRenderGate({projectDir: targetDir, runLayoutCheck: !skipLayout});
  if (asJson) {
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log(res.ok ? `✅ ${mode === 'voice' ? '음성' : '렌더링'} 안전 관문 통과: ${targetDir}` : `❌ ${mode === 'voice' ? '음성' : '렌더링'} 안전 관문 차단 (${res.blockers.length}건): ${targetDir}`);
    for (const b of res.blockers) console.log(`  [차단] ${b}`);
    for (const w of res.warnings) console.log(`  [참고] ${w}`);
    for (const n of res.notes) console.log(`  [안내] ${n}`);
  }
  process.exitCode = res.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
