import React from "react";
import { COLORS, FONT_SIZES, SPACING } from "../theme";
import { FONT_KO } from "../fonts";
import { useEntrance } from "../utils/animation";

export const TopBadge: React.FC = () => {
  // Fixed channel furniture: it appears once and then never moves, even in
  // `dynamic` where most elements keep drifting.
  const entrance = useEntrance(0, { staticIdle: true });

  return (
    <div
      style={{
        position: "absolute",
        top: SPACING.badgeTopOffset,
        left: 0,
        transformOrigin: "top left",
        ...entrance.style,
      }}
    >
      <div
        style={{
          position: "relative",
          backgroundColor: "#000000",
          padding: SPACING.badgePadding,
          clipPath: "polygon(0 0, 100% 0, 100% 62%, 86% 100%, 0 100%)",
        }}
      >
        <span
          style={{
            fontFamily: FONT_KO,
            fontWeight: 900,
            fontSize: FONT_SIZES.badge,
            color: COLORS.text,
            letterSpacing: FONT_SIZES.badgeLetterSpacing,
          }}
        >
          이해하면 쉬운영어
        </span>
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: SPACING.badgeCornerSize,
            height: SPACING.badgeCornerSize,
            backgroundColor: COLORS.exampleBorder,
            clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
          }}
        />
      </div>
    </div>
  );
};
