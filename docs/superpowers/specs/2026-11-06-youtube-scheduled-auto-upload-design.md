# YouTube 예약 자동 업로드 및 발행 규칙 대시보드 설계 문서

- **날짜**: 2026-11-06
- **작성자**: Antigravity (Superpowers Brainstorming)
- **상태**: Draft (검토 대기)
- **대상**: `scripts/youtube-analytics-server.mjs`, `data/youtube/`, `output/upload-packages/`

---

## 1. 개요 및 목적 (Intent & Why)

### 배경
현재 채널 '이해하면 쉬운영어'는 롱폼 영상을 제작 완료한 후 `scripts/build-upload-package.mjs` 및 관련 스크립트를 통해 `output/upload-packages/<에피소드ID>/` 폴더에 동영상(`[키워드].mp4`), 썸네일(`thumbnail.jpg`), 제목, 설명, 태그, 고정 댓글, 그리고 `status.json` 메타데이터를 완벽하게 패키징하고 있습니다.

그러나 최종 업로드 단계에서는 사용자가 YouTube Studio에 접속하여 파일을 드래그 앤 드롭하고, 텍스트를 복사/붙여넣기하며, 예약 시각을 수동으로 입력하는 반복 수작업이 필요했습니다.

### 목적
포트 3001에서 상시 가동 중인 로컬 분석 대시보드(`scripts/youtube-analytics-server.mjs`)에 **채널 고정 발행 규칙 설정 UI**와 **백그라운드 예약 업로드 큐(Queue) 워커**를 구축하여, 준비 완료(`ready_to_upload`)된 패키지를 감지하고 채널의 고정 일정에 맞춰 자동으로 YouTube에 예약 업로드(`private` + `publishAt`), 썸네일 등록, 고정 댓글 작성까지 원스톱으로 처리합니다.

---

## 2. 목표, 비목표, 실패 방지 기준 (Goals, Non-Goals, Anti-Goals)

### Goals (달성 목표)
1. **발행 규칙 설정 UI (대시보드)**:
   - 고정 발행 시각 (기본값: 한국시간 23:00 KST / 14:00 UTC).
   - 발행 요일 또는 영상 간 발행 간격 (기본값: 2~3일 간격 또는 특정 요일).
   - 자동 업로드 마스터 스위치 (ON/OFF 토글).
   - 설정을 영구 저장하는 `data/youtube/publish-rules.json`.
2. **업로드 대기 큐 및 상태 관리**:
   - `output/upload-packages/`의 모든 패키지를 스캔하여 `status: "ready_to_upload"` 상태인 패키지를 감지.
   - 이미 예약되었거나(`status: "scheduled"`), 공개된(`status: "published"`) 영상의 마지막 발행일을 기준으로 다음 비어 있는 발행 슬롯을 자동 배정.
   - 대시보드 UI에 큐 목록(대기 중인 영상, 배정된 예정 일시, 상태 표시, [즉시 업로드] 수동 버튼) 제공.
3. **YouTube Data API v3 연동 (분할 업로드 & 예약 설정)**:
   - Resumable Upload(분할 업로드) 프로토콜로 대용량 동영상 안정적 업로드.
   - 메타데이터 자동 주입: 제목(`title.txt`), 설명(`description.txt`), 태그(`tags.txt`).
   - 예약 공개 설정: `status.privacyStatus = "private"`, `status.publishAt = "<계산된 ISO 8601 시각>"`.
   - 커스텀 썸네일 업로드 (`thumbnails.set`).
   - 고정 댓글 작성 (`commentThreads.insert`).
   - 업로드 완료 시 패키지 `status.json`을 `status: "scheduled"`, `videoId: "..."`, `scheduledFor: "..."`로 자동 갱신.

### Non-Goals (이번 범위가 아닌 것)
- YouTube Studio를 통한 기존 수동 업로드 방식을 강제로 막거나 폐기하지 않음 (기존 수동 업로드 동기화 로직은 그대로 유지).
- 다국어 자막 VTT 자동 등록은 1단계 기본 업로드 안정화 이후 후속 확장으로 둠.

### Anti-Goals (절대 방지해야 할 위험)
- **임의 즉시 공개 금지**: 모든 자동 업로드는 반드시 `private` 상태와 `publishAt` 예약 시각이 지정되어야 함. 유튜브의 HD/4K 인코딩 및 저작권 검사 시간을 거치지 않고 즉시 `public`으로 풀리는 사고를 원천 차단.
- **미승인/미완성 패키지 무단 업로드 금지**: `status.json`에 명시적으로 `"status": "ready_to_upload"`가 찍히고 영상 파일과 썸네일이 모두 존재하는 패키지만 큐에 진입.
- **API 할당량 낭비 및 무한 재시도 금지**: 업로드 실패 시 무한 루프로 재시도하지 않고 에러 상태(`upload_failed`)로 기록 후 알림 표출 (YouTube `videos.insert`는 1회당 1,600 할당량 소모).

---

## 3. 제약 사항 (Constraints)

1. **OAuth 2.0 스코프 확장**:
   - 기존 대시보드는 읽기 전용 스코프(`youtube.readonly`, `yt-analytics.readonly`)만 사용 중임.
   - 영상 및 썸네일 업로드, 댓글 작성을 위해 `https://www.googleapis.com/auth/youtube.upload` 및 `https://www.googleapis.com/auth/youtube.force-ssl` 스코프 추가 필요.
   - 스코프 변경 시 사용자가 대시보드 상단의 [채널 재연동(로그인)] 버튼을 1회 클릭하여 권한 승인을 갱신해야 함.
2. **할당량(Quota) 제한**:
   - 기본 프로젝트 일일 할당량은 10,000 유닛.
   - 동영상 업로드 1편당 약 1,650 유닛 소모(동영상 1600 + 썸네일 50 + 댓글 50). 하루 최대 5~6편 업로드 가능하며, 주 2~3회 업로드 채널 특성상 일일 한도는 충분함.

---

## 4. 검토된 접근 방식 (Approaches)

1. **대시보드 통합 자동 스케줄러 (선택됨)**
   - 대시보드 서버(`youtube-analytics-server.mjs`)에 백그라운드 큐 워커 및 설정 UI를 통합.
   - 상시 실행 환경을 그대로 활용하며, 브라우저에서 큐 현황과 설정을 한눈에 모니터링 가능.
2. **독립 스크립트 데몬 + CLI**
   - 별도 데몬 프로세스를 띄워야 하여 운영 부담이 있고 대시보드와의 실시간 동기화 복잡도 증가로 배제.
3. **원클릭 승인형 반자동 큐**
   - 실수 방지에는 좋으나 완전 무인 자동화를 요구하는 사용자의 목적에 부합하지 않음. 대신 **자동 업로드 ON/OFF 토글**과 **개별 즉시 실행 버튼**을 지원하여 유연성 확보.

---

## 5. 상세 구현 명세 (Technical Specification)

### 5.1 설정 파일 스키마 (`data/youtube/publish-rules.json`)
```json
{
  "autoUploadEnabled": false,
  "publishTimeKst": "23:00",
  "scheduleMode": "daysOfWeek",
  "minIntervalDays": 3,
  "allowedDaysOfWeek": [1, 4],
  "maxUploadsPerDay": 1,
  "maxUploadsPerWeek": 2,
  "defaultPrivacy": "private",
  "autoComment": true,
  "updatedAt": "2026-11-06T19:06:00Z"
}
```

### 5.2 예약 발행 슬롯 계산 및 큐 정렬 알고리즘
1. **큐 정렬 기준 (에피소드 순서 보장)**:
   - `output/upload-packages/`의 디렉터리명에서 에피소드 번호(`ep(\\d+)`)를 정규식으로 파싱하여 **오름차순(EP24 ➔ EP25 ➔ EP26 ...)으로 엄격 정렬**합니다. (직전 편 엔딩 화면 연결 및 시리즈 연속성 보장)
2. **발행 일정 산출 (주 2회 기본 배정)**:
   - `scheduleMode: "daysOfWeek"`: 기본 배정 요일은 주 2회(`allowedDaysOfWeek: [1, 4]`, 월요일·목요일) 밤 23:00 KST로 설정.
   - `scheduleMode: "interval"`: 이전 영상 시각 + 최소 3~4일 간격의 23:00 KST를 순차 배정.
3. **업로드 스로틀링(Throttle) 규칙 (할당량 보호 & 채널 페이스 유지)**:
   - **하루 최대 1편 (`maxUploadsPerDay: 1`)**: 지난 24시간 내 자동 업로드된 영상이 있을 경우 당일 추가 업로드를 보류하고 다음 날로 이월.
   - **일주일 최대 2편 (`maxUploadsPerWeek: 2`)**: 최근 7일 내 업로드/예약된 영상이 2편에 도달하면 다음 주 슬롯으로 분산.
4. **YouTube 공식 제약 대응 (댓글 고정)**:
   - YouTube Data API v3에는 댓글을 상단에 고정(`Pin`)하는 공식 엔드포인트가 없습니다 (Google 정책상 UI에서만 가능).
   - 따라서 API로는 패키지의 `pinned-comment.txt` 내용을 첫 번째 댓글로 자동 등록하고, 대시보드 UI에 해당 영상의 YouTube Studio 댓글 관리 직행 링크를 제공합니다.

### 5.3 YouTube Data API v3 업로드 파이프라인
1. **Resumable Upload 초기화**:
   - `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status`
   - Header: `Authorization: Bearer <token>`, `X-Upload-Content-Type: video/mp4`, `X-Upload-Content-Length: <filesize>`
   - Body: `snippet` (title, description, tags), `status` (`privacyStatus: "private"`, `publishAt: <ISO>`).
   - Response: `Location` 헤더의 세션 URI 수신.
2. **청크(Chunk) 스트림 전송**:
   - `PUT <세션 URI>`로 동영상 바이너리를 스트리밍.
   - 업로드 성공 시 반환되는 `videoId` 확보.
3. **썸네일 등록**:
   - `POST https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=<videoId>`
   - Header: `Content-Type: image/jpeg` (또는 `image/png`).
4. **고정 댓글 등록**:
   - `POST https://www.googleapis.com/youtube/v3/commentThreads?part=snippet`
   - Body: `snippet.videoId`, `snippet.topLevelComment.snippet.textOriginal = <pinned-comment.txt>`.
5. **로컬 상태 갱신**:
   - `status.json` 파일에 `status: "scheduled"`, `videoId: "<id>"`, `scheduledFor: "<publishAt>"` 저장.

### 5.4 대시보드 UI 연동
- 상단 탭 또는 에피소드 관리 영역에 **[📅 발행 스케줄 및 업로드 큐]** 섹션 추가.
- 설정 카드: 스위치(ON/OFF), 발행 시간 입력, 간격/요일 선택기, [설정 저장] 버튼.
- 대기 큐 테이블:
  - 에피소드명 / 썸네일 미리보기 / 계산된 발행 예정일시 / 상태 뱃지 (`대기 중`, `업로드 중`, `예약 완료`, `오류`).
  - [지금 바로 업로드] 수동 트리거 버튼.

---

## 6. 구현자에게 위임된 사항 (What's left to the builder)
- Resumable Upload의 청크 크기 최적화 (권장: 8MB 또는 단일 스트림 전송).
- 대시보드 큐 폴링 주기 (권장: 5분마다 감지 검사).
- 업로드 진행률(Progress %) UI 표시 방식.

