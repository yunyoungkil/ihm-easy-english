#!/usr/bin/env node
// Full word-by-word real-timing extraction for every EP14 scene's narration —
// not just the "key" linking words, the ENTIRE script text. Reuses the
// whisper+LCS-alignment method already proven in scripts/generate-highlights.mjs
// (Remotion pipeline, EP6-10) rather than reinventing it: functions below are
// copied (not imported — that file is legacy/frozen) from there almost
// verbatim (readWav, measureSpeechSpan, calibrationFor/calibrateChars,
// findSpeechOnsets, segmentsToChars, alignNarrationToTimeline).
//
// Why the segment pass, not the token pass: the token pass gives fine timing
// but corrupts Korean (documented repeatedly in this project). The segment
// pass gives clean text at coarser (~4-7s) granularity; aligning the KNOWN
// correct script text onto that segment timeline via LCS (alignNarrationToTimeline)
// recovers per-character accuracy without the corruption — this is exactly
// how EP6-10's highlightAt was built.
//
// Usage: node scripts/word-timeline.mjs [--only=05,06,07,08,10]  (default: all 12)
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

// Exact narration text per scene (must match SCRIPT.md / what was sent to TTS).
const NARRATION = {
  "01": `단어는 분명 다 아는 건데, 원어민이 문장으로 말하면 하나도 안 들리신 적 있으시죠? 분명 하나하나 뜯어보면 다 아는 단어인데, 막상 영화나 유튜브에서 들으면 완전히 다른 소리처럼 들려서 당황하신 적, 다들 있으실 거예요. 이거, 여러분 리스닝 실력이 부족해서가 아닙니다. 원어민이 진짜로 무슨 소리를 내고 있는지, 그 원리를 아직 안 배우셨을 뿐이에요.`,
  "02": `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 원어민 말이 왜 한 덩어리로 들리는지, 그 진짜 원리를 함께 보시죠.`,
  "03": `그런데 궁금하지 않으세요? 왜 유독 원어민이 말할 때는 단어와 단어 사이가 딱딱 끊어지지 않고 뭉쳐서 들릴까요? 교과서에서 배운 발음이랑, 실제로 듣는 소리가 왜 이렇게 다를까요? 혹시 원어민들이 그냥 발음을 대충 하는 걸까요?`,
  "04": `결론부터 말씀드릴게요. 대충 하는 게 아닙니다. 오히려 정반대예요. 원어민들은 혀를 최대한 편하게, 힘을 빼고 움직이려다 보니까, 자연스럽게 소리와 소리가 이어 붙는 겁니다. 그러니까 교과서처럼 한 글자씩 또박또박 끊어 말하는 게 오히려 더 힘이 드는 방식인 거예요. 저도 공부하기 전엔 이걸 몰라서 무슨 말을 하는지 하나도 몰랐는데, 알고 보니까 그냥 힘 안 들이고 편하게 말하다 보니 그렇게 되는 거였어요.`,
  "05": `원리는 이렇습니다. 앞 단어가 자음으로 끝나고 뒤 단어가 모음으로 시작하면, 혀가 그 자음 소리를 굳이 앞 단어에 남겨두지 않고 뒤 단어 쪽으로 슬쩍 넘겨서 붙여버려요. 예를 들어 AN APPLE, 볼게요. AN은 N으로 끝나고, APPLE은 A라는 모음으로 시작하죠. 이걸 따로따로 말하면 '앤, 애플'이 되는데, 혀에 힘을 빼고 자연스럽게 이어 붙이면 그 N이 APPLE 앞으로 넘어가서 '어 내플'처럼 들리게 됩니다. 억지로 붙이는 게 아니라, 힘을 빼면 저절로 이렇게 되는 거예요.`,
  "06": `그럼 이게 문장 전체에서도 통하는지 볼까요? "Where were we?" 이 짧은 문장, 한번 들어보세요. 하나하나 또박또박 끊어 말하면 '웨어, 워, 위'인데, 원어민이 자연스럽게 말하면 '웨어루이'처럼 들려요. WERE는 문장에서 그렇게 중요한 단어가 아니라서, 힘이 빠지면서 소리가 확 줄어들어요. 그러다 보니 WHERE의 R이랑 WE 사이에서 뭉개지듯 이어지면서 '루'처럼 들리는 거죠. 아까 AN APPLE 때랑 방식은 조금 다르지만, 힘을 빼면 소리가 자연스럽게 붙는다는 원리는 여기서도 똑같이 통하는 거예요.`,
  "07": `그럼 예외는 없을까요? 방금 건 소리가 그냥 옆으로 넘어가서 붙는 거였잖아요. 근데 MADE IT처럼 T나 D가 낄 때는 조금 다르게 움직여요. 한번 들어보세요. MADE IT, 이걸 원어민이 편하게 말하면 '메이릿'처럼 들립니다. MADE 끝소리 D가 바로 뒤 IT의 모음과 앞 모음 사이에 끼면, 혀가 그 D 소리를 정확하게 내는 대신, 혀끝으로 톡 튕기듯이 살짝 스치고 지나가요. 그래서 D가 우리 귀에는 마치 'ㄹ' 소리처럼 들리는 거죠. 이것도 대충 하는 게 아니라, 미국 영어에서 아주 표준적으로 쓰이는 방식이에요.`,
  "08": `직접 맞혀보세요. TURN ON, 어떻게 이어질까요? 잠깐 생각해 보세요. N이 ON 쪽으로 넘어가서, '터논'입니다. 하나 더요. CHECK OUT은요? … K가 OUT 쪽으로 넘어가서, '체카웃'이죠. 이번엔 좀 다른 문제예요. GET IT, T가 낄 때는 어떻게 들릴까요? … 정답은 '게릿', T가 모음 사이에서 톡 튕기니까요. 마지막으로 PUT IT은요? … 정답은 '푸릿', 역시 T가 톡 튕기니까요.`,
  "10": `자, 이제 직접해보세요. 따라하다 보면 자연스럽게 늘어 있을 거예요. TURN ON, 천천히. 터, 논 — 이어 붙이면, 터논! 다시 한 번, 좀 더 빠르게. 터논, 터논. 이번엔 CHECK OUT이에요. 체, 카웃 — 이어 붙이면, 체카웃! 다시 한 번, 좀 더 빠르게. 체카웃, 체카웃. 이번엔 예외도 같이 해볼까요? GET IT이에요. T가 모음 사이에 있으니까 톡 튕기죠. 게, 릿 — 이어 붙이면, 게릿! 다시 한 번, 좀 더 빠르게. 게릿, 게릿. 마지막으로 PUT IT. 푸, 릿 — 이어 붙이면, 푸릿! 다시 한 번, 좀 더 빠르게. 푸릿, 푸릿.`,
  "11": `이제 영화나 유튜브를 보다가 게으른 소리가 나와도 당황하지 않으실 거예요. 예를 들어 "Where were we?"라는 문장도 이렇게 들리거든요. 바로 다 안 들려도 괜찮아요. 배운 대로 소리 하나씩 힘 빼고 들어보면, 웨어, 루, 이 — 웨어루이! 이렇게 시간이 걸리더라도 스스로 알아들을 수 있게 되실 거예요. 이제 단어 하나하나가 아니라, 문장으로 들리기 시작하실 겁니다.`,
  "12": `오늘은 원어민이 대충 뭉개서 말하는 게 아니라, 혀에 힘을 빼고 편하게 소리를 이어 붙인다는 원리, 그리고 T나 D가 낄 때는 톡 튕기는 소리로 바뀐다는 것까지 함께 봤습니다. 이제 문장을 들을 때 예전처럼 막막하지 않으셨으면 좋겠어요. 다음에도 여러분이 자주 답답해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 편하게 듣고 계실 거예요.`,
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

// ---------- word grouping (new — chars -> words on whitespace) ----------

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
    throw new Error(`Scene ${id}: alignment produced nothing — check NARRATION text matches SCRIPT.md exactly`);
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
