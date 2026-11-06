#!/usr/bin/env node
// Whisper Word-Level Timestamp Extraction for EP28 (F vs P 0.1초 조음 물리법칙: 24쌍 최소대립쌍)
// Uses whisper.cpp via @remotion/install-whisper-cpp and LCS character-level alignment
// Generates assets/voice/<id>.words.json for all Korean narration files and English dialogue sentences.
//
// Usage:
//   node videos/ep28-f-vs-p/scripts/word-timeline.mjs [--only=01_f01_hook]

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

// [A] Korean Host Narration Texts (국내 거주 3060 학습자 관점 일상 고민 대본)
const KOREAN_NARRATION = {
  "01_f01_hook":
    "학창 시절부터 지금까지, 우리는 베스트셀러도 베스트, 입는 조끼도 베스트라고 똑같이 읽어왔습니다. 그런데 원어민 앞에서 이 단어를 말하면 전혀 엉뚱하게 알아듣습니다. 바로 비와 브이의 0.1초 차이 때문입니다. 오늘 딱 24쌍의 소리를 들으면서, 두 소리가 어떻게 다른지 여러분의 귀를 확실하게 뚫어 드리겠습니다.",
  "02_f02_principle":
    "소리의 비밀은 윗니에 있습니다. 알파벳 비는 두 입술을 가볍게 닫았다가 팡 터뜨리는 소리입니다. 윗니가 아예 개입하지 않는 0퍼센트입니다. 반면에 알파벳 브이는 윗니로 아랫입술 안쪽을 살짝 깨물고 성대를 부르르 떨어주는 소리입니다. 윗니가 100퍼센트 개입해야 합니다. 입술 팡 터뜨리기 비, 아랫입술 물고 떨기 브이, 이 원리를 기억하고 지금부터 귀로 따라와 보세요.",
  "03_f09_summary":
    "오늘 배운 비와 브이의 소리 법칙, 딱 한 가지만 기억하세요. 비는 윗니 없이 두 입술 팡, 브이는 윗니로 아랫입술 물고 부르르. 화면의 정리 카드를 캡처해 두시고 헷갈릴 때마다 꺼내 보세요. 여러분의 영어 듣기 실력이 매일 깊어집니다.",
};

// [B] English Dialogue Sentences
const ENGLISH_SENTENCES = {
  dial_01: "Is this the best vest you have?",
  dial_02: "Yes, you can take the van without a ban.",
  dial_03: "I like this berry very much.",
  dial_04: "Did you take the boat to cast your vote?",
  dial_05: "Put the flower in a base or a vase?",
  dial_06: "Check the bolt and the high volt line.",
  dial_07: "She made a solemn vow with a gentle bow.",
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
      break;
    }
    offset += 8 + chunkSize;
  }
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
  console.log("=== EP28 Whisper Word-Level Timeline Alignment ===");

  const outDir = join(PROJECT_DIR, "assets", "voice");

  // 1. Korean Narration
  console.log("\n[1/2] Processing Korean Host Narration (3 scenes)...");
  for (const [id, text] of Object.entries(KOREAN_NARRATION)) {
    if (only && !only.includes(id)) continue;
    process.stdout.write(`  ${id}: transcribing + aligning... `);
    try {
      const words = await transcribeScene(id, text, false);
      writeFileSync(join(outDir, `${id}.words.json`), JSON.stringify(words, null, 2), "utf8");
      console.log(`✓ (${words.length} words, range: ${words[0]?.from}s ~ ${words[words.length-1]?.to}s)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  // 2. English Dialogue
  console.log("\n[2/2] Processing English Dialogue Sentences (7 audio files)...");
  for (const [id, text] of Object.entries(ENGLISH_SENTENCES)) {
    if (only && !only.includes(id)) continue;
    process.stdout.write(`  ${id}: transcribing + aligning... `);
    try {
      const words = await transcribeScene(id, text, true);
      writeFileSync(join(outDir, `${id}.words.json`), JSON.stringify(words, null, 2), "utf8");
      console.log(`✓ (${words.length} words, range: ${words[0]?.from}s ~ ${words[words.length-1]?.to}s)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log("\n✅ All EP28 Whisper timelines generated successfully!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
