#!/usr/bin/env node
// Automated Audio Splitter for EP27 (-S · -ES Ending Rules: [s], [z], [ɪz])
// Splits batch recorded audio files (male_words_all.wav / female_words_all.wav / en_dialogue_all.wav)
// into individual word/sentence WAV files using ffmpeg silence detection.

import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");

// 24 words in exact order
const WORD_ITEMS = [
  // Group 1: [s] 무성음 끝소리 6단어
  { id: "w01_cats", text: "cats" },
  { id: "w02_cups", text: "cups" },
  { id: "w03_books", text: "books" },
  { id: "w04_laughs", text: "laughs" },
  { id: "w05_stops", text: "stops" },
  { id: "w06_sleeps", text: "sleeps" },

  // Group 2: [z] 유성음 끝소리 6단어
  { id: "w07_dogs", text: "dogs" },
  { id: "w08_plays", text: "plays" },
  { id: "w09_pens", text: "pens" },
  { id: "w10_calls", text: "calls" },
  { id: "w11_loves", text: "loves" },
  { id: "w12_dreams", text: "dreams" },

  // Group 3: [ɪz] 치찰음 쿠션 모음 6단어
  { id: "w13_buses", text: "buses" },
  { id: "w14_watches", text: "watches" },
  { id: "w15_boxes", text: "boxes" },
  { id: "w16_classes", text: "classes" },
  { id: "w17_changes", text: "changes" },
  { id: "w18_wishes", text: "wishes" },

  // Group 4: [ɪz] 특수 예외 & [z] 필수 동사 6단어
  { id: "w19_houses", text: "houses" },
  { id: "w20_prizes", text: "prizes" },
  { id: "w21_is", text: "is" },
  { id: "w22_was", text: "was" },
  { id: "w23_has", text: "has" },
  { id: "w24_does", text: "does" },
];

// 7 Dialogue sentences
const DIALOGUE_ITEMS = [
  { id: "dial_01", text: "Cats and dogs are great pets." },
  { id: "dial_02", text: "She plays games and calls him." },
  { id: "dial_03", text: "He watches the buses stop." },
  { id: "dial_04", text: "Open the boxes and see the changes." },
  { id: "dial_05", text: "She loves books and laughs a lot." },
  { id: "dial_06", text: "The old houses had many rooms." },
  { id: "dial_07", text: "He has two pens and does his best." },
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

// Measure Korean Host files
function measureKoreanFiles() {
  const koreanKeys = ["01_f01_hook", "02_f02_principle", "03_f09_summary"];
  const resultsPath = join(PROJECT_DIR, ".tts-results.json");
  const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {};

  console.log(`\n==================================================`);
  console.log(`Measuring Korean host audio files...`);

  koreanKeys.forEach(k => {
    const p = join(VOICE_DIR, `${k}.wav`);
    if (existsSync(p)) {
      const dur = getAudioDuration(p);
      results[k] = {
        path: `assets/voice/${k}.wav`,
        duration_s: Math.round(dur * 100) / 100,
      };
      console.log(`  ✓ ${k}.wav: ${dur.toFixed(2)}s`);
    } else {
      console.warn(`  ⚠ Missing: ${k}.wav`);
    }
  });

  writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
}

console.log("=== EP27 Batch Audio Auto-Splitter (Soft Tail & Fade Edition) ===");

measureKoreanFiles();
splitBatchFile("male_words_all.wav", WORD_ITEMS, "m");
splitBatchFile("female_words_all.wav", WORD_ITEMS, "f");
splitBatchFile("en_dialogue_all.wav", DIALOGUE_ITEMS, "");

console.log("\nAll EP27 audio processing completed successfully!");
