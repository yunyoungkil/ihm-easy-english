import React from "react";
import { COLORS, SPACING } from "../theme";

const KEYWORD_REGEX = /-?[A-Z]{2,}/g;

export const RuleText: React.FC<{ text: string; fontSize: number; fontFamily: string }> = ({
  text,
  fontSize,
  fontFamily,
}) => {
  if (text.includes("→")) {
    const parts = text.split("→").map((part) => part.trim());
    return (
      <span
        style={{
          fontFamily,
          fontSize,
          fontWeight: 900,
          display: "inline-flex",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: fontSize * SPACING.ruleTextGapRatio,
        }}
      >
        {parts.map((part, i) => (
          <React.Fragment key={`${part}-${i}`}>
            {i > 0 && <span style={{ color: COLORS.accent }}>→</span>}
            <span style={{ color: COLORS.accent }}>{part}</span>
          </React.Fragment>
        ))}
      </span>
    );
  }

  const segments: { text: string; highlight: boolean }[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(KEYWORD_REGEX)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), highlight: false });
    }
    segments.push({ text: match[0], highlight: true });
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlight: false });
  }

  return (
    <span style={{ fontFamily, fontSize, fontWeight: 900 }}>
      {segments.map((seg, i) => (
        <span key={i} style={{ color: seg.highlight ? COLORS.accent : COLORS.text }}>
          {seg.text}
        </span>
      ))}
    </span>
  );
};
