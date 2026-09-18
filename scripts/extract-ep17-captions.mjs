import fs from 'fs';
import path from 'path';

const indexHtmlPath = 'videos/ep17-bossy-r/index.html';
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

console.log(`Parsed ${scenes.length} scenes from index.html`);

let allCaptions = [];
for (let s of scenes) {
  const framePath = path.join('videos/ep17-bossy-r', s.src);
  if (!fs.existsSync(framePath)) {
    console.warn(`Missing frame file: ${framePath}`);
    continue;
  }
  const content = fs.readFileSync(framePath, 'utf8');
  const capRegex = /var\s+CAPTIONS\s*=\s*(\[[\s\S]*?\]);/;
  const capMatch = content.match(capRegex);
  if (capMatch) {
    try {
      const jsonStr = capMatch[1]
        .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
        .replace(/,\s*([\]}])/g, '$1');
      const caps = JSON.parse(jsonStr);
      for (let i = 0; i < caps.length; i++) {
        let absStart = s.start + caps[i].at;
        let absEnd = (i < caps.length - 1) ? (s.start + caps[i+1].at - 0.1) : (s.start + s.duration - 0.2);
        if (s.id === '15-closing') {
          absEnd = Math.min(absEnd, s.start + 17.5);
        }
        allCaptions.push({
          scene: s.id,
          at: caps[i].at,
          start: absStart,
          end: absEnd,
          text: caps[i].text
        });
      }
    } catch (err) {
      console.error(`Error parsing CAPTIONS in ${s.id}:`, err.message);
    }
  } else {
    console.warn(`No CAPTIONS found in ${s.id}`);
  }
}

console.log(`Extracted total ${allCaptions.length} captions.`);
fs.writeFileSync('scripts/temp-extracted-captions.json', JSON.stringify(allCaptions, null, 2), 'utf8');
console.log('Saved to scripts/temp-extracted-captions.json');
