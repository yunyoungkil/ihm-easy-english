# EP29 썸네일 이미지 생성 프롬프트 (4종, 아바타 없음)

- 에피소드 ID: `ep29-b-vs-v`
- 작성일: 2026-11-06. 2026-10-28 아바타 중단 결정에 따라 전부 새로 썼습니다. 이전 프롬프트는 git 기록에 있습니다.
- 사용 방법: 코드 블록을 Gemini나 Google Flow에 그대로 붙여넣어 만듭니다. 마음에 드는 그림을 아래 표의 파일 이름으로 `output/upload-packages/ep29-b-vs-v/`에 덮어씁니다.
- 확인할 것: 네 모서리에 워터마크나 반짝이 아이콘이 없는지, 글자가 깨지지 않았는지 봅니다. 최종 확인은 대시보드의 LIVE MOBILE FEED PREVIEW로 합니다.

| 파일 | 제목 세트 | 칩 | 큰 글자 | 알약 문구 | 그림 | 이렇게 한 이유 |
|---|---|---|---|---|---|---|
| `thumbnail.jpg` | A | [반복 듣기] | BEST vs VEST | 윗니 0% vs 100% | 트로피 카드 + 조끼 카드 | EP28 메인과 달라 보이게 하면서 뜻 차이를 그림으로 보여 줍니다. |
| `thumbnail-variant-a.jpg` | B | [소리 연습] | B vs V | 다 'ㅂ'으로 읽으셨죠? | 커다란 ㅂ 카드에 빨간 X | 한글 ㅂ 하나로 읽어 온 습관을 바로 짚어 줍니다. |
| `thumbnail-variant-b.jpg` | C | [귀 뚫림] | B vs V | 터뜨리기 vs 밀어내기 | 입술 터짐 vs 윗니와 바람 | "물기"는 설명란의 "꽉 깨물면 안 된다"와 어긋나서 "밀어내기"로 바꿨습니다. |
| `thumbnail-close-up.jpg` | A의 모바일용 | [반복 듣기] | B vs V | 윗니 0% vs 100% | B vs V만 아주 크게 | 휴대폰 피드의 작은 크기에서도 읽히도록 그림까지 뺐습니다. |

---

## 1. thumbnail.jpg (A)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: B vs V, the upper teeth touching the lower lip or not. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "BEST vs VEST", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "윗니 0% vs 100%" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] On the right, two equal white rounded cards with heavy black borders, side by side. Left card: one simple flat icon of a gold trophy. Right card: one simple flat icon of a sleeveless vest. No words inside the cards.

[Layout] Text block on the left 55% of the frame, the two cards on the right 45%. Keep text and visual as separate areas with clear empty space between them.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: B vs V, the upper teeth touching the lower lip or not. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[소리 연습]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "B vs V", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "다 'ㅂ'으로 읽으셨죠?" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.
- Inside the visual only: "ㅂ".

[Visual] On the left, one large white rounded card with a heavy black border containing the single huge Korean letter "ㅂ" in bold black, with one thick red X over it.

[Layout] The card on the left 40% of the frame, the huge anchor and pill on the right 60%, so this layout mirrors the usual one. Keep text and visual as separate areas with clear empty space between them.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: B vs V, the upper teeth touching the lower lip or not. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[귀 뚫림]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "B vs V", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "터뜨리기 vs 밀어내기" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] Below the anchor, two equal white rounded cards with heavy black borders, side by side. Left card: a simple flat drawing of closed lips with short burst lines of air. Right card: a simple flat drawing of upper front teeth resting lightly on the lower lip with soft wind lines. Lips and teeth only, no face. No words inside the cards.

[Layout] Anchor at the top left, the two cards in the middle right, the gold pill at the lower left. Keep text and visual as separate areas with clear empty space between them.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: B vs V, the upper teeth touching the lower lip or not. Aspect ratio 16:9. Designed to stay readable at very small size in a phone feed, so use very few elements and very large letters.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "B vs V", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "윗니 0% vs 100%" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

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
