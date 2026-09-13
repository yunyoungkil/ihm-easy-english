# 썸네일 테스트 5 — 인물 위치·거리·오려내기도 AI 자유 판단 (시안 A/B/C)

`buildThumbnailPrompt()`엔 배경·무드는 오늘(2026-09-14) AI 자유 판단으로 바꿨지만, **인물
위치·카메라 거리·오려내기 스타일은 아직도 `Math.random()`으로 고정 목록 중 하나를 강제로
뽑는 방식**이 남아 있다(`heroPositionOptions`/`heroDistanceOptions`/`heroFramingOptions`).
이유: 2026-09-02에 "위치는 자유롭게 판단하라"고만 시켰더니 실제로는 거의 항상 오른쪽으로
수렴하는 문제가 실측으로 확인돼서, 그때는 코드가 강제로 다양하게 배정하는 쪽으로 바꿨었다.

사용자 질문: "캐릭터가 나오는 위치, 카메라 각도, 캐릭터 동작 등등도 고정 형태야?" → 맞다고
답변 → "자유 판단으로 해서 테스트 프롬프트 작성해줘"로 이어짐. 이 문서는 **실제 프로덕션
코드(`buildThumbnailPrompt()`)가 오늘 만든 배경/무드 자유 판단까지 다 반영된 상태에서, 위치·
거리·오려내기만 추가로 자유 판단으로 바꾸면 어떻게 나오는지** 확인하는 테스트다. 아직 실제
코드에는 반영 안 함 — 2026-09-02의 "오른쪽으로만 수렴" 문제가 오늘 바뀐 배경(장면마다 소품
위치가 달라짐)과 결합했을 때도 여전한지 먼저 확인하기 위함.

**중요**: 이 3개 프롬프트는 손으로 다시 쓴 게 아니라, **실제 `buildThumbnailPrompt()` 함수를
그대로 호출**해서 나온 결과 문자열에서 "Place the hero positioned X, shot as Y" 같은 강제
배정 문장만 "자유롭게 판단하라"로 치환한 것이다 — 그래서 이 테스트를 통과하면 코드에는 딱
그 문장 하나만 바꾸면 된다(다른 모든 문구는 실제 코드와 100% 동일).

## 🇰🇷 한글 요약

같은 소재("모음 2개가 나란히 나올 때 앞 모음만 읽는 규칙")를 서로 다른 헤드라인 3개로 테스트:

| 시안 | 헤드라인 |
|---|---|
| A | 여태 두 글자 다 읽었네요... |
| B | 모음 2개 이제 안 막힘 |
| C | 모음 두 글자 1초 컷 |

**확인 포인트**: 3장을 만들어봤을 때 인물 위치·카메라 거리·오려내기 스타일이 실제로 **서로
다르게** 나오는지(자유 판단이 잘 작동), 아니면 2026-09-02 때처럼 **전부 비슷한 배치**(예:
셋 다 오른쪽·클로즈업)로 수렴하는지. 후자면 지금처럼 코드에서 강제 배정하는 방식을 유지해야
하고, 전자면 코드를 단순화(랜덤 배열 3개 삭제)할 수 있다.

## 시안 A

```
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "여태 두 개 다 읽었네요... 모음 2개 겹칠 때 소리 규칙 | 이해하면 쉬운영어".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — one line (wrap naturally across 2 lines only if it does not fit on one), massive bold letters, 3-4 words only — this is the ENTIRE text content of the thumbnail, not a slogan to explain the video: "여태 두 글자 다 읽었네요..."
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== BACKGROUND & SCENE (you decide — no fixed template) ===
Invent a concrete, specific scene or prop that visually shows the exact "mistake / confusion / realization" moment this topic is about — the viewer should be able to guess the general situation just from the image, before reading any text. Use whatever object, setting, or visual device genuinely fits this specific topic (a notebook page, a chalkboard, a handwritten note, a phone screen, a printed word, a classroom prop, a close-up detail — anything is fair game, old-school or modern). The one hard requirement is that it must look like a genuinely designed, sophisticated photograph — a specific, named lighting technique (e.g., "a single warm practical desk-lamp from camera-left casting a soft pool of light and gentle shadow," "diffused overcast window light from behind," "a three-point studio softbox setup with a cool rim light") and a considered color harmony, not a vague "nice lighting" — never a generic, low-effort AI-generated image (flat even lighting, a random gradient glow for its own sake, a cliché stock-photo arrangement). Infer the emotional register of the headline text above (warm and nostalgic, bright and energetic, cool and modern, urgent, calm — whatever it actually is) and choose a mood and color palette that genuinely fits it — do not default to any single fixed palette regardless of topic (2026-09-14: this replaces a fixed dark-navy-with-cyan/magenta-glow background that was used for every topic and every mood, and a fixed per-variant "mood" label that ignored the actual headline — a warm, personal headline was getting cold neon lighting because the variant slot said so).

CRITICAL — do not let the scene explain the answer: any mark or detail in the scene may show THAT something is wrong or resolved (e.g., a red strikethrough, an X, a circle around one letter, a checkmark) but must NOT spell out the correct pronunciation, a phonetic transcription, or any written explanation of why/how it works. The scene should raise the question, not answer it — exactly like the headline text does.

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to: what specific object or scene you chose, why it visually implies the situation without any explanation text, and the exact lighting technique and color treatment you are using (name it specifically, the way a cinematographer would) to make it look intentionally designed rather than generic.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo, with a genuine, expressive reaction that fits the scene and the headline's emotional register (realization, quiet confidence, warmth, energy — whatever actually fits), their eyes and gaze directed toward the headline text rather than straight at the camera — as if they just reacted to reading it, lit consistently with whatever lighting treatment you chose for the scene above (not a fixed color), freely choosing whichever silhouette treatment suits your chosen composition better: cut out along an irregular torn-paper silhouette following their head and shoulders with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR bleed directly to the frame edge with a soft dark vignette and no visible border.

Composition: this is a 16:9 horizontal frame. Freely decide the hero's position (left/right/center/top/bottom — whichever makes THIS headline easiest to read and best complements the scene you invented), camera distance (close-up / medium / waist-up), and camera angle, along with a lens character that fits the scene (e.g., "an 85mm portrait lens with shallow depth of field," "a wide 35mm lens keeping both hero and prop in sharp focus," "a macro lens tight on the prop with the hero softly out of focus behind it") — pick whichever lens best matches the scene you invented. Arrange the headline freely within the remaining space — pick whatever exact layout best fits THIS specific headline length. The hero and the background scene/prop should feel like they belong in the same physical space (e.g., the hero is reacting to or near the object, not just floating in front of an unrelated backdrop). Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast so it stays readable against whatever background scene you chose. The headline itself is already compressed to 3-4 words — a visual "stun gun," not a sentence to persuade with — so treat every word in it as important. Within it, pick the single most important 1-2 word phrase — the sharpest word(s) — and render just those with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere in the headline — never skip it and never apply it to more than one phrase.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject and the scene/prop must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.
```

## 시안 B

```
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "모음 2개 이제 안 막힘, 나란히 오는 모음의 정체 | 영어 읽는 법".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — one line (wrap naturally across 2 lines only if it does not fit on one), massive bold letters, 3-4 words only — this is the ENTIRE text content of the thumbnail, not a slogan to explain the video: "모음 2개 이제 안 막힘"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== BACKGROUND & SCENE (you decide — no fixed template) ===
Invent a concrete, specific scene or prop that visually shows the exact "mistake / confusion / realization" moment this topic is about — the viewer should be able to guess the general situation just from the image, before reading any text. Use whatever object, setting, or visual device genuinely fits this specific topic (a notebook page, a chalkboard, a handwritten note, a phone screen, a printed word, a classroom prop, a close-up detail — anything is fair game, old-school or modern). The one hard requirement is that it must look like a genuinely designed, sophisticated photograph — a specific, named lighting technique (e.g., "a single warm practical desk-lamp from camera-left casting a soft pool of light and gentle shadow," "diffused overcast window light from behind," "a three-point studio softbox setup with a cool rim light") and a considered color harmony, not a vague "nice lighting" — never a generic, low-effort AI-generated image (flat even lighting, a random gradient glow for its own sake, a cliché stock-photo arrangement). Infer the emotional register of the headline text above (warm and nostalgic, bright and energetic, cool and modern, urgent, calm — whatever it actually is) and choose a mood and color palette that genuinely fits it — do not default to any single fixed palette regardless of topic (2026-09-14: this replaces a fixed dark-navy-with-cyan/magenta-glow background that was used for every topic and every mood, and a fixed per-variant "mood" label that ignored the actual headline — a warm, personal headline was getting cold neon lighting because the variant slot said so).

CRITICAL — do not let the scene explain the answer: any mark or detail in the scene may show THAT something is wrong or resolved (e.g., a red strikethrough, an X, a circle around one letter, a checkmark) but must NOT spell out the correct pronunciation, a phonetic transcription, or any written explanation of why/how it works. The scene should raise the question, not answer it — exactly like the headline text does.

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to: what specific object or scene you chose, why it visually implies the situation without any explanation text, and the exact lighting technique and color treatment you are using (name it specifically, the way a cinematographer would) to make it look intentionally designed rather than generic.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo, with a genuine, expressive reaction that fits the scene and the headline's emotional register (realization, quiet confidence, warmth, energy — whatever actually fits), their eyes and gaze directed toward the headline text rather than straight at the camera — as if they just reacted to reading it, lit consistently with whatever lighting treatment you chose for the scene above (not a fixed color), freely choosing whichever silhouette treatment suits your chosen composition better: cut out along an irregular torn-paper silhouette following their head and shoulders with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR bleed directly to the frame edge with a soft dark vignette and no visible border.

Composition: this is a 16:9 horizontal frame. Freely decide the hero's position (left/right/center/top/bottom — whichever makes THIS headline easiest to read and best complements the scene you invented), camera distance (close-up / medium / waist-up), and camera angle, along with a lens character that fits the scene (e.g., "an 85mm portrait lens with shallow depth of field," "a wide 35mm lens keeping both hero and prop in sharp focus," "a macro lens tight on the prop with the hero softly out of focus behind it") — pick whichever lens best matches the scene you invented. Arrange the headline freely within the remaining space — pick whatever exact layout best fits THIS specific headline length. The hero and the background scene/prop should feel like they belong in the same physical space (e.g., the hero is reacting to or near the object, not just floating in front of an unrelated backdrop). Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast so it stays readable against whatever background scene you chose. The headline itself is already compressed to 3-4 words — a visual "stun gun," not a sentence to persuade with — so treat every word in it as important. Within it, pick the single most important 1-2 word phrase — the sharpest word(s) — and render just those with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere in the headline — never skip it and never apply it to more than one phrase.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject and the scene/prop must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.
```

## 시안 C

```
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "모음 두 글자 1초 컷, 겹모음 읽는 가장 쉬운 방법 | 왕초보 영어".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — one line (wrap naturally across 2 lines only if it does not fit on one), massive bold letters, 3-4 words only — this is the ENTIRE text content of the thumbnail, not a slogan to explain the video: "모음 두 글자 1초 컷"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== BACKGROUND & SCENE (you decide — no fixed template) ===
Invent a concrete, specific scene or prop that visually shows the exact "mistake / confusion / realization" moment this topic is about — the viewer should be able to guess the general situation just from the image, before reading any text. Use whatever object, setting, or visual device genuinely fits this specific topic (a notebook page, a chalkboard, a handwritten note, a phone screen, a printed word, a classroom prop, a close-up detail — anything is fair game, old-school or modern). The one hard requirement is that it must look like a genuinely designed, sophisticated photograph — a specific, named lighting technique (e.g., "a single warm practical desk-lamp from camera-left casting a soft pool of light and gentle shadow," "diffused overcast window light from behind," "a three-point studio softbox setup with a cool rim light") and a considered color harmony, not a vague "nice lighting" — never a generic, low-effort AI-generated image (flat even lighting, a random gradient glow for its own sake, a cliché stock-photo arrangement). Infer the emotional register of the headline text above (warm and nostalgic, bright and energetic, cool and modern, urgent, calm — whatever it actually is) and choose a mood and color palette that genuinely fits it — do not default to any single fixed palette regardless of topic (2026-09-14: this replaces a fixed dark-navy-with-cyan/magenta-glow background that was used for every topic and every mood, and a fixed per-variant "mood" label that ignored the actual headline — a warm, personal headline was getting cold neon lighting because the variant slot said so).

CRITICAL — do not let the scene explain the answer: any mark or detail in the scene may show THAT something is wrong or resolved (e.g., a red strikethrough, an X, a circle around one letter, a checkmark) but must NOT spell out the correct pronunciation, a phonetic transcription, or any written explanation of why/how it works. The scene should raise the question, not answer it — exactly like the headline text does.

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to: what specific object or scene you chose, why it visually implies the situation without any explanation text, and the exact lighting technique and color treatment you are using (name it specifically, the way a cinematographer would) to make it look intentionally designed rather than generic.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo, with a genuine, expressive reaction that fits the scene and the headline's emotional register (realization, quiet confidence, warmth, energy — whatever actually fits), their eyes and gaze directed toward the headline text rather than straight at the camera — as if they just reacted to reading it, lit consistently with whatever lighting treatment you chose for the scene above (not a fixed color), freely choosing whichever silhouette treatment suits your chosen composition better: cut out along an irregular torn-paper silhouette following their head and shoulders with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR bleed directly to the frame edge with a soft dark vignette and no visible border.

Composition: this is a 16:9 horizontal frame. Freely decide the hero's position (left/right/center/top/bottom — whichever makes THIS headline easiest to read and best complements the scene you invented), camera distance (close-up / medium / waist-up), and camera angle, along with a lens character that fits the scene (e.g., "an 85mm portrait lens with shallow depth of field," "a wide 35mm lens keeping both hero and prop in sharp focus," "a macro lens tight on the prop with the hero softly out of focus behind it") — pick whichever lens best matches the scene you invented. Arrange the headline freely within the remaining space — pick whatever exact layout best fits THIS specific headline length. The hero and the background scene/prop should feel like they belong in the same physical space (e.g., the hero is reacting to or near the object, not just floating in front of an unrelated backdrop). Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast so it stays readable against whatever background scene you chose. The headline itself is already compressed to 3-4 words — a visual "stun gun," not a sentence to persuade with — so treat every word in it as important. Within it, pick the single most important 1-2 word phrase — the sharpest word(s) — and render just those with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere in the headline — never skip it and never apply it to more than one phrase.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject and the scene/prop must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.
```

**레퍼런스 이미지**(3안 공통): `public/brand/thumbnail-presenter-reference.jpg`를 같이 첨부.

## 저장 위치

`test-prompts/`(저장소 루트) — 특정 에피소드가 아니라 `buildThumbnailPrompt()` 코드 자체의
"위치/거리/오려내기 자유 판단" 변경이 안전한지 확인하는 도구 테스트이기 때문
(`google-ai-studio-prompting.md` §4 예외 규정).

## 시도 기록

- 2026-09-14: 최초 작성. 실제 `buildThumbnailPrompt()`를 3번 호출해서 나온 진짜 결과물에서
  위치/거리/오려내기 강제 배정 문장만 자유 판단으로 치환 — 다른 문구는 전부 실제 코드와 동일.
  아직 이미지 생성 전. **확인할 것**: (1) A/B/C 세 장의 인물 위치·거리·오려내기 스타일이
  실제로 다양하게 나오는지(2026-09-02의 "오른쪽 수렴" 문제 재발 여부), (2) 오늘 바뀐 배경
  자유 판단(장면별로 다른 소품 위치)이 인물 배치에도 자연스럽게 반영되는지(예: 소품이 왼쪽에
  있으면 인물이 오른쪽으로 가는 식). 통과하면 `buildThumbnailPrompt()`의 `heroPositionOptions`/
  `heroDistanceOptions`/`heroFramingOptions` 강제 배열 3개를 삭제하고 이 방식으로 교체.
