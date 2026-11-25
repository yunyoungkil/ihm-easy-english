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
  '[시작 브리핑] 오늘 첫 새 채팅(하루 1회)의 첫 답변은 자율 브리핑으로 연다.',
  '단일 원본: knowledge/playbooks/briefing/00-autonomous-briefing.md (모호할 때만 확인, 평소엔 스킬/지침 문서 열지 않음).',
  '시작 문구: "**업데이트를 요약해서 먼저 보고드립니다.** (동기화 시각 · 통계 기준일)".',
  '우선순위: ① 채널·콘텐츠·성장 현실(성과·정산·다음 슬롯·승인 대기) → ② AI 데이터 기반 자율 보수·진화(자동 보수 결과 또는 진행할 삭제·수정·업그레이드·기능 추가의 근거) → ③ 시스템/Git/문서 예외(문제·변화 있을 때만, 정상·변화 없으면 생략).',
  '3단계 권한선: 🟢 무과금·안전한 복구·밀린 리뷰·버그/낡은 문구/미참조 코드 정리는 묻지 않고 처리 후 검증 보고 / 🟡 기능 추가·구조 개선·기획 초안은 근거를 밝히고 추진(Gate 1 전 정지) / 🔴 3대 승인 관문(시트·렌더·업로드/일정)·유료 비용·공개 영상 수정·불변 규칙 변경은 승인 필수.',
  '자기 개선 브레이크: 영상 완성도·데이터 신뢰도·토큰 절감 중 하나를 실제로 높이지 못하면 건드리지 않고 콘텐츠 성장에 집중. 사용자 요청이 함께 있으면 브리핑을 짧게 끝내고 요청을 최우선 처리.',
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

// 새 대화마다 전부 넘기면 22개 항목이 약 1만 토큰이다(2026-11-16). 앞 8개만, 항목당 260자까지 보여 주고 나머지는 now.md에서 필요할 때 읽는다.
const MAX_ACTIONS_SHOWN = 8;
const MAX_ACTION_CHARS = 260;
const shortenAction = (text) => (text.length > MAX_ACTION_CHARS ? `${text.slice(0, MAX_ACTION_CHARS).trimEnd()}… (전문은 now.md)` : text);

const nextActionLines = (actions) =>
  actions.length
    ? [
        '다음 할 일(knowledge/now.md, 급한 순서). 브리핑의 할 일 줄은 이 목록을 먼저 따르고, "사용자 결정" 항목은 브리핑 끝에 묻는다:',
        ...actions.slice(0, MAX_ACTIONS_SHOWN).map((action, index) => `${index + 1}. ${shortenAction(action)}`),
        ...(actions.length > MAX_ACTIONS_SHOWN ? [`나머지 ${actions.length - MAX_ACTIONS_SHOWN}개는 knowledge/now.md "▶ 다음 할 일"에서 필요할 때만 읽는다.`] : []),
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

// 최근 days일 안에 공개된 영상과 그 성적. 유튜브 API 통계는 2~3일 늦게 들어오므로 없으면 null로 두고,
// 스튜디오 지표(studio-metrics.json)가 있으면 쇼츠 계속 시청함·롱폼 노출/CTR을 함께 붙여 전달한다.
export function recentPublished(videos = [], performance = [], now = new Date(), days = 7, studioVideos = {}) {
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
      const studio = studioVideos && typeof studioVideos === 'object' ? studioVideos[v.videoId] : null;
      return {
        videoId: v.videoId,
        title: v.title,
        format: v.format,
        daysSince: Math.floor((now - new Date(v.publishedAt)) / DAY_MS),
        views: perf ? asNumber(perf.views) : null,
        avgViewPct: perf && perf.averageViewPercentage != null ? Number(perf.averageViewPercentage) : null,
        studioViews: studio && studio.views != null ? Number(studio.views) : null,
        studioAvgViewPct: studio && studio.avgViewPercent != null ? Number(studio.avgViewPercent) : null,
        stayedToWatchPct: studio && studio.stayedToWatchPercent != null ? Number(studio.stayedToWatchPercent) : null,
        impressions: studio && studio.impressions != null ? Number(studio.impressions) : null,
        ctrPct: studio && studio.ctrPercent != null ? Number(studio.ctrPercent) : null,
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

// KST(UTC+9) 기준 YYYY-MM-DD 날짜 문자열. 유효하지 않으면 null.
export function kstDateOf(value) {
  const at = value instanceof Date ? value.getTime() : timeOf(value);
  if (!Number.isFinite(at)) return null;
  return new Date(at + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 하루 1회(KST 날짜 기준) 실행 필요 여부. 기록이 없거나 오늘(KST) 아직 실행하지 않았으면 true.
export function needsDailyRun(lastAt, now = new Date()) {
  const lastDay = kstDateOf(lastAt);
  const today = kstDateOf(now);
  return !lastDay || !today || lastDay !== today;
}

const kstLabel = (iso) => {
  const at = timeOf(iso);
  if (!Number.isFinite(at)) return '기록 없음';
  const d = new Date(at + 9 * 60 * 60 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

// 같은 날 이미 시작 브리핑·데이터 수집을 마친 뒤 여는 새 채팅용 초경량 안내(2026-11-20 사용자 확정).
export function buildContinuationContext({lastBriefingAt = null, handoffNote = null, now = new Date()} = {}) {
  const today = kstDateOf(now) || '오늘';
  const doneAt = lastBriefingAt ? kstLabel(lastBriefingAt) : today;
  const lines = [
    `[작업 이어가기] 오늘(${today}) 시작 브리핑과 데이터 수집은 이미 완료했다(${doneAt}).`,
    '브리핑 요약("업데이트를 요약해서 먼저 보고드립니다.")과 데이터 수집을 반복하지 말고, knowledge/handoff/LATEST.md만 확인해 사용자 요청으로 바로 들어간다.',
    '사용자가 "브리핑"·"동기화"·"현황 업데이트"를 명시적으로 요청하면 `npm run briefing -- --force`로 즉시 최신화한다.',
  ];
  if (handoffNote) lines.push(handoffNote);
  return lines.join('\n');
}
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const round2 = (n) => Math.round(Number(n) * 100) / 100;

const formatRecentItem = (v) => {
  const kind = v.format === 'SHORTS' ? '쇼츠' : '롱폼';
  const metrics = [];
  if (v.views != null) {
    metrics.push(`조회 ${v.views}회`);
    if (v.avgViewPct != null) metrics.push(`평균 시청률 ${round2(v.avgViewPct)}%`);
  } else if (v.studioViews != null) {
    metrics.push(`스튜디오 조회 ${v.studioViews}회`);
    if (v.studioAvgViewPct != null) metrics.push(`평균 시청률 ${round2(v.studioAvgViewPct)}%`);
  }
  if (v.format === 'SHORTS' && v.stayedToWatchPct != null) {
    metrics.push(`계속 시청함 ${round2(v.stayedToWatchPct)}%`);
  } else if (v.format !== 'SHORTS' && v.impressions != null) {
    metrics.push(`노출 ${v.impressions}회${v.ctrPct == null ? '' : `, CTR ${round2(v.ctrPct)}%`}`);
  }
  const statText = metrics.length ? metrics.join(', ') : '통계 아직 없음';
  return `${v.title} (${kind} ${v.daysSince}일째, ${statText})`;
};

const briefingLines = (check, briefing) => {
  const {
    data = {},
    weekly,
    recent = [],
    growthPulse,
    recentChanges,
    shortsLink,
    upcoming = {soon: [], failed: []},
    comments,
    afterPublish = [],
    missingThumbnails = [],
    loopHealth = null,
    blogStatus = null,
    workflowSignals = [],
    hygieneSignals = null,
    workflowDiagnosis = null,
    hygieneDiagnosis = null,
  } = briefing;
  const lines = ['브리핑 재료(이 숫자로 줄을 만든다. 지침: knowledge/playbooks/briefing/00-autonomous-briefing.md):'];
  const studioMeta = data.studioFetchedAt
    ? ` · 스튜디오 ${kstLabel(data.studioFetchedAt)}${data.studioLastDay ? `(~${data.studioLastDay})` : ''}`
    : '';
  const syncParts = [data.sync, data.studioSync].filter(Boolean).join(' / ');
  lines.push(`- 제목 줄: **업데이트를 요약해서 먼저 보고드립니다.** (동기화 ${kstLabel(data.syncedAt)}, 통계 ~${data.statsEnd || '?'}${studioMeta})${syncParts ? ` — ${syncParts}` : ''}`);
  lines.push(
    weekly
      ? `- 최근 7일: 조회 ${weekly.current.views}회 (${weekly.previous ? `지난주 ${weekly.previous.views}회, ${signed(weekly.deltaViews)}` : '지난주 자료 없음'}), 구독 ${signed(weekly.current.subsNet)}명 (${weekly.current.start}~${weekly.current.end}) — 목표는 knowledge/channel-strategy.md "주간 목표" 표`
      : '- 최근 7일: 날짜별 자료가 7일보다 적다 — 대시보드 동기화 뒤 다시 본다',
  );
  if (recent.length) {
    lines.push(`- 최근 공개 성적: ${recent.map(formatRecentItem).join(' / ')}`);
  }
  if (growthPulse) {
    if (growthPulse.upcomingSettlements?.length) {
      lines.push(
        `- 7일 성과 정산 도래: ${growthPulse.upcomingSettlements
          .map((v) => `${v.title} (${v.format === 'SHORTS' ? '쇼츠' : '롱폼'} ${v.daysSince}일째, ${v.settleDate} 정산)`)
          .join(' / ')}`,
      );
    }
    const sched = growthPulse.nextScheduledByFormat;
    if (sched && (sched.longform || sched.shorts)) {
      const parts = [];
      if (sched.longform) parts.push(`롱폼 ${sched.longform.name}(${sched.longform.date})`);
      if (sched.shorts) parts.push(`쇼츠 ${sched.shorts.name}(${sched.shorts.date})`);
      lines.push(`- 다음 예약 현황: ${parts.join(', ')} (남은 예약 롱폼 ${growthPulse.scheduledCounts?.longform || 0}편 · 쇼츠 ${growthPulse.scheduledCounts?.shorts || 0}편)`);
    }
  }
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
  if (upcomingParts.length) {
    lines.push(`- 다음 공개: ${upcomingParts.join(', ')}`);
  }
  if (afterPublish.length) {
    lines.push(`- 사후 관리 미완료(자동 파이프라인 확인 필요): ${afterPublish.map((task) => task.text).join(' / ')}`);
  }
  if (missingThumbnails.length) {
    lines.push(`- 썸네일 없는 패키지: ${missingThumbnails.join(', ')}`);
  }
  if (loopHealth) {
    lines.push(
      loopHealth.ok
        ? `- 시스템 건강: 정상 (마지막 자동 실행 ${kstLabel(loopHealth.lastLoopAt)})`
        : `- 시스템 건강 고장 ${loopHealth.problems.length}개: ${loopHealth.problems.map((p) => p.text).join(' / ')} — 브리핑 직후 묻지 않고 원인을 고치고 검증 보고. 코드: scripts/loop-health.mjs`,
    );
  }
  if (blogStatus) {
    lines.push(`- 쿠팡 블로그: ${blogStatus}`);
  }

  const sigParts = [];
  if (Array.isArray(workflowSignals) && workflowSignals.length) {
    sigParts.push(`워크플로우 ${workflowSignals.length}건: ${workflowSignals[0].finding}`);
  } else if (workflowDiagnosis && workflowDiagnosis.severity !== 'healthy') {
    sigParts.push(`워크플로우: [${workflowDiagnosis.area}] ${workflowDiagnosis.finding}`);
  }
  if (hygieneSignals && hygieneSignals.totalCount > 0) {
    sigParts.push(`코드 위생 ${hygieneSignals.totalCount}건 (미참조 ${hygieneSignals.dormantTotal}·문구 ${hygieneSignals.staleTotal}·미테스트 ${hygieneSignals.untestedTotal})`);
  } else if (hygieneDiagnosis && (hygieneDiagnosis.dormantFile?.target !== '없음' || hygieneDiagnosis.staleCopy?.target !== '없음' || hygieneDiagnosis.bugTest?.target !== '없음')) {
    const dParts = [];
    if (hygieneDiagnosis.dormantFile?.target !== '없음') dParts.push(`삭제안(${hygieneDiagnosis.dormantFile.target})`);
    if (hygieneDiagnosis.staleCopy?.target !== '없음') dParts.push(`문구(${hygieneDiagnosis.staleCopy.target})`);
    if (hygieneDiagnosis.bugTest?.target !== '없음') dParts.push(`테스트(${hygieneDiagnosis.bugTest.target})`);
    if (dParts.length) sigParts.push(`코드 위생: ${dParts.join(' / ')}`);
  }
  if (sigParts.length) {
    lines.push(`- 참고 신호 풀(의무 보고 아님 — 성장·신뢰도·토큰에 실제 이득이 있을 때만 AI가 선별해 자동 보수 또는 근거 보고 후 추진): ${sigParts.join(' / ')}`);
  }

  if (recentChanges && (recentChanges.recentCommits?.length || recentChanges.dirtyCount > 0)) {
    const subjs = (recentChanges.recentCommits || []).slice(0, 3).map((c) => c.subject).filter(Boolean); // allow-literal: 상위 3건 요약
    lines.push(`- 최근 변경: 커밋 ${recentChanges.recentCommits?.length || 0}건${subjs.length ? `(${subjs.join(' · ')})` : ''}, 미커밋 파일 ${recentChanges.dirtyCount || 0}개`);
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
