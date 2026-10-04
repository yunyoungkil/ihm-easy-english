#!/usr/bin/env node
// Automated TTS generator for EP23 (Double Consonants, Listening Drill)
// Uses Gemini 3.8 Flash Speech API with Channel Signature Voices:
// - Korean Host: Charon (Warm & Sophisticated Podcast Host tone)
// - English Native: Puck (Standard American, crisp & steady downward pitch)
//
// Usage:
//   node scripts/gen-tts-gemini.mjs                 # Generate all pieces
//   node scripts/gen-tts-gemini.mjs --dry-run       # Check estimate & pieces without calling API
//   node scripts/gen-tts-gemini.mjs --type=narration # Generate only Korean host narration (12 files)
//   node scripts/gen-tts-gemini.mjs --type=english   # Generate only English native words/sentences
//   node scripts/gen-tts-gemini.mjs --only=01_f01_hook,en_coffee

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOICE,
  AUDIO_FORMAT,
  loadApiKey,
  pcmToWav,
  sampleRateFromMime,
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
const typeArg = args.find((a) => a.startsWith("--type="));
const typeFilter = typeArg ? typeArg.split("=")[1] : null;

// [A] Korean Host Narration (12 pieces)
const KOREAN_DIRECTIVE =
  "Say only the narration after the colon in a warm, sophisticated, and captivating podcast host tone, speaking naturally with nuanced cadence and engaging rhythm:";

const NARRATION_LINES = [
  {
    id: "01_f01_hook",
    type: "narration",
    text: "coffee나 hello처럼 같은 자음이 두 개씩 적힌 단어들, 소리도 두 번 내야 할까요? 아닙니다. 철자가 몇 개든 원어민은 딱 한 번만 소리 냅니다. 오늘 영상은 이 규칙을 귀에 완전히 새겨 넣는 30분 반복 듣기 영상입니다. 틀어두고 편안하게 귀로 익혀보세요.",
  },
  {
    id: "02_f02_principle",
    type: "narration",
    text: "자음은 입술이나 혀가 공기를 한 번 막았다가 여는 소리입니다. 같은 자음이 두 개 적혀 있어도, 입이 두 번 움직일 필요 없이 한 번만 툭 소리 내면 끝납니다. 그럼 두 번째 자음은 왜 적었을까요? 바로 앞 모음을 짧게 읽으라는 신호입니다. hoping과 hopping. 철자 p가 하나 더 붙으면서 앞 모음 소리가 어떻게 달라지는지, 소리로 직접 비교해 보세요.",
  },
  {
    id: "03_f03_intro_ff",
    type: "narration",
    text: "먼저 f가 두 개 들어간 단어들입니다. 아랫입술을 두 번 물 필요 없이, 바람을 한 번만 빼주세요.",
  },
  {
    id: "04_f04_intro_ll",
    type: "narration",
    text: "다음은 l이 두 개 겹친 단어들입니다. 혀끝을 딱 한 번만 위 앞니 뒤에 대고 소리 냅니다.",
  },
  {
    id: "05_f05_intro_ss",
    type: "narration",
    text: "이번엔 s가 두 개인 단어들입니다. 소리를 길게 끌지 않고, 한 번에 시원하게 뱉어냅니다.",
  },
  {
    id: "06_f06_intro_pp",
    type: "narration",
    text: "p가 나란히 적힌 단어들입니다. 입술을 두 번 터뜨리지 말고 가볍게 한 번만 닫았다 엽니다.",
  },
  {
    id: "07_f07_exception_boundary",
    type: "narration",
    text: "그런데 자음 소리가 살짝 길어지는 예외가 있습니다. un과 named처럼 원래 따로 있던 두 단어가 합쳐질 때입니다. 앞 단어의 끝소리와 뒷단어의 첫소리가 그대로 맞물리면서 소리가 길게 이어집니다. unnamed, 그리고 midday. 차이를 귀로 느껴보세요.",
  },
  {
    id: "08_f08_exception_flap_tt",
    type: "narration",
    text: "두 번째 예외는 t가 두 개 겹치는 단어들입니다. 모음 사이에 tt가 오면, 미국 영어에서는 '트'가 아니라 부드러운 'ㄹ' 소리로 바뀝니다. letter, butter. 혀가 편안하게 굴러가는 소리를 들어보세요.",
  },
  {
    id: "09_f09_intro_scene",
    type: "narration",
    text: "이번엔 실제 카페 대화입니다. 배운 단어들이 문장 속에서 어떻게 자연스럽게 흘러가는지 들어보세요.",
  },
  {
    id: "10_f10_intro_shuffle",
    type: "narration",
    text: "이제 지금까지 익힌 단어들을 무작위로 섞어서 들려드립니다. 자음이 두 개라도 한 번에 소리 나는지 귀로 확인해 보세요.",
  },
  {
    id: "11_f11_summary",
    type: "narration",
    text: "오늘 함께 연습한 소리들을 정리해 보겠습니다. 영어에서 나란히 겹친 자음은 대부분 딱 한 번만 소리 납니다. 단어가 합쳐지는 경우와 모음 사이의 tt만 기억해 두시면 됩니다. 오늘 들었던 단어 중 가장 의외였던 발음은 무엇이었나요? 댓글로 편하게 남겨주세요.",
  },
  {
    id: "12_f12_intro_encore",
    type: "narration",
    text: "마지막으로 처음부터 끝까지 한 번 더 반복합니다. 틀어두고 편안하게 귀에 익혀보세요.",
  },
];

// [B] English Native Pronunciation (Words & Sentences)
const ENGLISH_WORD_DIRECTIVE =
  "Pronounce clearly with crystal-clear standard American diction and a steady, crisp downward pitch:";

const ENGLISH_SENTENCE_DIRECTIVE =
  "Pronounce naturally with crystal-clear standard American diction and relaxed, steady intonation:";

const ENGLISH_WORDS_RAW = [
  // F1
  { word: "coffee", voice: "Puck" },
  // F2
  { word: "hoping", voice: "Puck" },
  { word: "hopping", voice: "Kore" },
  // F3 (ff)
  { word: "offer", voice: "Puck" },
  { word: "office", voice: "Kore" },
  { word: "different", voice: "Puck" },
  { word: "effort", voice: "Kore" },
  { word: "staff", voice: "Puck" },
  // F4 (ll)
  { word: "hello", voice: "Kore" },
  { word: "yellow", voice: "Puck" },
  { word: "call", voice: "Kore" },
  { word: "really", voice: "Puck" },
  { word: "tall", voice: "Kore" },
  { word: "all", voice: "Puck" },
  // F5 (ss)
  { word: "class", voice: "Puck" },
  { word: "dress", voice: "Kore" },
  { word: "glass", voice: "Puck" },
  { word: "press", voice: "Kore" },
  { word: "lesson", voice: "Puck" },
  { word: "miss", voice: "Kore" },
  // F6 (pp)
  { word: "happy", voice: "Kore" },
  { word: "apple", voice: "Puck" },
  { word: "happen", voice: "Kore" },
  { word: "supply", voice: "Puck" },
  // F7 (boundary)
  { word: "unnamed", voice: "Puck" },
  { word: "midday", voice: "Kore" },
  // F8 (flap tt)
  { word: "letter", voice: "Puck" },
  { word: "butter", voice: "Kore" },
  { word: "better", voice: "Puck" },
  { word: "little", voice: "Kore" },
];

const ENGLISH_WORDS = ENGLISH_WORDS_RAW.map(({ word, voice }) => ({
  id: `en_${word}`,
  type: "english_word",
  voice,
  text: word.charAt(0).toUpperCase() + word.slice(1) + ".",
}));

const ENGLISH_SENTENCES = [
  { id: "en_s01_two_coffees", text: "Two coffees, please.", voice: "Kore" },
  { id: "en_s02_hows_it_going", text: "Hello, how's it going?", voice: "Kore" },
  { id: "en_s03_class_at_ten", text: "I have class at ten.", voice: "Puck" },
  { id: "en_s04_happy_birthday", text: "Happy birthday!", voice: "Kore" },
  { id: "en_s05_want_coffee", text: "Do you want a coffee?", voice: "Kore" },
  { id: "en_s06_office_close", text: "The office is close to the cafe.", voice: "Puck" },
  { id: "en_s07_coffee_after_class", text: "Let's get coffee after class.", voice: "Puck" },
].map((s) => ({
  ...s,
  type: "english_sentence",
}));

// Combine all pieces
const ALL_PIECES = [...NARRATION_LINES, ...ENGLISH_WORDS, ...ENGLISH_SENTENCES];

// Filter pieces
let pieces = ALL_PIECES;
if (typeFilter) {
  if (typeFilter === "narration") {
    pieces = pieces.filter((p) => p.type === "narration");
  } else if (typeFilter === "english") {
    pieces = pieces.filter((p) => p.type.startsWith("english"));
  }
}
if (only) {
  pieces = pieces.filter((p) => only.includes(p.id));
}

console.log("=== EP23 Gemini 3.8 Flash TTS Generator ===");
console.log(`Target pieces to generate: ${pieces.length}`);
console.log(`- Korean Host Narration: ${pieces.filter((p) => p.type === "narration").length}`);
console.log(`- English Native Words: ${pieces.filter((p) => p.type === "english_word").length}`);
console.log(`- English Native Sentences: ${pieces.filter((p) => p.type === "english_sentence").length}`);

const totalChars = pieces.reduce((sum, p) => sum + p.text.length, 0);
const estimatedSeconds = Math.ceil(totalChars * 0.18);
const estimatedTokens = estimatedSeconds * PRICING.audioTokensPerSecond;
const estimatedUsd = (estimatedTokens / 1_000_000) * PRICING.usdPerMillionOutputTokens;
console.log(`Estimated Audio Duration: ~${estimatedSeconds}s`);
console.log(`Estimated Cost: ~$${estimatedUsd.toFixed(3)} (${won(estimatedUsd * PRICING.krwPerUsd)})`);

if (dryRun) {
  console.log("\n[--dry-run mode] No API calls made. Exiting.");
  process.exit(0);
}

const { key: apiKey } = loadApiKey();
const resultsPath = join(PROJECT_DIR, ".tts-results.json");
const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {};

async function synthesizePiece(piece, tries = 3) {
  const isKorean = piece.type === "narration";
  const languageCode = isKorean ? "ko-KR" : "en-US";
  const voiceName = piece.voice || (isKorean ? "Charon" : "Puck");
  const prefix = isKorean
    ? KOREAN_DIRECTIVE
    : piece.type === "english_word"
      ? ENGLISH_WORD_DIRECTIVE
      : ENGLISH_SENTENCE_DIRECTIVE;
  const prompt = `${prefix}\n\n${piece.text}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${VOICE.model}:generateContent`;

  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              languageCode,
              voiceConfig: { prebuiltVoiceConfig: { voiceName } },
            },
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status} ${response.statusText}: ${body.slice(0, 300)}`);
      }

      const json = await response.json();
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) {
        throw new Error(`No audio data in response: ${JSON.stringify(json).slice(0, 300)}`);
      }

      return {
        pcm: Buffer.from(part.inlineData.data, "base64"),
        mimeType: part.inlineData.mimeType,
        usage: json.usageMetadata,
      };
    } catch (e) {
      lastErr = e;
      if (i < tries - 1) {
        console.log(`  [Retry ${i + 1}/${tries - 1}] ${e.message}`);
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
    }
  }
  throw lastErr;
}

function pcmDurationSeconds(pcmLength) {
  return pcmLength / (AUDIO_FORMAT.sampleRate * (AUDIO_FORMAT.bitsPerSample / 8) * AUDIO_FORMAT.channels);
}

let completedCount = 0;
let totalBilledUsd = 0;

console.log("\nStarting automated generation...\n");

for (const piece of pieces) {
  const outPath = join(VOICE_DIR, `${piece.id}.wav`);
  process.stdout.write(`[${completedCount + 1}/${pieces.length}] Generating ${piece.id}.wav ... `);

  try {
    const synth = await synthesizePiece(piece);
    const wav = pcmToWav(synth.pcm, AUDIO_FORMAT);
    writeFileSync(outPath, wav);

    const dur = pcmDurationSeconds(synth.pcm.length);
    results[piece.id] = {
      path: `assets/voice/${piece.id}.wav`,
      duration_s: Math.round(dur * 100) / 100,
    };

    const outTokens = synth.usage?.candidatesTokenCount ?? Math.ceil(dur * PRICING.audioTokensPerSecond);
    const inTokens = synth.usage?.promptTokenCount ?? piece.text.length;
    const costUsd =
      (inTokens / 1_000_000) * PRICING.usdPerMillionInputTokens +
      (outTokens / 1_000_000) * PRICING.usdPerMillionOutputTokens;
    totalBilledUsd += costUsd;

    console.log(`DONE (${dur.toFixed(2)}s, ~$${costUsd.toFixed(4)})`);
    completedCount++;

    // Small delay between calls to stay well within Gemini quota
    await new Promise((r) => setTimeout(r, 400));
  } catch (err) {
    console.log(`FAILED!`);
    console.error(`  Error: ${err.message}`);
  }
}

writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");

console.log("\n==========================================");
console.log(`Completed: ${completedCount}/${pieces.length} audio files saved to assets/voice/`);
console.log(`Total spend estimate: ~$${totalBilledUsd.toFixed(3)} (${won(totalBilledUsd * PRICING.krwPerUsd)})`);
console.log(`Saved duration metadata to .tts-results.json`);
console.log("==========================================");
