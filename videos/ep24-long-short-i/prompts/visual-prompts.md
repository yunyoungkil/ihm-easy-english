# EP24 영상 삽입용 시각 자산 생성 프롬프트

- **에피소드 ID**: `ep24-long-short-i`
- **시각 디자인 스타일**: **[옵션 1] 웜크림 네오브루탈리즘 (채널 시그니처 표준)**
- **골든 룰 적용**: HTML/CSS 코드로 100% 구현 가능한 텍스트 카드, 알약 뱃지, 비교 표, 셔플 덱, 4분할 치트시트는 프롬프트 생성에서 완전히 제외하고 HyperFrames 코딩으로 직행합니다. 순수 AI 생성 모델이 필요한 **핵심 미디어 자산 2종**만 작성합니다.

---

## 🎨 Asset 1 (F02) — 구강 조음 기관 비교 단면도 (이미지)

- **용도**: Frame 2 핵심 조음 원리 (입꼬리 텐션 [iː] vs 턱 이완 [ɪ]) 설명용
- **저장 예정 경로**: `videos/ep24-long-short-i/assets/images/f02_vocal_tract_comparison.jpg`
- **화면 비율**: `16:9` 가로형
- **스타일**: 웜크림 네오브루탈리즘 인포그래픽 (클린 벡터 일러스트, 웜크림 배경 `#F4EFE6`, 굵은 잉크 라인)

### Midjourney / Gemini 프롬프트

```text
A side-by-side anatomical cross-section diagram of the human vocal tract and mouth, pedagogical medical infographic style. 
On the left side: labeled "[iː] TENSE", showing lips pulled back sideways into a taut smile, high tongue position raised toward the hard palate, firm jawline. 
On the right side: labeled "[ɪ] LAX", showing a relaxed jaw slightly dropped downward, tongue lowered in a relaxed resting position, soft neutral mouth.
Flat neo-brutalist medical illustration, warm cream beige background (#F4EFE6), bold clean black contour outlines, muted gold (#F59E0B) and teal accents highlighting the tongue muscle position, sharp typography labels, minimalist, ultra-high resolution, no 3D rendering, no gradients, editorial infographic poster. --ar 16:9
```

---

## 🎬 Asset 2 (F07) — 실전 대화 앰비언스 배경 비디오 (5~8초 모션 루프)

- **용도**: Frame 7 실전 짝단어 문장 대화 (7문장) 배경 영상
- **저장 예정 경로**: `videos/ep24-long-short-i/assets/videos/f07_dialogue_ambience.mp4`
- **화면 비율**: `16:9` (1920x1080, 24fps)
- **스타일**: 따뜻한 햇살이 드는 아늑한 뉴욕 카페 창가 / 공원 벤치 풍경 (텍스트 가독성을 방해하지 않는 잔잔한 앰비언스)

### Runway / Luma / Sora 프롬프트

```text
Cinematic, slow-motion cozy urban coffee shop table next to a sunlit window. A warm ceramic coffee cup sits on the wooden table, gentle morning sunbeams streaming through glass casting soft shadows. Subtle ambient motion, dust motes floating gently in light, steam slowly rising from the mug, peaceful atmospheric focus. Warm color grading, cream and amber tones, shallow depth of field, 35mm film aesthetic, calm lo-fi cafe background, absolutely no human faces, no text overlays, no watermarks, perfectly looping 24fps video.
```

---

## 📋 일괄 복사용 텍스트

### Midjourney용 (Asset 1 이미지)
```text
/imagine prompt: A side-by-side anatomical cross-section diagram of the human vocal tract and mouth, pedagogical medical infographic style. On the left side: labeled "[iː] TENSE", showing lips pulled back sideways into a taut smile, high tongue position raised toward the hard palate, firm jawline. On the right side: labeled "[ɪ] LAX", showing a relaxed jaw slightly dropped downward, tongue lowered in a relaxed resting position, soft neutral mouth. Flat neo-brutalist medical illustration, warm cream beige background (#F4EFE6), bold clean black contour outlines, muted gold (#F59E0B) and teal accents highlighting the tongue muscle position, sharp typography labels, minimalist, ultra-high resolution, no 3D rendering, no gradients, editorial infographic poster. --ar 16:9
```

### AI 비디오 생성기용 (Asset 2 영상)
```text
Cinematic, slow-motion cozy urban coffee shop table next to a sunlit window. A warm ceramic coffee cup sits on the wooden table, gentle morning sunbeams streaming through glass casting soft shadows. Subtle ambient motion, dust motes floating gently in light, steam slowly rising from the mug, peaceful atmospheric focus. Warm color grading, cream and amber tones, shallow depth of field, 35mm film aesthetic, calm lo-fi cafe background, absolutely no human faces, no text overlays, no watermarks, perfectly looping 24fps video.
```
