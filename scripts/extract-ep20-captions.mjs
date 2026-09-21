import fs from 'fs';
import path from 'path';

const frames = [
  ['01-cold-open', 0],
  ['02-broken-common-sense', 59.04],
  ['03-physics-crash', 93.00],
  ['04-lazy-tongue-rule', 133.80],
  ['05-step1-woo-eo', 172.00],
  ['06-step2-eul-resonance', 211.24],
  ['07-world-payoff', 251.00],
  ['08-girl-transfer', 290.92],
  ['09-quiz-word-vs-world', 326.92],
  ['10-quiz-pearl-curl', 393.08],
  ['11-cheatsheet-summary', 440.96],
  ['12-closing', 478.84],
];

const baseDir = 'videos/ep20-world-rl/compositions/frames/';
const all = [];

for (const [name, frameStart] of frames) {
  const html = fs.readFileSync(path.join(baseDir, name + '.html'), 'utf8');

  // 1. Extract all caption texts by id
  // <div ... class="caption-line" id="capX">text</div>
  const capTexts = {};
  const capDivRegex = /id="(cap\d+)"[^>]*>([\s\S]*?)<\/div>/g;
  let m;
  while ((m = capDivRegex.exec(html))) {
    capTexts[m[1]] = m[2].trim().replace(/<br\s*\/?>/g, ' ').replace(/\s+/g, ' ');
  }

  // 2. Extract trigger times from GSAP tl.to("#capX", { opacity: 1 ... }, time)
  const triggerRegex = /tl\.to\(\s*["']#(cap\d+)["']\s*,\s*\{[^}]*opacity:\s*1[^}]*\}\s*,\s*([\d.]+)\s*\)/g;
  const triggers = [];
  while ((m = triggerRegex.exec(html))) {
    const id = m[1];
    const localT = parseFloat(m[2]);
    triggers.push({ id, localT });
  }

  // Sort triggers by localT
  triggers.sort((a, b) => a.localT - b.localT);

  for (const trig of triggers) {
    const text = capTexts[trig.id];
    if (text) {
      all.push({
        frame: name,
        id: trig.id,
        localT: trig.localT,
        t: parseFloat((frameStart + trig.localT).toFixed(2)),
        text
      });
    }
  }
}

// Sort all by global time
all.sort((a, b) => a.t - b.t);

fs.writeFileSync('scripts/ep20-captions-raw.json', JSON.stringify(all, null, 2));
console.log('Total captions extracted:', all.length);
for (const c of all) {
  console.log(`${c.t.toFixed(2)}s | [${c.frame} / ${c.id}] | ${c.text}`);
}
