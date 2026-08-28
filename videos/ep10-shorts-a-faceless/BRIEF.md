---
workflow: faceless-explainer
flow: automation
storyboard: yes
message: "네 단어를 풀어보면 시즌1의 강세와 소리 변화 원리가 하나로 연결된다"
destination: youtube-shorts
aspect: 1080x1920
language: ko
audience: "영어 철자와 발음 규칙이 낯선 40~60대 왕초보 학습자"
length: 45-55s
angle: concept
style_preset: blockframe
---

## Intent

시즌1 마지막 편의 Track A 퀴즈형 쇼츠. 짧은 시제품이 아니라 약 50초의 완결된 영상으로 제작해 디자인과 모션을 판단한다. OBSERVATION, CONFUSION, CAPTURE, ARTIFICIAL 네 단어를 직접 풀면서 시즌1의 강세·소리 변화·예외 원리를 하나로 연결한다.

## Customizations

- 채널 음색의 일관성을 위해 기존 Google Studio TTS를 사용하고, 생성된 음성을 HyperFrames에 연결한다.
- 단어 하나씩 화면을 충분히 크게 사용하고, 문제 → 짧은 생각 시간 → 정답 → 최소 원리 순서로 진행한다.
- 나레이션 발화 순간 영어 철자는 `#FF0000`, 대응하는 한글 소리는 `#008EFF`로 강조한다.
- 노란 카드는 핵심 영어 단어에만 사용한다.
- 모션은 계속 흔들지 않고 이해가 생기는 순간에만 리듬을 준다.
- 효과음은 정답 공개와 핵심 결합 지점에만 작게 사용한다.
- 상단과 하단의 쇼츠 안전영역을 지킨다. 오른쪽 UI 안전영역은 별도로 비우지 않는다.

## Notes

- 기존 12초 Rockabilly 및 채널 디자인 시제품은 선택된 디자인이 아니므로 복제하지 않는다.
- 이번 프로젝트는 HyperFrames `faceless-explainer` 전체 워크플로우를 평가하기 위한 독립본이다.
- 렌더링은 최종 미리보기 승인 후 진행한다.
