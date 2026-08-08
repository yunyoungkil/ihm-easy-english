import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import type { WatermarkShape } from "../utils/sceneKind";
import { CARD } from "../theme";

/**
 * Solid (fillable) versions of the category glyphs. The stroked icons used
 * elsewhere are no good as a mask — a thin outline reveals almost nothing —
 * so these are closed shapes that can grow to cover the frame.
 */
const SHAPE_PATHS: Record<WatermarkShape, string> = {
  // question mark
  question:
    "M50 8c-13 0-23 9-23 21h13c0-6 4-10 10-10s10 4 10 9c0 5-3 8-8 11-8 5-12 10-12 19v4h13v-3c0-6 3-9 9-13 8-5 12-11 12-19C74 17 63 8 50 8zM50 74a9 9 0 100 18 9 9 0 000-18z",
  // open book
  book: "M8 20c12-6 26-6 38 0v62c-12-6-26-6-38 0V20zm84 0c-12-6-26-6-38 0v62c12-6 26-6 38 0V20z",
  // light bulb
  bulb: "M50 6c-18 0-32 14-32 31 0 12 6 20 12 26 4 4 6 7 6 12v3h28v-3c0-5 2-8 6-12 6-6 12-14 12-26C82 20 68 6 50 6zM36 84h28v7H36v-7zm4 12h20v6H40v-6z",
  // right arrow
  arrow: "M6 40h56V18l32 32-32 32V60H6V40z",
  // check mark
  check: "M40 68L16 44 4 56l36 36L96 36 84 24 40 68z",
};

export type ShapeWipeProps = {
  shape: WatermarkShape;
  color: string;
};

const ShapeWipePresentation: React.FC<
  TransitionPresentationComponentProps<ShapeWipeProps>
> = ({ children, presentationProgress, presentationDirection, passedProps }) => {
  const { shape, color } = passedProps;
  const p = presentationProgress;

  // The glyph as a white-on-transparent mask image. Growing `maskSize` scales
  // it from a point in the centre out past the frame edges.
  // Base64 rather than `;utf8,` + percent-encoding: Chrome rejects the latter
  // here and silently drops the mask, which shows up as an unclipped wash.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="${SHAPE_PATHS[shape]}" fill="white"/></svg>`;
  const maskImage = `url("data:image/svg+xml;base64,${btoa(svg)}")`;

  if (presentationDirection === "exiting") {
    // Outgoing scene simply stays put; the incoming shape grows over it.
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  // Shape scales up, then the mask is dropped entirely so the new scene is
  // fully revealed without a visible seam.
  // Cubic rather than linear growth: the timing spring is heavily damped, so
  // a linear map would blow past the sizes where the glyph is actually
  // readable within a single frame. This holds it near screen size around
  // the middle of the transition, then opens out fast.
  const sizePct = 800 * Math.pow(Math.max(0, Math.min(1, p)), 3);
  const unmasked = p > 0.95;

  // Accent flash filling the shape as it lands. Opaque at its peak: both
  // scenes are dark, so a translucent flash would barely register.
  const flash = interpolate(p, [0.08, 0.33, 0.51, 0.72], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const contentOpacity = interpolate(p, [0.44, 0.85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const maskStyle: React.CSSProperties = unmasked
    ? {}
    : {
        maskImage,
        WebkitMaskImage: maskImage,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: `${sizePct}% ${sizePct}%`,
        WebkitMaskSize: `${sizePct}% ${sizePct}%`,
      };

  return (
    <AbsoluteFill style={maskStyle}>
      {/* Opaque backdrop, inside the mask. Card scenes paint no background of
          their own, so without this the incoming scene fades in *over* the
          outgoing one and both scripts are readable at the same time. */}
      <AbsoluteFill style={{ backgroundColor: CARD.background }} />
      <AbsoluteFill style={{ opacity: contentOpacity }}>{children}</AbsoluteFill>
      {flash > 0.001 && (
        <AbsoluteFill style={{ backgroundColor: color, opacity: flash }} />
      )}
    </AbsoluteFill>
  );
};

/**
 * Scene transition that wipes in through the *next* scene's category glyph:
 * the shape grows from the centre, flashes the category colour, and opens
 * onto the new scene. Used only when the category actually changes — same
 * category scenes just cross-fade.
 */
export const shapeWipe = (props: ShapeWipeProps): TransitionPresentation<ShapeWipeProps> => ({
  component: ShapeWipePresentation,
  props,
});
