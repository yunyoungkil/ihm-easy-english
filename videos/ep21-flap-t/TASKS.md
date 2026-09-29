# TASKS — ep21-flap-t

`knowledge/VIDEO_WORKFLOW.md` 9단계 "수정 사항 기록" 관행을 따른다.
기획, 제목/썸네일 확정, 대본 작성 및 감사, 스토리보드 및 디자인 시스템 구축부터
TTS 실측, 프레임 구현, 자막 100% 검증, 최종 렌더까지의 전체 제작 이력을 단계별로 투명하게 남긴다.

---

## 2026-09-29 — 기획, 썸네일 A/B/C 확정, 프로젝트 스캐폴딩

### 1. 기획 및 데이터 분석 (`VIDEO_WORKFLOW.md` 1~2단계)
- **소재 선정**: `data/youtube/idea-board-history.json` 랭크 1위(점수 94) — Flap T(모음 사이
  T가 'ㄹ'로 바뀌는 규칙). 타겟: 버터발음을 흉내 내려다 혀에 힘이 들어가 어색해지는 4060
  성인 학습자.
- **썸네일 확정**: 대시보드 A/B 시뮬레이터로 3안(A/B/C) 생성 → Gemini AI CTR 진단 →
  A안("City의 T, 완벽하게 속았네", A+ 등급, CTR 9.2~12.8%)이 최고점으로 확정.
  - 진단 과정에서 B안 앵커 텍스트("중간 T") 내부에 이미지 아티팩트(글리치)가 발견됨 —
    B안을 실제 유튜브 A/B 테스트에 올리려면 재생성 필요(현재는 CTR 참고용으로만 보존).
- **⚠️ 썸네일 프롬프트 코드 자체의 버그 2건 발견·수정** (이 세션에서 EP21 작업 도중 발견,
  `scripts/ab-simulator.mjs` 공통 코드에 적용되므로 앞으로 모든 에피소드에 영향):
  1. 앵커 단어(예: "-ate", "CITY")에 글로우/네온/회로 패턴/3D 입체 효과가 실제로 생성되는
     버그 확인(사용자가 "OTE" 예시로 직접 지적) — `buildThumbnailPrompt()`의 Typography
     문단에 명시적 NEGATIVE 지시(글로우·네온·3D·회로패턴 전부 금지) 추가로 해결.
  2. 더 근본적 원인: AI가 제목 5안을 추천할 때 채우는 `designConcept` 필드의 스키마 예시
     문구 자체가 "돋보기+번개", "물음표", "소리 충돌 이펙트" 같은 소품/이펙트를 만들라고
     지시하고 있었음 — "텍스트 적용" 버튼을 누르면 이 `designConcept`이 그대로
     `visualConcept`에 복사돼 이미지 생성 프롬프트에 주입되므로, 겉으로 보기엔 이미지
     생성 프롬프트를 고쳐도 계속 소품이 나오는 것처럼 보였다. `designConcept` 스키마 예시를
     "인물 표정·제스처만, 소품/이펙트 절대 금지"로 재작성해 근본 해결.
     상세 재현·수정 경위는 대화 로그 참고, 교훈은 `knowledge/thumbnail-strategy.md`에 반영.
  - **교훈**: 텍스트 필드(`visualConcept`)에 적힌 설명만 보고 "이미지가 이럴 것"이라고
    단정하지 말 것 — 실제 생성된 이미지 파일을 매번 직접 열어서 픽셀로 확인해야 한다
    (사용자가 두 차례 직접 지적해서 발견).
- **모바일 클로즈업**: 사용자가 대시보드 버튼이 아닌 별도 경로로 직접 생성·저장함 —
  `output/temp-thumbnails/`나 대시보드 상태(`closeUpImageUrl`)엔 기록이 없음. 업로드 패키지
  작성 단계에서 실제 파일 위치를 재확인할 것.

### 2. 프로젝트 초기화
- [x] `npx hyperframes init videos/ep21-flap-t` 실행 (기존 `prompts/` 폴더를 임시로
  옮겼다 복원 — init이 빈 디렉터리만 허용하기 때문).
- [x] `BRIEF.md` 작성 완료.
- [x] `idea-board-history.json`에 `episodeSlug: "ep21-flap-t"` 연결 완료
  (`/api/idea-board/history/register`, Node `http` 모듈로 직접 호출해 한글 topic 인코딩
  문제 회피 — EP19/EP20에서 겪은 curl 쉘 이스케이프 문제 재발 방지).

### 다음 단계
- [ ] `SCRIPT.md`/`STORYBOARD.md` 작성 — water/city/better의 Flap T 실제 발음, 조음 원리를
  웹 검색으로 사실관계 확인 후 진행.
- [ ] TTS 나레이션 생성 전 비용 견적·승인.
- [ ] HyperFrames 프레임 구현 → `hyperframes check` → 사용자 검수 → 승인 후 렌더링.
