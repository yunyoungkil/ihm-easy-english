// 자동 성장 루프의 "화재경보기" (2026-11-11 사용자 요청).
// 프로그램 전체를 매번 사람이(또는 Claude가) 읽어 점검하면 비용이 너무 크다. 대신 코드가 매일 새벽 루프에서
// 테스트·화면 검사를 돌려 기록하고(scripts/daily-loop.mjs), 브리핑 때 이 파일이 그 기록과 데이터 신선도를
// 짧게 판정한다. 정상이면 브리핑 한 줄, 문제가 있으면 Claude가 브리핑 직후 그 부분만 열어 고치고 알린다.

import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadEpisodeOutcomes, parsePlanningSources, views7dPath} from './planning-outcome.mjs';

const H = 3600 * 1000;
const D = 24 * H;
export const LIMITS = Object.freeze({loopHours: 36, syncHours: 36, views7dDays: 12, audienceDays: 21, competitorDays: 10});
export const RESEARCH_LIMIT_DAYS = 3; // allow-literal: 설계 2절 제안 값(research-stale·research-thin)
export const SOURCES_REQUIRED_FROM_EP = 30; // 기획 근거 칸 규칙(2026-11-11)이 처음 적용되는 편

const ageMs = (iso, now) => (iso && Number.isFinite(new Date(iso).getTime()) ? now - new Date(iso) : Infinity);

/** 순수 판정. problems: [{id, text}] — text는 브리핑에 그대로 쓰는 쉬운 말. */
export function checkLoopHealth({
  now = new Date(), dailyLoop = null, analyticsSyncedAt = null, catalogVideos = [], views7d = {},
  audienceDnaUpdatedAt = null, competitorsAnalyzedAt = null, episodeOutcomes = [], successPatternIds = [],
  episodesMissingSources = [], nextInputGeneratedAt = undefined, episodesMissingInputRef = [], oldReportFiles = 0, studioResearch = null,
}) {
  const problems = [];
  const add = (id, text) => problems.push({id, text});

  const loopAge = ageMs(dailyLoop?.finishedAt, now);
  if (loopAge > LIMITS.loopHours * H) {
    add('loop-ran', dailyLoop ? `매일 루프가 ${Math.round(loopAge / H)}시간째 안 돌았다(작업 스케줄러 IHM-Daily-Growth-Loop 확인)` : '매일 루프 실행 기록이 없다(data/youtube/daily-loop.json)');
  } else {
    const failed = Object.entries(dailyLoop.steps || {}).filter(([, s]) => s && s.ok === false);
    if (failed.length) add('loop-step', `매일 루프 실패 단계: ${failed.map(([name, s]) => `${name}(${String(s.error || '').slice(0, 80)})`).join(', ')}`);
  }

  if (ageMs(analyticsSyncedAt, now) > LIMITS.syncHours * H) add('sync-stale', `유튜브 동기화가 ${Number.isFinite(ageMs(analyticsSyncedAt, now)) ? Math.round(ageMs(analyticsSyncedAt, now) / H) + '시간' : '한 번도'} 안 됐다`);

  const gap = catalogVideos.filter((v) => v?.videoId && (v.privacyStatus == null || v.privacyStatus === 'public')
    && ageMs(v.publishedAt, now) >= LIMITS.views7dDays * D && views7d[v.videoId]?.views7d == null);
  if (gap.length) add('views7d-gap', `공개 ${LIMITS.views7dDays}일이 지났는데 첫 7일 조회를 못 받은 영상 ${gap.length}편`);

  if (ageMs(audienceDnaUpdatedAt, now) > LIMITS.audienceDays * D) add('audience-stale', `시청자 고민(audience-dna) 갱신이 ${LIMITS.audienceDays}일보다 오래됐다`);
  if (ageMs(competitorsAnalyzedAt, now) > LIMITS.competitorDays * D) add('competitors-stale', `경쟁 채널 데이터가 ${LIMITS.competitorDays}일보다 오래됐다`);

  const known = new Set(successPatternIds);
  const unrecorded = episodeOutcomes.filter((o) => o.verdict === 'worked' && o.videoId && !known.has(o.videoId));
  if (unrecorded.length) add('pattern-gap', `"통함" 판정이 났는데 통한 요소 기록에 기록이 없다: ${unrecorded.map((o) => `${o.label} ${o.ratio}배`).join(', ')}`);

  if (episodesMissingSources.length) add('brief-sources', `BRIEF.md "기획 근거" 칸이 없는 새 편: ${episodesMissingSources.join(', ')}`);

  // 모은 데이터가 기획으로 이어지는 통로(2026-11-12): 매일 루프가 입력 파일을 만들고, 새 편 기획 근거가 그 파일을 인용한다.
  if (nextInputGeneratedAt !== undefined && ageMs(nextInputGeneratedAt, now) > LIMITS.loopHours * H) {
    add('next-input-stale', nextInputGeneratedAt
      ? `다음 기획 입력 파일이 ${Math.round(ageMs(nextInputGeneratedAt, now) / H)}시간째 새로 안 만들어졌다(npm run next-input)`
      : '다음 기획 입력 파일(data/youtube/next-episode-input.md)이 없다(npm run next-input)');
  }
  // 2026-11-12 사용자 결정: 합친 아웃라이어 리포트가 예전 댓글·대본 리포트 영상을 다 따라잡으면 예전 코드와 파일을 지운다.
  // 사람이 기억할 일로 남기지 않고, 따라잡은 날 브리핑에 뜨게 한다(브리핑 직후 Claude가 지운다).
  if (dailyLoop?.outlierReportCatchUp === 0 && oldReportFiles > 0) {
    add('old-reports-done', `합친 리포트가 예전 리포트 영상을 다 따라잡았다 — 예전 댓글·대본 리포트 코드와 파일 ${oldReportFiles}개를 지울 차례(knowledge/now.md 계획)`);
  }
  if (episodesMissingInputRef.length) add('brief-input', `BRIEF.md 기획 근거에 "다음 기획 입력" 인용이 없는 새 편: ${episodesMissingInputRef.join(', ')}`);

  // 스튜디오 조사 목록 수집(2026-11-14 설계 2절). 파일이 아직 없으면(첫 수집 전) 고장으로 치지 않는다.
  if (studioResearch) {
    if (ageMs(studioResearch.updatedAt, now) > RESEARCH_LIMIT_DAYS * D) add('research-stale', `스튜디오 조사 목록 후보(studio-research.json)가 ${RESEARCH_LIMIT_DAYS}일 넘게 갱신되지 않았다(npm run studio-research)`);
    const runs = Array.isArray(studioResearch.runs) ? studioResearch.runs : [];
    const thin = ['LONGFORM', 'SHORTS'].filter((format) => {
      const days = [...new Set(runs.filter((r) => r.format === format).map((r) => r.date))].sort().slice(-RESEARCH_LIMIT_DAYS);
      if (days.length < RESEARCH_LIMIT_DAYS) return false;
      return days.every((d) => runs.filter((r) => r.format === format && r.date === d).every((r) => !(r.passed > 0)));
    });
    if (thin.length) add('research-thin', `스튜디오 조사 목록에서 ${thin.join('·')} 통과 후보가 ${RESEARCH_LIMIT_DAYS}일 연속 0편이다(화면이 바뀌었는지 확인)`);
  }

  return {ok: problems.length === 0, problems, lastLoopAt: dailyLoop?.finishedAt || null};
}

const readJson = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')); } catch { return fallback; }
};

/** 파일에서 재료를 모아 판정한다(브리핑 growth-check가 부른다). */
export function loadLoopHealth(projectDir, now = new Date()) {
  const dataDir = join(projectDir, 'data', 'youtube');
  const catalog = readJson(join(dataDir, 'catalog.json'), {videos: []});
  const md = readJson(join(dataDir, 'market-demand.json'), {});
  const patterns = readJson(join(dataDir, 'success-patterns.json'), {entries: []});
  const videosDir = join(projectDir, 'videos');
  const newBriefs = existsSync(videosDir)
    ? readdirSync(videosDir, {withFileTypes: true}).filter((d) => d.isDirectory()).map((d) => d.name)
      .filter((slug) => Number((slug.match(/^ep(\d+)/i) || [])[1]) >= SOURCES_REQUIRED_FROM_EP && existsSync(join(videosDir, slug, 'BRIEF.md')))
      .map((slug) => ({slug, sources: parsePlanningSources(readFileSync(join(videosDir, slug, 'BRIEF.md'), 'utf8'))}))
    : [];
  const episodesMissingSources = newBriefs.filter((b) => b.sources == null).map((b) => b.slug);
  const episodesMissingInputRef = newBriefs.filter((b) => b.sources != null && !b.sources.inputRef).map((b) => b.slug);
  let nextInputGeneratedAt = null;
  try {
    nextInputGeneratedAt = (readFileSync(join(dataDir, 'next-episode-input.md'), 'utf8').match(/^만든 때: (\S+)/m) || [])[1] || null;
  } catch { /* 파일이 없으면 null로 두고 문제로 알린다 */ }
  return checkLoopHealth({
    now,
    dailyLoop: readJson(join(dataDir, 'daily-loop.json'), null),
    analyticsSyncedAt: readJson(join(dataDir, 'analytics-latest.json'), {}).syncedAt || null,
    catalogVideos: catalog.videos || [],
    views7d: readJson(views7dPath(projectDir), {videos: {}}).videos || {},
    audienceDnaUpdatedAt: readJson(join(dataDir, 'audience-dna.json'), {}).updatedAt || null,
    competitorsAnalyzedAt: (md.trackedChannels || []).map((c) => c.analyzedAt).filter(Boolean).sort()[0] || null,
    episodeOutcomes: loadEpisodeOutcomes(projectDir, now),
    successPatternIds: (patterns.entries || []).map((e) => e.videoId || e.id).filter(Boolean),
    episodesMissingSources,
    nextInputGeneratedAt,
    episodesMissingInputRef,
    studioResearch: readJson(join(dataDir, 'studio-research.json'), null),
    oldReportFiles: ['outlier-comments', 'script-insights'].reduce((n, dir) => n + (existsSync(join(dataDir, dir)) ? readdirSync(join(dataDir, dir)).length : 0), 0),
  });
}
