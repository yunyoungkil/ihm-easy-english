# 쇼츠 썸네일 프롬프트 — ep27-shorts-dogs-cats

쇼츠는 썸네일 A/B 테스트가 되지 않으므로 1장만 만든다. 크기·자리·그림체 규칙은 `videos/ep24-shorts-sheep-ship/prompts/thumbnail-prompts.md`와 같다(9:16, 글자와 그림은 높이 15~75%, 아래 25% 비움, 마커 손그림, 큰 글자와 알약 합쳐 5단어 이하).

- **근거**: 이 쇼츠의 훅은 "끝에 붙는 s를 다 '스'로 읽으면 틀린다"이다. 쇼츠 제목("강아지 두 마리는 도그스? 끝의 s는 세 가지로 읽습니다")의 "도그스", "세 가지"와 롱폼 썸네일("-S·-ES / 3가지 소리였습니다")의 "3가지 소리"를 피했다. 최근 쇼츠 썸네일(EP24 퀴즈, EP25, EP26 "라이트 = 라이트?")의 "A = A?" 틀과도 겹치지 않게 했다.
- **정답 노출**: 세 소리(스·즈·이즈)의 이름은 넣지 않는다. 색 줄만 그려 호기심을 남긴다.

## 문구 5안

| 안 | 큰 글자 | 알약 | 내 생각 |
|---|---|---|---|
| ⭐ 1 | 끝소리 s, 다 스? | 아닙니다 | 시청자가 가진 생각("s는 스")을 질문으로 던지고 바로 부정한다. 단어가 5개라 한눈에 읽힌다. |
| 2 | dogs 끝소리 | 스? 즈? | 단어가 구체적이지만 정답 후보를 둘로 좁혀 줘서 퀴즈 느낌이 강하다. 롱폼 알약과 비슷하다. |
| 3 | 강아지 vs 고양이 | 끝이 다르다 | 그림은 쉽지만 무엇이 다른지 글자만으로는 안 보인다. |
| 4 | 같은 s, 다른 소리 | 들어 보세요 | 롱폼 "3가지 소리"와 뜻이 겹친다. |
| 5 | 도그스가 아니다 | 도그즈 | 쇼츠 제목과 겹치고 정답을 그대로 보여 준다. |

## 메인 (`thumbnail.jpg`) — 1안

**🇰🇷 한글 요약**: 웜크림 바탕 위쪽에 "끝소리 s, 다 스?"를 크게, 그 아래 금색 알약 "아닙니다". 가운데에는 마커로 그린 강아지, 고양이, 버스가 나란히 있고, 각각 아래에 짧은 형광펜 줄 하나(빨강, 파랑, 초록)가 그어져 있다. 줄 색의 뜻은 글자로 설명하지 않는다. 아래 25%는 비운다.

```text
A vertical YouTube Shorts thumbnail in 9:16 portrait format, 1080 by 1920 pixels. Background: one flat warm cream color, exact hex #F4EFE6, filling the whole canvas, with no texture and no gradient. Drawing style: a hand-drawn sketchnote look, as if a person drew it quickly with a black felt-tip marker and highlighters: confident black marker lines in #111111 with slightly uneven thickness and a natural hand wobble, the insides of shapes left as plain paper, and color only from a few quick, streaky highlighter strokes that go slightly outside the lines. Layout: keep every element between 15 percent and 75 percent of the canvas height, and leave the bottom 25 percent completely empty cream. Upper area, centered, between about 18 and 36 percent of the height: the Korean headline "끝소리 s, 다 스?" in very large, extra-bold black Korean gothic letters, like the font Black Han Sans, on one or two lines, with one quick yellow highlighter stroke in #F5C518 behind the letter s. Right below the headline, centered: one rounded gold pill filled with #F5C518, with a heavy black outline and a small solid black offset shadow, containing "아닙니다" in bold black Korean gothic letters. Middle area, between about 45 and 72 percent of the height: three simple marker drawings in one row, the same size, evenly spaced. Left: one small friendly puppy sitting, seen from the side, lightly marked with a warm light brown highlighter in #D9A066. Center: one small cat sitting, seen from the side, lightly marked with a light gray highlighter in #C9CED6. Right: one simple city bus seen from the side, lightly marked with a yellow highlighter in #F5C518. Directly under each of the three drawings, one short, thick, straight highlighter stroke of equal length: red (#EF4444) under the puppy, blue (#3B82F6) under the cat, green (#10B981) under the bus; the strokes are plain color bars with no letters or symbols on or near them. Text rules: the only text in the image is "끝소리 s, 다 스?" and "아닙니다", written exactly like that with every Korean character correct and clear. No other words, letters or numbers anywhere, no license plates, no route numbers and no labels. No human, no face other than the simple animal faces, no avatar. No 3D text, no neon glow, no gradients, no complex background, no stars, no sparkles, no doodles. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges. Aspect ratio 9:16.
```

- **받으면 확인할 것**: 한글 글자가 깨지지 않았는지("끝소리 s, 다 스?", "아닙니다"), 세 그림 아래 줄이 빨강·파랑·초록 순서로 있는지, 줄 옆에 글자가 생기지 않았는지, 아래 25%가 비었는지, 네 모서리에 로고가 없는지.
- **저장**: 다운로드 폴더에 `ep27_shorts_thumbnail.jpg`로 넣으면 Claude가 `output/upload-packages/ep27-shorts-dogs-cats/thumbnail.jpg`로 옮긴다.
