# 썸네일 프롬프트 시스템 — ep29-b-vs-v

이 문서는 유튜브 A/B 테스트(Test & Compare) 및 모바일 피드 시인성 극대화를 위한 **4종 썸네일 프롬프트 세트**입니다.
채널 공식 발표자 캐릭터(`public/brand/thumbnail-presenter-reference.jpg`)의 브랜드 아이덴티티(파란 사운드웨이브 볼캡 + 검정 로고 티셔츠)를 100% 일치시켜 제작합니다.

---

## 1. 썸네일 카피 및 규격 원칙

- **공식 아바타 레퍼런스**: `public/brand/thumbnail-presenter-reference.jpg` (동일 인물, 남색 사운드웨이브 자수 볼캡 + 검정 티셔츠).
- **단어 수 제한**: 헤드라인 + 골드 알약 카피 합쳐서 **5단어 이하** 엄격 준수.
- **카테고리 칩**: 좌측 상단 `[반복 듣기]` (2단어 이하, 다크 네이비 알약).
- **시각 스타일**: 웜크림(`#F7F4EE`) 단색 배경 + 볼드 고딕 앵커 텍스트 + 골드 알약(`#F5C518`) + 공식 발표자 표정 중심.
- **Zero Watermark**: 워터마크, AI 로고, 스파클 일체 배제.

---

## 2. 4종 프롬프트 세트

### [시안 A: 직격 상식파괴형] — "다 'ㅂ'으로 읽으셨죠?" (thumbnail-variant-a.jpg)
- **카피 구성 (총 4단어)**:
  - 카테고리 칩: `[반복 듣기]`
  - 메인 앵커: `B vs V`
  - 골드 알약: `다 'ㅂ'으로 읽으셨죠?`
- **프롬프트**:
```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "B vs V 발음 구별 원리".

=== TEXT CONTENT (render each quoted string below exactly character-for-character) ===
- Category Pill (top-left): "[반복 듣기]" in a compact dark navy pill with white text.
- Anchor line: "B vs V" — massive, on its own line, crisp white flat lettering with heavy black outline.
- Pill phrase: "다 'ㅂ'으로 읽으셨죠?" — rendered entirely inside one solid warm-yellow (#F5C518) rounded pill shape with bold black lettering and black outline.
Do not render any extra text, no channel name, no logo watermark.

=== BACKGROUND ===
Plain, evenly and softly lit seamless single warm cream/beige backdrop (#F7F4EE) across the ENTIRE frame. No chalkboard, no desk, no room interior, no decorative items.

=== HERO ===
The exact same Korean male presenter shown in reference image (public/brand/thumbnail-presenter-reference.jpg) — same facial identity and features. Dressed in the EXACT SAME signature uniform: navy baseball cap and black t-shirt, each printed with the colorful vertical-bar sound-wave icon.
Hero sits to the right side at a medium-close waist-up distance. The hero is holding one hand open with a surprised, questioning "정말 다 'ㅂ'인 줄 아셨죠?" expression, looking directly at the viewer with an enlightened, friendly smile. Empty negative space separates hero and text.

=== TYPOGRAPHY & NEGATIVE ===
Bold heavy sans-serif font with sharp infographic clarity.
NEGATIVE: Do NOT put the anchor line inside a colored box. Do NOT add neon glow, 3D metallic extrusion, sparkles, drop shadows, or circuit lines. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

### [시안 B: 물리법칙 직격형] — "터뜨리기 vs 물기" (thumbnail-variant-b.jpg)
- **카피 구성 (총 4단어)**:
  - 카테고리 칩: `[반복 듣기]`
  - 메인 앵커: `B vs V`
  - 골드 알약: `터뜨리기 vs 물기`
- **프롬프트**:
```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "B vs V 발음 구별 원리".

=== TEXT CONTENT (render each quoted string below exactly character-for-character) ===
- Category Pill (top-left): "[반복 듣기]" in a compact dark navy pill with white text.
- Anchor line: "B vs V" — massive, on its own line, crisp white flat lettering with heavy black outline.
- Pill phrase: "터뜨리기 vs 물기" — rendered entirely inside one solid warm-yellow (#F5C518) rounded pill shape with bold black lettering and black outline.
Do not render any extra text, no channel name, no logo watermark.

=== BACKGROUND ===
Plain, evenly and softly lit seamless single warm cream/beige backdrop (#F7F4EE) across the ENTIRE frame. No clutter.

=== HERO ===
The exact same Korean male presenter shown in reference image (public/brand/thumbnail-presenter-reference.jpg) — same facial identity and features. Dressed in the EXACT SAME signature uniform: navy baseball cap and black t-shirt, each printed with the colorful vertical-bar sound-wave icon.
Hero sits to the right side at a medium-close waist-up distance. The hero holds up two fingers to compare two clear concepts with a confident knowing smile, looking directly at the viewer.

=== TYPOGRAPHY & NEGATIVE ===
Bold heavy sans-serif font with sharp infographic clarity.
NEGATIVE: No neon, no 3D text, no props, no watermark, no AI logos, no Gemini logo or sparkle icons, ultra-clean edges.
```

---

### [시안 C: 0.1초 소리 원리형 (와이드 메인)] — "윗니 0% vs 100%" (thumbnail.jpg)
- **카피 구성 (총 5단어)**:
  - 카테고리 칩: `[반복 듣기]`
  - 메인 앵커: `B vs V`
  - 골드 알약: `윗니 0% vs 100%`
- **프롬프트**:
```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "B vs V 발음 구별 원리". Wide standard variant.

=== TEXT CONTENT (render each quoted string below exactly character-for-character) ===
- Category Pill (top-left): "[반복 듣기]" in a compact dark navy pill with white text.
- Anchor line: "B vs V" — massive, on its own line, crisp white flat lettering with heavy black outline.
- Pill phrase: "윗니 0% vs 100%" — rendered entirely inside one solid warm-yellow (#F5C518) rounded pill shape with bold black lettering and black outline.
Do not render any extra text, no channel name, no logo watermark.

=== BACKGROUND ===
Plain, evenly and softly lit seamless single warm cream/beige backdrop (#F7F4EE) across the ENTIRE frame. No props.

=== HERO ===
The exact same Korean male presenter shown in reference image (public/brand/thumbnail-presenter-reference.jpg) — same facial identity and features. Dressed in the EXACT SAME signature uniform: navy baseball cap and black t-shirt, each printed with the colorful vertical-bar sound-wave icon.
Hero sits to the right side at a medium-close waist-up distance. The hero is pointing with his index finger toward his upper teeth/lip with a sharp, confident "0.1초면 바로 구별!" expression, looking directly at the viewer with an enlightened, proud smile. Empty negative space separates hero and text.

=== TYPOGRAPHY & NEGATIVE ===
Bold heavy sans-serif font with sharp infographic clarity.
NEGATIVE: No neon, no 3D effects, no watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

---

### [시안 D: 모바일 전용 극단적 클로즈업] — "윗니 0% vs 100%" (thumbnail-close-up.jpg)
- **카피 구성 (총 5단어)**:
  - 카테고리 칩: `[반복 듣기]`
  - 메인 앵커: `B vs V`
  - 골드 알약: `윗니 0% vs 100%`
- **특징**: 화면의 45%를 차지하는 상반신/얼굴 타이트 바스트 샷, 작은 모바일 피드 화면에서도 0.1초 만에 식별.
- **프롬프트**:
```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "B vs V 발음 구별 원리". Mobile extreme close-up variant.

=== TEXT CONTENT (render each quoted string below exactly character-for-character) ===
- Category Pill (top-left): "[반복 듣기]" in a compact dark navy pill with white text.
- Anchor line: "B vs V" — massive, on its own line, crisp white flat lettering with heavy black outline.
- Pill phrase: "윗니 0% vs 100%" — rendered entirely inside one solid warm-yellow (#F5C518) rounded pill shape with bold black lettering and black outline.
Do not render any extra text, no channel name, no logo watermark.

=== BACKGROUND ===
Plain seamless single warm cream/beige backdrop across the entire frame. No props, no set dressing.

=== HERO (MOBILE CLOSE-UP) ===
The exact same Korean male presenter from reference image (navy cap and black t-shirt with sound-wave icon).
Camera distance: Extreme close-up where the hero's face and upper shoulders fill 40-50% of the frame width on the right side. Sharp focus on eyes, smile, and facial expression. Hero holds an index finger right beside his mouth in a precise "비밀 법칙 발견!" gesture, readable clearly even when shrunk to 100px in a mobile feed.

=== TYPOGRAPHY & NEGATIVE ===
Bold heavy sans-serif typography with thick black borders.
NEGATIVE: No neon, no glow, no 3D chrome, no complex background patterns. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```
