# 경쟁 채널 비교(market_demand_score) 구현

마지막 갱신: 2026-08-29

## 계기

[채널 자체 적합도 점수 도입](2026-08-25-content-opportunity-score.md)에서 미룬 나머지 절반.
project1이 원래 없던 것과 달리 로컬에 남아있지 않아서(`github.com/yunyoungkil/project1` 원격에만
존재, 이 컴퓨터엔 클론 안 돼 있음) 코드를 그대로 이식하지 못하고, 결정 문서에 적힌 개념
(소형 채널 검색 → 채널 자체 baseline → outlier 탐지)만 보고 재구현함.

## 구현

`scripts/market-demand.mjs` — `data/youtube/market-demand.json` 생성.

1. 키워드 풀(`content-formats.md`/`channel-strategy.md` 기반 6개: "영어 발음 규칙", "영어 발음 원리",
   "영어 연음 축약", "왕초보 영어 발음", "영어 듣기 안 들리는 이유", "미국식 발음 규칙")로
   `search.list(type=video)` 1회씩 — 채널 소개가 아니라 실제로 관련 영상을 만든 채널을 찾기 위해.
2. 발견된 채널을 `channels.list`로 구독자 100,000명 이하만 필터링(우리 채널 규모와 비교 가능한
   채널만 — 메가 채널의 outlier는 우리가 재현 못 하는 알고리즘 도달력 문제라 신호가 아님).
3. 각 채널의 최근 업로드 25개(`playlistItems.list`)를 그 채널 자체 baseline 표본으로 삼음.
4. `videos.list`로 조회수 확보, 후보 영상의 outlierRatio = 그 채널 baseline 대비 비율.
5. 키워드별로 outlierRatio 중앙값 → `marketDemandScore`(50 = 그 채널 평균과 동일).

쿼터: `search.list`가 100 units/회로 제일 비싸서 키워드 풀을 6개로 제한. 실행당 약 632 units
(일일 10,000 한도 대비 여유 큼). `--dry-run`으로 실행 전 예상치 확인 가능.

## 발견한 버그: 원 조회수 비교는 항상 오래된 영상이 이긴다

1차 실행 결과 **6개 키워드 전부가 상한(150)을 그대로 찍었다** — 이례적으로 깔끔한 결과라 의심했고,
실제로 버그였다. 원인: 후보 영상(검색 relevance로 뽑힘, 사실상 그 채널에서 잘 된 영상)의 **원
누적 조회수**를, 최근 업로드 baseline과 그대로 비교했다. 5년 된 영상이 5.5M 조회수인데 baseline은
"최근 25개 업로드" 기준 1,894회 — 조회수는 게시 후 경과 시간에 비례해 계속 쌓이므로, 오래된 영상은
baseline보다 무조건 유리하다. 주제가 좋아서가 아니라 시간이 더 지나서 이긴 것.

**수정**: 조회수 대신 `viewCount / max(1, 게시후경과일)` = 하루당 조회수로 정규화. 후보 영상과
baseline 영상 양쪽 다 같은 방식으로 계산. 재실행 후 키워드별 점수가 142~250으로 자연스럽게
갈렸다 — 버그 수정 확인.

## 추가 보정: 5배 캡

`channel-strategy.md`의 "작은 표본은 성공으로 과장하지 않는다" 원칙에 따라, 개별 outlierRatio를
중앙값 계산 전에 5배에서 캡했다(원본 비율은 `topOutliers`에 그대로 남겨 투명성 유지). 캡 없이는
바이럴 영상 하나(예: 다니엘 잉글리시 클럽, ratio 2624)가 그 키워드 전체 점수를 지배해버린다.

## content-opportunity.mjs와의 결합 — 곱하지 않고 나란히 표시

project1 원 공식은 `content_opportunity_score = market_demand_score * (fitScore / 100)`인데,
그대로 구현하지 않았다. 우리 `byRule`(시즌1 발음 규칙: -TION/-SION/-TURE/-CIAL)과 이번 키워드 풀
("영어 발음 규칙" 등 일반 검색어)은 **같은 축이 아니다** — 하나는 우리가 이미 만든 포맷의 성과이고,
하나는 일반 청중이 검색하는 주제어다. 억지로 표를 조인하면 존재하지 않는 정밀도를 지어내는
꼴이라, `content-opportunity.mjs` 출력에 `marketDemand` 필드로 별도 노출만 하고 곱셈은 하지 않았다.
**새 소재 후보를 정할 때 사람(또는 아이디어 추천 단계)이 키워드와 후보를 직접 매칭해서 판단한다.**

## 실행

```bash
node scripts/market-demand.mjs --dry-run   # 쿼터 예상치만 확인
node scripts/market-demand.mjs             # 실제 실행, ~632 units
npm run content-opportunity                # market-demand.json이 있으면 자동으로 같이 표시
```

## 첫 실행 결과 (2026-08-29 기준)

| 키워드 | marketDemandScore | 표본 |
|---|---|---|
| 왕초보 영어 발음 | 250 (캡) | 4 |
| 미국식 발음 규칙 | 250 (캡, 표본 1이라 신뢰도 낮음) | 1 |
| 영어 듣기 안 들리는 이유 | 243.6 | 6 |
| 영어 연음 축약 | 224.7 | 5 |
| 영어 발음 규칙 | 161.1 | 6 |
| 영어 발음 원리 | 142.4 | 6 |

"영어 연음 축약"이 시즌2(문장 속 연결·축약·리듬)와 가장 직접 관련 있는 키워드라는 점이 눈에 띈다.

## 후속 업그레이드 (같은 날, "정확히 우리 채널을 성장시킬 아이디어" 요청에 대응)

수요만 보면 "다른 채널도 이미 다 다룬 포화 주제"랑 "아직 비어있는 틈새"를 구분 못 한다는 문제 제기 후
세 가지 옵션을 냈고, 사용자가 1·2번만 채택(3번=제작비용 반영은 "TTS 생성 시점에 비용을 알려주면
그때 판단하겠다"로 범위 밖 처리 — 이미 있는 `generate-tts.mjs`의 견적/승인 절차로 충분하다는 판단):

1. **경쟁 밀도 보정(`opportunityScore`)** — `search.list` 응답의 `pageInfo.totalResults`(그 키워드
   전체 검색 결과 수, YouTube 자체 근사치)를 saturation 프록시로 써서
   `opportunityScore = marketDemandScore / log10(totalResults + 10)`로 할인. 로그 스케일을 쓴 이유는
   totalResults가 수백~수십만까지 자릿수 차이가 나서 선형 나눗셈은 너무 거칠기 때문. 실행해보니
   "영어 연음 축약"이 totalResults 12,550(다른 키워드의 1/25~1/70 수준)인데도 marketDemandScore
   자체는 중간이라, opportunityScore로 보정해도 상위권 — 진짜 틈새인지는 아니지만 최소한 원 순위와
   다른 관점을 보여줌. **정밀 계산이 아니라 대략적 신호로만 쓸 것**(byKeyword의 `opportunityScore` 필드).
2. **제목 패턴 추출(`titlePatterns`)** — 그 채널 기준 이례적으로 잘 된 영상(outlierRatio ≥ 1.5)의
   제목에서 조사/불용어를 제거하고 2회 이상 반복되는 단어를 뽑음. 진짜 한국어 형태소 분석이 아니라
   공백 분리 + 불용어 필터 수준의 근사치. 실행 결과 "영어축약발음"이라는 표현이 서로 다른 3개 키워드
   검색 결과에 걸쳐 반복 등장 — 특정 검색어와 무관하게 여러 채널이 공통으로 쓰는 프레이밍이라는 신호.
   주제 선택뿐 아니라 **제목을 어떻게 지을지**에 대한 근거로 쓸 것.

`market-demand.mjs`의 기본 정렬 기준이 `marketDemandScore`에서 `opportunityScore`로 바뀌었다
(opportunityScore가 없으면 marketDemandScore로 폴백).

## 다음에 필요한 것 (썸네일 신호)

제목 패턴(`titlePatterns`)의 이미지 버전. 검색량·경쟁 채널 구독 전환과 달리 **구조적으로 막혀있지
않음** — `videos.list`가 이미 `snippet.thumbnails` URL을 돌려주는데 지금 안 쓰고 있을 뿐.

- 간단·무료: 썸네일 이미지의 색상/밝기/대비 등 기초 통계만 로컬 분석(예: `sharp`), API 비용 없음.
- 더 강력하지만 비용 발생: 얼굴/텍스트/구도 같은 실제 내용 분석은 이미지 이해 AI 호출이 필요 —
  TTS처럼 그때그때 견적 승인 필요.

지금은 착수하지 않음 — EP12 제작 + 성과 검증까지 끝난 뒤 필요성 확인되면 다시 논의
(2026-08-29 사용자 확정, "이 정도면 됐다, 실전에 써보자"로 도구 개발 일단 마무리).

## 관련 문서

- [채널 자체 적합도 점수 도입](2026-08-25-content-opportunity-score.md)
- [영상 제작 표준 워크플로우](../VIDEO_WORKFLOW.md)
