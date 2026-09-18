import fs from 'fs';
import path from 'path';

const indexHtmlPath = 'videos/ep18-silent-consonants/index.html';
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

const sceneRegex = /<div\s+[^>]*id=["']scene-([^"']+)["'][^>]*data-composition-src=["']([^"']+)["'][^>]*data-start=["']([0-9.]+)["'][^>]*data-duration=["']([0-9.]+)["']/g;

let scenes = [];
let match;
while ((match = sceneRegex.exec(indexHtml)) !== null) {
  scenes.push({
    id: match[1],
    src: match[2],
    start: parseFloat(match[3]),
    duration: parseFloat(match[4])
  });
}

console.log(`Parsed ${scenes.length} scenes from ep18 index.html`);

let allCaptions = [];

for (let s of scenes) {
  const framePath = path.join('videos/ep18-silent-consonants', s.src);
  if (!fs.existsSync(framePath)) {
    console.warn(`Missing frame file: ${framePath}`);
    continue;
  }
  const content = fs.readFileSync(framePath, 'utf8');

  // Regex to match: setCaption("...") accurately
  const capCallRegex = /setCaption\(\s*["']([^"'\r\n]+)["']\s*\)/g;
  // Also need to find the timestamp in tl.call(..., null, TIME)
  // Let's parse each tl.call block
  const tlCallRegex = /tl\.call\(\s*function\s*\(\)\s*\{([\s\S]*?)\}\s*,\s*null\s*,\s*([0-9.]+)\s*\)/g;
  let callMatch;
  let sceneCaptions = [];
  while ((callMatch = tlCallRegex.exec(content)) !== null) {
    const fnBody = callMatch[1];
    const at = parseFloat(callMatch[2]);
    const textMatch = fnBody.match(/setCaption\(\s*"([^"\r\n]+)"\s*\)/) || fnBody.match(/setCaption\(\s*'([^'\r\n]+)'\s*\)/);
    if (textMatch) {
      sceneCaptions.push({ at, text: textMatch[1].trim() });
    }
  }

  // Sort by at
  sceneCaptions.sort((a, b) => a.at - b.at);

  for (let i = 0; i < sceneCaptions.length; i++) {
    let absStart = s.start + sceneCaptions[i].at;
    let absEnd = (i < sceneCaptions.length - 1)
      ? (s.start + sceneCaptions[i+1].at - 0.05)
      : (s.start + s.duration - 0.2);

    // Frame 15 keeps last 5 seconds empty
    if (s.id === '15-closing') {
      absEnd = Math.min(absEnd, s.start + 16.64);
    }

    allCaptions.push({
      scene: s.id,
      at: sceneCaptions[i].at,
      start: absStart,
      end: absEnd,
      text: sceneCaptions[i].text
    });
  }
}

console.log(`Extracted total ${allCaptions.length} captions for EP18.`);
fs.writeFileSync('scripts/ep18-extracted-captions.json', JSON.stringify(allCaptions, null, 2), 'utf8');
console.log('Saved to scripts/ep18-extracted-captions.json');
