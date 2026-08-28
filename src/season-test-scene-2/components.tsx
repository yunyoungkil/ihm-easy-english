import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_SIZES, SAFE_ZONE, TIMING } from "./theme";
import { FONT_EN, FONT_KO } from "./fonts";
import type { SubtitleCue } from "./types";

/** Centred box that everything load-bearing stays inside — see SAFE_ZONE. */
export const SafeZone: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: `${(1 - SAFE_ZONE.widthPct) * 50}%`,
      top: `${(1 - SAFE_ZONE.heightPct) * 50}%`,
      width: `${SAFE_ZONE.widthPct * 100}%`,
      height: `${SAFE_ZONE.heightPct * 100}%`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * Painted background — gradient wash + slow floating particles. Sits outside
 * the Series (composition-level) like the channel's own long-form background,
 * so it doesn't restart or jump on every beat cut.
 */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 137.5) % 100, // golden-angle scatter, deterministic
  y: (i * 71.3) % 100,
  size: 4 + (i % 5) * 2,
  speed: 0.5 + (i % 4) * 0.2,
  phase: i * 0.7,
}));

export const SceneBackground: React.FC<{ hueShiftFrom?: number }> = ({ hueShiftFrom }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const hue = hueShiftFrom !== undefined && frame >= hueShiftFrom ? Math.sin(t * 0.15) * 12 : 0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(160deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`,
        filter: `hue-rotate(${hue}deg)`,
        overflow: "hidden",
      }}
    >
      {PARTICLES.map((p, i) => {
        const bob = Math.sin(t * p.speed + p.phase) * 18;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: COLORS.accent,
              opacity: 0.18,
              transform: `translateY(${bob}px)`,
            }}
          />
        );
      })}
      {/* subtle vignette so foreground text always has contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)`,
          width,
          height,
        }}
      />
    </div>
  );
};

/**
 * Oversized, springy word-group reveal — "탕탕 튕기며 등장" (a couple of
 * bounces rather than one clean settle), driven by real subtitleGroups
 * timing.
 */
export const SpringPhraseReveal: React.FC<{
  cues: SubtitleCue[];
  fontSize?: number;
  color?: string;
}> = ({ cues, fontSize = FONT_SIZES.phrase, color = COLORS.text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = cues.find((c) => frame >= c.from && frame <= c.to);
  if (!active) {
    return null;
  }

  const local = frame - active.from;
  // low damping -> a couple of visible overshoot bounces ("탕탕").
  const pop = spring({ frame: local, fps, durationInFrames: Math.round(TIMING.wordPopSec * fps), config: { damping: 7, mass: 0.6 } });
  const opacity = interpolate(local, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        textAlign: "center",
        fontFamily: FONT_KO,
        fontWeight: 800,
        fontSize,
        color,
        lineHeight: 1.25,
        wordBreak: "keep-all",
        transform: `scale(${0.6 + pop * 0.4})`,
        opacity,
        textShadow: "0 4px 20px rgba(0,0,0,0.55)",
      }}
    >
      {active.text}
    </div>
  );
};

/** Giant popping, continuously waving hand — the "찾으신 분? ✋" beat. */
export const HandWave: React.FC<{ delayFrames: number }> = ({ delayFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const pop = spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 9 } });
  const wave = Math.sin((local / fps) * Math.PI * 2 * 1.6) * 15;

  return (
    <div
      style={{
        position: "absolute",
        fontSize: 260,
        transform: `scale(${pop * 1.5}) rotate(${wave}deg)`,
        transformOrigin: "70% 90%",
      }}
    >
      ✋
    </div>
  );
};

/** Wraps children, applying the "aggressive crash zoom" over the full duration. */
export const CrashZoom: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})` }}>{children}</div>;
};

/** Half-screen-wide confused face: continuous rotation + pulsate, no entrance gate (fills the whole silent beat). */
export const GiantConfusedEmoji: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rotate = (frame / fps) * 40; // slow continuous spin
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 2 * 1.1) * 0.08;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ transform: `rotate(${rotate}deg) scale(${pulse})` }}
    >
      <circle cx="50" cy="50" r="42" fill={COLORS.accent} stroke={COLORS.text} strokeWidth="2.4" />
      {[35, 65].map((cx) => (
        <path
          key={cx}
          d={`M ${cx} 42 m -7,0 a 7,7 0 1,0 14,0 a 4,4 0 1,0 -8,0 a 2,2 0 1,0 4,0`}
          fill="none"
          stroke={COLORS.cardText}
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ))}
      <path
        d="M 30 65 Q 38 58 46 65 Q 54 72 62 65 Q 70 58 78 65"
        fill="none"
        stroke={COLORS.cardText}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M 80 28 Q 86 36 80 42 Q 74 36 80 28 Z" fill="#7FD8FF" stroke={COLORS.text} strokeWidth="1.2" />
    </svg>
  );
};

/**
 * "I'm" / "going" / "to" slam-merge into "I'mma". Three word cards start
 * spread wide, slide to X-centre with a low-damping (bouncy/"쿵") spring, and
 * are swapped for the single merged token once the slide lands.
 */
export const MagnetMerge: React.FC<{ triggerFrame: number; onImpact?: (frame: number) => void }> = ({
  triggerFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - triggerFrame;
  if (local < 0) {
    return null;
  }

  const slideDuration = Math.round(0.6 * fps);
  const slide = spring({ frame: local, fps, durationInFrames: slideDuration, config: { damping: 9 } });
  const impactFrame = slideDuration;
  const merged = local >= impactFrame;

  const wordStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    fontFamily: FONT_EN,
    fontWeight: 800,
    fontSize: FONT_SIZES.wordCard,
    color: COLORS.text,
    textShadow: "0 4px 20px rgba(0,0,0,0.6)",
  };

  if (merged) {
    const mergeLocal = local - impactFrame;
    const impactPop = spring({ frame: mergeLocal, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 8 } });
    return (
      <div
        style={{
          position: "relative",
          display: "inline-block",
          transform: `scale(${0.7 + impactPop * 0.3})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: -FONT_SIZES.mergedToken * 0.18,
            background: COLORS.accent,
            borderRadius: FONT_SIZES.mergedToken * 0.12,
            border: `4px solid ${COLORS.text}`,
          }}
        />
        <div
          style={{
            position: "relative",
            fontFamily: FONT_EN,
            fontWeight: 800,
            fontStyle: "italic",
            fontSize: FONT_SIZES.mergedToken,
            color: COLORS.cardText,
            padding: `${FONT_SIZES.mergedToken * 0.08}px ${FONT_SIZES.mergedToken * 0.3}px`,
            whiteSpace: "nowrap",
          }}
        >
          I&apos;mma
        </div>
      </div>
    );
  }

  const spread = (1 - slide) * 420;
  return (
    <div style={{ position: "relative", width: 900, height: 160 }}>
      <div style={{ ...wordStyle, left: "50%", transform: `translate(${-260 - spread - 90}%, -50%)`, opacity: interpolate(slide, [0, 1], [1, 0.9]) }}>
        I&apos;m
      </div>
      <div style={{ ...wordStyle, left: "50%", transform: `translate(-50%, -50%)` }}>going</div>
      <div style={{ ...wordStyle, left: "50%", transform: `translate(${160 + spread + 90}%, -50%)`, opacity: interpolate(slide, [0, 1], [1, 0.9]) }}>
        to
      </div>
    </div>
  );
};

/** Full-frame neon border flash, fired once at a given frame. */
export const NeonPulseFlash: React.FC<{ atFrame: number }> = ({ atFrame }) => {
  const frame = useCurrentFrame();
  const local = frame - atFrame;
  if (local < 0 || local > 20) {
    return null;
  }
  const opacity = interpolate(local, [0, 4, 20], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        boxShadow: `inset 0 0 120px 40px ${COLORS.neon}`,
        opacity,
      }}
    />
  );
};

/** Text block sliding up from below ("rolling" kinetic typography). */
export const KineticSlideUpPhrase: React.FC<{ cues: SubtitleCue[]; fontSize?: number }> = ({
  cues,
  fontSize = FONT_SIZES.phrase,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const active = cues.find((c) => frame >= c.from && frame <= c.to);
  if (!active) {
    return null;
  }
  const local = frame - active.from;
  const rise = spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 16 } });

  return (
    <div
      style={{
        textAlign: "center",
        fontFamily: FONT_KO,
        fontWeight: 800,
        fontSize,
        color: COLORS.text,
        lineHeight: 1.3,
        wordBreak: "keep-all",
        transform: `translateY(${(1 - rise) * 70}px)`,
        opacity: rise,
        textShadow: "0 4px 20px rgba(0,0,0,0.55)",
      }}
    >
      {active.text}
    </div>
  );
};

/** Fixed bottom-safe-area caption, fading in once (used for the final summary line). */
export const BottomCaptionBar: React.FC<{ text: string; visible: boolean }> = ({ text, visible }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.round(0.6 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (!visible) {
    return null;
  }
  return (
    <div
      style={{
        position: "absolute",
        bottom: height * 0.08,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily: FONT_KO,
        fontWeight: 700,
        fontSize: FONT_SIZES.caption,
        color: COLORS.text,
        opacity,
        textShadow: "0 3px 14px rgba(0,0,0,0.6)",
      }}
    >
      {text}
    </div>
  );
};

/** Top-centre persistent caption pill for Scene 1 — 1.6x the usual banner size. */
export const AnswerKeyBanner: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 56,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        background: "rgba(10,10,14,0.75)",
        border: `2px solid ${COLORS.text}`,
        borderRadius: 999,
        padding: "22px 42px",
        fontFamily: FONT_EN,
        fontWeight: 700,
        fontSize: FONT_SIZES.caption * 1.6,
      }}
    >
      <span style={{ color: COLORS.wrong }}>아이 엄마..? ❌</span>
      <span style={{ color: "rgba(255,255,255,0.5)" }}>|</span>
      <span style={{ color: COLORS.right }}>I&apos;m going to ⭕</span>
    </div>
  </div>
);

/** Top-left emblem badge for Scene 2 — "시즌2 EP1". */
export const SeasonEmblem: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 48,
      left: 64,
      display: "flex",
      alignItems: "center",
      gap: 14,
      background: COLORS.accent,
      borderRadius: 16,
      padding: "14px 26px",
      transform: "rotate(-2deg)",
      boxShadow: "0 10px 26px rgba(0,0,0,0.4)",
    }}
  >
    <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize: 34, color: COLORS.cardText }}>
      시즌2 EP1
    </span>
  </div>
);

/** Giant scale-pop title with overshoot, then a 3D flip-in subtitle beneath it. */
export const TitlePopWithFlip: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titlePop = spring({ frame, fps, durationInFrames: Math.round(0.6 * fps), config: { damping: 10 } });
  const flipDelay = Math.round(0.35 * fps);
  const flipLocal = frame - flipDelay;
  const flip = spring({ frame: flipLocal, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 12 } });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
      <div
        style={{
          fontFamily: FONT_KO,
          fontWeight: 900,
          fontSize: FONT_SIZES.titleGiant,
          color: COLORS.text,
          textAlign: "center",
          wordBreak: "keep-all",
          transform: `scale(${0.4 + titlePop * 0.8})`,
          textShadow: "0 6px 30px rgba(0,0,0,0.6)",
        }}
      >
        {title}
      </div>
      {flipLocal >= 0 && (
        <div
          style={{
            fontFamily: FONT_EN,
            fontWeight: 700,
            fontSize: FONT_SIZES.subtitleFlip,
            color: COLORS.accent,
            transform: `perspective(600px) rotateX(${(1 - flip) * 90}deg)`,
            opacity: flip,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

const RECAP_WORDS = ["NATION", "EDUCATION", "PICTURE", "SPECIAL"];

/** Season-1 recap: word cards swiping in from the right, staggered. */
export const CardSwipeRow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  return (
    <div style={{ display: "flex", gap: 28 }}>
      {RECAP_WORDS.map((word, i) => {
        const delay = i * 6;
        const local = frame - delay;
        const slide = spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 14 } });
        return (
          <div
            key={word}
            style={{
              background: COLORS.cardBg,
              borderRadius: 20,
              padding: "22px 34px",
              boxShadow: "0 14px 34px rgba(0,0,0,0.4)",
              transform: `translateX(${(1 - slide) * width * 0.3}px)`,
              opacity: slide,
            }}
          >
            <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize: 44, color: COLORS.cardText }}>
              {word}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Sample sentence zooming in, with a thick neon "chain link" between two words. */
export const SentenceZoomFocus: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.3], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ transform: `scale(${scale})`, display: "flex", alignItems: "center", gap: 0 }}>
      <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize: FONT_SIZES.sentenceZoom, color: COLORS.text }}>
        I&apos;m
      </span>
      <svg width="90" height="40" viewBox="0 0 90 40" style={{ margin: "0 4px" }}>
        <rect x="4" y="14" width="82" height="12" rx="6" fill={COLORS.neon} opacity={0.9} />
        <circle cx="12" cy="20" r="10" fill="none" stroke={COLORS.neon} strokeWidth="6" />
        <circle cx="78" cy="20" r="10" fill="none" stroke={COLORS.neon} strokeWidth="6" />
      </svg>
      <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize: FONT_SIZES.sentenceZoom, color: COLORS.text }}>
        going to
      </span>
    </div>
  );
};

/** Full-width neon-glow season title reveal. */
export const GlowTitleReveal: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.6 * fps), config: { damping: 11 } });
  const glow = 20 + Math.sin((frame / fps) * Math.PI * 2) * 10;

  return (
    <div
      style={{
        fontFamily: FONT_KO,
        fontWeight: 900,
        fontSize: FONT_SIZES.glowTitle,
        color: COLORS.text,
        textAlign: "center",
        wordBreak: "keep-all",
        transform: `scale(${0.7 + pop * 0.3})`,
        textShadow: `0 0 ${glow}px ${COLORS.neon}, 0 0 ${glow * 2}px ${COLORS.neon}`,
      }}
    >
      {text}
    </div>
  );
};

/** Whole-frame wipe-left, applied over a sequence's last N frames. */
export const WipeOut: React.FC<{ children: React.ReactNode; startFrame: number; durationInFrames: number }> = ({
  children,
  startFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const local = frame - startFrame;
  const progress =
    local < 0
      ? 0
      : interpolate(local, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return <div style={{ position: "absolute", inset: 0, transform: `translateX(${-progress * width}px)` }}>{children}</div>;
};
