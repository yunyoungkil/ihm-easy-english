// 나라별 시청 비율 수집. 2026-11-16.
// 이유: 자막·제목 번역을 할지 정하려면 외국 시청자가 의미 있게 있는지 알아야 하는데, 나라별 데이터를 모은 적이 없었다(영상 defaultLanguage는 전부 ko).
// YouTube Analytics API: dimensions=country, metrics=views,estimatedMinutesWatched (실제 확인 2026-11-16: 응답 행은 [나라 코드, views, estimatedMinutesWatched]).
// 쇼츠/롱폼을 나누는 filters=creatorContentType==SHORTS(또는 VIDEO_ON_DEMAND)는 country 차원에서 HTTP 400(잘못된 값)이라 쓰지 않는다. 채널 전체만 받는다.
// 기간은 최근 28일·90일. 7일마다 새로 받는다. 우리 채널 읽기 전용 호출이고 새 액세스 토큰은 메모리에서만 쓴다.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {accessTokenFromDisk} from './retention-curves.mjs';

const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'youtube');
export const countriesPath = join(dataDir, 'audience-countries.json');
export const COUNTRIES_REFRESH_DAYS = 7; // allow-literal: 나라별 비율을 다시 받는 간격
export const COUNTRY_PERIODS = [{key: '28d', days: 28}, {key: '90d', days: 90}]; // allow-literal: 보는 기간(일)
const DAY_MS = 86400000; // allow-literal: 하루(ms)
const HOME_COUNTRY = 'KR'; // 우리 시청자는 한국 거주 3060이라고 알고 있다. 이 값이 실제로 맞는지 데이터로 본다.
const TOP_COUNTRIES = 3; // allow-literal: 요약에 보여 줄 상위 나라 수

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/** 기간 계산: 끝은 어제, 시작은 끝에서 days-1일 전(어제 포함 days일). */
export function periodWindow(now, days) {
  const end = new Date(now).getTime() - DAY_MS;
  return {startDate: isoDay(end - (days - 1) * DAY_MS), endDate: isoDay(end)};
}

/** API 응답 → 저장 모양. 칸 위치는 columnHeaders 이름으로 찾는다(짐작하지 않는다). 점유율은 여기서 계산한다. */
export function buildPeriod({startDate, endDate, response}) {
  const headers = (response?.columnHeaders || []).map((h) => h.name);
  const idx = {country: headers.indexOf('country'), views: headers.indexOf('views'), minutes: headers.indexOf('estimatedMinutesWatched')};
  if (Object.values(idx).some((i) => i < 0)) throw new Error(`응답에 country/views/estimatedMinutesWatched 칸이 없다: ${headers.join(',') || '(칸 없음)'}`);
  const raw = (response.rows || []).map((r) => ({country: String(r[idx.country]), views: Number(r[idx.views]), minutes: Number(r[idx.minutes])}))
    .filter((r) => r.country && Number.isFinite(r.views) && Number.isFinite(r.minutes));
  const totalViews = raw.reduce((s, r) => s + r.views, 0);
  const totalMinutes = raw.reduce((s, r) => s + r.minutes, 0);
  const share = (n, total) => (total > 0 ? Number((n / total).toFixed(4)) : null); // allow-literal: 소수 넷째 자리까지 저장
  const rows = raw.sort((a, b) => b.views - a.views || a.country.localeCompare(b.country))
    .map((r) => ({...r, viewsShare: share(r.views, totalViews), minutesShare: share(r.minutes, totalMinutes)}));
  const period = {startDate, endDate, totalViews, totalMinutes, rows};
  if (!rows.length) period.emptyReason = '그 기간 나라별 조회 행이 없다(API가 빈 결과를 줌)';
  return period;
}

/** 7일이 안 지났고 두 기간이 다 있으면 다시 받지 않는다. */
export function needsRefresh(store, now = new Date(), {force = false} = {}) {
  if (force) return true;
  if (!store?.fetchedAt || !store.periods) return true;
  if (!COUNTRY_PERIODS.every((p) => store.periods[p.key])) return true;
  return new Date(now) - new Date(store.fetchedAt) >= COUNTRIES_REFRESH_DAYS * DAY_MS;
}

/** 한 기간 요약: 한국 비율, 그 외 비율, 상위 나라. 데이터가 없으면 null(측정 전). */
export function summarizePeriod(period) {
  if (!period?.rows?.length || !(period.totalViews > 0)) return null;
  const home = period.rows.find((r) => r.country === HOME_COUNTRY);
  const homeShare = home?.viewsShare ?? 0;
  return {
    startDate: period.startDate, endDate: period.endDate, totalViews: period.totalViews,
    homeCountry: HOME_COUNTRY, homeShare, otherShare: Number((1 - homeShare).toFixed(4)), // allow-literal: 소수 넷째 자리까지
    top: period.rows.slice(0, TOP_COUNTRIES).map((r) => ({country: r.country, views: r.views, viewsShare: r.viewsShare})),
  };
}

export async function fetchCountryReport({startDate, endDate, accessToken, fetchImpl = fetch}) {
  const params = new URLSearchParams({
    ids: 'channel==MINE', startDate, endDate, dimensions: 'country', metrics: 'views,estimatedMinutesWatched', sort: '-views',
  });
  const res = await fetchImpl(`https://youtubeanalytics.googleapis.com/v2/reports?${params}`, {headers: {Authorization: `Bearer ${accessToken}`}});
  const body = await res.json();
  if (!res.ok) throw new Error(`나라별 시청 요청 실패(HTTP ${res.status}): ${String(body.error?.message || '').slice(0, 120)}`);
  return body;
}

export async function collectAudienceCountries({now = new Date(), accessToken = null, fetchImpl = fetch, path = countriesPath, force = false} = {}) {
  const store = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')) : null;
  if (!needsRefresh(store, now, {force})) return {refreshed: false, periods: Object.keys(store.periods), fetchedAt: store.fetchedAt};
  const token = accessToken || await accessTokenFromDisk();
  const periods = {};
  for (const {key, days} of COUNTRY_PERIODS) {
    const w = periodWindow(now, days);
    periods[key] = buildPeriod({...w, response: await fetchCountryReport({...w, accessToken: token, fetchImpl})});
  }
  const out = {schemaVersion: 1, fetchedAt: new Date(now).toISOString(), periods};
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
  return {refreshed: true, periods: Object.keys(periods), fetchedAt: out.fetchedAt};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await collectAudienceCountries({force: process.argv.includes('--force')});
  console.log(`나라별 시청: ${r.refreshed ? '새로 받음' : '7일이 안 지나 건너뜀'} (${r.fetchedAt})`);
  const store = JSON.parse(readFileSync(countriesPath, 'utf8'));
  for (const [key, p] of Object.entries(store.periods)) {
    console.log(`  ${key} ${p.startDate}~${p.endDate} 총 조회 ${p.totalViews}회, 총 시청 ${p.totalMinutes}분${p.emptyReason ? ` (${p.emptyReason})` : ''}`);
    p.rows.slice(0, 5).forEach((row) => console.log(`    ${row.country} ${row.views}회 ${(row.viewsShare * 100).toFixed(1)}%`));
  }
}
