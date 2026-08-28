/**
 * Isolated test composition — podcast-style 2-speaker video over a fixed
 * background photo. Own palette/layout, shares nothing with the channel's
 * other compositions (calm/dynamic/reference/card motion styles).
 */
export const LAYOUT = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

export const COLORS = {
  googleBlue: "#4285F4",
  googleRed: "#EA4335",
  googleGreen: "#34A853",
  white: "#FFFFFF",
  spokenWhite: "#FFFFFF",
  unspokenGray: "rgba(255,255,255,0.45)",
  koSubGray: "rgba(230,230,235,0.8)",
  subtitleBg: "rgba(0,0,0,0.4)",
} as const;

export type SpeakerId = "mia" | "leo";

/** Google-brand accent per speaker, per the spec (Mia = blue, Leo = red). */
export const SPEAKER_COLOR: Record<SpeakerId, string> = {
  mia: COLORS.googleBlue,
  leo: COLORS.googleRed,
};

export const SPEAKER_LABEL: Record<SpeakerId, string> = {
  mia: "Mia",
  leo: "Leo",
};

/**
 * Mic-tip position for each speaker, in percent of frame — eyeballed from
 * public/image/podcast-test-3-bg.png (Leo left/mic pointing right, Mia
 * right/mic pointing left). The ripple indicator anchors here.
 */
export const SPEAKER_MIC_POSITION: Record<SpeakerId, { xPct: number; yPct: number }> = {
  leo: { xPct: 25, yPct: 51 },
  mia: { xPct: 75, yPct: 54 },
};

export const SUBTITLE = {
  topPct: 10,
  maxWidthPx: 1500,
  enFontSize: 46,
  koFontSize: 26,
  tagFontSize: 22,
} as const;

/**
 * Long lines (tip 7 runs 244 characters) blow past a fixed 46px font even
 * once wrapping is fixed — at that size it wraps to 4-5 lines and pushes the
 * box down into the speakers' faces. Step the font down by character count
 * so long lines stay within roughly 2-3 wrapped lines inside the top band.
 */
export function fitEnFontSize(charCount: number): number {
  if (charCount <= 70) return SUBTITLE.enFontSize;
  if (charCount <= 110) return 40;
  if (charCount <= 160) return 34;
  if (charCount <= 210) return 29;
  return 25;
}

/** Fixed pause length inserted wherever a line's text has "..." — the
 * stand-in for an SSML <break> until real audio/SSML timing exists. */
export const ELLIPSIS_PAUSE_SEC = 0.5;
