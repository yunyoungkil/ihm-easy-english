// EP37 영어 음성 77개(질문 30 · 대답 30 · 시연 10 · 넓히기 7)를 AI Studio 화면(Gemini 3.8 Flash TTS)으로 일괄 생성한다.
// 사용: node videos/ep37-listen-frozen-questions/scripts/generate-en-audio.mjs [--q-voice Cleo] [--a-voice Knox] [--only q01,q13] [--force]
import {chromium} from 'playwright-core';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {checkVoiceGate} from '../../../scripts/production-gate.mjs';
import {decodeAudioDataUrl, validateText} from '../../../scripts/generate-aistudio-speech.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const OUT_DIR = join(EP_DIR, 'assets', 'voice-en');
const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;

function parseCli(argv) {
  const opts = {qVoice: 'Cleo', aVoice: 'Knox', only: null, force: false};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--q-voice' && argv[i + 1]) { opts.qVoice = argv[++i]; }
    else if (argv[i] === '--a-voice' && argv[i + 1]) { opts.aVoice = argv[++i]; }
    else if (argv[i] === '--only' && argv[i + 1]) { opts.only = new Set(argv[++i].split(',').map((s) => s.trim()).filter(Boolean)); }
    else if (argv[i] === '--force') { opts.force = true; }
  }
  return opts;
}

// 스타일 지시문 (원리별 미국식 자연 연결 발음 유도, 과장된 교과서 낭독 방지)
const ST = {
  ch1: 'Natural, relaxed General American English adult asking an everyday question on the street at normal conversational speed. Reduce function words (do, to, the, a, can) naturally to quick weak schwa sounds while stressing only the key content words. Never slow textbook reading.',
  ch2: 'Natural, relaxed General American English adult speaking at normal everyday conversational speed in a shop. Smoothly link final consonants into following vowels across word boundaries (such as much-is-it, can-I, is-it, this-in, take-a, this-on) without pausing between words.',
  ch3: 'Natural, casual General American English adult speaking to a neighbor at normal everyday conversational speed. Blend d+you smoothly into a natural casual "j" sound (did-ja, would-ja, could-ja) and t+you into a casual "ch" sound (that-chur, get-chu) as in natural American conversation.',
  ch4: 'Natural, casual General American English adult speaking at normal everyday conversational speed. Use a clear, light North American flapped t (soft quick d-tap sound) between vowels across words and inside words (what-are, put-it-in-a, waiting, that-it, what-about, it-a-little). Never pronounce crisp British t.',
  ch5: 'Casual, friendly General American English adult speaking to a close friend at normal everyday speed with warm, natural rising yes-no question intonation at the end.',
  ans: 'Warm, friendly General American English adult giving a short, natural everyday answer at normal conversational speed. Relaxed and clear, never robotic or stiff.',
  d_two: 'Natural General American English adult demonstrating just two stressed words with a short pause between them and rising question intonation at the end.',
  d_can: 'Slow, deliberate General American English adult clearly enunciating every word and placing deliberate stress on the full vowel of the word "can" so the listener hears it distinctly.',
  d_chop: 'Slow, careful General American English adult speaking each word separately with a crisp pause between every word, keeping every consonant separate and unlinked.',
  d_tclear: 'Slow, careful General American English adult speaking each word separately with a crisp pause between words and a clearly released sharp "t" sound, not flapped.',
  d_full: 'Natural, friendly General American English adult asking a full casual question at normal everyday speed with warm rising intonation.',
  x_link: 'Natural, casual General American English adult saying a short everyday expression at normal conversational speed with smooth consonant-to-vowel linking.',
  x_coal: 'Natural, friendly General American English adult saying "Nice to meet you" at normal conversational speed with casual American "mee-chu" blending.',
  x_flap: 'Natural, casual General American English adult speaking at normal everyday speed with a clear North American flapped t (soft quick d-tap sound) between vowels.',
  x_fall: 'Natural, casual General American English adult saying "Got it." as a short statement of understanding, with a clear, definite falling pitch at the end.',
  x_rise: 'Natural, casual General American English adult asking "Got it?" as a quick check question, with a clear, unmistakable rising pitch at the end.',
};

export function buildJobs(qVoice, aVoice) {
  return [
    // 1장 질문 (q01~q06)
    {id: 'q01', group: 'q', chapter: 1, voice: qVoice, style: ST.ch1, text: 'How do I get to Seoul Station?'},
    {id: 'q02', group: 'q', chapter: 1, voice: qVoice, style: ST.ch1, text: 'Which line goes to Gangnam?'},
    {id: 'q03', group: 'q', chapter: 1, voice: qVoice, style: ST.ch1, text: 'Is this the right way to Myeongdong?'},
    {id: 'q04', group: 'q', chapter: 1, voice: qVoice, style: ST.ch1, text: 'Where can I buy a ticket?'},
    {id: 'q05', group: 'q', chapter: 1, voice: qVoice, style: ST.ch1, text: 'Does this train go to the airport?'},
    {id: 'q06', group: 'q', chapter: 1, voice: qVoice, style: ST.ch1, text: 'How long does it take to get there?'},
    // 2장 질문 (q07~q12)
    {id: 'q07', group: 'q', chapter: 2, voice: qVoice, style: ST.ch2, text: 'How much is it?'},
    {id: 'q08', group: 'q', chapter: 2, voice: qVoice, style: ST.ch2, text: 'Can I pay by card?'},
    {id: 'q09', group: 'q', chapter: 2, voice: qVoice, style: ST.ch2, text: 'Is it spicy?'},
    {id: 'q10', group: 'q', chapter: 2, voice: qVoice, style: ST.ch2, text: 'Do you have this in black?'},
    {id: 'q11', group: 'q', chapter: 2, voice: qVoice, style: ST.ch2, text: 'Can I take a look?'},
    {id: 'q12', group: 'q', chapter: 2, voice: qVoice, style: ST.ch2, text: 'Is this on sale?'},
    // 3장 질문 (q13~q18)
    {id: 'q13', group: 'q', chapter: 3, voice: qVoice, style: ST.ch3, text: 'Did you just move in?'},
    {id: 'q14', group: 'q', chapter: 3, voice: qVoice, style: ST.ch3, text: 'Would you like some coffee?'},
    {id: 'q15', group: 'q', chapter: 3, voice: qVoice, style: ST.ch3, text: 'Is that your dog?'},
    {id: 'q16', group: 'q', chapter: 3, voice: qVoice, style: ST.ch3, text: 'Could you help me with this?'},
    {id: 'q17', group: 'q', chapter: 3, voice: qVoice, style: ST.ch3, text: 'Can I get you anything?'},
    {id: 'q18', group: 'q', chapter: 3, voice: qVoice, style: ST.ch3, text: 'Where did you get that?'},
    // 4장 질문 (q19~q24)
    {id: 'q19', group: 'q', chapter: 4, voice: qVoice, style: ST.ch4, text: 'What are you looking for?'},
    {id: 'q20', group: 'q', chapter: 4, voice: qVoice, style: ST.ch4, text: 'Should I put it in a bag?'},
    {id: 'q21', group: 'q', chapter: 4, voice: qVoice, style: ST.ch4, text: 'Are you waiting for a taxi?'},
    {id: 'q22', group: 'q', chapter: 4, voice: qVoice, style: ST.ch4, text: 'Is that it?'},
    {id: 'q23', group: 'q', chapter: 4, voice: qVoice, style: ST.ch4, text: 'What about this one?'},
    {id: 'q24', group: 'q', chapter: 4, voice: qVoice, style: ST.ch4, text: 'Is it a little too big?'},
    // 5장 질문 (q25~q30)
    {id: 'q25', group: 'q', chapter: 5, voice: qVoice, style: ST.ch5, text: 'Want some?'},
    {id: 'q26', group: 'q', chapter: 5, voice: qVoice, style: ST.ch5, text: 'Ready?'},
    {id: 'q27', group: 'q', chapter: 5, voice: qVoice, style: `${ST.ch5} Use a light North American flapped t in "Got a" (gotta).`, text: 'Got a minute?'},
    {id: 'q28', group: 'q', chapter: 5, voice: qVoice, style: `${ST.ch5} Smoothly link "Need a" together.`, text: 'Need a hand?'},
    {id: 'q29', group: 'q', chapter: 5, voice: qVoice, style: ST.ch5, text: 'Hungry?'},
    {id: 'q30', group: 'q', chapter: 5, voice: qVoice, style: ST.ch5, text: 'Seen this?'},
    // 끊어 읽기·대비 시연 (d01~d10, 질문 목소리)
    {id: 'd01', group: 'd', chapter: 1, voice: qVoice, style: ST.d_two, text: 'Get<short pause> Seoul Station?'},
    {id: 'd02', group: 'd', chapter: 1, voice: qVoice, style: ST.d_can, text: 'Where can I buy a ticket?'},
    {id: 'd03', group: 'd', chapter: 2, voice: qVoice, style: ST.d_chop, text: 'How.<short pause> Much.<short pause> Is.<short pause> It.'},
    {id: 'd04', group: 'd', chapter: 2, voice: qVoice, style: ST.d_chop, text: 'Can.<short pause> I.'},
    {id: 'd05', group: 'd', chapter: 2, voice: qVoice, style: ST.d_chop, text: 'Take.<short pause> A.<short pause> Look.'},
    {id: 'd06', group: 'd', chapter: 3, voice: qVoice, style: ST.d_chop, text: 'Did.<short pause> You.'},
    {id: 'd07', group: 'd', chapter: 3, voice: qVoice, style: ST.d_chop, text: 'That.<short pause> Your.'},
    {id: 'd08', group: 'd', chapter: 4, voice: qVoice, style: ST.d_tclear, text: 'What.<short pause> Are.<short pause> You.'},
    {id: 'd09', group: 'd', chapter: 4, voice: qVoice, style: ST.d_tclear, text: 'That.<short pause> It.'},
    {id: 'd10', group: 'd', chapter: 5, voice: qVoice, style: ST.d_full, text: 'Do you want some?'},
    // 넓히기 (x01~x07, 질문 목소리)
    {id: 'x01', group: 'x', chapter: 2, voice: qVoice, style: ST.x_link, text: 'Come on.'},
    {id: 'x02', group: 'x', chapter: 2, voice: qVoice, style: ST.x_link, text: 'Hold on.'},
    {id: 'x03', group: 'x', chapter: 3, voice: qVoice, style: ST.x_coal, text: 'Nice to meet you.'},
    {id: 'x04', group: 'x', chapter: 4, voice: qVoice, style: ST.x_flap, text: 'A lot of people.'},
    {id: 'x05', group: 'x', chapter: 4, voice: qVoice, style: ST.x_flap, text: 'Get out.'},
    {id: 'x06', group: 'x', chapter: 5, voice: qVoice, style: ST.x_fall, text: 'Got it.'},
    {id: 'x07', group: 'x', chapter: 5, voice: qVoice, style: ST.x_rise, text: 'Got it?'},
    // 대답 30개 (a01~a30, 대답 목소리 — 질문과 다른 목소리)
    {id: 'a01', group: 'a', chapter: 1, voice: aVoice, style: ST.ans, text: 'Take Line one.'},
    {id: 'a02', group: 'a', chapter: 1, voice: aVoice, style: ST.ans, text: 'The green one, Line two.'},
    {id: 'a03', group: 'a', chapter: 1, voice: aVoice, style: ST.ans, text: 'Yes, go straight.'},
    {id: 'a04', group: 'a', chapter: 1, voice: aVoice, style: ST.ans, text: 'Over there, at the machine.'},
    {id: 'a05', group: 'a', chapter: 1, voice: aVoice, style: ST.ans, text: 'Yes, it does.'},
    {id: 'a06', group: 'a', chapter: 1, voice: aVoice, style: ST.ans, text: 'About twenty minutes.'},
    {id: 'a07', group: 'a', chapter: 2, voice: aVoice, style: ST.ans, text: "It's fifteen thousand won."},
    {id: 'a08', group: 'a', chapter: 2, voice: aVoice, style: ST.ans, text: 'Sure, go ahead.'},
    {id: 'a09', group: 'a', chapter: 2, voice: aVoice, style: ST.ans, text: 'Just a little.'},
    {id: 'a10', group: 'a', chapter: 2, voice: aVoice, style: ST.ans, text: 'Yes, right here.'},
    {id: 'a11', group: 'a', chapter: 2, voice: aVoice, style: ST.ans, text: 'Of course.'},
    {id: 'a12', group: 'a', chapter: 2, voice: aVoice, style: ST.ans, text: 'Yes, thirty percent off.'},
    {id: 'a13', group: 'a', chapter: 3, voice: aVoice, style: ST.ans, text: 'Yeah, last week.'},
    {id: 'a14', group: 'a', chapter: 3, voice: aVoice, style: ST.ans, text: 'Yes, please.'},
    {id: 'a15', group: 'a', chapter: 3, voice: aVoice, style: ST.ans, text: "Yes, she's very friendly."},
    {id: 'a16', group: 'a', chapter: 3, voice: aVoice, style: ST.ans, text: 'No problem.'},
    {id: 'a17', group: 'a', chapter: 3, voice: aVoice, style: ST.ans, text: 'Just water, thanks.'},
    {id: 'a18', group: 'a', chapter: 3, voice: aVoice, style: ST.ans, text: 'At the market nearby.'},
    {id: 'a19', group: 'a', chapter: 4, voice: aVoice, style: ST.ans, text: 'Just looking, thanks.'},
    {id: 'a20', group: 'a', chapter: 4, voice: aVoice, style: ST.ans, text: 'No, thanks.'},
    {id: 'a21', group: 'a', chapter: 4, voice: aVoice, style: ST.ans, text: 'Yes, I am.'},
    {id: 'a22', group: 'a', chapter: 4, voice: aVoice, style: ST.ans, text: "Yes, that's all."},
    {id: 'a23', group: 'a', chapter: 4, voice: aVoice, style: ST.ans, text: 'That looks good.'},
    {id: 'a24', group: 'a', chapter: 4, voice: aVoice, style: ST.ans, text: 'Maybe a little.'},
    {id: 'a25', group: 'a', chapter: 5, voice: aVoice, style: ST.ans, text: 'Sure, thanks.'},
    {id: 'a26', group: 'a', chapter: 5, voice: aVoice, style: ST.ans, text: 'Almost.'},
    {id: 'a27', group: 'a', chapter: 5, voice: aVoice, style: ST.ans, text: "Yeah, what's up?"},
    {id: 'a28', group: 'a', chapter: 5, voice: aVoice, style: ST.ans, text: "No, I'm good."},
    {id: 'a29', group: 'a', chapter: 5, voice: aVoice, style: ST.ans, text: 'Yeah, starving.'},
    {id: 'a30', group: 'a', chapter: 5, voice: aVoice, style: ST.ans, text: 'No, what is it?'},
  ];
}

const LIMIT_RE = /rate limit|quota|exceeded|resource.?exhausted|too many requests|try again later/i;
const ERROR_RE = /something went wrong|failed to generate|an error occurred/i;

async function ensureChrome() {
  try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* not running */ }
  spawn(CHROME_PATH, [`--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check', 'https://aistudio.google.com'], {detached: true, stdio: 'ignore'}).unref();
  for (let i = 0; i < 30; i += 1) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok) return; } catch { /* wait */ }
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
  const first = await page.evaluate(() => document.body.innerText);
  if (/sign in|로그인/i.test(first.slice(0, 600)) && !/Playground/.test(first)) {
    await page.close().catch(() => {});
    throw new Error('AI Studio에 로그인이 필요합니다');
  }
  if (/only available with a Google AI plan/.test(first)) {
    await page.close().catch(() => {});
    throw new Error('요금제가 필요한 모델입니다');
  }
  await page.getByText('Create new dialog').first().click();
  await page.waitForTimeout(2500);
  return {page, voice: '', style: ''};
}

async function generateOnTab(session, job, outPath) {
  const {page} = session;
  // 목소리 변경
  const speakerBtn = page.locator('button:has-text("Speaker 1 - ")').first();
  if (!(await speakerBtn.innerText()).includes(`- ${job.voice}`)) {
    await speakerBtn.click();
    await page.waitForTimeout(1200);
    const item = page.locator('.cdk-overlay-container').getByText(job.voice, {exact: true});
    if (!(await item.count())) throw new Error(`목소리 없음: ${job.voice}`);
    await item.first().click();
    await page.waitForTimeout(800);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    if (!(await speakerBtn.innerText()).includes(`- ${job.voice}`)) {
      throw new Error(`목소리 변경 실패: ${job.voice}`);
    }
  }
  session.voice = job.voice;

  // 스타일 변경 (aria-label="Style"은 스타일 설정 후에도 유지됨)
  if (session.style !== job.style) {
    await page.locator('button[aria-label="Style"]').first().click();
    await page.waitForTimeout(800);
    await page.locator('.cdk-overlay-container textarea').first().fill(job.style);
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    session.style = job.style;
  }

  // 대본 입력
  const box = page.locator('textarea[aria-label="Speech block text"]');
  await box.click();
  await box.fill(job.text);

  const readAudio = () => page.evaluate(() => [...document.querySelectorAll('audio')].filter((a) => a.src.startsWith('data:audio') && a.duration > 0.25).map((a) => ({src: a.src, dur: a.duration})));
  const before = await readAudio();
  const prevSrc = before.length ? before[before.length - 1].src : '';

  await page.keyboard.press('Control+Enter');

  let lastLen = 0;
  let stable = 0;
  let picked = null;
  for (let t = 0; t < 75; t += 1) {
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
  if (!picked) throw new Error(`시간 초과: ${job.id}`);

  const {bytes} = decodeAudioDataUrl(picked.src);
  if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), {recursive: true});
  writeFileSync(outPath, bytes);
  return {duration: picked.dur, bytes: bytes.length};
}

async function main() {
  const opts = parseCli(process.argv.slice(2));
  const gate = checkVoiceGate({projectDir: EP_DIR});
  if (!gate.ok) {
    throw new Error(`음성 안전 관문 차단: ${gate.blockers.join(' / ')}`);
  }

  const jobs = buildJobs(opts.qVoice, opts.aVoice);
  for (const j of jobs) validateText(j.text);

  mkdirSync(OUT_DIR, {recursive: true});
  writeFileSync(
    join(EP_DIR, 'assets', 'en-manifest.json'),
    JSON.stringify({qVoice: opts.qVoice, aVoice: opts.aVoice, total: jobs.length, jobs}, null, 2) + '\n',
    'utf8',
  );

  const todo = jobs.filter((j) => {
    if (opts.only && !opts.only.has(j.id)) return false;
    const outPath = join(OUT_DIR, `${j.id}.wav`);
    if (!opts.force && existsSync(outPath)) return false;
    return true;
  });

  if (!todo.length) {
    console.log(`생성할 파일 없음 (전체 ${jobs.length}개 이미 존재)`);
    return;
  }

  console.log(`EP37 영어 음성 생성 시작: ${todo.length}/${jobs.length}개 (Q=${opts.qVoice}, A=${opts.aVoice})`);
  await ensureChrome();
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  let session = null;
  let tabCount = 0;
  let created = 0;

  try {
    for (let i = 0; i < todo.length; i += 1) {
      const job = todo[i];
      const outPath = join(OUT_DIR, `${job.id}.wav`);
      const t0 = Date.now();
      let done = false;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          if (!session || tabCount >= 18) {
            if (session) await session.page.close().catch(() => {});
            session = await openSpeechTab(browser);
            tabCount = 0;
          }
          const res = await generateOnTab(session, job, outPath);
          tabCount += 1;
          created += 1;
          console.log(`[${i + 1}/${todo.length}] OK ${job.id} (${job.voice}) ${res.duration.toFixed(2)}s ${res.bytes}B (${((Date.now() - t0) / 1000).toFixed(1)}s) — "${job.text}"`);
          done = true;
          break;
        } catch (err) {
          console.error(`[${i + 1}/${todo.length}] ERR ${job.id} (시도 ${attempt}): ${err.message}`);
          if (/로그인|요금제|한도|관문/.test(err.message)) throw err;
          if (session) {
            await session.page.close().catch(() => {});
            session = null;
            tabCount = 0;
          }
          if (attempt === 2) throw err;
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      if (done && i < todo.length - 1) {
        await new Promise((r) => setTimeout(r, 3500));
      }
    }
  } finally {
    if (session) await session.page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  console.log(`완료: ${created}/${todo.length}개 생성됨`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
