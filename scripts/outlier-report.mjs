// 합친 아웃라이어 리포트: 경쟁 영상 한 편을 제목·썸네일·화면·자막·댓글로 한 번에 관찰한다(2026-11-12).
//
// 왜 새로 만들었나(사용자 지적, knowledge/logs/2026-11.md 2026-11-12):
// - 예전 대본 리포트와 댓글 리포트는 따로 돌아서 "이 장면 때문에 이 반응"을 이을 수 없었다.
// - 프롬프트에 우리 철학(도파민 3단계 등)과 미리 정한 분류 목록이 박혀 있어 AI가 관찰 대신 끼워 맞췄다.
// - 화면 연출(컷, 자막, 그래픽)은 자막만으로는 알 수 없는데 AI가 지어내기 쉬웠다.
// 그래서 이 리포트는 (1) 영상을 직접 보게 하고(유튜브 링크를 Gemini에 그대로 넘김),
// (2) 모든 서술에 원문 인용을 붙이게 해서 코드가 실제 자막·댓글·제목과 대조하고,
// (3) 장면 전환 간격은 AI 대신 코드가 계산하고, (4) 화면 변화 순간은 캡처 띠로 남겨 사람이 눈으로 확인한다.
//
// 저장: data/youtube/outlier-reports/<videoId>.json (깃에 올림)
//       data/youtube/outlier-frames/<videoId>/<초>.jpg (2026-11-16부터 깃으로 동기화, 빠진 것은 --ensure-frames가 채움)
// 실행: node scripts/outlier-report.mjs <영상ID> [<영상ID> ...]
import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {GEMINI_TEXT_MODELS} from './gemini-models.mjs';
import {upsertAudienceDnaFile} from './audience-dna.mjs';
import {comparableRatioOrNull, computePeerRatio, formatRatioLabel, RATIO_METHOD, ratioTier} from './peer-ratio.mjs';
import {buildSpeechField, buildSpeechPatterns} from './speech-stats.mjs';

const execFileAsync = promisify(execFile);
const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const reportsDir = join(projectDir, 'data', 'youtube', 'outlier-reports');
export const framesDir = join(projectDir, 'data', 'youtube', 'outlier-frames');

export const LONG_VIDEO_WINDOW_SECONDS = 300; // 긴 영상은 앞 5분의 화면을 본다(오프닝과 초반 전개). 자막·댓글은 전체
export const MAX_FRAMES_PER_VIDEO = 12;
const FIRST_SECONDS = 15;
const MAX_TRANSCRIPT_CHARS = 20000;
const MAX_COMMENTS = 60;
const VIDEO_ID_RE = /^[\w-]{11}$/;

const mmss = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function analysisWindowSeconds(durationSeconds) {
  const d = Number(durationSeconds);
  return Number.isFinite(d) && d > 0 && d <= LONG_VIDEO_WINDOW_SECONDS ? Math.ceil(d) : LONG_VIDEO_WINDOW_SECONDS;
}

/** 같은 채널의 같은 형식 평소 영상(대조군) 최대 limit편을 뽑는다. 다른 메가 히트나 다른 형식은 빼고 중앙값 주변의 전형적 평소 영상을 고른다. */
export const CONTRAST_PEER_LIMIT = 5; // allow-literal: 대조군 표시 상한(프롬프트 토큰 절약)
export function selectContrastPeers(channelVideos = [], target = {}, {limit = CONTRAST_PEER_LIMIT} = {}) {
  const targetId = target?.videoId || '';
  const targetViews = Number(target?.viewCount);
  const targetIsShort = typeof target?.isShort === 'boolean' ? target.isShort : null;
  const pool = (channelVideos || [])
    .filter((v) => v && v.videoId && v.videoId !== targetId && String(v.title || '').trim() && Number.isFinite(Number(v.viewCount)))
    .filter((v) => targetIsShort == null || v.isShort === targetIsShort)
    .filter((v) => !Number.isFinite(targetViews) || Number(v.viewCount) < targetViews)
    .sort((a, b) => Number(a.viewCount) - Number(b.viewCount));
  if (!pool.length) return [];
  let picked = pool;
  if (pool.length > limit) {
    // 양 극단(0회 오류·다른 대박 영상)을 피하고 20%~80% 구간에서 고르게 뽑는다.
    const lo = Math.floor(pool.length * 0.2);
    const hi = Math.max(lo, Math.min(pool.length - 1, Math.floor(pool.length * 0.8)));
    const slice = pool.slice(lo, hi + 1);
    if (slice.length <= limit) picked = slice;
    else picked = Array.from({length: limit}, (_, i) => slice[Math.round((i * (slice.length - 1)) / Math.max(1, limit - 1))]);
  }
  return picked.map((v) => ({
    videoId: v.videoId,
    title: String(v.title).trim(),
    viewCount: Number(v.viewCount),
    durationSeconds: Number.isFinite(Number(v.durationSeconds)) ? Number(v.durationSeconds) : null,
    publishedAt: v.publishedAt ? String(v.publishedAt).slice(0, 10) : null,
  }));
}

/** 관찰만 시키는 프롬프트. 우리 철학·분류 목록·내용 예시는 넣지 않는다(AGENTS.md 2026-11-12). */
export function buildReportPrompt({meta, subscriberCount = null, outlierRatio = null, transcriptLines = null, comments = [], windowSeconds, channelPeers = []}) {
  let transcript = '자막 없음(가져오지 못함). 자막 인용 칸은 비워 둔다.';
  if (transcriptLines?.length) {
    const lines = [];
    let size = 0;
    for (const line of transcriptLines) {
      const text = `[${mmss(line.start)}] ${String(line.text || '').trim()}`;
      if (size + text.length > MAX_TRANSCRIPT_CHARS) { lines.push('(자막이 길어 여기서 줄임)'); break; }
      lines.push(text);
      size += text.length + 1;
    }
    transcript = lines.join('\n');
  }
  const commentBlock = comments.length
    ? comments.slice(0, MAX_COMMENTS).map((c, i) => `${i + 1}. (좋아요 ${c.likeCount ?? 0}) ${String(c.text || '').replace(/\s+/g, ' ').slice(0, 300)}`).join('\n')
    : '댓글 없음(가져오지 못했거나 막혀 있음). 댓글 칸은 빈 배열로 둔다.';
  const facts = [
    `제목: ${meta.title}`,
    `채널: ${meta.channelTitle}${subscriberCount != null ? ` (구독자 ${subscriberCount}명)` : ''}`,
    `조회수 ${meta.viewCount}회 · 올린 날 ${String(meta.publishedAt || '').slice(0, 10)} · 길이 ${meta.durationSeconds ?? '확인 불가'}초`,
    outlierRatio != null ? `이 영상의 조회수는 같은 채널·같은 형식 최근 영상 조회수의 중앙값보다 ${Math.round(outlierRatio * 10) / 10}배 많다.` : '',
  ].filter(Boolean).join('\n');
  const peerBlock = Array.isArray(channelPeers) && channelPeers.length
    ? `\n\n[같은 채널의 같은 형식 평소 영상 대조군]\n${channelPeers.map((p) => `- "${String(p.title || '').replace(/\s+/g, ' ').trim()}" (조회수 ${Number(p.viewCount).toLocaleString('en-US')}회 · 길이 ${p.durationSeconds ?? '확인 불가'}초 · ${p.publishedAt || '날짜 없음'})`).join('\n')}`
    : '';

  return `너는 유튜브 영상을 보고 있는 그대로 기록하는 관찰자다. 평가하거나 미리 정한 유형·공식에 끼워 넣지 말고, 실제로 보고 들은 것을 적는다.

[영상 정보]
${facts}${peerBlock}

[함께 준 자료]
1) 영상 자체 — 처음 ${windowSeconds}초 구간의 화면과 소리
2) 썸네일 이미지
3) 자막(시각 포함)
4) 인기 댓글

[지킬 것]
- 서술은 자기 말로 쓰고, 근거가 되는 원문을 quote 칸에 그대로 붙인다. 자막 인용은 아래 자막에 있는 글자 그대로, 댓글 인용은 아래 댓글에 있는 글자 그대로, 제목 인용은 제목에 있는 글자 그대로 쓴다. 원문을 바꾸거나 지어내지 않는다. 원문이 없으면 quote는 빈 문자열.
- 이름표로 분류하지 말고 무엇을 했는지 묘사한다.
- 자료로 알 수 없는 것은 "확인 불가"라고 쓴다. 해당 없는 목록은 빈 배열로 둔다. 칸을 억지로 채우지 않는다.
- visualMoments에는 처음 ${windowSeconds}초 안에서 화면이 실제로 바뀐 순간을 빠짐없이 모두 넣는다(장면 전환, 자막 모양 변화, 그래픽·표시 등장, 자료 화면, 확대·축소). 요약하거나 대표만 고르지 않는다. t는 초.
- 한국어로 쓴다.
- first3s, infoCount, captionStyle, audio, storytelling 칸은 각 서술을 한두 문장으로 짧게 쓴다. 영상에 실제로 없는 것은 지어내지 말고 "없음"이라고 쓴다. t는 영상 속 초(0~${windowSeconds}), quote는 자막이나 말 원문 그대로(없으면 빈 문자열).

[자막]
${transcript}

[인기 댓글]
${commentBlock}

[돌려줄 JSON]
{
  "click": {
    "titleDevice": "제목이 어떤 말로 무엇을 약속하거나 궁금하게 만드는지",
    "titleQuote": "그 근거가 되는 제목의 글자 그대로",
    "thumbnailText": "썸네일 이미지에 적힌 글자 그대로(없으면 빈 문자열)",
    "thumbnailWordCount": 0,
    "thumbnailVisual": "썸네일에 보이는 것(인물·표정·색·배치)",
    "thumbnailVsTitle": "썸네일 글자와 제목이 같은 말을 반복하는지, 서로 다른 정보를 보태는지"
  },
  "opening": {
    "first15s": "첫 15초 동안 실제로 일어난 일(화면과 말)",
    "quote": "첫 15초 자막 원문",
    "reasonToKeepWatching": "시청자에게 계속 볼 이유를 어떤 말·장면으로 줬는지, 없으면 확인 불가"
  },
  "first3s": {"what": "처음 3초 동안 화면·말·소리에서 실제로 일어난 일", "quote": "그 3초의 자막 원문"},
  "flow": [{"start": 0, "end": 0, "what": "이 구간에서 한 일", "quote": "그 구간 자막 원문"}],
  "visualMoments": [{"t": 0, "what": "화면에서 바뀐 것", "purpose": "그때 나오는 말과 어떻게 맞물리는지"}],
  "ending": {"what": "끝부분에서 한 일(구독 요청, 다음 영상 안내 등이 있으면 그대로)", "quote": "끝부분 자막 원문"},
  "viewerReaction": {
    "resonated": [{"point": "시청자가 공감하거나 감탄한 지점", "quote": "댓글 원문"}],
    "painPoints": [{"pain": "시청자가 털어놓은 어려움·답답함(영어를 들을 때·말할 때)", "quote": "댓글 원문"}],
    "unanswered": [{"question": "시청자에게 남은 질문·아쉬움·요청", "quote": "댓글 원문"}],
    "vocabulary": [{"expression": "시청자가 직접 쓴 표현", "quote": "댓글 원문"}]
  },
  "infoCount": {"count": 0, "description": "영상이 시청자에게 던지는 서로 다른 정보·예시·단어의 개수를 직접 세고, 어떤 방식으로 나열하는지 한 줄"},
  "captionStyle": {"position": "자막·글자 카드가 화면 어디에 있는지(없으면 없음)", "size": "작음, 보통, 큼 중 하나", "highlightColor": "강조에 쓴 색", "highlightMethod": "강조하는 방식(색 바꿈, 박스, 밑줄, 커짐 등)", "textAmount": "한 번에 보이는 글자 양", "changeTiming": "글자가 바뀌는 시점(말에 맞춰, 일정 간격 등)"},
  "audio": {"hasMusic": true, "mood": "배경음악 분위기(없으면 빈 문자열)", "tempo": "느림, 보통, 빠름 중 하나(음악이 없으면 빈 문자열)", "hasSoundEffects": true, "soundEffectUse": "효과음이 언제 무엇에 쓰였는지", "voiceVsMusic": "말과 음악의 비중(말이 중심인지, 음악이 큰지)"},
  "storytelling": {
    "hook": {"type": "영상이 실제로 쓴 훅의 종류를 자기 말로", "what": "그 훅에서 한 일", "t": 0, "quote": "원문"},
    "curiosity": {"opened": {"t": 0, "what": "궁금증(문제)을 연 순간", "quote": "원문"}, "resolved": {"t": 0, "what": "그 궁금증을 푼 순간", "quote": "원문"}},
    "causality": {"connected": true, "summary": "앞 장면의 결과나 문제가 뒤 장면의 이유가 되어 이어지는지, 아니면 나열인지 한 문장", "examples": [{"t": 0, "what": "이어진 곳", "quote": "원문"}]},
    "openLoops": [{"t": 0, "what": "영상이 끝나기 전까지 계속 열어 둔 궁금증", "quote": "원문"}],
    "patternBreaks": [{"t": 0, "what": "같은 틀을 반복하다가 깨뜨린 지점", "quote": "원문"}],
    "viewerActions": [{"t": 0, "what": "시청자에게 시킨 행동(따라 하기, 맞혀 보기, 댓글 등)", "quote": "원문"}],
    "evidence": [{"t": 0, "what": "증거·근거를 보여 준 방식", "quote": "원문"}],
    "payoff": {"t": 0, "what": "끝에서 앞서 한 약속을 회수한 방식", "quote": "원문"}
  },
  "links": [{"cause": "영상의 어느 장면·말(시각 포함)", "reaction": "그에 대한 시청자 반응", "quote": "댓글 원문"}],
  "whyOutlierVsChannel": "같은 채널의 평소 영상 대조군과 비교했을 때 이 영상만 조회수가 크게 오른 핵심 차이를 관찰된 근거로 한두 문장(대조군이 없거나 알 수 없으면 확인 불가)",
  "teachesAdultEnglishSounds": true,
  "teachesAdultEnglishSoundsReason": "위 판정의 이유 한 줄",
  "forUs": {
    "adopt": "이 영상에서 그대로 가져올 만한 점 한 줄(무엇을 어떻게)",
    "differentiate": "이 영상이 놓쳤거나 다르게 할 점 한 줄"
  }
}

teachesAdultEnglishSounds는 true 또는 false만 쓴다. 이 영상 자체가 성인에게 영어 소리(발음·듣기)를 가르치는 원본 영상이면 true, 영어 소리를 가르치는 내용이 아니거나 다른 영상을 잘라 옮긴 클립이면 false다. 판단 근거는 teachesAdultEnglishSoundsReason에 한 줄로 쓴다.
forUs 두 줄만 우리 쪽 관점이다. 우리 채널은 한국에 사는 30~60대 성인이 영어 소리를 이해하도록 돕는 채널이고, 어려운 전문용어나 시청자가 겪지 않은 해외 경험담은 쓰지 않는다. 나머지 칸은 모두 이 영상에 대한 관찰이다.`;
}

const normalize = (text) => String(text ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const contains = (haystack, quote) => {
  const q = normalize(quote);
  return q.length > 0 && normalize(haystack).includes(q);
};

/** 스토리텔링 칸 안의 인용이 달린 항목(t·what·quote)을 모두 모은다. 칸이 없거나 모양이 틀리면 빈 배열. */
export function storytellingItems(st) {
  if (!st || typeof st !== 'object' || Array.isArray(st)) return [];
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  const items = [];
  for (const key of ['hook', 'payoff']) if (isObj(st[key])) items.push(st[key]);
  for (const key of ['opened', 'resolved']) if (isObj(st.curiosity?.[key])) items.push(st.curiosity[key]);
  for (const list of [st.causality?.examples, st.openLoops, st.patternBreaks, st.viewerActions, st.evidence]) {
    if (Array.isArray(list)) items.push(...list.filter(isObj));
  }
  return items;
}

/** 인용이 실제 원문에 있는지 표시한다. true(확인), false(원문에 없음), null(대조할 원문 자체가 없음). 빈 인용은 세지 않는다. */
export function verifyQuotes(analysis = {}, {title = '', transcriptText = null, commentTexts = []} = {}) {
  const a = structuredClone(analysis || {});
  const summary = {checked: 0, verified: 0, unverified: 0};
  const commentsJoined = commentTexts.join('\n');
  const mark = (obj, field, source) => {
    if (!obj || !String(obj[field] ?? '').trim()) return;
    const flag = `${field}Verified`;
    if (source == null) { obj[flag] = null; return; }
    obj[flag] = contains(source, obj[field]);
    summary.checked += 1;
    summary[obj[flag] ? 'verified' : 'unverified'] += 1;
  };
  mark(a.click, 'titleQuote', title);
  mark(a.opening, 'quote', transcriptText);
  for (const f of a.flow || []) mark(f, 'quote', transcriptText);
  mark(a.ending, 'quote', transcriptText);
  mark(a.first3s, 'quote', transcriptText);
  for (const item of storytellingItems(a.storytelling)) mark(item, 'quote', transcriptText);
  for (const key of ['resonated', 'painPoints', 'unanswered', 'vocabulary']) for (const r of a.viewerReaction?.[key] || []) mark(r, 'quote', commentTexts.length ? commentsJoined : null);
  for (const l of a.links || []) mark(l, 'quote', commentTexts.length ? commentsJoined : null);
  return {analysis: a, summary};
}

/** Gemini가 결과 객체를 배열 하나로 감싸 보내는 경우가 있다(2026-11-12 SbQVBQoRciA에서 실제로 발생). */
export function unwrapAnalysis(json) {
  if (Array.isArray(json) && json.length === 1 && json[0] && typeof json[0] === 'object' && !Array.isArray(json[0])) return json[0];
  if (json && typeof json === 'object' && !Array.isArray(json)) return json;
  throw new Error('Gemini 응답 형식이 리포트 객체가 아님');
}

/** ffmpeg `select='gt(scene,0.3)',showinfo` 출력에서 장면 전환 시각(초)을 읽는다. */
export function parseSceneTimes(stderr = '') {
  return [...String(stderr).matchAll(/showinfo[^\n]*\bpts_time:([\d.]+)/g)]
    .map((m) => Math.round(Number(m[1]) * 10) / 10)
    .filter(Number.isFinite);
}

/** 분석 구간 안 화면 변화 시각으로 전환 간격을 계산한다. AI에게 묻지 않는다. */
export function computePacing(visualMoments = [], windowSeconds) {
  const times = [...new Set(visualMoments.map((m) => Number(m.t)).filter((t) => Number.isFinite(t) && t >= 0 && t <= windowSeconds))].sort((a, b) => a - b);
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  return {
    count: times.length,
    medianGapSeconds: gaps.length ? Math.round(median(gaps) * 10) / 10 : null,
    perMinute: windowSeconds > 0 ? Math.round((times.length / windowSeconds) * 60 * 10) / 10 : 0,
  };
}

/** 캡처할 순간: 첫 15초를 먼저(최대 절반), 나머지는 고르게. 시간 순. */
export function pickFrameMoments(visualMoments = [], windowSeconds, max = MAX_FRAMES_PER_VIDEO) {
  const valid = visualMoments.filter((m) => Number.isFinite(Number(m.t)) && m.t >= 0 && m.t <= windowSeconds)
    .sort((a, b) => a.t - b.t)
    .filter((m, i, arr) => i === 0 || arr[i - 1].t !== m.t);
  if (valid.length <= max) return valid;
  const early = valid.filter((m) => m.t < FIRST_SECONDS).slice(0, Math.floor(max / 2));
  const rest = valid.filter((m) => !early.includes(m));
  const need = max - early.length;
  const spread = Array.from({length: need}, (_, i) => rest[Math.round((i * (rest.length - 1)) / Math.max(1, need - 1))]);
  return [...new Set([...early, ...spread])].sort((a, b) => a.t - b.t);
}

/** 연출 자료집: 모든 리포트의 화면 변화를 새 방식 배수 큰 영상부터 펼친다(옛 방식은 그 뒤, 서로 섞어 비교하지 않는다). 제작 단계에서 후보로 꺼내 쓴다. */
export function buildVisualLibrary(reports = []) {
  return [...reports]
    .sort((a, b) => ratioTier(a) - ratioTier(b) || (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0))
    .flatMap((r) => {
      const frameByT = new Map((r.frames || []).map((f) => [f.t, f.file]));
      return (r.analysis?.visualMoments || []).map((m) => ({
        videoId: r.videoId,
        title: r.meta?.title,
        channelTitle: r.meta?.channelTitle,
        outlierRatio: r.outlierRatio ?? null,
        ratioMethod: r.ratioMethod ?? null,
        ratioStatus: r.ratioStatus ?? null,
        ratioReason: r.ratioReason ?? null,
        source: r.source ?? null,
        studioFolds: r.studioFolds ?? null,
        teachesAdultEnglishSounds: r.analysis?.teachesAdultEnglishSounds ?? null,
        t: m.t,
        what: m.what,
        purpose: m.purpose,
        frame: frameByT.has(m.t) ? `data/youtube/outlier-frames/${r.videoId}/${frameByT.get(m.t)}` : null,
      }));
    });
}

export const REPORTS_PER_DAY = 2; // Gemini 무료 한도 안에서 영상 보기 호출을 하루 2번으로 둔다
export const CATCH_UP_REPORTS_PER_DAY = 6; // 예전 댓글·대본 리포트 영상을 따라잡는 동안만(2026-11-12 사용자 결정)

/** 매일 루프 대상 안에 예전 리포트만 있고 합친 리포트는 없는 영상이 남아 있으면 따라잡기 속도로 만든다. */
export function reportsPerDay({eligibleIds = [], oldReportIds = new Set()} = {}) {
  return eligibleIds.some((id) => oldReportIds.has(id)) ? CATCH_UP_REPORTS_PER_DAY : REPORTS_PER_DAY;
}

/** AI 판정 칸 정리: true/false만 받고 그 밖의 값·빠진 칸은 null(미판정). 이유는 글자로만 남긴다. 원본 객체는 바꾸지 않는다. */
export function normalizeTeachesAdultEnglishSounds(analysis = {}) {
  const a = {...(analysis || {})};
  a.teachesAdultEnglishSounds = typeof a.teachesAdultEnglishSounds === 'boolean' ? a.teachesAdultEnglishSounds : null;
  a.teachesAdultEnglishSoundsReason = typeof a.teachesAdultEnglishSoundsReason === 'string' ? a.teachesAdultEnglishSoundsReason.trim() : '';
  return a;
}

// ---- 새 관찰 칸 5개(2026-11-15): first3s, infoCount, captionStyle, audio, storytelling ----
// 칸이 없거나 모양이 틀리면 null. "없음"이라고 쓴 것은 그대로 남겨 "없다고 봤다"와 "값이 없다(null)"를 구분한다.
const isPlainObject = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const textOf = (v) => (typeof v === 'string' ? v.trim() : '');
const secondsOf = (v) => ((typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);
const boolOrNull = (v) => (typeof v === 'boolean' ? v : null);
const isNone = (what) => what.replace(/[\s.]/g, '') === '없음';
const pickOne = (v, allowed) => (allowed.includes(textOf(v)) ? textOf(v) : null);
const storyItem = (x) => {
  if (!isPlainObject(x)) return null;
  const what = textOf(x.what);
  return what ? {t: isNone(what) ? null : secondsOf(x.t), what, quote: isNone(what) ? '' : textOf(x.quote)} : null;
};
const storyList = (x) => (Array.isArray(x) ? x.map(storyItem).filter((i) => i && !isNone(i.what)) : null);

export function normalizeExtraObservations(analysis = {}) {
  const a = {...(analysis || {})};
  const f3 = isPlainObject(a.first3s) ? {what: textOf(a.first3s.what), quote: textOf(a.first3s.quote)} : null;
  a.first3s = f3 && f3.what ? f3 : null;

  if (isPlainObject(a.infoCount)) {
    const raw = a.infoCount.count;
    const count = (typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '')) && Number.isInteger(Number(raw)) && Number(raw) >= 0 ? Number(raw) : null;
    const description = textOf(a.infoCount.description);
    a.infoCount = count == null && !description ? null : {count, description, estimated: true}; // 모델이 센 값이라 항상 추정
  } else a.infoCount = null;

  if (isPlainObject(a.captionStyle)) {
    const c = a.captionStyle;
    const out = {position: textOf(c.position), size: pickOne(c.size, ['작음', '보통', '큼']), highlightColor: textOf(c.highlightColor), highlightMethod: textOf(c.highlightMethod), textAmount: textOf(c.textAmount), changeTiming: textOf(c.changeTiming)};
    a.captionStyle = Object.values(out).some((v) => v) ? out : null;
  } else a.captionStyle = null;

  if (isPlainObject(a.audio)) {
    const u = a.audio;
    const out = {hasMusic: boolOrNull(u.hasMusic), mood: textOf(u.mood), tempo: pickOne(u.tempo, ['느림', '보통', '빠름']), hasSoundEffects: boolOrNull(u.hasSoundEffects), soundEffectUse: textOf(u.soundEffectUse), voiceVsMusic: textOf(u.voiceVsMusic)};
    a.audio = out.hasMusic == null && out.hasSoundEffects == null && !out.mood && !out.tempo && !out.soundEffectUse && !out.voiceVsMusic ? null : out;
  } else a.audio = null;

  if (isPlainObject(a.storytelling)) {
    const s = a.storytelling;
    const hook = storyItem(s.hook);
    const cur = isPlainObject(s.curiosity) ? {opened: storyItem(s.curiosity.opened), resolved: storyItem(s.curiosity.resolved)} : null;
    const cz = isPlainObject(s.causality) ? {connected: boolOrNull(s.causality.connected), summary: textOf(s.causality.summary), examples: storyList(s.causality.examples) || []} : null;
    const out = {
      hook: hook ? {...hook, type: textOf(s.hook.type)} : null,
      curiosity: cur && (cur.opened || cur.resolved) ? cur : null,
      causality: cz && (cz.connected != null || cz.summary || cz.examples.length) ? cz : null,
      openLoops: storyList(s.openLoops),
      patternBreaks: storyList(s.patternBreaks),
      viewerActions: storyList(s.viewerActions),
      evidence: storyList(s.evidence),
      payoff: storyItem(s.payoff),
    };
    a.storytelling = out.hook || out.curiosity || out.causality || out.payoff || ['openLoops', 'patternBreaks', 'viewerActions', 'evidence'].some((k) => out[k] != null) ? out : null;
  } else a.storytelling = null;
  a.whyOutlierVsChannel = textOf(a.whyOutlierVsChannel) || null;
  return a;
}

/** 리포트에 같이 저장하는 새 배수 칸(peer-ratio.mjs가 만든다). 값이 없으면 null로 비우고 대신값을 넣지 않는다. */
export const RATIO_FIELD_NAMES = ['outlierRatio', 'ratioMethod', 'ratioStatus', 'ratioReason', 'ratioComputedAt', 'ratioDenominator', 'ratioPeerCount'];
export function ratioFieldsFromEntry(entry) {
  return Object.fromEntries(RATIO_FIELD_NAMES.map((k) => [k, entry?.[k] ?? null]));
}
/** market-demand.json 구조(byKeyword·trackedChannels의 topOutliers)에서 영상 ID로 배수 항목 전체를 찾는다. */
export function findRatioEntry(marketDemand, videoId) {
  const all = [...(marketDemand?.byKeyword || []), ...(marketDemand?.trackedChannels || [])].flatMap((x) => x.topOutliers || []);
  return all.find((o) => o.videoId === videoId) || null;
}

/**
 * 합친 리포트에서 시청자 고민 데이터(audience-dna.json)로 넘길 항목: 댓글 원문 인용이 확인된 것만(2026-11-12).
 * 예전 댓글 리포트는 인용 확인 없이 AI 요약을 넣었다. 우리 채널 영상은 경쟁 시청자 고민이 아니라 뺀다.
 */
export function audienceDnaEntriesFromReport(report) {
  if (String(report?.meta?.channelTitle || '').includes('이해하면 쉬운')) return [];
  // 성인에게 영어 소리를 가르치는 영상이 아니라고 판정된 영상(연예인 토크·동요·수능 등)의 댓글은 시청자 고민이 아니다(2026-11-15 감사 D: 고민 300개 중 84개가 이런 댓글). null·칸 없음(옛 리포트)은 미판정이라 지금처럼 보낸다.
  if (report?.analysis?.teachesAdultEnglishSounds === false) return [];
  const vr = report?.analysis?.viewerReaction || {};
  const pick = (list, field, type) => (list || []).filter((x) => x?.quoteVerified === true && String(x[field] || '').trim())
    .map((x) => ({type, text: String(x[field]).trim(), videoId: report.videoId, channelTitle: report.meta?.channelTitle || '', sourceType: 'outlierComment'}));
  return [...pick(vr.painPoints, 'pain', 'painPoint'), ...pick(vr.unanswered, 'question', 'question'), ...pick(vr.vocabulary, 'expression', 'vocabulary')];
}
/** Gemini 과부하(high demand·503)·한도(429)·네트워크 오류처럼 영상과 무관하고 곧 풀리는 실패인가(2026-11-13: 과부하로 실패한 2편이 7일 동안 쉬게 되던 문제). 이런 실패는 쉬기 기록을 남기지 않아 다음 날 다시 시도한다. */
export function isTransientReportError(message) {
  return /high demand|overloaded|temporarily|503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|quota|rate limit|fetch failed|ECONNRESET|ETIMEDOUT|timed? ?out/i.test(String(message || ''));
}
export const REPORT_FAILURE_COOLDOWN_DAYS = 7;
export const SAME_CHANNEL_COOLDOWN_DAYS = 7; // allow-literal: 설계안 4절 제안 값(같은 채널은 7일에 1편만)
export const RESEARCH_STAGE = 2; // allow-literal: 스튜디오 조사 2단계(조사 후보 우선, 비면 손입력 폴백)
const PEER_BASELINE_SAMPLE = 50; // allow-literal: market-demand.mjs VIDEOS_PER_CHANNEL_BASELINE과 통일
// 키워드 검색으로 들어온 아웃라이어에는 고양이 브이로그 같은 무관한 영상도 섞인다. 영어 학습과 관계있는 제목만 고른다.
const RELEVANT_TITLE_RE = /영어|영단어|english|발음|파닉스|phonics|단어|회화|듣기|리스닝|스피킹|문법|원어민|미드|읽는/i;

function pickLegacyMarketDemandCandidates({marketDemand = {}, existingIds = new Set(), excludeIds = new Set(), failures = {}, now = new Date()} = {}) {
  const blockedChannel = (ch) => ch?.status === 'blocked' || ch?.status === 'graduated';
  const blockedIds = new Set((marketDemand.trackedChannels || []).filter(blockedChannel).flatMap((ch) => (ch.topOutliers || []).map((o) => o.videoId)));
  const compareRatio = (a, b) => ratioTier(a) - ratioTier(b) || (Number(b.outlierRatio) || 0) - (Number(a.outlierRatio) || 0);
  const best = new Map();
  const add = (list) => {
    for (const o of list || []) {
      if (!o?.videoId || blockedIds.has(o.videoId)) continue;
      const cand = {
        videoId: o.videoId,
        outlierRatio: o.outlierRatio != null && Number.isFinite(Number(o.outlierRatio)) ? Number(o.outlierRatio) : null,
        ratioMethod: o.ratioMethod ?? null,
        ratioStatus: o.ratioStatus ?? null,
        title: o.title || '',
      };
      const prev = best.get(o.videoId);
      if (!prev || compareRatio(cand, prev) < 0) best.set(o.videoId, {...cand, title: cand.title || prev?.title || ''});
    }
  };
  for (const kw of marketDemand.byKeyword || []) add(kw.topOutliers);
  for (const ch of marketDemand.trackedChannels || []) if (!blockedChannel(ch)) add(ch.topOutliers);
  const cooldownMs = REPORT_FAILURE_COOLDOWN_DAYS * 86400000;
  return [...best.values()]
    .filter((o) => RELEVANT_TITLE_RE.test(o.title) && !existingIds.has(o.videoId) && !excludeIds.has(o.videoId))
    .filter((o) => {
      const failedAt = Date.parse(failures[o.videoId] || '');
      return !(Number.isFinite(failedAt) && now.getTime() - failedAt < cooldownMs);
    })
    .sort(compareRatio);
}

/**
 * 2단계 리포트 대상 선정(출처 포함):
 * - research(studio-research.json)가 있으면 조사 후보에서 롱폼 1편 + 쇼츠 1편 순으로 우선 선정한다.
 *   형식 안 정렬은 studioFolds 내림차순 → publishedAt 최근 순이며, 같은 채널은 7일에 1편만 고른다.
 * - 한 형식 후보가 비면 손입력 목록(marketDemand)으로 남은 자리를 채우되, 두 배수를 같은 정렬에 섞지 않는다.
 * - research가 없으면 기존 손입력 목록 로직 그대로 동작한다.
 */
export function pickReportTargetsDetailed({
  marketDemand = {},
  research = null,
  existingIds = new Set(),
  existingReports = [],
  failures = {},
  now = new Date(),
  limit = REPORTS_PER_DAY,
} = {}) {
  const candidatesObj = research?.candidates && typeof research.candidates === 'object' ? research.candidates : null;
  const rawResearch = candidatesObj ? Object.values(candidatesObj) : [];
  if (!rawResearch.length) {
    return pickLegacyMarketDemandCandidates({marketDemand, existingIds, failures, now})
      .slice(0, limit)
      .map((o) => ({videoId: o.videoId, source: 'market-demand', format: null, candidate: null}));
  }

  const nowMs = now.getTime();
  const failCooldownMs = REPORT_FAILURE_COOLDOWN_DAYS * 86400000;
  const chCooldownMs = SAME_CHANNEL_COOLDOWN_DAYS * 86400000;
  const blockedChannelIds = new Set(
    (marketDemand.trackedChannels || [])
      .filter((ch) => ch?.status === 'blocked' || ch?.status === 'graduated')
      .map((ch) => ch.channelId)
      .filter(Boolean),
  );
  const recentChannels = new Set();
  for (const r of existingReports || []) {
    const cid = r?.meta?.channelId;
    const at = Date.parse(r?.analyzedAt || '');
    if (cid && Number.isFinite(at) && nowMs - at < chCooldownMs) recentChannels.add(cid);
  }

  const compareResearch = (a, b) =>
    (Number(b.studioFolds) || 0) - (Number(a.studioFolds) || 0)
    || (Date.parse(b.publishedAt || '') || 0) - (Date.parse(a.publishedAt || '') || 0);

  const eligibleResearch = rawResearch.filter((c) => {
    if (!c?.videoId || existingIds.has(c.videoId)) return false;
    if (c.channelId && (blockedChannelIds.has(c.channelId) || recentChannels.has(c.channelId))) return false;
    const failedAt = Date.parse(failures[c.videoId] || '');
    if (Number.isFinite(failedAt) && nowMs - failedAt < failCooldownMs) return false;
    return c.format === 'LONGFORM' || c.format === 'SHORTS';
  });

  const pools = {
    LONGFORM: eligibleResearch.filter((c) => c.format === 'LONGFORM').sort(compareResearch),
    SHORTS: eligibleResearch.filter((c) => c.format === 'SHORTS').sort(compareResearch),
  };

  const picked = [];
  const usedIds = new Set();
  const usedChannels = new Set(recentChannels);
  const takeFrom = (fmt) => {
    const pool = pools[fmt];
    while (pool.length) {
      const c = pool.shift();
      if (usedIds.has(c.videoId)) continue;
      if (c.channelId && usedChannels.has(c.channelId)) continue;
      usedIds.add(c.videoId);
      if (c.channelId) usedChannels.add(c.channelId);
      picked.push({videoId: c.videoId, source: 'studio-research', format: fmt, candidate: c});
      return true;
    }
    return false;
  };

  // 2단계 기본값: 조사 후보에서 롱폼 1편 + 쇼츠 1편 번갈아 선택.
  // 한 형식이 비면 다른 형식으로 채우지 않고 2단계 규칙대로 손입력 목록(marketDemand) 폴백으로 넘긴다.
  const maxPairs = Number.isFinite(limit) ? Math.ceil(limit / 2) : Math.max(pools.LONGFORM.length, pools.SHORTS.length);
  for (let round = 0; round < maxPairs && picked.length < limit; round += 1) {
    let progressed = false;
    if (picked.length < limit && takeFrom('LONGFORM')) progressed = true;
    if (picked.length < limit && takeFrom('SHORTS')) progressed = true;
    if (!progressed) break;
  }

  if (picked.length < limit) {
    const fallback = pickLegacyMarketDemandCandidates({marketDemand, existingIds, excludeIds: usedIds, failures, now});
    for (const o of fallback) {
      if (picked.length >= limit) break;
      usedIds.add(o.videoId);
      picked.push({videoId: o.videoId, source: 'market-demand-fallback', format: null, candidate: null});
    }
  }
  return picked;
}

/** 매일 루프가 합친 리포트를 만들 경쟁 영상 ID 목록. research가 있으면 2단계(조사 후보 우선), 없으면 손입력 목록. */
export function pickReportTargets(opts = {}) {
  return pickReportTargetsDetailed(opts).map((x) => x.videoId);
}

/** 연출 자료집 검색: 화면 변화 설명·목적·영상 제목에 검색어가 모두 들어간 순간. 검색어가 비면 전부. */
export function searchVisualLibrary(library = [], query = '') {
  const words = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return library;
  return library.filter((e) => {
    const hay = `${e.what || ''} ${e.purpose || ''} ${e.title || ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export function loadReports(dir = reportsDir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch { return null; }
  }).filter(Boolean);
}

// ---------------- 바깥 호출(유튜브·Gemini·yt-dlp·ffmpeg) ----------------

function loadEnv() {
  const envPath = join(projectDir, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]]) continue;
    process.env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

const isoDurationSeconds = (iso) => {
  const m = String(iso || '').match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return (Number(m[1] || 0) * 86400) + (Number(m[2] || 0) * 3600) + (Number(m[3] || 0) * 60) + Number(m[4] || 0);
};

async function youtubeJson(path, params, key) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  url.search = new URLSearchParams({...params, key});
  const res = await fetch(url, {signal: AbortSignal.timeout(20000)});
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`YouTube ${path} ${res.status}: ${data?.error?.errors?.[0]?.reason || data?.error?.message || ''}`);
  return data;
}

async function fetchMeta(videoId, key) {
  const data = await youtubeJson('videos', {part: 'snippet,statistics,contentDetails', id: videoId}, key);
  const item = data.items?.[0];
  if (!item) throw new Error(`영상(${videoId})을 찾을 수 없습니다`);
  return buildMeta(videoId, item);
}

/** videos.list 항목(snippet·statistics·contentDetails)에서 리포트의 meta를 만든다. 순수 함수라 시험한다. */
export function buildMeta(videoId, item) {
  const th = item.snippet.thumbnails || {};
  return {
    videoId,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    viewCount: Number(item.statistics.viewCount || 0),
    likeCount: Number(item.statistics.likeCount || 0),
    commentCount: Number(item.statistics.commentCount || 0),
    durationSeconds: isoDurationSeconds(item.contentDetails?.duration),
    thumbnail: (th.maxres || th.high || th.medium || th.default || {}).url || null,
    // 설명글과 태그(2026-11-13): 비교 시트의 "설명글·태그·고정 댓글" 칸이 경쟁 쪽 값으로 그대로 보여 준다. 태그를 안 단 영상은 빈 목록.
    description: item.snippet.description || '',
    tags: Array.isArray(item.snippet.tags) ? item.snippet.tags : [],
  };
}

async function fetchSubscribers(channelId, key) {
  try {
    const data = await youtubeJson('channels', {part: 'statistics', id: channelId}, key);
    const s = data.items?.[0]?.statistics;
    return s && !s.hiddenSubscriberCount ? Number(s.subscriberCount) : null;
  } catch { return null; }
}

async function fetchTopComments(videoId, key) {
  try {
    const data = await youtubeJson('commentThreads', {part: 'snippet', videoId, order: 'relevance', maxResults: '100', textFormat: 'plainText'}, key);
    return (data.items || []).map((it) => {
      const s = it.snippet.topLevelComment.snippet;
      return {text: s.textDisplay, likeCount: s.likeCount, publishedAt: s.publishedAt};
    });
  } catch (err) {
    return {error: err.message};
  }
}

async function fetchTranscript(videoId) {
  try {
    const {stdout} = await execFileAsync('python', [join(projectDir, 'scripts', 'extract-transcript.py'), videoId], {timeout: 60000, maxBuffer: 20 * 1024 * 1024});
    const data = JSON.parse(stdout.trim());
    return data.ok ? {lines: data.lines || [], fullText: data.fullText || '', language: data.language} : {error: data.error || '자막 없음'};
  } catch (err) {
    let reason = err.message;
    try { reason = JSON.parse(String(err.stdout || '').trim()).error || reason; } catch { /* stdout이 JSON이 아님 */ }
    return {error: String(reason).slice(0, 300)};
  }
}

// ---------------- 한국어 말투 측정(2026-11-15) ----------------
// 리포트에 speech 칸을 더한다(Gemini 호출·프롬프트는 그대로). 자막을 받은 날은 그 글로 재서 추가 요청이 0이다.
// 자막이 막히거나 없는 날만 그 영상 한 편의 소리를 받아 whisper로 받아쓴다. 유튜브가 이 PC의 요청을 막은 적이 있어(2026-11-15 IpBlocked) 요청을 늘리지 않는다.
export const SPEECH_FALLBACK_PER_DAY = 2; // 대체 경로(소리 받기+받아쓰기)는 하루 최대 2편(2026-11-15 사용자 지시)
export const SPEECH_FALLBACK_GAP_MS = 9000; // 대체 경로 영상 사이 최소 쉬는 시간(9초 이상, 2026-11-15 사용자 지시)
export const SPEECH_BLOCK_RE = /HTTP Error 429|Too Many Requests|confirm you.?re not a bot|IpBlocked|RequestBlocked|blocking requests|HTTP Error 403|rate.?limit/i;
export const speechPatternsPath = join(projectDir, 'data', 'youtube', 'speech-patterns.json');
/** 같은 프로세스에서 대체 경로를 마지막으로 끝낸 시각(ms). 영상 사이 쉬는 시간을 재는 데 쓴다. */
export const speechFallbackState = {lastAt: null};

export function isSpeechBlockSignal(message) { return SPEECH_BLOCK_RE.test(String(message || '')); }

/** 쇼츠/롱폼. 스튜디오 조사·유튜브 공식 쇼츠 목록(knownIsShort)을 최우선 쓰고, 다음은 경쟁 영상 표(ratioEntry.isShort), 없으면 길이 60초 이하. */
export function speechKindOf(durationSeconds, ratioEntry = null, knownIsShort = null) {
  if (knownIsShort === true) return 'short';
  if (knownIsShort === false) return 'long';
  if (ratioEntry?.isShort === true) return 'short';
  if (ratioEntry?.isShort === false) return 'long';
  const d = Number(durationSeconds);
  return Number.isFinite(d) && d > 0 && d <= 60 ? 'short' : 'long'; // allow-literal: market-demand.mjs의 쇼츠 판정과 같은 60초
}

const localDay = (value) => new Date(value).toLocaleDateString('en-CA');
/** 오늘 대체 경로를 몇 편 시도했는지, 오늘 차단 신호가 있었는지. 저장된 리포트의 speech 칸에서 센다(별도 상태 파일 없음). */
export function speechFallbackBudget(reports = [], now = new Date()) {
  const today = localDay(now);
  const todays = reports.filter((r) => r?.speech?.fallbackTried && r.speech.computedAt && localDay(r.speech.computedAt) === today);
  const used = todays.length;
  return {used, limit: SPEECH_FALLBACK_PER_DAY, remaining: Math.max(0, SPEECH_FALLBACK_PER_DAY - used), blocked: todays.some((r) => r.speech.blocked)};
}

/** 자막에서 말투를 잴 글. 롱폼은 앞 5분(소리 받아쓰기와 같은 범위)만 쓴다. 쇼츠는 전체. */
export function speechTextFromTranscript(transcript = {}, kind = 'long') {
  if (transcript.error) return '';
  const lines = Array.isArray(transcript.lines) ? transcript.lines : [];
  if (kind === 'long' && lines.length && lines.every((l) => Number.isFinite(Number(l.start)))) {
    return lines.filter((l) => Number(l.start) < LONG_VIDEO_WINDOW_SECONDS).map((l) => l.text).join(' ');
  }
  return String(transcript.fullText || lines.map((l) => l.text).join(' ') || '');
}

/**
 * 리포트의 speech 칸 하나를 만든다. 대체 경로(fallback)와 sleep은 바깥에서 주입한다(시험에서 가짜로 바꿈).
 * fallback({videoId, kind}) → 받아쓴 글(문자열). 던지면 실패로 기록하고, 차단 신호면 그날 더 쓰지 않도록 blocked를 남긴다.
 * 이 함수는 리포트 생성을 막지 않는다(대체 경로의 오류를 삼킨다).
 */
export async function resolveSpeechField({videoId, kind, transcript = {}, reports = [], now = new Date(), fallback = null, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), state = speechFallbackState, nowMs = () => Date.now()} = {}) {
  const text = speechTextFromTranscript(transcript, kind);
  if (text) return buildSpeechField({text, source: 'transcript-api', kind, now});
  const why = transcript.error ? '자막을 못 받음' : '자막이 비어 있음';
  if (!fallback) return buildSpeechField({kind, now, note: `${why}, 대체 경로 없음`});
  const budget = speechFallbackBudget(reports, now);
  if (budget.blocked) return buildSpeechField({kind, now, note: `${why}, 오늘 차단 신호가 있어 대체 경로를 쓰지 않음`});
  if (budget.remaining <= 0) return buildSpeechField({kind, now, note: `${why}, 대체 경로 하루 상한(${budget.limit}편)에 도달`});
  if (state.lastAt != null) {
    const wait = SPEECH_FALLBACK_GAP_MS - (nowMs() - state.lastAt);
    if (wait > 0) await sleep(wait);
  }
  try {
    const spoken = await fallback({videoId, kind});
    return buildSpeechField({text: spoken, source: 'whisper-small', kind, now, note: spoken && String(spoken).trim() ? null : '받아쓰기 결과가 비어 있음', extra: {fallbackTried: true}});
  } catch (err) {
    const message = String(err?.message || err).slice(0, 300);
    return buildSpeechField({kind, now, note: `${why}, 받아쓰기 실패: ${message}`, extra: {fallbackTried: true, ...(isSpeechBlockSignal(message) ? {blocked: true} : {})}});
  } finally {
    state.lastAt = nowMs();
  }
}

/** whisper.cpp(.whisper 폴더)로 소리 파일 하나를 한국어로 받아쓴다. 받아쓴 글만 돌려주고 파일은 부른 쪽이 지운다. */
export async function transcribeWithWhisper(wavPath, outBase, {whisperDir = join(projectDir, '.whisper'), timeout = 900000} = {}) {
  await execFileAsync(join(whisperDir, 'main.exe'), ['-m', join(whisperDir, 'ggml-small.bin'), '-l', 'ko', '-f', wavPath, '-otxt', '-of', outBase, '-nt', '-np'], {timeout, maxBuffer: 20 * 1024 * 1024});
  return readFileSync(`${outBase}.txt`, 'utf8');
}

/** 실제 대체 경로: 그 영상의 소리 하나만 받아(쇼츠 전체, 롱폼 앞 5분) 받아쓴다. 임시 폴더는 끝나면 지운다. */
export async function whisperSpeechFallback({videoId, kind}) {
  const ytDlp = await resolveYtDlp();
  if (!ytDlp) throw new Error('yt-dlp가 이 PC에 없음');
  const work = mkdtempSync(join(tmpdir(), 'speech-'));
  try {
    const post = `ffmpeg:-ar 16000 -ac 1${kind === 'long' ? ` -t ${LONG_VIDEO_WINDOW_SECONDS}` : ''}`;
    try {
      await execFileAsync(ytDlp[0], [...ytDlp.slice(1), '-q', '--no-warnings', '-f', 'bestaudio', '-x', '--audio-format', 'wav', '--postprocessor-args', post, '-o', join(work, 'a.%(ext)s'), `https://www.youtube.com/watch?v=${videoId}`], {timeout: 300000, maxBuffer: 10 * 1024 * 1024});
    } catch (err) {
      throw new Error(`${ytDlpErrorText(err)} ${String(err?.stderr || '').slice(0, 200)}`.trim());
    }
    const wav = join(work, 'a.wav');
    if (!existsSync(wav)) throw new Error('소리 파일을 받지 못함');
    return await transcribeWithWhisper(wav, join(work, 'out'));
  } finally {
    rmSync(work, {recursive: true, force: true});
  }
}

/** 저장된 리포트의 speech 칸으로 경쟁 말투 합계를 다시 계산해 data/youtube/speech-patterns.json에 쓴다. */
export function writeSpeechPatternsFile({reports = loadReports(), path = speechPatternsPath, now = new Date()} = {}) {
  const patterns = buildSpeechPatterns(reports, now);
  mkdirSync(dirname(path), {recursive: true});
  writeFileSync(path, `${JSON.stringify(patterns, null, 2)}\n`, 'utf8');
  return patterns;
}

async function fetchThumbnailBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {signal: AbortSignal.timeout(20000)});
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer()).toString('base64');
  } catch { return null; }
}

async function callGemini({videoId, windowSeconds, thumbnailBase64, prompt, geminiKey}) {
  const parts = [
    {file_data: {file_uri: `https://www.youtube.com/watch?v=${videoId}`}, video_metadata: {start_offset: '0s', end_offset: `${windowSeconds}s`}},
  ];
  if (thumbnailBase64) parts.push({inline_data: {mime_type: 'image/jpeg', data: thumbnailBase64}});
  parts.push({text: prompt});
  let lastError = null;
  for (const model of GEMINI_TEXT_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        signal: AbortSignal.timeout(300000),
        body: JSON.stringify({contents: [{parts}], generationConfig: {temperature: 0.2, responseMimeType: 'application/json'}}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `Gemini ${res.status}`);
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      if (!text) throw new Error('Gemini가 빈 응답을 돌려줌');
      const json = unwrapAnalysis(JSON.parse((text.match(/```json\s*([\s\S]+?)\s*```/) || [null, text])[1].trim()));
      return {model, analysis: json, usage: data.usageMetadata || null};
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(`Gemini 리포트 분석 실패: ${lastError?.message || '알 수 없음'}`);
}

/**
 * 영상 앞부분을 잠깐 받아서 (1) ffmpeg 장면 전환 감지로 컷 시각을 코드가 직접 재고,
 * (2) 고른 순간마다 그 시각부터 1초 간격 3장을 이어 붙인 띠를 만든다(AI 시각이 1~2초 어긋나도 전환이 띠 안에 들어오게).
 * 받은 영상은 끝나면 지운다.
 */
let ytDlpCommand; // undefined = 아직 안 찾음, null = 없음
/** yt-dlp 실행 방법을 찾는다. 명령이 없으면 파이썬 모듈로 부른다. install이면 없을 때 pip로 설치를 시도한다. */
export async function resolveYtDlp({install = false} = {}) {
  if (ytDlpCommand) return ytDlpCommand;
  const tries = [['yt-dlp'], ['python', '-m', 'yt_dlp'], ['py', '-m', 'yt_dlp']];
  for (const cmd of tries) {
    try {
      await execFileAsync(cmd[0], [...cmd.slice(1), '--version'], {timeout: 30000});
      ytDlpCommand = cmd;
      return cmd;
    } catch { /* 다음 방법 */ }
  }
  if (install) {
    try {
      await execFileAsync('python', ['-m', 'pip', 'install', '--user', '-U', 'yt-dlp'], {timeout: 300000, maxBuffer: 20 * 1024 * 1024});
      return resolveYtDlp({install: false});
    } catch { /* 설치 실패 */ }
  }
  ytDlpCommand = null;
  return null;
}

/** 컷마다 프레임 한 장의 파일 이름(2026-11-12: 컷을 글자가 아니라 이미지로 비교한다). */
export const CUT_FRAME_HEIGHT = 480; // 컷 프레임 높이(px). 300px는 글자를 읽을 수 없었다(2026-11-12 사용자)

export function cutFrameName(index) {
  return `cut-${String(index).padStart(2, '0')}.jpg`;
}

/** 컷 시각은 저장돼 있는데 이 PC에 프레임이 없는 컷 번호. */
export function missingCutFrames(report, exists = (rel) => existsSync(join(projectDir, rel))) {
  const times = Array.isArray(report?.pacing?.times) ? report.pacing.times : [];
  return times.map((_, i) => i).filter((i) => !exists(`data/youtube/outlier-frames/${report.videoId}/${cutFrameName(i)}`));
}

/**
 * 캡처 시작 초를 실제로 받은 영상 안으로 당긴다(1초 이상 남게). 순간은 반올림된 길이(16초)로 고르는데
 * 받은 파일은 15.0초일 수 있어, 끝에 걸린 순간은 ffmpeg가 빈 화면으로 실패하고 그 영상의 캡처 전체를 잃었다
 * (2026-11-23 bFq3ieCIqbI, 15초 지점). 길이를 모르면 예전처럼 그대로 쓴다.
 */
export function clampFrameSecond(t, clipSeconds) {
  const s = Math.max(0, Math.floor(Number(t) || 0));
  if (!Number.isFinite(clipSeconds) || clipSeconds <= 0) return s;
  return Math.min(s, Math.max(0, Math.floor(clipSeconds - 1)));
}

async function probeSeconds(file) {
  try {
    const {stdout} = await execFileAsync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], {timeout: 30000});
    return Number.parseFloat(stdout);
  } catch { return Number.NaN; }
}

async function processClip(videoId, moments, windowSeconds, {detectCuts = true, knownCutTimes = null, cutFrameIndexes = null} = {}) {
  const work = mkdtempSync(join(tmpdir(), 'outlier-frames-'));
  try {
    const ytDlp = await resolveYtDlp();
    if (!ytDlp) throw new Error('yt-dlp가 이 PC에 없음(npm run outlier-frames가 설치를 시도한다)');
    const section = `*0-${Math.ceil(windowSeconds) + 3}`;
    await execFileAsync(ytDlp[0], [...ytDlp.slice(1), '-q', '--no-warnings', '--download-sections', section, '-f', 'bv*[height<=480][ext=mp4]/b[height<=480]/b', '-o', join(work, 'v.%(ext)s'), `https://www.youtube.com/watch?v=${videoId}`], {timeout: 300000, maxBuffer: 10 * 1024 * 1024});
    const video = readdirSync(work).find((f) => f.startsWith('v.'));
    if (!video) throw new Error('영상 파일을 받지 못함');
    let cuts = null;
    if (detectCuts) try {
      const {stderr} = await execFileAsync('ffmpeg', ['-hide_banner', '-i', join(work, video), '-t', String(windowSeconds), '-vf', "select='gt(scene,0.3)',showinfo", '-an', '-f', 'null', '-'], {timeout: 180000, maxBuffer: 50 * 1024 * 1024});
      cuts = parseSceneTimes(stderr);
    } catch (err) {
      cuts = err.stderr ? parseSceneTimes(err.stderr) : null;
    }
    const outDir = join(framesDir, videoId);
    mkdirSync(outDir, {recursive: true});
    // 컷 프레임: 새로 잰 컷이면 전부, 이미 저장된 시각이면 빠진 번호만(컷이 일어난 직후 0.3초 지점)
    const cutTimesNow = cuts || knownCutTimes || [];
    const wantIdx = cuts ? cutTimesNow.map((_, i) => i) : (cutFrameIndexes || []);
    for (const i of wantIdx) {
      const t = Math.max(0, Number(cutTimesNow[i]) + 0.3);
      if (!Number.isFinite(t)) continue;
      await execFileAsync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(t), '-i', join(work, video), '-frames:v', '1', '-vf', `scale=-2:${CUT_FRAME_HEIGHT}`, '-q:v', '3', join(outDir, cutFrameName(i))], {timeout: 60000}).catch(() => {});
    }
    const frames = [];
    const clipSeconds = await probeSeconds(join(work, video));
    const madeFiles = new Set();
    for (const m of moments) {
      const t = clampFrameSecond(m.t, clipSeconds);
      const file = `${t}.jpg`;
      if (madeFiles.has(file)) continue;
      madeFiles.add(file);
      await execFileAsync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(t), '-t', '3', '-i', join(work, video), '-vf', 'fps=1,scale=-2:240,tile=3x1', '-frames:v', '1', '-q:v', '5', join(outDir, file)], {timeout: 60000});
      if (existsSync(join(outDir, file))) frames.push({t: t === Math.max(0, Math.floor(m.t)) ? m.t : t, file});
    }
    return {frames, cuts, error: null};
  } catch (err) {
    return {frames: [], cuts: null, error: ytDlpErrorText(err).slice(0, 300)};
  } finally {
    rmSync(work, {recursive: true, force: true});
  }
}

/**
 * 리포트에 적힌 캡처 중 이 PC 디스크에 없는 순간(2026-11-12 사용자: 다른 PC에서도 작업한다).
 * 캡처는 리포트의 시각만 있으면 똑같이 다시 만들 수 있어서 깃에 올리지 않고 각 PC가 만든다.
 */
export function missingFrames(report, exists = (rel) => existsSync(join(projectDir, rel))) {
  const listed = report?.frames || [];
  if (listed.length) return listed.filter((f) => !exists(`data/youtube/outlier-frames/${report.videoId}/${f.file}`)).map((f) => ({t: f.t}));
  return pickFrameMoments(report?.analysis?.visualMoments || [], report?.windowSeconds ?? LONG_VIDEO_WINDOW_SECONDS).map((m) => ({t: m.t}));
}

/** 빠진 캡처를 다시 만든다. Gemini는 부르지 않고 영상 앞부분만 잠깐 받아 자른다. */
/** 영상에서 잰 컷 횟수는 있는데 컷 시각이 저장 안 된 예전 리포트(2026-11-12 이전). 비교 시트가 컷 리듬을 시간 막대로 비교하려면 시각이 필요하다. */
export function needsCutTimes(report) {
  const p = report?.pacing;
  return Boolean(p && String(p.source || '').startsWith('ffmpeg') && !Array.isArray(p.times));
}

/** 영상이 내려갔거나 비공개·제한이라 yt-dlp가 못 받는 경우의 오류인가(2026-11-13: ZGFuGU1e3i8이 매일 밤 루프를 실패로 만들었다). 네트워크 오류 같은 일시적인 것은 아니다. */
export function isVideoUnavailableError(message) {
  return /This video is not available|Video unavailable|Private video|This video has been removed|This video is no longer available|members-only|Sign in to confirm your age/i.test(String(message || ''));
}

/** yt-dlp 실패의 진짜 이유. 오류 메시지는 명령어 전체가 앞에 붙어 잘리므로 stderr의 ERROR 줄을 먼저 쓴다. */
export function ytDlpErrorText(err) {
  const line = String(err?.stderr || '').split(/\r?\n/).find((l) => l.startsWith('ERROR:'));
  return line ? line.trim() : String(err?.message || err);
}

export const FRAMES_RETRY_PAUSE_DAYS = 7;

/** 받을 수 없다고 기록된 지 7일이 안 됐으면 다시 시도하지 않는다. 7일 뒤엔 다시 시도하니 일시적 제한이면 스스로 풀린다. */
export function framesRetryPaused(report, now = Date.now()) {
  const at = Date.parse(report?.framesUnavailableAt || '');
  if (!Number.isFinite(at)) return false;
  return now - at < FRAMES_RETRY_PAUSE_DAYS * 86400000;
}

export async function ensureReportFrames(report) {
  const missing = missingFrames(report);
  const needCuts = needsCutTimes(report);
  const missingCuts = missingCutFrames(report);
  if (!missing.length && !needCuts && !missingCuts.length) return {videoId: report.videoId, made: 0, error: null};
  const result = await processClip(report.videoId, missing, report.windowSeconds ?? LONG_VIDEO_WINDOW_SECONDS, {detectCuts: needCuts, knownCutTimes: report.pacing?.times || null, cutFrameIndexes: missingCuts});
  const saveFrames = !report.frames?.length && result.frames.length;
  const saveCuts = needCuts && Array.isArray(result.cuts);
  if (saveFrames || saveCuts) {
    const path = join(reportsDir, `${report.videoId}.json`);
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    if (saveFrames) {
      // 처음 분석 때 캡처를 못 만든 리포트는 이번에 만든 목록을 리포트에 적어 둔다(다음 PC가 같은 순간을 만들게).
      saved.frames = result.frames;
      saved.framesError = null;
    }
    if (saveCuts) saved.pacing = {...saved.pacing, times: result.cuts};
    writeFileSync(path, `${JSON.stringify(saved, null, 2)}\n`, 'utf8');
  }
  // 영상을 받을 수 없는 것이 확인되면 그 사실과 시각을 리포트에 적어 둔다(다음 7일은 다시 시도하지 않는다).
  if (result.error && isVideoUnavailableError(result.error) && !result.frames.length) {
    const path = join(reportsDir, `${report.videoId}.json`);
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    saved.framesUnavailableAt = new Date().toISOString();
    writeFileSync(path, `${JSON.stringify(saved, null, 2)}\n`, 'utf8');
    return {videoId: report.videoId, made: 0, error: null, unavailable: true};
  }
  return {videoId: report.videoId, made: result.frames.length, error: result.error};
}

export async function ensureAllFrames({install = false} = {}) {
  const reports = loadReports();
  const pending = reports.filter((r) => !framesRetryPaused(r) && (missingFrames(r).length || needsCutTimes(r) || missingCutFrames(r).length));
  if (!pending.length) return {total: reports.length, pending: 0, made: 0, failed: [], unavailable: []};
  if (!(await resolveYtDlp({install}))) return {total: reports.length, pending: pending.length, made: 0, failed: [{videoId: '*', error: 'yt-dlp가 이 PC에 없고 설치도 못 함'}]};
  let made = 0;
  const failed = [];
  const unavailable = [];
  for (const r of pending) {
    const res = await ensureReportFrames(r);
    made += res.made;
    if (res.unavailable) unavailable.push(r.videoId);
    else if (res.error) failed.push({videoId: r.videoId, error: res.error});
  }
  return {total: reports.length, pending: pending.length, made, failed, unavailable};
}

function findRatioEntryOnDisk(videoId) {
  try {
    return findRatioEntry(JSON.parse(readFileSync(join(projectDir, 'data', 'youtube', 'market-demand.json'), 'utf8')), videoId);
  } catch { return null; }
}

function findResearchCandidateOnDisk(videoId) {
  try {
    const sr = JSON.parse(readFileSync(join(projectDir, 'data', 'youtube', 'studio-research.json'), 'utf8'));
    return sr?.candidates?.[videoId] || null;
  } catch { return null; }
}

/**
 * 채널 최근 업로드 50편(UU + UUSH 플레이리스트, 약 3단위)을 받아 우리 배수(peer-median-views-v2)와
 * 같은 채널·같은 형식 평소 영상 대조군(channelPeers)을 함께 구한다(2026-11-22 대조군 추가).
 */
async function fetchChannelPeerContext(meta, ytKey, {knownFormat = null, now = new Date()} = {}) {
  const channelId = meta?.channelId;
  if (!channelId || !channelId.startsWith('UC')) {
    return {
      ratioFields: ratioFieldsFromEntry({ratioMethod: RATIO_METHOD, ratioStatus: 'hold', ratioReason: '채널 ID가 없어 API 배수 계산 보류', ratioComputedAt: now.toISOString()}),
      channelPeers: [],
    };
  }
  try {
    const uploadsId = `UU${channelId.slice(2)}`;
    const shortsId = `UUSH${channelId.slice(2)}`;
    const [upData, shData] = await Promise.all([
      youtubeJson('playlistItems', {part: 'contentDetails', playlistId: uploadsId, maxResults: String(PEER_BASELINE_SAMPLE)}, ytKey),
      youtubeJson('playlistItems', {part: 'contentDetails', playlistId: shortsId, maxResults: String(PEER_BASELINE_SAMPLE)}, ytKey).catch(() => ({items: []})),
    ]);
    const shortsIds = new Set((shData.items || []).map((it) => it.contentDetails?.videoId).filter(Boolean));
    const recentIds = [...new Set((upData.items || []).map((it) => it.contentDetails?.videoId).filter(Boolean))].slice(0, PEER_BASELINE_SAMPLE);
    if (!recentIds.length) {
      return {
        ratioFields: ratioFieldsFromEntry({ratioMethod: RATIO_METHOD, ratioStatus: 'hold', ratioReason: '채널 최근 업로드 목록이 비어 있어 판정 보류', ratioComputedAt: now.toISOString()}),
        channelPeers: [],
      };
    }
    const vidData = await youtubeJson('videos', {part: 'snippet,statistics,contentDetails', id: recentIds.join(',')}, ytKey);
    const channelVideos = (vidData.items || []).map((it) => {
      const dur = isoDurationSeconds(it.contentDetails?.duration);
      return {
        videoId: it.id,
        title: it.snippet?.title || '',
        viewCount: Number(it.statistics?.viewCount ?? NaN),
        publishedAt: it.snippet?.publishedAt,
        durationSeconds: dur,
        isShort: dur != null ? dur <= 60 || shortsIds.has(it.id) : (shortsIds.has(it.id) ? true : null),
      };
    });
    const isShort = knownFormat === 'SHORTS'
      ? true
      : knownFormat === 'LONGFORM'
        ? false
        : (meta.durationSeconds != null ? meta.durationSeconds <= 60 || shortsIds.has(meta.videoId) : (shortsIds.has(meta.videoId) ? true : null));
    const computed = computePeerRatio({
      video: {videoId: meta.videoId, viewCount: meta.viewCount, publishedAt: meta.publishedAt, isShort},
      channelVideos,
      now,
    });
    const channelPeers = selectContrastPeers(channelVideos, {videoId: meta.videoId, viewCount: meta.viewCount, isShort});
    return {ratioFields: ratioFieldsFromEntry(computed), channelPeers, isShort};
  } catch (err) {
    return {
      ratioFields: ratioFieldsFromEntry({
        ratioMethod: RATIO_METHOD,
        ratioStatus: 'hold',
        ratioReason: `API 배수 계산 실패: ${String(err?.message || err).slice(0, 120)}`,
        ratioComputedAt: now.toISOString(),
      }),
      channelPeers: [],
      isShort: knownFormat === 'SHORTS' ? true : knownFormat === 'LONGFORM' ? false : null,
    };
  }
}

export async function analyzeOutlierVideo(videoId, {withFrames = true, speechFallback = whisperSpeechFallback, researchCandidate = undefined} = {}) {
  if (!VIDEO_ID_RE.test(videoId)) throw new Error(`영상 ID 형식이 아님: ${videoId}`);
  loadEnv();
  const ytKey = process.env.YOUTUBE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!ytKey || !geminiKey) throw new Error('.env에 YOUTUBE_API_KEY와 GEMINI_API_KEY가 필요합니다');

  const meta = await fetchMeta(videoId, ytKey);
  const candidate = researchCandidate !== undefined ? researchCandidate : findResearchCandidateOnDisk(videoId);
  const ratioEntry = findRatioEntryOnDisk(videoId);
  const needApiRatio = !ratioEntry || ratioTier(ratioEntry) !== 0;
  const [subscriberCount, transcript, comments, thumbnailBase64, peerContext] = await Promise.all([
    fetchSubscribers(meta.channelId, ytKey),
    fetchTranscript(videoId),
    fetchTopComments(videoId, ytKey),
    fetchThumbnailBase64(meta.thumbnail),
    fetchChannelPeerContext(meta, ytKey, {knownFormat: candidate?.format || null}),
  ]);
  const apiRatioFields = needApiRatio ? peerContext.ratioFields : null;
  const channelPeers = peerContext.channelPeers || [];
  const commentList = Array.isArray(comments) ? comments : [];
  const windowSeconds = analysisWindowSeconds(meta.durationSeconds);
  const ratioFields = apiRatioFields || ratioFieldsFromEntry(ratioEntry);
  // AI에게는 새 방식으로 계산된 배수만 알려 준다(옛 방식 값·측정 중·보류는 말하지 않는다).
  const prompt = buildReportPrompt({meta, subscriberCount, outlierRatio: comparableRatioOrNull(ratioFields), transcriptLines: transcript.lines || null, comments: commentList, windowSeconds, channelPeers});
  const {model, analysis: raw, usage} = await callGemini({videoId, windowSeconds, thumbnailBase64, prompt, geminiKey});

  raw.visualMoments = (raw.visualMoments || []).filter((m) => Number.isFinite(Number(m.t)) && m.t >= 0 && m.t <= windowSeconds).map((m) => ({...m, t: Number(m.t)}));
  const {analysis: verified, summary} = verifyQuotes(normalizeExtraObservations(raw),{title: meta.title, transcriptText: transcript.fullText ?? null, commentTexts: commentList.map((c) => c.text)});
  const analysis = normalizeTeachesAdultEnglishSounds(verified);
  // 말투 측정(2026-11-15): Gemini 호출이 성공한 뒤에만 한다(실패한 날 소리를 받지 않게). 말투를 못 재도 리포트는 만든다.
  const speechKind = speechKindOf(meta.durationSeconds, ratioEntry, peerContext.isShort);
  const speech = await resolveSpeechField({videoId, kind: speechKind, transcript, reports: loadReports(), fallback: speechFallback})
    .catch((err) => buildSpeechField({kind: speechKind, note: `말투 측정 오류: ${String(err?.message || err).slice(0, 200)}`}));
  const captured = withFrames ? await processClip(videoId, pickFrameMoments(analysis.visualMoments, windowSeconds), windowSeconds) : {frames: [], cuts: null, error: '캡처 안 함'};
  // 컷 간격은 영상에서 코드가 직접 잰 장면 전환을 먼저 쓴다. 영상을 못 받았을 때만 AI가 적은 화면 변화로 대신하고, 출처를 남긴다.
  const pacing = captured.cuts
    ? {...computePacing(captured.cuts.map((t) => ({t})), windowSeconds), times: captured.cuts, source: 'ffmpeg 장면 전환 감지(코드)'}
    : {...computePacing(analysis.visualMoments, windowSeconds), source: 'AI가 적은 화면 변화(영상을 못 받아 대신 씀)'};

  const report = {
    schemaVersion: 1,
    videoId,
    analyzedAt: new Date().toISOString(),
    model,
    windowSeconds,
    meta,
    subscriberCount,
    viewsPerSubscriber: subscriberCount ? Math.round((meta.viewCount / subscriberCount) * 100) / 100 : null,
    ...ratioFields,
    ...(channelPeers.length ? {channelPeers} : {}),
    ...(candidate ? {
      source: 'studio-research',
      studioFolds: candidate.studioFolds ?? null,
      studioSeenAt: candidate.lastSeenAt || candidate.firstSeenAt || null,
      outlierRatioBasis: apiRatioFields ? 'api-channel-recent-50-v2' : 'market-demand-v2',
    } : (apiRatioFields ? {outlierRatioBasis: 'api-channel-recent-50-v2'} : {})),
    sources: {
      transcript: transcript.error ? {ok: false, error: transcript.error} : {ok: true, lines: transcript.lines.length, language: transcript.language},
      comments: Array.isArray(comments) ? {ok: true, count: commentList.length} : {ok: false, error: comments.error},
      thumbnail: Boolean(thumbnailBase64),
      video: {analyzedSeconds: windowSeconds},
    },
    speech,
    analysis,
    quoteCheck: summary,
    pacing,
    frames: captured.frames,
    framesError: captured.error,
    usage,
  };
  mkdirSync(reportsDir, {recursive: true});
  writeFileSync(join(reportsDir, `${videoId}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  try { writeSpeechPatternsFile(); } catch { /* 합계는 다음 리포트 때 다시 만들어진다 */ }
  // 시청자 고민 데이터는 이제 이 리포트가 채운다(예전 댓글 리포트 대신). 인용이 확인된 댓글만 넘긴다.
  const dnaEntries = audienceDnaEntriesFromReport(report);
  report.audienceDnaNew = upsertAudienceDnaFile(join(projectDir, 'data', 'youtube', 'audience-dna.json'), dnaEntries);
  report.audienceDnaSent = dnaEntries.length;
  return report;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv.includes('--ensure-frames')) {
  // 빠진 캡처 채우기: npm run outlier-frames (세션 시작 훅·매일 루프가 자동으로 부른다)
  const result = await ensureAllFrames({install: process.argv.includes('--install')});
  console.log(`캡처 확인: 리포트 ${result.total}편 중 캡처가 빠진 편 ${result.pending}편, 새로 만든 캡처 ${result.made}장${result.failed.length ? `, 실패 ${result.failed.map((f) => `${f.videoId}(${f.error})`).join(', ')}` : ''}`);
  if (result.failed.length && !result.made) process.exitCode = 1;
} else if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv.includes('--library')) {
  // 연출 자료집 검색: npm run visual-library -- 검색어 (제작 단계에서 화면 구성 후보를 꺼낼 때)
  const query = process.argv.slice(process.argv.indexOf('--library') + 1).join(' ');
  const found = searchVisualLibrary(buildVisualLibrary(loadReports()), query);
  console.log(`연출 자료집 ${found.length}개${query ? ` (검색어: ${query})` : ''} — 캡처는 이 PC에 있을 때만 경로가 나온다`);
  for (const e of found.slice(0, 40)) {
    const frame = e.frame && existsSync(join(projectDir, e.frame)) ? e.frame : '캡처 없음';
    const ratio = formatRatioLabel(e);
    console.log(`- [${e.channelTitle} · 평소 대비 ${ratio}] ${e.t}초: ${e.what} — ${e.purpose || ''} | ${frame} | http://localhost:3001/outlier-report/${e.videoId}`);
  }
  if (found.length > 40) console.log(`※ 앞 40개만 표시했다(전체 ${found.length}개). 전체를 종류별로 세어 보려면 npm run visual-summary`);
} else if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!ids.length) { console.error('사용법: node scripts/outlier-report.mjs <영상ID> [...] | --library [검색어]'); process.exit(1); }
  for (const id of ids) {
    const t0 = Date.now();
    try {
      const r = await analyzeOutlierVideo(id, {withFrames: !process.argv.includes('--no-frames')});
      console.log(`${id}: ${((Date.now() - t0) / 1000).toFixed(0)}초 · 모델 ${r.model} · 인용 확인 ${r.quoteCheck.verified}/${r.quoteCheck.checked} · 장면 전환 ${r.pacing.count}번 · AI가 적은 화면 변화 ${r.analysis.visualMoments.length}개 · 캡처 ${r.frames.length}장${r.framesError ? ` (캡처 실패: ${r.framesError})` : ''} · 자막 ${r.sources.transcript.ok ? '있음' : `없음(${r.sources.transcript.error.slice(0, 60)})`} · 댓글 ${r.sources.comments.count ?? 0}개 · 시청자 고민 ${r.audienceDnaSent}개 보냄(새 항목 ${r.audienceDnaNew}개)`);
    } catch (err) {
      console.error(`${id}: 실패 — ${err.message}`);
      process.exitCode = 1;
    }
  }
}
