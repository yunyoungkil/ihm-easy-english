# 시즌1 EP10 — 시즌1 총정리

마지막 확인: 2026-08-25

## 역할

- 시즌1의 마지막 편이다.
- 시즌1에서 다룬 영어 읽기·발음 원리를 총정리하고 시즌2를 예고한다.
- EP10 이후의 새 에피소드는 기본적으로 시즌2로 분류한다.

## 제작 상태

| 콘텐츠 | 상태 | 근거 |
|---|---|---|
| 롱폼 | 완성 | `EP10-card`, `scripts/ep10.json`, `out/ep10.mp4` |
| 쇼츠 A | 디자인 확정·사람 검수·렌더 완료(재렌더 2026-08-25 22:31) | `videos/ep10-shorts-a-faceless/renders/ep10-shorts-a-faceless_2026-08-25_22-31-39.mp4`(6.4MB, 54.3초) |
| 쇼츠 B | 완성·렌더 완료(2026-08-25 22:27) | SOCIAL(-CIAL→셜) 반전형, 카톡 메신저 UI. BGM·말풍선 스프링·강조 파티클 추가 후 렌더. `videos/ep10-shorts-b-faceless/renders/ep10-shorts-b-faceless_2026-08-25_22-27-32.mp4`(1.0MB, 20.8초) |

롱폼을 다시 만드는 작업은 현재 계획에 없다. 쇼츠 A·B 모두 사람 검수·렌더 승인·**업로드 패키지 생성까지 완료**했다
(`content/season1/ep10/shorts-a.json`, `shorts-b.json` → `output/upload-packages/s1-ep10-shorts-a`, `s1-ep10-shorts-b`).
쇼츠A의 V2·V3 디자인안, 쇼츠B 이전 단계였던 콜리전 파일럿·검색창 UI 시안은 비교 자료로 보존한다.

**롱폼 업로드 패키지도 완료.** `content/season1/ep10/longform.json` + `output/upload-packages/s1-ep10-longform/`
생성 완료. 통합 요약 HTML: `output/upload-packages/s1-ep10-upload-summary.html`.
엔딩화면 연결 영상은 채널 규칙대로 직전 편(EP9, `sNNufVhkjT8`)에 연결했다 — "다음 편" 개념이 아니라
항상 직전 편에 연결하는 게 규칙이라([제작 규칙](../production-rules.md)), 시즌2 EP1이 나와도 바꾸지 않는다.

## 롱폼 썸네일 확정 (2026-08-27)

`output/upload-packages/s1-ep10-longform/title.txt`·`thumbnail-text.txt`에 반영 완료.

- **제목**: `익-션-전-천-처-저-셜, 사실 한 규칙이었습니다 | 시즌1 총정리`
- **썸네일 문구**: 흰색 "7개 규칙" / 노랑 박스 검정 "사실 하나였다" / 캡션 플레이트 "강세가 정답이었다"
- **구도**: 3분할 레이아웃 — 좌측 2/3 텍스트존, 우측 1/3 인물존(눈이 우측 상단 교차점에 오도록).
- **실사 요소**: 30~35% 화면을 차지하는 큰 얼굴 클로즈업, 과장된 "아!" 하는 밝은 깨달음 표정
  (공포·고통 아님). 분리 기법은 인물 실루엣(머리·어깨·목선)을 따라가는 **찢어진 종이 컷아웃**
  (매끈한 스티커 테두리 아님 — 실제 종이 섬유질이 삐져나온 불규칙한 찢김 텍스처).
- **금지 사항**: 그리드 안내선 렌더링 금지, 가짜 유튜브 UI(재생시간 등) 렌더링 금지, 우측 하단
  모서리(약 15%×15%)는 완전히 비움 — 유튜브 실제 재생시간 표시와 Gemini 워터마크가 둘 다 그 자리에
  찍히기 때문.
- **⚠️ 위 실사 요소·분리 기법 선택(과장된 감정+큰 얼굴, 찢어진 종이)은 이 장면 전용 판단이지
  고정 템플릿이 아니다.** 다음에 다른 썸네일을 만들 때 그대로 복붙하지 말고, 매번 그 장면에 맞는
  감정 톤·분리 기법을 다시 고를 것(cross-session memory `thumbnail-copy-5-options-before-production.md`
  참고).
- 최종 프롬프트(영문, 실사용)는 위 memory 파일과 이 세션 대화 기록에 있음.
- **최종 이미지 저장 완료(2026-08-27)**: `output/upload-packages/s1-ep10-longform/thumbnail.png`.
  스펙 대조 확인 완료 — 텍스트 정확, 그리드/가짜 UI 없음, 찢어진 종이 컷아웃이 얼굴 윤곽을 따라감.
  최초 저장본(`thumbnail.jpg`, 이후 삭제)에는 우측 하단에 Gemini 자체 워터마크가 있었는데, 사용자가
  직접 PNG로 재저장하며 워터마크를 제거했음 — Claude가 수행/권장한 작업이 아니며, 구글 이용약관상
  권장되는 방식은 아니라는 점을 사용자에게 안내함(2026-08-27).

## 쇼츠 A·B 썸네일 확정 (2026-08-27)

- **쇼츠A**: 문구는 기존 그대로 사용(체크리스트 감사 결과 규칙 확정 전에 썼는데도 통과 — 숫자·궁금증·
  Rehook 다 있음). 이미지: 상단 헤드라인("시즌1 발음 진짜 내 것?"/"4문제 테스트") + 4단어 칩밴드 +
  입모양 클로즈업(원형+파랑 글로우 링) + 채널명. `output/upload-packages/s1-ep10-shorts-a/thumbnail.png`
  저장 완료. 참고: 프롬프트는 "집중하는 눈빛"을 요청했으나 실제 생성본은 코까지만 잡혀 눈은 안 보임
  (경미한 편차, 재생성 안 함).
- **쇼츠B**: 문구를 감사 과정에서 **수정함** — 원래 3번째 줄("-CIAL → 셜")이 영상의 핵심 규칙(정답)을
  통째로 노출해서 궁금증을 죽이는 문제를 발견, 삭제. 대신 헤드라인 2줄(질문+반전)만 남기고, 영상 실제
  오프닝(카톡 무음 알림)과 맞춰 폰 화면 채팅 말풍선에 "SOCIAL 발음이 머지?" 질문을 넣는 구도로 확정.
  최종 2줄: "SOCIAL 발음 헷갈려?" / "근데 이미 "소셜"이라 하잖아요". `thumbnail-text.txt` 갱신 완료,
  `output/upload-packages/s1-ep10-shorts-b/thumbnail.png` 저장 완료.
- 이 감사에서 나온 원칙: **Track B(리빌형)라고 정답까지 다 보여줘도 되는 건 아니다** — "반전"까지만
  보여주고 "왜 그런지(메커니즘)"는 영상에 남겨둬야 클릭 이유가 생긴다. 다음 리빌형 쇼츠 만들 때도
  이 구분(반전 O, 메커니즘 X)을 적용할 것.

## 공개 일정 확정 (2026-08-27)

EP9 3부작이 오늘(8/27) 완료된 직후 결정. EP9는 제작 완료 시점에 맞춰 순차 진행했지만, EP10은 이미
제작이 100% 끝나 있어 기다릴 이유가 없다고 판단 — EP8→EP9 시작 간격(9일, 데이터가 강제하는 값은
아니고 전례일 뿐)을 따르지 않고 최소 호흡(2일)만 두고 바로 이어감.

| 콘텐츠 | 영상 ID | 공개 예정 | 상태 |
|---|---|---|---|
| 롱폼 | `3PkSwrFIcRE` | 2026-08-29(토) 20:00 KST | **예약 완료**(API로 실측 확인, 2026-08-27) |
| 쇼츠 A | `LdiZKCzKf0c` | 2026-08-31(월) 20:00 KST | **예약 완료**(API로 실측 확인, 2026-08-27) |
| 쇼츠 B | `nVrCk8IZFGA` | 2026-09-02(수) 20:00 KST | **예약 완료**(API로 실측 확인, 2026-08-27) |

3개 전부 채널 API로 직접 조회해서 `privacyStatus: private` + `scheduledPublishAt`이 계획한 시각과
정확히 일치하는 걸 확인했다(단순히 사용자 말을 믿은 게 아니라 실측). 콘텐츠 JSON의 videoId·url·
relatedVideo·status를 전부 실제 값으로 채우고 패키지·요약 HTML 재생성 완료.

`content/season1/ep10/*.json`의 `scheduledAtKst`·`scheduledPublishAtUtc`에 반영하고
`npm run upload-package`로 3개 패키지 재생성 완료. **주의**: 이 스크립트는 `output/upload-packages/`
파일을 `content/season1/ep10/*.json`(원본)에서 다시 생성하므로, 산출물 파일만 직접 고치면 다음
재생성 때 덮어써진다 — 이번에 롱폼 제목·문구, 쇼츠B 문구도 원본 JSON에 먼저 반영한 뒤 재생성했다.

**남은 것 — 여기서부터는 사용자가 직접 해야 하는 실제 유튜브 작업:**

- 썸네일 파일: **롱폼·쇼츠A·쇼츠B 전부 완료.**
- 공개 일정: **확정 완료(위 표).**
- **롱폼 YouTube 업로드·예약 완료**(`3PkSwrFIcRE`, 2026-08-27 사용자 확인). 쇼츠 A·B 콘텐츠 JSON의
  `[EP10-videoId]` 자리·`relatedVideo`·`renderFileName`(SEO 파일명)까지 전부 반영하고 패키지·요약
  HTML 재생성 완료.
- 영상 파일도 SEO 파일명으로 각 패키지 폴더에 복사해둠(원본은 `out/`, `videos/*/renders/`에 그대로
  보존 — `.gitignore`에 `output/upload-packages/**/*.mp4`·`videos/**/renders/*.mp4` 추가해서 git
  히스토리에는 안 쌓이게 함): `s1-ep10-longform-season1-recap.mp4`,
  `s1-ep10-shorts-a-pronunciation-quiz.mp4`, `s1-ep10-shorts-b-social-pronunciation.mp4`.
- **남은 건 쇼츠 A·B를 실제로 YouTube에 업로드(비공개/예약)하는 것뿐** — 사용자 직접 작업. 업로드
  후 videoId를 알려주면 이 문서와 콘텐츠 JSON에 마저 반영한다.

### 쇼츠 A V1 전체본

- 길이: 54.247초
- 구성: 7장면, 장면 전환 6개
- 음성: 질문 TTS 2·4·6·8번을 정답 발음 없는 문장으로 재생성한 뒤 11개 TTS를 장면별로 조립, 1.15배속 적용
- 강조: CONFUSION의 `SION`, CAPTURE의 `TURE`에 HyperFrames `marker-highlight` 방식의 손그림 밑줄 적용
- 검수: HyperFrames `check` 통과, 렌더 미승인
- 미리보기: `http://127.0.0.1:3010/#project/ep10-shorts-a-faceless`
- 대본·장면 타이밍: `videos/ep10-shorts-a-faceless/STORYBOARD.md`
- 최종 조립 원본: `videos/ep10-shorts-a-faceless/index.html`
- 보존 비교안: `videos/ep10-shorts-a-faceless-design-v2/`, `videos/ep10-shorts-a-faceless-design-v3/`

## 대본 원본과 파생 파일

이 문서를 EP10 콘텐츠의 사람이 읽는 **대본·결정 원본**으로 사용한다. 내용이나 방향을 바꿀 때는 이 문서를 먼저 수정한다.

### 쇼츠 A HyperFrames 비교 시제품

**핵심 메시지**

> CONFUSION은 컨퓨션이 아니라 컨퓨전이며, 모음 뒤의 S가 부드러운 ‘ㅈ’ 소리로 바뀐다.

**사용 나레이션**

> 컨퓨전은요? 전입니다. 모음 뒤라서요.

**화면 흐름**

1. `CONFUSION`과 `컨퓨션? / 컨퓨전?` 선택지를 보여준다.
2. 나레이션의 “전입니다”에 맞춰 `컨퓨전`과 한글 `전`을 강조한다.
3. `U + SI → 전`을 보여주며 모음 뒤의 S 발음 변화를 설명한다.
4. 마지막에는 정답과 원리를 읽을 시간을 준다.

**연결된 제작 파일**

- 시제품 전체 대본: `videos/ep10-confusion-pilot/SCRIPT.md`
- 화면·모션 타이밍: `videos/ep10-confusion-pilot/STORYBOARD.md`
- 실제 짧은 나레이션: `videos/ep10-confusion-pilot/user_script.txt`
- HyperFrames 구성: `videos/ep10-confusion-pilot/index.html`
- 기존 Remotion 롱폼 데이터: `scripts/ep10.json`

`SCRIPT.md`와 `STORYBOARD.md`는 제작용 파생 파일이다. 업로드 패키지를 만들면 `output/upload-packages/.../script.txt`에는 확정 대본의 배포용 사본만 저장한다.

## 쇼츠 제작 전 선행 작업

디자인을 성급하게 공용화하지 않는다. EP10 쇼츠 A의 대표 10~15초 구간을 HyperFrames로 별도 제작해 현재 Remotion 결과와 비교한다. 만족한 기술 요소만 다음 기반에 반영한다.

- TTS 발화 기준 타이밍 데이터
- 영어 철자와 한글 발음의 색상 강조
- 단어 카드·자막·화살표·정답 공개·CTA 공용 컴포넌트
- 상·하단 모바일 안전영역
- 효과음 역할과 음량
- 글자 넘침·장면 중첩·오디오 공백 검수

이 시스템은 우선 쇼츠 A·B·채널 쇼츠 C에 적용한다. 롱폼 모션 시스템과 썸네일 시스템은 별도로 관리한다.

## 다음 행동

1. 쇼츠 A·B 업로드 패키지 생성.
2. 충분한 업로드 데이터가 쌓인 뒤 재사용할 디자인·기술만 공용화. Track B는 에피소드마다 새 컨셉으로
   만들기로 확정했으므로([콘텐츠 포맷](../content-formats.md)), 공용화 대상은 카톡 UI 자체가 아니라
   BGM 덕킹·파티클 임팩트 같은 기법 단위로 한정한다.

## 관련 문서

- [지금 할 일](../now.md)
- [콘텐츠 포맷](../content-formats.md)
- [제작 규칙](../production-rules.md)
