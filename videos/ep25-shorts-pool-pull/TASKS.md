# TASKS — ep25-shorts-pool-pull

## 2026-11-09

- 재료: 사용자가 만든 나레이션 1개를 10줄로 잘랐다(쉼 -38dB 0.25초, 붙은 구간은 0.1초로 경계를 찾고 조각마다 whisper로 대본과 대조). 대본에 없는 소리 두 곳(13.31~13.75초 "풀", 18.39~18.70초 "펄")은 버렸다. 원어민 pool·pull은 남성, fool·full은 여성(롱폼에서 복사). 글꼴·배경음·효과음·손 그림은 EP24 쇼츠와 같다. `scripts/prepare-assets.mjs`.
- 화면: `scripts/build-index.mjs`. 네 칸 "풀" 뒤집기 → 입술 그림 두 칸 → 귀로만 맞히기(정답 full) → 마지막 5초 롱폼 안내. 화면을 만든 뒤 배경음 더킹(carve, 세기 0.8)을 자동으로 다시 건다. 42.3초.
- 버그: 스냅샷에서 첫 칸(pool)이 뒤집힌 뒤 계속 빈칸이었다. `fromTo`의 시작값에만 `opacity: 1`을 넣어서, 렌더러가 영상 끝까지 갔다 되돌아오면 뒷면이 투명하게 남았다. `tl.set`으로 따로 보이게 해서 고쳤고, 끝→앞 순서로 시간을 옮겨도 네 칸이 제때 나오는 것을 확인했다. 일반 규칙으로 `knowledge/production-rules.md` "HyperFrames 제작 기준"에 올렸다.
- 검사: HyperFrames check 통과(오류 0, 참고 3건은 "풀" 큰 글자가 글자 칸보다 위아래로 큰 것, 화면에는 문제없음), 글자 대비 22곳 통과, 금지어 없음.
- 검수 의견(Claude): 첫 1초 훅과 롱폼 제목 약속이 맞는다. 10~28초가 같은 입술 그림 2장으로 가장 약한 구간일 수 있다(짐작, 숫자 없음). 입 그림 두 칸 장면과 마지막 안내가 EP24 쇼츠와 같아서, EP26 쇼츠는 그 장면을 바꿔 세 편을 견주기로 했다(사용자 결정, 계획은 `videos/ep26-shorts-right-light/BRIEF.md` "세 쇼츠 비교").
- 렌더(사용자 승인): 1080x1920, 30fps, 42.3초, 56초 걸림. 렌더본 프레임에서 pool 칸이 나오는 것을 확인했다.
- 업로드 패키지: `output/upload-packages/ep25-shorts-pool-pull/`에 `Pool_vs_Pull_English_Pronunciation_Listening_Quiz_Shorts.mp4`, 제목·설명(13줄)·태그 14개·고정 댓글·한국어 자막·`multilingual-metadata.json`(한국어만, EP24 쇼츠와 같음)을 넣었다. `status.json`은 두지 않는다. 금지어 없음, 대시보드 EP25 카드의 SHORTS-A 탭에 "패키징 완료"로 보이는 것을 실제 응답으로 확인했다.
- 다음(사용자): 스튜디오에서 올리고 11/14(토) 20:00 예약, 쇼츠 썸네일(`thumbnail.jpg`)과 자막 올리기, 언어 두 칸 한국어. EP25 롱폼이 공개된 뒤 "관련 동영상"에 EP25 롱폼 지정.
