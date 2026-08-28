import React from "react";
import type { TestSegment } from "./types";
import { COLORS } from "./theme";
import {
  CaptionRow,
  ChainedFunctionCard,
  CountdownCircle,
  CrashZoom,
  DissolvingWord,
  MagnifyingGlassPulse,
  MasterSlavePair,
  MergeWords,
  QuizCard,
  QuizReveal,
  SafeZone,
  SpringPhraseReveal,
  SummaryCard,
  MasterSummaryCard,
  TeaserCard,
  TopLeftBadge,
} from "./components";

// ---------- Scene 1: opening quiz ----------

export const Scene1_Question: React.FC<{ segment: TestSegment }> = ({ segment }) => {
  const cues = segment.subtitleGroups ?? [];
  const lastCue = cues[cues.length - 1];
  const words = ["to", "of", "a", "the"];
  return (
    <>
      <TopLeftBadge text="Scene 1" />
      <SafeZone style={{ flexDirection: "column", gap: 60 }}>
        <div style={{ display: "flex", gap: 32 }}>
          {words.map((w, i) => (
            <DissolvingWord key={w} text={w} dissolveFrom={lastCue?.from ?? 999} index={i} />
          ))}
        </div>
        <SpringPhraseReveal cues={cues} fontSize={72} />
      </SafeZone>
    </>
  );
};

export const Scene1_QuizHold: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => (
  <CrashZoom durationInFrames={durationInFrames}>
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <MagnifyingGlassPulse />
    </div>
  </CrashZoom>
);

export const Scene1_Reveal: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="기능어란?" />
    <SafeZone style={{ flexDirection: "column", gap: 50 }}>
      <ChainedFunctionCard text="기능어" />
      <SpringPhraseReveal cues={segment.subtitleGroups ?? []} fontSize={56} />
    </SafeZone>
  </>
);

export const Scene1_Closing: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <SafeZone>
    <SpringPhraseReveal cues={segment.subtitleGroups ?? []} />
  </SafeZone>
);

// ---------- Scene 2: want vs to concept ----------

export const Scene2_Intro: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="want (주인님) vs to (노예)" />
    <SafeZone>
      <SpringPhraseReveal cues={segment.subtitleGroups ?? []} fontSize={72} />
    </SafeZone>
  </>
);

export const Scene2_Pair: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="want (주인님) vs to (노예)" />
    <SafeZone>
      <MasterSlavePair master="want" slave="to" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene2_Imbalance: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="want (주인님) vs to (노예)" />
    <SafeZone>
      <MasterSlavePair master="want" slave="to" imbalanceFrom={8} />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

// ---------- Scene 3: wanna merge ----------

export const Scene3_PreMerge: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="에너지가 고갈된 to의 최후 → wanna" />
    <SafeZone>
      <MasterSlavePair master="want" slave="to" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene3_Merge: React.FC<{ segment: TestSegment }> = ({ segment }) => {
  const cues = segment.subtitleGroups ?? [];
  const lastCue = cues[cues.length - 1];
  const trigger = lastCue?.from ?? 0;
  return (
    <>
      <TopLeftBadge text="에너지가 고갈된 to의 최후 → wanna" />
      <SafeZone>
        <MergeWords left="want" right="to" mergedText="wanna" mergedColor={COLORS.wanna} triggerFrame={trigger} />
      </SafeZone>
      <CaptionRow cues={cues} />
    </>
  );
};

// ---------- Scene 4: gonna merge ----------

export const Scene4_Intro: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="going (주인님) + to (노예) → gonna" />
    <SafeZone>
      <SpringPhraseReveal cues={segment.subtitleGroups ?? []} fontSize={72} />
    </SafeZone>
  </>
);

export const Scene4_Pair: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="going (주인님) + to (노예) → gonna" />
    <SafeZone>
      <MasterSlavePair master="going" slave="to" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene4_Merge: React.FC<{ segment: TestSegment }> = ({ segment }) => {
  const cues = segment.subtitleGroups ?? [];
  const lastCue = cues[cues.length - 1];
  const trigger = lastCue?.from ?? 0;
  return (
    <>
      <TopLeftBadge text="going (주인님) + to (노예) → gonna" />
      <SafeZone>
        <MergeWords left="going" right="to" mergedText="gonna" mergedColor={COLORS.gonna} triggerFrame={trigger} />
      </SafeZone>
      <CaptionRow cues={cues} />
    </>
  );
};

// ---------- Scene 5: gotta merge ----------

export const Scene5_Intro: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="got (주인님) + to (노예) → gotta" />
    <SafeZone>
      <SpringPhraseReveal cues={segment.subtitleGroups ?? []} fontSize={72} />
    </SafeZone>
  </>
);

export const Scene5_Pair: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="got (주인님) + to (노예) → gotta" />
    <SafeZone>
      <MasterSlavePair master="got" slave="to" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene5_Merge: React.FC<{ segment: TestSegment }> = ({ segment }) => {
  const cues = segment.subtitleGroups ?? [];
  const lastCue = cues[cues.length - 1];
  const trigger = lastCue?.from ?? 0;
  return (
    <>
      <TopLeftBadge text="got (주인님) + to (노예) → gotta" />
      <SafeZone>
        <MergeWords left="got" right="to" mergedText="gotta" mergedColor={COLORS.gotta} triggerFrame={trigger} />
      </SafeZone>
      <CaptionRow cues={cues} />
    </>
  );
};

// ---------- Scene 6: interactive quiz ----------

export const Scene6_QuizSetup: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="일시정지하고 맞혀보세요! ⏱️" />
    <SafeZone>
      <QuizCard text="아이브 갓 투" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene6_Countdown: React.FC = () => (
  <>
    <TopLeftBadge text="일시정지하고 맞혀보세요! ⏱️" />
    <SafeZone>
      <CountdownCircle seconds={10} />
    </SafeZone>
  </>
);

export const Scene6_Reveal: React.FC = () => (
  <>
    <TopLeftBadge text="정답: I've gotta" />
    <SafeZone>
      <QuizReveal text="I've gotta" />
    </SafeZone>
  </>
);

// ---------- Scene 7: summary ----------

export const Scene7_Summary: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="기능어 소멸 공식 마스터 정리" />
    <SafeZone>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SummaryCard text="영어 단어의 계급 분리 (주인님 vs 노예)" delayFrames={0} />
        <SummaryCard text="기능어(노예 단어)의 강세 탈락 및 소리 뭉개짐" delayFrames={12} />
        <SummaryCard text="앞 단어로의 자석식 흡입 축약형 탄생 법칙" delayFrames={24} />
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene7_Master: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="기능어 소멸 공식 마스터 정리" />
    <SafeZone>
      <MasterSummaryCard text="이 원리만 알면 영어가 들리기 시작합니다 💡" delayFrames={0} />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

// ---------- Scene 8: teaser outro ----------

export const Scene8_Intro: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="다음 편 예고" />
    <SafeZone>
      <SpringPhraseReveal cues={segment.subtitleGroups ?? []} fontSize={64} />
    </SafeZone>
  </>
);

export const Scene8_Dissolve: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="다음 편 예고" />
    <SafeZone>
      <div style={{ display: "flex", gap: 40 }}>
        <DissolvingWord text="wanna" dissolveFrom={45} index={0} />
        <DissolvingWord text="gonna" dissolveFrom={45} index={1} />
        <DissolvingWord text="gotta" dissolveFrom={45} index={2} />
      </div>
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);

export const Scene8_Teaser: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <TopLeftBadge text="다음 편 예고" />
    <SafeZone>
      <TeaserCard text="다음 편 예고: 원어민이 문장을 쪼개는 경계선 규칙 🎬" />
    </SafeZone>
    <CaptionRow cues={segment.subtitleGroups ?? []} />
  </>
);
