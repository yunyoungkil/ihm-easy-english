// SCRIPT.md를 위에서부터 읽어 장·문항 시작 시각과 전체 길이를 추정한다(음성 생성 전 계획용, 가설 값).
// 한국어: 한글 글자 수 ÷ 4.19자/초(speech-patterns.json 롱폼 중앙값). 영어: 낱말 수로 추정. 음성을 만든 뒤에는 실제 길이로 바꾼다.
// 사용: node videos/ep37-listen-frozen-questions/scripts/estimate-timeline.mjs [--json]
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const md = readFileSync(join(HERE, '..', 'SCRIPT.md'), 'utf8');
const KO_RATE = 4.19;
const GAP = 0.3; // 조각 사이 숨
const SIG = {띵: 0.6, 뽁: 0.5, 종: 1.6};

// 영어 문장 표: q·a는 2부 표에서, d·x는 🔊 줄에서 읽는다.
const en = {};
for (const m of md.matchAll(/^\| (\d\d) \| ([^|]+)\| [^|]+\| ([^|]+)\|/gm)) {
  en[`q${m[1]}`] = m[2].trim();
  en[`a${m[1]}`] = m[3].trim();
}
for (const m of md.matchAll(/🔊 ([dx]\d\d)(?: \([^)]*\))? (.+)$/gm)) en[m[1]] = m[2].trim();
const words = (s) => (s || '').split(/\s+/).filter(Boolean).length;
const enDur = (id) => {
  const w = words(en[id]);
  if (id.startsWith('d')) return 0.6 * w + 0.6; // 끊어 읽기는 느리다
  return 0.3 * w + 0.5;
};
const han = (s) => (s.match(/[가-힣]/g) || []).length;

let t = 0;
const marks = [];
const lines = md.split(/\r?\n/);
let inText = false;
let buf = [];
let part2 = false;
let started = false; // 머리말("읽는 법")의 기호 설명은 세지 않는다
for (const raw of lines) {
  const line = raw.trim();
  if (!started) { if (line === '## 여는 장') started = true; else continue; }
  if (inText) {
    if (line.startsWith('```')) { t += han(buf.join(' ')) / KO_RATE + GAP; inText = false; buf = []; } else buf.push(line);
    continue;
  }
  if (line.startsWith('```text')) { inText = true; continue; }
  const h = line.match(/^(##|###) (.+)$/);
  if (h) {
    marks.push({t, level: h[1].length, title: h[2]});
    if (h[2].startsWith('2부 1회차')) part2 = 1;
    else if (h[2].startsWith('2부 2회차')) part2 = 2;
    else if (h[1] === '##' && !h[2].startsWith('2부')) part2 = false;
    continue;
  }
  if (part2 && /^\| \d\d \|/.test(line)) {
    const n = line.slice(2, 4);
    const ko = line.split('|')[3] || '';
    t += enDur(`q${n}`) + 2 + han(ko) / KO_RATE + GAP + enDur(`a${n}`) + 1;
    if (['06', '12', '18', '24'].includes(n)) t += SIG.종 + GAP;
    continue;
  }
  if (part2 === 2 && line.startsWith('- 🔊 q01 → a01')) {
    for (let i = 1; i <= 30; i += 1) {
      const n = String(i).padStart(2, '0');
      t += enDur(`q${n}`) + 1 + enDur(`a${n}`) + 1;
      if (i % 6 === 0 && i < 30) t += SIG.종 + GAP;
    }
    continue;
  }
  if (!line.startsWith('-')) continue;
  // 이어 듣기: (🔊 q → 🔔 뽁 → ⏸ 질문 길이+1초 [→ 🔊 a]) × qAA~qBB
  const loop = line.match(/× q(\d\d)~q(\d\d)/);
  if (loop) {
    const withA = line.includes('🔊 a');
    for (let i = Number(loop[1]); i <= Number(loop[2]); i += 1) {
      const n = String(i).padStart(2, '0');
      t += enDur(`q${n}`) + SIG.뽁 + enDur(`q${n}`) + 1 + (withA ? enDur(`a${n}`) + GAP : 0) + GAP;
    }
    continue;
  }
  for (const s of line.matchAll(/🔔 (띵|뽁|종)/g)) t += SIG[s[1]] + GAP;
  for (const s of line.matchAll(/🔊 ([qadx]\d\d)/g)) t += enDur(s[1]) + GAP;
  for (const s of line.matchAll(/⏸ (\d+)초/g)) t += Number(s[1]);
}
t += 9; // 엔드 화면
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({totalSeconds: Math.round(t), marks: marks.map((m) => ({...m, t: Math.round(m.t)}))}, null, 1));
} else {
  for (const m of marks.filter((x) => x.level === 2)) console.log(`${fmt(m.t)}  ${m.title}`);
  console.log(`합계 약 ${fmt(t)} (${Math.round(t)}초, 추정)`);
}
