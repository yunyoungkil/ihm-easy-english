---
name: blind-review
description: 비교 시트(Gate 1) 승인 전 제목·썸네일 실물·시너지·대본을 초안 문맥과 분리된 백지 눈으로 딱 1회 냉정하게 점검한다. "백지 눈 검수", "시트 점검", "제목 썸네일 대본 점검", "승인 전 검수" 요청 및 시트 제출 직전에 사용한다.
---

# 백지 눈 패키징·대본 검수 (1회 점검)

> **권장 모델**: **최상위 모델** (`Gemini 4 Neon` / `Claude Opus 5.5`). 초안을 쓴 대화의 변명을 배제하기 위해 가능하면 독립 문맥(서브에이전트)에서 **정확히 1회**만 실행한다(무한 반복 검수로 개성이 깎이는 함정 방지).

## 절차

1. **실물 먼저 열기 (요약만 보고 판단 금지)**
   - 비교 시트(`data/youtube/transform-sheets/<id>.json`), 대표 썸네일 실물 이미지(`thumb-*.jpg`), 한국어 대본(`videos/<id>/SCRIPT.md`), 영어 음성 검수표(`AUDIO-AUDIT.md`가 있으면)를 직접 연다.
2. **자동 바닥선 먼저 확인**
   - 대본 한국어 낭독문만 추출해 `slop-rewrite`(`check_ai_tells.py --genre 줄글`)와 `node scripts/check-narration-naturalness.mjs`를 돌린다. (이 검사는 최소 안전 바닥선일 뿐, 통과했다고 사람 눈 점검을 생략하지 않는다.)
3. **5대 구체 잣대 (예/아니오 + 근거 1줄)**
   - `mobileTitleOk`: 제목 앞 30~38자 안에 핵심 고민과 소비 방식(예: 틀어 두고 듣기)이 들어가 휴대폰에서 안 잘리는가? 기호 남발·교과서 목차체·말하기/듣기 오해가 없는가?
   - `thumbOneSecOk`: 대표 썸네일 실물 그림에서 1초 만에 감정·상황이 꽂히고, 강사 용어나 정답 스포일러가 없으며, 영상 길이(예: 37분)에 맞는 소비 단서가 보이는가?
   - `synergyOk`: 썸네일이 던지는 호기심과 제목이 받는 실속이 한 방향으로 맞물리는가?
   - `openingOneMinOk`: 첫 30~60초가 사용 설명서·긴 목차 예고로 늘어지지 않고 바로 시청자 귀/눈 체험으로 들어가는가?
   - `antiSlopVoiceOk`: 사람 귀로 읽을 때 같은 진행 멘트 반복(`들어 볼게요`, `~묻는 질문`), 글쓰기 관용구, 존댓말/반말 어긋남, 번역 불일치가 없고 `knowledge/creator-voice-card.md` 정예 예시 3~5개 결에 맞는가?
4. **시트 기록 (`blindReview` 칸)**
   - 아래 구조로 비교 시트 최상단 `blindReview`를 기록한다(2026-11-28 이후 새 v4 시트는 누락 시 승인 차단):
   ```json
   "blindReview": {
     "reviewedAt": "YYYY-MM-DD",
     "reviewerModel": "실제 검수 모델명",
     "checks": {
       "mobileTitleOk": true,
       "thumbOneSecOk": true,
       "synergyOk": true,
       "openingOneMinOk": true,
       "antiSlopVoiceOk": true
     },
     "findings": ["발견한 개선점 또는 수정 반영 요약"],
     "verdict": "pass"
   }
   ```
   - `verdict`는 5개 중 하나라도 `false`이면 `"needs_fix"`로 두고 개선안을 제시한다. 수정 반영 후 5개 모두 `true`일 때만 `"pass"`로 기록한다.
