import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_SIZES } from "./theme";
import { FONT_EN, FONT_KO, FONT_SCRIPT } from "./fonts";

// ---------- Background ----------

/** Deliberately fixed (no per-frame randomness) so the "crumpled paper" mottling never flickers. */
const TEXTURE_BLOBS = [
  { x: 12, y: 8, r: 30 }, { x: 78, y: 15, r: 24 }, { x: 30, y: 60, r: 36 },
  { x: 88, y: 70, r: 28 }, { x: 55, y: 40, r: 40 }, { x: 8, y: 85, r: 22 },
];

export const SceneBackground: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(160deg, ${COLORS.bgOrange} 0%, ${COLORS.bgOrangeDark} 100%)`,
      overflow: "hidden",
    }}
  >
    {TEXTURE_BLOBS.map((b, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${b.x}%`,
          top: `${b.y}%`,
          width: `${b.r}%`,
          height: `${b.r}%`,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,0,0,0.08) 0%, transparent 70%)",
        }}
      />
    ))}
  </div>
);

// ---------- Torn paper card ----------

/** Fixed-seed PRNG — deterministic across every render, never Math.random(). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Irregular (not evenly-spaced) jagged top/bottom edge — computed once at
 * module load from a fixed seed, so it's exactly as deterministic as the old
 * hand-written zigzag but reads as a genuine tear instead of a repeating
 * sawtooth pattern. Corner points are pinned to 0/100 so the card's left and
 * right sides stay straight.
 */
function buildTornEdgeClip(segments: number, seed: number, maxDepthPct: number): string {
  const rand = mulberry32(seed);
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * 100;
    const depth = i === 0 || i === segments ? 0 : rand() * maxDepthPct;
    top.push(`${x.toFixed(1)}% ${depth.toFixed(1)}%`);
  }
  for (let i = segments; i >= 0; i--) {
    const x = (i / segments) * 100;
    const depth = i === 0 || i === segments ? 100 : 100 - rand() * maxDepthPct;
    bottom.push(`${x.toFixed(1)}% ${depth.toFixed(1)}%`);
  }
  return `polygon(${top.join(", ")}, ${bottom.join(", ")})`;
}

const TORN_EDGE_CLIP = buildTornEdgeClip(22, 5, 7);

/**
 * Small white "fiber" hairs poking out of the torn edge — the fuzzy, torn-
 * fiber look a clip-path alone can't produce (clip-path edges are always
 * perfectly straight line segments). Fixed seed, rendered OUTSIDE the
 * clipped card box (as a sibling) so the strands aren't clipped away.
 */
function buildFiberMarks(seed: number, count: number) {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    len: 3 + rand() * 9,
    angle: -22 + rand() * 44,
    opacity: 0.3 + rand() * 0.45,
  }));
}

const FIBER_MARKS_TOP = buildFiberMarks(11, 44);
const FIBER_MARKS_BOTTOM = buildFiberMarks(23, 44);

const TornFiberEdge: React.FC<{
  marks: { x: number; len: number; angle: number; opacity: number }[];
  edge: "top" | "bottom";
  color: string;
}> = ({ marks, edge, color }) => (
  // Zero-height, anchored exactly on the card's (unclipped) top/bottom line —
  // each mark then grows OUTWARD from that line via the opposite anchor, so
  // fibers land in the orange gap above/below the paper, never on its face.
  <div style={{ position: "absolute", left: 0, right: 0, [edge]: 0, height: 0, pointerEvents: "none" }}>
    {marks.map((m, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${m.x}%`,
          [edge === "top" ? "bottom" : "top"]: 0,
          width: 1.5,
          height: m.len,
          background: color,
          opacity: m.opacity,
          transformOrigin: edge === "top" ? "bottom center" : "top center",
          transform: `rotate(${m.angle}deg)`,
        }}
      />
    ))}
  </div>
);

/**
 * Real photographed paper grain (CC0, Pixabay Content License — free for
 * commercial use, no attribution required — see public/textures/README).
 * A procedural SVG noise filter can't reproduce actual fiber/blotch
 * irregularity no matter how it's tuned; a real scan does it for free.
 * Multiply-blended onto the card colour; each card instance samples a
 * different crop of the same photo (via `index`) so repeated cards don't
 * show an identical mottling pattern.
 */
const PAPER_TEXTURE_POSITIONS = ["22% 15%", "70% 55%", "40% 82%", "85% 25%"];

const PaperGrain: React.FC<{ index: number }> = ({ index }) => (
  <div style={{ position: "absolute", inset: 0, mixBlendMode: "multiply", opacity: 0.6, pointerEvents: "none", overflow: "hidden" }}>
    <Img
      src={staticFile("textures/paper-old-texture.jpg")}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: PAPER_TEXTURE_POSITIONS[index % PAPER_TEXTURE_POSITIONS.length],
      }}
    />
  </div>
);

/** A few soft, fixed-position aged-paper blotches — mottling, not a stain of any particular shape. */
const PAPER_BLOTCHES = [
  { x: 12, y: 18, r: 34, o: 0.13 }, { x: 78, y: 10, r: 28, o: 0.1 },
  { x: 60, y: 70, r: 40, o: 0.12 }, { x: 20, y: 82, r: 26, o: 0.1 },
];

const PaperBlotches: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {PAPER_BLOTCHES.map((b, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: `${b.x}%`,
          top: `${b.y}%`,
          width: `${b.r}%`,
          height: `${b.r}%`,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(90,60,20,${b.o}) 0%, transparent 70%)`,
        }}
      />
    ))}
  </div>
);

/**
 * Vertical column of punched holes, shadow-shaded to read as cut through the
 * paper. Positioned in the card's own blank padding margin (left: -34,
 * against a 60px padding) so it never sits under the headline text.
 */
export const PunchHoles: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div style={{ position: "absolute", left: -34, top: 0, bottom: 0, width: 20, pointerEvents: "none" }}>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          top: `${12 + i * (76 / Math.max(count - 1, 1))}%`,
          left: 0,
          width: 20,
          height: 20,
          borderRadius: 5,
          background: "#382C20",
          boxShadow: "inset 0 3px 5px rgba(0,0,0,0.65), inset 0 -2px 3px rgba(255,255,255,0.08)",
        }}
      />
    ))}
  </div>
);

let tornPaperCount = 0;

export const TornPaper: React.FC<{
  children: React.ReactNode;
  background?: string;
  rotateDeg?: number;
  delayFrames?: number;
  width?: number;
  style?: React.CSSProperties;
}> = ({ children, background = COLORS.paperWhite, rotateDeg = -2, delayFrames = 0, width = 880, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const pop = local < 0 ? 0 : spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 11 } });
  const grainIndex = React.useMemo(() => tornPaperCount++, []);

  return (
    <div
      style={{
        position: "relative",
        width,
        transform: `rotate(${rotateDeg}deg) scale(${0.7 + pop * 0.3}) translateY(${(1 - pop) * 60}px)`,
        opacity: pop,
      }}
    >
      <div
        style={{
          clipPath: TORN_EDGE_CLIP,
          background,
          padding: "56px 60px",
          // A touch of inset shading so the torn edges read as having depth,
          // not just a flat cutout.
          boxShadow: "0 24px 50px rgba(0,0,0,0.35), inset 0 0 60px rgba(0,0,0,0.1)",
          position: "relative",
          ...style,
        }}
      >
        <PaperBlotches />
        <PaperGrain index={grainIndex} />
        <div style={{ position: "relative" }}>{children}</div>
      </div>
      <TornFiberEdge marks={FIBER_MARKS_TOP} edge="top" color={background} />
      <TornFiberEdge marks={FIBER_MARKS_BOTTOM} edge="bottom" color={background} />
    </div>
  );
};

/** A short strip of "tape" overlapping a card edge. */
export const TapeStrip: React.FC<{
  top?: number;
  left?: number;
  width?: number;
  rotateDeg?: number;
  color?: string;
}> = ({ top = -30, left = 300, width = 160, rotateDeg = -4, color = COLORS.tape }) => (
  <div
    style={{
      position: "absolute",
      top,
      left,
      width,
      height: 56,
      background: color,
      transform: `rotate(${rotateDeg}deg)`,
      boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
    }}
  />
);

export const Paperclip: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg width="56" height="110" viewBox="0 0 56 110" style={{ position: "absolute", ...style }}>
    <path
      d="M 28 10 C 12 10 8 22 8 34 L 8 82 C 8 94 16 100 26 100 C 36 100 42 92 42 82 L 42 30 C 42 22 37 18 31 18 C 25 18 21 22 21 30 L 21 76"
      fill="none"
      stroke={COLORS.paperclip}
      strokeWidth="5"
      strokeLinecap="round"
    />
  </svg>
);

// ---------- Hand-drawn doodles ----------

export const StarDoodle: React.FC<{ size?: number; delayFrames?: number; style?: React.CSSProperties }> = ({
  size = 70,
  delayFrames = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const pop = local < 0 ? 0 : spring({ frame: local, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 9 } });
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" style={{ position: "absolute", transform: `scale(${pop}) rotate(${8 - pop * 8}deg)`, ...style }}>
      <path
        d="M30 4 L36 22 L55 22 L39 33 L45 52 L30 40 L15 52 L21 33 L5 22 L24 22 Z"
        fill="none"
        stroke={COLORS.ink}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const HeartDoodle: React.FC<{ size?: number; delayFrames?: number; style?: React.CSSProperties }> = ({
  size = 46,
  delayFrames = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const pop = local < 0 ? 0 : spring({ frame: local, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 8 } });
  return (
    <svg width={size} height={size} viewBox="0 0 40 36" style={{ position: "absolute", transform: `scale(${pop})`, ...style }}>
      <path
        d="M20 33 C4 22 2 12 8 6 C13 1 19 4 20 10 C21 4 27 1 32 6 C38 12 36 22 20 33 Z"
        fill="none"
        stroke={COLORS.ink}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/** Small radiating "spark" strokes — the little emphasis marks beside bold words. */
export const ZapMarks: React.FC<{ delayFrames?: number; style?: React.CSSProperties }> = ({ delayFrames = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const pop = local < 0 ? 0 : spring({ frame: local, fps, durationInFrames: Math.round(0.35 * fps), config: { damping: 9 } });
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" style={{ position: "absolute", opacity: pop, ...style }}>
      {[0, 1, 2].map((i) => (
        <line key={i} x1={10 + i * 18} y1={8} x2={10 + i * 18} y2={26 - i * 4} stroke={COLORS.ink} strokeWidth="3" strokeLinecap="round" />
      ))}
    </svg>
  );
};

/** Wavy underline that draws left-to-right beneath a headline. */
export const UnderlineSquiggle: React.FC<{ width: number; delayFrames: number }> = ({ width, delayFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const progress = interpolate(local, [0, Math.round(0.6 * fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const h = 22;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{ display: "block" }}>
      <path
        d={`M4 ${h - 6} Q ${width * 0.15} 2, ${width * 0.3} ${h - 6} T ${width * 0.6} ${h - 6} T ${width - 4} ${h - 6}`}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
    </svg>
  );
};

/** Hand-drawn circle scribble that draws around a word. */
export const CircleScribble: React.FC<{ width: number; height: number; delayFrames: number }> = ({
  width,
  height,
  delayFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const progress = interpolate(local, [0, Math.round(0.7 * fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
    >
      <ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width / 2 - 6}
        ry={height / 2 - 4}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth="4"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
        transform={`rotate(-3 ${width / 2} ${height / 2})`}
      />
    </svg>
  );
};

/** Curved connector arrow between two cards (points down-right). */
export const CurvedArrow: React.FC<{ delayFrames: number; style?: React.CSSProperties }> = ({ delayFrames, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const progress = interpolate(local, [0, Math.round(0.5 * fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg width="120" height="140" viewBox="0 0 120 140" style={{ position: "absolute", ...style }}>
      <path
        d="M10 10 C 20 60, 60 90, 100 120"
        fill="none"
        stroke={COLORS.ink}
        strokeWidth="4"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
      {progress > 0.85 && (
        <path d="M84 108 L102 122 L82 130" fill="none" stroke={COLORS.ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
};

/** Dashed pointer arrow (used beside the paperclip). */
export const DashedArrow: React.FC<{ delayFrames: number; style?: React.CSSProperties }> = ({ delayFrames, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const opacity = local < 0 ? 0 : interpolate(local, [0, Math.round(0.4 * fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <svg width="100" height="120" viewBox="0 0 100 120" style={{ position: "absolute", opacity, ...style }}>
      <path d="M10 10 C 4 50, 30 90, 70 108" fill="none" stroke={COLORS.ink} strokeWidth="3" strokeDasharray="8 8" strokeLinecap="round" />
      <path d="M56 98 L72 110 L58 118" fill="none" stroke={COLORS.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ---------- Text ----------

export const Headline: React.FC<{
  lines: { text: string; big?: boolean }[];
  color?: string;
}> = ({ lines, color = COLORS.ink }) => (
  <div style={{ fontFamily: FONT_EN, fontWeight: 900, lineHeight: 1.05 }}>
    {lines.map((l, i) => (
      <div key={i} style={{ fontSize: l.big ? FONT_SIZES.headlineBig : FONT_SIZES.headline, color }}>
        {l.text}
      </div>
    ))}
  </div>
);

/** Yellow marker highlight block behind text, revealing left-to-right. */
export const MarkerHighlight: React.FC<{ children: React.ReactNode; delayFrames: number }> = ({
  children,
  delayFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const progress = local < 0 ? 0 : interpolate(local, [0, Math.round(0.5 * fps)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        style={{
          position: "absolute",
          left: -6,
          top: "12%",
          height: "80%",
          width: `calc(${progress * 100}% + ${progress > 0 ? 12 : 0}px)`,
          background: COLORS.marker,
          transform: "skewX(-4deg)",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
};

export const CreditSignature: React.FC<{ text: string }> = ({ text }) => (
  <span style={{ fontFamily: FONT_SCRIPT, fontWeight: 700, fontSize: FONT_SIZES.credit, color: COLORS.ink }}>
    {text}
  </span>
);

export const KoreanCaption: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      bottom: 90,
      left: 0,
      right: 0,
      textAlign: "center",
      fontFamily: FONT_KO,
      fontWeight: 800,
      fontSize: 40,
      color: "#FFFFFF",
      textShadow: "0 3px 14px rgba(0,0,0,0.5)",
      padding: "0 60px",
      wordBreak: "keep-all",
    }}
  >
    {text}
  </div>
);
