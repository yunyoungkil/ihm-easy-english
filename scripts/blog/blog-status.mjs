// 쿠팡 블로그 운영 상태 요약과 시작 브리핑용 로더.
import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';

import {kstDate} from './blog-store.mjs';

export const QUEUE_LOW = 6; // allow-literal: 설계 6-2 2주 분량
export const SIGNAL_CHECK_DAYS = 7; // allow-literal: 설계 6-7 주 1회

const OPERATIONAL_FILES = Object.freeze({
  runs: 'tech-runs.json',
  posts: 'tech-posts.json',
  queue: 'tech-queue.json',
  pause: 'tech-paused.json',
  signalChecks: 'signal-checks.json',
  searchConsole: 'search-console.json',
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function readJsonSync(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  const raw = readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function toEpochMs(value) {
  if (!value) return NaN;
  if (value instanceof Date) return value.getTime();
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return Date.parse(`${s}T00:00:00+09:00`);
  return Date.parse(s);
}

function runTimestampMs(run) {
  if (!run || typeof run !== 'object') return NaN;
  if (run.startedAt) {
    const ms = Date.parse(run.startedAt);
    if (Number.isFinite(ms)) return ms;
  }
  if (run.date) {
    const s = String(run.date).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? Date.parse(`${s}T23:59:59+09:00`) : Date.parse(s);
  }
  return NaN;
}

function normalizeKstDay(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? kstDate(d) : null;
}

function dayDiffKst(fromYmd, toDate) {
  const toYmd = kstDate(toDate);
  const fromMs = Date.parse(`${fromYmd}T00:00:00Z`);
  const toMs = Date.parse(`${toYmd}T00:00:00Z`);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return Infinity;
  return Math.floor((toMs - fromMs) / MS_PER_DAY);
}

function latestSignalCheck(signalChecks) {
  if (!Array.isArray(signalChecks) || signalChecks.length === 0) return null;
  let latest = null;
  for (const item of signalChecks) {
    const day = normalizeKstDay(item?.date);
    if (!day) continue;
    if (!latest || day >= latest.day) {
      latest = {...item, day};
    }
  }
  return latest;
}

/**
 * 쿠팡 블로그 운영 데이터를 시작 브리핑용 한 줄로 요약한다.
 * 운영 데이터가 전혀 없으면 null을 반환한다.
 */
export function summarizeBlogStatus({
  runs,
  posts,
  queue,
  pause,
  signalChecks,
  searchConsole = null,
  since = null,
  now = new Date(),
  hasAnyFile = undefined,
} = {}) {
  const hasRuns = Array.isArray(runs) && runs.length > 0;
  const hasPosts = Array.isArray(posts) && posts.length > 0;
  const hasQueue = Array.isArray(queue);
  const isPaused = Boolean(pause?.paused);
  const hasChecks = Array.isArray(signalChecks) && signalChecks.length > 0;

  if (hasAnyFile === false || (!hasAnyFile && !hasRuns && !hasPosts && !hasQueue && !isPaused && !hasChecks)) {
    return null;
  }

  const sinceMs = toEpochMs(since);
  const allRuns = Array.isArray(runs) ? runs : [];
  const filteredRuns = Number.isFinite(sinceMs)
    ? allRuns.filter((r) => {
        const ts = runTimestampMs(r);
        return Number.isFinite(ts) && ts >= sinceMs;
      })
    : allRuns;

  const counts = {
    published: 0,
    deferred: 0,
    rejected: 0,
    'writer-failed': 0,
    'auth-failed': 0,
    'image-deferred': 0,
  };
  for (const r of filteredRuns) {
    const outcome = r?.outcome;
    if (Object.hasOwn(counts, outcome)) {
      counts[outcome] += 1;
    }
  }

  const parts = [`올린 글 ${counts.published}편`];
  if (counts.deferred > 0) parts.push(`건너뜀 ${counts.deferred}번(링크 없음)`);
  if (counts.rejected > 0) parts.push(`점검 실패 ${counts.rejected}번`);
  if (counts['writer-failed'] > 0) parts.push(`실행 실패 ${counts['writer-failed']}번`);
  if (counts['auth-failed'] > 0) parts.push(`인증 실패 ${counts['auth-failed']}번`);
  if (counts['image-deferred'] > 0) parts.push(`그림 때문에 미룸 ${counts['image-deferred']}번`);

  const queueList = Array.isArray(queue) ? queue : [];
  parts.push(
    queueList.length < QUEUE_LOW
      ? `대기열 ${queueList.length}개(주제 보충 필요)`
      : `대기열 ${queueList.length}개`,
  );
  // 주제는 실제 검색 수를 보고 고른다(2026-11-27 사용자 결정). 숫자를 안 잰 주제가 있으면 알린다.
  const unmeasured = queueList.filter((t) => !t?.searchVolume).length;
  if (unmeasured > 0) parts.push(`검색량 미확인 ${unmeasured}개(keyword-volume.mjs queue)`);
  // 구글 실제 성적(서치 콘솔, 무인 실행마다 수집, 2026-11-27). 서치 콘솔이 준 숫자만 쓴다.
  if (searchConsole?.range && Array.isArray(searchConsole.pages)) {
    const indexed = searchConsole.pages.filter((p) => p?.index?.verdict === 'PASS').length;
    const t = searchConsole.totals || {};
    parts.push(`구글 색인 ${indexed}/${searchConsole.pages.length}편 · 28일 노출 ${t.impressions ?? 0}·클릭 ${t.clicks ?? 0}(${String(searchConsole.collectedAt || '').slice(0, 10)} 수집)`);
  }

  if (isPaused) {
    parts.push(`멈춤(${pause.reason || '사유 미기록'}) — 다시 켜기는 사용자 승인`);
  }

  const latest = latestSignalCheck(signalChecks);
  if (latest) {
    const warnTargets = [
      ['searchConsole', '서치 콘솔'],
      ['adsense', '애드센스'],
      ['coupang', '쿠팡 파트너스'],
    ]
      .filter(([key]) => latest[key] === 'warning')
      .map(([, label]) => label);
    if (warnTargets.length > 0) {
      parts.push(`경고 감지(${warnTargets.join('·')}${latest.note ? `: ${latest.note}` : ''})`);
    }
    if (dayDiffKst(latest.day, now) >= SIGNAL_CHECK_DAYS) {
      parts.push('경고 화면 점검 필요');
    }
  } else {
    parts.push('경고 화면 점검 필요');
  }

  return parts.join(', ');
}

/**
 * 프로젝트의 data/blog 운영 파일을 읽어 한 줄 요약을 반환한다.
 * 운영 파일이 하나도 없으면(blogs.json만 있는 경우 포함) null을 반환한다.
 */
export function loadBlogStatus(projectDir, {since = null, now = new Date()} = {}) {
  const blogDir = path.join(projectDir, 'data', 'blog');
  const paths = Object.fromEntries(
    Object.entries(OPERATIONAL_FILES).map(([key, file]) => [key, path.join(blogDir, file)]),
  );
  const hasAnyFile = Object.values(paths).some((filePath) => existsSync(filePath));
  if (!hasAnyFile) return null;

  const runs = readJsonSync(paths.runs, []);
  const posts = readJsonSync(paths.posts, []);
  const queue = readJsonSync(paths.queue, []);
  const pause = readJsonSync(paths.pause, {paused: false});
  const signalChecks = readJsonSync(paths.signalChecks, []);
  const searchConsole = readJsonSync(paths.searchConsole, null);

  return summarizeBlogStatus({
    runs,
    posts,
    queue,
    pause,
    signalChecks,
    searchConsole,
    since,
    now,
    hasAnyFile: true,
  });
}
