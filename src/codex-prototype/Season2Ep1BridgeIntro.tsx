import React from "react";
import {AbsoluteFill, Audio, Composition, Easing, interpolate, staticFile, useCurrentFrame} from "remotion";
import {FONT_KEYWORD, FONT_SOUND} from "./fonts";

const T = {width: 1920, height: 1080, fps: 30, duration: 78, bg: "#07111F", panel: "#112849", text: "#F8F4EC", gold: "#FFD15C", cyan: "#72D6EA", muted: "#B7C5D7"};

export const BridgeIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const inProgress = interpolate(frame, [0, 22], [0, 1], {extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const outProgress = interpolate(frame, [58, 78], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic)});
  const line = interpolate(frame, [8, 38], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const opacity = inProgress * (1 - outProgress);
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${T.panel}, ${T.bg} 72%)`, fontFamily: "Noto Sans KR, Arial, sans-serif", overflow: "hidden", opacity}}>
    <Audio src={staticFile("audio/core-pass-sweep.wav")} volume={0.09} />
    <div style={{position: "absolute", left: "-25%", top: 0, width: "55%", height: "100%", transform: `translateX(${interpolate(frame, [0, 38], [-20, 125], {extrapolateLeft: "clamp", extrapolateRight: "clamp"})}vw) skewX(-18deg)`, background: `linear-gradient(90deg, transparent, ${T.cyan}18 30%, ${T.cyan}88 50%, ${T.cyan}18 70%, transparent)`}} />
    <div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", transform: `translateY(${(1 - inProgress) * 24}px)`}}>
      <div style={{fontSize: 22, color: T.cyan, fontWeight: 900, letterSpacing: 4}}>SEASON 2 · THE LISTENING RHYTHM</div>
      <div style={{marginTop: 28, color: T.text, fontSize: 70, fontWeight: 900, letterSpacing: -4}}>안 들린 게 아니라,<br /><span style={{fontFamily: FONT_KEYWORD, color: T.gold, fontWeight: 400}}>리듬 안에서 연결된 것</span>입니다.</div>
      <div style={{marginTop: 36, width: 520, height: 6, borderRadius: 99, background: "#36516D", overflow: "hidden"}}><div style={{width: `${line * 100}%`, height: "100%", background: T.gold}} /></div>
      <div style={{marginTop: 18, fontFamily: FONT_SOUND, color: T.muted, fontWeight: 600, fontSize: 30}}>Let&apos;s hear the reason.</div>
    </div>
  </AbsoluteFill>;
};

export const Season2Ep1BridgeIntroComposition: React.FC = () => <Composition id="season2-ep1-bridge-intro" component={BridgeIntro} durationInFrames={T.duration} fps={T.fps} width={T.width} height={T.height} />;
