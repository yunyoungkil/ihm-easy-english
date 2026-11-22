// Google AI Studio(Nano Banana 2.1)로 이미지를 만든다 — 워터마크 없음(사용자 확인 2026-11-12). 이미지는 항상 여기서 만든다.
// gemini.google.com 웹은 첫 장 이후 별 로고 워터마크가 찍혀 이 스크립트가 1순위다(AGENTS.md 이미지 생성 2단계 원칙 표).
// 자동화용 크롬(Gemini-Automation 프로필, 포트 9222)에 붙어서 쓴다. 로그인은 그 프로필에서 한 번 해 둔 상태여야 한다.
//
// 사용: node scripts/generate-aistudio-image.mjs --prompt "..." --output "videos/x/assets/a.png" [--aspect 16:9] [--model gemini-nano-banana-2.1]
//        [--ref a.png --ref b.jpg]  참고 그림(여러 번 가능, 준 순서대로 한 장씩 첨부)   [--prompt-file p.txt]  --prompt 대신 파일에서 지시문을 읽음
// 결과 옆에 <파일>.prompt.json(지시문·첨부 파일과 해시·설정)이 남는다.
//
// 클릭 지점(2026-11-12 직접 확인, 화면이 바뀌면 여기만 고친다):
//   · 새 대화 주소: https://aistudio.google.com/prompts/new_chat?model=<모델 ID>
//   · 프롬프트 입력: textarea[aria-label="Enter a prompt"]  → 실행: Ctrl+Enter
//   · 오른쪽 "Aspect ratio"(mat-select) → 옵션(role=option, 이름이 "16:9" 등)
//   · 참고 그림 첨부(2026-11-21 화면 확인): 프롬프트 칸 옆 button[aria-label="Insert images, videos, or files"] → 메뉴 "Upload files" → filechooser.
//     숨은 input[type=file]은 하나(multiple). 그림 스크립트는 지시문 앞에 문장을 붙이지 않는다 — 어느 그림이 무슨 역할인지는 지시문에 직접 쓴다.
//   · 계정 정보(PRO 표시)가 불러와지기 전에는 "Upgrade" 안내가 잠깐 떠서 14초 기다린 뒤에 판단한다. 결제 버튼은 절대 누르지 않는다.
//   · 결과 이미지: 대화 안의 큰 <img>(blob/data URL). 화면에서 base64로 꺼내 저장한다.
import {chromium} from 'playwright-core';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {IMAGE_EXT, attachFiles, buildPromptRecord, checkRefFile, orderAttachments, parseLineageArgs, readPromptArgs, sha256Prefix, writePromptRecord} from './aistudio-attachments.mjs';

const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
export const DEFAULT_MODEL = 'gemini-nano-banana-2.1';
export const ASPECTS = ['Auto', '1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

export function parseArgs(argv) {
  const out = {model: DEFAULT_MODEL, aspect: '16:9', prompt: '', output: '', refs: [], promptFile: '', parent: '', changedVar: '', status: ''};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    const val = argv[i + 1];
    i += 1;
    if (key === '--ref') out.refs.push(checkRefFile(val, IMAGE_EXT, '--ref'));
    else if (key === '--prompt-file') out.promptFile = val;
    else if (key === '--changed-var') out.changedVar = val;
    else out[key.slice(2)] = val;
  }
  out.prompt = readPromptArgs({prompt: out.prompt, promptFile: out.promptFile});
  if (!out.prompt) throw new Error('--prompt가 필요합니다');
  if (!out.output) throw new Error('--output이 필요합니다');
  if (!ASPECTS.includes(out.aspect)) throw new Error(`--aspect는 ${ASPECTS.join(', ')} 중 하나`);
  if (!/^[\w.-]+$/.test(out.model)) throw new Error('--model 형식이 이상합니다');
  out.lineage = parseLineageArgs({parent: out.parent, changedVar: out.changedVar, status: out.status});
  return out;
}

/** 화면이 주는 실제 형식(JPEG 등)과 저장 이름의 확장자가 다르면 확장자를 실제 형식에 맞춘다(JPEG를 .png로 저장해 두면 나중에 헷갈린다). */
export function extensionFor(mime, output) {
  const want = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp'}[mime];
  if (!want) return output;
  const m = String(output).match(/\.([A-Za-z0-9]+)$/);
  if (m && (m[1].toLowerCase() === want || (want === 'jpg' && m[1].toLowerCase() === 'jpeg'))) return output;
  return m ? String(output).slice(0, -m[0].length) + '.' + want : output + '.' + want;
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

/** 안내 팝업의 배경막(cdk-overlay-backdrop)이 클릭을 가로막는 경우가 있다(2026-11-12 장면 2 생성 실패) → Escape로 닫고, 남으면 배경막을 눌러 닫는다. 결제·업그레이드 버튼은 누르지 않는다. */
async function dismissOverlays(page) {
  for (let i = 0; i < 4; i += 1) {
    if (!(await page.locator('.cdk-overlay-backdrop-showing').count())) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    if (await page.locator('.cdk-overlay-backdrop-showing').count()) await page.locator('.cdk-overlay-backdrop-showing').first().click({force: true, position: {x: 5, y: 5}}).catch(() => {});
    await page.waitForTimeout(700);
  }
}

/** 한 번 실패하면 새 대화로 한 번 더 시도한다(팝업·일시 오류 대비). */
export async function generateAiStudioImage(options) {
  try {
    return await generateOnce(options);
  } catch (err) {
    if (/로그인|요금제|한도/.test(err.message)) throw err; // 다시 해도 소용없는 실패
    return generateOnce(options);
  }
}

async function generateOnce({prompt, output, aspect = '16:9', model = DEFAULT_MODEL, refs = [], promptFile = '', lineage = null}) {
  await ensureChrome();
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const page = await browser.contexts()[0].newPage();
  try {
    // 화면이 좁으면 설정 패널이 가려서 입력칸이 안 눌린다(2026-11-12 확인). 넓게 연다.
    await page.setViewportSize({width: 1600, height: 1000});
    await page.goto(`https://aistudio.google.com/prompts/new_chat?model=${model}`, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(14000);
    await dismissOverlays(page);
    const text = await page.evaluate(() => document.body.innerText);
    if (/sign in|로그인/i.test(text.slice(0, 600)) && !/Playground/.test(text)) throw new Error('AI Studio에 로그인이 필요합니다(Gemini-Automation 크롬에서 한 번 로그인)');
    if (/only available with a Google AI plan/.test(text)) throw new Error(`${model}은(는) 이 계정에서 요금제가 필요한 모델입니다. 결제는 누르지 않고 멈춥니다.`);

    if (aspect !== 'Auto') {
      // 설정 패널이 닫힌 채 열리는 경우가 있다 → 'tune' 버튼으로 연다.
      if (!(await page.getByText('Aspect ratio', {exact: true}).count())) await page.locator('button:has-text("tune")').first().click();
      await page.waitForTimeout(1500);
      await page.getByText('Aspect ratio', {exact: true}).locator('xpath=following::*[self::mat-select or @role="combobox"][1]').first().click();
      await page.getByRole('option', {name: aspect, exact: true}).click();
      await page.waitForTimeout(500);
    }

    // 참고 그림은 프롬프트를 채우기 전에 한 장씩 올린다
    const attachments = orderAttachments({refs});
    if (attachments.length) await attachFiles(page, attachments);

    const box = page.locator('textarea[aria-label="Enter a prompt"]');
    await box.click();
    await box.fill(prompt);
    // 결과 이미지는 blob: 주소로 온다. 첫 화면의 예시 그림(gstatic)과 섞이지 않게 blob만 센다.
    const countBlobs = () => page.evaluate(() => [...document.images].filter((i) => i.src.startsWith('blob:') && i.naturalWidth > 500).length);
    const before = await countBlobs();
    // 올린 참고 그림도 blob: 큰 그림으로 잡힌다(2026-11-21). 실행 전에 있던 주소는 결과 후보에서 뺀다.
    const beforeSrcs = await page.evaluate(() => [...document.images].filter((i) => i.src.startsWith('blob:')).map((i) => i.src));
    await page.keyboard.press('Control+Enter');

    // 큰 이미지가 새로 생기고 3초 동안 개수가 안 변하면 끝난 것으로 본다(최대 3분).
    let stable = 0;
    let last = before;
    for (let t = 0; t < 90; t += 1) {
      await page.waitForTimeout(2000);
      const now = await countBlobs();
      stable = now > before && now === last ? stable + 1 : 0;
      last = now;
      if (stable >= 2) break;
      const blocked = await page.evaluate(() => /rate limit|quota exceeded|exceeded your/i.test(document.body.innerText));
      if (blocked) throw new Error('한도 때문에 생성이 막혔습니다');
    }
    if (last <= before) throw new Error('이미지가 만들어지지 않았습니다(시간 초과)');

    const data = await page.evaluate(async (skip) => {
      const imgs = [...document.images].filter((i) => i.src.startsWith('blob:') && i.naturalWidth > 500 && !skip.includes(i.src));
      const img = imgs.sort((a, b) => a.naturalWidth * a.naturalHeight - b.naturalWidth * b.naturalHeight)[imgs.length - 1];
      const blob = await (await fetch(img.src)).blob();
      const base64 = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.readAsDataURL(blob); });
      return {base64, width: img.naturalWidth, height: img.naturalHeight, type: blob.type};
    }, beforeSrcs);
    const file = resolve(extensionFor(data.type, output));
    if (!existsSync(dirname(file))) mkdirSync(dirname(file), {recursive: true});
    writeFileSync(file, Buffer.from(data.base64, 'base64'));
    const record = writePromptRecord(file, buildPromptRecord({
      tool: 'aistudio-image',
      model,
      prompt,
      promptFile: promptFile || null,
      attachments: attachments.map((a) => ({...a, sha256: sha256Prefix(a.path)})),
      settings: {aspect},
      output: {file, width: data.width, height: data.height, type: data.type},
      lineage: lineage ? {...lineage, parentSha256: lineage.parent ? sha256Prefix(lineage.parent) : null} : null,
    }));
    return {file, width: data.width, height: data.height, type: data.type, model, aspect, record};
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))) {
  try {
    const result = await generateAiStudioImage(parseArgs(process.argv.slice(2)));
    console.log(`저장: ${result.file} (${result.width}x${result.height}, ${result.type}, ${result.model}, ${result.aspect}), 기록: ${result.record}`);
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
