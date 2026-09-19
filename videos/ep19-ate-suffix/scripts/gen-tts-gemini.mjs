#!/usr/bin/env node
// Generate all 12 EP19 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) — same approach as EP16~EP18
// (videos/ep18-silent-consonants/scripts/gen-tts-gemini.mjs).
//
// Frames 8 and 9 (3-second-pause quizzes) are NOT single calls: SCRIPT.md
// writes the pause inline as "(3초 정적)" stage direction between the
// question half and the answer half of the same frame's narration. Real
// dead air is inserted locally (not billed as TTS audio) between the two
// halves so the on-screen countdown/thinking beat has actual silence to run
// against — same procedure as EP17/EP18's quiz frames.
//
// ⚠️ Free tier is 10 requests/day/model — past that, calls are billed with no
// local hard stop (synthesize() has no spend gate). This project has 14 total
// pieces (10 single-scene calls + 2 Frame-8 sub-pieces + 2 Frame-9 sub-pieces).
// Get the user's go-ahead on the estimated spend first (CLAUDE.md cost-gate
// rule) — this script does not enforce that itself.
//
// Usage: node scripts/gen-tts-gemini.mjs --only=01,02,03 [--dry-run]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOICE,
  AUDIO_FORMAT,
  loadApiKey,
  synthesize,
  pcmToWav,
  sampleRateFromMime,
  appendLedger,
  won,
  PRICING,
} from "../../../scripts/tts-config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");
mkdirSync(VOICE_DIR, { recursive: true });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",") : null;

// 12 frames (SCRIPT.md, 2026-09-19 finalized after web-search fact-check pass —
// bare "-ate" + particle TTS-safety fix in 5 spots (Frames 3/7/11), Frame 3's
// "에스-" overclaim corrected to a neutral "맨 앞 음절" description, Frame 12
// previous-episode recommendation card added). Frames 8 and 9 are represented
// as 2 sub-pieces each, to be concatenated after generation (see
// FRAME8_PIECES / FRAME9_PIECES below).
const LINES = [
  { id: "01", text: `동사로 움직일 때 to estimate는 '에스티메이트'인데, 명사 서류 an estimate는 왜 '에스티멋'일까요? to graduate는 '그래듀에이트'인데, a graduate는 왜 '그래듀엇'일까요? 스펠링은 분명 100% 똑같은데, 방금 끝소리가 완전히 다르게 끝나는 것 들으셨나요? 오늘 이 기준 하나만 알면, 단어마다 사전을 뒤지지 않아도 입에서 바로 구분됩니다.` },
  { id: "02", text: `안녕하세요, 「이해하면 쉬운영어」입니다. 단어마다 따로 외우지 마세요. 움직이는 행동, 즉 동사일 땐 '에이트'로 당당하게 소리 나고, 이름이나 상태, 즉 명사나 형용사일 땐 힘 빠진 '엇'으로 소리가 바뀝니다. 단어의 자리가 소리를 결정합니다.` },
  { id: "03", text: `왜 이런 차이가 생길까요? 사전을 찾아보면 두 단어 모두 맨 앞 음절에 가장 센 제1강세가 있습니다. 진짜 차이는 맨 끝의 -ate 소리에 힘을 주느냐, 완전히 빼버리느냐에 있습니다. 무언가를 행동하는 동사는 동작을 확실하게 끝맺어야 하니까, 맨 끝의 -ate 소리에도 보조 에너지를 살려서 '에이트!' 하고 또렷하게 발음합니다. 반대로 사물의 이름이나 상태는 첫머리만 들려주면 무슨 단어인지 다 알기 때문에, 끝에 있는 -ate 소리에는 아무런 힘도 주지 않고 목구멍의 힘을 툭 빼버립니다. 에너지를 0%로 완전히 빼버리니 힘 빠진 '엇' 하고 자연스럽게 쪼그라드는 것이죠.` },
  { id: "04", text: `저도 예전에 해외 직구나 이메일에서 estimate를 볼 때마다 '에스티메이트'로만 읽었었는데, 원어민들은 자꾸 '에스티멋'이라고 하더라고요. 이제 이유를 아시겠죠? '견적을 내다'라는 행동일 땐 뒤를 힘차게 밀어서 to estimate. 반대로 '견적서'라는 명사 서류일 땐 첫 글자만 세게 치고 뒤는 턱의 힘을 툭 빼서 an estimate. 입술과 턱에 힘을 완전히 빼고 가볍게 3번 소리 내보실까요? an estimate, an estimate, an estimate. 턱이 툭 떨어지며 편안해지는 게 느껴지시죠?` },
  { id: "05", text: `두 번째는 해외 식당에서 계산할 때 무조건 쓰는 separate입니다. 식당에서 "계산 따로따로 해주세요" 할 때 원어민들은 뭐라고 할까요? '따로따로의'라는 상태를 나타내니까 앞만 쾅 치고 뒤는 힘을 뺍니다. separate check! '세퍼레이트'가 아니라 '세퍼럿 체크'라고 해야 원어민 귀에 한 번에 꽂힙니다. 반대로 무언가를 '나누다'라는 행동일 땐 뒤를 살려 to separate. 자, 식당에서 주문하듯 형용사 소리를 3번 따라 해보겠습니다. separate, separate, separate. 앞글자만 치고 뒤를 버리니 입이 정말 편하죠?` },
  { id: "06", text: `세 번째는 학교와 자격증에 나오는 단어들입니다. '졸업하다'라는 행동일 땐 to graduate, 당당하게 '에이트'로 소리 냅니다. 하지만 '졸업생'이라는 명사가 되면 a graduate, '그래듀엇'으로 힘이 빠집니다. 우리가 자격증이나 호텔 예약할 때 보는 certificate도 마찬가지입니다. 스펠링만 보고 습관적으로 '서티피케이트'라고 읽으셨을 텐데요. 증명서라는 이름표니까 끝에 힘을 툭 빼서 certificate, '서티피킷' 하고 줄여 읽어야 원어민이 한 번에 알아듣습니다. 소리 내어 3번 연습해 볼까요? certificate, certificate, certificate. 이제 어려운 고급 단어들도 원리가 한 손에 잡히실 겁니다.` },
  { id: "07", text: `그런데 놀랍게도, 여러분은 이미 평생 동안 이 규칙을 입으로 쓰고 계셨습니다. 우리가 매일 맛있게 먹는 초콜릿의 영어 스펠링을 볼까요? c, h, o, c, o, l, a, t, e. 끝이 분명 -ate 철자로 끝나죠. 만약 이 단어가 동사였다면 우리는 평생 '초콜레이트'라고 불렀을 겁니다. 하지만 달콤한 간식의 이름, 즉 명사이기 때문에 첫머리에만 힘을 주고 뒤는 힘이 툭 빠져서 chocolate, '초콜릿'으로 굳어진 것입니다. 기후를 뜻하는 climate도 '클라이멋', 개인적인을 뜻하는 private도 '프라이벗'인 이유가 바로 여기에 있습니다. 우리 혀는 이미 정답을 알고 있었던 것이죠.` },
  { id: "10", text: `그럼 실제 문장 속에서는 원어민 소리가 어떻게 날아올까요? 두 문장을 연달아 들어보겠습니다. 첫 번째, "Can you estimate the cost?"에서는 '추정하다'라는 동사라 estimate, '에스티메이트'가 또렷하게 꽂힙니다. 반대로 두 번째, "Send me the estimate."에서는 '견적서'라는 명사라 estimate, 힘이 쑥 빠진 '에스티멋'으로 툭 떨어집니다. 문장 속에서도 두 소리의 자리가 선명하게 갈라지죠?` },
  { id: "11", text: `오늘 배운 핵심, 딱 이 한 장만 기억하시면 됩니다. -ate 철자로 끝나는 단어를 만났을 때, 행동하는 동사라면 끝까지 힘을 살려 '에이트'! 사람이나 사물의 이름, 상태를 나타낸다면 뒤를 툭 떨어뜨려 '엇' 또는 '잇'! 이 소리 공식 하나만 마음에 품으시면 수십 개의 고급 단어가 저절로 정복됩니다.` },
  { id: "12", text: `이제 미드나 일상에서 -ate 단어를 만나도 전혀 멈칫하실 필요가 없습니다. 소리의 원리를 이해한 여러분의 귀는 이미 한 걸음 더 앞서가고 있으니까요. 오늘 내용이 도움이 되셨다면 구독과 좋아요 부탁드립니다. 오늘도 함께해 주셔서 감사합니다.` },
];

// Frame 8 (Quiz Round 1, moderate): question half + 3s silent think-time +
// answer half. The 3-second gap is real dead air inserted locally (not
// billed as TTS audio) so the on-screen countdown gauge has something to
// run against — matches SCRIPT.md's inline "(3초 정적)" stage direction.
const FRAME8_PIECES = [
  { id: "08a", text: "이제 원리를 완전히 이해하셨으니 직접 맞춰보실 시간입니다. 한 번도 배운 적 없는 새로운 단어로 도전해 볼까요? 화면에 나오는 이 단어 보이시죠? '조절하다', '완화하다'라는 움직임, 즉 동사로 쓰일 땐 이 단어를 어떻게 읽어야 할까요? 잠깐 생각해 보세요.", gapAfterMs: 3000 },
  { id: "08b", text: "네, 행동을 나타내는 동사니까 끝까지 에너지를 밀어붙여야겠죠. 정답은 바로 '모더레이트'입니다.", gapAfterMs: 0 },
];

// Frame 9 (Quiz Round 2, delegate): same shape.
const FRAME9_PIECES = [
  { id: "09a", text: "하나 더 도전해 보시죠. 이번에도 처음 만나는 단어입니다. 화면의 이 단어가 회사의 '대표자'나 '대리인'이라는 사람의 이름, 즉 명사로 쓰일 땐 뒤 소리가 어떻게 바뀔까요? 3초 동안 생각해 보세요.", gapAfterMs: 3000 },
  { id: "09b", text: "맞습니다! 이름표를 달았으니 앞머리에 힘을 주고 뒤는 툭 떨어뜨려야 하죠. 정답은 바로 '델리것'입니다. 두 문제 다 맞히셨나요?", gapAfterMs: 0 },
];

async function synthesizeWithRetry(text, key, delivery, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await synthesize(text, key, delivery);
    } catch (e) {
      lastErr = e;
      if (/SAFETY/.test(String(e.message)) && i < tries - 1) {
        console.log(`  (transient SAFETY false-positive, retry ${i + 1}/${tries - 1})`);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function silencePcm(ms) {
  const bytesPerSample = AUDIO_FORMAT.bitsPerSample / 8;
  const samples = Math.round((AUDIO_FORMAT.sampleRate * ms) / 1000);
  return Buffer.alloc(samples * bytesPerSample * AUDIO_FORMAT.channels, 0);
}

function pcmDurationSeconds(pcmLength) {
  return pcmLength / (AUDIO_FORMAT.sampleRate * (AUDIO_FORMAT.bitsPerSample / 8) * AUDIO_FORMAT.channels);
}

const allTextsForEstimate = [...LINES, ...FRAME8_PIECES, ...FRAME9_PIECES].map((l) => l.text);
const totalCharsEstimate = allTextsForEstimate.reduce((s, t) => s + t.length, 0);
console.log(`Pieces: ${allTextsForEstimate.length} total (10 single-scene calls + 2 Frame-8 sub-pieces + 2 Frame-9 sub-pieces)`);
console.log(`Total narration chars: ${totalCharsEstimate}`);
if (only) console.log(`--only filter active: ${only.join(", ")} (${only.length} calls this run)`);

if (dryRun) {
  console.log("--dry-run: no API calls made.");
  process.exit(0);
}

const { key: apiKey } = loadApiKey();
const resultsPath = join(PROJECT_DIR, ".tts-results.json");
const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {}; // id -> { path, duration_s }
let totalUsd = 0;

async function generateOne(id, text) {
  process.stdout.write(`  ${id}: generating (${text.length} chars)... `);
  const { pcm, mimeType, usage } = await synthesizeWithRetry(text, apiKey, {});
  const rate = sampleRateFromMime(mimeType);
  if (rate !== AUDIO_FORMAT.sampleRate) {
    throw new Error(`${id}: response rate=${rate}, expected ${AUDIO_FORMAT.sampleRate} (mimeType=${mimeType})`);
  }
  const durationS = pcmDurationSeconds(pcm.length);
  const audioTokens = usage?.candidatesTokenCount ?? Math.ceil(durationS * PRICING.audioTokensPerSecond);
  const inputTokens = usage?.promptTokenCount ?? text.length;
  const usd = (inputTokens / 1e6) * PRICING.usdPerMillionInputTokens + (audioTokens / 1e6) * PRICING.usdPerMillionOutputTokens;
  totalUsd += usd;
  appendLedger({ episode: "ep19-ate-suffix", scene: id, chars: text.length, audioSeconds: durationS, audioTokens, inputTokens, usd, billed: usage != null });
  console.log(`${durationS.toFixed(3)}s, ${won(usd * PRICING.krwPerUsd)}`);
  return pcm;
}

// Persisted after every successful piece (not just once at the end) — a
// mid-run crash used to lose every result from that run, including
// already-paid-for pieces (EP17 lesson).
function saveResults() {
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
}

// Scenes 1-7, 10-12: one call each.
for (const line of LINES) {
  if (only && !only.includes(line.id)) continue;
  const pcm = await generateOne(line.id, line.text);
  const wav = pcmToWav(pcm, AUDIO_FORMAT);
  const relPath = `assets/voice/${line.id}.wav`;
  writeFileSync(join(PROJECT_DIR, relPath), wav);
  results[line.id] = { path: relPath, duration_s: Number(pcmDurationSeconds(pcm.length).toFixed(3)) };
  saveResults();
}

// Shared concatenation logic for a quiz frame's sub-pieces.
async function assembleQuizFrame(frameId, pieces) {
  const requested = only && pieces.some((p) => only.includes(p.id));
  if (!requested) return;
  console.log(`Frame ${frameId} (quiz round) — generating requested sub-pieces:`);
  const pcmParts = [];
  let allPiecesPresent = true;
  for (const piece of pieces) {
    if (only.includes(piece.id)) {
      const pcm = await generateOne(piece.id, piece.text);
      const wav = pcmToWav(pcm, AUDIO_FORMAT);
      writeFileSync(join(PROJECT_DIR, `assets/voice/${piece.id}.wav`), wav);
      results[piece.id] = { path: `assets/voice/${piece.id}.wav`, duration_s: Number(pcmDurationSeconds(pcm.length).toFixed(3)) };
      saveResults();
      pcmParts.push(pcm);
    } else {
      const cached = results[piece.id];
      if (!cached || !existsSync(join(PROJECT_DIR, cached.path))) {
        allPiecesPresent = false;
        continue;
      }
      const wavBuf = readFileSync(join(PROJECT_DIR, cached.path));
      pcmParts.push(wavBuf.subarray(44)); // strip the 44-byte WAV header back to raw PCM
    }
    if (piece.gapAfterMs > 0) pcmParts.push(silencePcm(piece.gapAfterMs));
  }
  if (allPiecesPresent) {
    const combined = Buffer.concat(pcmParts);
    const wav = pcmToWav(combined, AUDIO_FORMAT);
    writeFileSync(join(PROJECT_DIR, `assets/voice/${frameId}.wav`), wav);
    results[frameId] = { path: `assets/voice/${frameId}.wav`, duration_s: Number(pcmDurationSeconds(combined.length).toFixed(3)) };
    saveResults();
    console.log(`  ${frameId} (combined): ${results[frameId].duration_s}s`);
  } else {
    console.log(`  (some ${frameId} sub-pieces still missing — combined ${frameId}.wav not written yet, run the rest on a later free-tier day)`);
  }
}

// Frame 8 / 9 only run when explicitly requested via --only (their sub-piece
// ids), since each costs 2 calls on its own — kept out of default runs so a
// plain `node gen-tts-gemini.mjs` never silently burns the daily quota on one
// frame.
await assembleQuizFrame("08", FRAME8_PIECES);
await assembleQuizFrame("09", FRAME9_PIECES);

console.log(`\nTotal spend this run: ${won(totalUsd * PRICING.krwPerUsd)} (${totalUsd.toFixed(4)} USD)`);
writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log("Wrote .tts-results.json with real durations per scene.");
