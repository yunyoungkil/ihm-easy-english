# TASKS — ep24-shorts-seat-sit

## 2026-11-11 기획 → 화면 (렌더 승인 대기)

1. **기획**: EP24 롱폼 `SHORTS.md` S2(반전형). 사용자 승인한 두 번째 쇼츠 6편 중 첫 편(12/1 화 20:00). 제목은 Claude가 데이터로 결정(사용자 위임) — 근거는 `BRIEF.md` "제목 결정".
2. **사실 확인**: 이 쇼츠가 틀어 줄 `m_w05_seat`·`m_w06_sit` 소리 부분을 실측(0.30초, 0.29초). 무성 자음 앞 모음 짧아짐(pre-fortis clipping)은 Wikipedia "Clipping (phonetics)"(Wells 2008 인용)로 확인. 일반론("원어민은 늘 같다")은 쓰지 않음. `FACT-CHECK.md`.
3. **대본 확정**: 사용자 승인(멈춤 지점 3). 4번째 줄을 말투로 다듬음("그러면 무엇으로 갈릴까요?" → "그럼 무엇이 다를까요?").
4. **음성**: Gemini TTS 남성 Gero로 Claude 자동 생성(2026-11-11부터 자동·무료, 사용자 결정). 응답 mimeType에 rate가 빠져 sample rate 0인 wav가 저장됨 → 24kHz로 다시 포장, `tts-config.mjs`의 `sampleRateFromMime`에 기본값 추가. whisper 받아쓰기가 대본과 일치. 문장별 자르기 `scripts/cut-voice.mjs`(무음 구간 + 단어 시각).
5. **그림**: 웹 Gemini 자동화로 3장(칠판, 얼굴 두 칸, 쇼츠 썸네일). 첫 쇼츠 그림(입술 두 칸, 좌석·의자)과 겹치지 않게 새로 그림. 네 모서리 검수: **썸네일 오른쪽 아래에 Gemini 별 표시** → 비워 두는 아래 25% 빈 종이라 왼쪽 아래 빈 종이 조각을 좌우 반전해 덮음(구도 변화 없음), 1080×1920로 키움. 칠판·얼굴 그림은 깨끗함. 썸네일 철자 `SEEEEAT`(E 4개) 확대 확인.
6. **화면**: `scripts/build-index.mjs`. 고유 코너 "소리 길이 막대"(실측 길이로 자람). 32.7초.
7. **자동 검사 수정**: ① 21.7~24.9초 3.1초 정지 → "턱을 살짝 내리면"에 아래 카드 미세 펄스 ② `SEEEEEEEAT` 끝 글자 대비 2.1:1 → 진한 초록 띠 ③ `0.30초`가 카드 테두리에 닿음 → 막대 최대 680→600px ④ 막대가 칸 테두리를 덮음 → 칸 너비 +10px. 최종 `hyperframes check` 오류 0·경고 0, 금지어 없음.
8. **unslop 점검(사용자 승인한 1회)**: 영상에 맞는 항목만 적용. 그라데이션·글로우·이모지·느낌표·의미 없는 반복·템플릿 여부는 통과. "튀는 등장이 여기저기" 지적은 맞아서 뱃지·썸네일·알약·손 등장 5곳을 `power3.out`으로 바꿈(단어 펄스는 규칙상 유지). → `knowledge/production-rules.md` 쇼츠 화면 절에 규칙으로 올림.
9. **안전선 실수**: 알약 top 212, 자막 아래 끝 1608로 짰다가 규칙(232 이상, 1600 이하)을 다시 읽고 고침. 숫자로 확인하는 규칙도 추가.

## 2026-11-12 배경음 교체 (`AI Studio Lyria 3.5`) · `Omni 1.2 Flash` 영상 시험 (여전히 렌더 승인 대기)

1. **AI Studio `Lyria 3.5`로 최종 배경음 교체 (`https://aistudio.google.com/new_music?model=lyria-3.5`)**:
   - 먼저 시험했던 Flow Music(`flowmusic.app`)의 `Clear Speech Study Beat.mp3`(`48kHz`, `167.40초`)는 크레딧이 깎이고 `0~33초` 평균 음량이 `-21.0 dB`로 기존(`-13.6 dB`)보다 `7.4 dB` 낮아, 사용자 제보에 따라 **API 키 없이 무료인 AI Studio 최신 `Lyria 3.5`**로 다시 생성해 교체함(Flow Music MP3는 폴더에서 정리 삭제, 기존 곡은 `assets/bgm/track_original.mp3`로 백업 유지).
   - 1차 `Text` 모드에서는 `"No vocals, no humming"` 부정어를 적었는데도 `1:07`부터 허밍이 들어갔고, **`Composer` 모드(`Intro 0:00–0:06`, `Verse 0:06–0:31`, `Outro 0:31–0:38`) + 긍정문 전용 프롬프트(`"Instrumental only, 95 BPM..."`)**로 다시 뽑은 **`62.25초`(`44.1kHz` 스테레오, `192 kb/s` MP3)**는 전 구간 직접 청취 결과 **허밍·보컬 0회, 오디오 워터마크 없음**을 확인함.
   - 내장 C2PA ID3 메타데이터(`~5.5 KB`)를 떼어 내 `assets/bgm/track.mp3`(`1,494,664 bytes`)로 반영함. `0~33초` 평균 음량이 `-14.1 dB`(`peak -0.0 dB`)로 기존 `track_original.mp3`(`-13.6 dB`)와 거의 같아 기존 **`data-volume="0.06"`을 그대로 유지**해도 균형이 맞음.
2. **배경음 더킹(`carve.mjs`) 재실행 및 최종 검사 통과**: BGM 소스가 바뀌어 `carve.mjs --comp index.html`을 다시 돌려 14개 음성 트랙 기준 7레인 더킹과 `fx.n7.gain` 곡선(230포인트, 최대 감쇠 `-19.2 dB`)을 새 `track.mp3`에 맞게 갱신함(`index.html` `<audio id="bgm">` 1줄만 변경). 참고로 `scripts/build-index.mjs`를 다시 돌리면 더킹이 초기화되므로 재빌드 시 `carve.mjs`도 함께 실행해야 함.
   - 검증: `npx hyperframes check` **0 errors, 0 warnings** (참고 Layout 알림 6건, 대비 36/36 WCAG AA, 오디오 0 오류), `npm run check-terms -- videos/ep24-shorts-seat-sit` **금지어 없음**.
3. **AI Studio `Omni 1.2 Flash` 첫 장면 영상 시험 (반입 보류)**: `aistudio.google.com` (`gemini-omni-1.2-flash`, `PRO` 계정)에서 `assets/images/classroom_board.jpg`를 기준 이미지로 5초·720p·9:16·24fps 영상(`720×1280`, `5.03초`, `2,849,865 bytes`, `30,647 tokens`, 약 31초)을 생성해 검수함.
   - **워터마크**: 네 모서리 240×240 확대 확인 결과 **눈에 보이는 워터마크 없음**(비가시 SynthID는 별도).
   - **보류 사유**: ① 비율 선택이 `Auto` / `16:9` / `9:16`뿐이라(`1:1` 없음) 1:1 `#boardCard`(960×960)에 넣으면 가로 크롭 손실이 큼 ② 5초 후반 줌인이 강해 4.8초에 지시봉 든 손이 오른쪽 아래 프레임 밖으로 잘리고 그림자에 초록 번짐이 생김 ③ `"Silent..."` 프롬프트에도 `48kHz` 스테레오 효과음(`peak -9.6 dB`)이 생성됨.
   - **결정**: 사용자 사전 지침("결과 보고 반입 여부 결정")에 따라 `index.html`에는 넣지 않고 정지 일러스트(`classroom_board.jpg`) + `SEEEEEEAT` 코드 연출을 유지함.

## 남은 일

- [ ] 렌더 (사용자 승인 후)
- [ ] 업로드 패키지 `output/upload-packages/ep24-shorts-seat-sit/` (영상, 제목·설명·태그·고정 댓글, 자막, `thumbnail.jpg`, `status.json` 없음)
- [ ] 사용자: 스튜디오 예약 12/1(화) 20:00, 언어 두 칸 한국어, 관련 동영상에 EP24 롱폼
