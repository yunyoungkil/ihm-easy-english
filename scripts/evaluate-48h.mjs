import {readdir, readFile, writeFile, mkdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const contentDir = join(projectDir, 'content');
const snapshotPath = join(projectDir, 'data', 'youtube', 'analytics-latest.json');
const outputPath = join(projectDir, 'data', 'youtube', 'evaluations-48h.json');

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const listJson = async (dir) => {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, {withFileTypes: true});
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listJson(path) : entry.name.endsWith('.json') ? [path] : [];
  }));
  return nested.flat();
};

const number = (value) => Number(value || 0);
const addUtcDays = (iso, days) => {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const classify48h = ({metrics, comparisonMetrics, criteria}) => {
  const retention = number(metrics.averageViewPercentage);
  const comparisonRetention = number(comparisonMetrics?.averageViewPercentage);
  const minimum = number(criteria.minimumAverageViewPercentage || 60);
  const target = number(criteria.targetAverageViewPercentage || 70);
  const mustMatch = criteria.mustBeatOrMatchTrackA !== false;
  const matchesComparison = !mustMatch || !comparisonMetrics || retention >= comparisonRetention;

  if (retention < minimum) {
    return {decisionStatus: 'revise', label: '수정 필요', reason: `평균 시청률 ${retention.toFixed(1)}%로 최소 기준 ${minimum}% 미달`};
  }
  if (!matchesComparison) {
    return {decisionStatus: 'hold', label: '보류', reason: `유지율은 기준을 넘었지만 쇼츠 A ${comparisonRetention.toFixed(1)}%보다 낮음`};
  }
  if (retention >= target) {
    return {decisionStatus: 'strong-pass', label: '강한 통과', reason: `평균 시청률 ${retention.toFixed(1)}%로 목표 ${target}% 이상`};
  }
  return {decisionStatus: 'pass', label: '통과', reason: `평균 시청률 ${retention.toFixed(1)}%로 최소 기준 통과`};
};

export const build48hEvaluations = async ({snapshot, queryVideoWindow, now = new Date()}) => {
  const files = await listJson(contentDir);
  const packages = (await Promise.all(files.map(async (path) => ({path, data: await readJson(path)}))))
    .filter(({data}) => data.youtube?.videoId && data.evaluation?.successCriteria);
  const videos = new Map((snapshot.recentVideos || []).map((video) => [video.videoId, video]));
  const reportEnd = snapshot.range?.endDate || '';
  const results = [];

  for (const item of packages) {
    const {data} = item;
    const video = videos.get(data.youtube.videoId);
    if (!video?.publishedAt) continue;
    const eligibleAt = new Date(Date.parse(video.publishedAt) + 48 * 3600 * 1000);
    const window = {startDate: video.publishedAt.slice(0, 10), endDate: addUtcDays(video.publishedAt, 1)};
    const base = {
      contentId: data.contentId,
      videoId: data.youtube.videoId,
      title: data.youtube.title || video.title,
      publishedAt: video.publishedAt,
      eligibleAt: eligibleAt.toISOString(),
      measurementWindow: window,
      comparisonVideoId: data.evaluation.comparisonVideoId || null,
    };

    if (now < eligibleAt) {
      results.push({...base, decisionStatus: 'waiting-48h', label: '48시간 대기', reason: `${eligibleAt.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'})} 이후 판정`});
      continue;
    }
    if (!reportEnd || reportEnd < window.endDate) {
      results.push({...base, decisionStatus: 'waiting-data', label: '분석 데이터 대기', reason: `YouTube 분석 반영 대기 중 · 현재 ${reportEnd || '미확인'}, 필요 ${window.endDate}`});
      continue;
    }

    const metrics = await queryVideoWindow(data.youtube.videoId, window);
    if (!metrics || !Object.keys(metrics).length) {
      results.push({...base, decisionStatus: 'waiting-data', label: '분석 데이터 대기', reason: '48시간은 지났지만 영상별 YouTube Analytics 수치가 아직 반영되지 않음'});
      continue;
    }
    const comparison = data.evaluation.comparisonVideoId ? videos.get(data.evaluation.comparisonVideoId) : null;
    const comparisonWindow = comparison?.publishedAt
      ? {startDate: comparison.publishedAt.slice(0, 10), endDate: addUtcDays(comparison.publishedAt, 1)}
      : null;
    const comparisonMetrics = comparisonWindow
      ? await queryVideoWindow(data.evaluation.comparisonVideoId, comparisonWindow)
      : null;
    const decision = classify48h({metrics, comparisonMetrics, criteria: data.evaluation.successCriteria});
    const result = {...base, ...decision, evaluatedAt: now.toISOString(), metrics, comparisonMetrics};
    results.push(result);
    data.evaluation = {...data.evaluation, ...result};
    await writeFile(item.path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
  return {schemaVersion: 1, generatedAt: now.toISOString(), reportEndDate: reportEnd, evaluations: results};
};

const run = async () => {
  if (!existsSync(snapshotPath)) throw new Error('analytics-latest.json이 없습니다. 먼저 YouTube 데이터를 동기화하세요.');
  const snapshot = await readJson(snapshotPath);
  const top = new Map((snapshot.topVideos || []).map((row) => [row.video, row]));
  const result = await build48hEvaluations({
    snapshot,
    queryVideoWindow: async (videoId) => top.get(videoId) || {},
  });
  await mkdir(dirname(outputPath), {recursive: true});
  await writeFile(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(JSON.stringify(result, null, 2));
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
