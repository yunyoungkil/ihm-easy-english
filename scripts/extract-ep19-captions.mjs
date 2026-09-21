import fs from 'fs';

const frames = [
  ['01-cold-open', 0],
  ['02-intro', 30.24],
  ['03-principle', 53.56],
  ['04-practice-estimate', 103.44],
  ['05-practice-separate', 147.12],
  ['06-practice-certificate', 197.08],
  ['07-secret-tip', 250.80],
  ['08-quiz-moderate', 304.04],
  ['09-quiz-delegate', 339.56],
  ['10-sentence-listening', 372.48],
  ['11-summary', 405.88],
  ['12-closing', 434.44],
];

const baseDir = 'videos/ep19-ate-suffix/compositions/frames/';
const all = [];

for (const [name, start] of frames) {
  const html = fs.readFileSync(baseDir + name + '.html', 'utf8');
  const re = /setCaption\("((?:[^"\\]|\\.)*)"\);\s*\},\s*null,\s*([\d.]+)\)/g;
  let m;
  while ((m = re.exec(html))) {
    const text = m[1].replace(/\\'/g, "'").replace(/\\"/g, '"');
    const t = start + parseFloat(m[2]);
    all.push({ frame: name, localT: parseFloat(m[2]), t, text });
  }
}

fs.writeFileSync('scripts/ep19-captions-raw.json', JSON.stringify(all, null, 2));
console.log('Total captions:', all.length);
for (const c of all) {
  console.log(c.t.toFixed(2), '|', c.frame, '|', c.text);
}
