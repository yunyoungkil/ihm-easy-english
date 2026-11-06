# YouTube 예약 자동 업로드 및 발행 규칙 대시보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로컬 분석 대시보드에 채널 고정 발행 규칙 설정 UI와 백그라운드 큐 워커를 구축하여, 준비 완료된 에피소드 패키지를 감지하고 채널 일정(주 2회, 23:00 KST, 일 1회/주 2회 제한)에 맞춰 YouTube에 자동 예약 업로드 및 메타데이터를 등록한다.

**Architecture:** 복잡성과 회귀 방지를 위해 핵심 비즈니스 로직(스케줄 계산, 패키지 검사, 업로드 스로틀, 유튜브 v3 업로드)을 전용 모듈 `scripts/youtube-publisher.mjs`로 분리하고, 상시 구동 서버인 `scripts/youtube-analytics-server.mjs`에 API 엔드포인트와 대시보드 웹 UI, 5분 주기 감지 워커를 연결한다.

**Tech Stack:** Node.js (ESM), YouTube Data API v3 (Resumable Upload, Thumbnails, CommentThreads), Native `node:test` runner, Vanilla HTML/CSS/JS (대시보드 UI).

**Spec:** `docs/superpowers/specs/2026-11-06-youtube-scheduled-auto-upload-design.md`

## Global Constraints
- **에피소드 정렬**: 반드시 에피소드 번호 오름차순(`EP24 ➔ EP25 ➔ EP26...`)으로 발행 슬롯을 배정한다.
- **업로드 스로틀**: 하루 최대 1편(`maxUploadsPerDay: 1`), 일주일 최대 2편(`maxUploadsPerWeek: 2`)을 엄격히 준수한다.
- **예약 공개 강제**: 모든 자동 업로드는 `status.privacyStatus = "private"`와 `status.publishAt = "<ISO 8601>"`를 필수로 주입한다. 즉시 공개(`public`)는 일체 금지한다.
- **무단 업로드 방지**: `status.json` 내 `status: "ready_to_upload"`이며 영상 파일과 썸네일이 모두 존재하는 패키지만 업로드한다.

## Review Focus
- **과거 날짜 배정 방지**: 직전 발행일이 너무 오래된 과거(예: 수주 전)일 때, 현재 시점 이전으로 예약 시각이 계산되지 않고 반드시 내일 이후의 유효한 슬롯으로 보정되는가?
- **주 2회/일 1회 스로틀 초과 차단**: 오늘 이미 1편 업로드되었거나 최근 7일 내 2편 업로드된 상태에서 큐 워커가 동작할 때 추가 업로드가 정확히 보류되는가?
- **YouTube API 할당량/오류 시 무한 재시도 차단**: 업로드 중 토큰 만료나 네트워크 에러 시 무한 루프에 빠지지 않고 해당 패키지를 `upload_failed`로 마킹하고 중단하는가?
- **비디오 파일명 SEO 키워드 보존**: 패키지 폴더 내 임의의 `[핵심_키워드].mp4` 동영상 파일을 정확히 탐색하여 업로드하는가?
- **기존 수동 업로드 동기화와의 공존**: 사용자가 스튜디오에서 직접 올렸거나 예약 시각을 변경했을 때 기존 `syncUploadPackageStatusFromYouTube` 로직과 충돌 없이 매끄럽게 상태가 동기화되는가?

---

### Task 1: Schedule Calculation & Throttle Engine

**Files:**
- Create: `scripts/youtube-publisher.mjs`
- Test: `scripts/tests/youtube-publisher.test.mjs`

**Interfaces:**
- Produces:
  - `calculateNextPublishSlot({ lastPublishAt, publishTimeKst, allowedDaysOfWeek, scheduleMode, minIntervalDays, now }): string` (ISO UTC)
  - `sortEpisodePackages(packageDirs: string[]): string[]`
  - `isUploadAllowed({ recentUploadHistory, maxUploadsPerDay, maxUploadsPerWeek, now }): { allowed: boolean, reason?: string }`

- [ ] **Step 1: Write unit tests for slot calculation, sorting, and throttles**
  - 테스트 케이스:
    1. `sortEpisodePackages(['ep29-b-vs-v', 'ep24-long-short-i', 'ep25-pool-pull'])` ➔ `['ep24-long-short-i', 'ep25-pool-pull', 'ep29-b-vs-v']` 순 정렬 확인.
    2. 기준일이 주어졌을 때 다음 월요일 또는 목요일 23:00 KST (14:00 UTC) 슬롯이 정확히 계산되는지 확인.
    3. 과거 날짜가 기준일로 주어졌을 때 `now` 기준 다음 유효 날짜로 앞당겨지는지 확인.
    4. 지난 24시간 내 업로드 이력이 있을 때 `isUploadAllowed`가 `allowed: false`를 반환하는지 확인.
    5. 지난 7일 내 2편 이상 업로드 이력이 있을 때 `isUploadAllowed`가 `allowed: false`를 반환하는지 확인.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test scripts/tests/youtube-publisher.test.mjs`
  Expected: FAIL (module not found)

- [ ] **Step 3: Implement calculation and throttle functions in `scripts/youtube-publisher.mjs`**
  - 에피소드 정규식 매칭 `/(?:ep|s\d+-ep)(\d+)/i` 기반 숫자 정렬 구현.
  - KST/UTC 시간대 변환 및 요일 루프 알고리즘 구현.
  - 시간차(`24 * 3600 * 1000`, `7 * 24 * 3600 * 1000`) 기반 스로틀 검사 구현.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --test scripts/tests/youtube-publisher.test.mjs`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add scripts/youtube-publisher.mjs scripts/tests/youtube-publisher.test.mjs
  git commit -m "feat(publisher): add schedule slot calculation and upload throttle engine"
  ```

---

### Task 2: Package Scanner & Publish Rules Storage

**Files:**
- Modify: `scripts/youtube-publisher.mjs`
- Create: `data/youtube/publish-rules.json`
- Test: `scripts/tests/youtube-publisher.test.mjs`

**Interfaces:**
- Produces:
  - `loadPublishRules(rulesPath): Promise<PublishRules>`
  - `savePublishRules(rulesPath, rules): Promise<void>`
  - `scanReadyPackages(uploadPackagesDir): Promise<PackageInfo[]>`
  - `buildPublishQueue({ packages, rules, recentPublishedDates, now }): Promise<QueueItem[]>`

- [ ] **Step 1: Write unit tests for rules loading, package scanning, and queue building**
  - 테스트 케이스:
    1. 기본 `publish-rules.json` 생성 및 로드 검증.
    2. 가상 패키지 디렉터리(`ready_to_upload` vs `published` vs 비디오 파일 누락)에서 유효한 대상만 추출하는지 검증.
    3. 추출된 패키지들에 순차적으로 다음 발행 슬롯(`scheduledFor`)이 배정되는지 검증.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test scripts/tests/youtube-publisher.test.mjs`
  Expected: FAIL

- [ ] **Step 3: Implement scanner and queue builder in `scripts/youtube-publisher.mjs`**
  - `fs/promises`를 사용하여 `metadata.json`, `title.txt`, `description.txt`, `tags.txt`, `thumbnail.jpg`, `.mp4` 파일 존재 여부 검증.
  - `status.json` 파싱 및 `ready_to_upload` 필터링.
  - `buildPublishQueue`를 통해 패키지 목록에 계산된 `scheduledFor` 메타데이터 결합.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --test scripts/tests/youtube-publisher.test.mjs`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add scripts/youtube-publisher.mjs data/youtube/publish-rules.json scripts/tests/youtube-publisher.test.mjs
  git commit -m "feat(publisher): add package scanner and publish queue builder"
  ```

---

### Task 3: YouTube Data API v3 Resumable Upload Client

**Files:**
- Modify: `scripts/youtube-publisher.mjs`
- Test: `scripts/tests/youtube-publisher.test.mjs`

**Interfaces:**
- Produces:
  - `uploadVideoToYouTube({ pkgDir, accessToken, scheduledFor, onProgress }): Promise<{ videoId: string }>`
  - `setVideoThumbnail({ videoId, thumbnailPath, accessToken }): Promise<void>`
  - `createFirstComment({ videoId, commentText, accessToken }): Promise<{ commentId: string }>`
  - `processQueueItem({ item, accessToken, rules }): Promise<{ success: boolean, videoId?: string, error?: string }>`

- [ ] **Step 1: Write unit tests with mocked Google API responses**
  - 테스트 케이스:
    1. 세션 초기화 POST 요청의 헤더(`X-Upload-Content-Length`, `X-Upload-Content-Type`) 및 Body(`snippet`, `status.privacyStatus = "private"`, `status.publishAt`) 직렬화 검증.
    2. 업로드 완료 후 `thumbnails.set` 및 `commentThreads.insert` 호출 페이로드 검증.
    3. `status.json`이 `scheduled`로 갱신되고 `videoId`, `scheduledFor`가 기록되는지 검증.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --test scripts/tests/youtube-publisher.test.mjs`
  Expected: FAIL

- [ ] **Step 3: Implement YouTube API upload client in `scripts/youtube-publisher.mjs`**
  - Resumable upload session 생성 (`POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`).
  - `createReadStream` 파이프를 통한 동영상 바디 전송.
  - 썸네일 업로드 (`POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=...`).
  - 첫 댓글 등록 (`POST https://www.googleapis.com/youtube/v3/commentThreads?part=snippet`).
  - `status.json` 파일에 최종 결과 원자적 저장.

- [ ] **Step 4: Run test to verify it passes**
  Run: `node --test scripts/tests/youtube-publisher.test.mjs`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add scripts/youtube-publisher.mjs scripts/tests/youtube-publisher.test.mjs
  git commit -m "feat(publisher): implement YouTube Data API v3 resumable upload and metadata pipeline"
  ```

---

### Task 4: Analytics Server API Endpoints & Background Watcher

**Files:**
- Modify: `scripts/youtube-analytics-server.mjs`
- Test: `scripts/tests/youtube-publisher.test.mjs`

**Interfaces:**
- Modifies:
  - OAuth Scopes: Add `https://www.googleapis.com/auth/youtube.upload` and `https://www.googleapis.com/auth/youtube.force-ssl`
  - Routes:
    - `GET /api/schedule/rules`
    - `POST /api/schedule/rules`
    - `GET /api/schedule/queue`
    - `POST /api/schedule/upload-now`
  - Background Timer: 5-minute interval runner when `autoUploadEnabled === true`

- [ ] **Step 1: Update OAuth scope in `youtube-analytics-server.mjs`**
  - `scope` 파라미터에 `youtube.upload` 및 `youtube.force-ssl` 추가.

- [ ] **Step 2: Implement API endpoints for schedule rules, queue status, and manual upload trigger**
  - `/api/schedule/rules`: 규칙 조회 및 저장.
  - `/api/schedule/queue`: 현재 대기 패키지 목록, 배정된 일정, 스로틀 상태 반환.
  - `/api/schedule/upload-now`: 특정 패키지를 즉시 업로드 처리하는 엔드포인트.

- [ ] **Step 3: Add background worker interval**
  - 서버 시작 시 5분 주기로 `checkAndProcessAutoUploadQueue()` 실행.
  - 중복 실행 방지 락(`isUploadWorkerRunning`) 적용.

- [ ] **Step 4: Verify endpoints with local tests / curl**
  Run: `curl http://localhost:3001/api/schedule/rules`
  Expected: JSON with rules object.

- [ ] **Step 5: Commit**
  ```bash
  git add scripts/youtube-analytics-server.mjs
  git commit -m "feat(server): integrate schedule endpoints, background queue worker, and upload scopes"
  ```

---

### Task 5: Dashboard UI (Schedule Settings & Queue Card)

**Files:**
- Modify: `scripts/youtube-analytics-server.mjs` (UI HTML generation section)

**Features:**
- **발행 스케줄 설정 카드**:
  - 자동 업로드 마스터 토글 스위치 (ON / OFF).
  - 발행 시간대 입력 (기본값: 23:00).
  - 발행 요일 체크박스 (월, 화, 수, 목, 금, 토, 일 - 기본값: 월, 목).
  - 일일/주간 최대 업로드 한도 안내 (`1편/일`, `2편/주` 뱃지).
  - [설정 저장] 버튼.
- **업로드 대기 큐 테이블**:
  - 대기 에피소드 ID, 제목, 썸네일 미리보기.
  - 계산된 배정 예약 일시 (예: "2026-11-09 23:00 KST").
  - 현재 상태 (대기 중 / 업로드 중 / 완료 / 스로틀 대기).
  - [지금 업로드] 수동 실행 버튼.
  - OAuth 권한 부족 시 [채널 재연동(업로드 권한 승인)] 안내 배너.

- [ ] **Step 1: Implement HTML/CSS components in `youtube-analytics-server.mjs`**
  - 기존 에피소드 탭 또는 전용 스케줄 섹션에 대시보드 디자인 시스템 가이드라인(`brand-dashboard-design-system.md`)에 맞춘 다크 테마 카드 추가.

- [ ] **Step 2: Implement Client-side JS event handlers**
  - 규칙 저장 폼 전송 (`POST /api/schedule/rules`).
  - [지금 업로드] 클릭 시 확인 모달 및 진행 상태 스피너 표출.
  - 토글 스위치 즉시 반영.

- [ ] **Step 3: Test UI client syntax and interactions**
  Run: `node scripts/test-all-client-js.mjs`
  Expected: All client JS tests pass without syntax errors.

- [ ] **Step 4: Commit**
  ```bash
  git add scripts/youtube-analytics-server.mjs
  git commit -m "feat(ui): add schedule settings and upload queue dashboard panel"
  ```

---

### Task 6: End-to-End Verification & Health Check

**Files:**
- All modified files

- [ ] **Step 1: Run publisher unit tests**
  Run: `node --test scripts/tests/youtube-publisher.test.mjs`
  Expected: 100% tests pass.

- [ ] **Step 2: Run repository regressions test**
  Run: `npm test`
  Expected: All regression tests pass.

- [ ] **Step 3: Verify dashboard server response and UI rendering**
  Run: `curl http://localhost:3001/api/schedule/queue`
  Expected: Valid queue payload with detected ready packages (EP24~EP29) and correctly assigned slots.

- [ ] **Step 4: Commit and finalize**
  ```bash
  git add .
  git commit -m "test: verify YouTube auto-publisher and dashboard scheduling workflow"
  ```

