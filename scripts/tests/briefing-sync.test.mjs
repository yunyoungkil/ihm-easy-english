// 대화 시작 때 마지막 동기화가 30분보다 오래됐으면 대시보드 동기화를 부르는지 확인한다(2026-11-09 사용자 결정, 2026-11-20 30분 단축).
import assert from 'node:assert/strict';
import test from 'node:test';
import {syncIfStale, syncStudioMetricsIfStale} from '../briefing-sync.mjs';

const NOW = new Date('2026-11-09T12:00:00+09:00');
const okResponse = {ok: true, status: 200};
const fakeFetch = (handlers) => {
  const calls = [];
  const fn = async (url, options = {}) => {
    calls.push({url, method: options.method || 'GET'});
    const handler = handlers[options.method || 'GET'];
    if (handler instanceof Error) throw handler;
    return handler;
  };
  fn.calls = calls;
  return fn;
};

test('30분 안에 동기화했으면 아무것도 부르지 않는다', async () => {
  const fetch = fakeFetch({});
  const note = await syncIfStale({now: NOW, readSyncedAt: async () => '2026-11-09T11:50:00+09:00', fetch});
  assert.match(note, /생략/);
  assert.equal(fetch.calls.length, 0);
});

test('대시보드가 꺼져 있으면 동기화하지 못했다고 알린다', async () => {
  const fetch = fakeFetch({GET: new TypeError('fetch failed')});
  const note = await syncIfStale({now: NOW, readSyncedAt: async () => '2026-11-07T21:00:00+09:00', fetch});
  assert.match(note, /대시보드가 꺼져/);
  assert.equal(fetch.calls.filter((c) => c.method === 'POST').length, 0);
});

test('오래됐고 대시보드가 켜져 있으면 동기화를 부른다', async () => {
  const fetch = fakeFetch({GET: okResponse, POST: okResponse});
  const note = await syncIfStale({now: NOW, readSyncedAt: async () => null, fetch});
  assert.match(note, /방금 동기화함/);
  assert.deepEqual(fetch.calls.map((c) => `${c.method} ${new URL(c.url).pathname}`), ['GET /', 'POST /api/sync']);
});

test('동기화가 오래 걸리면 기다리지 않고 마지막 값을 쓴다고 알린다', async () => {
  const timeout = new Error('timed out');
  timeout.name = 'TimeoutError';
  const fetch = fakeFetch({GET: okResponse, POST: timeout});
  const note = await syncIfStale({now: NOW, readSyncedAt: async () => null, fetch});
  assert.match(note, /기다리지 않음/);
});

test('동기화가 실패하면 상태 코드와 함께 알린다', async () => {
  const fetch = fakeFetch({GET: okResponse, POST: {ok: false, status: 401}});
  const note = await syncIfStale({now: NOW, readSyncedAt: async () => null, fetch});
  assert.match(note, /동기화 실패\(401\)/);
});

test('스튜디오 지표가 6시간 안에 수집됐으면 생략한다', async () => {
  let called = 0;
  const note = await syncStudioMetricsIfStale({
    now: NOW,
    readFetchedAt: async () => '2026-11-09T08:00:00+09:00',
    collect: async () => { called += 1; },
  });
  assert.match(note, /생략/);
  assert.equal(called, 0);
});

test('스튜디오 지표가 6시간 넘게 오래됐으면 새로 수집한다', async () => {
  let called = 0;
  const note = await syncStudioMetricsIfStale({
    now: NOW,
    readFetchedAt: async () => '2026-11-09T01:00:00+09:00',
    collect: async () => { called += 1; },
  });
  assert.match(note, /방금 스튜디오 지표 수집함/);
  assert.equal(called, 1);
});

test('스튜디오 지표 수집이 실패해도 예외를 던지지 않고 마지막 수집본 안내를 반환한다', async () => {
  const note = await syncStudioMetricsIfStale({
    now: NOW,
    readFetchedAt: async () => null,
    collect: async () => { throw new Error('크롬 로그인 필요'); },
  });
  assert.match(note, /건너뜀\(크롬 로그인 필요\)/);
});

test('스튜디오 지표 수집이 시간 초과하면 마지막 수집본 안내를 반환한다', async () => {
  const note = await syncStudioMetricsIfStale({
    now: NOW,
    timeoutMs: 20,
    readFetchedAt: async () => null,
    collect: () => new Promise(() => {}),
  });
  assert.match(note, /시간 초과/);
});
