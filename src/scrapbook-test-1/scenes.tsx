import React from "react";
import type { TestSegment } from "./types";
import { COLORS } from "./theme";
import {
  CircleScribble,
  CreditSignature,
  CurvedArrow,
  DashedArrow,
  Headline,
  HeartDoodle,
  KoreanCaption,
  MarkerHighlight,
  Paperclip,
  PunchHoles,
  StarDoodle,
  TapeStrip,
  TornPaper,
  UnderlineSquiggle,
  ZapMarks,
} from "./components";

const cap = (segment: TestSegment) => segment.subtitleGroups?.[0]?.text ?? segment.narration;

// Scene 1 — "Nobody wakes up wanting your product."
export const Scene1: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative" }}>
        <TornPaper background={COLORS.paperWhite} rotateDeg={-2} delayFrames={0}>
          <PunchHoles />
          <TapeStrip top={-30} left={280} width={170} rotateDeg={-3} />
          <ZapMarks delayFrames={16} style={{ left: -10, top: -6 }} />
          <StarDoodle delayFrames={20} style={{ right: -14, top: -18 }} />
          <Headline
            lines={[
              { text: "Nobody", big: true },
              { text: "wakes up wanting" },
              { text: "your product." },
            ]}
          />
          <div style={{ marginTop: 6 }}>
            <UnderlineSquiggle width={330} delayFrames={26} />
          </div>
        </TornPaper>
        {/* Outside TornPaper's own clip-path scope — a large negative offset
            like this gets clipped away if nested inside the torn-edge box. */}
        <CurvedArrow delayFrames={45} style={{ right: -60, bottom: -110 }} />
      </div>
    </div>
    <KoreanCaption text={cap(segment)} />
  </>
);

// Scene 2 — "They wake up wanting their problem gone."
export const Scene2: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative" }}>
        <DashedArrow delayFrames={4} style={{ left: -110, top: 10 }} />
        <TornPaper background={COLORS.paperKraft} rotateDeg={1.5} delayFrames={2} width={860}>
          <PunchHoles count={3} />
          <Paperclip style={{ left: -20, top: -18 }} />
          <HeartDoodle delayFrames={22} style={{ right: -6, top: -10 }} />
          <Headline
            lines={[
              { text: "They wake up" },
              { text: "wanting their" },
            ]}
          />
          <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
            <Headline lines={[{ text: "problem gone." }]} />
            <CircleScribble width={520} height={110} delayFrames={26} />
          </div>
        </TornPaper>
      </div>
    </div>
    <KoreanCaption text={cap(segment)} />
  </>
);

// Scene 3 — "Market the Outcome."
export const Scene3: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <TornPaper background={COLORS.paperWhite} rotateDeg={-1.5} delayFrames={0}>
        <TapeStrip top={280} left={-60} width={150} rotateDeg={-8} />
        <StarDoodle delayFrames={30} style={{ left: -20, bottom: -6 }} />
        <ZapMarks delayFrames={34} style={{ right: -16, top: 10 }} />
        <Headline lines={[{ text: "Market the" }]} />
        <div style={{ marginTop: 10, position: "relative", display: "inline-block" }}>
          <MarkerHighlight delayFrames={20}>
            <span style={{ fontFamily: "inherit", fontWeight: 900, fontSize: 118, color: COLORS.ink }}>
              Outcome.
            </span>
          </MarkerHighlight>
          {/* Hand-drawn emphasis circle around the highlighted word, on top of the marker patch. */}
          <div style={{ position: "absolute", left: -18, top: -14, right: -18, bottom: -10, pointerEvents: "none" }}>
            <CircleScribble width={520} height={130} delayFrames={34} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <UnderlineSquiggle width={300} delayFrames={48} />
        </div>
      </TornPaper>
    </div>
    <KoreanCaption text={cap(segment)} />
  </>
);

// Scene 4 — credit footer
export const Scene4: React.FC<{ segment: TestSegment }> = ({ segment }) => (
  <>
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative" }}>
        <TornPaper background={COLORS.paperKraft} rotateDeg={-1} delayFrames={0} width={620} style={{ textAlign: "center" }}>
          <CreditSignature text="Digital Coach Poonam" />
        </TornPaper>
        {/* Outside TornPaper's clip-path scope — see Scene1's CurvedArrow note. */}
        <HeartDoodle delayFrames={14} style={{ left: -50, top: "38%" }} />
        <HeartDoodle delayFrames={18} style={{ right: -50, top: "38%" }} />
      </div>
    </div>
    <KoreanCaption text={cap(segment)} />
  </>
);
