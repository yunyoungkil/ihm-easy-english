#!/usr/bin/env node
// Full word-by-word real-timing extraction for every EP18 scene's narration —
// not just "key" words, the ENTIRE script text. Reuses the whisper+LCS-
// alignment method already proven in scripts/generate-highlights.mjs
// (Remotion pipeline, EP6-10) and videos/ep16-double-vowels/scripts/
// word-timeline.mjs (functions copied, not imported — that file is legacy/
// frozen).
//
// Frames 10 and 11 are NOT processed here — they were generated as known
// sub-pieces (word + fixed-length silence + answer, see gen-tts-gemini.mjs
// FRAME10_PIECES / FRAME11_PIECES) whose boundaries are already exactly known
// from each piece's own measured duration in .tts-results.json, so no
// whisper alignment is needed for them (same reasoning as EP16 skipping its
// Frame 9).
//
// Usage: node scripts/word-timeline.mjs [--only=05,06,07,08]  (default: all 13)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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

// Exact narration text per scene — MUST match gen-tts-gemini.mjs LINES[].text
// exactly (which itself matches SCRIPT.md's finalized narration text, 2026-09-18
// evaluation pass), or the LCS alignment will silently misalign against the
// real audio.
const NARRATION = {
  "01": `k, n, e, e. 알파벳을 배운 대로라면 분명 '크니'여야 합니다. climb도 '클라임브', write도 '우라이트'여야 하죠. 그런데 왜 원어민들은 멀쩡하게 쓰여 있는 첫 글자와 끝 글자를 감쪽같이 지워버렸을까요? 이유는 아주 단순합니다. 오늘 이 기준 하나만 알면, 평생 헷갈리던 묵음 단어가 사전 없이도 한 번에 읽힙니다.`,
  "02": `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 외우지 않고 몸으로 이해하는 소리 없는 철자의 비밀을 공개합니다.`,
  "03": `사전을 펴보면 단어마다 소리가 안 나는 철자들이 제각각 흩어져 있습니다. knee, climb, write, knock, thumb... 단어마다 예외로 다 외워야 할 것 같아서 막막하셨죠.`,
  "04": `사실 이 단어들, 예외가 아니라 원어민들도 혀가 너무 힘들어서 뺀 겁니다. 놀랍게도 옛날 영어에서는 이 글자들을 대부분 소리 내서 읽었습니다. 그런데 말하다 보니 너무 불편해서 저절로 탈락한 것이죠. 그 원리만 알면, 복잡해 보이던 묵음 단어들이 딱 세 개의 소리 서랍으로 깔끔하게 정리됩니다.`,
  "05": `원리는 아주 단순합니다. 소리끼리 서로 부딪히기 때문입니다. 목구멍 깊은 곳의 K 소리를 내자마자 앞니 쪽의 N 소리로 혀가 날아가기엔 거리가 너무 멀고, 입술을 닫아 M 소리를 내놓고 또 억지로 '브!' 하고 입술을 터뜨리는 건 두 번 일하기 귀찮기 때문입니다. 결국 우리 혀와 입술이 가장 편한 지름길을 택한 것이죠.`,
  "06": `첫 번째 서랍은 단어 맨 앞의 KN 소리입니다. 앞의 K는 혀가 귀찮아서 완전히 버리고, 곧바로 N 소리로 출발합니다. K를 굳이 소리 내려 하지 마세요. 혀를 처음부터 앞니 뒤에 딱 붙이고 그냥 '니' 하고 출발하면 됩니다. 함께 소리 내보실까요? knee, know, knife, knock, knight. K는 깨끗이 지우고 앞니 뒤에서 N 소리만 가볍게 내주시면 됩니다.`,
  "07": `두 번째 서랍은 단어 끝의 MB 소리입니다. 우리가 매일 쓰는 '허니콤'이나 '썸드라이브'도 B 소리를 내지 않죠. 직접 입술을 닫아보세요. '클라임~' 하고 입술을 붙인 상태에서, 굳이 '브!' 하고 입술을 떼지 마세요. 그냥 입술만 편안하게 붙이고 끝내면 그게 원어민 소리입니다. 직접 소리 내보세요. climb, comb, thumb, lamb, bomb. B 소리를 터뜨리지 말고 부드러운 '음~' 소리로 마무리하시면 됩니다.`,
  "08": `세 번째 서랍은 단어 맨 앞의 WR 소리입니다. 입술을 둥글게 모아 '우' 하느라 머뭇거리지 마세요. W는 잊어버리고, 처음부터 혀를 뒤로 당겨 시원하게 '롸이트'로 직진하시면 됩니다. 함께 읽어보실까요? write, wrong, wrist, wrap, wreck. W에서 망설이지 말고 바로 혀를 당겨 시원하게 R로 소리 내보세요.`,
  "09": `여기서 잠깐, 소리도 안 나는 글자를 왜 굳이 남겨뒀을까요? 인쇄술이 발달하면서 철자가 굳어진 것도 있지만, 바로 뜻을 구별해 주는 고마운 신분증 역할을 하기 때문입니다. 소리는 똑같지만 knight는 기사, night는 밤, knot는 매듭, not은 아니다. 글자를 보면 뜻이 한눈에 구별되는 것이죠.`,
  "12": `이제 문장으로 확인해 볼까요? 묵음 단어가 한 문장에 다 들어있습니다. The knight with a sharp knife is kneeling down. knight, knife, kneeling. K 소리를 깔끔하게 지우니 긴 문장도 물 흐르듯 읽히죠?`,
  "13": `한 문장만 더 읽어보겠습니다. 이번엔 MB 소리와 WR 소리가 함께 들어있습니다. Please comb your hair and wrap the gift before you write. comb의 B 탈락, wrap과 write의 W 탈락. 소리 없는 철자를 피해 가니 발음이 훨씬 편안해집니다.`,
  "14": `오늘 배운 묵음 규칙, 이 한 장만 기억하세요. KN 소리는 K를 버리고 N, MB 소리는 B를 버리고 M, WR 소리는 W를 버리고 R. 화면을 캡처해 두고 단어를 읽을 때마다 꺼내보세요.`,
  "15": `영어는 무작정 외우는 게 아니라, 게으른 혀의 소리 원리를 이해하는 겁니다. 지난 모음 뒤 R 편도 함께 보시면 영어가 훨씬 쉬워집니다. 오늘도 수고 많으셨습니다. 이해하면 쉬운영어였습니다.`,
};

// ---------- copied from scripts/generate-highlights.mjs (Remotion pipeline, frozen) ----------

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
  const norm = (c) => (/\s/.test(c) ? "" : c);
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

// ---------- word grouping (chars -> words on whitespace) ----------

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

// ---------- main ----------

async function transcribeScene(id) {
  const wavPath = join(PROJECT_DIR, "assets", "voice", `${id}.wav`);
  const wav16k = join(scratchDir, `${id}_16k.wav`);
  execFileSync("ffmpeg", ["-y", "-i", wavPath, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav16k, "-loglevel", "error"]);

  const result = await transcribe({
    inputPath: wav16k,
    model: MODEL,
    tokenLevelTimestamps: false,
    tokensPerItem: 0,
    whisperPath: whisperDir,
    whisperCppVersion: WHISPER_VERSION,
    language: "ko",
  });

  const span = measureSpeechSpan(wav16k);
  const heard = calibrateChars(segmentsToChars(result.transcription), span);
  const narration = NARRATION[id];
  const aligned = alignNarrationToTimeline(narration, heard);
  if (aligned.length === 0) {
    throw new Error(`Scene ${id}: alignment produced nothing — check NARRATION text matches gen-tts-gemini.mjs exactly`);
  }
  const charTimeline = aligned.map((c) => ({ from: c.from / 1000, to: c.to / 1000 }));
  const words = charsToWords(narration, charTimeline).map((w) => ({
    word: w.word,
    from: Number(w.from.toFixed(3)),
    to: Number(w.to.toFixed(3)),
  }));
  return words;
}

const ALL_SCENES = Object.keys(NARRATION);
const scenes = only ?? ALL_SCENES;
const outDir = join(PROJECT_DIR, "assets", "voice");
const allResults = {};

for (const id of scenes) {
  process.stdout.write(`Scene ${id}: transcribing + aligning... `);
  const words = await transcribeScene(id);
  allResults[id] = words;
  const outPath = join(outDir, `${id}.words.json`);
  writeFileSync(outPath, JSON.stringify(words, null, 2));
  console.log(`${words.length} words -> ${outPath}`);
}

console.log("\nDone. Per-scene word timelines written to assets/voice/<id>.words.json");
