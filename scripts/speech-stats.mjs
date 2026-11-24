// 한국어 말투 측정(순수 함수만: 파일·네트워크 접근 없음). 2026-11-15.
// 목적: 경쟁 영상 진행자의 실제 말투를 숫자로 재서 "글 쓰듯" 들리는 우리 나레이션과 나란히 본다.
// 시작은 knowledge/narration-speech-patterns.md의 수동 측정(롱폼 5편 문장 243개)이다. 표본이 작아 전부 "가설"이다.
// 쓰는 곳: scripts/outlier-report.mjs(리포트의 speech 칸, 합계 파일), scripts/check-narration-naturalness.mjs --compare.

/**
 * 받아쓰기 글의 품질 문턱. 전부 가설이다(2026-11-15, 수동 측정에 쓴 영상 21편의 받아쓰기 글로 맞췄다).
 *  통과 6편(롱폼 5편 + 쇼츠 1편): 한국어 비율 0.91~1.00, 고유 어절 비율 0.55~0.86, 고유 문장 비율 0.91~1.00, 문장 8~64개, 한글 196~1237자
 *  낮음 11편: 문장 1~6개 9편, 영어 예문 낭독(한국어 비율 0.18, 고유 어절 0.17), 랩(한국어 비율 0.51, 고유 어절 0.21)
 * 문턱은 그 사이의 값으로 두었다. 영상이 더 쌓이면 다시 맞춘다.
 */
export const SPEECH_QUALITY = Object.freeze({
  MIN_SENTENCES: 8, // allow-literal: 통과 최소 8개(쇼츠), 낮음 중 문장 수로만 걸리는 것은 최대 6개
  MIN_HANGUL_CHARS: 150, // allow-literal: 통과 최소 196자, 낮음 중 한국어 비율은 높지만 짧은 것이 106·116자
  HANGUL_RATIO_MIN: 0.7, // allow-literal: 통과 최소 0.91, 영어 예문 낭독 0.18·랩 0.51
  UNIQUE_WORD_MIN: 0.4, // allow-literal: 통과 최소 0.55, 반복에 깨진 것 0.17~0.21
  UNIQUE_SENTENCE_MIN: 0.8, // allow-literal: 통과 최소 0.91, 영어 예문 낭독 0.68
});

/** 문장 나누기. 오차: 문장 부호가 없는 자막은 어미 뒤 공백으로만 나눠서 "필요 없어요"처럼 단어 끝의 `요`에서 잘못 쪼개거나(문장이 늘어남), `~는데` 같은 연결형은 못 쪼갠다. */
export function splitSentences(raw) {
  const t = String(raw ?? '').replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
  const out = [];
  for (const piece of t.split(/(?<=[.?!])\s+/).filter(Boolean)) {
    const sub = piece.split(/(?<=(?:요|니다|죠|까요|네요|세요|거든요|잖아요|데요|어요|아요|해요|예요|이에요))[,]?\s+(?=[가-힣A-Za-z])/);
    for (const s of sub) { const x = s.trim(); if (x) out.push(x); }
  }
  return out;
}

export const ENDING_LABELS = Object.freeze({
  question: '의문(~까요?/~나요?/?)',
  command: '명령·권유(~하세요/~해 보세요)',
  geodeunyo: '~거든요',
  janhayo: '~잖아요',
  neyo: '~네요',
  ndeyo: '~는데요/~인데요',
  jyo: '~죠/~지요',
  hapsyo: '합쇼체(~습니다)',
  haeyo: '해요체(~요, 위 항목 제외)',
  other: '명사·어미 끊김/기타',
});
export const ENDING_KEYS = Object.keys(ENDING_LABELS);

// 위에서부터 처음 맞는 하나에만 센다. 부호가 없는 자막은 ?로 의문을 알 수 없어 `~까요/~나요`로 끝나는 것도 의문으로 본다.
const ENDING_TESTS = [
  ['question', (s) => /\?$/.test(s) || /(?:까요|나요)[.!]?$/.test(s)],
  ['command', (s) => /(?:세요|보세요|해봐요|봅시다|합시다|십시오|주세요|해보세요)[.!]?$/.test(s)],
  ['geodeunyo', (s) => /거든요[.!?]?$/.test(s)],
  ['janhayo', (s) => /잖아요[.!?]?$/.test(s)],
  ['neyo', (s) => /네요[.!?]?$/.test(s)],
  ['ndeyo', (s) => /[는은인건ㄴ]데요[.!?]?$/.test(s)],
  ['jyo', (s) => /(?:죠|지요)[.!?]?$/.test(s)],
  ['hapsyo', (s) => /(?:습니다|입니다|ㅂ니다|니다)[.!?]?$/.test(s)],
  ['haeyo', (s) => /요[.!?]?$/.test(s)],
];

export function endingKey(sentence) {
  const c = String(sentence).replace(/[\s"'”“]+$/, '');
  for (const [key, test] of ENDING_TESTS) if (test(c)) return key;
  return 'other';
}

/** 말버릇·접속어. 횟수는 문장 안에서 직접 센다(합계에서 "문장 100개당"으로 바꾼다). */
export const FILLER_PATTERNS = Object.freeze({
  '자': /(?:^|\s)자[,\s]/g,
  '그래서': /그래서/g,
  '그런데': /그런데/g,
  '근데': /근데/g,
  '그러면': /그러면/g,
  '여러분': /여러분/g,
  '이게': /이게/g,
  '그냥': /그냥/g,
  '진짜': /진짜/g,
  '되게': /되게/g,
  '사실': /사실/g,
  '우리': /우리/g,
  '약간': /약간/g,
});
export const FILLER_KEYS = Object.keys(FILLER_PATTERNS);

const JOINT_MID = /[는은인건ㄴ]데,?\s+(?=\S)/g; // 문장 중간 연결 "~인데 ..."
const JOINT_END = /[는은인건ㄴ]데요[.?!]?(?:\s|$)/g; // 문장 끝 "~인데요"
const DICT_FRAME = /(?:[다라]는|이라는|이?란)\s*뜻의|뜻하는/; // 사전 풀이 모양 "~라는 뜻의 X는"(뜻을 먼저 말하고 단어가 뒤에 온다)
const MEANING_AFTER = /뜻(?:이에요|입니다|이죠|이야|이라고)/; // 단어를 먼저 말하고 뜻을 뒤에 붙임 "~라는 뜻이에요"
// 과거형 결론: 끝에서 두 번째 음절의 받침이 ㅆ(달랐어요, 했습니다, 갔죠). 현재형 `있어요`와 미래형 `하겠습니다`는 받침이 같아 뺀다.
const PAST_ENDING = /([가-힣])(?:어요|습니다|죠|지요|거든요|잖아요|네요|는데요|다|어)[.!?]?$/;
function isPastConclusion(tail) {
  const m = tail.match(PAST_ENDING);
  if (!m || m[1] === '있' || m[1] === '겠') return false;
  return (m[1].charCodeAt(0) - 0xAC00) % 28 === 20; // allow-literal: 한글 음절 코드에서 받침 ㅆ의 번호
}

const median = (values) => {
  const s = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const count = (text, re) => (text.match(re) || []).length;
const compactLength = (s) => s.replace(/\s/g, '').length;

/** 글 하나의 말투 숫자. 합계를 낼 수 있게 비율이 아니라 횟수를 담는다. 문장이 없으면 null. */
export function measureSpeech(text) {
  const sents = splitSentences(text);
  if (!sents.length) return null;
  const lens = sents.map(compactLength);
  const endings = Object.fromEntries(ENDING_KEYS.map((k) => [k, 0]));
  for (const s of sents) endings[endingKey(s)] += 1;
  const full = sents.join(' ');
  const fillers = Object.fromEntries(FILLER_KEYS.map((k) => [k, count(full, FILLER_PATTERNS[k])]));
  const tails = sents.map((s) => s.replace(/[\s"'”“]+$/, ''));
  return {
    sentences: sents.length,
    lengthSum: lens.reduce((a, b) => a + b, 0),
    lengthMedian: median(lens),
    endings,
    jointMid: count(full, JOINT_MID),
    jointEnd: count(full, JOINT_END),
    fillers,
    dictFrameSentences: sents.filter((s) => DICT_FRAME.test(s)).length,
    meaningAfterSentences: sents.filter((s) => MEANING_AFTER.test(s)).length,
    questionSentences: endings.question,
    pastConclusionSentences: tails.filter(isPastConclusion).length,
  };
}

/** 받아쓰기 글이 말투 표본으로 쓸 만한지. low이면 합계에서 뺀다. reasons는 걸린 이유(사람이 읽는 말). */
export function assessSpeechQuality(text) {
  const t = String(text ?? '').replace(/\[[^\]]*\]/g, ' ');
  const sents = splitSentences(text);
  const hangul = count(t, /[가-힣]/g);
  const latin = count(t, /[A-Za-z]/g);
  const words = t.replace(/["'“”.,?!~]/g, ' ').split(/\s+/).filter(Boolean);
  const metrics = {
    sentences: sents.length,
    hangulChars: hangul,
    hangulRatio: hangul + latin ? round2(hangul / (hangul + latin)) : null,
    uniqueWordRatio: words.length ? round2(new Set(words).size / words.length) : null,
    uniqueSentenceRatio: sents.length ? round2(new Set(sents).size / sents.length) : null,
  };
  const Q = SPEECH_QUALITY;
  const reasons = [];
  if (metrics.sentences < Q.MIN_SENTENCES) reasons.push(`문장 ${metrics.sentences}개(${Q.MIN_SENTENCES}개 미만)`);
  if (metrics.hangulChars < Q.MIN_HANGUL_CHARS) reasons.push(`한글 ${metrics.hangulChars}자(${Q.MIN_HANGUL_CHARS}자 미만)`);
  if (metrics.hangulRatio != null && metrics.hangulRatio < Q.HANGUL_RATIO_MIN) reasons.push(`한국어 글자 비율 ${metrics.hangulRatio}(${Q.HANGUL_RATIO_MIN} 미만)`);
  if (metrics.uniqueWordRatio != null && metrics.uniqueWordRatio < Q.UNIQUE_WORD_MIN) reasons.push(`고유 어절 비율 ${metrics.uniqueWordRatio}(${Q.UNIQUE_WORD_MIN} 미만, 같은 말 반복)`);
  if (metrics.uniqueSentenceRatio != null && metrics.uniqueSentenceRatio < Q.UNIQUE_SENTENCE_MIN) reasons.push(`고유 문장 비율 ${metrics.uniqueSentenceRatio}(${Q.UNIQUE_SENTENCE_MIN} 미만, 같은 문장 반복)`);
  return {quality: reasons.length ? 'low' : 'ok', reasons, metrics};
}

function round2(n) { return Math.round(n * 100) / 100; }

const EXCERPT_MIN_CHARS = 70; // allow-literal: 짧은 감탄 한 줄만 남는 것을 막는 최소 발췌 길이
const EXCERPT_MAX_CHARS = 240; // allow-literal: 실제 말 덩어리 20~30초 호흡 발췌 상한

/**
 * 실제 사람 진행자의 연속 말 덩어리(원문 발췌)를 도입·중반에서 최대 2토막 뽑는다(2026-11-24).
 * 숫자 통계만 주면 AI가 발표 원고로 굳어지므로, 실제 말맛·호흡·끊김을 눈으로 보고 흡수하게 하기 위함이다.
 */
export function extractSpokenExcerpts(text, {maxExcerpts = 2, maxChars = EXCERPT_MAX_CHARS} = {}) {
  const sents = splitSentences(text);
  if (!sents.length) return [];
  const takeChunk = (startIdx) => {
    let chunk = '';
    let idx = startIdx;
    while (idx < sents.length) {
      const next = chunk ? `${chunk} ${sents[idx]}` : sents[idx];
      if (chunk && next.length > maxChars) break;
      chunk = next;
      idx += 1;
      if (chunk.length >= EXCERPT_MIN_CHARS * 2) break;
    }
    const hangul = count(chunk, /[가-힣]/g);
    const latin = count(chunk, /[A-Za-z]/g);
    if (hangul < EXCERPT_MIN_CHARS / 2 || (hangul + latin > 0 && hangul / (hangul + latin) < 0.6)) return null;
    return {text: chunk.slice(0, maxChars).trim(), endIdx: idx};
  };
  const out = [];
  const first = takeChunk(0);
  if (first) out.push(first.text);
  if (maxExcerpts >= 2 && sents.length >= 6) {
    const midStart = Math.max(first ? first.endIdx : 2, Math.floor(sents.length * 0.35));
    if (midStart < sents.length) {
      const second = takeChunk(midStart);
      if (second && !out.includes(second.text)) out.push(second.text);
    }
  }
  return out;
}

/**
 * 리포트의 speech 칸을 만든다. text가 비면 "측정 못 함"(source null)과 이유를 담는다.
 * kind는 'long' | 'short'. durationSeconds(측정 구간 길이, 초)가 있으면 초당 한글 밀도(hangulPerSec)도 함께 기록한다.
 * extra는 fallbackTried·blocked 같은 표시를 그대로 붙인다.
 */
export function buildSpeechField({text, source, kind, durationSeconds = null, now = new Date(), note = null, extra = {}} = {}) {
  const computedAt = now.toISOString();
  const stats = text ? measureSpeech(text) : null;
  if (!stats || !source) {
    return {source: null, quality: null, kind: kind ?? null, sentences: null, stats: null, computedAt, note: note || '말투를 재지 못함', ...extra};
  }
  const {quality, reasons, metrics} = assessSpeechQuality(text);
  const dur = Number(durationSeconds);
  const paceFields = Number.isFinite(dur) && dur > 0
    ? {windowSeconds: round1(dur), hangulPerSec: round2(metrics.hangulChars / dur)}
    : {};
  const excerpts = quality === 'ok' ? extractSpokenExcerpts(text) : [];
  return {
    source, quality, kind: kind ?? null, sentences: stats.sentences, stats, qualityMetrics: metrics, ...paceFields,
    ...(excerpts.length ? {excerpts} : {}),
    computedAt,
    note: note || (quality === 'low' ? `품질 낮음: ${reasons.join(', ')}` : null),
    ...extra,
  };
}

/** 횟수 합계 → 사람이 비교하는 숫자(문장 100개당, 비율). 문장이 0이면 null. */
export function speechRates(totals) {
  const n = totals?.sentences;
  if (!n) return null;
  const per100 = (v) => round1((100 * v) / n);
  return {
    sentences: n,
    meanLength: round1(totals.lengthSum / n),
    endingsPct: Object.fromEntries(ENDING_KEYS.map((k) => [k, round1((100 * (totals.endings?.[k] || 0)) / n)])),
    jointMidPer100: per100(totals.jointMid),
    jointEndPer100: per100(totals.jointEnd),
    fillersPer100: Object.fromEntries(FILLER_KEYS.map((k) => [k, per100(totals.fillers?.[k] || 0)])),
    fillersTotalPer100: per100(FILLER_KEYS.reduce((a, k) => a + (totals.fillers?.[k] || 0), 0)),
    dictFramePct: round1((100 * totals.dictFrameSentences) / n),
    meaningAfterPct: round1((100 * totals.meaningAfterSentences) / n),
    questionPct: round1((100 * totals.questionSentences) / n),
    pastConclusionPct: round1((100 * totals.pastConclusionSentences) / n),
  };
}
function round1(n) { return Math.round(n * 10) / 10; }

function addTotals(acc, st) {
  acc.sentences += st.sentences;
  acc.lengthSum += st.lengthSum;
  for (const k of ENDING_KEYS) acc.endings[k] += st.endings?.[k] || 0;
  for (const k of FILLER_KEYS) acc.fillers[k] += st.fillers?.[k] || 0;
  for (const k of ['jointMid', 'jointEnd', 'dictFrameSentences', 'meaningAfterSentences', 'questionSentences', 'pastConclusionSentences']) acc[k] += st[k] || 0;
}
const emptyTotals = () => ({
  sentences: 0, lengthSum: 0, jointMid: 0, jointEnd: 0, dictFrameSentences: 0, meaningAfterSentences: 0, questionSentences: 0, pastConclusionSentences: 0,
  endings: Object.fromEntries(ENDING_KEYS.map((k) => [k, 0])), fillers: Object.fromEntries(FILLER_KEYS.map((k) => [k, 0])),
});

export const SPEECH_LOW_SAMPLE_VIDEOS = 5; // allow-literal: 영상 5편 미만이면 lowSample(2026-11-15 사용자 지시)

const LONG_SPEECH_WINDOW_CAP = 300; // allow-literal: outlier-report.mjs 롱폼 앞 5분(300초) 창과 동일

function speechHangulPerSec(report) {
  const sp = report?.speech;
  if (Number.isFinite(sp?.hangulPerSec) && sp.hangulPerSec > 0) return sp.hangulPerSec;
  const chars = sp?.qualityMetrics?.hangulChars;
  const rawDur = Number(sp?.windowSeconds ?? report?.meta?.durationSeconds);
  if (!Number.isFinite(chars) || chars <= 0 || !Number.isFinite(rawDur) || rawDur <= 0) return null;
  const dur = sp.kind === 'long' ? Math.min(rawDur, LONG_SPEECH_WINDOW_CAP) : rawDur;
  return dur > 0 ? round2(chars / dur) : null;
}

function fallbackExcerptsFromReport(report) {
  const quotes = (report?.analysis?.flow || []).map((x) => String(x?.quote || '').trim()).filter(Boolean);
  if (!quotes.length) return [];
  const joined = quotes.slice(0, 4).join(' ');
  return extractSpokenExcerpts(joined, {maxExcerpts: 1});
}

const MAX_EXEMPLARS_PER_FORMAT = 6; // allow-literal: 다채널 회전 참고용 최대 6채널 발췌 보관

/**
 * 저장된 리포트들의 speech 칸으로 경쟁 말투 기준 합계와 다채널 실제 말 덩어리(exemplars)를 만든다(순수 함수).
 * quality가 'ok'인 영상만 더하고, 롱폼·쇼츠를 따로 센다. 한 채널 말투 복사를 막으려 채널당 1편씩만 발췌한다.
 */
export function buildSpeechPatterns(reports = [], now = new Date()) {
  const groups = {
    long: {totals: emptyTotals(), videos: [], lengthMedians: [], hangulPerSecs: [], bySource: {}, exemplars: [], seenChannels: new Set()},
    short: {totals: emptyTotals(), videos: [], lengthMedians: [], hangulPerSecs: [], bySource: {}, exemplars: [], seenChannels: new Set()},
  };
  let excludedLow = 0;
  let unmeasured = 0;
  for (const r of reports) {
    const sp = r?.speech;
    if (!sp || !sp.source) { unmeasured += 1; continue; }
    if (sp.quality !== 'ok') { excludedLow += 1; continue; }
    const g = groups[sp.kind];
    if (!g || !sp.stats) { unmeasured += 1; continue; }
    addTotals(g.totals, sp.stats);
    const hps = speechHangulPerSec(r);
    if (hps != null) g.hangulPerSecs.push(hps);
    g.videos.push({videoId: r.videoId, channelTitle: r.meta?.channelTitle ?? null, source: sp.source, sentences: sp.stats.sentences, ...(hps != null ? {hangulPerSec: hps} : {})});
    g.lengthMedians.push(sp.stats.lengthMedian);
    g.bySource[sp.source] = (g.bySource[sp.source] || 0) + 1;
    const chKey = String(r.meta?.channelTitle || r.videoId || '').trim();
    if (g.exemplars.length < MAX_EXEMPLARS_PER_FORMAT && !g.seenChannels.has(chKey)) {
      const ex = Array.isArray(sp.excerpts) && sp.excerpts.length ? sp.excerpts : fallbackExcerptsFromReport(r);
      if (ex.length) {
        g.seenChannels.add(chKey);
        g.exemplars.push({videoId: r.videoId, channelTitle: r.meta?.channelTitle ?? null, excerpts: ex});
      }
    }
  }
  const out = {
    schemaVersion: 1,
    computedAt: now.toISOString(),
    confidence: '가설',
    note: '경쟁 영상 말투 합계와 다채널 실제 말 덩어리(참고용). 품질이 ok인 영상만 더했고, 어색함의 최종 판정은 사용자 귀다. 자막(transcript-api)과 받아쓰기(whisper-small)는 문장 나눠지는 방식이 달라 섞여 있다.',
    qualityThresholds: {...SPEECH_QUALITY},
    excludedLowQuality: excludedLow,
    unmeasured,
  };
  for (const [kind, g] of Object.entries(groups)) {
    const hpsMed = median(g.hangulPerSecs);
    out[kind] = {
      videoCount: g.videos.length,
      lowSample: g.videos.length < SPEECH_LOW_SAMPLE_VIDEOS,
      totals: g.totals,
      rates: speechRates(g.totals),
      lengthMedianOfVideos: median(g.lengthMedians),
      hangulPerSecMedian: hpsMed != null ? round2(hpsMed) : null,
      bySource: g.bySource,
      exemplars: g.exemplars,
      videos: g.videos,
    };
  }
  return out;
}
