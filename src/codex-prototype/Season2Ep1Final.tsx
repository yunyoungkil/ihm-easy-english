import React from "react";
import {
  AbsoluteFill,
  Composition,
  Easing,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {BridgeIntro} from "./Season2Ep1BridgeIntro";
import {Cta} from "./Season2Ep1Cta";
import {LinkingPass} from "./Season2Ep1LinkingPass";
import {ListenPass} from "./Season2Ep1ListenPass";
import {QuizPass} from "./Season2Ep1QuizPass";
import {RhythmPass} from "./Season2Ep1RhythmPass";
import {StartPass} from "./Season2Ep1StartPass";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

const SECTIONS = {
  listen: {from: 0, duration: 1418},
  bridge: {from: 1418, duration: 78},
  start: {from: 1496, duration: 793},
  rhythm: {from: 2289, duration: 1797},
  linking: {from: 4086, duration: 1012},
  quiz: {from: 5098, duration: 2057},
  cta: {from: 7155, duration: 90},
} as const;

export const SEASON2_EP1_FINAL_DURATION = 7245;

const BoundaryWipe: React.FC<{at: number; color?: string}> = ({
  at,
  color = "#72D6EA",
}) => {
  const frame = useCurrentFrame();
  const local = frame - at;

  if (local < -6 || local > 12) {
    return null;
  }

  const travel = interpolate(local, [-6, 12], [-38, 138], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const flash = interpolate(local, [-6, 0, 12], [0, 0.1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <>
      <AbsoluteFill style={{backgroundColor: color, opacity: flash}} />
      <div
        style={{
          position: "absolute",
          left: "-28%",
          top: 0,
          width: "58%",
          height: "100%",
          transform: `translateX(${travel}vw) skewX(-18deg)`,
          background: `linear-gradient(90deg, transparent, ${color}22 30%, ${color}AA 50%, ${color}22 70%, transparent)`,
        }}
      />
    </>
  );
};

export const Season2Ep1Final: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: "#07111F", overflow: "hidden"}}>
    <Sequence from={SECTIONS.listen.from} durationInFrames={SECTIONS.listen.duration}>
      <ListenPass />
    </Sequence>
    <Sequence from={SECTIONS.bridge.from} durationInFrames={SECTIONS.bridge.duration}>
      <BridgeIntro />
    </Sequence>
    <Sequence from={SECTIONS.start.from} durationInFrames={SECTIONS.start.duration}>
      <StartPass />
    </Sequence>
    <Sequence from={SECTIONS.rhythm.from} durationInFrames={SECTIONS.rhythm.duration}>
      <RhythmPass />
    </Sequence>
    <Sequence from={SECTIONS.linking.from} durationInFrames={SECTIONS.linking.duration}>
      <LinkingPass />
    </Sequence>
    <Sequence from={SECTIONS.quiz.from} durationInFrames={SECTIONS.quiz.duration}>
      <QuizPass />
    </Sequence>
    <Sequence from={SECTIONS.cta.from} durationInFrames={SECTIONS.cta.duration}>
      <Cta />
    </Sequence>

    {[SECTIONS.start.from, SECTIONS.rhythm.from, SECTIONS.linking.from, SECTIONS.quiz.from].map(
      (at, index) => (
        <BoundaryWipe key={at} at={at} color={index % 2 === 0 ? "#72D6EA" : "#FFD15C"} />
      ),
    )}
    <BoundaryWipe at={SECTIONS.cta.from} color="#FFD15C" />
  </AbsoluteFill>
);

export const Season2Ep1FinalComposition: React.FC = () => (
  <Composition
    id="season2-ep1-final"
    component={Season2Ep1Final}
    durationInFrames={SEASON2_EP1_FINAL_DURATION}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
  />
);
