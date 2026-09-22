# Frame 4(04-lazy-tongue-rule) 이미지 제작 프롬프트 — Google Flow용

2026-09-22 작성. 기존 Frame 4는 좌우 두 카드(왼쪽 "나쁜 방법"은 이미지 없이 이모지 👅💦
하나뿐, 오른쪽 "좋은 방법"은 채널 캐릭터와 전혀 다른 사람 사진 + 관련 없는 대머리 옆얼굴
그림을 280x220px 고정 박스에 가두고 `display:none/block`으로 뚝 끊어 전환)였다. Frame 2·3과
같은 원칙(이미지 화면 점유율 40%+, 텍스트는 코드 전용, 크로스페이드 전환)으로 두 카드를
하나의 큰 장면으로 합친다 — Frame 2에서 이미 만든 "턱 통증" 리액션을 그대로 재사용해 복습한
뒤, 같은 캐릭터의 새로운 "힘 빼고 편안해진" 포즈로 넘어가는 하나의 연속된 장면.

## ⚠️ 일관성을 위해 반드시 지킬 것

- **Flow의 "Ingredients"(참고 이미지 업로드) 기능에 아래 모든 프롬프트에 동일한 기준
  이미지 1장을 넣을 것** — `assets/images/f01_react_00_neutral.jpg`(Frame 1·2에서 이미
  일관성 검증을 통과한 채널 캐릭터 기준 이미지)를 그대로 쓴다.
- 이 프레임은 Frame 2의 "노래 따라 부르다 혀가 굳는" 장면 바로 다음 반전이므로, **헤드폰을
  쓰고 있는 것도 Frame 2와 동일하게 유지**한다(같은 상황의 연속이라는 시각적 신호).
- 전부 **한 세션(같은 대화창) 안에서 연달아** 생성할 것.
- 다 받으면 **Frame 2의 기존 6장과 나란히 놓고 모자 로고·후드티 패치·얼굴형·헤드폰이 실제로
  같은지 먼저 눈으로 대조**한 뒤에 코드에 넣을 것 — 하나라도 다르면 그 장만 다시 뽑는다.

## 공통 캐릭터 묘사 (매 프롬프트에 그대로 포함할 것)

`prompts/frame02-image-prompts.md`의 "공통 캐릭터 묘사" 문단과 **완전히 동일한 텍스트**를
그대로 복사해서 쓴다(모자 로고·후드티 패치·헤드폰·HAIR·FACIAL HAIR·프레이밍·NEGATIVE 전부
포함) — 새로 쓰지 않는 이유는 이미 검증된 문구를 그대로 재사용해야 Frame 2와 동일 인물로
나오기 때문이다.

## 왜 4장인가

38.2초짜리 프레임에 복습 이미지 1장 + 신규 2장만 쓰면, 가장 긴 설명 구간(cap4, 18.5~30.5초
약 12초)이 이미지 전환 없이 통째로 멈춰 있게 된다. 5개 캡션 구간마다 화면에 변화가 있도록
신규 이미지를 2장 → 4장으로 늘린다: 전환(release) → 해결(resolved) → 유지(hold) →
마무리(confirm), 총 4단계로 표정·손짓을 조금씩 다르게 진행시켜 12초 구간에도 중간에 한 번
더 전환이 들어가게 한다.

## Step A — 힘이 쭉 빠지며 편안해지는 순간 (전환)

```
The strained, painful expression is melting away into relief — eyes slowly closing, eyebrows
softening and lifting from the tense knit-together shape into a relaxed neutral shape, mouth
easing from a tight grimace into a loose, slightly open, relaxed shape as if quietly exhaling
"aah". One hand that was clutching the jaw is now gently resting near the throat/neck instead
of gripping — no more pain, just release. Soft, calm energy, like tension draining out of the
whole face and shoulders in real time.
```

## Step B — 힘 빼고 목구멍으로 게으르게 울리는 순간 (해결)

```
Fully relaxed and at ease — eyes gently closed or half-lidded with a calm, satisfied
expression, head tilted very slightly back and to the side in a loose, unforced way, mouth
softly open in a small relaxed "eu~" shape (not wide, not straining, just loosely parted).
One hand resting lightly near the ear or throat as if quietly feeling the sound resonate,
fingers loose and relaxed, not gripping anything. Shoulders dropped and loose. A very subtle,
knowing half-smile — the quiet confidence of "oh, that's it, that's all it takes" rather than
big excitement. Calm, unforced, effortless energy — the opposite of the earlier strained
expression.
```

## Step C — 그 편안한 자세를 그대로 유지한 채 여유 있게 버티는 순간

```
Holding the same relaxed position steady, but now eyes gently open and looking toward the
camera with quiet, unhurried confidence — not wide-eyed excitement, just calm assurance. A
small, easy smile, corner of the mouth lifting slightly. The hand that was near the throat now
opens into a loose, relaxed open-palm gesture near the chest, as if casually saying "see, it's
just this." Head and shoulders stay loose and settled, no new tension. This should read as a
continuation of the same calm moment, one beat further, not a new emotion.
```

## Step D — 힘들이지 않고도 소리가 난다는 걸 확인하는 마무리 순간

```
A warm, settled, closing expression — eyes open, calm and steady, looking directly ahead with
quiet satisfaction. A genuine small smile, relaxed rather than excited (save big celebration
energy for a later scene). Shoulders and hands fully at ease, one hand resting loosely near the
chest or lowered. This is the quiet "yeah, that's really all it takes" moment — confident,
unforced, and calm, closing out the relaxed sequence.
```

## 완료 후

- `f04_relax_a_release.jpg` ← Step A — ✅ 완료 (스마트폰이 손에 함께 나옴 — 스토리와 무관한
  내용이라 사용자 판단으로 그대로 채택)
- `f04_relax_b_resolved.jpg` ← Step B — ✅ 완료 (깨끗함)
- `f04_relax_c_hold.jpg` ← Step C — ✅ 완료 (스마트폰이 손에 함께 나옴 — 위와 동일하게 채택)
- `f04_relax_d_confirm.jpg` ← Step D — ✅ 완료 (깨끗함)

4장 전부 확보 완료. 캐릭터 정체성(모자 로고·후드티 패치·수염·헤드폰)은 4장 모두 일관됨.

Frame 4 코드에서는 이 4장 앞에 Frame 2에서 이미 만든 `f02_react_04_jaw_pain.jpg`(턱 통증
리액션, 복습용)를 재사용해 "힘든 방법 복습 → 힘 빠짐 → 해결 → 유지 → 마무리 확인" 5단계로
하나의 hero-stage 안에서 크로스페이드 전환한다(캡션 5개 구간에 각각 하나씩 대응). 기존
`f04_lazy_sofa.jpg`/`f04_tongue_relax.jpg`(전혀 다른 사람·관련 없는 그림)는 폐기.
