---
# ─────────────────────────────────────────────────────────────
# frame.md — Rockabilly Day · video/frame companion to design.md
# Atoms are sacred · composition is free · numbers come from the script.
# ─────────────────────────────────────────────────────────────

colors:
  # Paper (grounds — never pure white)
  paper:              "#F2E7C7"
  paper-light:        "#F7EFD6"
  paper-shadow:       "#D7C89E"

  # Vintage red (ribbon, badge, arrow, misregistration offset)
  vintage-red:        "#E34232"
  dark-red:           "#C93429"
  faded-red:          "#D94B3B"

  # Black ink (main letter, hairlines, pill body)
  ink-black:          "#080908"
  soft-black:         "#171714"

  # Mint / turquoise (shadow, background burst, car shadow)
  mint:               "#8EC7B4"
  mint-light:         "#AED2BF"
  mint-dark:          "#669C8E"

typography:
  # ── Reading ramp (carried from design.md at 709px canvas, restated for video)
  # px values are the source's poster px; cqw = px ÷ 19.2 mapped to a 1920 frame
  tag-line:
    fontFamily: "Alfa Slab One, Cooper Std, serif"
    fontSize: "1.6cqw"
    weight: 700
    line_height: 1.15
    tracking: "0.01em"
    case: "sentence"
  organizer-mint:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.4cqw"
    weight: 700
    line_height: 1.0
    tracking: "0.14em"
    case: "upper"
  ribbon-condensed:
    fontFamily: "Alfa Slab One, Rye, serif"
    fontSize: "5.6cqw"
    weight: 400
    line_height: 0.92
    tracking: "0.02em"
    case: "upper"
  band-primary:
    fontFamily: "Alfa Slab One, serif"
    fontSize: "3.4cqw"
    weight: 400
    line_height: 0.95
    tracking: "0.01em"
    case: "upper"
  band-secondary:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "2.2cqw"
    weight: 700
    line_height: 1.0
    tracking: "0.02em"
    case: "upper"
  band-connective:
    fontFamily: "Lobster, cursive"
    fontSize: "1.9cqw"
    weight: 400
    line_height: 1.0
    tracking: "0em"
    case: "sentence"
  country-code:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.4cqw"
    weight: 500
    line_height: 1.0
    tracking: "0.05em"
    case: "upper"
  pill-label:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "1.8cqw"
    weight: 800
    line_height: 1.0
    tracking: "0.12em"
    case: "upper"
  location-caps:
    fontFamily: "Bebas Neue, Anton, sans-serif"
    fontSize: "4.8cqw"
    weight: 700
    line_height: 0.95
    tracking: "0.02em"
    case: "upper"
  website-caps:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "3.6cqw"
    weight: 700
    line_height: 0.95
    tracking: "0.03em"
    case: "upper"
  script-red:
    fontFamily: "Lobster, Pacifico, cursive"
    fontSize: "3.2cqw"
    weight: 400
    line_height: 1.0
    tracking: "0em"
    case: "sentence"

  # ── Display / hero ramp (frame-native — the whole reason this file exists)
  wordmark-mega:
    fontFamily: "Alfa Slab One, Anton Black, serif"
    fontSize: "22cqw"
    weight: 900
    line_height: 0.84
    tracking: "-0.02em"
    case: "upper"
  wordmark-day:
    fontFamily: "Alfa Slab One, serif"
    fontSize: "18cqw"
    weight: 900
    line_height: 0.86
    tracking: "-0.01em"
    case: "upper"
  numeral-hero:
    fontFamily: "Alfa Slab One, serif"
    fontSize: "26cqw"
    weight: 900
    line_height: 0.82
    tracking: "-0.03em"
    case: "upper"
  claim-hero:
    fontFamily: "Alfa Slab One, serif"
    fontSize: "14cqw"
    weight: 900
    line_height: 0.88
    tracking: "-0.015em"
    case: "upper"
  claim-mid:
    fontFamily: "Alfa Slab One, serif"
    fontSize: "9.5cqw"
    weight: 900
    line_height: 0.94
    tracking: "-0.01em"
    case: "upper"
  claim-long:
    fontFamily: "Alfa Slab One, serif"
    fontSize: "6.5cqw"
    weight: 900
    line_height: 1.0
    tracking: "0em"
    case: "upper"
  section-head:
    fontFamily: "Bebas Neue, sans-serif"
    fontSize: "4.2cqw"
    weight: 700
    line_height: 0.95
    tracking: "0.02em"
    case: "upper"
  pill-giant:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "3.2cqw"
    weight: 800
    line_height: 1.0
    tracking: "0.14em"
    case: "upper"

rounded:
  none:    "0px"
  pill:    "18px"
  pill-lg: "36px"
  badge:   "50%"

spacing:
  hair:      "2px"
  rule:      "4px"
  frame-pad: "5cqw"
  gutter:    "2.4cqw"
  gap-xs:    "1.2cqw"
  gap-sm:    "1.8cqw"
  gap-md:    "3cqw"
  gap-lg:    "5cqw"

components:

  # ── Grounds ──────────────────────────────────────────────
  surface-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-black}"
    overlays:
      - "radial-gradient(circle at 40% 30%, rgba(255,255,255,.18), transparent 45%)"
      - "linear-gradient(180deg, {colors.paper-light} 0%, {colors.paper-shadow} 100%) multiply 0.35"
      - "paper-grain-noise multiply 0.25"
    notes: "Never solid #FFFFFF. Always carries grain + subtle vignette."

  surface-paper-dark:
    backgroundColor: "{colors.paper-shadow}"
    textColor: "{colors.ink-black}"
    overlays:
      - "paper-grain-noise multiply 0.28"

  surface-ink:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper}"
    overlays:
      - "halftone 15deg 3px opacity 0.14"

  # ── Signature red curved ribbon ──────────────────────────
  red-ribbon:
    backgroundColor: "{colors.vintage-red}"
    textColor: "{colors.paper}"
    typography: "{typography.ribbon-condensed}"
    shape: "arc — center apex, ends folded behind"
    rounded: "{rounded.none}"
    padding: "1.2cqw 3cqw"
    height: "12cqw"
    ink-registration-offset: "y:+0.15cqw of {colors.dark-red} beneath"
    overlays:
      - "halftone 45deg 2px opacity 0.18"
      - "edge-wear noise 0.08"

  red-ribbon-tail:
    backgroundColor: "{colors.dark-red}"
    textColor: "{colors.paper}"
    shape: "elongated flag with V-notch cut"
    height: "5cqw"
    padding: "0.6cqw 2cqw"

  # ── 3-layer misregistered hero letter — the plate identity ─
  hero-type-misreg:
    layers:
      - name: "red-offset"
        color: "{colors.vintage-red}"
        transform: "translate(+0.22cqw, +0.18cqw)"
      - name: "cream-separation"
        color: "{colors.paper}"
        transform: "translate(-0.12cqw, -0.10cqw)"
        stroke: "0.5cqw"
      - name: "black-main"
        color: "{colors.ink-black}"
        transform: "translate(0,0)"
    typography: "{typography.wordmark-mega}"
    per-letter:
      rotation: "-6deg to +6deg"
      baseline_jitter: "±0.4cqw"
      scale_x: "0.96–1.04"
    notes: "Every glyph rotates independently. Baseline is never level. This is the plate identity."

  hero-type-misreg--day:
    inherits: "{components.hero-type-misreg}"
    typography: "{typography.wordmark-day}"

  hero-type-misreg--claim:
    inherits: "{components.hero-type-misreg}"
    typography: "{typography.claim-hero}"

  # ── Feature pills (frame-scale variants) ─────────────────
  feature-pill:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper}"
    typography: "{typography.pill-label}"
    rounded: "{rounded.pill}"
    padding: "0.5cqw 1.3cqw"
    edge-distortion: "0.12cqw irregular"

  feature-pill-giant:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper}"
    typography: "{typography.pill-giant}"
    rounded: "{rounded.pill-lg}"
    padding: "1.4cqw 3.4cqw"
    edge-distortion: "0.2cqw irregular"

  # ── Irregular red badge ──────────────────────────────────
  red-badge:
    backgroundColor: "{colors.vintage-red}"
    textColor: "{colors.paper}"
    typography: "{typography.pill-label}"
    rounded: "{rounded.badge}"
    padding: "1.8cqw 2.2cqw"
    shape: "irregular ellipse — hand-drawn wobble ±0.3cqw"
    overlays:
      - "halftone 15deg 2.5px opacity 0.16"

  # ── Small chrome ─────────────────────────────────────────
  organizer-tag:
    backgroundColor: "transparent"
    textColor: "{colors.mint-dark}"
    typography: "{typography.organizer-mint}"

  top-tagline:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    typography: "{typography.tag-line}"

  eyebrow-star:
    color: "{colors.ink-black}"
    shape: "4-point irregular hand-drawn star"
    size: "2cqw"

  # ── Band ledger rows ─────────────────────────────────────
  band-row-black:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    typography: "{typography.band-primary}"
  band-row-red:
    backgroundColor: "transparent"
    textColor: "{colors.vintage-red}"
    typography: "{typography.band-primary}"
  band-connector:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    typography: "{typography.band-connective}"
  country-code:
    backgroundColor: "transparent"
    textColor: "{colors.mint-dark}"
    typography: "{typography.country-code}"

  # ── Motifs ───────────────────────────────────────────────
  spark-plug:
    palette: ["{colors.paper}", "{colors.ink-black}", "{colors.mint}", "{colors.vintage-red}"]
    style: "vintage engraving · cross-hatching · halftone"
    rotation: "-15deg"
    width: "14cqw"
    height: "34cqw"
    label:
      lines: ["HOT", "ROD", "ROCK"]
      colorFrame: "{colors.ink-black}"
      colorText: "{colors.paper}"
      typography: "{typography.pill-label}"

  classic-car:
    palette: ["{colors.paper}", "{colors.ink-black}", "{colors.mint}"]
    style: "hand-drawn coupe · front 3/4 · heavy ink outline"
    line-weight-outer: "0.32cqw"
    line-weight-inner: "0.16cqw"
    ground-shadow:
      color: "{colors.ink-black}"
      shape: "rough horizontal ellipse — screen-print ink"
      opacity: 0.9

  music-staff:
    color: "{colors.ink-black}"
    lines: 5
    stroke: "0.12cqw"
    style: "curved · hand-drawn wobble"
    notes: "quarter + eighth notes riding the staff"

  mint-burst:
    color: "{colors.mint}"
    opacity_range: "0.35 – 0.70"
    style: "rough radial rays · broken circles · brush strokes"
    forbidden: "clean geometric sunburst"

  # ── Closer trio ──────────────────────────────────────────
  website-banner:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper}"
    typography: "{typography.website-caps}"
    rounded: "{rounded.pill}"
    padding: "1.2cqw 2.6cqw"
    accent: "WWW. in {colors.vintage-red}"

  signs-arrow:
    backgroundColor: "{colors.vintage-red}"
    textColor: "{colors.paper}"
    typography: "{typography.pill-label}"
    shape: "right-pointing pennant with V-cut tail"
    outline: "{spacing.rule} solid {colors.ink-black}"
    padding: "1cqw 2.8cqw 1cqw 1.8cqw"

  info-script:
    typography: "{typography.script-red}"
    textColor: "{colors.vintage-red}"

  location-strip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-black}"
    typography: "{typography.location-caps}"
    separator:
      shape: "solid dot"
      color: "{colors.vintage-red}"
      size: "0.8cqw"

  # ── Misregistration atom (any color plate) ───────────────
  misreg-offset:
    x: "0.15cqw to 0.28cqw"
    y: "0.10cqw to 0.22cqw"
    apply-to: "hero type, ribbon, badge, arrow"
    notes: "Never re-align. The offset IS the poster."

  # ── Global overlays (applied to every frame) ─────────────
  overlay-halftone:
    pattern: "SVG dots 2–4px"
    angles: [15, 45, 75]
    opacity: "0.10 – 0.25"
  overlay-distress:
    style: "scratches · ink holes · edge wear"
    coverage: "0.05 – 0.12"
    blend: "multiply"
  overlay-paper-grain:
    style: "fine paper noise"
    blend: "multiply"
    opacity: "0.15 – 0.30"
---

# frame.md — Rockabilly Day, at frame scale

> **Atoms are sacred · composition is free · numbers come from the script.**

## Overview

Rockabilly Day is a 1950s screen-printed festival poster brought into motion. Its register is
not "vintage-flavored" — it is a real 3-plate print job that has drifted: the black plate lands
first, the red plate lands **0.2cqw down and right**, the paper shows through the gap. Every
frame is that print job. There is no white here, no smooth gradient, no clean vector edge; there
is cream paper, one saturated red, ink black, one faded mint, and the honest slippage between
plates.

At frame scale, the brand's signature move is the **misregistered hero letter** — a wall of type
so large it crops the frame, painted black, edged in cream separation, shadowed in red offset,
each glyph rotated a few degrees off true. The second move is the **curved red ribbon**. The
third is the **spark plug engraving** and the **hand-drawn coupe** — motifs that carry the story
when the type rests. Halftone, ink distress, and paper grain sit over everything as global
overlays; they are not decoration, they are the medium.

### Frame Craft Bar

- **Squint test** — one element is 3–6× its nearest neighbor. The wordmark, or the car, or the
  ribbon. Never three co-equal focal masses on one frame.
- **Silence test** — sparse plates (cover, oversized-claim, focal-artifact, closer) read
  **55–75% empty paper**. The one named density exception is the **band ledger** plate.
- **Restraint test** — the accent voltage fires **once per frame**. Either the red ribbon, or
  the red badge, or the red script — pick one. The misregistration offset is ambient and does
  not count as a second red silhouette.
- **Reference bar** — aim at a Belgian/Dutch letterpress festival poster c. 1954. Failure looks
  like a Google Fonts specimen slide with a red button.

## Colors

Every color token is carried verbatim from `design.md`. What changes at frame scale is **role**:
grounds are always full-frame, never a card on a page.

- **Grounds** — `{colors.paper}` is the default. `{colors.paper-light}` and `{colors.paper-shadow}`
  live inside the paper as a soft vignette, never as a second surface. `{colors.ink-black}`
  becomes a ground only for closer plates (website banner, chrome catalog); on ink grounds the
  paper token becomes the type color.
- **Voltage** — `{colors.vintage-red}` is the brand's one loud voice. It rides ribbons, badges,
  arrows, offset shadows, and script. Rule: **one red silhouette per frame**, plus the ambient
  misregistration offset.
- **Air** — `{colors.mint}` is atmosphere. It sits behind the hero (mint-burst) and underneath
  the car (mint shadow); it is **never** used for a headline, a button, or a rule. Its job is to
  push cyan into the paper so the red vibrates.
- **Ink** — `{colors.ink-black}` is not neutral; it is warm-black with a texture floor. Solid
  black fills must carry at least the halftone overlay at 0.10 opacity.
- **Forbidden** — `#FFFFFF`. Ever.

## Typography

Two ramps are declared in the frontmatter and must not be re-derived in prose.

**Reading ramp** (`{typography.tag-line}` through `{typography.script-red}`) carries the
poster's small voices — organizer credit, band list, feature pills, country codes, website URL,
location caps, "Info" script. Sizes range 1.4–5.6cqw.

**Display / hero ramp** (`{typography.section-head}`, `{typography.claim-long}`,
`{typography.claim-mid}`, `{typography.claim-hero}`, `{typography.numeral-hero}`,
`{typography.wordmark-day}`, `{typography.wordmark-mega}`) is the reason this file exists.
Sizes step by word count:

- ≤ 3 words → `{typography.claim-hero}` (14cqw)
- 4–6 words → `{typography.claim-mid}` (9.5cqw)
- 7+ words → `{typography.claim-long}` (6.5cqw)

Any headline text block is capped at **≤ 78cqw wide**. A line touching the safe margin means
step down.

**Legibility floor** — no load-bearing line is smaller than **1.4cqw (~27px @1920)**. The
country-code token sits exactly on this floor and is decorative-only; a country code never
carries a beat's meaning.

## Layout — The Frame

The frame is the unit. Primary aspect: **16:9 · 1920×1080**. Secondary: **9:16 · 1080×1920**,
**1:1 · 1080×1080**.

- **Safe area** — `{spacing.frame-pad}` (5cqw) inset on all four sides. Load-bearing type never
  crosses this line; the misregistration offset may creep 0.3cqw beyond it — that is ink
  slippage, not a violation.
- **Frame-relative sizing law** — every display size, gap, and pad is expressed in `cqw`,
  resolved against the frame container, not the viewport. Fixed px only for chrome atoms:
  hairline (2px), heavy rule (4px), pill radius (18px).
- **cqw / cqh** — treatments author in `cqw` against a container with `container-type: size` so
  frames render at true proportion whether displayed full-screen or in a contact sheet at 700px
  wide. Do not use raw `vw`.
- **Anchor discipline** — centered is default for cover, oversized-claim, focal-artifact,
  closer. Left-anchored is reserved for the band list / editorial rows. Right/asymmetric is a
  tension beat. No more than two consecutive frames share an anchor.

## Elevation & Depth

There is no glass, no drop shadow, no gaussian blur. Depth in this brand comes from **ink
layers**: paper below, mint atmosphere above paper, black ink above mint, red offset above
black, cream separation between. That is the depth ceiling.

- Allowed: ink hairlines, heavy 4px rules, halftone dot fields, cross-hatch shading, the misreg
  offset itself.
- Banned: box-shadow (any radius), gradient fills on chrome, transparent glass panes, neon glow,
  photorealistic drop shadows on type.

Ground shadow beneath the car is a rough black ellipse — screen-print ink, not a blur.

## Shapes

Radius is scarce.

- `{rounded.none}` — the ribbon body, hero letters, red badge outer wobble, arrow pennant.
- `{rounded.pill}` (18px) — feature pills and the website banner. The source pill radius is
  carried at fixed px, not cqw — it is a chrome atom.
- `{rounded.pill-lg}` (36px) — frame-scale giant pills.
- `{rounded.badge}` (50%) with hand-wobble — the red badge only.

Every rounded silhouette carries 0.1–0.2cqw of edge distortion. No perfect vectors.

## Components

Every component's construction lives in the frontmatter `components:` block. Prose here is
intent + placement guidance only.

- **`{components.surface-paper}`** — the default full-frame ground for 90% of plates. Carries
  paper grain, subtle vignette, no solid fill.
- **`{components.surface-ink}`** — reserved for closer chrome (website banner ground). Halftone
  floor is mandatory.
- **`{components.red-ribbon}` + `{components.red-ribbon-tail}`** — the top banner arc, apex
  centered, ends folded behind, right tail extending out. The arc is a real path, not a
  border-radius trick.
- **`{components.hero-type-misreg}`** (and `--day`, `--claim` variants) — the plate identity.
  Compose it with a headline string; every letter gets independent rotation and baseline
  jitter. Never re-align the three layers; the offset IS the poster.
- **`{components.feature-pill}` / `{components.feature-pill-giant}`** — black rounded capsule
  with cream label. Ration: at most 3 in a stack. Giant variant is for full-frame catalog
  plates.
- **`{components.red-badge}`** — one per frame maximum. Irregular ellipse, hand-wobble edge.
- **`{components.spark-plug}`** — the focal artifact. Rotated -15°, rendered in the four-color
  engraving palette. When present, it is the frame's dominant element.
- **`{components.classic-car}`** — the brand-signature motif. When present, it bleeds the
  bottom edge of the frame at 70–95% of width. Ground shadow is part of the motif.
- **`{components.music-staff}`** — decorative-only; must sit ≥ 2cqw clear of any headline
  bounding box. Rides mint fields.
- **`{components.mint-burst}`** — atmosphere behind the hero letter or spark plug. Never in
  front of a load-bearing element.
- **`{components.band-row-black}` / `-red}` / `{components.band-connector}` /
  `{components.country-code}`** — the alternating list. Colors alternate row-by-row. Script
  connectors always sit in Lobster; country codes are mint and small.
- **`{components.website-banner}` + `{components.signs-arrow}` + `{components.info-script}`** —
  the closer trio. Always the three together, in this order left-to-right: script → banner →
  arrow.
- **`{components.location-strip}`** — full-width bottom caps with red-dot separators.

## Motion & Timing

This is a screen-print brand, not a digital one. Motion is **cut, not tween**.

- **Allowed** — hard cuts on the beat; a plate-swap flash (paper → red → paper) to punctuate the
  reveal of a hero word; a 1-frame ink-registration wobble (offsets snap into place then jitter
  ±0.1cqw). Halftone and grain overlays may drift 1–2 frames of paper-texture cycling. That is
  the whole vocabulary.
- **Must-not** — ease curves, parallax, camera pushes, letter-by-letter fade-ins, particle
  systems, spring physics, any smooth continuous transform.
- **Dwell** — hero plates hold **1.6–2.2s**; band ledger holds **2.4–3.0s**; closer holds
  **1.4s**. Cuts are on quarter beats.
- **Export** — 24fps ties to the letterpress era; 30fps is acceptable. Never 60fps —
  smoothness breaks the register.

Density drives pace: sparse frames cut fast, the one dense frame holds longer. Never solve pace
with easing.

## Frame Treatments

Seven recipes below. Each composes frontmatter components. Any size a treatment names is
either a token or `{spacing.*}`; no ad-hoc numbers.

### 1 · Identity Cover  (identity/cover · move: hero-misreg wordmark stacked under curved ribbon)
**Ground** `{components.surface-paper}`, padding: `{spacing.frame-pad}`.
**Container** flex-column, gap `{spacing.gap-sm}`, items centered.
**Composes** `{components.top-tagline}`, `{components.eyebrow-star}`, `{components.red-ribbon}`,
`{components.red-ribbon-tail}`, `{components.hero-type-misreg}` (word: "ROCKABILLY"),
`{components.hero-type-misreg--day}` (word: "DAY"), `{components.mint-burst}`.
**Focal** `{components.hero-type-misreg}` at `{typography.wordmark-mega}`, centered, cropping
the horizontal safe area.
**Chrome** tagline top; organizer-tag beneath the ribbon left; two `{components.eyebrow-star}`
flanking the tagline; red ribbon spanning ~78cqw at ~14cqw from top.
**Accent** the ribbon body is the single red silhouette.
**Silence** ~60% paper visible around the wordmark and beneath DAY.
**Fixed** three-layer misreg offset; paper ground; ribbon arc.
**Free** ribbon date string; wordmark word.
**Density** sparse.

### 2 · Oversized Claim  (editorial/oversized-claim · move: single word cropping the frame)
**Ground** `{components.surface-paper}`, padding: `{spacing.frame-pad}`.
**Container** flex-column, justify-center, align-center; single text block ≤ 78cqw wide.
**Composes** `{components.hero-type-misreg--claim}`, `{components.eyebrow-star}` (optional
single), `{components.organizer-tag}` (bottom-center, one line only).
**Focal** the claim word(s), sized by count from the ramp (`{typography.claim-hero}` for ≤3,
`{typography.claim-mid}` for 4–6, `{typography.claim-long}` for 7+).
**Chrome** one organizer-tag line at the bottom; nothing else.
**Accent** the red offset of the misreg is the only red.
**Silence** ~70% paper.
**Fixed** misreg offset; centered anchor; word-count ramp.
**Free** the claim string.
**Density** sparse.

### 3 · Focal Artifact — Spark Plug  (focal-artifact · move: object centered on paper with atmospheric burst)
**Ground** `{components.surface-paper}`, padding: `{spacing.frame-pad}`.
**Container** grid — spark plug slightly right of center, small label to its lower-left, one
short caption strip along the safe bottom.
**Composes** `{components.mint-burst}` (behind), `{components.spark-plug}` (rotated -15°),
`{components.info-script}` (caption, red), `{components.organizer-tag}`.
**Focal** `{components.spark-plug}` at 14cqw × 34cqw, tilted -15°, centered vertically.
**Chrome** HOT/ROD/ROCK label on the plug body; caption script one line only.
**Accent** the spark plug's tiny red heat mark plus the caption script — one red silhouette.
**Silence** ~65% paper; the mint-burst is atmosphere, not silhouette.
**Fixed** engraving palette; -15° rotation; hand-drawn label frame.
**Free** caption copy; plug label lines.
**Density** sparse.

### 4 · Band Ledger  (data/ledger · move: alternating-tone list with script connectors and country codes — the density exception)
**Ground** `{components.surface-paper}`, padding: `{spacing.frame-pad}`.
**Container** two-column grid (left band names ~62cqw / right country codes ~18cqw), gap
`{spacing.gutter}`.
**Composes** `{components.info-script}` (script header), `{components.band-row-black}`,
`{components.band-row-red}`, `{components.band-connector}`, `{components.country-code}`,
`{components.music-staff}` (right margin decoration).
**Focal** the list itself — first-row band name at `{typography.band-primary}` sits highest.
**Chrome** small script header at top ("Live on Stage" in `{typography.script-red}`); country
codes right-aligned per row.
**Accent** the script header — single red silhouette. Row-tone alternation is a rhythm inside
the type ramp, not an accent.
**Silence** ~30% (dense exception).
**Fixed** alternating row tones; script connectors in Lobster; country-code floor size.
**Free** band names; country codes; row count (≤ 5 rows).
**Density** dense-exception.

### 5 · Feature Catalog  (chrome/catalog · move: giant feature pills stacked on paper with one badge)
**Ground** `{components.surface-paper}`, padding: `{spacing.frame-pad}`.
**Container** two-column layout — pills stacked vertically right of center, badge anchored
top-left, mint-burst atmosphere behind.
**Composes** `{components.feature-pill-giant}` ×3, `{components.red-badge}`,
`{components.mint-burst}`, `{components.section-head}`.
**Focal** the stack of three `{components.feature-pill-giant}` at `{typography.pill-giant}`,
right-aligned.
**Chrome** one `{components.red-badge}` (FREE ENTRY / FOR 2 / etc.) top-left; small
section-head above the pill stack.
**Accent** the red badge — one red silhouette per frame.
**Silence** ~45%.
**Fixed** giant pill radius `{rounded.pill-lg}`; badge wobble; max 3 pills.
**Free** pill labels; badge lines.
**Density** standard.

### 6 · Brand Signature — Classic Car  (brand-signature · move: hand-drawn coupe bleeding the bottom, closer chrome above)
**Ground** `{components.surface-paper}`, padding: `{spacing.frame-pad}`.
**Container** flex-column — top zone (organizer + optional script), mid zone (car bleeding the
lower 55cqh of the frame), bottom safe strip (closer chrome).
**Composes** `{components.classic-car}` (with ground shadow), `{components.info-script}`,
`{components.website-banner}`, `{components.signs-arrow}`, `{components.location-strip}`.
**Focal** `{components.classic-car}`, width ~85cqw, centered, cropped at the lower safe edge.
**Chrome** closer strip along the bottom safe edge — `{components.info-script}` "Info" (left) →
`{components.website-banner}` (center) → `{components.signs-arrow}` (right).
**Accent** the red arrow — one red silhouette.
**Silence** ~55% paper (mostly above the car).
**Fixed** car outline weight; ground shadow shape; closer-strip order.
**Free** URL string; location string; arrow copy.
**Density** standard.

### 7 · Closer Location Strip  (closer · move: full-width caps with red-dot separators, minimal else)
**Ground** `{components.surface-paper}`, padding: `{spacing.frame-pad}`.
**Container** flex-row centered; the strip is the whole beat.
**Composes** `{components.location-strip}`, `{components.eyebrow-star}` ×2 (flanking).
**Focal** `{components.location-strip}` at `{typography.location-caps}`, spanning ~88cqw.
**Chrome** two hand-drawn stars flanking the line at ~2cqw.
**Accent** the red separator dots — one red silhouette (all dots share).
**Silence** ~72% paper.
**Fixed** red-dot separator size; heavy-condensed caps.
**Free** the location string.
**Density** sparse.

## Do's and Don'ts

**Do** —
- Compose centered by default; break to left only for the band ledger.
- Vary the composition axis every 1–2 frames.
- Let one red silhouette carry the frame; the misreg offset is ambient.
- Keep 55–75% paper visible on sparse plates.
- Let the car bleed the lower edge; let the wordmark crop the sides.
- Alternate row tones in the band list.
- Carry halftone + paper grain over every frame.

**Don't** —
- Use `#FFFFFF` anywhere.
- Re-align the misregistration layers.
- Use box-shadow, gradient fills, or gaussian blur.
- Repeat the same L/R split across consecutive frames.
- Put a red ribbon AND a red badge AND red script on the same frame.
- Drop a load-bearing line below 1.4cqw.
- Ease anything; motion is cut.
- Let a music staff or mint-burst cross the headline bounding box (≥ 2cqw keep-out).
- Center every frame — vary the anchor per sequence.
- Use a kicker on every frame.

## Aspect-Ratio Behavior

| Treatment | 16:9 (1920×1080) | 9:16 (1080×1920) | 1:1 (1080×1080) |
|---|---|---|---|
| 1 · Identity Cover | Ribbon spans 78cqw, wordmark ~22cqw high; DAY tucked under. | Ribbon spans 84cqw at ~10cqh; wordmark stacks over DAY vertically (letters read even taller). | Ribbon 84cqw at ~12cqh; wordmark drops to `{typography.claim-hero}` to fit width; DAY stacks below. |
| 2 · Oversized Claim | Claim centered; ramp chosen by word count. | Ramp steps down one (a 3-word claim uses `{typography.claim-mid}` to fit narrower measure). | Ramp uses `{typography.claim-mid}` default; claim wraps to 2 lines max. |
| 3 · Focal Artifact | Spark plug 14×34cqw right of center; caption bottom-left. | Spark plug scales to 22×54cqw, centered; caption bottom. | Spark plug 20×48cqw, centered; caption below. |
| 4 · Band Ledger | Two-column list + country codes right; ≤ 5 rows. | Single column; country codes inline right of each row; music staff moves to bottom decoration. | Single column; ≤ 4 rows to hold silence budget. |
| 5 · Feature Catalog | 3 giant pills stacked right, badge top-left. | Pills stack vertical full-width; badge moves to top-center. | Pills stack vertical center; badge top-left; may drop to 2 pills. |
| 6 · Brand Signature | Car bleeds bottom, closer strip above the safe edge. | Car scales to 88cqw, sits mid-frame; closer strip stacks vertically. | Car crops tighter to 3/4 view; closer strip is one line beneath. |
| 7 · Closer Location | Single line, stars flanking, dots between cities. | Line wraps to 2 lines; stars top+bottom. | Line wraps to 2 lines centered; stars flanking the top line. |

## Approved Real Entities & Numerals

Entities that appear in `design.md` may be used verbatim; **no figures are invented**.

- Event: "ROCKABILLY DAY"
- Organizer credit: "VZW ROCKABILLYDAYBELGIUM PRESENTS"
- Website: `WWW.ROCKABILLYDAY.BE`
- Location: `STOEPEDSTRAAT · ASSENEDE · BELGIUM`
- Tagline: "Thousands of visitors from all over the world every year!!"
- Bands: The TINSTARS, JAKE ALLEN, LIL' ESTHER and her band, JOE and the HORNETS, The SPUNBOYS
- Features: LIVE MUSIC, RETRO MARKET, ART SHOW
- Categories: PRE '65 CARS, HOT RODS, BIKES, BICYCLES, HARLEY'S, CAFERACER, AIRCOOLED, VW'S
- Numerals: "Day #2", "2nd", "Start 11h00", year "2012"

Any figure not in this list is a **`— figure —`** placeholder in the showcase and script.

## Pre-Render Self-Audit

Before finalizing a frame, tick every line:

- **Squint** — one element dominates at 3–6× the nearest neighbor?
- **Silence** — sparse plate reads 55–75% empty? (Ledger is the named exception.)
- **Restraint** — exactly one red silhouette? (Misreg offset excepted.)
- **Weight** — hero glyph weights carried unchanged from source; no substitute fonts at wrong weight?
- **Depth** — no box-shadow, no gradient fill, no glass, no blur?
- **Geometry** — pill radius = 18px atom; badge wobble present; ribbon arc is a real path?
- **Misreg** — 3-layer offset present on hero type; layers never re-aligned?
- **Anchor** — centered default honored; anchor not repeated on the previous frame?
- **Element count** — ≤ 2–3 distinct elements on sparse plates? (Ledger exempt.)
- **Floor** — no load-bearing line below 1.4cqw?
- **Ground** — paper grain + halftone overlay present at ≥ 0.10 opacity?
- **Fidelity** — every hex matches the frontmatter exactly? No `#FFFFFF`?

## Known Gaps

- The DESIGN.md spec expects atomic sizes in px/em/rem. Frame-scale display sizes are expressed
  in `cqw`, which the spec's consumer-behavior table permits as a stored string ("accept; store
  as string"). Any consumer that resolves them numerically should treat 1cqw = 1% of the frame
  container width.
- Motion & Timing, Frame Treatments, Aspect-Ratio Behavior, and Pre-Render Self-Audit are
  derived video-first sections; the source `design.md` did not enumerate them and consumers
  should preserve them as unknown sections.
- The car and spark plug motifs are described as construction rules (line weight, palette,
  ground shadow); the actual illustration is authored per-render and is not tokenized.
- Halftone / distress / grain overlays are declared as component tokens; their SVG/PNG assets
  are supplied by the render pipeline, not defined here.
