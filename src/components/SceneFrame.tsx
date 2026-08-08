import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMATION, LAYOUT, SPACING } from "../theme";
import { CaptionBanner } from "./CaptionBanner";

/**
 * Per-scene frame. Deliberately has no opaque background of its own: the
 * gradient and the channel badge live at the composition level, so a scene
 * can fade its own content in over them and read as a crossfade rather than
 * a dip to black.
 */
export const SceneFrame: React.FC<{
  caption: string;
  children: React.ReactNode;
  /** dynamic-only decorations; null in calm. */
  watermark?: React.ReactNode;
  badge?: React.ReactNode;
}> = ({ caption, children, watermark = null, badge = null }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const paddingX = LAYOUT.width * SPACING.contentPaddingPct;
  const paddingY = LAYOUT.height * SPACING.contentPaddingPct;
  const bannerHeight = LAYOUT.height * SPACING.bannerHeightPct;

  const transitionFrames = Math.round(ANIMATION.sceneTransitionSec * fps);
  const progress = Math.min(
    interpolate(frame, [0, transitionFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(frame, [durationInFrames - transitionFrames, durationInFrames], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  const scale = interpolate(progress, [0, 1], [ANIMATION.sceneTransitionScaleFrom, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ opacity: progress, transform: `scale(${scale})` }}>
      {watermark}
      <AbsoluteFill
        style={{
          paddingTop: paddingY,
          paddingBottom: paddingY + bannerHeight,
          paddingLeft: paddingX,
          paddingRight: paddingX,
          display: "flex",
        }}
      >
        {children}
      </AbsoluteFill>
      {badge}
      <CaptionBanner caption={caption} />
    </AbsoluteFill>
  );
};
