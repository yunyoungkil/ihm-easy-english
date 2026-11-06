# EP27 메인 썸네일 디자인 방향 시험

- 목적: 프롬프트를 쓰기 전에 디자인 방향을 먼저 비교하면 결과가 나아지는지 EP27 메인으로 시험한다(`ui-ux-pro-max:banner-design` 절차, 2026-11-06).
- 미리보기: `output/temp-thumbnails/ep27-design-test/compare-sheet.png` (git에 올리지 않음). 왼쪽은 실제 EP24~26, 흰 테두리가 EP27 후보, 오른쪽 두 장은 휴대폰 크기와 흑백이다.
- 사용 방법: 고른 방향의 코드 블록을 Gemini나 Google Flow에 붙여넣는다. 마음에 드는 그림을 `output/upload-packages/ep27-s-ending/thumbnail.jpg`로 덮어쓰고, 대시보드 대기 큐에서 "이 썸네일 승인"을 누른다.
- 확인할 것: 네 모서리에 워터마크나 반짝이 아이콘이 없는지, 글자가 깨지지 않았는지 본다.

| 방향 | 큰 글자 | 알약 | 그림 | 배경 | 노리는 것 |
|---|---|---|---|---|---|
| A 갈라지는 S | -S | 3가지 소리였습니다 | 화살표 3개가 스·즈·이즈로 갈라짐 | 연한 복숭아색 | 한 글자가 세 소리로 나뉜다는 이야기가 바로 보인다 |
| B 세 칸 포스터 | BOOKS, DOGS, BUSES | 3가지 소리였습니다 | 칸마다 끝 글자만 색칠, 아래에 소리 | 세 가지 연한 색 | 실제 단어로 보여 준다 |
| C 큰 글자 (채택) | -S | 3가지 소리였습니다 | 스·즈·이즈 색 칸 3개 | 금색 | 휴대폰 크기에서 가장 눈에 띈다 |

## 기존 프롬프트와 다른 점

- `[s] cats`를 `스`, `즈`, `이즈`로 바꿨다. 발음기호는 휴대폰 크기에서 거의 안 읽히고, 시청자가 바로 읽을 수 있는 건 한글이다.
- `cats`는 한글로 "캣츠"라 "스"와 어긋난다. 단어가 필요한 B는 대본에 있는 `books`("북스")를 쓴다.
- 스킬은 그림에 글자를 넣지 말라고 하지만 따르지 않는다. EP24~26에서 Gemini가 글자를 정확히 그렸고, 채널 규칙도 프롬프트에 글자를 포함한다.

---

## A. 갈라지는 S

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: one word-ending -S splits into three different sounds. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text and the simple graphic described below.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "-S", the largest text in the frame, crisp flat white letters with a very heavy black outline, not inside any box.
- Gold pill: "3가지 소리였습니다" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.
- Inside the visual only: "스", "즈", "이즈".

[Visual] Three thick black arrows start together right beside the anchor and spread to the right like a fork: one curving up, one straight, one curving down. Each arrow points at its own rounded tile with a heavy black border and a hard black offset shadow. Top tile: solid coral red (#DC2626) with "스" in bold white. Middle tile: solid blue (#2563EB) with "즈" in bold white. Bottom tile: solid emerald green (#059669) with "이즈" in bold white.

[Layout] The anchor on the left, vertically centered. The arrows in the middle. The three tiles stacked on the right, ending above the bottom-right safe zone. The gold pill at the lower left under the anchor.

[Background] One seamless flat pale peach color (#FBE9DC) across the entire frame, evenly lit. No room, no desk, no texture.

[Font] Black Han Sans (검은고딕) style heavy gothic for all Hangul, the same weight as the Latin letters, not thinner or smaller.

[No redundancy] Do not repeat any text elsewhere. No channel name, no logo, no extra captions.

[Safe zone — bottom-right] Keep the bottom-right 15% of the width and height empty, background color only.

[DO NOT — UI chrome] Do not draw any YouTube or video-player interface, duration badge, or progress bar. This is a standalone graphic, not a screenshot.

[DO NOT — grid] Do not render any visible grid lines or alignment guides. The layout above is for internal planning only.

[Negative] No human, no face, no avatar, no character. No 3D text, no neon glow, no gradients, no complex background, no props beyond the items described. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

## B. 세 칸 포스터

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: the same ending -S makes three different sounds in three words. Aspect ratio 16:9.

[Subject] No people. The visual hero is the large text in three color panels.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Left panel: "BOOKS" in heavy black letters with only the last letter "S" in coral red (#C81E1E), and below it the huge Korean letter "스" in coral red.
- Middle panel: "DOGS" in heavy black letters with only the last letter "S" in blue (#1D4FD7), and below it the huge Korean letter "즈" in blue.
- Right panel: "BUSES" in heavy black letters with only the last two letters "ES" in green (#047857), and below it the huge Korean letters "이즈" in green.
- Gold pill: "3가지 소리였습니다" in bold black letters inside one solid #F5C518 rounded pill with a heavy black outline.

[Visual] Three equal vertical panels fill the whole frame, separated by two straight heavy black vertical lines. Each word fits fully inside its own panel on one line, with clear margin on both sides.

[Layout] Words in the upper middle of each panel, the Korean sound directly below each word. The gold pill at the lower left, across the line between the first and second panels, ending well before the bottom-right safe zone.

[Background] Left panel flat pale coral (#FDE3DE), middle panel flat pale blue (#DCE9FF), right panel flat pale mint (#D5F5E3). Evenly lit. No room, no desk, no texture.

[Font] Black Han Sans (검은고딕) style heavy gothic for all Hangul, the same weight as the Latin letters, not thinner or smaller.

[No redundancy] Do not repeat any text elsewhere. No channel name, no logo, no extra captions.

[Safe zone — bottom-right] Keep the bottom-right 15% of the width and height empty, panel color only.

[DO NOT — UI chrome] Do not draw any YouTube or video-player interface, duration badge, or progress bar. This is a standalone graphic, not a screenshot.

[DO NOT — grid] Apart from the two divider lines between the panels, do not render any visible grid lines or alignment guides. The layout above is for internal planning only.

[Negative] No human, no face, no avatar, no character. No 3D text, no neon glow, no gradients, no complex background, no props beyond the items described. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

## C. 큰 글자 (채택, 프롬프트는 쓰지 않음)

```text
A high-clarity YouTube thumbnail graphic for a Korean English-pronunciation channel, viewers are Korean adults aged 30 to 60. Flat neo-brutalist typographic poster. Topic: the word-ending -S has three sounds. Aspect ratio 16:9. Designed to stay readable at very small size in a phone feed, so use very few elements and very large letters.

[Subject] No people. The visual hero is one enormous text element.

[Text] Render EXACTLY these strings and nothing else, spelled correctly, with no garbled or malformed Hangul:
- Category pill, top-left: "[반복 듣기]" in bold white letters inside a small dark navy (#16213E) rounded pill.
- Anchor: "-S", enormous, the largest text in the frame by far, solid flat black letters with no outline, filling most of the height of the left half.
- White pill: "3가지 소리였습니다" in bold black letters inside one solid white rounded pill with a heavy black outline.
- Inside the visual only: "스", "즈", "이즈".

[Visual] On the right, three stacked equal rounded tiles with heavy black borders and a hard black offset shadow. Top tile: solid coral red (#DC2626) with "스" in bold white. Middle tile: solid blue (#2563EB) with "즈" in bold white. Bottom tile: solid emerald green (#059669) with "이즈" in bold white. The letters fill most of each tile's height.

[Layout] The anchor on the left, below the category pill. The white pill at the lower left under the anchor. The three tiles on the right, ending above the bottom-right safe zone. Keep text and visual as separate areas with clear empty space between them.

[Background] One seamless flat golden yellow color (#F5C518) across the entire frame, evenly lit. No room, no desk, no texture.

[Font] Black Han Sans (검은고딕) style heavy gothic for all Hangul, the same weight as the Latin letters, not thinner or smaller.

[No redundancy] Do not repeat any text elsewhere. No channel name, no logo, no extra captions.

[Safe zone — bottom-right] Keep the bottom-right 15% of the width and height empty, background color only.

[DO NOT — UI chrome] Do not draw any YouTube or video-player interface, duration badge, or progress bar. This is a standalone graphic, not a screenshot.

[DO NOT — grid] Do not render any visible grid lines or alignment guides. The layout above is for internal planning only.

[Negative] No human, no face, no avatar, no character. No 3D text, no neon glow, no gradients, no complex background, no props beyond the items described. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

## 시도 기록

- 2026-11-06: 미리보기 4장을 브라우저로 그려 비교했다. 그림을 Gemini로 뽑기 전 단계라 실제 결과는 아직 없다. 뽑은 뒤 `design:design-critique`와 `design:accessibility-review`로 점검한다.
- 2026-11-07: 글자와 색면뿐이라 Gemini와 미리보기가 다르지 않다고 사용자가 확인했다. C안 미리보기를 1920×1080으로 내보내 `thumbnail.jpg`로 넣었다. 점검에서 흰 알약 글자가 휴대폰 크기에서 약 7픽셀로 작아 56에서 70으로 키웠다. 글자 대비는 모두 AA 기준을 넘는다(가장 낮은 곳 이즈 3.77:1, 큰 글자 기준 3:1). 옛 파일은 git과 `output/temp-thumbnails/ep27-design-test/old-thumbnail-avatar.jpg`에 있다.
