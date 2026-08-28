import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Easing,
  interpolate,
  spring,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const P = {
  fps: 30,
  width: 1920,
  height: 1080,
  duration: 1800,
  colors: {
    ink: "#07111F",
    navy: "#102544",
    cream: "#F7F3EA",
    soft: "#B8C5D8",
    cyan: "#72D6EA",
    gold: "#FFD15C",
    coral: "#FF846A",
  },
  type: { eyebrow: 23, display: 76, word: 118, body: 34, caption: 28 },
  space: { edge: 110, gap: 30, pill: 18 },
};

const ease = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const Fade: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {
  const frame = useCurrentFrame();
  const alpha = Math.min(ease(frame, from, from + 18), 1 - ease(frame, to - 18, to));
  return <div style={{opacity: alpha}}>{children}</div>;
};

const Word: React.FC<{text: string; x: number; y: number; color?: string; scale?: number; opacity?: number}> = ({text, x, y, color = P.colors.cream, scale = 1, opacity = 1}) => (
  <div style={{position: "absolute", left: x, top: y, color, opacity, transform: `translate(-50%, -50%) scale(${scale})`, fontSize: P.type.word, fontWeight: 900, letterSpacing: -7, whiteSpace: "nowrap"}}>{text}</div>
);

const Pulse: React.FC<{x: number; active: boolean; label: string}> = ({x, active, label}) => {
  const frame = useCurrentFrame();
  const beat = active ? 1 + Math.max(0, Math.sin(frame / 7)) * 0.18 : 1;
  return <div style={{position: "absolute", left: x, top: 695, transform: `translateX(-50%) scale(${beat})`, textAlign: "center"}}>
    <div style={{width: active ? 84 : 34, height: active ? 84 : 34, borderRadius: 999, background: active ? P.colors.gold : "#29425F", margin: "0 auto 18px"}} />
    <div style={{fontSize: 26, color: active ? P.colors.cream : P.colors.soft, fontWeight: 700}}>{label}</div>
  </div>;
};

const Prototype: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame, fps, config: {damping: 18, stiffness: 110}});
  const compression = ease(frame, 290, 698);
  const sourceDissolve = 1 - ease(frame, 290, 443);
  const resultReveal = ease(frame, 443, 596);
  const rhythm = ease(frame, 698, 850);
  const finish = ease(frame, 1054, 1204);
  const dotPositions = Array.from({length: 22}, (_, i) => ({x: 80 + ((i * 229) % 1750), y: 90 + ((i * 137) % 850)}));
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 42%, ${P.colors.navy}, ${P.colors.ink} 72%)`, overflow: "hidden", fontFamily: "Noto Sans KR, Arial, sans-serif"}}>
    {dotPositions.map((dot, i) => <div key={i} style={{position: "absolute", left: dot.x, top: dot.y, width: 5 + (i % 3) * 3, height: 5 + (i % 3) * 3, borderRadius: 99, background: P.colors.cyan, opacity: 0.12 + (i % 4) * 0.05}} />)}
    <div style={{position: "absolute", top: 72, left: P.space.edge, right: P.space.edge, display: "flex", justifyContent: "space-between", color: P.colors.soft, fontSize: P.type.eyebrow, letterSpacing: 3, fontWeight: 800}}>
      <span>SEASON 2 · SOUND IN MOTION</span><span>CONCEPT PROTOTYPE</span>
    </div>

    <Sequence from={0}><Audio src={staticFile("audio/season2_ep1_seg01.wav")} /></Sequence>
    <Sequence from={290}><Audio src={staticFile("audio/season2_ep1_seg02.wav")} /></Sequence>
    <Sequence from={698}><Audio src={staticFile("audio/season2_ep1_seg03.wav")} /></Sequence>
    <Sequence from={1054}><Audio src={staticFile("audio/season2_ep1_seg04.wav")} /></Sequence>
    <Fade from={0} to={290}><div style={{position: "absolute", inset: 0}}>
      <div style={{position: "absolute", top: 260, width: "100%", textAlign: "center", color: P.colors.cream, fontSize: P.type.display, fontWeight: 900, letterSpacing: -5, transform: `translateY(${(1 - enter) * 38}px)`}}>글자는 그대로인데,</div>
      <div style={{position: "absolute", top: 390, width: "100%", textAlign: "center", color: P.colors.cyan, fontSize: P.type.display, fontWeight: 900, letterSpacing: -5}}>귀에는 왜 다르게 들릴까?</div>
      <Word text="I'mma call you later" x={960} y={700} scale={0.58 + enter * 0.42} />
      <div style={{position: "absolute", top: 820, width: "100%", textAlign: "center", color: P.colors.soft, fontSize: P.type.caption}}>“아이머 콜 유 레이터”처럼 들리는 문장</div>
    </div></Fade>

    <Fade from={290} to={698}><div style={{position: "absolute", inset: 0}}>
      <div style={{position: "absolute", top: 265, width: "100%", textAlign: "center", color: P.colors.soft, fontSize: P.type.body, fontWeight: 700}}>초보라면 안 들리는 게 당연합니다. <span style={{color: P.colors.gold}}>원형을 먼저 펼쳐볼게요.</span></div>
      <Word text="I am" x={interpolate(compression, [0, 1], [460, 650])} y={545} color={P.colors.cream} scale={1 - compression * 0.18} opacity={sourceDissolve}/>
      <Word text="going to" x={interpolate(compression, [0, 1], [1130, 780])} y={545} color={P.colors.coral} scale={1 - compression * 0.42} opacity={sourceDissolve}/>
      <div style={{position: "absolute", left: 960, top: 540, width: interpolate(compression, [0, 1], [0, 380]), height: 6, borderRadius: 99, background: P.colors.gold, transform: "translate(-50%, -50%)"}} />
      <Word text="I'mma" x={interpolate(resultReveal, [0, 1], [1420, 960])} y={545} color={P.colors.gold} scale={0.75 + resultReveal * 0.25} opacity={resultReveal}/>
      <div style={{position: "absolute", top: 735, width: "100%", textAlign: "center", color: P.colors.soft, fontSize: P.type.caption}}><span style={{color: P.colors.coral}}>am going to</span>가 초고속으로 압착되어 한 덩어리가 됩니다.</div>
    </div></Fade>

    <Fade from={698} to={1054}><div style={{position: "absolute", inset: 0}}>
      <div style={{position: "absolute", top: 230, width: "100%", textAlign: "center", color: P.colors.cream, fontSize: P.type.display, fontWeight: 900, letterSpacing: -4}}>소리는 귀찮아서가 아니라, <span style={{color: P.colors.gold}}>리듬 때문에</span> 합쳐집니다.</div>
      <div style={{position: "absolute", top: 390, width: "100%", textAlign: "center", color: P.colors.soft, fontSize: P.type.body}}>강세가 있는 단어에 힘을 몰아주기 위해서예요.</div>
      <Pulse x={390} active={rhythm > 0.15} label="I"/><Pulse x={650} active={false} label="am"/><Pulse x={830} active={false} label="going"/><Pulse x={1130} active={false} label="to"/><Pulse x={1450} active={rhythm > 0.15} label="later"/>
      <div style={{position: "absolute", left: 380, right: 380, top: 740, height: 4, background: "#29425F"}} />
    </div></Fade>

    <Fade from={1054} to={1800}><div style={{position: "absolute", inset: 0}}>
      <div style={{position: "absolute", top: 270, width: "100%", textAlign: "center", color: P.colors.cream, fontSize: P.type.display, fontWeight: 900, letterSpacing: -5, transform: `scale(${0.96 + finish * 0.04})`}}>안 들리는 게 아니라,</div>
      <div style={{position: "absolute", top: 405, width: "100%", textAlign: "center", color: P.colors.gold, fontSize: P.type.display, fontWeight: 900, letterSpacing: -5}}>비밀 리듬을 몰랐던 겁니다.</div>
      <div style={{position: "absolute", top: 665, left: 560, right: 560, border: `2px solid ${P.colors.cyan}`, borderRadius: 999, padding: `${P.space.pill}px 0`, textAlign: "center", color: P.colors.cyan, fontSize: P.type.body, fontWeight: 800}}>SEASON 2 · 문장이 들리는 원리</div>
    </div></Fade>
  </AbsoluteFill>;
};

export const Season2CodexPrototypeComposition: React.FC = () => (
  <Composition id="season2-codex-prototype" component={Prototype} durationInFrames={P.duration} fps={P.fps} width={P.width} height={P.height} />
);
