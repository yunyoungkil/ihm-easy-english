// episode-planning 스킬의 판정 규칙을 코드로 둔다. 문서에만 적어 두면 숫자를 보고도 판정을 건너뛰기 쉽다.
//
//   - 형식 배분: 한 형식이 조회수 대부분을 내는데 그 형식의 공개가 끊겼으면 그 형식을 먼저 만든다.
//   - 작은 표본: 노출이 적으면 클릭 한두 번에 결과가 갈리므로 썸네일 테스트와 중단 신호를 믿지 않는다.
//   - 시작 브리핑: 새 대화의 첫 답변에 넘겨줄 안내문을 만든다.

import {pickLatestPeriodWithImpressions} from './studio-reach.mjs';

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
  const latest = pickLatestPeriodWithImpressions(reachEntry?.periods);
  return latest ? Number(latest.impressions) : null;
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

// ---- 시작 브리핑 재료 (2026-11-09 사용자 결정) ----------------------------------
// 브리핑 줄: 제목(스킬·동기화) / 최근 7일(지난주 대비) / 최근 공개 성적 / 쇼츠→롱폼 / 다음 공개(48시간·실패)
// / 할 일(새 댓글 포함) / 남은 수리. 조건이 맞지 않는 줄은 빼서 평소 4~5줄, 많아도 7줄로 쓴다.
const DAY_MS = 24 * 60 * 60 * 1000;
const asNumber = (value) => Number(value || 0);
const timeOf = (iso) => (iso ? Date.parse(iso) : NaN);

// 최근 7일과 그 전 7일의 조회수·순 구독(얻은 수 - 잃은 수). 날짜가 7일보다 적으면 null.
export function weeklyComparison(daily = []) {
  const rows = [...daily].filter((row) => row?.day).sort((a, b) => a.day.localeCompare(b.day));
  if (rows.length < 7) return null;
  const sum = (list, key) => list.reduce((total, row) => total + asNumber(row[key]), 0);
  const block = (list) => ({
    start: list[0].day,
    end: list.at(-1).day,
    views: sum(list, 'views'),
    subsNet: sum(list, 'subscribersGained') - sum(list, 'subscribersLost'),
  });
  const current = block(rows.slice(-7));
  const before = rows.slice(-14, -7);
  const previous = before.length === 7 ? block(before) : null;
  return {current, previous, deltaViews: previous ? current.views - previous.views : null};
}

// 최근 days일 안에 공개된 영상과 그 성적. 유튜브 통계는 2~3일 늦게 들어오므로 아직 없으면 null로 둔다.
export function recentPublished(videos = [], performance = [], now = new Date(), days = 7) {
  const perfById = new Map(performance.map((row) => [row.video, row]));
  return videos
    .filter((v) => v.privacyStatus === 'public' && v.publishedAt)
    .filter((v) => {
      const age = now - new Date(v.publishedAt);
      return age >= 0 && age < days * DAY_MS;
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .map((v) => {
      const perf = perfById.get(v.videoId);
      return {
        videoId: v.videoId,
        title: v.title,
        format: v.format,
        daysSince: Math.floor((now - new Date(v.publishedAt)) / DAY_MS),
        views: perf ? asNumber(perf.views) : null,
        avgViewPct: perf && perf.averageViewPercentage != null ? Number(perf.averageViewPercentage) : null,
      };
    });
}

// 관련 동영상을 단 쇼츠(쇼츠 패키지)가 공개되고 하루가 지났는지. 그 전에는 쇼츠→롱폼 숫자가 계속 0이라 줄을 열지 않는다.
export function shortsLinkLive(shortsStatuses = [], now = new Date()) {
  return shortsStatuses.some((s) => {
    const at = timeOf(s.status === 'published' ? s.publishedAt || s.scheduledFor : s.scheduledFor);
    return Number.isFinite(at) && now - at >= DAY_MS;
  });
}

// 유입 경로 표에서 쇼츠 피드 조회(SHORTS)와 쇼츠 링크로 넘어온 조회(SHORTS_CONTENT_LINKS)를 꺼낸다.
export function shortsToLongform(trafficRows = []) {
  const views = (type) => asNumber(trafficRows.find((row) => row.insightTrafficSourceType === type)?.views);
  return {shortsViews: views('SHORTS'), linkViews: views('SHORTS_CONTENT_LINKS')};
}

// 앞으로 hours시간 안에 공개될 영상과 업로드에 실패한 패키지.
export function upcomingPublishes(items = [], now = new Date(), hours = 48) {
  const soon = items.filter((item) => {
    const at = timeOf(item.scheduledFor);
    return item.status !== 'published' && Number.isFinite(at) && at > now && at - now <= hours * 60 * 60 * 1000;
  });
  return {soon, failed: items.filter((item) => item.status === 'upload_failed')};
}

// 최근 days일 시청자 댓글 수(채널 주인 댓글 제외)와 그중 답이 없는 수. 답 수를 모르는 옛 자료면 unanswered는 null.
export function newViewerComments(commentsByVideo = {}, now = new Date(), days = 7) {
  const recent = Object.values(commentsByVideo || {})
    .flat()
    .filter((c) => c && !c.isChannelOwner && c.publishedAt && now - new Date(c.publishedAt) < days * DAY_MS && now - new Date(c.publishedAt) >= 0);
  const knowsReplies = recent.every((c) => c.replyCount != null);
  return {count: recent.length, unanswered: knowsReplies ? recent.filter((c) => Number(c.replyCount) === 0).length : null};
}

// 공개된 뒤 사람이 스튜디오에서 해야 하는 일(2026-11-09 사용자 요청). 예전에는 now.md에 손으로 적어야 브리핑에 나왔다.
//   - 롱폼 고정 댓글: 공개됐고 status.json의 pinnedCommentPending이 남아 있을 때(대시보드 "등록함"을 누르면 사라진다).
//   - 쇼츠 관련 동영상: 같은 편 롱폼이 공개됐고 쇼츠가 유튜브에 올라가 있을 때(예약 상태여도 지정할 수 있다).
//   - 쇼츠 고정 댓글: 쇼츠가 공개됐을 때(예약 시각이 지나면 공개로 본다).
// 끝낸 일은 data/youtube/after-publish-done.json에 {"EP25-shorts:related": "2026-11-13"}처럼 적는다. 공개 days일이 지나면 내지 않는다.
export function afterPublishTasks({longform = [], shorts = [], done = {}, now = new Date(), days = 14}) {
  const fresh = (iso) => {
    const at = timeOf(iso);
    return Number.isFinite(at) && at <= now && now - at < days * DAY_MS;
  };
  const shortsLive = (s) => s.status === 'published' || (s.status === 'scheduled' && fresh(s.scheduledFor));
  const shortsUploaded = (s) => ['scheduled', 'published'].includes(s.status);
  const tasks = [];
  const add = (key, text) => {
    if (!done[key]) tasks.push({key, text});
  };
  for (const l of longform) {
    if (!l.isPublished || !fresh(l.publishedAt)) continue;
    if (l.pinnedCommentPending) add(`${l.episode}-long:pinned`, `${l.episode} 롱폼 고정 댓글 등록 후 대시보드 "등록함"`);
    for (const s of shorts.filter((x) => x.episode === l.episode && shortsUploaded(x))) {
      add(`${s.episode}-shorts:related`, `${s.episode} 쇼츠 "관련 동영상"에 ${l.episode} 롱폼 지정`);
    }
  }
  for (const s of shorts) {
    const at = s.status === 'published' ? s.publishedAt || s.scheduledFor : s.scheduledFor;
    if (shortsLive(s) && fresh(at)) add(`${s.episode}-shorts:pinned`, `${s.episode} 쇼츠 고정 댓글 등록`);
  }
  return tasks;
}

// 썸네일 파일(thumbnail.jpg)이 없는 패키지(2026-11-09 사용자 지적). EP27~29 쇼츠 패키지를 만들 때 썸네일 단계를 빠뜨려
// 대시보드에 썸네일이 비었다. 이미 공개된 패키지는 올릴 일이 없으므로 뺀다.
export function thumbnailGaps(items = []) {
  return (items || []).filter((item) => !item.hasThumbnail && item.status !== 'published').map((item) => item.name);
}

// 마지막 동기화가 hours시간보다 오래됐거나 기록이 없으면 새로 동기화한다.
export function needsSync(syncedAt, now = new Date(), hours = 12) {
  const at = timeOf(syncedAt);
  return !Number.isFinite(at) || now - at > hours * 60 * 60 * 1000;
}

const kstLabel = (iso) => {
  const at = timeOf(iso);
  if (!Number.isFinite(at)) return '기록 없음';
  const d = new Date(at + 9 * 60 * 60 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

const briefingLines = (check, briefing) => {
  const {data = {}, weekly, recent = [], shortsLink, upcoming = {soon: [], failed: []}, comments, afterPublish = [], missingThumbnails = [], loopHealth = null} = briefing;
  const lines = ['브리핑 재료(이 숫자로 줄을 만든다. "줄을 쓰지 않는다"라고 적힌 줄은 뺀다. 형식: 00-unblock-and-weekly.md 0-C):'];
  lines.push(`- 제목 줄: **브리핑** (episode-planning 0-C · 동기화 ${kstLabel(data.syncedAt)}, 통계 ~${data.statsEnd || '?'}) — ${data.sync || ''}`.trimEnd());
  lines.push(
    weekly
      ? `- 최근 7일: 조회 ${weekly.current.views}회 (${weekly.previous ? `지난주 ${weekly.previous.views}회, ${signed(weekly.deltaViews)}` : '지난주 자료 없음'}), 구독 ${signed(weekly.current.subsNet)}명 (${weekly.current.start}~${weekly.current.end}) — 목표는 knowledge/channel-strategy.md "주간 목표" 표`
      : '- 최근 7일: 날짜별 자료가 7일보다 적다 — 대시보드 동기화 뒤 다시 본다',
  );
  lines.push(
    recent.length
      ? `- 최근 공개 성적: ${recent
          .map((v) => `${v.title} (${v.format === 'SHORTS' ? '쇼츠' : '롱폼'} ${v.daysSince}일째, ${v.views == null ? '통계 아직 없음' : `조회 ${v.views}회${v.avgViewPct == null ? '' : `, 평균 시청률 ${v.avgViewPct}%`}`})`)
          .join(' / ')}`
      : '- 최근 공개 성적: 7일 안에 공개된 영상이 없다 — 줄을 쓰지 않는다',
  );
  lines.push(
    !shortsLink
      ? '- 쇼츠→롱폼: 아직 줄을 쓰지 않는다(관련 동영상을 단 쇼츠가 공개되고 하루가 지나야 연다)'
      : shortsLink.missing
        ? '- 쇼츠→롱폼: 최근 7일 유입 자료가 없다 — 줄에 "자료 없음(동기화 필요)"이라고 쓴다'
        : `- 쇼츠→롱폼(${shortsLink.range || '최근 7일'}): 쇼츠 피드 조회 ${shortsLink.shortsViews}회, 쇼츠 링크로 넘어온 조회 ${shortsLink.linkViews}회`,
  );
  const upcomingParts = [
    ...upcoming.soon.map((item) => `${item.name} ${kstLabel(item.scheduledFor)} 공개`),
    ...upcoming.failed.map((item) => `${item.name} 업로드 실패`),
  ];
  lines.push(upcomingParts.length ? `- 다음 공개: ${upcomingParts.join(', ')}` : '- 다음 공개: 48시간 안 공개와 업로드 실패가 없다 — 줄을 쓰지 않는다');
  lines.push(
    afterPublish.length
      ? `- 공개 후 할 일(할 일 줄 맨 앞에 넣는다): ${afterPublish.map((task) => task.text).join(' / ')} — 사용자가 끝냈다고 하면 data/youtube/after-publish-done.json에 키(${afterPublish.map((task) => task.key).join(', ')})와 날짜를 적는다`
      : '- 공개 후 할 일: 없다 — 따로 쓰지 않는다',
  );
  lines.push(
    missingThumbnails.length
      ? `- 썸네일 없는 패키지(할 일 줄에 넣는다): ${missingThumbnails.join(', ')} — 썸네일 프롬프트는 대본 확정 직후 그림 프롬프트와 함께 만든다(06-shorts-and-next-watch.md)`
      : '- 썸네일 없는 패키지: 없다 — 따로 쓰지 않는다',
  );
  if (loopHealth) {
    lines.push(
      loopHealth.ok
        ? `- 자동 루프: 정상 (마지막 자동 실행 ${kstLabel(loopHealth.lastLoopAt)}) — 짧게 한 줄로 쓴다`
        : `- 자동 루프 고장 ${loopHealth.problems.length}개: ${loopHealth.problems.map((p) => p.text).join(' / ')} — 브리핑에 그대로 쓰고, 브리핑 직후 Claude가 묻지 않고 원인을 찾아 고친 뒤 결과를 알린다(비교 시트·렌더·업로드 승인과 사용자 결정이 필요한 것만 묻는다). 코드: scripts/loop-health.mjs`,
    );
  }
  if (comments) {
    lines.push(
      `- 새 시청자 댓글 ${comments.count}개 (${comments.unanswered == null ? '답 여부 모름' : `답 없음 ${comments.unanswered}개`}) — 최근 7일, 답할 댓글이 있으면 할 일 줄에 넣는다`,
    );
  }
  const reviews = (check.reviewsDue || []).map((review) => `${review.name}(${(review.due || []).join(', ')})`);
  const sample = check.sample || {};
  lines.push(
    `- 참고(줄로 쓰지 않음, 할 일에 반영): 형식 판정 — ${check.formatPriority?.verdict ?? '없음'} / 밀린 리뷰 — ${reviews.length ? reviews.join(', ') : '없음'} / 업로드 대기 ${(check.backlog || []).length}개 / 표본 — ${sample.median == null ? '노출 기록 없음' : `노출 중앙값 ${sample.median}회`}${sample.small ? '(작은 표본)' : ''}`,
  );
  return lines;
};

export function buildBriefingContext(check, nextActions = [], handoffNote = null) {
  const actionLines = nextActionLines(nextActions);
  const handoff = handoffNote ? [handoffNote] : []; // 최근 인수인계 파일(다른 PC·이전 대화의 맥락)을 먼저 읽게 한다
  if (!check) return [BRIEFING_INSTRUCTION, ...handoff, '막힌 곳 점검을 실행하지 못했다. npm run growth-check 를 직접 실행해 확인한다.', ...actionLines].join('\n');
  if (check.briefing) return [BRIEFING_INSTRUCTION, ...handoff, ...briefingLines(check, check.briefing), ...actionLines].join('\n');

  const reviews = (check.reviewsDue || []).map((review) => `${review.name}(${(review.due || []).join(', ')})`);
  const sample = check.sample || {};
  const sampleLine = sample.median == null
    ? '최근 롱폼 노출 기록 없음 — 작은 표본 규칙 적용'
    : `최근 롱폼 노출 중앙값 ${sample.median}회${sample.small ? ' — 작은 표본 규칙 적용' : ''}`;

  return [
    BRIEFING_INSTRUCTION,
    ...handoff,
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
