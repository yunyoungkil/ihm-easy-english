#!/usr/bin/env node
// Generate all 11 EP21 narration lines via local Voicebox TTS (profile "1",
// the user's own trained voice — re-cloned 2026-09-30 after the original
// profile "2" was found deleted from Voicebox's live DB, see TASKS.md)
// instead of the channel's usual Gemini Charon pipeline (scripts/tts-config.mjs).
// Voicebox runs 100% locally on GPU — no per-call cost, so there's no
// confirmSpend()-style paid-usage gate here.
//
// Text is parsed directly from ../SCRIPT.md's indented narration blocks at
// runtime rather than hardcoded — the Gemini-era per-episode scripts
// (gen-tts-gemini.mjs + word-timeline.mjs) each hardcode the same narration
// separately with a "MUST match" comment; parsing from SCRIPT.md removes
// that manual-sync fragility.
//
// Line 9 (3-second countdown quiz) is written in SCRIPT.md as three blocks:
// setup / a literal "..." pause paragraph / reveal. This script speaks
// setup+reveal as "09a"+"09b" and inserts 3s of real silence between them,
// merged into 09.wav — same composite pattern EP20 used for its Frame 9/10
// quizzes (videos/ep20-world-rl/scripts/gen-tts-gemini.mjs).
//
// Line 6 (two fill-in-blank quotes, e.g. "The... in this city gets better
// every year.") gets the same composite treatment for a different reason:
// 2026-09-30 whisper re-transcription of the old 06.wav found that quoted
// sentence missing ENTIRELY from the audio — a single generate() call asked
// to render an embedded "..." pause silently drops everything after it
// (matches github.com/jamiepine/voicebox#1108, not exposed via the HTTP API).
// splitLine6ForPauses() + generateSegmentedComposite() split it into 3 pieces
// around both blanks and splice 900ms of real silence ourselves instead.
//
// Requires the Voicebox server running locally (http://127.0.0.1:17493) —
// start it via the Voicebox desktop app if `/health` doesn't respond.
//
// Voicebox's known failure mode: TTS output cuts off abruptly right at the
// very last word instead of decaying naturally — confirmed 2026-09-29 that
// simply rewriting the trailing "." as "..." was NOT sufficient on its own.
//
// Real fix (per user, 2026-09-29): whatever word is literally last in a
// generation always risks getting clipped/mangled — so never let the REAL
// content be that last word. appendSacrificialTail() appends a disposable
// " 끝." sentence after the real narration text before sending it to
// Voicebox; the model then has to produce a real narration→pause→"끝"
// sequence, so the real content's ending sits in the MIDDLE of the clip
// (never truncated) and only the disposable "끝" (which we discard) can be
// clipped. findSacrificialCutPoint() locates that boundary pause via an RMS
// silence scan from the end of the clip and trims everything from there
// onward. A short (~40ms) applyFadeOut() at the exact trim point is a pure
// click-prevention safety net (the splice itself, not the original cutoff
// bug) — trimming PCM at an arbitrary sample can leave a discontinuity even
// when the underlying audio there is already near-silent.
//
// Usage: node scripts/gen-tts-voicebox.mjs [--only=01,02,03] [--dry-run]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");
mkdirSync(VOICE_DIR, { recursive: true });

const VOICEBOX_BASE = "http://127.0.0.1:17493";
// Profile "1" (2026-09-30) — the previous profile "2" (c2a27c0d-...) was found
// deleted from Voicebox's live DB this session (0 profile_samples left, no
// recoverable reference audio — see TASKS.md "긴급 발견 1"). User deleted all
// old generations and re-registered a fresh clone as profile "1"; this is the
// new source of truth.
const PROFILE_ID = "92b277e2-fe6c-485b-8c1e-eab089b14a6d";
const LANGUAGE = "ko";
const ENGINE = "qwen";
const MODEL_SIZE = "1.7B";
// Fixed seed (2026-09-30, per GitHub jamiepine/voicebox#242): Voicebox
// defaults to seed=-1 (random per call), which the community confirmed causes
// per-generation tone/pitch drift even for the same profile and text. Pinning
// one value keeps all 13 pieces in the same take's "character" instead of
// each rolling independently.
const SEED = 421021;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",") : null;

// ---------------------------------------------------------------------------
// Parse narration text directly from SCRIPT.md (single source of truth —
// see file header comment for why this beats hardcoding a second copy).
// ---------------------------------------------------------------------------
function parseScriptNarration() {
  const scriptPath = join(PROJECT_DIR, "SCRIPT.md");
  const text = readFileSync(scriptPath, "utf8");
  const rawLines = text.split("\n");
  const blocks = [];
  let cur = [];
  for (const l of rawLines) {
    // Narration paragraphs are indented with exactly 4 spaces (not 5+, which
    // would be a nested list under a `-` bullet elsewhere in the file).
    if (l.startsWith("    ") && !l.startsWith("     ") && l.trim()) {
      cur.push(l.trim());
    } else if (cur.length) {
      blocks.push(cur);
      cur = [];
    }
  }
  if (cur.length) blocks.push(cur);

  if (blocks.length !== 13) {
    throw new Error(
      `Expected 13 narration blocks (Line1-8 + Line9 setup/pause/reveal + Line10-11), found ${blocks.length}. ` +
        `SCRIPT.md structure changed since this parser was written — fix parseScriptNarration() before generating.`
    );
  }

  return {
    "01": blocks[0][0],
    "02": blocks[1][0],
    "03": blocks[2][0],
    "04": blocks[3][0],
    "05": blocks[4][0],
    "06": blocks[5][0],
    "07": blocks[6][0],
    "08": blocks[7][0],
    "09a": blocks[8][0],
    // blocks[9] is the literal "..." pause-marker paragraph — not spoken text.
    "09b": blocks[10][0],
    "10": blocks[11][0],
    "11": blocks[12][0],
  };
}

// Append a disposable trailing utterance so the REAL narration is never the
// literal last word Voicebox has to produce (see file header). Kept as its
// own short sentence (space + "끝.") so there's a real inter-sentence pause
// for findSacrificialCutPoint() to detect and cut at.
function appendSacrificialTail(text) {
  return `${text} 끝.`;
}

async function checkServer() {
  const res = await fetch(`${VOICEBOX_BASE}/health`).catch(() => null);
  if (!res || !res.ok) {
    throw new Error(
      `Voicebox server not reachable at ${VOICEBOX_BASE}. Start the Voicebox desktop app (it spawns the CUDA backend server as a child process), then retry.`
    );
  }
  const health = await res.json();
  if (!health.gpu_available) {
    console.warn("WARNING: Voicebox reports gpu_available=false — generation may fall back to CPU and be slow.");
  }
  return health;
}

async function generatePiece(id, rawText) {
  const text = appendSacrificialTail(rawText);
  console.log(`  Generating ${id}... (${text.length} chars, incl. sacrificial "끝.")`);
  const genRes = await fetch(`${VOICEBOX_BASE}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile_id: PROFILE_ID,
      text,
      language: LANGUAGE,
      engine: ENGINE,
      model_size: MODEL_SIZE,
      seed: SEED,
    }),
  });
  if (!genRes.ok) {
    throw new Error(`Voicebox /generate failed for ${id}: ${genRes.status} ${await genRes.text()}`);
  }
  const data = await genRes.json();
  // /generate returns immediately with status:"generating" — it does NOT
  // block until the audio is ready (confirmed 2026-09-29: fetching /audio
  // right away 500s). Poll /history/{id} until status leaves "generating".
  // First real inference after server start paid a ~60-90s warmup/JIT cost
  // for a trivial 7-char test string; budget generously for a cold start.
  const genId = data.id;
  const pollStart = Date.now();
  const pollTimeoutMs = 15 * 60 * 1000;
  const TERMINAL_STATUSES = ["completed", "failed", "error", "cancelled"];
  let final = data;
  // Poll on anything non-terminal, not just "generating" — a cold-started
  // server (e.g. right after a restart) reports an intermediate
  // "loading_model" status first, which isn't "generating" but also isn't
  // done (confirmed 2026-09-30: treating it as terminal threw immediately).
  while (!TERMINAL_STATUSES.includes(final.status)) {
    if (Date.now() - pollStart > pollTimeoutMs) {
      throw new Error(`Voicebox generation ${genId} (${id}) still "generating" after ${pollTimeoutMs / 1000}s — treating as stuck.`);
    }
    await new Promise((r) => setTimeout(r, 5000));
    const histRes = await fetch(`${VOICEBOX_BASE}/history/${genId}`);
    if (!histRes.ok) {
      throw new Error(`Voicebox /history/${genId} failed for ${id}: ${histRes.status}`);
    }
    final = await histRes.json();
  }
  if (final.status !== "completed") {
    throw new Error(`Voicebox generation ${genId} (${id}) ended with status "${final.status}": ${final.error ?? "no error detail"}`);
  }

  const audioRes = await fetch(`${VOICEBOX_BASE}/audio/${genId}`);
  if (!audioRes.ok) {
    throw new Error(`Voicebox /audio/${genId} failed for ${id}: ${audioRes.status}`);
  }
  const buf = Buffer.from(await audioRes.arrayBuffer());
  const elapsedS = ((Date.now() - pollStart) / 1000).toFixed(1);
  console.log(`    (completed after ${elapsedS}s wait, reported duration ${final.duration}s)`);
  return { buf, generationId: genId, reportedDuration: final.duration };
}

// ---------------------------------------------------------------------------
// Minimal canonical-WAV helpers (44-byte header + raw PCM) — needed to splice
// 3s of real silence between "09a" and "09b" without assuming a fixed sample
// rate/bit depth; read it out of Voicebox's own returned WAV header instead.
// ---------------------------------------------------------------------------
function parseWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("Not a canonical RIFF/WAVE file — Voicebox output format may have changed.");
  }
  let offset = 12;
  let fmt = null;
  let dataStart = null;
  let dataLength = null;
  while (offset < buf.length) {
    const chunkId = buf.toString("ascii", offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    if (chunkId === "fmt ") {
      fmt = {
        audioFormat: buf.readUInt16LE(chunkDataStart),
        channels: buf.readUInt16LE(chunkDataStart + 2),
        sampleRate: buf.readUInt32LE(chunkDataStart + 4),
        byteRate: buf.readUInt32LE(chunkDataStart + 8),
        blockAlign: buf.readUInt16LE(chunkDataStart + 12),
        bitsPerSample: buf.readUInt16LE(chunkDataStart + 14),
      };
    } else if (chunkId === "data") {
      dataStart = chunkDataStart;
      dataLength = chunkSize;
    }
    offset = chunkDataStart + chunkSize + (chunkSize % 2); // chunks are word-aligned
  }
  if (!fmt || dataStart === null) throw new Error("WAV missing fmt or data chunk.");
  return { fmt, pcm: buf.subarray(dataStart, dataStart + dataLength) };
}

function buildWav(fmt, pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(fmt.audioFormat, 20);
  header.writeUInt16LE(fmt.channels, 22);
  header.writeUInt32LE(fmt.sampleRate, 24);
  header.writeUInt32LE(fmt.byteRate, 28);
  header.writeUInt16LE(fmt.blockAlign, 32);
  header.writeUInt16LE(fmt.bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function silencePcm(fmt, ms) {
  const bytesPerSample = fmt.bitsPerSample / 8;
  const samples = Math.round((fmt.sampleRate * ms) / 1000);
  return Buffer.alloc(samples * bytesPerSample * fmt.channels, 0);
}

function pcmDurationSeconds(fmt, pcmLength) {
  return pcmLength / (fmt.sampleRate * (fmt.bitsPerSample / 8) * fmt.channels);
}

// Read one sample (any common PCM layout) as a float in [-1, 1].
function readSample(buf, byteOffset, fmt) {
  if (fmt.bitsPerSample === 16 && fmt.audioFormat === 1) return buf.readInt16LE(byteOffset) / 32768;
  if (fmt.bitsPerSample === 32 && fmt.audioFormat === 3) return buf.readFloatLE(byteOffset);
  if (fmt.bitsPerSample === 32 && fmt.audioFormat === 1) return buf.readInt32LE(byteOffset) / 2147483648;
  if (fmt.bitsPerSample === 8) return (buf.readUInt8(byteOffset) - 128) / 128;
  throw new Error(`Unsupported PCM layout for tail analysis: audioFormat=${fmt.audioFormat}, bitsPerSample=${fmt.bitsPerSample}`);
}

function writeSample(buf, byteOffset, fmt, value) {
  if (fmt.bitsPerSample === 16 && fmt.audioFormat === 1) return buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(value * 32768))), byteOffset);
  if (fmt.bitsPerSample === 32 && fmt.audioFormat === 3) return buf.writeFloatLE(value, byteOffset);
  if (fmt.bitsPerSample === 32 && fmt.audioFormat === 1) return buf.writeInt32LE(Math.round(value * 2147483648), byteOffset);
  if (fmt.bitsPerSample === 8) return buf.writeUInt8(Math.round(value * 128) + 128, byteOffset);
  throw new Error(`Unsupported PCM layout for fade-out: audioFormat=${fmt.audioFormat}, bitsPerSample=${fmt.bitsPerSample}`);
}

// Diagnostic: peak |amplitude| in the very last `windowMs` — a hard cutoff
// (Voicebox's reported failure mode) leaves real signal energy right up to
// the last sample; a genuinely decayed tail is already near-silent here.
function tailPeakAmplitude(pcm, fmt, windowMs = 30) {
  const bytesPerSample = fmt.bitsPerSample / 8;
  const frameSize = bytesPerSample * fmt.channels;
  const totalFrames = Math.floor(pcm.length / frameSize);
  const windowFrames = Math.min(totalFrames, Math.round((fmt.sampleRate * windowMs) / 1000));
  const startFrame = totalFrames - windowFrames;
  let peak = 0;
  for (let frame = startFrame; frame < totalFrames; frame++) {
    for (let ch = 0; ch < fmt.channels; ch++) {
      const byteOffset = frame * frameSize + ch * bytesPerSample;
      peak = Math.max(peak, Math.abs(readSample(pcm, byteOffset, fmt)));
    }
  }
  return peak;
}

// RMS amplitude per fixed-size window, for silence-gap detection.
function rmsWindows(pcm, fmt, windowMs = 20) {
  const bytesPerSample = fmt.bitsPerSample / 8;
  const frameSize = bytesPerSample * fmt.channels;
  const totalFrames = Math.floor(pcm.length / frameSize);
  const windowFrames = Math.max(1, Math.round((fmt.sampleRate * windowMs) / 1000));
  const windows = [];
  for (let start = 0; start < totalFrames; start += windowFrames) {
    const end = Math.min(totalFrames, start + windowFrames);
    let sumSq = 0;
    let n = 0;
    for (let frame = start; frame < end; frame++) {
      for (let ch = 0; ch < fmt.channels; ch++) {
        const s = readSample(pcm, frame * frameSize + ch * bytesPerSample, fmt);
        sumSq += s * s;
        n++;
      }
    }
    windows.push(Math.sqrt(sumSq / Math.max(1, n)));
  }
  return { windows, windowFrames };
}

// Locate where the disposable "끝." sentence starts, by walking backward
// from the clip's end: skip trailing silence, find the last speech run
// (assumed to be "끝"), then find the silence gap immediately before it
// (the real narration's own natural closing pause). Returns a PCM byte
// offset to cut at, or null if no clean boundary was found (caller must
// handle that — never silently guess).
function findSacrificialCutPoint(pcm, fmt, { windowMs = 20, silenceRms = 0.02, minGapMs = 100, minSpeechMs = 50 } = {}) {
  // minSpeechMs lowered from 80->50 (2026-09-29): "끝" is a single short
  // Korean syllable and can measure well under 100ms of actual voiced
  // energy — piece 07 failed detection at 80ms (confirmed via whisper +
  // manual RMS inspection: real content cleanly ends ~44.7s, "끝" itself
  // is only ~100-150ms of energy at 45.16-45.26s, file ends 45.36s).
  const { windows, windowFrames } = rmsWindows(pcm, fmt, windowMs);
  const isSpeech = windows.map((v) => v > silenceRms);
  const minGapWindows = Math.max(1, Math.round(minGapMs / windowMs));
  const minSpeechWindows = Math.max(1, Math.round(minSpeechMs / windowMs));

  let i = windows.length - 1;
  while (i >= 0 && !isSpeech[i]) i--; // skip trailing silence after "끝"
  if (i < 0) return null;

  const speechEnd = i;
  while (i >= 0 && isSpeech[i]) i--; // walk back through "끝"'s own speech run
  const speechStart = i + 1;
  if (speechEnd - speechStart + 1 < minSpeechWindows) return null; // too short to trust as "끝"

  const gapEnd = i;
  while (i >= 0 && !isSpeech[i]) i--; // walk back through the boundary pause
  const gapStart = i + 1;
  if (gapEnd - gapStart + 1 < minGapWindows) return null; // no clean pause before "끝"

  const frameSize = (fmt.bitsPerSample / 8) * fmt.channels;
  return gapStart * windowFrames * frameSize;
}

// Deterministic fix, independent of whether the "..." text trick worked:
// linearly ramp the last `fadeMs` of every clip to true zero. This guarantees
// no abrupt cutoff regardless of what the model actually produced — it's a
// no-op for audio that already decayed naturally, and a real fix otherwise.
function applyFadeOut(pcm, fmt, fadeMs = 200) {
  const bytesPerSample = fmt.bitsPerSample / 8;
  const frameSize = bytesPerSample * fmt.channels;
  const totalFrames = Math.floor(pcm.length / frameSize);
  const fadeFrames = Math.min(totalFrames, Math.round((fmt.sampleRate * fadeMs) / 1000));
  const startFrame = totalFrames - fadeFrames;
  const out = Buffer.from(pcm);
  for (let frame = startFrame; frame < totalFrames; frame++) {
    const gain = 1 - (frame - startFrame) / fadeFrames; // linear 1 -> 0
    for (let ch = 0; ch < fmt.channels; ch++) {
      const byteOffset = frame * frameSize + ch * bytesPerSample;
      writeSample(out, byteOffset, fmt, readSample(pcm, byteOffset, fmt) * gain);
    }
  }
  return out;
}

// Split Line 6's single parsed block around its two embedded "..." fill-in-
// blank quotes ("The... in this city gets better every year." / "This letter
// looks... good."). Confirmed 2026-09-30 via whisper re-transcription of the
// old 06.wav: the first blank sentence was silently dropped entirely from the
// generated audio (jumped straight from "다시 읽어보겠습니다." to "네,
// water입니다.", skipping the quoted sentence completely) — matches a known
// Voicebox server bug (github.com/jamiepine/voicebox#1108: its internal
// trim_tts_output() discards everything after any pause it judges >1s inside
// a single generation, unreachable from the HTTP API). Fix: never ask one
// generate() call to render a pause that long — split around each blank and
// insert a controlled silence ourselves, the same pattern Line 9 already uses
// for its 3s countdown.
function splitLine6ForPauses(text) {
  const q1 = '"The... in this city gets better every year."';
  const q2 = '"This letter looks... good."';
  const i1 = text.indexOf(q1);
  const i2 = text.indexOf(q2);
  if (i1 === -1 || i2 === -1) {
    throw new Error(
      "splitLine6ForPauses(): expected quote markers not found in Line 6 text — SCRIPT.md wording changed, update the q1/q2 constants here."
    );
  }
  const beforeQ1 = text.slice(0, i1).trim();
  const midText = text.slice(i1 + q1.length, i2).trim();
  const afterQ2 = text.slice(i2 + q2.length).trim();
  return [
    `${beforeQ1} The`,
    `in this city gets better every year. ${midText} This letter looks`,
    `good. ${afterQ2}`,
  ];
}

// Generate N text segments as separate Voicebox calls (each independently
// sacrificial-tail-trimmed), splice `pauseMs` of real silence between them,
// and return one merged WAV buffer + total duration. Generalizes the
// 09a/silence/09b pattern for reuse (Line 6 needs it twice in one piece).
async function generateSegmentedComposite(baseId, segments, pauseMs) {
  let mergedFmt = null;
  let mergedPcm = Buffer.alloc(0);
  for (let i = 0; i < segments.length; i++) {
    const segId = `${baseId}-seg${i + 1}`;
    const { buf } = await generatePiece(segId, segments[i]);
    const { fmt, pcm: rawPcm } = parseWav(buf);
    const pcm = trimSacrificialTail(rawPcm, fmt, segId);
    if (!mergedFmt) {
      mergedFmt = fmt;
    } else if (fmt.sampleRate !== mergedFmt.sampleRate || fmt.bitsPerSample !== mergedFmt.bitsPerSample || fmt.channels !== mergedFmt.channels) {
      throw new Error(`${baseId}: segment ${i + 1} WAV format differs from segment 1 — cannot concatenate directly.`);
    }
    if (i > 0) mergedPcm = Buffer.concat([mergedPcm, silencePcm(mergedFmt, pauseMs)]);
    mergedPcm = Buffer.concat([mergedPcm, pcm]);
  }
  return { fmt: mergedFmt, pcm: mergedPcm };
}

// ---------------------------------------------------------------------------

const NARRATION = parseScriptNarration();
const SINGLE_IDS = ["01", "02", "03", "04", "05", "07", "08", "10", "11"];

const totalChars = Object.values(NARRATION).reduce((s, t) => s + t.length, 0);
console.log(`Pieces: ${SINGLE_IDS.length} single scenes + 09a/09b composite (Line 9 quiz)`);
console.log(`Total narration chars: ${totalChars}`);
if (only) console.log(`--only filter active: ${only.join(", ")}`);

if (dryRun) {
  console.log("--dry-run: no Voicebox calls made. Parsed text lengths:");
  for (const [id, t] of Object.entries(NARRATION)) console.log(`  ${id}: ${t.length} chars`);
  process.exit(0);
}

await checkServer();

const resultsPath = join(PROJECT_DIR, ".tts-results.json");
const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {};

function trimSacrificialTail(pcm, fmt, id) {
  const rawDur = pcmDurationSeconds(fmt, pcm.length);
  const cutOffset = findSacrificialCutPoint(pcm, fmt);
  if (cutOffset == null) {
    console.warn(
      `  WARNING: ${id} — could not find a clean boundary pause before the sacrificial "끝." ` +
        `Keeping full untrimmed audio (${rawDur.toFixed(2)}s) — LISTEN TO THIS ONE MANUALLY, it may end with "끝" still attached.`
    );
    return applyFadeOut(pcm, fmt, 200); // fall back to the old blanket-fade safety net
  }
  const trimmed = pcm.subarray(0, cutOffset);
  const trimmedDur = pcmDurationSeconds(fmt, trimmed.length);
  console.log(`  ${id}: trimmed sacrificial tail at ${trimmedDur.toFixed(2)}s (raw was ${rawDur.toFixed(2)}s, discarded ${(rawDur - trimmedDur).toFixed(2)}s)`);
  return applyFadeOut(trimmed, fmt, 40); // tiny click-guard at the splice point only
}

for (const id of SINGLE_IDS) {
  if (only && !only.includes(id)) continue;
  const { buf } = await generatePiece(id, NARRATION[id]);
  const { fmt, pcm } = parseWav(buf);
  const finalPcm = trimSacrificialTail(pcm, fmt, id);
  const outPath = join(VOICE_DIR, `${id}.wav`);
  writeFileSync(outPath, buildWav(fmt, finalPcm));
  const dur = pcmDurationSeconds(fmt, finalPcm.length);
  results[id] = { path: `assets/voice/${id}.wav`, duration_s: Math.round(dur * 100) / 100 };
  console.log(`  -> ${id}.wav (${dur.toFixed(2)}s)`);
}

const needsFrame6 = !only || only.includes("06");
if (needsFrame6) {
  console.log(`Generating composite 06 (3 segments, 900ms silence at each fill-in-blank)...`);
  const segments = splitLine6ForPauses(NARRATION["06"]);
  const { fmt, pcm } = await generateSegmentedComposite("06", segments, 900);
  writeFileSync(join(VOICE_DIR, "06.wav"), buildWav(fmt, pcm));
  const dur = pcmDurationSeconds(fmt, pcm.length);
  results["06"] = { path: "assets/voice/06.wav", duration_s: Math.round(dur * 100) / 100 };
  console.log(`  -> Merged 06.wav (${dur.toFixed(2)}s, incl. 2x 900ms fill-in-blank pauses)`);
}

const needsFrame9 = !only || only.includes("09") || only.includes("09a") || only.includes("09b");
if (needsFrame9) {
  console.log(`Generating composite 09 (09a + 3s silence + 09b)...`);
  // Both 09a and 09b need the sacrificial-tail trim — 09a's own generation
  // call ends right before our inserted 3s silence, so it has the exact same
  // last-word-clipping risk as any other piece; 09b is the true final piece.
  const a = await generatePiece("09a", NARRATION["09a"]);
  const { fmt: fmtA, pcm: rawPcmA } = parseWav(a.buf);
  const pcmA = trimSacrificialTail(rawPcmA, fmtA, "09a");
  writeFileSync(join(VOICE_DIR, "09a.wav"), buildWav(fmtA, pcmA));
  results["09a"] = { path: "assets/voice/09a.wav", duration_s: Math.round(pcmDurationSeconds(fmtA, pcmA.length) * 100) / 100 };

  const b = await generatePiece("09b", NARRATION["09b"]);
  const { fmt: fmtB, pcm: rawPcmB } = parseWav(b.buf);
  const pcmB = trimSacrificialTail(rawPcmB, fmtB, "09b"); // this tail becomes 09.wav's real ending
  writeFileSync(join(VOICE_DIR, "09b.wav"), buildWav(fmtB, pcmB));
  results["09b"] = { path: "assets/voice/09b.wav", duration_s: Math.round(pcmDurationSeconds(fmtB, pcmB.length) * 100) / 100 };

  if (fmtA.sampleRate !== fmtB.sampleRate || fmtA.bitsPerSample !== fmtB.bitsPerSample || fmtA.channels !== fmtB.channels) {
    throw new Error("09a/09b WAV formats differ — cannot concatenate directly. Investigate Voicebox output before merging.");
  }
  const silence = silencePcm(fmtA, 3000);
  const mergedPcm = Buffer.concat([pcmA, silence, pcmB]);
  const mergedWav = buildWav(fmtA, mergedPcm);
  writeFileSync(join(VOICE_DIR, "09.wav"), mergedWav);
  const totalDur = pcmDurationSeconds(fmtA, mergedPcm.length);
  results["09"] = { path: "assets/voice/09.wav", duration_s: Math.round(totalDur * 100) / 100 };
  console.log(`  -> Merged 09.wav (${totalDur.toFixed(2)}s, incl. 3s pause)`);
}

writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
console.log("Wrote .tts-results.json with real durations per scene.");
console.log("Done. Voicebox runs locally — no billed usage to report.");
