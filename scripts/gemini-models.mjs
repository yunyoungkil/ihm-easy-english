// 글(텍스트) 생성에 쓰는 Gemini 모델 목록 — 한곳에서만 고친다.
// 앞에서부터 차례로 시도하고, 실패하면 다음 모델로 넘어간다.
//
// 2026-11-11 실측: 무료 등급 새 키에서 gemini-2.5-flash / gemini-2.5-flash-lite는
// "no longer available to new users"(404)로 막혔고, gemini-flash-latest와 gemini-3.8-flash는
// 20초 안에 응답이 없었다. 아래 셋은 짧은 시험 호출에 200으로 응답했다.
// 구글이 모델을 또 없애면 여기만 바꾼다. 확인 방법: 각 모델에 "Reply with OK" 한 줄을 보내 본다.
export const GEMINI_TEXT_MODELS = Object.freeze([
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
]);
