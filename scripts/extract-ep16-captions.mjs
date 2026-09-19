import fs from 'fs';
import path from 'path';

const PROJECT = 'videos/ep16-double-vowels';
const indexHtmlPath = `${PROJECT}/index.html`;
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const sceneRegex = /<div\s+[^>]*id=["']scene-([^"']+)["'][^>]*data-composition-src=["']([^"']+)["'][^>]*data-start=["']([0-9.]+)["'][^>]*data-duration=["']([0-9.]+)["']/g;

let scenes = [];
let match;
while ((match = sceneRegex.exec(indexHtml)) !== null) {
  scenes.push({
    id: match[1],
    src: match[2],
    start: parseFloat(match[3]),
    duration: parseFloat(match[4]),
  });
}

console.log(`Parsed ${scenes.length} scenes from index.html`);

let allCaptions = [];
for (const s of scenes) {
  const framePath = path.join(PROJECT, s.src);
  if (!fs.existsSync(framePath)) {
    console.warn(`Missing frame file: ${framePath}`);
    continue;
  }
  const content = fs.readFileSync(framePath, 'utf8');
  // EP16 frames use a few different caption-array variable names across frames
  // (CAPTIONS, ABSTRACT_CAPTIONS + CLOSING_CAPTIONS, RULE_CAPTIONS, etc.) — collect
  // every `var <NAME>_CAPTIONS? = [...]` block found in the file, in source order,
  // rather than assuming a single fixed name like EP17/18 did.
  const capRegex = /var\s+([A-Z_]*CAPTIONS[A-Z_]*)\s*=\s*(\[[\s\S]*?\]);/g;
  let capMatch;
  let foundAny = false;
  while ((capMatch = capRegex.exec(content)) !== null) {
    foundAny = true;
    try {
      const jsonStr = capMatch[2]
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/,\s*([\]}])/g, '$1');
      const caps = JSON.parse(jsonStr);
      for (let i = 0; i < caps.length; i++) {
        let absStart = s.start + caps[i].at;
        let absEnd = i < caps.length - 1 ? s.start + caps[i + 1].at - 0.1 : s.start + s.duration - 0.2;
        allCaptions.push({
          scene: s.id,
          group: capMatch[1],
          at: caps[i].at,
          start: absStart,
          end: absEnd,
          text: caps[i].text,
        });
      }
    } catch (err) {
      console.error(`Error parsing ${capMatch[1]} in ${s.id}:`, err.message);
    }
  }
  if (!foundAny) console.warn(`No CAPTIONS-like array found in ${s.id}`);
}

// Fix any end times that were computed against the wrong following group's `at`
// (e.g. two separate CAPTIONS arrays in the same frame, like Frame 5's ABSTRACT_ +
// CLOSING_ pair) by re-deriving end = next caption's start - 0.1 across the whole
// per-scene sequence, sorted by absolute start.
const byScene = {};
for (const c of allCaptions) {
  (byScene[c.scene] = byScene[c.scene] || []).push(c);
}
allCaptions = [];
for (const sceneId of Object.keys(byScene)) {
  const list = byScene[sceneId].sort((a, b) => a.start - b.start);
  const sceneDuration = scenes.find((s) => s.id === sceneId).duration;
  const sceneStart = scenes.find((s) => s.id === sceneId).start;
  for (let i = 0; i < list.length; i++) {
    list[i].end = i < list.length - 1 ? Math.min(list[i + 1].start - 0.1, sceneStart + sceneDuration - 0.2) : sceneStart + sceneDuration - 0.2;
    allCaptions.push(list[i]);
  }
}
allCaptions.sort((a, b) => a.start - b.start);

console.log(`Extracted total ${allCaptions.length} captions.`);
fs.writeFileSync('scripts/ep16-extracted-captions.json', JSON.stringify(allCaptions, null, 2), 'utf8');
console.log('Saved to scripts/ep16-extracted-captions.json');
