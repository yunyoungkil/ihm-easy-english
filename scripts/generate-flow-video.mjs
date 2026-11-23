// Google Flow (https://flow.google.com) 영상 생성 2순위 자동화 스크립트(2026-11-23).
// AI Studio Omni 일일 한도(약 6회) 소진 시 Google AI Pro 월 1,000+일 50크레딧을 활용해 9:16/16:9 영상을 생성하고,
// 사전 여백 구도 프롬프트 + 실측 기반 자동 워터마크 크롭(하단/우측 12.5% → 1080p) + 4모서리 검수 시트까지 한 번에 마친다.
//
// 사용:
//   npm run video:flow -- --prompt "..." --output "videos/x/assets/clips/c01.mp4"
//     [--aspect 9:16|16:9] [--model "Omni 1.2 Flash"|"Veo 3.1 - Lite"] [--resolution 720p|360p]
//     [--project-url "https://flow.google.com/project/..."] [--ref a.png ...] [--prompt-file p.txt]
//     [--trim-ratio 0.125] [--no-safe-margin] [--no-crop] [--keep-raw] [--mute]
//
// 클릭 지점(2026-11-23 직접 실측, 화면이 바뀌면 여기만 고친다):
//   · 프로젝트 생성: https://flow.google.com/ → `:text("새 프로젝트")` (또는 --project-url 재사용)
//   · 안내 모달: `button:has-text("시작하기")`
//   · 에이전트 패널 닫기: `button[aria-label="닫기"]:has-text("right_panel_close")`
//   · 직접 생성 모드 전환: `button[aria-label="Flow 에이전트"]` OFF (설정 알약에 모델명 표시)
//   · 설정 팝업: `동영상` 탭 → `9:16`/`16:9` → 모델 드롭다운 → `720p`/`360p` → **`x1` 강제(크레딧 절약)**
//   · 입력·실행: `[role="textbox"]` → `button[aria-label="생성 시작"]`
//   · 결과 저장: 새로 나타난 `<video>` src를 context.request.get으로 쿠키 포함 다운로드 → 자동 크롭·4모서리 검수
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  IMAGE_EXT,
  VIDEO_EXT,
  buildPromptRecord,
  checkRefFile,
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

export const FLOW_URL = 'https://flow.google.com/';
export const ASPECTS = ['9:16', '16:9'];
export const RESOLUTIONS = ['360p', '720p'];
export const MODELS = ['Omni 1.2 Flash', 'Veo 3.1 - Lite'];
export const DEFAULT_MODEL = 'Omni 1.2 Flash';

export function parseArgs(argv) {
  const out = {
    prompt: '',
    promptFile: '',
    output: '',
    aspect: '9:16',
    model: DEFAULT_MODEL,
    resolution: '720p',
    projectUrl: '',
    refs: [],
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
    if (k === '--ref') out.refs.push(checkRefFile(v, [...IMAGE_EXT, ...VIDEO_EXT], '--ref'));
    else if (k === '--prompt-file') out.promptFile = v;
    else if (k === '--project-url') out.projectUrl = v;
    else if (k === '--trim-ratio') out.trimRatio = Number(v);
    else if (k === '--changed-var') out.changedVar = v;
    else out[k.slice(2)] = v;
  }
  out.prompt = readPromptArgs({ prompt: out.prompt, promptFile: out.promptFile });
  if (!out.prompt) throw new Error('--prompt 또는 --prompt-file이 필요합니다');
  if (!out.output) throw new Error('--output이 필요합니다');
  if (!ASPECTS.includes(out.aspect)) throw new Error(`--aspect는 ${ASPECTS.join(', ')} 중 하나여야 합니다`);
  if (!RESOLUTIONS.includes(out.resolution)) throw new Error(`--resolution은 ${RESOLUTIONS.join(', ')} 중 하나여야 합니다`);
  if (!MODELS.includes(out.model)) throw new Error(`--model은 ${MODELS.join(', ')} 중 하나여야 합니다`);
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
    FLOW_URL,
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

async function downloadVideo(context, page, src, outPath) {
  const dir = dirname(resolve(outPath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (src.startsWith('blob:')) {
    const b64 = await page.evaluate(async (u) => {
      const res = await fetch(u);
      const buf = await res.arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(bin);
    }, src);
    writeFileSync(resolve(outPath), Buffer.from(b64, 'base64'));
    return;
  }
  const resp = await context.request.get(src, { headers: { referer: page.url() } });
  if (!resp.ok()) throw new Error(`Flow 영상 다운로드 실패: HTTP ${resp.status()}`);
  writeFileSync(resolve(outPath), await resp.body());
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
    if (args.projectUrl) {
      await page.goto(args.projectUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4500);
    } else {
      await page.goto(FLOW_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4500);
      await page.locator(':text("새 프로젝트")').first().click({ force: true });
      await page.waitForTimeout(5500);
    }

    // 안내 모달이 있으면 닫기
    const startBtn = page.locator('button:has-text("시작하기")').first();
    if (await startBtn.count()) {
      await startBtn.click({ force: true });
      await page.waitForTimeout(1200);
    }
    // 우측 에이전트 패널 닫기
    const closeRight = page.locator('button[aria-label="닫기"]:has-text("right_panel_close")').first();
    if (await closeRight.count()) {
      await closeRight.click();
      await page.waitForTimeout(800);
    }
    // 직접 생성 모드 보장(Flow 에이전트 OFF)
    const pillSelector = 'button:has-text("Nano Banana"), button:has-text("Omni"), button:has-text("Veo"), button:has-text("동영상 ·")';
    if (!(await page.locator(pillSelector).first().count())) {
      const agentToggle = page.locator('button[aria-label="Flow 에이전트"]').first();
      if (await agentToggle.count()) {
        await agentToggle.click();
        await page.waitForTimeout(1200);
      }
    }

    // 설정 팝업 열기 → 동영상 → 비율 → 모델 → 해상도 → x1
    await page.locator(pillSelector).first().click();
    await page.waitForTimeout(900);
    await page.locator('button:has-text("동영상"), [role="tab"]:has-text("동영상")').first().click();
    await page.waitForTimeout(700);
    await page.locator(`button:has-text("${args.aspect}")`).first().click();
    await page.waitForTimeout(400);

    // 모델 선택
    const modelBtn = page.locator('button:has-text("Omni"), button:has-text("Veo")').last();
    if (await modelBtn.count()) {
      const curText = (await modelBtn.innerText()).trim();
      if (!curText.includes(args.model)) {
        await modelBtn.click();
        await page.waitForTimeout(600);
        await page.locator(`[role="option"]:has-text("${args.model}"), button:has-text("${args.model}")`).first().click();
        await page.waitForTimeout(600);
      }
    }
    // 해상도(360p/720p) 및 출력 개수 x1 강제
    const resBtn = page.locator(`button:has-text("${args.resolution}")`).first();
    if (await resBtn.count()) {
      await resBtn.click();
      await page.waitForTimeout(300);
    }
    const x1Btn = page.locator('button:has-text("x1")').first();
    if (await x1Btn.count()) {
      await x1Btn.click();
      await page.waitForTimeout(300);
    }

    // 참고 이미지 첨부(선택)
    for (const refPath of args.refs) {
      await page.locator('button[aria-label="프롬프트 상자에 소재 추가"]').first().click();
      await page.waitForTimeout(700);
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count()) {
        await fileInput.setInputFiles(resolve(refPath));
        await page.waitForTimeout(2500);
      }
    }

    // 기존 비디오 src 목록 기억(새로 생성된 것만 잡기 위해)
    const beforeSrcs = await page.evaluate(() =>
      Array.from(document.querySelectorAll('video')).map((v) => v.currentSrc || v.src).filter(Boolean),
    );

    const inputBox = page.locator('[role="textbox"], textarea, [contenteditable="true"]').first();
    await inputBox.click();
    await page.waitForTimeout(300);
    await page.keyboard.insertText(finalPrompt);
    await page.waitForTimeout(400);
    await page.locator('button[aria-label="생성 시작"], button:has-text("arrow_forward")').last().click();

    console.log(`[Flow Video] 생성 요청 전송 (${args.model}, ${args.aspect}, ${args.resolution}, x1). 완료 대기 중...`);
    const deadline = Date.now() + 260000;
    let found = null;
    while (Date.now() < deadline) {
      await page.waitForTimeout(5000);
      found = await page.evaluate((prev) => {
        const prevSet = new Set(prev);
        const vids = Array.from(document.querySelectorAll('video'));
        const fresh = vids.find((v) => {
          const s = v.currentSrc || v.src;
          return s && !prevSet.has(s) && v.videoWidth > 100;
        });
        if (!fresh) return null;
        return {
          src: fresh.currentSrc || fresh.src,
          width: fresh.videoWidth,
          height: fresh.videoHeight,
          duration: fresh.duration,
        };
      }, beforeSrcs);
      if (found) break;
    }
    if (!found) throw new Error('Flow 영상 생성 시간 초과(260초)');

    const outAbs = resolve(args.output);
    const rawPath = args.crop ? `${outAbs}.raw.mp4` : outAbs;
    await downloadVideo(context, page, found.src, rawPath);

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

    const attachments = args.refs.map((p) => ({ role: 'ref', path: p, sha256: sha256Prefix(p) }));
    const lineage = args.lineage
      ? { ...args.lineage, parentSha256: args.lineage.parent ? sha256Prefix(args.lineage.parent) : null }
      : null;
    const rec = buildPromptRecord({
      tool: 'google-flow-video',
      model: args.model,
      prompt: finalPrompt,
      promptFile: args.promptFile || null,
      attachments,
      settings: {
        aspect: args.aspect,
        resolution: args.resolution,
        safeMargin: args.safeMargin,
        cropped: args.crop,
        trimRatio: args.crop ? args.trimRatio : 0,
        muted: args.mute,
        projectUrl: page.url(),
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
      projectUrl: page.url(),
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
    console.error(`[Flow Video] 실패: ${err.message}`);
    process.exitCode = 1;
  });
}
