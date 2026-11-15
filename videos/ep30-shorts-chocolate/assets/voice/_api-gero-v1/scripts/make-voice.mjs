#!/usr/bin/env node
// EP30 쇼츠 나레이션 14줄 -> assets/voice/nNN.wav (Gemini TTS, 채널 목소리 고정).
// 문장은 승인된 비교 시트(SbQVBQoRciA)의 컷 계획에서 그대로 읽는다. 여기서 문장을 고치지 않는다.
//
//   node make-voice.mjs --dry-run          호출 없이 줄·글자 수·검사만
//   node make-voice.mjs                    없는 파일만 만든다(있으면 건너뜀)
//   node make-voice.mjs --only=n03,n04     그 줄만
// 429 또는 한도 오류가 나면 바로 멈춘다(재시도하지 않는다). 그 밖의 오류는 한 번만 다시 시도한다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUDIO_FORMAT, VOICE, loadApiKey, pcmToWav, sampleRateFromMime,
} from "../../../scripts/tts-config.mjs";
import { lintNarration } from "../../../scripts/narration-lint.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const VOICE_DIR = join(HERE, "..", "assets", "voice");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.find((a) => a.startsWith("--only="))?.split("=")[1].split(",") ?? null;
const PAUSE_MS = Number(args.find((a) => a.startsWith("--pause="))?.split("=")[1] ?? 4000);

// config의 synthesize()는 앞에 영어 스타일 지시문을 붙이는데, 이 모델(gemini-3.8-flash-tts)은 그 지시문을 소리 내어 읽는다
// (2026-11-15 n01 시험: 약 9.3초 중 앞 5초가 영어 지시문을 읽은 소리). 그래서 목소리(이름·모델·언어)는 config 값 그대로 쓰고
// 요청 글만 나레이션 한 줄로 보낸다. 지시문 없이 보낸다.
// 2026-11-15 확인: 이 모델은 순수 PCM이 아니라 RIFF 머리글이 붙은 WAV와 끝의 출처 표시(IPTC 메타데이터) 덩어리를 돌려준다.
// config의 pcmToWav가 이걸 통째로 PCM으로 감싸면 파일 맨 앞에 44바이트 잡음(찰칵)과 맨 끝에 약 0.16초 잡음이 붙는다.
// 그래서 RIFF로 시작하면 fmt·data 덩어리를 읽어 data 구간만 꺼낸다.
export function unwrapRiff(buf) {
  if (buf.toString('latin1', 0, 4) !== 'RIFF') return { pcm: buf, rate: null };
  let off = 12, rate = null, pcm = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('latin1', off, off + 4), size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') rate = buf.readUInt32LE(off + 12);
    if (id === 'data') { pcm = buf.subarray(off + 8, Math.min(off + 8 + size, buf.length)); break; }
    off += 8 + size + (size % 2);
  }
  if (!pcm) throw new Error('RIFF인데 data 덩어리가 없다');
  return { pcm, rate };
}

async function synthesizePlain(text, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${VOICE.model}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: { languageCode: VOICE.languageCode, voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE.name } } },
      },
    }),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}\n${body}`);
  const json = JSON.parse(body);
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) throw new Error(`No audio in response: ${JSON.stringify(json).slice(0, 300)}`);
  return { pcm: Buffer.from(part.inlineData.data, 'base64'), mimeType: part.inlineData.mimeType, usage: json.usageMetadata ?? null };
}

const sheet = JSON.parse(readFileSync(join(ROOT, "data/youtube/transform-sheets/SbQVBQoRciA.json"), "utf8"));
if (sheet.status !== "approved") throw new Error(`시트 상태가 approved가 아니다: ${sheet.status}`);
const cuts = sheet.rows.find((r) => r.key === "visual").ours.cutPlan.cuts;
const lines = cuts.map((c, i) => ({ id: `n${String(i + 1).padStart(2, "0")}`, t: c.t, text: c.narration }));

let problems = 0;
for (const l of lines) {
  const p = lintNarration(l.text);
  if (p.length) { problems++; console.log(`린트 걸림 ${l.id}: ${JSON.stringify(p)}`); }
}
console.log(`줄 ${lines.length}개, 글자 합계 ${lines.reduce((s, l) => s + [...l.text].length, 0)}, 린트 문제 ${problems}개, 목소리 ${VOICE.name}/${VOICE.model}`);
if (dryRun) process.exit(problems ? 1 : 0);
if (problems) process.exit(1);

mkdirSync(VOICE_DIR, { recursive: true });
const { key } = loadApiKey(); // 키는 출력하지 않는다
let calls = 0;
for (const l of lines) {
  if (only && !only.includes(l.id)) continue;
  const out = join(VOICE_DIR, `${l.id}.wav`);
  if (existsSync(out)) { console.log(`${l.id}: 이미 있음, 건너뜀`); continue; }
  let result = null;
  for (let attempt = 1; attempt <= 2 && !result; attempt++) {
    try {
      calls++;
      result = await synthesizePlain(l.text, key);
    } catch (e) {
      const msg = String(e.message);
      if (/HTTP 429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
        console.log(`${l.id}: 한도 오류로 멈춤 (호출 ${calls}번 중). ${msg.replace(/\s+/g, " ").slice(0, 700)}`);
        process.exit(2);
      }
      console.log(`${l.id}: 오류 ${msg.split("\n")[0]} (시도 ${attempt})`);
      if (attempt === 2) process.exit(3);
      await new Promise((r) => setTimeout(r, 8000));
    }
  }
  const un = unwrapRiff(result.pcm);
  const rate = un.rate ?? sampleRateFromMime(result.mimeType);
  writeFileSync(out, pcmToWav(un.pcm, { ...AUDIO_FORMAT, sampleRate: rate }));
  const secs = un.pcm.length / 2 / rate;
  console.log(`${l.id}: ${secs.toFixed(2)}초 (rate ${rate}, tokens ${result.usage?.candidatesTokenCount ?? "?"}) 호출 누적 ${calls}`);
  await new Promise((r) => setTimeout(r, PAUSE_MS));
}
console.log(`끝. API 호출 ${calls}번`);
