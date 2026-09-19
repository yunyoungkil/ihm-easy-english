const fs = require('fs');
const path = require('path');

const frames = [
  { file: '01-cold-open.html', id: '01-cold-open' },
  { file: '02-intro.html', id: '02-intro' },
  { file: '03-principle.html', id: '03-principle' },
  { file: '04-practice-estimate.html', id: '04-practice-estimate' },
  { file: '05-practice-separate.html', id: '05-practice-separate' },
  { file: '06-practice-certificate.html', id: '06-practice-certificate' },
  { file: '07-secret-tip.html', id: '07-secret-tip' },
  { file: '08-quiz-moderate.html', id: '08-quiz-moderate' },
  { file: '09-quiz-delegate.html', id: '09-quiz-delegate' },
  { file: '10-sentence-listening.html', id: '10-sentence-listening' },
  { file: '11-summary.html', id: '11-summary' },
  { file: '12-closing.html', id: '12-closing' }
];

for (const f of frames) {
  const p = path.join(__dirname, '..', 'compositions', 'frames', f.file);
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace('<div id="root">', `<div id="root" data-composition-id="${f.id}" data-width="1920" data-height="1080">`);
  fs.writeFileSync(p, c, 'utf8');
  console.log('Updated', f.file);
}
