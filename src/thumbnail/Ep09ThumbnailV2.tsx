import React from "react";
import {
  AbsoluteFill,
  Composition,
  staticFile,
  interpolate,
  useCurrentFrame,
} from "remotion";

const ink = "#09101c";
const yellow = "#ffd21a";
const blue = "#078df0";
const red = "#f2212b";

const stroke = (color: string, size: number): React.CSSProperties => ({
  WebkitTextStroke: `${size}px ${color}`,
  paintOrder: "stroke fill",
});

export const Ep09ThumbnailV2: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        background: ink,
        transformOrigin: interpolate(frame, [0], ["50% 50%"], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      }}
    >
      <style>{`@font-face{font-family:CapcutKorean;src:url('${staticFile("fonts/capcut-korean.ttf")}')}@font-face{font-family:RubikBold;src:url('${staticFile("fonts/rubik-bold.ttf")}')}`}</style>
      {/* Before / after color field. The diagonal itself communicates progress. */}
      <div style={{ position: "absolute", inset: 0, background: ink }} />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: -90,
          width: 760,
          height: 720,
          background: yellow,
          transform: "skewX(-10deg)",
          transformOrigin: "bottom",
        }}
      />
      {/* Hand-built editorial marks keep the result graphic rather than AI-rendered. */}
      <div
        style={{
          position: "absolute",
          left: 115,
          bottom: 104,
          width: 375,
          height: 14,
          background: blue,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 565,
          top: -40,
          width: 9,
          height: 820,
          background: "rgba(255,255,255,.2)",
          transform: "rotate(10deg)",
        }}
      />
      {/* A hand-built ribbon turns the channel name into a repeatable signature. */}
      <div
        style={{
          position: "absolute",
          left: -18,
          top: -30,
          width: 410,
          height: 105,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 8,
            top: 2,
            width: 395,
            height: 82,
            border: "4px solid #f6f8fb",
            transform: "rotate(1.8deg) skewX(-7deg)",
            opacity: 0.92,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 20,
            width: 410,
            height: 82,
            background: yellow,
            clipPath: "polygon(0 12%, 100% 0, 94% 88%, 4% 100%)",
            transform: "rotate(-1deg)",
            opacity: 0.96,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 18,
            width: 392,
            height: 80,
            background: blue,
            clipPath: "polygon(2% 18%, 100% 5%, 93% 100%, 0 88%)",
            boxShadow: "8px 8px 0 #02050a66",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 52,
            top: 39,
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            whiteSpace: "nowrap",
            fontFamily: "CapcutKorean, sans-serif",
            fontWeight: 900,
            lineHeight: 1,
            color: ink,
          }}
        >
          <span style={{ fontSize: 24 }}>이해하면</span>
          <span style={{ fontSize: 35, letterSpacing: -1.5 }}>쉬운영어</span>
        </div>
        <div
          style={{
            position: "absolute",
            right: 36,
            top: 75,
            width: 64,
            height: 4,
            background: ink,
            transform: "rotate(-2deg)",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 315,
          top: 145,
          padding: "9px 22px 11px",
          border: `3px solid ${yellow}`,
          borderRadius: 10,
          background: ink,
          color: "#fff",
          fontFamily: "CapcutKorean, sans-serif",
          fontWeight: 900,
          fontSize: 25,
          letterSpacing: 3,
          boxShadow: "6px 7px 0 #02050a",
        }}
      >
        영어 읽기 <span style={{ color: yellow }}>치트키</span>
      </div>
      {/* Scattered source letters: enough to show confusion, never enough to become noise. */}
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 145,
          display: "grid",
          gridTemplateColumns: "repeat(2, 98px)",
          gap: 13,
        }}
      >
        {["C", "I", "A", "L"].map((letter, index) => (
          <div
            key={letter}
            style={{
              height: 88,
              borderRadius: 11,
              border: "3px solid #35445a",
              background: index === 0 ? blue : "#182438",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontFamily: "RubikBold, sans-serif",
              fontSize: 57,
              boxShadow: "7px 7px 0 #02050a",
            }}
          >
            {letter}
          </div>
        ))}
      </div>
      {/* One dominant transformation. */}
      <div style={{ position: "absolute", left: 115, top: 365 }}>
        <div
          style={{
            fontFamily: "RubikBold, sans-serif",
            fontSize: 142,
            letterSpacing: -7,
            lineHeight: 1,
            color: "#fff",
            ...stroke("#02050a", 9),
            textShadow: "7px 8px 0 #0007",
          }}
        >
          -CIAL
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 675,
          top: 150,
          width: 590,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "CapcutKorean, sans-serif",
            fontWeight: 900,
            fontSize: 190,
            lineHeight: 0.9,
            color: blue,
            ...stroke("#fff", 12),
            filter: `drop-shadow(3px 0 0 ${ink}) drop-shadow(-3px 0 0 ${ink}) drop-shadow(0 3px 0 ${ink}) drop-shadow(0 -3px 0 ${ink})`,
          }}
        >
          셜
        </div>
      </div>
      {/* Outcome promise, not a repeat of the video title. */}
      <div
        style={{
          position: "absolute",
          left: 675,
          bottom: 120,
          width: 590,
          color: ink,
          textAlign: "center",
          fontFamily: "CapcutKorean, sans-serif",
          fontWeight: 900,
          lineHeight: 1.05,
        }}
      >
        <div style={{ fontSize: 72, letterSpacing: -3 }}>처음 보는 단어도</div>
        <div
          style={{
            fontSize: 130,
            color: red,
            ...stroke("#fff", 10),
            marginTop: 8,
          }}
        >
          읽힌다!
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 115,
          bottom: 142,
          width: 375,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {["SPECIAL", "OFFICIAL"].map((word) => (
          <div
            key={word}
            style={{
              padding: "9px 18px 11px",
              border: "2px solid #4a5870",
              borderRadius: 999,
              color: "#e2e9f4",
              fontFamily: "RubikBold, sans-serif",
              fontSize: 27,
              letterSpacing: 0.5,
            }}
          >
            {word}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Ep09ThumbnailV2Composition: React.FC = () => (
  <Composition
    id="ep09-longform-thumbnail-v2"
    component={Ep09ThumbnailV2}
    durationInFrames={1}
    fps={30}
    width={1280}
    height={720}
  />
);
