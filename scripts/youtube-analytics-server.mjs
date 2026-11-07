import {createServer} from 'node:http';
import {readFile, writeFile, unlink, mkdir, readdir, rename, stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exec, execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {build48hEvaluations} from './evaluate-48h.mjs';
import {
  extractVideoId,
  fetchVideoDetails,
  fetchComments,
  analyzeCommentsWithGemini,
  generateMarkdownReport,
  formatInsightText,
} from './analyze-outlier-comments.mjs';
import { analyzeSingleScript } from './analyze-competitor-script.mjs';
import { startStudioWatcher } from './studio-auto-ingest.mjs';
import { getMockCompetitorVideos, evaluateThumbnailTitleVariants, generateAiThumbnailImage, buildThumbnailPrompt, hasPresenterReference, tempThumbDir, persistGeneratedImage } from './ab-simulator.mjs';
import { buildMatrixDataset, diagnoseVideoWithGemini } from './matrix-diagnosis.mjs';
import { lintBrandScript } from './brand-script-linter.mjs';
import { generateTopicCandidates } from './idea-board.mjs';
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
} from './youtube-publisher.mjs';
import { attachShortsPackages, selectPackageVideo, shortsPackageEpisode } from './upload-package-summary.mjs';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(projectDir, '.env');
const tokenPath = join(projectDir, '.youtube-oauth-token.json');
const videoMapPath = join(projectDir, '.youtube-video-map.json');
const youtubeDataDir = join(projectDir, 'data', 'youtube');
const catalogPath = join(youtubeDataDir, 'catalog.json');
const latestSnapshotPath = join(youtubeDataDir, 'analytics-latest.json');
const snapshotDir = join(youtubeDataDir, 'snapshots');
const commentsPath = join(youtubeDataDir, 'comments.json');
const evaluationsPath = join(youtubeDataDir, 'evaluations-48h.json');
const packagingRegistryPath = join(youtubeDataDir, 'packaging-registry.json');
const videoReachManualPath = join(youtubeDataDir, 'video-reach-manual.json');
const outputCommentsDir = join(youtubeDataDir, 'outlier-comments');
const outputInsightsDir = join(projectDir, 'output', 'insights');
const outputScriptInsightsDir = join(projectDir, 'output', 'script-insights');
const marketDemandPath = join(youtubeDataDir, 'market-demand.json');
const contentOpportunityPath = join(youtubeDataDir, 'content-opportunity.json');
const audienceDnaPath = join(youtubeDataDir, 'audience-dna.json');
const analysisFailuresPath = join(youtubeDataDir, 'analysis-failures.json');
const successPatternsPath = join(youtubeDataDir, 'success-patterns.json');
const ideaBoardStatePath = join(youtubeDataDir, 'idea-board-state.json');
// 아이디어 보드가 고른 소재가 실제로 에피소드까지 이어졌는지 기록하는 영구 이력 — idea-board-state.json은
// "지금 화면에 뭐가 떠 있나"만 담는 임시 상태라 새 후보 5개를 생성하면 이전 선택이 흔적 없이 사라진다
// (2026-09-04, 사용자 지적: "선택해서 공개 예약까지 했으면 뭔가 표시가 있어야 하지 않냐"). 이 파일은
// 별도로 두고 덮어쓰지 않는다 — 실제 제작이 확정된 소재만 수동으로 기록한다.
const ideaBoardHistoryPath = join(youtubeDataDir, 'idea-board-history.json');
const publishRulesPath = join(youtubeDataDir, 'publish-rules.json');
const globalUploadPackagesDir = join(projectDir, 'output', 'upload-packages');
// Gemini 호출 없이 대화창에서 직접(Claude가) 작성한 아이디어 초안을 대시보드로 가져오는 창구
// (2026-09-13, 사용자 요청: "버튼을 만들어 클릭하면 네가 아이디어 화면에 출력할 수 있어?" —
// Gemini 월간 지출 한도 초과로 API 호출이 막혔을 때를 위함). 대시보드 버튼 자체가 Claude를
// 호출할 방법은 없으므로, Claude가 대화 중에 이 파일을 직접 써 두면(generateTopicCandidates()와
// 동일한 candidates 스키마) 대시보드의 "✍️ Claude 초안 불러오기" 버튼이 그 파일을 읽어와서
// 정상적인 AI 생성 결과와 똑같은 방식으로 화면에 띄운다.
const ideaBoardManualDraftPath = join(youtubeDataDir, 'idea-board-manual-draft.json');
const abSimulatorStatePath = join(youtubeDataDir, 'ab-simulator-state.json');
const AUDIENCE_DNA_MAX_ENTRIES = 300;
const SUCCESS_PATTERNS_MAX_ENTRIES = 300;
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

const loadVideoMap = async () => {
  if (!existsSync(videoMapPath)) return {};
  try {
    return JSON.parse(await readFile(videoMapPath, 'utf8'));
  } catch {
    return {};
  }
};

const saveVideoMap = async (map) => {
  await writeFile(videoMapPath, JSON.stringify(map, null, 2), 'utf8');
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

const resolveVideoFormat = (video, shortsIds) => {
  if (shortsIds && video.privacyStatus === 'public') return shortsIds.has(video.videoId) ? 'SHORTS' : 'LONGFORM';
  const seconds = Number(video.durationSeconds || 0);
  return seconds > 0 && seconds <= 60 ? 'SHORTS' : 'LONGFORM';
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

const saveJson = async (path, value) => {
  await mkdir(youtubeDataDir, {recursive: true});
  await writeFile(path, JSON.stringify(value, null, 2), 'utf8');
};

const loadJson = async (path, fallback = null) => {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
};

const normalizeDnaText = (text) => String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');

// entries: [{type, text, videoId, channelTitle, sourceType}]
const upsertAudienceDna = async (newEntries) => {
  if (!newEntries?.length) return;
  const store = await loadJson(audienceDnaPath, { schemaVersion: 1, entries: [] });
  const byKey = new Map(store.entries.map((e) => [`${e.type}:${normalizeDnaText(e.text)}`, e]));
  const now = new Date().toISOString();

  for (const raw of newEntries) {
    const text = String(raw.text || '').trim();
    if (!text) continue;
    const key = `${raw.type}:${normalizeDnaText(text)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.occurrences = (existing.occurrences || 1) + 1;
      existing.lastSeenAt = now;
      if (raw.videoId && !existing.sources.some((s) => s.videoId === raw.videoId)) {
        existing.sources.push({ videoId: raw.videoId, channelTitle: raw.channelTitle || '', sourceType: raw.sourceType || '' });
        if (existing.sources.length > 10) existing.sources = existing.sources.slice(-10);
      }
    } else {
      byKey.set(key, {
        id: key,
        type: raw.type,
        text,
        occurrences: 1,
        sources: raw.videoId ? [{ videoId: raw.videoId, channelTitle: raw.channelTitle || '', sourceType: raw.sourceType || '' }] : [],
        firstSeenAt: now,
        lastSeenAt: now,
      });
    }
  }

  const entries = [...byKey.values()]
    .sort((a, b) => (b.occurrences - a.occurrences) || (new Date(b.lastSeenAt) - new Date(a.lastSeenAt)))
    .slice(0, AUDIENCE_DNA_MAX_ENTRIES);

  await saveJson(audienceDnaPath, { schemaVersion: 1, updatedAt: now, entries });
};

// 댓글/대본 분석이 실패해도 그 사실이 어디에도 안 남아서, 시장 수요 레이더로 돌아가면 버튼이
// 분석 전과 똑같아 보여 사용자가 (예: 자막이 꺼진 영상인 줄 모르고) 같은 영상을 또 눌러보게
// 되는 문제가 있었다(2026-09-07, 사용자 지적). 성공 리포트 파일 유무만 보던 것과 별개로,
// 마지막 실패 사유도 videoId 기준으로 기록해 카드에 경고로 보여준다. 실패가 영구적인지
// (자막 꺼짐) 일시적인지(API 오류 등) 우리가 단정할 수 없으므로 버튼 자체를 막지는 않고,
// "이전에 실패했다"는 경고만 얹어서 재시도 여부는 사용자가 판단하게 한다.
const recordAnalysisFailure = async (videoId, kind, message) => {
  if (!videoId || !message) return;
  const store = await loadJson(analysisFailuresPath, { schemaVersion: 1, entries: {} });
  store.entries[videoId] = { ...store.entries[videoId], [kind]: { message, failedAt: new Date().toISOString() } };
  await saveJson(analysisFailuresPath, store);
};

const clearAnalysisFailure = async (videoId, kind) => {
  if (!videoId) return;
  const store = await loadJson(analysisFailuresPath, { schemaVersion: 1, entries: {} });
  if (store.entries[videoId]?.[kind]) {
    delete store.entries[videoId][kind];
    if (Object.keys(store.entries[videoId]).length === 0) delete store.entries[videoId];
    await saveJson(analysisFailuresPath, store);
  }
};

// 시장 수요 레이더에서 키워드 전체(또는 영상 하나)를 지울 때 공통으로 쓰는 "고아 데이터 청소"
// 로직(2026-09-13). 호출부가 이미 market-demand.json에서 해당 videoId를 뺀 뒤, "이 videoId를
// 아직도 참조하는 키워드가 남아있는지" 확인해서 orphanedVideoIds만 여기로 넘겨준다 — 이 함수는
// 그 확인을 하지 않고 넘어온 목록을 그대로 지운다(호출부 책임).
const cascadeDeleteOrphanedVideoData = async (orphanedVideoIds) => {
  let deletedReportFiles = 0;
  let removedDnaEntries = 0;
  if (!orphanedVideoIds.length) return {deletedReportFiles, removedDnaEntries};

  for (const vid of orphanedVideoIds) {
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

  return {deletedReportFiles, removedDnaEntries};
};

// entry: {videoId, title, ctr, retentionRate, coreSuccessFactor, reusableHook, reusableAnalogy}
const upsertSuccessPatterns = async (entry) => {
  if (!entry?.videoId) return;
  const store = await loadJson(successPatternsPath, { schemaVersion: 1, entries: [] });
  const now = new Date().toISOString();
  const byId = new Map(store.entries.map((e) => [e.id, e]));
  byId.set(entry.videoId, { id: entry.videoId, ...entry, diagnosedAt: now });

  const entries = [...byId.values()]
    .sort((a, b) => new Date(b.diagnosedAt) - new Date(a.diagnosedAt))
    .slice(0, SUCCESS_PATTERNS_MAX_ENTRIES);

  await saveJson(successPatternsPath, { schemaVersion: 1, updatedAt: now, entries });
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

const inferClassifications = (videos, savedMap) => {
  const map = Object.fromEntries(Object.entries(savedMap || {}).map(([id, value]) => [id, {
    ...value,
    category: value.category || (value.season ? 'SEASON' : 'OTHER'),
    source: value.source || 'manual',
  }]));
  const dated = videos.map((video) => ({...video, time: Date.parse(video.publishedAt || '') || 0}));
  const manuallyPlanned = dated.filter((video) => map[video.videoId]?.source !== 'auto' && map[video.videoId]?.season);
  const plannedStart = manuallyPlanned.length ? Math.min(...manuallyPlanned.map((video) => video.time)) : Infinity;
  const assignedRoles = new Map();
  for (const value of Object.values(map)) {
    if (!value.season || !value.episode || !['A', 'B'].includes(value.role)) continue;
    const key = `${value.season}-${value.episode}`;
    assignedRoles.set(key, new Set([...(assignedRoles.get(key) || []), value.role]));
  }

  for (const video of [...dated].sort((a, b) => a.time - b.time)) {
    if (map[video.videoId] && map[video.videoId].source !== 'auto') continue;
    const title = video.title || '';
    const explicit = title.match(/시즌\s*([12]).*?EP\s*(\d+)|영어기초배우기\s*EP\s*(\d+)/i);
    if (explicit) {
      const season = Number(explicit[1] || 1);
      const episode = Number(explicit[2] || explicit[3]);
      map[video.videoId] = {category: 'SEASON', season, episode, role: 'LONG', source: 'auto', reason: '제목의 시즌·EP 표기'};
      continue;
    }

    const isShort = video.format ? video.format === 'SHORTS' : Number(video.durationSeconds || 0) <= 60;
    if (isShort && video.time >= plannedStart) {
      const parent = [...dated].filter((candidate) => {
        const classification = map[candidate.videoId];
        const gap = video.time - candidate.time;
        return classification?.category === 'SEASON' && classification.role === 'LONG' && gap >= 0 && gap <= 7 * 86400000;
      }).sort((a, b) => b.time - a.time)[0];
      if (parent) {
        const base = map[parent.videoId];
        const key = `${base.season}-${base.episode}`;
        const used = assignedRoles.get(key) || new Set();
        const role = ['A', 'B'].find((candidate) => !used.has(candidate));
        if (role) {
          used.add(role); assignedRoles.set(key, used);
          map[video.videoId] = {category: 'SEASON', season: base.season, episode: base.episode, role, source: 'auto', reason: '같은 주에 업로드된 시즌 쇼츠'};
          continue;
        }
      }
    }

    if (/20\s*(?:개\s*)?문장|필수\s*문장\s*20개|스피드 테스트|연습\s*\d+|실력 테스트/i.test(title)) {
      map[video.videoId] = {category: 'EXPERIMENT', role: isShort ? 'STANDALONE_SHORT' : 'STANDALONE_LONG', source: 'auto', reason: '독립 포맷 실험'};
    } else if (video.time < plannedStart) {
      map[video.videoId] = {category: 'LEGACY', role: isShort ? 'STANDALONE_SHORT' : 'STANDALONE_LONG', source: 'auto', reason: '구체적 운영 계획 이전 업로드'};
    } else {
      map[video.videoId] = {category: 'OTHER', role: isShort ? 'STANDALONE_SHORT' : 'STANDALONE_LONG', source: 'auto', reason: '검토 필요'};
    }
  }
  return map;
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
          if (current && current.impressions === Math.round(impressions || 0) && current.ctr === (ctr || 0)) {
            unchanged++;
            continue;
          }
          reach.videos[vId].periods[periodKey] = {
            startDate,
            endDate,
            impressions: Math.round(impressions || 0),
            ctr: Number(ctr || 0),
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
        };
      });
    } catch (err) {
      if (!/disabled/i.test(err.message)) commentErrors.add(err.message); // 댓글을 꺼 둔 영상은 오류가 아니다
      commentsByVideo[video.videoId] = [];
    }
  });
  if (commentErrors.size) console.warn(`[Comments] 댓글 수집 실패: ${[...commentErrors].join(' / ')}`);

  const savedClassifications = await loadVideoMap();
  const classifications = inferClassifications(recentVideos, savedClassifications);
  await saveVideoMap(classifications);

  const [summaryReport, dailyReport, topReport, contentTypeReport, trafficReport, searchReport] = await Promise.all([
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
    const relatedShorts = videoPerformance.filter((row) => {
      const c = classifications[row.video] || {};
      return c.season === classification.season && c.episode === classification.episode && ['A', 'B'].includes(c.role);
    });
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
    searchTerms: rowObjects(searchReport),
    videoPerformance,
    topVideos: videoPerformance.slice(0, 15),
    channelCRecommendations: channelCRecommendations.slice(0, 10),
  };

  dashboard.packagingRegistry = await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
  dashboard.localThumbnails = await getLocalPackageThumbnailMap();
  dashboard.studioFolderScan = await scanStudioExportFolders(recentVideos, dashboard.packagingRegistry);
  dashboard.videoReachManual = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};

  const evaluations48h = await build48hEvaluations({
    snapshot: dashboard,
    queryVideoWindow: async (videoId, window) => rowObjects(await analyticsQuery(accessToken, {
      startDate: window.startDate,
      endDate: window.endDate,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,comments',
      filters: `video==${videoId}`,
    }))[0] || {},
  });
  dashboard.evaluations48h = evaluations48h;
  await saveJson(evaluationsPath, evaluations48h);

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
  await saveJson(latestSnapshotPath, snapshot);
  await mkdir(snapshotDir, {recursive: true});
  await writeFile(join(snapshotDir, `${snapshotId}.json`), JSON.stringify(snapshot, null, 2), 'utf8');
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
const syncUploadPackageStatusFromYouTube = async (pkgPath, statusData, title, titleCandidates) => {
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
    await saveJson(join(pkgPath, 'status.json'), updated);
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
        let statusData = await loadJson(join(pkgPath, 'status.json')) || {};
        statusData = await syncUploadPackageStatusFromYouTube(pkgPath, statusData, title, titleVariants);
        let statusLabel = '패키징 완료';
        if (statusData.status === 'scheduled' && statusData.scheduledFor) {
          const d = new Date(statusData.scheduledFor);
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          const dayName = Number.isNaN(d.getTime()) ? '' : `(${days[d.getDay()]})`;
          statusLabel = Number.isNaN(d.getTime())
            ? '예약됨'
            : `예약 · ${d.getMonth() + 1}/${d.getDate()}${dayName} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        } else if (statusData.status === 'ready_to_upload' && statusData.scheduledFor) {
          const d = new Date(statusData.scheduledFor);
          const days = ['일', '월', '화', '수', '목', '금', '토'];
          const dayName = Number.isNaN(d.getTime()) ? '' : `(${days[d.getDay()]})`;
          statusLabel = Number.isNaN(d.getTime())
            ? '업로드 대기'
            : `업로드 대기 · 예약 권장: ${d.getMonth() + 1}/${d.getDate()}${dayName} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} KST`;
        } else if (statusData.status === 'published') {
          statusLabel = '공개됨';
        }

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

const BRAND_LINTER_SAMPLE_SHORTS_TOPIC = "30초 만에 'Want' vs 'Won\'t' 발음 완벽 구분법";
const BRAND_LINTER_SAMPLE_SHORTS_TEXT = `Want와 Won't, 원어민 발음 들을 때마다 헷갈리셨죠?
당신이 영어를 못해서가 아니라, 미국인 혀의 '소리 지름길'을 몰랐기 때문입니다.

미국인들은 Want를 말할 때 혀와 입술을 게으르게 툭 떨어뜨려 '원-트'처럼 편하게 소리 냅니다.
이 원리는 Water, What, Watch에도 똑같이 통합니다! 입술에 힘을 빼면 다 들립니다.

근데 Won't는 왜 다를까요? 딱 요 차이 하나만 기억하세요!
Won't는 입술을 동그랗게 모으면서 '오우' 소리를 살짝 넣어 '워운트'로 발음해야 합니다.

소리 원리만 알면 무작정 외우지 않아도 귀가 저절로 열립니다.
하루 1분, 소리 비법을 매일 받아보시려면 구독을 눌러주세요!`;

const BRAND_LINTER_SAMPLE_LONG_TOPIC = "원어민이 평생 써먹는 영어 발음 3대 황금 공식 (3060 맞춤 7분 완성)";
const BRAND_LINTER_SAMPLE_LONG_TEXT = `기초가 전혀 없어도 괜찮습니다.
당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다. 무작정 외우지 마세요.

미국인들이 빠르게 말할 때 혀를 굴리는 게 아니라, 사실은 혀를 덜 움직이려고 소리를 깎아내는 겁니다.
1단계 소리 지름길: T와 D가 모음 사이에 끼면 부드러운 'ㄹ' 소리로 변신합니다.
Water가 '워러', Butter가 '버러'로 들리는 이유입니다.

이 원리는 다른 수백 개 단어에도 똑같이 통합니다!
City(씨리), Better(베러), Letter(레러), Hospital(하스피럴).
패턴만 익히면 CNN 뉴스도 우리말처럼 편안하게 들리기 시작합니다.

근데 왜 Mountain이나 Button은 '마운런', '버런'이 아닐까요?
딱 요 사소한 반전 차이! 코로 숨을 턱 막는 '비음 멈춤 소리' 때문입니다.

하루 일하고 지친 여러분을 위한 세련된 지적 휴식, 이해하면 쉬운 영어였습니다.
다음 영상에서도 귀가 뻥 뚫리는 소리 비법을 전해드립니다. 구독하고 편하게 받아보세요!`;

/* Cyber-HUD Single Page Application HTML */
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
.col-8  { grid-column: span 8; }
.col-6  { grid-column: span 6; }
.col-4  { grid-column: span 4; }
.col-3  { grid-column: span 3; }

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
  <button class="rail-btn active" data-tab="tab-overview" title="전체 관제 (Overview)">
    ⚡<span class="label">Home</span>
  </button>
  <button class="rail-btn" data-tab="tab-idea-board" title="아이디어 추천부터 썸네일 제작까지 기획 보드">
    💡<span class="label">Idea</span>
  </button>
  <button class="rail-btn" data-tab="tab-matrix" title="CTR vs 시청지속률 4사분면 진단 매트릭스">
    📊<span class="label">Matrix</span>
  </button>
  <button class="rail-btn" data-tab="tab-ab-simulator" title="썸네일·제목 A/B 피드 시뮬레이터 & CTR 예측기">
    🎯<span class="label">A/B Test</span>
  </button>
  <button class="rail-btn" data-tab="tab-demand" title="시장 수요 레이더 (Market Demand)">
    🎯<span class="label">Demand</span>
  </button>
  <button class="rail-btn" data-tab="tab-outlier" title="아웃라이어 댓글 AI 분석실">
    🤖<span class="label">AI Lab</span>
  </button>
  <button class="rail-btn" data-tab="tab-episodes" title="에피소드 & 업로드 패키징">
    🎬<span class="label">Episodes</span>
  </button>
  <button class="rail-btn" data-tab="tab-evaluations" title="48시간 사후 평가">
    ⚖️<span class="label">48H Eval</span>
  </button>
  <button class="rail-btn" data-tab="tab-studio" title="Studio CSV CTR 트래커">
    📁<span class="label">Studio</span>
  </button>
  <button class="rail-btn" data-tab="tab-design" title="브랜드 디자인 시스템 & 가이드">
    🎨<span class="label">Design</span>
  </button>
  <button class="rail-btn" data-tab="tab-knowledge-db" title="누적 데이터 자산 (시청자 DNA / 성공 패턴)">
    🧬<span class="label">Knowledge</span>
  </button>
</aside>

<main class="app-container">
  <header class="cockpit-header">
    <div class="header-left">
      <div class="eyebrow">
        <span class="pulse-dot"></span>
        <span id="channel-status-label">IHM EASY ENGLISH // CYBER-HUD v2.0</span>
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
    <button class="tab-scroll-btn tab-scroll-left" id="btn-tab-scroll-left" title="왼쪽 탭으로 이동">‹</button>
    <nav class="category-tabs" id="category-tabs-nav">
      <button class="tab-pill active" data-tab="tab-overview">⚡ 전체 관제 (Overview)</button>
      <button class="tab-pill" data-tab="tab-idea-board">💡 아이디어→썸네일 기획 보드</button>
      <button class="tab-pill" data-tab="tab-matrix">📊 CTR·지속률 4사분면 매트릭스</button>
      <button class="tab-pill" data-tab="tab-ab-simulator">🎯 썸네일·제목 A/B 시뮬레이터</button>
      <button class="tab-pill" data-tab="tab-demand">🎯 시장 수요 레이더 (Market Demand)</button>
      <button class="tab-pill" data-tab="tab-outlier">🤖 아웃라이어 댓글 AI (Outlier Lab)</button>
      <button class="tab-pill" data-tab="tab-episodes">🎬 에피소드 & 업로드 패키지</button>
      <button class="tab-pill" data-tab="tab-evaluations">⚖️ 48H 사후 판정 (Evaluations)</button>
      <button class="tab-pill" data-tab="tab-studio">📁 Studio CTR 트래커</button>
      <button class="tab-pill" data-tab="tab-design">🎨 브랜드 디자인 시스템</button>
      <button class="tab-pill" data-tab="tab-knowledge-db">🧬 데이터 자산 (Knowledge DB)</button>
    </nav>
    <button class="tab-scroll-btn tab-scroll-right" id="btn-tab-scroll-right" title="오른쪽 탭으로 이동">›</button>
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

let gDashboard = null;
let gMarketDemand = null;
let gContentOpportunity = null;
let gEpisodes = null;
let gKnowledgeDb = null;
let gKdbSourceFilter = 'ALL'; // 'ALL' | 'outlierComment' | 'competitorScript'
let gCurrentTab = (function() {
  try { return localStorage.getItem('ihm_active_tab') || 'tab-overview'; } catch (_) { return 'tab-overview'; }
})();
let gClassificationFilter = 'ALL';
let gClassificationSearch = '';
let gStudioFilter = 'ALL';
let gAiLabSubTab = (function() {
  try { return localStorage.getItem('ihm_ailab_subtab') || 'comments'; } catch (_) { return 'comments'; }
})(); // 'comments' | 'scripts' | 'brand-linter'

/* 3060 BRAND SCRIPT LINTER & HYPERFRAMES STATE */
let gBrandScriptTopic = ${JSON.stringify(BRAND_LINTER_SAMPLE_SHORTS_TOPIC)};
let gBrandScriptFormat = "SHORTS";
let gBrandScriptText = ${JSON.stringify(BRAND_LINTER_SAMPLE_SHORTS_TEXT)};
let gBrandScriptLinterResult = null;

function saveBrandLinterState() {
  try {
    const state = {
      topic: gBrandScriptTopic,
      format: gBrandScriptFormat,
      text: gBrandScriptText,
      result: gBrandScriptLinterResult,
    };
    localStorage.setItem('ihm_brand_linter_state', JSON.stringify(state));
  } catch (_) {}
}

function loadBrandLinterState() {
  try {
    const saved = localStorage.getItem('ihm_brand_linter_state');
    if (saved) {
      const state = JSON.parse(saved);
      if (state.topic) gBrandScriptTopic = state.topic;
      if (state.format) gBrandScriptFormat = state.format;
      if (state.text) gBrandScriptText = state.text;
      if (state.result) gBrandScriptLinterResult = state.result;
    }
  } catch (_) {}
}
loadBrandLinterState();

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

/* A/B SIMULATOR STATE */
let gAbVariants = [
  {
    id: 'A',
    title: "SPECIAL은 왜 ‘스페시알’이 아닐까? | -CIAL 영어 발음 규칙",
    imageUrl: 'https://i.ytimg.com/vi/sNNufVhkjT8/mqdefault.jpg',
    thumbnailCopy: "SPECIAL 발음 치트키",
    badge: '발음 원리',
    isLocalFile: false,
  },
  {
    id: 'B',
    title: "PICTURE는 왜 '픽투어'가 아닐까? | -TURE 규칙 (영어기초)",
    imageUrl: 'https://i.ytimg.com/vi/YoaCRYCWpws/mqdefault.jpg',
    thumbnailCopy: "PICTURE 소리 비밀",
    badge: '소리 법칙',
    isLocalFile: false,
  },
  {
    id: 'C',
    title: "익-션-전-천-처-저-셜, 사실 딱 하나의 규칙이었습니다 (시즌1 총정리)",
    imageUrl: 'https://i.ytimg.com/vi/3PkSwrFIcRE/mqdefault.jpg',
    thumbnailCopy: "시즌1 완결 총정리 족보",
    badge: '총정리',
    isLocalFile: false,
  },
];
let gAbTopic = "SPECIAL은 왜 ‘스페시알’이 아닐까? | -CIAL 영어 발음 규칙";
let gAbAudience = "3060 성인 & 왕초보 영어 학습자";
let gAbFormat = "LONGFORM"; // 'LONGFORM' | 'SHORTS'
let gAbCompetitors = [];
let gAbCompetitorsFetchedForTopic = null; // 마지막으로 gAbCompetitors를 가져온 topic — 바뀌면 재요청
let gAbActiveFeedView = 'A'; // 'A' | 'B' | 'C' | 'ALL'
let gAbFeedPosition = 'TOP'; // 'TOP' | 'MIDDLE' | 'BOTTOM'
let gAbFeedSlotIndex = 0; // 0 to 6 (Exact slot position in mobile feed)
let gAbVisionFilter = 'normal'; // 'normal' | 'blur' | 'grayscale'
let gAbAiReport = null;
let gAbSelectedVariantTab = 'A'; // 'A' | 'B' | 'C'
// 클로즈업 전용 4번째 썸네일(thumbnail-close-up.jpg) — A/B/C 시안과 별개로 저장한다.
// knowledge/thumbnail-strategy.md의 "클로즈업 썸네일은 대시보드 예상 CTR %가 가장 높은
// 시안을 선택해 제작한다"(2026-09-20 확정) 규칙이 그동안 코드로는 강제되지 않고 사람이
// 매번 화면의 %를 손으로 읽어 옮기는 방식이었다 — 이제 버튼 하나로 bestVariant의 문구를
// 그대로 가져다 클로즈업 전용 구도로 생성한다(2026-09-29).
let gAbCloseUpImageUrl = '';
let gAbCloseUpSourceVariant = ''; // 이 클로즈업이 어느 시안 문구로 만들어졌는지 기록

let gAbStateSyncTimer = null;
let gAbStateSyncFailedNotified = false;
function saveAbSimulatorState() {
  const state = {
    format: gAbFormat,
    topic: gAbTopic,
    audience: gAbAudience,
    variants: gAbVariants,
    activeFeedView: gAbActiveFeedView,
    feedPosition: gAbFeedPosition,
    feedSlotIndex: gAbFeedSlotIndex,
    selectedVariantTab: gAbSelectedVariantTab,
    visionFilter: gAbVisionFilter,
    aiReport: gAbAiReport,
    closeUpImageUrl: gAbCloseUpImageUrl,
    closeUpSourceVariant: gAbCloseUpSourceVariant,
  };
  // localStorage는 같은 탭에서만 쓰는 빠른 캐시일 뿐, 진짜 저장소는 서버 파일이다 — 이 저장이
  // 실패해도(예: 용량 초과) 서버 동기화는 반드시 계속 시도해야 한다. 예전엔 이 둘이 같은 try
  // 블록 안에 있어서, localStorage.setItem이 QuotaExceededError로 던지면 그 아래 서버 동기화
  // setTimeout 자체가 등록조차 안 됐다 — "드래그앤드롭했는데 서버에 저장이 안 된다"던 게 실은
  // 업로드 자체 버그가 아니라 saveAbSimulatorState 함수 전체가 조용히 멈춰있던 문제였다
  // (2026-09-02, Playwright 검증으로 실제 QuotaExceededError를 콘솔에서 확인해서 발견 — 예전
  // 로컬 업로드가 base64를 그대로 상태에 남겨서 용량을 초과시켰었다).
  try {
    localStorage.setItem('ihm_ab_simulator_state', JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save A/B simulator state to localStorage (서버 동기화는 계속 진행):', err);
  }
  // 서버 파일로도 저장 — localStorage뿐이면 다른 PC/브라우저에서 못 봄(2026-09-02, 사용자 지적).
  // 입력창 타이핑마다 saveAbSimulatorState가 호출되므로 네트워크 요청은 디바운스한다.
  if (gAbStateSyncTimer) clearTimeout(gAbStateSyncTimer);
  gAbStateSyncTimer = setTimeout(() => {
    fetch('/api/ab-simulator/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    })
      .then((res) => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        gAbStateSyncFailedNotified = false;
      })
      .catch((err) => {
        // 예전엔 여기서 그냥 삼켜서 실패해도 아무 표시가 없었다 — 반복 토스트로 스팸이 안 되게
        // 다음 성공 전까지 한 번만 띄운다.
        console.warn('Failed to sync A/B simulator state to server:', err);
        if (!gAbStateSyncFailedNotified) {
          gAbStateSyncFailedNotified = true;
          showToast('⚠️ 시안 변경사항이 서버에 저장되지 않고 있습니다 — 새로고침하면 사라질 수 있어요.');
        }
      });
  }, 1200);
}

async function hydrateAbSimulatorFromServer() {
  try {
    const res = await fetch('/api/ab-simulator/state');
    if (!res.ok) return;
    const state = await res.json();
    if (state && Array.isArray(state.variants) && state.variants.length === 3) {
      if (state.format) gAbFormat = state.format;
      if (state.topic) gAbTopic = state.topic;
      if (state.audience) gAbAudience = state.audience;
      gAbVariants = state.variants;
      if (state.activeFeedView) gAbActiveFeedView = state.activeFeedView;
      if (state.feedPosition) gAbFeedPosition = state.feedPosition;
      if (typeof state.feedSlotIndex === 'number') gAbFeedSlotIndex = state.feedSlotIndex;
      if (state.selectedVariantTab) gAbSelectedVariantTab = state.selectedVariantTab;
      if (state.visionFilter) gAbVisionFilter = state.visionFilter;
      if (state.aiReport) gAbAiReport = state.aiReport;
      if (state.closeUpImageUrl) gAbCloseUpImageUrl = state.closeUpImageUrl;
      if (state.closeUpSourceVariant) gAbCloseUpSourceVariant = state.closeUpSourceVariant;
      try { localStorage.setItem('ihm_ab_simulator_state', JSON.stringify(state)); } catch (_) {}
    }
  } catch (err) {
    console.warn('Failed to hydrate A/B simulator state from server:', err);
  }
}

function loadAbSimulatorState() {
  try {
    const saved = localStorage.getItem('ihm_ab_simulator_state');
    if (saved) {
      const state = JSON.parse(saved);
      if (state.format) gAbFormat = state.format;
      if (state.topic) gAbTopic = state.topic;
      if (state.audience) gAbAudience = state.audience;
      if (typeof state.feedSlotIndex === 'number') gAbFeedSlotIndex = state.feedSlotIndex;
      if (state.feedPosition) gAbFeedPosition = state.feedPosition;
      if (Array.isArray(state.variants) && state.variants.length === 3) {
        gAbVariants = state.variants;
        // Self-heal: If format is LONGFORM but variants still hold old competitor images, update to our channel's 16:9 Longform thumbnails
        if (gAbFormat === 'LONGFORM') {
          const hasOldSample = gAbVariants.some(v => v.imageUrl && (v.imageUrl.includes('OVAeeJxmdw0') || v.imageUrl.includes('tpveKY5pnis') || v.imageUrl.includes('t_wVvVyqdbg') || v.imageUrl.includes('5MiM1tIpQQk') || v.imageUrl.includes('unsplash.com')) && !v.isLocalFile);
          if (hasOldSample) {
            gAbVariants = [
              { id: 'A', title: "SPECIAL은 왜 ‘스페시알’이 아닐까? | -CIAL 영어 발음 규칙", imageUrl: 'https://i.ytimg.com/vi/sNNufVhkjT8/mqdefault.jpg', thumbnailCopy: "SPECIAL 발음 치트키", badge: '발음 원리', isLocalFile: false },
              { id: 'B', title: "PICTURE는 왜 '픽투어'가 아닐까? | -TURE 규칙 (영어기초)", imageUrl: 'https://i.ytimg.com/vi/YoaCRYCWpws/mqdefault.jpg', thumbnailCopy: "PICTURE 소리 비밀", badge: '소리 법칙', isLocalFile: false },
              { id: 'C', title: "익-션-전-천-처-저-셜, 사실 딱 하나의 규칙이었습니다 (시즌1 총정리)", imageUrl: 'https://i.ytimg.com/vi/3PkSwrFIcRE/mqdefault.jpg', thumbnailCopy: "시즌1 완결 총정리 족보", badge: '총정리', isLocalFile: false },
            ];
            gAbTopic = "SPECIAL은 왜 ‘스페시알’이 아닐까? | -CIAL 영어 발음 규칙";
          }
        }
      }
      if (state.activeFeedView) gAbActiveFeedView = state.activeFeedView;
      if (state.feedPosition) gAbFeedPosition = state.feedPosition;
      if (state.selectedVariantTab) gAbSelectedVariantTab = state.selectedVariantTab;
      if (state.visionFilter) gAbVisionFilter = state.visionFilter;
      if (state.aiReport) gAbAiReport = state.aiReport;
      if (state.closeUpImageUrl) gAbCloseUpImageUrl = state.closeUpImageUrl;
      if (state.closeUpSourceVariant) gAbCloseUpSourceVariant = state.closeUpSourceVariant;
    }
  } catch (err) {
    console.warn('Failed to load A/B simulator state:', err);
  }
}
loadAbSimulatorState();

/* IDEA BOARD STATE */
let gIdeaBoardCandidates = null;
let gIdeaBoardSelected = null;
let gIdeaBoardGeneratedAt = null;
// 마지막 생성 때 집중했던 시장 수요 키워드(2026-09-13) — 생성 직후 화면을 다시 그리면
// <select>가 매번 새로 만들어져서 값이 기본값으로 돌아가 버리는 문제가 있었다(사용자 지적:
// "완료 단계에서 선택한 개별 키워드가 셀렉터에서 해제되서 어떤 키워드로 생성했는지 모르겠어").
// generatedAt과 똑같은 방식으로(localStorage + 서버 파일) 저장해서, 다시 렌더링해도 그 셀렉트가
// 방금 쓴 키워드를 계속 선택된 채로 보여주게 한다. null이면 "전체 데이터 참고" 모드였다는 뜻.
let gIdeaBoardFocusKeyword = null;
let gIdeaBoardHistory = [];
// "이미 만든 소재" 배너를 전부 펼쳐서 보여줄지 여부 — 기본은 접힌 상태(최근 N개만).
// 탭을 벗어났다 돌아와도 유지되게 탭 로컬 상태가 아니라 세션 전역으로 둔다(2026-09-11,
// 사용자 지적: "많이 늘어나면 어떻게 처리됨?" — 무제한으로 늘어나는 배너가 페이지를
// 다 차지하는 문제를 막기 위함. AI 추천 생성 시 넘기는 목록 자체는 그대로 전부 다 넘긴다 —
// 화면 표시만 요약하는 것).
let gIdeaBoardHistoryExpanded = false;
const IDEA_BOARD_HISTORY_COLLAPSED_COUNT = 8;

function saveIdeaBoardState() {
  try {
    const state = {
      candidates: gIdeaBoardCandidates,
      selected: gIdeaBoardSelected,
      generatedAt: gIdeaBoardGeneratedAt,
      focusKeyword: gIdeaBoardFocusKeyword,
    };
    localStorage.setItem('ihm_idea_board_state', JSON.stringify(state));
    // 서버 파일로도 저장 — localStorage뿐이면 다른 PC/브라우저에서 못 봐서 후보를 다시 생성해야
    // 했음(2026-09-02, 사용자 지적). 생성·선택 시에만 호출되는 함수라 디바운스 없이 바로 보낸다.
    fetch('/api/idea-board/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    }).catch(() => {});
  } catch (err) {
    console.warn('Failed to save idea board state:', err);
  }
}

async function hydrateIdeaBoardFromServer() {
  try {
    const res = await fetch('/api/idea-board/state');
    if (!res.ok) return;
    const state = await res.json();
    if (state && state.candidates) {
      gIdeaBoardCandidates = state.candidates;
      gIdeaBoardSelected = state.selected || null;
      gIdeaBoardGeneratedAt = state.generatedAt || null;
      gIdeaBoardFocusKeyword = state.focusKeyword || null;
      try { localStorage.setItem('ihm_idea_board_state', JSON.stringify(state)); } catch (_) {}
    }
  } catch (err) {
    console.warn('Failed to hydrate idea board state from server:', err);
  }
  try {
    const histRes = await fetch('/api/idea-board/history');
    if (histRes.ok) {
      const hist = await histRes.json();
      gIdeaBoardHistory = hist.entries || [];
    }
  } catch (err) {
    console.warn('Failed to load idea board history:', err);
  }
}

function loadIdeaBoardState() {
  try {
    const saved = localStorage.getItem('ihm_idea_board_state');
    if (saved) {
      const state = JSON.parse(saved);
      if (state.candidates) gIdeaBoardCandidates = state.candidates;
      if (state.selected) gIdeaBoardSelected = state.selected;
      if (state.generatedAt) gIdeaBoardGeneratedAt = state.generatedAt;
      if (state.focusKeyword) gIdeaBoardFocusKeyword = state.focusKeyword;
    }
  } catch (err) {
    console.warn('Failed to load idea board state:', err);
  }
}
loadIdeaBoardState();

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
  const outlierScriptBtn = e.target.closest('.btn-outlier-script');
  if (outlierScriptBtn && outlierScriptBtn.dataset.vid) {
    triggerScriptAnalysis(outlierScriptBtn.dataset.vid);
    return;
  }
  const outlierAnalyzeBtn = e.target.closest('.btn-outlier-analyze');
  if (outlierAnalyzeBtn && outlierAnalyzeBtn.dataset.vid) {
    triggerCommentAnalysis(outlierAnalyzeBtn.dataset.vid);
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
    const [dashRes, demandRes, coRes, epRes, kdbRes] = await Promise.all([
      fetch('/api/dashboard'),
      fetch('/api/market-demand'),
      fetch('/api/content-opportunity'),
      fetch('/api/episodes/summary'),
      fetch('/api/knowledge-db'),
      // 서버에 저장된 아이디어 보드/A-B 시뮬레이터 상태를 첫 렌더 전에 반영 — 다른 PC/브라우저에서
      // 열어도 localStorage 없이 바로 이전 상태가 보이게 한다(2026-09-02).
      hydrateIdeaBoardFromServer(),
      hydrateAbSimulatorFromServer(),
    ]);

    gMarketDemand = demandRes.ok ? await demandRes.json() : null;
    gContentOpportunity = coRes.ok ? await coRes.json() : null;
    const epJson = epRes.ok ? await epRes.json() : [];
    gEpisodes = Array.isArray(epJson) ? epJson : [];
    gKnowledgeDb = kdbRes.ok ? await kdbRes.json() : null;

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
      case 'tab-idea-board':
        root.innerHTML = renderIdeaBoardTab();
        bindIdeaBoardEvents();
        break;
      case 'tab-matrix':
        root.innerHTML = renderMatrixTab();
        bindMatrixEvents();
        break;
      case 'tab-ab-simulator':
        root.innerHTML = renderAbSimulatorTab();
        bindAbSimulatorEvents();
        break;
      case 'tab-demand':
        root.innerHTML = renderMarketDemandTab();
        bindMarketDemandEvents();
        break;
      case 'tab-outlier':
        root.innerHTML = renderOutlierLabTab();
        bindOutlierLabEvents();
        break;
      case 'tab-episodes':
        root.innerHTML = renderEpisodesTab();
        bindEpisodeEvents();
        break;
      case 'tab-evaluations':
        root.innerHTML = renderEvaluationsTab();
        break;
      case 'tab-studio':
        root.innerHTML = renderStudioTab();
        bindStudioEvents();
        break;
      case 'tab-design':
        root.innerHTML = renderDesignSystemTab();
        break;
      case 'tab-knowledge-db':
        root.innerHTML = renderKnowledgeDbTab();
        bindKnowledgeDbEvents();
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

  const allVideos = d.recentVideos || [];
  const filteredVideos = allVideos.filter(v => {
    const c = (d.classifications || {})[v.videoId] || {};
    const titleMatch = !gClassificationSearch || v.title.toLowerCase().includes(gClassificationSearch.toLowerCase()) || v.videoId.includes(gClassificationSearch);
    if (!titleMatch) return false;
    if (gClassificationFilter === 'SEASON_1') return c.category === 'SEASON' && c.season === 1;
    if (gClassificationFilter === 'SEASON_2') return c.category === 'SEASON' && c.season === 2;
    if (gClassificationFilter === 'CHANNEL') return c.category === 'CHANNEL' || c.role === 'C';
    if (gClassificationFilter === 'LEGACY') return c.category === 'LEGACY' || c.category === 'EXPERIMENT';
    if (gClassificationFilter === 'OTHER') return c.category === 'OTHER' || !c.category;
    return true;
  });

  const getRoleOptions = (cat, role) => {
    if (cat === 'SEASON') {
      return '<option value="LONG"' + (role === 'LONG' ? ' selected' : '') + '>롱폼 (LONG)</option>' +
        '<option value="A"' + (role === 'A' ? ' selected' : '') + '>쇼츠 A (Track A)</option>' +
        '<option value="B"' + (role === 'B' ? ' selected' : '') + '>쇼츠 B (Track B)</option>' +
        '<option value="STANDALONE_SHORT"' + (role === 'STANDALONE_SHORT' ? ' selected' : '') + '>시즌 단독 쇼츠</option>';
    }
    if (cat === 'CHANNEL') {
      return '<option value="C" selected>쇼츠 C (채널 공통)</option>';
    }
    return '<option value="STANDALONE_SHORT"' + (role === 'STANDALONE_SHORT' || !role ? ' selected' : '') + '>독립 쇼츠</option>' +
      '<option value="STANDALONE_LONG"' + (role === 'STANDALONE_LONG' ? ' selected' : '') + '>독립 롱폼</option>';
  };

  const classificationRows = filteredVideos.map(v => {
    const c = (d.classifications || {})[v.videoId] || {};
    const category = c.category || (c.season ? 'SEASON' : 'OTHER');
    const isSeason = category === 'SEASON';
    const selected = (a, b) => String(a) === String(b) ? ' selected' : '';
    const thumbUrl = v.thumbnail || (v.videoId ? 'https://i.ytimg.com/vi/' + v.videoId + '/mqdefault.jpg' : '');
    const isManual = c.source === 'manual';

    return '<tr data-video="' + esc(v.videoId) + '">' +
      '<td><div style="display:flex;align-items:center;gap:10px">' +
        (thumbUrl ? '<img class="thumb-mini" src="' + esc(thumbUrl) + '" alt="">' : '') +
        '<div style="min-width:0"><b>' + esc(v.title) + '</b><div class="card-subtext">' + esc((v.publishedAt||'').slice(0,10)) + ' · ' + ((v.format ? v.format === 'SHORTS' : v.durationSeconds <= 60) ? '쇼츠' : '롱폼') + '</div></div>' +
      '</div></td>' +
      '<td><select class="category">' +
        '<option value="SEASON"' + selected(category, 'SEASON') + '>시즌 콘텐츠</option>' +
        '<option value="CHANNEL"' + selected(category, 'CHANNEL') + '>채널 공통 (C)</option>' +
        '<option value="LEGACY"' + selected(category, 'LEGACY') + '>기존 (Legacy)</option>' +
        '<option value="EXPERIMENT"' + selected(category, 'EXPERIMENT') + '>실험 (Experiment)</option>' +
        '<option value="OTHER"' + selected(category, 'OTHER') + '>기타 / 검토</option>' +
      '</select></td>' +
      '<td><select class="season"' + (isSeason ? '' : ' disabled') + '><option value="1"' + selected(c.season || 1, 1) + '>시즌1</option><option value="2"' + selected(c.season, 2) + '>시즌2</option></select></td>' +
      '<td><input class="episode" type="number" min="1" max="99" value="' + esc(isSeason ? (c.episode || 1) : '') + '"' + (isSeason ? '' : ' disabled') + ' style="width:58px"></td>' +
      '<td><select class="role">' + getRoleOptions(category, c.role) + '</select></td>' +
      '<td>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<button class="btn btn-sm btn-cyan save-classification">확정</button>' +
          '<span class="save-state badge ' + (isManual ? 'badge-pass' : 'badge-hold') + '" style="font-size:10px">' + (isManual ? '✓ 직접' : '자동') + '</span>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join('');

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

  let html = '<div class="bento-grid">' +
    readyBannerHtml +
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
      generateSparklineSvg(daily.map(x => (Number(x.views)||0) % 50 + 40).slice(-20), '#ffd166') +
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
          '<button class="btn btn-sm btn-open-tab" data-target-tab="tab-outlier">🤖 AI 댓글 분석실 열기</button>' +
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

    '<div class="bento-card col-12">' +
      '<div class="card-header" style="flex-wrap:wrap;gap:12px">' +
        '<div>' +
          '<span class="card-title">영상 자동 분류 & 상태 관리 (Video Classifications)</span>' +
          '<div class="card-subtext">새 영상은 제목과 업로드 시점에 따라 자동 분류되며, [확정] 시 영구 보존됩니다. (총 ' + allVideos.length + '개 영상)</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
          '<input type="text" id="input-cls-search" placeholder="영상 제목 / ID 검색" value="' + esc(gClassificationSearch) + '" style="width:200px">' +
          '<button class="btn btn-sm ' + (gClassificationFilter === 'ALL' ? 'btn-cyan' : '') + ' btn-cls-filter" data-filter="ALL">전체 (' + allVideos.length + ')</button>' +
          '<button class="btn btn-sm ' + (gClassificationFilter === 'SEASON_1' ? 'btn-cyan' : '') + ' btn-cls-filter" data-filter="SEASON_1">시즌 1</button>' +
          '<button class="btn btn-sm ' + (gClassificationFilter === 'SEASON_2' ? 'btn-cyan' : '') + ' btn-cls-filter" data-filter="SEASON_2">시즌 2</button>' +
          '<button class="btn btn-sm ' + (gClassificationFilter === 'CHANNEL' ? 'btn-cyan' : '') + ' btn-cls-filter" data-filter="CHANNEL">채널 공통 (C)</button>' +
          '<button class="btn btn-sm ' + (gClassificationFilter === 'LEGACY' ? 'btn-cyan' : '') + ' btn-cls-filter" data-filter="LEGACY">기존 / 실험</button>' +
          '<button class="btn btn-sm ' + (gClassificationFilter === 'OTHER' ? 'btn-cyan' : '') + ' btn-cls-filter" data-filter="OTHER">검토 필요</button>' +
        '</div>' +
      '</div>' +
      '<div style="overflow-x:auto;max-height:600px;overflow-y:auto">' +
        '<table class="cyber-table">' +
          '<thead><tr><th>영상</th><th>콘텐츠 유형</th><th>시즌</th><th>EP</th><th>역할</th><th>확정 상태</th></tr></thead>' +
          '<tbody>' + (classificationRows || '<tr><td colspan="6" class="card-subtext" style="text-align:center;padding:30px">검색 결과에 맞는 영상이 없습니다.</td></tr>') + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
  '</div>';

  return html;
}

function bindOverviewEvents() {
  const searchInput = document.getElementById('input-cls-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      gClassificationSearch = e.target.value;
      renderCurrentTab();
      const el = document.getElementById('input-cls-search');
      if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length; }
    };
  }

  document.querySelectorAll('.btn-cls-filter').forEach(btn => {
    btn.onclick = () => {
      gClassificationFilter = btn.dataset.filter;
      renderCurrentTab();
    };
  });

  document.querySelectorAll('.category').forEach(sel => {
    sel.onchange = () => {
      const row = sel.closest('tr');
      const cat = sel.value;
      const seasonSel = row.querySelector('.season');
      const epInput = row.querySelector('.episode');
      const roleSel = row.querySelector('.role');

      if (cat === 'SEASON') {
        seasonSel.disabled = false;
        epInput.disabled = false;
        if (!epInput.value) epInput.value = '1';
        roleSel.innerHTML = 
          '<option value="LONG">롱폼 (LONG)</option>' +
          '<option value="A">쇼츠 A (Track A)</option>' +
          '<option value="B">쇼츠 B (Track B)</option>' +
          '<option value="STANDALONE_SHORT">시즌 단독 쇼츠</option>';
      } else if (cat === 'CHANNEL') {
        seasonSel.disabled = true;
        epInput.disabled = true;
        roleSel.innerHTML = '<option value="C" selected>쇼츠 C (채널 공통)</option>';
      } else {
        seasonSel.disabled = true;
        epInput.disabled = true;
        roleSel.innerHTML = 
          '<option value="STANDALONE_SHORT">독립 쇼츠</option>' +
          '<option value="STANDALONE_LONG">독립 롱폼</option>';
      }
    };
  });

  document.querySelectorAll('.save-classification').forEach(btn => {
    btn.onclick = async () => {
      const row = btn.closest('tr');
      const state = row.querySelector('.save-state');
      const videoId = row.dataset.video;
      const category = row.querySelector('.category').value;
      const season = category === 'SEASON' ? Number(row.querySelector('.season').value || 1) : null;
      const episode = category === 'SEASON' ? Number(row.querySelector('.episode').value || 1) : null;
      const role = row.querySelector('.role').value;

      btn.disabled = true;
      state.textContent = '저장 중...';
      try {
        const res = await fetch('/api/classification', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ videoId, category, season, episode, role })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || '저장 실패');
        
        if (gDashboard) {
          gDashboard.classifications ||= {};
          gDashboard.classifications[videoId] = result.classification;
        }

        row.classList.add('row-saved');
        state.className = 'save-state badge badge-pass';
        state.textContent = '✓ 직접';
        showToast('영상 분류가 성공적으로 저장되었습니다!');
      } catch (err) {
        state.className = 'save-state badge badge-revise';
        state.textContent = '❌ ' + err.message;
        alert('저장 실패: ' + err.message);
      } finally {
        btn.disabled = false;
      }
    };
  });
}

/* TAB 2: MARKET DEMAND RADAR */
function renderMarketDemandTab() {
  const md = gMarketDemand;
  if (!md || !md.byKeyword) {
    return '<div class="bento-card" style="padding:40px;text-align:center">' +
      '<h3>시장 수요 데이터가 아직 생성되지 않았습니다.</h3>' +
      '<p class="card-subtext" style="justify-content:center;margin-bottom:20px">아래 버튼을 눌러 경쟁 채널 시장 수요 분석을 즉시 실행하세요.</p>' +
      '<button class="btn btn-magenta" id="btn-run-market-demand-direct">🚀 시장 수요 분석 실행 (market-demand.mjs)</button>' +
    '</div>';
  }

  let html = '<div class="bento-grid">' +
    '<div class="bento-card col-12" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">' +
      '<div>' +
        '<div class="card-title" style="color:var(--accent-magenta)">RADAR INTELLIGENCE</div>' +
        '<h2 style="font-family:var(--font-display);font-size:22px;color:var(--text-bright);margin-top:2px">🎯 경쟁 채널 시장 수요 & 아웃라이어 레이더</h2>' +
        '<div class="card-subtext">총 ' + (md.channelsAnalyzed || 30) + '개 채널 분석 완료 · 마지막 갱신: ' + esc(md.generatedAt?.slice(0,19).replace('T', ' ')) + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:10px;align-items:center">' +
        '<input type="text" id="input-demand-kw" placeholder="신규 키워드 (예: 영어 발음 규칙)" style="width:240px">' +
        '<button class="btn btn-magenta" id="btn-run-demand-kw">🚀 수요 분석 실행</button>' +
      '</div>' +
    '</div>';

  // 특정 경쟁 채널 지목 분석(2026-09-30 추가) — 키워드 검색으로는 우연히 못 걸릴 수 있는
  // 채널을 사용자가 직접 지목해 깊이 파본다(market-demand.mjs --channel= 참고). 이름 검색이
  // 아니라 URL/@핸들만 받는다 — channels.list forHandle=은 1단위+100% 정확이지만, 이름
  // 검색(search.list)은 100단위인데 동명이인 채널을 잘못 짚어도 티가 안 나는 위험이 있어서
  // 사용자와 논의 후 의도적으로 뺐다.
  html += '<div class="bento-card col-12" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;background:#0d0a16;border:1px solid rgba(217,70,239,0.25)">' +
    '<div>' +
      '<div class="card-title" style="color:var(--accent-cyan)">CHANNEL DEEP-DIVE</div>' +
      '<h3 style="font-family:var(--font-display);font-size:16px;color:var(--text-bright);margin-top:2px">🔗 특정 채널 추적 분석</h3>' +
      '<div class="card-subtext">키워드 검색에 안 걸리는 채널도 URL/@핸들만 있으면 직접 분석 — 채널 자체 기준선 대비 어떤 영상이 유독 잘 됐는지(같은 방법론)</div>' +
    '</div>' +
    '<div style="display:flex;gap:10px;align-items:center">' +
      '<input type="text" id="input-demand-channel" placeholder="채널 URL 또는 @핸들 (이름 검색은 지원 안 함)" style="width:320px">' +
      '<button class="btn btn-cyan" id="btn-run-demand-channel">🔎 채널 분석 실행</button>' +
    '</div>' +
  '</div>';

  const trackedChannels = md.trackedChannels || [];
  if (trackedChannels.length > 0) {
    html += '<div class="bento-card col-12">' +
      '<div class="card-header"><span class="card-title" style="color:var(--accent-cyan)">🔗 추적 중인 채널 (' + trackedChannels.length + '개)</span></div>' +
      '<div class="bento-grid" style="padding:0">' +
      trackedChannels.map((c) => {
        const subLabel = c.subscriberCount != null ? fmt.format(c.subscriberCount) + '명' : '비공개';
        const sizeWarning = (c.subscriberCount != null && c.subscriberCount > 100000)
          ? '<div class="card-subtext" style="color:var(--accent-amber);margin-top:2px">⚠️ 우리 채널보다 훨씬 큼 — 패턴 참고용으로만 볼 것, 수요 점수처럼 직접 비교하지 말 것</div>' : '';
        return '<div class="bento-card col-4" style="background:#090e18">' +
          '<div class="card-header">' +
            '<span style="font-family:var(--font-display);font-size:16px;font-weight:800;color:var(--text-bright)">' + esc(c.channelTitle) + '</span>' +
            '<div style="display:flex;gap:6px;align-items:center">' +
              '<button class="btn btn-sm btn-channel-refresh" data-input="' + esc(c.handle || c.channelUrl || c.channelId) + '" title="이 채널만 다시 분석해서 최신 데이터로 덮어쓰기" style="padding:2px 6px">🔄</button>' +
              '<button class="btn btn-sm btn-channel-delete" data-channel-id="' + esc(c.channelId) + '" title="추적 목록에서 제거" style="color:#ff5577;border-color:#ff5577;padding:2px 6px">🗑️</button>' +
            '</div>' +
          '</div>' +
          '<div class="card-subtext" style="margin-top:-4px">구독자 ' + subLabel + ' · 영상 ' + (c.videoCount || 0) + '개 분석 · ' + esc((c.analyzedAt || '').slice(0, 10)) + '</div>' +
          sizeWarning +
          (c.titlePatterns && c.titlePatterns.length > 0 ?
            '<div style="margin-top:10px">' + c.titlePatterns.slice(0, 6).map(p =>
              '<span class="tag-chip copy-chip" data-copy="' + esc(p.word) + '">#' + esc(p.word) + '</span>'
            ).join('') + '</div>' : '') +
          (c.topOutliers && c.topOutliers.length > 0 ?
            '<div style="margin-top:12px;border-top:1px solid var(--border-subtle);padding-top:10px">' +
              '<div class="card-title" style="margin-bottom:6px">⭐ 이 채널 기준 이례적으로 잘 된 영상:</div>' +
              c.topOutliers.slice(0, 3).map(o => {
                const watchUrl = o.videoId ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(o.videoId) : '';
                return '<div style="background:#05070c;border:1px solid var(--border-subtle);border-radius:8px;padding:8px 10px;margin-bottom:6px">' +
                  (watchUrl ?
                    '<a href="' + esc(watchUrl) + '" target="_blank" rel="noopener" style="text-decoration:none"><div style="font-weight:700;font-size:12px;color:var(--text-bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">▶ ' + esc(o.title) + '</div></a>' :
                    '<div style="font-weight:700;font-size:12px;color:var(--text-bright)">' + esc(o.title) + '</div>') +
                  '<div class="card-subtext">' + (o.outlierRatio ? o.outlierRatio.toFixed(1) + 'x 배수' : '') + ' · 일평균 ' + fmt.format(Math.round(o.viewsPerDay || 0)) + '회' +
                  '</div>' +
                '</div>';
              }).join('') +
            '</div>' : '') +
        '</div>';
      }).join('') +
      '</div>' +
    '</div>';
  }

  // 키워드 카드마다 따로 있던 "제목 반복 패턴"을 하나로 합친다 — 같은 단어가 여러 카드에
  // 중복으로 뜨면 어느 걸 복사했는지 헷갈리고, 같은 걸 또 수요 분석하게 될 수 있다는 사용자
  // 지적(2026-09-07)으로 전면 교체. 여러 키워드에서 공통으로 반복된 단어일수록(= 여러 다른
  // 검색에서도 먹힌 훅) 더 강한 신호이므로, 등장한 키워드 개수 기준으로 정렬한다.
  const globalPatternMap = {};
  md.byKeyword.forEach(k => {
    (k.titlePatterns || []).forEach(p => {
      if (!globalPatternMap[p.word]) globalPatternMap[p.word] = {word: p.word, totalCount: 0, keywords: []};
      globalPatternMap[p.word].totalCount += (p.titleCount || 0);
      if (globalPatternMap[p.word].keywords.indexOf(k.keyword) === -1) globalPatternMap[p.word].keywords.push(k.keyword);
    });
  });
  const globalPatterns = Object.keys(globalPatternMap).map(w => globalPatternMap[w])
    .sort((a, b) => (b.keywords.length - a.keywords.length) || (b.totalCount - a.totalCount))
    .slice(0, 20);

  if (globalPatterns.length > 0) {
    html += '<div class="bento-card col-12">' +
      '<div class="card-header">' +
        '<span class="card-title" style="color:var(--accent-magenta)">🔥 채널 전체 반복 훅 단어 TOP (클릭 시 복사)</span>' +
      '</div>' +
      '<div class="card-subtext" style="margin-bottom:10px">여러 키워드 검색에서 공통으로 반복된 단어일수록(= 다른 주제에서도 먹힌 훅) 위로 정렬됩니다. 마우스를 올리면 어느 키워드에서 나왔는지 볼 수 있습니다.</div>' +
      '<div>' + globalPatterns.map(p =>
        '<span class="tag-chip copy-chip" data-copy="' + esc(p.word) + '" title="출처 키워드: ' + esc(p.keywords.join(', ')) + '">#' + esc(p.word) + ' (' + p.keywords.length + '개 키워드 · 총 ' + p.totalCount + '회)</span>'
      ).join('') + '</div>' +
    '</div>';
  }

  // 같은 영상이 여러 키워드 카드에 아웃라이어로 동시에 걸리는 경우, 카드마다 통째로 지우거나
  // 합치지 않고(그러면 "이 키워드에서도 TOP 3 안에 든다"는 그 키워드 고유의 맥락이 사라짐)
  // 제자리에 "다른 키워드에서도 TOP" 배지만 붙인다 — 여러 키워드에서 반복 등장하는 건 그만큼
  // 더 강력한 콘텐츠라는 신호라서 지우기보단 강조하는 쪽이 맞다(2026-09-07, 사용자 확인).
  const videoKeywordMap = {};
  md.byKeyword.forEach(k => {
    (k.topOutliers || []).forEach(o => {
      if (!o.videoId) return;
      if (!videoKeywordMap[o.videoId]) videoKeywordMap[o.videoId] = [];
      if (videoKeywordMap[o.videoId].indexOf(k.keyword) === -1) videoKeywordMap[o.videoId].push(k.keyword);
    });
  });

  md.byKeyword.forEach((k, kIdx) => {
    const score = Math.round(k.marketDemandScore || 0);
    const opp = Number(k.opportunityScore || 0).toFixed(1);
    const scoreClass = score >= 150 ? 'badge-strong-pass' : score >= 80 ? 'badge-pass' : 'badge-hold';

    const analyzedAtLabel = k.analyzedAt ? k.analyzedAt.slice(0, 10) : '예전 데이터(날짜 미기록)';

    html += '<div class="bento-card col-4" id="demand-card-' + kIdx + '">' +
      '<div class="card-header">' +
        '<span style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--text-bright)">' + esc(k.keyword) + '</span>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<span class="badge ' + scoreClass + '">수요점수 ' + score + '</span>' +
          '<button class="btn btn-sm btn-demand-refresh" data-keyword="' + esc(k.keyword) + '" title="이 키워드만 다시 분석해서 최신 데이터로 덮어쓰기" style="padding:2px 6px">🔄</button>' +
          '<button class="btn btn-sm btn-demand-delete" data-keyword="' + esc(k.keyword) + '" title="이 키워드와 딸린 리포트·시청자DNA 데이터까지 함께 삭제" style="color:#ff5577;border-color:#ff5577;padding:2px 6px">🗑️</button>' +
        '</div>' +
      '</div>' +
      '<div class="card-subtext" style="margin-top:-4px;margin-bottom:8px">마지막 분석: ' + esc(analyzedAtLabel) + '</div>' +
      '<div style="display:flex;gap:16px;margin:12px 0">' +
        '<div><span class="card-title">기회 점수</span><div style="font-size:20px;font-weight:900;color:var(--accent-cyan)">' + opp + '</div></div>' +
        '<div><span class="card-title">검색 결과수</span><div style="font-size:20px;font-weight:900;color:var(--text-normal)">' + fmt.format(k.totalResults || 0) + '</div></div>' +
        '<div><span class="card-title">표본 영상</span><div style="font-size:20px;font-weight:900;color:var(--accent-amber)">' + (k.videoCount || 0) + '개</div></div>' +
      '</div>';

    if (k.topOutliers && k.topOutliers.length > 0) {
      html += '<div style="margin-top:16px;border-top:1px solid var(--border-subtle);padding-top:12px">' +
        '<div class="card-title" style="margin-bottom:8px">⭐ 대표 아웃라이어 영상 TOP:</div>' +
        k.topOutliers.slice(0, 3).map(o => {
          const thumb = o.thumbnail || (o.videoId ? 'https://i.ytimg.com/vi/' + o.videoId + '/mqdefault.jpg' : '');
          const watchUrl = o.videoId ? 'https://www.youtube.com/watch?v=' + encodeURIComponent(o.videoId) : '';
          const otherKeywords = (videoKeywordMap[o.videoId] || []).filter(kw => kw !== k.keyword);
          const crossBadge = otherKeywords.length > 0 ?
            '<span class="badge badge-pass" style="font-size:10px;margin-left:6px;white-space:nowrap" title="다른 키워드: ' + esc(otherKeywords.join(', ')) + '">🔗 다른 ' + otherKeywords.length + '개 키워드에서도 TOP</span>' : '';
          return '<div style="background:#090e18;border:1px solid var(--border-subtle);border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;flex-direction:column;gap:8px">' +
            '<div style="display:flex;gap:12px;align-items:center">' +
              (thumb ? (watchUrl ?
                '<a href="' + esc(watchUrl) + '" target="_blank" rel="noopener" title="유튜브에서 영상 보기"><img class="thumb-mini" style="cursor:pointer" src="' + esc(thumb) + '" alt=""></a>' :
                '<img class="thumb-mini" src="' + esc(thumb) + '" alt="">') : '') +
              '<div style="flex:1;min-width:0">' +
                (watchUrl ?
                  '<a href="' + esc(watchUrl) + '" target="_blank" rel="noopener" title="유튜브에서 영상 보기" style="text-decoration:none">' +
                    '<div style="font-weight:700;font-size:13px;color:var(--text-bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer">▶ ' + esc(o.title) + '</div>' +
                  '</a>' :
                  '<div style="font-weight:700;font-size:13px;color:var(--text-bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(o.title) + '</div>') +
                '<div class="card-subtext">' + esc(o.channelTitle || o.channel) + ' · 조회수 ' + fmt.format(o.viewCount || (o.viewsPerDay ? o.viewsPerDay * (o.ageDays||1) : 0)) + '회 (' + (o.outlierRatio ? o.outlierRatio.toFixed(1) + 'x 배수' : '') + ')</div>' +
              '</div>' +
            '</div>' +
            (crossBadge ? '<div>' + crossBadge + '</div>' : '') +
            '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
              (o.commentReportFile ?
                '<button class="btn btn-sm btn-outlier-view-comment" style="background:#132032;color:#7dd3fc;border:1px solid #234361;white-space:nowrap" data-file="' + esc(o.commentReportFile) + '" title="이미 분석된 리포트가 있습니다 · 클릭하면 바로 봅니다">📄 댓글 리포트</button>' +
                '<button class="btn btn-sm btn-outlier-analyze" data-vid="' + esc(o.videoId) + '" title="댓글을 새로 다시 분석" style="padding:6px 8px">↻</button>' :
                o.commentError ?
                '<button class="btn btn-sm btn-outlier-analyze" style="white-space:nowrap;background:rgba(255,183,3,0.12);color:var(--accent-amber);border:1px solid var(--accent-amber)" data-vid="' + esc(o.videoId) + '" title="이전 시도 실패 · 클릭하면 다시 시도합니다 — ' + esc(o.commentError) + '">⚠️ 댓글 (이전 실패)</button>' :
                '<button class="btn btn-sm btn-magenta btn-outlier-analyze" style="white-space:nowrap" data-vid="' + esc(o.videoId) + '">💬 댓글</button>') +
              (o.scriptReportFile ?
                '<button class="btn btn-sm btn-outlier-view-script" style="background:#132032;color:#7dd3fc;border:1px solid #234361;white-space:nowrap" data-file="' + esc(o.scriptReportFile) + '" title="이미 분석된 리포트가 있습니다 · 클릭하면 바로 봅니다">📄 대본 리포트</button>' +
                '<button class="btn btn-sm btn-outlier-script" data-vid="' + esc(o.videoId) + '" title="대본을 새로 다시 분석" style="padding:6px 8px">↻</button>' :
                o.scriptError ?
                '<button class="btn btn-sm btn-outlier-script" style="white-space:nowrap;background:rgba(255,183,3,0.12);color:var(--accent-amber);border:1px solid var(--accent-amber)" data-vid="' + esc(o.videoId) + '" title="이전 시도 실패 · 클릭하면 다시 시도합니다 — ' + esc(o.scriptError) + '">⚠️ 대본 (이전 실패)</button>' :
                '<button class="btn btn-sm btn-cyan btn-outlier-script" style="white-space:nowrap" data-vid="' + esc(o.videoId) + '">📜 대본</button>') +
              '<button class="btn btn-sm btn-outlier-delete-video" data-keyword="' + esc(k.keyword) + '" data-vid="' + esc(o.videoId) + '" title="이 영상만 이 키워드에서 제외 — 다른 키워드에서 안 쓰이면 리포트·시청자DNA도 같이 정리" style="color:#ff5577;border-color:#ff5577;padding:6px 8px;margin-left:auto">🗑️</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    html += '</div>';
  });

  html += '</div>';
  return html;
}

function bindMarketDemandEvents() {
  const btnRun = document.getElementById('btn-run-demand-kw');
  if (btnRun) {
    btnRun.onclick = async () => {
      const kw = document.getElementById('input-demand-kw').value.trim();
      if (!kw) return alert('키워드를 입력하세요.');
      // 띄어쓰기만 다르게 입력해도 같은 키워드로 인식해야 한다(2026-09-07, 사용자 지적) —
      // 공백을 전부 제거하고 비교한다. 실제 저장은 입력한 그대로 키(map key)가 되므로, 이 검사는
      // "신규인 줄 알았는데 사실 있었다"를 막는 화면 안내일 뿐 저장 방식 자체는 안 건드린다.
      const normalizeKw = (s) => String(s || '').replace(/\s+/g, '');
      const existingIdx = (gMarketDemand?.byKeyword || []).findIndex((k) => normalizeKw(k.keyword) === normalizeKw(kw));
      if (existingIdx !== -1) {
        const existing = gMarketDemand.byKeyword[existingIdx];
        const lastAnalyzed = existing.analyzedAt ? existing.analyzedAt.slice(0, 10) : '알 수 없음(예전 데이터)';
        const proceed = confirm(
          '이미 분석된 키워드입니다: "' + existing.keyword + '" (마지막 분석: ' + lastAnalyzed + '). ' +
          '다시 분석해서 최신 데이터로 덮어쓸까요? (취소하면 기존 카드로 이동합니다)'
        );
        if (!proceed) {
          const el = document.getElementById('demand-card-' + existingIdx);
          if (el && el.scrollIntoView) el.scrollIntoView({behavior: 'smooth', block: 'center'});
          return;
        }
      }
      btnRun.disabled = true;
      btnRun.textContent = '분석 진행 중...';
      try {
        const res = await fetch('/api/market-demand/run', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({keyword: kw})
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '수요 분석 실패');
        showToast('시장 수요 분석이 완료되었습니다!');
        gMarketDemand = data.data;
        renderCurrentTab();
      } catch (err) {
        alert('❌ 오류: ' + err.message);
      } finally {
        btnRun.disabled = false;
        btnRun.textContent = '🚀 수요 분석 실행';
      }
    };
  }

  document.querySelectorAll('.copy-chip').forEach(chip => {
    chip.onclick = () => copyToClipboard(chip.dataset.copy, chip);
  });

  document.querySelectorAll('.btn-demand-refresh').forEach(btn => {
    btn.onclick = async () => {
      const keyword = btn.dataset.keyword;
      if (!keyword) return;
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = '⏳';
      try {
        const res = await fetch('/api/market-demand/run', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({keyword}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '업데이트 실패');
        gMarketDemand = data.data;
        renderCurrentTab();
        showToast('🔄 "' + keyword + '" 최신 데이터로 업데이트 완료.');
      } catch (err) {
        alert('❌ 업데이트 실패: ' + err.message);
        btn.disabled = false;
        btn.textContent = original;
      }
    };
  });

  document.querySelectorAll('.btn-demand-delete').forEach(btn => {
    btn.onclick = async () => {
      const keyword = btn.dataset.keyword;
      if (!keyword) return;
      if (!confirm('"' + keyword + '" 키워드를 삭제할까요? 다른 키워드에서 더 이상 안 쓰이는 아웃라이어 영상의 댓글/대본 리포트 파일과, 그 영상들에서만 나온 시청자DNA 항목도 함께 정리됩니다(다른 영상에서도 나온 시청자DNA 항목은 남습니다).')) return;
      btn.disabled = true;
      try {
        const res = await fetch('/api/market-demand/delete', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({keyword}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '삭제 실패');
        gMarketDemand = data.data;
        renderCurrentTab();
        const c = data.cleaned || {};
        showToast('🗑️ "' + keyword + '" 삭제 완료 — 리포트 ' + (c.reportFiles || 0) + '개, 시청자DNA ' + (c.dnaEntries || 0) + '개 정리됨.');
      } catch (err) {
        alert('❌ 삭제 실패: ' + err.message);
        btn.disabled = false;
      }
    };
  });

  // 특정 채널 지목 분석(2026-09-30) — 키워드 실행 버튼과 같은 /api/market-demand/run
  // 엔드포인트를 쓰되 body.channel로 채널 모드임을 알린다.
  const runChannelInput = async (rawInput, btnEl) => {
    const channel = String(rawInput || '').trim();
    if (!channel) return alert('채널 URL 또는 @핸들을 입력하세요.');
    const originalText = btnEl ? btnEl.innerHTML : '';
    if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '⏳ 분석 중...'; }
    try {
      const res = await fetch('/api/market-demand/run', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({channel}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '채널 분석 실패');
      gMarketDemand = data.data;
      renderCurrentTab();
      showToast('🔎 채널 분석 완료.');
    } catch (err) {
      alert('❌ 채널 분석 오류: ' + err.message);
    } finally {
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = originalText; }
    }
  };

  const btnRunChannel = document.getElementById('btn-run-demand-channel');
  if (btnRunChannel) {
    btnRunChannel.onclick = () => {
      const input = document.getElementById('input-demand-channel');
      runChannelInput(input ? input.value : '', btnRunChannel);
    };
  }

  document.querySelectorAll('.btn-channel-refresh').forEach(btn => {
    btn.onclick = () => runChannelInput(btn.dataset.input, btn);
  });

  document.querySelectorAll('.btn-channel-delete').forEach(btn => {
    btn.onclick = async () => {
      const channelId = btn.dataset.channelId;
      if (!channelId) return;
      if (!confirm('이 채널을 추적 목록에서 제거할까요?')) return;
      btn.disabled = true;
      try {
        const res = await fetch('/api/market-demand/delete-channel', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({channelId}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '삭제 실패');
        gMarketDemand = data.data;
        renderCurrentTab();
        showToast('🗑️ 채널 추적 목록에서 제거됨.');
      } catch (err) {
        alert('❌ 삭제 실패: ' + err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('.btn-outlier-delete-video').forEach(btn => {
    btn.onclick = async () => {
      const keyword = btn.dataset.keyword;
      const videoId = btn.dataset.vid;
      if (!keyword || !videoId) return;
      if (!confirm('이 영상을 "' + keyword + '" 키워드에서 제외할까요? 다른 키워드에서 더 이상 안 쓰이면 댓글/대본 리포트 파일과 시청자DNA 항목도 함께 정리됩니다.')) return;
      btn.disabled = true;
      try {
        const res = await fetch('/api/market-demand/delete-video', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({keyword, videoId}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '삭제 실패');
        gMarketDemand = data.data;
        renderCurrentTab();
        const c = data.cleaned || {};
        const cleanedMsg = c.orphanedVideos ? (' — 리포트 ' + (c.reportFiles || 0) + '개, 시청자DNA ' + (c.dnaEntries || 0) + '개 정리됨.') : ' (다른 키워드에서 계속 쓰여서 리포트·DNA는 남겨둠).';
        showToast('🗑️ 영상 제외 완료' + cleanedMsg);
      } catch (err) {
        alert('❌ 삭제 실패: ' + err.message);
        btn.disabled = false;
      }
    };
  });

  document.querySelectorAll('.btn-outlier-analyze').forEach(btn => {
    btn.onclick = () => triggerCommentAnalysis(btn.dataset.vid);
  });

  document.querySelectorAll('.btn-outlier-script').forEach(btn => {
    btn.onclick = () => triggerScriptAnalysis(btn.dataset.vid);
  });
}
function renderOutlierLabTab() {
  const isComments = gAiLabSubTab === 'comments';
  const isScripts = gAiLabSubTab === 'scripts';
  const isBrandLinter = gAiLabSubTab === 'brand-linter';

  let subtabControlsHtml = '';
  if (isComments) {
    subtabControlsHtml = '<div style="margin-top:18px">' +
      '<div class="card-subtext" style="margin-bottom:8px">시청자가 실제로 헷갈린 문장, 질문, 생생한 어휘(Mental Model)를 분석합니다.</div>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
        '<input type="text" id="input-ai-kw" placeholder="키워드 분석 (예: WANT TO 축약, 영어 연음)" style="flex:1;min-width:240px">' +
        '<button class="btn btn-magenta" id="btn-run-ai-kw">🚀 키워드 아웃라이어 분석</button>' +
        '<input type="text" id="input-ai-url" placeholder="유튜브 URL 직접 입력 (https://...)" style="flex:1;min-width:240px">' +
        '<button class="btn btn-cyan" id="btn-run-ai-url">🔎 URL 댓글 분석</button>' +
      '</div>' +
    '</div>';
  } else if (isScripts) {
    subtabControlsHtml = '<div style="margin-top:18px">' +
      '<div class="card-subtext" style="margin-bottom:8px">유튜브 자막을 1-Click 추출하여 <b>[도입부 후킹 구조] + [핵심 비유법] + [대본 타임라인] + [우리 채널 맞춤 대본]</b>을 역설계합니다.</div>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
        '<input type="text" id="input-script-url" placeholder="유튜브 URL 또는 영상 ID 입력 (https://youtube.com/watch?v=...)" style="flex:1;min-width:300px">' +
        '<button class="btn btn-cyan" id="btn-run-script-analyze">🚀 대본 역설계 & 맞춤 대본 생성</button>' +
      '</div>' +
    '</div>';
  } else {
    const charCount = (gBrandScriptText || '').length;
    const estSec = Math.round(charCount / 5.3);

    subtabControlsHtml = '<div style="margin-top:18px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">' +
        '<div class="card-subtext">3060 맞춤 <b>[도파민 3단계 공식]</b>과 <b>[HyperFrames 씬 규격]</b>을 엄격하게 심사하고 즉시 제작용 JSON으로 변환합니다.</div>' +
        '<div style="display:flex;gap:6px;">' +
          '<button class="btn btn-sm" id="btn-brand-linter-sample-shorts">📱 쇼츠 3060 샘플</button>' +
          '<button class="btn btn-sm" id="btn-brand-linter-sample-long">📺 롱폼 3060 샘플</button>' +
          '<button class="btn btn-sm btn-amber" id="btn-brand-linter-clear">🗑️ 비우기</button>' +
        '</div>' +
      '</div>' +

      '<div style="display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px;">' +
        '<div>' +
          '<div style="font-size:11px;font-weight:700;color:var(--accent-amber);margin-bottom:4px;">📌 영상 주제 / 핵심 키워드</div>' +
          '<input type="text" id="input-brand-linter-topic" value="' + esc(gBrandScriptTopic) + '" placeholder="예: 30초 만에 Want vs Wont 발음 구분법" style="width:100%;">' +
        '</div>' +
        '<div>' +
          '<div style="font-size:11px;font-weight:700;color:var(--accent-cyan);margin-bottom:4px;">🎬 영상 포맷</div>' +
          '<select id="select-brand-linter-format" style="width:100%;">' +
            '<option value="SHORTS"' + (gBrandScriptFormat === 'SHORTS' ? ' selected' : '') + '>📱 쇼츠 (9:16 / 60초 미만)</option>' +
            '<option value="LONGFORM"' + (gBrandScriptFormat === 'LONGFORM' ? ' selected' : '') + '>📺 롱폼 (16:9 / 3~8분)</option>' +
          '</select>' +
        '</div>' +
      '</div>' +

      '<div style="margin-bottom:12px;">' +
        '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">' +
          '<span style="font-weight:700;color:var(--text-bright);">✍️ 심사할 대본 원문 입력 (줄바꿈 = 씬 분절 기준)</span>' +
          '<span id="brand-linter-char-stats" style="color:var(--accent-cyan);font-weight:700;">총 ' + charCount + '자 · 예상 낭독시간 약 ' + estSec + '초</span>' +
        '</div>' +
        '<textarea id="textarea-brand-linter-script" style="width:100%;height:180px;font-size:13px;line-height:1.6;font-family:monospace;background:#060910;border:1px solid var(--border-subtle);border-radius:10px;padding:12px;color:#fff;" placeholder="심사할 대본을 입력하세요...">' + esc(gBrandScriptText) + '</textarea>' +
      '</div>' +

      '<div style="display:flex;justify-content:flex-end;">' +
        '<button class="btn btn-magenta" id="btn-run-brand-linter" style="font-size:14px;padding:10px 24px;font-weight:800;">' +
          '🚀 3060 브랜드 도파민 린팅 & HyperFrames 씬 JSON 생성' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  return '<div class="bento-grid">' +
    '<div class="bento-card highlight-cyan col-12">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">' +
        '<div>' +
          '<div class="card-title" style="color:var(--accent-cyan)">GEMINI AUDIENCE & SCRIPT INTELLIGENCE</div>' +
          '<h2 style="font-family:var(--font-display);font-size:24px;color:var(--text-bright);margin-top:2px">🤖 아웃라이어 영상 댓글 & 대본 AI 심층 분석실</h2>' +
          '<p style="color:var(--text-normal);margin-top:4px;font-size:13px">시청자의 생생한 질문·고통(VoC)과 경쟁 채널의 대본 전개 공식을 역설계하여 &lsquo;이해하면 쉬운영어&rsquo;만의 대본 템플릿과 HyperFrames 씬을 도출합니다.</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;background:rgba(0,0,0,0.5);padding:4px;border-radius:10px;border:1px solid var(--border-subtle);flex-wrap:wrap;">' +
          '<button class="tab-pill' + (isComments ? ' active' : '') + '" id="subtab-btn-comments">💬 1. 댓글 VoC 분석</button>' +
          '<button class="tab-pill' + (isScripts ? ' active' : '') + '" id="subtab-btn-scripts">📜 2. 경쟁사 대본 역설계</button>' +
          '<button class="tab-pill' + (isBrandLinter ? ' active' : '') + '" id="subtab-btn-brand-linter" style="' + (isBrandLinter ? 'border-color:var(--accent-magenta);color:var(--accent-magenta);' : '') + '">✨ 3. 3060 대본 린터 & HyperFrames</button>' +
        '</div>' +
      '</div>' +

      subtabControlsHtml +

      '<div id="ai-lab-status" style="display:none;margin-top:14px;padding:12px 16px;background:rgba(0,240,255,0.1);border:1px solid var(--accent-cyan);border-radius:10px;color:var(--text-bright);font-weight:700">' +
        '⏳ <span id="ai-lab-status-text">Gemini AI 심층 분석 중입니다... (약 5~10초 소요)</span>' +
      '</div>' +
    '</div>' +

    '<div class="bento-card col-12" id="ai-results-container"' + (isBrandLinter && gBrandScriptLinterResult ? '' : ' style="display:none"') + '>' +
      (isBrandLinter && gBrandScriptLinterResult ? renderBrandLinterResults(gBrandScriptLinterResult) : '') +
    '</div>' +

    (!isBrandLinter ? 
      '<div class="bento-card col-12">' +
        '<div class="card-header">' +
          '<span class="card-title">' + (isComments ? '📑 생성된 댓글 기획 리포트 아카이브' : '📜 생성된 대본 역설계 리포트 아카이브') + '</span>' +
          '<button class="btn btn-sm" id="btn-refresh-ai-reports">↻ 리포트 목록 새로고침</button>' +
        '</div>' +
        '<div id="saved-reports-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:12px"></div>' +
      '</div>' : '') +
  '</div>';
}

function renderBrandLinterResults(r) {
  if (!r) return '';
  const isPass = r.score >= 80;
  const badgeClass = r.score >= 90 ? 'badge-strong-pass' : r.score >= 80 ? 'badge-pass' : 'badge-revise';
  const scenes = r.hyperFramesScenes || [];

  const typeColorMap = {
    hook: 'var(--accent-magenta)',
    rule: 'var(--accent-cyan)',
    expand: 'var(--accent-amber)',
    twist: '#ff4d4d',
    outro: 'var(--accent-emerald)',
  };

  const typeNameMap = {
    hook: '1. HOOK (3초 후킹)',
    rule: '2. RULE (소리 지름길 원리)',
    expand: '3. EXPAND (패턴 확장 쾌감)',
    twist: '4. TWIST (반전 꿀팁)',
    outro: '5. OUTRO (힐링 & 구독)',
  };

  let html = '<div style="display:grid; gap:18px;">' +
    /* CARD 1: 3060 SCOREBOARD */
    '<div style="background:#080c14; border:1px solid ' + (isPass ? 'var(--accent-cyan)' : 'var(--accent-amber)') + '; border-radius:14px; padding:20px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">' +
        '<div>' +
          '<div class="card-title" style="color:var(--accent-cyan)">3060 BRAND DOPAMINE & READABILITY SCORECARD</div>' +
          '<h3 style="font-family:var(--font-display); font-size:22px; color:#fff; margin-top:2px;">' +
            '🏆 대본 종합 점수: <span style="color:' + (isPass ? 'var(--accent-cyan)' : 'var(--accent-amber)') + '">' + r.score + '점</span> (' + esc(r.grade || 'B') + ' 등급)' +
          '</h3>' +
        '</div>' +
        '<span class="badge ' + badgeClass + '" style="font-size:13px; padding:6px 14px;">' + (isPass ? '✅ 3060 제작 승인 (PASS)' : '⚠️ 도파민 보완 권장 (REVISE)') + '</span>' +
      '</div>' +
      '<p style="color:var(--text-normal); font-size:13px; line-height:1.5; margin-bottom:16px;">' + esc(r.summary || '') + '</p>' +

      /* 3 Stages Dopamine Grid */
      '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px; margin-bottom:16px;">' +
        '<div style="background:rgba(255,42,109,0.08); border:1px solid rgba(255,42,109,0.25); border-radius:10px; padding:12px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
            '<b style="color:var(--accent-magenta); font-size:12px;">⚡ 1단계: 게으른 혀의 소리 지름길</b>' +
            (r.dopamineStages?.stage1_shortcut?.present ? '<span class="badge badge-pass" style="font-size:9px">충족</span>' : '<span class="badge badge-hold" style="font-size:9px">미흡</span>') +
          '</div>' +
          '<div style="font-size:11px; color:var(--text-normal); line-height:1.4;">' + esc(r.dopamineStages?.stage1_shortcut?.note || '원리 해제 설명') + '</div>' +
        '</div>' +

        '<div style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.25); border-radius:10px; padding:12px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
            '<b style="color:var(--accent-cyan); font-size:12px;">🚀 2단계: 패턴 확장 (카타르시스)</b>' +
            (r.dopamineStages?.stage2_expansion?.present ? '<span class="badge badge-pass" style="font-size:9px">충족</span>' : '<span class="badge badge-hold" style="font-size:9px">미흡</span>') +
          '</div>' +
          '<div style="font-size:11px; color:var(--text-normal); line-height:1.4;">' + esc(r.dopamineStages?.stage2_expansion?.note || '단어 확장 쾌감') + '</div>' +
        '</div>' +

        '<div style="background:rgba(255,184,0,0.08); border:1px solid rgba(255,184,0,0.25); border-radius:10px; padding:12px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
            '<b style="color:var(--accent-amber); font-size:12px;">💡 3단계: 반전 꿀팁 (미세한 차이)</b>' +
            (r.dopamineStages?.stage3_twist?.present ? '<span class="badge badge-pass" style="font-size:9px">충족</span>' : '<span class="badge badge-hold" style="font-size:9px">미흡</span>') +
          '</div>' +
          '<div style="font-size:11px; color:var(--text-normal); line-height:1.4;">' + esc(r.dopamineStages?.stage3_twist?.note || '예외/차이점 꿀팁') + '</div>' +
        '</div>' +
      '</div>' +

      /* Readability Stats */
      '<div style="display:flex; gap:12px; flex-wrap:wrap; font-size:12px; background:#04060a; padding:10px 14px; border-radius:8px; border:1px solid var(--border-subtle);">' +
        '<span>👓 <b>한 줄 평균 글자수:</b> ' + (r.readabilityCheck?.avgCharsPerLine || 0) + '자 ' + ((r.readabilityCheck?.avgCharsPerLine || 0) <= 28 ? '<span style="color:var(--accent-cyan); font-weight:700;">(3060 낭독 최적)</span>' : '<span style="color:var(--accent-amber); font-weight:700;">(다소 긺)</span>') + '</span> · ' +
        '<span>🚫 <b>어려운 음성학/문법 용어:</b> ' + ((r.readabilityCheck?.jargonWordsFound?.length || 0) === 0 ? '<span style="color:var(--accent-emerald); font-weight:700;">0건 (완벽 차단)</span>' : '<span style="color:var(--accent-magenta); font-weight:700;">' + esc(r.readabilityCheck.jargonWordsFound.join(', ')) + '</span>') + '</span> · ' +
        '<span>🎵 <b>3060 낭독 리듬감:</b> <b style="color:var(--accent-cyan);">' + (r.readabilityCheck?.rhythmScore || 90) + '점</b></span>' +
      '</div>' +
    '</div>';

    /* CARD 2: VIOLATIONS & POLISHED SCRIPT */
    if (r.violations && r.violations.length > 0) {
      html += '<div style="background:#080c14; border:1px solid rgba(255,100,100,0.3); border-radius:14px; padding:18px;">' +
        '<div class="card-title" style="color:#ff7676; margin-bottom:10px;">⚠️ 위반 항목 & 3060 브랜드 교정 진단 (' + r.violations.length + '건)</div>' +
        '<div style="display:grid; gap:8px; margin-bottom:16px;">' +
          r.violations.map(v => 
            '<div style="background:#05070c; border:1px solid var(--border-subtle); border-radius:8px; padding:10px 12px; font-size:12px; line-height:1.4;">' +
              '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                '<span style="color:#ff7676; font-weight:700;">' + (v.lineIndex ? ('#' + v.lineIndex + '행: ') : '') + esc(v.type || '위반') + '</span>' +
                (v.lineText ? '<span style="color:var(--text-muted); font-size:11px;">원문: &ldquo;' + esc(v.lineText.slice(0, 25)) + '...&rdquo;</span>' : '') +
              '</div>' +
              '<div style="color:var(--text-bright); margin-bottom:4px;">' + esc(v.message || '') + '</div>' +
              (v.suggestedFix ? '<div style="color:var(--accent-cyan); background:rgba(0,240,255,0.06); padding:6px 8px; border-radius:6px;">💡 <b>추천 교정:</b> &ldquo;' + esc(v.suggestedFix) + '&rdquo;</div>' : '') +
            '</div>'
          ).join('') +
        '</div>' +
      '</div>';
    }

    if (r.improvedScript) {
      html += '<div style="background:#080c14; border:1px solid var(--accent-emerald); border-radius:14px; padding:18px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">' +
          '<div class="card-title" style="color:var(--accent-emerald);">✨ 3060 브랜드 맞춤 100% 교정 대본 전문</div>' +
          '<div style="display:flex; gap:6px;">' +
            '<button class="btn btn-sm btn-cyan btn-apply-improved-script" data-script="' + encodeURIComponent(r.improvedScript) + '">✍️ 위 에디터에 반영</button>' +
            '<button class="btn btn-sm btn-magenta btn-copy-text" data-text="' + encodeURIComponent(r.improvedScript) + '">📋 교정 대본 복사</button>' +
          '</div>' +
        '</div>' +
        '<pre style="background:#020408; border:1px solid #1a2234; border-radius:8px; padding:14px; color:#fff; font-size:12px; line-height:1.6; white-space:pre-wrap; font-family:monospace; margin:0;">' + esc(r.improvedScript) + '</pre>' +
      '</div>';
    }

    /* CARD 3: HYPERFRAMES SCENE CARDS PREVIEW & ACTIONS */
    if (scenes.length > 0) {
      html += '<div style="background:#090d16; border:1px solid var(--accent-magenta); border-radius:14px; padding:20px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">' +
          '<div>' +
            '<div class="card-title" style="color:var(--accent-magenta)">🎬 HYPERFRAMES SCENE JSON & CYBER-HUD CARDS (' + scenes.length + '개 씬 분절 완료)</div>' +
            '<h3 style="font-family:var(--font-display); font-size:18px; color:#fff; margin-top:2px;">⚡ HyperFrames 비주얼 씬 규격</h3>' +
          '</div>' +
          '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
            '<button class="btn btn-sm btn-magenta" id="btn-export-scenes-json">💾 scenes.json 파일 저장</button>' +
            '<button class="btn btn-sm btn-cyan btn-copy-text" data-text="' + encodeURIComponent(JSON.stringify(scenes, null, 2)) + '">📋 씬 JSON 복사</button>' +
            '<button class="btn btn-sm btn-amber" id="btn-send-scenes-to-ab" data-topic="' + encodeURIComponent(gBrandScriptTopic) + '">🎯 A/B 시뮬레이터로 연동</button>' +
          '</div>' +
        '</div>' +

        /* Scene Visual Cards */
        '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:12px; margin-bottom:16px;">' +
          scenes.map(sc => {
            const scColor = typeColorMap[sc.type] || 'var(--accent-cyan)';
            const scName = typeNameMap[sc.type] || ('Scene ' + sc.sceneIndex);
            return '<div style="background:#05070c; border:1px solid ' + scColor + '; border-radius:12px; padding:14px; display:flex; flex-direction:column; justify-content:space-between; box-shadow:0 4px 15px rgba(0,0,0,0.5);">' +
              '<div>' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
                  '<span class="badge" style="background:rgba(0,0,0,0.4); border-color:' + scColor + '; color:' + scColor + '; font-size:10px; font-weight:800;">' + scName + '</span>' +
                  '<span style="color:#aaa; font-size:11px; font-weight:700;">⏱️ ' + (sc.durationSec || 6) + '초</span>' +
                '</div>' +

                '<div style="font-size:13px; font-weight:700; color:#fff; line-height:1.45; margin-bottom:10px; background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:6px;">' +
                  '&ldquo;' + esc(sc.spokenText || '') + '&rdquo;' +
                '</div>' +

                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:11px; margin-bottom:8px;">' +
                  '<div style="background:#0a0e18; padding:6px 8px; border-radius:6px; border:1px solid #1a2234;"><span style="color:var(--text-muted);">카드 타이틀:</span> <b style="color:var(--text-bright);">' + esc(sc.cardTitle || '') + '</b></div>' +
                  '<div style="background:#0a0e18; padding:6px 8px; border-radius:6px; border:1px solid #1a2234;"><span style="color:var(--text-muted);">키워드:</span> <b style="color:' + scColor + ';">' + esc(sc.highlightWord || '') + '</b></div>' +
                '</div>' +
              '</div>' +

              (sc.onScreenVisualTip ? 
                '<div style="font-size:10px; color:var(--accent-cyan); background:rgba(0,240,255,0.05); padding:6px 8px; border-radius:6px; border:1px dashed rgba(0,240,255,0.2);">' +
                  '🎨 <b>비주얼 룩:</b> ' + esc(sc.onScreenVisualTip) +
                '</div>' : '') +
            '</div>';
          }).join('') +
        '</div>' +

        /* JSON collapsible box */
        '<details style="background:#020408; border:1px solid var(--border-subtle); border-radius:8px; padding:10px;">' +
          '<summary style="color:var(--text-muted); font-size:11px; font-weight:700; cursor:pointer;">🔍 HyperFrames 씬 원본 JSON 코드 보기 (' + scenes.length + ' scenes)</summary>' +
          '<pre style="color:#00f0ff; font-size:11px; font-family:monospace; line-height:1.4; max-height:220px; overflow-y:auto; margin-top:8px; white-space:pre-wrap;">' + esc(JSON.stringify(scenes, null, 2)) + '</pre>' +
        '</details>' +
      '</div>';
    }

  html += '</div>';
  return html;
}

// 댓글/대본 분석이 끝난 직후 그 결과로 갱신되는 두 화면(시장 수요 레이더 / 데이터 자산)의 캐시를
// 조용히 새로고침한다 — 분석은 보통 시장 수요 카드에서 시작해서 아웃라이어 랩 탭으로 넘어와
// 진행되는데, 분석 전에 불러온 gMarketDemand/gKnowledgeDb는 새로 생긴 리포트 파일과
// audience-dna.json 항목을 모르는 상태 그대로라 그 탭들로 돌아가도 안 바뀌는 문제가 있었다
// (2026-09-07, 시장 수요 쪽은 사용자 지적으로 발견 — 데이터 자산도 gKnowledgeDb가 초기 로드
// 때와 삭제할 때만 갱신되고 분석 후엔 안 갱신되는 같은 구조라 같이 고침). 지금 보이는 탭을
// 다시 그리지는 않고 데이터만 갱신 — 다음에 그 탭으로 전환할 때 자동으로 최신 상태로 뜬다.
async function refreshAnalysisDerivedDataSilently() {
  try {
    const [demandRes, kdbRes] = await Promise.all([
      fetch('/api/market-demand'),
      fetch('/api/knowledge-db'),
    ]);
    if (demandRes.ok) gMarketDemand = await demandRes.json();
    if (kdbRes.ok) gKnowledgeDb = await kdbRes.json();
  } catch (err) {
    console.warn('Failed to refresh market demand / knowledge DB after analysis:', err);
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

function triggerScriptAnalysis(vidOrUrl) {
  if (!vidOrUrl || vidOrUrl === 'undefined') return alert('유효한 영상 ID 또는 URL이 없습니다.');
  const fullUrl = /^[A-Za-z0-9_-]{11}$/.test(vidOrUrl) ? ('https://youtu.be/' + vidOrUrl) : vidOrUrl;
  gAiLabSubTab = 'scripts';
  switchTab('tab-outlier');
  runScriptAnalysis(fullUrl);
}

function triggerCommentAnalysis(vidOrUrl) {
  if (!vidOrUrl || vidOrUrl === 'undefined') return alert('유효한 영상 ID 또는 URL이 없습니다.');
  const fullUrl = /^[A-Za-z0-9_-]{11}$/.test(vidOrUrl) ? ('https://youtu.be/' + vidOrUrl) : vidOrUrl;
  gAiLabSubTab = 'comments';
  switchTab('tab-outlier');
  const urlInput = document.getElementById('input-ai-url');
  if (urlInput) urlInput.value = fullUrl;
  runAiCommentAnalysis({url: fullUrl});
}

function bindOutlierLabEvents() {
  const subtabComments = document.getElementById('subtab-btn-comments');
  const subtabScripts = document.getElementById('subtab-btn-scripts');
  const subtabBrandLinter = document.getElementById('subtab-btn-brand-linter');

  if (subtabComments) subtabComments.onclick = () => { 
    gAiLabSubTab = 'comments'; 
    try { localStorage.setItem('ihm_ailab_subtab', 'comments'); } catch (_) {}
    renderCurrentTab(); 
  };
  if (subtabScripts) subtabScripts.onclick = () => { 
    gAiLabSubTab = 'scripts'; 
    try { localStorage.setItem('ihm_ailab_subtab', 'scripts'); } catch (_) {}
    renderCurrentTab(); 
  };
  if (subtabBrandLinter) subtabBrandLinter.onclick = () => { 
    gAiLabSubTab = 'brand-linter'; 
    try { localStorage.setItem('ihm_ailab_subtab', 'brand-linter'); } catch (_) {}
    renderCurrentTab(); 
  };

  // 1. Comments Subtab Events
  const btnKw = document.getElementById('btn-run-ai-kw');
  if (btnKw) btnKw.onclick = () => {
    const kw = document.getElementById('input-ai-kw')?.value.trim();
    if (!kw) return alert('키워드를 입력하세요.');
    runAiCommentAnalysis({keyword: kw});
  };

  const btnUrl = document.getElementById('btn-run-ai-url');
  if (btnUrl) btnUrl.onclick = () => {
    const url = document.getElementById('input-ai-url')?.value.trim();
    if (!url) return alert('유튜브 URL을 입력하세요.');
    runAiCommentAnalysis({url});
  };

  // 2. Script Subtab Events
  const btnScript = document.getElementById('btn-run-script-analyze');
  if (btnScript) btnScript.onclick = () => {
    const urlInput = document.getElementById('input-script-url');
    const targetUrl = urlInput ? urlInput.value.trim() : '';
    runScriptAnalysis(targetUrl);
  };

  // 3. Brand Linter Subtab Events
  const topicInput = document.getElementById('input-brand-linter-topic');
  if (topicInput) topicInput.oninput = (e) => {
    gBrandScriptTopic = e.target.value;
    saveBrandLinterState();
  };

  const formatSelect = document.getElementById('select-brand-linter-format');
  if (formatSelect) formatSelect.onchange = (e) => {
    gBrandScriptFormat = e.target.value;
    saveBrandLinterState();
  };

  const scriptTextarea = document.getElementById('textarea-brand-linter-script');
  if (scriptTextarea) {
    scriptTextarea.oninput = (e) => {
      gBrandScriptText = e.target.value;
      saveBrandLinterState();
      const stats = document.getElementById('brand-linter-char-stats');
      if (stats) {
        const cLen = gBrandScriptText.length;
        const est = Math.round(cLen / 5.3);
        stats.textContent = '총 ' + cLen + '자 · 예상 낭독시간 약 ' + est + '초';
      }
    };
  }

  // Sample Buttons
  const btnSampleShorts = document.getElementById('btn-brand-linter-sample-shorts');
  if (btnSampleShorts) {
    btnSampleShorts.onclick = () => {
      gBrandScriptFormat = 'SHORTS';
      gBrandScriptTopic = ${JSON.stringify(BRAND_LINTER_SAMPLE_SHORTS_TOPIC)};
      gBrandScriptText = ${JSON.stringify(BRAND_LINTER_SAMPLE_SHORTS_TEXT)};
      saveBrandLinterState();
      renderCurrentTab();
      showToast('📱 쇼츠 3060 도파민 샘플 대본이 로드되었습니다!');
    };
  }

  const btnSampleLong = document.getElementById('btn-brand-linter-sample-long');
  if (btnSampleLong) {
    btnSampleLong.onclick = () => {
      gBrandScriptFormat = 'LONGFORM';
      gBrandScriptTopic = ${JSON.stringify(BRAND_LINTER_SAMPLE_LONG_TOPIC)};
      gBrandScriptText = ${JSON.stringify(BRAND_LINTER_SAMPLE_LONG_TEXT)};
      saveBrandLinterState();
      renderCurrentTab();
      showToast('📺 롱폼 3060 도파민 샘플 대본이 로드되었습니다!');
    };
  }

  const btnClear = document.getElementById('btn-brand-linter-clear');
  if (btnClear) {
    btnClear.onclick = () => {
      if (confirm('대본 에디터를 비우시겠습니까?')) {
        gBrandScriptText = '';
        gBrandScriptLinterResult = null;
        saveBrandLinterState();
        renderCurrentTab();
      }
    };
  }

  // Run Brand Linter Button
  const btnRunLinter = document.getElementById('btn-run-brand-linter');
  if (btnRunLinter) {
    btnRunLinter.onclick = async () => {
      const scriptText = (gBrandScriptText || '').trim();
      if (!scriptText) return alert('심사할 대본을 입력하세요.');

      const statusBox = document.getElementById('ai-lab-status');
      const statusText = document.getElementById('ai-lab-status-text');
      const resultsContainer = document.getElementById('ai-results-container');

      if (statusBox) statusBox.style.display = 'block';
      if (statusText) statusText.textContent = 'Gemini AI가 3060 브랜드 도파민 3단계 공식 및 HyperFrames 씬 규격을 정밀 심사 중입니다... (약 3~5초 소요)';
      btnRunLinter.disabled = true;

      try {
        const res = await fetch('/api/brand-script/lint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scriptText,
            topic: gBrandScriptTopic,
            format: gBrandScriptFormat,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '대본 심사에 실패했습니다.');

        gBrandScriptLinterResult = data.result;
        saveBrandLinterState();

        if (statusBox) statusBox.style.display = 'none';
        if (resultsContainer) {
          resultsContainer.style.display = 'block';
          resultsContainer.innerHTML = renderBrandLinterResults(data.result);
          resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        showToast('🎉 3060 브랜드 대본 린팅 및 HyperFrames 씬 생성이 완료되었습니다!');
      } catch (err) {
        if (statusBox) statusBox.style.display = 'block';
        if (statusText) statusText.innerHTML = '<span style="color:#ff7676">❌ ' + esc(err.message) + '</span>';
      } finally {
        btnRunLinter.disabled = false;
      }
    };
  }

  // Dynamic Button Listeners for results
  document.querySelectorAll('.btn-apply-improved-script').forEach(btn => {
    btn.onclick = () => {
      const script = decodeURIComponent(btn.dataset.script || '');
      gBrandScriptText = script;
      saveBrandLinterState();
      renderCurrentTab();
      showToast('✍️ 교정된 대본이 에디터에 반영되었습니다!');
    };
  });

  document.querySelectorAll('.btn-copy-text').forEach(btn => {
    btn.onclick = () => {
      const text = decodeURIComponent(btn.dataset.text || '');
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
        showToast('📋 복사되었습니다!');
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('📋 복사되었습니다!');
      }
    };
  });

  const btnExportScenes = document.getElementById('btn-export-scenes-json');
  if (btnExportScenes && gBrandScriptLinterResult?.hyperFramesScenes) {
    btnExportScenes.onclick = async () => {
      try {
        const res = await fetch('/api/brand-script/export-scenes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenes: gBrandScriptLinterResult.hyperFramesScenes,
            topic: gBrandScriptTopic,
            format: gBrandScriptFormat,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '저장 실패');
        showToast('💾 [' + data.filename + '] 파일이 output/scenes/ 에 성공적으로 저장되었습니다!');
      } catch (err) {
        alert('저장 오류: ' + err.message);
      }
    };
  }

  const btnSendToAb = document.getElementById('btn-send-scenes-to-ab');
  if (btnSendToAb) {
    btnSendToAb.onclick = () => {
      const topic = decodeURIComponent(btnSendToAb.dataset.topic || gBrandScriptTopic);
      gAbTopic = topic;
      gAbFormat = gBrandScriptFormat;
      gAbVariants[0].title = topic + ' (핵심 소리 원리 1초 완성)';
      gAbVariants[1].title = '원어민이 ' + topic.slice(0, 10) + ' 발음할 때 절대 모르는 비밀 #영어발음';
      gAbVariants[2].title = topic + '? 딱 1가지만 기억하세요! 귀가 뚫리는 공식';
      saveAbSimulatorState();
      switchTab('tab-ab-simulator');
      showToast('🎯 린팅된 주제가 A/B 시뮬레이터에 연동되었습니다!');
    };
  }

  const refreshBtn = document.getElementById('btn-refresh-ai-reports');
  if (refreshBtn) {
    refreshBtn.onclick = () => {
      if (gAiLabSubTab === 'comments') loadSavedReportsList();
      else if (gAiLabSubTab === 'scripts') loadSavedScriptReportsList();
    };
  }

  if (gAiLabSubTab === 'comments') {
    loadSavedReportsList();
  } else if (gAiLabSubTab === 'scripts') {
    loadSavedScriptReportsList();
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

  eps.forEach(ep => {
    const long = ep.tracks?.longform?.youtube || {};
    const shortsA = ep.tracks?.['shorts-a']?.youtube || {};
    const shortsB = ep.tracks?.['shorts-b']?.youtube || {};
    // 로컬 후보 썸네일(우리가 직접 만든 파일, 항상 로드됨)을 우선 쓰고, 없을 때만 유튜브 CDN
    // 썸네일로 폴백한다. CDN 썸네일(i.ytimg.com)은 videoId가 있어도 영상이 아직 비공개/예약
    // 상태면 안 나온다 — 2026-09-11 확인: 업로드 직후(공개 전) EP13·EP14가 깨진 이미지로
    // 보이는 버그였음(videoId 유무만으로 CDN을 쓰던 예전 로직의 문제).
    const thumbUrl = long.thumbnailCandidates?.[0]
      || (long.videoId ? 'https://i.ytimg.com/vi/' + long.videoId + '/mqdefault.jpg' : '');
    const isCandidateThumb = !long.videoId;
    const statusText = ep.tracks?.longform?.statusLabel || ep.tracks?.longform?.status || 'READY';

    html += '<div class="bento-card col-3">' +
      (thumbUrl ? '<div style="position:relative;margin-bottom:14px">' +
        '<img class="thumb-img" src="' + esc(thumbUrl) + '" alt="">' +
        (isCandidateThumb ? '<span style="position:absolute;top:8px;left:8px;background:rgba(5,7,12,0.85);color:var(--text-bright);font-size:11px;padding:3px 8px;border-radius:6px">시안 후보</span>' : '') +
      '</div>' : '') +
      '<div class="card-header">' +
        '<span style="font-family:var(--font-display);font-size:17px;font-weight:800;color:var(--text-bright);white-space:nowrap">' + esc(ep.season.toUpperCase()) + ' · ' + esc(ep.episode.toUpperCase()) + '</span>' +
        '<span class="badge badge-pass" style="white-space:nowrap">' + esc(statusText) + '</span>' +
      '</div>' +
      '<div style="font-weight:700;font-size:15px;color:var(--text-normal);margin-bottom:10px;line-height:1.4">' + esc(long.title || '(제목 미지정)') + '</div>' +
      '<div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">' +
        (long.videoId ? '<span class="tag-chip">롱폼: ' + esc(long.videoId) + '</span>' : '') +
        (shortsA.videoId ? '<span class="tag-chip">쇼츠A: ' + esc(shortsA.videoId) + '</span>' : '') +
        (shortsB.videoId ? '<span class="tag-chip">쇼츠B: ' + esc(shortsB.videoId) + '</span>' : '') +
      '</div>' +
      '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-sm btn-magenta btn-inspect-pkg" data-season="' + esc(ep.season) + '" data-ep="' + esc(ep.episode) + '">📦 업로드 패키지 열기</button>' +
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

/* TAB 5: 48H EVALUATIONS */
function renderEvaluationsTab() {
  const evals = gDashboard?.evaluations48h?.evaluations || [];
  return '<div class="bento-grid">' +
    '<div class="bento-card col-12">' +
      '<div class="card-title" style="color:var(--accent-amber)">48H DECISION ENGINE</div>' +
      '<h2 style="font-family:var(--font-display);font-size:22px;color:var(--text-bright);margin-top:2px">⚖️ 업로드 48시간 사후 판정 스코어보드</h2>' +
      '<div class="card-subtext">업로드 후 48시간 기준 시청률과 유지율을 기반으로 자동 분류된 판정 결과입니다.</div>' +
    '</div>' +
    (evals.length > 0 ? evals.map(e => {
      const bClass = e.decisionStatus === 'strong-pass' ? 'badge-strong-pass' : e.decisionStatus === 'pass' ? 'badge-pass' : e.decisionStatus === 'hold' ? 'badge-hold' : 'badge-revise';
      const thumb = e.videoId ? 'https://i.ytimg.com/vi/' + e.videoId + '/mqdefault.jpg' : '';
      return '<div class="bento-card col-4">' +
        (thumb ? '<img class="thumb-img" style="margin-bottom:12px" src="' + esc(thumb) + '" alt="">' : '') +
        '<div class="card-header">' +
          '<span class="card-title">' + esc(e.contentId) + '</span>' +
          '<span class="badge ' + bClass + '">' + esc(e.label) + '</span>' +
        '</div>' +
        '<div style="font-size:14px;color:var(--text-bright);margin:8px 0;line-height:1.5">' + esc(e.reason) + '</div>' +
        (e.metrics ? '<div class="card-subtext" style="margin-top:10px">조회수 ' + fmt.format(e.metrics.views || 0) + ' · 시청률 ' + Number(e.metrics.averageViewPercentage || 0).toFixed(1) + '% · 구독 ' + fmt.format(e.metrics.subscribersGained || 0) + '</div>' : '') +
      '</div>';
    }).join('') : '<div class="bento-card col-12 card-subtext">현재 판정 대상 영상이 없습니다.</div>') +
  '</div>';
}

/* TAB 6: STUDIO CSV CTR TRACKER */
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
    format: v.format || ((v.durationSeconds <= 60) ? 'SHORTS' : 'LONGFORM'),
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
    const isShort = x.format === 'SHORTS' || (Number(video.durationSeconds || 0) > 0 && Number(video.durationSeconds) <= 60);
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
      '<div style="position:relative">' +
        '<img class="thumb-img" src="' + esc(image || '') + '" data-fallback-vid="' + esc(x.videoId || '') + '" alt="" style="border-radius:14px 14px 0 0;border:0;width:100%;height:150px;object-fit:cover">' +
        statusChip +
        '<span class="tag-chip" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);font-size:10px">' + (isShort ? '쇼츠' : '롱폼') + '</span>' +
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

  return '<div class="bento-grid">' +
    '<div class="bento-card col-12">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">' +
        '<div>' +
          '<div class="card-title" style="color:var(--accent-cyan)">STUDIO CTR & REACH TRACKER</div>' +
          '<h2 style="font-family:var(--font-display);font-size:22px;color:var(--text-bright);margin-top:2px">📁 YouTube Studio CTR & 도달 성과 트래커</h2>' +
          '<div class="card-subtext">스튜디오에서 내보낸 노출수·CTR 데이터를 자동 감지하여 채널 영상과 매칭·보존합니다.</div>' +
        '</div>' +
        '<div style="display:flex;gap:10px;align-items:center">' +
          '<button class="btn btn-cyan btn-sm" id="btn-studio-rescan">↻ 수동 재스캔</button>' +
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
        '<button class="tab-pill studio-filter-btn' + (gStudioFilter === 'ALL' ? ' active' : '') + '" data-filter="ALL">전체 보기 (' + allItems.length + ')</button>' +
        '<button class="tab-pill studio-filter-btn' + (gStudioFilter === 'HAS_DATA' ? ' active' : '') + '" data-filter="HAS_DATA">✨ CTR 수집 완료 (' + totalWithDataCount + ')</button>' +
        '<button class="tab-pill studio-filter-btn' + (gStudioFilter === 'LONGFORM' ? ' active' : '') + '" data-filter="LONGFORM">롱폼 (' + allItems.filter(i => i.format !== 'SHORTS').length + ')</button>' +
        '<button class="tab-pill studio-filter-btn' + (gStudioFilter === 'SHORTS' ? ' active' : '') + '" data-filter="SHORTS">쇼츠 (' + allItems.filter(i => i.format === 'SHORTS').length + ')</button>' +
      '</div>' +
    '</div>' +
    thumbCards +
  '</div>';
}

function bindStudioEvents() {
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
    const cls = v.classification || pkg.classification || {};
    const durationSec = Number(v.durationSeconds || perf.durationSeconds || 0);
    const titleHasShortsTag = /#(shorts|쇼츠)/i.test(v.title || '');
    const isShort = v.format ? v.format === 'SHORTS' :
                    (durationSec > 0 && durationSec <= 60) ||
                    ['A', 'B', 'C', 'STANDALONE_SHORT'].includes(cls.role) ||
                    titleHasShortsTag;
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
      const latestPeriod = Object.values(periods)
        .filter((p) => p && p.ctr != null)
        .sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')))[0];
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
    const cls = v.classification || pkg.classification || {};

    // 3. Format Validation (Duration & Role Check)
    const durationSec = Number(v.durationSeconds || perf.durationSeconds || 0);
    // 60초 컷오프만 쓰면 새는 사례가 있다 — 유튜브가 쇼츠 자격 길이를 최대 3분까지 넓혀서,
    // 제작자가 "#쇼츠"를 붙인 진짜 쇼츠인데 실제 길이가 60초를 넘는 영상이 실제로 있다
    // (2026-09-07, 4사분면 매트릭스 "롱폼" 필터에 쇼츠가 섞여 나온다는 지적으로 발견 — 86초짜리
    // "#쇼츠" 영상 2건이 durationSec<=60에 안 걸려서 LONGFORM으로 잘못 분류되고 있었음).
    // 제목에 명시적으로 쇼츠 표시가 있으면 길이와 무관하게 그걸 우선한다.
    const titleHasShortsTag = /#(shorts|쇼츠)/i.test(v.title || '');
    const isShort = v.format ? v.format === 'SHORTS' :
                    (durationSec > 0 && durationSec <= 60) ||
                    ['A', 'B', 'C', 'STANDALONE_SHORT'].includes(cls.role) ||
                    titleHasShortsTag;

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
      // endDate가 가장 최신인 구간을 쓴다.
      const latestPeriod = Object.values(periods)
        .filter((p) => p && p.ctr != null)
        .sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')))[0];
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
              (v.quadrant !== 'PENDING_STUDIO' ? 
                '<button class="btn btn-sm btn-matrix-diagnose" data-video-id="' + esc(v.videoId) + '" style="font-size:11px; padding:6px 10px;">🤖 AI 처방전</button>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>' +
  '</div>';
}

function bindMatrixEvents() {
  const allItems = computeMatrixDataset();

  // 1. Format Filter Buttons
  document.querySelectorAll('.btn-matrix-format').forEach(btn => {
    btn.onclick = () => {
      gMatrixFormatFilter = btn.dataset.format;
      renderCurrentTab();
    };
  });

  // 2. Quadrant Filter Buttons
  document.querySelectorAll('.btn-matrix-quadrant').forEach(btn => {
    btn.onclick = () => {
      gMatrixQuadrantFilter = btn.dataset.quadrant;
      renderCurrentTab();
    };
  });

  // 3. Threshold Inputs
  const ctrInput = document.getElementById('input-matrix-ctr-thresh');
  if (ctrInput) {
    ctrInput.onchange = (e) => {
      gMatrixCtrThreshold = Number(e.target.value) || 6.0;
      renderCurrentTab();
    };
  }

  const retInput = document.getElementById('input-matrix-ret-thresh');
  if (retInput) {
    retInput.onchange = (e) => {
      if (gMatrixFormatFilter === 'SHORTS') {
        gMatrixRetThresholdShorts = Number(e.target.value) || 70.0;
      } else {
        gMatrixRetThresholdLong = Number(e.target.value) || 42.0;
      }
      renderCurrentTab();
    };
  }

  // 4. SVG Bubble Hover Tooltips & Click to Diagnose
  const tooltip = document.getElementById('matrix-chart-tooltip');
  const container = document.querySelector('.matrix-svg-container');

  document.querySelectorAll('.matrix-bubble').forEach(bubble => {
    bubble.onmouseenter = (e) => {
      if (!tooltip || !container) return;
      const title = decodeURIComponent(bubble.dataset.title);
      const ctr = bubble.dataset.ctr;
      const ret = bubble.dataset.ret;
      const views = Number(bubble.dataset.views || 0);
      const format = bubble.dataset.format;
      const quadrant = bubble.dataset.quadrant;
      const qLabel = decodeURIComponent(bubble.dataset.quadrantLabel);
      const thumb = decodeURIComponent(bubble.dataset.thumb);
      const action = decodeURIComponent(bubble.dataset.action);

      const bCol = quadrant === 'WARMUP' ? 'var(--accent-amber)' : quadrant === 'Q1' ? 'var(--accent-cyan)' : quadrant === 'Q2' ? 'var(--accent-amber)' : quadrant === 'Q3' ? 'var(--accent-emerald)' : 'var(--accent-violet)';

      tooltip.innerHTML = 
        '<div style="display:flex; gap:8px; margin-bottom:6px;">' +
          '<img src="' + esc(thumb) + '" style="width:70px; height:40px; object-fit:cover; border-radius:4px; background:#000;">' +
          '<div style="flex:1; min-width:0;">' +
            '<span class="badge" style="font-size:9px; border-color:' + bCol + '; color:' + bCol + '; padding:1px 6px;">' + (quadrant === 'WARMUP' ? '⏳ 48H 집계중' : esc(quadrant)) + ' · ' + esc(qLabel) + '</span>' +
            '<div style="font-weight:700; font-size:11px; color:#fff; line-height:1.3; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; margin-top:2px;">' + esc(title) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex; justify-content:space-between; font-size:11px; border-top:1px solid rgba(255,255,255,0.1); padding-top:4px; margin-top:4px;">' +
          '<span>CTR: <b style="color:' + bCol + '">' + ctr + '%</b></span>' +
          '<span>지속률: <b>' + ret + '%</b></span>' +
          '<span>조회수: <b>' + fmt.format(views) + '</b></span>' +
        '</div>' +
        '<div style="font-size:10px; color:var(--accent-cyan); margin-top:4px; text-align:right;">👉 클릭하여 AI 처방전 열람</div>';

      const rect = container.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      tooltip.style.left = Math.min(rect.width - 290, Math.max(10, clientX + 15)) + 'px';
      tooltip.style.top = Math.min(rect.height - 130, Math.max(10, clientY - 40)) + 'px';
      tooltip.style.display = 'block';
    };

    bubble.onmouseleave = () => {
      if (tooltip) tooltip.style.display = 'none';
    };

    bubble.onclick = () => {
      const vid = bubble.dataset.videoId;
      const targetVideo = allItems.find(v => v.videoId === vid);
      if (targetVideo) openMatrixDiagnosisModal(targetVideo);
    };
  });

  // 5. Action Button: Send to A/B Simulator
  document.querySelectorAll('.btn-send-to-ab').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const vid = btn.dataset.videoId;
      const targetVideo = allItems.find(v => v.videoId === vid);
      const videoTitle = targetVideo ? targetVideo.title : decodeURIComponent(btn.dataset.title);
      const videoThumb = targetVideo ? targetVideo.thumbnail : decodeURIComponent(btn.dataset.thumb);
      const isVideoShorts = targetVideo ? (targetVideo.format === 'SHORTS' || targetVideo.isShorts) : (videoTitle.toLowerCase().includes('#shorts'));
      
      gAbFormat = isVideoShorts ? 'SHORTS' : 'LONGFORM';
      gAbTopic = videoTitle;
      // 이 핸드오프엔 영상별 타겟층을 추정할 근거 데이터가 없다(아이디어 보드처럼 AI가 만든
      // targetAudience가 없음) — 그래도 이전 화면에서 쓰던 무관한 값이 그대로 남는 것보다는
      // 채널 기본값으로 리셋하는 게 낫다(2026-09-01, 같은 문제가 아이디어 보드 핸드오프에도
      // 있었던 걸 사용자가 지적해서 발견).
      gAbAudience = '3060 성인 & 왕초보 영어 학습자';
      // thumbnailHeadline은 메모가 아니라 실제 생성 이미지에 그대로 그려지는 문구다
      // (buildThumbnailPrompt) — "현재 시안"/"대안 B" 같은 내부 비교용 라벨을 넣으면 그게
      // 그대로 썸네일에 박혀 나온다(사용자 지적, 2026-09-01 — 아이디어 보드 핸드오프에서
      // 먼저 발견돼 여기도 같은 패턴으로 수정). 빈 칸으로 둬서 시안별 기본값으로 폴백시킨다.
      // (하단 캡션·포인트 뱃지는 2026-09-13 폐지.)
      gAbVariants[0] = {
        id: 'A',
        title: videoTitle,
        imageUrl: videoThumb,
        thumbnailHeadline: '',
        visualConcept: '',
        isLocalFile: false
      };
      gAbVariants[1] = {
        id: 'B',
        title: videoTitle.replace(/#.*/, '').trim() + (isVideoShorts ? ' #shorts (핵심 원리)' : ' (핵심 원리 30초 완성)'),
        imageUrl: '',
        thumbnailHeadline: '',
        visualConcept: '',
        isLocalFile: false
      };
      gAbVariants[2] = {
        id: 'C',
        title: videoTitle.replace(/#.*/, '').trim() + (isVideoShorts ? ' #영어 #shorts (필수 패턴)' : ' (필수 패턴 총정리)'),
        imageUrl: '',
        thumbnailHeadline: '',
        visualConcept: '',
        isLocalFile: false
      };
      gAbSelectedVariantTab = 'A';
      gAbActiveFeedView = 'A';
      // 이전 진단(gAbAiReport)은 완전히 다른 소재/시안을 평가한 결과라 그대로 두면 새 소재를 진단한
      // 것처럼 오인된다(2026-09-02, 실제로 이 문제 때문에 혼란이 생겨서 발견) — 핸드오프 시 항상 비움.
      gAbAiReport = null;
      saveAbSimulatorState();
      switchTab('tab-ab-simulator');
      showToast(isVideoShorts ? '📱 쇼츠(9:16) 영상이 A/B 시뮬레이터에 로드되었습니다!' : '📺 롱폼(16:9) 영상이 A/B 시뮬레이터에 로드되었습니다!');
    };
  });

  // 6. Action Button: AI Diagnose Modal
  document.querySelectorAll('.btn-matrix-diagnose').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const vid = btn.dataset.videoId;
      const targetVideo = allItems.find(v => v.videoId === vid);
      if (targetVideo) openMatrixDiagnosisModal(targetVideo);
    };
  });
}

function openMatrixDiagnosisModal(video) {
  const bColor = video.quadrant === 'WARMUP' ? 'var(--accent-amber)' : video.quadrant === 'Q1' ? 'var(--accent-cyan)' : video.quadrant === 'Q2' ? 'var(--accent-amber)' : video.quadrant === 'Q3' ? 'var(--accent-emerald)' : 'var(--accent-violet)';

  let modalHtml = 
    '<div style="display:flex; gap:14px; margin-bottom:16px; background:#080c14; padding:14px; border-radius:12px; border:1px solid var(--border-subtle);">' +
      '<img src="' + esc(video.thumbnail) + '" style="width:140px; height:79px; object-fit:cover; border-radius:8px; flex-shrink:0; background:#000;">' +
      '<div style="flex:1; min-width:0;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
          '<span class="badge" style="border-color:' + bColor + '; color:' + bColor + '; font-size:11px;">' + (video.quadrant === 'WARMUP' ? '⏳ 48H 집계중' : esc(video.quadrant)) + ' · ' + esc(video.quadrantLabel) + '</span>' +
          '<span class="tag-chip">' + esc(video.format) + '</span>' +
        '</div>' +
        '<h3 style="font-size:16px; font-weight:800; color:var(--text-bright); line-height:1.35; margin-bottom:6px;">' + esc(video.title) + '</h3>' +
        '<div style="display:flex; gap:12px; font-size:12px; color:var(--text-normal);">' +
          '<span>조회수 <b>' + fmt.format(video.views) + '회</b></span> · ' +
          '<span>노출 클릭률 <b style="color:' + bColor + '">' + video.ctr + '%</b></span> · ' +
          '<span>시청지속률 <b style="color:var(--text-bright)">' + video.retentionRate + '%</b></span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div id="matrix-modal-ai-result">' +
      '<div style="text-align:center; padding:30px 10px;">' +
        '<p style="color:var(--text-normal); font-size:13px; margin-bottom:16px;">Gemini AI가 이 영상의 사분면 위치와 시청자 반응 지표를 심층 분석하여 맞춤 처방전을 생성합니다.</p>' +
        '<button class="btn btn-cyan" id="btn-run-matrix-diagnose" style="font-size:14px; padding:10px 24px;">🚀 Gemini AI 맞춤 처방전 생성하기</button>' +
      '</div>' +
    '</div>';

  openModal('📊 사분면 정밀 진단 및 AI 처방전 (Action Hub)', modalHtml);

  const runBtn = document.getElementById('btn-run-matrix-diagnose');
  if (runBtn) {
    runBtn.onclick = async () => {
      const container = document.getElementById('matrix-modal-ai-result');
      if (container) {
        container.innerHTML = '<div style="text-align:center; padding:40px;"><div class="pulse-dot" style="margin:0 auto 12px; width:14px; height:14px;"></div><p style="color:var(--text-bright); font-weight:700;">Gemini AI가 사분면 맞춤 원인 및 처방전을 분석 중입니다... (약 3~5초 소요)</p></div>';
      }
      try {
        const res = await fetch('/api/matrix/diagnose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ video }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '진단 실패');
        const diag = data.diagnosis;

        const altTitles = diag.alternativeTitles || diag.suggestedAlternativeTitles || [];

        container.innerHTML = 
          '<div style="display:grid; gap:14px;">' +
            '<div style="background:rgba(0,240,255,0.08); border:1px solid var(--accent-cyan); border-radius:12px; padding:16px;">' +
              '<div class="card-title" style="color:var(--accent-cyan)">💡 AI 원인 진단 & 사분면 핵심 판정</div>' +
              '<div style="font-size:14px; font-weight:700; color:#fff; margin:6px 0 4px; line-height:1.4;">' + esc(diag.diagnosisSummary || '') + '</div>' +
              '<div style="font-size:12px; color:var(--text-normal); line-height:1.5;">' + esc(diag.coreProblemOrSuccessFactor || '') + '</div>' +
            '</div>' +

            '<div style="background:#080c14; border:1px solid var(--border-subtle); border-radius:12px; padding:16px;">' +
              '<div class="card-title" style="color:var(--accent-amber); margin-bottom:8px;">📋 3단계 즉각 실행 처방전 (Action Steps)</div>' +
              '<div style="display:grid; gap:8px;">' +
                (diag.actionPrescriptions || []).map(p => 
                  '<div style="background:#05070c; border:1px solid var(--border-subtle); border-radius:8px; padding:10px; font-size:12px; line-height:1.4;">' +
                    '<b style="color:var(--accent-cyan)">Step ' + p.step + ' [' + esc(p.category || '개선') + ']:</b> ' + esc(p.action || '') +
                  '</div>'
                ).join('') +
              '</div>' +
            '</div>' +

            '<div style="background:#080c14; border:1px solid var(--border-subtle); border-radius:12px; padding:16px;">' +
              '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
                '<div class="card-title" style="color:var(--accent-magenta);">⚡ 추천 고클릭률 대체 제목 3종 (클릭 시 복사)</div>' +
                '<span class="badge badge-magenta" style="font-size:10px;">HIGH CTR</span>' +
              '</div>' +
              '<div style="display:grid; gap:8px;">' +
                (altTitles.length > 0 ? altTitles.map((t, idx) => 
                  '<div class="tag-chip copy-chip" data-copy="' + esc(t) + '" style="cursor:pointer; display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#05070c; border:1px solid var(--border-subtle); border-radius:8px; font-size:13px; font-weight:700; color:var(--text-bright); line-height:1.4;">' +
                    '<span><b style="color:var(--accent-cyan); margin-right:6px;">#' + (idx + 1) + '</b> "' + esc(t) + '"</span>' +
                    '<span style="color:var(--accent-magenta); font-size:11px; margin-left:8px; flex-shrink:0;">📋 복사</span>' +
                  '</div>'
                ).join('') : '<div style="color:var(--text-muted); font-size:12px;">대체 제목이 생성되지 않았습니다.</div>') +
              '</div>' +
            '</div>' +

            '<div style="display:flex; justify-content:space-between; align-items:center; background:#060910; padding:12px 16px; border-radius:10px; border:1px solid var(--border-active);">' +
              '<span style="font-size:12px; color:var(--accent-amber); font-weight:700;">' + esc(diag.priorityVerdict || '추천 액션 완료') + '</span>' +
              '<button class="btn btn-sm btn-cyan" id="btn-modal-to-ab" style="font-weight:800;">🎯 이 영상으로 A/B 시뮬레이터 바로 실행</button>' +
            '</div>' +
          '</div>';

        container.querySelectorAll('.copy-chip').forEach(chip => {
          chip.onclick = () => copyToClipboard(chip.dataset.copy, chip);
        });

        const toAbBtn = document.getElementById('btn-modal-to-ab');
        if (toAbBtn) {
          toAbBtn.onclick = () => {
            closeModal();
            const isVideoShorts = (video.format === 'SHORTS') || video.isShorts || (typeof video.durationSec === 'number' && video.durationSec <= 60) || (typeof video.durationSeconds === 'number' && video.durationSeconds <= 60) || (video.title && (video.title.toLowerCase().includes('#shorts') || video.title.toLowerCase().includes('shorts')));
            gAbFormat = isVideoShorts ? 'SHORTS' : 'LONGFORM';
            gAbTopic = video.title;
            // 이 핸드오프도 영상별 타겟층 추정 데이터가 없다 — 이전 화면의 무관한 값이 남는 것보다
            // 채널 기본값으로 리셋(2026-09-01, 위 .btn-send-to-ab와 동일 이유).
            gAbAudience = '3060 성인 & 왕초보 영어 학습자';

            // thumbnailHeadline은 항상 빈 칸으로 시작한다 — altTitles는 그냥 대안 "제목" 문자열
            // 배열이라 헤드라인용 문구가 따로 없는데, 예전엔 title.slice(0, 15)로 제목 앞
            // 15글자를 잘라 카피인 척 채워 넣고 있었다(2026-09-11, 사용자 지적: "썸네일 카피를
            // 보면 문자 수만이 들어가는 것 같은데" — 실제로 문장 중간에서 뚝 잘린 의미 없는
            // 조각이었다). 제목과 헤드라인은 서로 다른 내용이어야 하므로, 진짜 헤드라인이 없으면
            // 빈 칸으로 둬서 "🚀 Gemini AI CTR 정밀 진단"이 만들어주는 실제 문구로 채우게 한다.
            // (실제 생성 이미지에 그대로 그려지므로 가짜 값을 넣으면 안 된다. 하단 캡션·포인트
            // 뱃지는 2026-09-13 폐지.)
            // 1. Variant A (Original Baseline Video)
            gAbVariants[0] = {
              id: 'A',
              title: video.title,
              imageUrl: video.thumbnail,
              thumbnailHeadline: '',
              visualConcept: '',
              isLocalFile: false
            };

            // 2. Variant B (AI Recommendation 1 - Empty image ready for new thumbnail drop/generation)
            gAbVariants[1] = {
              id: 'B',
              title: (altTitles && altTitles[0]) ? altTitles[0] : (video.title.replace(/#.*/, '').trim() + (isVideoShorts ? ' #shorts (개선안 B)' : ' (개선안 B)')),
              imageUrl: '',
              thumbnailHeadline: '',
              visualConcept: '',
              isLocalFile: false
            };

            // 3. Variant C (AI Recommendation 2 - Empty image ready for new thumbnail drop/generation)
            gAbVariants[2] = {
              id: 'C',
              title: (altTitles && altTitles[1]) ? altTitles[1] : (video.title.replace(/#.*/, '').trim() + (isVideoShorts ? ' #영어 #shorts' : ' (완전정복 C)')),
              imageUrl: '',
              thumbnailHeadline: '',
              visualConcept: '',
              isLocalFile: false
            };

            gAbSelectedVariantTab = 'A';
            gAbActiveFeedView = 'A';
            gAbAiReport = null;
            saveAbSimulatorState();
            switchTab('tab-ab-simulator');
            showToast(isVideoShorts ? '📱 쇼츠(9:16) 영상이 A/B 시뮬레이터에 로드되었습니다!' : '📺 롱폼(16:9) 영상이 A/B 시뮬레이터에 로드되었습니다!');
          };
        }
      } catch (err) {
        if (container) {
          container.innerHTML = '<div style="color:#ff7676; padding:20px;">❌ AI 진단 오류: ' + esc(err.message) + '</div>';
        }
      }
    };
  }
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

/* TAB: A/B FEED SIMULATOR & AI CTR PREDICTOR */
function renderAbSimulatorTab() {
  const isShorts = gAbFormat === 'SHORTS';
  const currentVariant = gAbVariants.find(v => v.id === gAbSelectedVariantTab) || gAbVariants[0];
  const colorMap = { A: 'var(--accent-magenta)', B: 'var(--accent-cyan)', C: 'var(--accent-amber)' };
  const badgeClassMap = { A: 'badge-revise', B: 'badge-pass', C: 'badge-hold' };

  const chosenVariant = (gAbActiveFeedView === 'ALL') ? currentVariant : (gAbVariants.find(v => v.id === gAbActiveFeedView) || currentVariant);
  const bColor = colorMap[chosenVariant.id] || 'var(--accent-magenta)';

  /* Rich Competitor Videos: 2 Top Longforms & 4 Bottom Longforms from Market Demand Radar (100% Pure 16:9 Longforms) */
  const FALLBACK_topLongforms = [
    {
      title: "왕초보를 위한 영어회화 강의 - Lesson 001 [기본적인 문장 구성하기]",
      channelTitle: "라이브 아카데미 토들러",
      views: "185만회",
      publishedAgo: "1개월 전",
      thumbnail: "https://i.ytimg.com/vi/OGHo7apPWIY/mqdefault.jpg",
      duration: "14:28",
      avatarSeed: "LiveAcademy1",
    },
    {
      title: "🌱영어회화 | 기초 영어 - 문장 만들기 - Lesson 002",
      channelTitle: "라이브 아카데미 토들러",
      views: "145만회",
      publishedAgo: "1개월 전",
      thumbnail: "https://i.ytimg.com/vi/yJg0rrmRZhA/mqdefault.jpg",
      duration: "11:20",
      avatarSeed: "LiveAcademy2",
    }
  ];

  /* 6 Authentic Competitor Shorts Cards from Real Competitor Channels (10초 영어회화, 톡톡영어, 딴딴영어, 리스닝영어창고, 시니어 엄지척 영어, 보리영어) */
  const FALLBACK_shortsList = [
    {
      title: "맛이 왜 이래 영어로? 원어민은 off 하나로 끝냅니다. #shorts",
      channelTitle: "10초 영어회화",
      imageUrl: "https://i.ytimg.com/vi/PQJwmKD4YiA/hqdefault.jpg",
      views: "180만회",
      tag: "인기 급상승",
    },
    {
      title: "너는 그럴 자격이 있다 영어로? You deserve it #shorts",
      channelTitle: "톡톡영어",
      imageUrl: "https://i.ytimg.com/vi/7zrEVHsWwV0/hqdefault.jpg",
      views: "94만회",
      tag: "새 동영상",
    },
    {
      title: "[패턴영어] It's all good~ 패턴으로 배우는 영어 표현! #shorts",
      channelTitle: "딴딴영어",
      imageUrl: "https://i.ytimg.com/vi/AwKOIQjT4Tc/hqdefault.jpg",
      views: "63만회",
      tag: "인기",
    },
    {
      title: "왕초보 영어 5문장 | 매일 쓰는 필수 표현 #shorts",
      channelTitle: "리스닝영어창고",
      imageUrl: "https://i.ytimg.com/vi/1zwyCkBvTXc/hqdefault.jpg",
      views: "57만회",
      tag: "추천",
    },
    {
      title: "원어민이 대화 중에 자주 쓰는 짧은 영어 #shorts",
      channelTitle: "시니어 엄지척 영어",
      imageUrl: "https://i.ytimg.com/vi/d-4OjN7OnCA/hqdefault.jpg",
      views: "87만회",
      tag: "",
    },
    {
      title: "미드로 배우는 쉬운 영어표현 It was all for nothing #shorts",
      channelTitle: "보리영어",
      imageUrl: "https://i.ytimg.com/vi/XVPPUe_elEw/hqdefault.jpg",
      views: "52만회",
      tag: "새 동영상",
    }
  ];

  /* 4 Real Bottom Longform Videos from Market Demand Radar & YouTube (100% Pure 16:9 Competitor Longforms) */
  const FALLBACK_bottomLongforms = [
    {
      title: "[왕기초 영어 읽기 0편] 준비 1단계. ⭐알파벳⭐ 배우기 | 한글로 배우는 영어",
      channelTitle: "하니티처",
      views: "63만회",
      publishedAgo: "3주 전",
      thumbnail: "https://i.ytimg.com/vi/tpveKY5pnis/mqdefault.jpg",
      duration: "12:15",
      avatarSeed: "HaniTeacher",
    },
    {
      title: "[왕기초 영어 읽기 0편] 준비 2단계 ⭐대문자 쓰기⭐ 함께 쓰면서 외워요!",
      channelTitle: "하니티처",
      views: "57만회",
      publishedAgo: "2개월 전",
      thumbnail: "https://i.ytimg.com/vi/Eh5h2WatNII/mqdefault.jpg",
      duration: "09:40",
      avatarSeed: "HaniTeacher2",
    },
    {
      title: "[왕기초 영어 읽기 8편] 모르면 실수하는 ⭐L 단어 읽기⭐ (L 심화편)",
      channelTitle: "하니티처",
      views: "48만회",
      publishedAgo: "2개월 전",
      thumbnail: "https://i.ytimg.com/vi/4YHtkTvQmYk/mqdefault.jpg",
      duration: "13:20",
      avatarSeed: "HaniTeacher3",
    },
    {
      title: "[왕기초 영어 읽기 7편] ⭐장모음 U⭐ 읽고 쓰기, 이걸로 끝!",
      channelTitle: "하니티처",
      views: "52만회",
      publishedAgo: "4개월 전",
      thumbnail: "https://i.ytimg.com/vi/6iCB2V4Leeo/mqdefault.jpg",
      duration: "15:30",
      avatarSeed: "HaniTeacher4",
    }
  ];

  // 실제 경쟁 영상 데이터(gAbCompetitors — bindAbSimulatorEvents가 topic 관련도 순으로 정렬해서
  // 가져옴)로 topLongforms/shortsList/bottomLongforms를 채운다. 2026-09-01: 예전엔 이 세 목록이
  // 전부 고정 하드코딩이라 소재가 뭐든 항상 같은 경쟁 영상만 보여줬음(사용자 피드백) — 이제
  // "우리 썸네일이 실제로 지금 소재와 겹치는 경쟁 영상들 사이에서 얼마나 눈에 띄는가"를 보여준다.
  // 롱폼 슬롯과 쇼츠 선반은 반드시 분리한다 — market-demand.json의 각 영상엔 실측 duration(초)이
  // 있고 60초 이하면 isShort(이 프로젝트의 기존 쇼츠 판정 기준, youtube-analytics-server.mjs의
  // durationSeconds/creatorContentType과 동일)다. 안 섞으면 세로 9:16 쇼츠 카드에 가로 롱폼
  // 썸네일이 찌그러져 들어가는 걸 막을 수 있다(사용자가 직접 지적). 해당 타입의 실제 데이터가
  // 없으면(예: 아직 market-demand.json을 재생성 안 해서 옛 데이터에 isShort가 없음) 그 슬롯만
  // FALLBACK_*로 폴백 — 두 폴백 모두 원래부터 타입이 맞는 목록이라 안전하다. 풀이 슬롯 수보다
  // 작으면 모듈로 순환으로 채운다 — 카드가 비거나 깨지는 것보다 일부 반복이 낫다.
  const realLongformPool = gAbCompetitors.filter((v) => !v.isShort);
  const realShortsPool = gAbCompetitors.filter((v) => v.isShort);
  const longformPool = realLongformPool.length ? realLongformPool : [...FALLBACK_topLongforms, ...FALLBACK_bottomLongforms];
  const shortsPool = realShortsPool.length ? realShortsPool : FALLBACK_shortsList;
  const pickFrom = (pool, count, offset) => {
    if (!pool.length) return [];
    return Array.from({ length: count }, (_, i) => pool[(offset + i) % pool.length]);
  };
  const topLongforms = pickFrom(longformPool, 2, 0);
  const bottomLongforms = pickFrom(longformPool, 4, 2);
  const shortsList = pickFrom(shortsPool, 6, 0);

  function renderLongformFeedCard(item, isTest = false, testId = '', borderCol = '', slotIdx = 0) {
    const isT = isTest;
    const bC = borderCol || (isT ? bColor : 'transparent');
    // 2026-09-01: 예전엔 box-shadow 글로우까지 줘서 우리 카드가 경쟁 영상보다 항상 눈에 띄게
    // "치팅"하고 있었다(사용자 지적) — 이 도구의 목적은 "실제로 경쟁 영상 사이에서 눈에 띄는지"를
    // 보는 것이라 인위적으로 강조하면 비교가 무의미해진다. 드래그 핸들 바(아래)만으로 어느 카드가
    // 우리 것인지 알 수 있으니, 썸네일 자체엔 얇은 테두리(위치 구분용)만 남기고 글로우는 뺀다.
    const borderStyle = isT
      // bC는 'var(--accent-magenta)' 같은 CSS 변수 참조라 뒤에 헥스 알파(66)를 그냥 이어붙이면
      // 무효한 CSS가 되어 브라우저가 border 선언 전체를 조용히 버린다(2026-09-01, Playwright로
      // 실제 발견) — color-mix()로 반투명을 만들어야 한다.
      ? ('border: 1px solid color-mix(in srgb, ' + bC + ' 40%, transparent); border-radius: 12px; margin: 0 6px 14px; background: rgba(0,0,0,0.6); overflow: hidden;')
      : 'margin-bottom: 14px; background: transparent;';
    // 아이디어 보드에서 막 넘어온 시안은 아직 썸네일 이미지가 없는 게 정상이다(의도적으로 비워둠).
    // 그런데도 실제 이미지처럼 보이는 대체 썸네일(예전엔 EP9 실제 썸네일 URL)을 채워 넣으면,
    // "이미 완성된 썸네일이 있다"고 착각하게 만든다(사용자 지적) — 없으면 명확한 빈 상태를 보여준다.
    const realThumb = item.thumbnail || item.imageUrl || (!isT ? 'https://i.ytimg.com/vi/OVAeeJxmdw0/mqdefault.jpg' : '');

    return '<div class="feed-item ab-feed-drop-zone' + (isT ? ' ab-feed-card-draggable active-test' : '') + '" ' + (isT ? 'draggable="true"' : '') + ' data-is-test="' + (isT ? '1' : '0') + '" data-slot-type="longform" data-slot-idx="' + slotIdx + '" style="' + borderStyle + '">' +
      (isT ?
        '<div style="background:' + bC + '; color:#000; font-weight:900; font-size:11px; padding:4px 10px; display:flex; justify-content:space-between; align-items:center; cursor:grab;">' +
          '<span>☰ ★ 우리 채널 시안 ' + (testId || chosenVariant.id) + ' (드래그하여 위치 이동)</span>' +
        '</div>' : '') +
      '<div class="feed-thumb-wrap">' +
        (realThumb
          ? '<img class="feed-thumb-img" src="' + esc(realThumb) + '" draggable="false" style="pointer-events:none;" alt="">'
          : '<div class="feed-thumb-img" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; background:#0a0e18; color:var(--text-muted); font-size:11px;"><span style="font-size:22px;">🖼️</span><span>썸네일 없음 — 아래 [🎨 AI 1-Click 생성]으로 채우세요</span></div>') +
        '<span class="feed-duration">' + esc(item.duration || '08:24') + '</span>' +
      '</div>' +
      '<div class="feed-meta" style="padding: 10px 12px 6px; display:flex; gap:10px;">' +
        '<div style="width:34px; height:34px; border-radius:50%; background:' + (isT ? 'linear-gradient(135deg, var(--accent-magenta), #7928ca)' : '#27272a') + '; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:13px; flex-shrink:0; overflow:hidden;">' +
          (isT ? '⚡' : '<img src="https://api.dicebear.com/7.x/identicon/svg?seed=' + encodeURIComponent(item.avatarSeed || item.channelTitle || 'channel') + '" style="width:100%;height:100%;object-fit:cover;">') +
        '</div>' +
        '<div class="feed-details" style="flex:1; min-width:0;">' +
          '<div class="feed-title" style="color:#f1f1f1; font-size:13px; font-weight:700; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">' + esc(item.title || '(제목 없음)') + '</div>' +
          '<div class="feed-sub" style="color:#aaa; font-size:11px; margin-top:3px;">' + esc(item.channelTitle || '이해하면 쉬운 영어') + ' · ' + (typeof item.views === 'number' ? ('조회수 ' + Math.round(item.views/10000) + '만회') : esc(item.views || '조회수 2.4만회')) + ' · ' + esc(item.publishedAgo || '2시간 전') + '</div>' +
        '</div>' +
        '<div style="color:#aaa; font-size:14px;">⋮</div>' +
      '</div>' +
    '</div>';
  }

  function renderSingleShortsCard(item, isTest = false, testId = '', borderCol = '', slotIdx = 0) {
    const isT = isTest;
    const bC = borderCol || (isT ? bColor : 'transparent');
    // 2026-09-01: 글로우(box-shadow)를 빼고 테두리도 얇게 — 롱폼 카드와 같은 이유(사용자 지적,
    // 위 renderLongformFeedCard 주석 참고).
    const borderStyle = isT
      ? ('border: 1px solid color-mix(in srgb, ' + bC + ' 40%, transparent); cursor:grab;')
      : '';
    const realThumb = item.imageUrl || item.thumbnail || (!isT ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=480&h=854&fit=crop&q=80' : '');
    return '<div class="shorts-card ab-feed-drop-zone' + (isT ? ' ab-feed-card-draggable active-test' : '') + '" ' + (isT ? 'draggable="true"' : '') + ' data-is-test="' + (isT ? '1' : '0') + '" data-slot-type="shorts" data-slot-idx="' + slotIdx + '" style="' + borderStyle + '">' +
      (realThumb
        ? '<img class="shorts-card-img" src="' + esc(realThumb) + '" draggable="false" style="pointer-events:none;" alt="">'
        : '<div class="shorts-card-img" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; background:#0a0e18; color:var(--text-muted); font-size:10px; text-align:center; padding:8px;"><span style="font-size:20px;">🖼️</span><span>썸네일 없음</span></div>') +
      '<div class="shorts-card-top">' +
        (isT ? '<span style="background:' + bC + '; color:#000; font-size:9px; font-weight:900; padding:2px 5px; border-radius:3px;">☰ ★ 시안 ' + (testId || item.id) + '</span>' : (item.tag ? '<span style="background:rgba(0,0,0,0.6); color:#fff; font-size:9px; font-weight:700; padding:2px 5px; border-radius:3px;">' + esc(item.tag) + '</span>' : '<span></span>')) +
        '<span style="color:#fff; font-size:12px; text-shadow:0 1px 3px #000;">⋮</span>' +
      '</div>' +
      '<div class="shorts-card-bottom">' +
        '<div class="shorts-card-title" style="color:#fff; font-weight:800;">' + esc(item.title || '(쇼츠 제목을 입력하세요)') + '</div>' +
        '<div class="shorts-card-views" style="' + (isT ? 'color:var(--accent-cyan);' : '') + '">' + (isT ? '이해하면 쉬운 영어 · 2.4만회' : (item.channelTitle ? (esc(item.channelTitle) + ' · ') : '') + (typeof item.views === 'number' ? ('조회수 ' + Math.round(item.views / 10000) + '만회') : esc(item.views || '조회수 120만회'))) + '</div>' +
      '</div>' +
    '</div>';
  }

  function renderShortsFeedShelf() {
    let cardsHtml = '';
    if (isShorts) {
      if (gAbActiveFeedView === 'ALL') {
        /* ALL Mode in Shorts shelf: Zigzag 3 variants + 3 competitors */
        const varA = gAbVariants.find(v => v.id === 'A') || gAbVariants[0];
        const varB = gAbVariants.find(v => v.id === 'B') || gAbVariants[1];
        const varC = gAbVariants.find(v => v.id === 'C') || gAbVariants[2];

        cardsHtml += renderSingleShortsCard(varA, true, 'A', 'var(--accent-magenta)', 0);
        cardsHtml += renderSingleShortsCard(shortsList[0], false, '', '', 1);
        cardsHtml += renderSingleShortsCard(shortsList[1], false, '', '', 2);
        cardsHtml += renderSingleShortsCard(varB, true, 'B', 'var(--accent-cyan)', 3);
        cardsHtml += renderSingleShortsCard(varC, true, 'C', 'var(--accent-amber)', 4);
        cardsHtml += renderSingleShortsCard(shortsList[2], false, '', '', 5);
      } else {
        /* Single Variant Mode in Shorts Shelf with Exact Slot (0 to 5) */
        const activeSlot = Math.max(0, Math.min(5, gAbFeedSlotIndex));
        for (let i = 0; i < 6; i++) {
          if (i === activeSlot) {
            cardsHtml += renderSingleShortsCard(chosenVariant, true, chosenVariant.id, bColor, i);
          } else {
            const compIdx = i > activeSlot ? i - 1 : i;
            cardsHtml += renderSingleShortsCard(shortsList[compIdx] || shortsList[0], false, '', '', i);
          }
        }
      }
    } else {
      /* Longform Mode: Shorts 선반 - 올바른 9:16 비율의 실제 유튜브 쇼츠 썸네일만 사용 */
      shortsList.forEach((item, idx) => {
        /* object-fit: cover로 9:16 이미지가 컨테이너에 완전히 맞게 표시 */
        cardsHtml += renderSingleShortsCard(item, false, '', '', idx);
      });
    }

    return '<div class="shorts-shelf">' +
      '<div class="shorts-shelf-header">' +
        '<div style="display:flex; align-items:center; gap:6px; font-weight:900; font-size:14px; color:#fff;">' +
          '<span style="color:#ff0033; font-size:15px;">▶</span> Shorts' +
        '</div>' +
        '<div style="color:#aaa; font-size:14px; cursor:pointer;">⋮</div>' +
      '</div>' +
      '<div class="shorts-shelf-grid">' + cardsHtml + '</div>' +
    '</div>';
  }

  let feedHtml = '';
  if (isShorts) {
    /* 1. Top Section: 2 Real Competitor Longforms */
    feedHtml += renderLongformFeedCard(topLongforms[0], false, '', '', 0);
    feedHtml += renderLongformFeedCard(topLongforms[1], false, '', '', 1);

    /* 2. Middle Section: 6 Shorts Shelf */
    feedHtml += renderShortsFeedShelf();

    /* 3. Bottom Section: 4 Real Competitor Longforms */
    bottomLongforms.forEach((v, idx) => {
      feedHtml += renderLongformFeedCard(v, false, '', '', idx + 2);
    });
  } else {
    /* Longform Mode (Top 2 Longforms ➔ Middle Shorts Shelf ➔ Bottom 4 Longforms) */
    if (gAbActiveFeedView === 'ALL') {
      /* Section 1 (Top before Shorts): Variant A + 2 Real Competitor Longforms */
      const varA = gAbVariants.find(v => v.id === 'A') || gAbVariants[0];
      const varB = gAbVariants.find(v => v.id === 'B') || gAbVariants[1];
      const varC = gAbVariants.find(v => v.id === 'C') || gAbVariants[2];

      feedHtml += renderLongformFeedCard({
        title: varA.title || '(시안 A 제목)',
        channelTitle: "이해하면 쉬운 영어",
        views: "2.4만회",
        publishedAgo: "2시간 전",
        thumbnail: varA.imageUrl || '',
        duration: "07:42",
      }, true, 'A', 'var(--accent-magenta)', 0);
      feedHtml += renderLongformFeedCard(topLongforms[0], false, '', '', 1);
      feedHtml += renderLongformFeedCard(topLongforms[1], false, '', '', 2);

      /* Section 2 (Middle): Shorts Shelf with 6 items */
      feedHtml += renderShortsFeedShelf();

      /* Section 3 (Bottom after Shorts): Variant B + Competitor 1 + Variant C + Competitors 2, 3, 4 */
      feedHtml += renderLongformFeedCard({
        title: varB.title || '(시안 B 제목)',
        channelTitle: "이해하면 쉬운 영어",
        views: "2.4만회",
        publishedAgo: "2시간 전",
        thumbnail: varB.imageUrl || '',
        duration: "07:42",
      }, true, 'B', 'var(--accent-cyan)', 3);
      feedHtml += renderLongformFeedCard(bottomLongforms[0], false, '', '', 4);

      feedHtml += renderLongformFeedCard({
        title: varC.title || '(시안 C 제목)',
        channelTitle: "이해하면 쉬운 영어",
        views: "2.4만회",
        publishedAgo: "2시간 전",
        thumbnail: varC.imageUrl || '',
        duration: "07:42",
      }, true, 'C', 'var(--accent-amber)', 5);
      feedHtml += renderLongformFeedCard(bottomLongforms[1], false, '', '', 6);
      feedHtml += renderLongformFeedCard(bottomLongforms[2], false, '', '', 7);
      feedHtml += renderLongformFeedCard(bottomLongforms[3], false, '', '', 8);
    } else {
      /* Single Variant Mode with Exact Slot Index (0 to 7) */
      const testCard = {
        title: chosenVariant.title || '(제목을 입력하세요)',
        channelTitle: "이해하면 쉬운 영어",
        views: "2.4만회",
        publishedAgo: "2시간 전",
        thumbnail: chosenVariant.imageUrl || '',
        duration: "07:42",
      };

      const compVideos = [
        topLongforms[0],    // 0: 라이브 아카데미 토들러 (기본적인 문장 구성하기)
        topLongforms[1],    // 1: 라이브 아카데미 토들러 (기초 영어 문장 만들기)
        bottomLongforms[0], // 2: 하니티처 (알파벳 배우기 왕기초)
        bottomLongforms[1], // 3: 하니티처 (대문자 쓰기)
        bottomLongforms[2], // 4: 하니티처 (L 단어 읽기)
        bottomLongforms[3], // 5: 하니티처 (장모음 U 읽고 쓰기)
      ];

      const targetSlot = Math.max(0, Math.min(7, gAbFeedSlotIndex));

      // Section 1: Before Shorts Shelf (ALWAYS contains BOTH top competitor longforms)
      if (targetSlot === 0) {
        feedHtml += renderLongformFeedCard(testCard, true, chosenVariant.id, bColor, 0);
        feedHtml += renderLongformFeedCard(compVideos[0], false, '', '', 1);
        feedHtml += renderLongformFeedCard(compVideos[1], false, '', '', 2);
      } else if (targetSlot === 1) {
        feedHtml += renderLongformFeedCard(compVideos[0], false, '', '', 0);
        feedHtml += renderLongformFeedCard(testCard, true, chosenVariant.id, bColor, 1);
        feedHtml += renderLongformFeedCard(compVideos[1], false, '', '', 2);
      } else if (targetSlot === 2) {
        feedHtml += renderLongformFeedCard(compVideos[0], false, '', '', 0);
        feedHtml += renderLongformFeedCard(compVideos[1], false, '', '', 1);
        feedHtml += renderLongformFeedCard(testCard, true, chosenVariant.id, bColor, 2);
      } else {
        feedHtml += renderLongformFeedCard(compVideos[0], false, '', '', 0);
        feedHtml += renderLongformFeedCard(compVideos[1], false, '', '', 1);
      }

      // Section 2: Middle Section - YouTube Shorts Shelf
      feedHtml += renderShortsFeedShelf();

      // Section 3: After Shorts Shelf (Slots 3, 4, 5, 6, 7)
      if (targetSlot >= 3) {
        const bottomComps = compVideos.slice(2); // 4 items: bottomLongforms
        const relSlot = targetSlot - 3;
        for (let i = 0; i < 5; i++) {
          const currentSlotIdx = i + 3;
          if (i === relSlot) {
            feedHtml += renderLongformFeedCard(testCard, true, chosenVariant.id, bColor, currentSlotIdx);
          } else {
            const cIdx = i > relSlot ? i - 1 : i;
            if (bottomComps[cIdx]) {
              feedHtml += renderLongformFeedCard(bottomComps[cIdx], false, '', '', currentSlotIdx);
            }
          }
        }
      } else {
        // When our card is in top section, render the 4 bottom competitors
        for (let i = 0; i < 4; i++) {
          feedHtml += renderLongformFeedCard(compVideos[i + 2], false, '', '', i + 3);
        }
      }
    }
  }

  const report = gAbAiReport;

  return '<div class="bento-grid">' +
    /* 2026-09-01: 편집·결과 어디를 스크롤해서 보고 있어도 진단 버튼에 바로 닿도록 sticky.
       .nav-rail(1061행)과 같은 패턴(position:sticky; top:0), z-index는 nav-rail(100)보다
       낮고 토스트(9999)·모달(1000)보다는 훨씬 낮은 40으로 잡아 겹침 문제를 피한다. */
    '<div class="bento-card highlight-magenta col-12" style="position:sticky; top:0; z-index:40;">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">' +
        '<div>' +
          '<div class="card-title" style="color:#ffccd9">YOUTUBE FEED SALIENCE & AI CTR PREDICTOR</div>' +
          '<h2 style="font-family:var(--font-display); font-size:24px; color:#fff; margin-top:2px">🎯 썸네일 & 제목 A/B 피드 시뮬레이터 · AI CTR 예측기</h2>' +
          '<p style="color:#ffe6ec; margin-top:4px; font-size:13px">실제 모바일 유튜브 피드 환경에서 경쟁 영상과 나란히 비교하여 시각적 스턴건 효과와 예상 CTR을 사전 진단합니다. <b>1. 시안 입력 → 2. 진단 실행 → 3. 결과 확인</b> 순서로 진행하세요.</p>' +
        '</div>' +
        '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
          '<div style="display:flex; gap:4px; background:#080d16; padding:3px 6px; border-radius:10px; border:1px solid var(--border-subtle);">' +
            '<button class="tab-pill btn-ab-format-toggle' + (!isShorts ? ' active' : '') + '" data-format="LONGFORM">📺 롱폼 (16:9)</button>' +
            '<button class="tab-pill btn-ab-format-toggle' + (isShorts ? ' active' : '') + '" data-format="SHORTS">📱 쇼츠 (9:16)</button>' +
          '</div>' +
          '<button class="btn btn-sm" id="btn-ab-fill-sample">🎲 샘플 불러오기</button>' +
          '<button class="btn btn-sm btn-amber" id="btn-ab-reset-state" title="기본 데이터로 초기화합니다">🗑️ 초기화</button>' +
          '<button class="btn btn-cyan btn-sm" id="btn-ab-run-ai">🚀 Gemini AI CTR 정밀 진단</button>' +
        '</div>' +
        /* 채널 기준 인물 — 나노바나나 생성이 항상 이 얼굴을 레퍼런스로 쓴다. "📋 프롬프트만
           복사"로 제미나이 웹에서 직접 생성할 땐 프롬프트가 "첨부된 레퍼런스 이미지"를 가리키므로
           이 이미지도 같이 첨부해야 한다 — 그래서 바로 옆에서 보고 복사할 수 있게 둔다(2026-09-01). */
        '<div style="display:flex; flex-direction:column; align-items:center; gap:4px; text-align:center;">' +
          '<span style="font-size:9px; color:var(--text-muted); max-width:100px; line-height:1.3;">채널 기준 인물<br>(제미나이 웹 생성 시 같이 첨부)</span>' +
          /* onerror는 인라인 속성값이라 그 안에 작은따옴표를 또 쓰면 CLAUDE.md가 금지하는
             수동 이스케이프(\') 문제가 재현된다 — 서버가 이 문자열을 조립할 때 이스케이프가
             한 겹 풀려서 브라우저에는 따옴표 없는 this.style.display=none 이 도착해
             "Unexpected identifier 'none'"로 클라이언트 스크립트 전체가 깨졌다. 따옴표가
             필요 없는 this.hidden=true로 바꿔 같은 효과(요소 숨김)를 낸다. */
          '<img id="ab-presenter-ref-img" src="/api/presenter-reference" style="width:64px; height:64px; object-fit:cover; border-radius:8px; border:2px solid var(--accent-amber); cursor:pointer;" title="클릭하면 이 이미지가 클립보드로 복사됩니다" onerror="this.hidden=true">' +
          '<button class="btn btn-xs" id="btn-ab-copy-presenter-ref" style="font-size:9px; padding:2px 6px;">📋 이미지 복사</button>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; align-items:center;">' +
        '<div style="flex:2; min-width:280px;">' +
          '<div style="font-size:11px; font-weight:700; color:var(--accent-amber); margin-bottom:4px;">📌 영상 기획 주제 / 핵심 키워드</div>' +
          '<input type="text" id="input-ab-topic" value="' + esc(gAbTopic) + '" placeholder="예: 30초 만에 Want vs Won 구분법" style="width:100%">' +
        '</div>' +
        '<div style="flex:1; min-width:200px;">' +
          '<div style="font-size:11px; font-weight:700; color:var(--accent-cyan); margin-bottom:4px;">👥 타겟 시청자층</div>' +
          // 2026-09-01: 예전엔 고정 3개 중에서만 고를 수 있는 <select>였음 — 아이디어 보드가
          // 소재별로 추천하는 targetAudience(예: "발음 원리를 처음 배우는 알파벳 입문자")가 이
          // 3개 중 어디에도 안 맞을 수 있어서 자유 입력으로 바꿨다. 기존 3개는 빠른 선택용
          // datalist로 남겨 편의성은 유지.
          '<input type="text" id="input-ab-audience" list="ab-audience-presets" value="' + esc(gAbAudience) + '" placeholder="예: 발음 원리를 처음 배우는 알파벳 입문자" style="width:100%">' +
          '<datalist id="ab-audience-presets">' +
            '<option value="3060 성인 & 왕초보 영어 학습자">' +
            '<option value="기초 회화 및 발음 교정 학습자">' +
            '<option value="알파벳/파닉스 읽는 법 입문자">' +
          '</datalist>' +
        '</div>' +
      '</div>' +

      '<div id="ab-eval-status" style="display:none; margin-top:14px; padding:12px 16px; background:rgba(0,240,255,0.12); border:1px solid var(--accent-cyan); border-radius:10px; color:var(--text-bright); font-weight:700;">' +
        '⏳ <span id="ab-eval-status-text">Gemini AI가 썸네일 가독성과 호기심 갭을 분석 중입니다... (약 3~5초 소요)</span>' +
      '</div>' +
    '</div>' +

    (report ?
      '<div class="bento-card highlight-cyan col-12" id="ab-report-section">' +

        /* Title + Visual Suite (5 types, merged — 적용은 텍스트만, 생성은 이미지까지) — 진단 스코어카드보다
           먼저 보여줌: 바로 쓸 수 있는 제안이 스코어 분석보다 실행 우선순위가 높다. */
        '<div style="background:#090d16; border:1px solid var(--border-subtle); border-radius:14px; padding:18px; margin-bottom:16px;">' +
          '<div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:4px;">' +
            '<div class="card-title" style="color:var(--accent-cyan); margin:0;">⚡ GEMINI AI 추천 고클릭률 제목+비주얼 5종</div>' +
            '<span class="badge" style="background:color-mix(in srgb, ' + colorMap[gAbSelectedVariantTab] + ' 13%, transparent); color:' + colorMap[gAbSelectedVariantTab] + '; border:1px solid color-mix(in srgb, ' + colorMap[gAbSelectedVariantTab] + ' 40%, transparent); font-size:11px; font-weight:700;">💎 지금 워크벤치 = 시안 ' + gAbSelectedVariantTab + '</span>' +
          '</div>' +
          '<div class="card-subtext" style="margin-bottom:12px;">"텍스트 적용"은 제목·카피만 바꿉니다(무료·즉시). 이미지는 아래 워크벤치의 [🎨 AI 1-Click 생성] 또는 [📋 프롬프트만 복사]로 만드세요. 굵은 글씨는 지금 워크벤치가 보고 있는 시안, 노란 테두리+✓는 그 시안에 지금 실제로 적용돼 있는 문구입니다.</div>' +
          '<div style="display:grid; gap:10px;">' +
            (report.aiTitleSuggestions || []).map((s, sIdx) => {
              const applyBtn = (vId, cls) => {
                const active = gAbSelectedVariantTab === vId;
                // "지금 워크벤치가 보는 시안"(active, 카드 전체에 동일하게 적용되는 전역 상태)과
                // "이 카드의 문구가 실제로 그 시안에 적용돼 있는지"(appliedHere, 카드마다 다름)는
                // 서로 다른 정보라 표시를 분리한다 — active만 있으면 어느 카드를 눌러서 지금 상태가
                // 됐는지 알 수 없다(2026-09-01, 사용자 피드백).
                const targetVar = gAbVariants.find(v => v.id === vId);
                const appliedHere = !!(s.title && targetVar && targetVar.title === s.title);
                let extraStyle = '';
                if (active) extraStyle += ' box-shadow:0 0 0 2px ' + colorMap[vId] + '; font-weight:900;';
                if (appliedHere) extraStyle += ' border:2px solid var(--accent-amber);';
                const titleAttr = appliedHere ? '이 문구가 지금 시안 ' + vId + '에 적용돼 있습니다' : (active ? '지금 워크벤치에서 편집 중인 시안입니다' : '');
                return '<button class="btn btn-sm ' + cls + ' btn-ab-apply-title" data-idx="' + sIdx + '" data-var="' + vId + '" style="font-size:10px; padding:3px 8px;' + extraStyle + '" title="' + titleAttr + '">' + vId + (appliedHere ? ' ✓' : '') + '</button>';
              };
              return '<div style="background:#06080e; border:1px solid var(--border-subtle); border-radius:10px; padding:12px 14px;">' +
                '<div style="display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap;">' +
                  '<span class="badge" style="background:rgba(255,0,85,0.15); color:var(--accent-magenta); border:1px solid rgba(255,0,85,0.3); font-size:11px;">' + esc(s.type) + '</span>' +
                  '<span style="font-weight:700; font-size:13px; color:#fff;">' + esc(s.title) + '</span>' +
                '</div>' +
                (s.thumbnailHeadline ? '<div style="font-size:12px; font-weight:700; color:var(--accent-magenta); margin-bottom:6px;">🔥 썸네일 헤드라인: ' + esc(s.thumbnailHeadline) + '</div>' : '') +
                (s.designConcept ? '<div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">🎨 비주얼 컨셉: ' + esc(s.designConcept) + '</div>' : '') +
                '<div style="display:flex; gap:6px; flex-wrap:wrap;">' +
                  '<span style="font-size:10px; color:var(--text-muted); align-self:center;">텍스트 적용:</span>' +
                  applyBtn('A', '') +
                  applyBtn('B', 'btn-cyan') +
                  applyBtn('C', 'btn-amber') +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div class="card-title" style="color:var(--accent-cyan)">GEMINI CTR INTELLIGENCE VERDICT</div>' +
        '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:14px; margin-top:16px;">' +
          (report.variantsEvaluation || []).map(ve => {
            const vKey = ve.variantKey;
            const bCol = colorMap[vKey] || 'var(--accent-cyan)';
            return '<div style="background:#080c14; border:1px solid ' + (vKey === report.bestVariant ? bCol : 'var(--border-subtle)') + '; border-radius:14px; padding:16px;">' +
              '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
                '<span style="font-weight:800; font-size:16px; color:' + bCol + '">시안 ' + vKey + '</span>' +
                '<span class="badge badge-pass" style="font-size:12px;">예상 CTR ' + esc(ve.predictedCtrRange || '') + '</span>' +
              '</div>' +
              '<div style="display:grid; gap:8px; margin-bottom:12px;">' +
                '<div>' +
                  '<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;"><span>호기심 갭 (Curiosity)</span><b>' + (ve.curiosityGapScore||0) + '점</b></div>' +
                  '<div style="height:4px; background:#1a2234; border-radius:2px; overflow:hidden;"><div style="width:' + (ve.curiosityGapScore||0) + '%; height:100%; background:var(--accent-magenta);"></div></div>' +
                '</div>' +
                '<div>' +
                  '<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;"><span>시각 시선 강도 (Salience)</span><b>' + (ve.visualSalienceScore||0) + '점</b></div>' +
                  '<div style="height:4px; background:#1a2234; border-radius:2px; overflow:hidden;"><div style="width:' + (ve.visualSalienceScore||0) + '%; height:100%; background:var(--accent-cyan);"></div></div>' +
                '</div>' +
              '</div>' +
              '<div style="font-size:11px; margin-bottom:8px;"><b style="color:var(--accent-cyan);">🎯 핵심 시선점:</b> ' + esc(ve.focalPoint || '전체 고른 시선') + '</div>' +
              '<div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:8px 10px; margin-bottom:8px; font-size:11px;">' +
                '<div style="color:var(--accent-emerald); font-weight:700; margin-bottom:2px;">✅ 시각 강점:</div>' +
                '<ul style="margin:0; padding-left:14px; color:var(--text-bright);">' +
                  (ve.strengths || []).map(s => '<li>' + esc(s) + '</li>').join('') +
                '</ul>' +
              '</div>' +
              '<div style="background:rgba(255,100,100,0.08); border-radius:8px; padding:8px 10px; margin-bottom:8px; font-size:11px;">' +
                '<div style="color:#ff7676; font-weight:700; margin-bottom:2px;">⚠️ 개선 포인트:</div>' +
                '<ul style="margin:0; padding-left:14px; color:#ffccd9;">' +
                  (ve.weaknesses || []).map(w => '<li>' + esc(w) + '</li>').join('') +
                '</ul>' +
              '</div>' +
              '<div style="background:rgba(0,240,255,0.08); border:1px solid rgba(0,240,255,0.2); border-radius:8px; padding:8px 10px; font-size:11px; color:var(--accent-cyan);">' +
                '<b>💡 디자이너 피드백:</b> ' + esc(ve.visualImprovementTip || '명도 대비 강화 권장') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +
      '</div>' : '') +

    /* LEFT: VARIANT WORKBENCH — 탭(미니 갤러리)을 먼저, 그 아래에 선택된 시안의 편집 필드를
       배치한다(2026-09-01, 사용자 피드백). 탭이 그 아래 필드보다 위에 있어야 "탭을 눌렀는데
       뭐가 바뀌었는지" 스크롤 없이 바로 보인다. id="ab-workbench-card"는 "텍스트 적용" 클릭 시
       자동 스크롤·하이라이트 타겟. */
    '<div class="bento-card col-6" id="ab-workbench-card" style="display:flex; flex-direction:column; justify-content:space-between;">' +
      '<div>' +
        /* 3-VARIANT MINIATURE COMPARISON GALLERY with Direct Image Drop */
        '<div style="margin-bottom:14px; background:#060910; border:1px solid var(--border-subtle); border-radius:12px; padding:12px;">' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
            '<span style="font-weight:800; font-size:13px; color:' + colorMap[currentVariant.id] + '">💎 시안 ' + currentVariant.id + ' 설정 (' + (isShorts ? '쇼츠 9:16' : '롱폼 16:9') + ')</span>' +
            '<span class="badge ' + badgeClassMap[currentVariant.id] + '">Variant ' + currentVariant.id + '</span>' +
          '</div>' +
          '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">' +
            '<span style="font-size:11px; font-weight:700; color:var(--text-muted);">👥 시안 A · B · C 썸네일 비교 (직접 선택)</span>' +
          '</div>' +
          '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">' +
            ['A', 'B', 'C'].map(vId => {
              const v = gAbVariants.find(item => item.id === vId) || { id: vId, title: '', imageUrl: '' };
              const isSelected = gAbSelectedVariantTab === vId;
              const bColor = colorMap[vId] || 'var(--accent-cyan)';
              return '<div class="btn-ab-tab-select ab-gallery-card" data-var="' + vId + '" title="클릭하여 선택하거나, 외부 이미지를 드롭하세요" style="cursor:pointer; background:#0a0e18; border:2px solid ' + (isSelected ? bColor : 'var(--border-subtle)') + '; border-radius:8px; padding:6px; transition:all 0.2s; box-shadow:' + (isSelected ? '0 0 10px rgba(0,240,255,0.2)' : 'none') + ';">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                  '<span style="font-weight:800; font-size:11px; color:' + bColor + ';">시안 ' + vId + '</span>' +
                  '<button class="btn btn-xs btn-outline btn-ab-generate-card-thumb" data-var="' + vId + '"' + (report ? '' : ' disabled') + ' style="font-size:9px; padding:1px 5px; border-color:' + bColor + '; color:' + bColor + ';' + (report ? '' : ' opacity:0.4; cursor:not-allowed;') + '" title="' + (report ? '이 시안의 썸네일을 AI로 생성합니다' : '먼저 🚀 Gemini AI CTR 정밀 진단으로 문구 5안을 확인·적용하세요') + '">🎨 생성</button>' +
                '</div>' +
                '<div style="width:100%; aspect-ratio:' + (isShorts ? '9/16' : '16/9') + '; background:#05070c; border-radius:4px; overflow:hidden; margin-bottom:4px; display:flex; align-items:center; justify-content:center;">' +
                  (v.imageUrl ? '<img src="' + esc(v.imageUrl) + '" draggable="false" style="width:100%; height:100%; object-fit:cover; pointer-events:none; user-select:none; -webkit-user-drag:none;">' : '<div style="font-size:10px; color:' + bColor + '; text-align:center; padding:4px; line-height:1.2; border:1px dashed rgba(255,255,255,0.15); border-radius:4px; width:92%; height:88%; display:flex; flex-direction:column; align-items:center; justify-content:center;"><span>🖼️</span><span style="font-size:9px; color:var(--text-muted); margin-top:2px;">새 시안 드롭</span></div>') +
                '</div>' +
                '<div style="font-size:10px; color:var(--text-normal); line-height:1.2; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; height:24px;" title="' + esc(v.title || '') + '">' +
                  esc(v.title || '(제목 없음)') +
                '</div>' +
                /* 유튜브 Test & Compare에 실제로 올린 시안 표시 — 2026-09-02, 3종을 전부 만들어두고
                   실제 유튜브 A/B 테스트로 겨루기로 한 워크플로우 지원. 체크 자체는 대시보드
                   상태일 뿐 실제 업로드를 대신하지 않는다(사용자가 유튜브에 직접 올린 뒤 표시). */
                '<label style="display:flex; align-items:center; gap:4px; margin-top:4px; font-size:9px; color:var(--text-muted); cursor:pointer;" onclick="event.stopPropagation()">' +
                  '<input type="checkbox" class="cb-ab-in-use" data-var="' + vId + '"' + (v.inUse ? ' checked' : '') + ' style="cursor:pointer; margin:0;">' +
                  (v.inUse ? '<span style="color:var(--accent-emerald); font-weight:700;">✅ 유튜브 테스트 중</span>' : '<span>유튜브 A/B 테스트에 사용</span>') +
                '</label>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div style="background:#090d16; border:1px solid var(--border-subtle); border-radius:14px; padding:16px;">' +
          '<div style="margin-bottom:14px;">' +
            '<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">' +
              '<span style="font-weight:700; color:var(--text-bright)">제목 (Title)</span>' +
              '<span id="ab-char-counter" style="color:' + ((currentVariant.title || '').length > 28 ? 'var(--accent-amber)' : 'var(--text-muted)') + '">' + (currentVariant.title || '').length + '자 ' + ((currentVariant.title || '').length > 28 ? '(모바일 28자 초과 주의)' : '') + '</span>' +
            '</div>' +
            '<input type="text" id="input-ab-variant-title" value="' + esc(currentVariant.title || '') + '" placeholder="유튜브 제목을 입력하세요" style="width:100%; font-size:14px; font-weight:600;">' +
          '</div>' +

          '<div style="margin-bottom:14px;">' +
            '<div style="font-size:12px; font-weight:700; color:var(--text-bright); margin-bottom:6px;">썸네일 이미지 (Thumbnail Image - ' + (isShorts ? '9:16 세로형' : '16:9 가로형') + ')</div>' +
            '<div style="display:flex; gap:8px; margin-bottom:8px; flex-wrap:wrap;">' +
              '<input type="text" id="input-ab-variant-img" value="' + ((currentVariant.imageUrl || '').startsWith('data:') || (currentVariant.imageUrl || '').startsWith('blob:') ? '' : esc(currentVariant.imageUrl || '')) + '" placeholder="' + ((currentVariant.imageUrl || '').startsWith('data:') || (currentVariant.imageUrl || '').startsWith('blob:') ? '📁 이미지 적용됨 (새 URL 입력 시 교체)' : '이미지 URL (https://...)') + '" style="flex:1; min-width:180px;">' +
              '<input type="file" id="input-ab-file-upload" accept="image/*" style="display:none">' +
              '<button class="btn btn-sm btn-cyan" id="btn-ab-upload-trigger">📁 파일</button>' +
              '<button class="btn btn-sm btn-magenta" id="btn-ab-generate-workbench-thumb"' + (report ? '' : ' disabled') + ' style="' + (report ? '' : 'opacity:0.4; cursor:not-allowed;') + '" title="' + (report ? 'AI가 이 시안의 주제와 카피로 4K 네온 배경을 1-Click 자동 생성합니다' : '먼저 🚀 Gemini AI CTR 정밀 진단으로 문구 5안을 확인·적용하세요') + '">🎨 AI 1-Click 생성</button>' +
              '<button class="btn btn-sm btn-cyan" id="btn-ab-copy-workbench-prompt" title="API 비용 없이 이 시안 프롬프트를 복사해서 gemini.google.com(제미나이 유료 구독)에 직접 붙여넣어 생성할 수 있습니다">📋 프롬프트만 복사</button>' +
            '</div>' +
            '<div style="font-size:10px; color:var(--accent-amber); margin-bottom:8px;">⚠️ 프롬프트만 복사해서 쓸 땐, 상단의 [채널 기준 인물] 이미지도 같이 복사해서 함께 첨부해야 매번 같은 얼굴로 나옵니다.</div>' +
            '<div id="ab-thumb-dropzone" style="width:100%; max-width:' + (isShorts ? '180px' : '100%') + '; aspect-ratio:' + (isShorts ? '9/16' : '16/9') + '; margin:0 auto; background:#05070c; border:2px dashed var(--border-active); border-radius:10px; overflow:hidden; position:relative; display:flex; align-items:center; justify-content:center; cursor:pointer;">' +
              (currentVariant.imageUrl ? '<img src="' + esc(currentVariant.imageUrl) + '" style="width:100%; height:100%; object-fit:cover; background:#000;">' : '<div class="card-subtext" style="text-align:center; padding:10px;">🖼️ ' + (isShorts ? '쇼츠(9:16) 이미지' : '롱폼(16:9) 이미지') + '를 드래그하거나 [🎨 AI 1-Click 생성]을 누르세요</div>') +
            '</div>' +
          '</div>' +

          '<div style="margin-bottom:10px;">' +
            '<div style="font-size:11px; font-weight:700; color:var(--accent-amber); margin-bottom:4px;">썸네일 헤드라인 (이미지 안 유일한 텍스트 — 조사 뺀 핵심 단어 3~4개로 압축, 설득이 아니라 스크롤을 멈추는 시각적 스턴건)</div>' +
            '<input type="text" id="input-ab-variant-headline" value="' + esc(currentVariant.thumbnailHeadline || '') + '" placeholder="예: 다시는 안 틀림" style="width:100%">' +
          '</div>' +

          '<div style="margin-top:10px;">' +
            '<div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:4px;">🎨 비주얼 컨셉 힌트 (AI 5종의 "텍스트 적용" 시 자동 채워짐 — 생성 프롬프트에 실제로 반영됨)</div>' +
            '<input type="text" id="input-ab-variant-visual" value="' + esc(currentVariant.visualConcept || '') + '" placeholder="예: 상단에 큰 X표시로 오답 강조, 좌우 대비 구도" style="width:100%">' +
          '</div>' +

          /* 모바일 클로즈업 전용 4번째 썸네일 — knowledge/thumbnail-strategy.md의 "클로즈업
             썸네일은 대시보드 예상 CTR %가 가장 높은 시안을 선택해 제작한다"(2026-09-20 확정)
             규칙을 코드로 강제한다. 예전엔 이 규칙이 문서에만 있고, 사람이 CTR 진단 화면을 보고
             1위 시안 문구를 손으로 옮겨 별도 생성해야 했다(2026-09-29 사용자 확인으로 발견) —
             이제 report.bestVariant를 그대로 읽어 그 시안의 title/headline/visualConcept로
             클로즈업 전용 구도(얼굴 40~50%, 배경 장면 없음)를 자동 생성한다. */
          '<div style="margin-top:14px; padding-top:14px; border-top:1px dashed var(--border-subtle);">' +
            '<div style="font-size:11px; font-weight:700; color:var(--accent-cyan); margin-bottom:4px;">📱 모바일 전용 클로즈업 (thumbnail-close-up.jpg)</div>' +
            '<div class="card-subtext" style="margin-bottom:8px;">' + (report && report.bestVariant ? ('CTR 진단 1위 시안(<b>' + esc(report.bestVariant) + '</b>)의 문구를 그대로 가져다 얼굴 클로즈업 전용 구도로 생성합니다 — 채널 규칙(2026-09-20)이 코드로 강제 적용됩니다.') : '먼저 🚀 Gemini AI CTR 정밀 진단을 실행해 1위 시안을 확정하세요.') + '</div>' +
            '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
              '<button class="btn btn-sm btn-cyan" id="btn-ab-generate-closeup"' + (report && report.bestVariant ? '' : ' disabled') + ' style="' + (report && report.bestVariant ? '' : 'opacity:0.4; cursor:not-allowed;') + '">🔎 1위 시안(' + esc(report && report.bestVariant ? report.bestVariant : '?') + ')로 클로즈업 생성</button>' +
              '<button class="btn btn-sm btn-cyan" id="btn-ab-copy-closeup-prompt"' + (report && report.bestVariant ? '' : ' disabled') + ' style="' + (report && report.bestVariant ? '' : 'opacity:0.4; cursor:not-allowed;') + '" title="API 비용 없이 클로즈업 전용 프롬프트를 복사해서 gemini.google.com(제미나이 유료 구독)에 직접 붙여넣어 생성할 수 있습니다">📋 클로즈업 프롬프트만 복사</button>' +
            '</div>' +
            (gAbCloseUpImageUrl ?
              '<div style="margin-top:8px; display:flex; gap:10px; align-items:flex-start;">' +
                '<img src="' + esc(gAbCloseUpImageUrl) + '" style="width:120px; aspect-ratio:16/9; object-fit:cover; border-radius:6px; background:#000;">' +
                '<div style="font-size:10px; color:var(--text-muted);">시안 ' + esc(gAbCloseUpSourceVariant || '?') + ' 문구로 생성됨.<br><a href="' + esc(gAbCloseUpImageUrl) + '" download="thumbnail-close-up.jpg" style="color:var(--accent-cyan);">⬇️ thumbnail-close-up.jpg로 다운로드</a></div>' +
              '</div>'
              : '') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    /* RIGHT: MOCKUP with Unified View Controls */
    '<div class="bento-card col-6" style="display:flex; flex-direction:column;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
        '<div class="card-title" style="color:var(--accent-magenta)">LIVE MOBILE FEED PREVIEW</div>' +
      '</div>' +

      '<div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; width:360px; max-width:100%; margin:0 auto 10px auto; padding:0 4px;">' +
          '<button class="tab-pill btn-ab-feed-view' + (gAbActiveFeedView === 'ALL' ? ' active' : '') + '" data-feed="ALL" title="시안 A·B·C를 피드 전체에 교차 배치하여 비교합니다">' +
            '🌐 3개 동시 교차 (ALL)' +
          '</button>' +
          '<div style="display:flex; gap:3px; background:#080d16; padding:2px 5px; border-radius:8px; border:1px solid var(--border-subtle);">' +
            '<button class="tab-pill btn-ab-filter' + (gAbVisionFilter === 'normal' ? ' active' : '') + '" data-filter="normal" title="표준 시각 모드">👁️</button>' +
            '<button class="tab-pill btn-ab-filter' + (gAbVisionFilter === 'blur' ? ' active' : '') + '" data-filter="blur" title="시선 흐림(블러) 테스트 - 썸네일 핵심 형태 감지">🌫️</button>' +
            '<button class="tab-pill btn-ab-filter' + (gAbVisionFilter === 'grayscale' ? ' active' : '') + '" data-filter="grayscale" title="흑백 명도 대비 테스트">⚫</button>' +
          '</div>' +
        '</div>' +

        '<div class="mockup-phone">' +
          /* Status Header */
          '<div class="mockup-phone-header">' +
            '<span>7:49</span>' +
            '<div style="width:65px; height:10px; background:#111; border-radius:99px;"></div>' +
            '<div style="display:flex; align-items:center; gap:4px; font-size:10px;"><span>LTE</span><span>🔋</span></div>' +
          '</div>' +
          /* YouTube App Bar */
          '<div class="mockup-phone-appbar">' +
            '<div style="display:flex; align-items:center; gap:4px; font-weight:900; font-size:13px; color:#fff; letter-spacing:-0.5px;">' +
              '<span style="color:#ff0033; font-size:15px;">▶</span> YouTube' +
            '</div>' +
            '<div style="display:flex; align-items:center; gap:10px; font-size:13px; color:#fff;">' +
              '<span>📡</span>' +
              '<span>🔔</span>' +
              '<span>🔍</span>' +
              '<div style="width:20px; height:20px; border-radius:50%; background:#27272a; overflow:hidden;"><img src="https://api.dicebear.com/7.x/identicon/svg?seed=Me" style="width:100%;height:100%;object-fit:cover;"></div>' +
            '</div>' +
          '</div>' +
          /* Scrollable Feed with Vision Filter */
          '<div class="mockup-feed-scroll" style="' + (gAbVisionFilter === 'blur' ? 'filter: blur(4.5px);' : (gAbVisionFilter === 'grayscale' ? 'filter: grayscale(100%) contrast(1.15);' : '')) + '">' + feedHtml + '</div>' +
          /* Bottom Navigation Bar (Image 1 replica) */
          '<div class="mockup-phone-bottom-nav">' +
            '<div class="nav-item active"><span class="nav-item-icon">🏠</span><span>홈</span></div>' +
            '<div class="nav-item"><span class="nav-item-icon">⚡</span><span>Shorts</span></div>' +
            '<div class="nav-item-create"><span>➕</span></div>' +
            '<div class="nav-item"><span class="nav-item-icon">📺</span><span>구독</span></div>' +
            '<div class="nav-item"><span class="nav-item-icon">👤</span><span>내 페이지</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function bindAbSimulatorEvents() {
  const currentVar = gAbVariants.find(v => v.id === gAbSelectedVariantTab) || gAbVariants[0];

  // 1. Topic & Audience Inputs
  const topicInput = document.getElementById('input-ab-topic');
  if (topicInput) topicInput.oninput = (e) => { 
    gAbTopic = e.target.value; 
    saveAbSimulatorState(); 
  };

  const audienceInput = document.getElementById('input-ab-audience');
  if (audienceInput) audienceInput.oninput = (e) => {
    gAbAudience = e.target.value;
    saveAbSimulatorState();
  };

  // 2. Variant Title input & char count
  const titleInput = document.getElementById('input-ab-variant-title');
  if (titleInput) {
    titleInput.oninput = (e) => {
      currentVar.title = e.target.value;
      saveAbSimulatorState();
      const counter = document.getElementById('ab-char-counter');
      if (counter) {
        counter.textContent = currentVar.title.length + '자 ' + (currentVar.title.length > 28 ? '(모바일 28자 초과 주의)' : '');
        counter.style.color = currentVar.title.length > 28 ? 'var(--accent-amber)' : 'var(--text-muted)';
      }
      renderAbFeedOnly();
    };
  }

  // 3. Variant Image input
  const imgInput = document.getElementById('input-ab-variant-img');
  if (imgInput) {
    imgInput.oninput = (e) => {
      currentVar.imageUrl = e.target.value;
      currentVar._base64Data = null;
      currentVar.isLocalFile = false;
      saveAbSimulatorState();
      renderAbSimulatorTabDirect();
    };
  }

  // 4. Variant Headline, Copy & Badge input
  const headlineInput = document.getElementById('input-ab-variant-headline');
  if (headlineInput) headlineInput.oninput = (e) => {
    currentVar.thumbnailHeadline = e.target.value;
    saveAbSimulatorState();
  };

  const visualConceptInput = document.getElementById('input-ab-variant-visual');
  if (visualConceptInput) visualConceptInput.oninput = (e) => {
    currentVar.visualConcept = e.target.value;
    saveAbSimulatorState();
  };

  // Helper: Apply Image from Local File
  function setVariantImageFromFile(file, targetVarId) {
    const vId = targetVarId || gAbSelectedVariantTab;
    const targetVar = gAbVariants.find(v => v.id === vId) || gAbVariants[0];
    if (!file) return;
    try {
      gAbSelectedVariantTab = targetVar.id;
      if (gAbActiveFeedView !== 'ALL') {
        gAbActiveFeedView = targetVar.id;
      }
      // blob: URL로 즉시 미리보기(네트워크 대기 없이 바로 보이게) — 이건 이 브라우저 탭에서만
      // 유효하므로 최종 저장값으로 쓰지 않는다. 아래에서 서버 업로드가 끝나면 짧은
      // /api/temp-thumbnail/... URL로 덮어써서 새로고침·다른 PC에서도 열리게 한다
      // (2026-09-02 — 예전엔 blob:+base64를 그대로 상태에 남겨서 새로고침하면 깨지고,
      // 시안 3개를 다 채우면 상태 동기화 요청이 커져 조용히 실패하곤 했다).
      const blobUrl = URL.createObjectURL(file);
      targetVar.imageUrl = blobUrl;
      targetVar.isLocalFile = true;

      const img = new Image();
      img.onload = () => {
        if (img.naturalHeight > img.naturalWidth * 1.15) {
          gAbFormat = 'SHORTS';
        } else if (img.naturalWidth > img.naturalHeight * 1.15) {
          gAbFormat = 'LONGFORM';
        }
        renderAbSimulatorTabDirect();
      };
      img.src = blobUrl;
      renderAbSimulatorTabDirect();

      const reader = new FileReader();
      reader.onload = (event) => {
        fetch('/api/ab-simulator/upload-local-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl: event.target.result, variantKey: targetVar.id }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (!data.ok) throw new Error(data.error || '업로드 실패');
            URL.revokeObjectURL(blobUrl);
            targetVar.imageUrl = data.imageUrl;
            delete targetVar._base64Data;
            saveAbSimulatorState();
            renderAbSimulatorTabDirect();
            showToast('🖼️ 시안 ' + targetVar.id + '에 썸네일 이미지가 저장됐습니다!');
          })
          .catch((err) => {
            // 실패해도 blob: 미리보기는 화면에 남아있지만, 이 값은 새로고침하면 사라지고
            // 서버/다른 PC에도 안 남는다는 걸 반드시 알려야 한다(예전엔 조용히 실패해서
            // "드래그앤드롭했는데 저장이 안 되는 것 같다"는 혼란을 만들었다).
            showToast('❌ 이미지 서버 저장 실패 — 새로고침하면 사라집니다: ' + err.message);
          });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('File load error:', err);
      showToast('❌ 이미지를 불러오지 못했습니다: ' + err.message);
    }
  }

  function handleDropOrPaste(e, isDrop, targetVarId) {
    const dt = isDrop ? e.dataTransfer : e.clipboardData;
    if (!dt) return false;

    // Real OS file drop / paste
    if (dt.files && dt.files.length > 0) {
      for (let i = 0; i < dt.files.length; i++) {
        const file = dt.files[i];
        if (file.type.startsWith('image/')) {
          setVariantImageFromFile(file, targetVarId);
          return true;
        }
      }
    }

    if (dt.items && dt.items.length > 0) {
      for (let i = 0; i < dt.items.length; i++) {
        const item = dt.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setVariantImageFromFile(file, targetVarId);
            return true;
          }
        }
      }
    }

    // Only process text/URL on explicit PASTE (do not allow dragging internal web images to overwrite other variants)
    if (!isDrop) {
      const uri = (dt.getData('text/uri-list') || dt.getData('text/plain') || '').trim();
      if (uri && (uri.startsWith('http://') || uri.startsWith('https://'))) {
        const vId = targetVarId || gAbSelectedVariantTab;
        const targetVar = gAbVariants.find(v => v.id === vId) || gAbVariants[0];
        gAbSelectedVariantTab = targetVar.id;
        if (gAbActiveFeedView !== 'ALL') {
          gAbActiveFeedView = targetVar.id;
        }
        targetVar.imageUrl = uri;
        targetVar._base64Data = null;
        targetVar.isLocalFile = false;
        saveAbSimulatorState();
        renderAbSimulatorTabDirect();
        showToast('🔗 시안 ' + targetVar.id + '에 이미지 링크가 적용되었습니다!');
        return true;
      }
    }
    return false;
  }

  // 5. File Upload Handler
  const uploadTrigger = document.getElementById('btn-ab-upload-trigger');
  const fileInput = document.getElementById('input-ab-file-upload');
  if (uploadTrigger && fileInput) {
    uploadTrigger.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (file) setVariantImageFromFile(file);
    };
  }

  // 6. Drag & Drop on dropzone
  const dropzone = document.getElementById('ab-thumb-dropzone');
  if (dropzone) {
    dropzone.onclick = () => fileInput && fileInput.click();
    dropzone.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = 'var(--accent-cyan)';
      dropzone.style.background = 'rgba(0, 240, 255, 0.08)';
    };
    dropzone.ondragleave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = 'var(--border-active)';
      dropzone.style.background = '#05070c';
    };
    dropzone.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.style.borderColor = 'var(--border-active)';
      dropzone.style.background = '#05070c';
      handleDropOrPaste(e, true);
    };
  }

  window.ondragover = (e) => { e.preventDefault(); };
  window.ondrop = (e) => {
    e.preventDefault();
    if (gCurrentTab === 'tab-ab-simulator') {
      handleDropOrPaste(e, true);
    }
  };

  window.onpaste = (e) => {
    if (gCurrentTab === 'tab-ab-simulator') {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      const isInput = activeTag === 'INPUT' || activeTag === 'TEXTAREA';
      if (!isInput || document.activeElement?.id === 'input-ab-variant-img') {
        const handled = handleDropOrPaste(e, false);
        if (handled && e.cancelable) e.preventDefault();
      }
    }
  };

  // 7. Format Toggle (Longform vs Shorts)
  document.querySelectorAll('.btn-ab-format-toggle').forEach(btn => {
    btn.onclick = () => {
      const prevFormat = gAbFormat;
      gAbFormat = btn.dataset.format;
      if (prevFormat !== gAbFormat) {
        const hasCustomFile = gAbVariants.some(v => v.isLocalFile || (v.imageUrl && v.imageUrl.startsWith('data:')));
        if (!hasCustomFile) {
          if (gAbFormat === 'SHORTS') {
            gAbTopic = "매일 쓰는 SOCIAL, 사실 발음 규칙 그대로였다";
            gAbVariants = [
              { id: 'A', title: "매일 쓰는 SOCIAL, 사실 발음 규칙 그대로였다 #영어발음 #shorts", imageUrl: 'https://i.ytimg.com/vi/nVrCk8IZFGA/hqdefault.jpg', thumbnailCopy: "SOCIAL 발음 비밀", badge: '1분 컷', isLocalFile: false },
              { id: 'B', title: "시즌1 발음 테스트, 4문제 다 맞히면 진짜 실력 #영어발음 #shorts", imageUrl: 'https://i.ytimg.com/vi/LdiZKCzKf0c/hqdefault.jpg', thumbnailCopy: "발음 테스트 4문제", badge: '실력 테스트', isLocalFile: false },
              { id: 'C', title: "COMMERCIAL, ‘커머시알’이 아닙니다 #영어발음 #shorts", imageUrl: 'https://i.ytimg.com/vi/Si88xXt-EQc/hqdefault.jpg', thumbnailCopy: "COMMERCIAL 발음 비법", badge: '비법 공개', isLocalFile: false }
            ];
          } else {
            gAbTopic = "SPECIAL은 왜 ‘스페시알’이 아닐까? | -CIAL 영어 발음 규칙";
            gAbVariants = [
              { id: 'A', title: "SPECIAL은 왜 ‘스페시알’이 아닐까? | -CIAL 영어 발음 규칙", imageUrl: 'https://i.ytimg.com/vi/sNNufVhkjT8/mqdefault.jpg', thumbnailCopy: "SPECIAL 발음 치트키", badge: '발음 원리', isLocalFile: false },
              { id: 'B', title: "PICTURE는 왜 '픽투어'가 아닐까? | -TURE 규칙 (영어기초)", imageUrl: 'https://i.ytimg.com/vi/YoaCRYCWpws/mqdefault.jpg', thumbnailCopy: "PICTURE 소리 비밀", badge: '소리 법칙', isLocalFile: false },
              { id: 'C', title: "익-션-전-천-처-저-셜, 사실 딱 하나의 규칙이었습니다 (시즌1 총정리)", imageUrl: 'https://i.ytimg.com/vi/3PkSwrFIcRE/mqdefault.jpg', thumbnailCopy: "시즌1 완결 총정리 족보", badge: '총정리', isLocalFile: false }
            ];
          }
        }
      }
      saveAbSimulatorState();
      renderAbSimulatorTabDirect();
      showToast(gAbFormat === 'SHORTS' ? '📱 쇼츠 (9:16) 모드로 전환되었습니다.' : '📺 롱폼 (16:9) 모드로 전환되었습니다.');
    };
  });

  // 8. Variant Tab Select (A, B, C) & Direct Image Drop
  document.querySelectorAll('.btn-ab-tab-select').forEach(btn => {
    btn.onclick = () => {
      const vId = btn.dataset.var;
      gAbSelectedVariantTab = vId;
      if (gAbActiveFeedView !== 'ALL') {
        gAbActiveFeedView = vId;
      }
      saveAbSimulatorState();
      renderAbSimulatorTabDirect();
    };

    // Support external image drop directly onto each variant card
    btn.ondragover = (e) => {
      e.preventDefault();
      btn.style.borderColor = 'var(--accent-cyan)';
      btn.style.background = 'rgba(0, 240, 255, 0.08)';
    };
    btn.ondragleave = () => {
      btn.style.borderColor = '';
      btn.style.background = '#0a0e18';
    };
    btn.ondrop = (e) => {
      e.preventDefault();
      btn.style.borderColor = '';
      btn.style.background = '#0a0e18';
      const targetVarId = btn.dataset.var;
      handleDropOrPaste(e, true, targetVarId);
    };
  });

  // 8-2. "유튜브 A/B 테스트에 사용" 체크 — 3종을 전부 만들어두고 유튜브 자체 Test & Compare로
  // 겨루는 워크플로우 지원(2026-09-02). 체크 자체는 대시보드 기록일 뿐 실제 업로드를 대신하지
  // 않는다 — 사용자가 유튜브에 직접 올린 뒤 표시하는 용도.
  document.querySelectorAll('.cb-ab-in-use').forEach(cb => {
    cb.onclick = (e) => e.stopPropagation();
    cb.onchange = (e) => {
      const vId = e.target.dataset.var;
      const targetVar = gAbVariants.find(v => v.id === vId);
      if (targetVar) {
        targetVar.inUse = e.target.checked;
        saveAbSimulatorState();
        renderAbSimulatorTabDirect();
      }
    };
  });

  // 9. Feed View Toggle (Single vs ALL)
  document.querySelectorAll('.btn-ab-feed-view').forEach(btn => {
    btn.onclick = () => {
      if (gAbActiveFeedView === 'ALL') {
        gAbActiveFeedView = gAbSelectedVariantTab;
      } else {
        gAbActiveFeedView = 'ALL';
      }
      saveAbSimulatorState();
      renderAbSimulatorTabDirect();
    };
  });

  // 9-2. Auto-Scroll & Drag & Drop on Mobile Feed cards
  let gAbFeedDragActive = false;
  let autoScrollRafId = null;
  let autoScrollSpeed = 0;
  const feedScrollEl = document.querySelector('.mockup-feed-scroll');

  function performAutoScroll() {
    if (!gAbFeedDragActive || !feedScrollEl || autoScrollSpeed === 0) {
      autoScrollRafId = null;
      return;
    }
    feedScrollEl.scrollTop += autoScrollSpeed;
    autoScrollRafId = requestAnimationFrame(performAutoScroll);
  }

  function handleFeedAutoScroll(e) {
    if (!gAbFeedDragActive || !feedScrollEl) return;
    const rect = feedScrollEl.getBoundingClientRect();
    const mouseY = e.clientY;
    
    // Bottom edge auto-scroll (triggers within 90px of bottom, or below container)
    if (mouseY > rect.bottom - 90) {
      const dist = Math.max(1, mouseY - (rect.bottom - 90));
      autoScrollSpeed = Math.min(22, dist * 0.35 + 4);
      if (!autoScrollRafId) {
        autoScrollRafId = requestAnimationFrame(performAutoScroll);
      }
    } 
    // Top edge auto-scroll (triggers within 90px of top, or above container)
    else if (mouseY < rect.top + 90) {
      const dist = Math.max(1, (rect.top + 90) - mouseY);
      autoScrollSpeed = -Math.min(22, dist * 0.35 + 4);
      if (!autoScrollRafId) {
        autoScrollRafId = requestAnimationFrame(performAutoScroll);
      }
    } 
    else {
      autoScrollSpeed = 0;
    }
  }

  function stopFeedDrag() {
    gAbFeedDragActive = false;
    autoScrollSpeed = 0;
    if (autoScrollRafId) {
      cancelAnimationFrame(autoScrollRafId);
      autoScrollRafId = null;
    }
    document.querySelectorAll('.ab-feed-card-draggable').forEach(c => c.classList.remove('is-dragging'));
    document.querySelectorAll('.ab-feed-drop-zone').forEach(z => z.classList.remove('drag-over'));
  }

  document.querySelectorAll('.ab-feed-card-draggable').forEach(card => {
    card.ondragstart = (e) => {
      gAbFeedDragActive = true;
      e.dataTransfer.setData('text/feed-internal-drag', 'true');
      e.dataTransfer.setData('text/feed-source-slot', card.dataset.slotIdx || '0');
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('is-dragging');
    };
    card.ondragend = () => {
      stopFeedDrag();
    };
  });

  if (feedScrollEl) {
    feedScrollEl.ondragover = (e) => {
      e.preventDefault();
      if (gAbFeedDragActive) {
        handleFeedAutoScroll(e);
      }
    };
    feedScrollEl.ondrop = (e) => {
      if (e.target === feedScrollEl || e.target.classList.contains('mockup-feed-scroll')) {
        e.preventDefault();
        stopFeedDrag();
        if (e.dataTransfer && e.dataTransfer.getData('text/feed-internal-drag') === 'true') {
          gAbFeedSlotIndex = (gAbFormat === 'SHORTS') ? 5 : 7;
          gAbFeedPosition = 'BOTTOM';
          saveAbSimulatorState();
          renderAbSimulatorTabDirect({ scrollToActive: true });
          showToast('📍 시안 ' + gAbSelectedVariantTab + ' 위치가 [맨 하단]으로 이동되었습니다!');
        }
      }
    };
  }

  window.addEventListener('dragover', (e) => {
    if (gAbFeedDragActive) {
      handleFeedAutoScroll(e);
    }
  });

  window.addEventListener('dragend', () => {
    stopFeedDrag();
  });

  document.querySelectorAll('.ab-feed-drop-zone').forEach(el => {
    el.ondragover = (e) => {
      e.preventDefault();
      el.classList.add('drag-over');
      if (gAbFeedDragActive) {
        handleFeedAutoScroll(e);
      }
    };
    el.ondragleave = () => {
      el.classList.remove('drag-over');
    };
    el.ondrop = (e) => {
      e.preventDefault();
      stopFeedDrag();

      // Case 1: Internal feed card drag (repositioning test card within feed to exact slot)
      if (e.dataTransfer && e.dataTransfer.getData('text/feed-internal-drag') === 'true') {
        const targetSlotIdx = parseInt(el.dataset.slotIdx || '0', 10);
        const slotType = el.dataset.slotType || 'longform';
        
        gAbFeedSlotIndex = targetSlotIdx;
        gAbFeedPosition = (targetSlotIdx <= 2) ? 'TOP' : (targetSlotIdx === 3 ? 'MIDDLE' : 'BOTTOM');

        saveAbSimulatorState();
        renderAbSimulatorTabDirect({ scrollToActive: true });
        showToast('🎯 시안 ' + gAbSelectedVariantTab + '를 ' + (slotType === 'shorts' ? '쇼츠 ' : '피드 ') + (targetSlotIdx + 1) + '번째 위치에 정확히 배치했습니다!');
        return;
      }

      // Case 2: External OS image file drop
      handleDropOrPaste(e, true);
    };
  });

  // 10. Vision Filter Buttons (Normal / Blur / Grayscale)
  document.querySelectorAll('.btn-ab-filter').forEach(btn => {
    btn.onclick = () => {
      const filter = btn.dataset.filter;
      gAbVisionFilter = filter;
      saveAbSimulatorState();

      const feedScroll = document.querySelector('.mockup-feed-scroll');
      if (feedScroll) {
        if (filter === 'blur') {
          feedScroll.style.filter = 'blur(4.5px)';
        } else if (filter === 'grayscale') {
          feedScroll.style.filter = 'grayscale(100%) contrast(1.15)';
        } else {
          feedScroll.style.filter = 'none';
        }
      }
      document.querySelectorAll('.btn-ab-filter').forEach(b => {
        b.classList.toggle('active', b.dataset.filter === filter);
      });
      showToast(filter === 'blur' ? '🌫️ 시선 흐림(블러) 모드가 적용되었습니다 (썸네일 형태 감지).' : (filter === 'grayscale' ? '⚫ 흑백 명도 대비 모드가 적용되었습니다.' : '👁️ 표준 시각 모드로 복귀했습니다.'));
    };
  });

  // 11. Fill Sample Button
  const fillSampleBtn = document.getElementById('btn-ab-fill-sample');
  if (fillSampleBtn) {
    fillSampleBtn.onclick = () => {
      if (gAbFormat === 'SHORTS') {
        gAbTopic = "매일 쓰는 SOCIAL, 사실 발음 규칙 그대로였다";
        gAbVariants = [
          {
            id: 'A',
            title: "OFFICIAL을 ‘오피시알’로 읽으면 틀립니다 #영어발음 #shorts",
            imageUrl: 'https://i.ytimg.com/vi/7qSWJZqV14o/hqdefault.jpg',
            thumbnailCopy: "OFFICIAL 발음 비밀",
            badge: '1분 컷',
            isLocalFile: false,
          },
          {
            id: 'B',
            title: "왜 HEROIC은 히로익일까? 30초 테스트 #영어발음 #shorts",
            imageUrl: 'https://i.ytimg.com/vi/6nANjHxy2Lc/hqdefault.jpg',
            thumbnailCopy: "발음 테스트 30초",
            badge: '실력 테스트',
            isLocalFile: false,
          },
          {
            id: 'C',
            title: "COMMERCIAL, ‘커머시알’이 아닙니다 #영어발음 #shorts",
            imageUrl: 'https://i.ytimg.com/vi/Si88xXt-EQc/hqdefault.jpg',
            thumbnailCopy: "COMMERCIAL 발음 비법",
            badge: '비법 공개',
            isLocalFile: false,
          },
        ];
      } else {
        gAbTopic = "SPECIAL은 왜 ‘스페시알’이 아닐까? | -CIAL 영어 발음 규칙";
        gAbVariants = [
          {
            id: 'A',
            title: "SPECIAL은 왜 ‘스페시알’이 아닐까? | -CIAL 영어 발음 규칙",
            imageUrl: 'https://i.ytimg.com/vi/sNNufVhkjT8/mqdefault.jpg',
            thumbnailCopy: "SPECIAL 발음 치트키",
            badge: '발음 원리',
            isLocalFile: false,
          },
          {
            id: 'B',
            title: "PICTURE는 왜 '픽투어'가 아닐까? | -TURE 규칙 (영어기초)",
            imageUrl: 'https://i.ytimg.com/vi/YoaCRYCWpws/mqdefault.jpg',
            thumbnailCopy: "PICTURE 소리 비밀",
            badge: '소리 법칙',
            isLocalFile: false,
          },
          {
            id: 'C',
            title: "익-션-전-천-처-저-셜, 사실 딱 하나의 규칙이었습니다 (시즌1 총정리)",
            imageUrl: 'https://i.ytimg.com/vi/3PkSwrFIcRE/mqdefault.jpg',
            thumbnailCopy: "시즌1 완결 총정리 족보",
            badge: '총정리',
            isLocalFile: false,
          },
        ];
      }
      saveAbSimulatorState();
      renderAbSimulatorTabDirect();
      showToast('샘플 ' + (gAbFormat === 'SHORTS' ? '쇼츠' : '롱폼') + ' A/B 데이터가 채워졌습니다!');
    };
  }

  // 12. Reset State Button
  const resetBtn = document.getElementById('btn-ab-reset-state');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('시안 편집기 데이터를 기본 상태로 초기화하시겠습니까?')) {
        try { localStorage.removeItem('ihm_ab_simulator_state'); } catch (_) {}
        location.reload();
      }
    };
  }

  // 채널 기준 인물 이미지를 클립보드로 복사 — 제미나이 웹에서 프롬프트와 함께 붙여넣을 수 있게.
  // 텍스트 복사(execCommand)와 달리 이미지는 Clipboard API(ClipboardItem)가 유일한 방법이라
  // 폴백이 마땅치 않음 — 실패하면 새 탭에서 열어 우클릭 복사하도록 안내한다.
  // ⚠️ 원본 파일은 image/jpeg인데 Chromium의 ClipboardItem.write()는 image/png만 지원한다
  // (image/jpeg를 그대로 넘기면 "Type image/jpeg not supported on write" 예외가 매번 발생해
  // 이 기능이 100% 실패했다 — 2026-09-01 Playwright 검증 중 발견). 그래서 fetch한 jpeg blob을
  // <canvas>에 그린 뒤 canvas.toBlob('image/png')로 변환해 png로만 클립보드에 쓴다.
  const copyPresenterRefHandler = async () => {
    try {
      const res = await fetch('/api/presenter-reference');
      if (!res.ok) throw new Error('이미지를 찾을 수 없습니다');
      const jpegBlob = await res.blob();
      const bitmap = await createImageBitmap(jpegBlob);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const pngBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png');
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      showToast('📋 채널 기준 인물 이미지가 복사되었습니다! 제미나이 웹에 Ctrl+V로 붙여넣으세요.');
    } catch (err) {
      showToast('❌ 자동 복사에 실패했습니다 — 이미지를 새 탭에서 열어 우클릭으로 복사해주세요.');
      window.open('/api/presenter-reference', '_blank');
    }
  };
  const presenterRefImg = document.getElementById('ab-presenter-ref-img');
  if (presenterRefImg) presenterRefImg.onclick = copyPresenterRefHandler;
  const copyPresenterRefBtn = document.getElementById('btn-ab-copy-presenter-ref');
  if (copyPresenterRefBtn) copyPresenterRefBtn.onclick = copyPresenterRefHandler;

  // 13. Run AI Evaluation Button
  const runAiBtn = document.getElementById('btn-ab-run-ai');
  if (runAiBtn) {
    runAiBtn.onclick = async () => {
      const statusBox = document.getElementById('ab-eval-status');
      const statusText = document.getElementById('ab-eval-status-text');
      if (statusBox) statusBox.style.display = 'block';
      if (statusText) statusText.textContent = 'Gemini AI가 ' + (gAbFormat === 'SHORTS' ? '쇼츠(9:16) 사각지대 및 시선 스턴건' : '롱폼(16:9) 호기심 갭 및 가독성') + '을 정밀 진단 중입니다... (약 3~5초 소요)';
      runAiBtn.disabled = true;

      try {
        const payloadVariants = gAbVariants.map(v => ({
          id: v.id,
          title: v.title,
          imageUrl: v._base64Data || v.imageUrl,
          thumbnailHeadline: v.thumbnailHeadline,
        }));

        const res = await fetch('/api/ab-simulator/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: gAbTopic,
            targetAudience: gAbAudience,
            format: gAbFormat,
            variants: payloadVariants,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'AI 진단에 실패했습니다.');

        gAbAiReport = data.evaluation;
        saveAbSimulatorState();
        renderAbSimulatorTabDirect();

        const reportEl = document.getElementById('ab-report-section');
        if (reportEl) reportEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('🎉 Gemini AI CTR 정밀 진단이 완료되었습니다!');
      } catch (err) {
        showToast('❌ 진단 오류: ' + err.message);
      } finally {
        if (statusBox) statusBox.style.display = 'none';
        runAiBtn.disabled = false;
      }
    };
  }

  // 14. Apply AI Title Buttons
  document.querySelectorAll('.btn-ab-apply-title').forEach(btn => {
    btn.onclick = () => {
      const targetVarId = btn.dataset.var;
      const suggestion = ((gAbAiReport && gAbAiReport.aiTitleSuggestions) || [])[Number(btn.dataset.idx)];
      const targetVar = gAbVariants.find(v => v.id === targetVarId);
      if (targetVar && suggestion) {
        targetVar.title = suggestion.title || '';
        targetVar.thumbnailHeadline = suggestion.thumbnailHeadline || targetVar.thumbnailHeadline;
        // designConcept(비주얼 컨셉 한 줄)도 같이 저장 — buildThumbnailPrompt가 이걸 프롬프트에
        // 반영해서, 5종 제안마다 실제로 다른 비주얼이 나오게 한다(2026-09-01, 예전엔 텍스트만
        // 반영되고 이 필드는 화면 표시용으로만 쓰이던 dead data였음 — 사용자 지적으로 발견).
        targetVar.visualConcept = suggestion.designConcept || '';
        // 적용한 시안으로 워크벤치 포커스도 같이 옮긴다 — "지금 워크벤치 = 시안 X" 배지와
        // 텍스트 적용 버튼의 강조 표시가 방금 클릭한 시안으로 바로 따라오게.
        gAbSelectedVariantTab = targetVarId;
        saveAbSimulatorState();
        showToast('시안 ' + targetVarId + '에 제목·카피·뱃지·비주얼 컨셉이 적용됐습니다 (이미지 자체는 그대로예요 — 옆의 🎨 버튼으로 채우세요)');
        renderAbSimulatorTabDirect();
        // 리포트 섹션(아래)에서 클릭했는데 반영 결과는 워크벤치(위)에 나타나므로, 자동
        // 스크롤+짧은 하이라이트로 스크롤 없이 바로 보이게 한다(2026-09-01, 사용자 피드백).
        const wbCard = document.getElementById('ab-workbench-card');
        if (wbCard) {
          wbCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          wbCard.classList.remove('ab-just-applied');
          void wbCard.offsetWidth; // 같은 클래스를 연속 클릭 시에도 애니메이션이 재시작되도록 강제 리플로우
          wbCard.classList.add('ab-just-applied');
          setTimeout(() => wbCard.classList.remove('ab-just-applied'), 900);
        }
      }
    };
  });

  // 16. 1-Click AI Image Generation Handler (FLUX.1 / Imagen 3)
  const generateImgForVariant = async (vKey, promptText, btnEl) => {
    const targetVar = gAbVariants.find(v => v.id === vKey) || currentVar;
    // promptText가 비어 있으면 그대로 빈 문자열로 보낸다 — 서버(generateAiThumbnailImage)가
    // title/topic/thumbnailHeadline으로 자체 템플릿을 구성하므로 여기서 대충 뭉친 대체
    // 프롬프트를 만들면 서버 템플릿을 가로채 버린다(실제로 그랬던 버그였음).
    const finalPrompt = promptText || '';

    const originalText = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.disabled = true;
      btnEl.innerHTML = '⏳ 4K AI 렌더링 중...';
    }

    try {
      showToast('🎨 Gemini 3.6 AI 일러스트레이터가 영상 주제에 맞춘 고유 비주얼 썸네일을 생성 중입니다... (약 10~15초)');
      const res = await fetch('/api/ab-simulator/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          variantKey: vKey,
          title: targetVar.title || gAbTopic || '',
          thumbnailHeadline: targetVar.thumbnailHeadline || '',
          topic: gAbTopic || targetVar.title || '',
          format: gAbFormat,
          engine: 'gemini',
          visualConcept: targetVar.visualConcept || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '이미지 생성 실패');

      // imageUrl은 이제 base64가 아니라 서버가 저장한 파일을 가리키는 짧은 서빙 URL
      // (/api/temp-thumbnail/...)이다 — _base64Data는 진짜 로컬 업로드(파일 첨부) 전용으로
      // 남겨두고 여기서는 건드리지 않는다. resolveImageToInlineData가 이 URL을 직접 처리한다.
      targetVar.imageUrl = data.imageUrl;
      targetVar.isLocalFile = true;

      saveAbSimulatorState();
      renderAbSimulatorTabDirect();
      showToast('🎉 [' + (data.engine || 'Gemini 3.6 AI') + '] 맞춤형 비주얼 썸네일이 시안 ' + vKey + '에 1-Click 적용되었습니다!');
    } catch (err) {
      showToast('❌ 이미지 생성 오류: ' + err.message);
    } finally {
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = originalText;
      }
    }
  };

  const wbGenBtn = document.getElementById('btn-ab-generate-workbench-thumb');
  if (wbGenBtn) {
    wbGenBtn.onclick = () => {
      generateImgForVariant(gAbSelectedVariantTab, '', wbGenBtn);
    };
  }

  // 모바일 클로즈업(thumbnail-close-up.jpg) 1-Click 생성 — CTR 1위 시안(report.bestVariant)의
  // title/thumbnailHeadline/visualConcept를 그대로 가져다 closeUp:true로 생성한다. A/B/C 탭의
  // imageUrl은 건드리지 않고 별도의 gAbCloseUpImageUrl에만 저장한다(2026-09-29).
  const closeUpBtn = document.getElementById('btn-ab-generate-closeup');
  if (closeUpBtn) {
    closeUpBtn.onclick = async () => {
      const bestKey = gAbAiReport && gAbAiReport.bestVariant;
      if (!bestKey) return;
      const bestVar = gAbVariants.find(v => v.id === bestKey);
      if (!bestVar) {
        showToast('❌ 1위 시안(' + bestKey + ')의 시안 데이터를 찾을 수 없습니다.');
        return;
      }
      const originalText = closeUpBtn.innerHTML;
      closeUpBtn.disabled = true;
      closeUpBtn.innerHTML = '⏳ 클로즈업 렌더링 중...';
      try {
        showToast('🔎 CTR 1위 시안(' + bestKey + ') 문구로 모바일 클로즈업을 생성 중입니다... (약 10~15초)');
        const res = await fetch('/api/ab-simulator/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: '',
            variantKey: bestKey,
            title: bestVar.title || gAbTopic || '',
            thumbnailHeadline: bestVar.thumbnailHeadline || '',
            topic: gAbTopic || bestVar.title || '',
            format: gAbFormat,
            engine: 'gemini',
            visualConcept: bestVar.visualConcept || '',
            closeUp: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '클로즈업 생성 실패');
        gAbCloseUpImageUrl = data.imageUrl;
        gAbCloseUpSourceVariant = bestKey;
        saveAbSimulatorState();
        renderAbSimulatorTabDirect();
        showToast('🎉 1위 시안(' + bestKey + ') 문구로 thumbnail-close-up.jpg가 생성되었습니다!');
      } catch (err) {
        showToast('❌ 클로즈업 생성 오류: ' + err.message);
      } finally {
        if (closeUpBtn) {
          closeUpBtn.disabled = false;
          closeUpBtn.innerHTML = originalText;
        }
      }
    };
  }

  // 제미나이 유료 구독으로 직접(API 비용 없이) 생성하고 싶을 때 — 실제 자동 생성과 똑같은
  // 프롬프트를 서버에서 받아와 복사만 해준다(이미지 생성 자체는 안 함).
  const wbCopyPromptBtn = document.getElementById('btn-ab-copy-workbench-prompt');
  if (wbCopyPromptBtn) {
    wbCopyPromptBtn.onclick = async () => {
      const targetVar = gAbVariants.find(v => v.id === gAbSelectedVariantTab) || currentVar;
      const originalText = wbCopyPromptBtn.innerHTML;
      wbCopyPromptBtn.disabled = true;
      wbCopyPromptBtn.innerHTML = '⏳ 준비 중...';
      try {
        const res = await fetch('/api/ab-simulator/thumbnail-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantKey: gAbSelectedVariantTab,
            title: targetVar.title || gAbTopic || '',
            thumbnailHeadline: targetVar.thumbnailHeadline || '',
            topic: gAbTopic || targetVar.title || '',
            format: gAbFormat,
            visualConcept: targetVar.visualConcept || '',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '프롬프트 생성 실패');

        const promptText = data.prompt || '';
        const copyViaExecCommand = () => {
          try {
            const ta = document.createElement('textarea');
            ta.value = promptText;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            showToast(ok ? '📋 프롬프트가 복사되었습니다! gemini.google.com에 붙여넣어 생성하세요.' : '❌ 복사에 실패했습니다.');
          } catch (err) {
            showToast('❌ 복사에 실패했습니다.');
          }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(promptText)
            .then(() => showToast('📋 프롬프트가 복사되었습니다! gemini.google.com에 붙여넣어 생성하세요.'))
            .catch(() => copyViaExecCommand());
        } else {
          copyViaExecCommand();
        }
      } catch (err) {
        showToast('❌ 프롬프트 준비 오류: ' + err.message);
      } finally {
        wbCopyPromptBtn.disabled = false;
        wbCopyPromptBtn.innerHTML = originalText;
      }
    };
  }

  // 클로즈업(thumbnail-close-up.jpg) 전용 프롬프트만 복사 — 위 wbCopyPromptBtn과 똑같은
  // "API 비용 없이 gemini.google.com에 직접 붙여넣기" 경로인데, closeUp:true를 안 보내면
  // 일반 A/B/C용 프롬프트(배경 장면 + 정체성 태그 2개)가 그대로 나가버린다(2026-09-29,
  // 사용자가 이 버튼으로 만든 결과물에서 실제로 확인 — 클로즈업 강제 구도가 전혀 반영 안 됨).
  const closeUpCopyBtn = document.getElementById('btn-ab-copy-closeup-prompt');
  if (closeUpCopyBtn) {
    closeUpCopyBtn.onclick = async () => {
      const bestKey = gAbAiReport && gAbAiReport.bestVariant;
      if (!bestKey) return;
      const bestVar = gAbVariants.find(v => v.id === bestKey);
      if (!bestVar) {
        showToast('❌ 1위 시안(' + bestKey + ')의 시안 데이터를 찾을 수 없습니다.');
        return;
      }
      const originalText = closeUpCopyBtn.innerHTML;
      closeUpCopyBtn.disabled = true;
      closeUpCopyBtn.innerHTML = '⏳ 준비 중...';
      try {
        const res = await fetch('/api/ab-simulator/thumbnail-prompt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            variantKey: bestKey,
            title: bestVar.title || gAbTopic || '',
            thumbnailHeadline: bestVar.thumbnailHeadline || '',
            topic: gAbTopic || bestVar.title || '',
            format: gAbFormat,
            visualConcept: bestVar.visualConcept || '',
            closeUp: true,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '프롬프트 생성 실패');

        const promptText = data.prompt || '';
        const copyViaExecCommand = () => {
          try {
            const ta = document.createElement('textarea');
            ta.value = promptText;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            showToast(ok ? '📋 클로즈업 프롬프트가 복사되었습니다! gemini.google.com에 붙여넣어 생성하세요.' : '❌ 복사에 실패했습니다.');
          } catch (err) {
            showToast('❌ 복사에 실패했습니다.');
          }
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(promptText)
            .then(() => showToast('📋 클로즈업 프롬프트가 복사되었습니다! gemini.google.com에 붙여넣어 생성하세요.'))
            .catch(() => copyViaExecCommand());
        } else {
          copyViaExecCommand();
        }
      } catch (err) {
        showToast('❌ 프롬프트 준비 오류: ' + err.message);
      } finally {
        closeUpCopyBtn.disabled = false;
        closeUpCopyBtn.innerHTML = originalText;
      }
    };
  }

  // Gallery Card AI Generation Buttons
  document.querySelectorAll('.btn-ab-generate-card-thumb').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const vKey = btn.dataset.var;
      generateImgForVariant(vKey, '', btn);
    };
  });

  // Prefetch/refresh competitor videos — topic이 바뀌면(예: 아이디어 보드에서 핸드오프) 다시
  // 가져온다. 예전엔 한 번만 불러온 뒤 화면 어디에도 안 쓰이던 죽은 데이터였음(2026-09-01 수정) —
  // 이제 LIVE MOBILE FEED PREVIEW의 경쟁 영상 카드들이 이 데이터를 실제로 그린다.
  if (gAbCompetitors.length === 0 || gAbCompetitorsFetchedForTopic !== gAbTopic) {
    const topicAtFetch = gAbTopic;
    gAbCompetitorsFetchedForTopic = topicAtFetch; // 같은 topic으로 재렌더될 때마다 중복 요청 방지(낙관적 마킹)
    fetch('/api/ab-simulator/competitors?topic=' + encodeURIComponent(topicAtFetch)).then(r => r.json()).then(data => {
      if (data.competitors && data.competitors.length > 0) {
        gAbCompetitors = data.competitors;
        renderAbFeedOnly();
      }
    }).catch(() => { gAbCompetitorsFetchedForTopic = null; }); // 실패하면 다음 렌더에서 재시도
  }
}

function renderAbSimulatorTabDirect(options = {}) {
  if (gCurrentTab === 'tab-ab-simulator') {
    const scrollEl = document.querySelector('.mockup-feed-scroll');
    const currentScrollTop = scrollEl ? scrollEl.scrollTop : 0;

    renderCurrentTab();

    const newScrollEl = document.querySelector('.mockup-feed-scroll');
    if (newScrollEl) {
      newScrollEl.scrollTop = currentScrollTop;
      if (options && options.scrollToActive) {
        setTimeout(() => {
          const activeCard = newScrollEl.querySelector('.active-test');
          if (activeCard) {
            activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 30);
      }
    }
  }
}

function renderAbFeedOnly() {
  if (gCurrentTab === 'tab-ab-simulator') {
    const scrollEl = document.querySelector('.mockup-feed-scroll');
    const currentScrollTop = scrollEl ? scrollEl.scrollTop : 0;
    renderCurrentTab();
    const newScrollEl = document.querySelector('.mockup-feed-scroll');
    if (newScrollEl) newScrollEl.scrollTop = currentScrollTop;
  }
}

/* TAB 7: DESIGN SYSTEM */
function renderDesignSystemTab() {
  return '<div class="bento-grid">' +
    '<div class="bento-card highlight-magenta col-12">' +
      '<div class="card-title" style="color:#ffccd9">BRAND IDENTITY & DESIGN TOKENS</div>' +
      '<h2 style="font-family:var(--font-display);font-size:24px;color:#fff;margin-top:2px">🎨 IHM Easy English Cyber-HUD 디자인 시스템</h2>' +
      '<p style="color:#ffe6ec;margin-top:4px;font-size:13px">채널 썸네일, Faceless Explainer 자막 카드, 데이터 분석 대시보드 전반에 적용되는 통일된 디자인 규격입니다.</p>' +
    '</div>' +

    '<div class="bento-card col-4">' +
      '<div class="card-header"><span class="card-title" style="color:var(--accent-magenta)">Neon Magenta (#ff2a6d)</span></div>' +
      '<div style="height:48px;background:#ff2a6d;border-radius:8px;margin-bottom:8px"></div>' +
      '<div class="card-subtext">시그니처 포인트, 핫 이슈, 최고 성과, 핵심 알림</div>' +
    '</div>' +

    '<div class="bento-card col-4">' +
      '<div class="card-header"><span class="card-title" style="color:var(--accent-cyan)">Cyber Cyan (#00f0ff)</span></div>' +
      '<div style="height:48px;background:#00f0ff;border-radius:8px;margin-bottom:8px"></div>' +
      '<div class="card-subtext">주요 인터랙션, 통과 뱃지, 실시간 연결 상태</div>' +
    '</div>' +

    '<div class="bento-card col-4">' +
      '<div class="card-header"><span class="card-title" style="color:var(--accent-amber)">Electric Amber (#ffd166)</span></div>' +
      '<div style="height:48px;background:#ffd166;border-radius:8px;margin-bottom:8px"></div>' +
      '<div class="card-subtext">주의 & 기회, 보류 뱃지, 3초 후킹 하이라이트</div>' +
    '</div>' +

    '<div class="bento-card col-12">' +
      '<div class="card-header"><span class="card-title">📖 브랜드 디자인 시스템 마크다운 문서 (knowledge/brand-dashboard-design-system.md)</span></div>' +
      '<p class="card-subtext">전체 디자인 시스템 세부 규격은 로컬 마크다운 파일로 영구 보존되어 언제든 재사용 가능합니다.</p>' +
    '</div>' +
  '</div>';
}

/* TAB: KNOWLEDGE DB (audience-dna.json / success-patterns.json 누적·환류 뷰어) */
function renderKnowledgeDbTab() {
  const dna = gKnowledgeDb?.audienceDna?.entries || [];
  const patterns = gKnowledgeDb?.successPatterns?.entries || [];
  const typeLabel = {painPoint: '😣 고통점', question: '❓ 질문', vocabulary: '🗣️ 어휘'};
  // 어느 채널의 어느 분석(댓글 VoC vs 경쟁사 대본 역설계)에서 나온 항목인지 한 리스트에 섞여
  // 보여서 구분이 안 됐다(2026-09-07, 사용자 지적). upsertAudienceDna가 이미 sources[].sourceType에
  // 'outlierComment'/'competitorScript'를 기록해 두고 있었으므로, 그 값으로 배지와 출처 필터를 만든다.
  const sourceLabel = {outlierComment: '💬 댓글', competitorScript: '📜 대본'};
  const entrySourceTypes = (d) => [...new Set((d.sources || []).map((s) => s.sourceType).filter(Boolean))];
  const dnaByComment = dna.filter((d) => entrySourceTypes(d).includes('outlierComment'));
  const dnaByScript = dna.filter((d) => entrySourceTypes(d).includes('competitorScript'));
  const filteredDna = gKdbSourceFilter === 'ALL' ? dna : dna.filter((d) => entrySourceTypes(d).includes(gKdbSourceFilter));

  let html = '<div class="bento-grid">' +
    '<div class="bento-card col-12">' +
      '<div class="card-title" style="color:var(--accent-violet)">GROWTH FLYWHEEL DATA ASSET</div>' +
      '<h2 style="font-family:var(--font-display);font-size:22px;color:var(--text-bright);margin-top:2px">🧬 데이터 자산 (Knowledge DB)</h2>' +
      '<p class="card-subtext">경쟁사 댓글·대본 분석과 우리 채널 Q1(알고리즘 효자) 진단에서 누적된 데이터입니다. ' +
      '4사분면 진단·A/B 시뮬레이터 프롬프트에 자동으로 다시 주입되어 시간이 지날수록 더 정확한 제안을 만듭니다.</p>' +
    '</div>';

  html += '<div class="bento-card col-12">' +
    '<div class="card-header"><span class="card-title" style="color:var(--accent-emerald)">🏆 성공 패턴 DB (success-patterns.json) · ' + patterns.length + '건</span></div>' +
    (patterns.length === 0
      ? '<p class="card-subtext">아직 없습니다. Matrix 탭에서 Q1 영상을 AI 진단하면 여기 쌓입니다.</p>'
      : patterns.map((p) => (
        '<div class="kdb-row" style="background:#090e18;border:1px solid var(--border-subtle);border-radius:10px;padding:12px 14px;margin-bottom:8px">' +
          '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
            '<div style="min-width:0">' +
              '<div style="font-weight:700;font-size:13px;color:var(--text-bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.title || p.videoId) + '</div>' +
              '<div class="card-subtext">CTR ' + (p.ctr ?? '-') + '% · 지속률 ' + (p.retentionRate ?? '-') + '% · ' + esc((p.diagnosedAt || '').slice(0,10)) + '</div>' +
              '<div style="font-size:12px;color:var(--text-normal);margin-top:6px"><b>후킹:</b> ' + esc(p.reusableHook || '기록 없음') + '</div>' +
              '<div style="font-size:12px;color:var(--text-normal);margin-top:2px"><b>비유:</b> ' + esc(p.reusableAnalogy || '기록 없음') + '</div>' +
            '</div>' +
            '<button class="btn btn-sm btn-outline btn-kdb-delete" data-store="successPatterns" data-id="' + esc(p.id) + '" title="삭제">🗑️</button>' +
          '</div>' +
        '</div>'
      )).join('')) +
  '</div>';

  html += '<div class="bento-card col-12">' +
    '<div class="card-header"><span class="card-title" style="color:var(--accent-amber)">🎯 시청자 DNA (audience-dna.json) · ' + dna.length + '건</span></div>' +
    (dna.length === 0 ? '' :
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">' +
        '<span style="font-size:11px;font-weight:700;color:var(--text-muted)">출처 필터:</span>' +
        '<button class="tab-pill btn-kdb-source-filter' + (gKdbSourceFilter === 'ALL' ? ' active' : '') + '" data-source="ALL">전체 (' + dna.length + ')</button>' +
        '<button class="tab-pill btn-kdb-source-filter' + (gKdbSourceFilter === 'outlierComment' ? ' active' : '') + '" data-source="outlierComment">💬 댓글 분석 (' + dnaByComment.length + ')</button>' +
        '<button class="tab-pill btn-kdb-source-filter' + (gKdbSourceFilter === 'competitorScript' ? ' active' : '') + '" data-source="competitorScript">📜 대본 분석 (' + dnaByScript.length + ')</button>' +
      '</div>'
    ) +
    (dna.length === 0
      ? '<p class="card-subtext">아직 없습니다. Outlier Lab 탭에서 댓글 분석 또는 대본 역설계를 실행하면 여기 쌓입니다.</p>'
      : filteredDna.length === 0
      ? '<p class="card-subtext">이 출처로는 아직 쌓인 항목이 없습니다.</p>'
      : filteredDna.map((d) => (
        '<div class="kdb-row" style="background:#090e18;border:1px solid var(--border-subtle);border-radius:10px;padding:10px 14px;margin-bottom:6px;display:flex;justify-content:space-between;gap:10px;align-items:center">' +
          '<div style="min-width:0;display:flex;gap:10px;align-items:center">' +
            '<span class="badge badge-hold" style="flex-shrink:0">' + (typeLabel[d.type] || d.type) + '</span>' +
            entrySourceTypes(d).map((st) => '<span class="badge" style="flex-shrink:0;font-size:10px;border-color:var(--accent-violet);color:var(--accent-violet)">' + (sourceLabel[st] || st) + '</span>').join('') +
            '<span style="font-size:13px;color:var(--text-normal);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(d.text) + '</span>' +
            '<span class="card-subtext" style="flex-shrink:0">' + (d.occurrences || 1) + '회 · ' + (d.sources?.length || 0) + '개 영상</span>' +
          '</div>' +
          '<button class="btn btn-sm btn-outline btn-kdb-delete" data-store="audienceDna" data-id="' + esc(d.id) + '" title="삭제">🗑️</button>' +
        '</div>'
      )).join('')) +
  '</div>';

  html += '</div>';
  return html;
}

function bindKnowledgeDbEvents() {
  document.querySelectorAll('.btn-kdb-source-filter').forEach((btn) => {
    btn.onclick = () => {
      gKdbSourceFilter = btn.dataset.source;
      renderCurrentTab();
    };
  });

  document.querySelectorAll('.btn-kdb-delete').forEach((btn) => {
    btn.onclick = async () => {
      if (!confirm('이 항목을 영구 삭제할까요?')) return;
      btn.disabled = true;
      try {
        const res = await fetch('/api/knowledge-db/delete', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({store: btn.dataset.store, id: btn.dataset.id}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '삭제 실패');
        const kdbRes = await fetch('/api/knowledge-db');
        gKnowledgeDb = kdbRes.ok ? await kdbRes.json() : gKnowledgeDb;
        showToast('삭제되었습니다.');
        renderCurrentTab();
      } catch (err) {
        alert('❌ 오류: ' + err.message);
        btn.disabled = false;
      }
    };
  });
}

/* TAB: 💡 IDEA BOARD (아이디어 추천 → A/B 시뮬레이터 핸드오프) */
function renderIdeaBoardTab() {
  const md = gMarketDemand;
  const co = gContentOpportunity;
  const hasMd = !!(md && md.byKeyword && md.byKeyword.length);
  const hasCo = !!(co && ((co.byRule && co.byRule.length) || (co.byRole && co.byRole.length)));

  if (!hasMd && !hasCo) {
    return '<div class="bento-card" style="padding:40px;text-align:center">' +
      '<h3>아이디어 추천에 필요한 데이터가 아직 없습니다.</h3>' +
      '<p class="card-subtext" style="justify-content:center;margin-bottom:20px">market-demand·content-opportunity 데이터를 먼저 생성해야 근거 있는 소재 후보를 추천할 수 있습니다.</p>' +
      '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
        '<button class="btn btn-magenta" id="btn-idea-board-run-demand">🚀 시장 수요 분석 실행</button>' +
        '<button class="btn btn-cyan" id="btn-idea-board-run-co">📊 채널 성과 분석 실행</button>' +
      '</div>' +
    '</div>';
  }

  const srcLabel = {marketDemand: '시장수요', contentOpportunity: '채널성과', audienceDna: '시청자DNA', successPatterns: '성공패턴'};
  const candidates = (gIdeaBoardCandidates && gIdeaBoardCandidates.candidates) || [];
  const genAt = gIdeaBoardGeneratedAt ? esc(gIdeaBoardGeneratedAt.slice(0, 19).replace('T', ' ')) : '';
  // 마지막 생성에 쓴 집중 키워드를 사람이 읽는 문구로도 보여준다(아래 <select> 복원과 별개로,
  // 셀렉트를 못 보고 지나쳐도 "마지막 생성" 옆에서 바로 확인 가능하게).
  const focusLabel = gIdeaBoardFocusKeyword ? ' · 집중 키워드: "' + esc(gIdeaBoardFocusKeyword) + '"' : (genAt ? ' · 전체 데이터 참고' : '');
  // Claude가 대화창에서 수동으로 써 준 초안을 불러온 결과인지 표시 — Gemini 결과와 구분돼야
  // 나중에 "이게 AI가 진짜 근거로 뽑은 거 맞나" 헷갈리지 않는다(2026-09-13).
  const generatedByLabel = gIdeaBoardCandidates?.generatedBy === 'claude' ? ' · ✍️ Claude 수동 생성' : '';

  // 시장 수요 레이더의 특정 키워드 하나에 집중해서 아이디어를 뽑고 싶을 때를 위한 선택지
  // (2026-09-13, 사용자 제안: "아이디어 보드에 셀렉터 버튼으로 선택하는건 어때?" — 처음엔 시장
  // 수요 카드마다 "이 키워드로 생성" 버튼을 얹는 안이었는데, 카드 9개마다 버튼을 반복하는 대신
  // 여기 한 곳에 드롭다운으로 모아두는 게 더 깔끔하다는 제안으로 방향 전환). 기본값은 지금까지의
  // 동작 그대로(상위 8개 키워드를 두루 참고) — 드롭다운에서 특정 키워드를 고를 때만 그 키워드
  // 하나에 집중하도록 focusKeyword를 서버에 넘긴다.
  // 생성 완료 후 화면을 다시 그리면 <select>가 통째로 새로 만들어지는데, 방금 쓴 키워드를
  // selected로 표시해두지 않으면 매번 기본값("전체 데이터 참고")으로 보여서 "내가 뭘로
  // 생성했는지 모르겠다"는 문제가 있었다(2026-09-13, 사용자 지적). gIdeaBoardFocusKeyword와
  // 비교해서 마지막으로 실제 생성에 쓴 키워드를 그대로 selected 처리한다.
  const focusOptions = (md?.byKeyword || [])
    .map((k) => '<option value="' + esc(k.keyword) + '"' + (k.keyword === gIdeaBoardFocusKeyword ? ' selected' : '') + '>' + esc(k.keyword) + '</option>')
    .join('');

  let html = '<div class="bento-grid">' +
    '<div class="bento-card highlight-cyan col-12" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px">' +
      '<div>' +
        '<div class="card-title" style="color:var(--accent-cyan)">IDEA → THUMBNAIL PIPELINE</div>' +
        '<h2 style="font-family:var(--font-display);font-size:22px;color:var(--text-bright);margin-top:2px">💡 아이디어→썸네일 기획 보드</h2>' +
        '<div class="card-subtext">market-demand · content-opportunity · audience-dna · success-patterns 4개 데이터를 근거로 다음 소재를 추천합니다' + (genAt ? ' · 마지막 생성: ' + genAt : '') + focusLabel + generatedByLabel + '</div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        (focusOptions ?
          '<select id="select-idea-focus-keyword" title="특정 키워드 하나에 집중해서 생성하고 싶으면 선택" style="max-width:220px">' +
            '<option value=""' + (gIdeaBoardFocusKeyword ? '' : ' selected') + '>전체 데이터 참고 (기본)</option>' +
            focusOptions +
          '</select>' : '') +
        '<button class="btn btn-magenta" id="btn-idea-board-generate">🔄 아이디어 후보 5개 생성</button>' +
        '<button class="btn btn-outline" id="btn-idea-board-load-manual" title="Gemini 호출 없이, 대화창에서 Claude에게 직접 요청해 만든 초안을 불러옵니다(월간 지출 한도 초과 등으로 API가 막혔을 때)">✍️ Claude 초안 불러오기</button>' +
      '</div>' +
    '</div>' +
    '<div id="idea-board-status" style="display:none; margin-top:0; padding:12px 16px; background:rgba(0,240,255,0.12); border:1px solid var(--accent-cyan); border-radius:10px; color:var(--text-bright); font-weight:700;" class="bento-card col-12">' +
      '⏳ Gemini AI가 4개 데이터 소스를 근거로 소재 후보를 뽑는 중입니다... (약 5~10초 소요)' +
    '</div>';

  if (gIdeaBoardHistory.length) {
    // 배너에는 최근 N개만 보여준다 — AI 추천에 넘기는 목록(producedTopics)은 이 화면 표시와
    // 무관하게 항상 전체를 다 쓴다(2026-09-11, "많이 늘어나면 어떻게 처리됨?" 대응 — 무제한
    // 칩 목록이 페이지를 다 차지하는 걸 막되, 실제 중복 방지 로직은 그대로 전부 반영).
    const total = gIdeaBoardHistory.length;
    const showAll = gIdeaBoardHistoryExpanded || total <= IDEA_BOARD_HISTORY_COLLAPSED_COUNT;
    const visible = showAll ? gIdeaBoardHistory : gIdeaBoardHistory.slice(-IDEA_BOARD_HISTORY_COLLAPSED_COUNT);
    const hiddenCount = total - visible.length;
    html += '<div class="bento-card col-12" style="background:rgba(16,185,129,0.08);border:1px solid var(--accent-emerald)">' +
      '<div class="card-title" style="color:var(--accent-emerald)">✅ 이미 만든 소재(' + total + '건) — 아래 후보 생성 시 자동으로 제외됨</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
      visible.map((h) =>
        '<span class="tag-chip" style="font-size:12px">' + esc(h.episodeLabel || h.episodeSlug || '') + ' · ' + esc(h.topic || '') +
        (h.status ? ' (' + esc(h.status) + ')' : '') +
        (h.status === 'selected' ?
          ' <button class="btn-idea-history-release" data-topic="' + esc(h.topic) + '" title="선택 해지 — 다시 추천 후보로 돌아갈 수 있게 됩니다(프로젝트 파일은 지우지 않음)" style="margin-left:4px;background:none;border:none;color:#ff5577;cursor:pointer;font-weight:800;font-size:13px;line-height:1">✕</button>' : '') +
        '</span>'
      ).join('') +
      (hiddenCount > 0 ?
        '<button class="btn btn-sm" id="btn-idea-history-toggle" style="font-size:12px">+' + hiddenCount + '개 더 있음 · 펼치기</button>' :
        (total > IDEA_BOARD_HISTORY_COLLAPSED_COUNT ?
          '<button class="btn btn-sm" id="btn-idea-history-toggle" style="font-size:12px">접기</button>' : '')) +
      '</div>' +
    '</div>';
  }

  if (!candidates.length) {
    html += '<div class="bento-card col-12" style="padding:30px;text-align:center"><p class="card-subtext" style="justify-content:center">위 버튼을 눌러 데이터 기반 소재 후보 5개를 생성하세요.</p></div>';
  } else {
    if (gIdeaBoardCandidates.summaryNote) {
      html += '<div class="bento-card col-12" style="font-size:12px;color:var(--text-muted)">📋 ' + esc(gIdeaBoardCandidates.summaryNote) + '</div>';
    }
    // 후보 목록은 생성된 시점의 스냅샷이라(서버/localStorage에 캐시됨), 생성 이후 실제로 제작이
    // 끝나 idea-board-history.json에 새로 기록된 소재와 겹쳐도 저절로 안 걸러진다 — 그래서
    // "이미 만든 소재" 배너에도 있고 후보 카드로도 여전히 뜨는 모순이 생겼다(2026-09-07, 사용자
    // 지적). 새로 생성할 때만 걸러지는 프롬프트 단계와 별개로, 렌더할 때마다 매번 최신
    // gIdeaBoardHistory와 대조해서 이미 제작된 후보는 선택 못 하게 표시한다.
    const normalizeTopic = (s) => String(s || '').trim();
    // status별로 라벨을 다르게 보여준다 — 'selected'는 "이 주제로 진행" 누른 직후 자동 기록된
    // 상태(아직 대본/렌더 전이라 "제작됨"이라고 하면 거짓말)이고, 'scheduled'/'published'는 실제로
    // 끝난 것. (2026-09-07, 선택 즉시 자동 기록 기능 추가하면서 상태 구분도 같이 반영.)
    const historyStatusLabel = { selected: '🔄 이미 진행 중', scheduled: '✅ 이미 제작됨', published: '✅ 이미 공개됨' };
    candidates.forEach((c) => {
      const isSelected = !!(gIdeaBoardSelected && gIdeaBoardSelected.rank === c.rank && gIdeaBoardSelected.topic === c.topic);
      const historyMatch = gIdeaBoardHistory.find((h) => normalizeTopic(h.topic) === normalizeTopic(c.topic));
      // 방금 선택해서 history 상태가 아직 'selected'(막 고른 초기 단계)인 자기 자신만 잠금 표시
      // 대상에서 뺀다 — 안 그러면 선택 즉시 자동 기록되는 이 항목이 스스로를 잠가서 "✅ 선택됨"
      // 표시가 안 뜬다. 하지만 'scheduled'/'published'처럼 더 진행된 상태면, 지금 화면에서 계속
      // 선택 중이더라도(업로드 패키지·예약까지 이미 끝났다는 뜻이므로) 그대로 잠금 표시를 보여준다
      // (2026-09-07, "예약까지 하면 잠겨야 하는거 아님?"이라는 사용자 지적으로 반영).
      const producedMatch = historyMatch && !(isSelected && historyMatch.status === 'selected') ? historyMatch : null;
      const producedLabel = producedMatch ? (historyStatusLabel[producedMatch.status] || '🔒 이미 진행됨') : '';
      html += '<div class="bento-card col-3" style="border:' + (isSelected ? '2px solid var(--accent-emerald)' : '1px solid var(--border-subtle)') + (producedMatch ? ';opacity:0.6' : '') + '">' +
        '<div class="card-header">' +
          '<span style="font-family:var(--font-display);font-weight:800;font-size:15px;color:var(--text-bright)">#' + esc(c.rank) + ' ' + esc(c.topic || '') + '</span>' +
          (producedMatch ?
            '<span class="badge badge-strong-pass" title="' + esc(producedMatch.episodeLabel || '') + (producedMatch.status ? ' · ' + esc(producedMatch.status) : '') + '">' + producedLabel + '</span>' :
            '<span class="badge badge-pass">점수 ' + (c.score || 0) + '</span>') +
        '</div>' +
        '<div style="font-size:13px;color:var(--accent-amber);margin:8px 0">🎣 ' + esc(c.angleOrHook || '') + '</div>' +
        '<div style="font-size:12px;color:var(--text-normal);margin-bottom:10px">' + esc(c.rationale || '') + '</div>' +
        (c.targetAudience ? '<div style="font-size:11px;color:var(--accent-cyan);margin-bottom:6px">👥 ' + esc(c.targetAudience) + '</div>' : '') +
        ((c.dataSourceRefs && c.dataSourceRefs.length) ?
          '<div style="margin-bottom:10px">' + c.dataSourceRefs.map((r) => '<span class="tag-chip" style="font-size:10px">' + esc(srcLabel[r.source] || r.source) + ': ' + esc(r.detail || '') + '</span>').join('') + '</div>' : '') +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">' +
          '<span class="tag-chip">' + (c.suggestedFormat === 'SHORTS' ? '📱 쇼츠' : '📺 롱폼') + '</span>' +
          (producedMatch ?
            '<span class="badge badge-hold" style="cursor:default" title="' + esc(producedMatch.episodeLabel || '') + '(으)로 ' + esc(producedMatch.status || '') + ' — 선택 불가">' + producedLabel + '</span>' +
            (producedMatch.status === 'selected' ?
              '<button class="btn btn-sm btn-idea-history-release" data-topic="' + esc(producedMatch.topic || c.topic) + '" style="margin-left:6px;color:#ff5577;border-color:#ff5577">해지</button>' : '') :
            '<button class="btn btn-sm ' + (isSelected ? 'btn-cyan' : 'btn-outline') + ' btn-idea-board-pick" data-rank="' + esc(c.rank) + '">' + (isSelected ? '✅ 선택됨' : '이 주제로 진행 →') + '</button>') +
        '</div>' +
      '</div>';
    });
  }

  if (gIdeaBoardSelected) {
    html += '<div class="bento-card highlight-magenta col-12">' +
      '<div class="card-title" style="color:#ffccd9">선택된 기획</div>' +
      '<h3 style="color:#fff;margin-top:4px">' + esc(gIdeaBoardSelected.topic || '') + '</h3>' +
      '<div class="card-subtext">' + esc(gIdeaBoardSelected.rationale || '') + '</div>' +
      (gIdeaBoardSelected.targetAudience ? '<div style="font-size:12px;color:var(--accent-cyan);margin-top:6px">👥 타겟 시청자층: ' + esc(gIdeaBoardSelected.targetAudience) + '</div>' : '') +
      '<div style="margin-top:12px"><button class="btn btn-cyan" id="btn-idea-board-handoff">🎯 제목·썸네일 확정하러 가기</button></div>' +
    '</div>';
  }

  html += '</div>';
  return html;
}

function bindIdeaBoardEvents() {
  const historyToggleBtn = document.getElementById('btn-idea-history-toggle');
  if (historyToggleBtn) {
    historyToggleBtn.onclick = () => {
      gIdeaBoardHistoryExpanded = !gIdeaBoardHistoryExpanded;
      renderCurrentTab();
    };
  }

  const genBtn = document.getElementById('btn-idea-board-generate');
  if (genBtn) {
    genBtn.onclick = async () => {
      const statusBox = document.getElementById('idea-board-status');
      if (statusBox) statusBox.style.display = 'block';
      genBtn.disabled = true;
      const originalText = genBtn.innerHTML;
      genBtn.innerHTML = '⏳ 생성 중...';
      const focusSelect = document.getElementById('select-idea-focus-keyword');
      const focusKeyword = focusSelect ? focusSelect.value : '';
      try {
        const res = await fetch('/api/idea-board/generate-candidates', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(focusKeyword ? {focusKeyword} : {}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '아이디어 생성에 실패했습니다.');
        gIdeaBoardCandidates = data;
        gIdeaBoardGeneratedAt = data.generatedAt || new Date().toISOString();
        gIdeaBoardFocusKeyword = focusKeyword || null;
        gIdeaBoardSelected = null;
        saveIdeaBoardState();
        // 서버가 생성 직전에 "찜만 하고 제작으로 안 넘어간" 이력을 정리했을 수 있으니
        // (2026-09-11 확인), 배너에 옛 개수가 남지 않도록 이력도 같이 새로 받아온다.
        await hydrateIdeaBoardFromServer();
        renderCurrentTab();
        showToast(focusKeyword ? '💡 "' + focusKeyword + '" 키워드에 집중한 아이디어 후보 5개가 생성되었습니다!' : '💡 아이디어 후보 5개가 생성되었습니다!');
      } catch (err) {
        showToast('❌ 오류: ' + err.message);
      } finally {
        if (statusBox) statusBox.style.display = 'none';
        genBtn.disabled = false;
        genBtn.innerHTML = originalText;
      }
    };
  }

  const loadManualBtn = document.getElementById('btn-idea-board-load-manual');
  if (loadManualBtn) {
    loadManualBtn.onclick = async () => {
      loadManualBtn.disabled = true;
      const original = loadManualBtn.innerHTML;
      loadManualBtn.innerHTML = '⏳ 불러오는 중...';
      try {
        const res = await fetch('/api/idea-board/manual-draft');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '초안을 불러오지 못했습니다.');
        // 실제 Gemini 생성 성공 흐름과 완전히 동일하게 처리한다 — 화면 입장에서는 출처가
        // Gemini인지 Claude인지 몰라도 되고, 저장·이력 갱신·핸드오프 전부 똑같이 동작해야 한다.
        gIdeaBoardCandidates = data;
        gIdeaBoardGeneratedAt = data.generatedAt || new Date().toISOString();
        gIdeaBoardFocusKeyword = data.focusKeyword || null;
        gIdeaBoardSelected = null;
        saveIdeaBoardState();
        await hydrateIdeaBoardFromServer();
        renderCurrentTab();
        showToast('✍️ Claude가 작성한 초안을 불러왔습니다' + (data.focusKeyword ? ' ("' + data.focusKeyword + '" 집중)' : '') + '.');
      } catch (err) {
        showToast('❌ ' + err.message);
      } finally {
        loadManualBtn.disabled = false;
        loadManualBtn.innerHTML = original;
      }
    };
  }

  document.querySelectorAll('.btn-idea-history-release').forEach((btn) => {
    btn.onclick = async (ev) => {
      ev.stopPropagation();
      const topic = btn.dataset.topic;
      if (!topic) return;
      if (!confirm('"' + topic + '" 선택을 해지할까요? 다시 추천 후보에 나올 수 있게 됩니다 (이미 만든 프로젝트 파일이 있다면 지우지는 않습니다).')) return;
      try {
        const res = await fetch('/api/idea-board/history/release', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({topic}),
        });
        const data = await res.json();
        if (res.ok && data.entries) {
          gIdeaBoardHistory = data.entries;
          // 해지한 소재가 현재 화면에 선택된 상태(gIdeaBoardSelected)였다면 선택도 같이 풀어준다
          // — 안 그러면 해지했는데도 "✅ 선택됨" 표시가 그대로 남아 혼란스럽다.
          if (gIdeaBoardSelected && gIdeaBoardSelected.topic === topic) {
            gIdeaBoardSelected = null;
            saveIdeaBoardState();
          }
          renderCurrentTab();
          showToast('🔓 "' + topic + '" 선택을 해지했습니다.');
        } else {
          showToast('⚠️ 해지 실패: ' + (data.error || '알 수 없는 오류'));
        }
      } catch (err) {
        showToast('⚠️ 해지 요청 실패: ' + err.message);
      }
    };
  });

  document.querySelectorAll('.btn-idea-board-pick').forEach((btn) => {
    btn.onclick = async () => {
      const rank = Number(btn.dataset.rank);
      const cand = ((gIdeaBoardCandidates && gIdeaBoardCandidates.candidates) || []).find((c) => c.rank === rank);
      if (!cand) return;
      gIdeaBoardSelected = cand;
      saveIdeaBoardState();
      renderCurrentTab();
      showToast('✅ "' + cand.topic + '" 소재를 선택했습니다.');
      // "이 주제로 진행" 누른 그 순간 바로 idea-board-history.json에 기록한다 — 전에는 영상이
      // 완전히 제작·예약될 때까지 기록이 안 남아서, 그 며칠 사이에 후보를 다시 생성하면 같은
      // 소재가 또 추천될 수 있었다(2026-09-07, EP13이 실제로 며칠 동안 미등록 상태였던 걸
      // 사용자가 발견). 선택 즉시 기록해서 그 공백을 없앤다 — 이후 대본 확정/렌더/예약 단계는
      // production-rules.md에 적어둔 대로 각 단계 끝날 때 이 기록을 계속 갱신한다.
      try {
        const res = await fetch('/api/idea-board/history/register', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(cand),
        });
        const data = await res.json();
        if (res.ok && data.entries) {
          gIdeaBoardHistory = data.entries;
          renderCurrentTab();
        }
      } catch (err) {
        console.warn('Failed to register idea-board history:', err);
      }
    };
  });

  const handoffBtn = document.getElementById('btn-idea-board-handoff');
  if (handoffBtn) {
    handoffBtn.onclick = () => {
      const sel = gIdeaBoardSelected;
      if (!sel) return;
      gAbFormat = sel.suggestedFormat === 'SHORTS' ? 'SHORTS' : 'LONGFORM';
      gAbTopic = sel.topic;
      // 예전엔 핸드오프가 gAbAudience를 아예 안 건드려서 이전 값이 그대로 남았다(사용자 지적,
      // 2026-09-01) — 아이디어 후보의 targetAudience(이 소재에 맞춰 AI가 추천한 구체적 타겟)를
      // 그대로 반영한다. 후보에 없으면(구버전 캐시 등) 채널 기본값으로 폴백.
      gAbAudience = sel.targetAudience || '3060 성인 & 왕초보 영어 학습자';
      // B/C는 "(변형안 B)" 같은 문자열을 붙인 가짜 제목을 채우지 않는다 — 실제로 정해진 게
      // 없는데 진짜 제목처럼 보이면, 여기서 바로 진단을 돌렸을 때 그 가짜 문구를 채점해버린다
      // (2026-09-01, 사용자 지적). 아직 안 정해졌으면 빈 칸으로 둬서 "🚀 진단"으로 받은 5종
      // 추천 중 다른 걸 B/C에 각각 적용하는 게 다음 단계임을 명확히 한다.
      // thumbnailCopy·badge 필드는 2026-09-13 폐지(썸네일 헤드라인 하나만 남기고, 하단 캡션·
      // 포인트 뱃지는 시각적 스턴건 효과를 흐리는 군더더기로 판단해 제거) — 아이디어 보드의
      // suggestedBadge 스키마 필드도 같이 폐지했으므로 여기서 더 이상 채울 값이 없다.
      gAbVariants[0] = {id: 'A', title: sel.topic, imageUrl: '', thumbnailHeadline: '', visualConcept: '', isLocalFile: false};
      gAbVariants[1] = {id: 'B', title: '', imageUrl: '', thumbnailHeadline: '', visualConcept: '', isLocalFile: false};
      gAbVariants[2] = {id: 'C', title: '', imageUrl: '', thumbnailHeadline: '', visualConcept: '', isLocalFile: false};
      gAbSelectedVariantTab = 'A';
      gAbActiveFeedView = 'A';
      // 이전 진단(gAbAiReport)은 완전히 다른 소재/시안을 평가한 결과라 그대로 두면 새 소재를 진단한
      // 것처럼 오인된다(2026-09-02, 실제로 이 문제 때문에 혼란이 생겨서 발견) — 핸드오프 시 항상 비움.
      gAbAiReport = null;
      saveAbSimulatorState();
      switchTab('tab-ab-simulator');
      showToast('💡 기획 보드에서 선택한 소재가 A/B 시뮬레이터에 로드되었습니다!');
    };
  }

  const runDemandBtn = document.getElementById('btn-idea-board-run-demand');
  if (runDemandBtn) {
    runDemandBtn.onclick = async () => {
      runDemandBtn.disabled = true;
      runDemandBtn.innerHTML = '⏳ 실행 중...';
      try {
        const res = await fetch('/api/market-demand/run', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({})});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '실행 실패');
        gMarketDemand = data.data;
        renderCurrentTab();
      } catch (err) {
        showToast('❌ 오류: ' + err.message);
        runDemandBtn.disabled = false;
      }
    };
  }

  const runCoBtn = document.getElementById('btn-idea-board-run-co');
  if (runCoBtn) {
    runCoBtn.onclick = async () => {
      runCoBtn.disabled = true;
      runCoBtn.innerHTML = '⏳ 실행 중...';
      try {
        const res = await fetch('/api/content-opportunity/run', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({})});
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '실행 실패');
        gContentOpportunity = data.data;
        renderCurrentTab();
      } catch (err) {
        showToast('❌ 오류: ' + err.message);
        runCoBtn.disabled = false;
      }
    };
  }
}

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
  // 아웃라이어 영상 하나에 댓글/대본 리포트·실패 사유를 붙이는 로직 — byKeyword의
  // topOutliers와 trackedChannels(2026-09-30 추가)의 topOutliers가 구조가 완전히
  // 같으므로 함수로 뽑아 양쪽에 재사용한다.
  const annotateOutlier = (o) => ({
    ...o,
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
      res.end(pageHtml);
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
    if (url.pathname === '/api/studio-downloads-info') {
      return json(res, 200, {
        downloadsDir,
        studioExportDir,
        active: true,
      });
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
    if (url.pathname.startsWith('/api/temp-thumbnail/')) {
      // A/B 시뮬레이터가 generateAiThumbnailImage로 생성해 output/temp-thumbnails/에 저장한
      // 파일을 서빙한다 — 파일명은 서버가 직접 생성하므로(persistGeneratedImage) 임의 문자는
      // 안 들어오지만, 공개 라우트인 만큼 경로 이탈만 방어적으로 한 번 더 막는다.
      const filename = decodeURIComponent(url.pathname.slice('/api/temp-thumbnail/'.length));
      if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return json(res, 400, {error: '잘못된 파일명입니다.'});
      }
      const filePath = join(tempThumbDir, filename);
      if (!existsSync(filePath)) return json(res, 404, {error: '생성된 썸네일 파일을 찾지 못했습니다.'});
      const image = await readFile(filePath);
      const contentType = filename.endsWith('.png') ? 'image/png' : filename.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg';
      res.writeHead(200, {'Content-Type': contentType, 'Cache-Control': 'max-age=3600'});
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
    if (url.pathname === '/api/presenter-reference') {
      // 채널 기준 인물(public/brand/thumbnail-presenter-reference.jpg)을 대시보드에서 직접
      // 보고 복사할 수 있게 서빙 — 제미나이 웹에서 수동 생성할 때 이 이미지를 같이 첨부해야
      // 실제 생성 경로(레퍼런스 이미지 첨부)와 결과가 어긋나지 않는다(2026-09-01).
      const refPath = join(projectDir, 'public', 'brand', 'thumbnail-presenter-reference.jpg');
      if (!existsSync(refPath)) return json(res, 404, {error: '아직 기준 인물 이미지가 설정되지 않았습니다.'});
      const image = await readFile(refPath);
      res.writeHead(200, {'Content-Type': 'image/jpeg', 'Cache-Control': 'max-age=3600'});
      res.end(image);
      return;
    }
    if (url.pathname === '/api/market-demand') {
      if (memoryMarketDemand && (Date.now() - lastMarketDemandTime < 60_000)) {
        return json(res, 200, await annotateMarketDemandAnalysisStatus(memoryMarketDemand));
      }
      const marketDemand = await loadJson(marketDemandPath);
      if (!marketDemand) return json(res, 404, {error: 'market-demand.json 파일이 없습니다.'});
      memoryMarketDemand = marketDemand;
      lastMarketDemandTime = Date.now();
      return json(res, 200, await annotateMarketDemandAnalysisStatus(marketDemand));
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
      const args = ['scripts/market-demand.mjs',
        ...(body.channel ? [`--channel=${body.channel}`] : (body.keyword ? [`--keyword=${body.keyword}`] : []))];
      try {
        await execFileAsync('node', args, {cwd: projectDir});
        const updated = await loadJson(marketDemandPath);
        memoryMarketDemand = updated;
        lastMarketDemandTime = Date.now();
        return json(res, 200, {ok: true, data: await annotateMarketDemandAnalysisStatus(updated)});
      } catch (err) {
        return json(res, 500, {error: `스크립트 실행 오류: ${err.message}`});
      }
    }
    // 시장 수요 레이더 키워드 카드 삭제(2026-09-13, 사용자 지적: "필요없는 데이터가 쌓이면
    // 안되니깐 카드에 딸린 데이터까지 삭제돼야겠지?"). 단순히 market-demand.json의 byKeyword
    // 배열에서 항목 하나만 지우면, 그 키워드의 아웃라이어 영상들을 분석해 만든 댓글/대본
    // 리포트 파일(output/insights/, output/script-insights/)과 그 리포트에서 뽑아
    // audience-dna.json에 누적된 시청자DNA 항목이 "오염된 데이터"로 계속 남는다.
    // 단, 같은 영상이 여러 키워드에서 동시에 아웃라이어로 걸리는 경우가 실제로 있으므로
    // (renderMarketDemandTab()의 videoKeywordMap 참고), 삭제 대상 키워드를 뺀 "나머지"
    // 키워드에서도 여전히 참조되는 영상은 건드리지 않는다 — 그 영상 리포트를 지우면 다른
    // 키워드 카드의 "📄 리포트 보기" 버튼이 깨지기 때문.
    if (url.pathname === '/api/market-demand/delete' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const keyword = String(body.keyword || '').trim();
        if (!keyword) return json(res, 400, {error: 'keyword가 필요합니다.'});

        const marketDemand = await loadJson(marketDemandPath, {byKeyword: []});
        const idx = (marketDemand.byKeyword || []).findIndex((k) => k.keyword === keyword);
        if (idx === -1) return json(res, 404, {error: `키워드 "${keyword}"를 찾을 수 없습니다.`});

        const removed = marketDemand.byKeyword[idx];
        const removedVideoIds = new Set((removed.topOutliers || []).map((o) => o.videoId).filter(Boolean));
        marketDemand.byKeyword = marketDemand.byKeyword.filter((_, i) => i !== idx);

        // 남은 키워드들이 아직 참조 중인 videoId는 고아가 아니므로 삭제 대상에서 뺀다.
        const stillReferenced = new Set();
        marketDemand.byKeyword.forEach((k) => (k.topOutliers || []).forEach((o) => {
          if (o.videoId) stillReferenced.add(o.videoId);
        }));
        const orphanedVideoIds = [...removedVideoIds].filter((vid) => !stillReferenced.has(vid));
        const {deletedReportFiles, removedDnaEntries} = await cascadeDeleteOrphanedVideoData(orphanedVideoIds);

        await saveJson(marketDemandPath, marketDemand);
        memoryMarketDemand = marketDemand;
        lastMarketDemandTime = Date.now();
        return json(res, 200, {
          ok: true,
          data: await annotateMarketDemandAnalysisStatus(marketDemand),
          cleaned: {orphanedVideos: orphanedVideoIds.length, reportFiles: deletedReportFiles, dnaEntries: removedDnaEntries},
        });
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    // 추적 채널 카드 삭제(2026-09-30) — 키워드 삭제와 달리 videoId cascade 청소는 하지 않는다.
    // 추적 채널의 topOutliers 영상은 byKeyword 쪽 아웃라이어와 겹칠 수도 있어(같은 영상이
    // 양쪽에 다 걸리는 경우) 소유권이 애매하고, 댓글/대본 리포트는 videoId 기준으로 어느
    // 쪽에서 봐도 재사용되는 게 맞으므로(annotateMarketDemandAnalysisStatus가 파일 인덱스로
    // 매번 다시 찾음) 그냥 남겨둬도 무해하다 — trackedChannels 배열에서 항목만 뺀다.
    if (url.pathname === '/api/market-demand/delete-channel' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const channelId = String(body.channelId || '').trim();
        if (!channelId) return json(res, 400, {error: 'channelId가 필요합니다.'});

        const marketDemand = await loadJson(marketDemandPath, {byKeyword: [], trackedChannels: []});
        const before = (marketDemand.trackedChannels || []).length;
        marketDemand.trackedChannels = (marketDemand.trackedChannels || []).filter((c) => c.channelId !== channelId);
        if (marketDemand.trackedChannels.length === before) {
          return json(res, 404, {error: `채널 ID "${channelId}"를 찾을 수 없습니다.`});
        }

        await saveJson(marketDemandPath, marketDemand);
        memoryMarketDemand = marketDemand;
        lastMarketDemandTime = Date.now();
        return json(res, 200, {ok: true, data: await annotateMarketDemandAnalysisStatus(marketDemand)});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    // 키워드 카드 전체가 아니라, 그 안의 아웃라이어 영상 딱 하나만 지우는 기능(2026-09-13,
    // 사용자 요청: "각 영상의 데이터를 삭제하는 기능이 있어야하지 않겠어?" — 키워드 자체는
    // 유효한데 그 안의 특정 영상 하나만 잘못 걸렸거나 필요 없어진 경우를 위함). 그 키워드의
    // topOutliers에서 이 영상만 빼고, 이 영상이 다른 키워드에서도 여전히 쓰이는지 전체를
    // 다시 확인한 뒤(자기 자신이 수정된 상태 기준) 고아가 됐을 때만 위와 같은 cascade 청소를
    // 적용한다.
    if (url.pathname === '/api/market-demand/delete-video' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const keyword = String(body.keyword || '').trim();
        const videoId = String(body.videoId || '').trim();
        if (!keyword || !videoId) return json(res, 400, {error: 'keyword와 videoId가 모두 필요합니다.'});

        const marketDemand = await loadJson(marketDemandPath, {byKeyword: []});
        const kEntry = (marketDemand.byKeyword || []).find((k) => k.keyword === keyword);
        if (!kEntry) return json(res, 404, {error: `키워드 "${keyword}"를 찾을 수 없습니다.`});
        const hadVideo = (kEntry.topOutliers || []).some((o) => o.videoId === videoId);
        if (!hadVideo) return json(res, 404, {error: `이 키워드에서 영상 "${videoId}"를 찾을 수 없습니다.`});
        kEntry.topOutliers = (kEntry.topOutliers || []).filter((o) => o.videoId !== videoId);

        const stillReferenced = marketDemand.byKeyword.some((k) =>
          (k.topOutliers || []).some((o) => o.videoId === videoId)
        );
        const orphanedVideoIds = stillReferenced ? [] : [videoId];
        const {deletedReportFiles, removedDnaEntries} = await cascadeDeleteOrphanedVideoData(orphanedVideoIds);

        await saveJson(marketDemandPath, marketDemand);
        memoryMarketDemand = marketDemand;
        lastMarketDemandTime = Date.now();
        return json(res, 200, {
          ok: true,
          data: await annotateMarketDemandAnalysisStatus(marketDemand),
          cleaned: {orphanedVideos: orphanedVideoIds.length, reportFiles: deletedReportFiles, dnaEntries: removedDnaEntries},
        });
      } catch (err) {
        return json(res, 500, {error: err.message});
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
    if (url.pathname === '/api/evaluations/48h') {
      const evaluations = await loadJson(evaluationsPath);
      if (!evaluations) return json(res, 404, {error: '저장된 48시간 판정 결과가 없습니다. 먼저 데이터를 새로고침하세요.'});
      return json(res, 200, evaluations);
    }
    if (url.pathname === '/api/video-reach' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const packageId = String(body.packageId || '');
      const window = String(body.window || '');
      const videoId = String(body.videoId || '');
      const impressions = body.impressions === '' || body.impressions == null ? null : Number(body.impressions);
      const ctr = body.ctr === '' || body.ctr == null ? null : Number(body.ctr);
      if (!/^[A-Za-z0-9._-]{3,100}$/.test(packageId)) return json(res, 400, {error: '패키징 ID가 올바르지 않습니다.'});
      if (!['24h', '48h', '7d', '28d'].includes(window)) return json(res, 400, {error: '측정 시점이 올바르지 않습니다.'});
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return json(res, 400, {error: 'YouTube 영상 ID가 올바르지 않습니다.'});
      
      const packages = await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
      let packageItem = packages.items.find((entry) => entry.id === packageId);
      if (packageItem) {
        packageItem.videoId = videoId;
        packageItem.updatedAt = new Date().toISOString();
        packages.updatedAt = packageItem.updatedAt;
        await saveJson(packagingRegistryPath, packages);
      }
      const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
      reach.videos[videoId] ||= {videoId, windows: {}};
      reach.videos[videoId].windows[window] = {impressions, ctr, packageId, recordedAt: new Date().toISOString()};
      reach.updatedAt = new Date().toISOString();
      await saveJson(videoReachManualPath, reach);
      if (memoryDashboardCache?.videoReachManual?.videos) {
        memoryDashboardCache.videoReachManual.videos[videoId] = reach.videos[videoId];
      }
      return json(res, 200, {ok: true, video: reach.videos[videoId], package: packageItem || null});
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

      const existingDna = (await loadJson(audienceDnaPath, {entries: []})).entries || [];
      const existingPainPoints = existingDna.filter((e) => e.type === 'painPoint' || e.type === 'question');

      const results = [];
      for (const vid of targetVideoIds.slice(0, 3)) {
        try {
          const meta = await fetchVideoDetails(vid, ytKey);
          if (!meta) continue;
          const comments = await fetchComments(vid, ytKey, 100);
          let aiInsights = null;
          if (geminiKey && comments.length > 0) {
            aiInsights = await analyzeCommentsWithGemini(meta, comments, geminiKey, existingPainPoints);
          }
          const reportMd = generateMarkdownReport(meta, comments, aiInsights);
          const slug = meta.title.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 50) + `_${vid}`;
          if (!existsSync(outputInsightsDir)) await mkdir(outputInsightsDir, {recursive: true});
          if (!existsSync(outputCommentsDir)) await mkdir(outputCommentsDir, {recursive: true});
          await writeFile(join(outputInsightsDir, `${slug}.md`), reportMd, 'utf8');
          await writeFile(join(outputCommentsDir, `${vid}.json`), JSON.stringify({schemaVersion: 1, analyzedAt: new Date().toISOString(), video: meta, aiInsights, comments}, null, 2), 'utf8');
          if (aiInsights) {
            const dnaEntries = [
              ...(aiInsights.painPoints || []).map((item) => ({ type: 'painPoint', text: formatInsightText(item) })),
              ...(aiInsights.audienceQuestions || []).map((item) => ({ type: 'question', text: formatInsightText(item) })),
              ...(aiInsights.audienceVocabulary || []).map((item) => ({ type: 'vocabulary', text: formatInsightText(item) })),
            ].map((e) => ({ ...e, videoId: vid, channelTitle: meta.channelTitle, sourceType: 'outlierComment' }));
            await upsertAudienceDna(dnaEntries);
          }
          await clearAnalysisFailure(vid, 'comment');
          results.push({
            videoId: vid,
            video: meta,
            commentsCount: comments.length,
            aiInsights,
            markdown: reportMd,
            file: `${slug}.md`,
          });
        } catch (err) {
          console.error(`Error analyzing video ${vid}:`, err.message);
          await recordAnalysisFailure(vid, 'comment', err.message);
        }
      }

      return json(res, 200, {ok: true, results, count: results.length});
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
        const result = await analyzeSingleScript(vid);
        if (!result) {
          await recordAnalysisFailure(vid, 'script', '대본 분석에 실패했습니다.');
          return json(res, 500, {error: '대본 분석에 실패했습니다.'});
        }
        await clearAnalysisFailure(vid, 'script');
        return json(res, 200, {ok: true, result});
      } catch (err) {
        await recordAnalysisFailure(vid, 'script', err.message);
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
        return json(res, 200, {ok: true, sync: dashboard.sync, channel: dashboard.channel});
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
    if (url.pathname === '/api/matrix/diagnose' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return json(res, 400, {error: '.env 파일에 GEMINI_API_KEY 설정이 필요합니다.'});
      }
      try {
        const patternsStore = await loadJson(successPatternsPath, {entries: []});
        const diagnosis = await diagnoseVideoWithGemini({
          video: body.video,
          geminiKey,
          successPatterns: patternsStore.entries || [],
        });
        if (body.video?.quadrant === 'Q1' && body.video?.videoId) {
          await upsertSuccessPatterns({
            videoId: body.video.videoId,
            title: body.video.title || '',
            ctr: body.video.ctr ?? null,
            retentionRate: body.video.retentionRate ?? null,
            coreSuccessFactor: diagnosis.coreProblemOrSuccessFactor || '',
            reusableHook: diagnosis.successPattern?.reusableHook || '',
            reusableAnalogy: diagnosis.successPattern?.reusableAnalogy || '',
          });
        }
        return json(res, 200, {ok: true, diagnosis});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/ab-simulator/competitors') {
      const topic = url.searchParams.get('topic') || '';
      const competitors = await getMockCompetitorVideos({ topic });
      return json(res, 200, {ok: true, competitors});
    }
    if (url.pathname === '/api/ab-simulator/evaluate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return json(res, 400, {error: '.env 파일에 GEMINI_API_KEY 설정이 필요합니다.'});
      }
      try {
        const [dnaStore, patternsStore, marketDemand] = await Promise.all([
          loadJson(audienceDnaPath, {entries: []}),
          loadJson(successPatternsPath, {entries: []}),
          loadJson(marketDemandPath),
        ]);
        const evaluation = await evaluateThumbnailTitleVariants({
          topic: body.topic,
          variants: body.variants,
          targetAudience: body.targetAudience,
          format: body.format || 'LONGFORM',
          geminiKey,
          audienceDna: dnaStore.entries || [],
          successPatterns: patternsStore.entries || [],
          marketDemand,
        });
        return json(res, 200, {ok: true, evaluation});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/ab-simulator/thumbnail-prompt' && req.method === 'POST') {
      // API로 직접 생성하지 않고, 사용자가 제미나이 웹(유료 구독)에 직접 붙여넣을 프롬프트만
      // 돌려준다 — buildThumbnailPrompt는 순수 함수라 Gemini API 호출이 없고 비용도 안 든다.
      const body = await readJsonBody(req);
      try {
        const built = buildThumbnailPrompt({
          topic: body.topic || '',
          variantKey: body.variantKey || 'A',
          title: body.title || '',
          thumbnailHeadline: body.thumbnailHeadline || '',
          format: body.format || 'LONGFORM',
          hasPersonReference: await hasPresenterReference(),
          visualConcept: body.visualConcept || '',
          closeUp: !!body.closeUp,
        });
        return json(res, 200, {ok: true, prompt: built.prompt});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/ab-simulator/generate-image' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      try {
        const result = await generateAiThumbnailImage({
          prompt: body.prompt,
          topic: body.topic || '',
          variantKey: body.variantKey || 'A',
          title: body.title || '',
          thumbnailHeadline: body.thumbnailHeadline || '',
          format: body.format || 'LONGFORM',
          engine: body.engine || 'flux',
          geminiKey,
          visualConcept: body.visualConcept || '',
          closeUp: !!body.closeUp,
        });
        return json(res, 200, {ok: true, ...result});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    // 드래그앤드롭/파일 업로드로 넣은 로컬 이미지를 서버 파일로 저장 — 예전엔 blob: URL +
    // base64를 그대로 상태에 남겨서 (1) blob:은 그 브라우저 탭에서만 유효해 새로고침/다른 PC에서
    // 못 열리고, (2) base64가 시안당 수 MB라 A/B/C 세 개를 다 채우면 상태 동기화 요청이 커져서
    // 조용히 실패하기 쉬웠다(2026-09-02, 사용자가 "드래그앤드롭했는데 서버 연결이 안 되는 것 같다"고
    // 지적해서 발견). AI 1-Click 생성(`persistGeneratedImage`)과 똑같이 파일로 저장해 짧은
    // `/api/temp-thumbnail/...` URL만 상태에 남기도록 통일한다.
    if (url.pathname === '/api/ab-simulator/upload-local-image' && req.method === 'POST') {
      const body = await readJsonBody(req);
      try {
        const result = await persistGeneratedImage({
          engineLabel: 'local-upload',
          dataUrl: body.dataUrl,
          variantKey: body.variantKey || 'A',
        });
        return json(res, 200, {ok: true, ...result});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    // A/B 시뮬레이터 상태도 서버 파일로 저장(아이디어 보드와 같은 이유, 2026-09-02).
    if (url.pathname === '/api/ab-simulator/state' && req.method === 'GET') {
      try {
        const state = await loadJson(abSimulatorStatePath, {});
        return json(res, 200, state || {});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/ab-simulator/state' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        await writeFile(abSimulatorStatePath, JSON.stringify(body, null, 2), 'utf8');
        return json(res, 200, {ok: true});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/knowledge-db') {
      const [audienceDna, successPatterns] = await Promise.all([
        loadJson(audienceDnaPath, {schemaVersion: 1, entries: []}),
        loadJson(successPatternsPath, {schemaVersion: 1, entries: []}),
      ]);
      return json(res, 200, {ok: true, audienceDna, successPatterns});
    }
    if (url.pathname === '/api/knowledge-db/delete' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const storeKey = body.store === 'successPatterns' ? successPatternsPath : body.store === 'audienceDna' ? audienceDnaPath : null;
      if (!storeKey || !body.id) return json(res, 400, {error: 'store와 id가 필요합니다.'});
      const store = await loadJson(storeKey, {schemaVersion: 1, entries: []});
      store.entries = (store.entries || []).filter((e) => e.id !== body.id);
      store.updatedAt = new Date().toISOString();
      await saveJson(storeKey, store);
      return json(res, 200, {ok: true});
    }
    if (url.pathname === '/api/content-opportunity') {
      const data = await loadJson(contentOpportunityPath);
      if (!data) return json(res, 404, {error: 'content-opportunity.json 파일이 없습니다. npm run content-opportunity를 실행하세요.'});
      return json(res, 200, data);
    }
    if (url.pathname === '/api/content-opportunity/run' && req.method === 'POST') {
      try {
        await execAsync('node scripts/content-opportunity.mjs', {cwd: projectDir});
        return json(res, 200, {ok: true, data: await loadJson(contentOpportunityPath)});
      } catch (err) {
        return json(res, 500, {error: `스크립트 실행 오류: ${err.message}`});
      }
    }
    if (url.pathname === '/api/idea-board/generate-candidates' && req.method === 'POST') {
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return json(res, 400, {error: '.env 파일에 GEMINI_API_KEY 설정이 필요합니다.'});
      }
      try {
        const body = await readJsonBody(req);
        const focusKeyword = String(body.focusKeyword || '').trim();
        const [marketDemand, contentOpportunity, dnaStore, patternsStore, historyStore, catalog] = await Promise.all([
          loadJson(marketDemandPath),
          loadJson(contentOpportunityPath),
          loadJson(audienceDnaPath, {entries: []}),
          loadJson(successPatternsPath, {entries: []}),
          loadJson(ideaBoardHistoryPath, {entries: []}),
          loadJson(catalogPath, {videos: []}),
        ]);

        // "선택됨"(status: 'selected')인데 episodeSlug가 없는 항목 — 즉 "이 주제로 진행"은
        // 눌렀지만 실제 제작(BRIEF.md·썸네일)으로는 안 넘어간 항목 — 은 새 후보를 다시 생성하는
        // 이 행동 자체가 "그 선택은 안 쓰겠다"는 의사로 봐야 한다(2026-09-11, 사용자 지적:
        // "이미 선택한 아이디어는 사용하지 않겠다로 판단되야하는거 아니야? 썸네일 제작으로 안
        // 넘어갔으니"). 안 그러면 후보를 재생성할 때마다 예전에 찜만 하고 접은 소재가 영영
        // "이미 제작됨" 취급을 받아 겹침 검사에 계속 걸리고, 실제로 그 소재가 다시 추천돼도
        // AI가 어중간하게 피하려다 비슷한 각도로 또 내는 부작용도 있었다(예: "노베이스 입 근육
        // 세팅" 소재가 살짝 다른 문구로 다시 나온 사례). episodeSlug가 있으면(실제 제작 시작)
        // 절대 안 지운다 — 여기서 지우는 건 "찜만 하고 그친" 것만이다.
        const abandoned = (historyStore.entries || []).filter((e) => e.status === 'selected' && !e.episodeSlug);
        if (abandoned.length) {
          historyStore.entries = (historyStore.entries || []).filter((e) => !(e.status === 'selected' && !e.episodeSlug));
          historyStore.updatedAt = new Date().toISOString();
          await saveJson(ideaBoardHistoryPath, historyStore);
        }

        const result = await generateTopicCandidates({
          geminiKey, marketDemand, contentOpportunity,
          audienceDna: dnaStore.entries || [],
          successPatterns: patternsStore.entries || [],
          producedTopics: historyStore.entries || [],
          // catalog.json은 채널 소유자 권한으로 조회해서 예약/비공개 영상도 포함된다(2026-09-11
          // 확인 — 방금 올린 EP15도 공개 전인데 이미 들어 있었음). /api/sync를 돌릴 때마다
          // 최신화되므로 앞으로 올라가는 영상도 별도 작업 없이 계속 반영된다.
          channelVideos: (catalog.videos || []).map((v) => ({title: v.title})),
          // 아이디어 보드의 키워드 셀렉터에서 특정 시장 수요 키워드 하나를 골랐을 때만 채워짐
          // (2026-09-13). 비어 있으면 기존과 동일하게 상위 8개 키워드를 두루 참고한다.
          focusKeyword: focusKeyword || undefined,
        });
        return json(res, 200, {ok: true, ...result});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    // 아이디어 보드 상태(후보·선택)를 서버 파일로도 저장 — localStorage뿐이면 다른 PC/브라우저에서
    // 똑같은 유료 Gemini 호출을 불필요하게 반복해야 했음(2026-09-02, 사용자 지적으로 발견).
    if (url.pathname === '/api/idea-board/state' && req.method === 'GET') {
      try {
        const state = await loadJson(ideaBoardStatePath, {});
        return json(res, 200, state || {});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
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
    // "✍️ Claude 초안 불러오기" 버튼용 — Claude가 대화 중 이 파일을 직접 써 두면(Gemini와 동일한
    // candidates 스키마), 그걸 그대로 읽어와 화면에 띄운다. 없으면 404로 "아직 초안이 없다"를
    // 명확히 알린다(빈 성공 응답으로 조용히 넘기면 버튼이 아무 반응 없어 보임).
    if (url.pathname === '/api/idea-board/manual-draft' && req.method === 'GET') {
      try {
        const draft = await loadJson(ideaBoardManualDraftPath);
        if (!draft) return json(res, 404, {error: '아직 Claude가 작성한 초안이 없습니다. 대화창에서 먼저 요청하세요.'});
        return json(res, 200, draft);
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
    // "🔄 이미 진행 중" 카드를 사용자가 직접 해지하는 엔드포인트(2026-09-11, 사용자 지적: "선택해서
    // 썸네일 제작까지 갔다가 주제가 맘에 안 들어서 안 할 수도 있잖아"). 기존 자동 정리(위
    // generate-candidates의 abandoned 필터링)는 "후보를 다시 생성할 때"만 걸려서, 그 전까진 카드가
    // 계속 잠긴 채로 남아 있었다 — 이건 사용자가 원할 때 바로 풀 수 있게 하는 수동 창구.
    // status가 'selected'인 것만 해지 가능하다 — 'scheduled'/'published'는 실제로 업로드
    // 패키지·YouTube 예약까지 끝난 진짜 제작물이라, 여기서 실수로 지워지면 안 된다(그 단계를
    // 취소하려면 실제 YouTube 예약 자체를 먼저 취소해야 하므로 이 버튼의 책임 범위 밖이다).
    if (url.pathname === '/api/idea-board/history/release' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        const topic = String(body.topic || '').trim();
        if (!topic) return json(res, 400, {error: 'topic이 필요합니다.'});
        const history = await loadJson(ideaBoardHistoryPath, {schemaVersion: 1, entries: []});
        const idx = history.entries.findIndex((e) => String(e.topic || '').trim() === topic);
        if (idx === -1) return json(res, 404, {error: '해당 소재를 이력에서 찾을 수 없습니다.'});
        if (history.entries[idx].status !== 'selected') {
          return json(res, 400, {error: '이미 예약/공개된 소재는 여기서 해지할 수 없습니다 (status: ' + history.entries[idx].status + ').'});
        }
        history.entries.splice(idx, 1);
        history.updatedAt = new Date().toISOString();
        await saveJson(ideaBoardHistoryPath, history);
        return json(res, 200, {ok: true, entries: history.entries});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/idea-board/state' && req.method === 'POST') {
      try {
        const body = await readJsonBody(req);
        await writeFile(ideaBoardStatePath, JSON.stringify(body, null, 2), 'utf8');
        return json(res, 200, {ok: true});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/brand-script/lint' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      try {
        const result = await lintBrandScript({
          scriptText: body.scriptText,
          topic: body.topic || '',
          format: body.format || 'SHORTS',
          apiKey: geminiKey,
        });
        return json(res, 200, { ok: true, result });
      } catch (err) {
        return json(res, 500, { error: err.message });
      }
    }
    if (url.pathname === '/api/brand-script/export-scenes' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const scenes = body.scenes || [];
      const topic = body.topic || 'episode';
      const format = body.format || 'SHORTS';
      const outputScenesDir = join(projectDir, 'output', 'scenes');
      if (!existsSync(outputScenesDir)) await mkdir(outputScenesDir, { recursive: true });
      const safeTopic = (topic || 'scene').replace(/[\\/:*?"<>|]/g, '_').slice(0, 30);
      const filename = `scenes_${safeTopic}_${Date.now()}.json`;
      const filePath = join(outputScenesDir, filename);
      await writeFile(filePath, JSON.stringify({
        topic,
        format,
        exportedAt: new Date().toISOString(),
        brandPersona: "이해하면 쉬운영어 Cyber-HUD",
        sceneCount: scenes.length,
        scenes,
      }, null, 2), 'utf8');
      return json(res, 200, { ok: true, filename, filePath });
    }
    if (url.pathname === '/api/classification' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const videoId = String(body.videoId || '').trim();
      const category = String(body.category || 'SEASON');
      const season = body.season != null && body.season !== '' ? Number(body.season) : null;
      const episode = body.episode != null && body.episode !== '' ? Number(body.episode) : null;
      const role = String(body.role || '');
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return json(res, 400, {error: '영상 ID가 올바르지 않습니다.'});
      if (!['SEASON', 'CHANNEL', 'LEGACY', 'EXPERIMENT', 'OTHER'].includes(category)) return json(res, 400, {error: '콘텐츠 유형이 올바르지 않습니다.'});
      if (category === 'SEASON') {
        if (![1, 2].includes(season)) return json(res, 400, {error: '시즌은 1 또는 2여야 합니다.'});
        if (!Number.isInteger(episode) || episode < 1 || episode > 99) return json(res, 400, {error: 'EP 번호가 올바르지 않습니다.'});
      }
      if (!['LONG', 'A', 'B', 'C', 'STANDALONE_SHORT', 'STANDALONE_LONG'].includes(role)) return json(res, 400, {error: '역할이 올바르지 않습니다.'});
      if (category === 'CHANNEL' && role !== 'C') return json(res, 400, {error: '채널 공통 콘텐츠는 쇼츠 C 역할로 저장해야 합니다.'});
      if (category === 'SEASON' && role === 'C') return json(res, 400, {error: '쇼츠 C는 시즌·EP가 아닌 채널 공통 콘텐츠입니다.'});
      
      const map = await loadVideoMap();
      map[videoId] = {
        category,
        season: category === 'SEASON' ? season : null,
        episode: category === 'SEASON' ? episode : null,
        role,
        source: 'manual',
        updatedAt: new Date().toISOString()
      };
      await saveVideoMap(map);
      
      const catalog = await loadJson(catalogPath);
      if (catalog?.videos) {
        const video = catalog.videos.find((item) => item.videoId === videoId);
        if (video) {
          video.classification = map[videoId];
          catalog.updatedAt = new Date().toISOString();
          await saveJson(catalogPath, catalog);
        }
      }
      
      const snapshot = await loadJson(latestSnapshotPath);
      if (snapshot) {
        snapshot.classifications ||= {};
        snapshot.classifications[videoId] = map[videoId];
        await saveJson(latestSnapshotPath, snapshot);
      }
      if (memoryDashboardCache?.classifications) {
        memoryDashboardCache.classifications[videoId] = map[videoId];
      }
      
      return json(res, 200, {ok: true, classification: map[videoId]});
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
