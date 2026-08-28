import {createServer} from 'node:http';
import {readFile, writeFile, unlink, mkdir, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {build48hEvaluations} from './evaluate-48h.mjs';

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
const studioExportDir = resolve(process.env.YOUTUBE_STUDIO_EXPORT_DIR || join(projectDir, 'imports', 'youtube-studio'));
const port = Number(process.env.YOUTUBE_ANALYTICS_PORT || 3001);
const redirectUri = `http://localhost:${port}/oauth2callback`;

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

const googlePublicGetAllPages = async (url) => {
  if (!youtubeApiKey) throw new Error('YOUTUBE_API_KEY가 설정되지 않았습니다.');
  const items = [];
  let pageToken = '';
  do {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set('key', youtubeApiKey);
    if (pageToken) requestUrl.searchParams.set('pageToken', pageToken);
    const response = await fetch(requestUrl);
    const page = await response.json();
    if (!response.ok) throw new Error(page?.error?.message || `YouTube Data API request failed (${response.status})`);
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
      if (quoted && next === '"') { cell += '"'; index++; } else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = '';
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
};

const normalizeCsvHeader = (value) => String(value || '').replace(/^\uFEFF/, '').toLowerCase().replace(/[\s_()%·.\-/]/g, '');
const findCsvColumn = (headers, aliases) => {
  const values = headers.map(normalizeCsvHeader);
  const exact = values.findIndex((value) => aliases.includes(value));
  return exact >= 0 ? exact : values.findIndex((value) => aliases.some((alias) => value.includes(alias)));
};
const csvNumber = (value, percent = false) => {
  const raw = String(value ?? '').trim();
  const hadPercent = raw.includes('%');
  const number = Number(raw.replace(/,/g, '').replace(/%/g, ''));
  if (!raw || !Number.isFinite(number)) return null;
  return percent && !hadPercent && number > 0 && number <= 1 ? Math.round(number * 10000) / 100 : number;
};
const normalizeVideoTitle = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[^0-9a-z가-힣]+/g, '');

const scanStudioExportFolders = async (videos, packages) => {
  await mkdir(studioExportDir, {recursive: true});
  const folders = (await readdir(studioExportDir, {withFileTypes: true})).filter((entry) => entry.isDirectory());
  const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
  const results = {directory: studioExportDir, scanned: folders.length, imported: 0, unchanged: 0, waiting: [], skipped: []};
  for (const folder of folders) {
    const match = folder.name.match(/^콘텐츠\s+(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})\s+(.+)$/i);
    if (!match) { results.skipped.push({folder: folder.name, reason: '폴더명 형식 불일치'}); continue; }
    const [, startDate, endDate, folderTitle] = match;
    const folderPath = join(studioExportDir, folder.name);
    const files = await readdir(folderPath, {withFileTypes: true});
    const tableFile = files.find((entry) => entry.isFile() && /^표 데이터\.csv$/i.test(entry.name));
    if (!tableFile) { results.skipped.push({folder: folder.name, reason: '표 데이터.csv 없음'}); continue; }
    const rows = parseCsvRows(await readFile(join(folderPath, tableFile.name), 'utf8'));
    if (rows.length < 2) { results.skipped.push({folder: folder.name, reason: 'CSV 데이터 없음'}); continue; }
    const impressionsIndex = findCsvColumn(rows[0], ['impressions', '노출수', '노출']);
    const ctrIndex = findCsvColumn(rows[0], ['impressionsclickthroughrate', 'impressionclickthroughrate', '노출클릭률', '노출수클릭률', 'ctr']);
    const totalRow = rows.slice(1).find((row) => ['합계', 'total'].includes(String(row[0] || '').trim().toLowerCase())) || rows[1];
    const impressions = impressionsIndex >= 0 ? csvNumber(totalRow[impressionsIndex]) : null;
    const ctr = ctrIndex >= 0 ? csvNumber(totalRow[ctrIndex], true) : null;
    if (impressions === null || ctr === null) { results.skipped.push({folder: folder.name, reason: '노출수/CTR 열 없음'}); continue; }
    const normalizedFolderTitle = normalizeVideoTitle(folderTitle.replace(/_/g, ' '));
    const matches = videos.filter((video) => {
      const title = normalizeVideoTitle(video.title);
      return title === normalizedFolderTitle || title.includes(normalizedFolderTitle) || normalizedFolderTitle.includes(title);
    });
    if (matches.length !== 1) { results.skipped.push({folder: folder.name, reason: matches.length ? '영상 제목 중복' : '영상 제목 연결 실패'}); continue; }
    const video = matches[0];
    const publishedAt = new Date(video.publishedAt || '');
    if (!Number.isFinite(publishedAt.getTime())) { results.skipped.push({folder: folder.name, reason: '공개일 확인 실패'}); continue; }
    const eligibleAt = new Date(publishedAt);
    eligibleAt.setUTCDate(eligibleAt.getUTCDate() + 30);
    const reportEnd = new Date(`${endDate}T23:59:59Z`);
    if (reportEnd < eligibleAt) {
      results.waiting.push({folder: folder.name, videoId: video.videoId, eligibleAt: eligibleAt.toISOString().slice(0, 10), reason: '공개 후 30일 이전 데이터'});
      continue;
    }
    const periodKey = `${startDate}_${endDate}`;
    const packageItem = packages.items.find((item) => item.videoId === video.videoId) || null;
    reach.videos[video.videoId] ||= {videoId: video.videoId, windows: {}, periods: {}};
    reach.videos[video.videoId].periods ||= {};
    const previous = reach.videos[video.videoId].periods[periodKey];
    const record = {startDate, endDate, impressions: Math.round(impressions), ctr, packageId: packageItem?.id || `youtube-${video.videoId}`, source: 'youtube-studio-folder', sourceFolder: folder.name, importedAt: new Date().toISOString()};
    if (previous && previous.impressions === record.impressions && previous.ctr === record.ctr) results.unchanged++;
    else { reach.videos[video.videoId].periods[periodKey] = record; results.imported++; }
  }
  reach.updatedAt = new Date().toISOString();
  reach.lastFolderScan = {...results, scannedAt: reach.updatedAt};
  await saveJson(videoReachManualPath, reach);
  return results;
};

const isoDate = (date) => date.toISOString().slice(0, 10);
const dateRange = () => {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 89);
  return {startDate: isoDate(start), endDate: isoDate(end)};
};

const analyticsQuery = async (accessToken, params) => {
  const query = new URLSearchParams({ids: 'channel==MINE', ...params});
  return googleGet(`https://youtubeanalytics.googleapis.com/v2/reports?${query}`, accessToken);
};

const optionalAnalyticsQuery = async (accessToken, params) => {
  try {
    return await analyticsQuery(accessToken, params);
  } catch (error) {
    console.warn(`Optional analytics report skipped: ${error.message}`);
    return {columnHeaders: [], rows: []};
  }
};

const getVideoComments = async (accessToken, video, channelId) => {
  if (Number(video.statistics?.commentCount || 0) < 1) return [];
  try {
    const items = await googlePublicGetAllPages(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&videoId=${encodeURIComponent(video.videoId)}&maxResults=100&order=time&textFormat=plainText`,
    );
    return items.map((item) => {
      const comment = item.snippet?.topLevelComment;
      const snippet = comment?.snippet || {};
      return {
        threadId: item.id,
        commentId: comment?.id,
        text: snippet.textDisplay || snippet.textOriginal || '',
        author: snippet.authorDisplayName || '',
        authorChannelId: snippet.authorChannelId?.value || null,
        isChannelOwner: snippet.authorChannelId?.value === channelId,
        likeCount: Number(snippet.likeCount || 0),
        publishedAt: snippet.publishedAt || null,
        updatedAt: snippet.updatedAt || null,
        replyCount: Number(item.snippet?.totalReplyCount || 0),
      };
    });
  } catch (error) {
    console.warn(`Comments skipped for ${video.videoId}: ${error.message}`);
    return [];
  }
};

const rowObjects = (report) => {
  const names = (report.columnHeaders || []).map((column) => column.name);
  return (report.rows || []).map((row) => Object.fromEntries(names.map((name, index) => [name, row[index]])));
};

const durationSeconds = (iso = '') => {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
};

const inferClassifications = (videos, savedMap) => {
  const map = Object.fromEntries(Object.entries(savedMap).map(([id, value]) => [id, {
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
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
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
    commentsByVideo[video.videoId] = await getVideoComments(accessToken, video, channel.id);
  }
  const savedClassifications = await loadVideoMap();
  const classifications = inferClassifications(recentVideos, savedClassifications);
  if (JSON.stringify(classifications) !== JSON.stringify(savedClassifications)) await saveVideoMap(classifications);

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
  const titles = Object.fromEntries(topRows.map((row) => {
    const detail = detailsById[row.video] || {};
    return [row.video, {
      title: detail.snippet?.title || row.video,
      publishedAt: detail.snippet?.publishedAt,
      duration: detail.contentDetails?.duration,
    }];
  }));

  const videoPerformance = topRows.map((row) => ({
    ...row,
    title: titles[row.video]?.title || row.video,
    publishedAt: titles[row.video]?.publishedAt,
    duration: titles[row.video]?.duration,
    creatorContentType: durationSeconds(titles[row.video]?.duration) <= 60 ? 'SHORTS' : 'VIDEO_ON_DEMAND',
    subscriberNet: Number(row.subscribersGained || 0) - Number(row.subscribersLost || 0),
    subscribersPerThousandViews: Number(row.views || 0) > 0
      ? ((Number(row.subscribersGained || 0) - Number(row.subscribersLost || 0)) / Number(row.views)) * 1000
      : 0,
  }));
  const longformCandidates = recentVideos.filter((video) => video.durationSeconds >= 120).map((video) => {
    const metrics = videoPerformance.find((row) => row.video === video.videoId) || {};
    const classification = classifications[video.videoId] || {};
    const relatedShorts = classification.season && classification.episode
      ? videoPerformance.filter((row) => {
        const relatedClass = classifications[row.video] || {};
        return relatedClass.category === 'SEASON'
          && relatedClass.season === classification.season
          && relatedClass.episode === classification.episode
          && ['A', 'B'].includes(relatedClass.role);
      })
      : [];
    return {video, metrics, classification, relatedShorts};
  });
  const evidenceFor = ({metrics, relatedShorts}) => [metrics, ...relatedShorts].filter((row) => Number(row.views || 0) > 0);
  const maxViews = Math.max(1, ...longformCandidates.map((candidate) => evidenceFor(candidate).reduce((sum, row) => sum + Number(row.views || 0), 0)));
  const channelCRecommendations = longformCandidates.map(({video, metrics, classification, relatedShorts}) => {
    const views = Number(metrics.views || 0);
    const retention = Number(metrics.averageViewPercentage || 0);
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
    topVideos: videoPerformance.slice(0, 10),
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

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const page = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>YouTube Channel Lab</title>
<style>
main,.panel,.grid>*,.cards,.card{min-width:0}td,th{overflow-wrap:anywhere}.value{overflow-wrap:anywhere}
@media(max-width:800px){main{overflow:hidden}.table{font-size:12px}.table td,.table th{padding:9px 4px}.panel{overflow:hidden}.value{letter-spacing:-.04em}}
</style>
<style>
:root{color-scheme:dark;--bg:#07111f;--panel:#0e1d31;--line:#203954;--text:#eaf4ff;--muted:#8ea8c3;--cyan:#44e2e8;--gold:#ffc64d}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0,#123351 0,transparent 35%),var(--bg);color:var(--text);font-family:Inter,Pretendard,"Noto Sans KR",sans-serif}
main{width:min(1180px,calc(100% - 32px));margin:0 auto;padding:42px 0 80px}header{display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:28px}.eyebrow{color:var(--cyan);font-weight:800;letter-spacing:.18em;font-size:12px}h1{font-size:clamp(28px,5vw,56px);margin:8px 0}.muted{color:var(--muted)}button,a.button{border:0;border-radius:999px;background:var(--cyan);color:#04131c;padding:13px 20px;font-weight:900;text-decoration:none;cursor:pointer}.panel{background:linear-gradient(145deg,rgba(19,42,68,.96),rgba(10,24,41,.96));border:1px solid var(--line);border-radius:22px;padding:22px;box-shadow:0 18px 60px #0005}.hero{display:flex;align-items:center;gap:15px}.avatar{width:58px;height:58px;border-radius:50%}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:16px 0}.card{padding:18px;border:1px solid var(--line);border-radius:17px;background:#0b192b}.label{color:var(--muted);font-size:13px}.value{font-size:27px;font-weight:900;margin-top:8px}.grid{display:grid;grid-template-columns:1.1fr .9fr;gap:16px}.chart{height:220px;display:flex;align-items:flex-end;gap:3px;padding-top:20px}.bar{flex:1;min-width:2px;background:linear-gradient(var(--cyan),#18738b);border-radius:4px 4px 0 0;opacity:.9}.table{width:100%;border-collapse:collapse}.table td,.table th{padding:12px 8px;border-bottom:1px solid var(--line);text-align:left}.table th{color:var(--muted);font-size:12px}.right{text-align:right!important}.empty{text-align:center;padding:70px 20px}.error{color:#ff9898;white-space:pre-wrap}.actions{display:flex;gap:10px;align-items:center}@media(max-width:800px){.cards{grid-template-columns:repeat(2,1fr)}.grid{grid-template-columns:1fr}header{align-items:flex-start;flex-direction:column}}@media(max-width:480px){.cards{grid-template-columns:1fr 1fr}.value{font-size:21px}}
.thumb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px}.thumb-card{border:1px solid var(--line);border-radius:17px;background:#0b192b;overflow:hidden}.thumb-card.needs-data{border-color:#d9912b;background:linear-gradient(160deg,#32230f,#151c28)}.thumb-card.waiting-data{opacity:.76;background:#0a1726}.thumb-card.has-data{border-color:#238ca4}.thumb-card img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#07111f}.thumb-body{padding:14px}.thumb-form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.thumb-form input,.thumb-form select,select,input{background:#08101c;color:var(--text);border:1px solid var(--line);border-radius:9px;padding:9px;min-width:0}.thumb-form button{grid-column:1/-1;padding:9px}.metric-row{display:grid;gap:7px;margin-top:11px}.metric-pill{font-size:11px;padding:4px 7px;border:1px solid #36516f;border-radius:99px;color:#bdd3e9}.monthly-result{padding:10px 12px;border:1px solid #238ca4;border-radius:10px;background:#0b2638;color:#eafcff;font-size:13px;font-weight:800}.monthly-result b{color:var(--cyan);font-size:15px}.collection-state{margin-top:11px;padding:10px 12px;border-radius:10px;font-size:13px;font-weight:900}.collection-state.need{background:#5a350e;color:#ffd18a;border:1px solid #d9912b}.collection-state.wait{background:#111f31;color:#8ea8c3;border:1px solid #29425e}
.csv-import{display:grid;grid-template-columns:1fr 150px minmax(220px,1fr) auto;gap:9px;align-items:center;padding:14px;margin:14px 0 18px;border:1px dashed #36516f;border-radius:14px;background:#091625}.csv-import input[type=file]{width:100%}.csv-import button{border-radius:9px;padding:10px 15px}.csv-state{grid-column:1/-1;white-space:pre-wrap}.data-note{display:inline-block;margin-top:8px;color:#ffc64d;font-size:12px}@media(max-width:900px){.csv-import{grid-template-columns:1fr 1fr}.csv-import button{width:100%}}@media(max-width:700px){.csv-import{grid-template-columns:1fr}.csv-state{grid-column:1}}
</style></head><body><main><header><div><div class="eyebrow">SEASON 2 · CHANNEL INTELLIGENCE</div><h1>YouTube Channel Lab</h1><div class="muted">채널의 다음 영상을 결정하기 위한 로컬 분석 화면</div></div><div class="actions"><button id="refresh" hidden>새로고침</button><a id="logout" class="button" href="/logout" hidden>연결 해제</a></div></header><div id="app" class="panel empty">확인 중...</div></main>
<script>
const app=document.querySelector('#app'),refresh=document.querySelector('#refresh'),logout=document.querySelector('#logout');
const fmt=new Intl.NumberFormat('ko-KR'); const sec=(n)=>{n=Math.round(Number(n)||0);return Math.floor(n/60)+'분 '+(n%60)+'초'};
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){app.className='panel empty';app.textContent='YouTube 데이터를 불러오는 중...';try{const r=await fetch('/api/dashboard');const d=await r.json();if(r.status===401){app.innerHTML='<h2>채널 연결이 필요합니다</h2><p class="muted">Google 계정으로 로그인해 내 YouTube Analytics 데이터를 읽어옵니다. 데이터는 이 PC에서만 처리됩니다.</p><p><a class="button" href="/auth">YouTube 채널 연결</a></p>';return}if(!r.ok)throw new Error(d.error||'데이터를 불러오지 못했습니다.');render(d)}catch(e){app.innerHTML='<div class="error">'+esc(e.message)+'</div>'}}
function render(d){refresh.hidden=false;logout.hidden=false;const max=Math.max(1,...d.daily.map(x=>Number(x.views)||0));app.className='';app.innerHTML='<section class="panel hero">'+(d.channel.thumbnail?'<img class="avatar" src="'+esc(d.channel.thumbnail)+'">':'')+'<div><div class="label">연결된 채널</div><h2>'+esc(d.channel.title)+'</h2><div class="muted">'+esc(d.range.startDate)+' ~ '+esc(d.range.endDate)+'</div></div></section><div class="cards"><div class="card"><div class="label">최근 90일 조회수</div><div class="value">'+fmt.format(d.summary.views||0)+'</div></div><div class="card"><div class="label">시청 시간</div><div class="value">'+fmt.format(Math.round((d.summary.estimatedMinutesWatched||0)/60))+'시간</div></div><div class="card"><div class="label">평균 시청 시간</div><div class="value">'+sec(d.summary.averageViewDuration)+'</div></div><div class="card"><div class="label">구독자 순증</div><div class="value">'+fmt.format((d.summary.subscribersGained||0)-(d.summary.subscribersLost||0))+'</div></div></div><div class="grid"><section class="panel"><div class="label">일별 조회수 흐름</div><div class="chart">'+d.daily.map(x=>'<div class="bar" title="'+esc(x.day)+': '+fmt.format(x.views)+'" style="height:'+Math.max(2,Math.round((x.views/max)*100))+'%"></div>').join('')+'</div></section><section class="panel"><div class="label">채널 전체</div><div class="cards" style="grid-template-columns:1fr"><div><div class="value">'+fmt.format(d.channel.subscribers)+'</div><div class="label">현재 구독자</div></div><div><div class="value">'+fmt.format(d.channel.videos)+'</div><div class="label">공개 영상</div></div></div></section></div><section class="panel" style="margin-top:16px"><h2>최근 90일 상위 영상</h2><div style="overflow:auto"><table class="table"><thead><tr><th>영상</th><th class="right">조회수</th><th class="right">평균 시청</th><th class="right">평균 시청률</th></tr></thead><tbody>'+d.topVideos.map(v=>'<tr><td>'+esc(v.title)+'</td><td class="right">'+fmt.format(v.views||0)+'</td><td class="right">'+sec(v.averageViewDuration)+'</td><td class="right">'+Number(v.averageViewPercentage||0).toFixed(1)+'%</td></tr>').join('')+'</tbody></table></div></section>'}
function render(d){
 refresh.hidden=false;logout.hidden=false;const max=Math.max(1,...d.daily.map(x=>Number(x.views)||0));
 const trafficMax=Math.max(1,...d.trafficSources.map(x=>Number(x.views)||0));
 const types=Object.fromEntries(d.contentTypes.map(x=>[String(x.creatorContentType).toLowerCase(),x]));const shorts=types.shorts||{};const vod=types.videoondemand||{};
 const best=[...d.topVideos].sort((a,b)=>b.subscribersPerThousandViews-a.subscribersPerThousandViews)[0];
 const tag=(text)=>'<span style="display:inline-block;padding:4px 8px;border-radius:99px;background:#173451;color:#44e2e8;font-size:11px;font-weight:900">'+text+'</span>';
 const sourceName={SHORTS:'쇼츠 피드',YT_SEARCH:'YouTube 검색',RELATED_VIDEO:'추천 영상',BROWSE:'탐색 기능',SUBSCRIBER:'구독 피드',NOTIFICATION:'알림',END_SCREEN:'최종 화면',YT_CHANNEL:'채널 페이지',EXT_URL:'외부 사이트',NO_LINK_OTHER:'기타 직접 유입',YT_OTHER_PAGE:'YouTube 기타'};
 const typeRow=(name,x)=>'<tr><td>'+name+'</td><td class="right">'+fmt.format(x.views||0)+'</td><td class="right">'+fmt.format(Math.round((x.estimatedMinutesWatched||0)/60))+'시간</td><td class="right">'+fmt.format((x.subscribersGained||0)-(x.subscribersLost||0))+'</td></tr>';
 const selected=(a,b)=>String(a)===String(b)?' selected':'';
 const classificationRows=d.recentVideos.slice(0,30).map(v=>{const c=d.classifications[v.videoId]||{};const category=c.category||(c.season?'SEASON':'OTHER');return '<tr data-video="'+esc(v.videoId)+'"><td><b>'+esc(v.title)+'</b><div class="label">'+esc((v.publishedAt||'').slice(0,10))+' · '+(v.durationSeconds<=60?'쇼츠':'롱폼')+'</div></td><td><select class="category"><option value="SEASON"'+selected(category,'SEASON')+'>시즌 콘텐츠</option><option value="CHANNEL"'+selected(category,'CHANNEL')+'>채널 공통</option><option value="LEGACY"'+selected(category,'LEGACY')+'>기획 이전</option><option value="EXPERIMENT"'+selected(category,'EXPERIMENT')+'>실험 포맷</option><option value="OTHER"'+selected(category,'OTHER')+'>기타/검토</option></select></td><td><select class="season"><option value="1"'+selected(c.season,1)+'>시즌1</option><option value="2"'+selected(c.season,2)+'>시즌2</option></select></td><td><input class="episode" type="number" min="1" max="99" value="'+esc(c.episode||1)+'" style="width:64px"></td><td><select class="role"><option value="LONG"'+selected(c.role,'LONG')+'>롱폼</option><option value="A"'+selected(c.role,'A')+'>쇼츠 A</option><option value="B"'+selected(c.role,'B')+'>쇼츠 B</option><option value="C"'+selected(c.role,'C')+'>쇼츠 C (채널 공통)</option><option value="STANDALONE_SHORT"'+selected(c.role,'STANDALONE_SHORT')+'>독립 쇼츠</option><option value="STANDALONE_LONG"'+selected(c.role,'STANDALONE_LONG')+'>독립 롱폼</option></select></td><td><button class="save-classification">확정</button><div class="save-state label">'+(c.source==='auto'?'자동 제안':c.role?'직접 확정':'미분류')+'</div><div class="label">'+esc(c.reason||'')+'</div></td></tr>'}).join('');
 const evaluations=(d.evaluations48h?.evaluations||[]);const decisionColor={"waiting-48h":"#ffc64d","waiting-data":"#ffc64d",revise:"#ff7676",hold:"#bca7ff",pass:"#44e2e8","strong-pass":"#66ed91"};
 const evaluationCards=evaluations.map(e=>'<div class="card" style="border-color:'+esc(decisionColor[e.decisionStatus]||'#203954')+'"><div class="label">48시간 자동 판정 · '+esc(e.contentId)+'</div><div class="value" style="font-size:22px;color:'+esc(decisionColor[e.decisionStatus]||'#eaf4ff')+'">'+esc(e.label)+'</div><div style="margin-top:8px">'+esc(e.reason)+'</div>'+(e.metrics?'<div class="label" style="margin-top:8px">조회수 '+fmt.format(e.metrics.views||0)+' · 평균 시청률 '+Number(e.metrics.averageViewPercentage||0).toFixed(1)+'% · 구독 순증 '+fmt.format((e.metrics.subscribersGained||0)-(e.metrics.subscribersLost||0))+'</div>':'')+'</div>').join('');
 const cCandidates=(d.channelCRecommendations||[]).slice(0,5);const cCards=cCandidates.map(x=>'<div class="card"><div class="label">후보 '+x.rank+' · 성장 점수 '+x.score+'</div><div style="font-weight:900;font-size:17px;margin:8px 0">'+esc(x.title)+'</div><div class="label">'+esc(x.reason)+'</div><a href="'+esc(x.url)+'" target="_blank" style="display:inline-block;color:#44e2e8;margin-top:10px">롱폼 보기</a></div>').join('');
 const packages=(d.packagingRegistry?.items||[]);const packagedVideos=new Set(packages.map(x=>x.videoId).filter(Boolean));
 const apiPackages=(d.recentVideos||[]).filter(v=>v.durationSeconds>60&&!packagedVideos.has(v.videoId)).slice(0,12).map(v=>({id:'youtube-'+v.videoId,videoId:v.videoId,title:v.title,thumbnailUrl:v.thumbnail,version:'현재',status:'published',format:'LONGFORM'}));
 const packagingItems=[...packages,...apiPackages];
 const csvTargets=packagingItems.filter(x=>x.videoId).map(x=>'<option value="'+esc(x.videoId)+'" data-package="'+esc(x.id)+'">'+esc(x.title||x.videoId)+'</option>').join('');
 const thumbCards=packagingItems.map(x=>{const saved=d.videoReachManual?.videos?.[x.videoId]||{};const reach=saved.windows||{};const periods=saved.periods||{};const video=(d.recentVideos||[]).find(v=>v.videoId===x.videoId)||x;const published=new Date(video.publishedAt||'');const eligible=new Date(published);eligible.setUTCDate(eligible.getUTCDate()+30);const eligibleDate=Number.isFinite(eligible.getTime())?eligible.toISOString().slice(0,10):'';const isEligible=eligibleDate&&Date.now()>=eligible.getTime();const validPeriods=Object.values(periods).filter(p=>!eligibleDate||String(p.endDate)>=eligibleDate);const hasData=validPeriods.length>0;const stateClass=hasData?'has-data':isEligible?'needs-data':'waiting-data';const metrics=(d.videoPerformance||[]).find(v=>v.video===x.videoId)||{};const image=x.thumbnailPath?'/api/package-image?id='+encodeURIComponent(x.id):x.thumbnailUrl;const windowPills=['24h','48h','7d','28d'].filter(w=>reach[w]&&(reach[w].impressions!=null||reach[w].ctr!=null)).map(w=>'<div class="monthly-result">'+w+' · 노출 <b>'+fmt.format(reach[w].impressions||0)+'</b> · CTR <b>'+Number(reach[w].ctr||0).toFixed(1)+'%</b></div>');const periodPills=validPeriods.sort((a,b)=>String(b.endDate).localeCompare(String(a.endDate))).slice(0,3).map(p=>'<div class="monthly-result"><span class="label">'+esc(p.startDate)+' ~ '+esc(p.endDate)+'</span><br>노출 <b>'+fmt.format(p.impressions||0)+'</b> · CTR <b>'+Number(p.ctr||0).toFixed(2)+'%</b></div>');const pills=[...windowPills,...periodPills].join('');const collectionState=hasData?'':isEligible?'<div class="collection-state need">월간 데이터 수집 필요</div>':'<div class="collection-state wait">'+(eligibleDate?'수집 예정 · '+esc(eligibleDate)+'부터':'업로드 후 30일이 지나면 수집')+'</div>';return '<article class="thumb-card '+stateClass+'" data-package="'+esc(x.id)+'"><img src="'+esc(image||'')+'" alt=""><div class="thumb-body"><div class="label">패키징 '+esc(x.version||'현재')+' · '+esc(x.status||'')+'</div><b>'+esc(x.title||x.contentId||x.videoId)+'</b><div class="label" style="margin-top:7px">조회수 '+fmt.format(metrics.views||0)+' · 평균 시청률 '+Number(metrics.averageViewPercentage||0).toFixed(1)+'% · 구독 순증 '+fmt.format(metrics.subscriberNet||0)+'</div><div class="metric-row">'+pills+'</div>'+collectionState+'</div></article>'}).join('');
 const folderScan=d.studioFolderScan||{};const connected=Number(folderScan.imported||0)+Number(folderScan.unchanged||0);const folderStatus='자동 폴더: '+esc(folderScan.directory||'')+'<br><b style="color:#44e2e8">연결 완료 '+fmt.format(connected)+'개</b> · 30일 대기 '+fmt.format((folderScan.waiting||[]).length)+'개 · 확인 필요 '+fmt.format((folderScan.skipped||[]).length)+'개';
 app.className='';app.innerHTML=
 '<section class="panel hero">'+(d.channel.thumbnail?'<img class="avatar" src="'+esc(d.channel.thumbnail)+'">':'')+'<div><div class="label">연결된 채널</div><h2>'+esc(d.channel.title)+'</h2><div class="muted">'+esc(d.range.startDate)+' ~ '+esc(d.range.endDate)+' · 최근 90일</div></div></section>'+
 (evaluations.length?'<section class="panel" style="margin-top:16px"><h2>업로드 48시간 판정</h2><p class="muted">업로드 후 48시간이 지나고 YouTube 분석 데이터가 반영되면 자동 판정합니다.</p><div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">'+evaluationCards+'</div></section>':'')+
 (cCandidates.length?'<section class="panel" style="margin-top:16px"><h2>쇼츠 C · 전체 롱폼 후보</h2><p class="muted">시즌·EP와 분리된 채널 공통 포맷입니다. 전체 롱폼의 조회수 45%, 유지율 30%, 구독 전환 25%를 반영했습니다.</p><div class="cards" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">'+cCards+'</div></section>':'')+
 '<section class="panel" style="margin-top:16px"><h2>롱폼 제목·썸네일 패키징 분석</h2><p class="muted">매월 1회 Studio 내보내기 폴더를 지정 위치에 넣으면 화면을 열 때 자동으로 기간·영상·노출수·CTR을 연결합니다.</p><div class="csv-import"><div class="csv-state label">'+folderStatus+'</div></div><details><summary class="label" style="cursor:pointer;margin-bottom:12px">예외 상황에서 CSV 직접 가져오기</summary><div class="csv-import"><input id="studio-csv" type="file" accept=".csv,text/csv"><select id="csv-window"><option value="24h">업로드 후 24시간</option><option value="48h">업로드 후 48시간</option><option value="7d">업로드 후 7일</option><option value="28d">업로드 후 28일</option></select><select id="csv-target"><option value="">여러 영상 CSV · 자동 연결</option>'+csvTargets+'</select><button id="import-csv">Studio CSV 가져오기</button><div id="csv-state" class="csv-state label">단일 영상의 표 데이터.csv는 대상 영상을 선택하세요.</div></div></details><div class="thumb-grid">'+thumbCards+'</div></section>'+
 '<div class="cards"><div class="card"><div class="label">조회수</div><div class="value">'+fmt.format(d.summary.views||0)+'</div></div><div class="card"><div class="label">시청 시간</div><div class="value">'+fmt.format(Math.round((d.summary.estimatedMinutesWatched||0)/60))+'시간</div></div><div class="card"><div class="label">평균 시청 시간</div><div class="value">'+sec(d.summary.averageViewDuration)+'</div></div><div class="card"><div class="label">구독자 순증</div><div class="value">'+fmt.format((d.summary.subscribersGained||0)-(d.summary.subscribersLost||0))+'</div></div></div>'+
 '<div class="grid"><section class="panel"><h2>쇼츠 vs 롱폼</h2><table class="table"><thead><tr><th>형식</th><th class="right">조회수</th><th class="right">시청 시간</th><th class="right">구독 순증</th></tr></thead><tbody>'+typeRow('쇼츠',shorts)+typeRow('롱폼',vod)+'</tbody></table>'+(best?'<div style="border-left:3px solid #ffc64d;padding:10px 14px;margin-top:14px;background:#0b192b"><div class="label">구독 전환이 가장 강한 영상</div><b>'+esc(best.title)+'</b><div class="muted">조회수 1,000회당 구독 '+best.subscribersPerThousandViews.toFixed(1)+'명</div></div>':'')+'</section><section class="panel"><div class="label">일별 조회수 흐름</div><div class="chart">'+d.daily.map(x=>'<div class="bar" title="'+esc(x.day)+': '+fmt.format(x.views)+'" style="height:'+Math.max(2,Math.round((x.views/max)*100))+'%"></div>').join('')+'</div></section></div>'+
 '<div class="grid" style="margin-top:16px"><section class="panel"><h2>유입 경로</h2>'+d.trafficSources.slice(0,8).map(x=>'<div style="margin:13px 0"><div style="display:flex;justify-content:space-between"><span>'+esc(sourceName[x.insightTrafficSourceType]||x.insightTrafficSourceType)+'</span><b>'+fmt.format(x.views||0)+'</b></div><div style="height:8px;background:#091625;border-radius:99px;overflow:hidden;margin-top:7px"><i style="display:block;height:100%;background:linear-gradient(90deg,#44e2e8,#ffc64d);width:'+Math.max(2,Math.round((x.views/trafficMax)*100))+'%"></i></div></div>').join('')+'</section><section class="panel"><h2>YouTube 검색어</h2>'+(d.searchTerms.length?'<table class="table"><thead><tr><th>검색어</th><th class="right">조회수</th></tr></thead><tbody>'+d.searchTerms.map(x=>'<tr><td>'+esc(x.insightTrafficSourceDetail)+'</td><td class="right">'+fmt.format(x.views||0)+'</td></tr>').join('')+'</tbody></table>':'<div class="muted">공개 가능한 검색어 데이터가 아직 충분하지 않습니다.</div>')+'</section></div>'+
 '<section class="panel" style="margin-top:16px"><h2>영상별 성장 기여도</h2><div style="overflow:auto"><table class="table"><thead><tr><th>영상</th><th>형식</th><th class="right">조회수</th><th class="right">평균 시청률</th><th class="right">구독 순증</th><th class="right">1천뷰당 구독</th></tr></thead><tbody>'+d.topVideos.map(v=>'<tr><td>'+esc(v.title)+'</td><td>'+tag(v.creatorContentType==='SHORTS'?'쇼츠':'롱폼')+'</td><td class="right">'+fmt.format(v.views||0)+'</td><td class="right">'+Number(v.averageViewPercentage||0).toFixed(1)+'%</td><td class="right">'+fmt.format(v.subscriberNet||0)+'</td><td class="right">'+Number(v.subscribersPerThousandViews||0).toFixed(1)+'</td></tr>').join('')+'</tbody></table></div></section>'+
 '<section class="panel" style="margin-top:16px"><h2>영상 자동 분류</h2><p class="muted">새 영상은 자동으로 제안합니다. 시즌제가 아닌 과거·실험 영상도 별도로 구분하며, 직접 확정한 값은 다시 변경하지 않습니다.</p><div style="overflow:auto"><table class="table"><thead><tr><th>영상</th><th>콘텐츠 유형</th><th>시즌</th><th>EP</th><th>역할</th><th>판정</th></tr></thead><tbody>'+classificationRows+'</tbody></table></div></section>';
}
async function saveClassification(button){const row=button.closest('tr');const state=row.querySelector('.save-state');button.disabled=true;state.textContent='저장 중';try{const response=await fetch('/api/classification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoId:row.dataset.video,category:row.querySelector('.category').value,season:Number(row.querySelector('.season').value),episode:Number(row.querySelector('.episode').value),role:row.querySelector('.role').value})});const result=await response.json();if(!response.ok)throw new Error(result.error||'저장하지 못했습니다.');state.textContent='직접 확정'}catch(error){state.textContent=error.message}finally{button.disabled=false}}
async function saveReach(button){const card=button.closest('.thumb-card');const state=card.querySelector('.reach-state');button.disabled=true;state.textContent='저장 중';try{const response=await fetch('/api/video-reach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({packageId:card.dataset.package,videoId:card.querySelector('.reach-video').value.trim(),window:card.querySelector('.reach-window').value,impressions:card.querySelector('.reach-impressions').value,ctr:card.querySelector('.reach-ctr').value})});const result=await response.json();if(!response.ok)throw new Error(result.error||'저장하지 못했습니다.');state.textContent='저장 완료';setTimeout(load,500)}catch(error){state.textContent=error.message}finally{button.disabled=false}}
function parseCsv(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i],next=text[i+1];if(c==='"'){if(quoted&&next==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\\n'||c==='\\r')&&!quoted){if(c==='\\r'&&next==='\\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=c}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows}
const cleanHeader=(s)=>String(s||'').replace(/^\uFEFF/,'').toLowerCase().replace(/[\\s_()%·.\-/]/g,'');
function columnIndex(headers,aliases){const normalized=headers.map(cleanHeader);const exact=normalized.findIndex(h=>aliases.some(a=>h===a));return exact>=0?exact:normalized.findIndex(h=>aliases.some(a=>h.includes(a)))}
function numeric(value,percent=false){const raw=String(value??'').trim(),hadPercent=raw.includes('%');let s=raw.replace(/,/g,'').replace(/%/g,'');if(!s||s==='—'||s==='-')return null;const n=Number(s);if(!Number.isFinite(n))return null;return percent&&!hadPercent&&n>0&&n<=1?Math.round(n*10000)/100:n}
async function importStudioCsv(){const file=document.querySelector('#studio-csv')?.files?.[0],state=document.querySelector('#csv-state'),button=document.querySelector('#import-csv');if(!file){state.textContent='먼저 YouTube Studio에서 내려받은 CSV를 선택하세요.';return}button.disabled=true;state.textContent='CSV 확인 중...';try{const rows=parseCsv(await file.text());if(rows.length<2)throw new Error('CSV에 데이터 행이 없습니다.');const headers=rows[0];const videoIndex=columnIndex(headers,['videoid','영상id','콘텐츠id','content','콘텐츠']);const titleIndex=columnIndex(headers,['videotitle','영상제목','contenttitle','title','제목']);const impressionsIndex=columnIndex(headers,['impressions','노출수','노출']);const ctrIndex=columnIndex(headers,['impressionsclickthroughrate','impressionclickthroughrate','노출클릭률','노출수클릭률','ctr']);if(videoIndex<0&&titleIndex<0)throw new Error('영상 ID 또는 제목 열을 찾지 못했습니다.');if(impressionsIndex<0||ctrIndex<0)throw new Error('노출수 또는 노출 클릭률(CTR) 열을 찾지 못했습니다.');const entries=rows.slice(1).map(r=>({videoId:videoIndex>=0?String(r[videoIndex]||'').trim():'',title:titleIndex>=0?String(r[titleIndex]||'').trim():'',impressions:numeric(r[impressionsIndex]),ctr:numeric(r[ctrIndex],true)})).filter(x=>x.videoId||x.title);const target=document.querySelector('#csv-target'),targetVideoId=target.value,targetPackageId=target.selectedOptions[0]?.dataset.package||'';const response=await fetch('/api/video-reach/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({window:document.querySelector('#csv-window').value,fileName:file.name,targetVideoId,targetPackageId,entries})});const result=await response.json();if(!response.ok)throw new Error(result.error||'CSV를 가져오지 못했습니다.');state.textContent='저장 '+result.saved+'개 · 건너뜀 '+result.skipped.length+'개'+(result.skipped.length?'\\n건너뜀: '+result.skipped.slice(0,8).map(x=>(x.title||x.videoId||'행')+' ('+x.reason+')').join(' / '):'');setTimeout(load,1200)}catch(error){state.textContent=error.message}finally{button.disabled=false}}
app.addEventListener('click',(event)=>{const classification=event.target.closest('.save-classification');if(classification)saveClassification(classification);const reach=event.target.closest('.save-reach');if(reach)saveReach(reach);if(event.target.closest('#import-csv'))importStudioCsv()});
refresh.addEventListener('click',load);load();
</script></body></html>`;

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `localhost:${port}`}`);
    if (url.pathname === '/') {
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(page);
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
      if (!accessToken) return json(res, 401, {error: 'YouTube 채널 연결이 필요합니다.'});
      return json(res, 200, await getDashboard(accessToken));
    }
    if (url.pathname === '/api/catalog') {
      const catalog = await loadJson(catalogPath);
      if (!catalog) return json(res, 404, {error: '저장된 YouTube 카탈로그가 없습니다. 먼저 /api/sync를 실행하세요.'});
      return json(res, 200, catalog);
    }
    if (url.pathname === '/api/catalog/related') {
      const catalog = await loadJson(catalogPath);
      if (!catalog) return json(res, 404, {error: '저장된 YouTube 카탈로그가 없습니다. 먼저 /api/sync를 실행하세요.'});
      const season = Number(url.searchParams.get('season'));
      const episode = Number(url.searchParams.get('episode'));
      const role = url.searchParams.get('role');
      const videos = catalog.videos.filter((video) => {
        const classification = video.classification || {};
        return (!season || classification.season === season)
          && (!episode || classification.episode === episode)
          && (!role || classification.role === role);
      });
      return json(res, 200, {syncedAt: catalog.syncedAt, count: videos.length, videos});
    }
    if (url.pathname === '/api/snapshot/latest') {
      const snapshot = await loadJson(latestSnapshotPath);
      if (!snapshot) return json(res, 404, {error: '저장된 분석 스냅샷이 없습니다. 먼저 /api/sync를 실행하세요.'});
      return json(res, 200, snapshot);
    }
    if (url.pathname === '/api/evaluations/48h') {
      const evaluations = await loadJson(evaluationsPath);
      if (!evaluations) return json(res, 404, {error: '저장된 48시간 판정 결과가 없습니다. 먼저 데이터를 새로고침하세요.'});
      return json(res, 200, evaluations);
    }
    if (url.pathname === '/api/recommendations/channel-c') {
      const snapshot = await loadJson(latestSnapshotPath);
      if (!snapshot) return json(res, 404, {error: '저장된 분석 데이터가 없습니다. 먼저 데이터를 새로고침하세요.'});
      return json(res, 200, {syncedAt: snapshot.syncedAt, recommendations: snapshot.channelCRecommendations || []});
    }
    if (url.pathname === '/api/comments') {
      const comments = await loadJson(commentsPath);
      if (!comments) return json(res, 404, {error: '저장된 댓글 데이터가 없습니다. 먼저 /api/sync를 실행하세요.'});
      const videoId = url.searchParams.get('videoId');
      if (!videoId) return json(res, 200, comments);
      const rows = comments.commentsByVideo?.[videoId] || [];
      return json(res, 200, {syncedAt: comments.syncedAt, videoId, count: rows.length, comments: rows});
    }
    if (url.pathname === '/api/package-image') {
      const id = String(url.searchParams.get('id') || '');
      const registry = await loadJson(packagingRegistryPath);
      const item = registry?.items?.find((entry) => entry.id === id);
      if (!item?.thumbnailPath || !/^output[\\/]/.test(item.thumbnailPath) || item.thumbnailPath.includes('..')) return json(res, 404, {error: '등록된 로컬 썸네일이 없습니다.'});
      const filePath = resolve(projectDir, item.thumbnailPath);
      if (!existsSync(filePath)) return json(res, 404, {error: '썸네일 파일을 찾지 못했습니다.'});
      const image = await readFile(filePath);
      res.writeHead(200, {'Content-Type': 'image/png', 'Cache-Control': 'no-store'});
      res.end(image);
      return;
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
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return json(res, 400, {error: '업로드 후 생성된 11자리 YouTube 영상 ID가 필요합니다.'});
      if (impressions !== null && (!Number.isFinite(impressions) || impressions < 0)) return json(res, 400, {error: '노출수가 올바르지 않습니다.'});
      if (ctr !== null && (!Number.isFinite(ctr) || ctr < 0 || ctr > 100)) return json(res, 400, {error: 'CTR은 0~100 사이여야 합니다.'});
      const packages = await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
      let packageItem = packages.items.find((entry) => entry.id === packageId);
      if (packageItem) {
        packageItem.videoId = videoId;
        packageItem.activeFrom ||= new Date().toISOString();
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
    if (url.pathname === '/api/video-reach/import' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const window = String(body.window || '');
      const entries = Array.isArray(body.entries) ? body.entries.slice(0, 1000) : [];
      const targetVideoId = String(body.targetVideoId || '');
      const targetPackageId = String(body.targetPackageId || '');
      if (!['24h', '48h', '7d', '28d'].includes(window)) return json(res, 400, {error: '측정 시점이 올바르지 않습니다.'});
      if (!entries.length) return json(res, 400, {error: '가져올 CSV 데이터가 없습니다.'});
      const packages = await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
      const snapshot = await loadJson(latestSnapshotPath) || {videos: []};
      const knownVideos = [...(snapshot.recentVideos || []), ...(snapshot.videos || [])];
      const normalizeTitle = (value) => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
      const titleMatches = new Map();
      for (const item of [...knownVideos, ...packages.items]) {
        const title = normalizeTitle(item.title);
        const videoId = String(item.videoId || item.video || '');
        if (!title || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) continue;
        const list = titleMatches.get(title) || [];
        if (!list.includes(videoId)) list.push(videoId);
        titleMatches.set(title, list);
      }
      const reach = await loadJson(videoReachManualPath) || {schemaVersion: 1, videos: {}};
      const skipped = [];
      let saved = 0;
      for (const entry of entries) {
        let videoId = String(entry.videoId || '').trim();
        const isTotalRow = ['합계', 'total'].includes(normalizeTitle(entry.title || entry.videoId));
        if (isTotalRow && /^[A-Za-z0-9_-]{11}$/.test(targetVideoId)) videoId = targetVideoId;
        if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
          const matches = titleMatches.get(normalizeTitle(entry.title)) || [];
          if (matches.length !== 1) {
            skipped.push({title: entry.title || '', videoId: entry.videoId || '', reason: matches.length > 1 ? '제목 중복' : '영상 연결 실패'});
            continue;
          }
          [videoId] = matches;
        }
        const impressions = entry.impressions == null ? null : Number(entry.impressions);
        const ctr = entry.ctr == null ? null : Number(entry.ctr);
        if (impressions === null || ctr === null || !Number.isFinite(impressions) || impressions < 0 || !Number.isFinite(ctr) || ctr < 0 || ctr > 100) {
          skipped.push({title: entry.title || '', videoId, reason: '노출수/CTR 값 오류'});
          continue;
        }
        const packageItem = packages.items.find((item) => (targetPackageId && item.id === targetPackageId) || item.videoId === videoId || normalizeTitle(item.title) === normalizeTitle(entry.title));
        if (packageItem && !packageItem.videoId) packageItem.videoId = videoId;
        reach.videos[videoId] ||= {videoId, windows: {}};
        reach.videos[videoId].windows[window] = {impressions: Math.round(impressions), ctr, packageId: packageItem?.id || `youtube-${videoId}`, source: 'youtube-studio-csv', sourceFile: String(body.fileName || '').slice(0, 200), recordedAt: new Date().toISOString()};
        saved++;
      }
      const now = new Date().toISOString();
      reach.updatedAt = now;
      reach.lastCsvImport = {fileName: String(body.fileName || '').slice(0, 200), window, saved, skipped: skipped.length, importedAt: now};
      packages.updatedAt = now;
      await saveJson(videoReachManualPath, reach);
      await saveJson(packagingRegistryPath, packages);
      return json(res, 200, {ok: true, saved, skipped});
    }
    if (url.pathname === '/api/studio-import/scan' && (req.method === 'POST' || req.method === 'GET')) {
      const catalog = await loadJson(catalogPath) || {videos: []};
      const packages = await loadJson(packagingRegistryPath) || {schemaVersion: 1, items: []};
      const result = await scanStudioExportFolders(catalog.videos || [], packages);
      return json(res, 200, {ok: true, ...result});
    }
    if (url.pathname === '/api/sync' && (req.method === 'POST' || req.method === 'GET')) {
      const accessToken = await getAccessToken();
      if (!accessToken) return json(res, 401, {error: 'YouTube 채널 연결이 필요합니다.'});
      const dashboard = await getDashboard(accessToken);
      return json(res, 200, {ok: true, sync: dashboard.sync, channel: dashboard.channel});
    }
    if (url.pathname === '/api/classification' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const videoId = String(body.videoId || '');
      const category = String(body.category || 'SEASON');
      const season = Number(body.season);
      const episode = Number(body.episode);
      const role = String(body.role || '');
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) return json(res, 400, {error: '영상 ID가 올바르지 않습니다.'});
      if (!['SEASON', 'CHANNEL', 'LEGACY', 'EXPERIMENT', 'OTHER'].includes(category)) return json(res, 400, {error: '콘텐츠 유형이 올바르지 않습니다.'});
      if (category === 'SEASON' && ![1, 2].includes(season)) return json(res, 400, {error: '시즌은 1 또는 2여야 합니다.'});
      if (category === 'SEASON' && (!Number.isInteger(episode) || episode < 1 || episode > 99)) return json(res, 400, {error: 'EP 번호가 올바르지 않습니다.'});
      if (!['LONG', 'A', 'B', 'C', 'STANDALONE_SHORT', 'STANDALONE_LONG'].includes(role)) return json(res, 400, {error: '역할이 올바르지 않습니다.'});
      const map = await loadVideoMap();
      if (category === 'CHANNEL' && role !== 'C') return json(res, 400, {error: '채널 공통 콘텐츠는 쇼츠 C 역할로 저장해야 합니다.'});
      if (category === 'SEASON' && role === 'C') return json(res, 400, {error: '쇼츠 C는 시즌·EP가 아닌 채널 공통 콘텐츠입니다.'});
      map[videoId] = {category, season: category === 'SEASON' ? season : null, episode: category === 'SEASON' ? episode : null, role, source: 'manual', updatedAt: new Date().toISOString()};
      await saveVideoMap(map);
      const catalog = await loadJson(catalogPath);
      if (catalog) {
        const video = catalog.videos.find((item) => item.videoId === videoId);
        if (video) {
          video.classification = map[videoId];
          catalog.updatedAt = new Date().toISOString();
          await saveJson(catalogPath, catalog);
        }
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

server.listen(port, '127.0.0.1', () => {
  console.log(`YouTube Channel Lab: http://localhost:${port}`);
  console.log(`OAuth callback: ${redirectUri}`);
  if (requiredMissing.length) console.log(`Missing env: ${requiredMissing.join(', ')}`);
});
