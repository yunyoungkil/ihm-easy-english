#!/usr/bin/env node
// Whisper Word-Level Timestamp Extraction for EP24
// Uses whisper.cpp via @remotion/install-whisper-cpp and LCS character-level alignment
// Generates assets/voice/<id>.words.json for all Korean narration files and English dialogue sentences.
//
// Usage:
//   node videos/ep24-long-short-i/scripts/word-timeline.mjs [--only=01_f01_hook]

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
    "솔직히 쉬잎이랑 쉽, 둘 다 그냥 똑같이 '쉽'으로 읽고 계셨죠? 학교 다닐 때 장모음은 길게 끌고, 단모음은 짧게 끊으라고 배웠잖아요. 근데 막상 미드나 영화를 보면, 원어민들은 길게 끄는 것 같지도 않은데 기가 막히게 구분해서 말하거든요. 이게 왜 그러냐면, 소리의 길이가 아니라 입술을 쓰는 방법이 아예 달라서 그렇습니다. 오늘 딱 스무 쌍만 귀로 확인해 보시면, 아 이래서 다르게 들렸구나 바로 감이 오실 거예요.",
  "02_f02_principle":
    "원리는 정말 간단합니다. 첫 번째 쉬잎은 웃듯이 입꼬리를 옆으로 싹 당기면서 내는 소리예요. 그래서 소리가 팽팽하게 나옵니다. 반면에 두 번째 쉽은 그냥 멍때리듯이 입에 힘을 툭 빼고 내는 소리예요. 살짝 에 소리가 섞인 느낌이죠. 그럼 남녀 원어민 목소리로 세 번씩 들려드릴 테니까, 편하게 귀로 한번 따라가 보세요.",
  "03_f09_summary":
    "오늘 배운 내용, 딱 이것만 챙겨가시면 됩니다. 웃듯이 입꼬리를 당기면 쉬잎, 힘 툭 빼고 편하게 소리 내면 쉽입니다. 지금 이 화면 딱 캡처해 두시고, 나중에 헷갈릴 때 한 번씩 꺼내보세요.",
};

// [B] English Dialogue Sentences
const ENGLISH_SENTENCES = {
  dial_01_seat_sit: "Please take a seat and sit down.",
  dial_02_feel_fill: "I feel like I should fill the cup.",
  dial_03_sleep_slip: "Did you sleep well, or did you slip?",
  dial_04_reach_rich: "We can reach that rich neighborhood.",
  dial_05_leave_live: "Don't leave the house where you live.",
  dial_06_meat_mitt: "I ate some meat with a baseball mitt.",
  dial_07_beach: "Let's walk along the beach together.",
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

async function run() {
  console.log("=== EP24 Whisper Word-Level Timeline Alignment ===");

  const outDir = join(PROJECT_DIR, "assets", "voice");

  // 1. Korean Narration
  console.log("\n[1/2] Processing Korean Host Narration (3 scenes)...");
  for (const [id, text] of Object.entries(KOREAN_NARRATION)) {
    if (only && !only.includes(id)) continue;
    process.stdout.write(`  ${id}: transcribing + aligning... `);
    try {
      const words = await transcribeScene(id, text, false);
      writeFileSync(join(outDir, `${id}.words.json`), JSON.stringify(words, null, 2), "utf8");
      console.log(`✓ (${words.length} words)`);
    } catch (err) {
      console.error(`✗ FAIL: ${err.message}`);
    }
  }

  // 2. English Dialogue
  console.log("\n[2/2] Processing English Dialogue (7 sentences)...");
  for (const [id, text] of Object.entries(ENGLISH_SENTENCES)) {
    if (only && !only.includes(id)) continue;
    process.stdout.write(`  ${id}: transcribing + aligning... `);
    try {
      const words = await transcribeScene(id, text, true);
      writeFileSync(join(outDir, `${id}.words.json`), JSON.stringify(words, null, 2), "utf8");
      console.log(`✓ (${words.length} words)`);
    } catch (err) {
      console.error(`✗ FAIL: ${err.message}`);
    }
  }

  console.log("\nAll word timelines extracted successfully!");
}

run().catch((err) => {
  console.error("Whisper extraction failed:", err);
  process.exit(1);
});
