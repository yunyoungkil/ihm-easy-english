import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "../types";
import { REFERENCE } from "../theme";
import { FONT_EN, FONT_KO } from "../fonts";
import {
  ArrowGlyph,
  BookGlyph,
  CheckGlyph,
  LightbulbGlyph,
  QuestionGlyph,
} from "../components/icons";
import {
  speechScale,
  useEntrance,
  useSpeechEmphasis,
} from "../utils/animation";
import { mixHexColors } from "../utils/color";
import { getActiveWordIndex, toReferenceContent } from "../utils/referenceMapping";
import type { WatermarkShape } from "../utils/sceneKind";

const GLYPHS: Record<WatermarkShape, typeof LightbulbGlyph> = {
  question: QuestionGlyph,
  book: BookGlyph,
  bulb: LightbulbGlyph,
  arrow: ArrowGlyph,
  check: CheckGlyph,
};

/** Positions an element on the measured centre line of its band. */
const Band: React.FC<{ centrePct: number; children: React.ReactNode; style?: React.CSSProperties }> = ({
  centrePct,
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      top: `${centrePct * 100}%`,
      left: 0,
      right: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: "translateY(-50%)",
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * The mark. In the source it is simply present from the first frame and
 * settles ~5% smaller over ~0.8s — no spin, no colour change — so that is all
 * this reproduces. The glyph itself is one of the channel's own icons rather
 * than the reference's brand mark.
 */
const ReferenceIcon: React.FC<{ shape: WatermarkShape; size: number }> = ({ shape, size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Glyph = GLYPHS[shape];

  const settle = interpolate(
    frame,
    [0, REFERENCE.iconSettleSec * fps],
    [REFERENCE.iconSettleFrom, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <div style={{ transform: `scale(${settle})` }}>
      <Glyph size={size} color={REFERENCE.accent} strokeWidth={1.7} />
    </div>
  );
};

/**
 * Shrinks the headline until its estimated wrapped height fits the band.
 * A measurement-free estimate is enough here: it only has to prevent the
 * block from growing upward into the mark.
 */
const fitFontSize = (text: string, baseSize: number, maxWidth: number, maxHeight: number) => {
  const emPerChar = /[가-힣]/.test(text) ? 1.02 : 0.62;
  let size = baseSize;
  for (let i = 0; i < 30; i++) {
    const perLine = Math.max(1, Math.floor(maxWidth / (size * emPerChar)));
    const lines = Math.max(1, Math.ceil(text.length / perLine));
    if (lines * REFERENCE.headlineLineHeight * size <= maxHeight) {
      break;
    }
    size *= 0.94;
  }
  return size;
};

const Headline: React.FC<{ scene: Scene; fontSize: number }> = ({ scene, fontSize }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const content = toReferenceContent(scene);
  const entrance = useEntrance(2);

  const activeIndex = getActiveWordIndex(content.words, frame);
  const activeWord = content.words[activeIndex];
  // Narration sync: the headline warms to the accent and grows for exactly as
  // long as the word is being spoken (same envelope the other styles use).
  const emphasis = useSpeechEmphasis(activeWord);
  const text = activeWord?.word ?? content.headlineText ?? "";
  const isKorean = /[가-힣]/.test(text);

  const fitted = Math.max(
    height * REFERENCE.headlineMinSizePct,
    fitFontSize(
      text,
      fontSize,
      width * REFERENCE.contentMaxWidthPct,
      height * REFERENCE.headlineMaxHeightPct,
    ),
  );

  return (
    <span
      style={{
        display: "inline-block",
        maxWidth: `${REFERENCE.contentMaxWidthPct * 100}%`,
        fontFamily: isKorean ? FONT_KO : FONT_EN,
        fontSize: fitted,
        fontWeight: 700,
        letterSpacing: REFERENCE.headlineLetterSpacing,
        lineHeight: REFERENCE.headlineLineHeight,
        textAlign: "center",
        color: mixHexColors(REFERENCE.headline, REFERENCE.accent, emphasis),
        opacity: entrance.opacity,
        transform: `${entrance.transform} scale(${speechScale(emphasis)})`,
      }}
    >
      {text}
    </span>
  );
};

/**
 * `reference` motion style: a self-contained recreation of the reference
 * video's card. It deliberately shares no chrome with the channel styles —
 * no gradient background, no corner badge, no caption banner — so calm and
 * dynamic are unaffected by anything in here.
 */
export const ReferenceScene: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, height, durationInFrames } = useVideoConfig();
  const content = toReferenceContent(scene);

  const iconEntrance = useEntrance(0);
  const eyebrowEntrance = useEntrance(1);
  const captionEntrance = useEntrance(3);

  // Long, scale-free cross-fade: the source has no hard cuts at all.
  const transitionFrames = Math.round(REFERENCE.transitionSec * fps);
  const sceneOpacity = Math.min(
    interpolate(frame, [0, transitionFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [durationInFrames - transitionFrames, durationInFrames], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  return (
    <AbsoluteFill style={{ backgroundColor: REFERENCE.background, opacity: sceneOpacity }}>
      <Band centrePct={REFERENCE.iconCentrePct} style={iconEntrance.style}>
        <ReferenceIcon shape={content.icon} size={height * REFERENCE.iconSizePct} />
      </Band>

      <Band centrePct={REFERENCE.eyebrowCentrePct} style={eyebrowEntrance.style}>
        <span
          style={{
            fontFamily: FONT_KO,
            fontSize: height * REFERENCE.eyebrowSizePct,
            fontWeight: 700,
            letterSpacing: REFERENCE.eyebrowLetterSpacing,
            color: REFERENCE.eyebrow,
          }}
        >
          {content.eyebrow}
        </span>
      </Band>

      {/* Top-anchored rather than centred: a single-line headline still sits
          on the measured centre line, while a wrapped one extends downward
          into empty space instead of colliding with the mark. */}
      <div
        style={{
          position: "absolute",
          top:
            height * REFERENCE.headlineCentrePct -
            (height * REFERENCE.headlineSizePct * REFERENCE.headlineLineHeight) / 2,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <Headline scene={scene} fontSize={height * REFERENCE.headlineSizePct} />
      </div>

      <Band centrePct={REFERENCE.captionCentrePct} style={captionEntrance.style}>
        <span
          style={{
            maxWidth: `${REFERENCE.contentMaxWidthPct * 100}%`,
            fontFamily: FONT_KO,
            fontSize: height * REFERENCE.captionSizePct,
            fontWeight: 500,
            textAlign: "center",
            color: REFERENCE.caption,
          }}
        >
          {content.caption}
        </span>
      </Band>
    </AbsoluteFill>
  );
};
