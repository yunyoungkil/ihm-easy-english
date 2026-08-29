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
  const refreshed = await tokenRequest({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: token.refresh_token,
    grant_type: 'refresh_token',
  });
  return (await saveToken(refreshed, token)).access_token;
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

    const videoId = findMatchingVideoId(folderTitle, candidateItems);
    if (!videoId) {
      skipped.push({folder, reason: '영상 연결 실패'});
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
      const totalRow = rows.slice(1).find((r) => ['합계', 'total'].includes(normalizeTitle(r[0] || ''))) || rows[1];
      const impressions = numeric(totalRow[impressionsIndex]);
      const ctr = numeric(totalRow[ctrIndex], true);
      if (impressions == null || ctr == null) {
        skipped.push({folder, reason: '노출수/CTR 수치 변환 실패'});
        continue;
      }

      const periodKey = `${startDate}_${endDate}`;
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
  for (const video of recentVideos) {
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
  }

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

const getEpisodesSummary = async () => {
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
  return episodes.sort((a, b) => {
    const numA = parseInt(a.episode.replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(b.episode.replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });
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

.category-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-subtle);
}
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
      <button class="btn btn-cyan btn-sm" id="btn-sync-global">↻ SYNC ANALYTICS</button>
      <a class="btn btn-sm" id="btn-logout" href="/logout" style="display:none">⎋ 로그아웃</a>
    </div>
  </header>

  <nav class="category-tabs">
    <button class="tab-pill active" data-tab="tab-overview">⚡ 전체 관제 (Overview)</button>
    <button class="tab-pill" data-tab="tab-demand">🎯 시장 수요 레이더 (Market Demand)</button>
    <button class="tab-pill" data-tab="tab-outlier">🤖 아웃라이어 댓글 AI (Outlier Lab)</button>
    <button class="tab-pill" data-tab="tab-episodes">🎬 에피소드 & 업로드 패키지</button>
    <button class="tab-pill" data-tab="tab-evaluations">⚖️ 48H 사후 판정 (Evaluations)</button>
    <button class="tab-pill" data-tab="tab-studio">📁 Studio CTR 트래커</button>
    <button class="tab-pill" data-tab="tab-design">🎨 브랜드 디자인 시스템</button>
  </nav>

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

function updateClock() {
  const now = new Date();
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000);
  const timeStr = kst.toISOString().replace('T', ' ').slice(0, 19) + ' KST';
  const el = document.getElementById('live-clock');
  if (el) el.textContent = timeStr;
}
setInterval(updateClock, 1000);
updateClock();

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
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  renderCurrentTab();
}

document.querySelectorAll('.rail-btn, .tab-pill').forEach(btn => {
  btn.onclick = () => switchTab(btn.dataset.tab);
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
    
    gDashboard = await dashRes.json();

    if (gDashboard?.channel) {
      const isCached = gDashboard.isOffline ? ' (스냅샷 캐시 모드)' : ' (실시간 연동)';
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

  switch(gCurrentTab) {
    case 'tab-overview':
      root.innerHTML = renderOverviewTab();
      bindOverviewEvents();
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
          '<button class="btn btn-sm" onclick="switchTab(\\'tab-outlier\\')">🤖 AI 댓글 분석실 열기</button>' +
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
    btn.onclick = () => {
      gAiLabSubTab = 'comments';
      switchTab('tab-outlier');
      setTimeout(() => {
        const urlInput = document.getElementById('input-ai-url');
        if (urlInput) {
          urlInput.value = 'https://youtu.be/' + btn.dataset.vid;
          document.getElementById('btn-run-ai-url')?.click();
        }
      }, 200);
    };
  });

  document.querySelectorAll('.btn-outlier-script').forEach(btn => {
    btn.onclick = () => {
      gAiLabSubTab = 'scripts';
      switchTab('tab-outlier');
      setTimeout(() => {
        const urlInput = document.getElementById('input-script-url');
        if (urlInput) {
          urlInput.value = 'https://youtu.be/' + btn.dataset.vid;
          document.getElementById('btn-run-script-analyze')?.click();
        }
      }, 200);
    };
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
          '<p style="color:var(--text-normal);margin-top:4px;font-size:13px">시청자의 생생한 질문·고통(VoC)과 경쟁 채널의 대본 전개 공식을 역설계하여 \'이해하면 쉬운영어\'만의 대본 템플릿을 도출합니다.</p>' +
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

function bindOutlierLabEvents() {
  const statusBox = document.getElementById('ai-lab-status');
  const statusText = document.getElementById('ai-lab-status-text');
  const resultsContainer = document.getElementById('ai-results-container');

  const subtabComments = document.getElementById('subtab-btn-comments');
  const subtabScripts = document.getElementById('subtab-btn-scripts');
  if (subtabComments) subtabComments.onclick = () => { gAiLabSubTab = 'comments'; renderCurrentTab(); };
  if (subtabScripts) subtabScripts.onclick = () => { gAiLabSubTab = 'scripts'; renderCurrentTab(); };

  // 1. Comments Analysis
  const runAiAnalysis = async (payload) => {
    statusBox.style.display = 'block';
    statusText.textContent = '인기 댓글 100개 수집 및 Gemini AI 심층 분석 중입니다... (약 5~10초 소요)';
    resultsContainer.style.display = 'none';
    try {
      const res = await fetch('/api/insights/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '분석 중 오류가 발생했습니다.');
      statusBox.style.display = 'none';
      resultsContainer.style.display = 'block';
      resultsContainer.innerHTML = data.results?.map(r => renderSingleAiReportCard(r)).join('') || '<div class="card-subtext">분석 결과가 없습니다.</div>';
      loadSavedReportsList();
      showToast('AI 댓글 분석이 완료되었습니다!');
    } catch (err) {
      statusBox.style.display = 'block';
      statusText.innerHTML = '<span style="color:#ff7676">❌ ' + esc(err.message) + '</span>';
    }
  };

  const btnKw = document.getElementById('btn-run-ai-kw');
  if (btnKw) btnKw.onclick = () => {
    const kw = document.getElementById('input-ai-kw').value.trim();
    if (!kw) return alert('키워드를 입력하세요.');
    runAiAnalysis({keyword: kw});
  };

  const btnUrl = document.getElementById('btn-run-ai-url');
  if (btnUrl) btnUrl.onclick = () => {
    const url = document.getElementById('input-ai-url').value.trim();
    if (!url) return alert('유튜브 URL을 입력하세요.');
    runAiAnalysis({url});
  };

  // 2. Script Reverse-Engineering Analysis
  const btnScript = document.getElementById('btn-run-script-analyze');
  if (btnScript) btnScript.onclick = async () => {
    const urlInput = document.getElementById('input-script-url');
    const targetUrl = urlInput ? urlInput.value.trim() : '';
    if (!targetUrl) return alert('유튜브 URL 또는 영상 ID를 입력하세요.');
    statusBox.style.display = 'block';
    statusText.textContent = 'YouTube 자막을 1-Click 추출하고 Gemini AI로 대본 구조를 역설계 중입니다... (약 5~10초 소요)';
    resultsContainer.style.display = 'none';
    try {
      const res = await fetch('/api/scripts/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({url: targetUrl})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '대본 분석에 실패했습니다.');
      statusBox.style.display = 'none';
      resultsContainer.style.display = 'block';
      resultsContainer.innerHTML = renderSingleScriptReportCard(data.result);
      loadSavedScriptReportsList();
      showToast('🎉 경쟁사 대본 역설계 및 맞춤 대본 생성이 완료되었습니다!');
    } catch (err) {
      statusBox.style.display = 'block';
      statusText.innerHTML = '<span style="color:#ff7676">❌ ' + esc(err.message) + '</span>';
    }
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
      '<button class="btn btn-sm btn-magenta" onclick="copyToClipboard(decodeURIComponent(\\'' + encodeURIComponent(r.markdown || '') + '\\'), this)">📋 전체 마크다운 복사</button>' +
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
      '<button class="btn btn-sm btn-magenta" onclick="copyToClipboard(decodeURIComponent(\\'' + encodeURIComponent(r.markdown || '') + '\\'), this)">📋 전체 마크다운 복사</button>' +
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
        '<div class="card-title" style="color:var(--accent-cyan)">🎬 \'이해하면 쉬운영어\' 맞춤 재해석 대본 완성본</div>' +
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
          '<button class="btn btn-sm btn-cyan" onclick="viewSavedReportDetail(\\'' + esc(r.file) + '\\')">📄 전문 열람</button>' +
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
          '<button class="btn btn-sm btn-cyan" onclick="viewSavedScriptReportDetail(\\'' + esc(r.file) + '\\')">📜 대본 전문 열람</button>' +
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
        '<button class="btn btn-sm btn-magenta" onclick="copyToClipboard(decodeURIComponent(\\'' + encodeURIComponent(data.content) + '\\'), this)">📋 마크다운 복사</button>' +
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
        '<button class="btn btn-sm btn-magenta" onclick="copyToClipboard(decodeURIComponent(\\'' + encodeURIComponent(data.content) + '\\'), this)">📋 마크다운 복사</button>' +
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
            '<button class="btn btn-sm" onclick="copyToClipboard(\\'' + esc(yt.title || '').replace(/'/g, "\\\\'") + '\\', this)">복사</button>' +
          '</div>' +
          '<div style="font-weight:700;font-size:15px;color:var(--text-bright)">' + esc(yt.title || '') + '</div>' +
        '</div>' +

        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">💬 고정 댓글 (Pinned Comment)</span>' +
            '<button class="btn btn-sm" onclick="copyToClipboard(decodeURIComponent(\\'' + encodeURIComponent(yt.pinnedComment || '') + '\\'), this)">복사</button>' +
          '</div>' +
          '<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.5;color:var(--text-normal)">' + esc(yt.pinnedComment || '') + '</pre>' +
        '</div>' +

        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">📝 영상 설명문 (Description)</span>' +
            '<button class="btn btn-sm" onclick="copyToClipboard(decodeURIComponent(\\'' + encodeURIComponent(yt.description || '') + '\\'), this)">복사</button>' +
          '</div>' +
          '<pre style="white-space:pre-wrap;font-family:inherit;font-size:12px;line-height:1.5;color:var(--text-muted);max-height:200px;overflow-y:auto">' + esc(yt.description || '') + '</pre>' +
        '</div>' +

        '<div style="background:#080d16;padding:14px;border-radius:12px;border:1px solid var(--border-subtle)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
            '<span class="card-title">🏷️ 태그 목록</span>' +
            '<button class="btn btn-sm" onclick="copyToClipboard(\\'' + (yt.tags || []).join(', ') + '\\', this)">태그 전체 복사</button>' +
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
    const metrics = (d.videoPerformance || []).find(v => v.video === x.videoId) || {};
    const image = x.thumbnailPath ? '/api/package-image?id=' + encodeURIComponent(x.id) : (video.thumbnail || x.thumbnailUrl || (x.videoId ? 'https://i.ytimg.com/vi/' + x.videoId + '/mqdefault.jpg' : ''));

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

    const collectionBadge = hasData 
      ? '<span class="badge badge-strong-pass" style="margin-top:4px">✓ CTR 연결 완료 (' + (periodList.length + windowList.length) + '건)</span>'
      : '<span class="badge badge-hold" style="margin-top:4px">Studio CSV 대기</span>';

    return '<div class="thumb-card ' + (hasData ? 'has-data' : 'waiting-data') + ' col-4" style="' + (hasData ? 'border-color:rgba(0,240,255,0.4);' : '') + '">' +
      '<div style="position:relative">' +
        '<img class="thumb-img" src="' + esc(image || '') + '" alt="" style="border-radius:14px 14px 0 0;border:0;width:100%;height:150px;object-fit:cover">' +
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

loadAll();
</script>
</body>
</html>`;

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
      const accessToken = await getAccessToken();
      if (!accessToken) {
        const cached = await loadJson(latestSnapshotPath);
        if (cached) {
          const catalog = await loadJson(catalogPath);
          const packaging = cached.packagingRegistry || await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
          const scan = await scanStudioExportFolders(cached.recentVideos || catalog?.videos || [], packaging);
          const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
          return json(res, 200, {...cached, studioFolderScan: scan, videoReachManual: reach, isOffline: true});
        }
        return json(res, 401, {error: 'YouTube 채널 연결이 필요합니다.'});
      }
      try {
        const data = await getDashboard(accessToken);
        return json(res, 200, data);
      } catch (err) {
        console.error('Live dashboard query error, falling back to cache:', err.message);
        const cached = await loadJson(latestSnapshotPath);
        if (cached) {
          const catalog = await loadJson(catalogPath);
          const packaging = cached.packagingRegistry || await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
          const scan = await scanStudioExportFolders(cached.recentVideos || catalog?.videos || [], packaging);
          const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
          return json(res, 200, {...cached, studioFolderScan: scan, videoReachManual: reach, isOffline: true, liveError: err.message});
        }
        return json(res, 500, {error: err.message});
      }
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
      notifyClients('studio-updated', { event: { type: 'manual-scan' }, scan: scanResult, videoReachManual: reach });
      return json(res, 200, {ok: true, scan: scanResult, videoReachManual: reach});
    }
    if (url.pathname === '/api/package-image') {
      const id = String(url.searchParams.get('id') || '');
      const registry = await loadJson(packagingRegistryPath);
      const item = registry?.items?.find((entry) => entry.id === id);
      if (!item?.thumbnailPath || !/^output[\\/]/.test(item.thumbnailPath) || item.thumbnailPath.includes('..')) {
        return json(res, 404, {error: '등록된 로컬 썸네일이 없습니다.'});
      }
      const filePath = resolve(projectDir, item.thumbnailPath);
      if (!existsSync(filePath)) return json(res, 404, {error: '썸네일 파일을 찾지 못했습니다.'});
      const image = await readFile(filePath);
      res.writeHead(200, {'Content-Type': 'image/png', 'Cache-Control': 'no-store'});
      res.end(image);
      return;
    }
    if (url.pathname === '/api/market-demand') {
      const marketDemand = await loadJson(marketDemandPath);
      if (!marketDemand) return json(res, 404, {error: 'market-demand.json 파일이 없습니다.'});
      return json(res, 200, marketDemand);
    }
    if (url.pathname === '/api/market-demand/run' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const kw = body.keyword ? `--keyword="${body.keyword}"` : '';
      const cmd = `node scripts/market-demand.mjs ${kw}`;
      try {
        await execAsync(cmd, {cwd: projectDir});
        const updated = await loadJson(marketDemandPath);
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
      if (!accessToken) return json(res, 401, {error: 'YouTube 채널 연결이 필요합니다.'});
      const dashboard = await getDashboard(accessToken);
      return json(res, 200, {ok: true, sync: dashboard.sync, channel: dashboard.channel});
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
