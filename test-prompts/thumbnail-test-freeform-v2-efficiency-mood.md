# 썸네일 테스트 2 — 다른 문구/무드로 비교

1번 테스트(충격/뒤통수형, "이거 모르면 계속 막힘")와 비교해보시라고, **완전히 다른 감정
톤**(효율/해결형)의 문구로 두 번째 테스트판을 만들었습니다. 자유 판단 지시문 구조는
1번과 동일 — 위치·거리·배경·조명·구도를 하드코딩하지 않고 AI가 직접 고르게 합니다.

## 🇰🇷 한글 요약

- **문구**: 제목="단어 끝 '-sion' 소리 원리 하나로 긴 단어 100개 단숨에 끝내기",
  헤드라인="10초면 충분", 하단 캡션="이제 안 막힌다", 뱃지="⏱️ 10초 완성"
  (2026-09-11 정정: 원래 하단 캡션이 "100단어 자동 완독"이었는데, title의 "100개"를
  다른 말로 반복하는 거라 "title과 thumbnailCopy는 절대 같은 정보를 반복하지 말 것" 규칙
  위반이었음 — thumbnailCopy 본연의 역할인 "시청 후 보상/확인" 톤으로 교체.)
- **무드**: "1초 소리 족보/비밀 공식형 — 직관적인 원리 발견의 짜릿함" (1번의 "충격/뒤통수형"과
  다름 — 침착하고 확신에 찬 해결책 제시 톤)
- 이 무드 차이가 AI의 위치·거리·배경·조명 선택에도 실제로 다르게 반영되는지 확인하는 게
  이 2번 테스트의 목적입니다(1번은 긴장감 있는 "충격" 구도를 고를 가능성이 높고, 2번은
  더 차분하고 자신감 있는 구도를 고를 가능성이 높음 — 실제로 그런 차이가 나오는지 비교).

## 영문 프롬프트 원문

```
A high-CTR YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "단어 끝 '-sion' 소리 원리 하나로 긴 단어 100개 단숨에 끝내기".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Badge — ONE small glowing neon pill-shaped label, appears exactly once, centered on itself, single line: "⏱️ 10초 완성"
- Headline — massive bold letters, one line (wrap naturally across 2 lines only if it does not fit on one): "10초면 충분"
- Supporting caption near the bottom, single line: "이제 안 막힌다"
Do not render any text other than the strings quoted above — no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== CREATIVE DIRECTION (you decide — no fixed template) ===
Mood: 1초 소리 족보/비밀 공식형 — calm, confident clarity of finally understanding a simple rule that unlocks everything; the feeling of relief and quiet excitement, not shock.

You are the art director for this specific thumbnail. Based on the headline's length, the mood above, and what will read most powerfully at small mobile size, freely decide and commit to:
- The hero's exact position in the frame (left/right/center/top/bottom — whichever makes THIS headline easiest to read and gives the composition the strongest single focal point).
- The camera distance and framing (tight close-up / medium shot / waist-up — whichever best sells the emotional reaction for THIS calm, confident mood, as opposed to a shock reaction).
- The background setting, color palette, and lighting style (you may use a dark cinematic studio with colored rim lighting, or any other setting/palette that fits a modern, premium Korean tech-education YouTube channel — avoid literal hex color codes in your own reasoning, think and describe in real-world lighting terms like "single soft cyan key light from camera-right" or "even, confident studio lighting with a warm accent").
- The camera angle and lens character (eye-level vs slightly low/high angle, shallow vs deep focus).

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to one clear choice for each of the four points above, so the whole image reads as one deliberate, cohesive photographic decision rather than a generic default composition. This mood is calm and confident, not shocked or startled — the hero's expression and body language should reflect quiet certainty, e.g. a slight knowing smile or a confident nod, not wide-eyed shock.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo. Cut them out along an irregular torn-paper silhouette following their head and shoulders, with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR let them bleed directly to the frame edge with a soft dark vignette and no visible border — pick whichever suits your chosen composition better.

Composition: this is a 16:9 horizontal frame. Arrange the hero, badge, headline, and caption using your own chosen layout from above. Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast. Within the headline, pick the single most important 2-4 character phrase — the core hook — and render just those characters with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other character in the headline stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere in the headline.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean/English characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: clean, professional, high-contrast studio photography blended with bold graphic design elements. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles — the human subject must look like a real photograph, not an illustration.
```

**레퍼런스 이미지**: `public/brand/thumbnail-presenter-reference.jpg`를 같이 첨부.

## 시도 기록

- 2026-09-11: 2차 테스트판 작성 — 1번(충격형)과 톤을 완전히 다르게(차분/확신형) 잡아서,
  AI의 자유 판단이 무드에 따라 실제로 다른 구도/배경/표정을 고르는지 비교하려는 목적.
- 2026-09-11: 사용자 지적으로 하단 캡션 수정 — "100단어 자동 완독"이 title의 "100개"를
  반복해서 "title/thumbnailCopy 중복 금지" 규칙 위반이었음. "이제 안 막힌다"(시청 후
  확인/보상 톤)로 교체.
