import {createServer} from 'node:http';
import {readFile, writeFile, unlink, mkdir, readdir, rename, stat} from 'node:fs/promises';
import {existsSync, readdirSync, statSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exec, execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {
  extractVideoId,
  fetchVideoDetails,
  fetchComments,
  analyzeCommentsWithGemini,
  aiAnalysisFailed,
  generateMarkdownReport,
  formatInsightText,
} from './analyze-outlier-comments.mjs';
import { analyzeSingleScript } from './analyze-competitor-script.mjs';
import { startStudioWatcher } from './studio-auto-ingest.mjs';
import { pickSearchQueries, rankWinners, fetchSearchFeed } from './thumb-feed.mjs';
import { buildMatrixDataset, isDiagnosable } from './matrix-diagnosis.mjs';
import { toStoredCtr } from './studio-reach.mjs';
import { getRequestBlockReason } from './request-guard.mjs';
import {
  loadPublishRules,
  savePublishRules,
  scanReadyPackages,
  buildPublishQueue,
  isUploadAllowed,
  processQueueItem,
  hasUploadScope,
  approveThumbnail,
  scanPackagesNeedingAttention,
  scanUploadNotices,
  resolveAttention,
  dismissCommentNotice,
  decideNextUpload,
  isOurChannel,
  OUR_CHANNEL_ID,
} from './youtube-publisher.mjs';
import { attachShortsPackages, packageStatusSource, selectPackageVideo, packageStatusLabel, shortsPackageEpisode } from './upload-package-summary.mjs';
import { syncAllTrackedChannels, runD7AutonomousCycle, loadPlannedSources, loadOutlierReportChannels, LIFECYCLE_STATUS } from './competitor-lifecycle.mjs';
import { loadEpisodeOutcomes, videosNeedingViews7d, sevenDayWindow, views7dPath } from './planning-outcome.mjs';
import { recordSuccessPatterns } from './success-patterns.mjs';
import { resolveVideoFormat } from './video-format.mjs';
import { loadReports as loadOutlierReports, reportsDir as outlierReportsDir, framesDir as outlierFramesDir, missingFrames as missingOutlierFrames, ensureReportFrames, buildVisualLibrary } from './outlier-report.mjs';
import { renderReportPage as renderOutlierReportPage, renderReportIndex as renderOutlierReportIndex, renderMarkdownPage, renderVisualLibraryPage, renderTransformSheetPage, renderTransformSheetIndex } from './outlier-report-view.mjs';
import { buildFromProject as buildNextEpisodeInput, nextEpisodeInputPath } from './next-episode-input.mjs';
import { mergeAudienceDna } from './audience-dna.mjs';
import { formatRatioLabel, ratioTier } from './peer-ratio.mjs';
import { setThumbnailPick, setTitlePick, loadSheets as loadTransformSheets, validateSheet as validateTransformSheet, sheetImageExists, sheetsDir as transformSheetsDir } from './transform-sheet.mjs';
import {
  DEFAULT_ON_DEMAND_LIMIT,
  createSerialReportQueue,
  executeCommentReport,
  executeScriptReport,
  extractReportVideoIds,
  pickRecentMarketDemandSlice,
  selectOutlierReportBacklog,
} from './outlier-report-backlog.mjs';

const execFileAsync = promisify(execFile);
const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectDir, '.env');
const tokenPath = join(projectDir, '.youtube-oauth-token.json');
const youtubeDataDir = join(projectDir, 'data', 'youtube');
const catalogPath = join(youtubeDataDir, 'catalog.json');
const latestSnapshotPath = join(youtubeDataDir, 'analytics-latest.json');
const commentsPath = join(youtubeDataDir, 'comments.json');
const packagingRegistryPath = join(youtubeDataDir, 'packaging-registry.json');
const videoReachManualPath = join(youtubeDataDir, 'video-reach-manual.json');
const outputCommentsDir = join(youtubeDataDir, 'outlier-comments');
const outputInsightsDir = join(projectDir, 'output', 'insights');
const outputScriptInsightsDir = join(projectDir, 'output', 'script-insights');
const marketDemandPath = join(youtubeDataDir, 'market-demand.json');
const audienceDnaPath = join(youtubeDataDir, 'audience-dna.json');
const analysisFailuresPath = join(youtubeDataDir, 'analysis-failures.json');
const successPatternsPath = join(youtubeDataDir, 'success-patterns.json');
// 실제로 제작·예약·공개까지 간 소재의 영구 이력. 다음 기획이 같은 소재를 다시 고르지 않게 막는다
// (2026-09-04 신설. 아이디어 보드 화면은 2026-11-11에 지웠고 이 이력은 기획 스킬이 등록한다).
const ideaBoardHistoryPath = join(youtubeDataDir, 'idea-board-history.json');
const publishRulesPath = join(youtubeDataDir, 'publish-rules.json');
const globalUploadPackagesDir = join(projectDir, 'output', 'upload-packages');
const contentDir = join(projectDir, 'content');
const studioExportDir = resolve(process.env.YOUTUBE_STUDIO_EXPORT_DIR || join(projectDir, 'imports', 'youtube-studio'));
// 스캔이 끝난 Studio 폴더는 여기로 옮긴다. studioExportDir "안"이 아니라 형제 폴더인 이유:
// studio-auto-ingest.mjs가 studioExportDir을 재귀 감시하고 있어서, 그 안에서 폴더를 옮기면
// 매번 change 이벤트가 다시 발생한다(무해하긴 하지만 불필요한 노이즈). 감시 범위 밖에 둔다.
const studioArchiveDir = join(dirname(studioExportDir), 'youtube-studio-archive');
const downloadsDir = resolve(process.env.YOUTUBE_STUDIO_DOWNLOADS_DIR || join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads'));
const port = Number(process.env.YOUTUBE_ANALYTICS_PORT || 3001);
const redirectUri = `http://localhost:${port}/oauth2callback`;

const sseClients = new Set();
const notifyClients = (event, data) => {
  for (const client of sseClients) {
    try {
      client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
};

const loadEnv = async () => {
  if (!existsSync(envPath)) return;
  const text = await readFile(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
};

await loadEnv();

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
const youtubeApiKey = process.env.YOUTUBE_API_KEY;
const requiredMissing = [
  ['YOUTUBE_CLIENT_ID', clientId],
  ['YOUTUBE_CLIENT_SECRET', clientSecret],
].filter(([, value]) => !value).map(([name]) => name);

const states = new Set();

const json = (res, status, data) => {
  res.writeHead(status, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
  res.end(JSON.stringify(data));
};

const redirect = (res, location) => {
  res.writeHead(302, {Location: location, 'Cache-Control': 'no-store'});
  res.end();
};

const loadToken = async () => {
  if (!existsSync(tokenPath)) return null;
  try {
    return JSON.parse(await readFile(tokenPath, 'utf8'));
  } catch {
    return null;
  }
};

const readJsonBody = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 50 * 1024 * 1024) throw new Error('요청 데이터가 너무 큽니다 (50MB 초과).');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
};

const saveToken = async (token, previous = {}) => {
  const saved = {
    ...previous,
    ...token,
    refresh_token: token.refresh_token || previous.refresh_token,
    expires_at: Date.now() + Number(token.expires_in || 3600) * 1000,
  };
  await writeFile(tokenPath, JSON.stringify(saved, null, 2), 'utf8');
  return saved;
};

const tokenRequest = async (params) => {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams(params),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google token request failed');
  return data;
};

const getAccessToken = async () => {
  const token = await loadToken();
  if (!token) return null;
  if (token.access_token && token.expires_at > Date.now() + 60_000) return token.access_token;
  if (!token.refresh_token) return null;
  try {
    const refreshed = await tokenRequest({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    });
    return (await saveToken(refreshed, token)).access_token;
  } catch (err) {
    console.warn('[OAuth] 토큰 갱신 실패 (재인증 필요):', err.message);
    return null;
  }
};

const googleGet = async (url, accessToken) => {
  const response = await fetch(url, {headers: accessToken ? {Authorization: `Bearer ${accessToken}`} : {}});
  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `Google API request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return data;
};

const googleGetAllPages = async (url, accessToken) => {
  const items = [];
  let pageToken = '';
  do {
    const requestUrl = new URL(url);
    if (pageToken) requestUrl.searchParams.set('pageToken', pageToken);
    const page = await googleGet(requestUrl.toString(), accessToken);
    items.push(...(page.items || []));
    pageToken = page.nextPageToken || '';
  } while (pageToken);
  return items;
};

// 쇼츠인지는 길이로 알 수 없다 — 유튜브 쇼츠는 최대 3분이라 "60초 이하" 기준이면 64초·86초 쇼츠가
// 롱폼으로 잘못 들어간다(2026-11-06 확인: 이 때문에 영상별 롱폼 합계가 공식 집계보다 1,993회 많았다).
// 유튜브가 채널마다 자동으로 두는 쇼츠 전용 재생목록(UC…→UUSH…)을 기준으로 삼는다. 이 목록의 조회수
// 합은 Analytics의 쇼츠 집계와 정확히 일치했다. 공개 영상만 들어 있어서 예약·비공개 영상은 길이로 판정한다.
const getChannelShortsIds = async (channelId, accessToken) => {
  if (!channelId?.startsWith('UC')) return null;
  try {
    const items = await googleGetAllPages(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=UUSH${channelId.slice(2)}`,
      accessToken,
    );
    return new Set(items.map((item) => item.contentDetails?.videoId).filter(Boolean));
  } catch (err) {
    if (err.status === 404) return new Set(); // 쇼츠가 하나도 없는 채널은 이 재생목록 자체가 없다
    console.warn('[Shorts] 쇼츠 재생목록을 못 읽어 길이 기준으로 대신합니다:', err.message);
    return null;
  }
};

const chunks = (values, size) => Array.from({length: Math.ceil(values.length / size)}, (_, index) => values.slice(index * size, (index + 1) * size));

const mapConcurrent = async (items, limit, fn) => {
  const results = new Array(items.length);
  let index = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (err) {
        results[i] = null;
      }
    }
  });
  await Promise.all(workers);
  return results;
};

let fileWriteQueue = Promise.resolve();
const saveJson = (path, value) => {
  fileWriteQueue = fileWriteQueue.then(async () => {
    await mkdir(dirname(path), {recursive: true});
    const tmpPath = `${path}.tmp.${Date.now()}`;
    await writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf8');
    try {
      await rename(tmpPath, path);
    } catch (_) {
      await writeFile(path, JSON.stringify(value, null, 2), 'utf8');
      await unlink(tmpPath).catch(() => {});
    }
  }).catch(err => {
    console.error('saveJson error on', path, err);
  });
  return fileWriteQueue;
};

const loadJson = async (path, fallback = null) => {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
};

let analysisStateLock = Promise.resolve();
const withAnalysisStateLock = (fn) => {
  const run = analysisStateLock.then(() => fn());
  analysisStateLock = run.catch(() => {});
  return run;
};
const deletedOrphanTimestamps = new Map();

// entries: [{type, text, videoId, channelTitle, sourceType}] — 합치기 규칙은 scripts/audience-dna.mjs 한곳에 있다(2026-11-12).
const upsertAudienceDna = (newEntries) => withAnalysisStateLock(async () => {
  if (!newEntries?.length) return;
  const store = await loadJson(audienceDnaPath, { schemaVersion: 1, entries: [] });
  await saveJson(audienceDnaPath, mergeAudienceDna(store, newEntries, new Date().toISOString()));
});

// 댓글/대본 분석이 실패해도 그 사실이 어디에도 안 남아서, 시장 수요 레이더로 돌아가면 버튼이
// 분석 전과 똑같아 보여 사용자가 (예: 자막이 꺼진 영상인 줄 모르고) 같은 영상을 또 눌러보게
// 되는 문제가 있었다(2026-09-07, 사용자 지적). 성공 리포트 파일 유무만 보던 것과 별개로,
// 마지막 실패 사유도 videoId 기준으로 기록해 카드에 경고로 보여준다. 실패가 영구적인지
// (자막 꺼짐) 일시적인지(API 오류 등) 우리가 단정할 수 없으므로 버튼 자체를 막지는 않고,
// "이전에 실패했다"는 경고만 얹어서 재시도 여부는 사용자가 판단하게 한다.
const recordAnalysisFailure = (videoId, kind, message) => withAnalysisStateLock(async () => {
  if (!videoId || !message) return;
  const store = await loadJson(analysisFailuresPath, { schemaVersion: 1, entries: {} });
  store.entries[videoId] = { ...store.entries[videoId], [kind]: { message, failedAt: new Date().toISOString() } };
  await saveJson(analysisFailuresPath, store);
});

const clearAnalysisFailure = (videoId, kind) => withAnalysisStateLock(async () => {
  if (!videoId) return;
  const store = await loadJson(analysisFailuresPath, { schemaVersion: 1, entries: {} });
  if (store.entries[videoId]?.[kind]) {
    delete store.entries[videoId][kind];
    if (Object.keys(store.entries[videoId]).length === 0) delete store.entries[videoId];
    await saveJson(analysisFailuresPath, store);
  }
});

const outlierReportQueue = createSerialReportQueue();

const runSingleCommentReport = (vid, ytKey, geminiKey, options = {}) => executeCommentReport(vid, {
  ytKey,
  geminiKey,
  fetchVideoDetails,
  fetchComments,
  analyzeCommentsWithGemini,
  aiAnalysisFailed,
  generateMarkdownReport,
  formatInsightText,
  loadExistingPainPoints: async () => {
    const existingDna = (await loadJson(audienceDnaPath, {entries: []})).entries || [];
    return existingDna.filter((e) => e.type === 'painPoint' || e.type === 'question');
  },
  saveCommentFiles: async ({videoId, slug, reportMd, meta, aiInsights, comments}) => {
    if (!existsSync(outputInsightsDir)) await mkdir(outputInsightsDir, {recursive: true});
    if (!existsSync(outputCommentsDir)) await mkdir(outputCommentsDir, {recursive: true});
    await writeFile(join(outputInsightsDir, `${slug}.md`), reportMd, 'utf8');
    await writeFile(join(outputCommentsDir, `${videoId}.json`), JSON.stringify({schemaVersion: 1, analyzedAt: new Date().toISOString(), video: meta, aiInsights, comments}, null, 2), 'utf8');
  },
  upsertAudienceDna,
  recordAnalysisFailure,
  clearAnalysisFailure,
  notifyClients,
  shouldAbort: options.shouldAbort,
});

const runSingleScriptReport = (vid, options = {}) => executeScriptReport(vid, {
  ytKey: options.ytKey,
  geminiKey: options.geminiKey,
  analyzeSingleScript,
  upsertAudienceDna,
  recordAnalysisFailure,
  clearAnalysisFailure,
  notifyClients,
  shouldAbort: options.shouldAbort,
});

const enqueueAutoOutlierReports = async (marketDemandSlice) => {
  const ytKey = process.env.YOUTUBE_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!ytKey || ytKey === 'YOUR_YOUTUBE_API_KEY_HERE') return {comments: [], scripts: []};
  if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') return {comments: [], scripts: []};

  const enqueuedAt = Date.now();
  const [commentFiles, scriptFiles, failuresStore] = await Promise.all([
    existsSync(outputInsightsDir) ? readdir(outputInsightsDir).catch(() => []) : [],
    existsSync(outputScriptInsightsDir) ? readdir(outputScriptInsightsDir).catch(() => []) : [],
    loadJson(analysisFailuresPath, {schemaVersion: 1, entries: {}}),
  ]);
  const {commentTargets, scriptTargets} = selectOutlierReportBacklog(marketDemandSlice, {
    existingCommentIds: extractReportVideoIds(commentFiles),
    existingScriptIds: extractReportVideoIds(scriptFiles),
    failures: failuresStore.entries || {},
    limit: DEFAULT_ON_DEMAND_LIMIT,
  });

  const makeShouldAbort = (vid) => () => (deletedOrphanTimestamps.get(vid) || 0) >= enqueuedAt;
  const schedule = (kind, targets, fn) => {
    const queued = [];
    for (const vid of targets) {
      const {joined, promise} = outlierReportQueue.enqueue(
        `${kind}:${vid}`,
        () => fn(vid, makeShouldAbort(vid)),
        {priority: 'low'},
      );
      if (!joined) {
        queued.push(vid);
        promise.catch((err) => console.warn(`[Auto-Report] ${kind} 실패 (${vid}):`, err.message));
      }
    }
    return queued;
  };

  const queuedComments = schedule('comment', commentTargets, (vid, shouldAbort) =>
    runSingleCommentReport(vid, ytKey, geminiKey, {shouldAbort}));
  const queuedScripts = schedule('script', scriptTargets, (vid, shouldAbort) =>
    runSingleScriptReport(vid, {ytKey, geminiKey, shouldAbort}));
  return {comments: queuedComments, scripts: queuedScripts};
};

// 시장 수요 레이더에서 키워드 전체(또는 영상 하나)를 지울 때 공통으로 쓰는 "고아 데이터 청소"
// 로직(2026-09-13). 호출부가 이미 market-demand.json에서 해당 videoId를 뺀 뒤, "이 videoId를
// 아직도 참조하는 키워드가 남아있는지" 확인해서 orphanedVideoIds만 여기로 넘겨준다 — 이 함수는
// 그 확인을 하지 않고 넘어온 목록을 그대로 지운다(호출부 책임).
const cascadeDeleteOrphanedVideoData = async (orphanedVideoIds) => {
  let deletedReportFiles = 0;
  let removedDnaEntries = 0;
  if (!orphanedVideoIds.length) return {deletedReportFiles, removedDnaEntries};

  const deletedAt = Date.now();
  for (const vid of orphanedVideoIds) {
    deletedOrphanTimestamps.set(vid, deletedAt);
    for (const dir of [outputInsightsDir, outputScriptInsightsDir]) {
      try {
        if (!existsSync(dir)) continue;
        const files = await readdir(dir);
        const match = files.find((f) => f.endsWith(`_${vid}.md`));
        if (match) {
          await unlink(join(dir, match));
          deletedReportFiles++;
        }
      } catch {}
    }
  }

  await withAnalysisStateLock(async () => {
    const failuresStore = await loadJson(analysisFailuresPath, {schemaVersion: 1, entries: {}});
    let failuresChanged = false;
    for (const vid of orphanedVideoIds) {
      if (failuresStore.entries[vid]) {
        delete failuresStore.entries[vid];
        failuresChanged = true;
      }
    }
    if (failuresChanged) await saveJson(analysisFailuresPath, failuresStore);

    // 시청자DNA는 여러 영상에서 뽑힌 문구가 하나의 항목으로 병합돼 있으므로(upsertAudienceDna
    // 참고), 이번에 지우는 영상이 남긴 출처(sources)만 걷어내고 — 다른 영상도 이 항목의 출처라면
    // 항목 자체는 채널 전체 지식으로 남긴다. 출처가 완전히 0개가 되면(이 영상들에서만 나온
    // 문구였다는 뜻) 그때만 항목째로 지운다.
    const dnaStore = await loadJson(audienceDnaPath, {schemaVersion: 1, entries: []});
    const orphanSet = new Set(orphanedVideoIds);
    const keptEntries = [];
    let dnaChanged = false;
    for (const entry of dnaStore.entries || []) {
      const beforeLen = (entry.sources || []).length;
      const removedCount = (entry.sources || []).filter((s) => orphanSet.has(s.videoId)).length;
      if (removedCount === 0) { keptEntries.push(entry); continue; }
      dnaChanged = true;
      entry.sources = (entry.sources || []).filter((s) => !orphanSet.has(s.videoId));
      if (entry.sources.length === 0 && beforeLen > 0) {
        removedDnaEntries++;
        continue; // 항목째로 제외
      }
      entry.occurrences = Math.max(1, (entry.occurrences || 1) - removedCount);
      keptEntries.push(entry);
    }
    if (dnaChanged) {
      dnaStore.entries = keptEntries;
      dnaStore.updatedAt = new Date().toISOString();
      await saveJson(audienceDnaPath, dnaStore);
    }
  });

  return {deletedReportFiles, removedDnaEntries};
};


const parseCsvRows = (text) => {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index++;
      row.push(cell);
      if (row.some((item) => item.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((item) => item.trim())) rows.push(row);
  return rows;
};

const normalizeTitle = (value) => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
const cleanHeader = (s) => String(s || '').replace(/^\uFEFF/, '').toLowerCase().replace(/[\s_()%·.\-/]/g, '');
const columnIndex = (headers, aliases) => {
  const normalized = headers.map(cleanHeader);
  const exact = normalized.findIndex((h) => aliases.some((a) => h === a));
  return exact >= 0 ? exact : normalized.findIndex((h) => aliases.some((a) => h.includes(a)));
};

// Studio의 CTR 칸은 이미 % 값이고 % 기호가 없다. 1 이하를 비율로 보고 100을 곱하면 0.79%가 79%로 저장된다.
const numeric = (value) => {
  const raw = String(value ?? '').trim();
  const s = raw.replace(/,/g, '').replace(/%/g, '');
  if (!s || s === '—' || s === '-') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const durationSeconds = (iso) => {
  const match = String(iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const [, h, m, s] = match;
  return Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
};

const dateRange = () => {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
};

const analyticsQuery = (token, params) => googleGet(
  `https://youtubeanalytics.googleapis.com/v2/reports?${new URLSearchParams({ids: 'channel==MINE', ...params})}`,
  token,
);

const optionalAnalyticsQuery = async (token, params) => {
  try {
    return await analyticsQuery(token, params);
  } catch (error) {
    return {columnHeaders: [], rows: []};
  }
};

const rowObjects = (report) => {
  const headers = (report.columnHeaders || []).map((header) => header.name);
  return (report.rows || []).map((row) => Object.fromEntries(row.map((value, index) => [headers[index], value])));
};

const cleanForMatch = (s) => String(s || '')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[\uFEFF]/g, '')
  .replace(/[_|:?*"<>\\/\u2013\u2014#~`'’“”()[\]{}!,.]/g, ' ')
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

const findMatchingVideoId = (folderTitle, allCandidates) => {
  const cleanedFolder = cleanForMatch(folderTitle);
  if (!cleanedFolder) return null;

  // Direct exact match
  let exact = allCandidates.filter(c => cleanForMatch(c.title) === cleanedFolder);
  let ids = Array.from(new Set(exact.map(c => String(c.videoId || c.video || '')).filter(id => /^[A-Za-z0-9_-]{11}$/.test(id))));
  if (ids.length === 1) return ids[0];

  // Prefix or Substring match
  let partial = allCandidates.filter(c => {
    const cleaned = cleanForMatch(c.title);
    if (!cleaned) return false;
    return cleaned === cleanedFolder ||
      cleaned.startsWith(cleanedFolder) ||
      cleanedFolder.startsWith(cleaned) ||
      (cleanedFolder.length > 15 && cleaned.includes(cleanedFolder.slice(0, 25))) ||
      (cleaned.length > 15 && cleanedFolder.includes(cleaned.slice(0, 25)));
  });
  ids = Array.from(new Set(partial.map(c => String(c.videoId || c.video || '')).filter(id => /^[A-Za-z0-9_-]{11}$/.test(id))));
  if (ids.length === 1) return ids[0];

  return null;
};

const getLocalPackageThumbnailMap = async () => {
  const uploadDir = join(projectDir, 'output', 'upload-packages');
  const map = {};
  if (!existsSync(uploadDir)) return map;
  try {
    const entries = await readdir(uploadDir, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const metaPath = join(uploadDir, ent.name, 'metadata.json');
      const thumbPng = join(uploadDir, ent.name, 'thumbnail.png');
      const thumbJpg = join(uploadDir, ent.name, 'thumbnail.jpg');
      const thumbPath = existsSync(thumbPng) ? thumbPng : (existsSync(thumbJpg) ? thumbJpg : null);
      if (existsSync(metaPath) && thumbPath) {
        try {
          const meta = await loadJson(metaPath);
          const vId = meta.youtube?.videoId || meta.videoId;
          if (vId) map[vId] = relative(projectDir, thumbPath);
        } catch (e) {}
      }
    }
  } catch (e) {}
  return map;
};

const scanStudioExportFolders = async (videos = [], packagingRegistry = {items: []}) => {
  if (!existsSync(studioExportDir)) return {imported: 0, unchanged: 0, skipped: [], waiting: [], directory: studioExportDir, autoProcessed: false};
  const entries = await readdir(studioExportDir, {withFileTypes: true});
  const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  let candidateVideos = [...videos];
  if (candidateVideos.length === 0) {
    const catalog = await loadJson(catalogPath);
    if (catalog?.videos) candidateVideos = catalog.videos;
  }
  const candidateItems = [...candidateVideos, ...(packagingRegistry?.items || [])];

  const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
  const skipped = [], waiting = [];
  let imported = 0, unchanged = 0;
  // 데이터를 reach에 무사히 반영한(=더 이상 원본 CSV가 필요 없는) 폴더만 모아뒀다가,
  // 스캔이 다 끝나고 JSON 저장까지 성공한 뒤에 archive로 옮긴다.
  const capturedFolders = [];

  for (const folder of folders) {
    const match = folder.match(/^콘텐츠\s+([0-9]{4}-[0-9]{2}-[0-9]{2})_([0-9]{4}-[0-9]{2}-[0-9]{2})\s+(.+)$/);
    if (!match) {
      skipped.push({folder, reason: '폴더명 형식 불일치'});
      continue;
    }
    const [, startDate, endDate, folderTitle] = match;
    const csvPath = join(studioExportDir, folder, '표 데이터.csv');
    if (!existsSync(csvPath)) {
      skipped.push({folder, reason: '표 데이터.csv 파일 없음'});
      continue;
    }

    try {
      const csvText = await readFile(csvPath, 'utf8');
      const rows = parseCsvRows(csvText);
      if (rows.length < 2) {
        skipped.push({folder, reason: '표 데이터.csv 내용 부족'});
        continue;
      }
      const headers = rows[0];
      const impressionsIndex = columnIndex(headers, ['impressions', '노출수', '노출', '썸네일노출수', '썸네일노출']);
      const ctrIndex = columnIndex(headers, ['impressionsclickthroughrate', '노출클릭률', '노출수클릭률', '썸네일클릭률', '썸네일노출클릭률', '클릭률', 'ctr']);
      if (impressionsIndex < 0 || ctrIndex < 0) {
        skipped.push({folder, reason: '노출수 또는 CTR 컬럼 없음'});
        continue;
      }

      const periodKey = `${startDate}_${endDate}`;

      // Check if this is a channel-wide multi-video export (where rows contain individual video IDs)
      const isMultiVideoExport = rows.length > 2 && rows.slice(1, 5).some(r => {
        const idCol = String(r[0] || '').trim();
        return /^[A-Za-z0-9_-]{11}$/.test(idCol) || candidateItems.some(v => v.videoId === idCol);
      });

      if (isMultiVideoExport) {
        let folderImported = 0;
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const rawId = String(r[0] || '').trim();
          const rawTitle = String(r[1] || '').trim();
          if (!rawId || rawId === '합계' || rawId.toLowerCase() === 'total') continue;

          let vId = null;
          if (/^[A-Za-z0-9_-]{11}$/.test(rawId)) {
            vId = rawId;
          } else {
            vId = findMatchingVideoId(rawTitle || rawId, candidateItems);
          }

          if (!vId) continue;

          const impressions = numeric(r[impressionsIndex]);
          const ctr = numeric(r[ctrIndex]);
          if (impressions == null && ctr == null) continue;

          reach.videos[vId] ||= { videoId: vId, windows: {}, periods: {} };
          reach.videos[vId].periods ||= {};
          const current = reach.videos[vId].periods[periodKey];
          if (current && current.impressions === Math.round(impressions || 0) && current.ctr === toStoredCtr(ctr)) {
            unchanged++;
            continue;
          }
          reach.videos[vId].periods[periodKey] = {
            startDate,
            endDate,
            impressions: Math.round(impressions || 0),
            // CTR 칸이 비면 0이 아니라 null(없음). 0으로 저장하면 실제 CTR 0%로 판정된다(점검 3번).
            ctr: toStoredCtr(ctr),
            packageId: `youtube-${vId}`,
            source: 'youtube-studio-channel-export',
            sourceFolder: folder,
            importedAt: new Date().toISOString(),
          };
          imported++;
          folderImported++;
        }
        capturedFolders.push(folder);
        continue;
      }

      // Single Video Export matching by folderTitle
      const videoId = findMatchingVideoId(folderTitle, candidateItems);
      if (!videoId) {
        skipped.push({folder, reason: '영상 연결 실패'});
        continue;
      }

      const totalRow = rows.slice(1).find((r) => ['합계', 'total'].includes(normalizeTitle(r[0] || ''))) || rows[1];
      const impressions = numeric(totalRow[impressionsIndex]);
      const ctr = numeric(totalRow[ctrIndex]);
      if (impressions == null || ctr == null) {
        skipped.push({folder, reason: '노출수/CTR 수치 변환 실패'});
        continue;
      }

      reach.videos[videoId] ||= {videoId, windows: {}, periods: {}};
      reach.videos[videoId].periods ||= {};
      const current = reach.videos[videoId].periods[periodKey];
      if (current && current.impressions === Math.round(impressions) && current.ctr === ctr) {
        unchanged++;
        capturedFolders.push(folder);
        continue;
      }
      reach.videos[videoId].periods[periodKey] = {
        startDate,
        endDate,
        impressions: Math.round(impressions),
        ctr,
        packageId: `youtube-${videoId}`,
        source: 'youtube-studio-folder',
        sourceFolder: folder,
        importedAt: new Date().toISOString(),
      };
      imported++;
      capturedFolders.push(folder);
    } catch (err) {
      skipped.push({folder, reason: `CSV 읽기 오류: ${err.message}`});
    }
  }

  reach.lastFolderScan = {
    directory: studioExportDir,
    scanned: folders.length,
    imported,
    unchanged,
    waiting,
    skipped,
    scannedAt: new Date().toISOString(),
  };

  if (imported > 0) {
    reach.updatedAt = new Date().toISOString();
    await saveJson(videoReachManualPath, reach);
  }

  // reach에 이미 반영된(새로 가져왔든, 예전에 가져와서 unchanged든) 폴더는 원본 CSV로서 더 이상
  // 필요 없다 — JSON 저장이 끝난 뒤에만 옮겨서, 저장 도중 문제가 생겨도 원본이 남아있게 한다.
  let archived = 0;
  if (capturedFolders.length > 0) {
    await mkdir(studioArchiveDir, {recursive: true});
    for (const folder of capturedFolders) {
      try {
        const from = join(studioExportDir, folder);
        let to = join(studioArchiveDir, folder);
        if (existsSync(to)) to = join(studioArchiveDir, `${folder}_${Date.now()}`);
        await rename(from, to);
        archived++;
      } catch (err) {
        console.error(`[Studio Scan] 폴더 보관 실패 (${folder}):`, err.message);
      }
    }
  }
  reach.lastFolderScan.archived = archived;

  return {imported, unchanged, skipped, waiting, archived, directory: studioExportDir, autoProcessed: true, totalScanned: folders.length};
};

const getDashboard = async (accessToken) => {
  const {startDate, endDate} = dateRange();
  const channelData = await googleGet(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true',
    accessToken,
  );
  const channel = channelData.items?.[0];
  if (!channel) throw new Error('승인한 계정에서 YouTube 채널을 찾지 못했습니다.');
  // 다른 채널의 숫자로 우리 채널 데이터를 덮어쓰지 않도록 저장 전에 멈춘다.
  if (!isOurChannel(channel.id)) {
    const error = new Error(`지금 연동된 채널은 "${channel.snippet?.title}"입니다. 재연동해서 "이해하면 쉬운 영어" 채널을 고르세요.`);
    error.status = 409;
    throw error;
  }

  const uploadsPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;
  const uploadItems = uploadsPlaylist ? await googleGetAllPages(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploadsPlaylist)}&maxResults=50`,
    accessToken,
  ) : [];
  let recentVideos = uploadItems.map((item) => ({
    videoId: item.contentDetails?.videoId,
    title: item.snippet?.title,
    publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt,
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || (item.contentDetails?.videoId ? `https://i.ytimg.com/vi/${item.contentDetails.videoId}/mqdefault.jpg` : ''),
  })).filter((item) => item.videoId);

  const detailItems = [];
  for (const batch of chunks(recentVideos.map((video) => video.videoId), 50)) {
    if (!batch.length) continue;
    const details = await googleGet(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,statistics&id=${encodeURIComponent(batch.join(','))}`, accessToken);
    detailItems.push(...(details.items || []));
  }
  const detailsById = Object.fromEntries(detailItems.map((item) => [item.id, item]));
  recentVideos = recentVideos.map((video) => {
    const detail = detailsById[video.videoId] || {};
    return {
      ...video,
      description: detail.snippet?.description || '',
      tags: detail.snippet?.tags || [],
      categoryId: detail.snippet?.categoryId || null,
      defaultLanguage: detail.snippet?.defaultLanguage || null,
      duration: detail.contentDetails?.duration || '',
      durationSeconds: durationSeconds(detail.contentDetails?.duration),
      thumbnail: detail.snippet?.thumbnails?.maxres?.url || detail.snippet?.thumbnails?.high?.url || detail.snippet?.thumbnails?.medium?.url || video.thumbnail,
      privacyStatus: detail.status?.privacyStatus || null,
      scheduledPublishAt: detail.status?.publishAt || null,
      statistics: detail.statistics || {},
      url: `https://youtu.be/${video.videoId}`,
    };
  });

  const shortsIds = await getChannelShortsIds(channel.id, accessToken);
  recentVideos = recentVideos.map((video) => ({...video, format: resolveVideoFormat(video, shortsIds)}));

  const playlistItems = await googleGetAllPages('https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50', accessToken);
  const playlists = playlistItems.map((item) => ({
    playlistId: item.id,
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    itemCount: Number(item.contentDetails?.itemCount || 0),
    url: `https://www.youtube.com/playlist?list=${item.id}`,
  }));

  // 댓글 목록을 OAuth로 읽으려면 쓰기까지 되는 youtube.force-ssl 권한이 필요하다. 지금 권한(youtube.readonly)으로는
  // 항상 403이 나서, 아래 catch가 조용히 삼키는 바람에 전 영상 댓글이 0개로 저장되고 있었다(2026-11-06 확인).
  // 공개 댓글은 API 키로 읽을 수 있으므로 권한을 넓히지 않고 키를 쓴다. 비공개·예약 영상은 키로 못 읽으니 건너뛴다.
  const commentsByVideo = {};
  const commentErrors = new Set();
  await mapConcurrent(recentVideos, 6, async (video) => {
    if (youtubeApiKey && video.privacyStatus !== 'public') {
      commentsByVideo[video.videoId] = [];
      return;
    }
    try {
      const items = await googleGetAllPages(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(video.videoId)}&maxResults=100${youtubeApiKey ? `&key=${encodeURIComponent(youtubeApiKey)}` : ''}`,
        youtubeApiKey ? null : accessToken,
      );
      commentsByVideo[video.videoId] = items.map((item) => {
        const top = item.snippet?.topLevelComment?.snippet;
        return {
          commentId: item.id,
          author: top?.authorDisplayName,
          authorChannelUrl: top?.authorChannelUrl,
          text: top?.textDisplay,
          likeCount: Number(top?.likeCount || 0),
          publishedAt: top?.publishedAt,
          isChannelOwner: top?.authorChannelId?.value === channel.id,
          // 답 수(누가 답했든). 시작 브리핑이 "답 없는 새 댓글"을 세는 데 쓴다(2026-11-09).
          replyCount: Number(item.snippet?.totalReplyCount || 0),
        };
      });
    } catch (err) {
      if (!/disabled/i.test(err.message)) commentErrors.add(err.message); // 댓글을 꺼 둔 영상은 오류가 아니다
      commentsByVideo[video.videoId] = [];
    }
  });
  if (commentErrors.size) console.warn(`[Comments] 댓글 수집 실패: ${[...commentErrors].join(' / ')}`);

  // 2026-11-10: 수동/추론 분류기 폐지. 추후 업로드 패키징 개편 시 status.json 기반 자동 연결로 이관
  const classifications = {};

  // 시작 브리핑의 "쇼츠→롱폼" 줄은 최근 7일 유입 경로를 따로 받는다(90일 합계로는 이번 주 변화를 못 본다, 2026-11-09).
  const traffic7dStart = new Date(Date.parse(`${endDate}T00:00:00Z`) - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [summaryReport, dailyReport, topReport, contentTypeReport, trafficReport, searchReport, traffic7dReport] = await Promise.all([
    analyticsQuery(accessToken, {
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost',
    }),
    analyticsQuery(accessToken, {
      startDate,
      endDate,
      dimensions: 'day',
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost',
      sort: 'day',
    }),
    analyticsQuery(accessToken, {
      startDate,
      endDate,
      dimensions: 'video',
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments',
      sort: '-views',
      maxResults: '200',
    }),
    optionalAnalyticsQuery(accessToken, {
      startDate,
      endDate,
      dimensions: 'creatorContentType',
      metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost',
      sort: '-views',
    }),
    optionalAnalyticsQuery(accessToken, {
      startDate,
      endDate,
      dimensions: 'insightTrafficSourceType',
      metrics: 'views,estimatedMinutesWatched',
      sort: '-views',
    }),
    optionalAnalyticsQuery(accessToken, {
      startDate,
      endDate,
      dimensions: 'insightTrafficSourceDetail',
      metrics: 'views,estimatedMinutesWatched',
      filters: 'insightTrafficSourceType==YT_SEARCH',
      sort: '-views',
      maxResults: '15',
    }),
    optionalAnalyticsQuery(accessToken, {
      startDate: traffic7dStart,
      endDate,
      dimensions: 'insightTrafficSourceType',
      metrics: 'views,estimatedMinutesWatched',
      sort: '-views',
    }),
  ]);

  const summary = rowObjects(summaryReport)[0] || {};
  const daily = rowObjects(dailyReport);
  const topRows = rowObjects(topReport);
  const videoMetrics = new Map(topRows.map((row) => [row.video, row]));

  const formatById = new Map(recentVideos.map((video) => [video.videoId, video.format]));
  const videoPerformance = topRows.map((row) => {
    const detail = detailsById[row.video] || {};
    const views = Number(row.views || 0);
    const net = Number(row.subscribersGained || 0) - Number(row.subscribersLost || 0);
    return {
      ...row,
      title: detail.snippet?.title || row.video,
      publishedAt: detail.snippet?.publishedAt || '',
      thumbnail: detail.snippet?.thumbnails?.maxres?.url || detail.snippet?.thumbnails?.high?.url || detail.snippet?.thumbnails?.medium?.url || (row.video ? `https://i.ytimg.com/vi/${row.video}/mqdefault.jpg` : ''),
      durationSeconds: durationSeconds(detail.contentDetails?.duration),
      creatorContentType: (formatById.get(row.video) || resolveVideoFormat({durationSeconds: durationSeconds(detail.contentDetails?.duration)}, null)) === 'SHORTS' ? 'SHORTS' : 'VIDEO_ON_DEMAND',
      subscriberNet: net,
      subscribersPerThousandViews: views > 0 ? (net / views) * 1000 : 0,
      classification: classifications[row.video] || null,
      url: `https://youtu.be/${row.video}`,
    };
  });

  const maxViews = Math.max(1, ...videoPerformance.map((v) => Number(v.views || 0)));
  const channelCRecommendations = recentVideos.filter((v) => v.durationSeconds >= 120).map((video) => {
    const metrics = videoMetrics.get(video.videoId) || {};
    const classification = classifications[video.videoId] || {};
    const views = Number(metrics.views || 0);
    const retention = Number(metrics.averageViewPercentage || 0);
    const relatedShorts = []; // 2026-11-10: 수동/추론 분류기 폐지 (추후 업로드 패키지 status.json 기반으로 복원 예정)
    const evidence = [metrics, ...relatedShorts].filter((row) => Number(row.views || 0) > 0);
    const evidenceViews = evidence.reduce((sum, row) => sum + Number(row.views || 0), 0);
    const evidenceSubscribers = evidence.reduce((sum, row) => sum + Number(row.subscriberNet ?? (Number(row.subscribersGained || 0) - Number(row.subscribersLost || 0))), 0);
    const weightedRetention = evidenceViews > 0
      ? evidence.reduce((sum, row) => sum + Number(row.averageViewPercentage || 0) * Number(row.views || 0), 0) / evidenceViews
      : 0;
    const subscriberRate = evidenceViews > 0 ? evidenceSubscribers / evidenceViews * 1000 : 0;
    const demandScore = Math.log10(evidenceViews + 1) / Math.log10(maxViews + 1);
    const reliability = evidenceViews / (evidenceViews + 100);
    const adjustedRetention = weightedRetention * reliability + 40 * (1 - reliability);
    const retentionScore = Math.min(adjustedRetention, 100) / 100;
    const bayesianSubscriberRate = evidenceSubscribers / (evidenceViews + 300) * 1000;
    const conversionScore = Math.min(Math.max(bayesianSubscriberRate, 0), 5) / 5;
    const score = Math.round((demandScore * 0.45 + retentionScore * 0.3 + conversionScore * 0.25) * 100);
    const strengths = [
      `근거 조회수 ${evidenceViews.toLocaleString('ko-KR')}`,
      weightedRetention > 0 ? `가중 시청률 ${weightedRetention.toFixed(1)}%` : null,
      relatedShorts.length ? `연결 쇼츠 ${relatedShorts.length}개 반영` : null,
      evidenceViews < 100 ? '표본 부족' : null,
    ].filter(Boolean);
    return {
      rank: 0,
      score,
      videoId: video.videoId,
      title: video.title,
      url: video.url,
      publishedAt: video.publishedAt,
      durationSeconds: video.durationSeconds,
      thumbnail: video.thumbnail,
      classification,
      confidence: evidenceViews >= 500 ? 'high' : evidenceViews >= 100 ? 'medium' : 'low',
      metrics: {views, averageViewPercentage: retention, subscriberNet: Number(metrics.subscriberNet || 0), subscribersPerThousandViews: Number(metrics.subscribersPerThousandViews || 0), evidenceViews, weightedRetention, evidenceSubscribers, evidenceSubscriberRate: subscriberRate},
      reason: strengths.join(' · '),
    };
  }).sort((a, b) => b.score - a.score).map((item, index) => ({...item, rank: index + 1}));

  const dashboard = {
    range: {startDate, endDate},
    channel: {
      id: channel.id,
      title: channel.snippet.title,
      thumbnail: channel.snippet.thumbnails?.default?.url,
      subscribers: Number(channel.statistics.subscriberCount || 0),
      totalViews: Number(channel.statistics.viewCount || 0),
      videos: Number(channel.statistics.videoCount || 0),
      url: `https://www.youtube.com/channel/${channel.id}`,
      subscribeUrl: `https://www.youtube.com/channel/${channel.id}?sub_confirmation=1`,
    },
    recentVideos,
    playlists,
    classifications,
    summary,
    daily,
    contentTypes: rowObjects(contentTypeReport),
    trafficSources: rowObjects(trafficReport),
    trafficSources7d: {startDate: traffic7dStart, endDate, rows: rowObjects(traffic7dReport)},
    searchTerms: rowObjects(searchReport),
    videoPerformance,
    topVideos: videoPerformance.slice(0, 15),
    channelCRecommendations: channelCRecommendations.slice(0, 10),
  };

  dashboard.packagingRegistry = await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
  dashboard.localThumbnails = await getLocalPackageThumbnailMap();
  dashboard.studioFolderScan = await scanStudioExportFolders(recentVideos, dashboard.packagingRegistry);
  dashboard.videoReachManual = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};

  const syncedAt = new Date().toISOString();
  const snapshotId = syncedAt.replace(/[:.]/g, '-');
  const catalog = {
    schemaVersion: 1,
    syncedAt,
    channel: dashboard.channel,
    uploadsPlaylist,
    videos: recentVideos.map((video) => ({
      ...video,
      classification: classifications[video.videoId] || null,
      comments: commentsByVideo[video.videoId] || [],
      channelOwnerComments: (commentsByVideo[video.videoId] || []).filter((comment) => comment.isChannelOwner),
    })),
    playlists,
  };
  const snapshot = {schemaVersion: 1, snapshotId, syncedAt, ...dashboard};
  await saveJson(catalogPath, catalog);
  await saveJson(commentsPath, {schemaVersion: 1, syncedAt, commentsByVideo});
  // 동기화마다 snapshots/에 한 장씩 따로 쓰던 것은 읽는 곳이 없어 2026-11-12에 멈췄다(knowledge/data-consumption-map.md).
  await saveJson(latestSnapshotPath, snapshot);
  return {...dashboard, sync: {syncedAt, snapshotId, catalogPath, latestSnapshotPath, commentsPath, videoCount: recentVideos.length, playlistCount: playlists.length, commentCount: Object.values(commentsByVideo).flat().length}};
};

let memoryEpisodesSummary = null;
let lastEpisodesSummaryTime = 0;

let memoryUploadsForMatching = null;
let lastUploadsForMatchingTime = 0;

// 업로드 패키지의 videoId를 아직 모를 때, 제목으로 찾아 매칭하기 위한 채널 영상 목록.
// ⚠️ search.list(forMine=true)는 쓰지 않는다 — 여러 차례("몇 번이나 수정했는데 왜 같은 문제가
// 발생하지") 이 동기화가 실패한 진짜 원인이 여기 있었다(2026-09-20 근본 원인 확인). 그동안의
// 수정은 전부 제목 매칭 로직(제목 시안 A/B/C 누락, \r\n 버그)만 고쳤는데, search.list 자체가
// **비공개·예약 영상을 채널 소유자가 조회해도 색인 지연·누락으로 못 찾는 경우가 흔한**
// 구글 문서화된 한계가 있어 — 막 업로드해서 아직 "예약" 상태인 영상은 애초에 검색 결과에
// 안 잡힐 수 있다. 반면 채널 자신의 "업로드" 재생목록(playlistItems.list)은 소유자가 보면
// 공개 여부와 무관하게 전부 나온다 — 대시보드 메인 화면(getDashboard)이 이미 이 방식을 쓰고
// 있어서 신뢰성이 검증돼 있다. 비용도 오히려 더 싸다(search.list 100 unit vs
// playlistItems.list 1 unit). 5분 캐시로 여러 패키지를 동기화할 때 재호출을 피한다.
const getRecentUploadsForMatching = async (accessToken, {fresh = false} = {}) => {
  if (!fresh && memoryUploadsForMatching && (Date.now() - lastUploadsForMatchingTime < 5 * 60 * 1000)) {
    return memoryUploadsForMatching;
  }
  const channelData = await googleGet('https://www.googleapis.com/youtube/v3/channels?part=contentDetails&mine=true', accessToken);
  const uploadsPlaylist = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylist) return [];
  const items = await googleGetAllPages(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploadsPlaylist)}&maxResults=50`,
    accessToken,
  );
  const result = items
    .map((item) => ({videoId: item.contentDetails?.videoId, title: item.snippet?.title}))
    .filter((v) => v.videoId);
  memoryUploadsForMatching = result;
  lastUploadsForMatchingTime = Date.now();
  return result;
};

// status.json은 업로드 패키지를 만든 시점에 한 번 적어둔 값이라, 예약 시각이 지나도 실제로
// 공개됐는지 아무도 다시 확인하지 않으면 영원히 "예약됨"으로 멈춰 있다(2026-09-05, 사용자가
// EP12가 실제로는 공개됐는데 대시보드는 계속 예약으로 표시하는 걸 발견). 예약 시각이 지난
// 패키지에 한해 유튜브 실제 상태를 확인해서 status.json을 갱신한다 — videoId를 이미 알면
// videos.list(1 unit)만 호출하고, 모르면 채널 업로드 목록에서 제목으로 찾아낸 뒤로는 videoId를
// 저장해 다음부터는 그 조회만 하게 한다. 5분에 한 번 이상은 확인하지 않는다.
// statusFile: 롱폼은 status.json, 쇼츠는 대시보드만 읽는 shorts-status.json(packageStatusSource 참고).
const syncUploadPackageStatusFromYouTube = async (pkgPath, statusData, title, titleCandidates, statusFile = 'status.json') => {
  if (!statusData?.status) return statusData; // status.json이 없는 옛 패키지
  // 공개일까지 유튜브 값으로 확인했으면 더 볼 게 없다. 예전 기록은 동기화한 시각이 공개일로 적혀 있어(최대 9일 차이)
  // 한 번씩 다시 확인해서 고친다. 예약일이 없는 패키지도 확인한다 — 안 그러면 EP22처럼 이미 공개된 영상이
  // 영원히 "업로드 대기"로 남는다(2026-11-06 확인).
  if (statusData.status === 'published' && statusData.publishedAtSource === 'youtube') return statusData;
  // 예약 시각이 아직 안 지났어도 동기화를 시도한다 — videoId가 없으면(막 업로드했을 수 있음)
  // 찾아서 기록해야 하고, 있어도 사용자가 유튜브 Studio에서 예약 시각을 바꿨을 수 있다(EP14에서
  // 실제로 20:00→08:00→20:00으로 바뀐 적 있음). "지난 것만 동기화"였던 예전 조건 때문에 막
  // 업로드해서 예약을 걸어도 패키징 카드에 반영이 안 되는 버그가 있었다(2026-09-11 확인).
  const lastSyncedAt = statusData.lastSyncedAt ? new Date(statusData.lastSyncedAt).getTime() : 0;
  if (Date.now() - lastSyncedAt < 5 * 60 * 1000) return statusData;

  const accessToken = await getAccessToken();
  if (!accessToken) return statusData;

  try {
    let videoId = statusData.videoId || null;
    let ytVideo = null;
    if (videoId) {
      const data = await googleGet(`https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${videoId}`, accessToken);
      ytVideo = data.items?.[0] || null;
    } else {
      // 제목 A/B 테스트 시안(title-variants.txt) 중 하나로 실제 업로드했을 수 있다 —
      // 기본 title.txt 하나만 정확히 일치시키면 그 경우 영영 못 찾는다(2026-09-18 확인,
      // EP17에서 실제로 title.txt=B인데 유튜브엔 시안 A로 올려서 동기화가 계속 실패했음).
      // 기본 제목 + 모든 시안 제목을 후보로 모아 하나라도 일치하면 매칭한다. 앞뒤 공백과
      // 연속 공백 차이는 무시한다(유튜브 Studio에서 붙여넣을 때 흔히 생김).
      const normalize = (s) => (s || '').trim().replace(/\s+/g, ' ');
      const candidateTitles = [title, ...(titleCandidates || []).map((v) => v.title)].filter(Boolean).map(normalize);
      const uploads = await getRecentUploadsForMatching(accessToken);
      let match = uploads.find((v) => candidateTitles.includes(normalize(v.title)));
      // BRIEF.md 등에 시안의 전체 제목 원문이 아니라 훅 문구 일부만 남아있는 경우가 실제로
      // 있었다(EP19, 2026-09-20 확인 — title-variants.txt에 A안이 "왜 다르게 흘릴까
      // 궁금했습니다"라는 짧은 조각으로만 적혀 있어서, 실제 업로드된 전체 제목과 정확히 일치하지
      // 않아 못 찾았다). 그런 조각도 실제 제목의 부분 문자열로는 남아있으므로, 정확히 일치하는
      // 게 없으면 길이 6자 이상인 후보에 한해 부분 문자열 포함 여부로 한 번 더 시도한다(너무
      // 짧은 후보로 느슨하게 매칭하면 엉뚱한 영상에 잘못 걸릴 수 있어 하한을 둔다).
      if (!match) {
        match = uploads.find((v) => {
          const t = normalize(v.title);
          return candidateTitles.some((c) => c.length >= 12 && t.includes(c));
        });
      }
      if (match) {
        videoId = match.videoId;
        const data = await googleGet(`https://www.googleapis.com/youtube/v3/videos?part=status,snippet&id=${videoId}`, accessToken);
        ytVideo = data.items?.[0] || null;
      }
    }
    const ytStatus = ytVideo?.status || null;

    const updated = {...statusData, lastSyncedAt: new Date().toISOString()};
    if (videoId) updated.videoId = videoId;
    if (ytStatus) {
      if (ytStatus.privacyStatus === 'public') {
        updated.status = 'published';
        updated.publishedAt = ytVideo.snippet?.publishedAt || updated.publishedAt || new Date().toISOString();
        if (ytVideo.snippet?.publishedAt) updated.publishedAtSource = 'youtube';
      } else if (ytStatus.privacyStatus === 'private' && ytStatus.publishAt) {
        updated.status = 'scheduled';
        updated.scheduledFor = ytStatus.publishAt;
      }
    }
    await saveJson(join(pkgPath, statusFile), updated);
    return updated;
  } catch (err) {
    console.warn('[upload-package] YouTube 상태 동기화 실패:', err.message);
    return {...statusData, lastSyncedAt: new Date().toISOString()};
  }
};

const getEpisodesSummary = async (forceReload = false) => {
  if (!forceReload && memoryEpisodesSummary && (Date.now() - lastEpisodesSummaryTime < 60_000)) {
    return memoryEpisodesSummary;
  }
  const episodes = [];
  if (existsSync(contentDir)) {
    const seasons = await readdir(contentDir, {withFileTypes: true});
    for (const season of seasons) {
      if (!season.isDirectory()) continue;
      const seasonPath = join(contentDir, season.name);
      const epFolders = await readdir(seasonPath, {withFileTypes: true});
      for (const ep of epFolders) {
        if (!ep.isDirectory()) continue;
        const epPath = join(seasonPath, ep.name);
        const files = await readdir(epPath);
        const epData = {
          season: season.name,
          episode: ep.name,
          tracks: {},
        };
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          try {
            const data = JSON.parse(await readFile(join(epPath, file), 'utf8'));
            const trackType = file.replace('.json', '');
            epData.tracks[trackType] = {
              file,
              contentId: data.contentId,
              status: data.status,
              classification: data.classification,
              youtube: data.youtube,
              evaluation: data.evaluation,
            };
          } catch {}
        }
        if (Object.keys(epData.tracks).length > 0) {
          episodes.push(epData);
        }
      }
    }
  }

  // HyperFrames-era 단편 에피소드는 content/<season>/<episode>/*.json 스키마를 안 쓰므로
  // 위 스캔에 안 잡힌다 — output/upload-packages/<slug>/{title,description,tags,pinned-comment}.txt를
  // 대신 읽어서 같은 모양(epData)으로 합성한다. (2026-09-04, 대시보드에 EP12가 안 보이던 문제 수정)
  const uploadPackagesDir = join(projectDir, 'output', 'upload-packages');
  if (existsSync(uploadPackagesDir)) {
    const coveredContentIds = new Set(
      episodes.flatMap((e) => Object.values(e.tracks).map((t) => t.contentId).filter(Boolean))
    );
    const pkgFolders = await readdir(uploadPackagesDir, {withFileTypes: true});
    // 쇼츠 패키지(ep24-shorts-…)는 따로 카드를 만들지 않고, 롱폼 카드를 다 모은 뒤 같은 번호 카드에 쇼츠 탭으로 붙인다.
    const shortsPackages = [];
    for (const folder of pkgFolders) {
      if (!folder.isDirectory() || coveredContentIds.has(folder.name)) continue;
      const pkgPath = join(uploadPackagesDir, folder.name);
      const titlePath = join(pkgPath, 'title.txt');
      if (!existsSync(titlePath)) continue;
      const readTextIfExists = async (name) => {
        const p = join(pkgPath, name);
        return existsSync(p) ? (await readFile(p, 'utf8')).trim() : '';
      };
      try {
        const title = await readTextIfExists('title.txt');
        if (!title) continue;
        const description = await readTextIfExists('description.txt');
        const tagsRaw = await readTextIfExists('tags.txt');
        const pinnedComment = await readTextIfExists('pinned-comment.txt');
        const timelineRaw = (await readTextIfExists('timeline.txt')) || ((description.match(/^\d+:\d+.*$/gm) || []).join('\n'));
        const epMatch = folder.name.match(/ep(\d+)/i);

        // 대시보드 A/B 시뮬레이터에서 CTR 진단까지 받은 제목 시안을 채택된 것 하나만 남기고
        // 버리지 않기 위해 title-variants.txt(있으면)를 읽어 노출한다 — 유튜브 Studio의
        // "제목 및 썸네일 테스트"는 썸네일뿐 아니라 제목도 같이 실험 대상이기 때문
        // (2026-09-18 확정, production-rules.md "업로드 패키지 변경 완료 조건" 참고).
        // 형식: "[시안ID] (메모) 제목 텍스트" 한 줄씩 — 이 패턴에 안 맞는 줄(안내 문구 등)은 무시.
        const titleVariantsRaw = await readTextIfExists('title-variants.txt');
        // ⚠️ Windows에서 저장된 파일은 줄바꿈이 \r\n이다. readTextIfExists가 파일 "전체"
        // 앞뒤 공백만 trim()하므로 마지막 줄만 우연히 trailing \r이 없어져 매칭되고, 그 앞의
        // 모든 줄(헤더는 물론 [A]/[B] 시안까지)은 줄 끝에 \r이 남아 있어 정규식의 `$`와
        // `.`(둘 다 \r을 못 건너뛴다)가 매칭에 실패해 통째로 버려지는 버그가 있었다
        // (2026-09-19 확인 — EP18에서 실제 유튜브에 올라간 제목은 [A] 시안이었는데
        // titleVariants에 [C]만 잡혀서 예약 동기화가 계속 실패했음). '\n' 대신 /\r?\n/으로
        // 쪼개 각 줄의 trailing \r을 먼저 제거해야 모든 시안이 매칭된다.
        const titleVariants = titleVariantsRaw
          ? titleVariantsRaw
              .split(/\r?\n/)
              .map((line) => line.match(/^\[([A-Za-z0-9]+)\]\s*(?:\(([^)]*)\)\s*)?(.+)$/))
              .filter(Boolean)
              .map((m) => ({id: m[1], note: m[2] || '', title: m[3].trim()}))
          : [];

        // 이 폴더 안에 실제로 있는 썸네일 후보(thumbnail-*.jpg/png)와 영상 파일(video*.mp4)을
        // 찾아서 /api/upload-package-asset/로 서빙 가능한 URL로 노출한다 — 패키지 인스펙터가
        // 텍스트뿐 아니라 실제 썸네일·영상도 보여줄 수 있게(2026-09-04, 사용자 지적으로 추가).
        const assetFiles = await readdir(pkgPath).catch(() => []);
        const thumbnailCandidates = assetFiles
          .filter((f) => /^thumbnail.*\.(jpg|jpeg|png)$/i.test(f))
          .sort()
          .map((f) => `/api/upload-package-asset/${encodeURIComponent(folder.name)}/${encodeURIComponent(f)}`);
        // 자동 업로드와 같은 규칙: 검색어로 지은 영상 파일을 video.mp4보다 먼저 고른다.
        const videoFile = selectPackageVideo(assetFiles);
        const videoAssetUrl = videoFile
          ? `/api/upload-package-asset/${encodeURIComponent(folder.name)}/${encodeURIComponent(videoFile)}`
          : null;

        // 다국어 자막·번역 메타데이터(있으면) 노출 — multilingual-metadata.json의 언어 코드별
        // {lang, title, desc}와 subtitles/subtitles-<코드>.srt 파일을 코드로 짝지어
        // 패키지 인스펙터에서 언어별 제목·설명 복사 + 자막 다운로드가 가능하게 한다
        // (2026-09-18 확정, EP17에서 사용자 지적: "자막 파일이 안 보이고 자막 나라에 적용할
        // 제목도 같이 나오게 해줘" — title-variants와 같은 이유로 파일만 있고 대시보드엔
        // 안 보이던 반쪽 완료를 막기 위해 production-rules.md에 "두 군데 다 나와야 완료"로
        // 명시해둔 규칙의 연장).
        let multilingualVariants = [];
        try {
          const metaRaw = await readTextIfExists('multilingual-metadata.json');
          if (metaRaw) {
            const meta = JSON.parse(metaRaw);
            const subtitlesDir = join(pkgPath, 'subtitles');
            const subtitleFiles = existsSync(subtitlesDir) ? await readdir(subtitlesDir).catch(() => []) : [];
            multilingualVariants = Object.entries(meta).map(([code, v]) => {
              const srtFile = subtitleFiles.find((f) => f.toLowerCase() === `subtitles-${code}.srt`.toLowerCase());
              return {
                code,
                lang: v.lang || code,
                title: v.title || '',
                desc: v.desc || '',
                srtUrl: srtFile
                  ? `/api/upload-package-asset/${encodeURIComponent(folder.name)}/subtitles/${encodeURIComponent(srtFile)}`
                  : null,
              };
            });
          }
        } catch {}

        // status.json이 있으면 예약/공개 상태를 반영한다 — 없으면 "패키지만 준비됨" 기본값.
        // 예약 시각이 지난 건에 한해 실제 유튜브 상태로 자동 동기화한다(2026-09-05 추가,
        // syncUploadPackageStatusFromYouTube 참고 — 그 전엔 예약 시각이 지나도 계속 "예약됨"으로
        // 멈춰 있는 진짜 버그였다).
        // 쇼츠 패키지는 status.json 대신 shorts-status.json을 읽고 쓴다(자동 업로드 대기열과 섞이지 않게).
        const statusSource = packageStatusSource(folder.name);
        let statusData = await loadJson(join(pkgPath, statusSource.file)) || {...statusSource.fallback};
        statusData = await syncUploadPackageStatusFromYouTube(pkgPath, statusData, title, titleVariants, statusSource.file);
        const statusLabel = packageStatusLabel(statusData);

        const track = {
          file: 'title.txt',
          contentId: folder.name,
          status: statusData.status || 'packaged',
          statusLabel,
          scheduledFor: statusData.scheduledFor || null,
          classification: null,
          youtube: {
            title,
            titleVariants,
            description,
            timeline: timelineRaw || '',
            tags: tagsRaw ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean) : [],
            pinnedComment,
            thumbnailText: [],
            thumbnailCandidates,
            multilingualVariants,
            videoAssetUrl,
            videoId: statusData.videoId || null,
            url: statusData.videoId ? `https://youtu.be/${statusData.videoId}` : null,
          },
          evaluation: null,
        };
        const shortsEpisode = shortsPackageEpisode(folder.name);
        if (shortsEpisode) {
          shortsPackages.push({episode: shortsEpisode, track});
        } else {
          episodes.push({
            season: '단편',
            episode: epMatch ? `EP${epMatch[1]}` : folder.name,
            tracks: {longform: track},
          });
        }
      } catch {}
    }
    attachShortsPackages(episodes, shortsPackages);
  }

  const sorted = episodes.sort((a, b) => {
    const numA = parseInt(a.episode.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.episode.replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });
  memoryEpisodesSummary = sorted;
  lastEpisodesSummaryTime = Date.now();
  return sorted;
};

// 아이디어 보드의 "🔄 이미 진행 중"/"✅ 이미 제작됨"/"✅ 이미 공개됨" 배지는 idea-board-history.json의
// status 필드를 그대로 보여준다(historyStatusLabel, 클라이언트 스크립트). 그런데 그 필드는 지금까지
// 사람이 업로드 체크리스트 마지막 단계에서 수동으로 갱신해야 했다 — 실제로는 이미 예약·공개까지
// 끝났는데 history 파일엔 "selected"로 남아 있어서 배지가 실제보다 뒤처진 상태를 보여주는 버그가
// 있었다(2026-09-11, EP15에서 발견: "예약까지 했는데 이미 진행중이라는 배지를 달음"). 업로드
// 패키지의 status.json(방금 위에서 YouTube로 새로 동기화된 값)이 진짜 최신 상태이므로, 그걸
// episodeSlug로 대조해서 history 쪽을 자동으로 따라가게 한다 — 뒤로 되돌리지는 않는다(이미
// published인데 무슨 이유로 package 쪽이 잠깐 이상해져도 history를 downgrade하지 않음).
const IDEA_BOARD_HISTORY_STATUS_RANK = {selected: 0, scheduled: 1, published: 2};

const syncIdeaBoardHistoryFromPackages = async () => {
  const history = await loadJson(ideaBoardHistoryPath, {schemaVersion: 1, entries: []});
  if (!history.entries?.length) return history;

  const uploadPackagesDir = join(projectDir, 'output', 'upload-packages');
  const now = new Date().toISOString();
  let changed = false;

  for (const entry of history.entries) {
    if (!entry.episodeSlug) continue;
    const pkgStatus = await loadJson(join(uploadPackagesDir, `${entry.episodeSlug}-longform`, 'status.json'));
    if (!pkgStatus) continue;

    // package.status는 'published'/'scheduled'/그 외(패키징만 됨) — scheduled인데 아직 videoId가
    // 없으면(패키지 생성 직후, 아직 업로드 전) history를 올리지 않는다.
    let targetStatus = null;
    if (pkgStatus.status === 'published') targetStatus = 'published';
    else if (pkgStatus.status === 'scheduled' && pkgStatus.videoId) targetStatus = 'scheduled';
    if (!targetStatus) continue;

    const currentRank = IDEA_BOARD_HISTORY_STATUS_RANK[entry.status] ?? -1;
    const targetRank = IDEA_BOARD_HISTORY_STATUS_RANK[targetStatus];
    if (targetRank <= currentRank) continue; // 이미 같거나 더 앞서 있음 — 뒤로 안 돌림

    entry.status = targetStatus;
    if (!entry.producedAt) entry.producedAt = now.slice(0, 10);
    changed = true;
  }

  if (changed) {
    history.updatedAt = now;
    await saveJson(ideaBoardHistoryPath, history);
  }
  return history;
};


/* Cyber-HUD Single Page Application HTML */
// 브라우저(화면) 코드에도 같은 판정 함수가 필요하다. 서버가 불러온 함수는 브라우저에 없어서(`resolveVideoFormat is not defined`로 터짐),
// 원본 함수 본문을 화면 코드 첫머리에 한 번만 끼워 넣는다. 규칙을 화면 코드에 따로 복사해 두지 않는다(2026-11-12).
const clientVideoFormatSource = `const resolveVideoFormat = ${resolveVideoFormat.toString()};`;
const pageHtml = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>IHM · YouTube Channel Lab // Cyber-HUD</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;800&family=Outfit:wght@500;700;800;900&display=swap" rel="stylesheet">
<style>
:root {
  --bg-space: #05070c;
  --bg-cockpit: #090d16;
  --bg-card: #0d1320;
  --bg-card-elevated: #131b2e;
  --border-subtle: #1a253a;
  --border-active: #2f4163;
  --accent-magenta: #ff2a6d;
  --accent-magenta-dim: rgba(255, 42, 109, 0.15);
  --accent-cyan: #00f0ff;
  --accent-cyan-dim: rgba(0, 240, 255, 0.12);
  --accent-amber: #ffd166;
  --accent-amber-dim: rgba(255, 209, 102, 0.15);
  --accent-emerald: #10b981;
  --accent-emerald-dim: rgba(16, 185, 129, 0.15);
  --accent-violet: #8b5cf6;
  --text-bright: #f8fafc;
  --text-normal: #cbd5e1;
  --text-muted: #64748b;
  --font-display: 'Outfit', 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-body: 'Inter', Pretendard, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

/* Ultra-Slim Cyber-HUD Scrollbar System */
::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 99px;
  transition: all 0.25s ease;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 240, 255, 0.45);
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
}
::-webkit-scrollbar-corner {
  background: transparent;
}
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

body {
  background-color: var(--bg-space);
  background-image: 
    radial-gradient(circle at 10% 0%, rgba(255, 42, 109, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 90% 10%, rgba(0, 240, 255, 0.07) 0%, transparent 45%),
    radial-gradient(circle at 50% 100%, rgba(139, 92, 246, 0.06) 0%, transparent 50%);
  color: var(--text-normal);
  font-family: var(--font-body);
  min-height: 100vh;
  display: flex;
  overflow-x: hidden;
}

.nav-rail {
  width: 72px;
  background: var(--bg-cockpit);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 0;
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: 100;
  flex-shrink: 0;
}
.rail-logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-magenta), #7928ca);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 900;
  font-size: 20px;
  color: #fff;
  box-shadow: 0 0 20px rgba(255, 42, 109, 0.4);
  margin-bottom: 28px;
  cursor: pointer;
}
.rail-btn {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  margin-bottom: 12px;
  position: relative;
}
.rail-btn span.label { font-size: 9px; margin-top: 3px; font-weight: 700; text-transform: uppercase; font-family: var(--font-mono); }
.rail-btn:hover { color: var(--text-bright); background: var(--bg-card-elevated); border-color: var(--border-active); }
.rail-btn.active {
  color: var(--accent-magenta);
  background: var(--accent-magenta-dim);
  border-color: var(--accent-magenta);
  box-shadow: 0 0 15px rgba(255, 42, 109, 0.3);
}
.rail-btn.active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 12px;
  bottom: 12px;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--accent-magenta);
}

.app-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 1680px;
  margin: 0 auto;
  padding: 24px 32px 80px;
}

header.cockpit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-subtle);
}
.header-left .eyebrow {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--accent-cyan);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-emerald);
  box-shadow: 0 0 10px var(--accent-emerald);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  70% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}
/* "텍스트 적용" 클릭 후 워크벤치로 자동 스크롤될 때, 뭐가 바뀌었는지 시각적으로도 알려주는
   짧은 테두리 플래시. 0.9초 후 JS가 클래스를 제거한다(youtube-analytics-server.mjs 검색:
   ab-just-applied). */
@keyframes abApplyFlash {
  0% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.9); }
  100% { box-shadow: 0 0 0 14px rgba(0, 240, 255, 0); }
}
.ab-just-applied {
  animation: abApplyFlash 0.9s ease-out;
}
h1.hero-greeting {
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 800;
  color: var(--text-bright);
  letter-spacing: -0.02em;
  margin-top: 4px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.live-clock {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  padding: 8px 14px;
  border-radius: 8px;
}

.category-tabs-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-subtle);
  width: 100%;
}
.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
  width: 100%;
  cursor: grab;
}
.category-tabs.grabbing {
  cursor: grabbing;
  user-select: none;
}
.category-tabs::-webkit-scrollbar {
  display: none;
}
.tab-scroll-btn {
  background: var(--bg-card-elevated);
  border: 1px solid var(--border-active);
  color: var(--text-bright);
  width: 32px;
  height: 38px;
  border-radius: 8px;
  display: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
  transition: all 0.2s ease;
  margin-bottom: 6px;
  flex-shrink: 0;
  font-size: 16px;
  font-weight: 900;
}
.tab-scroll-btn:hover {
  background: var(--accent-cyan-dim);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}
.tab-scroll-left { margin-right: 6px; }
.tab-scroll-right { margin-left: 6px; }
.tab-pill {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tab-pill:hover { color: var(--text-bright); border-color: var(--border-active); background: var(--bg-card-elevated); }
.tab-pill.active {
  background: linear-gradient(135deg, rgba(255, 42, 109, 0.15), rgba(0, 240, 255, 0.1));
  color: var(--text-bright);
  border-color: var(--accent-magenta);
  box-shadow: 0 0 20px rgba(255, 42, 109, 0.2);
}

.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 18px;
}
.col-12 { grid-column: span 12; }
.col-11 { grid-column: span 11; }
.col-10 { grid-column: span 10; }
.col-9  { grid-column: span 9; }
.col-8  { grid-column: span 8; }
.col-7  { grid-column: span 7; }
.col-6  { grid-column: span 6; }
.col-5  { grid-column: span 5; }
.col-4  { grid-column: span 4; }
.col-3  { grid-column: span 3; }
.col-2  { grid-column: span 2; }
.col-1  { grid-column: span 1; }

.bento-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
.bento-card:hover {
  border-color: var(--border-active);
  transform: translateY(-2px);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}
.bento-card.highlight-magenta {
  background: linear-gradient(145deg, #380718 0%, #120409 100%);
  border-color: var(--accent-magenta);
  box-shadow: 0 0 25px rgba(255, 42, 109, 0.25);
}
.bento-card.highlight-cyan {
  background: linear-gradient(145deg, #05232d 0%, #031016 100%);
  border-color: var(--accent-cyan);
  box-shadow: 0 0 25px rgba(0, 240, 255, 0.2);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.card-title {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.card-value {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 900;
  color: var(--text-bright);
  letter-spacing: -0.02em;
}
.card-subtext {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Thumbnail Styles */
.thumb-img {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  border-radius: 10px;
  background: #080d16;
  border: 1px solid var(--border-subtle);
  display: block;
}
.thumb-mini {
  width: 68px;
  height: 38px;
  border-radius: 6px;
  object-fit: cover;
  background: #080d16;
  border: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.thumb-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid var(--accent-cyan);
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.4);
  object-fit: cover;
}
.thumb-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
}
.thumb-card:hover {
  border-color: var(--border-active);
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.6);
}
.thumb-card.has-data { border-color: var(--accent-cyan); }
.thumb-card.needs-data { border-color: var(--accent-amber); background: linear-gradient(160deg, #1f1406, #0d1320); }
.thumb-card.waiting-data { opacity: 0.8; }
.thumb-body { padding: 14px; }
.monthly-pill {
  padding: 6px 10px;
  border: 1px solid #238ca4;
  border-radius: 8px;
  background: rgba(0, 240, 255, 0.08);
  color: #eafcff;
  font-size: 11px;
  font-weight: 700;
  margin-top: 6px;
}

.sparkline-svg {
  width: 100%;
  height: 48px;
  margin-top: 10px;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex-shrink: 0;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 800;
  font-family: var(--font-mono);
  letter-spacing: 0.03em;
}
.badge-strong-pass { background: var(--accent-emerald-dim); color: var(--accent-emerald); border: 1px solid var(--accent-emerald); }
.badge-pass { background: var(--accent-cyan-dim); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
.badge-hold { background: var(--accent-amber-dim); color: var(--accent-amber); border: 1px solid var(--accent-amber); }
.badge-revise { background: var(--accent-magenta-dim); color: var(--accent-magenta); border: 1px solid var(--accent-magenta); }

.btn {
  background: var(--bg-card-elevated);
  border: 1px solid var(--border-active);
  color: var(--text-bright);
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  text-decoration: none;
}
.btn:hover { background: var(--border-active); transform: translateY(-1px); }
.btn-magenta {
  background: var(--accent-magenta);
  color: #fff;
  border-color: var(--accent-magenta);
  box-shadow: 0 0 15px rgba(255, 42, 109, 0.4);
}
.btn-magenta:hover { background: #e02460; box-shadow: 0 0 25px rgba(255, 42, 109, 0.6); }
.btn-cyan {
  background: var(--accent-cyan);
  color: #031016;
  border-color: var(--accent-cyan);
  box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
}
.btn-cyan:hover { background: #00d2df; box-shadow: 0 0 25px rgba(0, 240, 255, 0.6); }
.btn-amber {
  background: var(--accent-amber);
  color: #1a1300;
  border-color: var(--accent-amber);
}
.btn-sm { padding: 6px 12px; font-size: 11px; border-radius: 6px; }

input[type=text], input[type=number], input[type=file], select {
  background: #080c14;
  border: 1px solid var(--border-subtle);
  color: var(--text-bright);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
input[type=text]:focus, input[type=number]:focus, select:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
}
input:disabled, select:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  background: #05080e;
}

.cyber-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.cyber-table th {
  color: var(--text-muted);
  font-size: 11px;
  text-transform: uppercase;
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}
.cyber-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(26, 37, 58, 0.6);
  vertical-align: middle;
}
.cyber-table tr:hover td { background: rgba(19, 27, 46, 0.4); }
.cyber-table tr.row-saved td {
  background: rgba(0, 240, 255, 0.06);
}
.right { text-align: right !important; }

.studio-thumb-preview-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.studio-thumb-mini {
  width: 52px;
  height: 30px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: #080d16;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}
.studio-thumb-mini.is-shorts {
  width: 24px;
  height: 38px;
}
.studio-thumb-preview-wrap:hover .studio-thumb-mini {
  transform: scale(1.08);
  border-color: var(--accent-cyan);
}
.studio-thumb-hover-pop {
  display: none;
  position: absolute;
  left: 60px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 99;
  background: #060910;
  border: 2px solid var(--accent-cyan);
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.85);
  pointer-events: none;
}
.studio-thumb-preview-wrap:hover .studio-thumb-hover-pop {
  display: block;
}
.studio-thumb-hover-pop img {
  display: block;
  border-radius: 6px;
  max-height: 240px;
  max-width: 320px;
  object-fit: contain;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #111a2d;
  border: 1px solid #1f3050;
  border-radius: 8px;
  color: var(--accent-cyan);
  font-size: 12px;
  font-weight: 600;
  margin: 3px 4px 3px 0;
  cursor: pointer;
  transition: all 0.2s;
}
.tag-chip:hover {
  background: var(--accent-cyan-dim);
  border-color: var(--accent-cyan);
  transform: translateY(-1px);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(3, 6, 12, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-container {
  background: var(--bg-card);
  border: 1px solid var(--border-active);
  border-radius: 20px;
  width: min(900px, 95vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.9);
  overflow: hidden;
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-body {
  padding: 24px;
  overflow-y: auto;
  line-height: 1.7;
}
.modal-close {
  background: transparent;
  border: 0;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
}
.modal-close:hover { color: var(--text-bright); }

.toast {
  position: fixed;
  bottom: 28px;
  right: 28px;
  background: var(--accent-cyan);
  color: #031016;
  padding: 14px 24px;
  border-radius: 12px;
  font-weight: 900;
  font-size: 14px;
  box-shadow: 0 10px 40px rgba(0, 240, 255, 0.4);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Smartphone Mockup Frame & Authentic YouTube Mobile UI */
.mockup-phone {
  width: 360px;
  max-width: 100%;
  height: 600px;
  background: #000;
  border: 6px solid #27272a;
  border-radius: 32px;
  overflow: hidden;
  box-shadow: 0 16px 50px rgba(0, 0, 0, 0.85), 0 0 20px rgba(0, 240, 255, 0.1);
  display: flex;
  flex-direction: column;
  position: relative;
  margin: 0 auto;
}
.mockup-phone-header {
  height: 34px;
  background: #000;
  border-bottom: 1px solid #141417;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  z-index: 10;
  flex-shrink: 0;
}
.mockup-phone-appbar {
  height: 38px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid #141417;
  flex-shrink: 0;
  z-index: 9;
}
.mockup-feed-scroll {
  flex: 1;
  overflow-y: auto;
  background: #000;
  padding-bottom: 16px;
  transition: filter 0.25s ease;
}
.mockup-phone-bottom-nav {
  height: 46px;
  background: #000;
  border-top: 1px solid #141417;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 4px;
  flex-shrink: 0;
  z-index: 10;
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #aaa;
  gap: 2px;
  cursor: pointer;
}
.nav-item.active {
  color: #fff;
  font-weight: 700;
}
.nav-item-icon {
  font-size: 15px;
  line-height: 1;
}
.nav-item-create {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #fff;
}

/* Shorts 2-Column Grid Shelf */
.shorts-shelf {
  padding: 12px 8px 14px;
  border-top: 4px solid #111;
  border-bottom: 4px solid #111;
  margin: 6px 0 12px;
  background: #000;
}
.shorts-shelf-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 4px;
}
.ab-feed-card-draggable {
  cursor: grab;
  user-select: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
}
.ab-feed-card-draggable:active {
  cursor: grabbing;
}
.ab-feed-card-draggable.is-dragging {
  opacity: 0.45;
  transform: scale(0.96);
}
.ab-feed-drop-zone {
  transition: all 0.2s ease;
}
.ab-feed-drop-zone.drag-over {
  outline: 2.5px dashed var(--accent-cyan) !important;
  outline-offset: -2px;
  background: rgba(0, 240, 255, 0.18) !important;
  transform: scale(0.98);
}
.shorts-shelf-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.shorts-card {
  position: relative;
  aspect-ratio: 9 / 16;
  border-radius: 10px;
  overflow: hidden;
  background: #111;
  box-shadow: 0 4px 14px rgba(0,0,0,0.6);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.shorts-card-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}
.shorts-card-top {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 6px 0;
}
.shorts-card-bottom {
  position: relative;
  z-index: 3;
  padding: 20px 8px 8px;
  background: linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 60%, transparent 100%);
}
.shorts-card-title {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  line-height: 1.3;
  max-height: 28px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-shadow: 0 1px 3px rgba(0,0,0,0.9);
}
.shorts-card-views {
  font-size: 9px;
  color: #ccc;
  margin-top: 3px;
  text-shadow: 0 1px 2px #000;
}

.feed-item {
  margin-bottom: 14px;
  transition: all 0.2s ease;
}
.feed-thumb-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background: #18181b;
  overflow: hidden;
}
.feed-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.feed-duration {
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 2px 5px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 4px;
}
.feed-meta {
  display: flex;
  gap: 10px;
  padding: 10px 12px 4px;
}
.feed-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #27272a;
  flex-shrink: 0;
  object-fit: cover;
}
.feed-details {
  flex: 1;
  min-width: 0;
}
.feed-title {
  color: #f1f1f1;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.feed-sub {
  color: #aaa;
  font-size: 11px;
  margin-top: 3px;
}
.vision-filter-blur {
  filter: blur(2.5px) !important;
}
.vision-filter-grayscale {
  filter: grayscale(100%) contrast(1.3) !important;
}

/* 4-Quadrant Matrix Styles */
.matrix-svg-container {
  width: 100%;
  aspect-ratio: 960 / 460;
  max-height: 480px;
  background: #080c14;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  position: relative;
  overflow: hidden;
}
.matrix-bubble {
  cursor: pointer;
  transition: stroke-width 0.15s ease, stroke 0.15s ease, filter 0.15s ease, opacity 0.15s ease;
}
.matrix-bubble:hover {
  stroke-width: 4px !important;
  stroke: #ffffff !important;
  filter: drop-shadow(0 0 12px rgba(0, 240, 255, 0.95)) !important;
  opacity: 1 !important;
}
.matrix-tooltip {
  position: absolute;
  pointer-events: none;
  z-index: 50;
  background: rgba(13, 19, 32, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid var(--accent-cyan);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7);
  border-radius: 10px;
  padding: 12px;
  width: 280px;
  display: none;
  transition: opacity 0.15s ease;
}
.quadrant-pill-q1 { background: rgba(0, 240, 255, 0.12); color: var(--accent-cyan); border: 1px solid var(--accent-cyan); }
.quadrant-pill-q2 { background: rgba(255, 209, 102, 0.15); color: var(--accent-amber); border: 1px solid var(--accent-amber); }
.quadrant-pill-q3 { background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald); border: 1px solid var(--accent-emerald); box-shadow: 0 0 12px rgba(16, 185, 129, 0.25); }
.quadrant-pill-q4 { background: rgba(139, 92, 246, 0.12); color: var(--accent-violet); border: 1px solid var(--accent-violet); }

@media(max-width: 1024px) {
  .col-8, .col-6, .col-4, .col-3 { grid-column: span 12; }
  .app-container { padding: 16px; }
}
</style>
</head>
<body>

<aside class="nav-rail">
  <div class="rail-logo" title="IHM Command Center">⚡</div>
  <button class="rail-btn active" data-tab="tab-overview" title="전체 관제 (Overview & Growth Cockpit)">
    ⚡<span class="label">Overview</span>
  </button>
  <button class="rail-btn" data-tab="tab-episodes" title="에피소드 & 업로드 패키징 (롱폼 / 쇼츠)">
    🎬<span class="label">Packages</span>
  </button>
  <button class="rail-btn" data-tab="tab-studio" title="Studio CSV CTR 트래커">
    📁<span class="label">Studio</span>
  </button>
  <button class="rail-btn" data-tab="tab-demand" title="경쟁 분석 & 시장 수요 (Market & Competitor)">
    🎯<span class="label">Market</span>
  </button>
  <button class="rail-btn" data-tab="tab-ab-simulator" title="실제 검색 피드 & 잘된 썸네일">
    📱<span class="label">Feed A/B</span>
  </button>
</aside>

<main class="app-container">
  <header class="cockpit-header">
    <div class="header-left">
      <div class="eyebrow">
        <span class="pulse-dot"></span>
        <span id="channel-status-label">IHM EASY ENGLISH // COCKPIT v3.0</span>
      </div>
      <h1 class="hero-greeting" id="hero-greeting">Good day, Creator.</h1>
      <div class="card-subtext" id="channel-meta-subtext">데이터를 불러오는 중...</div>
    </div>
    <div class="header-right" id="header-right-container">
      <div class="live-clock" id="live-clock">--:--:-- KST</div>
      <button class="btn btn-magenta btn-sm" id="btn-open-studio-rpa" style="font-weight:800;">⚡ Studio 실측 데이터 가져오기</button>
      <button class="btn btn-cyan btn-sm" id="btn-sync-global">↻ 데이터 동기화</button>
      <a class="btn btn-sm btn-amber" id="btn-reauth" href="/auth" style="display:none">🔗 채널 재연결</a>
      <a class="btn btn-sm" id="btn-logout" href="/logout" style="display:none">⎋ 로그아웃</a>
    </div>
  </header>

  <div class="category-tabs-wrapper">
    <nav class="category-tabs" id="category-tabs-nav">
      <button class="tab-pill active" data-tab="tab-overview">⚡ 전체 관제 (Overview)</button>
      <button class="tab-pill" data-tab="tab-episodes">🎬 에피소드 & 업로드 패키지</button>
      <button class="tab-pill" data-tab="tab-studio">📁 Studio CTR 트래커</button>
      <button class="tab-pill" data-tab="tab-demand">🎯 경쟁 분석 & 시장 수요</button>
      <button class="tab-pill" data-tab="tab-benchmark">💡 기획 근거 성적표</button>
      <button class="tab-pill" data-tab="tab-ab-simulator">🔍 검색 피드 & 잘된 썸네일</button>
    </nav>
  </div>

  <div id="tab-content-root">
    <div class="bento-card empty" style="text-align:center;padding:80px">
      <div class="pulse-dot" style="margin:0 auto 16px;width:16px;height:16px"></div>
      <h3>YouTube Channel Lab 데이터 초기화 중...</h3>
    </div>
  </div>
</main>

<div class="modal-overlay" id="global-modal">
  <div class="modal-container">
    <div class="modal-header">
      <h3 id="modal-title" style="font-family:var(--font-display);font-size:18px;color:var(--text-bright)">인스펙터</h3>
      <button class="modal-close" id="modal-close-btn">&times;</button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>
</div>

<script>
const fmt = new Intl.NumberFormat('ko-KR');
const sec = (n) => { n = Math.round(Number(n)||0); return Math.floor(n/60) + '분 ' + (n%60) + '초'; };
const esc = (s) => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Studio 구간 고르기: CTR이 있는 구간 중 가장 최근에 끝난 것, 같은 날 끝나면 더 긴 구간(scripts/studio-reach.mjs와 같은 규칙).
const periodSpanMs = (p) => (Date.parse((p && p.endDate) || '') - Date.parse((p && p.startDate) || '')) || 0;
const pickLatestPeriod = (periods) => Object.values(periods || {})
  .filter((p) => p && p.ctr != null)
  .sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')) || periodSpanMs(b) - periodSpanMs(a))[0] || null;

let gDashboard = null;
let gMarketDemand = null;
let gEpisodes = null;
let gEpisodeFilter = 'ALL'; // 'ALL' | 'LONGFORM' | 'SHORTS'
let gKnowledgeDb = null;
let gNextInput = null; // 다음 기획 입력 요약(/api/next-input, 2026-11-12)
let gDemandRefreshSeq = 0;
let gDemandBusyCount = 0;
let gDemandFilter = (function() {
  try { return localStorage.getItem('ihm_demand_filter') || 'ALL'; } catch (_) { return 'ALL'; }
})();
let gSelectedDemandKeyword = (function() {
  try { return localStorage.getItem('ihm_demand_selected_keyword') || ''; } catch (_) { return ''; }
})();
let gSelectedDemandChannel = (function() {
  try { return localStorage.getItem('ihm_demand_selected_channel') || ''; } catch (_) { return ''; }
})();
let gCurrentTab = (function() {
  try { return localStorage.getItem('ihm_active_tab') || 'tab-overview'; } catch (_) { return 'tab-overview'; }
})();
let gBenchmarkDnaFilter = (function() {
  try { return localStorage.getItem('ihm_benchmark_dna_filter') || 'ALL'; } catch (_) { return 'ALL'; }
})();
let gStudioFilter = (function() {
  try { return localStorage.getItem('ihm_studio_filter') || 'LONGFORM'; } catch (_) { return 'LONGFORM'; }
})();
let gStudioViewMode = (function() {
  try { return localStorage.getItem('ihm_studio_view_mode') || 'TABLE'; } catch (_) { return 'TABLE'; }
})();


/* 4-QUADRANT MATRIX STATE */
let gMatrixFormatFilter = 'ALL'; // 'ALL' | 'LONGFORM' | 'SHORTS'
let gMatrixQuadrantFilter = 'ALL'; // 'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'
// null = not manually overridden yet, so computeMatrixDataset() falls back to this channel's
// own dynamic (5%-trimmed, weighted-average) threshold instead of a hardcoded one-size-fits-all
// number (2026-10-02 fix — see the long comment inside computeMatrixDataset() for why).
let gMatrixCtrThreshold = null;
let gMatrixRetThresholdLong = null;
let gMatrixRetThresholdShorts = null;
// Side-channel for computeMatrixDataset() to publish the thresholds it actually resolved
// (user override if set, else the dynamic channel-relative value) so renderMatrixTab() can
// display/plot the real line without recomputing or threading a changed return shape through
// every call site.
let gMatrixResolvedThresholds = { ctr: 6.0, retLong: 42.0, retShorts: 70.0 };

/* 검색 피드 탭의 "보통·흐림·흑백" 보기 상태 (예전 A/B 시뮬레이터 상태는 2026-11-11에 모두 지웠다) */
let gAbVisionFilter = 'normal'; // 'normal' | 'blur' | 'grayscale' — 새 피드에서도 그대로 쓴다


function updateClock() {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  const timeStr = kst.toISOString().replace('T', ' ').slice(0, 19) + ' KST';
  const el = document.getElementById('live-clock');
  if (el) el.textContent = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

window.addEventListener('error', function(e) {
  if (e.target && e.target.tagName === 'IMG') {
    var fallback = e.target.getAttribute('data-fallback-vid');
    if (fallback) {
      e.target.removeAttribute('data-fallback-vid');
      e.target.src = 'https://i.ytimg.com/vi/' + fallback + '/mqdefault.jpg';
    }
  }
}, true);

function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = "<span>✨ " + msg + "</span>";
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(10px)";
    setTimeout(() => t.remove(), 300);
  }, 2500);
}

function copyToClipboard(text, btnElement) {
  navigator.clipboard.writeText(text).then(() => {
    showToast("클립보드에 복사되었습니다!");
    if (btnElement) {
      const orig = btnElement.innerHTML;
      btnElement.innerHTML = "✓ 복사됨";
      setTimeout(() => btnElement.innerHTML = orig, 1800);
    }
  }).catch(() => prompt("아래 내용을 복사하세요:", text));
}

function openModal(title, htmlContent) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = htmlContent;
  document.getElementById('global-modal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('global-modal').style.display = 'none';
}
document.getElementById('modal-close-btn').onclick = closeModal;
document.getElementById('global-modal').onclick = (e) => {
  if (e.target === document.getElementById('global-modal')) closeModal();
};

function generateSparklineSvg(dataPoints, strokeColor = '#ff2a6d') {
  if (!dataPoints || dataPoints.length < 2) return '';
  const max = Math.max(1, ...dataPoints);
  const min = Math.min(0, ...dataPoints);
  const range = max - min || 1;
  const width = 280;
  const height = 48;
  
  const step = width / (dataPoints.length - 1);
  const points = dataPoints.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  const areaPoints = points + ' ' + width + ',' + height + ' 0,' + height;
  const gradId = 'grad-' + Math.random().toString(36).slice(2, 8);

  return '<svg class="sparkline-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">' +
    '<defs>' +
      '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + strokeColor + '" stop-opacity="0.35"/>' +
        '<stop offset="100%" stop-color="' + strokeColor + '" stop-opacity="0.0"/>' +
      '</linearGradient>' +
    '</defs>' +
    '<polygon fill="url(#' + gradId + ')" points="' + areaPoints + '"/>' +
    '<polyline fill="none" stroke="' + strokeColor + '" stroke-width="2.2" stroke-linecap="round" points="' + points + '"/>' +
  '</svg>';
}

function switchTab(tabId) {
  gCurrentTab = tabId;
  try { localStorage.setItem('ihm_active_tab', tabId); } catch (_) {}
  document.querySelectorAll('.rail-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pill').forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  });
  renderCurrentTab();
  updateTabScrollButtons();
}

function initCategoryTabsInteractions() {
  const tabsNav = document.getElementById('category-tabs-nav');
  const btnLeft = document.getElementById('btn-tab-scroll-left');
  const btnRight = document.getElementById('btn-tab-scroll-right');
  if (!tabsNav) return;

  // 1. Mouse Wheel Scroll (vertical wheel scrolls horizontally)
  tabsNav.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      tabsNav.scrollLeft += e.deltaY * 0.9;
      updateTabScrollButtons();
    }
  }, { passive: false });

  // 2. Drag to Scroll
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;

  tabsNav.addEventListener('mousedown', (e) => {
    isDown = true;
    tabsNav.classList.add('grabbing');
    startX = e.pageX - tabsNav.offsetLeft;
    scrollStart = tabsNav.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (isDown) {
      isDown = false;
      tabsNav.classList.remove('grabbing');
    }
  });

  tabsNav.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - tabsNav.offsetLeft;
    const walk = (x - startX) * 1.5;
    tabsNav.scrollLeft = scrollStart - walk;
    updateTabScrollButtons();
  });

  // 3. Arrow buttons
  if (btnLeft) {
    btnLeft.onclick = () => {
      tabsNav.scrollBy({ left: -220, behavior: 'smooth' });
      setTimeout(updateTabScrollButtons, 300);
    };
  }
  if (btnRight) {
    btnRight.onclick = () => {
      tabsNav.scrollBy({ left: 220, behavior: 'smooth' });
      setTimeout(updateTabScrollButtons, 300);
    };
  }

  tabsNav.addEventListener('scroll', updateTabScrollButtons);
  window.addEventListener('resize', updateTabScrollButtons);
  updateTabScrollButtons();
}

function updateTabScrollButtons() {
  const tabsNav = document.getElementById('category-tabs-nav');
  const btnLeft = document.getElementById('btn-tab-scroll-left');
  const btnRight = document.getElementById('btn-tab-scroll-right');
  if (!tabsNav || !btnLeft || !btnRight) return;

  const isOverflowing = tabsNav.scrollWidth > tabsNav.clientWidth + 4;
  if (!isOverflowing) {
    btnLeft.style.display = 'none';
    btnRight.style.display = 'none';
    return;
  }

  btnLeft.style.display = tabsNav.scrollLeft > 10 ? 'flex' : 'none';
  btnRight.style.display = (tabsNav.scrollLeft + tabsNav.clientWidth < tabsNav.scrollWidth - 10) ? 'flex' : 'none';
}

document.querySelectorAll('.rail-btn, .tab-pill').forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
});

document.addEventListener('click', (e) => {
  const copyBtn = e.target.closest('.btn-copy-text');
  if (copyBtn && copyBtn.dataset.text) {
    copyToClipboard(decodeURIComponent(copyBtn.dataset.text), copyBtn);
    return;
  }
  const viewRepBtn = e.target.closest('.btn-view-report');
  if (viewRepBtn && viewRepBtn.dataset.file) {
    viewSavedReportDetail(viewRepBtn.dataset.file);
    return;
  }
  const viewScriptBtn = e.target.closest('.btn-view-script-report');
  if (viewScriptBtn && viewScriptBtn.dataset.file) {
    viewSavedScriptReportDetail(viewScriptBtn.dataset.file);
    return;
  }
  const tabBtn = e.target.closest('.btn-open-tab');
  if (tabBtn && tabBtn.dataset.targetTab) {
    switchTab(tabBtn.dataset.targetTab);
    return;
  }
  const viewCommentReportBtn = e.target.closest('.btn-outlier-view-comment');
  if (viewCommentReportBtn && viewCommentReportBtn.dataset.file) {
    viewSavedReportDetail(viewCommentReportBtn.dataset.file);
    return;
  }
  const viewScriptReportBtn = e.target.closest('.btn-outlier-view-script');
  if (viewScriptReportBtn && viewScriptReportBtn.dataset.file) {
    viewSavedScriptReportDetail(viewScriptReportBtn.dataset.file);
    return;
  }
  const inspectPkgBtn = e.target.closest('.btn-inspect-pkg');
  if (inspectPkgBtn && inspectPkgBtn.dataset.season && inspectPkgBtn.dataset.ep) {
    const epData = (Array.isArray(gEpisodes) ? gEpisodes : []).find(x => x.season === inspectPkgBtn.dataset.season && x.episode === inspectPkgBtn.dataset.ep);
    if (epData) {
      openEpisodeInspectorModal(epData);
      return;
    }
  }
});

async function loadAll() {
  try {
    const [dashRes, demandRes, epRes, kdbRes] = await Promise.all([
      fetch('/api/dashboard'),
      fetch('/api/market-demand'),
      fetch('/api/episodes/summary'),
      fetch('/api/knowledge-db'),
    ]);

    gMarketDemand = demandRes.ok ? await demandRes.json() : null;
    const epJson = epRes.ok ? await epRes.json() : [];
    gEpisodes = Array.isArray(epJson) ? epJson : [];
    gKnowledgeDb = kdbRes.ok ? await kdbRes.json() : null;
    // 다음 기획 입력 요약은 화면을 늦추지 않게 따로 불러와서, 오면 전체 관제 탭을 다시 그린다.
    fetch('/api/next-input').then(r => r.ok ? r.json() : null).then(j => {
      gNextInput = j;
      if (gCurrentTab === 'tab-overview' && gDashboard) renderCurrentTab();
    }).catch(() => {});

    if (dashRes.status === 401) {
      renderAuthRequired();
      return;
    }

    if (!dashRes.ok) {
      const errData = await dashRes.json().catch(() => ({}));
      throw new Error(errData.error || ('대시보드 데이터를 불러오지 못했습니다 (상태 코드: ' + dashRes.status + ')'));
    }
    
    gDashboard = await dashRes.json();

    if (gDashboard?.channel) {
      const syncTimeStr = gDashboard.syncedAt ? ('최근 동기화: ' + new Date(gDashboard.syncedAt).toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit'})) : '동기화 완료';
      const isCached = gDashboard.isOffline ? ' (오프라인 모드)' : (' (' + syncTimeStr + ')');
      document.getElementById('hero-greeting').textContent = 'Welcome back, ' + (gDashboard.channel.title || 'Creator') + '.';
      document.getElementById('channel-meta-subtext').innerHTML = 
        '<span>구독자 <b>' + fmt.format(gDashboard.channel.subscribers || 0) + '명</b></span> · ' +
        '<span>총 조회수 <b>' + fmt.format(gDashboard.channel.totalViews || 0) + '회</b></span> · ' +
        '<span>분석 기간: ' + esc(gDashboard.range?.startDate || '') + ' ~ ' + esc(gDashboard.range?.endDate || '') + '</span>' +
        '<span style="color:var(--accent-cyan);margin-left:6px">' + isCached + '</span>';
      
      const hr = document.getElementById('header-right-container');
      if (hr && gDashboard.channel.thumbnail && !document.getElementById('channel-avatar-img')) {
        const img = document.createElement('img');
        img.id = 'channel-avatar-img';
        img.className = 'thumb-avatar';
        img.src = gDashboard.channel.thumbnail;
        img.alt = '';
        hr.insertBefore(img, hr.firstChild);
      }
      if (gDashboard.isOffline) {
        const reauthBtn = document.getElementById('btn-reauth');
        if (reauthBtn) reauthBtn.style.display = 'inline-flex';
      }
      document.getElementById('btn-logout').style.display = 'inline-flex';
    }

    document.querySelectorAll('.rail-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === gCurrentTab);
    });
    document.querySelectorAll('.tab-pill').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === gCurrentTab);
    });
    renderCurrentTab();
  } catch (err) {
    document.getElementById('tab-content-root').innerHTML = '<div class="bento-card" style="color:#ff7676;padding:40px">❌ 데이터 로드 오류: ' + esc(err.message) + '</div>';
  }
}

function renderAuthRequired() {
  document.getElementById('hero-greeting').textContent = 'YouTube 계정 연결 필요';
  document.getElementById('tab-content-root').innerHTML = 
    '<div class="bento-card highlight-cyan" style="text-align:center;padding:60px 20px">' +
      '<h2 style="font-family:var(--font-display);font-size:26px;color:var(--text-bright);margin-bottom:12px">⚡ YouTube Channel Lab 연결</h2>' +
      '<p style="color:var(--text-normal);max-width:540px;margin:0 auto 24px;line-height:1.6">Google OAuth로 채널을 연결하면 실시간 조회수, 시청 지속률, 48시간 사후 평가 및 아웃라이어 댓글 AI 분석을 자유롭게 사용할 수 있습니다.</p>' +
      '<a class="btn btn-cyan" href="/auth" style="font-size:15px;padding:12px 28px">🔗 YouTube 채널 연동 시작하기</a>' +
    '</div>';
}

function renderCurrentTab() {
  const root = document.getElementById('tab-content-root');
  if (!root) return;

  try {
    switch(gCurrentTab) {
      case 'tab-overview':
        root.innerHTML = renderOverviewTab();
        bindOverviewEvents();
        break;
      case 'tab-episodes':
        root.innerHTML = renderEpisodesTab();
        bindEpisodeEvents();
        break;
      case 'tab-studio':
        root.innerHTML = renderStudioTab();
        bindStudioEvents();
        break;
      case 'tab-demand':
      case 'tab-outlier':
        root.innerHTML = renderMarketDemandTab();
        bindMarketDemandEvents();
        break;
      case 'tab-benchmark':
        root.innerHTML = renderBenchmarkTab();
        bindBenchmarkEvents();
        break;
      case 'tab-ab-simulator':
        root.innerHTML = renderAbSimulatorTab();
        bindAbSimulatorEvents();
        break;
      default:
        root.innerHTML = renderOverviewTab();
        bindOverviewEvents();
    }
  } catch (err) {
    console.error('Tab render error:', err);
    root.innerHTML = '<div class="bento-card" style="padding:40px; color:var(--accent-magenta); text-align:center;">' +
      '<h3>⚠️ 탭 렌더링 중 오류가 발생했습니다</h3>' +
      '<p style="color:var(--text-normal); margin-top:8px;">' + esc(err.message) + '</p>' +
      '<button class="btn btn-cyan btn-open-tab" data-target-tab="tab-overview" style="margin-top:16px;">⚡ 전체 관제 탭으로 돌아가기</button>' +
    '</div>';
  }
}

/* 다음 기획 입력 요약 카드 (2026-11-12, 읽기 전용)
   매일 루프가 만드는 data/youtube/next-episode-input.md와 같은 계산(/api/next-input)을 짧게 보여 준다.
   숫자는 서버가 실제 파일에서 계산한 값을 그대로 쓰고, 표본이 작으면 가설이라고 붙인다. */
function renderNextInputCard() {
  const n = gNextInput;
  const head = '<div class="card-header"><span class="card-title">🧭 다음 기획 입력</span><span class="badge badge-hold">매일 새벽 1시 자동</span></div>';
  if (!n) return '<div class="bento-card col-12">' + head + '<div class="card-subtext">불러오는 중이거나 아직 없습니다.</div></div>';
  const outcomes = n.outcomes || [];
  const count = (v) => outcomes.filter(o => o.verdict === v).length;
  const items = [];
  items.push('판정 ' + outcomes.length + '편: 통함 ' + count('worked') + ' · 보통 ' + count('neutral') + ' · 안 통함 ' + count('failed') + ' · 보류 ' + count('hold') + ' · 집계 전 ' + count('pending') + (count('worked') + count('failed') === 0 ? ' — 아직 확정 판정이 없어 표본을 쌓는 중' : ''));
  const traitCount = (list, key) => (list || []).filter(v => v.traits && v.traits[key]).length;
  [['LONGFORM', '롱폼'], ['SHORTS', '쇼츠']].forEach(([key, label]) => {
    const c = (n.comparisons || {})[key];
    if (!c) return;
    if (c.status !== 'ok') { items.push(label + ': 비교 보류 (' + esc(c.reason || '') + ')'); return; }
    items.push(label + ' 최근 ' + c.count + '편, 7일 조회 중앙값 ' + fmt.format(c.medianViews7d) + '회' +
      (c.smallSample ? ' <span class="badge badge-hold" style="font-size:10px">작은 표본 · 가설</span>' : '') +
      ' — 상위 3편 / 하위 3편: 물음표 제목 ' + traitCount(c.top, 'question') + '/' + traitCount(c.bottom, 'question') +
      ', 영어로 시작 ' + traitCount(c.top, 'startsWithEnglish') + '/' + traitCount(c.bottom, 'startsWithEnglish'));
  });
  const q = ((n.audience || {}).question || [])[0];
  if (q) items.push('경쟁 영상 시청자 질문 1위: "' + esc(String(q.text).slice(0, 70)) + '" (경쟁 영상 ' + q.videoCount + '개)');
  const r = (n.outlierReports || [])[0];
  if (r) items.push('관찰한 경쟁 영상 ' + (n.outlierReports || []).length + '편 · 1위: <a href="/outlier-report/' + encodeURIComponent(r.videoId) + '" target="_blank" rel="noopener" style="color:var(--accent-amber)">' + esc(String(r.title || r.videoId).slice(0, 40)) + '</a> (평소의 ' + Math.round(r.outlierRatio || 0) + '배)');
  const when = n.fileGeneratedAt ? ('파일 ' + new Date(n.fileGeneratedAt).toLocaleString('ko-KR', {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'}) + ' · 이 카드는 지금 데이터로 다시 계산') : '파일 아직 없음 · 이 카드는 지금 데이터로 계산';
  return '<div class="bento-card col-12">' + head +
    '<ul style="margin:8px 0 0 18px;padding:0;line-height:1.8;font-size:13px;color:var(--text-normal)">' + items.map(t => '<li>' + t + '</li>').join('') + '</ul>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">' +
      '<a class="btn btn-sm btn-cyan" href="/transform-sheets" target="_blank" rel="noopener">📝 비교 시트 →</a>' +
      '<a class="btn btn-sm" href="/next-input" target="_blank" rel="noopener">전체 보기 →</a>' +
      '<a class="btn btn-sm" href="/visual-library" target="_blank" rel="noopener">📸 연출 자료집 →</a>' +
      '<span class="card-subtext" style="margin-left:auto">' + esc(when) + '</span>' +
    '</div></div>';
}

/* TAB 1: OVERVIEW COCKPIT */
function renderOverviewTab() {
  if (!gDashboard) {
    return '<div class="bento-card" style="padding:40px;text-align:center"><h3>YouTube 데이터를 불러오는 중입니다...</h3></div>';
  }
  const d = gDashboard;
  const summary = d.summary || {};
  const daily = d.daily || [];
  const dailyViews = daily.map(x => Number(x.views) || 0);
  const bestVideo = [...(d.topVideos || [])].sort((a,b) => (b.subscribersPerThousandViews || 0) - (a.subscribersPerThousandViews || 0))[0];

  const types = Object.fromEntries((d.contentTypes || []).map(x => [String(x.creatorContentType).toLowerCase(), x]));
  const shorts = types.shorts || {};
  const vod = types.videoondemand || {};

  // 다음 업로드 대기/예약 패키지가 있으면 전체 관제 탭 최상단에 눈에 띄게 배치한다 (2026-09-17)
  // ⚠️ 예전엔 두 번째 fallback이 lf.status === 'scheduled'이기만 하면(이미 실제로 예약
  // 완료돼 videoId까지 있어도) 무조건 "업로드 대기"로 잡아버리는 버그가 있었다(2026-09-19
  // 확인 — EP16을 실제로 예약해도 동기화 후에도 계속 "업로드 대기"로 보이는 원인이었음).
  // "대기"는 정말 로컬 패키징만 끝나고 아직 유튜브에 아무것도 안 올라간 상태(ready_to_upload/
  // packaged, 또는 scheduled인데 videoId가 없는 경우)에만 해당해야 하므로 fallback을 없앴다.
  const epList = Array.isArray(gEpisodes) ? gEpisodes : [];
  const readyEpisode = epList.find(e => {
    const lf = e.tracks?.longform;
    return lf && (lf.status === 'ready_to_upload' || lf.status === 'packaged' || (lf.status === 'scheduled' && !lf.youtube?.url));
  });

  let readyBannerHtml = '';
  if (readyEpisode) {
    const lf = readyEpisode.tracks?.longform || {};
    const yt = lf.youtube || {};
    const thumb = (yt.thumbnailCandidates && yt.thumbnailCandidates[0]) || (yt.videoId ? ('https://i.ytimg.com/vi/' + yt.videoId + '/mqdefault.jpg') : '');
    const hasCandidate = (yt.thumbnailCandidates && yt.thumbnailCandidates.length > 0);
    const isPrivate = !!yt.videoId;
    // 예전엔 이 배너가 EP16 하나를 염두에 두고 만들어져서 날짜·길이·썸네일 시안 설명이
    // 전부 EP16 값으로 하드코딩돼 있었다 — 그래서 실제로는 다른 에피소드(예: EP18)가 이
    // 배너에 뜨는데도 "2026-09-20", "6분 45초", "시안 A" 같은 EP16 문구가 그대로 나오는
    // 버그가 있었다(2026-09-19 확인). lf.statusLabel(서버가 이미 계산해 둔 "예약 권장:
    // MM/DD(요일) HH:MM KST" 문자열)을 그대로 재사용해 항상 그 에피소드 실제 값과 맞게 한다.
    const scheduleDateText = (lf.statusLabel && lf.statusLabel.split('예약 권장: ')[1]) || '미정';

    readyBannerHtml = 
      '<div class="bento-card col-12" style="background:linear-gradient(135deg, rgba(0,240,255,0.09) 0%, rgba(13,19,32,0.95) 60%, rgba(255,42,109,0.08) 100%); border:1.5px solid var(--accent-cyan); box-shadow:0 0 25px rgba(0,240,255,0.14); padding:20px 24px; margin-bottom:16px; display:flex; flex-direction:column; gap:16px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">' +
          '<div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">' +
            '<span class="pulse-dot" style="background:var(--accent-cyan); box-shadow:0 0 12px var(--accent-cyan); width:10px; height:10px; border-radius:50%; display:inline-block;"></span>' +
            '<span class="card-title" style="color:var(--accent-cyan); font-weight:800; letter-spacing:0.8px; margin:0;">🚀 최신 제작 · 다음 업로드 대기 패키지</span>' +
            '<span class="badge" style="background:rgba(0,240,255,0.18); border-color:var(--accent-cyan); color:#fff; font-weight:800; font-size:11px;">' + esc(readyEpisode.season) + ' · ' + esc(readyEpisode.episode) + '</span>' +
            '<span class="badge" style="background:rgba(255,209,102,0.15); border-color:var(--accent-amber); color:var(--accent-amber); font-weight:800; font-size:11px;">📅 공개 예약 권장: ' + esc(scheduleDateText) + '</span>' +
          '</div>' +
          '<div style="display:flex; align-items:center; gap:8px;">' +
            (isPrivate ? '<span class="badge" style="background:rgba(16,185,129,0.15); border-color:var(--accent-emerald); color:var(--accent-emerald); font-size:11px; font-weight:700;">🔒 YouTube 비공개 업로드됨 (' + esc(yt.videoId) + ')</span>' : '<span class="badge badge-hold" style="font-size:11px;">📦 로컬 패키징 완료</span>') +
          '</div>' +
        '</div>' +

        '<div style="display:flex; gap:20px; align-items:center; flex-wrap:wrap;">' +
          (thumb ? 
            '<div style="position:relative; flex-shrink:0;">' +
              '<img src="' + esc(thumb) + '" style="width:240px; height:135px; object-fit:cover; border-radius:10px; border:1px solid var(--border-active); box-shadow:0 6px 18px rgba(0,0,0,0.6); display:block;" alt="">' +
              (hasCandidate ? '<span style="position:absolute; bottom:8px; right:8px; background:rgba(0,0,0,0.75); color:var(--accent-cyan); font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; border:1px solid var(--accent-cyan);">썸네일 시안 A</span>' : '') +
            '</div>' : '') +

          '<div style="flex:1; min-width:300px;">' +
            '<h3 style="font-family:var(--font-display); font-size:19px; font-weight:800; color:#fff; line-height:1.45; margin-bottom:8px;">' + esc(yt.title || '(제목 미지정)') + '</h3>' +
            '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px;">' +
              '<span class="tag-chip" style="font-size:11px; border-color:rgba(0,240,255,0.4); color:var(--accent-cyan);">🎬 롱폼</span>' +
              '<span class="tag-chip" style="font-size:11px;">🎯 타겟: 3060 왕초보 파닉스</span>' +
              '<span class="tag-chip" style="font-size:11px;">💬 고정 댓글 1종</span>' +
              '<span class="tag-chip" style="font-size:11px;">🏷️ 태그 ' + ((yt.tags && yt.tags.length) || 20) + '개</span>' +
              (hasCandidate ? '<span class="tag-chip" style="font-size:11px; border-color:var(--accent-emerald); color:var(--accent-emerald);">🖼️ 썸네일 3종 완료</span>' : '') +
            '</div>' +
            '<div style="font-size:12px; color:var(--text-muted); line-height:1.5; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">' +
              '📝 ' + esc((yt.description || '').slice(0, 160)) + '...' +
            '</div>' +
          '</div>' +

          '<div style="display:flex; flex-direction:column; gap:8px; flex-shrink:0; min-width:200px;">' +
            '<button class="btn btn-magenta btn-inspect-pkg" data-season="' + esc(readyEpisode.season) + '" data-ep="' + esc(readyEpisode.episode) + '" style="padding:10px 16px; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; gap:6px;">' +
              '📦 1-Click 업로드 패키지 열기' +
            '</button>' +
            '<a class="btn btn-outline" href="/api/upload-package-asset/' + encodeURIComponent(lf.contentId || '') + '/index.html" target="_blank" style="padding:8px 14px; font-size:12px; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">' +
              '📄 패키지 요약 창 열기 ↗' +
            '</a>' +
            (isPrivate ? 
              '<a class="btn btn-cyan" href="https://studio.youtube.com/video/' + encodeURIComponent(yt.videoId) + '/edit" target="_blank" style="padding:8px 14px; font-size:12px; text-align:center; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:6px;">' +
                '🎬 Studio에서 세부정보 입력 ↗' +
              '</a>' : '') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // 🧭 주간 브리핑 & 목표 계산 (growth-rules.mjs 공식과 연동)
  const dailyRows = d.daily || [];
  const current7 = dailyRows.slice(-7);
  const prev7 = dailyRows.slice(-14, -7);
  const c7Views = current7.reduce((sum, r) => sum + (Number(r.views) || 0), 0);
  const p7Views = prev7.reduce((sum, r) => sum + (Number(r.views) || 0), 0);
  const c7SubsNet = current7.reduce((sum, r) => sum + ((Number(r.subscribersGained) || 0) - (Number(r.subscribersLost) || 0)), 0);
  const deltaViews = c7Views - p7Views;
  const deltaViewsSign = deltaViews >= 0 ? '+' + fmt.format(deltaViews) : fmt.format(deltaViews);
  const viewGoalPct = Math.min(100, Math.round((c7Views / 1000) * 100));
  const subGoalPct = Math.min(100, Math.round((Math.max(0, c7SubsNet) / 3) * 100));

  const t7 = d.trafficSources7d?.rows || [];
  const shortsFeedViews = t7.filter(r => r.insightTrafficSourceType === 'SHORTS').reduce((s, r) => s + (Number(r.views) || 0), 0);
  const linkViews = t7.filter(r => ['RELATED_VIDEO', 'EXT_URL', 'NOTIFICATION', 'END_SCREEN'].includes(r.insightTrafficSourceType)).reduce((s, r) => s + (Number(r.views) || 0), 0);

  const nowMs = Date.now();
  const recentPubs = (d.videoPerformance || []).filter(v => {
    const pub = Date.parse(v.publishedAt);
    return pub && (nowMs - pub) <= 14 * 86400000;
  }).slice(0, 3);

  const briefingCockpitHtml = 
    '<div class="bento-card col-12" style="background:linear-gradient(135deg, rgba(16,22,34,0.95) 0%, rgba(10,14,24,0.98) 100%);border:1px solid rgba(0,240,255,0.3);border-radius:14px;padding:22px;margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<span style="font-size:20px;">🧭</span>' +
          '<span class="card-title" style="color:var(--accent-cyan);font-weight:800;font-size:16px;margin:0;">주간 성장 브리핑 & 목표 현황판 (Weekly Growth Cockpit)</span>' +
          '<span class="badge badge-pass" style="font-size:11px;">최근 7일 vs 지난주 실측</span>' +
        '</div>' +
        '<div class="card-subtext" style="font-size:12px;">주간 목표: 조회수 1,000회 · 신규 구독 3명</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;margin-bottom:16px;">' +
        '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:10px;padding:14px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px;">' +
            '<span>주간 조회수 목표 (1,000회)</span>' +
            '<b style="color:var(--accent-cyan);">' + viewGoalPct + '%</b>' +
          '</div>' +
          '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:8px;">' + fmt.format(c7Views) + '회 <span style="font-size:12px;font-weight:600;color:' + (deltaViews >= 0 ? 'var(--accent-emerald)' : 'var(--accent-red)') + '">(' + deltaViewsSign + ' vs 지난주)</span></div>' +
          '<div style="height:6px;background:#090d16;border-radius:99px;overflow:hidden;">' +
            '<div style="height:100%;width:' + viewGoalPct + '%;background:var(--accent-cyan);border-radius:99px;"></div>' +
          '</div>' +
        '</div>' +

        '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:10px;padding:14px;">' +
          '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-muted);margin-bottom:6px;">' +
            '<span>주간 구독 순증 (+3명)</span>' +
            '<b style="color:var(--accent-magenta);">' + subGoalPct + '%</b>' +
          '</div>' +
          '<div style="font-size:20px;font-weight:800;color:#fff;margin-bottom:8px;">+' + c7SubsNet + '명 <span style="font-size:12px;font-weight:600;color:var(--text-muted);">(목표 3명)</span></div>' +
          '<div style="height:6px;background:#090d16;border-radius:99px;overflow:hidden;">' +
            '<div style="height:100%;width:' + subGoalPct + '%;background:var(--accent-magenta);border-radius:99px;"></div>' +
          '</div>' +
        '</div>' +

        '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:10px;padding:14px;">' +
          '<div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">쇼츠 ➔ 롱폼 플라이휠 (최근 7일)</div>' +
          '<div style="font-size:15px;font-weight:700;color:#fff;margin-bottom:4px;">쇼츠 피드: <b>' + fmt.format(shortsFeedViews) + '</b>회</div>' +
          '<div style="font-size:13px;color:var(--accent-cyan);">링크 전환: <b>' + fmt.format(linkViews) + '</b>회 (' + (shortsFeedViews > 0 ? ((linkViews/shortsFeedViews)*100).toFixed(2) : '0') + '%)</div>' +
        '</div>' +
      '</div>' +

      (recentPubs.length > 0 ? 
        '<div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;">' +
          '<div style="font-size:12px;font-weight:700;color:var(--accent-amber);margin-bottom:10px;">⚡ 최근 공개 영상 성적 (골든타임 추적)</div>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
            recentPubs.map(v => {
              const daysAgo = Math.max(0, Math.floor((nowMs - Date.parse(v.publishedAt)) / 86400000));
              return '<div style="flex:1;min-width:260px;background:rgba(0,0,0,0.3);border:1px solid var(--border-subtle);border-radius:8px;padding:10px 14px;">' +
                '<div style="font-size:13px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(v.title) + '</div>' +
                '<div style="display:flex;gap:10px;margin-top:6px;font-size:12px;color:var(--text-muted);">' +
                  '<span class="badge ' + (daysAgo <= 2 ? 'badge-amber' : 'badge-pass') + '" style="font-size:10px;">' + (daysAgo === 0 ? '오늘' : daysAgo + '일차') + '</span>' +
                  '<span>조회 <b>' + fmt.format(v.views || 0) + '</b>회</span>' +
                  '<span>시청률 <b>' + Number(v.averageViewPercentage || 0).toFixed(1) + '%</b></span>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' : '') +
    '</div>';

  let html = '<div class="bento-grid">' +
    readyBannerHtml +
    briefingCockpitHtml +
    renderNextInputCard() +
    '<div class="bento-card col-3">' +
      '<div class="card-header"><span class="card-title">총 조회수 (Views)</span><span class="badge badge-pass">90D</span></div>' +
      '<div class="card-value">' + fmt.format(summary.views || 0) + '</div>' +
      '<div class="card-subtext">일평균 ' + fmt.format(Math.round((summary.views||0)/Math.max(1, daily.length))) + '회</div>' +
      generateSparklineSvg(dailyViews.slice(-20), '#00f0ff') +
    '</div>' +

    '<div class="bento-card col-3">' +
      '<div class="card-header"><span class="card-title">시청 시간 (Watch Time)</span><span class="badge badge-strong-pass">HOURS</span></div>' +
      '<div class="card-value">' + fmt.format(Math.round((summary.estimatedMinutesWatched || 0)/60)) + '<span style="font-size:18px;margin-left:4px">시간</span></div>' +
      '<div class="card-subtext">총 ' + fmt.format(summary.estimatedMinutesWatched || 0) + ' 분 시청</div>' +
      generateSparklineSvg(daily.map(x => Number(x.estimatedMinutesWatched)||0).slice(-20), '#10b981') +
    '</div>' +

    '<div class="bento-card col-3">' +
      '<div class="card-header"><span class="card-title">평균 시청 지속 시간</span><span class="badge badge-hold">AVG RETENTION</span></div>' +
      '<div class="card-value">' + sec(summary.averageViewDuration) + '</div>' +
      '<div class="card-subtext">평균 시청률 <b>' + Number(summary.averageViewPercentage || 0).toFixed(1) + '%</b></div>' +
      // 일별 평균 시청 시간(초) = 시청 분 × 60 ÷ 조회수. 2026-11-12까지는 "조회수 % 50 + 40"이라는 의미 없는 값으로 그려져 있었다.
      generateSparklineSvg(daily.filter(x => Number(x.views) > 0).map(x => Number(x.estimatedMinutesWatched || 0) * 60 / Number(x.views)).slice(-20), '#ffd166') +
    '</div>' +

    '<div class="bento-card col-3">' +
      '<div class="card-header"><span class="card-title">구독자 순증</span><span class="badge badge-strong-pass">NET GAINED</span></div>' +
      '<div class="card-value">+' + fmt.format((summary.subscribersGained || 0) - (summary.subscribersLost || 0)) + '</div>' +
      '<div class="card-subtext">획득 ' + fmt.format(summary.subscribersGained || 0) + ' · 이탈 ' + fmt.format(summary.subscribersLost || 0) + '</div>' +
      generateSparklineSvg(daily.map(x => Math.max(0, (Number(x.subscribersGained)||0) - (Number(x.subscribersLost)||0))).slice(-20), '#ff2a6d') +
    '</div>' +

    (bestVideo ? 
      '<div class="bento-card highlight-magenta col-12" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px">' +
        '<div style="display:flex;gap:18px;align-items:center;flex:1;min-width:300px">' +
          (bestVideo.thumbnail || bestVideo.videoId ? 
            '<img class="thumb-img" style="width:220px;height:124px;flex-shrink:0" src="' + esc(bestVideo.thumbnail || 'https://i.ytimg.com/vi/' + bestVideo.videoId + '/mqdefault.jpg') + '" alt="">' : '') +
          '<div>' +
            '<div class="card-header"><span class="card-title" style="color:#ffc2d4">🔥 구독 전환 최고 성과 영상 (Signature Asset)</span></div>' +
            '<div style="font-family:var(--font-display);font-size:20px;font-weight:800;color:#fff;margin-bottom:6px">' + esc(bestVideo.title) + '</div>' +
            '<div class="card-subtext" style="color:#ffccd9">1,000뷰당 구독자 <b>+' + Number(bestVideo.subscribersPerThousandViews || 0).toFixed(1) + '명</b> 전환 · 총 조회수 ' + fmt.format(bestVideo.views) + '회</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px">' +
          '<a class="btn btn-magenta" href="' + esc(bestVideo.url) + '" target="_blank">🎬 YouTube 재생</a>' +
          '<button class="btn btn-sm btn-open-tab" data-target-tab="tab-demand">🎯 시장 수요 & 아웃라이어 열기</button>' +
        '</div>' +
      '</div>' : '') +

    '<div class="bento-card col-8">' +
      '<div class="card-header">' +
        '<span class="card-title">영상별 실시간 성장 기여도 (Top Assets)</span>' +
        '<span class="badge badge-pass">PERFORMANCE</span>' +
      '</div>' +
      '<div style="overflow-x:auto">' +
        '<table class="cyber-table">' +
          '<thead><tr><th>영상 제목</th><th>형식</th><th class="right">조회수</th><th class="right">평균시청률</th><th class="right">구독순증</th><th class="right">1천뷰당구독</th></tr></thead>' +
          '<tbody>' +
            (d.topVideos || []).slice(0, 8).map(v => {
              const thumb = v.thumbnail || (v.videoId ? 'https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg' : '');
              return '<tr>' +
                '<td><div style="display:flex;align-items:center;gap:10px">' +
                  (thumb ? '<img class="thumb-mini" src="' + esc(thumb) + '" alt="">' : '') +
                  '<div style="min-width:0;font-weight:700">' + esc(v.title) + '</div>' +
                '</div></td>' +
                '<td><span class="tag-chip" style="font-size:10px">' + (v.creatorContentType === 'SHORTS' ? '쇼츠' : '롱폼') + '</span></td>' +
                '<td class="right"><b>' + fmt.format(v.views || 0) + '</b></td>' +
                '<td class="right">' + Number(v.averageViewPercentage || 0).toFixed(1) + '%</td>' +
                '<td class="right"><span style="color:var(--accent-emerald)">+' + fmt.format(v.subscriberNet || 0) + '</span></td>' +
                '<td class="right"><b>' + Number(v.subscribersPerThousandViews || 0).toFixed(1) + '</b></td>' +
              '</tr>';
            }).join('') +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +

    '<div class="bento-card col-4">' +
      '<div class="card-header"><span class="card-title">쇼츠 vs 롱폼 성과 비교</span></div>' +
      '<table class="cyber-table">' +
        '<thead><tr><th>포맷</th><th class="right">조회수</th><th class="right">구독순증</th></tr></thead>' +
        '<tbody>' +
          '<tr><td><b>쇼츠 (Shorts)</b></td><td class="right"><b>' + fmt.format(shorts.views || 0) + '</b></td><td class="right">+' + fmt.format((shorts.subscribersGained||0)-(shorts.subscribersLost||0)) + '</td></tr>' +
          '<tr><td><b>롱폼 (Longform)</b></td><td class="right"><b>' + fmt.format(vod.views || 0) + '</b></td><td class="right">+' + fmt.format((vod.subscribersGained||0)-(vod.subscribersLost||0)) + '</td></tr>' +
        '</tbody>' +
      '</table>' +
      '<div class="card-header" style="margin-top:20px"><span class="card-title">유입 경로 분석 (Traffic)</span></div>' +
      (d.trafficSources || []).slice(0, 4).map(x => {
        const trafficMax = Math.max(1, ...(d.trafficSources||[]).map(t => Number(t.views)||0));
        const pct = Math.max(2, Math.round((Number(x.views||0) / trafficMax) * 100));
        return '<div style="margin:10px 0">' +
          '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">' +
            '<span>' + esc(x.insightTrafficSourceType) + '</span>' +
            '<b>' + fmt.format(x.views || 0) + '</b>' +
          '</div>' +
          '<div style="height:5px;background:#090d16;border-radius:99px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--accent-cyan),var(--accent-magenta));border-radius:99px"></div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';

  // AI 경쟁 채널 자율 레이더 현황 요약 카드
  const tracked = gMarketDemand?.trackedChannels || [];
  const gmCount = tracked.filter((c) => c.status === 'gold_mine').length;
  const candCount = tracked.filter((c) => c.status === 'candidate').length;
  const gradCount = tracked.filter((c) => c.status === 'graduated').length;
  const blkCount = tracked.filter((c) => c.status === 'blocked').length;

  html += '<div class="bento-card col-12" style="background:#090d16;border:1px solid rgba(217,70,239,0.25);margin-top:14px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">' +
    '<div>' +
      '<div class="card-title" style="color:var(--accent-magenta);font-size:11px">AUTONOMOUS RADAR STATUS</div>' +
      '<div style="font-size:16px;font-weight:800;color:var(--text-bright);margin-top:2px">🎯 AI 경쟁 채널 자율 순환 현황</div>' +
      '<div class="card-subtext" style="margin-top:2px">' +
        '🏆 황금 광산 <b style="color:#fbbf24">' + gmCount + '개</b> · ' +
        '🌱 발굴 후보 <b style="color:#38bdf8">' + candCount + '개</b> · ' +
        '🎓 명예 졸업 <b style="color:#c084fc">' + gradCount + '개</b> · ' +
        '🚫 자동 차단 <b style="color:#f87171">' + blkCount + '개</b>' +
      '</div>' +
    '</div>' +
    '<div>' +
      '<button class="btn btn-sm btn-cyan btn-open-tab" data-target-tab="tab-demand" style="padding:6px 14px">🎯 경쟁 분석 레이더 열기 ↗</button>' +
    '</div>' +
  '</div>';

  return html;
}

function bindOverviewEvents() {
  // 2026-11-10: 영상 수동 분류 UI 폐지 (업로드 패키징 개편 시 status.json 기반 자동 연결로 이관 예정)
}

/* TAB 2: MARKET DEMAND RADAR (통합 마스터-디테일 & D+7 자율 순환) */
function renderMarketDemandTab() {
  const md = gMarketDemand;
  if (!md || !md.byKeyword) {
    return '<div class="bento-card" style="padding:40px;text-align:center">' +
      '<h3>시장 수요 데이터가 아직 생성되지 않았습니다.</h3>' +
      '<p class="card-subtext" style="justify-content:center;margin-bottom:20px">아래 버튼을 눌러 경쟁 채널 시장 수요 분석을 즉시 실행하세요.</p>' +
      '<button class="btn btn-magenta" id="btn-run-market-demand-direct">🚀 시장 수요 분석 실행 (market-demand.mjs)</button>' +
      '</div>';
  }

  const trackedChannels = md.trackedChannels || [];
  const goldMines = trackedChannels.filter(c => c.status === 'gold_mine');
  const candidates = trackedChannels.filter(c => c.status === 'candidate');
  const graduated = trackedChannels.filter(c => c.status === 'graduated');
  const blocked = trackedChannels.filter(c => c.status === 'blocked');

  const keywords = md.byKeyword || [];
  // 선택된 키워드가 없거나 유효하지 않으면 첫 번째 키워드를 기본 선택
  if (!gSelectedDemandKeyword || !keywords.some(k => k.keyword === gSelectedDemandKeyword)) {
    gSelectedDemandKeyword = keywords.length > 0 ? keywords[0].keyword : '';
  }
  const selectedKwObj = keywords.find(k => k.keyword === gSelectedDemandKeyword) || keywords[0] || null;

  const filteredChannels = gDemandFilter === 'ALL'
    ? trackedChannels
    : trackedChannels.filter(c => c.status === gDemandFilter);

  // D+7 자율 순환 요약 정보 — 동기화(/api/sync)마다 서버가 자동으로 돌린 결과만 보여 준다.
  const d7 = md.d7AutonomousCycle || null;
  const d7Applied = Array.isArray(d7?.applied) ? d7.applied : [];
  const d7LastRun = d7?.lastRunAt ? d7.lastRunAt.slice(0, 10) : '아직 안 돎';

  let html = '<div class="bento-grid">' +
    // Top Autonomous Cockpit Header
    '<div class="bento-card col-12" style="background:linear-gradient(135deg, rgba(217,70,239,0.08), rgba(6,182,212,0.08));border:1px solid rgba(217,70,239,0.3);padding:18px 22px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">' +
        '<div>' +
          '<div class="card-title" style="color:var(--accent-magenta);font-size:12px;letter-spacing:1px">AUTONOMOUS RADAR COCKPIT</div>' +
          '<h2 style="font-family:var(--font-display);font-size:22px;color:var(--text-bright);margin-top:2px">🤖 AI 키워드 & 경쟁 채널 통합 관제 센터</h2>' +
          '<div class="card-subtext" style="margin-top:4px">' +
            '공개 D+7 자율 순환 검증 · 시청자 유입어 자동 흡수 ➔ 1등 경쟁 채널 선별 · 7일 성과(1.5배↑) 황금광산 자동 고정' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;align-items:center">' +
          '<span class="tag-chip" style="background:rgba(6,182,212,0.15);color:#38bdf8;border:1px solid #06b6d4;font-size:11px;padding:4px 10px;font-weight:700">⚡ D+7 자율 순환 연동</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // D+7 Autonomous Cycle Live Banner
    '<div class="bento-card col-12" style="background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.25);padding:12px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">' +
      '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<span class="pulse-dot" style="background:var(--accent-amber);box-shadow:0 0 10px var(--accent-amber);width:9px;height:9px;border-radius:50%;display:inline-block"></span>' +
        '<span style="font-weight:800;color:var(--accent-amber);font-size:13px">🔔 D+7 자율 순환 현황:</span>' +
        (d7Applied.length ?
          d7Applied.map((a) => '<span class="badge" style="background:#090e18;border-color:var(--accent-cyan);color:var(--accent-cyan);font-size:11px;font-weight:700">' + esc(a.label) + ' ' + esc(a.ratio) + '배 → ' + esc((a.channels || []).join('·') || '근거 채널 없음') + '</span>').join('') :
          '<span class="badge badge-hold" style="font-size:11px">이번에 반영한 판정 없음</span>') +
        (d7 && d7.holdCount ?
          '<span class="badge" style="font-size:11px" title="노출이 적어(작은 표본) 운인지 실력인지 가릴 수 없는 편은 경쟁 채널 상태를 바꾸지 않습니다">판정 보류 ' + d7.holdCount + '편 (표본 부족)</span>' : '') +
        (d7?.discoveredKeywords && d7.discoveredKeywords.length > 0 ?
          '<span class="badge" style="background:rgba(6,182,212,0.15);color:#38bdf8;font-size:11px">시청자 유입어 ' + d7.discoveredKeywords.length + '개 편입됨</span>' : '') +
        (d7?.retiredKeywords && d7.retiredKeywords.length > 0 ?
          '<span class="badge" style="background:rgba(168,85,247,0.15);color:#c084fc;font-size:11px">만료 검색어 ' + d7.retiredKeywords.length + '개 교체 정리됨</span>' : '') +
      '</div>' +
      '<div class="card-subtext" style="color:var(--text-muted);font-size:11px">마지막 D+7 순환: ' + esc(d7LastRun) + '</div>' +
    '</div>' +

    // Single Smart Search & Sync Bar (단일 통합 스마트 바)
    '<div class="bento-card col-12" style="background:#090e18;border:1.5px solid rgba(6,182,212,0.35);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">' +
      '<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:320px">' +
        '<span style="font-size:18px">🔍</span>' +
        '<input id="input-demand-smart" type="text" placeholder="키워드(예: be동사, 영어 발음) 또는 채널 링크/@핸들 입력 시 스마트 자동 분기..." style="flex:1;background:#05070c;border:1px solid var(--border-subtle);color:var(--text-bright);padding:10px 14px;border-radius:6px;font-size:13px;outline:none;" />' +
        '<button id="btn-run-demand-smart" class="btn btn-cyan btn-sm" style="white-space:nowrap;padding:10px 18px;font-weight:800">🚀 스마트 분석</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<button id="btn-sync-all-channels" class="btn btn-sm" style="background:rgba(255,255,255,0.06);border:1px solid var(--border-subtle);color:var(--text-bright);font-size:12px;padding:9px 14px;font-weight:600" title="모든 추적 채널 최신 아웃라이어 새로고침">전체 채널 동기화</button>' +
      '</div>' +
    '</div>' +

    // 4 Bento Status Metric Cards (Compact)
    '<div class="bento-card col-3" style="background:#0d121f;border-top:3px solid #f59e0b;padding:14px 18px">' +
      '<div class="card-title" style="color:#fbbf24">🏆 황금 광산 (Gold Mine)</div>' +
      '<div style="font-size:24px;font-weight:900;color:var(--text-bright);margin:4px 0">' + goldMines.length + '<span style="font-size:13px;font-weight:400;color:var(--text-muted);margin-left:4px">개 채널</span></div>' +
      '<div class="card-subtext" style="color:#fbbf24">성과 1.5배↑ · 우선 채굴</div>' +
    '</div>' +
    '<div class="bento-card col-3" style="background:#0d121f;border-top:3px solid #06b6d4;padding:14px 18px">' +
      '<div class="card-title" style="color:#38bdf8">🌱 발굴 후보 (Candidate)</div>' +
      '<div style="font-size:24px;font-weight:900;color:var(--text-bright);margin:4px 0">' + candidates.length + '<span style="font-size:13px;font-weight:400;color:var(--text-muted);margin-left:4px">개 채널</span></div>' +
      '<div class="card-subtext" style="color:#38bdf8">추천 유입·알고리즘 포착</div>' +
    '</div>' +
    '<div class="bento-card col-3" style="background:#0d121f;border-top:3px solid #a855f7;padding:14px 18px">' +
      '<div class="card-title" style="color:#c084fc">🎓 명예 졸업 (Graduated)</div>' +
      '<div style="font-size:24px;font-weight:900;color:var(--text-bright);margin:4px 0">' + graduated.length + '<span style="font-size:13px;font-weight:400;color:var(--text-muted);margin-left:4px">개 채널</span></div>' +
      '<div class="card-subtext" style="color:#c084fc">소재 100% 소진 (보관)</div>' +
    '</div>' +
    '<div class="bento-card col-3" style="background:#0d121f;border-top:3px solid #ef4444;padding:14px 18px">' +
      '<div class="card-title" style="color:#f87171">🚫 자동 차단 (Blocked)</div>' +
      '<div style="font-size:24px;font-weight:900;color:var(--text-bright);margin:4px 0">' + blocked.length + '<span style="font-size:13px;font-weight:400;color:var(--text-muted);margin-left:4px">개 채널</span></div>' +
      '<div class="card-subtext" style="color:#f87171">2회 부진 (90일 쿨다운)</div>' +
    '</div>';

  // ==========================================
  // [CORE INNOVATION] 2-Column Master-Detail View
  // 좌측 (col-4): 시장 수요 키워드 풀
  // 우측 (col-8): 선택된 키워드 장악 채널 & 대표 아웃라이어
  // ==========================================
  html += '<div class="bento-card col-4" style="background:#090e18;border:1px solid var(--border-subtle);padding:18px">' +
    '<div class="card-header" style="margin-bottom:12px">' +
      '<div>' +
        '<span style="font-family:var(--font-display);font-size:16px;font-weight:800;color:var(--text-bright)">🎯 핵심 수요 키워드 풀</span>' +
        '<div class="card-subtext" style="margin-top:2px">클릭 시 우측에 아웃라이어가 즉시 연동됩니다 (' + keywords.length + '개)</div>' +
      '</div>' +
    '</div>' +
    '<div class="demand-kw-scroll" style="display:flex;flex-direction:column;gap:8px;max-height:640px;overflow-y:auto;padding-right:4px">';

  keywords.forEach((k) => {
    const isSelected = k.keyword === gSelectedDemandKeyword;
    const hasScore = k.marketDemandScore != null;
    const score = hasScore ? Math.round(k.marketDemandScore) : 0;
    const scoreClass = score >= 150 ? 'badge-strong-pass' : score >= 80 ? 'badge-pass' : 'badge-hold';
    const isD7 = k.source === 'd7_search_terms';
    const subtext = !hasScore
      ? (k.emptyReason
        ? '우리 채널 검색 유입 ' + (k.searchViews ?? '?') + '회 · ' + esc(k.emptyReason)
        : '우리 채널 검색 유입 ' + (k.searchViews ?? '?') + '회 · 자동 분석 대기')
      : '기회 ' + Number(k.opportunityScore || 0).toFixed(1) + '점 · 표본 ' + (k.videoCount || 0) + '개';

    html += '<div class="demand-kw-item" data-keyword="' + esc(k.keyword) + '" style="cursor:pointer;background:' + (isSelected ? 'rgba(6,182,212,0.12)' : '#05070c') + ';border:1.5px solid ' + (isSelected ? 'var(--accent-cyan)' : 'var(--border-subtle)') + ';border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;transition:all 0.15s ease">' +
      '<div style="min-width:0;flex:1;margin-right:8px">' +
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
          '<span style="font-weight:800;font-size:13.5px;color:' + (isSelected ? 'var(--accent-cyan)' : 'var(--text-bright)') + ';word-break:keep-all">' + esc(k.keyword) + '</span>' +
          (isD7 ? '<span class="tag-chip" style="background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid #f59e0b;font-size:10px;padding:1px 6px">D+7 유입</span>' : '') +
        '</div>' +
        // 아직 분석 전이거나 소형 채널 표본이 0개인 키워드는 0점으로 보이지 않게 실제 상태·검색 조회수를 보여 준다.
        '<div class="card-subtext" style="margin-top:3px;font-size:11px">' + subtext + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:4px;align-items:center;flex-shrink:0">' +
        (!hasScore ? '<span class="badge badge-hold" style="font-size:10px;padding:2px 7px;white-space:nowrap">' + (k.emptyReason ? '표본 부족' : '분석 대기') + '</span>' : '<span class="badge ' + scoreClass + '" style="font-size:10px;padding:2px 7px;white-space:nowrap">수요 ' + score + '</span>') +
      '</div>' +
    '</div>';
  });

  html += '</div></div>';

  // 터진 영상 한 줄(키워드 상세와 채널 상세가 같이 쓴다, 2026-11-14). 손으로 제외하는 버튼은 없앴다(자동화 우선 원칙).
  const outlierCardHtml = (o) => {
      const thumb = o.thumbnail || (o.videoId ? 'https://i.ytimg.com/vi/' + o.videoId + '/mqdefault.jpg' : '');
      const watchUrl = o.videoId ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(o.videoId) : '';
      const ratioText = o.ratioMethod === 'peer-median-views-v2'
        ? (o.ratioStatus === 'ok' && o.outlierRatio != null ? o.outlierRatio.toFixed(1) + 'x 배수' : (o.ratioStatus === 'measuring' ? '측정 중' : '판정 보류'))
        : (o.outlierRatio ? '옛 방식 ' + o.outlierRatio.toFixed(1) + 'x(참고용)' : '');

      // 채널 상태 찾기
      const matchedCh = trackedChannels.find(c => c.channelTitle === o.channelTitle || c.channelId === o.channelId);
      let chBadge = '';
      if (matchedCh) {
        if (matchedCh.status === 'gold_mine') chBadge = '<span class="tag-chip" style="background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid #f59e0b;font-size:10px;padding:1px 6px">🏆 황금광산</span>';
        else if (matchedCh.status === 'candidate') chBadge = '<span class="tag-chip" style="background:rgba(6,182,212,0.15);color:#38bdf8;border:1px solid #06b6d4;font-size:10px;padding:1px 6px">🌱 후보</span>';
      }

      return '<div style="background:#05070c;border:1px solid var(--border-subtle);border-radius:10px;padding:12px;margin-bottom:10px;display:flex;flex-direction:column;gap:10px">' +
        '<div style="display:flex;gap:12px;align-items:flex-start">' +
          (thumb ? (watchUrl ?
            '<a href="' + esc(watchUrl) + '" target="_blank" rel="noopener" title="유튜브에서 영상 보기"><img class="thumb-mini" style="cursor:pointer;width:120px;height:68px;border-radius:6px;object-fit:cover" src="' + esc(thumb) + '" alt=""></a>' :
            '<img class="thumb-mini" style="width:120px;height:68px;border-radius:6px;object-fit:cover" src="' + esc(thumb) + '" alt="">') : '') +
          '<div style="flex:1;min-width:0">' +
            (watchUrl ?
              '<a href="' + esc(watchUrl) + '" target="_blank" rel="noopener" style="text-decoration:none"><div style="font-weight:800;font-size:13px;color:var(--text-bright);line-height:1.4;margin-bottom:4px">▶ ' + esc(o.title) + '</div></a>' :
              '<div style="font-weight:800;font-size:13px;color:var(--text-bright);line-height:1.4;margin-bottom:4px">' + esc(o.title) + '</div>') +
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;color:var(--text-muted)">' +
              '<span style="font-weight:700;color:var(--text-normal)">' + esc(o.channelTitle || o.channel) + '</span>' +
              chBadge +
              '<span>·</span>' +
              '<span style="color:var(--accent-amber);font-weight:700">' + ratioText + '</span>' +
              '<span>·</span>' +
              '<span>조회수 ' + fmt.format(o.viewCount || (o.viewsPerDay ? o.viewsPerDay * (o.ageDays||1) : 0)) + '회</span>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // 액션 버튼 바
        '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding-top:6px;border-top:1px solid rgba(255,255,255,0.05)">' +
          // 2026-11-12: 손으로 누르는 "댓글/대본 분석" 버튼을 없앴다. 분석은 매일 루프가 한다(합친 리포트 하루 2편, 배수 큰 순).
          (o.outlierReport ?
            ((o.outlierReport.frame ? '<a href="/outlier-report/' + encodeURIComponent(o.videoId) + '" target="_blank" rel="noopener" title="화면 연출 캡처"><img src="' + esc(o.outlierReport.frame) + '" alt="" style="height:44px;border-radius:4px;border:1px solid var(--border-subtle);display:block"></a>' : '') +
             '<a class="btn btn-sm btn-cyan" href="/outlier-report/' + encodeURIComponent(o.videoId) + '" target="_blank" rel="noopener" style="font-size:11px;padding:5px 10px">📊 리포트 보기 (화면 변화 ' + (o.outlierReport.visualChanges || 0) + ')</a>') :
            '<span style="font-size:11px;color:var(--text-muted)">⏳ 자동 분석 대기 — 매일 2편, 배수 큰 순</span>') +
          (o.commentReportFile ?
            '<button class="btn btn-sm btn-outlier-view-comment" style="background:#132032;color:#7dd3fc;border:1px solid #234361;font-size:11px;padding:5px 10px" data-file="' + esc(o.commentReportFile) + '">📄 예전 댓글 리포트</button>' : '') +
          (o.scriptReportFile ?
            '<button class="btn btn-sm btn-outlier-view-script" style="background:#132032;color:#7dd3fc;border:1px solid #234361;font-size:11px;padding:5px 10px" data-file="' + esc(o.scriptReportFile) + '">📄 예전 대본 리포트</button>' : '') +
        '</div>' +
      '</div>';
  };

  // 우측 Detail: 선택된 키워드 연계 채널 & 대표 아웃라이어
  html += '<div class="bento-card col-8" style="background:#090e18;border:1px solid var(--border-subtle);padding:18px">';

  if (selectedKwObj) {
    const hasScore = selectedKwObj.marketDemandScore != null;
    const opp = hasScore && selectedKwObj.opportunityScore != null ? Number(selectedKwObj.opportunityScore).toFixed(1) : '측정 전';
    const score = hasScore ? Math.round(selectedKwObj.marketDemandScore) : '측정 전';
    const totalResultsText = selectedKwObj.totalResults != null ? fmt.format(selectedKwObj.totalResults) : '측정 전';
    const outliers = selectedKwObj.topOutliers || [];

    html += '<div class="card-header" style="border-bottom:1px solid var(--border-subtle);padding-bottom:12px;margin-bottom:14px">' +
      '<div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<span class="card-title" style="color:var(--accent-cyan);font-size:11px;margin:0">SELECTED KEYWORD</span>' +
          (selectedKwObj.source === 'd7_search_terms' ? '<span class="tag-chip" style="background:rgba(245,158,11,0.2);color:#fbbf24;font-size:10px;padding:1px 6px">D+7 시청자 검색 유입</span>' : '') +
        '</div>' +
        '<h3 style="font-family:var(--font-display);font-size:20px;font-weight:900;color:#fff;margin-top:4px">' + esc(selectedKwObj.keyword) + '</h3>' +
      '</div>' +
      '<div style="display:flex;gap:14px;align-items:center">' +
        '<div style="text-align:right"><div class="card-title" style="font-size:10px">기회 점수</div><div style="font-size:18px;font-weight:900;color:var(--accent-cyan)">' + opp + '</div></div>' +
        '<div style="text-align:right"><div class="card-title" style="font-size:10px">수요 점수</div><div style="font-size:18px;font-weight:900;color:var(--text-bright)">' + score + '</div></div>' +
        '<div style="text-align:right"><div class="card-title" style="font-size:10px">검색 결과수</div><div style="font-size:18px;font-weight:900;color:var(--accent-amber)">' + totalResultsText + '</div></div>' +
      '</div>' +
    '</div>';

    // 대표 아웃라이어 영상 목록
    html += '<div>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
        '<span style="font-size:13px;font-weight:800;color:var(--text-bright)">⭐ 이 키워드를 장악한 대표 아웃라이어 영상 (' + outliers.length + '개):</span>' +
      '</div>';

    if (outliers.length === 0) {
      html += '<div style="background:#05070c;border:1px dashed var(--border-subtle);border-radius:8px;padding:30px;text-align:center;color:var(--text-muted)">' +
        (selectedKwObj.emptyReason
          ? esc(selectedKwObj.emptyReason) + '<br>주기적 자동 재점검(14일) 시 다시 확인합니다.'
          : '아직 아웃라이어가 분석되지 않았습니다.<br>매일 루프에서 자동으로 순차 분석될 예정입니다.') +
      '</div>';
    } else {
      outliers.forEach((o) => { html += outlierCardHtml(o); });
    }

    html += '</div>';
  } else {
    html += '<div style="padding:40px;text-align:center;color:var(--text-muted)">좌측에서 키워드를 선택하세요.</div>';
  }

  html += '</div>';

  // ==========================================
  // [BOTTOM SECTION] 추적 경쟁 채널 — 키워드와 같은 "목록 + 상세" 구조 (2026-11-14)
  // 좌측: 채널 목록(상태 필터), 우측: 선택한 채널의 터진 영상 전부. 영상 한 줄은 키워드 쪽과 같은 outlierCardHtml.
  // 손으로 누르는 재분석·추적 제거 버튼은 없앴다(발굴·판정·차단·졸업은 시스템이 한다, 자동화 우선 원칙).
  // ==========================================
  const chBadgeStyle = {
    gold_mine: ['rgba(245,158,11,0.2)', '#fbbf24', '#f59e0b', '🏆 황금 광산'],
    candidate: ['rgba(6,182,212,0.15)', '#38bdf8', '#06b6d4', '🌱 발굴 후보'],
    blocked: ['rgba(239,68,68,0.2)', '#f87171', '#ef4444', '🚫 자동 차단'],
    graduated: ['rgba(168,85,247,0.2)', '#c084fc', '#a855f7', '🎓 명예 졸업'],
  };
  const chStatusBadge = (status) => {
    const s = chBadgeStyle[status] || chBadgeStyle.candidate;
    return '<span class="tag-chip" style="background:' + s[0] + ';color:' + s[1] + ';border:1px solid ' + s[2] + ';font-size:10px;padding:2px 8px;font-weight:700;white-space:nowrap">' + s[3] + '</span>';
  };
  if (!gSelectedDemandChannel || !filteredChannels.some(c => c.channelId === gSelectedDemandChannel)) {
    gSelectedDemandChannel = filteredChannels.length > 0 ? filteredChannels[0].channelId : '';
  }
  const selectedCh = filteredChannels.find(c => c.channelId === gSelectedDemandChannel) || null;

  html += '<div class="bento-card col-12" style="margin-top:10px;background:#090e18;border:1px solid var(--border-subtle);padding:14px 20px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">' +
      '<div>' +
        '<span style="font-family:var(--font-display);font-size:17px;font-weight:800;color:var(--text-bright)">🏢 추적 경쟁 채널</span>' +
        '<div class="card-subtext" style="margin-top:2px">우리 영상 성과에 연동되어 자율 순환 중인 채널들입니다. 클릭 시 우측에 그 채널의 터진 영상이 나옵니다</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
        '<button class="btn btn-sm btn-demand-filter ' + (gDemandFilter === 'ALL' ? 'btn-cyan' : '') + '" data-status="ALL">전체 (' + trackedChannels.length + ')</button>' +
        '<button class="btn btn-sm btn-demand-filter ' + (gDemandFilter === 'gold_mine' ? 'btn-cyan' : '') + '" data-status="gold_mine">🏆 황금 광산 (' + goldMines.length + ')</button>' +
        '<button class="btn btn-sm btn-demand-filter ' + (gDemandFilter === 'candidate' ? 'btn-cyan' : '') + '" data-status="candidate">🌱 발굴 후보 (' + candidates.length + ')</button>' +
        '<button class="btn btn-sm btn-demand-filter ' + (gDemandFilter === 'graduated' ? 'btn-cyan' : '') + '" data-status="graduated">🎓 명예 졸업 (' + graduated.length + ')</button>' +
        '<button class="btn btn-sm btn-demand-filter ' + (gDemandFilter === 'blocked' ? 'btn-cyan' : '') + '" data-status="blocked">🚫 자동 차단 (' + blocked.length + ')</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  if (filteredChannels.length === 0) {
    html += '<div class="bento-card col-12" style="background:#090e18;border:1px solid var(--border-subtle);padding:20px;text-align:center;color:var(--text-muted)">해당 상태의 채널이 없습니다.</div>';
  } else {
    html += '<div class="bento-card col-4" style="background:#090e18;border:1px solid var(--border-subtle);padding:18px">' +
      '<div class="demand-kw-scroll" style="display:flex;flex-direction:column;gap:8px;max-height:640px;overflow-y:auto;padding-right:4px">' +
      filteredChannels.map((c) => {
        const isSel = c.channelId === gSelectedDemandChannel;
        const subLabel = c.subscriberCount != null ? fmt.format(c.subscriberCount) + '명' : '비공개';
        const n = (c.topOutliers || []).length;
        return '<div class="demand-ch-item" data-channel-id="' + esc(c.channelId) + '" style="cursor:pointer;background:' + (isSel ? 'rgba(6,182,212,0.12)' : '#05070c') + ';border:1.5px solid ' + (isSel ? 'var(--accent-cyan)' : 'var(--border-subtle)') + ';border-radius:8px;padding:10px 12px">' +
          '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
            '<span style="font-weight:800;font-size:13.5px;color:' + (isSel ? 'var(--accent-cyan)' : 'var(--text-bright)') + ';word-break:keep-all">' + esc(c.channelTitle || c.handle || '미상 채널') + '</span>' +
            chStatusBadge(c.status || 'candidate') +
          '</div>' +
          '<div class="card-subtext" style="margin-top:3px;font-size:11px">구독자 ' + subLabel + ' · 터진 영상 ' + n + '개</div>' +
        '</div>';
      }).join('') +
      '</div>' +
    '</div>';

    html += '<div class="bento-card col-8" style="background:#090e18;border:1px solid var(--border-subtle);padding:18px">';
    if (selectedCh) {
      const c = selectedCh;
      const subLabel = c.subscriberCount != null ? fmt.format(c.subscriberCount) + '명' : '비공개';
      const exhaustionRate = c.exhaustion ? Math.round((c.exhaustion.exhaustionRate || 0) * 100) : 0;
      const uncoveredCount = c.exhaustion ? c.exhaustion.uncoveredCount : 0;
      const chOutliers = c.topOutliers || [];
      html += '<div class="card-header" style="border-bottom:1px solid var(--border-subtle);padding-bottom:12px;margin-bottom:14px">' +
        '<div>' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<span class="card-title" style="color:var(--accent-cyan);font-size:11px;margin:0">SELECTED CHANNEL</span>' +
            chStatusBadge(c.status || 'candidate') +
          '</div>' +
          '<h3 style="font-family:var(--font-display);font-size:20px;font-weight:900;color:#fff;margin-top:4px">' + esc(c.channelTitle || c.handle || '미상 채널') + '</h3>' +
          '<div class="card-subtext" style="margin-top:2px">구독자 ' + subLabel + ' · 영상 ' + (c.videoCount || 0) + '개 분석 · ' + esc((c.analyzedAt || '').slice(0, 10)) + '</div>' +
        '</div>' +
        '<div style="min-width:160px"><div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px"><span style="color:var(--text-subtle)">소재 소진율</span><b style="color:' + (uncoveredCount > 0 ? '#38bdf8' : '#a855f7') + '">' + exhaustionRate + '% (잔여 ' + uncoveredCount + '개)</b></div>' +
          '<div style="height:5px;background:#131826;border-radius:99px;overflow:hidden"><div style="height:100%;width:' + exhaustionRate + '%;background:linear-gradient(90deg,var(--accent-cyan),#a855f7)"></div></div></div>' +
      '</div>';
      if (c.subscriberCount != null && c.subscriberCount > 100000) html += '<div class="card-subtext" style="color:var(--accent-amber);margin-bottom:8px">⚠️ 체급 큼 — 패턴 참고용</div>';
      if (c.statusReason) html += '<div style="font-size:11px;color:var(--accent-cyan);background:rgba(6,182,212,0.06);border-left:2px solid var(--accent-cyan);padding:4px 8px;border-radius:4px;margin-bottom:10px">💡 ' + esc(c.statusReason) + '</div>';
      if (c.titlePatterns && c.titlePatterns.length > 0) {
        html += '<div style="margin-bottom:12px">' + c.titlePatterns.slice(0, 6).map(p =>
          '<span class="tag-chip copy-chip tag-link-kw" data-kw="' + esc(p.word) + '" data-copy="' + esc(p.word) + '" title="클릭 시 이 키워드로 포커스">#' + esc(p.word) + '</span>'
        ).join('') + '</div>';
      }
      html += '<div style="font-size:13px;font-weight:800;color:var(--text-bright);margin-bottom:10px">⭐ 이 채널에서 평소보다 크게 터진 영상 (' + chOutliers.length + '개):</div>';
      if (chOutliers.length === 0) {
        html += '<div style="background:#05070c;border:1px dashed var(--border-subtle);border-radius:8px;padding:30px;text-align:center;color:var(--text-muted)">평소보다 크게 터진 영상이 아직 없습니다.</div>';
      } else {
        chOutliers.forEach((o) => { html += outlierCardHtml(o); });
      }
    }
    html += '</div>';
  }


  html += '</div>'; // End Bottom Card
  html += '</div>'; // End Bento Grid
  return html;
}

function bindMarketDemandEvents() {
  document.querySelectorAll('.btn-demand-filter').forEach((btn) => {
    btn.onclick = () => {
      gDemandFilter = btn.dataset.status || 'ALL';
      try { localStorage.setItem('ihm_demand_filter', gDemandFilter); } catch (_) {}
      renderCurrentTab();
    };
  });

  // 키워드 목록 항목 클릭 시 마스터-디테일 전환
  document.querySelectorAll('.demand-kw-item').forEach((item) => {
    item.onclick = () => {
      const kw = item.dataset.keyword;
      if (kw && kw !== gSelectedDemandKeyword) {
        gSelectedDemandKeyword = kw;
        try { localStorage.setItem('ihm_demand_selected_keyword', kw); } catch (_) {}
        renderCurrentTab();
      }
    };
  });

  // 채널 목록 항목 클릭 시 우측 상세 전환
  document.querySelectorAll('.demand-ch-item').forEach((item) => {
    item.onclick = () => {
      const id = item.dataset.channelId;
      if (id && id !== gSelectedDemandChannel) {
        gSelectedDemandChannel = id;
        try { localStorage.setItem('ihm_demand_selected_channel', id); } catch (_) {}
        renderCurrentTab();
      }
    };
  });

  // 채널 패턴 태그 클릭 시 키워드 자동 연동
  document.querySelectorAll('.tag-link-kw').forEach((chip) => {
    chip.onclick = (e) => {
      e.stopPropagation();
      const kw = chip.dataset.kw;
      if (!kw) return;
      const matched = (gMarketDemand?.byKeyword || []).find((k) => k.keyword.includes(kw) || kw.includes(k.keyword));
      if (matched) {
        gSelectedDemandKeyword = matched.keyword;
        try { localStorage.setItem('ihm_demand_selected_keyword', matched.keyword); } catch (_) {}
        renderCurrentTab();
      } else {
        const input = document.getElementById('input-demand-smart');
        if (input) {
          input.value = kw;
          input.focus();
        }
      }
    };
  });

  // 단일 통합 스마트 검색 바 이벤트 바인딩
  const btnSmart = document.getElementById('btn-run-demand-smart');
  const inputSmart = document.getElementById('input-demand-smart');
  const runSmartAnalysis = async () => {
    const val = inputSmart ? inputSmart.value.trim() : '';
    if (!val) return alert('분석할 키워드 또는 채널 링크/@핸들을 입력하세요.');
    btnSmart.disabled = true;
    btnSmart.textContent = '⏳ 스마트 분석 중...';
    gDemandBusyCount++;
    try {
      const res = await fetch('/api/market-demand/run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({smartInput: val}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '스마트 분석 실패');
      gDemandRefreshSeq++;
      gMarketDemand = data.data;
      const isChannelInput = val.startsWith('http://') || val.startsWith('https://') || val.startsWith('@') || val.startsWith('UC');
      if (!isChannelInput) {
        gSelectedDemandKeyword = val;
        try { localStorage.setItem('ihm_demand_selected_keyword', val); } catch (_) {}
      }
      renderCurrentTab();
      const qCount = (data.queued?.comments?.length || 0) + (data.queued?.scripts?.length || 0);
      showToast(qCount > 0 ? '🚀 스마트 분석 완료! 상위 리포트 ' + qCount + '건 백그라운드 생성 시작' : '🚀 스마트 분석 완료!');
    } catch (err) {
      alert('❌ 오류: ' + err.message);
    } finally {
      gDemandBusyCount = Math.max(0, gDemandBusyCount - 1);
      btnSmart.disabled = false;
      btnSmart.textContent = '🚀 스마트 분석';
    }
  };
  if (btnSmart) btnSmart.onclick = runSmartAnalysis;
  if (inputSmart) {
    inputSmart.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runSmartAnalysis();
      }
    };
  }

  document.querySelectorAll('.copy-chip').forEach(chip => {
    chip.onclick = () => copyToClipboard(chip.dataset.copy, chip);
  });

  const btnSyncAll = document.getElementById('btn-sync-all-channels');
  if (btnSyncAll) {
    btnSyncAll.onclick = async () => {
      if (!confirm('모든 추적 채널의 최신 영상과 아웃라이어를 일괄 새로고침할까요? (YouTube API 쿼터가 소모됩니다)')) return;
      btnSyncAll.disabled = true;
      const originalText = btnSyncAll.innerHTML;
      btnSyncAll.innerHTML = '⏳ 전체 채널 동기화 중...';
      gDemandBusyCount++;
      try {
        const res = await fetch('/api/market-demand/run', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({syncAll: true}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '전체 동기화 실패');
        gDemandRefreshSeq++;
        gMarketDemand = data.data;
        renderCurrentTab();
        showToast('⚡ 모든 추적 채널의 최신 데이터 동기화 완료!');
      } catch (err) {
        alert('❌ 동기화 오류: ' + err.message);
      } finally {
        gDemandBusyCount = Math.max(0, gDemandBusyCount - 1);
        btnSyncAll.disabled = false;
        btnSyncAll.innerHTML = originalText;
      }
    };
  }

}

/* TAB: 기획 근거 성적표 (보기 전용, 2026-11-11 재작성)
   전에는 "타겟 장착 → 훅 카드 고르기 → 제목·낭독문·EP30 기획안 복사"를 사람이 하는 작업장이었고,
   표의 숫자·채널 연결·"검증된 훅 공식"이 코드에 손으로 적혀 있었다. 이제 서버가 동기화마다
   planning-outcome.mjs로 계산해 market-demand.json episodeOutcomes에 남긴 판정만 보여 준다. */
function renderBenchmarkTab() {
  const md = gMarketDemand || { trackedChannels: [] };
  const outcomes = Array.isArray(md.episodeOutcomes) ? md.episodeOutcomes : [];
  const dnaEntries = (gKnowledgeDb && gKnowledgeDb.audienceDna && gKnowledgeDb.audienceDna.entries) || [];
  const painPoints = dnaEntries.filter(e => e.type === 'painPoint');
  const questions = dnaEntries.filter(e => e.type === 'question');
  let displayedDna = [];
  if (gBenchmarkDnaFilter === 'painPoint') displayedDna = painPoints;
  else if (gBenchmarkDnaFilter === 'question') displayedDna = questions;
  else displayedDna = dnaEntries.filter(e => e.type === 'painPoint' || e.type === 'question');

  const verdictBadge = (v) => {
    const map = {
      worked: ['통함', 'rgba(34,197,94,0.18)', '#4ade80', '#22c55e'],
      neutral: ['보통', 'rgba(148,163,184,0.15)', '#cbd5e1', '#64748b'],
      failed: ['안 통함', 'rgba(239,68,68,0.18)', '#f87171', '#ef4444'],
      hold: ['보류', 'rgba(245,158,11,0.15)', '#fbbf24', '#f59e0b'],
    };
    const m = map[v] || ['대기', 'rgba(148,163,184,0.1)', '#94a3b8', '#475569'];
    return '<span class="tag-chip" style="background:' + m[1] + ';color:' + m[2] + ';border:1px solid ' + m[3] + ';font-weight:700;white-space:nowrap">' + m[0] + '</span>';
  };
  const counts = outcomes.reduce((acc, o) => { acc[o.verdict] = (acc[o.verdict] || 0) + 1; return acc; }, {});
  const withSources = outcomes.filter(o => o.hasSources).length;
  const lastRun = md.d7AutonomousCycle?.lastRunAt ? md.d7AutonomousCycle.lastRunAt.slice(0, 16).replace('T', ' ') + ' UTC' : '아직 안 돎';

  let html = '<div class="bento-grid">' +
    '<div class="bento-card col-12" style="padding:18px 22px">' +
      '<div class="card-title" style="color:var(--accent-amber);font-size:12px">PLANNING OUTCOME (READ-ONLY)</div>' +
      '<h2 style="font-family:var(--font-display);font-size:20px;color:var(--text-bright);margin-top:2px">💡 기획 근거 성적표</h2>' +
      '<div class="card-subtext" style="margin-top:6px;line-height:1.6">' +
        '우리 영상이 공개 7일 뒤 통했는지, 그리고 그 영상을 기획할 때 어느 경쟁 영상·시청자 고민을 근거로 썼는지 보여 줍니다. ' +
        '동기화할 때마다 자동으로 계산하고, 여기서 누를 것은 없습니다. 판정 결과는 경쟁 채널 상태(황금 광산·차단)에 자동으로 반영됩니다.' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;font-size:11px">' +
        '<span class="tag-chip">비교 숫자 = 공개 후 첫 7일 조회수 (같은 형식끼리)</span>' +
        '<span class="tag-chip">통함 = 같은 형식 중앙값의 1.5배 이상</span>' +
        '<span class="tag-chip">안 통함 = 0.5배 미만</span>' +
        '<span class="tag-chip">보류 = 7일 조회 100회 미만, 또는 같은 형식 최근 3편 중앙값 300회 미만(작은 표본)</span>' +
        '<span class="tag-chip">마지막 계산: ' + esc(lastRun) + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="bento-card col-12">' +
      '<div class="card-header"><div>' +
        '<span class="card-title" style="color:var(--text-bright)">📊 공개 7일이 지난 영상 ' + outcomes.length + '편</span>' +
        '<div class="card-subtext">통함 ' + (counts.worked || 0) + ' · 보통 ' + (counts.neutral || 0) + ' · 안 통함 ' + (counts.failed || 0) + ' · 보류 ' + (counts.hold || 0) +
          ' · 기획 근거가 기록된 편 ' + withSources + '편 (BRIEF.md "기획 근거" 칸, 다음 기획부터 스킬이 자동으로 적음)</div>' +
      '</div></div>' +
      (outcomes.length === 0
        ? '<div style="padding:30px;text-align:center;color:var(--text-muted)">아직 계산된 판정이 없습니다. 다음 동기화 때 자동으로 채워집니다.</div>'
        : '<div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left">' +
            '<thead><tr style="border-bottom:1px solid var(--border-subtle);color:var(--text-muted)">' +
              '<th style="padding:8px 10px">편</th><th style="padding:8px 10px;min-width:110px;white-space:nowrap">기획 근거</th>' +
              '<th style="padding:8px 10px;text-align:center">판정</th><th style="padding:8px 10px;text-align:center">배수(참고)</th>' +
              '<th style="padding:8px 10px">이유</th></tr></thead><tbody>' +
            outcomes.map(o => {
              const sources = (o.competitors || []).length
                ? o.competitors.map(c => esc(c.channelTitle) + ' <span style="color:var(--text-muted)">(' + esc(c.sourceRatio) + '배 영상)</span>').join('<br>')
                : (o.hasSources ? '<span style="white-space:nowrap">경쟁 근거 없음</span>' : '<span style="color:var(--text-muted);white-space:nowrap">기록 없음</span>');
              return '<tr style="border-bottom:1px solid rgba(255,255,255,0.04)">' +
                '<td style="padding:8px 10px"><div style="font-weight:700;color:var(--accent-cyan)">' + esc(o.label) + '</div>' +
                  '<div style="font-size:11px;color:var(--text-muted);max-width:320px">' + esc((o.title || '').slice(0, 48)) + '</div></td>' +
                '<td style="padding:8px 10px;font-size:11px">' + sources + (o.audience ? '<div style="color:var(--text-muted);margin-top:2px">고민: ' + esc(o.audience) + '</div>' : '') + '</td>' +
                '<td style="padding:8px 10px;text-align:center">' + verdictBadge(o.verdict) + '</td>' +
                '<td style="padding:8px 10px;text-align:center;color:var(--text-muted)">' + (o.ratio == null ? '-' : esc(o.ratio) + '배') + '</td>' +
                '<td style="padding:8px 10px;font-size:11px;color:var(--text-muted)">' + esc(o.reason || '') + '</td>' +
              '</tr>';
            }).join('') +
          '</tbody></table></div>') +
    '</div>';

  // 4. Section 2: 💬 아웃라이어 시청자 결핍 TOP & Section 3: 📜 대본 4단계 공식 (2 columns)
  html += '<div class="bento-card col-12" style="background:#090e18;border:1px solid var(--border-subtle)">' +
    '<div class="card-header">' +
      '<div>' +
        '<span class="card-title" style="color:var(--accent-magenta)">💬 아웃라이어 시청자 결핍 & 혼란점 (' + displayedDna.length + '건)</span>' +
        '<div class="card-subtext">경쟁 채널 댓글에서 시청자들이 가장 공감·질문한 결핍으로, 다음 영상의 고유 코너 소재입니다.</div>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;margin:10px 0 12px;flex-wrap:wrap">' +
      '<button class="btn btn-sm btn-benchmark-dna-filter ' + (gBenchmarkDnaFilter === 'ALL' ? 'btn-magenta' : '') + '" data-filter="ALL">전체 (' + (painPoints.length + questions.length) + ')</button>' +
      '<button class="btn btn-sm btn-benchmark-dna-filter ' + (gBenchmarkDnaFilter === 'painPoint' ? 'btn-magenta' : '') + '" data-filter="painPoint">🔥 혼란·결핍 (' + painPoints.length + ')</button>' +
      '<button class="btn btn-sm btn-benchmark-dna-filter ' + (gBenchmarkDnaFilter === 'question' ? 'btn-magenta' : '') + '" data-filter="question">❓ 핵심 질문 (' + questions.length + ')</button>' +
    '</div>' +
    '<div style="max-height:420px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px">' +
      (displayedDna.length > 0 ? displayedDna.slice(0, 15).map(e => {
        const isPain = e.type === 'painPoint';
        const tagBadge = isPain
          ? '<span class="tag-chip" style="background:rgba(239,68,68,0.15);color:#f87171;border:1px solid #ef4444;font-size:10px;padding:2px 6px;font-weight:700">🔥 결핍</span>'
          : '<span class="tag-chip" style="background:rgba(6,182,212,0.15);color:#38bdf8;border:1px solid #06b6d4;font-size:10px;padding:2px 6px;font-weight:700">❓ 질문</span>';
        return '<div style="background:#05070c;border:1px solid var(--border-subtle);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:flex-start;gap:10px">' +
          '<div style="flex:1">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">' + tagBadge + '</div>' +
            '<div style="font-size:12px;color:var(--text-bright);line-height:1.5">' + esc(e.text) + '</div>' +
          '</div>' +
          '<button class="btn btn-sm copy-chip" data-copy="' + esc(e.text) + '" style="font-size:10px;padding:4px 8px;flex-shrink:0;background:rgba(255,255,255,0.06);border:1px solid var(--border-subtle);color:var(--text-bright)">📋 복사</button>' +
        '</div>';
      }).join('') : '<div style="text-align:center;padding:40px;color:var(--text-muted)">표시할 시청자 결핍 데이터가 없습니다.</div>') +
    '</div>' +
  '</div>';

  html += '</div>'; // close bento-grid
  return html;
}

function bindBenchmarkEvents() {
  document.querySelectorAll('.btn-benchmark-dna-filter').forEach(btn => {
    btn.onclick = () => {
      gBenchmarkDnaFilter = btn.dataset.filter || 'ALL';
      try { localStorage.setItem('ihm_benchmark_dna_filter', gBenchmarkDnaFilter); } catch (_) {}
      renderCurrentTab();
    };
  });

  document.querySelectorAll('.copy-chip').forEach(chip => {
    chip.onclick = (e) => {
      e.stopPropagation();
      copyToClipboard(chip.dataset.copy, chip);
    };
  });
}


// 댓글/대본 분석이 끝난 직후 그 결과로 갱신되는 두 화면(시장 수요 레이더 / 데이터 자산)의 캐시를
// 조용히 새로고침한다 — 분석은 보통 시장 수요 카드에서 시작해서 아웃라이어 랩 탭으로 넘어와
// 진행되는데, 분석 전에 불러온 gMarketDemand/gKnowledgeDb는 새로 생긴 리포트 파일과
// audience-dna.json 항목을 모르는 상태 그대로라 그 탭들로 돌아가도 안 바뀌는 문제가 있었다
// (2026-09-07, 시장 수요 쪽은 사용자 지적으로 발견 — 데이터 자산도 gKnowledgeDb가 초기 로드
// 때와 삭제할 때만 갱신되고 분석 후엔 안 갱신되는 같은 구조라 같이 고침). 지금 보이는 탭을
// 다시 그리지는 않고 데이터만 갱신 — 다음에 그 탭으로 전환할 때 자동으로 최신 상태로 뜬다.
async function refreshAnalysisDerivedDataSilently() {
  const seqAtStart = gDemandRefreshSeq;
  try {
    const [demandRes, kdbRes] = await Promise.all([
      fetch('/api/market-demand'),
      fetch('/api/knowledge-db'),
    ]);
    if (seqAtStart !== gDemandRefreshSeq) return false;
    if (demandRes.ok) gMarketDemand = await demandRes.json();
    if (kdbRes.ok) gKnowledgeDb = await kdbRes.json();
    return true;
  } catch (err) {
    console.warn('Failed to refresh market demand / knowledge DB after analysis:', err);
    return false;
  }
}

async function runAiCommentAnalysis(payload) {
  const statusBox = document.getElementById('ai-lab-status');
  const statusText = document.getElementById('ai-lab-status-text');
  const resultsContainer = document.getElementById('ai-results-container');

  if (statusBox) statusBox.style.display = 'block';
  if (statusText) statusText.textContent = '인기 댓글 100개 수집 및 Gemini AI 심층 분석 중입니다... (약 5~10초 소요)';
  if (resultsContainer) resultsContainer.style.display = 'none';

  try {
    const res = await fetch('/api/insights/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '분석 중 오류가 발생했습니다.');
    if (statusBox) statusBox.style.display = 'none';
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
      resultsContainer.innerHTML = data.results?.map(r => renderSingleAiReportCard(r)).join('') || '<div class="card-subtext">분석 결과가 없습니다.</div>';
    }
    loadSavedReportsList();
    refreshAnalysisDerivedDataSilently();
    showToast('AI 댓글 분석이 완료되었습니다!');
  } catch (err) {
    if (statusBox) statusBox.style.display = 'block';
    if (statusText) statusText.innerHTML = '<span style="color:#ff7676">❌ ' + esc(err.message) + '</span>';
  }
}

async function runScriptAnalysis(targetUrl) {
  if (!targetUrl) return alert('유튜브 URL 또는 영상 ID를 입력하세요.');
  const statusBox = document.getElementById('ai-lab-status');
  const statusText = document.getElementById('ai-lab-status-text');
  const resultsContainer = document.getElementById('ai-results-container');
  const urlInput = document.getElementById('input-script-url');
  if (urlInput) urlInput.value = targetUrl;

  if (statusBox) statusBox.style.display = 'block';
  if (statusText) statusText.textContent = 'YouTube 자막을 1-Click 추출하고 Gemini AI로 대본 구조를 역설계 중입니다... (약 5~10초 소요)';
  if (resultsContainer) resultsContainer.style.display = 'none';

  try {
    const res = await fetch('/api/scripts/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url: targetUrl})
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '대본 분석에 실패했습니다.');
    if (statusBox) statusBox.style.display = 'none';
    if (resultsContainer) {
      resultsContainer.style.display = 'block';
      resultsContainer.innerHTML = renderSingleScriptReportCard(data.result);
    }
    loadSavedScriptReportsList();
    refreshAnalysisDerivedDataSilently();
    showToast('🎉 경쟁사 대본 역설계 및 맞춤 대본 생성이 완료되었습니다!');
  } catch (err) {
    if (statusBox) statusBox.style.display = 'block';
    if (statusText) statusText.innerHTML = '<span style="color:#ff7676">❌ ' + esc(err.message) + '</span>';
  }
}


function renderSingleAiReportCard(r) {
  const v = r.video || {};
  const ai = r.aiInsights || {};
  const pitches = ai.actionableContentPitches || {};
  const thumb = v.thumbnail || (r.videoId ? 'https://i.ytimg.com/vi/' + r.videoId + '/mqdefault.jpg' : '');
  const isMyChannel = v.channelId === 'UCwNrEdm2jYAtUlfHVvH3WQw' || 
    (v.channelTitle && (v.channelTitle.includes('이해하면 쉬운 영어') || v.channelTitle.includes('이해하면 쉬운영어'))) ||
    (gDashboard?.recentVideos || []).some(rv => rv.videoId === r.videoId);

  const channelBadge = isMyChannel 
    ? '<span class="badge badge-magenta" style="font-size:11px;font-weight:700;margin-right:6px">🏠 내 채널 영상 (VoC 분석)</span>' 
    : '<span class="badge badge-cyan" style="font-size:11px;font-weight:700;margin-right:6px">🎯 외부 경쟁사 벤치마크</span>';

  return '<div style="border-bottom:1px solid var(--border-subtle);padding-bottom:20px;margin-bottom:20px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:14px">' +
      '<div style="display:flex;gap:14px;align-items:center">' +
        (thumb ? '<img class="thumb-img" style="width:140px;height:79px" src="' + esc(thumb) + '" alt="">' : '') +
        '<div>' +
          '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">' +
            channelBadge +
            '<span class="badge badge-pass" style="font-size:10px">댓글 분석 완료</span>' +
          '</div>' +
          '<h3 style="font-family:var(--font-display);font-size:18px;color:var(--text-bright);margin-top:2px">' + esc(v.title) + '</h3>' +
          '<div class="card-subtext">' + esc(v.channelTitle) + ' · 조회수 ' + fmt.format(v.viewCount) + '회 · 댓글 ' + (r.commentsCount || 0) + '개 수집</div>' +
        '</div>' +
      '</div>' +
      '<button class="btn btn-sm btn-magenta btn-copy-text" data-text="' + encodeURIComponent(r.markdown || '') + '">📋 전체 마크다운 복사</button>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:14px">' +
      '<div style="background:#080c14;border:1px solid var(--border-subtle);border-radius:12px;padding:14px">' +
        '<div class="card-title" style="color:var(--accent-magenta)">💡 시청자 핵심 고통 (Pain Points)</div>' +
        '<ul style="margin:8px 0 0 18px;font-size:13px;line-height:1.6">' +
          (ai.painPoints || []).slice(0, 4).map(p => '<li>' + esc(typeof p === 'string' ? p : Object.values(p)[0]) + '</li>').join('') +
        '</ul>' +
      '</div>' +

      '<div style="background:#080c14;border:1px solid var(--border-subtle);border-radius:12px;padding:14px">' +
        '<div class="card-title" style="color:var(--accent-amber)">❓ 미해결 질문 (차기 영상 소재)</div>' +
        '<ul style="margin:8px 0 0 18px;font-size:13px;line-height:1.6">' +
          (ai.audienceQuestions || []).slice(0, 4).map(q => '<li>' + esc(typeof q === 'string' ? q : Object.values(q)[0]) + '</li>').join('') +
        '</ul>' +
      '</div>' +
    '</div>' +

    (pitches.hookThreeSeconds ? 
      '<div style="background:linear-gradient(135deg,rgba(255,209,102,0.1),rgba(255,42,109,0.05));border-left:4px solid var(--accent-amber);border-radius:0 12px 12px 0;padding:14px 18px;margin-top:14px">' +
        '<div class="card-title" style="color:var(--accent-amber)">⚡ 추천 첫 3초 후킹 멘트</div>' +
        '<div style="font-size:15px;font-weight:700;color:var(--text-bright);margin-top:4px">"' + esc(pitches.hookThreeSeconds) + '"</div>' +
      '</div>' : '') +
  '</div>';
}

function renderSingleScriptReportCard(r) {
  const v = r.video || {};
  const ai = r.aiInsights || {};
  const h = ai.hookingAnatomy || {};
  const adapted = ai.ourAdaptedScript || {};
  const thumb = v.thumbnail || (r.videoId ? 'https://i.ytimg.com/vi/' + r.videoId + '/mqdefault.jpg' : '');
  const isMyChannel = v.channelId === 'UCwNrEdm2jYAtUlfHVvH3WQw' || 
    (v.channelTitle && (v.channelTitle.includes('이해하면 쉬운 영어') || v.channelTitle.includes('이해하면 쉬운영어'))) ||
    (gDashboard?.recentVideos || []).some(rv => rv.videoId === r.videoId);

  const channelBadge = isMyChannel 
    ? '<span class="badge badge-magenta" style="font-size:11px;font-weight:700;margin-right:6px">🏠 내 채널 영상 (자체 대본 검증)</span>' 
    : '<span class="badge badge-cyan" style="font-size:11px;font-weight:700;margin-right:6px">🎯 외부 경쟁사 벤치마크 (대본 역설계)</span>';

  return '<div style="border-bottom:1px solid var(--border-subtle);padding-bottom:24px;margin-bottom:24px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:14px">' +
      '<div style="display:flex;gap:14px;align-items:center">' +
        (thumb ? '<img class="thumb-img" style="width:140px;height:79px" src="' + esc(thumb) + '" alt="">' : '') +
        '<div>' +
          '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">' +
            channelBadge +
            '<span class="badge badge-pass" style="font-size:10px">대본 역설계 완료</span>' +
          '</div>' +
          '<h3 style="font-family:var(--font-display);font-size:18px;color:var(--text-bright);margin-top:2px">' + esc(v.title) + '</h3>' +
          '<div class="card-subtext">' + esc(v.channelTitle) + ' · 조회수 ' + fmt.format(v.viewCount) + '회 · 자막 ' + (r.transcript?.lineCount || 0) + '행</div>' +
        '</div>' +
      '</div>' +
      '<button class="btn btn-sm btn-magenta btn-copy-text" data-text="' + encodeURIComponent(r.markdown || '') + '">📋 전체 마크다운 복사</button>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:14px">' +
      '<div style="background:#080c14;border:1px solid var(--border-subtle);border-radius:12px;padding:14px">' +
        '<div class="card-title" style="color:var(--accent-amber)">🎯 첫 5~15초 후킹 해부 (Hooking Anatomy)</div>' +
        '<div style="font-size:12px;color:var(--accent-cyan);font-weight:700;margin-top:6px">기법: ' + esc(h.technique || '오프닝 분석') + '</div>' +
        '<div style="font-size:14px;color:var(--text-bright);font-weight:700;margin:6px 0;line-height:1.4">"' + esc(h.openingHookQuote || '') + '"</div>' +
        '<div style="font-size:12px;color:var(--text-normal);line-height:1.5">' + esc(h.whyItWorked || '') + '</div>' +
      '</div>' +

      '<div style="background:#080c14;border:1px solid var(--border-subtle);border-radius:12px;padding:14px">' +
        '<div class="card-title" style="color:var(--accent-magenta)">💡 핵심 비유법 & 개념 앵커</div>' +
        '<ul style="margin:8px 0 0 18px;font-size:13px;line-height:1.6">' +
          (ai.coreMetaphors || []).map(m => '<li><b>' + esc(m.concept) + '</b> ➔ <code>' + esc(m.metaphorUsed) + '</code> (' + esc(m.evaluation) + ')</li>').join('') +
        '</ul>' +
      '</div>' +
    '</div>' +

    (ai.blindSpots?.length ? 
      '<div style="background:rgba(255,107,107,0.06);border:1px solid rgba(255,107,107,0.3);border-radius:12px;padding:14px;margin-top:14px">' +
        '<div class="card-title" style="color:#ff7676">⚠️ 경쟁사 대본의 맹점 (우리가 공략할 빈틈)</div>' +
        '<ul style="margin:8px 0 0 18px;font-size:13px;line-height:1.6;color:var(--text-bright)">' +
          ai.blindSpots.map(b => '<li>' + esc(b) + '</li>').join('') +
        '</ul>' +
      '</div>' : '') +

    (adapted.recommendedTitle ? 
      '<div style="background:linear-gradient(135deg,rgba(0,240,255,0.08),rgba(255,42,109,0.05));border:1px solid var(--accent-cyan);border-radius:12px;padding:16px;margin-top:14px">' +
        '<div class="card-title" style="color:var(--accent-cyan)">🎬 &lsquo;이해하면 쉬운영어&rsquo; 맞춤 재해석 대본 완성본</div>' +
        '<div style="font-size:16px;font-weight:700;color:var(--text-bright);margin:6px 0">' + esc(adapted.recommendedTitle) + '</div>' +
        '<div style="font-size:13px;color:var(--accent-amber);margin-bottom:12px">⚡ <b>첫 3초 후킹:</b> "' + esc(adapted.openingHook || '') + '"</div>' +
        (adapted.shortsTrackA ? '<div style="margin-top:8px"><div class="badge badge-pass" style="font-size:10px;margin-bottom:4px">쇼츠 Track A (원리형 30초)</div><pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;background:#05070c;padding:12px;border-radius:8px;border:1px solid var(--border-subtle)">' + esc(adapted.shortsTrackA.scriptText || adapted.shortsTrackA.concept || '') + '</pre></div>' : '') +
      '</div>' : '') +
  '</div>';
}

async function loadSavedReportsList() {
  const container = document.getElementById('saved-reports-grid');
  if (!container) return;
  try {
    const res = await fetch('/api/insights/list');
    const data = await res.json();
    if (!data.reports || data.reports.length === 0) {
      container.innerHTML = '<div class="card-subtext">저장된 댓글 분석 리포트가 없습니다.</div>';
      return;
    }
    container.innerHTML = data.reports.map(r => {
      const typeBadge = r.isMyChannel
        ? '<span class="badge badge-magenta" style="font-size:10px">🏠 내 채널 VoC</span>'
        : '<span class="badge badge-cyan" style="font-size:10px">🎯 경쟁사 벤치마크</span>';

      return '<div style="background:#080d16;border:1px solid var(--border-subtle);border-radius:12px;padding:14px;display:flex;flex-direction:column;justify-content:space-between">' +
        '<div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            typeBadge +
            '<span class="card-subtext" style="font-size:10px">' + esc(r.date || '') + '</span>' +
          '</div>' +
          '<div style="font-weight:700;font-size:14px;color:var(--text-bright);line-height:1.4">' + esc(r.title) + '</div>' +
          (r.channelName ? '<div class="card-subtext" style="margin-top:4px;font-size:11px">채널: ' + esc(r.channelName) + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<button class="btn btn-sm btn-cyan btn-view-report" data-file="' + esc(r.file) + '">📄 전문 열람</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {
    container.innerHTML = '<div style="color:#ff7676">리포트 목록 로드 실패: ' + esc(err.message) + '</div>';
  }
}

async function loadSavedScriptReportsList() {
  const container = document.getElementById('saved-reports-grid');
  if (!container) return;
  try {
    const res = await fetch('/api/scripts/list');
    const data = await res.json();
    if (!data.reports || data.reports.length === 0) {
      container.innerHTML = '<div class="card-subtext">저장된 대본 역설계 리포트가 없습니다.</div>';
      return;
    }
    container.innerHTML = data.reports.map(r => {
      const typeBadge = r.isMyChannel
        ? '<span class="badge badge-magenta" style="font-size:10px">🏠 내 채널 대본</span>'
        : '<span class="badge badge-cyan" style="font-size:10px">🎯 경쟁사 대본 역설계</span>';

      return '<div style="background:#080d16;border:1px solid var(--border-subtle);border-radius:12px;padding:14px;display:flex;flex-direction:column;justify-content:space-between">' +
        '<div>' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            typeBadge +
            '<span class="card-subtext" style="font-size:10px">' + esc(r.date || '') + '</span>' +
          '</div>' +
          '<div style="font-weight:700;font-size:14px;color:var(--text-bright);line-height:1.4">' + esc(r.title) + '</div>' +
          (r.channelName ? '<div class="card-subtext" style="margin-top:4px;font-size:11px">채널: ' + esc(r.channelName) + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px;margin-top:12px">' +
          '<button class="btn btn-sm btn-cyan btn-view-script-report" data-file="' + esc(r.file) + '">📜 대본 전문 열람</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {
    container.innerHTML = '<div style="color:#ff7676">대본 리포트 목록 로드 실패: ' + esc(err.message) + '</div>';
  }
}

async function viewSavedReportDetail(file) {
  try {
    const res = await fetch('/api/insights/report?file=' + encodeURIComponent(file));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '리포트를 읽지 못했습니다.');
    const contentHtml = 
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<div><b>' + esc(data.file) + '</b></div>' +
        '<button class="btn btn-sm btn-magenta btn-copy-text" data-text="' + encodeURIComponent(data.content || '') + '">📋 마크다운 복사</button>' +
      '</div>' +
      '<pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;background:#05070c;padding:16px;border-radius:12px;border:1px solid var(--border-subtle);max-height:60vh;overflow-y:auto">' + esc(data.content) + '</pre>';
    openModal('📑 아웃라이어 댓글 기획 리포트', contentHtml);
  } catch (err) {
    alert('❌ 오류: ' + err.message);
  }
}

async function viewSavedScriptReportDetail(file) {
  try {
    const res = await fetch('/api/scripts/report?file=' + encodeURIComponent(file));
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '대본 리포트를 읽지 못했습니다.');
    const contentHtml = 
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<div><b>' + esc(data.file) + '</b></div>' +
        '<button class="btn btn-sm btn-magenta btn-copy-text" data-text="' + encodeURIComponent(data.content || '') + '">📋 마크다운 복사</button>' +
      '</div>' +
      '<pre style="white-space:pre-wrap;font-family:var(--font-mono);font-size:12px;background:#05070c;padding:16px;border-radius:12px;border:1px solid var(--border-subtle);max-height:60vh;overflow-y:auto">' + esc(data.content) + '</pre>';
    openModal('📜 아웃라이어 대본 역설계 리포트', contentHtml);
  } catch (err) {
    alert('❌ 오류: ' + err.message);
  }
}

/* TAB 4: EPISODES & UPLOAD PACKAGING */
function renderEpisodesTab() {
  const eps = gEpisodes || [];
  let html = '<div class="bento-grid">' +
    '<div class="bento-card col-12" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">' +
      '<div>' +
        '<div class="card-title" style="color:var(--accent-magenta)">PIPELINE & PACKAGING</div>' +
        '<h2 style="font-family:var(--font-display);font-size:22px;color:var(--text-bright);margin-top:2px">🎬 에피소드 제작 파이프라인 & 1-Click 업로드 패키징</h2>' +
        '<div class="card-subtext">시즌1 완결 및 시즌2 기획 허브 · 제목, 설명문, 태그, 고정댓글 1클릭 복사 인스펙터</div>' +
      '</div>' +
      '<button class="btn btn-cyan btn-sm" onclick="openFacelessGuideModal()">💡 Faceless 비디오 제작 가이드</button>' +
    '</div>' +
    '<div id="schedule-panel-container" class="bento-card col-12" style="background:linear-gradient(180deg, rgba(16,22,34,0.95) 0%, rgba(10,14,24,0.95) 100%);border:1px solid rgba(0,229,255,0.25);border-radius:12px;padding:20px;margin-bottom:8px">' +
      '<div style="display:flex;align-items:center;gap:10px;color:var(--text-muted);font-size:13px">' +
        '<div class="loading-spinner" style="width:16px;height:16px;border:2px solid var(--accent-cyan);border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite"></div>' +
        '<span>발행 스케줄 및 업로드 대기 큐 로딩 중...</span>' +
      '</div>' +
    '</div>';

  const isShortsEp = (ep) => ep.kind === 'shorts' || ep.season === '쇼츠' || (!ep.tracks?.longform && (ep.tracks?.['shorts-a'] || ep.tracks?.['shorts-b']));
  const totalCount = eps.length;
  const longCount = eps.filter(e => !isShortsEp(e)).length;
  const shortsCount = eps.filter(e => isShortsEp(e)).length;

  html += '<div class="bento-card col-12" style="display:flex;justify-content:space-between;align-items:center;padding:12px 20px;margin-bottom:12px;background:rgba(15,20,32,0.85);border:1px solid var(--border-subtle);border-radius:12px;">' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
      '<span style="font-size:13px;font-weight:700;color:var(--text-muted);margin-right:4px;">포맷 필터:</span>' +
      '<button class="btn btn-sm ' + (gEpisodeFilter === 'ALL' ? 'btn-cyan' : '') + ' btn-ep-filter" data-filter="ALL">전체 (' + totalCount + ')</button>' +
      '<button class="btn btn-sm ' + (gEpisodeFilter === 'LONGFORM' ? 'btn-cyan' : '') + ' btn-ep-filter" data-filter="LONGFORM">🎬 롱폼 (' + longCount + ')</button>' +
      '<button class="btn btn-sm ' + (gEpisodeFilter === 'SHORTS' ? 'btn-magenta' : '') + ' btn-ep-filter" data-filter="SHORTS">📱 쇼츠 (' + shortsCount + ')</button>' +
    '</div>' +
    '<div class="card-subtext" style="font-size:12px;">💡 쇼츠와 롱폼이 분리되어 독립 카드로 표시됩니다.</div>' +
  '</div>';

  eps.forEach(ep => {
    const isEpShorts = isShortsEp(ep);
    if (gEpisodeFilter === 'LONGFORM' && isEpShorts) return;
    if (gEpisodeFilter === 'SHORTS' && !isEpShorts) return;

    if (isEpShorts) {
      const track = ep.tracks?.shorts || ep.tracks?.longform || ep.tracks?.['shorts-a'] || ep.tracks?.['shorts-b'] || {};
      const yt = track.youtube || {};
      const thumbUrl = yt.thumbnailCandidates?.[0]
        || (yt.videoId ? 'https://i.ytimg.com/vi/' + yt.videoId + '/mqdefault.jpg' : '');
      const isCandidateThumb = !yt.videoId;
      const statusText = track.statusLabel || track.status || 'READY';

      html += '<div class="bento-card col-3" style="border-top:3px solid var(--accent-magenta);">' +
        (thumbUrl ? '<div style="position:relative;margin-bottom:14px;background:#05070c;border-radius:10px;overflow:hidden;display:flex;justify-content:center;align-items:center;height:210px;border:1px solid var(--border-subtle);">' +
          '<img src="' + esc(thumbUrl) + '" style="height:100%;max-width:100%;aspect-ratio:9/16;object-fit:contain;border-radius:6px;display:block;" alt="">' +
          (isCandidateThumb ? '<span style="position:absolute;top:8px;left:8px;background:rgba(5,7,12,0.85);color:var(--text-bright);font-size:11px;padding:3px 8px;border-radius:6px">시안 후보</span>' : '') +
          '<span style="position:absolute;top:8px;right:8px;background:var(--accent-magenta);color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px">SHORTS (9:16)</span>' +
        '</div>' : '') +
        '<div class="card-header">' +
          '<span style="font-family:var(--font-display);font-size:16px;font-weight:800;color:var(--accent-magenta);white-space:nowrap">📱 ' + esc(ep.episode) + '</span>' +
          '<span class="badge badge-pass" style="white-space:nowrap">' + esc(statusText) + '</span>' +
        '</div>' +
        '<div style="font-weight:700;font-size:14px;color:var(--text-normal);margin-bottom:10px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + esc(yt.title || '(제목 미지정)') + '</div>' +
        '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">' +
          (ep.parentEpisode ? '<span class="tag-chip btn-filter-to-longform" style="border-color:var(--accent-cyan);color:var(--accent-cyan);font-size:11px;cursor:pointer;">🔗 ' + esc(ep.parentEpisode) + ' 롱폼 연계</span>' : '') +
          (yt.videoId ? '<span class="tag-chip" style="font-size:11px;">쇼츠 ID: ' + esc(yt.videoId) + '</span>' : '') +
        '</div>' +
        '<div style="display:flex;gap:8px">' +
          '<button class="btn btn-sm btn-magenta btn-inspect-pkg" data-season="' + esc(ep.season) + '" data-ep="' + esc(ep.episode) + '" style="width:100%;justify-content:center;">📦 쇼츠 패키지 열기</button>' +
        '</div>' +
      '</div>';
      return;
    }

    const long = ep.tracks?.longform?.youtube || {};
    const thumbUrl = long.thumbnailCandidates?.[0]
      || (long.videoId ? 'https://i.ytimg.com/vi/' + long.videoId + '/mqdefault.jpg' : '');
    const isCandidateThumb = !long.videoId;
    const statusText = ep.tracks?.longform?.statusLabel || ep.tracks?.longform?.status || 'READY';
    const relatedCount = ep.relatedShorts?.length || (ep.tracks?.['shorts-b'] ? 2 : (ep.tracks?.['shorts-a'] ? 1 : 0));
    const reach = long.videoId ? (gDashboard?.videoReachManual?.videos || {})[long.videoId] : null;
    const latestPeriod = reach ? pickLatestPeriod(reach.periods) : null;
    const ctrChip = (latestPeriod && latestPeriod.ctr != null)
      ? '<span class="tag-chip" style="border-color:var(--accent-cyan);color:var(--accent-cyan);font-size:11px;" title="' + esc(latestPeriod.startDate || '') + ' ~ ' + esc(latestPeriod.endDate || '') + ' 성과">📊 최근 CTR ' + Number(latestPeriod.ctr).toFixed(2) + '% (' + fmt.format(latestPeriod.impressions || 0) + '회)</span>'
      : '';

    html += '<div class="bento-card col-3" style="border-top:3px solid var(--accent-cyan);">' +
      (thumbUrl ? '<div style="position:relative;margin-bottom:14px;background:#05070c;border-radius:10px;overflow:hidden;border:1px solid var(--border-subtle);">' +
        '<img class="thumb-img" src="' + esc(thumbUrl) + '" style="width:100%;aspect-ratio:16/9;object-fit:cover;display:block;" alt="">' +
        (isCandidateThumb ? '<span style="position:absolute;top:8px;left:8px;background:rgba(5,7,12,0.85);color:var(--text-bright);font-size:11px;padding:3px 8px;border-radius:6px">시안 후보</span>' : '') +
        '<span style="position:absolute;top:8px;right:8px;background:var(--accent-cyan);color:#000;font-size:10px;font-weight:800;padding:2px 6px;border-radius:4px">LONGFORM (16:9)</span>' +
      '</div>' : '') +
      '<div class="card-header">' +
        '<span style="font-family:var(--font-display);font-size:17px;font-weight:800;color:var(--text-bright);white-space:nowrap">' + esc(ep.season.toUpperCase()) + ' · ' + esc(ep.episode.toUpperCase()) + '</span>' +
        '<span class="badge badge-pass" style="white-space:nowrap">' + esc(statusText) + '</span>' +
      '</div>' +
      '<div style="font-weight:700;font-size:15px;color:var(--text-normal);margin-bottom:10px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + esc(long.title || '(제목 미지정)') + '</div>' +
      '<div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">' +
        (long.videoId ? '<span class="tag-chip" style="font-size:11px;">롱폼: ' + esc(long.videoId) + '</span>' : '') +
        ctrChip +
        (relatedCount > 0 ? '<span class="tag-chip btn-filter-to-shorts" style="border-color:var(--accent-magenta);color:var(--accent-magenta);font-size:11px;cursor:pointer;">📱 쇼츠 ' + relatedCount + '개</span>' : '') +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-sm btn-cyan btn-inspect-pkg" data-season="' + esc(ep.season) + '" data-ep="' + esc(ep.episode) + '" style="width:100%;justify-content:center;">📦 롱폼 패키지 열기</button>' +
      '</div>' +
    '</div>';
  });

  html += '</div>';
  return html;
}

function renderSchedulePanelHtml(data) {
  if (!data || !data.rules) return '<div style="color:var(--text-muted)">스케줄 데이터를 불러올 수 없습니다.</div>';
  const rules = data.rules;
  const queue = data.queue || [];
  const throttle = data.throttle || { allowed: true, uploadsLast24h: 0, uploadsLast7d: 0 };
  const isEnabled = rules.autoUploadEnabled;

  const days = [
    { label: '일', val: 0 },
    { label: '월', val: 1 },
    { label: '화', val: 2 },
    { label: '수', val: 3 },
    { label: '목', val: 4 },
    { label: '금', val: 5 },
    { label: '토', val: 6 },
  ];

  let daysHtml = days.map(d => {
    const checked = (rules.allowedDaysOfWeek || []).includes(d.val) ? 'checked' : '';
    return '<label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;padding:4px 8px;background:rgba(255,255,255,0.05);border-radius:6px;font-size:12px">' +
      '<input type="checkbox" class="sched-day-cb" value="' + d.val + '" ' + checked + '> ' + d.label +
    '</label>';
  }).join(' ');

  const attention = data.attention || [];
  const notices = data.notices || [];
  const hasScope = data.hasUploadScope === true;
  const channelOk = data.channelOk === true;

  const alertBox = (color, body, actions) =>
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;background:rgba(0,0,0,0.25);border:1px solid ' + color + ';border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:13px;color:var(--text-normal)">' +
      '<div style="min-width:0;overflow-wrap:anywhere">' + body + '</div>' +
      (actions ? '<div style="display:flex;gap:8px;flex-shrink:0">' + actions + '</div>' : '') +
    '</div>';

  let alertsHtml = '';
  if (data.connectedChannel && !channelOk) {
    alertsHtml += alertBox('var(--accent-red)', '🛑 지금 연동된 채널은 <b>' + esc(data.connectedChannel.title) + '</b>입니다. 우리 채널이 아니라 올리지도 동기화하지도 않습니다. 재연동할 때 <b>이해하면 쉬운 영어</b>를 골라 주세요.',
      '<a class="btn btn-sm btn-amber" href="/auth" style="padding:4px 10px;font-size:12px">🔗 채널 재연동</a>');
  } else if (!hasScope) {
    alertsHtml += alertBox('var(--accent-gold)', '⚠️ 유튜브 업로드 권한이 없어 지금은 올릴 수 없습니다. 채널을 재연동하면 권한이 추가됩니다.',
      '<a class="btn btn-sm btn-amber" href="/auth" style="padding:4px 10px;font-size:12px">🔗 채널 재연동</a>');
  }
  attention.forEach((item) => {
    const isThumbnail = item.kind === 'thumbnail_failed';
    const title = isThumbnail ? '썸네일 등록 실패. 이대로면 자동 생성 썸네일로 공개될 수 있습니다.' : '업로드 실패. 해결할 때까지 다음 영상을 올리지 않습니다.';
    const actions = '<button class="btn btn-sm btn-cyan btn-resolve-upload" data-epid="' + esc(item.episodeId) + '" data-action="retry" style="padding:4px 10px;font-size:12px">다시 시도</button>' +
      (isThumbnail ? '<button class="btn btn-sm btn-outline btn-resolve-upload" data-epid="' + esc(item.episodeId) + '" data-action="dismiss" style="padding:4px 10px;font-size:12px">스튜디오에서 해결함</button>' : '');
    alertsHtml += alertBox('var(--accent-red)', '🛑 <b>' + esc(item.episodeId) + '</b> ' + title + '<br><span style="color:var(--text-muted);font-size:12px">' + esc(item.message) + '</span>', actions);
  });
  notices.forEach((item) => {
    const message = item.published
      ? '공개됐습니다. 지금 고정 댓글을 등록하고 고정해 주세요.'
      : '고정 댓글은 공개된 뒤 직접 등록해 주세요. 예약 영상에는 댓글을 달 수 없습니다.';
    const openLink = item.published && item.videoId
      ? '<a class="btn btn-sm btn-outline" href="https://youtu.be/' + encodeURIComponent(item.videoId) + '" target="_blank" rel="noopener" style="padding:4px 10px;font-size:12px">영상 열기</a>'
      : '';
    alertsHtml += alertBox('rgba(255,255,255,0.15)', '💬 <b>' + esc(item.episodeId) + '</b> ' + message,
      openLink + '<button class="btn btn-sm btn-outline btn-comment-done" data-epid="' + esc(item.episodeId) + '" style="padding:4px 10px;font-size:12px">등록함</button>');
  });
  if (isEnabled && data.nextDecision && !data.nextDecision.ok) {
    alertsHtml += alertBox('rgba(255,255,255,0.15)', '⏸️ 자동 업로드 대기 중: ' + esc(data.nextDecision.reason), '');
  }

  let queueRowsHtml = '';
  if (queue.length === 0) {
    queueRowsHtml = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted)">대기 중인 패키지가 없습니다.</td></tr>';
  } else {
    queue.forEach((item, idx) => {
      const kstDateStr = item.scheduledFor ? new Date(item.scheduledFor).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
      const blockers = item.blockers || [];
      const thumbnailApproved = !!item.thumbnailFileName && !!item.thumbnailApproval && item.thumbnailApproval.sha256 === item.thumbnailSha256;
      const thumbnailCell = item.thumbnailFileName
        ? '<img src="/api/upload-package-asset/' + encodeURIComponent(item.episodeId) + '/' + encodeURIComponent(item.thumbnailFileName) + '" alt="' + esc(item.episodeId) + ' 썸네일" loading="lazy" style="width:112px;aspect-ratio:16/9;object-fit:cover;border-radius:6px;display:block">' +
          (thumbnailApproved
            ? '<div style="margin-top:4px;font-size:11px;color:#10b981">✓ 승인됨</div>'
            : '<button class="btn btn-sm btn-cyan btn-approve-thumbnail" data-epid="' + esc(item.episodeId) + '" style="margin-top:4px;padding:2px 8px;font-size:11px">이 썸네일 승인</button>')
        : '<span style="font-size:12px;color:var(--accent-red)">thumbnail.jpg 없음</span>';
      const statusCell = blockers.length
        ? blockers.map((text) => '<div style="font-size:12px;color:var(--accent-red);overflow-wrap:anywhere">' + esc(text) + '</div>').join('')
        : '<span class="badge badge-pass" style="background:rgba(0,229,255,0.15);color:var(--accent-cyan)">준비 완료</span>';
      const canUpload = idx === 0 && blockers.length === 0 && attention.length === 0 && hasScope && channelOk;
      queueRowsHtml += '<tr style="border-bottom:1px solid rgba(255,255,255,0.05)">' +
        '<td style="padding:10px 8px;color:var(--text-muted);font-weight:700">#' + (idx + 1) + '</td>' +
        '<td style="padding:10px 8px">' + thumbnailCell + '</td>' +
        '<td style="padding:10px 8px;font-weight:700;color:var(--accent-cyan);white-space:nowrap">' + esc(item.episodeId) + '</td>' +
        '<td style="padding:10px 8px;color:var(--text-bright);max-width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + esc(item.title) + '">' + esc(item.title) + '</td>' +
        '<td style="padding:10px 8px;color:var(--accent-gold);font-weight:700;white-space:nowrap">🗓️ ' + esc(kstDateStr) + '</td>' +
        '<td style="padding:10px 8px;min-width:150px">' + statusCell + '</td>' +
        '<td style="padding:10px 8px;white-space:nowrap">' +
          (canUpload ? '<button class="btn btn-sm btn-magenta btn-upload-now" data-epid="' + esc(item.episodeId) + '" style="padding:4px 10px;font-size:12px">🚀 즉시 예약 업로드</button>' : '<span style="font-size:12px;color:var(--text-muted)">' + (idx === 0 ? '조건 미충족' : '앞 편 다음') + '</span>') +
        '</td>' +
      '</tr>';
    });
  }

  return alertsHtml + '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">' +
    '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;min-width:0">' +
      '<span style="font-size:18px;font-weight:800;color:var(--text-bright)">📅 YouTube 자동 예약 업로드 & 발행 스케줄러</span>' +
      '<span class="badge" style="' + (isEnabled ? 'background:rgba(16,185,129,0.2);color:#10b981' : 'background:rgba(255,255,255,0.1);color:var(--text-muted)') + '">' + (isEnabled ? '🟢 자동 업로드 활성' : '⚪ 자동 업로드 비활성') + '</span>' +
      '<button id="btn-toggle-auto-upload" class="btn btn-sm ' + (isEnabled ? 'btn-danger' : 'btn-cyan') + '" style="padding:3px 10px;font-size:12px">' + (isEnabled ? '자동 업로드 끄기' : '자동 업로드 켜기') + '</button>' +
    '</div>' +
    '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;font-size:12px;color:var(--text-muted)">' +
      '<span class="tag-chip" style="background:rgba(0,229,255,0.08);color:var(--accent-cyan)">🛡️ 일일 한도: ' + throttle.uploadsLast24h + '/1편</span>' +
      '<span class="tag-chip" style="background:rgba(168,85,247,0.08);color:var(--accent-purple)">🛡️ 주간 한도: ' + throttle.uploadsLast7d + '/2편</span>' +
    '</div>' +
  '</div>' +
  '<div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:14px;margin-bottom:16px;display:flex;flex-wrap:wrap;align-items:center;gap:16px">' +
    '<div style="display:flex;align-items:center;gap:8px">' +
      '<label style="font-size:13px;font-weight:700;color:var(--text-normal)">⏰ 발행 시각:</label>' +
      '<input type="time" id="sched-publish-time" value="' + esc(rules.publishTimeKst || '23:00') + '" style="background:#0c101d;border:1px solid rgba(255,255,255,0.15);color:#fff;padding:4px 8px;border-radius:6px;font-size:13px">' +
      '<span style="font-size:11px;color:var(--text-muted)">KST (밤 11시)</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<label style="font-size:13px;font-weight:700;color:var(--text-normal)">🗓️ 발행 요일:</label>' +
      daysHtml +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px">' +
      '<button id="btn-save-schedule-rules" class="btn btn-sm btn-cyan" style="padding:5px 14px;font-weight:700">💾 스케줄 설정 저장</button>' +
    '</div>' +
  '</div>' +
  '<div style="margin-top:12px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
      '<span style="font-size:14px;font-weight:700;color:var(--text-bright)">📋 대기 큐 (에피소드 오름차순 예약 목록)</span>' +
      '<span style="font-size:12px;color:var(--text-muted)">총 ' + queue.length + '편 대기 중</span>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">올라간 뒤 끝 화면, 재생목록, 댓글 고정, 제목·썸네일 테스트는 스튜디오에서 직접 합니다.</div>' +
    '<div style="overflow-x:auto">' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left">' +
        '<thead>' +
          '<tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:var(--text-muted);font-size:12px">' +
            '<th style="padding:8px">#</th>' +
            '<th style="padding:8px">메인 썸네일</th>' +
            '<th style="padding:8px">에피소드</th>' +
            '<th style="padding:8px">제목</th>' +
            '<th style="padding:8px">예약 배정 일시 (KST)</th>' +
            '<th style="padding:8px">상태</th>' +
            '<th style="padding:8px">수동 제어</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          queueRowsHtml +
        '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

async function loadAndBindSchedulePanel() {
  const container = document.getElementById('schedule-panel-container');
  if (!container) return;
  try {
    const res = await fetch('/api/schedule/queue');
    const data = await res.json();
    container.innerHTML = renderSchedulePanelHtml(data);

    // Toggle switch
    const toggleBtn = document.getElementById('btn-toggle-auto-upload');
    if (toggleBtn) {
      toggleBtn.onclick = async () => {
        const nextState = !data.rules.autoUploadEnabled;
        if (nextState && !confirm('자동 업로드를 켜면 썸네일을 승인한 영상부터 순서대로 유튜브에 비공개 예약으로 올라갑니다. 켤까요?')) return;
        toggleBtn.disabled = true;
        try {
          const toggleRes = await fetch('/api/schedule/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data.rules, autoUploadEnabled: nextState }),
          });
          if (!toggleRes.ok) throw new Error((await toggleRes.json()).error || '요청 실패');
          await loadAndBindSchedulePanel();
        } catch (err) {
          alert('설정 변경 실패: ' + err.message);
        } finally {
          toggleBtn.disabled = false;
        }
      };
    }

    // Save rules
    const saveBtn = document.getElementById('btn-save-schedule-rules');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        const timeInput = document.getElementById('sched-publish-time');
        const cbs = document.querySelectorAll('.sched-day-cb:checked');
        const allowedDays = Array.from(cbs).map(cb => parseInt(cb.value, 10));

        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';
        try {
          await fetch('/api/schedule/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...data.rules,
              publishTimeKst: timeInput.value || '23:00',
              allowedDaysOfWeek: allowedDays,
            }),
          });
          alert('발행 스케줄 설정이 저장되었습니다.');
          await loadAndBindSchedulePanel();
        } catch (err) {
          alert('저장 실패: ' + err.message);
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 스케줄 설정 저장';
        }
      };
    }

    // Approve thumbnail buttons
    document.querySelectorAll('.btn-approve-thumbnail').forEach(btn => {
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          const approveRes = await fetch('/api/schedule/approve-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId: btn.dataset.epid }),
          });
          if (!approveRes.ok) throw new Error((await approveRes.json()).error || '승인 실패');
          await loadAndBindSchedulePanel();
        } catch (err) {
          alert('썸네일 승인 실패: ' + err.message);
          btn.disabled = false;
        }
      };
    });

    // Pinned comment done buttons
    document.querySelectorAll('.btn-comment-done').forEach(btn => {
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          const doneRes = await fetch('/api/schedule/comment-done', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId: btn.dataset.epid }),
          });
          if (!doneRes.ok) throw new Error((await doneRes.json()).error || '처리 실패');
          await loadAndBindSchedulePanel();
        } catch (err) {
          alert('처리 실패: ' + err.message);
          btn.disabled = false;
        }
      };
    });

    // Resolve failed upload buttons
    document.querySelectorAll('.btn-resolve-upload').forEach(btn => {
      btn.onclick = async () => {
        btn.disabled = true;
        try {
          const resolveRes = await fetch('/api/schedule/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId: btn.dataset.epid, action: btn.dataset.action }),
          });
          if (!resolveRes.ok) throw new Error((await resolveRes.json()).error || '처리 실패');
          await loadAndBindSchedulePanel();
        } catch (err) {
          alert('처리 실패: ' + err.message);
          btn.disabled = false;
        }
      };
    });

    // Upload Now buttons
    document.querySelectorAll('.btn-upload-now').forEach(btn => {
      btn.onclick = async () => {
        const epId = btn.dataset.epid;
        if (!confirm('[' + epId + '] 영상을 지금 YouTube에 예약 상태로 업로드하시겠습니까?')) return;

        btn.disabled = true;
        btn.textContent = '업로드 중 (수 분 소요)...';
        try {
          const upRes = await fetch('/api/schedule/upload-now', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ episodeId: epId, force: true }),
          });
          const upData = await upRes.json();
          if (!upRes.ok) throw new Error(upData.error || '업로드 실패');
          const warnings = upData.result?.warnings || [];
          alert('[' + epId + '] YouTube 예약 업로드 성공! (Video ID: ' + (upData.result?.videoId || '') + ')' + (warnings.length ? ' 주의: ' + warnings.join(' / ') : ''));
          await loadAndBindSchedulePanel();
          if (typeof fetchDashboardData === 'function') fetchDashboardData();
        } catch (err) {
          alert('업로드 실패: ' + err.message);
          btn.disabled = false;
          btn.textContent = '🚀 즉시 예약 업로드';
        }
      };
    });
  } catch (err) {
    container.innerHTML = '<div style="color:var(--accent-red)">스케줄러 데이터를 불러오지 못했습니다: ' + esc(err.message) + '</div>';
  }
}

function bindEpisodeEvents() {
  loadAndBindSchedulePanel();
  document.querySelectorAll('.btn-ep-filter').forEach(btn => {
    btn.onclick = () => {
      gEpisodeFilter = btn.dataset.filter;
      renderCurrentTab();
    };
  });
  document.querySelectorAll('.btn-filter-to-shorts').forEach(btn => {
    btn.onclick = () => {
      gEpisodeFilter = 'SHORTS';
      renderCurrentTab();
    };
  });
  document.querySelectorAll('.btn-filter-to-longform').forEach(btn => {
    btn.onclick = () => {
      gEpisodeFilter = 'LONGFORM';
      renderCurrentTab();
    };
  });
  document.querySelectorAll('.btn-inspect-pkg').forEach(btn => {
    btn.onclick = () => {
      const season = btn.dataset.season;
      const ep = btn.dataset.ep;
      const epData = (gEpisodes || []).find(e => e.season === season && e.episode === ep);
      if (!epData) return;
      openEpisodeInspectorModal(epData);
    };
  });
}
window.setEpisodeFilter = (filter) => {
  gEpisodeFilter = filter;
  renderCurrentTab();
};

function openEpisodeInspectorModal(epData) {
  const tracks = epData.tracks || {};
  let tabsHtml = '<div style="display:flex;gap:8px;margin-bottom:16px">';
  Object.keys(tracks).forEach((t, i) => {
    tabsHtml += '<button class="btn btn-sm ' + (i === 0 ? 'btn-cyan' : '') + ' ep-modal-tab" data-track="' + t + '">' + t.toUpperCase() + '</button>';
  });
  tabsHtml += '</div>';

  let bodyHtml = tabsHtml + '<div id="ep-modal-track-content"></div>';
  openModal(epData.season.toUpperCase() + ' ' + epData.episode.toUpperCase() + ' 업로드 패키지 인스펙터', bodyHtml);

  const renderTrackDetail = (trackKey) => {
    const data = tracks[trackKey] || {};
    const yt = data.youtube || {};
    const candidates = yt.thumbnailCandidates || [];
    // 로컬 후보 썸네일이 있으면 항상 그 갤러리를 보여준다 — CDN 썸네일(i.ytimg.com)은 videoId가
    // 있어도 영상이 비공개/예약 상태면 깨진 이미지로 뜨기 때문(2026-09-11 확인). 로컬 파일이
    // 없을 때만 CDN 단일 이미지로 폴백.
    const cdnThumbUrl = yt.videoId ? 'https://i.ytimg.com/vi/' + yt.videoId + '/mqdefault.jpg' : '';
    const hasLocalCandidates = candidates.length > 0;

    const content =
      '<div style="display:grid;gap:14px">' +
        (!hasLocalCandidates && cdnThumbUrl ? '<img class="thumb-img" style="max-height:220px;margin-bottom:8px" src="' + esc(cdnThumbUrl) + '" alt="">' : '') +
        (hasLocalCandidates ?
          '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
            '<div class="card-title" style="margin-bottom:8px">🖼️ 썸네일 후보 (' + candidates.length + '종)</div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
              candidates.map((c) => '<img src="' + esc(c) + '" style="width:180px;border-radius:8px;border:1px solid var(--border-subtle)" alt="">').join('') +
            '</div>' +
          '</div>' : '') +
        (yt.videoAssetUrl ?
          '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
            '<div class="card-title" style="margin-bottom:8px">🎬 영상 미리보기</div>' +
            '<video src="' + esc(yt.videoAssetUrl) + '" controls style="width:100%;max-height:360px;border-radius:8px;background:#000"></video>' +
          '</div>' : '') +
        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">📌 영상 제목</span>' +
            '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(yt.title || '') + '">복사</button>' +
          '</div>' +
          '<div style="font-weight:700;font-size:15px;color:var(--text-bright)">' + esc(yt.title || '') + '</div>' +
        '</div>' +

        ((yt.titleVariants && yt.titleVariants.length > 0) ?
          '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
              '<span class="card-title">🔤 제목 A/B 테스트 후보 (' + yt.titleVariants.length + '종)</span>' +
              '<span style="font-size:11px;color:var(--text-muted)">Studio "제목 및 썸네일 테스트"에 등록</span>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:8px">' +
              yt.titleVariants.map((v) =>
                '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 12px;background:rgba(15,20,30,0.6);border-radius:8px;border:1px solid var(--border-subtle)">' +
                  '<div>' +
                    '<span style="font-size:11px;color:var(--accent-amber);font-weight:800;display:block;margin-bottom:2px">[' + esc(v.id) + ']' + (v.note ? ' ' + esc(v.note) : '') + '</span>' +
                    '<span style="font-size:13px;color:var(--text-normal)">' + esc(v.title) + '</span>' +
                  '</div>' +
                  '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(v.title) + '">복사</button>' +
                '</div>'
              ).join('') +
            '</div>' +
          '</div>' : '') +

        ((yt.multilingualVariants && yt.multilingualVariants.length > 0) ?
          '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
              '<span class="card-title">🌍 다국어 자막 & 번역 메타데이터 (' + yt.multilingualVariants.length + '개 언어)</span>' +
              '<span style="font-size:11px;color:var(--text-muted)">Studio [자막] 메뉴에 언어별 등록</span>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;gap:10px">' +
              yt.multilingualVariants.map((v) => {
                const flag = {ko: '🇰🇷', en: '🇺🇸', ja: '🇯🇵', es: '🇪🇸', vi: '🇻🇳', 'zh-cn': '🇨🇳', 'zh-tw': '🇹🇼'}[v.code] || '🌐';
                return '<div style="padding:12px;background:rgba(15,20,30,0.6);border-radius:8px;border:1px solid var(--border-subtle)">' +
                  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
                    '<span style="font-size:12px;color:var(--accent-amber);font-weight:800">' + flag + ' ' + esc(v.lang) + '</span>' +
                    (v.srtUrl ? '<a class="btn btn-sm" href="' + esc(v.srtUrl) + '" download style="text-decoration:none">⬇ .srt 다운로드</a>' : '<span style="font-size:11px;color:var(--text-muted)">.srt 없음</span>') +
                  '</div>' +
                  '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:6px">' +
                    '<span style="font-size:13px;font-weight:700;color:var(--text-bright)">' + esc(v.title) + '</span>' +
                    '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(v.title) + '" style="flex-shrink:0">제목 복사</button>' +
                  '</div>' +
                  '<details>' +
                    '<summary style="cursor:pointer;font-size:11px;color:var(--text-muted)">설명문 보기</summary>' +
                    '<div style="display:flex;justify-content:flex-end;margin:6px 0">' +
                      '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(v.desc) + '">설명문 복사</button>' +
                    '</div>' +
                    '<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.5;color:var(--text-muted);max-height:200px;overflow-y:auto;margin:0">' + esc(v.desc) + '</pre>' +
                  '</details>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' : '') +

        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">💬 고정 댓글 (Pinned Comment)</span>' +
            '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(yt.pinnedComment || '') + '">복사</button>' +
          '</div>' +
          '<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.5;color:var(--text-normal)">' + esc(yt.pinnedComment || '') + '</pre>' +
        '</div>' +

        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">📝 영상 설명문 (Description 전체 복사)</span>' +
            '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(yt.description || '') + '">설명문 전체 복사</button>' +
          '</div>' +
          '<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.5;color:var(--text-muted);max-height:360px;overflow-y:auto">' + esc(yt.description || '') + '</pre>' +
        '</div>' +

        (yt.timeline ? 
          '<div style="background:#080d16;padding:14px;border-radius:12px;border:1.5px solid var(--accent-amber);box-shadow:0 0 15px rgba(255,209,102,0.12)">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
              '<div>' +
                '<span class="card-title" style="color:var(--accent-amber);font-weight:800">⏱️ 영상 순서 / 챕터 타임라인 (Timestamps)</span>' +
                '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">유튜브 챕터 자동 생성 규격 (0:00부터 12개 씬 분절 완료)</div>' +
              '</div>' +
              '<button class="btn btn-sm btn-amber btn-copy-text" data-text="' + encodeURIComponent(yt.timeline) + '">⏱️ 타임라인만 복사</button>' +
            '</div>' +
            '<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.6;color:var(--text-bright);background:rgba(0,0,0,0.4);padding:12px;border-radius:8px;margin:0;border:1px solid rgba(255,209,102,0.2)">' + esc(yt.timeline) + '</pre>' +
          '</div>' : '') +

        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">🏷️ 태그 목록</span>' +
            '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent((yt.tags || []).join(', ')) + '">태그 전체 복사</button>' +
          '</div>' +
          '<div>' + (yt.tags || []).map(t => '<span class="tag-chip">' + esc(t) + '</span>').join('') + '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('ep-modal-track-content').innerHTML = content;
  };

  const firstTrack = Object.keys(tracks)[0];
  if (firstTrack) renderTrackDetail(firstTrack);

  document.querySelectorAll('.ep-modal-tab').forEach(tBtn => {
    tBtn.onclick = () => {
      document.querySelectorAll('.ep-modal-tab').forEach(b => b.classList.remove('btn-cyan'));
      tBtn.classList.add('btn-cyan');
      renderTrackDetail(tBtn.dataset.track);
    };
  });
}

function openFacelessGuideModal() {
  const guide = 
    '<div style="line-height:1.7;font-size:14px">' +
      '<h3 style="color:var(--accent-cyan);margin-bottom:8px">🎬 Faceless Explainer & HyperFrames 제작 원칙</h3>' +
      '<p>1. <b>첫 3초 시각적 스턴건 (Visual Stun Gun)</b>: 모바일 화면에서 스크롤을 멈추게 하는 강렬한 대조 자막 카드 제시</p>' +
      '<p>2. <b>가치 탐색 (Value Hunting)</b>: 단순 암기가 아닌 발음의 원리(강세 자석, 입모양, 유음화 등)를 15초 안에 해명</p>' +
      '<p>3. <b>시각적 검증 (Visual Validation)</b>: 4개 단어 실전 퀴즈와 발음 강조색(사이언/마젠타)으로 머릿속에 각인</p>' +
      '<p>4. <b>Track B 독립 디자인</b>: 쇼츠 B는 고정 템플릿에 가두지 않고 에피소드마다 신선한 메신저/상황극 컨셉 적용</p>' +
    '</div>';
  openModal('Faceless Explainer 비디오 가이드', guide);
}

/* TAB 5: STUDIO CSV CTR TRACKER */
function renderStudioTab() {
  const d = gDashboard || {};
  const scan = d.studioFolderScan || {};
  const reachManual = d.videoReachManual || {videos: {}};
  const savedReachMap = reachManual.videos || {};
  const packages = d.packagingRegistry?.items || [];
  const packagedVideos = new Set(packages.map(x => x.videoId).filter(Boolean));
  const allVideos = d.recentVideos || [];

  const apiPackages = allVideos.filter(v => !packagedVideos.has(v.videoId)).map(v => ({
    id: 'youtube-' + v.videoId,
    videoId: v.videoId,
    title: v.title,
    thumbnailUrl: v.thumbnail || 'https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg',
    version: '현재',
    status: 'published',
    format: v.format || resolveVideoFormat(v, null),
    publishedAt: v.publishedAt,
    durationSeconds: v.durationSeconds,
  }));
  const allItems = [...packages, ...apiPackages];

  const totalWithDataCount = allItems.filter(item => {
    const s = savedReachMap[item.videoId] || {};
    return Object.keys(s.periods || {}).length > 0 || Object.keys(s.windows || {}).length > 0;
  }).length;

  const filteredItems = allItems.filter(item => {
    const s = savedReachMap[item.videoId] || {};
    const hasData = Object.keys(s.periods || {}).length > 0 || Object.keys(s.windows || {}).length > 0;
    const isShort = item.format === 'SHORTS' || (Number(item.durationSeconds || 0) > 0 && Number(item.durationSeconds) <= 60);

    if (gStudioFilter === 'HAS_DATA') return hasData;
    if (gStudioFilter === 'LONGFORM') return !isShort;
    if (gStudioFilter === 'SHORTS') return isShort;
    return true;
  }).sort((a, b) => {
    const sA = savedReachMap[a.videoId] || {};
    const sB = savedReachMap[b.videoId] || {};
    const hasA = Object.keys(sA.periods || {}).length > 0 || Object.keys(sA.windows || {}).length > 0;
    const hasB = Object.keys(sB.periods || {}).length > 0 || Object.keys(sB.windows || {}).length > 0;
    if (hasA && !hasB) return -1;
    if (!hasA && hasB) return 1;
    return (Date.parse(b.publishedAt || 0) || 0) - (Date.parse(a.publishedAt || 0) || 0);
  });

  const thumbCards = filteredItems.length > 0 ? filteredItems.map(x => {
    const saved = savedReachMap[x.videoId] || {};
    const reach = saved.windows || {};
    const periods = saved.periods || {};
    const periodList = Object.values(periods);
    const windowList = Object.entries(reach).filter(([w, v]) => v && (v.impressions != null || v.ctr != null));
    const hasData = periodList.length > 0 || windowList.length > 0;

    const video = allVideos.find(v => v.videoId === x.videoId) || x;
    // 쇼츠 판정은 format만 쓴다(유튜브 쇼츠 재생목록 기준). 60초 규칙은 61~180초 쇼츠를 놓친다.
    const isShort = (x.format || video.format) === 'SHORTS';
    const metrics = (d.videoPerformance || []).find(v => v.video === x.videoId) || video.metrics || {};
    const localThumbnails = d.localThumbnails || {};
    let image = localThumbnails[x.videoId]
      ? '/api/package-image?videoId=' + encodeURIComponent(x.videoId)
      : (x.thumbnailPath 
          ? '/api/package-image?id=' + encodeURIComponent(x.id) 
          : (video.thumbnail || x.thumbnailUrl || ''));
    if (!image && x.videoId) {
      image = 'https://i.ytimg.com/vi/' + x.videoId + '/mqdefault.jpg';
    }
    if (image && image.includes('maxresdefault.jpg') && image.includes('sqp=')) {
      image = 'https://i.ytimg.com/vi/' + (x.videoId || '') + '/hqdefault.jpg';
    }

    const windowPills = windowList.map(([w, v]) => 
      '<div class="monthly-pill" style="border-left:3px solid var(--accent-amber);padding:6px 10px;margin-bottom:5px;background:rgba(255,209,102,0.06);border-radius:6px">' +
        '<div style="font-family:var(--font-mono);font-size:11px;color:var(--accent-amber);font-weight:700">' + esc(w) + ' 구간 성과</div>' +
        '<div style="font-size:13px;margin-top:2px">노출 <b style="color:var(--text-bright)">' + fmt.format(v.impressions||0) + '회</b> · CTR <b style="color:var(--accent-magenta);font-size:14px">' + Number(v.ctr||0).toFixed(2) + '%</b></div>' +
      '</div>'
    );

    // Studio 폴더를 겹치는 날짜로 계속 가져오면 periods가 영상당 수십 개까지 쌓인다. 대부분
    // 26~27일이 겹치는 28일 롤링 윈도우라 둘을 나란히 보여줘도 사실상 같은 정보의 반복이고,
    // (일별 세부 데이터가 없어서) 수치를 정확히 합산할 방법도 없다 — 그래서 최신 구간 하나만
    // "현재 값"으로 보여주고, 그 직전 구간과 비교한 증감만 같이 표시한다.
    const sortedPeriods = periodList.sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')));
    const latestPeriod = sortedPeriods[0];
    const previousPeriod = sortedPeriods[1];
    const olderCount = sortedPeriods.length - (previousPeriod ? 2 : 1);

    const periodPills = [];
    if (latestPeriod) {
      const ctrDelta = previousPeriod ? Number((latestPeriod.ctr - previousPeriod.ctr).toFixed(2)) : null;
      const trendHtml = ctrDelta == null ? '' :
        (Math.abs(ctrDelta) < 0.01
          ? '<span class="card-subtext" style="margin-left:6px">· 직전 구간과 동일</span>'
          : '<span style="margin-left:6px;font-size:12px;font-weight:700;color:' + (ctrDelta > 0 ? 'var(--accent-emerald)' : 'var(--accent-magenta)') + '">' + (ctrDelta > 0 ? '▲' : '▼') + ' ' + Math.abs(ctrDelta).toFixed(2) + '%p</span>');
      periodPills.push(
        '<div class="monthly-pill" style="border-left:3px solid var(--accent-cyan);padding:6px 10px;margin-bottom:5px;background:rgba(0,240,255,0.06);border-radius:6px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-family:var(--font-mono);font-size:11px;color:var(--accent-cyan);font-weight:700">' + esc(latestPeriod.startDate) + ' ~ ' + esc(latestPeriod.endDate) + '</span>' +
            '<span class="badge badge-pass" style="font-size:9px;padding:2px 6px">Studio CSV 최신</span>' +
          '</div>' +
          '<div style="font-size:13px;margin-top:3px">노출 <b style="color:var(--text-bright)">' + fmt.format(latestPeriod.impressions||0) + '회</b> · CTR <b style="color:var(--accent-magenta);font-size:14px">' + Number(latestPeriod.ctr||0).toFixed(2) + '%</b>' + trendHtml + '</div>' +
          (previousPeriod ? '<div class="card-subtext" style="font-size:10px;margin-top:2px">직전 구간(' + esc(previousPeriod.startDate) + '~' + esc(previousPeriod.endDate) + ') CTR ' + Number(previousPeriod.ctr||0).toFixed(2) + '% 대비</div>' : '') +
        '</div>'
      );
    }
    if (olderCount > 0) {
      periodPills.push(
        '<div class="card-subtext" style="font-size:11px;padding:4px 2px;opacity:0.7">+ 겹치는 과거 구간 ' + olderCount + '개 더 있음 (표시·진단에는 미사용)</div>'
      );
    }

    const pills = [...periodPills, ...windowPills].join('');

    const isPrivate = video.privacyStatus === 'private';
    const isScheduled = !!video.scheduledPublishAt;
    const schedDate = video.scheduledPublishAt ? String(video.scheduledPublishAt).slice(5, 10) : '';
    const statusChip = isScheduled 
      ? '<span class="tag-chip" style="position:absolute;top:8px;left:8px;background:rgba(255,183,3,0.9);color:#000;font-weight:800;font-size:10px">⏳ ' + esc(schedDate) + ' 공개 예정</span>'
      : (isPrivate ? '<span class="tag-chip" style="position:absolute;top:8px;left:8px;background:rgba(255,42,109,0.85);color:#fff;font-weight:800;font-size:10px">🔒 비공개 영상</span>' : '');
    const collectionBadge = hasData 
      ? '<span class="badge badge-strong-pass" style="margin-top:4px">✓ CTR 연결 완료 (' + (periodList.length + windowList.length) + '건)</span>'
      : '<span class="badge badge-hold" style="margin-top:4px">Studio CSV 대기</span>';

    return '<div class="thumb-card ' + (hasData ? 'has-data' : 'waiting-data') + ' col-4" style="' + (hasData ? 'border-color:rgba(0,240,255,0.4);' : '') + '">' +
      '<div style="position:relative;background:#05070c;border-radius:14px 14px 0 0;overflow:hidden;">' +
        (isShort ? (
          '<div style="display:flex;justify-content:center;align-items:center;height:180px;background:#000;">' +
            '<img src="' + esc(image || '') + '" data-fallback-vid="' + esc(x.videoId || '') + '" alt="" style="height:100%;aspect-ratio:9/16;object-fit:contain;border:0;display:block;">' +
          '</div>'
        ) : (
          '<img class="thumb-img" src="' + esc(image || '') + '" data-fallback-vid="' + esc(x.videoId || '') + '" alt="" style="width:100%;aspect-ratio:16/9;object-fit:cover;border:0;display:block;">'
        )) +
        statusChip +
        '<span class="tag-chip" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);font-size:10px">' + (isShort ? '쇼츠 (9:16)' : '롱폼 (16:9)') + '</span>' +
      '</div>' +
      '<div class="thumb-body" style="padding:14px">' +
        '<div class="card-header" style="margin-bottom:6px">' +
          '<span class="card-title" style="font-size:11px">패키징 ' + esc(x.version || '현재') + '</span>' +
          collectionBadge +
        '</div>' +
        '<div style="font-weight:700;font-size:14px;color:var(--text-bright);line-height:1.4;margin:4px 0 8px;min-height:38px">' + esc(x.title || x.videoId) + '</div>' +
        '<div class="card-subtext" style="font-size:12px;margin-bottom:10px">' +
          '조회수 <b>' + fmt.format(metrics.views || 0) + '회</b> · 시청률 <b>' + Number(metrics.averageViewPercentage || 0).toFixed(1) + '%</b> · 구독순증 <b>+' + fmt.format(metrics.subscriberNet || 0) + '</b>' +
        '</div>' +
        '<div style="margin-top:8px">' + (pills || '<div class="card-subtext" style="padding:12px 0;text-align:center;background:rgba(255,255,255,0.02);border-radius:6px">YouTube Studio 폴더를 imports/youtube-studio에 넣으면 자동 연동됩니다.</div>') + '</div>' +
      '</div>' +
    '</div>';
  }).join('') : '<div class="bento-card col-12 card-subtext" style="text-align:center;padding:40px">선택한 필터 조건에 해당하는 영상이 없습니다.</div>';

  const tableRows = filteredItems.length > 0 ? filteredItems.map(x => {
    const saved = savedReachMap[x.videoId] || {};
    const reach = saved.windows || {};
    const periods = saved.periods || {};
    const periodList = Object.values(periods);
    const windowList = Object.entries(reach).filter(([w, v]) => v && (v.impressions != null || v.ctr != null));
    const hasData = periodList.length > 0 || windowList.length > 0;

    const video = allVideos.find(v => v.videoId === x.videoId) || x;
    const isShort = (x.format || video.format) === 'SHORTS';
    const localThumbnails = d.localThumbnails || {};
    let image = localThumbnails[x.videoId]
      ? '/api/package-image?videoId=' + encodeURIComponent(x.videoId)
      : (x.thumbnailPath 
          ? '/api/package-image?id=' + encodeURIComponent(x.id) 
          : (video.thumbnail || x.thumbnailUrl || ''));
    if (!image && x.videoId) {
      image = 'https://i.ytimg.com/vi/' + x.videoId + '/mqdefault.jpg';
    }
    if (image && image.includes('maxresdefault.jpg') && image.includes('sqp=')) {
      image = 'https://i.ytimg.com/vi/' + (x.videoId || '') + '/hqdefault.jpg';
    }

    const sortedPeriods = periodList.sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')));
    const latestPeriod = sortedPeriods[0];
    const previousPeriod = sortedPeriods[1];
    const ctrDelta = (latestPeriod && previousPeriod && latestPeriod.ctr != null && previousPeriod.ctr != null)
      ? Number((latestPeriod.ctr - previousPeriod.ctr).toFixed(2))
      : null;

    let deltaHtml = '<span style="color:var(--text-muted);font-size:11px;">-</span>';
    if (ctrDelta != null) {
      if (Math.abs(ctrDelta) < 0.01) {
        deltaHtml = '<span style="color:var(--text-muted);font-size:11px;">동일</span>';
      } else if (ctrDelta > 0) {
        deltaHtml = '<span style="color:var(--accent-emerald);font-weight:700;font-size:11px;">▲ +' + ctrDelta.toFixed(2) + '%p</span>';
      } else {
        deltaHtml = '<span style="color:var(--accent-magenta);font-weight:700;font-size:11px;">▼ ' + ctrDelta.toFixed(2) + '%p</span>';
      }
    }

    const isSmallSample = latestPeriod && Number(latestPeriod.impressions || 0) < 1000;
    const watchUrl = x.videoId ? 'https://youtu.be/' + encodeURIComponent(x.videoId) : null;

    return '<tr>' +
      '<td style="text-align:center;">' +
        '<div class="studio-thumb-preview-wrap">' +
          '<img class="studio-thumb-mini' + (isShort ? ' is-shorts' : '') + '" src="' + esc(image) + '" alt="">' +
          '<div class="studio-thumb-hover-pop">' +
            '<img src="' + esc(image) + '" style="' + (isShort ? 'height:220px;aspect-ratio:9/16;' : 'width:240px;aspect-ratio:16/9;') + 'object-fit:cover;" alt="">' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' +
        '<span class="tag-chip" style="font-size:10px;padding:2px 6px;' + (isShort ? 'border-color:var(--accent-magenta);color:var(--accent-magenta);' : 'border-color:var(--accent-cyan);color:var(--accent-cyan);') + '">' + (isShort ? '📱 쇼츠' : '📺 롱폼') + '</span>' +
      '</td>' +
      '<td>' +
        (watchUrl 
          ? '<a href="' + esc(watchUrl) + '" target="_blank" rel="noopener" style="color:var(--text-bright);text-decoration:none;font-weight:700;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden;" title="' + esc(x.title || x.videoId) + '">▶ ' + esc(x.title || x.videoId) + '</a>'
          : '<span style="color:var(--text-bright);font-weight:700;">' + esc(x.title || x.videoId) + '</span>') +
      '</td>' +
      '<td>' +
        (latestPeriod ? (
          '<div><b style="font-family:var(--font-mono);font-size:13px;color:var(--text-bright);">' + fmt.format(latestPeriod.impressions || 0) + '회</b>' +
          (isSmallSample ? '<div style="font-size:10px;color:var(--accent-amber);white-space:nowrap;">🌱 초기 반응 수집 중</div>' : '') + '</div>'
        ) : '<span style="color:var(--text-muted);font-size:12px;">-</span>') +
      '</td>' +
      '<td>' +
        (latestPeriod && latestPeriod.ctr != null ? (
          '<b style="font-family:var(--font-mono);font-size:14px;color:' + (latestPeriod.ctr >= 5 ? 'var(--accent-emerald)' : 'var(--accent-cyan)') + ';">' + Number(latestPeriod.ctr).toFixed(2) + '%</b>'
        ) : '<span style="color:var(--text-muted);font-size:12px;">-</span>') +
      '</td>' +
      '<td>' + deltaHtml + '</td>' +
      '<td>' +
        (latestPeriod ? (
          '<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);white-space:nowrap;">' + esc(String(latestPeriod.startDate || '').slice(5)) + ' ~ ' + esc(String(latestPeriod.endDate || '').slice(5)) + '</span>'
        ) : '<span style="color:var(--text-muted);font-size:11px;">-</span>') +
      '</td>' +
      '<td>' +
        (hasData 
          ? '<span class="badge badge-strong-pass" style="font-size:9px;padding:2px 6px;">✓ 연결 (' + (periodList.length + windowList.length) + ')</span>'
          : '<span class="badge badge-hold" style="font-size:9px;padding:2px 6px;">대기</span>') +
      '</td>' +
    '</tr>';
  }).join('') : '<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-muted);">선택한 필터 조건에 해당하는 영상이 없습니다.</td></tr>';

  const tableViewHtml = 
    '<div class="bento-card col-12" style="overflow-x:auto;padding:0;border:1px solid var(--border-subtle);border-radius:12px;">' +
      '<table class="cyber-table">' +
        '<thead>' +
          '<tr>' +
            '<th style="width:64px;text-align:center;">미리보기</th>' +
            '<th style="width:80px;">포맷</th>' +
            '<th>영상 제목</th>' +
            '<th style="width:140px;">노출수</th>' +
            '<th style="width:110px;">최신 CTR</th>' +
            '<th style="width:100px;">추이</th>' +
            '<th style="width:130px;">분석 구간</th>' +
            '<th style="width:100px;">상태</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          tableRows +
        '</tbody>' +
      '</table>' +
    '</div>';

  return '<div class="bento-grid">' +
    '<div class="bento-card col-12">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">' +
        '<div>' +
          '<div class="card-title" style="color:var(--accent-cyan)">STUDIO CTR & REACH TRACKER</div>' +
          '<h2 style="font-family:var(--font-display);font-size:22px;color:var(--text-bright);margin-top:2px">📁 YouTube Studio CTR & 도달 성과 트래커</h2>' +
          '<div class="card-subtext">스튜디오에서 내보낸 노출수·CTR 데이터를 자동 감지하여 채널 영상과 매칭·보존합니다.</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">' +
          '<a class="btn btn-sm" href="https://studio.youtube.com" target="_blank" rel="noopener" style="text-decoration:none;">🎬 Studio 열기 ↗</a>' +
          '<button class="btn btn-cyan btn-sm" id="btn-studio-rescan">↻ 수동 재스캔</button>' +
          '<div style="display:flex;gap:4px;background:#080d16;padding:3px 6px;border-radius:10px;border:1px solid var(--border-subtle);">' +
            '<button class="tab-pill btn-studio-view-toggle' + (gStudioViewMode === 'TABLE' ? ' active' : '') + '" data-mode="TABLE">📋 컴팩트 목록 (권장)</button>' +
            '<button class="tab-pill btn-studio-view-toggle' + (gStudioViewMode === 'CARD' ? ' active' : '') + '" data-mode="CARD">🖼️ 카드 뷰</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div style="background:linear-gradient(90deg, rgba(0,240,255,0.08), rgba(255,42,109,0.05));border:1px solid rgba(0,240,255,0.25);border-radius:10px;padding:12px 16px;margin-top:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">' +
        '<div style="display:flex;align-items:center;gap:12px">' +
          '<span class="pulse-dot" style="background:var(--accent-cyan);box-shadow:0 0 10px var(--accent-cyan)"></span>' +
          '<div>' +
            '<div style="font-family:var(--font-mono);font-size:12px;font-weight:700;color:var(--accent-cyan)">DOWNLOADS AUTO-INGEST LIVE ACTIVE (실시간 무인 감시 작동 중)</div>' +
            '<div style="font-size:12px;color:var(--text-normal);margin-top:2px">YouTube Studio에서 <b>[내보내기 ➔ CSV/ZIP]</b>만 누르면 <code>다운로드</code> 폴더에서 0.1초 만에 <b>자동 낚아채기 ➔ 압축해제 ➔ 매칭 ➔ 대시보드 반영</b>까지 완전 무인 처리됩니다.</div>' +
          '</div>' +
        '</div>' +
        '<span class="badge badge-strong-pass" style="font-size:10px">실시간 대기 중</span>' +
      '</div>' +

      '<div style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;align-items:center">' +
        '<span class="badge badge-strong-pass">총 CTR 연결 완료: ' + totalWithDataCount + '개 영상</span>' +
        '<span class="badge badge-pass">신규 수집: ' + (scan.imported || 0) + '개</span>' +
        '<span class="badge badge-pass">기존 유지: ' + (scan.unchanged || 0) + '개</span>' +
        (scan.archived ? '<span class="badge badge-pass" title="반영 완료된 원본 CSV 폴더를 imports/youtube-studio-archive로 자동 이동">📦 폴더 정리: ' + scan.archived + '개</span>' : '') +
        (scan.skipped && scan.skipped.length > 0 ? '<span class="badge badge-hold">스킵/미연결: ' + scan.skipped.length + '개</span>' : '') +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">' +
        '<button class="tab-pill studio-filter-btn' + (gStudioFilter === 'LONGFORM' ? ' active' : '') + '" data-filter="LONGFORM">📺 롱폼 (' + allItems.filter(i => i.format !== 'SHORTS').length + ')</button>' +
        '<button class="tab-pill studio-filter-btn' + (gStudioFilter === 'SHORTS' ? ' active' : '') + '" data-filter="SHORTS">📱 쇼츠 (' + allItems.filter(i => i.format === 'SHORTS').length + ')</button>' +
        '<button class="tab-pill studio-filter-btn' + (gStudioFilter === 'HAS_DATA' ? ' active' : '') + '" data-filter="HAS_DATA">✨ CTR 수집 완료 (' + totalWithDataCount + ')</button>' +
        '<button class="tab-pill studio-filter-btn' + (gStudioFilter === 'ALL' ? ' active' : '') + '" data-filter="ALL">전체 보기 (' + allItems.length + ')</button>' +
      '</div>' +
    '</div>' +
    (gStudioViewMode === 'TABLE' ? tableViewHtml : thumbCards) +
  '</div>';
}

function bindStudioEvents() {
  document.querySelectorAll('.btn-studio-view-toggle').forEach(btn => {
    btn.onclick = () => {
      gStudioViewMode = btn.dataset.mode;
      try { localStorage.setItem('ihm_studio_view_mode', gStudioViewMode); } catch (_) {}
      renderCurrentTab();
    };
  });
  const rescanBtn = document.getElementById('btn-studio-rescan');
  if (rescanBtn) {
    rescanBtn.onclick = async () => {
      rescanBtn.disabled = true;
      rescanBtn.textContent = '스캔 중...';
      try {
        const res = await fetch('/api/studio-scan', {method: 'POST'});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '스캔 실패');
        if (gDashboard) {
          gDashboard.studioFolderScan = data.scan;
          gDashboard.videoReachManual = data.videoReachManual;
        }
        showToast('Studio 폴더를 스캔하여 CTR 데이터를 갱신했습니다! (신규: ' + (data.scan.imported || 0) + ', 유지: ' + (data.scan.unchanged || 0) + ')');
        renderCurrentTab();
      } catch (err) {
        alert('Studio 스캔 오류: ' + err.message);
      } finally {
        rescanBtn.disabled = false;
        rescanBtn.textContent = '↻ Studio 폴더 즉시 재스캔';
      }
    };
  }

  document.querySelectorAll('.studio-filter-btn').forEach(btn => {
    btn.onclick = () => {
      gStudioFilter = btn.dataset.filter;
      try { localStorage.setItem('ihm_studio_filter', gStudioFilter); } catch (_) {}
      renderCurrentTab();
    };
  });
}

/* TAB: CTR VS RETENTION 4-QUADRANT MATRIX & ACTION HUB */
function computeMatrixDataset() {
  const d = gDashboard || {};
  const allVideos = d.recentVideos || [];
  const performanceMap = new Map((d.videoPerformance || []).map(p => [p.video, p]));
  const reachManual = d.videoReachManual?.videos || {};
  const packages = d.packagingRegistry?.items || [];
  const packageMap = new Map(packages.map(pkg => [pkg.videoId, pkg]));

  // 1. Minimum Sample Size Parameters (Configurable)
  // 2026-10-02 parity fix: this was 100 while scripts/matrix-diagnosis.mjs (the server-side
  // twin of this function, used by /api/matrix/data) has always used 30 — "default 30 for
  // early growth channels" per its own comment. The mismatch meant videos the server
  // confidently classified into a quadrant were instead stuck in LOW_SAMPLE on the client,
  // found via a same-snapshot parity check (feeding identical gDashboard data to both
  // functions and diffing the output) while fixing the separate dynamic-CTR-threshold bug.
  const minImpressions = 30;
  const minViews = 10;

  // Dynamic (channel-relative) Q1/Q2/Q3/Q4 thresholds — mirrors scripts/matrix-diagnosis.mjs
  // calcTrimmedWeightedStats() exactly (2026-10-02 fix). Before this, the Matrix tab always
  // used hardcoded 6.0%/42%/70% regardless of channel size, which silently hid every real Q1
  // video on a small channel (this channel's own 5%-trimmed, impression/view-weighted average
  // is far below 6.0% CTR) — found when a user couldn't see Q1 videos onscreen that the
  // server's own /api/matrix/data endpoint (which already did this calculation, but was never
  // wired to the UI) reported. A lightweight pre-scan computes the same stats the main loop
  // below would derive anyway, just early enough to resolve the threshold before quadrant
  // assignment needs it.
  const preScan = [];
  for (const v of allVideos) {
    const perf = performanceMap.get(v.videoId) || {};
    const reach = reachManual[v.videoId] || {};
    const pkg = packageMap.get(v.videoId) || {};
    const durationSec = Number(v.durationSeconds || perf.durationSeconds || 0);
    const isShort = (v.format || resolveVideoFormat({...v, durationSeconds: durationSec}, null)) === 'SHORTS';
    const views = Number(perf.views || v.statistics?.viewCount || 0);
    let retentionRate = 0;
    let hasValidRetention = (views >= minViews);
    if (perf.averageViewPercentage != null && Number(perf.averageViewPercentage) > 0) {
      retentionRate = Number(perf.averageViewPercentage);
    } else if (perf.averageViewDuration != null && durationSec > 0) {
      retentionRate = Math.min(100, Math.round((Number(perf.averageViewDuration) / durationSec) * 1000) / 10);
    } else {
      hasValidRetention = false;
    }
    let ctr = null, impressions = 0, hasRealCtr = false;
    const windows = reach.windows || {};
    const periods = reach.periods || {};
    if (windows['28d'] && windows['28d'].ctr != null) {
      ctr = Number(windows['28d'].ctr); impressions = Number(windows['28d'].impressions || 0); hasRealCtr = true;
    } else if (windows['lifetime'] && windows['lifetime'].ctr != null) {
      ctr = Number(windows['lifetime'].ctr); impressions = Number(windows['lifetime'].impressions || 0); hasRealCtr = true;
    } else if (windows['first_48h'] && windows['first_48h'].ctr != null) {
      ctr = Number(windows['first_48h'].ctr); impressions = Number(windows['first_48h'].impressions || 0); hasRealCtr = true;
    } else {
      const latestPeriod = pickLatestPeriod(periods);
      if (latestPeriod) { ctr = Number(latestPeriod.ctr); impressions = Number(latestPeriod.impressions || 0); hasRealCtr = true; }
    }
    preScan.push({ format: isShort ? 'SHORTS' : 'LONGFORM', views, impressions, ctr, hasRealCtr, retentionRate, hasValidRetention });
  }

  function calcTrimmedWeightedStats(statItems) {
    if (!statItems.length) return { weightedCtr: 5.5, weightedRet: 42.0 };
    const sorted = [...statItems].sort((a, b) => a.views - b.views);
    const trimCount = Math.floor(sorted.length * 0.05);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount || sorted.length);
    const totalImpressions = trimmed.reduce((acc, x) => acc + (x.impressions || 0), 0);
    const totalClicks = trimmed.reduce((acc, x) => acc + ((x.impressions || 0) * (x.ctr || 0) / 100), 0);
    const weightedCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 5.5;
    const totalViews = trimmed.reduce((acc, x) => acc + x.views, 0);
    const totalRetWeight = trimmed.reduce((acc, x) => acc + (x.views * x.retentionRate), 0);
    const weightedRet = totalViews > 0 ? totalRetWeight / totalViews : 42.0;
    return { weightedCtr: Math.round(weightedCtr * 10) / 10, weightedRet: Math.round(weightedRet * 10) / 10 };
  }

  const verifiedLongPreScan = preScan.filter(x => x.format === 'LONGFORM' && x.hasRealCtr && x.hasValidRetention);
  const verifiedShortsPreScan = preScan.filter(x => x.format === 'SHORTS' && x.hasRealCtr && x.hasValidRetention);
  const dynamicStatsLong = calcTrimmedWeightedStats(verifiedLongPreScan);
  const dynamicStatsShorts = calcTrimmedWeightedStats(verifiedShortsPreScan);

  // A non-null gMatrixCtrThreshold/etc. means the user explicitly moved the slider — that
  // always wins (matches matrix-diagnosis.mjs's customThresholds override precedence). Only
  // fall back to the dynamic channel-relative value when the user hasn't touched it yet.
  const resolvedCtrThreshold = gMatrixCtrThreshold != null ? gMatrixCtrThreshold : (dynamicStatsLong.weightedCtr || 5.5);
  const resolvedRetThresholdLong = gMatrixRetThresholdLong != null ? gMatrixRetThresholdLong : (dynamicStatsLong.weightedRet || 42.0);
  const resolvedRetThresholdShorts = gMatrixRetThresholdShorts != null ? gMatrixRetThresholdShorts : (dynamicStatsShorts.weightedRet || 70.0);
  gMatrixResolvedThresholds = { ctr: resolvedCtrThreshold, retLong: resolvedRetThresholdLong, retShorts: resolvedRetThresholdShorts };

  const items = [];

  for (const v of allVideos) {
    const videoId = v.videoId;
    if (!videoId) continue;

    const perf = performanceMap.get(videoId) || {};
    const reach = reachManual[videoId] || {};
    const pkg = packageMap.get(videoId) || {};

    // 3. Format Validation (Duration & Role Check)
    const durationSec = Number(v.durationSeconds || perf.durationSeconds || 0);
    // 60초 컷오프만 쓰면 새는 사례가 있다 — 유튜브가 쇼츠 자격 길이를 최대 3분까지 넓혀서,
    // 제작자가 "#쇼츠"를 붙인 진짜 쇼츠인데 실제 길이가 60초를 넘는 영상이 실제로 있다
    // (2026-09-07, 4사분면 매트릭스 "롱폼" 필터에 쇼츠가 섞여 나온다는 지적으로 발견 — 86초짜리
    // "#쇼츠" 영상 2건이 durationSec<=60에 안 걸려서 LONGFORM으로 잘못 분류되고 있었음).
    // 제목에 명시적으로 쇼츠 표시가 있으면 길이와 무관하게 그걸 우선한다.
    const isShort = (v.format || resolveVideoFormat({...v, durationSeconds: durationSec}, null)) === 'SHORTS';

    const views = Number(perf.views || v.statistics?.viewCount || 0);
    const subscribersGained = Number(perf.subscribersGained || 0);

    let retentionRate = 0;
    let hasValidRetention = (views >= minViews);
    if (perf.averageViewPercentage != null && Number(perf.averageViewPercentage) > 0) {
      retentionRate = Number(perf.averageViewPercentage);
    } else if (perf.averageViewDuration != null && durationSec > 0) {
      retentionRate = Math.min(100, Math.round((Number(perf.averageViewDuration) / durationSec) * 1000) / 10);
    } else {
      retentionRate = 0;
      hasValidRetention = false;
    }

    let ctr = null;
    let impressions = 0;
    let hasRealCtr = false;

    const windows = reach.windows || {};
    const periods = reach.periods || {};

    if (windows['28d'] && windows['28d'].ctr != null) {
      ctr = Number(windows['28d'].ctr);
      impressions = Number(windows['28d'].impressions || 0);
      hasRealCtr = true;
    } else if (windows['lifetime'] && windows['lifetime'].ctr != null) {
      ctr = Number(windows['lifetime'].ctr);
      impressions = Number(windows['lifetime'].impressions || 0);
      hasRealCtr = true;
    } else if (windows['first_48h'] && windows['first_48h'].ctr != null) {
      ctr = Number(windows['first_48h'].ctr);
      impressions = Number(windows['first_48h'].impressions || 0);
      hasRealCtr = true;
    } else {
      // periods는 겹치는 Studio 폴더를 계속 가져올 때마다 항목이 쌓인다 — Object.values()[0]은
      // 삽입 순서(=가장 먼저 수집된 오래된 구간)라서 새 데이터를 넣어도 진단이 안 바뀌는 버그였다.
      // endDate가 가장 최신인 구간을 쓰고, 같은 날 끝나면 더 긴 구간을 쓴다.
      const latestPeriod = pickLatestPeriod(periods);
      if (latestPeriod) {
        ctr = Number(latestPeriod.ctr);
        impressions = Number(latestPeriod.impressions || 0);
        hasRealCtr = true;
      }
    }

    const localThumbnails = d.localThumbnails || {};
    const thumb = localThumbnails[videoId]
      ? ('/api/package-image?videoId=' + encodeURIComponent(videoId))
      : (v.thumbnail || pkg.thumbnailUrl || (pkg.thumbnailPath ? ('/api/package-image?id=' + encodeURIComponent(pkg.id)) : ('https://i.ytimg.com/vi/' + videoId + '/mqdefault.jpg')));

    const pubStr = v.scheduledPublishAt || v.publishedAt || pkg.publishedAt || '';
    const pubDate = pubStr ? new Date(pubStr) : null;
    const now = new Date();
    const ageHours = pubDate ? (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60) : 999;
    const is48hWarmup = ageHours >= 0 && ageHours < 48;
    const hasStatisticalSignificance = hasRealCtr && hasValidRetention && !is48hWarmup && impressions >= minImpressions && views >= minViews;

    const retThresh = isShort ? resolvedRetThresholdShorts : resolvedRetThresholdLong;

    if (!hasRealCtr) {
      items.push({
        videoId,
        title: v.title || pkg.title || ('영상 ' + videoId),
        thumbnail: thumb,
        format: isShort ? 'SHORTS' : 'LONGFORM',
        views,
        impressions,
        ctr: null,
        hasRealCtr: false,
        retentionRate: Math.round(retentionRate * 10) / 10,
        hasValidRetention,
        hasStatisticalSignificance: false,
        avgDurationSec: Number(perf.averageViewDuration || 0),
        durationSec,
        subscribersGained,
        publishedAt: pubStr,
        ageHours: Math.round(ageHours * 10) / 10,
        is48hWarmup,
        quadrant: 'PENDING_STUDIO',
        tentativeQuadrant: null,
        quadrantLabel: 'Studio CSV 대기',
        actionBadge: '📁 Studio CSV 필요',
        actionHint: '실제 노출수/CTR 데이터가 아직 수집되지 않았습니다. Studio에서 표 데이터를 다운로드하면 자동 연결됩니다.',
        isVerified: false,
      });
      continue;
    }

    if (!hasStatisticalSignificance) {
      if (is48hWarmup) {
        items.push({
          videoId,
          title: v.title || pkg.title || ('영상 ' + videoId),
          thumbnail: thumb,
          format: isShort ? 'SHORTS' : 'LONGFORM',
          views,
          impressions,
          ctr: Math.round((ctr || 0) * 100) / 100,
          hasRealCtr: true,
          retentionRate: Math.round(retentionRate * 10) / 10,
          hasValidRetention: true,
          hasStatisticalSignificance: false,
          avgDurationSec: Number(perf.averageViewDuration || 0),
          durationSec,
          subscribersGained,
          publishedAt: pubStr,
          ageHours: Math.round(ageHours * 10) / 10,
          is48hWarmup: true,
          quadrant: 'WARMUP',
          tentativeQuadrant: 'WARMUP',
          quadrantLabel: '48H 골든타임 집계 중',
          actionBadge: '⏳ 초기 반응 수집 중 (교체 보류)',
          actionHint: '공개 후 ' + Math.floor(ageHours) + '시간 경과. 충성 구독자 초기 반응 집계 중이므로 48시간 데이터 정착 전까지 섣부른 썸네일 교체는 보류하세요.',
          isVerified: false,
        });
        continue;
      }

      items.push({
        videoId,
        title: v.title || pkg.title || ('영상 ' + videoId),
        thumbnail: thumb,
        format: isShort ? 'SHORTS' : 'LONGFORM',
        views,
        impressions,
        ctr: Math.round((ctr || 0) * 100) / 100,
        hasRealCtr: true,
        retentionRate: Math.round(retentionRate * 10) / 10,
        hasValidRetention: false,
        hasStatisticalSignificance: false,
        avgDurationSec: Number(perf.averageViewDuration || 0),
        durationSec,
        subscribersGained,
        publishedAt: pubStr,
        ageHours: Math.round(ageHours * 10) / 10,
        is48hWarmup: false,
        quadrant: 'LOW_SAMPLE',
        tentativeQuadrant: null,
        quadrantLabel: '표본 부족 (노출 ' + impressions + '회 / 조회 ' + views + '회)',
        actionBadge: '📊 표본 수집 중',
        actionHint: '노출수 또는 조회수 모수가 적어 데이터 착시 노이즈가 있습니다. 최소 노출(' + minImpressions + '회+) 확보 후 확정 평가됩니다.',
        isVerified: false,
      });
      continue;
    }

    const highCtr = (ctr || 0) >= resolvedCtrThreshold;
    const highRet = retentionRate >= retThresh;

    let quadrant = 'Q4';
    let quadrantLabel = '기획 재검토';
    let actionBadge = '⚠️ 소재/타겟 피벗';
    let actionHint = '주제와 타겟 시청자층의 결핍을 재정의하고 다음 기획 시 배제할 패턴으로 학습';

    if (highCtr && highRet) {
      quadrant = 'Q1';
      quadrantLabel = '알고리즘 효자 영상';
      actionBadge = '🏆 후속편/시리즈 확장 1순위';
      actionHint = '알고리즘 추천 폭발 중! 2편 제작, 쇼츠 파생 변형, 재생목록 상단 배치 필수';
    } else if (highCtr && !highRet) {
      quadrant = 'Q2';
      quadrantLabel = '낚시성 의심 / 초반이탈';
      actionBadge = '⚡ 오프닝 5초 후킹 재설계';
      actionHint = '썸네일은 잘 클릭되나 30초 내 이탈 발생. 첫 5초 인트로와 본문 기대치 일치화 필요';
    } else if (!highCtr && highRet) {
      quadrant = 'Q3';
      quadrantLabel = '숨은 보석 영상';
      actionBadge = '💎 썸네일·제목 교체 1순위';
      actionHint = '영상 완성도와 시청 지속률은 극상! 썸네일과 제목만 바꾸면 즉시 역주행 폭발 가능';
    }

    items.push({
      videoId,
      title: v.title || pkg.title || ('영상 ' + videoId),
      thumbnail: thumb,
      format: isShort ? 'SHORTS' : 'LONGFORM',
      views,
      impressions,
      ctr: Math.round((ctr || 0) * 100) / 100,
      hasRealCtr: true,
      retentionRate: Math.round(retentionRate * 10) / 10,
      hasValidRetention: true,
      hasStatisticalSignificance: true,
      avgDurationSec: Number(perf.averageViewDuration || 0),
      durationSec,
      subscribersGained,
      publishedAt: pubStr,
      ageHours: Math.round(ageHours * 10) / 10,
      is48hWarmup: false,
      quadrant,
      tentativeQuadrant: quadrant,
      quadrantLabel,
      actionBadge,
      actionHint,
      isVerified: true,
    });
  }

  return items;
}

function renderMatrixTab() {
  const allItems = computeMatrixDataset();
  const filteredByFormat = allItems.filter(v => {
    if (gMatrixFormatFilter === 'LONGFORM') return v.format === 'LONGFORM';
    if (gMatrixFormatFilter === 'SHORTS') return v.format === 'SHORTS';
    return true;
  });

  const verifiedList = filteredByFormat.filter(v => v.isVerified);
  const q1List = filteredByFormat.filter(v => v.quadrant === 'Q1');
  const q2List = filteredByFormat.filter(v => v.quadrant === 'Q2');
  const q3List = filteredByFormat.filter(v => v.quadrant === 'Q3');
  const q4List = filteredByFormat.filter(v => v.quadrant === 'Q4');
  const warmupList = filteredByFormat.filter(v => v.quadrant === 'WARMUP');
  const pendingStudioList = filteredByFormat.filter(v => v.quadrant === 'PENDING_STUDIO');
  const lowSampleList = filteredByFormat.filter(v => v.quadrant === 'LOW_SAMPLE');

  // Chart renders verified videos + warmup videos
  const chartVideos = filteredByFormat.filter(v => v.hasRealCtr && v.hasValidRetention);

  const displayList = gMatrixQuadrantFilter === 'ALL'
    ? (verifiedList.length > 0 ? verifiedList : filteredByFormat)
    : gMatrixQuadrantFilter === 'VERIFIED'
    ? verifiedList
    : filteredByFormat.filter(v => v.quadrant === gMatrixQuadrantFilter);

  // SVG Scatter plot parameters
  const svgWidth = 960;
  const svgHeight = 460;
  const padLeft = 65;
  const padRight = 35;
  const padTop = 35;
  const padBottom = 45;
  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxCtr = 15;
  const maxRet = 100;

  const getX = (ctrVal) => padLeft + (Math.min(maxCtr, Math.max(0, ctrVal || 0)) / maxCtr) * chartW;
  const getY = (retVal) => (padTop + chartH) - (Math.min(maxRet, Math.max(0, retVal || 0)) / maxRet) * chartH;

  const threshX = getX(gMatrixResolvedThresholds.ctr);
  const activeRetThresh = gMatrixFormatFilter === 'SHORTS' ? gMatrixResolvedThresholds.retShorts : gMatrixResolvedThresholds.retLong;
  const threshY = getY(activeRetThresh);

  // SVG Bubbles (verified + warmup with real CTR)
  const bubblesSvg = chartVideos.map(v => {
    const cx = getX(v.ctr);
    const cy = getY(v.retentionRate);
    const r = Math.max(5, Math.min(22, 5 + Math.log10(v.views + 1) * 3.5));

    let stroke = '#8b5cf6';
    let fill = 'rgba(139, 92, 246, 0.3)';
    let strokeDash = 'none';

    if (v.quadrant === 'WARMUP') {
      stroke = '#ffb703';
      fill = 'rgba(255, 183, 3, 0.45)';
      strokeDash = '4,2';
    } else if (v.quadrant === 'Q1') {
      stroke = '#00f0ff';
      fill = 'rgba(0, 240, 255, 0.4)';
    } else if (v.quadrant === 'Q2') {
      stroke = '#ffd166';
      fill = 'rgba(255, 209, 102, 0.4)';
    } else if (v.quadrant === 'Q3') {
      stroke = '#10b981';
      fill = 'rgba(16, 185, 129, 0.55)';
    }

    return '<circle class="matrix-bubble" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2" stroke-dasharray="' + strokeDash + '" ' +
      'data-video-id="' + esc(v.videoId) + '" ' +
      'data-title="' + encodeURIComponent(v.title) + '" ' +
      'data-ctr="' + (v.ctr != null ? v.ctr : '대기') + '" ' +
      'data-ret="' + v.retentionRate + '" ' +
      'data-views="' + v.views + '" ' +
      'data-format="' + v.format + '" ' +
      'data-quadrant="' + v.quadrant + '" ' +
      'data-quadrant-label="' + encodeURIComponent(v.quadrantLabel) + '" ' +
      'data-thumb="' + encodeURIComponent(v.thumbnail) + '" ' +
      'data-action="' + encodeURIComponent(v.actionBadge) + '"/>';
  }).join('');

  return '<div class="bento-grid">' +
    /* HEADER SUMMARY CARD */
    '<div class="bento-card highlight-cyan col-12">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">' +
        '<div>' +
          '<div class="card-title" style="color:var(--accent-cyan)">STRICT VERIFIED DATA // ALGORITHM 4-QUADRANT MATRIX</div>' +
          '<h2 style="font-family:var(--font-display); font-size:24px; color:#fff; margin-top:2px">📊 CTR vs 시청 지속률 4사분면 진단 매트릭스 & 액션 허브</h2>' +
          '<p style="color:var(--text-normal); margin-top:4px; font-size:13px">가짜 추정치를 전면 배제하고, <b>Studio CSV 실측 CTR</b>과 <b>유효 표본(조회수 10회 이상)</b>이 확보된 영상만 엄격하게 사분면에 배치합니다.</p>' +
        '</div>' +
        '<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">' +
          '<span class="badge badge-pass" style="font-size:12px; padding:6px 12px;">🟢 실측 검증 완료 ' + verifiedList.length + '개</span>' +
          (warmupList.length > 0 ? '<span class="badge" style="border-color:var(--accent-amber); color:var(--accent-amber); font-size:12px; padding:6px 12px; background:rgba(255,183,3,0.1);">⏳ 48H 집계중 ' + warmupList.length + '개</span>' : '') +
          (pendingStudioList.length > 0 ? '<span class="badge" style="border-color:var(--accent-violet); color:var(--accent-violet); font-size:12px; padding:6px 12px;">📁 Studio CSV 대기 ' + pendingStudioList.length + '개</span>' : '') +
          (lowSampleList.length > 0 ? '<span class="badge badge-hold" style="font-size:12px; padding:6px 12px;">📊 표본 부족 ' + lowSampleList.length + '개</span>' : '') +
        '</div>' +
      '</div>' +

      /* FILTER & THRESHOLD STRIP */
      '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-top:18px; padding-top:14px; border-top:1px solid var(--border-subtle);">' +
        '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
          '<span style="font-size:11px; font-weight:700; color:var(--text-muted);">포맷 필터:</span>' +
          '<button class="tab-pill btn-matrix-format' + (gMatrixFormatFilter === 'ALL' ? ' active' : '') + '" data-format="ALL">전체 (' + allItems.length + ')</button>' +
          '<button class="tab-pill btn-matrix-format' + (gMatrixFormatFilter === 'LONGFORM' ? ' active' : '') + '" data-format="LONGFORM">롱폼 (' + allItems.filter(v => v.format === 'LONGFORM').length + ')</button>' +
          '<button class="tab-pill btn-matrix-format' + (gMatrixFormatFilter === 'SHORTS' ? ' active' : '') + '" data-format="SHORTS">쇼츠 (' + allItems.filter(v => v.format === 'SHORTS').length + ')</button>' +
        '</div>' +

        '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
          '<span style="font-size:11px; font-weight:700; color:var(--text-muted);">사분면 필터:</span>' +
          '<button class="tab-pill btn-matrix-quadrant' + (gMatrixQuadrantFilter === 'ALL' || gMatrixQuadrantFilter === 'VERIFIED' ? ' active' : '') + '" data-quadrant="VERIFIED">🟢 실측 검증 (' + verifiedList.length + ')</button>' +
          '<button class="tab-pill btn-matrix-quadrant' + (gMatrixQuadrantFilter === 'Q1' ? ' active' : '') + '" data-quadrant="Q1">🏆 Q1 효자 (' + q1List.length + ')</button>' +
          '<button class="tab-pill btn-matrix-quadrant' + (gMatrixQuadrantFilter === 'Q2' ? ' active' : '') + '" data-quadrant="Q2">⚡ Q2 이탈 (' + q2List.length + ')</button>' +
          '<button class="tab-pill btn-matrix-quadrant' + (gMatrixQuadrantFilter === 'Q3' ? ' active' : '') + '" data-quadrant="Q3" style="' + (gMatrixQuadrantFilter === 'Q3' ? 'border-color:var(--accent-emerald);color:var(--accent-emerald);' : '') + '">💎 Q3 숨은보석 (' + q3List.length + ')</button>' +
          '<button class="tab-pill btn-matrix-quadrant' + (gMatrixQuadrantFilter === 'Q4' ? ' active' : '') + '" data-quadrant="Q4">⚠️ Q4 재검토 (' + q4List.length + ')</button>' +
          (warmupList.length > 0 ? '<button class="tab-pill btn-matrix-quadrant' + (gMatrixQuadrantFilter === 'WARMUP' ? ' active' : '') + '" data-quadrant="WARMUP" style="' + (gMatrixQuadrantFilter === 'WARMUP' ? 'border-color:var(--accent-amber);color:var(--accent-amber);' : '') + '">⏳ 48H 집계중 (' + warmupList.length + ')</button>' : '') +
          (pendingStudioList.length > 0 ? '<button class="tab-pill btn-matrix-quadrant' + (gMatrixQuadrantFilter === 'PENDING_STUDIO' ? ' active' : '') + '" data-quadrant="PENDING_STUDIO">📁 Studio 대기 (' + pendingStudioList.length + ')</button>' : '') +
        '</div>' +

        '<div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; font-size:12px;">' +
          '<label style="display:flex; align-items:center; gap:4px; color:var(--accent-cyan);">CTR 기준: <input type="number" id="input-matrix-ctr-thresh" value="' + gMatrixResolvedThresholds.ctr + '" step="0.5" min="1" max="20" style="width:55px; padding:3px 6px; font-size:12px;">%</label>' +
          '<label style="display:flex; align-items:center; gap:4px; color:var(--accent-magenta);">지속률 기준: <input type="number" id="input-matrix-ret-thresh" value="' + activeRetThresh + '" step="5" min="10" max="95" style="width:55px; padding:3px 6px; font-size:12px;">%</label>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* INTERACTIVE SVG 4-QUADRANT MATRIX CHART */
    '<div class="bento-card col-12" style="padding:16px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
        '<div class="card-title" style="color:var(--accent-cyan)">SCATTER PLOT INTERACTIVE CANVAS (버블 클릭 시 AI 처방전 모달 열람)</div>' +
        '<div style="font-size:11px; color:var(--text-muted)">※ Studio CSV 실제 CTR이 등록된 검증 영상만 산점도에 표시됩니다. (현재 ' + chartVideos.length + '개 등록)</div>' +
      '</div>' +

      '<div class="matrix-svg-container" style="position:relative;">' +
        '<svg viewBox="0 0 ' + svgWidth + ' ' + svgHeight + '" style="width:100%; height:100%; display:block;">' +
          '<defs>' +
            '<radialGradient id="grad-q1" cx="100%" cy="0%" r="90%"><stop offset="0%" stop-color="rgba(0,240,255,0.14)"/><stop offset="100%" stop-color="rgba(0,240,255,0.01)"/></radialGradient>' +
            '<radialGradient id="grad-q2" cx="100%" cy="100%" r="90%"><stop offset="0%" stop-color="rgba(255,209,102,0.12)"/><stop offset="100%" stop-color="rgba(255,209,102,0.01)"/></radialGradient>' +
            '<radialGradient id="grad-q3" cx="0%" cy="0%" r="90%"><stop offset="0%" stop-color="rgba(16,185,129,0.16)"/><stop offset="100%" stop-color="rgba(16,185,129,0.01)"/></radialGradient>' +
            '<radialGradient id="grad-q4" cx="0%" cy="100%" r="90%"><stop offset="0%" stop-color="rgba(139,92,246,0.12)"/><stop offset="100%" stop-color="rgba(139,92,246,0.01)"/></radialGradient>' +
          '</defs>' +

          /* Quadrant Tint Rectangles */
          '<rect x="' + threshX + '" y="' + padTop + '" width="' + (padLeft + chartW - threshX) + '" height="' + (threshY - padTop) + '" fill="url(#grad-q1)"/>' +
          '<rect x="' + threshX + '" y="' + threshY + '" width="' + (padLeft + chartW - threshX) + '" height="' + (padTop + chartH - threshY) + '" fill="url(#grad-q2)"/>' +
          '<rect x="' + padLeft + '" y="' + padTop + '" width="' + (threshX - padLeft) + '" height="' + (threshY - padTop) + '" fill="url(#grad-q3)"/>' +
          '<rect x="' + padLeft + '" y="' + threshY + '" width="' + (threshX - padLeft) + '" height="' + (padTop + chartH - threshY) + '" fill="url(#grad-q4)"/>' +

          /* Quadrant Watermark Labels */
          '<text x="' + (padLeft + chartW - 14) + '" y="' + (padTop + 24) + '" text-anchor="end" fill="rgba(0,240,255,0.7)" font-family="var(--font-display)" font-size="14" font-weight="800">🏆 Q1. 알고리즘 효자 영상 (High CTR · High Retention)</text>' +
          '<text x="' + (padLeft + chartW - 14) + '" y="' + (padTop + chartH - 14) + '" text-anchor="end" fill="rgba(255,209,102,0.7)" font-family="var(--font-display)" font-size="14" font-weight="800">⚡ Q2. 낚시성 의심/초반이탈 (High CTR · Low Retention)</text>' +
          '<text x="' + (padLeft + 14) + '" y="' + (padTop + 24) + '" text-anchor="start" fill="rgba(16,185,129,0.9)" font-family="var(--font-display)" font-size="14" font-weight="900">💎 Q3. 숨은 보석 영상 ➔ 썸네일 교체 1순위! (Low CTR · High Retention)</text>' +
          '<text x="' + (padLeft + 14) + '" y="' + (padTop + chartH - 14) + '" text-anchor="start" fill="rgba(139,92,246,0.6)" font-family="var(--font-display)" font-size="14" font-weight="800">⚠️ Q4. 기획 재검토 (Low CTR · Low Retention)</text>' +

          /* Grid Ticks & Lines */
          [20, 40, 60, 80, 100].map(rVal => {
            const y = getY(rVal);
            return '<line x1="' + padLeft + '" y1="' + y + '" x2="' + (padLeft + chartW) + '" y2="' + y + '" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>' +
              '<text x="' + (padLeft - 10) + '" y="' + (y + 4) + '" text-anchor="end" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="10">' + rVal + '%</text>';
          }).join('') +

          [3, 6, 9, 12, 15].map(cVal => {
            const x = getX(cVal);
            return '<line x1="' + x + '" y1="' + padTop + '" x2="' + x + '" y2="' + (padTop + chartH) + '" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>' +
              '<text x="' + x + '" y="' + (padTop + chartH + 18) + '" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)" font-size="10">' + cVal + '%</text>';
          }).join('') +

          /* Threshold Dashed Dividing Crosshairs */
          '<line x1="' + threshX + '" y1="' + padTop + '" x2="' + threshX + '" y2="' + (padTop + chartH) + '" stroke="var(--accent-cyan)" stroke-width="1.8" stroke-dasharray="6,4"/>' +
          '<line x1="' + padLeft + '" y1="' + threshY + '" x2="' + (padLeft + chartW) + '" y2="' + threshY + '" stroke="var(--accent-magenta)" stroke-width="1.8" stroke-dasharray="6,4"/>' +

          /* Axis Main Lines */
          '<line x1="' + padLeft + '" y1="' + padTop + '" x2="' + padLeft + '" y2="' + (padTop + chartH) + '" stroke="var(--border-active)" stroke-width="2"/>' +
          '<line x1="' + padLeft + '" y1="' + (padTop + chartH) + '" x2="' + (padLeft + chartW) + '" y2="' + (padTop + chartH) + '" stroke="var(--border-active)" stroke-width="2"/>' +

          /* Axis Titles */
          '<text x="' + (padLeft + chartW / 2) + '" y="' + (padTop + chartH + 36) + '" text-anchor="middle" fill="var(--accent-cyan)" font-family="var(--font-mono)" font-size="11" font-weight="700">실제 노출 클릭률 (CTR %) ➔</text>' +
          '<text x="' + (padLeft - 40) + '" y="' + (padTop + chartH / 2) + '" text-anchor="middle" fill="var(--accent-magenta)" font-family="var(--font-mono)" font-size="11" font-weight="700" transform="rotate(-90 ' + (padLeft - 40) + ' ' + (padTop + chartH / 2) + ')">▲ 평균 시청 지속률 (Retention %)</text>' +

          /* Video Bubbles */
          bubblesSvg +
        '</svg>' +

        /* Floating Tooltip Container */
        '<div id="matrix-chart-tooltip" class="matrix-tooltip"></div>' +
      '</div>' +
    '</div>' +

    /* 4-QUADRANT ACTION HUB BENTO GRID */
    '<div class="bento-card col-12">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
        '<div>' +
          '<div class="card-title" style="color:var(--accent-emerald)">ACTION HUB (사분면별 최적화 작업 허브)</div>' +
          '<h3 style="font-family:var(--font-display); font-size:18px; color:#fff; margin-top:2px;">사분면별 진단 대상 영상 (' + displayList.length + '개)</h3>' +
        '</div>' +
      '</div>' +

      '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:14px;">' +
        displayList.map(v => {
          let bColor = 'var(--accent-violet)';
          let badgeClass = 'quadrant-pill-q4';
          if (v.quadrant === 'WARMUP') { bColor = 'var(--accent-amber)'; badgeClass = 'badge-hold'; }
          else if (v.quadrant === 'PENDING_STUDIO') { bColor = 'var(--accent-violet)'; badgeClass = 'tag-chip'; }
          else if (v.quadrant === 'LOW_SAMPLE') { bColor = 'var(--accent-amber)'; badgeClass = 'badge-hold'; }
          else if (v.quadrant === 'Q1') { bColor = 'var(--accent-cyan)'; badgeClass = 'quadrant-pill-q1'; }
          else if (v.quadrant === 'Q2') { bColor = 'var(--accent-amber)'; badgeClass = 'quadrant-pill-q2'; }
          else if (v.quadrant === 'Q3') { bColor = 'var(--accent-emerald)'; badgeClass = 'quadrant-pill-q3'; }

          const ctrDisplay = v.hasRealCtr ? (v.ctr + '% ✓ (실측)') : '<span style="color:var(--text-muted)">Studio 대기</span>';

          return '<div style="background:#080c14; border:1px solid ' + (v.quadrant === 'WARMUP' ? 'var(--accent-amber)' : v.quadrant === 'Q3' ? 'var(--accent-emerald)' : 'var(--border-subtle)') + '; border-radius:12px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; position:relative; box-shadow:' + (v.quadrant === 'WARMUP' ? '0 0 16px rgba(255,183,3,0.15)' : v.quadrant === 'Q3' ? '0 0 16px rgba(16,185,129,0.15)' : 'none') + ';">' +
            '<div>' +
              '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
                '<span class="badge ' + badgeClass + '" style="font-size:10px;">' + (v.quadrant === 'WARMUP' ? '⏳ 48H 집계중' : v.quadrant === 'PENDING_STUDIO' ? '📁 Studio 대기' : v.quadrant === 'LOW_SAMPLE' ? '📊 표본 부족' : esc(v.quadrant)) + ' · ' + esc(v.quadrantLabel) + '</span>' +
                '<span class="tag-chip" style="font-size:10px;">' + esc(v.format) + '</span>' +
              '</div>' +
              '<div style="display:flex; gap:10px; margin-bottom:10px;">' +
                '<img src="' + esc(v.thumbnail) + '" style="width:96px; height:54px; object-fit:cover; border-radius:6px; flex-shrink:0; background:#000;">' +
                '<div style="flex:1; min-width:0;">' +
                  '<div style="font-weight:700; font-size:13px; color:var(--text-bright); line-height:1.35; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-bottom:4px;">' + esc(v.title) + '</div>' +
                  '<div class="card-subtext" style="font-size:11px;">조회수 ' + fmt.format(v.views) + '회 · ' + (v.durationSec ? (Math.floor(v.durationSec/60) + '분 ' + (v.durationSec%60) + '초') : '') + '</div>' +
                '</div>' +
              '</div>' +

              '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; background:#05070c; padding:8px 10px; border-radius:8px; border:1px solid var(--border-subtle); margin-bottom:10px; font-size:11px;">' +
                '<div>노출 클릭률 (CTR): <b style="color:' + bColor + '">' + ctrDisplay + '</b></div>' +
                '<div>시청지속률: <b style="color:var(--text-bright)">' + (v.hasValidRetention ? (v.retentionRate + '%') : '<span style="color:var(--text-muted)">표본 미달</span>') + '</b></div>' +
              '</div>' +

              '<div style="font-size:11px; color:var(--text-normal); margin-bottom:10px; line-height:1.4;">' +
                '💡 ' + esc(v.actionHint) +
              '</div>' +
            '</div>' +

            '<div style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">' +
              (v.quadrant === 'PENDING_STUDIO' ? 
                '<button class="btn btn-sm btn-cyan btn-open-tab" data-target-tab="tab-studio" style="font-size:11px; padding:6px 12px;">📁 Studio CSV 가져오기</button>' : '') +
              (v.quadrant === 'Q3' ? 
                '<button class="btn btn-sm btn-cyan btn-send-to-ab" data-video-id="' + esc(v.videoId) + '" data-title="' + encodeURIComponent(v.title) + '" data-thumb="' + encodeURIComponent(v.thumbnail) + '" style="font-size:11px; padding:6px 12px; font-weight:800; background:linear-gradient(135deg, rgba(16,185,129,0.3), rgba(0,240,255,0.2)); border-color:var(--accent-emerald); color:#fff;">🎯 A/B 시뮬레이터로 썸네일 개선</button>' : '') +
              (v.isVerified ?
                '<button class="btn btn-sm btn-matrix-diagnose" data-video-id="' + esc(v.videoId) + '" style="font-size:11px; padding:6px 10px;">🤖 AI 처방전</button>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>' +
  '</div>';
}



/* STUDIO RPA CUSTOM METRIC COLLECTOR MODAL */
/* STUDIO DIRECT EXPORT & AUTO-INGEST MODAL */
function openStudioRpaModal() {
  let modalHtml = 
    '<div style="display:flex; flex-direction:column; gap:16px;">' +
      /* Header Banner */
      '<div style="background:linear-gradient(135deg, rgba(0,240,255,0.1), rgba(255,42,109,0.06)); border:1px solid var(--accent-cyan); border-radius:12px; padding:16px;">' +
        '<div class="card-title" style="color:var(--accent-cyan)">⚡ YOUTUBE STUDIO REAL-TIME DATA INGEST</div>' +
        '<h3 style="font-family:var(--font-display); font-size:18px; color:#fff; margin-top:2px;">YouTube Studio 실측 데이터 1초 가져오기</h3>' +
        '<p style="font-size:12px; color:var(--text-normal); margin-top:4px; line-height:1.5;">' +
          '원클릭으로 스튜디오 분석 창을 열고 <b>[고급 모드 ➔ 우상단 내보내기 ➔ CSV]</b>를 누르면, 대시보드 <b>실시간 감시기가 0.1초 만에 낚아채서 4사분면 매트릭스와 전체 통계에 즉시 자동 반영</b>합니다.' +
        '</p>' +
      '</div>' +

      /* 3-Step Visual Workflow */
      '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px;">' +
        '<div style="background:#080c14; border:1px solid var(--border-subtle); border-radius:10px; padding:12px; text-align:center;">' +
          '<div style="font-size:20px; margin-bottom:4px;">1️⃣</div>' +
          '<div style="font-weight:700; font-size:12px; color:#fff;">스튜디오 열기</div>' +
          '<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">아래 버튼 클릭 시 평소 크롬에서 즉시 열림</div>' +
        '</div>' +
        '<div style="background:#080c14; border:1px solid var(--border-subtle); border-radius:10px; padding:12px; text-align:center;">' +
          '<div style="font-size:20px; margin-bottom:4px;">2️⃣</div>' +
          '<div style="font-weight:700; font-size:12px; color:#fff;">내보내기 클릭</div>' +
          '<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">우상단 [내보내기 ➔ CSV] 1번 클릭</div>' +
        '</div>' +
        '<div style="background:#080c14; border:1px solid var(--border-subtle); border-radius:10px; padding:12px; text-align:center;">' +
          '<div style="font-size:20px; margin-bottom:4px;">3️⃣</div>' +
          '<div style="font-weight:700; font-size:12px; color:var(--accent-emerald);">0.1초 자동 반영</div>' +
          '<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">대시보드 실시간 감시기가 즉시 병합</div>' +
        '</div>' +
      '</div>' +

      /* Live Watcher Active Status */
      '<div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">' +
        '<div style="display:flex; align-items:center; gap:10px;">' +
          '<span class="pulse-dot" style="background:var(--accent-emerald); box-shadow:0 0 10px var(--accent-emerald);"></span>' +
          '<div style="font-size:12px; color:#fff;"><b>실시간 다운로드 감시기 가동 중</b> <span style="color:var(--text-muted); font-size:11px;">(Downloads 폴더 감시)</span></div>' +
        '</div>' +
        '<span class="badge badge-strong-pass" style="font-size:10px;">LIVE ACTIVE</span>' +
      '</div>' +

      /* Action Buttons */
      '<div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px;">' +
        '<button class="btn btn-sm" onclick="closeModal()" style="border-color:var(--border-subtle);">닫기</button>' +
        '<button class="btn btn-magenta" id="btn-open-studio-direct-link" style="padding:10px 24px; font-weight:800; font-size:13px;">' +
          '🚀 YouTube Studio에서 내보내기 열기' +
        '</button>' +
      '</div>' +
    '</div>';

  openModal('⚡ YouTube Studio 실측 데이터 1초 가져오기', modalHtml);
  bindStudioRpaModalEvents();
}

function bindStudioRpaModalEvents() {
  const directBtn = document.getElementById('btn-open-studio-direct-link');
  if (directBtn) {
    directBtn.onclick = () => {
      const channelId = gDashboard?.channel?.id || 'UCwNrEdm2jYAtUlfHVvH3WQw';
      const url = 'https://studio.youtube.com/channel/' + channelId + '/analytics/tab-overview';
      window.open(url, '_blank');
      showToast('스튜디오 창이 열렸습니다. 우상단 [내보내기 ➔ CSV]를 클릭하시면 0.1초 만에 자동 반영됩니다!');
    };
  }
}

/* TAB: 실제 검색 피드 & 잘된 썸네일 (2026-11-11 재설계)
   예전 "A/B 피드 시뮬레이터 · AI CTR 예측기"를 대신한다. 비교 대상은 그 편 검색어로 실제 한국 유튜브를 검색한 결과이고
   (서버가 하루 캐시), 잘된 썸네일은 구독자 대비 조회 배수·경쟁 채널 평소 대비 배수 같은 실제 숫자로만 고른다.
   지어낸 영상·AI 예상 CTR은 없다. 사람은 보기만 하고, Claude는 Phase 6 썸네일 방향의 근거로 쓴다. */
let gThumbFeedPackages = null;
let gThumbFeedPkg = (function() { try { return localStorage.getItem('ihm_thumbfeed_pkg') || ''; } catch (_) { return ''; } })();
let gThumbFeedQuery = '';
let gThumbFeedThumbIdx = 0;
let gThumbFeedData = null;
let gThumbFeedLoading = false;
let gThumbFeedError = '';

function thumbFeedCurrentPkg() {
  const list = gThumbFeedPackages || [];
  return list.find(p => p.name === gThumbFeedPkg) || list[0] || null;
}

function thumbFeedQueries(pkg) {
  const qs = (pkg && pkg.queries ? pkg.queries.slice() : []);
  return qs;
}

function renderAbSimulatorTab() {
  const pkg = thumbFeedCurrentPkg();
  const filterCss = gAbVisionFilter === 'blur' ? 'filter:blur(2.5px);' : (gAbVisionFilter === 'grayscale' ? 'filter:grayscale(1);' : '');
  const fmtNum = (n) => (n == null ? '-' : fmt.format(n));
  let html = '<div class="bento-grid">' +
    '<div class="bento-card col-12" style="padding:18px 22px">' +
      '<div class="card-title" style="color:var(--accent-cyan);font-size:12px">REAL SEARCH FEED (READ-ONLY)</div>' +
      '<h2 style="font-family:var(--font-display);font-size:20px;color:var(--text-bright);margin-top:2px">🔍 실제 검색 피드 & 잘된 썸네일</h2>' +
      '<div class="card-subtext" style="margin-top:6px;line-height:1.6">' +
        '시청자가 칠 법한 검색어로 실제 한국 유튜브를 검색한 결과 사이에 우리 썸네일을 넣어 봅니다. 아래에는 구독자 수에 비해 조회가 크게 터진 썸네일을 모았습니다. ' +
        '점수를 지어내지 않고 실제 숫자만 씁니다. 같은 검색어는 하루 한 번만 새로 검색합니다(유튜브 사용량 약 100).' +
      '</div>' +
    '</div>';

  if (!gThumbFeedPackages) {
    html += '<div class="bento-card col-12" style="padding:30px;text-align:center;color:var(--text-muted)">' + (gThumbFeedError ? esc(gThumbFeedError) : '패키지 목록을 불러오는 중...') + '</div></div>';
    return html;
  }
  if (!pkg) {
    html += '<div class="bento-card col-12" style="padding:30px;text-align:center;color:var(--text-muted)">썸네일이 들어 있는 업로드 패키지가 없습니다.</div></div>';
    return html;
  }

  const queries = thumbFeedQueries(pkg);
  const thumbs = pkg.thumbnails || [];
  const ourThumb = thumbs[Math.min(gThumbFeedThumbIdx, thumbs.length - 1)] || null;
  const isShorts = pkg.format === 'SHORTS';

  html += '<div class="bento-card col-12" style="padding:14px 18px;display:flex;flex-direction:column;gap:10px">' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
      '<span class="card-subtext" style="white-space:nowrap">패키지</span>' +
      '<select id="thumbfeed-pkg" style="background:#05070c;color:var(--text-bright);border:1px solid var(--border-subtle);border-radius:6px;padding:6px 8px;max-width:100%">' +
        gThumbFeedPackages.map(p => '<option value="' + esc(p.name) + '"' + (p.name === pkg.name ? ' selected' : '') + '>' +
          esc(p.name) + (p.status === 'published' ? ' · 공개됨' : (p.status === 'scheduled' ? ' · 예약' : '')) + '</option>').join('') +
      '</select>' +
    '</div>' +
    '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
      '<span class="card-subtext" style="white-space:nowrap">검색어</span>' +
      queries.map(q => '<button class="btn btn-sm btn-thumbfeed-query ' + (q === gThumbFeedQuery ? 'btn-cyan' : '') + '" data-query="' + esc(q) + '">' + esc(q) + '</button>').join('') +
    '</div>' +
    '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
      '<span class="card-subtext" style="white-space:nowrap">우리 썸네일</span>' +
      thumbs.map((t, i) => '<button class="btn btn-sm btn-thumbfeed-thumb ' + (ourThumb && t.file === ourThumb.file ? 'btn-cyan' : '') + '" data-idx="' + i + '">' + esc(t.file) + '</button>').join('') +
      '<span class="card-subtext" style="margin-left:12px;white-space:nowrap">보기</span>' +
      [['normal', '보통'], ['blur', '흐림'], ['grayscale', '흑백']].map(f => '<button class="btn btn-sm btn-thumbfeed-filter ' + (gAbVisionFilter === f[0] ? 'btn-cyan' : '') + '" data-filter="' + f[0] + '">' + f[1] + '</button>').join('') +
    '</div>' +
  '</div>';

  const d = gThumbFeedData;
  if (gThumbFeedLoading || !d) {
    html += '<div class="bento-card col-12" style="padding:30px;text-align:center;color:var(--text-muted)">' +
      (gThumbFeedError ? '검색 실패: ' + esc(gThumbFeedError) : '"' + esc(gThumbFeedQuery) + '" 검색 결과를 불러오는 중...') + '</div></div>';
    return html;
  }

  // 피드: 검색 결과 3번째 자리에 우리 썸네일
  const ours = {isOurs: true, title: pkg.title, channelTitle: '이해하면 쉬운영어', thumbnail: ourThumb ? ourThumb.url : '', views: null};
  const feedItems = (d.feed || []).slice(0, 11);
  feedItems.splice(Math.min(2, feedItems.length), 0, ours);
  const card = (x) => {
    const link = x.videoId ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(x.videoId) : '';
    const img = '<img src="' + esc(x.thumbnail || '') + '" alt="" style="width:100%;aspect-ratio:' + (isShorts ? '9/16' : '16/9') + ';object-fit:cover;border-radius:8px;display:block;' + filterCss + '">';
    // 우리 썸네일에 테두리를 두르지 않는다 — 실제 유튜브에는 없어서 우리 것만 눈에 띄는 착시가 생긴다(2026-11-11). 제목 앞 작은 표시만 둔다.
    return '<div>' +
      (link ? '<a href="' + esc(link) + '" target="_blank" rel="noopener">' + img + '</a>' : img) +
      '<div style="font-size:12px;color:var(--text-bright);margin-top:6px;line-height:1.35">' + (x.isOurs ? '<span class="tag-chip" style="background:rgba(245,158,11,0.2);color:#fbbf24;border:1px solid #f59e0b;font-size:10px;padding:1px 6px;margin-right:4px">우리 영상</span>' : '') + esc(x.title || '') + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + esc(x.channelTitle || '') + (x.views != null ? ' · 조회수 ' + fmtNum(x.views) + '회' : '') + '</div>' +
    '</div>';
  };
  html += '<div class="bento-card col-12">' +
    '<div class="card-header"><div>' +
      '<span class="card-title" style="color:var(--text-bright)">📱 "' + esc(d.query) + '" 실제 검색 결과 ' + (d.feed || []).length + '개 + 우리 썸네일(3번째)</span>' +
      '<div class="card-subtext">검색 시각 ' + esc(String(d.fetchedAt || '').slice(0, 16).replace('T', ' ')) + ' UTC' + (d.fromCache ? ' (오늘 저장해 둔 결과)' : '') + ' · 휴대폰 화면 너비로 보여 줍니다</div>' +
    '</div></div>' +
    '<div style="max-width:' + (isShorts ? '420px' : '380px') + ';margin:10px auto 0;display:grid;grid-template-columns:' + (isShorts ? '1fr 1fr' : '1fr') + ';gap:14px">' +
      feedItems.map(card).join('') +
    '</div>' +
  '</div>';

  const winnerCard = (x, badge) => {
    const link = x.videoId ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(x.videoId) : '';
    return '<div class="bento-card col-3" style="padding:10px">' +
      '<a href="' + esc(link) + '" target="_blank" rel="noopener"><img src="' + esc(x.thumbnail || '') + '" alt="" style="width:100%;aspect-ratio:' + (isShorts ? '9/16' : '16/9') + ';object-fit:cover;border-radius:6px;display:block"></a>' +
      '<div style="margin-top:6px"><span class="tag-chip" style="background:rgba(245,158,11,0.18);color:#fbbf24;border:1px solid #f59e0b;font-weight:800">' + esc(badge) + '</span></div>' +
      '<div style="font-size:12px;color:var(--text-bright);margin-top:4px;line-height:1.35">' + esc(x.title || '') + '</div>' +
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">' + esc(x.channelTitle || '') + (x.views != null ? ' · 조회수 ' + fmtNum(x.views) + '회' : '') + '</div>' +
    '</div>';
  };
  const winners = d.winners || [];
  html += '<div class="bento-card col-12"><div class="card-header"><div>' +
      '<span class="card-title" style="color:var(--accent-amber)">🏆 이 검색에서 잘된 썸네일 (구독자 수 대비 조회 배수 순)</span>' +
      '<div class="card-subtext">채널이 작은데도 조회가 많이 나온 영상일수록 썸네일·제목의 힘이 컸다고 볼 수 있습니다. 구독자 1,000명 미만이거나 구독자 수를 숨긴 채널은 뺐습니다(배수가 의미 없이 커져서).</div>' +
    '</div></div>' +
    (winners.length ? '<div class="bento-grid" style="padding:0;margin-top:8px">' + winners.map(x => winnerCard(x, '구독자 대비 ' + x.ratio + '배')).join('') + '</div>'
      : '<div style="padding:20px;text-align:center;color:var(--text-muted)">이 검색 결과에는 비교할 영상이 없습니다.</div>') +
  '</div>';

  const outs = d.competitorOutliers || [];
  html += '<div class="bento-card col-12"><div class="card-header"><div>' +
      '<span class="card-title" style="color:var(--accent-magenta)">📈 경쟁 채널에서 평소보다 크게 터진 썸네일</span>' +
      '<div class="card-subtext">추적 중인 경쟁 채널에서 그 채널 평소 조회의 몇 배가 나온 영상입니다(차단 채널 제외, ' + (isShorts ? '쇼츠' : '롱폼') + '만).</div>' +
    '</div></div>' +
    (outs.length ? '<div class="bento-grid" style="padding:0;margin-top:8px">' + outs.map(x => winnerCard(x, '평소 대비 ' + (x.ratioLabel || '측정 전'))).join('') + '</div>'
      : '<div style="padding:20px;text-align:center;color:var(--text-muted)">해당 형식의 경쟁 아웃라이어가 없습니다.</div>') +
  '</div>';

  html += '</div>';
  return html;
}

function bindAbSimulatorEvents() {
  const load = async () => {
    if (!gThumbFeedPackages) {
      if (gThumbFeedLoading) return;
      gThumbFeedLoading = true;
      try {
        const res = await fetch('/api/thumb-feed/packages');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
        gThumbFeedPackages = data.packages || [];
        gThumbFeedError = '';
      } catch (err) {
        gThumbFeedError = '패키지 목록을 못 불러왔습니다: ' + err.message;
      }
      gThumbFeedLoading = false;
      if (gCurrentTab === 'tab-ab-simulator') renderCurrentTab();
      return;
    }
    const pkg = thumbFeedCurrentPkg();
    if (!pkg) return;
    const queries = thumbFeedQueries(pkg);
    if (!gThumbFeedQuery || queries.indexOf(gThumbFeedQuery) === -1) gThumbFeedQuery = queries[0] || '';
    if (!gThumbFeedQuery) return;
    const want = pkg.format + '::' + gThumbFeedQuery;
    if ((gThumbFeedData && gThumbFeedData.key === want) || gThumbFeedLoading || gThumbFeedError) return;
    gThumbFeedLoading = true;
    try {
      const res = await fetch('/api/thumb-feed?query=' + encodeURIComponent(gThumbFeedQuery) + '&format=' + encodeURIComponent(pkg.format));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
      data.key = want;
      gThumbFeedData = data;
      gThumbFeedError = '';
    } catch (err) {
      gThumbFeedError = err.message;
    }
    gThumbFeedLoading = false;
    if (gCurrentTab === 'tab-ab-simulator') renderCurrentTab();
  };

  const sel = document.getElementById('thumbfeed-pkg');
  if (sel) sel.onchange = () => {
    gThumbFeedPkg = sel.value;
    try { localStorage.setItem('ihm_thumbfeed_pkg', gThumbFeedPkg); } catch (_) {}
    gThumbFeedQuery = ''; gThumbFeedThumbIdx = 0; gThumbFeedData = null; gThumbFeedError = '';
    renderCurrentTab();
  };
  document.querySelectorAll('.btn-thumbfeed-query').forEach(btn => {
    btn.onclick = () => { gThumbFeedQuery = btn.dataset.query || ''; gThumbFeedData = null; gThumbFeedError = ''; renderCurrentTab(); };
  });
  document.querySelectorAll('.btn-thumbfeed-thumb').forEach(btn => {
    btn.onclick = () => { gThumbFeedThumbIdx = Number(btn.dataset.idx) || 0; renderCurrentTab(); };
  });
  document.querySelectorAll('.btn-thumbfeed-filter').forEach(btn => {
    btn.onclick = () => { gAbVisionFilter = btn.dataset.filter || 'normal'; renderCurrentTab(); };
  });
  load();
}


/* TAB: KNOWLEDGE DB (audience-dna.json / success-patterns.json 누적·환류 뷰어) */


/* TAB: 💡 IDEA BOARD (아이디어 추천 → A/B 시뮬레이터 핸드오프) */


const btnRpa = document.getElementById('btn-open-studio-rpa');
if (btnRpa) btnRpa.onclick = () => openStudioRpaModal();

document.getElementById('btn-sync-global').onclick = async () => {
  const btn = document.getElementById('btn-sync-global');
  btn.disabled = true;
  btn.textContent = '동기화 중...';
  try {
    const res = await fetch('/api/sync');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '동기화 실패');
    showToast('YouTube 최신 데이터와 동기화되었습니다!');
    await loadAll();
  } catch (err) {
    alert('동기화 실패: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '↻ 데이터 동기화';
  }
};

// Real-time live auto-ingest listener via SSE
if (window.EventSource) {
  try {
    const evtSource = new EventSource('/api/events');
    evtSource.addEventListener('studio-updated', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (gDashboard) {
          gDashboard.studioFolderScan = data.scan;
          gDashboard.videoReachManual = data.videoReachManual;
        }
        const name = data.event?.folderName || data.event?.filename || '신규 데이터';
        showToast('🎉 스튜디오 CTR 데이터가 자동 감지되어 연결되었습니다! (' + esc(name) + ')');
        if (gCurrentTab === 'tab-studio') {
          renderCurrentTab();
        }
      } catch (err) {
        console.error('SSE data parse error:', err);
      }
    });
    evtSource.addEventListener('schedule-updated', (e) => {
      try {
        if (typeof loadAndBindSchedulePanel === 'function') loadAndBindSchedulePanel();
        if (typeof showToast === 'function') showToast('🚀 유튜브 예약 업로드가 완료되었습니다!');
      } catch (err) {
        console.error('SSE schedule-updated error:', err);
      }
    });
    evtSource.addEventListener('analysis-updated', async () => {
      try {
        const applied = await refreshAnalysisDerivedDataSilently();
        if (!applied) return;
        const activeTag = document.activeElement && document.activeElement.tagName;
        const shouldRefreshTab = gCurrentTab === 'tab-demand' || gCurrentTab === 'tab-outlier' || gCurrentTab === 'tab-benchmark';
        if (shouldRefreshTab && !gDemandBusyCount && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
          const smartEl = document.getElementById('input-demand-smart');
          const smartDraft = smartEl ? smartEl.value : '';
          const kwScrollEl = document.querySelectorAll('.demand-kw-scroll')[0];
          const prevScrollTop = kwScrollEl ? kwScrollEl.scrollTop : 0;
          renderCurrentTab();
          const nextSmartEl = document.getElementById('input-demand-smart');
          if (nextSmartEl && smartDraft) nextSmartEl.value = smartDraft;
          const nextKwScrollEl = document.querySelectorAll('.demand-kw-scroll')[0];
          if (nextKwScrollEl && prevScrollTop > 0) nextKwScrollEl.scrollTop = prevScrollTop;
        }
      } catch (err) {
        console.error('SSE analysis-updated error:', err);
      }
    });
  } catch (err) {
    console.warn('SSE connection warning:', err);
  }
}

initCategoryTabsInteractions();
loadAll();
</script>
</body>
</html>`;

let memoryDashboardCache = null;
let lastDashboardCacheTime = 0;
let memoryMarketDemand = null;
let lastMarketDemandTime = 0;

// 시장 수요 레이더의 아웃라이어 카드에 "이미 분석함" 표시를 하기 위해, 저장된 리포트 파일명에서
// videoId를 역추출해 인덱스를 만든다. 댓글/대본 리포트 둘 다 파일명이 `..._${videoId}.md`로
// 끝나는 관례를 따른다(analyze-outlier-comments.mjs/analyze-competitor-script.mjs 공통).
// 재분석 없이 같은 영상을 또 클릭했을 때 Gemini 호출과 audience-dna.json 중복 누적을 막기 위함
// (2026-09-07, 사용자 지적으로 추가).
async function buildOutlierReportFileIndex(dir) {
  const byVideoId = new Map();
  try {
    if (existsSync(dir)) {
      for (const file of await readdir(dir)) {
        const m = file.match(/_([A-Za-z0-9_-]{11})\.md$/);
        if (m) byVideoId.set(m[1], file);
      }
    }
  } catch {}
  return byVideoId;
}

async function annotateMarketDemandAnalysisStatus(marketDemand) {
  if (!marketDemand?.byKeyword) return marketDemand;
  const [commentFileByVid, scriptFileByVid, failuresStore] = await Promise.all([
    buildOutlierReportFileIndex(outputInsightsDir),
    buildOutlierReportFileIndex(outputScriptInsightsDir),
    loadJson(analysisFailuresPath, { schemaVersion: 1, entries: {} }),
  ]);
  const failures = failuresStore.entries || {};
  // 합친 아웃라이어 리포트(2026-11-12): 있으면 화면이 "리포트 보기"와 첫 캡처를 보여 준다.
  const unifiedReports = new Map(loadOutlierReports().map((r) => [r.videoId, r]));
  const unifiedInfo = (videoId) => {
    const r = unifiedReports.get(videoId);
    if (!r) return null;
    const first = (r.frames || []).find((f) => existsSync(join(outlierFramesDir, videoId, f.file)));
    return {frame: first ? `/outlier-frames/${videoId}/${first.file}` : null, visualChanges: (r.analysis?.visualMoments || []).length};
  };
  // 아웃라이어 영상 하나에 댓글/대본 리포트·실패 사유를 붙이는 로직 — byKeyword의
  // topOutliers와 trackedChannels(2026-09-30 추가)의 topOutliers가 구조가 완전히
  // 같으므로 함수로 뽑아 양쪽에 재사용한다.
  const annotateOutlier = (o) => ({
    ...o,
    outlierReport: (o.videoId && unifiedInfo(o.videoId)) || null,
    commentReportFile: (o.videoId && commentFileByVid.get(o.videoId)) || null,
    scriptReportFile: (o.videoId && scriptFileByVid.get(o.videoId)) || null,
    // 성공 리포트가 없는데 마지막 시도가 실패로 끝난 적 있으면 그 사유를 같이 실어 보낸다 —
    // 버튼은 그대로 눌러서 재시도할 수 있게 두되(자막 꺼짐처럼 영구적인지, API 일시 오류처럼
    // 다음엔 될지 우리가 단정할 수 없음), 눌러보기 전에 왜 실패했었는지 미리 알려준다.
    commentError: (!commentFileByVid.get(o.videoId) && o.videoId && failures[o.videoId]?.comment?.message) || null,
    scriptError: (!scriptFileByVid.get(o.videoId) && o.videoId && failures[o.videoId]?.script?.message) || null,
  });
  return {
    ...marketDemand,
    byKeyword: marketDemand.byKeyword.map((k) => ({
      ...k,
      topOutliers: (k.topOutliers || []).map(annotateOutlier),
    })),
    trackedChannels: (marketDemand.trackedChannels || []).map((c) => ({
      ...c,
      topOutliers: (c.topOutliers || []).map(annotateOutlier),
    })),
  };
}

async function getFullDashboardData(forceLiveSync = false) {
  if (forceLiveSync) {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('YouTube 채널 재연동(로그인)이 필요합니다.');
    const dashboard = await getDashboard(accessToken);
    memoryDashboardCache = dashboard;
    lastDashboardCacheTime = Date.now();
    return dashboard;
  }

  // Return in-memory cache if fresh (< 30s)
  if (memoryDashboardCache && (Date.now() - lastDashboardCacheTime < 30_000)) {
    return memoryDashboardCache;
  }

  // 1. Instantly return cached snapshot from local storage
  const cached = await loadJson(latestSnapshotPath);
  if (cached) {
    const catalog = await loadJson(catalogPath);
    const packaging = cached.packagingRegistry || await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
    const localThumbs = await getLocalPackageThumbnailMap();
    const scan = await scanStudioExportFolders(cached.recentVideos || catalog?.videos || [], packaging);
    const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
    const token = await loadToken();
    const isOnline = Boolean(token?.access_token || token?.refresh_token);

    const fullData = {
      ...cached,
      localThumbnails: localThumbs,
      studioFolderScan: scan,
      videoReachManual: reach,
      isOffline: !isOnline,
    };
    memoryDashboardCache = fullData;
    lastDashboardCacheTime = Date.now();
    return fullData;
  }

  // 2. If no snapshot exists on disk, run live sync once on bootstrap
  const accessToken = await getAccessToken();
  if (accessToken) {
    try {
      const dashboard = await getDashboard(accessToken);
      memoryDashboardCache = dashboard;
      lastDashboardCacheTime = Date.now();
      return dashboard;
    } catch (err) {
      console.warn('[Dashboard] 실시간 API 조회 실패, 캐시 데이터로 대체합니다:', err.message);
    }
  }

  return null;
}

// 폴더(하위 폴더 포함) 안 파일 중 가장 늦은 수정 시각(초). 그림을 다시 만들면 값이 바뀌어 이미지 주소의 ?v=가 달라진다(브라우저 캐시 방지).
function latestFileMtime(dirs) {
  let latest = 0;
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.mtimeMs > latest) latest = st.mtimeMs;
    }
  };
  dirs.forEach(walk);
  return latest ? String(Math.floor(latest / 1000)) : '';
}

// 아웃라이어 리포트 캡처 만들기 줄(한 번에 한 편씩). 같은 영상은 두 번 넣지 않는다.
// 돌려주는 값: 이 리포트에서 아직 없는 캡처 수(0이면 다 있음).
const outlierFrameJobs = new Set();
let outlierFrameChain = Promise.resolve();
function queueMissingOutlierFrames(report) {
  const missing = missingOutlierFrames(report).length;
  if (!missing || outlierFrameJobs.has(report.videoId)) return missing;
  outlierFrameJobs.add(report.videoId);
  outlierFrameChain = outlierFrameChain
    .then(() => ensureReportFrames(report))
    .then((r) => { if (r.error) console.warn(`[Outlier Frames] ${report.videoId}: ${r.error}`); })
    .catch((err) => console.warn(`[Outlier Frames] ${report.videoId}: ${err.message}`))
    .finally(() => outlierFrameJobs.delete(report.videoId));
  return missing;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    const blockReason = getRequestBlockReason({headers: req.headers, method: req.method, pathname: url.pathname, port});
    if (blockReason) {
      console.warn(`[Request Guard] 외부 요청 차단 (${blockReason}): ${req.method} ${url.pathname}`);
      return json(res, 403, {error: '다른 사이트에서 온 요청이라 막았습니다. 대시보드 화면에서 다시 시도하세요.'});
    }
    if (url.pathname === '/') {
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(pageHtml.replace('<script>', () => '<script>' + String.fromCharCode(10) + clientVideoFormatSource + String.fromCharCode(10)));
      return;
    }
    // 합친 아웃라이어 리포트 화면(읽기 전용, 2026-11-12). 캡처는 깃에 올리지 않아 PC마다 만든다 —
    // 빠진 캡처가 있으면 서버가 뒤에서 하나씩 만들고 화면은 안내를 띄운 뒤 스스로 새로고침한다.
    if (url.pathname === '/outlier-reports') {
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(renderOutlierReportIndex(loadOutlierReports()));
      return;
    }
    const outlierReportMatch = url.pathname.match(/^\/outlier-report\/([\w-]{11})$/);
    if (outlierReportMatch) {
      const reportPath = join(outlierReportsDir, `${outlierReportMatch[1]}.json`);
      const report = existsSync(reportPath) ? await loadJson(reportPath) : null;
      if (!report) return json(res, 404, {error: '이 영상의 리포트가 없습니다.'});
      const framesPending = queueMissingOutlierFrames(report);
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(renderOutlierReportPage(report, {framesPending, hasSheet: loadTransformSheets().some((t) => t.sourceVideoId === outlierReportMatch[1])}));
      return;
    }
    // 비교 시트(2026-11-12): 경쟁 영상과 우리가 만들 콘텐츠를 같은 행에서 좌우로 비교한다. 읽기 전용.
    if (url.pathname === '/transform-sheets') {
      const reports = new Map(loadOutlierReports().map((r) => [r.videoId, r]));
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(renderTransformSheetIndex(loadTransformSheets().map((sheet) => ({sheet, report: reports.get(sheet.sourceVideoId) || null}))));
      return;
    }
    const sheetMatch = url.pathname.match(/^\/transform-sheet\/([\w-]{11})$/);
    if (sheetMatch) {
      const sheet = loadTransformSheets().find((x) => x.sourceVideoId === sheetMatch[1]);
      if (!sheet) return json(res, 404, {error: '이 영상의 비교 시트가 없습니다.'});
      const reportPath = join(outlierReportsDir, sheetMatch[1] + '.json');
      const report = existsSync(reportPath) ? await loadJson(reportPath) : null;
      if (report) queueMissingOutlierFrames(report);
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(renderTransformSheetPage(sheet, report, validateTransformSheet(sheet, {imageExists: sheetImageExists, competitorPacing: report?.pacing}), {assetVersion: latestFileMtime([join(transformSheetsDir, 'images', sheetMatch[1]), join(outlierFramesDir, sheetMatch[1])])}));
      return;
    }
    if (url.pathname === '/api/transform-sheet-pick' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const vid = String(body.videoId || '');
      if (!/^[\w-]{11}$/.test(vid)) return json(res, 400, {error: '영상 ID가 이상합니다.'});
      const file = join(transformSheetsDir, vid + '.json');
      if (!existsSync(file)) return json(res, 404, {error: '비교 시트가 없습니다.'});
      try {
        const pick = body.kind === 'title' ? setTitlePick : setThumbnailPick;
        const next = pick(await loadJson(file), String(body.image || ''), body.picked === true);
        await writeFile(file, JSON.stringify(next, null, 2) + '\n', 'utf8');
        return json(res, 200, {ok: true, thumbnailPicks: next.thumbnailPicks, titlePicks: next.titlePicks});
      } catch (e) { return json(res, 400, {error: e.message}); }
    }
    const sheetImageMatch = url.pathname.match(/^\/transform-images\/([\w-]{11})\/((?:cuts\/)?[\w.-]{1,60}\.(?:jpg|png))$/);
    if (sheetImageMatch) {
      const imagePath = join(transformSheetsDir, 'images', sheetImageMatch[1], sheetImageMatch[2]);
      if (!existsSync(imagePath)) return json(res, 404, {error: '이미지가 없습니다.'});
      res.writeHead(200, {'Content-Type': sheetImageMatch[2].endsWith('.png') ? 'image/png' : 'image/jpeg', 'Cache-Control': 'no-cache'});
      res.end(await readFile(imagePath));
      return;
    }
    // 연출 자료집 페이지(탭은 6개로 두기로 한 결정 때문에 따로 연다): 모든 리포트의 화면 변화. 빠진 캡처는 뒤에서 만든다.
    if (url.pathname === '/visual-library') {
      const reports = loadOutlierReports();
      const pendingReports = reports.filter((r) => queueMissingOutlierFrames(r) > 0).length;
      const entries = buildVisualLibrary(reports).map((e) => ({...e, frameReady: Boolean(e.frame && existsSync(join(projectDir, e.frame)))}));
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(renderVisualLibraryPage(entries, {query: String(url.searchParams.get('q') || '').slice(0, 100), reports: reports.length, pendingReports}));
      return;
    }
    // 다음 기획 입력(매일 루프가 만드는 파일과 같은 계산)을 전체 관제 카드와 전체 페이지로 보여 준다.
    if (url.pathname === '/api/next-input') {
      const input = buildNextEpisodeInput(projectDir);
      let fileGeneratedAt = null;
      try { fileGeneratedAt = ((await readFile(nextEpisodeInputPath(projectDir), 'utf8')).match(/^만든 때: (\S+)/m) || [])[1] || null; } catch { /* 파일 없음 */ }
      return json(res, 200, {...input, fileGeneratedAt});
    }
    if (url.pathname === '/next-input') {
      let markdown = '';
      try { markdown = await readFile(nextEpisodeInputPath(projectDir), 'utf8'); } catch { markdown = '# 다음 기획 입력\n\n아직 파일이 없습니다. `npm run next-input`으로 만들거나 매일 루프를 기다립니다.'; }
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(renderMarkdownPage('다음 기획 입력', markdown));
      return;
    }
    const outlierFrameMatch = url.pathname.match(/^\/outlier-frames\/([\w-]{11})\/((?:cut-)?\d{1,5}\.jpg)$/);
    if (outlierFrameMatch) {
      const framePath = join(outlierFramesDir, outlierFrameMatch[1], outlierFrameMatch[2]);
      if (!existsSync(framePath)) return json(res, 404, {error: '캡처가 이 PC에 없습니다(다른 PC에서 만든 리포트는 다시 분석해야 캡처가 생깁니다).'});
      res.writeHead(200, {'Content-Type': 'image/jpeg', 'Cache-Control': 'no-cache'});
      res.end(await readFile(framePath));
      return;
    }
    if (url.pathname === '/auth') {
      if (requiredMissing.length) return json(res, 500, {error: `.env에 ${requiredMissing.join(', ')} 설정이 필요합니다.`});
      const state = randomBytes(24).toString('hex');
      states.add(state);
      setTimeout(() => states.delete(state), 10 * 60 * 1000).unref();
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        access_type: 'offline',
        // 계정과 채널을 고르는 화면을 항상 띄운다. 기본값으로 다른 채널이 잡히는 일을 막기 위해서다.
        prompt: 'select_account consent',
        include_granted_scopes: 'true',
        scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.force-ssl',
        state,
      });
      return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
    }
    if (url.pathname === '/oauth2callback') {
      const state = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      const oauthError = url.searchParams.get('error');
      if (oauthError) throw new Error(`Google 승인이 취소되었거나 실패했습니다: ${oauthError}`);
      if (!state || !states.delete(state)) return json(res, 400, {error: 'OAuth state가 만료되었거나 일치하지 않습니다. 처음부터 다시 연결하세요.'});
      if (!code) return json(res, 400, {error: 'Google 인증 코드가 없습니다.'});
      const token = await tokenRequest({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });
      // 다른 채널로 로그인했으면 저장하지 않는다. 기존 연동은 그대로 남는다.
      const connected = await fetchConnectedChannel(token.access_token);
      if (!isOurChannel(connected?.id)) {
        const name = String(connected?.title || '확인 실패').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        res.writeHead(409, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>다른 채널입니다</title><body style="font-family:sans-serif;padding:40px;line-height:1.7"><h1>다른 채널로 로그인했습니다</h1><p>선택한 채널: <b>${name}</b></p><p>이 연동은 저장하지 않았습니다. <b>이해하면 쉬운 영어</b> 채널을 골라 다시 연결해 주세요.</p><p><a href="/auth">다시 연결하기</a> · <a href="/">대시보드로 돌아가기</a></p></body></html>`);
        return;
      }
      await saveToken(token);
      return redirect(res, '/');
    }
    if (url.pathname === '/api/dashboard') {
      const data = await getFullDashboardData();
      if (!data) return json(res, 401, {error: 'YouTube 채널 연결이 필요합니다.'});
      return json(res, 200, data);
    }
    if (url.pathname === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      res.write(': connected\n\n');
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return;
    }
    if (url.pathname === '/api/studio-scan' && (req.method === 'POST' || req.method === 'GET')) {
      const catalog = await loadJson(catalogPath);
      const packaging = await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
      const videos = catalog?.videos || [];
      const scanResult = await scanStudioExportFolders(videos, packaging);
      const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
      if (memoryDashboardCache) {
        memoryDashboardCache.studioFolderScan = scanResult;
        memoryDashboardCache.videoReachManual = reach;
      }
      notifyClients('studio-updated', { event: { type: 'manual-scan' }, scan: scanResult, videoReachManual: reach });
      return json(res, 200, {ok: true, scan: scanResult, videoReachManual: reach});
    }
    if (url.pathname === '/api/package-image') {
      const id = String(url.searchParams.get('id') || '');
      const videoId = String(url.searchParams.get('videoId') || '');
      let relPath = null;
      if (id) {
        const registry = await loadJson(packagingRegistryPath);
        const item = registry?.items?.find((entry) => entry.id === id);
        if (item?.thumbnailPath) relPath = item.thumbnailPath;
      }
      if (!relPath && videoId) {
        const localMap = await getLocalPackageThumbnailMap();
        if (localMap[videoId]) relPath = localMap[videoId];
      }
      if (!relPath || !/^output[\\/]/.test(relPath) || relPath.includes('..')) {
        return json(res, 404, {error: '등록된 로컬 썸네일이 없습니다.'});
      }
      const filePath = resolve(projectDir, relPath);
      if (!existsSync(filePath)) return json(res, 404, {error: '썸네일 파일을 찾지 못했습니다.'});
      const image = await readFile(filePath);
      const isPng = filePath.endsWith('.png');
      res.writeHead(200, {'Content-Type': isPng ? 'image/png' : 'image/jpeg', 'Cache-Control': 'max-age=3600'});
      res.end(image);
      return;
    }
    if (url.pathname.startsWith('/api/upload-package-asset/')) {
      // 에피소드 패키지 인스펙터가 output/upload-packages/<폴더>/ 안의 썸네일 후보·영상 파일을
      // 서빙하기 위한 라우트(2026-09-04 추가). 폴더명·파일명 둘 다 사용자 입력이 아니라 서버가
      // readdir로 찾은 실제 파일명만 URL로 내보내지만, 공개 라우트인 만큼 경로 이탈은 방어적으로
      // 한 번 더 막는다 — 폴더명은 output/upload-packages 바로 아래 한 단계로 고정.
      // 폴더명 다음에 오는 나머지 구간은 전부 파일 경로로 합친다(2026-09-18 확장) —
      // subtitles/subtitles-en.srt처럼 패키지 안에 한 단계 하위 폴더(예: 다국어 자막)가
      // 생기면서 기존의 "정확히 2구간(폴더/파일)만 허용" 제약이 막아버려서 넓힘. 각 구간마다
      // '..'·'\\' 금지는 그대로 유지해 경로 이탈을 막는다.
      const rest = decodeURIComponent(url.pathname.slice('/api/upload-package-asset/'.length));
      const parts = rest.split('/');
      if (parts.length < 2 || parts.some((p) => !p || p.includes('..') || p.includes('\\'))) {
        return json(res, 400, {error: '잘못된 경로입니다.'});
      }
      const [pkgFolder, ...fileParts] = parts;
      const filename = fileParts.join('/');
      const filePath = join(projectDir, 'output', 'upload-packages', pkgFolder, ...fileParts);
      if (!existsSync(filePath)) return json(res, 404, {error: '파일을 찾지 못했습니다.'});
      const ext = filename.split('.').pop().toLowerCase();
      const contentType = {jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', mp4: 'video/mp4', html: 'text/html; charset=utf-8', srt: 'application/x-subrip; charset=utf-8'}[ext] || 'application/octet-stream';
      //썸네일 등은 같은 파일명으로 내용만 교체되는 경우가 흔하다(예: thumbnail-b.jpg 재생성).
      // 예전엔 'max-age=3600'으로 무조건 캐시해서, 파일을 갈아 끼워도 브라우저가 최대 1시간
      // 동안 옛 이미지를 계속 보여주는 버그가 있었다(2026-09-20 확인). Last-Modified 기반
      // 검증으로 바꿔 파일이 실제로 바뀌었으면 즉시 새로 받아오고, 안 바뀌었으면 304로 여전히
      // 가볍게 응답한다.
      const stats = await stat(filePath);
      const lastModified = stats.mtime.toUTCString();
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifModifiedSince && new Date(ifModifiedSince).getTime() >= stats.mtime.getTime()) {
        res.writeHead(304, {'Cache-Control': 'no-cache', 'Last-Modified': lastModified});
        res.end();
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, {'Content-Type': contentType, 'Cache-Control': 'no-cache', 'Last-Modified': lastModified});
      res.end(data);
      return;
    }
    if (url.pathname.startsWith('/api/video-project-asset/')) {
      // 업로드 패키지가 아직 안 만들어진 영상 프로젝트(videos/<프로젝트>/)의 썸네일을 서빙한다
      // (2026-09-07 추가). A/B 시뮬레이터가 생성 직후엔 output/temp-thumbnails/를 가리키는데,
      // 그 폴더는 .gitignore 대상이라 다른 PC에는 그 파일이 없다 — VIDEO_WORKFLOW.md 규칙대로
      // videos/<프로젝트>/thumbnail-*.jpg로 옮긴 뒤에는 이 라우트로 바꿔 가리켜야 다른 PC에서도
      // 똑같이 보인다. 공개 라우트라 경로 이탈 방어 + 썸네일 파일명 패턴으로 노출 범위를 좁힌다.
      const rest = decodeURIComponent(url.pathname.slice('/api/video-project-asset/'.length));
      const parts = rest.split('/');
      if (parts.length !== 2 || parts.some((p) => !p || p.includes('..') || p.includes('\\'))) {
        return json(res, 400, {error: '잘못된 경로입니다.'});
      }
      const [project, filename] = parts;
      if (!/^thumbnail(-[a-z0-9]+)?\.(jpg|jpeg|png)$/i.test(filename)) {
        return json(res, 400, {error: '허용되지 않은 파일명입니다.'});
      }
      const filePath = join(projectDir, 'videos', project, filename);
      if (!existsSync(filePath)) return json(res, 404, {error: '파일을 찾지 못했습니다.'});
      const contentType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      // 같은 이유로 no-cache + Last-Modified 검증으로 변경 (위 /api/upload-package-asset/ 참고).
      const projStats = await stat(filePath);
      const projLastModified = projStats.mtime.toUTCString();
      const projIfModifiedSince = req.headers['if-modified-since'];
      if (projIfModifiedSince && new Date(projIfModifiedSince).getTime() >= projStats.mtime.getTime()) {
        res.writeHead(304, {'Cache-Control': 'no-cache', 'Last-Modified': projLastModified});
        res.end();
        return;
      }
      const data = await readFile(filePath);
      res.writeHead(200, {'Content-Type': contentType, 'Cache-Control': 'no-cache', 'Last-Modified': projLastModified});
      res.end(data);
      return;
    }
    if (url.pathname === '/api/market-demand') {
      if (memoryMarketDemand && (Date.now() - lastMarketDemandTime < 60_000)) {
        return json(res, 200, await annotateMarketDemandAnalysisStatus(memoryMarketDemand));
      }
      const [marketDemand, catalog] = await Promise.all([
        loadJson(marketDemandPath),
        loadJson(catalogPath, { videos: [] }),
      ]);
      if (!marketDemand) return json(res, 404, {error: 'market-demand.json 파일이 없습니다.'});
      const syncedMarketDemand = syncAllTrackedChannels(marketDemand, catalog.videos || catalog);
      memoryMarketDemand = syncedMarketDemand;
      lastMarketDemandTime = Date.now();
      return json(res, 200, await annotateMarketDemandAnalysisStatus(syncedMarketDemand));
    }
    if (url.pathname === '/api/market-demand/run' && req.method === 'POST') {
      const body = await readJsonBody(req);
      // 셸 문자열로 명령어를 합치면(구 코드: `--keyword="${body.keyword}"`를 exec()에 문자열로
      // 넘김) 윈도우 cmd.exe가 한글을 깨뜨려서, 실제로는 "영어 듣기 안 들리는 이유" 같은 정상
      // 키워드가 아니라 mojibake 문자열로 저장되는 버그가 있었다(2026-09-13, 사용자가 키워드
      // 삭제 후 재분석했는데 카드가 안 돌아와서 발견 — 실제로 실행은 됐지만 깨진 이름으로
      // 저장돼 있었음). execFile은 셸을 거치지 않고 인자를 배열로 그대로 넘기므로 인코딩이
      // 깨지지 않고, 키워드에 따옴표·세미콜론 등이 들어있어도 셸 인젝션 위험이 없다.
      // channel과 keyword는 서로 다른 모드다(market-demand.mjs --channel= 참고, 2026-09-30
      // 추가) — 둘 다 오면 channel을 우선한다(UI가 두 입력을 동시에 못 보내게 만들 것이므로
      // 실제로는 안 겹치지만, 서버는 방어적으로 우선순위를 명시해둔다).
      let channel = body.channel;
      let keyword = body.keyword;
      if (body.smartInput) {
        const input = String(body.smartInput).trim();
        const isChannel = input.startsWith('http://') || input.startsWith('https://') || input.startsWith('@') || input.startsWith('UC');
        if (isChannel) {
          channel = input;
        } else {
          keyword = input;
        }
      }

      const args = ['scripts/market-demand.mjs',
        ...(body.syncAll ? ['--sync-all-tracked'] : (body.d7Sync ? ['--d7-sync'] : (channel ? [`--channel=${channel}`] : (keyword ? [`--keyword=${keyword}`] : []))))];
      const runStartedAt = Date.now() - 1000;
      try {
        await execFileAsync('node', args, {cwd: projectDir});
        const updated = await loadJson(marketDemandPath);
        memoryMarketDemand = updated;
        lastMarketDemandTime = Date.now();
        let queued = {comments: [], scripts: []};
        if (!body.syncAll && !body.d7Sync && body.autoAnalyze !== false) {
          queued = await enqueueAutoOutlierReports(pickRecentMarketDemandSlice(updated, runStartedAt));
        }
        return json(res, 200, {ok: true, queued, data: await annotateMarketDemandAnalysisStatus(updated)});
      } catch (err) {
        return json(res, 500, {error: `스크립트 실행 오류: ${err.message}`});
      }
    }
    if (url.pathname === '/api/episodes/summary') {
      return json(res, 200, await getEpisodesSummary());
    }
    if (url.pathname === '/api/schedule/rules' && req.method === 'GET') {
      const rules = await loadPublishRules(publishRulesPath);
      return json(res, 200, rules);
    }
    if (url.pathname === '/api/schedule/rules' && req.method === 'POST') {
      const body = await readJsonBody(req);
      // 권한 없이 켜면 올라가지도 않으면서 켜진 것처럼 보이므로 막는다.
      if (body.autoUploadEnabled === true && !hasUploadScope((await loadToken())?.scope)) {
        return json(res, 409, { error: '유튜브 업로드 권한이 없습니다. 먼저 채널을 재연동해 주세요.' });
      }
      if (body.autoUploadEnabled === true) {
        const accessToken = await getAccessToken();
        const connected = accessToken ? await getConnectedChannel(accessToken) : null;
        if (!isOurChannel(connected?.id)) {
          return json(res, 409, { error: `지금 연동된 채널은 "${connected?.title || '확인 실패'}"입니다. 재연동해서 "이해하면 쉬운 영어" 채널을 고르세요.` });
        }
      }
      const updated = await savePublishRules(publishRulesPath, body);
      return json(res, 200, { ok: true, rules: updated });
    }
    if (url.pathname === '/api/schedule/queue' && req.method === 'GET') {
      const rules = await loadPublishRules(publishRulesPath);
      const context = await loadUploadContext({ accessToken: await getAccessToken() });
      const queue = buildPublishQueue({ readyPackages: context.readyPackages, rules, latestScheduledDate: context.latestScheduledDate });
      const throttle = isUploadAllowed({
        recentUploadHistory: context.recentUploadHistory,
        maxUploadsPerDay: rules.maxUploadsPerDay,
        maxUploadsPerWeek: rules.maxUploadsPerWeek,
      });
      const nextDecision = decideNextUpload({ ...context, rules, skipDuplicateCheck: true });
      return json(res, 200, {
        ok: true,
        rules,
        queue,
        throttle,
        latestScheduledDate: context.latestScheduledDate,
        hasUploadScope: context.hasScope,
        connectedChannel: context.connectedChannel,
        channelOk: isOurChannel(context.connectedChannel?.id),
        attention: context.attention,
        notices: await scanUploadNotices(globalUploadPackagesDir),
        nextDecision: { ok: nextDecision.ok, reason: nextDecision.reason || null, episodeId: nextDecision.item?.episodeId || null },
      });
    }
    if (url.pathname === '/api/schedule/approve-thumbnail' && req.method === 'POST') {
      const { episodeId } = await readJsonBody(req);
      const readyPackages = await scanReadyPackages(globalUploadPackagesDir);
      const target = readyPackages.find((p) => p.episodeId === episodeId);
      if (!target) return json(res, 404, { error: `대기 중인 패키지(${episodeId})를 찾을 수 없습니다.` });
      try {
        return json(res, 200, { ok: true, approval: await approveThumbnail(target.pkgDir) });
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    }
    if (url.pathname === '/api/schedule/comment-done' && req.method === 'POST') {
      const { episodeId } = await readJsonBody(req);
      const notices = await scanUploadNotices(globalUploadPackagesDir);
      const target = notices.find((p) => p.episodeId === episodeId);
      if (!target) return json(res, 404, { error: `고정 댓글 안내가 있는 패키지(${episodeId})를 찾을 수 없습니다.` });
      await dismissCommentNotice(target.pkgDir);
      return json(res, 200, { ok: true });
    }
    if (url.pathname === '/api/schedule/resolve' && req.method === 'POST') {
      const { episodeId, action } = await readJsonBody(req);
      if (isUploadWorkerRunning) {
        return json(res, 409, { error: '현재 다른 동영상 업로드가 진행 중입니다. 잠시 후 다시 시도해 주세요.' });
      }
      const attention = await scanPackagesNeedingAttention(globalUploadPackagesDir);
      const target = attention.find((p) => p.episodeId === episodeId);
      if (!target) return json(res, 404, { error: `해결할 문제가 있는 패키지(${episodeId})를 찾을 수 없습니다.` });
      const accessToken = await getAccessToken();
      const result = await resolveAttention({ pkgDir: target.pkgDir, action, accessToken });
      return json(res, result.ok ? 200 : 502, result.ok ? { ok: true } : { error: result.error });
    }
    if (url.pathname === '/api/schedule/upload-now' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const { episodeId, force } = body;
      if (!episodeId) return json(res, 400, { error: 'episodeId가 필요합니다.' });

      if (isUploadWorkerRunning) {
        return json(res, 409, { error: '현재 다른 동영상 업로드가 진행 중입니다. 잠시 후 다시 시도해 주세요.' });
      }

      const accessToken = await getAccessToken();
      if (!accessToken) return json(res, 401, { error: 'YouTube 채널 재연동(로그인)이 필요합니다.' });

      const rules = await loadPublishRules(publishRulesPath);

      isUploadWorkerRunning = true;
      try {
        const context = await loadUploadContext({ accessToken, checkChannel: true });
        const decision = decideNextUpload({ ...context, rules, episodeId, force: force === true });
        if (!decision.ok) {
          if (decision.code === 'duplicate') await getEpisodesSummary(true);
          return json(res, 409, { error: decision.reason, code: decision.code });
        }

        const result = await processQueueItem({ item: decision.item, accessToken, rules });
        if (result.success) {
          await finishSuccessfulUpload(decision.item.episodeId, result.videoId);
          return json(res, 200, { ok: true, result });
        } else {
          return json(res, 500, { error: result.error });
        }
      } finally {
        isUploadWorkerRunning = false;
      }
    }
    if (url.pathname === '/api/catalog') {
      const catalog = await loadJson(catalogPath);
      if (!catalog) return json(res, 404, {error: '저장된 YouTube 카탈로그가 없습니다. 먼저 /api/sync를 실행하세요.'});
      return json(res, 200, catalog);
    }
    if (url.pathname === '/api/insights/list') {
      const reports = [];
      if (existsSync(outputInsightsDir)) {
        const files = await readdir(outputInsightsDir);
        for (const file of files) {
          if (!file.endsWith('.md')) continue;
          try {
            const stat = await readFile(join(outputInsightsDir, file), 'utf8');
            const titleMatch = stat.match(/^# 📊 아웃라이어 영상 댓글 분석 리포트:\s*(.+)$/m);
            const dateMatch = stat.match(/분석 일자\*\*:\s*([0-9-]+)/);
            const channelMatch = stat.match(/채널명\*\*:\s*([^\n|]+)/);
            const typeMatch = stat.match(/분석 유형\*\*:\s*([^\n]+)/);
            const channelName = channelMatch ? channelMatch[1].trim() : '';
            const isMyChannel = channelName.includes('이해하면 쉬운') || (typeMatch && typeMatch[1].includes('우리 채널')) || file.includes('5MiM1tIpQ');
            reports.push({
              file,
              title: titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, ''),
              date: dateMatch ? dateMatch[1] : '',
              channelName,
              isMyChannel,
            });
          } catch {}
        }
      }
      const marketDemand = await loadJson(marketDemandPath);
      return json(res, 200, {
        ok: true,
        reports: reports.reverse(),
        marketDemandKeywords: marketDemand?.byKeyword || [],
      });
    }
    if (url.pathname === '/api/insights/report') {
      const file = url.searchParams.get('file');
      if (!file || file.includes('..') || !file.endsWith('.md')) return json(res, 400, {error: '올바른 리포트 파일명이 아닙니다.'});
      const filePath = join(outputInsightsDir, file);
      if (!existsSync(filePath)) return json(res, 404, {error: '리포트 파일을 찾을 수 없습니다.'});
      const content = await readFile(filePath, 'utf8');
      return json(res, 200, {ok: true, file, content});
    }
    if (url.pathname === '/api/insights/analyze' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const ytKey = process.env.YOUTUBE_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!ytKey || ytKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
        return json(res, 400, {error: '.env 파일에 YOUTUBE_API_KEY 설정이 필요합니다.'});
      }
      if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return json(res, 400, {error: '.env 파일에 GEMINI_API_KEY 설정이 필요합니다.'});
      }

      let targetVideoIds = [];
      const directId = extractVideoId(body.url || body.videoId);
      if (directId) {
        targetVideoIds.push(directId);
      } else if (body.keyword) {
        const md = await loadJson(marketDemandPath);
        const entry = md?.byKeyword?.find((k) => k.keyword.includes(body.keyword) || body.keyword.includes(k.keyword));
        if (entry?.topOutliers?.length) {
          targetVideoIds = entry.topOutliers.map((o) => o.videoId).filter(Boolean);
        }
        if (!targetVideoIds.length) {
          return json(res, 404, {error: `'${body.keyword}' 키워드의 아웃라이어 영상을 market-demand.json에서 찾지 못했습니다.`});
        }
      }

      if (!targetVideoIds.length) {
        return json(res, 400, {error: '분석할 영상 URL이나 키워드가 필요합니다.'});
      }

      const results = [];
      const failed = [];
      for (const vid of targetVideoIds.slice(0, 3)) {
        try {
          const result = await outlierReportQueue.enqueue(
            `comment:${vid}`,
            () => runSingleCommentReport(vid, ytKey, geminiKey),
            {priority: 'high'},
          ).promise;
          if (result) results.push(result);
        } catch (err) {
          console.error(`Error analyzing video ${vid}:`, err.message);
          failed.push({videoId: vid, error: err.message});
        }
      }

      // 모두 실패했으면 성공처럼 보이지 않게 오류로 돌려준다.
      if (results.length === 0 && failed.length > 0) {
        return json(res, 502, {error: `분석에 실패했습니다: ${failed[0].error}`, failed});
      }
      return json(res, 200, {ok: true, results, count: results.length, failed});
    }
    if (url.pathname === '/api/scripts/list') {
      const reports = [];
      if (existsSync(outputScriptInsightsDir)) {
        const files = await readdir(outputScriptInsightsDir);
        for (const file of files) {
          if (!file.endsWith('.md')) continue;
          try {
            const stat = await readFile(join(outputScriptInsightsDir, file), 'utf8');
            const titleMatch = stat.match(/^# 📜 아웃라이어 영상 대본·스크립트 역설계 리포트:\s*(.+)$/m);
            const dateMatch = stat.match(/분석 일자\*\*:\s*([0-9-]+)/);
            const channelMatch = stat.match(/채널명\*\*:\s*([^\n|]+)/);
            const typeMatch = stat.match(/분석 유형\*\*:\s*([^\n]+)/);
            const channelName = channelMatch ? channelMatch[1].trim() : '';
            const isMyChannel = channelName.includes('이해하면 쉬운') || (typeMatch && typeMatch[1].includes('우리 채널')) || file.includes('5MiM1tIpQ');
            reports.push({
              file,
              title: titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, ''),
              date: dateMatch ? dateMatch[1] : '',
              channelName,
              isMyChannel,
            });
          } catch {}
        }
      }
      return json(res, 200, { ok: true, reports: reports.reverse() });
    }
    if (url.pathname === '/api/scripts/report') {
      const file = url.searchParams.get('file');
      if (!file || file.includes('..') || !file.endsWith('.md')) return json(res, 400, {error: '올바른 리포트 파일명이 아닙니다.'});
      const filePath = join(outputScriptInsightsDir, file);
      if (!existsSync(filePath)) return json(res, 404, {error: '리포트 파일을 찾을 수 없습니다.'});
      const content = await readFile(filePath, 'utf8');
      return json(res, 200, {ok: true, file, content});
    }
    if (url.pathname === '/api/scripts/analyze' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const ytKey = process.env.YOUTUBE_API_KEY;
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!ytKey || ytKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
        return json(res, 400, {error: '.env 파일에 YOUTUBE_API_KEY 설정이 필요합니다.'});
      }
      if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return json(res, 400, {error: '.env 파일에 GEMINI_API_KEY 설정이 필요합니다.'});
      }
      const vid = extractVideoId(body.url || body.videoId);
      if (!vid) return json(res, 400, {error: '올바른 유튜브 URL 또는 영상 ID가 필요합니다.'});
      try {
        const result = await outlierReportQueue.enqueue(
          `script:${vid}`,
          () => runSingleScriptReport(vid, {ytKey, geminiKey}),
          {priority: 'high'},
        ).promise;
        return json(res, 200, {ok: true, result});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/sync' && (req.method === 'POST' || req.method === 'GET')) {
      const accessToken = await getAccessToken();
      if (!accessToken) return json(res, 401, {error: 'YouTube 채널 재연동(로그인)이 필요합니다.'});
      try {
        const dashboard = await getFullDashboardData(true);
        // 업로드 패키징(에피소드 탭)도 이 자리에서 같이 강제 새로고침한다 — 안 그러면
        // getEpisodesSummary()의 60초 메모리 캐시가 이 동기화 직후의 /api/episodes/summary
        // 요청까지 그대로 막아서, 방금 예약 건 영상의 videoId가 패키징 카드에 반영이 안 되는
        // 버그가 있었다(2026-09-11 확인 — "동기화해도 업로드 패키징에 안 나타남").
        await getEpisodesSummary(true);
        // 그 새로고침된 패키지 상태를 아이디어 보드 이력에도 반영한다 — 안 그러면 예약·공개까지
        // 끝난 에피소드도 "🔄 이미 진행 중" 배지에 계속 머물러 있는 버그가 있었다(2026-09-11
        // 확인 — "예약까지 했는데 이미 진행중이라는 배지를 달음").
        await syncIdeaBoardHistoryFromPackages();
        // 7일 판정 → 경쟁 채널 상태 반영을 동기화마다 자동으로 돌린다(2026-11-11, 자동화 우선 원칙).
        // 전에는 경쟁 탭의 "D+7 자율 순환" 버튼을 눌러야만 돌았다. 실패해도 동기화 자체는 성공으로 둔다.
        let d7 = null;
        try {
          // 판정 재료: 공개 10일이 지난 영상의 "공개 후 첫 7일 조회수"를 아직 안 받은 것만 받아 쌓는다(분석 API, 할당량 부담 없음).
          const views7dFile = views7dPath(projectDir);
          const views7dStore = await loadJson(views7dFile, {schemaVersion: 1, videos: {}});
          const catalogForViews = await loadJson(catalogPath, {videos: []});
          const todo = videosNeedingViews7d(catalogForViews.videos || [], views7dStore.videos || {}, new Date()).slice(0, 40);
          for (const v of todo) {
            const window7 = sevenDayWindow(v.publishedAt);
            try {
              const report = await analyticsQuery(accessToken, {...window7, metrics: 'views', filters: `video==${v.videoId}`});
              const views7d = Number(report.rows?.[0]?.[0] ?? 0);
              views7dStore.videos[v.videoId] = {views7d, ...window7, format: v.format || null, fetchedAt: new Date().toISOString()};
            } catch (err) {
              // 한 편이 실패해도 나머지는 계속 받는다. 실패한 편은 다음 동기화 때 다시 시도된다.
            }
          }
          if (todo.length) {
            views7dStore.updatedAt = new Date().toISOString();
            await saveJson(views7dFile, views7dStore);
          }
          const marketDemand = await loadJson(marketDemandPath);
          if (marketDemand) {
            const catalog = await loadJson(catalogPath, {videos: []});
            const now = new Date();
            const outcomes = loadEpisodeOutcomes(projectDir, now);
            const result = runD7AutonomousCycle({
              marketDemandData: marketDemand,
              analyticsData: dashboard,
              episodeOutcomes: outcomes,
              catalogVideos: catalog.videos || catalog,
              plannedSources: loadPlannedSources(projectDir),
              outlierReports: loadOutlierReportChannels(projectDir),
              now,
            });
            await saveJson(marketDemandPath, result.marketDemandData);
            if (result.orphanedVideoIds?.length) {
              await cascadeDeleteOrphanedVideoData(result.orphanedVideoIds);
            }
            memoryMarketDemand = null;
            lastMarketDemandTime = 0;
            // "통함" 판정은 통한 요소 기록에 자동 기록(2026-11-11). 사람·Claude가 적은 훅·비유는 지우지 않는다.
            const patterns = recordSuccessPatterns(await loadJson(successPatternsPath, {schemaVersion: 1, entries: []}), outcomes, now);
            if (patterns.added.length || patterns.changed.length) await saveJson(successPatternsPath, patterns.store);
            d7 = {
              applied: result.applied.length,
              hold: result.marketDemandData.d7AutonomousCycle.holdCount,
              retiredKeywords: (result.retiredKeywords || []).length,
              cleanedVideos: (result.orphanedVideoIds || []).length,
              patternsAdded: patterns.added.length,
              patternsChanged: patterns.changed.length,
            };
          }
        } catch (err) {
          d7 = {error: err.message};
        }
        return json(res, 200, {ok: true, sync: dashboard.sync, channel: dashboard.channel, d7});
      } catch (err) {
        return json(res, err.status || 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/matrix/data') {
      const ctrThreshold = url.searchParams.get('ctrThreshold');
      const retentionThresholdLong = url.searchParams.get('retentionThresholdLong');
      const retentionThresholdShorts = url.searchParams.get('retentionThresholdShorts');

      const dashboardData = await getFullDashboardData();
      if (!dashboardData) return json(res, 401, {error: 'YouTube 채널 데이터가 없습니다.'});

      const matrix = buildMatrixDataset(dashboardData, {
        ctrThreshold: ctrThreshold ? Number(ctrThreshold) : undefined,
        retentionThresholdLong: retentionThresholdLong ? Number(retentionThresholdLong) : undefined,
        retentionThresholdShorts: retentionThresholdShorts ? Number(retentionThresholdShorts) : undefined,
      });

      return json(res, 200, matrix);
    }
    // ---- 실제 검색 피드 & 잘된 썸네일 (2026-11-11, 예전 A/B 시뮬레이터·AI CTR 예측기 대체) ----
    // 패키지 목록: 아직 공개 안 된 편 먼저, 그다음 최근 공개 편. 썸네일 파일과 검색어 후보를 함께 준다.
    if (url.pathname === '/api/thumb-feed/packages') {
      const packagesDir = join(projectDir, 'output', 'upload-packages');
      const dirs = existsSync(packagesDir) ? (await readdir(packagesDir, {withFileTypes: true})).filter((d) => d.isDirectory()) : [];
      const items = [];
      for (const d of dirs) {
        const dir = join(packagesDir, d.name);
        const isShorts = existsSync(join(dir, 'shorts-status.json'));
        const status = await loadJson(join(dir, isShorts ? 'shorts-status.json' : 'status.json'), {});
        const files = await readdir(dir).catch(() => []);
        const thumbs = files.filter((f) => /^thumbnail[\w-]*\.(jpg|jpeg|png)$/i.test(f)).sort((a, b) => (a === 'thumbnail.jpg' ? -1 : b === 'thumbnail.jpg' ? 1 : a.localeCompare(b)));
        if (!thumbs.length) continue;
        const title = existsSync(join(dir, 'title.txt')) ? (await readFile(join(dir, 'title.txt'), 'utf8')).split(/\r?\n/)[0].trim() : d.name;
        const tags = existsSync(join(dir, 'tags.txt')) ? (await readFile(join(dir, 'tags.txt'), 'utf8')).split(/[,\n]/) : [];
        items.push({
          name: d.name,
          title,
          format: isShorts ? 'SHORTS' : 'LONGFORM',
          status: status.status || 'packaged',
          when: status.publishedAt || status.scheduledFor || null,
          thumbnails: thumbs.map((f) => ({file: f, url: '/api/upload-package-asset/' + encodeURIComponent(d.name) + '/' + encodeURIComponent(f)})),
          queries: pickSearchQueries(tags, title),
        });
      }
      items.sort((a, b) => (a.status === 'published') - (b.status === 'published') || String(b.when || '').localeCompare(String(a.when || '')));
      return json(res, 200, {ok: true, packages: items});
    }
    // 실제 한국 유튜브 검색 결과(하루 캐시) + 잘된 썸네일(검색 결과 중 구독자 대비 조회 배수 순, 경쟁 채널 아웃라이어).
    if (url.pathname === '/api/thumb-feed') {
      const query = String(url.searchParams.get('query') || '').trim().slice(0, 80);
      const format = url.searchParams.get('format') === 'SHORTS' ? 'SHORTS' : 'LONGFORM';
      try {
        const feed = await fetchSearchFeed({query, format, apiKey: process.env.YOUTUBE_API_KEY, cachePath: join(youtubeDataDir, 'thumb-feed-cache.json')});
        const md = await loadJson(marketDemandPath, {trackedChannels: []});
        const outliers = (md.trackedChannels || [])
          .filter((c) => c.status !== 'blocked')
          .flatMap((c) => (c.topOutliers || []).map((o) => ({...o, channelTitle: o.channelTitle || c.channelTitle})))
          .filter((o) => o.videoId && (format === 'SHORTS') === (o.isShort === true))
          .sort((a, b) => ratioTier(a) - ratioTier(b) || (Number(b.outlierRatio) || 0) - (Number(a.outlierRatio) || 0))
          .slice(0, 12)
          .map((o) => ({videoId: o.videoId, title: o.title, channelTitle: o.channelTitle, views: o.viewCount || null, outlierRatio: o.outlierRatio, ratioLabel: formatRatioLabel(o),
            // 비교용이라 늘 큰 크기(hqdefault 480px) — 저장된 작은 미리보기는 흐려서 우리 썸네일만 선명해 보였다(2026-11-11)
            thumbnail: 'https://i.ytimg.com/vi/' + o.videoId + '/hqdefault.jpg'}));
        return json(res, 200, {
          ok: true,
          query: feed.query, format, fetchedAt: feed.fetchedAt, fromCache: feed.fromCache,
          feed: feed.items.filter((x) => (format === 'SHORTS') === x.isShort),
          winners: rankWinners(feed.items, {format, ourChannelId: OUR_CHANNEL_ID}),
          competitorOutliers: outliers,
        });
      } catch (err) {
        return json(res, 502, {error: err.message});
      }
    }
    if (url.pathname === '/api/knowledge-db') {
      const [audienceDna, successPatterns] = await Promise.all([
        loadJson(audienceDnaPath, {schemaVersion: 1, entries: []}),
        loadJson(successPatternsPath, {schemaVersion: 1, entries: []}),
      ]);
      return json(res, 200, {ok: true, audienceDna, successPatterns});
    }
    // 이 GET 자체는 읽기 전용 — 실제 제작으로 이어진 소재의 영구 이력. state와 별도 파일이라
    // "🔄 후보 5개 생성"이 새 후보를 뽑아도 지워지지 않는다. 기록을 쓰는 쪽은 바로 아래
    // /history/register.
    if (url.pathname === '/api/idea-board/history' && req.method === 'GET') {
      try {
        const history = await loadJson(ideaBoardHistoryPath, {schemaVersion: 1, entries: []});
        return json(res, 200, history || {schemaVersion: 1, entries: []});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    // "이 주제로 진행 →" 버튼을 누르는 즉시 호출된다(2026-09-07) — 예전엔 영상이 완전히
    // 제작·예약된 뒤에야 사람이 수동으로 이 파일을 채워서, 선택 시점과 기록 시점 사이(길면
    // 며칠)에 후보를 다시 생성하면 같은 소재가 또 추천될 수 있었다. topic 문자열을 키로
    // upsert하므로, 이후 대본/렌더/예약 단계에서 같은 topic으로 다시 이 엔드포인트나 파일을
    // 직접 갱신하면(episodeSlug/episodeLabel/status/producedAt 채우기) 새로 안 늘어나고
    // 같은 항목이 업데이트된다.
    if (url.pathname === '/api/idea-board/history/register' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const topic = String(body.topic || '').trim();
        if (!topic) return json(res, 400, {error: 'topic이 필요합니다.'});
        const history = await loadJson(ideaBoardHistoryPath, {schemaVersion: 1, entries: []});
        const now = new Date().toISOString();
        const idx = history.entries.findIndex((e) => String(e.topic || '').trim() === topic);
        const prev = idx !== -1 ? history.entries[idx] : null;
        // ⚠️ episodeSlug/episodeLabel/status/producedAt는 예전엔 body 값을 읽지 않고 무조건
        // prev(이전 저장값) 또는 null만 넣었다 — 바로 위 주석은 "대본/렌더/예약 단계에서 이
        // 엔드포인트를 다시 호출하면 갱신된다"고 적혀 있었지만 실제 코드는 그걸 절대 반영하지
        // 못하는 상태였다(2026-09-20 확인 — EP19가 실제로 업로드·예약까지 끝났는데도 이 값들이
        // 전부 비어 있어서, status.json 동기화를 아무리 고쳐도 아이디어 카드까지는 못 이어졌다).
        // body에 값이 오면 그걸 우선하고, 없을 때만 이전 값을 유지하도록 고침.
        const entry = {
          topic,
          angleOrHook: body.angleOrHook || prev?.angleOrHook || '',
          targetAudience: body.targetAudience || prev?.targetAudience || '',
          rank: body.rank ?? prev?.rank ?? null,
          score: body.score ?? prev?.score ?? null,
          dataSourceRefs: body.dataSourceRefs || prev?.dataSourceRefs || [],
          episodeSlug: body.episodeSlug || prev?.episodeSlug || null,
          episodeLabel: body.episodeLabel || prev?.episodeLabel || null,
          status: body.status || prev?.status || 'selected',
          selectedAt: prev?.selectedAt || now,
          producedAt: body.producedAt || prev?.producedAt || null,
        };
        if (idx !== -1) history.entries[idx] = entry; else history.entries.push(entry);
        history.schemaVersion = history.schemaVersion || 1;
        history.updatedAt = now;
        await saveJson(ideaBoardHistoryPath, history);
        return json(res, 200, {ok: true, entries: history.entries});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/logout') {
      if (existsSync(tokenPath)) await unlink(tokenPath);
      return redirect(res, '/');
    }
    json(res, 404, {error: 'Not found'});
  } catch (error) {
    console.error(error.message);
    json(res, error.status || 500, {error: error.message});
  }
});

const studioWatcher = startStudioWatcher({
  downloadsDir,
  studioExportDir,
  onIngest: async (event) => {
    console.log('[Studio Auto-Ingest Event]', event);
    try {
      const catalog = await loadJson(catalogPath);
      const packaging = await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
      const scanResult = await scanStudioExportFolders(catalog?.videos || [], packaging);
      const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
      if (memoryDashboardCache) {
        memoryDashboardCache.studioFolderScan = scanResult;
        memoryDashboardCache.videoReachManual = reach;
      }
      notifyClients('studio-updated', { event, scan: scanResult, videoReachManual: reach });
    } catch (err) {
      console.error('[Studio Auto-Ingest Handler Error]', err);
    }
  },
});

async function getRecentUploadHistory() {
  if (!existsSync(globalUploadPackagesDir)) return [];
  const entries = await readdir(globalUploadPackagesDir, { withFileTypes: true });
  const history = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const sPath = join(globalUploadPackagesDir, ent.name, 'status.json');
    if (existsSync(sPath)) {
      try {
        const s = JSON.parse(await readFile(sPath, 'utf8'));
        // 스튜디오 수동 업로드 및 자동 업로드 일시를 통합 반영
        const dt = s.uploadedAt || (s.status === 'scheduled' ? s.lastSyncedAt : null) || (s.status === 'published' ? s.publishedAt : null);
        if (dt) {
          history.push({ uploadedAt: dt, videoId: s.videoId, episodeId: ent.name });
        }
      } catch {}
    }
  }
  return history;
}

async function getLatestScheduledDate() {
  if (!existsSync(globalUploadPackagesDir)) return null;
  const entries = await readdir(globalUploadPackagesDir, { withFileTypes: true });
  let latest = null;
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const sPath = join(globalUploadPackagesDir, ent.name, 'status.json');
    if (existsSync(sPath)) {
      try {
        const s = JSON.parse(await readFile(sPath, 'utf8'));
        const dt = s.scheduledFor || (s.status === 'published' ? s.publishedAt : null);
        if (dt && (!latest || new Date(dt) > new Date(latest))) {
          latest = dt;
        }
      } catch {}
    }
  }
  return latest;
}

let isUploadWorkerRunning = false;
async function fetchConnectedChannel(accessToken) {
  try {
    const data = await googleGet('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', accessToken);
    const channel = data.items?.[0];
    return channel ? { id: channel.id, title: channel.snippet?.title || '' } : null;
  } catch (err) {
    console.warn('[Auto-Upload] 연동 채널 조회 실패:', err.message);
    return null;
  }
}

// 화면을 열 때마다 유튜브를 호출하지 않도록 토큰이 같으면 저장해 둔 값을 쓴다. 실패는 저장하지 않는다.
let connectedChannelMemo = { accessToken: null, channel: null };
async function getConnectedChannel(accessToken, { fresh = false } = {}) {
  if (!fresh && connectedChannelMemo.accessToken === accessToken && connectedChannelMemo.channel) return connectedChannelMemo.channel;
  const channel = await fetchConnectedChannel(accessToken);
  connectedChannelMemo = { accessToken, channel };
  return channel;
}

// 영상은 이미 올라간 뒤다. 여기서 오류가 나도 업로드 실패로 보고하면 사람이 다시 누르게 되므로 삼키고 기록만 한다.
async function finishSuccessfulUpload(episodeId, videoId) {
  try {
    await getEpisodesSummary(true);
    await syncIdeaBoardHistoryFromPackages();
    notifyClients('schedule-updated', { episodeId, videoId });
  } catch (err) {
    console.warn(`[Auto-Upload] 업로드 뒤 정리 오류 (${episodeId}, 영상은 올라갔음):`, err.message);
  }
}

// 자동 업로드와 수동 버튼, 화면 표시가 같은 정보로 판단하도록 한곳에서 모은다.
// checkChannel은 실제로 올리기 직전에만 켠다. 화면을 열 때마다 유튜브를 호출하지 않기 위해서다.
async function loadUploadContext({ accessToken = null, checkChannel = false } = {}) {
  const [token, readyPackages, attention, latestScheduledDate, recentUploadHistory] = await Promise.all([
    loadToken(),
    scanReadyPackages(globalUploadPackagesDir),
    scanPackagesNeedingAttention(globalUploadPackagesDir),
    getLatestScheduledDate(),
    getRecentUploadHistory(),
  ]);
  let existingUploads = null;
  if (checkChannel && accessToken) {
    try {
      existingUploads = await getRecentUploadsForMatching(accessToken, { fresh: true });
    } catch (err) {
      console.warn('[Auto-Upload] 채널 업로드 목록 조회 실패:', err.message);
    }
  }
  const connectedChannel = accessToken ? await getConnectedChannel(accessToken, { fresh: checkChannel }) : null;
  return { hasScope: hasUploadScope(token?.scope), connectedChannel, readyPackages, attention, latestScheduledDate, recentUploadHistory, existingUploads };
}

let lastAutoUploadWaitReason = null;
async function runAutoUploadCheck() {
  if (isUploadWorkerRunning) return;
  isUploadWorkerRunning = true;
  try {
    const rules = await loadPublishRules(publishRulesPath);
    if (!rules.autoUploadEnabled) return;

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const context = await loadUploadContext({ accessToken, checkChannel: true });
    const decision = decideNextUpload({ ...context, rules });
    if (!decision.ok) {
      if (decision.code === 'duplicate') await getEpisodesSummary(true);
      if (decision.reason !== lastAutoUploadWaitReason) console.log(`[Auto-Upload] 대기: ${decision.reason}`);
      lastAutoUploadWaitReason = decision.reason;
      return;
    }
    lastAutoUploadWaitReason = null;

    const target = decision.item;
    console.log(`[Auto-Upload] 자동 예약 업로드 실행: ${target.episodeId} -> ${target.scheduledFor}`);
    const res = await processQueueItem({ item: target, accessToken, rules });
    if (res.success) {
      console.log(`[Auto-Upload] 업로드 완료: ${target.episodeId} (videoId: ${res.videoId})`);
      for (const warning of res.warnings || []) console.warn(`[Auto-Upload] 주의: ${target.episodeId}: ${warning}`);
      await finishSuccessfulUpload(target.episodeId, res.videoId);
    } else {
      console.warn(`[Auto-Upload] 업로드 실패: ${target.episodeId}: ${res.error}`);
    }
  } catch (err) {
    console.error('[Auto-Upload] 주기적 점검 오류:', err.message);
  } finally {
    isUploadWorkerRunning = false;
  }
}
setInterval(runAutoUploadCheck, 5 * 60 * 1000).unref();

server.listen(port, '127.0.0.1', () => {
  console.log(`YouTube Channel Lab: http://localhost:${port}`);
  console.log(`OAuth callback: ${redirectUri}`);
  console.log(`Downloads Auto-Ingest: watching ${downloadsDir}`);
  if (requiredMissing.length) console.log(`Missing env: ${requiredMissing.join(', ')}`);
});
