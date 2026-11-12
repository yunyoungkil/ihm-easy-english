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
//       data/youtube/outlier-frames/<videoId>/<초>.jpg (내 PC에만, 경쟁 영상 화면이라 깃에 안 올림)
// 실행: node scripts/outlier-report.mjs <영상ID> [<영상ID> ...]
import {readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, rmSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {GEMINI_TEXT_MODELS} from './gemini-models.mjs';

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

/** 관찰만 시키는 프롬프트. 우리 철학·분류 목록·내용 예시는 넣지 않는다(AGENTS.md 2026-11-12). */
export function buildReportPrompt({meta, subscriberCount = null, outlierRatio = null, transcriptLines = null, comments = [], windowSeconds}) {
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
    outlierRatio != null ? `이 영상은 같은 채널의 평소 영상보다 하루 조회수가 ${Math.round(outlierRatio * 10) / 10}배 많다.` : '',
  ].filter(Boolean).join('\n');

  return `너는 유튜브 영상을 보고 있는 그대로 기록하는 관찰자다. 평가하거나 미리 정한 유형·공식에 끼워 넣지 말고, 실제로 보고 들은 것을 적는다.

[영상 정보]
${facts}

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
  "flow": [{"start": 0, "end": 0, "what": "이 구간에서 한 일", "quote": "그 구간 자막 원문"}],
  "visualMoments": [{"t": 0, "what": "화면에서 바뀐 것", "purpose": "그때 나오는 말과 어떻게 맞물리는지"}],
  "ending": {"what": "끝부분에서 한 일(구독 요청, 다음 영상 안내 등이 있으면 그대로)", "quote": "끝부분 자막 원문"},
  "viewerReaction": {
    "resonated": [{"point": "시청자가 공감하거나 감탄한 지점", "quote": "댓글 원문"}],
    "unanswered": [{"question": "시청자에게 남은 질문·아쉬움·요청", "quote": "댓글 원문"}],
    "vocabulary": [{"expression": "시청자가 직접 쓴 표현", "quote": "댓글 원문"}]
  },
  "links": [{"cause": "영상의 어느 장면·말(시각 포함)", "reaction": "그에 대한 시청자 반응", "quote": "댓글 원문"}],
  "forUs": {
    "adopt": "이 영상에서 그대로 가져올 만한 점 한 줄(무엇을 어떻게)",
    "differentiate": "이 영상이 놓쳤거나 다르게 할 점 한 줄"
  }
}

forUs 두 줄만 우리 쪽 관점이다. 우리 채널은 한국에 사는 30~60대 성인이 영어 소리를 이해하도록 돕는 채널이고, 어려운 전문용어나 시청자가 겪지 않은 해외 경험담은 쓰지 않는다. 나머지 칸은 모두 이 영상에 대한 관찰이다.`;
}

const normalize = (text) => String(text ?? '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const contains = (haystack, quote) => {
  const q = normalize(quote);
  return q.length > 0 && normalize(haystack).includes(q);
};

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
  for (const key of ['resonated', 'unanswered', 'vocabulary']) for (const r of a.viewerReaction?.[key] || []) mark(r, 'quote', commentTexts.length ? commentsJoined : null);
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

/** 연출 자료집: 모든 리포트의 화면 변화를 성과 배수 큰 영상부터 펼친다. 제작 단계에서 후보로 꺼내 쓴다. */
export function buildVisualLibrary(reports = []) {
  return [...reports]
    .sort((a, b) => (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0))
    .flatMap((r) => {
      const frameByT = new Map((r.frames || []).map((f) => [f.t, f.file]));
      return (r.analysis?.visualMoments || []).map((m) => ({
        videoId: r.videoId,
        title: r.meta?.title,
        channelTitle: r.meta?.channelTitle,
        outlierRatio: r.outlierRatio ?? null,
        t: m.t,
        what: m.what,
        purpose: m.purpose,
        frame: frameByT.has(m.t) ? `data/youtube/outlier-frames/${r.videoId}/${frameByT.get(m.t)}` : null,
      }));
    });
}

export const REPORTS_PER_DAY = 2; // Gemini 무료 한도 안에서 영상 보기 호출을 하루 2번으로 둔다
export const REPORT_FAILURE_COOLDOWN_DAYS = 7;
// 키워드 검색으로 들어온 아웃라이어에는 고양이 브이로그 같은 무관한 영상도 섞인다. 영어 학습과 관계있는 제목만 고른다.
const RELEVANT_TITLE_RE = /영어|영단어|english|발음|파닉스|phonics|단어|회화|듣기|리스닝|스피킹|문법|원어민|미드|읽는/i;

/** 매일 루프가 합친 리포트를 만들 경쟁 영상: 배수 큰 순, 하루 몫만. failures는 {영상ID: 실패 시각}. */
export function pickReportTargets({marketDemand = {}, existingIds = new Set(), failures = {}, now = new Date(), limit = REPORTS_PER_DAY} = {}) {
  const blockedChannel = (ch) => ch?.status === 'blocked' || ch?.status === 'graduated';
  const blockedIds = new Set((marketDemand.trackedChannels || []).filter(blockedChannel).flatMap((ch) => (ch.topOutliers || []).map((o) => o.videoId)));
  const best = new Map();
  const add = (list) => {
    for (const o of list || []) {
      if (!o?.videoId || blockedIds.has(o.videoId)) continue;
      const prev = best.get(o.videoId);
      if (!prev || (Number(o.outlierRatio) || 0) > prev.outlierRatio) best.set(o.videoId, {videoId: o.videoId, outlierRatio: Number(o.outlierRatio) || 0, title: o.title || prev?.title || ''});
    }
  };
  for (const kw of marketDemand.byKeyword || []) add(kw.topOutliers);
  for (const ch of marketDemand.trackedChannels || []) if (!blockedChannel(ch)) add(ch.topOutliers);
  const cooldownMs = REPORT_FAILURE_COOLDOWN_DAYS * 86400000;
  return [...best.values()]
    .filter((o) => RELEVANT_TITLE_RE.test(o.title) && !existingIds.has(o.videoId))
    .filter((o) => {
      const failedAt = Date.parse(failures[o.videoId] || '');
      return !(Number.isFinite(failedAt) && now.getTime() - failedAt < cooldownMs);
    })
    .sort((a, b) => b.outlierRatio - a.outlierRatio)
    .slice(0, limit)
    .map((o) => o.videoId);
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

async function processClip(videoId, moments, windowSeconds, {detectCuts = true} = {}) {
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
    const frames = [];
    for (const m of moments) {
      const t = Math.max(0, Math.floor(m.t));
      const file = `${t}.jpg`;
      await execFileAsync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', String(t), '-t', '3', '-i', join(work, video), '-vf', 'fps=1,scale=-2:240,tile=3x1', '-frames:v', '1', '-q:v', '5', join(outDir, file)], {timeout: 60000});
      if (existsSync(join(outDir, file))) frames.push({t: m.t, file});
    }
    return {frames, cuts, error: null};
  } catch (err) {
    return {frames: [], cuts: null, error: String(err.message).slice(0, 300)};
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
export async function ensureReportFrames(report) {
  const missing = missingFrames(report);
  if (!missing.length) return {videoId: report.videoId, made: 0, error: null};
  const result = await processClip(report.videoId, missing, report.windowSeconds ?? LONG_VIDEO_WINDOW_SECONDS, {detectCuts: false});
  if (!report.frames?.length && result.frames.length) {
    // 처음 분석 때 캡처를 못 만든 리포트는 이번에 만든 목록을 리포트에 적어 둔다(다음 PC가 같은 순간을 만들게).
    const path = join(reportsDir, `${report.videoId}.json`);
    const saved = JSON.parse(readFileSync(path, 'utf8'));
    saved.frames = result.frames;
    saved.framesError = null;
    writeFileSync(path, `${JSON.stringify(saved, null, 2)}\n`, 'utf8');
  }
  return {videoId: report.videoId, made: result.frames.length, error: result.error};
}

export async function ensureAllFrames({install = false} = {}) {
  const reports = loadReports();
  const pending = reports.filter((r) => missingFrames(r).length);
  if (!pending.length) return {total: reports.length, pending: 0, made: 0, failed: []};
  if (!(await resolveYtDlp({install}))) return {total: reports.length, pending: pending.length, made: 0, failed: [{videoId: '*', error: 'yt-dlp가 이 PC에 없고 설치도 못 함'}]};
  let made = 0;
  const failed = [];
  for (const r of pending) {
    const res = await ensureReportFrames(r);
    made += res.made;
    if (res.error) failed.push({videoId: r.videoId, error: res.error});
  }
  return {total: reports.length, pending: pending.length, made, failed};
}

function findOutlierRatio(videoId) {
  try {
    const md = JSON.parse(readFileSync(join(projectDir, 'data', 'youtube', 'market-demand.json'), 'utf8'));
    const all = [...(md.byKeyword || []), ...(md.trackedChannels || [])].flatMap((x) => x.topOutliers || []);
    return all.find((o) => o.videoId === videoId)?.outlierRatio ?? null;
  } catch { return null; }
}

export async function analyzeOutlierVideo(videoId, {withFrames = true} = {}) {
  if (!VIDEO_ID_RE.test(videoId)) throw new Error(`영상 ID 형식이 아님: ${videoId}`);
  loadEnv();
  const ytKey = process.env.YOUTUBE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!ytKey || !geminiKey) throw new Error('.env에 YOUTUBE_API_KEY와 GEMINI_API_KEY가 필요합니다');

  const meta = await fetchMeta(videoId, ytKey);
  const [subscriberCount, transcript, comments, thumbnailBase64] = await Promise.all([
    fetchSubscribers(meta.channelId, ytKey), fetchTranscript(videoId), fetchTopComments(videoId, ytKey), fetchThumbnailBase64(meta.thumbnail),
  ]);
  const commentList = Array.isArray(comments) ? comments : [];
  const windowSeconds = analysisWindowSeconds(meta.durationSeconds);
  const outlierRatio = findOutlierRatio(videoId);
  const prompt = buildReportPrompt({meta, subscriberCount, outlierRatio, transcriptLines: transcript.lines || null, comments: commentList, windowSeconds});
  const {model, analysis: raw, usage} = await callGemini({videoId, windowSeconds, thumbnailBase64, prompt, geminiKey});

  raw.visualMoments = (raw.visualMoments || []).filter((m) => Number.isFinite(Number(m.t)) && m.t >= 0 && m.t <= windowSeconds).map((m) => ({...m, t: Number(m.t)}));
  const {analysis, summary} = verifyQuotes(raw, {title: meta.title, transcriptText: transcript.fullText ?? null, commentTexts: commentList.map((c) => c.text)});
  const captured = withFrames ? await processClip(videoId, pickFrameMoments(analysis.visualMoments, windowSeconds), windowSeconds) : {frames: [], cuts: null, error: '캡처 안 함'};
  // 컷 간격은 영상에서 코드가 직접 잰 장면 전환을 먼저 쓴다. 영상을 못 받았을 때만 AI가 적은 화면 변화로 대신하고, 출처를 남긴다.
  const pacing = captured.cuts
    ? {...computePacing(captured.cuts.map((t) => ({t})), windowSeconds), source: 'ffmpeg 장면 전환 감지(코드)'}
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
    outlierRatio,
    sources: {
      transcript: transcript.error ? {ok: false, error: transcript.error} : {ok: true, lines: transcript.lines.length, language: transcript.language},
      comments: Array.isArray(comments) ? {ok: true, count: commentList.length} : {ok: false, error: comments.error},
      thumbnail: Boolean(thumbnailBase64),
      video: {analyzedSeconds: windowSeconds},
    },
    analysis,
    quoteCheck: summary,
    pacing,
    frames: captured.frames,
    framesError: captured.error,
    usage,
  };
  mkdirSync(reportsDir, {recursive: true});
  writeFileSync(join(reportsDir, `${videoId}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
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
    const ratio = e.outlierRatio == null ? '측정 전' : `${Math.round(e.outlierRatio)}배`;
    console.log(`- [${e.channelTitle} · 평소 대비 ${ratio}] ${e.t}초: ${e.what} — ${e.purpose || ''} | ${frame} | http://localhost:3001/outlier-report/${e.videoId}`);
  }
} else if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!ids.length) { console.error('사용법: node scripts/outlier-report.mjs <영상ID> [...] | --library [검색어]'); process.exit(1); }
  for (const id of ids) {
    const t0 = Date.now();
    try {
      const r = await analyzeOutlierVideo(id, {withFrames: !process.argv.includes('--no-frames')});
      console.log(`${id}: ${((Date.now() - t0) / 1000).toFixed(0)}초 · 모델 ${r.model} · 인용 확인 ${r.quoteCheck.verified}/${r.quoteCheck.checked} · 장면 전환 ${r.pacing.count}번 · AI가 적은 화면 변화 ${r.analysis.visualMoments.length}개 · 캡처 ${r.frames.length}장${r.framesError ? ` (캡처 실패: ${r.framesError})` : ''} · 자막 ${r.sources.transcript.ok ? '있음' : `없음(${r.sources.transcript.error.slice(0, 60)})`} · 댓글 ${r.sources.comments.count ?? 0}개`);
    } catch (err) {
      console.error(`${id}: 실패 — ${err.message}`);
      process.exitCode = 1;
    }
  }
}
