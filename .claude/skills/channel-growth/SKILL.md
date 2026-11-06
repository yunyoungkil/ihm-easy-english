---
name: channel-growth
description: 이해하면 쉬운영어 채널의 성장 점검 워크플로우. "성장 점검", "주간 점검", "월간 리포트", "업로드 전 점검", "왜 조회수가 안 나와", "시청자 반응 분석", "경쟁 채널 틈새" 같은 요청에 사용한다. 저장소 자체 데이터(대시보드 API·scripts)와 설치된 스킬(marketing·design·korean-skills·watch)을 엮어 주간·업로드 전·격주·월간 4개 루프로 진행하며, vidIQ는 쓰지 않는다. 새 에피소드 기획·제작 자체는 episode-planning 스킬이 맡는다.
---

# 채널 성장 워크플로우 (4-Loop Growth Orchestrator)

`episode-planning`이 **영상 한 편을 잘 만드는 법**이라면, 이 스킬은 **만든 영상들이 채널을 키우고 있는지 확인하고 막힌 곳을 뚫는 법**이다.
비유하면 episode-planning은 요리법, channel-growth는 가게 장부 점검이다.

---

## 🚨 공통 원칙 (모든 루프에 적용)

| 원칙 | 내용 |
|---|---|
| **vidIQ 사용 안 함** | vidIQ MCP 도구는 이 워크플로우에서 호출하지 않는다. 우리 채널 숫자는 대시보드(`npm run analytics`, 포트 3001) API, 경쟁 채널은 `market-demand.mjs`·`analyze-outlier-comments.mjs`(YouTube Data API)와 `watch:watch`로 대신한다. |
| **숫자는 라이브 값만** | 조회수·CTR·시청 지속률은 반드시 `POST /api/sync` 직후 `GET /api/dashboard`, `/api/episodes/summary` 응답에서 가져오고 응답의 `range`를 함께 적는다. `data/youtube/*.json` 파일 숫자를 그대로 인용하지 않는다. |
| **작은 표본은 가설** | 1편에서 본 현상은 "가설", 같은 방식·형식의 2편 이상에서 반복된 것만 "확정"이다(`knowledge/channel-strategy.md` 성과 운영). |
| **직언** | 듣기 좋은 말 대신 숫자와 근거로 결론을 말한다(CLAUDE.md "조언과 피드백은 … 직언"). |
| **쉬운 설명** | 결과 보고는 초등학생도 이해할 말로 한다. 지표 이름에는 한 줄 풀이를 붙인다(예: CTR = 썸네일을 본 사람 중 클릭한 비율). |
| **승인 게이트** | 루프마다 결과를 보고하고 멈춘다. `success-patterns.json` 갱신, 제목·썸네일 교체, 업로드·예약 변경은 사용자 승인 후에만 한다. |
| **대외 금지어** | 제목·썸네일·설명·고정 댓글 제안에는 `episode-planning` SKILL.md 상단 금지표(드릴·미니멀 페어 등, 5단어 이하 썸네일)를 그대로 적용한다. |

---

## 📋 4개 루프 한눈에 보기

| 루프 | 주기 | 질문 | 산출물 |
|---|---|---|---|
| **A. 주간 성장 점검** | 매주 1회 (또는 "성장 점검") | 지금 성장 루프 어디가 막혔나? | `knowledge/growth/weekly-YYYY-MM-DD.md` |
| **B. 업로드 전 패키징 점검** | 영상마다, 업로드 직전 | 제목·썸네일·설명이 클릭과 검색을 받을 준비가 됐나? | 패키지 폴더 `packaging-review.md` |
| **C. 시청자·경쟁 인사이트** | 2주 1회 | 시청자가 아직 못 푼 질문은 뭔가? | `knowledge/growth/insights-YYYY-MM-DD.md` → episode-planning Phase 4 근거 |
| **D. 월간 리포트 & 수익화** | 매월 초 | 이번 달 무엇이 통했고, 다음 달 무엇에 집중하나? | `knowledge/growth/monthly-YYYY-MM.md` |

기록 위치 `knowledge/growth/`가 없으면 만든다. 같은 날짜 파일이 이미 있으면 덮어쓰지 말고 읽은 뒤 갱신한다.

---

## 루프 A — 주간 성장 점검

**목적**: 숫자를 보기 전에 "막힌 곳"부터 찾는다. 영상이 대기열에 쌓여 있거나 리뷰가 밀려 있으면 숫자 분석보다 그게 먼저다.

1. **막힌 곳 스캔 (파일 기준)**
   ```bash
   node scripts/growth-check.mjs --save
   ```
   - 업로드 대기열: 만들어 놓고 공개 안 된 패키지, 예약 시각이 지났는데 상태가 그대로인 패키지
   - 발행 간격: 최근 14·28일 공개 수, 마지막 롱폼 이후 경과일 (목표: 롱폼 2일 간격)
   - 밀린 리뷰: 48시간 판정, 7일·28일 REVIEW.md 실제 칸이 빈 영상
   - ⚠️ "예약 시각이 지났는데 상태 그대로"는 실제로는 공개됐는데 동기화만 안 됐을 수 있다. 먼저 대시보드 `/api/sync`·`/api/studio-scan`으로 실제 상태를 확인하고, status.json을 손으로 고치지 않는다(`knowledge/production-rules.md` "업로드 후 대시보드 자동 동기화가 안 될 때").
2. **라이브 숫자 확인**: 대시보드를 띄우고 `/api/sync` → `/api/dashboard`, `/api/episodes/summary`, `/api/evaluations/48h`.
   - 볼 것: 이번 주 조회수·구독자 증감, 롱폼 vs 쇼츠 비중, 상위 트래픽 소스 3개, 검색 유입 비중, 최근 영상 시청 지속률
3. **48시간 판정 실행**: 공개 2일이 지난 영상이 있으면 `npm run evaluate-48h`.
4. **정리 — `marketing:performance-report` 스킬로 한 장 요약**
   - 형식: 핵심 숫자 표(출처·범위 포함) → 잘된 것 1~2개 → 막힌 것 1~2개 → **이번 주 할 일 최대 3개**
   - 할 일은 "업로드 대기열 3편 예약 걸기"처럼 이번 주 안에 끝낼 수 있는 행동으로 쓴다.
5. **보고 후 멈춤**. 밀린 7일·28일 리뷰가 있으면 "episode-planning Phase 11 리뷰를 먼저 진행할까요?"를 제안한다.

---

## 루프 B — 업로드 전 패키징 점검

**목적**: 영상은 다 만들었는데 제목·썸네일·설명 때문에 손해 보는 일을 막는다. 대상은 `output/upload-packages/<project>/`.

먼저 `knowledge/thumbnail-strategy.md`와 `episode-planning/references/02-title-and-thumbnail.md`를 읽는다.

| 점검 항목 | 쓰는 스킬 | 기준 |
|---|---|---|
| 제목·설명·태그 검색 노출 | `marketing:seo-audit` (유튜브 검색에 맞게 적용) | 시청자가 실제로 치는 검색어가 제목 앞쪽에 있는가. 검색어 근거는 대시보드 검색어 데이터와 `market-demand.json` 제목 패턴, 웹 검색 |
| 맞춤법·띄어쓰기 | `korean-skills:grammar-checker` | 제목, 설명, 고정 댓글, 챕터 이름 전부 |
| 표기 일관성 | `korean-skills:style-guide` | 이전 편들과 용어·숫자·괄호 표기가 같은가 (`[반복 듣기]` 등) |
| AI 말투 | `korean-skills:humanizer` | 설명란·고정 댓글이 사람이 쓴 말처럼 읽히는가 |
| 브랜드 톤 | `marketing:brand-review` | `knowledge/brand-persona.md` 기준, 금지어·과장 표현·가짜 해외 일화 없음 |
| 썸네일 가독성 | `design:design-critique` | 5단어 이하, 칩 2단어 이하, 채널명 없음, 시안 A/B/C가 서로 다른 훅인가 |
| 40~60대 가독성 | `design:accessibility-review` | 글자 대비(WCAG AA), 모바일 피드 크기에서 읽히는가. 최종 확인은 대시보드 LIVE MOBILE FEED PREVIEW |
| 짧은 문구 | `design:ux-copy` | 썸네일 카피·고정 댓글 첫 줄·CTA 문장 다듬기 |
| 쇼츠 → 롱폼 연결 | (체크리스트) | 쇼츠라면 설명·고정 댓글에 관련 롱폼 링크가 있는가 (`channel-strategy.md` 성장 구조) |
| 같은 틀 반복 | (체크리스트) | 직전 3편과 제목 문장 틀과 프레임 구성이 같은가, 이 영상에만 있는 코너가 있는가 (2026-11-06 이후 기획한 영상부터, EP24~29 제외) |

- 결과는 `packaging-review.md`에 "통과 / 고칠 것(원문 → 수정안)" 표로 남긴다.
- 고칠 것은 제안만 하고, 패키지 파일 수정은 사용자 승인 후 진행한다. 수정하면 `knowledge/production-rules.md` "업로드 패키지 변경 완료 조건"을 따른다.

---

## 루프 C — 시청자·경쟁 인사이트 (2주 1회)

**목적**: 플라이휠 1단계 "경쟁사 결핍 추출". 경쟁 영상을 베끼는 게 아니라 **댓글 속 미해결 질문**을 모은다.

1. **경쟁 채널 아웃라이어 갱신**: `npm run market-demand` (YouTube API 무료 할당량 사용, search.list가 100단위씩 차감되므로 하루 1회).
2. **댓글 분석**: `npm run analyze-comments -- --all` 또는 상위 아웃라이어 영상 `--video=<id>`.
   - ⚠️ Gemini 호출이 들어가면 비용·쿼터를 먼저 사용자에게 알린다.
3. **우리 채널 댓글**: 대시보드 `/api/insights/list`, `data/youtube/comments.json`(동기화 직후 값).
4. **경쟁 영상 직접 보기 (필요할 때만)**: 아웃라이어 1~2편을 `watch:watch`로 보고 "도입 30초를 어떻게 여는지, 어디서 반복을 거는지"만 메모한다. 대본 복제 금지.
5. **묶어서 정리 — `design:research-synthesis`**: 질문·불만을 주제별로 묶고 "몇 번 나왔는지"를 센다.
6. **틈새 판단 — `marketing:competitive-brief`**: 경쟁 채널이 다뤘지만 댓글에 질문이 남은 주제, 아무도 안 다룬 주제를 분리한다. `idea-board-history.json`과 겹치는 소재는 뺀다.
7. **산출물**: `insights-YYYY-MM-DD.md`에 상위 주제 5개(근거 댓글 수·출처 영상 포함). 승인받은 항목만 `audience-dna.json`에 반영하고, 이 파일을 다음 `episode-planning` Phase 4의 근거로 넘긴다.

---

## 루프 D — 월간 리포트 & 수익화 점검 (매월 초)

**목적**: 한 달 단위로 "무엇이 통했는지" 확정하고 다음 달 방향을 정한다.

1. **월간 성과 — `marketing:performance-report`**
   - 롱폼/쇼츠, 강의형/듣기형을 **따로** 비교한다 (섞어 비교 금지).
   - 지난달 대비 조회수·구독자·시청 시간, 영상별 시청 지속률 순위, 트래픽 소스 변화.
   - 이번 달 REVIEW.md 판정을 모아 "확정 vs 가설" 표를 만든다.
2. **성공 패턴 승격**: 2편 이상 반복된 것만 `success-patterns.json` 후보로 올리고 **사용자 승인 후** 반영한다.
3. **다음 달 계획 — `marketing:campaign-plan`**
   - 다음 달 집중할 주제 묶음(루프 C 결과), 발행 목표 횟수, 쇼츠 → 롱폼 연결 세트.
4. **수익화 단계 점검** (`knowledge/channel-strategy.md` 4단계 로드맵 기준)
   - 지금 몇 단계인지, 다음 단계로 가려면 무엇이 부족한지 한 줄로 판정한다.
   - 무료 PDF·카카오톡 채널 같은 리드 수집을 시작할 때: 안내 글은 `marketing:content-creation`, 단계별 메시지는 `marketing:email-sequence`.
   - 채널 아트·배너 교체가 필요할 때만 `ui-ux-pro-max:banner-design`.
5. **산출물**: `monthly-YYYY-MM.md`. `knowledge/now.md`의 다음 행동이 바뀌었으면 함께 갱신한다.

---

## 🔗 다른 워크플로우와의 연결

| 이 스킬에서 나온 것 | 넘겨받는 곳 |
|---|---|
| 루프 A의 밀린 7일·28일 리뷰 | `episode-planning` Phase 11 (`references/05-performance-review.md`) |
| 루프 C의 상위 주제 5개 | `episode-planning` Phase 4 소재 후보 근거 |
| 루프 B의 고칠 것 | 업로드 패키지 수정 (`production-rules.md` 업로드 패키지 변경 완료 조건) |
| 대시보드·스크립트 코드를 고쳐야 할 때 | `superpowers:systematic-debugging` → 수정 후 `node scripts/test-client-syntax.mjs` 필수 |

## 빠른 실행 문구

- "성장 점검해줘" → 루프 A
- "ep23 업로드 전 점검해줘" → 루프 B
- "시청자 반응 분석해줘" / "틈새 찾아줘" → 루프 C
- "이번 달 리포트" → 루프 D
