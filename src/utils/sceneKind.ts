import { COLORS } from "../theme";
import type { SceneLayout } from "../types";

export type WatermarkShape = "question" | "book" | "bulb" | "arrow" | "check";

export type SceneKind = {
  /** Accent for this section: drives the bridge bulb and the status badge. */
  color: string;
  /** Short Korean label shown in the corner badge. */
  label: string;
  watermark: WatermarkShape;
};

/**
 * What kind of beat each layout represents. Colours reuse the palette's
 * existing meaning — green already marks example boxes and blue already marks
 * point/summary boxes — so the badge colour reads consistently with the
 * content underneath it.
 */
const SCENE_KINDS: Record<SceneLayout, SceneKind> = {
  quiz: { color: COLORS.accent, label: "퀴즈", watermark: "question" },
  wordList: { color: COLORS.exampleBorder, label: "예시", watermark: "book" },
  ruleBox: { color: COLORS.pointBorder, label: "규칙", watermark: "bulb" },
  compare: { color: COLORS.accent, label: "비교", watermark: "arrow" },
  summary: { color: COLORS.pointBorder, label: "정리", watermark: "check" },
};

export const getSceneKind = (layout: SceneLayout): SceneKind =>
  SCENE_KINDS[layout] ?? SCENE_KINDS.quiz;
