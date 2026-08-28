/**
 * Independent design tokens — same rule as season2-ep1: nothing here imports
 * from src/theme.ts. This spec gives an explicit caption size/shadow, so
 * those are taken literally (110px / 800 weight / the exact drop shadow)
 * rather than reusing EP1's values.
 */
export const COLORS = {
  bgTop: "#0D1420",
  bgBottom: "#161C2E",
  text: "#FFFFFF",
  textDim: "rgba(255,255,255,0.72)",
  accent: "#FF8A3D",
  accentShadow: "#B85A18",
  accentDark: "#7A3D14",
  cardBg: "#FFFFFF",
  cardText: "#141414",
  // "Master" (뜻 단어) vs "slave" (기능어) — the episode's whole visual metaphor.
  master: "#FFD24C", // crown gold
  masterShadow: "#B8860B",
  slave: "#6B7280", // muted, thin, near-invisible
  wanna: "#FFD24C",
  gonna: "#4ADE80",
  gotta: "#E11D48",
} as const;

/** 16:9. Matches spec's 1920x1080 / 30fps exactly. */
export const LAYOUT = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

export const SAFE_INSET = {
  x: 200,
  y: 150,
} as const;

/** Spec section: main caption font-size 110px / weight 800. */
export const FONT_SIZES = {
  phrase: 110,
  masterWord: 130,
  slaveWord: 60,
  mergedToken: 130,
  caption: 46,
  quizWord: 96,
} as const;

/** Spec: "text-shadow: 0px 8px 24px rgba(0,0,0,0.35)" applied to the main caption. */
export const CAPTION_SHADOW = "0px 8px 24px rgba(0,0,0,0.35)";

export const TIMING = {
  quizHoldSec: 4,
  countdownSec: 10,
  revealHoldSec: 4,
  endBufferSec: 0.3,
  wordPopSec: 0.4,
} as const;

export const CARD_3D_SHADOW = `0px 16px 0px ${COLORS.accentShadow}, 0px 24px 40px rgba(0,0,0,0.4)`;
