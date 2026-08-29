# YouTube Studio CTR 다운로드 폴더 자동 낚아채기 (Downloads Auto-Ingest) 구현

마지막 갱신: 2026-08-29

## 배경 및 계기

YouTube Data API / Analytics API v2는 보안 및 비즈니스 정책상 **노출수(Impressions)**와 **노출 클릭률(CTR)**을 공식 API로 제공하지 않는다. 따라서 롱폼 썸네일·제목 패키징 성과를 추적하려면 YouTube Studio 웹 화면에서 CSV/ZIP 형태로 내보내야 한다.

기존에는 사용자가:
1. YouTube Studio에서 ZIP 파일을 다운로드
2. 다운로드 폴더를 열어 압축 해제
3. `imports/youtube-studio/` 폴더를 찾아 드래그 앤 드롭 복사
4. 대시보드를 새로고침하거나 재스캔 버튼 클릭

위의 번거로운 4단계 수동 작업을 거쳐야 했다. 이 모든 수작업을 **0단계(스튜디오에서 내보내기 버튼 클릭 1회로 끝)**로 줄이기 위해 **다운로드 폴더 실시간 자동 낚아채기(Downloads Auto-Ingest & Realtime Watcher)** 시스템을 구축했다.

---

## 아키텍처 및 구현

### 1. 전용 모듈: `scripts/studio-auto-ingest.mjs`

- **다운로드 폴더(`C:\Users\...\Downloads`) 실시간 감시 (`fs.watch`)**:
  - 브라우저 다운로드 완료 감지 (`.crdownload`, `.tmp` 임시 파일 제외 및 디바운스).
  - YouTube Studio 내보내기 파일 패턴 자동 식별 (`콘텐츠 *.zip`, `표 데이터*.zip` 등).
- **무인 자동 압축 해제 & 이동**:
  - Windows 기본 내장 도구(PowerShell `Expand-Archive` / `tar`)를 활용해 임시 디렉토리에 자동 압축 해제.
  - 내부에 포함된 `표 데이터.csv`, `총계.csv`를 추출하여 `imports/youtube-studio/<콘텐츠폴더명>/`으로 자동 이동 및 임시 파일 정리.

### 2. 서버 및 대시보드 실시간 동기화 (`scripts/youtube-analytics-server.mjs`)

- **서버 부팅 시 백그라운드 Watcher 자동 가동**:
  - `npm run analytics` 서버가 실행되는 동안 다운로드 폴더와 Studio import 폴더를 상시 감시.
  - 서버 시작 시 다운로드 폴더에 기존에 받아둔 Studio ZIP 파일이 있으면 즉시 자동 수집.
- **Server-Sent Events (SSE, `/api/events`) 실시간 브로드캐스팅**:
  - 새 ZIP/CSV가 감지되어 영상에 매칭되는 즉시 브라우저 대시보드에 실시간 이벤트 전송.
  - 대시보드 UI에 즉시 토스트 알림 표시: `🎉 스튜디오 CTR 데이터가 자동 감지되어 연결되었습니다! (<영상제목>)`.
  - 현재 `Studio CTR 트래커` 탭을 보고 있다면 화면 새로고침 없이 실시간으로 카드가 갱신됨.

---

## 사용자 경험 변화

| 구분 | 이전 (수동) | 개선 후 (완전 무인) |
|---|---|---|
| **스튜디오 다운로드** | 내보내기 클릭 | **내보내기 클릭** |
| **압축 해제** | 다운로드 폴더 열고 수동 압축 풀기 | **시스템 자동 처리 (0초)** |
| **프로젝트 폴더 이동** | `imports/youtube-studio`로 복사 | **시스템 자동 이동 (0초)** |
| **대시보드 반영** | 대시보드 새로고침 / 재스캔 클릭 | **SSE 실시간 즉시 반영 (0초)** |
