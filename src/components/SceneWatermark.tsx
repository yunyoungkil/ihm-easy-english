import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { COLORS, SIGNATURE } from "../theme";
import { ArrowGlyph, BookGlyph, CheckGlyph, LightbulbGlyph, QuestionGlyph } from "./icons";
import type { SceneKind, WatermarkShape } from "../utils/sceneKind";

const GLYPHS: Record<WatermarkShape, typeof LightbulbGlyph> = {
  question: QuestionGlyph,
  book: BookGlyph,
  bulb: LightbulbGlyph,
  arrow: ArrowGlyph,
  check: CheckGlyph,
};

/**
 * `dynamic`-only background glyph identifying the scene type. Deliberately at
 * ~4% opacity: it should register as texture, never as content, so it stays
 * far below the text in contrast.
 */
export const SceneWatermark: React.FC<{ kind: SceneKind }> = ({ kind }) => {
  const { height } = useVideoConfig();
  const Glyph = GLYPHS[kind.watermark];

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity: SIGNATURE.watermarkOpacity,
      }}
    >
      <Glyph
        size={height * SIGNATURE.watermarkSizePct}
        color={COLORS.text}
        strokeWidth={SIGNATURE.watermarkStrokeWidth}
      />
    </AbsoluteFill>
  );
};
