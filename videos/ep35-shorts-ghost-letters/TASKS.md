# EP35 작업 기록 — `ep35-shorts-ghost-letters`

- **상태**: **12/15 화 20:00 KST 예약 완료** (`2026-11-24`, 영상 ID `4lKoVEXlm78`, 제목 1안 `살몬에 L이 들어간 이유, 알고 보면 좀 억울해요` + 썸네일 A안 `thumb-A.jpg`, 교육 27, 한국어 `ko`, `containsSyntheticMedia: true`, 재생목록 `PLCbnHG8SDRes`, 한국어 자막 `subtitles-ko.srt` 게시 완료)
- **슬롯**: 2026-12-15 (화) 20:00 KST 단독 쇼츠

## 완료된 단계 (Gate 1 준비)
- [x] 시청 장벽 3종(1초 이탈·5.5초 중도 이탈·엔딩 반발) 진단 및 가설 수립
- [x] 미사용 경쟁 명작 5편(`Bzwd5EdsQGk`, `eGh-AmQzqOc`, `Pr_EB_hK9R4`, `2tvBBqQEoz0`, `rhjcr61ngHA`) 프레임 스트립 직접 시각 검수 (`check-sameness [5]` 반복 편향 0건)
- [x] `kr.pinterest.com` 시각 무드보드 실탐색(핀 6종: `1113796551626780954`, `859343172638778879`, `739786676337600286`, `728105464806604321`, `925278685970260850`, `1135470124814746396`) 및 2026 혼합 미디어·행동심리 리서치
- [x] YouTube 한국 검색 API 15개 태그 실측 검증(적중 10개 선별, 빈 결과 `연어 영어 발음` 제외)
- [x] `FACT-CHECK.md` 어원·Cambridge IPA·과잉 일반화 방지 대조표 작성
- [x] `slop-rewrite`(`check_ai_tells.py` S1 0·S2 0·S3 0, `check_taste.py --strict` 규칙 0, `check_fidelity.py --strict` S1 0) + `style-guide` + `grammar-checker` + `banned-terms` 통과
- [x] Nano Banana 2.1 2×2 연속 스토리보드 그리드 + `split-grid` + 히어로 정지 4장 생성 및 4방 모서리 워터마크 검수
- [x] 썸네일 3안(`thumb-A/B/C.jpg`) + 12컷 카드(`cuts/cut-00~11.png`) + 3×4 시각 스토리보드 시트(`storyboard-sheet.png`) 생성
- [x] `data/youtube/transform-sheets/ep35-shorts-ghost-letters.json` 작성 및 `validateSheet` + `check-sameness` + `npm test` 통과
- [x] 대시보드 비교 시트 화면(`http://localhost:3001/transform-sheet/ep35-shorts-ghost-letters`) 브라우저 직접 열람 검수

## Gate 1 승인 후 진행 단계
- [x] 한국어 TTS 11컷(`Gero`, `c05/c07/c11` `'피 글자'/'비 글자'` 교정 재녹음 포함) + 원어민 5단어(`Olin`, 묵음 완전 무음) 전수 직접 청취 및 실측(`AUDIO-AUDIT.md`, 총 `44.288초`, 음원 겹침 0건)
- [x] Lyria 3.5 BGM(`track.mp3`, 61.4s, 허밍 0 직접 청취 확인) + 커스텀 종이 찢기 SFX 4종(`paper-rip`, `ink-stamp`, `paper-fuse-tick`, `final-peel-chime`) 제작
- [x] HyperFrames 1080×1920 30fps `index.html` 조립(12fps 스톱모션 종이 찢기 + 상단 `01~04` 인덱스 + 4분할 리소 그리드 + `DOUBT` 1.2초 퓨즈 챌린지) → `hyperframes check` + `check-terms` + 12컷 콘택트시트 검수 + **사용자 브라우저 프리뷰 구성 확정 (`2026-11-23`)**
- [x] Omni 1.2 Flash 3클립(`c00-salmon-peel`, `c04-receipt-roll` → `c04-receipt-roll-cut` 뒷부분 튐 제거, `c08-island-peel`) 전수 생성·4모서리 무워터마크·모션 검수 통과 및 `index.html` 직계 `<video>` 연결 (`2026-11-24`)
- [x] 렌더 전 배경음 더킹(`npm run carve -- videos/ep35-shorts-ghost-letters`, `data-fx-carve` strength `0.8`) + 글자 여백 CSS 조정 → `hyperframes check` 통과 + `npm run check-gate -- render` 0건 통과 (`2026-11-24`)
- [x] 최종 MP4 렌더 완료 (`videos/ep35-shorts-ghost-letters/out/ep35-shorts-ghost-letters.mp4`, `1080×1920` 30fps, `44.30s`, `20.4 MB`, mean `-17.6 dB` · max `-1.4 dB`, 렌더본 프레임 스트립 직접 검수 통과) 및 업로드 패키지 생성 (`output/upload-packages/ep35-shorts-ghost-letters/`, `title/description/tags/pinned-comment/subtitles-ko.srt/thumbnail.jpg/sheet-thumbnail-approval.json/metadata.json/shorts-status.json`)
- [x] Gate 3 최종 예약 승인 (`2026-11-24`, 사용자 "예약 올려줘") → 유튜브 스튜디오 예약 완료 (`4lKoVEXlm78`, `2026-12-15T11:00:00Z`, AI 표시 `aria-checked=true`, 재생목록 `PLCbnHG8SDRes`, 교육 27, 한국어 `ko`, 한국어 자막 `subtitles-ko.srt` 게시, 카탈로그·`shorts-status.json` 동기화 완료). 공개 7일 성과 정산은 `2026-12-22(화)` 이후 진행.
