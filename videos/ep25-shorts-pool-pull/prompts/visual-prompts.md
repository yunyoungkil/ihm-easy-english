# 그림 프롬프트 — ep25-shorts-pool-pull (2장)

네 칸 뒤집기와 입술 설명에 쓸 그림입니다. 글자와 카드, 화살표는 코드로 얹으므로 그림에는 넣지 않습니다. 그림체는 사람이 검은 마커로 종이에 쓱쓱 그리고 형광펜을 몇 번 그은 손그림입니다(2026-11-07 사용자 결정, EP24 쇼츠 마지막 손 그림과 같은 그림체). 별·반짝이는 AI 그림 티가 나서 넣지 않습니다. 이 그림들은 흰 카드 안에 들어가므로 흰 바탕 그대로 쓰고, 투명 배경은 요청하지 않습니다.

- **마지막 안내 그림**: EP24 쇼츠의 `cta_hand`를 같이 쓰므로 여기서는 만들지 않습니다.
- **도구**: Google Gemini (AI Studio)
- **비율**: 전부 1:1
- **생성 후**: 네 모서리에 로고나 별 표시가 없는지 확인합니다. 그림을 넣을 때 제가 다시 확인합니다.

---

## 1. 네 칸 그림 (`grid_pool_pull_fool_full.jpg`)

**🇰🇷 한글 요약**: 한 장을 네 칸으로 나눕니다. 왼쪽 위 수영장, 오른쪽 위 문 손잡이를 당기는 손, 왼쪽 아래 광대 모자, 오른쪽 아래 물이 가득 찬 컵입니다. 코드가 칸을 위치로 잘라 쓰기 때문에 순서가 바뀌면 안 됩니다. 문에 글자가 들어가면 화면 글자와 겹쳐서, 글자 없는 문으로 지정했습니다.

```text
A square illustration divided into a two-by-two grid of four equal cells, with no dividing lines, each cell containing one centered object filling about 65 percent of the cell. Keep exactly this order. Top-left cell: an outdoor swimming pool with clear blue water and a small metal ladder. Top-right cell: one adult hand gripping a door handle and pulling a plain wooden door open, with a completely blank door and no sign on it. Bottom-left cell: one jester's hat with small bells. Bottom-right cell: one clear drinking glass filled with water right up to the brim. Hand-drawn sketchnote style, as if a person drew it quickly with a black felt-tip marker on plain white paper and then scanned it: confident black marker lines in #111111 with slightly uneven thickness and a natural hand wobble, not vector-perfect and not symmetrical, with the insides of shapes left mostly as white paper. Color comes only from a few quick, streaky highlighter strokes that go slightly outside the lines, with darker overlap where strokes cross. Nothing decorative: no stars, no sparkles, no doodles, no shadows, no gradients. Flat, even light like a clean scan. Highlighter colors: light blue (#7DD3FC) on the pool water and on the water in the glass, and bright yellow (#F5C518) on the jester's hat and on the door handle. The background must be a solid, flat, opaque pure white, exact hex #FFFFFF, filling the entire canvas edge to edge, with no gradient. No text, no letters, no numbers, no labels, no arrows, and no signs anywhere in the image. Aspect ratio 1:1. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

- **저장 위치**: `videos/ep25-shorts-pool-pull/assets/images/grid_pool_pull_fool_full.jpg`
- **시도 기록**: 2026-11-07 사용자 결정으로 그림체를 마커 손그림으로 바꿨다(그림체 문장만 교체, 내용 묘사는 그대로). 이전 그림체로 만든 그림은 다시 만든다.

---

## 2. 모은 입술과 힘 뺀 입술 (`lips_round_relaxed.jpg`)

**🇰🇷 한글 요약**: 같은 사람의 입만 크게 그립니다. 위는 촛불을 끄듯 입술을 동그랗게 앞으로 모은 입이고 옆에 촛불이 있습니다. 아래는 힘을 빼고 턱을 살짝 내린 입입니다. 아래 입도 약간은 둥글지만 위보다 훨씬 덜 둥글어야 하고, 촛불은 없습니다.

```text
A square illustration split into two equal halves, one above the other, with no dividing line, showing the same adult's mouth twice in extreme close-up, front view, lips and a little of the chin only, with no nose and no eyes, no face outline, no cheek lines, and no line between the mouth and the candle. Top half: the lips are pushed forward into a small, tight, round circle as if blowing out a candle, and one small lit candle stands to the right of the mouth with its flame bending away from the lips. Bottom half: the lips are relaxed and slightly open, the jaw is lowered a little, the mouth is not smiling, and there is no candle. The lips are still loosely rounded: the corners of the mouth are drawn a little inward, so the bottom mouth is only about 1.3 times as wide as the top mouth, much narrower than a wide resting mouth, and the opening between the lips is a soft oval rather than a long flat slit. It is clearly less round and less pushed forward than the top mouth. The teeth are barely visible. Both mouths are centered in their halves. The person is not speaking. Hand-drawn sketchnote style, as if a person drew it quickly with a black felt-tip marker on plain white paper and then scanned it: confident black marker lines in #111111 with slightly uneven thickness and a natural hand wobble, not vector-perfect and not symmetrical, with the insides of shapes left mostly as white paper. Color comes only from a few quick, streaky highlighter strokes that go slightly outside the lines, with darker overlap where strokes cross. Nothing decorative: no stars, no sparkles, no doodles, no shadows, no gradients. Flat, even light like a clean scan. Highlighter colors: coral pink (#F28B82) on the lips only and bright yellow (#F5C518) on the candle flame only; the skin stays white paper. The highlighter must not change the outline of the lips, so the round top mouth and the loosely rounded bottom mouth stay clearly different. The background must be a solid, flat, opaque pure white, exact hex #FFFFFF, filling the entire canvas edge to edge, with no gradient. No text, no letters, no numbers, no labels, no arrows anywhere in the image. Aspect ratio 1:1. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

- **저장 위치**: `videos/ep25-shorts-pool-pull/assets/images/lips_round_relaxed.jpg`
- **시도 기록**: 2026-11-07 팩트 체크로 아래 입 묘사를 고쳤다. 처음 프롬프트는 "not rounded"였는데, pull의 입술은 덜 둥근 것이지 안 둥근 것이 아니다. 그 전 프롬프트로 만든 그림은 다시 만든다. 2026-11-07 사용자 결정으로 그림체를 마커 손그림으로 바꿨다(그림체 문장만 교체, 내용 묘사는 그대로). 이전 그림체로 만든 그림은 다시 만든다.
- **2차 시도 기록**: 2026-11-07 마커 그림체 1차 그림은 위 칸은 맞았지만 아래 입이 옆으로 넓게 퍼져 EP24 쇼츠의 힘 뺀 입(ship)과 거의 같았다. 사실 확인의 "덜 둥근 것이지 안 둥근 것이 아니다"와 어긋나 아래 입 폭을 위 입의 약 1.3배로 숫자로 못 박았고, 위 칸 입과 촛불 사이에 생긴 볼 선도 막았다.
- **3차 시도 기록**: 2026-11-08 고친 프롬프트로 다시 받았다. 위 칸 볼 선이 사라졌고, 아래 입은 폭이 위 입의 약 1.5배(요청은 1.3배)로 이전(약 1.6배)보다 조금 좁아졌다. 아래 입이 아직 넓은 편이지만 위(동그랗게 모음)와 아래(힘 뺌)의 차이는 분명해 이 그림을 쓴다. 더 좁히려면 다시 만들어야 한다.
