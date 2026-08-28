# 채널 자체 적합도 점수 도입 (project1 이식)

마지막 갱신: 2026-08-25

## 계기

사용자가 예전에 만들다 만 별도 프로젝트(`github.com/yunyoungkil/project1`)를 언급함. 같은 채널을
위해 "시장 리서치 → 기획 → TTS 에셋 → 렌더 직전"까지 만들다가 실제 렌더러(픽셀/MP4 생성)는 한 번도
구현하지 않고 멈춘 Python 프로젝트(`PROJECT_STATE.md` 기준 15단계 넘는 비주얼 승인 절차 진행 중,
테스트 1056개 통과, 영상 결과물 0개).

## 결정: 통째로 갈아타지 않고, 좁은 부분만 이식

이 저장소는 이미 작동하는 렌더러 두 개(Remotion, HyperFrames)로 실제 영상을 뽑아 구독자 99명까지
만든 상태라, 검증된 걸 버리고 미완성 프로젝트를 마저 개발하는 건 리스크가 크다고 판단함
([지금 할 일](../now.md) 참고). 대신 project1에만 있고 이 저장소엔 없던 조각 하나만 뽑음:

**`research/my_channel.py`의 `compute_topic_scores()` — 채널 자체 성과 기반 적합도 점수**

```
fitScore = clip(50 * 그룹평균유지율 / 채널평균유지율, 0, 100)
```

50 = 채널 평균과 동일, 50 초과 = 평균보다 유지율 높음. project1의 `content_opportunity_score`는
여기에 경쟁 채널 outlier 비교(`market_demand_score`)를 곱하는데, 그건 별도의 시장 리서치
파이프라인(YouTube Data API 검색 + 채널 baseline + outlier 탐지)이 필요해서 **이번엔 만들지
않았다** — 없는 데이터를 추측해서 채우지 않는다는 project1 자신의 원칙과 같은 이유.

## 이식하며 고친 것: 콘텐츠 타입별 기준선

포팅 직후 첫 실행에서 `SEASON-LONG`(롱폼) fitScore가 비정상적으로 낮게 나왔다. 원인:
YouTube Shorts의 `averageViewPercentage`는 반복 재생 때문에 100%를 넘을 수 있지만
(`SHORTS` 평균 122.3%), 롱폼(`VIDEO_ON_DEMAND`)은 넘을 수 없다(평균 36.9%). 채널 전체를 하나의
기준선으로 계산하면 롱폼이 포맷이 다르다는 이유만으로 불리해진다.

그래서 기준선을 `creatorContentType`별로 따로 계산하고, 각 영상의 유지율을 **자기 타입 기준선
대비 비율**(`retentionRatio`)로 바꾼 뒤에 그룹을 섞어서(롱폼+쇼츠가 같은 규칙 그룹에 있어도)
평균낸다. 원본 project1 코드에는 없던 보정이다 — project1은 쇼츠 전용 채널을 가정하지 않았다.

## 산출물

- `scripts/content-opportunity.mjs` — `npm run content-opportunity`로 실행
- `data/youtube/content-opportunity.json` — 포맷별(`byRole`)·시즌1 규칙별(`byRule`) 랭킹

## 첫 실행 결과 (2026-08-22 애널리틱스 스냅샷 기준)

시즌1 규칙 중에서는 **-SION(EP7)이 가장 높고(43.1) -TURE(EP8)가 가장 낮다(23.6)**.
포맷 중에서는 LEGACY(초기 실험 영상)가 가장 높고 OTHER(채널 쇼츠 C 슈와 실험 1건)가 가장 낮다 —
단, OTHER는 표본이 1개뿐이라 신뢰하기 이르다(`videoCount` 참고).

## 다음에 필요한 것 (경쟁 채널 비교를 붙이려면)

1. YouTube Data API로 소형 채널 검색 + `channels.list`/`playlistItems.list`로 baseline 계산
   (project1의 `youtube_search.py`/`channel_baseline.py`/`outlier_detector.py` 참고 — quota
   절약 기법까지 그대로 이식 가치 있음)
2. 카테고리별 검색 키워드 풀(`keyword_pool.yaml` 같은 구조)
3. `market_demand_score`를 이 스크립트의 `fitScore`와 곱해 `content_opportunity_score` 완성

지금은 착수하지 않음 — 필요성이 확인되면 다시 논의.

## 관련 문서

- [지금 할 일](../now.md)
- [채널 전략](../channel-strategy.md)
