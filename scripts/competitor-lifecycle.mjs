// @ts-check
// 경쟁 채널 성과 연동 자율 라이프사이클 엔진 (Automation-First)
//
// 사람의 수동 개입(URL 복사, 수동 추가/삭제, 토글)을 없애고,
// "우리 채널 영상 제작 성과"에 따라 경쟁 채널을 자동으로
// [수습(candidate) ➔ 황금광산(gold_mine) ➔ 차단(blocked) ➔ 명예졸업(graduated)]
// 으로 전이시킨다. (2026-11-11 확정 규칙)

export const LIFECYCLE_STATUS = {
  CANDIDATE: 'candidate',     // 신규 발굴/수습
  GOLD_MINE: 'gold_mine',     // 성과 우수 (지속 채굴 대상)
  BLOCKED: 'blocked',         // 2회 연속 성과 부진 (90일 쿨다운 차단)
  GRADUATED: 'graduated',     // 벤치마킹 가능 아웃라이어 전면 소진 (자동 삭제/보관)
};

export const LIFECYCLE_CONFIG = {
  SUCCESS_RATIO_THRESHOLD: 1.5,      // 포맷 중앙값 대비 1.5배 이상 ➔ 황금 광산
  FAILURE_RATIO_THRESHOLD: 0.5,      // 포맷 중앙값 대비 0.5배 미만 ➔ 실패
  CONSECUTIVE_FAILURES_TO_BLOCK: 2,  // 2회 연속 부진 ➔ 자동 차단
  BLOCK_COOLDOWN_DAYS: 90,           // 차단 쿨다운 기간 (90일)
  MEGA_OUTLIER_UNBLOCK_RATIO: 5.0,   // 차단 해제 가능한 초대형 아웃라이어 기준
  EXHAUSTION_SIMILARITY: 0.33,       // 핵심 키워드(타겟 음소 포함) 33% 이상 겹치면 기커버 소재로 판정
  SEARCH_TERM_CAP: 5,                // D+7 유입 검색어 동시 유지 상한
  SEARCH_TERM_GRACE_DAYS: 7,         // 유입이 끊긴 D+7 검색어를 자동 퇴장시키기 전 유예 일수
};

const SEARCH_TERM_STOP_WORDS = new Set(['이해하면', '쉬운영어', '이해하면 쉬운영어', 'skidrow277', 'shorts', '구독']);
const LEARNING_TOPIC_RE = /(영어|발음|듣기|영단어|단어|파닉스|회화|읽기|스펠링|알파벳|원어민|연음|강세|억양)/;
const normalizeSearchTermKey = (term = '') => String(term).replace(/\s+/g, '').toLowerCase();
const isEligibleSearchTerm = (term = '') => {
  const t = String(term).trim();
  if (!t || t.length < 2 || SEARCH_TERM_STOP_WORDS.has(t.toLowerCase())) return false;
  // 채널/제목 구분자("채널 - 제목", "제목 | 채널"), 핸들(@), URL, 우리 채널 이름은 제외한다.
  if (t.toLowerCase().includes('skidrow') || t.includes('쉬운영어')) return false;
  if (/\s[-–—|]\s/.test(t) || /(?:^|\s)@|https?:\/\/|youtu\.be/i.test(t)) return false;
  if (LEARNING_TOPIC_RE.test(t)) return true;
  // 영어 학습 한국어가 없는 검색어는 하이픈 슬러그(예: "zlet-kytjly")나 숫자·기호 조합을 빼고 영문 단어만 허용한다.
  if (/[a-z0-9]+-[a-z0-9-]+/i.test(t)) return false;
  return /^[a-z][a-z\s']{1,40}$/i.test(t);
};

/**
 * 텍스트에서 한글/영문 핵심 의미 키워드를 추출한다.
 * 발음 타겟 알파벳(F, P, R, L, B, V 등 1글자)은 반드시 보존한다.
 * @param {string} text
 * @returns {Set<string>}
 */
export function extractKeywords(text = '') {
  if (!text) return new Set();
  const separated = text
    .replace(/([a-zA-Z]+)([\uAC00-\uD7A3]+)/g, '$1 $2')
    .replace(/([\uAC00-\uD7A3]+)([a-zA-Z]+)/g, '$1 $2');
  const cleaned = separated
    .toLowerCase()
    .replace(/[#\[\]\(\)\|·_,\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // 1글자 영문 알파벳(소리 타겟: f, p, r, l 등) 또는 2글자 이상 단어 보존
  const tokens = cleaned.split(' ').filter((w) => /^[a-z]$/i.test(w) || w.length >= 2);
  // 채널 전체에 만연한 일반 노이즈 불용어 제외
  const stopWords = new Set([
    '영어', '영어회화', '기초', '배우기', 'shorts', '원어민', '한국인',
    '소리', '방법', '이유', '발음', '완벽', '정리', '연습', '구별법', '듣기', '반복'
  ]);
  return new Set(tokens.filter((w) => !stopWords.has(w)));
}

/**
 * 두 텍스트 집합의 키워드 오버랩(최소 집합 대비 커버율)을 계산한다.
 * 유튜브 제목 특성상 수식어(24쌍, 0.1초 등)가 많으므로, 핵심 주제어가 포함되었는지를
 * Overlap Coefficient (|A ∩ B| / min(|A|, |B|))로 측정한다.
 * @param {string} titleA
 * @param {string} titleB
 * @returns {number}
 */
export function computeKeywordOverlap(titleA = '', titleB = '') {
  const setA = extractKeywords(titleA);
  const setB = extractKeywords(titleB);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const minSize = Math.min(setA.size, setB.size);
  return minSize > 0 ? intersection / minSize : 0;
}

/**
 * 아웃라이어 제목이 우리 카탈로그 목록에 이미 다룬 소재인지 판정한다.
 * @param {string} outlierTitle
 * @param {string[]} ourCatalogTitles
 * @returns {boolean}
 */
export function isTopicAlreadyCovered(outlierTitle = '', ourCatalogTitles = []) {
  if (!outlierTitle || !ourCatalogTitles.length) return false;
  for (const ourTitle of ourCatalogTitles) {
    if (computeKeywordOverlap(outlierTitle, ourTitle) >= LIFECYCLE_CONFIG.EXHAUSTION_SIMILARITY) {
      return true;
    }
  }
  return false;
}

/**
 * 경쟁 채널의 아웃라이어 중 우리가 아직 다루지 않은 잔여 소재 수와 소진율을 계산한다.
 * @param {object} channel
 * @param {string[]} ourCatalogTitles
 * @returns {{ totalOutliers: number, coveredCount: number, uncoveredCount: number, exhaustionRate: number }}
 */
export function calculateTopicExhaustion(channel = {}, ourCatalogTitles = []) {
  const outliers = Array.isArray(channel.topOutliers) ? channel.topOutliers : [];
  if (outliers.length === 0) {
    return { totalOutliers: 0, coveredCount: 0, uncoveredCount: 0, exhaustionRate: 1.0 };
  }
  let coveredCount = 0;
  for (const outlier of outliers) {
    const title = outlier.title || '';
    if (isTopicAlreadyCovered(title, ourCatalogTitles)) {
      coveredCount += 1;
    }
  }
  const totalOutliers = outliers.length;
  const uncoveredCount = Math.max(0, totalOutliers - coveredCount);
  const exhaustionRate = totalOutliers > 0 ? coveredCount / totalOutliers : 1.0;
  return { totalOutliers, coveredCount, uncoveredCount, exhaustionRate };
}

/**
 * 7일 성과 데이터와 소재 소진율을 바탕으로 채널의 다음 라이프사이클 상태를 결정한다.
 * @param {object} params
 * @param {object} params.channel 현재 채널 데이터
 * @param {string[]} [params.ourCatalogTitles] 우리 채널의 기존 영상 제목들
 * @param {number} [params.latestEpisodeRatio] 최근 연결 에피소드의 7일 성과 배수 (중앙값 대비)
 * @param {Date} [params.now] 현재 시각
 * @returns {object} 갱신된 채널 상태 객체
 */
export function evaluateChannelLifecycle({
  channel = {},
  ourCatalogTitles = [],
  latestEpisodeRatio = null,
  now = new Date(),
}) {
  const currentStatus = channel.status || LIFECYCLE_STATUS.CANDIDATE;
  let nextStatus = currentStatus;
  let statusReason = channel.statusReason || '신규 후보 등록';
  let consecutiveFailures = channel.consecutiveFailures || 0;
  let blockedUntil = channel.blockedUntil || null;

  // 1. 차단 상태인 경우: 90일 쿨다운 경과 여부 점검
  if (currentStatus === LIFECYCLE_STATUS.BLOCKED) {
    if (blockedUntil && new Date(blockedUntil) <= now) {
      // 쿨다운 만료 후 메가 아웃라이어 존재 여부 확인
      const maxMultiplier = Math.max(
        0,
        ...(channel.topOutliers || []).map((o) => o.multiplier || 0)
      );
      if (maxMultiplier >= LIFECYCLE_CONFIG.MEGA_OUTLIER_UNBLOCK_RATIO) {
        nextStatus = LIFECYCLE_STATUS.CANDIDATE;
        statusReason = `90일 쿨다운 종료 및 메가 아웃라이어(${maxMultiplier.toFixed(1)}배) 발생으로 후보 복귀`;
        consecutiveFailures = 0;
        blockedUntil = null;
      }
    }
    return {
      ...channel,
      status: nextStatus,
      statusReason,
      consecutiveFailures,
      blockedUntil,
    };
  }

  // 2. 신규 성과 배수가 전달된 경우: 승격 또는 실패 누적 판정
  if (latestEpisodeRatio != null) {
    if (latestEpisodeRatio >= LIFECYCLE_CONFIG.SUCCESS_RATIO_THRESHOLD) {
      nextStatus = LIFECYCLE_STATUS.GOLD_MINE;
      consecutiveFailures = 0;
      statusReason = `최근 제작 성과 우수(중앙값 대비 ${latestEpisodeRatio.toFixed(1)}배)로 황금 광산 승격`;
    } else if (latestEpisodeRatio < LIFECYCLE_CONFIG.FAILURE_RATIO_THRESHOLD) {
      consecutiveFailures += 1;
      if (consecutiveFailures >= LIFECYCLE_CONFIG.CONSECUTIVE_FAILURES_TO_BLOCK) {
        nextStatus = LIFECYCLE_STATUS.BLOCKED;
        const cooldownDate = new Date(now.getTime() + LIFECYCLE_CONFIG.BLOCK_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        blockedUntil = cooldownDate.toISOString();
        statusReason = `2회 연속 성과 부진(최근 ${latestEpisodeRatio.toFixed(1)}배)으로 90일간 자동 차단`;
      } else {
        statusReason = `1회 성과 부진(최근 ${latestEpisodeRatio.toFixed(1)}배) 경고 누적`;
      }
    } else {
      // 보통 성과는 "연속" 부진을 끊는다 — 부진·보통·부진이 2회 연속 부진으로 세어지지 않게.
      consecutiveFailures = 0;
      statusReason = `최근 제작 성과 보통(중앙값 대비 ${latestEpisodeRatio.toFixed(1)}배)`;
    }
  }

  // 3. 소재 소진율 계산 및 명예 졸업(자동 삭제/보관) 판정
  const exhaustion = calculateTopicExhaustion(channel, ourCatalogTitles);
  if (nextStatus === LIFECYCLE_STATUS.GOLD_MINE || nextStatus === LIFECYCLE_STATUS.CANDIDATE) {
    if (exhaustion.totalOutliers > 0 && exhaustion.uncoveredCount === 0) {
      nextStatus = LIFECYCLE_STATUS.GRADUATED;
      statusReason = `벤치마킹 가능 아웃라이어 전면 소진(소진율 100%)으로 명예 졸업`;
    }
  }

  return {
    ...channel,
    status: nextStatus,
    statusReason,
    statusUpdatedAt: now.toISOString(),
    consecutiveFailures,
    blockedUntil,
    exhaustion,
  };
}

/**
 * 전체 trackedChannels 목록에 대해 라이프사이클을 일괄 동기화한다.
 * @param {object} marketDemandData
 * @param {object[]} catalogVideos
 * @param {Date} [now]
 * @returns {object}
 */
export function syncAllTrackedChannels(marketDemandData = {}, catalogVideos = [], now = new Date()) {
  const ourCatalogTitles = (catalogVideos || []).map((v) => v.title || '').filter(Boolean);
  const trackedChannels = Array.isArray(marketDemandData.trackedChannels)
    ? marketDemandData.trackedChannels
    : [];

  const updatedChannels = trackedChannels.map((channel) => {
    return evaluateChannelLifecycle({
      channel,
      ourCatalogTitles,
      now,
    });
  });

  return {
    ...marketDemandData,
    trackedChannels: updatedChannels,
    lifecycleSyncedAt: now.toISOString(),
  };
}

/**
 * 공개 7일(D+7)이 지난 우리 영상의 판정을 경쟁 채널 상태에 반영하고, 시청자 검색어를 키워드 풀에 넣는다.
 * (2026-11-11 재작성 — 이전 버전은 조회수를 없는 칸에서 읽어 늘 0이었고, 중앙값이 없으면 100을 넣었고,
 *  원천 채널을 제목 단어가 겹치는지로 짐작했다. 이제 판정은 planning-outcome.mjs 하나에서 오고,
 *  원천 채널은 BRIEF.md "기획 근거" 칸에 적힌 채널 ID만 쓴다.)
 *
 * - 반영하는 판정: worked / neutral / failed 만. hold(표본 부족)·pending(7일 전)은 손대지 않고,
 *   처리 완료로 표시하지도 않는다 — 표본이 쌓이면 다음 순환에서 다시 본다.
 * - 공개 28일이 지난 편은 반영하지 않는다(그때 붙은 판정은 7일 판정이 아니다).
 * @param {object} params
 * @param {object} params.marketDemandData 시장 수요 데이터(market-demand.json)
 * @param {object} [params.analyticsData] 분석 데이터(searchTerms)
 * @param {object[]} [params.episodeOutcomes] planning-outcome.mjs loadEpisodeOutcomes() 결과
 * @param {object[]} [params.catalogVideos] 카탈로그 영상(소재 소진율 계산용)
 * @param {Date} [params.now]
 */
export function runD7AutonomousCycle({
  marketDemandData = {},
  analyticsData = {},
  episodeOutcomes = [],
  catalogVideos = [],
  now = new Date(),
}) {
  const ourCatalogTitles = (catalogVideos || []).map((v) => v.title || '').filter(Boolean);
  const processedIds = new Set(marketDemandData.d7ProcessedVideoIds || []);
  const FINAL = new Set(['worked', 'neutral', 'failed']);
  const MAX_AGE_DAYS = 28;

  let trackedChannels = Array.isArray(marketDemandData.trackedChannels) ? [...marketDemandData.trackedChannels] : [];
  const promotedChannels = [];
  const applied = [];

  // 1. 판정이 난 편마다, 그 편의 기획 근거에 적힌 채널에만 배수를 반영한다(오래된 편부터).
  const ready = (episodeOutcomes || [])
    .filter((o) => o.videoId && FINAL.has(o.verdict) && Number.isFinite(o.ratio))
    .filter((o) => !processedIds.has(o.videoId) && (o.ageDays == null || o.ageDays <= MAX_AGE_DAYS))
    .sort((a, b) => String(a.publishedAt || '').localeCompare(String(b.publishedAt || '')));

  for (const o of ready) {
    const sourceIds = new Set((o.sources?.competitors || []).map((c) => c.channelId));
    const touched = [];
    trackedChannels = trackedChannels.map((channel) => {
      if (!sourceIds.has(channel.channelId)) return channel;
      const before = channel.status;
      const updated = evaluateChannelLifecycle({channel, ourCatalogTitles, latestEpisodeRatio: o.ratio, now});
      if (updated.status === LIFECYCLE_STATUS.GOLD_MINE && before !== LIFECYCLE_STATUS.GOLD_MINE) {
        promotedChannels.push(updated.channelId);
      }
      touched.push(updated.channelTitle || updated.channelId);
      return updated;
    });
    processedIds.add(o.videoId);
    applied.push({label: o.label, videoId: o.videoId, verdict: o.verdict, ratio: o.ratio, channels: touched});
  }

  // 2. 나머지 채널은 소재 소진율(명예 졸업)만 다시 계산한다.
  trackedChannels = trackedChannels.map((channel) =>
    evaluateChannelLifecycle({channel, ourCatalogTitles, now}));

  // 3. 실제 시청자 검색어를 키워드 풀에 넣고(공백 중복 통합, 최대 5개), 유입이 끊겨 유예 기간이 지난
  //    d7_search_terms는 자동으로 퇴장시켜 고아 영상 ID를 함께 반환한다. 점수는 지어내지 않는다.
  const DAY_MS = 24 * 60 * 60 * 1000;
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const searchTerms = Array.isArray(analyticsData?.searchTerms) ? analyticsData.searchTerms : [];
  /** @type {Map<string, { term: string, views: number, topRowViews: number }>} */
  const activeSearchMap = new Map();
  for (const item of searchTerms) {
    const term = String(item.insightTrafficSourceDetail || item.query || item.term || '').trim();
    if (!isEligibleSearchTerm(term)) continue;
    const normKey = normalizeSearchTermKey(term);
    const views = Number(item.views) || 0;
    const prev = activeSearchMap.get(normKey);
    if (prev) {
      prev.views += views;
      if (views > prev.topRowViews) {
        prev.term = term;
        prev.topRowViews = views;
      }
      continue;
    }
    if (activeSearchMap.size >= LIFECYCLE_CONFIG.SEARCH_TERM_CAP) continue;
    activeSearchMap.set(normKey, {term, views, topRowViews: views});
  }

  const existingByKeyword = Array.isArray(marketDemandData.byKeyword) ? marketDemandData.byKeyword : [];
  /** @type {Map<string, any>} */
  const keywordMap = new Map(existingByKeyword.map((k) => [k.keyword, k]));
  const keptWinnerKeywords = new Set();
  const discoveredKeywords = [];

  for (const [normKey, candidate] of activeSearchMap.entries()) {
    const matchingExisting = existingByKeyword.filter((k) => normalizeSearchTermKey(k.keyword) === normKey);
    const winner = matchingExisting.find((k) => k.keyword === candidate.term && k.marketDemandScore != null)
      || matchingExisting.find((k) => k.marketDemandScore != null)
      || matchingExisting.find((k) => k.keyword === candidate.term)
      || matchingExisting[0]
      || null;
    const targetKeyword = winner ? winner.keyword : candidate.term;
    discoveredKeywords.push(targetKeyword);
    keptWinnerKeywords.add(targetKeyword);
    keywordMap.set(targetKeyword, winner
      ? {
        ...winner,
        source: winner.source || 'd7_search_terms',
        searchViews: candidate.views || winner.searchViews || null,
        lastD7SyncedAt: nowIso,
        d7OutOfActiveSince: null,
      }
      : {
        keyword: targetKeyword,
        source: 'd7_search_terms',
        searchViews: candidate.views || null,
        marketDemandScore: null,
        opportunityScore: null,
        totalResults: null,
        videoCount: 0,
        firstSeenAt: nowIso,
        lastD7SyncedAt: nowIso,
        d7OutOfActiveSince: null,
        analyzedAt: null,
        topOutliers: [],
      });
  }

  /** @type {any[]} */
  const retiredKeywordObjs = [];
  if (discoveredKeywords.length > 0) {
    for (const [kw, entry] of [...keywordMap.entries()]) {
      if (entry.source !== 'd7_search_terms' || keptWinnerKeywords.has(kw)) continue;
      const normKey = normalizeSearchTermKey(kw);
      // 공백 중복 별칭이나 불용어·채널명 유입어는 즉시 정리한다.
      if (activeSearchMap.has(normKey) || !isEligibleSearchTerm(kw)) {
        retiredKeywordObjs.push(entry);
        keywordMap.delete(kw);
        continue;
      }
      const outSinceMs = entry.d7OutOfActiveSince ? new Date(entry.d7OutOfActiveSince).getTime() : NaN;
      if (!Number.isFinite(outSinceMs)) {
        keywordMap.set(kw, {...entry, d7OutOfActiveSince: nowIso});
      } else if (nowMs - outSinceMs >= LIFECYCLE_CONFIG.SEARCH_TERM_GRACE_DAYS * DAY_MS) {
        retiredKeywordObjs.push(entry);
        keywordMap.delete(kw);
      }
    }
  }

  const remainingByKeyword = Array.from(keywordMap.values());
  const retiredKeywords = retiredKeywordObjs.map((k) => k.keyword);
  const remainingVideoIds = new Set();
  for (const k of remainingByKeyword) {
    for (const o of (k.topOutliers || [])) {
      if (o?.videoId) remainingVideoIds.add(o.videoId);
    }
  }
  const retiredVideoIds = new Set();
  for (const k of retiredKeywordObjs) {
    for (const o of (k.topOutliers || [])) {
      if (o?.videoId) retiredVideoIds.add(o.videoId);
    }
  }
  const orphanedVideoIds = [...retiredVideoIds].filter((id) => !remainingVideoIds.has(id));

  // 4. 화면(벤치마킹 탭)이 읽을 판정 목록 — 7일이 지난 편만, 최근 공개 순.
  const outcomesForView = (episodeOutcomes || [])
    .filter((o) => o.verdict !== 'pending')
    .sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .map((o) => ({
      label: o.label, slug: o.slug, videoId: o.videoId, title: o.title || '', publishedAt: o.publishedAt || null,
      verdict: o.verdict, ratio: o.ratio, reason: o.reason,
      views: o.views ?? null, views7d: o.views7d ?? null, baselineViews7d: o.baselineViews7d ?? null,
      competitors: o.sources?.competitors || [], audience: o.sources?.audience || null, hasSources: !!o.sources,
    }));

  const updatedData = {
    ...marketDemandData,
    trackedChannels,
    byKeyword: remainingByKeyword,
    d7ProcessedVideoIds: Array.from(processedIds),
    episodeOutcomes: outcomesForView,
    d7AutonomousCycle: {
      lastRunAt: nowIso,
      applied,
      holdCount: (episodeOutcomes || []).filter((o) => o.verdict === 'hold').length,
      promotedChannels,
      discoveredKeywords,
      retiredKeywords,
      status: 'completed',
    },
    lifecycleSyncedAt: nowIso,
  };

  return {marketDemandData: updatedData, applied, promotedChannels, discoveredKeywords, retiredKeywords, orphanedVideoIds};
}
