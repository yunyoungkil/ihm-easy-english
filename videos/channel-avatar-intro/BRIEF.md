---
workflow: general-video
flow: companion
storyboard: no
message: "채널 아바타(진영 페르소나)가 시청자에게 공감의 한마디를 건네고 본편으로 넘어가는 짧은 브랜딩 인트로 클립"
destination: youtube-longform
aspect: 1920x1080
language: ko
audience: "채널 시청자 전체 — 이 클립은 다른 에피소드 영상의 인트로 뒤/본편 앞에 삽입되는 재사용 자산"
length: ~4s
angle: brand-bridge
---

## Intent

`knowledge/decisions/2026-09-03-avatar-intro-clip-setup.md`에서 이미 확정된 채널 아바타 인트로
클립을 실제 HyperFrames 컴포지션 안에 합성해서, 투명 배경(alpha)이 채널 배경 위에 제대로 올라가는지
눈으로 확인하는 테스트 빌드.

- HeyGen 사진 아바타(group_id 552d98a076f04e7da14603b4c3910ef5) + 목소리 Dmitri로 이미 생성 완료.
- 2박자 대사, 두 조각 다 무음 구간 다듬어서 `assets/`에 준비됨(아래 Assets 참고).
- 사람 주변 원본 스튜디오 배경(진한 회색)은 그대로 유지 — 사진 아바타 특성상 사람만 오려내는 건
  불가능하다는 걸 확인함(2026-09-03). 대신 우리가 요청한 16:9 캔버스를 채우려고 덧붙인 좌우 여백만
  투명(alpha=0)이라, 그 부분에 채널 배경이 자연스럽게 비쳐 보여야 한다.
- 두 조각은 하드컷으로 이어붙인다. 전환 효과음 없음(사용자가 명시적으로 불필요하다고 확인).

## Assets

- `assets/beat1.webm` — "저도 외우는 거 딱 질색이었습니다." (약 2.88초, VP9+alpha)
- `assets/beat2.webm` — "같이 가보시죠." (약 1.15초, VP9+alpha)
- 둘 다 가장자리 alpha=0 / 인물 영역 alpha=255 검증 완료.

## Customizations

- 배경: CLAUDE.md '공통 연출' 절의 채널 표준 배경 — 중앙 `#12203A` → 외곽 `#0A1526` radial gradient.
- 두 클립을 하드컷으로 순서대로 배치(beat1 → beat2), 트랜지션 효과 없음.
- 이 프로젝트 자체가 최종 납품물이 아니라 검증용 테스트 빌드 — 통과하면 이후 실제 에피소드 인트로
  뒤에 이 두 클립을 그대로 재사용한다.

## Notes

- 나레이션/캡션 없음(이미 대사가 아바타 음성에 포함됨), BGM 없음(짧은 브릿지 클립).
