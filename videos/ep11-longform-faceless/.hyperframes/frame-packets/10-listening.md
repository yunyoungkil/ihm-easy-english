# Frame packet: 10-listening

## Project inputs

- Project: C:\Users\yunyo\Downloads\project\videos\ep11-longform-faceless
- Design tokens: C:\Users\yunyo\Downloads\project\videos\ep11-longform-faceless\frame.md
- RULES_DIR: C:\Users\yunyo\.claude\skills\hyperframes-animation\rules

## Assigned storyboard block

## Frame 10 — 리스닝 트레이닝

- scene: hero-word "gonna"가 화면 좌측에 고정(fixed-anchor), 예문 4개(영문+한글)가 우측에 하나씩 쌓임
- voiceover: "이제 실제 속도로 들어보고 GONNA를 직접 찾아보세요. 하나, \"왓 아 유 거너 두 디스 위켄드?\" 둘, \"쉬즈 프라바블리 거너 비 레이트.\" 셋, \"잇츠 거너 비 오케이.\" 넷, \"데이아 거너 미스 더 트레인.\" 다 찾으셨나요? 매번 같은 자리, 같은 소리였습니다."
- duration: 21.995s
- transition_in: push-slide LEFT
- status: built
- src: compositions/frames/10-listening.html
- type: social_proof
- persuasion: Demonstration (show the mechanism running) + Numbered enumeration
- beat: focus building to mastery
- blueprint: fixed-anchor-cycle (Reproduce — 앵커의 정지 자체가 이 블루프린트의 주장)
- focal: 고정된 "gonna" 앵커
- roles: 앵커 = foreground subject(고정) · 예문 칩 = supporting(순차 사이클)
- sfx: soft-tick ×4(칩마다)

narrativeRole: 실제 속도의 자연스러운 문장에서 시청자가 직접 GONNA를 찾아내게 해서, 수동적 이해를 능동적 듣기 능력으로 전환한다.
keyMessage: 실제 발화 속도에서도 GONNA는 항상 같은 자리에서 같은 소리로 들린다.

Layout: asymmetric 60/40 — 앵커(좌, 고정) + 리스트(우, 가변), 두 블록은 flex로 세로 중심 정렬.
Scene 1 (0.0–3.5s): "gonna" 앵커가 spring-pop으로 좌측에 진입해 고정(다시는 움직이지 않음).
Scene 2 (3.5–7.0s): "하나,"에서 칩 1이 우측 리스트에 reveal, "gonna/거너"가 발화 순간 keyword glow.
Scene 3 (7.0–10.5s): "둘,"에서 칩 2 reveal, 같은 glow 처리.
Scene 4 (10.5–14.0s): "셋,"에서 칩 3 reveal.
Scene 5 (14.0–17.5s): "넷,"에서 칩 4 reveal — 4개 칩 스택 완성.
Scene 6 (17.5–22.0s): "다 찾으셨나요? 매번 같은 자리..."에서 4개 강조어가 동시에 한 번 glow(synchronized), 이후 정지.

## Selected blueprint: fixed-anchor-cycle

# fixed-anchor-cycle — Fixed Anchor, Cycling World

**intent**: One element is PINNED — a wordmark, a composer box, an anchor line that enters once and never moves again — while the adjacent region (or the entire surrounding theme) cycles through many discrete states around it, cadence often manipulated (steady stepping, a fast carousel, or a slow→accelerating flurry), resolving on an emphasis beat into a completed lockup or a muted freeze. The stillness of the anchor IS the claim: everything changes, this stays. Distinct from `kinetic-type-beats` sub-shape A, where a word-slot inside a centered line swaps and the sentence itself is the subject — there the anchor is a sentence frame on a bare type field; here the anchor is the PRODUCT identity and what cycles around it can be non-text (whole theme skins, chrome/logo swaps, textured label chips, a carousel list), the cycle asserts breadth ("everyone says / works everywhere / calling all X"), and the resolve completes the anchor into a lockup. Distinct from `ticker-takeover`, whose cycle ends in a collision — a hero crashes in and shoves the text aside; here nothing ever collides with the anchor: the cycle stops, and a final element quietly joins it.

**roles served**

- Brand_Outro (from `static-anchor-rapid-text-swaps`): when the sign-off is the brand name sitting immovable while praise quotes / tagline words cycle beside or beneath it — steady per-word highlight stepping, or a hard-cut chip flurry that accelerates — landing on the finished lockup ("bolt.new / prompt, run, edit, deploy / enjoy."; "Opus 4.6 by ANTHROP\C").
- Benefits: when "works everywhere" is shown literally — one product surface (a prompt composer with one verbatim string) pinned dead-center while its ENTIRE shell morphs in place through N product themes (background, typography, radii, chrome, logos all crossfading at once), ending in a washed-out freeze.
- Hook: when the opener is a roll-call — a static anchor line holds while an accent-colored line beneath it runs as a fast vertical carousel through an audience/option list, then the block clears into follow-up statement beats that land the brand line.

**duration**: 6.6–11.1s (Benefits shortest ~6.6s at 4 theme beats; Brand_Outro ~9–9.4s; Hook longest ~11s when the anchor-cycle block hands off to follow-up statement beats). The cycle engine itself occupies ~3–5s regardless of role.

**shot structure** (flat static frame — camera locked in every member; a `[bg]` field, solid or subtly drifting; two folded sub-shapes — **(A) adjacent-region cycle**: the anchor holds and a neighboring slot swaps through N states; **(B) whole-context morph**: the anchor holds and everything AROUND it re-skins in place)

- **Scene 1 (0.0–~2.0s) — the anchor lands and PINS.** The `[anchor: wordmark / product name / composer box / lead line]` enters once — fade/scale-in centered, word-by-word build, or already present at frame one — at a fixed position it will hold for the entire clip. Zero movement from here on: no drift, no breathe, no re-layout. If the anchor is a UI surface (sub-shape B), it carries a `[verbatim string]` with a blinking cursor.

- **Scene 2 (~2.0s–~70% of runtime) — the cycle engine (signature move).** The world changes around the unmoved anchor. Choose by sub-shape:
  - **Sub-shape A (adjacent-region cycle)**: a region beside/beneath the anchor steps through N discrete states — pick ONE swap mechanic and ONE cadence:
    - _swap mechanics_: instant hard-cut label replacement (a `[chip / tape label]` slaps over the old one, texture/highlight shifting slightly, chip width re-fitting each `[phrase]` — growing away from the anchor, never over it); sequential per-word highlight stepping (one word of the `[tagline]` snaps bright/bold while the rest sits dim grey, the highlight walking the line); or a fast vertical carousel (each `[list item]` slide/fades through the accent slot ~0.5s/phrase).
    - _cadences_: steady stepping (~0.5–1s/state), or **slow→accelerating flurry** — ~1s beats compressing to ~0.15–0.3s per swap, breadth escalating into a blur of states (12–16 states read as "everyone"; 3–8 read as a roll-call).
    - Geometry law: the cycling region NEVER overlaps, touches, or displaces the anchor; size the layout so the longest state still fits inside the frame with clear margins.
  - **Sub-shape B (whole-context morph)**: at ~1.3s intervals the entire theme — `[bg color]`, typography, corner radii, toolbar icons, footer `[brand logos]`, contextual lines — morphs in place via quick (~0.3s) crossfades through N `[product skins]`, every property blending simultaneously. No hard cuts, no wipes; the anchor's content string is identical in every skin (chrome details like a `> ` prefix may adapt per skin).

- **Scene 3 (~70–85%) — the emphasis beat.** The cycle resolves — it does not just stop:
  - _Variant — Brand_Outro (highlight stepping)_: the whole `[tagline]` snaps solid bright at once — full-line illumination after the per-word walk.
  - _Variant — Brand_Outro (flurry)_: the flurry halts and HOLDS on the `[longest / weightiest phrase]` — a beat of stillness after acceleration.
  - _Variant — Benefits (theme morph)_: the final beat mutes — a faint `[dot-grid]` fades in across the background while the UI drops to low opacity, a washed-out blueprint freeze.
  - _Variant — Hook (carousel)_: the anchor block clears, handing off to 1–3 centered word-by-word statement beats (kinetic-type-beats territory) that carry toward the close.

- **Scene 4 (final beat → end) — lockup completion and HOLD.** A final element joins the still-unmoved anchor and the finished composition holds static to the end: a `[closing word]` drops in below, aligned to the last cycled state ("enjoy."); the chip vanishes on a hard cut and the `[brand sign-off]` appears beside the anchor on a shared baseline ("by ANTHROP\C"); or the final `[brand line]` builds word-by-word dead-center and holds ("with Copilot."). Long static hold — the lockup is the payoff, give it 20–30% of the runtime.

**motion vocabulary**: anchor fade/scale-in entrance; permanently pinned anchor (zero movement, no idle breathe); instant hard-cut label/chip replacement (slap-over with subtle texture/highlight shift); chip width resize-to-fit per phrase (grows away from the anchor); sequential per-word highlight stepping through a line; dim-to-grey line state; whole-line illumination snap; fast vertical carousel slide/fade of one line under a static line; cadence acceleration (slow ~1s beats into a ~0.15–0.3s flurry); hold-on-longest-phrase emphasis beat; in-place theme morph crossfade (~0.3s) blending background/fonts/radii/icons simultaneously; per-beat chrome/logo swap; blinking text cursor; contextual line appearing/disappearing across beats; dot-grid backdrop fade-in; global opacity washout; end freeze; word-by-word phrase build; block clear between scenes; drop-in entrance of a final word; hard cut to final lockup; long static hold.

**rule mapping**

- instant hard-cut chip/label/phrase swaps at time thresholds; per-word highlight stepping (color/weight state swaps); dim-line → full-line illumination snap; per-state chip width set (a per-state layout property, set discretely — never tweened) → `discrete-text-sequence`
- fast vertical carousel of the accent line under the static anchor (slide/fade stepped swaps in a masked slot) → `vertical-spring-ticker` (its footer-reveal step unused — Scene 4's lockup takes its place)
- per-phrase state windows computed from a script of N states (praise quotes, audience list, theme beats) → `dynamic-content-sequencing` (Accelerating cadence — for the flurry, pre-compute the beat array with shrinking `hold` values, geometric decay over the state list)
- word-by-word phrase builds (anchor line, follow-up statements, final brand line) → `dynamic-content-sequencing` + `waterfall-entry` (or `kinetic-beat-slam` when the statements should land percussively)
- anchor entrance fade/scale-in; drop-in of the final closing word → `spring-pop-entrance` (restrained overshoot — the register here is editorial, not bouncy)
- blinking cursor in the pinned composer → `context-sensitive-cursor` (color adapts per theme skin at segment boundaries)
- whole-context theme morph → `theme-crossfade-morph` (N pre-styled full-scene layers stacked at the same geometry, opacity-crossfaded, the shared anchor string rendered once on top); the composer shell's radius/surface component alone → `card-morph-anchor`
- subtly drifting background field beneath the cycle → `sine-wave-loop` (bounded drift; the anchor itself gets none)
- dot-grid fade-in + global opacity washout freeze; long static hold → `gsap-effects` (plain opacity tweens) / static hold (no rule needed)

**camera modifier**: none — every member is fully camera-static; the cycle is the only motion, and the pinned anchor's stillness is load-bearing. Do not add a push-in "for energy"; it would break the anchor contract.
