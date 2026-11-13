# 데이터 소비 지도

마지막 확인: 2026-11-12 (Claude, 코드에서 파일 이름을 찾아 하나씩 확인함)

## 원칙

데이터는 대시보드를 꾸미려고 모으지 않는다. **기획, 제작, 판정 중 한 곳에 실제로 들어가야 한다.** 들어가는 곳이 없으면 연결하거나 수집을 멈춘다(2026-11-12 사용자 결정).

`data/youtube/` 아래에 새 파일이나 폴더를 만들면 아래 표에 한 줄을 더한다. 빠지면 `npm test`의 `scripts/tests/data-consumption-map.test.mjs`가 실패한다. 이 시험은 "쓰는 곳" 칸에 적은 파일이 실제로 있고, 그중 하나 이상이 그 데이터 이름을 코드나 문서에 실제로 담고 있는지도 확인한다.

## 쓰임 등급

| 등급 | 뜻 |
|---|---|
| 자동 결정 | 코드가 읽고 판정이나 행동을 스스로 바꾼다. 사람이나 Claude의 기억에 기대지 않는다 |
| 기획 입력(자동) | 코드가 매일 `next-episode-input.md` 한 장으로 요약하고, 기획 스킬이 그 파일에서 출발하며, 새 편 `BRIEF.md`가 그 파일을 인용해야 시험을 통과한다 |
| 기획 입력(지시) | 스킬 문서가 Claude에게 "읽어라"라고 시킨다. Claude가 그 단계를 건너뛰면 쓰이지 않는다 |
| 표시만 | 대시보드 화면에만 나온다. 결정에 들어가지 않는다 |
| 운영 | 루프·안전장치가 스스로 돌기 위한 내부 기록 |
| 없음 | 아무 코드도 문서도 읽지 않는다 |

## 지도

| 데이터 | 만드는 곳 | 쓰는 곳 | 쓰임 등급 | 빈틈·조치 |
|---|---|---|---|---|
| `catalog.json` | 대시보드 동기화(`/api/sync`) | `scripts/planning-outcome.mjs`, `scripts/growth-check.mjs`, `scripts/loop-health.mjs`, `scripts/competitor-lifecycle.mjs` | 자동 결정 | 공개 7일 성적 판정, 경쟁 채널 승격·차단의 원천. 충분히 쓰임 |
| `views-7d.json` | `scripts/planning-outcome.mjs` | `scripts/planning-outcome.mjs` | 자동 결정 | 공개 첫 7일 조회수 판정. 충분히 쓰임 |
| `baselines.json` | `scripts/baseline.mjs`(매일 루프 `baselines` 단계) | `scripts/next-episode-input.mjs` 9절 | 기획 입력(자동) | 형식·지표별 기준선(현재 최고)과 갱신 기준. 챔피언이 바뀌면 이전 챔피언은 history에 더해진다. 2026-11-13 신설 |
| `retention/` | `scripts/retention-curves.mjs`(매일 루프 `retention` 단계) | `scripts/next-episode-input.mjs` 10절 | 기획 입력(자동) | 영상별 시청 유지 곡선(100개 지점)과 가장 큰 이탈 구간. 조회가 형식 중앙값 이상이고 공개 7일 넘은 영상만, 14일마다 다시 받는다. 2026-11-13 신설 |
| `studio-metrics.json` | `scripts/studio-export.mjs`(매일 루프 `studioExport` 단계, Studio-Automation 크롬) | `scripts/next-episode-input.mjs` | 기획 입력(자동) | 스튜디오 고급 모드 영상별 표 14칸(노출수·클릭률·신규/재방문 시청자·계속 시청함 등)을 7일·28일·전체로 저장. 지금은 "신규·재방문 시청자"와 "쇼츠 계속 시청함"만 다음 기획 입력 11절에 쓴다. 노출수·CTR은 같은 zip을 기존 가져오기(`video-reach-manual.json`)에도 넘겨 그쪽이 읽는다. 나머지 칸(평균 조회율 등)은 API 값과 대조했고 아직 판정에 쓰지 않는다. 2026-11-13 신설 |
| `video-lifetime.json` | `scripts/video-lifetime.mjs`(매일 루프 `lifetime` 단계) | `scripts/baseline.mjs`, `scripts/sheet-outcomes.mjs` | 자동 결정 | 영상별 전체 기간 수치와 공개 첫 7일(first7d) 조회수·평균 시청 시간·구독. 기준선(평균 시청 시간·구독 수)과 비교 시트 결과 기록에 쓴다(전체 기간은 채널 첫날부터 물어야 카탈로그 조회수와 맞는다). 2026-11-13 신설 |
| `next-episode-input.md` | `scripts/next-episode-input.mjs`(매일 루프, `npm run next-input`) | `.claude/skills/episode-planning/references/01-topic-and-data.md`, `scripts/loop-health.mjs` | 기획 입력(자동) | 2026-11-12 신설. 아래 여러 데이터를 한 장으로 요약한 기획의 출발점. 기획 스킬 1단계가 가장 먼저 읽고, EP30부터 `BRIEF.md` 기획 근거의 `다음 기획 입력` 줄로 인용한다(의도 명세 시험·브리핑 점검이 강제) |
| `analytics-latest.json` | 대시보드 동기화 | `scripts/next-episode-input.mjs`, `scripts/briefing-sync.mjs`, `scripts/growth-check.mjs`, `scripts/loop-health.mjs` | 기획 입력(자동) | 영상별 평균 시청 비율과 검색어가 다음 기획 입력 2·3절로 들어간다(2026-11-12). 트래픽 소스는 아직 브리핑에만 쓰인다 |
| `video-reach-manual.json` | 스튜디오에서 내보낸 폴더 자동 읽기(`/api/studio-scan`) | `scripts/next-episode-input.mjs`, `scripts/growth-check.mjs`, `scripts/youtube-analytics-server.mjs` | 기획 입력(자동) | 유튜브 API가 주지 않는 노출수·클릭률의 유일한 원천. 이름에 "manual"이 붙어 있지만 스튜디오 내보내기 파일을 자동으로 읽은 것이다. 가장 최근 기간 클릭률이 다음 기획 입력 2절로 들어간다(2026-11-12) |
| `comments.json` | 대시보드 동기화(우리 채널 댓글) | `scripts/next-episode-input.mjs`, `scripts/growth-check.mjs` | 기획 입력(자동) | 최근 60일 시청자 댓글 원문이 다음 기획 입력 4절로 들어간다(2026-11-12 기준 최근 60일 0개, 전체 7개) |
| `success-patterns.json` | `scripts/success-patterns.mjs`(7일 판정 결과로 자동 기록) | `scripts/next-episode-input.mjs`, `scripts/success-patterns.mjs`, `scripts/loop-health.mjs` | 기획 입력(자동) | 2026-11-12 기준 0개. 표본이 작아 판정이 대부분 보류라서 생긴 정직한 빈칸이다. 개수가 다음 기획 입력 1절에 나온다 |
| `idea-board-history.json` | 기획 스킬이 등록(`/api/idea-board/history/register`) | `scripts/youtube-analytics-server.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md` | 운영 | 같은 소재를 다시 고르지 않게 막는 목록. 의도 명세 시험이 빠진 편을 잡는다 |
| `market-demand.json` | `scripts/market-demand.mjs`, `scripts/keyword-backlog.mjs`, 매일 루프 | `scripts/competitor-lifecycle.mjs`, `scripts/keyword-backlog.mjs`, `scripts/outlier-report-backlog.mjs`, `scripts/loop-health.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md` | 자동 결정 | 경쟁 채널 상태, 키워드 순환, 리포트 대상 선정에 쓰임. 다만 아웃라이어 제목 패턴은 기획 때 지시로만 쓰인다 |
| `outlier-comments/` | 아웃라이어 댓글 분석(`scripts/outlier-report-backlog.mjs`) | `scripts/outlier-report-backlog.mjs`, `scripts/youtube-analytics-server.mjs` | 표시만 | 고민·질문·표현은 `audience-dna.json`으로 넘어간다. **"설명이 통한 지점(whatWorked)"과 "제작 제안"은 화면에만 나온다.** → 2026-11-12: 매일 루프의 자동 생성을 멈췄다. 합친 리포트가 이 영상들을 따라잡으면(하루 6편, 약 4일) 예전 코드와 파일을 지운다 |
| `script-insights/` | 아웃라이어 대본 분석(`scripts/analyze-competitor-script.mjs`) | `scripts/analyze-competitor-script.mjs`, `scripts/youtube-analytics-server.mjs` | 표시만 | **훅·구조·비유·우리식 대본은 화면에만 나온다.** 또 프롬프트에 우리 철학과 분류 목록이 박혀 있어 관찰이 그 틀로 왜곡된다. AI가 추측한 "경쟁 영상의 빈틈"이 시청자 고민(`painPoint`)으로 저장됐다(26개). → 2026-11-12: 매일 루프의 자동 생성을 멈추고(합친 리포트가 대신), 프롬프트에서 철학·분류 목록을 빼고, 시청자 고민에 넣던 코드를 지웠다. 이미 있는 리포트는 화면에서만 본다. 합친 리포트가 따라잡으면 예전 코드와 파일을 지운다 |
| `outlier-reports/` | 합친 아웃라이어 리포트(`scripts/outlier-report.mjs`, `npm run outlier-report -- <영상ID>`) | `scripts/next-episode-input.mjs`, `scripts/outlier-report.mjs`, `scripts/youtube-analytics-server.mjs`, `.claude/skills/episode-planning/references/04-visual-and-assets.md` | 기획 입력(자동) | 2026-11-12 신설. 경쟁 영상 한 편을 제목·썸네일·화면·자막·댓글로 한 번에 관찰한다. 프롬프트에 우리 철학·분류 목록이 없고, 인용은 코드가 원문과 대조하며, 컷 간격은 ffmpeg가 잰다. 다음 기획 입력 7절로 들어가고, 화면 변화는 연출 자료집(`npm run visual-library`)으로 제작 단계에서 꺼낸다. 사람은 `/outlier-reports` 화면에서 캡처와 함께 본다 |
| `transform-sheets/` | 비교 시트(`scripts/transform-sheet.mjs`, 경쟁 영상 리포트를 우리 콘텐츠로 바꾼 한 장 + 우리 쪽 이미지 `images/<영상ID>/`, 2026-11-12 신설) | `scripts/transform-sheet.mjs`, `scripts/next-episode-input.mjs`, `scripts/outlier-report-view.mjs`, `scripts/youtube-analytics-server.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md` | 기획 입력(자동) | 경쟁 소재를 쓰는 편은 대본 전에 이 시트를 만든다(좌우 비교, 항목마다 바꾼 이유, 다른 경쟁 영상에서 가져온 것·뺀 것을 이유·근거와 함께). 다음 기획 입력 8절로 들어가고, EP30부터 `BRIEF.md`가 `비교 시트:` 줄로 가리키지 않으면 의도 명세가 실패한다. 상태(초안→승인→공개→성적)와 기각된 안도 보관해 "이렇게 바꿔 만들었더니 이랬다"가 데이터로 쌓인다 |
| `outlier-frames/` | 합친 아웃라이어 리포트가 만드는 화면 캡처(1초 간격 3장 띠, 깃에 안 올림) | `scripts/outlier-report-view.mjs`, `scripts/outlier-report.mjs`, `.claude/skills/episode-planning/references/04-visual-and-assets.md` | 기획 입력(지시) | 제작 단계에서 화면 구성 후보를 고를 때 Claude가 열어 보고, 리포트·연출 자료집 화면에 나온다. 깃에 올리지 않는 대신 리포트에 적힌 시각으로 PC마다 다시 만든다(대시보드가 열 때, Claude Code 세션 시작 훅, 매일 루프 `outlierFrames` — Gemini는 안 부름) |
| `audience-dna.json` | 2026-11-12부터 합친 아웃라이어 리포트가 쌓음(댓글 원문 인용이 확인된 어려움·질문·표현만, `scripts/audience-dna.mjs` 규칙). 그 전 259개는 예전 댓글 분석이 쌓은 것 | `scripts/next-episode-input.mjs`, `scripts/loop-health.mjs`, `scripts/outlier-report.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md` | 기획 입력(자동) | 시청자 댓글 출처가 있는 고민·질문만 출처 영상 수로 순위를 매겨 다음 기획 입력 5절로 들어간다(2026-11-12). 41개(`competitorScript`)는 대본 분석에서 왔고, 그중 26개는 AI가 추측한 "경쟁 영상의 빈틈"이 고민으로 저장된 것이라 순위에서 뺐고, 2026-11-12에 그 41개를 파일에서도 지웠다(대본 분석은 더 이상 이 파일에 쓰지 않는다) |
| `thumb-feed-cache.json` | 검색 피드 탭(`scripts/thumb-feed.mjs`) | `scripts/youtube-analytics-server.mjs`, `.claude/skills/episode-planning/references/02-title-and-thumbnail.md` | 기획 입력(지시) | 실제 검색 결과 캐시. 썸네일 정할 때 사람이 눈으로 본다. 그대로 둔다 |
| `packaging-registry.json` | 2026-08 손으로 만든 목록(1개, EP9) | `scripts/youtube-analytics-server.mjs` | 운영 | 스튜디오 폴더 읽기가 참고하는 옛 목록. 항목이 1개뿐이다 → 정리 후보(코드 확인 필요) |
| `publish-rules.json` | 손으로 둔 공개 일정 규칙 | `scripts/growth-check.mjs`, `scripts/youtube-analytics-server.mjs` | 운영 | 공개 간격 점검에 쓰임 |
| `after-publish-done.json` | 공개 후 자동 작업 | `scripts/growth-check.mjs`, `scripts/growth-rules.mjs` | 운영 | 고정 댓글 등 공개 후 할 일 중복 방지 |
| `analysis-failures.json` | 리포트 분석 실패 기록 | `scripts/daily-loop.mjs`, `scripts/youtube-analytics-server.mjs` | 운영 | 영구 실패 영상을 다시 시도하지 않게 막는다 |
| `daily-loop.json` | 매일 루프 | `scripts/daily-loop.mjs`, `scripts/loop-health.mjs` | 운영 | 브리핑의 자동 루프 점검 줄 |
| `daily-loop-server.log` | 매일 루프가 띄운 서버의 기록 | `scripts/daily-loop.mjs` | 운영 | 고장 원인 확인용 |
| `snapshots/` | (2026-11-12 저장 멈춤) | 없음 | 없음 | **삭제됨.** 동기화마다 한 장씩 쓰기만 하고 읽는 곳이 없었다(152개, 61MB). 그중 124개는 `.gitignore`에 넣기 전에 깃에 올라가 있어서 깃에서도 지웠다. 다른 PC에 남은 나머지는 지운다 |
| `studio-browser-profile/` | (옛 스튜디오 자동 브라우저 프로필, 깃에 안 올림) | 없음 | 없음 | **삭제됨**(23MB). 쓰는 코드가 없다. 다른 PC에 남아 있으면 지운다 |
| `studio-debug.png` | (2026-08-30 옛 디버그 캡처, 깃에 안 올림) | 없음 | 없음 | **삭제됨.** 다른 PC에 남아 있으면 지운다 |

## 지운 것 (2026-11-12 사용자 승인 "전부 지우고 쭉 진행해")

| 지운 것 | 이유 |
|---|---|
| `ab-simulator-state.json`, `idea-board-state.json` | 2026-11-11에 지운 A/B 시뮬레이터·아이디어 보드의 찌꺼기. 읽는 곳 없음 |
| `idea-board-manual-draft.json`(2026-09-13), `thumbnail-registry.json`(2026-08) | 손으로 만든 옛 목록. 읽는 곳 없음 |
| `content-opportunity.json`, `scripts/content-opportunity.mjs`, 서버 `/api/content-opportunity`, `npm run content-opportunity` | 2026-08-28 이후 갱신 없음. 화면도 스킬도 부르지 않았다. 역할별 지속률 기준선 같은 계산이 필요하면 다음 기획 입력 파일에서 지금 데이터로 새로 한다 |
| 서버의 `snapshots/` 저장 | 위 표 참고. 최신 값은 `analytics-latest.json` 한 장으로 충분하다 |

## 데이터 밖에서 쌓이는 분석

| 데이터 | 쓰는 곳 | 쓰임 등급 | 빈틈·조치 |
|---|---|---|---|
| `output/insights/*.md`, `output/script-insights/*.md` (사람이 읽는 리포트) | 대시보드 | 표시만 | 위 두 폴더와 같은 내용을 글로 쓴 것 |
| `videos/*/REVIEW.md` (7편), `knowledge/growth/` | `scripts/next-episode-input.mjs` | 기획 입력(자동) | 공개일이 적힌 리뷰의 "다음 영상에 적용할 것"이 다음 기획 입력 6절로 들어간다(2026-11-12, 지금은 EP23 1편) |
| `knowledge/visual-reference-analysis.md` (2026-09-16, 1편) | 없음 | 없음 | 연출 자료집의 첫 시도. 스킬이 읽지 않는다 → 연출 자료집으로 옮긴다 |

## 가장 큰 빈틈 네 가지 (2026-11-12 확인 → 같은 날 1·3·4번 처리)

1. ~~**우리 영상 성적이 기획으로 돌아오지 않는다.**~~ → 다음 기획 입력 2절(같은 형식 상·하위 비교)로 처리.
2. ~~**경쟁 영상 분석의 핵심(훅, 구조, 설명 방식, 연출)이 화면에만 있다.** 그리고 분석 프롬프트가 우리 철학과 미리 정한 분류로 결과를 왜곡한다.~~ → 합친 아웃라이어 리포트(`outlier-reports/`)가 다음 기획 입력 7절과 연출 자료집으로 들어가고, 분석 프롬프트 세 곳에서 철학·분류 목록을 뺐다(의도 명세 시험이 실제로 보내는 프롬프트를 가로채 확인).
3. ~~**시청자 고민 300개가 순위 없이 쌓이고, AI 추측(26개)이 시청자 고민으로 섞여 있다.**~~ → 다음 기획 입력 5절에서 시청자 댓글 출처만 순위를 낸다. 저장 단계에서 섞이는 것은 4번(합친 리포트)에서 고친다.
4. ~~**"기획 입력(지시)" 등급은 Claude가 그 단계를 건너뛰면 그대로 끊긴다.**~~ → 주요 데이터를 "기획 입력(자동)"으로 올렸다. EP30부터 `BRIEF.md`가 입력 파일을 인용하지 않으면 시험과 브리핑이 알린다. `thumb-feed-cache.json`처럼 사람이 눈으로 보는 것은 지시로 남는다.

## 고치는 순서

1. 이 지도와 시험 — 2026-11-12 완료
2. 찌꺼기 파일 정리 — 2026-11-12 완료
3. **다음 기획 입력 파일** — 2026-11-12 완료: 매일 루프가 위 1·3번 빈틈을 한 장으로 만든다(출처와 표본 수 표시, 표본이 모자라면 "가설"). 기획 스킬 1단계가 이 파일을 먼저 읽고, `BRIEF.md` 기획 근거 칸이 이 파일을 인용하게 해서 4번 빈틈을 줄인다
4. **합친 아웃라이어 리포트와 연출 자료집** — 2026-11-12 완료: 대본·댓글·화면을 한 리포트로 묶고, 철학과 분류 목록을 프롬프트에서 뺀다. 화면 연출은 캡처와 함께 쌓아 제작 단계에서 후보로 꺼낸다
