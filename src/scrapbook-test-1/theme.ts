/**
 * Fully independent design tokens — torn-paper scrapbook collage look,
 * matching the reference image exactly. Nothing here imports from any other
 * folder's theme; this is a one-off visual style, not a continuation of the
 * dark-gradient/3D-button system used elsewhere in this project.
 */
export const COLORS = {
  bgOrange: "#F4740B",
  bgOrangeDark: "#D9640A",
  paperWhite: "#F7F4EE",
  paperKraft: "#DAC8A0",
  paperKraftDark: "#C7B387",
  ink: "#171412",
  tape: "rgba(245, 240, 225, 0.75)",
  tapeYellow: "rgba(240, 200, 90, 0.55)",
  marker: "#F5D400",
  paperclip: "#3A3632",
} as const;

/** 9:16 vertical — matches the reference image's portrait quote-card format. */
export const LAYOUT = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

export const FONT_SIZES = {
  headline: 88,
  headlineBig: 118,
  credit: 44,
} as const;

export const TIMING = {
  endBufferSec: 0.3,
  cardPopSec: 0.5,
  doodlePopSec: 0.4,
} as const;
