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
import scriptData from "../../scripts/season2_ep1.json";
import type { TestScriptData } from "./types";
import { LAYOUT, TIMING } from "./theme";
import { SceneBackground } from "./components";
import {
  Scene10_Dissolve,
  Scene10_Teaser,
  Scene1_Line1,
  Scene1_Line2,
  Scene1_Line4,
  Scene1_Merge,
  Scene1_QuizHold,
  Scene2_Link,
  Scene2_Outro,
  Scene2_Recap,
  Scene2_Title,
  Scene3_ContentWords,
  Scene3_FunctionWords,
  Scene3_Seesaw,
  Scene4_Metronome,
  Scene4_Schwa,
  Scene4_SlowFast,
  Scene4_Squeeze,
  Scene5_Dissolve,
  Scene5_TripleMerge,
  Scene6_Conclusion,
  Scene6_EnglishStretch,
  Scene6_KoreanGrid,
  Scene7_Countdown,
  Scene7_Quiz,
  Scene7_Reveal,
  Scene8_Countdown,
  Scene8_Quiz,
  Scene8_Reveal,
  Scene9_Master,
  Scene9_Summary,
} from "./scenes";

const DATA = scriptData as TestScriptData;
const AUDIO_PREFIX = "season2_ep1";
const seg = (id: number) => DATA.segments.find((s) => s.id === id)!;
const segmentAudio = (id: number) => `${AUDIO_PREFIX}_seg${String(id).padStart(2, "0")}.wav`;

type TimelineItem =
  | { kind: "narrated"; id: number; render: (durationInFrames: number) => React.ReactNode }
  | { kind: "hold"; seconds: number; render: (durationInFrames: number) => React.ReactNode };

const timeline: TimelineItem[] = [
  // Scene 1
  { kind: "narrated", id: 1, render: () => <Scene1_Line1 segment={seg(1)} /> },
  { kind: "hold", seconds: TIMING.quizHoldSec, render: (d) => <Scene1_QuizHold durationInFrames={d} /> },
  { kind: "narrated", id: 2, render: () => <Scene1_Line2 segment={seg(2)} /> },
  { kind: "narrated", id: 3, render: () => <Scene1_Merge segment={seg(3)} /> },
  { kind: "narrated", id: 4, render: () => <Scene1_Line4 segment={seg(4)} /> },
  // Scene 2
  { kind: "narrated", id: 5, render: () => <Scene2_Title segment={seg(5)} /> },
  { kind: "narrated", id: 6, render: () => <Scene2_Recap segment={seg(6)} /> },
  { kind: "narrated", id: 7, render: (d) => <Scene2_Link segment={seg(7)} durationInFrames={d} /> },
  { kind: "narrated", id: 8, render: (d) => <Scene2_Outro segment={seg(8)} durationInFrames={d} /> },
  // Scene 3
  { kind: "narrated", id: 9, render: () => <Scene3_ContentWords segment={seg(9)} /> },
  { kind: "narrated", id: 10, render: () => <Scene3_FunctionWords segment={seg(10)} /> },
  { kind: "narrated", id: 11, render: () => <Scene3_Seesaw segment={seg(11)} /> },
  // Scene 4
  { kind: "narrated", id: 12, render: () => <Scene4_Metronome segment={seg(12)} /> },
  { kind: "narrated", id: 13, render: () => <Scene4_Squeeze segment={seg(13)} /> },
  { kind: "narrated", id: 14, render: () => <Scene4_SlowFast segment={seg(14)} /> },
  { kind: "narrated", id: 15, render: () => <Scene4_Schwa segment={seg(15)} /> },
  // Scene 5
  { kind: "narrated", id: 16, render: (d) => <Scene5_TripleMerge segment={seg(16)} durationInFrames={d} /> },
  { kind: "narrated", id: 17, render: () => <Scene5_Dissolve segment={seg(17)} /> },
  // Scene 6
  { kind: "narrated", id: 18, render: () => <Scene6_KoreanGrid segment={seg(18)} /> },
  { kind: "narrated", id: 19, render: () => <Scene6_EnglishStretch segment={seg(19)} /> },
  { kind: "narrated", id: 20, render: () => <Scene6_Conclusion segment={seg(20)} /> },
  // Scene 7
  { kind: "narrated", id: 21, render: () => <Scene7_Quiz segment={seg(21)} /> },
  { kind: "hold", seconds: TIMING.countdownSec, render: () => <Scene7_Countdown /> },
  { kind: "narrated", id: 22, render: () => <Scene7_Reveal segment={seg(22)} /> },
  // Scene 8
  { kind: "narrated", id: 23, render: () => <Scene8_Quiz segment={seg(23)} /> },
  { kind: "hold", seconds: TIMING.countdownSec, render: () => <Scene8_Countdown /> },
  { kind: "narrated", id: 24, render: (d) => <Scene8_Reveal segment={seg(24)} durationInFrames={d} /> },
  // Scene 9
  { kind: "narrated", id: 25, render: () => <Scene9_Summary segment={seg(25)} /> },
  { kind: "narrated", id: 26, render: () => <Scene9_Master segment={seg(26)} /> },
  // Scene 10
  { kind: "narrated", id: 27, render: () => <Scene10_Dissolve segment={seg(27)} /> },
  { kind: "narrated", id: 28, render: () => <Scene10_Teaser segment={seg(28)} /> },
];

const plannedFrames = (item: TimelineItem) =>
  item.kind === "hold" ? Math.round(item.seconds * LAYOUT.fps) : Math.round(4 * LAYOUT.fps);

export type SeasonEp1Props = { durationsInFrames: number[] };

const makeCalculateMetadata = (): CalculateMetadataFunction<SeasonEp1Props> => async () => {
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

export const SeasonEp1Video: React.FC<SeasonEp1Props> = ({ durationsInFrames }) => {
  const durations = timeline.map((item, i) => durationsInFrames[i] ?? plannedFrames(item));
  const scene2StartFrame = durations.slice(0, 5).reduce((a, b) => a + b, 0);

  return (
    <AbsoluteFill>
      <SceneBackground hueShiftFrom={scene2StartFrame} />
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

export const SeasonEp1Composition: React.FC = () => (
  <Composition
    id="season2-ep1"
    component={SeasonEp1Video}
    durationInFrames={timeline.reduce((acc, item) => acc + plannedFrames(item), 0)}
    fps={LAYOUT.fps}
    width={LAYOUT.width}
    height={LAYOUT.height}
    defaultProps={{ durationsInFrames: [] as number[] }}
    calculateMetadata={makeCalculateMetadata()}
  />
);
