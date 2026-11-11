// 우리 영상이 공개 뒤 통했는지 판정하고, 그 영상을 기획할 때 쓴 근거(경쟁 영상·시청자 고민)와 묶는다.
// 대시보드 "기획 근거 성적표" 탭과 경쟁 채널 라이프사이클(competitor-lifecycle.mjs)이 이 판정 하나를 같이 쓴다.
//
// 원칙(AGENTS.md "자동화 우선 원칙", 2026-11-11):
//   - 원천 경쟁 채널은 BRIEF.md "기획 근거" 칸에서만 읽는다. 제목 단어가 겹치는지로 짐작하지 않는다.
//   - 비교 숫자는 "공개 후 첫 7일 조회수"(유튜브 분석 API, data/youtube/views-7d.json)다.
//     누적 조회수를 공개 후 날수로 나눈 일평균은 쓰지 않는다 — 쇼츠는 처음 며칠에 조회가 몰려서
//     오래된 영상일수록 일평균이 낮아지고, 새 영상이 늘 "잘된 것"처럼 보인다.
//   - 노출 수는 쓰지 않는다. 유튜브 API가 주지 않아 사람이 스튜디오에서 내보내야 하는 값이라
//     자동 루프가 그 손에 매인다(최근 쇼츠는 노출 기록이 아예 없었다).
//   - 표본이 작으면 판정하지 않고 "보류"로 둔다. 출발값(2026-11-11):
//       그 영상 7일 조회 100회 미만 → 보류 (열 명 남짓 차이로 배수가 크게 뒤집히지 않는 선)
//       같은 형식 최근 3편 7일 조회 중앙값 300회 미만 → 작은 표본, 보류
//     지금 롱폼(편당 5~10회)은 보류, 쇼츠(편당 400~1,100회)는 판정이 나온다.

import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

export const MIN_VIEWS_7D = 100;
export const SMALL_SAMPLE_VIEWS_7D = 300;
export const WORKED_RATIO = 1.5;
export const FAILED_RATIO = 0.5;
export const VIEWS_7D_READY_DAYS = 10; // 7일 + 유튜브 분석 집계가 2~3일 늦게 들어오는 몫
const BASELINE_COUNT = 10; // 같은 형식 최근 몇 편의 7일 조회 중앙값을 기준으로 삼을지
const DAY_MS = 24 * 60 * 60 * 1000;

const median = (values) => {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const round1 = (n) => Math.round(n * 10) / 10;
const isPublic = (v) => v?.privacyStatus == null || v.privacyStatus === 'public';

/**
 * BRIEF.md의 "## 기획 근거" 절만 읽는다. 절이 없으면 null(근거 기록 없음).
 * @param {string} markdown
 */
export function parsePlanningSources(markdown = '') {
  const lines = String(markdown).replace(/^﻿/, '').split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+기획 근거\s*$/.test(line.trim()));
  if (start === -1) return null;
  const section = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}\s/.test(line)) break;
    section.push(line);
  }
  const valueOf = (label) => section
    .map((line) => line.match(new RegExp(`^\\s*-\\s*${label}:\\s*(.+)$`)))
    .filter(Boolean)
    .map((m) => m[1].trim());

  const topicRaw = valueOf('소재 이력 topic')[0] || null;
  const topic = topicRaw ? topicRaw.replace(/^"(.*)"$/, '$1') : null;

  const competitors = valueOf('경쟁 영상')
    .map((text) => text.match(/^(.+?)\s*\((UC[\w-]{22})\)\s*·\s*([\w-]{11})\s*·.*?평소 대비\s*([\d.]+)\s*배/))
    .filter(Boolean)
    .map((m) => ({channelTitle: m[1].trim(), channelId: m[2], videoId: m[3], sourceRatio: Number(m[4])}));

  const audienceRaw = valueOf('시청자 고민')[0] || '';
  const audienceMatch = audienceRaw.match(/^"(.+?)"/);
  const audience = audienceMatch ? audienceMatch[1] : null;

  return {topic, competitors, audience};
}

/**
 * 한 편의 판정. verdict: pending(7일 조회 집계 전) | hold(표본 부족·기준 없음) | worked | neutral | failed
 */
export function judgeOutcome({views7d, sampleMedianViews7d, baselineViews7d}) {
  if (views7d == null || !Number.isFinite(Number(views7d))) {
    return {verdict: 'pending', ratio: null, reason: '7일 조회 집계 전(공개 10일 뒤 자동으로 받음)'};
  }
  // 판정은 반올림 전 값으로 한다(0.49배가 0.5배로 올라가 "안 통함"을 비껴가지 않게). 보여 줄 값만 반올림.
  const rawRatio = baselineViews7d > 0 ? views7d / baselineViews7d : null;
  const ratio = rawRatio == null ? null : round1(rawRatio);
  if (views7d < MIN_VIEWS_7D) {
    return {verdict: 'hold', ratio, reason: `7일 조회 ${views7d}회 — ${MIN_VIEWS_7D}회 미만이라 운과 실력을 가릴 수 없음`};
  }
  if (sampleMedianViews7d == null || sampleMedianViews7d < SMALL_SAMPLE_VIEWS_7D) {
    return {verdict: 'hold', ratio, reason: `작은 표본 — 같은 형식 최근 3편 7일 조회 중앙값 ${sampleMedianViews7d ?? '없음'}회(${SMALL_SAMPLE_VIEWS_7D}회 미만), 배수는 참고만`};
  }
  if (rawRatio == null) return {verdict: 'hold', ratio: null, reason: '비교할 같은 형식 영상 없음'};
  const why = `7일 조회 ${views7d}회, 같은 형식 중앙값 ${baselineViews7d}회의 ${ratio}배`;
  if (rawRatio >= WORKED_RATIO) return {verdict: 'worked', ratio, reason: why};
  if (rawRatio < FAILED_RATIO) return {verdict: 'failed', ratio, reason: why};
  return {verdict: 'neutral', ratio, reason: why};
}

/** 유튜브 분석 API 날짜는 태평양 시간 기준이다. 공개일부터 7일(공개일 포함). */
export function sevenDayWindow(publishedAt) {
  const pt = (d) => d.toLocaleDateString('en-CA', {timeZone: 'America/Los_Angeles'});
  const start = new Date(publishedAt);
  return {startDate: pt(start), endDate: pt(new Date(start.getTime() + 6 * DAY_MS))};
}

/** 7일 조회를 아직 안 받은, 공개 10일이 지난 공개 영상. */
export function videosNeedingViews7d(catalogVideos = [], views7dStore = {}, now = new Date()) {
  return catalogVideos.filter((v) => v?.videoId && v.publishedAt && isPublic(v)
    && views7dStore[v.videoId]?.views7d == null
    && (now.getTime() - new Date(v.publishedAt).getTime()) / DAY_MS >= VIEWS_7D_READY_DAYS);
}

/**
 * @param {{episodes: Array<{slug:string,label:string,videoId:string|null,format:string,sources:ReturnType<typeof parsePlanningSources>}>,
 *          catalogVideos: object[], views7d: Record<string, {views7d:number}>, now?: Date}} params
 */
export function buildEpisodeOutcomes({episodes = [], catalogVideos = [], views7d = {}, now = new Date()}) {
  const v7 = (v) => {
    const n = views7d[v.videoId]?.views7d;
    return n == null ? null : Number(n);
  };
  // 예약만 걸린 영상은 카탈로그에 privacyStatus 'private' + 올린 날짜가 publishedAt으로 들어 있다.
  // 이걸 공개로 치면 공개 전에 판정되고 "최근 3편" 표본도 비게 된다(2026-11-11 발견).
  const live = catalogVideos
    .filter((v) => v?.videoId && v.publishedAt && isPublic(v) && new Date(v.publishedAt) <= now)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));

  return episodes.map((ep) => {
    const video = live.find((v) => v.videoId === ep.videoId) || null;
    const base = {slug: ep.slug, label: ep.label, videoId: ep.videoId || null, format: ep.format, sources: ep.sources || null};
    if (!video) return {...base, verdict: 'pending', ratio: null, reason: '아직 공개 전이거나 동기화 전'};

    const format = video.format || ep.format;
    const measured = live.filter((v) => v.format === format && v7(v) != null);
    const baselineViews7d = median(measured.filter((v) => v.videoId !== video.videoId).slice(0, BASELINE_COUNT).map(v7));
    const sampleMedianViews7d = median(measured.slice(0, 3).map(v7));
    const judged = judgeOutcome({views7d: v7(video), sampleMedianViews7d, baselineViews7d});
    return {
      ...base,
      title: video.title,
      publishedAt: video.publishedAt,
      ageDays: round1((now.getTime() - new Date(video.publishedAt).getTime()) / DAY_MS),
      views: Number(video.statistics?.viewCount) || 0,
      views7d: v7(video),
      baselineViews7d,
      sampleMedianViews7d,
      ...judged,
    };
  });
}

const readJson = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')); } catch { return fallback; }
};

export const views7dPath = (projectDir) => join(projectDir, 'data', 'youtube', 'views-7d.json');

/** output/upload-packages 와 videos/<slug>/BRIEF.md, views-7d.json 을 읽어 편 목록을 만든 뒤 판정한다. */
export function loadEpisodeOutcomes(projectDir, now = new Date()) {
  const packagesDir = join(projectDir, 'output', 'upload-packages');
  const episodes = (existsSync(packagesDir) ? readdirSync(packagesDir, {withFileTypes: true}) : [])
    .filter((d) => d.isDirectory())
    .map((d) => {
      const isShorts = existsSync(join(packagesDir, d.name, 'shorts-status.json'));
      const status = readJson(join(packagesDir, d.name, isShorts ? 'shorts-status.json' : 'status.json'), null);
      if (!status?.videoId) return null;
      const slug = d.name.replace(/-longform$/, '');
      const briefPath = join(projectDir, 'videos', slug, 'BRIEF.md');
      const label = (slug.match(/^ep(\d+)/i) || [])[1];
      return {
        slug,
        label: label ? `EP${label}${isShorts ? ' 쇼츠' : ''}` : slug,
        videoId: status.videoId,
        format: isShorts ? 'SHORTS' : 'LONGFORM',
        sources: existsSync(briefPath) ? parsePlanningSources(readFileSync(briefPath, 'utf8')) : null,
      };
    })
    .filter(Boolean);
  const catalog = readJson(join(projectDir, 'data', 'youtube', 'catalog.json'), {videos: []});
  const store = readJson(views7dPath(projectDir), {videos: {}});
  return buildEpisodeOutcomes({
    episodes,
    catalogVideos: Array.isArray(catalog?.videos) ? catalog.videos : (Array.isArray(catalog) ? catalog : []),
    views7d: store.videos || {},
    now,
  });
}
