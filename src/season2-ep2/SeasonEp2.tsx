import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Composition,
  Series,
  staticFile,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import scriptData from "../../scripts/season2_ep2.json";
import type { TestScriptData } from "./types";
import { LAYOUT, TIMING } from "./theme";
import { SceneBackground } from "./components";
import {
  Scene1_Closing,
  Scene1_QuizHold,
  Scene1_Question,
  Scene1_Reveal,
  Scene2_Imbalance,
  Scene2_Intro,
  Scene2_Pair,
  Scene3_Merge,
  Scene3_PreMerge,
  Scene4_Intro,
  Scene4_Merge,
  Scene4_Pair,
  Scene5_Intro,
  Scene5_Merge,
  Scene5_Pair,
  Scene6_Countdown,
  Scene6_QuizSetup,
  Scene6_Reveal,
  Scene7_Master,
  Scene7_Summary,
  Scene8_Dissolve,
  Scene8_Intro,
  Scene8_Teaser,
} from "./scenes";

const DATA = scriptData as TestScriptData;
const AUDIO_PREFIX = "season2_ep2";
const seg = (id: number) => DATA.segments.find((s) => s.id === id)!;
const segmentAudio = (id: number) => `${AUDIO_PREFIX}_seg${String(id).padStart(2, "0")}.wav`;

type TimelineItem =
  | { kind: "narrated"; id: number; render: (durationInFrames: number) => React.ReactNode }
  | { kind: "hold"; seconds: number; render: (durationInFrames: number) => React.ReactNode };

const timeline: TimelineItem[] = [
  // Scene 1
  { kind: "narrated", id: 1, render: () => <Scene1_Question segment={seg(1)} /> },
  { kind: "hold", seconds: TIMING.quizHoldSec, render: (d) => <Scene1_QuizHold durationInFrames={d} /> },
  { kind: "narrated", id: 2, render: () => <Scene1_Reveal segment={seg(2)} /> },
  { kind: "narrated", id: 3, render: () => <Scene1_Closing segment={seg(3)} /> },
  // Scene 2
  { kind: "narrated", id: 4, render: () => <Scene2_Intro segment={seg(4)} /> },
  { kind: "narrated", id: 5, render: () => <Scene2_Pair segment={seg(5)} /> },
  { kind: "narrated", id: 6, render: () => <Scene2_Imbalance segment={seg(6)} /> },
  // Scene 3
  { kind: "narrated", id: 7, render: () => <Scene3_PreMerge segment={seg(7)} /> },
  { kind: "narrated", id: 8, render: () => <Scene3_Merge segment={seg(8)} /> },
  // Scene 4
  { kind: "narrated", id: 9, render: () => <Scene4_Intro segment={seg(9)} /> },
  { kind: "narrated", id: 10, render: () => <Scene4_Pair segment={seg(10)} /> },
  { kind: "narrated", id: 11, render: () => <Scene4_Merge segment={seg(11)} /> },
  // Scene 5
  { kind: "narrated", id: 12, render: () => <Scene5_Intro segment={seg(12)} /> },
  { kind: "narrated", id: 13, render: () => <Scene5_Pair segment={seg(13)} /> },
  { kind: "narrated", id: 14, render: () => <Scene5_Merge segment={seg(14)} /> },
  // Scene 6
  { kind: "narrated", id: 15, render: () => <Scene6_QuizSetup segment={seg(15)} /> },
  { kind: "narrated", id: 16, render: () => <Scene6_QuizSetup segment={seg(16)} /> },
  { kind: "hold", seconds: TIMING.countdownSec, render: () => <Scene6_Countdown /> },
  { kind: "hold", seconds: TIMING.revealHoldSec, render: () => <Scene6_Reveal /> },
  // Scene 7
  { kind: "narrated", id: 17, render: () => <Scene7_Summary segment={seg(17)} /> },
  { kind: "narrated", id: 18, render: () => <Scene7_Master segment={seg(18)} /> },
  // Scene 8
  { kind: "narrated", id: 19, render: () => <Scene8_Intro segment={seg(19)} /> },
  { kind: "narrated", id: 20, render: () => <Scene8_Dissolve segment={seg(20)} /> },
  { kind: "narrated", id: 21, render: () => <Scene8_Teaser segment={seg(21)} /> },
];

const plannedFrames = (item: TimelineItem) =>
  item.kind === "hold" ? Math.round(item.seconds * LAYOUT.fps) : Math.round(4 * LAYOUT.fps);

export type SeasonEp2Props = { durationsInFrames: number[] };

const makeCalculateMetadata = (): CalculateMetadataFunction<SeasonEp2Props> => async () => {
  const endBufferFrames = Math.round(TIMING.endBufferSec * LAYOUT.fps);
  const durationsInFrames = await Promise.all(
    timeline.map(async (item) => {
      if (item.kind === "hold") {
        return Math.round(item.seconds * LAYOUT.fps);
      }
      try {
        const seconds = await getAudioDurationInSeconds(
          staticFile(`audio/${segmentAudio(item.id)}`),
        );
        return Math.round(seconds * LAYOUT.fps) + endBufferFrames;
      } catch {
        return plannedFrames(item);
      }
    }),
  );
  return {
    durationInFrames: durationsInFrames.reduce((a, b) => a + b, 0),
    props: { durationsInFrames },
  };
};

export const SeasonEp2Video: React.FC<SeasonEp2Props> = ({ durationsInFrames }) => {
  const durations = timeline.map((item, i) => durationsInFrames[i] ?? plannedFrames(item));

  return (
    <AbsoluteFill>
      <SceneBackground />
      <Series>
        {timeline.map((item, i) => (
          <Series.Sequence key={i} durationInFrames={durations[i]}>
            <SceneItem item={item} durationInFrames={durations[i]} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

const SceneItem: React.FC<{ item: TimelineItem; durationInFrames: number }> = ({
  item,
  durationInFrames,
}) => (
  <>
    {item.render(durationInFrames)}
    {item.kind === "narrated" && <Audio src={staticFile(`audio/${segmentAudio(item.id)}`)} />}
  </>
);

export const SeasonEp2Composition: React.FC = () => (
  <Composition
    id="season2-ep2"
    component={SeasonEp2Video}
    durationInFrames={timeline.reduce((acc, item) => acc + plannedFrames(item), 0)}
    fps={LAYOUT.fps}
    width={LAYOUT.width}
    height={LAYOUT.height}
    defaultProps={{ durationsInFrames: [] as number[] }}
    calculateMetadata={makeCalculateMetadata()}
  />
);
