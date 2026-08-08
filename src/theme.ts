export const COLORS = {
  // Backgrounds are the two stops of the composition-level radial gradient:
  // `backgroundCenter` in the middle fading out to `background` at the edges.
  background: "#0A1526",
  backgroundCenter: "#12203A",
  text: "#FFFFFF",
  accent: "#F5C518",
  muted: "#9CA3AF",
  pointBorder: "#5B9BD5",
  exampleBorder: "#7DC242",
  diff: "#E84545",
} as const;

export const EFFECTS = {
  accentGlow: "0 0 12px rgba(245, 197, 24, 0.2)",
} as const;

export const LAYOUT = {
  width: 1920,
  height: 1080,
  fps: 30,
} as const;

// Most sizes are fractions of the composition height (or of a parent box height),
// so the design stays proportional at any resolution.
export const FONT_SIZES = {
  badge: 34,
  badgeLetterSpacing: 0.5,
  caption: 48,

  quizWord: 0.14,
  quizPronunciation: 0.05,
  quizArrow: 0.09,

  wordListWord: 0.34, // fraction of wordListBoxHeightPct
  wordListPronunciation: 0.26, // fraction of wordListBoxHeightPct
  wordListMeaning: 0.18, // fraction of wordListBoxHeightPct

  ruleBoxText: 0.06,
  ruleBoxLabel: 0.028,
  ruleBoxIcon: 0.035,

  compareStressWord: 0.075,
  compareSoundWord: 0.12,
  compareSoundContent: 0.035,
  compareVsRatio: 0.35, // "vs" glyph, relative to the compare word font size

  summaryLabel: 0.032,
  summaryItem: 0.045,
  summaryClosing: 0.06,
  summaryCheckIconRatio: 0.9, // fraction of summaryItem font size

  // Ratio below is relative to the CompareWord `fontSize` prop.
  // 0.4 base x 1.6 = 0.64.
  soundAnnotationRatio: 0.64,
} as const;

export const SPACING = {
  contentPaddingPct: 0.08,
  bannerHeightPct: 0.12,
  bannerSideMarginPct: 0.05,

  badgeTopOffset: 48,
  badgePadding: "20px 56px 20px 40px",
  badgeCornerSize: 28,

  pillBorderRadius: 999,

  wordListBoxHeightPct: 0.16,
  wordListGapPct: 0.05,
  wordListBorderWidth: 3,
  wordListBorderRadiusPct: 0.16, // fraction of box height
  wordListIconSizePct: 0.4, // fraction of box height
  wordListInnerGapPct: 0.3, // fraction of box height
  wordListPaddingXPct: 0.35, // fraction of box height

  ruleBoxMaxWidthPct: 0.72,
  ruleBoxBorderWidth: 4,
  ruleBoxBorderRadius: 32,
  ruleBoxPaddingYPct: 0.08,
  ruleBoxPaddingXPct: 0.05,
  ruleBoxLabelTopOffsetPct: 0.045,
  ruleBoxLabelLeftOffsetPct: 0.03,
  ruleBoxLabelPadding: "10px 28px",
  ruleBoxLabelGap: 12,
  ruleBoxLabelRotationDeg: -4,

  compareRowGapPct: 0.05,
  // Fixed-width gutter holding the "vs" glyph. Left/right word columns both
  // flex:1 around it, so the gutter — and the glyph — land dead centre.
  compareVsGutterPct: 0.1,
  // Explicit line height on compare words so the "vs" gutter can be given the
  // exact same box height and thus share their vertical centre line.
  compareWordLineHeight: 1.1,
  compareArrowWidthRatio: 0.9, // fraction of the compare word font size
  compareArrowHeightRatio: 0.45, // fraction of the compare word font size

  summaryBorderWidth: 4,
  summaryBorderRadius: 32,
  summaryMinWidthPct: 0.55,
  summaryPaddingYPct: 0.06,
  summaryPaddingXPct: 0.06,
  summaryInnerGapPct: 0.03,
  summaryOuterGapPct: 0.06,
  summaryItemGapRatio: 0.4, // fraction of summaryItem font size

  // Ratios below are relative to the StressedWord/RuleText `fontSize` prop.
  soundLabelMarginTopRatio: 0.18,
  ruleTextGapRatio: 0.35,
  quizGapRatio: 0.25, // fraction of quizWord font size
  quizPronunciationMarginTopRatio: 0.2, // fraction of quizWord font size
  wordListMeaningMinWidthRatio: 1.6, // multiple of the box height
  comparePairGapRatio: 0.6, // fraction of the compare word font size
} as const;

/**
 * Motion presets. Every entrance/idle/pulse animation reads its numbers from
 * the active preset, so the whole episode can be re-rendered in a different
 * feel by swapping one prop — see MotionStyleProvider and the EP06-calm /
 * EP06-dynamic compositions.
 *
 * - `calm`: slides up, critically damped (damping 20 = 2*sqrt(stiffness*mass)
 *   for Remotion's spring defaults, so it settles with no overshoot) and then
 *   holds perfectly still.
 * - `dynamic`: slides in from alternating sides with a light overshoot
 *   (damping 13 is under critical), then keeps drifting so the frame never
 *   reads as fully static.
 */
export const MOTION_STYLES = {
  calm: {
    entranceSlidePx: 20,
    entranceAxis: "y", // slides up from below
    entranceAlternate: false,
    springDamping: 20,
    staggerSec: 0.3,
    // How long an entrance takes to settle. Used to chain follow-up beats
    // (stress pulse, compare arrow) after an element has arrived.
    entranceSettleSec: 0.45,
    floatEnabled: false,
    floatAmplitudePx: 0,
    floatPeriodSec: 4,
    floatPhaseOffsetSec: 0,
    // Stays exactly where it landed.
    travelEnabled: false,
    travelPeriodSec: 7,
    travelPhaseOffsetSec: 0,
    // No bulb bridge, no status badge, no watermark — `calm` stays plain.
    signatureEnabled: false,
    referenceLayout: false,
    cardLayout: false,
    stressPulseScale: 1.08,
    stressPulseDurationSec: 0.4,
    stressShimmerEnabled: false,
    stressShimmerPeriodSec: 3,
    stressShimmerMinOpacity: 1,
  },
  dynamic: {
    entranceSlidePx: 60,
    entranceAxis: "x", // slides in horizontally
    entranceAlternate: true, // ...from alternating sides per index
    springDamping: 13,
    staggerSec: 0.35,
    entranceSettleSec: 0.55,
    // Elements given a travel profile roam instead of floating in place; the
    // float is the fallback idle for everything else (ruleBox, summary).
    floatEnabled: true,
    floatAmplitudePx: 3,
    floatPeriodSec: 4,
    floatPhaseOffsetSec: 0.7,
    travelEnabled: true,
    travelPeriodSec: 7,
    travelPhaseOffsetSec: 1.6,
    signatureEnabled: true,
    referenceLayout: false,
    cardLayout: false,
    stressPulseScale: 1.12,
    stressPulseDurationSec: 0.4,
    stressShimmerEnabled: true,
    stressShimmerPeriodSec: 3,
    stressShimmerMinOpacity: 0.9,
  },
  /**
   * Recreates the reference video's look: pure black, one centred column of
   * mark / eyebrow / headline / caption, and motion so restrained it barely
   * registers. It bypasses the channel's own scene layouts entirely — see
   * ReferenceScene — so it shares no rendering path with calm or dynamic.
   */
  reference: {
    entranceSlidePx: 12,
    entranceAxis: "y",
    entranceAlternate: false,
    springDamping: 200, // fully settled, no bounce anywhere in the source
    staggerSec: 0.25,
    entranceSettleSec: 0.5,
    floatEnabled: false,
    floatAmplitudePx: 0,
    floatPeriodSec: 4,
    floatPhaseOffsetSec: 0,
    travelEnabled: false,
    travelPeriodSec: 7,
    travelPhaseOffsetSec: 0,
    signatureEnabled: false,
    // The one flag that swaps in the reference layout.
    referenceLayout: true,
    cardLayout: false,
    stressPulseScale: 1,
    stressPulseDurationSec: 0.4,
    stressShimmerEnabled: false,
    stressShimmerPeriodSec: 3,
    stressShimmerMinOpacity: 1,
  },
  /**
   * The storyboard layout: a fixed three-zone frame with one content card.
   * Like `reference` it bypasses the channel scene components entirely.
   */
  card: {
    entranceSlidePx: 14,
    entranceAxis: "y",
    entranceAlternate: false,
    springDamping: 200,
    staggerSec: 0.12,
    entranceSettleSec: 0.45,
    floatEnabled: false,
    floatAmplitudePx: 0,
    floatPeriodSec: 4,
    floatPhaseOffsetSec: 0,
    travelEnabled: false,
    travelPeriodSec: 7,
    travelPhaseOffsetSec: 0,
    signatureEnabled: false,
    referenceLayout: false,
    cardLayout: true,
    stressPulseScale: 1.06,
    stressPulseDurationSec: 0.4,
    stressShimmerEnabled: false,
    stressShimmerPeriodSec: 3,
    stressShimmerMinOpacity: 1,
  },
} as const;

/**
 * On-word emphasis driven by the narration's real timing (`highlightAt` ..
 * `highlightEnd`). Applies to quiz, wordList and compare in both motion
 * styles: the word grows and turns yellow exactly while it's being spoken,
 * then relaxes back to its base size and colour — so a stress syllable, whose
 * base colour is already yellow, stays yellow afterwards.
 */
export const SPEECH = {
  scale: 1.15,
  attackSec: 0.15,
  releaseSec: 0.2,
  attackDamping: 12,
  // Used when a word matched but has no end frame recorded.
  fallbackDurationSec: 0.35,
} as const;

/**
 * Waypoints for the `dynamic` travelling motion, in normalised units that get
 * multiplied by a per-layout range. The loop starts and ends at the element's
 * laid-out position so it always returns home.
 */
export const TRAVEL_WAYPOINTS = [
  { x: 0, y: 0, rotate: 0 },
  { x: -0.85, y: -0.55, rotate: -1 },
  { x: 0.7, y: 0.3, rotate: 1 },
  { x: 0.3, y: 0.85, rotate: 0.35 },
] as const;

/**
 * How far elements may travel, as a fraction of composition width/height.
 * Kept well inside the 15–20% ceiling because the real constraint is that
 * text must never leave the frame or collide with a neighbour — the layouts
 * with the least slack get the tightest profiles.
 *
 * Values are checked against the real clearances: vertical range must stay
 * under half the gap between stacked elements, horizontal under the slack
 * left over inside the content padding.
 *
 * - `default`: a single centred word (quiz) — wide horizontal room, but the
 *   word/arrow stack only leaves ~38px vertically.
 * - `compare`: one word of a side-by-side pair; the `vs` gutter limits how
 *   far it may drift inward.
 * - `compareRow`: a whole arrow-linked row moving as one unit, so the paired
 *   words can never drift into each other or the arrow between them.
 * - `list`: 3+ stacked rows (wordList) — under 10% and barely any vertical
 *   play, since rows sit ~54px apart.
 */
export const TRAVEL_RANGES = {
  default: { x: 0.06, y: 0.015, rotateDeg: 1.5 },
  compare: { x: 0.022, y: 0.032, rotateDeg: 2 },
  compareRow: { x: 0.022, y: 0.012, rotateDeg: 0.5 },
  list: { x: 0.025, y: 0.012, rotateDeg: 0.5 },
} as const;

export type TravelProfileName = keyof typeof TRAVEL_RANGES;

/**
 * `dynamic`-only signature layer, reinterpreted from the reference's motion
 * technique (not its colours or marks): a glowing mark that announces each
 * segment, a persistent corner chip colouring the current section, and a
 * near-invisible glyph behind the content. See CLAUDE.md.
 *
 * Gated by `MotionStyle.signatureEnabled` — `calm` renders none of it.
 */
export const SIGNATURE = {
  // Bridge: the bulb "switches on" then leaves, all inside 0.4s.
  bridgeDurationSec: 0.4,
  bridgeTurnOnSec: 0.3,
  bridgeDamping: 9, // under-damped, so it wobbles once before settling
  bridgeIconSizePct: 0.17, // of composition height
  bridgeGlowMaxPx: 64,
  bridgeScaleFrom: 0.7,

  badgeTopOffset: 52,
  badgeRightOffset: 64,
  badgeDotSize: 16,
  badgeGap: 13,
  badgeFontSize: 26,
  badgePadding: "11px 24px",
  badgeBorderOpacity: 0.35,

  watermarkOpacity: 0.04,
  watermarkSizePct: 0.62, // of composition height
  watermarkStrokeWidth: 1.1,
} as const;

/**
 * Look-and-feel of the `reference` style, measured off
 * public/reference/anthropic_intro.mp4 (3840x2160) rather than eyeballed:
 * colours are peak (non-antialiased) pixel values and the positions are the
 * measured centres of each element band, as a fraction of frame height.
 *
 * Entirely separate from the channel's own palette — `calm` and `dynamic`
 * never read these.
 */
export const REFERENCE = {
  background: "#000000", // measured: pure black, not a dark tint
  accent: "#FD914B", // the orange used by the mark and the spoken word
  headline: "#FDFCFC",
  eyebrow: "#938C8A",
  caption: "#FCFCFC",
  captionUpcoming: "#6E6E6E", // not-yet-spoken caption text sits dim

  // Vertical centres, as a fraction of composition height.
  iconCentrePct: 0.392,
  eyebrowCentrePct: 0.518,
  headlineCentrePct: 0.631,
  captionCentrePct: 0.876,

  iconSizePct: 0.133,
  eyebrowSizePct: 0.031,
  headlineSizePct: 0.134,
  captionSizePct: 0.072,

  eyebrowLetterSpacing: 7,
  headlineLetterSpacing: -1,
  contentMaxWidthPct: 0.82,
  headlineLineHeight: 1.25,
  // Vertical room the headline may occupy. Our prose lines are far longer
  // than the reference's single-line headlines, so the block is anchored by
  // its top (keeping a one-liner exactly on the measured centre) and extra
  // lines grow downward into the gap above the caption — never upward into
  // the mark. This is the room available going down.
  headlineMaxHeightPct: 0.29,
  headlineMinSizePct: 0.05,

  // The mark appears immediately then settles ~5% smaller over ~0.8s; there
  // is no rotation or colour transition in the source.
  iconSettleSec: 0.8,
  iconSettleFrom: 1.05,
  // Frame-to-frame diffs showed no hard cuts anywhere, so scenes cross-fade
  // slowly and without any scale move.
  transitionSec: 0.5,
} as const;

/**
 * Absolute floor on every `card`-style text element's rendered size, so a
 * scene that happens to shrink heavily (dense card, wrapped words) never
 * drops a secondary element below what's legible on a phone screen.
 * Hierarchy is still expressed by each element's own `CARD.*SizePct` — this
 * only clamps the bottom. Fractions of frame height, same convention as
 * `CARD.*Pct`. Doesn't cover `wordListMinSizePct`/`compareMinSizePct` (the
 * main word text) or `subtitleSizePct` — those already have their own floor
 * mechanisms from the previous pass.
 */
export const MOBILE_MIN_FONT_SIZE = {
  title: 0.035, // top-bar episode title
  topBadge: 0.03, // top-bar category pill + progress dots
  cardBadge: 0.032, // card's own small category pill (e.g. "실생활 연결")
  syllable: 0.045, // English syllable cells (STA|TION)
  pronunciation: 0.05, // Korean pronunciation cells (스테이|션)
  description: 0.045, // prose: heading/lines/box/flow label/caption
  summaryItem: 0.04, // summary numbered points + closing note
  /**
   * Word-bank chips (summary). Lower than the rest on purpose — they are
   * short all-caps English tokens, which stay readable smaller than Korean
   * prose does — but still floored, because they were the last unprotected
   * element on the summary card and collapsed to ~9px once everything around
   * them stopped shrinking.
   */
  chip: 0.024,
} as const;

/**
 * `card` style — the storyboard layout, in three bands:
 *
 *   top    8%  — episode title, category badge, progress dots
 *   content 70% — the card's own header row (badge + timecode) and its body
 *   subtitle    — narration line, centred on `subtitleCentrePct`
 *
 * The card no longer draws a border. It was the frame's dominant graphic and
 * it bought nothing: the content is already grouped by position and by the
 * word panels' own outlines, and the box forced the body to sit inside two
 * layers of padding. Dropping it let the content band grow (63% -> 70%),
 * the side margins tighten, and the subtitle drop to where a viewer's eye
 * expects burned-in captions — near the bottom of the frame rather than
 * hard against the card.
 *
 * The gap between the content band's bottom (78%) and the subtitle's top
 * (~84%) is what `safeAreaPx` used to guarantee explicitly; it now falls out
 * of the two bands' geometry, so a card can never crowd the subtitle.
 */
export const CARD = {
  /**
   * The frame colour behind every card scene. The shape-wipe's incoming layer
   * paints this too: without an opaque backdrop of its own it fades in *over*
   * the outgoing scene, and both scenes' text stays legible at once.
   */
  background: "#0B0F17",

  topZonePct: 0.08,
  cardZonePct: 0.7,
  /**
   * Vertical centre of the narration subtitle. Centring (rather than
   * top-anchoring as before) keeps a two-line cue growing symmetrically
   * instead of marching down toward the frame edge. 0.88 sits clear of
   * YouTube's hover controls while reading as bottom-of-frame.
   */
  subtitleCentrePct: 0.88,

  sidePaddingPct: 0.022,
  cardRadius: 22,
  /** Border on the word/box panels *inside* the card. The card itself has none. */
  cardBorderWidth: 2,
  cardPaddingPct: 0.02,
  /**
   * Horizontal padding inside a word panel, and the gap between panels.
   * Tokens rather than inline literals because `wordsWrapInfo()` and
   * `fitWordScale()` both have to subtract exactly this chrome to decide
   * whether a row fits — a stray literal in one of them silently mis-sizes
   * the whole row. Tightened alongside the border removal: at the old 0.028
   * a three-panel row of 9-letter words missed fitting on one line by ~36px,
   * so every word wrapped; this buys that back and they render on one line.
   */
  panelPadXPct: 0.022,
  panelGapPct: 0.02,
  /**
   * Gap for rows of two panels or fewer. A three-panel row is width-starved —
   * `panelGapPct` is as tight as it is precisely so 9-letter words still fit
   * on one line — but at two panels there is room to spare (a 2-up row's
   * natural width runs ~1300px inside a ~1790px body), and the tight gap left
   * two large words reading as one run ("NATIONDECISION").
   *
   * Sized to absorb the narration emphasis, which is a `transform: scale()`
   * and so grows a word *visually* without reserving any layout width: at
   * SPEECH.scale two neighbouring words each bleed ~7.5% of their own width
   * toward each other, and at these font sizes that is enough to overlap a
   * merely "comfortable" gap. Chosen by panel count rather than font size,
   * which would be circular — the gap feeds `fitWordScale`, which decides
   * the font.
   */
  panelGapWidePct: 0.08,
  /**
   * Vertical room the card's own header row (category pill + timecode) takes,
   * subtracted before the body's budget. Must track `cardBadgeSizePct`: it
   * was a hardcoded 0.055 tuned for a 0.021 badge, and raising the badge to
   * its mobile minimum silently overran it, clipping the last line off dense
   * cards. = badge line box + its padding + the row's bottom margin.
   */
  cardHeaderPct: 0.065,
  /**
   * How far a *sparse* card may scale **up** to fill the content band.
   * Restricted to cards with no word panels (prose, flow): there, nothing is
   * width-critical, so growth is bounded purely by the band and every mobile
   * minimum goes slack. On a word card growth is self-defeating — the glyphs
   * are already at the width limit, so scaling up only forces them to wrap
   * and pushes the rendered size back down to the floor.
   */
  maxGrowFit: 1.3,
  /**
   * Tighter inner padding for cards whose floor-protected content alone would
   * otherwise exceed the card's vertical budget (EP6 scene 10: 3 summary
   * points + a 2-line caption + a 10-chip word bank, all at their mobile
   * minimums). Reclaims vertical room from the cheapest place there is, since
   * padding carries no information. Applied all-or-nothing by
   * `cardPadPctFor()`, so ordinary cards keep the roomier default.
   */
  densePaddingPct: 0.012,
  /**
   * Width cap for prose blocks (lines/box/note/caption), as a fraction of
   * bodyWidth. Used identically at measurement time (real line-wrap
   * counting, see measureLineCount()) and at render time (the block's own
   * `maxWidth` style) — the two have to agree exactly, or a block wraps to
   * more lines than its reserved height accounted for and clips again.
   */
  proseMaxWidthPct: 0.88,
  /**
   * `card.box`'s own padding, distinct from `panelPadXPct` (tuned tight so
   * three word panels fit one row) and noticeably more generous — a box is
   * one wide paragraph block, not a dense row of panels, and at the tight
   * word padding it read as cramped. Also raised the box's own resting font
   * size (see `boxRestSizePct`) now that there is a wider box to fill.
   */
  boxPadXPct: 0.045,
  boxPadYPct: 0.032,
  /**
   * `card.box`'s text size. Kept equal to `bodySizePct` (== the description
   * floor) rather than a bigger dedicated size — a bigger box was tried and
   * measured safe on its own, but combined with `card.words` on the same
   * card (EP6 scene 8) it clipped the caption below. The actual culprit
   * turned out not to be the font at all: it was `boxPadYPct` below (raised
   * for a roomier feel) growing the box's own chrome past what its flat
   * height reservation assumed — see `boxChromeFrac` in CardScene.tsx, which
   * fixed that properly. This still stays at the floor rather than reverting
   * to a bigger size: the comfortable, less-cramped read the box needed came
   * almost entirely from the width change (shrink-wrap -> `proseMaxWidthPct`
   * of the body) and the padding below, not from the font being bigger.
   * Kept as its own token (not reusing `bodySizePct` directly) so a future
   * denser box-only card can raise it without touching every other prose
   * field.
   */
  boxRestSizePct: 0.045,

  titleSizePct: MOBILE_MIN_FONT_SIZE.title,
  /** Top-bar category pill, next to the episode title. */
  topBadgeSizePct: MOBILE_MIN_FONT_SIZE.topBadge,
  /** The card's own small category pill, top-left of the card box. */
  cardBadgeSizePct: MOBILE_MIN_FONT_SIZE.cardBadge,
  badgePadding: "7px 18px",
  timecodeSizePct: 0.019,

  /**
   * Sized for phone playback: at 400px frame width a 0.042 word rendered at
   * 9.5px, which reads only because it is a single short token.
   *
   * This is a *cap*, not a fixed size. Three panels of 0.12 words cannot fit
   * across 1920px, so `fitWordScale()` shrinks a row until it does — the same
   * problem `SHORTS.wordCharWidthRatio` solves in the 9:16 layout.
   */
  wordSizePct: 0.12,
  /**
   * Advance width of one uppercase glyph as a fraction of font size, for the
   * 900-weight display face. Measured off rendered stills at 129.6px:
   *
   *   INFORMATION  1070px / 11 chars → 0.751   (M/O heavy)
   *   INFORM        512px /  6 chars → 0.658
   *   ATTENTION     766px /  9 chars → 0.657   (T/I heavy)
   *
   * The spread is the letter mix, so this is the worst case rounded up — a
   * mean would let M-heavy words overflow. Cost is that T/I-heavy rows shrink
   * ~13% more than they strictly need.
   */
  wordCharWidthRatio: 0.76,
  /**
   * Floors on the word font size, as a fraction of frame height, so a dense
   * card (3+ words / 3+ pairs) never shrinks past legibility. `fitWordScale`
   * and `estimateBodyHeight`'s `fit` are otherwise unbounded below 1.
   *
   * `wordListMinSizePct` is reached by raising `wordScale`'s floor (cheap —
   * only the word glyph, nothing else, grows). `compareMinSizePct` needs
   * `fit` itself raised instead, because a `card.pairs` row's `wordScale` is
   * already uncapped at 1 before the floor — see `CardBody` in CardScene.tsx.
   */
  wordListMinSizePct: 0.08,
  compareMinSizePct: 0.06,
  /**
   * When a compare card stacks 3+ pair rows, the card's fixed budget can't
   * fit 3 rows of word-glyph + syllable + pronunciation cells (the latter
   * two now bigger, from their own mobile-minimum floors below) plus a
   * caption. `card.pairs` cells are deliberately NOT floor-protected the way
   * `card.words` cells are — protecting them too is mathematically
   * impossible alongside the word-glyph floor for 3 stacked pairs (verified:
   * minimum content at both floors and zero chrome already exceeds the card
   * zone) — so instead this scales the *whole* supporting bundle (cells +
   * internal gaps + panel padding, everything except the word glyph itself)
   * down together, both in `wordBlockHeight()`'s estimate and in the actual
   * render (`WordBlock`'s `cellScale` / `Panel`'s `compact` padding).
   * ⚠️ A 3-pair compare card cannot satisfy every mobile minimum at once, and
   * no value here changes that. Measured against EP6 scene 6: three rows of
   * (word 6% + syllable 4.5% + pronunciation 5%), at their line heights and
   * with *zero* chrome, already need ~0.60 of frame height against the ~0.593
   * the content band can offer. So this is a balance point, not a solution —
   * 0.85 keeps the word glyph at ~6.5% (above its floor) and the cells at
   * ~2.1%, which reads as supporting detail rather than body copy. Splitting
   * such a scene in two is the only way to get the cells to their floor.
   */
  pairCompactPct: 0.85,
  cellSizePct: MOBILE_MIN_FONT_SIZE.syllable,
  pronCellSizePct: MOBILE_MIN_FONT_SIZE.pronunciation,
  bodySizePct: MOBILE_MIN_FONT_SIZE.description,
  noteSizePct: MOBILE_MIN_FONT_SIZE.summaryItem,
  chipSizePct: MOBILE_MIN_FONT_SIZE.chip,
  captionSizePct: MOBILE_MIN_FONT_SIZE.description,
  /**
   * Line-height for prose blocks (heading/lines/box/note) and for the
   * summary `points` list, kept as separate tokens because `points` is the
   * one place the mobile-minimum pass tightens spacing (rather than shrinking
   * text) to make three stacked items fit — see estimateBodyHeight.
   */
  proseLineHeight: 1.25,
  summaryLineHeight: 1.15,
  /** Gap between summary `points` rows, replacing a flat 0.016 inline value. */
  summaryGapPct: 0.008,
  /** Arrow between etymology `flow` stages, replacing a plain "→" glyph. */
  flowArrowSizePct: 0.065,
  /** Language landmark icon above each `flow` stage label. */
  flowIconSizePct: 0.075,
  flowIconGapPct: 0.014,

  subtitleSizePct: 0.055,
  subtitleLineHeight: 1.35,
  /**
   * Outline behind the subtitle, as a fraction of its font size.
   * There was no stroke before this, so it is not a bump of an earlier value:
   * 0.04em is the conventional outline weight for burned-in video subtitles
   * and this is that plus the requested 30%.
   */
  subtitleStrokeRatio: 0.052,

  /**
   * Progress dots are always drawn on the fixed 1080px-tall canvas (never
   * scaled by a scene's `fit`), so literal px is fine here — bumped in the
   * same proportion as `topBadgeSizePct`'s own bump (0.021 -> 0.03, x1.43)
   * so the dots keep reading as one unit with the badge text next to them.
   */
  dotSize: 16,
  dotGap: 18,

  /**
   * Per-block entrance. The card used to arrive as one unit, so every scene
   * was a single slide that then sat perfectly still for its whole 30–60s —
   * the main reason the video read as static. Staggering the body's blocks
   * makes each card assemble itself in the order the narration introduces
   * it, which is motion that carries meaning rather than decoration.
   *
   * Deliberately short and small: this fires on every scene, so anything
   * longer than ~half a second of build, or a rise big enough to notice as
   * "sliding", becomes its own kind of tiring.
   */
  blockStaggerSec: 0.11,
  blockEnterSec: 0.42,
  blockRisePx: 26,
  /**
   * Subtitle cue entrance. Cues change several times per scene at speaking
   * pace, so this is the most narration-synchronised motion on screen — but
   * for the same reason it has to be the most restrained: a cue that slid or
   * scaled would flicker constantly. A short fade with a few px of rise
   * reads as "a new line was spoken" without drawing the eye off the card.
   */
  subtitleCueEnterSec: 0.16,
  subtitleCueRisePx: 9,

  /** Opacity of a word while a *different* word is being narrated. */
  dimOpacity: 0.6,

  // Scene transitions. A shape-wipe only runs when the category changes;
  // consecutive scenes of the same category just cross-fade.
  //
  // The wipe's three beats are expressed as *fractions* of this duration
  // inside shapeWipe.tsx, so lengthening it stretches all three together:
  //
  //   도형 확대   ~42% -> 0.36s
  //   강조색 유지  18% -> 0.15s
  //   페이드인     41% -> 0.35s
  //
  // Safe against the audio: TransitionSeries overlaps the neighbouring
  // sequences, so a longer wipe means more concurrent audio. Measured across
  // EP6/7/8, the tightest boundary still leaves 0.17s of silence between the
  // outgoing and incoming speech at 0.85s — the overlap lands in the trailing
  // silence plus the 0.5s scene buffer, not on a word.
  shapeWipeSec: 0.85,
  shapeWipeDamping: 110,
  crossFadeSec: 0.3,
} as const;

/** Badge colour per storyboard category. */
export const CARD_CATEGORY_COLORS: Record<string, string> = {
  intro: "#9CA3AF",
  principle: "#5B9BD5",
  example: "#7DC242",
  quiz: "#B98CE8",
  exception: "#F5A524",
  summary: "#5B9BD5",
  teaser: "#F06AA8",
  endscreen: "#7DC242",
};

/**
 * Closing card. YouTube overlays its own end-screen elements on the last
 * ~20 seconds of a video, and anything we draw underneath them is simply
 * covered — so those two rectangles are treated as unusable and the content
 * is laid out around them.
 *
 * Zone sizes are the ones YouTube reserves (300x170 at 1920x1080); the margin
 * is added on our side so nothing sits flush against a card edge either.
 */
export const ENDSCREEN = {
  durationSec: 8,
  /** Reserved rectangles, in px at 1920x1080. */
  zoneW: 300,
  zoneH: 170,
  zoneMargin: 40,

  badgeTopPct: 0.09,
  contentLeftPct: 0.07,
  /** Vertical centre of the subscribe block. */
  subscribeCentrePct: 0.46,

  titleSizePct: 0.036, // of height
  subscribeSizePct: 0.065, // was 0.052 — bigger, less sparse
  playlistLabelSizePct: 0.026,
  playlistSizePct: 0.032,
  /** "구독" pill button next to the subscribe sentence, replacing the old play-triangle glyph. */
  subscribeBtnTextSizePct: 0.0553,
  subscribeBtnPaddingYRatio: 0.5, // of the button's own font size
  subscribeBtnPaddingXRatio: 1.1,

  /** The card fades up, holds, then eases down as the video ends. */
  fadeInSec: 0.6,
  fadeOutSec: 1.2,
  bgDimTarget: 0.55,
} as const;

export type MotionStyleName = keyof typeof MOTION_STYLES;
export type MotionStyle = (typeof MOTION_STYLES)[MotionStyleName];

export const DEFAULT_MOTION_STYLE: MotionStyleName = "calm";

export const ANIMATION = {
  summaryStaggerSec: 0.4,
  wordListStaggerSec: 0.4,

  // Narration-driven highlighting (driven by `highlightAt`, see
  // scripts/generate-highlights.mjs). Ramp stays within the 0.3s budget.
  highlightRampSec: 0.3,
  highlightHoldSec: 1.2,
  highlightDimOpacity: 0.5,
  highlightActiveScale: 1.03,

  compareArrowDelaySec: 0.6,
  compareArrowDrawSec: 0.4,

  quizHoldSec: 1.5,
  quizSecondWordPulseCount: 2,

  lightbulbGlowPeriodSec: 2,
  lightbulbGlowMin: 0.6,
  lightbulbGlowMax: 1,

  backgroundGradientPeriodSec: 20,
  backgroundGradientSwingPct: 8,

  sceneTransitionSec: 0.35,
  sceneTransitionScaleFrom: 0.98,
} as const;

/**
 * Vertical short (1080x1920). Additive: `calm` / `dynamic` / `reference` /
 * `card` never read any of this, so the long-form styles are untouched.
 *
 * Sizes are fractions of composition *height* like everywhere else, but a
 * 9:16 frame is 3.2x taller than it is wide relative to 16:9, so a long-form
 * ratio would overflow horizontally. The word sizes below are expressed
 * against **width** for exactly that reason.
 */
export const SHORTS = {
  width: 1080,
  height: 1920,

  /** Content is centred in the middle band; chrome sits outside it. */
  sidePaddingPct: 0.07, // of width
  contentCentrePct: 0.42, // of height — above centre, leaving room for subtitles

  wordSizePct: 0.13, // of width
  /**
   * Average advance width of one uppercase Inter-900 glyph, as a fraction of
   * the font size. Measured off a render: CELEBRATION at 140px came out
   * ~1180px wide (11 glyphs), i.e. 1180/(11*140). Used to shrink long words
   * so they cannot overflow a 1080px-wide frame the way CELEBRATION did.
   */
  wordCharWidthRatio: 0.77,
  pronunciationSizePct: 0.062, // of width
  countdownSizePct: 0.36, // of width
  suffixSizePct: 0.11, // of width
  /**
   * "+TION" sits behind the countdown. It has to be readable — at 0.18 it was
   * effectively invisible — but must still stay clearly secondary to the
   * foreground digit and to the main words.
   */
  suffixOpacity: 0.55,

  /**
   * Subtitles. Started at 20% over the long-form card style (0.033) but that
   * crowded the frame once the header grew, so it sits just above it now.
   */
  subtitleSizePct: 0.034,
  /** Kept clear of the platform's own UI overlay at the bottom of the frame. */
  subtitleBottomPct: 0.16,
  subtitleMaxWidthPct: 0.86,
  /**
   * Subtitle wrapping. Korean has no spaces inside a word as far as CSS is
   * concerned, so the default breaks mid-word ("어디로" -> "어디" / "로");
   * `word-break: keep-all` is what confines breaks to spaces.
   *
   * Once breaks are word-only a long line can need three rows, which crowds
   * the frame, so the size is reduced until it fits `subtitleMaxLines`.
   * Widths are estimated: Hangul is about one em per glyph, Latin far less.
   */
  subtitleMaxLines: 2,
  subtitleMinSizePct: 0.024, // of height — floor for the auto-shrink
  hangulCharWidthRatio: 1.0,
  latinCharWidthRatio: 0.55,

  ctaSizePct: 0.045, // of width
  ctaPadding: "26px 52px",
  ctaBottomGapPct: 0.06,

  titleSizePct: 0.038, // of width
  /** Two-line hook under the player's top icons; line 1 carries the hook. */
  headerSizePct: 0.064, // of width
  headerSubSizePct: 0.044, // of width
  titleTopPct: 0.07, // of height

  /** "+TION" slides in from the right over this many seconds. */
  suffixSlideSec: 0.5,
  suffixSlideFromPct: 0.5, // of width
  /** Countdown digit: one spring-in per number. */
  countdownDamping: 11,
} as const;
