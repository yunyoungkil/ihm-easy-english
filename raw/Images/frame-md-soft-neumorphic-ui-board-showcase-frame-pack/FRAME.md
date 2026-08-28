---
# ─────────────────────────────────────────────────────────────
# frame.md — video-first companion to design.md
# Brand: Soft Neumorphic UI Board (muted pastel · warm gray)
# Atoms are sacred · composition is free · numbers come from the script.
# ─────────────────────────────────────────────────────────────

colors:
  # grounds
  bg-top:        "#D8D7D3"
  bg-mid:        "#C9C7C2"
  bg-bottom:     "#BEBBB5"
  surface:       "#E7E4DE"
  surface-soft:  "#DEDAD4"
  surface-dark:  "#D0CEC8"
  # ink
  ink:           "#555751"
  ink-soft:      "#777A74"
  ink-caption:   "#96938D"
  ink-strip:     "#444640"
  white-soft:    "#F3F2ED"
  # muted accents — the brand's coloured card grounds
  sage:          "#7F9E8F"
  mint-gray:     "#A8B5AB"
  blue-gray:     "#789094"
  dusty-blue:    "#8599A0"
  muted-green:   "#8FA292"
  pale-sage:     "#B6C1B5"
  lavender:      "#B6ACC9"
  icy-blue:      "#8FA6AE"
  seafoam:       "#94AD9D"
  # signals
  red-dot:       "#D45662"
  amber-pale:    "#D9BB91"
  # strip surface
  strip:         "#D4D0CA"

typography:
  family:
    sans: "Inter, 'SF Pro Display', Manrope, 'Helvetica Neue', sans-serif"
  tracking-default: "-0.01em"

  # ── reading ramp (source px + cqw @ 1920) ────────────────
  # legibility floor: 1.4cqw ≈ 27px @1920. sizes below are chrome only.
  reading:
    caption:       { fontSize: "1.4cqw",  weight: 400, lineHeight: 1.3,  tracking: "-0.01em" }   # ≈27px
    body:          { fontSize: "1.6cqw",  weight: 400, lineHeight: 1.35, tracking: "-0.01em" }   # ≈31px
    label:         { fontSize: "1.8cqw",  weight: 500, lineHeight: 1.2,  tracking: "-0.01em" }   # ≈35px
    title-s:       { fontSize: "2.2cqw",  weight: 600, lineHeight: 1.15, tracking: "-0.012em" }  # ≈42px
    title-m:       { fontSize: "3.0cqw",  weight: 600, lineHeight: 1.1,  tracking: "-0.015em" }  # ≈58px
    # chrome-only (below floor — never carries a beat's meaning)
    strip-code:    { fontSize: "1.05cqw", weight: 500, lineHeight: 1.0,  tracking: "0.06em" }

  # ── display / hero ramp (frame-native) ───────────────────
  display:
    wordmark-mega: { fontSize: "30cqw",   weight: 600, lineHeight: 0.84, tracking: "-1.9cqw" }
    display-hero:  { fontSize: "14cqw",   weight: 600, lineHeight: 0.9,  tracking: "-0.6cqw" }
    display-mid:   { fontSize: "9cqw",    weight: 600, lineHeight: 0.95, tracking: "-0.3cqw" }
    claim-large:   { fontSize: "6.5cqw",  weight: 500, lineHeight: 1.02, tracking: "-0.14cqw" }
    section-head:  { fontSize: "4.2cqw",  weight: 600, lineHeight: 1.05, tracking: "-0.08cqw" }
    stat-hero:     { fontSize: "12cqw",   weight: 600, lineHeight: 0.9,  tracking: "-0.4cqw" }
    stat-ledger:   { fontSize: "3.6cqw",  weight: 600, lineHeight: 1.0,  tracking: "-0.04cqw" }
    pill-giant:    { fontSize: "2.6cqw",  weight: 500, lineHeight: 1.0,  tracking: "-0.01em" }

rounded:
  card:    "14px"
  panel:   "17px"
  small:   "6px"
  pill:    "20px"
  input:   "22px"
  circle:  "50%"
  card-giant:   "28px"
  panel-giant:  "34px"
  pill-giant:   "40px"

spacing:
  card-pad-x:  "18px"
  card-pad-y:  "14px"
  panel-pad:   "20px"
  row-gap:     "12px"
  frame-pad:   "5cqw"
  frame-gap-l: "3.2cqw"
  frame-gap-m: "2.0cqw"
  frame-gap-s: "1.2cqw"
  strip-inset: "1.0cqw"
  keep-out:    "2.0cqw"

shadow:
  raised:   "0 10px 18px rgba(80,76,70,.22), 0 3px 6px rgba(80,76,70,.14), inset 0 1px 0 rgba(255,255,255,.24)"
  control:  "0 5px 10px rgba(87,84,79,.16), inset 0 1px 1px rgba(255,255,255,.50)"
  focus:    "0 0 0 3px rgba(220,214,255,.60), 0 6px 14px rgba(115,106,155,.18), inset 0 1px 1px rgba(255,255,255,.55)"
  recessed: "inset 2px 2px 5px rgba(100,96,89,.20), inset -2px -2px 5px rgba(255,255,255,.50)"
  raised-giant: "0 22px 38px rgba(80,76,70,.22), 0 8px 14px rgba(80,76,70,.14), inset 0 1px 0 rgba(255,255,255,.24)"

components:

  # ── surfaces ─────────────────────────────────────────────
  frame-ground:
    backgroundImage: "radial-gradient(circle at 50% 22%, rgba(255,255,255,.30), transparent 38%), linear-gradient(180deg, {colors.bg-top} 0%, {colors.bg-mid} 50%, {colors.bg-bottom} 100%)"
    shadowInset:     "inset 0 0 90px rgba(78,75,70,.06)"

  # ── the 3×2 top-card family (brand signature) ────────────
  soft-card:
    textColor:       "{colors.white-soft}"
    typography:      "{typography.reading.title-s}"
    rounded:         "{rounded.card}"
    padding:         "{spacing.card-pad-y} {spacing.card-pad-x}"
    shadow:          "{shadow.raised}"

  soft-card-sage:      { extends: "{components.soft-card}", backgroundColor: "{colors.sage}" }
  soft-card-mint:      { extends: "{components.soft-card}", backgroundColor: "{colors.mint-gray}" }
  soft-card-blue:      { extends: "{components.soft-card}", backgroundColor: "{colors.blue-gray}" }
  soft-card-dusty:     { extends: "{components.soft-card}", backgroundColor: "{colors.dusty-blue}" }
  soft-card-green:     { extends: "{components.soft-card}", backgroundColor: "{colors.muted-green}" }
  soft-card-pale:      { extends: "{components.soft-card}", backgroundColor: "{colors.pale-sage}" }

  soft-card-giant:
    extends:         "{components.soft-card}"
    typography:      "{typography.display.display-mid}"
    rounded:         "{rounded.card-giant}"
    padding:         "2.4cqw 2.8cqw"
    shadow:          "{shadow.raised-giant}"

  # ── state pills ──────────────────────────────────────────
  state-pill:
    backgroundColor: "{colors.surface}"
    textColor:       "{colors.ink}"
    typography:      "{typography.reading.label}"
    rounded:         "{rounded.pill}"
    padding:         "0 1.4cqw"
    height:          "2.6cqw"
    shadow:          "{shadow.control}"

  state-pill-hover:    { extends: "{components.state-pill}", backgroundColor: "{colors.lavender}",    textColor: "{colors.white-soft}" }
  state-pill-pressed:  { extends: "{components.state-pill}", backgroundColor: "{colors.icy-blue}",    textColor: "{colors.white-soft}" }
  state-pill-green:    { extends: "{components.state-pill}", backgroundColor: "{colors.seafoam}",     textColor: "{colors.white-soft}" }

  state-pill-giant:
    extends:         "{components.state-pill}"
    typography:      "{typography.display.pill-giant}"
    rounded:         "{rounded.pill-giant}"
    padding:         "0 2.4cqw"
    height:          "5.4cqw"

  # ── circular action button (brand-signature focal) ───────
  circular-action:
    backgroundColor: "{colors.seafoam}"
    textColor:       "{colors.white-soft}"
    rounded:         "{rounded.circle}"
    diameter:        "3.5cqw"
    ring:            "7px solid rgba(230,230,222,.6)"
    shadow:          "{shadow.raised}"

  circular-action-giant:
    extends:         "{components.circular-action}"
    diameter:        "22cqw"
    ring:            "2.2cqw solid rgba(230,230,222,.6)"   # preserves source 10.3% ring/diameter ratio at frame scale
    shadow:          "{shadow.raised-giant}"

  # ── settings panel + rows ────────────────────────────────
  settings-panel:
    backgroundColor: "{colors.surface}"
    rounded:         "{rounded.panel}"
    padding:         "1.4cqw"
    shadow:          "0 9px 17px rgba(70,67,62,.18), inset 0 1px 1px rgba(255,255,255,.65)"

  settings-row:
    backgroundColor: "rgba(255,255,255,.15)"
    textColor:       "{colors.ink}"
    typography:      "{typography.reading.body}"
    rounded:         "{rounded.small}"
    padding:         "0.6cqw 1.0cqw"

  settings-main-button:
    backgroundColor: "{colors.muted-green}"
    textColor:       "{colors.white-soft}"
    typography:      "{typography.reading.label}"
    rounded:         "0.8cqw"
    padding:         "0.8cqw 1.2cqw"
    shadow:          "{shadow.control}"

  # ── form controls ────────────────────────────────────────
  input-default:
    backgroundColor: "{colors.surface}"
    textColor:       "{colors.ink}"
    typography:      "{typography.reading.label}"
    rounded:         "{rounded.input}"
    padding:         "0 1.2cqw"
    height:          "2.2cqw"
    shadow:          "{shadow.control}"

  input-focused:
    extends:         "{components.input-default}"
    shadow:          "{shadow.focus}"

  segmented-control:
    extends:         "{components.input-default}"

  long-slider:
    backgroundColor: "#E5E2DD"
    rounded:         "25px"
    height:          "2.6cqw"
    padding:         "0 1.2cqw"
    shadow:          "{shadow.focus}"

  slider-tick:
    backgroundColor: "{colors.ink-soft}"
    width:           "0.12cqw"
    height:          "1.2cqw"

  toggle-track:
    backgroundColor: "#DAD8D3"
    rounded:         "14px"
    width:           "2.8cqw"
    height:          "1.5cqw"
    shadow:          "{shadow.recessed}"

  toggle-thumb:
    backgroundColor: "#ECEAE5"
    rounded:         "{rounded.circle}"
    diameter:        "1.2cqw"
    shadow:          "{shadow.control}"

  lavender-pill:
    backgroundColor: "{colors.lavender}"
    textColor:       "{colors.white-soft}"
    typography:      "{typography.reading.label}"
    rounded:         "{rounded.input}"
    padding:         "0 1.4cqw"
    height:          "2.4cqw"
    shadow:          "{shadow.focus}"

  lavender-pill-giant:
    extends:         "{components.lavender-pill}"
    typography:      "{typography.display.pill-giant}"
    rounded:         "{rounded.pill-giant}"
    padding:         "0 2.8cqw"
    height:          "6.0cqw"

  # ── empty-state + illustration ───────────────────────────
  empty-card:
    backgroundColor: "{colors.surface}"
    rounded:         "{rounded.panel}"
    padding:         "2.0cqw"
    shadow:          "{shadow.control}"

  # ── bottom segmented navigation ──────────────────────────
  segment-nav:
    backgroundColor: "{colors.surface}"
    rounded:         "0.8cqw"
    padding:         "0.4cqw"
    shadow:          "{shadow.control}"

  segment-tile-nover:   { backgroundColor: "{colors.seafoam}",    textColor: "{colors.white-soft}", rounded: "0.6cqw" }
  segment-tile-comel:   { backgroundColor: "{colors.blue-gray}",  textColor: "{colors.white-soft}", rounded: "0.6cqw" }
  segment-tile-doiden:  { backgroundColor: "{colors.pale-sage}",  textColor: "{colors.white-soft}", rounded: "0.6cqw" }

  # ── table panel (data / ledger) ──────────────────────────
  table-panel:
    backgroundColor: "{colors.surface}"
    rounded:         "{rounded.card}"
    padding:         "1.2cqw 1.4cqw"
    shadow:          "{shadow.control}"

  table-cell:
    backgroundColor: "rgba(210,208,202,.55)"
    textColor:       "{colors.ink}"
    typography:      "{typography.reading.body}"
    rounded:         "5px"
    padding:         "0.4cqw 0.6cqw"

  table-cell-hover:    { extends: "{components.table-cell}", backgroundColor: "{colors.mint-gray}",  textColor: "{colors.white-soft}" }
  table-cell-selected: { extends: "{components.table-cell}", backgroundColor: "{colors.dusty-blue}", textColor: "{colors.white-soft}" }

  # ── vertical strip (the code label — brand-signature chrome)
  vertical-strip:
    backgroundColor: "{colors.strip}"
    textColor:       "{colors.ink-strip}"
    typography:      "{typography.reading.strip-code}"
    rounded:         "11px"
    width:           "1.4cqw"
    # writing-mode: vertical-rl; transform: rotate(180deg) — non-token construction (see prose)

  # ── signals ──────────────────────────────────────────────
  red-dot:
    backgroundColor: "{colors.red-dot}"
    rounded:         "{rounded.circle}"
    diameter:        "0.7cqw"

  # ── typographic atoms used as compositional units ────────
  eyebrow:
    textColor:       "{colors.ink-soft}"
    typography:      "{typography.reading.caption}"
    tracking:        "0.14em"

  caption:
    textColor:       "{colors.ink-caption}"
    typography:      "{typography.reading.caption}"

  headline:
    textColor:       "{colors.ink}"
    typography:      "{typography.display.claim-large}"

  headline-hero:
    textColor:       "{colors.ink}"
    typography:      "{typography.display.display-hero}"

---

# frame.md — Soft Neumorphic UI Board · Frame Layer

> **Atoms are sacred · composition is free · numbers come from the script.**

## Overview

This is the video-first companion to `design.md`. The source spec describes a **735 × 916 portrait
UI board** — a Figma-style artifact of soft neumorphic controls on warm gray. This document
re-frames the same brand so that the **frame** (default 1920×1080) is the unit, the coloured
cards become full-frame grounds, and the warm gray becomes the ambient stage. Nothing about the
material changes: the same warm grays, the same muted sage/blue accents, the same wide-blur
shadows and lavender focus glow, the same thin monoline icons and rounded geometry. What changes
is scale and composition: fewer things per frame, sizes measured against the frame, and a
storyboard rhythm instead of a single dense board.

**Register.** Quiet, tactile, ambient. This is not a screaming display brand — it is a soft
sample-board brand. Frames should feel like *studio product photography lit on a warm bulb*:
low contrast, generous silence, one thing softly holding the light. The brand's confidence is
in **restraint**, not intensity.

**Frame Craft Bar** — every frame passes these before any structural check:
- **Squint test.** One element dominates at **3–6× the nearest neighbour**. The 3×2 card grid
  reads as a single mass, not six equal cards; the giant circular action reads as a moon in the
  warm gray sky. A ramp is failure — chasm is the mode.
- **Silence test.** Sparse archetypes (cover, claim, focal-artifact, closer) read **55–75%
  empty**. Warm-gray silence is not blankness; it is the brand's *ambient light*. Never fill it to
  look complete. Named dense exceptions: **`ledger`** and **`catalog`** are the two archetypes
  that carry density by design.
- **Restraint test.** The brand's scarce elements fire **once per frame**: exactly one lavender
  focus glow, exactly one red-dot signal, exactly one giant focal artifact. If two things want to
  glow, demote one to plain surface.
- **Reference bar.** Aim for the caliber of an **Apple Music widget lit softly on a shelf** or a
  **Braun sample panel photographed in ambient afternoon light**. Failure looks like a **Windows
  Aero era slide deck** — glossy, over-bevelled, decorative for its own sake.

## Colors

Colour tokens are copied unchanged from `design.md` (see frontmatter `colors:`). At frame scale
they are re-roled:

- **`{colors.bg-top}` → `{colors.bg-bottom}` (warm-gray ramp)** is the **frame ground**, applied
  via the `frame-ground` gradient. Every frame that isn't a full-bleed accent-card ground uses
  this. The top-lit radial and the bottom-inset shadow are load-bearing — they are the brand's
  *lighting*, not decoration.
- **`{colors.surface}` / `{colors.surface-soft}` / `{colors.surface-dark}`** are lifted panels on
  the ground — settings, empty-state, table-panel, segment-nav.
- **Muted accents** (`sage`, `mint-gray`, `blue-gray`, `dusty-blue`, `muted-green`, `pale-sage`,
  `icy-blue`, `seafoam`) are the palette of the **coloured card grounds**. In a card-catalog
  frame they run as a family; in a focal-artifact frame **one** of them owns the whole frame.
- **`{colors.lavender}`** is the **focus voltage** — reserved for the focus-glow and one lavender
  action pill. It never carries a headline; it announces attention.
- **`{colors.red-dot}` / `{colors.amber-pale}`** are signals. A frame permits **one red-dot** and
  no more. Never a red-dot and a lavender glow at full strength in the same frame.
- **Ink.** Ink is `{colors.ink}` on light surfaces and `{colors.white-soft}` on coloured card
  grounds. Pure black never appears.

## Typography

Two ramps live in the frontmatter. The **reading ramp** carries the source's px hierarchy given
its `cqw` equivalent at 1920 (`px ÷ 1920 × 100 = cqw`); anything below the **1.4cqw legibility
floor** is chrome only (strip codes, colophon) and may never carry a beat's meaning. The
**display / hero ramp** is frame-native — sizes far larger than any web hierarchy would ever
carry (`wordmark-mega` at 30cqw, `display-hero` at 14cqw), designed so a single word can hold the
whole frame.

**Fit-to-measure headlines.** A headline's size is a function of its line length, not a fixed
token. Cap the headline text block at **≤ 78cqw wide**; keep ≥ `{spacing.frame-pad}` from every
safe edge. Step the display ramp by word count: ≤ 3 words → `display-hero` or larger; 4–6 words
→ `claim-large`; 7+ words → `section-head`. Short lines go big, long lines go small.

**Weight ceiling: 600.** The source never goes above 600. This spec never does either. The
brand's rhythm is *whisper*, not shout — a Bold 800 headline breaks the character.

**Family.** `{typography.family.sans}` throughout. Letter-spacing default `-0.01em` per source.
Display sizes carry tighter, resolved tracking in `cqw` per token.

## Layout — The Frame

- **Primary aspect:** 1920×1080 (16:9). Secondary: 1080×1920 (9:16). Tertiary: 1080×1080 (1:1).
- **Safe area:** inset `{spacing.frame-pad}` (5cqw ≈ 96px @1920) on every edge. No load-bearing
  element crosses this margin. Vertical strips (`vertical-strip`) inset by
  `{spacing.strip-inset}` — they are decorative code labels, not content.
- **Frame-relative sizing law.** Every display size, gap, and internal padding is authored in
  `cqw`. Fixed px is reserved for **atoms** — border radii (14/17/6/20/22px), shadow specs,
  hairline widths, and micro chrome dimensions.
- **cqw over vw.** The showcase and any renderer must use `container-type: size` on the frame and
  author sizing in `cqw` — a plain-`vw` build would force every frame to fill the viewport,
  which is exactly the bug that makes contact-sheet frames read as aggressive. `cqw` resolves
  against the frame container at any display size.

## Elevation & Depth

Depth is the brand. But depth **has a ceiling** — the four source shadows plus one frame-scale
variant, applied per role:

- **`{shadow.raised}`** — top-card grid, empty-state card, circular action button. The frame's
  "lifted objects."
- **`{shadow.raised-giant}`** — a frame-scale variant, larger blur, only for **giant focal
  components** (`soft-card-giant`, `circular-action-giant`, `lavender-pill-giant`).
- **`{shadow.control}`** — settings panel, state pills, table-panel, segment-nav. Softer than
  raised — these sit on the ground but don't lift as much.
- **`{shadow.focus}`** — the lavender glow. **One per frame, maximum.** The scarce voltage.
- **`{shadow.recessed}`** — inset controls (toggle tracks, tick backgrounds). Rare; sits inside a
  raised surface, never on the frame ground directly.

Banned at frame scale: sharp drop shadows (`0 3px 5px #999`-class), coloured drop shadows other
than the lavender focus glow, hard rim lights, chromatic aberration, glass/blur backgrounds. If
depth is doing more than one job per frame, remove one.

## Shapes

Radii are carried verbatim from source and treated as sacred atoms — even at frame scale a
14px card radius stays 14px. Frame-scale extensions (`{rounded.card-giant}` 28px,
`{rounded.panel-giant}` 34px, `{rounded.pill-giant}` 40px) are proportional multiples used only
for `-giant` component variants.

**Geometry rule.** No element has a corner sharper than `{rounded.small}` (6px). No element is a
pure rectangle at frame scale. Icons are thin monoline (stroke `1.2–1.6px`), round-cap, round-join
— Material-filled and hard-geometric icon styles are out of character.

## Components

Every buildable unit is defined as a frontmatter token; treatments **compose** those tokens and
add only placement. Prose below is context — intent, when-to-use, and non-token construction —
and never re-lists resolved values (the frontmatter is the single source of truth).

- **`{components.frame-ground}`** — the warm-gray radial+linear gradient with the inset ambient
  shadow. Applied to every frame that isn't a full-bleed coloured accent ground. Non-token
  construction: the two backgrounds must layer in the given order (radial on top of linear); the
  `shadowInset` is applied to the frame body, not the gradient layer.
- **`{components.soft-card}`** (and six coloured variants `-sage / -mint / -blue / -dusty /
  -green / -pale`) — the 3×2 top-card family from source. Used at natural size for the catalog
  archetype; the coloured ground carries the card title in `white-soft`. A monoline icon (25×25
  @ source) sits in the card's left region; construction is not a token — it composes with the
  card as an inline SVG stroke element in the current text colour.
- **`{components.soft-card-giant}`** — frame-scale variant for the focal-artifact archetype. One
  coloured card at 60–80cqw wide reads as the frame. Same construction; the icon scales with it.
- **`{components.state-pill}`** (+ `-hover / -pressed / -green` and `-giant`) — the four pill
  states from source §9. Composed as an inline row on state-showcase frames, or at giant scale as
  a lower-third label on a hero frame.
- **`{components.circular-action}`** — the seafoam action button with the wide (7px) surface-tone
  ring. `-giant` (22cqw) is the brand's most recognisable focal artifact — treat it as the moon.
- **`{components.settings-panel}`** + **`{components.settings-row}`** +
  **`{components.settings-main-button}`** — the middle-left panel from source §11–13. Compose as
  a chrome group on ledger/dashboard frames.
- **`{components.input-default}`** / **`{components.input-focused}`** /
  **`{components.segmented-control}`** — form-control family. The focused variant carries the
  lavender focus glow **and** a small `{components.red-dot}` as its state indicator — this
  co-occurrence is only permitted inside this composed unit, not across a whole frame.
- **`{components.long-slider}`** + **`{components.slider-tick}`** — the long tick slider from
  source §21. 12 ticks, evenly distributed; the tick colour is `{colors.ink-soft}`.
- **`{components.toggle-track}`** + **`{components.toggle-thumb}`** — pair; thumb sits inset in
  the recessed track. Multi-colour toggle (source §22) overlaps three tone circles: `blue-gray`,
  `seafoam`, `amber-pale`, right one partially visible — this overlap is composed at instance
  level, not a token.
- **`{components.lavender-pill}`** / **`{components.lavender-pill-giant}`** — the brand's action
  voltage. Never appears twice in a frame at full strength.
- **`{components.empty-card}`** — the empty-state surface. The character illustration (source
  §25) is a thin monoline SVG of a figure with one hand raised, plus 3–5 sparkles — composed
  inline; not a token.
- **`{components.segment-nav}`** + tile variants — the 3-tile bottom nav from source §26. Used as
  a lower rail on catalog and ledger frames.
- **`{components.table-panel}`** + **`{components.table-cell}`** (+ `-hover / -selected`) — the
  2×4 ledger from source §27–28. The single archetype allowed to carry density.
- **`{components.vertical-strip}`** — the writing-mode code labels from source §7. Non-token
  construction: `writing-mode: vertical-rl; transform: rotate(180deg);` on the label text; the
  strip itself is a rounded capsule. Chrome only — text is below the legibility floor and never
  carries a beat's meaning.

## Motion & Timing

The brand is calm. Motion follows.

**Cut grammar.** Soft cross-dissolves (200–320ms) between frames within a sequence. Hard cuts
only between archetype changes (cover → editorial, editorial → ledger). Never a whip pan, never a
smash cut, never a zoom-punch — those break register.

**What may animate.**
- The lavender **focus glow** may pulse in gently on frame-enter (opacity 0 → 100 over ~400ms,
  ease-out). This is the brand's single motion signature.
- Ticks on the long slider may reveal left-to-right (staggered ~40ms/tick).
- Numerical ledger cells may count up on enter (single pass, ≤ 600ms).
- Coloured cards in a catalog frame may enter in a soft, ordered wash (stagger ~80ms, reading
  order, opacity + 4cqw rise).

**What must not animate.** No parallax on the frame ground. No shadow-bloom loops. No perpetual
motion on any component. No rotation. No skew. If something is animating on hold, it is wrong.

**Dwell.** Each hold sits ≥ 1.2s after motion settles. Element count drives pace (fewer things →
faster sequence), never inverse — a ledger frame naturally dwells longer because it carries
more, not because timing was tweaked.

**Export.** 1920×1080 @ 30fps primary; 60fps only if a slider-tick reveal is on screen.

## Frame Treatments

Six archetype plates. Each composes frontmatter components; no ad-hoc sizes.

### 1 · Cover  (identity · move: wordmark + strip-flanked ambient ground)
**Ground** `{components.frame-ground}`, padding: `{spacing.frame-pad}`.
**Container** flex column, centered on both axes, gap: `{spacing.frame-gap-m}`.
**Composes** `{components.vertical-strip}` ×2 (left+right rails), `{components.eyebrow}`,
`{components.state-pill-giant}` (single tag).
**Focal** wordmark set in `{typography.display.wordmark-mega}`, centered, single line.
**Chrome** two `{components.vertical-strip}` inset by `{spacing.strip-inset}` on left/right,
running full height; `{components.eyebrow}` above wordmark; `{components.state-pill-giant}`
below wordmark as a single soft tag.
**Accent** none. The cover is the one frame where the lavender voltage stays silent.
**Silence** ~65% empty.
**Fixed** ground gradient, strip inset, wordmark centering, weight ceiling 600.
**Free** wordmark string, eyebrow string, tag label.
**Density** sparse.

### 2 · Oversized Claim  (editorial · move: fit-to-measure headline, single accent object)
**Ground** `{components.frame-ground}`, padding: `{spacing.frame-pad}`.
**Container** flex column, anchor centered, gap: `{spacing.frame-gap-l}`.
**Composes** `{components.headline-hero}` (or `{components.headline}` per word count),
`{components.circular-action}` (natural size, offset), optional `{components.eyebrow}`.
**Focal** headline in the display ramp, stepped by word count (≤3 words `display-hero`; 4–6
`claim-large`; 7+ `section-head`); text block capped ≤ 78cqw wide.
**Chrome** one `{components.circular-action}` in an empty quadrant, ≥ `{spacing.keep-out}` from
the headline bounding box.
**Accent** the seafoam of the circular action is the single accent; no lavender glow here.
**Silence** ~70% empty.
**Fixed** legibility floor, weight ceiling, 78cqw headline cap, keep-out.
**Free** headline copy, action position (any empty quadrant), whether eyebrow is present.
**Density** sparse.

### 3 · Focal Artifact  (brand-signature · move: giant circular action as the moon)
**Ground** `{components.frame-ground}`, padding: `{spacing.frame-pad}`.
**Container** flex row, anchor centered, gap: `{spacing.frame-gap-l}`.
**Composes** `{components.circular-action-giant}`, `{components.caption}`,
`{components.vertical-strip}` (single, right rail).
**Focal** `{components.circular-action-giant}` (22cqw diameter), centered, sitting on the ambient
warm-gray ground with `{shadow.raised-giant}`.
**Chrome** a single right-side `{components.vertical-strip}`; a `{components.caption}` line below
the artifact, ≥ `{spacing.keep-out}` clearance.
**Accent** the seafoam of the giant action is the accent; the ring is the source
`rgba(230,230,222,.6)` surface tone verbatim.
**Silence** ~75% empty — the emptiness is the point.
**Fixed** ring width scaling, ambient gradient, centered anchor.
**Free** caption string, whether left strip is present (occasional tension: right only).
**Density** sparse.

### 4 · Ledger  (data · move: dense 2×N grid + section-head clearance) — density exception
**Ground** `{components.frame-ground}`, padding: `{spacing.frame-pad}`.
**Container** flex column, anchor left, gap: `{spacing.frame-gap-m}`.
**Composes** `{components.table-panel}` (framed), `{components.table-cell}` (+ `-hover`,
`-selected`) in a 2×4 grid, `{components.headline}` (section head via
`{typography.display.section-head}`), `{components.caption}` (subhead),
`{components.settings-main-button}` (single trailing action).
**Focal** the table-panel occupies ≈ 60cqw × 40cqw, ledger cells set in
`{typography.display.stat-ledger}`; **one** cell is `-selected` (dusty-blue), **one** is
`-hover` (mint-gray) — the rest are default.
**Chrome** section headline top-left with `margin-bottom` ≥ 2cqw so a wrap can't collide with
the first row; caption directly below headline.
**Accent** the selected cell (dusty-blue) is the single accent; no lavender glow, no red-dot.
**Silence** ~30% empty — **the named density exception**.
**Fixed** headline clearance, exactly one `-selected` + one `-hover` cell.
**Free** row/column labels, cell content.
**Density** dense-exception.

### 5 · Catalog  (chrome · move: the 3×2 coloured-card grid at frame scale) — density exception
**Ground** `{components.frame-ground}`, padding: `{spacing.frame-pad}`.
**Container** grid 3 columns × 2 rows, gap: `{spacing.frame-gap-m}`, anchor centered.
**Composes** six variants of `{components.soft-card}` (`-sage`, `-mint`, `-blue`, `-dusty`,
`-green`, `-pale`), a top `{components.eyebrow}`, a bottom `{components.segment-nav}` (optional
lower rail).
**Focal** the grid as a **single mass** (squint test: reads as one object, not six). Each card
carries a monoline icon left + two lines of `white-soft` label. Cards are ≈ 26cqw × 13cqw at
frame scale, radius stays `{rounded.card}`.
**Chrome** small centered `{components.eyebrow}` above the grid; optional
`{components.segment-nav}` beneath, ≥ `{spacing.frame-gap-m}` clearance.
**Accent** none — the coloured palette *is* the accent, rationed by never repeating a tone.
**Silence** ~35% empty.
**Fixed** six-card composition, radius, coloured-ground family.
**Free** icon glyphs, card copy strings.
**Density** dense-exception.

### 6 · Closer  (identity · move: focus-glow input + lavender action, warm silence)
**Ground** `{components.frame-ground}`, padding: `{spacing.frame-pad}`.
**Container** flex column, anchor centered, gap: `{spacing.frame-gap-l}`.
**Composes** `{components.input-focused}` (with embedded `{components.red-dot}`),
`{components.lavender-pill-giant}`, `{components.caption}`,
`{components.vertical-strip}` ×2 (thin flanking rails).
**Focal** the `{components.lavender-pill-giant}` — the brand's single voltage moment. Sits
centered with `{shadow.focus}`.
**Chrome** a small `{components.input-focused}` above the pill (as a state pairing), a
`{components.caption}` below.
**Accent** lavender fires **once** here (the giant pill glow). The red-dot inside the composed
input is permitted because it is inside that composed unit — no free-standing red-dot.
**Silence** ~65% empty.
**Fixed** single voltage rule, focus glow only on the pill or its embedded input.
**Free** pill label, caption string.
**Density** sparse.

## Do's and Don'ts

**Do.**
- **Lean centered.** Cover, oversized-claim, focal-artifact, and closer all centre their focal
  element. Left anchor is reserved for ledger and catalog (genuine reading/scanning frames).
  Vary anchor across the sequence: no more than ~2 consecutive frames share one.
- **Less per frame, more frames.** ≤ 2–3 distinct elements per frame (focal + at most a kicker
  and one supporting composed unit). Two things → two frames, not a denser one.
- **Vary the composition axis every consecutive frame** — never run the same L/R split twice
  running.
- **Full-bleed on a cadence.** A coloured-card ground filling the frame appears every 3–4 frames
  as a cadence tool, not the default.
- **Ration the kicker.** The `{components.eyebrow}` is a slide-deck reflex; use it on a minority
  of frames.
- **Layer the planes.** A vertical strip can cross behind the wordmark; a decorative element
  never crosses the headline bounding box (keep-out ≥ `{spacing.keep-out}`).

**Don't.**
- No black outlines, ever.
- No high-saturation colour. If a colour looks like Material or iOS default blue, it is wrong.
- No sharp drop shadows. Wide-blur or nothing.
- No coloured glow other than lavender focus.
- No headline in the top-left with an image parked in the right — that is the deck tell.
- No fixed hero-size on a long headline (it blows out); step down the ramp by word count.
- No red-dot **and** lavender glow at full strength in the same frame.
- No web chrome (persistent top-nav, footer, cookie banner) as a treatment. A nav appears once
  at most as a thin establishing frame.

## Aspect-Ratio Behavior

| Treatment | 16:9 (primary) | 9:16 (portrait) | 1:1 (square) |
|---|---|---|---|
| **1 · Cover** | Wordmark set in `wordmark-mega` (30cqw); two strip rails full-height. | Wordmark drops to `display-hero` (14cqw) to fit line-length; strips remain full-height; safe-area on short edge = 5cqw. | Wordmark at `display-mid` (9cqw); one strip only, right side. |
| **2 · Oversized Claim** | Fit-to-measure headline anchored center; circular action in an empty quadrant. | Headline stacks to 2–3 lines; step down one ramp size; action moves below headline. | Headline center; action inset top-right; keep-out ≥ 2cqw. |
| **3 · Focal Artifact** | Circular-action-giant 22cqw centered; caption below. | Diameter re-scales to 30cqw (short-edge cqw); caption below; single right strip only. | Diameter 26cqw; caption below; both strips reduced to top+bottom decorative marks. |
| **4 · Ledger** | 2×4 grid at 60cqw × 40cqw; headline top-left. | Table becomes 4×2 (rotated); cells re-scale; headline stacks above. | 3×3 subset of cells; drop trailing column; keep hover+selected count = 1 each. |
| **5 · Catalog** | 3×2 grid centered. | 2×3 (rotated to fit portrait); cards re-scale to 40cqw wide; eyebrow above. | 3×2 remains; card aspect narrows; radius unchanged. |
| **6 · Closer** | Lavender-pill-giant centered; input-focused above; strips left+right. | Pill re-scales down to `lavender-pill` height 4cqw of short-edge; stack vertical. | Pill centered; input above; strips omitted. |

Safe-area is measured against the short edge in every ratio; no load-bearing line drops below the
1.4cqw floor after re-scale (step down the display ramp if it would).

## Approved Real Entities & Numerals

The source contains no real brand names, real customers, real revenue figures, or real dates —
its content is placeholder ("Tives Lirming", "Sonbri Venornan Stoes", "Empty States", "Table
Lsdtcision", etc.). Frame Treatments therefore carry the same placeholder register: **no
invented figures, no invented dates, no invented brand names.** When a script needs a real
numeral, it must be sourced from the script itself, not generated here.

Approved-as-placeholder strings (from source, safe to reuse in a demo):
`Tives Lirming`, `Sonbri`, `Venornan Stoes`, `Ephinodagios`, `Empty States`, `Table Lsdtcision`,
`Nover`, `Comelons`, `Doiden`, `Default`, `Focused`, `Error`, `Filled`, `Hover`, `Pressed`.

## Pre-Render Self-Audit

Run before finalising any frame:

- [ ] **Squint** — one element dominates at 3–6× its nearest neighbour?
- [ ] **Silence** — sparse archetype reads 55–75% empty? (Ledger/Catalog exempt, named.)
- [ ] **Restraint** — exactly one lavender glow, one red-dot, one giant focal artifact?
- [ ] **Weight ceiling** — no type weight above 600?
- [ ] **Depth ceiling** — max one raised-giant, one focus glow; no banned shadows?
- [ ] **Geometry** — no corner sharper than 6px; no pure rectangles?
- [ ] **Anchor** — centered by default; anchor varied across sequence (≤2 consecutive frames
      share one; ≥2 anchors in a sequence)?
- [ ] **Element count** — ≤ 2–3 distinct elements per frame (except named density exceptions)?
- [ ] **Floor** — no load-bearing line below 1.4cqw?
- [ ] **Fit-to-measure** — headline text block ≤ 78cqw wide; ramp stepped by word count?
- [ ] **Keep-out** — no decoration crosses headline/eyebrow bounding box (≥ 2cqw)?
- [ ] **Colour fidelity** — every hex from `colors:` verbatim; no invented tone?
- [ ] **Token fidelity** — every size a treatment names references a frontmatter token; no
      ad-hoc numbers in prose?
- [ ] **Ink rule** — `white-soft` on coloured grounds, `ink` on light surfaces; no pure black?

## Known Gaps

- **`cqw` as string.** The `typography` and `components` blocks use `cqw` sizes stored as YAML
  strings — a documented extension of the DESIGN.md spec's atomic-token unit set. The spec's
  consumer-behavior table tolerates it ("accept; store as string"). Renderers that only accept
  px must reject these tokens rather than reinterpret.
- **Aspect-ratio behaviour is guidance.** The 9:16 and 1:1 rescales are structural instructions,
  not resolved token variants. A dedicated portrait-ramp could be added if the brand ships
  meaningful portrait/square material at scale.
- **Motion timings** in `## Motion & Timing` are derived from brand character, not carried from
  source (which is a static Figma spec). Treat them as defaults, adjustable per script.
- **Icon glyphs** are described in prose (monoline, 1.2–1.6px stroke, Lucide/Feather/Phosphor
  Light recommended) but not carried as tokens — a component-level icon token could be added if
  a canonical set is chosen.
