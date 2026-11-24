# FACT-CHECK — ep36-everyday-words-unheard

> 기준: 원문·사전·국립국어원 규정·유튜브 실측 API 값과 대조하여 5가지 판정(`확인됨` · `일부 확인` · `확인 안 됨` · `틀림` · `청취 필요`)만 기록한다. 이 표 통과 전 음성 생성을 금지한다.

| 위치 | 주장 | 판정 | 근거 | 조치 |
|---|---|---|---|---|
| chocolate 해부 | `chocolate`은 미국 원어민 발화에서 가운데 `o` 모음이 빠져 2음절 `/ˈtʃɑːk.lət/`(초클릿)로 소리 난다 | 확인됨 | Cambridge Dictionary US IPA `/ˈtʃɑːk.lət/` · 미국 영어 syncope(강세 뒤 약모음 탈락) 원문 자료(2026-11-24 확인) | 유지 |
| camera 해부 | `camera`는 가운데 `e`가 탈락해 2음절 `/ˈkæm.rə/`(캠러)로 소리 난다 | 확인됨 | Cambridge Dictionary US IPA `/ˈkæm.rə/` · syncope 자료 확인 | 유지 |
| comfortable 해부 | `comfortable`은 가운데 약모음이 축약·삭제돼 `/ˈkʌmf.tɚ.bəl/`(컴프터블)로 발음된다 | 확인됨 | Cambridge Dictionary US IPA `/ˈkʌmf.tɚ.bəl/` 확인 | 유지 |
| steak 해부 | `steak`(`/steɪk/`)은 영어에서 단 1음절(한 박자) 단어다 | 확인됨 | Cambridge Dictionary US IPA `/steɪk/` 확인. 한글 외래어 표기 '스테이크'(4음절)는 자음 뒤 '으' 삽입으로 음절이 늘어남 | 유지 |
| allergy 해부 | '알레르기'는 독일어 `Allergie [alɛrɡiː]`에서 유래한 외래어 표기이며, 미국 영어 `allergy`는 `/ˈæl.ɚ.dʒi/`(앨러지)다 | 확인됨 | 국립국어원 외래어 표기법(독일어 Allergie 유래) 및 Cambridge Dictionary US IPA `/ˈæl.ɚ.dʒi/` 확인 | 유지 |
| vitamin 해부 | '비타민'은 국내 관용 표기이며, 영국식(`/ˈvɪt.ə.mɪn/`)은 비타민에 가깝지만 미국식은 `/ˈvaɪ.t̬ə.mɪn/`(바이러민, 가운데 T 굴림)으로 읽는다 | 확인됨 | 국립국어원 외래어 표기법(관용 존중) 및 Cambridge Dictionary US `/ˈvaɪ.t̬ə.mɪn/` · UK `/ˈvɪt.ə.mɪn/` 확인 | 영국식 차이를 빼먹지 않고 대본에 정확히 명시함 |
| buffet 깜짝 퀴즈 | '뷔페'는 프랑스어 `buffet [byfɛ]` 유래 외래어 표기이며, 미국 영어 명사 `buffet`은 뒤 강세 `/bəˈfeɪ/`(버페이)다 | 확인됨 | 국립국어원 프랑스어 외래어 표기법(`뷔페`, '부페' 비표준) 및 Cambridge Dictionary US IPA `/bəˈfeɪ/` 확인 | 유지 |
| Before/After 3문장 | `Grab your camera — this chocolate is great, and this chair is so comfortable.`, `We ordered a steak at the hotel.`, `Check the buffet for your allergy, and take your vitamin.` | 확인됨 | 현대 미국 일상 회화 자연 용법 확인 | 유지 |
| BRIEF.md 수치 | 우리 채널 롱폼 7일 조회 중앙값 5.5회(최근 20편), `ROks87qezuU` 노출 2,034·클릭률 4.47%·평균 시청 40.2%, EP30 쇼츠 계속 시청함 47.39%(조회 1,281, 길이 72초) | 확인됨 | 2026-11-24 `POST /api/sync` 직후 `next-episode-input.md`(분석 기간 2026-08-25~2026-11-22, 스튜디오 2026-10-26~2026-11-22) 실측값 | 유지 |
| 음성 생성 후 점검 | 원어민 7단어·3문장(Olin) 로컬 Whisper 10/10 원문 일치 확인 + 한국어 22구간(Gero) 전수 발화 시각 추출 및 끝소리 늘어짐 0건 확인(`whisper-timings.json`) | 청취 필요 | 기계적 발화·길이·음량·싱크 검수는 완료. 최종 사람 귀 청취 확인은 미리보기 스튜디오에서 진행 | Gate 2 렌더 전 최종 청취 대기 |
