#!/usr/bin/env node
// Regenerate ALL 13 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) instead of the shared media-use engine's
// HeyGen path. Needed because this project's original HeyGen voice
// (Marcia, 05f19352e8f74b0392a8f411eba40de1) came out female while the
// channel's confirmed on-screen presenter is male — same root cause EP12 hit,
// same fix (see knowledge/episodes/ep11-gonna.md, decisions/2026-09-04-no-word-level-captions-with-gemini-tts.md).
//
// Gemini gives no word-level timestamps (unlike HeyGen), so each voice entry
// gets words: [] — captions.mjs's documented "no words -> legal skip" then
// makes assemble-index.mjs omit the captions track automatically, which is
// exactly the outcome the no-word-level-captions-with-Gemini-TTS decision
// asks for. No manual caption wiring needed here.
//
// Usage: node scripts/regen-tts-gemini.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOICE,
  AUDIO_FORMAT,
  loadApiKey,
  synthesize,
  pcmToWav,
  sampleRateFromMime,
  estimateCost,
  appendLedger,
  won,
} from "../../../scripts/tts-config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");

function parseUserScript(txt) {
  const out = [];
  let cur = null;
  for (const line of txt.split(/\r?\n/)) {
    const h = line.match(/^\[Scene\s+(\d+)/i);
    if (h) {
      if (cur) out.push(cur);
      cur = { frame: Number(h[1]), text: "" };
      continue;
    }
    if (cur && line.trim()) cur.text = (cur.text ? cur.text + " " : "") + line.trim();
  }
  if (cur) out.push(cur);
  return out;
}

const scriptPath = join(PROJECT_DIR, "user_script.txt");
const lines = parseUserScript(readFileSync(scriptPath, "utf8"));
console.log(`Parsed ${lines.length} scenes from user_script.txt`);
if (lines.length !== 13) {
  console.error(`Expected 13 scenes, got ${lines.length} — aborting.`);
  process.exit(1);
}

const { key: apiKey } = loadApiKey();

// Pre-flight cost estimate using the ORIGINAL HeyGen durations as a proxy
// (narration text is ~unchanged except 2 short lines) — report in KRW before
// spending, per project convention.
const engineMetaPath = join(PROJECT_DIR, "audio_engine_meta.json");
const engineMeta = JSON.parse(readFileSync(engineMetaPath, "utf8"));
const proxySeconds = engineMeta.voices.reduce((s, v) => s + (v.duration_s ?? 0), 0);
const preEstimate = estimateCost({
  inputChars: lines.reduce((s, l) => s + l.text.length, 0),
  audioSeconds: proxySeconds,
});
console.log(
  `Pre-flight estimate (using original ${proxySeconds.toFixed(1)}s as a proxy): ` +
    `~${won(preEstimate.krw)} (${preEstimate.usd.toFixed(4)} USD) for 13 calls, ` +
    `free tier covers ${VOICE.model === "gemini-3.1-flash-tts-preview" ? "10/day" : "?"} of them.`,
);

const pad2 = (n) => String(n).padStart(2, "0");
const results = [];
let totalUsd = 0;

async function synthesizeWithRetry(text, key, delivery, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await synthesize(text, key, delivery);
    } catch (e) {
      lastErr = e;
      if (/SAFETY/.test(String(e.message)) && i < tries - 1) {
        console.log(`  (transient SAFETY false-positive, retry ${i + 1}/${tries - 1})`);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

for (const line of lines) {
  const id = pad2(line.frame);
  process.stdout.write(`Scene ${id}: generating (${line.text.length} chars)... `);
  const { pcm, mimeType, usage } = await synthesizeWithRetry(line.text, apiKey, {});
  const rate = sampleRateFromMime(mimeType);
  if (rate !== AUDIO_FORMAT.sampleRate) {
    throw new Error(`Scene ${id}: response rate=${rate}, expected ${AUDIO_FORMAT.sampleRate} (mimeType=${mimeType})`);
  }
  const wav = pcmToWav(pcm, AUDIO_FORMAT);
  const relPath = `assets/voice/${id}.wav`;
  writeFileSync(join(PROJECT_DIR, relPath), wav);

  const durationS = Number((wav.length - 44) / (AUDIO_FORMAT.sampleRate * (AUDIO_FORMAT.bitsPerSample / 8) * AUDIO_FORMAT.channels));
  const audioTokens = usage?.candidatesTokenCount ?? Math.ceil(durationS * 32);
  const inputTokens = usage?.promptTokenCount ?? line.text.length;
  const usd = (inputTokens / 1e6) * 1.0 + (audioTokens / 1e6) * 20.0;
  totalUsd += usd;

  appendLedger({
    episode: "ep11-longform-faceless",
    scene: id,
    chars: line.text.length,
    audioSeconds: durationS,
    audioTokens,
    inputTokens,
    usd,
    billed: usage != null,
  });

  console.log(`${durationS.toFixed(3)}s, ${won(usd * 1443)}`);
  results.push({ frame: line.frame, id, path: relPath, duration_s: Number(durationS.toFixed(3)), words: [] });
}

console.log(`\nTotal: ${results.length} scenes, ${won(totalUsd * 1443)} (${totalUsd.toFixed(4)} USD)`);

// Splice into audio_meta.json (frame-keyed) and audio_engine_meta.json (id-keyed) —
// same shape regen-line.mjs uses, so the rest of the pipeline (sync-durations,
// assemble-index) needs no changes.
const metaPath = join(PROJECT_DIR, "audio_meta.json");
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
meta.voices = results.map((r) => ({ frame: r.frame, path: r.path, duration_s: r.duration_s, words: r.words }));
writeFileSync(metaPath, JSON.stringify(meta, null, 2));

engineMeta.voices = results.map((r) => ({ id: r.id, path: r.path, duration_s: r.duration_s, words: r.words }));
engineMeta.tts_provider = "gemini";
engineMeta.voice_id = VOICE.model + ":" + VOICE.name;
writeFileSync(engineMetaPath, JSON.stringify(engineMeta, null, 2));

console.log("audio_meta.json / audio_engine_meta.json updated.");
console.log(
  "\nNext: sync-durations, delete stale compositions/captions.html + caption_groups.json + " +
    "caption-overrides.json (words are now empty — legal caption skip), assemble-index.mjs, transitions.mjs, npm run check.",
);
