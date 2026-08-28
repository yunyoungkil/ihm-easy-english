import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import type { TestSegment } from "./types";
import { COLORS } from "./theme";
import {
  CaptionRow,
  Card3D,
  CardSwipeRow,
  CircleMark,
  ContentWordCard,
  CountdownCircle,
  CrashZoom,
  DissolvingWord,
  EnglishCardLabel,
  FunctionWordPill,
  GiantConfusedEmoji,
  GlowTitleReveal,
  HandWave,
  MasterSummaryCard,
  MergeWords,
  MetronomeBar,
  NeonPulseFlash,
  QuizCard,
  SafeZone,
  Seesaw,
  SchwaMark,
  SentenceZoomFocus,
  SlowFastToggle,
  SpringPhraseReveal,
  SqueezeFunctionWord,
  StretchTrack,
  SummaryCard,
  SyllableGrid,
  TeaserCard,
  TitlePopWithFlip,
  TopLeftBadge,
  UnderlineHighlight,
  WipeOut,
} from "./components";

/** Shows the phrase for its cues, then swaps to the merge visual once the last cue starts. */
const PhraseThenMerge: React.FC<{
  segment: TestSegment;
  words: string[];
  mergedText: string;
}> = ({ segment, words, mergedText }) => {
  const frame = useCurrentFrame();
  const cues = segment.subtitleGroups ?? [];
  const lastCue = cues[cues.length - 1];
  const trigger = lastCue?.from ?? 0;
  const showPhrase = frame < trigger;

  return (
    <>
      <SafeZone>
        {showPhrase ? <SpringPhraseReveal cues={cues} /> : <MergeWords words={words} mergedText={mergedText} triggerFrame={trigger} />}
      </SafeZone>
      <NeonPulseFlash atFrame={trigger + 15} />
      <CaptionRow cues={cues} />
    </>
  );
};

// ---------- Scene 1 ----------

export const Scene1_Line1: React.FC<{ segment: TestSegment }> = ({ segment }) => {
  const cues = segment.subtitleGroups ?? [];
  const lastCue = cues[cues.length - 1];
  return (
    <>
      <TopLeftBadge text="Scene 1" />
      <SafeZone>
        <SpringPhraseReveal cues={cues} />
      </SafeZone>
      {lastCue && <HandWave delayFrames={lastCue.from} />}
    </>
  );
};

export const Scene1_QuizHold: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const { height } = useVideoConfig();
  return (
    <CrashZoom durationInFrames={durationInFrames}>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div style={{ fontFamily: "inherit", fontWeight: 800, fontSize: 96, color: COLORS.text, textShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
          아이 엄마...?
        </div>
        <GiantConfusedEmoji size={height * 0.42} />
      </div>
    </CrashZoom>
  );
};

export const Scene1_Line2: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <SafeZone>
    <SpringPhraseReveal cues={segment.subtitleGroups ?? []} />
  </SafeZone>
);

export const Scene1_Merge: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <PhraseThenMerge segment={segment} words={["I'm", "going", "to"]} mergedText="I'mma" />
);

export const Scene1_Line4: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <SafeZone>
    <SpringPhraseReveal cues={segment.subtitleGroups ?? []} />
  </SafeZone>
);

// ---------- Scene 2 ----------

export const Scene2_Title: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="시즌2 EP1" />
    <SafeZone>
      <TitlePopWithFlip title="이해하면 쉬운 영어" subtitle="시즌2 EP1" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

const SEASON1_WORDS = ["NATION", "EDUCATION", "PICTURE", "SPECIAL"];

export const Scene2_Recap: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="시즌2 EP1" />
    <SafeZone>
      <CardSwipeRow words={SEASON1_WORDS} />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene2_Link: React.FC<{ segment: TestSegment; durationInFrames: number }> = ({
  segment,
  durationInFrames,
}) => (
  <>
    <TopLeftBadge text="시즌2 EP1" />
    <SafeZone>
      <SentenceZoomFocus durationInFrames={durationInFrames} left="I'm" right="going to" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene2_Outro: React.FC<{ segment: TestSegment; durationInFrames: number }> = ({
  segment,
  durationInFrames,
}) => {
  const wipeDuration = 15;
  return (
    <WipeOut startFrame={durationInFrames - wipeDuration} durationInFrames={wipeDuration}>
      <TopLeftBadge text="시즌2 EP1" />
      <SafeZone>
        <GlowTitleReveal text="문장이 들리는 원리" />
      </SafeZone>
      <CaptionRow cues={segment.subtitleGroups ?? []} />
    </WipeOut>
  );
};

// ---------- Scene 3: content words vs function words ----------

export const Scene3_ContentWords: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="뜻 단어 vs 문법 단어" />
    <SafeZone>
      <div style={{ display: "flex", gap: 40 }}>
        {["WALK", "BOOK", "HAPPY"].map((w, i) => (
          <ContentWordCard key={w} text={w} delayFrames={i * 8} />
        ))}
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene3_FunctionWords: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="뜻 단어 vs 문법 단어" />
    <SafeZone>
      <div style={{ display: "flex", gap: 30 }}>
        {["to", "of", "a", "the"].map((w, i) => (
          <FunctionWordPill key={w} text={w} index={i} />
        ))}
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene3_Seesaw: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="뜻 단어 vs 문법 단어" />
    <SafeZone>
      <Seesaw tiltFrom={6} />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

// ---------- Scene 4: rhythm ----------

export const Scene4_Metronome: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="강세 사이 간격을 지키려는 습성" />
    <SafeZone>
      <MetronomeBar />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene4_Squeeze: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="강세 사이 간격을 지키려는 습성" />
    <SafeZone>
      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        <EnglishCardLabel text="WANT" fontSize={80} color={COLORS.contentWord} />
        <SqueezeFunctionWord text="to" />
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene4_SlowFast: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="강세 사이 간격을 지키려는 습성" />
    <SafeZone>
      <SlowFastToggle delayFrames={0} />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene4_Schwa: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="강세 사이 간격을 지키려는 습성" />
    <SafeZone>
      <SchwaMark />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

// ---------- Scene 5: wanna/gonna/kinda ----------

export const Scene5_TripleMerge: React.FC<{ segment: TestSegment; durationInFrames: number }> = ({
  segment,
  durationInFrames,
}) => (
  <>
    <TopLeftBadge text="워너, 고너, 카인다" />
    <SafeZone>
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <MergeWords words={["want", "to"]} mergedText="wanna" triggerFrame={Math.round(durationInFrames * 0.15)} gapPx={30} fontSize={54} mergedFontSize={64} />
        <MergeWords words={["going", "to"]} mergedText="gonna" triggerFrame={Math.round(durationInFrames * 0.4)} gapPx={30} fontSize={54} mergedFontSize={64} />
        <MergeWords words={["kind", "of"]} mergedText="kinda" triggerFrame={Math.round(durationInFrames * 0.65)} gapPx={30} fontSize={54} mergedFontSize={64} />
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene5_Dissolve: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="워너, 고너, 카인다" />
    <SafeZone>
      <div style={{ display: "flex", gap: 40 }}>
        <DissolvingWord text="to" dissolveFrom={10} index={0} />
        <DissolvingWord text="of" dissolveFrom={10} index={1} />
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

// ---------- Scene 6: rhythm grid ----------

export const Scene6_KoreanGrid: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="리듬을 지키려는 습성" />
    <SafeZone>
      <SyllableGrid syllables={["한", "국", "어", "는"]} />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene6_EnglishStretch: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="리듬을 지키려는 습성" />
    <SafeZone>
      <StretchTrack />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene6_Conclusion: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="리듬을 지키려는 습성" />
    <SafeZone>
      <SpringPhraseReveal cues={segment.subtitleGroups ?? []} fontSize={72} />
    </SafeZone>
  </>
);

// ---------- Scene 7: got to -> gotta ----------

export const Scene7_Quiz: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="일시정지하고 맞혀보세요" />
    <SafeZone>
      <QuizCard text="아이 가라 두 잇" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene7_Countdown: React.FC = () => (
  <>
    <TopLeftBadge text="일시정지하고 맞혀보세요" />
    <SafeZone>
      <CountdownCircle seconds={10} />
    </SafeZone>
  </>
);

export const Scene7_Reveal: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="정답: I got to do it" />
    <SafeZone>
      <div style={{ position: "relative" }}>
        <Card3D background={COLORS.accent}>
          <EnglishCardLabel text="I got to do it" fontSize={72} color={COLORS.cardText} />
        </Card3D>
        <UnderlineHighlight width={560} delayFrames={10} />
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

// ---------- Scene 8: going to -> mma ----------

export const Scene8_Quiz: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="일시정지하고 맞혀보세요" />
    <SafeZone>
      <QuizCard text="아이머 콜 유 레이터" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene8_Countdown: React.FC = () => (
  <>
    <TopLeftBadge text="일시정지하고 맞혀보세요" />
    <SafeZone>
      <CountdownCircle seconds={10} />
    </SafeZone>
  </>
);

export const Scene8_Reveal: React.FC<{ segment: TestSegment; durationInFrames: number }> = ({
  segment,
  durationInFrames,
}) => {
  const trigger = Math.round(durationInFrames * 0.3);
  return (
    <>
      <TopLeftBadge text="정답: I am going to call you later" />
      <SafeZone>
        <div style={{ position: "relative" }}>
          <MergeWords words={["am", "going", "to"]} mergedText="머" triggerFrame={trigger} />
          <CircleMark delayFrames={trigger + 40} size={220} />
        </div>
      </SafeZone>
      <CaptionRow cues={segment.subtitleGroups ?? []} />
    </>
  );
};

// ---------- Scene 9: summary ----------

export const Scene9_Summary: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="안 들리는 게 아니라, 원래 이런 거였다" />
    <SafeZone>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SummaryCard text="뜻 단어 vs 문법 단어 구조적 분리" delayFrames={0} />
        <SummaryCard text="문법 단어의 강세 탈락 및 소리 뭉개짐 규칙" delayFrames={12} />
        <SummaryCard text="영어 고유의 강세 간격 유지 리듬 습성 법칙" delayFrames={24} />
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene9_Master: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="안 들리는 게 아니라, 원래 이런 거였다" />
    <SafeZone>
      <MasterSummaryCard text="안 들리는 게 아니라 원래 이런 거였다 💡" delayFrames={0} />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

// ---------- Scene 10: teaser ----------

export const Scene10_Dissolve: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="다음 편 예고: 기능 단어의 실종 사건" />
    <SafeZone>
      <div style={{ display: "flex", gap: 40 }}>
        <DissolvingWord text="to" dissolveFrom={45} index={0} />
        <DissolvingWord text="of" dissolveFrom={45} index={1} />
        <DissolvingWord text="a" dissolveFrom={45} index={2} />
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene10_Teaser: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="다음 편 예고" />
    <SafeZone>
      <TeaserCard text="다음 편 예고: 기능 단어의 실종 사건 🎬" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);
