import React from "react";

/**
 * Landmark glyphs for the etymology `flow` scene (EP6 scene 5: Latin → French
 * → English). Same drawing convention as icons.tsx (24x24 viewBox,
 * stroke-only, `{size, color, strokeWidth?}`), but kept in their own file
 * since these three are single-purpose to this one scene rather than shared
 * across layouts/motion-styles the way icons.tsx's glyphs are.
 */

type GlyphProps = {
  size: number;
  color: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
};

/** Roman column: capital, shaft flutes, base — stands in for Latin. */
export const PillarGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M4 4H20M4 20H20M7 4V20M12 4V20M17 4V20"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Tapering lattice tower with splayed legs — stands in for French. */
export const EiffelTowerGlyph: React.FC<GlyphProps> = ({
  size,
  color,
  strokeWidth = 1.6,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M12 2V6M9 6H15L17 20H7L9 6Z M8 13H16M7.3 16.5H16.7M7 20L4.5 22M17 20L19.5 22"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Clock tower with a pointed spire — stands in for English. */
export const BigBenGlyph: React.FC<GlyphProps> = ({ size, color, strokeWidth = 1.6, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path
      d="M9 22V9H15V22M8.5 9L12 3L15.5 9M9 22H15"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13.5" r="2" stroke={color} strokeWidth={strokeWidth} />
  </svg>
);
