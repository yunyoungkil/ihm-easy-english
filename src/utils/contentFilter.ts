// Some `content` strings in the episode script are editorial/production notes
// (e.g. "채널 인트로,") rather than text meant to appear on screen. This strips
// out any comma-separated segment that looks like one of those notes.
const EDITORIAL_NOTE_KEYWORDS = ["채널 인트로", "인트로"];

export const filterEditorialNotes = (text?: string): string | undefined => {
  if (!text) {
    return text;
  }

  const kept = text
    .split(",")
    .map((segment) => segment.trim())
    .filter(
      (segment) => segment.length > 0 && !EDITORIAL_NOTE_KEYWORDS.some((kw) => segment.includes(kw)),
    );

  const result = kept.join(", ").trim();
  return result.length > 0 ? result : undefined;
};
