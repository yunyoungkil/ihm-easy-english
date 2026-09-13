# 썸네일 테스트 4 — 배경을 "구체적 상황"으로 채우기 (시안 A/B/C)

지금까지는 배경이 "다크 네이비 + 시안/마젠타 글로우"로 소재와 무관하게 고정돼 있었다. 사용자가
공유한 "시각적 맥락이 텍스트의 빈칸을 채운다" 이론(그림이 먼저 상황을 보여주고, 텍스트는 감정만
남겨야 궁금증이 생긴다)을 적용해서, 배경 자체를 "이 소재의 실수/혼란 상황을 보여주는 구체적
장면"으로 AI가 직접 판단해서 채우도록 바꾼 테스트다. 아직 실제 코드(`buildThumbnailPrompt()`)에는
반영 안 함 — 사용자가 이 프롬프트로 직접 이미지를 만들어보고 판단할 수 있게 프롬프트만 먼저 작성.

**공통 소재**: "모음 2개가 나란히 나올 때 앞 모음만 읽는 규칙"(예: BOAT → "보트", A는 소리 안 남)

**공통 핵심 변경**: 배경 지시문을 고정 문구("다크 네이비 배경 + 시안/마젠타 글로우")에서 "이
소재의 상황을 보여주는 구체적 소품/장면을 직접 골라라"로 바꿈. 소품은 칠판이든 노트든 디지털
화면이든 뭐든 상관없고(사용자 확인: "촌스러움은 소재가 아니라 실행 수준의 문제"), 유일한 조건은
"진짜 디자이너가 만든 것처럼 조명·색감·구도가 감각적이어야 한다"는 것. **2026-09-14 재수정**:
처음엔 "다크 Cyber-HUD 톤을 기본 참고 무드로"라고 은근히 못박아뒀는데, 시안 B(디지털 기기
소재)가 이 기본값 때문에 차가운 테크 네온 조명으로 나와서 오늘 검증된 "50대 만학도의 따뜻한
아날로그 감성"과 충돌하는 문제가 실제로 발생함(사용자 지적). 그래서 "Cyber-HUD를 기본값으로"
문구를 완전히 삭제하고, "이 헤드라인·장면의 감정에 맞는 무드를 직접 판단하라 — 특정 색감을
기본으로 깔지 말 것"으로 교체(색감 고정 자체를 없앰, 참고 무드조차 남기지 않음). 조명 기법·
카메라 렌즈도 구체적으로 이름 붙여 설명하게 요구함(`google-ai-studio-prompting.md` §2 기준
보강, 아래 "시도 기록" 참고).

**A/B/C를 나눈 이유**: 같은 소재라도 AI가 서로 다른 구체적 장면(소품·설정)을 고르는지, 그리고
그 장면들이 서로 겹치지 않게 다양한지 확인하기 위함 — 실제 CTR 진단이 만든 5개 headline 후보
중 서로 다른 3개를 골라 각각 다른 무드의 장면과 짝지었다(모두 규칙 1 강화 이후 검증된 문구 —
정답 미노출·음성학 용어 없음).

---

## 시안 A — 아날로그 공감형 (검증 완료)

- **헤드라인**: "여태 두 글자 다 읽었네요..."(동반자 톤, 공감형)
- **장면 컨셉**: 손으로 "BOAT"를 반복 연습해서 쓴 스프링 노트, 하나는 빨간 X로 정정 + 따뜻한
  스탠드 조명 — 향수 어린 "공부하던 시절" 느낌
- **결과**: ✅ 2026-09-14 실제 생성·검증 완료(아래 "시도 기록" 참고). 비주얼 그대로 통과, 최초
  헤드라인("겹모음 뒤는 버리세요")만 정답 누설 문제로 교체됨.

```
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "모음 2개가 나란히 나올 때 앞 모음만 읽는 규칙(예: BOAT는 '보트'로, A는 소리 나지 않음)".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — massive bold letters, one line (wrap naturally across 2 lines only if it does not fit on one), 3-4 words only — this is the ENTIRE text content of the thumbnail, not a slogan to explain the video: "여태 두 글자 다 읽었네요..."
Do not render any text other than the string quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== BACKGROUND & SCENE (you decide — no fixed template) ===
Invent a concrete, specific scene or prop that visually shows the exact "mistake / confusion / realization" moment this topic is about — the viewer should be able to guess the general situation just from the image, before reading any text. Use whatever object, setting, or visual device genuinely fits this specific topic (a notebook page, a chalkboard, a handwritten note, a phone screen, a printed word, a classroom prop, a close-up detail — anything is fair game, old-school or modern). The one hard requirement is that it must look like a genuinely designed, sophisticated photograph — a specific, named lighting technique (e.g., "a single warm practical desk-lamp from camera-left casting a soft pool of light and gentle shadow," "diffused overcast window light from behind," "a three-point studio softbox setup with a cool rim light") and a considered color harmony, not a vague "nice lighting" — never a generic, low-effort AI-generated image (flat even lighting, a random gradient glow for its own sake, a cliché stock-photo arrangement). Choose whatever lighting mood and color palette genuinely fits the emotional register of this specific headline and scene (warm and nostalgic, bright and energetic, cool and modern — whatever serves this exact moment) — do not default to any single fixed palette. For this particular headline ("여태 두 글자 다 읽었네요...", a warm, personal, slightly wistful realization), a warm and intimate lighting treatment will likely serve it better than a cold or clinical one.

CRITICAL — do not let the scene explain the answer: any mark or detail in the scene may show THAT something is wrong (e.g., a red strikethrough, an X, a circle around one letter) but must NOT spell out the correct pronunciation, a phonetic transcription, or any written explanation of why/how it works. The scene should raise the question, not answer it — exactly like the headline text does. If you catch yourself adding a pronunciation guide, a phonetic symbol, or explanatory text anywhere in the scene, remove it.

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to: what specific object or scene you chose, why it visually implies "reading a word wrong" without any explanation text, and the exact lighting technique and color treatment you are using (name it specifically, the way a cinematographer would) to make it look intentionally designed rather than generic.

=== HERO ===
Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo. Give them a genuine, expressive reaction that fits a moment of "wait, I've been reading this wrong my whole life" — realization mixed with a wry, knowing smile, not shock. Cut them out along an irregular torn-paper silhouette following their head and shoulders, with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR let them bleed directly to the frame edge with a soft dark vignette and no visible border — pick whichever suits your chosen composition better.

=== COMPOSITION ===
This is a 16:9 horizontal frame. Freely decide the hero's position (left/right/center/top/bottom), camera distance (close-up / medium / waist-up), camera angle, and lens character (e.g., "an 85mm portrait lens with shallow depth of field softly blurring the background," "a wide 35mm lens keeping both hero and prop in sharp focus," "a macro lens tight on the prop with the hero softly out of focus behind it") — whichever combination best fits the scene you invented and makes the headline easiest to read. The hero and the background scene/prop should feel like they belong in the same physical space (e.g., the hero is reacting to or near the object, not just floating in front of an unrelated backdrop). Treat the hero photo and the headline text as separate, non-intersecting regions with a visible gap between them — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check that no part of the headline is covered, thinned, or interrupted by the hero photo or the scene; if it would be, shrink or move the hero instead of the text.

=== TYPOGRAPHY ===
Use a clean, bold, heavy sans-serif font for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast so it stays readable against whatever background scene you chose. Within the headline, pick the single most important 1-2 word phrase — the sharpest word(s) — and render just those with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word stays plain white with the black outline. This highlighted-phrase chip must appear exactly once — never skip it and never apply it to more than one phrase.

CRITICAL TEXT ACCURACY: the headline string must be spelled out exactly, letter by letter, with correct Korean characters — do not invent, substitute, or garble any character. If unsure how to render it clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject and the scene/prop must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text.
```

---

## 시안 B — 디지털 진전형 (신규)

- **헤드라인**: "모음 2개 이제 안 막힘"(동반자 톤이라기보단 약속/결과 확정형 — 5개 후보 중
  다른 각도를 일부러 선택)
- **장면 컨셉**: A와 대비되는 **모던/디지털** 장면 — 언어학습 앱 화면에 이전엔 틀렸던 단어가
  이제 초록 체크로 바뀌어 있는 스마트폰 클로즈업. "아날로그 노트(과거의 실수)" 대신
  "디지털 진전(지금은 안 막힌다)"을 보여줘서 A와 톤을 의도적으로 다르게 함.

```
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "모음 2개가 나란히 나올 때 앞 모음만 읽는 규칙(예: BOAT는 '보트'로, A는 소리 나지 않음)".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — massive bold letters, one line (wrap naturally across 2 lines only if it does not fit on one), 3-4 words only — this is the ENTIRE text content of the thumbnail, not a slogan to explain the video: "모음 2개 이제 안 막힘"
Do not render any text other than the string quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== BACKGROUND & SCENE (you decide — no fixed template) ===
Invent a concrete, specific scene or prop that visually shows "progress / no longer being stuck" on this exact topic — the viewer should be able to guess the general situation just from the image, before reading any text. Lean toward a modern, digital device or setting (a phone screen, a tablet, an app interface, a smart display) as a deliberate contrast to an old-school paper notebook — something that reads as "today, in real life," not "years ago in a classroom." The one hard requirement is that it must look like a genuinely designed, sophisticated photograph — a specific, named lighting technique (e.g., "the phone/tablet screen casting a soft warm-white glow on the hero's face, mixed with a warm practical lamp nearby for a cozy, personal feel," "clean warm daylight from a nearby window, screen brightness balanced against it") and a considered color harmony — never a generic, low-effort AI-generated image (flat even lighting, a random gradient glow for its own sake, a cliché stock-photo arrangement, or a cold/clinical "tech product ad" look). Choose whatever lighting mood and color palette genuinely fits the emotional register of this specific headline and scene — do not default to any single fixed palette. This headline ("모음 2개 이제 안 막힘," a quiet, personal sense of relief) calls for a warm, intimate feeling even though the prop is a modern device — avoid cold blue "tech neon" lighting, which reads as clinical and clashes with this channel's warm, companion-like persona.

CRITICAL — do not let the screen/device explain the answer: whatever word or app UI appears on the screen, it must NOT show a phonetic transcription, a pronunciation guide, or any written explanation of why/how the rule works. A simple checkmark, a green highlight, or a "completed" visual state is enough to say "no longer stuck" — do not add spelled-out pronunciation symbols like "[bout]" or similar. The scene should raise the question, not answer it — exactly like the headline text does.

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to: what specific device/scene you chose, what exact detail on the screen or object shows "no longer stuck" without any explanation text, and the exact lighting technique and color treatment you are using (name it specifically, the way a cinematographer would) to make it look intentionally designed rather than generic.

=== HERO ===
Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo. Give them a genuine, confident, slightly pleased expression — the quiet satisfaction of something finally clicking, not exaggerated excitement. Cut them out along an irregular torn-paper silhouette following their head and shoulders, with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR let them bleed directly to the frame edge with a soft dark vignette and no visible border — pick whichever suits your chosen composition better.

=== COMPOSITION ===
This is a 16:9 horizontal frame. Freely decide the hero's position (left/right/center/top/bottom), camera distance (close-up / medium / waist-up), camera angle, and lens character (e.g., "an 85mm portrait lens with shallow depth of field softly blurring the background," "a wide 35mm lens keeping both hero and prop in sharp focus," "a macro lens tight on the prop with the hero softly out of focus behind it") — whichever combination best fits the scene you invented and makes the headline easiest to read. The hero and the background scene/prop should feel like they belong in the same physical space (e.g., the hero is holding or reacting to the device, not just floating in front of an unrelated backdrop). Treat the hero photo and the headline text as separate, non-intersecting regions with a visible gap between them — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check that no part of the headline is covered, thinned, or interrupted by the hero photo or the scene; if it would be, shrink or move the hero instead of the text.

=== TYPOGRAPHY ===
Use a clean, bold, heavy sans-serif font for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast so it stays readable against whatever background scene you chose. Within the headline, pick the single most important 1-2 word phrase — the sharpest word(s) — and render just those with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word stays plain white with the black outline. This highlighted-phrase chip must appear exactly once — never skip it and never apply it to more than one phrase.

CRITICAL TEXT ACCURACY: the headline string must be spelled out exactly, letter by letter, with correct Korean characters — do not invent, substitute, or garble any character. If unsure how to render it clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject and the scene/prop must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI text other than what naturally belongs on the invented app screen, no stock-photo text.
```

---

## 시안 C — 속도/효율형 (신규)

- **헤드라인**: "모음 두 글자 1초 컷"(효율성형 — A/B와 또 다른 각도)
- **장면 컨셉**: 부채꼴로 펼쳐진 단어 카드 더미 + 스톱워치/타이머, 손이 카드를 빠르게 넘기는
  중 — "1초 컷"이라는 속도감을 시각적으로 뒷받침. A(과거 회상)·B(디지털 진전)와 다시 다른
  "지금 이 순간의 스피드" 무드.

```
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "모음 2개가 나란히 나올 때 앞 모음만 읽는 규칙(예: BOAT는 '보트'로, A는 소리 나지 않음)".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — massive bold letters, one line (wrap naturally across 2 lines only if it does not fit on one), 3-4 words only — this is the ENTIRE text content of the thumbnail, not a slogan to explain the video: "모음 두 글자 1초 컷"
Do not render any text other than the string quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== BACKGROUND & SCENE (you decide — no fixed template) ===
Invent a concrete, specific scene or prop that visually conveys speed and quick mastery on this exact topic — the viewer should be able to guess the general situation just from the image, before reading any text. Consider things like a fanned-out stack of vocabulary flashcards mid-flip, a stopwatch or timer, a blurred motion detail suggesting quick action — anything that genuinely fits a "fast, confident, no more hesitation" feeling for this specific topic. The one hard requirement is that it must look like a genuinely designed, sophisticated photograph — a specific, named lighting technique (e.g., "a hard directional key light from camera-right creating crisp shadows and a sense of energy," "bright even daylight with a fast shutter feel, subtle motion blur on moving elements," "warm afternoon sunlight streaming across a wooden desk, catching the flashcards mid-flip") and a considered color harmony — never a generic, low-effort AI-generated image (flat even lighting, a random gradient glow for its own sake, a cliché stock-photo arrangement). Choose whatever lighting mood and color palette genuinely fits the emotional register of this specific headline and scene (energetic doesn't have to mean cold or neon) — do not default to any single fixed palette.

CRITICAL — do not let the scene explain the answer: if any flashcard or prop shows a word, it may show the plain word only (e.g., "BOAT") — it must NOT show a phonetic transcription, a pronunciation guide, or any written explanation of why/how the rule works. The scene should raise the question, not answer it — exactly like the headline text does.

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to: what specific object or scene you chose, how it visually conveys speed/quick mastery without any explanation text, and the exact lighting technique and color treatment you are using (name it specifically, the way a cinematographer would) to make it look intentionally designed rather than generic.

=== HERO ===
Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo. Give them a genuine, energetic, confident expression — quick and decisive, like they just breezed through something effortlessly. Cut them out along an irregular torn-paper silhouette following their head and shoulders, with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR let them bleed directly to the frame edge with a soft dark vignette and no visible border — pick whichever suits your chosen composition better.

=== COMPOSITION ===
This is a 16:9 horizontal frame. Freely decide the hero's position (left/right/center/top/bottom), camera distance (close-up / medium / waist-up), camera angle, and lens character (e.g., "an 85mm portrait lens with shallow depth of field softly blurring the background," "a wide 35mm lens keeping both hero and prop in sharp focus," "a macro lens tight on the prop with the hero softly out of focus behind it") — whichever combination best fits the scene you invented and makes the headline easiest to read. The hero and the background scene/prop should feel like they belong in the same physical space (e.g., the hero is mid-action with the object, not just floating in front of an unrelated backdrop). Treat the hero photo and the headline text as separate, non-intersecting regions with a visible gap between them — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check that no part of the headline is covered, thinned, or interrupted by the hero photo or the scene; if it would be, shrink or move the hero instead of the text.

=== TYPOGRAPHY ===
Use a clean, bold, heavy sans-serif font for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast so it stays readable against whatever background scene you chose. Within the headline, pick the single most important 1-2 word phrase — the sharpest word(s) — and render just those with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other word stays plain white with the black outline. This highlighted-phrase chip must appear exactly once — never skip it and never apply it to more than one phrase.

CRITICAL TEXT ACCURACY: the headline string must be spelled out exactly, letter by letter, with correct Korean characters — do not invent, substitute, or garble any character. If unsure how to render it clearly, make it larger and simpler rather than risk misspelling it.

Style: ultra-realistic, sharp focus, high detail — the human subject and the scene/prop must look like a real photograph, not an illustration or 3D render. No watermark, no fake phone or browser UI, no stock-photo text.
```

---

**레퍼런스 이미지**(3안 공통): `public/brand/thumbnail-presenter-reference.jpg`를 같이 첨부.

## 저장 위치

이 md는 `test-prompts/`(저장소 루트)에 있다 — 특정 에피소드 제작용이 아니라 "배경 자유 판단
+ 품질 기준" 프롬프트 방식 자체가 잘 작동하는지 확인하는 도구 테스트이기 때문
(`google-ai-studio-prompting.md` §4 예외 규정).

## 시도 기록

- 2026-09-14: 최초 작성(시안 A만). 아직 이미지 생성 전 — 사용자가 직접 만들어보고 결과를
  공유하면, AI가 실제로 어떤 구체적 소품/장면을 선택했는지, 그리고 그게 그림만으로 "잘못 읽은
  상황"을 전달하는지 확인 예정. 통과하면 `buildThumbnailPrompt()`의 고정 Background 문구를
  이 방식으로 교체.
- 2026-09-14(계속): 사용자가 "이거 aistudio.google.com/docs 참고해서 만들었어?"라고 물어서
  `knowledge/google-ai-studio-prompting.md` §2 기준으로 다시 대조 — 조명 기법 구체성, 카메라
  렌즈, 사실감 강조어(ultra-realistic/sharp focus) 3곳이 빠져 있던 걸 발견하고 보강. "이
  조명/렌즈를 써라"로 못박지 않고 "어떤 걸 쓸지 직접 정하고 구체적으로 이름 붙여 설명하라"는
  방식으로 넣어서, 자유 판단 원칙과 문서 권장 사항을 동시에 만족시킴.
- 2026-09-14(계속): 사용자가 실제로 시안 A 이미지를 생성해서 결과 공유. **비주얼(노트+표정+
  조명)은 완벽하게 통과** — "BOAT"를 반복해서 손으로 쓴 스프링 노트, 그중 하나는 A에 빨간
  X + "보트" 정정 표기, 따뜻한 스탠드 조명과 어두운 배경의 대비 — 그림만 보고도 "잘못 읽어온
  상황"이 바로 전달됨. **텍스트는 실패** — 헤드라인 "겹모음 뒤는 버리세요"가 이 영상의 핵심
  정답을 100% 누설(사용자 지적: "영상을 클릭할 이유(결핍)를 없애버린 것")했고, "겹모음"이라는
  음성학 용어 자체도 왕초보에게 진입 장벽이 됨. **원인 파악**: `scripts/ab-simulator.mjs`
  규칙 1(정답 노출 금지)이 "제목에서"라는 문구 때문에 title에만 강하게 적용되고
  thumbnailHeadline에는 느슨하게 적용됐던 것으로 보임 — 규칙 1을 "title뿐 아니라
  thumbnailHeadline도 똑같이 적용"으로 강화하고, 어려운 음성학 용어 회피 조항도 명시적으로
  추가함(실제 코드 수정 완료). 시안 A의 헤드라인도 "여태 두 글자 다 읽었네요..."로 교체 —
  비주얼은 그대로 두고 텍스트만 바꾸면 되는 걸 실측으로 확인.
- 2026-09-14(계속): 사용자 요청으로 시안 B("디지털 진전형" — 언어학습 앱 화면)·시안
  C("속도/효율형" — 플래시카드+스톱워치) 신규 작성. 강화된 규칙 1로 실제 CTR 진단을 다시
  돌려 나온 5개 헤드라인 후보 중 A와 겹치지 않는 서로 다른 각도 2개를 골라 사용(정답 미노출·
  음성학 용어 없음 확인됨). 아직 생성 전 — 사용자가 B·C도 만들어보고 A와 장면이 실제로
  다양하게 나오는지 비교할 차례.
- 2026-09-14(계속): 사용자가 시안 B 실제 생성 결과 공유. 헤드라인·하이라이트("안 막힘"에만
  노란색)는 통과, "BOAT" 화면 유도도 성공적이었으나, **태블릿 화면에 발음 기호 "[bout]"가
  그대로 적혀 있어서 정답을 100% 유추 가능**해진 문제 발견(사용자 지적: "인지적 틈새(Curiosity
  Gap)가 사라집니다" — 빨간 사선/X 표시만으로 충분한데 발음 기호까지 친절하게 적힌 게 과함).
  **이건 지금까지 헤드라인 텍스트에만 적용해온 "정답 노출 금지" 원칙이 배경 장면 속 소품
  디테일에는 안 걸려 있었다는 뜻** — BACKGROUND & SCENE 지시문에 "장면 속 어떤 디테일도 발음
  기호·설명 텍스트로 정답을 스스로 알려주면 안 된다(틀렸다는 표시(X·빨간 사선)까지만 허용)"는
  조항을 A·B·C 세 곳 모두에 추가. 시안 B는 아직 재생성 전.
- 2026-09-14(계속): 시안 B 재생성 결과 — 텍스트·소재 문제는 해결됐지만, 인물이 녹색 체크마크
  뜬 스마트폰을 들고 어두운 배경+네온 포인트 조명으로 나와서 "전형적인 디지털 콘셉트"가 됨.
  사용자 지적: "이 차가운 테크 조명은 방금 검증한 '50대 만학도의 따뜻한 아날로그 공부 책상'
  감성과 정면 충돌한다" — 원인은 BACKGROUND & SCENE의 "Cyber-HUD를 기본 참고 무드로" 문구가
  여전히 남아 있어서, 소재(디지털 기기)만 바뀌었을 뿐 조명·색감은 습관적으로 차가운 톤으로
  회귀한 것. **결정(사용자: "일단 1번만 진행하자" — 이 프롬프트 3개만 좁게 수정, 채널 전체
  시각 정체성(`brand-persona.md` 4절) 재검토는 별도 보류)**: "Cyber-HUD를 기본값으로" 문구를
  A·B·C 세 곳 모두에서 완전히 삭제 — 참고 무드조차 안 남기고, "이 헤드라인·장면의 감정에 맞는
  무드를 직접 판단하라, 특정 색감을 기본으로 깔지 말 것"으로 교체. 시안 A·C엔 원래도 잘 맞았던
  방향(따뜻함/에너지)을 예시로 덧붙였고, 시안 B엔 "차가운 블루 테크 조명은 이 채널의 동반자
  페르소나와 안 맞는다"를 명시적으로 못박음. 세 시안 다 재생성 전 — 다음에 만들어보고 A·B·C
  모두 실제로 차가운 톤 없이 나오는지 확인할 차례.
