#!/usr/bin/env node
// Generate all 12 EP13 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) — same approach as EP11/EP12
// (videos/ep11-longform-faceless/scripts/regen-tts-gemini.mjs).
//
// Frame 9 (listening) is NOT a single call: the 4 English example sentences
// are sent as pure English text (separate calls) so they come out as real
// English pronunciation instead of a Korean voice reading English words, then
// all 9 pieces (Korean carrier text + 4 English sentences, interleaved) are
// concatenated at the raw-PCM level with short silence gaps — same procedure
// SCRIPT.md cites from EP11 Line 10 / EP12 Line 7.
//
// Usage: node scripts/gen-tts-gemini.mjs [--only=05] [--dry-run]
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
  estimateCost,
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
const only = onlyArg ? onlyArg.split("=")[1] : null;

// 12 scenes. Frame 9 is represented as 9 sub-pieces to be concatenated after
// generation (see FRAME9_SILENCE_MS below for the gaps between them).
const LINES = [
  { id: "01", text: `알파벳도 다 알고, 발음 규칙도 나름 공부하셨는데… 막상 처음 보는 단어 앞에서 딱 멈추신 적 있으시죠? 분명 A는 '애' 소리, B는 '브' 소리라고 배우셨는데, 단어 안에만 들어가면 완전 다르게 읽혀요. 그럴 때마다 "이건 또 왜 이렇게 읽지?" 하면서 하나씩 따로 외우다 지쳐서 포기하신 분들, 정말 많으실 거예요. 그거, 여러분이 이해력이 부족해서가 아닙니다. 지금까지 아무도 진짜 이유를 제대로 안 알려줬을 뿐이에요.` },
  { id: "02", text: `안녕하세요, 「이해하면 쉬운영어」입니다. 오늘은 알파벳이 단어 안에서 왜 다르게 소리 나는지, 그 진짜 원리를 함께 봅니다.` },
  { id: "03", text: `그런데 궁금하지 않으세요? 왜 유독 영어는 같은 알파벳인데 단어마다 소리가 다 다를까요? 사실 이유는 간단해요. 한국어는 모음이 21개나 되는데, 영어 모음은 A, E, I, O, U 딱 5개뿐이거든요. 낼 수 있는 소리는 훨씬 많은데 글자는 훨씬 적으니까, 한 글자가 여러 소리를 돌아가면서 맡을 수밖에 없는 거예요. 그럼 결국 이 많은 경우의 수, 우리가 하나하나 다 외워야만 읽을 수 있는 걸까요?` },
  { id: "04", text: `결론부터 말씀드릴게요. 다 외우실 필요 없습니다. 원어민들이 저 많은 단어를 다 규칙으로 외워서 읽는 게 아니에요. 그냥 혀에 힘을 딱 빼고, 제일 편한 대로 소리를 내다 보니까 저절로 저렇게 되는 겁니다. 저도 예전엔 "왜 얘는 저렇게 읽고 쟤는 다르게 읽지" 하면서 하나하나 외우려다 지쳤었어요. 근데 알고 보니까 외우는 게 아니라, 힘을 빼는 원리 하나면 끝나는 거였습니다.` },
  { id: "05", text: `원리는 이렇습니다. 혀에 힘을 딱 빼고 턱을 편하게 아래로 툭 떨어뜨리면, 자연스럽게 '애' 소리가 나요. 억지로 신경 써서 내는 소리가 아니라, 힘을 빼면 저절로 그렇게 되는 거예요. 예를 들어 BAG이라는 단어를 볼게요. B는 입술을 붙였다가 팡 떼면서 나는 소리, A는 방금 그 턱을 툭 떨어뜨리는 '애' 소리, G는 목 안쪽에서 편하게 나오는 소리예요. 이 세 개를 힘 빼고 자연스럽게 이어 붙이면 '백(BAG)'이 됩니다. 지금 제 입모양 한번 잘 보세요. 턱이 얼마나 편하게 내려가는지, 입술이 얼마나 힘 없이 움직이는지 — 이게 핵심입니다. 눈으로 직접 확인하시면 훨씬 빨리 감이 잡히실 거예요.` },
  { id: "06", text: `그럼 이게 진짜 다른 단어에도 통하는지 볼까요? CAT, 볼게요. C는 목 안쪽에서 바람 터지듯 나는 소리, A는 아까처럼 턱 내려가는 '애' 소리, T는 혀끝으로 톡 끊어주는 소리. 이어 붙이면 '캣(CAT)'이에요. MAP도 똑같아요. M은 입술 다물고 콧소리로 흠, A는 또 '애', P는 입술 팡 터지는 소리. 이어 붙이면 '맵(MAP)'. 어때요? BAG에서 썼던 그 '애' 소리, CAT에서도 MAP에서도 똑같이 통하죠? 이거 하나하나 다른 규칙으로 외우신 거 아니에요. 힘 빼는 원리 하나가 계속 통하는 겁니다.` },
  { id: "07", text: `근데 눈치채신 분 있으실 거예요. 방금 CAT에서 C는 '크' 소리였잖아요. 근데 CITY나 CENTER 같은 단어에서는 C가 갑자기 '스' 소리로 바뀌어요. 이것도 그냥 외워야 하는 예외일까요? 아니요, 여기도 똑같이 힘 빼는 원리가 통합니다. C 바로 뒤에 E나 I처럼 입 앞쪽에서 나는 소리가 오면, 혀가 굳이 목 안쪽까지 가서 '크' 소리를 낼 필요가 없어져요. 이미 입 앞쪽에 있으니까, 그 자리에서 편하게 '스'로 끝내버리는 거죠. 그러니까 외우실 건 딱 하나예요. 뒤에 E, I, Y가 오면 혀가 귀찮아서 '스'로 바뀐다 — 이거 하나만 기억하시면 됩니다.` },
  { id: "08", text: `직접 맞혀보세요. GAP이라는 단어, 어떻게 소리가 이어질까요? 잠깐 생각해 보시고… G, A, P를 힘 빼고 이어 붙이면 '갭'입니다. 하나 더요. PAT은요? … P, A, T 이어 붙이면 '팻'이죠. 이번엔 좀 다른 문제예요. CUP, C가 크일까요 스일까요? … 정답은 '크', 뒤에 U가 왔으니까요. 마지막으로 CELL은요? … 정답은 '스', 뒤에 E가 왔으니까요.` },
  { id: "10", text: `자, 이번엔 직접 해보세요. 아까처럼 소리 하나씩 힘 빼고 이어볼게요. 브, 애, 그 — 이어 붙이면, 백! 다시 한 번, 좀 더 빠르게. 백, 백. 이번엔 캣이에요. 크, 애, 트 — 이어 붙이면, 캣! 다시 한 번, 좀 더 빠르게. 캣, 캣. 이번엔 맵. 흠, 애, 프 — 이어 붙이면, 맵! 다시 한 번, 좀 더 빠르게. 맵, 맵. 마지막으로 예외도 같이 해볼까요? 셀이에요. 뒤에 E가 왔으니까 C는 스로 바뀌죠. 스, 에, 을 — 이어 붙이면, 셀! 다시 한 번, 좀 더 빠르게. 셀, 셀.` },
  { id: "11", text: `이제 처음 보는 단어를 만나도 예전처럼 무작정 얼어붙진 않으실 거예요. 마트에서 'JAM'이라는 글자를 보셨다고 해볼까요. 바로 술술 읽히지 않아도 괜찮아요. 배운 대로 소리 하나씩 힘 빼고 천천히 이어보면, 즈, 애, 음 — 잼! 이렇게 시간이 걸리더라도 스스로 읽어낼 수 있게 되실 거예요. 이게 오늘 배운 원리의 진짜 힘입니다.` },
  { id: "12", text: `오늘은 알파벳을 힘 빼고 편하게 이어 붙이면 소리가 저절로 만들어진다는 원리, 그리고 C처럼 예외로 보이는 것도 사실 같은 원리로 설명된다는 것까지 함께 봤습니다. 처음 보는 단어 앞에서 더 이상 얼어붙지 않으셨으면 좋겠어요. 다음에도 여러분이 자주 막막해하시는 부분, 또 풀어드릴게요. 저와 같이 하나씩 차근차근 익혀 나가시면, 어느새 훨씬 편하게 읽고 계실 거예요.` },
];

// Frame 9: Korean carrier pieces + 4 pure-English example sentences, with the
// silence gap (ms) to insert AFTER each piece when concatenating.
const FRAME9_PIECES = [
  { id: "09a", text: "이제 실제 속도로 들어보세요. 첫 번째.", gapAfterMs: 300 },
  { id: "09b", text: "There's a gap.", gapAfterMs: 500 },
  { id: "09c", text: "두 번째.", gapAfterMs: 250 },
  { id: "09d", text: "Pat the dog.", gapAfterMs: 500 },
  { id: "09e", text: "세 번째.", gapAfterMs: 250 },
  { id: "09f", text: "Give me a cup.", gapAfterMs: 500 },
  { id: "09g", text: "네 번째.", gapAfterMs: 250 },
  { id: "09h", text: "Check your cell phone.", gapAfterMs: 600 },
  { id: "09i", text: "오늘 배운 소리들, 실제 문장 속에서도 다 들리시죠?", gapAfterMs: 0 },
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

const allTextsForEstimate = [...LINES, ...FRAME9_PIECES].map((l) => l.text);
const totalCharsEstimate = allTextsForEstimate.reduce((s, t) => s + t.length, 0);
console.log(`Pieces: ${allTextsForEstimate.length} (11 single-scene calls + 9 Frame-9 sub-pieces)`);
console.log(`Total narration chars: ${totalCharsEstimate}`);

if (dryRun) {
  console.log("--dry-run: no API calls made.");
  process.exit(0);
}

const { key: apiKey } = loadApiKey();
const results = {}; // id -> { path, duration_s }
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
  appendLedger({ episode: "ep13-tongue-shortcut", scene: id, chars: text.length, audioSeconds: durationS, audioTokens, inputTokens, usd, billed: usage != null });
  console.log(`${durationS.toFixed(3)}s, ${won(usd * PRICING.krwPerUsd)}`);
  return pcm;
}

// Scenes 1-8, 10-12: one call each.
for (const line of LINES) {
  if (only && line.id !== only) continue;
  const pcm = await generateOne(line.id, line.text);
  const wav = pcmToWav(pcm, AUDIO_FORMAT);
  const relPath = `assets/voice/${line.id}.wav`;
  writeFileSync(join(PROJECT_DIR, relPath), wav);
  results[line.id] = { path: relPath, duration_s: Number(pcmDurationSeconds(pcm.length).toFixed(3)) };
}

// Frame 9: generate each piece, then concatenate raw PCM with silence gaps.
if (!only || only === "09") {
  console.log("Frame 9 (listening) — generating 9 sub-pieces:");
  const pcmParts = [];
  for (const piece of FRAME9_PIECES) {
    const pcm = await generateOne(piece.id, piece.text);
    pcmParts.push(pcm);
    if (piece.gapAfterMs > 0) pcmParts.push(silencePcm(piece.gapAfterMs));
  }
  const combined = Buffer.concat(pcmParts);
  const wav = pcmToWav(combined, AUDIO_FORMAT);
  const relPath = `assets/voice/09.wav`;
  writeFileSync(join(PROJECT_DIR, relPath), wav);
  results["09"] = { path: relPath, duration_s: Number(pcmDurationSeconds(combined.length).toFixed(3)) };
  console.log(`  09 (combined): ${results["09"].duration_s}s`);
}

console.log(`\nTotal spend this run: ${won(totalUsd * PRICING.krwPerUsd)} (${totalUsd.toFixed(4)} USD)`);
writeFileSync(join(PROJECT_DIR, ".tts-results.json"), JSON.stringify(results, null, 2));
console.log("Wrote .tts-results.json with real durations per scene.");
