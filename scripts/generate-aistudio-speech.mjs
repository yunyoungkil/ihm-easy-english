// Google AI Studio 음성(TTS, Gemini 3.8 Flash TTS) 화면으로 나레이션을 만든다. API 키를 쓰지 않는다(무료 키는 모델당 하루 10회라 막힌다, 2026-11-16).
// 자동화용 크롬(Gemini-Automation 프로필, 포트 9222)에 붙어서 쓴다. 로그인은 그 프로필에서 한 번 해 둔 상태여야 한다.
//
// 사용: node scripts/generate-aistudio-speech.mjs --text "<대본>" --style "<영어 스타일>" --voice Gero --output "videos/x/assets/voice/n01.wav"
//   · 연기·톤 지시는 --style(화면의 Style 칸, 영어)에만 쓴다. 대본에는 넣지 않는다(소리 내어 읽는다).
//   · 대본 중간 감정·호흡은 영어 소문자 태그(<short pause> 등, 화면 Expression 목록의 것만)로 넣는다.
//
// 클릭 지점(2026-11-16 직접 확인, 화면이 바뀌면 여기만 고친다):
//   · 주소: https://aistudio.google.com/generate-speech (처음엔 예시 카드 화면) → "Create new dialog" 카드를 누르면 입력 블록이 생긴다.
//   · 목소리: 블록 위 "Speaker 1 - <이름>" 버튼 → 오른쪽에 목록이 열린다 → 이름(Gero 등)을 누른다 → Escape. 기본은 Fola. Gero는 "Digital Assistant" 묶음에 있다.
//   · 스타일: 블록 위 "Style" 버튼 → 작은 창의 입력칸("Describe the voice style.")에 영어로 입력 → Escape. 블록마다 따로 저장된다.
//   · 대본: textarea[aria-label="Speech block text"]. 실행: Ctrl+Enter(아래 "Run" 버튼과 같음).
//   · 결과: 아래 재생줄이 생기고 <audio src="data:audio/wav;base64,...">가 붙는다(24kHz 16bit 모노 WAV). 그 data 주소를 그대로 꺼내 저장한다.
//   · 오른쪽 위 "No API key selected"와 아래 key_off 아이콘은 키 없이 계정 한도로 도는 표시다. 결제·"Unlock Gemini 4 Carbon" 안내는 누르지 않는다.
import {chromium} from 'playwright-core';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {ALLOW_VOICE_GATE, checkVoiceGate, findProjectDirFromOutput} from './production-gate.mjs';

const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
export const DEFAULT_VOICE = 'Gero'; // 채널 목소리는 남성 Gero로 고정(scripts/tts-config.mjs, 2026-11-09 사용자 결정)

/** 화면의 "+ Expression" 목록에 있는 태그 40개(2026-11-16 확인). 이 밖의 <...>는 소리 내어 읽거나 어색하게 처리될 수 있어 거부한다. */
export const ALLOWED_TAGS = [
  'argh', 'breath', 'cackle', 'cheer', 'chuckle', 'chuckles', 'cough', 'cry', 'exhales', 'gasp', 'giggle', 'groan', 'growl', 'grr', 'grunt',
  'heavy breath', 'hiss', 'laugh', 'laughter', 'long pause', 'moan', 'pant', 'pff', 'phew', 'scream', 'short pause', 'shout', 'shriek', 'sigh',
  'sighs', 'sneeze', 'snicker', 'snort', 'sob', 'throat-clearing', 'tsk', 'whimper', 'whispering', 'whispers', 'yawn',
];

export function parseArgs(argv) {
  const out = {voice: DEFAULT_VOICE, style: '', text: '', output: ''};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    out[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  if (!out.text) throw new Error('--text가 필요합니다');
  if (!out.output) throw new Error('--output이 필요합니다');
  if (!/^[A-Z][a-z]+$/.test(out.voice)) throw new Error('--voice 형식이 이상합니다(예: Gero)');
  if (out.style && /[가-힣]/.test(out.style)) throw new Error('--style은 영어로 씁니다(한글 지시문은 소리로 읽힐 수 있음)');
  validateText(out.text);
  return out;
}

/** 대본 검사: 태그는 영어 소문자이면서 화면 목록에 있는 것만, 괄호 지시문은 거부한다. 문제가 있으면 던진다. */
export function validateText(text) {
  const t = String(text ?? '');
  if (!t.trim()) throw new Error('대본이 비어 있습니다');
  for (const m of t.matchAll(/<([^<>]*)>/g)) {
    const tag = m[1];
    if (/[가-힣]/.test(tag)) throw new Error(`한글 태그는 쓸 수 없습니다: <${tag}>`);
    if (tag !== tag.toLowerCase()) throw new Error(`태그는 영어 소문자만 씁니다: <${tag}>`);
    if (!ALLOWED_TAGS.includes(tag)) throw new Error(`허용 목록에 없는 태그입니다: <${tag}>`);
  }
  const stripped = t.replace(/<[^<>]*>/g, '');
  if (/[<>]/.test(stripped)) throw new Error('닫히지 않은 < > 가 있습니다');
  const bracket = stripped.match(/\([^)]*\)|\[[^\]]*\]|（[^）]*）|［[^］]*］/);
  if (bracket) throw new Error(`괄호 지시문은 대본에 쓰지 않습니다(소리로 읽습니다): ${bracket[0]}`);
  return t;
}

/** 대본에서 태그를 뺀, 실제로 읽혀야 하는 글 */
export function spokenText(text) {
  return String(text).replace(/<[^<>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 화면이 주는 data:audio 주소에서 파일 바이트와 형식을 꺼낸다 */
export function decodeAudioDataUrl(src) {
  const m = /^data:(audio\/[\w.+-]+);base64,(.+)$/s.exec(src || '');
  if (!m) throw new Error('오디오 데이터 주소 형식이 아닙니다');
  return {mime: m[1], bytes: Buffer.from(m[2], 'base64')};
}

async function ensureChrome() {
  try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* 꺼져 있음 */ }
  spawn(CHROME_PATH, [`--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check', 'https://aistudio.google.com'], {detached: true, stdio: 'ignore'}).unref();
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* 계속 기다림 */ }
  }
  throw new Error('자동화용 크롬을 켜지 못했습니다');
}

/** 안내 팝업의 배경막이 클릭을 가로막으면 Escape로 닫는다. 결제·업그레이드 버튼은 누르지 않는다. */
async function dismissOverlays(page) {
  for (let i = 0; i < 4; i += 1) {
    if (!(await page.locator('.cdk-overlay-backdrop-showing').count())) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
  }
}

const LIMIT_RE = /rate limit|quota|exceeded|resource.?exhausted|too many requests|try again later/i;
const ERROR_RE = /something went wrong|failed to generate|an error occurred/i;

/** 한 번 실패하면 새 탭으로 한 번만 더 시도한다(팝업·일시 오류 대비). 로그인·요금제·한도·관문 차단 문제는 다시 해도 소용없어 바로 던진다. */
export async function generateAiStudioSpeech(options) {
  validateText(options.text);
  if (!options.allowGate && process.env[ALLOW_VOICE_GATE] !== '1') {
    const projectDir = options.projectDir || findProjectDirFromOutput(options.output);
    const gate = checkVoiceGate({projectDir, text: options.text});
    if (!gate.ok) {
      throw new Error(`음성 제작 안전 관문 차단 (${gate.blockers.length}건): ${gate.blockers.join(' / ')}`);
    }
  }
  try {
    return await generateOnce(options);
  } catch (err) {
    if (/로그인|요금제|한도|안전 관문/.test(err.message)) throw err;
    return generateOnce(options);
  }
}

async function generateOnce({text, style = '', voice = DEFAULT_VOICE, output}) {
  await ensureChrome();
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const page = await browser.contexts()[0].newPage();
  try {
    await page.setViewportSize({width: 1600, height: 1000});
    await page.goto('https://aistudio.google.com/generate-speech', {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(12000);
    await dismissOverlays(page);
    const first = await page.evaluate(() => document.body.innerText);
    if (/sign in|로그인/i.test(first.slice(0, 600)) && !/Playground/.test(first)) throw new Error('AI Studio에 로그인이 필요합니다(Gemini-Automation 크롬에서 한 번 로그인)');
    if (/only available with a Google AI plan/.test(first)) throw new Error('이 계정에서 요금제가 필요한 모델입니다(요금제 필요). 결제는 누르지 않고 멈춥니다.');

    await page.getByText('Create new dialog').first().click();
    await page.waitForTimeout(3000);

    // 목소리
    const speakerBtn = page.locator('button:has-text("Speaker 1 - ")').first();
    if (!(await speakerBtn.innerText()).includes(`- ${voice}`)) {
      await speakerBtn.click();
      await page.waitForTimeout(1500);
      const item = page.locator('.cdk-overlay-container').getByText(voice, {exact: true});
      if (!(await item.count())) throw new Error(`목소리 목록에 ${voice}가 없습니다(결정 필요)`);
      await item.first().click();
      await page.waitForTimeout(1200);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }
    if (!(await page.locator('button:has-text("Speaker 1 - ")').first().innerText()).includes(`- ${voice}`)) throw new Error(`목소리를 ${voice}로 바꾸지 못했습니다`);

    // 스타일(영어, 이 블록에만 적용)
    if (style) {
      await page.getByText('Style', {exact: true}).first().click();
      await page.waitForTimeout(1000);
      await page.locator('.cdk-overlay-container textarea').first().fill(style);
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(800);
    }

    // 대본
    const box = page.locator('textarea[aria-label="Speech block text"]');
    await box.click();
    await box.fill(text);

    // 처음에는 0.04~0.08초짜리 자리표시 오디오가 붙고(5천 글자 안팎), 1~2초 뒤 진짜 소리로 바뀐다(2026-11-16 확인). 길이가 0.5초를 넘은 것만 센다.
    const readAudio = () => page.evaluate(() => [...document.querySelectorAll('audio')].filter((a) => a.src.startsWith('data:audio') && a.duration > 0.5).map((a) => a.src));
    const before = (await readAudio()).length;
    await page.keyboard.press('Control+Enter');

    // 새 오디오가 생기고 2번 연속 같은 크기면 끝난 것으로 본다(최대 3분).
    let last = 0;
    let stable = 0;
    let src = '';
    for (let t = 0; t < 90; t += 1) {
      await page.waitForTimeout(2000);
      const all = await readAudio();
      if (all.length > before) {
        src = all[all.length - 1];
        stable = src.length === last ? stable + 1 : 0;
        last = src.length;
        if (stable >= 2) break;
      }
      const msg = await page.evaluate(() => [...document.querySelectorAll('.cdk-overlay-container, [class*="error"], snack-bar-container')].map((e) => e.innerText).join(' '));
      const shown = msg.replace(/\s+/g, ' ').slice(0, 300);
      if (LIMIT_RE.test(msg)) throw new Error(`한도 안내가 떴습니다(화면 문구): ${shown}`);
      if (ERROR_RE.test(msg)) throw new Error(`오류 안내가 떴습니다(화면 문구): ${shown}`);
    }
    if (!src) throw new Error('오디오가 만들어지지 않았습니다(시간 초과)');

    const {mime, bytes} = decodeAudioDataUrl(src);
    const file = resolve(output);
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, bytes);
    return {file, mime, bytes: bytes.length, voice};
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  try {
    const result = await generateAiStudioSpeech(parseArgs(process.argv.slice(2)));
    console.log(`저장: ${result.file} (${result.mime}, ${result.bytes}바이트, ${result.voice})`);
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
