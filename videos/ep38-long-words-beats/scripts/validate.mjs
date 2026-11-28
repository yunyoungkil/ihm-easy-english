const m = await import('file:///c:/Users/yunyo/.gemini/antigravity-ide/scratch/ihm-easy-english/scripts/transform-sheet.mjs');
const fs = await import('node:fs');
const s = JSON.parse(fs.readFileSync('c:/Users/yunyo/.gemini/antigravity-ide/scratch/ihm-easy-english/data/youtube/transform-sheets/' + process.argv[2] + '.json', 'utf8'));
let known = null; try { const pc = JSON.parse(fs.readFileSync('c:/Users/yunyo/.gemini/antigravity-ide/scratch/ihm-easy-english/data/youtube/packaging-cases.json','utf8')); known = new Set((pc.cases||pc).map(c=>c.id)); } catch {}
const p = m.validateSheet(s, { imageExists: m.sheetImageExists, knownCaseIds: known });
console.log(p.length ? p.join('\n') : 'NO PROBLEMS');
