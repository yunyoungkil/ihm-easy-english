# [규칙 & 사후 검토] 대시보드 무한 초기화(SyntaxError) 근본 원인 분석 및 재발 방지 지침

> **작성일**: 2026-08-30  
> **상태**: 영구 적용 (Active)  
> **적용 대상**: `scripts/youtube-analytics-server.mjs` 및 향후 모든 인라인 클라이언트 스크립트 작성 시

---

## 🚨 1. 사고 개요 및 증상 (Post-Mortem)

* **증상**: 브라우저에서 `http://localhost:3001` 접속 시 데이터(66개 영상)와 백엔드 API가 정상 작동함에도 화면이 **`"YouTube Channel Lab 데이터 초기화 중..."`** 상태에서 영구 멈춤(Infinite Freeze).
* **결과**: `loadAll()`, 탭 전환, 이벤트 리스너 등 클라이언트의 모든 JavaScript가 일체 실행되지 않음.

---

## 🔍 2. 근본 원인 분석 (Root Cause Analysis)

### 원인 1: Node.js 템플릿 리터럴(Backtick)의 2중 평가 왜곡
`youtube-analytics-server.mjs`는 전체 HTML 및 클라이언트 JS를 서버 측 템플릿 리터럴(`` const pageHtml = `...` ``)로 감싸고 있습니다.
서버에서 클라이언트로 HTML을 전달할 때:
1. 서버 템플릿 문자열이 `\n`이나 `\'`을 1차 평가하여 실제 **개행 문자(`0x0A`)** 또는 **단따옴표(`'`)**로 변환하여 HTML을 전송합니다.
2. 브라우저는 전송받은 문자열을 `<script>` 태그 안에서 JavaScript 코드로 2차 파싱합니다.

### 원인 2: 단따옴표 충돌 (`SyntaxError: Unexpected identifier 't'`)
```javascript
// 서버 코드 (잘못된 예시)
'<input type="text" placeholder="예: 30초 만에 Want vs Won\'t 구분법">'
// ➔ 브라우저가 전송받은 실제 JS 코드:
'<input type="text" placeholder="예: 30초 만에 Want vs Won't 구분법">'
//                                                       ^ 여기서 문자열이 닫히고 't'가 문법 오류 유발!
```

### 원인 3: 개행 문자 충돌 (`SyntaxError: Invalid or unexpected token`)
```javascript
// 서버 코드 (잘못된 예시)
gBrandScriptText = "첫째 줄\n둘째 줄";
// ➔ 브라우저가 전송받은 실제 JS 코드:
gBrandScriptText = "첫째 줄
둘째 줄"; // JS에서 일반 따옴표 문자열은 개행 문자를 직접 포함할 수 없어 브라우저 파서 즉시 사망!
```

---

## 🛡️ 3. 재발 방지 황금 원칙 (Golden Rules for AI Agents)

### 원칙 1: 인라인 클라이언트 JS 문자열은 무조건 `${JSON.stringify(...)}` 사용
수동 이스케이프(`\'`, `\"`, `\\n`, `\uXXXX`)를 절대 하지 마십시오.
서버 상단에 일반 텍스트 상수를 선언하고, 인라인 스크립트에서는 `${JSON.stringify(변수)}`로 주입합니다.

```javascript
// ✅ 올바른 패턴:
const SAMPLE_TEXT = `Want와 Won't 발음 구분법!
원어민 혀의 소리 지름길을 모르면 평생 안 들립니다.`;

const pageHtml = `
<script>
  let gBrandScriptText = ${JSON.stringify(SAMPLE_TEXT)};
</script>
`;
```
`JSON.stringify`는 ECMAScript 표준에 따라 모든 따옴표, 역슬래시, 줄바꿈, 특수문자를 브라우저가 100% 안전하게 파싱할 수 있는 유효한 JS 리터럴로 자동 변환합니다.

### 원칙 2: HTML 속성 내부에는 raw 따옴표를 피할 것
HTML placeholder나 title 등에 축약형 단어(`Won't`, `Don't`)를 넣을 때는:
- `Won vs Wont` 처럼 따옴표를 배제하거나,
- HTML 엔티티(`&apos;`) 또는 `esc()` 함수를 사용하십시오.

### 원칙 3: 변경 후 자동 검증 스크립트(`test-client-syntax.mjs`) 필수 실행
`youtube-analytics-server.mjs` 수정 후에는 **반드시** 아래 명령을 실행하여 브라우저 파싱 및 10개 탭 렌더링에 0개의 에러가 발생함을 검증해야 합니다:

```bash
node scripts/test-client-syntax.mjs
```

이 스크립트는 실제 `http://localhost:3001`에서 HTML을 HTTP 요청으로 받아온 뒤, `<script>` 코드를 가상 DOM(Node `vm.Script`)에서 직접 파싱 및 10개 탭 전체를 렌더링하여 문법/런타임 에러를 0.1초 만에 감지합니다.

---

## 📐 4. UI/UX 레이아웃 & A/B 시뮬레이터 설계 절대 규칙

### 규칙 1: A/B 시뮬레이터 좌측 하단 [3열 비교 갤러리] 상시 유지
* 좌측 시안 편집기 하단에는 반드시 **시안 A, B, C의 썸네일, 제목, 선택 상태를 한눈에 볼 수 있는 3열 미니 카드 갤러리**가 존재해야 합니다.
* 사용자가 1클릭으로 시안을 비교 및 전환할 수 있도록 `.btn-ab-tab-select` 이벤트가 바인딩되어야 합니다.

### 규칙 2: 모바일 피드는 반드시 [스마트폰 프레임(mockup-phone)]으로 높이 격리
* 실시간 모바일 피드 미리보기는 절대로 데스크톱 그리드 전체에 세로로 무한히 펼쳐지면 안 됩니다.
* 반드시 **고정 높이(560px)의 스마트폰 프레임(`.mockup-phone`) + 내부 스크롤(`.mockup-feed-scroll`)** 구조를 유지해야 합니다.
* 목적: 사용자가 스크롤을 끝없이 내리지 않고도 바로 아래의 **`GEMINI CTR INTELLIGENCE VERDICT` (AI 진단 리포트)**에 즉시 도달할 수 있도록 좌우 카드 높이 균형(약 600px)을 유지합니다.

### 규칙 3: 롱폼(16:9) vs 쇼츠(9:16) 포맷별 종횡비(Aspect Ratio) 엄수
* **롱폼 (16:9)**:
  - 에디터 드롭존: `aspect-ratio: 16/9; max-width: 100%;`
  - 롱폼 영상 피드: 16:9 와이드 풀너비 카드 + 타임코드 + 아바타/제목 2줄 + 채널정보.
* **쇼츠 (9:16)**:
  - 에디터 드롭존: `aspect-ratio: 9/16; max-width: 180px; margin: 0 auto;` (`object-fit: cover` 필수).
  - 쇼츠 피드 노출: 반드시 **`▶ Shorts` 2열 그리드 선반(`.shorts-shelf`)** 내부에 9:16 세로 카드로 배치 (좌측 상단 뱃지 + 우측 상단 `⋮` + 하단 그라데이션 타이틀 오버레이).
  - 쇼츠를 일반 16:9 가로 카드 안에 찌그러뜨리거나 레터박스(검은 여백)로 넣는 행위 절대 금지.

### 규칙 4: 모바일 유튜브 실물 UI 레이아웃 완벽 동기화 (Image 1 규격)
* **상단바**: `7:49` 시간 + 통신/배터리 아이콘 + YouTube 앱 바(로고, 캐스트, 알림, 검색, 내 프로필).
* **피드 구성 (실물 피드 순서)**:
  1. **상단 1**: 16:9 롱폼 영상 (우리 시안 테스트 노출 카드 또는 실전 경쟁 영상)
  2. **중간 2**: `▶ Shorts` 선반 (**2열 3행 총 6개 쇼츠 카드 그리드**)
  3. **하단 3**: 16:9 롱폼 경쟁 영상 3개 연속 배치 (`tpveKY5pnis`, `pVz-24A2a1o`, `XXTM306pAwQ`)
* **하단 네비게이션 바**: 🏠 홈 | ⚡ Shorts | ➕ | 📺 구독 | 👤 내 페이지 5버튼 고정 렌더링.

### 규칙 5: 롱폼 16:9 썸네일과 쇼츠 9:16 썸네일의 원본 데이터 무결성 엄수
* **롱폼(16:9) 모드**:
  - 반드시 진짜 16:9 가로형 롱폼 영상 썸네일(`OVAeeJxmdw0`, `tpveKY5pnis`, `3PkSwrFIcRE`)만 사용.
  - 쇼츠 영상(`t_wVvVyqdbg`, `5MiM1tIpQQk` 등)의 썸네일은 유튜브가 16:9 프레임 안에 세로 영상을 센터링하고 양옆에 검은 여백/블러 처리를 하므로, 롱폼 기본 샘플로 섞어 넣으면 16:9 박스 안에서 세로 쇼츠 이미지로 보이는 왜곡이 발생함. 절대로 롱폼에 쇼츠 썸네일을 기본 데이터로 넣지 말 것.
* **쇼츠(9:16) 모드**:
  - 실제 쇼츠 영상(`nVrCk8IZFGA`, `t_wVvVyqdbg`, `Si88xXt-EQc`) 또는 9:16 세로형 비율 썸네일만 장착.

### 규칙 6: 변경 후 자동 검증 스크립트 실행
* `node scripts/test-ab-simulator.mjs` 및 `node scripts/test-client-syntax.mjs` 실행 후 100% 통과 확인 필수.
