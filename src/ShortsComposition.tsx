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
import shortsA from "../scripts/ep06_shortsA.json";
import shortsB from "../scripts/ep06_shortsB.json";
import type { ShortsData } from "./types";
import { COLORS, LAYOUT, SHORTS } from "./theme";
import { SHORTS_COUNTDOWN } from "./shortsLayout";
import { MotionStyleProvider } from "./motion";
import { ShortsScene } from "./scenes/ShortsScene";

const END_BUFFER_SEC = 0.2;

/**
 * A vertical short. Registered alongside the long-form compositions but
 * sharing none of their layout code — see ShortsScene.
 *
 * `audioPrefix` names the per-segment WAVs (`<prefix>_seg01.wav`). Per-segment
 * files rather than one concatenated track: each segment's screen duration is
 * then just its own narration length, with no boundary detection needed.
 */
export type ShortsSpec = {
  data: ShortsData;
  audioPrefix: string;
};

export const SHORTS_A_SPEC: ShortsSpec = {
  data: shortsA as ShortsData,
  audioPrefix: "ep06_shortsA",
};

/**
 * Same frame, safe areas, sound map and subtitle pipeline as shortsA — only
 * the beat differs: each segment contrasts the naive reading with the real one
 * instead of showing a single word.
 */
export const SHORTS_B_SPEC: ShortsSpec = {
  data: shortsB as ShortsData,
  audioPrefix: "ep06_shortsB",
};

const segmentAudio = (spec: ShortsSpec, id: number) =>
  `${spec.audioPrefix}_seg${String(id).padStart(2, "0")}.wav`;

export type ShortsProps = {
  segmentDurationsInFrames: number[];
  /**
   * Narration length per segment, without the countdown or the tail buffer.
   * The countdown starts here, so the question finishes being asked before the
   * viewer is given time to think.
   */
  narrationFramesPerSegment: number[];
};

/** Draft plan from the script, used until the narration has been generated. */
const plannedFrames = (spec: ShortsSpec) =>
  spec.data.segments.map((s) =>
    Math.round((s.end - s.start) * LAYOUT.fps),
  );

const makeCalculateMetadata =
  (spec: ShortsSpec): CalculateMetadataFunction<ShortsProps> =>
  async () => {
    const planned = plannedFrames(spec);
    const countdownFrames = Math.round(SHORTS_COUNTDOWN.totalSec * LAYOUT.fps);

    const narrationFramesPerSegment = await Promise.all(
      spec.data.segments.map(async (segment, i) => {
        try {
          const seconds = await getAudioDurationInSeconds(
            staticFile(`audio/${segmentAudio(spec, segment.id)}`),
          );
          return Math.round(seconds * LAYOUT.fps);
        } catch {
          // Narration not generated yet — fall back to the script's plan so
          // the layout can still be previewed and reviewed.
          return planned[i];
        }
      }),
    );

    // A countdown segment has to outlast its narration by the counting time.
    const segmentDurationsInFrames = spec.data.segments.map((segment, i) =>
      narrationFramesPerSegment[i] +
      (segment.countdown ? countdownFrames : 0) +
      Math.round(END_BUFFER_SEC * LAYOUT.fps),
    );

    return {
      durationInFrames: segmentDurationsInFrames.reduce((a, b) => a + b, 0),
      props: { segmentDurationsInFrames, narrationFramesPerSegment },
    };
  };

export const ShortsVideo: React.FC<ShortsProps & { spec?: ShortsSpec }> = ({
  segmentDurationsInFrames,
  narrationFramesPerSegment,
  spec = SHORTS_A_SPEC,
}) => {
  const planned = plannedFrames(spec);

  return (
    // Shorts hold still: the drift and travel of `dynamic` read as noise on a
    // 9-second vertical clip.
    <MotionStyleProvider motionStyle="calm">
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 42%, ${COLORS.backgroundCenter} 0%, ${COLORS.background} 70%)`,
        }}
      >
        <Series>
          {spec.data.segments.map((segment, i) => {
            const durationInFrames = segmentDurationsInFrames[i] ?? planned[i];
            return (
              <Series.Sequence key={segment.id} durationInFrames={durationInFrames}>
                <ShortsScene
                  segment={segment}
                  narrationFrames={narrationFramesPerSegment[i] ?? planned[i]}
                  header={spec.data.header}
                />
                <Audio src={staticFile(`audio/${segmentAudio(spec, segment.id)}`)} />
              </Series.Sequence>
            );
          })}
        </Series>
      </AbsoluteFill>
    </MotionStyleProvider>
  );
};

export const ShortsComposition: React.FC<{
  id: string;
  spec?: ShortsSpec;
}> = ({ id, spec = SHORTS_A_SPEC }) => {
  const Video = React.useCallback(
    (props: ShortsProps) => <ShortsVideo {...props} spec={spec} />,
    [spec],
  );
  return (
    <Composition
      id={id}
      component={Video}
      durationInFrames={plannedFrames(spec).reduce((a, b) => a + b, 0)}
      fps={LAYOUT.fps}
      width={SHORTS.width}
      height={SHORTS.height}
      defaultProps={{
        segmentDurationsInFrames: [] as number[],
        narrationFramesPerSegment: [] as number[],
      }}
      calculateMetadata={makeCalculateMetadata(spec)}
    />
  );
};
