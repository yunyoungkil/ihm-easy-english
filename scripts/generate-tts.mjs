// Renders an episode's narration to public/audio/epNN_sceneMM.wav in the
// channel voice, so scripts/generate-highlights.mjs can then time it.
//
// The voice is not configurable here on purpose — it lives in tts-config.mjs
// so every episode uses the same one. See CLAUDE.md.
//
// Usage:
//   node scripts/generate-tts.mjs --episode=07 --scene=1   # one scene
//   node scripts/generate-tts.mjs --episode=07             # all scenes
//   node scripts/generate-tts.mjs --episode=07 --dry-run   # print, call nothing
//
// Runs that exceed the free tier stop for confirmation; --confirm-paid accepts
// the quote up front. See confirmSpend().
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import {
  AUDIO_FORMAT,
  PRICING,
  VOICE,
  appendLedger,
  buildPrompt,
  estimateCost,
  ledgerTotals,
  loadApiKey,
  pcmToWav,
  projectRoot,
  readLedger,
  sampleRateFromMime,
  synthesize,
  won,
} from "./tts-config.mjs";
import { fixNarration, formatProblems, lintNarration } from "./narration-lint.mjs";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v = "true"] = a.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

const episode = String(args.get("episode") ?? "07").padStart(2, "0");
const onlyScene = args.get("scene") ? Number(args.get("scene")) : null;
const dryRun = args.get("dry-run") === "true";
// A retry costs another API call, so it is opt-in rather than the default.
const overwrite = args.get("overwrite") === "true";
// Explicit go-ahead for spending money; see confirmSpend().
const confirmPaid = args.get("confirm-paid") === "true";
// Rewrites the script's narration with the linter's suggestions instead of
// only reporting them.
const fixNarrationFlag = args.get("fix-narration") === "true";

// A script name overrides --episode, so vertical shorts and other one-off
// scripts reuse this generator instead of getting their own copy.
const scriptName = args.get("script") ?? `ep${episode}`;
const scriptPath = path.join(projectRoot, "scripts", `${scriptName}.json`);
const audioDir = path.join(projectRoot, "public", "audio");

// Shorts hold `segments`, episodes hold `scenes`; the file naming follows.
const itemsOf = (data) => data.scenes ?? data.segments ?? [];
const kindOf = (data) => (data.scenes ? "scene" : "seg");

let outputName = (id) => `${scriptName}_scene${String(id).padStart(2, "0")}.wav`;
let delivery = {};

/**
 * Nothing is sent until every narration line is safe to read aloud.
 *
 * Bare suffixes ("TION") are not words, so the model reads them letter-ish and
 * bleeds into the next word — "비밀" came back as "빌밀". Catching that here
 * costs nothing; catching it after generating costs a paid call and a re-run.
 *
 * Returns true when generation may proceed.
 */
function lintAllNarration(data, items, scriptPath) {
  const flagged = items
    .map((item) => {
      const problems = lintNarration(item.narration ?? "");
      // The compare layout shows a deliberately *wrong* reading on screen.
      // If it ever reaches the narrator the short teaches the mistake, so the
      // screen text and the spoken text must stay separate.
      const wrong = item.compareLeft?.text?.trim();
      if (wrong && (item.narration ?? "").includes(wrong)) {
        problems.push({
          kind: "wrong-reading-spoken",
          token: wrong,
          index: (item.narration ?? "").indexOf(wrong),
          replacement: null,
          reason:
            "화면에만 보여야 할 오독 표기가 narration에 들어 있습니다. 나레이터가 틀린 발음을 읽게 됩니다.",
        });
      }
      return { item, problems };
    })
    .filter((r) => r.problems.length > 0);

  if (flagged.length === 0) {
    return true;
  }

  console.log("나레이션 검증 실패 - TTS가 잘못 읽을 표기가 있습니다:");
  for (const { item, problems } of flagged) {
    console.log(`  [${item.id}] "${item.narration}"`);
    console.log(formatProblems("    ", problems).replace(/^ {4}: /gm, "    - "));
    const { text, remaining } = fixNarration(item.narration ?? "");
    if (remaining.length === 0) {
      console.log(`    제안: "${text}"`);
    }
    console.log("");
  }

  const allFixable = flagged.every(
    (f) => fixNarration(f.item.narration ?? "").remaining.length === 0,
  );

  if (!fixNarrationFlag) {
    console.log(
      allFixable
        ? `자동 치환하려면: node scripts/generate-tts.mjs ${process.argv.slice(2).join(" ")} --fix-narration`
        : "자동 치환할 수 없는 항목이 있습니다. 위 표기를 직접 고친 뒤 다시 실행하세요.",
    );
    return false;
  }

  if (!allFixable) {
    console.log("자동 치환할 수 없는 항목이 남아 있어 중단합니다.");
    return false;
  }

  for (const { item } of flagged) {
    item.narration = fixNarration(item.narration).text;
  }
  fs.writeFileSync(scriptPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`${flagged.length}개 항목을 치환하고 ${path.basename(scriptPath)}에 저장했습니다.`);
  console.log("");
  return true;
}

/** How many billable calls today's free allowance still covers. */
const callsToday = (ledger) => {
  const today = new Date().toISOString().slice(0, 10);
  return ledger.entries.filter((e) => e.at.slice(0, 10) === today).length;
};

/**
 * What the run is about to cost, before a single call goes out.
 *
 * Duration is not knowable in advance, so it is projected from the script's
 * planned `duration` — which the measured EP7 files show runs ~25% long, so
 * this errs high rather than surprising anyone with a bigger bill.
 */
function quoteRun(scenes, ledger) {
  const alreadyFree = callsToday(ledger);
  const rows = scenes.map((scene, i) => {
    // Episodes plan a `duration`; shorts plan a start/end pair.
    const seconds = scene.duration ?? Math.max(0, scene.end - scene.start);
    const cost = estimateCost({
      inputChars: (scene.narration ?? "").length,
      audioSeconds: seconds,
    });
    const free = alreadyFree + i < PRICING.freeRequestsPerDay;
    return { id: scene.id, seconds, ...cost, free };
  });

  const billed = rows.filter((r) => !r.free);
  const freeCount = rows.length - billed.length;
  const usd = billed.reduce((a, r) => a + r.usd, 0);

  console.log(
    `예상 비용: ${rows.length}개 씬 중 ${freeCount}개는 무료 한도(오늘 ${alreadyFree}/${PRICING.freeRequestsPerDay} 사용), ` +
      `${billed.length}개 유료 → 약 ${won(usd * PRICING.krwPerUsd)} ($${usd.toFixed(4)})`,
  );
  if (billed.length > 0) {
    console.log(
      `  단가 $${PRICING.usdPerMillionOutputTokens}/1M 오디오 토큰 · ${PRICING.audioTokensPerSecond} 토큰/초 · ₩${PRICING.krwPerUsd}/$ (${PRICING.checkedOn} 기준)`,
    );
  }
  console.log("");
  return rows;
}

/**
 * Nothing that costs money runs without the user saying so.
 *
 * Free-tier runs are unaffected. Once a run would be billed the quote has to
 * be accepted: interactively when a person is at the terminal, and otherwise
 * only by re-running with --confirm-paid. The non-interactive case is the
 * important one — it is what stops an agent or a script from spending money
 * on the user's behalf just because it was told to generate an episode.
 */
async function confirmSpend(rows) {
  const billed = rows.filter((r) => !r.free);
  if (billed.length === 0) {
    return true;
  }

  const usd = billed.reduce((a, r) => a + r.usd, 0);
  const price = `${won(usd * PRICING.krwPerUsd)} ($${usd.toFixed(4)})`;

  if (confirmPaid) {
    console.log(`--confirm-paid 로 승인됨: ${billed.length}개 씬, ${price}\n`);
    return true;
  }

  if (process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const answer = await rl.question(
      `무료 한도를 넘습니다. ${billed.length}개 씬에 ${price} 청구됩니다. 진행할까요? (y/N) `,
    );
    rl.close();
    if (!/^y(es)?$/i.test(answer.trim())) {
      console.log("취소했습니다. 아무것도 생성하지 않았습니다.");
      return false;
    }
    return true;
  }

  console.log(
    `중단: 이 실행은 무료 한도를 넘어 ${billed.length}개 씬에 ${price} 가 청구됩니다.\n` +
      `대화형 터미널이 아니므로 자동 승인하지 않습니다.\n\n` +
      `  승인하려면: node scripts/generate-tts.mjs ${process.argv.slice(2).join(" ")} --confirm-paid\n` +
      `  무료 한도만 쓰려면: 내일 다시 실행하거나 --scene= 으로 나눠서 실행하세요.`,
  );
  return false;
}

function reportTotals() {
  const totals = ledgerTotals(readLedger());
  if (totals.calls === 0) {
    return;
  }
  console.log(
    `\n누적 사용량: 호출 ${totals.calls}회 (유료 ${totals.billedCalls}회), ` +
      `음성 ${(totals.audioSeconds / 60).toFixed(1)}분, ` +
      `누적 비용 ${won(totals.usd * PRICING.krwPerUsd)} ($${totals.usd.toFixed(4)})`,
  );
}

async function generateScene(scene, apiKey) {
  const narration = (scene.narration ?? "").trim();
  const sceneDelivery = { ...delivery, ...(scene.tts ?? {}) };
  if (narration.length === 0) {
    console.log(`  Scene ${scene.id}: narration empty, skipping.`);
    return { status: "skipped" };
  }

  const destination = path.join(audioDir, outputName(scene.id));
  if (fs.existsSync(destination) && !overwrite) {
    console.log(`  Scene ${scene.id}: ${outputName(scene.id)} exists (--overwrite to replace).`);
    return { status: "exists" };
  }

  if (dryRun) {
    console.log(`  Scene ${scene.id}: would send ${narration.length} chars`);
    console.log(`    ${buildPrompt(narration, sceneDelivery).slice(0, 180).replace(/\n/g, " ")}...`);
    return { status: "dry-run" };
  }

  const { pcm, mimeType, usage } = await synthesize(narration, apiKey, sceneDelivery);

  // The pipeline resamples these for whisper and measures scene lengths from
  // them, so a silent format change would show up as drifting subtitles rather
  // than an error. Fail loudly instead.
  const rate = sampleRateFromMime(mimeType);
  if (rate !== null && rate !== AUDIO_FORMAT.sampleRate) {
    throw new Error(
      `Scene ${scene.id}: API returned ${rate}Hz, expected ${AUDIO_FORMAT.sampleRate}Hz (${mimeType}).`,
    );
  }

  fs.writeFileSync(destination, pcmToWav(pcm, AUDIO_FORMAT));
  const seconds =
    pcm.length / ((AUDIO_FORMAT.bitsPerSample / 8) * AUDIO_FORMAT.channels) /
    AUDIO_FORMAT.sampleRate;

  // Bill from the measured audio, and from the API's own token counts when it
  // reports them. Calls inside the daily free allowance are recorded at zero
  // so the running total reflects money, not requests.
  const cost = estimateCost({
    inputChars: (scene.narration ?? "").length,
    audioSeconds: seconds,
  });
  const outputTokens = usage?.candidatesTokenCount ?? cost.outputTokens;
  const inputTokens = usage?.promptTokenCount ?? cost.inputTokens;
  const billed = callsToday(readLedger()) >= PRICING.freeRequestsPerDay;
  const usd = billed
    ? (inputTokens / 1e6) * PRICING.usdPerMillionInputTokens +
      (outputTokens / 1e6) * PRICING.usdPerMillionOutputTokens
    : 0;

  appendLedger({
    episode,
    scene: scene.id,
    model: VOICE.model,
    audioSeconds: Number(seconds.toFixed(2)),
    inputTokens,
    outputTokens,
    billed,
    usd,
  });

  console.log(
    `  Scene ${scene.id}: ${outputName(scene.id)} — ${seconds.toFixed(2)}s, ` +
      `${outputTokens} 토큰, ${billed ? won(usd * PRICING.krwPerUsd) : "무료 한도"}`,
  );
  return { status: "written", seconds };
}

async function main() {
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`No script at ${scriptPath}`);
  }
  const data = JSON.parse(fs.readFileSync(scriptPath, "utf8"));
  delivery = data.tts ?? {};
  const kind = kindOf(data);
  outputName = (id) => `${scriptName}_${kind}${String(id).padStart(2, "0")}.wav`;

  const { key, name } = dryRun
    ? { key: "", name: "(dry run)" }
    : loadApiKey();

  console.log(`${data.episode ?? scriptName} — ${data.title ?? ""}`);
  console.log(
    `Voice: ${VOICE.name} / ${delivery.style ?? VOICE.style} / ${delivery.pace ?? VOICE.pace} / ${VOICE.languageCode}`,
  );
  console.log(`Model: ${VOICE.model}`);
  console.log(`API key from: ${name}\n`);

  fs.mkdirSync(audioDir, { recursive: true });

  const all = itemsOf(data);
  const scenes = onlyScene ? all.filter((s) => s.id === onlyScene) : all;

  // Before the quote, before any call: is this text safe to read aloud?
  if (!lintAllNarration(data, scenes, scriptPath)) {
    process.exitCode = 1;
    return;
  }
  if (scenes.length === 0) {
    throw new Error(`Scene ${onlyScene} not found in ${path.basename(scriptPath)}`);
  }

  const pending = scenes.filter(
    (s) =>
      (s.narration ?? "").trim().length > 0 &&
      (!fs.existsSync(path.join(audioDir, outputName(s.id))) || overwrite),
  );
  const rows = quoteRun(pending, readLedger());
  if (!dryRun && !(await confirmSpend(rows))) {
    reportTotals();
    return;
  }

  let written = 0;
  let totalSeconds = 0;
  for (const scene of scenes) {
    // Sequential on purpose: the scenes are one narration and the API is rate
    // limited, so a parallel burst buys nothing and fails harder.
    const result = await generateScene(scene, key);
    if (result.status === "written") {
      written += 1;
      totalSeconds += result.seconds;
    }
  }

  console.log(
    `\nWrote ${written} file(s)${written > 0 ? `, ${totalSeconds.toFixed(1)}s of narration` : ""}.`,
  );
  if (written > 0) {
    console.log("Next: add them to src/data/audioMap.ts, then run scripts/generate-highlights.mjs");
  }
  reportTotals();
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
