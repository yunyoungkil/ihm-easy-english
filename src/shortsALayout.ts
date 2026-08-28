import { ding, uiSwitch, whoosh } from "@remotion/sfx";

/**
 * Platform + beat rules for EP07-shortsA only.
 *
 * Kept apart from shortsLayout.ts (EP06 shorts): that file's `SHORTS_SAFE`
 * deliberately does *not* dodge the action rail ("우측 rail은 피하지 않는다"),
 * but this composition's spec gives an exact, asymmetric safe area that does.
 * The two are incompatible constants, not variations of the same one.
 */
export const SHORTS_A_SAFE = {
  /** Below this: search/overflow icons. */
  topPx: 180,
  /** Right of this: like/comment/share rail. All content stays left of it. */
  rightPx: 850,
  /** Below this: handle + description block. */
  bottomPx: 1650,
} as const;

/**
 * 5..1, one beat per digit. The 5-digit length is what supplies the first
 * reveal's exact 3-second gap for free (5 * 0.6s = 3.0s) — see
 * `REVEAL_DELAY_SEC`.
 */
export const SHORTS_A_COUNTDOWN = {
  beatSec: 0.6,
} as const;

/**
 * Every reveal happens exactly this long after the narration before it ends.
 * Segment 3 gets it for free from segment 2's countdown; segments 4 and 5
 * have no countdown before them, so a silent lead-in of the same length is
 * inserted before their own narration starts instead.
 */
export const REVEAL_DELAY_SEC = 3;

export const SHORTS_A_SFX = {
  volume: 0.7,
  /** One per countdown digit, fired as that digit springs in. */
  countdown: { src: uiSwitch, leadInMs: 160 },
  /** The answer landing, fired together with its narration starting. */
  reveal: { src: ding, leadInMs: 48 },
  /** The closing card sliding in, at the segment's own start. */
  cta: { src: whoosh, leadInMs: 0 },
} as const;
