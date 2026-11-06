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
} from '../youtube-publisher.mjs';

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
    await writeFile(join(ep24Dir, 'thumbnail.jpg'), 'fake-thumb');
    await writeFile(join(ep24Dir, 'English_Test_Video.mp4'), 'fake-mp4');

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
    assert.equal(scanned[0].videoFileName, 'English_Test_Video.mp4');
    assert.equal(scanned[0].thumbnailFileName, 'thumbnail.jpg');
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

    // API 호출 4회 검증
    assert.equal(mockCalls.length, 4);

    // 1번 호출 헤더/바디 검증
    const initCall = mockCalls[0];
    assert.equal(initCall.options.headers['Authorization'], 'Bearer mock-access-token');
    const initBody = JSON.parse(initCall.options.body);
    assert.equal(initBody.snippet.title, '테스트 영상 제목');
    assert.equal(initBody.status.privacyStatus, 'private');
    assert.equal(initBody.status.publishAt, '2026-11-09T14:00:00.000Z');

    // 4번 호출(댓글) 검증
    const commentCall = mockCalls[3];
    const commentBody = JSON.parse(commentCall.options.body);
    assert.equal(commentBody.snippet.topLevelComment.snippet.textOriginal, '테스트 고정 댓글');

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


