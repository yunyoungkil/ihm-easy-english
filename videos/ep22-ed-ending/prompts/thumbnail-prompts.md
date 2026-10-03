# EP22 (-ED 과거형 끝소리) 썸네일 프롬프트

> 채택된 A안(`BRIEF.md` "확정된 제목·썸네일" 참고) 기준으로 작성.
> **스타일 기준은 `scripts/ab-simulator.mjs`의 `buildThumbnailPrompt()` 현재 버전
> (2026-09-29 전면 재작성분)** — 무지 크림 배경 + 앵커 단어(흰 글자+검은 테두리) +
> 골드 알약 문구 + 실사 인물 반응, 이 4요소만. 지어낸 장면/소품/화살표 인물 태그/
> 채널명 배지는 전부 금지(이전 EP21 `prompts/thumbnail-prompts.md`는 이 규칙 이전에
> 쓰여서 네온/배경 세트/화살표 태그가 들어있는 구버전 스타일이니 참고하지 말 것).
> **기본 이미지 모델**: Google Gemini(`gemini-3.1-flash-image` 계열), 레퍼런스는
> `public/brand/thumbnail-presenter-reference.jpg`.

유튜브 Test & Compare는 제목·썸네일을 3개까지 올려 실제 A/B 테스트를 할 수 있어서,
A(채택)뿐 아니라 B/C도 실제 업로드용으로 전부 프롬프트를 만든다(EP17~21과 동일 관례).
세 시안은 감정 훅을 다르게 잡아 인물 표정·구도를 차별화한다: A=당황/들킨 느낌,
B=충격/멘붕, C=호기심/비밀 전수.

| 시안 | 제목 | 앵커 | 알약 문구 | 감정 훅 |
|---|---|---|---|---|
| **A (채택)** | Wanted, Walked, Played — 끝소리 세 개가 다 다릅니다, 영어 과거형 -ED 발음 규칙 | `-ED` | `다 '드'로 읽으셨죠?` | 당황/들킨 느낌 |
| B | 원어민은 -ED를 절대 '드'로 안 읽습니다, 당신만 몰랐던 진짜 발음 규칙 | `-ED` | `저만 몰랐다고요?` | 충격/멘붕 |
| C | 영어 선생님도 안 알려준 과거형 끝소리 비밀 | `-ED` | `3가지 소리였습니다` | 호기심/비밀 전수 |

---

## 시안 A (채택 — 메인 썸네일, thumbnail-a.jpg)

```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "Wanted, Walked, Played — 끝소리 세 개가 다 다릅니다, 영어 과거형 -ED 발음 규칙". This must match the channel's established, CTR-tested house style exactly — do not invent a different look.

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Anchor line — a very short standalone anchor for this topic's specific pattern: "-ED". Render it massive, on its own line, standalone.
- Pill phrase — a short reaction/hook phrase, rendered as the ENTIRE content of a single solid-colored rounded pill/capsule shape directly below the anchor line: "다 '드'로 읽으셨죠?"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string, and no hero identity tags or arrow callouts of any kind.

=== BACKGROUND (fixed — do not invent a scene, do not add props) ===
Use a plain, evenly and softly lit single warm cream/beige backdrop (like a clean seamless photo-studio background) across the ENTIRE frame — this is the channel's actual established look. Do NOT invent a scene, a prop, a classroom object, a phone mockup, a chalkboard, or any set dressing — the only things in the frame are the plain backdrop, the two text elements above, and the hero.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown. Photographed naturally against the plain backdrop (no cutout sticker border, no vignette) — a genuine, puzzled-but-amused "뭔가 들켰다" expression (eyebrows raised, slight smirk, one hand half-raised as if caught mid-habit), eyes and gaze directed toward the text rather than straight at the camera.

Composition: 16:9 horizontal frame. The hero sits to one side (left or right, whichever fits better) at a medium-to-close, waist-up-or-tighter distance. The anchor line and pill phrase stack vertically on the open side, each sized to fill the available width. Treat the hero photo and the text block as separate, non-intersecting regions with a visible gap of empty background between them — never let the hero's head, hair, or shoulders cross in front of or behind any letter.

Typography: clean, bold, heavy sans-serif font throughout for maximum legibility, sharp stylized infographic-quality text, heavy black outline. The anchor line is FLAT plain white lettering with the black outline ONLY — nothing else added. The pill phrase is rendered entirely inside one solid warm-yellow (#F5C518) rounded capsule/pill shape, black or dark navy bold lettering on the yellow pill, with a black outline around the pill itself.

NEGATIVE: do NOT put the anchor line inside a box, panel, or chip of any color. Do NOT add a glow, neon light, drop shadow, backlight, or halo around the letters. Do NOT add circuit-board lines, tech/HUD patterns, sparkles, or any decorative background motif. Do NOT render the letters with a 3D, embossed, chrome, or metallic look, or a gradient fill. The anchor line must look exactly as flat and plain as text printed directly on paper.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter — do not invent, substitute, or garble any character.

Style: ultra-realistic, sharp focus, high detail — the human subject must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.
```

---

## 시안 A 모바일 클로즈업 (thumbnail-close-up.jpg)

```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "Wanted, Walked, Played — 끝소리 세 개가 다 다릅니다, 영어 과거형 -ED 발음 규칙". This must match the channel's established, CTR-tested house style exactly — do not invent a different look.

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Anchor line — a very short standalone anchor for this topic's specific pattern: "-ED". Render it massive, on its own line, standalone.
- Pill phrase — a short reaction/hook phrase, rendered as the ENTIRE content of a single solid-colored rounded pill/capsule shape directly below the anchor line: "다 '드'로 읽으셨죠?"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string, and no hero identity tags or arrow callouts of any kind.

=== BACKGROUND (fixed — do not invent a scene, do not add props) ===
Use a plain, evenly and softly lit single warm cream/beige backdrop across the ENTIRE frame. Do NOT invent a scene, a prop, or any set dressing.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features. Dress them in the EXACT SAME outfit shown in the reference image. A genuine, puzzled-but-amused "뭔가 들켰다" expression, exaggerated and instantly readable even when shrunk to ~100px wide in a mobile feed.

Composition: this is the dedicated MOBILE CLOSE-UP variant — camera distance and hero size are NOT free choices here: render an extreme close-up where the hero's face and shoulders fill at least 40-50% of the frame width, positioned to one side (left or right, whichever leaves the anchor/pill text more room). Use a tight portrait lens look (shallow depth of field, face in sharp focus). The anchor line and pill phrase stack vertically on the open side. Treat the hero photo and the text block as separate, non-intersecting regions with a visible gap of empty background between them.

Typography: clean, bold, heavy sans-serif font throughout for maximum legibility, sharp stylized infographic-quality text, heavy black outline. The anchor line is FLAT plain white lettering with the black outline ONLY. The pill phrase is rendered entirely inside one solid warm-yellow (#F5C518) rounded capsule/pill shape, black or dark navy bold lettering on the yellow pill, with a black outline around the pill itself.

NEGATIVE: do NOT put the anchor line inside a box, panel, or chip of any color. Do NOT add a glow, neon light, drop shadow, backlight, or halo. Do NOT add circuit-board lines, tech/HUD patterns, sparkles. Do NOT render the letters with a 3D, embossed, chrome, or metallic look, or a gradient fill.

CRITICAL TEXT ACCURACY: every string must be spelled out exactly, letter by letter — do not invent, substitute, or garble any character.

Style: ultra-realistic, sharp focus, high detail — a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.
```

---

## 시안 B (thumbnail-b.jpg)

```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "원어민은 -ED를 절대 '드'로 안 읽습니다, 당신만 몰랐던 진짜 발음 규칙". This must match the channel's established, CTR-tested house style exactly — do not invent a different look.

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Anchor line — a very short standalone anchor: "-ED". Render it massive, on its own line, standalone.
- Pill phrase — rendered as the ENTIRE content of a single solid-colored rounded pill/capsule shape directly below the anchor line: "저만 몰랐다고요?"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string, and no hero identity tags or arrow callouts of any kind.

=== BACKGROUND (fixed — do not invent a scene, do not add props) ===
Use a plain, evenly and softly lit single warm cream/beige backdrop across the ENTIRE frame. Do NOT invent a scene, a prop, a classroom object, a phone mockup, a chalkboard, or any set dressing — the only things in the frame are the plain backdrop, the two text elements above, and the hero.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Dress them in the EXACT SAME outfit shown in the reference image. Photographed naturally against the plain backdrop (no cutout sticker border, no vignette) — a genuine shocked/stunned expression (wide eyes, mouth slightly open, one hand half-raised near the head as if just realizing a lifelong mistake), eyes and gaze directed toward the text rather than straight at the camera.

Composition: 16:9 horizontal frame. The hero sits to one side (left or right, whichever fits better) at a medium-to-close, waist-up-or-tighter distance. The anchor line and pill phrase stack vertically on the open side, each sized to fill the available width. Treat the hero photo and the text block as separate, non-intersecting regions with a visible gap of empty background between them.

Typography: clean, bold, heavy sans-serif font throughout, sharp stylized infographic-quality text, heavy black outline. The anchor line is FLAT plain white lettering with the black outline ONLY. The pill phrase is rendered entirely inside one solid warm-yellow (#F5C518) rounded capsule/pill shape, black or dark navy bold lettering on the yellow pill, with a black outline around the pill itself.

NEGATIVE: do NOT put the anchor line inside a box, panel, or chip of any color. Do NOT add a glow, neon light, drop shadow, backlight, or halo. Do NOT add circuit-board lines, tech/HUD patterns, sparkles, or any decorative background motif. Do NOT render the letters with a 3D, embossed, chrome, or metallic look, or a gradient fill.

CRITICAL TEXT ACCURACY: every string must be spelled out exactly, letter by letter — do not invent, substitute, or garble any character.

Style: ultra-realistic, sharp focus, high detail — a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.
```

---

## 시안 C (thumbnail-c.jpg)

```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "영어 선생님도 안 알려준 과거형 끝소리 비밀". This must match the channel's established, CTR-tested house style exactly — do not invent a different look.

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Anchor line — a very short standalone anchor: "-ED". Render it massive, on its own line, standalone.
- Pill phrase — rendered as the ENTIRE content of a single solid-colored rounded pill/capsule shape directly below the anchor line: "3가지 소리였습니다"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string, and no hero identity tags or arrow callouts of any kind.

=== BACKGROUND (fixed — do not invent a scene, do not add props) ===
Use a plain, evenly and softly lit single warm cream/beige backdrop across the ENTIRE frame. Do NOT invent a scene, a prop, a classroom object, a phone mockup, a chalkboard, or any set dressing — the only things in the frame are the plain backdrop, the two text elements above, and the hero.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Dress them in the EXACT SAME outfit shown in the reference image. Photographed naturally against the plain backdrop (no cutout sticker border, no vignette) — a genuine playful "secret-sharing" expression (one finger near the lips in a gentle "shh" gesture, warm knowing smile, slightly leaning toward the text), eyes and gaze directed toward the text rather than straight at the camera.

Composition: 16:9 horizontal frame. The hero sits to one side (left or right, whichever fits better) at a medium-to-close, waist-up-or-tighter distance. The anchor line and pill phrase stack vertically on the open side, each sized to fill the available width. Treat the hero photo and the text block as separate, non-intersecting regions with a visible gap of empty background between them.

Typography: clean, bold, heavy sans-serif font throughout, sharp stylized infographic-quality text, heavy black outline. The anchor line is FLAT plain white lettering with the black outline ONLY. The pill phrase is rendered entirely inside one solid warm-yellow (#F5C518) rounded capsule/pill shape, black or dark navy bold lettering on the yellow pill, with a black outline around the pill itself.

NEGATIVE: do NOT put the anchor line inside a box, panel, or chip of any color. Do NOT add a glow, neon light, drop shadow, backlight, or halo. Do NOT add circuit-board lines, tech/HUD patterns, sparkles, or any decorative background motif. Do NOT render the letters with a 3D, embossed, chrome, or metallic look, or a gradient fill.

CRITICAL TEXT ACCURACY: every string must be spelled out exactly, letter by letter — do not invent, substitute, or garble any character.

Style: ultra-realistic, sharp focus, high detail — a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.
```
