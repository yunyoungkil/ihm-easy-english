export type SubtitleCue = { text: string; from: number; to: number };

export type TestSegment = {
  id: number;
  start: number;
  end: number;
  narration: string;
  subtitleGroups?: SubtitleCue[];
  highlightAt?: number;
  highlightEnd?: number;
};

export type TestScriptData = {
  title: string;
  segments: TestSegment[];
};
