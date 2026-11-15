#!/usr/bin/env node
// EP30 쇼츠 나레이션 14줄 -> AI Studio 음성 화면(자동화 크롬)으로 한 줄씩. 2026-11-16.
// API 방식(make-voice.mjs)은 무료 키 모델당 하루 10회 한도(429)로 막혀 사용자가 처음 정한 브라우저 방식으로 되돌렸다.
// 문장은 승인된 시트(SbQVBQoRciA) 컷 계획에서 그대로 읽고, 허용 변경은 make-voice.mjs의 INSERTS(태그 삽입)뿐이다.
//   node make-voice-browser.mjs --dry-run
//   node make-voice-browser.mjs --only=n12 --out=<폴더> [--no-tags]     (시험)
//   node make-voice-browser.mjs                                        없는 줄만 -> assets/voice/_ai-studio-raw/nNN.wav
// 화면에 한도·오류 안내가 뜨면 그 문구를 그대로 출력하고 즉시 멈춘다. 결제·업그레이드 버튼은 누르지 않는다.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateAiStudioSpeech } from "../../../scripts/generate-aistudio-speech.mjs";
import { INSERTS, applyInserts } from "./make-voice.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const args = process.argv.slice(2);
const opt = (name, dflt) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? dflt;
const only = opt("only", null)?.split(",") ?? null;
const OUT_DIR = resolve(opt("out", join(HERE, "..", "assets", "voice", "_ai-studio-raw")));
const PAUSE_MS = Number(opt("pause", 18000));
const noTags = args.includes("--no-tags");
const STYLE = opt("style", "calm, warm and trustworthy Korean language coach, natural conversational pacing, clear articulation, not exaggerated");

const sheet = JSON.parse(readFileSync(join(ROOT, "data/youtube/transform-sheets/SbQVBQoRciA.json"), "utf8"));
if (sheet.status !== "approved") throw new Error(`시트 상태가 approved가 아니다: ${sheet.status}`);
const cuts = sheet.rows.find((r) => r.key === "visual").ours.cutPlan.cuts;
const lines = cuts.map((c, i) => {
  const id = `n${String(i + 1).padStart(2, "0")}`;
  return { id, text: c.narration, input: noTags ? c.narration : applyInserts(c.narration, INSERTS[id]) };
});
console.log(`줄 ${lines.length}개, 태그 ${noTags ? "없음" : Object.values(INSERTS).flat().length + "곳"}`);
if (args.includes("--dry-run")) { for (const l of lines) console.log(`${l.id} ${l.input}`); process.exit(0); }

mkdirSync(OUT_DIR, { recursive: true });
let made = 0;
for (const l of lines) {
  if (only && !only.includes(l.id)) continue;
  const out = join(OUT_DIR, `${l.id}.wav`);
  if (existsSync(out)) { console.log(`${l.id}: 이미 있음, 건너뜀`); continue; }
  const t0 = Date.now();
  try {
    const r = await generateAiStudioSpeech({ text: l.input, style: STYLE, voice: "Gero", output: out });
    made++;
    console.log(`${l.id}: 저장 ${r.bytes}바이트 (${((Date.now() - t0) / 1000).toFixed(0)}초 걸림) 화면 한도·오류 안내: 없음`);
  } catch (e) {
    console.log(`${l.id}: 실패 — ${e.message}`);
    console.log(`생성 ${made}줄에서 멈춘다`);
    process.exit(2);
  }
  await new Promise((r) => setTimeout(r, PAUSE_MS));
}
console.log(`끝. 이번에 만든 줄 ${made}개`);
