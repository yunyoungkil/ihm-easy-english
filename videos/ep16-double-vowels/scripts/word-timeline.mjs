#!/usr/bin/env node
// Full word-by-word real-timing extraction for every EP16 scene's narration —
// not just "key" words, the ENTIRE script text. Reuses the whisper+LCS-
// alignment method already proven in scripts/generate-highlights.mjs
// (Remotion pipeline, EP6-10) and videos/ep15-sion-words/scripts/
// word-timeline.mjs (functions copied, not imported — that file is legacy/
// frozen).
//
// Frame 9 is NOT processed here — it was generated as 9 known sub-pieces
// (Korean carrier text + 4 pure-English sentences) whose boundaries are
// already exactly known at generation time (see gen-tts-gemini.mjs
// FRAME9_PIECES), so no whisper alignment is needed for it.
//
// Usage: node scripts/word-timeline.mjs [--only=05,06,07,08,10]  (default: all 11)
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
// exactly (which itself matches SCRIPT.md's finalized narration text), or the
// LCS alignment will silently misalign against the real audio.
const NARRATION = {
  "01": `BOAT, RAIN, MEAT... 저도 이런 쉬운 단어 앞에서 순간 멈칫했던 적이 있어요. 모음이 두 개 나란히 붙어 있으면, 이걸 다 읽어야 하는 건지, 하나만 읽어야 하는 건지, 그런 기준이 있는지조차 몰랐거든요. 오늘 그 기준 하나만 알면, 이런 단어들 더 이상 멈추지 않고 바로 읽으실 수 있어요.`,
  "02": `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 모음 두 개가 나란히 붙어 있을 때, 어느 쪽을 읽고 어느 쪽은 넘기는지, 그 기준 하나를 짚어드리겠습니다.`,
  "03": `BOAT, 이 단어를 보면 모음이 O랑 A, 이렇게 두 개가 붙어 있습니다. 이 둘 중에 어떤 걸 소리를 내야 할까요? O만 내야 할까요, 아님 A만 내야 할까요, 그것도 아니면 둘 다 내야 할까요?`,
  "04": `결론부터 말씀드릴게요. 모음 두 개가 나란히 있으면, 둘 다 읽는 게 아니라 앞에 있는 모음 이름만 소리 내고, 뒤에 있는 모음은 그냥 무음으로 소리를 내지 않습니다. BOAT는 O 이름 그대로 '오'라고만 읽고, A는 소리를 안 내는 거예요. 저도 공부하기 전엔 모음 2개를 다 읽는 줄 알았습니다. 그러다 막상 실제 발음을 들어보면 제가 생각했던 거랑 다르니까, '아... 왜 이렇지' 하고 그냥 넘기기만 했죠. 근데 공부를 하다 보니, 앞 글자 하나만 신경 쓰면 된다는 걸 알게 됐어요.`,
  "05": `원리는 간단해요. 모음 두 개가 붙으면, 혀 입장에서는 두 개를 다 다른 소리로 내는 것보다 앞 모음은 자기 이름 그대로 시원하게 말하고, 뒤에 있는 모음은 그냥 쉬는 게 훨씬 편하거든요. 그래서 뒤 모음은 소리를 안 내는 거예요. COAT도 마찬가지예요. O랑 A가 붙어 있는데, O는 자기 이름 그대로 '오'라고 소리 내고, A는 조용히 쉬어요. 그래서 '코트'라고 읽는 거죠 — 사실 여러분 이미 이 단어, 알고 계셨잖아요.`,
  "06": `우리가 이미 자주 쓰고 있는 단어로 이 규칙이 어떻게 통하는지 한 번 볼까요. 아까 봤던 RAIN, A 이름 그대로 '레인'이고요. MEAT도 E 이름 그대로 '미트'예요. PAINT도 마찬가지로 '페인트', TOAST도 '토스트'죠 — 그리고 다른 단어들도 한 번 더 보시죠. TEAM도 E 이름 그대로 '팀'이고, PIE도 I 이름 그대로 '파이'예요. 이렇게 앞 모음 이름만 기억하면, 이 규칙을 사용해 새 단어를 봐도 망설이지 않고 바로 읽으실 수 있을 거예요.`,
  "07": `딱 하나만 알아두실 게 있습니다. 오늘 배운 규칙, 대부분 잘 통하는데 EA만큼은 가끔 다르게 읽힐 때가 있어요. HEAD는 E랑 A가 붙어 있지만 '히드'가 아니라 '헤드'라고 읽고, BREAD도 '브레드', DEAD도 '데드'예요. 이런 단어는 그때그때 소리 내면서 익숙해지는 수밖에 없어요 — 오늘 배운 규칙이 대부분의 단어를 뚫어주는 시작점이지, 예외 없는 절대 규칙은 아니라는 것만 기억해두시면 됩니다.`,
  "08": `그럼 직접 맞혀보세요. 첫 번째 단어, 어떻게 읽을까요? 잠깐 생각해 보세요. 앞 모음 이름 그대로, '시트'입니다. 두 번째 단어는요? 이것도 앞 모음 이름 그대로, '골'이죠. 마지막 문제, 이번엔 좀 다를 수 있어요. 세 번째 단어는요? 정답은, '스웻'입니다. EA인데, 아까 배운 예외였죠.`,
  "10": `자, 이제 직접 소리 내서 읽어보세요. 따라 읽다 보면 저절로 자신감이 붙으실 거예요. BOAT, 천천히. 보, 트 — 이어서, 보트! 다시 한 번, 좀 더 빠르게. 보트, 보트. 이번엔 MEAT예요. 미, 트 — 이어서, 미트! 다시 한 번, 좀 더 빠르게. 미트, 미트. 마지막으로 예외였던 단어도 같이 볼까요. HEAD예요. 헤, 드 — 이어서, 헤드! 다시 한 번, 좀 더 빠르게. 헤드, 헤드.`,
  "11": `이제 정말 이 규칙 하나로, 처음 보는 단어도 바로 읽으실 수 있어요. 예를 들어 이 단어, 오늘 처음 보셨죠? 그래도 한번 볼까요. 앞 모음 이름 그대로, 정답은 '그레인'입니다. 하나 더 볼까요. 이것도 앞 모음 이름 그대로, '포움'이에요. 하나만 더요. 이번에도 똑같이, '리치'죠. 어떠세요, 낯선 단어들인데도 계속 바로 읽히시죠? 여태 이걸 다 읽어야 하는지, 하나만 읽어야 하는지, 그런 기준이 있는지조차 몰랐던 게, 사실 이 기준 하나만 알면 끝나는 일이었던 거예요.`,
  "12": `오늘은 모음 두 개가 나란히 붙으면, 앞 모음은 이름 그대로 소리 내고 뒤 모음은 무음이 된다는 원리, 그리고 EA는 가끔 다르게 읽히는 예외까지 함께 봤습니다. 이제 모음 두 개가 붙은 낯선 단어를 봐도, 예전처럼 멈칫하지 않고 망설임 없이 바로 읽으실 수 있을 거예요. 다음에도 여러분이 자주 막막해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 자신 있게 읽고 계실 거예요.`,
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
