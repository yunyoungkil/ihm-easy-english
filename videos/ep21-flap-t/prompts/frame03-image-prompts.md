# Frame 3(03-lazy-tongue-principle) 구강 단면 일러스트 + 영상 프롬프트 — Google 생성형 AI용

Frame 3는 이 영상의 제목·썸네일 약속("City의 T, 완벽하게 속았네")을 실제로 증명하는 핵심
프레임이다. "원어민 혀는 T를 낼 때 원래 입천장(치조 능선)에 딱 붙였다 떼는데, 뒤 모음에 힘이
빠져 있으면 혀가 거기서 멈추지 않고 톡 스치듯 지나간다"는 원리를 말로만 설명하면 추상적이라,
구강 단면 일러스트로 "완전히 막는 동작"과 "스치고 지나가는 동작"을 직접 보여준다
(`frame.md`의 `mouth_full_stop`/`mouth_flap` 자산, BRIEF.md Assets 절에서 이미 예견됨).

지금은 `compositions/frames/03-lazy-tongue-principle.html`에 점선 placeholder 박스로
비워둔 상태(2026-10-01, 사용자 지시 "일러스트 들어갈 자리는 비워놓고 영상 작업 시작해") —
아래 프롬프트로 실제 이미지/영상을 받으면 그 자리에 바로 끼워 넣는다.

## 🇰🇷 한글 요약

- **스타일 기준**: `videos/ep17-bossy-r/assets/images/mouth-cross-section.jpg`를 그대로
  참고했다 — 얼굴 옆모습 실루엣(살구빛/크림색), 입을 벌린 단면도, 혀는 분홍색으로 두껍게
  강조, 이빨은 흰색 단순 도형, 전체를 가는 짙은 갈색/적갈색 선 하나로 깔끔하게 두른
  손그림풍 벡터 일러스트. 사진처럼 사실적이지 않고, 의학 교과서 그림도 아니다 — 이 채널
  스케치노트 톤의 "친근한 교육용 다이어그램" 느낌.
- **이미지 2장**:
  1. **시작(`mouth_full_stop`)**: 혀끝이 치조 능선(윗니 바로 뒷부분 잇몸)에 완전히 딱
     붙어서 공기 길을 막고 있는 상태 — 일반 T("탁" 끊어지는 소리)를 낼 때 모양.
  2. **끝(`mouth_flap`)**: 똑같은 구도인데 혀끝이 치조 능선에 완전히 안 붙고 살짝
     스치듯 튕기며 지나가는 순간 — 혀끝 뒤로 짧은 움직임 궤적 선(모션 라인)을 같이 그려서
     "스치고 지나간다"는 느낌을 시각적으로 보탠다.
  배경은 "투명"이라고만 쓰지 않고 **화면에 실제로 깔릴 크림색(`#F4EFE6`)을 단색으로
  정확히 채워달라고 명시**했다 — `knowledge/google-ai-studio-prompting.md`에 EP16에서
  "투명"이 안 먹혔던 전례가 기록돼 있어서, 이번엔 그 실패를 피하려고 처음부터 단색
  배경으로 받는다.
- **영상 1개**: 시작 이미지를 첫 프레임으로 놓고, 혀끝이 치조 능선에 딱 붙어 있다가
  빠르게 톡 떨어져 나가며 스치고 지나가는 **단 한 번의 짧고 경쾌한 동작**만 애니메이션
  한다(실제 Flap T는 수십 밀리초짜리 순간 동작이라, 여기서도 느릿느릿한 슬로모션이
  아니라 "톡" 하고 가벼운 스냅 동작으로 표현). 나머지 시간은 시작/끝 포즈를 붙잡고 있어서
  영상에서 어느 지점을 캡처해도 정적 이미지로도 바로 쓸 수 있게 했다.
- 이 영상도 EP20 Frame 5·6처럼 **시험용**이다 — 이미지 2장을 먼저 받아서 코드에 넣어보고,
  영상이 실제로 잘 나오면 크로스페이드 대신 영상으로 교체할지는 결과물 보고 같이 정한다.

---

## 공통 묘사 (두 이미지 모두 동일하게 포함할 것)

```
A clean, friendly educational vector illustration of a human head in side profile (facing
left), showing a cross-section cutaway view of the mouth and throat to reveal the tongue,
teeth, and airway — in the exact same hand-drawn sketchnote diagram style as a medical/
educational infographic, NOT photorealistic, NOT a clinical textbook illustration.

Style: soft warm peach/cream skin tone for the head and face silhouette, single continuous
thin dark maroon/brown ink outline throughout (consistent line weight), flat minimal shading
with no gradients or textures, a small simple nose and closed eye suggested only by the
silhouette line. The tongue is a thick, rounded, warm coral-pink shape with a slightly darker
pink shading line along its upper curve. The teeth (upper and lower, at the front of the open
mouth) are simple flat white rounded rectangle shapes with the same thin outline, 2-3 teeth
visible on each row, not anatomically detailed. The inside of the mouth/throat cavity behind
the tongue is a slightly deeper dusty-rose tone. The mouth is open in profile, lips parted,
jaw relaxed.

Background: a solid, flat, opaque cream color — exact hex #F4EFE6 — filling the entire canvas
edge to edge, no gradient, no texture, no vignette, no transparency.

Composition: the head fills most of the frame with generous even margin on all sides (at
least 12% empty background space on every edge), centered vertically, facing/looking toward
the left edge of the frame. No text, no labels, no arrows, no letters or numbers anywhere in
the image.

NEGATIVE / DO NOT GENERATE: photorealistic style, 3D render, clinical/textbook medical
illustration with anatomical labels, grayscale or black-and-white, visible teeth roots or
gums in anatomical detail, any text/letters/numbers/captions, a full front-facing face, a
second person, a transparent or checkered background.
```

## 이미지 1 — 시작: `mouth_full_stop` (일반 T, 혀가 완전히 막음)

```
[공통 묘사 전체를 그대로 포함]

Tongue position: the tip of the tongue is raised and pressed firmly and fully against the
ridge directly behind the upper front teeth (the alveolar ridge), completely sealing off the
airway at that point — this is the standard "full stop" tongue position for pronouncing a
crisp T sound. The point of contact between the tongue tip and the ridge should be clearly
visible and unambiguous — tongue tip flattened slightly where it touches, no gap, no
motion lines (this is a held, static position, not a moment of movement).
```

## 이미지 2 — 끝: `mouth_flap` (Flap T, 혀가 스치고 지나감)

```
[공통 묘사 전체를 그대로 포함, "mouth_full_stop"과 완전히 동일한 구도·각도·크기로]

Tongue position: the tip of the tongue is caught mid-motion, having already left the ridge
behind the upper front teeth — it is positioned slightly lower and further back than full
contact, grazing past the ridge rather than pressing into it, with a small visible gap of air
between the very tip of the tongue and the ridge at the point it just brushed past. Add one
or two short, light, curved motion-trail lines (thin, the same maroon ink color, slightly
faded/lighter) directly behind and below the tongue tip, arcing in the direction of motion, to
suggest a quick flicking/tapping movement that just happened — like a tiny motion-blur comic
line, not a drawn arrow. The overall mouth and jaw position stay identical to the first image
— only the tongue tip position and the added motion lines differ.
```

---

### 🎬 영상 프롬프트 (시험용 — 시작 이미지를 첫 프레임으로 하는 image-to-video)

```
Subject: the mouth cross-section illustration, matching the first-frame reference image
exactly (same style, same head, same framing, same cream #F4EFE6 background — do not change
identity, proportions, or crop).
Action: the clip opens holding the tongue tip firmly pressed against the ridge behind the
upper front teeth, completely still, for about 2 seconds. Then, in one quick, light, snappy
motion lasting well under half a second, the tongue tip flicks down and backward, brushing
past the ridge without pausing on it — a fast, effortless tap, not a slow stretch or a bounce.
A couple of short, thin motion-trail lines (matching the illustration's ink color) briefly
appear behind the tongue tip at the instant of the flick and fade out within half a second.
After the flick, the tongue tip settles into its "just grazed past" resting position (matching
the second reference image) and holds completely still there for the rest of the clip. Nothing
else in the image moves at any point — no blinking, no head motion, no camera motion.
Style: flat hand-drawn educational vector illustration style, matching the reference image
exactly — not photorealistic, not 3D, no added shading or texture beyond what's in the
reference.
Camera positioning/motion: static camera, no movement, locked framing on the full head.
Focus/lens: even flat focus across the frame, no depth-of-field blur, no vignette.
Ambiance: calm, clean, quiet instructional mood, solid flat cream background throughout.
Audio: Silent — no dialogue, no sound effects, no music. This is a diagram, not a person
speaking — do not add any spoken audio, vocal sound, mouth-pop sound, or lip-sync of any kind.
```

파라미터: `duration: "8"`, `aspect_ratio: "16:9"`.

---

## 완료 후

- 이미지 1(시작) → `assets/images/mouth_full_stop.jpg`로 저장
- 이미지 2(끝) → `assets/images/mouth_flap.jpg`로 저장
- 영상(시험) → `assets/images/mouth_flap_transition.mp4`로 저장 — 이미지 2장 크로스페이드
  대신 이 영상을 쓸지는 결과물을 같이 보고 정한다.

저장되면 알려주시면 `compositions/frames/03-lazy-tongue-principle.html`의 placeholder
박스를 실제 자산으로 교체하고 재검수하겠습니다.

## 시도 기록

(아직 없음 — 재생성이 필요해지면 여기에 무엇이 안 맞았고 어떻게 고쳤는지 기록할 것)
