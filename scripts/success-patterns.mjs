// "통함" 판정이 난 영상을 성공 패턴(data/youtube/success-patterns.json)에 자동으로 기록한다 (2026-11-11).
// 전에는 Phase 11 리뷰 때 Claude가 적을 때만 쌓여서 2026-08-31 이후 0개였다.
//
// 코드가 적는 것은 사실뿐이다: 어떤 영상이 같은 형식 중앙값의 몇 배였는지, 그 영상의 기획 근거
// (쇼츠 형식 Track A/B/C, 근거 경쟁 채널, 답한 시청자 고민). "왜 통했는지"의 해석(reusableHook·
// reusableAnalogy)은 지어내지 않고 비워 두며, Claude가 리뷰 때 덧붙이면 다음 실행에서도 지우지 않는다.
//
// 확정·가설 (스킬 05 7절과 같은 규칙을 기계적으로):
//   같은 형식에서 같은 요인(factorKeys 중 하나)으로 만든 영상이 2편 이상 통했고,
//   그 요인으로 만든 가장 최근 판정 편이 "안 통함"이 아니면 → 확정. 아니면 가설.

const FINAL = new Set(['worked', 'neutral', 'failed']);
const FORMAT_LABEL = {SHORTS: '쇼츠', LONGFORM: '롱폼'};

export function factorKeysOf(sources) {
  if (!sources) return [];
  const keys = [];
  if (sources.track) keys.push(`track:${sources.track}`);
  for (const c of sources.competitors || []) if (c.channelId) keys.push(`channel:${c.channelId}`);
  if (sources.audience) keys.push(`pain:${sources.audience}`);
  return keys;
}

function describeFactors(sources) {
  if (!sources) return '기획 근거 기록 없음(BRIEF.md "기획 근거" 칸이 없던 편)';
  const parts = [];
  if (sources.track) parts.push(`형식 ${sources.track}`);
  if ((sources.competitors || []).length) parts.push(`근거 경쟁 채널 ${sources.competitors.map((c) => c.channelTitle).join('·')}`);
  if (sources.audience) parts.push(`시청자 고민 "${sources.audience}"`);
  return parts.length ? parts.join(' / ') : '기획 근거 칸은 있으나 근거 없음';
}

/**
 * @param {{entries?: object[]}} store 기존 success-patterns.json
 * @param {object[]} outcomes planning-outcome.mjs loadEpisodeOutcomes() 결과
 * @returns {{store: object, added: string[], changed: string[]}}
 */
export function recordSuccessPatterns(store = {}, outcomes = [], now = new Date()) {
  const finals = outcomes.filter((o) => o?.videoId && FINAL.has(o.verdict));
  const worked = finals.filter((o) => o.verdict === 'worked');

  // 요인별 판정: 같은 형식 안에서만 센다.
  const confirmedKeys = new Map(); // `${format}|${key}` -> true/false
  const demoteNote = new Map();
  const byFormatKey = new Map();
  for (const o of finals) {
    for (const key of factorKeysOf(o.sources)) {
      const k = `${o.format}|${key}`;
      if (!byFormatKey.has(k)) byFormatKey.set(k, []);
      byFormatKey.get(k).push(o);
    }
  }
  for (const [k, list] of byFormatKey) {
    const workedCount = list.filter((o) => o.verdict === 'worked').length;
    const latest = [...list].sort((a, b) => String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))[0];
    const ok = workedCount >= 2 && latest.verdict !== 'failed';
    confirmedKeys.set(k, ok);
    if (workedCount >= 2 && latest.verdict === 'failed') demoteNote.set(k, `같은 요인으로 만든 최근 편 ${latest.label}이 안 통함(${latest.ratio}배)`);
  }

  const prev = new Map((store.entries || []).map((e) => [e.id, e]));
  const added = [];
  const changed = [];
  for (const o of worked) {
    const keys = factorKeysOf(o.sources);
    const fk = keys.map((key) => `${o.format}|${key}`);
    const status = fk.some((k) => confirmedKeys.get(k)) ? '확정' : '가설';
    const notes = fk.map((k) => demoteNote.get(k)).filter(Boolean);
    const old = prev.get(o.videoId);
    const entry = {
      ...(old || {}),
      id: o.videoId,
      videoId: o.videoId,
      title: o.title || old?.title || '',
      format: FORMAT_LABEL[o.format] || o.format,
      ratio: o.ratio,
      views7d: o.views7d ?? null,
      medianViews: o.baselineViews7d ?? null,
      sampleMedianViews7d: o.sampleMedianViews7d ?? null,
      status,
      coreSuccessFactor: describeFactors(o.sources),
      factorKeys: keys,
      reusableHook: old?.reusableHook || '',
      reusableAnalogy: old?.reusableAnalogy || '',
      review: o.slug ? `videos/${o.slug}/REVIEW.md` : (old?.review || ''),
      note: notes.length ? notes.join(' / ') : (old?.source === 'auto' ? '' : (old?.note || '')),
      source: 'auto',
      diagnosedAt: old?.diagnosedAt || now.toISOString(),
      updatedAt: now.toISOString(),
    };
    if (!old) added.push(o.videoId);
    else if (old.status !== entry.status || old.ratio !== entry.ratio) changed.push(o.videoId);
    prev.set(o.videoId, entry);
  }

  const entries = [...prev.values()];
  return {
    store: {...store, schemaVersion: store.schemaVersion || 1, updatedAt: (added.length || changed.length) ? now.toISOString() : (store.updatedAt || null), entries},
    added,
    changed,
  };
}
