# TASKS — ep19-ate-suffix 제작 기록

`knowledge/VIDEO_WORKFLOW.md` 9단계 "수정 사항 기록" 관행을 따른다.
기획, 제목/썸네일 확정, 대본 작성 및 감사, 스토리보드 및 디자인 시스템 구축부터
TTS 실측, 프레임 구현, 자막 100% 검증, 최종 렌더까지의 전체 제작 이력을 단계별로 투명하게 남긴다.

---

## 2026-09-19 — 기획, 제목/썸네일 4종 A/B 시안 확정 및 저장

### 1. 기획 및 데이터 분석 (`VIDEO_WORKFLOW.md` 1~2단계)
- **소재 선정**: 단어 끝 -ATE의 두 얼굴 (동사와 명사/형용사를 가르는 발음 및 강세 차이).
  * `data/youtube/idea-board-history.json` 랭크 3(점수 85점) 기반 선정.
  * 타겟: 단어 끝 스펠링은 똑같은데 원어민 음성이 다르게 들려 헷갈렸던 4060 기초 영어 회화 도전층.
  * 핵심 통찰: 동일한 -ATE 철자라도 동사형은 강세가 그대로 살아 "에이트"로 발음되고, 명사·형용사형은 강세가 앞으로 이동하며 -ate가 힘 빠진 "엇/잇"으로 축약(vowel reduction)된다는 원리 하나로 estimate/graduate/certificate/separate 등을 관통.

- **제목 및 썸네일 확정**:
  * 제목: `헷갈리던 -ate 발음 차이 이 원리 하나 알고 나니 입에서 바로 구분됩니다 | 영어 발음 차이`
  * 썸네일 핵심 카피: `-ate 외우면 손해` / `-ate 다시는 안 헷갈림`
  * 1타 4피 융합 공식 확립: `[검증된 자동완성 키워드 + 이번 소재 구체어]`로 검색 유입 극대화.

---

### 2. 공식 썸네일 세트 정비 및 규칙 반영 (2026-09-20 갱신)
사용자 지침에 따라 불필요한 시안 삭제, 채널명 뱃지 전면 제거, 최고 CTR 기준 클로즈업 규칙 반영 완료:

1. **`thumbnail.jpg` / `thumbnail-a.jpg` (메인 채택안 - 충격/멘붕형)**:
   - 룩앤필: 웜 크림 페이퍼 캔버스 배경 + 내부 블랙 액자 테두리.
   - 텍스트: 거대한 볼드 화이트 `"-ate"` + 노란색 알약 뱃지 `외우면 손해`.
   - 그래픽: `ESTIMATE` 단어 카드에서 `-ATE` 테두리 강조 후 `동사 [-에이트]` vs `명사 [-엇/잇]` 두 갈래 소리 분기 화살표.
   - 캐릭터: 머리를 감싸 쥔 리얼한 멘붕 표정 + `[ 여태 헛고생한 사람 ]` 레드 손글씨 화살표.

2. **`thumbnail-b.jpg` (삭제 완료)**:
   - A시안과 동일한 인물 표정·자세로 시안 낭비였던 기존 B시안은 사용자 지시에 따라 영구 삭제 처리.

3. **`thumbnail-c.jpg` (A/B 후보안 - 안심/확신 해결형, 최고 CTR 안)**:
   - 텍스트: `헷갈리던 -ate` + `다시는 안 헷갈림` (대시보드 A/B 시뮬레이터 예상 CTR 8.8%~10.9% 1위).
   - 그래픽: `ESTIMATE` 단어 카드 및 `동사: -에이트 O`, `명사: -엇/잇 O` 체크 라벨.
   - 캐릭터: 손바닥을 펼치며 안심시키는 신뢰감 있는 발표자 미소 제스처.
   - 변경: 불필요한 좌상단 `[ 이해하면 쉬운영어 ]` 뱃지 100% 완전 제거.

4. **`thumbnail-close-up.jpg` (모바일 전용 익스트림 클로즈업)**:
   - 화면 50%를 꽉 채우는 극대화 인물 클로즈업 ("쉿! 비밀 공개" 제스처).
   - 변경: 불필요한 좌상단 `[ 이해하면 쉬운영어 ]` 뱃지 100% 완전 제거 및 깔끔한 무결점 배경 확보.
   - 텍스트: 모바일 120px 가독성 극대화 2줄 텍스트 (`"-ate"` / `외우면 손해`).

---

### 3. 진행 상황 (2026-09-19)
- [x] 웹 검색 사실 검증: -ATE 동사(/eɪt/) vs 명사·형용사(/ət/, /ɪt/) 발음 및 모음 축약(Vowel Reduction) 규칙 교차 검증 완료.
- [x] `SCRIPT.md`: 초반 15초 이탈 방지 콜드 오픈, 30초 내 공식 선언, 1음절 제1강세 공통 속 끝소리 에너지 차이(제2강세 vs 슈와 완전 이완) 음성학적 정밀 검증 반영, 현실 맥락(견적서/식당/자격증 콩글리시 탈출) 결합 3회 반복 낭독(Listen & Repeat) & 근육 코칭, 초콜릿 유레카 반전, 신규 단어 퀴즈 2라운드(moderate/delegate), 2단 콤보 실전 문장, 엔드스크린 5초 keep-out을 완벽 반영한 12개 프레임 대본 확정 완료.
- [x] 사용자 대본 검수 및 확정 완료.
- [x] TTS(Gemini Charon) 12개 프레임 음성 생성 완료 (`assets/voice/01.wav` ~ `12.wav`, 퀴즈 3초 무음 구간 완비).
- [x] whisper 단어 단위 타임스탬프 실측 분석 완료 (`*.words.json`) 및 SCRIPT.md 누적 타임라인 동기화 (총 455.04초 / 7분 35.04초).
- [x] 5대 고품질 맞춤형 스케치노트 AI 일러스트 에셋 생성 및 배치 완료 (`assets/images/vocal_energy_flow.jpg`, `estimate_invoice.jpg`, `restaurant_check.jpg`, `gold_certificate.jpg`, `chocolate_break.jpg`).
- [x] `frame.md`: 모바일 퍼스트 가독성 표준(Archivo Black 6.8cqw), 5대 시각 에셋 라이브러리, 2대 소리 네온 글로우 스펙 정립 완료.
- [x] `STORYBOARD.md`: whisper 실측(455.04초) 기반 밀리초 단위 5단계 마이크로 비트(Micro-Beats), 5대 일러스트 연출, 3회 낭독 네온 펄스, 퀴즈 3초 타이머 무음 연출, 엔드스크린 keep-out 명세 완성.
- [x] HyperFrames 12개 프레임 컴포지션 전체 스캐폴딩 및 0.01초 단위 싱크 정밀 구현 완료 (`index.html`, `compositions/frames/01-cold-open.html` ~ `12-closing.html`, 총 455.04초).
- [x] **사용자 피드백 전면 반영 (2026-09-19)**:
  * **Frame 01 스피커 충돌 시퀀스 & 브랜드 컬러 정렬**: 기존 어두운 네이비 배경 폐기 ➔ 채널 시그니처 웜 크림(`#F4EFE6`) 페이퍼 캔버스, 빈티지 우드 스피커(`speaker_clash_base.jpg`)로 전면 교체. 단순 이동이 아닌 3단계 파동 순차 확장(Wave 1 ➔ Wave 2 ➔ Wave 3) 및 중앙 스파크/번개 충돌(`⚡️ 쾅! (소리 정면 충돌)`) 스톱모션/셀 프레임 시퀀스 애니메이션 구축.
  * **Frame 03 구강 단면도 100% 한글화 & 애니메이션 효과**:
    - 영어 원문 텍스트(`full energy`, `vowel reduction` 등)를 네오브루탈리즘 스타일의 직관적 한글 카드 3종(⚡️ 맨 앞머리 제1강세 공통 / 🔥 동사 100% 폭발 / 🍃 명사 0% 힘 빼기)으로 덮어서 대체.
    - 구강 단면도 내부 발성 기관을 따라 움직이는 다단계 인터랙티브 애니메이션 레이어 구축 (동사: 성대 불꽃 코어 점화 ➔ 4단계 구강 에너지 도트 빔 발사 ➔ 입술 밖 `💥 에이트! (100%)` 폭발 / 명사: 성대 코어 블루 전환 축소 ➔ `⬇️ 턱 힘 툭!` 화살표 드롭 ➔ 입술 밖 `💨 엇... (0%)` 이완 퍼프).
  * **Frame 02 & Frame 10 브랜드 공식 캐릭터 일러스트로 교체 (2026-09-20 사용자 승인)**:
    - 2프레임: 어두운 네온 그래픽 폐기 ➔ 공식 강사 캐릭터(`char_closing.jpg`) 및 `💡 시소 원리 하나로 끝!` 뱃지로 교체하여 신뢰감 부여.
    - 10프레임: 어두운 네온 헤드폰 그래픽 폐기 ➔ 공식 유레카 환호 캐릭터(`char_celebrate.jpg`, "Eureka! I got it!") 및 `🎧 귀에 쏙 꽂히는 쾌감!` 뱃지로 교체.
  * **AGENTS.md / CLAUDE.md 공통 영구 규칙 신설**: AI 이미지 쿼터 소진 시 코드로 억지 대체하지 않고 사용자에게 먼저 보고 및 상의 원칙 확정.
- [x] `npx hyperframes check`: **통과 완료** (0 errors, 0 warnings, 0 layout issues, 모션/런타임 무결성 통과).
- [x] HyperFrames 스튜디오 실시간 프리뷰 가동 중 (`http://localhost:3002/#project/ep19-ate-suffix`).
- [x] **SCRIPT.md 검수 반영분이 실측 타임스탬프 동기화 과정에서 도로 원상복구됐던 문제 재발견·복구
  (2026-09-19)**: SCRIPT.md/STORYBOARD.md/`compositions/frames/03-principle.html`·
  `07-secret-tip.html`·`11-summary.html`에서 맨몸 `-ate`+조사 결합 5곳(`-ate에`/`-ate에도`/
  `-ate에는`/`-ate로`×2 → `-ate 소리에`/`-ate 철자로`)과 Frame 3의 "에스-" 과잉일반화(estimate에만
  맞고 graduate엔 안 맞음 → "맨 앞 음절"로 일반화)가 다시 나타나 있었음. narration 문단·
  `caption-pill` 불릿·프레임 HTML의 주석/`setCaption()`/화면 텍스트(`f03-kc-stress-text`,
  `f03-fact-ipa`, `f03-flow-desc`)까지 전부 대조해서 재수정. 실제 TTS 음성은 영향 없음
  (`gen-tts-gemini.mjs`의 `LINES`가 이미 고친 텍스트로 생성됨). 일반화한 교훈:
  `knowledge/production-rules.md`의 TTS 절 참고.
- [x] **Frame 06 (`06-practice-certificate.html`) 피로감 해소 및 몰입감 강화 완료 (2026-09-20)**:
  * 도입부 상황 맥락 스토리 배너(`🎓 학교 졸업식 & 🏆 자격증 시험`)로 몰입도 제고.
  * 공식 발표자 캐릭터(`char_closing.jpg`) 반응 및 말풍선("스펠링은 똑같은데 소리가 완전 달라요!") 배치.
  * 단어별 에너지 대비 뱃지(`⚡ 에너지 100% [-eɪt]` vs `🪶 턱 힘 툭 0%! [-ət]`)로 시각 공식 각인.
  * 콩글리시 함정 셰이크(`서티피케이트 ❌`) ➔ 골드 체크(`서티피킷 ⭕`) 다이내믹 피드백.
  * 3회 반복 리듬 펄스 낭독 코칭 시각화.
  * WCAG AA 대비 4.5:1 이상 충족(`#9C1314`, `#084B8A`) 및 레이아웃 오버플로우/오클루전 속성 부여.
- [x] **Frame 08 (`08-quiz-moderate.html`) & Frame 09 (`09-quiz-delegate.html`) 퀴즈 도파민 텐션 & 긴장감 극대화 완료 (2026-09-20)**:
  * 3초 무음 타이머를 드라마틱 3단계 컬러 펄스로 고도화: 3초 골든 앰버(#F5C518) ➔ 2초 경고 오렌지(#FF793F) ➔ 1초 긴장 크림슨 레드(#FF3838).
  * 째깍 초침 효과음(`core-pass-tick.wav`) 3회 동기화 및 정답 발표 순간 경쾌한 차임벨(`core-pass-ding.wav`) 연동.
  * 정답 발표 시 정답 옵션 네온 글로우 확대 & `⭕ 정답!` 뱃지 바운스, 오답 옵션 디밍 & `❌ 오답` 뱃지 팝업.
  * 공식 유레카 환호 캐릭터(`char_celebrate.jpg`) 다이내믹 리프인 등장 (자체 'Eureka! I got it!' 일러스트 및 하단 대형 정답 배너와 중복되고 `overflow: hidden` 클리핑으로 노란 띠 아티팩트를 유발하던 카드 상단 말풍선 `#celebrateSpeech` 완전 제거하여 무결점 룩앤필 확보).
  * HyperFrames 중첩 미디어 표준 준수: SFX 오디오 태그에 `data-hf-media-start-basis="local"` 완벽 부여.
- [x] **Frame 12 클로징 이전 편 추천 카드 및 WCAG 대비 경고 전량 해소 완료 (2026-09-20)**:
  * `12-closing.html`에 `▶️ 함께 보면 좋은 영상: 소리 없는 철자의 비밀 (묵음 자음)` 배너 추가 —
    센터 카드 아래·자막 위 빈 공간(`top: 75%`)에 배치, 센터 카드와 같은 타이밍(0.9s 인·15.5s 아웃)으로
    끝 5초 keep-out 구간에선 함께 페이드아웃되어 화면 중앙을 비우는 규칙을 그대로 지킴.
  * `hyperframes check`의 WCAG 대비 경고 8곳(Frame 1 번개 아이콘이 어두운 배지 배경과 같은 색으로
    묻힘, Frame 8/9 퀴즈 라벨·타이머 숫자, Frame 11 단어 카드 발음 라벨) 전부 제안 색상으로 교체해
    105/105 통과로 해소.
  * Frame 8/9 타이머(`#timerBox`)에서 진짜 렌더링 버그도 함께 발견·수정: CSS
    `transition: transform 0.15s, ...`가 GSAP `tl.to({scale:...})`와 같은 `transform` 속성을
    동시에 건드리고 있었음(EP17 Frame 6~8에서 확립된 "GSAP 대상 요소에 CSS transition 금지"
    규칙과 동일 패턴) — transition 자체를 제거. 색상 변경도 `tl.call()`로 직접
    `style.color`를 건드리던 것(스크럽 시 되돌아가지 않는 비결정성 패턴, EP14 Frame 5 교훈과 동일
    계열)을 `tl.set()` GSAP 트윈으로 교체해 타임라인에 완전히 편입시킴.
  * `npx hyperframes check` 최종 재검증: **0 errors, contrast 105/105 pass**. 남은 경고 2건은
    루트 `index.html`의 BGM carve 관련 "GSAP target not found"로, 내 수정과 무관한 기존
    프레임워크 레벨 경고이자 렌더링에 영향 없음(check 자체는 여전히 통과).
- [x] **최종 로컬 렌더링 완료 (2026-09-20)**: `npx hyperframes@0.8.50 render`를 프로젝트 자체
  `renders/` 폴더에 기본 경로로 실행(2단계 출력 규칙 준수) — 13,652프레임, 20분 53초 소요.
  결과: `videos/ep19-ate-suffix/renders/ep19-ate-suffix_2026-09-20_18-32-11.mp4`
  (1920x1080, 30fps, H.264/AAC, 7분 35.0초/455.07초, 40.4MB) — ffprobe로 스펙 확인 완료.
- [x] **업로드 패키지 빌드 완료 (2026-09-20)**: `output/upload-packages/ep19-ate-suffix-longform/`에
  전체 산출물 완성.
  * 다국어 자막 7종(`subtitles/subtitles-{ko,en,ja,zh-tw,zh-cn,es,vi}.srt`) — 12개 프레임 HTML의
    `setCaption()` 호출을 실측 타임라인(누적 프레임 시작 + 로컬 호출 시각) 기준으로 71개 문장
    추출(`scripts/extract-ep19-captions.mjs`) 후 6개 언어로 번역(`scripts/ep19-translations.json`)
    하여 SRT 생성(`scripts/build-ep19-subtitles.mjs`). 각 자막 종료 시각은 다음 문장 시작 시각으로
    체이닝, 마지막 문장은 영상 총 길이(455.04초)까지 유지.
  * `multilingual-metadata.json`/`multilingual-guide.txt` — 7개 언어별 제목/설명/챕터 타임라인
    (lang 필드는 "원어 표기 (한국어 설명)" 형식 준수).
  * `title.txt`/`description.txt`/`tags.txt`/`pinned-comment.txt`/`timeline.txt` — 확정 시안(C) 기준.
  * `title-variants.txt` — C(채택)/B/A 3개 시안 CTR 등급과 함께 보존. **A/B는 BRIEF.md에 훅
    문구만 남아있고 전체 제목 원문이 보존되지 않아, 훅 문구만 기록하고 그 사실을 파일에 명시**
    (사실관계 불확실한 내용을 지어내지 않음).
  * `status.json` — `status: "ready_to_upload"`, 권장 예약일 2026-09-26(토) 20:00 KST
    (`2026-09-26T11:00:00Z`), EP18(9/24 목) 기준 2일 간격.
  * `upload-checklist.txt` — 엔드스크린 연결 EP18(묵음 자음, videoId `ROks87qezuU`), 끝 5초
    keep-out 구간(7:30~7:35, 총 길이 455.04초 기준)을 정확히 계산해 반영.
  * `index.html` — EP18 패키지의 CSS/JS 셸을 그대로 재사용하되, 콘텐츠는 손으로 다시 타이핑하지
    않고 이미 생성해 둔 `title.txt`/`description.txt`/`multilingual-metadata.json` 등을
    `scripts/build-ep19-index-html.mjs`가 직접 읽어 주입하는 방식으로 제작(전사 오류 방지).
  * **⚠️ 썸네일 B 처리 정정(2026-09-20)**: 최초 패키지 빌드 시엔 이 문서 2026-09-19 절의
    "B는 A와 중복이라 영구 삭제" 기록만 보고 3종(a/c/close-up)으로 빌드했는데, 사용자가 그
    사이 실사 스타일의 새 B("사전 찢으세요!" + ESTIMATE 카드, `.png`)를 직접 제작해 프로젝트에
    저장해 둔 상태였다 — 파일이 `thumbnail-b.jpg`가 아니라 `thumbnail-b.png`라서 `*.jpg` 검색에
    걸리지 않아 처음엔 놓쳤다(사용자가 "썸네일 b가 없음"으로 지적한 뒤 재검색해서 발견).
    `.jpg`로 변환해 프로젝트·패키지 양쪽에 저장하고 4종 그리드로 재조정. 이후 사용자가 같은
    구도의 더 고해상도 개선판(`thumbnail-b.jpg`, 5504x3072 — 따옴표 제거 등 디자인 다듬음)으로
    직접 교체해 프로젝트 폴더에 저장 → 패키지 폴더에도 재복사해 동기화 완료.
  * 영상·썸네일 파일도 패키지 폴더로 복사 완료(`video.mp4`, `thumbnail.jpg`/`-a`/`-b`/`-c`/`-close-up.jpg`).



