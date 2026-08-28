import {mkdirSync, writeFileSync} from "node:fs";
import {dirname, resolve} from "node:path";

const sampleRate = 44100;
const output = (name) => resolve("public", "audio", name);
const clamp = (value) => Math.max(-1, Math.min(1, value));
const envelope = (time, duration, attack = 0.01, release = 0.08) => Math.min(1, time / attack, (duration - time) / release);

const writeWav = (name, duration, sample) => {
  const length = Math.floor(sampleRate * duration);
  const buffer = Buffer.alloc(44 + length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + length * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(length * 2, 40);
  for (let index = 0; index < length; index++) {
    const time = index / sampleRate;
    buffer.writeInt16LE(Math.round(clamp(sample(time)) * 32767), 44 + index * 2);
  }
  const path = output(name);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, buffer);
};

let seed = 17;
const noise = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647) * 2 - 1;
};

writeWav("core-pass-sweep.wav", 0.42, (t) => {
  const e = envelope(t, 0.42, 0.025, 0.2);
  const frequency = 420 + t * 900;
  return (Math.sin(Math.PI * 2 * frequency * t) * 0.35 + noise() * 0.17) * e * 0.2;
});

writeWav("core-pass-pop.wav", 0.16, (t) => {
  const e = envelope(t, 0.16, 0.004, 0.12);
  const body = Math.sin(Math.PI * 2 * (175 + t * 110) * t) * 0.42;
  const sparkle = Math.sin(Math.PI * 2 * 940 * t) * 0.11;
  return (body + sparkle) * e * 0.32;
});

writeWav("core-pass-tick.wav", 0.075, (t) => {
  const e = envelope(t, 0.075, 0.002, 0.055);
  return (Math.sin(Math.PI * 2 * 1320 * t) * 0.18 + Math.sin(Math.PI * 2 * 1980 * t) * 0.08) * e;
});

writeWav("core-pass-squeeze.wav", 0.38, (t) => {
  const e = envelope(t, 0.38, 0.015, 0.17);
  const frequency = 260 + t * 960;
  const air = noise() * 0.045 * Math.sin(Math.PI * t / 0.38);
  return (Math.sin(Math.PI * 2 * frequency * t) * 0.19 + Math.sin(Math.PI * 2 * 120 * t) * 0.1 + air) * e;
});

writeWav("core-pass-ding.wav", 0.58, (t) => {
  const e = Math.exp(-t * 5.8);
  return (Math.sin(Math.PI * 2 * 660 * t) * 0.26 + Math.sin(Math.PI * 2 * 990 * t) * 0.16 + Math.sin(Math.PI * 2 * 1320 * t) * 0.07) * e * 0.3;
});

writeWav("core-pass-outro.wav", 3.2, (t) => {
  const e = Math.min(1, t / 0.35, (3.2 - t) / 0.8);
  const shimmer = Math.sin(Math.PI * 2 * 523.25 * t) * 0.13 + Math.sin(Math.PI * 2 * 659.25 * t) * 0.07;
  return shimmer * e * 0.28;
});
