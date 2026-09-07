// Completes the `content_opportunity_score` formula documented in
// knowledge/decisions/2026-08-25-content-opportunity-score.md:
//
//   content_opportunity_score = market_demand_score * (my_channel_fit_score / 100)
//
// content-opportunity.mjs already computes my_channel_fit_score from OUR OWN
// analytics. This script computes the other half — market_demand_score — by
// searching YouTube for small/mid Korean English-pronunciation channels and
// finding videos that significantly OUTPERFORM their own channel's typical
// video. An outlier isn't "this channel is popular" (channel size already
// explains that) — it's "this specific topic pulled unusually well even for
// this channel," which is the actual demand signal a fitScore multiplier
// should carry. project1 (github.com/yunyoungkil/project1) did this as
// youtube_search.py / channel_baseline.py / outlier_detector.py; that repo
// isn't available locally, so this is a reimplementation from the documented
// concept, not a port.
//
// Quota (YouTube Data API v3, free daily quota, not billed): search.list costs
// 100 units/call — the expensive step — so the keyword pool stays small and is
// called exactly once per keyword. channels.list/playlistItems.list/videos.list
// are ~1 unit/call and batched up to 50 ids where the API allows it. Total for
// the default 6-keyword pool: ~600 (search) + a few dozen ≈ well under the
// 10,000/day quota, leaving room for other YouTube API work the same day.
//
// Usage:
//   node scripts/market-demand.mjs                       # full pool run, upserts into the JSON
//   node scripts/market-demand.mjs --dry-run              # print keyword pool + quota estimate, no calls
//   node scripts/market-demand.mjs --keyword="WANT TO 축약"  # check ONE ad-hoc candidate idea instead of
//   node scripts/market-demand.mjs --keyword="A" --keyword="B"  # of the fixed pool (repeatable flag).
//                                                          # Upserts into the existing byKeyword array —
//                                                          # other keywords already in the file are kept.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(projectDir, "data", "youtube", "market-demand.json");

const dryRun = process.argv.includes("--dry-run");

// Grounded in knowledge/content-formats.md ("영어 발음·듣기 원리", 시즌2 "문장 속 연결·축약·리듬")
// and channel-strategy.md's 왕초보 audience framing. Keep this pool SHORT — each
// entry is a 100-unit search.list call.
const DEFAULT_KEYWORD_POOL = [
  "영어 발음 규칙",
  "영어 발음 원리",
  "영어 연음 축약",
  "왕초보 영어 발음",
  "영어 듣기 안 들리는 이유",
  "미국식 발음 규칙",
];

// --keyword="..." (repeatable): check specific candidate ideas on demand
// instead of the fixed pool — e.g. validating a teased next-episode topic
// ("그럼 WANT TO는요?") before committing to it, rather than waiting for it
// to show up in the general sweep.
const adHocKeywords = process.argv
  .filter((a) => a.startsWith("--keyword="))
  .map((a) => a.slice("--keyword=".length))
  .filter(Boolean);
const KEYWORD_POOL = adHocKeywords.length > 0 ? adHocKeywords : DEFAULT_KEYWORD_POOL;

// Below this many observed videos, a keyword's score is one or two data
// points wearing a median's clothes — channel-strategy.md's "작은 표본은
// 성공으로 과장하지 않는다" applies to reporting the number, not just to
// capping it.
const LOW_SAMPLE_THRESHOLD = 3;

// Exclude channels far outside our own scale (99 subscribers as of the
// original decision doc) — a mega-channel's outliers reflect algorithmic
// reach we don't have, not topic-level demand a channel our size could repeat.
const MAX_SUBSCRIBERS = 100_000;
const MAX_CHANNELS = 30; // cap total channels analyzed, regardless of how many the searches surface
const VIDEOS_PER_CHANNEL_BASELINE = 25; // recent uploads sampled per channel for its own baseline

function estimateQuota() {
  const search = KEYWORD_POOL.length * 100;
  const channelsList = 1; // batched, single call for <=50 ids
  const playlistItems = MAX_CHANNELS; // 1 call per channel
  const videosList = Math.ceil((MAX_CHANNELS * VIDEOS_PER_CHANNEL_BASELINE) / 50) + 1;
  return { search, channelsList, playlistItems, videosList, total: search + channelsList + playlistItems + videosList };
}

if (dryRun) {
  const est = estimateQuota();
  console.log(`키워드 풀 (${KEYWORD_POOL.length}개):`);
  KEYWORD_POOL.forEach((k) => console.log(`  - ${k}`));
  console.log(`\n예상 쿼터 사용량:`);
  console.log(`  search.list:        ${est.search} units (${KEYWORD_POOL.length} calls x 100)`);
  console.log(`  channels.list:      ${est.channelsList} units`);
  console.log(`  playlistItems.list: ~${est.playlistItems} units`);
  console.log(`  videos.list:        ~${est.videosList} units`);
  console.log(`  합계:               ~${est.total} / 10,000 daily units`);
  process.exit(0);
}

process.loadEnvFile(join(projectDir, ".env"));
const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("✗ .env에 YOUTUBE_API_KEY가 없습니다.");
  process.exit(1);
}

const BASE = "https://www.googleapis.com/youtube/v3";

async function apiGet(path, params) {
  const url = new URL(`${BASE}/${path}`);
  url.search = new URLSearchParams({ ...params, key: API_KEY });
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const reason = data.error?.errors?.[0]?.reason ?? res.status;
    throw new Error(`YouTube API ${path} failed: ${reason} — ${data.error?.message ?? "unknown"}`);
  }
  return data;
}

function median(nums) {
  const sorted = [...nums].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ISO 8601 duration ("PT4M13S") → seconds. 이 프로젝트의 기존 관례
// (youtube-analytics-server.mjs의 durationSeconds/creatorContentType)와 동일하게
// 60초 이하를 쇼츠로 판정한다 — 다른 곳과 기준을 다르게 두지 않기 위함.
function durationSecondsFromIso(iso) {
  const match = String(iso || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const [, h, m, s] = match;
  return Number(h || 0) * 3600 + Number(m || 0) * 60 + Number(s || 0);
}

// Common particles/punctuation/emoji noise stripped before counting title
// words — not real Korean morphological analysis, just enough to keep
// frequent CONTENT words (not grammar glue) visible in the output.
const TITLE_STOPWORDS = new Set([
  "이", "그", "저", "이것", "저것", "그것", "우리", "당신", "너", "나", "제",
  "이유", "방법", "정리", "꿀팁", "완벽", "총정리", "1편", "2편", "3편",
]);
const TITLE_NOISE_RE = /[#|｜\-–—()【】\[\]{}!?！？.,·:：'"'"~*✨🔥😅😭💯👍🎯]/g;

function extractTitlePatterns(rows, minOutlierRatio = 1.5) {
  const counts = new Map();
  for (const r of rows) {
    if (r.outlierRatio < minOutlierRatio) continue;
    const tokens = r.title
      .replace(TITLE_NOISE_RE, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2 && !TITLE_STOPWORDS.has(t) && !/^[0-9]+$/.test(t));
    for (const t of new Set(tokens)) { // count each word once per title, not per repeat
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2) // must recur across at least 2 different overperforming titles
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word, count]) => ({ word, titleCount: count }));
}

async function main() {
  console.log(`쿼터 예상: ~${estimateQuota().total} units\n`);

  // 1. search.list per keyword (type=video, Korean region/language bias) —
  //    finds channels actually making relevant content, not just channels
  //    whose ABOUT page happens to mention the keyword.
  const candidateByChannel = new Map(); // channelId -> { keywords: Set, videoIds: Set }
  const totalResultsByKeyword = new Map(); // keyword -> YouTube's approximate total match count (saturation proxy)
  for (const keyword of KEYWORD_POOL) {
    console.log(`검색 중: "${keyword}"`);
    const data = await apiGet("search", {
      q: keyword,
      part: "snippet",
      type: "video",
      order: "relevance",
      maxResults: "50", // search.list costs the same 100 units regardless of count — take the max
      regionCode: "KR",
      relevanceLanguage: "ko",
    });
    totalResultsByKeyword.set(keyword, data.pageInfo?.totalResults ?? null);
    for (const item of data.items ?? []) {
      const channelId = item.snippet?.channelId;
      const videoId = item.id?.videoId;
      if (!channelId || !videoId) continue;
      if (!candidateByChannel.has(channelId)) {
        candidateByChannel.set(channelId, { keywords: new Set(), videoIds: new Set() });
      }
      const entry = candidateByChannel.get(channelId);
      entry.keywords.add(keyword);
      entry.videoIds.add(videoId);
    }
  }
  console.log(`\n후보 채널 ${candidateByChannel.size}개 발견`);

  // 2. channels.list (batched) — subscriberCount for the small-channel filter,
  //    uploads playlist id for each channel's own baseline sample.
  const channelIds = [...candidateByChannel.keys()].slice(0, MAX_CHANNELS * 2); // over-fetch before filtering
  const channelMeta = new Map();
  for (const batch of chunk(channelIds, 50)) {
    const data = await apiGet("channels", {
      id: batch.join(","),
      part: "snippet,statistics,contentDetails",
    });
    for (const item of data.items ?? []) {
      channelMeta.set(item.id, {
        title: item.snippet?.title,
        subscriberCount: Number(item.statistics?.subscriberCount ?? NaN),
        uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
      });
    }
  }

  const smallChannels = [...channelMeta.entries()]
    .filter(([, meta]) => Number.isFinite(meta.subscriberCount) && meta.subscriberCount <= MAX_SUBSCRIBERS && meta.uploadsPlaylistId)
    .slice(0, MAX_CHANNELS);
  console.log(`구독자 ${MAX_SUBSCRIBERS.toLocaleString()}명 이하 채널 ${smallChannels.length}개로 필터링`);

  if (smallChannels.length === 0) {
    console.warn("⚠ 조건에 맞는 소형 채널이 없습니다. MAX_SUBSCRIBERS를 조정하거나 키워드 풀을 바꿔보세요.");
  }

  // 3. playlistItems.list per channel — recent uploads for that channel's own baseline.
  const baselineVideoIds = new Map(); // channelId -> videoId[]
  for (const [channelId, meta] of smallChannels) {
    try {
      const data = await apiGet("playlistItems", {
        playlistId: meta.uploadsPlaylistId,
        part: "contentDetails",
        maxResults: String(VIDEOS_PER_CHANNEL_BASELINE),
      });
      baselineVideoIds.set(
        channelId,
        (data.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean),
      );
    } catch (e) {
      console.warn(`  ⚠ ${meta.title}: ${e.message}`);
    }
  }

  // 4. videos.list (batched) — viewCount + publishedAt for every video we're
  //    tracking (both keyword-matched candidates and each channel's baseline
  //    sample). Raw lifetime view count is NOT comparable across videos of
  //    different ages — a 3-year-old video and a 3-day-old upload both
  //    "accumulate" views, just for very different amounts of time. Every
  //    comparison below uses views-PER-DAY-SINCE-PUBLISH instead.
  const allVideoIds = new Set();
  for (const [channelId] of smallChannels) {
    for (const id of candidateByChannel.get(channelId)?.videoIds ?? []) allVideoIds.add(id);
    for (const id of baselineVideoIds.get(channelId) ?? []) allVideoIds.add(id);
  }
  const MS_PER_DAY = 86_400_000;
  const now = Date.now();
  const videoStats = new Map(); // videoId -> { viewCount, viewsPerDay, channelId, title, publishedAt, durationSeconds, isShort }
  for (const batch of chunk([...allVideoIds], 50)) {
    // contentDetails를 같이 요청해도 videos.list 쿼터 비용은 그대로다(파트 개수가 아니라 호출
    // 1회당 ~1 unit) — 롱폼/쇼츠 구분 신호(duration)를 추가로 얻는데 추가 비용이 없다.
    const data = await apiGet("videos", { id: batch.join(","), part: "snippet,statistics,contentDetails" });
    for (const item of data.items ?? []) {
      const viewCount = Number(item.statistics?.viewCount ?? NaN);
      const publishedAt = item.snippet?.publishedAt;
      const ageDays = publishedAt ? Math.max(1, (now - new Date(publishedAt).getTime()) / MS_PER_DAY) : null;
      const durationSeconds = durationSecondsFromIso(item.contentDetails?.duration);
      videoStats.set(item.id, {
        viewCount,
        viewsPerDay: ageDays ? viewCount / ageDays : null,
        ageDays: ageDays ? Math.round(ageDays) : null,
        channelId: item.snippet?.channelId,
        title: item.snippet?.title,
        publishedAt,
        durationSeconds,
        isShort: durationSeconds != null ? durationSeconds <= 60 : null,
      });
    }
  }

  // 5. Per-channel baseline (median views/day of its recent uploads — median
  //    over mean so one viral fluke doesn't drag the baseline itself up).
  const channelBaseline = new Map();
  for (const [channelId, videoIds] of baselineVideoIds) {
    const rates = videoIds.map((id) => videoStats.get(id)?.viewsPerDay).filter((v) => Number.isFinite(v));
    channelBaseline.set(channelId, median(rates));
  }

  // 6. Outlier ratio per keyword-matched video vs its own channel's baseline,
  //    aggregated per keyword. 50 = performs like a typical video for that
  //    channel (matches fitScore's neutral midpoint so the two multiply sensibly).
  const byKeyword = new Map();
  for (const [channelId, entry] of candidateByChannel) {
    if (!smallChannels.some(([id]) => id === channelId)) continue;
    const baseline = channelBaseline.get(channelId);
    if (!baseline) continue;
    for (const videoId of entry.videoIds) {
      const stat = videoStats.get(videoId);
      if (!stat || !Number.isFinite(stat.viewsPerDay)) continue;
      const ratio = stat.viewsPerDay / baseline;
      for (const keyword of entry.keywords) {
        if (!byKeyword.has(keyword)) byKeyword.set(keyword, []);
        byKeyword.get(keyword).push({
          videoId,
          title: stat.title,
          channelId,
          channelTitle: channelMeta.get(channelId)?.title,
          viewCount: stat.viewCount,
          publishedAt: stat.publishedAt,
          ageDays: stat.ageDays,
          viewsPerDay: Math.round(stat.viewsPerDay * 10) / 10,
          channelBaselineViewsPerDay: Math.round(baseline * 10) / 10,
          outlierRatio: ratio,
          durationSeconds: stat.durationSeconds,
          isShort: stat.isShort,
        });
      }
    }
  }

  // Cap at 5x: beyond that, one video is doing all the work of "proving
  // demand" and the ratio is more likely noise (a single viral fluke, or a
  // channel whose current baseline no longer resembles when that video was
  // made) than a repeatable signal. See knowledge/channel-strategy.md —
  // "작은 표본은 성공으로 과장하지 않는다."
  const RATIO_CAP = 5;
  const marketDemandByKeyword = [...byKeyword.entries()]
    .map(([keyword, rows]) => {
      const cappedRatios = rows.map((r) => Math.min(RATIO_CAP, r.outlierRatio));
      const avgRatio = median(cappedRatios);
      const lowSample = rows.length < LOW_SAMPLE_THRESHOLD;
      const marketDemandScore = avgRatio !== null ? Math.round(Math.max(0, 50 * avgRatio) * 10) / 10 : null;
      const totalResults = totalResultsByKeyword.get(keyword) ?? null;
      // Saturation discount: log-scaled so it separates hundreds of
      // competing videos from hundreds of thousands without a linear
      // divide-by-totalResults swinging wildly on YouTube's rounding of its
      // own approximate count. Rough heuristic, not a precise calculation —
      // read it as "demand relative to how crowded this keyword already is,"
      // never as a calibrated probability.
      const opportunityScore =
        marketDemandScore !== null && totalResults
          ? Math.round((marketDemandScore / Math.log10(totalResults + 10)) * 10) / 10
          : null;
      return {
        keyword,
        analyzedAt: new Date().toISOString(), // 이 키워드가 실제로 마지막으로 (재)분석된 시각.
        // 전체 결과 파일의 generatedAt과는 다르다 — generatedAt은 파일을 마지막으로 쓴 시각이라
        // ad-hoc으로 키워드 하나만 돌려도 안 건드린 다른 키워드까지 갱신된 것처럼 보인다.
        // 대시보드가 "이미 분석된 키워드입니다" 중복 경고를 정확한 날짜로 보여주려면 필요하다.
        videoCount: rows.length,
        confidence: lowSample ? "low" : "ok",
        lowSampleWarning: lowSample
          ? `표본 ${rows.length}개뿐 — ${LOW_SAMPLE_THRESHOLD}개 미만은 median이 사실상 최댓값과 같아 과대평가 위험. 참고용으로만 쓸 것.`
          : null,
        marketDemandScore,
        totalResults, // YouTube's own approximate match count for this keyword — saturation proxy
        opportunityScore, // marketDemandScore discounted by how crowded the keyword already is
        titlePatterns: extractTitlePatterns(rows), // recurring words across overperforming titles — the "angle", not just the topic
        topOutliers: rows.sort((a, b) => b.outlierRatio - a.outlierRatio).slice(0, 3).map((r) => ({
          videoId: r.videoId,
          title: r.title,
          channelTitle: r.channelTitle,
          viewCount: r.viewCount,
          publishedAt: r.publishedAt,
          ageDays: r.ageDays,
          viewsPerDay: r.viewsPerDay,
          channelBaselineViewsPerDay: r.channelBaselineViewsPerDay,
          outlierRatio: Math.round(r.outlierRatio * 100) / 100,
          durationSeconds: r.durationSeconds,
          isShort: r.isShort,
        })),
      };
    })
    .sort((a, b) => (b.opportunityScore ?? b.marketDemandScore ?? -1) - (a.opportunityScore ?? a.marketDemandScore ?? -1));

  // Upsert into any existing file by keyword — a --keyword ad-hoc check
  // shouldn't erase the default pool's results, and re-running the default
  // pool shouldn't erase keywords someone checked ad-hoc earlier.
  const existing = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;
  const mergedByKeyword = new Map((existing?.byKeyword ?? []).map((k) => [k.keyword, k]));
  for (const entry of marketDemandByKeyword) mergedByKeyword.set(entry.keyword, entry);
  const allByKeyword = [...mergedByKeyword.values()].sort(
    (a, b) => (b.opportunityScore ?? b.marketDemandScore ?? -1) - (a.opportunityScore ?? a.marketDemandScore ?? -1),
  );

  const result = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    note:
      "market_demand_score = 50 * (영상의 하루당 조회수 / 그 채널 최근 업로드의 하루당 조회수 중앙값)의 중앙값, " +
      "채널별 비율은 5배에서 캡. 50 = 그 채널의 평균적인 영상과 같은 성과, 50 초과 = 그 채널 기준으로도 " +
      "이례적으로 잘된 주제. 조회수는 게시 후 경과일로 나눠 비교함 — 오래된 영상이 최근 업로드보다 " +
      "누적 조회수가 항상 많은 건 당연해서, 원 조회수로 비교하면 무조건 오래된 영상이 이긴다(실측: " +
      "정규화 전엔 6개 키워드 전부 상한(150)을 그대로 찍어서 버그로 확인, 이 보정 이후 값임). " +
      "채널 크기 효과를 최대한 제거하기 위해 채널별 자체 기준선 대비 비율로만 비교함(우리 채널과 비슷한 " +
      `구독자 ${MAX_SUBSCRIBERS.toLocaleString()}명 이하 채널만 포함). 표본 ${LOW_SAMPLE_THRESHOLD}개 미만은 ` +
      '`confidence: "low"`로 표시함. content-opportunity.mjs가 이 파일과 my_channel_fit_score를 나란히 표시함 ' +
      "(곱하지 않음 — knowledge/decisions/2026-08-29-market-demand-score.md 참고). " +
      "--keyword=로 특정 후보 아이디어만 골라 확인 가능(기존 키워드는 보존, upsert). " +
      "opportunityScore = marketDemandScore / log10(totalResults+10) — 수요가 높아도 이미 포화된(totalResults " +
      "큰) 키워드는 할인함. 정밀 계산이 아니라 대략적인 경쟁 밀도 보정이니 참고용으로만 쓸 것. " +
      "titlePatterns = 그 채널 기준으로 이례적으로(outlierRatio≥1.5) 잘 된 영상들의 제목에서 2회 이상 " +
      "반복된 단어 — 무슨 주제를 다룰지가 아니라 어떤 각도/후킹으로 제목을 달지에 대한 신호.",
    keywordPool: DEFAULT_KEYWORD_POOL,
    lastRunKeywords: KEYWORD_POOL,
    channelsAnalyzed: smallChannels.length,
    byKeyword: allByKeyword,
  };

  writeFileSync(outputPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`\n✓ ${outputPath}`);
  for (const k of marketDemandByKeyword) {
    if (k.confidence === "low") console.warn(`⚠ "${k.keyword}": ${k.lowSampleWarning}`);
  }
  console.log(JSON.stringify(
    marketDemandByKeyword.map((k) => ({
      keyword: k.keyword,
      marketDemandScore: k.marketDemandScore,
      totalResults: k.totalResults,
      opportunityScore: k.opportunityScore,
      videoCount: k.videoCount,
      confidence: k.confidence,
      titlePatterns: k.titlePatterns.map((p) => p.word),
    })),
    null,
    2,
  ));
}

main().catch((err) => {
  console.error(`\n✗ ${err.message}`);
  process.exit(1);
});
