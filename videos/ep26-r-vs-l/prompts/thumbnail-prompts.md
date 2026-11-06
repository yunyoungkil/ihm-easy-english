# EP26 썸네일 이미지 생성 프롬프트 (4종, 아바타 없음)

- 에피소드 ID: `ep26-r-vs-l`
- 작성일: 2026-11-06. 2026-10-28 아바타 중단 결정에 따라 전부 새로 썼습니다. 이전 프롬프트는 git 기록에 있습니다.
- 사용 방법: 코드 블록을 Gemini나 Google Flow에 그대로 붙여넣어 만듭니다. 마음에 드는 그림을 아래 표의 파일 이름으로 `output/upload-packages/ep26-r-vs-l/`에 덮어씁니다.
- 확인할 것: 네 모서리에 워터마크나 반짝이 아이콘이 없는지, 글자가 깨지지 않았는지 봅니다. 최종 확인은 대시보드의 LIVE MOBILE FEED PREVIEW로 합니다.
- 급한 순서: `thumbnail.jpg`만 있으면 올릴 수 있습니다. 넣은 뒤 대시보드 대기 큐에서 "이 썸네일 승인"을 눌러야 합니다. 나머지는 스튜디오의 제목·썸네일 테스트에 씁니다.

| 파일 | 제목 세트 | 칩 | 큰 글자 | 알약 문구 | 그림 | 이렇게 한 이유 |
|---|---|---|---|---|---|---|
| `thumbnail.jpg` | A | [반복 듣기] | RIGHT vs LIGHT | 혀끝 하나 차이 | 남색 배경, 큰 글자는 위에 한 줄, 아래에 오른쪽 화살표 카드 + 전구 카드 | 뜻 차이를 그림으로 먼저 보여 줍니다. 바로 앞 EP25 메인과 달라 보이게 어두운 배경을 썼습니다. |
| `thumbnail-b.jpg` | B | [실수 주의] | PRAY vs PLAY | 기도가 놀이 됩니다 | 기도하는 손 아이콘 + 게임기 아이콘 | 뜻이 뒤바뀌는 재미를 한눈에 보여 줍니다. |
| `thumbnail-c.jpg` | C | [소리 연습] | R vs L | 혀 굴리지 마세요 | R 0%, L 100% 숫자 카드 | "혀를 굴린다"는 상식을 숫자로 뒤집어 궁금증을 만듭니다. "혀 굴리면 망함"을 대체합니다. |
| `thumbnail-close-up.jpg` | A의 모바일용 | [반복 듣기] | RIGHT (윗줄) · LIGHT (아랫줄) | 혀끝 하나 차이 | 단어만 크게, 오른쪽에 화살표·전구 | 휴대폰 피드의 작은 크기에서도 단어가 읽히도록 정보를 줄였습니다. |

---

## 1. thumbnail.jpg (A)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: Right vs Light, the R and L sounds. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold dark navy (#16213E) letters inside a small white rounded pill.
- Anchor: "RIGHT vs LIGHT" on one single line, the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "혀끝 하나 차이" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] Below the anchor, two equal white rounded cards with heavy black borders, side by side. Left card: one bold simple flat arrow pointing right. Right card: one simple flat icon of a glowing yellow light bulb, drawn flat with no neon effect. No words inside the cards.

[Layout] The category pill at the top-left corner, the anchor across the full width right below it, the gold pill at the lower left, and the two cards in the lower middle to the right of the gold pill, stopping before the bottom-right safe zone. Keep text and visual as separate areas with clear empty space between them.

[Background] One seamless flat dark navy color (#16213E) across the entire frame, evenly lit. No room, no desk, no texture.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: Right vs Light, the R and L sounds. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[실수 주의]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "PRAY vs PLAY", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "기도가 놀이 됩니다" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] On the left, two stacked white rounded cards with heavy black borders. Upper card: one simple flat icon of praying hands, an icon only with no arms or person. Lower card: one simple flat icon of a game controller. No words inside the cards.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: Right vs Light, the R and L sounds. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[소리 연습]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "R vs L", the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "혀 굴리지 마세요" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.
- Inside the visual only: "0%", "100%".

[Visual] On the right, two equal white rounded cards with heavy black borders, stacked. Upper card: the number "0%" in huge black digits above one empty horizontal gauge bar. Lower card: the number "100%" in huge black digits above one completely filled #F5C518 horizontal gauge bar.

[Layout] Huge anchor and gold pill on the left 55% of the frame, the two number cards on the right 45%. Keep text and visual as separate areas with clear empty space between them.

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
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: Right vs Light, the R and L sounds. Aspect ratio 16:9. Designed to stay readable at very small size in a phone feed, so use very few elements and very large letters.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul or phonetic symbols:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor, on two lines: "RIGHT" on the first line and "LIGHT" on the second line, the largest text in the frame, crisp flat white letters with a heavy black outline, not inside any box.
- Gold pill: "혀끝 하나 차이" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] To the right of each word, one small simple flat icon: an arrow pointing right beside RIGHT and a light bulb beside LIGHT.

[Layout] The two words fill most of the frame height on the left, the gold pill directly below them. Keep text and visual as separate areas with clear empty space between them.

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

- 2026-11-06: 메인 구도와 배경을 EP25와 다르게 바꿨습니다(남색 배경, 큰 글자 한 줄).
- 2026-11-06: 메인과 모바일용 문구를 "혀끝 하나 차이"로 바꿨습니다. 바로 앞 EP25 메인 "입술 모으면 끝"과 문장 틀이 겹쳤습니다.
