import React from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/**
 * Single-photo cinematic treatment — no script, no narration, no design
 * system to match. Isolated test composition per the "이름-test-번호"
 * convention; shares nothing with the channel's other compositions.
 *
 * The source is one static photo (public/image/image-1786874257200.webp),
 * so every layer here is a CSS/SVG effect composited over it — there's no
 * real depth data to key on, just a Ken Burns move plus a few masked light
 * effects placed by eye against where the highlights already sit in the
 * photo (taillight, floor reflection).
 */
const IMAGE_SRC = "image/image-1786874257200.webp";
const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
export const CAR_TEST_2_DURATION = 180; // 6s — one clean pass, no loop needed

const CarHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Ken Burns: slow zoom + slight diagonal drift. Critically damped (no
  // overshoot) — a car-ad move should read as controlled, not springy.
  const move = spring({ frame, fps, durationInFrames, config: { damping: 200 } });
  const scale = 1 + move * 0.14;
  const panX = interpolate(move, [0, 1], [10, -14]);
  const panY = interpolate(move, [0, 1], [-6, 10]);

  // Glossy light sweep — a single diagonal streak crossing the frame once,
  // the classic "product reveal" shine. Screen-blended so it only brightens.
  const sweep = interpolate(frame, [14, 58], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sweepEased = interpolate(sweep, [0, 1], [0, 1], { easing: (t) => t * t * (3 - 2 * t) });
  const sweepX = interpolate(sweepEased, [0, 1], [-70, 150]); // vw-ish, in % of width

  // Taillight breathing glow — slow sine pulse, starts once the intro
  // settles so it doesn't compete with the zoom-in.
  const pulsePhase = Math.max(0, frame - 20) / fps;
  const taillightGlow = 0.5 + 0.5 * Math.sin(pulsePhase * (Math.PI * 2) / 2.6);

  // Floor reflection shimmer — a soft band drifting left-to-right across the
  // bottom reflective strip, looping slowly and independently of the sweep.
  const shimmerLoop = (frame % (fps * 4)) / (fps * 4);
  const shimmerX = interpolate(shimmerLoop, [0, 1], [-40, 140]);

  // Cinematic open/close — fade from black in, fade to black out.
  const introOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const outroOpacity = interpolate(
    frame,
    [durationInFrames - 16, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp" },
  );
  const opacity = Math.min(introOpacity, outroOpacity);

  return (
    <AbsoluteFill style={{ background: "#000", opacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate(${panX}px, ${panY}px)`,
        }}
      >
        <Img
          src={staticFile(IMAGE_SRC)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>

      {/* Glossy diagonal shine sweeping across the whole frame once. */}
      <AbsoluteFill
        style={{
          mixBlendMode: "screen",
          opacity: sweepEased > 0 && sweepEased < 1 ? 0.5 : 0,
          background: `linear-gradient(115deg, transparent calc(${sweepX}% - 14%), rgba(255,255,255,0.9) ${sweepX}%, transparent calc(${sweepX}% + 14%))`,
          pointerEvents: "none",
        }}
      />

      {/* Taillight breathing glow — positioned over the orange light bar. */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            left: "48%",
            top: "29%",
            width: "46%",
            height: "9%",
            borderRadius: "50%",
            background: "radial-gradient(ellipse, rgba(255,140,50,0.9) 0%, rgba(255,90,30,0.35) 45%, transparent 75%)",
            filter: "blur(18px)",
            mixBlendMode: "screen",
            opacity: 0.35 + taillightGlow * 0.4,
            transform: `scale(${1 + taillightGlow * 0.08})`,
          }}
        />
      </AbsoluteFill>

      {/* Floor reflection shimmer — masked to the bottom reflective strip only. */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "16%",
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            mixBlendMode: "screen",
            opacity: 0.4,
            background: `linear-gradient(100deg, transparent calc(${shimmerX}% - 18%), rgba(180,210,255,0.55) ${shimmerX}%, transparent calc(${shimmerX}% + 18%))`,
          }}
        />
      </div>

      {/* Static vignette for depth — darkens the corners, keeps focus on the car. */}
      <AbsoluteFill
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 60% 55%, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const CarTest2Composition: React.FC = () => (
  <Composition
    id="car-test-2"
    component={CarHero}
    durationInFrames={CAR_TEST_2_DURATION}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
