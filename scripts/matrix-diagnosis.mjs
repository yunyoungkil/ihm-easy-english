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
    : 50;

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
    const isShort = (v.format === 'SHORTS') || 
                    (durationSec > 0 && durationSec <= 60) || 
                    ['A', 'B', 'C', 'STANDALONE_SHORT'].includes(cls.role);

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
      // 데이터를 새로 가져와도 진단이 안 바뀌는 버그였다. endDate가 가장 최신인 구간을 쓴다.
      const latestPeriod = Object.values(periods)
        .filter((p) => p && p.ctr != null)
        .sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')))[0];
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
    const hasStatisticalSignificance = hasRealCtr && !is48hWarmup && impressions >= minImpressions && views >= minViews;

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

  // 4. Dynamic Channel Weighted Averages & 5% Trimmed Outlier Removal
  function calcTrimmedWeightedStats(items) {
    if (!items.length) return { weightedCtr: 5.5, weightedRet: 42.0, count: 0 };
    
    // Sort by views to trim top 5% and bottom 5% outliers
    const sorted = [...items].sort((a, b) => a.views - b.views);
    const trimCount = Math.floor(sorted.length * 0.05);
    const trimmed = sorted.slice(trimCount, sorted.length - trimCount || sorted.length);

    // Weighted CTR = (Total Clicks / Total Impressions) * 100
    const totalImpressions = trimmed.reduce((acc, v) => acc + (v.impressions || 0), 0);
    const totalClicks = trimmed.reduce((acc, v) => acc + ((v.impressions || 0) * (v.ctr || 0) / 100), 0);
    const weightedCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 5.5;

    // Weighted Retention = sum(views * retention) / sum(views)
    const totalViews = trimmed.reduce((acc, v) => acc + v.views, 0);
    const totalRetWeight = trimmed.reduce((acc, v) => acc + (v.views * v.retentionRate), 0);
    const weightedRet = totalViews > 0 ? totalRetWeight / totalViews : 42.0;

    return {
      weightedCtr: Math.round(weightedCtr * 10) / 10,
      weightedRet: Math.round(weightedRet * 10) / 10,
      count: trimmed.length,
    };
  }

  const verifiedLong = videoItems.filter(v => v.format === 'LONGFORM' && v.hasRealCtr && v.hasValidRetention);
  const verifiedShorts = videoItems.filter(v => v.format === 'SHORTS' && v.hasRealCtr && v.hasValidRetention);

  const statsLong = calcTrimmedWeightedStats(verifiedLong);
  const statsShorts = calcTrimmedWeightedStats(verifiedShorts);

  // Dynamic Thresholds (fallback to trimmed weighted channel averages if not explicitly overridden)
  const ctrThreshold = customThresholds.ctrThreshold != null 
    ? Number(customThresholds.ctrThreshold) 
    : (statsLong.weightedCtr || 5.5);

  const retentionThresholdLong = customThresholds.retentionThresholdLong != null 
    ? Number(customThresholds.retentionThresholdLong) 
    : (statsLong.weightedRet || 42.0);

  const retentionThresholdShorts = customThresholds.retentionThresholdShorts != null 
    ? Number(customThresholds.retentionThresholdShorts) 
    : (statsShorts.weightedRet || 70.0);

  // Assign Quadrants
  const quadrantCounts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, WARMUP: 0, PENDING_STUDIO: 0, LOW_SAMPLE: 0 };

  const categorizedVideos = videoItems.map(item => {
    const isShort = item.format === 'SHORTS';
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

    const highCtr = (item.ctr || 0) >= ctrThreshold;
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
      retentionThresholdLong,
      retentionThresholdShorts,
      isDynamic: customThresholds.ctrThreshold == null,
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

// 5. Sanitized Gemini AI Diagnostic Engine
export async function diagnoseVideoWithGemini({ video, geminiKey, successPatterns = [] }) {
  if (!geminiKey) {
    throw new Error('Gemini API 키(GEMINI_API_KEY)가 설정되지 않았습니다.');
  }
  if (!video) {
    throw new Error('진단할 영상 정보가 전달되지 않았습니다.');
  }

  // Data Sanitization: clean title, remove hashtags, round floats
  const cleanTitle = String(video.title || '')
    .replace(/#[\w\uAC00-\uD7A3]+/g, '')
    .replace(/[^\w\s\uAC00-\uD7A3\(\)\[\]·,!?~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const sanitizedCtr = Math.round(Number(video.ctr || 0) * 10) / 10;
  const sanitizedRet = Math.round(Number(video.retentionRate || 0) * 10) / 10;
  const durationMinSec = `${Math.floor((video.durationSec || 0) / 60)}분 ${(video.durationSec || 0) % 60}초`;

  // Quadrant-Specific Isolation Guide
  let quadrantGuidance = '';
  if (video.quadrant === 'Q3') {
    quadrantGuidance = `[🚨 Q3 숨은 보석 영상 전용 지침]:
- 이 영상은 시청 지속률(${sanitizedRet}%)이 채널 기준 이상으로 우수하여 **본문 내용/강의 완성도는 이미 검증**되었습니다.
- **절대로 영상 본문이나 강의 구성을 비판하지 마세요.**
- CTR(${sanitizedCtr}%)이 낮은 유일한 원인은 **썸네일 카피의 호기심 유발 부족 및 제목의 직관성 저하**입니다.
- 처방전은 100% **썸네일 시각적 대조(Before/After, 3초 컷) 및 고클릭률 대체 제목**에만 집중하세요.`;
  } else if (video.quadrant === 'Q2') {
    quadrantGuidance = `[🚨 Q2 낚시성/초반이탈 영상 전용 지침]:
- 이 영상은 CTR(${sanitizedCtr}%)은 높으나 시청 지속률(${sanitizedRet}%)이 낮습니다.
- 시청자가 썸네일을 보고 기대했던 내용과 **첫 5~30초 오프닝 인트로가 어긋났거나 서론이 지루하여 이탈**했습니다.
- 처방전은 **오프닝 5초 후킹 재설계 및 썸네일 기대치 일치화**에 집중하세요.`;
  } else if (video.quadrant === 'Q1') {
    quadrantGuidance = `[🚨 Q1 알고리즘 효자 영상 전용 지침]:
- CTR(${sanitizedCtr}%)과 지속률(${sanitizedRet}%)이 모두 최상위권인 채널 대표 영상입니다.
- 처방전은 **시리즈 2탄 제작, 쇼츠 파생 확장, 재생목록 상단 배치** 등 추천 알고리즘 폭발 유지에 집중하세요.
- 이 영상은 우리 채널의 '성공 패턴 DB'에 영구 저장됩니다. 응답의 "successPattern" 필드에 이 영상이
  먹힌 이유를 **다른 영상에도 재사용 가능한 일반화된 패턴**으로 반드시 채워 주세요(제목/썸네일의
  구체적 문구가 아니라 재사용 가능한 후킹 기법·비유 방식 자체).`;
  } else {
    quadrantGuidance = `[🚨 Q4 기획 재검토 영상 전용 지침]:
- CTR과 지속률이 모두 저조합니다.
- 처방전은 **소재 재선정, 3060 성인 학습자의 근본적 결핍(Pain Point) 재발굴**에 집중하세요.`;
  }

  const otherPatterns = successPatterns.filter((p) => p.videoId !== video.videoId).slice(0, 5);
  const successPatternsBlock = otherPatterns.length
    ? `[우리 채널 검증된 성공 패턴 DB — Q1(알고리즘 효자) 영상에서 실제로 먹혔던 패턴, 처방에 참고할 것]:
${otherPatterns.map((p) => `- (${p.title}, CTR ${p.ctr}%) 후킹: ${p.reusableHook || '기록 없음'} / 비유: ${p.reusableAnalogy || '기록 없음'}`).join('\n')}
`
    : '';

  const prompt = `당신은 대한민국 최고 수준의 유튜브 알고리즘 & 채널 성장 데이터 전략가입니다.
유튜브 교육 채널 '이해하면 쉬운영어'(3060 성인 & 왕초보 영어 타겟)의 영상을 4사분면 진단 매트릭스에 따라 정밀 처방합니다.

[채널 핵심 브랜드 철학 & 페르소나 — alternativeTitles·처방전 문구에 반드시 반영할 것]:
- 톤앤매너: 가식 없는 솔직 담백한 실전 학습 파트너. ("기초가 전혀 없어도 괜찮습니다. 당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다. 무작정 외우지 마세요.")
- 선생님처럼 훈계하는 말투, 자극적인 낚시성 과장, 어려운 음성학 용어(비음화, 유음화, 연음 공식, IPA 기호) 절대 금지.
- 독점 3단계 도파민 공식: 1) 게으른 혀의 소리 지름길(원리 발견) → 2) 패턴 확장(카타르시스) → 3) 반전 꿀팁(미세한 차이).

${successPatternsBlock}
[정규화된 영상 데이터]:
- 제목: "${cleanTitle}"
- 포맷: ${video.format === 'SHORTS' ? '쇼츠 (Shorts)' : '롱폼 (Longform)'} (길이: ${durationMinSec})
- 조회수: ${Number(video.views || 0).toLocaleString()}회
- 노출수: ${Number(video.impressions || 0).toLocaleString()}회
- 실측 노출 클릭률 (CTR): ${sanitizedCtr}% ${video.hasRealCtr ? '(Studio 실측)' : '(대기)'}
- 평균 시청 지속률 (Retention): ${sanitizedRet}% (평균 시청시간: ${video.avgDurationSec}초)
- 확정 사분면: ${video.quadrant} (${video.quadrantLabel})

${quadrantGuidance}

아래 JSON 스키마 규격으로만 응답하세요. 백틱(\`\`\`json)으로 감싸서 출력하세요.

{
  "quadrant": "${video.quadrant}",
  "diagnosisSummary": "사분면 위치에 따른 핵심 요약 (1~2문장)",
  "coreProblemOrSuccessFactor": "데이터 기반의 핵심 원인 분석 (1~2문장)",
  "actionPrescriptions": [
    {
      "step": 1,
      "category": "썸네일 & 제목 개선",
      "action": "구체적인 즉각 실행 액션"
    },
    {
      "step": 2,
      "category": "오프닝 / 본문 구조",
      "action": "구체적인 즉각 실행 액션"
    },
    {
      "step": 3,
      "category": "후속 전략",
      "action": "구체적인 즉각 실행 액션"
    }
  ],
  "alternativeTitles": [
    "3060 성인 학습자의 클릭을 부르는 고클릭률 대체 제목 1",
    "호기심과 손실 회피를 자극하는 대체 제목 2",
    "직관적이고 쉬운 완성형 대체 제목 3"
  ],
  "successPattern": {
    "reusableHook": "${video.quadrant === 'Q1' ? '이 영상의 후킹 기법을 다른 영상에도 쓸 수 있게 일반화한 한 문장 (Q1만 필수)' : 'null'}",
    "reusableAnalogy": "${video.quadrant === 'Q1' ? '이 영상이 쓴 핵심 비유/설명 방식을 일반화한 한 문장 (Q1만 필수)' : 'null'}"
  }
}`;

  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${model} error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Gemini 반환 데이터가 비어 있습니다.');

      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || [null, rawText];
      return JSON.parse(jsonMatch[1].trim());
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`AI 진단 실패: ${lastError?.message}`);
}
