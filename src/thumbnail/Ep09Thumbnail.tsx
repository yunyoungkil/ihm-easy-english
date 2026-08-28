import React from "react";
import {AbsoluteFill, Composition, Img, staticFile} from "remotion";

const outline = {
  WebkitTextStroke: "11px #05070b",
  paintOrder: "stroke fill" as const,
  textShadow: "0 10px 18px rgba(0,0,0,.65)",
};

const Word: React.FC<{prefix: string; accent: string}> = ({prefix, accent}) => (
  <div
    style={{
      ...outline,
      fontFamily: "RubikBold, sans-serif",
      fontSize: 106,
      lineHeight: 0.92,
      letterSpacing: -2,
      color: "#fff",
      whiteSpace: "nowrap",
    }}
  >
    {prefix}<span style={{color: "#168ff0"}}>{accent}</span>
  </div>
);

export const Ep09Thumbnail: React.FC = () => (
  <AbsoluteFill style={{overflow: "hidden", background: "#05080c"}}>
    <style>{`@font-face{font-family:CapcutKorean;src:url('${staticFile("fonts/capcut-korean.ttf")}')}@font-face{font-family:RubikBold;src:url('${staticFile("fonts/rubik-bold.ttf")}')}`}</style>
    <Img
      src={staticFile("images/ep09-thumbnail-background-v1.png")}
      style={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}}
    />
    <AbsoluteFill style={{background: "linear-gradient(90deg,rgba(1,5,10,.2) 0%,rgba(1,5,10,.02) 62%,rgba(1,5,10,.05) 100%)"}} />

    <div style={{position: "absolute", left: 34, top: 24, display: "flex", alignItems: "center", gap: 16}}>
      <div style={{fontFamily: "CapcutKorean, sans-serif", fontWeight: 900, fontSize: 28, lineHeight: .88, color: "#fff", textShadow: "0 3px 5px #000"}}>
        이해하면<br/><span style={{color: "#2bd2a4"}}>쉬운영어</span>
      </div>
      <div style={{height: 58, width: 3, background: "#fff", transform: "skew(-18deg)", opacity: .85}} />
    </div>

    <div style={{position: "absolute", left: 360, top: 25, border: "3px solid #fff", borderRadius: 12, padding: "10px 26px 12px", background: "rgba(18,24,32,.76)", boxShadow: "0 5px 0 #0008", fontFamily: "CapcutKorean, sans-serif", fontWeight: 900, fontSize: 28, letterSpacing: 5, color: "#fff"}}>
      초급 영어 <span style={{color: "#ffbf2e"}}>발음 기초</span>
    </div>

    <div style={{position: "absolute", left: 52, top: 180, display: "flex", flexDirection: "column", alignItems: "center", width: 730, gap: 15}}>
      <Word prefix="SPE" accent="CIAL" />
      <Word prefix="OFFI" accent="CIAL" />
      <div style={{marginTop: 13, fontFamily: "CapcutKorean, sans-serif", fontWeight: 900, fontSize: 49, color: "#fff", WebkitTextStroke: "7px #05070b", paintOrder: "stroke fill", textShadow: "0 7px 12px #000"}}>
        왜 <span style={{color: "#ffd126"}}>‘셜’</span>로 읽을까?
      </div>
    </div>

    <div style={{position: "absolute", left: 0, right: 0, bottom: 0, height: 156, background: "linear-gradient(90deg,#ffd31a,#ffc21c)", borderTop: "4px solid #0a0c10", display: "flex", alignItems: "center", justifyContent: "center", gap: 16, paddingTop: 2}}>
      <div style={{fontFamily: "CapcutKorean, sans-serif", fontWeight: 900, fontSize: 59, letterSpacing: -2, color: "#fff", WebkitTextStroke: "8px #090b10", paintOrder: "stroke fill"}}>7분 만에 마스터</div>
      <div style={{fontFamily: "RubikBold, sans-serif", fontSize: 66, color: "#168ff0", WebkitTextStroke: "8px #090b10", paintOrder: "stroke fill"}}>-CIAL</div>
      <div style={{fontFamily: "CapcutKorean, sans-serif", fontWeight: 900, fontSize: 59, color: "#f21920", WebkitTextStroke: "8px #090b10", paintOrder: "stroke fill"}}>발음 법칙</div>
    </div>
  </AbsoluteFill>
);

export const Ep09ThumbnailComposition: React.FC = () => (
  <Composition id="ep09-longform-thumbnail" component={Ep09Thumbnail} durationInFrames={1} fps={30} width={1280} height={720} />
);
