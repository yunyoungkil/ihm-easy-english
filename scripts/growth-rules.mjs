// episode-planning 스킬의 판정 규칙을 코드로 둔다. 문서에만 적어 두면 숫자를 보고도 판정을 건너뛰기 쉽다.
//
//   - 형식 배분: 한 형식이 조회수 대부분을 내는데 그 형식의 공개가 끊겼으면 그 형식을 먼저 만든다.
//   - 작은 표본: 노출이 적으면 클릭 한두 번에 결과가 갈리므로 썸네일 테스트와 중단 신호를 믿지 않는다.
//   - 시작 브리핑: 새 대화의 첫 답변에 넘겨줄 안내문을 만든다.

export const FORMAT_SHARE_THRESHOLD = 70; // %
export const MIN_VIEWS_FOR_FORMAT_RULE = 100;
export const SMALL_SAMPLE_IMPRESSIONS = 1000;

const FORMATS = [
  {key: 'shorts', label: '쇼츠', contentType: 'shorts'},
  {key: 'longform', label: '롱폼', contentType: 'videoOnDemand'},
];

export function decideFormatPriority({contentTypes, publishedLast14}) {
  const viewsOf = (contentType) =>
    (contentTypes || [])
      .filter((row) => row.creatorContentType === contentType)
      .reduce((total, row) => total + (Number(row.views) || 0), 0);
  const counts = Object.fromEntries(FORMATS.map((format) => [format.key, viewsOf(format.contentType)]));
  const total = counts.shorts + counts.longform;

  if (total === 0) return {priority: null, shares: null, total, verdict: '형식별 조회 데이터가 없어 판정하지 못했습니다'};

  const shares = Object.fromEntries(FORMATS.map((format) => [format.key, Math.round((counts[format.key] / total) * 100)]));
  if (total < MIN_VIEWS_FOR_FORMAT_RULE) {
    return {priority: null, shares, total, verdict: `조회수 ${total}회로 표본이 작아 판정을 보류합니다`};
  }

  const leader = FORMATS.find((format) => shares[format.key] >= FORMAT_SHARE_THRESHOLD);
  if (!leader) return {priority: null, shares, total, verdict: `한 형식이 ${FORMAT_SHARE_THRESHOLD}%를 넘지 않아 우선순위를 정하지 않습니다`};

  const published = Number(publishedLast14?.[leader.key]) || 0;
  if (published > 0) {
    return {priority: null, shares, total, verdict: `${leader.label}가 조회수의 ${shares[leader.key]}%이고 최근 14일 ${published}개를 공개해 흐름이 이어지고 있습니다`};
  }
  return {priority: leader.key, shares, total, verdict: `${leader.label}가 조회수의 ${shares[leader.key]}%인데 최근 14일 공개가 0개 — 다음 제작은 ${leader.label}부터`};
}

export function latestImpressions(reachEntry) {
  const periods = Object.values(reachEntry?.periods || {}).filter((period) => period?.impressions != null);
  if (!periods.length) return null;
  const latest = periods.reduce((best, period) => (String(period.endDate) > String(best.endDate) ? period : best));
  return Number(latest.impressions);
}

export function decideSampleSize(impressions) {
  const known = (impressions || []).filter((value) => value != null).map(Number).sort((a, b) => a - b);
  if (!known.length) return {median: null, count: 0, small: true};
  const middle = Math.floor(known.length / 2);
  const median = known.length % 2 ? known[middle] : (known[middle - 1] + known[middle]) / 2;
  return {median, count: known.length, small: median < SMALL_SAMPLE_IMPRESSIONS};
}

const BRIEFING_INSTRUCTION = [
  '[시작 브리핑] 이 대화의 첫 답변은 episode-planning 스킬의 Phase 0-C 시작 브리핑으로 연다.',
  '절차는 .claude/skills/episode-planning/references/00-unblock-and-weekly.md 에 있다.',
  '사용자 요청이 함께 있으면 브리핑 바로 뒤에 처리하고, 승인을 기다리며 멈추지 않는다. 사용자가 빼라고 하면 생략한다.',
].join(' ');

export const NEXT_ACTIONS_HEADING = '## ▶ 다음 할 일';

// knowledge/now.md의 "다음 할 일" 절에서 안 끝난 항목만 순서대로 뽑는다.
export function extractNextActions(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === NEXT_ACTIONS_HEADING);
  if (start < 0) return [];
  const actions = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2} /.test(line)) break;
    const item = line.match(/^- (?:\[( |x|X)\] )?(.+)$/);
    if (item && !/x/i.test(item[1] || '')) actions.push(item[2].trim());
  }
  return actions;
}

// "(차차)"는 급하지 않은 수리 항목 표시다(2026-11-09 사용자 결정: 간단한 것은 바로 고치고 나머지는 브리핑에서 알려 차차 고친다).
const SLOW_FIX_MARK = '(차차)';

const nextActionLines = (actions) =>
  actions.length
    ? [
        '다음 할 일(knowledge/now.md, 급한 순서). 브리핑의 할 일 줄은 이 목록을 먼저 따르고, "사용자 결정" 항목은 브리핑 끝에 묻는다:',
        ...actions.map((action, index) => `${index + 1}. ${action}`),
        ...(actions.some((action) => action.includes(SLOW_FIX_MARK))
          ? [`"${SLOW_FIX_MARK}" 항목은 급하지 않은 수리다. 할 일 줄에 넣지 말고 브리핑 마지막 줄 "남은 수리: N개 (다음: 하나)"로 알린다.`]
          : []),
      ]
    : [];

export function buildBriefingContext(check, nextActions = []) {
  const actionLines = nextActionLines(nextActions);
  if (!check) return [BRIEFING_INSTRUCTION, '막힌 곳 점검을 실행하지 못했다. npm run growth-check 를 직접 실행해 확인한다.', ...actionLines].join('\n');

  const reviews = (check.reviewsDue || []).map((review) => `${review.name}(${(review.due || []).join(', ')})`);
  const sample = check.sample || {};
  const sampleLine = sample.median == null
    ? '최근 롱폼 노출 기록 없음 — 작은 표본 규칙 적용'
    : `최근 롱폼 노출 중앙값 ${sample.median}회${sample.small ? ' — 작은 표본 규칙 적용' : ''}`;

  return [
    BRIEFING_INSTRUCTION,
    `막힌 곳 점검(파일 기준, ${check.generatedFor}. git pull로 새 내용을 받았으면 다시 실행한다):`,
    `- 업로드 대기 ${(check.backlog || []).length}개`,
    `- 최근 14일 공개: 롱폼 ${check.cadence?.long14 ?? '?'}개, 쇼츠 ${check.cadence?.shorts14 ?? '?'}개. ${check.cadence?.verdict ?? ''}`.trimEnd(),
    `- 밀린 리뷰: ${reviews.length ? reviews.join(', ') : '없음'}`,
    `- 형식 배분: ${check.formatPriority?.verdict ?? '판정 없음'}`,
    `- 표본: ${sampleLine}`,
    ...actionLines,
  ].join('\n');
}

export function renderSessionStartOutput(additionalContext) {
  return JSON.stringify({hookSpecificOutput: {hookEventName: 'SessionStart', additionalContext}});
}
