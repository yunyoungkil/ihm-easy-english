# Frame 4 구강 단면도 이미지 생성 프롬프트 — Gemini/Imagen용

## 왜 필요한가

Frame 4는 이 영상 전체에서 가장 중요한 "반전 공개" — R 자세(혀를 뒤로 당김)를 그대로 유지한
채 목구멍에서 게으르게 '을' 소리만 내면 된다는, 실제 발음 메커니즘을 가르치는 프레임이다.
그런데 캐릭터 반응 이미지 5장(복습+4단계)만으로는 "편안해 보인다"는 감정만 전달되고,
정작 **입 안에서 혀가 어떻게 있어야 하는지**는 자막 글자로만 설명되고 화면엔 안 보였다.
`knowledge/production-rules.md`의 "구강 단면도는 AI 이미지로 만든다" 원칙에 따라, EP17에서
이미 검증된 스타일(`videos/ep17-bossy-r/assets/images/mouth-cross-section.jpg` — 크림/흰
배경, 손그림 잉크 라인, 파스텔 핑크 혀·목구멍)을 그대로 참고해 1장을 새로 만든다.

## 🇰🇷 한글 요약

옆에서 본 입-목구멍 단면도. 혀가 뒤로(목구멍 쪽으로) 당겨진 R 자세 그대로 그려져 있고,
혀끝이 윗잇몸/입천장에 닿는 지점에는 살짝 떨어져 있는 모습 + 그 지점 근처에 은은한
점선/약한 표시로 "여기 안 닿아도 됨"을 암시한다(직접적인 X 표시나 글자는 이미지에 넣지
않는다 — 코드로 나중에 화살표·X 뱃지를 얹을 것이므로 단면도 자체는 깔끔하게 비워둔다).
목구멍 안쪽(성대 근처)에서는 부드러운 색 그라데이션이나 은은한 빛으로 "여기서 소리가
울려나온다"는 느낌만 표현한다. 글자는 전혀 넣지 않는다 — 라벨은 전부 코드로 나중에 얹는다.

## 영문 프롬프트

```
A clean, friendly, educational sketch-note cross-section illustration of a human head and
mouth in side profile, in the exact same style as a hand-drawn textbook diagram: thick,
confident black ink pen outlines, warm pastel color fills (soft peach/cream skin tone, soft
pink tongue and throat interior), solid warm cream background (hex #F4EFE6), no gradients, no
shading beyond simple flat pastel fills, no photorealism.

Show the tongue pulled back and slightly bunched toward the throat (the tongue root drawn
noticeably retracted, not resting flat) — this is the "R" tongue position. The tongue tip
should be relaxed and hanging loosely low in the mouth, clearly NOT touching or reaching
toward the roof of the mouth / upper gum ridge — leave a small, clear, visible gap of empty
space between the tongue tip and the roof of the mouth so a viewer can immediately see they
are not in contact.

In the throat/vocal tract area (below and behind the tongue root), add a soft, gentle glow or
a few very light, soft concentric wavy lines radiating outward, suggesting quiet vocal
resonance or sound gently emanating from that area — keep this subtle and soft, not a loud or
sharp effect.

Composition: simple side-profile head silhouette (nose, lips, chin, jaw outline only, no hair,
no ears needed), cropped fairly close so the mouth and throat cross-section fills most of the
frame. Landscape orientation, roughly 3:2 aspect ratio.

Absolutely NO text, no letters, no labels, no arrows, no X marks, no phonetic symbols anywhere
in the image — leave the diagram completely clean so text and callout graphics can be added
separately afterward. No dark background, no neon, no sci-fi styling — this must match a warm,
approachable, hand-drawn educational textbook look.
```

## 저장 위치

`videos/ep20-world-rl/assets/images/f04_mechanism_diagram.jpg`

## 코드에서 쓸 방식

`04-lazy-tongue-rule.html`의 hero-illustration-box 안에 6번째 이미지 레이어로 추가한다.
타이밍: 14.0초(혀끝 닿지 마세요 도장이 뜨는 시점)에 이 단면도로 전환해 도장과 함께 겹쳐
보이게 하고, cap4 설명이 이어지는 27.21초까지(총 약 13.2초) 유지한다. 그 위에 코드로
X 뱃지(혀끝-입천장 접촉 지점)와 "을~" 라벨을 오버레이로 얹어 애니메이션한다.
