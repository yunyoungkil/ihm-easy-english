import React from "react";
import {AbsoluteFill, Audio, Composition, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";
import schwaScript from "../../scripts/channel_shortsC_schwa.json";

const FPS = 30;
// Match the measured WAV lengths. The files already include natural end breaths,
// so adding a separate visual tail makes Shorts scene boundaries feel too slow.
const DURATIONS = [250, 289, 265, 301, 304, 168];
const STARTS = DURATIONS.map((_, index) => DURATIONS.slice(0, index).reduce((sum, value) => sum + value, 0));
const TOTAL = DURATIONS.reduce((sum, value) => sum + value, 0);
const YELLOW = "#ffd900";
const BLUE = "#008eff";
const PURPLE = "#8100ff";
const RED = "#ff304f";
const INK = "#06090e";
const OUTLINE = 8;
const SAFE_RIGHT = 70;
const SAFE_BOTTOM = 310;
const font: React.CSSProperties = {fontFamily: "CapcutKorean, sans-serif", fontWeight: 900, textAlign: "center", lineHeight: 1.08};
const card: React.CSSProperties = {border: "8px solid #fff", borderRadius: 36, boxShadow: "14px 16px 0 #174fa8"};

const enter = (frame: number, delay = 0) => spring({frame: frame - delay, fps: FPS, config: {damping: 15, stiffness: 180}});

const Scene: React.FC<React.PropsWithChildren> = ({children}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const opacity = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{opacity}}>
    <div style={{position: "absolute", inset: 0, opacity: .16, backgroundImage: "linear-gradient(#008eff22 2px,transparent 2px),linear-gradient(90deg,#008eff22 2px,transparent 2px)", backgroundSize: "120px 120px", transform: "rotate(-3deg) scale(1.1)"}}/>
    {children}
  </AbsoluteFill>;
};

const Brand = () => <>
  <div style={{position: "absolute", top: 105, left: 52, display: "flex", alignItems: "center", gap: 14, color: "#aeb6c4", fontSize: 30, ...font}}>
    <span style={{width: 30, height: 30, border: `6px solid ${BLUE}`, borderRadius: "50%", boxShadow: `0 0 0 7px ${BLUE}33`}}/>
    소리 지도 · @이해하면쉬운영어
  </div>
</>;

type CaptionCue = {text: string; from: number; to: number};

const NarrationCaption: React.FC<{cues: CaptionCue[]}> = ({cues}) => {
  const frame = useCurrentFrame();
  const cue = cues.find((item) => frame >= item.from && frame < item.to);
  if (!cue) return null;
  const reveal = enter(frame, cue.from);
  return <div style={{position: "absolute", zIndex: 20, bottom: SAFE_BOTTOM, left: 70, right: SAFE_RIGHT, display: "flex", justifyContent: "center", opacity: reveal, transform: `translateY(${(1 - reveal) * 18}px)`}}>
    <div style={{...font, maxWidth: 870, padding: "16px 28px 20px", borderRadius: 22, background: "#02050bcc", border: "2px solid #ffffff24", color: "#f4f6fa", fontSize: 42, lineHeight: 1.28, wordBreak: "keep-all"}}>{cue.text}</div>
  </div>;
};

const Hook = () => {
  const frame = useCurrentFrame();
  const first = enter(frame);
  const second = enter(frame, 171);
  return <Scene>
    <div style={{...font, position: "absolute", top: 380, width: "100%", color: "#fff", fontSize: 74, opacity: first}}>원어민 말이</div>
    <div style={{...font, position: "absolute", top: 530, width: "100%", color: RED, fontSize: 146, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill", transform: `scale(${0.82 + first * 0.18})`}}>빠른 이유?</div>
    <div style={{position: "absolute", top: 790, left: 150, right: 150, height: 16, background: "#fff", transform: `rotate(-6deg) scaleX(${second})`}}/>
    <div style={{...font, position: "absolute", top: 900, left: 55, right: SAFE_RIGHT, color: YELLOW, fontSize: 96, opacity: second, transform: `translateY(${(1 - second) * 60}px)`}}>속도가 아니라<br/>소리를 줄입니다</div>
  </Scene>;
};

const Rhythm = () => {
  const frame = useCurrentFrame();
  const beat = Math.sin(frame * 0.18) * 8;
  const explanation = enter(frame, 136);
  const bars = [1, .35, .25, 1, .3, .2, 1];
  return <Scene>
    <div style={{...font, position: "absolute", top: 330, width: "100%", color: "#fff", fontSize: 72}}>영어는</div>
    <div style={{...font, position: "absolute", top: 445, width: "100%", color: YELLOW, fontSize: 104}}>강약의 리듬</div>
    <div style={{position: "absolute", top: 720, left: 65, right: SAFE_RIGHT, height: 420, display: "flex", alignItems: "center", justifyContent: "space-around", opacity: .18 + explanation * .82, transform: `scaleY(${.7 + explanation * .3})`}}>
      {bars.map((height, index) => <div key={index} style={{width: 74, height: 80 + height * 260, borderRadius: 40, background: height === 1 ? YELLOW : BLUE, transform: height === 1 ? `translateY(${beat}px)` : "none", boxShadow: height === 1 ? `0 0 40px ${YELLOW}88` : "none"}}/>)}
    </div>
    <div style={{...font, position: "absolute", top: 1220, left: 55, right: SAFE_RIGHT, color: "#fff", fontSize: 56, opacity: explanation, transform: `translateY(${(1 - explanation) * 45}px)`}}>중요한 음절은 <span style={{color: YELLOW}}>강하게</span><br/>나머지는 <span style={{color: BLUE}}>짧고 약하게</span></div>
  </Scene>;
};

const SchwaRule = () => {
  const frame = useCurrentFrame();
  const arrowReveal = enter(frame, 132);
  const schwaReveal = enter(frame, 225);
  const glow = 24 + Math.sin(frame * .15) * 10;
  return <Scene>
    <div style={{...font, position: "absolute", top: 350, width: "100%", color: "#fff", fontSize: 66}}>강세 없는 모음은</div>
    <div style={{...font, position: "absolute", top: 560, width: "100%", color: "#fff", fontFamily: "RubikBold, sans-serif", fontSize: 112, letterSpacing: 24}}>A E I O U</div>
    <div style={{...font, position: "absolute", top: 800, left: 0, right: SAFE_RIGHT, color: BLUE, fontSize: 84, opacity: arrowReveal, transform: `scale(${.8 + arrowReveal * .2})`}}>↓ 힘이 빠지면 ↓</div>
    <div style={{...font, position: "absolute", top: 960, left: 0, right: SAFE_RIGHT, color: YELLOW, fontFamily: "RubikBold, sans-serif", fontSize: 240, opacity: schwaReveal, transform: `scale(${.45 + schwaReveal * .55})`, textShadow: `0 0 ${glow}px ${YELLOW}`}}>ə</div>
    <div style={{...font, position: "absolute", top: 1200, left: 0, right: SAFE_RIGHT, color: "#fff", fontSize: 66, opacity: schwaReveal}}>어와 으 사이<br/><span style={{color: YELLOW}}>슈와</span></div>
  </Scene>;
};

const Word: React.FC<{word: string; reading: string; accent: string; index: number; active: number}> = ({word, reading, accent, index, active}) => {
  const frame = useCurrentFrame();
  const from = [9, 50, 82][index];
  const pop = enter(frame, from);
  const parts = word.split(accent);
  const isActive = active === index;
  return <div style={{position: "absolute", top: 650, left: 55, right: SAFE_RIGHT, opacity: pop * (isActive ? 1 : 0), transform: `translateX(${(1 - pop) * 100}px) scale(${isActive ? 1 : .84})`}}>
    <div style={{...font, ...card, background: YELLOW, padding: "24px 16px 30px", color: "#fff", WebkitTextStroke: `${OUTLINE}px ${INK}`, paintOrder: "stroke fill", fontFamily: "RubikBold, sans-serif", fontSize: 104}}>{parts[0]}<span style={{color: RED}}>{accent}</span>{parts[1]}</div>
    <div style={{...font, color: "#fff", fontSize: 62, marginTop: 24}}>{reading} <span style={{color: BLUE}}>→ ə</span></div>
  </div>;
};

const Examples = () => {
  const frame = useCurrentFrame();
  const active = frame < 50 ? 0 : frame < 82 ? 1 : 2;
  return <Scene>
    <div style={{...font, position: "absolute", top: 230, width: "100%", color: "#fff", fontSize: 64}}>철자는 달라도</div>
    <div style={{...font, position: "absolute", top: 335, width: "100%", color: BLUE, fontSize: 82}}>힘 빠진 소리는 같습니다</div>
    <Word word="BANANA" accent="A" reading="버내너" index={0} active={active}/>
    <Word word="PIZZA" accent="A" reading="피처" index={1} active={active}/>
    <Word word="COMPUTER" accent="O" reading="컴퓨터" index={2} active={active}/>
  </Scene>;
};

const Listening = () => {
  const frame = useCurrentFrame();
  const cross = interpolate(frame, [127, 160], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  const answer = enter(frame, 178);
  return <Scene>
    <div style={{...font, position: "absolute", top: 390, left: 55, right: SAFE_RIGHT, color: "#fff", fontSize: 68}}>모든 글자를</div>
    <div style={{...font, position: "absolute", top: 535, left: 55, right: SAFE_RIGHT, color: RED, fontSize: 94}}>찾지 마세요</div>
    <div style={{position: "absolute", top: 615, left: 145, right: 145, height: 16, borderRadius: 20, background: "#fff", transform: `rotate(-5deg) scaleX(${cross})`}}/>
    <div style={{...font, position: "absolute", top: 850, left: 55, right: SAFE_RIGHT, color: YELLOW, fontSize: 84, opacity: answer, transform: `scale(${0.84 + answer * .16})`}}>강한 소리를 잡고</div>
    <div style={{...font, position: "absolute", top: 1040, left: 55, right: SAFE_RIGHT, color: BLUE, fontSize: 78, opacity: answer}}>약한 소리는<br/>흘려듣기</div>
  </Scene>;
};

const CTA = () => {
  const frame = useCurrentFrame();
  const pop = enter(frame);
  const method = enter(frame, 32);
  const related = enter(frame, 114);
  const arrow = 10 + Math.sin(frame * .25) * 18;
  return <Scene>
    <div style={{...card, position: "absolute", top: 485, left: 65, right: SAFE_RIGHT, height: 540, background: PURPLE, transform: `scale(${pop}) rotate(-1deg)`}}>
      <div style={{...font, marginTop: 72, color: "#fff", fontSize: 54}}>슈와를 찾는</div>
      <div style={{...font, marginTop: 28, color: YELLOW, fontSize: 132, opacity: method, transform: `scale(${0.82 + method * 0.18})`}}>3가지 방법</div>
      <div style={{...font, marginTop: 42, color: "#fff", fontSize: 58, opacity: related, transform: `translateY(${(1 - related) * 32}px)`}}>관련 영상에서<br/><span style={{color: BLUE, WebkitTextStroke: "5px #fff", paintOrder: "stroke fill"}}>지금 바로 확인</span></div>
    </div>
    <div style={{...font, position: "absolute", top: 1115 + arrow, left: 0, right: SAFE_RIGHT, color: YELLOW, fontSize: 190, WebkitTextStroke: "8px #fff", paintOrder: "stroke fill"}}>↓</div>
  </Scene>;
};

const scenes = [Hook, Rhythm, SchwaRule, Examples, Listening, CTA];

const SoundDesign = () => <>
  <Sequence from={171} durationInFrames={28}>
    <Audio src={staticFile("audio/core-pass-squeeze.wav")} volume={0.045}/>
  </Sequence>
  <Sequence from={STARTS[2] + 225} durationInFrames={34}>
    <Audio src={staticFile("audio/core-pass-ding.wav")} volume={0.065}/>
  </Sequence>
  <Sequence from={STARTS[5] + 114} durationInFrames={30}>
    <Audio src={staticFile("audio/core-pass-pop.wav")} volume={0.05}/>
  </Sequence>
</>;

export const ChannelShortsCSchwa: React.FC = () => <AbsoluteFill style={{background: `radial-gradient(circle at 50% 32%,#12345b 0,${INK} 46%)`, overflow: "hidden"}}>
  {DURATIONS.map((duration, index) => {
    const Component = scenes[index];
    const cues = schwaScript.segments[index]?.subtitleGroups ?? [];
    return <Sequence key={index} from={STARTS[index]} durationInFrames={duration}>
      <Audio src={staticFile(`audio/channel_shortsC_schwa_seg0${index + 1}_norm.wav`)}/>
      <Component/>
      <NarrationCaption cues={cues}/>
    </Sequence>;
  })}
  <SoundDesign/>
  <Brand/>
</AbsoluteFill>;

const ChannelShortsCSchwaThumbnail = () => <AbsoluteFill style={{background: `radial-gradient(circle at 50% 38%,#163e69 0,${INK} 58%)`, overflow: "hidden"}}>
  <div style={{position: "absolute", inset: 0, opacity: .2, backgroundImage: "linear-gradient(#008eff22 2px,transparent 2px),linear-gradient(90deg,#008eff22 2px,transparent 2px)", backgroundSize: "120px 120px", transform: "rotate(-3deg) scale(1.1)"}}/>
  <div style={{position: "absolute", top: 115, left: 58, display: "flex", alignItems: "center", gap: 14, color: "#aeb6c4", fontSize: 31, ...font}}>
    <span style={{width: 30, height: 30, border: `6px solid ${BLUE}`, borderRadius: "50%", boxShadow: `0 0 0 7px ${BLUE}33`}}/>
    소리 지도 · @이해하면쉬운영어
  </div>
  <div style={{...font, position: "absolute", top: 330, left: 55, right: 55, color: "#fff", fontSize: 94}}>원어민이 빠른 이유</div>
  <div style={{...font, ...card, position: "absolute", top: 535, left: 70, right: 70, padding: "44px 20px 52px", background: RED, color: "#fff", fontSize: 118, transform: "rotate(-2deg)"}}>속도가 아니다?</div>
  <div style={{...font, position: "absolute", top: 880, left: 0, right: 0, color: YELLOW, fontFamily: "RubikBold, sans-serif", fontSize: 430, textShadow: `0 0 50px ${YELLOW}88`}}>ə</div>
  <div style={{...font, position: "absolute", top: 1370, left: 70, right: 70, color: "#fff", fontSize: 72}}>빠른 영어의<br/><span style={{color: BLUE, fontSize: 104}}>숨은 소리</span></div>
</AbsoluteFill>;

export const ChannelShortsCSchwaComposition = () => <>
  <Composition id="channel-shorts-c-schwa" component={ChannelShortsCSchwa} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920}/>
  <Composition id="channel-shorts-c-schwa-thumbnail" component={ChannelShortsCSchwaThumbnail} durationInFrames={1} fps={FPS} width={1080} height={1920}/>
</>;
