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
    "커피를 뜻하는 커피와 복사를 뜻하는 카피. 학창 시절에 배울 때나 한글로 적을 때나, 우리 둘 다 그냥 똑같은 피 소리로 읽고 살아왔잖아요. 그런데 미드나 유튜브에서 원어민 소리를 가만히 들어보면, 둘이 분명히 완전히 다르게 소리 나거든요. 원어민은 왜 에프와 피를 듣자마자 0.1초 만에 바로 구분할까요? 비밀은 윗니가 닿느냐 안 닿느냐, 딱 하나의 물리법칙에 있습니다. 오늘 스물네 쌍의 단어로 평생 똑같이 들리던 에프와 피의 소리를 듣자마자 구분되도록 귀를 완전히 뚫어 드리겠습니다.",
  "02_f02_principle":
    "혹시 에프 발음할 때 아랫입술을 꽉 깨물어야 한다고 배우셨나요? 입술을 깨물면 오히려 소리가 막혀서 틀립니다. 에프는 윗니 끝을 아랫입술 안쪽 살에 살짝 대고 바람을 쉬익 내보내는 소리입니다. 윗니가 닿는 비율 백 퍼센트입니다. 반대로 피는 윗니가 전혀 닿지 않습니다. 윗니 접촉 영 퍼센트입니다. 위아래 두 입술만 가볍게 닫았다가 바람을 팡 터뜨리는 소리입니다. 윗니 백 퍼센트의 에프, 윗니 영 퍼센트의 피. 이 단순한 규칙 하나만 기억하시고, 이제 스물네 쌍의 단어로 귀 훈련을 시작하겠습니다.",
  "03_f09_summary":
    "정말 수고하셨습니다. 오늘 훈련한 스물네 쌍의 핵심 소리 규칙 요약표입니다. 에프는 윗니 백 퍼센트의 바람이 새는 소리, 피는 윗니 영 퍼센트의 입술이 터지는 소리입니다. 지금 화면을 스마트폰으로 캡처해 두시고, 헷갈릴 때마다 꺼내서 소리를 떠올려 보세요.",
};

// [B] English Dialogue Sentences
const ENGLISH_SENTENCES = {
  dial_01: "I need a cup of hot coffee, not a copy.",
  dial_02: "Please turn on the fan and wash the pan.",
  dial_03: "The fast runner did not stop in the past.",
  dial_04: "Do not drink water from the pool, you fool.",
  dial_05: "I feel like I want to peel this fresh orange.",
  dial_06: "Keep the office safe and tape the box tight.",
  dial_07: "She has a real passion for high fashion.",
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
