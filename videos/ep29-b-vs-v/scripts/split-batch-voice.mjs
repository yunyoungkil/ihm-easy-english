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
  // Group 1: 1단계 기초 짝단어 6쌍 (12단어)
  { id: "w01_best", text: "best" },
  { id: "w02_vest", text: "vest" },
  { id: "w03_ban", text: "ban" },
  { id: "w04_van", text: "van" },
  { id: "w05_berry", text: "berry" },
  { id: "w06_very", text: "very" },
  { id: "w07_bat", text: "bat" },
  { id: "w08_vat", text: "vat" },
  { id: "w09_bet", text: "bet" },
  { id: "w10_vet", text: "vet" },
  { id: "w11_boat", text: "boat" },
  { id: "w12_vote", text: "vote" },

  // Group 2: 2단계 패턴 확장 6쌍 (12단어)
  { id: "w13_base", text: "base" },
  { id: "w14_vase", text: "vase" },
  { id: "w15_bile", text: "bile" },
  { id: "w16_vile", text: "vile" },
  { id: "w17_bolt", text: "bolt" },
  { id: "w18_volt", text: "volt" },
  { id: "w19_bow", text: "bow" },
  { id: "w20_vow", text: "vow" },
  { id: "w21_bale", text: "bale" },
  { id: "w22_veil", text: "veil" },
  { id: "w23_bane", text: "bane" },
  { id: "w24_vane", text: "vane" },

  // Group 3: 3단계 심화 짝단어 6쌍 (12단어)
  { id: "w25_bicker", text: "bicker" },
  { id: "w26_vicker", text: "vicker" },
  { id: "w27_bind", text: "bind" },
  { id: "w28_vine", text: "vine" },
  { id: "w29_bribe", text: "bribe" },
  { id: "w30_vibe", text: "vibe" },
  { id: "w31_curb", text: "curb" },
  { id: "w32_curve", text: "curve" },
  { id: "w33_rib", text: "rib" },
  { id: "w34_rive", text: "rive" },
  { id: "w35_lobe", text: "lobe" },
  { id: "w36_love", text: "love" },

  // Group 4: 4단계 어말/어중 6쌍 (12단어)
  { id: "w37_cab", text: "cab" },
  { id: "w38_calve", text: "calve" },
  { id: "w39_dub", text: "dub" },
  { id: "w40_dove", text: "dove" },
  { id: "w41_rob", text: "rob" },
  { id: "w42_rove", text: "rove" },
  { id: "w43_marble", text: "marble" },
  { id: "w44_marvel", text: "marvel" },
  { id: "w45_habit", text: "habit" },
  { id: "w46_have_it", text: "have it" },
  { id: "w47_ribbon", text: "ribbon" },
  { id: "w48_riven", text: "riven" },
];

// 7 Dialogue sentences
const DIALOGUE_ITEMS = [
  { id: "dial_01", text: "Is this the best vest you have?" },
  { id: "dial_02", text: "Yes, you can take the van without a ban." },
  { id: "dial_03", text: "I like this berry very much." },
  { id: "dial_04", text: "Did you take the boat to cast your vote?" },
  { id: "dial_05", text: "Put the flower in a base or a vase?" },
  { id: "dial_06", text: "Check the bolt and the high volt line." },
  { id: "dial_07", text: "She made a solemn vow with a gentle bow." },
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
