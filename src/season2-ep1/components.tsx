import React from "react";
import { Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ding, uiSwitch, whoosh } from "@remotion/sfx";
import { CARD_3D_SHADOW, COLORS, FONT_SIZES, SAFE_INSET, TIMING } from "./theme";
import { FONT_EN, FONT_KO } from "./fonts";
import type { SubtitleCue } from "./types";

/**
 * The spec's ~30 named SFX files (Whoosh_Intro.mp3, Sub_Bass_Boom.mp3, ...)
 * don't exist in this project. Substituted with @remotion/sfx's three
 * available sounds, mapped by function: ding = impact/reveal, uiSwitch =
 * tick/click, whoosh = swoosh/transition. Volume matches the ducking level
 * the spec asks for elsewhere (narration stays dominant).
 */
const sfxVolume = () => 0.5;

// ---------- Layout ----------

/** Fixed-pixel safe area (left/right 200px, top/bottom 150px) — see spec section 1. */
export const SafeZone: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      left: SAFE_INSET.x,
      top: SAFE_INSET.y,
      right: SAFE_INSET.x,
      bottom: SAFE_INSET.y,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...style,
    }}
  >
    {children}
  </div>
);

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 137.5) % 100,
  y: (i * 71.3) % 100,
  size: 4 + (i % 5) * 2,
  speed: 0.5 + (i % 4) * 0.2,
  phase: i * 0.7,
}));

/** Persistent painted background: gradient + slow floating particles. */
export const SceneBackground: React.FC<{ hueShiftFrom?: number }> = ({ hueShiftFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
};

// ---------- Text ----------

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

export const CaptionRow: React.FC<{ cues: SubtitleCue[] }> = ({ cues }) => (
  <div style={{ position: "absolute", bottom: 70, left: 0, right: 0 }}>
    <KineticSlideUpPhrase cues={cues} fontSize={40} />
  </div>
);

export const BottomCaptionBar: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const opacity = interpolate(frame, [0, Math.round(0.6 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
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

/** Top-left persistent badge — episode caption, section labels, etc. */
export const TopLeftBadge: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      top: 48,
      left: 64,
      background: COLORS.accent,
      borderRadius: 16,
      padding: "14px 26px",
      transform: "rotate(-2deg)",
      boxShadow: "0 10px 26px rgba(0,0,0,0.4)",
    }}
  >
    <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize: 34, color: COLORS.cardText }}>
      {text}
    </span>
  </div>
);

// ---------- Cards ----------

/** The spec's recurring "3D app button" card: rounded corners, deep offset shadow. */
export const Card3D: React.FC<{
  children: React.ReactNode;
  background?: string;
  style?: React.CSSProperties;
}> = ({ children, background = COLORS.cardBg, style }) => (
  <div
    style={{
      background,
      borderRadius: 24,
      padding: "24px 40px",
      boxShadow: CARD_3D_SHADOW,
      ...style,
    }}
  >
    {children}
  </div>
);

export const EnglishCardLabel: React.FC<{ text: string; fontSize?: number; color?: string }> = ({
  text,
  fontSize = FONT_SIZES.wordCard,
  color = COLORS.cardText,
}) => (
  <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize, color, whiteSpace: "nowrap" }}>
    {text}
  </span>
);

// ---------- Merge mechanic (Scenes 1, 5, 8) ----------

/**
 * N word cards slide from a spread-out pre-layout to X-centre and slam
 * together into one merged token. Pre-layout (no travel delay) per the
 * spec's "사전 배치" rule — cards already sit near the merge point before
 * the trigger, so only the final snap needs to read.
 */
export const MergeWords: React.FC<{
  words: string[];
  mergedText: string;
  triggerFrame: number;
  fontSize?: number;
  mergedFontSize?: number;
  gapPx?: number;
}> = ({
  words,
  mergedText,
  triggerFrame,
  fontSize = FONT_SIZES.wordCard,
  mergedFontSize = FONT_SIZES.mergedToken,
  gapPx = 60,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - triggerFrame;
  const slideDuration = Math.round(0.5 * fps);
  const impactSfx = (
    <Sequence from={triggerFrame + slideDuration}>
      <Audio src={ding} volume={sfxVolume} />
    </Sequence>
  );

  if (local < 0) {
    return (
      <>
        <div style={{ display: "flex", gap: gapPx }}>
          {words.map((w, i) => (
            <Card3D key={i}>
              <EnglishCardLabel text={w} fontSize={fontSize} />
            </Card3D>
          ))}
        </div>
        {impactSfx}
      </>
    );
  }

  const slide = spring({ frame: local, fps, durationInFrames: slideDuration, config: { damping: 9 } });
  const merged = local >= slideDuration;

  if (merged) {
    const mergeLocal = local - slideDuration;
    const impactPop = spring({ frame: mergeLocal, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 8 } });
    const pulse = 1 + Math.sin((mergeLocal / fps) * Math.PI * 2 * 0.8) * 0.03;
    return (
      <>
        <div style={{ transform: `scale(${(0.7 + impactPop * 0.3) * pulse})` }}>
          <Card3D background={COLORS.accent}>
            <EnglishCardLabel text={mergedText} fontSize={mergedFontSize} color={COLORS.cardText} />
          </Card3D>
        </div>
        {impactSfx}
      </>
    );
  }

  const blur = interpolate(slide, [0, 1], [0, 25], { extrapolateRight: "clamp" });
  return (
    <>
      <div style={{ display: "flex", gap: gapPx * (1 - slide), filter: `blur(${blur}px)` }}>
        {words.map((w, i) => (
          <Card3D key={i}>
            <EnglishCardLabel text={w} fontSize={fontSize} />
          </Card3D>
        ))}
      </div>
      {impactSfx}
    </>
  );
};

/** Yellow highlighter underline that draws left-to-right beneath text. */
export const UnderlineHighlight: React.FC<{ width: number; delayFrames: number }> = ({
  width,
  delayFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const progress = interpolate(local, [0, Math.round(0.6 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        bottom: -14,
        left: 0,
        width: width * progress,
        height: 14,
        background: "#F5C518",
        opacity: 0.8,
        borderRadius: 4,
      }}
    />
  );
};

// ---------- Scene 1 beats ----------

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
    <div style={{ position: "absolute", fontSize: 260, transform: `scale(${pop * 1.5}) rotate(${wave}deg)`, transformOrigin: "70% 90%" }}>
      ✋
    </div>
  );
};

export const CrashZoom: React.FC<{ children: React.ReactNode; durationInFrames: number }> = ({
  children,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})` }}>
      {children}
      <Audio src={whoosh} volume={sfxVolume} />
    </div>
  );
};

export const GiantConfusedEmoji: React.FC<{ size: number }> = ({ size }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rotate = (frame / fps) * 40;
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 2 * 1.1) * 0.08;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: `rotate(${rotate}deg) scale(${pulse})` }}>
      <circle cx="50" cy="50" r="42" fill={COLORS.accent} stroke={COLORS.text} strokeWidth="2.4" />
      {[35, 65].map((cx) => (
        <path key={cx} d={`M ${cx} 42 m -7,0 a 7,7 0 1,0 14,0 a 4,4 0 1,0 -8,0 a 2,2 0 1,0 4,0`} fill="none" stroke={COLORS.cardText} strokeWidth="2.2" strokeLinecap="round" />
      ))}
      <path d="M 30 65 Q 38 58 46 65 Q 54 72 62 65 Q 70 58 78 65" fill="none" stroke={COLORS.cardText} strokeWidth="3" strokeLinecap="round" />
      <path d="M 80 28 Q 86 36 80 42 Q 74 36 80 28 Z" fill="#7FD8FF" stroke={COLORS.text} strokeWidth="1.2" />
    </svg>
  );
};

export const NeonPulseFlash: React.FC<{ atFrame: number }> = ({ atFrame }) => {
  const frame = useCurrentFrame();
  const local = frame - atFrame;
  if (local < 0 || local > 20) {
    return null;
  }
  const opacity = interpolate(local, [0, 4, 20], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 120px 40px ${COLORS.neon}`, opacity }} />;
};

// ---------- Scene 2 ----------

export const TitlePopWithFlip: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titlePop = spring({ frame, fps, durationInFrames: Math.round(0.6 * fps), config: { damping: 10 } });
  const flipDelay = Math.round(0.35 * fps);
  const flipLocal = frame - flipDelay;
  const flip = spring({ frame: flipLocal, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 12 } });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 36 }}>
      <div style={{ fontFamily: FONT_KO, fontWeight: 900, fontSize: FONT_SIZES.titleGiant, color: COLORS.text, textAlign: "center", wordBreak: "keep-all", transform: `scale(${0.4 + titlePop * 0.8})`, textShadow: "0 6px 30px rgba(0,0,0,0.6)" }}>
        {title}
      </div>
      {flipLocal >= 0 && (
        <div style={{ fontFamily: FONT_EN, fontWeight: 700, fontSize: FONT_SIZES.subtitleFlip, color: COLORS.accent, transform: `perspective(600px) rotateX(${(1 - flip) * 90}deg)`, opacity: flip }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};

export const CardSwipeRow: React.FC<{ words: string[] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  return (
    <div style={{ display: "flex", gap: 28 }}>
      {words.map((word, i) => {
        const delay = i * 6;
        const local = frame - delay;
        const slide = spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 14 } });
        return (
          <div key={word} style={{ transform: `translateX(${(1 - slide) * width * 0.3}px)`, opacity: slide }}>
            <Card3D>
              <EnglishCardLabel text={word} fontSize={44} />
            </Card3D>
          </div>
        );
      })}
    </div>
  );
};

export const SentenceZoomFocus: React.FC<{ durationInFrames: number; left: string; right: string }> = ({
  durationInFrames,
  left,
  right,
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ transform: `scale(${scale})`, display: "flex", alignItems: "center" }}>
      <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize: FONT_SIZES.sentenceZoom, color: COLORS.text }}>{left}</span>
      <svg width="90" height="40" viewBox="0 0 90 40" style={{ margin: "0 4px" }}>
        <rect x="4" y="14" width="82" height="12" rx="6" fill={COLORS.neon} opacity={0.9} />
        <circle cx="12" cy="20" r="10" fill="none" stroke={COLORS.neon} strokeWidth="6" />
        <circle cx="78" cy="20" r="10" fill="none" stroke={COLORS.neon} strokeWidth="6" />
      </svg>
      <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize: FONT_SIZES.sentenceZoom, color: COLORS.text }}>{right}</span>
    </div>
  );
};

export const GlowTitleReveal: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.6 * fps), config: { damping: 11 } });
  const glow = 20 + Math.sin((frame / fps) * Math.PI * 2) * 10;
  return (
    <div style={{ fontFamily: FONT_KO, fontWeight: 900, fontSize: FONT_SIZES.glowTitle, color: COLORS.text, textAlign: "center", wordBreak: "keep-all", transform: `scale(${0.7 + pop * 0.3})`, textShadow: `0 0 ${glow}px ${COLORS.neon}, 0 0 ${glow * 2}px ${COLORS.neon}` }}>
      {text}
    </div>
  );
};

export const WipeOut: React.FC<{ children: React.ReactNode; startFrame: number; durationInFrames: number }> = ({
  children,
  startFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const local = frame - startFrame;
  const progress = local < 0 ? 0 : interpolate(local, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${-progress * width}px)` }}>
      {children}
      <Sequence from={startFrame}>
        <Audio src={whoosh} volume={sfxVolume} />
      </Sequence>
    </div>
  );
};

// ---------- Scene 3: content words vs function words ----------

/** Heavy, saturated card for a meaning-bearing word — drops in with a hard spring landing. */
export const ContentWordCard: React.FC<{ text: string; delayFrames: number }> = ({ text, delayFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const drop = spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 9 } });
  return (
    <div style={{ transform: `translateY(${(1 - drop) * -300}px)`, opacity: drop }}>
      <Card3D background={COLORS.accent}>
        <EnglishCardLabel text={text} fontSize={64} color={COLORS.cardText} />
      </Card3D>
    </div>
  );
};

/** Light, translucent pill for a function word — floats like a balloon, ~40% the size. */
export const FunctionWordPill: React.FC<{ text: string; index: number }> = ({ text, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame: frame - index * 4, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 14 } });
  const t = frame / fps;
  const floatX = Math.sin(t * 0.9 + index) * 10;
  const floatY = Math.cos(t * 0.7 + index * 1.3) * 12;
  return (
    <div style={{ opacity: 0.55 * entrance, transform: `translate(${floatX}px, ${floatY}px) scale(${entrance})` }}>
      <div style={{ background: "rgba(255,255,255,0.14)", border: `2px solid ${COLORS.functionWord}`, borderRadius: 999, padding: "12px 26px" }}>
        <EnglishCardLabel text={text} fontSize={26} color={COLORS.text} />
      </div>
    </div>
  );
};

/** 3D seesaw: content-word side sinks, function-word side lifts. */
export const Seesaw: React.FC<{ tiltFrom: number }> = ({ tiltFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - tiltFrom;
  const tilt = local < 0 ? 0 : spring({ frame: local, fps, durationInFrames: Math.round(0.8 * fps), config: { damping: 10 } });
  const angle = tilt * 14;
  return (
    <div style={{ position: "relative", width: 700, height: 220 }}>
      <div style={{ position: "absolute", left: "50%", bottom: 0, width: 16, height: 90, background: "#555", transform: "translateX(-50%)", borderRadius: 6 }} />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 90,
          width: 640,
          height: 18,
          background: COLORS.text,
          borderRadius: 10,
          transform: `translate(-50%, 0) rotate(${angle}deg)`,
          transformOrigin: "50% 50%",
        }}
      />
    </div>
  );
};

// ---------- Scene 4: rhythm ----------

/** Swinging metronome bar with function words squeezed as it passes. */
export const MetronomeBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const swing = Math.sin((frame / fps) * Math.PI * 1.2) * 30;
  return (
    <svg width="260" height="220" viewBox="0 0 260 220">
      <path d="M 130 200 L 90 30" stroke={COLORS.accent} strokeWidth="8" strokeLinecap="round" transform={`rotate(${swing} 130 200)`} />
      <circle cx="130" cy="200" r="14" fill={COLORS.text} />
      <circle cx="90" cy="30" r="12" fill={COLORS.accent} transform={`rotate(${swing} 130 200)`} />
    </svg>
  );
};

export const SqueezeFunctionWord: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const squeeze = 0.7 + Math.abs(Math.sin((frame / fps) * Math.PI * 1.2)) * 0.3;
  return (
    <div style={{ transform: `scaleX(${squeeze})`, transformOrigin: "center" }}>
      <EnglishCardLabel text={text} fontSize={54} color={COLORS.functionWord} />
    </div>
  );
};

export const SlowFastToggle: React.FC<{ delayFrames: number }> = ({ delayFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const beat = Math.floor(local / (fps * 1.2)) % 2;
  const bounce = spring({ frame: local % Math.round(fps * 1.2), fps, durationInFrames: Math.round(0.3 * fps), config: { damping: 8 } });
  const isSlow = beat === 0;
  return (
    <div style={{ transform: `scale(${1 + bounce * 0.15})` }}>
      <Card3D background={isSlow ? "#4FC3F7" : "#FF5A5A"}>
        <span style={{ fontFamily: FONT_KO, fontWeight: 800, fontSize: 60, color: "#141414" }}>
          {isSlow ? "천천히 🔵" : "빠르게 ⚡"}
        </span>
      </Card3D>
    </div>
  );
};

export const SchwaMark: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.6 * fps), config: { damping: 9 } });
  const spin = interpolate(frame, [0, fps * 1.2], [0, 360], { extrapolateRight: "clamp" });
  return (
    <div style={{ transform: `scale(${pop}) rotateY(${spin}deg)`, fontFamily: FONT_EN, fontWeight: 900, fontSize: 160, color: COLORS.accent, textShadow: `0 0 40px ${COLORS.neon}` }}>
      ə
    </div>
  );
};

// ---------- Scene 6: rhythm grid ----------

export const SyllableGrid: React.FC<{ syllables: string[] }> = ({ syllables }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {syllables.map((s, i) => {
        const local = frame - i * 4;
        const scale = local < 0 ? 0 : 1;
        return (
          <div key={i} style={{ opacity: scale, transform: `scale(${scale})`, width: 70, height: 70, background: COLORS.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: FONT_KO, fontWeight: 800, fontSize: 32, color: COLORS.cardText }}>{s}</span>
          </div>
        );
      })}
    </div>
  );
};

export const StretchTrack: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
    <div style={{ width: 260, height: 90, background: COLORS.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <EnglishCardLabel text="want" fontSize={44} color={COLORS.cardText} />
    </div>
    <div style={{ width: 30, height: 8, background: COLORS.functionWord, opacity: 0.6 }} />
    <div style={{ width: 300, height: 90, background: COLORS.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <EnglishCardLabel text="going" fontSize={44} color={COLORS.cardText} />
    </div>
    <div style={{ width: 30, height: 8, background: COLORS.functionWord, opacity: 0.6 }} />
    <div style={{ width: 40, height: 30, background: COLORS.functionWord, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <EnglishCardLabel text="to" fontSize={18} color={COLORS.text} />
    </div>
  </div>
);

// ---------- Quiz mechanics (Scenes 7, 8) ----------

export const QuizCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 10 } });
  const bob = Math.sin((frame / fps) * Math.PI * 2 * 0.6) * 8;
  return (
    <div style={{ transform: `scale(${0.6 + pop * 0.4}) translateY(${bob}px)` }}>
      <Card3D background="#2A3B5C" style={{ borderRadius: 40 }}>
        <span style={{ fontFamily: FONT_KO, fontWeight: 800, fontSize: FONT_SIZES.quizWord, color: COLORS.text }}>
          ❓ {text} ❓
        </span>
      </Card3D>
    </div>
  );
};

/** Circular progress countdown, 10 -> 1, one digit bounce per second. Silent beat (no narration). */
export const CountdownCircle: React.FC<{ seconds: number }> = ({ seconds }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = seconds * fps;
  const digit = Math.max(1, seconds - Math.floor(frame / fps));
  const inBeat = frame % fps;
  const bounce = spring({ frame: inBeat, fps, durationInFrames: Math.round(fps * 0.5), config: { damping: 8 } });
  const progress = interpolate(frame, [0, totalFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const r = 130;
  const circumference = 2 * Math.PI * r;

  return (
    <div style={{ position: "relative", width: 300, height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={300} height={300} style={{ position: "absolute", transform: "rotate(-90deg)" }}>
        <circle cx={150} cy={150} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={16} />
        <circle
          cx={150}
          cy={150}
          r={r}
          fill="none"
          stroke={COLORS.accent}
          strokeWidth={16}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize: 140, color: COLORS.text, transform: `scale(${1 + bounce * 0.2})` }}>
        {digit}
      </span>
      {Array.from({ length: seconds }).map((_, i) => (
        <Sequence key={i} from={i * fps}>
          <Audio src={uiSwitch} volume={sfxVolume} />
        </Sequence>
      ))}
    </div>
  );
};

export const CircleMark: React.FC<{ delayFrames: number; size: number }> = ({ delayFrames, size }) => {
  const frame = useCurrentFrame();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const progress = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const r = size / 2 - 8;
  const circumference = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ position: "absolute", inset: 0 }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#FF5A5A"
        strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
};

// ---------- Scene 9: summary cards ----------

export const SummaryCard: React.FC<{ text: string; delayFrames: number }> = ({ text, delayFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const drop = spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 13 } });
  return (
    <div style={{ transform: `translateY(${(1 - drop) * -260}px)`, opacity: drop, position: "relative", width: 1000 }}>
      <Card3D style={{ width: "100%", textAlign: "center" }}>
        <span style={{ fontFamily: FONT_KO, fontWeight: 700, fontSize: 40, color: COLORS.cardText }}>{text}</span>
      </Card3D>
    </div>
  );
};

export const MasterSummaryCard: React.FC<{ text: string; delayFrames: number }> = ({ text, delayFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const pop = spring({ frame: local, fps, durationInFrames: Math.round(0.6 * fps), config: { damping: 10 } });
  return (
    <div style={{ transform: `scale(${0.7 + pop * 0.3})`, opacity: pop }}>
      <Card3D background={COLORS.accent} style={{ padding: "40px 64px" }}>
        <span style={{ fontFamily: FONT_KO, fontWeight: 900, fontSize: 60, color: COLORS.cardText, textAlign: "center", display: "block" }}>
          {text}
        </span>
      </Card3D>
    </div>
  );
};

// ---------- Scene 10: teaser ----------

export const DissolvingWord: React.FC<{ text: string; dissolveFrom: number; index: number }> = ({
  text,
  dissolveFrom,
  index,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const floatY = Math.sin(t * 0.8 + index) * 10;
  const local = frame - dissolveFrom;
  const opacity = local < 0 ? 1 : interpolate(local, [0, Math.round(0.6 * fps)], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = local < 0 ? 0 : interpolate(local, [0, Math.round(0.6 * fps)], [0, 16], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity, filter: `blur(${blur}px)`, transform: `translateY(${floatY}px)` }}>
      <Card3D>
        <EnglishCardLabel text={text} fontSize={52} />
      </Card3D>
    </div>
  );
};

export const TeaserCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.6 * fps), config: { damping: 10 } });
  const breathe = 1 + Math.sin((frame / fps) * Math.PI * 2 * 0.4) * 0.03;
  return (
    <div style={{ transform: `scale(${(0.6 + pop * 0.4) * breathe})` }}>
      <Card3D background={COLORS.accent} style={{ padding: "40px 60px" }}>
        <span style={{ fontFamily: FONT_KO, fontWeight: 800, fontSize: 52, color: COLORS.cardText, textAlign: "center", display: "block", wordBreak: "keep-all" }}>
          {text}
        </span>
      </Card3D>
    </div>
  );
};
