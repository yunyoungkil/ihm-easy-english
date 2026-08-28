---
workflow: faceless-explainer
flow: automation
storyboard: no
message: "CONFUSION은 컨퓨션이 아니라 컨퓨전이며, 모음 뒤의 S + I가 전 소리를 만든다"
destination: youtube-shorts
aspect: 1080x1920
language: ko
audience: 영어 발음 원리를 처음 배우는 왕초보
length: 12s
angle: concept
---

## Intent

EP10 쇼츠 A. Rockabilly 인쇄 포스터 시제품을 사용자가 보고 "맘에 안 든다"고 반려한 뒤,
"규칙을 다 떠나서 놀라움을 줄 영상으로 만들어봐"라는 요청으로 완전히 새로 설계했다.
컨셉: **소리 충돌(Sound Collision)** — 모음(U) + S+I가 실제로 화면에서 날아와 충돌해
'전' 소리를 만들어내는 것을 문자 그대로 시각화한다. 발음 규칙 자체를 물리적 충돌
메타포로 재현하는 것이 이 버전의 핵심 아이디어다.

## Assets

- `public/voice.wav` — 완성된 EP10 Scene 6 나레이션에서 `컨퓨전은요? 전입니다. 모음 뒤라서요.` 구간만 추출한 음성. (그대로 재사용, 타이밍 재검증 완료)

## Customizations

- Rockabilly 인쇄 포스터 스타일 폐기. 어둡고 모던한 하이컨트라스트 키네틱 타이포 스타일로 교체
  (배경 `#0A0A0D`, 민트 `#00E5A0` 액센트, 흰색 본문, Bebas Neue + Barlow Condensed + CapcutKR).
- 5막 구조: 훅(글리치되는 CONFUSION 단어, 0-3.2s) → 스포트라이트(정답 후보 강조, 3.2-4.7s) →
  리빌(파티클 버스트와 함께 '전' 등장, 4.7-5.9s) → 규칙(U와 S+I가 날아와 충돌, 5.9-7.9s) →
  홀드(최종 카드 + 채널 브랜딩, 7.9-12s).
- 모션은 hyperframes-animation 규칙집의 named rules를 인용해 구성: spring-pop-entrance,
  chromatic-glitch, reactive-displacement 파생(U+S+I 상호 충돌), particle-burst,
  ambient-glow-bloom. `back.out`/바운스는 충돌 임팩트 한 곳에만 절제해서 사용.
- 안전영역: 좌우 넉넉한 여백, 하단에 채널 브랜딩 칩(이해하면 쉬운영어 · EP10).

## Notes

- 기존 Remotion 프로젝트와 완성 영상은 수정하지 않는다.
- `npx hyperframes check` 통과 (lint/runtime/layout/motion 0 errors, contrast 19/19 AA).
- 발견해서 고친 버그: GSAP에 없는 `motionPath` 플러그인 사용, 오디오 `data-media-start`가
  첫 대사를 잘라먹던 것, `filter:blur()`가 HyperFrames의 애니메이션 허용 속성 목록 밖이라 쓰면 안 되는 것,
  글로우 halo가 자기 레이아웃 행보다 커서 `escaped_container`로 잡히던 것,
  `#flash2`에 배경색 CSS 규칙이 빠져서 충돌 순간 플래시가 투명했던 것.
