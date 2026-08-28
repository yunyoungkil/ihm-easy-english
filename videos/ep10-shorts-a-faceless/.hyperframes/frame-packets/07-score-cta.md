# Frame packet: 07-score-cta

## Project inputs

- Project: C:\Users\yunyo\Downloads\project\videos\ep10-shorts-a-faceless
- Design tokens: C:\Users\yunyo\Downloads\project\videos\ep10-shorts-a-faceless\frame.md
- RULES_DIR: C:\Users\yunyo\.agents\skills\hyperframes-animation\rules

## Assigned storyboard block

## Frame 7 — 점수와 관련 영상

- scene: 0~4개의 점수 칩이 빠르게 순환한 뒤 관련 영상 안내 문구와 아래쪽 화살표에 멈춘다.
- voiceover: "네 단어 중 몇 개를 맞히셨나요? 전체 원리는 관련 영상에서 지금 바로 확인해 보세요."
- duration: 5.530s
- poster: 4.4s
- transition_in: crossfade
- status: built
- src: compositions/frames/07-score-cta.html
- type: cta
- persuasion: Self-assessment + callback
- beat: resolve and action
- blueprint: titlecard-reveal
- motion_rules: [vertical-spring-ticker, spring-pop-entrance]

shot_sequence:
  - "Scene 1 (0.0–2.3s): 1·2·3·4 점수 칩이 한 번 빠르게 순환한 뒤 4에 멈춘다."
  - "Scene 2 (2.3–4.7s): 관련 영상 안내 카드가 아래에서 들어와 정렬된다."
  - "Scene 3 (4.7–5.530s): 아래 화살표가 한 번만 눌렸다 돌아오며 선택 위치를 알려 준다."

narrativeRole: 시청자가 자신의 점수를 생각하게 만들어 댓글 반응을 유도하고 롱폼으로 자연스럽게 연결한다.
keyMessage: 결과가 궁금하면 관련 롱폼에서 전체 원리를 확인할 수 있다.

## Selected blueprint: titlecard-reveal

# titlecard-reveal — Title-Card / Single-Card Reveal

**intent**: The calm breather/landing beat — one clean title or single brand/proof card revealed with exactly one restrained move (a slide-up crossfade, or a wipe-away-to-reveal), then a still hold. Low motion is the payload, not a deficiency.

**roles served**

- Benefits (from `benefits-titlecard-crossfade`, #34): a calm two-line value title card — headline value line, then one slide-up crossfade to a qualifier/elaboration line that holds center.
- Social_Proof (from `social-proof-reveal-card`, #35): wipe a busy app-collage open away with one diagonal pill-sweep to reveal a clean brand lockup (icon + wordmark) plus a centered "loved by [N]+ [audience] teams" social-proof line that spring-settles and holds.
- CTA (from `hard-cut-card-stack-to-logo`): a monochrome end-card
  CHAIN — statement → CTA / availability line → brand wordmark/logo — separated by instant hard
  cuts at full opacity; each card is its own allocated stillness, and the sequence terminates on
  the logo held to the final frame.
- Product_Intro (from `title-card-prelude-chain`): a three-beat dark title
  PRELUDE before any product UI — `[logo]` pop → `[name]` (a `[version]` appends grey→bright) →
  `[tagline]` card — chained by clears and blur-snap handoffs rather than hard cuts.

**duration**: 3–5s (Benefits 3–4s; Social_Proof ~5s / observed 4.7s). Card chains run 2–3s per
card, ~5.5–9.5s total.

**shot structure**

```
Scene 1 (0.0–~0.4s): static camera on [neutral / dark background]. Establish the opening state.
  Variant — Benefits: empty-to-text — [benefit line 1] is about to fade in centered (no busy open).
  Variant — Social_Proof: a busy intro frame holds briefly — an [app-screenshot / use-case collage] of overlapping cards under a [setup line].

Scene 2 (~0.4–~1.5s): the ONE move executes — a single restrained reveal that brings the calm card to center.
  Variant — Benefits: [benefit line 1] fades in centered while scaling slightly (~95%→100%, smooth ease-out) and holds.
  Variant — Social_Proof: a large [accent-color] rounded pill sweeps diagonally bottom-left → top-right and exits the corner, clip-path wiping the collage away to reveal the [brand logo lockup] beneath as the [logo icon] strokes draw on.

Scene 3 (~1.5s–end): the revealed/settled card holds to the end (the allocated stillness). At most one subtle live element (a slow breathing pulse on the card, or a very slow camera drift). No second development phase.
  Variant — Benefits: [benefit line 1] translates up and fades out as [benefit line 2 — qualifier / elaboration] translates up from below center and fades in to take center; holds. (This single slide-up crossfade IS the one move — Benefits front-loads no Scene-2 wipe.)
  Variant — Social_Proof: the lockup — [logo icon] centered, [wordmark] below, centered [social-proof tagline] "Loved by [N]+ [audience] teams" (the [N]+ may count up) — spring-settles small, then holds.

Variant — card chain (CTA end-card stack / Product_Intro title prelude): the single-card contract
repeats 2–3 times in sequence. Each card is a complete Scene 1–3 in miniature — arrive (or simply
BE there), at most one restrained move, hold — and the seams between cards are INSTANT hard cuts
at full opacity (no crossfade, no fade-through-black) or, in the prelude flavor, a blur-away →
snap-into-focus handoff.
  Card moves stay on budget: a character-by-character type-on with visible partial states, a
  right-to-left backspace that resolves the [wordmark] into the small [logo icon], a grey→bright
  append ("[name]" gains "[version]"), a blur-snap into focus — or nothing beyond a
  barely-perceptible continuous slow scale-up across the hold.
  The final card is always the [brand logo / lockup], held static to the last frame.
```

**motion vocabulary**: single restrained reveal (gentle fade-in + subtle scale-up settle | diagonal clip-path pill-wipe), one slide-up crossfade between two centered lines (Benefits), icon stroke draw-on (Social_Proof), optional "[N]+ teams" count-up, logo+tagline spring-settle-and-hold, subtle breathing on the held card, hold-to-end. Calm register — no spring chains, no tumble, no per-beat flips, no second phase. Camera static (optional very slow drift only). Card-chain register: instant hard cut at full opacity as the only seam, barely-perceptible
continuous slow scale-up across each hold, character-by-character type-on with visible partial
states, right-to-left backspace collapsing the wordmark into the logo icon, grey→bright text
append, blur-away → snap-into-focus card handoff, logo pop with overshoot + glow (prelude opener),
monochrome text-on-solid throughout.

**rule mapping**

- gentle fade-in + subtle scale-up settle (Benefits Scene 2) → `rules/scale-swap-transition.md` (restrained in/settle; cross-reference the fade ease in `techniques.md`)
- single slide-up crossfade between two centered lines (Benefits Scene 3) → `rules/discrete-text-sequence.md` (one line hands off to the next; translate-up + crossfade)
- diagonal pill-wipe reveal (Social_Proof Scene 2) → `rules/techniques.md` (clip-path reveal masks — the wipe)
- icon stroke draw-on (Social_Proof Scene 2) → `rules/svg-path-draw.md`
- "[N]+ teams" count-up (Social_Proof Scene 3, optional) → `rules/counting-dynamic-scale.md`
- logo + tagline spring-settle-and-hold (Social_Proof Scene 3) → `rules/spring-pop-entrance.md` (single soft settle; intentionally one beat, not a chain)
- subtle breathing on the held card (the one live element during the hold) → `rules/sine-wave-loop.md`
- type-on / backspace / grey→bright append (chain cards) → `rules/discrete-text-sequence.md`
  (non-linear typing incl. backspace; drive the version append as a bulk addition)
- wordmark remainder resolves into the logo icon → `rules/scale-swap-transition.md` (same-center
  swap fired as the last character deletes)
- barely-perceptible slow scale-up across a hold → the camera-modifier drift
  (`rules/multi-phase-camera.md`, micro-drift register) applied per-card
- blur-away → snap-into-focus handoff (prelude flavor) → `rules/depth-of-field-blur.md` (single
  pull on the outgoing / incoming card)
- logo pop with overshoot + glow (prelude card 1) → `rules/spring-pop-entrance.md` +
  `rules/ambient-glow-bloom.md`
- instant hard cut at full opacity → not a rule: a timeline `tl.set` swap — deliberately NO
  transition entry.

**camera modifier**: optional — a single very slow drift/push under the hold only → `rules/multi-phase-camera.md`. Default is fully static; do not add unless the held beat would otherwise read as a freeze-frame.

**stillness note**: This is a legitimate allocated-stillness beat. The hold in Scene 3 is the deliverable, not an unanimated gap — do NOT manufacture a development phase, extra swaps, or force-animation. One restrained move + a subtle hold (optionally one breathing element or one slow drift) is the correct and complete shape. The card-chain variant does not break this: each card individually obeys the one-move + hold
contract, and the hard cut is a seam, not a move. Boundary: if the cards flip at sub-second tempo
or each beat carries its own entrance/exit energy, you have left this blueprint — that is
`kinetic-type-beats` (its CTA variant owns the high-tempo value-line stack).

## Selected motion rule: spring-pop-entrance

---
name: spring-pop-entrance
description: The canonical entrance pop — an element (or staggered group) arrives by scaling 0 → 1 on a smooth long-tail settle (power3 default); bouncy overshoot is a rare, explicitly-playful exception. fromTo so it's correct at t=0 under seek.
metadata:
  tags: spring, entrance, pop, scale, power3, settle, stagger, reveal, arrival
---

# Spring-Pop Entrance

> **Smooth beats bouncy.** This entrance defaults to a smooth long-tail settle — `power3.out` (or `expo.out` for a faster front) — that decelerates cleanly into the resting size with **no overshoot**. Bouncy `back.out` is the **#1 instant turn-off** in agent-made videos and is almost never executed well; it is a rare, explicitly-playful exception (consumer / fun brand), never the default. When unsure, settle smoothly.

THE entrance primitive: an element (or staggered group) arrives by springing from nothing — `scale: 0 → 1`, optional small `y` rise — and settles without bouncing. This is **arrival**, not reaction: distinct from [press-release-spring.md](press-release-spring.md) (a click/press → release feedback chain on an element that already rests on screen). Many blueprints used to borrow that rule to fake an entrance; reach for this instead.

## How It Works

One `fromTo` carries the whole arrival: from `{ scale: 0, opacity: 0 }` (explicit, so t=0 is correct under seek) to `{ scale: 1, opacity: 1, ease: "power3.out" }`. For a **group**, the same `fromTo` runs per element at `i * STAGGER`, capped so the group reads as one arriving beat. The `scale` grow is load-bearing; the `y` rise is garnish — drop everything else and it must still read as a clean entrance. Let the ease produce the settle: never hand-key a `scale: 1.1` mid-state (it double-bounces against the curve).

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="pop-hero" id="hero">{heroLabel}</div>

<div class="pop-grid">
  <div class="pop-item">{itemA}</div>
  <div class="pop-item">{itemB}</div>
  <div class="pop-item">{itemC}</div>
</div>
```

```css
.pop-hero,
.pop-item {
  transform-origin: 50% 50%; /* in-place pop; move to the source point for the anchored variation */
  will-change: transform;
}
.pop-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: GRID_GAP;
  place-items: center;
}
```

```js
// Single hero pop — smooth long-tail settle, no overshoot.
tl.fromTo(
  "#hero",
  { scale: 0, opacity: 0 },
  { scale: 1, opacity: 1, duration: POP_DUR, ease: "power3.out" },
  ENTRY_AT,
);

// Staggered group pop — one arriving beat.
gsap.utils.toArray(".pop-item").forEach((el, i) => {
  tl.fromTo(
    el,
    { scale: 0, opacity: 0, y: Y_RISE },
    { scale: 1, opacity: 1, y: 0, duration: POP_DUR, ease: "power3.out" },
    GROUP_ENTRY_AT + i * STAGGER,
  );
});
```

## Variations

- **Calm settle** (premium / enterprise): `power3.out`, no rotation, `Y_RISE` 0–12px — a weighted, confident landing for a hero wordmark or product shot.
- **Firm settle** (everyday default): `power3.out` or `expo.out` for a punchier front, `Y_RISE` ~24px — cards, icons, callouts.
- **Exact-physics settle**: when the settle IS the shot, swap the ease for `springEase({ response: 0.4 })` (critically damped) from `../adapters/gsap-easing-and-stagger.md` → Spring Eases; take `duration` from the helper.
- **Origin-anchored pop**: a callout growing out of a specific point (marker, pointer tip) sets `transform-origin` to that point (e.g. `0% 100%`) so `scale: 0 → 1` reads as "emerging from the source", not "inflating in place".
- **Pop into a held slot**: land the pop and hold still — no idle loop baked into the entrance. If the held frame genuinely needs life, hand off to [sine-wave-loop.md](sine-wave-loop.md) for subtle jitter on a separate later tween; prefer revealing the next element on its VO cue.
- **Bouncy pop (RARE — explicitly-playful only)**: swap the ease for `back.out(OVERSHOOT)` and optionally settle a small `rotation: ROT_FROM → 0` so elements look hand-placed. Only for a deliberately playful register — never product / enterprise / serious tone:

```js
tl.fromTo(
  el,
  { scale: 0, opacity: 0, rotation: ROT_FROM },
  { scale: 1, opacity: 1, rotation: 0, duration: POP_DUR, ease: `back.out(${OVERSHOOT})` },
  GROUP_ENTRY_AT + i * STAGGER,
);
```

Even here keep `OVERSHOOT ≤ ~2` — past that it reads as cartoon wobble. Better still: the baked spring at `dampingFraction: 0.6–0.7` (same adapters doc) gives ~5–10% overshoot that reads physical where `back.out` reads cartoon.

## Values

| token      | range                                     | notes                                                            |
| ---------- | ----------------------------------------- | ---------------------------------------------------------------- |
| EASE       | `power3.out` default; `expo.out` punchier | `back.out(OVERSHOOT)` only in the playful variant                |
| POP_DUR    | 0.4–0.7s                                  | shorter = tight snap; hero must be visible by **t ≤ 0.5s**       |
| STAGGER    | 0.04–0.08s                                | `min(0.06, 0.5 / ITEM_COUNT)` — self-caps the window             |
| ITEM_COUNT | 3–9                                       | >9 makes the stagger vanish — switch to a wipe/sweep reveal      |
| Y_RISE     | 0–32px                                    | small; never large enough to read as a slide-up                  |
| ROT_FROM   | −10°–+10°                                 | playful variant only; alternate sign by index (`i % 2 ? 6 : -6`) |
| ENTRY_AT   | 0–0.4s                                    | a beat of quiet, but keep the subject landing by t ≤ 0.5s        |

## Critical Constraints

- Default ease `power3.out` (no overshoot); `back.out` only in the explicitly-playful variant, and there `OVERSHOOT ≤ ~2`.
- `ITEM_COUNT × STAGGER ≤ ~0.5s` — the group must land inside one beat.
- Entrances state the collapsed from-state in `fromTo` — never rely on a CSS-hidden start (it renders visible before the tween claims it under seek).
- `transform-origin: 50% 50%` for an in-place pop; the source point only for the anchored variation.
- This is a finite arrival — idle motion on a held element is a separate, later `sine-wave-loop` tween.

## See also

`center-outward-expansion` (pop while radiating to slots) · `press-release-spring` (the click-feedback counterpart) · `sine-wave-loop` (post-arrival jitter, sparingly).

## Selected motion rule: vertical-spring-ticker

---
name: vertical-spring-ticker
description: Slot-machine style vertical scrolling using additive spring physics within a masked container — each spring contributes one "step" of scroll.
metadata:
  tags: text, ticker, spring, scroll, vertical, slot-machine, sequence
---

# Vertical Spring Ticker (Slot Machine)

Multiple spring tweens are ADDED TOGETHER to produce total Y translation — each spring contributes one discrete "step", so instead of a single linear scroll you get the slot-machine "click click click" rhythm with natural settling. Distinct from a continuous marquee: this rule's semantics are discrete steps that land; for endless linear motion see [sine-wave-loop.md](sine-wave-loop.md).

## How It Works

A masked window of fixed height `ITEM_HEIGHT` (`overflow: hidden`) holds a vertical stack of items, each exactly `ITEM_HEIGHT` tall. Each spring holds a 0→1 progress; a shared `onUpdate` sums them and applies `translateY(-sum × ITEM_HEIGHT)`. Springs fire sequentially with overlap (`STEP_SPACING ≤ STEP_DUR`), so each step snaps in while the previous is still settling — that overlap is what makes them additive, and the `back.out` overshoot is what makes each step read as a "click".

## Recipe

```html
<!-- inside a standard scene clip (hyperframes-core) -->
<div class="ticker" id="ticker">
  <div class="stack-inner" id="stack-inner">
    <div class="item">{item0}</div>
    <div class="item">{item1}</div>
    <div class="item">{itemN}</div>
  </div>
</div>
```

```css
.ticker {
  width: TICKER_WIDTH;
  height: ITEM_HEIGHT; /* MUST match .item height exactly */
  overflow: hidden; /* the mask is the window */
}
.stack-inner {
  display: flex;
  flex-direction: column; /* mandatory — vertical stacking */
}
.item {
  height: ITEM_HEIGHT; /* MUST equal .ticker height */
  display: flex;
  align-items: center;
  justify-content: center;
  /* font-variant-numeric: tabular-nums; — for numeric tickers */
}
```

```js
const innerEl = document.getElementById("stack-inner");
const springs = Array.from({ length: STEPS }, () => ({ p: 0 }));

function applyTransform() {
  const sumP = springs.reduce((acc, s) => acc + s.p, 0);
  innerEl.style.transform = `translateY(${-sumP * ITEM_HEIGHT}px)`;
}
applyTransform(); // initial state

springs.forEach((spring, i) => {
  tl.to(
    spring,
    {
      p: 1,
      duration: STEP_DUR,
      ease: `back.out(${BOUNCE_FACTOR})`,
      onUpdate: applyTransform,
    },
    STEP_START + i * STEP_SPACING,
  );
});
```

## Variations

- **Numeric ticker (price / counter rolling)** — items are the digit sequence; run the same spring-step pattern per decimal position. `font-variant-numeric: tabular-nums` required.
- **Reverse direction (countdown)** — flip the sign (`translateY(${sumP * ITEM_HEIGHT}px)`) and arrange items in reverse order.
- **Pause between groups** — several fast steps (small `STEP_SPACING`), a long pause, then one dramatic final step with a bigger `BOUNCE_FACTOR`. The pause is where the eye locks in.
- **Continuous infinite ticker** — NOT this rule (this rule is discrete steps); a looping news ticker is a single linear tween with duplicated items — see [sine-wave-loop.md](sine-wave-loop.md) for continuous-motion semantics.

## Values

| token         | range                 | notes                                                                                 |
| ------------- | --------------------- | ------------------------------------------------------------------------------------- |
| ITEM_HEIGHT   | ~`fontSize × 1.25`    | must hold capital descenders; `.ticker` height MUST equal it exactly                  |
| TICKER_WIDTH  | 30–60% viewport width | wide enough for the longest item without ellipsis                                     |
| STEPS         | 1–4                   | number of transitions, not items; `STEPS ≤ itemCount − 1`                             |
| STEP_DUR      | 0.3–0.7s              | under 0.3 the overshoot is invisible; over 0.7 the click reads as a slide             |
| STEP_SPACING  | 0.3–0.5s              | **≤ STEP_DUR** so springs overlap (additive); wider gaps read as a lazy linear scroll |
| BOUNCE_FACTOR | 1.4–2.5               | 1.4 gentle click / 2.0 firm / 2.5+ casino spin-and-land for a climax step             |

Reference: `../../examples/proof-logo-chain.html` (204px, 1 step, 0.45s).

## Critical Constraints

- **Container height = item height, pixel-exact, all items equal** — mismatches show partial item edges above/below the mask and accumulate drift across steps.
- **`overflow: hidden` on the container, not the inner stack**; `flex-direction: column` on the stack.
- **Sum the springs in `onUpdate` — never tween the final position directly.** Each spring contributing its OWN snap is the slot-machine pacing.
- **Overlap steps and keep `back.out` per step** — non-overlapping steps or an out-only ease collapse into a linear scroll.
- **Never update items via `innerHTML` between steps** — the ticker moves the SAME items via translate; swapping content shows the previous item AS the new one (broken illusion).
- **Climax dwell ≥1s after the final step** (SKILL universal constraint).
- **`tabular-nums` for numeric tickers** — variable digit widths break alignment.

## See also

`reactive-displacement` (ticker pushed by an incoming element) · `scale-swap-transition` (ticker scales out after settling) · `press-release-spring` (button press triggers the spin).
