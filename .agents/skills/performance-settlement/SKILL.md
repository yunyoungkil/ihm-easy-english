---
name: performance-settlement
description: 공개 7일·28일이 지난 영상의 실제 조회·노출·클릭률·시청 지속·구독 성과를 정산하고 REVIEW.md·실험표·비교 시트 근거 기록에 반영한다. "7일 정산", "성과 정산", "성과 리뷰", "28일 리뷰" 요청에 사용한다.
---

# 공개 7일·28일 성과 정산

> **권장 모델**: **경량 모델** (`Gemini 3.8 Flash` / `Claude sonnet-worker`·`haiku`). 상세 판정 기준과 중단 규칙은 `.agents/skills/episode-planning/references/05-performance-review.md`를 따른다.

## 절차

1. **실측 데이터만 수집 (추정·가짜 숫자 금지)**
   - 최신 동기화 파일(`data/youtube/catalog.json`, `studio-metrics.json`, `studio-first7d.json`, `analytics-latest.json`)에서 대상 영상의 실제 7일/28일 조회수, 노출수, 클릭률(CTR), 평균 시청 시간/비율, 계속 시청함(쇼츠), 구독 전환을 뽑는다.
   - 데이터가 아직 안 들어왔으면 "측정 전"으로 두고 임의 숫자를 넣지 않는다.
2. **`REVIEW.md` 실제·판정 기록**
   - `videos/<프로젝트>/REVIEW.md`의 `실제` 절에 실측 숫자와 기준선 대비 판정을 적는다.
   - **`예측` 절은 절대 수정하지 않는다(불변 규칙).**
3. **비교 시트 · 실험표 · 패턴 파일 환류**
   - 해당 비교 시트(`data/youtube/transform-sheets/<id>.json`)의 `references[].evidenceLog`에 날짜·영상 ID·지표·값·판정을 기록한다.
   - `knowledge/style-experiments.md`와 `data/youtube/success-patterns.json`(1편=가설, 같은 방식·형식 2편 이상=확정)을 갱신한다.
   - 작은 표본(최근 3편 노출 중앙값 1,000회 미만)이면 모든 판정에 "가설"을 명시하고 중단 규칙은 참고만 한다.
4. **할 일 정리 · 커밋**
   - **흐름 개선 메모함(`knowledge/idea-memo.md`)의 `대기` 줄을 이번 성적과 맞춰 본다.** 숫자로 근거가 생긴 것만 적용하고(바꾼 문서를 적음), 근거가 반대면 `버림`과 이유를 적고, 아직 모르면 `대기`로 둔다(2026-11-28 사용자 확정).
   - `knowledge/now.md`에서 끝난 정산 항목을 지우고, `knowledge/logs/YYYY-MM.md`에 정산 요약을 남긴 뒤 바꾼 파일만 커밋·푸시한다.
