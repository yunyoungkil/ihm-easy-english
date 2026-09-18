#!/usr/bin/env node
// Full word-by-word real-timing extraction for every EP17 scene's narration —
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
  "01": `A는 '애', I는 '이', O는 '아'. 우리 분명 이렇게 배웠죠. 그런데 왜 car, sir, for에서는 그 소리가 단 하나도 안 날까요? 뒤에 붙은 R 하나가 모음 소리를 통째로 집어삼켰기 때문입니다.`,
  "02": `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 R 뒤에서 사라진 모음의 비밀과, 딱 세 가지로 끝나는 소리 공식을 공개합니다.`,
  "03": `모음 뒤에 R이 붙은 철자는 AR, ER, IR, OR, UR, 이렇게 다섯 가지입니다. 사전을 펴보면 단어마다 발음기호가 다 다르게 표시돼 있어서, 다섯 개를 전부 외워야 할 것처럼 보이죠.`,
  "04": `사실 이 다섯 가지, 전부 외울 필요 없습니다. 그중 ER, IR, UR 이 세 가지는 철자만 다를 뿐 소리가 완전히 똑같거든요. her, bird, fur. 철자는 E, I, U로 다르지만, 소리는 셋 다 편안한 '어~' 하나입니다. 그러니까 진짜 외워야 할 소리는 AR, OR, 그리고 이 '어~'까지, 딱 세 가지뿐입니다.`,
  "05": `원리는 간단합니다. 혀가 R을 발음하기 위해 너무 일찍 움직이기 때문입니다. 모음의 입 모양을 채 만들기도 전에, 혀가 R 소리를 내려고 뒤로 쑥 물러나 버립니다. 결국 모음의 원래 소리는 혀의 큰 움직임에 녹아서 R 소리로 바뀌는 겁니다.`,
  "06": `첫 번째 AR 소리는 턱을 툭 떨어뜨리는 시원한 '아~' 소리입니다. A의 원래 소리 대신 입안을 넓게 열고 소리를 냅니다. 함께 소리 내보실까요? car, park, star, farm, card. 턱에 힘을 풀고 '아~' 하고 소리 내면 저절로 읽힙니다.`,
  "07": `두 번째 OR 소리는 입술을 동그랗게 모으는 깊은 '오~' 소리입니다. O 뒤에 R이 오면 입술 끝으로 둥글게 모여 울립니다. 직접 소리 내보세요. for, corn, storm, fork, horse. 촛불을 불듯이 입술을 모으고 깊게 '오~' 하고 소리 냅니다.`,
  "08": `마지막 ER, IR, UR 소리는 입에 힘을 툭 뺀 중립의 '어~' 소리입니다. 철자가 E든, I든, U든 전혀 상관없습니다. person, term, girl, shirt, nurse, burn. 입꼬리에 힘을 풀고 멍하니 '어~' 소리만 내시면 됩니다.`,
  "09": `여기서 잠깐, 정말 중요한 꿀팁 하나 짚고 갈까요? red처럼 모음 앞에 오는 R과, car처럼 모음 뒤에 오는 R은 소리가 완전히 다릅니다. 앞에 오는 R은 혀를 둥글게 '우~'로 밀어내고, 뒤에 오는 R은 모음의 꼬리를 낚아채서 뒤로 당깁니다. 이 차이만 알아도 영어 소리가 훨씬 쉬워집니다.`,
  "12": `이제 문장으로 확인해 볼까요? 우리가 배운 세 가지 소리가 한 문장에 다 들어있습니다. The girl in the car is waiting for her turn. girl의 '어', car의 '아', for의 '오', turn의 '어'. 이제 단어가 저절로 구별되시죠?`,
  "13": `한 문장만 더 읽어보겠습니다. 이번엔 우리가 매일 쓰는 단어들이 들어있습니다. Please order a burger and corn for the party. order와 corn의 '오', burger의 '어', party의 '아'. 이제 외래어를 보셔도 원래 소리가 한눈에 보이실 겁니다.`,
  "14": `오늘 배운 규칙, 이 한 장만 기억하세요. AR 소리는 턱 내리는 '아', OR 소리는 입술 모으는 '오', ER, IR, UR 소리는 힘 뺀 '어'. 다섯 개 철자가 단 세 개 소리로 끝납니다. 화면을 캡처해 두고 단어를 읽을 때마다 꺼내보세요.`,
  "15": `단어는 무작정 외우는 게 아니라 소리의 길을 이해하는 겁니다. 지난 모음 편도 함께 보시면 영어가 훨씬 쉬워집니다. 오늘도 수고 많으셨습니다. 이해하면 쉬운영어였습니다.`,
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
