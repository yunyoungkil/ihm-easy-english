#!/usr/bin/env node
// Whisper Word-Level Timestamp Extraction for EP25
// Uses whisper.cpp via @remotion/install-whisper-cpp and LCS character-level alignment
// Generates assets/voice/<id>.words.json for all Korean narration files and English dialogue sentences.
//
// Usage:
//   node videos/ep25-pool-pull/scripts/word-timeline.mjs [--only=01_f01_hook]

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
    "솔직히 수영장 푸울이랑 잡아당기다 풀, 둘 다 그냥 똑같이 풀이라고 읽고 계셨죠? 학창 시절에 장모음은 길게 끌고 단모음은 짧게 끊으라고 배웠지만, 실제로 미드를 보면 원어민들은 길게 끄는 것 같지도 않은데 기가 막히게 구분합니다. 원어민들이 두 소리를 완벽하게 구별하는 진짜 이유는 소리의 길이가 아닙니다. 바로 입술을 모으느냐, 힘을 빼느냐, 그 입 모양 하나가 완전히 다르기 때문입니다. 오늘 딱 20쌍 40개 단어를 남녀 원어민 목소리로 반복해서 듣고, 실전 대화와 무작위 퀴즈까지 귀로 훈련해 보세요. 영상이 끝날 때쯤엔 푸울과 풀이 완전히 다른 소리로 또렷하게 들리실 겁니다.",
  "02_f02_principle":
    "화면의 구강 단면도를 한번 보세요. 먼저 초록색 긴장모음 유 땡땡 소리는 촛불을 후 불듯이 입술을 좁고 둥글게 앞으로 쭉 모으면서 내는 소리입니다. 입술 주변 근육이 팽팽하게 긴장되면서 단단한 소리가 납니다. 푸울, 푸울. 반면에 노란색 이완모음 말발굽 소리는 그냥 멍때리듯이 입술과 턱에 힘을 툭 빼고 내는 소리입니다. 우리말 으와 어의 중간처럼 턱을 편안하게 떨어뜨리면서 소리를 뱉습니다. 풀, 풀. 소리를 억지로 늘이지 마시고, 입술을 모으느냐 힘을 빼느냐만 기억하시면 됩니다. 이제 1번 그룹부터 남녀 원어민 소리로 세 번씩 집중해서 들어보겠습니다.",
  "03_f09_summary":
    "오늘 배운 핵심 원리 딱 한 장으로 정리해 드릴게요. 지금 화면을 스마트폰으로 캡처해 두시고, 단어가 헷갈릴 때마다 꺼내보세요. 초록색 긴장모음 유 땡땡은 촛불 불듯이 입술을 앞으로 둥글게 모으기. 노란색 이완모음 말발굽은 멍때리듯이 턱에 힘 툭 빼기. 이 두 가지만 기억하시면 평생 헷갈리던 단어들이 완벽하게 구분됩니다. 마지막으로 20쌍 전체를 빠르게 복습하고 마무리하겠습니다. 수고 많으셨습니다.",
};

// [B] English Dialogue Sentences
const ENGLISH_SENTENCES = {
  m_dial_01_pull_push: "Pull the door, don't push it.",
  f_dial_01_pull_push: "Pull the door, don't push it.",
  m_dial_02_full_fool: "I'm totally full, don't be a fool.",
  f_dial_02_full_fool: "I'm totally full, don't be a fool.",
  m_dial_03_look_Luke: "Look at Luke, he bought a sharp suit.",
  f_dial_03_look_Luke: "Look at Luke, he bought a sharp suit.",
  m_dial_04_stood_stewed: "He stood by the stove and stewed the soup.",
  f_dial_04_stood_stewed: "He stood by the stove and stewed the soup.",
  m_dial_05_whod_hood: "Who'd wear a heavy hood today?",
  f_dial_05_whod_hood: "Who'd wear a heavy hood today?",
  m_dial_06_boots_shook: "He took off his boots and shook his head.",
  f_dial_06_boots_shook: "He took off his boots and shook his head.",
  m_dial_07_food_mood: "Good food always puts me in a good mood.",
  f_dial_07_food_mood: "Good food always puts me in a good mood.",
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
  console.log("=== EP25 Whisper Word-Level Timeline Alignment ===");

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
      console.log(`FAILED: ${err.message}`);
    }
  }

  // 2. English Dialogue
  console.log("\n[2/2] Processing English Dialogue Sentences (14 audio files)...");
  for (const [id, text] of Object.entries(ENGLISH_SENTENCES)) {
    if (only && !only.includes(id)) continue;
    process.stdout.write(`  ${id}: transcribing + aligning... `);
    try {
      const words = await transcribeScene(id, text, true);
      writeFileSync(join(outDir, `${id}.words.json`), JSON.stringify(words, null, 2), "utf8");
      console.log(`✓ (${words.length} words)`);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  console.log("\nWord timeline extraction completed!");
}

run().catch(console.error);
