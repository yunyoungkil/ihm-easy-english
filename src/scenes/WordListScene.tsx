import React from "react";
import { useVideoConfig } from "remotion";
import type { Word } from "../types";
import { ANIMATION, COLORS, FONT_SIZES, SPACING } from "../theme";
import { FONT_EN, FONT_KO } from "../fonts";
import { StressedWord } from "../utils/stress";
import {
  highlightOpacity,
  highlightScale,
  useEntrance,
  useHighlightStates,
  type HighlightState,
} from "../utils/animation";
import { mixHexColors } from "../utils/color";
import { BookIcon } from "../components/icons";

const WordRow: React.FC<{
  word: Word;
  index: number;
  boxHeight: number;
  state?: HighlightState;
}> = ({ word, index, boxHeight, state }) => {
  // The word rows are a read-along table: the box, its border and the book
  // icon stay put so the eye can track down the list. All the motion here
  // comes from the narration highlight instead.
  const entrance = useEntrance(index, {
    staggerSec: ANIMATION.wordListStaggerSec,
    staticIdle: true,
  });
  const wordFontSize = boxHeight * FONT_SIZES.wordListWord;
  const pronFontSize = boxHeight * FONT_SIZES.wordListPronunciation;
  const meaningFontSize = boxHeight * FONT_SIZES.wordListMeaning;

  // While the narration says this word the row lifts slightly and its border
  // warms from green to yellow; rows for other words dim instead. With no
  // timestamps every row sits neutral: full opacity, green border, no scale.
  const activeness = state?.activeness ?? 0;
  const borderColor = mixHexColors(COLORS.exampleBorder, COLORS.accent, activeness);
  const iconColor = borderColor;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: boxHeight * SPACING.wordListInnerGapPct,
        height: boxHeight,
        padding: `0 ${boxHeight * SPACING.wordListPaddingXPct}px`,
        border: `${SPACING.wordListBorderWidth}px solid ${borderColor}`,
        borderRadius: boxHeight * SPACING.wordListBorderRadiusPct,
        opacity: entrance.opacity * highlightOpacity(state),
        transform: `${entrance.transform} scale(${highlightScale(state)})`,
      }}
    >
      <BookIcon size={boxHeight * SPACING.wordListIconSizePct} color={iconColor} />
      <StressedWord
        word={word.word}
        stress={word.stress}
        fontSize={wordFontSize}
        fontFamily={FONT_EN}
        index={index}
        staggerSec={ANIMATION.wordListStaggerSec}
        speech={word}
      />
      <div style={{ flex: 1 }} />
      {word.pronunciation && (
        <span
          style={{
            fontFamily: FONT_KO,
            fontWeight: 700,
            fontSize: pronFontSize,
            color: COLORS.accent,
          }}
        >
          {word.pronunciation}
        </span>
      )}
      {word.meaning && (
        <span
          style={{
            fontFamily: FONT_KO,
            fontWeight: 700,
            fontSize: meaningFontSize,
            color: COLORS.muted,
            minWidth: boxHeight * SPACING.wordListMeaningMinWidthRatio,
            textAlign: "right",
          }}
        >
          {word.meaning}
        </span>
      )}
    </div>
  );
};

export const WordListScene: React.FC<{ words: Word[] }> = ({ words }) => {
  const { height } = useVideoConfig();
  const highlightStates = useHighlightStates(words);
  const boxHeight = height * SPACING.wordListBoxHeightPct;
  const gap = height * SPACING.wordListGapPct;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap,
      }}
    >
      {words.map((word, i) => (
        <WordRow
          key={word.word}
          word={word}
          index={i}
          boxHeight={boxHeight}
          state={highlightStates[i]}
        />
      ))}
    </div>
  );
};
