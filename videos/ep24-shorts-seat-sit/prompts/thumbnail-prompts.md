# 쇼츠 썸네일 프롬프트 — ep24-shorts-seat-sit

규칙: `episode-planning` `06-shorts-and-next-watch.md` 2절 — 세로 9:16(1080×1920), 글자와 그림은 높이 15~75% 안, 아래 25%는 비움, 마커 손그림, 굵은 고딕, 큰 글자와 알약 합쳐 5단어 이하, 정답 넣지 않음, 쇼츠 제목·롱폼 썸네일과 같은 말 금지. A/B 테스트가 안 돼 1장만 만든다.

## 문구 5안 (Claude 결정, 2026-11-11 사용자 위임)

| 안 | 큰 글자 | 알약 | 단어 수 | 판단 |
|---|---|---|---|---|
| **1 (추천)** | SEEEEAT | 길게 끌면 될까? | 4 | 학창 시절 통념을 그대로 보여 주고 답은 숨긴다. 제목("길이보다 입꼬리")과 말이 겹치지 않고, 영상 첫 장면(늘어나는 글자)과 같아 클릭 뒤 약속이 바로 지켜진다 |
| 2 | seat = sit? | 길이 재 봤더니 | 4 | 숫자 반전을 예고하지만 "재 봤더니"는 사람이 직접 잰 경험처럼 읽힐 수 있다(경험 날조 금지) |
| 3 | 0.30 vs 0.29 | 이게 다른 소리? | 5 | 구체적이지만 피드 크기에서 숫자가 작아 안 읽힌다 |
| 4 | 시이잇? 싯? | 끌면 틀려요 | 4 | 한글 표기를 앞세워 원칙(한글 억지 쪼개기 금지)에 어긋난다 |
| 5 | seat vs sit | 입꼬리 차이 | 4 | 제목과 말이 겹치고 답을 미리 준다 |

## 추천 1안 프롬프트

**🇰🇷 한글 요약**: 흰 종이에 마커로 그린 칠판 한 장. 칠판 위에 굵은 영어 `SEEEEAT`가 옆으로 길게 늘어나 있고, 그 아래 노란 알약에 `길게 끌면 될까?`. 아래 4분의 1은 비웁니다.

```text
A vertical 9:16 YouTube Shorts cover, 1080 by 1920 pixels, hand-drawn sketchnote style as if drawn with a black felt-tip marker, a soft green highlighter and a yellow highlighter on plain warm white paper, then scanned. In the vertical band between 15 percent and 75 percent of the height: a simple classroom blackboard with a wooden frame drawn in loose marker lines, its surface a flat dark green highlighter wash. On the board, very large bold white hand-lettered English text "SEEEEAT", stretched horizontally across almost the full width so the repeated E letters look pulled like taffy, with two small motion strokes after the last E. Directly below the board, a rounded yellow pill-shaped label with a thick black outline containing bold black Korean sans-serif text "길게 끌면 될까?". Exact text only: "SEEEEAT" and "길게 끌면 될까?" — spell them exactly, no other words, no numbers, no channel name, no logos. The bottom 25 percent of the canvas is plain warm white paper with nothing on it. No people, no faces. Loose slightly wobbly ink lines, uneven highlighter strokes. Aspect ratio 9:16. No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.
```

- **저장 위치**: 생성본은 `videos/ep24-shorts-seat-sit/assets/images/thumbnail.jpg`, 렌더 뒤 패키지 `output/upload-packages/ep24-shorts-seat-sit/thumbnail.jpg`
- **받으면 확인할 것**: `SEEEEAT` 철자(E 4개), 한글 `길게 끌면 될까?`가 정확한지, 아래 25%가 비었는지, 네 모서리 로고.
