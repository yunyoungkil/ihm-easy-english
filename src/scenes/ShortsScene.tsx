import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, EFFECTS, SHORTS } from "../theme";
import {
  SHORTS_COMPARE,
  SHORTS_COUNTDOWN,
  SHORTS_HANDLE,
  SHORTS_SAFE,
  SHORTS_SFX,
} from "../shortsLayout";
import { FONT_EN, FONT_KO } from "../fonts";
import { StressedWord } from "../utils/stress";
import { speechScale, useEntrance, useSpeechEmphasis } from "../utils/animation";
import type { ShortsSegment, SubtitleCue } from "../types";

/**
 * Sound effects sit under the narration rather than competing with it.
 * A callback (rather than a number) is what Remotion wants for volume.
 */
const sfxVolume = () => SHORTS_SFX.volume;

/**
 * Frame to start a sound file so its *audible* attack lands on `atFrame`.
 * Each file carries some silence before its attack; see SHORTS_SFX.leadInMs.
 */
const sfxStart = (atFrame: number, leadInMs: number, fps: number) =>
  Math.max(0, Math.round(atFrame - (leadInMs / 1000) * fps));

/** Centred content column: even margins, full width available. */
const contentBand = (width: number) => {
  const left = width * SHORTS_SAFE.sidePct;
  return { left, usable: width - left * 2 };
};

/**
 * Word size that cannot overflow the usable band.
 *
 * A 9:16 frame is narrow before the action rail is subtracted, and the base
 * ratio is tuned for short words — CELEBRATION at the base size rendered
 * ~1180px wide and lost a letter off each edge.
 */
const fitWordSize = (word: string, width: number) => {
  const base = width * SHORTS.wordSizePct;
  const fitted =
    contentBand(width).usable / (word.length * SHORTS.wordCharWidthRatio);
  return Math.min(base, fitted);
};

/** Rough rendered width of a mixed Korean/Latin string, in font-size units. */
const textWidthEm = (text: string) =>
  [...text].reduce(
    (sum, ch) =>
      sum +
      (/[가-힣]/.test(ch)
        ? SHORTS.hangulCharWidthRatio
        : SHORTS.latinCharWidthRatio),
    0,
  );

/**
 * Largest subtitle size that keeps the line inside `subtitleMaxLines`.
 *
 * Breaks are word-only (`word-break: keep-all`), so a long sentence that would
 * have been squeezed onto two rows by mid-word breaks now needs three. Shrink
 * rather than let it grow into the frame.
 */
const fitSubtitleSize = (text: string, width: number, height: number) => {
  const usable = contentBand(width).usable;
  const base = height * SHORTS.subtitleSizePct;
  const floor = height * SHORTS.subtitleMinSizePct;
  const needed = textWidthEm(text);

  for (let size = base; size > floor; size -= 1) {
    if (Math.ceil((needed * size) / usable) <= SHORTS.subtitleMaxLines) {
      return size;
    }
  }
  return floor;
};

/**
 * Shrinks text to fit a column. The compare layout splits the usable band in
 * two, so sizes tuned for a full-width word overflow here.
 *
 * `latinRatio` is for uppercase English, which is narrower than Hangul per
 * glyph; leave it off for Korean and `textWidthEm` estimates the mix.
 */
const fitToWidth = (
  text: string,
  columnWidth: number,
  base: number,
  latinRatio?: number,
) => {
  const widthEm = latinRatio ? text.length * latinRatio : textWidthEm(text);
  if (widthEm <= 0) {
    return base;
  }
  return Math.min(base, (columnWidth * 0.94) / widthEm);
};

/**
 * The Korean reading under the word, with the stressed syllable in accent
 * colour — the same colour-only convention the long-form styles use.
 */
const Pronunciation: React.FC<{
  text: string;
  stress?: string;
  fontSize: number;
}> = ({ text, stress, fontSize }) => {
  const at = stress ? text.indexOf(stress) : -1;
  const parts =
    at === -1
      ? [{ text, accent: false }]
      : [
          { text: text.slice(0, at), accent: false },
          { text: stress as string, accent: true },
          { text: text.slice(at + (stress as string).length), accent: false },
        ];

  return (
    <div style={{ fontFamily: FONT_KO, fontSize, fontWeight: 700 }}>
      {parts
        .filter((p) => p.text.length > 0)
        .map((p, i) => (
          <span
            key={i}
            style={{
              color: p.accent ? COLORS.accent : COLORS.text,
              textShadow: p.accent ? EFFECTS.accentGlow : undefined,
            }}
          >
            {p.text}
          </span>
        ))}
    </div>
  );
};

/**
 * 3 -> 2 -> 1 with a switch click on each digit.
 *
 * Starts at `startFrame`, which is the end of the narration: a number ticking
 * while the question is still being asked reads as a progress bar rather than
 * thinking time.
 */
const Countdown: React.FC<{ startFrame: number; size: number }> = ({
  startFrame,
  size,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = Math.round(SHORTS_COUNTDOWN.beatSec * fps);
  const local = frame - startFrame;

  if (local < 0 || local >= beat * SHORTS_COUNTDOWN.digits) {
    return null;
  }

  const index = Math.floor(local / beat);
  const digit = SHORTS_COUNTDOWN.digits - index;
  const inBeat = local - index * beat;

  const pop = spring({
    frame: inBeat,
    fps,
    durationInFrames: Math.max(1, Math.round(beat * 0.6)),
    config: { damping: SHORTS.countdownDamping },
  });
  const opacity = interpolate(inBeat, [0, beat * 0.15, beat * 0.8, beat], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: FONT_EN,
        fontSize: size,
        fontWeight: 900,
        color: COLORS.accent,
        textShadow: EFFECTS.accentGlow,
        transform: `scale(${0.7 + pop * 0.3})`,
        opacity,
        lineHeight: 1,
      }}
    >
      {digit}
    </div>
  );
};

/** "+TION" arriving from the right, behind the countdown. */
const SuffixSlide: React.FC<{ size: number; width: number }> = ({ size, width }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    durationInFrames: Math.max(1, Math.round(SHORTS.suffixSlideSec * fps)),
    config: { damping: 18 },
  });
  const x = interpolate(progress, [0, 1], [width * SHORTS.suffixSlideFromPct, 0]);

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        textAlign: "center",
        fontFamily: FONT_EN,
        fontSize: size,
        fontWeight: 900,
        color: COLORS.accent,
        opacity: SHORTS.suffixOpacity,
        transform: `translateX(${x}px)`,
      }}
    >
      +TION
    </div>
  );
};

/** X beside the wrong reading. Two strokes, drawn one after the other. */
const WrongMark: React.FC<{ size: number; progress: number }> = ({ size, progress }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
    {["M20 20 L80 80", "M80 20 L20 80"].map((d, i) => (
      <path
        key={i}
        d={d}
        stroke={COLORS.diff}
        strokeWidth={SHORTS_COMPARE.crossStrokeWidth}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - Math.max(0, Math.min(1, progress * 2 - i))}
      />
    ))}
  </svg>
);

/** The turn from wrong to right, dropping in with a small bounce. */
const DownTurn: React.FC<{ size: number; progress: number }> = ({ size, progress }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    style={{
      opacity: progress,
      transform: `translateY(${(1 - progress) * -size * 0.5}px)`,
    }}
  >
    <path
      d="M12 4v14M6 13l6 6 6-6"
      stroke={COLORS.accent}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * The compare beat, stacked top to bottom: what the spelling tempts you to
 * say, then the turn, then what it really is.
 *
 * Stacked rather than side by side because a 9:16 frame gives each column only
 * half of an already narrow width — the wrong reading and the real word both
 * had to shrink to fit, which is the opposite of what the beat needs.
 */
const CompareBeat: React.FC<{ segment: ShortsSegment; width: number }> = ({
  segment,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const left = segment.compareLeft;
  const right = segment.compareRight;
  if (!left || !right) {
    return null;
  }

  const band = contentBand(width);
  const at = (sec: number) => Math.round(sec * fps);

  const wrongIn = spring({
    frame: frame - at(SHORTS_COMPARE.wrongInSec),
    fps,
    durationInFrames: at(0.5),
    config: { damping: 200 },
  });
  const strike = spring({
    frame: frame - at(SHORTS_COMPARE.strikeAtSec),
    fps,
    durationInFrames: at(0.4),
    config: { damping: 200 },
  });
  const turn = spring({
    frame: frame - at(SHORTS_COMPARE.strikeAtSec),
    fps,
    durationInFrames: at(0.4),
    config: { damping: 11 }, // under-damped: it lands with a small bounce
  });
  const reveal = spring({
    frame: frame - at(SHORTS_COMPARE.revealAtSec),
    fps,
    durationInFrames: at(SHORTS_COMPARE.settleSec),
    config: { damping: 16 },
  });

  // One base size for both halves; each only shrinks if it would overflow.
  const base = width * SHORTS_COMPARE.textSizePct;
  const wrongSize = fitToWidth(left.text, band.usable * 0.82, base);
  const wordSize = fitToWidth(
    right.word,
    band.usable,
    base,
    SHORTS.wordCharWidthRatio,
  );
  const labelStyle: React.CSSProperties = {
    fontFamily: FONT_KO,
    fontSize: width * SHORTS_COMPARE.labelSizePct,
    fontWeight: 700,
    marginBottom: SHORTS_COMPARE.labelGapPx,
  };
  // Identical for both halves, so neither reads tighter than the other.
  const blockStyle: React.CSSProperties = {
    textAlign: "center",
    paddingTop: SHORTS_COMPARE.blockPadPx,
    paddingBottom: SHORTS_COMPARE.blockPadPx,
  };

  return (
    <div
      style={{
        width: band.usable,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: SHORTS_COMPARE.blockToArrowPx,
      }}
    >
      <div style={{ ...blockStyle, opacity: wrongIn }}>
        <div style={{ ...labelStyle, color: COLORS.muted }}>{left.label}</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: wrongSize * SHORTS_COMPARE.crossGapRatio,
            opacity: SHORTS_COMPARE.wrongOpacity,
          }}
        >
          <WrongMark
            size={wrongSize * SHORTS_COMPARE.crossSizeRatio}
            progress={strike}
          />
          <div
            style={{
              fontFamily: FONT_KO,
              fontSize: wrongSize,
              fontWeight: 700,
              color: COLORS.text,
              wordBreak: "keep-all",
              // Struck through only once it has been marked wrong.
              textDecoration: strike > 0.5 ? "line-through" : "none",
              textDecorationThickness: Math.max(2, wrongSize * 0.06),
            }}
          >
            {left.text}
          </div>
        </div>
      </div>

      <DownTurn size={width * SHORTS_COMPARE.arrowSizePct} progress={turn} />

      <div
        style={{
          ...blockStyle,
          opacity: reveal,
          transform: `translateY(${(1 - reveal) * width * 0.03}px)`,
        }}
      >
        <div style={{ ...labelStyle, color: COLORS.accent }}>{right.label}</div>
        <StressedWord
          word={right.word}
          stress={right.stressEn ?? segment.stressEn}
          fontSize={wordSize}
          fontFamily={FONT_EN}
          speech={segment}
        />
        <div style={{ marginTop: SHORTS_COMPARE.wordToPronPx }}>
          <Pronunciation
            text={right.pronunciation}
            stress={right.stress}
            fontSize={fitToWidth(
              right.pronunciation,
              band.usable,
              width * SHORTS_COMPARE.pronSizePct,
            )}
          />
        </div>
      </div>
    </div>
  );
};

/** A chevron nudging downward, pointing the viewer at the description link. */
const DownArrow: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Two nudges per second, easing at both ends so it bobs rather than jitters.
  const bob = Math.sin((frame / fps) * Math.PI * 2 * 1.1);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ transform: `translateY(${bob * size * 0.16}px)` }}
    >
      <path
        d="M6 9l6 6 6-6"
        stroke={COLORS.accent}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Cta: React.FC<{ text: string; width: number }> = ({ text, width }) => {
  const entrance = useEntrance(0, { staticIdle: true });
  const size = width * SHORTS.ctaSizePct;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: size * 0.4,
        ...entrance.style,
      }}
    >
      <div
        style={{
          fontFamily: FONT_KO,
          fontSize: size,
          fontWeight: 700,
          color: COLORS.background,
          background: COLORS.accent,
          padding: SHORTS.ctaPadding,
          borderRadius: 999,
        }}
      >
        {text}
      </div>
      <DownArrow size={size * 1.6} />
    </div>
  );
};

/** Narration subtitle, 20% larger than the long-form card style. */
const Subtitle: React.FC<{
  cues: SubtitleCue[];
  height: number;
  width: number;
  bottom: number;
}> = ({ cues, height, width, bottom }) => {
  const frame = useCurrentFrame();
  const hit =
    cues.find((c) => frame >= c.from && frame <= c.to) ??
    (cues.length > 0 && frame < cues[0].from ? cues[0] : null);
  if (!hit) {
    return null;
  }

  const band = contentBand(width);
  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: band.left,
        width: band.usable,
        textAlign: "center",
        fontFamily: FONT_KO,
        fontSize: fitSubtitleSize(hit.text, width, height),
        fontWeight: 700,
        color: COLORS.text,
        lineHeight: 1.35,
        // Korean breaks anywhere by default; confine breaks to spaces.
        wordBreak: "keep-all",
      }}
    >
      {hit.text}
    </div>
  );
};

/**
 * One segment of the vertical short. Deliberately its own renderer rather than
 * a variant of SceneRenderer: the long-form scene components are laid out for
 * 16:9 and are shared by calm/dynamic/reference, none of which may change.
 */
export const ShortsScene: React.FC<{
  segment: ShortsSegment;
  /** Frames of narration before the countdown may begin. */
  narrationFrames: number;
  header?: string[];
}> = ({ segment, narrationFrames, header }) => {
  const { width, height, fps } = useVideoConfig();
  const emphasis = useSpeechEmphasis(segment);
  const band = contentBand(width);

  const beat = Math.round(SHORTS_COUNTDOWN.beatSec * fps);
  // The click marks the turn: the X landing and the arrow dropping.
  const compareStrikeFrame = Math.round(SHORTS_COMPARE.strikeAtSec * fps);
  const handleBottom = height * SHORTS_SAFE.bottomPct;
  const handleSize = width * SHORTS_HANDLE.sizePct;

  // The band left between the two fixed edges: whatever the header occupies at
  // the top, and where the subtitle starts at the bottom.
  const headerLines = header?.length ?? 0;
  const headerHeight =
    headerLines === 0
      ? 0
      : width * SHORTS.headerSizePct * 1.5 +
        (headerLines - 1) * width * SHORTS.headerSubSizePct * 1.5;
  const contentTop = height * SHORTS_SAFE.topPct + headerHeight;
  const contentBottom =
    height - (handleBottom + handleSize * 2.2) - height * SHORTS.subtitleSizePct * 2.7;

  return (
    <AbsoluteFill>
      {/* Hook lines, clear of the player's top icons. */}
      {header && header.length > 0 && (
      <div
        style={{
          position: "absolute",
          top: height * SHORTS_SAFE.topPct,
          left: band.left,
          width: band.usable,
          textAlign: "center",
          fontFamily: FONT_KO,
          fontWeight: 700,
          color: COLORS.text,
          lineHeight: 1.5,
          wordBreak: "keep-all",
        }}
      >
        {header.map((line, i) => (
          <div
            key={i}
            style={{
              // The first line is the hook and carries the weight; the second
              // is the supporting example.
              fontSize:
                width *
                (i === 0 ? SHORTS.headerSizePct : SHORTS.headerSubSizePct),
              opacity: i === 0 ? 1 : 0.75,
            }}
          >
            {line}
          </div>
        ))}
      </div>
      )}

      {/* Content is centred in the room actually left over — between the
          header and the subtitle — rather than at a fixed fraction of the
          frame, which left the stack hugging the top. */}
      <div
        style={{
          position: "absolute",
          top: contentTop,
          height: contentBottom - contentTop,
          left: band.left,
          width: band.usable,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: width * 0.05,
        }}
      >
        {segment.countdown && (
          <div
            style={{
              position: "relative",
              display: "flex",
              justifyContent: "center",
              width: "100%",
              minHeight: width * SHORTS.countdownSizePct,
              alignItems: "center",
            }}
          >
            <SuffixSlide size={width * SHORTS.suffixSizePct} width={width} />
            <Countdown
              startFrame={narrationFrames}
              size={width * SHORTS.countdownSizePct}
            />
          </div>
        )}

        {segment.compareLeft && (
          <CompareBeat segment={segment} width={width} />
        )}

        {segment.word && (
          <div style={{ transform: `scale(${speechScale(emphasis)})` }}>
            <StressedWord
              word={segment.word}
              stress={segment.stressEn}
              fontSize={fitWordSize(segment.word, width)}
              fontFamily={FONT_EN}
              speech={segment}
            />
          </div>
        )}

        {segment.pronunciation && (
          <Pronunciation
            text={segment.pronunciation}
            stress={segment.stress}
            fontSize={width * SHORTS.pronunciationSizePct}
          />
        )}

        {segment.cta && <Cta text={segment.cta} width={width} />}
      </div>

      <Subtitle
        cues={segment.subtitleGroups ?? []}
        height={height}
        width={width}
        bottom={handleBottom + handleSize * 2.2}
      />

      {/* Channel handle, sitting just above the player's own bottom row. */}
      <div
        style={{
          position: "absolute",
          bottom: handleBottom,
          left: band.left,
          width: band.usable,
          textAlign: "center",
          fontFamily: FONT_KO,
          fontSize: handleSize,
          fontWeight: 700,
          color: SHORTS_HANDLE.color,
        }}
      >
        {SHORTS_HANDLE.text}
      </div>

      {/* --- sound effects, per the shared timing map --- */}
      {segment.countdown &&
        Array.from({ length: SHORTS_COUNTDOWN.digits }).map((_, i) => (
          <Sequence
            key={i}
            from={sfxStart(
              narrationFrames + i * beat,
              SHORTS_SFX.countdown.leadInMs,
              fps,
            )}
          >
            <Audio src={SHORTS_SFX.countdown.src} volume={sfxVolume} />
          </Sequence>
        ))}

      {segment.reveal && segment.highlightAt !== undefined && (
        <Sequence
          from={sfxStart(segment.highlightAt, SHORTS_SFX.reveal.leadInMs, fps)}
        >
          <Audio src={SHORTS_SFX.reveal.src} volume={sfxVolume} />
        </Sequence>
      )}

      {segment.compareLeft && (
        <Sequence
          from={sfxStart(compareStrikeFrame, SHORTS_SFX.countdown.leadInMs, fps)}
        >
          <Audio src={SHORTS_SFX.countdown.src} volume={sfxVolume} />
        </Sequence>
      )}

      {segment.cta && <Audio src={SHORTS_SFX.cta.src} volume={sfxVolume} />}
    </AbsoluteFill>
  );
};
