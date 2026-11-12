// 다음 기획 입력 파일을 만든다(2026-11-12).
// 모은 데이터가 대시보드 화면에만 머물지 않고 다음 기획의 출발점이 되게 하는 한 장짜리 요약이다.
// 원칙: knowledge/data-consumption-map.md. 숫자는 실제 파일에서만 가져오고, 없으면 "측정 전"으로 쓴다.
// 표본이 작으면 결론이 아니라 "가설 재료"로 표시한다(AGENTS.md 자동화 원칙).
//
// 쓰는 데이터: catalog.json, views-7d.json, video-reach-manual.json, analytics-latest.json,
//   comments.json, audience-dna.json, success-patterns.json, videos/*/REVIEW.md, 판정(planning-outcome.mjs)
// 만드는 파일: data/youtube/next-episode-input.md (기획 스킬 1단계가 먼저 읽는다)
//
// 실행: node scripts/next-episode-input.mjs   (매일 루프가 동기화 뒤에 자동으로 실행한다)
import {readFileSync, writeFileSync, existsSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEpisodeOutcomes, SMALL_SAMPLE_VIEWS_7D} from './planning-outcome.mjs';
import {loadReports as loadOutlierReports} from './outlier-report.mjs';
import {loadSheets} from './transform-sheet.mjs';

export const MIN_COMPARE_VIDEOS = 6; // 상위 3편과 하위 3편이 겹치지 않는 최소 수
export const RECENT_POOL = 20; // 같은 형식 최근 20편 안에서 비교한다(오래된 영상이 지금 채널을 대표하지 않게)
export const VIEWER_COMMENT_DAYS = 60;
const DAY_MS = 86400000;

const median = (values) => {
  const sorted = values.filter((v) => v != null && Number.isFinite(Number(v))).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const isPublic = (v) => v?.privacyStatus === 'public';

export function titleTraits(title = '') {
  const text = String(title);
  return {
    question: /[?？]/.test(text),
    startsWithEnglish: /^[A-Za-z]/.test(text.trim()),
    hasNumber: /\d/.test(text),
    hashtags: (text.match(/#\S+/g) || []).length,
    length: [...text].length,
  };
}

function latestReach(reachEntry) {
  const periods = Object.values(reachEntry?.periods || {}).filter((p) => p?.ctr != null && p?.impressions != null);
  if (!periods.length) return {ctr: null, impressions: null, period: null};
  const latest = periods.reduce((best, p) => (String(p.endDate) > String(best.endDate) ? p : best));
  return {ctr: Number(latest.ctr), impressions: Number(latest.impressions), period: `${latest.startDate}~${latest.endDate}`};
}

/** 같은 형식 최근 영상 중 7일 조회수 상·하위 3편. 표본이 모자라면 status: 'hold'. */
export function compareOurVideos({catalogVideos = [], views7d = {}, reach = {}, performance = [], format, now = new Date()}) {
  const v7 = (id) => (views7d[id]?.views7d == null ? null : Number(views7d[id].views7d));
  const pool = catalogVideos
    .filter((v) => v?.videoId && isPublic(v) && v.format === format && v.publishedAt && new Date(v.publishedAt) <= now && v7(v.videoId) != null)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .slice(0, RECENT_POOL);
  const medianViews7d = median(pool.map((v) => v7(v.videoId)));
  const base = {format, count: pool.length, medianViews7d, smallSample: medianViews7d == null || medianViews7d < SMALL_SAMPLE_VIEWS_7D};
  if (pool.length < MIN_COMPARE_VIDEOS) {
    return {...base, status: 'hold', reason: `7일 조회수가 있는 ${format === 'SHORTS' ? '쇼츠' : '롱폼'}가 ${pool.length}편 — ${MIN_COMPARE_VIDEOS}편 미만이라 비교하지 않음`, top: [], bottom: []};
  }
  const perfById = new Map(performance.map((p) => [p.video, p]));
  const row = (v) => {
    const r = latestReach(reach[v.videoId]);
    const avp = perfById.get(v.videoId)?.averageViewPercentage;
    return {
      videoId: v.videoId,
      title: v.title,
      publishedAt: v.publishedAt,
      views7d: v7(v.videoId),
      ratio: medianViews7d > 0 ? Math.round((v7(v.videoId) / medianViews7d) * 10) / 10 : null,
      ctr: r.ctr,
      impressions: r.impressions,
      reachPeriod: r.period,
      averageViewPercentage: avp == null ? null : Math.round(Number(avp) * 10) / 10,
      traits: titleTraits(v.title),
    };
  };
  const byViews = [...pool].sort((a, b) => v7(b.videoId) - v7(a.videoId));
  return {
    ...base,
    status: 'ok',
    top: byViews.slice(0, 3).map(row),
    bottom: byViews.slice(-3).reverse().map(row),
  };
}

/** 경쟁 영상 시청자 고민·질문 순위. 대본 분석에서 온 AI 추측(competitorScript)은 시청자 말이 아니라 뺀다. */
export function rankAudienceNeeds(entries = [], n = 5) {
  let excludedAiGuesses = 0;
  const rank = (type) => entries
    .filter((e) => e?.type === type)
    .map((e) => {
      const viewerSources = (e.sources || []).filter((s) => s?.sourceType === 'outlierComment');
      const videoIds = new Set(viewerSources.map((s) => s.videoId).filter(Boolean));
      if (!videoIds.size) { excludedAiGuesses += 1; return null; }
      const channels = [...new Set(viewerSources.map((s) => s.channelTitle).filter(Boolean))];
      return {text: e.text, videoCount: videoIds.size, occurrences: Number(e.occurrences) || 0, channels};
    })
    .filter(Boolean)
    .sort((a, b) => b.videoCount - a.videoCount || b.occurrences - a.occurrences)
    .slice(0, n);
  const painPoint = rank('painPoint');
  const question = rank('question');
  return {painPoint, question, excludedAiGuesses};
}

/** 우리 채널 시청자 댓글(채널 주인 제외), 최근 것부터. */
export function recentViewerComments(commentsByVideo = {}, titles = {}, now = new Date(), days = VIEWER_COMMENT_DAYS, limit = 10) {
  const since = now.getTime() - days * DAY_MS;
  return Object.entries(commentsByVideo)
    .flatMap(([videoId, list]) => (list || []).map((c) => ({...c, videoId})))
    .filter((c) => !c.isChannelOwner && c.publishedAt && new Date(c.publishedAt).getTime() >= since)
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .slice(0, limit)
    .map((c) => ({
      videoId: c.videoId,
      title: titles[c.videoId] || c.videoId,
      text: String(c.text || ''),
      publishedAt: c.publishedAt,
      question: /[?？]/.test(String(c.text || '')),
      replied: Number(c.replyCount) > 0,
    }));
}

/** REVIEW.md의 "다음 영상에 적용할 것" 항목. */
export function extractReviewLessons(markdown = '') {
  const lines = String(markdown).replace(/^﻿/, '').split(/\r?\n/);
  const publishedOn = (lines[0] || '').match(/공개\s*(\d{4}-\d{2}-\d{2})/)?.[1] || null;
  const start = lines.findIndex((l) => /^##\s+다음 영상에 적용할 것/.test(l.trim()));
  if (start === -1) return {publishedOn, lessons: []};
  const lessons = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}\s/.test(line)) break;
    const m = line.match(/^\s*-\s+(.+)$/);
    if (m) lessons.push(m[1].trim());
  }
  return {publishedOn, lessons};
}

/** 공개일이 적힌(실제로 공개·리뷰한) 편의 교훈만, 최근 공개 순으로. 공개 전 자리표시("대기 중")는 빠진다. */
export function pickReviewLessons(reviews = [], n = 3) {
  return reviews
    .filter((r) => r.publishedOn && r.lessons?.length)
    .sort((a, b) => String(b.publishedOn).localeCompare(String(a.publishedOn)))
    .slice(0, n);
}

/** 합친 아웃라이어 리포트(data/youtube/outlier-reports) 요약: 성과 배수 큰 영상부터. */
export function summarizeOutlierReports(reports = [], n = 5) {
  return [...reports]
    .sort((a, b) => (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0))
    .slice(0, n)
    .map((r) => ({
      videoId: r.videoId,
      title: r.meta?.title ?? null,
      channelTitle: r.meta?.channelTitle ?? null,
      outlierRatio: r.outlierRatio ?? null,
      titleDevice: r.analysis?.click?.titleDevice ?? null,
      thumbnailText: r.analysis?.click?.thumbnailText ?? null,
      thumbnailWordCount: r.analysis?.click?.thumbnailWordCount ?? null,
      first15s: r.analysis?.opening?.first15s ?? null,
      cutsPerMinute: r.pacing?.perMinute ?? null,
      pacingSource: r.pacing?.source ?? null,
      visualChanges: (r.analysis?.visualMoments || []).length,
      adopt: r.analysis?.forUs?.adopt ?? null,
      differentiate: r.analysis?.forUs?.differentiate ?? null,
    }));
}

const KO = {LONGFORM: '롱폼', SHORTS: '쇼츠'};
const VERDICT = {worked: '통함', neutral: '보통', failed: '안 통함', hold: '보류', pending: '집계 전'};
const show = (v, unit = '') => (v == null ? '측정 전' : `${v}${unit}`);
const day = (iso) => (iso ? String(iso).slice(0, 10) : '측정 전');
const cut = (text, n) => {
  const chars = [...String(text).replace(/\s+/g, ' ').trim()];
  return chars.length > n ? `${chars.slice(0, n).join('')}…` : chars.join('');
};
const cell = (text) => String(text).replace(/\|/g, '/');

function renderComparison(c) {
  const name = KO[c.format] || c.format;
  const out = [`### ${name}`, ''];
  if (c.status !== 'ok') {
    out.push(`보류: ${c.reason}.`, '');
    return out;
  }
  out.push(`최근 ${name} ${c.count}편의 공개 첫 7일 조회수 중앙값: **${c.medianViews7d}회**.`);
  if (c.smallSample) out.push(`**작은 표본**: 중앙값이 판정 기준(${SMALL_SAMPLE_VIEWS_7D}회)보다 작다. 아래 차이는 운일 수 있으니 결론이 아니라 가설 재료로만 쓴다.`);
  out.push('', '| 구분 | 영상 | 공개일 | 7일 조회 | 중앙값 대비 | 노출 클릭률(노출수, 기간) | 평균 시청 비율 |', '|---|---|---|---|---|---|---|');
  const line = (label, v) => `| ${label} | ${cell(cut(v.title, 40))} (\`${v.videoId}\`) | ${day(v.publishedAt)} | ${v.views7d}회 | ${show(v.ratio, '배')} | ${v.ctr == null ? '측정 전' : `${v.ctr}% (${v.impressions}회, ${v.reachPeriod})`} | ${show(v.averageViewPercentage, '%')} |`;
  c.top.forEach((v) => out.push(line('상위', v)));
  c.bottom.forEach((v) => out.push(line('하위', v)));
  const count = (list, key) => list.filter((v) => v.traits[key]).length;
  out.push('', `제목 특징(사실만 셈, 상위 3편 / 하위 3편): 물음표 ${count(c.top, 'question')}/${count(c.bottom, 'question')}, 영어로 시작 ${count(c.top, 'startsWithEnglish')}/${count(c.bottom, 'startsWithEnglish')}, 숫자 포함 ${count(c.top, 'hasNumber')}/${count(c.bottom, 'hasNumber')}, 평균 길이 ${Math.round(median(c.top.map((v) => v.traits.length)))}자/${Math.round(median(c.bottom.map((v) => v.traits.length)))}자(중앙값).`, '');
  return out;
}

export function renderNextEpisodeInput(input) {
  const {generatedAt, freshness = {}, comparisons = {}, searchTerms = [], viewerComments = [], allViewerComments = null, audience = {}, reviews = [], outcomes = [], successPatternCount = 0, outlierReports = [], transformSheets = []} = input;
  const out = [
    '# 다음 기획 입력',
    '',
    `만든 때: ${generatedAt} · 만든 코드: \`scripts/next-episode-input.mjs\`(매일 루프가 자동 실행) · 손으로 고치지 않는다.`,
    `데이터 기준: 카탈로그 동기화 ${day(freshness.catalogSyncedAt)}, 분석 기간 ${freshness.analyticsRange || '측정 전'}, 시청자 고민 갱신 ${day(freshness.audienceDnaUpdatedAt)}.`,
    '',
    '기획(소재·제목·썸네일·대본)은 이 파일에서 출발한다. `BRIEF.md`의 "기획 근거" 칸에는 여기서 쓴 항목을 그대로 옮긴다. 표본이 작다고 적힌 칸은 결론이 아니라 가설이다.',
    '',
    '## 1. 실험 결과 — 지금까지의 판정',
    '',
  ];
  const judged = outcomes.filter((o) => o.verdict !== 'pending');
  const counts = Object.entries(outcomes.reduce((acc, o) => ({...acc, [o.verdict]: (acc[o.verdict] || 0) + 1}), {}))
    .map(([k, n]) => `${VERDICT[k] || k} ${n}편`).join(', ');
  out.push(`판정 대상 ${outcomes.length}편: ${counts || '없음'}. 성공 패턴 ${successPatternCount}개.`);
  if (judged.length && judged.every((o) => o.verdict === 'hold')) out.push('확정 판정(통함·안 통함)이 아직 없다. 지금은 같은 조건으로 꾸준히 올려 표본을 쌓는 단계다.');
  if (judged.length) {
    out.push('', '| 편 | 공개일 | 7일 조회 | 판정 | 이유 |', '|---|---|---|---|---|');
    judged.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))).slice(0, 8)
      .forEach((o) => out.push(`| ${o.label} | ${day(o.publishedAt)} | ${show(o.views7d, '회')} | ${VERDICT[o.verdict] || o.verdict} | ${cell(o.reason || '')} |`));
  }
  out.push('', '## 2. 우리 영상 비교 — 잘된 편과 안된 편', '', '같은 형식끼리만 비교한다. 노출 클릭률은 스튜디오 내보내기의 가장 최근 기간, 평균 시청 비율은 분석 기간 값이다. 쇼츠는 반복 재생 때문에 평균 시청 비율이 100%를 넘을 수 있다.', '');
  for (const key of ['LONGFORM', 'SHORTS']) if (comparisons[key]) out.push(...renderComparison(comparisons[key]));

  out.push('## 3. 시청자가 우리 채널을 찾은 검색어', '');
  if (searchTerms.length) {
    const total = searchTerms.reduce((n, s) => n + (Number(s.views) || 0), 0);
    out.push(`분석 기간 ${freshness.analyticsRange || '측정 전'}의 유튜브 검색 유입 원본, 상위 ${Math.min(10, searchTerms.length)}개(받은 검색어 ${searchTerms.length}개, 합계 ${total}회). 우리 영상과 관계없는 검색어도 섞여 있다. 영어·발음과 관계있는 검색어만 제목 앞부분 후보로 쓴다.`, '', '| 검색어 | 조회 |', '|---|---|');
    searchTerms.slice(0, 10).forEach((s) => out.push(`| ${cell(s.insightTrafficSourceDetail)} | ${s.views}회 |`));
  } else out.push('측정 전.');

  out.push('', `## 4. 우리 시청자 댓글 (최근 ${VIEWER_COMMENT_DAYS}일, 채널 주인 제외)`, '');
  if (viewerComments.length) {
    const qs = viewerComments.filter((c) => c.question).length;
    out.push(`${viewerComments.length}개, 그중 물음표가 있는 질문 ${qs}개. 실제 댓글 원문이다.`, '');
    viewerComments.forEach((c) => out.push(`- ${day(c.publishedAt)} · ${cut(c.title, 30)}: "${cut(c.text, 120)}"${c.question ? ' (질문)' : ''}${c.replied ? '' : ' (답글 없음)'}`));
  } else out.push(`최근 시청자 댓글 없음${allViewerComments == null ? '' : ` (전체 기간 시청자 댓글 ${allViewerComments}개)`}.`);

  out.push('', '## 5. 경쟁 영상 시청자의 고민과 질문', '', `경쟁 아웃라이어 영상 댓글을 AI가 요약한 문장이다(원문 아님). 여러 경쟁 영상에서 나온 것부터 적는다. 대본 분석에서 AI가 추측한 항목 ${audience.excludedAiGuesses ?? 0}개는 시청자 말이 아니라서 뺐다.`, '');
  const needs = (label, list = []) => {
    out.push(`**${label}**`, '');
    if (!list.length) { out.push('없음.', ''); return; }
    list.forEach((e, i) => out.push(`${i + 1}. "${cut(e.text, 140)}" — 경쟁 영상 ${e.videoCount}개${e.channels.length ? ` (${e.channels.slice(0, 3).join(', ')})` : ''}`));
    out.push('');
  };
  needs('고민', audience.painPoint);
  needs('질문', audience.question);

  out.push('## 6. 최근 리뷰의 교훈', '');
  if (reviews.length) {
    reviews.forEach((r) => {
      out.push(`**${r.slug}** (공개 ${r.publishedOn || '날짜 없음'})`);
      r.lessons.forEach((l) => out.push(`- ${l}`));
      out.push('');
    });
  } else out.push('"다음 영상에 적용할 것"이 적힌 리뷰 없음.', '');

  out.push('## 7. 경쟁 영상 관찰 (합친 아웃라이어 리포트)', '');
  if (outlierReports.length) {
    out.push(`경쟁 영상 ${outlierReports.length}편을 화면·자막·댓글로 관찰한 기록(채널 평소 대비 배수 큰 순). 관찰은 사실이고 "가져올 점·다르게 할 점"은 AI 제안이다. 캡처와 원문 인용은 리포트 화면에서 본다. 화면 구성 후보는 \`npm run visual-library -- <검색어>\`로 꺼낸다.`, '');
    for (const r of outlierReports) {
      const ratio = r.outlierRatio == null ? '측정 전' : `${Math.round(r.outlierRatio)}배`;
      out.push(`**${cut(r.title ?? r.videoId, 50)}** — ${r.channelTitle ?? '측정 전'}, 평소 대비 ${ratio} · http://localhost:3001/outlier-report/${r.videoId}`);
      out.push(`- 제목: ${r.titleDevice ?? '측정 전'}`);
      out.push(`- 썸네일 글자: ${r.thumbnailText ? `"${cut(r.thumbnailText, 40)}" (${r.thumbnailWordCount ?? '?'}단어)` : '측정 전'}`);
      out.push(`- 첫 15초: ${r.first15s ? cut(r.first15s, 160) : '측정 전'}`);
      out.push(`- 장면 전환 1분에 ${r.cutsPerMinute ?? '측정 전'}번(${r.pacingSource ?? '출처 없음'}), AI가 적은 화면 변화 ${r.visualChanges}개`);
      out.push(`- 가져올 점: ${r.adopt ?? '측정 전'} / 다르게 할 점: ${r.differentiate ?? '측정 전'}`, '');
    }
  } else out.push('합친 아웃라이어 리포트 없음.', '');

  // 8절: 비교 시트(경쟁 영상을 우리 콘텐츠로 바꾼 한 장, 2026-11-12). 경쟁 소재를 쓰는 편은 여기서 출발한다.
  out.push('## 8. 비교 시트 (경쟁 영상 → 우리 콘텐츠)', '');
  if (transformSheets.length) {
    out.push('경쟁 영상을 같은 행에서 우리 콘텐츠와 비교한 시트. 경쟁 소재를 쓰는 편은 새로 만들기 전에 이 시트를 만들고 `BRIEF.md` 기획 근거에 `비교 시트:` 줄로 연결한다.', '');
    for (const t of transformSheets) {
      out.push(`- **${cut(t.topic, 60)}** — ${t.status === 'draft' ? '초안' : t.status === 'approved' ? '승인' : '공개'} · ${t.format} · 다른 영상에서 가져온 것 ${t.borrowedCount}개, 뺀 것 ${t.rejectedCount}개 · http://localhost:3001/transform-sheet/${t.sourceVideoId}`);
    }
    out.push('');
  } else out.push('비교 시트 없음.', '');
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

const readJson = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')); } catch { return fallback; }
};

export const nextEpisodeInputPath = (projectDir) => join(projectDir, 'data', 'youtube', 'next-episode-input.md');

export function buildFromProject(projectDir, now = new Date()) {
  const dataDir = join(projectDir, 'data', 'youtube');
  const catalog = readJson(join(dataDir, 'catalog.json'), {videos: []});
  const views7d = readJson(join(dataDir, 'views-7d.json'), {videos: {}}).videos || {};
  const reach = readJson(join(dataDir, 'video-reach-manual.json'), {videos: {}}).videos || {};
  const analytics = readJson(join(dataDir, 'analytics-latest.json'), {});
  const comments = readJson(join(dataDir, 'comments.json'), {commentsByVideo: {}});
  const dna = readJson(join(dataDir, 'audience-dna.json'), {entries: []});
  const patterns = readJson(join(dataDir, 'success-patterns.json'), {entries: []});
  const videos = catalog.videos || [];
  const performance = analytics.videoPerformance || [];
  const titles = Object.fromEntries(videos.map((v) => [v.videoId, v.title]));

  const videosDir = join(projectDir, 'videos');
  const reviews = pickReviewLessons((existsSync(videosDir) ? readdirSync(videosDir) : [])
    .filter((slug) => existsSync(join(videosDir, slug, 'REVIEW.md')))
    .map((slug) => ({slug, ...extractReviewLessons(readFileSync(join(videosDir, slug, 'REVIEW.md'), 'utf8'))})));
  const allViewerComments = Object.values(comments.commentsByVideo || {}).flat().filter((c) => c && !c.isChannelOwner).length;

  const range = analytics.range ? `${analytics.range.startDate}~${analytics.range.endDate}` : null;
  return {
    generatedAt: now.toISOString(),
    freshness: {catalogSyncedAt: catalog.syncedAt || null, analyticsRange: range, audienceDnaUpdatedAt: dna.updatedAt || null},
    comparisons: Object.fromEntries(['LONGFORM', 'SHORTS'].map((format) => [format, compareOurVideos({catalogVideos: videos, views7d, reach, performance, format, now})])),
    searchTerms: analytics.searchTerms || [],
    viewerComments: recentViewerComments(comments.commentsByVideo || {}, titles, now),
    allViewerComments,
    audience: rankAudienceNeeds(dna.entries || []),
    reviews,
    outcomes: loadEpisodeOutcomes(projectDir, now),
    successPatternCount: (patterns.entries || []).length,
    outlierReports: summarizeOutlierReports(loadOutlierReports()),
    transformSheets: loadSheets().map((t) => ({sourceVideoId: t.sourceVideoId, topic: t.topic, status: t.status, format: t.format, borrowedCount: (t.borrowed || []).length, rejectedCount: (t.rejected || []).length})),
  };
}

export function writeNextEpisodeInput(projectDir, now = new Date()) {
  const markdown = renderNextEpisodeInput(buildFromProject(projectDir, now));
  writeFileSync(nextEpisodeInputPath(projectDir), markdown, 'utf8');
  return markdown;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
  const md = writeNextEpisodeInput(projectDir);
  console.log(`다음 기획 입력 파일을 만들었습니다: data/youtube/next-episode-input.md (${md.split('\n').length}줄)`);
}
