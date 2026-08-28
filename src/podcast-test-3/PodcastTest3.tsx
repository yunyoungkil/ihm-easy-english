import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Composition,
  Series,
  staticFile,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { LAYOUT, ELLIPSIS_PAUSE_SEC } from "./theme";
import { DIALOGUE } from "./data";
import { buildLineSegments } from "./timing";
import {
  KaraokeSubtitle,
  PodcastBackground,
  SoundWaveIndicator,
} from "./components";

const END_BUFFER_SEC = 0.4;

/** No real narration yet for this test script (see the audio-cost estimate
 * discussion) — same fallback the channel's own EP07 used before its audio
 * existed: estimate from word count, and don't render an <Audio> tag for a
 * file that isn't there. */
const estimateDurationSec = (en: string) => {
  const words = en.trim().split(/\s+/).filter(Boolean).length;
  const pauses = (en.match(/\.{3,}/g) ?? []).length;
  return words / 2.5 + pauses * ELLIPSIS_PAUSE_SEC + 0.3;
};

export type PodcastTest3Props = {
  durationsInFrames: number[];
  hasAudio: boolean[];
};

const makeCalculateMetadata =
  (): CalculateMetadataFunction<PodcastTest3Props> => async () => {
    const results = await Promise.all(
      DIALOGUE.map(async (line) => {
        try {
          const sec = await getAudioDurationInSeconds(
            staticFile(`audio/${line.audioFile}`),
          );
          return { sec: sec + END_BUFFER_SEC, hasAudio: true };
        } catch {
          return { sec: estimateDurationSec(line.en), hasAudio: false };
        }
      }),
    );

    const durationsInFrames = results.map((r) =>
      Math.round(r.sec * LAYOUT.fps),
    );
    const hasAudio = results.map((r) => r.hasAudio);

    return {
      durationInFrames: durationsInFrames.reduce((a, b) => a + b, 0),
      props: { durationsInFrames, hasAudio },
    };
  };

export const PodcastTest3Video: React.FC<PodcastTest3Props> = ({
  durationsInFrames,
  hasAudio,
}) => {
  const frame = useCurrentFrame();
  const durations = DIALOGUE.map(
    (line, i) =>
      durationsInFrames[i] ??
      Math.round(estimateDurationSec(line.en) * LAYOUT.fps),
  );

  return (
    <AbsoluteFill
      style={{
        scale: interpolate(
          frame,
          [1587, 1693, 1799, 1828, 1848, 1876, 1973],
          [
            "1.251 1.246",
            "1.286 1.281",
            "1.252 1.247",
            "1.187 1.182",
            "1.252 1.247",
            "1.252 1.247",
            "1.252 1.247",
          ],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            output: "perceptual-scale",
          },
        ),
      }}
    >
      <PodcastBackground />
      <Series>
        {DIALOGUE.map((line, i) => {
          const durationInFrames = durations[i];
          const segments = buildLineSegments(
            line.en,
            durationInFrames,
            LAYOUT.fps,
          );
          return (
            <Series.Sequence
              key={line.id}
              durationInFrames={durationInFrames}
              style={{
                translate: "0px 29.6px",
                scale: 0.952,
              }}
            >
              <KaraokeSubtitle line={line} segments={segments} />
              <SoundWaveIndicator line={line} segments={segments} />
              {hasAudio[i] && (
                <Audio src={staticFile(`audio/${line.audioFile}`)} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};

export const PodcastTest3Composition: React.FC = () => (
  <Composition
    id="podcast-test-3"
    component={PodcastTest3Video}
    durationInFrames={DIALOGUE.length * 90}
    fps={LAYOUT.fps}
    width={LAYOUT.width}
    height={LAYOUT.height}
    defaultProps={{
      durationsInFrames: [] as number[],
      hasAudio: [] as boolean[],
    }}
    calculateMetadata={makeCalculateMetadata()}
  />
);
