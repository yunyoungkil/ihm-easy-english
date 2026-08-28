# SCRIPT — ep10-shorts-b-faceless

**Voice:** Charon (Google Studio TTS, ko-KR)
**Voice settings:** 채널 기본 설정 유지 (EP10 쇼츠A와 동일)
**Voice direction:** 친구한테 편하게 알려주는 톤. 쇼츠A보다 살짝 더 캐주얼하게 — 퀴즈 진행자가 아니라 대화 상대처럼.

---

## Line 1 — 질문 (Frame 2)

**Time:** 3.0 – 6.0s
**Delivery:** 친근하게, 진짜 궁금해서 묻는 톤. 정답 발음("소셜")은 여기서 말하지 않는다.

    SOCIAL, 발음이 헷갈리시나요?

## Line 2 — 반전 (Frame 3)

**Time:** 6.0 – 11.0s
**Delivery:** "어? 그러네" 하는 발견의 톤. 여기서 처음으로 정답 발음 "소셜"이 공개된다.

    근데 우리 이미 맨날 '소셜'이라고 하잖아요.

## Line 3 — 원리 (Frame 4)

**Time:** 11.0 – 16.0s
**Delivery:** 설명 톤, 조금 느리게.

    왜 소셜일까요? 이 부분이 항상 '셜' 소리가 나거든요.

## Line 4 — 규칙 정리 (Frame 5)

**Time:** 16.0 – 20.0s
**Delivery:** 정리하는 톤, 확신 있게.

    이렇게 끝나는 단어는 다 '셜'로 읽어요.

---

**narration-lint 참고**: "-CIAL"은 `scripts/narration-lint.mjs`의 `SUFFIX_REPLACEMENTS`(TION/TURE/IC)에 없는
미등록 접미사 조각이라 그대로 나레이션에 넣으면 TTS가 글자별로 끊어 읽을 위험이 있다. 화면에는
"-CIAL로 끝나면 → 셜"을 텍스트로 보여주고, 나레이션에서는 "이 부분"/"이렇게 끝나는"으로 돌려 말해
문제되는 조각을 아예 소리 내지 않는다. "SOCIAL"은 완전한 단어라 `VERIFIED_WORDS`에는 없지만 그대로
시도하고, 생성된 음성을 들어본 뒤 문제없으면 `VERIFIED_WORDS`에 추가한다.

---

Frame 1(질문 전송)과 Frame 6(채널 브랜딩)은 나레이션 없음 — 무음 + 효과음(전송음/타이핑음)만.
