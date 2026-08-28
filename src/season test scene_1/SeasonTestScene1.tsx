import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Composition,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import scriptData from "../../scripts/season_test_scene_1.json";
import type { TestScriptData } from "./types";
import { LAYOUT, TIMING } from "./theme";
import {
  AnswerKeyBanner,
  CompressPhrase,
  ConfusedCharacter,
  PhraseReveal,
  TiltedCard,
} from "./components";
import { FONT_EN } from "./fonts";

const DATA = scriptData as TestScriptData;
const AUDIO_PREFIX = "season_test_scene_1";

const segmentAudio = (id: number) => `${AUDIO_PREFIX}_seg${String(id).padStart(2, "0")}.wav`;

/**
 * Rendered order: narrated segment 1 (provocation) -> a *silent*, fixed-length
 * quiz hold (not in the script JSON — there is no narration to time it off) ->
 * narrated segment 2 (reveal) -> narrated segment 3 (diagnosis).
 */
type TimelineItem =
  | { kind: "narrated"; segment: TestScriptData["segments"][number] }
  | { kind: "quizHold" };

const timeline: TimelineItem[] = [
  { kind: "narrated", segment: DATA.segments[0] },
  { kind: "quizHold" },
  { kind: "narrated", segment: DATA.segments[1] },
  { kind: "narrated", segment: DATA.segments[2] },
];

const plannedFrames = (item: TimelineItem) => {
  if (item.kind === "quizHold") {
    return Math.round(TIMING.quizHoldSec * LAYOUT.fps);
  }
  return Math.round((item.segment.end - item.segment.start) * LAYOUT.fps);
};

export type SeasonTestProps = {
  durationsInFrames: number[];
};

const makeCalculateMetadata = (): CalculateMetadataFunction<SeasonTestProps> => async () => {
  const endBufferFrames = Math.round(TIMING.endBufferSec * LAYOUT.fps);

  const durationsInFrames = await Promise.all(
    timeline.map(async (item) => {
      if (item.kind === "quizHold") {
        return Math.round(TIMING.quizHoldSec * LAYOUT.fps);
      }
      try {
        const seconds = await getAudioDurationInSeconds(
          staticFile(`audio/${segmentAudio(item.segment.id)}`),
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

/** Segment A: the provocation/question beat. */
const ProvocationScene: React.FC<{ segment: TestScriptData["segments"][number] }> = ({
  segment,
}) => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <PhraseReveal cues={segment.subtitleGroups ?? []} width={width} />
    </AbsoluteFill>
  );
};

/** Segment B: the silent quiz hold — "아이 엄마...?" + confused character. */
const QuizScene: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 56 }}>
    <AnswerKeyBanner visible />
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 56,
      }}
    >
      <TiltedCard rotateDeg={-4}>
        <span
          style={{
            fontFamily: FONT_EN,
            fontWeight: 800,
            fontSize: 96,
            color: "#141414",
          }}
        >
          아이 엄마...?
        </span>
      </TiltedCard>
      <ConfusedCharacter />
    </div>
  </AbsoluteFill>
);

/** Segment C: "괜찮습니다..." then the I'm going to -> I'mma compression. */
const RevealScene: React.FC<{ segment: TestScriptData["segments"][number] }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const cues = segment.subtitleGroups ?? [];
  const firstCue = cues[0];
  const secondCue = cues[1];
  const showFirst = firstCue && frame >= firstCue.from && frame <= firstCue.to;
  // Compression starts exactly when the narration moves into explaining the
  // contraction (the second, real, whisper-aligned subtitle cue) rather than
  // a guessed delay.
  const compressTrigger = secondCue?.from ?? 0;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
      <AnswerKeyBanner visible={frame < compressTrigger} />
      {showFirst ? (
        <PhraseReveal cues={[firstCue]} width={width} />
      ) : (
        <CompressPhrase triggerFrame={compressTrigger} />
      )}
      {secondCue && frame >= secondCue.from && (
        <div style={{ position: "absolute", bottom: 220 }}>
          <PhraseReveal cues={[secondCue]} width={width} fontSize={52} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** Segment D: diagnosis + hand-off into Scene 2. */
const DiagnosisScene: React.FC<{ segment: TestScriptData["segments"][number] }> = ({
  segment,
}) => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <PhraseReveal cues={segment.subtitleGroups ?? []} width={width} />
    </AbsoluteFill>
  );
};

export const SeasonTestScene1Video: React.FC<SeasonTestProps> = ({ durationsInFrames }) => {
  const durations = timeline.map((item, i) => durationsInFrames[i] ?? plannedFrames(item));

  return (
    <AbsoluteFill>
      {/* No background paint anywhere in this tree — transparent by design,
          meant to sit over the creator's own footage. */}
      <Series>
        {timeline.map((item, i) => (
          <Series.Sequence key={i} durationInFrames={durations[i]}>
            {item.kind === "quizHold" ? (
              <QuizScene />
            ) : (
              <>
                {i === 0 && <ProvocationScene segment={item.segment} />}
                {item.segment.id === 2 && <RevealScene segment={item.segment} />}
                {item.segment.id === 3 && <DiagnosisScene segment={item.segment} />}
                <Audio src={staticFile(`audio/${segmentAudio(item.segment.id)}`)} />
              </>
            )}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

export const SeasonTestScene1Composition: React.FC = () => (
  <Composition
    id="season-test-scene-1"
    component={SeasonTestScene1Video}
    durationInFrames={timeline.reduce((acc, item) => acc + plannedFrames(item), 0)}
    fps={LAYOUT.fps}
    width={LAYOUT.width}
    height={LAYOUT.height}
    defaultProps={{ durationsInFrames: [] as number[] }}
    calculateMetadata={makeCalculateMetadata()}
  />
);
