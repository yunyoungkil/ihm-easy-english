import React from "react";
import {Easing, interpolate, useCurrentFrame} from "remotion";

const C = {bg: "#07111F", text: "#F8F4EC", muted: "#59718A", gold: "#FFD15C", cyan: "#72D6EA"};

export const AnimatedSectionBand: React.FC<{step: number; label: string; from: number; progress: number}> = ({step, label, from, progress}) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - from);
  const enter = interpolate(local, [0, 15], [0, 1], {extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  const scan = ((local % 90) / 90) * 100;
  return <div style={{position: "absolute", top: 44, left: 72, right: 72, height: 108, opacity: enter, transform: `translateY(${(1 - enter) * -16}px)`, color: C.text, fontWeight: 900, letterSpacing: 2.4}}>
    <div style={{position: "absolute", inset: 0, overflow: "hidden", border: "1px solid #315170", borderRadius: 14, background: "rgba(7,22,40,.84)"}}>
      <div style={{position: "absolute", inset: "0 auto 0 0", width: 9, background: C.cyan}} />
      {[0, 1, 2].map((i) => <div key={i} style={{position: "absolute", left: 42 + i * 21, top: 25, width: 12, height: 58, transform: "skewX(-28deg)", background: i === 1 ? C.gold : C.cyan}} />)}
      <div style={{position: "absolute", left: `${scan}%`, top: 0, width: 150, height: "100%", transform: "translateX(-100%) skewX(-20deg)", background: "linear-gradient(90deg, transparent, rgba(114,214,234,.14), transparent)"}} />
      <div style={{position: "absolute", left: 128, top: 34, fontSize: 31, lineHeight: "36px"}}>SEASON 2 · EP1</div>
      <div style={{position: "absolute", left: 470, top: 53, width: 480, height: 3, background: "#36516D"}}><div style={{width: `${progress}%`, height: "100%", background: C.cyan}} /></div>
      <div style={{position: "absolute", left: 470, top: 43, display: "flex", gap: 99}}>{[1,2,3,4,5].map((n) => <div key={n} style={{width: n === step ? 14 : 8, height: n === step ? 14 : 8, borderRadius: 99, background: n === step ? C.gold : C.muted, boxShadow: n === step ? `0 0 0 6px ${C.gold}33` : "none"}} />)}</div>
      <div style={{position: "absolute", right: 28, top: 34, color: C.gold, fontSize: 31, lineHeight: "36px"}}>{String(step).padStart(2,"0")} · {label}</div>
    </div>
  </div>;
};

export const SectionWipe: React.FC<{at: number; color?: string}> = ({at, color = C.cyan}) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < -3 || local > 13) return null;
  const travel = interpolate(local, [-3, 13], [-35, 135], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
  const flash = interpolate(local, [-3, 3, 13], [0, .12, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <><div style={{position: "absolute", inset: 0, background: color, opacity: flash}} /><div style={{position: "absolute", left: "-25%", top: 0, width: "55%", height: "100%", transform: `translateX(${travel}vw) skewX(-18deg)`, background: `linear-gradient(90deg, transparent, ${color}22 30%, ${color}BB 50%, ${color}22 70%, transparent)`}} /></>;
};
