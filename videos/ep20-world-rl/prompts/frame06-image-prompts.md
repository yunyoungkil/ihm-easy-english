# Frame 6(06-step2-eul-resonance) 이미지 제작 프롬프트 — Google Flow용

2026-09-27 작성. 기존 `f06_throat_dark_l.jpg`는 목구멍과 무관한 추상 소용돌이 무늬였음이
확인되어 사용 불가 판정(TASKS.md 참고) → 신규 제작.

> ⚠️ **영상 프롬프트는 테스트 추가분(2026-09-27)** — 상세 근거는
> `frame05-image-prompts.md` 상단 설명과 동일. 이미지를 먼저 만든 뒤 그걸 image-to-video
> 첫 프레임으로 넣어 시험할 것.

## ⚠️ 일관성을 위해 반드시 지킬 것

- Flow의 "Ingredients"에 `assets/images/f01_react_00_neutral.jpg`를 기준 이미지로 넣을 것.
- 이 프레임은 **표준 waist-up 프레이밍**(공통 캐릭터 묘사 그대로)을 쓴다 — Frame 5와 달리
  클로즈업 예외 없음.

## 공통 캐릭터 묘사 (그대로 포함할 것)

```
A young Korean person (gender-neutral presentation), wearing a navy blue baseball cap with
a subtle vertical-stripe emblem on the front, and a navy blue drawstring hoodie with a small
flag-shaped patch on the left chest. Flat-shaded semi-realistic webtoon/sticker illustration
style, bold clean black outlines, soft warm cream background, die-cut white sticker border
around the whole figure.

HAIR (strict): the cap covers almost the entire head. The ONLY hair visible anywhere is a
single small wedge/tuft of straight dark hair peeking out at the center of the front
hairline, right at the edge of the cap brim, plus the faintest hint of short hair at the very
top of each sideburn near the ears. No hair visible anywhere else.

FACIAL HAIR (strict): a short, neatly trimmed dark beard and mustache that follows the
jawline and chin closely, matching the reference photo exactly.

Framing: waist-up (half-body) shot, centered, with generous empty margin on all sides —
leave at least 15% empty space above the top of the cap and at least 10% margin on the left
and right of the body. Same character, same outfit, same face, same hair, same beard as the
reference image.

NEGATIVE / DO NOT GENERATE: long hair, visible hair at the sides/back of the cap, bangs
below the brim, clean-shaven face, different cap design, bare head, different face shape,
changed gender presentation, realistic photo style, 3D render style, any text or letters
anywhere in the image.
```

## Image — 목구멍 공명 (★신규)

```
The character's head is tilted back slightly, eyes gently closed in a calm, focused
expression, one hand resting loosely near the throat/neck (not covering it). Small stylized
sound-wave ripple lines are drawn emanating outward from the throat area — use the exact same
colorful vertical soundwave-bar motif already visible on the character's cap logo and hoodie
chest patch (thin vertical bars of varying height in warm blue/orange tones), softly glowing,
radiating outward from the neck like gentle ripples. This should visually communicate "the
sound comes from deep in the throat, not from the mouth or tongue." Calm, instructional mood.
```

### 🎬 영상 프롬프트 (테스트, 이 이미지를 첫 프레임으로 하는 image-to-video)

**🇰🇷 한글 요약**: 목구멍 공명 사진을 시작 프레임으로 넣고, 목에서 나오는 소리 파동 무늬가
심장 박동처럼 천천히 퍼졌다 사라지기를 반복하는 동작만 만든다. 캐릭터 얼굴·자세는 그대로
정지, 입 움직임이 전혀 없는 장면이라 "말하는 걸로 오인" 위험은 낮지만 그래도 무음·대사
없음을 동일하게 명시.

```
Subject: the character's upper body and neck, matching the first-frame reference image
exactly (same character, same style, same pose, same framing — do not change identity,
outfit, or crop).
Action: the small stylized sound-wave ripple lines gently pulse and radiate outward from the
throat in a slow, continuous, heartbeat-like rhythm — expanding outward, fading, then a new
ripple begins, repeating steadily for the whole clip. The character's face, eyes, and pose
stay completely still and unchanged throughout; only the ripple lines animate.
Style: flat-shaded semi-realistic webtoon/sticker illustration style, matching the reference
image exactly — not photorealistic, not 3D.
Camera positioning/motion: static camera, no movement, locked waist-up framing.
Focus/lens: even focus across the frame, no depth-of-field blur.
Ambiance: soft warm cream background, calm and quiet instructional mood, gentle glowing pulse.
Audio: Silent — no dialogue, no sound effects, no music. The character's mouth does not move
and is not speaking — do not add any spoken audio, vocal sound, or lip movement.
```

파라미터: `duration: "8"`, `aspect_ratio: "16:9"`.

## 완료 후

받은 이미지를 `assets/images/f06_throat_resonance.jpg`로 저장해 주세요 (기존
`f06_throat_dark_l.jpg`는 내용이 완전히 다른 무늬라 새 이름으로 저장 — 지우지 않아도 됨,
어차피 코드에서 참조를 안 하게 바꿀 예정).

저장 완료되면 알려주시면, Frame 6(`compositions/frames/06-step2-eul-resonance.html`)를 이
이미지가 화면의 시각적 주인공이 되도록 다시 짜고 재검수하겠습니다.

영상 프롬프트도 시험해보셨다면, 결과 클립을 `f06_throat_resonance.mp4`로 같은 폴더에
저장해 주세요 — 이미지 대신 영상을 쓸지는 결과물을 같이 보고 정하겠습니다.
