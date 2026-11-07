import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  calculateNextPublishSlot,
  sortEpisodePackages,
  isUploadAllowed,
  loadPublishRules,
  savePublishRules,
  scanReadyPackages,
  buildPublishQueue,
  uploadVideoToYouTube,
  setVideoThumbnail,
  createFirstComment,
  processQueueItem,
  hasUploadScope,
  approveThumbnail,
  scanPackagesNeedingAttention,
  scanUploadNotices,
  dismissCommentNotice,
  resolveAttention,
  decideNextUpload,
  OUR_CHANNEL_ID,
  isOurChannel,
  languageSnippetUpdate,
} from '../youtube-publisher.mjs';

const CLEAN_RULES = {
  publishTimeKst: '23:00',
  allowedDaysOfWeek: [1, 4],
  scheduleMode: 'daysOfWeek',
  maxUploadsPerDay: 1,
  maxUploadsPerWeek: 2,
  defaultPrivacy: 'private',
  autoComment: true,
  containsSyntheticMedia: true,
};
const FIXED_NOW = new Date('2026-11-06T12:00:00Z');
const UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload';

// 업로드 대기 패키지를 임시 폴더에 만든다. 썸네일 승인까지 끝낸 상태로 만들려면 approve를 쓴다.
const makePackages = async (episodeIds, {approve = true, files = {}} = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'publisher-safety-'));
  for (const id of episodeIds) {
    const dir = join(root, id);
    await mkdir(dir, {recursive: true});
    await writeFile(join(dir, 'status.json'), JSON.stringify({status: 'ready_to_upload'}));
    await writeFile(join(dir, 'title.txt'), `${id} 제목`);
    await writeFile(join(dir, 'description.txt'), '설명');
    await writeFile(join(dir, 'tags.txt'), '영어발음');
    await writeFile(join(dir, 'pinned-comment.txt'), '고정 댓글');
    await writeFile(join(dir, 'clip.mp4'), 'video');
    await writeFile(join(dir, 'thumbnail.jpg'), 'thumb');
    for (const [name, content] of Object.entries(files)) await writeFile(join(dir, name), content);
    if (approve) await approveThumbnail(dir);
  }
  return root;
};

const readStatus = async (root, id) => JSON.parse(await readFile(join(root, id, 'status.json'), 'utf8'));

const decide = async (root, overrides = {}) =>
  decideNextUpload({
    readyPackages: await scanReadyPackages(root),
    attention: await scanPackagesNeedingAttention(root),
    rules: CLEAN_RULES,
    latestScheduledDate: null,
    hasScope: true,
    connectedChannel: {id: OUR_CHANNEL_ID, title: '이해하면 쉬운 영어'},
    recentUploadHistory: [],
    existingUploads: [],
    now: FIXED_NOW,
    ...overrides,
  });

const failingFetch = (status, reason) => async () => ({ok: false, status, text: async () => reason});

// 영상은 올라가고 나머지 호출은 failFor에 맞는 주소만 거부하는 가짜 응답
const partialFetch = (failFor) => async (url) => {
  if (url.includes('uploadType=resumable')) return {ok: true, status: 200, headers: new Headers({location: 'https://mock/session'})};
  if (url === 'https://mock/session') return {ok: true, status: 200, json: async () => ({id: 'VID1'})};
  if (url.includes(failFor)) return {ok: false, status: 403, text: async () => 'forbidden'};
  return {ok: true, status: 200, json: async () => ({id: 'OK'})};
};

test('hasUploadScope는 업로드 권한이 있어야 참이다', () => {
  assert.equal(hasUploadScope(UPLOAD_SCOPE), true);
  assert.equal(hasUploadScope('https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly'), false);
  assert.equal(hasUploadScope(undefined), false);
});

test('한 편이 실패하면 다음 편으로 넘어가지 않고 멈춘다 (6편 연쇄 실패 재현)', async () => {
  const eps = ['ep24-a', 'ep25-b', 'ep26-c'];
  const root = await makePackages(eps);
  try {
    const first = await decide(root);
    assert.equal(first.ok, true);
    assert.equal(first.item.episodeId, 'ep24-a');
    const result = await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn: failingFetch(403, 'insufficientPermissions')});
    assert.equal(result.success, false);

    const second = await decide(root);
    assert.equal(second.ok, false);
    assert.match(second.reason, /ep24-a/);
    assert.equal((await readStatus(root, 'ep25-b')).status, 'ready_to_upload');
    assert.equal((await readStatus(root, 'ep26-c')).status, 'ready_to_upload');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('실패한 편이 있으면 수동 업로드도 뒤 편을 올리지 못한다 (순서 꼬임 재현)', async () => {
  const root = await makePackages(['ep24-a', 'ep25-b']);
  try {
    const first = await decide(root);
    await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn: failingFetch(503, 'backendError')});
    const manual = await decide(root, {episodeId: 'ep25-b', force: true});
    assert.equal(manual.ok, false);
    assert.match(manual.reason, /ep24-a/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('실패 영상은 화면에 보이도록 목록에 남고, 다시 시도하면 대기로 돌아간다', async () => {
  const root = await makePackages(['ep24-a']);
  try {
    const first = await decide(root);
    await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn: failingFetch(503, 'backendError')});
    const attention = await scanPackagesNeedingAttention(root);
    assert.equal(attention.length, 1);
    assert.equal(attention[0].kind, 'upload_failed');
    assert.match(attention[0].message, /503/);

    const resolved = await resolveAttention({pkgDir: join(root, 'ep24-a'), action: 'retry', accessToken: 't', fetchFn: failingFetch(500, 'should not call')});
    assert.equal(resolved.ok, true);
    const status = await readStatus(root, 'ep24-a');
    assert.equal(status.status, 'ready_to_upload');
    assert.equal(status.uploadError, undefined);
    assert.equal((await decide(root)).ok, true);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('썸네일이 거부되면 기록을 남기고 다음 업로드를 멈춘다', async () => {
  const root = await makePackages(['ep24-a', 'ep25-b']);
  try {
    const first = await decide(root);
    const result = await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn: partialFetch('/thumbnails/set')});
    assert.equal(result.success, true);
    assert.match(result.warnings.join(' '), /썸네일/);
    const status = await readStatus(root, 'ep24-a');
    assert.equal(status.status, 'scheduled');
    assert.match(status.thumbnailError, /403/);

    const attention = await scanPackagesNeedingAttention(root);
    assert.equal(attention[0].kind, 'thumbnail_failed');
    assert.equal((await decide(root)).ok, false);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('썸네일 다시 시도: 실패하면 기록이 남고 성공하면 지워진다', async () => {
  const root = await makePackages(['ep24-a']);
  try {
    const first = await decide(root);
    await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn: partialFetch('/thumbnails/set')});
    const dir = join(root, 'ep24-a');

    const failed = await resolveAttention({pkgDir: dir, action: 'retry', accessToken: 't', fetchFn: failingFetch(403, 'forbidden')});
    assert.equal(failed.ok, false);
    assert.match((await readStatus(root, 'ep24-a')).thumbnailError, /403/);

    const succeeded = await resolveAttention({pkgDir: dir, action: 'retry', accessToken: 't', fetchFn: async () => ({ok: true, status: 200, json: async () => ({})})});
    assert.equal(succeeded.ok, true);
    assert.equal((await readStatus(root, 'ep24-a')).thumbnailError, undefined);
    assert.equal((await scanPackagesNeedingAttention(root)).length, 0);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('스튜디오에서 직접 해결했다고 표시하면 다시 진행한다', async () => {
  const root = await makePackages(['ep24-a']);
  try {
    const first = await decide(root);
    await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn: partialFetch('/thumbnails/set')});
    const resolved = await resolveAttention({pkgDir: join(root, 'ep24-a'), action: 'dismiss', accessToken: 't', fetchFn: failingFetch(500, 'should not call')});
    assert.equal(resolved.ok, true);
    assert.equal((await scanPackagesNeedingAttention(root)).length, 0);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('예약 업로드는 댓글을 시도하지 않고 공개 후 등록 안내를 남긴다', async () => {
  const root = await makePackages(['ep24-a', 'ep25-b']);
  const urls = [];
  const fetchFn = async (url, options) => {
    urls.push(url);
    return partialFetch('none')(url, options);
  };
  try {
    const first = await decide(root);
    const result = await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn});
    assert.equal(result.success, true);
    assert.deepEqual(result.warnings, []);
    assert.equal(urls.some((url) => url.includes('commentThreads')), false);
    assert.equal((await readStatus(root, 'ep24-a')).pinnedCommentPending, true);
    assert.equal((await scanPackagesNeedingAttention(root)).length, 0);
    const notices = await scanUploadNotices(root);
    assert.equal(notices.length, 1);
    assert.equal(notices[0].episodeId, 'ep24-a');
    assert.equal(notices[0].published, false);
    assert.equal((await decide(root)).item.episodeId, 'ep25-b');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('고정 댓글 안내는 공개된 뒤에도 남고, 등록했다고 표시하면 사라진다', async () => {
  const root = await makePackages(['ep24-a']);
  const dir = join(root, 'ep24-a');
  try {
    await writeFile(join(dir, 'status.json'), JSON.stringify({status: 'published', videoId: 'VID', pinnedCommentPending: true}));
    const [notice] = await scanUploadNotices(root);
    assert.equal(notice.published, true);
    assert.equal(notice.videoId, 'VID');
    await dismissCommentNotice(dir);
    assert.deepEqual(await scanUploadNotices(root), []);
    assert.equal((await readStatus(root, 'ep24-a')).pinnedCommentPending, undefined);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('예전 방식으로 댓글이 실패한 영상도 안내하고, 등록했다고 표시하면 기록을 지운다', async () => {
  const root = await makePackages(['ep24-a']);
  const dir = join(root, 'ep24-a');
  try {
    await writeFile(join(dir, 'status.json'), JSON.stringify({status: 'scheduled', videoId: 'VID', commentError: '고정 댓글 등록 실패 (403)'}));
    assert.equal((await scanUploadNotices(root)).length, 1);
    await dismissCommentNotice(dir);
    assert.deepEqual(await scanUploadNotices(root), []);
    assert.equal((await readStatus(root, 'ep24-a')).commentError, undefined);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('올릴 고정 댓글이 없으면 안내하지 않는다', async () => {
  const root = await makePackages(['ep24-a'], {files: {'pinned-comment.txt': ''}});
  try {
    const first = await decide(root);
    await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn: partialFetch('none')});
    assert.deepEqual(await scanUploadNotices(root), []);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('우리 채널이 아니면 모든 조건이 맞아도 올리지 않는다 (k포스트잇 업로드 사고 재현)', async () => {
  const root = await makePackages(['ep24-a']);
  const wrong = {id: 'UCTlT9eSeGvWLBVwa9c28zMg', title: 'k포스트잇'};
  try {
    const auto = await decide(root, {connectedChannel: wrong});
    assert.equal(auto.ok, false);
    assert.equal(auto.code, 'wrong_channel');
    assert.match(auto.reason, /k포스트잇/);
    const manual = await decide(root, {connectedChannel: wrong, episodeId: 'ep24-a', force: true});
    assert.equal(manual.ok, false);
    assert.equal(manual.code, 'wrong_channel');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('연동된 채널을 확인하지 못하면 올리지 않는다', async () => {
  const root = await makePackages(['ep24-a']);
  try {
    const decision = await decide(root, {connectedChannel: null});
    assert.equal(decision.ok, false);
    assert.equal(decision.code, 'channel_unknown');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('isOurChannel은 우리 채널 ID만 참이다', () => {
  assert.equal(isOurChannel('UCwNrEdm2jYAtUlfHVvH3WQw'), true);
  assert.equal(isOurChannel('UCTlT9eSeGvWLBVwa9c28zMg'), false);
  assert.equal(isOurChannel(undefined), false);
});

test('업로드 권한이 없으면 호출하지 않고 멈춘다', async () => {
  const root = await makePackages(['ep24-a']);
  try {
    const decision = await decide(root, {hasScope: false});
    assert.equal(decision.ok, false);
    assert.match(decision.reason, /재연동/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('사람이 승인하지 않은 썸네일은 올리지 않고, 뒤 편으로 건너뛰지도 않는다', async () => {
  const root = await makePackages(['ep24-a', 'ep25-b']);
  try {
    await writeFile(join(root, 'ep24-a', 'thumbnail.jpg'), 'replaced-without-approval');
    const decision = await decide(root);
    assert.equal(decision.ok, false);
    assert.match(decision.reason, /ep24-a/);
    assert.match(decision.reason, /승인/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('승인 뒤 썸네일을 바꾸면 승인이 풀리고, 다시 승인하면 통과한다', async () => {
  const root = await makePackages(['ep24-a']);
  try {
    const dir = join(root, 'ep24-a');
    assert.deepEqual((await scanReadyPackages(root))[0].blockers, []);
    await writeFile(join(dir, 'thumbnail.jpg'), 'new-thumb');
    assert.match((await scanReadyPackages(root))[0].blockers.join(' '), /승인/);
    await approveThumbnail(dir);
    assert.deepEqual((await scanReadyPackages(root))[0].blockers, []);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('메인 썸네일이 없으면 시안으로 대신 올리지 않는다 (thumbnail-b.jpg 사고 방지)', async () => {
  const root = await makePackages(['ep24-a'], {approve: false, files: {'thumbnail-b.jpg': 'beach-vs-bitch'}});
  try {
    await rm(join(root, 'ep24-a', 'thumbnail.jpg'));
    const [pkg] = await scanReadyPackages(root);
    assert.equal(pkg.thumbnailFileName, null);
    assert.match(pkg.blockers.join(' '), /thumbnail\.jpg/);
    await assert.rejects(approveThumbnail(join(root, 'ep24-a')), /thumbnail\.jpg/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('금지어나 빈 링크가 있으면 올리지 않는다', async () => {
  const root = await makePackages(['ep24-a', 'ep25-b']);
  try {
    await writeFile(join(root, 'ep24-a', 'description.txt'), '듣기 드릴 영상입니다');
    await writeFile(join(root, 'ep25-b', 'description.txt'), '다음 영상 https://youtu.be/...');
    const [first, second] = await scanReadyPackages(root);
    assert.match(first.blockers.join(' '), /드릴/);
    assert.match(second.blockers.join(' '), /자리표시자/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('실제 길이가 맞는 길이 표기 제목은 업로드를 막지 않는다', async () => {
  const root = await makePackages(['ep24-a']);
  try {
    await writeFile(join(root, 'ep24-a', 'title.txt'), '[30분 듣기] 영어 발음');
    assert.deepEqual((await scanReadyPackages(root))[0].blockers, []);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('채널에 같은 제목이 이미 있으면 올리지 않는다 (시안 제목 포함)', async () => {
  const root = await makePackages(['ep24-a'], {files: {'title-variants.txt': '[A] (메인) ep24-a 제목\n[B] (시안) 스튜디오에서 고른 긴 시안 제목입니다'}});
  try {
    const sameTitle = await decide(root, {existingUploads: [{videoId: 'X', title: '  ep24-a   제목 '}]});
    assert.equal(sameTitle.ok, false);
    assert.match(sameTitle.reason, /이미/);
    const variant = await decide(root, {existingUploads: [{videoId: 'Y', title: '스튜디오에서 고른 긴 시안 제목입니다'}]});
    assert.equal(variant.ok, false);
    assert.equal((await decide(root, {existingUploads: [{videoId: 'Z', title: '전혀 다른 영상'}]})).ok, true);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('채널 목록을 못 읽으면 중복을 알 수 없으니 올리지 않는다', async () => {
  const root = await makePackages(['ep24-a']);
  try {
    const decision = await decide(root, {existingUploads: null});
    assert.equal(decision.ok, false);
    assert.match(decision.reason, /채널/);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('수동 업로드도 큐의 첫 편만 올릴 수 있다', async () => {
  const root = await makePackages(['ep24-a', 'ep25-b']);
  try {
    const skip = await decide(root, {episodeId: 'ep25-b', force: true});
    assert.equal(skip.ok, false);
    assert.match(skip.reason, /순서/);
    assert.equal((await decide(root, {episodeId: 'ep24-a', force: true})).ok, true);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('한도를 넘으면 자동 업로드는 멈추고, 사람이 누른 수동 업로드는 통과한다', async () => {
  const root = await makePackages(['ep24-a']);
  const recentUploadHistory = [{uploadedAt: new Date(FIXED_NOW.getTime() - 3600 * 1000).toISOString()}];
  try {
    assert.equal((await decide(root, {recentUploadHistory})).ok, false);
    assert.equal((await decide(root, {recentUploadHistory, episodeId: 'ep24-a', force: true})).ok, true);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('AI 사용 표시가 업로드 정보에 들어간다', async () => {
  const root = await makePackages(['ep24-a']);
  const bodies = [];
  const fetchFn = async (url, options = {}) => {
    if (url.includes('uploadType=resumable')) bodies.push(JSON.parse(options.body));
    return partialFetch('none')(url);
  };
  try {
    const first = await decide(root);
    await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn});
    assert.equal(bodies[0].status.containsSyntheticMedia, true);
    assert.equal(bodies[0].status.privacyStatus, 'private');
    assert.equal(bodies[0].status.publishAt, first.item.scheduledFor);
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('업로드 정보에 영상 언어와 오디오 언어가 한국어로 들어간다', async () => {
  const root = await makePackages(['ep24-a']);
  const bodies = [];
  const fetchFn = async (url, options = {}) => {
    if (url.includes('uploadType=resumable')) bodies.push(JSON.parse(options.body));
    return partialFetch('none')(url);
  };
  try {
    const first = await decide(root);
    await processQueueItem({item: first.item, accessToken: 't', rules: CLEAN_RULES, fetchFn});
    assert.equal(bodies[0].snippet.defaultLanguage, 'ko');
    assert.equal(bodies[0].snippet.defaultAudioLanguage, 'ko');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('규칙에 다른 언어를 정하면 그 언어로 올린다', async () => {
  const root = await makePackages(['ep24-a']);
  const bodies = [];
  const fetchFn = async (url, options = {}) => {
    if (url.includes('uploadType=resumable')) bodies.push(JSON.parse(options.body));
    return partialFetch('none')(url);
  };
  try {
    const first = await decide(root);
    await processQueueItem({item: first.item, accessToken: 't', rules: {...CLEAN_RULES, videoLanguage: 'en'}, fetchFn});
    assert.equal(bodies[0].snippet.defaultLanguage, 'en');
    assert.equal(bodies[0].snippet.defaultAudioLanguage, 'en');
  } finally {
    await rm(root, {recursive: true, force: true});
  }
});

test('이미 올라간 영상의 언어를 고칠 때 제목·설명·태그·카테고리를 그대로 보낸다', () => {
  const current = {
    title: '제목', description: '설명', tags: ['a', 'b'], categoryId: '27',
    channelId: 'UCx', thumbnails: {default: {url: 'x'}}, localized: {title: '제목'}, publishedAt: '2026-11-06T00:00:00Z',
  };
  assert.deepEqual(languageSnippetUpdate(current, 'ko'), {
    title: '제목', description: '설명', tags: ['a', 'b'], categoryId: '27', defaultLanguage: 'ko', defaultAudioLanguage: 'ko',
  });
});

test('언어를 고칠 때 제목이나 카테고리가 없으면 덮어쓰지 않고 멈춘다', () => {
  assert.throws(() => languageSnippetUpdate({description: '설명'}, 'ko'), /제목|카테고리/);
});

test('sortEpisodePackages orders packages strictly by episode number ascending', () => {
  const input = [
    'ep29-b-vs-v',
    's1-ep09-longform',
    'ep24-long-short-i',
    'ep11-gonna-longform',
    'ep25-pool-pull',
    'channel-shorts-c-schwa'
  ];
  const sorted = sortEpisodePackages(input);
  // Episode numbers: s1-ep09 (9), ep11 (11), ep24 (24), ep25 (25), ep29 (29), followed by non-numbered
  assert.equal(sorted[0], 's1-ep09-longform');
  assert.equal(sorted[1], 'ep11-gonna-longform');
  assert.equal(sorted[2], 'ep24-long-short-i');
  assert.equal(sorted[3], 'ep25-pool-pull');
  assert.equal(sorted[4], 'ep29-b-vs-v');
  assert.equal(sorted[5], 'channel-shorts-c-schwa');
});

test('calculateNextPublishSlot picks the next allowed day of week at 23:00 KST (14:00 UTC)', () => {
  // 기준 시점: 2026-11-06 (금요일) 10:00:00 UTC
  // 허용 요일: [1, 4] (월, 목)
  // 발행 시간: "23:00" KST -> 14:00 UTC
  const now = new Date('2026-11-06T10:00:00Z');
  const slot = calculateNextPublishSlot({
    lastPublishAt: '2026-11-05T14:00:00Z',
    publishTimeKst: '23:00',
    allowedDaysOfWeek: [1, 4], // Mon, Thu
    scheduleMode: 'daysOfWeek',
    now,
  });

  // 금요일 다음 허용 요일은 다음주 월요일 2026-11-09 23:00 KST = 2026-11-09T14:00:00.000Z
  assert.equal(slot, '2026-11-09T14:00:00.000Z');
});

test('calculateNextPublishSlot advances slot if lastPublishAt is in the past', () => {
  // 기준 시점: 2026-11-06 (금요일) 10:00:00 UTC
  // 과거 한 달 전 기준일이 들어왔더라도 현재(now) 이후의 첫 슬롯(11-09)으로 배정되어야 함
  const now = new Date('2026-11-06T10:00:00Z');
  const slot = calculateNextPublishSlot({
    lastPublishAt: '2026-10-15T14:00:00Z',
    publishTimeKst: '23:00',
    allowedDaysOfWeek: [1, 4],
    scheduleMode: 'daysOfWeek',
    now,
  });

  assert.equal(slot, '2026-11-09T14:00:00.000Z');
});

test('calculateNextPublishSlot supports interval mode with minIntervalDays', () => {
  // 기준 시점: 2026-11-06T10:00:00Z
  // 마지막 발행: 2026-11-06T14:00:00Z
  // 최소 간격 3일 -> 2026-11-09 14:00:00Z
  const now = new Date('2026-11-06T10:00:00Z');
  const slot = calculateNextPublishSlot({
    lastPublishAt: '2026-11-06T14:00:00Z',
    publishTimeKst: '23:00',
    minIntervalDays: 3,
    scheduleMode: 'interval',
    now,
  });

  assert.equal(slot, '2026-11-09T14:00:00.000Z');
});

test('isUploadAllowed enforces daily limit of 1 video and weekly limit of 2 videos', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  
  // 1. 당일(24시간 내) 이미 업로드한 경우 거부
  const recent1 = [
    { uploadedAt: '2026-11-06T08:00:00Z', videoId: 'v1' },
  ];
  const res1 = isUploadAllowed({
    recentUploadHistory: recent1,
    maxUploadsPerDay: 1,
    maxUploadsPerWeek: 2,
    now,
  });
  assert.equal(res1.allowed, false);
  assert.match(res1.reason, /일일 최대 업로드 한도/);

  // 2. 지난 7일 내 2편 업로드한 경우 거부
  const recent2 = [
    { uploadedAt: '2026-11-02T14:00:00Z', videoId: 'v1' },
    { uploadedAt: '2026-11-04T14:00:00Z', videoId: 'v2' },
  ];
  const res2 = isUploadAllowed({
    recentUploadHistory: recent2,
    maxUploadsPerDay: 1,
    maxUploadsPerWeek: 2,
    now,
  });
  assert.equal(res2.allowed, false);
  assert.match(res2.reason, /주간 최대 업로드 한도/);

  // 3. 한도 내인 경우 허용
  const recent3 = [
    { uploadedAt: '2026-11-02T14:00:00Z', videoId: 'v1' },
  ];
  const res3 = isUploadAllowed({
    recentUploadHistory: recent3,
    maxUploadsPerDay: 1,
    maxUploadsPerWeek: 2,
    now,
  });
  assert.equal(res3.allowed, true);
});

test('loadPublishRules returns defaults if file does not exist, and savePublishRules writes valid JSON', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'pub-rules-test-'));
  const rulesPath = join(tempDir, 'publish-rules.json');

  try {
    const rules = await loadPublishRules(rulesPath);
    assert.equal(rules.publishTimeKst, '23:00');
    assert.deepEqual(rules.allowedDaysOfWeek, [1, 4]);
    assert.equal(rules.maxUploadsPerDay, 1);
    assert.equal(rules.maxUploadsPerWeek, 2);

    // 저장 테스트
    rules.publishTimeKst = '20:00';
    await savePublishRules(rulesPath, rules);

    const reloaded = await loadPublishRules(rulesPath);
    assert.equal(reloaded.publishTimeKst, '20:00');
    assert.ok(reloaded.updatedAt);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('scanReadyPackages finds ready packages and extracts metadata correctly', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'pkg-scan-test-'));

  try {
    // 1. 유효한 ready 패키지 (EP24)
    const ep24Dir = join(tempDir, 'ep24-test');
    await mkdir(ep24Dir, { recursive: true });
    await writeFile(join(ep24Dir, 'status.json'), JSON.stringify({ status: 'ready_to_upload' }));
    await writeFile(join(ep24Dir, 'title.txt'), 'EP24 제목');
    await writeFile(join(ep24Dir, 'description.txt'), 'EP24 설명');
    await writeFile(join(ep24Dir, 'tags.txt'), 'tag1, tag2');
    await writeFile(join(ep24Dir, 'pinned-comment.txt'), '고정 댓글 내용');
    // 테스트용 변형 시안과 정식 thumbnail.jpg, video.mp4와 키워드 mp4 동시 생성
    await writeFile(join(ep24Dir, 'thumbnail-close-up.jpg'), 'fake-thumb-closeup');
    await writeFile(join(ep24Dir, 'thumbnail.jpg'), 'fake-thumb');
    await writeFile(join(ep24Dir, 'video.mp4'), 'fake-generic-mp4');
    await writeFile(join(ep24Dir, 'English_Test_Keyword_Video.mp4'), 'fake-keyword-mp4');

    // 2. 이미 예약된 패키지 (EP23)
    const ep23Dir = join(tempDir, 'ep23-test');
    await mkdir(ep23Dir, { recursive: true });
    await writeFile(join(ep23Dir, 'status.json'), JSON.stringify({ status: 'scheduled' }));
    await writeFile(join(ep23Dir, 'test.mp4'), 'fake');

    // 3. 비디오 파일이 없는 미완성 패키지 (EP25)
    const ep25Dir = join(tempDir, 'ep25-test');
    await mkdir(ep25Dir, { recursive: true });
    await writeFile(join(ep25Dir, 'status.json'), JSON.stringify({ status: 'ready_to_upload' }));
    await writeFile(join(ep25Dir, 'title.txt'), 'EP25 제목');

    const scanned = await scanReadyPackages(tempDir);
    assert.equal(scanned.length, 1);
    assert.equal(scanned[0].episodeId, 'ep24-test');
    assert.equal(scanned[0].title, 'EP24 제목');
    // thumbnail.jpg가 thumbnail-close-up.jpg보다 우선되어야 함
    assert.equal(scanned[0].thumbnailFileName, 'thumbnail.jpg');
    // 키워드 mp4가 generic video.mp4보다 우선되어야 함
    assert.equal(scanned[0].videoFileName, 'English_Test_Keyword_Video.mp4');
    assert.equal(scanned[0].pinnedComment, '고정 댓글 내용');
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test('buildPublishQueue orders packages and assigns sequential slots', async () => {
  const readyPackages = [
    { episodeId: 'ep26-r-vs-l', title: 'EP26' },
    { episodeId: 'ep24-long-short-i', title: 'EP24' },
    { episodeId: 'ep25-pool-pull', title: 'EP25' },
  ];

  const rules = {
    publishTimeKst: '23:00',
    allowedDaysOfWeek: [1, 4], // Mon, Thu
    scheduleMode: 'daysOfWeek',
    maxUploadsPerDay: 1,
    maxUploadsPerWeek: 2,
  };

  // now: 2026-11-06 (금)
  const now = new Date('2026-11-06T10:00:00Z');
  const queue = buildPublishQueue({
    readyPackages,
    rules,
    latestScheduledDate: null,
    now,
  });

  assert.equal(queue.length, 3);
  // 정렬 순서 검증
  assert.equal(queue[0].episodeId, 'ep24-long-short-i');
  assert.equal(queue[1].episodeId, 'ep25-pool-pull');
  assert.equal(queue[2].episodeId, 'ep26-r-vs-l');

  // 첫 슬롯: 월요일 (11-09 14:00Z)
  assert.equal(queue[0].scheduledFor, '2026-11-09T14:00:00.000Z');
  // 둘째 슬롯: 목요일 (11-12 14:00Z)
  assert.equal(queue[1].scheduledFor, '2026-11-12T14:00:00.000Z');
  // 셋째 슬롯: 다음주 월요일 (11-16 14:00Z)
  assert.equal(queue[2].scheduledFor, '2026-11-16T14:00:00.000Z');
});

test('processQueueItem performs upload pipeline and updates status.json', async () => {
  const tempDir = await mkdtemp(join(tmpdir(), 'pkg-upload-test-'));

  try {
    const pkgDir = join(tempDir, 'ep24-test');
    await mkdir(pkgDir, { recursive: true });
    await writeFile(join(pkgDir, 'status.json'), JSON.stringify({ status: 'ready_to_upload' }));
    await writeFile(join(pkgDir, 'video.mp4'), 'test video content');
    await writeFile(join(pkgDir, 'thumbnail.jpg'), 'test thumb content');

    const item = {
      episodeId: 'ep24-test',
      pkgDir,
      title: '테스트 영상 제목',
      description: '테스트 설명',
      tags: ['영어', '발음'],
      pinnedComment: '테스트 고정 댓글',
      videoFileName: 'video.mp4',
      thumbnailFileName: 'thumbnail.jpg',
      scheduledFor: '2026-11-09T14:00:00.000Z',
    };

    const rules = {
      autoComment: true,
      defaultPrivacy: 'private',
    };

    const mockCalls = [];
    const mockFetch = async (url, options = {}) => {
      mockCalls.push({ url, options });

      // 1. Resumable session init
      if (url.includes('/upload/youtube/v3/videos?uploadType=resumable')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({
            location: 'https://mock.upload.url/session-12345',
          }),
        };
      }

      // 2. Binary upload
      if (url === 'https://mock.upload.url/session-12345') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'mock-video-id-999' }),
        };
      }

      // 3. Thumbnail upload
      if (url.includes('/thumbnails/set')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      }

      // 4. Comment insert
      if (url.includes('/commentThreads')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'mock-comment-id-111' }),
        };
      }

      throw new Error(`Unhandled mock url: ${url}`);
    };

    const result = await processQueueItem({
      item,
      accessToken: 'mock-access-token',
      rules,
      fetchFn: mockFetch,
    });

    assert.equal(result.success, true);
    assert.equal(result.videoId, 'mock-video-id-999');

    // API 호출 3회 검증 (예약 영상에는 댓글을 달 수 없어 시도하지 않는다)
    assert.equal(mockCalls.length, 3);

    // 1번 호출 헤더/바디 검증
    const initCall = mockCalls[0];
    assert.equal(initCall.options.headers['Authorization'], 'Bearer mock-access-token');
    const initBody = JSON.parse(initCall.options.body);
    assert.equal(initBody.snippet.title, '테스트 영상 제목');
    assert.equal(initBody.status.privacyStatus, 'private');
    assert.equal(initBody.status.publishAt, '2026-11-09T14:00:00.000Z');

    // status.json 갱신 검증
    const updatedStatus = JSON.parse(await readFile(join(pkgDir, 'status.json'), 'utf8'));
    assert.equal(updatedStatus.status, 'scheduled');
    assert.equal(updatedStatus.videoId, 'mock-video-id-999');
    assert.equal(updatedStatus.scheduledFor, '2026-11-09T14:00:00.000Z');
    assert.ok(updatedStatus.lastSyncedAt);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});


