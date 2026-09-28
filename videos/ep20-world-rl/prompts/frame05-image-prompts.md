# Frame 5(05-step1-woo-eo) 이미지 제작 프롬프트 — Google Flow용

2026-09-27 작성. 기존 `f05_mouth_oo.jpg`/`f05_mouth_uh.jpg`는 실제로는 입모양과 무관한
"엄지척+손 흔들기" 포즈였음이 확인되어 사용 불가 판정(TASKS.md 섹션 참고) → 신규 제작.

> ⚠️ **영상 프롬프트는 테스트 추가분(2026-09-27)** — 이미지가 아니라 짧은 동영상 클립으로
> 만들면 어떤지 사용자가 시험해보고 싶어해서, 각 이미지 아래에 그 이미지를 첫 프레임으로 쓰는
> Veo(구글 Flow의 영상 생성) 프롬프트를 같이 적어둔다. `knowledge/google-ai-studio-prompting.md`
> §1 구조(Subject/Action/Style/Camera/Focus/Ambiance)를 따랐고, 얼굴·입이 나오므로 "말하는
> 것으로 오인해 임의 대사를 붙이는" 사고를 막기 위해 무음+"대사 없음"을 명시적으로 못박았다
> (§1의 EP13 B롤 사고 사례 참고). 이미지가 아직 없으면 영상 생성도 당연히 불가능하므로,
> **이미지 5장을 먼저 만들고 나서** 그걸 Flow의 이미지-투-비디오 입력으로 넣어 시험할 것.

## ⚠️ 일관성을 위해 반드시 지킬 것

- Flow의 "Ingredients"(참고 이미지 업로드) 기능에 두 프롬프트 모두 **동일한 기준 이미지**
  `assets/images/f01_react_00_neutral.jpg`(이미 일관성 검증을 통과한 이미지)를 넣을 것.
- 두 장을 **한 세션(같은 대화창) 안에서 연달아** 생성할 것.
- **이 프레임만 예외적으로 클로즈업 프레이밍을 쓴다** — 아래 공통 캐릭터 묘사의 "waist-up"
  프레이밍 지시는 무시하고, 각 이미지 설명에 적힌 얼굴 클로즈업 지시를 따를 것. 입모양을
  가르치는 게 목적이라 상반신 샷으로는 입이 너무 작게 나온다.
- 받으면 **두 장을 나란히 놓고 모자 로고·얼굴형이 실제로 같은지 먼저 눈으로 대조**한 뒤에
  저장할 것.

## 공통 캐릭터 묘사 (매 프롬프트에 그대로 포함할 것)

```
A young Korean person (gender-neutral presentation), wearing a navy blue baseball cap with
a subtle vertical-stripe emblem on the front, and a navy blue drawstring hoodie with a small
flag-shaped patch on the left chest. Flat-shaded semi-realistic webtoon/sticker illustration
style, bold clean black outlines, soft warm cream background, die-cut white sticker border
around the whole figure.

HAIR (strict, do not deviate — matched exactly to the reference photo, not a general
description): the cap covers almost the entire head. The ONLY hair visible anywhere is a
single small wedge/tuft of straight dark hair peeking out at the center of the front
hairline, right at the edge of the cap brim, plus the faintest hint of short hair at the very
top of each sideburn near the ears. There is NO hair visible anywhere else.

FACIAL HAIR (strict, do not deviate): a short, neatly trimmed dark beard and mustache that
follows the jawline and chin closely — not sparse stubble, not a thick/bushy full beard, not
a goatee-only or mustache-only style. The exact same short trimmed beard shape and thickness
as the reference photo.

Same character, same outfit, same face, same hair length, same beard as the reference image
— do not redesign the cap logo, facial features, hair, or beard.

NEGATIVE / DO NOT GENERATE: long hair past the shoulders, visible hair at the sides of the
cap, visible hair at the back of the head, bangs/fringe hanging below the cap brim,
clean-shaven face, no facial hair, patchy/uneven stubble, thick bushy full beard, different
cap design or logo, bare head (no cap), different face shape, changed gender presentation,
realistic photo style, 3D render style, any text or letters anywhere in the image.
```

## Image 1 — "우" 입모양 (★신규)

```
Extreme close-up on the face only, cropped tight from the forehead to the chin (NOT a
waist-up shot — this needs to teach a mouth shape clearly, so the mouth must fill a large
part of the frame). The character's lips are pushed forward and rounded tightly into an
"OO" shape, as if about to whistle, cheeks very slightly puffed, eyes softly focused forward
in gentle concentration. Calm, instructional mood — this is a "watch my mouth" demonstration
moment, not an exaggerated comic reaction.
```

### 🎬 영상 프롬프트 (테스트, Image 1을 첫 프레임으로 하는 image-to-video)

**🇰🇷 한글 요약**: 방금 만든 "우" 입모양 사진을 시작 프레임으로 넣고, 입술이 편안한
상태에서 천천히 오므라들어 "우" 모양으로 동그랗게 말리는 2초짜리 동작을 만든 뒤, 남은
시간은 그 모양을 그대로 유지한다. 카메라는 고정, 소리는 완전히 없음(대사·효과음 전부 없음
— 이 캐릭터가 실제로 말하는 걸로 AI가 착각해서 엉뚱한 대사를 지어내는 사고를 막기 위해
"말하는 게 아니다"까지 명시).

```
Subject: the character's face in extreme close-up, matching the first-frame reference image
exactly (same character, same style, same framing — do not change identity, outfit, or crop).
Action: starting from relaxed, closed neutral lips, the lips slowly press together and push
forward over about 2 seconds, rounding tightly into the "OO" pucker shape shown in the
reference image, then hold that exact rounded pucker shape completely still for the rest of
the clip.
Style: flat-shaded semi-realistic webtoon/sticker illustration style, matching the reference
image exactly — not photorealistic, not 3D.
Camera positioning/motion: static camera, no movement, locked extreme close-up framing.
Focus/lens: shallow focus centered on the mouth and lips.
Ambiance: soft warm cream background, calm and quiet instructional mood.
Audio: Silent — no dialogue, no sound effects, no music. The character is NOT saying any
word, this is not speech, this is a silent mouth-shape demonstration only — do not add
lip-sync to any word, do not generate any spoken audio or vocal sound.
```

파라미터: `duration: "8"` (레퍼런스 이미지 사용 시 8초 필수), `aspect_ratio: "16:9"`.

## Image 2 — "어" 입모양 (★신규)

```
Extreme close-up on the face only, cropped tight from the forehead to the chin (same
framing as Image 1). The character's jaw is dropped low and completely relaxed, mouth open
wide in a gentle "AH" shape like a soft yawn, eyebrows relaxed and neutral, expression calm
and natural — demonstrating a jaw fully released of tension. Calm, instructional mood, not
an exaggerated comic reaction.
```

### 🎬 영상 프롬프트 (테스트, Image 2를 첫 프레임으로 하는 image-to-video)

**🇰🇷 한글 요약**: "어" 입모양 사진을 시작 프레임으로 넣고, 턱이 닫힌 상태에서 천천히
아래로 내려가며 편안하게 벌어지는 2초짜리 동작을 만든 뒤, 남은 시간은 그 벌어진 모양을
그대로 유지한다. 나머지 조건(카메라 고정·무음·대사 없음)은 Image 1 영상 프롬프트와 동일.

```
Subject: the character's face in extreme close-up, matching the first-frame reference image
exactly (same character, same style, same framing — do not change identity, outfit, or crop).
Action: starting from a closed, neutral mouth, the jaw drops smoothly and slowly downward
over about 2 seconds into the wide, relaxed open "AH" shape shown in the reference image,
then hold that exact relaxed open position completely still for the rest of the clip.
Style: flat-shaded semi-realistic webtoon/sticker illustration style, matching the reference
image exactly — not photorealistic, not 3D.
Camera positioning/motion: static camera, no movement, locked extreme close-up framing.
Focus/lens: shallow focus centered on the mouth and jaw.
Ambiance: soft warm cream background, calm and quiet instructional mood.
Audio: Silent — no dialogue, no sound effects, no music. The character is NOT saying any
word, this is not speech, this is a silent mouth-shape demonstration only — do not add
lip-sync to any word, do not generate any spoken audio or vocal sound.
```

파라미터: `duration: "8"`, `aspect_ratio: "16:9"`.

## 완료 후

받은 이미지를 아래 **기존 파일명 그대로 덮어써서** `assets/images/`에 저장해 주세요
(기존 파일은 이미 못 쓰는 걸로 확정됐으므로 이름을 새로 만들 필요 없음):

- `f05_mouth_oo.jpg` ← Image 1
- `f05_mouth_uh.jpg` ← Image 2

저장 완료되면 알려주시면, Frame 5(`compositions/frames/05-step1-woo-eo.html`)를 이 두
이미지가 화면의 시각적 주인공이 되도록(현재의 카드 중심 구성 대신 큰 이미지 박스 + 보조
글자 라벨 구성으로) 다시 짜고 재검수하겠습니다.

영상 프롬프트도 시험해보셨다면, 결과 클립을 `f05_mouth_oo.mp4` / `f05_mouth_uh.mp4`로
같은 폴더에 저장해 주세요 — 이미지 대신 영상을 쓸지는 결과물을 같이 보고 정하겠습니다
(캐릭터 정체성이 흔들리거나 어색한 움직임이 나오면 이미지 정지컷 쪽을 그대로 씁니다).
