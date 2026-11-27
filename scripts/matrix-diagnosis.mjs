import { pickLatestPeriod } from './studio-reach.mjs';

// 사분면이 확정된(Q1~Q4, isVerified) 영상만 AI 처방 대상이다. 표본 부족·48시간 집계 중·Studio 대기 영상은
// 처방 지침에서 "CTR과 지속률이 모두 저조"(Q4)로 떨어져 근거 없는 조언이 나왔다(2026-11-09 점검 1번).
export const isDiagnosable = (video) =>
  Boolean(video && video.isVerified === true && ['Q1', 'Q2', 'Q3', 'Q4'].includes(video.quadrant));

export function buildMatrixDataset(dashboardData, customThresholds = {}) {
  const d = dashboardData || {};
  const allVideos = d.recentVideos || [];
  const performanceMap = new Map((d.videoPerformance || []).map(p => [p.video, p]));
  const reachManual = d.videoReachManual?.videos || {};
  const packages = d.packagingRegistry?.items || [];
  const packageMap = new Map(packages.map(pkg => [pkg.videoId, pkg]));

  // 1. Minimum Sample Size Parameters (Configurable, default 30 for early growth channels)
  const minImpressions = customThresholds.minImpressions != null ? Number(customThresholds.minImpressions) : 30;
  const minViews = customThresholds.minViews != null ? Number(customThresholds.minViews) : 10;

  // 2. Traffic Source Analysis (Channel Level)
  const trafficSources = d.trafficSources || [];
  const totalTrafficViews = trafficSources.reduce((acc, t) => acc + (Number(t.views) || 0), 0);
  const browseViews = Number(trafficSources.find(t => t.insightTrafficSourceType === 'SUBSCRIBER_CHANNEL' || t.insightTrafficSourceType === 'BROWSE')?.views || 0);
  const suggestedViews = Number(trafficSources.find(t => t.insightTrafficSourceType === 'RELATED_VIDEO')?.views || 0);
  const searchViews = Number(trafficSources.find(t => t.insightTrafficSourceType === 'YT_SEARCH')?.views || 0);
  const extViews = Number(trafficSources.find(t => t.insightTrafficSourceType === 'EXT_URL')?.views || 0);

  const browseAndSuggestedRatio = totalTrafficViews > 0
    ? Math.round(((browseViews + suggestedViews) / totalTrafficViews) * 100)
    : null;

  const videoItems = [];

  for (const v of allVideos) {
    const videoId = v.videoId;
    if (!videoId) continue;

    const perf = performanceMap.get(videoId) || {};
    const reach = reachManual[videoId] || {};
    const pkg = packageMap.get(videoId) || {};
    const cls = v.classification || pkg.classification || {};

    // 3. Format Validation (Duration & Role Check)
    const durationSec = Number(v.durationSeconds || perf.durationSeconds || 0);
    const titleHasShortsTag = /#(shorts|쇼츠)/i.test(v.title || '');
    const isShort = v.format ? v.format === 'SHORTS' :
                    (durationSec > 0 && durationSec <= 60) ||
                    ['A', 'B', 'C', 'STANDALONE_SHORT'].includes(cls.role) ||
                    titleHasShortsTag;

    const views = Number(perf.views || v.statistics?.viewCount || 0);
    const subscribersGained = Number(perf.subscribersGained || 0);

    // Retention Rate Calculation
    let retentionRate = 0;
    let hasValidRetention = (views >= minViews);
    if (perf.averageViewPercentage != null && Number(perf.averageViewPercentage) > 0) {
      retentionRate = Number(perf.averageViewPercentage);
    } else if (perf.averageViewDuration != null && durationSec > 0) {
      retentionRate = Math.min(100, Math.round((Number(perf.averageViewDuration) / durationSec) * 1000) / 10);
    } else {
      retentionRate = 0;
      hasValidRetention = false;
    }

    // Determine CTR & Impressions from Studio Ingest
    let ctr = null;
    let impressions = 0;
    let hasRealCtr = false;

    const windows = reach.windows || {};
    const periods = reach.periods || {};

    if (windows['28d'] && windows['28d'].ctr != null) {
      ctr = Number(windows['28d'].ctr);
      impressions = Number(windows['28d'].impressions || 0);
      hasRealCtr = true;
    } else if (windows['lifetime'] && windows['lifetime'].ctr != null) {
      ctr = Number(windows['lifetime'].ctr);
      impressions = Number(windows['lifetime'].impressions || 0);
      hasRealCtr = true;
    } else if (windows['first_48h'] && windows['first_48h'].ctr != null) {
      ctr = Number(windows['first_48h'].ctr);
      impressions = Number(windows['first_48h'].impressions || 0);
      hasRealCtr = true;
    } else {
      // 겹치는 Studio 폴더를 계속 가져오면 같은 영상에 periods 항목이 여러 개 쌓인다 —
      // Object.values()[0]은 삽입 순서(=가장 먼저 수집된, 즉 가장 오래된 구간)를 집어서
      // 데이터를 새로 가져와도 진단이 안 바뀌는 버그였다. endDate가 가장 최신인 구간을 쓰고,
      // 같은 날 끝나면 더 긴 구간을 쓴다(pickLatestPeriod).
      const latestPeriod = pickLatestPeriod(periods);
      if (latestPeriod) {
        ctr = Number(latestPeriod.ctr);
        impressions = Number(latestPeriod.impressions || 0);
        hasRealCtr = true;
      }
    }

    const thumb = v.thumbnail || pkg.thumbnailUrl || (pkg.thumbnailPath ? `/api/package-image?id=${encodeURIComponent(pkg.id)}` : `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`);

    const pubStr = v.scheduledPublishAt || v.publishedAt || pkg.publishedAt || '';
    const pubDate = pubStr ? new Date(pubStr) : null;
    const now = new Date();
    const ageHours = pubDate ? (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60) : 999;
    const is48hWarmup = ageHours >= 0 && ageHours < 48;
    // 시청 데이터가 없는 영상은 시청률 0%로 계산돼 "초반 이탈"로 잘못 진단되므로 사분면을 확정하지 않는다.
    const hasStatisticalSignificance = hasRealCtr && hasValidRetention && !is48hWarmup && impressions >= minImpressions && views >= minViews;

    videoItems.push({
      videoId,
      title: v.title || pkg.title || `영상 ${videoId}`,
      thumbnail: thumb,
      format: isShort ? 'SHORTS' : 'LONGFORM',
      views,
      impressions,
      ctr: ctr != null ? Math.round(ctr * 100) / 100 : null,
      hasRealCtr,
      retentionRate: Math.round(retentionRate * 10) / 10,
      hasValidRetention,
      hasStatisticalSignificance,
      avgDurationSec: Number(perf.averageViewDuration || 0),
      durationSec,
      subscribersGained,
      publishedAt: pubStr,
      ageHours: Math.round(ageHours * 10) / 10,
      is48hWarmup,
      classification: cls,
    });
  }

  // 4. Dynamic Channel Weighted Averages & 5% Trimmed Outlier Removal (값이 없으면 대신값을 만들지 않고 null)
  function calcTrimmedWeightedStats(items) {
    if (!items.length) return { weightedCtr: null, weightedRet: null, count: 0 };

    // Sort by views to trim top 5% and bottom 5% outliers
    const sorted = [...items].sort((a, b) => a.views - b.views);
    const trimCount = Math.floor(sorted.length * 0.05);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount || sorted.length);

    // Weighted CTR = (Total Clicks / Total Impressions) * 100
    const totalImpressions = trimmed.reduce((acc, v) => acc + (v.impressions || 0), 0);
    const totalClicks = trimmed.reduce((acc, v) => acc + ((v.impressions || 0) * (v.ctr || 0) / 100), 0);
    const weightedCtr = totalImpressions > 0 ? Math.round(((totalClicks / totalImpressions) * 100) * 10) / 10 : null;

    // Weighted Retention = sum(views * retention) / sum(views)
    const totalViews = trimmed.reduce((acc, v) => acc + v.views, 0);
    const totalRetWeight = trimmed.reduce((acc, v) => acc + (v.views * v.retentionRate), 0);
    const weightedRet = totalViews > 0 ? Math.round((totalRetWeight / totalViews) * 10) / 10 : null;

    return {
      weightedCtr,
      weightedRet,
      count: trimmed.length,
    };
  }

  const verifiedLong = videoItems.filter(v => v.format === 'LONGFORM' && v.hasRealCtr && v.hasValidRetention);
  const verifiedShorts = videoItems.filter(v => v.format === 'SHORTS' && v.hasRealCtr && v.hasValidRetention);

  const statsLong = calcTrimmedWeightedStats(verifiedLong);
  const statsShorts = calcTrimmedWeightedStats(verifiedShorts);

  // Dynamic Thresholds (형식별 실측 가중 평균. 데이터가 없으면 임의 대신값 대신 null)
  const ctrThresholdLong = customThresholds.ctrThresholdLong != null
    ? Number(customThresholds.ctrThresholdLong)
    : (customThresholds.ctrThreshold != null ? Number(customThresholds.ctrThreshold) : statsLong.weightedCtr);

  const ctrThresholdShorts = customThresholds.ctrThresholdShorts != null
    ? Number(customThresholds.ctrThresholdShorts)
    : (customThresholds.ctrThreshold != null ? Number(customThresholds.ctrThreshold) : statsShorts.weightedCtr);

  const ctrThreshold = ctrThresholdLong;

  const retentionThresholdLong = customThresholds.retentionThresholdLong != null
    ? Number(customThresholds.retentionThresholdLong)
    : statsLong.weightedRet;

  const retentionThresholdShorts = customThresholds.retentionThresholdShorts != null
    ? Number(customThresholds.retentionThresholdShorts)
    : statsShorts.weightedRet;

  // Assign Quadrants
  const quadrantCounts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, WARMUP: 0, PENDING_STUDIO: 0, LOW_SAMPLE: 0, NO_BASELINE: 0 };

  const categorizedVideos = videoItems.map(item => {
    const isShort = item.format === 'SHORTS';
    const ctrThresh = isShort ? ctrThresholdShorts : ctrThresholdLong;
    const retThresh = isShort ? retentionThresholdShorts : retentionThresholdLong;

    if (!item.hasRealCtr) {
      quadrantCounts['PENDING_STUDIO']++;
      return {
        ...item,
        quadrant: 'PENDING_STUDIO',
        tentativeQuadrant: null,
        quadrantLabel: 'Studio CSV 대기',
        actionBadge: '📁 Studio CSV 필요',
        actionHint: '실제 CTR 데이터가 아직 없습니다. Studio에서 표 데이터를 다운로드하면 자동 연결되어 분석됩니다.',
        isVerified: false,
      };
    }

    if (!item.hasStatisticalSignificance) {
      if (item.is48hWarmup) {
        quadrantCounts['WARMUP']++;
        return {
          ...item,
          quadrant: 'WARMUP',
          tentativeQuadrant: 'WARMUP',
          quadrantLabel: '48H 골든타임 집계 중',
          actionBadge: '⏳ 초기 반응 수집 중 (교체 보류)',
          actionHint: `공개 후 ${Math.floor(item.ageHours)}시간 경과. 충성 구독자 초기 반응 집계 중이므로 48시간 데이터 정착 전까지 섣부른 썸네일 교체는 보류하세요.`,
          isVerified: false,
        };
      }

      quadrantCounts['LOW_SAMPLE']++;
      return {
        ...item,
        quadrant: 'LOW_SAMPLE',
        tentativeQuadrant: null,
        quadrantLabel: `표본 부족 (노출 ${item.impressions}회 / 조회 ${item.views}회)`,
        actionBadge: '📊 표본 수집 중',
        actionHint: `노출수 또는 조회수 모수가 적어 데이터 착시 노이즈가 있습니다. 최소 노출(${minImpressions}회+) 확보 후 확정 평가됩니다.`,
        isVerified: false,
      };
    }

    if (ctrThresh == null || retThresh == null) {
      quadrantCounts['NO_BASELINE']++;
      return {
        ...item,
        quadrant: 'NO_BASELINE',
        tentativeQuadrant: null,
        quadrantLabel: '기준 없음 (표본 부족)',
        actionBadge: '📏 기준선 수집 중',
        actionHint: '같은 형식의 비교 기준선(실측 CTR·시청률)이 아직 없어 사분면을 확정하지 않습니다.',
        isVerified: false,
      };
    }

    const highCtr = (item.ctr || 0) >= ctrThresh;
    const highRet = item.retentionRate >= retThresh;

    let quadrant = 'Q4';
    let quadrantLabel = '기획 재검토';
    let actionBadge = '⚠️ 소재/타겟 피벗';
    let actionHint = '주제와 타겟 시청자층의 결핍을 재정의하고 다음 기획 시 배제할 패턴으로 학습';

    if (highCtr && highRet) {
      quadrant = 'Q1';
      quadrantLabel = '알고리즘 효자 영상';
      actionBadge = '🏆 후속편/시리즈 확장 1순위';
      actionHint = '알고리즘 추천 폭발 중! 2편 제작, 쇼츠 파생 변형, 재생목록 상단 배치 필수';
    } else if (highCtr && !highRet) {
      quadrant = 'Q2';
      quadrantLabel = '낚시성 의심 / 초반이탈';
      actionBadge = '⚡ 오프닝 5초 후킹 재설계';
      actionHint = '썸네일은 잘 클릭되나 30초 내 이탈 발생. 첫 5초 인트로와 본문 기대치 일치화 필요';
    } else if (!highCtr && highRet) {
      quadrant = 'Q3';
      quadrantLabel = '숨은 보석 영상';
      actionBadge = '💎 썸네일·제목 교체 1순위';
      actionHint = '영상 완성도와 시청 지속률은 극상! 썸네일과 제목만 바꾸면 즉시 역주행 폭발 가능';
    }

    quadrantCounts[quadrant]++;

    return {
      ...item,
      quadrant,
      tentativeQuadrant: quadrant,
      quadrantLabel,
      actionBadge,
      actionHint,
      isVerified: true,
    };
  });

  return {
    ok: true,
    totalCount: categorizedVideos.length,
    trafficHealth: {
      totalTrafficViews,
      browseAndSuggestedRatio,
      searchRatio: totalTrafficViews > 0 ? Math.round((searchViews / totalTrafficViews) * 100) : 0,
      externalRatio: totalTrafficViews > 0 ? Math.round((extViews / totalTrafficViews) * 100) : 0,
    },
    thresholds: {
      ctrThreshold,
      ctrThresholdLong,
      ctrThresholdShorts,
      retentionThresholdLong,
      retentionThresholdShorts,
      isDynamic: customThresholds.ctrThreshold == null && customThresholds.ctrThresholdLong == null && customThresholds.ctrThresholdShorts == null,
    },
    averages: {
      avgCtrLong: statsLong.weightedCtr,
      avgCtrShorts: statsShorts.weightedCtr,
      avgRetLong: statsLong.weightedRet,
      avgRetShorts: statsShorts.weightedRet,
    },
    quadrantCounts,
    videos: categorizedVideos,
  };
}

// (2026-11-12) 여기 있던 diagnoseVideoWithGemini는 어디서도 부르지 않는 죽은 코드였고, 프롬프트에 검증 안 된 우리 채널
// 철학을 박아 넣어 "반드시 반영"하게 했다. knowledge/legacy/agents-archive-2026-11-13.md "AI 분석 프롬프트에 검증 안 된 우리 틀을 넣지 않는다"에 따라 지웠다.
