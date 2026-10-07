#!/usr/bin/env node
// Automated Audio Splitter for EP24 (Long [i:] vs Short [I])
// Splits batch recorded audio files (male_words_all.wav / female_words_all.wav / en_dialogue_all.wav)
// into individual word/sentence WAV files using ffmpeg silence detection.
//
// Key Feature: 
//   - Includes 250ms tail padding and 50ms soft fade-out to prevent abrupt cut-offs / clipping.
//
// Usage:
//   node videos/ep24-long-short-i/scripts/split-batch-voice.mjs

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");

// 20 pairs = 40 words in exact order
const WORD_ITEMS = [
  // Group 1
  { id: "w01_sheep", text: "sheep" },
  { id: "w02_ship", text: "ship" },
  { id: "w03_feet", text: "feet" },
  { id: "w04_fit", text: "fit" },
  { id: "w05_seat", text: "seat" },
  { id: "w06_sit", text: "sit" },
  { id: "w07_heel", text: "heel" },
  { id: "w08_hill", text: "hill" },
  { id: "w09_peel", text: "peel" },
  { id: "w10_pill", text: "pill" },

  // Group 2
  { id: "w11_meat", text: "meat" },
  { id: "w12_mitt", text: "mitt" },
  { id: "w13_peach", text: "peach" },
  { id: "w14_pitch", text: "pitch" },
  { id: "w15_beat", text: "beat" },
  { id: "w16_bit", text: "bit" },
  { id: "w17_heat", text: "heat" },
  { id: "w18_hit", text: "hit" },
  { id: "w19_cheap", text: "cheap" },
  { id: "w20_chip", text: "chip" },

  // Group 3
  { id: "w21_sleep", text: "sleep" },
  { id: "w22_slip", text: "slip" },
  { id: "w23_feel", text: "feel" },
  { id: "w24_fill", text: "fill" },
  { id: "w25_reach", text: "reach" },
  { id: "w26_rich", text: "rich" },
  { id: "w27_leave", text: "leave" },
  { id: "w28_live", text: "live" },
  { id: "w29_seek", text: "seek" },
  { id: "w30_sick", text: "sick" },

  // Group 4
  { id: "w31_lead", text: "lead" },
  { id: "w32_lid", text: "lid" },
  { id: "w33_teen", text: "teen" },
  { id: "w34_tin", text: "tin" },
  { id: "w35_deed", text: "deed" },
  { id: "w36_did", text: "did" },
  { id: "w37_steel", text: "steel" },
  { id: "w38_still", text: "still" },
  { id: "w39_beach", text: "beach" },
  { id: "w40_bitch", text: "bitch" },
];

// 7 Dialogue sentences
const DIALOGUE_ITEMS = [
  { id: "dial_01_seat_sit", text: "Please take a seat and sit down." },
  { id: "dial_02_feel_fill", text: "I feel like I should fill the cup." },
  { id: "dial_03_sleep_slip", text: "Did you sleep well, or did you slip?" },
  { id: "dial_04_reach_rich", text: "We can reach that rich neighborhood." },
  { id: "dial_05_leave_live", text: "Don't leave the house where you live." },
  { id: "dial_06_meat_mitt", text: "I ate some meat with a baseball mitt." },
  { id: "dial_07_beach", text: "Let's walk along the beach together." },
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

function detectSilenceIntervals(filePath, noiseDb = -30, minSilenceSec = 0.4) {
  const res = spawnSync(
    "ffmpeg",
    [
      "-i", filePath,
      "-af", `silencedetect=noise=${noiseDb}dB:d=${minSilenceSec}`,
      "-f", "null", "-"
    ],
    { encoding: "utf8" }
  );

  const stderr = res.stderr || "";
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

// Compute speech segments with 0.25s tail padding to prevent abrupt cutoff
function computeSpeechSegments(totalDuration, silences) {
  const segments = [];
  let prevEnd = 0;

  for (const s of silences) {
    if (s.start > prevEnd + 0.1) {
      segments.push({
        start: Math.max(0, prevEnd - 0.05), // 50ms pre-roll
        end: Math.min(totalDuration, s.start + 0.25), // 250ms tail padding
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

function splitBatchFile(batchFileName, items, prefix = "") {
  const batchFilePath = join(VOICE_DIR, batchFileName);
  if (!existsSync(batchFilePath)) {
    console.log(`[Skip] File not found: ${batchFileName}`);
    return false;
  }

  console.log(`\n==================================================`);
  console.log(`Processing batch audio: ${batchFileName}`);
  console.log(`Expected target items: ${items.length}`);

  const totalDur = getAudioDuration(batchFilePath);
  console.log(`Total duration: ${totalDur.toFixed(2)}s`);

  const thresholds = [-32, -30, -28, -35, -25];
  let chosenSegments = null;

  for (const db of thresholds) {
    for (const d of [0.5, 0.4, 0.6, 0.3, 0.7]) {
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
    const defaultSilences = detectSilenceIntervals(batchFilePath, -30, 0.4);
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
    const fileName = prefix ? `${prefix}_${item.id}.wav` : `${item.id}.wav`;
    const outPath = join(VOICE_DIR, fileName);
    const segDur = seg.end - seg.start;
    const fadeDuration = 0.05; // 50ms fade out
    const fadeStart = Math.max(0, segDur - fadeDuration);

    // Cut with 50ms soft fade-out at the end to prevent clicking and clipping
    execSync(
      `ffmpeg -y -ss ${seg.start.toFixed(3)} -to ${seg.end.toFixed(3)} -i "${batchFilePath}" -af "afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeDuration.toFixed(3)}" "${outPath}"`,
      { stdio: "ignore" }
    );

    const actualDur = getAudioDuration(outPath);
    const resultKey = prefix ? `${prefix}_${item.id}` : item.id;
    results[resultKey] = {
      path: `assets/voice/${fileName}`,
      duration_s: Math.round(actualDur * 100) / 100,
    };
    console.log(`  [${i + 1}/${count}] ${fileName} (${actualDur.toFixed(2)}s) — "${item.text}"`);
  }

  writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`✓ Successfully extracted ${count} audio files with soft decay tails!`);
  return true;
}

console.log("=== EP24 Batch Audio Auto-Splitter (Soft Tail & Fade Edition) ===");

splitBatchFile("male_words_all.wav", WORD_ITEMS, "m");
splitBatchFile("female_words_all.wav", WORD_ITEMS, "f");
splitBatchFile("en_dialogue_all.wav", DIALOGUE_ITEMS, "");

console.log("\nAll available batch audio splitting completed!");
