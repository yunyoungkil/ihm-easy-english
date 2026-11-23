import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readPromptArgs } from './aistudio-attachments.mjs';
import {
  DEFAULT_TRIM_RATIO,
  appendSafeMarginPrompt,
  cropWatermarkMedia,
  makeCornerCheckSheet,
} from './watermark-crop.mjs';

/**
 * Gemini 웹 앱(https://gemini.google.com/app) 이미지 생성 비상(2순위) 스크립트.
 * 1순위 AI Studio(Nano Banana 2.1, 무워터마크) 한도 소진 시에만 사용한다.
 * 2026-11-23 보강: 사전 여백 구도 프롬프트 + 우하단 별 로고 자동 크롭 + 4모서리 검수 시트 지원.
 *
 * Usage:
 *   npm run image:gemini -- --prompt "..." --output "examples/test.png" [--aspect 9:16|16:9|1:1]
 *     [--prompt-file p.txt] [--trim-ratio 0.125] [--no-safe-margin] [--no-crop] [--keep-raw]
 */
const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

export const IMAGE_ASPECTS = ['16:9', '9:16', '1:1', '3:4', '4:3'];

export function parseArgs(argv) {
  const out = {
    prompt: '',
    promptFile: '',
    output: '',
    aspect: '1:1',
    trimRatio: DEFAULT_TRIM_RATIO,
    safeMargin: true,
    crop: true,
    keepRaw: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (k === '--no-safe-margin') { out.safeMargin = false; continue; }
    if (k === '--no-crop') { out.crop = false; continue; }
    if (k === '--keep-raw') { out.keepRaw = true; continue; }
    if (!k.startsWith('--')) continue;
    const v = argv[i + 1];
    i += 1;
    if (k === '--prompt-file') out.promptFile = v;
    else if (k === '--trim-ratio') out.trimRatio = Number(v);
    else out[k.slice(2)] = v;
  }
  out.prompt = readPromptArgs({ prompt: out.prompt, promptFile: out.promptFile });
  if (!out.prompt) throw new Error('--prompt 또는 --prompt-file이 필요합니다');
  if (!out.output) out.output = path.join('examples', `gemini_image_${Date.now()}.png`);
  if (!IMAGE_ASPECTS.includes(out.aspect)) throw new Error(`--aspect는 ${IMAGE_ASPECTS.join(', ')} 중 하나여야 합니다`);
  if (!Number.isFinite(out.trimRatio) || out.trimRatio <= 0 || out.trimRatio >= 0.45) {
    throw new Error('--trim-ratio는 0 초과 0.45 미만 숫자여야 합니다');
  }
  return out;
}

async function ensureChromeRunning() {
  try {
    const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    if (res.ok) return;
  } catch { /* Not running */ }

  console.log('[Gemini Web] Chrome is not running. Launching Chrome with AutomationProfile...');
  const cp = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://gemini.google.com/app',
  ], { detached: true, stdio: 'ignore' });
  cp.unref();

  for (let i = 0; i < 20; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        console.log('[Gemini Web] Chrome launched and ready.');
        return;
      }
    } catch { /* wait */ }
  }
  throw new Error('Failed to launch Chrome on port ' + DEBUG_PORT);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const marginedPrompt = appendSafeMarginPrompt(args.prompt, { aspect: args.aspect, enabled: args.safeMargin });

  await ensureChromeRunning();

  console.log(`[Gemini Web] Connecting to Chrome CDP at http://localhost:${DEBUG_PORT}...`);
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
  const context = browser.contexts()[0];
  const page = await context.newPage();
  await page.setViewportSize({ width: 1500, height: 960 });

  try {
    await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);

    // 2026-11 신규 UI: 업로드 및 도구 -> 이미지 만들기 -> 가로세로 비율 선택 시도
    try {
      const plusBtn = page.locator('button[aria-label="업로드 및 도구"]').first();
      if (await plusBtn.count()) {
        await plusBtn.click();
        await page.waitForTimeout(700);
        const imgTool = page.locator(':text("이미지 만들기")').first();
        if (await imgTool.count()) {
          await imgTool.click();
          await page.waitForTimeout(1400);
          const ratioBtn = page.locator('button:has-text("가로세로 비율"), button[aria-label*="가로세로 비율"]').first();
          if (await ratioBtn.count()) {
            await ratioBtn.click();
            await page.waitForTimeout(700);
            const opt = page.locator(`:text("${args.aspect}")`).first();
            if (await opt.count()) {
              await opt.click();
              await page.waitForTimeout(500);
            } else {
              await page.keyboard.press('Escape');
            }
          }
        }
      }
    } catch { /* 도구 메뉴 미존재 시 기본 채팅 프롬프트로 폴백 */ }

    const existingCount = await page.evaluate(() =>
      document.querySelectorAll('img[alt*="AI로 생성"], .image-button img, img[src*="lh3.googleusercontent"]').length,
    );

    const editor = page.locator('[role="textbox"], .ql-editor').first();
    await editor.waitFor({ state: 'visible', timeout: 15000 });
    await editor.click();

    const formattedPrompt = marginedPrompt.startsWith('Generate an image:') || marginedPrompt.startsWith('Draw')
      ? marginedPrompt
      : `Generate an image (${args.aspect} aspect ratio): ${marginedPrompt}`;

    console.log('[Gemini Web] Submitting prompt...');
    await page.keyboard.insertText(formattedPrompt);
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');

    console.log('[Gemini Web] Waiting for image generation (up to 120s)...');
    const startTime = Date.now();
    let saved = false;

    while (Date.now() - startTime < 120000) {
      await page.waitForTimeout(4000);
      const imgSrc = await page.evaluate((prevCount) => {
        const candidates = Array.from(document.querySelectorAll('img[alt*="AI로 생성"], .image-button img, img[src*="lh3.googleusercontent"]'))
          .filter((img) => img.complete && img.naturalWidth >= 400);
        if (candidates.length <= prevCount) return null;
        const img = candidates[candidates.length - 1];
        return { src: img.currentSrc || img.src, width: img.naturalWidth, height: img.naturalHeight };
      }, existingCount);

      if (imgSrc?.src) {
        const outAbs = path.resolve(args.output);
        const outDir = path.dirname(outAbs);
        if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
        const rawPath = args.crop ? `${outAbs}.raw.png` : outAbs;

        const resp = await context.request.get(imgSrc.src, { headers: { referer: page.url() } });
        if (!resp.ok()) throw new Error(`이미지 다운로드 실패: HTTP ${resp.status()}`);
        fs.writeFileSync(rawPath, await resp.body());

        let cropInfo = null;
        if (args.crop) {
          cropInfo = cropWatermarkMedia({
            input: rawPath,
            output: outAbs,
            trimRatio: args.trimRatio,
          });
          if (!args.keepRaw && fs.existsSync(rawPath)) fs.unlinkSync(rawPath);
        }

        const cornersPath = `${outAbs}.corners.png`;
        makeCornerCheckSheet({ input: outAbs, output: cornersPath });
        console.log(JSON.stringify({
          ok: true,
          output: outAbs,
          cornersSheet: cornersPath,
          rawDimensions: `${imgSrc.width}x${imgSrc.height}`,
          crop: cropInfo,
        }, null, 2));
        saved = true;
        break;
      } else {
        process.stdout.write('.');
      }
    }

    if (!saved) {
      throw new Error('Timed out waiting for image generation.');
    }
  } finally {
    await page.close();
    await browser.close();
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isCli) {
  main().catch((err) => {
    console.error('[Gemini Web Error]', err.message || err);
    process.exitCode = 1;
  });
}
