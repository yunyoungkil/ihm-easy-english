import { ELLIPSIS_PAUSE_SEC } from "./theme";
import type { LineSegment } from "./types";

/**
 * Splits a line into karaoke word segments (plus pause segments wherever the
 * text has "...") that exactly fill `durationInFrames`.
 *
 * There is no real audio/Whisper alignment yet for this test composition, so
 * timing is estimated: each word gets a share of the frame budget
 * proportional to its character length (longer words read slower), and any
 * "..." token reserves a fixed pause instead of getting word-length weight.
 * Once real TTS + generate-highlights.mjs-style alignment exists for this
 * script, this function is what a real `highlightAt`/`highlightEnd` lookup
 * would replace.
 */
export function buildLineSegments(
  text: string,
  durationInFrames: number,
  fps: number,
): LineSegment[] {
  const pauseFrames = Math.round(ELLIPSIS_PAUSE_SEC * fps);
  const rawTokens = text.trim().split(/\s+/).filter(Boolean);

  const tokens = rawTokens.map((token) => ({
    text: token.replace(/\.{3,}$/, "").trim(),
    hasPause: /\.{3,}$/.test(token),
  }));

  const words = tokens.filter((t) => t.text.length > 0);
  const pauseCount = tokens.filter((t) => t.hasPause).length;
  const wordBudget = Math.max(durationInFrames - pauseCount * pauseFrames, words.length * 3);

  const weights = words.map((t) => 4 + t.text.length * 1.1);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const segments: LineSegment[] = [];
  let cursor = 0;
  let wordIndex = 0;

  for (const token of tokens) {
    if (token.text.length === 0) continue;
    const weight = weights[wordIndex];
    const share = Math.max(3, Math.round((weight / totalWeight) * wordBudget));
    const start = cursor;
    const end = Math.min(durationInFrames, start + share);
    segments.push({ type: "word", text: token.text, startFrame: start, endFrame: end });
    cursor = end;
    wordIndex += 1;

    if (token.hasPause && cursor < durationInFrames) {
      const pauseEnd = Math.min(durationInFrames, cursor + pauseFrames);
      segments.push({ type: "pause", startFrame: cursor, endFrame: pauseEnd });
      cursor = pauseEnd;
    }
  }

  // Whatever's left over from rounding goes to the last word so the
  // highlight always finishes exactly at the sequence's last frame.
  const last = segments[segments.length - 1];
  if (last && last.endFrame < durationInFrames) {
    last.endFrame = durationInFrames;
  }

  return segments;
}

/**
 * Cumulative frames spent inside "word" segments up to `frame` — pause
 * segments don't advance this clock, which is what makes anything driven by
 * it (the speaker's sound-wave ripple) visibly freeze during a break instead
 * of continuing to animate through it.
 */
export function speakingElapsedFrames(frame: number, segments: LineSegment[]): number {
  let elapsed = 0;
  for (const seg of segments) {
    if (seg.type !== "word") continue;
    if (frame <= seg.startFrame) break;
    elapsed += Math.min(frame, seg.endFrame) - seg.startFrame;
  }
  return elapsed;
}

export function isSpeakingAt(frame: number, segments: LineSegment[]): boolean {
  return segments.some(
    (seg) => seg.type === "word" && frame >= seg.startFrame && frame < seg.endFrame,
  );
}
