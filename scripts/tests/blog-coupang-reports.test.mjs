import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fetchReport} from '../blog/coupang-partners.mjs';
import {OUT_REL, collectCoupangReports, rangeFor, sumDaily, summarizeProducts} from '../blog/coupang-reports.mjs';

const FAKE_ENV = {COUPANG_PARTNERS_ACCESS_KEY: 'k', COUPANG_PARTNERS_SECRET_KEY: 's'};

test('rangeFor: 한국 날짜로 어제까지 28일(쿠팡은 15시에 전날까지 갱신)', () => {
  // 2026-11-28 01:30 KST → 어제 11/27까지
  assert.deepEqual(rangeFor(Date.parse('2026-11-27T16:30:00Z')), {startDate: '20261031', endDate: '20261127'});
});

test('fetchReport: reports 경로·yyyyMMdd·page로 부르고 data 줄을 그대로 돌려준다', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({url, init});
    return {ok: true, status: 200, json: async () => ({rCode: '0', data: [{date: '20261126', click: 1}]})};
  };
  const rows = await fetchReport('commission', {startDate: '20261030', endDate: '20261126', fetchImpl, env: FAKE_ENV});
  assert.deepEqual(rows, [{date: '20261126', click: 1}]);
  assert.equal(seen[0].url, 'https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/reports/commission?startDate=20261030&endDate=20261126&page=0');
  assert.match(seen[0].init.headers.Authorization, /^CEA algorithm=HmacSHA256, access-key=k, /);
  await assert.rejects(fetchReport('nope', {startDate: '1', endDate: '2', fetchImpl, env: FAKE_ENV}), /모르는 쿠팡 보고서/);
});

test('sumDaily·summarizeProducts: 쿠팡이 준 칸만 더하고 원 단위로 반올림, 취소의 음수 수수료도 그대로 뺀다', () => {
  const t = sumDaily([
    {click: 1, order: 2, cancel: 0, gmv: 10000.000000000, commission: 300.000000000},
    {click: 0, order: 0, cancel: 1, gmv: -5000.000000000, commission: -150.000000000},
  ]);
  assert.deepEqual(t, {clicks: 1, orders: 2, cancels: 1, gmv: 5000, commission: 150});
  const p = summarizeProducts([
    {date: '20261101', productId: 7, productName: '줄자', categoryName: '공구', quantity: 1, gmv: 9000, commission: 270},
    {date: '20261102', productId: 7, productName: '줄자', categoryName: '공구', quantity: 2, gmv: 18000, commission: 540},
    {date: '20261102', productId: 8, productName: '어댑터', categoryName: '디지털', quantity: 1, gmv: 30000, commission: 900},
  ]);
  assert.equal(p[0].productName, '어댑터');
  assert.deepEqual(p[1], {productId: 7, productName: '줄자', categoryName: '공구', quantity: 3, gmv: 27000, commission: 810, dates: ['20261101', '20261102']});
});

test('collectCoupangReports: 블로그 채널(techd40m)과 계정 전체를 나눠 드라이브 공유 폴더에 쓰고, 주문 번호는 남기지 않는다', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'cpr-'));
  try {
    const calls = [];
    const fetchReportImpl = async (name, opts) => {
      calls.push({name, page: opts.page, startDate: opts.startDate, endDate: opts.endDate});
      if (name === 'commission') {
        return [
          {date: '20261120', subId: '', click: 4, order: 3, cancel: 1, gmv: 50000, commission: 1500},
          {date: '20261121', subId: 'techd40m', click: 2, order: 1, cancel: 0, gmv: 12000, commission: 360},
        ];
      }
      return [
        {date: '20261120', subId: '', orderId: 1, productId: 1, productName: '라면', quantity: 1, gmv: 4000, commission: 120},
        {date: '20261121', subId: 'techd40m', orderId: 123456789, productId: 9, productName: '라이트닝 HDMI 어댑터', quantity: 1, gmv: 12000, commission: 360},
      ];
    };
    const r = await collectCoupangReports({projectDir, now: Date.parse('2026-11-27T16:30:00Z'), fetchReportImpl});
    assert.deepEqual(calls.map((c) => `${c.name}:${c.page}`), ['commission:0', 'orders:0']);
    assert.deepEqual(r.range, {startDate: '2026-10-31', endDate: '2026-11-27'});
    assert.deepEqual(r.blog.totals, {clicks: 2, orders: 1, cancels: 0, gmv: 12000, commission: 360});
    assert.deepEqual(r.account.totals, {clicks: 6, orders: 4, cancels: 1, gmv: 62000, commission: 1860});
    assert.deepEqual(r.account.otherSubIds, ['']);
    assert.equal(r.blog.products.length, 1);
    assert.equal(r.blog.products[0].productName, '라이트닝 HDMI 어댑터');
    assert.equal(OUT_REL, 'output/blog/private/coupang-reports.json');
    const saved = await readFile(path.join(projectDir, 'output', 'blog', 'private', 'coupang-reports.json'), 'utf8');
    assert.deepEqual(JSON.parse(saved), r);
    assert.doesNotMatch(saved, /orderId|123456789/);
  } finally {
    await rm(projectDir, {recursive: true, force: true});
  }
});

test('collectCoupangReports: 한 쪽이 1000줄로 꽉 차면 다음 쪽을 부르고, 모자라면 멈춘다', async () => {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), 'cpr-'));
  try {
    const pages = [];
    const fetchReportImpl = async (name, {page}) => {
      pages.push(`${name}:${page}`);
      if (name === 'commission' && page === 0) return Array.from({length: 1000}, () => ({subId: '', click: 1}));
      return [];
    };
    const r = await collectCoupangReports({projectDir, now: Date.parse('2026-11-27T16:30:00Z'), fetchReportImpl});
    assert.deepEqual(pages, ['commission:0', 'commission:1', 'orders:0']);
    assert.equal(r.account.totals.clicks, 1000);
  } finally {
    await rm(projectDir, {recursive: true, force: true});
  }
});

test('pc-sync: 쿠팡 수익 폴더는 드라이브로 나르고, git에는 올리지 않는다(공개 저장소, 2026-11-27)', async () => {
  const {SYNC_ROOTS} = await import('../pc-sync.mjs');
  assert.ok(SYNC_ROOTS.some((r) => r.rel === 'output/blog/private' && r.mediaOnly === false));
  const gitignore = await readFile(path.join(import.meta.dirname, '..', '..', '.gitignore'), 'utf8');
  assert.match(gitignore, /^output\/blog\/private\/$/m);
});
