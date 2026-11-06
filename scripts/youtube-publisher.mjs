/**
 * scripts/youtube-publisher.mjs
 * YouTube 자동 예약 업로드 및 발행 스케줄 엔진
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync, createReadStream } from 'node:fs';

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
    // 키워드 파일명(SEO)을 generic video.mp4보다 우선 선택
    const videoFile = files.find((f) => f.endsWith('.mp4') && f.toLowerCase() !== 'video.mp4') ||
                      files.find((f) => f.endsWith('.mp4'));
    if (!videoFile) continue; // 동영상 없으면 제외

    // 확정본 thumbnail.jpg/png를 변형 시안(thumbnail-close-up, thumbnail-b 등)보다 우선 선택
    const thumbFile = files.find((f) => f === 'thumbnail.jpg' || f === 'thumbnail.png') ||
                      files.find((f) => /^thumbnail.*\.(jpg|jpeg|png)$/i.test(f)) || null;

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
 * YouTube Data API v3 Resumable Upload 프로토콜로 동영상을 업로드하고 예약 시각을 설정합니다.
 */
export async function uploadVideoToYouTube({
  videoPath,
  title,
  description = '',
  tags = [],
  privacyStatus = 'private',
  publishAt = null,
  accessToken,
  fetchFn = fetch,
}) {
  const videoStat = await stat(videoPath);
  const initUrl = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

  const metadataBody = {
    snippet: {
      title: (title || '').slice(0, 100),
      description,
      tags: Array.isArray(tags) ? tags : [],
      categoryId: '27', // Education
    },
    status: {
      privacyStatus: privacyStatus || 'private',
      selfDeclaredMadeForKids: false,
    },
  };

  if (publishAt) {
    metadataBody.status.publishAt = publishAt;
  }

  const initRes = await fetchFn(initUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': videoStat.size.toString(),
    },
    body: JSON.stringify(metadataBody),
  });

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`YouTube 업로드 세션 생성 실패 (${initRes.status}): ${err}`);
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube 업로드 세션 URL(location)을 받지 못했습니다.');
  }

  const stream = createReadStream(videoPath);
  const putRes = await fetchFn(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': videoStat.size.toString(),
    },
    body: stream,
    duplex: 'half',
  });

  if (!putRes.ok) {
    const err = await putRes.text();
    throw new Error(`동영상 바이너리 전송 실패 (${putRes.status}): ${err}`);
  }

  const data = await putRes.json();
  return { videoId: data.id };
}

/**
 * 커스텀 썸네일을 업로드합니다.
 */
export async function setVideoThumbnail({
  videoId,
  thumbnailPath,
  accessToken,
  fetchFn = fetch,
}) {
  const thumbStat = await stat(thumbnailPath);
  const isPng = thumbnailPath.toLowerCase().endsWith('.png');
  const contentType = isPng ? 'image/png' : 'image/jpeg';
  const stream = createReadStream(thumbnailPath);

  const url = `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`;
  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': contentType,
      'Content-Length': thumbStat.size.toString(),
    },
    body: stream,
    duplex: 'half',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`썸네일 등록 실패 (${res.status}): ${err}`);
  }
}

/**
 * 영상에 첫 댓글을 등록합니다.
 */
export async function createFirstComment({
  videoId,
  commentText,
  accessToken,
  fetchFn = fetch,
}) {
  if (!commentText || !commentText.trim()) return null;

  const url = 'https://www.googleapis.com/youtube/v3/commentThreads?part=snippet';
  const res = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      snippet: {
        videoId,
        topLevelComment: {
          snippet: {
            textOriginal: commentText.trim(),
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`고정 댓글 등록 실패 (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { commentId: data.id };
}

/**
 * 큐 아이템 하나를 처리하여 유튜브에 예약 업로드하고 status.json을 갱신합니다.
 */
export async function processQueueItem({
  item,
  accessToken,
  rules = {},
  fetchFn = fetch,
}) {
  const statusPath = join(item.pkgDir, 'status.json');
  let existingStatus = {};
  try {
    existingStatus = JSON.parse(await readFile(statusPath, 'utf8'));
  } catch {
    existingStatus = {};
  }

  try {
    const videoPath = join(item.pkgDir, item.videoFileName);
    const { videoId } = await uploadVideoToYouTube({
      videoPath,
      title: item.title,
      description: item.description,
      tags: item.tags,
      privacyStatus: rules.defaultPrivacy || 'private',
      publishAt: item.scheduledFor,
      accessToken,
      fetchFn,
    });

    if (item.thumbnailFileName) {
      const thumbPath = join(item.pkgDir, item.thumbnailFileName);
      try {
        await setVideoThumbnail({ videoId, thumbnailPath: thumbPath, accessToken, fetchFn });
      } catch (thumbErr) {
        console.warn(`[Publisher] 썸네일 등록 경고 (${item.episodeId}):`, thumbErr.message);
      }
    }

    if (rules.autoComment && item.pinnedComment) {
      try {
        await createFirstComment({ videoId, commentText: item.pinnedComment, accessToken, fetchFn });
      } catch (commentErr) {
        console.warn(`[Publisher] 댓글 등록 경고 (${item.episodeId}):`, commentErr.message);
      }
    }

    const updatedStatus = {
      ...existingStatus,
      status: 'scheduled',
      videoId,
      scheduledFor: item.scheduledFor,
      uploadedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
    };
    await writeFile(statusPath, JSON.stringify(updatedStatus, null, 2), 'utf8');

    return {
      success: true,
      videoId,
      scheduledFor: item.scheduledFor,
    };
  } catch (err) {
    const failedStatus = {
      ...existingStatus,
      status: 'upload_failed',
      uploadError: err.message,
      lastSyncedAt: new Date().toISOString(),
    };
    await writeFile(statusPath, JSON.stringify(failedStatus, null, 2), 'utf8');

    return {
      success: false,
      error: err.message,
    };
  }
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
    const safeInterval = Math.max(1, parseInt(minIntervalDays, 10) || 3);
    const candidateKstTime = new Date(Date.UTC(refKst.year, refKst.monthIndex, refKst.day + safeInterval));
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
      const nextDay = new Date(Date.UTC(parts.year, parts.monthIndex, parts.day + safeInterval));
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
