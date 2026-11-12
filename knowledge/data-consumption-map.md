# 데이터 소비 지도

마지막 확인: 2026-11-12 (Claude, 코드에서 파일 이름을 찾아 하나씩 확인함)

## 원칙

데이터는 대시보드를 꾸미려고 모으지 않는다. **기획, 제작, 판정 중 한 곳에 실제로 들어가야 한다.** 들어가는 곳이 없으면 연결하거나 수집을 멈춘다(2026-11-12 사용자 결정).

`data/youtube/` 아래에 새 파일이나 폴더를 만들면 아래 표에 한 줄을 더한다. 빠지면 `npm test`의 `scripts/tests/data-consumption-map.test.mjs`가 실패한다. 이 시험은 "쓰는 곳" 칸에 적은 파일이 실제로 있고, 그중 하나 이상이 그 데이터 이름을 코드나 문서에 실제로 담고 있는지도 확인한다.

## 쓰임 등급

| 등급 | 뜻 |
|---|---|
| 자동 결정 | 코드가 읽고 판정이나 행동을 스스로 바꾼다. 사람이나 Claude의 기억에 기대지 않는다 |
| 기획 입력(지시) | 스킬 문서가 Claude에게 "읽어라"라고 시킨다. Claude가 그 단계를 건너뛰면 쓰이지 않는다 |
| 표시만 | 대시보드 화면에만 나온다. 결정에 들어가지 않는다 |
| 운영 | 루프·안전장치가 스스로 돌기 위한 내부 기록 |
| 없음 | 아무 코드도 문서도 읽지 않는다 |

## 지도

| 데이터 | 만드는 곳 | 쓰는 곳 | 쓰임 등급 | 빈틈·조치 |
|---|---|---|---|---|
| `catalog.json` | 대시보드 동기화(`/api/sync`) | `scripts/planning-outcome.mjs`, `scripts/growth-check.mjs`, `scripts/loop-health.mjs`, `scripts/competitor-lifecycle.mjs` | 자동 결정 | 공개 7일 성적 판정, 경쟁 채널 승격·차단의 원천. 충분히 쓰임 |
| `views-7d.json` | `scripts/planning-outcome.mjs` | `scripts/planning-outcome.mjs` | 자동 결정 | 공개 첫 7일 조회수 판정. 충분히 쓰임 |
| `analytics-latest.json` | 대시보드 동기화 | `scripts/briefing-sync.mjs`, `scripts/growth-check.mjs`, `scripts/loop-health.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md` | 기획 입력(지시) | **가장 큰 빈틈.** 영상별 시청 지속률·트래픽·검색어가 다 있는데, "잘된 영상과 안된 영상의 공통점"을 뽑는 코드가 없다. 브리핑은 7일 합계만 쓴다. → 다음 기획 입력 파일에서 상·하위 비교를 자동으로 만든다 |
| `video-reach-manual.json` | 스튜디오에서 내보낸 폴더 자동 읽기(`/api/studio-scan`) | `scripts/growth-check.mjs`, `scripts/youtube-analytics-server.mjs`, `.claude/skills/episode-planning/references/02-title-and-thumbnail.md` | 기획 입력(지시) | 유튜브 API가 주지 않는 노출수·클릭률의 유일한 원천. 이름에 "manual"이 붙어 있지만 내용은 스튜디오 내보내기 파일을 자동으로 읽은 것이다. 썸네일 기획 때 클릭률 상·하위를 보라는 지시만 있고 자동 비교는 없다 → 다음 기획 입력 파일에 넣는다 |
| `comments.json` | 대시보드 동기화(우리 채널 댓글) | `scripts/growth-check.mjs`, `.claude/skills/episode-planning/references/03-script-and-narration.md`, `.claude/skills/episode-planning/references/08-insights-and-monthly.md` | 기획 입력(지시) | 우리 시청자의 실제 질문인데 묶어서 세는 코드가 없다 → 다음 기획 입력 파일에서 질문을 모은다 |
| `success-patterns.json` | `scripts/success-patterns.mjs`(7일 판정 결과로 자동 기록) | `scripts/success-patterns.mjs`, `scripts/loop-health.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md` | 기획 입력(지시) | 2026-11-12 기준 0개. 표본이 작아 판정이 대부분 보류라서 생긴 정직한 빈칸이다. 고칠 것은 없다 |
| `idea-board-history.json` | 기획 스킬이 등록(`/api/idea-board/history/register`) | `scripts/youtube-analytics-server.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md` | 운영 | 같은 소재를 다시 고르지 않게 막는 목록. 의도 명세 시험이 빠진 편을 잡는다 |
| `market-demand.json` | `scripts/market-demand.mjs`, `scripts/keyword-backlog.mjs`, 매일 루프 | `scripts/competitor-lifecycle.mjs`, `scripts/keyword-backlog.mjs`, `scripts/outlier-report-backlog.mjs`, `scripts/loop-health.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md` | 자동 결정 | 경쟁 채널 상태, 키워드 순환, 리포트 대상 선정에 쓰임. 다만 아웃라이어 제목 패턴은 기획 때 지시로만 쓰인다 |
| `outlier-comments/` | 아웃라이어 댓글 분석(`scripts/outlier-report-backlog.mjs`) | `scripts/outlier-report-backlog.mjs`, `scripts/youtube-analytics-server.mjs` | 표시만 | 고민·질문·표현은 `audience-dna.json`으로 넘어간다. **"설명이 통한 지점(whatWorked)"과 "제작 제안"은 화면에만 나온다** → 합친 리포트로 바꾼다 |
| `script-insights/` | 아웃라이어 대본 분석(`scripts/analyze-competitor-script.mjs`) | `scripts/analyze-competitor-script.mjs`, `scripts/youtube-analytics-server.mjs` | 표시만 | **훅·구조·비유·우리식 대본은 화면에만 나온다.** 또 프롬프트에 우리 철학과 분류 목록이 박혀 있어 관찰이 그 틀로 왜곡된다. AI가 추측한 "경쟁 영상의 빈틈"이 시청자 고민(`painPoint`)으로 저장된다(26개) → 합친 리포트와 연출 자료집으로 바꾼다 |
| `audience-dna.json` | 위 두 분석이 자동으로 쌓음(300개) | `scripts/loop-health.mjs`, `scripts/analyze-competitor-script.mjs`, `.claude/skills/episode-planning/references/01-topic-and-data.md`, `.claude/skills/episode-planning/references/03-script-and-narration.md` | 기획 입력(지시) | 300개가 순위 없이 쌓여 있다. 그중 41개(`competitorScript`)는 시청자 댓글이 아니라 대본 분석에서 왔고, 그 안의 26개는 AI가 추측한 "경쟁 영상의 빈틈"이 고민(`painPoint`)으로 저장된 것이다 → 다음 기획 입력 파일에서 시청자 댓글 출처만 세어 상위 항목을 뽑는다 |
| `thumb-feed-cache.json` | 검색 피드 탭(`scripts/thumb-feed.mjs`) | `scripts/youtube-analytics-server.mjs`, `.claude/skills/episode-planning/references/02-title-and-thumbnail.md` | 기획 입력(지시) | 실제 검색 결과 캐시. 썸네일 정할 때 사람이 눈으로 본다. 그대로 둔다 |
| `content-opportunity.json` | `npm run content-opportunity`(손으로 실행) | `scripts/youtube-analytics-server.mjs` | 없음 | 2026-08-28 이후 갱신 없음. 서버에 통로(`/api/content-opportunity`)는 있지만 화면도 스킬도 부르지 않는다 → 삭제 후보(승인 대기) |
| `packaging-registry.json` | 2026-08 손으로 만든 목록(1개, EP9) | `scripts/youtube-analytics-server.mjs` | 운영 | 스튜디오 폴더 읽기가 참고하는 옛 목록. 항목이 1개뿐이다 → 정리 후보(코드 확인 필요) |
| `publish-rules.json` | 손으로 둔 공개 일정 규칙 | `scripts/growth-check.mjs`, `scripts/youtube-analytics-server.mjs` | 운영 | 공개 간격 점검에 쓰임 |
| `after-publish-done.json` | 공개 후 자동 작업 | `scripts/growth-check.mjs`, `scripts/growth-rules.mjs` | 운영 | 고정 댓글 등 공개 후 할 일 중복 방지 |
| `analysis-failures.json` | 리포트 분석 실패 기록 | `scripts/daily-loop.mjs`, `scripts/youtube-analytics-server.mjs` | 운영 | 영구 실패 영상을 다시 시도하지 않게 막는다 |
| `daily-loop.json` | 매일 루프 | `scripts/daily-loop.mjs`, `scripts/loop-health.mjs` | 운영 | 브리핑의 자동 루프 점검 줄 |
| `daily-loop-server.log` | 매일 루프가 띄운 서버의 기록 | `scripts/daily-loop.mjs` | 운영 | 고장 원인 확인용 |
| `snapshots/` | 동기화마다 한 장씩(152개, 61MB, 깃에 안 올림) | `scripts/youtube-analytics-server.mjs` | 없음 | 쓰기만 하고 읽는 곳이 없다 → 저장을 멈추거나 최근 몇 개만 남기는 것 결정 필요(승인 대기) |
| `studio-browser-profile/` | 옛 스튜디오 자동 브라우저 프로필(23MB, 깃에 안 올림) | `.gitignore` | 없음 | 지금 코드에서 쓰는 곳이 없다 → 내 PC에서 지워도 되는지 승인 대기 |
| `studio-debug.png` | 2026-08-30 옛 스튜디오 자동화 디버그 캡처(깃에 안 올림) | 없음 | 없음 | 만드는 코드도 없다 → 내 PC에서 삭제 후보(승인 대기) |
| `ab-simulator-state.json` | 2026-11-11에 지운 A/B 시뮬레이터 | 없음 | 없음 | 남은 찌꺼기 → 삭제 후보(승인 대기) |
| `idea-board-manual-draft.json` | 2026-09-13 손으로 쓴 아이디어 초안 | 없음 | 없음 | 남은 찌꺼기 → 삭제 후보(승인 대기) |
| `idea-board-state.json` | 2026-11-11에 지운 아이디어 보드 | 없음 | 없음 | 서버에는 설명 주석만 남아 있다 → 삭제 후보(승인 대기) |
| `thumbnail-registry.json` | 2026-08 손으로 만든 목록 | 없음 | 없음 | 남은 찌꺼기 → 삭제 후보(승인 대기) |

## 데이터 밖에서 쌓이는 분석

| 데이터 | 쓰는 곳 | 쓰임 등급 | 빈틈·조치 |
|---|---|---|---|
| `output/insights/*.md`, `output/script-insights/*.md` (사람이 읽는 리포트) | 대시보드 | 표시만 | 위 두 폴더와 같은 내용을 글로 쓴 것 |
| `videos/*/REVIEW.md` (7편), `knowledge/growth/` | 기획 스킬 11단계 "다음 영상에 적용할 것" | 기획 입력(지시) | 지시로만 읽힌다 → 다음 기획 입력 파일에 최근 리뷰의 교훈을 모은다 |
| `knowledge/visual-reference-analysis.md` (2026-09-16, 1편) | 없음 | 없음 | 연출 자료집의 첫 시도. 스킬이 읽지 않는다 → 연출 자료집으로 옮긴다 |

## 가장 큰 빈틈 네 가지 (2026-11-12)

1. **우리 영상 성적이 기획으로 돌아오지 않는다.** 지속률·클릭률·트래픽이 다 있는데 상·하위 비교를 만드는 코드가 없다.
2. **경쟁 영상 분석의 핵심(훅, 구조, 설명 방식, 연출)이 화면에만 있다.** 그리고 분석 프롬프트가 우리 철학과 미리 정한 분류로 결과를 왜곡한다.
3. **시청자 고민 300개가 순위 없이 쌓이고, AI 추측(26개)이 시청자 고민으로 섞여 있다.**
4. **"기획 입력(지시)" 등급은 Claude가 그 단계를 건너뛰면 그대로 끊긴다.**

## 고치는 순서

1. 이 지도와 시험(지금)
2. 찌꺼기 파일 정리(사용자 승인 후)
3. **다음 기획 입력 파일**: 매일 루프가 위 1·3번 빈틈을 한 장으로 만든다(출처와 표본 수 표시, 표본이 모자라면 "가설"). 기획 스킬 1단계가 이 파일을 먼저 읽고, `BRIEF.md` 기획 근거 칸이 이 파일을 인용하게 해서 4번 빈틈을 줄인다
4. **합친 아웃라이어 리포트와 연출 자료집**: 대본·댓글·화면을 한 리포트로 묶고, 철학과 분류 목록을 프롬프트에서 뺀다. 화면 연출은 캡처와 함께 쌓아 제작 단계에서 후보로 꺼낸다
