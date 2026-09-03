---
workflow: general-video
flow: automation
storyboard: yes
message: "Want와 Won't는 단어가 아니라 턱의 움직임 하나로 구분해서 듣는다"
destination: youtube-longform
aspect: 1920x1080
language: ko
audience: "원트와 우언트의 소리 차이를 구별하지 못해 듣기와 말하기에서 늘 헷갈리는 왕초보 학습자"
length: ~5min
angle: narrative
---

## Intent

단편 EP12(전체 에피소드 번호로는 EP12 — EP11은 이미 렌더링 완료된 별도 프로젝트
`videos/ep11-longform-faceless/`, GOING TO→GONNA. "단편" 분류 근거:
[단편/시즌 분류 정리](../../knowledge/decisions/2026-09-03-standalone-vs-season-episodes.md)).
Want vs Won't를 단어 자체가 아니라 원어민이 실제로 듣는 방식(턱의 움직임/입모양 차이)으로
설명해서, 왕초보가 "왜 나는 매번 헷갈릴까"라는 미해결 고통점을 직접 해결한다.

**이 소재는 `💡 아이디어→썸네일 기획 보드`에서 AI가 생성한 5개 후보 중 최고점(88점)으로 선택됐다**
— 시청자 실제 언어·고통점 DB(audienceDna)에 직접 기록된 미해결 질문에서 나온 소재라, 경쟁사
복제가 아닌 채널 고유의 차별화 포인트가 가장 뚜렷하다는 게 선정 이유였다(시장 기회점수가 더 높았던
"노베이스 첫걸음" 대안 대신 차별화를 우선). 근거: `knowledge/episodes/ep12-want-wont.md`.

**HyperFrames 롱폼 카드 템플릿은 새로 설계하지 않는다** — EP11 프로젝트
(`videos/ep11-longform-faceless/frame.md`)가 이미 Remotion `CardScene`을 그대로 옮기지 않고
HyperFrames frame preset 시스템으로 새로 설계해뒀다. 이 편은 그 템플릿을 재사용해서 두 편 사이
시각적 일관성을 만든다.

## 확정된 제목·썸네일 (대본보다 먼저 확정 — `VIDEO_WORKFLOW.md` 2단계 규칙)

A/B 시뮬레이터에서 3개 시안 생성 후 Gemini AI CTR 진단으로 비교, 이미지까지 전부 실제 생성해서
**셋 다 유튜브 자체 Test & Compare로 겨루기로 결정**(A/B 하나만 고르지 않음). 상세 표는
`knowledge/episodes/ep12-want-wont.md` 참고.

- **제목(시안 C 대표)**: Want와 Won't, 미드에서 똑같이 들리는 진짜 이유
- **썸네일 카피**: 0.1초 만에 귀가 열린다
- **포인트 뱃지**: ⚡ 소리 착각 탈출
- Head Fake·Rehook 대사는 위 문구와 표현을 동일하게 맞출 것(`VIDEO_WORKFLOW.md` 3단계 규칙).

## Assets

- `public/images/ep12-thumbnails/variant-{a,b,c}.jpg` — 확정된 썸네일 3종(유튜브 A/B 테스트용).
  영상 내 비주얼 에셋으로 쓰지 않는다 — 색상·톤 참고용.
- `public/brand/thumbnail-presenter-reference.jpg` — 채널 기준 인물(남성). 영상 내 인물 표현이
  필요하면(없어도 됨 — 이 채널은 페이스리스 포맷) 이 정체성을 따를 것.
- 나레이션은 신규 생성 필요 — **반드시 남성 음성.** EP11(GONNA)이 HeyGen TTS에서 여성 음성으로
  잘못 만들어져 채널 기준 인물(남성)과 안 맞는 문제가 있었음(`knowledge/episodes/ep11-gonna.md`
  참고) — 이 편에서 같은 실수를 반복하지 않는다.

## Customizations

- (해당 없음 — 캡처/특수 효과 없이 표준 자막·모션 구성)

## Notes

- **VIDEO_WORKFLOW.md 3단계 규칙 전부 적용**: 중독 루프(Stakes→Big Question→Head Fake→Rehook),
  결말을 완전히 닫지 않고 다음 편으로 이어지는 구체적 Rehook, 종결어미 다양화("~요"만 반복 금지),
  왕초보 기준 한 문장 하나의 정보, 퀴즈 정답은 생각 시간 뒤 별도 발화로만 공개.
- **길이는 다른 편(EP11 등) 분량을 참고하지 않는다** — 이 훅("Want/Won't가 똑같이 들리는 진짜
  이유")이 요구하는 깊이만큼만. 억지로 분량을 채우려고 다음 편 Rehook 소재(예: 다른 혼동 단어쌍)를
  미리 끌어오지 않는다.
- 브랜드 페르소나(`knowledge/brand-persona.md`) 100% 준수 — 훈계조·자극적 낚시성 과장·어려운
  음성학 용어 금지, 게으른 혀의 소리 지름길→패턴 확장→반전 꿀팁의 3단계 도파민 공식.
- 화면 문구(자막/카드)와 발화 문구(나레이션)를 구분해서 기록할 것.
