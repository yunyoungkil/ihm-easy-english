# 지금 할 일

마지막 확인: 2026-09-10

## 진행 중 — 단편 EP14(연음/linking sounds)

`videos/ep14-connected-speech/` — 데이터 근거(시장 수요 "영어 듣기 안 들리는 이유" + 시청자DNA
"지들 멋대로 발음"/"자주 쓰는 근육") 기반으로 아이디어 보드에서 선정, BRIEF.md 작성, A/B
시뮬레이터로 썸네일 3종 생성 후 Gemini 진단으로 시안 A 확정(제목 "원어민들이 절대로 교과서처럼
똑 부러지게 말하지 않는 진짜 이유", 카피 "이제 단어가 아니라 문장이 들립니다"). 목차 승인 →
전체 12씬 대본(`SCRIPT.md`, 이번 편부터 채택한 "전체 작성 + 파일 코멘트 검수" 방식) 작성·검수
완료 — 검수 중 언어학적 사실 오류 2건(MADE IT은 IT의 T가 아니라 MADE의 D가 탄설음화됨, WHERE
WE는 AN APPLE과 다른 메커니즘인 약화 현상) 발견·정정, 시청자 시나리오 현실성(원어민과 대화가
아니라 영화·유튜브 시청) 원칙 신규 확립 → `brand-persona.md`/`VIDEO_WORKFLOW.md`에 일반 규칙으로
반영. **2026-09-07 완료**: `frame.md`(신규 컴포넌트 `linking-diagram`/`letter-tag`, 3가지 모션
변형 slide/shrink/bounce)·`STORYBOARD.md`(12프레임) 작성 완료. **2026-09-08 완료**: 나레이션
12씬 전부 생성, 전체 스크립트 단어별 whisper 실측 타임스탬프 추출(`scripts/word-timeline.mjs`
신규 작성, `assets/voice/*.words.json`), 프로젝트 스캐폴딩(package.json/hyperframes.json),
**Frame 1~4 제작 완료**(실측 타임스탬프 기반, 추정·RATIO 스케일링 없이 처음부터 정확하게 —
`knowledge/hyperframes-prompting.md` §7-1). Frame 2는 대사 수정("함께 봅니다"→"함께 보시죠")으로
음성 재생성 후 제작. 채널 워드마크 배색 규칙("이해하면 "은 흰색, "쉬운영어"만 브랜드 노랑) 신설해
`CLAUDE.md`/`AGENTS.md`에 반영. **이어서 Frame 1·3·4 빈 구간 보강**(사용자가 프리뷰로 직접 확인
후 "씬이 너무 적다" 지적 — Frame 4는 28.6초, Frame 3은 5.4초 완전 정지 구간이 있었음, 단어별
실측 타임스탬프에 맞춰 강조 펄스·보조 캡션·카드 플리커 추가로 해결). **Frame 5~12 전부 제작
완료 — EP14 12개 프레임 첫 풀드래프트 완성**(2026-09-08). `linking-diagram`/`letter-tag` 신규
컴포넌트를 Frame 5(slide, AN APPLE)에서 처음 구현하며 사용자 피드백으로 2차 수정(도착 카드는
처음부터 도착할 글자 수까지 폭 확보, 발음 라벨은 카드별 정렬), Frame 6(shrink, WHERE WERE WE),
Frame 7(bounce, MADE IT — GSAP 연속 트윈 겹침·색상 대비 버그 발견·수정), Frame 8(퀴즈 4문항 —
Frame 5·7 축소판 재사용), Frame 9(리스닝, 9조각 concat 오디오), Frame 10(따라 말하기, 가장 긴
프레임 64.94초), Frame 11(페이오프 — Frame 1과 블러→선명 대칭), Frame 12(요약 — 엔드스크린
키프아웃 구간에서 상단 진행바가 화면 전체 폭이라 키프아웃 영역을 침범하는 버그 발견·수정,
`production-rules.md`에 일반 교훈 기록)까지 전부 완성. `npm run check` 전체 통과. 총 실측 길이
428.07초(≈7:08). 상세 기록: `videos/ep14-connected-speech/TASKS.md`.
**이어서 Frame 5 B롤·레이아웃·라벨 수정(2026-09-08, 같은 날 계속)**: 사용자가 "an apple" 자연
발화 B롤 생성 → 워터마크 발견·제거(픽셀 바운딩박스 측정 + drawbox/gblur, 절차
`production-rules.md`에 기록) → Frame 5 Beat 3(N이 APPLE로 이동)에 B롤 인셋 카드로 통합 →
사용자 지적으로 레이아웃 무게중심 재조정(다이어그램+라벨 그룹이 B롤 등장 시점에 함께 위로
이동) → 발음 라벨 스크럽(되감기) 버그 발견·수정(`.call()` 텍스트 변경 대신 트윈 기반
크로스페이드로, 일반 규칙으로 `production-rules.md`에 기록) → 사용자 요청으로 좌측 라벨
"어"→"앤" 텍스트 변경.
**✅ 2026-09-09 해결**: 다음 세션에서 사용자가 확인 — 예상한 가설대로 나레이션 음성("어 내플")과
화면 표기(전날 "앤"으로 잘못 바꿈)가 어긋나 있었음. 좌측 라벨도 우측과 같은 크로스페이드
패턴으로 되돌려 병합 상태에서 "어/내플"이 나레이션과 정확히 일치하도록 수정 완료.
**2026-09-10: 전체 프리뷰 검수 완료 확인**(Frame 8·11·12도 이미 실측 타이밍 기반, 빈 화면
버그 없음 확인 — Frame 8 배지/질문 텍스트 스왑만 스크럽 취약성 발견해 같이 수정) →
**BGM/SFX/inline-highlight/네온보더 채널 공통 규칙 4개 전부 적용 완료**: BGM은 EP13에서
사용자가 고른 로컬 곡(Snack Time) 재사용해 12프레임 슬라이스+더킹, SFX는 채널 시그니처
reveal-chime을 "완성/정답 공개" 12곳에, inline-highlight는 테제/카타르시스/마무리 약속
3곳에, 네온 테두리는 Frame 12(7카드 요약)에 EP13 Frame 9의 traveling-glow-arc 엔진을 이식.
`npm run check` 전체 통과. 상세: `videos/ep14-connected-speech/TASKS.md` 맨 끝.
**✅ 2026-09-10 최종 렌더 완료**: `output/upload-packages/ep14-connected-speech-longform/video.mp4`
(1920x1080, 30fps, 428.1초, 23.7MB) — **EP14 영상 제작 완료.**
**다음 행동**: 업로드 패키지 작성(제목·설명·태그·고정 댓글, 엔드스크린 연결 영상은 EP13으로
설정할 것 — BRIEF.md에 메모됨) → 업로드. 상세: `videos/ep14-connected-speech/BRIEF.md`.

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
- (작은 미해결) A/B 시뮬레이터: "텍스트 적용" 클릭 시 뱃지(badge)가 안 넘어감 — 5종 추천의
  "텍스트 적용"은 시안에 `title`/`thumbnailCopy`만 덮어쓰고 `badge`는 안 건드린다. 원하면
  `.btn-ab-apply-title` 핸들러에 `targetVar.badge = suggestion.badge || targetVar.badge;`
  한 줄만 추가하면 됨(단, `aiTitleSuggestions` 스키마에 `badge` 필드가 있는지부터 확인할 것).
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
