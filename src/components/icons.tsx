import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ANIMATION } from "../theme";
import { useMotionStyle } from "../motion";

export const BookIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M4 4.5C4 3.67 4.67 3 5.5 3H11.5C11.5 3 12 3.2 12 4V20C12 19.2 11.5 19 11.5 19H5.5C4.67 19 4 19.67 4 20.5V4.5Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M20 4.5C20 3.67 19.33 3 18.5 3H12.5C12.5 3 12 3.2 12 4V20C12 19.2 12.5 19 12.5 19H18.5C19.33 19 20 19.67 20 20.5V4.5Z"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const BULB_PATH =
  "M9 18H15M10 21H14M8 14.5C6.2 13.3 5 11.3 5 9C5 5.7 7.7 3 11 3H13C16.3 3 19 5.7 19 9C19 11.3 17.8 13.3 16 14.5C15.3 15 15 15.6 15 16.3V17H9V16.3C9 15.6 8.7 15 8 14.5Z";

/** The bulb outline with no animation of its own, for callers that drive it. */
export const LightbulbGlyph: React.FC<{
  size: number;
  color: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({ size, color, strokeWidth = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d={BULB_PATH}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

// Glows perpetually (independent of entrance timing) so the icon never
// looks fully "settled" while its rule box is on screen.
export const LightbulbIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const periodFrames = ANIMATION.lightbulbGlowPeriodSec * fps;
  const wave = Math.sin((frame / periodFrames) * Math.PI * 2);
  const mid = (ANIMATION.lightbulbGlowMax + ANIMATION.lightbulbGlowMin) / 2;
  const amplitude = (ANIMATION.lightbulbGlowMax - ANIMATION.lightbulbGlowMin) / 2;

  return <LightbulbGlyph size={size} color={color} style={{ opacity: mid + amplitude * wave }} />;
};

export const QuestionGlyph: React.FC<{
  size: number;
  color: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({ size, color, strokeWidth = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M8.6 8.6C8.6 6.7 10.1 5.2 12 5.2C13.9 5.2 15.4 6.7 15.4 8.6C15.4 10.2 14.3 11 13.2 11.7C12.4 12.2 12 12.9 12 13.8V14.6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="18.2" r={strokeWidth * 0.75} fill={color} />
  </svg>
);

export const ArrowGlyph: React.FC<{
  size: number;
  color: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({ size, color, strokeWidth = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M3.5 12H20.5M20.5 12L14.5 6M20.5 12L14.5 18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckGlyph: React.FC<{
  size: number;
  color: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({ size, color, strokeWidth = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M4 12.5L9.5 18L20 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const BookGlyph: React.FC<{
  size: number;
  color: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}> = ({ size, color, strokeWidth = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M4 4.5C4 3.67 4.67 3 5.5 3H11.5C11.5 3 12 3.2 12 4V20C12 19.2 11.5 19 11.5 19H5.5C4.67 19 4 19.67 4 20.5V4.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
    <path
      d="M20 4.5C20 3.67 19.33 3 18.5 3H12.5C12.5 3 12 3.2 12 4V20C12 19.2 12.5 19 12.5 19H18.5C19.33 19 20 19.67 20 20.5V4.5Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />
  </svg>
);

const CHECK_PATH_LENGTH = 24;

export const CheckIcon: React.FC<{
  size: number;
  color: string;
  drawDelayFrames?: number;
  drawDurationSec?: number;
}> = ({ size, color, drawDelayFrames = 0, drawDurationSec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motion = useMotionStyle();
  const durationFrames = Math.round((drawDurationSec ?? motion.entranceSettleSec) * fps);
  const progress = interpolate(frame - drawDelayFrames, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dashOffset = CHECK_PATH_LENGTH * (1 - progress);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 12.5L9.5 18L20 6"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={CHECK_PATH_LENGTH}
        strokeDashoffset={dashOffset}
      />
    </svg>
  );
};
