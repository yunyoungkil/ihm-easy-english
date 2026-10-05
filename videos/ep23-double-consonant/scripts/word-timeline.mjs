#!/usr/bin/env node
// Whisper Word-Level Timestamp Extraction for EP23
// Uses whisper.cpp via @remotion/install-whisper-cpp and LCS character-level alignment
// Generates assets/voice/<id>.words.json for all Korean narration files and English sentences.
//
// Usage:
//   node videos/ep23-double-consonant/scripts/word-timeline.mjs [--only=01_f01_hook]

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transcribe } from "@remotion/install-whisper-cpp";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const REPO_ROOT = join(PROJECT_DIR, "..", "..");
const whisperDir = join(REPO_ROOT, ".whisper");
const WHISPER_VERSION = "1.5.5";
const MODEL = "small";
const scratchDir = join(PROJECT_DIR, ".whisper-scratch");
mkdirSync(scratchDir, { recursive: true });

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",") : null;

// [A] Korean Host Narration Texts
const KOREAN_NARRATION = {
  "01_f01_hook":
    "coffee나 hello처럼 같은 자음이 두 개씩 적힌 단어들, 소리도 두 번 내야 할까요? 아닙니다. 철자가 몇 개든 원어민은 딱 한 번만 소리 냅니다. 오늘 영상은 이 규칙을 귀에 완전히 새겨 넣는 30분 반복 듣기 영상입니다. 틀어두고 편안하게 귀로 익혀보세요.",
  "02_f02_principle":
    "자음은 입술이나 혀가 공기를 한 번 막았다가 여는 소리입니다. 같은 자음이 두 개 적혀 있어도, 입이 두 번 움직일 필요 없이 한 번만 툭 소리 내면 끝납니다. 그럼 두 번째 자음은 왜 적었을까요? 바로 앞 모음을 짧게 읽으라는 신호입니다. hoping과 hopping. 철자 p가 하나 더 붙으면서 앞 모음 소리가 어떻게 달라지는지, 소리로 직접 비교해 보세요.",
  "03_f03_intro_ff":
    "먼저 f가 두 개 들어간 단어들입니다. 아랫입술을 두 번 물 필요 없이, 바람을 한 번만 빼주세요.",
  "04_f04_intro_ll":
    "다음은 l이 두 개 겹친 단어들입니다. 혀끝을 딱 한 번만 위 앞니 뒤에 대고 소리 냅니다.",
  "05_f05_intro_ss":
    "이번엔 s가 두 개인 단어들입니다. 소리를 길게 끌지 않고, 한 번에 시원하게 뱉어냅니다.",
  "06_f06_intro_pp":
    "p가 나란히 적힌 단어들입니다. 입술을 두 번 터뜨리지 말고 가볍게 한 번만 닫았다 엽니다.",
  "07_f07_exception_boundary":
    "그런데 자음 소리가 살짝 길어지는 예외가 있습니다. un과 named처럼 원래 따로 있던 두 단어가 합쳐질 때입니다. 앞 단어의 끝소리와 뒷단어의 첫소리가 그대로 맞물리면서 소리가 길게 이어집니다. unnamed, 그리고 midday. 차이를 귀로 느껴보세요.",
  "08_f08_exception_flap_tt":
    "두 번째 예외는 t가 두 개 겹치는 단어들입니다. 모음 사이에 tt가 오면, 미국 영어에서는 '트'가 아니라 부드러운 'ㄹ' 소리로 바뀝니다. letter, butter. 혀가 편안하게 굴러가는 소리를 들어보세요.",
  "09_f09_intro_scene":
    "이번엔 실제 카페 대화입니다. 배운 단어들이 문장 속에서 어떻게 자연스럽게 흘러가는지 들어보세요.",
  "10_f10_intro_shuffle":
    "이제 지금까지 익힌 단어들을 무작위로 섞어서 들려드립니다. 자음이 두 개라도 한 번에 소리 나는지 귀로 확인해 보세요.",
  "11_f11_summary":
    "오늘 함께 연습한 소리들을 정리해 보겠습니다. 영어에서 나란히 겹친 자음은 대부분 딱 한 번만 소리 납니다. 단어가 합쳐지는 경우와 모음 사이의 tt만 기억해 두시면 됩니다. 오늘 들었던 단어 중 가장 의외였던 발음은 무엇이었나요? 댓글로 편하게 남겨주세요.",
  "12_f12_intro_encore":
    "마지막으로 처음부터 끝까지 한 번 더 반복합니다. 틀어두고 편안하게 귀에 익혀보세요.",
};

// [B] English Sentences
const ENGLISH_SENTENCES = {
  en_s01_two_coffees: "Two coffees, please.",
  en_s02_hows_it_going: "Hello, how's it going?",
  en_s03_class_at_ten: "I have class at ten.",
  en_s04_happy_birthday: "Happy birthday!",
  en_s05_want_coffee: "Do you want a coffee?",
  en_s06_office_close: "The office is close to the cafe.",
  en_s07_coffee_after_class: "Let's get coffee after class.",
};

function readWav(filePath) {
  const buf = readFileSync(filePath);
  let offset = 12;
  let fmt = null;
  let dataOffset = null;
  let dataSize = null;
  while (offset < buf.length - 8) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    if (chunkId === "fmt ") {
      fmt = {
        numChannels: buf.readUInt16LE(offset + 10),
        sampleRate: buf.readUInt32LE(offset + 12),
        blockAlign: buf.readUInt16LE(offset + 20),
        bitsPerSample: buf.readUInt16LE(offset + 22),
      };
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataSize = chunkSize;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  if (!fmt || dataOffset === null) throw new Error(`Could not parse WAV: ${filePath}`);
  const numSamples = Math.floor(dataSize / fmt.blockAlign);
  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = buf.readInt16LE(dataOffset + i * fmt.blockAlign);
  }
  return { fmt, samples };
}

const ONSET_THRESHOLD_RATIO = 0.06;

function measureSpeechSpan(sourcePath) {
  const { fmt, samples } = readWav(sourcePath);
  const win = Math.floor(fmt.sampleRate * 0.02);
  const env = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) e += samples[j] * samples[j];
    env.push({ t: (i / fmt.sampleRate) * 1000, rms: Math.sqrt(e / win) });
  }
  const threshold = env.reduce((m, e) => Math.max(m, e.rms), 0) * ONSET_THRESHOLD_RATIO;
  const voiced = env.filter((e) => e.rms > threshold);
  if (voiced.length === 0) return null;
  return { fromMs: voiced[0].t, toMs: voiced[voiced.length - 1].t };
}

function calibrationFor(heardFrom, span) {
  if (!span) return (t) => t;
  const offset = span.fromMs - heardFrom;
  return (t) => t + offset;
}

function calibrateChars(chars, span) {
  if (!span || chars.length === 0) return chars;
  const map = calibrationFor(chars[0].from, span);
  return chars.map((c) => ({ ...c, from: map(c.from), to: map(c.to) }));
}

function segmentsToChars(segmentItems) {
  const heard = [];
  for (const item of segmentItems) {
    const text = item.text ?? "";
    const from = item.offsets?.from ?? 0;
    const to = item.offsets?.to ?? from;
    const span = Math.max(to - from, 1);
    const list = [...text];
    list.forEach((char, i) => {
      heard.push({ char, from: from + (span * i) / list.length, to: from + (span * (i + 1)) / list.length });
    });
  }
  return heard;
}

function alignNarrationToTimeline(narration, timeline) {
  const script = [...narration];
  const heard = timeline;
  if (script.length === 0 || heard.length === 0) return [];
  const norm = (c) => (/\s/.test(c) ? "" : c.toLowerCase());
  const a = script.map((c) => norm(c));
  const b = heard.map((t) => norm(t.char));
  const w = b.length + 1;
  const dp = new Int32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i * w + j] = a[i] !== "" && a[i] === b[j] ? dp[(i + 1) * w + (j + 1)] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + (j + 1)]);
    }
  }
  const times = new Array(script.length).fill(null);
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] !== "" && a[i] === b[j]) {
      times[i] = { from: heard[j].from, to: heard[j].to };
      i++; j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + (j + 1)]) {
      i++;
    } else {
      j++;
    }
  }
  const firstAnchor = times.findIndex((t) => t !== null);
  if (firstAnchor === -1) return [];
  const lastAnchor = times.length - 1 - [...times].reverse().findIndex((t) => t !== null);
  for (let k = 0; k < firstAnchor; k++) times[k] = { from: heard[0].from, to: times[firstAnchor].from };
  for (let k = lastAnchor + 1; k < times.length; k++) times[k] = { from: times[lastAnchor].to, to: heard[heard.length - 1].to };
  let k = firstAnchor;
  while (k <= lastAnchor) {
    if (times[k] !== null) { k++; continue; }
    const gapStart = k;
    while (times[k] === null) k++;
    const before = times[gapStart - 1].to;
    const after = times[k].from;
    const span = Math.max(after - before, 1);
    for (let g = gapStart; g < k; g++) {
      const f = (g - gapStart) / (k - gapStart);
      const n = (g - gapStart + 1) / (k - gapStart);
      times[g] = { from: before + span * f, to: before + span * n };
    }
  }
  return script.map((char, idx) => ({ char, from: times[idx].from, to: times[idx].to }));
}

function charsToWords(narration, charTimeline) {
  const words = [];
  let current = null;
  for (let idx = 0; idx < narration.length; idx++) {
    const ch = narration[idx];
    const t = charTimeline[idx];
    if (/\s/.test(ch)) {
      if (current) { words.push(current); current = null; }
      continue;
    }
    if (!current) current = { word: ch, from: t.from, to: t.to };
    else { current.word += ch; current.to = t.to; }
  }
  if (current) words.push(current);
  return words;
}

async function transcribeScene(id, text, isEnglish = false) {
  const wavPath = join(PROJECT_DIR, "assets", "voice", `${id}.wav`);
  if (!existsSync(wavPath)) {
    throw new Error(`WAV file missing: ${wavPath}`);
  }
  const wav16k = join(scratchDir, `${id}_16k.wav`);
  execFileSync("ffmpeg", ["-y", "-i", wavPath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav16k, "-loglevel", "error"]);

  const result = await transcribe({
    inputPath: wav16k,
    model: MODEL,
    tokenLevelTimestamps: false,
    tokensPerItem: 0,
    whisperPath: whisperDir,
    whisperCppVersion: WHISPER_VERSION,
    language: isEnglish ? "en" : "ko",
  });

  const span = measureSpeechSpan(wav16k);
  const heard = calibrateChars(segmentsToChars(result.transcription), span);
  const aligned = alignNarrationToTimeline(text, heard);
  if (aligned.length === 0) {
    throw new Error(`Scene ${id}: alignment produced nothing. Transcription: ${JSON.stringify(result.transcription)}`);
  }
  const charTimeline = aligned.map((c) => ({ from: c.from / 1000, to: c.to / 1000 }));
  const words = charsToWords(text, charTimeline).map((w) => ({
    word: w.word,
    from: Number(w.from.toFixed(3)),
    to: Number(w.to.toFixed(3)),
  }));
  return words;
}

console.log("=== EP23 Whisper Word Timeline Extraction ===");

const outDir = join(PROJECT_DIR, "assets", "voice");

// 1. Korean Narration
console.log("\n[1/2] Processing Korean Host Narration (12 scenes)...");
for (const [id, text] of Object.entries(KOREAN_NARRATION)) {
  if (only && !only.includes(id)) continue;
  process.stdout.write(`  ${id}: transcribing + aligning... `);
  try {
    const words = await transcribeScene(id, text, false);
    const outPath = join(outDir, `${id}.words.json`);
    writeFileSync(outPath, JSON.stringify(words, null, 2));
    console.log(`${words.length} words -> ${id}.words.json`);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
  }
}

// 2. English Sentences
console.log("\n[2/2] Processing English Sentences (7 sentences)...");
for (const [id, text] of Object.entries(ENGLISH_SENTENCES)) {
  if (only && !only.includes(id)) continue;
  process.stdout.write(`  ${id}: transcribing + aligning... `);
  try {
    const words = await transcribeScene(id, text, true);
    const outPath = join(outDir, `${id}.words.json`);
    writeFileSync(outPath, JSON.stringify(words, null, 2));
    console.log(`${words.length} words -> ${id}.words.json`);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
  }
}

console.log("\n✓ Word timestamp extraction complete!");
