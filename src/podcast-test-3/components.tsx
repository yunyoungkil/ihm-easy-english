import React from "react";
import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  COLORS,
  SPEAKER_COLOR,
  SPEAKER_LABEL,
  SPEAKER_MIC_POSITION,
  SUBTITLE,
  fitEnFontSize,
} from "./theme";
import type { DialogueLine, LineSegment } from "./types";
import { isSpeakingAt, speakingElapsedFrames } from "./timing";

export const PodcastBackground: React.FC = () => (
  <AbsoluteFill>
    <Img
      src={staticFile("image/podcast-test-3-bg.png")}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        scale: 0.975,
      }}
    />
  </AbsoluteFill>
);

/**
 * Karaoke subtitle block — fixed to the top-center 10% band (the studio's
 * only negative-space region: it clears both faces and the desk). Spoken
 * words go solid white, the rest stay dim; a Google-color speaker tag and a
 * Korean gloss sit above/below the English line.
 */
export const KaraokeSubtitle: React.FC<{
  line: DialogueLine;
  segments: LineSegment[];
}> = ({ line, segments }) => {
  const frame = useCurrentFrame();
  const accent = SPEAKER_COLOR[line.speaker];
  const enFontSize = fitEnFontSize(line.en.length);

  return (
    <div
      style={{
        position: "absolute",
        top: `${SUBTITLE.topPct}%`,
        left: "50%",
        transform: "translateX(-50%)",
        width: SUBTITLE.maxWidthPx,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 16px",
          borderRadius: 999,
          background: accent,
          fontFamily: "Arial, sans-serif",
          fontWeight: 700,
          fontSize: SUBTITLE.tagFontSize,
          color: COLORS.white,
          letterSpacing: 0.5,
        }}
      >
        {SPEAKER_LABEL[line.speaker]}
      </div>

      <div
        style={{
          background: COLORS.subtitleBg,
          borderRadius: 16,
          padding: "14px 28px",
          textAlign: "center",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontWeight: 800,
            fontSize: enFontSize,
            lineHeight: 1.25,
            textShadow: "0 2px 10px rgba(0,0,0,0.6)",
          }}
        >
          {segments
            .filter(
              (s): s is Extract<LineSegment, { type: "word" }> =>
                s.type === "word",
            )
            .map((word, i) => {
              const active = frame >= word.startFrame && frame < word.endFrame;
              const spoken = frame >= word.endFrame;
              return (
                // A real space text node (not just margin) after each word —
                // without it, adjacent <span>s have no line-break opportunity
                // between them and the whole line renders unbreakable no
                // matter how narrow the container is.
                <React.Fragment key={i}>
                  <span
                    style={{
                      color:
                        spoken || active
                          ? COLORS.spokenWhite
                          : COLORS.unspokenGray,
                      ...(active ? { color: accent } : {}),
                    }}
                  >
                    {word.text}
                  </span>{" "}
                </React.Fragment>
              );
            })}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "'Noto Sans KR', Arial, sans-serif",
            fontWeight: 500,
            fontSize: SUBTITLE.koFontSize,
            color: COLORS.koSubGray,
          }}
        >
          {line.ko}
        </div>
      </div>
    </div>
  );
};

/**
 * Concentric ripple rings anchored at the active speaker's mic. Driven by
 * the "speaking clock" (frames spent inside word segments only), so the
 * rings visibly freeze in place during a pause/break instead of continuing
 * to pulse through it — the "말토막 시각화" requirement.
 */
export const SoundWaveIndicator: React.FC<{
  line: DialogueLine;
  segments: LineSegment[];
}> = ({ line, segments }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pos = SPEAKER_MIC_POSITION[line.speaker];
  const accent = SPEAKER_COLOR[line.speaker];
  const speaking = isSpeakingAt(frame, segments);
  const clock = speakingElapsedFrames(frame, segments);

  const ringPeriod = Math.round(fps * 0.9);
  const rings = [0, 1, 2];

  return (
    <div
      style={{
        position: "absolute",
        left: `${pos.xPct}%`,
        top: `${pos.yPct}%`,
        width: 0,
        height: 0,
        pointerEvents: "none",
      }}
    >
      {rings.map((i) => {
        const phase =
          ((clock + (i * ringPeriod) / rings.length) % ringPeriod) / ringPeriod;
        const scale = 0.3 + phase * 1.4;
        const opacity = speaking ? (1 - phase) * 0.55 : 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 90,
              height: 90,
              marginLeft: -45,
              marginTop: -45,
              borderRadius: "50%",
              border: `3px solid ${accent}`,
              opacity,
              transform: `scale(${scale})`,
            }}
          />
        );
      })}
      {/* Small solid core so the indicator still reads as "on" the instant speech starts, before the first ring has grown. */}
      <div
        style={{
          position: "absolute",
          left: -6,
          top: -6,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: accent,
          opacity: speaking ? 0.9 : 0.25,
        }}
      />
    </div>
  );
};
