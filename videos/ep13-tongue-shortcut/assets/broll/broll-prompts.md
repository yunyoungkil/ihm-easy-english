# Frame 5 B롤 프롬프트 — 입술 press-and-pop (B 소리, 얼굴 비노출)

Frame 5(원리 설명, 클라이맥스)의 "제 입모양 한번 잘 보세요" 지점(약 26.0–33.0s)에 쓸 B롤.
얼굴 전체 대신 **코 아래~쇄골까지만** 프레이밍해서 "페이스리스" 원칙을 지킨다.

프롬프트 구조는 `knowledge/google-ai-studio-prompting.md` §1(Veo 프롬프트 구조)을 따름 —
Subject/Action/Camera/Composition/Ambiance를 서술문으로 조합, 무음이 필요하면 명시,
duration은 1080p 출력을 위해 **8초 고정**.

## 🇰🇷 한글 요약 — 이 영상이 뭘 담아야 하는지

- **뭘 찍나**: 사람 입 근처만 아주 가깝게 클로즈업. **눈·이마·얼굴 전체는 절대 안 나옴** —
  코 아래부터 목까지만. 이 채널은 원래 얼굴을 화면에 안 보여주는 방식이라 일부러 이렇게 자름.
- **뭘 하나**: 입술을 꾹 붙였다가, 잠깐 멈췄다가, 갑자기 "팍" 하고 터지듯 벌어지는 동작 —
  영어 B 소리(bag의 B) 낼 때 입 모양. 이 동작을 3번 반복(편집할 때 제일 자연스러운 걸 골라
  쓰기 위해).
- **배경**: 채널 기본색인 어두운 남색(#0A1526), 옆에서 은은한 조명 하나만.
- **소리**: **꼭 무음으로 요청할 것.** Veo(구글 영상 생성 모델)는 시키지 않아도 자기 마음대로
  소리(대사·효과음)를 넣는 경우가 있어서, "Silent(무음)"이라고 쓰는 것만으론 부족했다 — 1차
  시도에서 모델이 입모양을 보고 "이 사람이 뭔가 말하고 있다"고 착각해서 "Bill(빌)"처럼 들리는
  소리를 임의로 붙여버렸다(원래 의도는 "브" 소리를 낼 때의 순수한 입 동작이지, 어떤 단어를
  말하는 게 아님). 그래서 "이건 어떤 단어도 말하는 게 아니다, 순수한 근육 동작일 뿐이다"까지
  명시적으로 못 박아야 함 — 아래 프롬프트에 반영됨.
- **길이**: 8초로 고정(6~8초 중 아무거나가 아니라 8초 — 1080p 화질로 뽑으려면 8초가 필요하다고
  구글 문서에 나와 있음).
- **주의할 점**: "입술을 붙였다 뗀다" 정도로 약하게 쓰면 모델이 일상 대화 수준의 아주 작은
  움직임으로 그려버릴 수 있음. 그래서 "firmly(꽉)", "suddenly(갑자기)", "crisp(또렷하게)" 같은
  센 단어를 일부러 넣었음 — 결과물이 흐리멍덩하게 나오면 이 단어들을 더 세게 유지한 채 다시
  시도할 것(아래 "참고" 항목 참고).

## A(애) 턱 벌어짐 — 신규 생성 불필요

EP12의 `videos/ep12-want-wont/assets/broll/want-jaw-drop.mp4`를 그대로 재사용한다 — "턱을
하품 직전처럼 크게 벌리는" 동작이 이 편의 A(애) 모음 설명과 시각적으로 동일하다. 비용 없음.

## B(입술 붙였다 떼는 소리) — 신규 생성 필요

Google Flow(Veo)든 다른 도구든, 아래 텍스트를 그대로 붙여넣으면 된다.

```
Extreme close-up shot of a person's mouth, jaw, and chin only — framed from just below the
nose to the collarbone, no eyes or upper face visible. Dark navy studio background (#0A1526),
soft single-source rim light from the side, minimal and clean, no distracting props.

The lips press firmly together, hold for a beat, then pop open suddenly and cleanly — a crisp
bilabial plosive shape (as in the "b" in "bag"), not a slow parting. The jaw stays mostly still;
only the lips move. Hold the closed-lips position clearly before the pop. Repeat this same
press-and-pop motion 3 times in a row, evenly spaced, so there are multiple usable repetitions
to cut from.

IMPORTANT: the person is NOT saying any word and is NOT talking. This is a single isolated
physical mouth movement, not speech, not a syllable, not the word "bill" or any other word — do
not add lip-sync, mouthing, or any implied speech sound to this motion. Treat it purely as a
mechanical press-and-release of the lips, like a silent demonstration gesture, completely
disconnected from any spoken language.

Neutral skin tone, no visible facial hair pattern that would identify a specific person, plain
soft lighting, shallow depth of field with the mouth in sharp focus. No text, no captions, no
logos, no watermark. Slow, calm, instructional pacing between reps, but each POP itself must be
sharp and clean. Completely silent: no dialogue, no spoken words, no lip-synced audio, no sound
effects, no ambient noise, no music — mute video, as if the audio track does not exist.

Duration: 8 seconds, static camera, no camera movement, 16:9 aspect ratio.
```

## 저장 위치

완성된 클립을 여기 저장해줘:
- `videos/ep13-tongue-shortcut/assets/broll/b-pop.mp4`

넣어주면 Frame 5 컴포지션의 `f05-broll-box` 자리에 배치하겠다(현재는 텍스트 placeholder).
HyperFrames는 `muted` 비디오로 넣고 나레이션은 별도 오디오 트랙으로 얹는 구조라, 클립 자체에
소리가 있어도 없어도 상관없다(위 프롬프트는 어차피 무음으로 요청함).

## 참고 — 클로즈업 재현이 안 될 때

EP12 1차 시도에서 "wide" 처럼 약한 단어만 쓰면 모델이 일상 대화 수준의 작은 움직임으로
해석해버린 전례가 있다(`videos/ep12-want-wont/assets/broll/broll-prompts.md` 참고). 결과물을
ffmpeg로 프레임 추출해 확인했을 때 press-and-pop이 약하게 나오면, "firmly", "sudden",
"crisp" 같은 강한 형용사를 유지한 채 구체적 비교 대상(예: "a clean, audible-looking pop like
a cork leaving a bottle")을 추가해서 재시도할 것.

## 시도 기록

### 1차 시도 (2026-09-05) — "빌(Bill)"이라고 말하는 것처럼 나옴

사용자가 최초 버전 프롬프트로 생성 → 영상 속 입모양이 "브" 소리가 아니라 "빌(Bill)"이라고
말하는 것처럼 나왔다는 피드백. 원인: 프롬프트가 "Silent (no dialogue, no sound needed)"라고만
썼는데, 이건 **소리를 넣지 말라**는 뜻이지 **입모양이 어떤 단어처럼 보이면 안 된다**는 뜻까지
전달하지 못했다. Veo는 입 움직임을 보고 뭔가 말하는 것으로 스스로 해석해서 그럴듯한 소리/입모양을
지어낸 것으로 보인다.

→ 위 프롬프트에 "the person is NOT saying any word... not the word 'bill' or any other
word... treat it purely as a mechanical press-and-release" 문단을 추가하고, 마지막 무음 지시도
"no lip-synced audio... mute video, as if the audio track does not exist"로 강화. 이 채널의
다른 프롬프트(narration-lint의 "TION 단독은 빌밀로 깨짐" 사례)와 같은 종류의 교훈 —
**모호하면 모델이 알아서 그럴듯한 걸 지어내니, "이게 아니다"까지 명시적으로 못 박아야 한다.**
