/**
 * Independent design tokens, same rule as season-test-scene-1: nothing here
 * imports from src/theme.ts. Palette/fonts carried over from scene 1 (orange
 * accent, Poppins/Noto Sans KR) per direction. New this time: a real painted
 * background (dark gradient + floating particles) instead of transparency —
 * the brief explicitly describes background motion (particle float,
 * gradient shift), which a transparent canvas can't carry.
 */
export const COLORS = {
  bgTop: "#0D1420",
  bgBottom: "#161C2E",
  text: "#FFFFFF",
  textDim: "rgba(255,255,255,0.72)",
  accent: "#FF8A3D",
  accentDark: "#7A3D14",
  cardBg: "#FFFFFF",
  cardText: "#141414",
  wrong: "#FF5A5A",
  right: "#6BCB77",
  neon: "#FF8A3D",
} as const;

/** 16:9, sized for mobile-safe centre framing per the brief. */
export const LAYOUT = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/**
 * "모바일 가시성 최적화": on a horizontal frame that a phone often still plays
 * small or crops, everything load-bearing stays inside this centred box
 * rather than using the full width.
 */
export const SAFE_ZONE = {
  widthPct: 0.6,
  heightPct: 0.7,
} as const;

export const FONT_SIZES = {
  phrase: 92,
  quizWord: 110,
  wordCard: 100,
  mergedToken: 120,
  caption: 46,
  titleGiant: 140,
  subtitleFlip: 64,
  sentenceZoom: 80,
  glowTitle: 108,
} as const;

export const TIMING = {
  quizHoldSec: 4,
  endBufferSec: 0.3,
  wordPopSec: 0.4,
} as const;
