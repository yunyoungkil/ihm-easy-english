# SCRIPT — ep33-shorts-swallowed-t

- **제목**: 버튼과 커튼, 원어민은 '트'를 아예 안 읽고 코로 넘깁니다
- **썸네일**: `thumb-A.jpg` (황동 엘리베이터 버튼 매크로 + `버튼 ❌ → 버·은 ⭕`)
- **비교 시트**: `data/youtube/transform-sheets/ep33-shorts-swallowed-t.json`
- **시트 목표 길이**: 44.0초 (12컷, 분당 16.4컷 — 오디오 실측 후 `assets/audio-timings.json` 기준으로 최종 컷 경계 확정)
- **상단 훅 타이포 (검은 띠 없음, 가로 정중앙 대칭, `top ≥ 232px`)**:
  - 1줄: `버튼·커튼·마운틴`
  - 2줄: `**'트'를 안 읽습니다**`

## 12컷 대본 · 시트 시간 · 음성 · SFX 계획

| 컷 | 시트 시작(t) | 시트 길이 | 구도 | 이미지 | 한국어 나레이션 (Gero) | 원어민 음성 (Olin) | 핵심 SFX | 생각 창 | 하단 자막 |
|---:|---:|---:|---|---|---|---|---|---|---|
| 0 | 0.0s | 3.6s | `tactile-object-shock-hook` | `bg-button.jpg` | 버튼, 원어민은 '트'를 안 읽습니다. | 없음 | - | 0s | 버튼, 원어민은 '트'를 안 읽습니다 |
| 1 | 3.6s | 3.8s | `nose-route-diagram` | `bg-craft-lock.jpg` | 티 뒤에 엔이 오면 코로 넘깁니다. | 없음 | - | 0s | T 뒤에 N이 오면 · 입 잠금 → 코로 '은' |
| 2 | 7.4s | 2.8s | `craft-split-button` | `bg-button.jpg` | 첫째, 버튼. | `button` (`button.wav`) | - | 0s | 첫째, 버튼 · button |
| 3 | 10.2s | 3.9s | `swallow-stop-reveal` | `bg-button.jpg` | 입을 막고 코로 뺍니다. | `button` (`button.wav`) | `breath-lock.wav` | 0s | 입을 막고 코로 뺍니다 · 버·은 |
| 4 | 14.1s | 2.8s | `linen-curtain-frame` | `bg-curtain.jpg` | 둘째, 커튼. | `curtain` (`curtain.wav`) | - | 0s | 둘째, 커튼 · curtain |
| 5 | 16.9s | 3.9s | `swallow-stop-reveal` | `bg-curtain.jpg` | 트 없이 코로 넘깁니다. | `curtain` (`curtain.wav`) | `breath-lock.wav` | 0s | 트 없이 코로 넘깁니다 · 커·은 |
| 6 | 20.8s | 2.9s | `tiltshift-mountain-card` | `bg-mountain.jpg` | 셋째, 마운틴. | `mountain` (`mountain.wav`) | - | 0s | 셋째, 마운틴 · mountain |
| 7 | 23.7s | 3.8s | `swallow-stop-reveal` | `bg-mountain.jpg` | 티가 쏙 숨어 버리죠. | `mountain` (`mountain.wav`) | `breath-lock.wav` | 0s | 티가 쏙 숨어 버리죠 · 마운·은 |
| 8 | 27.5s | 3.8s | `triple-rhythm-echo` | - | (없음, 무나레이션) | `button`, `curtain`, `mountain` | - | 0s | '트'가 사라진 소리만 연달아 들어 보세요 |
| 9 | 31.3s | 5.3s | `speech-gate-challenge` | `bg-craft-lock.jpg` | 마지막, 직접 말해 보세요! | 없음(정답 선공개 금지) | `gate-tick.wav` | 1.5s | 1.5초 안에 '트' 없이 말해 보세요! |
| 10 | 36.6s | 3.8s | `stamp-payoff-reveal` | `bg-important.jpg` | 임포턴트 대신 이렇게요. | `important` (`important.wav`) | `stamp-pass.wav` | 0s | 임포턴트 대신 이렇게요 · 임포·른 |
| 11 | 40.4s | 3.6s | `craft-checklist-cta` | - | 보너스 네 단어는 고정 댓글에 있어요. | 없음 | - | 0s | 보너스 네 단어는 고정 댓글에 있어요! |

> **퀴즈 정답 보호 규칙 준수 (`production-rules.md`)**: 컷 9(`speech-gate-challenge`)는 시청자가 1.5초 동안 직접 `important`를 말해 보는 챌린지이므로 정답 발음(`important.wav`)을 선공개하지 않고, 컷 10 버밀리온 '통과! 정답' 스탬프 이후에 공개한다.

## TTS 대본 원문 (한국어 나레이션 11컷 + 원어민 4음원)

```text
[한국어 Gero]
c00: 버튼, 원어민은 '트'를 안 읽습니다.
c01: 티 뒤에 엔이 오면 코로 넘깁니다.
c02: 첫째, 버튼.
c03: 입을 막고 코로 뺍니다.
c04: 둘째, 커튼.
c05: 트 없이 코로 넘깁니다.
c06: 셋째, 마운틴.
c07: 티가 쏙 숨어 버리죠.
(c08: 무나레이션)
c09: 마지막, 직접 말해 보세요!
c10: 임포턴트 대신 이렇게요.
c11: 보너스 네 단어는 고정 댓글에 있어요.

[원어민 Olin — 미국 일상 구어 성문 막힘 + 콧소리 넘김 [ʔn̩]]
button.wav: button
curtain.wav: curtain
mountain.wav: mountain
important.wav: important
```
