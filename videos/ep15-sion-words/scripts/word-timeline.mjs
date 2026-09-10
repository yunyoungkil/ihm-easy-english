#!/usr/bin/env node
// Full word-by-word real-timing extraction for every EP15 scene's narration —
// not just "key" words, the ENTIRE script text. Reuses the whisper+LCS-
// alignment method already proven in scripts/generate-highlights.mjs
// (Remotion pipeline, EP6-10) and videos/ep14-connected-speech/scripts/
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
// exactly (which itself matches SCRIPT.md's finalized "-sion"→"션" TTS text),
// or the LCS alignment will silently misalign against the real audio.
const NARRATION = {
  "01": `DECISION, TELEVISION, EXPANSION… 이렇게 좀 긴 영단어 보면, 나도 모르게 눈부터 피하신 적 있으시죠? 뜻은 대충 아는 단어인데, 막상 소리 내서 읽으려고 하면, 대충 이렇게 읽었는데 이게 진짜 맞게 읽은 건지 확신이 안 서는 경우 많으실 거예요. 이게 여러분이 영어를 못해서가 아닙니다. 그 단어 끝에 숨어 있는 소리 패턴을, 아직 모르셨을 뿐이에요. 오늘 그 패턴 하나만 알려드릴게요. 그럼 처음 보는 긴 단어도, 이제 망설임 없이 바로 읽으실 수 있게 되실 거예요.`,
  "02": `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 긴 단어 끝에 자주 붙는 '션', 그 소리 규칙 하나로 여러분이 왜 그렇게 많은 단어를 읽기 어려워했는지 짚어드리겠습니다.`,
  "03": `근데 궁금하지 않으세요? DECISION, TELEVISION, EXPANSION… 이렇게 끝 철자는 완전히 똑같은데, 왜 발음은 다 다르게 날까요? 혹시 이것도 하나하나 발음 기호를 외워야 아는 걸까요? 아니면 단어를 통째로 외워야 하는 걸까요?`,
  "04": `결론부터 말씀드릴게요. 발음 기호, 하나도 안 외우셔도 됩니다. 션으로 끝나는 단어는요, 사실 규칙이 딱 하나예요. 이 끝소리 바로 앞 글자 하나만 보면, 그 단어를 어떻게 읽어야 할지 저절로 알 수 있습니다. 저도 예전엔 이런 단어들을 볼 때마다 하나씩 따로 외웠었는데, 알고 보니까 그럴 필요가 전혀 없었더라고요.`,
  "05": `원리는 이렇습니다. 션 바로 앞 글자가 모음이거나, 또는 R이면, 목이 울리듯 부드럽게 '전' 소리가 나고요. 그 밖의 자음이면, 바람 빠지듯 가볍게 '션' 소리가 납니다. 사실 여러분은 이 소리, 이미 알고 계세요. TELEVISION, 우리가 '텔레비전'이라고 하잖아요. VISION 앞 글자가 모음 I죠? 그래서 '전'으로 울리는 거예요. 근데 EXPANSION은 다릅니다. 앞에 자음 N이 오니까, '익스팬션'처럼 바람 빠지는 '션' 소리가 나는 거죠.`,
  "06": `이 규칙, 다른 단어에도 그대로 통합니다. 볼까요? DECISION은 CI 다음이 모음 I니까 '디시전'. EXPLOSION도 O 다음이니까 '익스플로전'. OCCASION도 A 다음이라 '오케이전'이고요. R 뒤에 오는 단어도 똑같이 '전'이에요. VERSION, 우리가 이미 '버전'이라고 하시죠? CONVERSION도 마찬가지로 '컨버전'입니다. 반대로 그 밖의 자음 뒤에 오는 단어들도 봅시다. TENSION은 N 다음이라 '텐션'. MANSION도 N 다음이라 '맨션'. EXTENSION도 마찬가지로 '익스텐션'이죠. 이렇게 앞 글자 하나만 확인하면, 처음 보는 단어도 바로 읽을 수 있는 거예요.`,
  "07": `그럼 예외는 없을까요? 딱 한 가지만 조심하면 됩니다. S가 두 번 겹치는 단어예요. MISSION, PASSION, DISCUSSION처럼 SSION으로 끝나면, 앞 글자를 확인할 필요도 없이 무조건 '션'입니다. 이 경우만큼은 앞 글자를 보지 않고, S가 두 개 겹치는 순간 바로 '션'이라고 기억해 두시면 됩니다.`,
  "08": `그럼 직접 맞혀보세요. 첫 번째 단어, 어떻게 읽을까요? 잠깐 생각해 보세요. S 앞이 모음 U니까, '컨퓨전'입니다. 두 번째 단어는요? N 다음이니까, '디멘션'이죠. 마지막 문제, 이번엔 좀 다를 수 있어요. 세 번째 단어는요? 정답은, '익스프레션'입니다. S가 두 번 겹치는 예외였죠.`,
  "10": `자, 이제 직접 소리 내서 읽어보세요. 따라 읽다 보면 저절로 자신감이 붙으실 거예요. TELEVISION, 천천히. 텔, 레, 비, 전 — 이어서, 텔레비전! 다시 한 번, 좀 더 빠르게. 텔레비전, 텔레비전. 이번엔 EXPANSION이에요. 익스, 팬, 션 — 이어서, 익스팬션! 다시 한 번, 좀 더 빠르게. 익스팬션, 익스팬션. 마지막으로 R로 끝나는 경우도 같이 볼까요. CONVERSION이에요. 컨, 버, 전 — 이어서, 컨버전! 다시 한 번, 좀 더 빠르게. 컨버전, 컨버전.`,
  "11": `이제 정말 이 규칙 하나로, 처음 보는 단어도 바로 읽으실 수 있어요. 예를 들어 이 단어, 오늘 처음 보셨죠? 그래도 한번 볼까요. I 다음이니까, 모음이죠. 그럼 정답은, '수퍼비전'입니다. 하나 더 볼까요. 이것도 모음 뒤니까, '디비전'이에요. 하나만 더요. 이번엔 N 뒤니까, '펜션'이죠. 어떠세요, 낯선 단어들인데도 계속 바로 읽히시죠? 이게 바로 끝소리 하나로 단어 백 개가 저절로 읽히는 이유예요.`,
  "12": `오늘은 션으로 끝나는 단어, 바로 앞 글자가 모음이거나 R이면 전, 그 밖의 자음이면 션으로 정해진다는 원리, 그리고 S가 두 번 겹치면 무조건 션이 되는 예외까지 함께 봤습니다. 이제 뒤에 션이 붙은 패턴의 낯선 긴 단어를 봐도, 예전처럼 눈부터 피하지 않고 망설임 없이 바로 읽으실 수 있을 거예요. 다음에도 여러분이 자주 막막해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 자신 있게 읽고 계실 거예요.`,
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
