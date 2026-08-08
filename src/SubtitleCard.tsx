import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SubtitleEntry } from "./data/subtitles";

export const SubtitleCard: React.FC<{ entry: SubtitleEntry }> = ({
  entry,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  const exitStart = durationInFrames - 15;
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = Math.min(enter, exit);
  const translateY = interpolate(enter, [0, 1], [40, 0]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0b1220",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          backgroundColor: "#ffffff",
          borderRadius: 32,
          padding: "64px 96px",
          maxWidth: 1400,
          textAlign: "center",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#0b1220",
            lineHeight: 1.3,
          }}
        >
          {entry.english}
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 44,
            color: "#4b5563",
            fontWeight: 500,
          }}
        >
          {entry.korean}
        </div>
      </div>
    </div>
  );
};
