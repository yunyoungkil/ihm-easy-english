import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { Word } from "../types";
import { ANIMATION, COLORS, FONT_SIZES, SPACING } from "../theme";
import { FONT_EN, FONT_KO } from "../fonts";
import { CompareWord } from "../utils/stress";
import {
  highlightOpacity,
  useEntrance,
  useEntranceAtFrame,
  useEntranceTiming,
  useHighlightStates,
  useTravelTransform,
  type HighlightState,
} from "../utils/animation";

// A horizontal arrow that "draws itself" via strokeDashoffset, appearing
// only once its delay has passed rather than fading in as a whole glyph.
const AnimatedArrow: React.FC<{ delayFrames: number; width: number; height: number }> = ({
  delayFrames,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drawDurationFrames = Math.round(ANIMATION.compareArrowDrawSec * fps);
  const progress = interpolate(frame - delayFrames, [0, drawDurationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const strokeWidth = height * 0.18;
  const dashOffset = width * (1 - progress);
  const headOpacity = interpolate(progress, [0.7, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <line
        x1={0}
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke={COLORS.accent}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={width}
        strokeDashoffset={dashOffset}
      />
      <polygon
        points={`${width},${height / 2} ${width - strokeWidth * 1.8},${height / 2 - strokeWidth * 1.3} ${width - strokeWidth * 1.8},${height / 2 + strokeWidth * 1.3}`}
        fill={COLORS.accent}
        opacity={headOpacity}
      />
    </svg>
  );
};

/**
 * The "vs" gutter. Given the same box height as the words' line box and
 * aligned to the top of the row, its centred glyph lands on exactly the same
 * vertical centre line as the English words — the word columns are taller
 * than the words themselves because of the pronunciation label underneath.
 */
const VsGutter: React.FC<{ wordFontSize: number; gutterWidth: number }> = ({
  wordFontSize,
  gutterWidth,
}) => (
  <div
    style={{
      width: gutterWidth,
      height: wordFontSize * SPACING.compareWordLineHeight,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT_EN,
      fontWeight: 900,
      fontSize: wordFontSize * FONT_SIZES.compareVsRatio,
      color: COLORS.muted,
    }}
  >
    vs
  </div>
);

const PairRow: React.FC<{
  left: Word;
  right: Word;
  rowIndex: number;
  fontSize: number;
  leftState?: HighlightState;
  rightState?: HighlightState;
}> = ({ left, right, rowIndex, fontSize, leftState, rightState }) => {
  const { fps } = useVideoConfig();
  const { delayFrames: rowDelay, durationFrames } = useEntranceTiming(rowIndex);

  // Left word appears -> a beat later the arrow draws itself -> then the
  // right word appears, instead of all three fading in together.
  const leftDelay = rowDelay;
  const leftEnd = leftDelay + durationFrames;
  const arrowDelay = leftEnd + Math.round(ANIMATION.compareArrowDelaySec * fps);
  const arrowEnd = arrowDelay + Math.round(ANIMATION.compareArrowDrawSec * fps);
  const rightDelay = arrowEnd;
  const rightEnd = rightDelay + durationFrames;

  const leftEntrance = useEntranceAtFrame(leftDelay, { index: rowIndex });
  const rightEntrance = useEntranceAtFrame(rightDelay, { index: rowIndex + 1 });
  // The row roams as one unit so the two words keep their exact spacing
  // around the arrow no matter where the row drifts to.
  const rowTravel = useTravelTransform(rowIndex, "compareRow");

  const arrowWidth = fontSize * SPACING.compareArrowWidthRatio;
  const arrowHeight = fontSize * SPACING.compareArrowHeightRatio;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: fontSize * SPACING.comparePairGapRatio,
        transform: rowTravel,
      }}
    >
      <div
        style={{
          ...leftEntrance.style,
          opacity: leftEntrance.opacity * highlightOpacity(leftState),
        }}
      >
        <CompareWord
          word={left.word}
          highlightPart={left.highlightPart}
          causeChar={left.causeChar}
          sound={left.sound ?? left.pronunciation}
          fontSize={fontSize}
          fontFamily={FONT_EN}
          fadeHighlight
          colorFadeDelayFrames={leftDelay}
          pulseDelayFrames={leftEnd}
          speech={left}
        />
      </div>
      <AnimatedArrow delayFrames={arrowDelay} width={arrowWidth} height={arrowHeight} />
      <div
        style={{
          ...rightEntrance.style,
          opacity: rightEntrance.opacity * highlightOpacity(rightState),
        }}
      >
        <CompareWord
          word={right.word}
          highlightPart={right.highlightPart}
          causeChar={right.causeChar}
          sound={right.sound ?? right.pronunciation}
          fontSize={fontSize}
          fontFamily={FONT_EN}
          fadeHighlight
          colorFadeDelayFrames={rightDelay}
          pulseDelayFrames={rightEnd}
          speech={right}
        />
      </div>
    </div>
  );
};

const SoundWordBlock: React.FC<{
  word: Word;
  index: number;
  fontSize: number;
  state?: HighlightState;
}> = ({ word, index, fontSize, state }) => {
  const entrance = useEntrance(index, { travel: "compare" });
  const { endFrames } = useEntranceTiming(index);

  return (
    <div
      style={{
        ...entrance.style,
        opacity: entrance.opacity * highlightOpacity(state),
      }}
    >
      <CompareWord
        word={word.word}
        highlightPart={word.highlightPart}
        causeChar={word.causeChar}
        sound={word.sound ?? word.pronunciation}
        fontSize={fontSize}
        fontFamily={FONT_EN}
        pulseDelayFrames={endFrames}
        speech={word}
      />
    </div>
  );
};

export const CompareScene: React.FC<{ words: Word[]; content?: string }> = ({ words, content }) => {
  const { width, height } = useVideoConfig();
  const highlightStates = useHighlightStates(words);
  const isSoundMode = words.some((word) => word.sound);

  if (isSoundMode) {
    const [left, right] = words;
    const wordFontSize = height * FONT_SIZES.compareSoundWord;

    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: height * SPACING.compareRowGapPct,
        }}
      >
        {content && (
          <div
            style={{
              fontFamily: FONT_KO,
              fontWeight: 700,
              fontSize: height * FONT_SIZES.compareSoundContent,
              color: COLORS.accent,
            }}
          >
            {content}
          </div>
        )}
        {/* No divider line: the "vs" gutter alone separates the two sides.
            Both columns flex:1 around a fixed-width gutter, which puts "vs"
            at the exact horizontal centre. Aligning to flex-start lets the
            gutter match the words' line box for vertical centring. */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
            {left && (
              <SoundWordBlock
                word={left}
                index={0}
                fontSize={wordFontSize}
                state={highlightStates[0]}
              />
            )}
          </div>
          <VsGutter
            wordFontSize={wordFontSize}
            gutterWidth={width * SPACING.compareVsGutterPct}
          />
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
            {right && (
              <SoundWordBlock
                word={right}
                index={1}
                fontSize={wordFontSize}
                state={highlightStates[1]}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  const pairs: Array<[Word, Word, number]> = [];
  for (let i = 0; i + 1 < words.length; i += 2) {
    pairs.push([words[i], words[i + 1], i]);
  }
  const fontSize = height * FONT_SIZES.compareStressWord;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: height * SPACING.compareRowGapPct,
      }}
    >
      {pairs.map(([left, right, wordIndex], i) => (
        <PairRow
          key={`${left.word}-${right.word}`}
          left={left}
          right={right}
          rowIndex={i}
          fontSize={fontSize}
          leftState={highlightStates[wordIndex]}
          rightState={highlightStates[wordIndex + 1]}
        />
      ))}
    </div>
  );
};
