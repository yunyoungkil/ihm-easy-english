# 아웃라이어 영상 댓글 분석(시청자 언어·고민 분석) 파이프라인 구축

마지막 갱신: 2026-08-29

## 계기

[경쟁 채널 비교(market_demand_score) 구현](2026-08-29-market-demand-score.md)을 통해 조회수가 폭발한 아웃라이어 영상과 제목 패턴(`titlePatterns`)을 찾는 기능까지 완성했다. 하지만 제목만으로는 **"시청자가 실제로 어떤 문장에서 헷갈렸는지, 어떤 질문과 갈증을 가졌는지(Pain Points & Mental Model)"**를 알기 어렵다.

아웃라이어 영상의 인기 댓글 50~100개를 수집하고 Google Gemini AI로 심층 분석하여, **시청자의 생생한 언어와 질문을 차기 대본 및 썸네일 기획으로 직결**하는 도구를 구축했다.

---

## 구현

### 1. 스크립트: `scripts/analyze-outlier-comments.mjs`

- **YouTube Data API v3 (`commentThreads.list`)**:
  - 타겟 영상의 인기순(`order: relevance`) 댓글 최대 100개 수집
  - 좋아요 수(`likeCount`), 답글 수(`replyCount`), 댓글 본문 확보
  - 쿼터 비용: 1개 영상당 1 unit (매우 저렴)
- **Google Gemini API (`gemini-2.5-flash`)**:
  - 수집된 댓글을 바탕으로 5대 핵심 항목 자동 도출:
    1. **시청자 핵심 고통 (Pain Points TOP 3~4)**
    2. **시청자 질문 및 미해결 의문 (Audience FAQs)**
    3. **시청자의 생생한 어휘 (Audience Vocabulary)**
    4. **호평받은 설명 포인트 (What Worked)**
    5. **우리 채널 즉시 적용 기획안 (제목 3종, 첫 3초 후킹, 쇼츠 Track A/B 컨셉)**

---

## 사용법

```powershell
# 1. 키워드 기반 아웃라이어 영상 자동 탐색 및 분석
node scripts/analyze-outlier-comments.mjs --keyword="영어 연음 축약"

# 2. 특정 유튜브 영상 URL 직접 분석
node scripts/analyze-outlier-comments.mjs --url="https://youtube.com/watch?v=..."

# 3. market-demand.json 전체 아웃라이어 일괄 분석
node scripts/analyze-outlier-comments.mjs --all
```

---

## 산출물 위치

- **JSON 데이터**: `data/youtube/outlier-comments/<videoId>.json`
- **마크다운 기획 리포트**: `output/insights/<영상제목_videoId>.md`

---

## 관련 문서

- [지금 할 일](../now.md)
- [경쟁 채널 비교 구현](2026-08-29-market-demand-score.md)
- [채널 자체 적합도 점수 도입](2026-08-25-content-opportunity-score.md)
