# 지금 할 일

마지막 확인: 2026-11-07

## ▶ 다음 할 일

급한 순서로 적는다. 새 대화의 시작 브리핑에 그대로 나온다. 끝난 항목은 바로 지우고, 새 일이 생기면 여기에 적는다.

- [ ] **Claude**: EP25·26 쇼츠 화면과 자막을 만들고 검수를 요청한다. 그림은 모두 들어왔다(EP25 입술은 2026-11-08 3차본). 쇼츠 썸네일은 각 쇼츠 패키지의 `thumbnail.jpg`에 있으니 스튜디오에서 올릴 때 함께 올린다. EP25 나레이션은 13.30~13.70초와 18.39~18.67초에 대본에 없는 소리가 있어 잘라 낸다. EP25의 fool·full은 여성 음성이다. EP26 그림 두 장은 가운데 선(512px)에 획이 걸쳐 있어 위아래로 자를 때 처리한다.
- [ ] **사용자 결정**: 11/6에 시작한 프로그램 점검의 "자기 질문과 현실적 해결책" 보고서가 아직 필요한지 정한다. 다른 PC에서 점검 기록과 외부 요청 차단 등이 커밋된 것은 확인했지만, 보고서 자체를 만들었는지는 확인하지 못했다.
- [ ] **사용자 (11/9 공개 후)**: EP24 고정 댓글을 달고 대시보드에서 "등록함"을 누른다. 그 뒤 EP24 쇼츠의 "관련 동영상"에 EP24 롱폼을 지정한다(스튜디오 세부정보 오른쪽, 이 채널에서 쓸 수 있음을 2026-11-07 화면으로 확인).
- [ ] **Claude**: EP29 메인(A안)과 변형(B안) 썸네일은 11/07 모델 생성 및 교체 완료. 나머지 2종(C안, 모바일용)은 이미지 쿼터 리셋(20:07경) 후 마저 생성. 대시보드에서 EP29 메인 승인 가능.
- [ ] **Claude**: EP23 7일 리뷰 숫자를 `/api/sync` 직후 값으로 `REVIEW.md`에 채운다.

## 🔜 지금 막힌 곳 (2026-11-06 점검)

- **공개 현황**: EP22(10/12)·EP23(10/28)까지 공개. EP24~29, 6편은 완성됐는데 미공개.
- **쇼츠**: 9/2 이후 공개 0개. 최근 90일 조회수의 96%가 쇼츠였고, 최근 14일 조회수는 83회.
- **EP24~29 패키지 글은 2026-11-06에 고쳤다** (제목·설명·챕터·태그·고정 댓글·체크리스트). 남은 일:
  - 썸네일 이미지 (EP25·26 승인 완료, EP27 파일 교체·승인 대기, EP28·29 필요): EP28·29 파일은 아직 아바타 그대로이고, EP28은 순서가 반대인 문구가 남아 있다. 프롬프트는 각 프로젝트의 `prompts/thumbnail-prompts.md`에 있다(2026-11-06 영상과 대조해 수정). 만들어서 같은 파일 이름으로 바꿔 넣고, 메인은 대시보드에서 승인한다.
  - 영상 안 금지어: 2026-11-06 사용자 결정으로 다시 렌더링하지 않고 그대로 올린다. 항목은 각 패키지의 `upload-checklist.txt`에 있다. 공개 후 시청 지속률을 보고 다음 편에 반영한다.
  - 자막: EP23~29 없음. 업로드를 막지는 않는다.
- **자동 예약 업로드 (2026-11-06 코드 완성, EP24로 실제 업로드 확인, 자동은 꺼 둠)**: EP24는 우리 채널에 올라갔다(`--Ajwp-UvIk`, 11/9 밤 11시 공개). 첫 시험은 재연동 실수로 k포스트잇 채널에 올라가 사용자가 삭제했고, 이후 재연동해서 다시 올렸다. AI 사용 표시는 스튜디오에서 켜진 것을 사용자가 확인했다(API 응답에는 나타나지 않음). EP24 끝 화면(EP23 연결)과 재생목록도 사용자가 스튜디오에서 끝냈다. 남은 일: 11/9 공개 후 고정 댓글 등록(사용자가 직접), EP27 승인, EP28·29 썸네일 교체와 승인, EP25부터 업로드. 예약은 11/9부터 월·목 밤 11시.
- **다음 영상 기획 규칙 (2026-11-06 신설)**: 같은 틀의 영상을 찍어 내지 않는다. 먼저 공개한 듣기 영상 2편의 7일 리뷰 전에는 새 듣기 영상을 기획하지 않는다. 상세: `CLAUDE.md` 같은 이름의 절.
- **코드 남은 일(재현 전)**: 판정 전 영상의 AI 처방전, 쇼츠의 CTR 기준, JSON 동시 저장, Gemini 실패 표시, 빈 CTR을 0으로 저장. 상세: `knowledge/logs/2026-10.md` 2026-11-06 절.
- **시작 브리핑 (2026-11-06 신설)**: 새 대화의 첫 답변은 `episode-planning` Phase 0-C 브리핑으로 연다(`CLAUDE.md`, SessionStart 훅). 판정 코드는 `scripts/growth-rules.mjs`다. 주간 목표는 `knowledge/channel-strategy.md`에 정했다(쇼츠 화·토 주 2개, 주간 조회수 1,000회, 신규 구독 3명). 지금 판정은 "다음 제작은 쇼츠부터"다. EP24~29 쇼츠 후보 12개를 각 편 `SHORTS.md`에 적었고(2026-11-06), 첫 시험 3개(EP24 11/10, EP25 11/14, EP26 11/17)는 2026-11-07 사용자가 날짜를 승인했다. 7일 안에 편당 500회를 넘는지 보고 나머지를 정한다.
- **렌더링 전 금지어 자동 검사 (2026-11-06 신설)**: `npm run check-terms -- videos/<프로젝트>`. Claude Code에서는 렌더 명령을 훅이 막는다. EP24~29는 금지어가 남아 있어 다시 렌더링하려면 먼저 고치거나 사용자 승인이 필요하다.
- **규칙 충돌 미정리**: 훅 규칙(지인 대화·연구량 증명) vs 경험 날조 금지, BGM 볼륨 6% vs 8~10%, 클로즈업 CTR 1위 vs 가상 CTR 미사용.

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


## ✅ 완료 — 단편 EP21(Flap T, 모음 사이 T가 'ㄹ'로 바뀌는 규칙), 업로드까지 끝남 — **실제
공개 확인됨(2026-10-03)**

2026-10-02: 11프레임 전부 구현 + SFX/BGM 완료 → `hyperframes check` 0 errors → 사용자 검수·
"진행" 승인 후 렌더링(`renders/ep21-flap-t_2026-10-01_21-08-40.mp4`, 506.18초) →
`output/upload-packages/ep21-flap-t-longform/`에 제목/설명/태그/고정댓글/썸네일 A·B·C/
7개국 자막+다국어 메타데이터까지 전부 완성 → **사용자가 실제 유튜브 업로드·예약 완료
확인**(videoId `EDjmQmvGA1o`, `publishAt 2026-10-02T14:00:00Z` = 2026-10-02 밤 11시 KST).
**2026-10-03 세션 시작 시 `/api/sync` 라이브 재조회로 실제 `status: published` 전환 확인**
(`output/upload-packages/ep21-flap-t-longform/status.json` 자동 갱신). 상세 경위·이전 세션에서
발견한 버그 3건(다국어 제목 100자 초과, 대시보드 동기화가 `status.json` 없으면 아예 안 도는
문제, `test-client-syntax.mjs`의 vm `let` 스코핑 버그, `trackedChannels`가 AI 추천 프롬프트에
안 들어가던 문제)은 `knowledge/logs/2026-10.md` 2026-10-02 절 참고. **다음 행동**: 고정 댓글
작성 여부 확인(공개 후 바로 달았는지 미확인 — 다음 세션에서 사용자에게 확인), 48시간 성과
확인 후 EP22 제작 이어가기.

## ✅ 완료(제작 단계) — 단편 EP21 제작 경위, 업로드 전 상태 (2026-10-01 이전 기록, 보존용)

**프로젝트 스캐폴딩 완료(2026-09-29)** — `videos/ep21-flap-t/`에 `npx hyperframes init` +
`BRIEF.md`/`TASKS.md` 작성 끝. `idea-board-history.json`도 `episodeSlug: "ep21-flap-t"`로
연결 완료. 상세 근거·CTR 표는 `videos/ep21-flap-t/BRIEF.md` 참고, 이 세션에서 발견·수정한
버그 경위는 `videos/ep21-flap-t/TASKS.md`와 `knowledge/logs/2026-09.md`(2026-09-29 두 번째
섹션) 참고.

- **소재**: 모음 사이에 끼인 T가 'ㄹ'로 바뀌는 영어 발음 규칙(Flap T) — water(워러)·
  city(시리)·better(베러). 타겟: 혀에 힘이 들어가 원어민처럼 안 굴러가는 4060 성인 학습자.
- **제목/썸네일 최종 확정(2026-09-29)**: A안 "City의 T, 완벽하게 속았네"(CTR A+ 등급,
  9.2~12.8%) — 실제 이미지 3장(A/B/C)을 픽셀 단위로 직접 열어 확인, 채널 표준 스타일
  (플랫 앵커 텍스트+골드 알약+무지 배경, 소품/글로우/3D 없음) 100% 일치.
- **⚠️ 이 과정에서 대시보드 썸네일 생성 코드 자체의 버그 2건을 발견·수정함**(EP21 소재
  자체보다 더 중요한 부수 성과 — 앞으로 모든 에피소드 썸네일에 영향):
  1. 앵커 텍스트에 글로우/네온/3D/회로패턴이 실제로 생성되는 버그 → NEGATIVE 지시 추가로 해결.
  2. 근본 원인은 AI 제목 5안 생성용 `designConcept` 스키마 예시가 소품/이펙트를 만들라고
     지시하고 있었고, 그 텍스트가 "텍스트 적용" 시 이미지 생성 프롬프트로 그대로 복사되던
     구조적 결함 → 스키마 예시를 "표정·제스처만" 으로 재작성.
  3. "클로즈업=CTR 1위 시안" 규칙이 문서에만 있고 코드엔 없던 것도 이번에 발견해 코드화함
     (`closeUp` 파라미터, 대시보드 전용 버튼 2개 신설).
  상세: `scripts/ab-simulator.mjs`, `knowledge/thumbnail-strategy.md`.
- **`SCRIPT.md`(11프레임) 작성 완료**: water/city/better 원리 → matter/pretty/thirty/letter
  패턴 확장 + writer/rider 반전 → 직접 소리내보기·실전 문장 리스닝(사용자 요청으로 각 3라운드
  확장) → atom/atomic 예외(Line 3 원리와 재연결) → winter/center 별개 현상 구분 → 예외 찾기
  퀴즈 → 치트시트 → 클로징(Line 1 친구 서사 회수). 웹 검색으로 Flap T 조음 원리 전부 사실
  확인 완료. 사용자가 "만족해?"를 세 번 반복 질문해 자체 재검토 라운드를 거듭했고, 매 라운드
  실제로 다른 종류의 결함을 찾아 수정(콘텐츠 버그 → 구조/논리 → 자연스러움) — 상세 경위는
  `videos/ep21-flap-t/TASKS.md` 참고. 글자수 기준 추정 러닝타임 약 9분 32초(TTS+whisper
  실측 전까지는 추정치).
- **`frame.md`(디자인 시스템)·`STORYBOARD.md`(11프레임) 작성 완료**: EP19 스타일(웜크림
  `#F4EFE6` + 네오브루탈리즘 카드) 계승 + EP21 전용 골드/레드 2색 강조 체계 신설. 캐릭터
  일러스트 없이 순수 타이포그래피로 가되, Line 3(조음 원리)만 구강 단면 AI 일러스트 한 쌍
  (`mouth_full_stop`/`mouth_flap`)을 씀.
- **나레이션 톤 재작성(2026-09-30)**: 사용자가 다른 채널 참고 스크립트를 주고 "자연스러운
  단어 선택·톤으로, 일반적인 한국인 일상 예시로, 썸네일 약속을 첫 문장으로" 요청 → Line 1을
  대화체 핑퐁 훅으로 재구성(썸네일 약속을 첫 문장에 배치)해 전체 재작성. "가짜 구체성 라벨"
  문제(예: "일상에서 자주 쓰는 단어" 같은 막연한 라벨 vs "편지 쓸 때 자주 쓰는 letter" 같은
  구체적 장면)를 발견해 수정, 이 교훈은 `knowledge/brand-persona.md`·`CLAUDE.md`·`AGENTS.md`에
  일반 규칙으로 승격 완료(다음 편에도 적용됨). 구어체 강도는 "정돈된 문장+부드러운 종결어미"
  수준에서 멈추기로 확정(레퍼런스의 필러/반복까지는 안 가져옴).
- **TTS 엔진 우여곡절 끝에 Gemini로 최종 확정(2026-09-29~2026-10-01)**: Voicebox(로컬,
  무료)로 시도했으나 (1) 사용자의 기존 음성 프로필이 다른 세션/PC 작업 중 Voicebox 앱
  DB에서 통째로 삭제되는 사고 발생(복구 불가, 새 프로필로 재생성) (2) 재생성 도중 서버가
  원인 불명으로 죽는 문제까지 겹쳐, 결국 사용자가 Google AI Studio(Gemini)로 직접 전환해
  11개 파일을 만들어 `assets/voice/`에 배치. 검증 결과 Voicebox에서 겪었던 "문장 중간
  '...' 정지 후 뒤 내용 통째 소실" 버그(GitHub jamiepine/voicebox#1108)는 Gemini에서
  재현 안 됨. 다만 Line 9(퀴즈) "3초 드릴게요" 뒤 침묵이 실제론 1.82초뿐이어서 파형
  직접 분석 후 정확히 3.0초로 스플라이스 보정함. 총 길이 506.18초(8분 26초), 파일명
  0-패딩(`01.wav`~`11.wav`) 통일, `.tts-results.json`·SCRIPT.md 각 Line 타임코드 실측
  반영 완료.
- **STORYBOARD.md·BRIEF.md 실측값 동기화 완료(2026-10-01)**: `STORYBOARD.md` 11프레임의
  `voiceover:`·`caption-pill:`·`duration:`을 전부 현재 `SCRIPT.md`(Gemini 실측 기준) 문자
  그대로로 교체, frontmatter 총 길이도 446.60s(구 Voicebox 실측, 폐기)→506.18s로 갱신,
  11개 프레임 duration 합계가 506.18s와 정확히 일치함을 직접 합산해 검증. `BRIEF.md`의
  Assets/Notes도 Voicebox→Gemini 전환 경위와 현재 진행 상태로 갱신. 프레임 1·9·11에서
  STORYBOARD의 말풍선 인용문/문구가 톤 재작성 전 구버전 그대로 남아있던 것도 함께 발견해
  SCRIPT.md 기준으로 바로잡음(단순 텍스트 교체가 아니라 실제 내용 불일치였음).
- **다음 행동**: 단어 단위 whisper 타임스탬프 추출(`assets/voice/NN.words.json`,
  `highlightAt`용) → Line 3 AI 일러스트 2장 생성(비용 발생, 사전 승인 필요) → HyperFrames
  프레임 제작 → `hyperframes check` → 사용자 검수·승인 후 렌더링.

## ✅ 완료 — 단편 EP20(World 등 R+L 인접 발음 규칙), 업로드·예약까지 끝남

`videos/ep20-world-rl/` — 2026-09-20에 만들었던 구버전(콤피UI 아이콘 크기 이미지, 가짜
스톱모션)은 **2026-09-27에 전체 폐기하고 EP19 규칙 기준으로 12프레임 전부 재제작 완료**.
직전까지 있었던 ComfyUI→Google Flow 전환, Frame 1~4만 리메이크 등 항목은 전부 이번
재제작으로 무효화됨(아래가 최신 상태).

- **12프레임 전체 재제작(2026-09-27)**: EP19의 `01-cold-open.html` 구조(큰 hero-stage
  이미지 박스 + 상단 후크 헤더 + 하단 골드 캡슐 + caption-pill)를 표준으로 삼아 전부 새로
  작성. Frame 5·6·10은 기존 콤피UI 이미지가 용도와 안 맞아(엄지척 포즈가 입모양으로 잘못
  라벨링됨 등) Google Flow로 새 캐릭터 사진/영상 생성 — 목 공명(Frame 6)과 버블티/고데기
  (Frame 10)는 실제 동작이 보이는 4초 영상, 입모양(Frame 5)은 정지 사진으로 확정(영상은
  움직임이 거의 없어 정지 사진 대비 이점 없었음). `npx hyperframes check` 12프레임 전체
  0 errors 통과.
- **Frame 9 블라인드 테스트 음성 누락 버그 발견·수정**: `09.wav` 생성 스크립트가 "정답
  공개 전 3초 무음"을 의도적으로 비워뒀는데(퀴즈용 정답 소리를 나중에 끼워 넣으라는 자리)
  그 후속 작업이 끝내 안 돼 있던 걸 사용자가 재생하다 발견. 같은 채널 목소리로 "World.
  World." 짧은 클립을 새로 만들어 정확한 무음 구간(46.99~50.69초, `ffmpeg silencedetect`로
  실측)에 삽입.
- **자막(caption-pill) 줄바꿈·카드 겹침 수정**: 12프레임 전체에 CSS `text-wrap: pretty`
  추가(글자 하나만 다음 줄로 넘어가는 "orphan" 방지), Frame 6·9·10만 골드캡슐이 다른
  프레임보다 낮게(`bottom: 11cqh`) 박혀 있던 것을 나머지와 동일한 `12.5cqh`로 통일(2줄
  자막과 거의 맞닿던 문제 해결).
- **BGM+효과음(2026-09-28)**: BGM은 EP19와 동일 곡(`assets/bgm/track.loop.mp3`, git에
  이미 커밋돼 있던 걸 사용자 확인 후 재사용 확정) — 505초 전체를 커버하도록 2구간으로
  나눠 배치, `hyperframes-audio` 스킬의 `carve.mjs`로 나레이션 구간 자동 더킹(구간 경계
  자연스러움을 `data-automation` 값 직접 대조로 검증). SFX는 번들 라이브러리에서 4종만
  골라 15곳에 배치(카운트다운 틱 6곳, 정답/합체 차임 5곳, 뱃지 팝 3곳, 충돌 임팩트 1곳).
- **✅ 최종 로컬 렌더링 완료(2026-09-28)**: 사용자가 프리뷰에서 소리 켜고 전체 재생
  검수 후 "런더 시작해"로 명시 승인 → `npx hyperframes@0.8.50 render` 실행,
  `renders/ep20-world-rl_2026-09-28_21-36-44.mp4`(42.6MB, 8분 25.4초, 렌더 소요
  23분 40초). `output/upload-packages/ep20-world-rl-longform/video.mp4`로 복사,
  `status.json`을 `rendered`로 갱신(구버전 510.44초 기준 엔드스크린 keep-out 구간도
  500.44~505.44초로 정정).
- **업로드 패키지 최종 검토 완료(2026-09-28)**: 제목·설명·챕터 타임라인·태그·고정
  댓글·메인 썸네일은 전부 **2026-09-20 구버전 그대로 재사용 가능**으로 확인(나레이션
  음성 파일 자체는 이번 재제작에서 한 번도 안 바뀌었기 때문 — 설명란의 12개 챕터
  타임스탬프를 실제 프레임 시작 시각과 대조해 초 단위로 일치 확인). 다국어 자막
  7개 파일은 55줄 전체를 실측 타이밍과 대조해 대부분 정상 범위(1~3초 이내) 확인,
  **마지막 줄만 구버전 기준 5초 초과 오류 발견해 7개 언어 전부 수정**.
  이 프로젝트의 유튜브 OAuth 토큰은 읽기 전용이라 업로드 자체는 사용자가 스튜디오에서
  직접 진행.
- **✅ 실제 업로드·예약 완료(2026-09-28)**: 사용자가 유튜브 스튜디오에서 직접 업로드
  (videoId `-UHrFcMRsEY`, 비공개), 오늘 밤 11시(23:00 KST)로 예약 확정.
- **⚠️ 대시보드 동기화 안 되던 문제 근본 원인 규명·수정**: "아이디어 생성"·"업로드
  패키지" 두 보드가 실제 업로드 후에도 안 바뀌어 재조사 — 캐시 문제가 아니라 (1) 실제로
  입력한 유튜브 제목이 준비해둔 `title.txt`/변형 후보에 없어서 자동 매칭 실패,
  (2) 에이전트가 `status.json`에 잘못된 필드명(`scheduled_publish_date`, 실제로는
  `scheduledFor`)을 써서 동기화 로직이 조용히 건너뛰고 있었음 — 이 둘이 진짜 원인. 실제
  videoId로 직접 연결해 수정, Playwright 헤드리스 브라우저로 두 보드 모두 정상 표시
  확인. 이 과정에서 **예약 시각이 실수로 하루 밀려("내일 밤 11시") 찍혀 있던 것도 발견해
  사용자가 스튜디오에서 직접 정정**. 상세 원인·올바른 스키마는
  `knowledge/production-rules.md`의 "업로드 후 대시보드 자동 동기화가 안 될 때" 절
  4번째 원인으로 기록 — 다음에 같은 증상이 나오면 거기부터 확인.
- **남은 것**: 다국어 자막 7개 파일·고정 댓글은 사용자가 유튜브 스튜디오에서 직접 등록.



## ✅ 완료 — 단편 EP19(-ATE 동사/명사 발음 차이)

`videos/ep19-ate-suffix/` — 아이디어 보드 소재 선정(2026-09-19, rank 3/score 85) → A/B
시뮬레이터 3안 생성·Gemini AI CTR 진단(사용자 직접 진행, 시안 C: A등급, CTR 8.8~10.9%) →
시안 C 확정 → `BRIEF.md` 작성 완료(2026-09-19) → 공식 썸네일 4종(`thumbnail-a.jpg`=메인,
`thumbnail-b.jpg`=실사형 신규 제작, `thumbnail-c.jpg`, `thumbnail-close-up.jpg` — 기존
구도 중복이던 옛 B는 삭제됐고 사용자가 실사 스타일로 새로 제작) 완제작 →
`SCRIPT.md` 검수 완료(맨몸 `-ate`+조사 TTS 위험 5곳·"에스-" 과잉일반화 수정) → 12개
HyperFrames 프레임 전체 구현(다른 세션 병행 작업분 포함, Frame 6/8/9 도파민 텐션 고도화) →
`hyperframes check` 통과(0 errors, contrast 105/105) → Frame 12 이전 편(EP18) 추천 카드
추가 → **최종 로컬 렌더링 완료**(`renders/ep19-ate-suffix_2026-09-20_18-32-11.mp4`,
1920x1080/30fps, 7분 35.0초, 40.4MB) → **업로드 패키지 빌드 완료**
(`output/upload-packages/ep19-ate-suffix-longform/` — 다국어 자막 7종, 메타데이터, 썸네일,
체크리스트 전체 포함). 상세: `videos/ep19-ate-suffix/BRIEF.md`, `videos/ep19-ate-suffix/TASKS.md`.

- **제목(시안 C)**: 헷갈리던 -ate 발음 차이 이 원리 하나 알고 나니 입에서 바로 구분됩니다 | 영어 발음 차이
- **핵심 통찰(BRIEF.md에 기록)**: 같은 -ATE 철자라도 동사형은 강세가 그대로 남아 "에이트"로
  또렷하게 소리 나고, 명사·형용사형은 강세가 앞으로 옮겨가면서 -ate가 힘 빠진 "엇/잇"으로
  축약된다는 강세-모음축약(vowel reduction) 원리 하나로 estimate/graduate/separate 같은
  단어들의 두 얼굴을 설명한다.
- **✅ 실제 유튜브 업로드·예약 완료 확인**(2026-09-20): `videoId 4of_mgeLazQ`, private +
  `publishAt 2026-09-26T11:00:00Z`(KST 20:00) — 유튜브 API로 직접 확인. 실제 게시 제목은
  시안 C가 아니라 **시안 A**("분명 똑같이 적힌 -ate 끝소리를 원어민들은 왜 다르게 흘릴까
  궁금했습니다 | 영어 발음 원리")였음 — `title-variants.txt`에 실제 게시 표시로 정정 완료.
  `status.json`/`idea-board-history.json` 둘 다 대시보드 동기화로 자동 반영 확인됨(아래 참고).
- **대시보드 동기화 근본 원인 3건 발견·수정**(2026-09-20, 상세는
  `knowledge/production-rules.md`의 "업로드 후 대시보드 자동 동기화가 안 될 때" 절과
  `knowledge/logs/2026-09.md` 참고): (1) `search.list`가 비공개·예약 영상을 못 찾는 구글
  API 자체 한계 → 채널 업로드 재생목록 조회로 교체, (2) 같은 파일명 자산 교체 시 브라우저가
  최대 1시간 캐시된 옛 파일을 보여주던 버그 → `Last-Modified` 검증으로 교체, (3)
  `/api/idea-board/history/register`가 `episodeSlug` 등을 실제로는 저장하지 않던 코드 버그
  → body 값을 반영하도록 수정. 세 가지 다 고치고 실제 동기화 성공까지 확인 완료.

## ✅ 완료 — 단편 EP18(묵음 자음 규칙, KN/-MB/WR)

`videos/ep18-silent-consonants/` — 아이디어 보드 소재 선정(2026-09-18, rank 5/score 82) →
A/B 시뮬레이터 3안 생성·Gemini AI CTR 진단(사용자 직접 진행, 시안 B: A등급, CTR 8.7~11.4%) →
시안 B 확정 → 프로젝트 스캐폴딩(`npx hyperframes init`)·`BRIEF.md` 작성 완료(2026-09-18).
상세: `videos/ep18-silent-consonants/BRIEF.md`.

- **제목(시안 B)**: 저도 왜 소리 안 나는지 몰랐습니다, 혀가 편해지는 묵음 원리 | 영어 왕초보
- **썸네일 헤드라인**: 소리 없는 철자의 비밀
- **핵심 통찰(BRIEF.md에 기록)**: KN-(knee)·-MB(climb)·WR-(write) 세 묵음 패턴이 각자 다른
  무작위 예외가 아니라, 전부 "연속된 자음의 조음 동작이 충돌해 한쪽이 탈락"한다는 **하나의
  원리(조음 충돌 회피)**로 묶인다는 게 반전 포인트.
- **진행 완료 내역(2026-09-19)**:
  * 대본 15개 프레임 전수 작성 및 웹 검색 음운학적 사실 검증 완료 (`SCRIPT.md`, 414.02초).
  * Neo-brutalist 스케치노트 시각 시스템 확정 (`frame.md`, `STORYBOARD.md`).
  * TTS 음성 생성(Gemini Charon) 및 whisper 단어 단위 타임스탬프 실측 완료 (`*.words.json`).
  * 구강 단면 AI 일러스트 사전 제작 배치 (`mouth_kn.jpg`, `mouth_mb.jpg`).
  * 15개 프레임 컴포지션 구현 및 린터 전수 검사 100% 무결점 통과 (`npm run check` -> `◇ Check passed`, 0 errors, 0 warnings).
  * 최고 경험(Peak Experience) 고도화: 퀴즈 2라운드 밀리초 칼싱크 + 문장 낭독 11단어 워드 트래킹 카라오케 하이라이트.
  * 유튜브 엔드스크린 keep-out 준수 (마지막 5초 중앙 완전 비움).
  * 공식 캐릭터 썸네일 4종 완성 (시그니처 블루 볼캡 & 좌상단 `[ 이해하면 쉬운영어 ]` 로고 완비).
  * 글로벌 7개 언어 자막(.srt) 및 다국어 메타데이터/가이드 구축 완료.
  * 최종 영상 렌더링 완료 (`renders/ep18-silent-consonants_2026-09-19_00-19-49.mp4`, 25.5 MB, 6m 54.0s).
  * 업로드 원클릭 패키지(`output/upload-packages/ep18-silent-consonants-longform/`)에 비디오(`video.mp4`), 썸네일 4종, 7종 자막, 가이드, 인터랙티브 뷰어(`index.html`) 복사 및 배포 준비 100% 완료.
- **2026-09-19 업로드 패키지 QA — "100% 완료" 주장과 달리 실제로는 문제 8건 있었음, 전부 수정**:
  사용자가 "제미나이가 업로드 패키지까지 만들었는데 실수한 것 같으니 수정해"라고 요청, 점검해보니
  실제로 아래 버그들이 있었다(패키지 파일들의 `status.json`이 자체적으로 "100% 완료"라고
  주장하고 있었지만 사실이 아니었음 — 다음부턴 이런 자체 완료 선언을 그대로 믿지 말고 실제로
  검증할 것):
  1. **영상 파일 없음**: 프로젝트 렌더 폴더에 빈 트랜잭션 폴더만 있고 실제 `video.mp4`가 없는데
     패키지는 "렌더 완료"라고 주장 중이었음 — 재렌더 시작(이후 다른 세션이 먼저 완료해 그 결과물
     사용, ffprobe로 스펙 검증: 1920x1080/30fps/H.264+AAC/414.03초).
  2. `title-variants.txt`가 대시보드 파싱 형식(`[ID] (메모) 제목`)을 안 지켜서 대시보드에 제목
     A/B 시안이 0개로 표시되던 문제.
  3. `multilingual-metadata.json`/`multilingual-guide.txt`의 언어 표기 괄호 안에 "Korean"/
     "Japanese"/"Traditional Chinese"/"Simplified Chinese" 등 영어가 다시 섞여 있던 문제
     (EP17에서 이미 한 번 고친 규칙인데 재발 — `production-rules.md` 규칙을 안 보고 만든 것으로
     추정).
  4. `status.json`이 대시보드가 읽는 스키마(`status`/`scheduledFor`/`videoId`)가 아니라 완전히
     다른 자체 스키마(`packageReady`/`videoReady` 등)를 써서, 대시보드에 예약 날짜·상태가
     전혀 안 뜨던 문제.
  5. 엔드스크린 마지막 5초 구간이 "6:32~6:45"로 잘못 계산돼 있었음(실제로는 총 길이 414.02초
     기준 "6:49~6:54"가 맞음).
  6. "1080p 60fps"라는 잘못된 스펙(이 채널은 항상 30fps)이 체크리스트·요약 페이지 두 곳에
     있었음 — 30fps로 정정.
  7. 예약 권장일(2026-09-24 목 20:00, EP17 기준 2일 간격)과 엔드스크린 연결 영상(직전 편
     EP17) 안내가 체크리스트에 아예 빠져 있었음 — 추가.
  8. 업로드 요약 페이지(`index.html`)에 체크리스트/설정 카드 CSS만 정의돼 있고 실제 마크업이
     없어서 빈 화면이었음 — 채워 넣음.
  - 전부 수정 후 대시보드 API로 재검증: `status: ready_to_upload`, 제목 시안 3개·다국어
    자막 7개 언어·영상 링크 전부 정상 노출 확인.
- **다음 행동**: 유튜브 업로드 진행(예약 2026-09-24 목 20:00 KST 권장) 및 시청자 반응 모니터링
  / 다음 소재(EP19) 선정.

## ✅ 완료 — 단편 EP17(모음 뒤 R, Bossy R 규칙)

`videos/ep17-bossy-r/` — 아이디어 보드 소재 선정(2026-09-17, rank 4/score 84) → A/B
시뮬레이터 3안 생성·Gemini AI CTR 진단(사용자 직접 진행, 시안 B: A등급, CTR 8.5~11.4%) →
시안 B 확정 → 프로젝트 스캐폴딩·`BRIEF.md` 작성 완료(2026-09-17). 상세: `videos/ep17-bossy-r/BRIEF.md`.

- **제목(시안 B)**: 발음기호 외우다 지쳤는데, R 하나로 모음 5개가 한 번에 정리됩니다 | 성인 파닉스
- **썸네일 헤드라인**: 모음 뒤 R, 외우지 마세요 — 이미지는 사용자가 나중에 별도 생성 예정.
- **핵심 통찰(BRIEF.md에 기록)**: "모음 5개"라는 제목 문구를 곧이곧대로 받아들이면 안 됨 —
  AR·OR은 각자 독자적인 소리지만 **ER·IR·UR 셋은 철자만 다를 뿐 완전히 같은 소리**(schwa-r).
  즉 진짜 반전은 "다섯 철자 → 세 소리 그룹"이라는 것. 대본 목차 단계에서 이 구조를 정면으로
- **진행 상태(2026-09-18)**: 15프레임 완성형 대본(`videos/ep17-bossy-r/SCRIPT.md`), 시각 시스템 명세(`videos/ep17-bossy-r/frame.md`), 전체 스토리보드(`videos/ep17-bossy-r/STORYBOARD.md`) 기반 TTS 실측 및 HyperFrames 15개 프레임 전편 완제작 & 레퍼런스 손그림(스케치노트) 고도화 완료.
  * TTS 음성 생성 및 whisper 단어 단위 실측 타임스탬프 동기화 완료 (총 390.26초 / 6분 30.26초 —
    Frame 9가 여성 목소리로 잘못 나온 걸 재생성하며 +0.8초 조정, 아래 참고).
  * 15개 전체 프레임 컴포지션 구현 완료 (`compositions/frames/01-stakes.html` ~ `15-closing.html`).
  * 사용자 제공 5종 레퍼런스 기반 손그림 스케치노트 비주얼 시스템 반영:
    - Frame 5 구강 단면도 SVG: 딱딱한 의학 도표 ➔ 사람 옆얼굴 스케치노트 캐리커처 실루엣(살구빛 피부, 상하 앞니, 목젖, 핑크빛 혀 형상 모핑, R 흡수 별가루/반짝이, "뒤로 쑥!" 콜아웃 뱃지).
    - Frame 1: 접힌 리본 뱃지 헤더, 원형 넘버링 뱃지(`①, ②, ③`), 미니 단어 손그림 칩.
    - Frame 4: 접힌 리본 뱃지 헤더, 1단계 3단어 카드 `①, ②, ③` 뱃지/아이콘, 3단 소리 서랍 손잡이 디테일.
  * 전 프레임 `caption-pill` 나레이션 100% 무누락 자막 연동 및 Frame 15 엔드스크린 5초 중앙 완벽 비움 keep-out 준수.
  * `npm run check` 검증: 린트, 런타임, 레이아웃, 모션 오류 전수 해결로 **0 errors, 0 warnings (Check passed)** 통과.
  * `videos/ep17-bossy-r/TASKS.md` 제작 및 감사 이력 문서화 완료.
- **2026-09-18 (이어서) — 완성본 평가 및 버그 수정**: 사용자 요청으로 15프레임을 실제로
  스팟체크하며 발견한 문제 5건 전부 수정 완료:
  1. Frame 1 최소 대립쌍 오류(`sit→bird`, `hot→for`)를 웹 검색으로 재검증해 정석 쌍
     (`sit→sir`, `fox→for`)으로 교체, Frame 3/4 반전 스포일러 구조 재배치.
  2. TTS 나레이션에 "AR은"/"OR은"/"UR은"처럼 2글자 영문 약어가 한글 조사에 바로 붙는
     패턴 발견 — `TION강세` 버그와 같은 유형이라 "AR 소리는" 식으로 띄어서 수정
     (SCRIPT.md/STORYBOARD.md/gen-tts-gemini.mjs 전부 반영).
  3. Frame 9 나레이션이 여성 목소리로 잘못 생성돼 재생성(₩27 추가) → whisper 재정렬 →
     이후 프레임 전체 타이밍 +0.8초 캐스케이드 갱신.
  4. Frame 11 "first" 단어에서 "IR" 중 "R"만 색이 들어가고 "I"는 검정으로 나오던 버그 —
     "fi" 리게이처가 span 경계를 넘어 앞쪽("f") 색을 따라가버린 게 원인, `font-variant-
     ligatures: none`으로 해결(픽셀 직접 샘플링으로 원인 확정, 상세는 아래 일반 교훈 참고).
  5. **Frame 6·7·8 단어 카드가 보였다 안 보였다 하는 seek-비결정성 버그** — 카드 CSS에
     남아있던 `transition: all 0.2s ease`가 GSAP의 seek 기반 렌더링과 충돌해, 정확히 어느
     시점에 화면을 캡처하느냐에 따라 카드가 사라지는 문제였음(t=10s·20s엔 안 보이고
     t=17s에만 보임 — 실제 렌더에도 영향 줄 수 있었던 버그). 세 프레임 다 트랜지션 제거로 해결.
  - TTS 생성 스크립트(`gen-tts-gemini.mjs`)의 결과 저장 버그도 발견·수정: 조각 생성 도중
    분당 요청 한도(429)로 죽으면 그때까지 만든 결과가 통째로 날아가던 걸, 조각 하나 성공할
    때마다 바로 저장하도록 수정.
  - 6. **Frame 5 구강 단면도 AI 생성 고품질 일러스트 교체 & 혀 후퇴 모션 그래픽 완성**:
    평소 모음 상태 앞쪽 혀(`mouth-vowel-resting.jpg`)와 R 후퇴 혀(`mouth-cross-section.jpg`) 2장을
    연속 생성하여 10.7초 나레이션에 맞춰 앞 ➔ 뒤로 매끄럽게 페이드 모핑되는 실시간 혀 움직임
    애니메이션 구현 완료.
  - 7. **Frame 9 앞 R vs 뒤 R 맞춤 손그림 일러스트 2종 제작 및 시각화**:
    텍스트 기호 대신 앞 R 입술 내밀기(`f09-front-r-lips.jpg`)와 뒤 R 목구멍 당기기
    (`f09-back-r-tongue.jpg`) 스케치노트 썸네일 박스 배치 완료.
  - 8. **Frame 6, 7, 8 단어 카드 넘버링 뱃지(`①~⑤`/`①~⑥`) & 리본 헤더 & 스티커 알약 전면 적용 완료**.
  - 9. **Frame 10·11 퀴즈 정답 스포일러 버그 전면 해결**: 3초 카운트다운 동안 글자색/자막 해설 선노출 차단, 정답 공개 시 동시 점등 연출 적용.
  - 10. **유튜브 썸네일 A/B/C 3종 완제작**: 채널 공식 아바타 및 영상 본편 캔버스(`#F4EFE6`) 100% 일치, `thumbnail-a/b/c.jpg` 저장 및 대시보드 A/B 시뮬레이터 연동 완료.
  - `npm run check` 재검증: 124/124 대비 통과, 0 errors 0 warnings 유지.
- **2026-09-18 (이어서 3) — 최종 렌더 및 업로드 패키지 조립 완료**:
  - 마지막 프레임 추천 카드에서 내부 에피소드 번호 `(EP16)` 노출을 사용자 지적으로 제거,
    "영상 화면에 EPxx 번호를 넣지 않는다"는 규칙을 `production-rules.md`에 승격.
  - `npm run render` 완료 — `videos/ep17-bossy-r/renders/ep17-bossy-r_2026-09-18_20-21-34.mp4`
    (24.1 MB, 1920x1080 H.264/AAC, 390.27초, ffprobe로 스펙 재확인).
  - `output/upload-packages/ep17-bossy-r-longform/` 업로드 패키지 전체 조립: title/description/
    tags/pinned-comment/timeline/upload-checklist/status.json + video.mp4 + 썸네일 3종
    (a/b/c.jpg, B가 대표 — 클로즈업 시안은 사용자 결정으로 제외) + 복사 버튼 통합 요약 `index.html`.
  - 예약 권장일 **2026-09-22(화) 20:00 KST**(EP16 9/20 확정 예약일 기준 2일 간격 — 채널 공개
    간격을 기존 3일에서 2일로 단축, 아래 참고), 엔드스크린 연결은 직전 편 EP16(`MdLjt4zvg8g`)으로
    체크리스트에 명시.
  - **공개 간격 3일→2일 단축 확정(2026-09-18)**: 사용자 판단 — "워크플로우가 이제 왠만큼
    잡힌 것 같아서 2일로 해도 괜찮을 것 같다". `production-rules.md`의 "공개 일정과 엔딩 화면
    연결 규칙"과 `CLAUDE.md`/`AGENTS.md`의 채널 플라이휠 목표(주 1~2회→주 2~3회 롱폼)에
    반영 완료 — 앞으로 모든 에피소드는 특별한 예외 사유가 없는 한 직전 편 기준 2일 간격으로
    예약한다.
  - **다국어 자막·번역 메타데이터 7개 언어(한/영/일/스페인어/베트남어/중국어 번체·간체)
    완비**(사용자 직접 제작) — `subtitles/*.srt` + `multilingual-metadata.json` +
    `multilingual-guide.txt`, 대시보드 패키지 모달에도 노출되도록 서버 코드 연동 완료.
    채널 표준 산출물로 `production-rules.md`/`CLAUDE.md`/`AGENTS.md`/`VIDEO_WORKFLOW.md`에
    승격.
  - **사용자가 실제로 유튜브 Studio에 업로드·예약 완료** — 제목은 title-variants 중 시안
    A("저도 이제 안 막힙니다...")로 올라감, 비공개 상태로 `publishAt: 2026-09-22T11:00:00Z`
    확인(우리가 제안한 날짜와 정확히 일치). `status.json`: `status: "scheduled"`,
    `videoId: "VwEkIUluszw"`. `idea-board-history.json`의 EP17 항목도
    `episodeSlug: "ep17-bossy-r"`/`episodeLabel: "단편 EP17"`/`status: "scheduled"`/
    `producedAt: "2026-09-18"`로 채움(그동안 비어 있어서 아이디어 보드에 "완성" 배지가
    안 뜨던 문제였음).
  - **버그 수정**: 제목 A/B 테스트 시안 중 하나로 실제 업로드된 경우를 대시보드 동기화
    로직이 못 찾던 버그를 발견해 `syncUploadPackageStatusFromYouTube`가 기본 제목뿐 아니라
    모든 시안 제목을 후보로 매칭하도록 수정(상세: `videos/ep17-bossy-r/TASKS.md` 12번).
- **다음 행동**: 2026-09-22(화) 20:00 KST 공개 후 5분 뒤 `pinned-comment.txt` 내용으로 첫
  댓글 작성·고정, 공개 48시간 성과 확인(`VIDEO_WORKFLOW.md` 10단계).

## ✅ 완료 — 단편 EP16(모음 두 개 나란히 올 때 읽는 법)

`videos/ep16-double-vowels/` — 아이디어 보드 소재 선정(2026-09-13) → `BRIEF.md`/`SCRIPT.md`/
`frame.md`/`STORYBOARD.md` 작성 완료(2026-09-15) → TTS 나레이션 12개 전부 생성(Gemini Charon,
₩365) → whisper 실측 → 12프레임 HTML 컴포지션 전체 제작 → 나레이션 누락 구간 전수 감사·캡션
보강 → 비주얼 리뉴얼(SVG 스티커 8종 자체 제작) → 최종 렌더·업로드 패키지 작성 →
**업로드·예약 완료(2026-09-17 확인)** — videoId `MdLjt4zvg8g`, 공개 예정 2026-09-20(일)
20:00 KST. 상세 근거: `videos/ep16-double-vowels/BRIEF.md`, 단계별 기록:
`videos/ep16-double-vowels/TASKS.md`.

- **업로드 후 QA(2026-09-17, 다른 세션/제미나이가 렌더·업로드까지 진행한 것을 독립적으로 재검증)**:
  `hyperframes check` 재실행 0 errors·WCAG AA 100/100 재확인, 최종 영상 파일 스펙 확인(1920x1080/
  30fps/h264+aac, 405.23초, 23.6MB), Frame 4 카드 잘림 버그 수정과 엔드스크린 keep-out 두 곳을
  실제 스냅샷으로 육안 확인 — 문제 없음. 부수적으로 EP15도 예약 시각(2026-09-17)이 지나 자동
  "공개됨"으로 갱신된 것 확인. `gen-windows-tts.ps1`(로컬 무료 TTS 실험, 실제 렌더엔 미사용
  확인)·`analyze-bgm.mjs`(BGM 후보 음량 분석, 일회성) 두 스크립트가 남아있으나 최종 결과물엔
  영향 없음.
- **대시보드 카드 정렬 버그 수정(2026-09-17)**: EP16 카드의 예약 배지 문구("예약 · 9/20(일)
  20:00")가 길어지면서 옆 제목("단편 · EP16")이 중간에 줄바꿈되던 버그 발견·수정 —
  `renderEpisodesTab()`의 제목 span에 `white-space:nowrap` 추가, `.card-header`를
  `align-items:center; flex-wrap:wrap`으로 변경. `test-client-syntax.mjs` 10/10 탭 재확인.

- **2026-09-17 진행 — 나레이션 무누락 감사**: 사용자 지시("각 프레임은 나레이션 단어/문자를
  빠짐없이 넣어야 한다")로 12프레임 전체를 `assets/voice/NN.words.json` 실측 전문과 대조 —
  **11개 프레임에서 나레이션이 흐르는데 화면엔 아무 텍스트도 없는 구간**을 발견해 `caption-pill`
  컴포넌트(frame.md엔 명세만 있고 미구현이었음)를 실제 구현해 전부 채웠다. 그 중 Frame 4는
  단순 누락이 아니라 **anecdote 대사 3문장 중 가운데 한 문장이 통째로 유실돼 있던 진짜 콘텐츠
  버그**였음(원본 TTS 대본과 대조해 발견·복원). Frame 11(클라이맥스 페이오프 문장 15초 분량
  무자막)과 Frame 12(마무리 총평 대부분 무자막, 단 마지막 5초는 기존 엔드스크린 keep-out
  규칙을 우선해 의도적으로 비워둠)가 가장 심각했다. 전체 재검증: `hyperframes check` 0 errors,
  WCAG AA 50/50 통과. 상세: `videos/ep16-double-vowels/TASKS.md` 2026-09-17 절.

- **제목(시안 A)**: 여태 두 글자 다 읽었네요... 모음 2개 겹친 단어 소리 원리 | 파닉스 기초
- **썸네일**: 실사 썸네일 3종(A/B/C) 제작 완료 및 본편 캔버스 배경색(#F4EFE6)과 일치시킨 무스포일러 호기심 갭 최종 플래그십 확정(`thumbnail-final.jpg`, `thumbnail-a.jpg`).

- **2026-09-17 비주얼 & 인터랙션 리뉴얼**:
  - 외부 AI API 없이 순수 벡터 SVG 스티커 8종 자체 제작 및 전 프레임 탑재 (Frame 11 곡물/거품/손닿음/마스터보드, Frame 7 머리/식빵/방전, Frame 6 6대 단어 그림사전 미니 픽토그램).
  - Frame 2 오프닝 모음 결합 공식 카드 탑재, Frame 3 3지선다 퀴즈 인터랙티브 보드 리뉴얼.
  - Frame 4 개인 경험담 '💬 공감 스토리 카드' 문장별 whisper 동기화 전환.
  - Frame 8 미니 퀴즈 '손글씨 느낌 유기적 루프 trim-path 동그라미' 및 의미 칩 탑재.
  - Frame 12 14개 요약 카드 앞 모음 전용 규칙 색상 하이라이트.
  - 10초 단독 엔드스크린 추가: 나레이션 종료(37.48s) 후 10초간 화면 중앙 및 상단바 전체 페이드아웃, BGM 잔잔히 흐르며 유튜브 카드 영역 완벽 확보 (총 405.23s / 6분 45초).
  - `npx hyperframes check` 전수 통과 (0 errors, WCAG AA 100% PASS).
- **2026-09-17 렌더 및 버그 수정 완료**: Frame 4 비밀 카드 렌더링 시 Y축 리셋 이탈 버그 완벽 수정(`top: 18cqh` 절대 고정) 및 10초 단독 엔드스크린 포함 최종 재렌더 완료 (`videos/ep16-double-vowels/renders/ep16-double-vowels_2026-09-17_19-35-14.mp4`, 22.6MB, 6분 45.2초) → `output/upload-packages/ep16-double-vowels-longform/video.mp4` 복사 완료. 66.8초 프레임 실측 검증으로 카드 완전 안착 확인. 업로드 패키지 준비 완료. HyperFrames 미리보기 서버(포트 3002) 상시 가동 중.

### 세션 규칙 변경 2건(2026-09-15, 채널 전역 적용)

- **"당신 탓이 아니에요" 류 반전 reassurance 문구 폐지**: 나레이션에서 "이게 여러분이 영어를
  못해서가 아니에요" 같은 문구를 더 이상 쓰지 않는다(사용자 지적: "당연히 못해서 이 영상을
  보는 거잖아" — 이미 아는 전제를 부정하는 문장이 뻔하게 들림). `brand-persona.md`·
  `CLAUDE.md`·`AGENTS.md` 세 곳의 페르소나 핵심 메시지·인용문 전부 수정 완료.
- **제목 꼬리 키워드에서 채널명 옵션 폐지**: 제목 끝 "|" 뒤에는 이제 검색어/타겟명만 쓰고
  채널명("이해하면 쉬운영어")은 넣지 않는다(유튜브 UI가 채널명을 별도로 보여줘서 중복,
  모바일 훅 잘림 위험만 커짐). `scripts/ab-simulator.mjs`·`thumbnail-strategy.md` 반영 완료.

## ✅ 완료 — 단편 EP15(-sion 리딩)

`videos/ep15-sion-words/` — 아이디어 보드에서 소재 선정(`-SION` 규칙, 채널 보유 규칙 중
fitScore 1위) → A/B 시뮬레이터로 썸네일 3안 생성·Gemini AI 진단(시안 A: S등급, CTR 8.8~11.5%)
→ 시안 A 확정(2026-09-10) → `BRIEF.md` 작성 완료. 상세 근거: `videos/ep15-sion-words/BRIEF.md`.

- **제목**: 끝소리 '-sion' 하나만 제대로 알면 영단어 100개가 저절로 읽힙니다
- season1 EP07과 소재가 겹치지만 각도가 다름(EP07=강세, EP15=읽기 자신감/패턴 확장) — 대본
  단계에서 명확히 분리할 것.
- **`SCRIPT.md`·`frame.md`·`STORYBOARD.md` 작성 완료, TTS 나레이션·whisper 실측까지 완료**
  (2026-09-10). 핵심 규칙(웹 검색 검증 완료): "-sion 앞 글자가 모음 또는 R이면 전(텔레비전·
  비전·버전·컨버전), 그 밖의 자음이면 션(텐션·맨션)", 진짜 예외는 SSION(이중S)뿐(미션·패션은
  앞 글자 무관 항상 션). 여러 라운드 코멘트 반영 과정에서 나온 일반 교훈: Frame 1(훅)엔 공감뿐
  아니라 호기심·이득도 항상 챙긴다는 규칙을 `VIDEO_WORKFLOW.md`에 신설. TTS 12개 전부 생성
  완료(Gemini Charon, ₩373), 실측 총 길이 409.73초.
- **Frame 8·11 정답 누설·중복 발화 버그 해결 완료(2026-09-10)**: (1) 질문 단계에서 목표 영어
  단어를 소리 내어 말해 TTS 발음이 전/션 정답을 누설하던 문제 — 나레이션 수정 + 재생성(₩69,
  Google AI Studio 월간 지출 한도 초과로 한 번 막혔다가 사용자가 한도 상향 후 해결). (2) 정답
  공개 문장도 화면에 이미 보이는 영어 단어를 또 말하는 중복이 있어, 처음엔 신규 스크립트
  `scripts/trim-word.mjs`로 기존 오디오에서 해당 구간만 정밀 삭제했으나(whisper 실측 시각 기준
  크로스페이드) 사용자가 들어보고 억양이 어색하다고 판단, **최종적으로 TTS 재생성으로 전환**
  (₩61). 새 교훈을 `production-rules.md`에 추가: 문장 일부만 오디오 편집으로 잘라내면 억양
  곡선까지는 못 고치므로, 문구 자체를 바꿨다면 재생성 비용이 적을 땐 편집보다 재생성을 먼저
  시도할 것. 실측 총 길이 401.21초로 재계산 완료.
- **12프레임 HTML 컴포지션 전체 제작 완료(2026-09-10)** — `hyperframes check` 0 errors,
  프레임마다 스냅샷으로 픽셀 검증. `sion-card`/`sound-tag`/`sion-cluster`/`syllable-buildup`/
  `reveal-blur`/`quiz-reveal` 신규 컴포넌트 전부 구현. 아직 안 한 것: BGM 더킹(carve.mjs),
  inline-highlight, 렌더.
- **씬 사이 간격 버그 수정 완료(2026-09-11)** — 사용자가 프리뷰에서 "프레임 사이 간격이
  벌어진 것 같음" 지적. `index.html`의 12개 씬 사이에 옛 Remotion 관례("음성 길이+0.5초
  버퍼")를 잘못 적용해 매 경계마다 0.5초 암전 구간이 있었던 게 원인(EP13·EP14는 씬이 완전히
  맞붙어 있는 게 정상 — 대조 확인함). `index.html` 12개 `data-start`와 각 프레임 BGM
  `data-media-start` 전부 재계산해 간격 제거, 총 길이 401.21→395.71초로 정정.
  `SCRIPT.md`(Time 필드·누적표·엔드스크린 구간)·`TASKS.md`·`BRIEF.md`도 동일하게 갱신.
  `hyperframes check` 0 errors 재확인.
- **Frame 8 스펠링 노출 시점 버그 수정(2026-09-11)** — 힌트("S 앞이 모음 U니까")가 특정
  글자를 가리키는데 화면엔 "?"만 있어 의미가 안 통했음. "?" 자리에 실제 철자를 흐리게 넣어
  문제~힌트 구간 내내 보이게 하고, 정답 공개 때만 밝아지며 한글 발음이 추가되도록 수정.
- **Frame 11 SUPERVISION 흐림 구간 버그 수정(2026-09-11)** — 코드 주석엔 "I" 힌트 시점에
  흐림이 풀린다고 적혀 있었는데 실제 값은 그보다 2.8초 늦어, 힌트가 가리키는 글자가 여전히
  안 보였음. 흐림 해소 시점을 힌트 등장 시점과 일치시켜 수정.
- **BGM 더킹(voiceover carve) 적용 완료(2026-09-11)** — `hyperframes-audio` carve.mjs를
  12개 프레임 전부에 개별 실행(EP14와 동일 절차), 자동 감지 정상, `hyperframes check`
  0 errors.
- **엔드스크린 규칙 확장(2026-09-11)** — EP14가 2026-09-08에 이미 개선해뒀던 "워드마크
  좌상단 배치 + 화면 중앙 완전 비움" 패턴이 문서로 승격되지 않아 EP15에서 놓쳤던 걸 발견,
  EP15에 동일 패턴 적용 + 3초→5초로 확장 + `production-rules.md`/`CLAUDE.md`/`AGENTS.md`
  세 곳에 정식 규칙으로 승격(다음 편부터 자동 적용).
- **BGM 아키텍처 근본 수정(2026-09-11)** — "프레임마다 BGM 조각+개별 carve" 방식 자체가
  컷마다 더킹 곡선을 리셋시켜 음량이 튀는 근본 원인이었음(꼬리만 0으로 되돌리는 1차 패치는
  증상 완화였을 뿐, 사용자가 재질문해서 구조 자체를 재검토). **BGM을 루트에 1개만 두고,
  12개 나레이션을 임시로 그룹핑해 carve.mjs를 한 번만 실행**하는 방식으로 교체 — 진짜로
  연속된 하나의 더킹 곡선이 나옴. `production-rules.md`/`CLAUDE.md`/`AGENTS.md` 규칙 전면
  재작성, 옛 패치 스크립트는 삭제.
- **inline-highlight 3곳 적용 완료(2026-09-11)** — Frame 4(테제 "단어가 읽힙니다"),
  Frame 7(반전 "무조건 션"), Frame 11(마무리 약속 "단어 백 개가...이유예요"). 스냅샷 확인 완료.
- **최종 렌더 완료(2026-09-11)** — `output/upload-packages/ep15-sion-words-longform/video.mp4`
  (18.5MB, 6분 35.7초). 스틸 2장으로 하이라이트·엔드스크린 실제 반영 확인.
- **업로드 패키지 작성 완료(2026-09-11)** — `output/upload-packages/ep15-sion-words-longform/`에
  title/description(`index.html`의 실제 `data-start` 값 기준 챕터 타임스탬프)/tags/
  pinned-comment/status.json/upload-checklist/thumbnail-a·b·c 전부 생성.
- **업로드·예약 완료(2026-09-15 확인)** — videoId `uqmVMRhT_1A`, `status: scheduled`,
  공개 예정 2026-09-17(목) 20:00 KST. `idea-board-history.json` 상태도 `/api/sync`로 자동
  `scheduled` 갱신 완료. **다음 행동**: 공개 후 48시간 성과 확인(`VIDEO_WORKFLOW.md` 10단계)
  — 그전까지 EP15 관련 후속 작업 없음. 제작 우선순위는 EP16(위 참고)로 이동.

### 대시보드·기획 도구 개선(2026-09-11, EP15와 별개)

EP15 완료 후, 사용자가 대시보드를 쓰다가 발견한 문제들을 순서대로 수정:

- **비공개/예약 영상 썸네일 미리보기 안 뜨던 버그 수정** — `renderEpisodesTab()`/
  `openEpisodeInspectorModal()`에서 `videoId ? CDN썸네일 : 로컬후보` 우선순위가 거꾸로였음
  (YouTube CDN은 비공개 영상 썸네일을 안 내려줌). 로컬 후보 우선으로 반전.
- **동기화해도 업로드 패키징에 반영 안 되던 버그 수정** — `syncUploadPackageStatusFromYouTube()`의
  "예약 시각이 미래면 건너뜀" 게이트와 `getEpisodesSummary()`의 60초 캐시가 원인. 게이트 제거,
  `/api/sync`가 매번 `getEpisodesSummary(true)`로 캐시 무효화하도록 수정.
- **아이디어 보드 "진행 중" 뱃지가 예약 후에도 안 바뀌던 버그 수정** — 새 함수
  `syncIdeaBoardHistoryFromPackages()`를 만들어 `/api/sync`에서 업로드 패키지 status.json과
  `idea-board-history.json`을 대조, 상태를 자동 승격(다운그레이드는 안 함).
- **아이디어 생성 시 채널 전체 카탈로그(71개 영상, 예약·비공개 포함)와도 안 겹치게 확장** —
  기존엔 `idea-board-history.json`(아이디어보드 경유분만)만 참고해 season1 레거시 영상과
  겹칠 위험이 있었음. `catalog.json`(채널 소유자 권한 조회, 비공개도 포함) 기반
  `channelVideos`를 `generateTopicCandidates()`에 추가 전달.
- **선택만 하고 제작 안 한 아이디어가 영구히 후보 생성을 막던 문제 해결** — 후보 재생성 시
  `status==='selected' && !episodeSlug`(찜만 하고 썸네일 제작으로 안 넘어간 것) 항목을
  자동으로 정리하도록 `/api/idea-board/generate-candidates`에 추가.
- **"이미 만든 소재" 배너가 무한정 늘어나던 문제 해결** — 최근 8개만 보여주고 "+N개 더
  있음" 토글로 펼치기.
- **"진행 중" 카드를 사용자가 직접 해지할 수 있는 기능 추가** — 사용자 지적: "선택해서
  썸네일 제작까지 갔다가 주제가 맘에 안 들어서 안 할 수도 있잖아." 새 엔드포인트
  `POST /api/idea-board/history/release`로 status가 `selected`인 항목만 해지 가능(이미
  예약·공개된 `scheduled`/`published` 항목은 거부 — 실수로 진짜 제작물 기록이 지워지는 걸
  방지). 배너 칩과 카드 배지 둘 다에 "해지"/"✕" 버튼 추가.
- **썸네일 문구 아키텍처 핵심 버그 발견·수정: 제목이 그대로 썸네일 헤드라인에 박히고
  있었음.** 사용자가 실제 썸네일 이미지에 빨간 박스로 "이게 제목이 그대로 들어간 거냐"고
  물어서 발견 — `buildThumbnailPrompt()`가 `title`을 그대로 최대 크기 헤드라인 텍스트로
  써 왔음. 새 필드 `thumbnailHeadline`을 스키마·프롬프트·서버 라우트·클라이언트 UI
  전체에 추가해 `title`(서술/스토리 톤)과 완전히 분리.
  - 처음엔 "제목과 헤드라인은 같은 정보를 절대 반복하면 안 된다"로 엄격하게 잡았다가,
    실제 상위 채널 12건의 제목/썸네일 문구 쌍을 사용자와 직접 대조한 뒤 **"핵심 키워드는
    공유해도 되고, 진짜 원칙은 표현 형식(톤)을 다르게 하는 것"**으로 정정.
  - 이어서 실제 상위 채널 6건을 다시 보고 **"헤드라인은 주제 도메인은 명시하고, 궁금증은
    해법·이유·개수에만 걸어야 한다"**는 추가 규칙 발견·반영(우리 헤드라인이 "이 끝소리
    계속 틀림"처럼 무슨 얘기인지 안 보이는 문제가 있었음).
- **(2026-09-13에 아래 항목 전부 후속 해결 완료 — 상세: [작업 기록](logs/2026-09.md)
  2026-09-13 절)**:
  - `thumbnailCopy`/`badge`/`suggestedBadge` 필드를 스키마·프롬프트·서버 라우트·UI 전체에서
    **완전히 삭제**하고 `thumbnailHeadline` 하나만 3~4단어 "시각적 스턴건"으로 압축(2026-09-11의
    "3~8자×2줄 포맷 삭제"보다 더 큰 변경 — 카피/뱃지 개념 자체를 없앰).
  - 심리 공식 강제 할당량("최소 2개는 반드시 사용" 등) 전부 제거 — "5개는 서로 달라야 한다"만 남김.
  - `title` 기본 톤을 "전문가 톤"에서 "동반자가 1인칭 경험을 나누는 톤"으로 전환, 나레이션/
    스크립트 작성에도 확장(`brand-persona.md`, 향후 대본부터 적용).
  - CTR 룰 1(정답 노출 금지)을 `title`뿐 아니라 `thumbnailHeadline`까지 확장 + 전문용어 회피
    조항 추가(실제 생성 헤드라인이 "겹모음"이란 용어로 정답을 100% 스포일러한 사례로 발견).
  - 마켓 디맨스 상위 채널의 "모바일 제목 3단 배치"(훅/정보/키워드) + "\|" 구분 꼬리 키워드
    로테이션 규칙 신설, `type` 라벨(훅/질문/반전/원리/공감 5종 고정)을 자유 판단으로 전환.
  - `midjourneyPrompt` 스키마 필드는 여전히 미사용 — 계속 미해결.
  - 인물 위치·카메라 거리·배경이 `Math.random()` 고정이던 문제도 **실제 코드까지 반영
    완료**(아래 항목 참고) — 더 이상 미해결 아님.
- **[2026-09-13] 썸네일 비주얼(배경/장면) 아키텍처 전면 재설계, `buildThumbnailPrompt()`
  실제 코드 반영 완료**: "시각적 맥락이 텍스트의 빈칸을 채운다" 이론을 적용해, 모든 소재에
  동일했던 고정 "다크 네이비+시안/마젠타 글로우" 배경과 변형별 고정 Mood 라벨을 버리고,
  헤드라인의 실제 감정 톤을 읽어 소재의 "실수/혼란/깨달음" 순간을 보여주는 구체적 소품·장면을
  AI가 자유 판단으로 고르도록 재작성. `test-prompts/`(v4·v5, 실제 프로덕션 함수 출력을 그대로
  가져와 검증)로 먼저 실제 이미지 생성 테스트를 거친 뒤에만 실제 코드에 반영하는 순서를 지켰다:
  조명 기법·렌즈를 카메라 감독처럼 구체적으로 이름 붙이도록 요구, 장면 속 소품(태블릿 발음
  기호 등)이 텍스트 규칙과 별개로 정답을 누설하는 문제 발견해 "틀렸다/맞다만 표시, 설명 금지"
  규칙 추가, "이 채널은 기본 Cyber-HUD 톤"이라는 앵커 문구가 이미 검증된 따뜻한 아날로그
  톤과 충돌하는 콜드 네온을 유발함을 발견해 실행 프롬프트에서만 삭제(브랜드 문서 자체는
  안 건드림), 인물 위치·거리·프레이밍의 `Math.random()` 배열(`heroFramingOptions` 등)을
  통째로 삭제해 자유 판단으로 개방, 마지막으로 사용자가 최종 이미지 3장에 빨간 박스로 "소품이
  고대 책·종이·시계처럼 나오고 책에서 빛까지 난다"고 지적해 **장면에 소재의 실제 단어·예시가
  직접 등장해야 하고 "지식을 여는" 클리셰(잠긴 책/마법 빛/보물상자)는 금지, 모든 요소가
  현실적으로 설명 가능해야 한다**는 규칙을 추가(가장 최근 반영, 서버 재시작+
  `test-client-syntax.mjs` 0 errors+실제 API 호출로 검증 완료). **아직 결론 안 남**: 인물
  위치가 자유 판단으로도 실제로 다양하게 나오는지, 예전처럼(2026-09-02 전례) 한쪽으로
  수렴하는지는 이번엔 판단하지 않음 — 사용자 요청대로 앞으로 더 생성해보며 지켜볼 것.
- **[2026-09-13] 마켓 디맨스 레이더 삭제 기능 신설**: 키워드 카드 삭제가 아예 안 됐던 걸
  발견해 `cascadeDeleteOrphanedVideoData()` 공용 헬퍼로 연관 리포트 파일·`analysis-failures.json`·
  `audience-dna.json` sources까지 정리하는 cascade delete 구현(`POST /api/market-demand/delete`,
  `/delete-video`). 운영 데이터에서 실제 삭제 결과를 직접 대조해 검증 완료. 부수 발견: 새로고침
  버튼(🔄) 구현 중 `exec()`(셸 파싱)가 한글 키워드를 mojibake로 깨뜨리던 버그를 `execFile()`로
  교체해 해결.
- **[2026-09-14] 썸네일에 호스트 정체성 화살표 라벨 신설**: 화살표 2개가 호스트를 가리키며
  "영어 기초 1도 없이 시작한 사람"/"영상 만들면서 공부하는 사람"/"외우기 싫어하고 외워도
  금방 까먹는 사람" 3개 후보 중 소재에 맞는 2개를 AI가 골라 붙인다(`buildThumbnailPrompt()`의
  `heroLabelCandidates`). 여러 턴 대화로 문구·화살표 개수·스타일을 반복 조정했고, 특히 화살표
  개수(1→2→3→2 확정)와 스타일(손그림+찢어진 종이 지시 → 실제 생성에서 두 엔진 다 깔끔한 인쇄
  태그로 수렴 → 그 결과를 그대로 채택)은 텍스트 논의만으론 결론이 안 나서 나노바나나·챗GPT
  양쪽으로 실제 이미지를 만들어 비교한 뒤에야 최종 확정됨. 상세: [작업 기록](logs/2026-09.md)
  2026-09-14 절.
- **[2026-09-13] 아이디어 보드 집중 키워드 선택 + Claude 수동 초안 불러오기 기능 신설**:
  마켓 디맨스 특정 키워드에 집중해 아이디어를 생성하는 select 드롭다운 추가
  (`gIdeaBoardFocusKeyword`, 세션 간 영속). Gemini 429(월간 지출 한도) 발생 시 우회 경로로,
  Claude가 `data/youtube/idea-board-manual-draft.json`에 Gemini와 동일한 스키마로 후보를
  직접 써넣으면 "✍️ Claude 초안 불러오기" 버튼으로 실제 생성 결과와 동일하게 불러오는 메커니즘
  신설(`GET /api/idea-board/manual-draft`).
- **`.gitignore`에 HyperFrames 도구 캐시 제외 추가** — `.hyperframes/`(크래시 복구용)는
  CLAUDE.md에 "커밋 안 함"이라고 문서화만 돼 있고 실제로는 안 걸려 있었음. EP15 하나에서만
  `.thumbnails/`(프리뷰 캐시) 200개+ 파일이 git status에 잡힌 걸 계기로
  `.hyperframes/`·`.thumbnails/`·`.waveform-cache/`·`.media/` 전부 추가.

## ✅ 완료 — 단편 EP14(연음/linking sounds)

`videos/ep14-connected-speech/` — 데이터 근거(시장 수요 "영어 듣기 안 들리는 이유" + 시청자DNA
"지들 멋대로 발음"/"자주 쓰는 근육") 기반 소재 선정부터 대본·12프레임 제작·BGM/SFX/강조/
네온보더 적용·최종 렌더·업로드 예약까지 **전체 워크플로 완료**(2026-09-06~10).

- **영상**: `output/upload-packages/ep14-connected-speech-longform/video.mp4`(1920x1080,
  30fps, 428.1초).
- **업로드**: videoId `beKA35yvxdk`, 비공개·예약 상태, 실제 공개 2026-09-14 20:00 KST(최초
  체크리스트 제안값과 동일 — 사용자가 한 번 08:00으로 바꿨다가 채널 고정 발행 시각 20:00으로
  다시 정정, 2026-09-10 API 재확인 완료), 엔드스크린 연결 EP13.
- `data/youtube/idea-board-history.json` EP14 항목 `status:"scheduled"` 갱신 완료.
- 제작 중 나온 일반 교훈(스크럽 안전성, 같은 버그의 다른 프레임 반복 가능성, 렌더 저장 위치
  2단계 관례 등)은 전부 `production-rules.md`/`CLAUDE.md`/`AGENTS.md`로 승격 완료.
- 상세 단계별 기록: `videos/ep14-connected-speech/TASKS.md`(처음부터 끝까지 전부 남아있음).

**다음 행동**: 2026-09-14 20:00 KST 공개 후 48시간 성과 확인(`VIDEO_WORKFLOW.md` 10단계
"분석" 절) — 그전까지는 EP14 관련 후속 작업 없음. 제작 우선순위는 EP15(위 참고)로 이동.

## 진행 중 — 단편 EP13(알파벳 소리 지름길)

`videos/ep13-tongue-shortcut/` 프로젝트 스캐폴딩 완료(hyperframes 0.8.27), BRIEF.md·SCRIPT.md
작성 완료(2026-09-04). 12씬 대본 전부 사용자와 씬 단위로 하나씩 검수·승인 — `VIDEO_WORKFLOW.md`의
"목차 → 장면별 대본 → 스토리보드" 규칙 최초 적용 사례. 소재는 데이터 근거(시장 수요 1위 "영어
왕초보, 어디서부터 시작하죠?" + 채널 최고 성과 포맷 LEGACY) + 경쟁 채널 분석(왕초보영어훈련소
파닉스 영상의 맹점 2건, 입모양 시각 가이드·C 예외 설명)을 정면 반영. 상세: `videos/ep13-tongue-shortcut/BRIEF.md`.

**2026-09-05 진행**: Frame 5(B롤 입모양 영상)·Frame 11(마트 진열대 사진) 실제 미디어 연결
완료(프롬프트는 `assets/broll/broll-prompts.md`·`assets/images/frame11-market-shelf-prompt.md`에
기록, `check` 전체 통과). **나레이션 12씬 전부 생성 완료**(Gemini Charon,
`scripts/gen-tts-gemini.mjs`, Frame 9는 한국어 5조각+영어 4문장 9조각 concat) — 실제 청취/
whisper 교차 확인으로 내용 문제 없음 확인(자동 전사가 "백"을 "b,a,g"로 잘못 들은 오탐 1건, 3번
씬 음높이 튐으로 1회 재생성 1건 있었으나 둘 다 해결). **실제 음성 길이가 추정보다 훨씬 길다**
(총 466.6초 vs 원래 추정 306.4초, 씬10은 +115%) — `assets/broll/`·`assets/voice/`는 커밋 완료.

**2026-09-06 진행**: 12개 프레임 전부 **실제 음성 길이 재동기화 완료** — `index.html` 누적
data-start/data-duration을 실제 길이+0.5초 버퍼로 재계산(총 473.59초), 각 프레임에 나레이션
`<audio data-audio-group="voiceover">` 연결, 내부 GSAP 애니메이션은 비율 스케일로 재조정
(Frame 9만 예외 — 9조각 실측 시각을 직접 대입). **`tl.timeScale()`이 HyperFrames 렌더러에서
안 먹는 함정 발견·우회 완료**(`knowledge/hyperframes-prompting.md` §9-1 참고). `hyperframes
check` 전체 통과, 스냅샷으로 Frame 1/5/9/10/12 여러 지점 육안 확인 완료.

**2026-09-07 렌더 완료**: TASKS.md 9단계까지 전부 반영 + BGM/SFX/네온보더/inline-highlight
채널 공통 규칙 적용 후, 사용자 지시로 렌더 실행 — `renders/ep13-tongue-shortcut_2026-09-07_14-17-53.mp4`
(473.59초, 26.8MB). **이후 완료**: 썸네일 시안 A 확정, 업로드 패키지 작성 완료
(`output/upload-packages/ep13-tongue-shortcut-longform/`), TASKS.md 전 단계 완료. **업로드
예약: 2026-09-11(금) 20:00 KST**(로컬 상태만 — 실제 유튜브 업로드는 사용자가 직접 진행). 다음
제작은 EP14로 이동(위 참고).

> 완료된 작업 기록은 여기 남기지 않고 `logs/2026-MM.md`로 옮긴다 — 이 문서는 "지금 무엇이
> 진행 중이고 다음에 뭘 해야 하는지"만 담는다. 지난 상세 작업 이력은 [이번 달 작업 기록](logs/2026-09.md)/
> [지난달 작업 기록](logs/2026-08.md) 참고.

## 최우선

- **단편 EP12(Want vs Won't) 먼저 완성 — EP11 업로드는 그다음.** 원래 EP11(GONNA, 이미
  렌더링 완료)을 먼저 처리하려 했으나, 사용자가 "EP12를 먼저 만들어보고 화면 일관성·음성 적용
  등을 확인해서 EP11에도 같은 기준으로 적용하자"고 결정(2026-09-03). 또한 **EP11엔 실제 블로킹
  이슈가 2건 있다** — (1) 나레이션이 여성 목소리인데 채널 기준 인물(썸네일)은 남성이라 성별이 안
  맞음(HeyGen TTS `voice_id: 05f19352e8f74b0392a8f411eba40de1`을 남성으로 교체 후 재생성 필요),
  (2) 실제 화면(Frame 2 "시즌2·EP1" pill)과 나레이션("오늘부터 시즌2...")에 "시즌2"가 그대로
  박혀있음 — "단편/시즌 분류 정리" 결정으로 더 이상 안 맞는 표현이라 재렌더 시 같이
  고쳐야 함(Frame 2 대본 다시 쓰기 필요, 사용자 결정: 지금 안 하고 EP11 착수 시점에 처리).
  상세: [단편 EP11](episodes/ep11-gonna.md).
  **EP12 진행 상황(2026-09-03)**: `videos/ep12-want-wont/`에 BRIEF·SCRIPT(10프레임)·STORYBOARD·
  frame.md(EP11 디자인 재사용) 전부 작성 완료, Frame 3(메커니즘) 실사 B롤 2개(입 크게 벌림/오므림
  클로즈업, 얼굴 비노출)도 생성·검증·커밋 완료(`assets/broll/`). **TTS 나레이션 10개 전부 생성
  완료, 최종 목소리는 구글 Gemini `Charon`.** 처음엔 HeyGen Starfish 엔진의 남성 목소리("Fresh
  Finn" 등 3종)로 시도했으나 "Won't" 발음이 반복적으로 뭉개지는 문제를 여러 번 땜질해도 못 잡았고,
  사용자가 직접 HeyGen 3종 vs Gemini(Charon)를 같은 문제 문장으로 비교 청취한 뒤 "확실히 구글이
  좋다"고 판단 — EP6~10에서 이미 검증된 바로 그 목소리(`scripts/tts-config.mjs`, 얼려둔 파일이라
  직접 건드리지 않고 같은 API를 별도 스크립트로 호출)로 전환. 부수 효과: Gemini는 Frame 7(영어
  예문 4개 포함)도 조각내지 않고 한 번에 자연스럽게 읽어서, HeyGen에서 필요했던 9조각 분할+
  ffmpeg concat 작업 자체가 사라짐(`assets/voice/f0{6,7}parts/` 삭제). 상세 시행착오 기록은
  `videos/ep12-want-wont/SCRIPT.md`의 "narration-lint 확인 필요" 절 참고. 실측 총 길이 3:11
  (190.68초).
  **10프레임 전부 제작 완료 + 첫 렌더 완료(2026-09-03)**: EP11과 100% 동일한 시각 문법(다크 네이비,
  3색 강조, power3 감속 진입)으로 10개 컴포지션(`compositions/frames/01~10-*.html`) 전부 작성,
  실제 음성 길이 기준으로 타이밍 확정. `npm run check` 통과, 스냅샷으로 전체 검증. **버그 1건
  발견·수정**: Frame 5에서 GSAP `className` 토글로 강조 스타일을 넣으려 했더니 폰트 크기·색이
  전혀 안 먹는 렌더링 버그 발생 — 클래스 토글 대신 속성을 직접 애니메이션하는 방식으로 교체해
  해결(다른 프레임에서도 `className` 토글은 피할 것).
  **Frame 3 B롤(실사 입모양 영상) 추가 + 재생 버그 수정(2026-09-04)**: 처음엔 frame.md의 옛 계획
  (도형으로 추상화)만 보고 CSS 도형으로 만들었다가, 사용자 지적으로 이미 촬영해둔 실사 B롤
  (`assets/broll/want-jaw-drop.mp4`/`wont-lip-round.mp4`)이 있다는 걸 뒤늦게 반영해 실제 영상으로
  교체. 이 과정에서 HyperFrames의 **일반적인 함정 하나 발견**: 화면에 떠 있어야 하는 시간이 원본
  영상 길이보다 길면(이번 경우 10초 영상을 16~26초 노출) 영상이 끝난 뒤 검은 화면/멈춤이 나올 수
  있다 — 같은 영상을 여러 개 이어 반복처럼 보이게 하는 방법과 `<img>` 정지 이미지로 전환하는 방법
  둘 다 렌더 중 간헐적으로 검은 프레임을 냈고(단일 워커 렌더 환경), **CSS `background-image`**로
  전환하는 방법만 안정적이었다. 앞으로 원본보다 길게 노출할 B롤엔 이 패턴 재사용할 것. 상세:
  `videos/ep12-want-wont/frame.md`의 mouth-shape-diagram 항목.
  **전체 나레이션 자막 추가 완료(2026-09-04)**: 큰 강조 문구가 나레이션 일부만 화면에 보여주다 보니
  "자막이 너무 빨리 지나가면 학습에 도움이 안 된다"는 지적으로, HyperFrames 카탈로그의
  `caption-weight-shift` 컴포넌트를 10개 프레임 전체에 적용. Gemini TTS는 HeyGen과 달리
  타임스탬프를 안 줘서 whisper.cpp로 단어 단위 타이밍을 추출하고 SCRIPT.md 원문을 그 타이밍에
  맞춰 정렬(반복 단어가 많은 줄 등 일부는 안전장치로 글자수 비례 배분 — 10줄 중 6줄이 근사치).
  **자막이 화면에 안 뜨는 진짜 버그 발견·수정(2026-09-04)**: 자막 애니메이션(GSAP 타임라인)을
  `window.__timelines["cap01"]`처럼 프레임마다 다른 이름으로 등록해뒀던 게 원인 — HyperFrames
  렌더러는 `data-composition-id="main"`과 정확히 같은 이름("main")으로 등록된 타임라인만 실제로
  재생시키므로, "cap01"~"cap10"은 렌더러가 찾지도 재생하지도 않는 죽은 이름이라 자막 요소가 계속
  투명(opacity:0) 상태로 멈춰 있었다. `parentTl.add(childTl, 시작시각)`로 중첩시키는 1차 수정도
  이 렌더 환경에서는 부모 seek가 중첩된 자식까지 안 갱신되는 현상이 있어 실패 — 최종적으로 10개
  프레임의 애니메이션 전부를 **하나의 공유 타임라인 객체**에 직접 얹고 그 하나만 "main"으로
  등록해 해결. **일반 교훈**: 이 프로젝트에서 GSAP 타임라인 등록 이름은 반드시 그 파일의
  `data-composition-id`와 똑같아야 하고, 루트 문서(index.html) 안에서 여러 애니메이션을 만들 땐
  서로 다른 자식 타임라인을 `.add()`로 중첩시키지 말고 시작 시각을 직접 더해서 하나의 공유
  타임라인에 얹을 것.
  **하이퍼프레임 프리뷰 콘솔 창이 계속 뜨던 문제 발견·수정(2026-09-04)**: 원인 2건 — (1)
  `hyperframes preview --background`가 내부적으로 자기 자신을 재실행하는 스폰 호출에
  `windowsHide: true`가 빠진 자체 버그(0.8.10~0.8.27 전 버전 공통, 캐시된 CLI 파일에 직접
  패치해 임시 해결 — npm 캐시가 지워지면 재발함, 상세 [환경 설정](environment-setup.md) 5절),
  (2) 이 컴퓨터 AMD GPU로 하드웨어 가속 캡처 시 DirectComposition 에러가 나면서 콘솔 창이 뜸 —
  `PRODUCER_BROWSER_GPU_MODE=software` 환경변수로 우회. 두 가지 다 적용한 뒤 사용자가 직접
  확인("이제 안 뜸").
  **자막 방향 자체가 철회됨(2026-09-04)**: 위 자막 버그를 고친 직후, 다른 PC 세션에서 이미 같은
  근본 문제(Gemini TTS는 단어 타임스탬프가 없어 whisper 재정렬에 의존하는데, 한글 속 영어 단어를
  잘못 인식해 10줄 중 6줄이 근사치가 되는 구조적 한계)를 발견하고 **하단 단어별 자막 자체를
  아예 빼기로 결정**했다는 걸 git pull로 확인 — [결정 기록](decisions/2026-09-04-no-word-level-captions-with-gemini-tts.md)
  참고. 대신 그 세션에서 BGM·효과음·나레이션 볼륨 조절(ducking)이 새로 추가됨. 이 PC를 그 최신
  상태로 동기화하고 재렌더해서 사용자에게 전달 완료(2026-09-04, BGM/효과음 포함·자막 없는 버전).
  **검수 완료(2026-09-04)** — 사용자가 최신 렌더본 확인 완료. 상세 승인 게이트는
  [단편 EP12 상태 문서](episodes/ep12-want-wont.md) 참고.
  **업로드 예약: 2026-09-05(토) 20:00 KST**(2026-09-04 확정 — 채널 고정 발행 시각 20:00 관례
  따름, `production-rules.md`). **남은 일**: 설명·태그·고정 댓글 등 업로드 패키지가 아직 없음,
  썸네일은 A/B/C 3종을 유튜브 Test & Compare로 같이 올리기로 확정돼 있어(단편 EP12 상태 문서
  참고) 업로드 시 이 설정도 같이 해야 함. → 예약 완료되면 그다음 EP11(GONNA) 착수(남성 음성
  재생성, "시즌2" 표현 제거). Frame 6/7의 작은 입모양 미니 아이콘을 Frame 3처럼 실사 B롤로
  바꿀지는 아직 미결.
- **채널 아바타 인트로 클립 — 생성·합성·렌더 테스트 완료(2026-09-03), "완벽하다" 확인받음.**
  HeyGen 사진 아바타(Dmitri 음성)로 2박자 대사를 각각 생성 → 무음 구간만 다듬고(효과음 없이) →
  HyperFrames 테스트 프로젝트(`videos/channel-avatar-intro/`)에서 채널 표준 남색 배경 위에 진짜
  투명 배경으로 합성 → 렌더까지 확인 완료. 과정에서 두 가지 중요한 사실 발견: (1) v3 API엔
  `emotion` 파라미터가 아예 없음(계획했던 Soothing/Friendly는 폐지 예정 v2에만 있던 값이었음,
  속도만으로 충분히 자연스러웠음), (2) 사진 아바타는 "사람만 오려내기"가 안 되고 우리가 요청한
  캔버스 크기를 맞추려 붙인 여백만 투명하게 나옴(캡컷 등 일부 편집기는 이 알파 정보 자체를
  못 읽어서 검은 여백으로 보임 — HyperFrames/브라우저 계열은 정상). 상세:
  [채널 아바타 인트로 클립 결정](decisions/2026-09-03-avatar-intro-clip-setup.md).
  **EP12 삽입 시도 → 보류(2026-09-03)**: 그래픽 타이포 씬 ↔ 실사 인물 화면 사이의 **시각적
  이질감 자체가 문제**라는 결론(텍스트 연결 문장만으론 해결 안 됨). 아바타 클립을 EP12에서 뺌.
  **다음 행동**: 이 시각적 전환 문제를 더 연구한 뒤 재시도 — EP12는 이 클립 없이 계속 진행. 자산 자체
  (`assets/channel-avatar-intro/beat{1,2}-trimmed.webm`, 별도 검증 프로젝트
  `videos/channel-avatar-intro/`)는 그대로 보존됨.

## 다음 제작 (아직 안 착수)

- [단편 EP11 — GONNA](episodes/ep11-gonna.md) — **2026-09-04: 제작·패키징·예약까지 완료.**
  나레이션 Gemini(Charon) 전면 재생성(₩199), "시즌2" 표기 전부 제거, 재렌더(3:34) 검수 통과,
  썸네일 A/B/C 생성(시안 A 채택, AI 진단 B+), 업로드 패키지 작성 완료
  (`output/upload-packages/ep11-gonna-longform/`). **업로드 예약: 2026-09-08(화) 20:00 KST.**

## 예약 상태

| 콘텐츠 | 공개 시각 | 상태 |
|---|---|---|
| 단편 EP12(Want vs Won't) 롱폼 | 2026-09-05(토) 20:00 KST | **예약 등록 확인 완료(2026-09-05)** — YouTube Data API 직접 조회, `privacyStatus: private`, `publishAt` 일치 |
| 단편 EP11(GONNA) 롱폼 | 2026-09-08(화) 20:00 KST | **예약 등록 확인 완료(2026-09-05)** — 동일 방식으로 확인, `publishAt` 일치 |

> 확인 방법(2026-09-05): vidIQ 크레딧이 0(2026-09-07 리셋)이라 vidIQ MCP 대신 프로젝트 자체
> OAuth 토큰(`.youtube-oauth-token.json`)으로 YouTube Data API(`search.list`+`videos.list`)를
> 직접 호출해 두 영상의 `privacyStatus`/`publishAt`을 확인했다. 상세: [단편 EP12](episodes/ep12-want-wont.md),
> [단편 EP11](episodes/ep11-gonna.md).
- [단편 EP12 — Want vs Won't](episodes/ep12-want-wont.md) — 위 "최우선" 참고.
- [시즌1 EP10](episodes/season1-ep10.md) — 완료. 시즌1 자체가 이걸로 마무리됨.
- 시즌2 EP1 개별 패스 통합 — 아직 착수 전.
- EP8 롱폼 핵심 규칙 구간의 28초 Softboard 테스트를 검토해, 밝은 소프트 뉴모피즘 보드가 롱폼
  설명 장면에 맞는지 별도로 판정할 것.
- 팟캐스트 형식 콘텐츠 추가 아이디어 브레인스토밍함, 아직 미착수 —
  [결정 기록](decisions/2026-08-25-podcast-format-idea.md) 참고.
- **논의 예정(2026-09-04): 경쟁 채널 데이터 업데이트·삭제 기준.** 현재 `market-demand.json`·
  `content-opportunity.json`·`audience-dna.json` 모두 자동 갱신 주기가 없다(사람이 스크립트를
  수동 실행해야 갱신됨 — 확인 시점 기준 market-demand는 3일 전, content-opportunity는 일주일
  전 데이터). 삭제 기준도 없다 — `audience-dna.json`만 항목 300개 캡(`AUDIENCE_DNA_MAX_ENTRIES`)
  으로 넘치면 하위권을 자르는 크기 제한이 있을 뿐, "오래됐으니 재확인/삭제"하는 시간 기반 기준은
  전혀 없음. 사용자가 나중에 논의하기로 하고 보류(제안했던 안: market-demand 2주 경과 시 재실행
  권고, audience-dna 90일 경과 painPoint 자동 제외 — 아직 미확정).
- 쇼츠A·B는 서로 디자인을 통일하지 않기로 확정(트랙별 독립 디자인 방침). **Track B는 에피소드마다도
  새 컨셉으로 만들기로 확정** — 카톡 스타일을 고정 템플릿화하지 않음([콘텐츠 포맷](content-formats.md) 참고).

## 관련 문서

- [채널 데이터 현황](channel-data-snapshot.md) — 롱폼 vs 쇼츠 실측, 성장 레버 판단 근거
- [시즌1 EP9](episodes/season1-ep09.md)
- [시즌1 EP10](episodes/season1-ep10.md)
- [콘텐츠 포맷](content-formats.md)
- [제작 규칙](production-rules.md)
- [썸네일 전략](thumbnail-strategy.md)
