# Frame 1(01-cold-open) 이미지 제작 프롬프트 — Google Flow용

2026-09-22 작성. ComfyUI(IP-Adapter+ControlNet)로 만든 4단계 반응 이미지가 모자 로고·후드티
패치·얼굴형·배경 스타일이 컷마다 달라지는 문제로 폐기되고(`TASKS.md` 참고), Google Flow로
재제작한 4단계(neutral/confused/surprised/shocked)는 일관성 검증을 통과했다.

⚠️ **2026-09-22 추가 — 4장→8장 확장**: 4단계 스왑을 코드에 넣어도 사용자가 "여전히 뚝뚝
끊긴다"고 두 차례 판정(타이밍만 조정해선 해결 안 됨). 원인은 키프레임 개수(4장/0.5초)가
인간 눈이 "부드러운 움직임"으로 인지하기엔 너무 적다는 것으로 결론 — 아래 4단계
사이사이에 **중간 단계 4장을 추가해서 총 8장**으로 프레임 밀도를 두 배로 늘린다
(TASKS.md 섹션 12 참고, 다음 세션에서 사용자가 "이미지 늘리기"로 최종 선택함).

## ⚠️ 일관성을 위해 반드시 지킬 것

- **Flow의 "Ingredients"(참고 이미지 업로드) 기능에 8개 프롬프트 전부 동일한 기준 이미지
  1장을 넣을 것** — 이번에도 `assets/images/f01_react_00_neutral.jpg`(이미 일관성 검증을
  통과한 이미지)를 기준으로 쓴다. 매번 다른 참고 이미지를 넣으면 ComfyUI 때와 똑같이
  정체성이 흔들린다.
- 8개를 **한 세션(같은 대화창) 안에서 연달아** 생성할 것 — Flow도 세션 컨텍스트가 이어지면
  스타일이 덜 흔들리는 경향이 있다.
- **기존 4장(neutral/confused/surprised/shocked)은 이미 일관성 검증을 통과했으므로 재생성
  불필요** — 이번엔 그 사이사이를 채우는 중간 단계 4장만 새로 만들면 된다.
- 8장을 다 받으면 **순서대로 나란히 놓고 모자 로고·후드티 패치·얼굴형이 실제로 같은지 먼저
  눈으로 대조**한 뒤에 코드에 넣을 것 — 하나라도 다르면 그 장만 다시 뽑는다.

## 공통 캐릭터 묘사 (매 프롬프트에 그대로 포함할 것)

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
ears, jawline, or shoulders. If unsure how much hair to show, show less, not more — the
reference photo has barely any visible hair at all.

FACIAL HAIR (strict, do not deviate): a short, neatly trimmed dark beard and mustache that
follows the jawline and chin closely — not sparse stubble, not a thick/bushy full beard, not
a goatee-only or mustache-only style. The exact same short trimmed beard shape and thickness
in every single image. Never clean-shaven, never a different beard style, never a different
amount of facial hair from one shot to the next.

Framing: waist-up (half-body) shot, centered, with generous empty margin on all sides —
leave at least 15% empty space above the top of the cap and at least 10% margin on the left
and right of the body. The cap logo and the hoodie chest patch must be fully inside the
frame with clear space around them, never touching or crossing the image edge. Do not
crop the cap, the hood, or the hands holding the phone.

Same character, same outfit, same face, same hair length, same beard in every single image
— do not redesign the cap logo, hoodie patch, facial features, hair, or beard between shots.
Treat this character as a fixed, locked reference identity, not a new interpretation per
prompt.

NEGATIVE / DO NOT GENERATE: long hair past the shoulders, flowing/loose long hair, ponytail,
visible hair at the sides of the cap, visible hair at the back of the head, hair covering or
reaching the ears, bangs/fringe hanging below the cap brim, clean-shaven face, no facial
hair, patchy/uneven stubble, thick bushy full beard, goatee only, mustache only, different
beard style or length, different cap design or logo, different hoodie patch design,
different hoodie color, bare head (no cap), different face shape, changed gender
presentation, realistic photo style, 3D render style.
```
## Step 0 — Neutral (기존, 재생성 불필요)

```
Calm, friendly expression, smiling, waving one hand toward camera while
holding a smartphone with a red circular record icon on its screen in the other hand.
Neutral, relaxed pose — this is the "about to start a pronunciation test" moment.
```

## Step 1 — Neutral→Confused 중간 단계 (★신규)

```
Expression halfway between calm and confused — the smile is just starting
to fade into a flat, neutral line, one eyebrow beginning to rise slightly (not fully raised
yet). Starting to lower the waving hand and bring attention toward the smartphone screen.
Head just beginning to tilt. This is a subtle, early-stage transition — much closer to calm
than to puzzled.
```

## Step 2 — Confused (기존, 재생성 불필요)

```
Slightly confused, puzzled expression — one eyebrow raised, mouth in a
flat uncertain line, eyes narrowed slightly. Holding the smartphone up closer to their face,
studying the screen with a questioning look. Slight head tilt.
```

## Step 3 — Confused→Surprised 중간 단계 (★신규)

```
Expression halfway between puzzled and surprised — both eyebrows now
rising further (no longer just one), eyes opening wider than the confused pose but not yet
fully wide, mouth just starting to open into a small gap. The smartphone is being held
slightly further from the face than in the confused pose, as if just noticing something is
wrong. Head straightening from the tilt.
```

## Step 4 — Surprised (기존, 재생성 불필요)

```
Surprised, wide-eyed expression — eyebrows raised high, mouth slightly
open in a small "oh" shape. Pulling the smartphone slightly away from their face as if
startled by what just appeared on screen. Body leaning back a few degrees.
```

## Step 5 — Surprised→Shocked 중간 단계 (★신규)

```
Expression halfway between surprised and fully shocked — eyes wide open
and starting to widen further, mouth opening wider than the surprised pose into the
beginning of a gasp, eyebrows shooting higher. One arm starting to lift up beside the head
(not both arms up yet — the other hand still holds the phone at chest height). Body leaning
back further than the surprised pose.
```

## Step 6 — Shocked (기존, 재생성 불필요)

```
Fully shocked, exaggerated comic reaction — both arms thrown up beside
the head, eyes wide open, mouth open in an exaggerated gasp, eyebrows shot up. The
smartphone is still visible in one raised hand. Comic "impact" energy, like a stamp/freeze
frame in a stop-motion sequence.
```

## Step 7 — Shocked 절정 유지 (★신규, "충격의 정점"을 한 박자 더 끌어주는 프레임)

```
The peak of the shocked reaction, one small beat after Step 6 — both
arms still thrown up beside the head but now slightly higher/wider than Step 6, mouth open
even wider in a full comic gasp, eyes at their absolute widest. This should read as the
exact same shocked pose as Step 6 but pushed slightly further, like the top of a bounce —
not a new expression, just a bit more exaggerated.
```

## 별도 에셋 — 폰 오답 화면 목업 (캐릭터 없음)

```
An illustrated close-up of a smartphone held by an illustrated hand, showing a
pronunciation-test app screen in a failure/error state — mostly red color scheme, a large
red X or warning icon on the screen. Drawn in the exact same flat-shaded semi-realistic
webtoon/sticker illustration style as the rest of this set: bold clean black outlines, soft
warm cream background, die-cut white sticker border around the whole phone-and-hand shape.
Do not use photographic, 3D-render, or blurred/motion-blur photo mockup style — everything,
including the hand and phone, must be flat illustrated line art. No readable text on the
screen (text will be added separately in code).
```

## 완료 후

**새로 만들 건 Step 1/3/5/7 딱 4장뿐**입니다(Step 0/2/4/6은 기존 파일 그대로 재사용).
아래 파일명으로 `assets/images/`에 저장해 알려주세요:

- `f01_react_00_neutral.jpg` (기존, 그대로 둠)
- `f01_react_00b_neutral_confused.jpg` ← Step 1 (★신규)
- `f01_react_01_confused.jpg` (기존, 그대로 둠)
- `f01_react_01b_confused_surprised.jpg` ← Step 3 (★신규)
- `f01_react_02_surprised.jpg` (기존, 그대로 둠)
- `f01_react_02b_surprised_shocked.jpg` ← Step 5 (★신규)
- `f01_react_03_shocked.jpg` (기존, 그대로 둠)
- `f01_react_03b_shocked_peak.jpg` ← Step 7 (★신규)
- `f01_phone_error.jpg` (기존, 그대로 둠)

4장을 받으면 8장 순서로 나란히 대조 검증한 뒤, Frame 1 코드(`compositions/frames/
01-cold-open.html`)의 4단계 스왑을 8단계로 확장하는 건 에이전트가 처리하겠습니다 —
전체 스톱모션 구간(현재 약 0.5초)을 8프레임 기준으로 약 0.7~0.8초까지 살짝 늘려서
초당 10~12장 속도(제작 규칙의 "진짜 스톱모션" 기준)를 맞출 예정입니다.
