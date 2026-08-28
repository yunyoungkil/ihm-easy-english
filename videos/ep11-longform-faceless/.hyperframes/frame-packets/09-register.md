# Frame packet: 09-register

## Project inputs

- Project: C:\Users\yunyo\Downloads\project\videos\ep11-longform-faceless
- Design tokens: C:\Users\yunyo\Downloads\project\videos\ep11-longform-faceless\frame.md
- RULES_DIR: C:\Users\yunyo\.claude\skills\hyperframes-animation\rules

## Assigned storyboard block

## Frame 9 — 격식 vs 캐주얼

- scene: comparison-split — 왼쪽 "말할 때"(GONNA, 파랑) vs 오른쪽 "쓸 때"(GOING TO, 흰색)
- voiceover: "그럼 언제 GOING TO를 그대로 쓸까요? 이메일이나 면접처럼 격식 있는 자리에서죠. GONNA는 말할 때 자연스럽게 줄어드는 소리일 뿐, 글로 쓸 땐 여전히 GOING TO입니다."
- duration: 11.833s
- transition_in: crossfade
- status: built
- src: compositions/frames/09-register.html
- type: benefit_highlight
- persuasion: Comparison of two options
- beat: orientation + clarity
- blueprint: comparison-split (Reproduce)
- focal: 두 카드 동등 비중(진짜 A/B)
- roles: GONNA 카드 = foreground subject · GOING TO 카드 = foreground subject
- sfx: soft-whoosh ×2(카드 착지)

narrativeRole: 8번 씬의 안심을 실용적 지침(언제 GONNA, 언제 GOING TO)으로 구체화한다.
keyMessage: 말할 땐 GONNA, 격식 있는 글에선 GOING TO.

Layout: split-screen.
Scene 1 (0.0–2.5s): "그럼 언제 GOING TO를 그대로 쓸까요?"가 상단 중앙에 per-word reveal.
Scene 2 (2.5–6.0s): "이메일이나 면접처럼"에서 질문에 먼저 답하는 우측 카드(GOING TO, 격식)가 우측 날개에서 split-tilt로 진입.
Scene 3 (6.0–9.0s): "GONNA는 말할 때"에서 좌측 카드(GONNA, 파랑)가 좌측 날개에서 진입 — 미러링된 페어 완성.
Scene 4 (9.0–12.0s): 둘 다 정지, subtle jitter만.

## Selected blueprint: comparison-split

# comparison-split — Comparison Split-Cards

**intent**: Two paired items of equal weight shown side-by-side with mirrored 3D "book-open" tilts — the eye reads them as a balanced comparison, then a pill badge lands at each card's inner edge to punctuate. The motion IS the symmetry: two cards arriving from opposite wings into a held spread.

**roles served**

- Key_Feature (from `comparison-split-cards`): when two complementary features / capabilities of equal weight should be presented **simultaneously, not sequentially** — an A/B, a "X + Y together," paired concepts the viewer must weigh side-by-side. Not for >2 items (use `grid-card-assemble`) or sequential steps.

**duration**: 4–6s

**shot structure** (a `[bg]` canvas carrying two faint ambient glow blooms — `[accent A]` near 30%, `[accent B]` near 70% — so each side owns a color identity across a 50% symmetry axis; equal-width cards under one shared perspective parent)

- **Scene 1 (0.0–~0.8s) — title sets the concept.** A centered `[title line]` with an `[accent keyword]` slides DOWN into place from just above (a short smooth settle). The downward arrival is deliberate: it forms a non-conflicting T-shape against the cards, which arrive from the sides next.
- **Scene 2 (~0.4–1.9s) — the split-tilt entry (signature move).** Two equal-width feature cards arrive from opposite wings — `[left card]` from the left, `[right card]` from the right ~0.2s behind — each carrying a **mirrored 3D `rotateY` tilt** (left faces right, right faces left, opening like a book) and scaling ~0.85→1 as it lands. The entry overlaps the title's tail so the whole thing reads as ONE arrival, not two beats. Each card holds `[image / label / subtitle]`; box-shadows fall **outward** from the tilt (left shadow right, right shadow left).
- **Scene 3 (~1.9–end) — badges punctuate, then hold.** A pill `[badge]` lands at each card's **inner edge** (left then right, ~0.3s apart), overlapping its card ~15% so it reads as attached, not orbiting. This is the lone overshoot in the shot — it earns the punctuation. Settles and holds.

**motion vocabulary**: title slide-down from above; mirrored opposite-wing card entry; static book-open `rotateY` tilt (`+tilt` left, `−tilt` right); tilt-matched outward box-shadow; inner-edge badge spring-pop; gentle phase-opposed idle float (left vs right, never synchronized) registered as subtle jitter; dual side-glow ambient.

**rule mapping**

- two cards entering from opposite wings with mirrored `rotateY` tilts + tilt-matched shadow → `split-tilt-cards` (the signature; keep the two-layer split so the entry `x`/`scale` and the idle never collide on one alias)
- title slide-down settle → `gsap-effects` (translate + opacity on a long-tail `power3`)
- inner-edge pill badge pop (the one overshoot) → `spring-pop-entrance` (overshoot register — earns the punctuation)
- phase-opposed idle float on the pair → `sine-wave-loop` (low-amplitude register — subtle jitter, NOT lazy breathing; left `sin(t)`, right `sin(t+π)` so they never conveyor-belt)
- the two faint side glows behind the cards → `ambient-glow-bloom` (un-triggered soft bloom, one per accent)

**camera modifier**: camera-static by default — the symmetry is the subject and a move would break the balance.
