# Knowledge Index

마지막 갱신: 2026-08-24

## 항상 읽기

- [지금 할 일](now.md) — 현재 우선순위와 가까운 일정만 담는 짧은 문서
- [이번 달 작업 기록](logs/2026-08.md) — 2026년 8월 변경 이력

## 운영

- [영상 제작 표준 워크플로우](VIDEO_WORKFLOW.md) — 기획부터 업로드·분석까지 10단계와 승인 게이트
- [채널 전략](channel-strategy.md) — 성장·수익화 목표와 판단 기준
- [콘텐츠 포맷](content-formats.md) — 시즌 롱폼, Track A/B, 채널 쇼츠 C의 역할
- [제작 규칙](production-rules.md) — 대상 시청자, 쇼츠 화면, TTS와 검수 원칙
- [HyperFrames 프롬프트 운영 기준](hyperframes-prompting.md) — 워크플로 선택 이후의 지시 구조, 디자인·모션·자막·검수 기준
- [썸네일 전략](thumbnail-strategy.md) — 판단 원칙과 에피소드별 선택 맥락
- [영상 STATUS 템플릿](templates/STATUS.template.md) — 영상별 진행 상태와 다음 행동 기록 양식
- [환경 설정 — HeyGen/WSL 브리지](environment-setup.md) — 이 컴퓨터에서 media-use(BGM/이미지/보이스 무료 카탈로그)를 쓰기 위한 WSL·heygen CLI 설치·연결 절차

## 결정

- [지속형 기억 시스템 도입](decisions/2026-08-21-local-wiki.md)
- [HyperFrames 도입 비교 실험](decisions/2026-08-23-hyperframes-pilot.md)
- [HyperFrames 전면 전환](decisions/2026-08-26-hyperframes-full-migration.md) — 새 제작(롱폼 포함) 전부 HyperFrames로, Remotion은 EP6~EP10 보존용
- [팟캐스트 형식 콘텐츠 추가 검토](decisions/2026-08-25-podcast-format-idea.md) — 초기 브레인스토밍, 미착수
- [채널 자체 적합도 점수 도입](decisions/2026-08-25-content-opportunity-score.md) — project1에서 `my_channel_fit_score` 공식만 이식, 경쟁 채널 비교는 미포함

## 에피소드

- [시즌1 EP9 — -CIAL](episodes/season1-ep09.md) — 제작 결과, YouTube 예약, 공개 후 확인
- [시즌1 EP10 — 시즌1 총정리](episodes/season1-ep10.md) — 완성된 롱폼과 미제작 쇼츠 A·B

## 이전 기록

- [이전 현재 상태](current-status.md) — `now.md` 도입 전 상세 상태 보관
- [이전 통합 로그](log.md) — 월별 로그 도입 전 기록 보관, 작업 시작 때 읽지 않음

## 원본 데이터

- `../data/youtube/analytics-latest.json` — 최신 YouTube 분석 스냅샷
- `../data/youtube/evaluations-48h.json` — 업로드 후 48시간 자동 판정
- `../data/youtube/content-opportunity.json` — 포맷·규칙별 채널 자체 적합도 점수(`npm run content-opportunity`로 재생성). github.com/yunyoungkil/project1의 `my_channel_fit_score` 공식 이식, 경쟁 채널 비교(market_demand_score)는 미포함
- `../data/youtube/catalog.json` — 채널 영상 카탈로그
- `../scripts/ep09_shortsA_auto.json` — EP9 Track A 대본·타이밍
- `../scripts/ep09_shortsB_auto.json` — EP9 Track B 대본·타이밍
- `../raw/` — 기사·참고 문서·대화 내보내기 등 변경하지 않는 원본
