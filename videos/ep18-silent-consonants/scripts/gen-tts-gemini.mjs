#!/usr/bin/env node
// Generate all 15 EP18 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) — same approach as EP16/EP17
// (videos/ep17-bossy-r/scripts/gen-tts-gemini.mjs).
//
// Frames 10 and 11 (3-second quiz rounds) are NOT single calls: STORYBOARD.md
// calls for a real silent gap between each quiz word and its spoken answer
// (so the on-screen 3-second countdown gauge has actual dead air to run
// against, matching the "3초 안에 소리 내보세요" instruction). Each round is
// split into word/answer sub-pieces and concatenated at the raw-PCM level
// with silence inserted between them — same procedure as EP16/EP17.
//
// ⚠️ Free tier is 10 requests/day/model — past that, calls are billed with no
// local hard stop (synthesize() has no spend gate). This project has 27 total
// pieces (13 single-scene calls + 7 Frame-10 sub-pieces + 7 Frame-11
// sub-pieces). Check .tts-usage.json for today's date/call count before
// running more than the free allowance, and get the user's go-ahead on the
// estimated spend first (CLAUDE.md cost-gate rule) — this script does not
// enforce that itself.
//
// Usage: node scripts/gen-tts-gemini.mjs --only=01,02,03 [--dry-run]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  VOICE,
  AUDIO_FORMAT,
  loadApiKey,
  synthesize,
  pcmToWav,
  sampleRateFromMime,
  appendLedger,
  won,
  PRICING,
} from "../../../scripts/tts-config.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = join(HERE, "..");
const VOICE_DIR = join(PROJECT_DIR, "assets", "voice");
mkdirSync(VOICE_DIR, { recursive: true });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const onlyArg = args.find((a) => a.startsWith("--only="));
const only = onlyArg ? onlyArg.split("=")[1].split(",") : null;

// 15 frames (SCRIPT.md, 2026-09-18 finalized after web-search fact-check pass —
// internal-EPnumber leak removed, KN/MB/WR + particle TTS-safety fix applied
// (both 은/는 and 와/이 cases), "전부→대부분" historical-claim correction for
// the thumb/crumb/numb exception). Frames 10 and 11 are represented as 7
// sub-pieces each, to be concatenated after generation (see FRAME10_PIECES /
// FRAME11_PIECES below).
const LINES = [
  { id: "01", text: `k, n, e, e. 알파벳을 배운 대로라면 분명 '크니'여야 합니다. climb도 '클라임브', write도 '우라이트'여야 하죠. 그런데 왜 원어민들은 멀쩡하게 쓰여 있는 첫 글자와 끝 글자를 감쪽같이 지워버렸을까요? 이유는 아주 단순합니다. 오늘 이 기준 하나만 알면, 평생 헷갈리던 묵음 단어가 사전 없이도 한 번에 읽힙니다.` },
  { id: "02", text: `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 외우지 않고 몸으로 이해하는 소리 없는 철자의 비밀을 공개합니다.` },
  { id: "03", text: `사전을 펴보면 단어마다 소리가 안 나는 철자들이 제각각 흩어져 있습니다. knee, climb, write, knock, thumb... 단어마다 예외로 다 외워야 할 것 같아서 막막하셨죠.` },
  { id: "04", text: `사실 이 단어들, 예외가 아니라 원어민들도 혀가 너무 힘들어서 뺀 겁니다. 놀랍게도 옛날 영어에서는 이 글자들을 대부분 소리 내서 읽었습니다. 그런데 말하다 보니 너무 불편해서 저절로 탈락한 것이죠. 그 원리만 알면, 복잡해 보이던 묵음 단어들이 딱 세 개의 소리 서랍으로 깔끔하게 정리됩니다.` },
  { id: "05", text: `원리는 아주 단순합니다. 소리끼리 서로 부딪히기 때문입니다. 목구멍 깊은 곳의 K 소리를 내자마자 앞니 쪽의 N 소리로 혀가 날아가기엔 거리가 너무 멀고, 입술을 닫아 M 소리를 내놓고 또 억지로 '브!' 하고 입술을 터뜨리는 건 두 번 일하기 귀찮기 때문입니다. 결국 우리 혀와 입술이 가장 편한 지름길을 택한 것이죠.` },
  { id: "06", text: `첫 번째 서랍은 단어 맨 앞의 KN 소리입니다. 앞의 K는 혀가 귀찮아서 완전히 버리고, 곧바로 N 소리로 출발합니다. K를 굳이 소리 내려 하지 마세요. 혀를 처음부터 앞니 뒤에 딱 붙이고 그냥 '니' 하고 출발하면 됩니다. 함께 소리 내보실까요? knee, know, knife, knock, knight. K는 깨끗이 지우고 앞니 뒤에서 N 소리만 가볍게 내주시면 됩니다.` },
  { id: "07", text: `두 번째 서랍은 단어 끝의 MB 소리입니다. 우리가 매일 쓰는 '허니콤'이나 '썸드라이브'도 B 소리를 내지 않죠. 직접 입술을 닫아보세요. '클라임~' 하고 입술을 붙인 상태에서, 굳이 '브!' 하고 입술을 떼지 마세요. 그냥 입술만 편안하게 붙이고 끝내면 그게 원어민 소리입니다. 직접 소리 내보세요. climb, comb, thumb, lamb, bomb. B 소리를 터뜨리지 말고 부드러운 '음~' 소리로 마무리하시면 됩니다.` },
  { id: "08", text: `세 번째 서랍은 단어 맨 앞의 WR 소리입니다. 입술을 둥글게 모아 '우' 하느라 머뭇거리지 마세요. W는 잊어버리고, 처음부터 혀를 뒤로 당겨 시원하게 '롸이트'로 직진하시면 됩니다. 함께 읽어보실까요? write, wrong, wrist, wrap, wreck. W에서 망설이지 말고 바로 혀를 당겨 시원하게 R로 소리 내보세요.` },
  { id: "09", text: `여기서 잠깐, 소리도 안 나는 글자를 왜 굳이 남겨뒀을까요? 인쇄술이 발달하면서 철자가 굳어진 것도 있지만, 바로 뜻을 구별해 주는 고마운 신분증 역할을 하기 때문입니다. 소리는 똑같지만 knight는 기사, night는 밤, knot는 매듭, not은 아니다. 글자를 보면 뜻이 한눈에 구별되는 것이죠.` },
  { id: "12", text: `이제 문장으로 확인해 볼까요? 묵음 단어가 한 문장에 다 들어있습니다. The knight with a sharp knife is kneeling down. knight, knife, kneeling. K 소리를 깔끔하게 지우니 긴 문장도 물 흐르듯 읽히죠?` },
  { id: "13", text: `한 문장만 더 읽어보겠습니다. 이번엔 MB 소리와 WR 소리가 함께 들어있습니다. Please comb your hair and wrap the gift before you write. comb의 B 탈락, wrap과 write의 W 탈락. 소리 없는 철자를 피해 가니 발음이 훨씬 편안해집니다.` },
  { id: "14", text: `오늘 배운 묵음 규칙, 이 한 장만 기억하세요. KN 소리는 K를 버리고 N, MB 소리는 B를 버리고 M, WR 소리는 W를 버리고 R. 화면을 캡처해 두고 단어를 읽을 때마다 꺼내보세요.` },
  { id: "15", text: `영어는 무작정 외우는 게 아니라, 게으른 혀의 소리 원리를 이해하는 겁니다. 지난 모음 뒤 R 편도 함께 보시면 영어가 훨씬 쉬워집니다. 오늘도 수고 많으셨습니다. 이해하면 쉬운영어였습니다.` },
];

// Frame 10 (Quiz Round 1): intro + 3x [word, 3s silent think-time, answer].
// The 3-second gap is real dead air inserted locally (not billed as TTS
// audio) so the on-screen countdown gauge has something to run against.
const FRAME10_PIECES = [
  { id: "10a", text: "원리를 알았으니 직접 맞춰볼까요? 영상에 나오지 않은 새로운 단어들입니다. 몇 번 서랍인지 3초 안에 소리 내보세요.", gapAfterMs: 300 },
  { id: "10b", text: "knit!", gapAfterMs: 3000 },
  { id: "10c", text: "K가 사라지는 1번 KN 서랍이죠.", gapAfterMs: 400 },
  { id: "10d", text: "crumb!", gapAfterMs: 3000 },
  { id: "10e", text: "B가 사라지는 2번 MB 서랍입니다.", gapAfterMs: 400 },
  { id: "10f", text: "wreath!", gapAfterMs: 3000 },
  { id: "10g", text: "W가 사라지는 3번 WR 서랍입니다. 새로운 단어도 원리로 바로 읽히죠?", gapAfterMs: 0 },
];

// Frame 11 (Quiz Round 2, speed): same shape but a shorter 1.5s gap — the
// script itself calls for "조금 더 빠른 속도" this round.
const FRAME11_PIECES = [
  { id: "11a", text: "이번엔 조금 더 빠른 속도로 2라운드에 도전해 볼까요?", gapAfterMs: 300 },
  { id: "11b", text: "numb!", gapAfterMs: 1500 },
  { id: "11c", text: "B를 뺀 MB 소리죠.", gapAfterMs: 300 },
  { id: "11d", text: "knob!", gapAfterMs: 1500 },
  { id: "11e", text: "K를 뺀 KN 소리입니다.", gapAfterMs: 300 },
  { id: "11f", text: "wrench!", gapAfterMs: 1500 },
  { id: "11g", text: "W를 뺀 WR 소리입니다. 망설임 없이 바로 맞추셨다면 성공입니다!", gapAfterMs: 0 },
];

async function synthesizeWithRetry(text, key, delivery, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await synthesize(text, key, delivery);
    } catch (e) {
      lastErr = e;
      if (/SAFETY/.test(String(e.message)) && i < tries - 1) {
        console.log(`  (transient SAFETY false-positive, retry ${i + 1}/${tries - 1})`);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

function silencePcm(ms) {
  const bytesPerSample = AUDIO_FORMAT.bitsPerSample / 8;
  const samples = Math.round((AUDIO_FORMAT.sampleRate * ms) / 1000);
  return Buffer.alloc(samples * bytesPerSample * AUDIO_FORMAT.channels, 0);
}

function pcmDurationSeconds(pcmLength) {
  return pcmLength / (AUDIO_FORMAT.sampleRate * (AUDIO_FORMAT.bitsPerSample / 8) * AUDIO_FORMAT.channels);
}

const allTextsForEstimate = [...LINES, ...FRAME10_PIECES, ...FRAME11_PIECES].map((l) => l.text);
const totalCharsEstimate = allTextsForEstimate.reduce((s, t) => s + t.length, 0);
console.log(`Pieces: ${allTextsForEstimate.length} total (13 single-scene calls + 7 Frame-10 sub-pieces + 7 Frame-11 sub-pieces)`);
console.log(`Total narration chars: ${totalCharsEstimate}`);
if (only) console.log(`--only filter active: ${only.join(", ")} (${only.length} calls this run)`);

if (dryRun) {
  console.log("--dry-run: no API calls made.");
  process.exit(0);
}

const { key: apiKey } = loadApiKey();
const resultsPath = join(PROJECT_DIR, ".tts-results.json");
const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {}; // id -> { path, duration_s }
let totalUsd = 0;

async function generateOne(id, text) {
  process.stdout.write(`  ${id}: generating (${text.length} chars)... `);
  const { pcm, mimeType, usage } = await synthesizeWithRetry(text, apiKey, {});
  const rate = sampleRateFromMime(mimeType);
  if (rate !== AUDIO_FORMAT.sampleRate) {
    throw new Error(`${id}: response rate=${rate}, expected ${AUDIO_FORMAT.sampleRate} (mimeType=${mimeType})`);
  }
  const durationS = pcmDurationSeconds(pcm.length);
  const audioTokens = usage?.candidatesTokenCount ?? Math.ceil(durationS * PRICING.audioTokensPerSecond);
  const inputTokens = usage?.promptTokenCount ?? text.length;
  const usd = (inputTokens / 1e6) * PRICING.usdPerMillionInputTokens + (audioTokens / 1e6) * PRICING.usdPerMillionOutputTokens;
  totalUsd += usd;
  appendLedger({ episode: "ep18-silent-consonants", scene: id, chars: text.length, audioSeconds: durationS, audioTokens, inputTokens, usd, billed: usage != null });
  console.log(`${durationS.toFixed(3)}s, ${won(usd * PRICING.krwPerUsd)}`);
  return pcm;
}

// Persisted after every successful piece (not just once at the end) — a
// mid-run crash used to lose every result from that run, including
// already-paid-for pieces (EP17 lesson).
function saveResults() {
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
}

// Scenes 1-9, 12-15: one call each.
for (const line of LINES) {
  if (only && !only.includes(line.id)) continue;
  const pcm = await generateOne(line.id, line.text);
  const wav = pcmToWav(pcm, AUDIO_FORMAT);
  const relPath = `assets/voice/${line.id}.wav`;
  writeFileSync(join(PROJECT_DIR, relPath), wav);
  results[line.id] = { path: relPath, duration_s: Number(pcmDurationSeconds(pcm.length).toFixed(3)) };
  saveResults();
}

// Shared concatenation logic for a quiz frame's sub-pieces.
async function assembleQuizFrame(frameId, pieces) {
  const requested = only && pieces.some((p) => only.includes(p.id));
  if (!requested) return;
  console.log(`Frame ${frameId} (quiz round) — generating requested sub-pieces:`);
  const pcmParts = [];
  let allPiecesPresent = true;
  for (const piece of pieces) {
    if (only.includes(piece.id)) {
      const pcm = await generateOne(piece.id, piece.text);
      const wav = pcmToWav(pcm, AUDIO_FORMAT);
      writeFileSync(join(PROJECT_DIR, `assets/voice/${piece.id}.wav`), wav);
      results[piece.id] = { path: `assets/voice/${piece.id}.wav`, duration_s: Number(pcmDurationSeconds(pcm.length).toFixed(3)) };
      saveResults();
      pcmParts.push(pcm);
    } else {
      const cached = results[piece.id];
      if (!cached || !existsSync(join(PROJECT_DIR, cached.path))) {
        allPiecesPresent = false;
        continue;
      }
      const wavBuf = readFileSync(join(PROJECT_DIR, cached.path));
      pcmParts.push(wavBuf.subarray(44)); // strip the 44-byte WAV header back to raw PCM
    }
    if (piece.gapAfterMs > 0) pcmParts.push(silencePcm(piece.gapAfterMs));
  }
  if (allPiecesPresent) {
    const combined = Buffer.concat(pcmParts);
    const wav = pcmToWav(combined, AUDIO_FORMAT);
    writeFileSync(join(PROJECT_DIR, `assets/voice/${frameId}.wav`), wav);
    results[frameId] = { path: `assets/voice/${frameId}.wav`, duration_s: Number(pcmDurationSeconds(combined.length).toFixed(3)) };
    saveResults();
    console.log(`  ${frameId} (combined): ${results[frameId].duration_s}s`);
  } else {
    console.log(`  (some ${frameId} sub-pieces still missing — combined ${frameId}.wav not written yet, run the rest on a later free-tier day)`);
  }
}

// Frame 10 / 11 only run when explicitly requested via --only (their sub-piece
// ids), since each costs 7 calls on its own — kept out of default runs so a
// plain `node gen-tts-gemini.mjs` never silently burns the daily quota on one
// frame.
await assembleQuizFrame("10", FRAME10_PIECES);
await assembleQuizFrame("11", FRAME11_PIECES);

console.log(`\nTotal spend this run: ${won(totalUsd * PRICING.krwPerUsd)} (${totalUsd.toFixed(4)} USD)`);
writeFileSync(resultsPath, JSON.stringify(results, null, 2));
console.log("Wrote .tts-results.json with real durations per scene.");
