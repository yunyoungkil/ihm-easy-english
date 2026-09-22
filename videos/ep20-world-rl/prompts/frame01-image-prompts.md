# Frame 1(01-cold-open) 이미지 제작 프롬프트 — Google Flow용

2026-09-22 작성. ComfyUI(IP-Adapter+ControlNet)로 만든 4단계 반응 이미지가 모자 로고·후드티
패치·얼굴형·배경 스타일이 컷마다 달라지는 문제로 폐기되고(`TASKS.md` 참고), 지금 Frame 1은
`f01_react_00_neutral.jpg` 한 장만 고정으로 쓰고 나머지 반응은 코드(GSAP 흔들림+땀방울)로
처리하고 있다. 이 프롬프트는 **Google Flow로 다시 시도해서 일관성이 유지되면 4단계 반응
스톱모션을 되살리기 위한** 것이다.

## ⚠️ 일관성을 위해 반드시 지킬 것

- **Flow의 "Ingredients"(참고 이미지 업로드) 기능에 4개 프롬프트 전부 동일한 기준 이미지
  1장을 넣을 것** — 이번 소재의 기준 이미지는 `assets/images/f01_react_00_neutral.jpg`
  (현재 화면에 쓰이고 있는, 사용자가 가장 낫다고 판단한 이미지)를 그대로 쓴다. 매번 다른
  참고 이미지를 넣으면 ComfyUI 때와 똑같이 정체성이 흔들린다.
- 4개를 **한 세션(같은 대화창) 안에서 연달아** 생성할 것 — Flow도 세션 컨텍스트가 이어지면
  스타일이 덜 흔들리는 경향이 있다.
- 4장을 다 받으면 **나란히 놓고 모자 로고·후드티 패치·얼굴형이 실제로 같은지 먼저 눈으로
  대조**한 뒤에 코드에 넣을 것 — 하나라도 다르면 그 장만 다시 뽑거나, 이번에도 다르면 4단계
  스왑은 포기하고 단일 이미지 방식을 유지하는 게 낫다(에이전트가 확인해 드릴 수 있음).

## 공통 캐릭터 묘사 (매 프롬프트에 그대로 포함할 것)

```
A young Korean person (gender-neutral presentation), wearing a navy blue baseball cap with
a subtle vertical-stripe emblem on the front, and a navy blue drawstring hoodie with a small
flag-shaped patch on the left chest, holding a smartphone in one hand. Flat-shaded
semi-realistic webtoon/sticker illustration style, bold clean black outlines, soft warm
cream background, die-cut white sticker border around the whole figure.

HAIR (strict, do not deviate): short dark hair that ends above the earlobes, tucked mostly
under the cap with only a small amount of hair visible at the sides/back — the hair must
NEVER reach the chin, jawline, or shoulders in any shot. Treat the hair length as a fixed,
locked trait exactly like the cap or hoodie, not something to vary per pose.

Framing: waist-up (half-body) shot, centered, with generous empty margin on all sides —
leave at least 15% empty space above the top of the cap and at least 10% margin on the left
and right of the body. The cap logo and the hoodie chest patch must be fully inside the
frame with clear space around them, never touching or crossing the image edge. Do not
crop the cap, the hood, or the hands holding the phone.

Same character, same outfit, same face, same hair length in every single image — do not
redesign the cap logo, hoodie patch, facial features, or hair between shots. Treat this
character as a fixed, locked reference identity, not a new interpretation per prompt.

NEGATIVE / DO NOT GENERATE: long hair past the shoulders, flowing/loose long hair, ponytail,
different cap design or logo, different hoodie patch design, different hoodie color, bare
head (no cap), different face shape, changed gender presentation, realistic photo style,
3D render style.
```

**Flow에 별도 "Negative prompt" 입력창이 있으면 위 NEGATIVE 문단만 그쪽에 그대로 붙여넣을
것** — 같은 문장을 본문과 네거티브 프롬프트 양쪽에 다 넣어야 실제로 힘이 세진다(한쪽에만
있으면 무시되는 경우가 많음).

## Step 0 — Neutral (참고용, 이미 있음)

이미 만족한 이미지가 있으므로 재생성 불필요. 혹시 다시 뽑을 경우에만 사용:

```
[공통 캐릭터 묘사] + Calm, friendly expression, smiling, waving one hand toward camera while
holding a smartphone with a red circular record icon on its screen in the other hand.
Neutral, relaxed pose — this is the "about to start a pronunciation test" moment.
```

## Step 1 — Confused (턱을 굴렸는데 이상하다)

```
[공통 캐릭터 묘사] + Slightly confused, puzzled expression — one eyebrow raised, mouth in a
flat uncertain line, eyes narrowed slightly. Holding the smartphone up closer to their face,
studying the screen with a questioning look. Slight head tilt.
```

## Step 2 — Surprised (오답 화면이 막 뜨는 순간)

```
[공통 캐릭터 묘사] + Surprised, wide-eyed expression — eyebrows raised high, mouth slightly
open in a small "oh" shape. Pulling the smartphone slightly away from their face as if
startled by what just appeared on screen. Body leaning back a few degrees.
```

## Step 3 — Shocked (완전히 충격받은 리액션)

```
[공통 캐릭터 묘사] + Fully shocked, exaggerated comic reaction — both arms thrown up beside
the head, eyes wide open, mouth open in an exaggerated gasp, eyebrows shot up. The
smartphone is still visible in one raised hand. Comic "impact" energy, like a stamp/freeze
frame in a stop-motion sequence.
```

## 별도 에셋 — 폰 오답 화면 목업 (캐릭터 없음)

Frame 1의 스마트폰 카드 안에 들어가는 `f01_phone_error.jpg`도 같은 폴더에 넣을 것. 이건
캐릭터가 아니라 화면 UI 목업이지만, **캐릭터 이미지와 똑같은 일러스트 스타일**로 맞춰야
한 화면 안에서 그림체가 따로 놀지 않는다(2026-09-22 수정 — 기존 프롬프트가 "blurred hands"
같은 사진 목업 톤이라 캐릭터의 납작한 웹툰/스티커 스타일과 어울리지 않았음). 손도 사진이
아니라 캐릭터와 같은 방식으로 그려진 일러스트 손이어야 한다:

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

4단계 이미지를 받으면 아래 파일명으로 `assets/images/`에 저장해 알려주세요 — 이름은
기존과 동일하게 맞춰뒀습니다(그대로 덮어쓰면 코드 수정 없이 바로 적용 가능):

- `f01_react_00_neutral.jpg` (이미 있음, 필요시만 교체)
- `f01_react_01_confused.jpg`
- `f01_react_02_surprised.jpg`
- `f01_react_03_shocked.jpg`
- `f01_phone_error.jpg` (이미 있음, 필요시만 교체)

4장의 일관성이 실제로 괜찮으면, 지금 코드(단일 이미지+GSAP 반응)를 다시 4단계 스왑 방식으로
되돌리는 건 에이전트가 처리하겠습니다.
