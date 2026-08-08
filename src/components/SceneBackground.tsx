import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMATION, COLORS } from "../theme";

/**
 * Composition-level backdrop: a soft radial gradient whose centre drifts on a
 * slow 20s orbit. Living outside the scene <Series> means it stays continuous
 * across cuts, which is what lets each scene's fade read as a crossfade.
 */
export const SceneBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const periodFrames = ANIMATION.backgroundGradientPeriodSec * fps;
  const angle = (frame / periodFrames) * Math.PI * 2;
  const gradientX = 50 + Math.cos(angle) * ANIMATION.backgroundGradientSwingPct;
  const gradientY = 50 + Math.sin(angle) * ANIMATION.backgroundGradientSwingPct;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${gradientX}% ${gradientY}%, ${COLORS.backgroundCenter} 0%, ${COLORS.background} 65%)`,
      }}
    />
  );
};
