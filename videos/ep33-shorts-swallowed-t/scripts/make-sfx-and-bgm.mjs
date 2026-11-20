import {copyFileSync, existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const ASSETS = join(EP_DIR, 'assets');
const ROOT = join(EP_DIR, '..', '..');

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

// 1. breath-lock.wav (0.240s): tactile brass lock click at 0.00s + 0.14s warm nasal harmonic bloom
{
  const dur = 0.24;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    // Soft tactile mechanical latch click (0.00s ~ 0.035s)
    if (t < 0.04) {
      const env = Math.exp(-t * 140) * Math.min(1, t / 0.002);
      s += env * (0.45 * Math.sin(2 * Math.PI * 340 * t) + 0.25 * Math.sin(2 * Math.PI * 820 * t));
    }
    // Warm golden harmonic pass-through bloom (starts at 0.13s)
    if (t >= 0.13) {
      const u = t - 0.13;
      const env = Math.exp(-u * 24) * Math.min(1, u / 0.008);
      s += env * (0.34 * Math.sin(2 * Math.PI * 587.33 * u) + 0.22 * Math.sin(2 * Math.PI * 880.0 * u) + 0.10 * Math.sin(2 * Math.PI * 1174.66 * u));
    }
    out[i] = s * 0.62;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'breath-lock.wav'), out);
}

// 2. gate-tick.wav (1.500s): 3 warm damped studio woodblock pulses at 0.00s, 0.50s, 1.00s
{
  const dur = 1.5;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const beats = [0.0, 0.5, 1.0];
  const freqs = [440, 493.88, 587.33];
  for (let b = 0; b < beats.length; b++) {
    const startIdx = Math.round(beats[b] * SR);
    const len = Math.round(0.11 * SR);
    for (let j = 0; j < len && startIdx + j < n; j++) {
      const u = j / SR;
      const env = Math.exp(-u * 48) * Math.min(1, u / 0.002);
      const val = env * (0.52 * Math.sin(2 * Math.PI * freqs[b] * u) + 0.22 * Math.sin(2 * Math.PI * freqs[b] * 2.02 * u));
      out[startIdx + j] += val * 0.48;
    }
  }
  writeWavMono16(join(ASSETS, 'sfx', 'gate-tick.wav'), out);
}

// 3. stamp-pass.wav (0.360s): warm tactile wooden stamp thud + subtle brass-chime pass confirmation
{
  const dur = 0.36;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    // Wooden stamp impact thud (0.00s ~ 0.06s)
    if (t < 0.07) {
      const env = Math.exp(-t * 68) * Math.min(1, t / 0.003);
      const freq = 140 * Math.exp(-t * 14) + 65;
      s += env * 0.55 * Math.sin(2 * Math.PI * freq * t);
    }
    // Warm D5 -> A5 passing chime (0.045s ~ 0.36s)
    if (t >= 0.045) {
      const u = t - 0.045;
      const env = Math.exp(-u * 10.5) * Math.min(1, u / 0.006);
      s += env * (0.30 * Math.sin(2 * Math.PI * 587.33 * u) + 0.24 * Math.sin(2 * Math.PI * 880.0 * u) + 0.14 * Math.sin(2 * Math.PI * 1174.66 * u));
    }
    out[i] = s * 0.68;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'stamp-pass.wav'), out);
}

// 4. BGM: crisp upbeat editorial instrumental distinct from EP32 (19.Morning Stroll)
const bgmCandidates = [
  join(ROOT, 'public', 'audio', 'BGM 35', '12.Get Outside! - Jason Farnham.mp3'),
  join(ROOT, 'public', 'audio', 'BGM 35', '28.Spring In My Step - Silent Partner.mp3'),
];
const chosenBgm = bgmCandidates.find((p) => existsSync(p));
if (!chosenBgm) throw new Error('No BGM candidate found in public/audio/BGM 35');
mkdirSync(join(ASSETS, 'bgm'), {recursive: true});
copyFileSync(chosenBgm, join(ASSETS, 'bgm', 'track.mp3'));

console.log(`SFX + BGM READY: breath-lock.wav, gate-tick.wav, stamp-pass.wav, bgm=${chosenBgm}`);
