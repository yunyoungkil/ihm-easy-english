# 쇼츠 썸네일 프롬프트 — ep24-shorts-sheep-ship

쇼츠는 2026년 7월부터 직접 만든 썸네일을 스튜디오에서 올릴 수 있지만, 제목·썸네일 테스트(A/B)는 쇼츠에서 되지 않는다. 그래서 1장만 만든다.

- **크기**: 세로 9:16, 1080×1920. 곳에 따라 잘려 보이므로 글자와 그림은 높이 15~75% 안에 둔다. 아래 25%는 쇼츠 목록에서 제목이 겹치는 자리라 비운다.
- **그림체**: 쇼츠 화면과 같은 마커 손그림(`visual-prompts.md`). 글자는 읽기 쉽게 굵은 고딕으로 쓴다.
- **글자 수**: 큰 글자와 알약을 합쳐 5단어 이하. 정답(양)은 썸네일에 넣지 않는다.
- **근거**: 채널 검색어(마지막 동기화)에 "발음 테스트"가 있어 퀴즈라는 점을 앞에 세웠다. 쇼츠 제목("양일까 배일까? …")과 롱폼 썸네일("SHEEP vs SHIP / 완전히 다른 소리")과 같은 말을 쓰지 않는다.

## 문구 5안

| 안 | 큰 글자 | 알약 | 내 생각 |
|---|---|---|---|
| ⭐ 1 | 3문제 다 맞힐까? | 양? 배? | 퀴즈라는 걸 바로 알리고, 제목과 말이 겹치지 않는다. |
| 2 | 둘 다 '쉽'? | 아닙니다 | 롱폼 제목("둘 다 '쉽'으로 읽으셨나요?")과 겹친다. |
| 3 | 이 소리 들려요? | 양 vs 배 | 무엇을 하는 영상인지 막연하다. |
| 4 | 귀 테스트 | 양? 배? | 짧지만 몇 문제인지, 무엇을 맞히는지 덜 구체적이다. |
| 5 | 몇 개 맞혔어요? | 3문제 | 이미 본 사람에게 묻는 말투라 피드에서 어색하다. |

## 메인 (`thumbnail.jpg`) — 1안

**🇰🇷 한글 요약**: 웜크림 바탕 위쪽에 "3문제 다 맞힐까?"를 크게, 그 아래 금색 알약 "양? 배?". 가운데에는 마커로 그린 양(왼쪽)과 돛단배(오른쪽), 둘 사이에 큰 물음표. 아래 25%는 비운다.

```text
A vertical YouTube Shorts thumbnail in 9:16 portrait format, 1080 by 1920 pixels. Background: one flat warm cream color, exact hex #F4EFE6, filling the whole canvas, with no texture and no gradient. Drawing style: a hand-drawn sketchnote look, as if a person drew it quickly with a black felt-tip marker and highlighters: confident black marker lines in #111111 with slightly uneven thickness and a natural hand wobble, the insides of shapes left as plain paper, and color only from a few quick, streaky highlighter strokes that go slightly outside the lines. Layout: keep every element between 15 percent and 75 percent of the canvas height, and leave the bottom 25 percent completely empty cream. Upper area, centered, between about 18 and 36 percent of the height: the Korean headline "3문제 다 맞힐까?" in very large, extra-bold black Korean gothic letters, like the font Black Han Sans, on one or two lines, with one quick yellow highlighter stroke in #F5C518 behind "3문제". Right below the headline, centered: one rounded gold pill filled with #F5C518, with a heavy black outline and a small solid black offset shadow, containing "양? 배?" in bold black Korean gothic letters. Middle area, between about 45 and 72 percent of the height: two marker drawings side by side, the same size. Left: one fluffy sheep standing on a small patch of grass, the sheep left as white paper and the grass marked with a green highlighter in #4ADE80. Right: one small sailboat on a few gentle waves, with a yellow highlighter in #F5C518 on the hull and a light blue highlighter in #7DD3FC on the waves. Between the two drawings: one large hand-drawn black question mark. Text rules: the only text in the image is "3문제 다 맞힐까?" and "양? 배?", written exactly like that with every Korean character correct and clear. No other words, letters or numbers anywhere. No human, no face, no avatar. No 3D text, no neon glow, no gradients, no complex background, no stars, no sparkles, no doodles. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges. Aspect ratio 9:16.
```

- **받으면 확인할 것**: 한글 글자가 깨지지 않았는지, 아래 25%가 비었는지, 정답(양)을 가리키는 표시가 없는지.
- **저장**: 다운로드 폴더에 `ep24_shorts_thumbnail.jpg`로 넣으면 Claude가 `output/upload-packages/ep24-shorts-sheep-ship/thumbnail.jpg`로 옮긴다(대시보드 SHORTS-A 탭에 보임).
- **시도 기록**: 아직 없음
