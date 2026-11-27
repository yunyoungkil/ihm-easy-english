// EP37 한국어 나레이션 131덩어리(Gero)를 SCRIPT.md에서 자동 추출해 AI Studio 웹 화면으로 묶음 생성·무음 분할한다.
// 1회 요청에 최대 6덩어리(420자 이내)를 <long pause><long pause>로 묶어 하루 웹 한도(50회) 안에서 1회 완주할 수 있게 설계.
// 분할 개수가 안 맞는 묶음은 자동으로 단건(1덩어리씩) 폴백 처리한다.
// 사용:
//   node videos/ep37-listen-frozen-questions/scripts/generate-ko-batch.mjs --dry-run
//   node videos/ep37-listen-frozen-questions/scripts/generate-ko-batch.mjs [--only k001,k002] [--force] [--single]
import { chromium } from 'playwright-core';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkVoiceGate } from '../../../scripts/production-gate.mjs';
import { decodeAudioDataUrl, validateText } from '../../../scripts/generate-aistudio-speech.mjs';
import { AUDIO_FORMAT, loadApiKey, pcmToWav, sampleRateFromMime } from '../../../scripts/tts-config.mjs';

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

// 같은 kind(narration / part2-meaning)끼리 모은 뒤 최대 10개(650자 이내), 2부 뜻은 15개씩 묶어 요청 횟수를 최소화한다.
function buildBatches(items, { maxItems = 10, maxChars = 650, single = false } = {}) {
  if (single) return items.map((it) => [it]);
  const ordered = [
    ...items.filter((x) => x.kind === 'narration'),
    ...items.filter((x) => x.kind !== 'narration'),
  ];
  const batches = [];
  let cur = [];
  let curChars = 0;
  for (const it of ordered) {
    const len = it.text.length;
    const sameKind = !cur.length || cur[0].kind === it.kind;
    const limitItems = it.kind === 'part2-meaning' ? 15 : maxItems;
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
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }).trim());
}

function detectSilences(wavPath, noiseDb, minSilDur) {
  const total = probeDuration(wavPath);
  const r = spawnSync('ffmpeg', ['-i', wavPath, '-af', `silencedetect=noise=${noiseDb}dB:d=${minSilDur}`, '-f', 'null', '-'], { encoding: 'utf8' });
  const log = `${r.stdout || ''}\n${r.stderr || ''}`;
  const sils = [];
  let cur = null;
  for (const ln of log.split(/\r?\n/)) {
    const m1 = ln.match(/silence_start:\s*([\d.]+)/);
    const m2 = ln.match(/silence_end:\s*([\d.]+)/);
    if (m1) cur = Number(m1[1]);
    if (m2) {
      const start = cur ?? 0;
      const end = Number(m2[1]);
      sils.push({ start, end, dur: end - start });
      cur = null;
    }
  }
  if (cur !== null) sils.push({ start: cur, end: total, dur: total - cur });
  return { total, sils };
}

function silsToSegments(sils, total) {
  const segs = [];
  let pos = 0;
  for (const s of sils) {
    if (s.start - pos > 0.22) segs.push({ start: Math.max(0, pos - 0.04), end: Math.min(total, s.start + 0.06) });
    pos = s.end;
  }
  if (total - pos > 0.22) segs.push({ start: Math.max(0, pos - 0.04), end: total });
  return segs;
}

function isPlausibleSplit(segs, batch) {
  if (segs.length !== batch.length) return false;
  for (let i = 0; i < batch.length; i += 1) {
    const dur = segs[i].end - segs[i].start;
    const han = (batch[i].text.match(/[가-힣]/g) || []).length;
    if (dur < 0.3) return false;
    if (han >= 8) {
      const rate = han / dur;
      if (rate > 10.5 || rate < 1.3) return false;
    }
  }
  return true;
}

function splitByDp(wavPath, batch) {
  const K = batch.length;
  const weights = batch.map((b) => Math.max(4, (b.text.match(/[가-힣0-9a-zA-Z]/g) || []).length));
  const totalW = weights.reduce((a, x) => a + x, 0);

  let bestRes = null;
  for (const db of [-34, -36, -38]) {
    const { total, sils } = detectSilences(wavPath, db, 0.25);
    const cand = sils.filter((s) => s.start > 0.22 && s.end < total - 0.22);
    if (cand.length < K - 1) continue;
    const speechTotal = Math.max(1, total - cand.reduce((a, s) => a + s.dur, 0) * 0.45);
    const expDur = weights.map((w) => (w / totalW) * speechTotal);

    // nodes: 0 = audio start, 1..M = cand[0..M-1], M+1 = audio end
    const M = cand.length;
    const segStart = (node) => (node === 0 ? 0 : cand[node - 1].end);
    const segEnd = (node) => (node === M + 1 ? total : cand[node - 1].start);

    // dp[k][j] = min cost to place k-th segment ending at node j (k: 1..K)
    const INF = 1e9;
    const dp = Array.from({ length: K + 1 }, () => new Float64Array(M + 2).fill(INF));
    const prev = Array.from({ length: K + 1 }, () => new Int32Array(M + 2).fill(-1));
    dp[0][0] = 0;

    for (let k = 1; k <= K; k += 1) {
      const jMin = k === K ? M + 1 : k;
      const jMax = k === K ? M + 1 : M - (K - 1 - k);
      for (let j = jMin; j <= jMax; j += 1) {
        const iMin = k === 1 ? 0 : k - 1;
        const iMax = k === 1 ? 0 : j - 1;
        for (let i = iMin; i <= iMax; i += 1) {
          if (dp[k - 1][i] >= INF) continue;
          const dur = segEnd(j) - segStart(i);
          if (dur < 0.22) continue;
          const ratioErr = Math.abs(dur - expDur[k - 1]) / Math.max(0.8, expDur[k - 1]);
          // 무음이 길수록 큰 보너스 (최대 1.6s까지 가점)
          const silBonus = j <= M ? Math.min(1.6, cand[j - 1].dur) * 1.4 : 0;
          const cost = dp[k - 1][i] + ratioErr - silBonus;
          if (cost < dp[k][j]) {
            dp[k][j] = cost;
            prev[k][j] = i;
          }
        }
      }
    }
    if (dp[K][M + 1] >= INF) continue;
    const chosen = [];
    let cur = M + 1;
    for (let k = K; k >= 1; k -= 1) {
      const p = prev[k][cur];
      if (p > 0) chosen.push(cand[p - 1]);
      cur = p;
    }
    chosen.reverse();
    const segs = silsToSegments(chosen, total);
    if (segs.length === K && (!bestRes || dp[K][M + 1] < bestRes.cost)) {
      bestRes = { segs, db, d: +chosen.reduce((m, x) => Math.min(m, x.dur), 99).toFixed(2), mode: 'dp', cost: dp[K][M + 1] };
    }
  }
  return bestRes;
}

function splitExact(wavPath, batch) {
  const expected = batch.length;
  // 1단계: 긴 무음부터 점차 좁혀 정확히 expected개이고 길이 비율도 타당한 경계 탐색
  const trials = [
    [-36, 1.45], [-36, 1.25], [-36, 1.05], [-36, 0.90], [-36, 0.75], [-36, 0.62], [-36, 0.50],
    [-34, 1.20], [-34, 0.95], [-34, 0.78], [-34, 0.60], [-34, 0.48],
    [-38, 1.15], [-38, 0.85], [-38, 0.65], [-38, 0.50],
  ];
  for (const [db, d] of trials) {
    const { total, sils } = detectSilences(wavPath, db, d);
    const segs = silsToSegments(sils, total);
    if (isPlausibleSplit(segs, batch)) return { segs, db, d, mode: 'grid' };
  }
  // 2단계: 글자 수 비율 + 무음 길이를 함께 맞추는 DP 최적 경계 분할 (재호출 낭비 방지)
  const dpRes = splitByDp(wavPath, batch);
  if (dpRes) return dpRes;
  return null;
}

async function synthViaApi({ text, style }, outWav) {
  const { key: apiKey } = loadApiKey();
  const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  const payload = {
    model: 'gemini-3.8-flash-tts',
    input: [{ type: 'user_input', content: [{ type: 'text', text, annotations: style ? [{ type: 'speech_metadata', style }] : [] }] }],
    response_format: { type: 'audio' },
    generation_config: { speech_config: [{ voice: KO_VOICE }] },
  };
  let body = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    body = await res.text();
    if (res.ok) break;
    if (res.status === 429 && /per minute|retry in/i.test(body) && !/per day|daily/i.test(body) && attempt < 4) {
      const sec = Number((body.match(/retry in (\d+)s/i) || [])[1] || 25) + 3;
      console.log(`  [API 분당 한도 대기 ${sec}초 후 재시도 ${attempt}/3]`);
      await new Promise((r) => setTimeout(r, sec * 1000));
      continue;
    }
    throw new Error(`API HTTP ${res.status}: ${body.slice(0, 400)}`);
  }
  const json = JSON.parse(body);
  const findAudio = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) { for (const x of node) { const r = findAudio(x); if (r) return r; } return null; }
    if (typeof node.data === 'string' && node.data.length > 500) return { data: node.data, mime: node.mime_type || node.mimeType || '' };
    for (const v of Object.values(node)) { const r = findAudio(v); if (r) return r; }
    return null;
  };
  const found = findAudio(json);
  if (!found) throw new Error('API 응답에 오디오 없음');
  const rawBuf = Buffer.from(found.data, 'base64');
  const tmpRaw = `${outWav}.raw.wav`;
  mkdirSync(dirname(outWav), { recursive: true });
  const isRiff = rawBuf.length >= 4 && rawBuf.toString('ascii', 0, 4) === 'RIFF';
  writeFileSync(tmpRaw, !isRiff && (/L16|pcm/i.test(found.mime) || !found.mime) ? pcmToWav(rawBuf, { ...AUDIO_FORMAT, sampleRate: sampleRateFromMime(found.mime) }) : rawBuf);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', tmpRaw, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', outWav]);
  rmSync(tmpRaw, { force: true });
  return { duration: probeDuration(outWav), bytes: rawBuf.length };
}

async function ensureChrome() {
  try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* 꺼져 있음 */ }
  spawn(CHROME_PATH, [`--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check', 'https://aistudio.google.com'], { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* 대기 */ }
  }
  throw new Error('자동화용 크롬을 켜지 못했습니다');
}

async function openSpeechTab(browser) {
  const page = await browser.contexts()[0].newPage();
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('https://aistudio.google.com/generate-speech', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);
  for (let i = 0; i < 4; i += 1) {
    if (!(await page.locator('.cdk-overlay-backdrop-showing').count())) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  await page.getByText('Create new dialog').first().click();
  await page.waitForTimeout(2500);
  return { page, voice: '', style: '' };
}

async function synthOnTab(session, { text, style }, outWav) {
  const { page } = session;
  const speakerBtn = page.locator('button:has-text("Speaker 1 - ")').first();
  if (!(await speakerBtn.innerText()).includes(`- ${KO_VOICE}`)) {
    await speakerBtn.click();
    await page.waitForTimeout(1200);
    await page.locator('.cdk-overlay-container').getByText(KO_VOICE, { exact: true }).first().click();
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

  const readAudio = () => page.evaluate(() => [...document.querySelectorAll('audio')].filter((a) => a.src.startsWith('data:audio') && a.duration > 0.3).map((a) => ({ src: a.src, dur: a.duration })));
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
  const { bytes } = decodeAudioDataUrl(picked.src);
  mkdirSync(dirname(outWav), { recursive: true });
  writeFileSync(outWav, bytes);
  return { duration: picked.dur, bytes: bytes.length };
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const force = argv.includes('--force');
  const single = argv.includes('--single');
  const onlyIdx = argv.indexOf('--only');
  const only = onlyIdx >= 0 && argv[onlyIdx + 1] ? new Set(argv[onlyIdx + 1].split(',').map((s) => s.trim())) : null;

  const gate = checkVoiceGate({ projectDir: EP_DIR });
  if (!gate.ok) throw new Error(`음성 안전 관문 차단: ${gate.blockers.join(' / ')}`);

  const chunks = extractKoreanChunks(join(EP_DIR, 'SCRIPT.md'));
  for (const c of chunks) validateText(c.text);

  mkdirSync(join(EP_DIR, 'assets'), { recursive: true });
  writeFileSync(join(EP_DIR, 'assets', 'ko-manifest.json'), JSON.stringify({ voice: KO_VOICE, total: chunks.length, chunks }, null, 2) + '\n', 'utf8');

  const todo = chunks.filter((c) => {
    if (only && !only.has(c.id)) return false;
    if (!force && existsSync(join(OUT_DIR, `${c.id}.wav`))) return false;
    return true;
  });

  const batches = buildBatches(todo, { single });
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

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });
  let useApiFallback = argv.includes('--api');
  let browser = null;
  if (!useApiFallback) {
    await ensureChrome();
    browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  }
  let session = null;
  let tabCount = 0;
  let doneChunks = 0;
  let tmpSeq = 0;

  const synthSmart = async ({ text, style }, outWav) => {
    if (useApiFallback) return synthViaApi({ text, style }, outWav);
    if (!session || tabCount >= 12) {
      if (session) await session.page.close().catch(() => { });
      session = await openSpeechTab(browser);
      tabCount = 0;
    }
    try {
      const res = await synthOnTab(session, { text, style }, outWav);
      tabCount += 1;
      return res;
    } catch (err) {
      if (LIMIT_RE.test(err.message) || /한도 안내/.test(err.message)) {
        console.log(`  [웹 한도 도달 → 무료 API 보조 경로로 자동 전환] ${err.message}`);
        useApiFallback = true;
        return synthViaApi({ text, style }, outWav);
      }
      throw err;
    }
  };

  const processGroup = async (group, label) => {
    if (group.length === 1) {
      const it = group[0];
      const outPath = join(OUT_DIR, `${it.id}.wav`);
      const res = await synthSmart({ text: it.text, style: KO_STYLE_SINGLE }, outPath);
      doneChunks += 1;
      console.log(`${label} OK 단건 ${it.id} (${res.duration.toFixed(1)}s${useApiFallback ? ', API' : ''})`);
      return;
    }
    tmpSeq += 1;
    const combined = group.map((x) => x.text).join(' <long pause> <long pause> <long pause> ');
    const tmpWav = join(TMP_DIR, `batch-${String(tmpSeq).padStart(3, '0')}.wav`);
    const res = await synthSmart({ text: combined, style: KO_STYLE_BATCH }, tmpWav);
    const found = splitExact(tmpWav, group);
    if (found) {
      for (let j = 0; j < group.length; j += 1) {
        const it = group[j];
        const seg = found.segs[j];
        execFileSync('ffmpeg', [
          '-y', '-v', 'error', '-i', tmpWav,
          '-ss', seg.start.toFixed(3), '-to', seg.end.toFixed(3),
          '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le',
          join(OUT_DIR, `${it.id}.wav`),
        ]);
        doneChunks += 1;
      }
      console.log(`${label} OK ${group[0].id}~${group.at(-1).id} (${group.length}개 분할[${found.mode}], 총 ${res.duration.toFixed(1)}s, minSil=${found.d}s${useApiFallback ? ', API' : ''})`);
      return;
    }
    // 분할 실패 시 단건 6회 대신 반으로 쪼개 재시도 (호출 수 대폭 절약)
    const mid = Math.ceil(group.length / 2);
    console.log(`${label} 분할 불일치 → 반쪽 분할 폴백 (${mid} + ${group.length - mid})`);
    await processGroup(group.slice(0, mid), `  ↳`);
    await new Promise((r) => setTimeout(r, 2500));
    await processGroup(group.slice(mid), `  ↳`);
  };

  try {
    for (let bi = 0; bi < batches.length; bi += 1) {
      await processGroup(batches[bi], `[묶음 ${bi + 1}/${batches.length}]`);
      if (bi < batches.length - 1) await new Promise((r) => setTimeout(r, useApiFallback ? 22000 : 3500));
    }
  } finally {
    if (session) await session.page.close().catch(() => { });
    if (browser) await browser.close().catch(() => { });
  }
  console.log(`완료: ${doneChunks}/${todo.length}덩어리 생성됨`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
