#!/usr/bin/env node
// Generate ONE ad-hoc TTS clip from raw text (any language) — not tied to
// SCRIPT.md or a frame number. Used to build composite frames that mix
// languages/voices within a single frame (e.g. Korean narration around real
// English example-sentence audio), which the standard SCRIPT.md-per-frame
// pipeline has no room for.
//
// Usage:
//   node scripts/gen-clip.mjs --id=<name> --text="..." --out=<path.wav>
//
// Prints one JSON line: { id, path, duration_s, words: [{id,text,start,end}] }
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const ENGINE = "C:/Users/yunyo/.claude/skills/media-use/audio/scripts/audio.mjs";

const flag = (name) => {
  const a = process.argv.find((a) => a.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : null;
};

const id = flag("id");
const text = flag("text");
const out = flag("out");
if (!id || !text || !out) {
  console.error('Usage: node gen-clip.mjs --id=<name> --text="..." --out=<path.wav>');
  process.exit(1);
}

const request = {
  provider: "auto",
  speed: 1.0,
  lines: [{ id, text }],
  bgm: { mode: "none" },
};

const reqPath = join(PROJECT_DIR, `.scratch-req-${id}.json`);
const scratchNeutralPath = join(PROJECT_DIR, `.scratch-neutral-${id}.json`);
writeFileSync(reqPath, JSON.stringify(request, null, 2));

const r = spawnSync(
  "node",
  [ENGINE, "--request", reqPath, "--hyperframes", PROJECT_DIR, "--out", scratchNeutralPath, "--only", "tts"],
  { stdio: ["ignore", "pipe", "inherit"] },
);
if (r.status !== 0) {
  console.error(`engine exited ${r.status}`);
  process.exit(1);
}

const scratch = JSON.parse(readFileSync(scratchNeutralPath, "utf8"));
const v = scratch.voices.find((v) => v.id === id);
if (!v) {
  console.error(`No voice "${id}" in engine output`);
  process.exit(1);
}

const srcPath = resolve(PROJECT_DIR, v.path);
const outPath = resolve(out);
copyFileSync(srcPath, outPath);

unlinkSync(reqPath);
unlinkSync(scratchNeutralPath);

console.log(
  JSON.stringify({
    id,
    path: outPath,
    duration_s: v.duration_s,
    words: (v.words ?? []).map((w) => ({ id: w.id, text: w.text, start: w.start, end: w.end })),
  }),
);
