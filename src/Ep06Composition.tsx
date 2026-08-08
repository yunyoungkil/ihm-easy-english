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
import ep06 from "../scripts/ep06.json";
import ep07 from "../scripts/ep07.json";
import ep08 from "../scripts/ep08.json";
import ep09 from "../scripts/ep09.json";
import ep10 from "../scripts/ep10.json";
import type { EpisodeData } from "./types";
import {
  CARD,
  CARD_CATEGORY_COLORS,
  DEFAULT_MOTION_STYLE,
  MOTION_STYLES,
  type MotionStyleName,
} from "./theme";
import { MotionStyleProvider } from "./motion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SceneRenderer } from "./scenes/SceneRenderer";
import { CardScene } from "./scenes/CardScene";
import { shapeWipe } from "./components/shapeWipe";
import { getSceneKind } from "./utils/sceneKind";
import { SceneBackground } from "./components/SceneBackground";
import { TopBadge } from "./components/TopBadge";
import {
  AUDIO_FILES,
  AUDIO_FILES_EP07,
  AUDIO_FILES_EP08,
  AUDIO_FILES_EP09,
  AUDIO_FILES_EP10,
} from "./data/audioMap";

const FPS = 30;
const END_BUFFER_SEC = 0.5;

/**
 * Everything that differs between episodes. The rendering below is shared, so
 * a new episode is a new spec plus a registration in Root.tsx — never a copy
 * of this file.
 *
 * `audioFiles` may be empty: scenes then fall back to the script's planned
 * `duration`, which is what lets an episode be laid out and reviewed before
 * its narration has been recorded.
 */
export type EpisodeSpec = {
  data: EpisodeData;
  audioFiles: Record<number, string>;
  /** Shown in the card style's top bar. */
  cardTitle: string;
};

export const EP06_SPEC: EpisodeSpec = {
  data: ep06 as EpisodeData,
  audioFiles: AUDIO_FILES,
  cardTitle: "EP6. 왜 TION은 '션'으로 읽을까?",
};

export const EP10_SPEC: EpisodeSpec = {
  data: ep10 as EpisodeData,
  audioFiles: AUDIO_FILES_EP10,
  cardTitle: "EP10. 시즌1 총정리",
};

export const EP09_SPEC: EpisodeSpec = {
  data: ep09 as EpisodeData,
  audioFiles: AUDIO_FILES_EP09,
  cardTitle: "EP9. SPECIAL의 C는 왜 '셜'일까?",
};

export const EP08_SPEC: EpisodeSpec = {
  data: ep08 as EpisodeData,
  audioFiles: AUDIO_FILES_EP08,
  cardTitle: "EP8. PICTURE는 왜 '픽처'일까?",
};

export const EP07_SPEC: EpisodeSpec = {
  data: ep07 as EpisodeData,
  audioFiles: AUDIO_FILES_EP07,
  cardTitle: "EP7. 왜 '션'과 '전'으로 갈릴까?",
};

/**
 * True when the category changes between two consecutive scenes.
 *
 * The end screen is the one exception: its category always differs from the
 * teaser before it, but a shape-wipe would announce it as another section.
 * The video is ending — it should settle, not turn a page.
 */
const isCategoryChange = (data: EpisodeData, i: number) =>
  i > 0 &&
  data.scenes[i].card?.category !== "endscreen" &&
  data.scenes[i - 1].card?.category !== data.scenes[i].card?.category;

const transitionFramesBefore = (data: EpisodeData, i: number) =>
  i === 0
    ? 0
    : Math.round(
        (isCategoryChange(data, i) ? CARD.shapeWipeSec : CARD.crossFadeSec) *
          FPS,
      );

/**
 * TransitionSeries overlaps neighbouring sequences, so the composition is
 * shorter than the sum of the scene durations by the total transition time.
 */
const totalTransitionFrames = (data: EpisodeData) =>
  data.scenes.reduce((acc, _scene, i) => acc + transitionFramesBefore(data, i), 0);

const fallbackDurationInFrames = (data: EpisodeData) =>
  data.scenes.reduce(
    (acc, scene) => acc + Math.round((scene.duration + END_BUFFER_SEC) * FPS),
    0,
  );

export type Ep06Props = {
  sceneDurationsInFrames: number[];
  motionStyle: MotionStyleName;
};

const makeCalculateMetadata =
  (spec: EpisodeSpec): CalculateMetadataFunction<Ep06Props> =>
  async ({ props }) => {
    const sceneDurationsInFrames = await Promise.all(
      spec.data.scenes.map(async (scene) => {
        const audioFile = spec.audioFiles[scene.id];
        const audioDurationSec = audioFile
          ? await getAudioDurationInSeconds(staticFile(`audio/${audioFile}`))
          : null;

        // The buffer is breathing room after narration; a scene with none
        // (the end screen) is exactly as long as the script says.
        const totalSec =
          audioDurationSec === null
            ? scene.duration
            : audioDurationSec + END_BUFFER_SEC;
        return Math.round(totalSec * FPS);
      }),
    );

    const total = sceneDurationsInFrames.reduce(
      (acc, frames) => acc + frames,
      0,
    );
    const isCard =
      MOTION_STYLES[props.motionStyle ?? DEFAULT_MOTION_STYLE].cardLayout;

    return {
      durationInFrames: isCard
        ? total - totalTransitionFrames(spec.data)
        : total,
      props: { ...props, sceneDurationsInFrames },
    };
  };

/**
 * One episode's script and narration rendered with a given motion preset.
 * Registered once per preset so the feels can be previewed side by side.
 */
export const Ep06Composition: React.FC<{
  id: string;
  motionStyle: MotionStyleName;
  spec?: EpisodeSpec;
}> = ({ id, motionStyle, spec = EP06_SPEC }) => {
  const Video = React.useCallback(
    (props: Ep06Props) => <Ep06Video {...props} spec={spec} />,
    [spec],
  );
  return (
    <Composition
      id={id}
      component={Video}
      durationInFrames={fallbackDurationInFrames(spec.data)}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{ sceneDurationsInFrames: [] as number[], motionStyle }}
      calculateMetadata={makeCalculateMetadata(spec)}
    />
  );
};

const formatTimecode = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export const Ep06Video: React.FC<Ep06Props & { spec?: EpisodeSpec }> = ({
  sceneDurationsInFrames,
  motionStyle,
  spec = EP06_SPEC,
}) => {
  const { data, audioFiles, cardTitle } = spec;
  const resolvedStyle = motionStyle ?? DEFAULT_MOTION_STYLE;
  const isReference = MOTION_STYLES[resolvedStyle].referenceLayout;
  const isCard = MOTION_STYLES[resolvedStyle].cardLayout;

  // Timecodes shown on each card are the real elapsed positions, derived from
  // the measured audio lengths rather than the script's planned durations.
  const durations = data.scenes.map((scene, i) => {
    if (sceneDurationsInFrames[i] !== undefined) {
      return sceneDurationsInFrames[i];
    }
    const hasAudio = Boolean(audioFiles[scene.id]);
    return Math.round((scene.duration + (hasAudio ? END_BUFFER_SEC : 0)) * FPS);
  });
  const starts = durations.reduce<number[]>((acc, d, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + durations[i - 1]);
    return acc;
  }, []);

  if (isCard) {
    return (
      <MotionStyleProvider motionStyle={resolvedStyle}>
        <AbsoluteFill style={{ backgroundColor: CARD.background }}>
          <TransitionSeries>
            {data.scenes.flatMap((scene, i) => {
              const prev = i > 0 ? data.scenes[i - 1] : null;
              const nodes = [];

              // A shape-wipe announces a change of section; scenes that stay
              // in the same category just cross-fade.
              if (prev) {
                nodes.push(
                  isCategoryChange(data, i) ? (
                    <TransitionSeries.Transition
                      key={`t${scene.id}`}
                      timing={springTiming({
                        config: { damping: CARD.shapeWipeDamping },
                        durationInFrames: Math.round(CARD.shapeWipeSec * FPS),
                      })}
                      presentation={shapeWipe({
                        shape: getSceneKind(scene.layout).watermark,
                        color:
                          CARD_CATEGORY_COLORS[scene.card?.category ?? ""] ??
                          "#FFFFFF",
                      })}
                    />
                  ) : (
                    <TransitionSeries.Transition
                      key={`t${scene.id}`}
                      // Spring rather than linear: a linear crossfade spends
                      // its middle at half opacity on *both* scenes, which
                      // reads as a grey dip. An eased one is mostly committed
                      // to one side or the other.
                      //
                      // Still a crossfade, not a slide/wipe. Those were tried
                      // and rejected: the top bar (episode title + progress
                      // dots) is near-identical between consecutive scenes, so
                      // sliding the whole frame moves that identical chrome
                      // across the screen and reads as a glitch rather than a
                      // cut. The sense of forward motion comes from the card's
                      // blocks re-staggering in on every scene instead — see
                      // CardBlock.
                      timing={springTiming({
                        config: { damping: 200 },
                        durationInFrames: Math.round(CARD.crossFadeSec * FPS),
                      })}
                      presentation={fade()}
                    />
                  ),
                );
              }

              nodes.push(
                <TransitionSeries.Sequence
                  key={scene.id}
                  // Names the row in the Studio timeline, so a 12-scene
                  // episode is navigable by scene instead of by frame number.
                  name={`${scene.id}. ${scene.title}`}
                  durationInFrames={durations[i]}
                  style={{
                    borderRadius: 6,
                  }}
                >
                  <CardScene
                    scene={scene}
                    index={i}
                    total={data.scenes.length}
                    episodeTitle={cardTitle}
                    timecode={`${formatTimecode(starts[i] / FPS)}~${formatTimecode(
                      (starts[i] + durations[i]) / FPS,
                    )}`}
                  />
                  {audioFiles[scene.id] && (
                    <Audio src={staticFile(`audio/${audioFiles[scene.id]}`)} />
                  )}
                </TransitionSeries.Sequence>,
              );
              return nodes;
            })}
          </TransitionSeries>
        </AbsoluteFill>
      </MotionStyleProvider>
    );
  }

  return (
    <MotionStyleProvider motionStyle={resolvedStyle}>
      <AbsoluteFill>
        {/* Background and badge sit outside the Series so they persist across
            scene cuts and give each scene's fade something to cross over.
            The reference style paints its own pure-black frame and carries no
            channel chrome, so both are skipped there. */}
        {!isReference && <SceneBackground />}
        {!isReference && <TopBadge />}
        <Series>
          {data.scenes.map((scene, i) => {
            const durationInFrames =
              sceneDurationsInFrames[i] ??
              Math.round((scene.duration + END_BUFFER_SEC) * FPS);
            const audioFile = audioFiles[scene.id];

            return (
              <Series.Sequence
                key={scene.id}
                durationInFrames={durationInFrames}
              >
                <SceneRenderer scene={scene} />
                {audioFile && <Audio src={staticFile(`audio/${audioFile}`)} />}
              </Series.Sequence>
            );
          })}
        </Series>
      </AbsoluteFill>
    </MotionStyleProvider>
  );
};
