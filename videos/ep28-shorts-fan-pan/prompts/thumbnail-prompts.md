# 쇼츠 썸네일 프롬프트 — ep28-shorts-fan-pan

쇼츠는 썸네일 A/B 테스트가 되지 않으므로 1장만 만든다. 크기·자리·그림체 규칙은 `videos/ep24-shorts-sheep-ship/prompts/thumbnail-prompts.md`와 같다(9:16, 글자와 그림은 높이 15~75%, 아래 25% 비움, 마커 손그림, 큰 글자와 알약 합쳐 5단어 이하).

- **근거**: 이 쇼츠는 EP27~29 중 유일한 퀴즈형이고, 방식은 "소리를 세어 보기"다. EP24는 "무슨 단어인가", EP26은 "같은 소리인가"였다. 쇼츠 제목("팬, 팬, 팬… 이 중 프라이팬은 몇 번일까요?")의 "프라이팬 몇 번"과 롱폼 썸네일("F vs P / 윗니 100% vs 0%")을 피하고, 세어 본다는 방식을 앞에 세웠다.
- **정답 노출**: 정답(프라이팬 두 번, 아이돌 팬 한 번)은 넣지 않는다. 빈 칸 다섯 개만 그린다.

## 문구 5안

| 안 | 큰 글자 | 알약 | 내 생각 |
|---|---|---|---|
| ⭐ 1 | 귀로만 세기 | 팬 다섯 번 | 퀴즈의 방식(듣고 세기)이 보이고, 빈 칸 다섯 개가 "다섯 번"을 그림으로 받쳐 준다. 단어 5개. |
| 2 | 팬 5번, 몇 번? | 소리로 구별 | 제목의 "몇 번"과 겹친다. |
| 3 | 아이돌 vs 프라이팬 | 귀로 구별 | 두 뜻은 보이지만 "세기"라는 새 방식이 안 보인다. |
| 4 | 팬이 다 같다고? | 들어 보세요 | 쇼츠 EP25·26처럼 같다는 가정을 뒤집는 틀이라 다른 쇼츠와 비슷하다. |
| 5 | 몇 번 들렸나요? | 프라이팬 | 제목과 겹치고 의미가 덜 분명하다. |

## 메인 (`thumbnail.jpg`) — 1안

**🇰🇷 한글 요약**: 웜크림 바탕 위쪽에 "귀로만 세기"를 크게, 그 아래 금색 알약 "팬 다섯 번". 가운데에는 왼쪽에 응원봉, 오른쪽에 프라이팬이 마커로 그려져 있고, 그 아래에 비어 있는 둥근 칸 다섯 개가 한 줄로 있다(칸 안에는 아무것도 없다). 아래 25%는 비운다.

```text
A vertical YouTube Shorts thumbnail in 9:16 portrait format, 1080 by 1920 pixels. Background: one flat warm cream color, exact hex #F4EFE6, filling the whole canvas, with no texture and no gradient. Drawing style: a hand-drawn sketchnote look, as if a person drew it quickly with a black felt-tip marker and highlighters: confident black marker lines in #111111 with slightly uneven thickness and a natural hand wobble, the insides of shapes left as plain paper, and color only from a few quick, streaky highlighter strokes that go slightly outside the lines. Layout: keep every element between 15 percent and 75 percent of the canvas height, and leave the bottom 25 percent completely empty cream. Upper area, centered, between about 18 and 36 percent of the height: the Korean headline "귀로만 세기" in very large, extra-bold black Korean gothic letters, like the font Black Han Sans, on one line, with one quick yellow highlighter stroke in #F5C518 behind the word "세기". Right below the headline, centered: one rounded gold pill filled with #F5C518, with a heavy black outline and a small solid black offset shadow, containing "팬 다섯 번" in bold black Korean gothic letters. Middle area, between about 45 and 72 percent of the height: two marker drawings side by side, the same height. Left: one simple handheld concert light stick standing upright, a straight handle with a plain round dome on top, with no logo, no pattern, no hearts and no letters on it, the dome marked with a yellow highlighter in #F5C518. Right: one plain round frying pan with a long straight handle seen at a slight angle from above, empty, marked inside with a light gray highlighter in #C9CED6. Below the two drawings, in one straight horizontal row and evenly spaced, exactly five empty rounded rectangles drawn with the black marker, the same size, each left completely empty with plain paper inside, with nothing written in them. Text rules: the only text in the image is "귀로만 세기" and "팬 다섯 번", written exactly like that with every Korean character correct and clear. No other words, letters, numbers, question marks or symbols anywhere. No human, no face, no avatar. No 3D text, no neon glow, no gradients, no complex background, no stars, no sparkles, no doodles. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges. Aspect ratio 9:16.
```

- **받으면 확인할 것**: 한글 글자가 깨지지 않았는지("귀로만 세기", "팬 다섯 번"), 빈 칸이 정확히 다섯 개이고 안이 비어 있는지, 응원봉에 로고가 없는지, 아래 25%가 비었는지, 네 모서리에 로고가 없는지.
- **저장**: 다운로드 폴더에 `ep28_shorts_thumbnail.jpg`로 넣으면 Claude가 `output/upload-packages/ep28-shorts-fan-pan/thumbnail.jpg`로 옮긴다.
