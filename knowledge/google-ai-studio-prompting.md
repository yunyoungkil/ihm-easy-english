# 구글 AI(제미나이·Veo·Imagen) 프롬프트 작성 기준

마지막 갱신: 2026-09-05 (아래 각 섹션 출처 URL을 이 날짜에 직접 조회해 요약함)

이 문서는 영상/이미지 생성 프롬프트나 데이터 분석 프롬프트를 **구글 AI Studio 계열 모델
(Gemini, Veo, Imagen)용으로 작성할 때마다** 참고하는 압축 기준이다. 매번
`https://aistudio.google.com/docs`(및 하위 `ai.google.dev/gemini-api/docs/*` 문서)를
처음부터 다시 읽으면 토큰·시간이 낭비되므로, 실제로 쓸모 있던 항목만 여기 정리해 둔다.
**새로 프롬프트를 쓸 때는 이 문서를 먼저 확인하고, 여기 없는 정보가 필요할 때만 원문을
다시 찾는다.**

> 참고: `hyperframes-prompting.md`는 **나(Claude)에게 HyperFrames 영상 제작을 지시하는
> 프롬프트** 기준이고, 이 문서는 **구글 생성 모델(Veo/Imagen/Gemini)에 직접 넣는 프롬프트**
> 기준이다 — 대상이 다르다.

## 1. 영상 생성 (Veo) 프롬프트 구조

출처: `ai.google.dev/gemini-api/docs/veo` (2026-09-05 확인)

프롬프트는 아래 요소를 조합해 서술형으로 쓴다 — 키워드 나열이 아니라 묘사문:

| 요소 | 내용 | 예시 표현 |
|---|---|---|
| Subject | 주 피사체 | "a person's mouth, jaw, and chin only" |
| Action | 피사체가 하는 동작 | "lips press together, hold, then pop open" |
| Style | 창작 방향 | sci-fi / film noir / documentary 등 |
| Camera positioning/motion | 카메라 위치·움직임 | "eye-level", "static camera", "dolly shot" |
| Composition | 프레이밍 | "extreme close-up", "wide shot", "two-shot" |
| Focus/lens | 렌즈 효과 | "shallow focus", "macro lens" |
| Ambiance | 색감·조명으로 만드는 분위기 | "warm tones", "dark navy studio background" |

**오디오**: Veo는 동기화된 사운드트랙을 함께 생성한다.
- 대사가 필요하면 큰따옴표로 명시(`"That's no ordinary bear"`).
- 효과음/환경음도 명시적으로 서술(`"tires screeching loudly"`).
- **무음이 필요하면 반드시 명시할 것** — "Silent (no dialogue, no sound needed)"처럼 직접
  써야 한다. 안 쓰면 모델이 임의로 소리를 붙인다.
- **입이 나오는 장면은 "무음"만으론 부족하다.** EP13 B롤(입술 press-and-pop) 프롬프트에서
  "Silent"만 썼더니, 모델이 입 움직임을 보고 "이 사람이 뭔가 말하고 있다"고 스스로 해석해서
  "Bill(빌)"처럼 들리는 소리를 지어내 붙인 사례가 있다(2026-09-05). 입 클로즈업처럼 말하는
  것처럼 오해받기 쉬운 장면은 "the person is NOT saying any word, this is not speech, do not
  add lip-sync to any word"까지 명시적으로 못 박을 것.

**파라미터**:
- `duration`: `"4"` / `"6"` / `"8"` 초만 지원. **1080p·4K·레퍼런스 이미지 사용 시 8초 필수.**
  이 채널은 1920x1080 출력이므로 B롤은 **8초로 고정**할 것.
- `aspect_ratio`: `"16:9"`(기본, 가로) 또는 `"9:16"`(세로).

**팁**:
- 형용사·부사로 구체적으로 묘사할 것("dramatically", "slowly" 등) — 모호하면 모델이 순한
  기본값(자연스러운 대화 수준 동작)으로 해석한다. EP12 B롤 1차 시도가 실제로 이 문제로
  실패했음(`videos/ep12-want-wont/assets/broll/broll-prompts.md` 참고) — "wide"처럼 약한
  단어 대신 "roughly the height of two stacked fingers" 같은 구체적 비교 대상을 줄 것.
  이건 원문에도 명시된 원칙("provide descriptive context rather than vague instructions")과
  일치한다.
- 얼굴 클로즈업엔 "portrait" 키워드를 넣으면 표정 디테일이 강조된다.

## 2. 이미지 생성 (Imagen / Gemini 네이티브 이미지) 프롬프트 구조

출처: `ai.google.dev/gemini-api/docs/image-generation` (2026-09-05 확인)

사진풍 이미지는 이 문형을 기본 골격으로 쓴다:

> "A photorealistic [shot type] of a [subject] in a [setting]. [Lighting description].
> Shot from a [angle] with a [lens]."

포함 요소: 피사체 상세 묘사, 배경/구도, 조명(예: "three-point softbox setup to create
soft, diffused highlights"), 카메라 각도·렌즈, 스타일(일러스트면 "bold outlines,
cel-shading"처럼 구체적으로).

**사실감을 높이는 팁**: 디테일한 장면 묘사, 카메라 앵글·렌즈 명시, 조명 방식·질감 명시,
"ultra-realistic"/"sharp focus" 같은 강조어.

**지원 비율**(Gemini 3.1 Flash 계열): `1:1, 3:2, 2:3, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9`
— 이 채널 롱폼 배경엔 `16:9` 사용.

**고급 기능**: 레퍼런스 이미지 최대 14장(일관성·스타일 블렌딩), Google Search grounding(실사
사실 기반 이미지), `previous_interaction_id`로 멀티턴 편집, 최대 4K 해상도.

> 이 채널이 이미 쓰고 있는 자체 연동(`scripts/ab-simulator.mjs`의
> `generateAiThumbnailImage()`, 모델은 `gemini-3.1-flash-image` 계열)도 이 문서 기준을
> 따른다 — 새 이미지 프롬프트를 짤 때 이 표를 참고해서 쓸 것.

## 3. 데이터 분석/구조화 출력(JSON) 프롬프트 — Gemini Structured Output

출처: `ai.google.dev/gemini-api/docs/structured-output` (2026-09-05 확인)

이 채널은 `analyze-competitor-script.mjs`/`analyze-outlier-comments.mjs`/
`matrix-diagnosis.mjs` 등에서 Gemini로 텍스트를 분석해 JSON을 받는 작업이 많다. 새로 이런
프롬프트를 짤 때 기준:

- 응답 스키마를 `response_format`(JSON Schema)로 직접 지정할 것 — 자유 텍스트로 "JSON으로
  줘"라고만 하지 않는다.
- 분류 작업은 `enum`으로 값 범위를 강제한다(자유 문자열 금지).
- 스키마의 `description` 필드로 각 항목이 뭘 의미하는지 모델에게 알려준다 — 프롬프트 본문과
  스키마 설명 둘 다에 요구사항을 명시(중복이 오히려 신뢰도를 높인다).
- `required` 배열로 필수 필드를 강제한다.
- **문법적으로 유효한 JSON이 나와도 의미적으로 틀릴 수 있다** — 항상 애플리케이션 단에서
  값 검증을 별도로 할 것(예: 점수가 범위 밖인지, enum 값이 실제로 말이 되는지).
- 스키마가 너무 크거나 깊게 중첩되면 거부될 수 있으므로 적당한 크기로 유지.

## 4. 프롬프트 파일 저장 위치·형식 (이 채널 고유 규칙)

영상/이미지 생성 프롬프트는 사용자가 외부 도구(Google Flow, AI Studio 등)로 직접 생성하는
구조라(claude.ai 힉스필드 크레딧이 0이라 대신 쓰는 방식 — `knowledge/decisions/`에 있는
YouTube 자체 연동 우선 원칙과 같은 맥락으로, 프로젝트 밖 서비스 크레딧에 의존하지 않고
프로젝트 자체 파일로 남긴다) 매번 아래 형식으로 프로젝트 안에 파일을 만든다:

- **위치**: `videos/<프로젝트>/assets/broll/broll-prompts.md`(영상),
  `videos/<프로젝트>/assets/images/<frame-id>-prompt.md`(이미지) — 프로젝트 폴더 밖에 두지
  않는다. **이건 특정 에피소드의 실제 제작에 쓰는 프롬프트 전용이다.**
- **예외 — 도구/코드 자체를 테스트하는 프롬프트는 `test-prompts/`(저장소 루트)에 둔다**
  (2026-09-11 확정, 사용자 지적: "이건 대시보드 테스트인데?" — `scripts/ab-simulator.mjs`의
  `buildThumbnailPrompt()` 같은 **공유 도구 코드의 변경을 검증**하는 프롬프트를 특정
  에피소드 폴더에 넣었다가 오해를 산 사례). 특정 에피소드 소재를 예시로 빌려 쓰더라도, 목적이
  "이 영상을 만들기 위해서"가 아니라 "이 공유 코드/프롬프트 방식이 잘 작동하는지 확인하기
  위해서"면 `test-prompts/`로 간다. 임시 스크래치 경로(세션 임시 폴더)에 두지 않는 이유는
  세션이 끝나도 남아서 다음에 참고할 수 있어야 하기 때문 — 아래 "시도 기록"과 같은 취지.
- **구성 순서**:
  1. 제목 + 어느 프레임/씬에 쓰이는지, 왜 필요한지 한 문단
  2. **🇰🇷 한글 요약** 섹션 — 사용자가 영문 프롬프트를 안 읽어도 "뭘 찍는지/그리는지, 왜
     이렇게 썼는지"를 바로 알 수 있게 쉬운 말로 정리. 이 채널 규칙("설명은 초등학생도 알아들을
     수준으로")을 프롬프트 문서에도 그대로 적용하는 것.
  3. 영문 프롬프트 원문(코드 블록, 그대로 붙여넣기 가능하게)
  4. **저장 위치** — 생성된 파일을 정확히 어느 경로에 넣어야 하는지
  5. **시도 기록** — 재생성할 때마다 뭐가 안 맞았고 어떻게 고쳤는지 누적 기록(한 번 쓰고
     끝내지 않는다 — 같은 문제를 다음에 또 겪지 않기 위함)
- 영문 프롬프트를 고칠 때는 **한글 요약도 같이 고친다** — 둘이 다른 말을 하면 안 됨
  (2026-09-05 EP13 Frame 11 프롬프트에서 실제로 이 불일치가 발생해 사용자가 지적함).

### 손그림 일러스트(라인아트) 프롬프트의 배경·사이즈 지침 (2026-09-16 확정)

EP16에서 "배경 투명"으로 요청한 손그림 일러스트(입/혀 단면도, 문장 아이콘 스프라이트)가
실제로는 **전혀 투명하지 않았다** — 픽셀을 직접 재보니 알파 채널이 전 영역 255(완전
불투명)였고, 배경은 흰색/회백색이 그대로 칠해져 있었음. 프롬프트를 "배경 투명" →
"화면 배경색과 동일한 크림색(#F4EFE6) 단색"으로 바꿔 재생성했는데도 **똑같이 흰색으로
나왔다**(사용자 확인, 2026-09-16) — 이 생성 도구가 "transparent background" 지시 자체를
신뢰성 있게 따르지 못하는 것으로 보임. 결국 사용자가 자체 도구로 직접 배경을 크림색으로
채워 넣은 최종본을 만들어서 해결했다.

**그래서 앞으로 이런 프롬프트(카드가 아니라 화면 배경 위에 바로 얹히는 손그림 일러스트·
아이콘)를 쓸 때는 아래 둘 중 하나를 프롬프트에 명시할 것 — "배경 투명"이라고만 쓰고 끝내지
않는다**:

1. **(기본, 권장)** 이 자산이 쓰일 화면의 실제 배경 헥스값을 그대로 채워 달라고 명시.
   예: `"the background must be a solid, flat, opaque [색 이름] color — exact hex #XXXXXX —
   filling the entire canvas edge to edge, no gradient, no transparency"`. 합성 단계가
   아예 필요 없어서 가장 안전하고, 이 채널처럼 한 일러스트가 여러 프레임에서 같은 배경색
   위에 재사용되는 경우(EP16의 tongue-mouth-diagram.png 등) 특히 잘 맞는다.
2. 정말로 서로 다른 배경색 위에 두루 쓸 자산이라 분리가 꼭 필요하면, "transparent"라고만
   쓰지 말고 **일러스트 자체의 선/색과 절대 겹치지 않는, 단일하고 균일한 강한 대비색**
   (예: 순백 `#FFFFFF` 또는 크로마키에 가까운 단색)을 배경으로 명시해서, 나중에 코드로
   그 단색만 골라 걷어내는 방식(색상 기반 배경 제거)을 쓸 수 있게 한다. "투명"이라는 말
   자체에 기대지 않는다.

**사이즈도 프롬프트에 명시할 것** — 특히 한 이미지 안에 아이콘 여러 개를 격자(2x2 등)로
모아 만드는 스프라이트는, 완성본을 CSS `background-position`으로 각 칸을 잘라 쓰기 때문에
**격자 칸의 순서·배치를 프롬프트에 고정 지시**해야 한다(예: "top-left: A, top-right: B,
bottom-left: C, bottom-right: D, 정확히 이 순서로"). EP16 `sentence-icons.png`을 재생성
과정에서 원본 2816×1536(직사각형)이 2048×2048(정사각형)로 바뀌면서 **격자 안 아이콘 배치
순서도 달라져**(coat/rain/team/head → team/rain/head/coat), 컴포지션 HTML의
`background-position` 매핑을 다시 맞춰야 했다 — 순서를 프롬프트로 못박아 두면 이런
재작업을 피할 수 있다.

## 실전 적용 사례 (이 채널)

- EP13 Frame 5 B롤(입술 press-and-pop) 프롬프트: 위 §1 구조를 적용해
  `videos/ep13-tongue-shortcut/assets/broll/broll-prompts.md`에 작성(2026-09-05).
- EP13 Frame 11 마트 진열대 배경: 위 §2 구조를 적용해
  `videos/ep13-tongue-shortcut/assets/images/frame11-market-shelf-prompt.md`에 작성(2026-09-05).

## 원문 출처 (필요시에만 재조회)

- https://aistudio.google.com/docs (진입점 — SPA라 직접 조회해도 목차만 나오고 본문은 안
  보임, 아래 개별 문서로 바로 들어갈 것)
- https://ai.google.dev/gemini-api/docs/veo
- https://ai.google.dev/gemini-api/docs/image-generation
- https://ai.google.dev/gemini-api/docs/structured-output
