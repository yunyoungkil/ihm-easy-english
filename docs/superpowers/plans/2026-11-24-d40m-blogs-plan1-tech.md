# d40m.com 새 블로그 — 계획 1: 공통 기반 + 쿠팡 블로그(tech.d40m.com) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 블로그 2개를 열고 검색 등록까지 끝낸 뒤, 쿠팡 블로그가 집 PC에서 클로드로 혼자 글을 쓰고 점검을 통과한 글만 올리게 만든다.

**Architecture:** 손으로 하는 설정(구글 클라우드·구글 블로그·가비아·네이버·다음, 사용자 로그인 필요)을 먼저 끝내고, 코드는 `scripts/blog/` 아래 작은 파일로 나눈다: 구글 허락 토큰, 쿠팡 파트너스 API, 글 점검, 글 쓰기(클로드 대화 없이 실행), 게시, 한 번 실행을 묶는 지휘 파일, 브리핑 한 줄. 데이터는 `data/blog/`에 두고 매일 루프와 같은 방식(`syncData`)으로 깃에 올린다.

**Tech Stack:** Node.js ESM, `node:test`, Blogger API v3, Search Console API(사이트맵), 쿠팡 파트너스 Open API(HMAC), Claude Code CLI(`claude.exe -p`), 윈도우 작업 스케줄러, 외부 AI 티 검사기(`check_ai_tells.py`), 기존 `scripts/banned-terms.mjs`.

**Spec:** `knowledge/decisions/2026-11-24-d40m-two-blogs-design.md` (사용자 승인 2026-11-24)

## 전체 순서 (계획 3개)

| 계획 | 범위 | 쓰는 때 |
|---|---|---|
| **1 (이 문서)** | 두 블로그 개설·주소·기본 페이지·검색 등록·www 첫 화면 + 쿠팡 블로그 자동 운영 → 첫 1편 사용자 확인 → 일정 켜기 | 지금 |
| 2 | 영어 블로그 복습 글(영상 임베드 시각 이동, 퀴즈, 광고 자리), 업로드 패키지 설명란 링크, 롱폼 마무리 체인에 "복습 글" 단계 | 다음 롱폼 예약 전 |
| 3 | 4주 결과 모으기(서치 콘솔·블로그 통계·쿠팡 subId 실적·애드센스)와 속도·주제 조절 | 자동 일정을 켠 지 4주 뒤 |

## Global Constraints

- 대가 문구(원문 그대로, 글 맨 위 첫 문단): `이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`
- 써 본 척 금지 낱말·표현: 써 보니, 사용해 보니, 직접 써, 내돈내산, 실사용, 후기(제목·본문의 경험 주장), 지어낸 1인칭 경험.
- 다루지 않는 해결 단계: 기기 분해, 배터리 교체·충전 개조, 전원·전기 배선, 펌웨어 강제 설치·초기화 우회, 보증이 무효가 되는 조치 → "제조사 서비스센터로" 안내까지만. 데이터가 지워지는 단계(초기화 등)는 백업 안내를 먼저 둔다.
- 글마다 사실 확인표: 해결 단계마다 출처 문장(원문 그대로). 출처 문장이 없는 단계는 뺀다.
- 주소·이름: `tech.d40m.com` "가전·디지털 해결 노트", `english.d40m.com` "이해하면 쉬운영어 복습 노트". 운영자 표기는 블로그 이름만(쿠팡 블로그 "가전·디지털 해결 노트 운영자", 영어 블로그 "이해하면 쉬운영어"). 실명·이메일을 화면에 쓰지 않는다(문의는 구글 블로그 문의 양식).
- 구글 계정: d40m.com 블로그·서치 콘솔은 프로젝트 크롬 두 번째 계정(`/u/1/`). 기존 www 블로그 ID `1816781696920932166`.
- 속도(가설): 처음 4주 주 3편, 하루 1편 이하, 밀린 글을 몰아 올리지 않는다.
- 무인 실행: 집 PC(`DESKTOP-UA9AKL2`)에서만. 클로드 허용 도구는 웹 검색·웹 읽기·글 파일 쓰기만(브라우저·로그인 화면·git·게시 권한 없음). 쿠팡 키(`COUPANG_PARTNERS_ACCESS_KEY`, `COUPANG_PARTNERS_SECRET_KEY`, `.env`)는 클로드에게 넘기지 않는다.
- 쿠팡 링크: 해결에 실제로 필요한 물건일 때만. 블로그 링크에는 채널 구분값(subId) `techd40m`을 붙인다(가족의 가게 구매와 나눠 세기). 링크에는 `rel="sponsored nofollow"`를 붙인다(구글의 제휴 링크 표시 규칙, Claude 판단).
- 멈춤: 점검 실패 3번 연속이면 무인 실행이 스스로 멈춘다(`data/blog/tech-paused.json`). 서치 콘솔·애드센스·쿠팡 경고는 주 1회 대화 안에서 화면으로 본다. 다시 켜기는 사용자 승인.
- 사용자 손: 캡차·확인 창·허락 화면·로그인은 사용자가 누른다. 블로그에 바로 반영되는 작업은 한 편(한 블로그)으로 먼저 시험하고 바깥에서 열어 본 뒤 나머지를 한다.
- 저장소 규칙: 새 테스트 파일은 `package.json`의 `test` 목록에 이름을 더한다(목록이 파일 이름을 하나씩 적는 방식). 코드 속 기준 숫자에는 `// allow-literal: <이유>`. 커밋은 바꾼 파일만 이름으로, 서명 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`(실제 모델 이름). 완료 보고는 AGENTS.md 0번 1항 틀.
- 시청자용 한글(블로그 글·페이지 문구)은 AI 티 검사와 금지어 검사를 통과해야 한다.

## Review Focus

1. **구글 허락이 7일 뒤 끊김**(구글 클라우드 앱이 "테스트" 상태면 갱신 토큰이 7일 만에 죽는다) → 무인 실행은 글을 만들다 말고 멈추지 않고 결과를 `auth-failed`로 남기고, 브리핑에 뜬다. 테스트: Task 9 `tech-run` "토큰 갱신 실패 → auth-failed, 게시 0".
2. **새벽 2시의 날짜**: 작업 스케줄러는 한국 시각으로 돌지만 `toISOString()`은 전날(UTC)이다 → 기록 날짜·"오늘 이미 올렸나"·요일 판단은 모두 한국 날짜. 테스트: Task 9 "UTC 17:00(한국 02:00) → 한국 날짜 사용".
3. **같은 날 두 번 실행**(스케줄러 재시도, 손으로 다시 실행) → 두 번째는 올리지 않는다. 테스트: Task 9 "오늘 게시 기록 있음 → already-posted-today".
4. **클로드가 깨진 결과·빈 파일을 내거나 시간 초과** → 게시하지 않고 `writer-failed`. 점검 실패 3번 연속 숫자에는 넣지 않는다(글 품질이 아니라 실행 문제). 테스트: Task 9.
5. **출처 사이트가 로봇을 막음(403·429)** → 그 단계는 "확인 불가"로 점검 실패(`source-unreachable`). 기준을 낮춰 통과시키지 않는다. 테스트: Task 6 `checkTechPost`.

---

## A. 손으로 하는 설정 (사용자 로그인·허락 필요)

### Task 1: 구글 공식 통로(Blogger·Search Console) 허락 토큰

**Files:**
- Create: `scripts/blog/google-auth.mjs`
- Modify: `.gitignore` (`.blogger-oauth-token.json` 추가)
- Test: `scripts/tests/blog-google-auth.test.mjs`

**Interfaces:**
- Produces: `getBlogAccessToken({projectDir, fetchImpl, now}) -> Promise<string|null>` (토큰 없거나 갱신 실패면 `null`), `BLOG_SCOPES` = `'https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/webmasters'`, CLI `node scripts/blog/google-auth.mjs login`(한 번만), 토큰 파일 `.blogger-oauth-token.json`.

- [ ] **Step 1: 구글 클라우드 준비 (브라우저, 사용자 클릭)** — 프로젝트 크롬에서 `console.cloud.google.com`을 열어 OAuth 클라이언트 프로젝트 `content-pilot-7eb03`(유튜브 연동과 같은 것)를 연 계정을 찾는다. 그 프로젝트에서 Blogger API v3, Google Search Console API를 켜고, 기존 웹 클라이언트의 승인된 리디렉션 주소에 `http://localhost:3007/oauth2callback`을 더한다. OAuth 동의 화면의 게시 상태가 "프로덕션"인지 본다("테스트"면 Review Focus 1 때문에 사용자에게 알리고 프로덕션으로 바꿀지 묻는다). 기록: 바꾼 것과 게시 상태를 인수인계에 한 줄.
- [ ] **Step 2: 실패하는 테스트 작성** — `getBlogAccessToken`: ① 만료 60초 전보다 남은 토큰은 그대로 돌려준다 ② 만료된 토큰은 `refresh_token`으로 갱신해 파일에 저장하고 새 토큰을 돌려준다 ③ 갱신 응답이 400이면 `null` ④ 토큰 파일이 없으면 `null`. `fetchImpl`은 가짜.
- [ ] **Step 3: 실패 확인** — `node --test scripts/tests/blog-google-auth.test.mjs` → FAIL(모듈 없음).
- [ ] **Step 4: 구현** — 갱신 방식은 `scripts/youtube-analytics-server.mjs`의 `getAccessToken`(약 186행)과 같게, `YOUTUBE_CLIENT_ID`/`YOUTUBE_CLIENT_SECRET`을 그대로 쓴다. `login`은 포트 3007에 임시 서버를 띄우고 `prompt: 'select_account consent'`, `access_type: 'offline'`로 허락 화면 주소를 출력한다. 콜백에서 토큰을 받은 뒤 `GET https://www.googleapis.com/blogger/v3/blogs/1816781696920932166`이 200일 때만 저장한다(다른 계정이면 저장하지 않음 — 유튜브 쪽 `isOurChannel`과 같은 이유).
- [ ] **Step 5: 통과 확인** — 같은 명령 → PASS. `npm test` 목록에 파일 추가 후 `npm test` → `# fail 0`.
- [ ] **Step 6: 실제 허락 (사용자 클릭)** — `node scripts/blog/google-auth.mjs login` → 프로젝트 크롬에서 주소를 열고 `/u/1/` 계정 선택·허락은 사용자가 누른다. 확인: `node -e "import('./scripts/blog/google-auth.mjs').then(m=>m.getBlogAccessToken({projectDir:'.'})).then(t=>console.log(!!t))"` → `true`.
- [ ] **Step 7: 커밋** — `.gitignore`, `scripts/blog/google-auth.mjs`, 테스트, `package.json`.

### Task 2: 블로그 2개 개설·주소 연결·기본 페이지 (쿠팡 블로그 먼저)

**Files:**
- Create: `data/blog/blogs.json`
- Create: `output/blog/pages/tech-about.md`, `tech-privacy.md` (게시한 페이지 원문 보관)

**Interfaces:**
- Produces: `data/blog/blogs.json` = `{ "home": {"blogId": "1816781696920932166", "url": "https://www.d40m.com/"}, "tech": {"blogId": string, "url": "https://tech.d40m.com/", "name": "가전·디지털 해결 노트"}, "english": {"blogId": string, "url": "https://english.d40m.com/", "name": "이해하면 쉬운영어 복습 노트"} }` — 이후 모든 Task가 블로그 ID를 여기서 읽는다.

- [ ] **Step 1: 쿠팡 블로그 만들기 (프로젝트 크롬, `/u/1/`)** — 구글 블로그 "새 블로그"로 이름 "가전·디지털 해결 노트", 임시 blogspot 주소. 설정: 언어 한국어, 시간대 서울, 검색엔진 노출 켜기, HTTPS 사용. 블로그 ID를 `blogs.json`에 적는다.
- [ ] **Step 2: 주소 연결** — 설정 → 맞춤 도메인 `tech.d40m.com` 입력 → 구글 블로그가 보여 주는 CNAME(`tech` → `ghs.google.com`, 확인용 한 줄이 나오면 그것도)을 받아 적는다. **가비아 로그인은 사용자**가 프로젝트 크롬에서 하고, DNS 관리 화면에 Claude가 레코드를 넣는다(확인 창은 사용자가 누름). 반영을 기다린 뒤 맞춤 도메인 저장, HTTPS 리디렉션 켜기.
- [ ] **Step 3: 바깥 확인** — `curl -s -o /dev/null -w "%{http_code}" https://tech.d40m.com/` → `200`, `http://` 접속이 `https://`로 넘어가는지.
- [ ] **Step 4: 기본 페이지** — 소개·개인정보처리방침 페이지(운영자 표기는 Global Constraints 그대로, 실명·이메일 없음), 문의 양식 가젯. 페이지 문구는 `output/blog/pages/`에 원문 보관하고 AI 티 검사(`python -X utf8 C:/Users/yunyo/Downloads/slop-rewrite/.claude/skills/slop-rewrite/scripts/check_ai_tells.py <파일> --genre 줄글 --strict`, 종료 코드 0)와 `npm run check-terms -- output/blog/pages`를 통과시킨 뒤 올린다. 테마 고르기·수정은 빌더 판단(모바일 폭에서 본문 글자 16px 이상).
- [ ] **Step 5: 휴대폰 폭으로 열어 보기** — 프로젝트 크롬에서 400px 폭 캡처로 글자 겹침·넘침 확인(AGENTS.md 0번 13항).
- [ ] **Step 6: 영어 블로그 같은 순서** — 이름 "이해하면 쉬운영어 복습 노트", `english.d40m.com`, 운영자 "이해하면 쉬운영어". 페이지 원문은 `output/blog/pages/english-*.md`. 글이 0편이므로 광고는 켜지 않는다(Task 4 Step 4).
- [ ] **Step 7: 커밋** — `data/blog/blogs.json`, `output/blog/pages/*`.

### Task 3: www.d40m.com 첫 화면 소개

**Files:**
- Create: `output/blog/pages/home-intro.html` (넣은 원문 보관)

- [ ] **Step 1: 소개 넣기** — www 블로그(ID `1816781696920932166`)의 첫 화면이 "게시물 없음" 대신 두 블로그 소개(이름·한 줄 설명·주소 링크 2개)를 보이게 한다. 방법(테마 HTML 가젯 / 고정 소개 글 1편)은 빌더 판단. 문구는 Task 2 Step 4와 같은 두 검사를 통과.
- [ ] **Step 2: 바깥 확인** — `curl -s https://www.d40m.com/ | grep -c "tech.d40m.com"` ≥ 1, `english.d40m.com`도 ≥ 1, 휴대폰 폭 캡처 확인.
- [ ] **Step 3: 커밋** — `output/blog/pages/home-intro.html`.

### Task 4: 검색 등록과 광고 설정

**Files:**
- Modify: `data/blog/blogs.json` (각 블로그에 `registrations: {google, naver, daum}` 날짜·상태)

- [ ] **Step 1: 구글** — Task 1 토큰으로 `PUT https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Ad40m.com/sitemaps/<인코딩한 https://tech.d40m.com/sitemap.xml>` (english도). 확인: 같은 주소 `GET` 200, 서치 콘솔 화면 사이트맵 목록에 2개.
- [ ] **Step 2: 네이버 서치어드바이저 (네이버 로그인은 사용자)** — 블로그마다 사이트 등록 → HTML 태그 확인 방식 → 구글 블로그 테마 `<head>`에 메타 태그 → 확인 → 사이트맵(`/sitemap.xml`)·RSS(`/feeds/posts/default?alt=rss`) 제출.
- [ ] **Step 3: 다음 웹마스터도구 (카카오 로그인 있음)** — 블로그마다 등록, 다음이 요구하는 확인 방식(로봇 파일 PIN이면 구글 블로그 "맞춤 robots.txt"에 넣는다. 기본 robots 줄은 지우지 않는다).
- [ ] **Step 4: 애드센스** — d40m.com 사이트 설정에서 자동 광고 상태 확인. `tech.d40m.com`은 자동 광고 켬, `english.d40m.com`은 계획 2 전까지 광고 끔(URL 그룹 등 애드센스가 주는 방법, 빌더 판단). 화면 캡처로 설정 확인.
- [ ] **Step 5: 기록·커밋** — `blogs.json`의 `registrations`, 인수인계 한 줄.

## B. 코드 (쿠팡 블로그 자동 운영)

### Task 5: 데이터 저장소와 깃 동기화 범위

**Files:**
- Create: `scripts/blog/blog-store.mjs`
- Modify: `scripts/loop-data-sync.mjs:19-24` (`SYNC_INCLUDE`에 `'data/blog'`)
- Test: `scripts/tests/blog-store.test.mjs`

**Interfaces:**
- Produces:
  - `kstDate(now: Date) -> 'YYYY-MM-DD'`, `kstWeekday(now: Date) -> 0..6` (한국 시각 기준)
  - `readQueue(dir) -> Topic[]`, `shiftQueue(dir, topicId) -> void` — `Topic = {topicId, title, kind: 'fix'|'before-buy', searchQuery, sourceHints: string[], productHint: string|null}`, 파일 `data/blog/tech-queue.json`
  - `readPosts(dir) -> PostRecord[]`, `appendPost(dir, PostRecord)` — `PostRecord = {date, topicId, title, url, postId, sources: string[], productUrl: string|null}`, 파일 `data/blog/tech-posts.json`
  - `appendRun(dir, RunRecord)`, `readRuns(dir)` — `RunRecord = {date, startedAt, outcome: 'published'|'preview'|'rejected'|'deferred'|'writer-failed'|'auth-failed'|'paused'|'not-writing-day'|'already-posted-today'|'queue-empty', topicId?, reasons?: string[]}`, 파일 `data/blog/tech-runs.json`
  - `readPause(dir) -> {paused: boolean, since?, reason?}`, `writePause(dir, reason, now)`, 파일 `data/blog/tech-paused.json`

- [ ] **Step 1: 실패하는 테스트** — `kstDate(new Date('2026-11-24T17:00:00Z'))` → `'2026-11-25'`; `kstWeekday` 같은 시각 → `3`(수). 빈 폴더에서 `readQueue` → `[]`, `readPause` → `{paused: false}`. `appendRun` 두 번 → `readRuns` 길이 2.
- [ ] **Step 2: 실패 확인** — `node --test scripts/tests/blog-store.test.mjs` → FAIL.
- [ ] **Step 3: 구현** — JSON 파일 읽기·쓰기(없으면 기본값). 날짜는 `Asia/Seoul` 기준(`Intl.DateTimeFormat`).
- [ ] **Step 4: 통과 확인 + `loop-data-sync` 테스트** — `node --test scripts/tests/blog-store.test.mjs scripts/tests/loop-data-sync.test.mjs` → PASS.
- [ ] **Step 5: 커밋**.

### Task 6: 글 점검 (`checkTechPost`)

**Files:**
- Create: `scripts/blog/check-post.mjs`
- Test: `scripts/tests/blog-check-post.test.mjs`

**Interfaces:**
- Consumes: `findBannedTerms(text)` (`scripts/banned-terms.mjs:42`), `readPosts` (Task 5)
- Produces:
  - `DISCLOSURE` (Global Constraints 원문 그대로), `EXPERIENCE_PATTERNS: RegExp[]`, `RISKY_STEP_PATTERNS: RegExp[]`, `RESET_PATTERNS: RegExp[]`
  - 글 파일 형식 `Draft = {topicId, title, labels: string[], bodyHtml, notUsedNote, steps: [{text, source: {url, quote}}], sources: [{url, title}], product: null | {query, why, required: boolean, candidates?: [{productId, productName, productUrl}], chosenProductId?: string}}`
  - `checkTechPost(draft, {posts, fetchImpl, runSlop}) -> Promise<{ok: boolean, problems: [{id, text}]}>` — `problems[].id` 값: `experience-claim`, `risky-step`, `reset-without-backup`, `no-sources`, `step-without-source`, `step-not-in-body`, `source-unreachable`, `slop`, `slop-checker-missing`, `banned-term`, `duplicate-topic`, `no-not-used-note`
  - `checkRenderedHtml(html) -> problems[]` — `disclosure-missing`(첫 문단이 `DISCLOSURE`와 다름), `link-not-sponsored`(쿠팡 링크에 `rel`에 `sponsored` 없음)

- [ ] **Step 1: 실패하는 테스트** (각각 그 `id` 하나만 나오는지) — 본문 "직접 써 보니 편했다" → `experience-claim`; 단계 "뒷판을 분해해 배터리를 교체" (서비스센터 문구 없음) → `risky-step`; 단계 "공장 초기화" 앞에 "백업" 없음 → `reset-without-backup`; 단계 출처 `quote` 빈 문자열 → `step-without-source`; 단계 `text`가 `bodyHtml`의 글자에 없음 → `step-not-in-body`; 출처 `fetchImpl`이 403 → `source-unreachable`; `runSlop`이 `{ok:false}` → `slop`; `runSlop`이 `{missing:true}` → `slop-checker-missing`(통과로 치지 않음); `posts`에 같은 `topicId` → `duplicate-topic`; `notUsedNote` 빈 값이거나 본문에 없음 → `no-not-used-note`; 모두 정상인 가짜 글 → `ok: true`, `problems: []`. `checkRenderedHtml`: 첫 `<p>`가 `DISCLOSURE`면 통과, 아니면 `disclosure-missing`; `<a href="https://link.coupang.com/a/x">`에 `rel="sponsored nofollow"` 없으면 `link-not-sponsored`.
- [ ] **Step 2: 실패 확인** — `node --test scripts/tests/blog-check-post.test.mjs` → FAIL.
- [ ] **Step 3: 구현** — 기본 `runSlop`은 본문 글자만 뽑아 임시 `.md`로 저장 후 `python -X utf8 C:\Users\yunyo\Downloads\slop-rewrite\.claude\skills\slop-rewrite\scripts\check_ai_tells.py <파일> --genre 줄글 --json --strict`, 종료 코드 0이면 통과(경로는 `scripts/production-gate.mjs:22-23`과 같은 상수를 그 파일에서 export해 재사용). 출처 확인은 브라우저와 비슷한 `User-Agent`로 `GET`, 200만 통과.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS, `npm test` → `# fail 0`.
- [ ] **Step 5: 커밋**.

### Task 7: 쿠팡 파트너스 API

**Files:**
- Create: `scripts/blog/coupang-partners.mjs`
- Test: `scripts/tests/blog-coupang-partners.test.mjs`

**Interfaces:**
- Produces: `TECH_SUB_ID = 'techd40m'`, `signCoupang({method, path, query, accessKey, secretKey, now}) -> string`(Authorization 헤더 값), `searchProducts(keyword, {limit, subId, fetchImpl, env}) -> Promise<[{productId, productName, productUrl, productPrice}]>`, `deeplink(urls: string[], {subId, fetchImpl, env}) -> Promise<[{originalUrl, shortenUrl}]>`. 실패는 `Error`에 `.code`(`'auth'|'rate-limit'|'http'`).

- [ ] **Step 1: 공식 문서 확인** — 쿠팡 파트너스 화면 "파트너스 API"의 "자세한 정보" 링크(공식 문서)에서 기본 주소, 서명 문자열 규칙(signed-date 형식, 메시지 순서), 검색·딥링크 경로(`/v1/` 유무), subId 허용 형식, 호출 한도를 읽어 이 파일 머리 주석에 출처 주소와 함께 적는다. 비공식 글과 다르면 공식을 따른다.
- [ ] **Step 2: 실패하는 테스트** — 고정 `now`와 가짜 키로 `signCoupang` 결과가 `CEA algorithm=HmacSHA256, access-key=<키>, signed-date=<값>, signature=<hex>` 형식이고, 같은 입력은 같은 값(공식 문서에 예시가 있으면 그 예시 값으로 단정). `searchProducts`가 가짜 응답의 상품 목록을 위 모양으로 바꾸는지, 401 → `.code === 'auth'`, 429 → `'rate-limit'`.
- [ ] **Step 3: 실패 확인 → 구현 → 통과** — `node --test scripts/tests/blog-coupang-partners.test.mjs`.
- [ ] **Step 4: 실제 호출 1회** — `node scripts/blog/coupang-partners.mjs selftest` (검색어 "멀티탭" 1회, 상품 수와 첫 링크 도메인만 출력, 키는 출력 금지) → 상품 1개 이상, 링크가 `link.coupang.com`. 이것이 설계 8절 "키가 지금도 유효한지" 확인이다.
- [ ] **Step 5: 커밋**.

### Task 8: 글 쓰기(클로드 대화 없이)와 게시

**Files:**
- Create: `scripts/blog/prompts/tech-post.md` (클로드에게 주는 글쓰기 지침)
- Create: `scripts/blog/write-tech-post.mjs`
- Create: `scripts/blog/publish-post.mjs`
- Test: `scripts/tests/blog-write-publish.test.mjs`

**Interfaces:**
- Consumes: `Topic`(Task 5), `Draft`·`DISCLOSURE`(Task 6), `getBlogAccessToken`(Task 1)
- Produces:
  - `resolveClaudeExe({home, exists, readdir}) -> string|null` — `%USERPROFILE%\.vscode\extensions\anthropic.claude-code-<버전>-win32-x64\resources\native-binary\claude.exe` 중 버전이 가장 높은 것, 없으면 PATH의 `claude`, 둘 다 없으면 `null`
  - `buildWriterPrompt(topic, {posts}) -> string`
  - `runWriter({exe, prompt, draftPath, timeoutMs, spawnImpl}) -> Promise<{ok, draft?: Draft, error?}>`
  - `renderPostHtml(draft, {productLink: {shortenUrl, productName}|null}) -> string`
  - `publishToBlogger({blogId, title, html, labels, token, fetchImpl}) -> Promise<{postId, url}>`
  - `verifyLive(url, {fetchImpl}) -> Promise<{ok, problems}>` (200 + `checkRenderedHtml`)

- [ ] **Step 1: 글쓰기 지침 작성** — `tech-post.md`: 독자, 글 종류 두 가지, 써 본 척 금지와 "직접 써 보지 않았고 제조사 안내와 사용자 질문을 정리했다"는 취지의 한 줄(`notUsedNote`, 문장은 매번 자연스럽게), 다루지 않는 단계, 사실 확인표 규칙, 출처는 제조사 설명서·고객지원·공식 공지 우선, 글 모양은 고정하지 않음(탈템플릿), 대가 문구·쿠팡 링크는 프로그램이 넣으니 쓰지 말 것, 필요한 물건은 `product.query`·`why`·`required`로만 적을 것, 그림은 넣지 않음(설계 6-2: 실물 사진처럼 보이는 AI 그림 금지 — 1차는 글만, 설명 그림은 계획 3에서 다시 본다), 출력은 `Draft` JSON 한 파일(`draftPath`). AI 티 규칙은 `AGENTS.md` 한글 작성 규칙을 요약해 넣는다.
- [ ] **Step 2: 클로드 실행 옵션 확인** — `"<claude.exe 경로>" --help`로 이 버전의 대화 없는 실행·허용 도구 지정·권한 묻지 않기·출력 형식 옵션 이름을 확인해 `write-tech-post.mjs` 머리 주석에 적는다. 허용 도구는 웹 검색, 웹 읽기, `data/blog/drafts/` 안 파일 쓰기만. 시험: 같은 옵션으로 "git status를 실행해" 프롬프트를 주면 실행되지 않는지 확인.
- [ ] **Step 3: 실패하는 테스트** — `resolveClaudeExe`: 가짜 폴더 `2.1.299`, `2.1.312` → `2.1.312` 경로; `buildWriterPrompt` 결과에 `topic.title`, `topic.searchQuery`, `DISCLOSURE`를 쓰지 말라는 문장, `draftPath`가 들어 있음; `runWriter`: 가짜 spawn이 종료 코드 0 + 올바른 JSON 파일 → `ok: true`, 파일 없음/JSON 깨짐/시간 초과 → `ok: false`; `renderPostHtml`: 첫 `<p>`가 `DISCLOSURE`, `productLink`가 있으면 그 링크가 `rel="sponsored nofollow"`, 없으면 쿠팡 링크 0개, 출처 목록 포함 → 결과가 `checkRenderedHtml` 문제 0개; `publishToBlogger`: 가짜 fetch에 `POST .../blogs/<id>/posts/` 와 본문 `{title, content, labels}`를 보내는지.
- [ ] **Step 4: 실패 확인 → 구현 → 통과** — `node --test scripts/tests/blog-write-publish.test.mjs`, `npm test` → `# fail 0`.
- [ ] **Step 5: 커밋**.

### Task 9: 한 번 실행을 묶는 지휘 파일 (`tech-run`)

**Files:**
- Create: `scripts/blog/tech-run.mjs`
- Test: `scripts/tests/blog-tech-run.test.mjs`

**Interfaces:**
- Consumes: Task 1, 5, 6, 7, 8의 함수 전부(주입 가능하게 `deps` 객체로 받는다)
- Produces: `WRITING_WEEKDAYS = [1, 3, 5]` (월·수·금, `// allow-literal: 설계 6-2 처음 4주 주 3편 가설`), `MAX_CONSECUTIVE_REJECTS = 3` (`// allow-literal: 설계 6-7`), `runTechOnce({projectDir, now, mode: 'auto'|'preview'|'publish-draft', draftPath?, deps}) -> Promise<RunRecord>`, CLI `node scripts/blog/tech-run.mjs [--preview|--publish-draft <파일>|--force-day]`

흐름(`auto`): 멈춤이면 `paused` → 글 쓰는 요일 아니면 `not-writing-day` → 오늘(한국 날짜) 게시 기록 있으면 `already-posted-today` → 대기열 비면 `queue-empty` → 토큰 없으면 `auth-failed` → 클로드 글쓰기 실패면 `writer-failed` → 물건이 있으면 `searchProducts`로 후보를 받아 글 파일 `product.candidates`에 넣고, 프로그램이 Step 3 기준으로 고른 상품 ID를 `product.chosenProductId`에 적은 뒤 그 상품 링크를 만든다(검색 결과 주소가 이미 파트너스 링크면 `deeplink`는 생략, Task 7 Step 1 문서 확인 결과를 따른다) → 링크 실패: `required`면 `deferred`(대기열에서 빼지 않음), 아니면 링크 없이 계속 → `checkTechPost`·`renderPostHtml`·`checkRenderedHtml` 문제 있으면 `rejected` → 게시 → `verifyLive` → `appendPost`, `shiftQueue`, `published` → 마지막에 `appendRun`과 `syncData`. `rejected`가 `MAX_CONSECUTIVE_REJECTS`번 연속이면 `writePause`. `preview`는 게시 대신 `output/blog/preview/<topicId>.html`을 쓰고 `preview`. `publish-draft`는 이미 점검을 통과한 글 파일을 게시만.

- [ ] **Step 1: 실패하는 테스트** (가짜 `deps`) — 멈춤 → `paused`, 클로드 호출 0; `now = 2026-11-24T17:00:00Z`(한국 수 02:00) → 요일 통과·기록 날짜 `2026-11-25`; 오늘 게시 기록 있음 → `already-posted-today`; 대기열 빔 → `queue-empty`; 토큰 `null` → `auth-failed`, 게시 0; `runWriter` 실패 → `writer-failed`, 연속 실패 숫자 그대로; 점검 실패 3번 연속(앞선 기록 2번 + 이번) → `writePause` 호출; `deferred`는 연속 실패에 안 셈; 링크 필수인데 `deeplink` 오류 → `deferred`, 대기열 그대로; 정상 → `publishToBlogger` 1번, `appendPost`·`shiftQueue` 1번, `published`; `preview` → `publishToBlogger` 0번, 미리보기 파일 1개.
- [ ] **Step 2: 실패 확인** — `node --test scripts/tests/blog-tech-run.test.mjs` → FAIL.
- [ ] **Step 3: 구현** — 후보 고르기: 클로드 글쓰기를 두 번 부르지 않기 위해, 클로드는 글을 쓸 때 웹 검색으로 필요한 물건의 규격을 `product.query`에 구체적으로 적고, 프로그램이 `searchProducts(limit 5)` 후보 중 상품명에 `query`의 핵심 낱말이 모두 들어간 첫 상품을 고른다. 맞는 상품이 없으면 링크 실패로 본다(엉뚱한 상품을 넣지 않음).
- [ ] **Step 4: 통과 확인** — 같은 명령 + `npm test` → `# fail 0`.
- [ ] **Step 5: 커밋**.

### Task 10: 시작 브리핑 한 줄과 주간 경고 점검 기록

**Files:**
- Create: `scripts/blog/blog-status.mjs`
- Modify: `scripts/growth-check.mjs` (결과 객체에 `blogStatus`, `loopHealth` 옆, 약 314행)
- Modify: `scripts/growth-rules.mjs` (`buildBriefingContext`에서 시스템 건강 줄 아래 한 줄, 약 352행)
- Create: `knowledge/playbooks/blog-operations.md` (주간 경고 점검 순서, 다시 켜기 규칙, 주제 보충 방법)
- Test: `scripts/tests/blog-status.test.mjs`

**Interfaces:**
- Consumes: `readRuns`, `readPosts`, `readQueue`, `readPause`(Task 5)
- Produces: `QUEUE_LOW = 6` (`// allow-literal: 설계 6-2 2주 분량`), `SIGNAL_CHECK_DAYS = 7` (`// allow-literal: 설계 6-7 주 1회`), `summarizeBlogStatus({runs, posts, queue, pause, signalChecks, since, now}) -> string|null`, 주간 점검 기록 파일 `data/blog/signal-checks.json` = `[{date, searchConsole: 'ok'|'warning', adsense: 'ok'|'warning', coupang: 'ok'|'warning', note}]`

- [ ] **Step 1: 실패하는 테스트** — `since` 뒤 `published` 2·`deferred` 1 → 문장에 "올린 글 2편", "건너뜀 1번(링크 없음)"; 대기열 5개 → "주제 보충 필요"; `pause.paused` → "멈춤(이유) — 다시 켜기는 사용자 승인"; 마지막 경고 점검이 8일 전 → "경고 화면 점검 필요"; `data/blog/` 파일이 하나도 없으면 `null`(브리핑에 줄 없음). 실제 파일 칸 이름은 Task 5 형식 그대로.
- [ ] **Step 2: 실패 확인 → 구현 → 통과** — `node --test scripts/tests/blog-status.test.mjs`.
- [ ] **Step 3: 브리핑 연결 확인** — `node scripts/growth-check.mjs` 출력 JSON에 `blogStatus` 칸, `npm test` → `# fail 0`. 대시보드 서버 코드는 건드리지 않으므로 `test-client-syntax`는 해당 없음(건드렸다면 돌린다).
- [ ] **Step 4: 운영 문서** — `blog-operations.md`: 주 1회 점검(서치 콘솔 `sc-domain:d40m.com` 직접 조치·보안 문제 화면, 애드센스 정책 센터, 쿠팡 파트너스 공지·메일) → `signal-checks.json`에 한 줄 → 경고면 `writePause` 하고 사용자에게 보고. 주제 보충 순서(Task 11 방법).
- [ ] **Step 5: 커밋**.

## C. 첫 편과 일정 켜기

### Task 11: 주제 대기열 처음 채우기 (대화 안에서, 12개)

**Files:**
- Create: `data/blog/tech-queue.json`
- Create: `data/blog/sources/old-sc-queries-<날짜>.csv`

- [ ] **Step 1: 옛 검색어 받기** — 프로젝트 크롬 첫 번째 계정(`/u/0/`) 서치 콘솔 `sc-domain:k-posting.info`·`sc-domain:costcatcher.k-posting.info` 실적 → 검색어 → 기간 최대 → 내보내기(CSV). 파일을 `data/blog/sources/`에 둔다.
- [ ] **Step 2: 주제 고르기** — 문제 해결 검색어 중 클릭·노출 상위에서 출발, 구글·네이버 자동완성과 지식인 질문으로 지금도 찾는 주제인지 확인, Global Constraints의 다루지 않는 단계뿐인 주제는 뺀다. 4주 × 3편 = 12개, `kind`는 두 종류를 섞는다. 옛 글 문장은 가져오지 않는다.
- [ ] **Step 3: 확인** — `node -e "const q=require('./data/blog/tech-queue.json');console.log(q.length,new Set(q.map(t=>t.topicId)).size,q.every(t=>t.sourceHints.length>0))"` → `12 12 true`.
- [ ] **Step 4: 커밋**.

### Task 12: 첫 1편 — 미리보기 → 사용자 반응 → 게시

- [ ] **Step 1: 미리보기** — `node scripts/blog/tech-run.mjs --preview --force-day` → 결과 `preview`, `output/blog/preview/<topicId>.html`. 프로젝트 크롬으로 PC 폭·400px 폭 캡처를 보고 겹침·넘침 확인.
- [ ] **Step 2: 사용자에게 보여 주기** — 미리보기 캡처와 사실 확인표를 보여 주고 반응을 받는다(품질 판단을 맡기지 않고 첫인상만). 고칠 점은 `tech-post.md` 지침에 반영하고 다시 미리보기.
- [ ] **Step 3: 게시** — `node scripts/blog/tech-run.mjs --publish-draft data/blog/drafts/<파일>` → `published`. 바깥 확인: 주소 200, 첫 문단 대가 문구, 쿠팡 링크(있으면) `rel` 확인, 쿠팡 파트너스 리포트에서 subId `techd40m` 필터가 되는지(안 되면 인수인계에 적고 계획 3에서 다른 구분 방법).
- [ ] **Step 4: 기록·커밋** — `data/blog/*`, 인수인계 한 줄.

### Task 13: 무인 일정 켜기

**Files:**
- Create: `scripts/register-blog-tech.ps1`

- [ ] **Step 1: 등록 스크립트** — `scripts/register-daily-loop.ps1`과 같은 설정으로 작업 이름 `IHM-Blog-Tech-Writer`, 월·수·금 02:00, `node scripts\blog\tech-run.mjs`, 실행 시간 한도 1시간.
- [ ] **Step 2: 등록·확인** — `powershell -ExecutionPolicy Bypass -File scripts/register-blog-tech.ps1` → "다음 실행"이 다음 월·수·금 02:00.
- [ ] **Step 3: 스케줄러로 한 번 시험** — 작업을 `--preview --force-day` 인자로 임시 등록해 `Start-ScheduledTask`로 1회 실행 → `tech-runs.json` 마지막 기록이 `preview`(대화 없이 클로드가 도는지 확인, 설계 8절). 확인 뒤 원래 인자로 다시 등록.
- [ ] **Step 4: 첫 무인 실행 다음 날 확인** — `tech-runs.json` 마지막 기록과 브리핑 한 줄. `knowledge/now.md`에 "계획 3: 자동 일정 켠 날 + 28일" 날짜 항목, 인수인계·커밋·푸시.
