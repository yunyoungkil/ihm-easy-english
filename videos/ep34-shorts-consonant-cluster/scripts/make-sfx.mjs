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

// 1. hydraulic-snap.wav (0.260s): crisp pneumatic zip + solid cobalt-block snap lock
{
  const dur = 0.26;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed / 2147483647) * 2 - 1;
  };
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    // Brief pneumatic air zip (0.00 ~ 0.09s)
    if (t < 0.095) {
      const env = Math.sin((Math.PI * t) / 0.095) * 0.22;
      s += env * rand();
    }
    // Solid mechanical hydraulic snap impact (starts at 0.08s)
    if (t >= 0.08) {
      const u = t - 0.08;
      const thudEnv = Math.exp(-u * 65) * Math.min(1, u / 0.002);
      const freq = 195 * Math.exp(-u * 18) + 78;
      s += thudEnv * 0.58 * Math.sin(2 * Math.PI * freq * u);
      // Bright Swiss chime confirmation (E5 + B5)
      const pingEnv = Math.exp(-u * 22) * Math.min(1, u / 0.004);
      s += pingEnv * (0.26 * Math.sin(2 * Math.PI * 659.25 * u) + 0.16 * Math.sin(2 * Math.PI * 987.77 * u));
    }
    out[i] = s * 0.68;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'hydraulic-snap.wav'), out);
}

// 2. metronome-tick.wav (1.500s): 3 crisp Swiss studio woodblock pulses at 0.00s, 0.50s, 1.00s
{
  const dur = 1.5;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const beats = [0.0, 0.5, 1.0];
  const freqs = [523.25, 587.33, 659.25];
  for (let b = 0; b < beats.length; b++) {
    const startIdx = Math.round(beats[b] * SR);
    const len = Math.round(0.11 * SR);
    for (let j = 0; j < len && startIdx + j < n; j++) {
      const u = j / SR;
      const env = Math.exp(-u * 52) * Math.min(1, u / 0.0018);
      const val = env * (0.52 * Math.sin(2 * Math.PI * freqs[b] * u) + 0.24 * Math.sin(2 * Math.PI * freqs[b] * 2.01 * u));
      out[startIdx + j] += val * 0.52;
    }
  }
  writeWavMono16(join(ASSETS, 'sfx', 'metronome-tick.wav'), out);
}

// 3. strike-smash.wav (0.380s): punchy one-beat strike stamp + bright major triad ring
{
  const dur = 0.38;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let s = 0;
    if (t < 0.08) {
      const env = Math.exp(-t * 58) * Math.min(1, t / 0.002);
      const freq = 165 * Math.exp(-t * 16) + 60;
      s += env * 0.62 * Math.sin(2 * Math.PI * freq * t);
    }
    if (t >= 0.04) {
      const u = t - 0.04;
      const env = Math.exp(-u * 10) * Math.min(1, u / 0.005);
      s += env * (
        0.28 * Math.sin(2 * Math.PI * 523.25 * u) +
        0.22 * Math.sin(2 * Math.PI * 659.25 * u) +
        0.18 * Math.sin(2 * Math.PI * 783.99 * u)
      );
    }
    out[i] = s * 0.7;
  }
  writeWavMono16(join(ASSETS, 'sfx', 'strike-smash.wav'), out);
}

console.log('SFX READY: hydraulic-snap.wav, metronome-tick.wav, strike-smash.wav');
