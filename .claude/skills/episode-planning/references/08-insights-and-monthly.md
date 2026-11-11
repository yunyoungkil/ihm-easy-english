# 정기 점검: 시청자·경쟁 인사이트(2주) · 월간 리포트(매월)

영상 한 편과 별개로 도는 두 가지 점검이다. 인사이트는 Phase 4 소재의 근거가 되고, 월간 리포트는 다음 달 방향을 정한다.

---

## 1. 시청자·경쟁 인사이트 (2주에 한 번)

**목적**: 성장 플라이휠 1단계 "경쟁사 결핍 추출"(`knowledge/channel-strategy.md`). 경쟁 영상을 베끼는 게 아니라 **댓글 속에 아직 답이 없는 질문**을 모은다.

**언제**: `audience-dna.json`의 `updatedAt`이 14일을 넘으면 한다(SKILL.md "데이터 되먹임 루프"). 0-B 주간 점검이나 Phase 1에서 이 조건을 보면 묻지 않고 시작하되, Gemini 호출 전에 비용·한도만 알린다.

1. **경쟁 채널 아웃라이어 갱신**: `npm run market-demand` (YouTube API 무료 할당량, search.list가 100단위씩 차감되므로 하루 1회). 추적 채널만 갱신하면 되면 `node scripts/market-demand.mjs --sync-all-tracked`.
2. **댓글 분석**: 대시보드 서버의 `POST /api/insights/analyze`에 `{"videoId":"<아웃라이어 영상 ID>"}` 또는 `{"keyword":"<market-demand 키워드>"}`를 보낸다. 이 통로는 보고서(`output/insights/`)를 쓰고 시청자 고민을 `audience-dna.json`에 바로 쌓는다. `npm run analyze-comments`는 보고서만 쓰고 `audience-dna.json`에는 쌓지 않으므로 이 단계에는 쓰지 않는다(2026-11-11 확인). 대상은 Phase 3 상태가 황금 광산·후보인 채널의 강의형 아웃라이어다.
3. **우리 채널 댓글**: 대시보드 `/api/insights/list`, `data/youtube/comments.json`(동기화 직후 값).
4. **경쟁 영상 직접 보기 (필요할 때만)**: 아웃라이어 1~2편을 `watch:watch`로 보고 "도입 30초를 어떻게 여는지, 어디서 반복을 거는지"만 메모한다. 대본 복제 금지.
5. **묶어서 세기 — `design:research-synthesis`**: 질문·불만을 주제별로 묶고 몇 번 나왔는지 센다.
6. **틈새 판단 — `marketing:competitive-brief`**: 경쟁 채널이 다뤘지만 댓글에 질문이 남은 주제와 아무도 안 다룬 주제를 나눈다. `idea-board-history.json`과 실제 카탈로그에 있는 소재는 뺀다.
7. **산출물**: `knowledge/growth/insights-YYYY-MM-DD.md`에 상위 주제 5개(근거 댓글 수, 출처 영상 포함). `audience-dna.json`은 2번 통로가 이미 채웠으므로 따로 고치지 않는다.

**멈춤 지점**: 없음(2026-11-11 사용자 결정, 자동화 우선). Gemini 호출 전 비용·한도 안내만 한다.

---

## 2. 월간 리포트 & 수익화 점검 (매월 초)

1. **월간 성과 — `marketing:performance-report`**
   - 롱폼/쇼츠, 강의형/듣기형을 **따로** 비교한다(섞어 비교 금지). 어느 형식에 시간을 쓸지는 전체 비중으로 따로 판단한다(Phase 1 형식 배분 판정).
   - 지난달 대비 조회수·구독자·시청 시간, 영상별 시청 지속률 순위, 트래픽 소스 변화.
   - 이번 달 REVIEW.md 판정을 모아 "확정 vs 가설" 표를 만든다.
2. **중단 규칙 점검**: `05-performance-review.md` 4절 규칙에 걸린 방식·형식을 표로 정리한다.
3. **성공 패턴 점검**: Phase 11이 자동으로 쌓은 `success-patterns.json`을 표로 보여 준다(가설·확정 개수, 이번 달 바뀐 항목). 빠진 리뷰가 있으면 그 Phase 11부터 한다. 승격·강등 기준은 `05-performance-review.md` 2절 7번을 따른다.
4. **다음 달 계획 — `marketing:campaign-plan`**: 집중할 주제 묶음(인사이트 결과), 롱폼·쇼츠 발행 목표(`knowledge/channel-strategy.md` "주간 목표" 표를 사용자와 갱신), 쇼츠 → 롱폼 연결 세트, 같은 틀 반복을 피하는 방식 배분(강의·듣기·쇼츠 섞기).
5. **수익화 단계 점검**(`knowledge/channel-strategy.md` 4단계 로드맵): 지금 몇 단계인지, 다음 단계로 가려면 무엇이 부족한지 한 줄로 판정한다. 무료 PDF·카카오톡 채널 같은 리드 수집을 시작할 때는 안내 글에 `marketing:content-creation`, 단계별 메시지에 `marketing:email-sequence`. 채널 아트 교체가 필요할 때만 `ui-ux-pro-max:banner-design`.
6. **산출물**: `knowledge/growth/monthly-YYYY-MM.md`. `knowledge/now.md`의 다음 행동이 바뀌었으면 함께 갱신한다.

**멈춤 지점**: 다음 달 발행 목표와 주간 목표 표를 바꿀 때만 사용자 확인을 받는다. 데이터 파일 기록은 묻지 않는다.
