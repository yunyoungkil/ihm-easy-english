# 그림 프롬프트 — ep26-shorts-right-light (2장)

단어 뜻과 혀 위치 설명에 쓸 그림입니다. 글자와 표지판 카드, 화살표, 강조 표시는 코드로 얹으므로 그림에는 넣지 않습니다.

- **마지막 안내 그림**: EP24 쇼츠의 `cta_hand`를 같이 쓰므로 여기서는 만들지 않습니다.
- **도구**: Google Gemini (AI Studio)
- **비율**: 전부 1:1. 위아래 절반을 잘라 카드 두 장에 나눠 넣습니다.
- **생성 후**: 네 모서리에 로고나 별 표시가 없는지 확인합니다. 그림을 넣을 때 제가 다시 확인합니다.

---

## 1. 우회전하는 차와 신호등 (`pair_right_light.jpg`)

**🇰🇷 한글 요약**: 위에는 위에서 내려다본 사거리와, 그 한가운데에서 오른쪽으로 꺾고 있는 차입니다. 아래에는 빨강, 노랑, 초록 세 칸짜리 가로형 신호등이고 초록불만 켜져 있습니다. 왼쪽 화살표 칸은 넣지 않습니다. 오른쪽을 설명하는 장면과 어긋나기 때문입니다. 표지판이나 글자도 넣지 않습니다.

```text
A square illustration split into two equal halves, one above the other, with no dividing line. Top half: a simple road intersection seen from directly above, with one small orange car in the very center of the intersection, its body rotated about 45 degrees clockwise so that it is clearly halfway through turning from the bottom road into the right road, filling about 70 percent of the width of that half. Bottom half: one horizontal traffic light with exactly three round lenses, red on the left, yellow in the middle and green on the right, mounted on a simple pole; only the green lens is lit, and the red and yellow lenses are dark and unlit; there is no fourth section and no arrow on any lens; centered, filling about 70 percent of the width of that half. Flat, friendly editorial illustration with clean bold dark navy outlines (#1E293B) and a limited warm color palette. Soft, even light. The background must be a solid, flat, opaque pure white, exact hex #FFFFFF, filling the entire canvas edge to edge, with no gradient. No text, no letters, no numbers, no labels, no arrows, no road markings with symbols, and no signs anywhere in the image. Aspect ratio 1:1. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

- **저장 위치**: `videos/ep26-shorts-right-light/assets/images/pair_right_light.jpg`
- **시도 기록**: 2026-11-07 1차 그림은 차가 정지선 앞에 서 있어 꺾는 모습으로 보이지 않았고, 신호등에 왼쪽 화살표 칸이 들어갔으며 세 불이 모두 켜진 것처럼 보였다. 그래서 위에서 내려다보는 구도, 차 45도 회전, 세 칸 신호등, 초록불만 켜짐을 프롬프트에 못 박았다.

---

## 2. 혀끝 위치 (`tongue_free_touch.jpg`)

**🇰🇷 한글 요약**: 입 안을 옆에서 본 단면 그림 두 개입니다. 위는 혀끝이 허공에 떠 있어 입천장과 틈이 보입니다. 아래는 혀끝이 위로 올라가, 윗니가 아니라 **윗니 바로 위쪽의 분홍색 잇몸**에 닿아 있습니다. 강조 표시는 코드로 얹으므로 그림은 단순하게 둡니다. 혀끝 위치가 이 쇼츠의 핵심이라, 생성 후 위 칸에 틈이 있는지와 아래 칸에서 치아가 아니라 잇몸에 닿아 있는지를 꼭 확인합니다.

```text
A square illustration split into two equal halves, one above the other, with no dividing line, showing the same simple side-view cutaway of the inside of an adult's closed-lip mouth twice, facing left, with the same size and position in both halves. Each drawing shows the upper front teeth, the gum ridge directly behind them, the roof of the mouth, the lower teeth, and the tongue. Top half: the tip of the tongue is raised and curved slightly back, floating in open air, with a clearly visible empty gap between the tongue tip and the gum ridge and between the tongue tip and the roof of the mouth, so that the tip touches nothing. Bottom half: the tongue arches upward like a ramp and only its narrow pointed tip reaches up and presses against the pink gum ridge directly above and behind the upper front teeth, touching the pink gum and not touching the white teeth; the rest of the tongue stays lower, with an open dark space visible under the tongue tip and behind the upper teeth, and a dark gap between the tongue body and the roof of the mouth. The tongue is soft pink, the gums and roof of the mouth are a lighter pink, and the teeth are white. Flat, clean educational illustration with clean bold dark navy outlines (#1E293B), friendly and simple, not gory. Soft, even light. The background must be a solid, flat, opaque pure white, exact hex #FFFFFF, filling the entire canvas edge to edge, with no gradient. No text, no letters, no numbers, no labels, no arrows, no glowing marks, and no symbols anywhere in the image. Aspect ratio 1:1. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

- **저장 위치**: `videos/ep26-shorts-right-light/assets/images/tongue_free_touch.jpg`
- **시도 기록**: 2026-11-07 1차 그림은 위 칸은 맞았지만 아래 칸의 혀가 잇몸이 아니라 윗니 뒤쪽 아랫부분에 닿았다. "윗니 뒤 잇몸에 붙이면"이라는 나레이션과 어긋나 잇몸에 닿는 위치를 프롬프트에 못 박았다.
