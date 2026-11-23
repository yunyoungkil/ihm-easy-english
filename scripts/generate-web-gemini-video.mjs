// Gemini 웹 앱 (https://gemini.google.com/app) 영상 생성 3순위 자동화 스크립트(2026-11-23).
// AI Studio 및 Flow 크레딧을 모두 소진했을 때 Google AI Pro 채팅 컴퓨팅 풀(Gemini Omni, 9:16/16:9 네이티브 10초)로 생성하고,
// 사전 여백 구도 프롬프트 + 실측 기반 자동 워터마크 크롭(하단/우측 12.5% → 1080p) + 4모서리 검수 시트를 자동 생성한다.
//
// 사용:
//   npm run video:gemini -- --prompt "..." --output "videos/x/assets/clips/c01.mp4"
//     [--aspect 9:16|16:9] [--prompt-file p.txt] [--trim-ratio 0.125]
//     [--no-safe-margin] [--no-crop] [--keep-raw] [--mute]
//
// 클릭 지점(2026-11-23 직접 실측):
//   · 도구 메뉴: `button[aria-label="업로드 및 도구"]` → `:text("동영상 만들기")`
//   · 안내 모달: `button:has-text("사용해 보기")` (최초 1회)
//   · 비율 선택: `button[aria-label*="가로세로 비율"]` → `:text("세로 모드(9:16)")` / `:text("가로 모드(16:9)")`
//   · 입력·실행: `[role="textbox"], .ql-editor` → Enter (일시 오류 시 1회 자동 재시도)
//   · 다운로드: `<video>`의 contribution.usercontent.google.com src를 context.request.get으로 쿠키 포함 저장
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  buildPromptRecord,
  parseLineageArgs,
  readPromptArgs,
  sha256Prefix,
  writePromptRecord,
} from './aistudio-attachments.mjs';
import {
  DEFAULT_TRIM_RATIO,
  appendSafeMarginPrompt,
  cropWatermarkMedia,
  makeCornerCheckSheet,
} from './watermark-crop.mjs';

const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

export const GEMINI_APP_URL = 'https://gemini.google.com/app';
export const ASPECTS = ['9:16', '16:9'];

export function parseArgs(argv) {
  const out = {
    prompt: '',
    promptFile: '',
    output: '',
    aspect: '9:16',
    trimRatio: DEFAULT_TRIM_RATIO,
    safeMargin: true,
    crop: true,
    keepRaw: false,
    mute: false,
    parent: '',
    changedVar: '',
    status: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === '--no-safe-margin') { out.safeMargin = false; continue; }
    if (k === '--no-crop') { out.crop = false; continue; }
    if (k === '--keep-raw') { out.keepRaw = true; continue; }
    if (k === '--mute') { out.mute = true; continue; }
    if (!k.startsWith('--')) continue;
    const v = argv[i + 1];
    i += 1;
    if (k === '--prompt-file') out.promptFile = v;
    else if (k === '--trim-ratio') out.trimRatio = Number(v);
    else if (k === '--changed-var') out.changedVar = v;
    else out[k.slice(2)] = v;
  }
  out.prompt = readPromptArgs({ prompt: out.prompt, promptFile: out.promptFile });
  if (!out.prompt) throw new Error('--prompt 또는 --prompt-file이 필요합니다');
  if (!out.output) throw new Error('--output이 필요합니다');
  if (!ASPECTS.includes(out.aspect)) throw new Error(`--aspect는 ${ASPECTS.join(', ')} 중 하나여야 합니다`);
  if (!Number.isFinite(out.trimRatio) || out.trimRatio <= 0 || out.trimRatio >= 0.45) {
    throw new Error('--trim-ratio는 0 초과 0.45 미만 숫자여야 합니다');
  }
  out.lineage = parseLineageArgs({ parent: out.parent, changedVar: out.changedVar, status: out.status });
  return out;
}

async function ensureChrome() {
  try {
    if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return;
  } catch { /* 꺼져 있음 */ }
  const cp = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    GEMINI_APP_URL,
  ], { detached: true, stdio: 'ignore' });
  cp.unref();
  for (let i = 0; i < 24; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return;
    } catch { /* 대기 */ }
  }
  throw new Error(`자동화 크롬(포트 ${DEBUG_PORT}) 연결 실패`);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const finalPrompt = appendSafeMarginPrompt(args.prompt, { aspect: args.aspect, enabled: args.safeMargin });
  await ensureChrome();

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.setViewportSize({ width: 1500, height: 960 });

  try {
    await page.goto(GEMINI_APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);

    await page.locator('button[aria-label="업로드 및 도구"]').first().click();
    await page.waitForTimeout(800);
    await page.locator(':text("동영상 만들기")').first().click();
    await page.waitForTimeout(1800);

    const tryBtn = page.locator('button:has-text("사용해 보기")').first();
    if (await tryBtn.count()) {
      await tryBtn.click({ force: true });
      await page.waitForTimeout(900);
    }

    const ratioLabel = args.aspect === '9:16' ? '세로 모드(9:16)' : '가로 모드(16:9)';
    const ratioBtn = page.locator('button[aria-label*="가로세로 비율"]').first();
    if (await ratioBtn.count()) {
      await ratioBtn.click();
      await page.waitForTimeout(700);
      await page.locator(`:text("${ratioLabel}")`).first().click();
      await page.waitForTimeout(600);
    }

    const editor = page.locator('[role="textbox"], .ql-editor').first();
    await editor.click();
    await page.keyboard.insertText(finalPrompt);
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');

    console.log(`[Gemini Video] 생성 요청 전송 (${args.aspect}). 완료 대기 중...`);
    const deadline = Date.now() + 260000;
    let found = null;
    let retried = false;
    while (Date.now() < deadline) {
      await page.waitForTimeout(5000);
      const state = await page.evaluate(() => {
        const vids = Array.from(document.querySelectorAll('video'));
        const ready = vids.find((v) => (v.currentSrc || v.src) && v.videoWidth > 100);
        if (ready) {
          return {
            done: true,
            src: ready.currentSrc || ready.src,
            width: ready.videoWidth,
            height: ready.videoHeight,
            duration: ready.duration,
          };
        }
        const body = (document.body?.innerText || '').replace(/\s+/g, ' ');
        const hasErr = /encountered an error|오류가 발생|생성할 수 없|한도에 도달/i.test(body.slice(-300));
        return { done: false, hasErr };
      });
      if (state.done) {
        found = state;
        break;
      }
      if (state.hasErr && !retried) {
        retried = true;
        const retryBtn = page.locator('button[aria-label*="다시"], button[aria-label*="재생성"], button[aria-label*="Retry"], button[aria-label*="Regenerate"]').first();
        if (await retryBtn.count()) {
          await retryBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    }
    if (!found) throw new Error('Gemini 앱 영상 생성 실패 또는 시간 초과(260초)');

    const outAbs = resolve(args.output);
    const dir = dirname(outAbs);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const rawPath = args.crop ? `${outAbs}.raw.mp4` : outAbs;

    const resp = await context.request.get(found.src, { headers: { referer: page.url() } });
    if (!resp.ok()) throw new Error(`Gemini 앱 영상 다운로드 실패: HTTP ${resp.status()}`);
    writeFileSync(rawPath, await resp.body());

    let cropInfo = null;
    if (args.crop) {
      cropInfo = cropWatermarkMedia({
        input: rawPath,
        output: outAbs,
        trimRatio: args.trimRatio,
        mute: args.mute,
      });
      if (!args.keepRaw && existsSync(rawPath)) unlinkSync(rawPath);
    }

    const cornersPath = `${outAbs}.corners.png`;
    const cornerCheck = makeCornerCheckSheet({ input: outAbs, output: cornersPath });

    const lineage = args.lineage
      ? { ...args.lineage, parentSha256: args.lineage.parent ? sha256Prefix(args.lineage.parent) : null }
      : null;
    const rec = buildPromptRecord({
      tool: 'gemini-app-video',
      model: 'gemini-omni-app',
      prompt: finalPrompt,
      promptFile: args.promptFile || null,
      attachments: [],
      settings: {
        aspect: args.aspect,
        safeMargin: args.safeMargin,
        cropped: args.crop,
        trimRatio: args.crop ? args.trimRatio : 0,
        muted: args.mute,
      },
      output: {
        file: outAbs,
        width: cropInfo ? cropInfo.outW : found.width,
        height: cropInfo ? cropInfo.outH : found.height,
        durationSeconds: Math.round((found.duration || 0) * 1000) / 1000,
        cornersSheet: cornersPath,
      },
      lineage,
    });
    const recPath = writePromptRecord(outAbs, rec);

    console.log(JSON.stringify({
      ok: true,
      output: outAbs,
      cornersSheet: cornerCheck.output,
      record: recPath,
      rawDimensions: `${found.width}x${found.height}`,
      crop: cropInfo,
    }, null, 2));
  } finally {
    await page.close();
    await browser.close();
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isCli) {
  run().catch((err) => {
    console.error(`[Gemini Video] 실패: ${err.message}`);
    process.exitCode = 1;
  });
}
