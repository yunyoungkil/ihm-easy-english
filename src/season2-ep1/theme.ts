/**
 * Independent design tokens — same rule as the season-test-scene folders:
 * nothing here imports from src/theme.ts. Palette/fonts carried forward from
 * season-test-scene-2 (orange accent, Poppins/Noto Sans KR, painted
 * background) since no new direction was given for this episode.
 */
export const COLORS = {
  bgTop: "#0D1420",
  bgBottom: "#161C2E",
  text: "#FFFFFF",
  textDim: "rgba(255,255,255,0.72)",
  accent: "#FF8A3D",
  accentShadow: "#B85A18", // the spec's "#e67e22" deep-shadow tone, darkened to sit under our accent
  accentDark: "#7A3D14",
  cardBg: "#FFFFFF",
  cardText: "#141414",
  wrong: "#FF5A5A",
  right: "#6BCB77",
  neon: "#FF8A3D",
  contentWord: "#FF8A3D", // "뜻 단어" — carries meaning, gets the accent
  functionWord: "#6B7280", // "문법 단어" — grammatical glue, muted/small
} as const;

/** 16:9. Matches season-test-scene-2's resolution. */
export const LAYOUT = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

/**
 * "모바일 가시성 최적화": fixed-pixel inset (not a percentage) per this
 * episode's spec — left/right 200px, top/bottom 150px.
 */
export const SAFE_INSET = {
  x: 200,
  y: 150,
} as const;

export const FONT_SIZES = {
  phrase: 92,
  quizWord: 110,
  wordCard: 100,
  mergedToken: 122,
  caption: 46,
  titleGiant: 140,
  subtitleFlip: 64,
  sentenceZoom: 80,
  glowTitle: 108,
  cardLabel: 44,
} as const;

export const TIMING = {
  quizHoldSec: 4,
  countdownSec: 10,
  endBufferSec: 0.3,
  wordPopSec: 0.4,
} as const;

/** The 3D "app button" card look described throughout the spec. */
export const CARD_3D_SHADOW = `0px 16px 0px ${COLORS.accentShadow}, 0px 24px 40px rgba(0,0,0,0.4)`;
