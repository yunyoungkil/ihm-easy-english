# TASKS — ep33-test-ai-craft (시험, 업로드하지 않음)

## 2026-11-21 밤 (Claude Opus 5.5, DESKTOP-UA9AKL2)
- [x] BRIEF.md: EP33 0~13.0초를 같은 소리·같은 글로, 화면만 생성 영상 위주로 다시 만든다.
- [x] 소리 복사(EP33 FACT-CHECK 통과본): `assets/voice/c00~c03.wav`, `assets/voice-en/button.wav`, `assets/sfx/breath-lock.wav`, `assets/bgm/track.mp3`. 새 음성은 만들지 않았다.
- [x] 기준 그림 2장(`assets/keyframes/key-v1·v2`) → v2 채택(패널의 둥근 호출 버튼이 S1과 이어지고, 창밖 찬빛·천장 따뜻한 빛이 섞임). 인물 참고는 `ref-woman-kitchen.jpg`(앞 시험 그림, 얼굴·나이만).
- [x] 장면 그림 S1~S4 각 2장 → 모두 v1 채택(S1 버튼이 가운데라 S3 단추와 모양 매치컷, S2 완전 옆얼굴이라 콧김이 잘 보임, S3 단추가 코트 가운데, S4 단추가 이미 단춧구멍에 반쯤 들어감). 네 모서리 워터마크 없음(구석 확대 확인).
- [x] Omni 360p 시험본: s1-a·s1-b(거의 같음, a 채택), s2-b(콧김이 역광에 하얗게 — 채택), s3-b(채택, 셋 중 가장 약함). s2-a·s3-a·s4-a·s4-b는 한도로 실패.
- [x] 각 클립의 환경음을 `assets/clips/s1~s3-amb.wav`로 따로 빼서 `<audio>`로 깔았다(영상은 muted).
- [x] index.html: 영상 3개 + S4 임시 그림, 위 훅·아래 자막은 EP33과 같은 글, 훅 낱말 `버튼 → 버·은`(EP33 첫 컷과 같은 시각), `but · ton`의 `t`가 단추와 함께 빠지는 글자 움직임(breath-lock 11.965초).
- [x] `npx hyperframes@0.9.77 check`: 0 error, 텍스트 대비 33/33 WCAG AA, Check passed. 남은 경고: 새 0.9.77의 안전 영역 경고(위 훅 top 236px·아래 자막 bottom 336px — EP33과 같은 위치라 그대로 둠), 끝 줄 `버·은` 0.83초(13초에서 자른 시험이라 그렇다), 한 파일에 시간 요소 많음.
- [x] `npm run check-terms -- videos/ep33-test-ai-craft`: 금지어 없음.
- [x] CLI 고정 버전 0.9.19 → 0.9.77로 올림(skill 안내, check 통과로 확인). EP33은 0.9.19 그대로.

## 2026-11-22 오후 (Gemini 4 Neon, Antigravity)
- [x] S4 360p 시험본 2개(`s4-a-360.mp4`, `s4-b-360.mp4`, `--parent s4-v1.jpg`, `--status candidate`): 둘 다 2.25초 시점에 단추가 단춧구멍으로 완전히 사라짐(breath-lock 11.965초 - 시작 9.686초 = 2.279초와 일치), 워터마크 없음 → `v-s4.txt` 지시문 확정.
- [x] S1~S4 1080p 본생성(`s1-1080.mp4`~`s4-1080.mp4`, 1080×1920, `--parent`·`--changed-var "resolution:360p->1080p"`·`--status chosen` 실브라우저 첫 검증 완료) + 환경음 `s1~s4-amb.wav` 추출.
- [x] `media-craft-tools.mjs` 실측: `compare-visual-metrics`로 S3 밝기 단차(`99.44` vs S4 `113.30`) 확인 → `unify-tone`으로 `s3-1080-graded.mp4` 보정. `lineage` 트리 계보 확인 완료.
- [x] `index.html` src를 S1~S4 1080p(`s3-1080-graded.mp4` 포함)로 교체, `amb4` 연결, S4 임시 그림과 확대 트윈 삭제. `.word .dot`·`.shade` 대비 보강 후 `npx hyperframes@0.9.77 check` 통과(0 error, Contrast 33/33 WCAG AA, Audio 0 error, Motion 0 error).
- [x] `npx hyperframes@0.9.77 snapshot --at "0.3,2,5,8.5,11,12.5" --no-end --against` EP33 렌더 비교 완료 → 사용자 렌더 승인 대기(렌더는 승인 뒤에만).
