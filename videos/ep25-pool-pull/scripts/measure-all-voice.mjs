import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");
const JSON_PATH = join(PROJECT_DIR, ".tts-results.json");

const results = existsSync(JSON_PATH) ? JSON.parse(readFileSync(JSON_PATH, "utf8")) : {};

const files = readdirSync(VOICE_DIR).filter(f => f.endsWith(".wav"));

for (const file of files) {
  const filePath = join(VOICE_DIR, file);
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
    const dur = parseFloat(out);
    const key = file.replace(".wav", "");
    results[key] = {
      path: `assets/voice/${file}`,
      duration_s: Math.round(dur * 100) / 100,
    };
  } catch (err) {
    console.error(`Failed to probe ${file}:`, err.message);
  }
}

writeFileSync(JSON_PATH, JSON.stringify(results, null, 2), "utf8");
console.log(`Measured ${files.length} audio files in assets/voice.`);
console.log(`Recorded in .tts-results.json.`);
