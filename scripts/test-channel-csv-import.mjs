import { readFileSync } from 'fs';

const csvPath = 'imports/youtube-studio/콘텐츠 2025-06-18_2026-08-29 이해하면 쉬운 영어/표 데이터.csv';
const csvText = readFileSync(csvPath, 'utf8');

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let inQuotes = false;
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(cur.trim());
      cur = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur.trim());
      if (row.some(x => x !== '')) rows.push(row);
      row = [];
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur || row.length) {
    row.push(cur.trim());
    if (row.some(x => x !== '')) rows.push(row);
  }
  return rows;
}

const rows = parseCsvRows(csvText);
const headers = rows[0];
console.log('Headers:', headers);
console.log('Total rows:', rows.length);

const impIdx = headers.findIndex(h => h.includes('노출수') || h.toLowerCase().includes('impressions'));
const ctrIdx = headers.findIndex(h => h.includes('클릭률') || h.toLowerCase().includes('ctr'));

console.log('impIdx:', impIdx, 'ctrIdx:', ctrIdx);

let matchedCount = 0;
for (let i = 1; i < rows.length; i++) {
  const r = rows[i];
  const rowId = r[0];
  const rowTitle = r[1];
  if (rowId === '합계' || !rowId) continue;
  const imp = Number(r[impIdx]?.replace(/,/g, '')) || 0;
  const ctr = Number(r[ctrIdx]?.replace(/%/g, '')) || 0;
  console.log(`Row ${i}: [${rowId}] "${rowTitle?.slice(0, 25)}" -> Imp: ${imp}, CTR: ${ctr}%`);
  matchedCount++;
}
console.log('Total Video Rows Matched:', matchedCount);
