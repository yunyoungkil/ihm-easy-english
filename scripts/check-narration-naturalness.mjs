// 나레이션이 한국어로 자연스러운지 규칙으로 검사한다(AI 호출 없음). narration-lint.mjs는 TTS가 영단어를
// 잘못 읽는 것만 보고, 이 파일은 한국어 말투(AGENTS.md 스크립트 절 8·9·11번, brand-persona.md)를 본다.
// 사용법:  node scripts/check-narration-naturalness.mjs videos/ep29-b-vs-v/SCRIPT.md [다른 파일...] [--json]
// 입력: SCRIPT.md의 ```text 블록 중 한글이 든 줄(영어 예문 줄은 건너뜀). 블록이 없으면 파일 전체의 한글 줄.
// 등급: error(바로 고침) / warn(소리 내어 읽어 보고 판단) / 확인필요(사실 여부를 사용자에게 확인). error가 있으면 종료코드 1.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const T = Object.freeze({
  ENDING_REPEAT_MIN: 3, // allow-literal: 같은 끝맺음 틀이 한 대본에서 3번 이상이면 warn(EP22 사례는 4번)
  ENDING_NEAR_WINDOW: 3, // allow-literal: AGENTS 8번 "연속 3문장 안에"
  ENDING_NEAR_MIN: 2, // allow-literal: 위 창 안에서 2번이면 warn
  CHAIN_MIN: 3, // allow-literal: 접속어미로 엮은 동작(마지막 서술어 포함) 3개 이상
  CHAIN_MIN_LEN: 50, // allow-literal: 이 글자 수 이상인 긴 문장만(짧은 3동작은 흔한 말투)
  OPENER_WORD_MIN: 3, // allow-literal: 지정 단어(솔직히 등)로 문장을 3번 이상 시작
  OPENER_ANY_MIN: 5, // allow-literal: 임의 단어로 5번 이상 시작
  JAGGED_MIN_SENTENCES: 8, // allow-literal: 문장 8개 미만이면 분포를 판정하지 않음
  JAGGED_CV_MIN: 0.3, // allow-literal: 문장 길이 표준편차/평균이 이보다 낮으면 너무 균일(EP22~29 실제 대본이 0.33~0.38이라 0.3으로 낮춤)
});

// 끝맺음 틀: 어미 앞 틀을 이름으로 묶는다
const ENDING_FRAMES = [
  ['~ㄴ 겁니다/거죠/거예요', /(?:겁니다|거죠|거예요|거거든요|거잖아요|거였죠|거랍니다)$/],
  ['~있으실 거예요', /(?:있으실|계실|하실|아시는) (?:거예요|겁니다|거죠)$/],
  ['~이었던 거죠', /(?:었던|았던) (?:거죠|겁니다|거예요)$/],
  ['~ㄹ 수 있습니다', /(?:할|될|있을|알 수|볼|들을) 수 있(?:습니다|어요)$/],
  ['~해 보세요', /(?:해|보|들어|따라와|읽어) ?보세요$/],
];

const BANNED = [
  ['가식 위협', /속으신 겁니다|완전히 속았|속고 계셨|속아 왔|속아왔/],
  ['번역투 신체 비유', /(?:턱|귀|목|혀|입)에 힘을 (?:주느냐|집중|빼느냐)|귀에 힘을 집중/],
  ['약장수 톤', /단숨에 꿰뚫|꿰뚫어 드립|충격적인 반전|충격적인 진실|놀라운 비밀이 숨어|숨겨진 진실|비밀을 폭로|지금 바로 확인하세요/],
  ['반전 reassurance', /(?:당신|여러분|네|님)(?:의|이|은)?\s*(?:탓|잘못)이?\s*아니|못해서가 아니|못한 게 아니|부족해서가 아니/],
  ['번역투', /에 대해서? (?:알아보|살펴보)|를 통해(?:서)? (?:알아|배워|확인)|되어진다|되어집니다|에 있어서/],
];

const FABRICATED = /(?:제가|저는|저도|제 경험|내가)[^.?!]{0,24}(?:직접[^.?!]{0,12}(?:해봤|해 봤|들어봤|들어 봤|확인했|녹음)|녹음해서|뜯어봤|뜯어 봤|들어봤|분석해 봤|분석해봤|써봤|써 봤)/;
const PARTICLE_MISSING = /(?:^|\s)(귀|소리|입|혀|발음|실력)\s+(?:확실하게\s+|활짝\s+|제대로\s+)?(뚫어|뚫|열어|트여|꿰뚫어)/;

const META_LINE = /^[-*]\s|^\*\*|:\*\*|^[가-힣A-Za-z ]{1,10}:(?:\s|$)/; // 블록 안에 섞인 제작 메모(목록, **라벨:**, 라벨: 값)

export function extractNarration(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let inBlock = false, sawBlock = false;
  const hangul = /[가-힣]/;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*```/.test(raw)) {
      if (!inBlock && /^\s*```text\b/.test(raw)) { inBlock = true; sawBlock = true; }
      else inBlock = false;
      continue;
    }
    if (inBlock && hangul.test(raw) && !META_LINE.test(raw.trim())) out.push({ line: i + 1, text: raw.trim() });
  }
  if (sawBlock) return out;
  return lines.map((t, i) => ({ line: i + 1, text: t.trim() })).filter((x) => hangul.test(x.text) && !/^[#|>]/.test(x.text) && !META_LINE.test(x.text));
}

export function splitSentences(lineObjs) {
  const sentences = [];
  for (const { line, text } of lineObjs) {
    const clean = text.replace(/^[-*\d.)\s]+(?=[가-힣"'“])/, '');
    for (const part of clean.split(/(?<=[.?!…])["'”’)]?\s+/)) {
      const s = part.trim();
      if (s && /[가-힣]/.test(s)) sentences.push({ line, text: s });
    }
  }
  return sentences;
}

const tail = (s) => s.replace(/["'”’)\]\s.?!…~,]+$/g, '');

export function checkNarration(markdown) {
  const issues = [];
  const add = (kind, severity, s, match, note) => issues.push({ kind, severity, line: s.line, match, note, sentence: s.text.slice(0, 80) });
  const sentences = splitSentences(extractNarration(markdown));

  // ending-repeat
  const byFrame = new Map();
  const frameOf = sentences.map((s) => {
    const t = tail(s.text);
    const f = ENDING_FRAMES.find(([, re]) => re.test(t));
    return f ? f[0] : null;
  });
  frameOf.forEach((f, i) => { if (f) { if (!byFrame.has(f)) byFrame.set(f, []); byFrame.get(f).push(i); } });
  for (const [name, idxs] of byFrame) {
    if (idxs.length >= T.ENDING_REPEAT_MIN) {
      add('ending-repeat', 'warn', sentences[idxs[idxs.length - 1]], name, `같은 끝맺음 틀 ${idxs.length}회(줄 ${idxs.map((i) => sentences[i].line).join(',')})`);
    }
    for (let k = 0; k + 1 < idxs.length; k++) {
      if (idxs[k + 1] - idxs[k] < T.ENDING_NEAR_WINDOW && idxs.length < T.ENDING_REPEAT_MIN) {
        add('ending-repeat', 'warn', sentences[idxs[k + 1]], name, `연속 ${T.ENDING_NEAR_WINDOW}문장 안에 ${T.ENDING_NEAR_MIN}회`);
      }
    }
  }

  sentences.forEach((s) => {
    // long-chain
    const conns = s.text.length >= T.CHAIN_MIN_LEN ? (s.text.match(/[가-힣]+(?:해서|어서|아서|내서|하고|하며|면서|으며|시고|해|둬서)(?=[,\s])/g) || []) : [];
    if (conns.length + 1 >= T.CHAIN_MIN) add('long-chain', 'warn', s, conns.join(' '), `접속어미로 동작 ${conns.length + 1}개를 엮음`);
    // banned-phrase
    for (const [label, re] of BANNED) { const m = s.text.match(re); if (m) add('banned-phrase', 'error', s, m[0], label); }
    // object-particle-missing
    const pm = s.text.match(PARTICLE_MISSING); if (pm) add('object-particle-missing', 'error', s, pm[0].trim(), '을/를 생략');
    // fabricated-first-person
    const fm = s.text.match(FABRICATED); if (fm) add('fabricated-first-person', '확인필요', s, fm[0], '화자가 실제로 한 일인지 사용자 확인 전에는 확정 금지(AGENTS 9번)');
  });

  // sentence-opener-repeat
  const openers = new Map();
  sentences.forEach((s) => {
    const w = s.text.replace(/^["'“‘(]+/, '').split(/[\s,]/)[0];
    if (!w || /^[\dA-Za-z]/.test(w)) return;
    if (!openers.has(w)) openers.set(w, []);
    openers.get(w).push(s);
  });
  const watch = new Set(['솔직히', '그런데', '그래서', '자', '사실']);
  for (const [w, list] of openers) {
    const min = watch.has(w) ? T.OPENER_WORD_MIN : T.OPENER_ANY_MIN;
    if (list.length >= min) add('sentence-opener-repeat', 'warn', list[list.length - 1], w, `문장 첫 단어 "${w}" ${list.length}회`);
  }

  // jagged-lack
  if (sentences.length >= T.JAGGED_MIN_SENTENCES) {
    const L = sentences.map((s) => s.text.length);
    const mean = L.reduce((a, b) => a + b, 0) / L.length;
    const sd = Math.sqrt(L.reduce((a, b) => a + (b - mean) ** 2, 0) / L.length);
    const cv = sd / mean;
    if (cv < T.JAGGED_CV_MIN) add('jagged-lack', 'warn', sentences[0], `cv=${cv.toFixed(2)}`, `문장 길이가 균일함(평균 ${mean.toFixed(0)}자, 기준 ${T.JAGGED_CV_MIN} 미만)`);
  }
  return { sentenceCount: sentences.length, issues };
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const files = args.filter((a) => !a.startsWith('--'));
  if (!files.length) { console.error('사용법: node scripts/check-narration-naturalness.mjs <SCRIPT.md...> [--json]'); process.exit(2); }
  let hasError = false;
  const results = files.map((f) => {
    const r = checkNarration(fs.readFileSync(f, 'utf8'));
    if (r.issues.some((i) => i.severity === 'error')) hasError = true;
    return { file: f, ...r };
  });
  if (json) { console.log(JSON.stringify(results, null, 2)); }
  else {
    for (const r of results) {
      const by = {}; r.issues.forEach((i) => { by[i.kind] = (by[i.kind] || 0) + 1; });
      console.log(`${r.file}: 문장 ${r.sentenceCount}개, 이슈 ${r.issues.length}개 ${JSON.stringify(by)}`);
      for (const i of r.issues) console.log(`  [${i.severity}] ${i.kind} 줄 ${i.line}: "${i.match}" ${i.note} | ${i.sentence}`);
    }
  }
  process.exit(hasError ? 1 : 0);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
