import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Composition,
  Sequence,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import ep07ShortsA from "../scripts/ep07_shortsA.json";
import type { ShortsAData, ShortsAPillWord, ShortsASegment, SubtitleCue } from "./types";
import { COLORS, LAYOUT, SHORTS } from "./theme";
import { FONT_EN, FONT_KO } from "./fonts";
import { speechScale, useSpeechEmphasis } from "./utils/animation";
import { REVEAL_DELAY_SEC, SHORTS_A_COUNTDOWN, SHORTS_A_SAFE, SHORTS_A_SFX } from "./shortsALayout";

const DATA = ep07ShortsA as ShortsAData;
const AUDIO_PREFIX = "ep07_shortsA";
const END_BUFFER_SEC = 0.2;
const PILL_WORDS: ShortsAPillWord[] = DATA.openingWords;

const segmentAudio = (id: number) =>
  `${AUDIO_PREFIX}_seg${String(id).padStart(2, "0")}.wav`;

const plannedFrames = (segments: ShortsASegment[]) =>
  segments.map((s) => Math.round((s.end - s.start) * LAYOUT.fps));

/** Frame to start a sound file so its *audible* attack lands on `atFrame`. */
const sfxStart = (atFrame: number, leadInMs: number, fps: number) =>
  Math.max(0, Math.round(atFrame - (leadInMs / 1000) * fps));

/** Remotion wants a callback (rather than a number) for volume. */
const sfxVolume = () => SHORTS_A_SFX.volume;

export type Ep07ShortsAProps = {
  segmentDurationsInFrames: number[];
  narrationFramesPerSegment: number[];
  /** Silent frames before a reveal segment's own narration starts. */
  leadInFramesPerSegment: number[];
  /** Composition-absolute frame each pill word is answered, for the persistent overlay. */
  revealFrames: { word: ShortsAPillWord; frame: number }[];
};

const makeCalculateMetadata =
  (): CalculateMetadataFunction<Ep07ShortsAProps> => async () => {
    const planned = plannedFrames(DATA.segments);
    const beatFrames = Math.round(SHORTS_A_COUNTDOWN.beatSec * LAYOUT.fps);
    const revealDelayFrames = Math.round(REVEAL_DELAY_SEC * LAYOUT.fps);
    const endBufferFrames = Math.round(END_BUFFER_SEC * LAYOUT.fps);

    const narrationFramesPerSegment = await Promise.all(
      DATA.segments.map(async (segment, i) => {
        try {
          const seconds = await getAudioDurationInSeconds(
            staticFile(`audio/${segmentAudio(segment.id)}`),
          );
          return Math.round(seconds * LAYOUT.fps);
        } catch {
          // Narration not generated yet — fall back to the script's plan.
          return planned[i];
        }
      }),
    );

    // A reveal fires exactly REVEAL_DELAY_SEC after the previous segment's
    // narration ends. A preceding countdown already spends that time
    // thinking (5 digits * 0.6s = 3.0s), so only the leftover is spent in
    // silence here — which is 0 for segment 3 and the full 3s for 4 and 5.
    const leadInFramesPerSegment = DATA.segments.map((segment, i) => {
      if (!segment.reveal) {
        return 0;
      }
      const prev = DATA.segments[i - 1];
      const prevCountdownFrames = prev?.countdown ? prev.countdown * beatFrames : 0;
      return Math.max(0, revealDelayFrames - prevCountdownFrames);
    });

    const countdownFramesPerSegment = DATA.segments.map((segment) =>
      segment.countdown ? segment.countdown * beatFrames : 0,
    );

    const segmentDurationsInFrames = DATA.segments.map(
      (_segment, i) =>
        leadInFramesPerSegment[i] +
        narrationFramesPerSegment[i] +
        countdownFramesPerSegment[i] +
        endBufferFrames,
    );

    const segmentStartFrames = segmentDurationsInFrames.reduce<number[]>((acc, d, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + segmentDurationsInFrames[i - 1]);
      return acc;
    }, []);

    const revealFrames = DATA.segments
      .map((segment, i) =>
        segment.reveal
          ? {
              word: segment.reveal,
              frame: segmentStartFrames[i] + leadInFramesPerSegment[i],
            }
          : null,
      )
      .filter((r): r is { word: ShortsAPillWord; frame: number } => r !== null);

    return {
      durationInFrames: segmentDurationsInFrames.reduce((a, b) => a + b, 0),
      props: {
        segmentDurationsInFrames,
        narrationFramesPerSegment,
        leadInFramesPerSegment,
        revealFrames,
      },
    };
  };

// ---------- Persistent pill overlay (composition-level, outside Series) ----------

const PillWordView: React.FC<{
  word: ShortsAPillWord;
  isOpening: boolean;
  revealFrame?: number;
}> = ({ word, isOpening, revealFrame }) => {
  const frame = useCurrentFrame();
  const emphasis = useSpeechEmphasis(
    revealFrame !== undefined ? { highlightAt: revealFrame } : {},
  );
  const revealed = revealFrame !== undefined && frame >= revealFrame;

  return (
    <div
      style={{
        padding: "18px 34px",
        borderRadius: 999,
        border: `3px solid ${COLORS.text}`,
        background: isOpening ? COLORS.accent : "transparent",
        transform: `scale(${isOpening ? 1 : speechScale(emphasis)})`,
      }}
    >
      <span
        style={{
          fontFamily: FONT_EN,
          fontWeight: 900,
          fontSize: 40,
          letterSpacing: 1,
          // Revealed words stay accent-coloured for good — only the pulse
          // that lands the reveal is transient, not the colour itself.
          color: isOpening ? COLORS.background : revealed ? COLORS.accent : COLORS.text,
        }}
      >
        {word}
      </span>
    </div>
  );
};

const PillRow: React.FC<{
  openingEndFrame: number;
  revealFrames: { word: ShortsAPillWord; frame: number }[];
}> = ({ openingEndFrame, revealFrames }) => {
  const frame = useCurrentFrame();
  const isOpening = frame < openingEndFrame;
  const revealOf = (word: ShortsAPillWord) =>
    revealFrames.find((r) => r.word === word)?.frame;

  return (
    <div
      style={{
        position: "absolute",
        top: SHORTS_A_SAFE.topPx + 60,
        left: 0,
        width: SHORTS_A_SAFE.rightPx,
        display: "flex",
        justifyContent: "center",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      {PILL_WORDS.map((word) => (
        <PillWordView key={word} word={word} isOpening={isOpening} revealFrame={revealOf(word)} />
      ))}
    </div>
  );
};

// ---------- Per-segment content ----------

const Countdown: React.FC<{ startFrame: number; digits: number }> = ({ startFrame, digits }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = Math.round(SHORTS_A_COUNTDOWN.beatSec * fps);
  const local = frame - startFrame;

  if (local < 0 || local >= beat * digits) {
    return null;
  }

  const index = Math.floor(local / beat);
  const digit = digits - index;
  const inBeat = local - index * beat;

  const pop = spring({
    frame: inBeat,
    fps,
    durationInFrames: Math.max(1, Math.round(beat * 0.6)),
    config: { damping: 12 },
  });
  const opacity = interpolate(inBeat, [0, beat * 0.15, beat * 0.8, beat], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontFamily: FONT_EN,
        fontWeight: 900,
        fontSize: 320,
        color: COLORS.accent,
        transform: `scale(${0.7 + pop * 0.3})`,
        opacity,
        lineHeight: 1,
      }}
    >
      {digit}
    </div>
  );
};

/**
 * The answered word + its Korean reading. Only exists once the reveal has
 * fired (`frame >= leadIn`) — the segment spends its first `leadIn` frames in
 * silence with nothing shown, per the "screen and voice together" rule.
 */
const RevealAnswer: React.FC<{ segment: ShortsASegment; leadIn: number }> = ({
  segment,
  leadIn,
}) => {
  const frame = useCurrentFrame();
  const emphasis = useSpeechEmphasis({ highlightAt: leadIn });
  if (!segment.reveal || frame < leadIn) {
    return null;
  }

  const pron = segment.pronunciation ?? "";
  const stressAt = segment.stress ? pron.indexOf(segment.stress) : -1;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        transform: `scale(${speechScale(emphasis)})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT_EN,
          fontWeight: 900,
          fontSize: 118,
          letterSpacing: 1,
          color: COLORS.accent,
        }}
      >
        {segment.reveal}
      </div>
      {pron && (
        <div style={{ fontFamily: FONT_KO, fontWeight: 700, fontSize: 60 }}>
          {stressAt === -1 ? (
            <span style={{ color: COLORS.text }}>{pron}</span>
          ) : (
            <>
              <span style={{ color: COLORS.text }}>{pron.slice(0, stressAt)}</span>
              <span style={{ color: COLORS.accent }}>{segment.stress}</span>
              <span style={{ color: COLORS.text }}>
                {pron.slice(stressAt + (segment.stress?.length ?? 0))}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const Cta: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({
    frame,
    fps,
    durationInFrames: Math.round(0.5 * fps),
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        fontFamily: FONT_KO,
        fontWeight: 700,
        fontSize: 52,
        color: COLORS.background,
        background: COLORS.accent,
        padding: "26px 52px",
        borderRadius: 999,
        textAlign: "center",
        opacity: entrance,
        transform: `translateY(${(1 - entrance) * 30}px)`,
      }}
    >
      {text}
    </div>
  );
};

const Subtitle: React.FC<{ cues: SubtitleCue[]; hideBefore: number }> = ({
  cues,
  hideBefore,
}) => {
  const frame = useCurrentFrame();
  // A reveal segment spends its first `hideBefore` frames in silence before
  // its narration starts — showing the first cue early there (the fallback
  // ShortsScene's Subtitle uses) would spoil the answer via text before the
  // ding and the pulse land.
  if (frame < hideBefore) {
    return null;
  }
  const hit =
    cues.find((c) => frame >= c.from && frame <= c.to) ??
    (cues.length > 0 && frame < cues[0].from ? cues[0] : null);
  if (!hit) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: SHORTS.height - SHORTS_A_SAFE.bottomPx + 40,
        left: 0,
        width: SHORTS_A_SAFE.rightPx,
        textAlign: "center",
        fontFamily: FONT_KO,
        fontWeight: 700,
        fontSize: 46,
        color: COLORS.text,
        lineHeight: 1.35,
        wordBreak: "keep-all",
      }}
    >
      {hit.text}
    </div>
  );
};

const Ep07ShortsAScene: React.FC<{
  segment: ShortsASegment;
  leadIn: number;
  narrationFrames: number;
}> = ({ segment, leadIn, narrationFrames }) => {
  // subtitleGroups are frame-relative to the narration audio's own start
  // (generate-highlights.mjs has no notion of the silent lead-in), but the
  // audio itself only starts at `leadIn` frames into this segment — shift the
  // cues so they still land on the words as they're actually spoken.
  const cues = (segment.subtitleGroups ?? []).map((c) => ({
    ...c,
    from: c.from + leadIn,
    to: c.to + leadIn,
  }));

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: SHORTS_A_SAFE.topPx + 320,
          left: 0,
          width: SHORTS_A_SAFE.rightPx,
          height: SHORTS_A_SAFE.bottomPx - (SHORTS_A_SAFE.topPx + 320),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {segment.countdown !== undefined && (
          <Countdown startFrame={narrationFrames} digits={segment.countdown} />
        )}
        {segment.reveal && <RevealAnswer segment={segment} leadIn={leadIn} />}
        {segment.cta && <Cta text={segment.cta} />}
      </div>
      <Subtitle cues={cues} hideBefore={leadIn} />
    </AbsoluteFill>
  );
};

// ---------- Composition ----------

export const Ep07ShortsAVideo: React.FC<Ep07ShortsAProps> = ({
  segmentDurationsInFrames,
  narrationFramesPerSegment,
  leadInFramesPerSegment,
  revealFrames,
}) => {
  const planned = plannedFrames(DATA.segments);
  const durations = DATA.segments.map((_, i) => segmentDurationsInFrames[i] ?? planned[i]);
  const openingEndFrame = durations[0] ?? planned[0] ?? 0;
  const beatFrames = Math.round(SHORTS_A_COUNTDOWN.beatSec * LAYOUT.fps);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 42%, ${COLORS.backgroundCenter} 0%, ${COLORS.background} 70%)`,
      }}
    >
      <PillRow openingEndFrame={openingEndFrame} revealFrames={revealFrames} />
      <Series>
        {DATA.segments.map((segment, i) => {
          const durationInFrames = durations[i];
          const leadIn = leadInFramesPerSegment[i] ?? 0;
          const narrationFrames = narrationFramesPerSegment[i] ?? planned[i];

          return (
            <Series.Sequence key={segment.id} durationInFrames={durationInFrames}>
              <Ep07ShortsAScene
                segment={segment}
                leadIn={leadIn}
                narrationFrames={narrationFrames}
              />
              <Sequence from={leadIn}>
                <Audio src={staticFile(`audio/${segmentAudio(segment.id)}`)} />
              </Sequence>

              {/* --- sound effects --- */}
              {segment.countdown !== undefined &&
                Array.from({ length: segment.countdown }).map((_, d) => (
                  <Sequence
                    key={d}
                    from={sfxStart(
                      narrationFrames + d * beatFrames,
                      SHORTS_A_SFX.countdown.leadInMs,
                      LAYOUT.fps,
                    )}
                  >
                    <Audio src={SHORTS_A_SFX.countdown.src} volume={sfxVolume} />
                  </Sequence>
                ))}
              {segment.reveal && (
                <Sequence
                  from={sfxStart(leadIn, SHORTS_A_SFX.reveal.leadInMs, LAYOUT.fps)}
                >
                  <Audio src={SHORTS_A_SFX.reveal.src} volume={sfxVolume} />
                </Sequence>
              )}
              {segment.cta && (
                <Audio src={SHORTS_A_SFX.cta.src} volume={sfxVolume} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};

export const Ep07ShortsAComposition: React.FC = () => (
  <Composition
    id="EP07-shortsA"
    component={Ep07ShortsAVideo}
    durationInFrames={plannedFrames(DATA.segments).reduce((a, b) => a + b, 0)}
    fps={LAYOUT.fps}
    width={SHORTS.width}
    height={SHORTS.height}
    defaultProps={{
      segmentDurationsInFrames: [] as number[],
      narrationFramesPerSegment: [] as number[],
      leadInFramesPerSegment: [] as number[],
      revealFrames: [] as { word: ShortsAPillWord; frame: number }[],
    }}
    calculateMetadata={makeCalculateMetadata()}
  />
);
