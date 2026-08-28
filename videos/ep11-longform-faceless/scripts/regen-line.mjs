#!/usr/bin/env node
// Regenerate ONE (or a few) narration line(s)' TTS without re-touching the
// others. The skill adapter (faceless-explainer/scripts/audio.mjs) always
// parses the whole SCRIPT.md and sends every line in one request — fine when
// most lines are actually changing, wasteful when only one is (13x the API
// calls for a single-line text edit; this is what burned through HeyGen's
// free tier earlier in this project).
//
// This calls the shared engine directly for just the target frame(s) and
// splices the result into the existing audio_meta.json / audio_engine_meta.json
// — every other frame's entry is left untouched, byte-for-byte.
//
// Usage:
//   node scripts/regen-line.mjs --frame=10
//   node scripts/regen-line.mjs --frame=5 --frame=10
//
// After running, continue the normal pipeline from sync-durations onward.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const ENGINE = "C:/Users/yunyo/.claude/skills/media-use/audio/scripts/audio.mjs";

const args = process.argv.slice(2);
const frames = args
  .filter((a) => a.startsWith("--frame="))
  .map((a) => Number(a.split("=")[1]));

if (frames.length === 0) {
  console.error("Usage: node regen-line.mjs --frame=<N> [--frame=<N> ...]");
  process.exit(1);
}

const pad2 = (n) => String(n).padStart(2, "0");

// Same SCRIPT.md parser shape as the skill adapter — single source of truth
// for line text stays SCRIPT.md, never duplicated here.
function parseScript(md) {
  const out = [];
  let cur = null;
  const flush = () => {
    if (cur && cur.text.trim()) out.push({ frame: cur.frame, text: cur.text.trim() });
    cur = null;
  };
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^#{2,3}\s+.*?\(frame\s+(\d+)\)/i);
    if (h) {
      flush();
      cur = { frame: Number(h[1]), text: "" };
      continue;
    }
    if (!cur) continue;
    if (/^\s*\*\*/.test(line)) continue;
    const m = line.match(/^(?: {4,}|\t)(.+)$/);
    if (m) cur.text += (cur.text ? " " : "") + m[1].trim();
  }
  flush();
  return out;
}

const scriptPath = join(PROJECT_DIR, "SCRIPT.md");
const allLines = parseScript(readFileSync(scriptPath, "utf8"));
const targetLines = allLines.filter((l) => frames.includes(l.frame));
const missing = frames.filter((f) => !targetLines.some((l) => l.frame === f));
if (missing.length > 0) {
  console.error(`Frame(s) not found in SCRIPT.md: ${missing.join(", ")}`);
  process.exit(1);
}

const request = {
  provider: "auto",
  speed: 1.0,
  lines: targetLines.map((l) => ({ id: pad2(l.frame), text: l.text })),
  bgm: { mode: "none" },
};

const reqPath = join(PROJECT_DIR, "audio_request.json");
const scratchNeutralPath = join(PROJECT_DIR, ".scratch-neutral-meta.json");
writeFileSync(reqPath, JSON.stringify(request, null, 2));

console.log(`Regenerating frame(s) ${frames.join(", ")} only (${targetLines.length} line(s))...`);
const r = spawnSync(
  "node",
  [ENGINE, "--request", reqPath, "--hyperframes", PROJECT_DIR, "--out", scratchNeutralPath, "--only", "tts"],
  { stdio: "inherit" },
);
if (r.status !== 0) {
  console.error(`engine exited ${r.status}`);
  process.exit(1);
}

const scratch = JSON.parse(readFileSync(scratchNeutralPath, "utf8"));

// Splice into audio_engine_meta.json (neutral, id-keyed): replace only the
// regenerated ids, preserve every other voice entry and its original order.
const neutralPath = join(PROJECT_DIR, "audio_engine_meta.json");
const neutral = JSON.parse(readFileSync(neutralPath, "utf8"));
const order = neutral.voices.map((v) => v.id);
const byId = new Map(neutral.voices.map((v) => [v.id, v]));
for (const v of scratch.voices) {
  if (!order.includes(v.id)) order.push(v.id);
  byId.set(v.id, v);
}
neutral.voices = order.map((id) => byId.get(id));
writeFileSync(neutralPath, JSON.stringify(neutral, null, 2));

// Splice into audio_meta.json (product-launch shape, frame-keyed) the same way.
const metaPath = join(PROJECT_DIR, "audio_meta.json");
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const byFrame = new Map(meta.voices.map((v) => [v.frame, v]));
for (const v of scratch.voices) {
  byFrame.set(Number(v.id), {
    frame: Number(v.id),
    path: v.path,
    duration_s: v.duration_s,
    words: (v.words ?? []).map((w) => ({ id: w.id, text: w.text, start: w.start, end: w.end })),
  });
}
meta.voices = [...byFrame.values()].sort((a, b) => a.frame - b.frame);
writeFileSync(metaPath, JSON.stringify(meta, null, 2));

console.log(`\nDone — audio_meta.json / audio_engine_meta.json updated for frame(s) ${frames.join(", ")} only:`);
for (const v of scratch.voices) {
  console.log(`  frame ${v.id}: ${v.duration_s}s, ${v.words?.length ?? 0} words`);
}
console.log(
  `\nNext: sync-durations, captions.mjs build, assemble-index.mjs, transitions.mjs inject/verify, npm run check.`,
);
