import test from 'node:test';
import assert from 'node:assert/strict';
import {packageStatusLabel} from '../upload-package-summary.mjs';

test('예약된 패키지는 예약 날짜와 시각(한국 시간)을 보여 준다', () => {
  assert.equal(packageStatusLabel({status: 'scheduled', scheduledFor: '2026-11-10T11:00:00Z'}), '예약 · 11/10(화) 20:00');
});

test('쇼츠가 아직 예약 전이어도 공개 예정일이 있으면 같이 보여 준다', () => {
  assert.equal(packageStatusLabel({status: 'packaged', plannedFor: '2026-11-14T11:00:00Z'}), '패키징 완료 · 예정 11/14(토) 20:00');
});

test('예정일도 예약도 없으면 패키징 완료만 보여 준다', () => {
  assert.equal(packageStatusLabel({status: 'packaged'}), '패키징 완료');
  assert.equal(packageStatusLabel({}), '패키징 완료');
});

test('예약이 잡히면 예정일보다 실제 예약을 우선한다', () => {
  assert.equal(packageStatusLabel({status: 'scheduled', scheduledFor: '2026-11-14T11:00:00Z', plannedFor: '2026-11-15T11:00:00Z'}), '예약 · 11/14(토) 20:00');
});

test('롱폼 업로드 대기는 예약 권장 날짜를 보여 준다', () => {
  assert.equal(packageStatusLabel({status: 'ready_to_upload', scheduledFor: '2026-11-16T14:00:00Z'}), '업로드 대기 · 예약 권장: 11/16(월) 23:00 KST');
});

test('공개된 패키지는 공개됨이다', () => {
  assert.equal(packageStatusLabel({status: 'published', scheduledFor: '2026-11-09T14:00:00Z'}), '공개됨');
});

test('날짜가 깨져 있으면 날짜 없이 상태만 보여 준다', () => {
  assert.equal(packageStatusLabel({status: 'scheduled', scheduledFor: 'nonsense'}), '예약됨');
  assert.equal(packageStatusLabel({status: 'ready_to_upload', scheduledFor: 'nonsense'}), '업로드 대기');
});
