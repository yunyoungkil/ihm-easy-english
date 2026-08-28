import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_SIZES, TIMING } from "./theme";
import { FONT_EN, FONT_KO } from "./fonts";
import type { SubtitleCue } from "./types";

/**
 * Word-by-word / phrase-by-phrase centre reveal — the reference reel's core
 * beat ("Every brand" -> "Starts" -> ...). Reuses the same subtitleGroups
 * shape scripts/generate-highlights.mjs already produces, so each phrase's
 * on-screen timing is the real, whisper-aligned narration timing rather than
 * a guessed cadence.
 */
export const PhraseReveal: React.FC<{
  cues: SubtitleCue[];
  width: number;
  fontSize?: number;
  color?: string;
}> = ({ cues, width, fontSize = FONT_SIZES.phrase, color = COLORS.text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = cues.find((c) => frame >= c.from && frame <= c.to);
  if (!active) {
    return null;
  }

  const local = frame - active.from;
  const pop = spring({
    frame: local,
    fps,
    durationInFrames: Math.round(TIMING.wordPopSec * fps),
    config: { damping: 14 },
  });
  const opacity = interpolate(local, [0, 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: width * 0.86,
        textAlign: "center",
        fontFamily: FONT_KO,
        fontWeight: 800,
        fontSize,
        color,
        lineHeight: 1.3,
        wordBreak: "keep-all",
        transform: `scale(${0.85 + pop * 0.15})`,
        opacity,
        // This scene has no backdrop of its own — a real-footage overlay
        // needs a dark shadow behind bare white text or it can vanish
        // against a light background plate.
        textShadow: "0 2px 14px rgba(0,0,0,0.65), 0 0 4px rgba(0,0,0,0.85)",
      }}
    >
      {active.text}
    </div>
  );
};

/**
 * A word/phrase sitting on a coloured rounded box with a small pointer
 * triangle at the bottom-right — the reference reel's "clarity" punchline
 * treatment. Used to stamp the one word that matters (e.g. "I'mma").
 */
export const HighlightWord: React.FC<{
  text: string;
  fontSize?: number;
  delayFrames?: number;
}> = ({ text, fontSize = FONT_SIZES.bigPhrase, delayFrames = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const pop = spring({
    frame: local,
    fps,
    durationInFrames: Math.round(0.5 * fps),
    config: { damping: 11 },
  });
  if (local < 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        transform: `scale(${0.6 + pop * 0.4})`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: -fontSize * 0.18,
          background: COLORS.accent,
          borderRadius: fontSize * 0.14,
          border: `${Math.max(2, fontSize * 0.02)}px solid ${COLORS.text}`,
        }}
      />
      {/* pointer triangle, bottom-right, matching the reference's speech-bubble nub */}
      <div
        style={{
          position: "absolute",
          right: fontSize * 0.1,
          bottom: -fontSize * 0.22,
          width: 0,
          height: 0,
          borderLeft: `${fontSize * 0.11}px solid transparent`,
          borderTop: `${fontSize * 0.16}px solid ${COLORS.accent}`,
        }}
      />
      <div
        style={{
          position: "relative",
          fontFamily: FONT_EN,
          fontWeight: 800,
          fontStyle: "italic",
          fontSize,
          color: COLORS.cardText,
          padding: `${fontSize * 0.06}px ${fontSize * 0.22}px`,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Tilted, drop-shadowed card — the reference reel's stacked sticky-note look. */
export const TiltedCard: React.FC<{
  children: React.ReactNode;
  rotateDeg?: number;
  background?: string;
}> = ({ children, rotateDeg = TIMING.cardTiltDeg, background = COLORS.cardBg }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.45 * fps), config: { damping: 12 } });

  return (
    <div
      style={{
        display: "inline-block",
        background,
        borderRadius: 28,
        padding: "28px 44px",
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        transform: `rotate(${rotateDeg}deg) scale(${0.7 + pop * 0.3})`,
        opacity: interpolate(pop, [0, 1], [0, 1]),
      }}
    >
      {children}
    </div>
  );
};

/**
 * Custom confused/dizzy face — the reference reel used a stock emoji sticker
 * here, which we don't have; this is a hand-drawn stand-in of the same beat
 * (spiral eyes, wavy mouth, a bobbing shake loop).
 */
export const ConfusedCharacter: React.FC<{ size?: number }> = ({ size = 220 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 10 } });
  // gentle continuous head-shake, independent of entrance
  const shake = Math.sin((frame / fps) * Math.PI * 2 * 1.4) * 4;
  const bob = Math.sin((frame / fps) * Math.PI * 2 * 1.9) * size * 0.02;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        transform: `scale(${0.5 + entrance * 0.5}) rotate(${shake}deg) translateY(${bob}px)`,
      }}
    >
      <circle cx="50" cy="50" r="42" fill={COLORS.accent} stroke={COLORS.text} strokeWidth="3" />
      {/* spiral eyes */}
      {[35, 65].map((cx) => (
        <path
          key={cx}
          d={`M ${cx} 42 m -7,0 a 7,7 0 1,0 14,0 a 4,4 0 1,0 -8,0 a 2,2 0 1,0 4,0`}
          fill="none"
          stroke={COLORS.cardText}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ))}
      {/* wavy confused mouth */}
      <path
        d="M 30 65 Q 38 58 46 65 Q 54 72 62 65 Q 70 58 78 65"
        fill="none"
        stroke={COLORS.cardText}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* sweat drop */}
      <path
        d="M 80 28 Q 86 36 80 42 Q 74 36 80 28 Z"
        fill="#7FD8FF"
        stroke={COLORS.text}
        strokeWidth="1.5"
      />
    </svg>
  );
};

/**
 * "I'm going to" visually collapsing into "I'mma" — the reveal's centrepiece.
 * Implemented as a crossfade + horizontal squash rather than literal
 * per-letter morphing (out of scope for a test scene): the long phrase
 * shrinks toward its own left edge and fades while the contraction pops in
 * with a bounce, reading as "these words got squeezed into one sound."
 */
export const CompressPhrase: React.FC<{ triggerFrame: number }> = ({ triggerFrame }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - triggerFrame;

  const squash = interpolate(local, [0, Math.round(0.5 * fps)], [1, 0.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const longOpacity = interpolate(local, [0, Math.round(0.5 * fps)], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const contractionDelay = Math.round(0.35 * fps);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div
        style={{
          fontFamily: FONT_EN,
          fontWeight: 700,
          fontSize: FONT_SIZES.bigPhrase * 0.62,
          color: COLORS.textDim,
          transform: `scaleX(${squash})`,
          transformOrigin: "center",
          opacity: longOpacity,
          whiteSpace: "nowrap",
          textShadow: "0 2px 14px rgba(0,0,0,0.65), 0 0 4px rgba(0,0,0,0.85)",
        }}
      >
        I&apos;m going to
      </div>
      <HighlightWord text="I'mma" delayFrames={triggerFrame + contractionDelay} />
    </div>
  );
};

/** Small "wrong ❌ / right ⭕" reminder banner, reference reel's chip style. */
export const AnswerKeyBanner: React.FC<{ visible: boolean }> = ({ visible }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.35 * fps), config: { damping: 13 } });
  if (!visible) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 90,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity: pop,
        transform: `translateY(${(1 - pop) * -20}px)`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: "rgba(20,20,20,0.72)",
          border: `2px solid ${COLORS.text}`,
          borderRadius: 999,
          padding: "14px 26px",
          fontFamily: FONT_EN,
          fontWeight: 700,
          fontSize: FONT_SIZES.caption,
        }}
      >
        <span style={{ color: COLORS.wrong }}>아이 엄마..? ❌</span>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>|</span>
        <span style={{ color: COLORS.right }}>I&apos;m going to ⭕</span>
      </div>
    </div>
  );
};
