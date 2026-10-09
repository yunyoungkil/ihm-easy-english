import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");
const RESULTS_PATH = join(PROJECT_DIR, ".tts-results.json");

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

const results = {};
const files = readdirSync(VOICE_DIR).filter(f => f.endsWith(".wav") && !f.includes("_all.wav"));

for (const f of files) {
  const p = join(VOICE_DIR, f);
  const dur = getAudioDuration(p);
  const key = f.replace(".wav", "");
  results[key] = {
    path: `assets/voice/${f}`,
    duration_s: Math.round(dur * 100) / 100
  };
}

writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2), "utf8");
console.log(`✓ Measured ${Object.keys(results).length} audio files in assets/voice!`);
