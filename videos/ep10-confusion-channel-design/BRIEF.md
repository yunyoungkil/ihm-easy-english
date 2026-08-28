---
workflow: faceless-explainer
flow: automation
storyboard: yes
message: "CONFUSION은 컨퓨션이 아니라 컨퓨전이며, 모음 뒤의 S + I가 전 소리를 만든다"
destination: youtube-shorts
aspect: 1080x1920
language: ko
audience: 영어 발음 원리를 처음 배우는 40~60대 왕초보
length: 12s
angle: concept
---

## Intent

EP10 쇼츠 A의 대표 구간을 기존 채널 쇼츠 디자인으로 제작해 Rockabilly 비교안과 직접 비교한다.

## Success and schedule

- 성공 기준: 왕초보가 무음으로 보아도 `CONFUSION → 컨퓨전 → U + SI → 전`의 관계를 이해한다.
- 비교 기준: 디자인 품질, 발화 동기화, 수정 속도, 한글 가독성, 렌더 안정성, 재사용 가능성.
- 초안 검토일: 2026-08-24.
- 렌더 목표일: 미확정.
- 업로드 예정일: 미확정.
- 외부 비용: 현재 시제품은 추가 비용 없음.

## References

- `../ep10-confusion-pilot/` — Rockabilly 비교안. 수정하지 않고 별도로 보존한다.
- 기존 채널 쇼츠 — 검정 배경, 노란 단어 카드, 빨간 영문 강조, 파란 한글 발음 강조만 유지한다.
- 비교 실험 단계이므로 두 디자인 중 어느 것도 공용 템플릿으로 확정하지 않는다.

## Assets

- `public/voice.wav` — 확정 나레이션. 1초 지점부터 사용한다.
- `public/capcut-korean.ttf` — 한글 표시용 채널 폰트.
- `public/rubik-bold.ttf` — 영어 단어 표시용 채널 폰트.

## Design

- 배경 `#05080D`, 단어 카드 `#FFD600`, 영어 강조 `#FF0000`, 한글 강조 `#008EFF`.
- 노란 카드는 영어 핵심 단어에만 사용한다.
- 상단과 하단 모바일 UI 안전영역을 지킨다.
- 핵심 이해 구간은 안정적으로, 질문·정답·연결 구간만 리듬을 준다.
- 효과음은 디자인 승인 뒤 질문·정답·CTA의 의미 있는 박자에만 추가한다.

## Protection

- Rockabilly 시제품 `../ep10-confusion-pilot/`은 수정하지 않는다.
- 실제 음성과 장면 타이밍은 유지한다.
