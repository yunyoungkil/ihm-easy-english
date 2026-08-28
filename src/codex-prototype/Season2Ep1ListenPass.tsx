import React from "react";
import {AbsoluteFill, Audio, Composition, Easing, Sequence, interpolate, staticFile, useCurrentFrame} from "remotion";
import {FONT_KEYWORD, FONT_SOUND} from "./fonts";
import {AnimatedSectionBand, SectionWipe} from "./Season2MotionSystem";

const T = {width: 1920, height: 1080, fps: 30, duration: 1418, bg: "#07111F", panel: "#112849", text: "#F8F4EC", muted: "#B7C5D7", gold: "#FFD15C", cyan: "#72D6EA", coral: "#FF846A"};
const fade = (frame: number, from: number, to: number) => Math.min(interpolate(frame, [from, from + 12], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)}), interpolate(frame, [to - 12, to], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic)}));


const Caption: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = [
    [0, 78, "I'mma call you later."],
    [78, 293, "방금 휙 지나간 원어민의 이 문장, 혹시 한국어 ‘아이 엄마’처럼 들리지 않으셨나요?"],
    [383, 530, "어리둥절하셔도 괜찮습니다. 초보라면 안 들리는 게 당연해요."],
    [530, 791, "사실 이건 ‘아이 엄마’가 아니라, ‘아이 앰 고잉 투’를 초고속으로 압착해서 뱉은 소리입니다."],
    [791, 970, "아니, ‘아이 앰 고잉 투’가 어떻게 ‘아이머’가 되냐고요?"],
    [970, 1147, "원어민들이 일상대화에서 말하기 귀찮아서 소리를 챡 합쳐버렸기 때문입니다."],
    [1147, 1280, "안 들리는 게 아니라 원리를 몰랐던 것뿐입니다."],
    [1280, 1418, "오늘 그 비밀 리듬을 단 3분 만에 완전히 깨부수어 드립니다!"],
  ] as const;
  const active = lines.find(([from, to]) => frame >= from && frame < to);
  if (!active) return null;
  const [from, to, text] = active;
  return <div style={{position: "absolute", bottom: 66, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: fade(frame, from, to)}}><div style={{maxWidth: 1450, padding: "18px 34px", borderRadius: 18, background: "rgba(4,13,26,.78)", border: "1px solid rgba(183,197,215,.18)", color: T.text, fontSize: 34, lineHeight: 1.34, fontWeight: 750, textAlign: "center"}}>{text}</div></div>;
};

const Phase: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {const frame = useCurrentFrame(); return <div style={{opacity: fade(frame, from, to)}}>{children}</div>;};

export const ListenPass: React.FC = () => {
  const frame = useCurrentFrame();
  const quizNumber = frame >= 293 && frame < 383 ? Math.max(1, Math.ceil((383 - frame) / 30)) : null;
  const merge = interpolate(frame, [950, 1060], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic)});
  const mergeSource = 1 - interpolate(frame, [950, 1000], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic)});
  const mergeResult = interpolate(frame, [1000, 1060], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic)});
  return <AbsoluteFill style={{background: `radial-gradient(circle at 50% 45%, ${T.panel}, ${T.bg} 72%)`, fontFamily: "Noto Sans KR, Arial, sans-serif", overflow: "hidden"}}>
    {Array.from({length: 18}, (_, i) => <div key={i} style={{position: "absolute", left: 100 + (i * 277) % 1690, top: 130 + (i * 157) % 780, width: 7, height: 7, borderRadius: 99, background: T.cyan, opacity: .1 + (i % 3) * .05}} />)}
    <Sequence from={0}><Audio src={staticFile("audio/season2_ep1_seg01.wav")} /></Sequence>
    <Sequence from={383}><Audio src={staticFile("audio/season2_ep1_seg02.wav")} /></Sequence>
    <Sequence from={791}><Audio src={staticFile("audio/season2_ep1_seg03.wav")} /></Sequence>
    <Sequence from={1147}><Audio src={staticFile("audio/season2_ep1_seg04.wav")} /></Sequence>
    <Sequence from={62}><Audio src={staticFile("audio/core-pass-pop.wav")} volume={0.11} /></Sequence>
    {[293, 323, 353].map((from) => <Sequence key={from} from={from}><Audio src={staticFile("audio/core-pass-tick.wav")} volume={0.12} /></Sequence>)}
    <Sequence from={1010}><Audio src={staticFile("audio/core-pass-squeeze.wav")} volume={0.13} /></Sequence>
    <Phase from={0} to={293}><AnimatedSectionBand step={1} label="LISTEN" from={0} progress={20}/><div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center"}}><div style={{fontSize: 33, color: T.muted, fontWeight: 700, marginBottom: 36}}>휙 지나간 이 문장, 이렇게 들리셨나요?</div><div style={{fontFamily: FONT_SOUND, fontSize: 124, color: T.gold, fontWeight: 600, letterSpacing: -3}}>I&apos;mma call you later</div><div style={{marginTop: 38, border: `2px solid ${T.coral}`, color: T.coral, borderRadius: 999, padding: "13px 30px", fontSize: 29, fontWeight: 800}}>“아이 엄마 콜 유 레이터”</div></div></Phase>
    <Phase from={293} to={383}><AnimatedSectionBand step={1} label="LISTEN" from={293} progress={20}/><div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center"}}><div style={{fontSize: 22, color: T.cyan, letterSpacing: 3, fontWeight: 900}}>DID YOU HEAR IT?</div><div style={{fontFamily: FONT_KEYWORD, color: T.gold, fontSize: 104, marginTop: 28}}>아이 엄마?</div><div style={{marginTop: 36, display: "flex", alignItems: "center", gap: 13, color: T.cyan, fontWeight: 900, letterSpacing: 2}}><span style={{fontSize: 18}}>THINK</span><span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 99, border: `2px solid ${T.cyan}`, fontSize: 27, color: T.text}}>{quizNumber}</span></div></div></Phase>
    <Phase from={383} to={791}><AnimatedSectionBand step={1} label="LISTEN" from={383} progress={20}/><div style={{position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 72}}><div style={{textAlign: "center"}}><div style={{fontSize: 21, color: T.muted, marginBottom: 24, letterSpacing: 2}}>WHAT YOU HEARD</div><div style={{fontFamily: FONT_KEYWORD, color: T.coral, fontSize: 88}}>아이 엄마</div></div><div style={{width: 150, height: 4, borderRadius: 99, background: T.cyan}} /><div style={{textAlign: "center"}}><div style={{fontSize: 21, color: T.muted, marginBottom: 24, letterSpacing: 2}}>WHAT IT WAS</div><div style={{fontFamily: FONT_SOUND, color: T.gold, fontSize: 78, fontWeight: 600}}>I am going to</div></div></div></Phase>
    <Phase from={791} to={1147}><AnimatedSectionBand step={1} label="LISTEN" from={791} progress={20}/><div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center"}}><div style={{fontSize: 33, color: T.muted, fontWeight: 700, marginBottom: 58}}>말하기 귀찮아서, 소리를 챡 합쳐버립니다.</div><div style={{height: 176, width: 1200, position: "relative"}}><div style={{position: "absolute", left: interpolate(merge, [0, 1], [80, 350]), top: 20, color: T.text, fontSize: 108, fontWeight: 900, opacity: mergeSource}}>I am</div><div style={{position: "absolute", left: interpolate(merge, [0, 1], [650, 650]), top: 20, color: T.coral, fontSize: 108, fontWeight: 900, transform: `scale(${1 - merge * .5})`, transformOrigin: "left center", opacity: mergeSource}}>going to</div><div style={{position: "absolute", left: 500, top: 20, color: T.gold, fontFamily: FONT_SOUND, fontSize: 124, fontWeight: 600, opacity: mergeResult}}>I&apos;mma</div><div style={{position: "absolute", left: 350, top: 145, width: interpolate(merge, [0, 1], [0, 650]), height: 6, borderRadius: 99, background: T.gold}} /></div></div></Phase>
    <Phase from={1147} to={1418}><AnimatedSectionBand step={1} label="LISTEN" from={1147} progress={20}/><div style={{position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center"}}><div style={{fontSize: 74, color: T.text, fontWeight: 900, letterSpacing: -4}}>안 들리는 게 아니라,<br /><span style={{fontFamily: FONT_KEYWORD, color: T.gold, fontWeight: 400}}>원리를 몰랐던 것</span>뿐입니다.</div><div style={{marginTop: 48, border: `1px solid ${T.cyan}88`, borderRadius: 999, padding: "17px 30px", color: T.cyan, fontSize: 29, fontWeight: 800}}>오늘, 비밀 리듬을 깨부숩니다.</div></div></Phase>
    <SectionWipe at={293}/><SectionWipe at={383}/><SectionWipe at={791} color={T.gold}/><SectionWipe at={1147}/>
    <Caption />
  </AbsoluteFill>;
};

export const Season2Ep1ListenPassComposition: React.FC = () => <Composition id="season2-ep1-listen-pass" component={ListenPass} durationInFrames={T.duration} fps={T.fps} width={T.width} height={T.height} />;
