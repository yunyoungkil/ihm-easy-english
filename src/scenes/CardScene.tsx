import React from "react";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  CardPair,
  CardWord,
  FlowIconName,
  Scene,
  SceneCard,
} from "../types";
import {
  CARD,
  CARD_CATEGORY_COLORS,
  COLORS,
  EFFECTS,
  ENDSCREEN,
  MOBILE_MIN_FONT_SIZE,
  SPACING,
} from "../theme";
import { FONT_EN, FONT_KO } from "../fonts";
import {
  speechScale,
  useEntrance,
  useHighlightStates,
  useSpeechEmphasis,
  type SpeechWindow,
} from "../utils/animation";
import { mixHexColors } from "../utils/color";
import { ArrowGlyph } from "../components/icons";
import {
  BigBenGlyph,
  EiffelTowerGlyph,
  PillarGlyph,
} from "../components/languageIcons";
import { fillTextBox } from "@remotion/layout-utils";

const FLOW_ICONS: Record<
  FlowIconName,
  React.FC<{ size: number; color: string }>
> = {
  latin: PillarGlyph,
  french: EiffelTowerGlyph,
  english: BigBenGlyph,
};

const categoryColor = (category: string) =>
  CARD_CATEGORY_COLORS[category] ?? COLORS.muted;

/**
 * A syllable row. Stress and deviant sounds are shown by colour alone —
 * yellow for the stressed cell, red for a sound that deviates, white
 * otherwise. No "(강세)" / "(발음: 션)" text labels anywhere.
 */
const SyllableRow: React.FC<{
  cells: string[];
  stressIndex?: number;
  diffIndex?: number;
  fontSize: number;
  fontFamily: string;
  /** 0..1 narration emphasis; warms the plain cells toward the accent. */
  emphasis?: number;
}> = ({
  cells,
  stressIndex,
  diffIndex,
  fontSize,
  fontFamily,
  emphasis = 0,
}) => (
  <div
    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
  >
    {cells.map((cell, i) => (
      <React.Fragment key={i}>
        {i > 0 && (
          <span
            style={{
              color: COLORS.muted,
              opacity: 0.45,
              fontSize: fontSize * 0.9,
              padding: `0 ${fontSize * 0.32}px`,
            }}
          >
            |
          </span>
        )}
        <span
          style={{
            fontFamily,
            fontSize,
            fontWeight: 700,
            whiteSpace: "nowrap",
            // The red cause char keeps its meaning; the stressed cell is
            // already yellow, so only plain cells warm during emphasis.
            color:
              i === diffIndex
                ? COLORS.diff
                : i === stressIndex
                  ? COLORS.accent
                  : mixHexColors(COLORS.text, COLORS.accent, emphasis),
          }}
        >
          {cell}
        </span>
      </React.Fragment>
    ))}
  </div>
);

/**
 * Splits a word onto two lines at whichever syllable boundary balances the
 * two lines' character counts best, e.g. ATTENTION (AT|TEN|TION) -> "ATTEN" /
 * "TION" rather than a CSS overflow-wrap break, which greedily fills the
 * first line and leaves a stray last glyph on its own ("ATTENTIO" / "N").
 * Falls back to the whole word on one line if it has no internal syllable
 * boundary to split at.
 */
const splitWordForWrap = (word: CardWord) => {
  const syllables = word.syllables;
  if (syllables.length < 2) return word.word;
  let bestSplit = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < syllables.length; i++) {
    const line1Len = syllables.slice(0, i).join("").length;
    const line2Len = syllables.slice(i).join("").length;
    const diff = Math.abs(line1Len - line2Len);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestSplit = i;
    }
  }
  return `${syllables.slice(0, bestSplit).join("")}\n${syllables.slice(bestSplit).join("")}`;
};

/**
 * A word in the card. While the narration is actually saying it the whole
 * block grows to 1.15 and its title warms to the accent; when another word
 * in the same card is being spoken this one dims instead, to steer the eye.
 * Words with no timestamp just sit at their resting state.
 */
const WordBlock: React.FC<{
  word: CardWord;
  height: number;
  speech?: SpeechWindow;
  dim?: number;
  /** Width-fit factor for the card, from fitWordScale(). */
  wordScale?: number;
  /**
   * True only when wordListMinSizePct's floor forced `wordScale` above what
   * fitWordScale() would naturally allow — the word may now be wider than its
   * panel, so it wraps (at a syllable boundary, via splitWordForWrap) instead
   * of shrinking further. False (the default) keeps today's single-line
   * rendering unchanged.
   */
  wrap?: boolean;
  /**
   * Unscaled frame height, used to floor the syllable/pronunciation cells at
   * their own mobile minimum. Only passed for `card.words` (wordList / 2-up
   * compare) — `card.pairs` deliberately omits it, since flooring cells
   * there too is mathematically impossible alongside the word-glyph floor
   * for 3 stacked pairs; see `protectedBodyHeight()`. When omitted, cells
   * just scale with `height` as before this pass.
   */
  frameHeight?: number;
  /**
   * Scales the syllable/pronunciation cells and the small internal gaps
   * around them, distinct from `wordScale` (which only ever touches the main
   * word glyph). Used by `card.pairs` in the 3+-row compact case — see
   * `wordBlockHeight()` — to buy back vertical room; never set for
   * `card.words` (those cells are floor-protected via `frameHeight` instead).
   */
  cellScale?: number;
}> = ({
  word,
  height,
  speech,
  dim = 0,
  wordScale = 1,
  wrap = false,
  frameHeight,
  cellScale = 1,
}) => {
  const emphasis = useSpeechEmphasis(speech);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: height * 0.012 * cellScale,
        transform: `scale(${speechScale(emphasis)})`,
        opacity: 1 - (1 - CARD.dimOpacity) * dim,
      }}
    >
      <div
        style={{
          fontFamily: FONT_EN,
          fontSize: height * CARD.wordSizePct * wordScale,
          fontWeight: 900,
          color: mixHexColors(COLORS.text, COLORS.accent, emphasis),
          whiteSpace: wrap ? "pre-line" : "nowrap",
          textAlign: "center",
          lineHeight: wrap ? 1.1 : undefined,
        }}
      >
        {wrap ? splitWordForWrap(word) : word.word}
      </div>
      <SyllableRow
        cells={word.syllables}
        stressIndex={word.stressIndex}
        fontSize={
          frameHeight !== undefined
            ? Math.max(
                frameHeight * MOBILE_MIN_FONT_SIZE.syllable,
                height * CARD.cellSizePct,
              )
            : height * CARD.cellSizePct * cellScale
        }
        fontFamily={FONT_EN}
        emphasis={emphasis}
      />
      {word.pronCells && (
        <SyllableRow
          cells={word.pronCells}
          stressIndex={word.pronStressIndex}
          diffIndex={word.pronDiffIndex}
          fontSize={
            frameHeight !== undefined
              ? Math.max(
                  frameHeight * MOBILE_MIN_FONT_SIZE.pronunciation,
                  height * CARD.pronCellSizePct,
                )
              : height * CARD.pronCellSizePct * cellScale
          }
          fontFamily={FONT_KO}
          emphasis={emphasis}
        />
      )}
    </div>
  );
};

const Panel: React.FC<{
  children: React.ReactNode;
  color: string;
  height: number;
  /** Shrinks vertical padding only, to buy back room — see CARD.pairCompactPct. */
  compact?: boolean;
  /** Caps panel width so a wrapped word wraps inside its own column instead of stretching the row. */
  maxWidth?: number;
  /**
   * Padding override, as fractions of `height`. Word panels need
   * `panelPadXPct`'s tight padding to fit 3 per row; a prose box (one wide
   * paragraph, not a row of panels) doesn't share that constraint and reads
   * as cramped at the same padding — see `CARD.boxPadXPct`/`boxPadYPct`.
   */
  padXPct?: number;
  padYPct?: number;
}> = ({
  children,
  color,
  height,
  compact = false,
  maxWidth,
  padXPct = CARD.panelPadXPct,
  padYPct = 0.022,
}) => (
  <div
    style={{
      border: `${CARD.cardBorderWidth}px solid ${color}55`,
      borderRadius: CARD.cardRadius * 0.7,
      padding: `${height * padYPct * (compact ? CARD.pairCompactPct : 1)}px ${height * padXPct}px`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: height * 0.014,
      maxWidth,
    }}
  >
    {children}
  </div>
);

const PairRow: React.FC<{
  pair: CardPair;
  height: number;
  color: string;
  speechFor: (word: string) => SpeechWindow | undefined;
  dimFor: (word: string) => number;
  wordScale: number;
  compact?: boolean;
}> = ({
  pair,
  height,
  color,
  speechFor,
  dimFor,
  wordScale,
  compact = false,
}) => {
  const cellScale = compact ? CARD.pairCompactPct : 1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: height * 0.03,
      }}
    >
      <Panel color={color} height={height} compact={compact}>
        <WordBlock
          word={pair.from}
          height={height}
          wordScale={wordScale}
          cellScale={cellScale}
          speech={speechFor(pair.from.word)}
          dim={dimFor(pair.from.word)}
        />
      </Panel>
      <span style={{ color: COLORS.accent, fontSize: height * 0.04 }}>→</span>
      <Panel color={color} height={height} compact={compact}>
        <WordBlock
          word={pair.to}
          height={height}
          wordScale={wordScale}
          cellScale={cellScale}
          speech={speechFor(pair.to.word)}
          dim={dimFor(pair.to.word)}
        />
      </Panel>
    </div>
  );
};

/**
 * Rough height of the card body in composition-height units, used to shrink
 * dense scenes so nothing is clipped. The card is a fixed-height box, so a
 * three-pair scene has to render smaller than a one-pair scene.
 */
/**
 * Eight offset shadows in the frame colour, which reads as an even outline.
 * `text-shadow` rather than `-webkit-text-stroke`: the stroke property is
 * centred on the glyph edge, so it eats inward and thins Korean strokes that
 * are already dense at subtitle sizes.
 */
const subtitleOutline = (radius: number) => {
  const d = radius.toFixed(2);
  const c = (radius * 0.7071).toFixed(2);
  return [
    `${d}px 0 0`,
    `-${d}px 0 0`,
    `0 ${d}px 0`,
    `0 -${d}px 0`,
    `${c}px ${c}px 0`,
    `${c}px -${c}px 0`,
    `-${c}px ${c}px 0`,
    `-${c}px -${c}px 0`,
  ]
    .map((offset) => `${offset} ${CARD.background}`)
    .join(", ");
};

/**
 * Height of one word panel: the word's line box, both syllable rows, the gaps
 * between them, and the panel's own padding plus the gap that follows it.
 *
 * Derived from the tokens rather than a magic number, because it is what
 * decides whether a card clips: raising `wordSizePct` without raising this
 * would leave the estimate short and the panel would grow past the card.
 */
/**
 * `compact` shrinks only the trailing chrome term (panel padding + the gap
 * after the block) — never the word/syllable text, which the min-size floors
 * protect. Used for 3+ stacked compare pairs; see CARD.pairCompactPct.
 */
const wordBlockHeight = (compact = false) => {
  const wordGlyph = CARD.wordSizePct * 1.2;
  // Syllable/pronunciation cells + the two 0.012 gaps inside the block +
  // panel padding and the gap after it. For 3+ stacked pairs, `compact`
  // scales this whole "supporting" bundle down together (see CARD.cellScale
  // in WordBlock/PairRow) — not just the panel-padding tail as before —
  // because with `cellSizePct`/`pronCellSizePct` now bigger (their own
  // mobile-minimum floors), leaving cells at full size here left no room for
  // the word-glyph floor to fit 3 rows. The word glyph itself is never
  // scaled by `compact`; only `wordScale`'s own floor logic touches it.
  const supporting =
    (CARD.cellSizePct + CARD.pronCellSizePct) * 1.35 + 0.024 + 0.068;
  return wordGlyph + supporting * (compact ? CARD.pairCompactPct : 1);
};

/**
 * Whether card.words needs to wrap to a second line once wordListMinSizePct's
 * floor is applied, and the per-panel width budget once it does.
 *
 * Deliberately independent of `fit`: whenever the floor engages, the render
 * font is always `frameHeight * wordListMinSizePct` (see CardBody — `fit`
 * cancels algebraically out of `frameHeight * fit * wordSizePct * wordScale`
 * once `wordScale = floorPct / (fit * wordSizePct)`), so this only needs
 * `frameHeight` and the row's own chrome, never the fit-scaled local height.
 */
/**
 * Gap between word panels. Two-panel rows get the roomier value — see
 * CARD.panelGapWidePct. Used by the render *and* by both width-fitting
 * helpers, which have to subtract exactly the gap that gets painted.
 */
const panelGapPctFor = (panels: number) =>
  panels <= 2 ? CARD.panelGapWidePct : CARD.panelGapPct;

const wordsWrapInfo = (
  words: CardWord[],
  frameHeight: number,
  bodyWidth: number,
) => {
  const floorFontPx = frameHeight * CARD.wordListMinSizePct;
  const charWidthPx = floorFontPx * CARD.wordCharWidthRatio;
  const panels = words.length;
  const panelPadding =
    frameHeight * CARD.panelPadXPct * 2 + CARD.cardBorderWidth * 2;
  const chrome =
    panels * panelPadding + (panels - 1) * frameHeight * panelGapPctFor(panels);
  // Text-only width available per panel.
  const textWidthCap = (bodyWidth - chrome) / panels;
  // The Panel box itself (border-box, per Tailwind's preflight, so padding is
  // included) needs its own budget added back so it doesn't re-shrink the
  // text area it was already excluded from.
  const panelBoxMaxWidth = textWidthCap + panelPadding;
  const anyWraps = words.some(
    (w) => w.word.length * charWidthPx > textWidthCap,
  );
  return { anyWraps, textWidthCap, panelBoxMaxWidth };
};

/**
 * Real (not guessed) line count for `text` word-wrapped at `fontSizePx`
 * within `maxBoxWidth`, using @remotion/layout-utils' actual font-metrics
 * measurement. This replaced a character-width heuristic
 * (`charWidth = fontSizePx * 0.95`) that under-counted a long caption's wrap
 * on a real render, so its reserved height fell short of what it actually
 * needed — the direct cause of a card clipping its own caption below the
 * frame. `fillTextBox` is fed one space-delimited word at a time and reports
 * whenever a word lands on a new line.
 */
const measureLineCount = (
  text: string,
  fontSizePx: number,
  maxBoxWidth: number,
) => {
  const box = fillTextBox({ maxBoxWidth, maxLines: 99 });
  let lines = 1;
  for (const word of text.split(" ")) {
    const { newLine } = box.add({
      text: `${word} `,
      fontFamily: FONT_KO,
      fontWeight: 700,
      fontSize: fontSizePx,
    });
    if (newLine) lines++;
  }
  return lines;
};

/**
 * Height of a prose block (`card.lines`/`card.box`/`card.note`/
 * `card.caption`), in frame-height fractions. Each entry may itself contain
 * hand-authored "\n" breaks (note/points do); `measureLineCount` then checks
 * whether any of *those* sub-lines is long enough to wrap again on its own —
 * which is new now that these blocks render at `CARD.proseMaxWidthPct` of
 * the body rather than shrink-wrapping to content (see the CardBody JSX).
 * Both call sites must use the same width, or the measurement and the render
 * disagree and a block clips again exactly like the caption bug this fixed.
 */
const proseBlockFrac = (
  entries: string[],
  fontSizePct: number,
  lineHeight: number,
  frameHeight: number,
  bodyWidth: number,
  /** Override for blocks with their own padding eating into the width (box) — see boxTextWidth(). */
  maxWidthOverride?: number,
) => {
  const fontSizePx = frameHeight * fontSizePct;
  const maxWidth = maxWidthOverride ?? bodyWidth * CARD.proseMaxWidthPct;
  const totalLines = entries.reduce(
    (n, entry) =>
      n +
      entry
        .split("\n")
        .reduce((m, sub) => m + measureLineCount(sub, fontSizePx, maxWidth), 0),
    0,
  );
  return totalLines * (fontSizePct * lineHeight);
};

/**
 * Usable text width inside `card.box`, after its own (more generous)
 * horizontal padding eats into `proseMaxWidthPct`'s cap. Shared by the
 * height estimate and the render's per-line `maxWidth` — they must agree, or
 * the box wraps to more lines than its reservation accounted for.
 */
const boxTextWidth = (frameHeight: number, bodyWidth: number) =>
  bodyWidth * CARD.proseMaxWidthPct - 2 * frameHeight * CARD.boxPadXPct;

/**
 * `card.box`'s own chrome — its vertical padding (both sides) plus a
 * trailing allowance for its border and the gap after it — as a frame-height
 * fraction. Derived from `boxPadYPct` rather than a flat guess, because a
 * flat "0.06" was calibrated for the *word panel's* padding (0.022) that box
 * used to share; once box got its own roomier `boxPadYPct` (0.032), the flat
 * figure silently under-reserved by the difference and let the box's real
 * rendered height run past what the layout had budgeted for it — the box
 * itself never visibly overflowed (nothing checks that in isolation), but it
 * pushed the next block (a caption, in EP6 scene 8) past the card's bottom
 * edge. The 0.016 residual is the border + trailing-gap allowance the old
 * flat figure implied (0.06 - 2*0.022).
 */
const boxChromeFrac = () => 2 * CARD.boxPadYPct + 0.016;

/**
 * How far the word size has to come down for the widest row to fit across the
 * card. `wordSizePct` is a cap chosen for phone legibility; a row of three
 * panels physically cannot honour it, so the whole card steps down together —
 * per-row sizes would make identical words look different sizes on one screen.
 *
 * Returns 1 when everything already fits.
 */
const fitWordScale = (card: SceneCard, height: number, availWidth: number) => {
  const rows: { chars: number; panels: number; pair: boolean }[] = [];
  if (card.words) {
    rows.push({
      chars: card.words.reduce((n, w) => n + w.word.length, 0),
      panels: card.words.length,
      pair: false,
    });
  }
  for (const pair of card.pairs ?? []) {
    rows.push({
      chars: pair.from.word.length + pair.to.word.length,
      panels: 2,
      pair: true,
    });
  }

  let scale = 1;
  for (const row of rows) {
    // Everything on the row that does not scale with the word: panel padding
    // and borders, the gaps between panels, and a pair row's arrow.
    const chrome =
      row.panels * (height * CARD.panelPadXPct * 2 + CARD.cardBorderWidth * 2) +
      (row.pair
        ? height * 0.03 * 2 + height * 0.04 * 1.3
        : (row.panels - 1) * height * panelGapPctFor(row.panels));
    const textWidth =
      row.chars * height * CARD.wordSizePct * CARD.wordCharWidthRatio;
    if (textWidth <= 0) continue;
    scale = Math.min(scale, (availWidth - chrome) / textWidth);
  }
  return Math.max(0, Math.min(1, scale));
};

/** Total line count across every points entry (each may hold "\n"s). Points
 * are short bullet phrases next to a number circle, not full-width prose, so
 * they keep the simpler "\n"-count-only assumption rather than
 * `proseBlockFrac`'s real wrap measurement — re-measuring against a width
 * that must also exclude the number circle risks a new mismatch for little
 * benefit, since a points entry is hand-authored short. */
const totalLines = (entries: string[]) =>
  entries.reduce((n, entry) => n + entry.split("\n").length, 0);

/**
 * Height of the wrapped chip rows, at the chips' floor size. Row-aware
 * rather than the old flat 0.1: with 10 chips the row count is what actually
 * drives the height, and the flat figure both over-reserved for short banks
 * and under-reserved for long ones.
 */
const chipsFrac = (chips: string[], frameHeight: number, bodyWidth: number) => {
  const fontPx = frameHeight * CARD.chipSizePct;
  // Chip box = glyphs (Inter-700 caps run ~0.62em) + horizontal padding + gap.
  const chipPx = (chars: number) =>
    chars * fontPx * 0.62 + frameHeight * 0.028 + frameHeight * 0.012;
  // The chip container is capped at 72% of the body width (see the render).
  const rowWidth = bodyWidth * 0.72;
  let rows = 1;
  let used = 0;
  for (const chip of chips) {
    const w = chipPx(chip.length);
    if (used + w > rowWidth && used > 0) {
      rows += 1;
      used = w;
    } else {
      used += w;
    }
  }
  // Each row: text line box + vertical padding, plus the inter-row gap.
  return rows * (CARD.chipSizePct * 1.35 + 0.014) + (rows - 1) * 0.012;
};

const estimateBodyHeight = (
  card: SceneCard,
  frameHeight: number,
  bodyWidth: number,
  compact = false,
) => {
  // The figures below cover each block's own content. The flex gaps *between*
  // blocks are added at the end — they scale with `fit` exactly like the
  // content does, and leaving them out is what let a grown prose card
  // (3 blocks x a 1.3 grow factor) run past the band and clip.
  let blocks = 0;
  let h = 0;
  if (card.heading) {
    blocks++;
    h += 0.06;
  }
  if (card.lines) {
    blocks++;
    h += proseBlockFrac(
      card.lines,
      CARD.bodySizePct,
      CARD.proseLineHeight,
      frameHeight,
      bodyWidth,
    );
  }
  if (card.box) {
    blocks++;
    h +=
      proseBlockFrac(
        card.box,
        CARD.boxRestSizePct,
        CARD.proseLineHeight,
        frameHeight,
        bodyWidth,
        boxTextWidth(frameHeight, bodyWidth),
      ) + boxChromeFrac();
  }
  if (card.pairs) {
    blocks++;
    h += card.pairs.length * wordBlockHeight(compact);
  }
  if (card.words) {
    blocks++;
    h += wordBlockHeight();
    if (wordsWrapInfo(card.words, frameHeight, bodyWidth).anyWraps) {
      // One more floor-sized line for the wrapped word.
      h += CARD.wordListMinSizePct * 1.2;
    }
  }
  if (card.flow) {
    blocks++;
    // Tallest stage decides the row: label lines (stages are hand-broken with
    // "\n") plus the icon and its gap, but only for stages that have one —
    // EP7-9's flows are label-only, and reserving icon height for them left
    // the row floating in space it never used.
    const labelLines = Math.max(
      ...card.flow.map((s) => s.label.split("\n").length),
    );
    const hasIcon = card.flow.some((s) => s.icon);
    h +=
      (hasIcon ? CARD.flowIconSizePct + CARD.flowIconGapPct : 0) +
      CARD.bodySizePct * 1.35 * labelLines +
      0.02;
  }
  if (card.points) {
    blocks++;
    // Line-count aware, not a flat per-item guess: points range from 2 to 3
    // lines each in practice, and a flat estimate under/over-shoots badly
    // once the mobile-minimum floor makes every line a fixed, non-shrinking
    // size (see the protected/flexible split in CardBody).
    h += totalLines(card.points) * (CARD.noteSizePct * CARD.summaryLineHeight);
    h += (card.points.length - 1) * CARD.summaryGapPct;
  }
  if (card.chips) {
    blocks++;
    h += chipsFrac(card.chips, frameHeight, bodyWidth);
  }
  if (card.note) {
    blocks++;
    h += proseBlockFrac(
      [card.note],
      CARD.noteSizePct,
      CARD.proseLineHeight,
      frameHeight,
      bodyWidth,
    );
  }
  if (card.caption) {
    blocks++;
    h += proseBlockFrac(
      [card.caption],
      CARD.captionSizePct,
      CARD.proseLineHeight,
      frameHeight,
      bodyWidth,
    );
  }
  // Mirrors CardBody's own container `gap`.
  h += Math.max(blocks - 1, 0) * 0.022 * (compact ? CARD.pairCompactPct : 1);
  return h;
};

/**
 * The portion of `estimateBodyHeight` that gets floor-clamped at render time
 * (never shrinks below its own mobile-minimum, regardless of `fit`) — see the
 * `MOBILE_MIN_FONT_SIZE`-driven clamps in CardBody's JSX below.
 *
 * `card.pairs` is deliberately excluded: with 3+ stacked pairs, protecting
 * the word-glyph floor (`compareMinSizePct`) already claims the card's whole
 * vertical budget on its own — the minimum content height (word + syllable +
 * pronunciation, at both floors, times 3 rows) already exceeds the card's
 * fixed zone even with zero chrome, so also flooring the pair's syllable/
 * pronunciation cells is mathematically impossible to satisfy at the same
 * time. Those cells keep scaling with `fit` as before this pass, just from a
 * bigger base (`cellSizePct`/`pronCellSizePct` were both raised too).
 *
 * Without this split, `fit` would be computed as if protected content still
 * shrunk with it, and at render time it wouldn't — overflowing the card by
 * exactly the amount that content "should" have shrunk. Splitting the budget
 * up front makes `fit` solve for the truly flexible remainder instead.
 */
const protectedBodyHeight = (
  card: SceneCard,
  frameHeight: number,
  bodyWidth: number,
) => {
  let p = 0;
  if (card.heading) p += 0.06;
  if (card.lines) {
    p += proseBlockFrac(
      card.lines,
      CARD.bodySizePct,
      CARD.proseLineHeight,
      frameHeight,
      bodyWidth,
    );
  }
  if (card.box) {
    p += proseBlockFrac(
      card.box,
      CARD.boxRestSizePct,
      CARD.proseLineHeight,
      frameHeight,
      bodyWidth,
      boxTextWidth(frameHeight, bodyWidth),
    );
  }
  if (card.words) p += (CARD.cellSizePct + CARD.pronCellSizePct) * 1.35;
  if (card.points) {
    p += totalLines(card.points) * (CARD.noteSizePct * CARD.summaryLineHeight);
    p += (card.points.length - 1) * CARD.summaryGapPct;
  }
  if (card.chips) p += chipsFrac(card.chips, frameHeight, bodyWidth);
  if (card.note) {
    p += proseBlockFrac(
      [card.note],
      CARD.noteSizePct,
      CARD.proseLineHeight,
      frameHeight,
      bodyWidth,
    );
  }
  if (card.caption) {
    p += proseBlockFrac(
      [card.caption],
      CARD.captionSizePct,
      CARD.proseLineHeight,
      frameHeight,
      bodyWidth,
    );
  }
  return p;
};

/**
 * Body height budget inside the card, for a given inner padding.
 *
 * NOTE: `card.pairs`' 3+-row escalation path (see the `requiredWordScale > 1`
 * branch in CardBody) sets `fit` to a fixed value derived purely from
 * `compareMinSizePct`/`wordSizePct` — once triggered, it no longer responds
 * to `available` at all. So this margin only ever helps *non-escalated*
 * cards (tightening it shrinks their `fit`, which is what buys room back);
 * for an escalated card, tightening it only shrinks the budget the fixed
 * `fit` has to land inside, making things worse. Don't "fix" an overflow by
 * tuning this without checking whether the scene in question escalates.
 */
const availableBodyHeight = (padPct: number, marginRelaxed: boolean) =>
  (CARD.cardZonePct - padPct * 2 - CARD.cardHeaderPct) *
  (marginRelaxed ? 0.98 : 0.92);

/**
 * Inner padding for this card: the tighter `densePaddingPct` when the
 * floor-protected content alone wouldn't otherwise fit the default padding's
 * budget, so the protected elements can all stay at their mobile minimums
 * rather than one of them being squeezed out. Both CardScene (which paints
 * the padding) and CardBody (which budgets against it) call this, so the two
 * can't disagree.
 */
const cardPadPctFor = (
  card: SceneCard,
  frameHeight: number,
  bodyWidth: number,
) => {
  const protectedFrac = protectedBodyHeight(card, frameHeight, bodyWidth);
  return protectedFrac > availableBodyHeight(CARD.cardPaddingPct, true)
    ? CARD.densePaddingPct
    : CARD.cardPaddingPct;
};

/**
 * One block of the card body, entering on its own beat so the card builds
 * itself instead of arriving as a single static slide. `index` is the
 * block's position among the blocks this card actually renders (see
 * `blockOrder` in CardBody) — not a fixed slot per field, or a card that
 * skips early fields would sit waiting through their empty stagger slots.
 */
const CardBlock: React.FC<{
  index: number;
  /** Shown in the Studio's element tree — see the Interactive.Div below. */
  name: string;
  children: React.ReactNode;
}> = ({ index, name, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - index * CARD.blockStaggerSec * fps;
  const enter = CARD.blockEnterSec * fps;

  return (
    <Interactive.Div
      name={name}
      style={{
        // Full width, and centring its own child, so this wrapper is
        // layout-transparent: CardBody already centres its children, and a
        // shrink-to-fit wrapper silently changed two things — a child's `%`
        // width resolved against the wrapper's content width instead of the
        // body's (which left the chips row measured off a narrower box), and
        // a child narrower than the wrapper sat at its left edge instead of
        // centred. Both showed up as the chip row drifting off-centre.
        width: "100%",

        display: "flex",
        flexDirection: "column",
        alignItems: "center",

        opacity: interpolate(local, [0, enter], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),

        translate: interpolate(
          local,
          [0, enter],
          [`0px ${CARD.blockRisePx}px`, "0px 0px"],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        ),
      }}
    >
      {children}
    </Interactive.Div>
  );
};

/** Body fields in render order; the ones present decide each block's beat. */
const BLOCK_ORDER = [
  "heading",
  "lines",
  "box",
  "pairs",
  "words",
  "flow",
  "points",
  "chips",
  "note",
  "caption",
] as const;

const CardBody: React.FC<{
  card: SceneCard;
  height: number;
  /** Usable width inside the card, after side padding and card padding. */
  bodyWidth: number;
  speechFor: (word: string) => SpeechWindow | undefined;
  dimFor: (word: string) => number;
}> = ({ card, height: frameHeight, bodyWidth, speechFor, dimFor }) => {
  const color = categoryColor(card.category);

  // 3+ stacked pair rows get tighter chrome (CARD.pairCompactPct) so raising
  // `fit` to hit compareMinSizePct below still fits the fixed card height.
  // card.words combined with prose (lines/box/note/points) gets the same
  // tighter outer gap, for the same reason: protectedBodyHeight() below no
  // longer shrinks with `fit`, so the flexible remainder needs to give up a
  // bit more room than usual.
  const compact =
    (!!card.pairs && card.pairs.length >= 3) ||
    (!!card.words &&
      (!!card.lines || !!card.box || !!card.note || !!card.points));
  // Any card carrying floor-protected prose gets the relaxed 0.98 margin
  // (vs the default 0.92) — safe to apply broadly, since it only ever gives
  // `fit` more room than the plain margin would (see the derivation in
  // theme.ts's pairCompactPct comment).
  const marginRelaxed =
    compact || !!card.lines || !!card.box || !!card.note || !!card.points;

  // Available body height inside the card, in the same units as the estimate:
  // card zone minus its vertical padding and the badge/timecode header. The
  // padding matches what CardScene actually paints — see cardPadPctFor().
  const available = availableBodyHeight(
    cardPadPctFor(card, frameHeight, bodyWidth),
    marginRelaxed,
  );
  const estimate = estimateBodyHeight(card, frameHeight, bodyWidth, compact);
  // `fit` solves only for the *flexible* remainder — see protectedBodyHeight().
  const protectedFrac = protectedBodyHeight(card, frameHeight, bodyWidth);
  const flexibleFrac = Math.max(estimate - protectedFrac, 0.0001);
  let fit = Math.min(
    1,
    Math.max(available - protectedFrac, 0.0001) / flexibleFrac,
  );

  // A sparse prose/flow card leaves the band half empty at fit 1, so let it
  // grow into the space. Only when there are no word panels — see
  // CARD.maxGrowFit for why growth backfires on those. Above fit 1 every
  // floor clamp is slack (height*pct already exceeds it), so the whole body
  // scales uniformly and the budget is simply `estimate * fit <= available`.
  if (fit >= 1 && !card.words && !card.pairs) {
    let grow = Math.min(
      CARD.maxGrowFit,
      available / Math.max(estimate, 0.0001),
    );
    // Re-measure at the grown size: a bigger caption can take an extra line,
    // which the pre-growth estimate didn't budget for.
    while (
      grow > 1 &&
      estimateBodyHeight(card, frameHeight * grow, bodyWidth, compact) * grow >
        available
    ) {
      grow -= 0.05;
    }
    fit = Math.max(1, grow);
  }

  // Floor: card.pairs rows (arrow-linked compare pairs) get compareMinSizePct;
  // card.words rows (wordList, or a 2-up compare) get wordListMinSizePct.
  // Neither fitWordScale() nor `fit` has a floor on its own, so a dense card
  // can otherwise shrink word text past legibility.
  const floorPct = card.pairs
    ? CARD.compareMinSizePct
    : card.words
      ? CARD.wordListMinSizePct
      : undefined;
  let requiredWordScale =
    floorPct !== undefined ? floorPct / (fit * CARD.wordSizePct) : 0;
  if (floorPct !== undefined && requiredWordScale > 1) {
    // Raising wordScale to its ceiling of 1 still isn't enough — fit itself
    // must rise. The only path that can affect it: card.pairs rows already
    // sit at wordScale 1 before the floor (see the fitWordScale check for
    // scene 6 in CLAUDE.md/plan notes), so wordScale alone can never reach
    // compareMinSizePct.
    fit = floorPct / CARD.wordSizePct;
    requiredWordScale = 1;
  }

  // The factor scales the *sizes* rather than applying a CSS transform, so
  // the laid-out height genuinely shrinks — a transform would leave the box
  // full-height and still overflow the fixed-height card.
  const height = frameHeight * fit;
  const gap = height * 0.022 * (compact ? CARD.pairCompactPct : 1);
  // Height is settled first, then width: the vertical fit above is computed
  // against the word *cap*, so it is conservative and shrinking further for
  // width can never make the card clip vertically.
  const naturalWordScale = fitWordScale(card, height, bodyWidth);
  const wordScale = Math.max(naturalWordScale, requiredWordScale);
  // True only when the floor pushed wordScale above what naturally fit the
  // row's width — i.e. the words now need to wrap instead of overflowing.
  const wrapInfo =
    card.words && requiredWordScale > naturalWordScale
      ? wordsWrapInfo(card.words, frameHeight, bodyWidth)
      : null;

  // Entrance beat per block, counted only over the blocks this card actually
  // has — see CardBlock.
  const beat: Partial<Record<(typeof BLOCK_ORDER)[number], number>> = {};
  let beatCount = 0;
  for (const field of BLOCK_ORDER) {
    if (card[field]) beat[field] = beatCount++;
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap,
        width: "100%",
      }}
    >
      {card.heading && (
        <CardBlock index={beat.heading!} name="Heading">
          <div
            style={{
              fontFamily: FONT_KO,
              fontSize: Math.max(
                frameHeight * MOBILE_MIN_FONT_SIZE.description,
                height * CARD.bodySizePct,
              ),
              fontWeight: 700,
              color: COLORS.text,
              textAlign: "center",
            }}
          >
            {card.heading}
          </div>
        </CardBlock>
      )}

      {card.lines && (
        <CardBlock index={beat.lines!} name="Lines">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {card.lines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: FONT_KO,
                  fontSize: Math.max(
                    frameHeight * MOBILE_MIN_FONT_SIZE.description,
                    height * CARD.bodySizePct,
                  ),
                  fontWeight: 700,
                  color: COLORS.text,
                  textAlign: "center",
                  lineHeight: CARD.proseLineHeight,
                  // A flex column with alignItems:"center" doesn't stretch
                  // children to its own width, so each line needs its own cap
                  // to actually wrap where proseBlockFrac() measured it wrapping.
                  maxWidth: bodyWidth * CARD.proseMaxWidthPct,
                }}
              >
                {line}
              </div>
            ))}
          </div>
        </CardBlock>
      )}

      {card.box && (
        <CardBlock index={beat.box!} name="Rule box">
          <Panel
            color={color}
            height={height}
            padXPct={CARD.boxPadXPct}
            padYPct={CARD.boxPadYPct}
            maxWidth={bodyWidth * CARD.proseMaxWidthPct}
          >
            {card.box.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: FONT_KO,
                  // Fully protected at its own resting size — see
                  // protectedBodyHeight()'s comment on why this never shrinks
                  // with `fit` the way the plain `bodySizePct` floor does.
                  fontSize: frameHeight * CARD.boxRestSizePct,
                  fontWeight: 700,
                  color:
                    i === card.box!.length - 1 ? COLORS.accent : COLORS.text,
                  textAlign: "center",
                  lineHeight: CARD.proseLineHeight,
                  maxWidth: boxTextWidth(frameHeight, bodyWidth),
                }}
              >
                {line}
              </div>
            ))}
          </Panel>
        </CardBlock>
      )}

      {card.pairs && (
        <CardBlock index={beat.pairs!} name="Word pairs">
          <div
            style={{ display: "flex", flexDirection: "column", gap: gap * 0.8 }}
          >
            {card.pairs.map((pair, i) => (
              <PairRow
                key={i}
                pair={pair}
                height={height}
                color={color}
                wordScale={wordScale}
                compact={compact}
                speechFor={speechFor}
                dimFor={dimFor}
              />
            ))}
          </div>
        </CardBlock>
      )}

      {card.words && (
        <CardBlock index={beat.words!} name="Word panels">
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              justifyContent: "center",
              gap: height * panelGapPctFor(card.words.length),
            }}
          >
            {card.words.map((word, i) => (
              <Panel
                key={i}
                color={color}
                height={height}
                compact={compact}
                maxWidth={wrapInfo?.panelBoxMaxWidth}
              >
                <WordBlock
                  word={word}
                  height={height}
                  frameHeight={frameHeight}
                  wordScale={wordScale}
                  wrap={!!wrapInfo}
                  speech={speechFor(word.word)}
                  dim={dimFor(word.word)}
                />
              </Panel>
            ))}
          </div>
        </CardBlock>
      )}

      {card.flow && (
        <CardBlock index={beat.flow!} name="Flow stages">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: height * 0.03,
            }}
          >
            {card.flow.map((stage, i) => {
              // Label-only when the stage names something a landmark can't
              // stand for — see FlowStage in types.ts.
              const Icon = stage.icon ? FLOW_ICONS[stage.icon] : null;
              return (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <ArrowGlyph
                      size={height * CARD.flowArrowSizePct}
                      color={COLORS.accent}
                      strokeWidth={2.2}
                    />
                  )}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: height * CARD.flowIconGapPct,
                    }}
                  >
                    {Icon && (
                      <Icon
                        size={height * CARD.flowIconSizePct}
                        color={color}
                      />
                    )}
                    <div
                      style={{
                        fontFamily: FONT_KO,
                        fontSize: Math.max(
                          frameHeight * MOBILE_MIN_FONT_SIZE.description,
                          height * CARD.bodySizePct,
                        ),
                        fontWeight: 700,
                        color: COLORS.text,
                        textAlign: "center",
                        whiteSpace: "pre-line",
                        lineHeight: 1.35,
                      }}
                    >
                      {stage.label}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </CardBlock>
      )}

      {card.points && (
        <CardBlock index={beat.points!} name="Summary points">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: height * CARD.summaryGapPct,
            }}
          >
            {card.points.map((point, i) => {
              const pointFontSize = Math.max(
                frameHeight * MOBILE_MIN_FONT_SIZE.summaryItem,
                height * CARD.noteSizePct,
              );
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: height * 0.016,
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      flexShrink: 0,
                      width: pointFontSize * 0.8,
                      height: pointFontSize * 0.8,
                      borderRadius: "50%",
                      border: `2px solid ${color}`,
                      color,
                      fontFamily: FONT_KO,
                      fontSize: pointFontSize * 0.45,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      fontFamily: FONT_KO,
                      fontSize: pointFontSize,
                      fontWeight: 500,
                      color: COLORS.text,
                      whiteSpace: "pre-line",
                      lineHeight: CARD.summaryLineHeight,
                    }}
                  >
                    {point}
                  </span>
                </div>
              );
            })}
          </div>
        </CardBlock>
      )}

      {card.chips && (
        <CardBlock index={beat.chips!} name="Word chips">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: height * 0.012,
              maxWidth: "72%",
            }}
          >
            {card.chips.map((chip) => (
              <span
                key={chip}
                style={{
                  fontFamily: FONT_EN,
                  fontSize: Math.max(
                    frameHeight * MOBILE_MIN_FONT_SIZE.chip,
                    height * CARD.chipSizePct,
                  ),
                  fontWeight: 700,
                  color: COLORS.text,
                  border: `1px solid ${COLORS.muted}66`,
                  borderRadius: 8,
                  padding: `${height * 0.007}px ${height * 0.014}px`,
                }}
              >
                {chip}
              </span>
            ))}
          </div>
        </CardBlock>
      )}

      {card.note && (
        <CardBlock index={beat.note!} name="Note">
          <div
            style={{
              fontFamily: FONT_KO,
              fontSize: Math.max(
                frameHeight * MOBILE_MIN_FONT_SIZE.summaryItem,
                height * CARD.noteSizePct,
              ),
              fontWeight: 500,
              color: COLORS.muted,
              textAlign: "center",
              whiteSpace: "pre-line",
              lineHeight: CARD.proseLineHeight,
              maxWidth: bodyWidth * CARD.proseMaxWidthPct,
            }}
          >
            {card.note}
          </div>
        </CardBlock>
      )}

      {card.caption && (
        <CardBlock index={beat.caption!} name="Caption">
          <div
            style={{
              fontFamily: FONT_KO,
              fontSize: Math.max(
                frameHeight * MOBILE_MIN_FONT_SIZE.description,
                height * CARD.captionSizePct,
              ),
              fontWeight: 700,
              color: COLORS.accent,
              textAlign: "center",
              maxWidth: bodyWidth * CARD.proseMaxWidthPct,
            }}
          >
            {card.caption}
          </div>
        </CardBlock>
      )}
    </div>
  );
};

const ProgressDots: React.FC<{
  total: number;
  current: number;
  color: string;
}> = ({ total, current, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: CARD.dotGap }}>
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        style={{
          width: CARD.dotSize,
          height: CARD.dotSize,
          borderRadius: "50%",
          backgroundColor: i <= current ? color : "transparent",
          border: `1.5px solid ${i <= current ? color : `${COLORS.muted}77`}`,
        }}
      />
    ))}
  </div>
);

/**
 * Subtitle for the current frame. `subtitleGroups` are sentence-level and
 * gapless, so one is on screen at all times.
 */
const useCurrentSubtitle = (scene: Scene) => {
  const frame = useCurrentFrame();
  const cues = scene.subtitleGroups ?? [];
  const hit = cues.find((c) => frame >= c.from && frame <= c.to);
  if (hit) return hit;
  // Before the first cue starts, hold the first line rather than show nothing.
  return cues.length > 0 && frame < cues[0].from ? cues[0] : null;
};

/**
 * `card` motion style — the storyboard layout.
 *
 * The storyboard's "01 Scene 1" / "category: quiz" annotations are production
 * notes and are never drawn; only the badge and the timecode appear.
 */

/**
 * Closing card.
 *
 * YouTube draws its own end-screen elements over the last seconds of a video:
 * one card bottom-right and one top-centre, each about 300x170 at 1080p.
 * Anything we render there is simply covered, so the layout works *around*
 * those two rectangles rather than centring on the frame.
 *
 * There is no narration here — the scene holds the frame while the viewer
 * decides what to click.
 */
const EndScreen: React.FC<{
  card: SceneCard;
  episodeTitle: string;
  durationInFrames: number;
}> = ({ card, episodeTitle, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Fades up, holds, eases down as the video ends.
  const fade = Math.min(
    interpolate(frame, [0, ENDSCREEN.fadeInSec * fps], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(
      frame,
      [durationInFrames - ENDSCREEN.fadeOutSec * fps, durationInFrames],
      [1, ENDSCREEN.bgDimTarget],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );

  const left = width * ENDSCREEN.contentLeftPct;
  // Content must clear the bottom-right card, so the usable width stops before
  // it rather than running to the frame edge.
  const usableRight = width - ENDSCREEN.zoneW - ENDSCREEN.zoneMargin * 2;

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <div
        style={{
          position: "absolute",
          top: height * ENDSCREEN.badgeTopPct,
          left,
          fontFamily: FONT_KO,
          fontSize: height * ENDSCREEN.titleSizePct,
          fontWeight: 900,
          color: COLORS.text,
        }}
      >
        {episodeTitle}
      </div>

      <div
        style={{
          position: "absolute",
          top: height * ENDSCREEN.subscribeCentrePct,
          transform: "translateY(-50%)",
          left,
          maxWidth: usableRight - left,
          display: "flex",
          alignItems: "center",
          gap: height * 0.03,
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.diff,
            color: "#FFFFFF",
            fontFamily: FONT_KO,
            fontWeight: 900,
            fontSize: height * ENDSCREEN.subscribeBtnTextSizePct,
            borderRadius: SPACING.pillBorderRadius,
            padding: `${height * ENDSCREEN.subscribeBtnTextSizePct * ENDSCREEN.subscribeBtnPaddingYRatio}px ${height * ENDSCREEN.subscribeBtnTextSizePct * ENDSCREEN.subscribeBtnPaddingXRatio}px`,
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          구독
        </div>
        <span
          style={{
            fontFamily: FONT_KO,
            fontSize: height * ENDSCREEN.subscribeSizePct,
            fontWeight: 900,
            color: COLORS.text,
            wordBreak: "keep-all",
            lineHeight: 1.3,
            flex: 1,
            minWidth: 0,
          }}
        >
          {card.subscribe}
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: height * 0.12,
          left,
          maxWidth: usableRight - left,
        }}
      >
        <div
          style={{
            fontFamily: FONT_KO,
            fontSize: height * ENDSCREEN.playlistLabelSizePct,
            fontWeight: 700,
            color: COLORS.muted,
            marginBottom: height * 0.012,
          }}
        >
          {card.playlist}
        </div>
        <div
          style={{
            fontFamily: FONT_KO,
            fontSize: height * ENDSCREEN.playlistSizePct,
            fontWeight: 700,
            color: COLORS.accent,
            textShadow: EFFECTS.accentGlow,
            wordBreak: "keep-all",
          }}
        >
          {card.playlistUrl}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const CardScene: React.FC<{
  scene: Scene;
  index: number;
  total: number;
  episodeTitle: string;
  timecode: string;
}> = ({ scene, index, total, episodeTitle, timecode }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const card = scene.card;
  const subtitle = useCurrentSubtitle(scene);

  const topEntrance = useEntrance(0, { staticIdle: true });
  const cardEntrance = useEntrance(1, { staticIdle: true });

  // Card words carry no timings of their own; the whisper timestamps live on
  // `scene.words`, matched by the English spelling.
  const timedWords = scene.words ?? [];
  const highlightStates = useHighlightStates(timedWords);
  const indexOfWord = (word: string) =>
    timedWords.findIndex((w) => w.word.toUpperCase() === word.toUpperCase());
  const speechFor = (word: string): SpeechWindow | undefined => {
    const i = indexOfWord(word);
    return i === -1 ? undefined : timedWords[i];
  };
  const dimFor = (word: string) => {
    const i = indexOfWord(word);
    return i === -1 ? 0 : (highlightStates[i]?.dimness ?? 0);
  };

  if (!card) {
    return null;
  }

  if (card.category === "endscreen") {
    // No scene-level fade here: EndScreen runs its own fade in/out.
    return (
      <AbsoluteFill>
        <EndScreen
          card={card}
          episodeTitle={episodeTitle}
          durationInFrames={durationInFrames}
        />
      </AbsoluteFill>
    );
  }

  const color = categoryColor(card.category);
  const topH = height * CARD.topZonePct;
  const cardH = height * CARD.cardZonePct;
  const sideX = width * CARD.sidePaddingPct;
  // Dense cards get tighter inner padding so every floor-protected element
  // can stay at its mobile minimum; CardBody budgets against the same value.
  // The width fed to the density test uses the default padding — the test
  // only ever loosens padding, so a slightly narrow width is the safe side.
  const cardPadPct = cardPadPctFor(
    card,
    height,
    width - sideX * 2 - height * CARD.cardPaddingPct * 2,
  );
  const cardPad = height * cardPadPct;

  return (
    // No scene-level opacity fade. `TransitionSeries` already crossfades
    // between scenes, so fading the scene *again* from inside meant both
    // sides of a cut dipped twice — a visible grey sag through the middle of
    // every transition, and an entrance that fought the per-block stagger
    // below by fading the blocks in as they were already fading in.
    <AbsoluteFill>
      {/* ---- top bar (8%) ---- */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: sideX,
          right: sideX,
          height: topH,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          ...topEntrance.style,
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: height * 0.018 }}
        >
          <Interactive.Span
            name="Episode title"
            style={{
              fontFamily: FONT_KO,
              fontSize: height * CARD.titleSizePct,
              fontWeight: 900,
              color: COLORS.text,
            }}
          >
            {episodeTitle}
          </Interactive.Span>
          <Interactive.Span
            name="Top category pill"
            style={{
              fontFamily: FONT_KO,
              fontSize: height * CARD.topBadgeSizePct,
              fontWeight: 700,
              color,
              border: `1.5px solid ${color}`,
              borderRadius: 999,
              padding: CARD.badgePadding,
            }}
          >
            {card.badge}
          </Interactive.Span>
        </div>
        <ProgressDots total={total} current={index} color={color} />
      </div>
      {/* ---- content band (70%) — no border: see the CARD comment in theme.ts ---- */}
      <div
        style={{
          position: "absolute",
          top: topH,
          left: sideX,
          right: sideX,
          height: cardH,
          ...cardEntrance.style,
        }}
      >
        <div
          style={{
            position: "relative",
            height: "100%",
            padding: cardPad,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: height * 0.012,
            }}
          >
            <Interactive.Span
              name="Card badge"
              style={{
                fontFamily: FONT_KO,
                fontSize: height * CARD.cardBadgeSizePct,
                fontWeight: 700,
                color: "#0A0A0A",
                backgroundColor: color,
                borderRadius: 7,
                padding: CARD.badgePadding,
              }}
            >
              {card.badge}
            </Interactive.Span>
            <Interactive.Span
              name="Timecode"
              style={{
                fontFamily: FONT_EN,
                fontSize: height * CARD.timecodeSizePct,
                fontWeight: 700,
                color: COLORS.muted,
              }}
            >
              {timecode}
            </Interactive.Span>
          </div>
          <CardBody
            card={card}
            height={height}
            bodyWidth={width - sideX * 2 - cardPad * 2}
            speechFor={speechFor}
            dimFor={dimFor}
          />
        </div>
      </div>
      {/* ---- narration subtitle, centred low in the frame. Centred rather
             than top-anchored so a two-line cue grows both ways instead of
             marching toward the frame edge. ---- */}
      <div
        style={{
          position: "absolute",
          top: height * CARD.subtitleCentrePct,
          transform: "translateY(-50%)",
          left: sideX,
          right: sideX,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Interactive.Span
          name="Narration subtitle"
          // Keyed on the cue so React remounts the span each time the line
          // changes, restarting the entrance below. Without the key it is one
          // long-lived node whose text swaps silently and never re-animates.
          key={subtitle?.from ?? -1}
          style={{
            fontFamily: FONT_KO,
            fontSize: height * CARD.subtitleSizePct,
            fontWeight: 700,
            color: COLORS.text,
            textAlign: "center",
            lineHeight: CARD.subtitleLineHeight,
            minHeight: height * CARD.subtitleSizePct * CARD.subtitleLineHeight,
            // Painted behind the glyphs rather than with -webkit-text-stroke,
            // which eats into the letterforms and thins Korean strokes.
            textShadow: subtitleOutline(
              height * CARD.subtitleSizePct * CARD.subtitleStrokeRatio,
            ),
            // The one piece of motion locked to the narration's own clock:
            // each cue lands on the frame the line is actually spoken.
            opacity: interpolate(
              frame - (subtitle?.from ?? 0),
              [0, CARD.subtitleCueEnterSec * fps],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            ),
            translate: interpolate(
              frame - (subtitle?.from ?? 0),
              [0, CARD.subtitleCueEnterSec * fps],
              [`0px ${CARD.subtitleCueRisePx}px`, "0px 0px"],
              {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              },
            ),
          }}
        >
          {subtitle?.text ?? ""}
        </Interactive.Span>
      </div>
    </AbsoluteFill>
  );
};
