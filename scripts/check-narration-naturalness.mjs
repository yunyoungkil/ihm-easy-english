// 나레이션이 한국어로 자연스러운지 규칙으로 검사한다(AI 호출 없음). narration-lint.mjs는 TTS가 영단어를
// 잘못 읽는 것만 보고, 이 파일은 한국어 말투(knowledge/script-rules.md 8·9·11번, 2026-11-15에 AGENTS.md에서 옮김, brand-persona.md)를 본다.
// 사용법:  node scripts/check-narration-naturalness.mjs videos/ep29-b-vs-v/SCRIPT.md [다른 파일...] [--json]
// 입력: SCRIPT.md의 ```text 블록 중 한글이 든 줄(영어 예문 줄은 건너뜀). 블록이 없으면 파일 전체의 한글 줄.
// 등급: error(바로 고침) / warn(소리 내어 읽어 보고 판단) / 확인필요(사실 여부를 사용자에게 확인). error가 있으면 종료코드 1.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { measureSpeech, speechRates, ENDING_KEYS, ENDING_LABELS } from './speech-stats.mjs';

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
  UNIFORM_BLOCKS_MIN: 6, // allow-literal: 컷 블록 6개 이상일 때만 컷별 문장 수 균일성(요약 카드 증후군)을 본다
  UNIFORM_BLOCKS_CV_MAX: 0.25, // allow-literal: 컷당 문장 수 변동계수가 이보다 낮으면 모든 컷이 똑같은 요약 슬라이드
  UNIFORM_BLOCKS_MAX_SENTS: 6, // allow-literal: 컷마다 6문장 이하로 쪼개진 경우에만 요약 카드 의심
  SYMMETRY_PARALLELS_MIN: 4, // allow-literal: '똑같-/마찬가지/역시' 병렬 연결 4회 이상이면 교과서 대칭 경고
  LECTURE_STYLE_MIN: 2, // allow-literal: 딱딱한 강의체·문어 접속어가 한 대본에서 2회 이상 뭉치면 입말 참고 경고(2026-11-26 6개 채널 실측)
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
const LECTURE_STYLE = /알아보도록 하겠|말씀드린 바와|하셔야 합니다|사용하여|이용하여|따라서\s|주의하시기 바랍|숙지하시기 바랍/g;
const PARTICLE_MISSING = /(?:^|\s)(귀|소리|입|혀|발음|실력)\s+(?:확실하게\s+|활짝\s+|제대로\s+)?(뚫어|뚫|열어|트여|꿰뚫어)/;

const META_LINE = /^[-*]\s|^\*\*|:\*\*|^[가-힣A-Za-z ]{1,10}:(?:\s|$)/; // 블록 안에 섞인 제작 메모(목록, **라벨:**, 라벨: 값)

const TABLE_STAGE_RE = /^\*?\([^)]+\)\*?$/;
const SPEAKER_LINE = /^(?:나|나레이션|내레이션|해설)\s*:\s*/;

function extractTableNarration(lines) {
  const hangul = /[가-힣]/;
  for (let i = 0; i < lines.length - 1; i++) {
    const row = lines[i].trim();
    const sep = lines[i + 1].trim();
    if (!row.startsWith('|') || !/^\|[\s:|-]+\|?$/.test(sep)) continue;
    const headers = row.split('|').slice(1, row.endsWith('|') ? -1 : undefined).map((c) => c.trim());
    const col = headers.findIndex((h) => /(?:나레이션|대본)/.test(h) && !/(?:원어민|영어)/.test(h));
    if (col < 0) continue;
    const out = [];
    for (let j = i + 2; j < lines.length; j++) {
      const t = lines[j].trim();
      if (!t.startsWith('|')) break;
      const cells = t.split('|').slice(1, t.endsWith('|') ? -1 : undefined).map((c) => c.trim());
      const cell = (cells[col] || '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
      if (!cell || /^[-—–]+$/.test(cell) || TABLE_STAGE_RE.test(cell)) continue;
      if (hangul.test(cell)) out.push({ line: j + 1, text: cell });
    }
    if (out.length) return out;
  }
  return [];
}

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
  const fromTable = extractTableNarration(lines);
  if (fromTable.length) return fromTable;
  // "나: …" 줄로 쓴 통대본(EP38~): 말하는 사람 표시가 있는 줄만 나레이션이다. 아래 일반 경로는 "나:"를 제작 메모(META_LINE)로 보고 빼서,
  // [화면: …] 지시문만 읽고 말투 비교가 0문장이 되었다(2026-11-28).
  const spoken = lines.map((t, i) => ({ line: i + 1, text: t.trim() }))
    .filter((x) => SPEAKER_LINE.test(x.text))
    .map((x) => ({ line: x.line, text: x.text.replace(SPEAKER_LINE, '').trim() }))
    .filter((x) => hangul.test(x.text));
  if (spoken.length) return spoken;
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

  // uniform-cut-blocks: 모든 ```text 블록이 3~5문장 요약 카드처럼 균일하게 쪼개졌는지 감지(2026-11-24 EP36 회고)
  const blockCounts = [];
  let inBlk = false;
  let curBlk = [];
  for (const raw of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(raw)) {
      if (!inBlk && /^\s*```text\b/.test(raw)) { inBlk = true; curBlk = []; }
      else if (inBlk) {
        inBlk = false;
        const cnt = splitSentences(curBlk.map((text, idx) => ({ line: idx + 1, text }))).length;
        if (cnt > 0) blockCounts.push(cnt);
      }
      continue;
    }
    if (inBlk && /[가-힣]/.test(raw) && !META_LINE.test(raw.trim())) curBlk.push(raw.trim());
  }
  if (blockCounts.length >= T.UNIFORM_BLOCKS_MIN) {
    const bMean = blockCounts.reduce((a, b) => a + b, 0) / blockCounts.length;
    const bSd = Math.sqrt(blockCounts.reduce((a, c) => a + (c - bMean) ** 2, 0) / blockCounts.length);
    const bCv = bMean > 0 ? bSd / bMean : 0;
    const bMax = Math.max(...blockCounts);
    const bMin = Math.min(...blockCounts);
    if (bCv < T.UNIFORM_BLOCKS_CV_MAX && bMax <= T.UNIFORM_BLOCKS_MAX_SENTS && sentences.length) {
      add('uniform-cut-blocks', 'warn', sentences[0], `blocks=${blockCounts.length}(${bMin}~${bMax}문장,cv=${bCv.toFixed(2)})`, '컷마다 문장 수가 균일한 요약 카드 패턴 — 통대본 호흡으로 변주 권장');
    }
  }

  // ai-symmetry-tics: 교과서 대칭·병렬 나열('첫 번째/두 번째/세 번째', '똑같-/마찬가지/역시' 과다) 감지(2026-11-24)
  if (sentences.length >= 15) {
    const joined = sentences.map((s) => s.text).join(' ');
    const has123 = /첫\s?번째/.test(joined) && /두\s?번째/.test(joined) && /세\s?번째/.test(joined);
    const parallels = joined.match(/똑같|마찬가지|역시/g) || [];
    if (has123 && parallels.length >= T.SYMMETRY_PARALLELS_MIN) {
      add('ai-symmetry-tics', 'warn', sentences[0], `첫/두/세번째 + 병렬(${parallels.length}회)`, '기계적 번호 선언과 "똑같-/마찬가지/역시" 대칭 반복 — 구어 흐름으로 풀기 권장');
    } else if (parallels.length >= T.SYMMETRY_PARALLELS_MIN + 2) {
      add('ai-symmetry-tics', 'warn', sentences[0], `병렬(${parallels.length}회)`, '"똑같-/마찬가지/역시" 병렬 연결 과다 — 변주 권장');
    }
  }

  // lecture-style: 딱딱한 강의체·문어 접속어 뭉침 감지(2026-11-26, 비차단 warn)
  const lectureHits = [];
  sentences.forEach((s) => {
    const ms = s.text.match(LECTURE_STYLE);
    if (ms) ms.forEach((hit) => lectureHits.push({ s, hit: hit.trim() }));
  });
  if (lectureHits.length >= T.LECTURE_STYLE_MIN) {
    const sample = [...new Set(lectureHits.map((x) => x.hit))].slice(0, 4).join(', ');
    add('lecture-style', 'warn', lectureHits[0].s, `${sample} (${lectureHits.length}회)`, '딱딱한 강의체·문어 접속어 뭉침 — 담백한 입말로 풀기 권장');
  }

  return { sentenceCount: sentences.length, issues };
}

// ---- --compare: 경쟁 영상 말투 합계(data/youtube/speech-patterns.json)와 나란히 보기(2026-11-15) ----
// 합계는 scripts/outlier-report.mjs가 경쟁 영상 리포트를 만들 때마다 자동으로 다시 계산한다(scripts/speech-stats.mjs).
export const COMPARE = Object.freeze({
  MIN_VIDEOS: 3, // allow-literal: 롱폼 영상이 3편 미만이면 비교하지 않는다(2026-11-15 사용자 지시)
  MIN_SENTENCES: 8, // allow-literal: 우리 문장이 이보다 적으면 비율이 흔들려 "참고"만 붙인다(품질 문턱과 같은 값)
  ENDING_SKEW_GAP_PCT: 15, // allow-literal: 가장 많은 끝맺음이 경쟁보다 15%p 넘게 쏠리면 짚는다(가설, 수동 측정에서 우리 61% vs 경쟁 42%)
  LENGTH_RATIO: 1.5, // allow-literal: 평균 문장 길이가 경쟁의 1.5배를 넘거나 2/3 미만이면 짚는다(가설)
  FILLER_RATIO: 0.5, // allow-literal: 말버릇이 경쟁의 절반 미만이면 짚는다(0이면 당연히 포함, 가설)
  COMMAND_RATIO: 3, // allow-literal: 권유·지시 어미가 경쟁의 3배 이상이면서 6% 이상이면 안내 방송 톤 경고(2026-11-24 가설)
  COMMAND_MIN_PCT: 6, // allow-literal: 위 권유·지시 경고 최소 비율
  OTHER_LOW_RATIO: 0.35, // allow-literal: 입말 끊김(other)이 경쟁 12% 이상 구간에서 35% 미만이면 발표 원고 경고(2026-11-24 가설)
  OTHER_THEIR_MIN_PCT: 12, // allow-literal: 위 입말 끊김 비교의 경쟁 최소 비율
});
const DEFAULT_PATTERNS_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'youtube', 'speech-patterns.json');

export function loadSpeechPatterns(file = DEFAULT_PATTERNS_PATH) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const topEnding = (endingsPct) => ENDING_KEYS.reduce((best, k) => ((endingsPct[k] ?? 0) > (endingsPct[best] ?? 0) ? k : best), ENDING_KEYS[0]);

/** 우리 대본의 말투를 경쟁 합계와 비교한다. 비교할 수 없으면 {ok:false, reason}. kind는 'long'(기본) 또는 'short'. */
export function compareWithCompetitors(markdown, patterns, { kind = 'long' } = {}) {
  const group = patterns?.[kind];
  const videos = group?.videoCount ?? 0;
  if (!group?.rates || videos < COMPARE.MIN_VIDEOS) {
    return { ok: false, reason: `경쟁 영상 말투 기준이 아직 부족해 비교하지 않음(${kind === 'long' ? '롱폼' : '쇼츠'} 품질 통과 ${videos}편, ${COMPARE.MIN_VIDEOS}편 필요)` };
  }
  const text = extractNarration(markdown).map((x) => x.text).join(' ');
  const stats = measureSpeech(text);
  if (!stats) return { ok: false, reason: '우리 대본에서 한글 문장을 찾지 못함' };
  const ours = speechRates(stats);
  const theirs = group.rates;
  const flags = [];
  if (ours.dictFramePct > 0 && ours.dictFramePct >= theirs.dictFramePct * 2) {
    flags.push(`사전 풀이 모양("~라는 뜻의 X는")이 우리 ${ours.dictFramePct}%, 경쟁 ${theirs.dictFramePct}%. 말로 뜻을 알려 줄 때는 단어를 먼저 말하고 뜻을 뒤에 붙이는 쪽이 경쟁 영상에서 더 흔했다(뜻 뒤에 붙임: 우리 ${ours.meaningAfterPct}%, 경쟁 ${theirs.meaningAfterPct}%)`);
  }
  const ourTop = topEnding(ours.endingsPct), theirTop = topEnding(theirs.endingsPct);
  if (ours.endingsPct[ourTop] - (theirs.endingsPct[ourTop] ?? 0) >= COMPARE.ENDING_SKEW_GAP_PCT) {
    flags.push(`끝맺음이 한 가지에 쏠림: ${ENDING_LABELS[ourTop]} 우리 ${ours.endingsPct[ourTop]}%, 경쟁 ${theirs.endingsPct[ourTop]}%(경쟁은 ${ENDING_LABELS[theirTop]} ${theirs.endingsPct[theirTop]}%가 가장 많음)`);
  }
  if (theirs.fillersTotalPer100 > 0 && ours.fillersTotalPer100 < theirs.fillersTotalPer100 * COMPARE.FILLER_RATIO) {
    flags.push(`말버릇·접속어(자, 그래서, 여러분, 이게, 그냥 등)가 문장 100개당 우리 ${ours.fillersTotalPer100}번, 경쟁 ${theirs.fillersTotalPer100}번`);
  }
  if (theirs.meanLength > 0 && (ours.meanLength > theirs.meanLength * COMPARE.LENGTH_RATIO || ours.meanLength < theirs.meanLength / COMPARE.LENGTH_RATIO)) {
    flags.push(`평균 문장 길이(공백 뺀 글자)가 우리 ${ours.meanLength}, 경쟁 ${theirs.meanLength}`);
  }
  if (ours.sentences >= COMPARE.MIN_SENTENCES) {
    const ourCmd = ours.endingsPct.command ?? 0;
    const theirCmd = theirs.endingsPct.command ?? 0;
    if (ourCmd >= COMPARE.COMMAND_MIN_PCT && (theirCmd === 0 || ourCmd >= theirCmd * COMPARE.COMMAND_RATIO)) {
      flags.push(`권유·지시 어미(~해 보세요/~하세요)가 우리 ${ourCmd}%, 경쟁 ${theirCmd}% — 안내 방송 톤으로 들릴 수 있음`);
    }
    const ourOther = ours.endingsPct.other ?? 0;
    const theirOther = theirs.endingsPct.other ?? 0;
    if (theirOther >= COMPARE.OTHER_THEIR_MIN_PCT && ourOther <= theirOther * COMPARE.OTHER_LOW_RATIO) {
      flags.push(`명사·입말 끊김 호흡(other)이 우리 ${ourOther}%, 경쟁 ${theirOther}% — 문장이 매번 교과서처럼 닫혀 발표 원고처럼 들릴 수 있음`);
    }
  }
  return { ok: true, kind, videoCount: videos, lowSample: Boolean(group.lowSample), confidence: patterns.confidence ?? null, ours, theirs, flags, fewSentences: ours.sentences < COMPARE.MIN_SENTENCES };
}

export function formatComparison(c) {
  if (!c.ok) return [`  [비교] ${c.reason}`];
  const L = [];
  const row = (name, a, b) => L.push(`  ${name.padEnd(28)} 우리 ${String(a).padStart(6)}   경쟁 ${String(b).padStart(6)}`);
  L.push(`  [비교] 경쟁 ${c.kind === 'long' ? '롱폼' : '쇼츠'} ${c.videoCount}편(문장 ${c.theirs.sentences}개)${c.lowSample ? ', 표본 작음' : ''}, 기준 신뢰도 ${c.confidence ?? '없음'}. 우리 문장 ${c.ours.sentences}개${c.fewSentences ? '(적어서 비율이 흔들림)' : ''}`);
  for (const k of ENDING_KEYS) row(`끝맺음 ${ENDING_LABELS[k]} %`, c.ours.endingsPct[k], c.theirs.endingsPct[k]);
  row('평균 문장 길이(글자)', c.ours.meanLength, c.theirs.meanLength);
  row('인데류 문장 중간(100문장당)', c.ours.jointMidPer100, c.theirs.jointMidPer100);
  row('인데요류 문장 끝(100문장당)', c.ours.jointEndPer100, c.theirs.jointEndPer100);
  row('말버릇·접속어(100문장당)', c.ours.fillersTotalPer100, c.theirs.fillersTotalPer100);
  row('사전 풀이 모양 문장 %', c.ours.dictFramePct, c.theirs.dictFramePct);
  row('뜻을 뒤에 붙임 문장 %', c.ours.meaningAfterPct, c.theirs.meaningAfterPct);
  row('질문 문장 %', c.ours.questionPct, c.theirs.questionPct);
  row('과거형 결론 문장 %', c.ours.pastConclusionPct, c.theirs.pastConclusionPct);
  if (c.flags.length) { L.push('  크게 벗어난 항목:'); for (const f of c.flags) L.push(`   - ${f}`); }
  else L.push('  크게 벗어난 항목: 없음');
  L.push('  이 비교는 제안일 뿐이고 경쟁 기준은 가설이다. 어색한지의 최종 판정은 사용자의 귀다.');
  return L;
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const compare = args.includes('--compare');
  const kind = args.includes('--short') ? 'short' : 'long';
  const files = args.filter((a) => !a.startsWith('--'));
  if (!files.length) { console.error('사용법: node scripts/check-narration-naturalness.mjs <SCRIPT.md...> [--json] [--compare [--short]]'); process.exit(2); }
  const patterns = compare ? loadSpeechPatterns() : null;
  let hasError = false;
  const results = files.map((f) => {
    const md = fs.readFileSync(f, 'utf8');
    const r = checkNarration(md);
    if (r.issues.some((i) => i.severity === 'error')) hasError = true;
    return { file: f, ...r, ...(compare ? { compare: patterns ? compareWithCompetitors(md, patterns, { kind }) : { ok: false, reason: 'data/youtube/speech-patterns.json이 아직 없음(경쟁 영상 리포트를 만들면 자동으로 생긴다)' } } : {}) };
  });
  if (json) { console.log(JSON.stringify(results, null, 2)); }
  else {
    for (const r of results) {
      const by = {}; r.issues.forEach((i) => { by[i.kind] = (by[i.kind] || 0) + 1; });
      console.log(`${r.file}: 문장 ${r.sentenceCount}개, 이슈 ${r.issues.length}개 ${JSON.stringify(by)}`);
      for (const i of r.issues) console.log(`  [${i.severity}] ${i.kind} 줄 ${i.line}: "${i.match}" ${i.note} | ${i.sentence}`);
      if (r.compare) for (const line of formatComparison(r.compare)) console.log(line);
    }
  }
  process.exit(hasError ? 1 : 0);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
