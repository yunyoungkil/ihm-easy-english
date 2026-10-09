#!/usr/bin/env node
// Automated Audio Splitter for EP26 (Right vs Light [r] vs [l])
// Splits batch recorded audio files (male_words_all.wav / female_words_all.wav / en_dialogue_all.wav)
// into individual word/sentence WAV files using ffmpeg silence detection.
//
// Key Feature: 
//   - Includes 250ms tail padding and 50ms soft fade-out to prevent abrupt cut-offs / clipping.
//
// Usage:
//   node videos/ep26-r-vs-l/scripts/split-batch-voice.mjs

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");

// 20 pairs = 40 words in exact order
const WORD_ITEMS = [
  // Group 1: 핵심 빈출 5쌍
  { id: "w01_right", text: "right" },
  { id: "w02_light", text: "light" },
  { id: "w03_red", text: "red" },
  { id: "w04_led", text: "led" },
  { id: "w05_rain", text: "rain" },
  { id: "w06_lane", text: "lane" },
  { id: "w07_row", text: "row" },
  { id: "w08_low", text: "low" },
  { id: "w09_raw", text: "raw" },
  { id: "w10_law", text: "law" },

  // Group 2: 필수 동사 5쌍
  { id: "w11_run", text: "run" },
  { id: "w12_learn", text: "learn" },
  { id: "w13_read", text: "read" },
  { id: "w14_lead", text: "lead" },
  { id: "w15_ride", text: "ride" },
  { id: "w16_lied", text: "lied" },
  { id: "w17_race", text: "race" },
  { id: "w18_lace", text: "lace" },
  { id: "w19_ring", text: "ring" },
  { id: "w20_ling", text: "ling" },

  // Group 3: 일상 명사 5쌍
  { id: "w21_river", text: "river" },
  { id: "w22_liver", text: "liver" },
  { id: "w23_rock", text: "rock" },
  { id: "w24_lock", text: "lock" },
  { id: "w25_road", text: "road" },
  { id: "w26_load", text: "load" },
  { id: "w27_room", text: "room" },
  { id: "w28_loom", text: "loom" },
  { id: "w29_root", text: "root" },
  { id: "w30_loot", text: "loot" },

  // Group 4: 자음군(Blends) 5쌍
  { id: "w31_pray", text: "pray" },
  { id: "w32_play", text: "play" },
  { id: "w33_crown", text: "crown" },
  { id: "w34_clown", text: "clown" },
  { id: "w35_grow", text: "grow" },
  { id: "w36_glow", text: "glow" },
  { id: "w37_fry", text: "fry" },
  { id: "w38_fly", text: "fly" },
  { id: "w39_grass", text: "grass" },
  { id: "w40_glass", text: "glass" },
];

// 7 Dialogue sentences
const DIALOGUE_ITEMS = [
  { id: "dial_01_right_light", text: "Turn right at the traffic light," },
  { id: "dial_02_pray_play", text: "He prays every night before he plays," },
  { id: "dial_03_road_load", text: "We ran across the road with a heavy load," },
  { id: "dial_04_read_lead", text: "Did you read about who will lead the team," },
  { id: "dial_05_lock_rock", text: "Please lock the door behind that big rock," },
  { id: "dial_06_clown_crown", text: "The clown wore a shiny gold crown," },
  { id: "dial_07_grass_glass", text: "Look at the green grass through the clean glass," },
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

  const thresholds = [-32, -30, -28, -35, -25, -22, -38, -40, -20];
  let chosenSegments = null;

  for (const db of thresholds) {
    for (const d of [0.5, 0.4, 0.6, 0.3, 0.25, 0.7, 0.2, 0.15]) {
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

console.log("=== EP26 Batch Audio Auto-Splitter (Soft Tail & Fade Edition) ===");

splitBatchFile("male_words_all.wav", WORD_ITEMS, "m");
splitBatchFile("female_words_all.wav", WORD_ITEMS, "f");
splitBatchFile("en_dialogue_all.wav", DIALOGUE_ITEMS, "dial");

console.log("\nAll available batch audio splitting completed!");
