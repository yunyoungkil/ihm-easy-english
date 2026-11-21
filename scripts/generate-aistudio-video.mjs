// Google AI Studio 영상 생성(Gemini Omni 1.2 Flash) 전용 자동화 스크립트(2026-11-20).
// API 키를 쓰지 않고 자동화용 크롬(Gemini-Automation 프로필, 포트 9222)으로 무료 생성한다.
// 2026-11-12 실측: 눈에 보이는 워터마크 없음(비가시 SynthID 별도). Omni는 영상에 소리(환경음·대사)를 함께 만든다.
// 2026-11-21부터 소리를 기본으로 살린다(유튜브 조사: 효과음·환경음이 "가짜 느낌"을 덜어 준다, knowledge/ai-craft-research-2026-11-21.md).
// 소리가 필요 없는 클립만 --mute로 ffmpeg(-an) 무음 처리한다. --keep-audio는 옛 옵션이라 받기만 한다(기본과 같음).
// HyperFrames에서 클립 소리를 쓰려면 <video data-has-audio="true">로 두거나, 소리를 따로 뽑아 <audio>(video는 muted)로 둔다(hyperframes-core creator-editing-recipes).
//
// 사용:
//   node scripts/generate-aistudio-video.mjs --prompt "..." --output "videos/x/assets/broll/clip.mp4" [--aspect 9:16] [--duration 5] [--resolution 720p] [--mute]
//        [--first a.png] [--last b.png] [--ref c.jpg --ref d.mp4] [--prompt-file p.txt]
//   --first 첫 장면(이미지), --last 끝 장면(이미지), --ref 참고(이미지·영상, 여러 번 가능), --prompt-file 은 --prompt 대신 파일에서 읽음.
//   --image는 --first의 옛 이름(둘 중 하나만). 결과 옆에 <파일>.prompt.json(실제로 보낸 지시문·첨부와 해시·설정)이 남는다.
//
// 클릭 지점(2026-11-20 직접 확인, 화면이 바뀌면 여기만 고친다):
//   · 새 대화 주소: https://aistudio.google.com/prompts/new_chat?model=gemini-omni-1.2-flash
//   · 프롬프트 입력: textarea[aria-label="Enter a prompt"]
//   · 비율: mat-select[aria-label="Aspect ratio"] (Auto | 16:9 | 9:16)
//   · 길이: input[type="text"][aria-label="Video duration in seconds"] (3~15)
//   · 해상도: mat-select[aria-label="Video Resolution"] (360p | 720p | 1080p | 4k)
//   · 첨부(선택, 2026-11-21 확인): button[aria-label="Insert images, videos, or files"] → 메뉴 "Upload files" → filechooser, 숨은 input[type=file] 하나(multiple).
//     Omni 화면에는 첫 장면·끝 장면 전용 칸이 없다 → 첨부 순서(첫 장면 1번, 끝 장면 마지막)와 지시문 앞 영어 한 줄로 알려 준다. 한 장씩 순서대로 올린다.
//   · 실행: button.ctrl-enter-submits (2026-11-21 확인 — 끝에 s, 없으면 프롬프트 칸에서 Ctrl+Enter)
//   · 결과: 대화 안 <video>의 blob:/data: src를 바이트로 꺼내 저장(소리 유지, --mute일 때만 -an 무음 정리)
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { IMAGE_EXT, VIDEO_EXT, attachFiles, buildPromptRecord, checkRefFile, composePrompt, framePromptPrefix, orderAttachments, readPromptArgs, sha256Prefix, writePromptRecord } from './aistudio-attachments.mjs';

const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

export const DEFAULT_MODEL = 'gemini-omni-1.2-flash';
export const ASPECTS = ['Auto', '16:9', '9:16'];
export const RESOLUTIONS = ['360p', '720p', '1080p', '4k'];
export const MIN_DURATION = 3;
export const MAX_DURATION = 15;
export const DEFAULT_DURATION = 5;
export const DEFAULT_RESOLUTION = '720p';

export function parseArgs(argv) {
  const out = {
    model: DEFAULT_MODEL,
    aspect: '9:16',
    duration: DEFAULT_DURATION,
    resolution: DEFAULT_RESOLUTION,
    prompt: '',
    output: '',
    image: '',
    first: '',
    last: '',
    refs: [],
    promptFile: '',
    keepAudio: true,
  };
  let imageArg = '';
  let sawMute = false;
  let sawKeep = false;
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--mute') { sawMute = true; out.keepAudio = false; continue; }
    if (key === '--keep-audio') { sawKeep = true; continue; }
    if (!key.startsWith('--')) continue;
    const val = argv[i + 1];
    i += 1;
    if (key === '--duration') out.duration = Number(val);
    else if (key === '--image') imageArg = val;
    else if (key === '--first') out.first = checkRefFile(val, IMAGE_EXT, '--first');
    else if (key === '--last') out.last = checkRefFile(val, IMAGE_EXT, '--last');
    else if (key === '--ref') out.refs.push(checkRefFile(val, [...IMAGE_EXT, ...VIDEO_EXT], '--ref'));
    else if (key === '--prompt-file') out.promptFile = val;
    else out[key.slice(2)] = val;
  }
  if (sawMute && sawKeep) throw new Error('--mute와 --keep-audio는 같이 줄 수 없습니다(소리는 기본으로 살린다)');
  // --image는 --first의 옛 이름
  if (imageArg) {
    if (out.first) throw new Error('--image는 --first의 옛 이름이라 둘 중 하나만 줄 수 있습니다');
    out.first = checkRefFile(imageArg, IMAGE_EXT, '--image');
  }
  out.image = out.first;
  out.prompt = readPromptArgs({ prompt: out.prompt, promptFile: out.promptFile });
  if (!out.prompt || !String(out.prompt).trim()) throw new Error('--prompt가 필요합니다');
  if (!out.output) throw new Error('--output이 필요합니다');
  if (!ASPECTS.includes(out.aspect)) throw new Error(`--aspect는 ${ASPECTS.join(', ')} 중 하나여야 합니다(1:1 미지원)`);
  if (!Number.isInteger(out.duration) || out.duration < MIN_DURATION || out.duration > MAX_DURATION) {
    throw new Error(`--duration은 ${MIN_DURATION}~${MAX_DURATION} 사이 정수여야 합니다`);
  }
  if (!RESOLUTIONS.includes(out.resolution)) throw new Error(`--resolution은 ${RESOLUTIONS.join(', ')} 중 하나여야 합니다`);
  if (!/^[\w.-]+$/.test(out.model)) throw new Error('--model 형식이 이상합니다');
  return out;
}

/** 결과 파일 확장자를 실제 비디오 MIME에 맞춘다(기본 .mp4). */
export function extensionForVideo(mime, output) {
  const want = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' }[String(mime || '').split(';')[0].trim()] || 'mp4';
  const m = String(output).match(/\.([A-Za-z0-9]+)$/);
  if (m && m[1].toLowerCase() === want) return output;
  return m ? String(output).slice(0, -m[0].length) + '.' + want : output + '.' + want;
}

/** Omni 1.2 Flash가 강제로 넣는 오디오 트랙을 ffmpeg(-an -c:v copy)로 제거한다. */
export function stripVideoAudio(filePath, runner = spawnSync) {
  const ext = (String(filePath).match(/\.([A-Za-z0-9]+)$/) || [, 'mp4'])[1];
  const tmpPath = `${filePath}.muted.${ext}`;
  const res = runner('ffmpeg', ['-y', '-v', 'error', '-i', filePath, '-an', '-c:v', 'copy', tmpPath], { encoding: 'utf8' });
  if (res.status !== 0) {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    throw new Error(`무음 정리(ffmpeg -an) 실패: ${(res.stderr || res.error?.message || '').trim()}`);
  }
  renameSync(tmpPath, filePath);
  return filePath;
}

async function ensureChrome() {
  try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* 꺼져 있음 */ }
  spawn(CHROME_PATH, [`--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check', 'https://aistudio.google.com'], { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* 계속 기다림 */ }
  }
  throw new Error('자동화용 크롬(9222)을 켜지 못했습니다');
}

/** 아래쪽 쿠키 안내 띠. 떠 있으면 버튼 클릭을 가로막는다(2026-11-21 확인: "intercepts pointer events"로 시간 초과). */
export const COOKIE_BAR = '.glue-cookie-notification-bar.visible, [id^="glue-cookie-notification-bar"].visible';

async function dismissCookieBar(page) {
  const bar = page.locator(COOKIE_BAR).first();
  if (!(await bar.count())) return;
  const ok = bar.locator('button').filter({ hasText: /ok|got it|agree|accept|확인|동의/i }).first();
  if (await ok.count()) await ok.click().catch(() => {});
  await page.waitForTimeout(500);
  // 버튼 글자가 달라 못 눌렀으면 띠만 화면에서 숨긴다(동의 여부는 건드리지 않음)
  await page.evaluate((sel) => document.querySelectorAll(sel).forEach((el) => { el.style.display = 'none'; }), COOKIE_BAR);
}

async function dismissOverlays(page) {
  await dismissCookieBar(page);
  for (let i = 0; i < 4; i += 1) {
    if (!(await page.locator('.cdk-overlay-backdrop-showing').count())) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }
}

async function selectMatOption(page, ariaLabel, optionName) {
  const sel = page.locator(`mat-select[aria-label="${ariaLabel}"]`).first();
  if (!(await sel.count())) return;
  const cur = (await sel.innerText()).trim();
  if (cur === optionName) return;
  await sel.click();
  await page.waitForTimeout(600);
  await page.getByRole('option', { name: optionName, exact: true }).first().click();
  await page.waitForTimeout(500);
}

/** 실행 버튼. 클래스 이름이 바뀌어도 잡히게 type=submit + 글자도 함께 본다. */
export const RUN_BUTTON = 'button.ctrl-enter-submits, button.ctrl-enter-submit, button[type="submit"]:has-text("Run")';

const LIMIT_RE = /rate limit|quota|exceeded|resource.?exhausted|too many requests|try again later/i;
const ERROR_RE = /something went wrong|failed to generate|an error occurred/i;

export async function generateAiStudioVideo(options) {
  try {
    return await generateOnce(options);
  } catch (err) {
    if (/로그인|요금제|한도/.test(err.message)) throw err;
    return generateOnce(options);
  }
}

async function generateOnce({
  prompt,
  output,
  aspect = '9:16',
  duration = DEFAULT_DURATION,
  resolution = DEFAULT_RESOLUTION,
  model = DEFAULT_MODEL,
  first = '',
  last = '',
  refs = [],
  promptFile = '',
  keepAudio = true,
}) {
  await ensureChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
  const page = await browser.contexts()[0].newPage();
  try {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`https://aistudio.google.com/prompts/new_chat?model=${model}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(14000);
    await dismissOverlays(page);

    const headText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    if (/sign in|로그인/i.test(headText) && !/Playground/.test(headText)) {
      throw new Error('AI Studio에 로그인이 필요합니다(Gemini-Automation 크롬에서 1회 로그인)');
    }
    if (/only available with a Google AI plan/.test(headText)) {
      throw new Error(`${model}은(는) 이 계정에서 요금제가 필요한 모델입니다. 결제는 누르지 않고 멈춥니다.`);
    }

    // 설정 패널이 닫혀 있으면 연다
    if (!(await page.locator('mat-select[aria-label="Aspect ratio"]').count())) {
      const tuneBtn = page.locator('button:has-text("tune")').first();
      if (await tuneBtn.count()) {
        await tuneBtn.click();
        await page.waitForTimeout(1000);
      }
    }

    await selectMatOption(page, 'Aspect ratio', aspect);
    await selectMatOption(page, 'Video Resolution', resolution);

    const durInput = page.locator('input[type="text"][aria-label="Video duration in seconds"]').first();
    if (await durInput.count()) {
      const box = await durInput.boundingBox();
      if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.keyboard.press('Control+A');
        await page.keyboard.insertText(String(duration));
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);
      }
    }

    // 첨부(첫 장면 → 참고 → 끝 장면 순서, 한 장씩). 첫·끝 장면은 지시문 앞 문장으로 알린다.
    const attachments = orderAttachments({ first, refs, last });
    if (attachments.length) await attachFiles(page, attachments);
    const sentPrompt = composePrompt(framePromptPrefix(attachments), prompt);

    // 프롬프트 입력 및 생성 시작
    const promptBox = page.locator('textarea[aria-label="Enter a prompt"]').first();
    await promptBox.click();
    await promptBox.fill(sentPrompt);

    const readVideos = () => page.evaluate(() =>
      [...document.querySelectorAll('video')]
        .map((v) => ({
          src: v.currentSrc || v.src || v.querySelector('source')?.src || '',
          ready: v.readyState,
          dur: Number.isFinite(v.duration) ? v.duration : 0,
        }))
        .filter((v) => v.src && (v.src.startsWith('blob:') || v.src.startsWith('data:video') || v.src.includes('generativelanguage')))
    );
    const beforeCount = (await readVideos()).length;

    // 2026-11-21 확인: 실제 클래스는 ctrl-enter-submits(끝에 s). 못 찾으면 프롬프트 칸에서 Ctrl+Enter(이미지 스크립트와 같은 방식).
    const runBtn = page.locator(RUN_BUTTON).first();
    if (await runBtn.count()) await runBtn.click();
    else { await promptBox.click(); await page.keyboard.press('Control+Enter'); }

    // 영상 생성 대기(최대 4분)
    let found = null;
    for (let t = 0; t < 120; t += 1) {
      await page.waitForTimeout(2000);
      const vids = await readVideos();
      if (vids.length > beforeCount) {
        const last = vids[vids.length - 1];
        if (last.dur > 0.5 || last.ready >= 2) {
          found = last;
          break;
        }
      }
      const errMsg = await page.evaluate(() => [...document.querySelectorAll('.cdk-overlay-container, [class*="error"], snack-bar-container')].map((e) => e.innerText).join(' '));
      const cleanErr = errMsg.replace(/\s+/g, ' ').slice(0, 300);
      if (LIMIT_RE.test(errMsg)) throw new Error(`한도 안내가 떴습니다: ${cleanErr}`);
      if (ERROR_RE.test(errMsg)) throw new Error(`생성 오류가 떴습니다: ${cleanErr}`);
    }
    if (!found) throw new Error('영상이 만들어지지 않았습니다(시간 초과)');

    // 영상 바이트 추출
    const payload = await page.evaluate(async (src) => {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const base64 = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result).split(',')[1]);
        fr.onerror = () => rej(new Error('FileReader 실패'));
        fr.readAsDataURL(blob);
      });
      return { base64, mime: blob.type || 'video/mp4', size: blob.size };
    }, found.src);

    const file = resolve(extensionForVideo(payload.mime, output));
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(payload.base64, 'base64'));
    if (!keepAudio) stripVideoAudio(file);

    const record = writePromptRecord(file, buildPromptRecord({
      tool: 'aistudio-video',
      model,
      prompt: sentPrompt,
      promptFile: promptFile || null,
      attachments: attachments.map((a) => ({ ...a, sha256: sha256Prefix(a.path) })),
      settings: { aspect, duration, resolution, keepAudio },
      output: { file, mime: payload.mime, bytes: payload.size, duration: found.dur || duration },
    }));

    return {
      file,
      record,
      mime: payload.mime,
      bytes: payload.size,
      duration: found.dur || duration,
      aspect,
      resolution,
      muted: !keepAudio,
      model,
    };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isCli) {
  try {
    const r = await generateAiStudioVideo(parseArgs(process.argv.slice(2)));
    console.log(`저장: ${r.file} (${r.aspect}, ${r.resolution}, ${Math.round(r.duration * 10) / 10}s, ${r.muted ? '무음 정리됨' : '오디오 유지'}, ${r.model}), 기록: ${r.record}`);
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
