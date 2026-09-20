# Frame 01 Sound Clash Step 3 — AI 이미지 생성 프롬프트

1프레임 1단계(`clash_step1.jpg`)와 2단계(`clash_step2.jpg`)에 이어,  
두 소리 파동이 한가운데서 정면으로 격돌하여 번개와 스파크가 폭발하는 **3단계(Sound Clash Explosion)** 일러스트 프롬프트입니다.

---

## 🎨 시각 스타일 일관성 기준 (화풍 유지)
- **캔버스/배경**: 플랫 웜 크림 (`#F4EFE6`) 페이퍼 질감
- **라인아트**: 굵고 선명한 블랙 잉크 외곽선 (`#2B2B2B`), 네오브루탈리즘 스케치노트 스타일
- **스피커**: 좌/우 양쪽에 마주보고 서 있는 클래식 우드 빈티지 라우드스피커 2대
- **소리 파동**: 좌측 붉은색/오렌지색(#FF5E57) vs 우측 청록색/블루(#2E86AB)
- **중앙 충돌**: 한가운데에서 두 소리가 정면 격돌하며 터지는 노란색 번개(#F5C518), 불꽃 파편, 만화책 충격파 폭발
- **텍스트 금지**: 영문 알파벳, 단어, 글자 일체 없음 (`no text, no letters`)

---

## 1. Midjourney (미드저니 v6.1) 프롬프트

```text
Clean educational sketch illustration of two vintage wooden audio loudspeakers facing each other from opposite sides, neo-brutalist hand-drawn ink style with bold black ink outlines and flat warm cream background #F4EFE6. In the exact center between the two speakers, the vibrant red sound waves from the left speaker and the cool blue sound waves from the right speaker collide violently, creating a massive dramatic comic book style explosion burst of electric lightning bolts #F5C518, fiery sparks, and radial shockwaves, high impact sound clash, minimalist vector comic book art, high contrast, clean lines, no text, no words, no letters --ar 4:3 --v 6.1 --style raw
```

> **💡 미드저니 팁**:
> 만약 2단계 이미지(`clash_step2.jpg`)를 이미지 프롬프트(Image Prompt)로 먼저 업로드하고 위 프롬프트 뒤에 붙이시면 스피커의 크기와 위치가 완벽하게 일치합니다!  
> 예: `[clash_step2 이미지 URL] [위 프롬프트] --ar 4:3 --v 6.1`

---

## 2. ChatGPT (DALL-E 3) 프롬프트

```text
A clean educational sketch illustration of two vintage wooden audio loudspeakers facing each other from the left and right sides, on a flat solid warm cream paper background (#F4EFE6).
Style: Neo-brutalist hand-drawn sketch style with bold, thick black ink outlines and flat graphic colors.
Scene: The vibrant red-orange sound waves from the left speaker and the cool teal-blue sound waves from the right speaker violently crash into each other in the exact middle of the canvas.
Right at the collision center, a powerful comic-book style explosion bursts out with bright yellow electric lightning bolts (#F5C518), dynamic spark fragments, and radial shockwave lines.
Completely clean, minimalist, high contrast, no English text, no words, no letters, horizontal 4:3 aspect ratio.
```

---

## 💾 생성 후 저장 위치
생성하신 이미지를 아래 파일명으로 저장해 주시면, 1프레임 애니메이션에 즉시 자동으로 연결됩니다:
- 경로: `videos/ep19-ate-suffix/assets/images/clash_step3.jpg`
