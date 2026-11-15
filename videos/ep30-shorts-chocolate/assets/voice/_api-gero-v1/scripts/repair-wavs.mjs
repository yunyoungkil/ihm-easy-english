#!/usr/bin/env node
// 이미 만든 nNN.wav 중, 안쪽에 RIFF 머리글이 한 겹 더 들어 있는 파일(make-voice.mjs의 첫 버전이 만든 것)을 고친다.
// 바깥 44바이트 머리글 뒤가 "RIFF"면 안쪽 data 덩어리만 꺼내 다시 감싼다. 원본은 BACKUP_DIR로 옮겨 둔다.
//   BACKUP_DIR=<폴더> node repair-wavs.mjs
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AUDIO_FORMAT, pcmToWav } from "../../../scripts/tts-config.mjs";

const VOICE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "voice");
const BACKUP = process.env.BACKUP_DIR;
if (!BACKUP) throw new Error("BACKUP_DIR가 필요하다");
mkdirSync(BACKUP, { recursive: true });
for (const f of readdirSync(VOICE_DIR).filter((x) => /^n\d\d\.wav$/.test(x))) {
  const buf = readFileSync(join(VOICE_DIR, f));
  if (buf.toString("latin1", 44, 48) !== "RIFF") { console.log(`${f}: 고칠 것 없음`); continue; }
  const inner = buf.subarray(44);
  let off = 12, rate = null, pcm = null;
  while (off + 8 <= inner.length) {
    const id = inner.toString("latin1", off, off + 4), size = inner.readUInt32LE(off + 4);
    if (id === "fmt ") rate = inner.readUInt32LE(off + 12);
    if (id === "data") { pcm = inner.subarray(off + 8, Math.min(off + 8 + size, inner.length)); break; }
    off += 8 + size + (size % 2);
  }
  if (!pcm || !rate) throw new Error(`${f}: 안쪽 구조를 읽지 못했다`);
  copyFileSync(join(VOICE_DIR, f), join(BACKUP, f));
  writeFileSync(join(VOICE_DIR, f), pcmToWav(pcm, { ...AUDIO_FORMAT, sampleRate: rate }));
  console.log(`${f}: ${(buf.length - 44) / 2 / 24000}초 -> ${(pcm.length / 2 / rate).toFixed(3)}초 (rate ${rate})`);
}
