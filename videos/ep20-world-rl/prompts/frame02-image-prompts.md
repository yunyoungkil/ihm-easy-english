# Frame 2(02-broken-common-sense) 이미지 제작 프롬프트 — Google Flow용

2026-09-22 작성. 기존 Frame 2는 왼쪽 카드(260px 고정 박스에 갇힌 캐릭터 이미지 3장을
8~14초씩 붙들고 있다가 뚝 끊어 바꾸는 가짜 스톱모션)와 오른쪽 카드(이미지가 아예 없이
가사·테이프·도장 전부 코드/이모지로만 채운 카드)로 나뉘어 있었다. Frame 1과 같은 원칙
(이미지 화면 점유율 40%+, 텍스트는 코드 전용, 진짜 스톱모션)으로 두 카드를 하나의 큰
장면으로 합친다 — 캐릭터가 신나게 노래를 따라 부르다가 "World"에서 혀가 R에서 L로
못 넘어가고 턱이 굳어버리는 하나의 연속된 리액션.

## ⚠️ 일관성을 위해 반드시 지킬 것

- **Flow의 "Ingredients"(참고 이미지 업로드) 기능에 아래 모든 프롬프트에 동일한 기준
  이미지 1장을 넣을 것** — `assets/images/f01_react_00_neutral.jpg`(Frame 1에서 이미
  일관성 검증을 통과한 채널 캐릭터 기준 이미지)를 그대로 쓴다. 한 영상 안에서 등장하는
  캐릭터이므로 Frame 1과 얼굴·모자 로고·후드티 패치가 반드시 같아야 한다.
- 개수 제약 없음 — 표정과 동작이 부자연스럽게 튀지 않도록, 필요하면 아래 단계 사이에
  중간 단계를 추가로 더 뽑아도 된다(같은 기준 이미지로).
- 전부 **한 세션(같은 대화창) 안에서 연달아** 생성할 것.
- 다 받으면 **순서대로 나란히 놓고 모자 로고·후드티 패치·얼굴형이 실제로 같은지 먼저
  눈으로 대조**한 뒤에 코드에 넣을 것 — 하나라도 다르면 그 장만 다시 뽑는다.

## 공통 캐릭터 묘사 (매 프롬프트에 그대로 포함할 것)

```
A young Korean person (gender-neutral presentation), wearing a navy blue baseball cap with
a subtle vertical-stripe emblem on the front, and a navy blue drawstring hoodie with a small
flag-shaped patch on the left chest, wearing large over-ear headphones (the headphones must
be visible over both ears in every single image, never removed or missing). Flat-shaded
semi-realistic webtoon/sticker illustration style, bold clean black outlines, soft warm
cream background, die-cut white sticker border around the whole figure.

BOTH HANDS ARE EMPTY in every image — there is no smartphone, no phone, and no object of any
kind being held. This scene has nothing to do with a phone. Both hands are free to gesture,
touch the face/jaw, or move expressively, but never holding anything.

HAIR (strict, do not deviate — matched exactly to the reference photo, not a general
description): the cap covers almost the entire head. The ONLY hair visible anywhere is a
single small wedge/tuft of straight dark hair peeking out at the center of the front
hairline, right at the edge of the cap brim, plus the faintest hint of short hair at the very
top of each sideburn near the ears. There is NO hair visible anywhere else — nothing hanging
out at the sides of the cap, nothing visible at the back of the head, no hair reaching the
ears, jawline, or shoulders. If unsure how much hair to show, show less, not more — the
reference photo has barely any visible hair at all.

FACIAL HAIR (strict, do not deviate): a short, neatly trimmed dark beard and mustache that
follows the jawline and chin closely — not sparse stubble, not a thick/bushy full beard, not
a goatee-only or mustache-only style. The exact same short trimmed beard shape and thickness
in every single image. Never clean-shaven, never a different beard style, never a different
amount of facial hair from one shot to the next.

Framing: waist-up (half-body) shot, centered, with generous empty margin on all sides —
leave at least 15% empty space above the top of the cap and at least 10% margin on the left
and right of the body, enough room for both hands to gesture freely without leaving the
frame. The cap logo and the hoodie chest patch must be fully inside the frame with clear
space around them, never touching or crossing the image edge. Do not crop the cap, the
hood, the headphones, or the hands.

Same character, same outfit, same face, same hair length, same beard, same headphones in
every single image — do not redesign the cap logo, hoodie patch, facial features, hair,
beard, or headphones between shots. Treat this character as a fixed, locked reference
identity, not a new interpretation per prompt.

NEGATIVE / DO NOT GENERATE: long hair past the shoulders, flowing/loose long hair, ponytail,
visible hair at the sides of the cap, visible hair at the back of the head, hair covering or
reaching the ears, bangs/fringe hanging below the cap brim, clean-shaven face, no facial
hair, patchy/uneven stubble, thick bushy full beard, goatee only, mustache only, different
beard style or length, different cap design or logo, different hoodie patch design,
different hoodie color, bare head (no cap), no headphones, headphones removed or hanging
around neck instead of over ears, different headphones design, smartphone, phone, holding a
phone, holding any object in either hand, different face shape, changed gender presentation,
realistic photo style, 3D render style, text, letters, words, writing.
```

## Step 0 — 신나게 노래 따라 부르는 중

```
Singing along happily to music, eyes closed or half-closed with enjoyment, mouth open mid-
lyric in a joyful open-mouth singing shape, one hand loosely tapping rhythm near the chest.
Relaxed, carefree energy — this is the "just enjoying the song" moment before anything goes
wrong.
```

## Step 1 — R 소리 내려고 혀를 목구멍 쪽으로 마는 순간

```
Mid-lyric, starting to strain — eyebrows drawing in slightly, eyes narrowing with
concentration, mouth pulling into a tighter rounded shape as if curling the tongue back in
the throat for an "R" sound. Head tilting very slightly back. The carefree energy from
before is just starting to fade into effort.
```

## Step 2 — 그 상태에서 L까지 억지로 이어 붙이려고 용쓰는 순간

```
Visibly straining harder — jaw stretched open wider and slightly forward as if forcing the
curled tongue-tip up toward the roof of the mouth, eyebrows knit tightly together, eyes
squinting with real physical effort, a couple of small motion/strain lines near the jaw.
This should read as uncomfortable, effortful, on the edge of something going wrong.
```

## Step 3 — 혀와 턱이 그대로 굳어버리는 순간 (동작 정지)

```
Sudden freeze mid-motion — eyes snapped wide open in alarm, mouth stuck half-open in an
awkward frozen shape (not a clean expression, an interrupted one), head tilted at a slightly
off angle as if paused mid-movement. A few small comic "freeze" motion lines or a tiny
sweat drop near the temple. This is a stop-motion "stuck frame" energy, like the character
got paused mid-action.
```

## Step 4 — 턱에 쥐가 나서 통증을 느끼는 순간

```
Both hands (or one hand) clutching the jaw/cheek area in pain, eyes squeezed shut tightly,
mouth twisted into a wincing grimace. Small red "impact" marks or tiny star-shaped pain
symbols near the jaw. Clear, exaggerated comic pain reaction.
```

## Step 5 — 지쳐서 포기하는 순간 ("혀 굴리면 끝장" 도장 타이밍)

```
Exhausted, defeated expression — one hand rubbing the jaw slowly, eyes half-lidded and
tired, eyebrows raised in a resigned "I give up" way, shoulders slightly slumped. Tired but
slightly rueful, like someone who just learned the hard way. Not angry, just worn out.
```

## 완료 후

- `f02_react_00_singing.jpg` ← Step 0 — ✅ 완료
- `f02_react_01_curling_r.jpg` ← Step 1 — ✅ 완료
- `f02_react_02_reaching_l.jpg` ← Step 2 — ✅ 완료 (재생성 후 폰 사라짐, 헤드폰 정상)
- `f02_react_03_jaw_freeze.jpg` ← Step 3 — ✅ 완료 (재생성 후 폰 사라짐, 헤드폰 복귀)
- `f02_react_04_jaw_pain.jpg` ← Step 4 — ✅ 완료
- `f02_react_05_defeated.jpg` ← Step 5 — ✅ 완료

6장 전부 확보 완료. 이제 Frame 2 코드(`compositions/frames/02-broken-common-sense.html`)를
두 카드 구조에서 하나의 큰 장면으로 재구성하는 작업으로 진행.
