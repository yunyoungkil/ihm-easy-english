import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, readFileSync, unlinkSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const ASSETS = join(EP_DIR, 'assets');

const timeline = JSON.parse(readFileSync(join(ASSETS, 'audio-timeline.json'), 'utf8'));
const S = Object.fromEntries(timeline.scenes.map((sc) => [sc.id, sc]));
const TOTAL_DUR = timeline.totalDuration;
const hasClip = (name) => existsSync(join(ASSETS, 'clips', name));

function mixEntries(entries, outPath, filterScriptPath) {
  const args = [
    '-y', '-v', 'error',
    '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono:d=${TOTAL_DUR}`,
  ];
  const filters = [];
  const mixLabels = ['[0:a]'];

  entries.forEach((e, idx) => {
    const inp = idx + 1;
    args.push('-i', join(EP_DIR, e.file));
    const delayMs = Math.max(0, Math.round(e.start * 1000));
    const vol = Number(e.volume ?? 1);
    const label = `[a${inp}]`;
    const trimPart = e.maxDur ? `atrim=0:${e.maxDur},asetpts=PTS-STARTPTS,` : '';
    filters.push(`[${inp}:a]aresample=24000,aformat=channel_layouts=mono,${trimPart}volume=${vol},adelay=${delayMs}:all=1${label}`);
    mixLabels.push(label);
  });

  filters.push(
    `${mixLabels.join('')}amix=inputs=${mixLabels.length}:duration=first:normalize=0:dropout_transition=0,` +
    `atrim=0:${TOTAL_DUR},alimiter=limit=0.95:attack=2:release=20[outa]`
  );

  args.push('-filter_complex', filters.join(';'), '-map', '[outa]', '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', outPath);
  execFileSync('ffmpeg', args, {stdio: 'inherit'});
}

function measureSegment(file, start, dur) {
  const r = spawnSync('ffmpeg', ['-ss', String(start), '-t', String(dur), '-i', file, '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  const txt = `${r.stdout || ''}\n${r.stderr || ''}`;
  const mean = txt.match(/mean_volume:\s*([-\d.]+)\s*dB/)?.[1] ?? 'N/A';
  const max = txt.match(/max_volume:\s*([-\d.]+)\s*dB/)?.[1] ?? 'N/A';
  return {mean, max};
}

// 1. Voice master (all KO + EN speech cues)
const voiceEntries = timeline.audioCues
  .filter((c) => c.kind === 'ko' || c.kind === 'en')
  .map((c) => ({file: c.file, start: c.start, volume: c.volume ?? 1.0}));

const voiceOut = join(ASSETS, 'mix-voice.wav');
mixEntries(voiceEntries, voiceOut, join(ASSETS, '.mix-voice.filter.txt'));

// 2. SFX + Foley master
const s5RevealStart = +(S['scene-05'].start + S['scene-05'].events.c05a.localStart).toFixed(3);
const sfxEntries = timeline.audioCues
  .filter((c) => c.kind === 'sfx')
  .map((c) => ({file: c.file, start: c.start, volume: c.volume ?? 0.42}));

if (hasClip('c00-foley.wav')) {
  sfxEntries.push({file: 'assets/clips/c00-foley.wav', start: 0.05, maxDur: 4.85, volume: 0.22});
}
if (hasClip('foley-s1-full.wav')) {
  sfxEntries.push({file: 'assets/clips/foley-s1-full.wav', start: S['scene-01'].start, maxDur: S['scene-01'].duration, volume: 0.09});
}
if (hasClip('foley-s5-full.wav')) {
  sfxEntries.push({file: 'assets/clips/foley-s5-full.wav', start: s5RevealStart, maxDur: +(S['scene-05'].end - s5RevealStart).toFixed(3), volume: 0.13});
}
if (hasClip('foley-s8-full.wav')) {
  sfxEntries.push({file: 'assets/clips/foley-s8-full.wav', start: S['scene-08'].start, maxDur: S['scene-08'].duration, volume: 0.08});
}

const sfxOut = join(ASSETS, 'mix-sfx.wav');
mixEntries(sfxEntries, sfxOut, join(ASSETS, '.mix-sfx.filter.txt'));

const probeDur = (p) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', p], {encoding: 'utf8'}).trim()).toFixed(3);
const s9c1 = S['scene-09'].events['check-s1'];
const s10c = S['scene-10'].events.c10;
const vS9 = measureSegment(voiceOut, s9c1.globalStart, s9c1.dur);
const vS10 = measureSegment(voiceOut, s10c.globalStart, s10c.dur);

console.log(`MIX-VOICE OK: ${voiceOut} (${probeDur(voiceOut)}s, ${voiceEntries.length} cues)`);
console.log(`  Scene 9 Card 1 (${s9c1.globalStart}s, ${s9c1.dur}s): mean=${vS9.mean}dB max=${vS9.max}dB`);
console.log(`  Scene 10 Closing (${s10c.globalStart}s, ${s10c.dur}s): mean=${vS10.mean}dB max=${vS10.max}dB`);
console.log(`MIX-SFX OK:   ${sfxOut} (${probeDur(sfxOut)}s, ${sfxEntries.length} cues)`);
