# Thumbnail Prompts — ep36-everyday-words-unheard (v3 최종, 16:9, 1280×720)

> 원칙: 배경/주인공 실물 사진은 AI Studio Nano Banana 2.1(`--aspect 16:9`)로 **완전 무텍스트 · 잡소품 0개(초콜릿 바 + 앰버 비타민 병 2개만)** 생성 후, 한글·영문 고대비 타이포(60~118px, 200px 모바일 가독성 확보)는 코드/브라우저 레이어(`Noto Sans KR`, `scripts/render-thumbnails-v2.mjs`)로 합성한다. 우측 하단 15%(재생 시간 배지 자리)는 비우고, 모바일 200px 폭 · 흑백 명도 대비 · 실제 한국 유튜브 검색 피드 비교(`output/temp-thumbnails/ep36-everyday-words-unheard-design-test/feed-and-200px-compare.png`)까지 육안 검증한다.

## A안 (★ 최종 1순위 추천 — 어두운 경쟁 피드 속 밝은 명도 대비 1위) — 밝은 크림 아이보리 초콜릿·비타민 + '초콜릿 ✕ 비타민 ✕ / 들으면 못 맞힙니다' (`thumb-A.jpg`)
- **카피(코드 합성)**: 상단 `초콜릿 ✕` `비타민 ✕` (72px) / 메인 `"들으면 못 맞힙니다"` (118px) / 보조 `"원어민 속도 · 7단어"` (60px)
- **제목 짝꿍**: `"평생 초콜릿·비타민이라 읽었는데… 원어민 영어 발음은 아예 딴 단어"` (검색어 `원어민 영어 발음` 포함 · 단어 100% 일치 · 문구 중복 0 · 스포일러 0)
- **배경 프롬프트 (`thumb-b-v2-bg.jpg`)**:
  > Bright sunlit minimalist 16:9 editorial product studio photograph on a warm pale ivory cream matte plaster surface. Strictly ONLY TWO real everyday objects placed neatly on the right 38% of the frame: a crisp broken dark chocolate bar with clean squares and a single sleek amber glass vitamin bottle with a completely blank plain white label (zero text, zero icons). The entire left 62% of the frame is completely clean, smooth, bright warm ivory negative space for giant bold dark typography overlay. Soft natural morning window light from the right, gentle crisp contact shadows, 85mm commercial photography, ultra-clean magazine aesthetic, zero extra props, no keys, no wires, no springs, no pills, no clutter, no text, no letters, no watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.

## B안 (다크 에디토리얼 대조 버전 — 오프닝 0초와 톤 통일) — 다크 차콜 초콜릿·비타민 + '초콜릿 ✕ 비타민 ✕ / 들으면 못 맞힙니다' (`thumb-B.jpg`)
- **카피(코드 합성)**: 상단 `초콜릿 ✕` `비타민 ✕` (72px) / 메인 `"들으면 못 맞힙니다"` (118px, 흰+골드) / 보조 `"원어민 속도 · 7단어"` (60px 틸)
- **배경 프롬프트 (`thumb-a-v2-bg.jpg`)**:
  > Minimalist 16:9 high-contrast commercial editorial studio photograph on a deep matte dark charcoal stone tabletop. Strictly ONLY TWO real everyday objects positioned cleanly on the right 42% of the frame: a rich dark chocolate bar broken into crisp glossy squares in the lower-right foreground, and a single sleek dark amber glass vitamin supplement bottle with a plain blank kraft paper label (zero text, zero symbols) standing slightly behind it on the right. The entire left 58% of the frame is completely empty, smooth, dark charcoal-black negative space with subtle soft falloff for clean typography overlay. Warm single key studio spotlight illuminating only the chocolate and amber glass bottle from the upper right, deep clean shadows, 85mm macro photography lens, razor-sharp focus, zero extra props, no keys, no metal wire, no springs, no camera, no pills scattered, no clutter, no text, no letters, no watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.

## C안 — 카페 보케 + '자막 OFF 귀 테스트' 블라인드 챌린지 (`thumb-C.jpg`)
- **카피(코드 합성)**: 배지 `"자막 OFF 귀 테스트"` (52px) + 앰버 오디오 파형 + `"자막 끄면 몇 개 들릴까?"` (116px) / 보조 `"초콜릿 · 비타민 외 5단어"` (58px)
- **배경 (`thumb-c-bg.jpg`)**: 따뜻한 카페 보케와 오른쪽 커피잔 (잡소품 0개 확인).
