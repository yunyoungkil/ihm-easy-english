---
workflow: faceless-explainer
flow: automation
storyboard: yes
message: "눈으로 보면 다 아는데 원어민이 말하면 안 들리는 영어 합체 소리 네 가지 (give me · let me · kind of · out of)"
destination: youtube-shorts
aspect: 1080x1920
language: ko
audience: "한국에서 영어를 배운 3060 성인 학습자"
length: 44초 (비교 시트 컷 계획 12컷 44.0초, 오디오 실측 후 미세 조정)
angle: merge-sound
---

# BRIEF — ep32-shorts-word-merge

단독 쇼츠 에피소드(12/05 토 슬롯). 2026-11-20 비교 시트(`ep32-shorts-word-merge`) 승인(Gate 1) 완료.
비교 시트: ep32-shorts-word-merge

## 기본 정보

- **제목 (승인됨, 시트 2안)**: `김미? 렘미? 원어민이 두 단어를 하나로 합쳐 먹는 진짜 이유`
- **썸네일 (승인됨, 메인 A안)**: `thumb-A.jpg` (오프화이트 3D 자석 큐브 GIVE + ME → GIMME)
  - 비교 시트 시안 경로: `data/youtube/transform-sheets/images/ep32-shorts-word-merge/thumb-{A,B,C}.jpg`
- **형식**: 오해 공감 핑퐁 훅 → 3D 자석 합체 원리 → 세 표현 분리·합체 대비(`give me→gimme`, `let me→lemme`, `kind of→kinda`) → 무나레이션 3연속 귀 트임 플래시 → `outta` 1.5초 리스닝 퀴즈 → 정답 스매시 → 4단 체크리스트 요약 CTA.
- **목표 길이**: 44.0초, 12컷 (분당 16.4컷).

## 시험 변수 (Gate 1 승인 기준 2건)

1. **비레이아웃 0.3초 청각 시그니처 (Audio Anchor) 4회 적용**:
   - 시점: 컷 3(`gimme`), 컷 5(`lemme`), 컷 7(`kinda`), 컷 10(`outta`) — 두 단어가 하나로 합체되는 카타르시스 순간 4곳에 동일한 0.30초 고유 효과음(`assets/sfx/audio-anchor.wav`) 배치.
   - 가설: 시각 템플릿을 고정하지 않고도 합체 순간에 일관된 0.3초 청각 시그니처를 울리면 시청 몰입과 채널 기억도가 올라 공개 7일 평균 시청 시간(`watchSeconds7d`)·구독 수(`subs7d`)·계속 시청함(`stayedToWatch`)이 개선될 것이다(가설).
2. **브라이트 에디토리얼 실사 + 1:1 오해 대화 핑퐁 훅 + 가로 정중앙 대칭**:
   - 직전 EP31 다크 네온 룩과 차별화되는 밝은 낮 햇살 에디토리얼 실사 5장, 0.5초 `Gimme a minute → 김미...? 누구 이름인가?` 오해 대화 훅, 전 컷 가로 정중앙 대칭 구도.
   - 가설: 피드 이탈이 줄어 `stayedToWatch`가 평소 쇼츠 중앙값(36.33%)보다 판정 폭 이상 오를 것이다(가설).

## 기획 근거

- 소재 이력 topic: "눈으로 보면 다 아는데 원어민이 말하면 안 들리는 영어 합체 소리 네 가지 (give me · let me · kind of · out of)"
- 다음 기획 입력: 2026-11-19T16:25:00.216Z · `data/youtube/next-episode-input.md` 인용 — 최근 쇼츠 20편 7일 조회 중앙값 1,177회, 상위 3편 영어로 시작 0/3(하위 3/3) 반영 한글 질문형 제목 채택
- 비교 시트: `data/youtube/transform-sheets/ep32-shorts-word-merge.json` (sourceVideoId: `Z6VDb7biKCw`)
- 융합 레퍼런스 5편: `Z6VDb7biKCw`(공감 프레임과 합체 소리 강조), `49VA7-b8oyc`(0.5초 1:1 오해 대화 핑퐁 훅), `dYrD_e1aLCw`(검은 띠 없는 2색 고대비 상단 훅 & 힘 빼기 원리), `SF7u3wLKCEM`(밝은 바탕 소멸 자음 빨간색 강조), `_xfBa82OAaw`(짧은 생활 대화 예문 결합).

## 연결

- **고정 댓글 보너스 5표현**: `going to → gonna`, `got to → gotta`, `want to → wanna`, `don't know → dunno`, `sort of → sorta`.

## 화면과 음성

- **이미지**: `assets/images/art-cafe.jpg`, `art-phone.jpg`, `art-office.jpg`, `art-door.jpg`, `art-magnet.jpg` (5장).
- **한국어 나레이션**: AI Studio Gemini TTS (`Gero`, 남성). 끝소리 늘어짐 방지 Style 지시 적용(컷 8 무나레이션 제외 11컷).
- **원어민 영어 발음**: AI Studio Gemini TTS (`Olin`, 여성 원어민 톤). `give me`, `gimme`, `let me`, `lemme`, `kind of`, `kinda`, `outta` 7개 순차 생성.
- **청각 시그니처 & BGM**: `assets/sfx/audio-anchor.wav` (0.30초) + `assets/bgm/track.mp3` (무보컬 경쾌한 에디토리얼 트랙).
- **금지**: 시청자용 화면·대본에 전문학술용어(음운 탈락·축약, 연음·동화, 탄설음 등) 직접 노출 금지.
