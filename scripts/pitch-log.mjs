// Kill-First 피치 기록 도우미(2026-11-23).
// 비교 시트를 무겁게 다 쓰기 전에 AI가 2~3개 후보를 빠르게 검증하고,
// 평균값·시각 약한 아이디어를 자체 폐기한 이유까지 학습 자산으로 남긴다.
export const PITCH_LOG_PATH = 'data/youtube/pitch-log.json';
export const PITCH_DECISIONS = Object.freeze(['adopted', 'killed']);
export const PITCH_FORMATS = Object.freeze(['SHORTS', 'LONGFORM', 'SET']);

const filled = (v) => typeof v === 'string' && v.trim().length > 0;

export function validatePitchEntry(entry) {
  const problems = [];
  if (!entry || typeof entry !== 'object') return ['피치 항목이 객체가 아니다'];
  if (!filled(entry.id)) problems.push('id가 없다');
  if (!filled(entry.date) || !/^\d{4}-\d{2}-\d{2}/.test(entry.date)) problems.push('date(YYYY-MM-DD)가 없다');
  if (!PITCH_FORMATS.includes(entry.format)) problems.push(`format(${entry.format})이 SHORTS/LONGFORM/SET이 아니다`);
  if (!filled(entry.topic)) problems.push('topic이 없다');
  if (!PITCH_DECISIONS.includes(entry.decision)) problems.push(`decision(${entry.decision})이 adopted/killed가 아니다`);
  if (!filled(entry.reason)) problems.push('채택·폐기 사유(reason)가 없다');
  if (!filled(entry.audienceBridge)) problems.push('시청자 연결 고리(audienceBridge: 구체적 앵커 + 1개 빈틈)가 없다');
  if (!filled(entry.tldr)) problems.push('한 줄 요약(tldr)이 없다');
  if (!Array.isArray(entry.visualBeats) || entry.visualBeats.filter(filled).length < 2) {
    problems.push('핵심 시각 장면(visualBeats)이 2개 미만이다');
  }
  return problems;
}

export function summarizePitchLog(store, limit = 8) {
  const pitches = Array.isArray(store?.pitches) ? store.pitches : [];
  const ordered = [...pitches].sort((a, b) => String(b?.date || '').localeCompare(String(a?.date || '')));
  const killed = ordered.filter((p) => p?.decision === 'killed');
  const adopted = ordered.filter((p) => p?.decision === 'adopted');
  return {
    total: pitches.length,
    adoptedCount: adopted.length,
    killedCount: killed.length,
    recentKilled: killed.slice(0, limit),
    recentAdopted: adopted.slice(0, limit),
  };
}
