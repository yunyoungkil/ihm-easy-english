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

// 1. paper-rip.wav (0.280s): crisp masking-tape / textured newsprint rip + crisp editorial snap
{
  const dur = 0.28;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const rand = makeRng(20261123);
  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const raw = rand();
    // Bandpass-ish crisp paper fibers (high-mid grain)
    lp1 += 0.42 * (raw - lp1);
    lp2 += 0.11 * (raw - lp2);
    const fiberNoise = lp1 - lp2;
    // Slight serrated tear micro-pulses (~68 Hz flutter)
    const flutter = 0.65 + 0.35 * Math.sin(2 * Math.PI * 68 * t);
    let s = 0;
    if (t < 0.20) {
      const env = Math.sin((Math.PI * t) / 0.20) * Math.pow(1 - t / 0.20, 0.35);
      s += fiberNoise * flutter * env * 1.15;
    }
    // Crisp final paper snap & subtle warm resolve tick at 0.145s
    if (t >= 0.145) {
      const u = t - 0.145;
      const snapEnv = Math.exp(-u * 82) * Math.min(1, u / 0.0015);
      const popFreq = 260 * Math.exp(-u * 25) + 95;
      s += snapEnv * 0.48 * Math.sin(2 * Math.PI * popFreq * u);
      const pingEnv = Math.exp(-u * 26) * Math.min(1, u / 0.003);
      s += pingEnv * (0.20 * Math.sin(2 * Math.PI * 587.33 * u) + 0.12 * Math.sin(2 * Math.PI * 880 * u));
    }
    out[i] = s * 0.72;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'paper-rip.wav'), out);
}

// 2. ink-stamp.wav (0.240s): vintage risograph/letterpress wooden stamp thump + crisp ink press
{
  const dur = 0.24;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const rand = makeRng(90421);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const raw = rand();
    lp += 0.28 * (raw - lp);
    let s = 0;
    const bodyEnv = Math.exp(-t * 48) * Math.min(1, t / 0.002);
    const freq = 180 * Math.exp(-t * 22) + 64;
    s += bodyEnv * 0.64 * Math.sin(2 * Math.PI * freq * t);
    // Dry wood/paper contact click
    const clickEnv = Math.exp(-t * 140);
    s += clickEnv * 0.45 * (raw - lp);
    out[i] = s * 0.72;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'ink-stamp.wav'), out);
}

// 3. paper-fuse-tick.wav (1.200s): 3 crisp tactile pencil-tap / perforation ticks for 1.2s challenge window
{
  const dur = 1.2;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const beats = [0.0, 0.4, 0.8];
  const freqs = [493.88, 554.37, 659.25];
  for (let b = 0; b < beats.length; b++) {
    const startIdx = Math.round(beats[b] * SR);
    const len = Math.round(0.095 * SR);
    for (let j = 0; j < len && startIdx + j < n; j++) {
      const u = j / SR;
      const env = Math.exp(-u * 62) * Math.min(1, u / 0.0014);
      const val = env * (0.52 * Math.sin(2 * Math.PI * freqs[b] * u) + 0.22 * Math.sin(2 * Math.PI * freqs[b] * 2.02 * u));
      out[startIdx + j] += val * 0.54;
    }
  }
  writeWavMono16(join(ASSETS, 'sfx', 'paper-fuse-tick.wav'), out);
}

// 4. final-peel-chime.wav (0.360s): decisive paper tear + warm acoustic triad confirmation for 'doubt'
{
  const dur = 0.36;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const rand = makeRng(77123);
  let lp1 = 0;
  let lp2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const raw = rand();
    lp1 += 0.45 * (raw - lp1);
    lp2 += 0.12 * (raw - lp2);
    let s = 0;
    if (t < 0.11) {
      const ripEnv = Math.sin((Math.PI * t) / 0.11);
      s += (lp1 - lp2) * ripEnv * 0.85;
    }
    if (t >= 0.07) {
      const u = t - 0.07;
      const env = Math.exp(-u * 10.5) * Math.min(1, u / 0.004);
      s += env * (
        0.28 * Math.sin(2 * Math.PI * 523.25 * u) +
        0.22 * Math.sin(2 * Math.PI * 659.25 * u) +
        0.18 * Math.sin(2 * Math.PI * 783.99 * u)
      );
    }
    out[i] = s * 0.72;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'final-peel-chime.wav'), out);
}

console.log('SFX READY: paper-rip.wav, ink-stamp.wav, paper-fuse-tick.wav, final-peel-chime.wav');
