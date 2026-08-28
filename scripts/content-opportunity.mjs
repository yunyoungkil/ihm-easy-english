// Ports the `my_channel_fit_score` concept from github.com/yunyoungkil/project1
// (research/my_channel.py, compute_topic_scores()) into this project's own
// Node/JSON data pipeline, scoped to data we actually have.
//
// project1's `content_opportunity_score = market_demand_score * (my_channel_fit_score / 100)`
// needs a competitor outlier-detection pipeline (market_demand_score) that doesn't exist
// here yet. Rather than fabricate that half, this script computes ONLY my_channel_fit_score —
// "does this format/topic retain viewers better or worse than our channel average?" — using
// `data/youtube/analytics-latest.json`, which we already sync.
//
// Formula (project1): fitScore = clip(50 * groupAvgRetentionRatio, 0, 100), where 50 is the
// neutral midpoint (a group performing exactly at baseline scores 50).
//
// One correction versus a direct port: YouTube Shorts retention (`averageViewPercentage`) can
// exceed 100% because viewers loop a short multiple times; long-form (VIDEO_ON_DEMAND) cannot.
// A single channel-wide average would silently penalize every long-form video just for being a
// different format. So the baseline is computed PER `creatorContentType`, and each video's
// retention is expressed as a ratio to its own type's baseline before grouping/averaging — this
// keeps mixed-format groups (e.g. one season1 rule spans a long-form + two shorts) comparable.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const analyticsPath = join(projectDir, "data", "youtube", "analytics-latest.json");
const outputPath = join(projectDir, "data", "youtube", "content-opportunity.json");

// Season1 curriculum (knowledge/content-formats.md, CLAUDE.md). EP4-5 predate this
// classification pipeline and aren't confirmed to a single rule, so left unmapped
// rather than guessed.
const EPISODE_RULE = {
  6: "-TION",
  7: "-SION",
  8: "-TURE",
  9: "-CIAL",
  10: "시즌1 총정리",
};

function average(values) {
  const nums = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function fitScoreFromRatio(avgRatio) {
  if (avgRatio === null) return null;
  return Math.max(0, Math.min(100, 50 * avgRatio));
}

function summarize(rows) {
  return {
    videoCount: rows.length,
    avgRetention: average(rows.map((r) => r.averageViewPercentage)),
    avgRetentionRatio: average(rows.map((r) => r.retentionRatio)),
    avgViews: average(rows.map((r) => r.views)),
    avgSubscriberNet: average(rows.map((r) => r.subscriberNet)),
    contentTypes: [...new Set(rows.map((r) => r.creatorContentType))],
  };
}

function rank(groups, labelKey) {
  return [...groups.entries()]
    .map(([label, rows]) => {
      const stats = summarize(rows);
      return { [labelKey]: label, ...stats, fitScore: fitScoreFromRatio(stats.avgRetentionRatio) };
    })
    .sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1));
}

const analytics = JSON.parse(readFileSync(analyticsPath, "utf8"));
const classifications = analytics.classifications ?? {};
const performanceRaw = analytics.videoPerformance ?? [];

// Per-content-type baseline (SHORTS vs VIDEO_ON_DEMAND retain very differently by design).
const baselineByType = new Map();
for (const type of new Set(performanceRaw.map((p) => p.creatorContentType))) {
  const rows = performanceRaw.filter((p) => p.creatorContentType === type);
  baselineByType.set(type, average(rows.map((p) => p.averageViewPercentage)));
}

const performance = performanceRaw.map((p) => {
  const baseline = baselineByType.get(p.creatorContentType);
  return {
    ...p,
    retentionRatio: baseline ? p.averageViewPercentage / baseline : null,
  };
});
const perfById = new Map(performance.map((p) => [p.video, p]));

// --- Group by role: 롱폼(LONG) / Track A / Track B / 그 외 카테고리 ---
const byRole = new Map();
for (const [videoId, cls] of Object.entries(classifications)) {
  const perf = perfById.get(videoId);
  if (!perf) continue;
  const key = cls.category === "SEASON" ? `SEASON-${cls.role}` : cls.category;
  if (!byRole.has(key)) byRole.set(key, []);
  byRole.get(key).push(perf);
}

// --- Group by season1 발음 규칙 (SEASON 카테고리, EP6~10만, 롱폼+쇼츠 섞여도 정규화된 비율로 비교) ---
const byRule = new Map();
for (const [videoId, cls] of Object.entries(classifications)) {
  if (cls.category !== "SEASON") continue;
  const rule = EPISODE_RULE[cls.episode];
  if (!rule) continue;
  const perf = perfById.get(videoId);
  if (!perf) continue;
  if (!byRule.has(rule)) byRule.set(rule, []);
  byRule.get(rule).push(perf);
}

// market-demand.mjs (scripts/market-demand.mjs) computes the other half of
// project1's content_opportunity_score — competitor outlier signal, keyed by
// search keyword rather than our internal role/rule taxonomy. The two don't
// share an axis (our byRule is past season1 sound-rules; market demand is
// general audience search terms), so this is surfaced alongside byRole/byRule
// rather than force-multiplied into them — matching a keyword to a candidate
// topic is a judgment call made at ideation time, not a fixed table join.
const marketDemandPath = join(projectDir, "data", "youtube", "market-demand.json");
const marketDemand = existsSync(marketDemandPath) ? JSON.parse(readFileSync(marketDemandPath, "utf8")) : null;

const result = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceAnalyticsSyncedAt: analytics.syncedAt,
  note:
    "my_channel_fit_score (github.com/yunyoungkil/project1의 research/my_channel.py 이식). " +
    "fitScore 50 = 해당 콘텐츠 타입 평균과 동일, 50 초과 = 평균보다 유지율 높음. " +
    "SHORTS(반복 재생으로 100% 초과 가능)와 VIDEO_ON_DEMAND(단일 재생)는 유지율 스케일이 달라 " +
    "타입별 자체 기준선 대비 비율(retentionRatio)로 정규화한 뒤 비교함. " +
    (marketDemand
      ? "market_demand_score(경쟁 채널 outlier 비교, scripts/market-demand.mjs)는 marketDemand 필드에 " +
        "키워드별로 별도 표시함 — byRole/byRule과 축이 달라 곱하지 않았음. 새 소재 후보를 이 키워드들과 " +
        "매칭해 판단할 것."
      : "market_demand_score는 아직 계산 안 됨 — `node scripts/market-demand.mjs` 실행 후 다시 돌리면 포함됨."),
  baselineRetentionByContentType: Object.fromEntries(baselineByType),
  byRole: rank(byRole, "role"),
  byRule: rank(byRule, "rule"),
  marketDemand: marketDemand
    ? {
        generatedAt: marketDemand.generatedAt,
        channelsAnalyzed: marketDemand.channelsAnalyzed,
        byKeyword: marketDemand.byKeyword.map((k) => ({
          keyword: k.keyword,
          marketDemandScore: k.marketDemandScore,
          videoCount: k.videoCount,
        })),
      }
    : null,
};

writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
console.log(JSON.stringify(result, null, 2));
