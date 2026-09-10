# TASKS — ep15-sion-words

`VIDEO_WORKFLOW.md` 9단계 관행에 따라, 사람 검수에서 나온 지적 사항을 그 자리에서 고치고 끝내지
않고 여기 단계별로 남긴다. 다음 영상에도 적용될 일반 교훈은 완료 후 `VIDEO_WORKFLOW.md`/
`production-rules.md`/`CLAUDE.md`로 끌어올린다(이미 승격된 건 각 항목에 표시).

## 2026-09-10 — TTS 생성 직후 검수: Frame 8·11 정답 누설 버그

**지적**: "8 여자 목소리 그리고 나레이션이 답을 알려주고 있음 / 11프레임도 나레이션이 답을
알려주고 있음"

**원인 분석**:
1. Frame 8 목소리 — Charon 고정 목소리라도 짧은 입력에서 가끔 톤이 흔들리는 기존 알려진 현상
   (`CLAUDE.md` 쇼츠 TTS 절 참고). 재생성으로 해결 예정.
2. Frame 8·11 정답 누설 — 질문/도입 단계에서 목표 영어 단어(CONFUSION·DIMENSION·EXPRESSION·
   SUPERVISION·DIVISION·PENSION)를 소리 내어 말하면, TTS가 실제 영어 발음으로 읽는 순간 전/션
   여부가 이미 들려서 정답이 미리 새고 있었다. 이 퀴즈/페이오프는 "단어가 어떻게 발음되는가"
   자체가 정답이라, EP14류 "연결 퀴즈"(TURN ON을 말해도 안전 — 정답은 연결 방식이지 단어
   발음이 아님)와 근본적으로 다른 구조인데 그 차이를 놓치고 EP14 퀴즈 문구 패턴을 그대로 본떠
   썼다.

**조치**:
1. `SCRIPT.md` Frame 8·11 나레이션을 "첫 번째/두 번째/세 번째 단어", "이 단어"처럼 화면에 보이는
   단어를 대명사로만 지칭하도록 수정, 영어 발음은 정답 공개 순간에만 한글 정답과 한 문장으로
   묶어 공개하도록 재작성. 완료.
2. `scripts/gen-tts-gemini.mjs`·`scripts/word-timeline.mjs`의 소스 텍스트도 동일하게 갱신. 완료.
3. ✅ **일반 교훈을 `VIDEO_WORKFLOW.md` 3단계 완료 조건에 승격**: "이 단어를 소리 내어 말하면
   그 자체로 정답이 드러나는가?"를 매 퀴즈 대본 작성 시 자문하는 판별법으로 명문화. 완료.
4. ✅ **해결**: 1차 재생성 시도가 Google AI Studio 프로젝트의 월간 지출 한도 초과(HTTP 429
   RESOURCE_EXHAUSTED)로 실패했으나, 사용자가 https://ai.studio/spend 에서 한도를 상향한 뒤
   재시도해 성공(2026-09-10, ₩69). `assets/voice/08.wav`·`11.wav`·`08.words.json`·
   `11.words.json` 전부 새 대본 기준으로 갱신 완료, `SCRIPT.md` 누적 타이밍표도 갱신 완료
   (Frame 8: 34.96s→33.04s, Frame 11: 39.48s→41.12s, 전체 총 길이 409.45초로 재계산).

## 2026-09-10 — 후속 지적: 영어 단어를 화면에서 이미 보여주는데 나레이션에서 또 말할 필요 있나

**지적**: "지금 시청자는 화면을 보고 있고 화면에는 SUPERVISION이라는 단어가 나와있는 상황이면
'수퍼비전'입니다 나레이션만 나와도 상관 없는거 아님?"

**판단**: 맞는 지적. Frame 8·11 정답 공개 문장이 "CONFUSION은 '컨퓨전'입니다"처럼 영어 단어를
다시 말하는데, 화면에 이미 철자가 보이므로 중복 — 특히 방금 "질문 단계에서 영어 단어를 말하면
안 된다"고 고친 직후라, 정답 공개 문장에서도 같은 논리(화면이 이미 보여주는 정보를 굳이 음성으로
반복 안 함)를 적용하는 게 일관적이었다.

**조치(1차, 이후 철회)**: 사용자 제안으로 재생성 대신 **`scripts/trim-word.mjs` 신설** —
whisper가 이미 알고 있는 "CONFUSION은"/"DIMENSION은"/"EXPRESSION은"/"SUPERVISION은"/
"DIVISION은"/"PENSION은" 6개 단어의 정확한 시작/끝 시각을 이용해 기존 WAV에서 그 구간만
삭제(단어 앞뒤 원래 있던 쉼은 남기고 8ms 크로스페이드로 이어붙임), `words.json`의 남은
타임스탬프도 자동으로 당겨서 갱신. **개발 중 버그 1건 발견·수정**: `pcmToWav()`가 기대하는
필드명(`channels`)과 `readWav()`가 만든 필드명(`numChannels`)이 달라서 채널 수가 0으로 잘못
기록되는 무성 WAV가 나왔다 — 필드명을 통일해 수정하고 백업본에서 재실행해 해결.

**조치(2차, 최종)**: 사용자가 트림된 오디오를 직접 들어보고 "어색하다"고 판단 — 잘라낸 자리의
억양·호흡이 부자연스럽게 들린 것으로 추정(크로스페이드로 클릭음은 막았지만, 문장 전체의 억양
곡선 자체가 원래 "CONFUSION은 '컨퓨전'입니다"를 한 호흡에 말하도록 생성된 것이라, 앞부분만
잘라내면 뒷부분의 억양이 미묘하게 안 맞을 수 있음). **`scripts/gen-tts-gemini.mjs`의 이미
수정해둔 텍스트(영어 단어 없이 한글 발음만)로 TTS 재생성**(₩61 추가)해 최종 해결 —
`scripts/trim-word.mjs`는 재사용 가능한 도구로 남겨두되, 이번 건은 재생성이 승리.

✅ **일반 교훈**: `VIDEO_WORKFLOW.md`의 퀴즈 판별법 자체를 수정함 — 1차로 적어둔 규칙이
"정답 공개 순간엔 영어 발음+한글 정답을 같은 문장에 묶어 공개"라고 예시를 들었는데, 그 예시
문구("CONFUSION은 '컨퓨전'입니다") 자체가 이번에 지적받은 중복 문제였다. "화면에 이미 그 단어
철자가 보이면 정답 공개 순간에도 영어 단어를 다시 발화하지 않고 한글 발음만 공개한다"로
규칙을 보강 — 처음 세운 규칙이 스스로 반박하는 예시를 담고 있었다는 걸 뒤늦게 발견한 사례라,
규칙을 세울 때 예시 문구까지 실제로 화면-나레이션 중복이 없는지 다시 점검할 것.

**추가로 얻은 실무 교훈**: 문장 일부만 잘라내는
오디오 편집은 클릭음은 막을 수 있어도 억양 곡선까지는 못 고치므로, 원래 그 부분이 있는 채로
생성된 문장에서 그 부분만 도려내면 남은 부분의 억양이 어색하게 들릴 수 있다 — **문구 자체를
바꿨다면 새로 생성하는 쪽이 더 안전하다**(특히 이번처럼 재생성 비용이 몇십 원 수준으로 작을
때는 트림보다 재생성을 먼저 시도해도 됨).

**결과**: Frame 8 29.56s, Frame 11 36.36s, 전체 실측 총 길이 401.21초로 재계산. `SCRIPT.md`·
`STORYBOARD.md`·`scripts/gen-tts-gemini.mjs`·`scripts/word-timeline.mjs` 전부 최종 텍스트·
타이밍으로 갱신 완료.

## 2026-09-10 — 12프레임 HTML 컴포지션 전체 제작 완료

`STORYBOARD.md`·`assets/voice/*.words.json` 기준으로 12프레임 전부 작성 완료
(`compositions/frames/01-stakes.html` ~ `12-summary.html`). 이번 편 신규 컴포넌트
(`frame.md` 정의)를 실제 코드로 구현: `sion-card`(단어+발음 카드)·`sound-tag`(모음/R/자음
라벨)·`sion-cluster`(카드 묶음)·`syllable-buildup`(음절 조립)·`reveal-blur`(흐림→선명
해소)·`quiz-reveal`(퀴즈 정답 공개).

**제작 중 발견·수정한 버그**:
1. Black Han Sans 폰트 URL을 기억으로 잘못 씀(v20 해시) → `npx hyperframes check`의
   `http_error: 404` 로 즉시 발견, EP14 프레임에서 검증된 정확한 URL(v24)로 교체.
2. Frame 3(질문 던지기) 첫 시도는 CSS Grid(`max-content` 컬럼)로 SION 정렬을 구현했는데
   이 프로젝트의 container-query 설정 하에서 텍스트가 이상하게 줄바꿈되는 버그 발생 —
   스냅샷으로 실제 확인 후 고정폭 flex 컬럼 방식으로 교체해 해결(더 예측 가능하고 디버깅
   쉬움).
3. `scripts/trim-word.mjs`와 무관한 새 버그: Frame 10에 프로그레스 바 DOM을 빼먹고
   JS에서만 참조 — `hyperframes check`가 GSAP 런타임 경고(`target null not found`)로
   잡아냄, `getElementById` 참조를 HTML id와 대조하는 스크립트로 확인 후 누락된 두 div 추가.

**검증 방법**: `npx hyperframes check`(0 errors) + 매 2~4프레임마다
`npx hyperframes snapshot`으로 실제 픽셀 확인(콘택트시트) — 특히 Frame 3의 SSION 정렬,
Frame 5의 모음/자음 하이라이트, Frame 7의 SSION 그룹 동시 발광, Frame 8의 퀴즈 정답 공개,
Frame 10의 음절 조립, Frame 11의 흐림→선명 해소, Frame 12의 단어 클라우드+엔드스크린
키프아웃을 전부 스틸로 눈으로 확인. 채널 기본 규칙 중 이번 편에서 **의도적으로 단순화한
것**: `lt-neon-border`의 풀 traveling-arc SVG 엔진 대신 Frame 6·7에 정적 글로우
box-shadow로 "네온 테두리 강조" 구현(12프레임 규모상 절충 — `06-pattern.html` 파일 헤더
코멘트에 근거 기록).

**아직 안 한 것**: `hyperframes-audio`의 `carve.mjs` 나레이션 더킹(현재 BGM은 고정
볼륨 0.06만 적용, voiceover 그룹 자동 더킹 미적용), `inline-highlight` 채널 기본 규칙
(3곳 정도), 최종 렌더. 다음 세션에서 이어서 진행.

## 다음 단계

1. 사용자 프리뷰 검수(소리 켜고 처음부터 끝까지 재생, 무음으로 자막 확인, 모바일 가독성).
2. `hyperframes-audio` carve.mjs로 BGM 더킹 적용(voiceover 그룹 기준).
3. `inline-highlight` 채널 기본 규칙 적용(~3곳).
4. 최종 렌더(`videos/ep15-sion-words/renders/` 먼저, 그다음 `output/upload-packages/`로 복사
   — production-rules.md 렌더 저장 위치 관례).
