import React from "react";
import { useVideoConfig } from "remotion";
import { COLORS, FONT_SIZES, SPACING } from "../theme";
import { FONT_KO } from "../fonts";
import { useEntrance } from "../utils/animation";
import { LightbulbIcon } from "../components/icons";
import { RuleText } from "../utils/highlight";

export const RuleBoxScene: React.FC<{ content?: string }> = ({ content }) => {
  const { width, height } = useVideoConfig();
  const boxEntrance = useEntrance(0);
  const labelEntrance = useEntrance(1);
  const fontSize = height * FONT_SIZES.ruleBoxText;

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          position: "relative",
          maxWidth: width * SPACING.ruleBoxMaxWidthPct,
          border: `${SPACING.ruleBoxBorderWidth}px solid ${COLORS.pointBorder}`,
          borderRadius: SPACING.ruleBoxBorderRadius,
          padding: `${height * SPACING.ruleBoxPaddingYPct}px ${width * SPACING.ruleBoxPaddingXPct}px`,
          textAlign: "center",
          ...boxEntrance.style,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -height * SPACING.ruleBoxLabelTopOffsetPct,
            left: width * SPACING.ruleBoxLabelLeftOffsetPct,
            display: "flex",
            alignItems: "center",
            gap: SPACING.ruleBoxLabelGap,
            backgroundColor: COLORS.pointBorder,
            borderRadius: SPACING.pillBorderRadius,
            padding: SPACING.ruleBoxLabelPadding,
            opacity: labelEntrance.opacity,
            transform: `rotate(${SPACING.ruleBoxLabelRotationDeg}deg) ${labelEntrance.transform}`,
          }}
        >
          <LightbulbIcon size={height * FONT_SIZES.ruleBoxIcon} color={COLORS.text} />
          <span
            style={{
              fontFamily: FONT_KO,
              fontWeight: 900,
              color: COLORS.text,
              fontSize: height * FONT_SIZES.ruleBoxLabel,
            }}
          >
            오늘의 포인트
          </span>
        </div>
        {content && <RuleText text={content} fontSize={fontSize} fontFamily={FONT_KO} />}
      </div>
    </div>
  );
};
