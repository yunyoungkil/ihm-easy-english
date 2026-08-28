
> Reference canvas: **735 × 916 px**  
> Goal: 첨부된 UI 보드 이미지를 Figma, HTML/CSS, React 등의 환경에서 최대한 동일하게 재현한다.

---

## 1. Artboard / Canvas

- **Canvas:** `735 × 916px`
    
- **Aspect Ratio:** `0.8024`
    
- **Orientation:** Portrait
    
- **Base Background:** 따뜻한 회색 계열
    
- 전체적으로 상단이 밝고 하단으로 갈수록 조금 어두워진다.
    

```
background:
  radial-gradient(
    circle at 50% 22%,
    rgba(255,255,255,.30),
    transparent 38%
  ),
  linear-gradient(
    180deg,
    #D8D7D3 0%,
    #C9C7C2 50%,
    #BEBBB5 100%
  );

box-shadow:
  inset 0 0 90px rgba(78,75,70,.06);
```

### 전체 디자인 방향

스타일은 **Soft Neumorphism + Muted Pastel UI**.

반드시 다음 특징을 유지한다.

- 검은색 외곽선 사용 금지
    
- 채도가 높은 색상 사용 금지
    
- 모든 UI 요소에 둥근 모서리 사용
    
- 오른쪽 아래 방향의 부드러운 그림자
    
- 왼쪽 위에는 약한 하이라이트
    
- 아이콘은 얇은 monoline
    
- 컬러 카드의 텍스트는 off-white
    
- 밝은 UI의 텍스트는 dark gray
    
- 요소 사이 간격을 넉넉하게 유지
    
- 그림자는 날카롭지 않고 퍼져 있어야 함
    

---

# 2. Main Layout

중앙 콘텐츠 영역:

```
Left Margin   ≈ 75px
Right Margin  ≈ 74px

Content Width ≈ 586px

Top Start     ≈ 65px
Bottom End    ≈ 857px
```

### 3 Column Grid

```
Column 1 X = 76px
Column 2 X = 274px
Column 3 X = 473px
```

각 컬럼의 기본 폭:

```
177 ~ 179px
```

### Vertical Zones

```
ZONE 01
Top Cards
Y = 65 ~ 264

ZONE 02
State Pills
Y = 295 ~ 340

ZONE 03
Controls
Y = 369 ~ 638

ZONE 04
Bottom Panels
Y = 672 ~ 857
```

---

# 3. Color System

## Background

```
--bg-top:       #D8D7D3;
--bg-mid:       #C9C7C2;
--bg-bottom:    #BEBBB5;

--surface:      #E7E4DE;
--surface-soft: #DEDAD4;
--surface-dark: #D0CEC8;
```

## Typography

```
--ink:        #555751;
--ink-soft:   #777A74;
--white-soft: #F3F2ED;
```

## Accent Colors

```
--sage:         #7F9E8F;
--mint-gray:    #A8B5AB;
--blue-gray:    #789094;
--dusty-blue:   #8599A0;
--muted-green:  #8FA292;
--pale-sage:    #B6C1B5;

--lavender:     #B6ACC9;
--icy-blue:     #8FA6AE;
--seafoam:      #94AD9D;

--red-dot:      #D45662;
--amber-pale:   #D9BB91;
```

---

# 4. Shadow System

이 디자인을 비슷하게 만드는 데 가장 중요한 요소 중 하나다.

## Raised Card

```
box-shadow:
  0 10px 18px rgba(80,76,70,.22),
  0 3px 6px rgba(80,76,70,.14),
  inset 0 1px 0 rgba(255,255,255,.24);
```

## Normal Control

```
box-shadow:
  0 5px 10px rgba(87,84,79,.16),
  inset 0 1px 1px rgba(255,255,255,.50);
```

## Focus Glow

```
box-shadow:
  0 0 0 3px rgba(220,214,255,.60),
  0 6px 14px rgba(115,106,155,.18),
  inset 0 1px 1px rgba(255,255,255,.55);
```

## Recessed Control

```
box-shadow:
  inset 2px 2px 5px rgba(100,96,89,.20),
  inset -2px -2px 5px rgba(255,255,255,.50);
```

---

# 5. Border Radius

```
--radius-card:    14px;
--radius-panel:   17px;
--radius-small:   6px;

--radius-pill:    20px;
--radius-input:   22px;

--radius-circle:  50%;
```

---

# 6. Typography

추천:

```
font-family:
  Inter,
  "SF Pro Display",
  Manrope,
  "Helvetica Neue",
  sans-serif;
```

### Size

```
Top Card Title
12~13px
font-weight: 600

Top Card Subtitle
8~9px
font-weight: 400

Controls
9~10px
font-weight: 500

Panel Labels
9~10px

Empty State Title
11~12px
font-weight: 600

Caption
7~8px

Side Codes
10~11px
font-weight: 500
```

공통:

```
letter-spacing: -0.01em;
```

Pure black 대신:

```
color: #52544F;
```

---

# 7. Side Vertical Strips

이미지 좌우에 세로 방향의 작은 캡슐이 배치된다.

## Left

```
X ≈ 17px
W ≈ 24px
```

각 항목:

```
width: 24px;
border-radius: 11px;
background: #D4D0CA;
color: #444640;
```

텍스트:

```
writing-mode: vertical-rl;
transform: rotate(180deg);
```

Reference와 마찬가지로 텍스트 자체보다 **세로 코드 라벨처럼 보이는 시각적 효과**가 중요하다.

---

# 8. Top Cards

총 6개.

```
3 columns × 2 rows
```

## Position

```
ROW 1
Y ≈ 65px

ROW 2
Y ≈ 176px

COLUMN 1
X ≈ 76px

COLUMN 2
X ≈ 274px

COLUMN 3
X ≈ 473px
```

## Card Size

```
width: 177px;
height: 88px;
border-radius: 14px;
```

---

## Card 01

```
X 76
Y 65
W 177
H 88

Fill #809E90
```

내용:

```
◎   Tives
    Lirming
```

아이콘:

- circular target
    
- white monoline
    

---

## Card 02

```
X 274
Y 65

Fill #A9B6AC
```

아이콘:

```
4 × 4 dot grid
```

내용:

```
Sonbri
Venornan Stoes
```

---

## Card 03

```
X 473
Y 65

Fill #7A9398
```

아이콘:

- abstract branching symbol
    
- airplane/branch 느낌
    

---

## Card 04

```
X 76
Y 176

Fill #879DA4
```

아이콘:

- 작은 device/document outline
    

---

## Card 05

```
X 274
Y 176

Fill #8FA292
```

아이콘:

- diagonal link / capsule
    

---

## Card 06

```
X 473
Y 176

Fill #B5C0B4
```

아이콘:

- circular eye/ring
    

---

## Card Internal Layout

```
Left Padding ≈ 18px

Icon:
25 × 25px

Text Start:
≈ 53px from left
```

전체 내용은 수직 중앙 정렬.

---

# 9. State Pills

Y 위치:

```
295 ~ 340px
```

## Hover

```
X 76
W 100
H 40
```

```
background: #B6AEC8;
border-radius: 20px;
```

아이콘:

```
+
```

Text:

```
Hover
```

---

## Hover Light

```
X 191
W 99
H 40
```

```
background: #E7E4DF;
```

---

## Pressed

```
X 305
W 99
H 40
```

```
background: #8FA6AE;
```

Text:

```
Pressed
```

---

## Green State

```
X 420
W 98
H 40
```

```
background: #94AA9D;
```

---

# 10. Circular Action Button

```
Center X ≈ 603px
Center Y ≈ 316px

Diameter ≈ 68px
```

```
width: 68px;
height: 68px;

border-radius: 50%;

background: #9FB2A6;

border:
  7px solid rgba(230,230,222,.6);
```

아이콘:

- plant / node 형태
    
- white monoline
    

---

# 11. Settings Panel

```
X 76
Y 369
W 157
H 269
```

```
background: #E7E4DE;
border-radius: 17px;
```

Shadow:

```
box-shadow:
  0 9px 17px rgba(70,67,62,.18),
  inset 0 1px 1px rgba(255,255,255,.65);
```

---

# 12. Settings Rows

5개의 row.

```
Row W ≈ 126px
Row H ≈ 35px
```

구성:

```
ICON | LABEL | >
```

예:

```
▣ Default >
▤ Reanions >
♙ Bibah Crrors >
⌕ Focsons >
▱ Sording >
```

Row:

```
background: rgba(255,255,255,.15);
border-radius: 6px;
```

---

# 13. Settings Main Button

```
X ≈ 90
Y ≈ 560
W ≈ 126
H ≈ 30
```

```
background: #8CA494;
border-radius: 15px;
color: #F3F2ED;
```

---

# 14. Settings Bottom Icons

하단에 작은 원형 아이콘 4~5개 배치.

```
Diameter ≈ 18~22px
```

색상:

```
gray
lavender
light gray
teal
blue-green
```

Raised와 recessed 상태를 섞어 사용한다.

---

# 15. Main Form Controls

## Default

```
X ≈ 263
Y ≈ 371

W ≈ 113
H ≈ 42
```

```
border-radius: 21px;
background: #E7E4DE;
```

Lavender glow 적용.

내용:

```
icon
Default
circle icon
```

---

# 16. Focused

```
W ≈ 106
H ≈ 42
```

왼쪽:

```
width: 10px;
height: 10px;
background: #D45662;
border-radius: 50%;
```

Text:

```
Focused
```

오른쪽:

```
⌄
```

---

# 17. Complex Segmented Control

```
X ≈ 505
W ≈ 155
H ≈ 42
```

Outer:

```
border-radius: 21px;
```

Lavender glow.

내부:

```
icon | small segment | label | circle
```

---

# 18. Error Field

```
Y ≈ 438
W ≈ 114
H ≈ 40
```

구성:

```
× Error ⌄
```

---

# 19. Filled Field

```
W ≈ 110
H ≈ 40
```

구성:

```
⊖ Filled ○
```

---

# 20. Progress Capsule

```
W ≈ 145
H ≈ 40
```

내부:

```
| | | |     →
```

오른쪽 원형 버튼:

```
background: #7E9D8C;
border-radius: 50%;
```

---

# 21. Long Tick Slider

```
X ≈ 264
Y ≈ 500

W ≈ 240
H ≈ 50
```

```
background: #E5E2DD;
border-radius: 25px;
```

Lavender glow 적용.

내부에 약:

```
12 vertical ticks
```

균등 배치.

---

# 22. Toggle Controls

## Toggle 1

```
W 53
H 28
```

Track:

```
background: #DAD8D3;
border-radius: 14px;
```

Thumb:

```
width: 23px;
height: 23px;

background: #ECEAE5;
border-radius: 50%;
```

---

## Multi Color Toggle

```
W ≈ 51
H ≈ 28
```

겹치는 원:

```
gray-blue
teal
warm beige
```

Reference처럼 오른쪽 beige circle이 일부 보이게 한다.

---

# 23. Horizontal Slider Card

```
X ≈ 263
Y ≈ 575

W ≈ 207
H ≈ 56
```

```
background: #E7E4DE;
border-radius: 26px;
```

상단:

```
ON                         OFF
```

중앙 horizontal line.

하단:

```
12 tick marks
```

Thumb:

```
18 × 27px
```

색상:

```
background: #99A79D;
```

---

# 24. Lavender Action Button

```
X ≈ 502
Y ≈ 589

W ≈ 155
H ≈ 45
```

```
background: #B8AEC8;
border-radius: 22px;
```

내용:

```
○  Ephinodagios
```

violet glow 적용.

---

# 25. Empty State Card

```
X ≈ 75
Y ≈ 672

W ≈ 208
H ≈ 182
```

```
background: #E8E4DE;
border-radius: 17px;
```

---

## Illustration

상단 중앙:

```
약 50 × 50px
```

사람 캐릭터:

- 얼굴
    
- 머리
    
- 한 손을 위로 들고 있음
    
- 검은색/회색 monoline
    
- 주변 작은 sparkle/dot
    

---

## Empty State Text

Title:

```
Empty States
```

```
font-size: 12px;
font-weight: 600;
```

Subtitle:

```
font-size: 7.5px;
color: #96938D;
text-align: center;
```

2줄 정도.

---

# 26. Bottom Segmented Navigation

Outer:

```
X ≈ 311
Y ≈ 671

W ≈ 345
H ≈ 64
```

```
background: #E7E4DF;
border-radius: 15px;
```

Inner:

```
X ≈ 337
Y ≈ 685

W ≈ 294
H ≈ 38
```

3 segments.

---

## Segment 01

```
background: #94AB9B;
```

```
icon
Nover
```

---

## Segment 02

```
background: #819AA0;
```

```
icon
Comelons
```

---

## Segment 03

```
background: #A5B5A6;
```

```
icon
Doiden
```

---

# 27. Bottom Table Panel

```
X ≈ 311
Y ≈ 749

W ≈ 346
H ≈ 108
```

```
background: #E7E4DF;
border-radius: 14px;
```

Header:

```
Table Lsdtcision                         +
```

아래 divider.

---

# 28. Table Grid

```
2 rows × 4 columns
```

Cell:

```
W ≈ 72~75px
H ≈ 28px
```

### Row 1

```
On/Off
Default
Hover
Selected
```

Hover:

```
background: #A7B6A8;
```

Selected:

```
background: #899DA0;
```

### Row 2

```
Enclale
Enquted
Hourres
Staves
```

기본 Cell:

```
background: rgba(210,208,202,.55);
border-radius: 5px;
```

---

# 29. Icon Design

모든 아이콘:

```
Monoline
Round cap
Round join
```

Stroke:

```
stroke-width: 1.2px ~ 1.6px;
```

추천 라이브러리:

```
Lucide
Feather
Phosphor Light
```

Material Filled 스타일은 사용하지 않는다.

---

# 30. Complete CSS Tokens

```
:root {

  --bg-top: #D8D7D3;
  --bg-mid: #C9C7C2;
  --bg-bottom: #BEBBB5;

  --surface: #E7E4DE;
  --surface-soft: #DEDAD4;

  --ink: #555751;
  --ink-soft: #777A74;
  --white-soft: #F3F2ED;

  --sage: #7F9E8F;
  --mint-gray: #A8B5AB;
  --blue-gray: #789094;
  --dusty-blue: #8599A0;
  --muted-green: #8FA292;
  --pale-sage: #B6C1B5;

  --lavender: #B6ACC9;
  --icy-blue: #8FA6AE;
  --seafoam: #94AD9D;

  --red-dot: #D45662;
  --amber-pale: #D9BB91;

  --radius-card: 14px;
  --radius-panel: 17px;
  --radius-pill: 20px;

  --shadow-raised:
    0 10px 18px rgba(80,76,70,.22),
    0 3px 6px rgba(80,76,70,.14),
    inset 0 1px 0 rgba(255,255,255,.24);

  --shadow-control:
    0 5px 10px rgba(87,84,79,.16),
    inset 0 1px 1px rgba(255,255,255,.50);

  --glow-focus:
    0 0 0 3px rgba(220,214,255,.60),
    0 6px 14px rgba(115,106,155,.18),
    inset 0 1px 1px rgba(255,255,255,.55);
}
```

---

# 31. Recommended HTML Structure

```
<main class="ui-board">

  <aside class="palette palette-left"></aside>
  <aside class="palette palette-right"></aside>

  <section class="top-card-grid">
    <!-- 6 cards -->
  </section>

  <section class="state-pills">
    <!-- hover / pressed / etc -->
  </section>

  <section class="controls-area">

    <div class="settings-panel"></div>

    <div class="form-showcase"></div>

  </section>

  <section class="bottom-area">

    <article class="empty-state-card"></article>

    <div class="data-showcase">

      <div class="segment-card"></div>

      <div class="table-card"></div>

    </div>

  </section>

</main>
```

---

# 32. Pixel Accurate Strategy

Reference 이미지와 최대한 동일하게 만들려면 반응형 Grid보다 **735 × 916 고정 좌표계 + absolute positioning**을 우선 사용한다.

```
.ui-board {

  position: relative;

  width: 735px;
  height: 916px;

  overflow: hidden;
}
```

예:

```
.top-card.card-1 {

  position: absolute;

  left: 76px;
  top: 65px;

  width: 177px;
  height: 88px;
}
```

반응형으로 보여줘야 할 경우 내부 요소를 재배치하지 않고 **전체 보드 자체를 scale**한다.

---

# 33. Visual Priority

Reference와 비슷하게 보이게 만드는 우선순위:

```
1. Layout
2. Component size
3. Muted color palette
4. Soft shadows
5. Border radius
6. Lavender focus glow
7. Thin icons
8. Typography
9. Side decorative labels
```

특히 그림자의 영향이 크다.

단순한:

```
box-shadow: 0 3px 5px #999;
```

같은 그림자를 사용하면 Reference와 매우 다르게 보인다.

반드시 넓고 흐린 shadow를 사용한다.

---

# 34. Figma Settings

Frame:

```
735 × 916
```

Top Card:

```
177 × 88
Radius 14
```

Shadow 1:

```
X 0
Y 10
Blur 18
Opacity 22%
```

Shadow 2:

```
X 0
Y 3
Blur 6
Opacity 14%
```

Inner Highlight:

```
X 0
Y 1
Blur 0
White 24%
```

Focus Glow:

```
Lavender
Opacity 45~65%
Blur 8~12
```

---

# 35. Reconstruction Checklist

- Canvas가 `735 × 916px`인가?
    
- 배경이 흰색이 아니라 warm gray인가?
    
- 상단에 `3 × 2` 카드가 존재하는가?
    
- 카드가 저채도 sage/blue/gray 계열인가?
    
- 카드 아래 그림자가 충분히 넓은가?
    
- 카드 radius가 약 `14px`인가?
    
- 두 번째 영역에 4개의 pill이 존재하는가?
    
- 오른쪽에 큰 원형 green action button이 있는가?
    
- 중앙 왼쪽에 settings panel이 있는가?
    
- Focus UI 주변에 lavender glow가 있는가?
    
- Error / Filled control이 존재하는가?
    
- 긴 tick slider가 존재하는가?
    
- 오른쪽에 toggle 두 개가 존재하는가?
    
- 하단 왼쪽에 Empty States card가 있는가?
    
- 하단 오른쪽에 3-segment navigation이 있는가?
    
- 그 아래 2×4 table이 있는가?
    
- 좌우에 vertical decorative labels가 있는가?
    
- 아이콘이 thin monoline인가?
    
- pure black이 거의 사용되지 않았는가?
    

---

# 36. Fine Tuning

실제 Reference 이미지를 옆에 놓고 비교할 때는 다음 값부터 조절한다.

```
Top Card Width
±3px

Top Card Y Gap
±4px

Column X
±4px

Shadow Y
8~12px

Shadow Blur
14~22px

Lavender Glow Opacity
45~70%

Pill Height
38~43px

Background Gray
±5 RGB
```

이 값들이 전체적인 유사도에 가장 큰 영향을 준다.

---

# 37. 핵심 구현 원칙

이 디자인은 개별 컴포넌트보다 **전체 조명과 재질 표현**이 중요하다.

따라서 단순히 색과 위치만 복제하지 말고 모든 Surface에 다음 공통 원리를 적용한다.

```
밝은 왼쪽 위
+
어두운 오른쪽 아래
+
낮은 채도
+
큰 Blur Shadow
+
얇은 Highlight
+
둥근 Geometry
```

목표는 일반적인 Flat UI가 아니라 **부드러운 실물 플라스틱/고무 UI 샘플 보드처럼 보이는 것**이다.

Reference 이미지의 흐릿하고 따뜻한 조명과 낮은 대비를 그대로 유지한다.