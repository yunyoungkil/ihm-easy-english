#!/usr/bin/env node
// Generate all 12 EP14 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) — same approach as EP11/EP12/EP13
// (videos/ep13-tongue-shortcut/scripts/gen-tts-gemini.mjs).
//
// Frame 9 (listening) is NOT a single call: the 4 English example sentences
// are sent as pure English text (separate calls) so they come out as real
// English pronunciation instead of a Korean voice reading English words, then
// all 9 pieces (Korean carrier text + 4 English sentences, interleaved) are
// concatenated at the raw-PCM level with short silence gaps — same procedure
// SCRIPT.md cites from EP11 Line 10 / EP12 Line 7 / EP13 Line 9.
//
// ⚠️ Free tier is 10 requests/day/model — past that, calls are billed with no
// local hard stop (synthesize() has no spend gate). This project has 20 total
// pieces (11 single-scene calls + 9 Frame-9 sub-pieces), so it is deliberately
// generated across 2 free-tier days via --only=<id>,<id>,... rather than run
// in one shot. Check .tts-usage.json for today's date before running more.
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
  estimateCost,
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

// 12 scenes (SCRIPT.md, 2026-09-07 approved). Frame 9 is represented as 9
// sub-pieces to be concatenated after generation (see FRAME9_PIECES below).
const LINES = [
  { id: "01", text: `단어는 분명 다 아는 건데, 원어민이 문장으로 말하면 하나도 안 들리신 적 있으시죠? 분명 하나하나 뜯어보면 다 아는 단어인데, 막상 영화나 유튜브에서 들으면 완전히 다른 소리처럼 들려서 당황하신 적, 다들 있으실 거예요. 이거, 여러분 리스닝 실력이 부족해서가 아닙니다. 원어민이 진짜로 무슨 소리를 내고 있는지, 그 원리를 아직 안 배우셨을 뿐이에요.` },
  { id: "02", text: `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 원어민 말이 왜 한 덩어리로 들리는지, 그 진짜 원리를 함께 봅니다.` },
  { id: "03", text: `그런데 궁금하지 않으세요? 왜 유독 원어민이 말할 때는 단어와 단어 사이가 딱딱 끊어지지 않고 뭉쳐서 들릴까요? 교과서에서 배운 발음이랑, 실제로 듣는 소리가 왜 이렇게 다를까요? 혹시 원어민들이 그냥 발음을 대충 하는 걸까요?` },
  { id: "04", text: `결론부터 말씀드릴게요. 대충 하는 게 아닙니다. 오히려 정반대예요. 원어민들은 혀를 최대한 편하게, 힘을 빼고 움직이려다 보니까, 자연스럽게 소리와 소리가 이어 붙는 겁니다. 그러니까 교과서처럼 한 글자씩 또박또박 끊어 말하는 게 오히려 더 힘이 드는 방식인 거예요. 저도 공부하기 전엔 이걸 몰라서 무슨 말을 하는지 하나도 몰랐는데, 알고 보니까 그냥 힘 안 들이고 편하게 말하다 보니 그렇게 되는 거였어요.` },
  { id: "05", text: `원리는 이렇습니다. 앞 단어가 자음으로 끝나고 뒤 단어가 모음으로 시작하면, 혀가 그 자음 소리를 굳이 앞 단어에 남겨두지 않고 뒤 단어 쪽으로 슬쩍 넘겨서 붙여버려요. 예를 들어 AN APPLE, 볼게요. AN은 N으로 끝나고, APPLE은 A라는 모음으로 시작하죠. 이걸 따로따로 말하면 '앤, 애플'이 되는데, 혀에 힘을 빼고 자연스럽게 이어 붙이면 그 N이 APPLE 앞으로 넘어가서 '어 내플'처럼 들리게 됩니다. 억지로 붙이는 게 아니라, 힘을 빼면 저절로 이렇게 되는 거예요.` },
  { id: "06", text: `그럼 이게 문장 전체에서도 통하는지 볼까요? "Where were we?" 이 짧은 문장, 한번 들어보세요. 하나하나 또박또박 끊어 말하면 '웨어, 워, 위'인데, 원어민이 자연스럽게 말하면 '웨어루이'처럼 들려요. WERE는 문장에서 그렇게 중요한 단어가 아니라서, 힘이 빠지면서 소리가 확 줄어들어요. 그러다 보니 WHERE의 R이랑 WE 사이에서 뭉개지듯 이어지면서 '루'처럼 들리는 거죠. 아까 AN APPLE 때랑 방식은 조금 다르지만, 힘을 빼면 소리가 자연스럽게 붙는다는 원리는 여기서도 똑같이 통하는 거예요.` },
  { id: "07", text: `그럼 예외는 없을까요? 방금 건 소리가 그냥 옆으로 넘어가서 붙는 거였잖아요. 근데 MADE IT처럼 T나 D가 낄 때는 조금 다르게 움직여요. 한번 들어보세요. MADE IT, 이걸 원어민이 편하게 말하면 '메이릿'처럼 들립니다. MADE 끝소리 D가 바로 뒤 IT의 모음과 앞 모음 사이에 끼면, 혀가 그 D 소리를 정확하게 내는 대신, 혀끝으로 톡 튕기듯이 살짝 스치고 지나가요. 그래서 D가 우리 귀에는 마치 'ㄹ' 소리처럼 들리는 거죠. 이것도 대충 하는 게 아니라, 미국 영어에서 아주 표준적으로 쓰이는 방식이에요.` },
  { id: "08", text: `직접 맞혀보세요. TURN ON, 어떻게 이어질까요? 잠깐 생각해 보세요. N이 ON 쪽으로 넘어가서, '터논'입니다. 하나 더요. CHECK OUT은요? … K가 OUT 쪽으로 넘어가서, '체카웃'이죠. 이번엔 좀 다른 문제예요. GET IT, T가 낄 때는 어떻게 들릴까요? … 정답은 '게릿', T가 모음 사이에서 톡 튕기니까요. 마지막으로 PUT IT은요? … 정답은 '푸릿', 역시 T가 톡 튕기니까요.` },
  { id: "10", text: `자, 이제 직접해보세요. 따라하다 보면 자연스럽게 늘어 있을 거예요. TURN ON, 천천히. 터, 논 — 이어 붙이면, 터논! 다시 한 번, 좀 더 빠르게. 터논, 터논. 이번엔 CHECK OUT이에요. 체, 카웃 — 이어 붙이면, 체카웃! 다시 한 번, 좀 더 빠르게. 체카웃, 체카웃. 이번엔 예외도 같이 해볼까요? GET IT이에요. T가 모음 사이에 있으니까 톡 튕기죠. 게, 릿 — 이어 붙이면, 게릿! 다시 한 번, 좀 더 빠르게. 게릿, 게릿. 마지막으로 PUT IT. 푸, 릿 — 이어 붙이면, 푸릿! 다시 한 번, 좀 더 빠르게. 푸릿, 푸릿.` },
  { id: "11", text: `이제 영화나 유튜브를 보다가 게으른 소리가 나와도 당황하지 않으실 거예요. 예를 들어 "Where were we?"라는 문장도 이렇게 들리거든요. 바로 다 안 들려도 괜찮아요. 배운 대로 소리 하나씩 힘 빼고 들어보면, 웨어, 루, 이 — 웨어루이! 이렇게 시간이 걸리더라도 스스로 알아들을 수 있게 되실 거예요. 이제 단어 하나하나가 아니라, 문장으로 들리기 시작하실 겁니다.` },
  { id: "12", text: `오늘은 원어민이 대충 뭉개서 말하는 게 아니라, 혀에 힘을 빼고 편하게 소리를 이어 붙인다는 원리, 그리고 T나 D가 낄 때는 톡 튕기는 소리로 바뀐다는 것까지 함께 봤습니다. 이제 문장을 들을 때 예전처럼 막막하지 않으셨으면 좋겠어요. 다음에도 여러분이 자주 답답해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 편하게 듣고 계실 거예요.` },
];

// Frame 9: Korean carrier pieces + 4 pure-English example sentences, with the
// silence gap (ms) to insert AFTER each piece when concatenating.
const FRAME9_PIECES = [
  { id: "09a", text: "이제 실제 속도로 들어보세요. 첫 번째.", gapAfterMs: 300 },
  { id: "09b", text: "Please turn on the light.", gapAfterMs: 500 },
  { id: "09c", text: "두 번째.", gapAfterMs: 250 },
  { id: "09d", text: "Let's check out the menu.", gapAfterMs: 500 },
  { id: "09e", text: "세 번째.", gapAfterMs: 250 },
  { id: "09f", text: "Can you get it for me?", gapAfterMs: 500 },
  { id: "09g", text: "네 번째.", gapAfterMs: 250 },
  { id: "09h", text: "Just put it there.", gapAfterMs: 600 },
  { id: "09i", text: "오늘 배운 소리들, 실제로 들어보니 어떠셨나요? 어려우시죠?", gapAfterMs: 0 },
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

const allTextsForEstimate = [...LINES, ...FRAME9_PIECES].map((l) => l.text);
const totalCharsEstimate = allTextsForEstimate.reduce((s, t) => s + t.length, 0);
console.log(`Pieces: ${allTextsForEstimate.length} total (11 single-scene calls + 9 Frame-9 sub-pieces)`);
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
  appendLedger({ episode: "ep14-connected-speech", scene: id, chars: text.length, audioSeconds: durationS, audioTokens, inputTokens, usd, billed: usage != null });
  console.log(`${durationS.toFixed(3)}s, ${won(usd * PRICING.krwPerUsd)}`);
  return pcm;
}

// Scenes 1-8, 10-12: one call each.
for (const line of LINES) {
  if (only && !only.includes(line.id)) continue;
  const pcm = await generateOne(line.id, line.text);
  const wav = pcmToWav(pcm, AUDIO_FORMAT);
  const relPath = `assets/voice/${line.id}.wav`;
  writeFileSync(join(PROJECT_DIR, relPath), wav);
  results[line.id] = { path: relPath, duration_s: Number(pcmDurationSeconds(pcm.length).toFixed(3)) };
}

// Frame 9: generate each piece, then concatenate raw PCM with silence gaps.
// Only runs when explicitly requested via --only (its 9 sub-piece ids), since
// it costs 9 calls on its own — deliberately kept out of default runs so a
// plain `node gen-tts-gemini.mjs` never silently burns the whole daily quota
// on one frame.
const frame9Requested = only && FRAME9_PIECES.some((p) => only.includes(p.id));
if (frame9Requested) {
  console.log("Frame 9 (listening) — generating requested sub-pieces:");
  const pcmParts = [];
  let allPiecesPresent = true;
  for (const piece of FRAME9_PIECES) {
    if (only.includes(piece.id)) {
      const pcm = await generateOne(piece.id, piece.text);
      const wav = pcmToWav(pcm, AUDIO_FORMAT);
      writeFileSync(join(PROJECT_DIR, `assets/voice/${piece.id}.wav`), wav);
      results[piece.id] = { path: `assets/voice/${piece.id}.wav`, duration_s: Number(pcmDurationSeconds(pcm.length).toFixed(3)) };
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
    const idx = FRAME9_PIECES.findIndex((p) => p.id === piece.id);
    if (FRAME9_PIECES[idx].gapAfterMs > 0) pcmParts.push(silencePcm(FRAME9_PIECES[idx].gapAfterMs));
  }
  if (allPiecesPresent) {
    const combined = Buffer.concat(pcmParts);
    const wav = pcmToWav(combined, AUDIO_FORMAT);
    writeFileSync(join(PROJECT_DIR, `assets/voice/09.wav`), wav);
    results["09"] = { path: `assets/voice/09.wav`, duration_s: Number(pcmDurationSeconds(combined.length).toFixed(3)) };
    console.log(`  09 (combined): ${results["09"].duration_s}s`);
  } else {
    console.log("  (some Frame-9 sub-pieces still missing — combined 09.wav not written yet, run the rest on a later free-tier day)");
  }
}

console.log(`\nTotal spend this run: ${won(totalUsd * PRICING.krwPerUsd)} (${totalUsd.toFixed(4)} USD)`);
writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log("Wrote .tts-results.json with real durations per scene.");
