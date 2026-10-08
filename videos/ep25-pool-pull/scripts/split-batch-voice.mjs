#!/usr/bin/env node
// Automated Audio Splitter for EP25 (Pool vs Pull [uː] vs [ʊ])
// Splits batch recorded audio files (male_words_all.wav / female_words_all.wav / male_en_dialogue_all.wav / female_en_dialogue_all.wav)
// into individual word/sentence WAV files using ffmpeg silence detection.
//
// Key Feature: 
//   - Includes 250ms tail padding and 50ms soft fade-out to prevent abrupt cut-offs / clipping.
//
// Usage:
//   node videos/ep25-pool-pull/scripts/split-batch-voice.mjs

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");

// 20 pairs = 40 words in exact order
const WORD_ITEMS = [
  // Group 1: 핵심 명사 & 동사
  { id: "w01_pool", text: "pool" },
  { id: "w02_pull", text: "pull" },
  { id: "w03_fool", text: "fool" },
  { id: "w04_full", text: "full" },
  { id: "w05_Luke", text: "Luke" },
  { id: "w06_look", text: "look" },
  { id: "w07_suit", text: "suit" },
  { id: "w08_soot", text: "soot" },
  { id: "w09_kook", text: "kook" },
  { id: "w10_cook", text: "cook" },

  // Group 2: 조동사 & 과거형
  { id: "w11_cooed", text: "cooed" },
  { id: "w12_could", text: "could" },
  { id: "w13_shooed", text: "shooed" },
  { id: "w14_should", text: "should" },
  { id: "w15_wooed", text: "wooed" },
  { id: "w16_wood", text: "wood" },
  { id: "w17_stewed", text: "stewed" },
  { id: "w18_stood", text: "stood" },
  { id: "w19_whod", text: "who'd" },
  { id: "w20_hood", text: "hood" },

  // Group 3: 불규칙 과거 & 동작
  { id: "w21_shoot", text: "shoot" },
  { id: "w22_shook", text: "shook" },
  { id: "w23_toot", text: "toot" },
  { id: "w24_took", text: "took" },
  { id: "w25_booed", text: "booed" },
  { id: "w26_bull", text: "bull" },
  { id: "w27_rood", text: "rood" },
  { id: "w28_rook", text: "rook" },
  { id: "w29_coop", text: "coop" },
  { id: "w30_crook", text: "crook" },

  // Group 4: 일상 최다 혼동
  { id: "w31_food", text: "food" },
  { id: "w32_foot", text: "foot" },
  { id: "w33_boot", text: "boot" },
  { id: "w34_book", text: "book" },
  { id: "w35_goose", text: "goose" },
  { id: "w36_good", text: "good" },
  { id: "w37_cool", text: "cool" },
  { id: "w38_wool", text: "wool" },
  { id: "w39_room", text: "room" },
  { id: "w40_rook2", text: "rook" },
];

// 7 Dialogue sentences
const DIALOGUE_ITEMS = [
  { id: "dial_01_pull_push", text: "Pull the door, don't push it." },
  { id: "dial_02_full_fool", text: "I'm totally full, don't be a fool." },
  { id: "dial_03_look_Luke", text: "Look at Luke, he bought a sharp suit." },
  { id: "dial_04_stood_stewed", text: "He stood by the stove and stewed the soup." },
  { id: "dial_05_whod_hood", text: "Who'd wear a heavy hood today?" },
  { id: "dial_06_boots_shook", text: "He took off his boots and shook his head." },
  { id: "dial_07_food_mood", text: "Good food always puts me in a good mood." },
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

  const thresholds = [-32, -30, -28, -35, -25, -22, -38];
  let chosenSegments = null;

  for (const db of thresholds) {
    for (const d of [0.5, 0.4, 0.6, 0.3, 0.25, 0.7, 0.2]) {
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

console.log("=== EP25 Batch Audio Auto-Splitter (Soft Tail & Fade Edition) ===");

splitBatchFile("male_words_all.wav", WORD_ITEMS, "m");
splitBatchFile("female_words_all.wav", WORD_ITEMS, "f");
splitBatchFile("male_en_dialogue_all.wav", DIALOGUE_ITEMS, "m");
splitBatchFile("female_en_dialogue_all.wav", DIALOGUE_ITEMS, "f");

console.log("\nAll available batch audio splitting completed!");
