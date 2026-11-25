// EP37 신호음 3종(띵·뽁·종) 합성 스크립트 — 36분 이어폰 청취 시 귀 피로 없이 눈을 감고도 즉시 구분되도록 설계
// 사용: node videos/ep37-listen-frozen-questions/scripts/make-sfx.mjs
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', 'assets', 'sfx');
const SR = 48000;

function writeWavMono16(filePath, samples) {
  mkdirSync(dirname(filePath), {recursive: true});
  const n = samples.length;
  const dataBytes = n * 2;
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
  for (let i = 0; i < n; i += 1) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(filePath, buf);
}

// 부드러운 끝 페이드 아웃 적용 (클릭음 0)
function applyEndFade(samples, fadeSec = 0.04) {
  const fadeSamples = Math.min(samples.length, Math.round(SR * fadeSec));
  for (let i = 0; i < fadeSamples; i += 1) {
    const idx = samples.length - fadeSamples + i;
    const gain = Math.cos((i / fadeSamples) * (Math.PI / 2));
    samples[idx] *= gain;
  }
  return samples;
}

// 1. ding.wav ("띵", 0.58s): 영어 첫 듣기 직전 신호 — 맑고 따뜻한 첼레스타/로즈 단음 (A5 880Hz)
{
  const dur = 0.58;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  const f0 = 880.0; // A5
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const atk = Math.min(1, t / 0.004);
    const body = Math.exp(-t * 7.2) * Math.sin(2 * Math.PI * f0 * t) * 0.52;
    const h2 = Math.exp(-t * 14.0) * Math.sin(2 * Math.PI * (f0 * 2.0) * t) * 0.16;
    const h3 = Math.exp(-t * 24.0) * Math.sin(2 * Math.PI * (f0 * 3.003) * t) * 0.05;
    const mallet = Math.exp(-t * 95.0) * Math.sin(2 * Math.PI * 2400 * t) * 0.06;
    out[i] = atk * (body + h2 + h3 + mallet) * 0.72;
  }
  applyEndFade(out, 0.05);
  writeWavMono16(join(OUT_DIR, 'ding.wav'), out);
}

// 2. pop.wav ("뽁", 0.36s): 따라 말하기 차례 신호 — 따뜻하게 톡 튀어 오르는 우드 팝 (270Hz -> 560Hz)
{
  const dur = 0.36;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const atk = Math.min(1, t / 0.003);
    // 빠른 상향 피치 스윕으로 '뽁' 하는 물방울/마림바 팝 질감 구현
    const freq = 560 - 290 * Math.exp(-t * 48);
    phase += (2 * Math.PI * freq) / SR;
    const env = Math.exp(-t * 17.5);
    const core = Math.sin(phase) * 0.65;
    const wood = Math.sin(phase * 2.02) * Math.exp(-t * 34) * 0.14;
    out[i] = atk * env * (core + wood) * 0.78;
  }
  applyEndFade(out, 0.04);
  writeWavMono16(join(OUT_DIR, 'pop.wav'), out);
}

// 3. gong.wav ("종", 1.60s): 장 바뀜 신호 — 심야 라운지 톤의 깊고 맑은 싱잉볼/브론즈 종 (C4 + G4 + C5)
{
  const dur = 1.6;
  const n = Math.round(SR * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / SR;
    const atk = Math.min(1, t / 0.008);
    // 미세한 배음 떨림(shimmer)으로 자연스러운 공명감 부여
    const trem = 1 + 0.06 * Math.sin(2 * Math.PI * 3.8 * t);
    const p1 = Math.exp(-t * 1.9) * Math.sin(2 * Math.PI * 261.63 * t) * 0.42; // C4
    const p2 = Math.exp(-t * 2.5) * Math.sin(2 * Math.PI * 392.0 * t) * 0.24;  // G4
    const p3 = Math.exp(-t * 3.4) * Math.sin(2 * Math.PI * 523.25 * t) * 0.18; // C5
    const p4 = Math.exp(-t * 5.8) * Math.sin(2 * Math.PI * 783.99 * t) * 0.08; // G5
    const strike = Math.exp(-t * 45.0) * Math.sin(2 * Math.PI * 1046.5 * t) * 0.09;
    out[i] = atk * trem * (p1 + p2 + p3 + p4 + strike) * 0.75;
  }
  applyEndFade(out, 0.14);
  writeWavMono16(join(OUT_DIR, 'gong.wav'), out);
}

console.log('SFX GENERATED: ding.wav (0.58s), pop.wav (0.36s), gong.wav (1.60s)');
