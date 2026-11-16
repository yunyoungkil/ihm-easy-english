# 현재 상태 요약 (2026-11-16) — 새 대화는 이 파일만 먼저 읽는다

> 이 파일은 날짜 인수인계(`2026-11-14.md` 등 수만 토큰)를 대신하는 **60줄 요약**이다. 날짜 파일은 통째로 읽지 말고 `grep -n "<낱말>"`으로 필요한 절만 읽는다. 작업 한 덩어리를 마칠 때마다 이 파일을 **고쳐 쓴다**(더하지 않고 낡은 줄은 지운다). 틀과 규칙은 `README.md`.

## 사용자와 방향 (원문 26KB는 `knowledge/decisions/2026-11-14-agent-map-direction.md`, 방향이 걸린 결정일 때만 읽는다)
- 사용자는 품질 판단(분석·아이디어·선택·디자인·글)을 못 한다고 밝혔다. AI가 콘텐츠를 만들고 품질은 자동 점검·측정·시청자 데이터가 맡는다. 사용자에게는 판단이 아니라 **안전 확인 + 취향 반응**("보고 싶은 순서", "전부 별로", "절대 안 됨")만 받는다.
- 기존 기획~제작은 실패로 보고 처음부터 다시 한다. **영상 스타일·제목 틀·썸네일은 정해진 것이 없다**(예시를 후보처럼 말하지 않는다). 이미 만든 영상(EP24~29)은 고치지 않는다.
- 어려운 판단은 `opus-expert`가 근거와 함께 정하고, **불변 규칙·방향·승인 관문(비교 시트·렌더·업로드)은 사용자 몫**이다. 구현은 `sonnet-worker`, 에이전트 동시 2명 이하.
- 직언한다. 기분 맞추기식 동조 금지. 한국어, 초등학생도 알아들을 쉬운 말.

## 진행 중: EP30 쇼츠 `videos/ep30-shorts-chocolate` (비교 시트 `SbQVBQoRciA`, 공개 12/1 예정)
- 시트 **승인됨**(2026-11-15). 나레이션 14줄 확정, 음성 n01~n14(Gero, 합계 58.84초)는 사용자가 **그대로 사용**하기로 함(2026-11-16).
- **조립 1차 완료(2026-11-16)**: 컷 14개를 코드(HTML/GSAP)로 그린 `index.html`(생성: `node videos/ep30-shorts-chocolate/scripts/build-index.mjs`, 화면 글자는 시트 `cutPlan`에서 읽음), 세로 1080×1920, 길이 71.08초(음성 실측+간격 0.35초+원어민 단어 음성 5개). `hyperframes check` 0 error, `check-terms` 금지어 없음, `check-layout` 5건(글자가 올라오거나 튀는 순간뿐, 가로 넘침 0). 스냅샷·콘택트시트는 `snapshots/`(커밋 안 함). **`voice-en`·`bgm` 파일이 바뀌면 build-index를 다시 돌려야 길이·시각이 갱신된다.**
- **제미나이 작업 끝(커밋 `9e0a1ef`), 내가 확인(2026-11-16)**: 원어민 단어 음성 10개는 whisper(여백 0.6초 추가, medium)로 받아쓰기해 전부 맞는 단어(소리 내용은 이 받아쓰기까지만 확인, 사람 귀 확인 아님). 배경음악 `track.mp3`(62.98초)는 말소리 없음. 영상(71초)보다 짧아 끝과 처음을 4초 겹쳐 이은 `assets/bgm/track.loop.mp3`(73초)를 만들었고 `build-index.mjs`가 이를 우선 쓴다. `hyperframes check` 0 error·`check-terms` 금지어 없음·`check-layout` 5건(올라오거나 튀는 순간뿐).
- **사용자 첫인상(2026-11-16)과 2차 수정 반영**: "쇼츠로는 느리고 밋밋하지만 느려서 듣기 좋고 깔끔하다. 글자가 모바일에서 작아 보일 수 있고, 위쪽 훅 문구가 없고 아래 공간을 안 쓴다." → 속도는 그대로, 위 검은 띠에 훅 2줄("아는 단어 5개, 어디가 거의 안 들릴까?"), 아래 띠에 단어 5개 진행 점과 "사전 표기: Merriam-Webster · Cambridge", 카드 글자 25~35% 확대. `hyperframes check` 0 error, 금지어 없음, `check-layout` 5건(움직이는 순간뿐). 미리보기는 `npx hyperframes preview --background --port=3002`(프로젝트 폴더, 변경이 자동 반영).
- **사용자 승인(2026-11-16)**: 2차 화면을 보고 "좋아졌다, 아직 업그레이드할 부분이 많다"(첫인상), "절대 안 됨" 없음, **렌더 승인**. 렌더 시작(`videos/ep30-shorts-chocolate/renders/`). **음성 지적**: TTS 문장 끝소리가 길어 늘어지는 느낌 → 다음 음성부터 `script-rules.md` 10번의 끝소리 규칙(Style 칸에 crisply/briskly, `words.json` 마지막 낱말 길이 점검). 이번 EP30 음성은 사용자가 이미 "그대로 사용"했으니 다시 만들지 않는다.
- 남은 일(순서): ① 렌더 결과 확인(길이·소리·모서리) → 최종본만 `output/upload-packages/`로 복사(`node scripts/package-from-sheet.mjs SbQVBQoRciA output/upload-packages/<폴더>`로 제목·설명·태그·고정 댓글·썸네일) ② 업로드·공개는 별도 승인(12/1 20:00 예정)
## 자동화·동기화 (2026-11-16 결정)
- **매일 루프(새벽 1시)는 `DESKTOP-UA9AKL2` 한 대만 돌린다**(`data/loop-host.json`). 루프 마지막 `dataSync`가 데이터를 커밋·푸시한다(`scripts/loop-data-sync.mjs`, force push 없음, 충돌이면 실패로 알림). 다른 PC는 루프 예약을 두지 않는다.
- 경쟁 영상 화면 캡처(`data/youtube/outlier-frames/`)도 깃에 올린다(비공개 저장소, 6.3MB). 다른 PC는 `git pull`이면 된다.
- 새 PC는 Studio-Automation 크롬 로그인(`npm run studio-chrome`)과 Gemini-Automation 크롬 로그인이 각각 1회 필요하다(훅이 구성만 해 준다).
- 음성은 AI Studio 화면 방식(`scripts/generate-aistudio-speech.mjs`)이 기본(무료 키 TTS는 하루 10회). 음악은 AI Studio Lyria 3.5 화면(스크립트 없음). 그림은 `npm run image`. 도구별 워터마크 표: `knowledge/free-generation-tools.md`.

## 사용자 결정 대기 / 날짜가 정해진 일
- 11/17 이후: `SbQVBQoRciA` 새 배수(공개 7일) 확인 → 벤치마크 분석서 대상 4편 재선정. 스튜디오 조사 수집이 3일 이상 쌓이면 설계 결정 2~5번(`knowledge/decisions/2026-11-14-research-source-design-draft.md` 9절)을 한 번에 묻는다. 쇼츠 "계속 시청함" 분포는 11/19~24에 구분력 확인.
- 11/24: EP24·25·26 쇼츠 구성 비교 판정(`videos/ep26-shorts-right-light/BRIEF.md`).
- 두 번째 시험 회의(화면 체계 제약 타이포/실사/일러스트)는 첫 시험 결과까지 보류. 벤치마크 대조군·편마다 다른 설명 가치 점검은 정해짐(`knowledge/decisions/2026-11-15-direction-audit-decisions.md`).

## 토큰 규칙 (2026-11-16 사용자: "너의 토큰을 아껴야 한다")
- 시작 때 읽는 것: 이 파일만. `now.md`는 훅이 앞 8개만 넘긴다(나머지는 필요할 때). 브리핑은 훅의 틀대로 하고 스킬·reference를 열지 않는다. 큰 파일은 `grep -n`·`sed -n`으로 필요한 줄만.
- 영상 재료 생성(원어민 음성·배경음악·이미지 묶음)은 Gemini에게 지시 파일로 넘기고, 조립·검수·판단은 Claude. 조립 구현은 sonnet-worker. Opus는 판단·리뷰만.

## 함정
- 대시보드 서버가 pull 뒤 옛 코드로 떠 있을 수 있다 → 코드가 바뀌었으면 서버를 다시 켠 뒤 `node scripts/test-client-syntax.mjs`.
- 자막(`youtube-transcript`) 요청이 이 PC에서 막히는 일이 있다(`IpBlocked`). 리포트는 Gemini가 소리를 직접 들어 계속 만들어지니 고장이 아니다.
- 시트 JSON·코드 파일은 Write/Edit로 쓴다(Bash heredoc에서 역슬래시·따옴표가 깨진 적이 있다).
- 쇼츠 "45초 이내"는 규칙이 아니다(2026-11-14 정정). 내용에 필요한 만큼.
