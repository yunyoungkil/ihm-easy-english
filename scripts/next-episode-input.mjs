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
import {formatRatioLabel, ratioTier} from './peer-ratio.mjs';
import {METRICS, MIN_POINTS_POOL, quantile, RECENT_COUNT, usualBands, usualFor} from './baseline.mjs';
import {groupResultsByVariable} from './sheet-outcomes.mjs';
import {pickLatestPeriodWithImpressions} from './studio-reach.mjs';

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
  const latest = pickLatestPeriodWithImpressions(reachEntry?.periods, {needCtr: true});
  if (!latest) return {ctr: null, impressions: null, period: null};
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

/** 합친 아웃라이어 리포트(data/youtube/outlier-reports) 요약: 새 방식 배수가 큰 영상부터, 옛 방식 값은 그 뒤(서로 숫자를 비교하지 않는다). */
export function summarizeOutlierReports(reports = [], n = 5) {
  return [...reports]
    .sort((a, b) => ratioTier(a) - ratioTier(b) || (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0))
    .slice(0, n)
    .map((r) => ({
      videoId: r.videoId,
      title: r.meta?.title ?? null,
      channelTitle: r.meta?.channelTitle ?? null,
      outlierRatio: r.outlierRatio ?? null,
      ratioMethod: r.ratioMethod ?? null,
      ratioStatus: r.ratioStatus ?? null,
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
  out.push(`판정 대상 ${outcomes.length}편: ${counts || '없음'}. 통한 요소 기록 ${successPatternCount}개.`);
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
      const ratio = formatRatioLabel(r);
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
  out.push(...renderBaselines(input.baselines, input.variableGroups || []));
  out.push(...renderRetention(input.retention));
  out.push(...renderStudioMetrics(input.studio, input.titles));
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

/** 기준선(현재 최고 기록): 형식·지표별로 우리가 지금까지 낸 최고와, 이를 넘으려면 필요한 값. 숫자는 baselines.json(scripts/baseline.mjs)이 계산한 것이다. */
export function renderBaselines(baselines, variableGroups = []) {
  const out = ['## 9. 기준선 (현재 최고 기록)', ''];
  if (!baselines?.formats) return [...out, '기준선 계산 전(`node scripts/baseline.mjs`).', ''];
  out.push('우리 채널에는 "성공"이라는 말을 쓰지 않는다. 판정은 두 단계다. **1단계 "좋은 점 후보"**: 같은 형식에서 비슷한 길이 최근 10편의 중앙값(평소)의 1.5배 이상이면 그 영상의 좋은 점을 가져와 다음 영상에 더한다(자주 일어남). **2단계 "기준선 갱신"**: 지표별 현재 최고가 기준선이고, 새 영상이 갱신 기준(우리 편차만큼 위)을 넘으면 기준선이 올라간다(가끔 일어남). 근거 표본이 작으면 가설이고, 표본이 작아도 기준선을 비우지 않고 "표본 작음"을 붙인다. 조회수는 제목·썸네일·소재(포장), 평균 시청 시간은 훅·화면·대본(내용, 영상이 길수록 유리), 구독 수는 채널의 가치를 본다. 모두 공개 첫 7일 값이다. 롱폼에는 공개 첫 7일 썸네일 노출수·클릭률(스튜디오 값, 클릭률 = 클릭 수 합 ÷ 노출 합)도 포장 지표로 더했다. 클릭률은 노출이 적으면 클릭 한 번에 크게 흔들려서, 평소를 최근 10편의 합산 클릭률로 잡고 클릭 한 번을 운으로 빼고도 1.5배여야 좋은 점 후보로 본다(판정마다 "클릭 1번 = N%p"를 함께 적는다). 쇼츠는 조회의 대부분이 피드에서 넘기다 본 것이라 썸네일 클릭률이 포장을 설명하지 못해 기준선이 아니라 참고로만 보여 준다.', '');
  const names = {SHORTS: '쇼츠', LONGFORM: '롱폼'};
  const num = (n) => Number(Number(n).toFixed(2)).toLocaleString('ko-KR');
  for (const [format, name] of Object.entries(names)) {
    const entry = baselines.formats[format] || {};
    for (const [key, m] of Object.entries(entry.metrics || {})) {
      if (!m.champion) { out.push(`- ${name} ${m.label}: 표본 없음`); continue; }
      const unit = m.unit || '';
      const bar = m.promoteAbove == null ? '갱신 기준 없음(편차를 못 구함)' : `갱신 기준 ${num(m.promoteAbove)}${unit}`;
      const len = m.champion.durationSeconds ? ` · 영상 ${num(m.champion.durationSeconds)}초` : '';
      // 평소는 판정에 쓰는 것과 같은 계산(usualFor)으로 보여 준다: 길이 중앙값이 있으면 짧은 쪽·긴 쪽을 따로(길이 보정이 안 되는 쪽은 그렇게 적는다)
      const bands = usualBands(format, key, baselines);
      const bandText = (u) => (u ? `${num(u.value)}${unit}${u.lengthAdjusted ? '' : '(길이 보정 없음)'}` : '측정 전');
      const recent = (entry.recent?.[key] || []).slice(0, RECENT_COUNT).map((r) => r.value);
      let usual = '';
      if (bands && (bands.low || bands.high)) usual = ` · 평소(최근 ${RECENT_COUNT}편 ${key === 'ctr7d' ? '합산 클릭률' : '중앙값'}) 짧은 영상(${num(bands.mid)}초 미만) ${bandText(bands.low)} · 긴 영상 ${bandText(bands.high)}`;
      else if (key === 'ctr7d') { const u = usualFor({format, metric: key}, baselines); if (u) usual = ` · 평소(최근 ${u.n}편 합산 클릭률) ${num(u.value)}${unit}`; }
      // 계속 시청함(쇼츠 스타일 시험 1차 지표): 판정과 같은 계산(usualFor). 앞선 쇼츠가 MIN_POINTS_POOL편 미만이면 판정하지 않는다.
      else if (METRICS[key]?.rule === 'points') { const u = usualFor({format, metric: key}, baselines); usual = u ? ` · 평소(최근 ${u.n}편 중앙값) ${num(u.value)}${unit} · 판정 폭 ±${num(u.spread)}%p 이상(우리 편차, 표본이 작으면 우연 폭이 더 크다, 가설)` : ` · 평소 측정 전(값 있는 쇼츠 ${(entry.recent?.[key] || []).length}편, ${MIN_POINTS_POOL}편부터 판정)`; }
      else if (recent.length) usual = ` · 평소(최근 ${recent.length}편 중앙값) ${num(quantile(recent, 0.5))}${unit}`; // allow-literal: 분위수의 정의(중앙값)
      const notes = [m.sampleNote, m.approxNote, m.catchingUpNote, m.mixedNote, m.abTestedCount ? `A/B 테스트가 걸린 영상 ${m.abTestedCount}/${m.n}편(클릭률·노출수는 시안이 섞인 값)` : null, ...(m.excluded || []).map((x) => `기준선 후보에서 뺌: 「${cut(x.title, 24)}」 ${num(x.value)}${unit}(${x.reason})`)].filter(Boolean);
      out.push(`- ${name} ${m.label}(${m.meaning}): 기준선 ${num(m.champion.value)}${unit}${len} · ${bar} · 중앙값 ${num(m.median)}${unit}${usual} · 표본 ${m.n}편(${m.confidence}) · 「${cut(m.champion.title, 40)}」${notes.length ? ` ※ ${notes.join(' / ')}` : ''}`);
    }
    const ref = entry.reference;
    if (ref?.firstWeekReach) out.push(`- ${name} 첫 7일 노출·클릭률 참고(기준선 아님, 스튜디오 값): ${ref.firstWeekReach.n}편, 노출 중앙값 ${num(ref.firstWeekReach.medianImpressions)}회, 합산 클릭률 ${ref.firstWeekReach.pooledCtrPercent == null ? '측정 전' : `${num(ref.firstWeekReach.pooledCtrPercent)}%`}`);
    if (ref?.subsPer1000Views?.value != null) {
      const ratio = ref.watchRatio?.median == null ? '측정 전' : `${Math.round(ref.watchRatio.median * 100)}%`; // allow-literal: 비율을 %로
      const mins = ref.totalWatchMinutes?.median == null ? '측정 전' : `${num(ref.totalWatchMinutes.median)}분`;
      out.push(`- ${name} 참고(기준선 아님): 조회 1,000회당 구독 ${num(ref.subsPer1000Views.value)}명(${ref.subsPer1000Views.totalSubs}명/${num(ref.subsPer1000Views.totalViews)}회) · 시청률 중앙값 ${ratio} · 총 시청 시간 중앙값 ${mins}`);
    }
  }
  if (variableGroups.length) {
    out.push('', '같은 시험 변수를 쓴 영상 묶음(건수만 센다, 확정은 단계를 거친다):');
    for (const g of variableGroups) {
      const byMetric = Object.entries(g.goodByMetric || {}).map(([k, n]) => `${METRICS[k]?.label || k} ${n}편`).join(', ');
      out.push(`- ${names[g.format] || g.format} · ${g.variable}: ${g.videoCount}편 중 좋은 점 후보 ${g.goodCount}편${byMetric ? `(지표별: ${byMetric})` : ''}, 평소의 절반 미만 ${g.lowCount}편`);
    }
  }
  out.push('');
  return out;
}

/** 스튜디오 고급 모드 영상별 표(지난 28일)에서 신규·재방문 시청자와 쇼츠 계속 시청함을 보여 준다. 값은 표 그대로이고 계산은 비율뿐이다. */
export function renderStudioMetrics(studio, titles = {}) {
  const out = ['## 11. 스튜디오 실측 (신규·재방문 시청자, 쇼츠 계속 시청함)', ''];
  const p = studio?.periods?.['4_weeks'];
  if (!p?.total) return [...out, '스튜디오 표 수집 전(`npm run studio-export`, 매일 루프 studioExport 단계). 값이 없으면 판단하지 않는다.', ''];
  const t = p.total;
  // 스튜디오 zip 이름의 종료일은 마지막 날의 다음 날이다. 화면과 API(마지막 날 포함)에 맞춰 마지막 날로 보여 준다.
  const endMs = Date.parse(`${p.endDate}T00:00:00Z`);
  const lastDay = p.lastDay || (Number.isFinite(endMs) ? new Date(endMs - 86400000).toISOString().slice(0, 10) : '측정 전'); // allow-literal: 하루(ms)
  out.push(`스튜디오 고급 모드 영상별 표(${p.startDate}~${lastDay}, 받은 때 ${day(p.fetchedAt)})의 값 그대로다. 계산한 것은 비율뿐이다. 항목 이름은 스튜디오 화면 그대로 쓴다.`);
  const sum = (t.newViewers ?? 0) + (t.returningViewers ?? 0);
  if (t.newViewers != null && t.returningViewers != null && sum > 0) {
    out.push(`- 시청자: 신규 ${t.newViewers}명, 재방문 ${t.returningViewers}명 (신규 비율 ${((t.newViewers / sum) * 100).toFixed(1)}%)`);
  }
  const rows = Object.entries(p.videos || {})
    .filter(([, v]) => v.stayedToWatchPercent != null)
    .sort((a, b) => (b[1].views ?? 0) - (a[1].views ?? 0)); // 조회가 많은 순: 조회 1~6회짜리가 100%로 맨 위에 오는 노이즈를 막는다
  if (!rows.length) return [...out, '- 계속 시청함 값이 있는 영상이 없다(쇼츠가 이 기간에 없거나 노출이 적다).', ''];
  out.push(`- 계속 시청함(쇼츠에만 값이 있다) 전체 ${t.stayedToWatchPercent ?? '측정 전'}%. 조회가 많은 순으로 보여 준다(조회가 적은 영상은 비율이 크게 흔들린다).`);
  for (const [id, v] of rows.slice(0, 10)) { // allow-literal: 화면에 보여 줄 최대 편수
    out.push(`  - 「${cut(titles[id] || id, 30)}」 계속 시청함 ${v.stayedToWatchPercent}% (조회 ${show(v.views)}, 길이 ${show(v.durationSec, '초')})`);
  }
  out.push('');
  return out;
}

/** 이탈 지점(영상별 시청 유지 곡선): 가장 큰 이탈 구간을 초로 보여 준다. 숫자는 data/youtube/retention/*.json(scripts/retention-curves.mjs)이 계산한 것이다. */
export function renderRetention(curves = []) {
  const out = ['## 10. 이탈 지점 (영상별 시청 유지 곡선)', ''];
  const usable = (curves || []).filter((x) => x?.drops?.length);
  if (!usable.length) return [...out, '이탈 곡선 수집 전(`node scripts/retention-curves.mjs`). 조회가 적은 영상은 API가 점을 주지 않는다.', ''];
  const num = (n) => Number(Number(n).toFixed(1));
  out.push(`시청 유지 곡선을 받은 ${usable.length}편에서 가장 크게 떠난 구간이다. 값은 그 구간에서 시청 유지 비율이 줄어든 폭(%p, 다시 보기 포함)이고, 근거 표본이 작으면 가설이다. 이 숫자와 비교 시트의 컷 시각을 맞춰 어느 화면·대본에서 떠났는지 본다.`, '');
  const bySec = usable.map((x) => x.drops[0].fromSec).sort((a, b) => a - b);
  const medianSec = bySec[Math.floor(bySec.length / 2)];
  out.push(`- 편마다 가장 큰 이탈이 시작된 시각의 중앙값: ${num(medianSec)}초 (${usable.length}편)`);
  for (const x of usable.slice(0, 10)) { // allow-literal: 화면에 보여 줄 최대 편수
    const d = x.drops[0];
    out.push(`- ${x.format === 'SHORTS' ? '쇼츠' : '롱폼'} ${num(x.durationSeconds)}초 「${cut(x.title, 30)}」: 가장 큰 이탈 ${num(d.fromSec)}~${num(d.toSec)}초(${(d.drop * 100).toFixed(1)}%p), 끝까지 ${x.watchAt?.end == null ? '측정 전' : `${(x.watchAt.end * 100).toFixed(0)}%`}`);
  }
  out.push('');
  return out;
}

const readJson = (path, fallback) => {
  try { return JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')); } catch { return fallback; }
};
function readRetention(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => readJson(join(dir, f), null)).filter((j) => j && !j.empty);
}


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
    baselines: readJson(join(dataDir, 'baselines.json'), null),
    variableGroups: groupResultsByVariable(loadSheets()),
    retention: readRetention(join(dataDir, 'retention')),
    studio: readJson(join(dataDir, 'studio-metrics.json'), null),
    titles,
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
