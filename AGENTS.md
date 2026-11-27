# 이해하면 쉬운영어 — 공통 운영 지도 (단일 원본)

> `CLAUDE.md`는 이 파일(`@AGENTS.md`)을 불러온다. **이 파일은 190줄 · 22KB 이하로 유지한다(초과 시 저장 차단).** 상세 절차와 옛 기록은 아래 지도·스킬·`knowledge/legacy/`에 둔다.

---

## 대화·논의 최우선 규칙 (모든 AI 공통 — 0번보다 먼저 지킨다)

1. **요청을 받으면 짧은 질문으로 뜻부터 맞춘다.** 단순한 일을 포함한 모든 요청에 바로 답하거나 시작하지 않는다. 사용자가 원하는 것(무엇을, 왜, 어디까지)을 95~100% 알 때까지 쉽고 짧은 질문(한 번에 1~3개, 선택지 포함, Claude Code는 `AskUserQuestion`)을 한다. 품질·기술 판단은 묻지 않고, 문서에 이미 답이 있으면 묻지 않는다.
2. **답은 조사해서 낸다.** 기억·규칙만으로 답하지 않고(AI 평균값 금지), 웹(최신 정책·논문)·유튜브(실제 터진 영상 제목·대본·댓글)·저장소 실측 데이터를 반대 근거까지 찾아 출처와 함께 낸다. 확인한 사실과 가설을 나눠 쓴다.
3. 뜻이 정해진 뒤 규칙이 정해 둔 뒷단계(마무리 체인·성장 루프)는 매번 다시 묻지 않는다. 조사(2항)는 답을 내야 하는 논의에 하고, 단순 파일 열기·사실 확인에는 하지 않는다.
4. **논의 단계에서는 기획·제작·일정으로 넘어가지 않는다.** 답과 방향까지만 말한다.
5. **쉬운 일상어·결론부터 짧게 말한다.** 본문에 영문 명령어·코드·개발 용어를 쓰지 않고 "무엇이 달라졌는지·어떻게 쓰는지"만 일상어로 쓴다. 0번 1항의 확인용 정보는 맨 아래에 짧게 분리한다.
6. **데이터·팩트로 직언한다.** 기분 맞추기 아부를 금지하고, 채널 성장 기준으로 득실과 대안을 분명히 말한다.

---

## 채널 제1 슬로건 & 4대 원칙

- **제1 슬로건**: *"사명은 고정하되 방법은 고정하지 않는다. 여러 명작의 원리·호흡·심리·연출의 맛을 흡수해 우리 강점과 융합하고, AI 템플릿 냄새와 AI 평균값을 완전히 벗어나 매 편 기존 영상을 넘어선다. 그리고 이 모든 과정은 AI가 주도적으로 생각하고, 결과로 배우며, 채널을 성장시킨다."*
- **4대 원칙**: ① 탈템플릿·탈평균 ② 사명·안전선 고정 / 방법 비고정 ③ 결과 학습·본질 집중(시스템 과잉 구축 경계) ④ 역할 경계(시스템=안전·진실, AI=주도 사고·제작, 사용자=3대 승인 관문에서 안전 확인·취향 반응).
- **하드코딩 vs 자율 경계**:
  - 🔒 **고정 안전선**: 3대 승인 관문(시트·렌더·업로드), 3060 국내파 타깃, 구글·애드센스 계정 보호, `FACT-CHECK.md` 선행, 학술 전문용어 차단, 성과 숫자 실제 데이터 원칙, 경험·일화 날조 금지(지어낸 1인칭 경험·지인 대화·해외 일화), 저작권 준수(외부 클립은 권리 증빙), 워터마크 0px, 쇼츠 상단 0.5초 훅과 아래 정보 띠(형태는 자율)·글자 34px+, 음성 예산 일치(낭독이 컷 길이를 넘지 않음), `slop-rewrite`+Korean Skills(최소 바닥선, 나레이션 수·박자는 고유어 입말). 유튜브 세부는 [`knowledge/youtube-operations.md`](knowledge/youtube-operations.md) 2절.
  - 🧠 **자유 영역(고정 금지)**: 템플릿·비율·단어 수·기법 메뉴판 고정 금지. 창작은 금지 규칙 나열 대신 정예 예시 3~5개(`knowledge/creator-voice-card.md`·`data/youtube/packaging-cases.json`)로 자유 초안 → `blind-review` 1회 검수로 AI 티를 뺀다.

---

## 0. 작업 확인 규칙 (모든 AI 공통)

1. **완료 보고 틀** (본문 맨 아래 분리):
   - 바꾼 파일:
   - 실행한 확인 명령과 출력 줄 그대로 (`# pass N`, `# fail 0`, `ALL CLIENT TABS AND FUNCTIONS VERIFIED` 등)
   - 확인하지 못한 것: (없으면 "없음")
2. **정해진 확인 명령 준수**: `scripts/` 수정 → `npm test`, 대시보드 서버 수정 → `node scripts/test-client-syntax.mjs`도 실행(`node --check` 대체 금지). 대시보드 검사는 떠 있는 서버를 보므로 서버 코드를 고쳤으면 서버를 다시 켜고 돌린다. 실패는 실패로 보고하고, 기준을 낮추거나 0개를 통과로 치거나 실패를 건너뛰게 고치지 않는다.
3. **성과 숫자 진실성**: 화면·데이터에 성과 숫자를 손으로 쓰거나 빈 값을 임의 숫자로 대신하지 않는다(`medianViews || 100` 금지). 코드 작성 전 실제 데이터 칸 이름을 먼저 확인한다.
4. **근거 없는 완료 표현 금지**: 기록·커밋 메시지에 과장 완료 표현을 쓰지 않는다(커밋 검사 차단).
5. **커밋·푸시**: 내가 바꾼 파일만 이름으로 지정해 담는다(`git add -A`/`.` 금지). 실제 모델 서명(`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` 또는 `Co-Authored-By: <Gemini 모델명> (Antigravity) <noreply@google.com>`)을 붙인다. 커밋 전 검사(`.githooks/`, `scripts/commit-guard.mjs`)를 `--no-verify`로 우회하지 않는다. 비밀번호·키가 든 파일, 대용량 미디어, `.hyperframes/`·`public/reference` 같은 참고자료는 담지 않는다. 강제 푸시(`--force`)는 하지 않고, 푸시가 거부되면 사용자에게 보고한다.
6. **직접 확인 원칙**: 예약·공개 상태는 API/`catalog.json`으로, **화면에 보이는 것을 바꿨으면 브라우저로 직접 열어 보고** 확인한 것만 완료라고 보고한다.
7. **토큰 절약 & 모델 분업 (상위 주도 · 하위 분업)**: 필요한 줄만 읽고 독립 호출은 병렬로 묶는다. 진단·논의·설계·창작 훅·백지 눈 검수는 상위 모델(Gemini 4 Neon / Claude Opus 5.5), 정형·반복·배치·정리는 경량 워커(`flash`/`flash_lite`, `sonnet-worker`/`haiku`)에 자율 위임한다.

---

## 1. 실수 제자리 배치 (3갈래) & 공통 규칙 실수 정원 (최대 10개 교체제)

실수는 반드시 기록하되 **모두 이 파일에 쌓지 않는다**(상세 배경은 `knowledge/logs/YYYY-MM.md`에만 기록):
- **1갈래 (기계가 잡을 실수)** → `scripts/tests/regressions.test.mjs`·`commit-guard.mjs`·시트 검사로 승격(실패 시 원인·해결 1줄 출력, 평소 0줄 차지).
- **2갈래 (특정 업무 실수)** → 해당 스킬(`blind-review`·`publish-wrapup` 등) 또는 `knowledge/creator-voice-card.md` 예시 짝에 추가.
- **3갈래 (전방위 실수)** → 아래 **정원 10개 교체제**에만 추가(11번째를 넣으려면 가장 오래된 1개를 자동 검사로 올리거나 보관함으로 옮긴다 — 무엇을 뺄지는 `wiki-maintenance` 초안으로 사용자 확인 후. 10개를 넘으면 저장이 막힌다).

| # | 날짜 | 전방위 실수 방지 규칙 (현재 9 / 10) |
|---|---|---|
| 1 | 2026-09-18 | 새 파일이라도 덮어쓰기 전에 기존 파일 존재 여부(`ls`/`Read`)부터 확인한다. |
| 2 | 2026-11-27 | 세션 시작 시 `npm run pull`로 먼저 받고, 대시보드(포트 3001)가 안 떠 있으면 띄워 둔다. |
| 3 | 2026-09-20 | `npx hyperframes check` 통과만으로 렌더하지 않는다 — 반드시 사용자 명시 승인 후 렌더한다. |
| 4 | 2026-11-06 | 자동 업로드는 `decideNextUpload` 단일 경로만 통과한다(쇼츠 단건 예외만 `studio-upload --yes`). |
| 5 | 2026-11-19 | 업로드·예약 시 AI 표시(`containsSyntheticMedia: true`)와 형식별 기본 재생목록 연결을 필수 확인한다. |
| 6 | 2026-10-09 | AI 이미지·영상은 반입 전 4모서리 워터마크 0px를 직접 확인한다. |
| 7 | 2026-11-21 | "된다/안 된다"·도구 한계는 기억·코드만으로 말하지 말고 웹·유튜브부터 찾아 출처와 함께 답한다. |
| 8 | 2026-08-30 | 대시보드 인라인 문자열은 `${JSON.stringify(변수)}`만 쓰고, 쇼츠 판정은 `video.format`만 쓴다. |
| 9 | 2026-09-05 | 한 곳을 고치면 같은 내용을 다른 말로 담은 자리(같은 문서 다른 절·다른 문서·`.agents`/`.claude` 스킬 사본)를 찾아 같이 고친다. |

---

## 2. 세션 시작 · 마무리 · PC 2대 동기화

- **하루 1회 시작 브리핑**: 단일 원본 [`knowledge/playbooks/briefing/00-autonomous-briefing.md`](knowledge/playbooks/briefing/00-autonomous-briefing.md). 오늘 첫 채팅만 `npm run briefing`(Claude Code는 시작 훅)으로 수집·브리핑하고, 같은 날 2번째부터는 `knowledge/handoff/LATEST.md`만 확인해 본론으로 들어간다.
- **PC 2대 공유 (`scripts/pc-sync.mjs`)**: 글은 git, 대용량 미디어·참고자료·대화 사본(`chats/INDEX-<PC>.md`)은 구글 드라이브 `ihm-easy-english-sync/`. 다른 PC 주제를 이을 때는 인수인계 요약만 믿지 말고 원래 대화를 `grep`으로 확인한다. 프로젝트 폴더나 `~/.claude`·`~/.gemini`를 드라이브에 직접 넣지 않는다(동기화 폴더 안 `.git`·대화 기록이 깨진 사례). git이 추적하는 파일은 드라이브로 옮기지 않는다.
- **마무리 뉘앙스("오늘은 여기까지" 등)**: 기다리지 않고 월별 일지(`knowledge/logs/YYYY-MM.md`)·`knowledge/now.md`·`knowledge/handoff/<날짜>.md`·`LATEST.md` 갱신 후 바꾼 파일만 커밋·푸시한다.

---

## 3. 영역별 지도 (필요한 1장만 꺼내 읽기)

- **유튜브 운영 전체**: [`knowledge/youtube-operations.md`](knowledge/youtube-operations.md) · 상태/할 일 [`knowledge/now.md`](knowledge/now.md) · 전체 목차 [`knowledge/index.md`](knowledge/index.md)
- **비교 시트 제작**: [`knowledge/playbooks/comparison-sheet-playbook.md`](knowledge/playbooks/comparison-sheet-playbook.md) (행별 `origin`·`appliedTo`, `clickWhy`, `craft`, `blindReview` 필수)
- **블로그 운영 전체**: [`knowledge/playbooks/blog-operations.md`](knowledge/playbooks/blog-operations.md) (공통 안전선만 유튜브와 공유, 규칙 완전 분리)
- **반복 정형 스킬 (`.agents/skills/` · `.claude/skills/` 단일 동기화)**:
  - `episode-planning` — 기획·데이터·소재·시트 조립
  - `blind-review` — 승인 전 백지 눈 5대 잣대 1회 검수 (상위 모델)
  - `publish-wrapup` — 예약·공개 직후 7단계 자동 마무리 (경량 모델)
  - `performance-settlement` — 공개 7일·28일 성과 정산 (경량 모델)
  - `wiki-maintenance` — 14일 주기 지침·위키 건강 점검 및 정리 초안 (경량 진단 → 상위 통합)
  - `slop-rewrite` — 한국어 AI 티 최소 바닥선 검사 · `hyperframes` — 영상 제작
