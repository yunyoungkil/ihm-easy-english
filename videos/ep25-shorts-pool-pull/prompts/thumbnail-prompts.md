# 쇼츠 썸네일 프롬프트 — ep25-shorts-pool-pull

쇼츠는 썸네일 A/B 테스트가 되지 않으므로 1장만 만든다. 크기·자리·그림체 규칙은 `videos/ep24-shorts-sheep-ship/prompts/thumbnail-prompts.md`와 같다(9:16, 글자와 그림은 높이 15~75%, 아래 25% 비움, 마커 손그림, 5단어 이하).

- **근거**: 이 쇼츠의 훅은 "한글로 쓰면 전부 풀"이다. 네 칸 그림(수영장·문 당기기·광대 모자·가득 찬 컵)이 이미 있으므로 숫자 "넷"과 그림 4개를 맞물렸다. 쇼츠 제목("이 네 단어, 한글로 쓰면 전부 '풀'입니다")과 롱폼 썸네일 알약("입술 모으면 끝")과 같은 말을 쓰지 않는다. "전부 달라요"는 나레이션 "영어로 들으면 네 단어가 다 다릅니다"와 같은 내용이다.

## 문구 5안

| 안 | 큰 글자 | 알약 | 내 생각 |
|---|---|---|---|
| ⭐ 1 | 넷 다 '풀'? | 전부 달라요 | 그림 4개와 "넷"이 맞물려 한눈에 들어온다. |
| 2 | 풀 × 4 | 다른 단어 | 곱하기 기호가 40~60대에게 덜 바로 읽힐 수 있다. |
| 3 | 전부 '풀'? | 아닙니다 | 제목 "전부 '풀'입니다"와 겹친다. |
| 4 | 수영장? 잡아당기기? | 입술이 답 | 길고, 영상의 답을 먼저 알려 준다. |
| 5 | '풀' 구분돼요? | 4단어 | 무난하지만 눈에 걸리는 점이 없다. |

## 메인 (`thumbnail.jpg`) — 1안

**🇰🇷 한글 요약**: 웜크림 바탕 위쪽에 "넷 다 '풀'?"을 크게, 그 아래 금색 알약 "전부 달라요". 가운데에는 마커로 그린 그림 4개를 2×2로: 수영장, 문 손잡이를 당기는 손, 광대 모자, 물이 가득 찬 컵. 아래 25%는 비운다.

```text
A vertical YouTube Shorts thumbnail in 9:16 portrait format, 1080 by 1920 pixels. Background: one flat warm cream color, exact hex #F4EFE6, filling the whole canvas, with no texture and no gradient. Drawing style: a hand-drawn sketchnote look, as if a person drew it quickly with a black felt-tip marker and highlighters: confident black marker lines in #111111 with slightly uneven thickness and a natural hand wobble, the insides of shapes left as plain paper, and color only from a few quick, streaky highlighter strokes that go slightly outside the lines. Layout: keep every element between 15 percent and 75 percent of the canvas height, and leave the bottom 25 percent completely empty cream. Upper area, centered, between about 18 and 34 percent of the height: the Korean headline "넷 다 '풀'?" in very large, extra-bold black Korean gothic letters, like the font Black Han Sans, on one line, with one quick yellow highlighter stroke in #F5C518 behind "풀". Right below the headline, centered: one rounded gold pill filled with #F5C518, with a heavy black outline and a small solid black offset shadow, containing "전부 달라요" in bold black Korean gothic letters. Middle area, between about 42 and 74 percent of the height: four small marker drawings in a two-by-two grid, all the same size, with clear space between them and no dividing lines. Top-left: an outdoor swimming pool with a small ladder, the water marked with a light blue highlighter in #7DD3FC. Top-right: one hand gripping a door handle and pulling a plain blank door open, the handle marked with a yellow highlighter in #F5C518. Bottom-left: one jester's hat with small bells, marked with a yellow highlighter in #F5C518. Bottom-right: one drinking glass filled with water right up to the brim, the water marked with a light blue highlighter in #7DD3FC. Text rules: the only text in the image is "넷 다 '풀'?" and "전부 달라요", written exactly like that with every Korean character correct and clear. No labels under the drawings, no other words, letters or numbers anywhere, and no signs on the door. No human face, no avatar. No 3D text, no neon glow, no gradients, no complex background, no stars, no sparkles, no doodles. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges. Aspect ratio 9:16.
```

- **받으면 확인할 것**: 한글 글자가 깨지지 않았는지, 손가락이 다섯 개인지, 아래 25%가 비었는지, 문에 글자가 없는지.
- **저장**: 다운로드 폴더에 `ep25_shorts_thumbnail.jpg`로 넣으면 Claude가 EP25 쇼츠 업로드 패키지(`output/upload-packages/ep25-shorts-pool-pull/thumbnail.jpg`)로 옮긴다.
- **시도 기록**: 2026-11-08 1안 그대로 받아 `output/upload-packages/ep25-shorts-pool-pull/thumbnail.jpg`에 넣었다(768×1376). "넷 다 '풀'?"의 '풀'은 확대해 ㅜ 줄기까지 확인(플 아님), 아래 25% 비어 있음, 네 모서리 로고 없음.
