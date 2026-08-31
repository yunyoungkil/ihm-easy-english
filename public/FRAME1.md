---
# ─────────────────────────────────────────────────────────────
# frame.md — video-first companion to design.md
# atoms are sacred · composition is free · numbers come from the script
# ─────────────────────────────────────────────────────────────

colors:
  # Core Neo-Brutalist (from design.md §2.1 / §10) — verbatim
  black:            "#000000"
  white:            "#FFFFFF"
  paper:            "#F5F5DC"
  teal:             "#00C2C8"
  magenta:          "#FF00FF"
  yellow:           "#FFD700"
  success:          "#28C76F"
  danger:           "#FF3B30"
  muted:            "#D9D9D9"

  # Editorial Roadmap (§16) — verbatim
  editorial-paper:       "#F2EEE5"
  editorial-paper-light: "#F8F5EE"
  editorial-ink:         "#171815"
  editorial-olive:       "#4F6045"
  editorial-olive-dark:  "#374330"
  editorial-sage:        "#7C8A72"
  editorial-warm-gray:   "#B8B0A4"
  editorial-line:        "#353A31"
  editorial-note:        "#E8DFC9"

  # Swiss Geometric (§40) — verbatim
  swiss-paper:      "#F4F1EC"
  swiss-black:      "#111111"
  swiss-blue:       "#1769AA"
  swiss-yellow:     "#FFC515"
  swiss-orange:     "#F04416"
  swiss-green:      "#119B67"
  swiss-pink:       "#EFA0B6"
  swiss-gray:       "#D8D5CF"

  # Visual Sketchnote (§57) — verbatim
  sketch-paper:        "#FAF9F5"
  sketch-ink:          "#171717"
  sketch-orange:       "#F5A23A"
  sketch-blue:         "#4EA5D9"
  sketch-gray:         "#D8D8D3"
  sketch-light-orange: "#F8D39C"
  sketch-light-blue:   "#C9E6F5"

  # Vintage Plate (§98) — verbatim
  plate-paper:       "#EEE3C7"
  plate-paper-light: "#F6EEDC"
  plate-ink:         "#28251F"
  plate-navy:        "#40556A"
  plate-slate:       "#667889"
  plate-olive:       "#78805C"
  plate-brass:       "#B08A4A"
  plate-rust:        "#A95D3D"
  plate-green:       "#557A51"
  plate-muted-red:   "#A85A55"

typography:
  # ── Reading ramp (from design.md §2.2 / §35, verbatim px + cqw at 1920) ──
  h1:            { fontSize: "96px",  cqw: "5.0cqw",  weight: 900, tracking: "-0.02em", lineHeight: 1.02 }
  h2:            { fontSize: "64px",  cqw: "3.33cqw", weight: 900, tracking: "-0.02em", lineHeight: 1.05 }
  h3:            { fontSize: "48px",  cqw: "2.5cqw",  weight: 800, tracking: "-0.02em", lineHeight: 1.10 }
  h4:            { fontSize: "32px",  cqw: "1.67cqw", weight: 800, tracking: "-0.01em", lineHeight: 1.20 }
  body:          { fontSize: "18px",  cqw: "0.94cqw", weight: 500, lineHeight: 1.55 }
  caption:       { fontSize: "14px",  cqw: "0.73cqw", weight: 500, lineHeight: 1.45 }

  # ── Frame-native display / hero ramp — NEW at frame scale (cqw) ──
  wordmark-mega:    { fontSize: "28cqw",  weight: 900, tracking: "-0.055em", lineHeight: 0.84 }
  display-hero:     { fontSize: "14cqw",  weight: 900, tracking: "-0.045em", lineHeight: 0.90 }
  display-editorial:{ fontSize: "9.5cqw", weight: 900, tracking: "-0.035em", lineHeight: 0.95 }
  section-head:     { fontSize: "4.2cqw", weight: 900, tracking: "-0.02em",  lineHeight: 1.02 }
  card-target:      { fontSize: "5.2cqw", weight: 900, tracking: "-0.02em",  lineHeight: 1.00 }
  card-answer:      { fontSize: "3.6cqw", weight: 800, tracking: "-0.01em",  lineHeight: 1.05 }
  step-numeral:     { fontSize: "2.2cqw", weight: 900, tracking: "-0.02em",  lineHeight: 1.00 }
  stat-ledger:      { fontSize: "6.5cqw", weight: 900, tracking: "-0.03em",  lineHeight: 0.95 }
  eyebrow-chrome:   { fontSize: "1.4cqw", weight: 800, tracking:  "0.14em",  lineHeight: 1.20, transform: uppercase }
  colophon:         { fontSize: "1.4cqw", weight: 500, tracking:  "0.02em",  lineHeight: 1.35 }
  handwritten:      { fontSize: "2.2cqw", weight: 400, lineHeight: 1.30, family: "Nanum Pen Script, cursive" }

  # ── Legibility floor ──
  # any load-bearing line ≥ 1.4cqw (≈27px @ 1920). smaller sizes are chrome/colophon only.

rounded:
  none: "0"           # from --radius-none
  sm:   "4px"         # from --radius-sm
  md:   "8px"         # from --radius-md
  card-soft: "12px"   # from Editorial Roadmap card (§20.2)
  pill:  "999px"      # number-badge circle

spacing:
  # Base 4px scale (from §2.3) — verbatim
  s1: "4px"
  s2: "8px"
  s3: "12px"
  s4: "16px"
  s6: "24px"
  s8: "32px"
  s12: "48px"
  s16: "64px"
  s24: "96px"
  # Frame-scale
  frame-pad:       "5cqw"
  frame-pad-tight: "3.5cqw"
  keepout:         "2cqw"
  rule-thin:       "2px"
  rule:            "3px"
  rule-heavy:      "4px"
  offset-1:        "4px"
  offset-2:        "8px"
  offset-3:        "12px"

components:
  # ── Buttons (§4.1) ──
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor:       "{colors.black}"
    border:          "3px solid {colors.black}"
    shadow:          "4px 4px 0 {colors.black}"
    padding:         "12px 16px"
    typography:      "{typography.h4}"
    rounded:         "{rounded.sm}"
  button-primary-giant:
    backgroundColor: "{colors.teal}"
    textColor:       "{colors.black}"
    border:          "0.35cqw solid {colors.black}"
    shadow:          "0.7cqw 0.7cqw 0 {colors.black}"
    padding:         "1.4cqw 2.6cqw"
    typography:      "{typography.section-head}"
    rounded:         "{rounded.sm}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor:       "{colors.black}"
    border:          "3px solid {colors.black}"
    typography:      "{typography.h4}"
    padding:         "12px 16px"

  # ── Card (§5.1) ──
  card-brutal:
    backgroundColor: "{colors.paper}"
    border:          "3px solid {colors.black}"
    shadow:          "4px 4px 0 {colors.black}"
    padding:         "16px"
  card-brutal-giant:
    backgroundColor: "{colors.paper}"
    border:          "0.35cqw solid {colors.black}"
    shadow:          "0.75cqw 0.75cqw 0 {colors.black}"
    padding:         "3cqw"
  card-editorial:
    backgroundColor: "{colors.editorial-paper-light}"
    border:          "1.5px solid {colors.editorial-line}"
    shadow:          "none"
    rounded:         "{rounded.card-soft}"
    padding:         "24px"

  # ── Badge (§5.3) ──
  badge-new:     { backgroundColor: "{colors.black}",   textColor: "{colors.white}", border: "2px solid {colors.black}", padding: "4px 8px", typography: "{typography.eyebrow-chrome}" }
  badge-alert:   { backgroundColor: "{colors.magenta}", textColor: "{colors.black}", border: "2px solid {colors.black}", padding: "4px 8px", typography: "{typography.eyebrow-chrome}" }
  badge-warning: { backgroundColor: "{colors.yellow}",  textColor: "{colors.black}", border: "2px solid {colors.black}", padding: "4px 8px", typography: "{typography.eyebrow-chrome}" }
  badge-info:    { backgroundColor: "{colors.teal}",    textColor: "{colors.black}", border: "2px solid {colors.black}", padding: "4px 8px", typography: "{typography.eyebrow-chrome}" }

  # ── Step number badge (§21) — frame-scale variant ──
  step-number:
    backgroundColor: "{colors.editorial-olive-dark}"
    textColor:       "{colors.white}"
    size:            "48px"
    typography:      "{typography.h4}"
    rounded:         "{rounded.pill}"
  step-number-giant:
    backgroundColor: "{colors.editorial-olive-dark}"
    textColor:       "{colors.white}"
    size:            "3.6cqw"
    typography:      "{typography.step-numeral}"
    rounded:         "{rounded.pill}"

  # ── Flashcard (§149) — the reusable learning atom, frame-scale ──
  flashcard:
    backgroundColor: "{colors.sketch-paper}"
    border:          "0.28cqw solid {colors.sketch-ink}"
    rounded:         "0.9cqw"
    padding:         "2.4cqw"
    textColor:       "{colors.sketch-ink}"
  flashcard-brutal:
    backgroundColor: "{colors.paper}"
    border:          "0.35cqw solid {colors.black}"
    shadow:          "0.6cqw 0.6cqw 0 {colors.black}"
    rounded:         "0"
    padding:         "2.4cqw"
    textColor:       "{colors.black}"

  # ── Annotation marker (§123 highlight, §128 stress) ──
  marker-highlight-orange:
    backgroundColor: "{colors.sketch-orange}"
    textColor:       "{colors.sketch-ink}"
    padding:         "0 0.4cqw"
  marker-highlight-blue:
    backgroundColor: "{colors.sketch-blue}"
    textColor:       "{colors.sketch-ink}"
    padding:         "0 0.4cqw"

  # ── Eyebrow rail (kicker chip) ──
  eyebrow-chip:
    backgroundColor: "{colors.black}"
    textColor:       "{colors.white}"
    padding:         "0.4cqw 0.9cqw"
    typography:      "{typography.eyebrow-chrome}"
    rounded:         "0"

  # ── Rule (the black hairline that partitions the frame) ──
  rule-heavy:
    backgroundColor: "{colors.black}"
    height:          "0.35cqw"

  # ── Ledger cell (compare-and-contrast dish) ──
  ledger-cell:
    backgroundColor: "{colors.paper}"
    border:          "0.28cqw solid {colors.black}"
    padding:         "2.2cqw"
    textColor:       "{colors.black}"

  # ── Sticky note (§25) ──
  sticky-note:
    backgroundColor: "{colors.editorial-note}"
    padding:         "1.4cqw"
    typography:      "{typography.handwritten}"
    shadow:          "0.15cqw 0.25cqw 0.6cqw rgba(0,0,0,0.12)"
---

# frame.md

> **atoms are sacred · composition is free · numbers come from the script.**
>
> This is the video-first companion to `design.md`. `design.md` remains the source of
> truth for the product/web context; `frame.md` re-frames the same atoms so the
> **1920×1080 frame** — not the page — is the unit. Every hex, weight, radius and shadow
> in the frontmatter is copied verbatim from `design.md` §2–§10, §16, §40, §57, §98.
> Nothing new is invented. What is new is **scale, composition, and cadence**.

## 1 · Overview

The system is loud on structure, quiet on decoration. In frame form it reads as
**thick black rules · squared corners · paper grounds · one voltaged accent per frame**.
The brand ships four visual dialects for four information jobs (§55, §73):

- **Core Neo-Brutalist** — interaction beats: covers, CTA plates, quiz reveals.
- **Editorial Roadmap** — sequence beats: numbered steps, curricula.
- **Swiss Geometric** — concept beats: one oversized claim + one primary shape.
- **Visual Sketchnote / Plate / Annotation** — explanation beats: relationships, anatomy, marked-up source text.

A sequence may cross dialects, but **one beat = one dialect** — never blend two on the
same frame.

### Frame Craft Bar
Every frame is gated by four eyeball tests before any structural check:

- **Squint test.** One element dominates at **3–6×** its nearest neighbor. A chasm, not a ramp.
- **Silence test.** Sparse archetypes (cover, claim, focal-artifact, closer) read **55–75% empty.** The one dense exception is the **ledger / roadmap catalog** — density there is the point.
- **Restraint test.** The brand's scarce voltage fires **once per frame**: one accent color OR one hard black offset shadow OR one full-bleed color ground. If two want to fire at full strength, demote one.
- **Reference bar.** Aim: a Swiss foundry specimen page or a Rams-era Braun manual plate. Failure mode: a SaaS pitch deck with a headline parked top-left, a floating illustration parked top-right, gutter between, and a rounded-pill CTA in the corner.

---

## 2 · Colors

Colors carry over from `design.md` **verbatim**. At frame scale two rules change:

- **Grounds are full-bleed, not tinted panels.** A frame's ground is `{colors.paper}` or `{colors.swiss-paper}` or `{colors.editorial-paper}` edge-to-edge. A ground token used only for a card behind other cards is a web reflex — at frame scale the ground *is* the frame.
- **Accent is rationed to one voltage per frame.** `{colors.teal}` OR `{colors.magenta}` OR `{colors.yellow}` — never two at full strength. `{colors.magenta}` is the highest voltage and appears only on alert/exception beats. Everything else (rules, headlines, chrome) is `{colors.black}` on paper.

Dialect palettes stay in their lane: a Swiss Geometric frame draws from `{colors.swiss-*}` only; a plate frame draws from `{colors.plate-*}` only. Mixing accent systems on a single frame is the visual equivalent of the rainbow flashcard the source explicitly bans (§145, §147).

---

## 3 · Typography

Two ramps live in the frontmatter:

- **Reading ramp** — the `h1`…`caption` steps from `design.md §2.2 / §35`, each carrying its px-to-cqw conversion. Reserved for editorial rails, ledger rows, colophons, and the rare frame that carries running body copy.
- **Display / hero ramp** — frame-native cqw sizes (`wordmark-mega` at 28cqw down to `eyebrow-chrome` at 1.4cqw). These sizes only exist on video: a 28cqw wordmark is ~540px — impossible on a web card, essential on a cover.

**Legibility floor.** Any load-bearing line is ≥ **1.4cqw (≈27px @ 1920)**. `{typography.eyebrow-chrome}` and `{typography.colophon}` sit exactly on the floor and are chrome-only — they may not carry a beat's meaning.

**Fit-to-measure headlines.** Headline size is a function of line length, not a fixed step. Cap the headline text block at **≤ 78cqw wide** and step the display ramp by word count: ≤ 3 words → `{typography.wordmark-mega}` or `{typography.display-hero}`; 4–6 words → `{typography.display-editorial}`; 7+ words → `{typography.section-head}`. Short lines go big, long lines go small — never let the type kiss the safe margin.

Weight lives on the ceiling: **900** for wordmark and hero, **800** for section heads and CTA. **500** is the body floor; anything lighter is banned (§37 MUST).

---

## 4 · Layout — The Frame

**Primary canvas: 1920×1080 (16:9).** Alt: 1080×1920 (9:16) and 1080×1080 (1:1).

**Safe area.** `{spacing.frame-pad}` (5cqw ≈ 96px on the long edge). No load-bearing text or focal element crosses the safe boundary. Decorative shapes may bleed off-frame (§42 MUST) — text may not.

**The vw law.** Frame-scale sizes are authored in `cqw` in this document; the showcase renders them as `cqw` against a `container-type: size` frame so the same values produce a true 16:9 composition at any display size. `px ÷ 1920 × 100 = cqw`.

**Grid.** Asymmetric by default. A single invisible column-and-row grid still governs — no element floats untethered. Center-lean for hero/cover/focal-artifact/closer; reserve left-anchor for editorial/catalog frames; use right/asymmetric as an occasional tension beat. No more than ~2 consecutive frames share an anchor.

---

## 5 · Elevation & Depth

The depth ceiling is **`{spacing.offset-2}` (8px @ 1920, ≈0.42cqw)** for chrome atoms and up to **0.75cqw** for frame-scale hero cards. Beyond that a shadow reads as SaaS drop-shadow, not brutalist offset.

**Allowed:** hard offset shadow (no blur), one per frame at full strength.
**Banned:** Material blur, glassmorphism, glow, gradients, inner shadows (§12 MUST NOT, §42, §53).

Editorial Roadmap and Plate dialects use **no shadow** (§20.2, §98) — depth comes from the thin ink rule alone.

---

## 6 · Shapes

Radius scale carries over verbatim (`{rounded.none}` / `{rounded.sm}` / `{rounded.md}`), plus `{rounded.card-soft}` for editorial cards and `{rounded.pill}` for the step number (§21). Default is `{rounded.none}` — squared corners are the brand.

CTA geometry: rectangular with 4px radius max. Rounded-pill CTAs are explicitly banned (§12 MUST NOT).

Swiss dialect adds the geometric vocabulary (§41): circle, half-circle, rectangle, triangle, stripe. These are *information*, not decoration — one shape = one meaning across a sequence (§48).

---

## 7 · Components

Every buildable unit lives in the frontmatter `components:` block. Prose here describes each unit's **intent, when-to-use, and any non-token construction** — never re-listing resolved values.

- **`{components.button-primary}` / `{components.button-primary-giant}`** — the teal-fill / black-outline / hard-offset CTA. The web variant is for embedded product screens shown in a frame; the giant variant is for closer / CTA frames where the button *is* the focal element.
- **`{components.card-brutal}` / `{components.card-brutal-giant}`** — paper card with black rule and offset shadow. The giant variant is the identity/cover chassis and the flashcard-brutal parent.
- **`{components.card-editorial}`** — the quieter roadmap card (§20.2). Thin rule, soft radius, no shadow. Used only in the numbered-step catalog treatment.
- **`{components.flashcard}` / `{components.flashcard-brutal}`** — the reusable one-concept unit (§143). Renders spelling → sound, rule → exception, quiz → reveal. Two variants: soft (sketch dialect) and brutal (core dialect).
- **`{components.badge-*}`** — new / alert / warning / info chips. Small, high-contrast, black-outlined; used as a single kicker per frame (never a rail of four).
- **`{components.eyebrow-chip}`** — the top-left kicker rail. Rationed: appears on a minority of frames, never the default.
- **`{components.step-number-giant}`** — olive-dark circle overlapping the corner of a step card (§21 Placement). Same size across every card in a sequence — never varies.
- **`{components.rule-heavy}`** — the black hairline. The brand's most versatile atom: it partitions a frame, underlines a claim, or forms the ground of a ledger.
- **`{components.ledger-cell}`** — the paper cell of a compare-and-contrast plate (§154). Border-hairline, no shadow — density is carried by the grid, not by depth.
- **`{components.marker-highlight-orange}` / `{components.marker-highlight-blue}`** — the annotation layer (§123): orange for stress/sound, blue for linking/reduction. Sits *behind* the source text; text remains black and readable.
- **`{components.sticky-note}`** — the tilted paper note (§25) that carries a handwritten short line. Never carries load-bearing information.

Treatments compose these units and specify only placement, size ratio, and which frontmatter tokens vary. A treatment never re-declares construction.

---

## 8 · Motion & Timing

Motion is short and direct (§9). The brand's cut grammar is derived from its character: **the type is loud, the motion is quiet.**

- **Cut, don't dissolve.** Between beats, cut. Between annotation layers within one beat, reveal at 150–250ms (§138 highlight-swipe range).
- **What may animate:** highlight swipe, underline draw, marker sweep, circle draw, arrow draw, card enter, answer reveal, shape merge/split (§52 Swiss motion, §138 annotation motion). All within 150–450ms.
- **What must not animate:** the wordmark, the black rule, the ground color, the safe-area padding. These are architecture.
- **Dwell.** Sparse frames dwell **2.0–3.0s**; dense/ledger frames dwell **4.0–6.0s** so the eye can catalog. A frame that carries a stat number gets an extra beat.
- **Element count drives pace.** Fewer elements → faster cadence. Dwell is not shortened by adding motion — it is shortened by removing elements.
- **Export.** 24fps for editorial pacing, 30fps for shorts. Never 60fps on this brand — the frame is a poster, not a screen.

---

## 9 · Frame Treatments

Six recipe plates, each composing frontmatter components. Every size a treatment names references a frontmatter token. Volatile copy is a placeholder — the script fills it.

### 1 · Wordmark Cover  (identity/cover · move: giant centered wordmark on paper, single eyebrow chip)
**Ground** `{colors.paper}`, padding `{spacing.frame-pad}`.
**Container** flex column, `justify-content: center`, `align-items: center`, gap `2.2cqw`.
**Composes** `{components.eyebrow-chip}`, `{components.rule-heavy}`.
**Focal** the wordmark set in `{typography.wordmark-mega}`, centered, letterform-tight — occupies the middle band of the frame.
**Chrome** a single `{components.eyebrow-chip}` above the wordmark ("ISSUE — 01"), and one `{components.rule-heavy}` at 42cqw wide directly below the wordmark; colophon in `{typography.colophon}` at bottom-center.
**Accent** none — the frame is black on paper. The voltage is the *size* of the type.
**Silence** ~65% empty.
**Fixed** wordmark centered, `{typography.wordmark-mega}` size, `{colors.paper}` ground. **Free** the wordmark string (1–2 words), the chip text, the colophon line.
**Density** sparse.

### 2 · Oversized Claim  (editorial/oversized-claim · move: full-bleed color ground + one hero line + one primary shape cropped off-edge)
**Ground** `{colors.swiss-yellow}` full-bleed, padding `{spacing.frame-pad}`.
**Container** absolute layer + centered flow. Hero anchored to the left third at optical center.
**Composes** `{components.rule-heavy}` (as a bottom index bar).
**Focal** a 1–3 word claim in `{typography.display-hero}` (14cqw), color `{colors.swiss-black}`, left-anchored, text block ≤ 78cqw wide.
**Chrome** small metadata cluster in `{typography.eyebrow-chrome}` at bottom-left (issue · series · date), separated by a 60cqw `{components.rule-heavy}` above.
**Accent** one large `{colors.swiss-black}` **circle** at 42cqw diameter, cropped 40% off the right edge of the frame — the geometric voltage. Keep-out `{spacing.keepout}` from the headline.
**Silence** ~55% empty on the left half; the right half is owned by the crop.
**Fixed** the crop-off-edge move, the yellow ground, one shape only. **Free** headline string, metadata, whether the shape is circle / half-circle / rectangle (§41).
**Density** sparse.

### 3 · Anatomy Plate  (focal-artifact · move: centered flat illustration surrounded by leader-line labels)
**Ground** `{colors.plate-paper}`, padding `{spacing.frame-pad}`.
**Container** grid, illustration owns the visual center 46cqw × 46cqw.
**Composes** `{components.rule-heavy}` (as top hairline + colophon rule).
**Focal** the artifact rendered as a flat side-cutaway silhouette in `{colors.plate-navy}` with a fine `{colors.plate-ink}` outline, occupying the central 46cqw × 46cqw block.
**Chrome** four labels around the artifact in `{typography.eyebrow-chrome}` (`{colors.plate-ink}`), each with a 0.15cqw leader line ending in a 0.5cqw filled dot on the artifact; labels arranged NE, E, SW, W so leaders never cross. `{typography.section-head}` title above the top hairline; 2-line specimen colophon below the bottom hairline in `{typography.colophon}`.
**Accent** one label — the learning target — gets a single `{colors.plate-rust}` dot; the others remain `{colors.plate-ink}`.
**Silence** ~60% empty (the surround of the artifact is the point).
**Fixed** viewpoint identical across compare-plate variants, illustration always in center, leaders never cross. **Free** which artifact, which four labels are called out.
**Density** sparse.

### 4 · Compare Ledger  (data/ledger · move: side-by-side identical cells, only the diagnostic differs)
**Ground** `{colors.paper}`, padding `{spacing.frame-pad-tight}`.
**Container** grid, 2 columns × 1 row, gap `2cqw`; each cell fills 43cqw × 60cqw.
**Composes** `{components.ledger-cell}` ×2, `{components.rule-heavy}` (as top rule and column divider), `{components.eyebrow-chip}`.
**Focal** each cell carries: a `{typography.card-target}` label (top), a `{typography.stat-ledger}` numeral or IPA glyph (center), a `{typography.body}` short caption (bottom). The *difference* between the two cells is the story — one cell might carry a `{colors.teal}` block behind its numeral, the other a `{colors.muted}` block.
**Chrome** a shared `{typography.section-head}` above, spanning both cells ("A vs B"). A single `{components.eyebrow-chip}` at top-left ("COMPARE") — rationed, appears only here in the sequence.
**Accent** one cell only carries the `{colors.teal}` block behind its numeral — the diagnostic. The other cell has `{colors.muted}` in the same slot to make absence visible.
**Silence** tight by design — the density exception. ~30% empty.
**Fixed** identical cell geometry, identical label position, identical numeral size. **Free** which two things are compared, which cell wins the accent.
**Density** dense-exception.

### 5 · Numbered Steps Catalog  (chrome/catalog · move: 2×2 grid of numbered cards on paper — the roadmap contact sheet)
**Ground** `{colors.editorial-paper}`, padding `{spacing.frame-pad}`.
**Container** grid, 2 columns × 2 rows, gap `2.4cqw` × `4cqw` (§19).
**Composes** `{components.card-editorial}` ×4, `{components.step-number-giant}` ×4, `{components.rule-heavy}`.
**Focal** four `{components.card-editorial}` cards, each 42cqw × 24cqw. Each card carries a `{components.step-number-giant}` overlapping its top-left corner (per §21 Placement), a `{typography.h3}` step title, and 3 short `{typography.body}` bullets — the §27 density cap.
**Chrome** the section header at top-left in `{typography.section-head}` (`{colors.editorial-ink}`), and a 20cqw `{components.rule-heavy}` at `{colors.editorial-olive-dark}` under the title. A dotted `{colors.editorial-olive-dark}` path (`stroke-dasharray: 0.4cqw 0.5cqw`) weaves between the cards *behind them* (§22) — never crossing card text.
**Accent** the four `{components.step-number-giant}` badges — the only voltage in the frame, all in the same `{colors.editorial-olive-dark}`. Badges never change color per step (§21 Do Not).
**Silence** dense by design. ~25% empty. This is the one dense-exception treatment.
**Fixed** number-badge size and color across all cards, identical card geometry, dotted path lives behind. **Free** step titles, bullet content, whether 4 or 6 cards.
**Density** dense-exception.

### 6 · Flashcard Reveal  (brand-signature · move: single paper card on paper — "one card = one target")
**Ground** `{colors.sketch-paper}`, padding `{spacing.frame-pad}`.
**Container** flex, centered, single child at 44cqw × 52cqw.
**Composes** `{components.flashcard-brutal}`, `{components.marker-highlight-orange}`.
**Focal** the flashcard occupies the visual center. Inside: a small `{typography.eyebrow-chrome}` category label at top (e.g. "SPELLING → SOUND"), a `{typography.card-target}` target line just below (e.g. "PH"), a `{typography.display-editorial}` example word at the vertical middle (e.g. "PHONE"), and a `{typography.card-answer}` sound line near the bottom (e.g. "/f/").
**Chrome** none inside the frame — the card is the whole composition. A tiny `{typography.colophon}` deck-index at bottom-right of the frame ("03 / 08"), outside the card.
**Accent** one `{components.marker-highlight-orange}` block behind the sound line only — the pronunciation voltage. The target and example remain black on paper.
**Silence** ~70% empty of the frame; ~30% empty inside the card.
**Fixed** card geometry, four-line anatomy (category → target → example → answer), one accent behind the answer only. **Free** the four strings, whether the accent is orange (sound) or blue (linking) per §147 semantics.
**Density** sparse.

---

## 10 · Do's and Don'ts

**Do.**
- Ration the eyebrow chip. It is a deck reflex; use it on a minority of frames, never every frame.
- Bleed the focal element. On oversized-claim and focal-artifact, let the primary shape crop off-edge (§42). Even margins on all four sides is the slide tell.
- Full-bleed on a cadence. Every 3–4 frames one element owns the whole frame. Full-bleed is a *cadence tool*, not the default.
- Vary the composition axis every consecutive frame. Never run the same L/R split twice in a row.
- Keep the black rule doing structural work — under a wordmark, dividing a compare cell, framing a plate.
- One idea per frame. Two ideas → two frames.

**Don't.**
- Same layout every frame (headline left, graphic right, kicker top-left) — the #1 deck tell.
- Decorative motif over the headline. Decorations live in empty quadrants with `{spacing.keepout}` clearance from the headline and eyebrow rail.
- Two accent colors at full voltage. Ration to one per frame.
- Rounded-pill CTAs, glassmorphism, gradient fills, Material blur shadows.
- Handwritten face for load-bearing information. `{typography.handwritten}` is a sticky-note voice only (§33 Critical Rule).
- Dialect mixing on a single frame — a Swiss geometric shape on an Editorial Roadmap card is a category error.

---

## 11 · Aspect-Ratio Behavior

| Treatment | 16:9 (primary) | 9:16 | 1:1 |
|---|---|---|---|
| 1 · Wordmark Cover | wordmark centered, `wordmark-mega` at 28cqw | wordmark drops to `display-hero` (14cqw), stacks on 3 lines if needed; chip above, colophon below | wordmark at 22cqw, chip above, colophon below |
| 2 · Oversized Claim | headline left, shape crop-right off-edge | headline stacks 3 lines top-third, shape crops off-bottom-edge | headline top-left, shape crop-right; ratio favors near-square shape footprint |
| 3 · Anatomy Plate | 46cqw center artifact, 4 labels NE/E/SW/W | artifact scales to 66cqw wide, labels re-stack as 2 above + 2 below | artifact centered, labels at N/E/S/W |
| 4 · Compare Ledger | 2 columns side-by-side | 2 rows stacked; column divider becomes horizontal rule | 2 columns retained, `stat-ledger` drops from 6.5cqw to 5.2cqw |
| 5 · Numbered Steps Catalog | 2×2 grid, dotted path S-curve | 1×4 vertical stack, dotted path becomes single vertical line (§28 mobile) | 2×2 retained, card height drops |
| 6 · Flashcard Reveal | single card 44×52cqw centered | single card 76cqw wide × 60cqh tall | card 60cqw × 60cqh, four-line anatomy unchanged |

Safe area on the short edge is retained at `{spacing.frame-pad}` in all ratios. Load-bearing lines never drop below the 1.4cqw floor.

---

## 12 · Approved Real Entities & Numerals

- Palette hexes as listed in `colors:` — verbatim.
- Font families: `Inter`, `Pretendard`, `Noto Sans KR`, `Gmarket Sans`, `Arial Black`, `Nanum Pen Script` (§33 §17 §64).
- Radius / shadow / spacing scale — verbatim from `design.md §2.3–§2.5`.
- Any figure that appears on a frame (a stat, a percentage, an IPA glyph, a step count) **comes from the script** — never invented by the frame. Placeholder is `— figure —`.

---

## 13 · Pre-Render Self-Audit

Before finalizing a frame, run this gate:

- [ ] **Squint** — one focal element dominates at 3–6× its nearest neighbor.
- [ ] **Silence** — sparse frame reads 55–75% empty (or is the named dense exception).
- [ ] **Restraint** — one accent voltage OR one hard offset OR one color-block ground fires at full strength; the others are demoted.
- [ ] **Weight** — display type is 900; body is ≥500; no light weights on load-bearing text.
- [ ] **Depth** — no blur, no gradient, no glassmorphism; offset shadow ≤ 0.75cqw.
- [ ] **Geometry** — squared corners default; radius scale respected; no rounded-pill CTAs.
- [ ] **Anchor** — center-lean where prescribed; no more than 2 consecutive frames share an anchor.
- [ ] **Element count** — ≤ 2–3 distinct elements per frame (one idea per frame).
- [ ] **Floor** — every load-bearing line ≥ 1.4cqw.
- [ ] **Keep-out** — no decorative element inside `{spacing.keepout}` of the headline or eyebrow rail.
- [ ] **Dialect purity** — one dialect per frame.
- [ ] **Copy fidelity** — every figure comes from the script; no invented numbers.

---

## 14 · Known Gaps

- `cqw` values are stored as strings in YAML; consumers that read tokens as numbers must parse the trailing unit. Documented once here per the DESIGN.md spec extension tolerance.
- Aspect-ratio re-scales in §11 are guidance — final crop is a per-shot art call. The safe area is normative; the exact re-anchor is not.
- The `handwritten` font (`Nanum Pen Script`) is optional; when unavailable, the sticky-note falls back to `Pretendard Bold` (§136 fallback), never to a display face.
- Motion durations in §8 are ranges, not tokens. Component tokens describe *end-states*; the animator picks a value inside the stated range.
- The showcase renders internal frame sizing in `cqw` against a `container-type: size` frame, so `frame.md` values reproduce identically whether the frame is shown at 560px or 1920px wide.
