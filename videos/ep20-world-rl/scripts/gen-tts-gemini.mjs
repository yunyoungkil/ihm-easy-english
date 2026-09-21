#!/usr/bin/env node
// Generate all 12 EP20 narration lines with the frozen channel voice (Gemini
// Charon, scripts/tts-config.mjs) — same approach as EP16~EP19
// (videos/ep19-ate-suffix/scripts/gen-tts-gemini.mjs).
//
// Frames 9 and 10 (3-second-pause quizzes) are represented as 2 sub-pieces each:
// 09a + 3s gap + 09b ➔ merged into 09.wav
// 10a + 3s gap + 10b ➔ merged into 10.wav
//
// Usage: node scripts/gen-tts-gemini.mjs [--only=01,02,03] [--dry-run]
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

const LINES = [
  { id: "01", text: `스마트폰 영어 학습 앱이나 번역기 켜놓고 혼자 발음 연습해 보신 적 있으시죠? 다른 단어는 척척 넘어가는데, 유독 'World'나 'Girl'만 나오면 죽어도 인식이 안 되고 시뻘건 오답 창이 떴던 답답한 경험, 한 번쯤 있으실 겁니다. 마이크에 입을 바짝 대고 턱이 빠져라 혀를 굴려가며 '워얼ㄹ드!'를 외쳐봐도, 화면에는 엉뚱하게 'Old'나 'Word'로 찍히며 속을 뒤집어 놓죠. 분명히 버터 발음으로 열심히 굴렸는데, 도대체 왜 내 입에서는 외계어 소리가 났을까요? 여러분의 혀가 굳어서가 절대 아닙니다. 혀를 굴릴수록 망가지는 치명적인 착각 때문입니다. 오늘 딱 7분만 투자해 보세요. 어려운 문법이나 발음 기호 싹 다 빼고, 초등학생도 1초 만에 따라 하는 비밀 공식으로 여러분의 굳었던 입을 시원하게 뚫어드립니다.` },
  { id: "02", text: `많은 분들이 영어에 'R'이 들어가면 본능적으로 혀를 목구멍 안쪽으로 잔뜩 말아 올립니다. 노래를 따라 부르거나 혼자 단어를 읽을 때도, 혀를 잔뜩 굴리다가 바로 뒤에 'L'이 나오니까 그 말려있던 혀끝을 입천장에 억지로 갖다 붙이려고 용을 쓰죠. 그런데 결론부터 말씀드리면, 이 동작을 시도하는 순간 여러분의 발음은 이미 끝난 겁니다. 원어민들은 World를 소리 낼 때, 절대로 이런 피곤한 동작을 하지 않거든요.` },
  { id: "03", text: `소리의 원리를 알면 아주 단순합니다. R은 혀를 목구멍 쪽으로 쑥 당기는 소리인데, 우리가 배운 보통의 L은 혀끝으로 앞쪽 입천장을 치는 소리입니다. 뒤로 가려는 힘과 앞으로 튀어나가려는 힘이 입안에서 정면충돌하니, 턱에 쥐가 나고 혀가 마비되는 건 당연한 일이죠. 스마트폰 앱이 내 발음을 못 알아들었던 이유도 여기에 있습니다. 급해진 입이 L을 아예 건너뛰고 '워드'로 뭉개버리거나, 반대로 혀에 힘이 풀리면서 '올드'라는 엉뚱한 소리가 튀어나왔던 것입니다.` },
  { id: "04", text: `그렇다면 원어민은 이 끔찍한 충돌을 어떻게 피할까요? 비밀은 바로 '게으른 혀'에 있습니다. 놀랍게도 단어 끝이나 자음 앞에 붙는 L은, 혀끝을 부지런히 천장에 붙일 필요가 전혀 없습니다. R을 소리 내면서 이미 뒤로 당겨둔 그 편안한 자세를 그대로 둔 채, 목구멍 안쪽에서 '을' 하고 게으르게 소리만 흘려보내면 끝나거든요. 원어민은 혀끝으로 힘들게 소리를 만드는 게 아니라, 힘을 쏙 뺀 게으른 울림으로 소리를 냅니다.` },
  { id: "05", text: `자, 이제 어려운 영어 철자는 싹 잊으시고 딱 두 가지만 입으로 따라 해보세요. 첫 번째! 붕어처럼 입술을 동그랗게 앞으로 쭉 내밀면서 '우'. 두 번째! 하품할 때처럼 턱에 힘을 툭 빼면서 '어~'. 이 두 소리를 자연스럽게 이어볼까요? '우~ 어~', 한 호흡으로 부드럽게 이으면 '워~'. 어떠세요? 혀를 억지로 굴리지 않았는데도 입술을 모았다가 턱 힘만 빼니까 아주 편안하게 '워~' 소리가 나오죠?` },
  { id: "06", text: `자, 이제 두 번째 비밀 소리입니다. 여기서 절대 혀끝으로 천장을 치려고 달려들지 마세요. 방금 전 '워~' 하고 턱 힘을 뺀 그 상태 그대로, 침을 삼키듯 목구멍 뒤쪽에서 게으르게 '을' 소리를 내는 겁니다. 혀끝이 천장에 닿을락 말락 힘을 뺀 채로, 목구멍 근처만 묵직해지는 느낌이죠. 워~ 뒤에 숨어있는 그림자처럼 '을'. 혀끝을 억지로 천장에 딱 붙이지 않아도, 이 게으른 울림만으로 스마트폰 AI나 원어민 귀에는 가장 완벽한 소리로 들립니다.` },
  { id: "07", text: `이제 이 소리들을 하나로 이어 붙여보겠습니다. 딱 네 글자만 기억하세요. 우, 어, 을, 드. 자, 천천히 소리 내볼까요? '우-어-을-드'. 이제 조금만 빠르게 연결해 보세요. '워~을드', 더 자연스럽게 이으면 '워~얼드'. 어떠세요? 턱에 힘주고 혀를 쥐어짜지 않았는데도, 놀라울 정도로 묵직하고 자연스러운 원어민의 World 소리가 내 입에서 그대로 터져 나오죠?` },
  { id: "08", text: `이 게으른 혀의 원리를 알면, 성인 학습자 열에 아홉이 포기하던 단어 'Girl'도 딱 1초 만에 뚫립니다. Girl 역시 똑같은 쌍둥이 원리거든요. 혀를 굴리며 '그어얼ㄹ' 하고 애쓰지 마시고, 1단계로 턱 힘 빼고 한숨 쉬듯 '거~'. 그리고 그 뒤에 방금 배운 게으른 소리 '을'을 얹어주는 겁니다. '거~을'. 턱 근육이 전혀 아프지 않은데, 듣는 사람 귀에는 가장 세련된 Girl 소리가 완성됩니다.` },
  { id: "11", text: `오늘 배운 핵심을 딱 한 장으로 정리해 드립니다. 지금 이 화면을 스마트폰으로 꼭 캡처해 두세요! 첫째, 혀끝을 억지로 입천장에 붙이려고 용쓰지 않는다. 둘째, 입술을 모았다가 턱 힘을 툭 빼며 '우-어'를 먼저 만든다. 셋째, 목구멍 뒤쪽에서 게으르게 침 삼키듯 '을' 소리를 얹어준다. 이 세 가지만 기억하시면, 앞으로 어떤 영어 단어를 만나도 턱이 아프거나 혀가 꼬일 일은 영원히 없습니다.` },
  { id: "12", text: `영어는 혀를 혹사시키며 무작정 굴리는 게 아니라, 소리가 지나가는 진짜 길을 이해하는 것입니다. 오늘 영상이 여러분의 오랜 발음 답답함을 시원하게 뚫어드렸다면, 구독과 좋아요로 함께해 주세요. 다음 시간에도 여러분의 귀와 입을 단숨에 열어주는 명쾌한 소리 공식으로 찾아뵙겠습니다. 오늘도 끝까지 함께해 주셔서 진심으로 감사합니다!` },
];

const FRAME9_PIECES = [
  { id: "09a", text: `자, 퀴즈 들어가기 전에 딱 1초만 집중해 보세요! 도대체 Word(단어)와 World(세계)는 귀로 어떻게 구분할까요? 아주 간단합니다. Word는 L이 없으니까 중간 멈춤 없이 '워어-드'로 직진하고, World는 중간에 방금 배운 게으른 '을' 쿠션이 들어가서 '워어-을-드'로 묵직해집니다. 자, 그럼 여러분의 귀가 진짜 열렸는지 블라인드 테스트 들어갑니다! 제가 들려드리는 소리가 과연 A일까요, B일까요? 3초 안에 골라보세요!`, gapAfterMs: 3000 },
  { id: "09b", text: `정답은 바로 B였습니다! 소리 중간에 묵직하게 밟히는 '을' 쿠션 소리가 확실하게 들리셨죠? 이 소리가 귀에 꽂혔다면 여러분의 귀는 이미 원어민 소리를 완벽히 구별하고 계신 겁니다!`, gapAfterMs: 0 },
];

const FRAME10_PIECES = [
  { id: "10a", text: `마지막 2라운드 실전 밸런스 퀴즈입니다! 버블티 마실 때 '펄(Pearl)'을 추가하거나, 미용실에서 '컬(Curl)'을 넣어달라고 할 때 일상에서 정말 자주 쓰는 단어들인데요. 원어민처럼 혀 안 꼬이고 소리 내는 진짜 방법은 둘 중 무엇일까요? A! 혀끝을 입천장에 힘껏 튕긴다! B! 턱 힘 툭 빼고 게으른 '을'만 얹어준다! 3초 안에 선택해 보세요!`, gapAfterMs: 3000 },
  { id: "10b", text: `정답은 당연히 B입니다! '퍼~' 뒤에 게으른 '을'을 얹으면 Pearl, '커~' 뒤에 얹으면 Curl. 원리를 알고 나니 정말 싱거울 정도로 쉽게 풀리죠?`, gapAfterMs: 0 },
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

const allTextsForEstimate = [...LINES, ...FRAME9_PIECES, ...FRAME10_PIECES].map((l) => l.text);
const totalCharsEstimate = allTextsForEstimate.reduce((s, t) => s + t.length, 0);
console.log(`Pieces: ${allTextsForEstimate.length} total (10 single-scene calls + 2 Frame-9 sub-pieces + 2 Frame-10 sub-pieces)`);
console.log(`Total narration chars: ${totalCharsEstimate}`);
if (only) console.log(`--only filter active: ${only.join(", ")} (${only.length} calls this run)`);

if (dryRun) {
  console.log("--dry-run: no API calls made.");
  process.exit(0);
}

const { key: apiKey } = loadApiKey();
const resultsPath = join(PROJECT_DIR, ".tts-results.json");
const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : {};
let totalUsd = 0;

for (const line of LINES) {
  if (only && !only.includes(line.id)) continue;
  console.log(`Generating ${line.id}... (${line.text.length} chars)`);
  const synth = await synthesizeWithRetry(line.text, apiKey, { prompt: line.text });
  const pcm = synth.pcm;
  const wav = pcmToWav(pcm, AUDIO_FORMAT);
  const outPath = join(VOICE_DIR, `${line.id}.wav`);
  writeFileSync(outPath, wav);

  const dur = pcmDurationSeconds(pcm.length);
  results[line.id] = {
    path: `assets/voice/${line.id}.wav`,
    duration_s: Math.round(dur * 100) / 100,
  };
  totalUsd += synth.billedChars ? (synth.billedChars / 1_000_000) * PRICING.charRatePerMillionUsd : 0;
  console.log(`  -> ${line.id}.wav (${dur.toFixed(2)}s)`);
}

async function handleCompositeFrame(frameId, pieces) {
  const needsAny = pieces.some((p) => !only || only.includes(p.id) || only.includes(frameId));
  if (!needsAny) return;

  console.log(`Generating composite ${frameId} (${pieces.map((p) => p.id).join(" + ")} with 3s silence gap)...`);
  const pcmChunks = [];
  for (const piece of pieces) {
    console.log(`  Generating sub-piece ${piece.id}... (${piece.text.length} chars)`);
    const synth = await synthesizeWithRetry(piece.text, apiKey, { prompt: piece.text });
    const pcm = synth.pcm;
    const subWav = pcmToWav(pcm, AUDIO_FORMAT);
    const subPath = join(VOICE_DIR, `${piece.id}.wav`);
    writeFileSync(subPath, subWav);

    const subDur = pcmDurationSeconds(pcm.length);
    results[piece.id] = {
      path: `assets/voice/${piece.id}.wav`,
      duration_s: Math.round(subDur * 100) / 100,
    };
    totalUsd += synth.billedChars ? (synth.billedChars / 1_000_000) * PRICING.charRatePerMillionUsd : 0;

    pcmChunks.push(pcm);
    if (piece.gapAfterMs > 0) {
      console.log(`  Inserting ${piece.gapAfterMs}ms silence gap...`);
      pcmChunks.push(silencePcm(piece.gapAfterMs));
    }
  }

  const mergedPcm = Buffer.concat(pcmChunks);
  const mergedWav = pcmToWav(mergedPcm, AUDIO_FORMAT);
  const mergedPath = join(VOICE_DIR, `${frameId}.wav`);
  writeFileSync(mergedPath, mergedWav);

  const totalDur = pcmDurationSeconds(mergedPcm.length);
  results[frameId] = {
    path: `assets/voice/${frameId}.wav`,
    duration_s: Math.round(totalDur * 100) / 100,
  };
  console.log(`  -> Merged ${frameId}.wav (${totalDur.toFixed(2)}s)`);
}

await handleCompositeFrame("09", FRAME9_PIECES);
await handleCompositeFrame("10", FRAME10_PIECES);

writeFileSync(resultsPath, JSON.stringify(results, null, 2), "utf8");
console.log("Wrote .tts-results.json with real durations per scene.");
console.log(`Done. Approx TTS spend this run: $${totalUsd.toFixed(4)} (${won(totalUsd)})`);
