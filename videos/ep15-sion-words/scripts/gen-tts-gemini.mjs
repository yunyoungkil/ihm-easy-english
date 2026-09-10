#!/usr/bin/env node
// Generate all 12 EP15 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) — same approach as EP11/EP12/EP13/EP14
// (videos/ep14-connected-speech/scripts/gen-tts-gemini.mjs).
//
// Frame 9 (reading practice) is NOT a single call: the 4 English example
// sentences are sent as pure English text (separate calls) so they come out
// as real English pronunciation instead of a Korean voice reading English
// words, then all 9 pieces (Korean carrier text + 4 English sentences,
// interleaved) are concatenated at the raw-PCM level with short silence gaps
// — same procedure SCRIPT.md cites from EP11 Line 10 / EP12 Line 7 / EP13
// Line 9 / EP14 Line 9.
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

// 12 scenes (SCRIPT.md, 2026-09-10 finalized after comment rounds + "-sion"
// bare-suffix TTS fix — see SCRIPT.md header "SION 단독 처리 완료"). Frame 9
// is represented as 9 sub-pieces to be concatenated after generation (see
// FRAME9_PIECES below).
const LINES = [
  { id: "01", text: `DECISION, TELEVISION, EXPANSION… 이렇게 좀 긴 영단어 보면, 나도 모르게 눈부터 피하신 적 있으시죠? 뜻은 대충 아는 단어인데, 막상 소리 내서 읽으려고 하면, 대충 이렇게 읽었는데 이게 진짜 맞게 읽은 건지 확신이 안 서는 경우 많으실 거예요. 이게 여러분이 영어를 못해서가 아닙니다. 그 단어 끝에 숨어 있는 소리 패턴을, 아직 모르셨을 뿐이에요. 오늘 그 패턴 하나만 알려드릴게요. 그럼 처음 보는 긴 단어도, 이제 망설임 없이 바로 읽으실 수 있게 되실 거예요.` },
  { id: "02", text: `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 긴 단어 끝에 자주 붙는 '션', 그 소리 규칙 하나로 여러분이 왜 그렇게 많은 단어를 읽기 어려워했는지 짚어드리겠습니다.` },
  { id: "03", text: `근데 궁금하지 않으세요? DECISION, TELEVISION, EXPANSION… 이렇게 끝 철자는 완전히 똑같은데, 왜 발음은 다 다르게 날까요? 혹시 이것도 하나하나 발음 기호를 외워야 아는 걸까요? 아니면 단어를 통째로 외워야 하는 걸까요?` },
  { id: "04", text: `결론부터 말씀드릴게요. 발음 기호, 하나도 안 외우셔도 됩니다. 션으로 끝나는 단어는요, 사실 규칙이 딱 하나예요. 이 끝소리 바로 앞 글자 하나만 보면, 그 단어를 어떻게 읽어야 할지 저절로 알 수 있습니다. 저도 예전엔 이런 단어들을 볼 때마다 하나씩 따로 외웠었는데, 알고 보니까 그럴 필요가 전혀 없었더라고요.` },
  { id: "05", text: `원리는 이렇습니다. 션 바로 앞 글자가 모음이거나, 또는 R이면, 목이 울리듯 부드럽게 '전' 소리가 나고요. 그 밖의 자음이면, 바람 빠지듯 가볍게 '션' 소리가 납니다. 사실 여러분은 이 소리, 이미 알고 계세요. TELEVISION, 우리가 '텔레비전'이라고 하잖아요. VISION 앞 글자가 모음 I죠? 그래서 '전'으로 울리는 거예요. 근데 EXPANSION은 다릅니다. 앞에 자음 N이 오니까, '익스팬션'처럼 바람 빠지는 '션' 소리가 나는 거죠.` },
  { id: "06", text: `이 규칙, 다른 단어에도 그대로 통합니다. 볼까요? DECISION은 CI 다음이 모음 I니까 '디시전'. EXPLOSION도 O 다음이니까 '익스플로전'. OCCASION도 A 다음이라 '오케이전'이고요. R 뒤에 오는 단어도 똑같이 '전'이에요. VERSION, 우리가 이미 '버전'이라고 하시죠? CONVERSION도 마찬가지로 '컨버전'입니다. 반대로 그 밖의 자음 뒤에 오는 단어들도 봅시다. TENSION은 N 다음이라 '텐션'. MANSION도 N 다음이라 '맨션'. EXTENSION도 마찬가지로 '익스텐션'이죠. 이렇게 앞 글자 하나만 확인하면, 처음 보는 단어도 바로 읽을 수 있는 거예요.` },
  { id: "07", text: `그럼 예외는 없을까요? 딱 한 가지만 조심하면 됩니다. S가 두 번 겹치는 단어예요. MISSION, PASSION, DISCUSSION처럼 SSION으로 끝나면, 앞 글자를 확인할 필요도 없이 무조건 '션'입니다. 이 경우만큼은 앞 글자를 보지 않고, S가 두 개 겹치는 순간 바로 '션'이라고 기억해 두시면 됩니다.` },
  // NOTE: the target English word (CONFUSION/DIMENSION/EXPRESSION) is deliberately
  // absent here — it's already visible on screen, and saying it aloud in the
  // reveal clause would be redundant (2026-09-10, trimmed out of the actually-
  // generated audio via scripts/trim-word.mjs; this text reflects the final
  // intended result so a from-scratch regeneration matches it directly).
  { id: "08", text: `그럼 직접 맞혀보세요. 첫 번째 단어, 어떻게 읽을까요? 잠깐 생각해 보세요. S 앞이 모음 U니까, '컨퓨전'입니다. 두 번째 단어는요? N 다음이니까, '디멘션'이죠. 마지막 문제, 이번엔 좀 다를 수 있어요. 세 번째 단어는요? 정답은, '익스프레션'입니다. S가 두 번 겹치는 예외였죠.` },
  { id: "10", text: `자, 이제 직접 소리 내서 읽어보세요. 따라 읽다 보면 저절로 자신감이 붙으실 거예요. TELEVISION, 천천히. 텔, 레, 비, 전 — 이어서, 텔레비전! 다시 한 번, 좀 더 빠르게. 텔레비전, 텔레비전. 이번엔 EXPANSION이에요. 익스, 팬, 션 — 이어서, 익스팬션! 다시 한 번, 좀 더 빠르게. 익스팬션, 익스팬션. 마지막으로 R로 끝나는 경우도 같이 볼까요. CONVERSION이에요. 컨, 버, 전 — 이어서, 컨버전! 다시 한 번, 좀 더 빠르게. 컨버전, 컨버전.` },
  // NOTE: same reasoning as Frame 8 — SUPERVISION/DIVISION/PENSION are shown on
  // screen already, so the reveal clause states only the Korean reading.
  { id: "11", text: `이제 정말 이 규칙 하나로, 처음 보는 단어도 바로 읽으실 수 있어요. 예를 들어 이 단어, 오늘 처음 보셨죠? 그래도 한번 볼까요. I 다음이니까, 모음이죠. 그럼 정답은, '수퍼비전'입니다. 하나 더 볼까요. 이것도 모음 뒤니까, '디비전'이에요. 하나만 더요. 이번엔 N 뒤니까, '펜션'이죠. 어떠세요, 낯선 단어들인데도 계속 바로 읽히시죠? 이게 바로 끝소리 하나로 단어 백 개가 저절로 읽히는 이유예요.` },
  { id: "12", text: `오늘은 션으로 끝나는 단어, 바로 앞 글자가 모음이거나 R이면 전, 그 밖의 자음이면 션으로 정해진다는 원리, 그리고 S가 두 번 겹치면 무조건 션이 되는 예외까지 함께 봤습니다. 이제 뒤에 션이 붙은 패턴의 낯선 긴 단어를 봐도, 예전처럼 눈부터 피하지 않고 망설임 없이 바로 읽으실 수 있을 거예요. 다음에도 여러분이 자주 막막해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 자신 있게 읽고 계실 거예요.` },
];

// Frame 9: Korean carrier pieces + 4 pure-English example sentences, with the
// silence gap (ms) to insert AFTER each piece when concatenating.
const FRAME9_PIECES = [
  { id: "09a", text: "이제 진짜 문장 속에서 확인해 볼까요? 첫 번째.", gapAfterMs: 300 },
  { id: "09b", text: "I need to make a big decision.", gapAfterMs: 500 },
  { id: "09c", text: "두 번째.", gapAfterMs: 250 },
  { id: "09d", text: "There was a huge explosion in the news.", gapAfterMs: 500 },
  { id: "09e", text: "세 번째.", gapAfterMs: 250 },
  { id: "09f", text: "Can I get an extension on this?", gapAfterMs: 500 },
  { id: "09g", text: "네 번째.", gapAfterMs: 250 },
  { id: "09h", text: "He gave a great first impression.", gapAfterMs: 600 },
  { id: "09i", text: "어떠세요? 이제 낯선 단어가 나와도, 끝소리만 보면 자신 있게 읽으실 수 있을 거예요.", gapAfterMs: 0 },
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
  appendLedger({ episode: "ep15-sion-words", scene: id, chars: text.length, audioSeconds: durationS, audioTokens, inputTokens, usd, billed: usage != null });
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
