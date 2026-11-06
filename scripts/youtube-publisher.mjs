/**
 * scripts/youtube-publisher.mjs
 * YouTube 자동 예약 업로드 및 발행 스케줄 엔진
 */

import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';

export const DEFAULT_PUBLISH_RULES = {
  autoUploadEnabled: false,
  publishTimeKst: '23:00',
  scheduleMode: 'daysOfWeek',
  minIntervalDays: 3,
  allowedDaysOfWeek: [1, 4],
  maxUploadsPerDay: 1,
  maxUploadsPerWeek: 2,
  defaultPrivacy: 'private',
  autoComment: true,
};

export async function loadPublishRules(rulesPath) {
  try {
    const raw = await readFile(rulesPath, 'utf8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PUBLISH_RULES, ...parsed };
  } catch (err) {
    if (err.code === 'ENOENT') {
      return { ...DEFAULT_PUBLISH_RULES };
    }
    throw err;
  }
}

export async function savePublishRules(rulesPath, rules) {
  await mkdir(dirname(rulesPath), { recursive: true });
  const payload = {
    ...DEFAULT_PUBLISH_RULES,
    ...rules,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(rulesPath, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}

export async function scanReadyPackages(uploadPackagesDir) {
  if (!existsSync(uploadPackagesDir)) return [];
  const entries = await readdir(uploadPackagesDir, { withFileTypes: true });
  const ready = [];

  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const pkgDir = join(uploadPackagesDir, ent.name);
    const statusPath = join(pkgDir, 'status.json');
    if (!existsSync(statusPath)) continue;

    let statusJson = null;
    try {
      statusJson = JSON.parse(await readFile(statusPath, 'utf8'));
    } catch {
      continue;
    }

    if (statusJson.status !== 'ready_to_upload') continue;

    // 패키지 내 파일 확인
    const files = await readdir(pkgDir);
    const videoFile = files.find((f) => f.endsWith('.mp4'));
    if (!videoFile) continue; // 동영상 없으면 제외

    const thumbFile = files.find((f) => f === 'thumbnail.jpg' || f === 'thumbnail.png' || f.startsWith('thumbnail'));

    const readOptional = async (filename, fallback = '') => {
      const p = join(pkgDir, filename);
      if (existsSync(p)) return (await readFile(p, 'utf8')).trim();
      return fallback;
    };

    const title = (await readOptional('title.txt')) || statusJson.title || ent.name;
    const description = await readOptional('description.txt');
    const tags = (await readOptional('tags.txt')).split(',').map((t) => t.trim()).filter(Boolean);
    const pinnedComment = await readOptional('pinned-comment.txt');

    ready.push({
      episodeId: ent.name,
      pkgDir,
      title,
      description,
      tags,
      pinnedComment,
      videoFileName: videoFile,
      thumbnailFileName: thumbFile || null,
      status: statusJson.status,
      recommendedPublishAt: statusJson.recommendedPublishAt || null,
      generatedAt: statusJson.generatedAt || null,
    });
  }

  return sortEpisodePackages(ready.map((r) => r.episodeId))
    .map((id) => ready.find((r) => r.episodeId === id))
    .filter(Boolean);
}

export function buildPublishQueue({ readyPackages = [], rules = {}, latestScheduledDate = null, now = new Date() }) {
  const sorted = sortEpisodePackages(readyPackages.map((p) => p.episodeId))
    .map((id) => readyPackages.find((p) => p.episodeId === id))
    .filter(Boolean);

  let currentSlotRef = latestScheduledDate;
  const queue = [];

  for (const pkg of sorted) {
    const nextSlot = calculateNextPublishSlot({
      lastPublishAt: currentSlotRef,
      publishTimeKst: rules.publishTimeKst || '23:00',
      allowedDaysOfWeek: rules.allowedDaysOfWeek || [1, 4],
      scheduleMode: rules.scheduleMode || 'daysOfWeek',
      minIntervalDays: rules.minIntervalDays || 3,
      now,
    });

    queue.push({
      ...pkg,
      scheduledFor: nextSlot,
    });

    currentSlotRef = nextSlot;
  }

  return queue;
}

/**
 * 패키지 폴더명에서 에피소드 번호를 추출하여 오름차순으로 정렬합니다.
 * 예: ep24-long-short-i -> 24, s1-ep09-longform -> 9
 * 번호가 없는 패키지는 뒤쪽에 배치합니다.
 */
export function sortEpisodePackages(packageDirs = []) {
  const getEpNum = (name) => {
    const match = name.match(/(?:ep|s\d+-ep)(\d+)/i);
    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
  };

  return [...packageDirs].sort((a, b) => {
    const numA = getEpNum(a);
    const numB = getEpNum(b);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });
}

/**
 * KST 기준 일시를 UTC Date 객체로 변환합니다.
 */
function createUtcFromKst(year, monthIndex, day, kstHour, kstMinute) {
  // KST는 UTC+9
  return new Date(Date.UTC(year, monthIndex, day, kstHour - 9, kstMinute, 0, 0));
}

/**
 * Date 객체를 KST 기준 년, 월, 일, 요일, 시, 분으로 분해합니다.
 */
function toKstParts(date) {
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return {
    year: kstTime.getUTCFullYear(),
    monthIndex: kstTime.getUTCMonth(),
    day: kstTime.getUTCDate(),
    dayOfWeek: kstTime.getUTCDay(), // 0: Sun, 1: Mon, ..., 6: Sat
    hour: kstTime.getUTCHours(),
    minute: kstTime.getUTCMinutes(),
  };
}

/**
 * 채널의 발행 규칙에 따라 다음 예약 발행 슬롯(ISO 8601 UTC)을 계산합니다.
 */
export function calculateNextPublishSlot({
  lastPublishAt = null,
  publishTimeKst = '23:00',
  allowedDaysOfWeek = [1, 4], // 1: Mon, 4: Thu
  scheduleMode = 'daysOfWeek',
  minIntervalDays = 3,
  now = new Date(),
} = {}) {
  const [kstHourStr, kstMinStr] = (publishTimeKst || '23:00').split(':');
  const kstHour = parseInt(kstHourStr, 10);
  const kstMin = parseInt(kstMinStr || '0', 10);

  const nowDate = now instanceof Date ? now : new Date(now);

  // 기준 시점 결정 (최근 발행일이 과거이거나 없으면 현재 시점을 기준일로 설정)
  let refDate = nowDate;
  if (lastPublishAt) {
    const parsedLast = new Date(lastPublishAt);
    if (!isNaN(parsedLast.getTime()) && parsedLast.getTime() > nowDate.getTime()) {
      refDate = parsedLast;
    }
  }

  const refKst = toKstParts(refDate);

  if (scheduleMode === 'interval') {
    // 간격 모드: 기준일 + minIntervalDays
    const candidateKstTime = new Date(Date.UTC(refKst.year, refKst.monthIndex, refKst.day + minIntervalDays));
    let candidateSlot = createUtcFromKst(
      candidateKstTime.getUTCFullYear(),
      candidateKstTime.getUTCMonth(),
      candidateKstTime.getUTCDate(),
      kstHour,
      kstMin
    );

    // 과거라면 now 이후로 보정
    while (candidateSlot.getTime() <= nowDate.getTime()) {
      const parts = toKstParts(candidateSlot);
      const nextDay = new Date(Date.UTC(parts.year, parts.monthIndex, parts.day + minIntervalDays));
      candidateSlot = createUtcFromKst(
        nextDay.getUTCFullYear(),
        nextDay.getUTCMonth(),
        nextDay.getUTCDate(),
        kstHour,
        kstMin
      );
    }
    return candidateSlot.toISOString();
  }

  // daysOfWeek 모드: 다음 허용 요일 탐색
  const allowedSet = new Set(allowedDaysOfWeek);
  // 최소 다음 날부터 검사 (당일 배정 방지 및 최소 1일 여유)
  let dayOffset = 1;

  while (dayOffset <= 14) {
    const checkKstTime = new Date(Date.UTC(refKst.year, refKst.monthIndex, refKst.day + dayOffset));
    const dayOfWeek = checkKstTime.getUTCDay();

    if (allowedSet.has(dayOfWeek)) {
      const candidateSlot = createUtcFromKst(
        checkKstTime.getUTCFullYear(),
        checkKstTime.getUTCMonth(),
        checkKstTime.getUTCDate(),
        kstHour,
        kstMin
      );

      // 현재 시각보다 미래인 경우에만 확정
      if (candidateSlot.getTime() > nowDate.getTime()) {
        return candidateSlot.toISOString();
      }
    }
    dayOffset++;
  }

  // 폴백: 3일 후 23:00 KST
  const fallbackDate = new Date(Date.UTC(refKst.year, refKst.monthIndex, refKst.day + 3));
  return createUtcFromKst(
    fallbackDate.getUTCFullYear(),
    fallbackDate.getUTCMonth(),
    fallbackDate.getUTCDate(),
    kstHour,
    kstMin
  ).toISOString();
}

/**
 * 일일(24시간) 및 주간(7일) 업로드 한도 스로틀을 검사합니다.
 */
export function isUploadAllowed({
  recentUploadHistory = [],
  maxUploadsPerDay = 1,
  maxUploadsPerWeek = 2,
  now = new Date(),
} = {}) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = nowDate.getTime();

  const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
  const oneWeekAgo = nowMs - 7 * 24 * 60 * 60 * 1000;

  let uploadsLast24h = 0;
  let uploadsLast7d = 0;

  for (const item of recentUploadHistory) {
    const timestamp = item.uploadedAt ? new Date(item.uploadedAt).getTime() : 0;
    if (isNaN(timestamp)) continue;

    if (timestamp >= oneDayAgo) uploadsLast24h++;
    if (timestamp >= oneWeekAgo) uploadsLast7d++;
  }

  if (uploadsLast24h >= maxUploadsPerDay) {
    return {
      allowed: false,
      reason: `일일 최대 업로드 한도(${maxUploadsPerDay}편) 초과 (최근 24시간 내 ${uploadsLast24h}편 처리됨)`,
      uploadsLast24h,
      uploadsLast7d,
    };
  }

  if (uploadsLast7d >= maxUploadsPerWeek) {
    return {
      allowed: false,
      reason: `주간 최대 업로드 한도(${maxUploadsPerWeek}편) 초과 (최근 7일 내 ${uploadsLast7d}편 처리됨)`,
      uploadsLast24h,
      uploadsLast7d,
    };
  }

  return {
    allowed: true,
    uploadsLast24h,
    uploadsLast7d,
  };
}
