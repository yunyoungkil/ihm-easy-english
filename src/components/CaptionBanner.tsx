import React from "react";
import { COLORS, FONT_SIZES, LAYOUT, SPACING } from "../theme";
import { FONT_KO } from "../fonts";
import { useEntrance } from "../utils/animation";

export const CaptionBanner: React.FC<{ caption: string }> = ({ caption }) => {
  // The banner is a fixed bar at the bottom edge; drifting text inside it
  // reads as a glitch rather than as motion design.
  const entrance = useEntrance(0, { staticIdle: true });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: LAYOUT.height * SPACING.bannerHeightPct,
        backgroundColor: COLORS.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingLeft: LAYOUT.width * SPACING.bannerSideMarginPct,
        paddingRight: LAYOUT.width * SPACING.bannerSideMarginPct,
        ...entrance.style,
      }}
    >
      <span
        style={{
          fontFamily: FONT_KO,
          fontWeight: 900,
          fontSize: FONT_SIZES.caption,
          color: "#000000",
          textAlign: "center",
        }}
      >
        {caption}
      </span>
    </div>
  );
};
