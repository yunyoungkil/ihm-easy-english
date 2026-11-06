// 시청자에게 보이면 안 되는 말의 단일 목록. 규칙의 근거는 CLAUDE.md의 대외 용어 금지 절과 메타 문구 금지 절이다.
// 업로드 패키지 페이지 검사(build-upload-package-page.mjs)와 렌더링 전 검사(check-banned-terms.mjs)가 같이 쓴다.

const BANNED_TERM_PATTERNS = [
  // "들려드릴", "알려 드릴", "드릴게요"는 금지어가 아니다. "영어 드릴"만 "어"로 끝나도 금지어로 본다.
  /(?<![려해주여아워와쳐줘봐꿔내서]\s?)(?<!(?<!영)어\s?)드릴(?![게까])/g,
  /조음/g,
  /유성음/g,
  /무성음/g,
  /파열음/g,
  /마찰음/g,
  /치찰음/g,
  /쿠션 모음/g,
  /미니멀\s?페어/g,
  /최소대립/g,
  /긴장모음/g,
  /이완모음/g,
  /\bTENSE\b/g,
  /\bLAX\b/g,
  /bitch/gi,
  // 그림 프롬프트에 쓰면 AI가 그림에 그대로 그려 넣는 영어 전문용어
  /\bbilabial\b/gi,
  /\blabiodental\b/gi,
  /\bretroflex\b/gi,
  /\balveolar\b/gi,
  /\bplosive\b/gi,
  /\bfricative\b/gi,
  /\bvocal tract\b/gi,
  /\barticulation\b/gi,
  // 한글 발음 쪼개기: [푸 · 울]. 영어 철자에 찍는 cof · fee [커피]는 괜찮다.
  /\[[가-힣]+\s*·\s*[가-힣]+\]/g,
  // 어색한 신체 비유
  /턱에 힘/g,
  /턱 힘/g,
  // 화면에 노출하지 않는 제작자용 메타 문구
  /순차 점등/g,
  /남[·\s]*여\s*(?:\d+회\s*)?교차/g,
  /\d+회\s*(?:반복|교차)/g,
  /TTS\s*\d+회/g,
];

export const findBannedTerms = (text = '') => {
  const hits = BANNED_TERM_PATTERNS.flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => ({term: match[0], index: match.index})),
  ).sort((a, b) => a.index - b.index);
  // 같은 글자를 두 규칙이 잡으면 앞의 것만 센다.
  let end = -1;
  return hits.filter((hit) => {
    if (hit.index < end) return false;
    end = hit.index + hit.term.length;
    return true;
  });
};
