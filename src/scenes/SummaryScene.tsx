import React from "react";
import { useVideoConfig } from "remotion";
import { ANIMATION, COLORS, FONT_SIZES, SPACING } from "../theme";
import { FONT_KO } from "../fonts";
import { useEntrance, useEntranceTiming } from "../utils/animation";
import { CheckIcon } from "../components/icons";

const SummaryItem: React.FC<{ text: string; index: number; fontSize: number }> = ({
  text,
  index,
  fontSize,
}) => {
  const entrance = useEntrance(index, { staggerSec: ANIMATION.summaryStaggerSec });
  const { delayFrames } = useEntranceTiming(index, ANIMATION.summaryStaggerSec);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: fontSize * SPACING.summaryItemGapRatio,
        ...entrance.style,
      }}
    >
      <CheckIcon
        size={fontSize * FONT_SIZES.summaryCheckIconRatio}
        color={COLORS.accent}
        drawDelayFrames={delayFrames}
      />
      <span style={{ fontFamily: FONT_KO, fontWeight: 700, fontSize, color: COLORS.text }}>
        {text}
      </span>
    </div>
  );
};

export const SummaryScene: React.FC<{ items: string[]; caption: string }> = ({
  items,
  caption,
}) => {
  const { width, height } = useVideoConfig();
  const labelEntrance = useEntrance(0);
  const itemFontSize = height * FONT_SIZES.summaryItem;
  const closingFontSize = height * FONT_SIZES.summaryClosing;
  const closingEntrance = useEntrance(items.length, {
    staggerSec: ANIMATION.summaryStaggerSec,
  });

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: height * SPACING.summaryOuterGapPct,
      }}
    >
      <div
        style={{
          border: `${SPACING.summaryBorderWidth}px solid ${COLORS.pointBorder}`,
          borderRadius: SPACING.summaryBorderRadius,
          padding: `${height * SPACING.summaryPaddingYPct}px ${width * SPACING.summaryPaddingXPct}px`,
          display: "flex",
          flexDirection: "column",
          gap: height * SPACING.summaryInnerGapPct,
          minWidth: width * SPACING.summaryMinWidthPct,
        }}
      >
        <span
          style={{
            alignSelf: "flex-start",
            fontFamily: FONT_KO,
            fontWeight: 900,
            fontSize: height * FONT_SIZES.summaryLabel,
            color: COLORS.pointBorder,
            ...labelEntrance.style,
          }}
        >
          오늘의 정리
        </span>
        {items.map((item, i) => (
          <SummaryItem key={item} text={item} index={i} fontSize={itemFontSize} />
        ))}
      </div>
      <div
        style={{
          fontFamily: FONT_KO,
          fontWeight: 900,
          fontSize: closingFontSize,
          color: COLORS.exampleBorder,
          textAlign: "center",
          ...closingEntrance.style,
        }}
      >
        {caption}
      </div>
    </div>
  );
};
