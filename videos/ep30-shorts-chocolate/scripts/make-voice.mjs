#!/usr/bin/env node
// EP30 쇼츠 나레이션 14줄 -> assets/voice/nNN.wav (Gemini TTS, 무료 키 GEMINI_API_KEY, 채널 목소리 Gero 고정). v2, 2026-11-16.
// v1(2026-11-15, generateContent + 앞에 영어 지시문 붙이기)은 지시문을 소리 내어 읽어 assets/voice/_api-gero-v1/에 보관했다.
// v2는 공식 문서(aistudio.google.com/docs/speech-generation)의 Interactions API를 쓴다:
//   POST /v1beta/interactions, 톤 지시는 text의 annotations[{type:"speech_metadata", style}]에 따로 보낸다(대본에 섞지 않는다).
// 문장은 승인된 비교 시트(SbQVBQoRciA)의 컷 계획에서 그대로 읽는다. 허용 변경은 영어 소문자 태그 삽입뿐(INSERTS, 아래).
//
//   node make-voice.mjs --dry-run                 호출 없이 줄·검사만
//   node make-voice.mjs --only=n02 --out=<폴더>   그 줄만, 지정 폴더에 저장(시험용)
//   node make-voice.mjs                           없는 파일만 만든다 -> assets/voice/_ai-studio-raw/nNN.wav (잘라내기 전 원본)
//   --style="..." --temperature=1 --pause=15000
// 유료 키(OLD_PAID_GEMINI_API_KEY)는 읽지도 않는다. 429는 60초, 120초 쉬고 다시 해 본 뒤 멈춘다. 429 응답 본문(error.message·details)은 그대로 출력한다.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const args = process.argv.slice(2);
const opt = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const dryRun = args.includes("--dry-run");
const only = opt("only", null)?.split(",") ?? null;
const OUT_DIR = resolve(opt("out", join(HERE, "..", "assets", "voice", "_ai-studio-raw")));
const PAUSE_MS = Number(opt("pause", 15000));
const TEMPERATURE = opt("temperature", null);
const STYLE = opt("style", "calm, warm and trustworthy Korean language coach, natural conversational pacing, clear articulation, not exaggerated");
const VOICE = "Gero"; // scripts/tts-config.mjs VOICES.male (2026-11-09 사용자 결정)
const MODEL = "gemini-3.8-flash-tts";

/** 문서와 화면(Expression 목록)에 있는 태그만. 한글·대문자·목록 밖은 거부. */
const ALLOWED = new Set(["argh", "breath", "cackle", "cheer", "chuckle", "chuckles", "cough", "cry", "exhales", "gasp", "giggle", "groan", "growl", "grr", "grunt", "heavy breath", "hiss", "laugh", "laughter", "long pause", "moan", "pant", "pff", "phew", "scream", "short pause", "shout", "shriek", "sigh", "sighs", "sneeze", "snicker", "snort", "sob", "throat-clearing", "tsk", "whimper", "whispering", "whispers", "yawn"]);

/** 태그 삽입 표: 줄 번호 -> [{after: 원문에서 그 글자 바로 뒤, tag}]. 시험 결과를 보고 필요한 곳만 채운다. */
export const INSERTS = {
  // 질문을 던지고 답을 기다리는 두 곳만(2026-11-16). 나머지는 컷 사이 간격이 쉼을 만든다.
  n12: [{ after: "뜻이에요.", tag: "short pause" }],
  n13: [{ after: "벌너러블?", tag: "short pause" }],
};

export function applyInserts(text, inserts = []) {
  let out = text;
  for (const { after, tag } of inserts) {
    if (!ALLOWED.has(tag)) throw new Error(`허용 목록에 없는 태그: <${tag}>`);
    const i = out.indexOf(after);
    if (i < 0) throw new Error(`삽입 위치를 못 찾음: ${after}`);
    const at = i + after.length;
    out = `${out.slice(0, at)} <${tag}>${out.slice(at)}`.replace(/> +/g, "> ").replace(/ {2,}/g, " ");
  }
  const stripped = out.replace(/ ?<[^<>]*> ?/g, " ").replace(/\s+/g, " ").trim();
  if (stripped !== text.replace(/\s+/g, " ").trim()) throw new Error("태그 말고 다른 글자가 바뀌었다");
  return out;
}

export function unwrapRiff(buf) {
  if (buf.toString("latin1", 0, 4) !== "RIFF") throw new Error("RIFF 머리글이 아니다");
  let off = 12, rate = null, pcm = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString("latin1", off, off + 4), size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") rate = buf.readUInt32LE(off + 12);
    if (id === "data") { pcm = buf.subarray(off + 8, Math.min(off + 8 + size, buf.length)); break; }
    off += 8 + size + (size % 2);
  }
  if (!pcm || !rate) throw new Error("fmt/data 덩어리를 못 찾았다");
  return { pcm, rate };
}

export function wavOf(pcm, rate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

class QuotaError extends Error {}

async function synthesize(text, apiKey) {
  const body = {
    model: MODEL,
    input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: STYLE }] }] }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice: VOICE }], ...(TEMPERATURE ? { temperature: Number(TEMPERATURE) } : {}) },
  };
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const raw = await response.text();
  if (response.status === 429) throw new QuotaError(raw);
  if (!response.ok) throw new Error(`HTTP ${response.status}\n${raw.slice(0, 800)}`);
  const json = JSON.parse(raw);
  const audio = (json.steps ?? []).filter((s) => s.type === "model_output").flatMap((s) => s.content ?? []).filter((c) => c.type === "audio").pop();
  if (!audio?.data) throw new Error(`응답에 오디오가 없다: ${raw.slice(0, 400)}`);
  return { buf: Buffer.from(audio.data, "base64"), usage: json.usage ?? null };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const sheet = JSON.parse(readFileSync(join(ROOT, "data/youtube/transform-sheets/SbQVBQoRciA.json"), "utf8"));
  if (sheet.status !== "approved") throw new Error(`시트 상태가 approved가 아니다: ${sheet.status}`);
  const cuts = sheet.rows.find((r) => r.key === "visual").ours.cutPlan.cuts;
  const lines = cuts.map((c, i) => ({ id: `n${String(i + 1).padStart(2, "0")}`, t: c.t, text: c.narration, input: applyInserts(c.narration, INSERTS[`n${String(i + 1).padStart(2, "0")}`]) }));
  console.log(`줄 ${lines.length}개, 목소리 ${VOICE}/${MODEL}, 태그 삽입 ${Object.values(INSERTS).flat().length}곳, style=${JSON.stringify(STYLE)}`);
  if (dryRun) { for (const l of lines) console.log(`${l.id} ${l.input}`); process.exit(0); }

  process.loadEnvFile(join(ROOT, ".env"));
  const apiKey = (process.env.GEMINI_API_KEY ?? "").trim(); // 이 이름만 읽는다. 키는 출력하지 않는다.
  if (!apiKey) throw new Error(".env에 GEMINI_API_KEY가 없다");
  mkdirSync(OUT_DIR, { recursive: true });
  let calls = 0;
  for (const l of lines) {
    if (only && !only.includes(l.id)) continue;
    const out = join(OUT_DIR, `${l.id}.wav`);
    if (existsSync(out)) { console.log(`${l.id}: 이미 있음, 건너뜀`); continue; }
    let result = null;
    const waits = [60000, 120000];
    for (let attempt = 0; !result; attempt++) {
      try {
        calls++;
        result = await synthesize(l.input, apiKey);
      } catch (e) {
        if (e instanceof QuotaError) {
          console.log(`${l.id}: 429 (호출 누적 ${calls}번, ${new Date().toISOString()}) 응답 본문:\n${e.message}`);
          if (attempt >= waits.length) { console.log("429가 계속되어 멈춘다"); process.exit(2); }
          console.log(`${waits[attempt] / 1000}초 쉰다`);
          await new Promise((r) => setTimeout(r, waits[attempt]));
          continue;
        }
        console.log(`${l.id}: 오류 ${String(e.message).split("\n")[0]}`);
        if (attempt >= 1) process.exit(3);
        await new Promise((r) => setTimeout(r, 8000));
      }
    }
    writeFileSync(out, result.buf); // 원본 그대로(잘라내기·재포장은 다음 단계)
    const un = unwrapRiff(result.buf);
    console.log(`${l.id}: 원본 ${result.buf.length}바이트, 소리 구간 ${(un.pcm.length / 2 / un.rate).toFixed(2)}초 (rate ${un.rate}) 호출 누적 ${calls}`);
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  console.log(`끝. API 호출 ${calls}번`);
}
