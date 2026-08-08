import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { COLORS, EFFECTS, FONT_SIZES, SPACING } from "../theme";
import {
  speechScale,
  useEntranceTiming,
  useSpeechEmphasis,
  useStressPulse,
  useStressShimmer,
  type SpeechWindow,
} from "./animation";
import { mixHexColors } from "./color";

export const splitByStress = (word: string, stress?: string) => {
  if (!stress) {
    return { before: word, stress: "", after: "" };
  }
  const idx = word.indexOf(stress);
  if (idx === -1) {
    return { before: word, stress: "", after: "" };
  }
  return {
    before: word.slice(0, idx),
    stress: word.slice(idx, idx + stress.length),
    after: word.slice(idx + stress.length),
  };
};

export const StressedWord: React.FC<{
  word: string;
  stress?: string;
  fontSize: number;
  fontFamily: string;
  index?: number;
  staggerSec?: number;
  pulseDelayFrames?: number;
  pulseScale?: number;
  pulseDurationSec?: number;
  pulseCount?: number;
  /** Narration window; drives the spoken-word emphasis. */
  speech?: SpeechWindow;
}> = ({
  word,
  stress,
  fontSize,
  fontFamily,
  index = 0,
  staggerSec,
  pulseDelayFrames,
  pulseScale,
  pulseDurationSec,
  pulseCount,
  speech,
}) => {
  const timing = useEntranceTiming(index, staggerSec);
  const resolvedPulseDelay = pulseDelayFrames ?? timing.endFrames;

  const pulse = useStressPulse(resolvedPulseDelay, {
    scale: pulseScale,
    durationSec: pulseDurationSec,
    count: pulseCount,
  });
  const shimmer = useStressShimmer(resolvedPulseDelay);
  const emphasis = useSpeechEmphasis(speech);

  const { before, stress: stressPart, after } = splitByStress(word, stress);
  // While spoken the whole word warms to yellow; on release it returns to
  // each part's base colour, so the stress syllable stays yellow and the
  // rest goes back to white.
  const bodyColor = mixHexColors(COLORS.text, COLORS.accent, emphasis);

  return (
    <span
      style={{
        display: "inline-block",
        fontFamily,
        fontSize,
        fontWeight: 900,
        color: bodyColor,
        whiteSpace: "nowrap",
        transform: `scale(${speechScale(emphasis)})`,
      }}
    >
      {before}
      {stressPart && (
        <span
          style={{
            display: "inline-block",
            color: COLORS.accent,
            textShadow: EFFECTS.accentGlow,
            opacity: shimmer,
            transform: `scale(${pulse})`,
          }}
        >
          {stressPart}
        </span>
      )}
      {after}
    </span>
  );
};

type CompareSegmentColor = "text" | "accent" | "diff";
type CompareSegment = { text: string; color: CompareSegmentColor };

// Splits a word into colored runs: `causeChar` (red) wins wherever it
// occurs, `highlightPart` (yellow) covers its own span, everything else is
// plain text color. Adjacent same-color characters are merged into one span.
export const buildCompareSegments = (
  word: string,
  highlightPart?: string,
  causeChar?: string,
): CompareSegment[] => {
  const highlightStart = highlightPart ? word.indexOf(highlightPart) : -1;
  const highlightEnd = highlightStart >= 0 ? highlightStart + highlightPart!.length : -1;
  const causeIndex = causeChar ? word.indexOf(causeChar) : -1;

  const segments: CompareSegment[] = [];
  for (let i = 0; i < word.length; i++) {
    const isCause = i === causeIndex;
    const isHighlight = highlightStart >= 0 && i >= highlightStart && i < highlightEnd;
    const color: CompareSegmentColor = isCause ? "diff" : isHighlight ? "accent" : "text";

    const last = segments[segments.length - 1];
    if (last && last.color === color) {
      last.text += word[i];
    } else {
      segments.push({ text: word[i], color });
    }
  }
  return segments;
};

export const CompareWord: React.FC<{
  word: string;
  highlightPart?: string;
  causeChar?: string;
  sound?: string;
  fontSize: number;
  fontFamily: string;
  fadeHighlight?: boolean;
  colorFadeDelayFrames?: number;
  pulseDelayFrames?: number;
  pulseScale?: number;
  pulseDurationSec?: number;
  pulseCount?: number;
  /** Narration window; drives the spoken-word emphasis. */
  speech?: SpeechWindow;
}> = ({
  word,
  highlightPart,
  causeChar,
  sound,
  fontSize,
  fontFamily,
  fadeHighlight = false,
  colorFadeDelayFrames = 0,
  pulseDelayFrames = Number.POSITIVE_INFINITY,
  pulseScale,
  pulseDurationSec,
  pulseCount,
  speech,
}) => {
  const frame = useCurrentFrame();
  const { durationFrames: colorFadeDurationFrames } = useEntranceTiming(0);

  const pulse = useStressPulse(pulseDelayFrames, {
    scale: pulseScale,
    durationSec: pulseDurationSec,
    count: pulseCount,
  });
  const shimmer = useStressShimmer(pulseDelayFrames);
  const emphasis = useSpeechEmphasis(speech);

  const colorProgress = interpolate(
    frame - colorFadeDelayFrames,
    [0, colorFadeDurationFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const highlightColor = fadeHighlight
    ? mixHexColors(COLORS.text, COLORS.accent, colorProgress)
    : COLORS.accent;

  const segments = buildCompareSegments(word, highlightPart, causeChar);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Explicit line height so CompareScene's "vs" gutter can be given the
          exact same box height and share this word's vertical centre line. */}
      <span
        style={{
          display: "inline-block",
          fontFamily,
          fontSize,
          lineHeight: SPACING.compareWordLineHeight,
          fontWeight: 900,
          whiteSpace: "nowrap",
          transform: `scale(${speechScale(emphasis)})`,
        }}
      >
        {segments.map((segment, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              // The red cause char keeps its meaning-bearing colour; plain
              // text warms toward yellow only while the word is spoken.
              color:
                segment.color === "diff"
                  ? COLORS.diff
                  : segment.color === "accent"
                    ? highlightColor
                    : mixHexColors(COLORS.text, COLORS.accent, emphasis),
              textShadow: segment.color === "accent" ? EFFECTS.accentGlow : undefined,
              opacity: segment.color === "accent" ? shimmer : undefined,
              transform: segment.color === "accent" ? `scale(${pulse})` : undefined,
            }}
          >
            {segment.text}
          </span>
        ))}
      </span>
      {sound && (
        <span
          style={{
            marginTop: fontSize * SPACING.soundLabelMarginTopRatio,
            fontFamily,
            fontWeight: 700,
            fontSize: fontSize * FONT_SIZES.soundAnnotationRatio,
            color: causeChar ? COLORS.diff : COLORS.accent,
          }}
        >
          {sound}
        </span>
      )}
    </div>
  );
};
