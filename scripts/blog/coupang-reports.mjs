// 쿠팡 블로그(tech.d40m.com) 쿠팡 파트너스 실적 수집(2026-11-27, 12/24 4주 점검 준비).
// - 최근 28일(어제까지, 한국 날짜): 날짜×채널(subId)별 클릭·주문·취소·판매 금액·수수료(commission 보고서),
//   블로그 채널(techd40m)로 팔린 상품 줄(orders 보고서).
// - 계정 전체 합계도 같이 적는다(블로그 전부터 쓰던 링크는 subId가 비어 있다, 2026-11-27 실측).
// - 쿠팡이 준 숫자만 쓴다. 쿠팡은 매일 15시에 전날까지 갱신하므로 오늘은 넣지 않는다.
// 저장: output/blog/private/coupang-reports.json. 저장소가 공개라 git에 올리지 않고 구글 드라이브로만 두 PC가 나눈다
// (pc-sync.mjs SYNC_ROOTS, 2026-11-27 사용자 결정). 무인 실행(tech-run)이 끝날 때 자동으로 부르고, 손으로는 `collect`.
// 호출 수: 한 번 수집에 보통 2번(쪽이 넘치면 더). 한 시간에 많이 부르면 막힌다는 안내가 있어 반복 호출하지 않는다.

import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TECH_SUB_ID, fetchReport} from './coupang-partners.mjs';

export const OUT_REL = 'output/blog/private/coupang-reports.json';
const RANGE_DAYS = 28; // allow-literal: 서치 콘솔 수집과 같은 28일로 맞춰 나란히 본다
const PAGE_ROWS = 1000; // allow-literal: 쿠팡 보고서 한 쪽 최대 줄 수
const MAX_PAGES = 5; // allow-literal: 쪽 넘김 상한(호출 한도 보호)
const DAY_MS = 86_400_000; // allow-literal: 하루 밀리초
const KST_MS = 9 * 3_600_000; // allow-literal: 한국 시간 +9시간

const kstYmd = (ms) => new Date(ms + KST_MS).toISOString().slice(0, 10).replaceAll('-', ''); // allow-literal: YYYY-MM-DD 길이
const dashed = (ymd) => `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`; // allow-literal: yyyyMMdd 자르기

/** 최근 28일, 어제까지(한국 날짜, 쿠팡 형식 yyyyMMdd). */
export function rangeFor(now) {
  const t = typeof now === 'number' ? now : new Date(now ?? Date.now()).getTime();
  const end = t - DAY_MS;
  return {startDate: kstYmd(end - (RANGE_DAYS - 1) * DAY_MS), endDate: kstYmd(end)};
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const won = (v) => Math.round(v);

/** commission 보고서 줄을 합친다. 쿠팡이 준 칸(click·order·cancel·gmv·commission)만 더한다. */
export function sumDaily(rows) {
  const t = {clicks: 0, orders: 0, cancels: 0, gmv: 0, commission: 0};
  for (const r of rows || []) {
    t.clicks += num(r.click);
    t.orders += num(r.order);
    t.cancels += num(r.cancel);
    t.gmv += num(r.gmv);
    t.commission += num(r.commission);
  }
  return {...t, gmv: won(t.gmv), commission: won(t.commission)};
}

/** 블로그 채널로 팔린 상품을 상품 이름별로 묶는다(주문 번호는 남기지 않는다). */
export function summarizeProducts(orderRows) {
  const by = new Map();
  for (const r of orderRows || []) {
    const key = String(r.productId ?? r.productName ?? '');
    const cur = by.get(key) || {productId: r.productId ?? null, productName: r.productName ?? '', categoryName: r.categoryName ?? '', quantity: 0, gmv: 0, commission: 0, dates: []};
    cur.quantity += num(r.quantity);
    cur.gmv += num(r.gmv);
    cur.commission += num(r.commission);
    if (r.date && !cur.dates.includes(r.date)) cur.dates.push(r.date);
    by.set(key, cur);
  }
  return [...by.values()]
    .map((p) => ({...p, gmv: won(p.gmv), commission: won(p.commission)}))
    .sort((a, b) => b.commission - a.commission);
}

async function fetchAllPages(name, range, deps) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const part = await deps.fetchReport(name, {...range, page, fetchImpl: deps.fetchImpl, projectDir: deps.projectDir});
    rows.push(...part);
    if (part.length < PAGE_ROWS) break;
  }
  return rows;
}

/** 수집해서 output/blog/private/coupang-reports.json에 쓰고 결과를 돌려준다. */
export async function collectCoupangReports({
  projectDir = process.cwd(),
  now = Date.now(),
  fetchImpl = globalThis.fetch,
  fetchReportImpl = fetchReport,
  subId = TECH_SUB_ID,
} = {}) {
  const range = rangeFor(now);
  const deps = {fetchReport: fetchReportImpl, fetchImpl, projectDir};
  const daily = await fetchAllPages('commission', range, deps);
  const orders = await fetchAllPages('orders', range, deps);

  const blogDaily = daily.filter((r) => r?.subId === subId);
  const blogOrders = orders.filter((r) => r?.subId === subId);
  const otherSubIds = [...new Set(daily.map((r) => r?.subId ?? '').filter((s) => s !== subId))];

  const result = {
    collectedAt: new Date(now).toISOString(),
    source: 'coupang-partners-reports',
    range: {startDate: dashed(range.startDate), endDate: dashed(range.endDate)},
    subId,
    blog: {
      totals: sumDaily(blogDaily),
      daily: blogDaily.map((r) => ({date: r.date, clicks: num(r.click), orders: num(r.order), cancels: num(r.cancel), gmv: won(num(r.gmv)), commission: won(num(r.commission))})),
      products: summarizeProducts(blogOrders),
    },
    account: {totals: sumDaily(daily), otherSubIds},
  };
  const outPath = path.join(projectDir, ...OUT_REL.split('/'));
  await mkdir(path.dirname(outPath), {recursive: true});
  await writeFile(outPath, `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] !== 'collect') {
      console.log('사용법: node scripts/blog/coupang-reports.mjs collect');
    } else {
      const r = await collectCoupangReports();
      const b = r.blog.totals;
      const a = r.account.totals;
      console.log(`기간 ${r.range.startDate}~${r.range.endDate}`);
      console.log(`블로그(${r.subId}) 클릭 ${b.clicks} · 주문 ${b.orders} · 취소 ${b.cancels} · 판매 ${b.gmv}원 · 수수료 ${b.commission}원`);
      console.log(`계정 전체 클릭 ${a.clicks} · 주문 ${a.orders} · 취소 ${a.cancels} · 판매 ${a.gmv}원 · 수수료 ${a.commission}원 (다른 채널: ${r.account.otherSubIds.map((s) => s || '(표시 없음)').join(', ') || '없음'})`);
      for (const p of r.blog.products.slice(0, 10)) console.log(`- ${p.productName} | ${p.quantity}개 · 수수료 ${p.commission}원`); // allow-literal: 보여 줄 줄 수
    }
  } catch (err) {
    console.error(`쿠팡 실적 수집 실패(${err.code || 'error'}): ${err.message}`);
    process.exitCode = 1;
  }
}
