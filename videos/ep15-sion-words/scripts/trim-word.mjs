#!/usr/bin/env node
// Surgically remove one or more word-ranges from an already-generated WAV,
// using the exact whisper-measured timestamps in <id>.words.json — no TTS
// re-call needed. Splices out [cutFrom, cutTo] (seconds, from the words.json
// entries) with a short crossfade at each boundary to avoid a click, then
// rewrites both the WAV and the words.json (remaining word timestamps shifted
// back by the cumulative amount removed before them).
//
// Why this exists: EP15 Frame 8/11 answer-reveal clauses said the target
// English word aloud right before the Korean reading ("CONFUSION은
// '컨퓨전'입니다") — redundant once the word is already visible on screen.
// Cutting the audio is cheaper and more precise than a fresh TTS call.
//
// Usage: node scripts/trim-word.mjs <id> <wordIndex1> [wordIndex2] ...
//   Cuts from the END of the word BEFORE each given index (i.e. the start of
//   its pre-gap) through the END of that word itself, preserving the gap that
//   already existed AFTER it as the remaining pause.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [, , id, ...indexArgs] = process.argv;
if (!id || indexArgs.length === 0) {
  console.error("Usage: node scripts/trim-word.mjs <id> <wordIndex1> [wordIndex2] ...");
  process.exit(1);
}
const indices = indexArgs.map(Number).sort((a, b) => a - b);

const PROJECT_DIR = join(import.meta.dirname, "..");
const wavPath = join(PROJECT_DIR, "assets", "voice", `${id}.wav`);
const wordsPath = join(PROJECT_DIR, "assets", "voice", `${id}.words.json`);

const words = JSON.parse(readFileSync(wordsPath, "utf8"));

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
        channels: buf.readUInt16LE(offset + 10),
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
  return { fmt, pcm: buf.subarray(dataOffset, dataOffset + dataSize) };
}

function pcmToWav(pcm, { sampleRate, channels, bitsPerSample }) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const { fmt, pcm } = readWav(wavPath);
const bytesPerSample = fmt.bitsPerSample / 8; // mono, so blockAlign === bytesPerSample
const toSample = (sec) => Math.round(sec * fmt.sampleRate);
const CROSSFADE_MS = 8;
const crossfadeSamples = Math.round((fmt.sampleRate * CROSSFADE_MS) / 1000);

// Build the list of [cutFromSec, cutToSec] ranges, one per requested index.
const cuts = indices.map((idx) => {
  const target = words[idx];
  const prev = words[idx - 1];
  if (!target || !prev) throw new Error(`Index ${idx} out of range or has no predecessor`);
  return { cutFrom: prev.to, cutTo: target.to, label: target.word };
});

console.log(`${id}: removing ${cuts.length} word(s):`);
cuts.forEach((c) => console.log(`  "${c.label}" — cutting ${c.cutFrom.toFixed(3)}s to ${c.cutTo.toFixed(3)}s (${(c.cutTo - c.cutFrom).toFixed(3)}s removed)`));

// Read as Int16 samples for crossfade math.
const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / bytesPerSample);

// Build kept segments: [0, cut1.from) [cut1.to, cut2.from) ... [cutN.to, end)
// with a short linear crossfade applied at each boundary to avoid clicks.
const segments = [];
let cursor = 0;
for (const { cutFrom, cutTo } of cuts) {
  const cutFromSample = toSample(cutFrom);
  const cutToSample = toSample(cutTo);
  segments.push(samples.subarray(cursor, cutFromSample));
  cursor = cutToSample;
}
segments.push(samples.subarray(cursor));

// Concatenate with crossfade at each internal join.
let totalLen = segments.reduce((s, seg) => s + seg.length, 0);
const out = new Int16Array(totalLen);
let pos = 0;
for (let i = 0; i < segments.length; i++) {
  const seg = segments[i];
  if (i === 0) {
    out.set(seg, pos);
    pos += seg.length;
    continue;
  }
  // Crossfade the join between out[..pos) and this segment's head.
  const fadeLen = Math.min(crossfadeSamples, pos, seg.length);
  for (let k = 0; k < fadeLen; k++) {
    const t = k / fadeLen; // 0..1
    const a = out[pos - fadeLen + k];
    const b = seg[k];
    out[pos - fadeLen + k] = Math.round(a * (1 - t) + b * t);
  }
  // append the rest of seg (from fadeLen onward) right after the crossfaded region
  out.set(seg.subarray(fadeLen), pos);
  pos += seg.length - fadeLen;
}
const finalOut = out.subarray(0, pos);

const newPcm = Buffer.from(finalOut.buffer, finalOut.byteOffset, finalOut.length * bytesPerSample);
const newWav = pcmToWav(newPcm, fmt);
writeFileSync(wavPath, newWav);

// Rebuild words.json: drop the cut indices, shift everything after each cut
// back by that cut's duration (cumulative).
const cutIndexSet = new Set(indices);
let shift = 0;
let nextCutPtr = 0;
const newWords = [];
for (let i = 0; i < words.length; i++) {
  if (nextCutPtr < cuts.length && i === indices[nextCutPtr]) {
    shift += cuts[nextCutPtr].cutTo - cuts[nextCutPtr].cutFrom;
    nextCutPtr++;
    continue; // drop this word entirely
  }
  const w = words[i];
  newWords.push({ word: w.word, from: Number((w.from - shift).toFixed(3)), to: Number((w.to - shift).toFixed(3)) });
}
writeFileSync(wordsPath, JSON.stringify(newWords, null, 2));

const newDurationS = finalOut.length / fmt.sampleRate;
console.log(`New duration: ${newDurationS.toFixed(3)}s (was ${(pcm.length / bytesPerSample / fmt.sampleRate).toFixed(3)}s)`);
console.log(`Wrote ${wavPath} and ${wordsPath}`);
