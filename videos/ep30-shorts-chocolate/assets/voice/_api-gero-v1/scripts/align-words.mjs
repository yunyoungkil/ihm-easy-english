#!/usr/bin/env node
// assets/voice/nNN.wav -> nNN.words.json ([{word, from, to}], 그 파일 0초 기준) + 받아쓰기 결과 출력.
// 단어 시각은 whisper가 들은 글자 구간에 대본 글자를 맞춰(LCS) 얻는다. 대본 문장은 비교 시트에서 읽는다.
//   node align-words.mjs [--only=n01,n02]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transcribe } from "@remotion/install-whisper-cpp";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const VOICE_DIR = join(HERE, "..", "assets", "voice");
const SCRATCH = process.env.EP30_SCRATCH;
if (!SCRATCH) throw new Error("EP30_SCRATCH(임시 폴더)를 환경변수로 준다");
mkdirSync(SCRATCH, { recursive: true });
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1].split(",") ?? null;

const sheet = JSON.parse(readFileSync(join(ROOT, "data/youtube/transform-sheets/SbQVBQoRciA.json"), "utf8"));
const cuts = sheet.rows.find((r) => r.key === "visual").ours.cutPlan.cuts;

// whisper 구간(ms) -> 글자별 시각(구간 안에서 균등 배분)
function toChars(items) {
  const out = [];
  for (const it of items) {
    const chars = [...(it.text ?? "")];
    const from = it.offsets.from, span = Math.max(it.offsets.to - from, 1);
    chars.forEach((c, i) => out.push({ c, from: from + (span * i) / chars.length, to: from + (span * (i + 1)) / chars.length }));
  }
  return out;
}
const norm = (c) => (/[\s'",.?!]/.test(c) ? "" : c.toLowerCase());

function align(script, heard) {
  const a = [...script].map(norm), b = heard.map((h) => norm(h.c)), w = b.length + 1;
  const dp = new Int32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    dp[i * w + j] = a[i] && a[i] === b[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
  const t = new Array(a.length).fill(null);
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] && a[i] === b[j]) { t[i] = { from: heard[j].from, to: heard[j].to }; i++; j++; }
    else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++; else j++;
  }
  return { t, matched: t.filter(Boolean).length, total: a.filter(Boolean).length };
}

for (let n = 0; n < cuts.length; n++) {
  const id = `n${String(n + 1).padStart(2, "0")}`;
  const wav = join(VOICE_DIR, `${id}.wav`);
  if ((only && !only.includes(id)) || !existsSync(wav)) continue;
  const wav16 = join(SCRATCH, `${id}_16k.wav`);
  execFileSync("ffmpeg", ["-y", "-i", wav, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav16, "-loglevel", "error"]);
  const res = await transcribe({
    inputPath: wav16, model: "small", tokenLevelTimestamps: false, tokensPerItem: 0,
    whisperPath: join(ROOT, ".whisper"), whisperCppVersion: "1.5.5", language: "ko",
  });
  const heard = toChars(res.transcription);
  const text = cuts[n].narration;
  const { t, matched, total } = align(text, heard);
  // 단어(공백 단위)마다 맞춘 글자의 처음~끝. 맞춘 글자가 하나도 없는 단어는 앞 단어 끝~뒤 단어 시작 사이로 두고 guessed:true로 표시한다.
  const words = [];
  let pos = 0;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const start = text.indexOf(w, pos); pos = start + w.length;
    const hit = t.slice(start, start + w.length).filter(Boolean);
    words.push(hit.length
      ? { word: w, from: +(Math.min(...hit.map((h) => h.from)) / 1000).toFixed(3), to: +(Math.max(...hit.map((h) => h.to)) / 1000).toFixed(3) }
      : { word: w, from: null, to: null, guessed: true });
  }
  words.forEach((w, i) => {
    if (!w.guessed) return;
    const prev = words.slice(0, i).reverse().find((x) => x.to !== null);
    const next = words.slice(i + 1).find((x) => x.from !== null);
    w.from = prev ? prev.to : next.from; w.to = next ? next.from : prev.to;
  });
  writeFileSync(join(VOICE_DIR, `${id}.words.json`), JSON.stringify(words, null, 2));
  const heardText = res.transcription.map((x) => x.text).join("").trim();
  console.log(JSON.stringify({ id, matched, total, words: words.length, guessed: words.filter((w) => w.guessed).length, first: words[0]?.from, last: words.at(-1)?.to, heard: heardText }));
}
