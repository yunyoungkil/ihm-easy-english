import type { SpeakerId } from "./theme";

export type DialogueLine = {
  id: string;
  speaker: SpeakerId;
  /** English narration text — also the karaoke source text. */
  en: string;
  /** Korean gloss shown as the smaller sub-line. */
  ko: string;
  /** TTS filename under public/audio/. May not exist yet — see calculateMetadata's fallback. */
  audioFile: string;
};

export type WordSegment = {
  type: "word";
  text: string;
  startFrame: number;
  endFrame: number;
};

export type PauseSegment = {
  type: "pause";
  startFrame: number;
  endFrame: number;
};

export type LineSegment = WordSegment | PauseSegment;
