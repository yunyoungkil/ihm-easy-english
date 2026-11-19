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

/**
 * 현재 워크플로우 루프의 실제 데이터·상태를 점검해 가장 먼저 살필 1가지 문제점과 수정·업그레이드 방안을 돌려준다(2026-11-19 사용자 요청).
 * 순수 함수(테스트 가능). 실제 수치가 없으면 꾸며내지 않고 있는 그대로 보고한다.
 * @returns {{area: string, severity: 'urgent'|'upgrade'|'healthy', finding: string, proposal: string, candidateCount: number}}
 */
export function diagnoseWorkflowLoop({
  now = new Date(),
  loopHealth = null,
  dailyLoop = null,
  studioResearch = null,
  koreanTrends = null,
  outlierReports = [],
  transformSheets = [],
} = {}) {
  // 1순위: 자동 루프에 실제 고장·누락이 있으면 그 첫 번째 문제를 바로 진단한다.
  if (loopHealth && loopHealth.ok === false && Array.isArray(loopHealth.problems) && loopHealth.problems.length) {
    const p = loopHealth.problems[0];
    return {
      area: `자동 루프(${p.id})`,
      severity: 'urgent',
      finding: p.text,
      proposal: '브리핑 직후 해당 단계 로그와 원인을 열어 수정하고 단위 테스트·다음 주기 재소비까지 검증',
      candidateCount: loopHealth.problems.length,
    };
  }

  // 2순위: 고장이 없으면 실제 데이터에서 관측된 루프 업그레이드 후보들을 모으고, 날짜 기준으로 하루 1건씩 돌아가며 제시한다.
  const candidates = [];

  // (a) 스튜디오 조사 목록 2단계 전환 준비도
  if (studioResearch) {
    const okDays = [...new Set((studioResearch.runs || []).map((r) => r.date).filter(Boolean))].length;
    const candCount = Object.keys(studioResearch.candidates || {}).length;
    const catchUp = dailyLoop?.outlierReportCatchUp;
    if (okDays > 0) {
      candidates.push({
        area: '조사 데이터 → 리포트 대상 전환',
        severity: 'upgrade',
        finding: `스튜디오 조사 1단계 ${okDays}일치(유효 후보 ${candCount}편) 수집됐으나 리포트 선정은 아직 옛 손입력 목록 기준(따라잡기 남은 편수 ${catchUp ?? '확인 전'})`,
        proposal: catchUp === 0 && okDays >= 6
          ? '설계 조건(6일+ 수집·따라잡기 0편)이 충족됐으니 pickReportTargets 2단계(조사 후보 우선) 전환을 착수'
          : '설계 기준(7일 중 6일 ok·따라잡기 0편) 도달 시 2단계로 전환해 노이즈가 많은 옛 손입력 목록 의존을 축소',
      });
    }
  }

  // (b) 아웃라이어 리포트 옛 방식 배수·미판정 비중
  if (outlierReports.length) {
    const legacy = outlierReports.filter((r) => r?.ratioMethod == null).length;
    const unjudged = outlierReports.filter((r) => r?.analysis?.teachesAdultEnglishSounds == null).length;
    if (legacy > 0) {
      candidates.push({
        area: '배율 일관성(아웃라이어 리포트)',
        severity: 'upgrade',
        finding: `저장된 리포트 ${outlierReports.length}편 중 ${legacy}편이 옛 방식 배수(ratioMethod 없음), ${unjudged}편이 성인 영어 소리 판정 미기입(null) 상태`,
        proposal: '옛 방식 리포트는 참고용으로 격리 유지하고, 실제 기획에 채택하는 영상부터 v2 배수(peer-ratio)와 적합성 판정을 우선 재확인',
      });
    }
  }

  // (c) 비교 시트 → 공개 성과 환류 공백
  const approvedSheets = transformSheets.filter((s) => s?.status === 'approved');
  const measuredSheets = transformSheets.filter((s) => Array.isArray(s?.results) && s.results.length > 0);
  if (approvedSheets.length > 0 && measuredSheets.length === 0) {
    candidates.push({
      area: '비교 시트 → 성과 학습 환류',
      severity: 'upgrade',
      finding: `승인된 비교 시트 ${approvedSheets.length}장이 있으나 7일 성과가 정산된 시트가 아직 0장이라 시험 변수별 근거 묶음이 비어 있음`,
      proposal: '공개된 시트 영상의 첫 7일 지표가 들어오는 시점에 sheet-outcomes 정산 → next-episode-input 8·9절 환류가 실제 닫히는지 확인',
    });
  }

  // (d) 국내 실시간 트렌드 수집 상태
  if (!koreanTrends) {
    candidates.push({
      area: '국내 실시간 트렌드 레이더',
      severity: 'upgrade',
      finding: '국내 실시간 트렌드 파일(data/youtube/korean-trends.json)이 아직 수집되지 않아 기회 포착 레이더가 비어 있음',
      proposal: 'npm run korean-trends 실행으로 Google Trends KR + YouTube KR 인기 급상승을 수집해 next-episode-input 13절에 연결',
    });
  } else {
    const gt = koreanTrends.sources?.googleTrendsKr;
    const yt = koreanTrends.sources?.youtubePopularKr;
    if (gt?.ok === false || yt?.ok === false) {
      const broken = [gt?.ok === false ? `Google Trends(${gt.error || '오류'})` : null, yt?.ok === false ? `YouTube KR(${yt.error || '오류'})` : null].filter(Boolean).join(', ');
      candidates.push({
        area: '국내 실시간 트렌드 레이더',
        severity: 'upgrade',
        finding: `국내 트렌드 소스 일부 실패(${broken}) — 이전 수집 데이터로 임시 유지 중`,
        proposal: '실패 소스 응답·API 키 상태를 점검해 양쪽 소스가 모두 최신으로 갱신되도록 복구',
      });
    }
  }

  if (!candidates.length) {
    return {
      area: '워크플로우 루프 전반',
      severity: 'healthy',
      finding: '자동 루프·배율·트렌드·시트 연결에서 즉시 조치할 구조적 단절이 관측되지 않음',
      proposal: '다음 공개 영상의 7일 성과 정산과 비교 시트 적용 추적(appliedTo)이 실제 렌더 결과물과 일치하는지 점검',
      candidateCount: 0,
    };
  }

  const daySeed = Math.floor(new Date(now).getTime() / D);
  const picked = candidates[Math.abs(daySeed) % candidates.length];
  return {...picked, candidateCount: candidates.length};
}

/** 실제 디스크 파일을 읽어 브리핑용 워크플로우 루프 1건 진단을 만든다. */
export function loadWorkflowLoopDiagnosis(projectDir, now = new Date(), loopHealth = null) {
  const dataDir = join(projectDir, 'data', 'youtube');
  const readDirJsons = (dir) => (existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJson(join(dir, f), null)).filter(Boolean)
    : []);
  return diagnoseWorkflowLoop({
    now,
    loopHealth: loopHealth ?? loadLoopHealth(projectDir, now),
    dailyLoop: readJson(join(dataDir, 'daily-loop.json'), null),
    studioResearch: readJson(join(dataDir, 'studio-research.json'), null),
    koreanTrends: readJson(join(dataDir, 'korean-trends.json'), null),
    outlierReports: readDirJsons(join(dataDir, 'outlier-reports')),
    transformSheets: readDirJsons(join(dataDir, 'transform-sheets')),
  });
}
