# Frame 10(10-quiz-pearl-curl) 이미지 제작 프롬프트 — Google Flow용

2026-09-27 작성, 2026-09-27 Curl 컨셉 수정. 기존 `f10_obj_pearl.jpg`/`f10_obj_curl.jpg`는
채널 화풍과 다른 애니메 스타일 인물 그림이었음이 확인되어 사용 불가 판정(TASKS.md 참고) →
신규 제작.

> ⚠️ **영상 프롬프트는 테스트 추가분(2026-09-27)** — 상세 근거는
> `frame05-image-prompts.md` 상단 설명과 동일. 이미지를 먼저 만든 뒤 그걸 image-to-video
> 첫 프레임으로 넣어 시험할 것.

> ⚠️ **Curl 컨셉 수정 배경(2026-09-27)**: 처음엔 "캐릭터가 고데기를 들고 있는 모습"으로
> 설계했는데, 실제로 만들어보니 사용자가 지적: 이 채널 캐릭터는 항상 모자를 쓰고 머리가
> 거의 안 보이는 정체성이라, 그 캐릭터한테 "고데기로 머리를 만다"는 행동을 시키는 것
> 자체가 앞뒤가 안 맞는다(짧은 머리에 모자까지 쓴 사람이 고데기를 쓸 이유가 없음). →
> **Curl은 캐릭터 없이 오브젝트만 그린다**(Frame 9의 `f09_obj_word.jpg`/`f09_obj_world.jpg`
> 방식과 동일). Pearl은 "마시는 행동"이라 캐릭터가 자연스럽게 어울리므로 그대로 유지.

## Image 1 — Pearl (버블티, 캐릭터 등장) — 완료됨, 재생성 불필요

이미 생성 완료: `Character_holding_bubble_tea_cup_2K_20260927163159.jpg`
→ `f10_char_pearl.jpg`로 저장. 품질 확인 완료(캐릭터 정체성 일치, 버블티 펄 선명하게
보임). 영상(`Character_drinking_bubble_tea_1080p_20260927170259.mp4` →
`f10_char_pearl.mp4`)도 컵을 들어 한 모금 마시고 내리는 3단계 동작이 뚜렷하게 나와
품질 확인 완료 — 이 프레임은 영상을 쓴다.

## ⚠️ 일관성을 위해 반드시 지킬 것 (Curl 오브젝트 이미지용)

- Flow의 "Ingredients"에 이번엔 캐릭터 기준 사진이 아니라 **채널 배경색·스타일 참고용으로
  `assets/images/f09_obj_word.jpg` 또는 `f09_obj_world.jpg`**(이미 검증된 오브젝트 전용
  일러스트)를 넣어 같은 화풍(굵은 검은 선, 크림색 배경, 다이컷 스티커 테두리)을 맞출 것.
  캐릭터가 없으므로 얼굴/모자/수염 규칙은 이 이미지에 적용하지 않는다.

## Image 2 — Curl (헤어 고데기, 오브젝트만) — 재생성 필요

```
An illustrated hair-curling iron, held at a angle by nothing (no hand, no person visible),
with a single glossy curled lock of dark brown hair wrapped neatly around its barrel,
clearly showing the spiral curl shape. Drawn in the exact same flat-shaded semi-realistic
webtoon/sticker illustration style as the rest of this channel's assets: bold clean black
outlines, soft warm cream background (#F4EFE6), die-cut white sticker border around the
whole object. A few small decorative sparkle/star accents nearby, matching the channel's
existing character stickers. No person, no hand, no face anywhere in the image. No text or
letters anywhere in the image.
```

**🇰🇷 한글 요약**: 손이나 사람 없이 고데기와 거기에 말린 머리카락만 있는 오브젝트
일러스트. 채널의 기존 캐릭터 스티커와 같은 화풍(굵은 선, 크림 배경, 흰 테두리)으로.

### 🎬 영상 프롬프트 (테스트, 이 이미지를 첫 프레임으로 하는 image-to-video) — 선택 사항

**🇰🇷 한글 요약**: 캐릭터가 없는 오브젝트라 영상으로 만들 필요성이 낮다(정지 이미지로도
충분히 전달됨). 그래도 시험해보고 싶으면 아래 프롬프트 사용 — 고데기가 살짝 돌아가면서
머리카락이 조금 더 꼬이는 정도의 미세한 동작만 준다.

```
Subject: the curling iron and curled lock of hair, matching the first-frame reference image
exactly (same object, same style, same framing — no person, no hand appears at any point).
Action: the curling iron rotates very slightly in place, the lock of hair visibly curls a
little tighter around the barrel, then everything settles and holds still.
Style: flat-shaded semi-realistic webtoon/sticker illustration style, matching the reference
image exactly — not photorealistic, not 3D.
Camera positioning/motion: static camera, no movement.
Focus/lens: even focus across the frame.
Ambiance: soft warm cream background.
Audio: Silent — no dialogue, no sound effects, no music.
```

파라미터: `duration: "8"`, `aspect_ratio: "16:9"`.

## 완료 후

받은 이미지를 `assets/images/f10_obj_curl.jpg`로 저장해 주세요(기존
`f10_obj_curl.jpg`를 덮어써도 됨 — 어차피 사용 불가였던 파일). 영상을 시험했다면
`f10_obj_curl.mp4`로 저장.

저장 완료되면 알려주시면, Frame 10(`compositions/frames/10-quiz-pearl-curl.html`)의
도입부를 Pearl은 캐릭터 영상, Curl은 오브젝트 이미지로 다시 짜고 재검수하겠습니다(퀴즈
A/B 카드와 공식 카드 부분은 원래도 텍스트가 적절한 구간이라 그대로 유지).
