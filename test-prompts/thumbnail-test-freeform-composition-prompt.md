# 썸네일 테스트 — 위치/거리/배경 하드코딩 제거 버전

기존 `buildThumbnailPrompt()`는 인물 위치(4종)·카메라 거리(3종)를 `Math.random()`으로 미리
뽑아서 프롬프트에 못 박고, 배경 문장도 A/B/C 전부 똑같은 고정 문장(16진수 색상 코드 포함)을
썼다. 2026-09-11 사용자 지적: "지시대로 고정되서 나온다는게 문제" — 실제로는 AI가 이 소재에
맞게 판단하는 게 아니라 주사위로 정한 값을 강제로 따르게 하는 것이었다. 이 프롬프트는 그
하드코딩을 전부 빼고, 위치·거리·구도·배경·조명·색조를 AI가 이 제목/헤드라인에 맞춰 직접
판단하게 한 테스트판이다(EP15 "-sion" 소재, ⚡후킹형 문구 재사용). 코드 반영 전에 먼저 이
프롬프트 하나로 실제 이미지를 뽑아서 품질을 확인하는 단계.

## 🇰🇷 한글 요약

- **문구**: 제목(검색용)="'-sion' 끝소리 규칙, 원어민들이 절대 글자 그대로 안 읽는 이유",
  헤드라인(썸네일 큰 글자)="이거 모르면 계속 막힘", 하단 캡션="단어 끝 1초의 반전",
  뱃지="⚡ 소리 비밀 반전"
- **바뀐 점**: "오른쪽에 배치해라", "클로즈업으로 찍어라", "남색 배경에 시안/마젠타 빛"처럼
  못 박지 않는다. 대신 "이 헤드라인 길이·분위기에 제일 잘 맞는 인물 위치·카메라 거리·배경
  무드·조명을 네가 직접 골라라, 그리고 왜 그렇게 골랐는지 한 줄 근거를 프롬프트 안에서
  스스로 세워라"라고만 지시한다.
- **안 바뀐 것**: 인물 얼굴·복장(채널 시그니처)은 여전히 고정, 텍스트는 여전히 정확히 그
  글자 그대로 렌더, 텍스트와 인물이 겹치면 안 되는 규칙도 그대로.
- 이 파일은 코드에 아직 반영 안 됨 — 사용자가 이 프롬프트로 직접 이미지를 생성해보고
  결과가 좋으면 `scripts/ab-simulator.mjs`의 `buildThumbnailPrompt()`에 정식 반영 예정.

## 영문 프롬프트 원문

```
A high-CTR YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "'-sion' 끝소리 규칙, 원어민들이 절대 글자 그대로 안 읽는 이유".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Badge — ONE small glowing neon pill-shaped label, appears exactly once, centered on itself, single line: "⚡ 소리 비밀 반전"
- Headline — massive bold letters, one line (wrap naturally across 2 lines only if it does not fit on one): "이거 모르면 계속 막힘"
- Supporting caption near the bottom, single line: "단어 끝 1초의 반전"
Do not render any text other than the strings quoted above — no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== CREATIVE DIRECTION (you decide — no fixed template) ===
Mood: 충격/뒤통수형 — 평생 맞다고 믿었던 콩글리시 발음을 찌르는 강렬한 시각적 충격.

You are the art director for this specific thumbnail. Based on the headline's length, the mood above, and what will read most powerfully at small mobile size, freely decide and commit to:
- The hero's exact position in the frame (left/right/center/top/bottom — whichever makes THIS headline easiest to read and gives the composition the strongest single focal point).
- The camera distance and framing (tight close-up / medium shot / waist-up — whichever best sells the emotional reaction for THIS mood).
- The background setting, color palette, and lighting style (you may use a dark cinematic studio with colored rim lighting, or any other setting/palette that fits a modern, premium Korean tech-education YouTube channel — avoid literal hex color codes in your own reasoning, think and describe in real-world lighting terms like "single hard cyan rim light from camera-left" or "soft warm key light with a cool blue fill").
- The camera angle and lens character (eye-level vs slightly low/high angle, shallow vs deep focus).

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to one clear choice for each of the four points above, so the whole image reads as one deliberate, cohesive photographic decision rather than a generic default composition.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo. Give them a genuine, expressive reaction matching the mood above, their eyes and gaze directed toward the headline text rather than straight at the camera — as if they just reacted to reading it. Cut them out along an irregular torn-paper silhouette following their head and shoulders, with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR let them bleed directly to the frame edge with a soft dark vignette and no visible border — pick whichever suits your chosen composition better.

Composition: this is a 16:9 horizontal frame. Arrange the hero, badge, headline, and caption using your own chosen layout from above. Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast. Within the headline, pick the single most important 2-4 character phrase — the core hook — and render just those characters with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other character in the headline stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere in the headline.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: clean, professional, high-contrast studio photography blended with bold graphic design elements. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles — the human subject must look like a real photograph, not an illustration.
```

**레퍼런스 이미지**: `public/brand/thumbnail-presenter-reference.jpg`를 같이 첨부해야 같은
얼굴로 나옵니다(기존 규칙과 동일).

## 저장 위치

이 프롬프트로 생성한 이미지는 확인용이므로 아직 정해진 경로 없음 — 마음에 들면 알려주시면
`videos/ep15-sion-words/thumbnail-a.jpg`(또는 새 시안)로 교체할지 결정.

## 시도 기록

- 2026-09-11: 1차 테스트판 작성. 하드코딩된 `heroPositionOptions`/`heroDistanceOptions`/고정
  배경 문장을 전부 제거하고 "네가 판단해서 커밋해라" 방식으로 교체. 아직 실제 생성 결과 확인 전.
