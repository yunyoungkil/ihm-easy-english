# 썸네일 테스트 6c — 호스트를 가리키는 빨간 화살표 3개(항상 전부 표시, 종이 누끼+1줄씩)

v6b(화살표 2개, 3개 후보 중 상황별 2개 선택)에서 사용자가 다시 조정: 2번 후보 문구를
"영상 만들며 같이 배우는 사람" → **"영상 만들면서 공부하는 사람"**으로 변경, 그리고
**상황별 2개 선택을 그만두고 3개를 항상 다 같이 보여주기**로 확정(질문으로 재확인 완료).

- **최종 3개 라벨(항상 전부 고정 표시, AI 선택 로직 없음)**:
  1. "영어 기초 1도 없이 시작한 사람"
  2. "영상 만들면서 공부하는 사람"
  3. "외우기 싫어하고 외워도 금방 까먹는 사람"
- **화살표 스타일**: 손그림 느낌, 빨간색, 각각 찢어진 종이 질감의 누끼(기존 인물 컷아웃과
  같은 시각 언어) — 화살표 3개가 호스트 주위 서로 다른 각도에서 뻗어나가 겹치지 않게 함.

**⚠️ 솔직한 우려 하나**: 화살표 3개+라벨 3줄이 추가되면 헤드라인·강조 칩·인물까지 합쳐서
텍스트/그래픽 요소가 상당히 많아진다 — 이번 세션 초반에 "헤드라인 하나만 강하게" 원칙으로
badge/copy를 다 지웠던 것과 방향이 반대로 가는 셈이라, 실제 이미지로 봤을 때 복잡해 보이면
그때 개수를 다시 줄이는 것도 고려할 것.

**이 프롬프트는 손으로 다시 쓴 게 아니라, 실제 `buildThumbnailPrompt()` 함수를 그대로
호출**해서 나온 결과(2026-09-14 반영된 배경 자유 판단·anti-cliché 규칙까지 전부 포함)에
호스트 라벨 관련 문장만 추가로 patch한 것이다.

## 확인 포인트

- 화살표 3개가 실제로 서로 다른 각도에서 호스트를 가리키며 안 겹치는지
- 라벨 3줄이 헤드라인과 명확히 구분되는 작은 크기로 나오는지, 화면이 복잡해 보이지 않는지
- 각 화살표의 종이 누끼 스타일이 인물 컷아웃과 실제로 어울리는지
- 라벨 텍스트 3개가 전부 오탈자 없이 정확히 렌더링되는지

## 프롬프트

```
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "여태 두 글자 다 읽었네요... 모음 2개 겹칠 때 소리 규칙".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — one line (wrap naturally across 2 lines only if it does not fit on one), massive bold letters, 3-4 words only — this is the ENTIRE text content of the thumbnail, not a slogan to explain the video: "모음 두 개, 하나는 버려라"
- Hero identity callout — THREE separate hand-drawn-style curved arrows in a bold red marker color, each pointing at the hero from a different angle around them (not at the headline or any prop) so they never visually cross, overlap, or stack on top of each other, each drawn as if sketched onto its own small torn/ripped scrap of paper (matching the same torn-paper texture treatment used for the hero's silhouette elsewhere in this image — an irregular torn edge, slight paper-fiber texture, a soft drop shadow lifting it off the background). One short label sits on or right beside each paper scrap, clearly smaller and visually secondary to the headline (supporting identity notes, not the main hook). Render all THREE of these exactly, one per arrow — this is a fixed set, always all three, not a choice: "영어 기초 1도 없이 시작한 사람", "영상 만들면서 공부하는 사람", "외우기 싫어하고 외워도 금방 까먹는 사람".
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== BACKGROUND & SCENE (you decide — no fixed template) ===
Invent a concrete, specific scene or prop that visually shows the exact "mistake / confusion / realization" moment this topic is about — the viewer should be able to guess the general situation just from the image, before reading any text. Use whatever object, setting, or visual device genuinely fits this specific topic (a notebook page, a chalkboard, a handwritten note, a phone screen, a printed word, a classroom prop, a close-up detail — anything is fair game, old-school or modern). The one hard requirement is that it must look like a genuinely designed, sophisticated photograph — a specific, named lighting technique (e.g., "a single warm practical desk-lamp from camera-left casting a soft pool of light and gentle shadow," "diffused overcast window light from behind," "a three-point studio softbox setup with a cool rim light") and a considered color harmony, not a vague "nice lighting" — never a generic, low-effort AI-generated image (flat even lighting, a random gradient glow for its own sake, a cliché stock-photo arrangement). Infer the emotional register of the headline text above (warm and nostalgic, bright and energetic, cool and modern, urgent, calm — whatever it actually is) and choose a mood and color palette that genuinely fits it — do not default to any single fixed palette regardless of topic (2026-09-14: this replaces a fixed dark-navy-with-cyan/magenta-glow background that was used for every topic and every mood, and a fixed per-variant "mood" label that ignored the actual headline — a warm, personal headline was getting cold neon lighting because the variant slot said so).

CRITICAL — do not let the scene explain the answer: any mark or detail in the scene may show THAT something is wrong or resolved (e.g., a red strikethrough, an X, a circle around one letter, a checkmark) but must NOT spell out the correct pronunciation, a phonetic transcription, or any written explanation of why/how it works. The scene should raise the question, not answer it — exactly like the headline text does.

CRITICAL — anchor the scene to real words/examples, not a generic "knowledge" metaphor (2026-09-14: real generations kept drifting into clichés like an ancient locked book or stack of old paper glowing with mystical light — visually striking but disconnected from the actual topic, physically nonsensical (why would a locked book emit light?), and generic enough to fit literally any educational video). The scene must include an actual word or example this specific topic is about (e.g., real English words relevant to this exact pronunciation rule), written or displayed somewhere in the prop. Avoid abstract "unlocking wisdom" imagery (glowing locked books, magical light bursts, treasure chests, keys/locks with no real-world reason to be there) — these could illustrate any topic and show nothing about what this video actually teaches. Every element in the scene should have a plausible, real-world reason for looking the way it does; if you can't explain why the object would realistically look that way, choose a different, more grounded scene.

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to: what specific object or scene you chose, why it visually implies the situation without any explanation text, and the exact lighting technique and color treatment you are using (name it specifically, the way a cinematographer would) to make it look intentionally designed rather than generic.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo, with a genuine, expressive reaction that fits the scene and the headline's emotional register (realization, quiet confidence, warmth, energy — whatever actually fits), their eyes and gaze directed toward the headline text rather than straight at the camera — as if they just reacted to reading it, lit consistently with whatever lighting treatment you chose for the scene above (not a fixed color), freely choosing whichever silhouette treatment suits your chosen composition better: cut out along an irregular torn-paper silhouette following their head and shoulders with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR bleed directly to the frame edge with a soft dark vignette and no visible border.

Composition: this is a 16:9 horizontal frame. Freely decide the hero's position (left/right/center/top/bottom — whichever makes THIS headline easiest to read and best complements the scene you invented), camera distance (close-up / medium / waist-up), and camera angle, along with a lens character that fits the scene (e.g., "an 85mm portrait lens with shallow depth of field," "a wide 35mm lens keeping both hero and prop in sharp focus," "a macro lens tight on the prop with the hero softly out of focus behind it") — pick whichever lens best matches the scene you invented. Arrange the headline freely within the remaining space — pick whatever exact layout best fits THIS specific headline length. The hero and the background scene/prop should feel like they belong in the same physical space (e.g., the hero is reacting to or near the object, not just floating in front of an unrelated backdrop). Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Position the three hero identity callouts (red torn-paper arrow + one line, each) around the hero at different points so each clearly points at the hero without overlapping the hero, the headline, the highlighted chip, or each other — treat each as its own small zone near the hero's edge, spaced out enough to stay readable rather than crowding into one corner. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast so it stays readable against whatever background scene you chose. The headline itself is already compressed to 3-4 words — a visual "stun gun," not a sentence to persuade with — so treat every word in it as important. Within it, pick the single most important 1-2 word phrase — the sharpest word(s) — and render just those with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere in the headline — never skip it and never apply it to more than one phrase. Each hero identity callout's single line uses the same clean sans-serif family but noticeably smaller and without the yellow highlight chip — it reads as a supporting aside near the hero, not a second headline.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject and the scene/prop must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles.
```
