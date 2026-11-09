// Frozen narration voice for the whole channel.
//
// Every episode must sound like the same narrator, so these values are the one
// place they are written down and they are deliberately `Object.freeze`d: a
// script that tries to override one crashes instead of quietly shipping an
// episode in a different voice. Import from here, never re-declare.
//
// Pure Node only. Nothing here may be imported from `src/` — a REMOTION_
// prefixed variable would be inlined into the browser bundle and the API key
// would ship inside the rendered video. See CLAUDE.md.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(__dirname, "..");

/** Available voices. Updated 2026-11-09 per user decision: Male = Gero, Female = Olin */
export const VOICES = Object.freeze({
  male: Object.freeze({
    name: "Gero",
    gender: "male",
    style: "warm, confident, and engaging tone with natural cadence",
    pace: "natural",
    languageCode: "ko-KR",
    model: "gemini-3.8-flash-tts",
  }),
  female: Object.freeze({
    name: "Olin",
    gender: "female",
    style: "clear, friendly, and captivating tone with natural cadence",
    pace: "natural",
    languageCode: "ko-KR",
    model: "gemini-3.8-flash-tts",
  }),
});

/** Default narrator voice (Male: Gero). */
export const VOICE = VOICES.male;

/**
 * The Gemini speech API takes the voice as a parameter but has no fields for
 * style or pace — those are steered by a natural-language instruction in front
 * of the text itself. Keeping the sentence here (rather than in the generator)
 * is what makes the delivery reproducible across episodes.
 */
export const styleDirective = (delivery = {}) => {
  const style = delivery.style ?? VOICE.style;
  const pronunciation = delivery.pronunciationDirective
    ? ` ${delivery.pronunciationDirective} 이 지시문은 소리 내어 읽지 말고, 콜론 뒤의 나레이션만 읽으세요.`
    : "";
  return `Say only the narration after the colon in a ${style}.${pronunciation}:`;
};

export const buildPrompt = (narration, delivery) =>
  `${styleDirective(delivery)}\n\n${narration}`;

/**
 * What the WAVs must be for the rest of the pipeline to work.
 *
 * scripts/generate-highlights.mjs resamples to 16kHz for whisper.cpp and reads
 * frames as 16-bit mono, and Remotion measures scene lengths from these files,
 * so a format change here silently breaks subtitle timing rather than erroring.
 * Matches the EP6 recordings exactly.
 */
export const AUDIO_FORMAT = Object.freeze({
  sampleRate: 24000,
  channels: 1,
  bitsPerSample: 16,
});

/**
 * Reads the API key from .env using Node's own loader (no dependency).
 *
 * Rejects REMOTION_-prefixed names on purpose: Remotion injects those into the
 * browser bundle, so a key under that name would be published with the video.
 */
export function loadApiKey() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(`No .env at ${envPath}. Put the TTS API key there.`);
  }
  process.loadEnvFile(envPath);

  const leaked = Object.keys(process.env).filter(
    (k) => k.startsWith("REMOTION_") && /KEY|TOKEN|SECRET/i.test(k),
  );
  if (leaked.length > 0) {
    throw new Error(
      `Refusing to run: ${leaked.join(", ")} is REMOTION_-prefixed, which ` +
        `Remotion inlines into the browser bundle. Rename it without that prefix.`,
    );
  }

  const NAMES = ["GEMINI_API_KEY", "GOOGLE_API_KEY", "TTS_API_KEY", "API_TOKEN"];
  const name = NAMES.find((n) => (process.env[n] ?? "").trim().length > 0);
  if (!name) {
    throw new Error(`.env has none of: ${NAMES.join(", ")}`);
  }
  return { key: process.env[name].trim(), name };
}

/**
 * Billing for VOICE.model, from ai.google.dev/gemini-api/docs/pricing.
 *
 * Audio output is not billed per second but per token, at a fixed 25 tokens
 * per second of speech — which is what makes a cost estimate possible before
 * the call, straight from the narration's expected duration.
 *
 * The free tier allows 10 requests per day per model; past that these rates
 * apply. Re-check the page when the model changes: preview models get repriced.
 */
export const PRICING = Object.freeze({
  source: "https://ai.google.dev/gemini-api/docs/pricing",
  checkedOn: "2026-08-02",
  usdPerMillionInputTokens: 1.0,
  usdPerMillionOutputTokens: 20.0,
  /**
   * Measured, not the documented figure.
   *
   * The pricing page says 25 tokens per second of audio; the API's own
   * `candidatesTokenCount` came back at **32.01** for all twelve EP8 files
   * (spread 32.00-32.03), which is too tight to be coincidence. Quoting at 25
   * therefore understated every estimate by 28%.
   */
  audioTokensPerSecond: 32,
  audioTokensPerSecondSource: "measured over 12 EP8 renders, 2026-08-02",
  freeRequestsPerDay: 10,
  // Mid-market rate, 2026-08-02. Only affects the display, never the maths.
  krwPerUsd: 1443,
});

/** Where per-run spend is appended so a running total survives restarts. */
export const LEDGER_PATH = path.join(projectRoot, ".tts-usage.json");

/**
 * Korean narration is roughly one token per character; the style directive
 * adds a handful. Input is ~1/300th of the bill here, so a rough count is
 * fine — the audio output dominates completely.
 */
export const estimateCost = ({ inputChars, audioSeconds }) => {
  const inputTokens = Math.ceil(inputChars);
  const outputTokens = Math.ceil(audioSeconds * PRICING.audioTokensPerSecond);
  const usd =
    (inputTokens / 1e6) * PRICING.usdPerMillionInputTokens +
    (outputTokens / 1e6) * PRICING.usdPerMillionOutputTokens;
  return { inputTokens, outputTokens, usd, krw: usd * PRICING.krwPerUsd };
};

export function readLedger() {
  if (!fs.existsSync(LEDGER_PATH)) {
    return { entries: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8"));
  } catch {
    return { entries: [] };
  }
}

/** Records one billed call. Free-tier calls are logged with usd: 0. */
export function appendLedger(entry) {
  const ledger = readLedger();
  ledger.entries.push({ at: new Date().toISOString(), ...entry });
  fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

export const ledgerTotals = (ledger) =>
  ledger.entries.reduce(
    (acc, e) => ({
      calls: acc.calls + 1,
      billedCalls: acc.billedCalls + (e.billed ? 1 : 0),
      audioSeconds: acc.audioSeconds + (e.audioSeconds ?? 0),
      usd: acc.usd + (e.usd ?? 0),
    }),
    { calls: 0, billedCalls: 0, audioSeconds: 0, usd: 0 },
  );

export const won = (n) => `₩${Math.round(n).toLocaleString("ko-KR")}`;

/** Raw PCM samples -> a RIFF/WAVE file the rest of the pipeline can read. */
export function pcmToWav(pcm, { sampleRate, channels, bitsPerSample }) {
  const blockAlign = (channels * bitsPerSample) / 8;
  // Note: the EP6 recordings carry a wrong byteRate in their header (96000 for
  // 24kHz mono 16-bit). Correct value is written here; every reader in this
  // repo derives duration from dataSize/blockAlign/sampleRate, not byteRate.
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/** `audio/L16;codec=pcm;rate=24000` -> 24000, so a format drift is visible. */
export function sampleRateFromMime(mimeType) {
  const m = /rate=(\d+)/.exec(mimeType ?? "");
  return m ? Number(m[1]) : null;
}

/**
 * One narration line -> PCM bytes, in the channel voice.
 * Throws with the API's own message so failures are diagnosable.
 */
export async function synthesize(narration, apiKey, delivery = {}) {
  const targetVoice =
    delivery?.gender === "female" ||
    delivery?.voice === "female" ||
    delivery?.voiceName?.toLowerCase() === "olin"
      ? VOICES.female
      : VOICES.male;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetVoice.model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      // Header, not ?key= — a query string ends up in logs and history.
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(narration, delivery) }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          languageCode: targetVoice.languageCode,
          voiceConfig: { prebuiltVoiceConfig: { voiceName: targetVoice.name } },
        },
      },
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}\n${body}`);
  }

  let json;
  try {
    json = JSON.parse(body);
  } catch {
    throw new Error(`Response was not JSON:\n${body.slice(0, 500)}`);
  }

  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!part) {
    throw new Error(`No audio in response:\n${JSON.stringify(json).slice(0, 500)}`);
  }

  return {
    pcm: Buffer.from(part.inlineData.data, "base64"),
    mimeType: part.inlineData.mimeType,
    // Authoritative token counts when the API reports them; the estimate is
    // only a fallback so the ledger is never blank.
    usage: json.usageMetadata ?? null,
  };
}
