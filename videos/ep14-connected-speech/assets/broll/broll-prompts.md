# Frame 5 B롤 프롬프트 — 실제로 "an apple"을 자연스럽게 발음하는 입모양 (얼굴 비노출)

Frame 5(원리 설명)의 슬라이드 클라이맥스 지점(약 32~38초, "그 N이 APPLE 앞으로 넘어가서")에 쓸
B롤. EP12/EP13과 동일하게 **코 아래~쇄골까지만** 프레이밍해서 "페이스리스" 원칙을 지킨다.

프롬프트 구조는 `knowledge/google-ai-studio-prompting.md` §1(Veo 프롬프트 구조)을 따름 —
Subject/Action/Camera/Composition/Ambiance를 서술문으로 조합, duration은 1080p 출력을 위해
**8초 고정**. 프레이밍·배경·조명 스펙은 EP13
`videos/ep13-tongue-shortcut/assets/broll/broll-prompts.md`의 검증된 패턴을 재사용하지만,
**"말하는 것처럼 보이면 안 된다"는 EP13의 핵심 제약은 이번엔 의도적으로 빼고 정반대로
적용했다** — 아래 "뭘 하나" 참고.

## 🇰🇷 한글 요약 — 이 영상이 뭘 담아야 하는지

- **뭘 찍나**: EP13과 동일한 클로즈업 프레이밍(코 아래~목까지만, 눈·이마 안 나옴).
- **뭘 하나**: **2026-09-08 방향 전환** — 처음엔 EP13(특정 단어처럼 보이면 안 되는 "B 소리"
  단발 동작)을 그대로 따라 "이건 어떤 단어도 말하는 게 아니다"라고 못 박는 추상적 근육 동작으로
  설계했었는데, 사용자 질문("입모양이 내플을 발음해야하냐고")을 계기로 다시 생각해보니 방향이
  틀렸었다. **EP13은 특정 단어와 무관한 "B 소리" 하나가 필요해서 단어 연상을 일부러 차단했지만,
  이 프레임은 정확히 "AN APPLE"이라는 그 단어 쌍 자체를 가르치는 프레임**이라 오히려 실제로
  "an apple"을 자연스럽게(N이 apple로 이어지며 "내플"처럼 들리는 속도로) 발음하는 입모양을
  그대로 보여주는 게 더 맞다 — 그래야 "원어민이 편하게 말할 때 입이 실제로 이렇게 움직인다"는
  걸 직접 증명하는 자료가 된다. 이 동작을 3번 반복(편집 시 제일 자연스러운 걸 골라 쓰기 위해).
- **배경**: 채널 기본색인 어두운 남색(#0A1526), 옆에서 은은한 조명 하나만(EP13과 동일).
- **소리**: 실제로 말하는 입모양이라 소리가 같이 생성될 수 있지만, 상관없다 — HyperFrames에는
  `muted` 비디오로 넣고 나레이션은 별도 오디오 트랙으로 얹으므로 최종 결과물엔 어차피 이
  클립의 소리가 안 들린다(EP13처럼 "말하는 것처럼 보이면 안 된다"고 막을 필요 자체가 없었음 —
  그건 이번 목적엔 안 맞는 제약이었다). 그래도 생성 품질을 위해 "silent/무음으로"라고는 요청.
- **길이**: 8초 고정.
- **주의할 점**: "자연스러운 속도로(natural, comfortable conversational pace)"를 명시할 것 —
  너무 또박또박 끊어 말하면 N이 APPLE로 안 이어지고 "앤. 애플."처럼 따로 들리는(보이는) 입모양이
  나온다. 이 프레임이 보여주려는 게 바로 그 "이어짐"이므로, 편하고 빠른 일상 대화 속도를
  강조해야 한다.

## "an apple" 자연스러운 발화 — 신규 생성 필요

Google Flow(Veo)든 다른 도구든, 아래 텍스트를 그대로 붙여넣으면 된다.

```
Extreme close-up shot of a person's mouth, jaw, and chin only — framed from just below the
nose to the collarbone, no eyes or upper face visible. Dark navy studio background (#0A1526),
soft single-source rim light from the side, minimal and clean, no distracting props.

The person naturally and silently mouths the English phrase "an apple" at a relaxed,
comfortable conversational pace — the way it's actually said in casual fluent speech, where
the "n" at the end of "an" flows directly into the "a" of "apple" with no gap or hard stop
between the two words (do NOT pronounce it as two separate, crisply separated words like
"an. Apple." — it must sound and look connected, like "a-napple"). The mouth shape naturally
starts with the tongue tip touching lightly behind the upper front teeth for the "n", then
glides smoothly and without pausing into an open, unrounded /æ/ vowel shape (as in "apple",
"cat", "bag") — jaw dropped a moderate amount, lips held wide rather than rounded, not a wide
"ah" and not a rounded "oh" — then closes naturally through the rest of "apple". Repeat this
same natural, connected phrase 3 times in a row, evenly spaced, at a consistent comfortable
pace, so there are multiple usable repetitions to cut from.

Neutral skin tone, no visible facial hair pattern that would identify a specific person, plain
soft lighting, shallow depth of field with the mouth in sharp focus. No text, no captions, no
logos, no watermark. Natural, comfortable articulation — not exaggerated, not slowed down for
clarity, just how someone would actually say it in relaxed conversation. Silent delivery
preferred (no audible dialogue needed), but natural mouth movement for the phrase is the
priority over enforcing silence.

Duration: 8 seconds, static camera, no camera movement, 16:9 aspect ratio.
```

## 저장 위치 및 진행 상태 (2026-09-08 완료)

- `videos/ep14-connected-speech/assets/broll/an-apple-natural.mp4` — 사용자가 생성해 저장 완료.
- **워터마크 제거 완료**: 원본에 우측 하단 고정 위치(x:1704-1775, y:864-935)에 회색 별 모양
  워터마크가 찍혀 있어서, 전체 구간에 턱선이 그 영역을 침범하지 않는지 확인한 뒤 ffmpeg
  `drawbox`(배경색 페인트오버) + `gblur`(경계 자연스럽게 녹이기)로 제거함. 상세 절차는
  `knowledge/production-rules.md`의 "미디어·음성·자막" 절 "AI 생성 B롤에 워터마크가 찍혀
  나올 수 있다" 항목 참고.
- **Frame 5에 통합 완료**: `compositions/frames/05-mechanism.html`의 Beat 3(N이 APPLE로
  이동)와 같은 타이밍인 34.9초("내플" 병합 라벨이 뜨는 순간)에 26cqw×26cqh 인셋 카드로 배치.
  기존 다이어그램 애니메이션을 대체하지 않고 보강하는 크기로 골랐다(전체 화면을 덮는 EP13
  Frame 5 방식과 다름 — 이 프레임은 자체 다이어그램 애니메이션이 핵심 페이로드라 대체하지
  않음).

## 참고 — 재현이 안 될 때

결과물을 ffmpeg로 프레임 추출해 확인했을 때: (1) "an"과 "apple" 사이가 뚝 끊겨서 따로따로
말하는 것처럼 보이면 — 이 프레임이 보여주려는 핵심(끊김 없이 이어짐)이 안 지켜진 것이므로
"no gap or hard stop between the two words"·"connected, like 'a-napple'" 표현을 더 강하게
반복하거나 "spoken quickly and casually, never enunciated word-by-word" 같은 문장을 추가해서
재시도. (2) 도착한 모음이 "애"가 아니라 더 둥글게 크게 벌어진 "아"나 입술이 오므라든 "오"로
보이면 — "unrounded"·"lips held wide, not rounded" 표현을 더 강하게 반복. (3) 동작이 과장되게
느리거나 교육용처럼 또박또박 나오면 — "natural, comfortable, not exaggerated, not slowed down"
표현을 강조해서 재시도(이 B롤은 정확한 발음 교재용 클로즈업이 아니라 "실제로 편하게 말할 때
이렇게 이어진다"는 걸 보여주는 게 목적).
