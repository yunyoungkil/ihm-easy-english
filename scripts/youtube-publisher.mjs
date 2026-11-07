/**
 * scripts/youtube-publisher.mjs
 * YouTube 자동 예약 업로드 및 발행 스케줄 엔진
 */

import { readFile, writeFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { findPackageProblems, parseTitleVariants } from './build-upload-package-page.mjs';
import { selectPackageVideo } from './upload-package-summary.mjs';

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
  // 실사처럼 보이는 AI 배경 영상을 쓰므로 표시한다. 유튜브는 표시해도 노출·수익에 불이익이 없다고 안내한다.
  containsSyntheticMedia: true,
  // 영상 언어와 오디오 언어. 스튜디오 업로드는 채널 기본값(ko)을 쓰지만 API 업로드는 보내지 않으면 비어서,
  // 자동 자막과 자동 더빙의 원본 언어 판단에 쓰이지 않는다(2026-11-07 EP24에서 발견).
  videoLanguage: 'ko',
};

/**
 * 이미 올라간 영상의 언어만 고칠 때 보낼 snippet을 만든다.
 * videos.update는 snippet을 통째로 바꾸므로, 쓸 수 있는 칸을 현재 값 그대로 함께 보내야 제목·설명·태그가 지워지지 않는다.
 */
export function languageSnippetUpdate(current, language) {
  if (!current?.title || !current?.categoryId) {
    throw new Error('현재 제목이나 카테고리를 읽지 못해 언어를 고치지 않습니다. 그대로 보내면 다른 칸이 지워질 수 있습니다.');
  }
  return {
    title: current.title,
    description: current.description ?? '',
    tags: Array.isArray(current.tags) ? current.tags : [],
    categoryId: current.categoryId,
    defaultLanguage: language,
    defaultAudioLanguage: language,
  };
}

const UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

export const hasUploadScope = (scope) => String(scope || '').split(/\s+/).includes(UPLOAD_SCOPE);

// 이해하면 쉬운 영어. 한 구글 계정에 채널이 여러 개라 재연동 때 다른 채널이 잡힐 수 있다
// (2026-11-06 EP24가 k포스트잇 채널에 올라간 사고). 올리기와 데이터 저장 전에 항상 대조한다.
export const OUR_CHANNEL_ID = 'UCwNrEdm2jYAtUlfHVvH3WQw';

export const isOurChannel = (channelId) => channelId === OUR_CHANNEL_ID;

// 메인 썸네일만 올린다. 없을 때 시안으로 대신하면 EP24의 BEACH vs BITCH 같은 파일이 올라갈 수 있다.
const selectMainThumbnail = (files) => ['thumbnail.jpg', 'thumbnail.png', 'thumbnail.jpeg'].find((name) => files.includes(name)) || null;

const hashFile = async (path) => createHash('sha256').update(await readFile(path)).digest('hex');

const readJsonFile = async (path) => JSON.parse(await readFile(path, 'utf8'));

const writeJsonFile = (path, value) => writeFile(path, JSON.stringify(value, null, 2), 'utf8');

// 사람이 지금 이 썸네일 파일을 봤다고 기록한다. 파일이 바뀌면 지문이 달라져 승인이 풀린다.
export async function approveThumbnail(pkgDir) {
  const file = selectMainThumbnail(await readdir(pkgDir));
  if (!file) throw new Error('메인 썸네일(thumbnail.jpg)이 없어 승인할 수 없습니다.');
  const statusPath = join(pkgDir, 'status.json');
  const status = await readJsonFile(statusPath);
  const thumbnailApproval = { file, sha256: await hashFile(join(pkgDir, file)), approvedAt: new Date().toISOString() };
  await writeJsonFile(statusPath, { ...status, thumbnailApproval });
  return thumbnailApproval;
}

const findBlockers = ({ title, description, tags, pinnedComment, thumbnailFileName, thumbnailSha256, thumbnailApproval }) => {
  const blockers = [];
  if (!thumbnailFileName) blockers.push('메인 썸네일(thumbnail.jpg)이 없습니다.');
  else if (thumbnailApproval?.sha256 !== thumbnailSha256) blockers.push('썸네일 승인이 필요합니다.');
  blockers.push(...findPackageProblems({ title, description, tags: tags.join(', '), pinned: pinnedComment, ignoreLengthHint: true }));
  return blockers;
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
    // 키워드 파일명(SEO)을 generic video.mp4보다 우선 선택(대시보드와 같은 규칙)
    const videoFile = selectPackageVideo(files);
    if (!videoFile) continue; // 동영상 없으면 제외

    const thumbFile = selectMainThumbnail(files);

    const readOptional = async (filename, fallback = '') => {
      const p = join(pkgDir, filename);
      if (existsSync(p)) return (await readFile(p, 'utf8')).trim();
      return fallback;
    };

    const title = (await readOptional('title.txt')) || statusJson.title || ent.name;
    const description = await readOptional('description.txt');
    const tags = (await readOptional('tags.txt')).split(',').map((t) => t.trim()).filter(Boolean);
    const pinnedComment = await readOptional('pinned-comment.txt');
    const titleVariants = parseTitleVariants(await readOptional('title-variants.txt')).map((variant) => variant.title);
    const thumbnailSha256 = thumbFile ? await hashFile(join(pkgDir, thumbFile)) : null;
    const thumbnailApproval = statusJson.thumbnailApproval || null;

    ready.push({
      episodeId: ent.name,
      pkgDir,
      title,
      titleVariants,
      description,
      tags,
      pinnedComment,
      videoFileName: videoFile,
      thumbnailFileName: thumbFile || null,
      thumbnailSha256,
      thumbnailApproval,
      blockers: findBlockers({ title, description, tags, pinnedComment, thumbnailFileName: thumbFile, thumbnailSha256, thumbnailApproval }),
      status: statusJson.status,
      recommendedPublishAt: statusJson.recommendedPublishAt || null,
      generatedAt: statusJson.generatedAt || null,
    });
  }

  return sortEpisodePackages(ready.map((r) => r.episodeId))
    .map((id) => ready.find((r) => r.episodeId === id))
    .filter(Boolean);
}

const readPackageStatuses = async (uploadPackagesDir) => {
  if (!existsSync(uploadPackagesDir)) return [];
  const entries = await readdir(uploadPackagesDir, { withFileTypes: true });
  const packages = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const pkgDir = join(uploadPackagesDir, ent.name);
    const statusPath = join(pkgDir, 'status.json');
    if (!existsSync(statusPath)) continue;
    try {
      packages.push({ episodeId: ent.name, pkgDir, status: await readJsonFile(statusPath) });
    } catch {
      // 깨진 status.json은 업로드 대상도 해결 대상도 아니다.
    }
  }
  return sortEpisodePackages(packages.map((p) => p.episodeId)).map((id) => packages.find((p) => p.episodeId === id));
};

// 사람이 해결해야 다음 업로드로 넘어갈 수 있는 패키지. 실패를 건너뛰면 공개 순서가 꼬이고
// 같은 원인(권한, 할당량)으로 남은 영상까지 줄줄이 실패한다.
export async function scanPackagesNeedingAttention(uploadPackagesDir) {
  const packages = await readPackageStatuses(uploadPackagesDir);
  return packages.flatMap(({ episodeId, pkgDir, status }) => {
    if (status.status === 'upload_failed') {
      return [{ episodeId, pkgDir, kind: 'upload_failed', message: String(status.uploadError || '업로드 실패').slice(0, 300) }];
    }
    if (status.status === 'scheduled' && status.thumbnailError) {
      return [{ episodeId, pkgDir, kind: 'thumbnail_failed', videoId: status.videoId, message: String(status.thumbnailError).slice(0, 300) }];
    }
    return [];
  });
}

// 업로드를 막지는 않지만 사람이 직접 처리해야 하는 일. 고정 댓글은 공개된 뒤에 달 수 있으므로
// 공개 시점에 사라지면 안 된다. 등록했다고 표시할 때까지 남긴다.
export async function scanUploadNotices(uploadPackagesDir) {
  const packages = await readPackageStatuses(uploadPackagesDir);
  return packages
    .filter(({ status }) => ['scheduled', 'published'].includes(status.status) && (status.pinnedCommentPending || status.commentError))
    .map(({ episodeId, pkgDir, status }) => ({ episodeId, pkgDir, videoId: status.videoId, published: status.status === 'published' }));
}

export async function dismissCommentNotice(pkgDir) {
  const statusPath = join(pkgDir, 'status.json');
  const { pinnedCommentPending, commentError, ...rest } = await readJsonFile(statusPath);
  await writeJsonFile(statusPath, rest);
}

export async function resolveAttention({ pkgDir, action, accessToken, fetchFn = fetch }) {
  const statusPath = join(pkgDir, 'status.json');
  const status = await readJsonFile(statusPath);

  if (status.status === 'upload_failed' && action === 'retry') {
    const { uploadError, ...rest } = status;
    await writeJsonFile(statusPath, { ...rest, status: 'ready_to_upload' });
    return { ok: true };
  }

  if (status.status === 'scheduled' && status.thumbnailError) {
    const { thumbnailError, ...rest } = status;
    if (action === 'dismiss') {
      await writeJsonFile(statusPath, rest);
      return { ok: true };
    }
    if (action === 'retry') {
      const file = selectMainThumbnail(await readdir(pkgDir));
      try {
        if (!file) throw new Error('메인 썸네일(thumbnail.jpg)이 없습니다.');
        await setVideoThumbnail({ videoId: status.videoId, thumbnailPath: join(pkgDir, file), accessToken, fetchFn });
        await writeJsonFile(statusPath, rest);
        return { ok: true };
      } catch (err) {
        await writeJsonFile(statusPath, { ...rest, thumbnailError: err.message });
        return { ok: false, error: err.message };
      }
    }
  }

  return { ok: false, error: '처리할 문제가 없습니다.' };
}

const normalizeTitle = (title) => (title || '').trim().replace(/\s+/g, ' ');

const findExistingUpload = (item, existingUploads) => {
  const candidates = [item.title, ...(item.titleVariants || [])].filter(Boolean).map(normalizeTitle);
  return existingUploads.find((video) => {
    const title = normalizeTitle(video.title);
    return candidates.some((candidate) => candidate === title || (candidate.length >= 12 && title.includes(candidate)));
  });
};

/**
 * 다음에 올릴 영상을 정한다. 자동 업로드와 수동 버튼이 같은 검사를 통과해야 올라간다.
 * episodeId를 주면 사람이 누른 수동 업로드이고, force는 업로드 한도만 건너뛴다.
 * 첫 편에 문제가 있으면 뒤 편으로 건너뛰지 않는다. 끝 화면이 앞 편을 가리켜서 공개 순서가 중요하다.
 */
export function decideNextUpload({
  readyPackages = [],
  attention = [],
  rules = {},
  latestScheduledDate = null,
  hasScope = false,
  connectedChannel = null,
  recentUploadHistory = [],
  existingUploads = null,
  skipDuplicateCheck = false,
  episodeId = null,
  force = false,
  now = new Date(),
}) {
  const stop = (reason, code = 'blocked') => ({ ok: false, reason, code });

  if (!hasScope) return stop('유튜브 업로드 권한이 없습니다. 대시보드에서 채널을 재연동하세요.', 'no_scope');
  if (!connectedChannel) return stop('연동된 채널을 확인하지 못해 올리지 않습니다.', 'channel_unknown');
  if (!isOurChannel(connectedChannel.id)) {
    return stop(`지금 연동된 채널은 "${connectedChannel.title}"입니다. 재연동해서 "이해하면 쉬운 영어" 채널을 고르세요.`, 'wrong_channel');
  }
  if (attention.length > 0) return stop(`${attention[0].episodeId} 문제를 먼저 해결해야 합니다: ${attention[0].message}`, 'attention');
  if (readyPackages.length === 0) return stop('대기 중인 패키지가 없습니다.', 'empty');

  const [next] = buildPublishQueue({ readyPackages, rules, latestScheduledDate, now });
  if (episodeId && next.episodeId !== episodeId) return stop(`순서를 지켜 주세요. 다음 차례는 ${next.episodeId}입니다.`, 'order');
  if (next.blockers?.length) return stop(`${next.episodeId}: ${next.blockers.join(' ')}`, 'package');

  if (!force) {
    const throttle = isUploadAllowed({
      recentUploadHistory,
      maxUploadsPerDay: rules.maxUploadsPerDay,
      maxUploadsPerWeek: rules.maxUploadsPerWeek,
      now,
    });
    if (!throttle.allowed) return stop(throttle.reason, 'throttled');
  }

  if (!skipDuplicateCheck) {
    if (!existingUploads) return stop('채널 업로드 목록을 읽지 못해 중복 여부를 확인할 수 없습니다.', 'channel_unknown');
    const existing = findExistingUpload(next, existingUploads);
    if (existing) return stop(`${next.episodeId}: 채널에 이미 같은 제목의 영상이 있습니다 (${existing.videoId}).`, 'duplicate');
  }

  return { ok: true, item: next };
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
  containsSyntheticMedia = false,
  language = DEFAULT_PUBLISH_RULES.videoLanguage,
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
      defaultLanguage: language,
      defaultAudioLanguage: language,
    },
    status: {
      privacyStatus: privacyStatus || 'private',
      selfDeclaredMadeForKids: false,
    },
  };

  if (publishAt) {
    metadataBody.status.publishAt = publishAt;
  }

  if (containsSyntheticMedia) {
    metadataBody.status.containsSyntheticMedia = true;
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
      containsSyntheticMedia: rules.containsSyntheticMedia,
      language: rules.videoLanguage || DEFAULT_PUBLISH_RULES.videoLanguage,
      accessToken,
      fetchFn,
    });

    // 영상은 이미 올라갔으므로 이후 실패로 upload_failed를 쓰면 안 된다. 다시 올리면 중복이 된다.
    const warnings = [];
    const followUp = {};

    if (item.thumbnailFileName) {
      const thumbPath = join(item.pkgDir, item.thumbnailFileName);
      try {
        await setVideoThumbnail({ videoId, thumbnailPath: thumbPath, accessToken, fetchFn });
      } catch (thumbErr) {
        console.warn(`[Publisher] 썸네일 등록 경고 (${item.episodeId}):`, thumbErr.message);
        followUp.thumbnailError = thumbErr.message;
        warnings.push(`썸네일 등록 실패: ${thumbErr.message}`);
      }
    }

    // 예약(비공개) 영상에는 댓글이 달리지 않는다. 실제 업로드 2회 모두 403으로 거부됐다(2026-11-06).
    // 시도하지 않고, 공개 뒤 사람이 등록하고 고정하도록 표시만 남긴다.
    if (rules.autoComment && item.pinnedComment) {
      followUp.pinnedCommentPending = true;
    }

    const updatedStatus = {
      ...existingStatus,
      ...followUp,
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
      warnings,
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
