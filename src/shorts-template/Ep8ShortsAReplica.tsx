import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const FPS = 30;
const DURATION = 1558;

type WordCard = {
  word: string;
  accent?: string;
  reading?: string;
  readingAccent?: string;
};

export type ShortsReplicaData = {
  headline: [string, string];
  handle: string;
  audio: string;
};

export const EP8_SHORTS_A_DATA: ShortsReplicaData = {
  headline: ['틀리기 쉬운', '영어 발음 테스트'],
  handle: '@이해하면쉬운영어',
  audio: 'audio/ep8-shorts-a-reference.wav',
};

const base: React.CSSProperties = {
  color: '#fff',
  fontFamily: 'CapcutKorean, sans-serif',
  fontWeight: 900,
  lineHeight: 1,
  textAlign: 'center',
};

const Pop: React.FC<React.PropsWithChildren<{from: number; style?: React.CSSProperties}>> = ({from, style, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame: frame - from, fps, config: {damping: 13, stiffness: 190, mass: 0.7}});
  return <div style={{...style, transform: `scale(${scale})`}}>{children}</div>;
};

const ColoredWord: React.FC<{word: string; accent?: string}> = ({word, accent}) => {
  if (!accent || !word.includes(accent)) return <>{word}</>;
  const [left, right] = word.split(accent);
  return <>{left}<span style={{color: '#ff0909'}}>{accent}</span>{right}</>;
};

const WordCardView: React.FC<WordCard & {from: number; y: number}> = ({word, accent, reading, readingAccent, from, y}) => (
  <div style={{position: 'absolute', top: y, left: 0, width: '100%'}}>
    <Pop from={from} style={{display: 'inline-block'}}>
      <div style={{
        ...base,
        display: 'inline-block',
        minWidth: 720,
        padding: '28px 55px 34px',
        borderRadius: 30,
        background: '#ffda00',
        color: '#fff',
        WebkitTextStroke: '15px #050505',
        paintOrder: 'stroke fill',
        fontFamily: 'RubikBold, sans-serif',
        fontSize: 145,
        letterSpacing: 2,
      }}><ColoredWord word={word} accent={accent}/></div>
    </Pop>
    {reading ? <Pop from={from + 5} style={{marginTop: 48}}>
      <div style={{...base, fontSize: 105, WebkitTextStroke: '10px #fff', paintOrder: 'stroke fill', color: '#050505'}}>
        {readingAccent && reading.endsWith(readingAccent)
          ? <>{reading.slice(0, -readingAccent.length)}<span style={{color: '#1198f5'}}>{readingAccent}</span></>
          : reading}
      </div>
    </Pop> : null}
  </div>
);

const TwoCards: React.FC<{top: WordCard; bottom: WordCard; from: number}> = ({top, bottom, from}) => (
  <>
    <WordCardView {...top} from={from} y={700}/>
    <WordCardView {...bottom} from={from + 5} y={1165}/>
  </>
);

const Header = ({data}: {data: ShortsReplicaData}) => (
  <>
    <div style={{...base, position: 'absolute', top: 190, left: 0, width: '100%', fontSize: 111, WebkitTextStroke: '12px #fff', paintOrder: 'stroke fill', color: '#ff7600'}}>{data.headline[0]}</div>
    <div style={{...base, position: 'absolute', top: 335, left: 0, width: '100%', fontSize: 103, WebkitTextStroke: '12px #fff', paintOrder: 'stroke fill', color: '#050505'}}>{data.headline[1]}</div>
    <div style={{...base, position: 'absolute', bottom: 92, left: 0, width: '100%', fontSize: 59, color: '#999'}}>{data.handle}</div>
  </>
);

const RuleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const showU = frame >= 1243;
  const showReadings = frame >= 1331;
  return <>
    <Pop from={1202} style={{position: 'absolute', left: 115, top: 730}}><div style={{...base, fontFamily: 'RubikBold', fontSize: 250, color: '#f10b12', WebkitTextStroke: '15px #fff', paintOrder: 'stroke fill'}}>T</div></Pop>
    <Pop from={1227} style={{position: 'absolute', left: 115, top: 1235}}><div style={{...base, fontFamily: 'RubikBold', fontSize: 250, color: '#f10b12', WebkitTextStroke: '15px #fff', paintOrder: 'stroke fill'}}>S</div></Pop>
    {showU ? <><div style={{...base, position: 'absolute', left: 480, top: 925, fontSize: 155}}>+</div><Pop from={1243} style={{position: 'absolute', right: 120, top: 850}}><div style={{...base, fontFamily: 'RubikBold', fontSize: 265, color: '#1097ed', WebkitTextStroke: '15px #fff', paintOrder: 'stroke fill'}}>U</div></Pop></> : null}
    {showReadings ? <><div style={{...base, position: 'absolute', left: 490, top: 770, fontSize: 110, color: '#1298ef', WebkitTextStroke: '9px #fff', paintOrder: 'stroke fill'}}>처</div><div style={{...base, position: 'absolute', left: 490, top: 1310, fontSize: 110, color: '#1298ef', WebkitTextStroke: '9px #fff', paintOrder: 'stroke fill'}}>저</div></> : null}
  </>;
};

export const Ep8ShortsAReplica: React.FC<{data?: ShortsReplicaData}> = ({data = EP8_SHORTS_A_DATA}) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [1544, DURATION - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{background: '#000', opacity: fade, overflow: 'hidden'}}>
    <style>{`@font-face{font-family:CapcutKorean;src:url('${staticFile('fonts/capcut-korean.ttf')}')}@font-face{font-family:RubikBold;src:url('${staticFile('fonts/rubik-bold.ttf')}')}`}</style>
    <Audio src={staticFile(data.audio)}/>
    <Header data={data}/>
    {frame < 243 ? <TwoCards from={0} top={{word: 'PICTURE', accent: 'TU', reading: '픽처', readingAccent: '처'}} bottom={{word: 'NATURE', reading: '네이처', readingAccent: '처'}}/> : null}
    {frame >= 243 && frame < 985 ? <TwoCards from={243} top={{word: 'MEASURE', accent: 'SU', reading: '메저', readingAccent: '저'}} bottom={{word: 'PLEASURE', accent: 'SU', reading: '플레저', readingAccent: '저'}}/> : null}
    {frame >= 985 && frame < 1202 ? <>
      <WordCardView word="PLEASURE" accent="SU" from={985} y={610}/>
      <WordCardView word="MEASURE" accent="SU" from={990} y={875}/>
      <WordCardView word="NATURE" from={995} y={1140}/>
      <WordCardView word="PICTURE" accent="TU" from={1000} y={1405}/>
    </> : null}
    {frame >= 1202 && frame < 1477 ? <RuleScene/> : null}
    {frame >= 1477 ? <Pop from={1477} style={{position: 'absolute', top: 850, left: 80, right: 80}}><div style={{...base, fontSize: 92, lineHeight: 1.25}}>관련 동영상에서<br/><span style={{color: '#ffda00'}}>지금 바로 확인</span></div></Pop> : null}
  </AbsoluteFill>;
};

export const Ep8ShortsAReplicaComposition = () => <Composition
  id="ep8-shorts-a-replica"
  component={Ep8ShortsAReplica}
  durationInFrames={DURATION}
  fps={FPS}
  width={1080}
  height={1920}
/>;
