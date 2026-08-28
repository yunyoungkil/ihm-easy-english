// One-off narration generator for ep10-shorts-b-faceless.
// Reuses the channel's shared Gemini/Charon module and narration lint —
// same voice, same pricing/free-tier ledger as every other episode.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadApiKey,
  synthesize,
  pcmToWav,
  sampleRateFromMime,
  AUDIO_FORMAT,
  estimateCost,
  readLedger,
  appendLedger,
  won,
  PRICING,
} from "../../../scripts/tts-config.mjs";
import { lintNarration, formatProblems } from "../../../scripts/narration-lint.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");
const outDir = path.join(projectDir, "assets", "audio");
fs.mkdirSync(outDir, { recursive: true });

const LINES = [
  { id: "frame02", narration: "SOCIAL, 발음이 헷갈리시나요?" },
  { id: "frame03", narration: "근데 우리 이미 맨날 '소셜'이라고 하잖아요." },
  { id: "frame04", narration: "왜 소셜일까요? 이 부분이 항상 '셜' 소리가 나거든요." },
  { id: "frame05", narration: "이렇게 끝나는 단어는 다 '셜'로 읽어요." },
];

// Lint gate — mirrors generate-tts.mjs's pre-flight check.
let blocked = false;
for (const line of LINES) {
  const problems = lintNarration(line.narration).filter((p) => {
    // SOCIAL is a real, complete English word (not a bare suffix fragment) —
    // allowed through deliberately; verify by listening after generation.
    if (p.token === "SOCIAL") return false;
    return true;
  });
  if (problems.length > 0) {
    blocked = true;
    console.log(`[BLOCKED] ${line.id}: "${line.narration}"`);
    console.log(formatProblems(line.id, problems));
  }
}
if (blocked) {
  console.log("\n나레이션에 문제가 있어 생성을 중단합니다.");
  process.exit(1);
}

const { key: apiKey } = loadApiKey();
const ledger = readLedger();
const today = new Date().toISOString().slice(0, 10);
const alreadyToday = ledger.entries.filter((e) => e.at.slice(0, 10) === today).length;

console.log(`오늘 사용량: ${alreadyToday}/${PRICING.freeRequestsPerDay} (무료 한도)`);
console.log(`이번 실행: ${LINES.length}개 — 전부 무료 한도 안` + "\n");

for (let i = 0; i < LINES.length; i++) {
  const line = LINES[i];
  const { pcm, mimeType, usage } = await synthesize(line.narration, apiKey, {});
  const rate = sampleRateFromMime(mimeType);
  if (rate !== AUDIO_FORMAT.sampleRate) {
    throw new Error(
      `${line.id}: expected ${AUDIO_FORMAT.sampleRate}Hz, got ${rate}Hz (mime=${mimeType})`,
    );
  }
  const wav = pcmToWav(pcm, AUDIO_FORMAT);
  const outPath = path.join(outDir, `${line.id}.wav`);
  fs.writeFileSync(outPath, wav);

  const audioSeconds = pcm.length / (AUDIO_FORMAT.sampleRate * (AUDIO_FORMAT.bitsPerSample / 8));
  const outputTokens = usage?.candidatesTokenCount ?? Math.ceil(audioSeconds * PRICING.audioTokensPerSecond);
  const inputTokens = usage?.promptTokenCount ?? line.narration.length;
  const billed = alreadyToday + i >= PRICING.freeRequestsPerDay;
  const usd = billed
    ? (inputTokens / 1e6) * PRICING.usdPerMillionInputTokens +
      (outputTokens / 1e6) * PRICING.usdPerMillionOutputTokens
    : 0;

  appendLedger({
    project: "ep10-shorts-b-faceless",
    id: line.id,
    model: "gemini-3.1-flash-tts-preview",
    audioSeconds: Number(audioSeconds.toFixed(2)),
    inputTokens,
    outputTokens,
    billed,
    usd,
  });

  console.log(
    `[OK] ${line.id} → ${path.relative(projectDir, outPath)} (${audioSeconds.toFixed(2)}s, ${billed ? won(usd * PRICING.krwPerUsd) : "무료"})`,
  );
}

console.log("\n완료.");
