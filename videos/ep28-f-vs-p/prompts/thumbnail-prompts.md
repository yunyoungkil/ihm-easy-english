# EP28 썸네일 이미지 생성 프롬프트 (4종, 아바타 없음)

- 에피소드 ID: `ep28-f-vs-p`
- 작성일: 2026-11-06. 2026-10-28 아바타 중단 결정에 따라 전부 새로 썼습니다. 이전 프롬프트는 git 기록에 있습니다.
- 사용 방법: 코드 블록을 Gemini나 Google Flow에 그대로 붙여넣어 만듭니다. 마음에 드는 그림을 아래 표의 파일 이름으로 `output/upload-packages/ep28-f-vs-p/`에 덮어씁니다.
- 확인할 것: 네 모서리에 워터마크나 반짝이 아이콘이 없는지, 글자가 깨지지 않았는지 봅니다. 최종 확인은 대시보드의 LIVE MOBILE FEED PREVIEW로 합니다.
- 급한 순서: `thumbnail.jpg`만 있으면 올릴 수 있습니다. 넣은 뒤 대시보드 대기 큐에서 "이 썸네일 승인"을 눌러야 합니다. 나머지는 스튜디오의 제목·썸네일 테스트에 씁니다.

| 파일 | 제목 세트 | 칩 | 큰 글자 | 알약 문구 | 그림 | 이렇게 한 이유 |
|---|---|---|---|---|---|---|
| `thumbnail.jpg` | A | [반복 듣기] | F vs P | 윗니 100% vs 0% | 큰 카드 2장: F와 윗니가 입술에 닿은 그림, P와 닫은 입술 그림 | 윗니가 닿는지 안 닿는지 그림으로 바로 보입니다. 앞에 오는 F가 100%입니다. EP27과 달라 보이게 글자를 카드 안에 넣었습니다. |
| `thumbnail-variant-a.jpg` | B | [소리 연습] | F 발음 | 꽉 물면 틀립니다 | 입술 꽉 문 그림에 빨간 X, 살짝 댄 그림에 초록 체크 | "입술 물어라"는 상식을 고쳐 줍니다. 기존 "입술 물면 틀립니다"보다 정확합니다. |
| `thumbnail-variant-b.jpg` | C | [실수 주의] | COFFEE vs COPY | 입술끼리 닿으면 탈락 | 커피잔 카드 + 복사 용지 카드 | 누구나 아는 물건 두 개로 뜻 차이를 보여 줍니다. "두 입술 닿으면 탈락"은 5단어를 넘어서 줄였습니다. |
| `thumbnail-close-up.jpg` | A의 모바일용 | [반복 듣기] | F vs P | 윗니 100% vs 0% | F vs P만 아주 크게 | 휴대폰 피드의 작은 크기에서도 읽히도록 그림까지 뺐습니다. |

---

## 1. thumbnail.jpg (A)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: F vs P, the upper teeth touching the lower lip or not. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: the letter "F" inside the left card and the letter "P" inside the right card, the largest text in the frame, in crisp flat black letters.
- Divider badge: "vs" in bold white letters inside one small black circle, between the two cards.
- Gold pill: "윗니 100% vs 0%" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] Two large equal white rounded cards with heavy black borders, side by side. Left card: the huge letter F on top and, below it, a simple flat drawing of upper front teeth resting lightly on the lower lip with soft wind lines. Right card: the huge letter P on top and, below it, a simple flat drawing of closed lips with short burst lines of air. Lips and teeth only, no face. No other words inside the cards.

[Layout] The category pill at the top-left corner. The two cards fill the middle of the frame, from just below the category pill to about 75% of the frame height, and stop at about 85% of the frame width. The gold pill sits below the cards at the lower left. Keep the bottom-right corner clear.

[Background] One seamless flat pale blue-grey color (#E3EBF1) across the entire frame, evenly lit. No room, no desk, no texture.

[Font] Black Han Sans (검은고딕) style heavy gothic for all Hangul, the same weight as the Latin letters, not thinner or smaller.

[No redundancy] Do not repeat any text elsewhere. No channel name, no logo, no extra captions.

[Safe zone — bottom-right] Keep the bottom-right 15% of the width and height empty, background color only.

[DO NOT — UI chrome] Do not draw any YouTube or video-player interface, duration badge, or progress bar. This is a standalone graphic, not a screenshot.

[DO NOT — grid] Do not render any visible grid lines or alignment guides. The layout above is for internal planning only.

[Negative] No human, no face, no avatar, no character. No 3D text, no neon glow, no gradients, no complex background, no props beyond the items described. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

## 2. thumbnail-variant-a.jpg (B)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: F vs P, the upper teeth touching the lower lip or not. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[소리 연습]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "F 발음", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "꽉 물면 틀립니다" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] On the left, two stacked white rounded cards with heavy black borders. Upper card: a simple flat drawing of upper teeth biting hard into the lower lip, with one thick red X. Lower card: a simple flat drawing of upper teeth touching the lower lip lightly, with one bold green check mark. Lips and teeth only, no face. No words inside the cards.

[Layout] The two cards on the left 45% of the frame, the text block on the right 55%, so this layout mirrors the usual one. Keep text and visual as separate areas with clear empty space between them.

[Background] One seamless flat warm sand color (#F3E3C3) across the entire frame, evenly lit. No room, no desk, no texture.

[Font] Black Han Sans (검은고딕) style heavy gothic for all Hangul, the same weight as the Latin letters, not thinner or smaller.

[No redundancy] Do not repeat any text elsewhere. No channel name, no logo, no extra captions.

[Safe zone — bottom-right] Keep the bottom-right 15% of the width and height empty, background color only.

[DO NOT — UI chrome] Do not draw any YouTube or video-player interface, duration badge, or progress bar. This is a standalone graphic, not a screenshot.

[DO NOT — grid] Do not render any visible grid lines or alignment guides. The layout above is for internal planning only.

[Negative] No human, no face, no avatar, no character. No 3D text, no neon glow, no gradients, no complex background, no props beyond the items described. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

## 3. thumbnail-variant-b.jpg (C)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: F vs P, the upper teeth touching the lower lip or not. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[실수 주의]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "COFFEE vs COPY", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "입술끼리 닿으면 탈락" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] Below the anchor, two equal white rounded cards with heavy black borders, side by side. Left card: one simple flat icon of a coffee cup. Right card: one simple flat icon of a stack of white paper sheets. No words inside the cards.

[Layout] Anchor across the top of the frame, the two cards in the middle right, the gold pill at the lower left. Keep text and visual as separate areas with clear empty space between them.

[Background] One seamless flat pale cream color (#F4EFE6) across the entire frame, evenly lit. No room, no desk, no texture.

[Font] Black Han Sans (검은고딕) style heavy gothic for all Hangul, the same weight as the Latin letters, not thinner or smaller.

[No redundancy] Do not repeat any text elsewhere. No channel name, no logo, no extra captions.

[Safe zone — bottom-right] Keep the bottom-right 15% of the width and height empty, background color only.

[DO NOT — UI chrome] Do not draw any YouTube or video-player interface, duration badge, or progress bar. This is a standalone graphic, not a screenshot.

[DO NOT — grid] Do not render any visible grid lines or alignment guides. The layout above is for internal planning only.

[Negative] No human, no face, no avatar, no character. No 3D text, no neon glow, no gradients, no complex background, no props beyond the items described. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

## 4. thumbnail-close-up.jpg (A의 모바일용)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: F vs P, the upper teeth touching the lower lip or not. Aspect ratio 16:9. Designed to stay readable at very small size in a phone feed, so use very few elements and very large letters.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "F vs P", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "윗니 100% vs 0%" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] No icons and no cards. The huge letters are the whole picture.

[Layout] The anchor fills the upper two thirds of the frame, the gold pill directly below it. Keep text and visual as separate areas with clear empty space between them.

[Background] One seamless flat warm cream color (#F7F4EE) across the entire frame, evenly lit. No room, no desk, no texture.

[Font] Black Han Sans (검은고딕) style heavy gothic for all Hangul, the same weight as the Latin letters, not thinner or smaller.

[No redundancy] Do not repeat any text elsewhere. No channel name, no logo, no extra captions.

[Safe zone — bottom-right] Keep the bottom-right 15% of the width and height empty, background color only.

[DO NOT — UI chrome] Do not draw any YouTube or video-player interface, duration badge, or progress bar. This is a standalone graphic, not a screenshot.

[DO NOT — grid] Do not render any visible grid lines or alignment guides. The layout above is for internal planning only.

[Negative] No human, no face, no avatar, no character. No 3D text, no neon glow, no gradients, no complex background, no props beyond the items described. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

## 수정 기록

- 2026-11-06: 메인과 모바일용 문구 순서를 "윗니 100% vs 0%"로 고쳤습니다. 영상에서 F가 100%, P가 0%인데 "F vs P" 옆에 0%가 먼저 적혀 반대로 읽혔습니다. 왼쪽 그림도 F로 맞췄습니다.
- 2026-11-06: C 시안 문구를 5단어에 맞춰 줄였습니다. 메인 구도를 글자가 카드 안에 들어가는 형태로 바꿨습니다.
