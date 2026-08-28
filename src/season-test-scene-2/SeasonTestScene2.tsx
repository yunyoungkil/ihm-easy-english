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
import scriptData from "../../scripts/season_test_scene_2.json";
import type { TestScriptData } from "./types";
import { LAYOUT, TIMING } from "./theme";
import {
  AnswerKeyBanner,
  BottomCaptionBar,
  CardSwipeRow,
  CrashZoom,
  GiantConfusedEmoji,
  GlowTitleReveal,
  HandWave,
  KineticSlideUpPhrase,
  MagnetMerge,
  NeonPulseFlash,
  SafeZone,
  SceneBackground,
  SentenceZoomFocus,
  SeasonEmblem,
  SpringPhraseReveal,
  TitlePopWithFlip,
  WipeOut,
} from "./components";

const DATA = scriptData as TestScriptData;
const AUDIO_PREFIX = "season_test_scene_2";
const seg = (id: number) => DATA.segments.find((s) => s.id === id)!;
const segmentAudio = (id: number) => `${AUDIO_PREFIX}_seg${String(id).padStart(2, "0")}.wav`;

type TimelineItem =
  | { kind: "narrated"; segment: TestScriptData["segments"][number] }
  | { kind: "quizHold" };

const timeline: TimelineItem[] = [
  { kind: "narrated", segment: seg(1) }, // A: provocation
  { kind: "quizHold" }, // B: silent quiz
  { kind: "narrated", segment: seg(2) }, // C: reveal / merge
  { kind: "narrated", segment: seg(3) }, // D: diagnosis
  { kind: "narrated", segment: seg(4) }, // E: title
  { kind: "narrated", segment: seg(5) }, // F: season1 recap
  { kind: "narrated", segment: seg(6) }, // G: sentence linking preview
  { kind: "narrated", segment: seg(7) }, // H: season title + wipe out
];

const plannedFrames = (item: TimelineItem) => {
  if (item.kind === "quizHold") {
    return Math.round(TIMING.quizHoldSec * LAYOUT.fps);
  }
  return Math.round((item.segment.end - item.segment.start) * LAYOUT.fps);
};

export type SeasonTestProps = { durationsInFrames: number[] };

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

/** Small always-on caption row for beats whose hero visual isn't the narration text itself. */
const CaptionRow: React.FC<{ cues: { text: string; from: number; to: number }[] }> = ({ cues }) => (
  <div style={{ position: "absolute", bottom: 90, left: 0, right: 0 }}>
    <KineticSlideUpPhrase cues={cues} fontSize={40} />
  </div>
);

// ---------- Scene 1 beats (0:00-0:40 content) ----------

const ProvocationScene: React.FC<{ segment: TestScriptData["segments"][number] }> = ({ segment }) => {
  const cues = segment.subtitleGroups ?? [];
  const lastCue = cues[cues.length - 1];
  return (
    <AbsoluteFill>
      <AnswerKeyBanner />
      <SafeZone>
        <SpringPhraseReveal cues={cues} />
      </SafeZone>
      {lastCue && <HandWave delayFrames={lastCue.from} />}
    </AbsoluteFill>
  );
};

const QuizScene: React.FC = () => {
  const { height } = useVideoConfig();
  return (
    <AbsoluteFill>
      <AnswerKeyBanner />
      <CrashZoom durationInFrames={Math.round(TIMING.quizHoldSec * LAYOUT.fps)}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
          <div
            style={{
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: 96,
              color: "#FFFFFF",
              textShadow: "0 4px 20px rgba(0,0,0,0.6)",
            }}
          >
            아이 엄마...?
          </div>
          <GiantConfusedEmoji size={height * 0.42} />
        </AbsoluteFill>
      </CrashZoom>
    </AbsoluteFill>
  );
};

const RevealScene: React.FC<{ segment: TestScriptData["segments"][number] }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cues = segment.subtitleGroups ?? [];
  const firstCue = cues[0];
  const secondCue = cues[1];
  const mergeTrigger = secondCue?.from ?? 0;
  const slideDuration = Math.round(0.6 * fps);
  const impactFrame = mergeTrigger + slideDuration;

  return (
    <AbsoluteFill>
      <AnswerKeyBanner />
      <SafeZone>
        {frame < mergeTrigger && firstCue ? (
          <SpringPhraseReveal cues={[firstCue]} />
        ) : (
          <MagnetMerge triggerFrame={mergeTrigger} />
        )}
      </SafeZone>
      <NeonPulseFlash atFrame={impactFrame} />
      {secondCue && <CaptionRow cues={[secondCue]} />}
    </AbsoluteFill>
  );
};

const DiagnosisScene: React.FC<{ segment: TestScriptData["segments"][number] }> = ({ segment }) => (
  <AbsoluteFill>
    <SafeZone>
      <KineticSlideUpPhrase cues={segment.subtitleGroups ?? []} />
    </SafeZone>
    <BottomCaptionBar text="원어민의 압축 리듬, 지금부터 시작합니다" visible />
  </AbsoluteFill>
);

// ---------- Scene 2 beats (0:40-1:15 content) ----------

const IntroTitleScene: React.FC<{ segment: TestScriptData["segments"][number] }> = ({ segment }) => (
  <AbsoluteFill>
    <SeasonEmblem />
    <SafeZone>
      <TitlePopWithFlip title="이해하면 쉬운 영어" subtitle="시즌2 EP1" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </AbsoluteFill>
);

const RecapScene: React.FC<{ segment: TestScriptData["segments"][number] }> = ({ segment }) => (
  <AbsoluteFill>
    <SeasonEmblem />
    <SafeZone>
      <CardSwipeRow />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </AbsoluteFill>
);

const SentenceLinkScene: React.FC<{ segment: TestScriptData["segments"][number]; durationInFrames: number }> = ({
  segment,
  durationInFrames,
}) => (
  <AbsoluteFill>
    <SeasonEmblem />
    <SafeZone>
      <SentenceZoomFocus durationInFrames={durationInFrames} />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </AbsoluteFill>
);

const SeasonTitleOutroScene: React.FC<{ segment: TestScriptData["segments"][number]; durationInFrames: number }> = ({
  segment,
  durationInFrames,
}) => {
  const wipeDuration = 15;
  return (
    <AbsoluteFill>
      <WipeOut startFrame={durationInFrames - wipeDuration} durationInFrames={wipeDuration}>
        <SeasonEmblem />
        <SafeZone>
          <GlowTitleReveal text="문장이 들리는 원리" />
        </SafeZone>
        <CaptionRow cues={segment.subtitleGroups ?? []} />
      </WipeOut>
    </AbsoluteFill>
  );
};

// ---------- Assembly ----------

export const SeasonTestScene2Video: React.FC<SeasonTestProps> = ({ durationsInFrames }) => {
  const durations = timeline.map((item, i) => durationsInFrames[i] ?? plannedFrames(item));
  const scene2StartFrame = durations.slice(0, 4).reduce((a, b) => a + b, 0);

  return (
    <AbsoluteFill>
      <SceneBackground hueShiftFrom={scene2StartFrame} />
      <Series>
        {timeline.map((item, i) => (
          <Series.Sequence key={i} durationInFrames={durations[i]}>
            {item.kind === "quizHold" ? (
              <QuizScene />
            ) : (
              <>
                {item.segment.id === 1 && <ProvocationScene segment={item.segment} />}
                {item.segment.id === 2 && <RevealScene segment={item.segment} />}
                {item.segment.id === 3 && <DiagnosisScene segment={item.segment} />}
                {item.segment.id === 4 && <IntroTitleScene segment={item.segment} />}
                {item.segment.id === 5 && <RecapScene segment={item.segment} />}
                {item.segment.id === 6 && (
                  <SentenceLinkScene segment={item.segment} durationInFrames={durations[i]} />
                )}
                {item.segment.id === 7 && (
                  <SeasonTitleOutroScene segment={item.segment} durationInFrames={durations[i]} />
                )}
                <Audio src={staticFile(`audio/${segmentAudio(item.segment.id)}`)} />
              </>
            )}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

export const SeasonTestScene2Composition: React.FC = () => (
  <Composition
    id="season-test-scene-2"
    component={SeasonTestScene2Video}
    durationInFrames={timeline.reduce((acc, item) => acc + plannedFrames(item), 0)}
    fps={LAYOUT.fps}
    width={LAYOUT.width}
    height={LAYOUT.height}
    defaultProps={{ durationsInFrames: [] as number[] }}
    calculateMetadata={makeCalculateMetadata()}
  />
);
