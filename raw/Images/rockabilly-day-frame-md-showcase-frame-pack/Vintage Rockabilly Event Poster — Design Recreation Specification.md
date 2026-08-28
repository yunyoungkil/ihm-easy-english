## 0. 목적

이 문서는 제공된 레퍼런스 이미지와 최대한 유사한 **1950s Rockabilly / Hot Rod / Letterpress 빈티지 이벤트 포스터**를 재현하기 위한 디자인 명세다.

단순히 같은 정보를 배치하는 것이 아니라 다음 시각적 특징까지 재현하는 것을 목표로 한다.

- 오래된 크림색 종이
    
- 3~4색 제한 인쇄
    
- 붉은색 + 검정 + 민트/청록 조합
    
- 스크린프린트/실크스크린 느낌
    
- 잉크 번짐과 색판 어긋남
    
- 거친 halftone
    
- 손으로 그린 듯한 타이포그래피
    
- 대형 자동차 일러스트
    
- Spark Plug 오브젝트
    
- 리본형 날짜 배너
    
- 1940~50년대 광고 포스터 같은 구성
    
- Rockabilly / Hot Rod 문화의 시각 언어
    

---

# 1. Canvas

레퍼런스 비율:

```
Width  ≈ 709
Height ≈ 992

Aspect Ratio ≈ 0.715
```

권장 제작 해상도:

```
1418 × 1984 px
```

고해상도:

```
2836 × 3968 px
```

인쇄 목적:

```
A3 / 300 DPI
```

세로형 Portrait 포스터다.

---

# 2. 전체 Composition

포스터를 크게 6개 영역으로 나눈다.

```
┌──────────────────────────────────┐
│ 01. TOP TAGLINE                  │
│                                  │
│ 02. RED DATE RIBBON              │
│                                  │
│       ROCKABILLY                 │
│          DAY #2                  │
│                                  │
│ 03. EVENT INFORMATION            │
│     + SPARK PLUG                 │
│                                  │
│ 04. BAND / FEATURE LIST          │
│                                  │
│ 05. LARGE CLASSIC CAR            │
│                                  │
│ 06. WEBSITE + LOCATION           │
└──────────────────────────────────┘
```

시각적 중요도:

```
1. ROCKABILLY
2. DAY
3. Classic Car
4. SEPTEMBER / DATE
5. Bands
6. Event Features
7. Website
8. Location
```

---

# 3. Color Palette

이 포스터에서 가장 중요한 규칙 중 하나는 **현대적인 풀컬러를 사용하지 않는 것**이다.

기본적으로 오래된 3~4색 인쇄물처럼 표현한다.

## Paper

```
--paper: #F2E7C7;
--paper-light: #F7EFD6;
--paper-shadow: #D7C89E;
```

순수한 흰색:

```
#FFFFFF
```

사용 금지.

---

## Primary Red

```
--vintage-red: #E34232;
--dark-red: #C93429;
--faded-red: #D94B3B;
```

너무 깨끗한 디지털 red가 되어서는 안 된다.

---

## Black

```
--ink-black: #080908;
--soft-black: #171714;
```

완벽하게 균일한 검정 면보다 texture가 들어간 검정을 사용한다.

---

## Mint / Turquoise

```
--mint: #8EC7B4;
--mint-light: #AED2BF;
--mint-dark: #669C8E;
```

자동차 그림자와 배경 장식의 핵심 색상.

---

# 4. Print Texture

이 디자인의 핵심은 **깨끗하게 만들지 않는 것**이다.

각 컬러 레이어에 별도의 texture가 존재해야 한다.

추천:

```
Paper Grain      20~35%
Ink Distress     15~30%
Halftone         10~25%
Speckles          5~15%
Edge Wear         5~10%
```

---

# 5. Paper Texture

배경은 오래된 인쇄용 종이다.

단색 beige를 사용하지 않는다.

레이어 구조:

```
BASE
#F2E7C7

+

Fine Paper Noise

+

Brown / Gray Fiber

+

Random Dark Flecks

+

Subtle Edge Aging
```

CSS 예시:

```
.poster {
  background:
    radial-gradient(
      circle at 40% 30%,
      rgba(255,255,255,.18),
      transparent 45%
    ),
    linear-gradient(
      180deg,
      #F4E9CA 0%,
      #EBDDAD 100%
    );
}
```

그 위에 noise texture를 Multiply로 올린다.

---

# 6. Ink Registration Error

현대적인 벡터 포스터처럼 모든 색이 완벽히 맞아서는 안 된다.

특히 대형 글자에서:

```
Black layer
Red layer
```

사이에 약간의 offset을 만든다.

권장:

```
X Offset: 2~5 px
Y Offset: 1~4 px
```

예:

```
ROCKABILLY

BLACK MAIN LETTER
+
RED OFFSET SHADOW
+
CREAM GAP
```

이 효과가 포스터의 정체성을 크게 결정한다.

---

# 7. Top Tagline

최상단:

```
Thousands of visitors from all over the world every year!!
```

위치:

```
X ≈ 25
Y ≈ 17

W ≈ 665
H ≈ 32
```

정렬:

```
CENTER
```

스타일:

```
Black
Hand-painted
Bold Script / Display
```

폰트 느낌:

```
Cooper 계열
Brush lettering
Vintage sign painting
1950s advertising
```

크기:

```
22~27px @ 709px canvas
```

---

# 8. Small Organizer Text

좌측 상단 날짜 리본 위.

```
VZW ROCKABILLYDAYBELGIUM
PRESENTS
```

색:

```
Muted Mint
```

매우 작게 표현한다.

이 텍스트는 정보 전달보다 **실제 오래된 이벤트 포스터 같은 디테일** 역할을 한다.

---

# 9. Decorative Stars

상단 양쪽.

```
LEFT STAR
X ≈ 27
Y ≈ 66

RIGHT STAR
X ≈ 638
Y ≈ 66
```

색:

```
BLACK
```

형태:

```
1950s four-point / irregular star
```

완벽하게 대칭적인 별보다 손으로 그린 듯한 별이 좋다.

---

# 10. Main Red Ribbon

상단 중앙에 거대한 빨간 리본이 있다.

대략:

```
Y = 60 ~ 295
```

텍스트:

```
SUNDAY SEPTEMBER 2nd
```

---

# 11. Ribbon Geometry

상단 리본은 완벽한 직사각형이 아니다.

중앙이 위쪽으로 볼록한 arc.

```
         ___________
      __/           \__
    /                   \
```

리본 본체:

```
Vintage Red
```

양 끝은 뒤쪽으로 접혀 들어간다.

오른쪽에는 긴 ribbon tail을 만든다.

---

# 12. Ribbon Typography

```
SUNDAY SEPTEMBER
```

색:

```
Cream
```

폰트:

```
Condensed
Heavy
Western / Circus
Block serif 또는 slab display
```

크기:

```
약 48~58px
```

약간 회전하거나 baseline을 ribbon curve에 맞춘다.

---

# 13. "2nd"

오른쪽:

```
2nd
```

`2`는 매우 크고:

```
nd
```

는 작게 위쪽에 붙인다.

색:

```
Cream
```

---

# 14. ROCKABILLY — Hero Typography

포스터에서 가장 중요한 요소.

대략:

```
X = 27
Y = 128

W ≈ 655
H ≈ 185
```

텍스트:

```
ROCKABILLY
```

---

# 15. ROCKABILLY Letter Construction

단순 폰트 한 번으로 표현하지 않는다.

3중 레이어:

```
Layer 1
BLACK MAIN LETTER

Layer 2
CREAM / PAPER OUTLINE

Layer 3
RED OFFSET SHADOW
```

구조:

```
████████████   ← Black
░░████████░░   ← Cream separation
  ████████     ← Red offset
```

---

# 16. ROCKABILLY Typography

스타일:

```
Hand-drawn
Irregular
Tall
Condensed
1950s Rock'n'Roll
Hot Rod lettering
```

글자별 회전:

```
-6° ~ +6°
```

Baseline도 완벽히 일직선으로 맞추지 않는다.

예:

```
R    O   C  K
  A   B   I
 L    L     Y
```

처럼 미세하게 흔들린다.

---

# 17. ROCKABILLY Colors

Main:

```
#080908
```

Inner/Offset:

```
#E34232
```

Outer separation:

```
#F2E7C7
```

Black outline은 두껍다.

---

# 18. DAY Typography

ROCKABILLY 바로 아래.

```
DAY
```

대략:

```
X ≈ 281
Y ≈ 260

W ≈ 210
H ≈ 105
```

`ROCKABILLY`와 동일한 typography system 사용.

```
BLACK
+
CREAM
+
RED OFFSET
```

---

# 19. Event Number

DAY 오른쪽:

```
#2
```

Black.

약간 기울어진 hand-painted type.

```
font-size ≈ 42px
```

---

# 20. Left Event Info Zone

왼쪽:

```
Start 11h00
```

주변에 red banner와 작은 typography를 배치한다.

---

# 21. Spark Plug

왼쪽 중앙의 핵심 오브젝트.

대략:

```
X ≈ 125
Y ≈ 313

W ≈ 135
H ≈ 280
```

약간 기울어진다.

```
Rotation ≈ -15°
```

---

# 22. Spark Plug Illustration Style

사진 사용 금지.

다음 방식의 illustration:

```
Vintage engraving
Comic ink
Screenprint
Cross-hatching
Halftone
```

색상:

```
Cream
Black
Mint
Red
```

Metal 부분:

```
Cream base
+
Black hatch
+
Mint shadow
```

---

# 23. Spark Plug Label

작은 라벨:

```
HOT
ROD
ROCK
```

Black/cream label 형태.

실제 브랜드 로고가 아니라 **가상의 빈티지 레이싱 라벨**처럼 표현하는 것이 좋다.

---

# 24. Left Red Circle / Badge

왼쪽 중단.

```
FREE
ENTRY
FOR 2
```

주변에 작은 정보.

배경:

```
Vintage Red
```

글자:

```
Black / Cream
```

불규칙한 원/타원 형태.

---

# 25. Secondary Information

예:

```
PRE '65 CARS
HOT RODS · BIKES
BICYCLES · HARLEY'S
CAFERACER
AIRCOOLED
VW'S
```

폰트:

```
Condensed bold
```

크기:

```
13~18px
```

줄 간격:

```
0.85~0.95
```

일부 글자를 회전시켜도 된다.

---

# 26. Central Stage Text

DAY 아래:

```
Live
on Stage
```

Red script.

스타일:

```
1950s handwritten
Sign painter script
```

---

# 27. Band List

중앙:

```
The TINSTARS
JAKE ALLEN
LIL' ESTHER
and her band
JOE and the HORNETS
The SPUNBOYS
```

대략:

```
X ≈ 263
Y ≈ 406
W ≈ 295
```

---

# 28. Band Typography Hierarchy

밴드 이름을 전부 같은 스타일로 만들지 않는다.

예:

```
The
TINSTARS

JAKE ALLEN

LIL' ESTHER

and her band

JOE and the HORNETS

The
SPUNBOYS
```

강조 색상을 교대로 사용한다.

```
Black
Red
Black
Red
Black
```

---

# 29. Country Codes

밴드 오른쪽에 작은 국가 코드.

예:

```
(NL)
(UK)
(SE)
(FR)
```

크기:

```
6~9px
```

메인 이름보다 매우 작아야 한다.

---

# 30. Right Feature Pills

오른쪽:

```
LIVE MUSIC
RETRO MARKET
ART SHOW
```

위치:

```
X ≈ 532
Y ≈ 406
```

형태:

```
Black rounded capsule
```

텍스트:

```
Cream
```

---

# 31. Feature Pill

```
.feature-pill {
  background: #080908;
  color: #F2E7C7;

  border-radius: 18px;

  padding:
    5px 13px;
}
```

하지만 완벽한 CSS pill보다 가장자리에 약간의 distortion을 준다.

---

# 32. Year Badge

오른쪽 상단:

```
2012
```

Red ribbon 위에 black text.

크고 두꺼운 condensed typography.

---

# 33. Music Staff Decoration

포스터 양쪽에 음악 오선과 음표가 존재한다.

특히 오른쪽:

```
Y ≈ 460 ~ 700
```

곡선 형태의 staff.

```
5 parallel lines
+
musical notes
```

색:

```
Black
```

배경 mint 영역 위에 배치.

---

# 34. Mint Background Graphics

중앙 배경에 mint 색의 추상적인 ray/brush가 있다.

```
Radial burst
Brush strokes
Rough circles
Lines
```

Opacity:

```
35~70%
```

완벽한 geometric sunburst를 만들지 않는다.

거칠고 끊긴 형태여야 한다.

---

# 35. Classic Car — Main Illustration

포스터 하단의 가장 중요한 그림.

대략:

```
X ≈ 18
Y ≈ 600

W ≈ 680
H ≈ 280
```

차량은 화면 너비의 거의 전체를 차지한다.

---

# 36. Car Perspective

차량:

```
1940s / early 1950s American custom coupe
```

시점:

```
Front 3/4 view
```

차량 앞부분:

```
LEFT
```

차량 뒤:

```
RIGHT
```

차가 낮게 보이도록 한다.

---

# 37. Car Style

사진처럼 렌더링하지 않는다.

```
Hand-drawn automotive illustration
Screen print
Vintage engraving
Comic ink
```

Line:

```
Black
```

Base:

```
Cream
```

Shadow:

```
Mint / teal
```

---

# 38. Car Line Weight

외곽선:

```
3~6px
```

내부 detail:

```
1~3px
```

차량 하단과 wheel 주변은 검은 영역을 많이 사용한다.

---

# 39. Car Shading

Gradient 사용 최소화.

대신:

```
Dots
Cross hatch
Short strokes
Solid ink
Halftone
```

으로 명암을 만든다.

---

# 40. Wheels

휠은 특히 상세하게 표현한다.

```
Black tire
Cream sidewall
Black hub
Concentric circles
```

뒷바퀴:

```
X ≈ 400
Y ≈ 740
```

큰 white-wall tire가 중요한 포인트다.

---

# 41. Ground Shadow

자동차 아래:

```
Rough Black Horizontal Shadow
```

완벽한 blur shadow가 아니다.

스크린프린트 잉크처럼 거친 형태.

---

# 42. Bottom Website Strip

자동차 바로 아래.

```
Info
WWW.ROCKABILLYDAY.BE
FOLLOW THE SIGNS
```

---

# 43. Website Typography

URL:

```
WWW.ROCKABILLYDAY.BE
```

색:

```
WWW.       Red
ROCKABILLY Black/Cream
DAY.BE     Red 또는 Black
```

Black rounded rectangle 또는 dark banner 안에 배치.

---

# 44. Handwritten "Info"

URL 왼쪽:

```
Info
```

Red script.

---

# 45. Follow The Signs

오른쪽 화살표형 banner.

```
FOLLOW THE SIGNS
```

구조:

```
RED ARROW
+
CREAM TEXT
+
BLACK SHADOW/OUTLINE
```

---

# 46. Bottom Location

포스터 최하단.

```
STOEPEDSTRAAT · ASSENEDE · BELGIUM
```

전체 너비를 거의 채운다.

```
X ≈ 18
Y ≈ 937
```

---

# 47. Location Typography

```
Heavy
Condensed
Black
All Caps
```

도시 사이:

```
RED DOT
```

예:

```
STOEPEDSTRAAT • ASSENEDE • BELGIUM
```

---

# 48. Recommended Fonts

완전히 동일한 폰트 하나를 찾으려고 하기보다 역할별로 사용한다.

## Hero

추천 계열:

```
Bebas Neue
League Gothic
Anton
Oswald Heavy
Barlow Condensed Black
```

단, 반드시 distortion/custom outline 추가.

---

## Western / Rockabilly

```
Rye
Sancreek
Smokum
Alfa Slab One
Roboto Slab Black
```

---

## Script

```
Lobster
Pacifico
Yellowtail
Kaushan Script
```

그대로 사용하지 말고 약간의 distortion 적용.

---

# 49. Typography Distortion

빈티지 느낌을 위해 모든 대형 글자에 미세한 변형을 준다.

```
Rotation:
-4° ~ +4°

Scale X:
96% ~ 104%

Scale Y:
97% ~ 103%

Baseline:
±3px
```

특히:

```
ROCKABILLY
DAY
```

는 글자마다 조금씩 다르게 만든다.

---

# 50. Distressed Typography

텍스트 위에 random mask.

```
Small scratches
Ink holes
Paper spots
Edge damage
```

Coverage:

```
3~12%
```

Hero typography는 약:

```
5~8%
```

정도가 적당하다.

---

# 51. Halftone

자동차, 리본, mint graphics 등에 halftone을 적용한다.

권장 dot:

```
2~4px
```

각도:

```
15°
45°
75°
```

색 레이어별 각도를 다르게 하면 실제 인쇄 느낌이 강해진다.

---

# 52. No Modern Effects

다음 효과를 피한다.

```
❌ Glassmorphism
❌ Neon glow
❌ Smooth gradient
❌ Perfect vector shadows
❌ 3D CGI
❌ Photorealistic car
❌ Chrome digital effects
❌ Perfect alignment
❌ Modern minimalism
```

---

# 53. Recommended Layer Order

```
01 Paper Base

02 Paper Grain

03 Mint Background Graphics

04 Music Staff

05 Red Ribbon

06 Ribbon Typography

07 Hero Typography Shadow

08 Hero Typography

09 Spark Plug

10 Left Event Information

11 Band Information

12 Feature Pills

13 Car

14 Car Ink Texture

15 Bottom Information

16 Global Distress

17 Final Paper Grain
```

---

# 54. Global Texture Overlay

최상단에 texture layer를 추가한다.

Blend:

```
Multiply
```

Opacity:

```
15~30%
```

두 번째 밝은 texture:

```
Screen / Soft Light
```

Opacity:

```
5~12%
```

---

# 55. Composition Coordinates

709 × 992 기준 대략적인 좌표:

```
TOP TAGLINE
x: 25
y: 17
w: 660
h: 30

DATE RIBBON
x: 67
y: 55
w: 575
h: 235

ROCKABILLY
x: 25
y: 130
w: 660
h: 175

DAY
x: 278
y: 255
w: 220
h: 110

SPARK PLUG
x: 130
y: 310
w: 130
h: 280

LEFT INFO
x: 28
y: 315
w: 180
h: 305

BAND LIST
x: 260
y: 405
w: 280
h: 210

FEATURE PILLS
x: 530
y: 405
w: 155
h: 150

CAR
x: 12
y: 605
w: 690
h: 275

WEBSITE
x: 110
y: 873
w: 580
h: 58

LOCATION
x: 18
y: 936
w: 675
h: 43
```

---

# 56. Image Generation Prompt

AI 이미지 생성 모델에서 기본 디자인을 만들 때 사용할 수 있는 스타일 지시문:

```
Create a vertical vintage 1950s rockabilly event poster,
inspired by old European hot-rod and rock-and-roll festival
screen-printed posters.

Use a distressed cream paper background with visible fibers,
aged printing texture and small ink imperfections.

Use a limited four-color palette:
vintage red, near-black ink, faded turquoise/mint and warm cream.

At the top place a large curved vintage-red ribbon banner.

Below and overlapping the banner place enormous hand-drawn
ROCKABILLY typography using irregular tall black letters,
cream separation outlines and slightly misregistered red offset shadows.

Place a huge DAY title underneath in the same hand-painted style.

Use deliberately imperfect letter alignment and authentic
1950s sign-painter typography.

Add a hand-illustrated vintage spark plug on the left,
drawn with black engraving lines, cream highlights,
mint shadows and screen-print halftone.

Place live-band information in the center using alternating
black and red heavy vintage typography.

Place three black rounded badges on the right for event features.

Add curved musical staff lines and black music notes in the background.

The lower third must be dominated by a very large
1940s/1950s custom American coupe in front three-quarter view,
front facing left.

The car must be a hand-drawn vintage automotive illustration,
not a photograph and not CGI.

Render the car with heavy black ink outlines,
cream body panels, turquoise shadows,
cross-hatching, stippling and halftone dots.

Add a rough black ground shadow beneath the car.

At the bottom create a vintage website banner,
a red directional arrow and a very large condensed
black location line.

Everything must look screen printed:
rough ink coverage,
misregistered color plates,
halftone dots,
paper grain,
faded ink,
tiny scratches,
uneven edges,
hand-drawn imperfections.

Avoid modern graphic design,
avoid smooth gradients,
avoid photorealism,
avoid glossy effects,
avoid perfect vector geometry.

Authentic 1950s rockabilly,
hot rod,
rock-and-roll,
letterpress,
screen-print event poster aesthetic.
```

---

# 57. 중요 — 텍스트 생성 방식

AI 이미지 모델에 모든 문자를 한 번에 생성시키지 않는다.

가장 정확한 방법:

```
STEP 1
텍스트 없는 포스터 배경/일러스트 생성

STEP 2
자동차 생성 및 위치 확정

STEP 3
Ribbon / Spark Plug / Music 요소 배치

STEP 4
ROCKABILLY / DAY를 별도 Typography layer로 제작

STEP 5
Band 정보 추가

STEP 6
작은 Event 정보 추가

STEP 7
Website / Location 추가

STEP 8
전체 Distress texture 적용
```

즉,

```
AI Illustration
+
Manual Typography
+
Print Texture
```

방식으로 제작한다.

---

# 58. 가장 중요한 재현 포인트

이 포스터를 비슷하게 보이게 만드는 핵심은 다음 8가지다.

```
1. Cream / Red / Black / Mint 제한 색상

2. 화면 하단을 거의 가득 채우는
   거대한 Classic Car

3. ROCKABILLY의 불규칙한
   Black + Cream + Red typography

4. 상단의 거대한 Red Ribbon

5. Spark Plug

6. 음악 오선과 음표

7. Screen-print / Halftone 질감

8. 의도적으로 완벽하지 않은
   인쇄와 정렬
```

---

# 59. Final Quality Checklist

- 세로 비율이 약 `0.715`인가?
    
- 배경이 오래된 cream paper인가?
    
- 순백색을 사용하지 않았는가?
    
- 컬러가 Red / Black / Mint / Cream 중심인가?
    
- 상단에 curved red ribbon이 있는가?
    
- `ROCKABILLY`가 가장 큰 텍스트인가?
    
- ROCKABILLY 글자가 일부러 불규칙한가?
    
- Black과 Red 인쇄판이 미세하게 어긋나 있는가?
    
- `DAY`가 두 번째로 강한 타이틀인가?
    
- 왼쪽에 커다란 Spark Plug가 있는가?
    
- 중앙에 Band list가 있는가?
    
- 오른쪽에 검은 Feature pills가 있는가?
    
- 배경에 음악 오선과 음표가 있는가?
    
- 하단 1/3을 Classic Car가 차지하는가?
    
- 자동차가 사진이나 CGI처럼 보이지 않는가?
    
- 자동차에 engraving / halftone shading이 있는가?
    
- 자동차 아래 거친 검은 shadow가 있는가?
    
- 하단에 Website banner가 있는가?
    
- 최하단 Location typography가 매우 큰가?
    
- 모든 요소에 print distress가 존재하는가?
    
- 현대적인 smooth gradient가 없는가?
    
- 전체적으로 1950s screen-print poster처럼 보이는가?
    

---

# 60. 핵심 디자인 공식

최종적으로 이 포스터의 시각 언어는 다음 공식으로 정리할 수 있다.

```
AGED CREAM PAPER

+

BLACK INK

+

VINTAGE RED

+

FADED TURQUOISE

+

HUGE HAND-DRAWN TYPOGRAPHY

+

RED RIBBON

+

SPARK PLUG

+

ROCK'N'ROLL MUSIC GRAPHICS

+

LARGE HOT-ROD CAR

+

HALFTONE

+

INK DISTRESS

+

COLOR MISREGISTRATION

=

1950s ROCKABILLY
SCREEN-PRINT POSTER
```

## 최종 원칙

**너무 깨끗하게 만들지 않는다.**

레이아웃이 조금 비뚤어지고, 글자 크기가 조금 다르고, 잉크가 일부 빠지고, Red와 Black 색판이 살짝 어긋나며, 종이의 얼룩이 보일수록 이 레퍼런스의 빈티지 인쇄물 특성에 가까워진다.

반대로 모든 선과 글자를 완벽하게 정렬하고 매끄럽게 만들면 같은 색상과 구도를 사용해도 전혀 다른 현대적인 포스터가 된다.