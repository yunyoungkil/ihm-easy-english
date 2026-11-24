import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const REPO_ROOT = resolve(EP_DIR, '..', '..');
const ASSETS = join(EP_DIR, 'assets');
const WHISPER_BIN = join(REPO_ROOT, '.whisper', 'main.exe');
const WHISPER_MODEL = join(REPO_ROOT, '.whisper', 'ggml-small.bin');
const SCRATCH = join(EP_DIR, '.whisper-scratch');
mkdirSync(SCRATCH, {recursive: true});

const timeline = JSON.parse(readFileSync(join(ASSETS, 'audio-timeline.json'), 'utf8'));

function runWhisper(wavPath, lang, tag) {
  const wav16 = join(SCRATCH, `${tag}.16k.wav`);
  const outBase = join(SCRATCH, tag);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', wavPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav16]);
  execFileSync(WHISPER_BIN, ['-m', WHISPER_MODEL, '-f', wav16, '-l', lang, '-ml', '1', '-oj', '-of', outBase], {
    stdio: 'pipe',
  });
  const j = JSON.parse(readFileSync(`${outBase}.json`, 'utf8'));
  const segments = (j.transcription || []).map((t) => ({
    start: +(t.offsets.from / 1000).toFixed(3),
    end: +(t.offsets.to / 1000).toFixed(3),
    text: String(t.text || '').trim(),
  })).filter((s) => s.text && !/^\[.*\]$/.test(s.text));
  const fullText = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  return {fullText, segments};
}

// 1. Extract clean Omni foley audio WAVs (smooth fade-in/out, balanced peak)
const FOLEY_JOBS = [
  {mp4: 'c00-chocolate-snap.mp4', wav: 'c00-foley.wav'},
  {mp4: 'c01-cafe-blind.mp4', wav: 'c01-foley.wav'},
  {mp4: 'c05-steak-sizzle.mp4', wav: 'c05-foley.wav'},
];
const foleyInfo = {};
for (const fj of FOLEY_JOBS) {
  const src = join(ASSETS, 'clips', fj.mp4);
  const dst = join(ASSETS, 'clips', fj.wav);
  if (!existsSync(src)) continue;
  const durRaw = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', src], {encoding: 'utf8'}).trim();
  const dur = Math.max(1, +(Number(durRaw) - 0.1).toFixed(3));
  const fadeOutSt = Math.max(0, +(dur - 0.25).toFixed(3));
  execFileSync('ffmpeg', [
    '-y', '-v', 'error', '-i', src, '-vn',
    '-af', `atrim=0:${dur},afade=t=in:st=0:d=0.15,afade=t=out:st=${fadeOutSt}:d=0.25,loudnorm=I=-20:TP=-2:LRA=11`,
    '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', dst,
  ]);
  foleyInfo[fj.wav] = {file: `assets/clips/${fj.wav}`, duration: dur};
  console.log(`FOLEY OK: ${fj.wav} (${dur}s)`);
}

// 2. Transcribe unique EN clips (audit native pronunciation + sentence word timing)
const enKeys = [...new Set(timeline.audioCues.filter((c) => c.kind === 'en').map((c) => c.key))];
const enResults = {};
console.log('=== EN WHISPER AUDIT ===');
for (const key of enKeys) {
  const cue = timeline.audioCues.find((c) => c.kind === 'en' && c.key === key);
  const res = runWhisper(join(EP_DIR, cue.file), 'en', `en-${key}`);
  enResults[key] = {expected: cue.text, duration: cue.duration, ...res};
  console.log(`  [${key}] (${cue.duration}s) heard: "${res.fullText}"`);
}

// 3. Transcribe unique KO clips (exact real speech timing for subtitles & mid-scene transitions)
const koKeys = [...new Set(timeline.audioCues.filter((c) => c.kind === 'ko').map((c) => c.key))];
const koResults = {};
console.log('=== KO WHISPER TIMING ===');
for (const key of koKeys) {
  const cue = timeline.audioCues.find((c) => c.kind === 'ko' && c.key === key);
  const res = runWhisper(join(EP_DIR, cue.file), 'ko', `ko-${key}`);
  koResults[key] = {expected: cue.text, duration: cue.duration, ...res};
  console.log(`  [${key}] (${cue.duration}s, ${res.segments.length} segs) heard: "${res.fullText.slice(0, 60)}"`);
}

// Cleanup temp 16k wavs
rmSync(SCRATCH, {recursive: true, force: true});

const outPath = join(ASSETS, 'whisper-timings.json');
writeFileSync(outPath, JSON.stringify({generatedAt: new Date().toISOString(), foley: foleyInfo, en: enResults, ko: koResults}, null, 2) + '\n', 'utf8');
console.log('SAVED:', outPath);
