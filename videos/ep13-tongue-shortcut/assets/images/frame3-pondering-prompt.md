# Frame 3 실사 이미지 프롬프트 — 고민하는 손동작 (클로징 질문)

Frame 3(질문 던지기)의 클로징 대사 "그럼 결국 이 많은 경우의 수, 우리가 하나하나 다 외워야만
읽을 수 있는 걸까요?" 구간(`f03-closing`)에 쓸 실사 이미지. 지금은 텍스트만 뜨는데, 시청자가
느낄 "그럼 다 외워야 하나..." 하는 막막함/고민을 실사 이미지로 같이 보여주면 더 와닿는다는
사용자 요청.

프롬프트 구조는 `knowledge/google-ai-studio-prompting.md` §2(Imagen/Gemini 이미지 프롬프트
구조)를 따름.

## 🇰🇷 한글 요약 — 이 사진이 뭘 담아야 하는지

- **뭘 찍나**: "고민하는" 손동작 클로즈업. 채널의 페이스리스 원칙(`assets/broll/broll-prompts.md`,
  `assets/images/frame7-tongue-position-prompt.md`와 동일)에 따라 **눈은 안 나옴** — 다만 이번엔
  "생각하는 느낌"이 핵심이라 완전히 입 아래로만 자르면 표정이 안 살아서, **턱을 살짝 만지거나
  괴는 손 + 입가까지만** 나오게 프레이밍한다(눈썹 아랫선까지, 눈 자체는 프레임 밖).
- **동작**: 로댕의 "생각하는 사람"처럼 주먹 쥔 손등이나 손가락이 턱/입가에 살짝 닿아 있고,
  입술은 살짝 다물려 있거나 힘이 들어간 "음... 그런가?" 하는 느낌. 과장된 표정 아니고 담백하게.
- **배경**: 채널 기본색인 어두운 남색(#0A1526), 옆에서 은은한 조명 하나만 — 다른 이미지들과 톤
  통일.
- **왜 이 구도인가**: 완전히 얼굴을 감추면서도 "고민한다"는 감정을 전달하려면 눈보다 손+입가
  제스처가 더 안전하고 확실한 신호다(눈이 없으면 밋밋해지는 다른 감정과 달리, "턱 괴기"는 세계
  공통으로 통하는 고민의 제스처라 눈 없이도 바로 읽힌다).

## 프롬프트

```
A photorealistic close-up photograph of a person's lower face and one hand only — framed from
just below the eyebrows down to the neck and upper chest, with eyes, eyebrows, and forehead
completely outside the frame (not visible at all).

The hand is raised near the face in a classic thinking/pondering gesture — knuckles or a curled
index finger resting lightly against the chin or lower lip, as in Rodin's "The Thinker." The
lips are gently pressed together or slightly parted, a quiet, neutral "hmm, is that really true?"
expression conveyed purely through the mouth and jaw tension, not exaggerated or comedic.

Dark navy studio background (#0A1526), soft single-source rim light from the side, clean and
minimal, no distracting props. Neutral skin tone, no visible facial hair pattern or accessory
that would identify a specific person. Shallow depth of field, mouth and hand in sharp focus. No
text, no captions, no logos, no watermark. Calm, contemplative, quiet mood — not stressed or
frustrated, just genuinely thinking something over. 16:9 aspect ratio, landscape, static single
photograph (not a video frame).
```

## 저장 위치

완성된 이미지를 여기 저장해줘:
- `videos/ep13-tongue-shortcut/assets/images/pondering-hand.jpg` (또는 `.png`)

넣어주면 `03-question.html`의 `f03-closing` 텍스트 옆(또는 배경)에 배치하겠다 — 텍스트가
가려지지 않는 자리(예: 화면 하단 한쪽 구석, 또는 어두운 톤으로 살짝 오버레이한 배경)로 넣을
예정, 최종 배치는 실제 이미지 받은 뒤 텍스트 가독성 보고 정할 것.

## 시도 기록

(아직 생성 전 — 결과 받으면 여기에 기록)
