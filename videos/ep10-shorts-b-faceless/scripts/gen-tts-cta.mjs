import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadApiKey, synthesize, pcmToWav, sampleRateFromMime, AUDIO_FORMAT,
  readLedger, appendLedger, won, PRICING,
} from "../../../scripts/tts-config.mjs";
import { lintNarration, formatProblems } from "../../../scripts/narration-lint.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.resolve(__dirname, "..");
const outDir = path.join(projectDir, "assets", "audio");

const narration = "전체 원리는 관련 영상에서 지금 바로 확인해보세요!";
const problems = lintNarration(narration);
if (problems.length > 0) {
  console.log(formatProblems("frame06", problems));
  process.exit(1);
}

const { key: apiKey } = loadApiKey();
const ledger = readLedger();
const today = new Date().toISOString().slice(0, 10);
const alreadyToday = ledger.entries.filter((e) => e.at.slice(0, 10) === today).length;
console.log(`오늘 사용량: ${alreadyToday}/${PRICING.freeRequestsPerDay} (무료 한도)`);

const { pcm, mimeType, usage } = await synthesize(narration, apiKey, {});
const rate = sampleRateFromMime(mimeType);
if (rate !== AUDIO_FORMAT.sampleRate) {
  throw new Error(`expected ${AUDIO_FORMAT.sampleRate}Hz, got ${rate}Hz`);
}
const wav = pcmToWav(pcm, AUDIO_FORMAT);
const outPath = path.join(outDir, "frame06.wav");
fs.writeFileSync(outPath, wav);

const audioSeconds = pcm.length / (AUDIO_FORMAT.sampleRate * (AUDIO_FORMAT.bitsPerSample / 8));
const billed = alreadyToday >= PRICING.freeRequestsPerDay;
const outputTokens = usage?.candidatesTokenCount ?? Math.ceil(audioSeconds * PRICING.audioTokensPerSecond);
const inputTokens = usage?.promptTokenCount ?? narration.length;
const usd = billed
  ? (inputTokens / 1e6) * PRICING.usdPerMillionInputTokens + (outputTokens / 1e6) * PRICING.usdPerMillionOutputTokens
  : 0;

appendLedger({ project: "ep10-shorts-b-faceless", id: "frame06", model: "gemini-3.1-flash-tts-preview", audioSeconds: Number(audioSeconds.toFixed(2)), inputTokens, outputTokens, billed, usd });
console.log(`[OK] frame06 -> ${path.relative(projectDir, outPath)} (${audioSeconds.toFixed(2)}s, ${billed ? won(usd * PRICING.krwPerUsd) : "무료"})`);
