// EP37 한국어 나레이션 131덩어리(Gero)를 SCRIPT.md에서 자동 추출해 AI Studio 웹 화면으로 묶음 생성·무음 분할한다.
// 1회 요청에 최대 6덩어리(420자 이내)를 <long pause><long pause>로 묶어 하루 웹 한도(50회) 안에서 1회 완주할 수 있게 설계.
// 분할 개수가 안 맞는 묶음은 자동으로 단건(1덩어리씩) 폴백 처리한다.
// 사용:
//   node videos/ep37-listen-frozen-questions/scripts/generate-ko-batch.mjs --dry-run
//   node videos/ep37-listen-frozen-questions/scripts/generate-ko-batch.mjs [--only k001,k002] [--force] [--single]
import {chromium} from 'playwright-core';
import {execFileSync, spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {checkVoiceGate} from '../../../scripts/production-gate.mjs';
import {decodeAudioDataUrl, validateText} from '../../../scripts/generate-aistudio-speech.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const OUT_DIR = join(EP_DIR, 'assets', 'voice-ko');
const TMP_DIR = join(EP_DIR, '.ko-batch-tmp');
const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

const KO_VOICE = 'Gero'; // 채널 고정 한국어 남성 목소리
const KO_STYLE_BATCH =
  'Warm, friendly Korean adult speaking conversationally to a friend in a calm, engaging late-night audio class rhythm, never stiff textbook announcing. Pronounce every word and final syllable clearly at full voice. Do not whisper, swallow, or trail off on the final word. Leave a clear full silent pause whenever a long pause tag appears.';
const KO_STYLE_SINGLE =
  'Warm, friendly Korean adult speaking conversationally to a friend in a calm, engaging late-night audio class rhythm, never stiff textbook announcing. Pronounce every word and final syllable clearly at full voice. Do not whisper, swallow, or trail off on the final word.';

const LIMIT_RE = /rate limit|quota|exceeded|resource.?exhausted|too many requests|try again later/i;
const ERROR_RE = /something went wrong|failed to generate|an error occurred/i;

export function extractKoreanChunks(scriptPath) {
  const md = readFileSync(scriptPath, 'utf8');
  const lines = md.split(/\r?\n/);
  let started = false;
  let inText = false;
  let buf = [];
  let section = '';
  const chunks = [];
  let blockIdx = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!started) {
      if (line === '## 여는 장') { started = true; section = '여는 장'; }
      continue;
    }
    if (inText) {
      if (line.startsWith('```')) {
        const text = buf.join(' ').replace(/\s+/g, ' ').trim();
        if (text) {
          blockIdx += 1;
          chunks.push({
            id: `k${String(blockIdx).padStart(3, '0')}`,
            kind: 'narration',
            section,
            text,
          });
        }
        inText = false;
        buf = [];
      } else {
        buf.push(line);
      }
      continue;
    }
    if (line.startsWith('```text')) { inText = true; continue; }
    const h = line.match(/^#{2,3}\s+(.+)$/);
    if (h) { section = h[1].trim(); continue; }
    const m = line.match(/^\| (\d\d) \| [^|]+\| ([^|]+)\| [^|]+\|/);
    if (m) {
      chunks.push({
        id: `m${m[1]}`,
        kind: 'part2-meaning',
        section: '2부 1회차 뜻',
        text: m[2].trim(),
      });
    }
  }
  return chunks;
}

// 짧은 덩어리는 최대 6개(또는 420자 이내)씩 묶어 요청 횟수를 131회 -> 약 25회로 줄인다.
function buildBatches(items, {maxItems = 6, maxChars = 420, single = false} = {}) {
  if (single) return items.map((it) => [it]);
  const batches = [];
  let cur = [];
  let curChars = 0;
  for (const it of items) {
    const len = it.text.length;
    const sameKind = !cur.length || cur[0].kind === it.kind;
    // part2 뜻(짧은 1줄)은 최대 10개씩 묶어도 총 120자 내외로 매우 깔끔하게 분할된다.
    const limitItems = it.kind === 'part2-meaning' ? 10 : maxItems;
    if (cur.length && (!sameKind || cur.length >= limitItems || curChars + len > maxChars)) {
      batches.push(cur);
      cur = [];
      curChars = 0;
    }
    cur.push(it);
    curChars += len;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

function probeDuration(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {encoding: 'utf8'}).trim());
}

function detectSpeechSegments(wavPath, noiseDb, minSilDur) {
  const total = probeDuration(wavPath);
  const r = spawnSync('ffmpeg', ['-i', wavPath, '-af', `silencedetect=noise=${noiseDb}dB:d=${minSilDur}`, '-f', 'null', '-'], {encoding: 'utf8'});
  const log = `${r.stdout || ''}\n${r.stderr || ''}`;
  const sils = [];
  let cur = null;
  for (const ln of log.split(/\r?\n/)) {
    const m1 = ln.match(/silence_start:\s*([\d.]+)/);
    const m2 = ln.match(/silence_end:\s*([\d.]+)/);
    if (m1) cur = Number(m1[1]);
    if (m2) { sils.push({start: cur ?? 0, end: Number(m2[1])}); cur = null; }
  }
  if (cur !== null) sils.push({start: cur, end: total});
  const segs = [];
  let pos = 0;
  for (const s of sils) {
    if (s.start - pos > 0.25) segs.push({start: Math.max(0, pos - 0.04), end: Math.min(total, s.start + 0.06)});
    pos = s.end;
  }
  if (total - pos > 0.25) segs.push({start: Math.max(0, pos - 0.04), end: total});
  return segs;
}

function splitExact(wavPath, expected) {
  // 긴 무음(>=1.1s)부터 점차 좁혀 문장 내부 쉼표(0.3~0.5s)를 잘못 자르지 않도록 방지
  const trials = [
    [-36, 1.35], [-36, 1.15], [-36, 0.95], [-36, 0.80],
    [-34, 1.20], [-34, 1.00], [-34, 0.85], [-38, 1.10], [-38, 0.90],
  ];
  for (const [db, d] of trials) {
    const segs = detectSpeechSegments(wavPath, db, d);
    if (segs.length === expected) return {segs, db, d};
  }
  return null;
}

async function ensureChrome() {
  try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* 꺼져 있음 */ }
  spawn(CHROME_PATH, [`--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check', 'https://aistudio.google.com'], {detached: true, stdio: 'ignore'}).unref();
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* 대기 */ }
  }
  throw new Error('자동화용 크롬을 켜지 못했습니다');
}

async function openSpeechTab(browser) {
  const page = await browser.contexts()[0].newPage();
  await page.setViewportSize({width: 1600, height: 1000});
  await page.goto('https://aistudio.google.com/generate-speech', {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(10000);
  for (let i = 0; i < 4; i += 1) {
    if (!(await page.locator('.cdk-overlay-backdrop-showing').count())) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  await page.getByText('Create new dialog').first().click();
  await page.waitForTimeout(2500);
  return {page, voice: '', style: ''};
}

async function synthOnTab(session, {text, style}, outWav) {
  const {page} = session;
  const speakerBtn = page.locator('button:has-text("Speaker 1 - ")').first();
  if (!(await speakerBtn.innerText()).includes(`- ${KO_VOICE}`)) {
    await speakerBtn.click();
    await page.waitForTimeout(1200);
    await page.locator('.cdk-overlay-container').getByText(KO_VOICE, {exact: true}).first().click();
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  if (session.style !== style) {
    await page.locator('button[aria-label="Style"]').first().click();
    await page.waitForTimeout(800);
    await page.locator('.cdk-overlay-container textarea').first().fill(style);
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    session.style = style;
  }
  const box = page.locator('textarea[aria-label="Speech block text"]');
  await box.click();
  await box.fill(text);

  const readAudio = () => page.evaluate(() => [...document.querySelectorAll('audio')].filter((a) => a.src.startsWith('data:audio') && a.duration > 0.3).map((a) => ({src: a.src, dur: a.duration})));
  const before = await readAudio();
  const prevSrc = before.length ? before[before.length - 1].src : '';

  await page.keyboard.press('Control+Enter');
  let lastLen = 0;
  let stable = 0;
  let picked = null;
  for (let t = 0; t < 120; t += 1) {
    await page.waitForTimeout(1500);
    const all = await readAudio();
    const latest = all.length ? all[all.length - 1] : null;
    if (latest && latest.src !== prevSrc) {
      stable = latest.src.length === lastLen ? stable + 1 : 0;
      lastLen = latest.src.length;
      picked = latest;
      if (stable >= 2) break;
    }
    const msg = await page.evaluate(() => [...document.querySelectorAll('.cdk-overlay-container, [class*="error"], snack-bar-container')].map((e) => e.innerText).join(' '));
    const shown = msg.replace(/\s+/g, ' ').slice(0, 300);
    if (LIMIT_RE.test(msg)) throw new Error(`한도 안내: ${shown}`);
    if (ERROR_RE.test(msg)) throw new Error(`오류 안내: ${shown}`);
  }
  if (!picked) throw new Error('오디오 생성 시간 초과');
  const {bytes} = decodeAudioDataUrl(picked.src);
  mkdirSync(dirname(outWav), {recursive: true});
  writeFileSync(outWav, bytes);
  return {duration: picked.dur, bytes: bytes.length};
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  const single = argv.includes('--single');
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0 && argv[onlyIdx + 1] ? new Set(argv[onlyIdx + 1].split(',').map((s) => s.trim())) : null;

  const gate = checkVoiceGate({projectDir: EP_DIR});
  if (!gate.ok) throw new Error(`음성 안전 관문 차단: ${gate.blockers.join(' / ')}`);

  const chunks = extractKoreanChunks(join(EP_DIR, 'SCRIPT.md'));
  for (const c of chunks) validateText(c.text);

  mkdirSync(join(EP_DIR, 'assets'), {recursive: true});
  writeFileSync(join(EP_DIR, 'assets', 'ko-manifest.json'), JSON.stringify({voice: KO_VOICE, total: chunks.length, chunks}, null, 2) + '\n', 'utf8');

  const todo = chunks.filter((c) => {
    if (only && !only.has(c.id)) return false;
    if (!force && existsSync(join(OUT_DIR, `${c.id}.wav`))) return false;
    return true;
  });

  const batches = buildBatches(todo, {single});
  const totalChars = todo.reduce((a, x) => a + x.text.length, 0);
  console.log(`EP37 한국어(Gero) 추출 완료: 전체 ${chunks.length}덩어리, 생성 대상 ${todo.length}덩어리 (${totalChars}자) → ${batches.length}묶음 요청`);
  if (dryRun) {
    batches.forEach((b, idx) => {
      const ch = b.reduce((a, x) => a + x.text.length, 0);
      console.log(`  [묶음 ${String(idx + 1).padStart(2, '0')}] ${b[0].id}~${b.at(-1).id} (${b.length}개, ${ch}자)`);
    });
    return;
  }
  if (!todo.length) {
    console.log('생성할 파일 없음 (전체 이미 존재)');
    return;
  }

  mkdirSync(OUT_DIR, {recursive: true});
  mkdirSync(TMP_DIR, {recursive: true});
  await ensureChrome();
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  let session = null;
  let tabCount = 0;
  let doneChunks = 0;

  try {
    for (let bi = 0; bi < batches.length; bi += 1) {
      const batch = batches[bi];
      if (!session || tabCount >= 12) {
        if (session) await session.page.close().catch(() => {});
        session = await openSpeechTab(browser);
        tabCount = 0;
      }

      if (batch.length === 1) {
        const it = batch[0];
        const outPath = join(OUT_DIR, `${it.id}.wav`);
        const res = await synthOnTab(session, {text: it.text, style: KO_STYLE_SINGLE}, outPath);
        tabCount += 1;
        doneChunks += 1;
        console.log(`[묶음 ${bi + 1}/${batches.length}] OK 단건 ${it.id} (${res.duration.toFixed(1)}s)`);
      } else {
        const combined = batch.map((x) => x.text).join(' <long pause> <long pause> ');
        const tmpWav = join(TMP_DIR, `batch-${String(bi + 1).padStart(2, '0')}.wav`);
        const res = await synthOnTab(session, {text: combined, style: KO_STYLE_BATCH}, tmpWav);
        tabCount += 1;
        const found = splitExact(tmpWav, batch.length);
        if (found) {
          for (let j = 0; j < batch.length; j += 1) {
            const it = batch[j];
            const seg = found.segs[j];
            execFileSync('ffmpeg', [
              '-y', '-v', 'error', '-i', tmpWav,
              '-ss', seg.start.toFixed(3), '-to', seg.end.toFixed(3),
              '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le',
              join(OUT_DIR, `${it.id}.wav`),
            ]);
            doneChunks += 1;
          }
          console.log(`[묶음 ${bi + 1}/${batches.length}] OK ${batch[0].id}~${batch.at(-1).id} (${batch.length}개 분할 성공, 총 ${res.duration.toFixed(1)}s, minSil=${found.d}s)`);
        } else {
          console.log(`[묶음 ${bi + 1}/${batches.length}] 분할 개수 불일치 → 단건 폴백 시작 (${batch.length}개)`);
          for (const it of batch) {
            const outPath = join(OUT_DIR, `${it.id}.wav`);
            const sRes = await synthOnTab(session, {text: it.text, style: KO_STYLE_SINGLE}, outPath);
            tabCount += 1;
            doneChunks += 1;
            console.log(`  ↳ OK 단건 ${it.id} (${sRes.duration.toFixed(1)}s)`);
            await new Promise((r) => setTimeout(r, 2500));
          }
        }
      }
      if (bi < batches.length - 1) await new Promise((r) => setTimeout(r, 3500));
    }
  } finally {
    if (session) await session.page.close().catch(() => {});
    await browser.close().catch(() => {});
    rmSync(TMP_DIR, {recursive: true, force: true});
  }
  console.log(`완료: ${doneChunks}/${todo.length}덩어리 생성됨`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
