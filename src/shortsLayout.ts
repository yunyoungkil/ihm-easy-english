import { ding, uiSwitch, whoosh } from "@remotion/sfx";

/**
 * Rules every vertical short follows — EP06-shortsA today, EP06-shortsB and
 * EP07-shortsA/B next. Kept apart from theme.ts because these describe the
 * *platform* (where the player's own chrome sits, which beat gets which
 * sound), not the channel's visual design.
 */

/**
 * Room the player's UI occupies, as fractions of the frame. Measured off a
 * blank YouTube Shorts screenshot: search/overflow icons across the top and
 * the handle + description block along the bottom.
 *
 * **Vertical only.** The like/comment/share rail down the right is not dodged:
 * insetting content away from it pushes everything off-centre, which reads
 * worse than the slight overlap. Content stays centred in the full width with
 * an even margin on both sides.
 */
export const SHORTS_SAFE = {
  /** Below the top icon row. */
  topPct: 0.15,
  /** Above the handle/description block. */
  bottomPct: 0.1,
  /** Even margin on both sides — content is centred, not inset. */
  sidePct: 0.07,
} as const;

/**
 * The countdown does not start until the question has finished being asked —
 * a number ticking under the narration reads as a progress bar rather than a
 * beat to think in. The segment therefore runs
 * `narration + countdown`, and the answer segment starts after both.
 */
export const SHORTS_COUNTDOWN = {
  /** Seconds per digit. Three digits => 1.8s of thinking time. */
  beatSec: 0.6,
  digits: 3,
  totalSec: 0.6 * 3,
} as const;

/**
 * Which sound marks which beat, and when it fires. Every short reuses this
 * map so the cue for "counting down" or "answer revealed" never drifts
 * between episodes.
 *
 * Sources are the URLs @remotion/sfx exposes; Remotion fetches them at render
 * time, so a render needs network access the first time.
 */
export const SHORTS_SFX = {
  /**
   * Sound effects sit under the narration rather than competing with it.
   * The narration itself always plays at full volume.
   */
  volume: 0.7,

  /**
   * `leadInMs` is how long each file waits before its audible attack. Remotion
   * schedules the *file* frame-exactly, so that silence lands the sound late
   * by exactly that much — the countdown clicks measured a constant +160ms
   * behind their digits until this was subtracted.
   *
   * Values were measured off the rendered mix, not guessed: the three
   * countdown clicks sit in silence and all three were late by the same
   * 160ms, which only a lead-in can cause.
   */

  /** One per countdown digit, fired as that digit springs in. */
  countdown: { src: uiSwitch, at: "each-countdown-digit" as const, leadInMs: 160 },
  /** The answer landing — fired on the stressed word's spoken frame. */
  reveal: { src: ding, at: "highlight-start" as const, leadInMs: 48 },
  /**
   * The closing card sliding in. Deliberately *not* shifted: a whoosh is a
   * swell rather than a click, and it already begins at the segment start —
   * there is nothing before it to pull it into, and its peak landing as the
   * card settles is what the beat wants.
   */
  cta: { src: whoosh, at: "segment-start" as const, leadInMs: 0 },
} as const;

/**
 * The compare beat: wrong reading on the left, real pronunciation on the right.
 *
 * The right side arrives a moment after the left so the viewer reads the wrong
 * version first — the correction only lands if the mistake registered. When the
 * narration's own timing for the word is known (`highlightAt`) that is used
 * instead, so the switch click and the spoken word agree.
 */
export const SHORTS_COMPARE = {
  /**
   * Three beats, stacked top to bottom.
   *
   * The wrong reading is shown plainly first — it has to be *read* before it
   * can be corrected — then struck out as the arrow drops, then answered.
   */
  wrongInSec: 0,
  strikeAtSec: 0.8, // X mark + arrow + switch click, together
  revealAtSec: 1.2, // the real pronunciation
  settleSec: 0.8, // how long the reveal takes to finish arriving

  /** Struck-out reading stays legible but recedes. */
  wrongOpacity: 0.5,
  crossStrokeWidth: 9,
  /** X sits beside the text, not over it — 60% of the text's own size. */
  crossSizeRatio: 0.6,
  crossGapRatio: 0.35,

  /**
   * One type scale for both halves, so the wrong reading and the real one
   * carry the same weight and only colour tells them apart. Ratios are fixed
   * (label : text : pronunciation = 1 : 2.1 : 1.5) rather than tuned per
   * block, which is what made the top half read tighter than the bottom.
   */
  labelSizePct: 0.034, // of width -> 37px
  textSizePct: 0.072, // of width -> 78px, used by BOTH the wrong text and the word
  pronSizePct: 0.052, // of width -> 56px
  arrowSizePct: 0.07, // of width

  /**
   * Spacing is in px, not fractions: the shorts frame is a fixed 1080x1920, and
   * these are rhythm values that should not drift with the width.
   *
   * Both blocks use the same three numbers, and the arrow sits symmetrically
   * between them.
   */
  labelGapPx: 12, // label -> text / word
  wordToPronPx: 16, // word -> Korean reading
  blockPadPx: 8, // each block's own top/bottom padding
  blockToArrowPx: 24, // block edge -> arrow, both sides
} as const;

/** Channel handle shown above the player's own bottom row. */
export const SHORTS_HANDLE = {
  text: "@이해하면 쉬운 영어",
  color: "#b3b3b3",
  sizePct: 0.033, // of width
} as const;
