import type { Scene, Word } from "../types";
import { getSceneKind, type WatermarkShape } from "./sceneKind";
import { filterEditorialNotes } from "./contentFilter";

export type ReferenceContent = {
  /** Which glyph sits above the headline. */
  icon: WatermarkShape;
  /** Small letter-spaced label under the mark. */
  eyebrow: string;
  /** Words the headline cycles through, in narration order. */
  words: Word[];
  /** Fallback headline for scenes that carry prose instead of words. */
  headlineText?: string;
  caption: string;
};

/**
 * Collapses every ep06 layout onto the reference's single
 * mark / eyebrow / headline / caption structure.
 *
 * Word-bearing scenes (quiz, wordList, compare) let the headline step through
 * their words in narration order; prose scenes (ruleBox, summary) put their
 * text in the headline slot instead.
 */
export const toReferenceContent = (scene: Scene): ReferenceContent => {
  const kind = getSceneKind(scene.layout);
  const words = scene.words ?? [];

  let headlineText: string | undefined;
  if (words.length === 0) {
    if (Array.isArray(scene.content)) {
      headlineText = scene.content.join("  ·  ");
    } else {
      headlineText = filterEditorialNotes(scene.content) ?? scene.title;
    }
  }

  return {
    icon: kind.watermark,
    eyebrow: kind.label,
    words,
    headlineText,
    caption: scene.caption,
  };
};

/**
 * Which word the headline should be showing at `frame`: the most recent one
 * the narration has reached, or the first word before it has reached any.
 * Without timestamps this simply holds on the first word.
 */
export const getActiveWordIndex = (words: Word[], frame: number): number => {
  let active = 0;
  for (let i = 0; i < words.length; i++) {
    const at = words[i].highlightAt;
    if (at !== undefined && frame >= at) {
      active = i;
    }
  }
  return active;
};
