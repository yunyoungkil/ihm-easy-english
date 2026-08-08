import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  ANIMATION,
  SPEECH,
  TRAVEL_RANGES,
  TRAVEL_WAYPOINTS,
  type MotionStyle,
  type TravelProfileName,
} from "../theme";
import { useMotionStyle } from "../motion";

export type Entrance = {
  opacity: number;
  transform: string;
  style: { opacity: number; transform: string };
};

export type EntranceOptions = {
  staggerSec?: number;
  /** Phase source for idle motion; defaults to the entrance index. */
  index?: number;
  /** Enables the travelling path (in motion styles that allow it). */
  travel?: TravelProfileName;
  /**
   * Suppresses all idle motion (float and travel) once the element has
   * arrived, in every motion style. For fixed furniture — the channel badge,
   * the caption banner, the word rows — that should stay put even in
   * `dynamic`.
   */
  staticIdle?: boolean;
};

/**
 * When an element at `index` starts and finishes arriving, in frames.
 * Follow-up beats (stress pulses, the compare arrow) chain off `endFrames`.
 */
export const getEntranceTiming = (
  index: number,
  fps: number,
  motion: MotionStyle,
  staggerSecOverride?: number,
) => {
  const staggerSec = staggerSecOverride ?? motion.staggerSec;
  const delayFrames = Math.round(index * staggerSec * fps);
  const durationFrames = Math.round(motion.entranceSettleSec * fps);
  return { delayFrames, durationFrames, endFrames: delayFrames + durationFrames };
};

export const useEntranceTiming = (index: number = 0, staggerSecOverride?: number) => {
  const { fps } = useVideoConfig();
  const motion = useMotionStyle();
  return getEntranceTiming(index, fps, motion, staggerSecOverride);
};

// Subtle in-place drift; the idle used by elements with no travel profile.
const computeFloat = (frame: number, fps: number, motion: MotionStyle, index: number) => {
  if (!motion.floatEnabled) {
    return 0;
  }
  const seconds = frame / fps + index * motion.floatPhaseOffsetSec;
  return Math.sin((seconds / motion.floatPeriodSec) * Math.PI * 2) * motion.floatAmplitudePx;
};

/**
 * Walks the waypoint loop. Each leg is eased in and out, so the element comes
 * to a near stop at every waypoint and never changes direction abruptly.
 * Ramped in over the element's entrance so it always arrives at its true
 * laid-out position before starting to roam.
 */
const computeTravel = (
  frame: number,
  fps: number,
  motion: MotionStyle,
  index: number,
  profile: TravelProfileName | undefined,
  delayFrames: number,
  durationFrames: number,
  width: number,
  height: number,
) => {
  if (!profile || !motion.travelEnabled) {
    return { x: 0, y: 0, rotate: 0 };
  }

  const range = TRAVEL_RANGES[profile];
  const rampIn = interpolate(frame, [delayFrames, delayFrames + durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Phase offset per element keeps neighbours out of sync, so they don't all
  // swing the same way at the same time and crowd each other.
  const seconds = frame / fps + index * motion.travelPhaseOffsetSec;
  const cycle = (seconds / motion.travelPeriodSec) % 1;
  const legs = TRAVEL_WAYPOINTS.length;
  const position = (cycle < 0 ? cycle + 1 : cycle) * legs;
  const legIndex = Math.floor(position);
  const eased = Easing.inOut(Easing.ease)(position - legIndex);

  const from = TRAVEL_WAYPOINTS[legIndex % legs];
  const to = TRAVEL_WAYPOINTS[(legIndex + 1) % legs];

  // Rotation is per-profile because tilt costs vertical room in proportion to
  // an element's width: 3deg on a full-width row would swing its ends far
  // enough to close the gap to the row above.
  return {
    x: interpolate(eased, [0, 1], [from.x, to.x]) * range.x * width * rampIn,
    y: interpolate(eased, [0, 1], [from.y, to.y]) * range.y * height * rampIn,
    rotate: interpolate(eased, [0, 1], [from.rotate, to.rotate]) * range.rotateDeg * rampIn,
  };
};

const computeEntrance = (
  frame: number,
  fps: number,
  motion: MotionStyle,
  delayFrames: number,
  durationFrames: number,
  index: number,
  travel: TravelProfileName | undefined,
  width: number,
  height: number,
  staticIdle: boolean,
): Entrance => {
  // No `durationInFrames` here on purpose: letting the spring run at its
  // natural rate is what makes `springDamping` read as specified (20 =
  // critically damped, 13 = slight overshoot).
  const progress = spring({
    frame: frame - delayFrames,
    fps,
    config: { damping: motion.springDamping },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // `calm` rises from below; `dynamic` slides in horizontally, alternating
  // side per index so consecutive rows enter from opposite edges.
  const direction = motion.entranceAlternate && index % 2 === 1 ? -1 : 1;
  const offset = interpolate(progress, [0, 1], [motion.entranceSlidePx * direction, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const offsetX = motion.entranceAxis === "x" ? offset : 0;
  const offsetY = motion.entranceAxis === "y" ? offset : 0;

  const roam = staticIdle
    ? { x: 0, y: 0, rotate: 0 }
    : computeTravel(
        frame,
        fps,
        motion,
        index,
        travel,
        delayFrames,
        durationFrames,
        width,
        height,
      );
  // Elements that roam don't also float — one source of idle motion keeps the
  // travel range honest.
  const float =
    staticIdle || (travel && motion.travelEnabled)
      ? 0
      : computeFloat(frame, fps, motion, index);

  const transform =
    `translate(${offsetX + roam.x}px, ${offsetY + float + roam.y}px)` +
    (roam.rotate === 0 ? "" : ` rotate(${roam.rotate}deg)`);

  return { opacity, transform, style: { opacity, transform } };
};

export const useEntrance = (index: number = 0, options: EntranceOptions = {}): Entrance => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const motion = useMotionStyle();
  const { delayFrames, durationFrames } = getEntranceTiming(index, fps, motion, options.staggerSec);
  return computeEntrance(
    frame,
    fps,
    motion,
    delayFrames,
    durationFrames,
    options.index ?? index,
    options.travel,
    width,
    height,
    options.staticIdle ?? false,
  );
};

/**
 * Entrance keyed by an explicit frame delay, for sequences that can't be
 * expressed as index * stagger (quiz's hold-then-arrow beat, compare's
 * left-word -> arrow -> right-word chain).
 */
export const useEntranceAtFrame = (
  delayFrames: number,
  options: EntranceOptions = {},
): Entrance => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const motion = useMotionStyle();
  const durationFrames = Math.round(motion.entranceSettleSec * fps);
  return computeEntrance(
    frame,
    fps,
    motion,
    delayFrames,
    durationFrames,
    options.index ?? 0,
    options.travel,
    width,
    height,
    options.staticIdle ?? false,
  );
};

/**
 * Travel on its own, for wrappers that should roam as a single unit while
 * their children run their own entrances (e.g. a compare row, where letting
 * the two words drift independently could close the gap around the arrow).
 */
export const useTravelTransform = (index: number, profile: TravelProfileName) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const motion = useMotionStyle();
  const durationFrames = Math.round(motion.entranceSettleSec * fps);
  const { delayFrames } = getEntranceTiming(index, fps, motion);

  const roam = computeTravel(
    frame,
    fps,
    motion,
    index,
    profile,
    delayFrames,
    durationFrames,
    width,
    height,
  );

  return (
    `translate(${roam.x}px, ${roam.y}px)` +
    (roam.rotate === 0 ? "" : ` rotate(${roam.rotate}deg)`)
  );
};

export const useStressPulse = (
  delayFrames: number,
  options?: { scale?: number; durationSec?: number; count?: number },
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motion = useMotionStyle();
  const scale = options?.scale ?? motion.stressPulseScale;
  const durationSec = options?.durationSec ?? motion.stressPulseDurationSec;
  const count = options?.count ?? 1;
  const cycleFrames = Math.round(durationSec * fps);
  const local = frame - delayFrames;

  const points = [0];
  const values = [1];
  for (let c = 0; c < count; c++) {
    const base = c * cycleFrames;
    points.push(base + cycleFrames / 2, base + cycleFrames);
    values.push(scale, 1);
  }

  return interpolate(local, points, values, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

/**
 * Gentle brightness breathing applied to stress syllables once they've
 * pulsed. Flat 1 in `calm`, which is meant to come to a complete stop.
 */
export const useStressShimmer = (delayFrames: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const motion = useMotionStyle();

  if (!motion.stressShimmerEnabled) {
    return 1;
  }

  const seconds = Math.max(0, frame - delayFrames) / fps;
  const wave = Math.sin((seconds / motion.stressShimmerPeriodSec) * Math.PI * 2);
  const mid = (1 + motion.stressShimmerMinOpacity) / 2;
  const amplitude = (1 - motion.stressShimmerMinOpacity) / 2;
  return mid + amplitude * wave;
};

export type SpeechWindow = { highlightAt?: number; highlightEnd?: number };

/**
 * 0..1 emphasis envelope tracking the narration: springs up over
 * `attackSec` when the word starts being spoken, holds while it's spoken,
 * and releases over `releaseSec` once it's done. 0 for words with no
 * timestamp, which is what makes them render exactly as before.
 */
export const useSpeechEmphasis = (word: SpeechWindow = {}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const start = word.highlightAt;
  const end = word.highlightEnd ?? (start ?? 0) + Math.round(SPEECH.fallbackDurationSec * fps);

  const attack = spring({
    frame: start === undefined ? -1 : frame - start,
    fps,
    durationInFrames: Math.max(1, Math.round(SPEECH.attackSec * fps)),
    config: { damping: SPEECH.attackDamping },
  });
  const release = interpolate(
    frame,
    [end, end + Math.round(SPEECH.releaseSec * fps)],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  if (start === undefined) {
    return 0;
  }
  return Math.max(0, attack * release);
};

/** Scale multiplier for the word currently being spoken. */
export const speechScale = (emphasis: number) => 1 + (SPEECH.scale - 1) * emphasis;

export type HighlightState = {
  /** 0..1 — how "currently spoken" this word is. */
  activeness: number;
  /** 0..1 — how much some *other* word is currently being spoken. */
  dimness: number;
};

const NEUTRAL_HIGHLIGHT: HighlightState = { activeness: 0, dimness: 0 };

/**
 * Turns per-word speech windows (extracted by Whisper) into activation states
 * for a whole scene at once, so a word can be dimmed based on whether
 * *another* word is being spoken.
 *
 * Words without a `highlightAt` never activate, and when nothing is active
 * every word reports the neutral state (activeness 0, dimness 0) — which is
 * what makes scenes with no timestamps fall back to plain sequential
 * entrance with no dimming.
 */
export const useHighlightStates = (words: SpeechWindow[]): HighlightState[] => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rampFrames = Math.round(ANIMATION.highlightRampSec * fps);

  const activeness = words.map((word) => {
    if (word.highlightAt === undefined) {
      return 0;
    }
    // Hold for as long as the word is actually spoken, falling back to a
    // fixed dwell when only a start frame is known.
    const end = word.highlightEnd ?? word.highlightAt + Math.round(ANIMATION.highlightHoldSec * fps);
    return interpolate(
      frame,
      [word.highlightAt - rampFrames, word.highlightAt, end, end + rampFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
  });

  const anyActive = activeness.reduce((max, value) => Math.max(max, value), 0);

  return activeness.map((value) => ({
    activeness: value,
    dimness: Math.max(0, anyActive - value),
  }));
};

/** Opacity multiplier for a word that should dim while another is spoken. */
export const highlightOpacity = (state: HighlightState = NEUTRAL_HIGHLIGHT) =>
  1 - (1 - ANIMATION.highlightDimOpacity) * state.dimness;

/** Scale-up applied to the word currently being spoken. */
export const highlightScale = (state: HighlightState = NEUTRAL_HIGHLIGHT) =>
  1 + (ANIMATION.highlightActiveScale - 1) * state.activeness;
