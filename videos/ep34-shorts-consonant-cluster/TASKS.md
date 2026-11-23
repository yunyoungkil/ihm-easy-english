# TASKS — ep34-shorts-consonant-cluster

- [x] 비교 시트 v4 작성 & `slop-rewrite`(67규칙 + `writing-taste` v0.2 + `check_fidelity`) 0건 통과
- [x] Gate 1 승인 (`2026-11-22`, 제목 1안 · 썸네일 A안)
- [x] `FACT-CHECK.md` 8단어 IPA/음절 검증 + 원어민 4단어(`Olin`)·한국어 11컷(`Gero`) 직접 청취 대조 완료
- [x] Lyria 3.5 BGM(`track.mp3`, 62.1s, 허밍/보컬 0 직접 청취 확인) + 커스텀 SFX 3종 생성
- [x] 클린 오디오 정규화 및 실측 타임라인(`assets/audio-timings.json`, `assets/AUDIO-AUDIT.md`, 총 40.202초)
- [x] Omni 1.2 Flash 1080p 실사 클립 1/4 완료 (`c02-stressball.mp4`, 4프레임 검수 완료)
- [x] Omni 1.2 Flash 1080p 잔여 3클립 (`c00-press` 11/23 14:47 다른 세션 생성, `c06-spray`·`c09-strike` 11/23 17:11~12 생성) — 4클립 네 모서리 워터마크 없음 확인, 장면 00·06·09 배경 사진을 클립으로 교체(c02와 같은 루트 직속 방식), 장면 10 배경은 c09 끝 장면(`bg-strike-end.jpg`)으로 이어 붙임. 프레스 누름(약 1.4초)이 효과음 1.449초와, 분무 시작(20.05초)이 원어민 spray(20.29초)와 맞음. CLI 0.9.77 → 0.9.84, `check` 통과(오류 0, 경고 39 = 11/22와 같은 종류·개수), `check-terms` 금지어 없음, 7장 스냅샷 직접 확인
- [x] HyperFrames `index.html` 조립 + Playwright 12컷 콘택트시트(`assets/preview-contact-sheet.jpg`) 검수 + `hyperframes check`
- [x] Gate 2 렌더 (`2026-11-23` 사용자 결정 "3클립 더한 뒤 렌더"): `renders/ep34-shorts-consonant-cluster_2026-11-23_17-16-31.mp4` 13.8MB · 40.23s · 1080×1920 30fps · 오디오 평균 -18.8dB/최대 -1.1dB, 렌더 프레임에서 클립 4개 움직임 확인
- [x] Gate 3 승인 및 12/12(토) 20:00 KST 예약 업로드 완료 (`2026-11-23`, ID `GudIUEIl2TI`, `https://youtu.be/GudIUEIl2TI`, `privacyStatus: private`, `scheduledPublishAt: 2026-12-12T11:00:00Z`, `containsSyntheticMedia: true`, `selfDeclaredMadeForKids: false`, `categoryId: 27`, `defaultLanguage/defaultAudioLanguage: ko`, 재생목록 `PLCbnHG8SDRes` 30번째 항목, 한국어 수동 자막 `subtitles-ko.srt` 게시 확인)
