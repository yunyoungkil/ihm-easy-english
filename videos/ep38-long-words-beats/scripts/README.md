# EP38 제작 보조 스크립트 (2026-11-28, 임시 폴더에서 옮김)

저장소 루트에서 실행한다. 크롬(설치본)과 저장소 `playwright`를 쓰고, 기존 자동화 브라우저(9222·Playwright MCP)는 건드리지 않는 격리 프로필을 쓴다.

| 파일 | 하는 일 | 실행 |
|---|---|---|
| `render-cards.mjs` | 썸네일 A·B·C + 컷 카드 21장을 HTML로 그려 `data/youtube/transform-sheets/images/ep38-long-words-beats/`에 jpg로 저장(넘침 점검 출력). 뒤쪽 "백지 눈 검수 반영" 정의가 앞 정의를 덮어쓴다 | `node videos/ep38-long-words-beats/scripts/render-cards.mjs [thumb-B cut-13 …]` |
| `build-sheet.mjs` | 비교 시트 JSON 조립(컷 시각 = 한글 4.2자/초 + 영어 단어 1.2초 + 쉼). 같은 폴더의 `ep38-blind.json`(백지 눈 결과)을 넣는다 | `node videos/ep38-long-words-beats/scripts/build-sheet.mjs videos/ep38-long-words-beats/scripts/tagcheck-1.json videos/ep38-long-words-beats/scripts/tagcheck-2.json` |
| `validate.mjs` | 시트 검사(`validateSheet`) | `node videos/ep38-long-words-beats/scripts/validate.mjs ep38-long-words-beats` |
| `gen-images.mjs` | `assets/images/visual-prompts.md` 지시문으로 AI 스튜디오 장면 사진 생성(9222 크롬 필요, 있으면 건너뜀) | `node videos/ep38-long-words-beats/scripts/gen-images.mjs [이름]` |
| `yt-tagcheck.mjs` | 태그 후보를 유튜브 검색해 상위 제목 기록(새 화면 구조 `lockupViewModel`) | `node …/yt-tagcheck.mjs <출력.json> "태그1" "태그2"` |

- 장면 사진 원본(`assets/images/*.jpg`)은 git 제외라 다른 PC에서는 구글 드라이브 동기화(`npm run` pc-sync)로 받은 뒤 `render-cards.mjs`를 돌린다.
- 시트를 손으로 고치지 말고 `build-sheet.mjs`를 고쳐 다시 만든다(제목·문구가 여러 칸에 겹쳐 있음).
