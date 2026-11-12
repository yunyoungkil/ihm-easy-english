// 시장 수요 키워드 풀(`byKeyword`) 자동 분석·갱신 대상 선정 및 병합 도우미 (2026-11-12).
// daily-loop.mjs가 매일 새벽 정해진 쿼터 예산 안에서 미분석 D+7 유입 검색어와 오래된 키워드를
// 순차적으로 갱신할 수 있도록, 순수 선택 로직과 실행기·병합기를 부작용 없이 분리한다.

export const DEFAULT_KEYWORD_REFRESH_LIMIT = 2;
export const DEFAULT_KEYWORD_REFRESH_DAYS = 14;
export const DEFAULT_KEYWORD_FAILURE_COOLDOWN_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * YouTube Data API 쿼터/인증/한도 오류인지 판별한다.
 * 발생 시 같은 배치에서 추가 키워드 호출을 즉시 중단한다.
 */
export function isQuotaOrAuthError(message = '') {
  return /quota|exceeded|RESOURCE_EXHAUSTED|YOUTUBE_API_KEY|API[_\s-]?key|\b403\b|\b429\b/i.test(String(message || ''));
}

const toPositiveInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

const parseMs = (iso) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
};

/**
 * 이번 일일 루프에서 분석/재분석할 키워드 대상을 고른다.
 * 우선순위:
 *  1) 아직 점수가 없는 키워드(marketDemandScore == null, 표본 0개 쿨다운 제외), searchViews 내림차순
 *  2) analyzedAt이 refreshDays일 이상 지난 키워드, 가장 오래된 순
 * @returns {{ targets: Array<{keyword: string, reason: 'unanalyzed'|'stale', searchViews: number|null, analyzedAt: string|null}>, skippedCount: number }}
 */
export function selectKeywordRefreshTargets(marketDemand = {}, {
  limit = DEFAULT_KEYWORD_REFRESH_LIMIT,
  refreshDays = DEFAULT_KEYWORD_REFRESH_DAYS,
  failedKeywords = {},
  cooldownDays = DEFAULT_KEYWORD_FAILURE_COOLDOWN_DAYS,
  now = new Date(),
} = {}) {
  const maxTargets = toPositiveInt(limit, DEFAULT_KEYWORD_REFRESH_LIMIT);
  const refreshMs = toPositiveInt(refreshDays, DEFAULT_KEYWORD_REFRESH_DAYS) * DAY_MS;
  const cooldownMs = toPositiveInt(cooldownDays, DEFAULT_KEYWORD_FAILURE_COOLDOWN_DAYS) * DAY_MS;
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  const entries = Array.isArray(marketDemand?.byKeyword) ? marketDemand.byKeyword : [];
  const unanalyzed = [];
  const stale = [];
  let skippedCount = 0;

  for (const item of entries) {
    const keyword = String(item?.keyword || '').trim();
    if (!keyword) continue;

    const failMs = parseMs(failedKeywords?.[keyword]?.lastFailedAt);
    if (failMs !== null && nowMs - failMs < cooldownMs) {
      skippedCount++;
      continue;
    }

    const analyzedMs = parseMs(item.analyzedAt);
    const hasScore = item.marketDemandScore !== null && item.marketDemandScore !== undefined && Number.isFinite(Number(item.marketDemandScore));

    if (!hasScore) {
      // 이전에 market-demand.mjs가 실제로 돌려 표본 0개로 기록된 키워드는 refreshDays 동안 재시도하지 않는다.
      if (item.emptyReason && analyzedMs !== null && nowMs - analyzedMs < refreshMs) {
        skippedCount++;
        continue;
      }
      unanalyzed.push({
        keyword,
        reason: 'unanalyzed',
        searchViews: Number.isFinite(Number(item.searchViews)) ? Number(item.searchViews) : null,
        analyzedAt: item.analyzedAt || null,
      });
      continue;
    }

    if (analyzedMs === null || nowMs - analyzedMs >= refreshMs) {
      stale.push({
        keyword,
        reason: 'stale',
        searchViews: Number.isFinite(Number(item.searchViews)) ? Number(item.searchViews) : null,
        analyzedAt: item.analyzedAt || null,
        _analyzedMs: analyzedMs ?? -Infinity,
      });
    }
  }

  unanalyzed.sort((a, b) => (b.searchViews ?? 0) - (a.searchViews ?? 0) || a.keyword.localeCompare(b.keyword));
  stale.sort((a, b) => a._analyzedMs - b._analyzedMs || a.keyword.localeCompare(b.keyword));

  const targets = [
    ...unanalyzed,
    ...stale.map(({_analyzedMs, ...rest}) => rest),
  ].slice(0, maxTargets);

  return {targets, skippedCount};
}

/**
 * 만료된 실패 기록을 걷어내고, 이번 배치 결과를 합쳐 다음 실행용 failedKeywords 맵을 만든다.
 */
export function updateKeywordFailureMap(previousFailures = {}, {
  analyzed = [],
  failed = [],
  cooldownDays = DEFAULT_KEYWORD_FAILURE_COOLDOWN_DAYS,
  now = new Date(),
} = {}) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const cooldownMs = toPositiveInt(cooldownDays, DEFAULT_KEYWORD_FAILURE_COOLDOWN_DAYS) * DAY_MS;
  const next = {};

  for (const [kw, entry] of Object.entries(previousFailures || {})) {
    const ms = parseMs(entry?.lastFailedAt);
    if (ms !== null && nowMs - ms < cooldownMs) {
      next[kw] = entry;
    }
  }
  for (const item of analyzed) {
    if (item?.keyword) delete next[item.keyword];
  }
  for (const item of failed) {
    if (item?.keyword) {
      next[item.keyword] = {
        lastFailedAt: new Date(nowMs).toISOString(),
        message: String(item.error || '실행 실패').slice(0, 200),
      };
    }
  }
  return next;
}

/**
 * 선택된 키워드 목록을 순차 실행한다. 쿼터/인증 오류가 나면 즉시 중단한다.
 */
export async function executeKeywordRefreshTargets(targets = [], runKeywordFn) {
  const analyzed = [];
  const failed = [];
  let haltedOnQuota = false;

  for (const target of targets) {
    try {
      const res = await runKeywordFn(target.keyword);
      const qComments = res?.queued?.comments?.length || 0;
      const qScripts = res?.queued?.scripts?.length || 0;
      analyzed.push({
        keyword: target.keyword,
        reason: target.reason,
        queuedReports: qComments + qScripts,
      });
    } catch (err) {
      const message = String(err?.message || err || 'unknown error');
      failed.push({keyword: target.keyword, reason: target.reason, error: message});
      if (isQuotaOrAuthError(message)) {
        haltedOnQuota = true;
        break;
      }
    }
  }

  return {analyzed, failed, haltedOnQuota};
}

/**
 * market-demand.mjs 실행 결과를 기존 byKeyword 항목에 병합한다.
 * D+7 유입 출처(source, searchViews, firstSeenAt, lastD7SyncedAt, d7OutOfActiveSince)를 잃지 않고 보존한다.
 */
export function mergeKeywordAnalysisEntries(existingEntries = [], newEntries = []) {
  const merged = new Map((Array.isArray(existingEntries) ? existingEntries : []).map((k) => [k.keyword, k]));
  for (const entry of Array.isArray(newEntries) ? newEntries : []) {
    const prev = merged.get(entry.keyword);
    merged.set(entry.keyword, prev ? {
      ...prev,
      ...entry,
      source: prev.source ?? entry.source ?? null,
      searchViews: prev.searchViews ?? entry.searchViews ?? null,
      firstSeenAt: prev.firstSeenAt ?? entry.firstSeenAt ?? null,
      lastD7SyncedAt: prev.lastD7SyncedAt ?? entry.lastD7SyncedAt ?? null,
      d7OutOfActiveSince: prev.d7OutOfActiveSince ?? entry.d7OutOfActiveSince ?? null,
    } : entry);
  }
  return [...merged.values()].sort(
    (a, b) => (b.opportunityScore ?? b.marketDemandScore ?? -1) - (a.opportunityScore ?? a.marketDemandScore ?? -1),
  );
}

