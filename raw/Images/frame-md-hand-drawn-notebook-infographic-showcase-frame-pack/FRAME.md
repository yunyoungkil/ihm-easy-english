---
colors:
  bg: "#ECEEF6"
  background: "#EEF0F8"
  background-shadow: "#E1E3ED"
  bg-radial-inner: "#F3F4FA"
  bg-radial-outer: "#E8EAF3"
  paper: "#FFFCF5"
  paper-warm: "#FAF7EF"
  paper-line: "#DDDCD6"
  paper-line-alt: "#DEDDD7"
  ink: "#171719"
  ink-alt: "#181719"
  spiral-dark: "#171718"
  spiral-mid: "#3C3B3D"
  spiral-highlight: "#777578"
  pink: "#F7C7D2"
  pink-soft: "#F6D2DF"
  pink-highlight: "#F8C9CF"
  yellow: "#FFE685"
  yellow-header: "#FFE374"
  yellow-soft: "#FFF0A5"
  blue: "#BEE9F4"
  blue-soft: "#D3F2F7"
  green: "#C9EEAF"
  green-soft: "#D8F4C5"
  orange: "#FFCB95"
  lavender: "#D9C5E9"
  lavender-dark: "#C7B1E1"
  badge-yellow: "#FFE78A"
  badge-blue: "#BFE9F5"
  badge-orange: "#FFC98F"
  badge-green: "#C7EDAE"
  highlight-yellow: "#FFE99A"
  highlight-blue: "#C8EDF5"
  highlight-orange: "#FFD09E"
  highlight-green: "#D0F1B8"
  highlight-pink: "#F7C8D3"
  fold-pink: "#EFB6D6"
  fold-purple: "#D5C2EB"
  fold-blue: "#BDE8ED"
  card-shadow: "#D9C7E7"
  notebook-shadow: "rgba(55,55,70,.23)"
  features-pink: "#F6C4D9"
  cloud-blue-a: "#C9EFF7"
  cloud-blue-b: "#C6EDF4"
  cloud-blue-c: "#C9EFF6"
  password-bg: "#FCFBF7"
  slider-track: "#F8F7F1"
  slider-progress: "#E6BCE9"
  slider-thumb: "#AFC7FF"
  button-green: "#BCEAB9"
  button-copy: "#AEE3F1"
  strength-red: "#FF6B68"
  strength-yellow: "#FFD56D"
  strength-green: "#69DD82"

typography:
  # Reading ramp — from source (px @ 736 canvas)
  wordmark:
    fontFamily: "Patrick Hand, Schoolbell, Comic Neue, sans-serif"
    fontSize: 52px
    fontWeight: 600
    letterSpacing: 1px
    lineHeight: 1.02
  subtitle:
    fontFamily: "Patrick Hand, Comic Neue, sans-serif"
    fontSize: 33px
    fontWeight: 600
  section-header:
    fontFamily: "Patrick Hand, Kalam, Comic Neue, sans-serif"
    fontSize: 29px
    fontWeight: 700
  label:
    fontFamily: "Patrick Hand, sans-serif"
    fontSize: 26px
    fontWeight: 500
  feature-item:
    fontFamily: "Patrick Hand, sans-serif"
    fontSize: 26px
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: "Patrick Hand, sans-serif"
    fontSize: 18px
    fontWeight: 400
  handle:
    fontFamily: "Patrick Hand, sans-serif"
    fontSize: 18px
    fontWeight: 500

  # Hero / display ramp — frame-native (cqw @ 1920 frame)
  wordmark-mega:
    fontFamily: "Patrick Hand, Schoolbell, sans-serif"
    fontSize: 18cqw
    fontWeight: 600
    letterSpacing: 0.4cqw
    lineHeight: 0.92
  display-hero:
    fontFamily: "Patrick Hand, Schoolbell, sans-serif"
    fontSize: 11cqw
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: 0.15cqw
  subtitle-giant:
    fontFamily: "Patrick Hand, Comic Neue, sans-serif"
    fontSize: 6.5cqw
    fontWeight: 600
    lineHeight: 1.05
  section-head:
    fontFamily: "Patrick Hand, Kalam, sans-serif"
    fontSize: 4.2cqw
    fontWeight: 700
    lineHeight: 1.08
  numeral-giant:
    fontFamily: "Patrick Hand, Schoolbell, sans-serif"
    fontSize: 14cqw
    fontWeight: 700
    lineHeight: 1
  password-giant:
    fontFamily: "Patrick Hand, Kalam, monospace"
    fontSize: 7cqw
    fontWeight: 600
    letterSpacing: 0.2cqw
  label-frame:
    fontFamily: "Patrick Hand, sans-serif"
    fontSize: 2.2cqw
    fontWeight: 500
  caption-frame:
    fontFamily: "Patrick Hand, sans-serif"
    fontSize: 1.6cqw
    fontWeight: 400

rounded:
  hairline: 5px
  soft: 8px
  card: 11px
  card-uneven: "7px 11px 12px 8px"
  page-corner: "5px 35px 35px 5px"
  marker: "12px 8px 11px 7px"
  pill: 20px
  circle: 50%

spacing:
  hair: 4px
  tight: 8px
  snug: 12px
  base: 16px
  loose: 24px
  section: 36px
  frame-pad: 5cqw
  safe-edge: 6cqw
  gutter: 4cqw

components:
  # Notebook shell
  notebook-page:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.page-corner}"
    boxShadow: "14px 18px 25px {colors.notebook-shadow}, 4px 7px 12px rgba(58,58,72,.14)"
    paperLines: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, {colors.paper-line} 32px, transparent 33px)"
  spiral-binding:
    ringColor: "{colors.spiral-dark}"
    ringHighlight: "{colors.spiral-highlight}"
    ringWidth: 54px
    ringHeight: 20px
    ringCount: "19–21"
    strokeOuter: 4px
    strokeInner: 1px
  handle-tag:
    typography: "{typography.handle}"
    textColor: "{colors.ink}"

  # Header
  wordmark-header:
    typography: "{typography.wordmark}"
    textColor: "{colors.ink}"
    transform: "uppercase"
  subtitle-marked:
    typography: "{typography.subtitle}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.pink-highlight}"
    rounded: "{rounded.marker}"
    padding: "0 8px 3px"

  # Frame-scale display variants
  wordmark-mega:
    typography: "{typography.wordmark-mega}"
    textColor: "{colors.ink}"
    transform: "uppercase"
  subtitle-marked-giant:
    typography: "{typography.subtitle-giant}"
    textColor: "{colors.ink}"
    backgroundColor: "{colors.pink-highlight}"
    rounded: "{rounded.marker}"
    padding: "0.4cqw 1.4cqw 0.8cqw"
  section-head-marked:
    typography: "{typography.section-head}"
    textColor: "{colors.ink}"
    rounded: "{rounded.marker}"
    padding: "0.4cqw 1.2cqw 0.7cqw"
    # backgroundColor set per instance from highlight-{yellow|blue|orange|green|pink}

  # Numbered badges
  badge-numeral:
    size: 3.4cqw
    border: "2.5px solid {colors.ink}"
    rounded: "{rounded.circle}"
    typography: "{typography.section-header}"
    textColor: "{colors.ink}"
  badge-numeral-giant:
    size: 14cqw
    border: "0.35cqw solid {colors.ink}"
    rounded: "{rounded.circle}"
    typography: "{typography.numeral-giant}"
    textColor: "{colors.ink}"

  # Section card
  feature-card:
    backgroundColor: "rgba(255,252,245,.75)"
    border: "2.5px solid {colors.ink}"
    rounded: "{rounded.card-uneven}"
    boxShadow: "7px 7px 0 {colors.card-shadow}"
    padding: "1.8cqw"
  paper-fold:
    fillOptions: "{colors.fold-pink} | {colors.fold-purple} | {colors.fold-blue}"
    stroke: "{colors.ink}"
    size: "1.6cqw"

  # UI artifacts
  password-display:
    backgroundColor: "{colors.password-bg}"
    border: "3px solid {colors.ink}"
    rounded: "{rounded.card}"
    boxShadow: "6px 7px 0 {colors.lavender}"
    typography: "{typography.password-giant}"
    textColor: "{colors.ink}"
    padding: "1.4cqw 2.4cqw"
  slider-track:
    backgroundColor: "{colors.slider-track}"
    border: "2.5px solid {colors.ink}"
    rounded: "{rounded.soft}"
    height: "1cqw"
  slider-progress:
    backgroundColor: "{colors.slider-progress}"
    rounded: "{rounded.soft}"
  slider-thumb:
    backgroundColor: "{colors.slider-thumb}"
    border: "2px solid {colors.ink}"
    rounded: "{rounded.soft}"
    width: "1.1cqw"
    height: "2cqw"
  checkbox-square:
    size: "2.6cqw"
    border: "2.8px solid {colors.ink}"
    rounded: "3px"
  checkbox-label:
    typography: "{typography.section-header}"
    textColor: "{colors.ink}"
    transform: "uppercase"
  button-primary:
    backgroundColor: "{colors.button-green}"
    border: "2.5px solid {colors.ink}"
    rounded: "{rounded.soft}"
    boxShadow: "5px 6px 0 {colors.card-shadow}"
    typography: "{typography.label}"
    textColor: "{colors.ink}"
    padding: "0.6cqw 1.4cqw"
  button-primary-giant:
    backgroundColor: "{colors.button-green}"
    border: "0.25cqw solid {colors.ink}"
    rounded: "1.2cqw"
    boxShadow: "0.7cqw 0.9cqw 0 {colors.card-shadow}"
    typography: "{typography.subtitle-giant}"
    textColor: "{colors.ink}"
    padding: "1.4cqw 3cqw"
  button-copy:
    backgroundColor: "{colors.button-copy}"
    border: "2.5px solid {colors.ink}"
    rounded: "{rounded.card}"
    typography: "{typography.section-header}"
    textColor: "{colors.ink}"
    padding: "0.8cqw 1.6cqw"
  strength-bar:
    background: "linear-gradient(90deg, {colors.strength-red} 0%, {colors.strength-yellow} 50%, {colors.strength-green} 100%)"
    border: "2.5px solid {colors.ink}"
    rounded: "{rounded.pill}"
    height: "2cqw"
  strength-bar-giant:
    background: "linear-gradient(90deg, {colors.strength-red} 0%, {colors.strength-yellow} 50%, {colors.strength-green} 100%)"
    border: "0.28cqw solid {colors.ink}"
    rounded: "3cqw"
    height: "6cqw"

  # Feature list
  features-heading:
    typography: "{typography.section-head}"
    backgroundColor: "{colors.features-pink}"
    rounded: "{rounded.marker}"
    padding: "0.4cqw 1.2cqw 0.7cqw"
    textColor: "{colors.ink}"
  feature-bullet:
    size: "1.1cqw"
    border: "2px solid {colors.ink}"
    rounded: "{rounded.circle}"
  feature-row:
    typography: "{typography.feature-item}"
    textColor: "{colors.ink}"

  # Doodle atoms
  star-doodle:
    fill: "{colors.yellow-header}"
    stroke: "{colors.ink}"
    strokeWidth: 2px
  cloud-doodle:
    fill: "{colors.cloud-blue-a}"
    stroke: "{colors.ink}"
    strokeWidth: 2px
  sparkle-doodle:
    stroke: "{colors.ink}"
    strokeWidth: 2px

  # Bottom cast
  laptop-illustration:
    screenFill: "{colors.blue-soft}"
    frameFill: "{colors.lavender}"
    keyboardFill: "{colors.lavender-dark}"
    stroke: "{colors.ink}"
  plant-illustration:
    potFill: "{colors.orange}"
    leafFill: "{colors.green}"
    stroke: "{colors.ink}"
  speech-bubble:
    fill: "{colors.cloud-blue-c}"
    stroke: "{colors.ink}"
    typography: "{typography.caption-frame}"
    padding: "1.4cqw 1.8cqw"
    rounded: "1.6cqw"
---

# frame.md — Hand-Drawn Notebook Infographic, at frame scale

> **Atoms are sacred · composition is free · numbers come from the script.**

## Overview

The brand is a **student's coding notebook**: ivory paper, pastel highlighters, black hand-drawn outlines, and small doodles (stars, sparkles, clouds). At web scale the source is one long portrait poster; at **frame** scale each 16:9 plate becomes **one page torn from that notebook** — a floating ivory rectangle with a black left-edge spiral, framed by the light blue-gray ground. The frame is never a clean vector UI; it is *organized hand drawing* — 70% clean information design, 30% hand-drawn imperfection.

**Frame Craft Bar** — every frame passes these before rendering:

- **Squint** — one focal element dominates at 3–6× its neighbors. A giant wordmark, a giant numeral, a lone password box on a lined page. No "screen full of five equal cards."
- **Silence** — sparse plates read 55–75% empty (ivory paper *is* the silence). The **ledger plate is the one named density exception** — it may fill the page with the 5-section grid.
- **Restraint** — the brand's scarce element is **one accent highlighter voltage per frame** (one section title behind a marker stroke, or one badge color at giant size). If two highlighter blocks appear at full strength, demote one to a small chrome tag.
- **Reference bar** — aim at a well-composed *bullet-journal spread photographed for a magazine*. The failure mode is a slide that looks like a Notion template screenshot or a generic pastel-UI hero — clinical, edge-to-edge, no doodles, no imperfection.

## Colors

Every token above is verbatim from `design.md`. At frame scale they play three roles:

- **Grounds** — `{colors.bg}` (or the radial `{colors.bg-radial-inner}` → `{colors.bg-radial-outer}`) is the room the notebook sits in; `{colors.paper}` is the notebook page itself and is the dominant surface inside the frame.
- **Marker highlights** — `{colors.highlight-yellow|blue|orange|green|pink}` and `{colors.pink-highlight}` are the rationed accent voltage. **One at full-frame prominence per plate.** Others may appear as small badges/tags.
- **Ink** — `{colors.ink}` (`#171719`) is every outline, letterform, and rule. It never softens to gray.

Never introduce a hex not in the frontmatter. If a treatment "wants" a new pastel, promote it from the existing `pink-soft`, `yellow-soft`, `blue-soft`, `green-soft`, `lavender`, or `fold-*` set.

## Typography

Two ramps. The **reading ramp** (px) is the source hierarchy — used for the notebook's *interior* type (labels, checkbox rows, feature list, handle) whenever a plate carries a full notebook page. The **hero ramp** (cqw) is frame-native and only used when the plate elevates one atom to hero size: a mega wordmark, a giant numeral, a giant password readout.

**Legibility floor: 1.4cqw (~27px @1920).** Nothing load-bearing goes below it — that reserves `caption-frame` (1.6cqw) for tags/handles only. Chrome pills use `label-frame` (2.2cqw).

**Fit-to-measure hero headlines** — the wordmark/hero text block caps at **≤78cqw wide** and never touches the safe margin. Step the ramp by word count: ≤3 words → `wordmark-mega` (18cqw); 4–6 → `display-hero` (11cqw); 7+ → `subtitle-giant` (6.5cqw). A three-word hero rides big; a seven-word title steps down.

All type is set in the notebook-hand family — `Patrick Hand`, `Schoolbell`, `Comic Neue`, `Kalam` — with fallbacks. Micro baseline shimmer (±1–2°, ±2px) is permitted at the atom level, never at the layout level.

## Layout — The Frame

- **Primary frame:** 1920×1080 (16:9). Secondary: 1080×1920 (9:16) and 1080×1080 (1:1).
- **Safe area:** 6cqw inset on every edge (`{spacing.safe-edge}`). No load-bearing element touches the safe line.
- **Frame padding:** most plates pad 5cqw from the frame edge to the notebook-page edge, so the page floats on the blue-gray ground.
- **The vw/cqw law:** display sizes, gaps, and padding author in **cqw** (px ÷ 1920 × 100). Radius, stroke, and small chrome remain in px because they are atoms. Note: the frontmatter carries `cqw` values as unit-suffixed strings — a documented extension of the DESIGN.md spec (see Known Gaps).
- **Sacred silence** — the ivory paper is not a stage to be filled. A plate with one artifact and 70% empty ivory is *stronger* than one with three artifacts and no room.

## Elevation & Depth

Two — and only two — depth moves exist at frame scale:

1. **Notebook lift** — the notebook page floats above the ground on its dual-soft-shadow (`14px 18px 25px {colors.notebook-shadow}, 4px 7px 12px rgba(58,58,72,.14)`). This is the only *blurred* shadow in the system.
2. **Offset pastel shadow** — every card, button, and boxed artifact rides a 5–7px lavender offset (`{colors.card-shadow}`) with **zero blur**. This is the brand's signature depth voice.

Depth ceiling: no gradients (except `strength-bar`'s red→yellow→green — the one named exception), no inner shadows, no glassmorphism, no glow, no photorealistic drop-shadows on UI. If a frame reads glossy or 3D, it is off-brand.

## Shapes

- Base radius: `{rounded.card}` 11px for boxed artifacts.
- Uneven card radius: `{rounded.card-uneven}` `7px 11px 12px 8px` — the hand-drawn tell; use on every feature card.
- Notebook page: `{rounded.page-corner}` `5px 35px 35px 5px` — the right corners are dramatically rounder than the left (spiral edge is nearly square).
- Marker highlight: `{rounded.marker}` `12px 8px 11px 7px` — every marker stroke uses this asymmetric radius.
- Pill / strength bar: `{rounded.pill}` 20px.
- All borders `#171719` at 2.2–3px, `stroke-linecap:round`, `stroke-linejoin:round`. Never a hairline (<2px) as the primary outline.

## Components

The frontmatter is the source of truth for construction; prose here gives intent and when-to-use. Do not re-list resolved values.

- **`{components.notebook-page}`** — the ivory ground the frame's content sits on. Every hero plate uses one. Combined with `{components.spiral-binding}` on the left edge and (optionally) `{components.handle-tag}` at the top-right.
- **`{components.wordmark-header}` / `{components.wordmark-mega}`** — the source's 52px wordmark and its frame-scale sibling. `mega` is the identity/cover voice; `header` returns whenever a plate carries a full notebook page interior.
- **`{components.subtitle-marked}` / `{components.subtitle-marked-giant}`** — the pink highlighter subtitle. Pink is *only* used behind the subtitle voice; other section titles use `{components.section-head-marked}` with yellow/blue/orange/green backgrounds set per instance.
- **`{components.badge-numeral}` / `{components.badge-numeral-giant}`** — the numbered circle. The giant variant is the *focal-numeral* plate's hero atom.
- **`{components.feature-card}`** — a section card. Rides the lavender offset shadow, uneven radius. In a ledger plate a treatment composes 4–5 of these; in a focal-artifact plate the card *is* the frame.
- **`{components.password-display}`** — the source's password readout. At frame scale this becomes a hero artifact using `{typography.password-giant}`.
- **`{components.slider-*}`, `{components.checkbox-square}`, `{components.checkbox-label}`, `{components.button-copy}`** — the interior UI atoms of a notebook page; composed inside `feature-card` when a plate carries the full ledger.
- **`{components.button-primary}` / `{components.button-primary-giant}`** — the green CTA (5–7px lavender offset). Giant variant fires only on the closer/CTA plate.
- **`{components.strength-bar}` / `{components.strength-bar-giant}`** — the one gradient in the system. The `giant` variant is the brand-signature plate's focal.
- **`{components.features-heading}` + `{components.feature-bullet}` + `{components.feature-row}`** — the pink-marker `Features` header and its colored-circle bullet list. This is the catalog/list voice.
- **`{components.star-doodle}`, `{components.cloud-doodle}`, `{components.sparkle-doodle}`, `{components.paper-fold}`** — decorative atoms. Rationed by the doodle rule: header ≈6–8, middle ≈2–4, bottom ≈8–12. **No doodle overlaps a headline, badge, or eyebrow (≥2cqw keep-out).**
- **`{components.laptop-illustration}`, `{components.plant-illustration}`, `{components.speech-bubble}`** — the bottom cast. Only the closer plate carries all three; other plates may reference *one* as a mascot in an otherwise-empty quadrant.

## Motion & Timing

The brand is a **still notebook page**, so motion is bookish, not swipey:

- **Cut grammar:** hard cuts between plates by default. When a transition is used, it is a *page-turn* — the incoming plate slides in from the right edge over 240–320ms, ease-out, with a subtle drop-shadow catch. Never wipes, never dissolves, never zoom-crash.
- **What may animate:** the wordmark stroke may draw on (600–900ms); a highlighter marker may swipe under the title once (240ms, left→right, ease-out); a checkbox may check in (120ms); a strength-bar arrow may glide once. **One motion per plate**, then still.
- **Never animate:** doodles (they are drawings, not sprites), the notebook shadow, the paper lines, the spiral rings.
- **Dwell:** hero/identity plates ≥ 2.4s. Focal-artifact plates ≥ 1.8s. Ledger plate ≥ 3.5s (density exception — the eye needs to read). Closer plate ≥ 2.0s.
- **Export:** 1920×1080 @ 30fps for landscape; ProRes 422 or H.264 high. No motion-blur.

## Frame Treatments

Seven plates. Every size, padding, and typography value references a frontmatter token — no ad-hoc numbers.

### 1 · Cover — Notebook Identity  (identity/cover · move: floating notebook, mega wordmark, pink-marker subtitle)
**Ground** `{colors.bg-radial-inner}` → `{colors.bg-radial-outer}` radial, padding:`{spacing.frame-pad}`.
**Container** single centered `{components.notebook-page}`, 76cqw wide × 82cqh tall, floating.
**Composes** `{components.notebook-page}`, `{components.spiral-binding}`, `{components.handle-tag}`, `{components.wordmark-mega}`, `{components.subtitle-marked-giant}`, `{components.star-doodle}`, `{components.cloud-doodle}`.
**Focal** `{components.wordmark-mega}` set in `{typography.wordmark-mega}` — "FRONTEND / PROJECT" on two lines, centered on the page.
**Chrome** `{components.subtitle-marked-giant}` centered beneath the wordmark; `{components.handle-tag}` at the page's top-right corner; `{components.spiral-binding}` down the left edge.
**Accent** the pink `{components.subtitle-marked-giant}` — the ONE marker voltage.
**Silence** ~68% empty (lined ivory below the subtitle).
**Fixed** notebook-page geometry, spiral, page radius, marker rounded.  **Free** wordmark text, subtitle string, doodle placement.
**Density** sparse.

### 2 · Editorial — Oversized Claim  (editorial/oversized-claim · move: hero handwritten line under a swept marker)
**Ground** `{components.notebook-page}` fills the frame (paper is the ground), padding:`{spacing.frame-pad}`.
**Container** vertical stack, centered, gap: `{spacing.loose}`.
**Composes** `{components.notebook-page}`, `{components.spiral-binding}`, `{components.section-head-marked}` (yellow background), `{components.display-hero}` OR `{components.wordmark-mega}` per word-count rule.
**Focal** the claim, set in `{typography.display-hero}` (≤6 words) or `{typography.wordmark-mega}` (≤3 words), centered, ≤78cqw wide.
**Chrome** a small `{components.section-head-marked}` (highlight-yellow) eyebrow above the claim, ≤22cqw wide.
**Accent** the yellow marker under the eyebrow — the one voltage.
**Silence** ~72% empty.
**Fixed** paper-line grid, ink weight, eyebrow marker shape.  **Free** claim string.
**Density** sparse.

### 3 · Focal Artifact — Password Display  (focal-artifact · move: one hero UI atom on empty ivory)
**Ground** `{components.notebook-page}`, padding:`{spacing.frame-pad}`.
**Container** centered stack, single row.
**Composes** `{components.notebook-page}`, `{components.spiral-binding}`, `{components.password-display}`, `{components.section-head-marked}` (yellow), `{components.paper-fold}`.
**Focal** `{components.password-display}` at 52cqw wide × 14cqh tall, centered vertically at ~54cqh; the readout uses `{typography.password-giant}`.
**Chrome** `{components.section-head-marked}` (highlight-yellow) above the artifact, ≤34cqw wide, reading "Generated password"; `{components.paper-fold}` at the top-right corner of the display box.
**Accent** the yellow marker on the eyebrow (one voltage).
**Silence** ~65% empty.
**Fixed** password-display border/shadow.  **Free** the password string (never invented — must come from the script).
**Density** sparse.

### 4 · Focal Numeral — Section Callout  (focal-artifact · move: giant colored badge is the plate)
**Ground** `{components.notebook-page}`, padding:`{spacing.frame-pad}`.
**Container** two-column horizontal split: 40% badge, 60% labeled text; centered vertically.
**Composes** `{components.notebook-page}`, `{components.spiral-binding}`, `{components.badge-numeral-giant}`, `{components.section-head-marked}`, and body text in `{typography.label-frame}`.
**Focal** `{components.badge-numeral-giant}` — a 14cqw circle in one of `{colors.badge-yellow|blue|orange|green}`, centered in the left column, bearing a single hand-drawn numeral in `{typography.numeral-giant}`.
**Chrome** to the right, a `{components.section-head-marked}` (matching-color highlight) with the section name; below it a two-line description in `{typography.label-frame}`.
**Accent** the badge's own fill is the voltage — the marker under the title is a *second* voltage but stays ≤22cqw wide so the badge dominates.
**Silence** ~60% empty.
**Fixed** badge stroke, badge/highlight color pairing (yellow-badge → yellow-highlight, etc).  **Free** numeral value 1–5, section string.
**Density** sparse.

### 5 · Ledger — 5-Section Grid  (data/ledger · move: the full notebook page — the density exception)
**Ground** `{components.notebook-page}`, padding:`{spacing.frame-pad}`.
**Container** 2-column grid, gap:`{spacing.gutter}`, with a hand-drawn central divider (`1.5px solid {colors.paper-line-alt}` — softer than card outline).
**Composes** `{components.notebook-page}`, `{components.spiral-binding}`, `{components.wordmark-header}`, `{components.subtitle-marked}`, five `{components.feature-card}`, five `{components.badge-numeral}`, five `{components.section-head-marked}` (yellow/blue/orange/green/green), and inside them: `{components.password-display}` (small), `{components.slider-track}` + `{components.slider-progress}` + `{components.slider-thumb}`, three `{components.checkbox-square}` + `{components.checkbox-label}`, `{components.button-copy}`, `{components.strength-bar}`.
**Focal** the whole grid — this plate breaks the one-idea rule *by design* because the notebook page itself is the subject.
**Chrome** `{components.wordmark-header}` + `{components.subtitle-marked}` at the top; `{components.paper-fold}` on 2–3 cards.
**Accent** five marker highlights, one per section — this is the ONE plate where multiple voltages coexist because they are *catalogued* voltages, not competing ones.
**Silence** *tight by design — the density exception* (~15% empty).
**Fixed** section order (1–5), badge-color/highlight pairing, feature-card outline.  **Free** the interior labels/strings.
**Density** dense-exception.

### 6 · Brand Signature — Strength Meter  (brand-signature · move: the one gradient in the system, hero-scaled)
**Ground** `{components.notebook-page}`, padding:`{spacing.frame-pad}`.
**Container** centered stack, gap:`{spacing.section}`.
**Composes** `{components.notebook-page}`, `{components.spiral-binding}`, `{components.section-head-marked}` (highlight-green), `{components.strength-bar-giant}`, a hand-drawn `→` arrow.
**Focal** `{components.strength-bar-giant}` — 66cqw wide × 6cqh tall, centered at ~58cqh. This is the only place the red→yellow→green gradient appears.
**Chrome** `{components.section-head-marked}` (highlight-green) above the bar, ≤30cqw wide ("Strength indicator"); a black hand-drawn arrow above the bar pointing at the current mark.
**Accent** the gradient itself is the voltage — no other marker fires at full strength on this plate.
**Silence** ~68% empty.
**Fixed** bar radius, gradient stops, border.  **Free** arrow position (script-driven).
**Density** sparse.

### 7 · Closer — Cast on the Page  (closer · move: laptop + speech + plant, one warm sign-off)
**Ground** `{components.notebook-page}`, padding:`{spacing.frame-pad}`.
**Container** horizontal composition, three anchor points: laptop (left third), speech bubble (upper center), plant (lower center-right); features list on the right third.
**Composes** `{components.notebook-page}`, `{components.spiral-binding}`, `{components.laptop-illustration}`, `{components.speech-bubble}`, `{components.plant-illustration}`, `{components.features-heading}`, four `{components.feature-row}` + `{components.feature-bullet}`.
**Focal** `{components.laptop-illustration}` at ~26cqw wide, its screen carrying the smiling face — this is the plate's warmth.
**Chrome** `{components.speech-bubble}` above the laptop with a short two-line message in `{typography.caption-frame}`; `{components.plant-illustration}` at ~7cqw wide to the right of the laptop; right column carries `{components.features-heading}` and a short bulleted list.
**Accent** the pink `{components.features-heading}` — one marker voltage.
**Silence** ~55% empty.
**Fixed** cast geometry, outline weight.  **Free** speech string, bullet strings.
**Density** standard.

## Do's and Don'ts

**Do**
- Lean centered — cover, editorial, focal-artifact, brand-signature, closer all center their focal element. Vary the anchor across a sequence (≤2 consecutive plates share anchor).
- One idea per plate; if a plate wants two things, that is two plates. (The ledger is the one exception.)
- Bleed the paper. The notebook page should sit ≥6cqw inside the safe edge on 16:9, but its shadow is allowed to touch the safe line.
- Ration doodles: header band 6–8, middle 2–4, bottom 8–12. Every doodle sits ≥2cqw from any headline, badge, or marker.
- Keep the marker asymmetric — never a clean rounded rectangle behind text.
- Full-bleed on a cadence — every 3–4 plates one plate lets an atom (giant wordmark, giant badge, giant strength bar) own the whole page.

**Don't**
- No dark backgrounds; no glassmorphism; no glossy 3D; no metallic UI; no neon.
- No decorative doodle overlaps a headline, badge, or marker (2cqw keep-out).
- No new hexes, no new radii, no new fonts.
- No gradient anywhere except `strength-bar` and the background radial.
- No top-left kicker eyebrow on every plate — the eyebrow marker is a *sometimes* tool, not a template.
- No perfect vector geometry; every long outline carries the ±1–2° hand-drawn micro-shimmer.
- No web chrome (nav, breadcrumbs, cookie bar) as a treatment.

## Aspect-Ratio Behavior

Every treatment reflows across the three ratios. The notebook-page rectangle rescales so it still floats with `{spacing.frame-pad}` of ground on the short edge. No load-bearing type drops below the 1.4cqw floor.

| Treatment | 16:9 (1920×1080) | 9:16 (1080×1920) | 1:1 (1080×1080) |
|---|---|---|---|
| 1 · Cover | Notebook 76cqw × 82cqh; wordmark two-line centered; handle top-right; header doodles across a horizontal band. | Notebook 86cqw × 78cqh (portrait — closest to source); wordmark two-line at full 18cqw; doodles arc across the wider header. | Notebook 86cqw × 86cqh; wordmark two-line; step to `display-hero` if the frame feels tight. |
| 2 · Editorial | Claim ≤78cqw, one to two lines, `display-hero`. Eyebrow above. | Claim wraps to 2–3 lines at 82cqw; step down to `subtitle-giant` at 6.5cqw for 4-line claims. | Claim ≤78cqw, 2 lines max. |
| 3 · Focal Artifact | Password box 52cqw × 14cqh, centered. | Box 74cqw × 12cqh, centered vertically higher (36cqh from top). | Box 62cqw × 14cqh. |
| 4 · Focal Numeral | 40/60 horizontal split. Badge 14cqw, label right. | Vertical stack: badge top (18cqw), label below centered. | Vertical stack: badge 16cqw, label below. |
| 5 · Ledger | 2-column grid, five cards, gap 4cqw. | Single column, five stacked cards, wordmark shrinks to `subtitle-giant`. Gutter divider becomes a horizontal rule between cards. | 2-column, 3+2 stagger; last card centered under. |
| 6 · Brand Signature | Bar 66cqw × 6cqh, centered at 58cqh; eyebrow above. | Bar 78cqw × 5cqh; eyebrow above; arrow above the bar with more vertical breathing. | Bar 74cqw × 6cqh. |
| 7 · Closer | Laptop left, plant right of laptop, speech above; features list on right third. | Cast top half, features list stacked below the cast. | Cast on the top-left diagonal, features list on the bottom-right diagonal. |

## Approved Real Entities & Numerals

The only real entities that may appear in this brand's frames without invention:

- The source handle `@shahzaibnawaz` (right-header on cover-style plates). Any other handle is script-driven.
- The five section labels the source names: **Generated password display box**, **Length slider**, **Checkboxes for**, **Copy to clipboard button**, **Strength indicator**.
- The three checkbox rows: **UPPERCASE**, **NUMBERS**, **SYMBOLS**.
- The features list: **Custom length · Character options · Copy function · Strength meter**.
- The speech string: **"Keep Coding / Keep Growing!"**

**Never invent** a stat, a percentage, a slider tick number, a strength percent, a password string not supplied by the script, or a new handle. If the script does not supply a figure, the frame carries the placeholder `— figure —` and the plate ships without it.

## Pre-Render Self-Audit

Before finalizing any frame, walk this list:

- [ ] **Squint** — one focal element at 3–6× its neighbors?
- [ ] **Silence** — sparse plate 55–75% empty? (ledger exempt)
- [ ] **Restraint / voltage** — one marker highlight at full strength? (ledger exempt)
- [ ] **Ink weight** — outlines 2.2–3px, `#171719`, no gray softening?
- [ ] **Depth** — only the notebook-shadow (blurred) and lavender offset (unblurred)? No gradients except `strength-bar` and the ground radial?
- [ ] **Geometry** — uneven card radius on feature-cards, asymmetric marker radius on highlights, dramatic right corners on notebook-page?
- [ ] **Anchor** — centered by default; anchor varied vs. the previous plate?
- [ ] **Element count** — ≤2–3 distinct elements? (ledger exempt)
- [ ] **Legibility floor** — every load-bearing line ≥1.4cqw?
- [ ] **Doodle keep-out** — no doodle overlapping a headline / badge / marker (≥2cqw)?
- [ ] **Handle & numerals** — every real entity/numeral in the frame is on the approved list or comes from the script?

## Known Gaps

- **`cqw` as string.** The DESIGN.md spec expects atomic tokens in px/em/rem. This frame.md carries frame-scale sizes as `cqw`-suffixed strings — a documented extension of the spec's "consumer stores as string" tolerance. Rendering agents must not resolve `cqw` to `vw` (would break contact-sheet review); they should route it through `container-type: size` on the frame element.
- **Aspect re-scales are guidance.** The 9:16 and 1:1 reflows in the table above describe intent — a script may push a headline longer, and the fit-to-measure rule (word count → ramp step) overrides the numeric hint.
- **Hand-drawn imperfection is derived.** ±1–2° rotation and ±2px baseline shimmer are stated as targets, not tokens; they cannot live in structured tokens and must be applied at render time.
- **Doodles are not enumerated as components.** `star-doodle`, `cloud-doodle`, `sparkle-doodle` are atoms; each concrete doodle placement is a render-time decision governed by the doodle-distribution rule.
- **Handwriting fonts.** `Patrick Hand`, `Schoolbell`, `Kalam`, `Comic Neue` are the intent; consumer environments substitute nearest available. The rendered showcase falls back gracefully.
