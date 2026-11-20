# SCRIPT — ep32-shorts-word-merge

- **제목**: 김미? 렘미? 원어민이 두 단어를 하나로 합쳐 먹는 진짜 이유
- **썸네일**: `thumb-A.jpg` (오프화이트 3D 자석 큐브 GIVE + ME → GIMME)
- **비교 시트**: `data/youtube/transform-sheets/ep32-shorts-word-merge.json`
- **시트 목표 길이**: 44.0초 (12컷, 분당 16.4컷 — 오디오 실측 후 `audio-timings.json` 기준으로 최종 컷 경계 확정)
- **상단 훅 타이포 (검은 띠 없음, 가로 정중앙 대칭)**:
  - 1줄: `아는 영어인데`
  - 2줄: `**왜 안 들릴까요?**`

## 12컷 대본 · 시트 시간 · 음성 · 0.3초 청각 시그니처(Audio Anchor) 계획

| 컷 | 시트 시작(t) | 시트 길이 | 템플릿 | 이미지 | 한국어 나레이션 (Gero) | 원어민 음성 (Olin) | 0.3초 청각 시그니처 | 생각 창 | 하단 자막 |
|---:|---:|---:|---|---|---|---|---|---|---|
| 0 | 0.0s | 3.8s | `chat-misunderstanding-hook` | `art-cafe.jpg` | 분명 아는 단어인데, 왜 안 들릴까요? | 없음 | - | 0s | 분명 아는 단어인데, 왜 안 들릴까요? |
| 1 | 3.8s | 3.5s | `magnetic-merge-diagram` | `art-magnet.jpg` | 입이 바쁘면 두 단어를 합칩니다. | 없음 | - | 0s | 입이 바쁘면 두 단어를 합칩니다 |
| 2 | 7.3s | 2.9s | `editorial-cafe-split` | `art-cafe.jpg` | 첫째, 이 두 단어. | `give me` (`give-me.wav`) | - | 0s | 첫째, 이 두 단어 · give me |
| 3 | 10.2s | 3.8s | `audio-anchor-merge-smash` | `art-cafe.jpg` | 하나로 쏙 합쳐집니다. | `gimme` (`gimme.wav`) | **Audio Anchor (1회)** | 0s | 하나로 쏙 합쳐집니다 · GIMME |
| 4 | 14.0s | 2.9s | `editorial-phone-peek` | `art-phone.jpg` | 둘째, 이 두 단어. | `let me` (`let-me.wav`) | - | 0s | 둘째, 이 두 단어 · let me |
| 5 | 16.9s | 3.8s | `audio-anchor-merge-smash` | `art-phone.jpg` | 바로 녹아 붙습니다. | `lemme` (`lemme.wav`) | **Audio Anchor (2회)** | 0s | 바로 녹아 붙습니다 · LEMME |
| 6 | 20.7s | 2.9s | `kinfolk-letterbox-office` | `art-office.jpg` | 셋째, 이 표현. | `kind of` (`kind-of.wav`) | - | 0s | 셋째, 이 표현 · kind of |
| 7 | 23.6s | 3.8s | `audio-anchor-merge-smash` | `art-office.jpg` | 끝이 빠져 스르르 붙죠. | `kinda` (`kinda.wav`) | **Audio Anchor (3회)** | 0s | 끝이 빠져 스르르 붙죠 · KINDA |
| 8 | 27.4s | 3.7s | `triple-sound-flash` | - | (없음, 무나레이션) | `gimme`, `lemme`, `kinda` | - | 0s | 🔊 원어민 소리만 3연속으로 들어 보세요 |
| 9 | 31.1s | 5.4s | `door-quiz-countdown` | `art-door.jpg` | 퀴즈, 어떻게 들릴까요? | `outta` (`outta.wav`) | - | 1.5s | 퀴즈, 어떻게 들릴까요? · A vs B |
| 10 | 36.5s | 3.7s | `quiz-payoff-merge` | `art-door.jpg` | 정답은 바로 이 두 단어! | `outta` (`outta.wav`) | **Audio Anchor (4회)** | 0s | 정답은 바로 이 두 단어 · out of → OUTTA |
| 11 | 40.2s | 3.8s | `four-merge-checklist-cta` | - | 다섯 개 더 고정 댓글에 있어요. | 없음 | - | 0s | 👇 보너스 다섯 개는 고정 댓글에 있어요! |

## TTS 대본 원문 (한국어 나레이션 11컷 + 원어민 7음원)

```text
[한국어 Gero]
c00: 분명 아는 단어인데, 왜 안 들릴까요?
c01: 입이 바쁘면 두 단어를 합칩니다.
c02: 첫째, 이 두 단어.
c03: 하나로 쏙 합쳐집니다.
c04: 둘째, 이 두 단어.
c05: 바로 녹아 붙습니다.
c06: 셋째, 이 표현.
c07: 끝이 빠져 스르르 붙죠.
(c08: 무나레이션)
c09: 퀴즈, 어떻게 들릴까요?
c10: 정답은 바로 이 두 단어!
c11: 다섯 개 더 고정 댓글에 있어요.

[원어민 Olin]
give-me.wav: give me
gimme.wav: gimme
let-me.wav: let me
lemme.wav: lemme
kind-of.wav: kind of
kinda.wav: kinda
outta.wav: outta
```
