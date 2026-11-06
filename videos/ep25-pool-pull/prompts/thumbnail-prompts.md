# EP25 썸네일 이미지 생성 프롬프트 (4종, 아바타 없음)

- 에피소드 ID: `ep25-pool-pull`
- 작성일: 2026-11-06. 2026-10-28 아바타 중단 결정에 따라 전부 새로 썼습니다. 이전 프롬프트는 git 기록에 있습니다.
- 사용 방법: 코드 블록을 Gemini나 Google Flow에 그대로 붙여넣어 만듭니다. 마음에 드는 그림을 아래 표의 파일 이름으로 `output/upload-packages/ep25-pool-pull/`에 덮어씁니다.
- 확인할 것: 네 모서리에 워터마크나 반짝이 아이콘이 없는지, 글자가 깨지지 않았는지 봅니다. 최종 확인은 대시보드의 LIVE MOBILE FEED PREVIEW로 합니다.

| 파일 | 제목 세트 | 칩 | 큰 글자 | 알약 문구 | 그림 | 이렇게 한 이유 |
|---|---|---|---|---|---|---|
| `thumbnail.jpg` | A | [반복 듣기] | POOL vs PULL | 입술 모으면 끝 | 수영장 아이콘 카드 + 문 당기는 아이콘 카드 | 뜻이 다른 두 장면을 그림으로 먼저 보여 줍니다. |
| `thumbnail-b.jpg` | B | [실수 주의] | FOOL vs FULL | 뜻이 완전히 달라요 | I'M FOOL에 빨간 X, I'M FULL에 초록 체크 | 실수하면 뜻이 어떻게 바뀌는지 보여 줍니다. 근거 없는 "바보 소리 듣습니다"를 대체합니다. |
| `thumbnail-c.jpg` | C | [소리 연습] | [uː] vs [ʊ] | 입에 힘 빼면 끝 | 촛불 끄듯 모은 입술 vs 힘 뺀 입술 | 영상의 비유(촛불)를 그대로 그림으로 씁니다. 금지 표현 "턱에 힘 빼면 끝"을 대체합니다. |
| `thumbnail-close-up.jpg` | A의 모바일용 | [반복 듣기] | POOL (윗줄) · PULL (아랫줄) | 입술 모으면 끝 | 단어만 크게, 오른쪽에 작은 아이콘 | 휴대폰 피드의 작은 크기에서도 단어가 읽히도록 정보를 줄였습니다. |

---

## 1. thumbnail.jpg (A)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: Pool vs Pull, the long [uː] and short [ʊ] vowels. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "POOL vs PULL", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "입술 모으면 끝" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] On the right, two equal white rounded cards with heavy black borders, side by side. Left card: one simple flat icon of a blue swimming pool with a ladder. Right card: one simple flat icon of a door handle with a curved arrow showing a pulling motion. No words inside the cards.

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

## 2. thumbnail-b.jpg (B)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: Pool vs Pull, the long [uː] and short [ʊ] vowels. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[실수 주의]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "FOOL vs FULL", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "뜻이 완전히 달라요" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.
- Inside the visual only: "I'M FOOL", "I'M FULL".

[Visual] On the left, two stacked white rounded cards with heavy black borders. Upper card: "I'M FOOL" in bold black letters with one thick red X beside it. Lower card: "I'M FULL" in bold black letters with one bold green check mark beside it.

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

## 3. thumbnail-c.jpg (C)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: Pool vs Pull, the long [uː] and short [ʊ] vowels. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[소리 연습]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "[uː] vs [ʊ]", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "입에 힘 빼면 끝" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] Below the anchor, two large simple flat line drawings of lips only, no face. Left: tightly rounded pursed lips blowing toward one small flat candle flame. Right: relaxed, slightly open lips with no tension. No words next to them.

[Layout] Anchor centered at the top across the frame, the two lip drawings in the middle, the gold pill at the lower left. Keep text and visual as separate areas with clear empty space between them.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: Pool vs Pull, the long [uː] and short [ʊ] vowels. Aspect ratio 16:9. Designed to stay readable at very small size in a phone feed, so use very few elements and very large letters.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor, on two lines: "POOL" on the first line and "PULL" on the second line, the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "입술 모으면 끝" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] To the right of each word, one small simple flat icon: a swimming pool beside POOL and a door handle with a curved arrow beside PULL.

[Layout] The two words fill most of the frame height on the left, the gold pill directly below them. Keep text and visual as separate areas with clear empty space between them.

[Background] One seamless flat warm cream color (#F7F4EE) across the entire frame, evenly lit. No room, no desk, no texture.

[Font] Black Han Sans (검은고딕) style heavy gothic for all Hangul, the same weight as the Latin letters, not thinner or smaller.

[No redundancy] Do not repeat any text elsewhere. No channel name, no logo, no extra captions.

[Safe zone — bottom-right] Keep the bottom-right 15% of the width and height empty, background color only.

[DO NOT — UI chrome] Do not draw any YouTube or video-player interface, duration badge, or progress bar. This is a standalone graphic, not a screenshot.

[DO NOT — grid] Do not render any visible grid lines or alignment guides. The layout above is for internal planning only.

[Negative] No human, no face, no avatar, no character. No 3D text, no neon glow, no gradients, no complex background, no props beyond the items described. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```
