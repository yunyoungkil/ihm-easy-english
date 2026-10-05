# 🎨 VISUAL & ANIMATION PROMPTS — ep23-double-consonant
## [30분 듣기] 같은 자음 두 개는 한 번만 소리 난다

> **⚠️ HyperFrames 구현 가능 여부 필터링 골든 룰 (2026-10-05 적용)**:
> - **원칙**: **하이퍼프레임(HTML/CSS/GSAP/SVG)으로 구현이 어려운 영상 및 이미지만 제작한다.**
> - **제외 대상 (HyperFrames 코딩 직행)**: 텍스트 카드, 단어 블록, 테두리, 그림자, 알약 뱃지(`DOUBLE LETTER`, `ONE SOUND`), 비교 그리드, SVG 화살표, 퀴즈 박스, 치트시트 표. (AI 이미지로 생성하지 않고 코드로 100% 무결점 구현)
> - **선별 대상 (AI 이미지·영상 제작)**: HTML/CSS로 구현이 불가능한 **인체 해부학적 구강 조음 단면도** 및 **실제 공간·사물 컷아웃(카페 장면/커피잔 5초 스톱모션 영상)** 2종으로 최소화 집중.
> - **확정 스타일**: **[옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)**

---

## 📊 자산별 구현 방식 분류표

| 대상 | 내용 | 구현 방식 | 비고 |
|---|---|:---:|---|
| **F01 단어 카드** | `COFFEE` 카드, 레드 'FF' 테두리 박스, 골드 알약 뱃지 | 💻 **HyperFrames 코드** | HTML/CSS/GSAP로 100% 타이포 칼싱크 구현 |
| **F02 조음 단면도** | 입술과 혀가 공기를 한 번 막았다 여는 구강 조음 단면도 | 🎨 **AI 이미지 제작 (Asset 1)** | HTML/CSS로 구현 불가능한 유기적 인체 그래픽 |
| **F02 단어 비교** | `hoping` vs `hopping` 좌우 카드 비교 다이어그램 | 💻 **HyperFrames 코드** | 2열 CSS 그리드 및 GSAP 슬라이드로 구현 |
| **F03~F06 단어 드릴** | ff, ll, ss, pp 26개 단어 반복 재생 카드 및 워드 트래킹 | 💻 **HyperFrames 코드** | Whisper 연동 실시간 글자 점등 하이라이트 |
| **F07 단어 경계 결합** | `un-`과 `-named` 두 카드가 중앙에서 맞물리는 모션 | 💻 **HyperFrames 코드** | GSAP 충돌 트윈으로 100% 칼싱크 구현 |
| **F08 Flap T 알약 뱃지**| `BETTER` 카드 위 'ㄹ' 사운드 웨이브 알약 캡슐 | 💻 **HyperFrames 코드** | CSS 알약 컴포넌트로 완벽 구현 |
| **F09 카페 실전 대화** | 따뜻한 뉴욕 카페 카운터, 테이크아웃 커피잔 2개, 영수증 | 🎬 **AI 이미지 & 5초 영상 (Asset 2)** | 사실적인 공간감과 사물 컷아웃 스톱모션 영상 |
| **F10 셔플 복습** | 무작위로 재배열되는 단어 카드 덱 | 💻 **HyperFrames 코드** | HTML/CSS 코드 재사용 |
| **F11 치트시트 보드** | 4대 패턴 그리드 및 `ONE SOUND` 마스터 뱃지 | 💻 **HyperFrames 코드** | HTML/CSS 4분할 네오브루탈리즘 보드 구현 |
| **F12 앵콜 복습** | 전체 반복 듣기 타임라인 | 💻 **HyperFrames 코드** | 기존 프레임 코드 루프 재생 |

---

## 🎬 엄선된 AI 제작 자산 프롬프트 (총 2종)

---

### Asset 1. 구강 조음 단면도 (F02 핵심 원리 프레임)
* **배치 프레임**: Frame 2 (핵심 원리 설명)
* **역할**: "자음은 입술이나 혀가 공기를 한 번 막았다가 여는 소리"를 시각적으로 단번에 납득시키는 구강 조음 기관 단면 일러스트 (HTML/CSS 구현 불가).
* **스타일**: 웜크림 캔버스(`#F4EFE6`)와 완벽히 융합되는 네오브루탈리즘 클린 인포그래픽.

#### [1] IMAGE PROMPT
```text
Clean anatomical cross-section diagram of the human vocal tract and articulation organs, in a modern neo-brutalist infographic style on a warm cream background (#F4EFE6). A crisp profile silhouette of a human head from lips to throat, illustrated with thick 2.5px solid black outlines and flat minimal shading. The internal articulation organs are clearly delineated with high-contrast flat color blocks: clean off-white teeth, smooth pinkish-beige tongue resting slightly arched against the alveolar ridge, crisp palate, and open airway with a single directional black airflow arrow pointing outward through the lips. A small minimalist pill badge with a marigold-gold outline and black text points to the contact point labeled 'AIR BLOCK'. Clean vector-style linework, razor-sharp edges, solid black offset drop shadow behind the main silhouette card, generous negative space, and studio documentary lighting. Everything must look like an ultra-premium educational textbook diagram designed for high-contrast mobile legibility. No 3D glossy textures, no realistic fleshy gore, no gradients, no cartoon faces, no watermark. Premium neo-brutalist phonetic anatomy aesthetic, 16:9, ultra-detailed, 8K.
```

---

### Asset 2. 빈티지 카페 카운터 & 커피잔 (F09 실전 대화 프레임)
* **배치 프레임**: Frame 9 (실전 카페 회화 7문장)
* **역할**: "Two coffees, please." 실제 일상 회화가 이루어지는 따뜻한 카페 분위기와 사물(커피잔, 영수증)의 공간감을 부여하는 일러스트 및 5초 스톱모션 배경 영상 (HTML/CSS 구현 불가).
* **스타일**: 웜크림 네오브루탈리즘 감성의 그래픽 컷아웃 씬.

#### [1] IMAGE PROMPT
```text
Clean premium neo-brutalist graphic illustration of a cozy espresso bar counter on a warm cream background (#F4EFE6). In the center of a rich textured wood-grain paper counter sit two minimalist graphic takeout coffee cups with kraft paper sleeves, designed with crisp 2.5px solid black outlines and clean flat fills. To the right lies a realistic torn vintage paper receipt with clean typewriter print '2 COFFEES - $8.00' and a subtle crimson-red rubber stamp mark reading 'PAID'. Flat vector aesthetic, razor-sharp black borders, soft tactile paper drop shadows, warm amber and cream color palette, and balanced negative space. No text across the upper half of the image (reserved for video subtitles). No glossy CGI, no 3D chrome, no blurry gradients, no cartoon figures, no watermark. Premium neo-brutalist lifestyle editorial graphic, 16:9, ultra-detailed, 8K.
```

#### [2] ANIMATION PROMPT (Image-to-Video, 5초 스톱모션)
```text
Turn the supplied image into a 5-second handcrafted neo-brutalist motion graphic animation. Treat the supplied image as the final composition and preserve its design, cup placement, receipt, borders, shadows, and color scheme exactly. Do not redesign, resize, or reinterpret any element.

VISUAL LANGUAGE: Tactile neo-brutalist paper motion, solid 2.5px black outlines, crisp offset shadow landings, and snappy cardstock physics.

CAMERA: 100% locked static shot for all 5 seconds. Zero camera movement, zoom, pan, or tilt.

0-3.5 SECONDS - ASSEMBLY:
Start with the warm cream and wood-grain paper counter surface (#F4EFE6).
At 0.6s, the first coffee cup drops down from above and lands with a firm black shadow impact.
At 1.2s, the second coffee cup slides down beside it with a snappy tactile tap.
At 2.0s, the paper receipt glides in from the right edge with a light paper flutter.
At 2.7s, the crimson 'PAID' stamp impacts onto the receipt with a crisp mechanical punch.
At 3.5 seconds, the entire frame matches the supplied image exactly.

3.5-5.0 SECONDS - LIVING POSTER:
Hold the completed cafe counter layout completely steady as a living poster. Solid black shadows and razor-sharp outlines remain still with microscopic tactile presence. No elements drift or morph.

AUDIO: No music or narration. Two distinct card taps for the coffee cups, subtle paper sliding for the receipt, a solid rubber stamp thud, and quiet room ambience.
```

---

## 🚀 FLOW / MIDJOURNEY 일괄 생성용 순수 텍스트 묶음

> 아래 텍스트는 골든 룰에 따라 엄선된 2개 이미지의 프롬프트만 모아둔 블록입니다.

```text
Image 1 (F02 - Vocal Tract Anatomy Diagram)
Clean anatomical cross-section diagram of the human vocal tract and articulation organs, in a modern neo-brutalist infographic style on a warm cream background (#F4EFE6). A crisp profile silhouette of a human head from lips to throat, illustrated with thick 2.5px solid black outlines and flat minimal shading. The internal articulation organs are clearly delineated with high-contrast flat color blocks: clean off-white teeth, smooth pinkish-beige tongue resting slightly arched against the alveolar ridge, crisp palate, and open airway with a single directional black airflow arrow pointing outward through the lips. A small minimalist pill badge with a marigold-gold outline and black text points to the contact point labeled 'AIR BLOCK'. Clean vector-style linework, razor-sharp edges, solid black offset drop shadow behind the main silhouette card, generous negative space, and studio documentary lighting. Everything must look like an ultra-premium educational textbook diagram designed for high-contrast mobile legibility. No 3D glossy textures, no realistic fleshy gore, no gradients, no cartoon faces, no watermark. Premium neo-brutalist phonetic anatomy aesthetic, 16:9, ultra-detailed, 8K.

Image 2 (F09 - Cozy Cafe Counter & Coffee Cups)
Clean premium neo-brutalist graphic illustration of a cozy espresso bar counter on a warm cream background (#F4EFE6). In the center of a rich textured wood-grain paper counter sit two minimalist graphic takeout coffee cups with kraft paper sleeves, designed with crisp 2.5px solid black outlines and clean flat fills. To the right lies a realistic torn vintage paper receipt with clean typewriter print '2 COFFEES - $8.00' and a subtle crimson-red rubber stamp mark reading 'PAID'. Flat vector aesthetic, razor-sharp black borders, soft tactile paper drop shadows, warm amber and cream color palette, and balanced negative space. No text across the upper half of the image (reserved for video subtitles). No glossy CGI, no 3D chrome, no blurry gradients, no cartoon figures, no watermark. Premium neo-brutalist lifestyle editorial graphic, 16:9, ultra-detailed, 8K.
```
