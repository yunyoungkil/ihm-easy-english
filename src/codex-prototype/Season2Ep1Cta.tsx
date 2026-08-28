import React from "react";
import {AbsoluteFill, Composition, Easing, interpolate, useCurrentFrame} from "remotion";
import {FONT_KEYWORD, FONT_SOUND} from "./fonts";

const T = {width: 1920, height: 1080, fps: 30, duration: 90, bg: "#07111F", panel: "#112849", text: "#F8F4EC", gold: "#FFD15C", cyan: "#72D6EA", muted: "#B7C5D7"};

export const Cta: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 18], [0, 1], {extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const linkEnter = interpolate(frame, [14, 36], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${T.panel}, ${T.bg} 72%)`, fontFamily: "Noto Sans KR, Arial, sans-serif", overflow: "hidden"}}>
    <div style={{position: "absolute", inset: 0, background: `linear-gradient(110deg, transparent 38%, ${T.cyan}0E 50%, transparent 62%)`, transform: `translateX(${interpolate(frame, [0, 70], [-40, 50], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}%)`}} />
    <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", opacity: enter, transform: `translateY(${(1 - enter) * 18}px)`}}>
      <div style={{fontSize: 21, letterSpacing: 3.6, color: T.cyan, fontWeight: 900}}>KEEP LISTENING</div>
      <div style={{fontSize: 54, color: T.text, fontWeight: 900, letterSpacing: -3, marginTop: 20}}>다음 편에서 <span style={{fontFamily: FONT_KEYWORD, color: T.gold, fontWeight: 400}}>기능 단어의 비밀</span>을 이어갑니다.</div>
      <div style={{marginTop: 28, width: 640, height: 360, borderRadius: 20, border: `2px dashed ${T.gold}AA`, background: "rgba(255,209,92,.025)", display: "flex", alignItems: "center", justifyContent: "center", opacity: linkEnter, transform: `scale(${.96 + linkEnter * .04})`}}>
        <div style={{textAlign: "center"}}><div style={{fontSize: 18, color: T.cyan, letterSpacing: 3, fontWeight: 900}}>YOUTUBE END SCREEN</div><div style={{fontSize: 27, color: T.muted, fontWeight: 700, marginTop: 16}}>여기에 연결할 영상 1개</div></div>
      </div>
      <div style={{marginTop: 24, fontFamily: FONT_SOUND, fontWeight: 600, fontSize: 28, color: T.muted}}>구독 · 좋아요</div>
    </div>
  </AbsoluteFill>;
};

export const Season2Ep1CtaComposition: React.FC = () => <Composition id="season2-ep1-cta" component={Cta} durationInFrames={T.duration} fps={T.fps} width={T.width} height={T.height} />;
