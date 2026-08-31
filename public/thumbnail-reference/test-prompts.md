# 썸네일 테스트 프롬프트 3종 (경쟁사 구조 차용, 채널 브랜드 적용)

소재: WANT vs WON'T (기존 `generateAiThumbnailImage` Variant C에 이미 있는 실제 후보 소재)
공통 색: 노랑 #F5C518 / 파랑 #5B9BD5 / 빨강 #E84545 / 배경 다크 네이비 #0A1526~#12203A

---

## 1. 그리드 모자이크형 — "Learn English With Fun" 구조 차용 (VPH 48~81x, 이 폴더 최고 성과)

일상 속 여러 상황에서 WANT/WON'T가 반복 등장한다는 "밀도"로 어필. 단일 대조가 아니라 다발로 보여줌.

```
A 16:9 YouTube thumbnail for a Korean English-pronunciation channel, divided into a clean
2x3 grid of six small scenes on a dark navy background (#0A1526 to #12203A radial gradient),
thin blue (#5B9BD5) hairline dividers between grid cells, each cell showing a tiny flat-vector
illustrated everyday moment (ordering coffee, asking directions, texting a friend, answering
a phone call, at a restaurant, saying goodbye) rendered in a minimal cyber-navy palette with
one bright yellow (#F5C518) accent object per scene, each cell has a short bold Korean caption
in white with ONE keyword in yellow: "커피 주문할 때도", "길 물을 때도", "전화할 때도",
"헤어질 때도", "부탁할 때도", "이럴 때도" — all six cells share the same visual rhythm so
they read as a set, top strip across the whole frame in large bold white Korean headline text
with red (#E84545) emphasis on the key phrase: "WANT랑 WON'T, 이 6곳에서 다 틀립니다",
bottom-right small brand corner mark, clean high-contrast flat illustration + subtle glow,
no photographic faces, no gradients besides the background, 4k ultra-sharp
--ar 16:9 --no watermark phone-mockup device-frame stock-photo-text UI-buttons --v 6.0
```

**왜 이 구조**: 정보량 자체가 후킹이 되는 패턴. "이만큼 자주 나온다"는 게 클릭 이유. 다만 채널 원칙(정답 숨기기)상 6칸 캡션에 실제 정답 문장을 다 보여주면 안 되므로, 캡션은 "상황"만 나열하고 정답(WANT/WON'T 각각 언제 쓰는지)은 숨겼습니다.

---

## 2. 말풍선 대조형 — Allicia/learn english online 구조 차용 (색깔 키워드 하이라이트)

일러스트 두 사람 + 말풍선. 경쟁사는 파스텔인데 채널 다크 네이비로 옮김.

```
A 16:9 YouTube thumbnail, two flat-illustrated Korean adults facing each other on a dark navy
background (#0A1526), speech bubble on the left in white with black outline containing the text
"저기요, 저 WANT 있는데요" with the word "WANT" highlighted in bright red (#E84545) and
struck through with a red X, speech bubble on the right in white with a glowing yellow
(#F5C518) outline containing "그건 WON'T이에요" with "WON'T" highlighted in bold yellow,
subtle cyan rim-light on both characters, minimal background detail so the bubbles read
instantly at small size, large bold white Korean headline arcing above both characters:
"저도 모르게 반대로 말하고 있었다면?", small blue (#5B9BD5) rule-name badge top-left corner,
clean vector illustration with soft cel-shading, no text besides the two speech bubbles and
headline, 4k
--ar 16:9 --no watermark phone-mockup device-frame stock-photo-text UI-buttons --v 6.0
```

**왜 이 구조**: 색깔로 정답/오답을 구분하는 신호가 즉각적. 정답(WON'T이 언제 맞는지의 "원리")은 텍스트에서 여전히 숨겨져 있고 "반대로 말하고 있었다"는 문제 제기만 보여줌 — 궁금증 유지.

---

## 3. 볼드 컬러블록 + 실사 리액션형 — 지름길영어 구조 차용 (지금 채널과 가장 가까움)

단색 배경 + 실사 얼굴 클로즈업 + 초대형 헤드라인. EP9/EP10에서 이미 쓴 "큰 얼굴 클로즈업"과 궤가 같아서 이식 부담이 제일 적음.

```
A 16:9 YouTube thumbnail, left 65% is a solid deep navy blue color block (#12203A) containing
massive bold white Korean headline text stacked in two lines: "WANT랑 WON'T" / "매번 헷갈리셨죠?"
with the word "헷갈리셨죠" underlined in bright yellow (#F5C518), right 35% shows a
photorealistic close-up of a young Korean adult's face with a genuinely surprised open-mouth
"oh!" expression, warm studio key light, shot from chest up, positioned so the face sits
exactly on the right edge for mobile-feed cropping safety, thin red (#E84545) accent line
separating the two zones, bottom-right corner completely empty (reserved for YouTube's own
duration timestamp), no fake UI elements, no watermark, cinematic but clean, 4k photographic
quality on the face / flat vector on the text zone
--ar 16:9 --no watermark phone-mockup device-frame stock-photo-text UI-buttons fake-timestamp --v 6.0
```

**왜 이 구조**: 이미 검증된 채널 자산(실사 얼굴+단색 블록)을 그대로 쓰면서 헤드라인 구성만 경쟁사 문법(초대형 2줄+키워드 밑줄)으로 다듬은 버전. 리스크가 제일 낮은 실험.

---

## 참고

- 세 프롬프트 다 `thumbnail-strategy.md` 체크리스트 준수: 정답 숨김, 제목=훅/이미지=훅(카피 별도 미정), 우측 하단 15% 비움(유튜브 재생시간·워터마크 자리).
- 실제 생성은 A/B 시뮬레이터의 "🎨 이미지도 생성" 또는 `generateAiThumbnailImage` 직접 호출로 테스트 가능. 유료 Gemini 호출 1회당 소량 비용 발생.
