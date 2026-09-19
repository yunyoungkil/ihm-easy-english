#!/usr/bin/env node
// Full word-by-word real-timing extraction for every EP19 scene's narration —
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
  "01": `동사로 움직일 때 to estimate는 '에스티메이트'인데, 명사 서류 an estimate는 왜 '에스티멋'일까요? to graduate는 '그래듀에이트'인데, a graduate는 왜 '그래듀엇'일까요? 스펠링은 분명 100% 똑같은데, 방금 끝소리가 완전히 다르게 끝나는 것 들으셨나요? 오늘 이 기준 하나만 알면, 단어마다 사전을 뒤지지 않아도 입에서 바로 구분됩니다.`,
  "02": `안녕하세요, 「이해하면 쉬운영어」입니다. 단어마다 따로 외우지 마세요. 움직이는 행동, 즉 동사일 땐 '에이트'로 당당하게 소리 나고, 이름이나 상태, 즉 명사나 형용사일 땐 힘 빠진 '엇'으로 소리가 바뀝니다. 단어의 자리가 소리를 결정합니다.`,
  "03": `왜 이런 차이가 생길까요? 사전을 찾아보면 두 단어 모두 맨 앞 음절에 가장 센 제1강세가 있습니다. 진짜 차이는 맨 끝의 -ate 소리에 힘을 주느냐, 완전히 빼버리느냐에 있습니다. 무언가를 행동하는 동사는 동작을 확실하게 끝맺어야 하니까, 맨 끝의 -ate 소리에도 보조 에너지를 살려서 '에이트!' 하고 또렷하게 발음합니다. 반대로 사물의 이름이나 상태는 첫머리만 들려주면 무슨 단어인지 다 알기 때문에, 끝에 있는 -ate 소리에는 아무런 힘도 주지 않고 목구멍의 힘을 툭 빼버립니다. 에너지를 0%로 완전히 빼버리니 힘 빠진 '엇' 하고 자연스럽게 쪼그라드는 것이죠.`,
  "04": `저도 예전에 해외 직구나 이메일에서 estimate를 볼 때마다 '에스티메이트'로만 읽었었는데, 원어민들은 자꾸 '에스티멋'이라고 하더라고요. 이제 이유를 아시겠죠? '견적을 내다'라는 행동일 땐 뒤를 힘차게 밀어서 to estimate. 반대로 '견적서'라는 명사 서류일 땐 첫 글자만 세게 치고 뒤는 턱의 힘을 툭 빼서 an estimate. 입술과 턱에 힘을 완전히 빼고 가볍게 3번 소리 내보실까요? an estimate, an estimate, an estimate. 턱이 툭 떨어지며 편안해지는 게 느껴지시죠?`,
  "05": `두 번째는 해외 식당에서 계산할 때 무조건 쓰는 separate입니다. 식당에서 "계산 따로따로 해주세요" 할 때 원어민들은 뭐라고 할까요? '따로따로의'라는 상태를 나타내니까 앞만 쾅 치고 뒤는 힘을 뺍니다. separate check! '세퍼레이트'가 아니라 '세퍼럿 체크'라고 해야 원어민 귀에 한 번에 꽂힙니다. 반대로 무언가를 '나누다'라는 행동일 땐 뒤를 살려 to separate. 자, 식당에서 주문하듯 형용사 소리를 3번 따라 해보겠습니다. separate, separate, separate. 앞글자만 치고 뒤를 버리니 입이 정말 편하죠?`,
  "06": `세 번째는 학교와 자격증에 나오는 단어들입니다. '졸업하다'라는 행동일 땐 to graduate, 당당하게 '에이트'로 소리 냅니다. 하지만 '졸업생'이라는 명사가 되면 a graduate, '그래듀엇'으로 힘이 빠집니다. 우리가 자격증이나 호텔 예약할 때 보는 certificate도 마찬가지입니다. 스펠링만 보고 습관적으로 '서티피케이트'라고 읽으셨을 텐데요. 증명서라는 이름표니까 끝에 힘을 툭 빼서 certificate, '서티피킷' 하고 줄여 읽어야 원어민이 한 번에 알아듣습니다. 소리 내어 3번 연습해 볼까요? certificate, certificate, certificate. 이제 어려운 고급 단어들도 원리가 한 손에 잡히실 겁니다.`,
  "07": `그런데 놀랍게도, 여러분은 이미 평생 동안 이 규칙을 입으로 쓰고 계셨습니다. 우리가 매일 맛있게 먹는 초콜릿의 영어 스펠링을 볼까요? c, h, o, c, o, l, a, t, e. 끝이 분명 -ate 철자로 끝나죠. 만약 이 단어가 동사였다면 우리는 평생 '초콜레이트'라고 불렀을 겁니다. 하지만 달콤한 간식의 이름, 즉 명사이기 때문에 첫머리에만 힘을 주고 뒤는 힘이 툭 빠져서 chocolate, '초콜릿'으로 굳어진 것입니다. 기후를 뜻하는 climate도 '클라이멋', 개인적인을 뜻하는 private도 '프라이벗'인 이유가 바로 여기에 있습니다. 우리 혀는 이미 정답을 알고 있었던 것이죠.`,
  "10": `그럼 실제 문장 속에서는 원어민 소리가 어떻게 날아올까요? 두 문장을 연달아 들어보겠습니다. 첫 번째, "Can you estimate the cost?"에서는 '추정하다'라는 동사라 estimate, '에스티메이트'가 또렷하게 꽂힙니다. 반대로 두 번째, "Send me the estimate."에서는 '견적서'라는 명사라 estimate, 힘이 쑥 빠진 '에스티멋'으로 툭 떨어집니다. 문장 속에서도 두 소리의 자리가 선명하게 갈라지죠?`,
  "11": `오늘 배운 핵심, 딱 이 한 장만 기억하시면 됩니다. -ate 철자로 끝나는 단어를 만났을 때, 행동하는 동사라면 끝까지 힘을 살려 '에이트'! 사람이나 사물의 이름, 상태를 나타낸다면 뒤를 툭 떨어뜨려 '엇' 또는 '잇'! 이 소리 공식 하나만 마음에 품으시면 수십 개의 고급 단어가 저절로 정복됩니다.`,
  "12": `이제 미드나 일상에서 -ate 단어를 만나도 전혀 멈칫하실 필요가 없습니다. 소리의 원리를 이해한 여러분의 귀는 이미 한 걸음 더 앞서가고 있으니까요. 오늘 내용이 도움이 되셨다면 구독과 좋아요 부탁드립니다. 오늘도 함께해 주셔서 감사합니다.`,
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
