# TASKS — ep17-bossy-r 제작 기록

`knowledge/VIDEO_WORKFLOW.md` 9단계 "수정 사항 기록" 관행을 따른다.
기획부터 TTS 실측, 15개 프레임 HyperFrames 컴포지션 구현, 나레이션 100% 캡션 보강,
엔드스크린 keep-out 및 `npm run check` 0 에러 통과까지의 전체 제작 이력을 기록한다.

---

## 2026-09-18 — EP17 전체 15개 프레임 신규 제작 및 하이퍼프레임 파이프라인 완제작

### 1. 기획 및 데이터 분석 반영
- **소재**: 모음 뒤 R의 3가지 소리 공식 (Bossy R: AR, ER, IR, OR, UR).
- **시청자 페인포인트 반영**: 3060 학습자가 사전의 복잡한 5개 발음기호에 압도당하는 문제를 3개의 직관적 소리 서랍(1번 AR 아~, 2번 OR 오~, 3번 ER/IR/UR 편안한 중립 어~)으로 단순화.
- **반전 구조 (Frame 3 vs 4)**:
  * Frame 3 (`03-five-symbols.html`): "사전 발음기호가 5개나 되어 복잡해 보인다"는 긴장감만 조성(서랍을 미리 공개하지 않음).
  * Frame 4 (`04-head-fake.html`): 5개가 사실은 3개 서랍으로 압축된다는 반전을 3단 서랍 비주얼과 함께 극적으로 공개.
- **도파민 3단계 및 3회 반복 낭독 공식 준수**:
  * 1단계 원리 발견: Frame 5 2D 구강 단면도 SVG를 통한 혀의 '모음 꼬리 낚아채기' 원리.
  * 2단계 패턴 확장: Frame 6(AR), Frame 7(OR), Frame 8(ER/IR/UR) 3회 반복 리스닝 & 낭독.
  * 3단계 반전 꿀팁: Frame 9 앞 R(red: 앞으로 우~ 밀어내기) vs 뒤 R(car: 뒤로 당기기) 방향성 대조.
  * 4단계 실전 훈련: Frame 10(퀴즈 1R 3초 카운트다운), Frame 11(퀴즈 2R 스피드 라운드), Frame 12~13(자연스러운 문장 읽기).
  * 5단계 자산화: Frame 14 원페이지 치트시트 요약표 + 캡처 연출(카메라 셔터 SFX).
  * 6단계 클로징: Frame 15 엔드스크린 5초 완벽 중앙 비움 keep-out.

---

### 2. TTS 음성 생성 및 Whisper 실측 타임스탬프 동기화
- Gemini TTS API를 활용하여 15개 씬의 나레이션 오디오 파일(`assets/voice/01.wav` ~ `15.wav`) 생성.
- `whisper.cpp`로 단어별 발화 시각(`*.words.json`) 및 정확한 프레임별 지속 시간(`.tts-results.json`) 실측 완료.
- 총 재생 시간: **389.46초 (6분 29.46초)**.
- `SCRIPT.md`, `STORYBOARD.md`, `index.html` 및 개별 프레임의 `data-duration`을 1ms 오차 없이 100% 일치시킴.

---

### 3. 디자인 시스템 및 컴포지션 구현
- **비주얼 스타일**: Neo-brutalist Sketchnote / Visual Thinking Cyber-HUD 룩.
  * 캔버스 배경: 웜크림 베이지 (`#F4EFE6`)
  * 잉크 테두리: 3.5px solid `#2B2B2B`
  * 하드 섀도우: 5px 5px 0px `#2B2B2B`
  * 3대 서랍 시그니처 색상:
    - 1번 서랍 (AR): 골드 옐로우/오렌지 (`#F5A623`, `#FEF6E9`)
    - 2번 서랍 (OR): 딥 오렌지 (`#E67E22`, `#FDF3EC`)
    - 3번 서랍 (ER/IR/UR): 소프트 스카이블루 (`#2E86AB`, `#EBF4F8`)
- **나레이션 100% 커버리지**:
  * 모든 프레임에 `caption-pill` 컴포넌트(흰 pill 배경 + 2.5px 테두리 + 딥-스왑-복귀 전환) 탑재.
  * 나레이션 음성이 흐르는 동안 화면에 텍스트가 비는 구간이 단 1초도 없도록 whisper words.json 전문 대조 완료.
- **유튜브 엔드스크린 Keep-out 준수**:
  * Frame 15의 마지막 5.0초(13.92s ~ 18.92s)는 유튜브 추천영상/구독 UI가 배치되므로 화면 중앙을 100% 비움.
  * 채널 워드마크는 좌상단 안전영역(`left: 6cqw; top: 8cqh`)에 미니멀하게 배치.
- **오디오 아키텍처**:
  * 단일 루트 BGM 트랙 (`assets/bgm/track.loop.mp3`, `data-volume="0.06"`).
  * `data-fx-carve`를 통한 `voiceover` 오디오 그룹 연동 자동 더킹.

---

### 4. 린트 및 런타임 오류 전수 해결 (`hyperframes check`)
1. **타임라인 레지스트리 누락 해결**:
   - `index.html`에 `window.__timelines["main"] = tl; tl.seek(0);` 등록 스크립트 추가.
2. **비트랜스폼 모션 린트 해결**:
   - Frame 2 워드마크 top 애니메이션을 `y: -340` 트랜스폼 모션으로 전면 전환.
3. **FromTo 베이스라인 린트 해결**:
   - Frame 10, 11 퀴즈 게이지 및 정답 도장 모션에서 `tl.set(..., 0)` 베이스라인 등록 및 `immediateRender: false` 적용.
4. **스튜디오 편집용 클립 ID 누락 12건 해결**:
   - 12개 프레임의 `<div class="clip" data-track-index="1">` 요소에 고유 `id="f01-content"` ~ `id="f15-content"` 부여.
5. **폰트 404 런타임 에러 해결**:
   - Google Fonts CDN에서 404를 반환하던 구버전 Gaegu URL(`v20/TuGOUVJyZE253fE-SDk7.ttf`)을 유효한 최신 엔드포인트(`v23/TuGSUVB6Up9NU573jvw7.ttf`)로 13개 프레임 일괄 교체.
6. **교차 씬 레이아웃 오버랩 7건 해결**:
   - `index.html`에 `#root` 및 `.scene { position: absolute; inset: 0; width: 100%; height: 100%; }` 스타일 추가.
   - Frame 8 끝단(34.3s)에 `#f08-content` 페이드아웃 트윈을 명시적으로 추가하여 Frame 9 시작 시점과의 레이아웃 중첩 100% 제거.
7. **검증 결과**:
   - `npx hyperframes check --timeout=35000` (및 `npm run check`): **0 errors, 0 warnings (Check passed)** 달성!
