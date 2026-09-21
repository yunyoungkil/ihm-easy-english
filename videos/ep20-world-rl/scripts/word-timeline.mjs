#!/usr/bin/env node
// Full word-by-word real-timing extraction for every EP20 scene's narration.
// Uses whisper + LCS-alignment against the exact SCRIPT text.
//
// Usage: node scripts/word-timeline.mjs [--only=01,02,03]
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
const NARRATION = {
  "01": `스마트폰 영어 학습 앱이나 번역기 켜놓고 혼자 발음 연습해 보신 적 있으시죠? 다른 단어는 척척 넘어가는데, 유독 'World'나 'Girl'만 나오면 죽어도 인식이 안 되고 시뻘건 오답 창이 떴던 답답한 경험, 한 번쯤 있으실 겁니다. 마이크에 입을 바짝 대고 턱이 빠져라 혀를 굴려가며 '워얼ㄹ드!'를 외쳐봐도, 화면에는 엉뚱하게 'Old'나 'Word'로 찍히며 속을 뒤집어 놓죠. 분명히 버터 발음으로 열심히 굴렸는데, 도대체 왜 내 입에서는 외계어 소리가 났을까요? 여러분의 혀가 굳어서가 절대 아닙니다. 혀를 굴릴수록 망가지는 치명적인 착각 때문입니다. 오늘 딱 7분만 투자해 보세요. 어려운 문법이나 발음 기호 싹 다 빼고, 초등학생도 1초 만에 따라 하는 비밀 공식으로 여러분의 굳었던 입을 시원하게 뚫어드립니다.`,
  "02": `많은 분들이 영어에 'R'이 들어가면 본능적으로 혀를 목구멍 안쪽으로 잔뜩 말아 올립니다. 노래를 따라 부르거나 혼자 단어를 읽을 때도, 혀를 잔뜩 굴리다가 바로 뒤에 'L'이 나오니까 그 말려있던 혀끝을 입천장에 억지로 갖다 붙이려고 용을 쓰죠. 그런데 결론부터 말씀드리면, 이 동작을 시도하는 순간 여러분의 발음은 이미 끝난 겁니다. 원어민들은 World를 소리 낼 때, 절대로 이런 피곤한 동작을 하지 않거든요.`,
  "03": `소리의 원리를 알면 아주 단순합니다. R은 혀를 목구멍 쪽으로 쑥 당기는 소리인데, 우리가 배운 보통의 L은 혀끝으로 앞쪽 입천장을 치는 소리입니다. 뒤로 가려는 힘과 앞으로 튀어나가려는 힘이 입안에서 정면충돌하니, 턱에 쥐가 나고 혀가 마비되는 건 당연한 일이죠. 스마트폰 앱이 내 발음을 못 알아들었던 이유도 여기에 있습니다. 급해진 입이 L을 아예 건너뛰고 '워드'로 뭉개버리거나, 반대로 혀에 힘이 풀리면서 '올드'라는 엉뚱한 소리가 튀어나왔던 것입니다.`,
  "04": `그렇다면 원어민은 이 끔찍한 충돌을 어떻게 피할까요? 비밀은 바로 '게으른 혀'에 있습니다. 놀랍게도 단어 끝이나 자음 앞에 붙는 L은, 혀끝을 부지런히 천장에 붙일 필요가 전혀 없습니다. R을 소리 내면서 이미 뒤로 당겨둔 그 편안한 자세를 그대로 둔 채, 목구멍 안쪽에서 '을' 하고 게으르게 소리만 흘려보내면 끝나거든요. 원어민은 혀끝으로 힘들게 소리를 만드는 게 아니라, 힘을 쏙 뺀 게으른 울림으로 소리를 냅니다.`,
  "05": `자, 이제 어려운 영어 철자는 싹 잊으시고 딱 두 가지만 입으로 따라 해보세요. 첫 번째! 붕어처럼 입술을 동그랗게 앞으로 쭉 내밀면서 '우'. 두 번째! 하품할 때처럼 턱에 힘을 툭 빼면서 '어~'. 이 두 소리를 자연스럽게 이어볼까요? '우~ 어~', 한 호흡으로 부드럽게 이으면 '워~'. 어떠세요? 혀를 억지로 굴리지 않았는데도 입술을 모았다가 턱 힘만 빼니까 아주 편안하게 '워~' 소리가 나오죠?`,
  "06": `자, 이제 두 번째 비밀 소리입니다. 여기서 절대 혀끝으로 천장을 치려고 달려들지 마세요. 방금 전 '워~' 하고 턱 힘을 뺀 그 상태 그대로, 침을 삼키듯 목구멍 뒤쪽에서 게으르게 '을' 소리를 내는 겁니다. 혀끝이 천장에 닿을락 말락 힘을 뺀 채로, 목구멍 근처만 묵직해지는 느낌이죠. 워~ 뒤에 숨어있는 그림자처럼 '을'. 혀끝을 억지로 천장에 딱 붙이지 않아도, 이 게으른 울림만으로 스마트폰 AI나 원어민 귀에는 가장 완벽한 소리로 들립니다.`,
  "07": `이제 이 소리들을 하나로 이어 붙여보겠습니다. 딱 네 글자만 기억하세요. 우, 어, 을, 드. 자, 천천히 소리 내볼까요? '우-어-을-드'. 이제 조금만 빠르게 연결해 보세요. '워~을드', 더 자연스럽게 이으면 '워~얼드'. 어떠세요? 턱에 힘주고 혀를 쥐어짜지 않았는데도, 놀라울 정도로 묵직하고 자연스러운 원어민의 World 소리가 내 입에서 그대로 터져 나오죠?`,
  "08": `이 게으른 혀의 원리를 알면, 성인 학습자 열에 아홉이 포기하던 단어 'Girl'도 딱 1초 만에 뚫립니다. Girl 역시 똑같은 쌍둥이 원리거든요. 혀를 굴리며 '그어얼ㄹ' 하고 애쓰지 마시고, 1단계로 턱 힘 빼고 한숨 쉬듯 '거~'. 그리고 그 뒤에 방금 배운 게으른 소리 '을'을 얹어주는 겁니다. '거~을'. 턱 근육이 전혀 아프지 않은데, 듣는 사람 귀에는 가장 세련된 Girl 소리가 완성됩니다.`,
  "09": `자, 퀴즈 들어가기 전에 딱 1초만 집중해 보세요! 도대체 Word(단어)와 World(세계)는 귀로 어떻게 구분할까요? 아주 간단합니다. Word는 L이 없으니까 중간 멈춤 없이 '워어-드'로 직진하고, World는 중간에 방금 배운 게으른 '을' 쿠션이 들어가서 '워어-을-드'로 묵직해집니다. 자, 그럼 여러분의 귀가 진짜 열렸는지 블라인드 테스트 들어갑니다! 제가 들려드리는 소리가 과연 A일까요, B일까요? 3초 안에 골라보세요! 정답은 바로 B였습니다! 소리 중간에 묵직하게 밟히는 '을' 쿠션 소리가 확실하게 들리셨죠? 이 소리가 귀에 꽂혔다면 여러분의 귀는 이미 원어민 소리를 완벽히 구별하고 계신 겁니다!`,
  "10": `마지막 2라운드 실전 밸런스 퀴즈입니다! 버블티 마실 때 '펄(Pearl)'을 추가하거나, 미용실에서 '컬(Curl)'을 넣어달라고 할 때 일상에서 정말 자주 쓰는 단어들인데요. 원어민처럼 혀 안 꼬이고 소리 내는 진짜 방법은 둘 중 무엇일까요? A! 혀끝을 입천장에 힘껏 튕긴다! B! 턱 힘 툭 빼고 게으른 '을'만 얹어준다! 3초 안에 선택해 보세요! 정답은 당연히 B입니다! '퍼~' 뒤에 게으른 '을'을 얹으면 Pearl, '커~' 뒤에 얹으면 Curl. 원리를 알고 나니 정말 싱거울 정도로 쉽게 풀리죠?`,
  "11": `오늘 배운 핵심을 딱 한 장으로 정리해 드립니다. 지금 이 화면을 스마트폰으로 꼭 캡처해 두세요! 첫째, 혀끝을 억지로 입천장에 붙이려고 용쓰지 않는다. 둘째, 입술을 모았다가 턱 힘을 툭 빼며 '우-어'를 먼저 만든다. 셋째, 목구멍 뒤쪽에서 게으르게 침 삼키듯 '을' 소리를 얹어준다. 이 세 가지만 기억하시면, 앞으로 어떤 영어 단어를 만나도 턱이 아프거나 혀가 꼬일 일은 영원히 없습니다.`,
  "12": `영어는 혀를 혹사시키며 무작정 굴리는 게 아니라, 소리가 지나가는 진짜 길을 이해하는 것입니다. 오늘 영상이 여러분의 오랜 발음 답답함을 시원하게 뚫어드렸다면, 구독과 좋아요로 함께해 주세요. 다음 시간에도 여러분의 귀와 입을 단숨에 열어주는 명쾌한 소리 공식으로 찾아뵙겠습니다. 오늘도 끝까지 함께해 주셔서 진심으로 감사합니다!`,
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
