# Frame 11 배경 이미지 프롬프트 — 마트 진열대 (실생활 재확인, JAM)

Frame 11(실생활 재확인, 페이오프)의 배경. "마트에서 'JAM'이라는 글자를 보셨다고 해볼까요"
지점에서 화면 가득 깔리는 배경이며, 그 위에 `sound-blend-diagram`이 "JAM" 조립 애니메이션을
오버레이로 그린다 — **배경 자체에 진짜 잼 라벨 텍스트가 있을 필요는 없다.** 오히려 실제 상품
텍스트가 있으면 오버레이 텍스트와 겹쳐 읽기 방해가 되므로, 라벨이 흐릿하거나 안 보이는 각도로
받는다.

프롬프트 구조는 `knowledge/google-ai-studio-prompting.md` §2(Imagen/Gemini 이미지 프롬프트
구조)를 따름.

## 🇰🇷 한글 요약 — 이 사진이 뭘 담아야 하는지

- **뭘 찍나**: 마트 잼 진열대. 잼 병들이 쭉 늘어선 선반. **사람은 안 나옴** — 이 채널은 원래
  얼굴(사람)을 화면에 안 보여주는 방식이라 일부러 뺐음(입모양 B롤도 눈·이마는 안 나오게 찍음).
- **각도가 제일 중요함**: 통로를 비스듬히 따라 들어가며 찍는 각도 ❌ → **선반을 정면으로 딱
  마주 보고 찍은 각도** ⭕ (카메라를 성인 눈높이에 두고 선반을 똑바로 마주 보는 것 — **사람이
  실제로 사진에 나오라는 뜻이 아니라 카메라 위치만 설명한 것**임에 주의)
- **흐림 정도**: 그냥 살짝 흐린 게 아니라, **가격표 글씨나 상품 이름이 하나도 안 읽히게 아주
  많이 흐리게**. 마치 카메라 초점이 선반이 아니라 선반 앞 다른 곳에 맞춰진 것처럼.
- **이유**: 이 사진 위에 나중에 "JAM"이라는 큰 글자 애니메이션을 화면에 겹쳐 올릴 건데, 배경에
  다른 글씨가 또렷하게 보이면 눈이 헷갈림. 그래서 배경은 색깔과 분위기만 남기고 글씨는 다
  뭉개져야 함.
- **1차 시도에서 뭐가 문제였나**: 각도가 비스듬한 통로 각도로 나왔고, 가격표 글씨가 또렷하게
  읽혔음. 아래 프롬프트는 이 두 가지를 더 세게(구체적으로) 명시해서 고친 버전.

## 프롬프트 (영문 — 이대로 붙여넣기)

Google AI Studio(Gemini 네이티브 이미지) 또는 Nano Banana 계열 도구에 아래 텍스트를 그대로
붙여넣으면 된다.

```
A photorealistic straight-on frontal shot of a Korean supermarket grocery shelf stocked with
jars and bottles of jam and preserves, with NO people anywhere in the frame — an empty aisle,
shelf only. The camera is positioned at a standing adult's eye level, facing the shelf directly
and perpendicular to the shelf face. Do NOT shoot down the length of the aisle at an angle; the
shelf should run horizontally across the frame, facing the camera, not receding away into the
distance.

Extremely shallow depth of field, as if shot with a fast lens at a wide aperture (f/1.4-f/2):
the entire shelf and every jar on it is heavily out of focus — soft, smeared blobs of color and
light, not sharp objects. No price tag, no product label, no text of any kind, and no logo
should be legible anywhere in the frame — they should all dissolve into soft, unreadable colored
blur. This is meant to read purely as an out-of-focus background wash of warm jam-jar colors
(ambers, reds, golds) behind a subject that is NOT in this shot, not as a real, readable product
photo.

Warm but slightly dim indoor supermarket fluorescent lighting, calm and ordinary — not staged
or glamorous. Muted, slightly desaturated color palette leaning toward cool blues in the
shadows and warm ambers in the jam colors, so it can sit behind on-screen text without clashing.
No visible people, no watermark. 16:9 aspect ratio, landscape.
```

## 저장 위치

완성된 이미지를 여기 저장해줘:
- `videos/ep13-tongue-shortcut/assets/images/market-shelf.jpg`(또는 `.png`)

넣어주면 Frame 11 컴포지션의 `f11-shelf-box` placeholder 자리에 배경으로 배치하겠다. 현재
컴포지션은 다크 네이비(`#0A1526`) 그라운드 위 점선 박스 placeholder 상태다 — 이미지가 들어오면
CSS로 어둡게 살짝 오버레이를 얹어서 채널의 네이비 톤과 자연스럽게 맞출 예정.

## 시도 기록 (문제 → 수정 이력)

### 1차 시도 (2026-09-05)

사용자가 최초 버전 프롬프트로 1차 생성 → 검토 결과 두 가지 어긋남 확인:
1. 각도가 통로를 비스듬히 보는 구도로 나옴(정면 요청이었으나 "slightly low, straight-on
   angle as if a shopper is standing in front"라는 표현이 약해서 모델이 다르게 해석함).
2. 가격표·라벨 글씨가 또렷하게 읽힘("softly out of focus"만으로는 부족했음).

→ 위 두 가지를 "camera faces the shelf directly, perpendicular... Do NOT shoot down the
length of the aisle" / "Extremely shallow depth of field... heavily out of focus... no text of
any kind... should be legible"처럼 더 강하고 구체적인 문장으로 못 박아 2차 프롬프트로 재작성.
`knowledge/google-ai-studio-prompting.md` §1의 교훈("모호하면 모델이 순한 기본값으로 해석한다
— 형용사·부사로 구체적으로 묘사할 것")을 이미지 프롬프트에도 그대로 적용함.

### 2차 프롬프트 작성 중 발견한 문제 (2026-09-05)

1차 수정본에 남아 있던 "as if a shopper is standing in front of it"(마치 손님이 서서 보는
것처럼)이라는 표현이 문제였다 — 이건 **카메라 위치(눈높이)만 설명하려던 의도**였는데, 사람이
실제로 화면에 나와야 하는 것처럼 읽힐 수 있는 문장이었다. 프롬프트 뒤쪽에 "No visible
people"이 이미 있어서 실제 생성 결과엔 사람이 안 나왔지만(정상 동작), 사용자가 문서를 읽다가
"사람이 서서 보는 느낌"이라는 말과 "사람은 안 나옴"이 서로 모순돼 보인다고 지적함.

→ 영문 프롬프트에서 "as if a shopper is standing in front of it" 문구를 완전히 빼고 "with NO
people anywhere in the frame — an empty aisle, shelf only. The camera is positioned at a
standing adult's eye level"로 교체(사람을 그리라는 신호를 아예 없앰). 위 🇰🇷 한글 요약의
"사람이 선반 바로 앞에 서서 정면을 보는 느낌"이라는 같은 표현도 "카메라를 성인 눈높이에 두고
선반을 똑바로 마주 보는 것 — 사람이 실제로 사진에 나오라는 뜻이 아니라 카메라 위치만 설명한
것"으로 함께 고쳤다. **교훈**: 영문 프롬프트 문구를 고칠 때 같은 개념을 설명하는 한글 요약·
변경 기록도 같이 확인해서, 문서 안에 서로 다른 버전의 설명이 남지 않게 할 것.
