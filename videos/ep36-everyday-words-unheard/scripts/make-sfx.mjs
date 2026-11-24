import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(HERE, '..', 'assets');
const SR = 48000;

function writeWavMono16(filePath, samples) {
  mkdirSync(dirname(filePath), {recursive: true});
  const numSamples = samples.length;
  const dataBytes = numSamples * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < numSamples; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(filePath, buf);
}

function makeRng(seedStart) {
  let seed = seedStart;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };
}

// 1. slash-cut.wav (0.26s): crisp editorial pencil/blade strike through dropped middle syllable
{
  const dur = 0.26;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const rand = makeRng(36011);
  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const raw = rand();
    lp1 += 0.45 * (raw - lp1);
    lp2 += 0.14 * (raw - lp2);
    const swish = (lp1 - lp2) * Math.sin(Math.PI * Math.min(1, t / 0.18)) * Math.exp(-t * 8);
    const snap = t >= 0.08 ? Math.exp(-(t - 0.08) * 70) * Math.sin(2 * Math.PI * (340 * Math.exp(-(t - 0.08) * 18) + 120) * (t - 0.08)) * 0.42 : 0;
    out[i] = (swish * 0.95 + snap) * 0.65;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'slash-cut.wav'), out);
}

// 2. hydraulic-snap.wav (0.28s): clean 4-block -> 1-block compression lock-in thump
{
  const dur = 0.28;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const rand = makeRng(36022);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const raw = rand();
    lp += 0.22 * (raw - lp);
    const sub = Math.exp(-t * 36) * Math.min(1, t / 0.002) * Math.sin(2 * Math.PI * (190 * Math.exp(-t * 20) + 58) * t) * 0.62;
    const click = Math.exp(-t * 130) * (raw - lp) * 0.35;
    const tone = t >= 0.04 ? Math.exp(-(t - 0.04) * 28) * Math.sin(2 * Math.PI * 523.25 * (t - 0.04)) * 0.16 : 0;
    out[i] = (sub + click + tone) * 0.68;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'hydraulic-snap.wav'), out);
}

// 3. quiz-countdown.wav (2.00s): 3 calm warm woodblock ticks for buffet 2s direct speaking window
{
  const dur = 2.0;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const beats = [0.05, 0.7, 1.35];
  const freqs = [440, 493.88, 587.33];
  for (let b = 0; b < beats.length; b++) {
    const startIdx = Math.round(beats[b] * SR);
    const len = Math.round(0.11 * SR);
    for (let j = 0; j < len && startIdx + j < n; j++) {
      const u = j / SR;
      const env = Math.exp(-u * 54) * Math.min(1, u / 0.0015);
      out[startIdx + j] += env * (0.48 * Math.sin(2 * Math.PI * freqs[b] * u) + 0.18 * Math.sin(2 * Math.PI * freqs[b] * 2.01 * u)) * 0.52;
    }
  }
  writeWavMono16(join(ASSETS, 'sfx', 'quiz-countdown.wav'), out);
}

// 4. reveal-chime.wav (0.55s): warm acoustic marimba two-note major resolve
{
  const dur = 0.55;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const notes = [
    {t: 0.0, f: 523.25},
    {t: 0.09, f: 659.25},
    {t: 0.18, f: 783.99},
  ];
  for (const nt of notes) {
    const startIdx = Math.round(nt.t * SR);
    for (let j = 0; startIdx + j < n; j++) {
      const u = j / SR;
      const env = Math.exp(-u * 12) * Math.min(1, u / 0.0025);
      out[startIdx + j] += env * (0.34 * Math.sin(2 * Math.PI * nt.f * u) + 0.09 * Math.sin(2 * Math.PI * nt.f * 2 * u));
    }
  }
  writeWavMono16(join(ASSETS, 'sfx', 'reveal-chime.wav'), out);
}

// 5. card-flip.wav (0.18s): soft matte paper transition whoosh
{
  const dur = 0.18;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const rand = makeRng(36055);
  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const raw = rand();
    lp1 += 0.34 * (raw - lp1);
    lp2 += 0.09 * (raw - lp2);
    const env = Math.sin((Math.PI * t) / dur);
    out[i] = (lp1 - lp2) * env * 0.52;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'card-flip.wav'), out);
}

console.log('EP36 SFX GENERATED (5 files).');
