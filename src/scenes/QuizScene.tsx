import React from "react";
import { useVideoConfig } from "remotion";
import type { Word } from "../types";
import { ANIMATION, COLORS, FONT_SIZES, SPACING } from "../theme";
import { FONT_EN, FONT_KO } from "../fonts";
import { StressedWord } from "../utils/stress";
import {
  highlightOpacity,
  useEntranceAtFrame,
  useEntranceTiming,
  useHighlightStates,
  type HighlightState,
} from "../utils/animation";

const QuizWord: React.FC<{
  word: Word;
  delayFrames: number;
  index: number;
  wordFontSize: number;
  pronFontSize: number;
  pulseCount?: number;
  state?: HighlightState;
}> = ({ word, delayFrames, index, wordFontSize, pronFontSize, pulseCount, state }) => {
  const entrance = useEntranceAtFrame(delayFrames, { index, travel: "default" });
  const { durationFrames } = useEntranceTiming(0);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        ...entrance.style,
        opacity: entrance.opacity * highlightOpacity(state),
      }}
    >
      <StressedWord
        word={word.word}
        stress={word.stress}
        fontSize={wordFontSize}
        fontFamily={FONT_EN}
        pulseDelayFrames={delayFrames + durationFrames}
        pulseCount={pulseCount}
        speech={word}
      />
      {word.pronunciation && (
        <div
          style={{
            marginTop: wordFontSize * SPACING.quizPronunciationMarginTopRatio,
            fontFamily: FONT_KO,
            fontWeight: 700,
            fontSize: pronFontSize,
            color: COLORS.accent,
          }}
        >
          {word.pronunciation}
        </div>
      )}
    </div>
  );
};

const QuizArrow: React.FC<{ delayFrames: number; size: number }> = ({ delayFrames, size }) => {
  const entrance = useEntranceAtFrame(delayFrames);
  return (
    <div style={{ color: COLORS.accent, fontSize: size, lineHeight: 1, ...entrance.style }}>↓</div>
  );
};

export const QuizScene: React.FC<{ words: Word[] }> = ({ words }) => {
  const { height, fps } = useVideoConfig();
  const highlightStates = useHighlightStates(words);
  const { durationFrames } = useEntranceTiming(0);

  const wordFontSize = height * FONT_SIZES.quizWord;
  const pronFontSize = height * FONT_SIZES.quizPronunciation;
  const arrowSize = height * FONT_SIZES.quizArrow;

  // Word 1 appears, holds on screen, then the arrow draws attention down to
  // word 2 -- rather than everything fading in together.
  const word1Delay = 0;
  const arrowDelay = word1Delay + durationFrames + Math.round(ANIMATION.quizHoldSec * fps);
  const word2Delay = arrowDelay + durationFrames;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: wordFontSize * SPACING.quizGapRatio,
      }}
    >
      {words[0] && (
        <QuizWord
          word={words[0]}
          delayFrames={word1Delay}
          index={0}
          wordFontSize={wordFontSize}
          pronFontSize={pronFontSize}
          state={highlightStates[0]}
        />
      )}
      {words[1] && (
        <>
          <QuizArrow delayFrames={arrowDelay} size={arrowSize} />
          <QuizWord
            word={words[1]}
            delayFrames={word2Delay}
            index={1}
            wordFontSize={wordFontSize}
            pronFontSize={pronFontSize}
            pulseCount={ANIMATION.quizSecondWordPulseCount}
            state={highlightStates[1]}
          />
        </>
      )}
    </div>
  );
};
