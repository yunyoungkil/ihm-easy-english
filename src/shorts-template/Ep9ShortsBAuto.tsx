import React from "react";
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
} from "remotion";

const FPS = 30;
// Both quiz beats receive a code-controlled thinking window. The narration
// files themselves remain unchanged, so answer timing never depends on a TTS pause.
const DURATIONS = [338, 323, 482, 366];
const STARTS = DURATIONS.map((_, index) =>
  DURATIONS.slice(0, index).reduce((sum, duration) => sum + duration, 0),
);
const TOTAL = DURATIONS.reduce((sum, duration) => sum + duration, 0);

const YELLOW = "#ffd900";
const RED = "#ff0000";
const BLUE = "#008eff";
const PURPLE = "#8100ff";
const OUTLINE = 9;
const base: React.CSSProperties = {
  fontFamily: "CapcutKorean, sans-serif",
  fontWeight: 900,
  textAlign: "center",
  lineHeight: 1.08,
};

const pop = (frame: number, from = 0) =>
  spring({frame: frame - from, fps: FPS, config: {damping: 15, stiffness: 180}});

const Header = () => (
  <>
    <div
      style={{
        ...base,
        position: "absolute",
        top: 195,
        width: "100%",
        color: "#ff7200",
        fontSize: 98,
        WebkitTextStroke: `${OUTLINE}px #fff`,
        paintOrder: "stroke fill",
      }}
    >
      단어가 바뀌면
    </div>
    <div
      style={{
        ...base,
        position: "absolute",
        top: 325,
        width: "100%",
        color: "#050505",
        fontSize: 94,
        WebkitTextStroke: `${OUTLINE}px #fff`,
        paintOrder: "stroke fill",
      }}
    >
      발음도 바뀐다
    </div>
  </>
);

const WordCard: React.FC<{
  word: string;
  reading?: string;
  activeCial?: boolean;
  stress?: string;
  activeStress?: boolean;
  scale?: number;
}> = ({word, reading, activeCial = false, stress, activeStress = false, scale = 1}) => {
  const cialAt = word.lastIndexOf("CIAL");
  const renderWord = () => {
    if (activeStress && stress) {
      const at = word.indexOf(stress);
      return (
        <>
          {word.slice(0, at)}
          <span style={{color: YELLOW, textShadow: "0 0 22px #ffd900aa"}}>{stress}</span>
          {word.slice(at + stress.length)}
        </>
      );
    }
    if (cialAt >= 0) {
      return (
        <>
          {word.slice(0, cialAt)}
          <span style={{color: activeCial ? RED : "#fff", textShadow: activeCial ? "0 0 20px #ff000099" : "none"}}>
            {word.slice(cialAt)}
          </span>
        </>
      );
    }
    return word;
  };
  return (
    <div style={{transform: `scale(${scale})`}}>
      <div
        style={{
          ...base,
          padding: "26px 16px 31px",
          borderRadius: 28,
          background: activeStress ? "#263247" : YELLOW,
          color: "#fff",
          fontFamily: "RubikBold, sans-serif",
          fontSize: word.length >= 10 ? 86 : 104,
          WebkitTextStroke: `${OUTLINE}px #050505`,
          paintOrder: "stroke fill",
          boxShadow: "0 16px 0 #000",
        }}
      >
        {renderWord()}
      </div>
      {reading ? (
        <div
          style={{
            ...base,
            marginTop: 24,
            color: "#050505",
            fontSize: 76,
            WebkitTextStroke: `${OUTLINE}px #fff`,
            paintOrder: "stroke fill",
          }}
        >
          {reading.endsWith("셜") ? (
            <>
              {reading.slice(0, -1)}
              <span style={{color: activeCial ? BLUE : "#050505"}}>셜</span>
            </>
          ) : (
            reading
          )}
        </div>
      ) : null}
    </div>
  );
};

const Countdown: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  if (frame < from) return null;
  const local = frame - from;
  const count = local < 30 ? "3" : local < 60 ? "2" : "1";
  return (
    <div
      style={{
        ...base,
        position: "absolute",
        top: 1415,
        left: "50%",
        width: 150,
        height: 150,
        marginLeft: -75,
        paddingTop: 26,
        borderRadius: "50%",
        background: PURPLE,
        border: "9px solid #fff",
        color: "#fff",
        fontSize: 88,
        transform: `scale(${1 + Math.sin(local * 0.16) * 0.025})`,
      }}
    >
      {count}
    </div>
  );
};

const CommerceQuiz = () => {
  const frame = useCurrentFrame();
  const showResult = frame >= 83;
  const showWrong = frame >= 215;
  return (
    <>
      <div style={{position: "absolute", top: 565, left: 70, right: 70}}>
        <WordCard word="COMMERCE" reading="커머스" scale={pop(frame)} />
        <div style={{...base, margin: "65px 0", color: BLUE, fontSize: 105}}>↓</div>
        <WordCard word="COMMERCIAL" scale={pop(frame, 83)} />
      </div>
      {showResult ? (
        <div style={{...base, position: "absolute", top: 1260, width: "100%", color: "#fff", fontSize: 64}}>
          광고의
        </div>
      ) : null}
      {showWrong ? (
        <div style={{...base, position: "absolute", top: 1330, width: "100%", color: "#fff", fontSize: 68}}>
          커머시알?
        </div>
      ) : null}
      <Countdown from={248} />
    </>
  );
};

const FinanceQuiz = () => {
  const frame = useCurrentFrame();
  const finance = frame >= 73;
  const question = frame >= 121;
  return (
    <>
      {!finance ? (
        <div style={{position: "absolute", top: 690, left: 70, right: 70}}>
          <WordCard word="COMMERCIAL" reading="커머셜" activeCial scale={pop(frame)} />
        </div>
      ) : (
        <div style={{position: "absolute", top: 555, left: 70, right: 70}}>
          <WordCard word="FINANCE" reading="파이낸스" scale={pop(frame, 73)} />
          <div style={{...base, margin: "58px 0", color: BLUE, fontSize: 105}}>↓</div>
          <WordCard word="FINANCIAL" scale={pop(frame, 121)} />
        </div>
      )}
      {question ? (
        <div style={{...base, position: "absolute", top: 1325, width: "100%", color: "#fff", fontSize: 63}}>
          파이낸시알일까요?
        </div>
      ) : null}
      <Countdown from={233} />
    </>
  );
};

const RuleAndStress = () => {
  const frame = useCurrentFrame();
  const answer = frame < 89;
  const rule = frame >= 89 && frame < 274;
  const stressRule = frame >= 274;
  const finalStress = frame >= 383;
  if (answer) {
    return (
      <div style={{position: "absolute", top: 690, left: 55, right: 55}}>
        <WordCard word="FINANCIAL" reading="파이낸셜" activeCial scale={pop(frame, 18)} />
      </div>
    );
  }
  return (
    <>
      <div style={{position: "absolute", top: 570, left: 55, right: 55}}>
        <WordCard word="COMMERCIAL" reading={rule ? "커머셜" : undefined} activeCial={rule} stress="MER" activeStress={finalStress} />
        <div style={{height: 115}} />
        <WordCard word="FINANCIAL" reading={rule ? "파이낸셜" : undefined} activeCial={rule} stress="NAN" activeStress={finalStress} />
      </div>
      {stressRule ? (
        <div style={{...base, position: "absolute", top: 1390, left: 55, right: 55, color: finalStress ? YELLOW : "#fff", fontSize: 65}}>
          힘은 ‘셜’ 바로 앞 음절
        </div>
      ) : null}
    </>
  );
};

const SummaryAndCta = () => {
  const frame = useCurrentFrame();
  if (frame < 225) {
    return (
      <>
        <div style={{...base, position: "absolute", top: 635, left: 80, right: 80, color: "#fff", fontSize: 79}}>
          철자를 전부<br />외울 필요는 없습니다
        </div>
        <div style={{...base, position: "absolute", top: 990, left: 70, right: 70, color: BLUE, fontSize: 70}}>
          같은 끝 모양을 발견하면
        </div>
        <div style={{...base, position: "absolute", top: 1125, left: 70, right: 70, color: YELLOW, fontSize: 82}}>
          발음 + 강세 예측
        </div>
      </>
    );
  }
  if (frame < 282) {
    return (
      <div style={{...base, position: "absolute", top: 790, left: 65, right: 65, color: "#fff", fontSize: 88, transform: `scale(${pop(frame, 225)})`}}>
        왜 이런 규칙이<br />생겼을까요?
      </div>
    );
  }
  const local = frame - 282;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 650,
          left: 90,
          right: 90,
          height: 450,
          borderRadius: 42,
          border: "12px solid #fff",
          background: PURPLE,
          boxShadow: "18px 22px 0 #1458b8",
          transform: `scale(${pop(frame, 282)}) rotate(-1.5deg)`,
        }}
      >
        <div style={{...base, marginTop: 104, color: "#fff", fontSize: 70}}>관련 영상에서</div>
        <div style={{...base, marginTop: 44, color: BLUE, fontSize: 88, WebkitTextStroke: `${OUTLINE}px #fff`, paintOrder: "stroke fill"}}>
          지금 바로 확인
        </div>
      </div>
      <div style={{...base, position: "absolute", top: 1185, width: "100%", color: YELLOW, fontSize: 185, WebkitTextStroke: "10px #fff", paintOrder: "stroke fill", transform: `translateY(${Math.sin(local * 0.24) * 14}px)`}}>
        ↓
      </div>
    </>
  );
};

export const Ep9ShortsBAuto: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame % 600, [0, 300, 600], [-100, 90, -100]);
  return (
    <AbsoluteFill style={{background: "#06090e", overflow: "hidden"}}>
      <div style={{position: "absolute", width: 650, height: 650, left: drift, top: 520, borderRadius: "50%", background: "radial-gradient(circle,#008eff22,transparent 68%)"}} />
      <Header />
      {STARTS.map((start, index) => (
        <Sequence key={start} from={start} durationInFrames={DURATIONS[index]}>
          <Audio src={staticFile(`audio/ep09_shortsB_auto_seg0${index + 1}.wav`)} />
        </Sequence>
      ))}
      <Sequence from={STARTS[1]} durationInFrames={30}><Audio src={staticFile("audio/core-pass-ding.wav")} volume={0.09} /></Sequence>
      <Sequence from={STARTS[2]} durationInFrames={30}><Audio src={staticFile("audio/core-pass-ding.wav")} volume={0.09} /></Sequence>
      <Sequence from={STARTS[3] + 282} durationInFrames={30}><Audio src={staticFile("audio/core-pass-pop.wav")} volume={0.065} /></Sequence>
      {frame < STARTS[1] ? (
        <CommerceQuiz />
      ) : frame < STARTS[2] ? (
        <Sequence from={STARTS[1]}><FinanceQuiz /></Sequence>
      ) : frame < STARTS[3] ? (
        <Sequence from={STARTS[2]}><RuleAndStress /></Sequence>
      ) : (
        <Sequence from={STARTS[3]}><SummaryAndCta /></Sequence>
      )}
      <div style={{...base, position: "absolute", bottom: 255, width: "100%", color: "#929292", fontSize: 54}}>
        @이해하면쉬운영어
      </div>
    </AbsoluteFill>
  );
};

export const Ep9ShortsBAutoComposition = () => (
  <Composition id="ep9-shorts-b-auto" component={Ep9ShortsBAuto} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
