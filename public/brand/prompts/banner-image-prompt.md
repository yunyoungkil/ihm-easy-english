# 채널 배너(채널 아트) 생성 프롬프트

전체 캔버스는 2560x1440으로 생성하되, 실제로 항상 보이는 건 중앙의 "세이프 존"(약 1546x423,
데스크톱/모바일/TV마다 나머지는 잘려서 안 보임)뿐이다 — 그래서 텍스트·마크는 전부 세이프 존
안에 몰아넣도록 프롬프트에 직접 지시했다. 프로필 사진과 같은 사운드웨이브 마크를 재사용해서
둘이 한 세트로 보이게 했다.

## ⚠️ 2026-09-02 재생성 — 1차 결과물 해상도 미달 문제

1차 생성 결과(`public/brand/channel-assets/channel-banner.jpg`)는 디자인·텍스트·세이프존 배치는
프롬프트대로 정확했지만, **실제 파일 해상도가 1376x768**로 나왔다(프롬프트에 2560x1440을 명시했는데도
실제 생성 모델이 텍스트 지시만으론 정확한 픽셀 수를 지키지 않은 것으로 보임). 유튜브 배너 최소
업로드 해상도는 **2048x1152**이고 미만이면 업로드 자체가 거부된다(공식 최소 요구사항, 2026-09-02
웹 검색으로 재확인).

**gemini.google.com에서 이 프롬프트로 다시 생성할 때 확인할 것**:
- 앱에 이미지 크기/화질 옵션(예: "고화질"·"2K" 등)이 있으면 가장 높은 해상도로 선택.
- 생성 후 반드시 실제 파일 픽셀 크기를 확인(우클릭 → 속성, 또는 이미지 뷰어) — **가로 2048px 미만이면
  유튜브에 업로드되지 않으니 재생성**.
- 그래도 해상도가 안 나오면, 생성된 이미지를 무료 업스케일 도구(예: Gigapixel 계열 웹 버전)로
  2560x1440까지 키우는 걸 차선책으로 고려.

```
A YouTube channel banner (channel art) for a Korean English-pronunciation education
channel, canvas size 2560x1440 pixels (16:9-ish ultra-wide).

=== CRITICAL SAFE-AREA CONSTRAINT ===
YouTube crops this banner differently on desktop, mobile, and TV — only a centered
horizontal band of roughly 1546x423 pixels, vertically and horizontally centered in the
canvas, is guaranteed visible on every device. Place ALL text and the brand mark inside
that centered safe area. The outer margins of the canvas (top, bottom, left, right,
outside the safe area) must contain only plain background — no text, no mark, nothing
that would be lost to cropping.

=== TEXT CONTENT (render each quoted string exactly character-for-character) ===
- Main wordmark, large bold letters, one line: "이해하면 쉬운영어"
- Tagline directly below it, smaller, single line: "소리 나는 원리로 배우는 영어"
Do not render any other text — no URLs, no upload schedule, no social handles, no
watermark, no placeholder text.

=== VISUAL STYLE ===
Background: solid dark navy (#0A1526) fading very subtly to a slightly lighter navy
(#12203A) toward the center, flat and clean, no busy texture.

Brand mark: to the left of the wordmark within the safe area, a small abstract sound
wave / audio equalizer icon — 5 to 7 vertical bars of varying height in the channel's
three brand colors (bright yellow #F5C518, sky blue #5B9BD5, red #E84545), same style
as the channel's profile picture mark, flat vector, no gradients on the bars themselves.

Typography: clean, bold, heavy sans-serif for the wordmark in white or bright yellow
(#F5C518) with enough contrast against the navy background; the tagline in a softer
gray-blue, clearly smaller than the wordmark.

Layout inside the safe area: mark on the left, wordmark and tagline stacked to its
right, the whole group horizontally centered as one unit within the safe area with
comfortable padding on both sides — do not stretch content to the very edges of the
safe area.

Do not include any human figures, photos, or icons unrelated to the sound wave mark.
Do not add a logo, watermark, or any text outside what is quoted above.
```

## 참고
- 세이프 존 계산: 2560x1440 전체 중 가운데 1546x423만 항상 보임 — 유튜브 공식 가이드 기준.
- 프로필 사진(`profile-picture-prompt.md`)의 사운드웨이브 마크를 그대로 재사용하도록 지시해서
  프로필·배너가 같은 브랜드 마크를 공유하는 하나의 시스템으로 보이게 했다.
- 태그라인 문구("소리 나는 원리로 배우는 영어")는 브랜드 페르소나 문서의 시그니처 멘트
  ("당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다")를 배너 길이에 맞게
  축약한 것 — 다른 문구가 낫다고 판단되면 TEXT CONTENT 부분만 바꾸면 된다.
