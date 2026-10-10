# EP28 핵심 시각 미디어 생성 프롬프트 (Visual Prompts)

- **에피소드 ID**: `ep28-f-vs-p`
- **주제**: F vs P 0.1초 조음 물리법칙 (윗니 0% 파열 vs 윗니 100% 마찰) 24쌍 반복 청취 드릴
- **선택된 비주얼 스타일**: **[옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)**
  - 차분한 웜크림(`#F7F4EE`) 배경, 선명한 하드 섀도우, 볼드 블랙 외곽선, 코랄 레드([f]) & 스카이 블루([p]) 테마 컬러.
- **하이퍼프레임 필터링 원칙**: 텍스트 카드, 알약 뱃지, 점등 인디케이터, 퀴즈 박스, 요약표 등 코드로 구현 가능한 모든 그래픽은 프롬프트 생성에서 제외하고, **코드로 구현 불가능한 핵심 실물 컷아웃 및 조음 단면도, 배경 앰비언스 에셋**만 엄선하여 작성함.

---

## 1. Frame 01 (도입부 훅) — Coffee vs Copy 컷아웃 일러스트 (`f01_coffee_vs_copy.png`)

- **용도**: F01 도입부 카드에서 "한글로는 둘 다 '피'로 배웠지만 소리는 완전히 다른 Coffee와 Copy"를 직관적으로 대조하는 네오브루탈리즘 페이퍼 컷아웃 오브젝트.
- **비율**: 16:9 와이드 가로형 (중앙 피사체 배치, 투명 누끼 또는 단색 웜크림 배경).
- **도구**: Imagen 3 / Gemini / Midjourney.

```text
A neo-brutalist paper-cutout style educational infographic illustration of a takeaway hot coffee cup juxtaposed with a stack of printed office paper documents (copy paper), 16:9 widescreen layout. On the left side, an artisan paper coffee cup with a kraft sleeve and a subtle swirl of steam. On the right side, a neat stack of crisp white office copy paper with a bold cyan clipboard and printed text lines. Both objects have thick crisp black ink outlines, warm flat colors, and subtle hard paper-drop shadows. The background is a clean, seamless solid warm cream (#F7F4EE). Tactile paper-craft collage aesthetic, high contrast, zero digital gradient, ultra-clean edges. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays.
```

### [Image-to-Video 5초 햅틱 스톱모션 프롬프트]
*도구: Runway Gen-3 / Luma Dream Machine / Kling / Sora*

```text
Locked static camera shot, 16:9 widescreen, no camera zoom or pan. 
0.0 to 3.5 sec: Tactile paper collage assembly. A warm cream background settles, then the coffee cup cutout slides in from the left with a subtle paper-friction sound, followed by the copy document cutout snapping into the right side with crisp layer shadows. 
3.5 to 5.0 sec: Living poster state. The finished paper composition stays locked firmly in place with only micro-vibrations of paper edge texture and gentle rising steam. No morphing, no distortion. Ultra-clean edges, no watermark.
```

---

## 2. Frame 02 (조음 물리법칙) — F vs P 구강 조음 단면 비교도 (`f02_articulation_f_vs_p.png`)

- **용도**: F02 원리 설명 프레임에 좌우 대조(Split View)로 배치되는 직관적 조음 단면 인포그래픽 일러스트.
- **비율**: 16:9 가로형 (좌측 F 마찰음 / 우측 P 파열음 대칭 배치).
- **도구**: Imagen 3 / Midjourney.

```text
A clean medical-educational infographic profile cross-section comparing human mouth, lip, and teeth positions for English /f/ and /p/ consonant sounds side by side, 16:9 widescreen format, neo-brutalist graphic style on a solid warm cream (#F7F4EE) background.

=== LEFT PANEL: /f/ SOUND (Labiodental Fricative — 100% Upper Teeth Contact) ===
Profile anatomical view of mouth and lips. The upper front teeth make gentle contact with the inner moist tissue of the lower lip. The mouth is slightly open, showing smooth airflow arrows escaping between the upper teeth and lower lip in vibrant coral red (#EF4444). 
Visual indicator: A glowing coral red badge pointing to the teeth-lip contact area indicating '100% UPPER TEETH CONTACT'.

=== RIGHT PANEL: /p/ SOUND (Bilabial Plosive — 0% Upper Teeth Contact) ===
Profile anatomical view. Both upper and lower lips are pressed firmly together, completely closing the oral cavity, while upper teeth have ZERO contact with the lip. An explosive popping air burst symbol radiates forward in sky blue (#3B82F6). 
Visual indicator: A bold sky blue badge indicating '0% UPPER TEETH / 100% TWO LIPS CLOSURE'.

=== AESTHETIC & STYLE ===
Clear 2D vector infographic styling, crisp black linework (#111111), high legibility, flat colors, zero clutter, no glossy CGI, no watermark, no AI logos, clean edges.
```

---

## 3. Frame 07 (실전 대화) — 따뜻한 카페 & 일상 앰비언스 루프 비디오 (`f07_cafe_ambience.mp4`)

- **용도**: F07 실전 대화 7문장 프레임에서 대화 카드 뒤에 은은하게 깔리는 고급스러운 루프 배경 비디오.
- **형식**: 1080p, 무음, 5~10초 완벽 루프(Seamless Looping).
- **도구**: Sora / Runway Gen-3 / Pika / Kling.

```text
A cozy, cinematic, high-end daylight coffee shop corner. Soft sunlight streaming through a large glass window casting gentle warm shadows on a wooden oak table. A ceramic coffee mug sits quietly with faint, slow-rising steam. In the soft-focus background, clean minimalist cafe interior with books and warm cream walls. Static camera, locked-off shot, very subtle peaceful ambient motion of dust motes in warm sun rays. Calming, focused aesthetic designed as an unobtrusive video background for educational text overlays. Warm cream and amber color grading. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges. 1080p 30fps.
```

- **에셋 반입 및 검수 기준**: 모서리 4방(우측 하단/상단)에 플랫폼 로고나 스파클 아이콘이 찍힌 경우, ffmpeg `crop=1696:954:0:0,scale=1920:1080:flags=lanczos`로 무손실 크롭/스케일 후처리하여 0.1픽셀도 워터마크가 없는 클린 에셋으로 반입 필수.
