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
// Segment 2 includes a code-controlled 3 second thinking window after the
// question phrase. TTS pauses are not used as the countdown clock.
const DURATIONS = [141, 262, 89, 342, 368, 119];
const STARTS = DURATIONS.map((_, i) =>
  DURATIONS.slice(0, i).reduce((sum, duration) => sum + duration, 0),
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
        fontSize: 92,
        WebkitTextStroke: `${OUTLINE}px #fff`,
        paintOrder: "stroke fill",
      }}
    >
      끝이 똑같이 들리는 이유
    </div>
    <div
      style={{
        ...base,
        position: "absolute",
        top: 320,
        width: "100%",
        color: "#050505",
        fontSize: 86,
        WebkitTextStroke: `${OUTLINE}px #fff`,
        paintOrder: "stroke fill",
      }}
    >
      영어 발음 테스트
    </div>
  </>
);

const CialWord: React.FC<{
  word: string;
  reading?: string;
  active?: boolean;
  scale?: number;
}> = ({word, reading, active = false, scale = 1}) => {
  const split = word.lastIndexOf("CIAL");
  const before = split >= 0 ? word.slice(0, split) : word;
  const ending = split >= 0 ? word.slice(split) : "";
  return (
    <div style={{transform: `scale(${scale})`}}>
      <div
        style={{
          ...base,
          padding: "25px 18px 30px",
          borderRadius: 27,
          background: YELLOW,
          color: "#fff",
          fontFamily: "RubikBold, sans-serif",
          fontSize: word.length > 9 ? 91 : 112,
          WebkitTextStroke: `${OUTLINE}px #050505`,
          paintOrder: "stroke fill",
          boxShadow: "0 16px 0 #000",
        }}
      >
        {before}
        <span
          style={{
            color: active ? RED : "#fff",
            textShadow: active ? "0 0 20px #ff000099" : "none",
          }}
        >
          {ending}
        </span>
      </div>
      {reading ? (
        <div
          style={{
            ...base,
            marginTop: 24,
            color: "#050505",
            fontSize: 72,
            WebkitTextStroke: `${OUTLINE}px #fff`,
            paintOrder: "stroke fill",
          }}
        >
          {reading.slice(0, -1)}
          <span style={{color: active ? BLUE : "#050505"}}>셜</span>
        </div>
      ) : null}
    </div>
  );
};

const FamiliarScene = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: "absolute", top: 545, left: 90, right: 90}}>
      <CialWord word="SPECIAL" reading="스페셜" active={frame >= 8} scale={pop(frame)} />
      <div style={{height: 130}} />
      <CialWord word="SOCIAL" reading="소셜" active={frame >= 35} scale={pop(frame, 8)} />
    </div>
  );
};

const QuizScene = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame * 0.12) * 0.02;
  const countdownStart = 172;
  const count = frame < countdownStart + 30 ? "3" : frame < countdownStart + 60 ? "2" : "1";
  return (
    <>
      <div style={{position: "absolute", top: 540, left: 65, right: 65}}>
        <CialWord word="OFFICIAL" scale={pop(frame)} />
        <div style={{height: 95}} />
        <CialWord word="FINANCIAL" scale={pop(frame, 10)} />
      </div>
      <div
        style={{
          ...base,
          position: "absolute",
          top: 1265,
          width: "100%",
          color: "#fff",
          fontSize: 68,
        }}
      >
        어떻게 읽을까요?
      </div>
      {frame >= countdownStart ? (
        <div
          style={{
            ...base,
            position: "absolute",
            top: 1410,
            left: "50%",
            width: 150,
            height: 150,
            marginLeft: -75,
            paddingTop: 26,
            borderRadius: "50%",
            background: PURPLE,
            color: "#fff",
            fontSize: 88,
            transform: `scale(${pulse})`,
            border: "9px solid #fff",
          }}
        >
          {count}
        </div>
      ) : null}
    </>
  );
};

const AnswerScene = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: "absolute", top: 535, left: 65, right: 65}}>
      <CialWord word="OFFICIAL" reading="오피셜" active scale={pop(frame)} />
      <div style={{height: 115}} />
      <CialWord word="FINANCIAL" reading="파이낸셜" active scale={pop(frame, 8)} />
    </div>
  );
};

const RuleScene = () => {
  const frame = useCurrentFrame();
  const active = frame >= 104;
  return (
    <>
      <div
        style={{
          ...base,
          position: "absolute",
          top: 520,
          width: "100%",
          color: "#fff",
          fontSize: 66,
        }}
      >
        네 단어에 숨어 있는
      </div>
      <div
        style={{
          ...base,
          position: "absolute",
          top: 680,
          left: 155,
          right: 155,
          padding: "40px 20px",
          borderRadius: 28,
          background: "#fff",
          color: active ? RED : "#111",
          fontFamily: "RubikBold, sans-serif",
          fontSize: 146,
          boxShadow: "14px 18px 0 #000",
          transform: `scale(${pop(frame, 15)})`,
        }}
      >
        CIAL
      </div>
      <div
        style={{
          ...base,
          position: "absolute",
          top: 1015,
          width: "100%",
          color: "#fff",
          fontSize: 84,
        }}
      >
        한 글자씩 읽지 않고
      </div>
      <div
        style={{
          ...base,
          position: "absolute",
          top: 1170,
          width: "100%",
          color: BLUE,
          fontSize: 138,
          WebkitTextStroke: `${OUTLINE}px #fff`,
          paintOrder: "stroke fill",
          transform: `scale(${pop(frame, 300)})`,
        }}
      >
        셜
      </div>
    </>
  );
};

const RecapScene = () => {
  const frame = useCurrentFrame();
  const words = ["SPECIAL", "SOCIAL", "OFFICIAL", "FINANCIAL"];
  const focus = Math.min(words.length - 1, Math.floor(Math.max(0, frame) / 29));
  return (
    <>
      <div style={{position: "absolute", top: 485, left: 70, right: 70}}>
        {words.map((word, index) => (
          <div key={word} style={{marginBottom: 38, opacity: index === focus ? 1 : 0.48}}>
            <CialWord word={word} active={index <= focus} scale={index === focus ? 1.04 : 0.94} />
          </div>
        ))}
      </div>
      <div
        style={{
          ...base,
          position: "absolute",
          top: 1405,
          left: 65,
          right: 65,
          color: frame >= 274 ? BLUE : "#fff",
          fontSize: 62,
        }}
      >
        왜 네 글자가 한 소리로 바뀔까요?
      </div>
    </>
  );
};

const CtaScene = () => {
  const frame = useCurrentFrame();
  const scale = pop(frame);
  const bounce = Math.sin(frame * 0.24) * 14;
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 620,
          left: 90,
          right: 90,
          height: 465,
          border: "12px solid #fff",
          borderRadius: 42,
          background: PURPLE,
          boxShadow: "18px 22px 0 #1357b7",
          transform: `scale(${scale}) rotate(-1.5deg)`,
        }}
      >
        <div style={{...base, marginTop: 105, color: "#fff", fontSize: 70}}>관련 영상에서</div>
        <div
          style={{
            ...base,
            marginTop: 45,
            color: BLUE,
            fontSize: 88,
            WebkitTextStroke: `${OUTLINE}px #fff`,
            paintOrder: "stroke fill",
          }}
        >
          지금 바로 확인
        </div>
      </div>
      <div
        style={{
          ...base,
          position: "absolute",
          top: 1160,
          width: "100%",
          color: YELLOW,
          fontSize: 190,
          WebkitTextStroke: "10px #fff",
          paintOrder: "stroke fill",
          transform: `translateY(${bounce}px)`,
        }}
      >
        ↓
      </div>
    </>
  );
};

export const Ep9ShortsAAuto: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame % 600, [0, 300, 600], [-100, 90, -100]);
  return (
    <AbsoluteFill style={{background: "#06090e", overflow: "hidden"}}>
      <div
        style={{
          position: "absolute",
          width: 650,
          height: 650,
          left: drift,
          top: 520,
          borderRadius: "50%",
          background: "radial-gradient(circle,#008eff22,transparent 68%)",
        }}
      />
      <Header />
      {STARTS.map((start, index) => (
        <Sequence key={start} from={start} durationInFrames={DURATIONS[index]}>
          <Audio src={staticFile(`audio/ep09_shortsA_auto_seg0${index + 1}.wav`)} />
        </Sequence>
      ))}
      <Sequence from={STARTS[2]} durationInFrames={30}>
        <Audio src={staticFile("audio/core-pass-ding.wav")} volume={0.09} />
      </Sequence>
      <Sequence from={STARTS[5]} durationInFrames={30}>
        <Audio src={staticFile("audio/core-pass-pop.wav")} volume={0.065} />
      </Sequence>
      {frame < STARTS[1] ? (
        <FamiliarScene />
      ) : frame < STARTS[2] ? (
        <Sequence from={STARTS[1]}><QuizScene /></Sequence>
      ) : frame < STARTS[3] ? (
        <Sequence from={STARTS[2]}><AnswerScene /></Sequence>
      ) : frame < STARTS[4] ? (
        <Sequence from={STARTS[3]}><RuleScene /></Sequence>
      ) : frame < STARTS[5] ? (
        <Sequence from={STARTS[4]}><RecapScene /></Sequence>
      ) : (
        <Sequence from={STARTS[5]}><CtaScene /></Sequence>
      )}
      <div style={{...base, position: "absolute", bottom: 255, width: "100%", color: "#929292", fontSize: 54}}>
        @이해하면쉬운영어
      </div>
    </AbsoluteFill>
  );
};

export const Ep9ShortsAAutoComposition = () => (
  <Composition
    id="ep9-shorts-a-auto"
    component={Ep9ShortsAAuto}
    durationInFrames={TOTAL}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
