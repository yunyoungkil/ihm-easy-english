# 자율 브리핑 시스템 구현 명세서 (실행 가이드)

> 이 문서는 [00-autonomous-briefing.md](00-autonomous-briefing.md)를 실제 코드·스킬·규칙·테스트·문서에 반영하기 위한 정밀 구현 명세다.
> 경량 구현 모델(예: Gemini 3.8 Flash High)이 **오차 없이 한 번에 구현·검증·커밋**할 수 있도록 대상 파일, 함수 계약, 기존 테스트 가드, 금지 사항을 정확히 명시한다.

---

## 0. 범위와 절대 금지 사항

### 목표
1. [00-autonomous-briefing.md](00-autonomous-briefing.md)를 브리핑의 단일 원본으로 연결하고 4중 중복·드리프트를 제거한다.
2. 예약 작업 미사용 정책(2026-11-20)과 충돌해 내일부터 가짜 경보를 울릴 `loop-health.mjs`의 36시간 `loop-ran` 버그를 수정한다.
3. `loop-health.mjs`의 강제 순환(`daySeed % N`) 숙제 출력을 실제 데이터 기반 **신호 풀(Signal Pool)**로 전환한다.
4. Gemini(Antigravity) 등 훅이 없는 환경에서 10회 이상의 도구 호출을 1회로 압축하는 **원샷 커맨드 `npm run briefing`**(`scripts/briefing.mjs`)을 신설한다.
5. 브리핑 원재료에 **직전 변경 델타(`recentChanges`)**와 **성장 시그널(`growthPulse`)**을 추가한다.
6. 142줄로 비대해진 [knowledge/now.md](../../now.md)의 낡은 10월 완료 기록·중복 항목을 정리한다.
7. 관련 테스트를 갱신·보강하고 전체 `npm test` 통과 후 변경 파일만 커밋한다.

### 절대 건드리지 말 것 (가드레일)
- `scripts/youtube-analytics-server.mjs`는 수정하지 않는다(`intent-spec.test.mjs` 탭·POST 허용 목록 보호).
- `scripts/tests/intent-spec.test.mjs`, `scripts/tests/playbook-guard.test.mjs`는 약화하거나 수정하지 않는다.
- `AGENTS.md`에서 `playbook-guard.test.mjs`가 검사하는 문구(`knowledge/playbooks/comparison-sheet-playbook.md`, `쇼츠 화면에는 위 훅 띠와 아래 정보 띠가 항상 들어간다`, `화면에 보이는 것을 바꿨으면 브라우저로 직접 열어 보고`, `appliedTo`, `origin`)는 절대 삭제하지 않는다.
- `AGENTS.md` 전체 크기는 **75,000바이트 이하**를 유지한다(`intent-spec.test.mjs` 검사).
- 모든 수정 파일과 커밋/로그에 `AGENTS.md` 0장 6번 금지 과장 표현을 쓰지 않는다(`commit-guard.mjs` 차단).
- `scripts/` 안에 새 기준 상수·숫자 리터럴이 필요하면 `// allow-literal: <이유>`를 붙인다(`commit-guard.mjs` 차단 방지).
- 가짜 숫자·대신값(`|| 100` 등)을 절대 넣지 않는다.

---

## Task 1. `scripts/loop-health.mjs` — 예약 작업 미사용 대응 + 신호 풀(Signal Pool) 전환

### 1-1. `checkLoopHealth` 수정
- 시그니처에 `scheduledLoopEnabled = false` 옵션을 추가한다(2026-11-20 결정: 예약 작업 미사용).
- 동작 규칙:
  - **`scheduledLoopEnabled === true`일 때만** 기존처럼 `dailyLoop` 부재 또는 `loopAge > LIMITS.loopHours * H`이면 `loop-ran` 문제를 추가한다.
  - **`scheduledLoopEnabled === false`(기본값)일 때**: `dailyLoop`가 없거나 36시간이 지나도 `loop-ran`을 띄우지 않는다. 단, `dailyLoop?.steps` 안에 `s && s.ok === false`인 단계가 남아 있으면 `loop-step` 문제는 **그대로 보고**한다(실제 실패한 단계를 숨기지 않음).
  - 나머지 **실제 데이터 신선도 및 정합성 검사**(`sync-stale`, `views7d-gap`, `audience-stale`, `competitors-stale`, `pattern-gap`, `brief-sources`, `next-input-stale`, `old-reports-done`, `brief-input`, `research-stale`, `research-thin`)는 모두 그대로 유지한다.
- `loadLoopHealth(projectDir, now = new Date(), {scheduledLoopEnabled = false} = {})`도 옵션을 받아 `checkLoopHealth`로 전달한다.

### 1-2. 워크플로우·코드 위생 "강제 로테이션" → "신호 풀(Signal Pool)" 전환
- **새 순수 함수 2개 추가 (export)**:
  1. `collectWorkflowSignals({now, loopHealth, dailyLoop, studioResearch, koreanTrends, outlierReports, transformSheets})`:
     - 실제 관측된 항목만 배열(`Array<{area, severity: 'urgent'|'upgrade', finding, proposal}>`)로 돌려준다.
     - 고장(`loopHealth.ok === false`)이 있으면 `problems`를 `severity: 'urgent'`로 맨 앞에 넣는다.
     - 고장이 없을 때는 실제 데이터상 존재하는 업그레이드 후보(스튜디오 조사 2단계 전환, 옛 방식 배수 리포트 비중, 시트 7일 성과 미정산, 국내 트렌드 누락/실패)만 담는다.
     - 후보가 0개면 **빈 배열 `[]`**을 돌려준다(억지 `healthy` 더미 숙제를 만들지 않음).
  2. `collectCodebaseHygieneSignals({dormantFiles = [], staleCopy = [], untestedActiveScripts = []} = {})`:
     - 실제 존재하는 후보만 `{dormantFiles, staleCopy, untestedActiveScripts, totalCount}` 형태로 정리해 돌려준다.
     - 각 배열 항목은 과도한 출력을 막기 위해 상위 3건 요약(`sample`)과 전체 개수(`count`)를 함께 담되, 실제 파일명·사유를 그대로 유지한다.
     - 후보가 없으면 `totalCount: 0`, 빈 배열을 돌려준다.
- **로더 함수 2개 추가 (export)**:
  - `loadWorkflowSignals(projectDir, now = new Date(), loopHealth = null)`
  - `loadCodebaseHygieneSignals(projectDir, now = new Date())`
- **기존 함수 호환 유지**:
  - `diagnoseWorkflowLoop`, `loadWorkflowLoopDiagnosis`, `diagnoseCodebaseHygiene`, `loadCodebaseHygieneDiagnosis`는 외부 호출이나 기존 테스트가 깨지지 않도록 유지하되, 내부에서 `collectWorkflowSignals` / `collectCodebaseHygieneSignals` 결과를 재사용해 중복 로직을 없앤다.

---

## Task 2. `scripts/growth-check.mjs` — `recentChanges` + `growthPulse` + 신호 풀 탑재

### 2-1. `recentChanges` 추가 (직전 이후 실제 변화 델타)
- `execFileSync('git', ['log', '-n', '5', '--pretty=format:%h\t%cs\t%s'], {cwd: projectDir, encoding: 'utf8', timeout: 3000})`와 `git status --porcelain`을 `try/catch`로 안전하게 실행한다(git 미설치·오류 시 `null` 반환, 크래시 금지).
- 반환 형태:
  ```js
  {
    recentCommits: [{hash, date, subject}], // 최대 5건
    dirtyCount: number,                     // 미커밋 변경 파일 수
  }
  ```

### 2-2. `growthPulse` 추가 (채널 성장 우선 시그널, 실제 데이터 기반)
- 이미 읽은 `catalogVideos`, `backlog`, `shortsStatuses`, `reviewsDue`, `packages`만 재사용해 파일 추가 읽기 없이 계산한다:
  - `reviewsDue`: 기존 `reviewsDue.map((r) => ({name: r.name, kind: r.kind, age: r.age, due: r.due}))`
  - `upcomingSettlements`: 공개 완료(`isPublic(v)`)이고 공개 후 경과 일수(`daysSince(v.publishedAt)`)가 **5~10일** 사이인 영상 목록(`{videoId, title, format, daysSince, settleDate}` — `settleDate`는 `publishedAt + 7일` KST `YYYY-MM-DD`).
  - `nextScheduledByFormat`: 예약(`status === 'scheduled'`)된 미래 영상 중 가장 가까운 `{longform: {name, date} | null, shorts: {name, date} | null}` 및 각 형식의 남은 예약 편수(`scheduledCounts: {longform, shorts}`).

### 2-3. `briefing` 객체 확장
`growth-check.mjs`의 `briefing` 객체에 아래 필드를 넣는다:
- `recentChanges`
- `growthPulse`
- `workflowSignals`: `loadWorkflowSignals(projectDir, today, loopHealth)`
- `hygieneSignals`: `loadCodebaseHygieneSignals(projectDir, today)`
- 기존 `loopHealth`는 그대로 유지하되, 브리핑 출력에서 강제 1건 로테이션(`workflowDiagnosis`, `hygieneDiagnosis`) 대신 `workflowSignals` / `hygieneSignals`를 우선 사용한다.

---

## Task 3. `scripts/growth-rules.mjs` — 자율 브리핑 지침 및 신호 풀 기반 컨텍스트 개편

### 3-1. `BRIEFING_INSTRUCTION` 갱신
- 고정 7줄 양식과 `episode-planning 0-C` 의무 제목 강제를 제거하고, 아래 핵심만 짧게 압축해 넣는다(토큰 절약):
  - 시작 문구: `"업데이트를 요약해서 먼저 보고드립니다."` + `(동기화 MM/DD HH:MM · 통계 ~MM/DD)`
  - 유일한 원본 문서: `knowledge/playbooks/briefing/00-autonomous-briefing.md` (핵심이 여기 있으므로 모호할 때만 열기)
  - 우선순위: ① 채널·콘텐츠·성장 현실(성과·정산·다음 슬롯·승인 대기) → ② AI 데이터 기반 자율 보수·진화(자동 보수 결과 또는 진행할 삭제·수정·업그레이드·기능 추가의 근거) → ③ 시스템/Git/문서 예외(문제·변화 있을 때만, 정상·변화 없으면 생략)
  - 3단계 권한선: 🟢 무과금·안전한 복구·밀린 리뷰·버그/낡은 문구/미참조 코드 정리는 묻지 않고 처리 후 검증 보고 / 🟡 기능 추가·구조 개선·기획 초안은 근거를 밝히고 추진(Gate 1 전 정지) / 🔴 3대 승인 관문(시트·렌더·업로드/일정)·유료 비용·공개 영상 수정·불변 규칙 변경은 승인 필수
  - 자기 개선 브레이크: 영상 완성도·데이터 신뢰도·토큰 절감 중 하나를 실제로 높이지 못하면 건드리지 않고 콘텐츠 성장에 집중. 사용자 요청이 함께 있으면 브리핑을 짧게 끝내고 요청을 최우선 처리.

### 3-2. `briefingLines(check, briefing)` 개편
- **제목·기준 시각**: `- 기준 시각: 동기화 ${kstLabel(data.syncedAt)}, 통계 ~${data.statsEnd || '?'} (${data.sync || '상태 미확인'})`
- **1순위 채널·성장 블록**:
  - `weekly` (기존과 동일한 정확한 수치 계산 유지)
  - `recent` (7일 내 공개 영상 성적, 없으면 생략)
  - `growthPulse` (밀린 리뷰, 7일 정산 도래/임박 영상, 형식별 다음 예약 일정과 빈 슬롯 여부 — 실제 값이 있을 때만 출력)
  - `shortsLink` (기존 조건 유지: `shortsLink.missing`이면 `"자료 없음(동기화 필요)"`, 0회로 꾸며내지 않음)
  - `upcoming` (48시간 이내 공개 또는 업로드 실패가 있을 때만)
  - `comments` (최근 7일 시청자 댓글, 답 없는 댓글이 있거나 새 댓글이 있을 때)
- **2순위 운영·자동화 블록**:
  - `afterPublish`: 기존 수동 안내("사용자가 스튜디오에서 직접...")를 삭제하고, **`- 사후 관리 미완료(자동 파이프라인 확인 필요): ...`**로 교체(미완료 항목이 있을 때만 출력).
  - `missingThumbnails`: 있을 때만 출력.
  - `loopHealth`: `ok === true`이면 `- 시스템 건강: 정상` 1줄(또는 마지막 동기화 기준), `ok === false`이면 고장 목록 그대로 출력 + "브리핑 직후 묻지 않고 원인을 고치고 검증 보고".
  - **참고 신호 풀 (`workflowSignals` + `hygieneSignals`)**:
    - 실제 후보가 **1개 이상 있을 때만** `- 참고 신호 풀(의무 보고 아님 — 성장·신뢰도·토큰에 실제 이득이 있을 때만 AI가 선별해 자동 보수 또는 근거 보고 후 추진):` 아래에 1줄 요약으로 제공.
    - 후보가 0개면 **아예 줄을 출력하지 않는다.**
  - `recentChanges`: 최근 커밋이 있거나 `dirtyCount > 0`일 때만 1줄 요약(`최근 커밋 N건: <최신 3건 제목>, 미커밋 M개`).
- **하위 호환 주의**:
  - `buildBriefingContext(null, actions)` / `buildBriefingContext(check, actions)`의 기존 분기 안전성과 **전체 출력 6,000자 미만 상한**을 반드시 유지한다(`growth-rules.test.mjs`).
  - `afterPublishTasks` 함수 자체의 반환 구조(`{key, text}`)와 로직은 `after-publish.test.mjs`가 검증하므로 그대로 유지한다.

---

## Task 4. 원샷 브리핑 커맨드 `scripts/briefing.mjs` 신설 + `session-briefing-hook.mjs` 경량화

### 4-1. `scripts/briefing.mjs` 신설 & `package.json` 등록
- 실행 예:
  - `npm run briefing` (동기화 확인 + 필요시 사후 관리 + 브리핑 원재료 1회 출력)
  - `node scripts/briefing.mjs --no-sync` (네트워크/대시보드 호출 없이 로컬 파일만으로 즉시 출력 — 테스트·오프라인용)
  - `node scripts/briefing.mjs --json` (구조화 JSON 출력)
- 내부 동작:
  1. `ensureGitHooks()` 실행 (커밋 전 자동 검사 보장).
  2. `--no-sync`가 아닐 때만 `syncIfStale({timeoutMs: 60000})` 실행.
     - `syncNote === '방금 동기화함'`일 때만 `runPostPublishPipeline()`을 후속 실행한다(이미 30분 내 동기화돼 생략된 경우 매번 불필요한 YouTube API/브라우저 호출을 반복하지 않음 — 토큰·시간 절약).
  3. `growth-check.mjs --json` 실행 결과를 파싱(timeout 20000ms).
  4. `knowledge/now.md`에서 `extractNextActions(...)`, `latestHandoff(projectDir)`로 `handoffLine(...)`, 그리고 `knowledge/handoff/LATEST.md`가 있으면 핵심 35줄 이내 요약을 가져온다.
  5. `buildBriefingContext(check, nextActions, handoff)`로 완성된 브리핑 컨텍스트를 stdout에 출력한다(`--json`이면 `{syncNote, context, check, nextActions, latestSummary}` 출력).
- `package.json` `"scripts"`에 `"briefing": "node scripts/briefing.mjs"` 추가.

### 4-2. `scripts/session-briefing-hook.mjs` 경량화
- 48행 주석 `12시간` → `30분`으로 수정.
- 44~46행의 매 세션 무조건 `spawn('outlier-report.mjs', ['--ensure-frames', '--install'])` 실행을 **실제로 `frames` 이미지가 빠진 리포트가 로컬에 있을 때만** 실행하도록 조건 분기한다(간단한 `existsSync` 체크 1회로 불필요한 매 세션 백그라운드 프로세스 생성 제거).
- `setupAutomationChrome()` 호출은 유지하되 실패 시 대화 시작을 절대 막지 않는다.

---

## Task 5. 단일 원본 문서 정합화 (`AGENTS.md` + `.claude/` + `.agents/`)

### 5-1. `AGENTS.md`
- `### 세션 시작 시 성장 브리핑 (2026-11-06)` 절을 **짧고 명확하게 개정**한다:
  - 유일한 원본으로 `knowledge/playbooks/briefing/00-autonomous-briefing.md`를 명시.
  - 훅이 없는 에이전트(Gemini 등)는 `git pull` → 대시보드(3001) 확인 후 **`npm run briefing` 한 번으로** 브리핑 재료를 확보한다.
  - 시작 문구는 **`업데이트를 요약해서 먼저 보고드립니다.`** + 기준 시각 병기.
  - 기존의 2026-11-19 의무 4건 숙제(`diagnoseWorkflowLoop` 1건 + `diagnoseCodebaseHygiene` 각 1안 강제 제시) 문구를 제거하고, **데이터 기반 AI 자율 보수·진화(삭제·수정·업그레이드·기능 추가) + 3단계 권한선 + 자기 개선 브레이크**로 교체한다.
- 수정 후 `AGENTS.md` 크기가 75,000바이트 이하이고 `playbook-guard.test.mjs`가 검사하는 모든 문구가 그대로 남아 있는지 확인한다.

### 5-2. `.claude/` 및 `.agents/` `00-unblock-and-weekly.md` 동기화
- 두 파일(`.claude/skills/episode-planning/references/00-unblock-and-weekly.md`, `.agents/skills/episode-planning/references/00-unblock-and-weekly.md`)의 `## 0-C. 시작 브리핑` 절을 **동일하게** 정리한다:
  - 상세 규칙·권한선·자율 진화 기준은 `knowledge/playbooks/briefing/00-autonomous-briefing.md`를 단일 원본으로 참조.
  - 고정 9줄 템플릿과 의무 4건 숙제 표 항목, 옛 수동 `after-publish-done.json` 안내는 제거.
  - `.agents/` 파일에 있던 *"매 브리핑마다 Gemini 환경 정상 1줄 강제 출력"* 문구를 삭제하고 **"플러그인·MCP·훅 누락 등 실제 환경 이상이 감지될 때만 1줄 경고"**로 변경한다.

---

## Task 6. `knowledge/now.md` 낡은 기록 대청소 (142줄 → 40줄 이내 슬림화)

- **삭제할 구역**:
  - 48~133줄 전체: 10월 초 옛 기록(`## ✅ 제작 완료 (업로드 대기) — 단편 EP23~29`, 이미 공개·예약 완료된 항목들 — 이력은 `knowledge/logs/`와 `handoff/`에 보존됨).
  - 33~46줄: `## 🔜 지금 막힌 곳 (2026-11-06 점검)` 중 이미 현실과 어긋나는 옛 내용(`EP24~29 미공개`, `쇼츠 9/2 이후 0개` 등).
  - `## ▶ 다음 할 일` 안에서 이미 완료된 항목(`커뮤니티 게시물 관리 구축 완료`, `자동화 파이프라인 자율화 완료`, `결정됨: TTS`, `11/13~16 새벽 루프 확인`, 이미 끝난 방향 점검 완료 목록 서술 등).
- **반드시 남길 살아있는 항목 (`## ▶ 다음 할 일`, 급한 순서, 1항목 1~2줄로 간결하게)**:
  1. `EP24 롱폼(ep24-long-short-i, 11/09 공개) 7일 성과 리뷰 정산 (Phase 11 — 공개 10일+ 경과)`
  2. `차기 쇼츠(12/05 토 슬롯) 기획 착수 — 최신 조사 후보 기반 비교 시트 v4 작성 (Gate 1 승인 대기)`
  3. `11/23(월) 사용자 확인: 스튜디오 EP23 제목·썸네일 A/B 테스트 결과 확인 후 REVIEW.md 기록`
  4. `11/25(수) 이후: EP30 쇼츠(Ng6amm9qFrI, 11/18 공개) 7일 성과 정산 및 style-experiments.md 기록 + 경쟁 쇼츠 SbQVBQoRciA v2 배수 재확인`
  5. `12/08(화) 이후: EP31 쇼츠(AkDKw4o_C58, 12/01 예약) 7일 성과 정산 및 style-experiments.md 기록`
  6. `스튜디오 조사 목록 단계 전환(설계안 유지): 2단계(pickReportTargets 전환, 수집 6일+ ok 달성 시, ~11/21 이후) → 3단계(구 손입력 목록 정리, ~12/05 이후 직전 사용자 재확인)`
  7. `(차차) 대시보드 남은 수리: ① 400px 모바일 헤더 버튼 넘침 방지 ② 쇼츠 빌드 시 carve 자동 실행 ③ 검색 피드 탭 Playwright 클릭 검사`
  8. `(차차) 무료 생성 자동화 후속: Lyria 3.5 음악·Omni 영상 전용 스크립트화`
- 맨 아래 `## 관련 문서` 링크는 유지한다. `extractNextActions`가 1개 이상 정상 추출되는지 확인한다.

---

## Task 7. 테스트 갱신·신규 가드 테스트 추가·검증·커밋

### 7-1. 기존 테스트 갱신
- `scripts/tests/loop-health.test.mjs`:
  - `scheduledLoopEnabled: false`(기본값)일 때 `dailyLoop: null` 또는 37시간 경과가 `loop-ran`을 띄우지 않는 테스트 추가.
  - `scheduledLoopEnabled: true`일 때 기존처럼 `loop-ran`을 띄우는 테스트 유지.
  - `dailyLoop.steps`의 실패(`ok: false`)는 예약 작업 꺼짐 여부와 무관하게 항상 `loop-step`을 띄우는 테스트 유지.
  - `collectWorkflowSignals`와 `collectCodebaseHygieneSignals`가 후보 없을 때 빈 배열 / `totalCount: 0`을 정직하게 돌려주는 테스트 추가.
- `scripts/tests/growth-rules.test.mjs` & `scripts/tests/briefing-data.test.mjs`:
  - 새 시작 문구(`업데이트를 요약해서 먼저 보고드립니다.`), `00-autonomous-briefing.md` 참조, `recentChanges`, `growthPulse`, 신호 풀 조건부 출력(후보 0개면 생략), `context.length < 6000` 검증에 맞게 업데이트.
- `scripts/tests/briefing-sync.test.mjs`:
  - 1행 주석 `12시간` → `30분`으로 정정.

### 7-2. 신규 가드 테스트 추가: `scripts/tests/briefing-playbook-guard.test.mjs`
- `package.json` `"test"` 스크립트 목록에 등록한다.
- 검증 항목:
  1. `knowledge/playbooks/briefing/00-autonomous-briefing.md` 존재 및 핵심 절(`## 0.`, `## 1.`, `## 2.`, `## 3.`, `## 4.`, `## 5.`, `## 6.`) 포함 여부
  2. `AGENTS.md`, `.claude/skills/episode-planning/references/00-unblock-and-weekly.md`, `.agents/skills/episode-planning/references/00-unblock-and-weekly.md`, `scripts/growth-rules.mjs` 4곳 모두 `00-autonomous-briefing.md`를 참조하는지 확인
  3. `package.json`에 `"briefing"` 스크립트가 있고 `node scripts/briefing.mjs --no-sync`가 정상 종료(exit 0)하며 출력 길이가 6,000자 미만인지 확인
  4. `.agents/skills/episode-planning/references/00-unblock-and-weekly.md`에 구 강제 문구(`Gemini 환경: 동일`)가 남아 있지 않은지 확인

### 7-3. 필수 검증 명령 및 마감
1. `npm test` 실행 — 전체 pass / fail 0 확인
2. `node scripts/briefing.mjs --no-sync` 실행 — 출력 내용·글자 수·가독성 직접 확인
3. `node -e "console.log('AGENTS bytes:', require('fs').statSync('AGENTS.md').size)"` — 75,000 이하 확인
4. `knowledge/logs/2026-11.md`의 2026-11-20 절에 변경 근거·내용·검증 결과 기록 + `knowledge/handoff/LATEST.md` 최신화
5. `git status` 확인 후 **내가 바꾼 파일만 이름으로 `git add`** (`git add -A`, `git add .` 금지), 실제 실행 모델 서명(`Co-Authored-By: ...`)을 붙여 커밋·푸시
6. 완료 보고는 `AGENTS.md` 0장 1번 틀(바꾼 파일 / 실행한 확인 명령과 출력 줄 그대로 / 확인하지 못한 것)로 보고한다.
