---
workflow: faceless-explainer
flow: automation
storyboard: yes
message: "SOCIAL은 이미 매일 쓰는 단어이고, -CIAL로 끝나는 단어는 항상 '셜'로 읽힌다"
destination: youtube-shorts
aspect: 1080x1920
language: ko
audience: "영어 철자와 발음 규칙이 낯선 40~60대 왕초보 학습자"
length: 15-25s
angle: narrative
---

## Intent

시즌1 EP10 쇼츠B. Track A(쇼츠A, 4단어 퀴즈형·BlockFrame 카드 디자인)와 디자인·정보 순서를 다르게 가져가는 "반전·발견형" 트랙이다. SOCIAL 하나에 집중해 "이미 맨날 쓰던 단어가 사실 영어 발음 규칙 그대로였다"는 반전을 준다.

컨셉은 **메신저(카카오톡류) 대화 재현** — 검색창이 아니라 친구에게 카톡으로 물어보고 답장을 받는 형식으로 통일한다(검색창과 섞으면 화면 논리가 어색해짐, 2026-08-25 확인).

## Assets

- 나레이션은 신규 TTS 생성 필요 (기존 EP10 쇼츠A의 TTS 목소리·설정 재사용: Charon, ko-KR).
- 폰트·색상은 쇼츠A(BlockFrame)와도, ep10-confusion-pilot(다크 콜리전)과도 재사용하지 않는다 — 완전히 새 디자인.

## Customizations

- 화면은 실제 카카오톡 대화창을 재현한다: 내 말풍선(노란색, 우측 정렬) / 친구 말풍선(흰색, 좌측 정렬), 상단에 대화 상대 이름·프로필, "입력 중..." 표시 등 메신저 UI의 실제 디테일을 살린다.
- 질문 나레이션에는 목표 단어(SOCIAL)의 정답 발음("소셜")을 넣지 않는다.
- 나레이션과 동기화되는 영어 철자는 `#FF0000`, 대응 한글 발음은 `#008EFF`로 강조 (제작 규칙 색상 기준 유지).
- 상단·하단 쇼츠 안전영역을 지킨다. 우측 안전영역은 별도로 비우지 않는다(쇼츠A와 동일한 결정).

## Notes

- 쇼츠A·ep10-confusion-pilot 프로젝트는 수정하지 않는다.
- 렌더링은 최종 미리보기 승인 후 진행한다.
- 대본 초안은 `SCRIPT.md`, 장면 계획은 `STORYBOARD.md`에 확정한다.
