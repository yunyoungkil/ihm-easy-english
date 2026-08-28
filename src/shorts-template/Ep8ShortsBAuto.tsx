import React from "react";
import {AbsoluteFill, Audio, Composition, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

const FPS = 30;
const DURATIONS = [239, 408, 364, 236, 148, 173];
const STARTS = DURATIONS.map((_, i) => DURATIONS.slice(0, i).reduce((a, b) => a + b, 0));
const TOTAL = DURATIONS.reduce((a, b) => a + b, 0);
const YELLOW = "#ffd900";
const BLUE = "#0090ff";
const KOREAN_BLUE = "#008eff";
const PURPLE = "#8100ff";
const OUTLINE = 9;
const ANSWER_REVEAL = STARTS[1] + 303;

const base: React.CSSProperties = {fontFamily: "CapcutKorean, sans-serif", fontWeight: 900, textAlign: "center", lineHeight: 1};

const Pop: React.FC<React.PropsWithChildren<{from: number; style?: React.CSSProperties}>> = ({from, style, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - from, fps, config: {damping: 16, stiffness: 190}});
  return <div style={{...style, transform: `scale(${s})`}}>{children}</div>;
};

const SceneEnvelope: React.FC<React.PropsWithChildren<{start: number; end: number}>> = ({start, end, children}) => {
  const frame = useCurrentFrame();
  const edge = 9;
  const enter = interpolate(frame, [start, start + edge], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const exit = interpolate(frame, [end - edge, end], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const visibility = Math.min(enter, exit);
  const direction = frame < start + edge ? 1 - enter : 1 - exit;
  return <div style={{position: "absolute", inset: 0, opacity: visibility, transform: `translateY(${direction * 24}px) scale(${0.985 + visibility * 0.015})`}}>{children}</div>;
};

const Header = () => <>
  <div style={{...base, position: "absolute", top: 150, width: "100%", color: "#ff7200", fontSize: 102, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>틀리기 쉬운</div>
  <div style={{...base, position: "absolute", top: 285, width: "100%", color: "#050505", fontSize: 92, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>영어 발음 테스트</div>
</>;

const AccentWord: React.FC<{word: string; accent: string; active: boolean; intensity?: number}> = ({word, accent, active, intensity}) => {
  const [a, b] = word.split(accent);
  const amount = intensity ?? (active ? 1 : 0);
  const pale = Math.round(255 * (1 - amount));
  return <>{a}<span style={{color: amount > 0 ? `rgb(255,${pale},${pale})` : "inherit", textShadow: amount > 0 ? `0 0 ${18 * amount}px rgba(255,0,0,${0.54 * amount})` : "none"}}>{accent}</span>{b}</>;
};

const Card: React.FC<{word: string; accent: string; reading: string; y: number; active: boolean; wrong?: string; reveal: boolean; from: number}> = ({word, accent, reading, y, active, wrong, reveal, from}) => <div style={{position: "absolute", left: 80, right: 80, top: y}}>
  <Pop from={from}><div style={{...base, background: YELLOW, borderRadius: 28, padding: "24px 22px 30px", color: reveal ? "#fff" : "#050505", WebkitTextStroke: reveal ? `${OUTLINE}px #050505` : "0 transparent", paintOrder: "stroke fill", fontFamily: "RubikBold, sans-serif", fontSize: 118}}><AccentWord word={word} accent={accent} active={active}/></div></Pop>
  {wrong && !reveal ? <div style={{...base, marginTop: 26, color: "#fff", fontSize: 70, textDecoration: "line-through", textDecorationColor: "#ff2525", textDecorationThickness: 9}}>{wrong}</div> : null}
  {reveal ? <div style={{...base, marginTop: 28, color: "#050505", fontSize: 82, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>{reading}</div> : null}
</div>;

const StackScene: React.FC<{mode: "learn" | "quiz" | "answer"}> = ({mode}) => {
  const frame = useCurrentFrame();
  const learn = mode === "learn";
  const answer = mode === "answer";
  return <>
    {learn ? <>
      <Card word="CULTURE" accent="TU" reading="컬처" y={590} active={frame > 65} reveal from={0}/>
      <Card word="FURNITURE" accent="TU" reading="퍼니처" y={1100} active={frame > 150} reveal from={5}/>
    </> : <>
      <Card word="TREASURE" accent="SU" reading="트레저" wrong="트레처" y={590} active={answer} reveal={answer} from={0}/>
      <Card word="LEISURE" accent="SU" reading="리저" wrong="리처" y={1100} active={answer} reveal={answer} from={5}/>
    </>}
  </>;
};

const MiniWordCard: React.FC<{word: string; accent: string; y: number; active: boolean; focus?: number}> = ({word, accent, y, active, focus = 1}) => <div style={{position: "absolute", left: 90, right: 90, top: y, opacity: 0.38 + focus * 0.62, transform: `scale(${1 + focus * 0.045})`, filter: `drop-shadow(0 ${focus * 12}px ${focus * 18}px #0008)`}}>
  <div style={{...base, background: YELLOW, borderRadius: 26, padding: "22px 16px 28px", color: "#fff", WebkitTextStroke: `${OUTLINE}px #050505`, paintOrder: "stroke fill", fontFamily: "RubikBold, sans-serif", fontSize: 104}}>
    <AccentWord word={word} accent={accent} active={active} intensity={focus}/>
  </div>
</div>;

const RuleWordsScene = () => {
  const frame = useCurrentFrame();
  const focusAt = (start: number, end: number) => {
    const fade = 12;
    return interpolate(frame, [start - fade, start, end, end + fade], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  };
  const focuses = [focusAt(784, 816), focusAt(816, 866), focusAt(866, 922), focusAt(922, 993)];
  return <>
    <MiniWordCard word="CULTURE" accent="TU" y={540} active={focuses[0] > 0.48} focus={frame < 772 ? 1 : focuses[0]}/>
    <MiniWordCard word="FURNITURE" accent="TU" y={790} active={focuses[1] > 0.48} focus={frame < 772 ? 1 : focuses[1]}/>
    <MiniWordCard word="TREASURE" accent="SU" y={1090} active={focuses[2] > 0.48} focus={frame < 772 ? 1 : focuses[2]}/>
    <MiniWordCard word="LEISURE" accent="SU" y={1340} active={focuses[3] > 0.48} focus={frame < 772 ? 1 : focuses[3]}/>
  </>;
};

const DistinctionScene = () => {
  const frame = useCurrentFrame();
  const showSu = frame >= STARTS[3] + 116;
  return <>
    <div style={{...base, position: "absolute", top: 530, width: "100%", color: "#fff", fontSize: 62}}>철자를 살짝 보면</div>
    <MiniWordCard word="CULTURE" accent="TU" y={690} active={!showSu}/>
    <div style={{...base, position: "absolute", top: 885, width: "100%", color: !showSu ? BLUE : "#fff", fontSize: 66}}>T 다음 U</div>
    <MiniWordCard word="TREASURE" accent="SU" y={1110} active={showSu}/>
    <div style={{...base, position: "absolute", top: 1305, width: "100%", color: showSu ? BLUE : "#fff", fontSize: 66}}>S 다음 U</div>
  </>;
};

const Question = () => {
  const frame = useCurrentFrame();
  const local = frame - STARTS[4];
  const first = spring({frame: local, fps: FPS, config: {damping: 15, stiffness: 170}});
  const second = spring({frame: local - 24, fps: FPS, config: {damping: 13, stiffness: 190}});
  const tilt = Math.sin(local * 0.16) * 1.2;
  return <>
    <div style={{...base, position: "absolute", top: 720, left: 60, right: 60, color: "#fff", fontSize: 94, opacity: first, transform: `translateY(${(1 - first) * 70}px) scale(${0.86 + first * 0.14}) rotate(${-tilt}deg)`}}>혀 모양은</div>
    <div style={{...base, position: "absolute", top: 900, left: 45, right: 45, color: KOREAN_BLUE, fontSize: 104, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill", opacity: second, transform: `translateY(${(1 - second) * 80}px) scale(${0.82 + second * 0.18}) rotate(${tilt}deg)`}}>어떻게 다를까요?</div>
    <div style={{position: "absolute", top: 1090, left: "50%", width: 210, height: 16, borderRadius: 20, background: YELLOW, transform: `translateX(-50%) scaleX(${second})`}}/>
  </>;
};

const CTA = () => {
  const frame = useCurrentFrame();
  const local = frame - STARTS[5];
  const card = spring({frame: local, fps: FPS, config: {damping: 13, stiffness: 150}});
  const line1 = spring({frame: local - 10, fps: FPS, config: {damping: 15, stiffness: 180}});
  const line2 = spring({frame: local - 34, fps: FPS, config: {damping: 14, stiffness: 190}});
  const y = Math.sin(local * 0.28) * 14;
  const arrowRotate = -5 + Math.sin(local * 0.18) * 4;
  return <>
    <div style={{position: "absolute", top: 635, left: 100, right: 100, height: 450, transform: `scale(${card}) rotate(-1.5deg)`, transformOrigin: "center"}}>
      <div style={{position: "absolute", inset: "34px -10px -22px 28px", background: "#1657b8", clipPath: "polygon(5% 8%,95% 0,100% 82%,90% 100%,2% 91%,0 18%)", filter: "drop-shadow(12px 16px 0 #000)"}}/>
      <div style={{position: "absolute", inset: 0, background: PURPLE, border: "12px solid white", clipPath: "polygon(4% 7%,93% 0,100% 20%,96% 91%,79% 100%,3% 93%,0 20%)", filter: "drop-shadow(7px 9px 0 #111)"}}/>
      <div style={{position: "absolute", width: 105, height: 105, right: 34, top: -26, borderRadius: "50%", background: YELLOW, border: "10px solid #fff"}}/>
      <div style={{position: "absolute", left: 30, bottom: 35, color: YELLOW, fontSize: 85, transform: "rotate(-10deg)"}}>＋</div>
      <div style={{...base, position: "absolute", top: 104, left: 35, right: 35, color: "#fff", fontSize: 63, opacity: line1, transform: `translateX(${(1 - line1) * -70}px)`}}>관련 영상에서</div>
      <div style={{...base, position: "absolute", top: 217, left: 8, right: 8, color: KOREAN_BLUE, fontSize: 82, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill", opacity: line2, transform: `scale(${0.82 + line2 * 0.18})`}}>지금 바로 확인</div>
    </div>
    <svg width="330" height="300" viewBox="0 0 330 300" style={{position: "absolute", left: "50%", bottom: 185, overflow: "visible", transform: `translate(-50%,${y}px) rotate(${arrowRotate}deg) scale(${line2})`, filter: "drop-shadow(9px 11px 0 #111)"}}>
      <path d="M105 15 H225 V145 H300 L165 282 30 145 H105 Z" fill={YELLOW} stroke="#fff" strokeWidth="18" strokeLinejoin="round"/>
      <path d="M132 58 H198" stroke="#1657b8" strokeWidth="13" strokeLinecap="round"/>
      <path d="M132 92 H198" stroke="#1657b8" strokeWidth="13" strokeLinecap="round"/>
      <path d="M92 164 L165 238 238 164" fill="none" stroke="#ff4a74" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  </>;
};

const SoundDesign = () => <>
  <Sequence from={ANSWER_REVEAL} durationInFrames={36}><Audio src={staticFile("audio/core-pass-ding.wav")} volume={0.1}/></Sequence>
  <Sequence from={784} durationInFrames={24}><Audio src={staticFile("audio/core-pass-tick.wav")} volume={0.045}/></Sequence>
  <Sequence from={866} durationInFrames={24}><Audio src={staticFile("audio/core-pass-tick.wav")} volume={0.045}/></Sequence>
  <Sequence from={STARTS[5]} durationInFrames={30}><Audio src={staticFile("audio/core-pass-pop.wav")} volume={0.075}/></Sequence>
</>;

export const Ep8ShortsBAuto: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame % 600, [0, 300, 600], [-80, 80, -80]);
  return <AbsoluteFill style={{background: "#06090e", overflow: "hidden"}}>
    <div style={{position: "absolute", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle,${BLUE}22,transparent 65%)`, left: drift, top: 500}}/>
    <Header/>
    {STARTS.map((start, i) => <Sequence key={start} from={start} durationInFrames={DURATIONS[i]}><Audio src={staticFile(`audio/ep08_shortsB_auto_seg0${i + 1}.wav`)}/></Sequence>)}
    <SoundDesign/>
    {frame < STARTS[1] ? <SceneEnvelope start={0} end={STARTS[1]}><StackScene mode="learn"/></SceneEnvelope>
      : frame < STARTS[2] ? <SceneEnvelope start={STARTS[1]} end={STARTS[2]}><StackScene mode={frame < ANSWER_REVEAL ? "quiz" : "answer"}/></SceneEnvelope>
      : frame < STARTS[3] ? <SceneEnvelope start={STARTS[2]} end={STARTS[3]}><RuleWordsScene/></SceneEnvelope>
      : frame < STARTS[4] ? <SceneEnvelope start={STARTS[3]} end={STARTS[4]}><DistinctionScene/></SceneEnvelope>
      : frame < STARTS[5] ? <SceneEnvelope start={STARTS[4]} end={STARTS[5]}><Question/></SceneEnvelope>
      : <SceneEnvelope start={STARTS[5]} end={TOTAL}><CTA/></SceneEnvelope>}
    <div style={{...base, position: "absolute", bottom: 80, width: "100%", color: "#929292", fontSize: 56}}>@이해하면쉬운영어</div>
  </AbsoluteFill>;
};

export const Ep8ShortsBAutoComposition = () => <Composition id="ep8-shorts-b-auto" component={Ep8ShortsBAuto} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920}/>;
