// Completes the `content_opportunity_score` formula documented in
// knowledge/decisions/2026-08-25-content-opportunity-score.md:
//
//   content_opportunity_score = market_demand_score * (my_channel_fit_score / 100)
//
// (content-opportunity.mjs, which computed my_channel_fit_score, was removed on
// 2026-11-12: nothing read its output — knowledge/data-consumption-map.md.)
// This script computes market_demand_score by
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
//   node scripts/market-demand.mjs --channel="https://www.youtube.com/@handle"  # 2026-09-30 추가 —
//                                                          # 사용자가 직접 지목한 특정 경쟁 채널 하나를
//                                                          # 깊이 분석한다(키워드 검색으로는 우연히
//                                                          # 걸리지 않을 수 있는 채널 대응 — 채널 이름
//                                                          # 검색은 search.list 100단위+오검색 위험이
//                                                          # 있어 의도적으로 안 씀, channels.list
//                                                          # forHandle=은 1단위+100% 정확). URL/@핸들/
//                                                          # 순수 채널ID(UC...) 아무거나 받는다. 이
//                                                          # 모드는 키워드 풀 검색을 완전히 건너뛰고
//                                                          # (search.list 비용 없음) trackedChannels
//                                                          # 배열에만 upsert한다 — byKeyword는 안 건드림.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { syncAllTrackedChannels, runD7AutonomousCycle, loadPlannedSources, loadOutlierReportChannels } from "./competitor-lifecycle.mjs";
import { mergeKeywordAnalysisEntries } from "./keyword-backlog.mjs";
import { loadEpisodeOutcomes } from "./planning-outcome.mjs";
import { computePeerRatio, isComparableRatio, ratioTier, RATIO_METHOD } from "./peer-ratio.mjs";

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

// --channel="..." — 특정 채널 하나 지목 분석 모드. 키워드 풀 검색을 완전히 스킵한다.
const channelArg = process.argv.find((a) => a.startsWith("--channel="));
const CHANNEL_INPUT = channelArg ? channelArg.slice("--channel=".length) : null;

// --sync-all-tracked — 등록된 전체 추적 채널의 최신 영상 및 아웃라이어 일괄 동기화 모드
const SYNC_ALL_TRACKED = process.argv.includes("--sync-all-tracked");

// --d7-sync — 공개 7일(D+7) 경과 영상의 성과 검증 및 키워드/채널 자율 순환 모드 (2026-11-11)
const D7_SYNC = process.argv.includes("--d7-sync");

if (D7_SYNC) {
  const current = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : {};
  const catalogPath = join(projectDir, "data", "youtube", "catalog.json");
  const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, "utf8")) : null;
  const catalogVideos = Array.isArray(catalog?.videos) ? catalog.videos : (Array.isArray(catalog) ? catalog : []);

  const analyticsPath = join(projectDir, "data", "youtube", "analytics-latest.json");
  const analyticsData = existsSync(analyticsPath) ? JSON.parse(readFileSync(analyticsPath, "utf8")) : {};

  const now = new Date();
  const result = runD7AutonomousCycle({
    marketDemandData: current,
    analyticsData,
    episodeOutcomes: loadEpisodeOutcomes(projectDir, now),
    catalogVideos,
    plannedSources: loadPlannedSources(projectDir),
    outlierReports: loadOutlierReportChannels(projectDir),
    now,
  });

  writeFileSync(outputPath, JSON.stringify(result.marketDemandData, null, 2), "utf8");
  console.log(`[D+7 자율 순환 완료] 반영한 판정: ${result.applied.map((a) => `${a.label} ${a.verdict} ${a.ratio}배 → ${a.channels.join('·') || '근거 채널 없음'}`).join(', ') || '없음'} (보류 ${result.marketDemandData.d7AutonomousCycle.holdCount}편)`);
  console.log(`- 황금 광산 승격 채널: ${result.promotedChannels.join(', ') || '없음'}`);
  console.log(`- 기획 근거 채널 신규 등록: ${result.registeredChannels.join(', ') || '없음'}${result.unregisteredChannels.length ? ` (등록 못 함 ${result.unregisteredChannels.length}곳: ${result.unregisteredChannels.map((u) => `${u.channelId} ${u.reason}`).join('; ')})` : ''}`);
  console.log(`- 신규 발굴 검색어: ${result.discoveredKeywords.join(', ') || '없음'}`);
  process.exit(0);
}

function applyLifecycle(data) {
  const catalogPath = join(projectDir, "data", "youtube", "catalog.json");
  const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, "utf8")) : null;
  const videos = Array.isArray(catalog?.videos) ? catalog.videos : (Array.isArray(catalog) ? catalog : []);
  return syncAllTrackedChannels(data, videos, new Date());
}

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
// 채널당 비교용으로 받는 최근 업로드 수. 25편이면 같은 형식 영상이 얼마 안 남아 분모가 흔들린다
// (조밥잉글리쉬 쇼츠 실측 2026-11-15: 최근 25편 기준 29.5배, 50편 기준 20.4배). playlistItems 한 번이 최대 50편이라 호출 수는 같고
// 채널 지목 경로(CHANNEL_VIDEOS_SAMPLE)와 같은 50으로 맞춘다. 가설: 더 늘리면 안정되는지는 아직 모른다.
const VIDEOS_PER_CHANNEL_BASELINE = 50;

function estimateQuota() {
  const search = KEYWORD_POOL.length * 100;
  const channelsList = 1; // batched, single call for <=50 ids
  const playlistItems = MAX_CHANNELS; // 1 call per channel
  const videosList = Math.ceil((MAX_CHANNELS * VIDEOS_PER_CHANNEL_BASELINE) / 50) + 1;
  return { search, channelsList, playlistItems, videosList, total: search + channelsList + playlistItems + videosList };
}

if (dryRun && CHANNEL_INPUT) {
  console.log(`채널 지목 분석 모드: "${CHANNEL_INPUT}"`);
  console.log(`예상 쿼터: channels.list 1 + playlistItems.list 1 + videos.list ~2 ≈ 4 units (search.list 없음)`);
  process.exit(0);
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

// 유튜브가 채널마다 자동으로 두는 쇼츠 전용 재생목록(UC…→UUSH…)의 최근 영상. 쇼츠는 최대 3분이라
// 길이만으로는 61~180초 쇼츠를 못 가려낸다(youtube-analytics-server.mjs의 getChannelShortsIds와 같은 기준).
// 쇼츠가 없는 채널은 재생목록이 없어 실패하므로 빈 목록으로 본다. 호출당 1 unit.
async function fetchRecentShortsIds(channelId) {
  if (!channelId?.startsWith("UC")) return new Set();
  try {
    const data = await apiGet("playlistItems", { playlistId: `UUSH${channelId.slice(2)}`, part: "contentDetails", maxResults: "50" });
    return new Set((data.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean));
  } catch {
    return new Set();
  }
}

// ISO 8601 duration ("PT4M13S") → seconds.
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

// 채널 URL/@핸들/순수 채널ID 어느 형태로 넣어도 받는다 — 사용자가 브라우저 주소창에서
// 그대로 복붙하는 게 제일 흔한 입력 방식이라, 파싱을 이쪽에서 흡수하고 그 뒤 로직은
// "handle 문자열" 또는 "channelId 문자열" 둘 중 하나만 알면 되게 정리한다.
// 이름으로 검색(search.list type=channel)하는 방식은 의도적으로 안 만든다 — 100단위 비용에
// 동명이인 채널을 잘못 짚어도 티가 안 나는 위험까지 있어서(2026-09-30 사용자와 논의 후 결정).
function resolveChannelInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  // /channel/UCxxxxxxxx 형태 — 채널ID 그대로 쓸 수 있는 유일한 URL 패턴
  const channelIdMatch = s.match(/\/channel\/(UC[\w-]{10,})/);
  if (channelIdMatch) return { type: "id", value: channelIdMatch[1] };
  // 순수 채널ID를 직접 붙여넣은 경우
  if (/^UC[\w-]{10,}$/.test(s)) return { type: "id", value: s };
  // /@handle 형태(URL 안에 있든, "@handle"만 붙여넣었든)
  const handleMatch = s.match(/@([^/?#\s]+)/);
  if (handleMatch) return { type: "handle", value: `@${handleMatch[1]}` };
  // /c/이름, /user/이름 같은 레거시 URL — 핸들이 아니라 커스텀 URL이라 이 API로는 못 찾는다.
  if (/\/(c|user)\//.test(s)) return null;
  // 아무 기호 없이 이름만 온 경우, "@"를 붙여 핸들로 추정 시도(안 맞으면 channels.list가
  // 빈 결과를 주므로 아래 analyzeChannel()에서 명확한 에러로 처리된다 — 조용히 엉뚱한
  // 채널을 잡는 일은 없다).
  return { type: "handle", value: s.startsWith("@") ? s : `@${s}` };
}

// 특정 채널 하나를 깊이 분석한다 — 그 채널 자신의 최근 업로드 대비 어떤 영상이
// 유독 잘 됐는지(outlierRatio)를 같은 방법론(채널 자체 기준선 대비 비율)으로 계산한다.
// 키워드 검색 경로와 다른 점: 대상이 이미 확정돼 있으므로 search.list(100단위)가 전혀
// 필요 없고, MAX_SUBSCRIBERS 필터도 적용하지 않는다 — 사용자가 의도적으로 지목한
// 벤치마크 채널이면 우리보다 훨씬 크더라도(참고용으로) 그대로 보여준다. 다만 구독자
// 수는 결과에 그대로 실어서, 규모가 다르면 "수요 점수"가 아니라 "패턴 참고용"으로
// 읽어야 한다는 걸 화면에서 판단할 수 있게 한다.
async function analyzeChannel(rawInput) {
  const resolved = resolveChannelInput(rawInput);
  if (!resolved) {
    throw new Error(
      `채널을 인식할 수 없습니다: "${rawInput}". /channel/UC..., /@핸들, 또는 순수 핸들만 지원합니다` +
      `(/c/이름, /user/이름 같은 레거시 커스텀 URL은 API가 직접 못 찾습니다 — 채널 홈에서 "공유" ` +
      `버튼으로 정식 @핸들 링크를 다시 복사해 주세요).`
    );
  }

  const channelsData = await apiGet("channels", {
    [resolved.type === "id" ? "id" : "forHandle"]: resolved.value,
    part: "snippet,statistics,contentDetails",
  });
  const channelItem = channelsData.items?.[0];
  if (!channelItem) {
    throw new Error(`채널을 찾지 못했습니다: "${rawInput}" (${resolved.type}=${resolved.value}). 핸들 철자를 확인해 주세요.`);
  }

  const channelId = channelItem.id;
  const channelTitle = channelItem.snippet?.title;
  const subscriberCount = Number(channelItem.statistics?.subscriberCount ?? NaN);
  const uploadsPlaylistId = channelItem.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) {
    throw new Error(`"${channelTitle}" 채널의 업로드 목록을 가져올 수 없습니다.`);
  }

  // 한 번의 playlistItems.list 호출로 최대 50개까지 가져온다(추가 페이지네이션 없음 —
  // 채널 자체 기준선 산출엔 최근 50개면 충분하고, 더 받으려면 비용이 콜당 늘어난다).
  const CHANNEL_VIDEOS_SAMPLE = 50;
  const playlistData = await apiGet("playlistItems", {
    playlistId: uploadsPlaylistId,
    part: "contentDetails",
    maxResults: String(CHANNEL_VIDEOS_SAMPLE),
  });
  const videoIds = (playlistData.items ?? []).map((i) => i.contentDetails?.videoId).filter(Boolean);
  if (videoIds.length === 0) {
    throw new Error(`"${channelTitle}" 채널에 분석할 영상이 없습니다.`);
  }

  const shortsIds = await fetchRecentShortsIds(channelId);
  const MS_PER_DAY = 86_400_000;
  const now = Date.now();
  const rows = [];
  for (const batch of chunk(videoIds, 50)) {
    const data = await apiGet("videos", { id: batch.join(","), part: "snippet,statistics,contentDetails" });
    for (const item of data.items ?? []) {
      const viewCount = Number(item.statistics?.viewCount ?? NaN);
      const publishedAt = item.snippet?.publishedAt;
      const ageDays = publishedAt ? Math.max(1, (now - new Date(publishedAt).getTime()) / MS_PER_DAY) : null;
      const durationSeconds = durationSecondsFromIso(item.contentDetails?.duration);
      const viewsPerDay = ageDays ? viewCount / ageDays : null;
      rows.push({
        videoId: item.id,
        title: item.snippet?.title,
        viewCount,
        publishedAt,
        ageDays: ageDays ? Math.round(ageDays) : null,
        viewsPerDay,
        durationSeconds,
        isShort: durationSeconds != null ? durationSeconds <= 60 || shortsIds.has(item.id) : null,
      });
    }
  }

  // 배수 = 이 영상 누적 조회수 ÷ 같은 채널·같은 형식 최근 영상 조회수 중앙값(자기 제외). 정의와 가설 기준은 peer-ratio.mjs.
  // 공개 7일 미만은 "측정 중", 채널이 멈췄거나 비교 영상이 적으면 "판정 보류"라 값이 null이다(대신값 없음).
  const analyzedNow = new Date(now);
  const withRatio = rows
    .map((r) => ({ ...r, ...computePeerRatio({ video: r, channelVideos: rows, now: analyzedNow }) }))
    .filter((r) => r.ratioStatus !== "hold");
  const heldCount = rows.length - withRatio.length;

  const toOutlierRow = (r) => ({
    videoId: r.videoId,
    title: r.title,
    channelTitle,
    viewCount: r.viewCount,
    publishedAt: r.publishedAt,
    ageDays: r.ageDays,
    viewsPerDay: Number.isFinite(r.viewsPerDay) ? Math.round(r.viewsPerDay * 10) / 10 : null,
    outlierRatio: r.outlierRatio,
    ratioMethod: r.ratioMethod,
    ratioStatus: r.ratioStatus,
    ratioReason: r.ratioReason,
    ratioComputedAt: r.ratioComputedAt,
    ratioDenominator: r.ratioDenominator,
    ratioPeerCount: r.ratioPeerCount,
    durationSeconds: r.durationSeconds,
    isShort: r.isShort,
  });
  // 값이 있는 배수가 먼저, 그다음 측정 중. 값이 없는 영상끼리는 조회수 순이다.
  const rankTopOutliers = (list) => [...list]
    .sort((a, b) => ratioTier(a) - ratioTier(b) || (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0) || b.viewCount - a.viewCount)
    .slice(0, 5)
    .map(toOutlierRow);

  // 형식을 섞은 상위 5개 — 경쟁 탭·검색 피드의 키워드 아웃라이어가 읽는다(예전 idea-board.mjs는 2026-11-11 삭제)
  const topOutliers = rankTopOutliers(withRatio);
  // 형식별 상위 5개 — 쇼츠가 롱폼에 밀려 한 번도 안 뽑히는 문제를 막는다.
  // 쇼츠 여부는 길이 60초 이하로 판정한다(유튜브 Data API는 분류값을 주지 않음).
  const topOutliersByFormat = {
    long: rankTopOutliers(withRatio.filter((r) => r.isShort === false)),
    short: rankTopOutliers(withRatio.filter((r) => r.isShort === true)),
  };
  const formatCounts = {
    long: withRatio.filter((r) => r.isShort === false).length,
    short: withRatio.filter((r) => r.isShort === true).length,
    unknown: withRatio.filter((r) => r.isShort === null).length,
  };

  // extractTitlePatterns는 "이 채널 기준 이례적으로 잘 된 영상들"(전체 rows 중 outlierRatio≥1.5)의
  // 제목에서 반복 단어를 뽑는다 — topOutliers(상위 5개)보다 더 넓은 표본으로 패턴을 잡기 위해
  // withRatio 전체를 넘긴다.
  const titlePatterns = extractTitlePatterns(withRatio.filter(isComparableRatio).map((r) => ({ title: r.title, outlierRatio: r.outlierRatio })));

  return {
    channelId,
    channelTitle,
    handle: resolved.type === "handle" ? resolved.value : null,
    channelUrl: `https://www.youtube.com/channel/${channelId}`,
    subscriberCount: Number.isFinite(subscriberCount) ? subscriberCount : null,
    analyzedAt: new Date().toISOString(),
    videoCount: rows.length,
    ratioMethod: RATIO_METHOD,
    ratioHeldCount: heldCount, // 판정 보류라 topOutliers에서 뺀 영상 수
    // 옛 방식의 채널 하루 조회 기준선은 없앴다. 병합할 때 이전 값이 남지 않게 undefined로 덮는다(저장될 때 칸이 사라진다).
    channelBaselineViewsPerDay: undefined,
    titlePatterns,
    topOutliers,
    topOutliersByFormat,
    formatCounts,
  };
}

async function main() {
  // 전체 추적 채널 일괄 최신화 모드 (--sync-all-tracked)
  if (SYNC_ALL_TRACKED) {
    console.log(`전체 추적 채널 일괄 최신화 시작...`);
    const existing = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;
    const tracked = Array.isArray(existing?.trackedChannels) ? existing.trackedChannels : [];
    if (tracked.length === 0) {
      console.log(`추적 중인 채널이 없습니다.`);
      return;
    }
    const mergedChannels = new Map(tracked.map((c) => [c.channelId, c]));
    for (const ch of tracked) {
      try {
        console.log(`채널 분석 중: ${ch.channelTitle || ch.handle || ch.channelId}`);
        const fresh = await analyzeChannel(ch.channelId);
        const prev = mergedChannels.get(fresh.channelId);
        mergedChannels.set(fresh.channelId, {
          ...prev,
          ...fresh,
          status: prev?.status || 'candidate',
          statusReason: prev?.statusReason || '신규 후보 등록',
          consecutiveFailures: prev?.consecutiveFailures || 0,
          blockedUntil: prev?.blockedUntil || null,
        });
      } catch (err) {
        console.error(`- "${ch.channelTitle || ch.channelId}" 분석 실패: ${err.message}`);
      }
    }
    const result = {
      ...(existing ?? { schemaVersion: 1, keywordPool: DEFAULT_KEYWORD_POOL, lastRunKeywords: [], channelsAnalyzed: 0, byKeyword: [] }),
      generatedAt: new Date().toISOString(),
      trackedChannels: [...mergedChannels.values()],
    };
    const finalResult = applyLifecycle(result);
    writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), "utf8");
    console.log(`\n✓ 전체 추적 채널 동기화 완료: ${finalResult.trackedChannels.length}개 채널`);
    return;
  }

  // 채널 지목 분석 모드 — 키워드 풀 검색(search.list, 100단위/키워드)을 완전히 건너뛰고
  // trackedChannels 배열에만 upsert한다. byKeyword는 안 건드리므로 기존 데이터 보존됨.
  if (CHANNEL_INPUT) {
    console.log(`채널 분석 중: "${CHANNEL_INPUT}"`);
    const channelResult = await analyzeChannel(CHANNEL_INPUT);
    const existing = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;
    const mergedChannels = new Map((existing?.trackedChannels ?? []).map((c) => [c.channelId, c]));
    const prev = mergedChannels.get(channelResult.channelId);
    mergedChannels.set(channelResult.channelId, {
      ...prev,
      ...channelResult,
      status: prev?.status || 'candidate',
      statusReason: prev?.statusReason || '신규 후보 등록',
      consecutiveFailures: prev?.consecutiveFailures || 0,
      blockedUntil: prev?.blockedUntil || null,
    });
    const result = {
      ...(existing ?? { schemaVersion: 1, keywordPool: DEFAULT_KEYWORD_POOL, lastRunKeywords: [], channelsAnalyzed: 0, byKeyword: [] }),
      generatedAt: new Date().toISOString(),
      trackedChannels: [...mergedChannels.values()],
    };
    const finalResult = applyLifecycle(result);
    writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), "utf8");
    console.log(`\n✓ ${outputPath}`);
    console.log(JSON.stringify({
      channelTitle: channelResult.channelTitle,
      subscriberCount: channelResult.subscriberCount,
      videoCount: channelResult.videoCount,
      channelBaselineViewsPerDay: channelResult.channelBaselineViewsPerDay,
      titlePatterns: channelResult.titlePatterns.map((p) => p.word),
      topOutliers: channelResult.topOutliers.map((o) => ({ title: o.title, outlierRatio: o.outlierRatio })),
      formatCounts: channelResult.formatCounts,
      topOutliersByFormat: {
        long: channelResult.topOutliersByFormat.long.map((o) => ({ title: o.title, outlierRatio: o.outlierRatio, ageDays: o.ageDays })),
        short: channelResult.topOutliersByFormat.short.map((o) => ({ title: o.title, outlierRatio: o.outlierRatio, ageDays: o.ageDays })),
      },
    }, null, 2));
    return;
  }

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
  //    "accumulate" views, just for very different amounts of time. 예전에는 하루 평균(누적÷날수)으로
  //    맞췄지만 새 영상이 부풀고 같은 영상이 사흘 만에 531~691배로 흔들렸다(방향 점검 D, 2026-11-15).
  //    지금은 같은 채널·같은 형식 영상끼리 누적 조회수를 비교하고, 공개 7일 미만은 "측정 중"으로 둔다(peer-ratio.mjs).
  const allVideoIds = new Set();
  for (const [channelId] of smallChannels) {
    for (const id of candidateByChannel.get(channelId)?.videoIds ?? []) allVideoIds.add(id);
    for (const id of baselineVideoIds.get(channelId) ?? []) allVideoIds.add(id);
  }
  const shortsIdsByChannel = new Map();
  for (const [channelId] of smallChannels) shortsIdsByChannel.set(channelId, await fetchRecentShortsIds(channelId));
  const MS_PER_DAY = 86_400_000;
  const now = Date.now();
  const videoStats = new Map(); // videoId -> { videoId, viewCount, viewsPerDay, channelId, title, publishedAt, durationSeconds, isShort }
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
        videoId: item.id,
        viewCount,
        viewsPerDay: ageDays ? viewCount / ageDays : null,
        ageDays: ageDays ? Math.round(ageDays) : null,
        channelId: item.snippet?.channelId,
        title: item.snippet?.title,
        publishedAt,
        durationSeconds,
        isShort: durationSeconds != null ? durationSeconds <= 60 || Boolean(shortsIdsByChannel.get(item.snippet?.channelId)?.has(item.id)) : null,
      });
    }
  }

  // 5. 채널별 비교 영상: 그 채널 최근 업로드(baselineVideoIds)의 조회 기록. 배수는 6단계에서 영상마다
  //    같은 형식 영상의 조회수 중앙값(자기 제외)으로 계산한다(peer-ratio.mjs).
  const channelRecentVideos = new Map();
  for (const [channelId, videoIds] of baselineVideoIds) {
    channelRecentVideos.set(channelId, videoIds.map((id) => videoStats.get(id)).filter(Boolean));
  }
  const ratioNow = new Date(now);

  // 6. Outlier ratio per keyword-matched video vs the same channel's same-format videos,
  //    aggregated per keyword. 50 = performs like a typical video for that
  //    channel (matches fitScore's neutral midpoint so the two multiply sensibly).
  //    판정 보류(채널이 멈춤·표본 부족)인 영상은 키워드 결과에서 빼고 개수만 센다(heldByKeyword).
  const byKeyword = new Map();
  const heldByKeyword = new Map();
  for (const [channelId, entry] of candidateByChannel) {
    if (!smallChannels.some(([id]) => id === channelId)) continue;
    const recent = channelRecentVideos.get(channelId);
    if (!recent) continue;
    for (const videoId of entry.videoIds) {
      const stat = videoStats.get(videoId);
      if (!stat || !Number.isFinite(stat.viewCount)) continue;
      const ratioInfo = computePeerRatio({ video: stat, channelVideos: recent, now: ratioNow });
      if (ratioInfo.ratioStatus === "hold") {
        for (const keyword of entry.keywords) heldByKeyword.set(keyword, (heldByKeyword.get(keyword) ?? 0) + 1);
        continue;
      }
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
          viewsPerDay: Number.isFinite(stat.viewsPerDay) ? Math.round(stat.viewsPerDay * 10) / 10 : null,
          ...ratioInfo,
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
  const toKeywordOutlierRow = (r) => ({
    videoId: r.videoId,
    title: r.title,
    channelTitle: r.channelTitle,
    viewCount: r.viewCount,
    publishedAt: r.publishedAt,
    ageDays: r.ageDays,
    viewsPerDay: r.viewsPerDay,
    outlierRatio: r.outlierRatio,
    ratioMethod: r.ratioMethod,
    ratioStatus: r.ratioStatus,
    ratioReason: r.ratioReason,
    ratioComputedAt: r.ratioComputedAt,
    ratioDenominator: r.ratioDenominator,
    ratioPeerCount: r.ratioPeerCount,
    durationSeconds: r.durationSeconds,
    isShort: r.isShort,
  });
  const analyzedAtIso = new Date().toISOString();
  const marketDemandByKeyword = KEYWORD_POOL
    .map((keyword) => {
      const allRows = byKeyword.get(keyword) ?? [];
      // 점수는 값이 있는 배수(공개 7일 이상)만으로 만든다. 측정 중인 영상은 점수에 넣지 않고 목록에만 남긴다.
      const rows = allRows.filter(isComparableRatio);
      const measuringCount = allRows.length - rows.length;
      const heldCount = heldByKeyword.get(keyword) ?? 0;
      const totalResults = totalResultsByKeyword.get(keyword) ?? null;
      if (rows.length === 0) {
        return {
          keyword,
          analyzedAt: analyzedAtIso,
          videoCount: 0,
          confidence: "low",
          lowSampleWarning: null,
          marketDemandScore: null,
          totalResults,
          opportunityScore: null,
          emptyReason: allRows.length === 0 ? "소형 채널 표본 0개" : "비교 가능한 표본 0개(측정 중이거나 판정 보류)",
          measuringCount,
          heldCount,
          titlePatterns: [],
          topOutliers: allRows.slice(0, 3).map(toKeywordOutlierRow),
        };
      }
      const cappedRatios = rows.map((r) => Math.min(RATIO_CAP, r.outlierRatio));
      const avgRatio = median(cappedRatios);
      const lowSample = rows.length < LOW_SAMPLE_THRESHOLD;
      const marketDemandScore = avgRatio !== null ? Math.round(Math.max(0, 50 * avgRatio) * 10) / 10 : null;
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
        analyzedAt: analyzedAtIso, // 이 키워드가 실제로 마지막으로 (재)분석된 시각.
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
        emptyReason: null,
        titlePatterns: extractTitlePatterns(rows), // recurring words across overperforming titles — the "angle", not just the topic
        measuringCount,
        heldCount,
        // 값이 있는 배수가 먼저, 부족하면 측정 중인 영상이 뒤따른다.
        topOutliers: [...allRows]
          .sort((a, b) => ratioTier(a) - ratioTier(b) || (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0) || b.viewCount - a.viewCount)
          .slice(0, 3)
          .map(toKeywordOutlierRow),
      };
    })
    .sort((a, b) => (b.opportunityScore ?? b.marketDemandScore ?? -1) - (a.opportunityScore ?? a.marketDemandScore ?? -1));

  // Upsert into any existing file by keyword — a --keyword ad-hoc check
  // shouldn't erase the default pool's results, and re-running the default
  // pool shouldn't erase keywords someone checked ad-hoc earlier.
  const existing = existsSync(outputPath) ? JSON.parse(readFileSync(outputPath, "utf8")) : null;
  const allByKeyword = mergeKeywordAnalysisEntries(existing?.byKeyword ?? [], marketDemandByKeyword);

  const result = {
    ...(existing ?? {}),
    schemaVersion: 1,
    generatedAt: analyzedAtIso,
    note:
      "market_demand_score = 50 * (영상의 누적 조회수 / 같은 채널·같은 형식 최근 영상 조회수 중앙값, 자기 제외, 방식 " + RATIO_METHOD + ")의 중앙값, " +
      "공개 7일 미만은 측정 중이고 채널이 멈췄거나 비교 영상이 적으면 판정 보류라 점수에 넣지 않는다, " +
      "채널별 비율은 5배에서 캡. 50 = 그 채널의 평균적인 영상과 같은 성과, 50 초과 = 그 채널 기준으로도 " +
      "이례적으로 잘된 주제. 같은 채널·같은 형식 영상끼리만 누적 조회수를 비교하므로 채널 크기와 쇼츠·롱폼 차이는 " +
      "분모에서 이미 맞춰진다. 비교 영상은 공개 7일 이상만 쓰고, 이 영상이 비교 영상보다 어리면 값이 낮게 잡힌다. " +
      "옛 방식(ratioMethod 칸 없음, 하루 평균 비교)으로 저장된 값은 새 값과 섞어 비교하지 않는다. " +
      "채널 크기 효과를 최대한 제거하기 위해 채널별 자체 기준선 대비 비율로만 비교함(우리 채널과 비슷한 " +
      `구독자 ${MAX_SUBSCRIBERS.toLocaleString()}명 이하 채널만 포함). 표본 ${LOW_SAMPLE_THRESHOLD}개 미만은 ` +
      '`confidence: "low"`로 표시함. ' +
      "--keyword=로 특정 후보 아이디어만 골라 확인 가능(기존 키워드는 보존, upsert). " +
      "opportunityScore = marketDemandScore / log10(totalResults+10) — 수요가 높아도 이미 포화된(totalResults " +
      "큰) 키워드는 할인함. 정밀 계산이 아니라 대략적인 경쟁 밀도 보정이니 참고용으로만 쓸 것. " +
      "titlePatterns = 그 채널 기준으로 이례적으로(outlierRatio≥1.5) 잘 된 영상들의 제목에서 2회 이상 " +
      "반복된 단어 — 무슨 주제를 다룰지가 아니라 어떤 각도/후킹으로 제목을 달지에 대한 신호.",
    keywordPool: DEFAULT_KEYWORD_POOL,
    lastRunKeywords: KEYWORD_POOL,
    channelsAnalyzed: smallChannels.length,
    byKeyword: allByKeyword,
    // 채널 지목 분석 모드(--channel=)가 이 파일에 이미 써둔 trackedChannels를 키워드 풀
    // 재실행이 지워버리면 안 된다 — 두 모드는 서로 다른 배열을 쓰는 독립된 데이터다.
    trackedChannels: existing?.trackedChannels ?? [],
  };

  const finalResult = applyLifecycle(result);
  writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), "utf8");
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
