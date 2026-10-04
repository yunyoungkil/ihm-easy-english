#!/usr/bin/env node
// Automated Audio Splitter for EP23
// Splits batch recorded audio files (male_all.wav / female_all.wav)
// into individual word/sentence WAV files using ffmpeg silence detection.
//
// Usage:
//   node videos/ep23-double-consonant/scripts/split-batch-voice.mjs

import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");

// [A] Male items in exact reading order (19 items total)
const MALE_ITEMS = [
  // F1
  { id: "en_coffee", text: "Coffee." },
  // F2
  { id: "en_hoping", text: "Hoping." },
  // F3 (ff)
  { id: "en_offer", text: "Offer." },
  { id: "en_different", text: "Different." },
  { id: "en_staff", text: "Staff." },
  // F4 (ll)
  { id: "en_yellow", text: "Yellow." },
  { id: "en_really", text: "Really." },
  { id: "en_all", text: "All." },
  // F5 (ss)
  { id: "en_class", text: "Class." },
  { id: "en_glass", text: "Glass." },
  { id: "en_lesson", text: "Lesson." },
  // F6 (pp)
  { id: "en_apple", text: "Apple." },
  { id: "en_supply", text: "Supply." },
  // F7 (boundary)
  { id: "en_unnamed", text: "Unnamed." },
  // F8 (flap tt)
  { id: "en_letter", text: "Letter." },
  { id: "en_better", text: "Better." },
  // F9 Sentences
  { id: "en_s03_class_at_ten", text: "I have class at ten." },
  { id: "en_s06_office_close", text: "The office is close to the cafe." },
  { id: "en_s07_coffee_after_class", text: "Let's get coffee after class." },
];

// [B] Female items in exact reading order (18 items total)
const FEMALE_ITEMS = [
  // F2
  { id: "en_hopping", text: "Hopping." },
  // F3 (ff)
  { id: "en_office", text: "Office." },
  { id: "en_effort", text: "Effort." },
  // F4 (ll)
  { id: "en_hello", text: "Hello." },
  { id: "en_call", text: "Call." },
  { id: "en_tall", text: "Tall." },
  // F5 (ss)
  { id: "en_dress", text: "Dress." },
  { id: "en_press", text: "Press." },
  { id: "en_miss", text: "Miss." },
  // F6 (pp)
  { id: "en_happy", text: "Happy." },
  { id: "en_happen", text: "Happen." },
  // F7 (boundary)
  { id: "en_midday", text: "Midday." },
  // F8 (flap tt)
  { id: "en_butter", text: "Butter." },
  { id: "en_little", text: "Little." },
  // F9 Sentences
  { id: "en_s01_two_coffees", text: "Two coffees, please." },
  { id: "en_s02_hows_it_going", text: "Hello, how's it going?" },
  { id: "en_s04_happy_birthday", text: "Happy birthday!" },
  { id: "en_s05_want_coffee", text: "Do you want a coffee?" },
];

function getAudioDuration(filePath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
    return parseFloat(out);
  } catch {
    return 0;
  }
}

function detectSilenceIntervals(filePath, noiseDb = -32, minSilenceSec = 0.6) {
  const cmd = `ffmpeg -i "${filePath}" -af silencedetect=noise=${noiseDb}dB:d=${minSilenceSec} -f null -`;
  let stderr = "";
  try {
    execSync(cmd, { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    stderr = err.stderr ? err.stderr.toString("utf8") : "";
  }

  const silences = [];
  const lines = stderr.split("\n");
  let currentStart = null;

  for (const line of lines) {
    const startMatch = line.match(/silence_start:\s*([\d\.]+)/);
    if (startMatch) {
      currentStart = parseFloat(startMatch[1]);
    }
    const endMatch = line.match(/silence_end:\s*([\d\.]+)/);
    if (endMatch && currentStart !== null) {
      silences.push({
        start: currentStart,
        end: parseFloat(endMatch[1]),
      });
      currentStart = null;
    }
  }

  return silences;
}

function computeSpeechSegments(totalDuration, silences) {
  const segments = [];
  let prevEnd = 0;

  for (const s of silences) {
    if (s.start > prevEnd + 0.1) {
      segments.push({
        start: Math.max(0, prevEnd - 0.05),
        end: Math.min(totalDuration, s.start + 0.08),
      });
    }
    prevEnd = s.end;
  }

  if (prevEnd < totalDuration - 0.1) {
    segments.push({
      start: Math.max(0, prevEnd - 0.05),
      end: totalDuration,
    });
  }

  return segments;
}

function splitBatchFile(batchFileName, items) {
  const batchFilePath = join(VOICE_DIR, batchFileName);
  if (!existsSync(batchFilePath)) {
    return false;
  }

  console.log(`\n==================================================`);
  console.log(`Processing batch audio: ${batchFileName}`);
  console.log(`Expected target items: ${items.length}`);

  const totalDur = getAudioDuration(batchFilePath);
  console.log(`Total duration: ${totalDur.toFixed(2)}s`);

  // Try thresholds to match exact count
  const thresholds = [-32, -30, -28, -35, -25];
  let chosenSegments = null;

  for (const db of thresholds) {
    for (const d of [0.6, 0.5, 0.7, 0.4, 0.8]) {
      const silences = detectSilenceIntervals(batchFilePath, db, d);
      const segments = computeSpeechSegments(totalDur, silences);
      if (segments.length === items.length) {
        console.log(`✓ Detected exactly ${segments.length} speech segments (noise=${db}dB, min_silence=${d}s)`);
        chosenSegments = segments;
        break;
      }
    }
    if (chosenSegments) break;
  }

  if (!chosenSegments) {
    // If not exact, show what was detected
    const defaultSilences = detectSilenceIntervals(batchFilePath, -30, 0.5);
    const defaultSegments = computeSpeechSegments(totalDur, defaultSilences);
    console.warn(
      `⚠ Warning: Detected ${defaultSegments.length} segments, but expected ${items.length}.`
    );
    console.warn(`  Using best effort matching.`);
    chosenSegments = defaultSegments;
  }

  const resultsPath = join(PROJECT_DIR, ".tts-results.json");
  const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {};

  const count = Math.min(items.length, chosenSegments.length);
  for (let i = 0; i < count; i++) {
    const item = items[i];
    const seg = chosenSegments[i];
    const outPath = join(VOICE_DIR, `${item.id}.wav`);
    const segDur = seg.end - seg.start;

    execSync(
      `ffmpeg -y -ss ${seg.start.toFixed(3)} -to ${seg.end.toFixed(3)} -i "${batchFilePath}" -c copy "${outPath}"`,
      { stdio: "ignore" }
    );

    const actualDur = getAudioDuration(outPath);
    results[item.id] = {
      path: `assets/voice/${item.id}.wav`,
      duration_s: Math.round(actualDur * 100) / 100,
    };
    console.log(`  [${i + 1}/${count}] ${item.id}.wav (${actualDur.toFixed(2)}s) — "${item.text}"`);
  }

  writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`✓ Successfully extracted ${count} audio files!`);
  return true;
}

console.log("=== EP23 Batch Audio Auto-Splitter ===");

let foundAny = false;

// 1. Male Batch
if (splitBatchFile("male_all.wav", MALE_ITEMS)) {
  foundAny = true;
} else if (
  splitBatchFile(
    "male_words.wav",
    MALE_ITEMS.filter((i) => !i.id.includes("_s0"))
  )
) {
  foundAny = true;
  splitBatchFile(
    "male_sentences.wav",
    MALE_ITEMS.filter((i) => i.id.includes("_s0"))
  );
}

// 2. Female Batch
if (splitBatchFile("female_all.wav", FEMALE_ITEMS)) {
  foundAny = true;
} else if (
  splitBatchFile(
    "female_words.wav",
    FEMALE_ITEMS.filter((i) => !i.id.includes("_s0"))
  )
) {
  foundAny = true;
  splitBatchFile(
    "female_sentences.wav",
    FEMALE_ITEMS.filter((i) => i.id.includes("_s0"))
  );
}

if (!foundAny) {
  console.log("\nNo batch audio files found in assets/voice/ yet.");
  console.log("Please save either:");
  console.log("  - male_all.wav & female_all.wav");
  console.log("  - or male_words.wav, female_words.wav, male_sentences.wav, female_sentences.wav");
  console.log("into videos/ep23-double-consonant/assets/voice/ and re-run this script!");
}
