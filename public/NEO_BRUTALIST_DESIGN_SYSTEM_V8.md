# Neo-Brutalist Design System

> **Design direction:** Bold. Loud. Systematic. Usable.  
> 이 문서는 첨부된 레퍼런스 이미지를 기준으로 재구성한 네오 브루탈리스트(Neo-Brutalist) UI 디자인 가이드입니다.  
> 웹/앱 UI, 랜딩페이지, 대시보드, 프로토타입 및 AI 코딩 도구의 디자인 컨텍스트로 사용할 수 있습니다.

---

## 1. Core Principles

### 1.1 Visual Identity
- 굵고 명확한 **검은색 외곽선**
- 직각에 가까운 **사각형 구조**
- 제한된 **강한 포인트 컬러**
- 높은 명암 대비
- 정렬이 분명한 그리드
- 장식보다 정보 전달 우선
- 클릭/선택/포커스 상태를 즉시 인지할 수 있어야 함

### 1.2 Usage Rules
1. 기본 외곽선은 `3px solid #000000`.
2. 카드, 버튼, 입력창은 둥근 SaaS 스타일보다 **각진 형태**를 우선한다.
3. 그림자는 흐릿한 블러보다 **딱 떨어지는 오프셋 그림자**를 사용한다.
4. 한 화면에서 주요 강조색은 1~2개만 사용한다.
5. 모든 주요 인터랙션 요소는 hover / active / focus 상태를 가진다.
6. Focus는 항상 눈에 보여야 한다.
7. 장식용 그라디언트는 사용하지 않는다.
8. UI가 복잡해질수록 색상보다 **선, 간격, 타이포 위계**로 구조를 만든다.

---

# 2. Foundations

## 2.1 Color Tokens

| Token | HEX | 용도 |
|---|---:|---|
| `--color-black` | `#000000` | 외곽선, 헤딩, 아이콘, 기본 텍스트 |
| `--color-white` | `#FFFFFF` | 역상 텍스트, 입력창 내부 |
| `--color-paper` | `#F5F5DC` | 기본 배경 |
| `--color-teal` | `#00C2C8` | Primary / 정보 / 활성 상태 |
| `--color-magenta` | `#FF00FF` | 강한 강조 / Alert / Destructive 변형 |
| `--color-yellow` | `#FFD700` | Secondary 강조 / Warning / Step |
| `--color-success` | `#28C76F` | 성공 상태 |
| `--color-danger` | `#FF3B30` | 오류 / 위험 |
| `--color-muted` | `#D9D9D9` | Disabled / 비활성 UI |

### Color Rules
- 기본 배경: `paper`
- 기본 텍스트: `black`
- Primary action: `teal`
- 경고/주의: `yellow`
- 강한 경고 또는 파괴적 액션: `magenta` 또는 `danger`
- 텍스트 대비가 부족해지면 포인트 컬러 위에도 검은색 텍스트를 우선한다.

---

## 2.2 Typography

### Font Direction
- Sans-serif
- Heavy / Black 계열 웨이트 선호
- 헤딩은 압축감 있고 강한 인상
- 본문은 가독성을 위해 과도한 굵기 금지

추천 폰트 예시:
- `Arial Black`
- `Inter`
- `Helvetica Neue`
- `Pretendard`
- `Noto Sans KR`

### Type Scale

| Token | Size | Weight | Usage |
|---|---:|---:|---|
| `H1` | `96px` | `900` | Giant Heading |
| `H2` | `64px` | `900` | Large Heading |
| `H3` | `48px` | `800` | Medium Heading |
| `H4` | `32px` | `800` | Small Heading |
| `Body` | `18px` | `400–600` | 기본 본문 |
| `Caption` | `14px` | `500` | 보조 설명 |

### Typography Rules
- 헤딩은 가능하면 대문자 또는 짧고 강한 문구 사용.
- 섹션 제목에는 굵은 밑줄 또는 하단 경계선을 사용할 수 있다.
- 본문 줄 간격: `1.4–1.6`.
- 지나치게 긴 중앙 정렬 문장은 사용하지 않는다.

---

## 2.3 Spacing Scale

기본 spacing unit은 `4px`.

```txt
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96
```

### Recommended Usage
- 아이콘과 텍스트 사이: `8px`
- 버튼 내부 padding: `12px 16px`
- 폼 요소 간격: `12px–16px`
- 카드 내부 padding: `16px–24px`
- 컴포넌트 그룹 간격: `24px–32px`
- 섹션 간격: `48px–96px`

---

## 2.4 Borders

```css
--border-thin: 2px solid #000;
--border-default: 3px solid #000;
--border-heavy: 4px solid #000;
```

### Radius
네오 브루탈리즘에서는 radius를 최소화한다.

```css
--radius-none: 0px;
--radius-sm: 4px;
--radius-md: 8px;
```

기본값은 `0–4px`.

---

## 2.5 Elevation / Shadow

흐린 Material Design식 그림자보다 **단단한 오프셋 그림자**를 사용한다.

```css
--shadow-0: none;
--shadow-1: 4px 4px 0 #000;
--shadow-2: 8px 8px 0 #000;
--shadow-3: 12px 12px 0 #000;
```

### Rules
- 카드/버튼의 기본 강조: `shadow-1`
- 중요한 모달/CTA: `shadow-2`
- hover 시 그림자를 키우기보다 **위치를 1~2px 이동**시키는 방식 권장

---

# 3. Grid & Layout

## 3.1 Grid
- 모든 요소는 명확한 수평/수직 정렬을 유지한다.
- 기준 간격은 spacing scale만 사용한다.
- 카드 너비와 높이가 제각각 되지 않게 패턴을 통일한다.
- 섹션 경계는 굵은 `black rule`을 사용할 수 있다.

## 3.2 Container
```css
.container {
  width: min(1200px, calc(100% - 32px));
  margin: 0 auto;
}
```

## 3.3 Responsive Rule
- Desktop: 12-column
- Tablet: 8-column
- Mobile: 4-column
- 모바일에서도 외곽선 두께를 지나치게 줄이지 않는다.

---

# 4. Components

## 4.1 Buttons

### Primary
- Fill: Teal
- Text: Black
- Border: Black 3px
- Shadow: 4px 4px 0 Black

```css
.btn-primary {
  background: #00C2C8;
  color: #000;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  padding: 12px 16px;
  font-weight: 800;
}
```

### Secondary / Outline
```css
.btn-secondary {
  background: #F5F5DC;
  color: #000;
  border: 3px solid #000;
}
```

### Destructive
- Magenta 또는 red 계열
- 사용 전 의미를 명확히 표시

### Button Interaction
```css
button:hover {
  transform: translate(-1px, -1px);
}

button:active {
  transform: translate(3px, 3px);
  box-shadow: 1px 1px 0 #000;
}

button:focus-visible {
  outline: 4px solid #FFD700;
  outline-offset: 3px;
}
```

### Minimum Touch Target
- 최소 `44 × 44px`

---

## 4.2 Inputs

### Default
- 배경: White 또는 Paper
- Border: 3px Black
- 높이: 최소 44px

```css
.input {
  min-height: 44px;
  background: #fff;
  border: 3px solid #000;
  padding: 10px 12px;
}
```

### Error
- 빨간색/마젠타 외곽선
- 에러 메시지는 입력창 바로 아래

### Helper Text
- 14px
- 검은색 또는 muted tone
- 핵심 정보만 짧게

---

## 4.3 Checkbox / Radio / Toggle

### Checkbox
- 빈 상태: white + black border
- 선택 상태: black fill + white check

### Radio
- 둥근 테두리 허용
- 선택된 중심점은 black

### Toggle
- OFF: black 또는 neutral
- ON: yellow
- 텍스트 라벨을 병기하면 더 명확함

---

## 4.4 Tabs

### Active Tab
- Teal fill
- Black text
- Black border

### Secondary Active
- Yellow 사용 가능

### Inactive
- Paper background
- 최소한의 border 또는 underline

---

## 4.5 Step Indicator

예:
```txt
[1] ───── [2] ───── [3]
```

- 현재 단계: Teal
- 다음 단계: Yellow 또는 Paper
- 완료 단계: Black + White text

---

## 4.6 Pagination
- Previous / Next는 외곽선 버튼
- 선택 페이지는 Teal fill
- 숫자 박스 간격 일정하게 유지

---

# 5. Data Display

## 5.1 Card

```css
.card {
  background: #F5F5DC;
  border: 3px solid #000;
  box-shadow: 4px 4px 0 #000;
  padding: 16px;
}
```

### Card Structure
1. 이미지/아이콘
2. Bold title
3. 짧은 설명
4. Primary action

---

## 5.2 List Item
- 행 전체를 하나의 클릭 영역으로 취급
- leading icon/avatar + title + metadata + arrow
- 행 사이에는 2–3px border 또는 spacing

---

## 5.3 Badge

| Type | Style |
|---|---|
| New | Black background + White text |
| Alert | Magenta |
| Warning | Yellow |
| Info | Teal |

Badge는 작지만 외곽선과 대비를 유지한다.

---

## 5.4 Avatar
- 정사각형 또는 원형
- Black border 필수
- Accent color 사용 가능

---

## 5.5 Table

### Rules
- Header: Black background / White text
- Cell: Paper/White
- Row divider: 2px Black
- Sortable column은 화살표를 명확히 표시
- Action column을 오른쪽에 고정하는 방식 권장

---

## 5.6 Tooltip
- Black background
- White text
- 작은 화살표
- 14px 이하 본문
- 핵심 정보만 짧게 제공

---

# 6. Feedback

## 6.1 Toast
스택형 메시지.

- Info → Teal
- Success → Green
- Warning → Yellow
- Error → Magenta / Red

```txt
[ICON] MESSAGE                              ×
```

---

## 6.2 Alert Banner
페이지 내 중요 메시지에 사용.

- 상태 아이콘
- 제목
- 짧은 설명
- 필요하면 Action 1개

한 배너에서 액션을 너무 많이 제공하지 않는다.

---

## 6.3 Modal Confirm

### Structure
```txt
┌─────────────────────────┐
│ MODAL CONFIRM           │
│ 설명 텍스트              │
│                         │
│ [CANCEL]   [CONFIRM]    │
└─────────────────────────┘
```

### Rules
- Thick black border
- Strong shadow
- Confirm는 Teal
- Dangerous confirm은 Magenta/Red
- 기본 focus가 의도치 않게 destructive에 가지 않도록 주의

---

## 6.4 Progress Bar
- Black outline
- 내부 progress는 Teal 또는 Yellow
- `%` 숫자를 병기해도 좋음

---

## 6.5 Empty State
- 단순 아이콘
- “NO ITEMS YET”와 같은 명확한 제목
- 보조 설명
- Primary CTA 1개

---

# 7. Icons

## Style
- 단색 Black
- 굵은 선
- 작은 크기에서도 형태가 즉시 읽혀야 함
- 장식적 3D/그라디언트 아이콘 금지

권장 유형:
- Close
- Check
- Settings
- Arrow
- User
- Trash
- Search
- Menu

---

# 8. Accessibility

## Contrast
- 본문 텍스트는 WCAG 대비를 우선한다.
- 밝은 Teal/Yellow 위에는 기본적으로 Black text를 사용한다.

## Focus
**Focus is always visible.**

```css
:focus-visible {
  outline: 4px solid #FFD700;
  outline-offset: 3px;
}
```

## Touch Target
- 버튼/아이콘 최소 `44px`

## Keyboard
- 모든 인터랙션은 keyboard 접근 가능해야 한다.
- hover에만 의존한 정보 전달 금지.

---

# 9. Motion

네오 브루탈리즘의 모션은 짧고 직접적이어야 한다.

```css
transition: transform 100ms ease, box-shadow 100ms ease;
```

### Rules
- 과도한 bounce 금지
- 긴 fade 금지
- 클릭 시 눌리는 느낌을 `translate + shadow 감소`로 구현

---

# 10. CSS Design Tokens

```css
:root {
  /* Colors */
  --color-black: #000000;
  --color-white: #FFFFFF;
  --color-paper: #F5F5DC;
  --color-teal: #00C2C8;
  --color-magenta: #FF00FF;
  --color-yellow: #FFD700;
  --color-success: #28C76F;
  --color-danger: #FF3B30;
  --color-muted: #D9D9D9;

  /* Typography */
  --font-sans: Inter, Pretendard, "Noto Sans KR", Arial, sans-serif;

  --font-size-h1: 96px;
  --font-size-h2: 64px;
  --font-size-h3: 48px;
  --font-size-h4: 32px;
  --font-size-body: 18px;
  --font-size-caption: 14px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  /* Border */
  --border-thin: 2px solid #000;
  --border-default: 3px solid #000;
  --border-heavy: 4px solid #000;

  /* Radius */
  --radius-none: 0;
  --radius-sm: 4px;
  --radius-md: 8px;

  /* Shadow */
  --shadow-0: none;
  --shadow-1: 4px 4px 0 #000;
  --shadow-2: 8px 8px 0 #000;
  --shadow-3: 12px 12px 0 #000;
}
```

---

# 11. Tailwind-style Mapping

```txt
bg-paper       → #F5F5DC
bg-teal        → #00C2C8
bg-magenta     → #FF00FF
bg-yellow      → #FFD700
text-black     → #000000

border-brutal  → 3px solid #000
shadow-brutal  → 4px 4px 0 #000
shadow-heavy   → 8px 8px 0 #000

radius-brutal  → 0–4px
```

---

# 12. AI / Code Generation Rules

AI가 이 디자인 시스템을 기반으로 UI를 생성할 때 아래 지침을 따른다.

## MUST
- 굵은 검은색 외곽선을 유지한다.
- 배경은 밝은 paper tone을 기본으로 한다.
- Teal / Magenta / Yellow를 핵심 accent로 쓴다.
- CTA는 시각적으로 명확하게 구분한다.
- Focus state를 반드시 구현한다.
- Section heading과 정보 hierarchy를 강하게 만든다.
- 카드와 버튼에는 hard offset shadow를 우선한다.

## MUST NOT
- Glassmorphism 사용 금지
- 반투명 blur panel 금지
- Pastel gradient 남용 금지
- 지나치게 둥근 pill UI 남용 금지
- 모든 요소에 그림자를 넣지 않는다.
- 저대비 gray-on-gray UI 금지
- 한 화면에 너무 많은 accent color 동시 사용 금지

---

# 13. Example Component

```html
<article class="brutal-card">
  <span class="badge">NEW</span>
  <h3>Bold title</h3>
  <p>Short and direct supporting copy.</p>
  <button class="btn-primary">PRIMARY ACTION</button>
</article>
```

```css
.brutal-card {
  background: var(--color-paper);
  border: var(--border-default);
  box-shadow: var(--shadow-2);
  padding: var(--space-6);
}

.brutal-card h3 {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-h4);
  font-weight: 900;
}

.badge {
  display: inline-block;
  background: var(--color-magenta);
  border: 2px solid #000;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.btn-primary {
  min-height: 44px;
  background: var(--color-teal);
  border: var(--border-default);
  box-shadow: var(--shadow-1);
  padding: 12px 16px;
  font-weight: 900;
  cursor: pointer;
}
```

---

# 14. Quick Visual Checklist

UI를 완료하기 전에 확인한다.

- [ ] 가장 중요한 액션이 한눈에 보이는가?
- [ ] 모든 주요 박스의 검은색 outline이 일관적인가?
- [ ] Accent color를 과도하게 사용하지 않았는가?
- [ ] Heading / Body / Caption 위계가 명확한가?
- [ ] spacing이 4px scale을 따르는가?
- [ ] Focus가 항상 보이는가?
- [ ] 버튼 최소 높이가 44px 이상인가?
- [ ] disabled 상태가 명확한가?
- [ ] error / success / warning 상태가 즉시 구분되는가?
- [ ] 그림자가 blur가 아니라 hard offset 형태인가?
- [ ] 모바일에서도 디자인 특징이 유지되는가?

---

## Final Design Statement

> **Thick black strokes. Squared corners. Limited radiant accents. Strict alignment. High contrast. Focus always visible.**
>
> 디자인은 시끄러울 수 있지만, 사용성은 절대 시끄러워서는 안 된다.


---

# 15. Editorial Roadmap / Learning Infographic Pattern

> **Reference direction:** 종이 위에 직접 구성한 듯한 따뜻한 에디토리얼 레이아웃 + 단계별 로드맵 + 손글씨 포인트를 기존 Neo-Brutalist 시스템에 통합한다.  
> 기존 디자인 시스템의 **굵은 위계, 높은 가독성, 명확한 카드 구조**는 유지하되, 이 패턴에서는 검은 하드 섀도와 네온 컬러를 줄이고 **Paper / Ink / Olive** 중심의 차분한 학습 콘텐츠 스타일을 사용한다.

## 15.1 When to Use

이 변형은 다음 콘텐츠에 우선 사용한다.

- 학습 로드맵
- 단계별 가이드
- 커리큘럼
- 체크리스트
- 튜토리얼 포스터
- 교육용 인포그래픽
- YouTube 학습 화면 / 커뮤니티 이미지
- PDF 학습자료
- “1 → 2 → 3 → …” 순서가 중요한 콘텐츠

---

## 15.2 Visual Character

핵심 인상:

```txt
EDITORIAL
+ PAPER
+ HAND-DRAWN
+ STRUCTURED CARDS
+ NUMBERED STEPS
+ DOTTED JOURNEY LINE
+ MUTED OLIVE ACCENT
```

### 기존 Neo-Brutalist와의 관계

**유지**
- 강한 타이포 위계
- 명확한 구획
- 높은 대비
- 카드 기반 정보 구조
- 기능 중심 디자인
- 한눈에 읽히는 단계 번호

**완화**
- 모든 요소의 3~4px 검은 테두리
- 네온 Teal / Magenta / Yellow의 동시 사용
- 과도한 hard shadow
- 지나치게 공격적인 CTA 표현

이 패턴은 **Soft Editorial Brutalism** 변형으로 취급한다.

---

# 16. Editorial Color Tokens

기존 토큰을 삭제하지 않고 아래 토큰을 추가한다.

```css
:root {
  --editorial-paper: #F2EEE5;
  --editorial-paper-light: #F8F5EE;
  --editorial-ink: #171815;
  --editorial-olive: #4F6045;
  --editorial-olive-dark: #374330;
  --editorial-sage: #7C8A72;
  --editorial-warm-gray: #B8B0A4;
  --editorial-line: #353A31;
  --editorial-note: #E8DFC9;
}
```

### Color Ratio

권장 비율:

```txt
Paper / Neutral     70–80%
Black / Ink         15–20%
Olive / Sage         5–10%
Other Accent         0–5%
```

### Rules

- 페이지 전체 배경은 순백색보다 `--editorial-paper`를 우선한다.
- 본문은 `--editorial-ink`.
- 단계 번호, 키워드, 소제목 강조에는 Olive.
- 한 화면에서 강한 색상은 기본적으로 Olive 하나만 사용한다.
- 기존 Teal / Magenta / Yellow는 특별한 상태 표시가 아니면 이 패턴에서 사용하지 않는다.

---

# 17. Editorial Typography

## 17.1 Three-Level Font Personality

이 패턴에서는 서체 역할을 세 종류로 분리한다.

### A. Display / Hero
손으로 쓴 브러시 또는 마커 느낌.

용도:
- 페이지 최상단 메인 제목
- 감성적인 짧은 문구
- 강한 한두 단어

```css
.editorial-display {
  font-family: "Arial Black", "Pretendard", sans-serif;
  font-weight: 900;
  letter-spacing: -0.03em;
}
```

> 실제 handwritten/brush 폰트를 사용할 경우에도 **본문에는 사용하지 않는다.**

### B. Structural Heading
굵고 좁은 Sans-serif.

용도:
- `PYTHON ROADMAP`
- `GET STARTED`
- `FUNCTIONS`
- 섹션 제목

```css
.editorial-heading {
  font-family: Inter, Pretendard, "Noto Sans KR", sans-serif;
  font-weight: 900;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}
```

### C. Body
깔끔한 Sans-serif.

```css
.editorial-body {
  font-family: Inter, Pretendard, "Noto Sans KR", sans-serif;
  font-weight: 500;
  line-height: 1.55;
}
```

### D. Handwritten Annotation
메모, 격려 문구, 작은 설명에만 사용.

예:

```txt
one step at a time
keep going
you got this
learn · grow · build
```

전체 텍스트의 약 `5–10%` 이하로 제한한다.

---

# 18. Hero Header Pattern

권장 구조:

```txt
        [small doodle]

    MAIN HUMAN TITLE
  KEYWORD  ROADMAP

   [AUDIENCE / SUBTITLE]

 short handwritten supporting line
```

예:

```txt
ENGLISH READING
PRONUNCIATION ROADMAP

[ FOR COMPLETE BEGINNERS ]

외우지 말고, 하나씩 이해하기
```

### Hierarchy

1. 감성/브랜드 제목
2. 핵심 검색 키워드
3. 대상 사용자
4. 짧은 보조 문장

### Rules

- Hero 영역이 전체 상단의 약 `20–28%`를 차지할 수 있다.
- 제목을 카드 안에 가두지 않는다.
- 핵심 키워드 중 한 단어만 Olive로 강조 가능.
- Subtitle은 검거나 Olive인 solid label로 처리할 수 있다.

---

# 19. Roadmap Grid

Desktop 기본:

```txt
┌─────────────────────┐    ┌─────────────────────┐
│  1   STEP TITLE     │    │  2   STEP TITLE     │
│      • item         │    │      • item         │
│      • item         │    │      • item         │
└─────────────────────┘    └─────────────────────┘
          · · · · · · · · ·
┌─────────────────────┐    ┌─────────────────────┐
│  3   STEP TITLE     │    │  4   STEP TITLE     │
│      • item         │    │      • item         │
└─────────────────────┘    └─────────────────────┘
```

### Grid Rules

```css
.roadmap-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px 56px;
}
```

- 기본 2열.
- 각 행은 가능한 한 비슷한 높이를 유지.
- 읽는 순서는 `좌 → 우 → 다음 행`.
- Mobile에서는 1열로 변경.
- 카드 사이 공간을 충분히 두어 journey line이 지나갈 공간을 확보한다.

---

# 20. Roadmap Step Card

## 20.1 Anatomy

```txt
     ● 1
┌─────────────────────────┐
│      STEP TITLE         │
│                         │
│ [icon]  • Key point     │
│         • Key point     │
│         • Key point     │
│         • Practice      │
└─────────────────────────┘
```

구성:

1. Step Number
2. Step Title
3. Optional Icon
4. 3–6개의 핵심 항목
5. Optional example / practice

## 20.2 Card Style

이 패턴에서는 기존 Brutalist card보다 테두리를 얇게 한다.

```css
.roadmap-card {
  position: relative;
  background: var(--editorial-paper-light);
  border: 1.5px solid var(--editorial-line);
  border-radius: 12px;
  padding: 24px 24px 22px;
  box-shadow: none;
}
```

### Rules

- 기본 shadow 없음.
- radius는 예외적으로 `8–14px` 허용.
- 카드 배경은 전체 paper보다 아주 조금 밝게.
- 카드 내부를 색으로 채우지 않는다.
- 카드마다 다른 색을 사용하지 않는다.

---

# 21. Number Badge

단계 번호는 이 패턴의 가장 강한 네비게이션 요소다.

```css
.step-number {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;

  border-radius: 50%;
  background: var(--editorial-olive-dark);
  color: #fff;

  font-size: 26px;
  font-weight: 900;
}
```

### Placement

- 카드 왼쪽 상단 테두리에 살짝 겹친다.
- 카드 본문보다 시각적 우선순위가 높아야 한다.
- 번호 크기/위치는 모든 카드에서 동일해야 한다.

### Do Not

- 단계마다 badge 색을 바꾸지 않는다.
- 번호에 gradient를 넣지 않는다.
- 숫자를 지나치게 작게 만들지 않는다.

---

# 22. Journey / Dotted Path

로드맵의 진행 흐름은 **점선 경로**로 연결할 수 있다.

```css
.journey-line {
  stroke: var(--editorial-olive-dark);
  stroke-width: 3;
  stroke-dasharray: 8 10;
  fill: none;
}
```

### Visual Logic

```txt
STEP 1  · · · · → STEP 2
                    ·
                    ·
STEP 3  ← · · · · ·
·
·
STEP 5  · · · · → STEP 6
```

### Rules

- 선은 카드 뒤쪽 레이어에 배치한다.
- 카드 내부 텍스트를 가로지르지 않는다.
- 작은 원형 waypoint를 사용할 수 있다.
- 화살표는 필수가 아니다.
- 경로가 정보보다 더 눈에 띄면 안 된다.
- 모바일에서는 점선을 제거하고 세로 connector로 단순화할 수 있다.

---

# 23. Educational Icons

아이콘은 장식이 아니라 **단계 의미를 빠르게 이해시키는 역할**을 한다.

권장:

- Laptop
- Terminal
- Code
- Flowchart
- Database
- Function
- Package
- Document
- Target
- Book
- Audio
- Speech
- Pencil

### Style

```txt
Simple
Outline / Flat
1–2 colors
No 3D
No glossy effect
No complex illustration
```

### Icon Color

- Ink
- Olive
- 필요 시 Warm Gray

아이콘은 카드당 최대 1개의 대표 아이콘을 기본으로 한다.

---

# 24. Hand-Drawn Decorative Elements

사용 가능:

- 작은 왕관
- 하트
- 체크 표시
- 짧은 underline
- 손그림 화살표
- 작은 별
- 메모 테이프
- handwritten annotation

### Rule

장식은 **콘텐츠 구조를 보조**해야 한다.

```txt
Recommended decorative density:
전체 화면 면적의 약 5% 이하
```

장식이 학습 항목보다 눈에 띄면 제거한다.

---

# 25. Sticky Note Pattern

보조 메시지는 포스트잇 스타일로 표현할 수 있다.

```css
.sticky-note {
  background: var(--editorial-note);
  padding: 16px;
  transform: rotate(2deg);
  box-shadow: 2px 3px 8px rgb(0 0 0 / 12%);
}
```

용도:

- 학습 팁
- 짧은 격려
- 주의 사항
- 보조 설명

예:

```txt
Learn.
Understand.
Use it.
```

Sticky note에는 핵심 학습 내용을 넣지 않는다.

---

# 26. Bottom Resource / Quote Panel

로드맵 마지막에는 하나의 넓은 footer card를 둘 수 있다.

```txt
┌────────────────────────────────────────────────────┐
│ “ SHORT QUOTE ”          USEFUL RESOURCES          │
│                                                    │
│ small illustration       • Resource 1              │
│                          • Resource 2              │
│                          • Resource 3              │
└────────────────────────────────────────────────────┘
```

사용 목적:

- 요약
- 다음 행동
- 참고자료
- 격려 문구
- CTA

### Rules

- 위의 Step card와 시각적으로 구분하되 같은 paper family 유지.
- 정보는 최대 2개 그룹.
- CTA가 있다면 1개만 Primary로 강조.

---

# 27. Content Density Rules

로드맵 카드 하나의 권장 정보량:

```txt
Title:       2–4 words
Bullets:     3–6
Bullet:      2–8 words
Icon:        0–1
Example:     0–1
```

### Avoid

```txt
긴 문단
7개 이상의 bullet
카드 안의 또 다른 카드
복잡한 표
여러 CTA
과도한 색상
```

로드맵의 목적은 **설명 전체를 담는 것**이 아니라  
**전체 학습 구조를 한눈에 이해시키는 것**이다.

---

# 28. Responsive Roadmap

## Desktop

```txt
Hero
↓
2-column roadmap
↓
Footer resource panel
```

## Tablet

2열을 유지하되:
- gap 축소
- hero typography 축소
- decorative objects 감소

## Mobile

```txt
Hero
 ↓
STEP 1
 │
STEP 2
 │
STEP 3
 │
STEP 4
 ↓
Footer
```

```css
@media (max-width: 720px) {
  .roadmap-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
```

모바일에서는 복잡한 S자 점선 대신 간단한 세로선 사용을 권장한다.

---

# 29. Editorial Brutalist Component Tokens

```css
:root {
  --roadmap-bg: var(--editorial-paper);
  --roadmap-card-bg: var(--editorial-paper-light);

  --roadmap-text: var(--editorial-ink);
  --roadmap-accent: var(--editorial-olive);
  --roadmap-accent-strong: var(--editorial-olive-dark);

  --roadmap-border: 1.5px solid var(--editorial-line);
  --roadmap-radius: 12px;

  --roadmap-card-padding: 24px;
  --roadmap-grid-x: 56px;
  --roadmap-grid-y: 24px;

  --roadmap-step-size: 48px;
}
```

---

# 30. AI Generation Rules — Roadmap Variant

AI가 로드맵/교육 인포그래픽을 생성할 때:

## MUST

- 전체 배경을 warm paper tone으로 만든다.
- 명확한 상단 Hero hierarchy를 만든다.
- 핵심 키워드 하나를 Olive로 강조한다.
- 단계는 큰 원형 숫자 badge로 표시한다.
- 단계 카드는 2열 또는 모바일 1열로 정렬한다.
- 카드당 핵심 bullet은 3–6개로 제한한다.
- 단계 간 진행 관계가 필요하면 dotted journey line을 사용한다.
- 아이콘은 단순한 교육용 outline/flat icon을 사용한다.
- 장식용 handwritten 요소는 제한적으로 사용한다.
- 정보의 가독성을 장식보다 우선한다.

## MUST NOT

- 카드마다 다른 무지개 색을 사용하지 않는다.
- neon cyberpunk 스타일로 변경하지 않는다.
- glassmorphism을 사용하지 않는다.
- heavy drop shadow를 모든 카드에 적용하지 않는다.
- 모든 텍스트를 handwritten font로 만들지 않는다.
- 점선이 텍스트 또는 아이콘 위를 지나가게 하지 않는다.
- 사진/소품이 콘텐츠보다 더 큰 비중을 차지하게 하지 않는다.
- 작은 글씨로 정보를 과밀하게 넣지 않는다.

---

# 31. Roadmap Layout Prompt Specification

디자인 생성 또는 코딩 시 아래 구조를 기본 템플릿으로 사용한다.

```txt
Create an editorial neo-brutalist educational roadmap.

STYLE
- warm off-white paper background
- black ink typography
- muted olive green as the single primary accent
- strong editorial hierarchy
- subtle hand-drawn details
- structured and highly readable
- no gradients
- no glassmorphism
- minimal or no card shadows

HEADER
- oversized expressive title
- large bold roadmap keyword
- dark solid subtitle label
- short handwritten supporting phrase

ROADMAP
- 2-column grid on desktop
- 1-column grid on mobile
- 6–8 numbered step cards
- large olive circular number badges overlapping card corners
- thin dark borders
- softly rounded rectangular cards
- 3–6 concise bullets per card
- one simple educational icon per card
- dotted olive path connecting steps without crossing text

FOOTER
- one wide resource/quote panel
- optional small handwritten annotation
- one clear next action

PRIORITY
1. readability
2. hierarchy
3. learning sequence
4. visual personality
5. decoration
```

---

# 32. Combined Design Decision

프로젝트에서 두 스타일을 다음처럼 구분한다.

| Context | Recommended Variant |
|---|---|
| 앱 UI / Dashboard | Core Neo-Brutalist |
| 버튼 / Form / Modal | Core Neo-Brutalist |
| 강한 CTA 페이지 | Core Neo-Brutalist |
| 학습 로드맵 | Editorial Roadmap |
| 교육 포스터 | Editorial Roadmap |
| 커리큘럼 소개 | Editorial Roadmap |
| YouTube 학습 인포그래픽 | Editorial Roadmap |
| 단계별 설명 화면 | Editorial Roadmap |

### Final Rule

> **UI interaction은 Core Neo-Brutalist.  
> 학습 구조와 스토리텔링은 Editorial Roadmap.**

두 스타일을 한 화면에서 사용할 경우 **색상 체계와 타이포 위계는 하나로 통일**하고,  
컴포넌트 표현 방식만 목적에 따라 선택한다.


---

# 33. Korean Font System

> Editorial Roadmap 변형에서 한글을 사용할 경우, 하나의 폰트로 통일하기보다 **제목 / 구조 / 본문 / 손글씨 포인트의 역할을 분리**한다.  
> 기본 추천 조합은 **Gmarket Sans + Pretendard + Nanum Pen Script**이다.

## 33.1 Primary Korean Font Stack

| 역할 | 추천 폰트 | Weight | 용도 |
|---|---|---:|---|
| Hero / Poster Title | **Gmarket Sans Bold** | `700–900` | 가장 큰 메인 제목, 핵심 키워드 |
| Section / Step Title | **Pretendard ExtraBold** | `800` | 단계 제목, 섹션 제목, 카드 제목 |
| Body / Bullet | **Pretendard Medium** | `500` | 설명, 학습 내용, Bullet |
| Caption / Metadata | **Pretendard Regular** | `400` | 보조 설명, 작은 정보 |
| Handwritten Accent | **Nanum Pen Script** | `400` | 짧은 메모, 격려 문구, 감성 포인트 |

---

## 33.2 Hero / Poster Title

### Font
**Gmarket Sans Bold**

예:

```txt
영어 발음 로드맵
영어 읽기 8단계
원어민 발음의 원리
```

### Recommended Style

```css
.kr-hero-title {
  font-family: "Gmarket Sans", Pretendard, sans-serif;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.04em;
}
```

### Rules
- 큰 제목 전용.
- 짧고 강한 문구에 사용한다.
- 핵심 단어 하나를 Olive로 강조할 수 있다.
- 긴 본문이나 작은 Bullet에는 사용하지 않는다.

---

## 33.3 Section / Step Title

### Font
**Pretendard ExtraBold**

예:

```txt
1. 소리부터 시작
2. 모음의 원리
3. 강세 이해하기
4. 문장으로 연결하기
```

```css
.kr-step-title {
  font-family: Pretendard, "Noto Sans KR", sans-serif;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.025em;
}
```

단계 제목은 장식적인 폰트보다 **즉시 읽히는 굵은 고딕체**를 우선한다.

---

## 33.4 Body / Bullet

### Font
**Pretendard Medium**

```css
.kr-body {
  font-family: Pretendard, "Noto Sans KR", sans-serif;
  font-weight: 500;
  line-height: 1.55;
  letter-spacing: -0.01em;
}
```

### Rules
- 학습 설명의 기본 폰트.
- 긴 문장에서도 가독성을 유지한다.
- 작은 크기에서는 지나치게 얇은 `300–400` weight를 피한다.
- 교육 콘텐츠에서는 디자인 개성보다 읽기 편한 것을 우선한다.

---

## 33.5 Caption

### Font
**Pretendard Regular**

용도:

```txt
예외
TIP
발음 포인트
추가 설명
STEP 1 OF 8
```

```css
.kr-caption {
  font-family: Pretendard, "Noto Sans KR", sans-serif;
  font-weight: 400;
  line-height: 1.45;
}
```

---

## 33.6 Handwritten Accent

### Font
**Nanum Pen Script**

이미지의 handwritten annotation과 같은 역할이다.

예:

```txt
외우지 말고, 하나씩 이해하기 ♡

오늘은 이것 하나만!

천천히 해도 괜찮아요.

소리를 먼저 들어보세요.
```

```css
.kr-handwriting {
  font-family: "Nanum Pen Script", cursive;
  font-weight: 400;
  line-height: 1.35;
}
```

### Critical Rule

손글씨 폰트는 **전체 텍스트의 약 5% 이하**를 권장한다.

사용:
- 짧은 격려
- 메모
- 작은 annotation
- 감성적인 한 문장

사용하지 않음:
- 학습 본문
- 긴 설명
- 핵심 규칙
- 작은 크기의 정보
- 여러 Bullet

---

# 34. Korean Typography Hierarchy

권장 예시:

```txt
[ Gmarket Sans Bold ]
영어 읽기 로드맵

[ Pretendard ExtraBold ]
완전 초보를 위한 8단계

[ Pretendard ExtraBold ]
1. 알파벳은 이름보다 소리부터

[ Pretendard Medium ]
• C는 위치에 따라 소리가 달라집니다.
• 모음 뒤의 E가 앞 모음 소리를 바꿉니다.
• 단어의 강세 위치를 먼저 확인합니다.

[ Nanum Pen Script ]
외우지 말고, 하나씩 이해하기 ♡
```

### Visual Priority

```txt
1. Gmarket Sans Bold
        ↓
2. Pretendard ExtraBold
        ↓
3. Pretendard Medium
        ↓
4. Pretendard Regular
        ↓
5. Nanum Pen Script = decorative accent
```

손글씨가 시각적 위계에서 본문보다 중요한 정보를 담당해서는 안 된다.

---

# 35. Korean Font Size Guide

교육용 로드맵 기준 권장값:

| Element | Desktop | Mobile | Weight |
|---|---:|---:|---:|
| Hero Title | `64–88px` | `38–52px` | 700–900 |
| Hero Keyword | `56–72px` | `34–46px` | 700–900 |
| Subtitle | `20–26px` | `16–20px` | 700–800 |
| Step Title | `22–28px` | `20–24px` | 800 |
| Body | `16–19px` | `16–18px` | 500 |
| Caption | `13–15px` | `13–14px` | 400–500 |
| Handwriting | `18–26px` | `17–22px` | 400 |

> 이미지/PDF/YouTube 콘텐츠에서는 실제 출력 해상도와 시청 거리에 따라 상대적으로 확대한다.

---

# 36. Korean Font Pairing Rules

## Recommended

```txt
Gmarket Sans Bold
        +
Pretendard ExtraBold / Medium / Regular
        +
Nanum Pen Script
```

### 역할

```txt
Gmarket Sans
→ Personality

Pretendard
→ Structure + Readability

Nanum Pen Script
→ Human Touch
```

## Alternative Safe Stack

특정 폰트를 사용할 수 없는 환경에서는:

```css
font-family:
  Pretendard,
  "Noto Sans KR",
  "Apple SD Gothic Neo",
  "Malgun Gothic",
  sans-serif;
```

---

# 37. Korean Typography — MUST / MUST NOT

## MUST

- 본문은 가독성이 높은 고딕 계열을 사용한다.
- Hero와 본문의 폰트 역할을 구분한다.
- Step title은 최소 `700–800` weight를 사용한다.
- 한글 제목의 자간은 약간 좁게 설정할 수 있다.
- 한글 본문 line-height는 최소 `1.45` 이상 확보한다.
- 작은 교육용 텍스트는 Pretendard Medium을 기본으로 한다.
- 손글씨는 짧은 포인트 문구에만 사용한다.

## MUST NOT

- 모든 텍스트에 Gmarket Sans Bold를 사용하지 않는다.
- 모든 텍스트에 손글씨 폰트를 사용하지 않는다.
- 작은 본문에 지나치게 얇은 폰트를 사용하지 않는다.
- Hero에 서로 다른 장식 폰트를 여러 개 섞지 않는다.
- 한 화면에서 3개 이상의 주력 font personality를 만들지 않는다.
- 가독성을 희생하면서 원본 영문 디자인을 그대로 흉내 내지 않는다.

---

# 38. Korean Editorial Typography Final Rule

> **제목에는 개성, 구조에는 힘, 본문에는 가독성, 손글씨에는 인간적인 느낌.**

```txt
HERO          → Gmarket Sans Bold
STEP TITLE    → Pretendard ExtraBold
BODY          → Pretendard Medium
CAPTION       → Pretendard Regular
HANDWRITING   → Nanum Pen Script
```

이 조합을 **Editorial Roadmap의 기본 한글 Typography Preset**으로 사용한다.


---

# 39. Swiss Geometric Editorial System

> 이 섹션은 사용자가 제공한 **기하학적 포스터 레퍼런스**를 기준으로 한다.  
> 핵심은 장식용 도형을 추가하는 것이 아니라, **원·반원·사각형·삼각형·선·여백·대형 타이포그래피를 정보 구조 자체로 사용하는 것**이다.
>
> 기존 Editorial Roadmap이 “순서와 학습 여정”을 보여주는 시스템이라면, 이 변형은 **한 가지 개념을 강렬하게 설명하거나 비교·분해·결합하는 화면**에 사용한다.

## 39.1 Visual DNA

```txt
SWISS / MODERNIST
+ GEOMETRIC
+ ASYMMETRIC GRID
+ OVERSIZED TYPE
+ PRIMARY SHAPES
+ LIMITED BOLD COLORS
+ LARGE NEGATIVE SPACE
+ MICRO METADATA
```

핵심 특징:

- 거대한 원 / 반원 / 사각형
- 일부가 잘린 형태
- 도형끼리 접하거나 겹치는 구성
- 강한 검정 타이포그래피
- 비대칭이지만 정교한 그리드
- 극단적인 크기 대비
- 넓은 여백
- 작은 번호 / 캡션 / 메타데이터
- 한 화면에 하나의 강한 시각적 아이디어

---

# 40. Swiss Geometric Color Palette

레퍼런스의 시각적 특성을 반영한 별도 컬러 세트.

```css
:root {
  --swiss-paper: #F4F1EC;
  --swiss-black: #111111;

  --swiss-blue: #1769AA;
  --swiss-yellow: #FFC515;
  --swiss-orange: #F04416;
  --swiss-green: #119B67;
  --swiss-pink: #EFA0B6;

  --swiss-gray: #D8D5CF;
}
```

### Recommended Ratio

```txt
Paper / Negative Space    45–60%
Black                     10–20%
Primary Accent            15–25%
Secondary Accent           5–15%
Other Colors               0–10%
```

### Color Rules

- 한 화면에 모든 색을 반드시 사용하지 않는다.
- 기본적으로 `Black + Paper + 2~3 Accent Colors`.
- 색상은 장식보다 **형태와 정보 그룹을 구분**하는 데 사용한다.
- 같은 의미는 같은 색으로 유지한다.
- 색상만으로 정답/강세/상태를 전달하지 않는다.

---

# 41. Geometric Shape Vocabulary

기본 형태:

```txt
● Circle
◐ Half Circle
◒ Split Circle
■ Square
▰ Rectangle
▲ Triangle
Capsule
Arc
Stripe
Grid
```

## 41.1 Circle

용도:

- 핵심 개념
- 음절
- 소리 단위
- 강조
- 반복
- 그룹

## 41.2 Half Circle

용도:

- 변화 전 / 후
- 반대 개념
- 분리
- 결합 과정

## 41.3 Rectangle

용도:

- 단어
- 문장 조각
- 정보 영역
- 구조적 기반

## 41.4 Triangle

용도:

- 방향
- 변화
- 연결
- 원인 → 결과

## 41.5 Stripes

용도:

- 리듬
- 반복
- 패턴
- 보조 영역

Striped pattern은 작은 면적에서만 사용한다.

---

# 42. Shape Construction Rules

## MUST

- 기본 도형부터 시작한다.
- 형태는 명확한 수학적 구조를 유지한다.
- 원과 반원은 정확한 비율을 우선한다.
- 서로 다른 도형이 한 기준선에 맞도록 정렬한다.
- 도형 일부를 canvas 밖으로 잘라낼 수 있다.
- 큰 형태와 작은 형태 사이에 명확한 크기 대비를 만든다.

## MUST NOT

- 무작위 blob shape를 남용하지 않는다.
- 의미 없는 장식 도형을 여러 개 추가하지 않는다.
- 3D bevel을 사용하지 않는다.
- glossy effect를 사용하지 않는다.
- gradient를 기본 스타일로 사용하지 않는다.
- 모든 도형에 outline을 강제로 넣지 않는다.

---

# 43. Asymmetric Grid

이 스타일은 중앙 정렬보다 **비대칭 그리드**를 적극적으로 사용한다.

예:

```txt
┌─────────────────────────────┐
│ TITLE TITLE                 │
│ TITLE                       │
│                             │
│       ●●●●●                 │
│       ●●●●●        small    │
│   ███████████       text     │
│   ███████████                │
│                             │
│  01                metadata │
└─────────────────────────────┘
```

### Rules

- 비대칭 ≠ 무작위.
- 모든 요소에는 보이지 않는 alignment line이 있어야 한다.
- 한쪽에 큰 시각적 질량이 있으면 반대편은 여백 또는 작은 텍스트로 균형을 잡는다.
- 중심 정렬은 특별한 이유가 있을 때만 사용한다.

---

# 44. Oversized Typography

레퍼런스의 `Origami`처럼 제목 자체가 그래픽 요소가 될 수 있다.

```css
.swiss-display {
  font-family: Pretendard, Inter, "Noto Sans KR", sans-serif;
  font-weight: 900;
  font-size: clamp(64px, 11vw, 160px);
  line-height: 0.88;
  letter-spacing: -0.06em;
}
```

### Korean

추천:

```txt
Pretendard Black
Gmarket Sans Bold
Noto Sans KR Black
```

### Rules

- 제목은 1~4단어를 우선한다.
- 큰 제목과 작은 설명 사이의 크기 차이를 과감하게 만든다.
- 제목을 도형과 겹치게 할 수 있지만 읽을 수 있어야 한다.
- 한글은 지나치게 좁은 자간으로 글자 형태가 무너지지 않도록 한다.

---

# 45. Macro Type + Micro Type Contrast

이 스타일의 중요한 특징:

```txt
VERY LARGE TITLE

               tiny metadata
               issue 01
               pronunciation series
```

권장 대비:

```txt
Hero          72–160px
Section       28–48px
Body          16–20px
Metadata      10–13px
```

Micro text는 장식용이 아니라 다음 정보를 담당한다.

- Episode
- Lesson number
- Category
- Rule name
- Date
- Series
- Short caption

교육 콘텐츠에서 실제 학습 내용은 지나치게 작은 Micro text로 만들지 않는다.

---

# 46. Negative Space

여백은 빈 공간이 아니라 **구성 요소**다.

### Recommended

- 전체 화면의 최소 `25–35%`는 숨 쉴 공간으로 남길 수 있다.
- 도형과 제목 사이에 의도적인 큰 공백을 허용한다.
- 모든 공간을 설명으로 채우지 않는다.

### Principle

> **한 화면 = 한 가지 시각적 주장**

설명이 많아지면 다음 화면으로 분리한다.

---

# 47. Geometric Learning Visualization

이 스타일을 교육 콘텐츠에 사용할 때 도형은 **개념의 구조를 보여주는 역할**을 한다.

## 47.1 Combination

```txt
GOING      TO

  ●    +    ●

      ↓

    GONNA
```

두 개의 독립된 형태가 하나로 합쳐지는 시각 구조.

## 47.2 Stress

```txt
in   for   MA   tion

○    ○     ●     ○
```

강세 음절만 크기 또는 색으로 강조.

## 47.3 Weak → Strong

```txt
○  →  ◐  →  ●
```

소리 변화 또는 강도의 변화를 단계적으로 표현.

## 47.4 Before / After

```txt
┌────────────┬────────────┐
│ BEFORE     │ AFTER      │
│    ○       │     ●      │
└────────────┴────────────┘
```

## 47.5 Split / Merge

```txt
WORD
 ↓
◐ + ◐
 ↓
SOUND
```

단어의 분해와 소리 조립 설명에 활용한다.

---

# 48. Educational Shape Semantics

프로젝트 전체에서 도형 의미를 반복적으로 사용할 경우 아래처럼 고정할 수 있다.

| Shape | Suggested Meaning |
|---|---|
| Large Circle | 핵심 소리 / 핵심 개념 |
| Small Circle | 보조 음절 / 약한 소리 |
| Half Circle | 변화 중 / 부분 |
| Two Overlapping Shapes | 결합 / 축약 |
| Triangle | 방향 / 이동 / 변화 |
| Rectangle | 단어 / 문장 단위 |
| Stripe | 반복 / 리듬 |
| Black Shape | 가장 강한 강조 |
| Accent Shape | 학습 포인트 |

의미를 한 번 정했다면 같은 시리즈에서 임의로 변경하지 않는다.

---

# 49. Shape + Typography Relationship

도형과 글자는 서로 별개의 장식 요소가 아니다.

권장 패턴:

### Type Inside Shape

```txt
   ●
  MA
```

### Type Beside Shape

```txt
●  STRESS
```

### Type Crossing Shape

```txt
GON
██████
NA
```

### Shape Replacing Structure

```txt
GOING  ●  TO
```

### Rule

글자를 도형 위에 배치할 경우 **가독성 대비를 최우선**으로 한다.

---

# 50. Poster Composition Templates

## Template A — One Big Concept

```txt
BIG TITLE

        ●
        ●
   LARGE SHAPE

small explanation

01 / SERIES
```

사용:
- 한 가지 발음 규칙
- 한 단어
- 한 개념

## Template B — Split Comparison

```txt
TITLE

████████  ●●●●
████████  ●●●●

A          B

small explanation
```

사용:
- A vs B
- before vs after
- strong vs weak

## Template C — Geometric Sequence

```txt
TITLE

○ → ◐ → ●

STEP 1
STEP 2
STEP 3
```

사용:
- 발음 변화
- 축약
- 문장 연결

## Template D — Modular Grid

```txt
┌───────┬───────┐
│   ●   │   ◐   │
├───────┼───────┤
│   ■   │   ▲   │
└───────┴───────┘
```

사용:
- 4개 규칙
- 4개 예시
- 카테고리 비교

---

# 51. YouTube / Learning Screen Application

이 스타일은 특히 다음 화면에 적합하다.

```txt
HOOK
RULE REVEAL
WORD BREAKDOWN
STRESS VISUALIZATION
BEFORE / AFTER
QUIZ
SHORTS COVER
SECTION TRANSITION
```

### Not Recommended For

- 긴 문장 설명
- 여러 문단의 본문
- 복잡한 표
- 많은 메뉴가 필요한 앱 UI
- 입력 Form

이 경우 기존 Core Neo-Brutalist 또는 Editorial Roadmap을 사용한다.

---

# 52. Motion Rules for Geometric Content

영상에서는 도형 자체를 학습 애니메이션으로 활용할 수 있다.

권장:

```txt
Slide
Scale
Split
Merge
Rotate 90°
Mask reveal
Shape crop
```

예:

```txt
GOING + TO

두 원 등장
↓
서로 접근
↓
겹침
↓
하나의 큰 원
↓
GONNA
```

### Motion Rule

- 애니메이션은 개념 변화를 설명해야 한다.
- 단순 장식용 회전/튀기기 효과는 최소화한다.
- 한 동작은 약 `150–400ms`를 기본 범위로 한다.
- 중요한 변화는 충분히 멈춰 학습자가 확인할 시간을 준다.

---

# 53. Swiss Geometric — MUST / MUST NOT

## MUST

- 한 화면에 하나의 핵심 메시지를 둔다.
- 기본 기하학 형태를 사용한다.
- 강한 크기 대비를 만든다.
- 비대칭이더라도 그리드 정렬을 유지한다.
- 여백을 적극적으로 사용한다.
- 색상 수를 제한한다.
- 제목을 강한 그래픽 요소로 취급한다.
- 작은 metadata를 보조 정보로 활용한다.
- 교육 콘텐츠에서는 도형에 의미를 부여한다.

## MUST NOT

- 단순히 “예뻐 보여서” 도형을 추가하지 않는다.
- 화면을 모든 색으로 채우지 않는다.
- 모든 공간을 텍스트로 채우지 않는다.
- gradient / glow / glass effect를 섞지 않는다.
- 그림자를 주 디자인 언어로 사용하지 않는다.
- 의미 없는 복잡한 일러스트레이션을 추가하지 않는다.
- 한 화면에 여러 개의 시각적 중심점을 만들지 않는다.

---

# 54. AI Generation Specification — Swiss Geometric

```txt
Create a Swiss geometric editorial learning graphic.

VISUAL LANGUAGE
- warm off-white paper background
- oversized bold black typography
- precise circles, half-circles, rectangles and triangles
- asymmetric but disciplined grid
- large negative space
- flat solid colors
- black, blue, yellow, orange, green and pink palette
- use only 2–3 accent colors per composition
- extreme scale contrast between headline and metadata
- no gradients
- no glassmorphism
- no glossy 3D
- minimal or no shadows

COMPOSITION
- one dominant visual idea
- one oversized headline
- one major geometric composition
- optional tiny editorial metadata
- intentionally cropped shapes are allowed
- align all elements to an invisible grid

EDUCATIONAL USE
- shapes must represent meaning
- size can represent stress or importance
- overlap can represent contraction or combination
- split shapes can represent decomposition
- sequences can represent pronunciation change
- never allow decoration to obscure the learning point

PRIORITY
1. concept clarity
2. typography
3. geometric hierarchy
4. negative space
5. color
6. decoration
```

---

# 55. Variant Selection Rule

현재 디자인 시스템의 세 가지 주요 표현 방식을 다음처럼 선택한다.

| Goal | Variant |
|---|---|
| 앱 / 버튼 / Form / Modal | **Core Neo-Brutalist** |
| 커리큘럼 / 단계 / 전체 학습 여정 | **Editorial Roadmap** |
| 한 개념 / 비교 / 강세 / 축약 / 시각적 설명 | **Swiss Geometric Editorial** |

### Combined Principle

> **Core Neo-Brutalist = Interaction**  
> **Editorial Roadmap = Sequence**  
> **Swiss Geometric = Concept**

영어 교육 콘텐츠에서 화면 목적을 먼저 결정하고 그 목적에 맞는 Variant를 선택한다.

---

# 56. Visual Sketchnote Learning System

> 사용자가 제공한 **중앙 핵심 개념 + 주변 손그림 설명 + 화살표 + Callout + 제한된 Accent Color** 레퍼런스를 기준으로 한다.
> 목적은 손그림 장식이 아니라 **복잡한 학습 개념을 한 화면에서 관계 중심으로 풀어 설명하는 것**이다.

## 56.1 Role

```txt
Core Neo-Brutalist → Interaction
Editorial Roadmap → Sequence
Swiss Geometric → Concept Visualization
Visual Sketchnote → Explanation + Relationships
```

적합한 용도:
- 하나의 개념을 여러 관점에서 설명
- 원인 → 결과 / 규칙 → 예외
- 단어 → 음절 → 강세 → 실제 발음
- Before / After
- 영상 중간 요약 / 한 장 복습

## 56.2 Visual DNA

```txt
CENTRAL CONCEPT
+ HAND-DRAWN ANNOTATION
+ CALLOUT BOX
+ ARROW NETWORK
+ MARKER HIGHLIGHT
+ SIMPLE DOODLE
+ LIMITED ACCENT COLORS
+ INFORMATION CLUSTERS
```

---

# 57. Sketchnote Color System

```css
:root {
  --sketch-paper: #FAF9F5;
  --sketch-ink: #171717;
  --sketch-orange: #F5A23A;
  --sketch-blue: #4EA5D9;
  --sketch-gray: #D8D8D3;
  --sketch-light-orange: #F8D39C;
  --sketch-light-blue: #C9E6F5;
}
```

권장 비율: Paper 65–75% / Black 15–20% / Orange 5–10% / Blue 3–7%.

**Black + Orange + Blue + Paper**를 기본으로 하고 Accent는 2개 이하로 제한한다.

---

# 58. Central Concept Architecture

```txt
        [POINT A]
            ↑
            │
[POINT B] ← CORE → [POINT C]
            │
            ↓
        [POINT D]
```

중앙에는 핵심 단어, 문장, 규칙, 질문 또는 Before → After 중 하나만 둔다.

> **중앙을 보지 않고 주변부터 읽게 된다면 hierarchy가 잘못된 것이다.**

중앙 Hero Box는 White + 3px Black Border를 기본으로 하며 Orange/Blue hard-offset accent를 제한적으로 사용할 수 있다.

---

# 59. Information Cluster

주변 설명은 독립된 Cluster로 묶는다.

```txt
[WHY?]
• 소리가 약해짐
• 빠르게 연결됨

[HOW?]
going to
   ↓
gonna

[EXAMPLE]
I'm gonna go.

[REMEMBER]
글쓰기와 말하기는 다름
```

기본 구조는 **Small Heading → Visual → 1–3 Short Points**.

---

# 60. Hand-Drawn Arrow Grammar

```txt
→ Direction
↔ Comparison
↓ Transformation
↗ Expansion
↩ Return
Curved Arrow = Association
Dotted Arrow = Optional / Secondary
```

Arrow는 장식이 아니라 관계 문법이다. 텍스트를 가로지르거나 여러 선이 복잡하게 교차하지 않도록 한다.

---

# 61. Annotation Grammar

| 의미 | 표현 |
|---|---|
| 핵심 | Orange Marker |
| 중요 | Hand-drawn Underline |
| 반드시 기억 | Double Underline |
| 정답/Target | Circle + ✓ |
| 제거/묵음 | Strike-through / X |
| 연결 | Curved Arrow |
| 변화 | Direction Arrow |
| 예외 | `!` + Orange Callout |
| 보조 설명 | Blue Annotation |
| 실제 회화 | Speech Bubble |

한 콘텐츠 시리즈에서는 이 의미를 일관되게 유지한다.

---

# 62. Doodle Vocabulary

- Ear → 듣기
- Mouth → 발음
- Eye → 철자
- Light bulb → 원리
- Target → 핵심
- Book → 규칙
- Speech bubble → 실제 회화
- Pencil → 연습
- Question mark → 퀴즈
- Star → 중요
- Clock → 속도

> **Doodle = Meaning, not decoration.**

---

# 63. Callout System

사용 가능한 유형:

```txt
TIP
WHY?
REMEMBER
EXAMPLE
CAUTION
TRY IT
ANSWER
```

기본은 White + Black outline. Tip은 Blue, Important/Warning은 Orange를 Accent로 사용한다.

---

# 64. Sketchnote Typography

```txt
Main Concept
→ Pretendard Black / Gmarket Sans Bold

Cluster Heading
→ Pretendard ExtraBold

Body
→ Pretendard Medium

Handwritten Annotation
→ Nanum Pen Script
```

권장 비율:

```txt
Structured Text  75–85%
Handwritten Text 15–25%
```

모든 텍스트를 손글씨로 만들지 않는다.

---

# 65. English Pronunciation Annotation Grammar

| Learning Meaning | Visual Treatment |
|---|---|
| 강세 | 큰 글자 + Orange marker |
| 약화 | 작은 글자 / Blue |
| 묵음 | Strike-through |
| 연결 | Curved arrow |
| 축약 | 두 요소 → 하나의 Box |
| 음절 분리 | `·` 또는 divider |
| 정답 | Circle + ✓ |
| 예외 | `!` + Orange callout |
| 실제 소리 | Speech bubble |
| 철자 | Black structured type |
| 변화 과정 | Arrow sequence |

### Stress

```txt
INFORMATION

in · for · MA · tion
           ━━
            ↑
        여기에 힘!
```

### Silent Letter

```txt
KNIFE

K N I F E
╳       ╳
│
소리 안 남

→ /naɪf/
```

### Contraction

```txt
GOING     TO
  ↓        ↓
   ↘      ↙
    GONNA
      ↑
 실제 회화에서 자주 이렇게 들림
```

원래 형태 = Black / 변화 = Blue / 결과 = Orange Marker 또는 Box.

---

# 66. Rule / Exception Pattern

```txt
┌──────── RULE ────────┐
│ -IC 앞 음절에 강세   │
└──────────────────────┘
          ↓
      roBOTic ✓

          BUT!

╭────── EXCEPTION ─────╮
│ 일부 단어는 예외     │
╰──────────────────────╯
```

Rule이 Primary, Exception은 Secondary다.

---

# 67. Quiz Pattern

```txt
WHERE IS THE STRESS?

ro · bo · tic

      ?

A   RO
B   BO
C   TIC

      ↓

   [ BO ] ✓
```

Reveal 단계에서 Circle / Marker / Check 중 1–2개만 사용한다.

---

# 68. Video & Motion Application

Visual Sketchnote는 영상 전체보다 **설명 장면**에 우선 적용한다.

```txt
Clean Screen
↓
Main Word
↓
Underline
↓
Arrow
↓
Annotation
↓
Doodle
↓
Final Highlight
```

권장 모션:

```txt
Underline reveal  150–250ms
Marker swipe      200–350ms
Arrow draw        250–450ms
Circle draw       200–350ms
Doodle pop-in     200–400ms
```

애니메이션은 개념의 설명 순서를 보여줘야 한다.

---

# 69. Density Control

한 화면 권장량:

```txt
1 Central Concept
3–5 Information Clusters
3–6 Arrows
1–3 Doodles
1–2 Accent Colors
```

피해야 할 것:
- 10개 이상의 Arrow
- 여러 개의 중심 제목
- 모든 문장 Marker
- 모든 빈 공간 Doodle
- 여러 종류의 손글씨
- 설명 없는 아이콘

---

# 70. Clean Sketchnote Rule

```txt
REFERENCE
Handmade + Dense

PROJECT VERSION
Handmade + Structured + Readable
```

프로젝트에서는 손그림 느낌은 유지하되 **정보량 감소 / 여백 증가 / 타이포 위계 강화 / Accent 제한 / Doodle 감소**를 기본으로 한다.

---

# 71. Visual Sketchnote — MUST / MUST NOT

## MUST
- 중앙 핵심 개념을 먼저 만든다.
- 주변 정보는 Cluster로 묶는다.
- Arrow에는 관계 의미를 부여한다.
- Marker / Circle / Underline의 의미를 일관되게 사용한다.
- Doodle은 이해를 돕는 경우에만 사용한다.
- Black Ink를 기본 구조로 사용한다.
- Accent는 1–2개로 제한한다.
- 충분한 여백을 확보한다.
- 학습 정보가 그림보다 우선한다.

## MUST NOT
- 모든 텍스트를 손글씨로 만들지 않는다.
- 빈 공간을 무조건 그림으로 채우지 않는다.
- 의미 없는 화살표를 만들지 않는다.
- 복잡하게 교차하는 연결선을 남용하지 않는다.
- 모든 단어를 형광펜 처리하지 않는다.
- 3개 이상의 강한 Accent를 동시에 사용하지 않는다.
- 장식 때문에 읽는 순서가 불명확해지게 하지 않는다.

---

# 72. AI Generation Specification — Visual Sketchnote

```txt
Create a structured educational visual sketchnote.

STYLE
- clean warm-white paper background
- black hand-drawn ink
- orange as primary accent
- blue as secondary accent
- structured hand-drawn annotations
- simple doodles with educational meaning
- bold central concept
- clear information hierarchy
- generous negative space
- handmade but organized

LAYOUT
- one dominant central concept
- 3–5 surrounding information clusters
- curved arrows connecting related ideas
- callout boxes for tips, rules and examples
- marker highlights for key words only
- simple icons or doodles only when they improve comprehension

ANNOTATION LANGUAGE
- marker = key point
- underline = importance
- circle = answer or target
- strike-through = removed or silent
- arrow = relationship or transformation
- check = correct
- exclamation = exception or caution

TYPOGRAPHY
- structured sans-serif for main information
- bold sans-serif for headings
- handwritten font only for short annotations
- never use handwritten text for all body copy

EDUCATIONAL PRIORITY
1. central idea
2. relationship
3. explanation
4. example
5. annotation
6. decoration

DO NOT
- overcrowd the page
- use decorative arrows without meaning
- use more than two accent colors
- fill every empty area
- sacrifice readability for handmade aesthetics
```

---

# 73. Final Design-System Map

```txt
CORE NEO-BRUTALIST
→ Interaction
→ Buttons / Forms / UI / CTA

EDITORIAL ROADMAP
→ Sequence
→ Curriculum / Steps / Learning Journey

SWISS GEOMETRIC
→ Concept
→ Comparison / Stress / Combination / Transformation

VISUAL SKETCHNOTE
→ Explanation
→ Why / Relationships / Rule / Exception / Detailed Breakdown
```

화면 제작 전 선택 기준:

```txt
사용자가 무엇을 해야 하는가?
→ Core Neo-Brutalist

사용자가 어떤 순서로 배워야 하는가?
→ Editorial Roadmap

사용자가 무엇을 한눈에 이해해야 하는가?
→ Swiss Geometric

사용자가 왜 그런지 자세히 이해해야 하는가?
→ Visual Sketchnote
```

> **Visual Sketchnote는 예쁘게 낙서하는 스타일이 아니라, 설명의 관계를 눈으로 보이게 만드는 학습 언어다.**

---

# 74. Educational Visual Structure System

> 이 섹션은 사용자가 제공한 두 개의 **Visual Structures / Creative Study Notes** 레퍼런스를 기준으로 한다.
>
> 앞선 Visual Sketchnote가 **어떻게 표시하고 설명할 것인가**를 정의한다면, Educational Visual Structure System은 **정보의 관계에 따라 어떤 구조와 다이어그램을 선택할 것인가**를 정의한다.
>
> 즉, 이 섹션은 스타일보다 **정보 설계 문법(Information Architecture Grammar)**에 가깝다.

## 74.1 Core Principle

> **내용을 먼저 분류하고, 그 관계에 맞는 시각 구조를 선택한다.**

```txt
Hierarchy?
→ Tree / Descriptive

Order?
→ Sequence

Time?
→ Timeline

Repeat?
→ Cycle

Why?
→ Cause & Effect

One → Many?
→ Divergence

Many → One?
→ Convergence

A vs B?
→ Compare & Contrast

Overlap?
→ Venn

Central Idea?
→ Mind Map

Conditional Process?
→ Flow
```

---

# 75. Structure Selection Matrix

| 정보 관계 | 기본 구조 | 핵심 질문 | 대표 사용 |
|---|---|---|---|
| Hierarchy | Tree | 무엇이 무엇에 속하는가? | 규칙 → 하위 규칙 |
| Descriptive | Topic + Details | 이것의 특징은 무엇인가? | 단어/개념 설명 |
| Sequence | Step Flow | 어떤 순서인가? | 발음 변화 과정 |
| Timeline | Linear Time | 언제/어떻게 변하는가? | 학습 진행, 역사 |
| Cycle | Circular Flow | 무엇이 반복되는가? | 반복 학습 과정 |
| Cause & Effect | Cause → Result | 왜 이런 결과가 생기는가? | 발음 원리 |
| Divergence | One → Many | 하나에서 무엇이 갈라지는가? | 하나의 철자 → 여러 소리 |
| Convergence | Many → One | 여러 요소가 어떻게 합쳐지는가? | 축약/연음 |
| Compare & Contrast | A ↔ B | 무엇이 같고 다른가? | 두 규칙 비교 |
| Venn | Overlap | 공통 영역은 무엇인가? | 비슷한 발음/규칙 |
| Mind Map | Center → Ideas | 무엇과 연결되는가? | 개념 복습 |
| Flow | Nodes + Arrows | 조건에 따라 어디로 가는가? | 발음 판단 규칙 |

---

# 76. Descriptive / Hierarchy Structure

하나의 주제에서 세부 정보가 파생될 때 사용한다.

```txt
             TOPIC
          /    |    \
     DETAIL  DETAIL  DETAIL
```

또는:

```txt
             RULE
          /        \
     SUBRULE      SUBRULE
      /  \           \
   DETAIL DETAIL    DETAIL
```

### Best For
- 영어 규칙 설명
- 한 단어의 특징
- 상위 규칙과 하위 예외
- 품사/문장 구조

### Rule
- Level은 기본 3단계 이하.
- 상위 개념이 가장 강하게 보여야 한다.
- 같은 레벨은 같은 크기/색/형태를 사용한다.

---

# 77. Sequence / Chronological Structure

순서가 중요한 정보를 표현한다.

```txt
[1] → [2] → [3] → [4]
```

세로형:

```txt
FIRST
  ↓
THEN
  ↓
NEXT
  ↓
LAST
```

### English Learning Example

```txt
SPELLING
   ↓
SYLLABLE
   ↓
STRESS
   ↓
WEAKENING
   ↓
REAL SOUND
```

### Rule
- 단계 번호를 생략하지 않는다.
- 방향을 중간에 바꾸지 않는다.
- 각 단계에는 하나의 핵심 변화만 둔다.

---

# 78. Timeline Structure

시간이나 진행에 따른 변화를 표현한다.

```txt
←──────────── TIME ────────────→
   ●          ●          ●
 EVENT      EVENT      EVENT
```

### Best For
- 학습 진도
- 발음 변화 역사
- 한 영상의 진행 과정
- Before → During → After

Timeline은 단순 Sequence와 달리 **시간 간격 자체가 의미가 있을 때** 사용한다.

---

# 79. Cycle Structure

반복되는 과정:

```txt
      [1]
    ↗     ↘
  [4]     [2]
    ↖     ↙
      [3]
```

### Best For
- 듣기 → 따라 읽기 → 확인 → 반복
- 복습 시스템
- 반복 학습 루프

### Rule
마지막 단계가 첫 단계로 돌아가는 이유가 명확해야 한다.

---

# 80. Cause & Effect Structure

```txt
CAUSE
  ↓
EVENT
  ↓
EFFECT
```

다중 원인:

```txt
CAUSE A ─┐
         ├→ EVENT → EFFECT
CAUSE B ─┘
```

다중 결과:

```txt
              ┌→ EFFECT A
CAUSE → EVENT ┤
              └→ EFFECT B
```

### English Learning Example

```txt
빠른 회화
   +
기능어 약화
   ↓
going to
   ↓
gonna처럼 들림
```

### Rule
원인과 결과를 단순한 순서와 혼동하지 않는다.

---

# 81. Convergence / Divergence

## Divergence

```txt
           → RESULT A
SOURCE ─── → RESULT B
           → RESULT C
```

사용:
- 하나의 철자가 여러 소리
- 한 규칙에서 여러 예시
- 한 개념에서 여러 적용

## Convergence

```txt
A ─┐
B ─┼→ RESULT
C ─┘
```

사용:
- 여러 소리가 하나로 결합
- 축약
- 연음
- 여러 조건이 하나의 결과 생성

### English Example

```txt
GOING ─┐
       ├→ GONNA
TO ────┘
```

---

# 82. Compare & Contrast

두 개념을 직접 비교할 때 사용한다.

```txt
A                B
│                │
├─ trait 1   trait 1 ─┤
├─ trait 2   trait 2 ─┤
└─ trait 3   trait 3 ─┘
```

### English Example

```txt
-TION              -SION
/tʃən/             /ʒən/ 또는 /ʃən/

공통
→ 뒤 음절이 약하게 들리는 경우가 많음
```

### Rule
- 비교 기준을 동일하게 유지한다.
- A에는 있는데 B에는 없는 항목을 억지로 맞추지 않는다.
- 공통점과 차이점을 시각적으로 분리한다.

---

# 83. Venn Diagram

공통 영역 자체가 중요한 경우 사용한다.

```txt
     _______ _______
    /       X       \
   /   A   / \   B   \
   \      /   \      /
    \____/ BOTH \___/
```

### Best For
- 두 발음 규칙의 공통점
- 두 학습법의 겹치는 요소
- 철자와 소리의 공통 조건

### Rule
단순 비교라면 Compare & Contrast를 사용하고, **교집합이 핵심일 때만 Venn**을 사용한다.

---

# 84. Mind Map

중심 개념에서 관련 아이디어를 확장한다.

```txt
             IDEA
              |
IDEA ─── CORE CONCEPT ─── IDEA
              |
             IDEA
```

### Best For
- 한 편 전체 복습
- Brainstorm
- 관련 규칙 정리
- 어휘 확장

### Rule
- 중심 개념은 1개.
- 1차 Branch는 4–6개 권장.
- 2차 Branch는 필요할 때만.
- 모든 Branch를 같은 색으로 만들 필요는 없지만 Category별 의미는 일관되어야 한다.

---

# 85. Flow / Decision Structure

조건에 따라 결과가 달라질 때 사용한다.

```txt
        QUESTION
        /      \
      YES      NO
       ↓        ↓
   RESULT A  RESULT B
```

### English Example

```txt
C 뒤에 E / I / Y ?
      /       \
    YES       NO
     ↓         ↓
   /s/        /k/
```

### Rule
- 질문은 명확한 Yes/No 또는 선택 조건이어야 한다.
- 하나의 Node에서 너무 많은 Branch를 만들지 않는다.
- 최종 결과는 색이나 형태로 명확히 구분한다.

---

# 86. Story / Process Structure

두 번째 레퍼런스처럼 스토리 요소나 학습 프로세스를 세로 흐름으로 구성할 수 있다.

```txt
START
  ↓
CONTEXT
  ↓
PROBLEM
  ↓
RULE / DISCOVERY
  ↓
PRACTICE
  ↓
RESULT
```

교육 영상 적용:

```txt
QUESTION
↓
WHY?
↓
RULE
↓
EXAMPLE
↓
QUIZ
↓
RECAP
```

이는 영상 스토리보드의 기본 정보 구조로도 사용할 수 있다.

---

# 87. Visual Structure + Sketchnote Styling

Visual Structure는 **정보 구조**, Visual Sketchnote는 **표현 방식**이다.

따라서 함께 사용할 수 있다.

예:

```txt
STRUCTURE
Cause & Effect

STYLE
Visual Sketchnote

RESULT
손그림 화살표와 Marker로 표현한
원인 → 결과 다이어그램
```

또는:

```txt
STRUCTURE
Compare & Contrast

STYLE
Swiss Geometric

RESULT
기하학 도형으로 표현한 A/B 비교
```

> **Structure와 Style을 분리해서 선택한다.**

---

# 88. Structure × Style Matrix

| Structure | Neo-Brutalist | Editorial Roadmap | Swiss Geometric | Visual Sketchnote |
|---|:---:|:---:|:---:|:---:|
| Hierarchy | ○ | ◎ | ○ | ◎ |
| Sequence | ○ | ◎ | ◎ | ◎ |
| Timeline | △ | ◎ | ◎ | ◎ |
| Cycle | △ | ○ | ◎ | ◎ |
| Cause & Effect | ○ | ○ | ◎ | ◎ |
| Convergence | △ | ○ | ◎ | ◎ |
| Divergence | △ | ○ | ◎ | ◎ |
| Compare | ○ | ○ | ◎ | ◎ |
| Venn | △ | △ | ◎ | ◎ |
| Mind Map | △ | ○ | ○ | ◎ |
| Decision Flow | ◎ | ○ | ○ | ◎ |

```txt
◎ = Highly Recommended
○ = Suitable
△ = Use Selectively
```

---

# 89. Study Note Section Styling

두 번째 레퍼런스에서 가져오는 보조 규칙.

## Section Heading
- 굵은 Black heading
- 짧은 Colored underline 또는 Marker
- 한 섹션 = 한 핵심 주제

## Bullet
- Black body text
- Accent bullet 또는 작은 doodle 허용
- 한 Bullet은 가능한 한 한 줄

## Mini Illustration
- 개념을 즉시 인지시키는 작은 아이콘
- Illustration 자체가 본문보다 커지지 않게 한다.

## Divider
- 손그림 선
- Marker stroke
- 충분한 여백

---

# 90. Educational Color Coding

구조를 색으로 보조할 수 있다.

예:

```txt
Orange  → 핵심 / Action / 변화
Blue    → 설명 / 보조 정보
Green   → Sequence / 진행
Pink    → Cause & Effect / 주의
Black   → 기본 정보
```

그러나 프로젝트의 기존 Palette와 충돌하면 **색상 의미보다 기존 디자인 시스템의 일관성을 우선**한다.

색은 반드시 텍스트/형태/위치와 함께 사용한다.

---

# 91. Diagram Density Rules

한 화면 권장:

```txt
1 Primary Structure
3–7 Nodes
1 Direction
1–2 Accent Colors
1 Main Heading
```

복잡한 구조는 여러 화면으로 나눈다.

### Avoid

```txt
2개 이상의 서로 다른 Primary Diagram
10개 이상의 Node
방향이 서로 충돌하는 Arrow
설명 없는 색상 변화
장식용 Diagram
```

---

# 92. English Learning Structure Presets

## Pronunciation Transformation

```txt
Structure: Sequence

SPELLING
↓
SYLLABLE
↓
STRESS
↓
WEAKENING
↓
REAL SOUND
```

## Letter Rule

```txt
Structure: Decision Flow

C 뒤에 E / I / Y?
YES → /s/
NO  → /k/
```

## Contraction

```txt
Structure: Convergence

GOING ─┐
       ├→ GONNA
TO ────┘
```

## Stress Rule

```txt
Structure: Cause & Effect

SUFFIX
↓
STRESS MOVES
↓
NEW PRONUNCIATION
```

## Rule Comparison

```txt
Structure: Compare & Contrast

-TION ↔ -SION
```

## Episode Recap

```txt
Structure: Mind Map

             EXAMPLE
                |
RULE ─── EPISODE CORE ─── SOUND
                |
              QUIZ
```

---

# 93. Structure Selection Checklist

화면을 만들기 전에 다음 순서로 판단한다.

```txt
1. 정보가 순서인가?
   → Sequence

2. 시간이 중요한가?
   → Timeline

3. 반복되는가?
   → Cycle

4. 이유와 결과인가?
   → Cause & Effect

5. 하나에서 여러 개로 갈라지는가?
   → Divergence

6. 여러 개가 하나로 합쳐지는가?
   → Convergence

7. 두 개를 비교하는가?
   → Compare & Contrast

8. 겹치는 영역이 중요한가?
   → Venn

9. 중심 개념 주변을 정리하는가?
   → Mind Map

10. 조건에 따라 답이 달라지는가?
    → Decision Flow

11. 상위/하위 관계인가?
    → Hierarchy
```

---

# 94. AI Generation Specification — Educational Visual Structure

```txt
Choose the visual structure from the information relationship before styling.

STRUCTURE SELECTION
- hierarchy → tree
- description → topic with details
- ordered process → sequence
- time-based change → timeline
- repeating process → cycle
- reason and result → cause and effect
- one source to many results → divergence
- many inputs to one result → convergence
- A versus B → compare and contrast
- shared overlap → Venn diagram
- central idea with related concepts → mind map
- conditional rule → decision flow

DESIGN RULES
- one primary diagram structure per screen
- 3–7 primary nodes when possible
- clear directional flow
- consistent node hierarchy
- arrows must communicate relationships
- use color as secondary reinforcement only
- maintain generous whitespace
- keep labels concise
- split complex diagrams across multiple screens

STYLE
After selecting the structure, apply one compatible visual style:
- Core Neo-Brutalist
- Editorial Roadmap
- Swiss Geometric
- Visual Sketchnote

PRIORITY
1. relationship accuracy
2. reading order
3. hierarchy
4. clarity
5. visual style
6. decoration
```

---

# 95. Updated Design-System Logic

디자인 시스템을 이제 **두 층으로 판단한다.**

## Layer 1 — Information Structure

```txt
Hierarchy
Sequence
Timeline
Cycle
Cause & Effect
Convergence
Divergence
Compare & Contrast
Venn
Mind Map
Decision Flow
```

## Layer 2 — Visual Style

```txt
Core Neo-Brutalist
Editorial Roadmap
Swiss Geometric
Visual Sketchnote
```

예:

```txt
going to → gonna

Information Structure
→ Convergence + Sequence

Visual Style
→ Swiss Geometric
or
→ Visual Sketchnote
```

### Final Principle

> **먼저 “정보가 어떤 관계인가?”를 결정하고, 그 다음 “어떤 스타일로 보여줄 것인가?”를 결정한다.**

이 순서를 뒤집지 않는다.

---

# 96. Vintage Educational Plate System

> 이 섹션은 사용자가 제공한 **빈티지 학교 학습판 / 식물 해부·성장 교육 포스터** 레퍼런스를 기준으로 한다.
>
> 핵심은 빈티지 장식이 아니라 **실제 대상의 구조·위치·부분·변화·작동 원리를 Illustration에 직접 Labeling하여 설명하는 것**이다.

## 96.1 Role

```txt
Core Neo-Brutalist → Interaction
Editorial Roadmap → Sequence
Swiss Geometric → Abstract Concept
Visual Sketchnote → Explanation & Relationships
Educational Visual Structure → Information Architecture
Vintage Educational Plate → Anatomy / Position / Mechanism
```

특히 적합한 콘텐츠:
- 발음 기관
- 혀 위치
- 입술 모양
- 치아와 혀의 관계
- 공기 흐름
- 성대 진동
- 발음 Before / After
- 단계별 움직임
- 실제 사물의 부분 명칭
- 확대도 / 단면도 / Detail View

---

# 97. Visual DNA

```txt
VINTAGE EDUCATIONAL PLATE
+ SCIENTIFIC ILLUSTRATION
+ LABELED ANATOMY
+ NUMBERED PROCESS
+ LEADER LINES
+ DETAIL VIEW
+ CUTAWAY
+ MUTED COLOR
+ PAPER TEXTURE
+ INK OUTLINE
```

### 핵심 원칙

> **그림은 장식이 아니라 설명의 본체다.**

텍스트는 Illustration을 보조한다.

---

# 98. Vintage Plate Color System

```css
:root {
  --plate-paper: #EEE3C7;
  --plate-paper-light: #F6EEDC;
  --plate-ink: #28251F;

  --plate-navy: #40556A;
  --plate-slate: #667889;
  --plate-olive: #78805C;
  --plate-brass: #B08A4A;
  --plate-rust: #A95D3D;
  --plate-green: #557A51;
  --plate-muted-red: #A85A55;
}
```

권장 비율:

```txt
Paper / Neutral    55–70%
Ink                15–20%
Main Illustration  10–20%
Accent              5–10%
```

### Rules
- 순백색보다 따뜻한 Paper tone.
- 채도가 높은 Neon color 사용 금지.
- Illustration은 muted palette.
- Black보다 약간 부드러운 Ink Black 사용 가능.
- Accent는 기능적 구분에만 사용한다.

---

# 99. Illustration Style

권장:

```txt
Fine ink outline
+ flat / lightly washed color
+ subtle hatching
+ restrained shading
+ scientific clarity
```

피해야 할 것:

```txt
Photorealistic 3D
Glossy render
Heavy cinematic lighting
Neon glow
Complex decorative background
Cartoon exaggeration that changes anatomy
```

교육 정확성이 스타일보다 우선한다.

---

# 100. Master Illustration + Detail Views

기본 구조:

```txt
┌─────────────────────────────┐
│         MAIN TITLE          │
│                             │
│        MASTER VIEW          │
│       [large subject]       │
│       ↗  ↑  ↖               │
│    labels / leaders         │
│                             │
│ DETAIL A       DETAIL B     │
│ [zoom]         [cutaway]    │
│                             │
│ STEP 1 → STEP 2 → STEP 3    │
└─────────────────────────────┘
```

### Rule
- 화면에서 가장 큰 Illustration은 전체 구조를 보여준다.
- 작은 Illustration은 확대·단면·변화를 보여준다.
- 같은 정보를 반복하는 작은 그림은 만들지 않는다.

---

# 101. Leader Line System

Leader Line은 대상의 특정 위치와 Label을 연결한다.

```txt
Tongue tip ─────────→ ●
Teeth ──────────────→ ●
Airflow ────────────→ →
```

### Rules
- 선은 얇고 명확하게.
- 가능하면 서로 교차하지 않는다.
- Label은 선의 끝과 가까이 배치한다.
- 어느 부분을 가리키는지 모호하면 Dot 또는 작은 endpoint를 사용한다.
- 중요한 해부 Label은 장식용 Arrow와 구분한다.

---

# 102. Label Hierarchy

```txt
MAIN SUBJECT
  ↓
PART LABEL
  ↓
DETAIL NOTE
```

예:

```txt
TH SOUND

TONGUE TIP
혀끝

between the teeth
치아 사이
```

### Typography
- Main Title → Pretendard ExtraBold / Gmarket Sans Bold
- Part Label → Pretendard Bold
- Detail Note → Pretendard Medium
- Vintage Accent → 제한적으로 Serif / Handwriting 사용 가능

한글 학습 정보는 장식적인 필기체보다 가독성을 우선한다.

---

# 103. Numbered Process Plate

변화 과정을 그림으로 보여줄 때:

```txt
① POSITION
     ↓
② AIRFLOW
     ↓
③ VOICING
     ↓
④ SOUND
```

또는:

```txt
[1] → [2] → [3] → [4]
```

### Rule
- 번호는 Illustration과 직접 연결한다.
- 한 단계 = 한 가지 핵심 변화.
- 단계별 시점/각도를 임의로 바꾸지 않는다.
- 비교가 필요하면 동일한 Viewpoint를 유지한다.

---

# 104. Anatomy / Cutaway View

외부에서 보이지 않는 구조를 설명할 때 단면도를 사용한다.

예:

```txt
SIDE CUTAWAY

      nose
       │
       ↓
 ┌───────────┐
 │   mouth   │
 │ tongue →  │
 │      teeth│
 └───────────┘
      ↓
   throat
```

### Best For
- 혀 위치
- 구강 내부
- 성대
- 공기 이동
- R / L / TH 등 조음 위치

### Rule
단면도는 실제 구조 이해를 쉽게 하기 위한 단순화이며, 잘못된 해부 구조를 만들면 안 된다.

---

# 105. Position Comparison

두 발음의 위치 차이를 설명할 때:

```txt
TH /θ/                S /s/

[side view]           [side view]

tongue → teeth        tongue → behind teeth
```

### Rules
- 동일한 크기.
- 동일한 각도.
- 동일한 Label 위치.
- 다른 부분만 Accent.
- 공통 구조는 Neutral color.

이 방식은 Compare & Contrast 구조와 결합할 수 있다.

---

# 106. Airflow Visualization

공기 흐름은 Arrow를 사용한다.

```txt
LUNGS
  ↑
THROAT
  ↑
MOUTH
  →→→ AIR
```

발음 Illustration에서는:

```txt
Solid Arrow
→ 주요 공기 흐름

Dotted Arrow
→ 약한 / 보조 흐름

Wave
→ 진동 / 소리
```

Arrow가 실제 움직임인지 단순 Label 연결선인지 명확하게 구분한다.

---

# 107. Voicing Visualization

유성음 / 무성음 차이를 설명할 때:

```txt
VOICELESS
Vocal cords: no vibration

VOICED
Vocal cords: ~ vibration ~
```

권장 표현:

```txt
No vibration → straight / quiet line
Vibration    → wave / repeated marks
```

예:

```txt
F /f/ ↔ V /v/
S /s/ ↔ Z /z/
TH /θ/ ↔ TH /ð/
```

---

# 108. Detail Magnification

작은 부분을 확대할 때:

```txt
        MAIN VIEW
           ○
          / \
         /   \
        ↓
   ┌───────────┐
   │ DETAIL ×3 │
   └───────────┘
```

### Best For
- 혀끝
- 치아 사이
- 입술 접촉
- 성대
- 특정 철자 부분

확대 영역은 원본 위치와 명확하게 연결한다.

---

# 109. Before / During / After Plate

움직임을 설명할 때:

```txt
BEFORE       DURING       AFTER
[view]   →   [view]   →   [view]
```

영어 발음 예:

```txt
WANT + TO
↓
sound connection
↓
WANNA-like speech
```

실제 물리적 발음 동작을 설명할 때는 각 단계의 입/혀 위치를 보여준다.

---

# 110. Object + Annotation Composition

첫 번째 레퍼런스처럼 주요 대상 주변에 관련 도구/부품을 배치할 수 있다.

```txt
        MAIN SUBJECT

DETAIL A             DETAIL B

       PROCESS VIEW

TOOL / EXAMPLE       COLOR KEY
```

### Rule
- 모든 주변 Object는 핵심 주제와 직접 관련되어야 한다.
- 단순 분위기용 소품은 최소화.
- 작은 Object에도 필요한 경우 Label을 제공한다.

---

# 111. Plate Grid

Desktop / Poster:

```txt
60–70% Illustration
30–40% Labels + Notes
```

권장:

```txt
Main View      40–50%
Detail Views   20–30%
Labels         15–20%
Notes           5–10%
```

Illustration이 작아지고 텍스트가 많아지면 Visual Sketchnote 또는 Editorial Layout으로 전환한다.

---

# 112. Paper & Texture

허용:
- Warm paper
- 아주 약한 grain
- 미세한 aging
- Ink variation

금지:
- 읽기 어려운 얼룩
- 강한 찢김 효과
- 과도한 noise
- 학습 Illustration 위의 texture

### Principle

> **Vintage는 분위기이고, 정보는 현대적으로 선명해야 한다.**

---

# 113. English Pronunciation Plate Presets

## TH Sound

```txt
TITLE
TH /θ/

MAIN VIEW
Side cutaway of mouth

LABELS
Tongue tip
Upper teeth
Lower teeth
Airflow

DETAIL
Tongue between teeth

PROCESS
① Position tongue
② Let air pass
③ No vocal-cord vibration
④ /θ/
```

## F vs V

```txt
STRUCTURE
Compare & Contrast

LEFT
F /f/
No vibration

RIGHT
V /v/
Vibration

COMMON
Upper teeth touch lower lip
```

## R vs L

```txt
STRUCTURE
Position Comparison

R
Tongue does not touch alveolar ridge

L
Tongue tip touches alveolar ridge
```

## S vs Z

```txt
S
Airflow + no vibration

Z
Same general mouth position
+ vocal-cord vibration
```

---

# 114. Illustration Accuracy Rules

## MUST
- 실제 구조를 왜곡하지 않는다.
- 위치 관계를 정확하게 유지한다.
- 동일 비교에서는 동일 Viewpoint를 사용한다.
- Label과 대상의 연결을 명확하게 한다.
- 움직임 Arrow와 Label Leader를 구분한다.
- 단순화하더라도 학습 결과가 틀려지지 않게 한다.
- 발음 설명에서는 IPA 또는 정확한 소리 표기를 함께 사용할 수 있다.

## MUST NOT
- 분위기를 위해 잘못된 혀 위치를 그리지 않는다.
- 입 내부 구조를 임의로 생략해 오해를 만들지 않는다.
- 모든 부분을 동시에 강조하지 않는다.
- 과도한 vintage texture로 세부 구조를 가리지 않는다.
- 장식용 해부 요소를 추가하지 않는다.

---

# 115. Vintage Plate × Information Structure

| Learning Goal | Structure | Plate Treatment |
|---|---|---|
| 부분 명칭 | Hierarchy / Descriptive | Master View + Labels |
| 발음 위치 | Descriptive | Cutaway + Leader Lines |
| 움직임 | Sequence | Numbered Process |
| 두 발음 비교 | Compare | Side-by-Side Anatomy |
| 공기 흐름 | Flow | Directional Arrows |
| 유성/무성 | Compare | Same View + Vibration |
| 변화 과정 | Sequence | Before/During/After |
| 원인과 결과 | Cause & Effect | Anatomy + Mechanism |

---

# 116. Vintage Plate × Existing Styles

```txt
Vintage Plate + Editorial Roadmap
→ 발음 학습 전체 과정

Vintage Plate + Swiss Geometric
→ 실제 구조 + 추상적 소리 개념

Vintage Plate + Visual Sketchnote
→ 해부 그림 + WHY 설명

Vintage Plate + Compare Structure
→ R/L, F/V, S/Z 비교
```

한 화면에서는 **Vintage Plate를 Illustration Layer**로 사용하고 다른 스타일은 정보 구조/강조 방식으로 제한한다.

---

# 117. AI Generation Specification — Vintage Educational Plate

```txt
Create a vintage educational anatomical learning plate.

PURPOSE
- explain real structure, position, movement or mechanism
- prioritize instructional accuracy over decoration

VISUAL STYLE
- warm aged paper background
- fine black or dark-brown ink outlines
- restrained muted colors
- scientific textbook illustration
- subtle hand-painted wash
- minimal hatching
- clear labels and leader lines
- vintage atmosphere with modern readability

LAYOUT
- one dominant master illustration
- optional detail magnifications
- numbered process views when movement is involved
- concise labels placed close to their targets
- thin leader lines with clear endpoints
- generous whitespace
- optional small color key or legend

FOR PRONUNCIATION
- show mouth, tongue, teeth, lips and throat only when relevant
- use side cutaway when internal tongue position matters
- show airflow with directional arrows
- distinguish airflow arrows from label leader lines
- show vocal-cord vibration with a consistent vibration symbol
- use identical viewpoints for pronunciation comparisons

DO NOT
- distort anatomy for style
- use neon colors
- use glossy 3D rendering
- overcrowd the plate
- use heavy decorative texture over important details
- add unrelated vintage props
- sacrifice label readability for handwriting aesthetics

PRIORITY
1. anatomical / structural accuracy
2. position clarity
3. process clarity
4. label readability
5. visual hierarchy
6. vintage character
```

---

# 118. Updated Layer Model

디자인 시스템을 세 층으로 확장한다.

## Layer 1 — Information Structure

```txt
Hierarchy
Sequence
Timeline
Cycle
Cause & Effect
Convergence
Divergence
Compare & Contrast
Venn
Mind Map
Decision Flow
```

## Layer 2 — Visual Style

```txt
Core Neo-Brutalist
Editorial Roadmap
Swiss Geometric
Visual Sketchnote
```

## Layer 3 — Illustration Mode

```txt
Vintage Educational Plate
→ Anatomy
→ Position
→ Mechanism
→ Detail
→ Cutaway
→ Numbered Process
```

### Example

```txt
TH 발음

Information Structure
→ Sequence + Descriptive

Visual Style
→ Visual Sketchnote

Illustration Mode
→ Vintage Educational Plate / Side Cutaway
```

### Final Principle

> **정보 관계를 선택하고 → 표현 스타일을 선택하고 → 실제 구조 설명이 필요할 때 Illustration Mode를 추가한다.**

Vintage Educational Plate는 모든 화면의 기본 스타일이 아니라, **눈으로 실제 위치와 작동 원리를 이해해야 할 때 호출하는 전문 Illustration System**이다.

---

# 119. Editorial Annotation / Active Reading System

> 6번 레퍼런스의 핵심은 새 그림을 만드는 것이 아니라 **이미 존재하는 원문 위에 사고·분석·학습 정보를 덧씌우는 것**이다.
>
> Visual Sketchnote가 빈 화면에서 설명을 구성한다면, Editorial Annotation은 **원문 자체를 보존한 채 직접 해부한다.**

## 119.1 Role

```txt
Visual Sketchnote
→ 설명을 새로 구성

Vintage Educational Plate
→ 실제 구조를 그림으로 해부

Editorial Annotation
→ 기존 텍스트를 직접 해부
```

적합한 콘텐츠:
- 문장 해부
- 원어민 자막 분석
- 영화/영상 대사 분석
- 기사 한 문장 분석
- 강세·약화·연음 표시
- 문법 구조 분석
- 핵심 어휘 표시
- Before / After correction
- 복습용 Active Reading 화면

---

# 120. Base Composition

```txt
MARGIN NOTE      ORIGINAL TEXT       MARGIN NOTE
     ←             HIGHLIGHT              →
                   UNDERLINE
                   CORRECTION
                   INLINE NOTE
```

### 핵심 원칙

> **Original Text는 Primary Source이고 Annotation은 Secondary Layer다.**

원문이 Annotation 때문에 읽히지 않으면 실패다.

---

# 121. Annotation Layer Model

```txt
LAYER 0 — Original Text
LAYER 1 — Highlight
LAYER 2 — Underline / Circle / Strike
LAYER 3 — Inline Annotation
LAYER 4 — Margin Note
LAYER 5 — Summary / Takeaway
```

가능하면 영상에서도 이 순서대로 등장시킨다.

---

# 122. Channel Annotation Color Grammar

기본 의미 체계:

```txt
ORANGE
→ Stress / 핵심 소리 / 가장 중요한 변화

BLUE
→ Linking / Reduction / 약화 / 연결

PINK
→ Grammar / Structure / 문장 구조

YELLOW
→ Meaning / Memory / 핵심 뜻

BLACK
→ Original text / 기본 설명

RED
→ Correction / Exception / Warning
```

### Rules
- 색만으로 의미를 전달하지 않는다.
- 색 + 위치 + 기호를 함께 사용한다.
- 한 화면에서 모든 색을 사용할 필요는 없다.
- 기본 2–3개 Annotation Color만 활성화한다.
- 같은 의미는 채널 전체에서 같은 색을 유지한다.

---

# 123. Highlight System

형광펜은 문장 전체보다 **학습 단위**를 표시한다.

```txt
I am [going to] call you.
      ORANGE
```

사용:
- 핵심 Chunk
- 강세 단위
- 중요한 표현
- 기억할 뜻
- 비교 대상

### MUST
- 텍스트가 Highlight 위에서 선명해야 한다.
- Marker edge는 약간 불규칙해도 된다.
- Marker opacity는 원문을 가리지 않는 수준으로 유지한다.

### MUST NOT
- 모든 줄을 Highlight하지 않는다.
- 한 문장에 4개 이상의 강한 Highlight를 남발하지 않는다.

---

# 124. Underline Grammar

```txt
Single Underline
→ 중요

Double Underline
→ 반드시 기억

Wavy Underline
→ 발음 변화 / 불안정한 소리

Dotted Underline
→ 보조 정보

Red Underline
→ 수정 / 주의
```

Underline은 Highlight보다 약한 강조 단계로 사용한다.

---

# 125. Margin Note System

원문 좌우 여백에 큰 개념을 짧게 기록한다.

예:

```txt
[약화]
      I am going to call you.

[실제 소리]
      gonna처럼 들릴 수 있음
```

### Rules
- 1 Margin Note = 1 Idea
- 2–6단어 권장
- 본문을 밀어내지 않는다.
- Arrow 또는 Leader Line으로 연결 가능.
- 긴 설명은 Callout으로 분리한다.

---

# 126. Inline Annotation

원문 가까이에 짧은 메모를 붙인다.

```txt
going to
   ↑
빠른 회화에서 약화
```

또는:

```txt
information
      ↑
   강세
```

### Rule
Inline Annotation은 한 줄 설명을 넘기지 않는 것을 기본으로 한다.

---

# 127. Correction / Rewrite Grammar

수정 과정을 그대로 보여준다.

```txt
I am going to call you.
        ↓
I'm gonna call you.
```

또는:

```txt
곤잉 투
───────
gonna
```

의미:

```txt
Strike-through → 제거 / 오해 / 묵음
Arrow          → 변화
Rewrite        → 수정 결과
Circle         → 최종 Target
```

오답이 최종 결과보다 시각적으로 강하지 않게 한다.

---

# 128. Stress Annotation

```txt
in · for · MA · tion
           ━━
            ↑
          강세
```

권장 조합:
- Orange Marker
- Bold
- Underline
- 작은 Arrow

이 중 2개 정도만 결합한다.

---

# 129. Reduction / Linking Annotation

```txt
going   to
   ↘   ↙
   gonna
```

또는 문장 위에서:

```txt
I'm going to call you.
     ~~~~~~~
       ↓
     gonna
```

Blue는 연결·약화 Layer에 우선 사용한다.

---

# 130. Grammar Annotation

문법 구조는 Pink를 기본 Accent로 사용할 수 있다.

```txt
[I] [am going to call] [you]
 S        V             O
```

### Rules
- 발음 설명과 문법 설명을 동시에 과도하게 활성화하지 않는다.
- 한 화면의 Primary Learning Goal을 먼저 결정한다.
- 문법 Label은 원문보다 작게.

---

# 131. Meaning Annotation

뜻 또는 기억 포인트는 Yellow 계열로 표시한다.

```txt
figure out
──────────
알아내다 / 이해하다
```

단, 단순 번역 자막 전체를 Yellow Highlight로 만들지 않는다.

---

# 132. Active Reading Workflow

권장 학습 흐름:

```txt
1. CLEAN TEXT
      ↓
2. KEY CHUNK HIGHLIGHT
      ↓
3. STRESS / LINKING MARK
      ↓
4. SHORT MARGIN NOTE
      ↓
5. NATURAL SOUND / MEANING
      ↓
6. CLEAN RE-READ
```

마지막에는 Annotation을 일부 제거하고 다시 읽게 할 수 있다.

---

# 133. Sentence Dissection Preset

```txt
ORIGINAL
I'm going to call you tonight.

STEP 1 — CHUNK
I'm [going to] call you tonight.

STEP 2 — SOUND
I'm [going to] call you tonight.
       ↓
     gonna

STEP 3 — STRESS
I'm gonna CALL you toNIGHT.

STEP 4 — MEANING
오늘 밤 전화할게.

STEP 5 — RE-READ
I'm gonna call you tonight.
```

---

# 134. Native Clip / Subtitle Analysis Preset

```txt
SOURCE SUBTITLE
↓
KEY PHRASE HIGHLIGHT
↓
WHAT YOU EXPECT TO HEAR
↓
WHAT YOU ACTUALLY HEAR
↓
REDUCTION / LINKING NOTE
↓
REPLAY
```

원본 클립이나 자막을 사용할 경우 별도의 저작권·출처 규칙을 따른다.

---

# 135. Annotation Density

한 화면 권장:

```txt
1 Original Passage
1 Primary Learning Goal
2–4 Highlights
1–3 Underlines
1–3 Margin Notes
0–2 Corrections
1 Summary
```

### Avoid
- 모든 문장에 메모
- 모든 단어에 색상
- 5색 이상 동시 활성화
- Margin Note가 본문보다 긴 구성
- 서로 겹치는 Arrow
- 원문을 읽을 수 없는 Marker

---

# 136. Typography

## Original Text
```txt
Pretendard Medium / Regular
```

## Key Word
```txt
Pretendard Bold / ExtraBold
```

## Margin Note
```txt
Nanum Pen Script
or
Pretendard Bold
```

## Technical Label
```txt
Pretendard SemiBold
```

### Rule
손글씨는 **사람이 옆에서 메모해준 느낌**을 위한 Secondary Voice로만 사용한다.

---

# 137. Paper / Document Texture

허용:
- Warm white
- Light cream
- 미세한 paper grain
- 약한 photocopy / editorial texture

금지:
- 원문 가독성을 떨어뜨리는 얼룩
- 과도한 aged-paper 효과
- 강한 noise
- Marker와 경쟁하는 배경색

> **문서의 물성은 느껴지되, 학습 정보는 디지털처럼 선명해야 한다.**

---

# 138. Motion System

영상에서는 Annotation이 사고 과정처럼 나타나야 한다.

```txt
Original text appears
↓
Marker swipe
↓
Underline draw
↓
Margin note write-on
↓
Arrow draw
↓
Correction reveal
↓
Final answer emphasis
```

권장:

```txt
Highlight swipe    180–350ms
Underline draw     150–250ms
Circle draw        180–300ms
Arrow draw         200–400ms
Margin note        250–500ms
Correction reveal  200–350ms
```

---

# 139. Active Reading — MUST / MUST NOT

## MUST
- Original Text를 항상 읽을 수 있게 한다.
- Annotation마다 학습 목적이 있어야 한다.
- 색상 의미를 일관되게 유지한다.
- Margin Note는 짧게 쓴다.
- Primary Learning Goal을 한 화면에 하나 둔다.
- 수정 과정과 최종 결과를 구분한다.
- Annotation이 등장하는 순서 자체가 설명 순서가 되게 한다.

## MUST NOT
- 원문보다 메모를 더 크게 만들지 않는다.
- 모든 텍스트를 형광펜 처리하지 않는다.
- 장식 목적으로 밑줄/동그라미를 추가하지 않는다.
- 색상만으로 강세·문법·뜻을 구분하지 않는다.
- 손글씨를 본문 전체에 사용하지 않는다.
- Annotation이 서로 겹쳐 원문을 가리지 않게 한다.

---

# 140. AI Generation Specification — Editorial Annotation

```txt
Create an editorial active-reading annotation layout.

CORE IDEA
Preserve the original text as the primary source.
Add a secondary layer of visible thinking and learning annotations.

VISUAL LANGUAGE
- clean editorial document
- warm white or light cream paper
- readable black original text
- hand-drawn marker highlights
- underlines
- circles
- short margin notes
- small arrows
- occasional corrections and strike-throughs
- handwritten annotations used sparingly

COLOR SEMANTICS
- orange = stress / key sound / important transformation
- blue = linking / reduction / connected speech
- pink = grammar / sentence structure
- yellow = meaning / memory point
- red = correction / exception / warning
- black = original source text

LAYOUT
- original text remains dominant
- annotations stay close to their targets
- margin notes are concise
- leave generous whitespace
- avoid crossing leader lines
- activate only the colors needed for the lesson

EDUCATIONAL PRIORITY
1. original text readability
2. learning target
3. annotation meaning
4. reading order
5. visual character

DO NOT
- cover the source text
- highlight entire paragraphs without purpose
- use every annotation color at once
- turn all text into handwriting
- add decorative marks with no instructional meaning
- overcrowd margins
```

---

# 141. Updated System Map

```txt
LAYER 1 — INFORMATION STRUCTURE
Hierarchy / Sequence / Cause & Effect / Compare / Flow / etc.

LAYER 2 — VISUAL STYLE
Neo-Brutalist
Editorial Roadmap
Swiss Geometric
Visual Sketchnote

LAYER 3 — ILLUSTRATION MODE
Vintage Educational Plate
→ 실제 구조 / 위치 / 작동 원리

LAYER 4 — SOURCE ANNOTATION MODE
Editorial Annotation / Active Reading
→ 기존 문장 / 자막 / 기사 / 대사 직접 해부
```

### Selection Logic

```txt
정보 관계를 정해야 하는가?
→ Educational Visual Structure

추상 개념을 새로 설명하는가?
→ Swiss Geometric / Visual Sketchnote

실제 위치와 구조를 보여줘야 하는가?
→ Vintage Educational Plate

이미 존재하는 텍스트를 분석하는가?
→ Editorial Annotation / Active Reading
```

> **Editorial Annotation의 목적은 원문을 꾸미는 것이 아니라, 학습자가 원문을 읽으면서 무엇을 봐야 하는지 시각적으로 드러내는 것이다.**

---

# 142. Flashcard / One-Concept Learning Card System

> 7번 레퍼런스에서 가져오는 핵심은 어린이용 장식이 아니라 **한 카드에 하나의 개념만 넣어 즉시 인지·회상하게 만드는 정보 구조**다.
>
> 프로젝트에서는 이를 **Adult Beginner Learning Card**로 재해석한다.

## 142.1 Role

```txt
Editorial Annotation
→ 기존 문장을 해부

Vintage Educational Plate
→ 실제 구조와 위치를 해부

Visual Sketchnote
→ 이유와 관계를 설명

Flashcard
→ 하나의 개념을 빠르게 인지하고 기억
```

적합한 콘텐츠:
- Shorts 퀴즈
- 단어 카드
- 철자 → 소리
- 규칙 → 예시
- 발음 비교
- 복습 화면
- 영상 중간 Recall
- Instagram / TikTok 학습 카드
- 썸네일 보조 카드

---

# 143. One Card = One Learning Target

기본 원칙:

> **한 카드에는 하나의 질문 또는 하나의 학습 목표만 둔다.**

기본 구조:

```txt
┌──────────────────────┐
│ PH                   │
│                      │
│      [PHONE]         │
│                      │
│          /f/         │
└──────────────────────┘
```

또는:

```txt
┌──────────────────────┐
│ -TION                │
│                      │
│ INFORMATION          │
│                      │
│ /ʃən/                │
└──────────────────────┘
```

---

# 144. Card Information Hierarchy

권장 순서:

```txt
1. TARGET
2. VISUAL / EXAMPLE
3. ANSWER / SOUND
4. OPTIONAL MICRO NOTE
```

### Priority

```txt
TARGET
↓
RECOGNITION
↓
ASSOCIATION
↓
RECALL
```

카드를 1초 정도 보았을 때 무엇을 배워야 하는지 파악되지 않으면 정보가 너무 많다.

---

# 145. Adult Beginner Adaptation

원본 레퍼런스의 다음 요소는 그대로 사용하지 않는다.

```txt
Rainbow palette
Toy-room background
Excessive cartoon decoration
Multiple competing characters
Child-oriented typography
Decorative stars / confetti overload
```

프로젝트 변환:

```txt
Warm Paper / Black
+ 1–2 Accent Colors
+ Bold Sans Serif
+ Large Learning Target
+ Generous Whitespace
+ Strong Border
+ Simple Illustration
```

### Principle

> **구조는 Flashcard, 인상은 성인 학습 콘텐츠.**

---

# 146. Card Anatomy

```txt
┌────────────────────────┐
│ CATEGORY / SMALL LABEL │
│                        │
│      MAIN TARGET       │
│                        │
│     VISUAL / WORD      │
│                        │
│       ANSWER           │
│                        │
│ optional micro note    │
└────────────────────────┘
```

### Recommended Ratio

```txt
Target        20–25%
Visual        35–45%
Answer        20–25%
Whitespace    15–25%
```

---

# 147. Flashcard Color Semantics

기존 Annotation System과 충돌하지 않도록 의미를 고정한다.

```txt
BLUE
→ Spelling / Letter / Written Form

ORANGE
→ Sound / Stress / Pronunciation

PINK
→ Exception / Irregular / Caution

GREEN
→ Correct / Practice / Success

BLACK
→ Core Information

PAPER / WHITE
→ Base
```

### Rules
- 한 카드의 주요 Accent는 1개.
- 필요할 때 Secondary Accent 1개 추가.
- 무지개식 임의 색상 사용 금지.
- 색만으로 정답을 전달하지 않는다.

---

# 148. Typography

```txt
Main Letter / Target
→ Pretendard Black
→ Gmarket Sans Bold

Answer / Sound
→ Pretendard ExtraBold

Supporting Text
→ Pretendard Medium

IPA
→ Noto Sans / readable sans-serif
```

### Rules
- Target이 가장 크다.
- 단어는 이미지보다 작아도 되지만 Answer보다 명확해야 한다.
- 장식적 손글씨는 기본 카드에서 사용하지 않는다.
- 한 카드에서 Font Family를 과도하게 섞지 않는다.

---

# 149. Border & Container System

기본 카드:

```css
.learning-card {
  background: #FAF9F5;
  border: 3px solid #171717;
  border-radius: 16px;
}
```

Neo-Brutalist 변형:

```css
.learning-card--brutal {
  border: 4px solid #000;
  box-shadow: 7px 7px 0 #000;
}
```

### Rule
- 카드 테두리는 카드 간 구분을 위한 기능 요소.
- 장식적 이중 테두리를 남용하지 않는다.
- 카드가 여러 개 있을 때 Border weight를 통일한다.

---

# 150. Spelling → Sound Card

```txt
┌──────────────────┐
│       PH         │
│                  │
│      PHONE       │
│                  │
│       /f/        │
└──────────────────┘
```

정보 의미:

```txt
PH
→ Written Pattern

PHONE
→ Example

/f/
→ Sound
```

이 구조는 `EA`, `OO`, `TION`, `SION`, `CH`, `TH` 등에 재사용한다.

---

# 151. Word + Image Card

```txt
┌──────────────────┐
│        B         │
│                  │
│      [BIRD]      │
│                  │
│       BIRD       │
└──────────────────┘
```

성인용에서는 Illustration을 단순하고 실제 인지에 도움이 되는 수준으로 유지한다.

사진을 사용할 수도 있지만 카드 전체의 시각 언어를 통일한다.

---

# 152. Stress Card

```txt
┌──────────────────┐
│      -IC         │
│                  │
│    roBOTic       │
│      ━━━         │
│                  │
│  앞 음절에 강세 │
└──────────────────┘
```

Orange Accent는 강세 위치에만 사용한다.

---

# 153. Reduction Card

Front:

```txt
┌──────────────────┐
│   GOING TO       │
│                  │
│       ?          │
└──────────────────┘
```

Reveal:

```txt
┌──────────────────┐
│   GOING TO       │
│       ↓          │
│     GONNA        │
│                  │
│ 실제 회화 소리  │
└──────────────────┘
```

퀴즈와 Reveal은 같은 Layout을 유지한다.

---

# 154. Compare Pair Cards

```txt
┌────────────┐   ┌────────────┐
│     F      │   │     V      │
│            │   │            │
│    /f/     │   │    /v/     │
│            │   │            │
│ 무성음     │   │ 유성음     │
└────────────┘   └────────────┘
```

### Rules
- 크기 동일.
- 내부 구조 동일.
- 차이만 Accent.
- 비교 기준을 동일하게 유지.

---

# 155. Rule / Exception Cards

Rule:

```txt
┌──────────────────┐
│      RULE        │
│                  │
│ C + E/I/Y → /s/ │
│                  │
│      CITY        │
└──────────────────┘
```

Exception:

```txt
┌──────────────────┐
│    EXCEPTION     │
│                  │
│      ...         │
│                  │
│       !          │
└──────────────────┘
```

Exception Card는 Pink Accent를 사용할 수 있다.

---

# 156. Recall / Quiz Card

질문 단계:

```txt
┌──────────────────┐
│ 강세는 어디?     │
│                  │
│   ro · bo · tic  │
│                  │
│      A B C       │
└──────────────────┘
```

정답 단계:

```txt
┌──────────────────┐
│       정답       │
│                  │
│    ro · BO · tic │
│         ✓        │
└──────────────────┘
```

정답 공개 시 Layout 이동을 최소화한다.

---

# 157. Card Deck Logic

여러 카드를 사용할 때는 Deck 자체가 학습 순서를 가져야 한다.

```txt
CARD 1
Recognize

CARD 2
Understand

CARD 3
Compare

CARD 4
Recall

CARD 5
Apply
```

예:

```txt
PH
↓
PHONE
↓
/f/
↓
PH vs F
↓
QUIZ
```

---

# 158. Shorts Card Sequence

Shorts 권장 흐름:

```txt
0–2s
QUESTION CARD

2–4s
THINK / COUNTDOWN

4–7s
ANSWER CARD

7–12s
EXAMPLE CARD

12–18s
SECOND EXAMPLE

18–25s
RECALL CARD
```

카드 구조가 반복되므로 학습자가 내용에 집중하기 쉽다.

---

# 159. Motion Rules

카드는 복잡한 Motion보다 명확한 Reveal을 우선한다.

```txt
Card enter
Target appear
Visual appear
Answer reveal
Accent pulse
Card exit
```

권장:

```txt
Card Enter      180–300ms
Target          120–200ms
Answer Reveal   180–300ms
Accent Pulse    150–250ms
```

과도한 Bounce, Spin, 3D Flip은 기본적으로 사용하지 않는다.

---

# 160. Flashcard Density Rules

한 카드 권장:

```txt
1 Target
1 Example / Visual
1 Answer
0–1 Micro Note
```

### Avoid

```txt
2개 이상의 학습 규칙
긴 문단
3개 이상의 이미지
여러 개의 CTA
4색 이상의 Accent
복잡한 배경
```

---

# 161. Accessibility & Adult Readability

- 큰 Target.
- 충분한 대비.
- 작은 설명문 최소화.
- 색상 외에 굵기/위치/기호로 의미 반복.
- IPA는 너무 작게 만들지 않는다.
- 한글 설명은 한눈에 읽히는 길이로 제한한다.
- 모바일 9:16 화면에서도 카드 핵심이 즉시 보여야 한다.

---

# 162. Flashcard × Existing Systems

```txt
Flashcard + Neo-Brutalist
→ 강한 Quiz / CTA 카드

Flashcard + Swiss Geometric
→ 철자·소리 관계 카드

Flashcard + Visual Sketchnote
→ Answer Reveal 후 짧은 설명

Flashcard + Vintage Plate
→ 혀 위치 / 입 모양 한 개념 카드

Flashcard + Editorial Annotation
→ 문장에서 특정 Chunk만 추출한 복습 카드
```

Flashcard는 다른 스타일을 담는 **Reusable Learning Component**로 사용할 수 있다.

---

# 163. Flashcard — MUST / MUST NOT

## MUST
- One Card = One Learning Target.
- Target을 가장 먼저 보이게 한다.
- 카드 간 Layout을 반복한다.
- Accent Color에 의미를 부여한다.
- 충분한 여백을 둔다.
- Answer Reveal 전후 위치를 안정적으로 유지한다.
- 성인 초보 학습자가 즉시 이해할 수 있게 한다.

## MUST NOT
- 원본 키즈 디자인을 그대로 복제하지 않는다.
- 무지개 색상을 임의로 사용하지 않는다.
- 캐릭터와 장난감으로 빈 공간을 채우지 않는다.
- 한 카드에 여러 규칙을 넣지 않는다.
- 복잡한 배경을 사용하지 않는다.
- 지나치게 귀여운 Typography를 기본값으로 삼지 않는다.
- 이미지가 학습 Target보다 강하게 보이지 않게 한다.

---

# 164. AI Generation Specification — Adult Beginner Flashcard

```txt
Create a one-concept educational flashcard for an adult beginner English learner.

CORE PRINCIPLE
One card equals one learning target.

STYLE
- clean adult educational design
- warm paper or white background
- black structured typography
- one primary accent color
- optional second functional accent
- strong card border
- generous whitespace
- simple meaningful illustration only when useful
- high readability on mobile

INFORMATION HIERARCHY
1. target spelling / rule / question
2. example or visual
3. answer / sound / pronunciation
4. optional one-line note

COLOR SEMANTICS
- blue = spelling / written form
- orange = sound / stress / pronunciation
- pink = exception / irregular / caution
- green = correct / practice / success
- black = core information

DO
- use large bold sans-serif typography
- maintain consistent card anatomy
- keep one focal point
- make quiz and answer states visually stable
- use illustration for recognition, not decoration

DO NOT
- use rainbow colors without meaning
- use toddler aesthetics
- fill empty space with toys or confetti
- use multiple cartoon characters unnecessarily
- include long paragraphs
- place multiple learning targets on one card
- use more than two strong accent colors

PRIORITY
1. instant recognition
2. recall
3. readability
4. consistency
5. visual appeal
```

---

# 165. Updated System Map — Reusable Learning Component

```txt
LAYER 1 — INFORMATION STRUCTURE
Educational Visual Structure

LAYER 2 — VISUAL STYLE
Neo-Brutalist
Editorial Roadmap
Swiss Geometric
Visual Sketchnote

LAYER 3 — ILLUSTRATION MODE
Vintage Educational Plate

LAYER 4 — SOURCE ANNOTATION MODE
Editorial Annotation / Active Reading

LAYER 5 — REUSABLE LEARNING COMPONENT
Flashcard / One-Concept Learning Card
```

### Selection Logic

```txt
복잡한 관계를 구조화?
→ Educational Visual Structure

추상 개념 설명?
→ Swiss Geometric / Visual Sketchnote

실제 위치·구조?
→ Vintage Educational Plate

기존 문장 직접 분석?
→ Editorial Annotation

하나의 개념을 빠르게 인지·기억?
→ Flashcard
```

> **Flashcard System은 어린이용 카드 스타일이 아니라, 학습자가 하나의 규칙·소리·단어를 짧은 시간 안에 인지하고 회상하게 만드는 반복 가능한 학습 컴포넌트다.**
