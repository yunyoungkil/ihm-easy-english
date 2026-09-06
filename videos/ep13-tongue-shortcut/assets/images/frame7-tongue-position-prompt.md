# Frame 7 실사 이미지 프롬프트 — 혀 위치 측면 사진 (C 크/스 예외 설명)

Frame 7(반전 꿀팁)의 "아니요, 여기도 똑같이 힘 빼는 원리가 통합니다. C 바로 뒤에 E나 I처럼
입 앞쪽에서 나는 소리가 오면, 혀가 굳이 목 안쪽까지 가서 '크' 소리를 낼 필요가 없어져요" 구간
(현재 `f07-diagram-zone`, SVG로 그린 추상적 입 단면도 + 좌우로 움직이는 점)을 대체할 실사
측면 사진. **두 장**이 필요하다 — "크"(혀가 목 안쪽) 상태 하나, "스"(혀가 입 앞쪽) 상태 하나.

프롬프트 구조는 `knowledge/google-ai-studio-prompting.md` §2(Imagen/Gemini 이미지 프롬프트
구조)를 따름.

## 🇰🇷 한글 요약 — 이 사진들이 뭘 담아야 하는지

- **뭘 찍나**: 사람 옆모습, **입을 벌린 상태에서 혀 위치가 보이는 클로즈업**. 채널의 페이스리스
  원칙(`assets/broll/broll-prompts.md`와 동일)에 따라 **눈·이마는 안 나옴** — 코 아래부터
  턱·목까지만. 정면이 아니라 **측면(옆모습)**인 이유는, "혀가 목 안쪽에 있는지 입 앞쪽에 있는지"
  차이는 옆에서 봐야 보이기 때문(정면에서는 입 벌린 것만 보이고 혀의 앞뒤 위치는 잘 안 보임).
- **두 장의 차이**:
  1. **"크" 사진**: 입을 살짝 벌리고, 혀는 뒤로 당겨져서 목 쪽(입 안쪽 깊숙이)에 위치. 실제
     발음 교육 자료·언어치료 참고 사진처럼, 혀 뒷부분이 목젖 가까이 올라간 게 옆에서 보이는 구도.
  2. **"스" 사진**: 입을 살짝 벌리고, 혀는 앞으로 나와서 앞니 바로 뒤(입 앞쪽)에 위치. 혀끝이
     앞니에 거의 닿을 듯한 구도.
  두 사진 모두 **같은 인물, 같은 조명, 같은 카메라 각도**로 통일해야 나란히 비교했을 때
  "혀 위치만 다르다"는 게 명확하게 보인다.
- **배경**: 채널 기본색인 어두운 남색(#0A1526) 계열, 옆에서 은은한 조명 하나만 — 다른 이미지
  프롬프트(`frame11-market-shelf-prompt.md`)와 톤을 맞춤.
- **왜 실사여야 하나**: 지금 SVG 도형(타원 + 점)은 너무 추상적이라 "진짜 혀가 이렇게 움직이는
  구나"라는 실감이 안 남. 이미 Frame 5에서 실사 입모양 B롤(`assets/broll/b-pop.mp4`)로 효과를
  봤으니, 같은 원리를 여기도 적용.
- **주의할 점**: 입을 벌리고 혀 위치를 보여주는 사진은 AI 이미지 생성 모델이 해부학적으로
  부자연스럽게 그리기 쉬운 소재다(치아 개수가 이상하거나 혀 모양이 왜곡되는 등). 그래서 "언어
  치료/발음 교육용 참고 사진" 같은 실제로 존재하는 사진 장르를 명시해서, 모델이 그 장르의 실제
  사진들을 참고하도록 유도했다(아래 프롬프트의 "phonetics education reference photograph"
  문구가 그 역할).

## 프롬프트 1 — "크" (혀가 목 안쪽, back of mouth)

```
A photorealistic side-profile close-up photograph, in the style of a phonetics or speech-therapy
education reference photo, showing a person's mouth, jaw, and lower face only — framed from just
below the nose to the upper neck, with NO eyes, eyebrows, or forehead visible in the frame.

The mouth is gently open. The tongue is pulled back and raised toward the rear of the mouth,
close to the soft palate and throat area, clearly visible from this side angle as sitting deep
and back inside the mouth — demonstrating the tongue position for a "back" consonant sound (like
the hard "k" in "cat"). The jaw is relaxed, not strained or wide open, just enough opening to
reveal the tongue's back position.

Dark navy studio background (#0A1526), soft single-source rim light from the side, clean and
minimal, no distracting props, neutral skin tone, no visible facial hair pattern that would
identify a specific person. Shallow depth of field with the mouth and tongue in sharp focus. No
text, no captions, no logos, no watermark. Calm, clinical, educational lighting — not dramatic or
moody. 16:9 aspect ratio, landscape, static single photograph (not a video frame).
```

## 프롬프트 2 — "스" (혀가 입 앞쪽, front of mouth)

```
A photorealistic side-profile close-up photograph, in the style of a phonetics or speech-therapy
education reference photo, showing the SAME person's mouth, jaw, and lower face only, from the
exact same camera angle, lighting, and framing as a matching reference photo — from just below
the nose to the upper neck, with NO eyes, eyebrows, or forehead visible in the frame.

The mouth is gently open, same amount as the reference photo. The tongue is pushed forward, with
the tip resting just behind the upper front teeth, clearly visible from this side angle as
sitting close to the front of the mouth — demonstrating the tongue position for a "front"
consonant sound (like the soft "s" in "city"). The jaw is relaxed, not strained.

Dark navy studio background (#0A1526), soft single-source rim light from the side, clean and
minimal, no distracting props, neutral skin tone, no visible facial hair pattern that would
identify a specific person. Shallow depth of field with the mouth and tongue in sharp focus. No
text, no captions, no logos, no watermark. Calm, clinical, educational lighting — not dramatic or
moody. 16:9 aspect ratio, landscape, static single photograph (not a video frame).
```

**두 장을 만들 때**: 가능하면 같은 도구·같은 세션에서 "이전 사진과 동일 인물·구도·조명, 혀
위치만 다르게"처럼 이어서 생성하면 두 장이 더 일관되게 나온다(이미지 생성 도구가 참조 이미지
입력을 지원하면 1번 결과를 2번 생성 시 참조로 넣는 것도 방법).

## 저장 위치

완성된 두 장을 여기 저장해줘:
- `videos/ep13-tongue-shortcut/assets/images/tongue-back-k.jpg` (또는 `.png`) — "크" 상태
- `videos/ep13-tongue-shortcut/assets/images/tongue-front-s.jpg` (또는 `.png`) — "스" 상태

넣어주면 `07-exception.html`의 `f07-diagram-zone`(현재 SVG 타원+점 다이어그램) 자리를 이 두
사진으로 교체하겠다 — 타이밍(`tongueDot`이 `cx: 300 → 100`, 색이 노랑→빨강으로 바뀌던 구간,
SCENE3+2.0부터 1.6초)은 그대로 유지하고, 점 이동 대신 두 사진 사이 크로스페이드로 바꿀 예정.

## 시도 기록

(아직 생성 전 — 결과 받으면 여기에 기록)
