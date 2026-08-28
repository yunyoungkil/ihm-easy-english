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
import scriptData from "../../scripts/scrapbook_test_1.json";
import type { TestScriptData } from "./types";
import { LAYOUT, TIMING } from "./theme";
import { SceneBackground } from "./components";
import { Scene1, Scene2, Scene3, Scene4 } from "./scenes";

const DATA = scriptData as TestScriptData;
const AUDIO_PREFIX = "scrapbook_test_1";
const seg = (id: number) => DATA.segments.find((s) => s.id === id)!;
const segmentAudio = (id: number) =>
  `${AUDIO_PREFIX}_seg${String(id).padStart(2, "0")}.wav`;

const SCENES: { id: number; render: () => React.ReactNode }[] = [
  { id: 1, render: () => <Scene1 segment={seg(1)} /> },
  { id: 2, render: () => <Scene2 segment={seg(2)} /> },
  { id: 3, render: () => <Scene3 segment={seg(3)} /> },
  { id: 4, render: () => <Scene4 segment={seg(4)} /> },
];

const plannedFrames = () => Math.round(4 * LAYOUT.fps);

export type ScrapbookTest1Props = { durationsInFrames: number[] };

const makeCalculateMetadata =
  (): CalculateMetadataFunction<ScrapbookTest1Props> => async () => {
    const endBufferFrames = Math.round(TIMING.endBufferSec * LAYOUT.fps);
    const durationsInFrames = await Promise.all(
      SCENES.map(async (item) => {
        try {
          const seconds = await getAudioDurationInSeconds(
            staticFile(`audio/${segmentAudio(item.id)}`),
          );
          return Math.round(seconds * LAYOUT.fps) + endBufferFrames;
        } catch {
          return plannedFrames();
        }
      }),
    );
    return {
      durationInFrames: durationsInFrames.reduce((a, b) => a + b, 0),
      props: { durationsInFrames },
    };
  };

export const ScrapbookTest1Video: React.FC<ScrapbookTest1Props> = ({
  durationsInFrames,
}) => {
  const durations = SCENES.map(
    (_, i) => durationsInFrames[i] ?? plannedFrames(),
  );

  return (
    <AbsoluteFill
      style={{
        scale: 1.005,
      }}
    >
      <SceneBackground />
      <Series>
        {SCENES.map((item, i) => (
          <Series.Sequence key={item.id} durationInFrames={durations[i]}>
            {item.render()}
            <Audio src={staticFile(`audio/${segmentAudio(item.id)}`)} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

export const ScrapbookTest1Composition: React.FC = () => (
  <Composition
    id="scrapbook-test-1"
    component={ScrapbookTest1Video}
    durationInFrames={SCENES.reduce((acc) => acc + plannedFrames(), 0)}
    fps={LAYOUT.fps}
    width={LAYOUT.width}
    height={LAYOUT.height}
    defaultProps={{ durationsInFrames: [] as number[] }}
    calculateMetadata={makeCalculateMetadata()}
  />
);
