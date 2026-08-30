import {createServer} from 'node:http';
import {readFile, writeFile, unlink, mkdir, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exec} from 'node:child_process';
import {promisify} from 'node:util';
import {build48hEvaluations} from './evaluate-48h.mjs';
import {
  extractVideoId,
  fetchVideoDetails,
  fetchComments,
  analyzeCommentsWithGemini,
  generateMarkdownReport,
} from './analyze-outlier-comments.mjs';
import { analyzeSingleScript } from './analyze-competitor-script.mjs';
import { startStudioWatcher } from './studio-auto-ingest.mjs';
import { getMockCompetitorVideos, evaluateThumbnailTitleVariants } from './ab-simulator.mjs';
import { buildMatrixDataset, diagnoseVideoWithGemini } from './matrix-diagnosis.mjs';

const execAsync = promisify(exec);
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
const contentDir = join(projectDir, 'content');
const studioExportDir = resolve(process.env.YOUTUBE_STUDIO_EXPORT_DIR || join(projectDir, 'imports', 'youtube-studio'));
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
    if (size > 2 * 1024 * 1024) throw new Error('요청 데이터가 너무 큽니다.');
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
  const response = await fetch(url, {headers: {Authorization: `Bearer ${accessToken}`}});
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

const numeric = (value, percent = false) => {
  const raw = String(value ?? '').trim();
  const hadPercent = raw.includes('%');
  let s = raw.replace(/,/g, '').replace(/%/g, '');
  if (!s || s === '—' || s === '-') return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return percent && !hadPercent && n > 0 && n <= 1 ? Math.round(n * 10000) / 100 : n;
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

    const isShort = Number(video.durationSeconds || 0) <= 60;
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
          const ctr = numeric(r[ctrIndex], true);
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
      const ctr = numeric(totalRow[ctrIndex], true);
      if (impressions == null || ctr == null) {
        skipped.push({folder, reason: '노출수/CTR 수치 변환 실패'});
        continue;
      }

      reach.videos[videoId] ||= {videoId, windows: {}, periods: {}};
      reach.videos[videoId].periods ||= {};
      const current = reach.videos[videoId].periods[periodKey];
      if (current && current.impressions === Math.round(impressions) && current.ctr === ctr) {
        unchanged++;
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

  return {imported, unchanged, skipped, waiting, directory: studioExportDir, autoProcessed: true, totalScanned: folders.length};
};

const getDashboard = async (accessToken) => {
  const {startDate, endDate} = dateRange();
  const channelData = await googleGet(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true',
    accessToken,
  );
  const channel = channelData.items?.[0];
  if (!channel) throw new Error('승인한 계정에서 YouTube 채널을 찾지 못했습니다.');

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

  const playlistItems = await googleGetAllPages('https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50', accessToken);
  const playlists = playlistItems.map((item) => ({
    playlistId: item.id,
    title: item.snippet?.title || '',
    description: item.snippet?.description || '',
    itemCount: Number(item.contentDetails?.itemCount || 0),
    url: `https://www.youtube.com/playlist?list=${item.id}`,
  }));

  const commentsByVideo = {};
  await mapConcurrent(recentVideos, 6, async (video) => {
    try {
      const items = await googleGetAllPages(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(video.videoId)}&maxResults=100`,
        accessToken,
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
    } catch {
      commentsByVideo[video.videoId] = [];
    }
  });

  const savedClassifications = await loadVideoMap();
  const classifications = inferClassifications(recentVideos, savedClassifications);
  await saveVideoMap(classifications);

  const [summaryReport, dailyReport, topReport, contentTypeReport, trafficReport, searchReport] = await Promise.all([
    analyticsQuery(accessToken, {
      startDate,
      endDate,
      metrics: 'views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost',
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
      creatorContentType: durationSeconds(detail.contentDetails?.duration) <= 60 ? 'SHORTS' : 'VIDEO_ON_DEMAND',
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
  const sorted = episodes.sort((a, b) => {
    const numA = parseInt(a.episode.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.episode.replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });
  memoryEpisodesSummary = sorted;
  lastEpisodesSummaryTime = Date.now();
  return sorted;
};

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

/* Smartphone Mockup Frame */
.mockup-phone {
  width: 380px;
  max-width: 100%;
  height: 660px;
  background: #0f0f0f;
  border: 7px solid #27272a;
  border-radius: 34px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 240, 255, 0.15);
  display: flex;
  flex-direction: column;
  position: relative;
  margin: 0 auto;
}
.mockup-phone-header {
  height: 46px;
  background: rgba(15, 15, 15, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #27272a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  z-index: 10;
  flex-shrink: 0;
}
.mockup-feed-scroll {
  flex: 1;
  overflow-y: auto;
  background: #0f0f0f;
  padding-bottom: 40px;
  transition: filter 0.25s ease;
}
.feed-item {
  margin-bottom: 16px;
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
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.85);
  color: #fff;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 4px;
}
.feed-meta {
  display: flex;
  gap: 12px;
  padding: 10px 12px 6px;
}
.feed-avatar {
  width: 36px;
  height: 36px;
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
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.feed-sub {
  color: #aaa;
  font-size: 12px;
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
      <button class="btn btn-cyan btn-sm" id="btn-sync-global">↻ SYNC ANALYTICS</button>
      <a class="btn btn-sm btn-amber" id="btn-reauth" href="/auth" style="display:none">🔗 채널 재연결</a>
      <a class="btn btn-sm" id="btn-logout" href="/logout" style="display:none">⎋ 로그아웃</a>
    </div>
  </header>

  <div class="category-tabs-wrapper">
    <button class="tab-scroll-btn tab-scroll-left" id="btn-tab-scroll-left" title="왼쪽 탭으로 이동">‹</button>
    <nav class="category-tabs" id="category-tabs-nav">
      <button class="tab-pill active" data-tab="tab-overview">⚡ 전체 관제 (Overview)</button>
      <button class="tab-pill" data-tab="tab-matrix">📊 CTR·지속률 4사분면 매트릭스</button>
      <button class="tab-pill" data-tab="tab-ab-simulator">🎯 썸네일·제목 A/B 시뮬레이터</button>
      <button class="tab-pill" data-tab="tab-demand">🎯 시장 수요 레이더 (Market Demand)</button>
      <button class="tab-pill" data-tab="tab-outlier">🤖 아웃라이어 댓글 AI (Outlier Lab)</button>
      <button class="tab-pill" data-tab="tab-episodes">🎬 에피소드 & 업로드 패키지</button>
      <button class="tab-pill" data-tab="tab-evaluations">⚖️ 48H 사후 판정 (Evaluations)</button>
      <button class="tab-pill" data-tab="tab-studio">📁 Studio CTR 트래커</button>
      <button class="tab-pill" data-tab="tab-design">🎨 브랜드 디자인 시스템</button>
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
let gEpisodes = null;
let gCurrentTab = 'tab-overview';
let gClassificationFilter = 'ALL';
let gClassificationSearch = '';
let gStudioFilter = 'ALL';
let gAiLabSubTab = 'comments'; // 'comments' | 'scripts'

/* 4-QUADRANT MATRIX STATE */
let gMatrixFormatFilter = 'ALL'; // 'ALL' | 'LONGFORM' | 'SHORTS'
let gMatrixQuadrantFilter = 'ALL'; // 'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4'
let gMatrixCtrThreshold = 6.0;
let gMatrixRetThresholdLong = 42.0;
let gMatrixRetThresholdShorts = 70.0;

/* A/B SIMULATOR STATE */
let gAbVariants = [
  {
    id: 'A',
    title: "30초 만에 'Want' vs 'Won't' #발음 완벽 구분! (이 원리 모르면 평생 안 들림)",
    imageUrl: 'https://i.ytimg.com/vi/t_wVvVyqdbg/mqdefault.jpg',
    thumbnailCopy: "WANT vs WON'T 입모양 공식",
    badge: '1초 구분',
  },
  {
    id: 'B',
    title: "원어민이 'Want' 발음할 때 절대 입술 안 모으는 진짜 이유 #영어발음",
    imageUrl: 'https://i.ytimg.com/vi/5MiM1tIpQQk/mqdefault.jpg',
    thumbnailCopy: "원어민 비밀 입술 모양",
    badge: '비법 공개',
  },
  {
    id: 'C',
    title: "영어 'Want'와 'Won't'가 똑같이 들렸던 이유? 딱 1가지만 기억하세요",
    imageUrl: 'https://i.ytimg.com/vi/WZFLgtzV_80/mqdefault.jpg',
    thumbnailCopy: "귀가 뚫리는 1가지 법칙",
    badge: '귀 뚫림',
  },
];
let gAbTopic = "30초 만에 'Want' vs 'Won't' 발음 완벽 구분법";
let gAbAudience = "5060 시니어 & 왕초보 영어 학습자";
let gAbCompetitors = [];
let gAbActiveFeedView = 'A'; // 'A' | 'B' | 'C' | 'ALL'
let gAbVisionFilter = 'normal'; // 'normal' | 'blur' | 'grayscale'
let gAbAiReport = null;
let gAbSelectedVariantTab = 'A'; // 'A' | 'B' | 'C'

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
});

async function loadAll() {
  try {
    const [dashRes, demandRes, epRes] = await Promise.all([
      fetch('/api/dashboard'),
      fetch('/api/market-demand'),
      fetch('/api/episodes/summary')
    ]);

    gMarketDemand = demandRes.ok ? await demandRes.json() : null;
    gEpisodes = epRes.ok ? await epRes.json() : [];

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
        '<div style="min-width:0"><b>' + esc(v.title) + '</b><div class="card-subtext">' + esc((v.publishedAt||'').slice(0,10)) + ' · ' + (v.durationSeconds <= 60 ? '쇼츠' : '롱폼') + '</div></div>' +
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

  let html = '<div class="bento-grid">' +
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

  md.byKeyword.forEach(k => {
    const score = Math.round(k.marketDemandScore || 0);
    const opp = Number(k.opportunityScore || 0).toFixed(1);
    const scoreClass = score >= 150 ? 'badge-strong-pass' : score >= 80 ? 'badge-pass' : 'badge-hold';

    html += '<div class="bento-card col-6">' +
      '<div class="card-header">' +
        '<span style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--text-bright)">' + esc(k.keyword) + '</span>' +
        '<span class="badge ' + scoreClass + '">수요점수 ' + score + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:16px;margin:12px 0">' +
        '<div><span class="card-title">기회 점수</span><div style="font-size:20px;font-weight:900;color:var(--accent-cyan)">' + opp + '</div></div>' +
        '<div><span class="card-title">검색 결과수</span><div style="font-size:20px;font-weight:900;color:var(--text-normal)">' + fmt.format(k.totalResults || 0) + '</div></div>' +
        '<div><span class="card-title">표본 영상</span><div style="font-size:20px;font-weight:900;color:var(--accent-amber)">' + (k.videoCount || 0) + '개</div></div>' +
      '</div>';

    if (k.titlePatterns && k.titlePatterns.length > 0) {
      html += '<div style="margin-top:12px">' +
        '<div class="card-title" style="margin-bottom:6px">🔥 제목 반복 패턴 (클릭 시 복사):</div>' +
        '<div>' + k.titlePatterns.map(p => '<span class="tag-chip copy-chip" data-copy="' + esc(p.word) + '">#' + esc(p.word) + ' (' + p.titleCount + '회)</span>').join('') + '</div>' +
      '</div>';
    }

    if (k.topOutliers && k.topOutliers.length > 0) {
      html += '<div style="margin-top:16px;border-top:1px solid var(--border-subtle);padding-top:12px">' +
        '<div class="card-title" style="margin-bottom:8px">⭐ 대표 아웃라이어 영상 TOP:</div>' +
        k.topOutliers.slice(0, 3).map(o => {
          const thumb = o.thumbnail || (o.videoId ? 'https://i.ytimg.com/vi/' + o.videoId + '/mqdefault.jpg' : '');
          return '<div style="background:#090e18;border:1px solid var(--border-subtle);border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;gap:12px;align-items:center">' +
            (thumb ? '<img class="thumb-mini" src="' + esc(thumb) + '" alt="">' : '') +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-weight:700;font-size:13px;color:var(--text-bright);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(o.title) + '</div>' +
              '<div class="card-subtext">' + esc(o.channelTitle || o.channel) + ' · 조회수 ' + fmt.format(o.viewCount || (o.viewsPerDay ? o.viewsPerDay * (o.ageDays||1) : 0)) + '회 (' + (o.outlierRatio ? o.outlierRatio.toFixed(1) + 'x 배수' : '') + ')</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px">' +
              '<button class="btn btn-sm btn-magenta btn-outlier-analyze" data-vid="' + esc(o.videoId) + '">💬 댓글</button>' +
              '<button class="btn btn-sm btn-cyan btn-outlier-script" data-vid="' + esc(o.videoId) + '">📜 대본</button>' +
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

  document.querySelectorAll('.btn-outlier-analyze').forEach(btn => {
    btn.onclick = () => triggerCommentAnalysis(btn.dataset.vid);
  });

  document.querySelectorAll('.btn-outlier-script').forEach(btn => {
    btn.onclick = () => triggerScriptAnalysis(btn.dataset.vid);
  });
}
function renderOutlierLabTab() {
  const isComments = gAiLabSubTab === 'comments';

  return '<div class="bento-grid">' +
    '<div class="bento-card highlight-cyan col-12">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">' +
        '<div>' +
          '<div class="card-title" style="color:var(--accent-cyan)">GEMINI AUDIENCE & SCRIPT INTELLIGENCE</div>' +
          '<h2 style="font-family:var(--font-display);font-size:24px;color:var(--text-bright);margin-top:2px">🤖 아웃라이어 영상 댓글 & 대본 AI 심층 분석실</h2>' +
          '<p style="color:var(--text-normal);margin-top:4px;font-size:13px">시청자의 생생한 질문·고통(VoC)과 경쟁 채널의 대본 전개 공식을 역설계하여 &lsquo;이해하면 쉬운영어&rsquo;만의 대본 템플릿을 도출합니다.</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;background:rgba(0,0,0,0.5);padding:4px;border-radius:10px;border:1px solid var(--border-subtle)">' +
          '<button class="tab-pill' + (isComments ? ' active' : '') + '" id="subtab-btn-comments">💬 1. 시청자 댓글 VoC 분석</button>' +
          '<button class="tab-pill' + (!isComments ? ' active' : '') + '" id="subtab-btn-scripts">📜 2. 경쟁사 대본·자막 역설계 분석</button>' +
        '</div>' +
      '</div>' +

      (isComments ? 
        '<div style="margin-top:18px">' +
          '<div class="card-subtext" style="margin-bottom:8px">시청자가 실제로 헷갈린 문장, 질문, 생생한 어휘(Mental Model)를 분석합니다.</div>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
            '<input type="text" id="input-ai-kw" placeholder="키워드 분석 (예: WANT TO 축약, 영어 연음)" style="flex:1;min-width:240px">' +
            '<button class="btn btn-magenta" id="btn-run-ai-kw">🚀 키워드 아웃라이어 분석</button>' +
            '<input type="text" id="input-ai-url" placeholder="유튜브 URL 직접 입력 (https://...)" style="flex:1;min-width:240px">' +
            '<button class="btn btn-cyan" id="btn-run-ai-url">🔎 URL 댓글 분석</button>' +
          '</div>' +
        '</div>' :
        '<div style="margin-top:18px">' +
          '<div class="card-subtext" style="margin-bottom:8px">유튜브 자막을 1-Click 추출하여 <b>[도입부 후킹 구조] + [핵심 비유법] + [대본 타임라인] + [우리 채널 맞춤 대본]</b>을 역설계합니다.</div>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
            '<input type="text" id="input-script-url" placeholder="유튜브 URL 또는 영상 ID 입력 (https://youtube.com/watch?v=...)" style="flex:1;min-width:300px">' +
            '<button class="btn btn-cyan" id="btn-run-script-analyze">🚀 대본 역설계 & 맞춤 대본 생성</button>' +
          '</div>' +
        '</div>'
      ) +

      '<div id="ai-lab-status" style="display:none;margin-top:14px;padding:12px 16px;background:rgba(0,240,255,0.1);border:1px solid var(--accent-cyan);border-radius:10px;color:var(--text-bright);font-weight:700">' +
        '⏳ <span id="ai-lab-status-text">Gemini AI 심층 분석 중입니다... (약 5~10초 소요)</span>' +
      '</div>' +
    '</div>' +

    '<div class="bento-card col-12" id="ai-results-container" style="display:none"></div>' +

    '<div class="bento-card col-12">' +
      '<div class="card-header">' +
        '<span class="card-title">' + (isComments ? '📑 생성된 댓글 기획 리포트 아카이브' : '📜 생성된 대본 역설계 리포트 아카이브') + '</span>' +
        '<button class="btn btn-sm" id="btn-refresh-ai-reports">↻ 리포트 목록 새로고침</button>' +
      '</div>' +
      '<div id="saved-reports-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-top:12px"></div>' +
    '</div>' +
  '</div>';
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
  if (subtabComments) subtabComments.onclick = () => { gAiLabSubTab = 'comments'; renderCurrentTab(); };
  if (subtabScripts) subtabScripts.onclick = () => { gAiLabSubTab = 'scripts'; renderCurrentTab(); };

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

  const btnScript = document.getElementById('btn-run-script-analyze');
  if (btnScript) btnScript.onclick = () => {
    const urlInput = document.getElementById('input-script-url');
    const targetUrl = urlInput ? urlInput.value.trim() : '';
    runScriptAnalysis(targetUrl);
  };

  const refreshBtn = document.getElementById('btn-refresh-ai-reports');
  if (refreshBtn) refreshBtn.onclick = () => {
    if (gAiLabSubTab === 'comments') loadSavedReportsList();
    else loadSavedScriptReportsList();
  };

  if (gAiLabSubTab === 'comments') {
    loadSavedReportsList();
  } else {
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
    '</div>';

  eps.forEach(ep => {
    const long = ep.tracks?.longform?.youtube || {};
    const shortsA = ep.tracks?.['shorts-a']?.youtube || {};
    const shortsB = ep.tracks?.['shorts-b']?.youtube || {};
    const thumbUrl = long.videoId ? 'https://i.ytimg.com/vi/' + long.videoId + '/mqdefault.jpg' : '';

    html += '<div class="bento-card col-6">' +
      (thumbUrl ? '<img class="thumb-img" style="margin-bottom:14px" src="' + esc(thumbUrl) + '" alt="">' : '') +
      '<div class="card-header">' +
        '<span style="font-family:var(--font-display);font-size:17px;font-weight:800;color:var(--text-bright)">' + esc(ep.season.toUpperCase()) + ' · ' + esc(ep.episode.toUpperCase()) + '</span>' +
        '<span class="badge badge-pass">' + (ep.tracks?.longform?.status || 'READY') + '</span>' +
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

function bindEpisodeEvents() {
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
    const thumbUrl = yt.videoId ? 'https://i.ytimg.com/vi/' + yt.videoId + '/mqdefault.jpg' : '';

    const content = 
      '<div style="display:grid;gap:14px">' +
        (thumbUrl ? '<img class="thumb-img" style="max-height:220px;margin-bottom:8px" src="' + esc(thumbUrl) + '" alt="">' : '') +
        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">📌 영상 제목</span>' +
            '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(yt.title || '') + '">복사</button>' +
          '</div>' +
          '<div style="font-weight:700;font-size:15px;color:var(--text-bright)">' + esc(yt.title || '') + '</div>' +
        '</div>' +

        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">💬 고정 댓글 (Pinned Comment)</span>' +
            '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(yt.pinnedComment || '') + '">복사</button>' +
          '</div>' +
          '<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.5;color:var(--text-normal)">' + esc(yt.pinnedComment || '') + '</pre>' +
        '</div>' +

        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">📝 영상 설명문 (Description)</span>' +
            '<button class="btn btn-sm btn-copy-text" data-text="' + encodeURIComponent(yt.description || '') + '">복사</button>' +
          '</div>' +
          '<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.5;color:var(--text-muted);max-height:200px;overflow-y:auto">' + esc(yt.description || '') + '</pre>' +
        '</div>' +

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
    format: (v.durationSeconds <= 60) ? 'SHORTS' : 'LONGFORM',
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

    const periodPills = periodList.sort((a, b) => String(b.endDate).localeCompare(String(a.endDate))).map(p => 
      '<div class="monthly-pill" style="border-left:3px solid var(--accent-cyan);padding:6px 10px;margin-bottom:5px;background:rgba(0,240,255,0.06);border-radius:6px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span style="font-family:var(--font-mono);font-size:11px;color:var(--accent-cyan);font-weight:700">' + esc(p.startDate) + ' ~ ' + esc(p.endDate) + '</span>' +
          '<span class="badge badge-pass" style="font-size:9px;padding:2px 6px">Studio CSV</span>' +
        '</div>' +
        '<div style="font-size:13px;margin-top:3px">노출 <b style="color:var(--text-bright)">' + fmt.format(p.impressions||0) + '회</b> · CTR <b style="color:var(--accent-magenta);font-size:14px">' + Number(p.ctr||0).toFixed(2) + '%</b></div>' +
      '</div>'
    );

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
          '<button class="btn btn-magenta btn-sm btn-open-rpa-modal" style="font-weight:800;">⚡ Studio 실측 데이터 가져오기</button>' +
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

  document.querySelectorAll('.btn-open-rpa-modal').forEach(btn => {
    btn.onclick = () => openStudioRpaModal();
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
  const minImpressions = 100;
  const minViews = 10;

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
    const isShort = (v.format === 'SHORTS') || 
                    (durationSec > 0 && durationSec <= 60) || 
                    ['A', 'B', 'C', 'STANDALONE_SHORT'].includes(cls.role);

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
      const periodEntries = Object.values(periods);
      if (periodEntries.length > 0 && periodEntries[0].ctr != null) {
        ctr = Number(periodEntries[0].ctr);
        impressions = Number(periodEntries[0].impressions || 0);
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
    const hasStatisticalSignificance = hasRealCtr && !is48hWarmup && impressions >= minImpressions && views >= minViews;

    const retThresh = isShort ? gMatrixRetThresholdShorts : gMatrixRetThresholdLong;

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

    const highCtr = (ctr || 0) >= gMatrixCtrThreshold;
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

  const threshX = getX(gMatrixCtrThreshold);
  const activeRetThresh = gMatrixFormatFilter === 'SHORTS' ? gMatrixRetThresholdShorts : gMatrixRetThresholdLong;
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
          '<button class="btn btn-magenta btn-sm btn-open-rpa-modal" style="font-weight:800; font-size:12px; padding:6px 14px;">⚡ Studio 실측 데이터 가져오기</button>' +
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
          '<label style="display:flex; align-items:center; gap:4px; color:var(--accent-cyan);">CTR 기준: <input type="number" id="input-matrix-ctr-thresh" value="' + gMatrixCtrThreshold + '" step="0.5" min="1" max="20" style="width:55px; padding:3px 6px; font-size:12px;">%</label>' +
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

  document.querySelectorAll('.btn-open-rpa-modal').forEach(btn => {
    btn.onclick = () => openStudioRpaModal();
  });

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
      const videoTitle = decodeURIComponent(btn.dataset.title);
      const videoThumb = decodeURIComponent(btn.dataset.thumb);
      gAbTopic = videoTitle;
      gAbVariants[0] = {
        id: 'A',
        title: videoTitle,
        imageUrl: videoThumb,
        thumbnailCopy: '기존 썸네일',
        badge: '현재 시안',
      };
      gAbVariants[1] = {
        id: 'B',
        title: videoTitle.replace(/#.*/, '') + ' (핵심 원리 30초 완성)',
        imageUrl: videoThumb,
        thumbnailCopy: '핵심 원리 대조',
        badge: '대안 B',
      };
      gAbSelectedVariantTab = 'B';
      switchTab('tab-ab-simulator');
      showToast('💎 숨은 보석 영상이 A/B 시뮬레이터에 로드되었습니다! 새 시안을 진단해 보세요.');
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
              '<div class="card-title" style="color:var(--accent-magenta); margin-bottom:8px;">⚡ 추천 고클릭률 대체 제목 3종</div>' +
              '<ul style="margin:0 0 0 16px; font-size:13px; color:var(--text-bright); line-height:1.6;">' +
                (diag.suggestedAlternativeTitles || []).map(t => '<li>"' + esc(t) + '"</li>').join('') +
              '</ul>' +
            '</div>' +

            '<div style="display:flex; justify-content:space-between; align-items:center; background:#060910; padding:12px 16px; border-radius:10px; border:1px solid var(--border-active);">' +
              '<span style="font-size:12px; color:var(--accent-amber); font-weight:700;">' + esc(diag.priorityVerdict || '추천 액션 완료') + '</span>' +
              '<button class="btn btn-sm btn-cyan" id="btn-modal-to-ab" style="font-weight:800;">🎯 이 영상으로 A/B 시뮬레이터 바로 실행</button>' +
            '</div>' +
          '</div>';

        const toAbBtn = document.getElementById('btn-modal-to-ab');
        if (toAbBtn) {
          toAbBtn.onclick = () => {
            closeModal();
            gAbTopic = video.title;
            gAbVariants[0] = {
              id: 'A',
              title: video.title,
              imageUrl: video.thumbnail,
              thumbnailCopy: '기존 썸네일',
              badge: '현재 시안',
            };
            if (diag.suggestedAlternativeTitles?.[0]) {
              gAbVariants[1] = {
                id: 'B',
                title: diag.suggestedAlternativeTitles[0],
                imageUrl: video.thumbnail,
                thumbnailCopy: 'AI 추천 카피',
                badge: 'AI 추천 1위',
              };
            }
            gAbSelectedVariantTab = 'B';
            switchTab('tab-ab-simulator');
            showToast('💎 AI 진단 결과가 A/B 시뮬레이터에 로드되었습니다!');
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
  const currentVariant = gAbVariants.find(v => v.id === gAbSelectedVariantTab) || gAbVariants[0];
  const colorMap = { A: 'var(--accent-magenta)', B: 'var(--accent-cyan)', C: 'var(--accent-amber)' };
  const badgeClassMap = { A: 'badge-revise', B: 'badge-pass', C: 'badge-hold' };

  const comps = (gAbCompetitors && gAbCompetitors.length > 0) ? gAbCompetitors : [
    { title: "영어 수동태 단번에 마스터 하기 (원리만 알면 초보도 1초 컷)", channelTitle: "이지 잉글리시", views: 645000, publishedAgo: "1개월 전", thumbnail: "https://i.ytimg.com/vi/WZFLgtzV_80/mqdefault.jpg", duration: "11:45" },
    { title: "TREASURE를 ‘트레처’라고 읽으면 틀립니다! #영어발음", channelTitle: "발음의 신", views: 1200000, publishedAgo: "3일 전", thumbnail: "https://i.ytimg.com/vi/5MiM1tIpQQk/mqdefault.jpg", duration: "00:58" },
    { title: "원어민이 가장 많이 쓰는 초급 회화 50문장", channelTitle: "매일 영어 루틴", views: 450000, publishedAgo: "1달 전", thumbnail: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=640&q=80", duration: "18:30" }
  ];

  let feedItemsList = [];
  if (gAbActiveFeedView === 'ALL') {
    feedItemsList = [
      { isComp: true, ...comps[0] },
      { isTest: true, variant: gAbVariants[0] },
      { isComp: true, ...(comps[1] || comps[0]) },
      { isTest: true, variant: gAbVariants[1] },
      { isComp: true, ...(comps[2] || comps[0]) },
      { isTest: true, variant: gAbVariants[2] },
      ...(comps.slice(3).map(c => ({ isComp: true, ...c })))
    ];
  } else {
    const chosen = gAbVariants.find(v => v.id === gAbActiveFeedView) || gAbVariants[0];
    feedItemsList = [
      { isComp: true, ...comps[0] },
      { isTest: true, variant: chosen },
      ...(comps.slice(1).map(c => ({ isComp: true, ...c })))
    ];
  }

  const feedHtml = feedItemsList.map((item) => {
    if (item.isTest) {
      const v = item.variant;
      const bColor = colorMap[v.id] || 'var(--accent-magenta)';
      return '<div class="feed-item active-test" style="border: 2px solid ' + bColor + '; border-radius: 12px; margin-bottom: 16px; background: rgba(0,0,0,0.6); overflow: hidden;">' +
        '<div style="background:' + bColor + '; color:#000; font-weight:900; font-size:11px; padding:3px 10px; display:flex; justify-content:space-between; align-items:center;">' +
          '<span>★ 우리 채널 시안 ' + v.id + ' (테스트 노출 중)</span>' +
          (v.badge ? '<span style="background:rgba(0,0,0,0.3); color:#fff; padding:1px 6px; border-radius:4px; font-size:10px;">' + esc(v.badge) + '</span>' : '') +
        '</div>' +
        '<div class="feed-thumb-wrap">' +
          '<img class="feed-thumb-img" src="' + esc(v.imageUrl || 'https://i.ytimg.com/vi/t_wVvVyqdbg/mqdefault.jpg') + '" alt="">' +
          '<span class="feed-duration">07:42</span>' +
        '</div>' +
        '<div class="feed-meta" style="padding:10px 12px 14px;">' +
          '<div style="width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, var(--accent-magenta), #7928ca); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:900; font-size:14px; flex-shrink:0;">⚡</div>' +
          '<div class="feed-details">' +
            '<div class="feed-title" style="color:#fff; font-weight:700;">' + esc(v.title || '(제목을 입력하세요)') + '</div>' +
            '<div class="feed-sub">이해하면 쉬운 영어 · 조회수 2.4만회 · 2시간 전</div>' +
          '</div>' +
          '<div style="color:#888; font-size:16px; cursor:pointer;">⋮</div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="feed-item" style="margin-bottom: 16px; background:#0f0f0f; border-radius:12px; overflow:hidden;">' +
      '<div class="feed-thumb-wrap">' +
        '<img class="feed-thumb-img" src="' + esc(item.thumbnail || '') + '" alt="">' +
        '<span class="feed-duration">' + esc(item.duration || '10:20') + '</span>' +
      '</div>' +
      '<div class="feed-meta" style="padding:10px 12px 14px;">' +
        '<img class="feed-avatar" src="' + esc(item.channelAvatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=' + esc(item.channelTitle)) + '" alt="">' +
        '<div class="feed-details">' +
          '<div class="feed-title">' + esc(item.title) + '</div>' +
          '<div class="feed-sub">' + esc(item.channelTitle) + ' · 조회수 ' + fmt.format(item.views || 0) + '회 · ' + esc(item.publishedAgo || '최근') + '</div>' +
        '</div>' +
        '<div style="color:#888; font-size:16px; cursor:pointer;">⋮</div>' +
      '</div>' +
    '</div>';
  }).join('');

  const report = gAbAiReport;

  return '<div class="bento-grid">' +
    '<div class="bento-card highlight-magenta col-12">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px;">' +
        '<div>' +
          '<div class="card-title" style="color:#ffccd9">YOUTUBE FEED SALIENCE & AI CTR PREDICTOR</div>' +
          '<h2 style="font-family:var(--font-display); font-size:24px; color:#fff; margin-top:2px">🎯 썸네일 & 제목 A/B 피드 시뮬레이터 · AI CTR 예측기</h2>' +
          '<p style="color:#ffe6ec; margin-top:4px; font-size:13px">실제 모바일 유튜브 홈 피드 환경에서 경쟁 채널 영상들과 나란히 비교하여 시각적 스턴건 효과와 예상 CTR을 사전 진단합니다.</p>' +
        '</div>' +
        '<div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">' +
          '<button class="btn btn-sm" id="btn-ab-fill-sample">🎲 샘플 데이터 불러오기</button>' +
          '<button class="btn btn-cyan btn-sm" id="btn-ab-run-ai">🚀 Gemini AI CTR 정밀 진단</button>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex; gap:12px; margin-top:16px; flex-wrap:wrap; align-items:center;">' +
        '<div style="flex:2; min-width:280px;">' +
          '<div style="font-size:11px; font-weight:700; color:var(--accent-amber); margin-bottom:4px;">📌 영상 기획 주제 / 핵심 키워드</div>' +
          '<input type="text" id="input-ab-topic" value="' + esc(gAbTopic) + '" placeholder="예: 30초 만에 Want vs Won 구분법" style="width:100%">' +
        '</div>' +
        '<div style="flex:1; min-width:200px;">' +
          '<div style="font-size:11px; font-weight:700; color:var(--accent-cyan); margin-bottom:4px;">👥 타겟 시청자층</div>' +
          '<select id="select-ab-audience" style="width:100%">' +
            '<option value="5060 시니어 & 왕초보 영어 학습자"' + (gAbAudience.includes('5060') ? ' selected' : '') + '>5060 시니어 & 왕초보 영어</option>' +
            '<option value="기초 회화 및 발음 교정 학습자"' + (gAbAudience.includes('회화') ? ' selected' : '') + '>기초 회화 및 발음 교정</option>' +
            '<option value="알파벳/파닉스 읽는 법 입문자"' + (gAbAudience.includes('파닉스') ? ' selected' : '') + '>알파벳/파닉스 읽는 법 입문</option>' +
          '</select>' +
        '</div>' +
      '</div>' +

      '<div id="ab-eval-status" style="display:none; margin-top:14px; padding:12px 16px; background:rgba(0,240,255,0.12); border:1px solid var(--accent-cyan); border-radius:10px; color:var(--text-bright); font-weight:700;">' +
        '⏳ <span id="ab-eval-status-text">Gemini AI가 썸네일 가독성과 호기심 갭을 분석 중입니다... (약 3~5초 소요)</span>' +
      '</div>' +
    '</div>' +

    /* LEFT: VARIANT WORKBENCH */
    '<div class="bento-card col-6">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">' +
        '<div class="card-title" style="color:var(--accent-cyan)">VARIANT WORKBENCH (시안 편집기)</div>' +
        '<div style="display:flex; gap:6px;">' +
          ['A', 'B', 'C'].map(vId => {
            const isActive = gAbSelectedVariantTab === vId;
            const bCol = vId === 'A' ? 'var(--accent-magenta)' : vId === 'B' ? 'var(--accent-cyan)' : 'var(--accent-amber)';
            return '<button class="tab-pill btn-ab-tab-select' + (isActive ? ' active' : '') + '" data-var="' + vId + '" style="' + (isActive ? 'border-color:' + bCol + '; color:' + bCol + ';' : '') + '">시안 ' + vId + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      '<div style="background:#090d16; border:1px solid var(--border-subtle); border-radius:14px; padding:16px;">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
          '<span style="font-weight:800; font-size:15px; color:' + colorMap[currentVariant.id] + '">💎 시안 ' + currentVariant.id + ' 설정</span>' +
          '<span class="badge ' + badgeClassMap[currentVariant.id] + '">Variant ' + currentVariant.id + '</span>' +
        '</div>' +

        '<div style="margin-bottom:14px;">' +
          '<div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">' +
            '<span style="font-weight:700; color:var(--text-bright)">제목 (Title)</span>' +
            '<span id="ab-char-counter" style="color:' + ((currentVariant.title || '').length > 28 ? 'var(--accent-amber)' : 'var(--text-muted)') + '">' + (currentVariant.title || '').length + '자 ' + ((currentVariant.title || '').length > 28 ? '(모바일 28자 초과 주의)' : '') + '</span>' +
          '</div>' +
          '<input type="text" id="input-ab-variant-title" value="' + esc(currentVariant.title || '') + '" placeholder="유튜브 제목을 입력하세요" style="width:100%; font-size:14px; font-weight:600;">' +
        '</div>' +

        '<div style="margin-bottom:14px;">' +
          '<div style="font-size:12px; font-weight:700; color:var(--text-bright); margin-bottom:6px;">썸네일 이미지 (Thumbnail Image)</div>' +
          '<div style="display:flex; gap:10px; margin-bottom:8px;">' +
            '<input type="text" id="input-ab-variant-img" value="' + esc(currentVariant.imageUrl || '') + '" placeholder="이미지 URL (https://...)" style="flex:1;">' +
            '<input type="file" id="input-ab-file-upload" accept="image/*" style="display:none">' +
            '<button class="btn btn-sm btn-cyan" id="btn-ab-upload-trigger">📁 파일 업로드</button>' +
          '</div>' +
          '<div id="ab-thumb-dropzone" style="width:100%; aspect-ratio:16/9; background:#05070c; border:2px dashed var(--border-active); border-radius:10px; overflow:hidden; position:relative; display:flex; align-items:center; justify-content:center; cursor:pointer;">' +
            (currentVariant.imageUrl ? '<img src="' + esc(currentVariant.imageUrl) + '" style="width:100%; height:100%; object-fit:cover;">' : '<div class="card-subtext">🖼️ 이미지를 여기에 드래그하거나 클릭하여 업로드하세요</div>') +
          '</div>' +
        '</div>' +

        '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">' +
          '<div>' +
            '<div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:4px;">썸네일 텍스트 카피 (AI 분석용)</div>' +
            '<input type="text" id="input-ab-variant-copy" value="' + esc(currentVariant.thumbnailCopy || '') + '" placeholder="예: WANT vs WONT 입모양" style="width:100%">' +
          '</div>' +
          '<div>' +
            '<div style="font-size:11px; font-weight:700; color:var(--text-muted); margin-bottom:4px;">포인트 뱃지 태그</div>' +
            '<input type="text" id="input-ab-variant-badge" value="' + esc(currentVariant.badge || '') + '" placeholder="예: 1초 컷 / 비법 공개" style="width:100%">' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* 3-Variant Mini Comparator */
      '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:14px;">' +
        gAbVariants.map(v => {
          const isCur = v.id === gAbSelectedVariantTab;
          return '<div class="btn-ab-tab-select" data-var="' + v.id + '" style="background:#080c14; border:1px solid ' + (isCur ? colorMap[v.id] : 'var(--border-subtle)') + '; border-radius:10px; padding:10px; cursor:pointer;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
              '<b style="color:' + colorMap[v.id] + '; font-size:12px;">시안 ' + v.id + '</b>' +
              (isCur ? '<span class="pulse-dot" style="width:6px;height:6px;"></span>' : '') +
            '</div>' +
            '<img src="' + esc(v.imageUrl || 'https://i.ytimg.com/vi/t_wVvVyqdbg/mqdefault.jpg') + '" style="width:100%; aspect-ratio:16/9; object-fit:cover; border-radius:6px; margin-bottom:4px;">' +
            '<div style="font-size:11px; color:var(--text-bright); line-height:1.3; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-height:28px;">' + esc(v.title || '(제목 없음)') + '</div>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>' +

    /* RIGHT: SMARTPHONE MOCK FEED */
    '<div class="bento-card col-6" style="display:flex; flex-direction:column; align-items:center;">' +
      '<div style="width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">' +
        '<div class="card-title" style="color:var(--accent-magenta)">LIVE MOBILE MOCK FEED</div>' +
        '<div style="display:flex; gap:6px;">' +
          '<button class="tab-pill btn-ab-feed-view' + (gAbActiveFeedView === 'A' ? ' active' : '') + '" data-feed="A">시안 A 피드</button>' +
          '<button class="tab-pill btn-ab-feed-view' + (gAbActiveFeedView === 'B' ? ' active' : '') + '" data-feed="B">시안 B 피드</button>' +
          '<button class="tab-pill btn-ab-feed-view' + (gAbActiveFeedView === 'C' ? ' active' : '') + '" data-feed="C">시안 C 피드</button>' +
          '<button class="tab-pill btn-ab-feed-view' + (gAbActiveFeedView === 'ALL' ? ' active' : '') + '" data-feed="ALL">3개 교차</button>' +
        '</div>' +
      '</div>' +

      /* Vision Mode Filter Buttons */
      '<div style="width:100%; display:flex; justify-content:space-between; align-items:center; background:#080d16; padding:8px 14px; border-radius:10px; border:1px solid var(--border-subtle); margin-bottom:14px;">' +
        '<span style="font-size:11px; font-weight:700; color:var(--text-muted);">시각 가독성 필터:</span>' +
        '<div style="display:flex; gap:6px;">' +
          '<button class="btn btn-sm btn-ab-filter' + (gAbVisionFilter === 'normal' ? ' btn-cyan' : '') + '" data-filter="normal">🎨 일반 컬러</button>' +
          '<button class="btn btn-sm btn-ab-filter' + (gAbVisionFilter === 'blur' ? ' btn-amber' : '') + '" data-filter="blur" title="5060 원거리 시력 시뮬레이션">👓 5060 블러 (원거리)</button>' +
          '<button class="btn btn-sm btn-ab-filter' + (gAbVisionFilter === 'grayscale' ? ' btn-magenta' : '') + '" data-filter="grayscale" title="명도 및 색상 독립 대비 검증">🌓 흑백 명도 대비</button>' +
        '</div>' +
      '</div>' +

      /* Phone Bezel */
      '<div class="mockup-phone">' +
        '<div class="mockup-phone-header">' +
          '<div style="display:flex; align-items:center; gap:6px;">' +
            '<span style="color:#ff0033; font-size:18px;">▶</span>' +
            '<span style="font-family:var(--font-display); font-weight:900; letter-spacing:-0.03em; color:#fff;">YouTube</span>' +
          '</div>' +
          '<div style="display:flex; gap:12px; font-size:13px; color:#aaa;">' +
            '<span>📡</span><span>🔔</span><span>🔍</span>' +
            '<div style="width:22px; height:22px; border-radius:50%; background:#3ea6ff; display:flex; align-items:center; justify-content:center; color:#000; font-size:11px; font-weight:900;">Y</div>' +
          '</div>' +
        '</div>' +
        '<div class="mockup-feed-scroll' + (gAbVisionFilter === 'blur' ? ' vision-filter-blur' : gAbVisionFilter === 'grayscale' ? ' vision-filter-grayscale' : '') + '">' +
          feedHtml +
        '</div>' +
      '</div>' +
    '</div>' +

    /* BOTTOM: AI CTR INTELLIGENCE & TITLE SUITE */
    (report ? 
      '<div class="bento-card highlight-cyan col-12" id="ab-report-section">' +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">' +
          '<div>' +
            '<div class="card-title" style="color:var(--accent-cyan)">GEMINI CTR INTELLIGENCE VERDICT</div>' +
            '<h3 style="font-family:var(--font-display); font-size:20px; color:#fff; margin-top:2px;">🏆 AI 추천 1위: 시안 ' + esc(report.bestVariant || 'A') + '</h3>' +
            '<p style="color:var(--text-normal); font-size:13px; margin-top:4px;">' + esc(report.overallVerdict || '') + '</p>' +
          '</div>' +
          '<span class="badge badge-strong-pass" style="font-size:13px; padding:6px 14px;">예측 최고 성과: 시안 ' + esc(report.bestVariant || 'A') + '</span>' +
        '</div>' +

        '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:14px; margin-bottom:20px;">' +
          (report.variantsEvaluation || []).map(ve => {
            const vKey = ve.variantKey;
            const bCol = colorMap[vKey] || 'var(--accent-cyan)';
            return '<div style="background:#080c14; border:1px solid ' + (vKey === report.bestVariant ? bCol : 'var(--border-subtle)') + '; border-radius:14px; padding:16px; position:relative;">' +
              (vKey === report.bestVariant ? '<div style="position:absolute; top:-10px; right:14px; background:' + bCol + '; color:#000; font-size:10px; font-weight:900; padding:2px 8px; border-radius:99px;">★ TOP PICK</div>' : '') +
              '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">' +
                '<span style="font-weight:800; font-size:16px; color:' + bCol + '">시안 ' + vKey + '</span>' +
                '<span class="badge badge-pass" style="font-size:13px;">예상 CTR ' + esc(ve.predictedCtrRange || '') + ' (등급: ' + esc(ve.predictedGrade || 'A') + ')</span>' +
              '</div>' +

              '<div style="display:grid; gap:8px; margin-bottom:12px;">' +
                '<div>' +
                  '<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;"><span>호기심 갭 (Curiosity)</span><b>' + (ve.curiosityGapScore||0) + '점</b></div>' +
                  '<div style="height:6px; background:#111; border-radius:99px; overflow:hidden;"><div style="height:100%; width:' + (ve.curiosityGapScore||0) + '%; background:var(--accent-magenta); border-radius:99px;"></div></div>' +
                '</div>' +
                '<div>' +
                  '<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;"><span>5060 시니어 가독성 (Legibility)</span><b>' + (ve.seniorLegibilityScore||0) + '점</b></div>' +
                  '<div style="height:6px; background:#111; border-radius:99px; overflow:hidden;"><div style="height:100%; width:' + (ve.seniorLegibilityScore||0) + '%; background:var(--accent-cyan); border-radius:99px;"></div></div>' +
                '</div>' +
                '<div>' +
                  '<div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:2px;"><span>피드 속 시각 주목도 (Salience)</span><b>' + (ve.visualSalienceScore||0) + '점</b></div>' +
                  '<div style="height:6px; background:#111; border-radius:99px; overflow:hidden;"><div style="height:100%; width:' + (ve.visualSalienceScore||0) + '%; background:var(--accent-amber); border-radius:99px;"></div></div>' +
                '</div>' +
              '</div>' +

              '<div style="font-size:12px; line-height:1.5; color:var(--text-bright); margin-top:8px;">' +
                '💡 <b>개선 팁:</b> ' + esc(ve.improvementTip || '없음') +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>' +

        /* 5 High Converting Titles */
        '<div style="background:#090d16; border:1px solid var(--border-active); border-radius:14px; padding:18px;">' +
          '<div class="card-title" style="color:var(--accent-amber); margin-bottom:10px;">⚡ GEMINI AI 추천 고클릭률 제목 5종 (클릭 시 즉시 적용)</div>' +
          '<div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:10px;">' +
            (report.aiTitleSuggestions || []).map(s => {
              return '<div style="background:#06080e; border:1px solid var(--border-subtle); border-radius:10px; padding:12px; display:flex; flex-direction:column; justify-content:space-between;">' +
                '<div>' +
                  '<div class="badge badge-hold" style="font-size:10px; margin-bottom:6px;">' + esc(s.type || '추천 제목') + '</div>' +
                  '<div style="font-size:13px; font-weight:700; color:var(--text-bright); line-height:1.4; margin-bottom:8px;">&ldquo;' + esc(s.title || '') + '&rdquo;</div>' +
                '</div>' +
                '<div style="display:flex; gap:6px; justify-content:flex-end;">' +
                  '<button class="btn btn-sm btn-ab-apply-title" data-title="' + encodeURIComponent(s.title || '') + '" data-var="A" style="font-size:10px; padding:4px 8px;">A 적용</button>' +
                  '<button class="btn btn-sm btn-ab-apply-title" data-title="' + encodeURIComponent(s.title || '') + '" data-var="B" style="font-size:10px; padding:4px 8px;">B 적용</button>' +
                  '<button class="btn btn-sm btn-ab-apply-title" data-title="' + encodeURIComponent(s.title || '') + '" data-var="C" style="font-size:10px; padding:4px 8px;">C 적용</button>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' : '') +
  '</div>';
}

function bindAbSimulatorEvents() {
  const currentVar = gAbVariants.find(v => v.id === gAbSelectedVariantTab) || gAbVariants[0];

  // 1. Topic & Audience Inputs
  const topicInput = document.getElementById('input-ab-topic');
  if (topicInput) topicInput.oninput = (e) => { gAbTopic = e.target.value; };

  const audienceSelect = document.getElementById('select-ab-audience');
  if (audienceSelect) audienceSelect.onchange = (e) => { gAbAudience = e.target.value; };

  // 2. Variant Title input & char count
  const titleInput = document.getElementById('input-ab-variant-title');
  if (titleInput) {
    titleInput.oninput = (e) => {
      currentVar.title = e.target.value;
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
      renderAbSimulatorTabDirect();
    };
  }

  // 4. Variant Copy & Badge input
  const copyInput = document.getElementById('input-ab-variant-copy');
  if (copyInput) copyInput.oninput = (e) => { currentVar.thumbnailCopy = e.target.value; };

  const badgeInput = document.getElementById('input-ab-variant-badge');
  if (badgeInput) badgeInput.oninput = (e) => { currentVar.badge = e.target.value; renderAbFeedOnly(); };

  // 5. File Upload Handler
  const uploadTrigger = document.getElementById('btn-ab-upload-trigger');
  const fileInput = document.getElementById('input-ab-file-upload');
  if (uploadTrigger && fileInput) {
    uploadTrigger.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        currentVar.imageUrl = dataUrl;
        renderAbSimulatorTabDirect();
        showToast('썸네일 이미지가 성공적으로 로드되었습니다!');
      };
      reader.readAsDataURL(file);
    };
  }

  // 6. Drag & Drop on dropzone
  const dropzone = document.getElementById('ab-thumb-dropzone');
  if (dropzone) {
    dropzone.onclick = () => fileInput && fileInput.click();
    dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent-cyan)'; };
    dropzone.ondragleave = () => { dropzone.style.borderColor = 'var(--border-active)'; };
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--border-active)';
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        currentVar.imageUrl = event.target.result;
        renderAbSimulatorTabDirect();
        showToast('썸네일 이미지가 성공적으로 적용되었습니다!');
      };
      reader.readAsDataURL(file);
    };
  }

  // 7. Tab Selectors (A, B, C)
  document.querySelectorAll('.btn-ab-tab-select').forEach(btn => {
    btn.onclick = () => {
      gAbSelectedVariantTab = btn.dataset.var;
      renderAbSimulatorTabDirect();
    };
  });

  // 8. Feed View Buttons (A, B, C, ALL)
  document.querySelectorAll('.btn-ab-feed-view').forEach(btn => {
    btn.onclick = () => {
      gAbActiveFeedView = btn.dataset.feed;
      renderAbSimulatorTabDirect();
    };
  });

  // 9. Vision Filter Buttons
  document.querySelectorAll('.btn-ab-filter').forEach(btn => {
    btn.onclick = () => {
      gAbVisionFilter = btn.dataset.filter;
      renderAbSimulatorTabDirect();
    };
  });

  // 10. Fill Sample Button
  const fillSampleBtn = document.getElementById('btn-ab-fill-sample');
  if (fillSampleBtn) {
    fillSampleBtn.onclick = () => {
      gAbTopic = "30초 만에 'Want' vs 'Won't' 발음 완벽 구분법";
      gAbVariants = [
        {
          id: 'A',
          title: "30초 만에 'Want' vs 'Won't' #발음 완벽 구분! (이 원리 모르면 평생 안 들림)",
          imageUrl: 'https://i.ytimg.com/vi/t_wVvVyqdbg/mqdefault.jpg',
          thumbnailCopy: "WANT vs WON'T 입모양 공식",
          badge: '1초 구분',
        },
        {
          id: 'B',
          title: "원어민이 'Want' 발음할 때 절대 입술 안 모으는 진짜 이유 #영어발음",
          imageUrl: 'https://i.ytimg.com/vi/5MiM1tIpQQk/mqdefault.jpg',
          thumbnailCopy: "원어민 비밀 입술 모양",
          badge: '비법 공개',
        },
        {
          id: 'C',
          title: "영어 'Want'와 'Won't'가 똑같이 들렸던 이유? 딱 1가지만 기억하세요",
          imageUrl: 'https://i.ytimg.com/vi/WZFLgtzV_80/mqdefault.jpg',
          thumbnailCopy: "귀가 뚫리는 1가지 법칙",
          badge: '귀 뚫림',
        },
      ];
      renderAbSimulatorTabDirect();
      showToast('샘플 A/B 데이터가 채워졌습니다!');
    };
  }

  // 11. Run AI Evaluation Button
  const runAiBtn = document.getElementById('btn-ab-run-ai');
  if (runAiBtn) {
    runAiBtn.onclick = async () => {
      const statusBox = document.getElementById('ab-eval-status');
      const statusText = document.getElementById('ab-eval-status-text');
      if (statusBox) statusBox.style.display = 'block';
      if (statusText) statusText.textContent = 'Gemini AI가 3개 시안의 호기심 갭, 가독성, 색상 대비를 정밀 진단 중입니다... (약 3~5초 소요)';
      runAiBtn.disabled = true;

      try {
        const res = await fetch('/api/ab-simulator/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: gAbTopic,
            variants: gAbVariants,
            targetAudience: gAbAudience,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '진단 중 오류가 발생했습니다.');
        gAbAiReport = data.evaluation;
        showToast('🎉 Gemini AI CTR 정밀 진단이 완료되었습니다!');
        renderAbSimulatorTabDirect();
      } catch (err) {
        if (statusBox) statusBox.style.display = 'block';
        if (statusText) statusText.innerHTML = '<span style="color:#ff7676">❌ ' + esc(err.message) + '</span>';
      } finally {
        runAiBtn.disabled = false;
      }
    };
  }

  // 12. Apply AI Title Buttons
  document.querySelectorAll('.btn-ab-apply-title').forEach(btn => {
    btn.onclick = () => {
      const targetVarId = btn.dataset.var;
      const newTitle = decodeURIComponent(btn.dataset.title);
      const targetVar = gAbVariants.find(v => v.id === targetVarId);
      if (targetVar) {
        targetVar.title = newTitle;
        showToast('시안 ' + targetVarId + ' 제목에 &ldquo;' + esc(newTitle.slice(0, 15)) + '...&rdquo; 이 적용되었습니다!');
        renderAbSimulatorTabDirect();
      }
    };
  });

  // Prefetch competitor videos if not yet loaded
  if (gAbCompetitors.length === 0) {
    fetch('/api/ab-simulator/competitors').then(r => r.json()).then(data => {
      if (data.competitors && data.competitors.length > 0) {
        gAbCompetitors = data.competitors;
        renderAbFeedOnly();
      }
    }).catch(() => {});
  }
}

function renderAbSimulatorTabDirect() {
  if (gCurrentTab === 'tab-ab-simulator') {
    renderCurrentTab();
  }
}

function renderAbFeedOnly() {
  if (gCurrentTab === 'tab-ab-simulator') {
    const scrollEl = document.querySelector('.mockup-feed-scroll');
    if (scrollEl) {
      const currentScrollTop = scrollEl.scrollTop;
      renderCurrentTab();
      const newScrollEl = document.querySelector('.mockup-feed-scroll');
      if (newScrollEl) newScrollEl.scrollTop = currentScrollTop;
    }
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
    btn.textContent = '↻ SYNC ANALYTICS';
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
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${port}`}`);
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
        prompt: 'consent',
        include_granted_scopes: 'true',
        scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
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
    if (url.pathname === '/api/market-demand') {
      if (memoryMarketDemand && (Date.now() - lastMarketDemandTime < 60_000)) {
        return json(res, 200, memoryMarketDemand);
      }
      const marketDemand = await loadJson(marketDemandPath);
      if (!marketDemand) return json(res, 404, {error: 'market-demand.json 파일이 없습니다.'});
      memoryMarketDemand = marketDemand;
      lastMarketDemandTime = Date.now();
      return json(res, 200, marketDemand);
    }
    if (url.pathname === '/api/market-demand/run' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const kw = body.keyword ? `--keyword="${body.keyword}"` : '';
      const cmd = `node scripts/market-demand.mjs ${kw}`;
      try {
        await execAsync(cmd, {cwd: projectDir});
        const updated = await loadJson(marketDemandPath);
        memoryMarketDemand = updated;
        lastMarketDemandTime = Date.now();
        return json(res, 200, {ok: true, data: updated});
      } catch (err) {
        return json(res, 500, {error: `스크립트 실행 오류: ${err.message}`});
      }
    }
    if (url.pathname === '/api/episodes/summary') {
      return json(res, 200, await getEpisodesSummary());
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

      const results = [];
      for (const vid of targetVideoIds.slice(0, 3)) {
        try {
          const meta = await fetchVideoDetails(vid, ytKey);
          if (!meta) continue;
          const comments = await fetchComments(vid, ytKey, 100);
          let aiInsights = null;
          if (geminiKey && comments.length > 0) {
            aiInsights = await analyzeCommentsWithGemini(meta, comments, geminiKey);
          }
          const reportMd = generateMarkdownReport(meta, comments, aiInsights);
          const slug = meta.title.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 50) + `_${vid}`;
          if (!existsSync(outputInsightsDir)) await mkdir(outputInsightsDir, {recursive: true});
          if (!existsSync(outputCommentsDir)) await mkdir(outputCommentsDir, {recursive: true});
          await writeFile(join(outputInsightsDir, `${slug}.md`), reportMd, 'utf8');
          await writeFile(join(outputCommentsDir, `${vid}.json`), JSON.stringify({schemaVersion: 1, analyzedAt: new Date().toISOString(), video: meta, aiInsights, comments}, null, 2), 'utf8');
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
        if (!result) return json(res, 500, {error: '대본 분석에 실패했습니다.'});
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
        const diagnosis = await diagnoseVideoWithGemini({
          video: body.video,
          geminiKey,
        });
        return json(res, 200, {ok: true, diagnosis});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
    }
    if (url.pathname === '/api/ab-simulator/competitors') {
      const competitors = await getMockCompetitorVideos();
      return json(res, 200, {ok: true, competitors});
    }
    if (url.pathname === '/api/ab-simulator/evaluate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!geminiKey || geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        return json(res, 400, {error: '.env 파일에 GEMINI_API_KEY 설정이 필요합니다.'});
      }
      try {
        const evaluation = await evaluateThumbnailTitleVariants({
          topic: body.topic,
          variants: body.variants,
          targetAudience: body.targetAudience,
          geminiKey,
        });
        return json(res, 200, {ok: true, evaluation});
      } catch (err) {
        return json(res, 500, {error: err.message});
      }
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

server.listen(port, '127.0.0.1', () => {
  console.log(`YouTube Channel Lab: http://localhost:${port}`);
  console.log(`OAuth callback: ${redirectUri}`);
  console.log(`Downloads Auto-Ingest: watching ${downloadsDir}`);
  if (requiredMissing.length) console.log(`Missing env: ${requiredMissing.join(', ')}`);
});
