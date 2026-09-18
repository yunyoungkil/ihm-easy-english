import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ep18Dir = 'c:/Users/yunyo/Downloads/project/videos/ep18-silent-consonants';
const ttsResults = JSON.parse(readFileSync(join(ep18Dir, '.tts-results.json'), 'utf8'));

// Exact durations
const durations = {
  '01': ttsResults['01'].duration_s, // 29.52
  '02': ttsResults['02'].duration_s, // 10.96
  '03': ttsResults['03'].duration_s, // 16.20
  '04': ttsResults['04'].duration_s, // 27.48
  '05': ttsResults['05'].duration_s, // 30.16
  '06': ttsResults['06'].duration_s, // 36.72
  '07': ttsResults['07'].duration_s, // 40.24
  '08': ttsResults['08'].duration_s, // 34.64
  '09': ttsResults['09'].duration_s, // 28.72
  '10': ttsResults['10'].duration_s, // 42.46
  '11': ttsResults['11'].duration_s, // 27.40
  '12': ttsResults['12'].duration_s, // 22.52
  '13': ttsResults['13'].duration_s, // 26.20
  '14': ttsResults['14'].duration_s, // 19.16
  '15': ttsResults['15'].duration_s  // 16.64 (+5.0s = 21.64)
};

// Calculate cumulative timestamps
let cur = 0;
const timeline = {};
for (let i = 1; i <= 15; i++) {
  const key = String(i).padStart(2, '0');
  const dur = durations[key];
  const start = cur;
  const frameDur = (i === 15) ? dur + 5.0 : dur;
  const end = start + frameDur;
  timeline[key] = {
    start: Number(start.toFixed(2)),
    end: Number(end.toFixed(2)),
    dur: Number(frameDur.toFixed(2)),
    audioDur: Number(dur.toFixed(2))
  };
  cur = end;
}

const totalSec = Number(cur.toFixed(2));
const minutes = Math.floor(totalSec / 60);
const remainingSec = (totalSec % 60).toFixed(2);
console.log(`Total: ${totalSec}s (${minutes}분 ${remainingSec}초)`);

// 1. Update STORYBOARD.md
let sb = readFileSync(join(ep18Dir, 'STORYBOARD.md'), 'utf8');
sb = sb.replace(
  /duration: [^\n]+/,
  `duration: ${totalSec}s (${minutes}분 ${remainingSec}초 — 15프레임 Gemini Charon TTS + whisper 실측 완료)`
);

for (let i = 1; i <= 15; i++) {
  const key = String(i).padStart(2, '0');
  const t = timeline[key];
  const frameRegex = new RegExp(`(## Frame ${i} [^\\n]+\\n[\\s\\S]*?)- duration: [^\\n]+`);
  const durText = (i === 15) 
    ? `- duration: ${t.audioDur}s 나레이션 + 5.0s 엔드스크린 keep-out = ${t.dur}s 총 (누적 총 ${totalSec}s / ${minutes}분 ${remainingSec}초)`
    : `- duration: ${t.dur}s (실측 ${t.dur}s)`;
  sb = sb.replace(frameRegex, `$1${durText}`);
}
writeFileSync(join(ep18Dir, 'STORYBOARD.md'), sb, 'utf8');

// 2. Update SCRIPT.md
let sc = readFileSync(join(ep18Dir, 'SCRIPT.md'), 'utf8');
sc = sc.replace(
  /전체 대본 완성본 \(총 15프레임 [^\n]+\)/,
  `전체 대본 완성본 (총 15프레임 — 실측 러닝타임 ${minutes}분 ${remainingSec}초 / ${totalSec}초, Gemini Charon TTS 타겟).`
);

for (let i = 1; i <= 15; i++) {
  const key = String(i).padStart(2, '0');
  const t = timeline[key];
  const lineRegex = new RegExp(`(## Line ${i} [^\\n]+\\n\\n)\\*\\*Time:\\*\\* [^\\n]+`);
  const timeText = (i === 15)
    ? `**Time:** ${t.start.toFixed(2)} – ${t.end.toFixed(2)}s (나레이션 ${t.audioDur.toFixed(2)}s + 엔드스크린 5.0s = 총 ${t.dur.toFixed(2)}s, 누적 총 ${totalSec}s / ${minutes}분 ${remainingSec}초)`
    : `**Time:** ${t.start.toFixed(2)} – ${t.end.toFixed(2)}s (실측 ${t.dur.toFixed(2)}s)`;
  sc = sc.replace(lineRegex, `$1${timeText}`);
}
writeFileSync(join(ep18Dir, 'SCRIPT.md'), sc, 'utf8');

console.log('Successfully updated STORYBOARD.md and SCRIPT.md!');
