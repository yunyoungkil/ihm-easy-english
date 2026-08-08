// Transcribes each highlight-aware scene's narration with Whisper (word-level
// timestamps) and uses them to fill in `highlightAt` (a scene-relative frame
// number) for every word, so the on-screen element for a word can activate
// right as the narration says it.
//
// Matching works because the narration pronounces the English words in
// Korean, which is exactly what each word's `pronunciation` field holds.
// Re-running is safe: stale values are cleared when a word no longer matches.
//
// Usage: node scripts/generate-highlights.mjs [--episode=NN]   (default 06)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installWhisperCpp, downloadWhisperModel, transcribe } from "@remotion/install-whisper-cpp";
import { createTikTokStyleCaptions } from "@remotion/captions";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const whisperDir = path.join(projectRoot, ".whisper");
const audioDir = path.join(projectRoot, "public", "audio");
const scratchDir = path.join(projectRoot, ".whisper-scratch");
// Which episode to process. Defaults to 06 so existing invocations keep working.
const EPISODE = String(
  process.argv
    .slice(2)
    .find((a) => a.startsWith("--episode="))
    ?.split("=")[1] ?? "06",
).padStart(2, "0");
// A script name overrides --episode, so vertical shorts run through the same
// transcription/alignment path as a full episode.
const SCRIPT_NAME =
  process.argv
    .slice(2)
    .find((a) => a.startsWith("--script="))
    ?.split("=")[1] ?? `ep${EPISODE}`;
const epJsonPath = path.join(__dirname, `${SCRIPT_NAME}.json`);

const WHISPER_VERSION = "1.5.5";
// `medium` was tried and was both ~6x slower and no cleaner on this Korean
// narration (it produced *fewer* usable subtitle cues), so `small` stays.
const MODEL = "small";
const FPS = 30;
const LANGUAGE = "ko";
// Minimum fraction of a word's pronunciation that must line up with the
// transcript before we trust the match enough to set highlightAt.
const MIN_MATCH_RATIO = 0.6;
// Targets shorter than this match too easily to be trustworthy against a
// whisper transcript, which is noisy and drops characters. Two-syllable cues
// like "미션"/"텐션"/"픽처" are excluded by it.
const MIN_TARGET_LENGTH = 3;
// Against the verbatim narration script there is no noise to match by
// accident, and the search only ever moves forward through the script, so the
// guard can be relaxed — without this those two-syllable words never match at
// all, because the Korean script contains no English spelling to fall back on.
const MIN_TARGET_LENGTH_SCRIPT = 2;
// Floor for a spoken word's duration, so a very tight match still yields a
// window the on-screen emphasis can actually be seen in.
const MIN_SPEECH_MS = 250;
// RMS fraction of the loudest frame that counts as speech rather than room tone.
const ONSET_THRESHOLD_RATIO = 0.06;
// How far a whisper timestamp may be nudged onto a measured speech onset.
const ONSET_SNAP_WINDOW_MS = 700;
// How long one subtitle page may run before createTikTokStyleCaptions() breaks
// at the next word boundary. Higher = more words per page.
const SWITCH_CAPTIONS_EVERY_MS = 3500;
// Shorts are read one segment at a time and each segment is only a sentence or
// two, so a mid-sentence break leaves a stranded fragment on screen
// ("...강세는 어디로" / "갈까요?"). Setting the budget above any single
// segment's length means sentences are the only thing that ever splits a page.
const SWITCH_CAPTIONS_EVERY_MS_SHORTS = 30000;
// Silence that has to precede an onset for it to count as a phrase boundary a
// sentence-opening subtitle can be snapped onto.
const PAUSE_SILENCE_MS = 250;
// How far a sentence-opening cue may be nudged onto such an onset. Bounded
// from both sides by measurement: it clears the p90 of whisper's residual
// error (220ms) but stays under the smallest observed gap between two phrase
// onsets (560ms), so the nearest onset is still the right one. Widening it
// past that would let a cue snap onto the neighbouring phrase instead.
const CUE_SNAP_WINDOW_MS = 500;
// Shortest a subtitle may stay on screen. Snapping a cue onto an onset can
// squeeze its neighbour: EP8 Scene 1 spells out letters ("피, 아이, 씨...")
// which packs pause onsets together, and one cue came out 1 frame long.
// Better a slightly less accurate cue than one nobody can read.
const CUE_MIN_FRAMES = 12;
// Layouts whose components react to `highlightAt`.
const TARGET_LAYOUTS = ["wordList", "quiz", "compare"];

// ---------- WAV read / resample / write (whisper.cpp requires 16kHz mono) ----------

function readWav(filePath) {
  const buf = fs.readFileSync(filePath);
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
  if (!fmt || dataOffset === null) {
    throw new Error(`Could not parse WAV: ${filePath}`);
  }
  const numSamples = Math.floor(dataSize / fmt.blockAlign);
  const samples = new Int16Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = buf.readInt16LE(dataOffset + i * fmt.blockAlign);
  }
  return { fmt, samples };
}

function resampleTo16kMono(samples, sourceSampleRate) {
  const ratio = 16000 / sourceSampleRate;
  const outLength = Math.floor(samples.length * ratio);
  const out = new Int16Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const srcPos = i / ratio;
    const i0 = Math.floor(srcPos);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const frac = srcPos - i0;
    out[i] = Math.round(samples[i0] * (1 - frac) + samples[i1] * frac);
  }
  return out;
}

function writeWav16kMono(filePath, samples) {
  const sampleRate = 16000;
  const blockAlign = 2;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);

  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buf.writeInt16LE(samples[i], 44 + i * 2);
  }
  fs.writeFileSync(filePath, buf);
}

function prepare16kAudio(sourcePath, destPath) {
  const { fmt, samples } = readWav(sourcePath);
  const resampled =
    fmt.sampleRate === 16000 ? samples : resampleTo16kMono(samples, fmt.sampleRate);
  writeWav16kMono(destPath, resampled);
}

// ---------- Whisper clock calibration ----------

/**
 * First and last moment (ms) the narration is actually audible, from a 20ms
 * RMS envelope.
 */
function measureSpeechSpan(sourcePath) {
  const { fmt, samples } = readWav(sourcePath);
  const win = Math.floor(fmt.sampleRate * 0.02);
  const env = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) {
      e += samples[j] * samples[j];
    }
    env.push({ t: (i / fmt.sampleRate) * 1000, rms: Math.sqrt(e / win) });
  }
  const threshold = env.reduce((m, e) => Math.max(m, e.rms), 0) * ONSET_THRESHOLD_RATIO;
  const voiced = env.filter((e) => e.rms > threshold);
  if (voiced.length === 0) {
    return null;
  }
  return { fromMs: voiced[0].t, toMs: voiced[voiced.length - 1].t };
}

/**
 * Puts a whisper timeline back onto the audio's real clock.
 *
 * whisper.cpp reports its timestamps early. Measured over 99 segment starts
 * that follow a real pause, the error is a near-constant **-210ms**; the
 * time-dependent part is only 3.8ms per second (153ms across a 40s scene), so
 * an offset is the correction that matters and a scale factor is not.
 *
 * The offset is not hard-coded: whisper always opens its first segment at
 * 0.00 while the narration actually starts 0.26-0.46s in, so shifting the
 * timeline onto the measured first-speech moment supplies it per scene. That
 * lands within 35ms of the regression's intercept (-277ms).
 *
 * Deliberately *not* corrected: whisper's last segment ends up to 1.5s past
 * the end of the audio file. That is padding on a chunk boundary — there is no
 * sound there at all — so stretching the timeline to close it would bake a
 * bogus 5% compression into every scene.
 */
function calibrationFor(heardFrom, span) {
  if (!span) {
    return (t) => t;
  }
  const offset = span.fromMs - heardFrom;
  return (t) => t + offset;
}

/** calibrationFor applied to a `{char, from, to}` timeline. */
function calibrateChars(chars, span) {
  if (!span || chars.length === 0) {
    return chars;
  }
  const map = calibrationFor(chars[0].from, span);
  return chars.map((c) => ({ ...c, from: map(c.from), to: map(c.to) }));
}

/** calibrationFor applied to a `{char, timeMs}` timeline. */
function calibrateTimeline(timeline, span) {
  if (!span || timeline.length === 0) {
    return timeline;
  }
  const map = calibrationFor(timeline[0].timeMs, span);
  return timeline.map((t) => ({ ...t, timeMs: map(t.timeMs) }));
}

// ---------- Speech-onset snapping ----------

/**
 * Times (seconds) where the narration crosses from silence into speech,
 * from a 20ms RMS envelope of the original audio.
 */
function findSpeechOnsets(sourcePath) {
  const { fmt, samples } = readWav(sourcePath);
  const win = Math.floor(fmt.sampleRate * 0.02);
  const env = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    let e = 0;
    for (let j = i; j < i + win; j++) {
      e += samples[j] * samples[j];
    }
    env.push({ t: i / fmt.sampleRate, rms: Math.sqrt(e / win) });
  }

  const peak = env.reduce((m, e) => Math.max(m, e.rms), 0);
  const threshold = peak * ONSET_THRESHOLD_RATIO;

  const onsets = [];
  let silenceRun = 0;
  for (let i = 1; i < env.length; i++) {
    if (env[i].rms <= threshold) {
      silenceRun += 20;
      continue;
    }
    if (env[i - 1].rms <= threshold) {
      onsets.push({ t: env[i].t, silenceBeforeMs: silenceRun });
    }
    silenceRun = 0;
  }
  return onsets;
}

/** Onsets that open a phrase, i.e. follow a pause long enough to hear. */
const pauseOnsetsOf = (onsets) =>
  onsets.filter((o) => o.silenceBeforeMs >= PAUSE_SILENCE_MS).map((o) => o.t);

/**
 * Whisper reports a token's boundary, which for this narration consistently
 * falls in the pause *before* the word is actually voiced — measuring the
 * generated values showed 16 of 17 landing in true silence. Snapping the
 * start to the nearest measured speech onset puts the on-screen emphasis on
 * the sound itself. The word's whisper-measured duration is preserved by
 * shifting the end by the same amount.
 */
function snapToOnset(startMs, endMs, onsets) {
  let bestDelta = null;
  for (const onset of onsets) {
    const delta = onset.t * 1000 - startMs;
    if (Math.abs(delta) > ONSET_SNAP_WINDOW_MS) {
      continue;
    }
    if (bestDelta === null || Math.abs(delta) < Math.abs(bestDelta)) {
      bestDelta = delta;
    }
  }
  if (bestDelta === null) {
    return { startMs, endMs, snappedMs: null };
  }
  return { startMs: startMs + bestDelta, endMs: endMs + bestDelta, snappedMs: bestDelta };
}

// ---------- Fuzzy word-timing lookup ----------

/**
 * The timeline word matching searches, preferring the written narration.
 *
 * The token pass is what supplies the finest timing, but it mangles Korean —
 * measured at 16% of characters lost on the EP6 recordings and **27% on TTS
 * narration**, where it ate whole target words ("텔레비전" came back as
 * "����전"). Matching against that scores a real word at
 * 0.25 and drops it, which is how EP7 first came out at 30% matched vs EP6's
 * 85%.
 *
 * When `scene.narration` exists it is exact by definition, so aligning it onto
 * the calibrated segment clock (the same timeline the subtitles use) gives
 * matching clean text with real timestamps. Falls back to the token pass when
 * no script has been written.
 */
function buildMatchTimeline(result, narration, span) {
  const script = (narration ?? "").trim();
  if (script.length > 0) {
    const heard = calibrateChars(segmentsToChars(result.segments), span);
    const aligned = alignNarrationToTimeline(script, heard);
    if (aligned.length > 0) {
      return {
        timeline: aligned.map((c) => ({ char: c.char.toLowerCase(), timeMs: c.from })),
        fromScript: true,
      };
    }
  }
  return {
    timeline: calibrateTimeline(buildCharTimeline(result.transcription), span),
    fromScript: false,
  };
}

// Expands whisper's transcription items into a flat per-character timeline
// (each char gets a timestamp linearly interpolated across its token's span).
function buildCharTimeline(transcriptionItems) {
  const timeline = [];
  for (const item of transcriptionItems) {
    const text = item.text ?? "";
    const fromMs = item.offsets?.from ?? 0;
    const toMs = item.offsets?.to ?? fromMs;
    const duration = Math.max(toMs - fromMs, 1);
    for (let i = 0; i < text.length; i++) {
      // Lower-cased so English spellings match case-insensitively; the
      // timestamp is unaffected.
      timeline.push({
        char: text[i].toLowerCase(),
        timeMs: fromMs + (duration * i) / Math.max(text.length, 1),
      });
    }
  }
  return timeline;
}

// Longest common subsequence length between two strings/arrays. Unlike a
// single greedy pass, this tolerates a character that's missing entirely
// (e.g. corrupted away by whisper's non-Latin token splitting) without
// breaking the match on everything that comes after it.
function lcsLength(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Finds where `target` best lines up in `timeline`, searching only from
// `searchFromIndex` onward (narration says words in order, so each match
// pushes the search window forward). Scores each candidate window by LCS
// length against `target`, tolerant of corrupted/missing characters.
function findBestMatch(timeline, target, searchFromIndex) {
  const slack = 4;
  const windowSize = target.length + slack;
  let best = { score: 0, index: -1, endIndex: -1 };

  for (let start = searchFromIndex; start < timeline.length; start++) {
    const window = timeline.slice(start, start + windowSize).map((t) => t.char);
    const score = lcsLength([...target], window);
    if (score > best.score) {
      best = { score, index: start, endIndex: matchEndIndex(timeline, target, start, windowSize) };
    }
    if (score === target.length) {
      break;
    }
  }

  return best;
}

// Where the match finishes: greedily consumes `target` from `start` and
// reports the position of the last character that lined up. Used to derive
// how long the narration spends saying the word, not just when it begins.
function matchEndIndex(timeline, target, start, windowSize) {
  const limit = Math.min(timeline.length, start + windowSize);
  let ti = 0;
  let last = start;
  for (let j = start; j < limit && ti < target.length; j++) {
    if (timeline[j].char === target[ti]) {
      ti++;
      last = j;
    }
  }
  return last;
}

// ---------- Narration alignment ----------

/**
 * Puts the written narration on whisper's clock.
 *
 * Whisper knows *when* things were said but mishears words ("패턴" -> "테턴");
 * `scene.narration` has the exact words but no timing. Aligning the two by
 * longest common subsequence anchors every character the transcript got right
 * to its real timestamp, and interpolates the rest between those anchors — so
 * the subtitles read exactly as written while still tracking the audio.
 */
function alignNarrationToTimeline(narration, timeline) {
  const script = [...narration];
  const heard = timeline;
  if (script.length === 0 || heard.length === 0) {
    return [];
  }

  // Ignore spacing differences when matching; whisper spaces Korean oddly.
  const norm = (c) => (/\s/.test(c) ? "" : c);
  const a = script.map((c) => norm(c));
  const b = heard.map((t) => norm(t.char));

  const w = b.length + 1;
  const dp = new Int32Array((a.length + 1) * w);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i * w + j] =
        a[i] !== "" && a[i] === b[j]
          ? dp[(i + 1) * w + (j + 1)] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + (j + 1)]);
    }
  }

  // Walk the alignment, recording a timestamp for each matched script char.
  const times = new Array(script.length).fill(null);
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] !== "" && a[i] === b[j]) {
      times[i] = { from: heard[j].from, to: heard[j].to };
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + (j + 1)]) {
      i++;
    } else {
      j++;
    }
  }

  // Fill the unmatched runs by interpolating between surrounding anchors.
  const firstAnchor = times.findIndex((t) => t !== null);
  if (firstAnchor === -1) {
    return [];
  }
  const lastAnchor = times.length - 1 - [...times].reverse().findIndex((t) => t !== null);

  for (let k = 0; k < firstAnchor; k++) {
    times[k] = { from: heard[0].from, to: times[firstAnchor].from };
  }
  for (let k = lastAnchor + 1; k < times.length; k++) {
    times[k] = { from: times[lastAnchor].to, to: heard[heard.length - 1].to };
  }
  let k = firstAnchor;
  while (k <= lastAnchor) {
    if (times[k] !== null) {
      k++;
      continue;
    }
    const gapStart = k;
    while (times[k] === null) {
      k++;
    }
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

// ---------- Subtitle grouping (@remotion/captions) ----------

const SENTENCE_END = /[.!?]/;

/**
 * Spreads each whisper segment's text over its own time span, character by
 * character. A segment runs several seconds, so giving every character the
 * whole span would leave the captions far too coarse to group.
 */
function segmentsToChars(segmentItems) {
  const heard = [];
  for (const item of segmentItems) {
    const text = item.text ?? "";
    const from = item.offsets?.from ?? 0;
    const to = item.offsets?.to ?? from;
    const span = Math.max(to - from, 1);
    const list = [...text];
    list.forEach((char, i) => {
      heard.push({
        char,
        from: from + (span * i) / list.length,
        to: from + (span * (i + 1)) / list.length,
      });
    });
  }
  return heard;
}

/**
 * Timed characters -> one `Caption` per word.
 *
 * createTikTokStyleCaptions() decides where a page may break by looking for a
 * caption whose text *starts with a space*, which is how whisper's own English
 * word tokens arrive. Korean is written the same way here: the space that
 * separated two eojeol is kept at the head of the following word.
 */
function charsToCaptions(chars) {
  const captions = [];
  let text = "";
  let startMs = 0;
  let endMs = 0;

  const flush = () => {
    if (text.trim().length === 0) {
      return;
    }
    captions.push({ text, startMs, endMs, timestampMs: startMs, confidence: null });
  };

  for (const entry of chars) {
    const isSpace = /\s/.test(entry.char);
    if (isSpace) {
      flush();
      text = " ";
      startMs = entry.from;
      endMs = entry.to;
      continue;
    }
    if (text === "") {
      startMs = entry.from;
    }
    text += entry.char;
    endMs = entry.to;
  }
  flush();

  return captions;
}

/**
 * Sentence-level subtitle groups, grouped by Remotion's own
 * createTikTokStyleCaptions().
 *
 * The official grouper breaks a page once it has run longer than
 * SWITCH_CAPTIONS_EVERY_MS, at the next word boundary — it has no notion of
 * sentences. Since a subtitle that straddles a full stop reads badly, the
 * captions are cut on sentence enders first and each sentence is grouped on
 * its own; long sentences are what the grouper then splits into pages.
 *
 * `scene.narration` is used as the text when it has been written; otherwise
 * the whisper transcript is the only text available and is used instead.
 */
function buildSubtitleGroups(segmentItems, narration, span, pauseOnsets = [], pageBudgetMs = SWITCH_CAPTIONS_EVERY_MS) {
  const heard = calibrateChars(segmentsToChars(segmentItems), span);

  // Written narration wins when it exists — whisper only supplies the clock.
  const script = (narration ?? "").trim();
  const chars = script.length > 0 ? alignNarrationToTimeline(script, heard) : heard;
  if (chars.length === 0) {
    return [];
  }

  const captions = charsToCaptions(chars);

  // Cut into sentences, so no page spans a full stop.
  const sentences = [];
  let current = [];
  for (const caption of captions) {
    current.push(caption);
    if (SENTENCE_END.test(caption.text)) {
      sentences.push(current);
      current = [];
    }
  }
  if (current.length) {
    sentences.push(current);
  }

  const pages = sentences.flatMap(
    (sentence) =>
      createTikTokStyleCaptions({
        captions: sentence,
        combineTokensWithinMilliseconds: pageBudgetMs,
      }).pages,
  );

  const groups = pages
    .map((page) => ({
      text: page.text.replace(/\s+/g, " ").trim(),
      startMs: page.startMs,
      from: Math.round((page.startMs / 1000) * FPS),
      to: Math.round(((page.startMs + page.durationMs) / 1000) * FPS),
    }))
    .filter((g) => g.text.replace(/[^가-힣a-zA-Z0-9]/g, "").length >= 2);

  // A page that opens a sentence is spoken right after a pause, so its start
  // is knowable from the audio itself rather than from whisper's estimate.
  // Snapping those onto a measured onset fixes the cues the transcript placed
  // badly; pages that merely continue a sentence have no pause to snap to and
  // are left alone.
  groups.forEach((group, i) => {
    const prev = groups[i - 1];
    if (prev && !SENTENCE_END.test(prev.text.trim().slice(-1))) {
      return;
    }
    let best = null;
    for (const onset of pauseOnsets) {
      const delta = onset * 1000 - group.startMs;
      if (Math.abs(delta) > CUE_SNAP_WINDOW_MS) {
        continue;
      }
      if (best === null || Math.abs(delta) < Math.abs(best)) {
        best = delta;
      }
    }
    if (best === null) {
      return;
    }
    const snapped = Math.round(((group.startMs + best) / 1000) * FPS);
    // A snap must leave both this cue and the one before it readable.
    const floor = prev ? prev.from + CUE_MIN_FRAMES : 0;
    const ceiling = groups[i + 1]
      ? groups[i + 1].from - CUE_MIN_FRAMES
      : snapped;
    if (floor > ceiling) {
      // No room to move without starving a neighbour — leave the cue where
      // the transcript put it.
      return;
    }
    group.from = Math.max(floor, Math.min(snapped, ceiling));
  });

  // Close every gap: hold each group until the next one begins. Necessary
  // because the pages were produced by one grouper call per sentence, so
  // their durations only line up within a sentence, not across the pauses
  // between them.
  for (let i = 0; i < groups.length; i++) {
    if (i === 0) {
      groups[i].from = 0;
    }
    groups[i].to = i < groups.length - 1 ? groups[i + 1].from : Number.MAX_SAFE_INTEGER;
  }
  return groups.map(({ text, from, to }) => ({ text, from, to }));
}

// ---------- Main ----------

// Spellings worth trying against the transcript for one word. Very short
// targets (e.g. the one-syllable "션") match almost anywhere, so they're
// dropped rather than producing confident-looking garbage.
function candidateTargets(word, fromScript = false) {
  const minimum = fromScript ? MIN_TARGET_LENGTH_SCRIPT : MIN_TARGET_LENGTH;
  return [word.narrationCue ?? "", word.pronunciation ?? "", word.word ?? ""]
    .map((value) => value.replace(/\s+/g, "").toLowerCase())
    .filter((value) => value.length >= minimum);
}

/**
 * The two naming schemes in public/audio/ both resolve here:
 * the hand-recorded EP6 files (`ep06_Scene 3. 패턴 확인 ....wav`) and anything
 * scripts/generate-tts.mjs writes (`ep07_scene03.wav`).
 */
function findAudioFileForScene(sceneId) {
  const files = fs.readdirSync(audioDir).filter((f) => f.endsWith(".wav"));
  const padded = String(sceneId).padStart(2, "0");
  return (
    files.find((f) => f === `${SCRIPT_NAME}_scene${padded}.wav`) ??
    files.find((f) => f === `${SCRIPT_NAME}_seg${padded}.wav`) ??
    files.find(
      (f) => f.startsWith(`${SCRIPT_NAME}_`) && f.includes(`Scene ${sceneId}.`),
    )
  );
}

async function transcribeScene(scene) {
  const audioFile = findAudioFileForScene(scene.id);
  if (!audioFile) {
    console.warn(`  No audio file found for scene ${scene.id}, skipping.`);
    return null;
  }

  // Transcribing all 11 scenes takes minutes, and the audio only changes when
  // a WAV is re-recorded — so the raw whisper output is cached and reused,
  // which makes re-tuning the subtitle grouping cheap. Delete
  // .whisper-scratch/ to force a fresh transcription.
  const cachePath = path.join(scratchDir, `${SCRIPT_NAME}_scene${scene.id}_${MODEL}.json`);
  if (fs.existsSync(cachePath)) {
    console.log("  using cached transcription");
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  }

  const scratch16kPath = path.join(scratchDir, `${SCRIPT_NAME}_scene${scene.id}_16k.wav`);
  prepare16kAudio(path.join(audioDir, audioFile), scratch16kPath);

  // Two passes on purpose.
  //
  // Token-level (`--max-len 1`) gives the fine timing that `highlightAt`
  // needs, but whisper.cpp splits multi-byte Korean characters across token
  // boundaries, so each token is invalid UTF-8 and decodes with U+FFFD —
  // "강세를 원리로" comes back as "강세??? 원??????". Fine for fuzzy matching,
  // useless as subtitle text.
  //
  // The segment pass leaves whisper's own segmentation alone and returns
  // clean, whole sentences, which is what the subtitles are built from.
  const words = await transcribe({
    inputPath: scratch16kPath,
    whisperPath: whisperDir,
    whisperCppVersion: WHISPER_VERSION,
    model: MODEL,
    tokenLevelTimestamps: true,
    language: LANGUAGE,
    printOutput: false,
  });

  const segments = await transcribe({
    inputPath: scratch16kPath,
    whisperPath: whisperDir,
    whisperCppVersion: WHISPER_VERSION,
    model: MODEL,
    tokenLevelTimestamps: false,
    tokensPerItem: 0,
    language: LANGUAGE,
    printOutput: false,
  });

  const result = { transcription: words.transcription, segments: segments.transcription };
  fs.writeFileSync(cachePath, JSON.stringify(result));

  return result;
}

async function main() {
  fs.mkdirSync(scratchDir, { recursive: true });

  console.log(`${SCRIPT_NAME}
`);
  console.log("Ensuring whisper.cpp + model are installed...");
  await installWhisperCpp({ version: WHISPER_VERSION, to: whisperDir, printOutput: false });
  await downloadWhisperModel({ model: MODEL, folder: whisperDir, printOutput: false });

  const data = JSON.parse(fs.readFileSync(epJsonPath, "utf8"));

  // Every scene is transcribed, because the card layout shows narration
  // subtitles everywhere; word-level highlighting only applies to the
  // layouts that render words.
  // Shorts hold `segments` with one optional word each; episodes hold
  // `scenes` with a `words` array. Normalising here lets both use the same
  // transcription, calibration and LCS alignment below.
  const items = data.scenes ?? data.segments ?? [];
  for (const scene of items) {
    const isSegment = !data.scenes;
    if (isSegment) {
      // A short names its word either directly or, in the compare layout, as
      // the correct half of the pair. Both need a timing so the reveal (and
      // its switch click) land on the narration rather than a fixed delay.
      const target = scene.word
        ? { word: scene.word, pronunciation: scene.pronunciation }
        : scene.compareRight
          ? {
              word: scene.compareRight.word,
              pronunciation: scene.compareRight.pronunciation,
            }
          : null;
      scene.words = target
        ? [
            {
              ...target,
              // The short may only voice the stressed syllable.
              narrationCue: scene.narrationCue ?? target.pronunciation,
            },
          ]
        : [];
    }
    console.log(`\nScene ${scene.id} (${scene.layout}): transcribing narration...`);
    const result = await transcribeScene(scene);
    if (!result) {
      continue;
    }

    // Everything timed off whisper is first put back on the audio's own
    // clock; whisper's drifts by up to 5% across a scene.
    const sceneAudio = findAudioFileForScene(scene.id);
    const span = sceneAudio
      ? measureSpeechSpan(path.join(audioDir, sceneAudio))
      : null;
    const onsets = sceneAudio ? findSpeechOnsets(path.join(audioDir, sceneAudio)) : [];

    delete scene.subtitles; // superseded by subtitleGroups
    scene.subtitleGroups = buildSubtitleGroups(
      result.segments,
      scene.narration,
      span,
      pauseOnsetsOf(onsets),
      isSegment ? SWITCH_CAPTIONS_EVERY_MS_SHORTS : SWITCH_CAPTIONS_EVERY_MS,
    );
    const src = (scene.narration ?? '').trim() ? 'narration script' : 'whisper transcript';
    console.log(`  subtitles: ${scene.subtitleGroups.length} groups (from ${src})`);

    // Shorts carry no `layout`; their single word is always a highlight target.
    if (
      (!isSegment && !TARGET_LAYOUTS.includes(scene.layout)) ||
      !scene.words?.some((word) => candidateTargets(word, true).length > 0)
    ) {
      continue;
    }

    const { timeline, fromScript } = buildMatchTimeline(result, scene.narration, span);
    let searchFromIndex = 0;

    for (const word of scene.words) {
      const targets = candidateTargets(word, fromScript);
      if (targets.length === 0) {
        delete word.highlightAt;
        delete word.highlightEnd;
        continue;
      }

      // The narration sometimes says a word in Korean ("네이션") and
      // sometimes in English ("information"), so try both spellings and keep
      // whichever aligns better.
      let best = null;
      for (const target of targets) {
        const match = findBestMatch(timeline, target, searchFromIndex);
        const ratio = match.index === -1 ? 0 : match.score / target.length;
        if (!best || ratio > best.ratio) {
          best = { ...match, ratio, target };
        }
      }

      if (!best || best.index === -1 || best.ratio < MIN_MATCH_RATIO) {
        delete word.highlightAt;
        delete word.highlightEnd;
        console.log(
          `  ${word.word}: no confident match (best ratio ${(best?.ratio ?? 0).toFixed(2)}), leaving highlightAt unset.`,
        );
        continue;
      }

      const rawStartMs = timeline[best.index].timeMs;
      // The last matched character starts at its own timestamp; the word is
      // only finished once that character has been spoken, so extend to the
      // next character's start.
      const rawEndMs = Math.max(
        timeline[best.endIndex + 1]?.timeMs ?? timeline[best.endIndex].timeMs + MIN_SPEECH_MS,
        rawStartMs + MIN_SPEECH_MS,
      );

      const { startMs, endMs, snappedMs } = snapToOnset(rawStartMs, rawEndMs, onsets);

      const startFrame = Math.round((startMs / 1000) * FPS);
      const endFrame = Math.round((endMs / 1000) * FPS);
      word.highlightAt = startFrame;
      word.highlightEnd = endFrame;
      searchFromIndex = best.endIndex + 1;

      const snapNote =
        snappedMs === null
          ? " (no onset within window)"
          : ` (snapped ${snappedMs >= 0 ? "+" : ""}${Math.round(snappedMs)}ms onto speech)`;
      console.log(
        `  ${word.word} ("${best.target}"): ${(startMs / 1000).toFixed(2)}s-${(endMs / 1000).toFixed(2)}s -> frames ${startFrame}-${endFrame} ratio ${best.ratio.toFixed(2)}${snapNote}`,
      );
    }
  }

  // A short reads `highlightAt` off the segment itself, so lift it back out of
  // the scratch `words` array the matcher needed and drop that array again.
  if (!data.scenes) {
    for (const segment of data.segments ?? []) {
      const matched = segment.words?.[0];
      delete segment.highlightAt;
      delete segment.highlightEnd;
      if (matched?.highlightAt !== undefined) {
        segment.highlightAt = matched.highlightAt;
        segment.highlightEnd = matched.highlightEnd;
      }
      delete segment.words;
    }
  }

  fs.writeFileSync(epJsonPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`\nWrote highlightAt values into ${path.relative(projectRoot, epJsonPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
