#!/usr/bin/env node
// Generate all 12 EP16 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) — same approach as EP11~15
// (videos/ep15-sion-words/scripts/gen-tts-gemini.mjs).
//
// Frame 9 (reading practice) is NOT a single call: the 4 English example
// sentences are sent as pure English text (separate calls) so they come out
// as real English pronunciation instead of a Korean voice reading English
// words, then all 9 pieces (Korean carrier text + 4 English sentences,
// interleaved) are concatenated at the raw-PCM level with short silence gaps
// — same procedure SCRIPT.md cites from EP11~15.
//
// ⚠️ Free tier is 10 requests/day/model — past that, calls are billed with no
// local hard stop (synthesize() has no spend gate). This project has 20 total
// pieces (11 single-scene calls + 9 Frame-9 sub-pieces). Check .tts-usage.json
// for today's date/call count before running more than the free allowance.
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

// 12 scenes (SCRIPT.md, 2026-09-16 finalized after scene-by-scene comment
// rounds). Frame 9 is represented as 9 sub-pieces to be concatenated after
// generation (see FRAME9_PIECES below).
const LINES = [
  { id: "01", text: `BOAT, RAIN, MEAT... 저도 이런 쉬운 단어 앞에서 순간 멈칫했던 적이 있어요. 모음이 두 개 나란히 붙어 있으면, 이걸 다 읽어야 하는 건지, 하나만 읽어야 하는 건지, 그런 기준이 있는지조차 몰랐거든요. 오늘 그 기준 하나만 알면, 이런 단어들 더 이상 멈추지 않고 바로 읽으실 수 있어요.` },
  { id: "02", text: `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 모음 두 개가 나란히 붙어 있을 때, 어느 쪽을 읽고 어느 쪽은 넘기는지, 그 기준 하나를 짚어드리겠습니다.` },
  { id: "03", text: `BOAT, 이 단어를 보면 모음이 O랑 A, 이렇게 두 개가 붙어 있습니다. 이 둘 중에 어떤 걸 소리를 내야 할까요? O만 내야 할까요, 아님 A만 내야 할까요, 그것도 아니면 둘 다 내야 할까요?` },
  { id: "04", text: `결론부터 말씀드릴게요. 모음 두 개가 나란히 있으면, 둘 다 읽는 게 아니라 앞에 있는 모음 이름만 소리 내고, 뒤에 있는 모음은 그냥 무음으로 소리를 내지 않습니다. BOAT는 O 이름 그대로 '오'라고만 읽고, A는 소리를 안 내는 거예요. 저도 공부하기 전엔 모음 2개를 다 읽는 줄 알았습니다. 그러다 막상 실제 발음을 들어보면 제가 생각했던 거랑 다르니까, '아... 왜 이렇지' 하고 그냥 넘기기만 했죠. 근데 공부를 하다 보니, 앞 글자 하나만 신경 쓰면 된다는 걸 알게 됐어요.` },
  { id: "05", text: `원리는 간단해요. 모음 두 개가 붙으면, 혀 입장에서는 두 개를 다 다른 소리로 내는 것보다 앞 모음은 자기 이름 그대로 시원하게 말하고, 뒤에 있는 모음은 그냥 쉬는 게 훨씬 편하거든요. 그래서 뒤 모음은 소리를 안 내는 거예요. COAT도 마찬가지예요. O랑 A가 붙어 있는데, O는 자기 이름 그대로 '오'라고 소리 내고, A는 조용히 쉬어요. 그래서 '코트'라고 읽는 거죠 — 사실 여러분 이미 이 단어, 알고 계셨잖아요.` },
  { id: "06", text: `우리가 이미 자주 쓰고 있는 단어로 이 규칙이 어떻게 통하는지 한 번 볼까요. 아까 봤던 RAIN, A 이름 그대로 '레인'이고요. MEAT도 E 이름 그대로 '미트'예요. PAINT도 마찬가지로 '페인트', TOAST도 '토스트'죠 — 그리고 다른 단어들도 한 번 더 보시죠. TEAM도 E 이름 그대로 '팀'이고, PIE도 I 이름 그대로 '파이'예요. 이렇게 앞 모음 이름만 기억하면, 이 규칙을 사용해 새 단어를 봐도 망설이지 않고 바로 읽으실 수 있을 거예요.` },
  { id: "07", text: `딱 하나만 알아두실 게 있습니다. 오늘 배운 규칙, 대부분 잘 통하는데 EA만큼은 가끔 다르게 읽힐 때가 있어요. HEAD는 E랑 A가 붙어 있지만 '히드'가 아니라 '헤드'라고 읽고, BREAD도 '브레드', DEAD도 '데드'예요. 이런 단어는 그때그때 소리 내면서 익숙해지는 수밖에 없어요 — 오늘 배운 규칙이 대부분의 단어를 뚫어주는 시작점이지, 예외 없는 절대 규칙은 아니라는 것만 기억해두시면 됩니다.` },
  // NOTE: the target English word (SEAT/GOAL/SWEAT) is deliberately absent
  // here — it's already visible on screen, and saying it aloud in the
  // question clause would leak the answer via TTS pronunciation itself
  // (VIDEO_WORKFLOW.md 3단계, EP15 Frame 8 교훈).
  { id: "08", text: `그럼 직접 맞혀보세요. 첫 번째 단어, 어떻게 읽을까요? 잠깐 생각해 보세요. 앞 모음 이름 그대로, '시트'입니다. 두 번째 단어는요? 이것도 앞 모음 이름 그대로, '골'이죠. 마지막 문제, 이번엔 좀 다를 수 있어요. 세 번째 단어는요? 정답은, '스웻'입니다. EA인데, 아까 배운 예외였죠.` },
  { id: "10", text: `자, 이제 직접 소리 내서 읽어보세요. 따라 읽다 보면 저절로 자신감이 붙으실 거예요. BOAT, 천천히. 보, 트 — 이어서, 보트! 다시 한 번, 좀 더 빠르게. 보트, 보트. 이번엔 MEAT예요. 미, 트 — 이어서, 미트! 다시 한 번, 좀 더 빠르게. 미트, 미트. 마지막으로 예외였던 단어도 같이 볼까요. HEAD예요. 헤, 드 — 이어서, 헤드! 다시 한 번, 좀 더 빠르게. 헤드, 헤드.` },
  // NOTE: same reasoning as Frame 8 — GRAIN/FOAM/REACH are shown on screen
  // already, so the reveal clause states only the Korean reading.
  { id: "11", text: `이제 정말 이 규칙 하나로, 처음 보는 단어도 바로 읽으실 수 있어요. 예를 들어 이 단어, 오늘 처음 보셨죠? 그래도 한번 볼까요. 앞 모음 이름 그대로, 정답은 '그레인'입니다. 하나 더 볼까요. 이것도 앞 모음 이름 그대로, '포움'이에요. 하나만 더요. 이번에도 똑같이, '리치'죠. 어떠세요, 낯선 단어들인데도 계속 바로 읽히시죠? 여태 이걸 다 읽어야 하는지, 하나만 읽어야 하는지, 그런 기준이 있는지조차 몰랐던 게, 사실 이 기준 하나만 알면 끝나는 일이었던 거예요.` },
  { id: "12", text: `오늘은 모음 두 개가 나란히 붙으면, 앞 모음은 이름 그대로 소리 내고 뒤 모음은 무음이 된다는 원리, 그리고 EA는 가끔 다르게 읽히는 예외까지 함께 봤습니다. 이제 모음 두 개가 붙은 낯선 단어를 봐도, 예전처럼 멈칫하지 않고 망설임 없이 바로 읽으실 수 있을 거예요. 다음에도 여러분이 자주 막막해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 자신 있게 읽고 계실 거예요.` },
];

// Frame 9: Korean carrier pieces + 4 pure-English example sentences, with the
// silence gap (ms) to insert AFTER each piece when concatenating.
const FRAME9_PIECES = [
  { id: "09a", text: "이제 진짜 문장 속에서 확인해 볼까요? 첫 번째.", gapAfterMs: 300 },
  { id: "09b", text: "I need a new coat for winter.", gapAfterMs: 500 },
  { id: "09c", text: "두 번째.", gapAfterMs: 250 },
  { id: "09d", text: "It might rain tomorrow.", gapAfterMs: 500 },
  { id: "09e", text: "세 번째.", gapAfterMs: 250 },
  { id: "09f", text: "We had a team meeting today.", gapAfterMs: 500 },
  { id: "09g", text: "네 번째.", gapAfterMs: 250 },
  { id: "09h", text: "My head hurts a little.", gapAfterMs: 600 },
  { id: "09i", text: "어떠세요? 이제 낯선 단어가 나와도, 앞 모음 이름만 떠올리면 자신 있게 읽으실 수 있을 거예요.", gapAfterMs: 0 },
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
  appendLedger({ episode: "ep16-double-vowels", scene: id, chars: text.length, audioSeconds: durationS, audioTokens, inputTokens, usd, billed: usage != null });
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
  console.log("Frame 9 (reading practice) — generating requested sub-pieces:");
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
