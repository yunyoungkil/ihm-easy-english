// Google AI Studio 음악 생성(Lyria 3.5) 전용 자동화 스크립트(2026-11-20).
// API 키를 쓰지 않고 자동화용 크롬(Gemini-Automation 프로필, 포트 9222)으로 무료 생성한다.
// 2026-11-12 실측 교훈 반영:
//   · Text 모드에서 "No vocals, no humming" 같은 부정어를 쓰면 후반에 허밍이 섞이는 역효과가 있다.
//   · 기본값은 검증된 Composer 모드(Intro → Verse → Outro 3구간) + 긍정문 전용 프롬프트이며,
//     보컬/허밍 관련 단어는 기본 차단한다(--allow-vocals로만 허용).
//   · 결과 MP3의 내장 C2PA ID3 메타데이터는 기본으로 ffmpeg(-map 0:a:0 -c:a copy -map_metadata -1)로 정리한다.
//
// 사용:
//   node scripts/generate-aistudio-music.mjs --prompt "Instrumental only, 95 BPM, warm felt piano and soft brushed drums" --output "videos/x/assets/bgm/track.mp3" [--mode composer] [--sections "Intro:0:00-0:06,Verse:0:06-0:36,Outro:0:36-0:44"] [--keep-metadata]
//
// 클릭 지점(2026-11-20 직접 확인, 화면이 바뀌면 여기만 고친다):
//   · 주소: https://aistudio.google.com/new_music?model=lyria-3.5
//   · 초기 에디터 열기: button[data-testid="text-input"]
//   · 모드 전환: button:has-text("Text") | button:has-text("Composer")
//   · Text 입력: textarea[aria-label="Prompt input"]
//   · Composer 섹션 추가: button:has-text("Intro"|"Verse"|"Chorus"|"Bridge"|"Outro"|"Build")
//   · Composer 블록 칸: input.time-input[aria-label="Start time"], input.time-input[aria-label="End time"], textarea.block-description
//   · 실행: button.ctrl-enter-submits("Generate", 2026-11-21 확인 — 끝에 s. Composer 칸에서는 Ctrl+Enter가 먹지 않는다)
//   · 결과: <audio>의 blob:/data: src를 바이트로 꺼내 저장 후 ID3 메타데이터 제거
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

export const DEFAULT_MODEL = 'lyria-3.5';
export const MODES = ['composer', 'text'];
export const SECTION_TYPES = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro', 'Build'];
export const DEFAULT_SECTIONS = 'Intro:0:00-0:06,Verse:0:06-0:36,Outro:0:36-0:44';

/** 부정어로 적더라도 모델이 단어를 인식해 허밍·보컬이 섞이는 위험 단어(2026-11-12 실측). */
const VOCAL_RISK_RE = /\b(vocals?|humming|hum|singing|singer|lyrics?|voice|chorus\s+singing|choir)\b/i;

/** "Intro:0:00-0:06,Verse:0:06-0:36,Outro:0:36-0:44" 형식의 구간 문자열을 검증·파싱한다. */
export function parseSections(spec) {
  const parts = String(spec || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('--sections가 비어 있습니다');
  return parts.map((item) => {
    const m = /^([A-Za-z]+):(\d+:\d{2})-(\d+:\d{2})(?::(.+))?$/.exec(item);
    if (!m) throw new Error(`--sections 형식이 잘못되었습니다(예: Intro:0:00-0:06): ${item}`);
    const [, rawType, start, end, note] = m;
    const type = SECTION_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase());
    if (!type) throw new Error(`지원하지 않는 구간 이름입니다(${SECTION_TYPES.join(', ')}): ${rawType}`);
    return { type, start, end, prompt: (note || '').trim() };
  });
}

/** 보컬·허밍 역효과 단어 유입 검사(기본 차단, --allow-vocals 지정 시 통과). */
export function validateMusicPrompt(prompt, { allowVocals = false } = {}) {
  const text = String(prompt ?? '').trim();
  if (!text) throw new Error('--prompt가 비어 있습니다');
  if (!allowVocals) {
    const m = VOCAL_RISK_RE.exec(text);
    if (m) {
      throw new Error(`무보컬 BGM 프롬프트에 보컬/허밍 관련 단어("${m[0]}")를 쓰면 오히려 허밍이 섞일 수 있습니다. 원하는 악기·분위기만 긍정문으로 적거나 --allow-vocals를 붙이세요.`);
    }
  }
  return text;
}

export function parseArgs(argv) {
  const out = {
    model: DEFAULT_MODEL,
    mode: 'composer',
    prompt: '',
    output: '',
    sections: DEFAULT_SECTIONS,
    allowVocals: false,
    keepMetadata: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key === '--allow-vocals') { out.allowVocals = true; continue; }
    if (key === '--keep-metadata') { out.keepMetadata = true; continue; }
    if (!key.startsWith('--')) continue;
    out[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  if (!out.prompt) throw new Error('--prompt가 필요합니다');
  if (!out.output) throw new Error('--output이 필요합니다');
  if (!MODES.includes(out.mode)) throw new Error(`--mode는 ${MODES.join(', ')} 중 하나여야 합니다`);
  if (!/^[\w.-]+$/.test(out.model)) throw new Error('--model 형식이 이상합니다');
  validateMusicPrompt(out.prompt, { allowVocals: out.allowVocals });
  const parsedSections = out.mode === 'composer' ? parseSections(out.sections) : [];
  for (const s of parsedSections) {
    if (s.prompt) validateMusicPrompt(s.prompt, { allowVocals: out.allowVocals });
  }
  return { ...out, parsedSections };
}

/** 실제 오디오 MIME에 맞춰 저장 확장자를 정리한다(기본 .mp3). */
export function extensionForAudio(mime, output) {
  const clean = String(mime || '').split(';')[0].trim().toLowerCase();
  const want = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a' }[clean] || 'mp3';
  const m = String(output).match(/\.([A-Za-z0-9]+)$/);
  if (m && m[1].toLowerCase() === want) return output;
  return m ? String(output).slice(0, -m[0].length) + '.' + want : output + '.' + want;
}

/** Lyria 출력 MP3의 내장 ID3/C2PA 메타데이터를 재인코딩 없이 제거한다. */
export function stripAudioMetadata(filePath, runner = spawnSync) {
  const extMatch = String(filePath).match(/\.([A-Za-z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : 'mp3';
  const tmpPath = `${filePath}.clean.${ext}`;
  const res = runner('ffmpeg', ['-y', '-v', 'error', '-i', filePath, '-map', '0:a:0', '-c:a', 'copy', '-map_metadata', '-1', tmpPath], { encoding: 'utf8' });
  if (res.status !== 0) {
    if (existsSync(tmpPath)) unlinkSync(tmpPath);
    throw new Error(`메타데이터 정리(ffmpeg) 실패: ${(res.stderr || res.error?.message || '').trim()}`);
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

async function dismissOverlays(page) {
  for (let i = 0; i < 4; i += 1) {
    if (!(await page.locator('.cdk-overlay-backdrop-showing').count())) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }
}

/** Composer 시간 입력칸은 .fill()이 불안정하므로 boundingBox 클릭 + Ctrl+A + insertText를 쓴다(2026-11-12 확인). */
async function fillTimeInput(page, locator, value) {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.press('Control+A');
  await page.keyboard.insertText(String(value));
  await page.keyboard.press('Tab');
  await page.waitForTimeout(250);
}

/** 실행 버튼. 클래스 이름이 바뀌어도 잡히게 type=submit + 글자도 함께 본다. */
export const RUN_BUTTON = 'button.ctrl-enter-submits, button.ctrl-enter-submit, button[type="submit"]:has-text("Generate")';

const LIMIT_RE = /rate limit|quota|exceeded|resource.?exhausted|too many requests|try again later/i;
const ERROR_RE = /something went wrong|failed to generate|an error occurred/i;

export async function generateAiStudioMusic(options) {
  const parsed = options.parsedSections ? options : { ...options, parsedSections: options.mode === 'text' ? [] : parseSections(options.sections || DEFAULT_SECTIONS) };
  validateMusicPrompt(parsed.prompt, { allowVocals: Boolean(parsed.allowVocals) });
  try {
    return await generateOnce(parsed);
  } catch (err) {
    if (/로그인|요금제|한도/.test(err.message)) throw err;
    return generateOnce(parsed);
  }
}

async function generateOnce({
  prompt,
  output,
  mode = 'composer',
  model = DEFAULT_MODEL,
  parsedSections = [],
  keepMetadata = false,
}) {
  await ensureChrome();
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
  const page = await browser.contexts()[0].newPage();
  try {
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.goto(`https://aistudio.google.com/new_music?model=${model}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(12000);
    await dismissOverlays(page);

    const headText = await page.evaluate(() => document.body.innerText.slice(0, 800));
    if (/sign in|로그인/i.test(headText) && !/Playground/.test(headText)) {
      throw new Error('AI Studio에 로그인이 필요합니다(Gemini-Automation 크롬에서 1회 로그인)');
    }
    if (/only available with a Google AI plan/.test(headText)) {
      throw new Error(`${model}은(는) 이 계정에서 요금제가 필요한 모델입니다. 결제는 누르지 않고 멈춥니다.`);
    }

    // 초기 빈 화면이면 text-input 버튼으로 에디터 열기
    const opener = page.locator('button[data-testid="text-input"]').first();
    if (await opener.count()) {
      await opener.click();
      await page.waitForTimeout(1500);
    }

    if (mode === 'composer') {
      await page.locator('button:has-text("Composer")').first().click();
      await page.waitForTimeout(1200);
      const sections = parsedSections.length ? parsedSections : parseSections(DEFAULT_SECTIONS);
      for (let idx = 0; idx < sections.length; idx += 1) {
        const sec = sections[idx];
        await page.locator(`button.ms-button-filter-chip:has-text("${sec.type}")`).first().click();
        await page.waitForTimeout(700);
        const starts = page.locator('input.time-input[aria-label="Start time"]');
        const ends = page.locator('input.time-input[aria-label="End time"]');
        const descs = page.locator('textarea.block-description');
        await fillTimeInput(page, starts.nth(idx), sec.start);
        await fillTimeInput(page, ends.nth(idx), sec.end);
        const secPrompt = sec.prompt || (sec.type === 'Intro'
          ? `Soft gentle opening, ${prompt}`
          : sec.type === 'Outro'
            ? `Smooth warm fade-out resolution, ${prompt}`
            : prompt);
        await descs.nth(idx).click();
        await descs.nth(idx).fill(secPrompt);
        await page.waitForTimeout(300);
      }
    } else {
      const textBtn = page.locator('button:has-text("Text")').first();
      if (await textBtn.count()) {
        await textBtn.click();
        await page.waitForTimeout(800);
      }
      const box = page.locator('textarea[aria-label="Prompt input"]').first();
      await box.click();
      await box.fill(prompt);
    }

    const readAudios = () => page.evaluate(() =>
      [...document.querySelectorAll('audio')]
        .map((a) => ({
          src: a.currentSrc || a.src || a.querySelector('source')?.src || '',
          dur: Number.isFinite(a.duration) ? a.duration : 0,
        }))
        .filter((a) => a.src && (a.src.startsWith('blob:') || a.src.startsWith('data:audio') || a.src.startsWith('http')))
    );
    const beforeCount = (await readAudios()).length;

    // 2026-11-21 확인: 실제 클래스는 ctrl-enter-submits(끝에 s). Composer 구간 설명 칸에서는 Ctrl+Enter가 먹지 않아
    // 버튼을 못 찾으면 3분을 헛기다리지 않고 바로 멈춘다.
    const genBtn = page.locator(RUN_BUTTON).first();
    if (!(await genBtn.count())) throw new Error('생성 버튼(Generate)을 찾지 못했습니다. 화면이 바뀌었으면 RUN_BUTTON 선택자를 고치세요');
    await genBtn.click();

    // 음악 생성 대기(최대 3분)
    let found = null;
    for (let t = 0; t < 90; t += 1) {
      await page.waitForTimeout(2000);
      const list = await readAudios();
      if (list.length > beforeCount) {
        const last = list[list.length - 1];
        if (last.dur > 1 || last.src.length > 5000) {
          found = last;
          break;
        }
      }
      const errMsg = await page.evaluate(() => [...document.querySelectorAll('.cdk-overlay-container, [class*="error"], snack-bar-container')].map((e) => e.innerText).join(' '));
      const cleanErr = errMsg.replace(/\s+/g, ' ').slice(0, 300);
      if (LIMIT_RE.test(errMsg)) throw new Error(`한도 안내가 떴습니다: ${cleanErr}`);
      if (ERROR_RE.test(errMsg)) throw new Error(`생성 오류가 떴습니다: ${cleanErr}`);
    }
    if (!found) throw new Error('음악이 만들어지지 않았습니다(시간 초과)');

    const payload = await page.evaluate(async (src) => {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const base64 = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(String(fr.result).split(',')[1]);
        fr.onerror = () => rej(new Error('FileReader 실패'));
        fr.readAsDataURL(blob);
      });
      return { base64, mime: blob.type || 'audio/mpeg', size: blob.size };
    }, found.src);

    const file = resolve(extensionForAudio(payload.mime, output));
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Buffer.from(payload.base64, 'base64'));
    if (!keepMetadata) stripAudioMetadata(file);

    return {
      file,
      mime: payload.mime,
      bytes: payload.size,
      duration: found.dur || null,
      mode,
      model,
      metadataStripped: !keepMetadata,
    };
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

const isCli = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isCli) {
  try {
    const r = await generateAiStudioMusic(parseArgs(process.argv.slice(2)));
    console.log(`저장: ${r.file} (${r.mode}, ${r.duration ? `${Math.round(r.duration * 10) / 10}s, ` : ''}${r.metadataStripped ? '메타 정리됨' : '원본'}, ${r.model})`);
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
