# Frame 3(03-physics-crash) 이미지 제작 프롬프트 — Google Flow용

2026-09-22 작성. 기존 Frame 3는 R/L 충돌 순간에 뜨는 이미지가 280px 고정 박스에 갇혀 있었고
(그마저도 별도 코드 배너 텍스트와 분리돼 있었음), 하단 "함정" 카드 2개는 이미지가 아예 없이
텍스트만 있었다. R↔L이 코드로 슬라이드해서 부딪히는 물리적 모션 연출 자체는 그대로 유지하고
(모션은 코드가 잘하는 영역), **충돌 결과 이미지를 훨씬 크게 키우고, 하단 함정 카드 2개를
캐릭터가 등장하는 큰 일러스트로 교체**한다.

⚠️ **이번엔 이미지 안에 텍스트를 직접 넣어도 된다** — Google Flow(나노바나나)는 로컬
ComfyUI와 달리 텍스트 표현이 정확하다(사용자 확인). 그래서 아래 프롬프트는 "쾅!", "Word",
"Old" 같은 짧은 글자를 이미지 안에 직접 그려 넣도록 지시한다. 단, **다국어 자막처럼
나레이션 타이밍에 맞춰 계속 바뀌어야 하는 텍스트(하단 캡션 등)는 여전히 코드로 렌더링**한다
— 이미지에 넣는 건 그 장면에 고정으로 붙어있는 짧은 단어/의성어뿐이다.

## 캐릭터 일관성 (Pitfall 이미지 2장만 해당 — 충돌 이미지는 캐릭터 없음)

- `assets/images/f01_react_00_neutral.jpg`를 Flow의 "Ingredients" 기준 이미지로 그대로 쓴다.
- 이번 소품은 **스마트폰**이다(Frame 1과 같은 맥락 — 캡션에 "스마트폰 앱이 내 발음을 못
  알아들었던 이유도 여기에 있습니다"라고 직접 연결됨). 헤드폰(Frame 2 소품)은 넣지 않는다.
- 2장을 같은 세션에서 연달아 생성하고, 받으면 모자 로고·후드티 패치·얼굴형·수염·머리카락이
  기준 사진과 실제로 같은지 눈으로 대조할 것.

```
A young Korean person (gender-neutral presentation), wearing a navy blue baseball cap with
a subtle vertical-stripe emblem on the front, and a navy blue drawstring hoodie with a small
flag-shaped patch on the left chest, holding a smartphone in one hand. Flat-shaded
semi-realistic webtoon/sticker illustration style, bold clean black outlines, soft warm
cream background, die-cut white sticker border around the whole figure.

HAIR (strict, do not deviate — matched exactly to the reference photo, not a general
description): the cap covers almost the entire head. The ONLY hair visible anywhere is a
single small wedge/tuft of straight dark hair peeking out at the center of the front
hairline, right at the edge of the cap brim, plus the faintest hint of short hair at the very
top of each sideburn near the ears. There is NO hair visible anywhere else — nothing hanging
out at the sides of the cap, nothing visible at the back of the head, no hair reaching the
ears, jawline, or shoulders. If unsure how much hair to show, show less, not more.

FACIAL HAIR (strict, do not deviate): a short, neatly trimmed dark beard and mustache that
follows the jawline and chin closely — not sparse stubble, not a thick/bushy full beard, not
a goatee-only or mustache-only style. The exact same short trimmed beard shape and thickness
in every single image. Never clean-shaven, never a different beard style.

Framing: waist-up (half-body) shot, centered, with generous empty margin on all sides —
leave at least 15% empty space above the top of the cap and at least 10% margin on the left
and right of the body. The cap logo and the hoodie chest patch must be fully inside the
frame with clear space around them. Do not crop the cap, the hood, or the hands.

Same character, same outfit, same face, same hair, same beard in every single image — do not
redesign the cap logo, hoodie patch, facial features, hair, or beard between shots.

NEGATIVE / DO NOT GENERATE: long hair past the shoulders, visible hair at the sides of the
cap, visible hair at the back of the head, hair covering or reaching the ears, clean-shaven
face, no facial hair, patchy/uneven stubble, thick bushy full beard, different beard style,
different cap design or logo, different hoodie patch design, different hoodie color, bare
head (no cap), headphones, different face shape, changed gender presentation, realistic
photo style, 3D render style, long paragraphs of text, tiny unreadable text, garbled letters.
```

## Image 1 — R↔L 정면충돌 임팩트 (캐릭터 없음, 독립 그래픽)

코드가 "R"과 "L" 배지 2개를 화면 양쪽에서 중앙으로 슬라이드시켜 부딪히게 만드는 건 그대로
유지한다. 이 이미지는 **그 충돌이 실제로 터지는 순간**에 짧게 확대되며 나타나는 임팩트
비주얼이다 — 기존엔 280px 작은 박스였지만 이제 화면의 상당 부분을 차지하는 큰 일러스트로
키운다.

```
A bold comic-style illustration of a head-on collision impact, in the same flat-shaded
sticker/webtoon style as the rest of this channel (bold black outlines, flat bright colors,
die-cut white sticker border). Two abstract force shapes crashing into each other at the
center: on the left, a blue arrow-like force shape with the letter "R" written boldly inside
it, pulling backward; on the right, a red arrow-like force shape with the letter "L" written
boldly inside it, lunging forward. They collide at the center in a dramatic starburst impact
explosion with jagged comic energy lines, small stars, and motion streaks radiating outward.
Bold comic sound-effect lettering "쾅!!" (in Korean, thick cartoon comic-book style lettering
with a black outline and yellow fill) placed near the impact burst. Soft warm cream
background, no characters or people in this image, no additional text beyond "R", "L", and
"쾅!!". Clean, bold, energetic, readable at a glance.
```

## Image 2 — 함정 1: 서두르다 L을 생략 ("Word"로 뭉개짐)

```
Same locked character (see common description above), speaking quickly with a hurried,
flustered expression — eyebrows raised in mild panic, mouth open mid-word as if rushing
through a sentence, one hand gesturing quickly near the chest. A small comic speech bubble
near the character's mouth contains only the bold word "Word" in clean sans-serif lettering,
with a small red "✕" mark next to it. The smartphone is visible in the other hand. This
should read as "talking too fast and skipping a sound."
```

## Image 3 — 함정 2: 혀 힘이 풀려버림 ("Old"로 둔갑)

```
Same locked character (see common description above), looking suddenly tired and deflated
mid-word — eyes half-lidded, shoulders slightly slumped, mouth relaxed and slightly open in
a loose, energy-less shape as if the tongue just went limp. A small comic speech bubble near
the character's mouth contains only the bold word "Old" in clean sans-serif lettering, with
a small red "✕" mark next to it. The smartphone is visible in the other hand. This should
read as "running out of tongue tension mid-word."
```

## 완료 후

- `f03_collision.jpg` ← Image 1 (독립 그래픽, 캐릭터 없음)
- `f03_pitfall_word.jpg` ← Image 2
- `f03_pitfall_old.jpg` ← Image 3

받으면 대조 검증한 뒤 Frame 3 코드(`compositions/frames/03-physics-crash.html`)를
재구성하겠습니다 — 충돌 이미지는 크게 키우고, 하단 텍스트 전용 "함정" 카드 2개는 이 두
일러스트로 교체(결과 단어 "Word"/"Old"는 자막이 아니라 이미지 안에 이미 있으므로 카드에
따로 중복 텍스트로 넣지 않음).
