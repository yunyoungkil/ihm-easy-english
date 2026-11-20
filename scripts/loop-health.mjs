// 자동 성장 루프의 "화재경보기" (2026-11-11 사용자 요청).
// 프로그램 전체를 매번 사람이(또는 Claude가) 읽어 점검하면 비용이 너무 크다. 대신 코드가 매일 새벽 루프에서
// 테스트·화면 검사를 돌려 기록하고(scripts/daily-loop.mjs), 브리핑 때 이 파일이 그 기록과 데이터 신선도를
// 짧게 판정한다. 정상이면 브리핑 한 줄, 문제가 있으면 Claude가 브리핑 직후 그 부분만 열어 고치고 알린다.

import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
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
  scheduledLoopEnabled = false,
}) {
  const problems = [];
  const add = (id, text) => problems.push({id, text});

  const loopAge = ageMs(dailyLoop?.finishedAt, now);
  if (scheduledLoopEnabled) {
    if (loopAge > LIMITS.loopHours * H) {
      add('loop-ran', dailyLoop ? `매일 루프가 ${Math.round(loopAge / H)}시간째 안 돌았다(작업 스케줄러 IHM-Daily-Growth-Loop 확인)` : '매일 루프 실행 기록이 없다(data/youtube/daily-loop.json)');
    }
  }

  if (dailyLoop?.steps) {
    const failed = Object.entries(dailyLoop.steps).filter(([, s]) => s && s.ok === false);
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
export function loadLoopHealth(projectDir, now = new Date(), {scheduledLoopEnabled = false} = {}) {
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
    scheduledLoopEnabled,
  });
}

/**
 * 워크플로우 루프 이상 신호 풀을 순수 수집한다.
 * 문제(고장)가 있으면 urgent 신호, 데이터상 업그레이드 기회가 있으면 upgrade 신호 목록을 돌려준다. 없으면 [].
 */
export function collectWorkflowSignals({
  now = new Date(),
  loopHealth = null,
  dailyLoop = null,
  studioResearch = null,
  koreanTrends = null,
  outlierReports = [],
  transformSheets = [],
} = {}) {
  if (loopHealth && loopHealth.ok === false && Array.isArray(loopHealth.problems) && loopHealth.problems.length) {
    return loopHealth.problems.map((p) => ({
      area: `자동 루프(${p.id})`,
      severity: 'urgent',
      finding: p.text,
      proposal: '브리핑 직후 해당 단계 로그와 원인을 열어 수정하고 단위 테스트·다음 주기 재소비까지 검증',
    }));
  }

  const candidates = [];
  if (studioResearch) {
    const okDays = [...new Set((studioResearch.runs || []).map((r) => r.date).filter(Boolean))].length;
    const candCount = Object.keys(studioResearch.candidates || {}).length;
    const researchReports = outlierReports.filter((r) => r?.source === 'studio-research').length;
    if (okDays > 0) {
      const stage3Ready = okDays >= 12 && researchReports >= 20;
      candidates.push({
        area: '조사 데이터 2단계 관찰',
        severity: 'upgrade',
        finding: `스튜디오 조사 2단계(조사 후보 우선 선정) 운영 중 — 수집 ${okDays}일치 · 유효 후보 ${candCount}편 · 조사 출처 리포트 ${researchReports}/20편`,
        proposal: stage3Ready
          ? '설계 조건(12일+ 수집 · 조사 리포트 20편+) 충족 — 대표님 재확인 후 3단계(구 손입력 목록 정리) 착수'
          : '2단계 14일 관찰(조사 출처 리포트 20편·수집 12일+)을 쌓으며 조사 후보 품질과 API v2 배수 충실도를 확인',
      });
    }
  }

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

  return candidates;
}

/**
 * 현재 워크플로우 루프의 실제 데이터·상태를 점검해 가장 먼저 살필 1가지 문제점과 수정·업그레이드 방안을 돌려준다(2026-11-19 사용자 요청).
 * 순수 함수(테스트 가능). 실제 수치가 없으면 꾸며내지 않고 있는 그대로 보고한다.
 * @returns {{area: string, severity: 'urgent'|'upgrade'|'healthy', finding: string, proposal: string, candidateCount: number}}
 */
export function diagnoseWorkflowLoop(params = {}) {
  const {now = new Date(), loopHealth = null} = params;
  const signals = collectWorkflowSignals(params);

  if (loopHealth && loopHealth.ok === false && Array.isArray(loopHealth.problems) && loopHealth.problems.length) {
    const first = signals[0] || {
      area: `자동 루프(${loopHealth.problems[0].id})`,
      severity: 'urgent',
      finding: loopHealth.problems[0].text,
      proposal: '브리핑 직후 해당 단계 로그와 원인을 열어 수정하고 단위 테스트·다음 주기 재소비까지 검증',
    };
    return {...first, candidateCount: loopHealth.problems.length};
  }

  if (!signals.length) {
    return {
      area: '워크플로우 루프 전반',
      severity: 'healthy',
      finding: '자동 루프·배율·트렌드·시트 연결에서 즉시 조치할 구조적 단절이 관측되지 않음',
      proposal: '다음 공개 영상의 7일 성과 정산과 비교 시트 적용 추적(appliedTo)이 실제 렌더 결과물과 일치하는지 점검',
      candidateCount: 0,
    };
  }

  const daySeed = Math.floor(new Date(now).getTime() / D);
  const picked = signals[Math.abs(daySeed) % signals.length];
  return {...picked, candidateCount: signals.length};
}

/** 디스크 파일에서 재료를 모아 워크플로우 루프 신호 목록을 돌려준다. */
export function loadWorkflowSignals(projectDir, now = new Date(), loopHealth = null) {
  const dataDir = join(projectDir, 'data', 'youtube');
  const readDirJsons = (dir) => (existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJson(join(dir, f), null)).filter(Boolean)
    : []);
  return collectWorkflowSignals({
    now,
    loopHealth: loopHealth ?? loadLoopHealth(projectDir, now),
    dailyLoop: readJson(join(dataDir, 'daily-loop.json'), null),
    studioResearch: readJson(join(dataDir, 'studio-research.json'), null),
    koreanTrends: readJson(join(dataDir, 'korean-trends.json'), null),
    outlierReports: readDirJsons(join(dataDir, 'outlier-reports')),
    transformSheets: readDirJsons(join(dataDir, 'transform-sheets')),
  });
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

/**
 * 코드베이스 위생 신호 풀을 순수 수집한다.
 * 후보가 없으면 totalCount: 0을 돌려준다.
 */
export function collectCodebaseHygieneSignals({
  dormantFiles = [],
  staleCopy = [],
  untestedActiveScripts = [],
} = {}) {
  const totalCount = dormantFiles.length + staleCopy.length + untestedActiveScripts.length;
  return {
    dormantFiles: dormantFiles.slice(0, 3), // allow-literal: 상위 3건 요약
    dormantTotal: dormantFiles.length,
    staleCopy: staleCopy.slice(0, 3), // allow-literal: 상위 3건 요약
    staleTotal: staleCopy.length,
    untestedActiveScripts: untestedActiveScripts.slice(0, 3), // allow-literal: 상위 3건 요약
    untestedTotal: untestedActiveScripts.length,
    totalCount,
  };
}

/**
 * 프로젝트 비대화 방지 브리핑 항목(2026-11-19 사용자 요청):
 * 슬로건·워크플로우 루프에 안 맞는 ① 장기 잠적(미참조) 파일 삭제안 1건,
 * ② 불필요·충돌 문구 삭제안 1건, ③ 활성 스크립트 버그 테스트 1안을 실제 파일 기준으로 1안씩 뽑는다.
 */
export function diagnoseCodebaseHygiene({
  now = new Date(),
  dormantFiles = [],
  staleCopy = [],
  untestedActiveScripts = [],
} = {}) {
  const daySeed = Math.floor(new Date(now).getTime() / D);
  const pick = (list) => (list.length ? list[Math.abs(daySeed) % list.length] : null);

  const dormant = pick(dormantFiles);
  const copy = pick(staleCopy);
  const testTarget = pick(untestedActiveScripts);

  return {
    dormantFile: dormant
      ? {
          target: dormant.file,
          finding: dormant.reason || `어디서도 참조되지 않는 미사용 스크립트(${dormant.ageDays != null ? `${dormant.ageDays}일 전 수정` : '미참조'})`,
          proposal: `사용처 최종 확인 후 ${dormant.file} 삭제(또는 legacy/ 이관)`,
          candidateCount: dormantFiles.length,
        }
      : {
          target: '없음',
          finding: '미참조 장기 잠적 스크립트가 관측되지 않음',
          proposal: '유지',
          candidateCount: 0,
        },
    staleCopy: copy
      ? {
          target: `${copy.file}:${copy.line}`,
          finding: `${copy.label} ("${copy.snippet}")`,
          proposal: `${copy.file} ${copy.line}줄의 구 규칙·완료 문구 삭제/정리`,
          candidateCount: staleCopy.length,
        }
      : {
          target: '없음',
          finding: '슬로건·규칙과 충돌하는 구 문구가 관측되지 않음',
          proposal: '유지',
          candidateCount: 0,
        },
    bugTest: testTarget
      ? {
          target: testTarget.file,
          finding: `package.json·다른 스크립트에서 실제 호출되나 scripts/tests/에 단위 테스트 0건(${testTarget.lines ?? '?'}줄)`,
          proposal: `${testTarget.file} 핵심 분기·오류 경계 단위 테스트 1안 추가`,
          candidateCount: untestedActiveScripts.length,
        }
      : {
          target: '없음',
          finding: '활성 스크립트 모두 테스트에서 참조 중',
          proposal: '기존 회귀 테스트 유지',
          candidateCount: 0,
        },
  };
}

const STALE_COPY_TARGETS = [
  '.agents/skills/episode-planning/SKILL.md',
  '.claude/skills/episode-planning/SKILL.md',
  'knowledge/now.md',
  'knowledge/playbooks/comparison-sheet-playbook.md',
  'knowledge/thumbnail-strategy.md',
];

const STALE_COPY_RULES = [
  {label: '폐지된 5단어 이하 고정 공식 잔존', re: /5단어 이하[^\n]*제한/, skipRe: /폐지|금지|없앤|삭제|경계|사례|함정/},
  {label: '폐지된 모바일 100px 테스트 잔존', re: /모바일\s*100px/, skipRe: /폐지|금지|없앤|삭제/},
  {label: '폐지된 예상 CTR 예측기 잔존', re: /예상\s*CTR\s*예측기/, skipRe: /폐지|금지|없앤|삭제|틀려/},
  {label: '끝난 할 일([x]) 미삭제 잔존', re: /^- \[x\] /i, onlyFile: 'knowledge/now.md'},
];

/** 실제 디스크를 스캔해 후보 배열들을 모은다. */
export function scanCodebaseHygiene(projectDir, now = new Date()) {
  const scriptsDir = join(projectDir, 'scripts');
  const testsDir = join(scriptsDir, 'tests');
  const readText = (p) => {
    try { return existsSync(p) ? readFileSync(p, 'utf8') : ''; } catch { return ''; }
  };

  const scriptFiles = existsSync(scriptsDir)
    ? readdirSync(scriptsDir).filter((f) => f.endsWith('.mjs')).sort()
    : [];
  const testFiles = existsSync(testsDir)
    ? readdirSync(testsDir).filter((f) => f.endsWith('.test.mjs')).sort()
    : [];

  const pkgText = readText(join(projectDir, 'package.json'));
  const hooksDir = join(projectDir, '.githooks');
  const hooksText = existsSync(hooksDir)
    ? readdirSync(hooksDir).map((f) => readText(join(hooksDir, f))).join('\n')
    : '';
  const claudeDir = join(projectDir, '.claude');
  const claudeSettings = readText(join(claudeDir, 'settings.json')) + '\n' + readText(join(claudeDir, 'settings.local.json'));
  const testCorpus = testFiles.map((f) => readText(join(testsDir, f))).join('\n');
  const scriptBodies = scriptFiles.map((f) => ({name: f, body: readText(join(scriptsDir, f))}));

  const dormantFiles = [];
  const untestedActiveScripts = [];
  const nowMs = new Date(now).getTime();

  for (const {name, body} of scriptBodies) {
    const inTests = testCorpus.includes(name);
    const inPkgOrHooks = pkgText.includes(name) || hooksText.includes(name) || claudeSettings.includes(name);
    const inOtherScripts = scriptBodies.some((other) => other.name !== name && other.body.includes(name));
    const isReferenced = inPkgOrHooks || inOtherScripts;

    if (!isReferenced && !inTests) {
      let ageDays = null;
      try {
        ageDays = Math.max(0, Math.floor((nowMs - statSync(join(scriptsDir, name)).mtimeMs) / D));
      } catch {}
      const isOneOffEp = /^build-ep\d+|^render-ep\d+|^gen-ep\d+/i.test(name);
      dormantFiles.push({
        file: `scripts/${name}`,
        ageDays,
        reason: isOneOffEp
          ? `일회성 과거 에피소드 스크립트(참조 0곳${ageDays != null ? `, ${ageDays}일 전 수정` : ''})`
          : `package.json·스크립트·테스트 어디서도 미참조(${ageDays != null ? `${ageDays}일 전 수정` : '참조 0곳'})`,
      });
    } else if (isReferenced && !inTests) {
      untestedActiveScripts.push({
        file: `scripts/${name}`,
        lines: body.split(/\r?\n/).length,
      });
    }
  }

  const staleCopy = [];
  for (const rel of STALE_COPY_TARGETS) {
    const text = readText(join(projectDir, rel));
    if (!text) continue;
    const lines = text.split(/\r?\n/);
    lines.forEach((line, idx) => {
      for (const rule of STALE_COPY_RULES) {
        if (rule.onlyFile && rule.onlyFile !== rel) continue;
        if (rule.skipRe && rule.skipRe.test(line)) continue;
        if (rule.re.test(line)) {
          staleCopy.push({
            file: rel,
            line: idx + 1,
            label: rule.label,
            snippet: line.trim().slice(0, 60),
          });
        }
      }
    });
  }

  return {dormantFiles, staleCopy, untestedActiveScripts};
}

/** 실제 디스크를 스캔해 장기 잠적 파일·불필요 문구·버그 테스트 1안씩을 만든다. */
export function loadCodebaseHygieneDiagnosis(projectDir, now = new Date()) {
  const {dormantFiles, staleCopy, untestedActiveScripts} = scanCodebaseHygiene(projectDir, now);
  return diagnoseCodebaseHygiene({now, dormantFiles, staleCopy, untestedActiveScripts});
}

/** 실제 디스크를 스캔해 코드베이스 위생 신호 풀 전체를 모은다. */
export function loadCodebaseHygieneSignals(projectDir, now = new Date()) {
  const {dormantFiles, staleCopy, untestedActiveScripts} = scanCodebaseHygiene(projectDir, now);
  return collectCodebaseHygieneSignals({dormantFiles, staleCopy, untestedActiveScripts});
}
