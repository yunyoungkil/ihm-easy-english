import React from "react";
import { Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ding, uiSwitch, whoosh } from "@remotion/sfx";
import { CAPTION_SHADOW, CARD_3D_SHADOW, COLORS, FONT_SIZES, SAFE_INSET, TIMING } from "./theme";
import { FONT_EN, FONT_KO } from "./fonts";
import type { SubtitleCue } from "./types";

/**
 * The spec's ~30 named SFX files don't exist in this project. Substituted
 * with @remotion/sfx's three available sounds: ding = impact/reveal,
 * uiSwitch = tick/click, whoosh = swoosh/transition.
 */
const sfxVolume = () => 0.5;

// ---------- Layout ----------

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

export const SceneBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(160deg, ${COLORS.bgTop} 0%, ${COLORS.bgBottom} 100%)`,
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
        textShadow: CAPTION_SHADOW,
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
        textShadow: CAPTION_SHADOW,
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
  fontSize = FONT_SIZES.masterWord,
  color = COLORS.cardText,
}) => (
  <span style={{ fontFamily: FONT_EN, fontWeight: 800, fontSize, color, whiteSpace: "nowrap" }}>
    {text}
  </span>
);

// ---------- Master / slave word contrast (this episode's core visual) ----------

/** The "주인님" word — huge, glowing gold card with a crown emoji, spring-pop entrance. */
export const MasterWordCard: React.FC<{ text: string; scale?: number; delayFrames?: number }> = ({
  text,
  scale = 1,
  delayFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const pop = local < 0 ? 0 : spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 9 } });
  const glow = 16 + Math.sin((frame / fps) * Math.PI * 2 * 0.6) * 8;

  return (
    <div
      style={{
        transform: `scale(${(0.5 + pop * 0.5) * scale})`,
      }}
    >
      <Card3D background={COLORS.master} style={{ boxShadow: `${CARD_3D_SHADOW}, 0 0 ${glow}px ${COLORS.master}` }}>
        <EnglishCardLabel text={`👑 ${text}`} fontSize={FONT_SIZES.masterWord} color={COLORS.cardText} />
      </Card3D>
    </div>
  );
};

/** The "노예" word — thin, translucent, near-weightless, floats limply. */
export const SlaveWordCard: React.FC<{ text: string; scale?: number; delayFrames?: number }> = ({
  text,
  scale = 1,
  delayFrames = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  const entrance = local < 0 ? 0 : spring({ frame: local, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 14 } });
  const t = frame / fps;
  const wobble = Math.sin(t * 1.1) * 6;

  return (
    <div style={{ opacity: 0.55 * entrance, transform: `scale(${entrance * scale}) translateY(${wobble}px)` }}>
      <div
        style={{
          background: "rgba(255,255,255,0.08)",
          border: `2px solid ${COLORS.slave}`,
          borderRadius: 999,
          padding: "14px 34px",
        }}
      >
        <EnglishCardLabel text={text} fontSize={FONT_SIZES.slaveWord} color={COLORS.text} />
      </div>
    </div>
  );
};

/** Master + slave side by side, with an imbalance pulse growing master / shrinking slave. */
export const MasterSlavePair: React.FC<{
  master: string;
  slave: string;
  imbalanceFrom?: number;
}> = ({ master, slave, imbalanceFrom }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imbalance =
    imbalanceFrom === undefined
      ? 0
      : spring({ frame: frame - imbalanceFrom, fps, durationInFrames: Math.round(1 * fps), config: { damping: 12 } });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 80 }}>
      <MasterWordCard text={master} scale={1 + imbalance * 0.3} />
      <SlaveWordCard text={slave} scale={1 - imbalance * 0.5} />
    </div>
  );
};

/** 기능어 card in chains — Scene 1's "기능어" reveal. */
export const ChainedFunctionCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 8 } });
  const bounce = Math.sin((frame / fps) * Math.PI * 2 * 1.0) * 6;

  return (
    <div style={{ position: "relative", transform: `scale(${0.5 + pop * 0.5}) translateY(${bounce}px)` }}>
      <Card3D background={COLORS.accent}>
        <EnglishCardLabel text={`⛓️ '${text}'`} fontSize={FONT_SIZES.masterWord * 0.75} color={COLORS.cardText} />
      </Card3D>
      <UnderlineHighlight width={420} delayFrames={10} />
    </div>
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

/** Detective magnifying glass — Scene 1's silent quiz-hold beat. */
export const MagnifyingGlassPulse: React.FC<{ size?: number }> = ({ size = 260 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 8 } });
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 2 * 0.8) * 0.1;
  return <div style={{ fontSize: size, transform: `scale(${pop * pulse})` }}>🕵️‍♂️</div>;
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

/** N word chips dissolving into smoke — Scene 1's opening "to / of / a / the". */
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
      <Card3D background="#3A4258">
        <EnglishCardLabel text={text} fontSize={52} color={COLORS.text} />
      </Card3D>
    </div>
  );
};

// ---------- Merge mechanic (Scenes 3, 4, 5) ----------

/**
 * Two word cards slam together into a single merged token, coloured per the
 * episode's per-word palette (gold wanna / green gonna / red gotta).
 */
export const MergeWords: React.FC<{
  left: string;
  right: string;
  mergedText: string;
  mergedColor: string;
  triggerFrame: number;
  fontSize?: number;
  mergedFontSize?: number;
}> = ({ left, right, mergedText, mergedColor, triggerFrame, fontSize = FONT_SIZES.masterWord, mergedFontSize = FONT_SIZES.mergedToken }) => {
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
        <div style={{ display: "flex", gap: 60 }}>
          <Card3D>
            <EnglishCardLabel text={left} fontSize={fontSize} />
          </Card3D>
          <Card3D background="rgba(255,255,255,0.1)">
            <EnglishCardLabel text={right} fontSize={fontSize * 0.6} color={COLORS.slave} />
          </Card3D>
        </div>
        {impactSfx}
      </>
    );
  }

  const slide = spring({ frame: local, fps, durationInFrames: slideDuration, config: { damping: 9 } });
  const merged = local >= slideDuration;

  if (merged) {
    const mergeLocal = local - slideDuration;
    const impactPop = spring({ frame: mergeLocal, fps, durationInFrames: Math.round(0.4 * fps), config: { damping: 7 } });
    const heartbeat = 1 + Math.sin((mergeLocal / fps) * Math.PI * 2 * 0.9) * 0.05;
    return (
      <>
        <div style={{ position: "relative", transform: `scale(${(0.7 + impactPop * 0.3) * heartbeat})` }}>
          <Card3D background={mergedColor}>
            <EnglishCardLabel text={mergedText} fontSize={mergedFontSize} color={COLORS.cardText} />
          </Card3D>
          <UnderlineHighlight width={mergedFontSize * mergedText.length * 0.55} delayFrames={mergeLocal >= 0 ? 0 : 999} />
        </div>
        {impactSfx}
      </>
    );
  }

  const blur = interpolate(slide, [0, 1], [0, 30], { extrapolateRight: "clamp" });
  const gap = 60 * (1 - slide);
  return (
    <>
      <div style={{ display: "flex", gap, filter: `blur(${blur}px)` }}>
        <Card3D>
          <EnglishCardLabel text={left} fontSize={fontSize} />
        </Card3D>
        <Card3D background="rgba(255,255,255,0.1)">
          <EnglishCardLabel text={right} fontSize={fontSize * 0.6} color={COLORS.slave} />
        </Card3D>
      </div>
      {impactSfx}
    </>
  );
};

// ---------- Quiz mechanics (Scene 6) ----------

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

/** Silent answer reveal — this episode's quiz never speaks the answer, only shows it. */
export const QuizReveal: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 8 } });
  const glowPulse = 16 + Math.sin((frame / fps) * Math.PI * 2 * 0.8) * 10;

  return (
    <div style={{ position: "relative", transform: `scale(${0.6 + pop * 0.4})` }}>
      <Card3D background={COLORS.accent} style={{ boxShadow: `${CARD_3D_SHADOW}, 0 0 ${glowPulse}px ${COLORS.accent}` }}>
        <EnglishCardLabel text={text} fontSize={FONT_SIZES.masterWord} color={COLORS.cardText} />
      </Card3D>
      <UnderlineHighlight width={text.length * FONT_SIZES.masterWord * 0.55} delayFrames={10} />
      {frame === 0 && <Audio src={ding} volume={sfxVolume} />}
    </div>
  );
};

// ---------- Scene 7: summary ----------

export const SummaryCard: React.FC<{ text: string; delayFrames: number }> = ({ text, delayFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - delayFrames;
  if (local < 0) {
    return null;
  }
  const drop = spring({ frame: local, fps, durationInFrames: Math.round(0.5 * fps), config: { damping: 13 } });
  return (
    <div style={{ transform: `translateY(${(1 - drop) * -260}px)`, opacity: drop, position: "relative", width: 1100 }}>
      <Card3D style={{ width: "100%", textAlign: "center" }}>
        <span style={{ fontFamily: FONT_KO, fontWeight: 700, fontSize: 38, color: COLORS.cardText }}>{text}</span>
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
        <span style={{ fontFamily: FONT_KO, fontWeight: 900, fontSize: 58, color: COLORS.cardText, textAlign: "center", display: "block" }}>
          {text}
        </span>
      </Card3D>
    </div>
  );
};

// ---------- Scene 8: teaser ----------

export const TeaserCard: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, durationInFrames: Math.round(0.6 * fps), config: { damping: 10 } });
  const breathe = 1 + Math.sin((frame / fps) * Math.PI * 2 * 0.4) * 0.03;
  return (
    <div style={{ transform: `scale(${(0.6 + pop * 0.4) * breathe})` }}>
      <Card3D background={COLORS.accent} style={{ padding: "40px 60px" }}>
        <span style={{ fontFamily: FONT_KO, fontWeight: 800, fontSize: 50, color: COLORS.cardText, textAlign: "center", display: "block", wordBreak: "keep-all" }}>
          {text}
        </span>
      </Card3D>
    </div>
  );
};
