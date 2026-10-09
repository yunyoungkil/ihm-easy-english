#!/usr/bin/env node
// Whisper Word-Level Timestamp Extraction for EP22 (-ED Past Tense Endings: [t], [d], [ɪd])
// Uses whisper.cpp via @remotion/install-whisper-cpp and LCS character-level alignment
// Generates assets/voice/<id>.words.json for all Korean narration files and English dialogue sentences.
//
// Usage:
//   node videos/ep22-ed-ending/scripts/word-timeline.mjs [--only=01_f01_hook]

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
    "솔직히 과거형 단어 뒤에 붙은 이디, 우리 다 그냥 '드'로 읽고 있었잖아요. 그런데 외국인 앞에서 워크드, 원티드라고 발음하면 왜 어색하게 들리고, 미드에서는 왜 이디 소리가 거의 안 들릴까요? 이디의 끝소리는 하나가 아니라 세 가지 완전히 다른 소리로 갈리기 때문입니다. 오늘 딱 스물네 개 단어로 평생 헷갈리던 과거형 발음의 원리를 완벽하게 귀 뚫어 드리겠습니다.",
  "02_f02_principle":
    "이디 발음의 비밀은 딱 하나, 목청에 손을 대보면 바로 알 수 있습니다. 목청이 떨리지 않는 가벼운 소리 뒤에서는 똑같이 목이 안 떨리는 '트' 소리로 끝납니다. 반대로 목청이 부르르 울리는 유성음 뒤에서는 부드러운 '드' 소리가 납니다. 그리고 이미 트나 드로 끝나는 단어는 혀가 꼬이지 않게 쿠션 모음을 넣어서 '이디'로 음절을 하나 늘려줍니다. 트, 드, 이디, 이 세 가지 소리 규칙을 기억하고 바로 소리 연습 시작하겠습니다.",
  "03_f09_summary":
    "수고하셨습니다. 오늘 연습한 과거형 이디의 핵심 요약표입니다. 목청이 안 떨리면 트, 목청이 떨리면 드, 트나 드 뒤에서는 음절이 늘어나는 이디입니다. 여기에 형용사로 쓰이는 특수 단어들까지, 지금 화면을 스마트폰으로 캡처해 두시고 헷갈릴 때마다 꺼내서 소리 내어 확인해 보세요.",
};

// [B] English Dialogue Sentences
const ENGLISH_SENTENCES = {
  dial_01: "I walked home and stopped by the store.",
  dial_02: "She called me and played the song.",
  dial_03: "We waited because we wanted to see him.",
  dial_04: "They decided to stay and cleaned the room.",
  dial_05: "He laughed when he watched the movie.",
  dial_06: "I needed help, so she opened the door.",
  dial_07: "The movie ended and everyone cheered.",
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
  console.log("=== EP22 Whisper Word-Level Timeline Alignment ===");

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

  console.log("\nWord timeline extraction completed!");
}

run().catch(console.error);
