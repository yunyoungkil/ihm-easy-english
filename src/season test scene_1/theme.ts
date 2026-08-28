/**
 * Fully independent design tokens for this test scene. Deliberately does NOT
 * import anything from src/theme.ts — the brief was to ignore the channel's
 * existing design system and reference only the supplied "Branding Reel"
 * motion template (word-by-word reveals, a colour-highlight box with a
 * pointer behind the punchline word, tilted drop-shadow cards). The template
 * background (dark grid) is dropped entirely: this scene renders on a
 * transparent canvas so it can sit over the creator's own footage, which is
 * also why the template's lime green was swapped for orange per direction —
 * lime read as "generic SaaS template", orange reads warmer for a reaction/
 * gotcha beat and still separates cleanly from plain white text.
 */
export const COLORS = {
  text: "#FFFFFF",
  textDim: "rgba(255,255,255,0.72)",
  accent: "#FF8A3D",
  accentDark: "#7A3D14",
  cardBg: "#FFFFFF",
  cardText: "#141414",
  wrong: "#FF5A5A",
  right: "#6BCB77",
} as const;

export const LAYOUT = {
  width: 1080,
  height: 1920,
  fps: 30,
} as const;

/** Matches the reference reel's clean geometric grotesk (Poppins is the closest Google Font match). */
export const FONT_SIZES = {
  phrase: 76, // stacked word-group reveal (segment A / D)
  quizWord: 108, // "아이 엄마...?" card
  bigPhrase: 92, // "I'm going to" / "I'mma"
  caption: 40, // bottom answer-key banner
  subtitle: 44,
} as const;

export const TIMING = {
  /** Segment B: silent quiz hold. Not driven by any audio file. */
  quizHoldSec: 4,
  /** Breathing room after each narrated segment's audio ends. */
  endBufferSec: 0.3,
  wordPopSec: 0.4,
  cardTiltDeg: 5,
} as const;
