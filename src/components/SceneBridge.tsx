import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SIGNATURE } from "../theme";
import { LightbulbGlyph } from "./icons";
import type { SceneKind } from "../utils/sceneKind";

/**
 * `dynamic`-only scene bridge. Reinterprets the reference's habit of opening
 * every segment with a glowing centred mark: the bulb switches on (opacity +
 * an expanding glow), wobbles once as it settles because the spring is
 * under-damped, then leaves — all within 0.4s, so it reads as a beat between
 * scenes rather than a title card.
 *
 * Its colour is the incoming scene's kind, so the bridge already tells you
 * whether you're heading into an example, a rule or a quiz.
 */
export const SceneBridge: React.FC<{ kind: SceneKind }> = ({ kind }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const totalFrames = Math.round(SIGNATURE.bridgeDurationSec * fps);
  if (frame > totalFrames) {
    return null;
  }

  const turnOnFrames = Math.round(SIGNATURE.bridgeTurnOnSec * fps);

  // Under-damped spring => a small overshoot past full size, then settle.
  const turnOn = spring({
    frame,
    fps,
    durationInFrames: turnOnFrames,
    config: { damping: SIGNATURE.bridgeDamping },
  });

  const scale = interpolate(turnOn, [0, 1], [SIGNATURE.bridgeScaleFrom, 1]);
  const lit = interpolate(frame, [0, turnOnFrames * 0.55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const leave = interpolate(frame, [turnOnFrames, totalFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = lit * leave;
  const glowPx = lit * SIGNATURE.bridgeGlowMaxPx;
  const size = height * SIGNATURE.bridgeIconSizePct;

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        opacity,
      }}
    >
      {/* Soft halo that spreads as the bulb comes up. */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(circle at 50% 50%, ${kind.color}22 0%, transparent ${18 + lit * 14}%)`,
        }}
      />
      <LightbulbGlyph
        size={size}
        color={kind.color}
        strokeWidth={1.5}
        style={{
          transform: `scale(${scale})`,
          filter: `drop-shadow(0 0 ${glowPx}px ${kind.color})`,
        }}
      />
    </AbsoluteFill>
  );
};
