# 지금 할 일

마지막 확인: 2026-11-12

## ▶ 다음 할 일

급한 순서로 적는다. 새 대화의 시작 브리핑에 그대로 나온다. 끝난 항목은 바로 지우고, 새 일이 생기면 여기에 적는다.
- [ ] **Claude (진행 중, 2026-11-12 사용자 승인)**: 모은 데이터를 기획에 실제로 쓰게 만들기. 지도: `knowledge/data-consumption-map.md`. ① 지도와 시험 — 2026-11-12 완료 ② 쓰는 곳 없는 파일 정리 — 2026-11-12 완료 ③ 다음 기획 입력 파일(`data/youtube/next-episode-input.md`) — 2026-11-12 완료 ④ 합친 아웃라이어 리포트와 연출 자료집 — 2026-11-12 완료(`npm run outlier-report`, 대시보드 전체 관제 "다음 기획 입력" 카드, `/outlier-reports`, `/visual-library`, `/next-input`, 매일 루프 하루 2편, 캡처는 PC마다 자동 재생성). 남은 확인: 11/13 새벽 루프에서 `outlierReports` 단계가 실제로 도는지(브리핑 자동 루프 점검 줄로 나온다). 새 수집(인스타·틱톡 등)은 이 빈틈을 메운 뒤에 논의한다.
- [ ] **사용자 (다른 PC, 2026-11-12 지정)**: 제미나이 의도 테스트. 제미나이가 규칙대로 일하는지 실제로 시켜 보는 시험이다(이 PC에서는 2026-11-12에 준비까지 하고 마쳤다). 순서: ① 다른 PC에서 `git pull` ② Antigravity 새 대화에 `knowledge/gemini-intent-test.md`의 프롬프트 블록을 통째로 붙여 넣기(힌트 금지) ③ 끝나면 Claude Code에 "제미나이 테스트 채점해줘"라고 말하기(Claude가 `node scripts/score-gemini-test.mjs`를 돌려 읽어 줌) ④ 시험 가지 `gemini-intent-test` 지우기. 같이 확인받을 것 2가지: (a) 경쟁 분석 탭의 채널 링크 입력란·삭제 버튼은 자동화 우선 원칙과 부딪힌다 — 남길지 (b) `scripts/tests/intent-spec.test.mjs`의 의도 9개와 서버 통로 허용 목록 14개가 사용자 뜻과 맞는지. 상세: `knowledge/logs/2026-11.md` 2026-11-12 "제미나이 의도 테스트" 절.
- [ ] **사용자 (공개 후 할 일은 브리핑이 자동으로 알려 준다)**: 롱폼 고정 댓글(대시보드 "등록함"), 쇼츠 "관련 동영상"에 같은 편 롱폼 지정, 쇼츠 고정 댓글. 코드: `growth-rules.mjs`의 `afterPublishTasks`. 끝낸 일은 `data/youtube/after-publish-done.json`에 Claude가 적는다. 여기에 따로 적지 않는다.
- [ ] **사용자**: EP27·28·29 쇼츠(11/21 토, 11/24 화, 11/28 토 20:00)는 소리 확인과 스튜디오 예약까지 끝났다고 사용자가 알려 옴(2026-11-09). 남은 일: 각 롱폼이 공개된 뒤 쇼츠의 "관련 동영상" 지정(시작 브리핑이 자동으로 알려 줌). 썸네일·한국어 자막·언어 두 칸을 적용했는지는 확인하지 않았다.
- [ ] **Claude (진행 중)**: EP24~29 두 번째 쇼츠 6편 (2026-11-11 사용자 승인). 공개 20시: 12/1 화 EP24 반전(seat·sit 길게만으로는 안 갈림) · 12/5 토 EP25 퀴즈(문의 PULL) · 12/8 화 EP26 반전(river·liver) · 12/12 토 EP29 퀴즈(best·vest) · 12/15 화 EP28 반전(입술 꽉 물기) · 12/19 토 EP27 퀴즈(간판 끝 s: Starbucks·McDonald's·Levi's, houses 후보는 전제 오류로 폐기). 제목은 Claude가 데이터로 정한다(사용자 위임). 음성·그림은 Claude가 자동 생성(무료). 각 쇼츠 BRIEF에 기획 근거(형식 Track A/B 포함). 11/24 비교 판정은 그 뒤에 만드는 영상부터 적용(이 6편은 계획대로). 렌더·업로드 승인은 그대로. 장면 후보: 각 롱폼 `SHORTS.md`.
- [ ] **결정됨 (2026-11-12 사용자)**: 내 목소리 복제 TTS는 하지 않는다. 채널 목소리는 Gero(남)/Olin(여) 유지.
- [ ] **Claude (다음)**: 무료 생성 도구 자동화 — ① Google AI Studio 이미지 자동화 스크립트(워터마크 없음, gemini.google.com은 첫 장 이후 워터마크) ② **AI Studio `Lyria 3.5` (`new_music?model=lyria-3.5`) 배경음악 1순위** + `flowmusic.app` 보조/효과음(편마다 새 BGM — 같은 track.mp3 돌려쓰기 중단. AI Studio는 API 키 없이 무료, flowmusic은 설정 메뉴 안 실제 크레딧 확인 후 무료 범위 내 생성) ③ AI Studio Omni 1.2 Flash 영상. **2026-11-12 1차 시험 완료**: ② Flow Music 대비 음량(`0~33초 -14.1 dB` vs `-21.0 dB`)·음질(`192 kbps` MP3)·무과금 면에서 앞선 **AI Studio `Lyria 3.5` (`Composer` 모드, 긍정문 전용 `62.25초`)**로 EP24 두 번째 쇼츠 BGM 최종 교체 완료(무보컬·무워터마크 확인), ③ 1번 장면 9:16 시험(눈에 보이는 워터마크 없음, `1:1` 미지원·무음 지시에도 오디오 트랙 생성 확인, 퀄리티 사유로 미반입). **남은 일**: ① 이미지 시험 및 ①②③ 전용 `scripts/` 자동화 스크립트 구현. 기준: `AGENTS.md` 이미지 생성 2단계 원칙, `knowledge/gemini-web-automation-setup.md` 6절.
- [ ] **Claude (11/24)**: EP24·25·26 쇼츠 구성 비교 판정. 볼 숫자·판정 기준은 `videos/ep26-shorts-right-light/BRIEF.md` "세 쇼츠 비교". 각 편 공개 7일 뒤(11/17, 11/21, 11/24) 숫자를 모으고, 스와이프 비율은 사용자에게 스튜디오 값을 받는다.
- [ ] **사용자 (11/23쯤)**: 스튜디오에서 EP23 제목·썸네일 테스트 결과를 본다(2026-11-09 대시보드 시안대로 다시 걸음, 지금 메인 제목 A안). 승자 또는 "결론 없음"을 알려 주면 Claude가 `videos/ep23-double-consonant/REVIEW.md`에 적는다.
- [ ] **Claude (차차)**: 2026-11-11 전체 점검에서 남은 것 — ⑤ 규칙 충돌 2개 결정(사용자 결정 필요: 지인 대화 훅 vs 경험 날조 금지, BGM 볼륨 6% vs 8~10% — 아래 "지금 막힌 곳"의 "규칙 충돌 미정리") ⑥ `AGENTS.md` 약 700줄 대청소(중단된 아바타 규칙 등 옛 내용, `deep-refactor:doc-refactor`). 2026-11-12 확인: Antigravity가 101KB 중 77KB만 읽어 뒷부분이 잘리므로 77KB 아래가 목표 ⑧ 데이터가 없을 때 쓰는 대신값 `weightedCtr: 5.5, weightedRet: 42.0`(`matrix-diagnosis.mjs`, 대시보드 같은 계산) — 실제 값처럼 보이지 않게 "기준 없음"으로 바꿀지 판단 ⑦ 검색 피드 탭 버튼(패키지·검색어·썸네일·보기 바꾸기)은 자동 검사가 못 누름 — Playwright 클릭 검사 추가.
- [ ] **논의 (사용자와)**: 인스타·틱톡·쓰레드 데이터 수집 방안. 숏폼 인기 소재/트렌드 발굴 및 학습자 페인포인트(고민 글/댓글) 수집 목적. 1순위 플랫폼(쓰레드 API vs 릴스/틱톡 브라우저 자동화)과 대시보드 트렌드 탭 연계 범위 구체화.
- [ ] **Claude (차차)**: 대시보드 남은 수리 3개 — ⓪ 휴대폰 너비(400px)에서 머리말 오른쪽 버튼들(시계·동기화·로그아웃)이 화면 밖으로 넘침(2026-11-12 발견, 예전부터) ① 쇼츠 CTR을 롱폼 평균으로 판정(쇼츠 기준값을 따로 정해야 함, 서버 `matrix-diagnosis.mjs`와 화면 쪽 기준값을 같이 고친다) ② 쇼츠 빌드 스크립트가 끝날 때 carve(배경음 더킹)를 자동 실행. 상세: `knowledge/growth/review-2026-11-09.md`.

## 🔜 지금 막힌 곳 (2026-11-06 점검)

- **공개 현황**: EP22(10/12)·EP23(10/28)까지 공개. EP24~29, 6편은 완성됐는데 미공개.
- **쇼츠**: 9/2 이후 공개 0개. 최근 90일 조회수의 96%가 쇼츠였고, 최근 14일 조회수는 83회.
- **EP24~29 패키지 글은 2026-11-06에 고쳤다** (제목·설명·챕터·태그·고정 댓글·체크리스트). 남은 일:
  - 썸네일 이미지 (EP25·26 승인 완료, EP27 파일 교체·승인 대기, EP28·29 필요): EP28·29 파일은 아직 아바타 그대로이고, EP28은 순서가 반대인 문구가 남아 있다. 프롬프트는 각 프로젝트의 `prompts/thumbnail-prompts.md`에 있다(2026-11-06 영상과 대조해 수정). 만들어서 같은 파일 이름으로 바꿔 넣고, 메인은 대시보드에서 승인한다.
  - 영상 안 금지어: 2026-11-06 사용자 결정으로 다시 렌더링하지 않고 그대로 올린다. 항목은 각 패키지의 `upload-checklist.txt`에 있다. 공개 후 시청 지속률을 보고 다음 편에 반영한다.
  - 자막: EP23~29 없음. 업로드를 막지는 않는다.
- **자동 예약 업로드 (2026-11-06 코드 완성, EP24로 실제 업로드 확인, 자동은 꺼 둠)**: EP24는 우리 채널에 올라갔다(`--Ajwp-UvIk`, 11/9 밤 11시 공개). 첫 시험은 재연동 실수로 k포스트잇 채널에 올라가 사용자가 삭제했고, 이후 재연동해서 다시 올렸다. AI 사용 표시는 스튜디오에서 켜진 것을 사용자가 확인했다(API 응답에는 나타나지 않음). EP24 끝 화면(EP23 연결)과 재생목록도 사용자가 스튜디오에서 끝냈다. 남은 일: 11/9 공개 후 고정 댓글 등록(사용자가 직접), EP27 승인, EP28·29 썸네일 교체와 승인, EP25부터 업로드. 예약은 11/9부터 월·목 밤 11시.
- **다음 영상 기획 규칙 (2026-11-06 신설)**: 같은 틀의 영상을 찍어 내지 않는다. 먼저 공개한 듣기 영상 2편의 7일 리뷰 전에는 새 듣기 영상을 기획하지 않는다. 상세: `CLAUDE.md` 같은 이름의 절.
- **코드 남은 일(재현 전)**: 판정 전 영상의 AI 처방전, 쇼츠의 CTR 기준, JSON 동시 저장, Gemini 실패 표시, 빈 CTR을 0으로 저장. 상세: `knowledge/logs/2026-11.md` 2026-11-06 절.
- **시작 브리핑 (2026-11-06 신설)**: 새 대화의 첫 답변은 `episode-planning` Phase 0-C 브리핑으로 연다(`CLAUDE.md`, SessionStart 훅). 판정 코드는 `scripts/growth-rules.mjs`다. 주간 목표는 `knowledge/channel-strategy.md`에 정했다(쇼츠 화·토 주 2개, 주간 조회수 1,000회, 신규 구독 3명). 지금 판정은 "다음 제작은 쇼츠부터"다. EP24~29 쇼츠 후보 12개를 각 편 `SHORTS.md`에 적었고(2026-11-06), 첫 시험 3개(EP24 11/10, EP25 11/14, EP26 11/17)는 2026-11-07 사용자가 날짜를 승인했다. 7일 안에 편당 500회를 넘는지 보고 나머지를 정한다.
- **렌더링 전 금지어 자동 검사 (2026-11-06 신설)**: `npm run check-terms -- videos/<프로젝트>`. Claude Code에서는 렌더 명령을 훅이 막는다. EP24~29는 금지어가 남아 있어 다시 렌더링하려면 먼저 고치거나 사용자 승인이 필요하다.
- **규칙 충돌 미정리**: 훅 규칙(지인 대화·연구량 증명) vs 경험 날조 금지, BGM 볼륨 6% vs 8~10%, (클로즈업 CTR 1위 규칙은 2026-11-11 예측기 삭제로 해소).

## ✅ 제작 완료 (업로드 대기) — 단편 EP29(Best와 Vest를 똑같이 읽으면 미국인이 못 알아듣는 이유 | B vs V 24쌍 반복 듣기)

- 폴더: `videos/ep29-b-vs-v/`
- 기획 상태: 11-Phase 워크플로우 완비 (소재 확정, 제목 3안, 5단어 썸네일 4종, 10프레임 frame.md, SCRIPT.md, visual-prompts.md 완료)
- 메인 제목: `[반복 듣기] Best와 Vest를 똑같이 읽으면 미국인이 못 알아듣는 이유 | B vs V 24쌍 소리 연습`
- 썸네일 카피: `[반복 듣기]` (칩) + `B vs V` (화이트 앵커) + `다 'ㅂ'으로 읽으셨죠?` (골드 알약 3단어, A안 상식파괴형 확정)
- 사전 예측: `videos/ep29-b-vs-v/REVIEW.md` 기록 완료 (최근 롱폼 중앙값 대비 2.0~3.5배 예상)
- 에셋 전처리:
  - 오디오 103개 클립 분할 완료 (`assets/voice/`) 및 Whisper 단어 타임스탬프 `.words.json` 전수 추출 완료.
  - Zero Watermark 검수 및 ffmpeg 크롭/delogo 완벽 제거 완료 (`f01_best_vs_vest.mp4`, `f02_articulation.jpg`, `f07_cafe_ambience.mp4`).
- 컴포지션 구현: 10개 프레임 완비 + 10초 엔드스크린 탑재 (총 412.59초 / 6분 52.6초).
- 렌더링 완료: `output/upload-packages/ep29-b-vs-v/English_Pronunciation_B_vs_V_Minimal_Pairs_Listening_Drill.mp4` (Full HD 1920x1080, 30.0MB, 412.59초 / 6분 52.6초, 12,378 프레임 100% 무결점 렌더 완료, 소요 시간 14m 31.8s).
- 공식 시그니처 아바타 썸네일 4종 탑재 완료: `thumbnail-variant-a.jpg`(A안 채택), `thumbnail-variant-b.jpg`(B안), `thumbnail.jpg`(C안 와이드), `thumbnail-close-up.jpg`(D안 모바일 전용 클로즈업).
- 업로드 패키지 빌드 완료: `output/upload-packages/ep29-b-vs-v/` (메타데이터, 원클릭 복사 HTML 대시보드 `index.html` 완비).
- **다음 행동**: 사용자가 원클릭 대시보드(`output/upload-packages/ep29-b-vs-v/index.html`) 열람 후 유튜브 스튜디오 업로드 및 예약 설정 진행 ➔ 차기 에피소드(EP30) 기획 착수.

## ✅ 제작 완료 (업로드 대기) — 단편 EP28(원어민이 F와 P를 0.1초 만에 구별하는 법 | F vs P 24쌍 반복 듣기)

- 폴더: `videos/ep28-f-vs-p/`
- 타임라인: 총 415.61초 (6분 55.6초) / 10개 프레임 완비 + 10초 엔드스크린 구간 탑재 (405.61s~415.61s).
- 검수 완료: `npx hyperframes check` 린터/런타임/레이아웃/모션/대비 59/59 WCAG AA 100% 통과 (Check passed).
- 렌더링 완료: `output/upload-packages/ep28-f-vs-p/English_Pronunciation_F_vs_P_Minimal_Pairs_Listening_Drill.mp4` (Full HD 1920x1080, 30.1MB, 415.61초 / 6분 55.6초, 12,469 프레임 100% 무결점 렌더 완료, 소요 시간 14m 44.6s).
- 업로드 패키지 빌드 완료: `output/upload-packages/ep28-f-vs-p/`
  - 메타데이터: `title.txt`, `title-variants.txt`, `timeline.txt` (10개 챕터 + 10초 엔드스크린), `description.txt`, `pinned-comment.txt`, `tags.txt`, `status.json` (`ready_to_upload`), `upload-checklist.txt`
  - 원클릭 대시보드: `index.html` (유튜브 스튜디오 메타데이터 원클릭 복사, 썸네일 4종 뷰어 완비)
  - 썸네일 4종 탑재 완료: `thumbnail-close-up.jpg`(모바일 1위 권장), `thumbnail.jpg`(메인 와이드), `thumbnail-variant-a.jpg`(A안 상식파괴), `thumbnail-variant-b.jpg`(B안 직격형) — Zero Watermark 검수 100% 통과 완료
- **다음 행동**: 사용자가 패키지 폴더(`output/upload-packages/ep28-f-vs-p/index.html`) 열람하여 유튜브 스튜디오 업로드 및 예약 설정 진행 ➔ 차기 에피소드(EP29) 기획 착수.

## ✅ 제작 완료 (업로드 대기) — 단편 EP27(영어 -S · -ES 끝소리 3가지 물리법칙 24단어 반복 듣기 롱폼)

- 폴더: `videos/ep27-s-ending/`
- 렌더링 완료: `renders/ep27-s-ending_2026-10-09_21-40-16.mp4` (Full HD 1920x1080, 23.1MB, 499.62초 / 8분 19.6초, 14,989 프레임 전량 무결점 렌더 완료).
- 업로드 패키지 완비: `output/upload-packages/ep27-s-ending/`
  - 최종 비디오: `English_Pronunciation_S_Ending_3_Rules_Listening_Drill.mp4` (23.1MB)
  - 썸네일 4종: `thumbnail-close-up.jpg`(모바일 1위 권장), `thumbnail.jpg`(C안 메인), `thumbnail-variant-a.jpg`(A안 반전), `thumbnail-variant-b.jpg`(B안 실수경고) — Zero Watermark 검수 100% 통과
  - 메타데이터: 10개 챕터 타임스탬프 `description.txt`, `title.txt`, `title-variants.txt`, `tags.txt`, `pinned-comment.txt`, `timeline.txt`, `upload-checklist.txt`, `status.json` (`ready_to_upload`), 원클릭 HTML 대시보드(`index.html`) 완비.
- **다음 행동**: 사용자가 원클릭 대시보드 열람 후 유튜브 업로드 및 예약 설정 진행 ➔ 차기 에피소드(EP28) 기획 착수.

## ✅ 제작 완료 (업로드 대기) — 단편 EP22(과거형 -ED 끝소리 3가지 규칙 24단어 집중 듣기 롱폼)

- 폴더: `videos/ep22-ed-ending/`
- 렌더링 완료: `renders/ep22-ed-ending_2026-10-09_20-44-19.mp4` (Full HD 1920x1080, 28.2MB, 502.87초 / 8분 22.9초, 15,087 프레임 전량 무결점 렌더 완료).
- 업로드 패키지 완비: `output/upload-packages/ep22-ed-ending/`
  - 최종 비디오: `English_Pronunciation_Past_Tense_ED_Ending_3_Rules_Listening_Drill.mp4`
  - 확정 제목 (Variant C 채택): `[집중 듣기] 영어 과거형 끝소리 3가지 비밀, 원리 하나로 귀가 뚫립니다 | -ED 발음 규칙`
  - 썸네일 전략: 아바타 전면 제외 ➔ 3단 소리 인포그래픽 포스터형 (`[집중 듣기]` + `-ED` + `소리가 3개였네!`)
  - 메타데이터: 10개 챕터 타임스탬프 `description.txt`, `title.txt`, `title-variants.txt`, `tags.txt`, `pinned-comment.txt`, `timeline.txt`, `upload-checklist.txt`, `status.json` (`ready_to_upload`), 원클릭 HTML 대시보드(`index.html`) 완비.
- **다음 행동**: 사용자가 원클릭 대시보드 열람 후 유튜브 업로드 및 예약 설정 진행.

## ✅ 제작 완료 (업로드 대기) — 단편 EP26(Right vs Light R vs L 자음 20쌍 반복 듣기 롱폼)

- 폴더: `videos/ep26-r-vs-l/`
- 렌더링 완료: `renders/ep26-r-vs-l_2026-10-09_18-57-49.mp4` (Full HD 1920x1080, 39.5MB, 744.66초 / 12분 24.7초, 22,340 프레임 전량 무결점 렌더 완료).
- 업로드 패키지 완비: `output/upload-packages/ep26-r-vs-l/`
  - 최종 비디오: `English_Pronunciation_Right_vs_Light_Minimal_Pairs_Listening_Drill.mp4`
  - 썸네일 4종: `thumbnail-close-up.jpg`(모바일 1위), `thumbnail.jpg`(A안 메인), `thumbnail-b.jpg`(B안 경고), `thumbnail-c.jpg`(C안 원리) — 워터마크 0% 무결점 통과
  - 메타데이터: 10개 챕터 타임스탬프 `description.txt`, `title.txt`, `tags.txt`, `pinned-comment.txt`, `timeline.txt`, `upload-checklist.txt`, `status.json` (`ready_to_upload`), 원클릭 HTML 대시보드(`index.html`) 완비.
- **다음 행동**: 사용자가 원클릭 대시보드 열람 후 유튜브 업로드 및 예약 설정 진행.

## ✅ 제작 완료 (업로드 대기) — 단편 EP25(Pool vs Pull 장모음 [uː] vs 단모음 [ʊ] 20쌍 반복 듣기 롱폼)

- 폴더: `videos/ep25-pool-pull/`
- 렌더링 완료: `renders/ep25-pool-pull_2026-10-08_22-18-10.mp4` (Full HD 1920x1080, 40.3MB, 780.25초 / 13분 00.3초, 23,408 프레임 전량 무결점 렌더 완료).
- 업로드 패키지 완비: `output/upload-packages/ep25-pool-pull/`
  - 최종 비디오: `English_Pronunciation_Pool_vs_Pull_Minimal_Pairs_Listening_Drill.mp4`
  - 썸네일 4종: `thumbnail-close-up.jpg`(모바일 1위), `thumbnail.jpg`(A안 메인), `thumbnail-b.jpg`(B안 경고), `thumbnail-c.jpg`(C안 원리)
  - 메타데이터: 10개 챕터 타임스탬프 `description.txt`, `title.txt`, `tags.txt`, `pinned-comment.txt`, `timeline.txt`, `upload-checklist.txt`, `status.json`, 원클릭 HTML 대시보드(`index.html`) 완비.
- **다음 행동**: 사용자가 원클릭 대시보드 열람 후 유튜브 업로드 및 예약 설정 진행.

## ✅ 제작 완료 (업로드 대기) — 단편 EP24(Sheep vs Ship 장모음 [iː] vs 단모음 [ɪ] 20쌍 반복 듣기 롱폼)

- 폴더: `videos/ep24-long-short-i/`
- 렌더링 완료: `renders/ep24-long-short-i_2026-10-08_20-13-06.mp4` (Full HD 1920x1080, 43.8MB, 569.32초 / 9분 29.3초, 17,080 프레임 전량 무결점 렌더 완료).
- 업로드 패키지 완비: `output/upload-packages/ep24-long-short-i/`
  - 최종 비디오: `English_Pronunciation_Sheep_vs_Ship_Minimal_Pairs_Listening_Drill.mp4`
  - 썸네일 4종: `thumbnail.jpg`(A안 메인), `thumbnail-close-up.jpg`(모바일 1위), `thumbnail-b.jpg`(B안 경고), `thumbnail-c.jpg`(C안 원리)
  - 메타데이터: 10개 챕터 타임스탬프 `description.txt`, `title.txt`, `tags.txt`, `pinned-comment.txt`, `timeline.txt`, `upload-checklist.txt`, `status.json`, 원클릭 HTML 대시보드(`index.html`) 완비.
- **다음 행동**: 사용자가 원클릭 대시보드 열람 후 유튜브 업로드 및 예약 설정 진행.

## ✅ 제작 완료 (업로드 대기) — 단편 EP23(hello·class·happy, 같은 자음 두 개는 한 번만 소리 난다, 첫 듣기 롱폼 18분 05초)

- 폴더: `videos/ep23-double-consonant/`
- 렌더링 완료: `renders/ep23-double-consonant_2026-10-07_21-22-54.mp4` (Full HD 1920x1080, 41.4MB, 1084.80초 / 18분 04.8초, 32,544 프레임 전량 무결점 렌더 완료).
- 업로드 패키지 완비: `output/upload-packages/ep23-double-consonant/`에 `video.mp4`, 썸네일 2종(`thumbnail.jpg`, `thumbnail-close-up.jpg`), 12개 챕터 타임스탬프 `description.txt`, `title.txt`, `tags.txt`, `pinned-comment.txt`, `upload-checklist.txt`, 원클릭 복사 HTML 대시보드 완비.
- **다음 행동**: 사용자가 원클릭 대시보드 열람 후 유튜브 업로드 및 예약 설정 진행.


## 관련 문서

- [채널 데이터 현황](channel-data-snapshot.md) — 롱폼 vs 쇼츠 실측, 성장 레버 판단 근거
- [시즌1 EP9](episodes/season1-ep09.md)
- [시즌1 EP10](episodes/season1-ep10.md)
- [콘텐츠 포맷](content-formats.md)
- [제작 규칙](production-rules.md)
- [썸네일 전략](thumbnail-strategy.md)
