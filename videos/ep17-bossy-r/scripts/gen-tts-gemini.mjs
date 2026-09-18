#!/usr/bin/env node
// Generate all 15 EP17 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) — same approach as EP11~16
// (videos/ep16-double-vowels/scripts/gen-tts-gemini.mjs).
//
// Frames 10 and 11 (3-second quiz rounds) are NOT single calls: STORYBOARD.md
// calls for a real silent gap between each quiz word and its spoken answer
// (so the on-screen 3-second countdown gauge has actual dead air to run
// against, matching the "3초 안에 소리 내보세요" instruction). Each round is
// split into word/answer sub-pieces and concatenated at the raw-PCM level
// with silence inserted between them — same procedure as EP16 Frame 9.
//
// ⚠️ Free tier is 10 requests/day/model — past that, calls are billed with no
// local hard stop (synthesize() has no spend gate). This project has 27 total
// pieces (13 single-scene calls + 7 Frame-10 sub-pieces + 7 Frame-11
// sub-pieces). Check .tts-usage.json for today's date/call count before
// running more than the free allowance, and get the user's go-ahead on the
// estimated spend first (CLAUDE.md cost-gate rule) — this script does not
// enforce that itself.
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

// 15 frames (SCRIPT.md, 2026-09-18 finalized after evaluation pass — Frame
// 3/4 reveal reorder + Frame 1 minimal-pair fix + AR/OR/UR+particle TTS-safety
// fix applied). Frames 10 and 11 are represented as 7 sub-pieces each, to be
// concatenated after generation (see FRAME10_PIECES / FRAME11_PIECES below).
const LINES = [
  { id: "01", text: `A는 '애', I는 '이', O는 '아'. 우리 분명 이렇게 배웠죠. 그런데 왜 car, sir, for에서는 그 소리가 단 하나도 안 날까요? 뒤에 붙은 R 하나가 모음 소리를 통째로 집어삼켰기 때문입니다.` },
  { id: "02", text: `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 R 뒤에서 사라진 모음의 비밀과, 딱 세 가지로 끝나는 소리 공식을 공개합니다.` },
  { id: "03", text: `모음 뒤에 R이 붙은 철자는 AR, ER, IR, OR, UR, 이렇게 다섯 가지입니다. 사전을 펴보면 단어마다 발음기호가 다 다르게 표시돼 있어서, 다섯 개를 전부 외워야 할 것처럼 보이죠.` },
  { id: "04", text: `사실 이 다섯 가지, 전부 외울 필요 없습니다. 그중 ER, IR, UR 이 세 가지는 철자만 다를 뿐 소리가 완전히 똑같거든요. her, bird, fur. 철자는 E, I, U로 다르지만, 소리는 셋 다 편안한 '어~' 하나입니다. 그러니까 진짜 외워야 할 소리는 AR, OR, 그리고 이 '어~'까지, 딱 세 가지뿐입니다.` },
  { id: "05", text: `원리는 간단합니다. 혀가 R을 발음하기 위해 너무 일찍 움직이기 때문입니다. 모음의 입 모양을 채 만들기도 전에, 혀가 R 소리를 내려고 뒤로 쑥 물러나 버립니다. 결국 모음의 원래 소리는 혀의 큰 움직임에 녹아서 R 소리로 바뀌는 겁니다.` },
  { id: "06", text: `첫 번째 AR 소리는 턱을 툭 떨어뜨리는 시원한 '아~' 소리입니다. A의 원래 소리 대신 입안을 넓게 열고 소리를 냅니다. 함께 소리 내보실까요? car, park, star, farm, card. 턱에 힘을 풀고 '아~' 하고 소리 내면 저절로 읽힙니다.` },
  { id: "07", text: `두 번째 OR 소리는 입술을 동그랗게 모으는 깊은 '오~' 소리입니다. O 뒤에 R이 오면 입술 끝으로 둥글게 모여 울립니다. 직접 소리 내보세요. for, corn, storm, fork, horse. 촛불을 불듯이 입술을 모으고 깊게 '오~' 하고 소리 냅니다.` },
  { id: "08", text: `마지막 ER, IR, UR 소리는 입에 힘을 툭 뺀 중립의 '어~' 소리입니다. 철자가 E든, I든, U든 전혀 상관없습니다. person, term, girl, shirt, nurse, burn. 입꼬리에 힘을 풀고 멍하니 '어~' 소리만 내시면 됩니다.` },
  { id: "09", text: `여기서 잠깐, 정말 중요한 꿀팁 하나 짚고 갈까요? red처럼 모음 앞에 오는 R과, car처럼 모음 뒤에 오는 R은 소리가 완전히 다릅니다. 앞에 오는 R은 혀를 둥글게 '우~'로 밀어내고, 뒤에 오는 R은 모음의 꼬리를 낚아채서 뒤로 당깁니다. 이 차이만 알아도 영어 소리가 훨씬 쉬워집니다.` },
  { id: "12", text: `이제 문장으로 확인해 볼까요? 우리가 배운 세 가지 소리가 한 문장에 다 들어있습니다. The girl in the car is waiting for her turn. girl의 '어', car의 '아', for의 '오', turn의 '어'. 이제 단어가 저절로 구별되시죠?` },
  { id: "13", text: `한 문장만 더 읽어보겠습니다. 이번엔 우리가 매일 쓰는 단어들이 들어있습니다. Please order a burger and corn for the party. order와 corn의 '오', burger의 '어', party의 '아'. 이제 외래어를 보셔도 원래 소리가 한눈에 보이실 겁니다.` },
  { id: "14", text: `오늘 배운 규칙, 이 한 장만 기억하세요. AR 소리는 턱 내리는 '아', OR 소리는 입술 모으는 '오', ER, IR, UR 소리는 힘 뺀 '어'. 다섯 개 철자가 단 세 개 소리로 끝납니다. 화면을 캡처해 두고 단어를 읽을 때마다 꺼내보세요.` },
  { id: "15", text: `단어는 무작정 외우는 게 아니라 소리의 길을 이해하는 겁니다. 지난 모음 편도 함께 보시면 영어가 훨씬 쉬워집니다. 오늘도 수고 많으셨습니다. 이해하면 쉬운영어였습니다.` },
];

// Frame 10 (Quiz Round 1): intro + 3x [word, 3s silent think-time, answer].
// The 3-second gap is real dead air inserted locally (not billed as TTS
// audio) so the on-screen countdown gauge has something to run against.
const FRAME10_PIECES = [
  { id: "10a", text: "원리를 배웠으니 직접 맞춰보세요. 단어가 나오면 몇 번 서랍인지 3초 안에 소리 내보세요.", gapAfterMs: 300 },
  { id: "10b", text: "smart!", gapAfterMs: 3000 },
  { id: "10c", text: "턱을 내리는 1번 AR 소리죠.", gapAfterMs: 400 },
  { id: "10d", text: "short!", gapAfterMs: 3000 },
  { id: "10e", text: "입술을 모으는 2번 OR 소리입니다.", gapAfterMs: 400 },
  { id: "10f", text: "turn!", gapAfterMs: 3000 },
  { id: "10g", text: "힘을 뺀 3번 소리입니다. 아주 잘하셨습니다!", gapAfterMs: 0 },
];

// Frame 11 (Quiz Round 2, speed): same shape but a shorter 1.5s gap — the
// script itself calls for "조금 더 빠른 속도" this round.
const FRAME11_PIECES = [
  { id: "11a", text: "이번엔 조금 더 빠른 속도로 2라운드에 도전해 볼까요?", gapAfterMs: 300 },
  { id: "11b", text: "dark!", gapAfterMs: 1500 },
  { id: "11c", text: "턱을 내리는 AR 소리죠.", gapAfterMs: 300 },
  { id: "11d", text: "fork!", gapAfterMs: 1500 },
  { id: "11e", text: "입술을 모으는 OR 소리입니다.", gapAfterMs: 300 },
  { id: "11f", text: "first!", gapAfterMs: 1500 },
  { id: "11g", text: "힘을 뺀 IR 소리입니다. 망설임 없이 바로 맞추셨다면 성공입니다!", gapAfterMs: 0 },
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

const allTextsForEstimate = [...LINES, ...FRAME10_PIECES, ...FRAME11_PIECES].map((l) => l.text);
const totalCharsEstimate = allTextsForEstimate.reduce((s, t) => s + t.length, 0);
console.log(`Pieces: ${allTextsForEstimate.length} total (13 single-scene calls + 7 Frame-10 sub-pieces + 7 Frame-11 sub-pieces)`);
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
  appendLedger({ episode: "ep17-bossy-r", scene: id, chars: text.length, audioSeconds: durationS, audioTokens, inputTokens, usd, billed: usage != null });
  console.log(`${durationS.toFixed(3)}s, ${won(usd * PRICING.krwPerUsd)}`);
  return pcm;
}

// Persisted after every successful piece (not just once at the end) — a
// mid-run crash (e.g. the 429 rate limit hit while generating Frame 11) used
// to lose every result from that run, including already-paid-for pieces,
// because the only writeFileSync(resultsPath, ...) call was at the very
// bottom of the script.
function saveResults() {
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
}

// Scenes 1-9, 12-15: one call each.
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

// Frame 10 / 11 only run when explicitly requested via --only (their sub-piece
// ids), since each costs 7 calls on its own — kept out of default runs so a
// plain `node gen-tts-gemini.mjs` never silently burns the daily quota on one
// frame.
await assembleQuizFrame("10", FRAME10_PIECES);
await assembleQuizFrame("11", FRAME11_PIECES);

console.log(`\nTotal spend this run: ${won(totalUsd * PRICING.krwPerUsd)} (${totalUsd.toFixed(4)} USD)`);
writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log("Wrote .tts-results.json with real durations per scene.");
