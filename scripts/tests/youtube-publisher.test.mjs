import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNextPublishSlot,
  sortEpisodePackages,
  isUploadAllowed,
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
