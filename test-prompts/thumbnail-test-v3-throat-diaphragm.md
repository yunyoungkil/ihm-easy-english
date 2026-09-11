# 썸네일 테스트 3 — "목구멍 소리·복식호흡" 소재로 직접 문구·프롬프트 작성

사용자가 새 소재를 던지고 "너라면 어떻게 쓸 것 같아, API로 하지 말고 직접 써봐"라고 요청해서,
CTR 진단 API를 호출하지 않고 지금까지 이 세션에서 확정한 규칙을 전부 수동으로 적용해 직접 쓴
문구·프롬프트다. 이미지는 아직 생성하지 않았다 — 문구·프롬프트만 먼저 보여주고, 사용자가
"만들어줘"라고 하면 그때 실제 생성한다.

## 📌 입력받은 소재

- **주제**: 영어 소리가 낮고 굵게 들리는 이유 — 목구멍 소리와 복식호흡 원리
- **타깃**: 입술 모양만 따라 연습하다 목이 아프고 소리가 붕 떠서 고민인 노베이스 독학자

## 🇰🇷 어떻게 썼는지 — 규칙 적용 과정

| 규칙 | 적용 |
|---|---|
| register 원칙(제목=서술, 헤드라인=명령/단정) | title은 "~독학자라면 꼭 보세요" 서술문, headline은 "굵어집니다" 단정문 |
| 주제 명시 + 해법만 궁금증 | headline·title 모두 "목소리"/"소리 낮고 굵게"를 직접 노출, 숨긴 건 "왜 입술이 아닌지"뿐 |
| 궁금증만 말고 약속도 적기 | headline이 질문형으로 긴장을 만들고, copy가 "오늘부터 목 안 아프고 소리만 굵어집니다"로 약속을 확정 — 새로 추가한 ⑥ 약속/결과 확정형 공식을 headline·copy 페어링으로 씀 |
| 글자 수 제한 완화 | headline 두 줄을 억지로 3~8자로 안 끊고 자연스러운 절 단위로 나눔 |
| 정답/메커니즘 노출 금지 | "배(복식호흡)"라는 영역은 소재 자체에 이미 있는 정보라 노출 가능하지만, **정확히 어떻게** 배로 소리를 내는지(구체적 방법)는 전혀 말하지 않음 |
| 근거 없는 권위·과장 금지 | 뱃지에 "처방전" 같은 의학적 권위 문구 대신 "스위치"라는 담백한 비유만 사용 |
| 타깃 페인포인트 반영 | 타깃이 언급한 "목이 아프다"를 copy에 직접 해결책으로 명시 |

## ✍️ 확정 문구

| 필드 | 내용 |
|---|---|
| **title** | 소리가 낮고 굵게 안 나오는 진짜 이유, 입술 연습에 목만 아팠던 독학자라면 꼭 보세요 |
| **thumbnailHeadline** | 목소리 안 굵어지는 이유\n입술이 아니었습니다 |
| **thumbnailCopy** | 오늘부터 목 안 아프고 소리만 굵어집니다 |
| **badge** | 🫁 복식호흡 스위치 |

title은 "왜 안 되는지"를 궁금하게 던지는 서술문, headline은 그 궁금증을 명령/단정 톤으로 한 번
더 압축("입술이 아니었습니다" — 무엇이 답인지는 여전히 안 밝힘), copy는 타깃이 겪는 실제 고통
(목 아픔)을 짚어 "그게 오늘부터 없어진다"는 구체적 약속으로 마무리한다.

## 영문 프롬프트 원문

```
A high-CTR YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "영어 소리가 낮고 굵게 들리는 이유: 목구멍 소리와 복식호흡 원리" — for viewers who only practiced mouth/lip shapes, ended up with a sore throat, and whose voice still sounds thin and floaty.

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Badge — ONE small glowing neon pill-shaped label, appears exactly once, centered on itself, single line: "🫁 복식호흡 스위치"
- Headline — massive bold letters, exactly two lines as written (keep this line break, do not merge into one line or reflow differently):
  Line 1: "목소리 안 굵어지는 이유"
  Line 2: "입술이 아니었습니다"
- Supporting caption near the bottom, single line: "오늘부터 목 안 아프고 소리만 굵어집니다"
Do not render any text other than the strings quoted above — no channel name, no logo, no watermark, no UI mockup text, no extra labels, no duplicated copies of any string.

=== CREATIVE DIRECTION (you decide — no fixed template) ===
Mood: quiet physical relief and grounded confidence — the moment someone finally feels a low, warm resonance in their own chest/throat instead of a thin, strained voice. Not shock, not hype — a calm "oh, THAT'S what it's supposed to feel like" realization.

You are the art director for this specific thumbnail. Based on the headline's two-line length, the mood above, and what will read most powerfully at small mobile size, freely decide and commit to:
- The hero's exact position in the frame (left/right/center/top/bottom — whichever makes THIS two-line headline easiest to read and gives the composition the strongest single focal point).
- The camera distance and framing (tight close-up / medium shot / waist-up — whichever best sells a grounded, physical, "feeling it in the body" moment as opposed to a shock reaction).
- The background setting, color palette, and lighting style (you may use a dark cinematic studio with colored rim lighting, or any other setting/palette that fits a modern, premium Korean tech-education YouTube channel — avoid literal hex color codes in your own reasoning, think and describe in real-world lighting terms, e.g. "a single warm low amber key light from below camera-left, suggesting resonance rising from the chest").
- The camera angle and lens character (eye-level vs slightly low/high angle, shallow vs deep focus).
- Optionally, one small physical gesture that reads instantly as "this is about breath/voice from the body, not the mouth" — e.g. a hand resting on the chest or diaphragm, or a subtle visualization of a low sound wave/resonance glow originating from the torso rather than the mouth. Keep it subtle and physically plausible, not a cartoon diagram.

Before finalizing, briefly commit (in your own internal reasoning, not rendered as text) to one clear choice for each of the four points above (position, distance, background/lighting, angle/lens), so the whole image reads as one deliberate, cohesive photographic decision rather than a generic default composition. The hero's expression and body language should reflect quiet, grounded confidence — e.g. eyes closed or softly focused, a relaxed exhale, a slight settled smile — not wide-eyed shock and not an exaggerated open-mouth shout.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary their hairstyle and facial hair from what is shown in the reference image — only the face must match. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text on the cap or shirt) — this is the channel's fixed signature uniform, do not substitute a different outfit, different colors, or a different logo. Cut them out along an irregular torn-paper silhouette following their head and shoulders, with a slightly rough paper-fiber edge texture (not a smooth sticker outline), OR let them bleed directly to the frame edge with a soft dark vignette and no visible border — pick whichever suits your chosen composition better.

Composition: this is a 16:9 horizontal frame. Arrange the hero, badge, headline, and caption using your own chosen layout from above. Treat the hero photo and every text block as separate, non-intersecting regions with a visible gap of empty background between them, the way a clean infographic keeps its photo and its text in distinct zones — never let the hero's head, hair, or shoulders cross in front of or behind any letter. Before finalizing, check every line of text and confirm no part of it is covered, thinned, or interrupted by the hero photo; if it would be, shrink or move the hero instead of the text.

Typography: use a clean, bold, heavy sans-serif font throughout for maximum legibility, rendered as sharp, stylized, infographic-quality text (not painterly or hand-lettered), with a heavy black outline for contrast. Within the headline, pick the single most important 2-4 character phrase — the core hook — and render just those characters with a solid warm-yellow (#F5C518) background chip directly behind the letters (dark navy or black lettering on the yellow chip, not yellow lettering); every other character in the headline stays plain white with the black outline. This highlighted-phrase chip must appear exactly once somewhere across the two headline lines — do not apply it to more than one phrase.

CRITICAL TEXT ACCURACY: every string in the TEXT CONTENT section must be spelled out exactly, letter by letter, with correct Korean characters — do not invent, substitute, or garble any character. If unsure how to render a word clearly, make it larger and simpler rather than risk misspelling it.

Style: clean, professional, high-contrast studio photography blended with bold graphic design elements. No watermark, no fake phone or browser UI, no stock-photo text, no crude cartoon doodles — the human subject must look like a real photograph, not an illustration.
```

**레퍼런스 이미지**: `public/brand/thumbnail-presenter-reference.jpg`를 같이 첨부.

## 저장 위치

이 md 자체가 `test-prompts/`(저장소 루트)에 있다 — 특정 에피소드 제작용이 아니라 "새 규칙들이
실전 소재에도 잘 먹히는지" 확인하는 도구 테스트이기 때문(`google-ai-studio-prompting.md` §4 예외
규정). 실제로 이 소재로 영상을 만들기로 확정되면, 그때 `videos/<프로젝트>/assets/images/`로
다시 정리해서 옮긴다.

## 시도 기록

- 2026-09-11: 최초 작성. 아직 이미지 생성 전 — 문구·프롬프트만 먼저 제시하고 사용자 승인/피드백
  대기 중. v1/v2에서 검증된 "위치·거리·배경 자유 판단" 구조를 그대로 유지하고, 이번엔 "손이
  가슴에 얹혀 있는 제스처"처럼 소재(복식호흡)에 맞는 새로운 자유 판단 축(제스처)을 하나 추가로
  열어봄 — 이것도 하드코딩하지 않고 AI가 원하면 쓰고 아니면 생략하도록 "optionally"로 열어둠.
