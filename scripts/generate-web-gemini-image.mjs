import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Generates an image using Google Gemini Web (Imagen 3) on the AutomationProfile Chrome session via CDP.
 * Usage:
 *   node scripts/generate-web-gemini-image.mjs --prompt "..." --output "examples/test.png"
 */
const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

async function ensureChromeRunning() {
  try {
    const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
    if (res.ok) {
      return;
    }
  } catch (e) {
    // Not running, launch it
  }

  console.log('[Gemini Web] Chrome is not running. Launching Chrome with AutomationProfile...');
  const cp = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--remote-allow-origins=*',
    `--user-data-dir=${PROFILE_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://gemini.google.com/app'
  ], { detached: true, stdio: 'ignore' });
  cp.unref();

  // Wait for port to be ready
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (res.ok) {
        console.log('[Gemini Web] Chrome launched and ready.');
        return;
      }
    } catch {}
  }
  throw new Error('Failed to launch Chrome on port ' + DEBUG_PORT);
}

async function main() {
  const args = process.argv.slice(2);
  let prompt = '';
  let outputPath = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prompt' && args[i + 1]) {
      prompt = args[++i];
    } else if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[++i];
    }
  }

  if (!prompt) {
    console.error('Error: --prompt argument is required.');
    process.exit(1);
  }

  if (!outputPath) {
    outputPath = path.join('examples', `gemini_image_${Date.now()}.png`);
  }

  await ensureChromeRunning();

  console.log(`[Gemini Web] Connecting to Chrome CDP at http://localhost:${DEBUG_PORT}...`);
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const context = browser.contexts()[0];
  let page = context.pages().find(p => p.url().includes('gemini.google.com'));

  if (!page) {
    console.log('[Gemini Web] Opening Gemini tab...');
    page = await context.newPage();
    await page.goto('https://gemini.google.com/app', { waitUntil: 'domcontentloaded' });
  }

  await page.bringToFront();
  console.log(`[Gemini Web] Active page: ${page.url()}`);

  // Count existing images before sending prompt
  const existingCount = await page.evaluate(() => {
    return document.querySelectorAll('img[alt*="AI로 생성"], .image-button img').length;
  });

  const editor = page.locator('.ql-editor');
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  await editor.click();

  const formattedPrompt = prompt.startsWith('Generate an image:') || prompt.startsWith('Draw') 
    ? prompt 
    : `Generate an image: ${prompt}`;

  console.log(`[Gemini Web] Submitting prompt...`);
  await page.keyboard.insertText(formattedPrompt);
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');

  console.log(`[Gemini Web] Waiting for Imagen 3 generation to complete (up to 120s)...`);

  const startTime = Date.now();
  let saved = false;

  while (Date.now() - startTime < 120000) {
    await page.waitForTimeout(4000);

    const extractResult = await page.evaluate((prevCount) => {
      const candidates = Array.from(document.querySelectorAll('img[alt*="AI로 생성"], .image-button img'));
      if (candidates.length <= prevCount) return null;

      const img = candidates[candidates.length - 1];
      if (!img || !img.complete || img.naturalWidth < 200) return null;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        return {
          success: true,
          width: canvas.width,
          height: canvas.height,
          dataUrl
        };
      } catch (err) {
        return { error: err.message };
      }
    }, existingCount);

    if (extractResult && extractResult.success && extractResult.dataUrl) {
      const outDir = path.dirname(path.resolve(outputPath));
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      const base64Data = extractResult.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(path.resolve(outputPath), Buffer.from(base64Data, 'base64'));
      console.log(`[Gemini Web] Successfully generated and saved to: ${outputPath}`);
      console.log(`[Gemini Web] Resolution: ${extractResult.width}x${extractResult.height}`);
      saved = true;
      break;
    } else {
      process.stdout.write('.');
    }
  }

  if (!saved) {
    console.error('\n[Gemini Web] Timed out waiting for image generation.');
  }

  await browser.close();
}

main().catch(err => {
  console.error('[Gemini Web Error]', err);
  process.exit(1);
});
