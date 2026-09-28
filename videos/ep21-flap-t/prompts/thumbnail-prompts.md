# EP21 (Flap T 발음) 썸네일 A/B/C 프롬프트 명세서

> **기획 기준**: 대시보드 A/B 시뮬레이터 CTR 정밀 분석(예상 CTR 1위 시안 반영) 및 2026-09-28 확정된 썸네일 3대 지침(텍스트 5단어 이하 제한, 2초 한눈 테스트, 호기심 격차 5대 유형) 적용.  
> **공식 아바타 레퍼런스**: `public/brand/thumbnail-presenter-reference.jpg` (남색 사운드웨이브 로고 볼캡 + 검정 티셔츠)  
> **기본 이미지 모델**: Google Gemini 3.1 Flash Image (`gemini-3.1-flash-image`) / Google AI Studio Imagen

---

## 📊 시안별 기획 개요 비교

| 구분 | A안 (모바일 클로즈업 필수) | B안 (사용자 픽 / 실패소환) | C안 (손실회피 / 정직한 경고) |
|---|---|---|---|
| **심리 유형** | **참신형 (상식 파괴)** | **변화형 (실패 소환)** | **순간형 (손실 회피)** |
| **대시보드 평가** | **A+ 등급 (CTR 9.5%~12.8%, 압도적 1위)** | **A 등급 (CTR 8.2%~10.5%)** | **A- 등급 (CTR 7.8%~10.2%)** |
| **제목 (Title)** | 사전 찾아보고 배신감 느꼈습니다, 버터 워터 속 T 발음의 충격 반전 \| 영어 소리 원리 | 평생 '워터'로 알고 살았는데... 미국인은 절대 이렇게 안 읽는 단어들 \| 영어 단어 읽는 법 | 설마 아직도 티 소리 다 내시나요? 미국인이 단어 중간 T를 흘려버리는 까닭 \| 영어 소리 원리 |
| **헤드라인 (단어수)** | **"버터? T 어디 갔어?"** (3단어) | **"철자 보고 읽다 망함"** (4단어) | **"설마 T 다 읽었나요?"** (4단어) |
| **텍스트 규격** | **3단어** (5단어 이하 룰 완벽 준수) | **4단어** (5단어 이하 룰 완벽 준수) | **4단어** (5단어 이하 룰 완벽 준수) |
| **시각적 초점** | 45% 초대형 클로즈업 + 물음표(?) 튕김 | 쩍쩍 갈라지는 입체 유리 'WA[T]ER' | 'WATER' 단어 위 네온 레드 X 경고 |
| **구도 & 표정** | 화면 우측 익스트림 클로즈업 (황당·배신감) | 화면 우측 바스트샷 (안경 내리며 경악) | 화면 우측 바스트샷 (혀 짚으며 답답한 표정) |

---

## 시안 A (대시보드 예상 CTR 1위 — 모바일 전용 클로즈업 필수 시안)

* **제목(SEO, title)**: `사전 찾아보고 배신감 느꼈습니다, 버터 워터 속 T 발음의 충격 반전 | 영어 소리 원리`
* **헤드라인(thumbnailHeadline)**: `버터? T 어디 갔어?`
* **심리 훅**: 참신형 (평생 믿었던 사전 철자의 배신감과 강렬한 호기심 격차)
* **시각 연출**: 화면 우측 45%를 꽉 채우는 호스트 아바타의 초대형 익스트림 클로즈업(머리를 짚으며 황당해하는 리얼한 표정). 좌측에는 묵직한 네오 브루탈리스트 타이포로 대형 `BU[TT]ER`가 배치되고, `TT` 자리에 큼직한 네온 옐로우 물음표(`?`)가 박혀 글자를 튕겨내는 듯한 역동적 시각 위계.

### Gemini 프롬프트 (시안 A)

```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "사전 찾아보고 배신감 느꼈습니다, 버터 워터 속 T 발음의 충격 반전 | 영어 소리 원리".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — one line, massive bold letters, 3 words only — this is the ENTIRE text content of the thumbnail: "버터? T 어디 갔어?"
- Hero identity callout — TWO small paper-note tag labels placed near the hero, each connected to the hero by a simple, bold red arrow pointing at a different point on the hero. Each tag holds one short line of dark text on a light background: "영어 기초 1도 없이 시작한 사람", "외우기 싫어하고 외워도 금방 까먹는 사람"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels.

=== BACKGROUND & SCENE ===
A high-contrast, modern dark navy educational studio atmosphere with cinematic three-point lighting. On the left side of the composition, a large bold printed word prop displaying "BU[TT]ER" is visible, where the two 'TT' letters are pushed away or replaced by an oversized glowing neon-yellow question mark ("?"), visually signifying that the 'T' sound mysteriously disappeared. Dramatic amber-gold and cyan rim lighting wraps around the edges of the text and props.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Freely vary hairstyle and facial hair. Dress them in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt, each printed with the same small colorful vertical-bar sound-wave icon exactly as shown (icon only, no text). 
Composition: 16:9 horizontal frame. An extreme close-up (tight portrait shot) filling 45% of the right frame. The hero is holding their forehead in genuine shock and bewilderment, looking intensely at the headline text on the left with wide eyes ("Where did the T go?!"). Clean separation between the hero and the typography.

Typography: clean, massive, heavy sans-serif font for maximum legibility in mobile 100px view. Heavy black stroke/drop-shadow for extreme contrast. The word "어디 갔어?" has a solid warm-yellow (#F5C518) highlight chip behind dark bold lettering.

Style: ultra-realistic, sharp focus, 85mm portrait lens character, high-end editorial studio lighting. No illustration, no 3D cartoon render, no watermark.
```

---

## 시안 B (사용자 선택안 — 과거 실패 소환 & 인지 부조화)

* **제목(SEO, title)**: `평생 '워터'로 알고 살았는데... 미국인은 절대 이렇게 안 읽는 단어들 | 영어 단어 읽는 법`
* **헤드라인(thumbnailHeadline)**: `철자 보고 읽다 망함`
* **심리 훅**: 변화형/실패소환 (문자 그대로 읽다 낭패 본 경험을 자극하는 스턴건)
* **시각 연출**: 화면 중앙-좌측에 거대한 3D 입체 유리 질감의 `WA[T]ER` 단어가 쩍쩍 금이 가며 산산조각 깨져나가는(Crack effect) 연출. 우측에는 안경을 살짝 내리며 "설마 지금까지 다 잘못 읽었나?" 깜짝 놀라 굳어버린 친근한 호스트 바스트샷.

### Gemini 프롬프트 (시안 B)

```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "평생 '워터'로 알고 살았는데... 미국인은 절대 이렇게 안 읽는 단어들 | 영어 단어 읽는 법".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — one line, massive bold letters, 4 words only — this is the ENTIRE text content of the thumbnail: "철자 보고 읽다 망함"
- Hero identity callout — TWO small paper-note tag labels placed near the hero, each connected to the hero by a simple, bold red arrow pointing at a different point on the hero: "영어 기초 1도 없이 시작한 사람", "외우기 싫어하고 외워도 금방 까먹는 사람"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels.

=== BACKGROUND & SCENE ===
A sleek, deep charcoal ambient studio backdrop with cool edge lighting. On the left side, a realistic frosted-glass typographic installation of the word "WA[T]ER" is dramatically shattering into crack fragments, visually symbolizing that reading the letter 'T' literally leads to broken pronunciation. Subtle warm spotlight accents highlight the breaking point of the letter 'T'.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features, clearly recognizable as this person. Wearing clear-frame glasses, slightly pulling them down the bridge of their nose with one hand while staring with wide, shocked eyes toward the broken text on the left. Dressed in the EXACT SAME outfit shown in the reference image — the same navy baseball cap and black t-shirt with the colorful vertical-bar sound-wave icon.
Composition: 16:9 horizontal frame. Medium bust shot positioned on the right third of the frame. The shattering text occupies the left and center. Clear empty margin between text and hero.

Typography: extra-heavy, bold sans-serif lettering with a solid black outline. The word "망함" is highlighted with a striking warm-yellow (#F5C518) background chip with dark black text for instant 0.1-second eye attraction.

Style: ultra-realistic photographic capture, 50mm lens, tack-sharp focus, cinematic depth of field. No stock photo clichés, no cartoonish effects.
```

---

## 시안 C (손실회피 & 정직한 경고형)

* **제목(SEO, title)**: `설마 아직도 티 소리 다 내시나요? 미국인이 단어 중간 T를 흘려버리는 까닭 | 영어 소리 원리`
* **헤드라인(thumbnailHeadline)**: `설마 T 다 읽었나요?`
* **심리 훅**: 순간형/손실회피 (굳어버린 혀의 물리적 고통을 직격하여 공감 형성)
* **시각 연출**: 화면 좌측에 `WATER` 및 `BUTTER` 단어 카드가 놓여 있고, 중간 `T` 글자 위에 굵고 강렬한 네온 레드 경고 X 표시가 그어짐. 우측에는 턱이나 목을 짚으며 굳은 혀의 답답함을 표현하는 호스트 아바타의 진지한 시선.

### Gemini 프롬프트 (시안 C)

```text
A high-CTR, photorealistic YouTube thumbnail for Korean English-pronunciation education channel '이해하면 쉬운영어' (target: 3060 adult learners), 16:9 horizontal, on the topic "설마 아직도 티 소리 다 내시나요? 미국인이 단어 중간 T를 흘려버리는 까닭 | 영어 소리 원리".

=== TEXT CONTENT (render each quoted string below exactly character-for-character — do not substitute, merge, reorder, or invent a single character) ===
- Headline — one line, massive bold letters, 4 words only — this is the ENTIRE text content of the thumbnail: "설마 T 다 읽었나요?"
- Hero identity callout — TWO small paper-note tag labels placed near the hero, each connected to the hero by a simple, bold red arrow pointing at a different point on the hero: "영어 기초 1도 없이 시작한 사람", "외우기 싫어하고 외워도 금방 까먹는 사람"
Do not render any text other than the strings quoted above — no badge, no bottom caption, no channel name, no logo, no watermark, no UI mockup text, no extra labels.

=== BACKGROUND & SCENE ===
A dark slate-grey modern acoustic studio setting with warm amber rim lighting. On the left, clean graphic flashcards displaying "WATER" and "BUTTER" are set against a dark surface. A vibrant, glowing crimson-red "X" mark boldly strikes through the letter 'T' in both words, visually declaring that pronouncing the hard 'T' is the wrong path.

Hero: the exact same person's face shown in the attached reference image — same facial identity and features. The hero has a hand resting against their jaw/neck, showing a relatable, serious expression of stiff discomfort as if realizing why their tongue was always locking up. Wearing the EXACT SAME outfit — navy baseball cap and black t-shirt with sound-wave icon.
Composition: 16:9 horizontal frame. Asymmetrical rule-of-thirds layout with the hero on the right and the crossed-out cards on the left.

Typography: ultra-bold neo-brutalist sans-serif font. High contrast white letters with thick dark outlines. The phrase "다 읽었나요?" is set inside a solid warm-yellow (#F5C518) highlight chip.

Style: ultra-realistic photography, cinematic side lighting, 85mm portrait look, crisp textures. No cartoon or 3D graphics.
```
