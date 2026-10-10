#!/usr/bin/env node
// Automated Audio Splitter for EP28 (F vs P 0.1초 조음 물리법칙: 24쌍 최소대립쌍)
// Splits batch recorded audio files (male_words_all.wav / female_words_all.wav / en_dialogue_all.wav)
// into individual word/sentence WAV files using ffmpeg silence detection.

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");

// 48 words (24 minimal pairs) in exact order
const WORD_ITEMS = [
  // Group 1: 단모음 기본 6쌍 (12단어)
  { id: "w01_fan", text: "fan" },
  { id: "w02_pan", text: "pan" },
  { id: "w03_fat", text: "fat" },
  { id: "w04_pat", text: "pat" },
  { id: "w05_fig", text: "fig" },
  { id: "w06_pig", text: "pig" },
  { id: "w07_fin", text: "fin" },
  { id: "w08_pin", text: "pin" },
  { id: "w09_fit", text: "fit" },
  { id: "w10_pit", text: "pit" },
  { id: "w11_fog", text: "fog" },
  { id: "w12_pog", text: "pog" },

  // Group 2: 장모음 & 이중모음 6쌍 (12단어)
  { id: "w13_feel", text: "feel" },
  { id: "w14_peel", text: "peel" },
  { id: "w15_feet", text: "feet" },
  { id: "w16_peat", text: "peat" },
  { id: "w17_fool", text: "fool" },
  { id: "w18_pool", text: "pool" },
  { id: "w19_face", text: "face" },
  { id: "w20_pace", text: "pace" },
  { id: "w21_fair", text: "fair" },
  { id: "w22_pair", text: "pair" },
  { id: "w23_fast", text: "fast" },
  { id: "w24_past", text: "past" },

  // Group 3: 실생활 2음절 필수 6쌍 (12단어)
  { id: "w25_coffee", text: "coffee" },
  { id: "w26_copy", text: "copy" },
  { id: "w27_office", text: "office" },
  { id: "w28_option", text: "option" },
  { id: "w29_follow", text: "follow" },
  { id: "w30_pillow", text: "pillow" },
  { id: "w31_forest", text: "forest" },
  { id: "w32_protect", text: "protect" },
  { id: "w33_fourteen", text: "fourteen" },
  { id: "w34_portion", text: "portion" },
  { id: "w35_freedom", text: "freedom" },
  { id: "w36_pressure", text: "pressure" },

  // Group 4: 받침/끝소리 6쌍 (12단어)
  { id: "w37_leaf", text: "leaf" },
  { id: "w38_leap", text: "leap" },
  { id: "w39_beef", text: "beef" },
  { id: "w40_beep", text: "beep" },
  { id: "w41_cuff", text: "cuff" },
  { id: "w42_cup", text: "cup" },
  { id: "w43_cliff", text: "cliff" },
  { id: "w44_clip", text: "clip" },
  { id: "w45_chef", text: "chef" },
  { id: "w46_step", text: "step" },
  { id: "w47_safe", text: "safe" },
  { id: "w48_tape", text: "tape" },
];

// 7 Dialogue sentences
const DIALOGUE_ITEMS = [
  { id: "dial_01", text: "I need a cup of hot coffee, not a copy." },
  { id: "dial_02", text: "Please turn on the fan and wash the pan." },
  { id: "dial_03", text: "The fast runner did not stop in the past." },
  { id: "dial_04", text: "Do not drink water from the pool, you fool." },
  { id: "dial_05", text: "I feel like I want to peel this fresh orange." },
  { id: "dial_06", text: "Keep the office safe and tape the box tight." },
  { id: "dial_07", text: "She has a real passion for high fashion." },
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

function computeSpeechSegments(totalDuration, silences) {
  const segments = [];
  let prevEnd = 0;

  for (const s of silences) {
    if (s.start > prevEnd + 0.1) {
      segments.push({
        start: Math.max(0, prevEnd - 0.05),
        end: Math.min(totalDuration, s.start + 0.25),
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

  const thresholds = [-30, -28, -32, -26, -35, -25, -22, -38, -40, -20];
  let chosenSegments = null;

  for (const db of thresholds) {
    for (const d of [0.4, 0.35, 0.45, 0.3, 0.5, 0.25, 0.6, 0.2, 0.15]) {
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
    const fadeDuration = 0.05;
    const fadeStart = Math.max(0, segDur - fadeDuration);

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

// Record Korean narration files in .tts-results.json as well
function recordNarrationFiles() {
  const resultsPath = join(PROJECT_DIR, ".tts-results.json");
  const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {};

  const narrations = [
    { id: "01_f01_hook", file: "01_f01_hook.wav" },
    { id: "02_f02_principle", file: "02_f02_principle.wav" },
    { id: "03_f09_summary", file: "03_f09_summary.wav" },
  ];

  for (const n of narrations) {
    const p = join(VOICE_DIR, n.file);
    if (existsSync(p)) {
      const dur = getAudioDuration(p);
      results[n.id] = {
        path: `assets/voice/${n.file}`,
        duration_s: Math.round(dur * 100) / 100,
      };
      console.log(`Recorded narration ${n.file} (${dur.toFixed(2)}s)`);
    }
  }

  writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
}

console.log("=== EP28 Automated Audio Splitting & Normalization ===");
recordNarrationFiles();

splitBatchFile("male_words_all.wav", WORD_ITEMS, "m");
splitBatchFile("female_words_all.wav", WORD_ITEMS, "f");
splitBatchFile("en_dialogue_all.wav", DIALOGUE_ITEMS, "");

console.log("\nAll batch voice assets processed!");
