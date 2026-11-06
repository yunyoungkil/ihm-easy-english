# EP27 썸네일 이미지 생성 프롬프트 (4종, 아바타 없음)

- 에피소드 ID: `ep27-s-ending`
- 작성일: 2026-11-06. 2026-10-28 아바타 중단 결정에 따라 전부 새로 썼습니다. 이전 프롬프트는 git 기록에 있습니다.
- 사용 방법: 코드 블록을 Gemini나 Google Flow에 그대로 붙여넣어 만듭니다. 마음에 드는 그림을 아래 표의 파일 이름으로 `output/upload-packages/ep27-s-ending/`에 덮어씁니다.
- 확인할 것: 네 모서리에 워터마크나 반짝이 아이콘이 없는지, 글자가 깨지지 않았는지 봅니다. 최종 확인은 대시보드의 LIVE MOBILE FEED PREVIEW로 합니다.
- 급한 순서: `thumbnail.jpg`만 있으면 올릴 수 있습니다. 넣은 뒤 대시보드 대기 큐에서 "이 썸네일 승인"을 눌러야 합니다. 나머지는 스튜디오의 제목·썸네일 테스트에 씁니다.
- 메인은 2026-11-07에 `thumbnail-main-design-test.md`의 C안으로 바꿨습니다. 아래 1번 프롬프트는 쓰지 않습니다.

| 파일 | 제목 세트 | 칩 | 큰 글자 | 알약 문구 | 그림 | 이렇게 한 이유 |
|---|---|---|---|---|---|---|
| `thumbnail.jpg` | A | [반복 듣기] | -S · -ES | 3가지 소리였습니다 | [s] cats / [z] dogs / [ɪz] buses 3단 카드 | 소리 3가지라는 약속을 그대로 그림으로 보여 줍니다. |
| `thumbnail-variant-a.jpg` | B | [소리 연습] | DOGS | 다 '스'로 읽으셨죠? | 독스에 빨간 X, 도그즈에 초록 체크 | 시청자 대부분이 해 온 읽기를 짚어 줍니다. 정답 표기는 영상과 같은 도그즈입니다. |
| `thumbnail-variant-b.jpg` | C | [실수 주의] | HOUSE → HOUSES | 소리가 바뀝니다 | 집 1채 하우스 → 집 2채 하우지즈 | 근거 없는 통계 "80%가 즈 소리"를 실제 예로 대체합니다. |
| `thumbnail-close-up.jpg` | A의 모바일용 | [반복 듣기] | -S · -ES | 3가지 소리였습니다 | -S · -ES만 크게, 색 점 3개 | 휴대폰 피드의 작은 크기에서도 읽히도록 정보를 줄였습니다. |

---

## 1. thumbnail.jpg (A)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: the three sounds of word-ending -S and -ES. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "-S · -ES", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "3가지 소리였습니다" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.
- Inside the visual only: "[s] cats", "[z] dogs", "[ɪz] buses".

[Visual] On the right, three stacked white rounded cards with heavy black borders, each with a thick colored left edge. Top card: "[s] cats" with a coral red (#DC2626) edge. Middle card: "[z] dogs" with a sky blue (#2563EB) edge. Bottom card: "[ɪz] buses" with an emerald green (#059669) edge.

[Layout] Text block on the left 50% of the frame, the three cards on the right 50%, ending above the bottom-right safe zone. Keep text and visual as separate areas with clear empty space between them.

[Background] One seamless flat warm cream color (#F7F4EE) across the entire frame, evenly lit. No room, no desk, no texture.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: the three sounds of word-ending -S and -ES. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[소리 연습]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "DOGS", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "다 '스'로 읽으셨죠?" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.
- Inside the visual only: "독스", "도그즈".

[Visual] On the left, two stacked white rounded cards with heavy black borders. Upper card: "독스" in bold black letters with one thick red X beside it. Lower card: "도그즈" in bold black letters with one bold green check mark beside it.

[Layout] The two cards on the left 40% of the frame, the huge anchor and pill on the right 60%, so this layout mirrors the usual one. Keep text and visual as separate areas with clear empty space between them.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: the three sounds of word-ending -S and -ES. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[실수 주의]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "HOUSE → HOUSES", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "소리가 바뀝니다" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.
- Inside the visual only: "하우스", "하우지즈".

[Visual] Below the anchor, two white rounded cards with heavy black borders and a bold black arrow between them. Left card: one simple flat house icon above "하우스". Right card: two simple flat house icons above "하우지즈", with "지즈" colored emerald green (#059669).

[Layout] Anchor across the top of the frame, the two cards in the middle, the gold pill at the lower left. Keep text and visual as separate areas with clear empty space between them.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: the three sounds of word-ending -S and -ES. Aspect ratio 16:9. Designed to stay readable at very small size in a phone feed, so use very few elements and very large letters.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "-S · -ES", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "3가지 소리였습니다" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] Next to the anchor, three solid round dots in a vertical row: coral red (#DC2626), sky blue (#2563EB), and emerald green (#059669). No text on the dots.

[Layout] The anchor fills most of the frame width, the gold pill directly below it. Keep text and visual as separate areas with clear empty space between them.

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

- 2026-11-06: B 시안의 "독즈"를 영상에서 읽는 표기 "도그즈"로 맞췄습니다.
