import React from "react";
import {AbsoluteFill, Audio, Composition, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from "remotion";

const FPS = 30;
const DURATION = 1558;
const OUTLINE = 9;
type WordCard = {word: string; accent?: string; accentFrom?: number; reading?: string; readingAccent?: string; readingFrom?: number; wordColor?: string};
export type ShortsReplicaData = {headline: [string, string]; handle: string; audio: string};
export const EP8_SHORTS_A_DATA: ShortsReplicaData = {
  headline: ["틀리기 쉬운", "영어 발음 테스트"],
  handle: "@이해하면쉬운영어",
  audio: "audio/ep8-shorts-a-reference.wav",
};
const base: React.CSSProperties = {color: "#fff", fontFamily: "CapcutKorean, sans-serif", fontWeight: 900, lineHeight: 1, textAlign: "center"};
const Pop: React.FC<React.PropsWithChildren<{from: number; style?: React.CSSProperties}>> = ({from, style, children}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  const scale = spring({frame: frame - from, fps, config: {damping: 13, stiffness: 190, mass: 0.7}});
  return <div style={{...style, transform: `scale(${scale})`}}>{children}</div>;
};
const ColoredWord: React.FC<{word: string; accent?: string; accentFrom?: number}> = ({word, accent, accentFrom}) => {
  const frame = useCurrentFrame(); const {fps} = useVideoConfig();
  if (!accent || !word.includes(accent)) return <>{word}</>;
  const [left, right] = word.split(accent);
  const pulse = spring({frame: frame - (accentFrom ?? 0), fps, config: {damping: 10, stiffness: 240, mass: 0.55}});
  return <>{left}<span style={{color: "#ff0909", display: "inline-block", transform: `scale(${0.82 + pulse * 0.18})`, transformOrigin: "center 70%"}}>{accent}</span>{right}</>;
};
const Reading: React.FC<{text: string; accent?: string}> = ({text, accent}) => {
  if (!accent || !text.endsWith(accent)) return <>{text}</>;
  return <>{text.slice(0, -accent.length)}<span style={{color: "#1198f5"}}>{accent}</span></>;
};
const WordCardView: React.FC<WordCard & {from: number; y: number; compact?: boolean}> = ({word, accent, accentFrom, reading, readingAccent, readingFrom, wordColor = "#fff", from, y, compact}) => (
  <div style={{position: "absolute", top: y, left: 0, width: "100%", display: "flex", flexDirection: "column", alignItems: "center"}}>
    <Pop from={from} style={{display: "inline-block", transformOrigin: "center center"}}><div style={{...base, display: "inline-block", minWidth: compact ? 650 : 720, padding: compact ? "18px 38px 24px" : "28px 55px 34px", borderRadius: 30, background: "#ffda00", color: wordColor, WebkitTextStroke: wordColor === "#050505" ? "0px transparent" : `${OUTLINE}px #050505`, paintOrder: "stroke fill", fontFamily: "RubikBold, sans-serif", fontSize: compact ? 108 : 145, letterSpacing: 2}}><ColoredWord word={word} accent={accent} accentFrom={accentFrom}/></div></Pop>
    {reading ? <Pop from={readingFrom ?? from + 5} style={{marginTop: compact ? 25 : 48}}><div style={{...base, fontSize: compact ? 74 : 105, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill", color: "#050505"}}><Reading text={reading} accent={readingAccent}/></div></Pop> : null}
  </div>
);
const TwoCards: React.FC<{top: WordCard; bottom: WordCard; from: number}> = ({top, bottom, from}) => <><WordCardView {...top} from={from} y={700}/><WordCardView {...bottom} from={from + 5} y={1165}/></>;
const Header = ({data}: {data: ShortsReplicaData}) => <>
  <div style={{...base, position: "absolute", top: 190, left: 0, width: "100%", fontSize: 111, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill", color: "#ff7600"}}>{data.headline[0]}</div>
  <div style={{...base, position: "absolute", top: 335, left: 0, width: "100%", fontSize: 103, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill", color: "#050505"}}>{data.headline[1]}</div>
  <div style={{...base, position: "absolute", bottom: 92, left: 0, width: "100%", fontSize: 59, color: "#999"}}>{data.handle}</div>
</>;
const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const choPulse = spring({frame: frame - 1331, fps, config: {damping: 11, stiffness: 220}});
  const jeoPulse = spring({frame: frame - 1355, fps, config: {damping: 11, stiffness: 220}});
  return <>
    <Pop from={1202} style={{position: "absolute", left: 115, top: 730}}><div style={{...base, fontFamily: "RubikBold", fontSize: 250, color: "#f10b12", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>T</div></Pop>
    <Pop from={1227} style={{position: "absolute", left: 115, top: 1235}}><div style={{...base, fontFamily: "RubikBold", fontSize: 250, color: "#f10b12", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>S</div></Pop>
    {frame >= 1243 ? <><div style={{...base, position: "absolute", left: 480, top: 925, fontSize: 155}}>+</div><Pop from={1243} style={{position: "absolute", right: 120, top: 850}}><div style={{...base, fontFamily: "RubikBold", fontSize: 265, color: "#1097ed", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>U</div></Pop></> : null}
    {frame >= 1243 ? <div style={{position: "absolute", left: 70, top: 1000, width: 250, transform: `scale(${frame >= 1331 ? 0.88 + choPulse * 0.12 : 1})`}}><div style={{...base, fontSize: 110, color: frame >= 1331 ? "#1298ef" : "#fff", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>처</div></div> : null}
    {frame >= 1243 ? <div style={{position: "absolute", left: 70, top: 1505, width: 250, transform: `scale(${frame >= 1355 ? 0.88 + jeoPulse * 0.12 : 1})`}}><div style={{...base, fontSize: 110, color: frame >= 1355 ? "#1298ef" : "#fff", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>저</div></div> : null}
  </>;
};
void RuleScene;

const EquationRow: React.FC<{top: number; letter: "T" | "S"; letterFrom: number; result: "처" | "저"; resultFrom: number}> = ({top, letter, letterFrom, result, resultFrom}) => {
  const frame = useCurrentFrame();
  return <div style={{position: "absolute", left: 55, right: 55, top, height: 285, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
    <Pop from={letterFrom} style={{width: 205}}><div style={{...base, fontFamily: "RubikBold", fontSize: 250, color: "#f10b12", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>{letter}</div></Pop>
    {frame >= 1243 ? <Pop from={1243} style={{width: 105}}><div style={{...base, fontSize: 145, color: "#fff"}}>+</div></Pop> : <div style={{width: 105}}/>}
    {frame >= 1243 ? <Pop from={1243} style={{width: 220}}><div style={{...base, fontFamily: "RubikBold", fontSize: 250, color: "#1097ed", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>U</div></Pop> : <div style={{width: 220}}/>}
    {frame >= resultFrom ? <Pop from={resultFrom} style={{width: 165}}><div style={{...base, fontSize: 112, color: "#1298ef", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>{result}</div></Pop> : <div style={{width: 165}}/>}
  </div>;
};

const RuleSceneV2: React.FC = () => <>
  <EquationRow top={700} letter="T" letterFrom={1202} result="처" resultFrom={1331}/>
  <EquationRow top={1210} letter="S" letterFrom={1227} result="저" resultFrom={1365}/>
</>;

const ResultScene: React.FC = () => <>
  <WordCardView word="PICTURE" accent="TU" accentFrom={1137} from={1137} y={650}/>
  <Pop from={1141} style={{position: "absolute", left: 0, top: 900, width: "100%"}}><div style={{...base, fontSize: 112, color: "#1198f5", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>처</div></Pop>
  <WordCardView word="MEASURE" accent="SU" accentFrom={1145} from={1145} y={1110}/>
  <Pop from={1149} style={{position: "absolute", left: 0, top: 1360, width: "100%"}}><div style={{...base, fontSize: 112, color: "#1198f5", WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>저</div></Pop>
</>;

const DownArrow: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const y = interpolate(Math.sin((frame - from) * 0.34), [-1, 1], [-7, 13]);
  const opacity = interpolate(frame, [from, from + 8], [0, 1], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <div style={{position: "absolute", left: "50%", bottom: 285, width: 90, height: 155, opacity, transform: `translate(-50%, ${y}px)`}}>
    <div style={{position: "absolute", left: 38, top: 0, width: 14, height: 112, borderRadius: 8, background: "#ffda00"}}/>
    <div style={{position: "absolute", left: 14, bottom: 8, width: 62, height: 62, borderRight: "14px solid #ffda00", borderBottom: "14px solid #ffda00", transform: "rotate(45deg)", borderRadius: 5}}/>
  </div>;
};
export const Ep8ShortsAReplica: React.FC<{data?: ShortsReplicaData}> = ({data = EP8_SHORTS_A_DATA}) => {
  const frame = useCurrentFrame(); const fade = interpolate(frame, [1544, DURATION - 1], [1, 0], {extrapolateLeft: "clamp", extrapolateRight: "clamp"});
  return <AbsoluteFill style={{background: "#000", opacity: fade, overflow: "hidden"}}>
    <style>{`@font-face{font-family:CapcutKorean;src:url('${staticFile("fonts/capcut-korean.ttf")}')}@font-face{font-family:RubikBold;src:url('${staticFile("fonts/rubik-bold.ttf")}')}`}</style>
    <Audio src={staticFile(data.audio)}/><Header data={data}/>
    {frame < 243 ? <TwoCards from={0}
      top={{word: "PICTURE", accent: frame >= 53 ? "TU" : frame >= 36 ? "T" : undefined, accentFrom: frame >= 53 ? 53 : 36, reading: frame >= 78 ? "처" : undefined, readingAccent: "처", readingFrom: 78}}
      bottom={{word: "NATURE", accent: frame >= 144 ? "TU" : undefined, accentFrom: 144, reading: frame >= 156 ? "처" : undefined, readingAccent: "처", readingFrom: 156}}/> : null}
    {frame >= 243 && frame < 985 ? <TwoCards from={243}
      top={{word: "MEASURE", wordColor: frame < 824 ? "#050505" : "#fff", accent: frame >= 884 ? "SU" : frame >= 824 ? "S" : undefined, accentFrom: frame >= 884 ? 884 : 824, reading: frame >= 593 ? "메저" : frame >= 478 ? "메이처" : undefined, readingAccent: frame >= 919 ? "저" : undefined, readingFrom: frame >= 593 ? 593 : 478}}
      bottom={{word: "PLEASURE", wordColor: frame < 824 ? "#050505" : "#fff", accent: frame >= 884 ? "SU" : frame >= 824 ? "S" : undefined, accentFrom: frame >= 884 ? 884 : 824, reading: frame >= 609 ? "플레저" : frame >= 505 ? "플레이처" : undefined, readingAccent: frame >= 919 ? "저" : undefined, readingFrom: frame >= 609 ? 609 : 505}}/> : null}
    {frame >= 985 && frame < 1137 ? <>
      <WordCardView compact word="PLEASURE" accent={frame >= 1078 ? "SU" : frame >= 1048 ? "S" : undefined} accentFrom={frame >= 1078 ? 1078 : 1048} from={985} y={590}/>
      <WordCardView compact word="MEASURE" accent={frame >= 1078 ? "SU" : frame >= 1048 ? "S" : undefined} accentFrom={frame >= 1078 ? 1078 : 1048} from={990} y={850}/>
      <WordCardView compact word="NATURE" accent={frame >= 1078 ? "TU" : frame >= 1024 ? "T" : undefined} accentFrom={frame >= 1078 ? 1078 : 1024} from={995} y={1110}/>
      <WordCardView compact word="PICTURE" accent={frame >= 1078 ? "TU" : frame >= 1024 ? "T" : undefined} accentFrom={frame >= 1078 ? 1078 : 1024} from={1000} y={1370}/>
    </> : null}
    {frame >= 1137 && frame < 1202 ? <ResultScene/> : null}
    {frame >= 1202 && frame < 1477 ? <RuleSceneV2/> : null}
    {frame >= 1477 ? <><Pop from={1477} style={{position: "absolute", top: 760, left: 80, right: 80}}><div style={{...base, fontSize: 92, lineHeight: 1.25}}>관련 동영상에서<br/><span style={{color: "#ffda00"}}>지금 바로 확인</span></div></Pop><DownArrow from={1485}/></> : null}
  </AbsoluteFill>;
};
export const Ep8ShortsAReplicaComposition = () => <Composition id="ep8-shorts-a-replica" component={Ep8ShortsAReplica} durationInFrames={DURATION} fps={FPS} width={1080} height={1920}/>;
