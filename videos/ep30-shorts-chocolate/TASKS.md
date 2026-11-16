# TASKS — ep30-shorts-chocolate (쇼츠, 세로 1080x1920, 30fps)

## 한 일 (2026-11-16, 영상 조립까지. 렌더는 하지 않았다)
- `scripts/build-index.mjs`를 새로 써서 `index.html`과 `subtitles/subtitles-ko.srt`를 만든다. 화면 글자는 비교 시트 `data/youtube/transform-sheets/SbQVBQoRciA.json`의 `rows[4].ours.cutPlan.cuts`(14컷)에서 읽는다(손으로 옮겨 적지 않음). 타이밍은 `assets/voice/nNN.wav` 길이(ffprobe)와 `nNN.words.json` 실측으로 계산한다.
- 모든 화면은 코드(HTML/CSS/GSAP). 새 이미지 파일 없음. 글꼴은 `assets/fonts/NotoSansKR-subset.ttf`(ep29에서 복사, 이 편의 한글·영문 글자가 모두 들어 있음을 확인. 화살표 `→`만 없어 SVG로 그림).
- 컷 사이 0.25초 크로스페이드, 카드 등장 때 튕김(0.92→1), 컷 내내 1→1.03 확대. 템플릿별 장면 안 움직임(글자 올라오기, 빠지는 글자 회색+빨간 사선 그리기, 형광펜, 마음→맘 줄어들기, 줄 차례로 들어오기, 퀴즈 낱말 글자 통통).
- BGM과 원어민 단어 음성은 파일이 있을 때만 `index.html`에 들어간다(빌드 스크립트가 파일 유무를 본다). 파일이 바뀌면 `node videos/ep30-shorts-chocolate/scripts/build-index.mjs`를 다시 돌린다(전체 길이와 컷 시작 시각이 같이 바뀐다).
- 시트 카드와 음절 점 규칙이 다름: 시트를 따름(빠지는 글자 표시가 핵심이라 `cof·fee`식 점을 넣지 않았다).

## 남은 일
- BGM 대기: `assets/bgm/track.mp3`가 없다. 만들면 빌드 스크립트를 다시 돌려 넣는다(볼륨 0.06, 음성 구간 carve, 끝 1초 페이드).
- 원어민 단어 음성: 지금 `chocolate-natural`, `vegetable-natural`, `different-natural`, `memory-natural`이 있어 contrast(컷1)·vowel-drop(컷2)·word-drop(컷5, 7, 9)에 들어갔다(`-careful`은 쓰지 않음). 이 파일들은 제미나이가 같은 시각에 만들었고 소리 내용은 확인하지 못했다.
- 사용자 검수(첫인상 한 단어)와 렌더 승인.
- 렌더 뒤 `output/upload-packages/`로 복사와 업로드 메타데이터(제목·설명·고정 댓글)는 별도 단계.

## 확인하지 못한 것
- 음성 소리 내용(정확히 읽었는지), BGM(없음), 원어민 단어 음성의 소리 품질.
- 실제 재생 중 움직임의 느낌(스냅샷은 정지 화면이라 움직임 속도·타이밍감은 못 봄).
- `npm run check-layout`은 화면 크기를 1920x1080 가로로 고정해 두어, 세로 영상에서 아래쪽 1080px 밖 글자는 모두 "화면 밖"으로 잡힌다(검사기의 한계). 그 외 남은 건은 글자가 올라오거나 튕기는 도중 순간의 줄 상자 비교다.
- `hyperframes check`의 경고 16건은 구조 권고다(장면 14개가 최상위 요소로 들어 있어 "서브 컴포지션으로 나누라", 트랙 10·11에 요소 7개씩). 오류 0건.
- 컷 9(멤리)는 `n10.words.json`에서 "멤리"가 길이 0(0.734초)으로 잘못 잡혀 있어, ffmpeg `silencedetect`로 잰 발화 시작(0.356초)을 써서 회색+사선 시점을 0.36초로 정했다.
