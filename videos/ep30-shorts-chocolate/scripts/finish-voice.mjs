#!/usr/bin/env node
// assets/voice/_ai-studio-raw/nNN.wav(화면에서 받은 원본) -> assets/voice/nNN.wav(data 구간만 다시 감쌈) + nNN.words.json(whisper small 실측) + 요약 JSON. 2026-11-16.
//   EP30_SCRATCH=<임시 폴더> node finish-voice.mjs --summary=<요약.json>
// 원본은 지우지 않는다. 문장은 비교 시트에서 읽는다(글자는 바꾸지 않는다). 단어 시각은 whisper가 들은 글자 구간에 대본 글자를 맞춰(LCS) 얻는다(어제 align-words.mjs와 같은 방식).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { transcribe } from "@remotion/install-whisper-cpp";
import { unwrapRiff, wavOf } from "./make-voice.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const VOICE_DIR = join(HERE, "..", "assets", "voice");
const RAW_DIR = join(VOICE_DIR, "_ai-studio-raw");
const SCRATCH = process.env.EP30_SCRATCH;
if (!SCRATCH) throw new Error("EP30_SCRATCH(임시 폴더)를 환경변수로 준다");
mkdirSync(SCRATCH, { recursive: true });
const summaryPath = process.argv.find((a) => a.startsWith("--summary="))?.slice(10);

const sheet = JSON.parse(readFileSync(join(ROOT, "data/youtube/transform-sheets/SbQVBQoRciA.json"), "utf8"));
const cuts = sheet.rows.find((r) => r.key === "visual").ours.cutPlan.cuts;

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

/** 20ms 창 RMS가 임계를 넘는 첫·끝 시각(초) */
function voiced(pcm, rate, thr = 200) {
  const w = Math.round(rate * 0.02), n = pcm.length / 2;
  let first = null, last = null;
  for (let s = 0; s + w <= n; s += w) {
    let e = 0; for (let k = s; k < s + w; k++) e += pcm.readInt16LE(k * 2) ** 2;
    if (Math.sqrt(e / w) > thr) { if (first === null) first = s / rate; last = (s + w) / rate; }
  }
  return { first, last };
}

const summary = [];
for (let n = 0; n < cuts.length; n++) {
  const id = `n${String(n + 1).padStart(2, "0")}`;
  const rawPath = join(RAW_DIR, `${id}.wav`);
  if (!existsSync(rawPath)) { summary.push({ id, missing: true }); continue; }
  const raw = readFileSync(rawPath);
  const chunks = []; for (let off = 12; off + 8 <= raw.length;) { const cid = raw.toString("latin1", off, off + 4), sz = raw.readUInt32LE(off + 4); chunks.push(`${cid}:${sz}`); off += 8 + sz + (sz % 2); }
  const { pcm, rate } = unwrapRiff(raw);
  const out = join(VOICE_DIR, `${id}.wav`);
  writeFileSync(out, wavOf(pcm, rate));
  const dur = pcm.length / 2 / rate, v = voiced(pcm, rate);
  const text = cuts[n].narration, chars = [...text].filter((c) => /\S/.test(c) && !/[.,?!'"]/.test(c)).length;

  const wav16 = join(SCRATCH, `${id}_16k.wav`);
  execFileSync("ffmpeg", ["-y", "-i", out, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav16, "-loglevel", "error"]);
  const res = await transcribe({ inputPath: wav16, model: "small", tokenLevelTimestamps: false, tokensPerItem: 0, whisperPath: join(ROOT, ".whisper"), whisperCppVersion: "1.5.5", language: "ko" });
  const { t, matched, total } = align(text, toChars(res.transcription));
  const words = []; let pos = 0;
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const start = text.indexOf(w, pos); pos = start + w.length;
    const hit = t.slice(start, start + w.length).filter(Boolean);
    words.push(hit.length ? { word: w, from: +(Math.min(...hit.map((h) => h.from)) / 1000).toFixed(3), to: +(Math.max(...hit.map((h) => h.to)) / 1000).toFixed(3) } : { word: w, from: null, to: null, guessed: true });
  }
  words.forEach((w, i) => {
    if (!w.guessed) return;
    const prev = words.slice(0, i).reverse().find((x) => x.to !== null), next = words.slice(i + 1).find((x) => x.from !== null);
    w.from = prev ? prev.to : next.from; w.to = next ? next.from : prev.to;
  });
  writeFileSync(join(VOICE_DIR, `${id}.words.json`), JSON.stringify(words, null, 2));
  summary.push({ id, t: cuts[n].t, text, rawChunks: chunks.join(" "), rate, dur: +dur.toFixed(3), voicedFrom: v.first, voicedTo: v.last, chars, cps: +(chars / (v.last - v.first)).toFixed(2), heard: res.transcription.map((x) => x.text).join("").trim(), matched, total, guessed: words.filter((w) => w.guessed).length, words });
  console.log(id, dur.toFixed(2), "heard:", summary.at(-1).heard);
}
if (summaryPath) writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
