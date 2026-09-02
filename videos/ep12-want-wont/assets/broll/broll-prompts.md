# Frame 3 B롤 프롬프트 — 입/턱 클로즈업 (얼굴 비노출)

Frame 3(메커니즘, 클라이맥스)에 쓸 B롤. 얼굴 전체 대신 **코 아래~쇄골까지만** 프레이밍해서
"페이스리스" 원칙을 지킨다 — 눈·이마는 화면에 안 나온다.

두 클립을 따로 만든다(편집 시 나레이션 타이밍에 맞춰 각각 배치). Google Flow(Veo)든 다른 도구든,
아래 텍스트를 그대로 붙여넣으면 된다.

## 클립 1 — WANT (턱을 크게 벌리는 "아" 소리) — 2차 수정본(2026-09-03)

**1차 결과물이 약했다** — 실제 프레임을 뽑아 확인해보니 입이 살짝만 벌어져서 Won't 클립이랑
대비가 안 됨. "wide" 한 단어로는 모델이 자연스러운 대화 수준의 작은 움직임으로 해석하는 것 같다
— 아래는 구체적 비교 대상(하품 직전 단계)과 명시적 각도·수치를 넣어서 강제한 버전.

```
Extreme close-up shot of a person's mouth, jaw, and chin only — framed from just below the
nose to the collarbone, no eyes or upper face visible. Dark navy studio background (#0A1526),
soft single-source rim light from the side, minimal and clean, no distracting props.

The jaw drops DRAMATICALLY and slowly straight down — like the first half of a yawn, NOT a
normal speaking mouth-open. The mouth should open to roughly the height of two stacked fingers
(a large, obvious, exaggerated gap between the upper and lower teeth), clearly more open than
anyone would open their mouth in ordinary conversation. This is a teaching demonstration of an
open "ah" vowel shape, so the exaggeration is intentional and correct — do not soften it into
a subtle, natural, or restrained mouth movement. Hold the fully-open position for a clear beat
(about 1 second) before closing. Repeat this same slow, deliberate, exaggerated jaw-drop motion
3 times in a row, evenly spaced, so there are multiple usable repetitions to cut from — each
repetition must reach the same dramatically wide opening, not a smaller version.

Neutral skin tone, no visible facial hair pattern that would identify a specific person, plain
soft lighting, shallow depth of field with the mouth in sharp focus. No text, no captions, no
logos, no watermark. Slow and deliberate pacing (this is instructional, not comedic), but the
JAW OPENING ITSELF must be large and unmistakable — this is the one part of the shot that
should NOT be restrained. Silent (no dialogue, no sound needed — this is narration-under B-roll).

Duration: 6-8 seconds, static camera, no camera movement.
```

### 참고용 실측 문제 (1차 결과물)

`want-jaw-drop.mp4`를 ffmpeg로 프레임 추출해서 확인한 결과, 대화 수준의 아주 작은 벌어짐만
나왔다(치아가 살짝 보이는 정도) — `wont-lip-round.mp4`의 뚜렷한 입술 오므림과 나란히 놓으면
대비가 거의 안 보인다. 재생성 후에도 이 방식(ffmpeg 프레임 추출 → Read로 확인)으로 다시
검증할 것.

## 클립 2 — WON'T (입술을 오므리는 "오" 소리)

```
Extreme close-up shot of a person's mouth, jaw, and chin only — framed from just below the
nose to the collarbone, no eyes or upper face visible. Dark navy studio background (#0A1526),
soft single-source rim light from the side, minimal and clean, no distracting props.

The lips purse and round forward slowly into a small tight "oh" shape (as in pronouncing the
English word "won't"), the jaw staying mostly closed and still — a clear visual contrast to a
wide-open jaw drop. Hold for a beat, then relax. Repeat this same slow, deliberate lip-rounding
motion 3 times in a row, evenly spaced, so there are multiple usable repetitions to cut from.

Neutral skin tone, no visible facial hair pattern that would identify a specific person, plain
soft lighting, shallow depth of field with the mouth in sharp focus. No text, no captions, no
logos, no watermark. Slow, calm, instructional pacing — not exaggerated or comedic. Silent
(no dialogue, no sound needed — this is narration-under B-roll).

Duration: 6-8 seconds, static camera, no camera movement.
```

## 저장 위치

완성된 클립을 여기 저장해줘:
- `videos/ep12-want-wont/assets/broll/want-jaw-drop.mp4`
- `videos/ep12-want-wont/assets/broll/wont-lip-round.mp4`

넣어주면 Frame 3 컴포지션에 배치하겠다 — HyperFrames는 `muted` 비디오로 넣고 나레이션은 별도
오디오 트랙으로 얹는 구조라, 클립 자체에 소리가 있어도 없어도 상관없다(위 프롬프트는 어차피
무음으로 요청함).

## 참고 — 왜 두 개를 따로 만드나

Frame 3 스토리보드가 이미 Scene 1(0-7s, Want)·Scene 2(7-14s, Won't)로 나뉘어 있어서, 클립을
합쳐서 하나로 만들면 오히려 나레이션 타이밍에 정확히 맞추기 어렵다. 각 클립 안에 동작을 3번
반복해두면, 실제 붙일 때 가장 자연스러운 한 번을 골라 쓸 수 있어서 여유가 생긴다.
