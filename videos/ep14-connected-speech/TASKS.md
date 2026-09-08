# TASKS — ep14-connected-speech 제작 기록

`knowledge/VIDEO_WORKFLOW.md` 9단계 "수정 사항 기록" 관행(EP13에서 정식화)을 따른다. 프레임을
하나씩 만들고, 검수/지시 사항이 나오면 그 자리에서 반영한 뒤 여기 기록한다. 다음 영상에도 적용될
일반 교훈은 완료 후 `CLAUDE.md`/`AGENTS.md`·`knowledge/` 문서로 끌어올린다.

## 2026-09-08 — 프로젝트 스캐폴딩 + Frame 1-4 제작

전체 12씬 나레이션 TTS 생성(전날 이월분 포함, `.tts-usage.json` 기준 무료 한도 밖 과금 소액
발생) 및 `scripts/word-timeline.mjs`로 전체 스크립트 단어별 whisper 실측 타임스탬프 추출을
마친 뒤, 실제 HyperFrames 컴포지션 제작에 착수했다.

- **프로젝트 스캐폴딩**: `package.json`/`hyperframes.json`이 아예 없었음 — `npx hyperframes init`
  이 비어있지 않은 디렉토리를 거부해서, 임시 빈 디렉토리에 스캐폴딩한 뒤 두 파일만 복사해 옴
  (기존 BRIEF.md/SCRIPT.md 등은 그대로 보존).
- **Frame 1(Stakes) 제작 및 재구성**: 처음엔 "Where were we?" 문장을 처음부터 띄워놓고 서서히
  흐려지는 구성으로 만들었으나, 사용자 지시("영화나 유튜브 대사 나오기 전엔 Where were we?
  이거 출력하지 말고 큰 자막 출력")로 재구성 — "영화나 유튜브에서 들으면" 대사가 나오기 전까지는
  실제 나레이션 문장을 큰 자막으로 그대로 띄우고, 그 대사에서 스트리밍-그리드 배경이 뜨며
  "Where were we?"가 등장해 흐려지는 순서로 변경.
- **넷플릭스 이미지 저작권 문제 발견·해결**: 사용자가 처음 제공한 참고 이미지
  (`compositions/images/image.png`)가 실제 넷플릭스 화면 스크린샷(진짜 포스터·배우 얼굴 포함)
  이라 저작권/Content ID 위험이 있음을 확인 → 사용자 승인 하에 그대로 쓰지 않고 비슷한 느낌의
  가짜 스트리밍 그리드를 CSS로 직접 그려 대체. 이후 사용자가 직접 만든 두 번째 이미지
  (`Generated Image...jpg`, 가상 제목·AI 생성 포스터, 실제 서비스/인물 아님)를
  `assets/images/streaming-grid-mock.jpg`로 옮겨 최종 반영. 실제 스크린샷 원본은
  `.gitignore`에 `videos/*/compositions/images/` 규칙을 추가해 커밋 대상에서 제외.
- **Frame 2(채널 인트로) 대사 수정 + 재생성**: "그 진짜 원리를 함께 봅니다" → "그 진짜 원리를
  함께 보시죠"로 교체(더 자연스러운 문장). Frame 2가 아직 화면 제작 전이었어서, 음성부터
  재생성(₩10 과금)하고 whisper 타임스탬프도 다시 뽑은 뒤 화면을 만들었다 — 화면을 먼저 만들고
  나중에 대사를 고쳤다면 다시 손대야 했을 작업 순서를 피함.
- **채널 워드마크 배색 규칙 신설**: "이해하면 "은 흰색, "쉬운영어"만 브랜드 노란색(`#F5C518`)으로
  칠하도록 Frame 1(상시 코너 태그)·Frame 2(대형 리빌) 둘 다 적용. 일회성 판단이 아니라 앞으로
  워드마크가 나오는 모든 자리(Frame 12 클로징 로고 포함)에 적용될 채널 규칙이라 판단해
  `CLAUDE.md`/`AGENTS.md`의 "HyperFrames 영상 제작 시 기본 적용 요소"로 승격.
- **Frame 3(Big Question) 제작**: `frame.md` Treatment #3 그대로 — 영어 단어 카드 8개(AN·
  APPLE·WHERE·MADE·TURN·CHECK·GET·PUT, 뒤 프레임에서 실제로 다룰 표현들에서 한 단어씩 뽑음 —
  Frame 1의 "단어는 다 아는 건데" 콜백)가 부드러운 페이드 없이 딱딱 끊기듯(스냅 모션) 하나씩
  등장, 마지막 질문("혹시 대충 하는 걸까요?")에서 화면이 어두워지며 질문 문장이 크게 떠오름.
  카드가 딤 오버레이 밑에 깔리는 건 의도된 레이아웃이라 `data-layout-allow-occlusion`으로
  린트 정보성 경고를 정리.
- **Frame 4(Head Fake/반전 공개) 제작**: "대충 하는 게 아닙니다"가 노란 히어로 텍스트로 먼저
  착지했다가, "원어민들은..." 대사 시작과 동시에 배경이 앰버 톤으로 전환되며 이 영상의 결론
  "힘을 빼면, 소리가 이어집니다"(Frame 12 요약에서 다시 쓸 문구)로 교체·정착. 뒤이은 개인
  경험담 구간은 Frame 1 Beat 3과 같은 원칙으로 새 자막 없이 그대로 흘려보냄.
- 4개 프레임 전부 `assets/voice/{01,02,03,04}.words.json` 실측 타임스탬프로 처음부터 제작
  (추정치·RATIO 스케일링 없음 — `knowledge/hyperframes-prompting.md` §7-1 준수),
  `npx hyperframes check` 매 프레임 통과, 스냅샷으로 전 비트 시각 확인 완료.
- 루트 `index.html` 누적 타이밍: Frame1 0-30.74s / Frame2 30.74-41.72s / Frame3 41.72-62.62s /
  Frame4 62.62-98.4s.

**다음에 할 일**: Frame 5(원리 설명, `linking-diagram--slide` 신규 컴포넌트 첫 사용) 제작부터
이어서 — Frame 5·6·7·8·10이 공유하는 `linking-diagram`/`letter-tag` 컴포넌트를 여기서 먼저
확립해야 나머지 프레임이 빨라진다. 렌더는 사용자 지시 전까지 하지 않음.
