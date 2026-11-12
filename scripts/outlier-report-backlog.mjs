// 경쟁 분석·시장 수요 탭의 아웃라이어 영상 중 댓글·대본 리포트가 아직 없는 대상을 고르고 순차 실행한다.
// daily-loop.mjs(매일 백필)와 youtube-analytics-server.mjs(/api/market-demand/run 직후 자동 큐)가 함께 사용한다.

import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

export const DEFAULT_BACKFILL_PER_RUN = 3;
export const DEFAULT_ON_DEMAND_LIMIT = 3;
export const TEMP_FAILURE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const REPORT_FILE_VID_RE = /_([A-Za-z0-9_-]{11})\.md$/;
const PERMANENT_FAILURE_RE = /자막 기능을 꺼놔|가져올 수 있는 자막이 없습니다|찾을 수 없습니다\(비공개이거나 삭제|commentsDisabled|댓글 기능이 비활성화|Video unavailable|TranscriptsDisabled|NoTranscriptFound/i;

/**
 * 리포트 마크다운 파일명 목록(`..._<videoId>.md`)에서 11자리 영상 ID 집합을 추출한다.
 * @param {string[]} files
 * @returns {Set<string>}
 */
export function extractReportVideoIds(files = []) {
  const ids = new Set();
  for (const file of files || []) {
    const match = String(file || '').match(REPORT_FILE_VID_RE);
    if (match) ids.add(match[1]);
  }
  return ids;
}

/**
 * 프로젝트의 `output/insights`, `output/script-insights`에서 이미 생성된 리포트 ID 집합을 읽는다.
 * @param {string} projectDir
 * @returns {{existingCommentIds: Set<string>, existingScriptIds: Set<string>}}
 */
export function loadExistingReportIds(projectDir) {
  const readDirIds = (dir) => (existsSync(dir) ? extractReportVideoIds(readdirSync(dir)) : new Set());
  return {
    existingCommentIds: readDirIds(join(projectDir, 'output', 'insights')),
    existingScriptIds: readDirIds(join(projectDir, 'output', 'script-insights')),
  };
}

/**
 * 실패 메시지가 영상 자체의 제약(자막 꺼짐·없음, 비공개, 댓글 차단)인지 판정한다.
 * 일시적 API 한도(429)·네트워크 오류는 false를 돌려 쿨다운 후 재시도할 수 있게 한다.
 * @param {string|null|undefined} message
 * @returns {boolean}
 */
export function isPermanentAnalysisFailure(message) {
  return PERMANENT_FAILURE_RE.test(String(message || ''));
}

function shouldSkipFailure(entry, nowMs) {
  if (!entry?.message) return false;
  if (isPermanentAnalysisFailure(entry.message)) return true;
  const failedAt = Date.parse(entry.failedAt || '');
  return Number.isFinite(failedAt) && (nowMs - failedAt) < TEMP_FAILURE_COOLDOWN_MS;
}

function collectRankedOutliers(marketDemand) {
  const blockedIds = new Set();
  for (const ch of marketDemand?.trackedChannels || []) {
    if (ch?.status !== 'blocked' && ch?.status !== 'graduated') continue;
    const allChannelOutliers = [
      ...(ch.topOutliers || []),
      ...(ch.topOutliersByFormat?.long || []),
      ...(ch.topOutliersByFormat?.short || []),
    ];
    for (const o of allChannelOutliers) {
      if (o?.videoId) blockedIds.add(o.videoId);
    }
  }

  const byVideo = new Map();
  const addOutliers = (list) => {
    for (const o of list || []) {
      if (!o?.videoId || blockedIds.has(o.videoId)) continue;
      const ratio = Number(o.outlierRatio) || 0;
      const prev = byVideo.get(o.videoId);
      if (!prev || ratio > prev.outlierRatio) {
        byVideo.set(o.videoId, {videoId: o.videoId, outlierRatio: ratio});
      }
    }
  };

  for (const kw of marketDemand?.byKeyword || []) addOutliers(kw?.topOutliers);
  for (const ch of marketDemand?.trackedChannels || []) {
    if (ch?.status === 'blocked' || ch?.status === 'graduated') continue;
    addOutliers(ch?.topOutliers);
  }

  return [...byVideo.values()].sort((a, b) => b.outlierRatio - a.outlierRatio);
}

/**
 * `marketDemand`에서 댓글·대본 리포트가 아직 없는 영상 ID를 배수 높은 순으로 고른다.
 * @param {object|null|undefined} marketDemand
 * @param {object} [options]
 * @returns {{commentTargets: string[], scriptTargets: string[]}}
 */
export function selectOutlierReportBacklog(marketDemand, options = {}) {
  if (!marketDemand) return {commentTargets: [], scriptTargets: []};
  const {
    existingCommentIds = new Set(),
    existingScriptIds = new Set(),
    failures = {},
    limit = DEFAULT_BACKFILL_PER_RUN,
    now = new Date(),
  } = options;

  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const numericLimit = Number(limit);
  const maxCount = Math.max(0, Number.isFinite(numericLimit) ? Math.floor(numericLimit) : DEFAULT_BACKFILL_PER_RUN);
  const ranked = collectRankedOutliers(marketDemand);

  const pickForKind = (kind, existingIds) => ranked
    .filter(({videoId}) => !existingIds.has(videoId) && !shouldSkipFailure(failures?.[videoId]?.[kind], nowMs))
    .slice(0, maxCount)
    .map(({videoId}) => videoId);

  return {
    commentTargets: pickForKind('comment', existingCommentIds),
    scriptTargets: pickForKind('script', existingScriptIds),
  };
}

/**
 * 대상 영상 ID를 순차 실행하고 성공(done), 콘텐츠 제약 건너뜀(skipped), 시스템 오류(failed)로 분류한다.
 * @param {string[]} targets
 * @param {(videoId: string) => Promise<void>} analyzeFn
 * @returns {Promise<{done: string[], skipped: Array<{videoId: string, error: string}>, failed: Array<{videoId: string, error: string}>}>}
 */
export async function executeBacklogTargets(targets, analyzeFn) {
  const done = [];
  const skipped = [];
  const failed = [];

  for (const videoId of targets || []) {
    try {
      await analyzeFn(videoId);
      done.push(videoId);
    } catch (err) {
      const message = String(err?.message || err || '알 수 없는 오류');
      if (isPermanentAnalysisFailure(message)) skipped.push({videoId, error: message});
      else failed.push({videoId, error: message});
    }
  }
  return {done, skipped, failed};
}

/**
 * 콘텐츠 제약(skipped)을 제외하고 실행 가능한 대상이 전부 시스템/API 오류로 실패했는지 판정한다.
 * @param {{done: string[], failed: Array<unknown>}} result
 * @returns {boolean}
 */
export function hasBatchSystemFailure(result) {
  return (result?.done?.length || 0) === 0 && (result?.failed?.length || 0) > 0;
}

/**
 * `marketDemand`에서 `sinceMs` 이후 새로 갱신된 키워드·채널만 추린다.
 * 차단·졸업 채널의 제외 규칙이 유지되도록 해당 상태 채널의 정보는 함께 보존한다.
 * @param {object|null|undefined} marketDemand
 * @param {number} sinceMs
 * @returns {{byKeyword: object[], trackedChannels: object[]}}
 */
export function pickRecentMarketDemandSlice(marketDemand, sinceMs) {
  if (!marketDemand) return {byKeyword: [], trackedChannels: []};
  const isRecent = (item) => {
    const at = Date.parse(item?.analyzedAt || '');
    return Number.isFinite(at) && at >= sinceMs;
  };
  return {
    byKeyword: (marketDemand.byKeyword || []).filter(isRecent),
    trackedChannels: (marketDemand.trackedChannels || []).filter(
      (ch) => ch?.status === 'blocked' || ch?.status === 'graduated' || isRecent(ch),
    ),
  };
}

const PRIORITY_WEIGHT = {high: 0, normal: 1, low: 2};

/**
 * 동일 키 작업의 중복 실행을 막고 모든 리포트 분석 작업을 우선순위 순으로 직렬화해 파일 경합을 방지한다.
 * @returns {{enqueue: (key: string|null, taskFn: () => Promise<any>, options?: {priority?: 'high'|'normal'|'low'}) => {joined: boolean, promise: Promise<any>}, pendingSize: () => number}}
 */
export function createSerialReportQueue() {
  const pending = new Map();
  const queue = [];
  let running = false;

  const insertSorted = (entry) => {
    const idx = queue.findIndex((q) => PRIORITY_WEIGHT[q.priority] > PRIORITY_WEIGHT[entry.priority]);
    if (idx === -1) queue.push(entry);
    else queue.splice(idx, 0, entry);
  };

  const pump = async () => {
    if (running) return;
    running = true;
    try {
      while (queue.length > 0) {
        const entry = queue.shift();
        try {
          const val = await entry.taskFn();
          entry.resolve(val);
        } catch (err) {
          entry.reject(err);
        } finally {
          if (entry.key) pending.delete(entry.key);
        }
      }
    } finally {
      running = false;
    }
  };

  const enqueue = (key, taskFn, options = {}) => {
    const priority = options?.priority in PRIORITY_WEIGHT ? options.priority : 'normal';
    if (key && pending.has(key)) {
      const existingPromise = pending.get(key);
      if (priority === 'high') {
        const queuedIdx = queue.findIndex((q) => q.key === key);
        if (queuedIdx !== -1 && PRIORITY_WEIGHT[queue[queuedIdx].priority] > PRIORITY_WEIGHT.high) {
          const [promoted] = queue.splice(queuedIdx, 1);
          promoted.priority = 'high';
          insertSorted(promoted);
        }
      }
      return {joined: true, promise: existingPromise};
    }

    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const entry = {key, taskFn, priority, resolve, reject};
    if (key) pending.set(key, promise);
    insertSorted(entry);
    queueMicrotask(pump);
    return {joined: false, promise};
  };

  return {
    enqueue,
    pendingSize: () => pending.size,
  };
}

/**
 * 단일 영상 댓글 분석 작업을 실행하고 실패·중단(삭제)·알림 처리를 일관되게 수행한다.
 * @param {string} videoId
 * @param {object} deps
 * @returns {Promise<object|null>}
 */
export async function executeCommentReport(videoId, deps) {
  const {
    ytKey,
    geminiKey,
    fetchVideoDetails,
    fetchComments,
    analyzeCommentsWithGemini,
    aiAnalysisFailed,
    generateMarkdownReport,
    formatInsightText,
    loadExistingPainPoints,
    saveCommentFiles,
    upsertAudienceDna,
    recordAnalysisFailure,
    clearAnalysisFailure,
    notifyClients,
    shouldAbort,
  } = deps;

  try {
    const meta = await fetchVideoDetails(videoId, ytKey);
    if (!meta) {
      throw new Error('이 영상을 찾을 수 없습니다(비공개이거나 삭제됐을 수 있습니다).');
    }
    const comments = await fetchComments(videoId, ytKey, 100, {throwOnDisabled: true});
    if (!comments || comments.length === 0) {
      throw new Error('수집된 댓글이 없어 분석을 건너뜁니다.');
    }

    const existingPainPoints = loadExistingPainPoints ? await loadExistingPainPoints() : [];
    const aiInsights = geminiKey
      ? await analyzeCommentsWithGemini(meta, comments, geminiKey, existingPainPoints)
      : null;

    if (aiAnalysisFailed({hasGeminiKey: Boolean(geminiKey), commentsCount: comments.length, aiInsights})) {
      throw new Error('Gemini 댓글 분석이 결과를 돌려주지 않았습니다(쿼터·응답 형식 문제일 수 있음).');
    }

    if (shouldAbort?.()) {
      return null;
    }

    const reportMd = generateMarkdownReport(meta, comments, aiInsights);
    const slug = `${meta.title.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 50)}_${videoId}`;
    await saveCommentFiles({videoId, slug, reportMd, meta, aiInsights, comments});

    if (aiInsights && upsertAudienceDna) {
      const dnaEntries = [
        ...(aiInsights.painPoints || []).map((item) => ({type: 'painPoint', text: formatInsightText(item)})),
        ...(aiInsights.audienceQuestions || []).map((item) => ({type: 'question', text: formatInsightText(item)})),
        ...(aiInsights.audienceVocabulary || []).map((item) => ({type: 'vocabulary', text: formatInsightText(item)})),
      ].map((e) => ({...e, videoId, channelTitle: meta.channelTitle, sourceType: 'outlierComment'}));
      await upsertAudienceDna(dnaEntries);
    }

    await clearAnalysisFailure(videoId, 'comment');
    notifyClients?.('analysis-updated', {videoId, kind: 'comment'});
    return {
      videoId,
      video: meta,
      commentsCount: comments.length,
      aiInsights,
      markdown: reportMd,
      file: `${slug}.md`,
    };
  } catch (err) {
    if (!shouldAbort?.()) {
      await recordAnalysisFailure(videoId, 'comment', err.message);
    }
    throw err;
  }
}

/**
 * 단일 영상 대본 분석 작업을 실행하고 실패·중단(삭제)·알림 처리를 일관되게 수행한다.
 * @param {string} videoId
 * @param {object} deps
 * @returns {Promise<object|null>}
 */
export async function executeScriptReport(videoId, deps) {
  const {
    ytKey,
    geminiKey,
    analyzeSingleScript,
    upsertAudienceDna,
    recordAnalysisFailure,
    clearAnalysisFailure,
    notifyClients,
    shouldAbort,
  } = deps;

  try {
    const result = await analyzeSingleScript(videoId, {
      ytKey,
      geminiKey,
      onDnaEntries: upsertAudienceDna,
      shouldAbortWrite: shouldAbort,
    });
    if (shouldAbort?.()) {
      return null;
    }
    if (!result) {
      throw new Error('대본 분석에 실패했습니다.');
    }
    await clearAnalysisFailure(videoId, 'script');
    notifyClients?.('analysis-updated', {videoId, kind: 'script'});
    return result;
  } catch (err) {
    if (!shouldAbort?.()) {
      await recordAnalysisFailure(videoId, 'script', err.message);
    }
    throw err;
  }
}
