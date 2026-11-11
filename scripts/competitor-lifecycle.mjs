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
 * 공개 7일(D+7) 시점의 영상을 찾아 성과 검증 및 키워드/채널 자율 순환을 1회 수행한다. (2026-11-11 자동화 원칙)
 * @param {object} params
 * @param {object} params.marketDemandData 시장 수요 데이터
 * @param {object} [params.analyticsData] 분석 데이터 (searchTerms, recentVideos, summary 등)
 * @param {object[]} [params.catalogVideos] 카탈로그 영상 목록
 * @param {Date} [params.now] 현재 시각
 * @returns {{ marketDemandData: object, evaluatedVideo: object|null, promotedChannels: string[], discoveredKeywords: string[] }}
 */
export function runD7AutonomousCycle({
  marketDemandData = {},
  analyticsData = {},
  catalogVideos = [],
  now = new Date(),
}) {
  const ourCatalog = Array.isArray(catalogVideos) && catalogVideos.length > 0
    ? catalogVideos
    : (Array.isArray(analyticsData.recentVideos) ? analyticsData.recentVideos : []);
  const ourCatalogTitles = ourCatalog.map((v) => v.title || '').filter(Boolean);

  const processedIds = new Set(marketDemandData.d7ProcessedVideoIds || []);
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  // 1. D+7 대상 영상 선별 (공개 7일 이상 경과 & 아직 처리 안 된 영상 우선)
  const eligibleVideos = ourCatalog.filter((v) => {
    if (!v.publishedAt) return false;
    const pubTime = new Date(v.publishedAt).getTime();
    return (now.getTime() - pubTime) >= SEVEN_DAYS_MS;
  });

  // 미처리 영상 중 가장 최근 영상 선택 (없으면 가장 최근 7일 경과 영상으로 fallback)
  const targetVideo = eligibleVideos.find((v) => v.videoId && !processedIds.has(v.videoId)) || eligibleVideos[0] || null;

  let targetRatio = 1.0;
  const promotedChannels = [];
  let evaluatedVideoSummary = null;

  if (targetVideo) {
    const views = Number(targetVideo.views || targetVideo.viewCount || 0);
    // 포맷 중앙값 계산 (없으면 기본값 100)
    const medianViews = Number(analyticsData.summary?.medianViews || 100);
    targetRatio = medianViews > 0 ? views / medianViews : 1.0;

    evaluatedVideoSummary = {
      videoId: targetVideo.videoId || '',
      title: targetVideo.title || '',
      publishedAt: targetVideo.publishedAt || '',
      views,
      ratio: Math.round(targetRatio * 10) / 10,
    };

    if (targetVideo.videoId) {
      processedIds.add(targetVideo.videoId);
    }
  }

  // 2. 경쟁 채널 라이프사이클 평가 및 승격 (원천 채널 매핑)
  let trackedChannels = Array.isArray(marketDemandData.trackedChannels)
    ? [...marketDemandData.trackedChannels]
    : [];

  let bestMatchedChannel = null;
  let maxOverlap = 0;

  if (targetVideo && targetVideo.title) {
    for (const ch of trackedChannels) {
      for (const outlier of (ch.topOutliers || [])) {
        const overlap = computeKeywordOverlap(targetVideo.title, outlier.title || '');
        if (overlap > maxOverlap && overlap >= LIFECYCLE_CONFIG.EXHAUSTION_SIMILARITY) {
          maxOverlap = overlap;
          bestMatchedChannel = ch;
        }
      }
    }
  }

  trackedChannels = trackedChannels.map((channel) => {
    const isMatched = bestMatchedChannel && channel.channelId === bestMatchedChannel.channelId;
    const ratioToApply = isMatched ? targetRatio : null;
    const updated = evaluateChannelLifecycle({
      channel,
      ourCatalogTitles,
      latestEpisodeRatio: ratioToApply,
      now,
    });
    if (isMatched && updated.status === LIFECYCLE_STATUS.GOLD_MINE) {
      promotedChannels.push(updated.channelTitle || updated.channelId);
    }
    return updated;
  });

  // 3. 실제 시청자 검색어(searchTerms)에서 유입 키워드 자동 추출 & byKeyword 편입
  const searchTerms = Array.isArray(analyticsData.searchTerms) ? analyticsData.searchTerms : [];
  const discoveredKeywords = [];
  const existingByKeyword = Array.isArray(marketDemandData.byKeyword)
    ? [...marketDemandData.byKeyword]
    : [];
  const keywordMap = new Map(existingByKeyword.map((k) => [k.keyword, k]));

  // 노이즈 검색어 제외 필터
  const searchStopWords = new Set(['이해하면', '쉬운영어', 'skidrow277', 'shorts', '구독']);

  for (const item of searchTerms) {
    const term = (item.insightTrafficSourceDetail || item.query || item.term || '').trim();
    if (!term || term.length < 2) continue;
    if (searchStopWords.has(term.toLowerCase())) continue;

    discoveredKeywords.push(term);
    if (!keywordMap.has(term)) {
      // 신규 키워드 자동 발굴 편입
      keywordMap.set(term, {
        keyword: term,
        marketDemandScore: 120, // 검색 유입 검증 기본 점수
        opportunityScore: 75.0,
        totalResults: item.views ? item.views * 100 : 500,
        videoCount: 5,
        analyzedAt: now.toISOString(),
        source: 'd7_search_terms',
        topOutliers: [],
      });
    } else {
      const existing = keywordMap.get(term);
      keywordMap.set(term, {
        ...existing,
        source: 'd7_search_terms',
        lastD7SyncedAt: now.toISOString(),
      });
    }
    if (discoveredKeywords.length >= 5) break; // 상위 5개까지만 선별
  }

  const updatedByKeyword = Array.from(keywordMap.values());

  const updatedData = {
    ...marketDemandData,
    trackedChannels,
    byKeyword: updatedByKeyword,
    d7ProcessedVideoIds: Array.from(processedIds),
    d7AutonomousCycle: {
      lastRunAt: now.toISOString(),
      targetVideo: evaluatedVideoSummary,
      promotedChannels,
      discoveredKeywords,
      status: 'completed',
    },
    lifecycleSyncedAt: now.toISOString(),
  };

  return {
    marketDemandData: updatedData,
    evaluatedVideo: evaluatedVideoSummary,
    promotedChannels,
    discoveredKeywords,
  };
}
