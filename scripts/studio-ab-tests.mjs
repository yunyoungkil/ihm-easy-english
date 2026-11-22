import {existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {setupStudioChrome, STUDIO_PORT} from './setup-studio-chrome.mjs';
import {acquireLock} from './studio-export.mjs';
import {OUR_CHANNEL_ID} from './youtube-publisher.mjs';

/**
 * 스튜디오에서 제목·썸네일 A/B 테스트를 건 영상을 읽어 영상마다 기록한다 (2026-11-13 사용자 결정: 권고대로).
 * 두 곳을 본다: ① 콘텐츠 목록의 "A/B 테스트 실행 중 / 완료됨" 표시(지금 걸려 있거나 막 끝난 테스트, 시간이 지나면 사라진다 — 2026-11-13에 두 영상에서 확인)
 * ② 롱폼 편집 화면의 "제목 A/B 테스트" 줄과 "테스트 보고서 보기"(과거에 건 테스트의 흔적, 목록 표시가 사라진 뒤에도 남는다).
 * 제목·썸네일 테스트를 건 영상의 첫 7일 클릭률은 여러 시안이 섞인 값이라, 기준선과 시트 근거에 "시안이 섞인 값"이라고 적는 데 쓴다.
 * 2026-11-22 보강: "테스트 보고서 보기" 팝업을 읽어 테스트 종류(제목/썸네일/묶음), 판정 결과(winner / tie / insufficient_impressions / running),
 * 시안별 제목·시청 시간 점유율(%)·현재 적용 여부, 실행 기간을 함께 기록한다.
 * 읽기 전용이다(스튜디오 값을 바꾸지 않는다 — 보고서 닫기만 수행).
 */
const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const abTestsPath = join(projectDir, 'data', 'youtube', 'studio-ab-tests.json');

/** 목록 탭: 롱폼은 /videos/upload, 쇼츠는 /videos/short (2026-11-13 확인). */
export const LIST_TABS = Object.freeze([{key: 'upload', label: '동영상'}, {key: 'short', label: 'Shorts'}]);
export const SCAN_LIMIT = 12; // allow-literal: 매일 루프가 한 번에 편집 화면을 여는 영상 수(처음 전체 확인은 --all)
const RECENT_DAYS = 14; // allow-literal: 공개 후 이 기간 안의 영상은 하루에 한 번 다시 본다(새 영상에 테스트를 거는 때가 이 기간이다)
const DAY_MS = 86400000; // allow-literal: 하루(ms)
const MAX_PAGES = 10; // allow-literal: 페이지 넘기기 안전 한도(30편씩, 영상 수가 늘어도 무한 반복 방지)
const PAGE_WAIT_MS = 3500; // allow-literal: 다음 페이지 표가 바뀔 때까지 기다리는 시간

export function parseTestLabel(text) {
  const s = String(text || '');
  if (/A\/B 테스트 실행 중/.test(s)) return 'running';
  if (/A\/B 테스트 완료됨/.test(s)) return 'completed';
  return null;
}

/**
 * 편집 화면 글줄에서 테스트 흔적을 읽는다. 목록 표시만으로는 어떤 테스트인지 모른다.
 * 주의: kind "title"은 "제목 A/B 테스트" 줄이 있다는 뜻이고, 제목만 테스트한 경우와 "제목과 썸네일" 묶음 테스트(시안 하나가 썸네일+제목 한 쌍, 최대 3개)를
 * 구분하지 못한다(2026-11-13 확인: 지금 실행 중인 제목과 썸네일 테스트도 편집 화면에는 "제목 A/B 테스트" 한 줄이다). 썸네일만 테스트한 경우의 글줄은 아직 못 봤다.
 */
export function kindFromEditLines(lines) {
  const kinds = new Set();
  for (const raw of lines || []) {
    const l = String(raw).trim();
    if (l.length > 24) continue; // allow-literal: 제목 줄만 보려고 긴 글줄(설명 등)은 건너뛴다
    if (/^제목\s*A\/B 테스트$/.test(l)) kinds.add('title');
    if (/^썸네일\s*(A\/B )?테스트$/.test(l)) kinds.add('thumbnail');
  }
  return [...kinds].sort();
}

/**
 * "테스트 보고서 보기" 팝업의 innerText에서 테스트 종류·판정·시안별 시청 시간 점유율·기간을 뽑는다(2026-11-22 실측 기반).
 * 스튜디오가 실제로 보여 준 값만 적고, 점유율이 '—'이면 null로 둔다(임의 숫자 금지).
 */
export function parseReportDialog(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const headerIdx = lines.findIndex((l) => /A\/B 테스트 보고서|Test\s*&\s*Compare/i.test(l));
  const typeLine = headerIdx > 0 ? lines[headerIdx - 1] : '';
  const kinds = [];
  if (/제목|Title/i.test(typeLine)) kinds.push('title');
  if (/썸네일|Thumbnail/i.test(typeLine)) kinds.push('thumbnail');
  kinds.sort();

  const headline = headerIdx >= 0 && lines[headerIdx + 1] ? lines[headerIdx + 1] : '';
  const periodLine = lines.find((l) => /완료된 테스트|남은 예상 시간|실행되었습니다|테스트가 종료/i.test(l)) || null;

  // 시안 블록은 "시청 시간 점유율" 줄을 끝점으로 끊어 읽는다.
  const shareIndices = [];
  lines.forEach((l, i) => { if (/^시청 시간 점유율$|^Watch time share$/i.test(l)) shareIndices.push(i); });

  const options = [];
  let cursor = headerIdx >= 0 ? headerIdx + 2 : 0;
  for (let idx = 0; idx < shareIndices.length; idx++) {
    const end = shareIndices[idx];
    const nextLimit = idx + 1 < shareIndices.length ? shareIndices[idx + 1] : lines.length;
    const block = lines.slice(cursor, end);
    const tail = lines.slice(end + 1, Math.min(end + 3, nextLimit));
    const shareRaw = block[block.length - 1] || '';
    const pctMatch = shareRaw.match(/(\d+(?:\.\d+)?)\s*%/);
    const watchTimeSharePercent = pctMatch ? Number(pctMatch[1]) : null;
    const isActive = block.some((l) => /이제 모든 시청자에게 표시됨|현재 표시됨|shown to all viewers/i.test(l));
    const hasWinnerBadge = block.some((l) => /^(승자|최고의 옵션|Winner)$/i.test(l)) || tail.some((l) => /^(승자|최고의 옵션|Winner)$/i.test(l));
    // 시안 제목: 길이 표시(7:36), 채널명, 상태 문구, 점유율 수치를 뺀 본문 줄
    const titleLine = block.find((l, bi) =>
      bi < block.length - 1
      && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(l)
      && !/^(이해하면 쉬운 영어|이제 모든 시청자에게 표시됨|이 옵션 설정|승자|최고의 옵션|—|-)$/.test(l)
      && !/^\d+(?:\.\d+)?\s*%$/.test(l)
    ) || null;
    options.push({
      index: idx + 1,
      title: titleLine,
      watchTimeSharePercent,
      isActive,
      isWinner: hasWinnerBadge,
    });
    // 다음 블록 시작점은 "이 옵션 설정" 등 꼬리 버튼 뒤부터
    cursor = end + 1;
    while (cursor < nextLimit && /^(이 옵션 설정|선택됨|적용됨|Set as|승자|최고의 옵션)$/i.test(lines[cursor])) cursor++;
  }

  let outcome = 'unknown';
  if (/테스트 실행 중|Test running/i.test(headline)) outcome = 'running';
  else if (/노출수가 충분하지 않아|결정할 수 없|not enough impressions|couldn't determine/i.test(headline)) outcome = 'insufficient_impressions';
  else if (/비슷한 실적|실적이 같|유사한 실적|same performance|similar/i.test(headline)) outcome = 'tie';
  else if (options.some((o) => o.isWinner) || /승자|최고의 옵션|Winner|outperformed/i.test(headline)) outcome = 'winner';
  else if (options.some((o) => o.watchTimeSharePercent !== null)) {
    const shares = options.map((o) => o.watchTimeSharePercent).filter((n) => n !== null);
    outcome = shares.length >= 2 && Math.max(...shares) > Math.min(...shares) ? 'winner' : 'tie';
  }

  let winnerIndex = options.find((o) => o.isWinner)?.index ?? null;
  if (outcome === 'winner' && winnerIndex === null) {
    let best = null;
    for (const o of options) {
      if (o.watchTimeSharePercent !== null && (best === null || o.watchTimeSharePercent > best.watchTimeSharePercent)) best = o;
    }
    if (best) {
      best.isWinner = true;
      winnerIndex = best.index;
    }
  }

  return {
    kinds,
    headline: headline || null,
    outcome,
    winnerIndex,
    options,
    periodText: periodLine,
  };
}

/**
 * 읽은 결과(observed: [{videoId, state}])를 저장본에 합친다.
 * - 새로 보이면 firstSeenAt을 적는다(테스트 시작일이 아니다. 시작일은 스튜디오가 목록에 보여 주지 않는다).
 * - 표시가 사라져도(완료 표시가 일정 기간 뒤 없어질 수 있다) 이미 기록한 상태는 지우지 않는다. "테스트를 건 적이 있다"는 사실은 남는다.
 * - 실행 중 → 완료됨은 바꾸고, 완료됨 → 실행 중(같은 영상에 새 테스트)도 따른다.
 */
export function mergeAbTests(store, observed, now = new Date()) {
  const out = {...store, videos: {...(store?.videos || {})}};
  for (const {videoId, state} of observed) {
    if (!videoId || !state) continue;
    const prev = out.videos[videoId];
    out.videos[videoId] = {...prev, state, firstSeenAt: prev?.firstSeenAt || now.toISOString(), lastSeenAt: now.toISOString()};
  }
  return out;
}

/**
 * 편집 화면을 읽은 결과를 합친다. 테스트 흔적이 있으면 영상 기록(videos)에 넣고(목록 표시가 사라졌어도 completed로), 없으면 읽었다는 사실만 scanned에 남긴다.
 * kindOrScan은 기존 배열(['title']) 또는 { kind, report } 객체를 받는다.
 */
export function applyEditScan(store, videoId, kindOrScan, now = new Date()) {
  const out = {...store, videos: {...(store?.videos || {})}, scanned: {...(store?.scanned || {})}};
  const kind = Array.isArray(kindOrScan) ? kindOrScan : (kindOrScan?.kind || []);
  const report = Array.isArray(kindOrScan) ? null : (kindOrScan?.report || null);
  const mergedKind = [...new Set([...(out.videos[videoId]?.kind || []), ...kind, ...(report?.kinds || [])])].sort();
  const hasTest = mergedKind.length > 0 || Boolean(report);
  out.scanned[videoId] = {at: now.toISOString(), hasTest, reportChecked: true};
  const prev = out.videos[videoId];
  if (hasTest || prev) {
    const next = {
      ...prev,
      state: prev?.state || (report?.outcome === 'running' ? 'running' : 'completed'),
      kind: mergedKind,
      firstSeenAt: prev?.firstSeenAt || now.toISOString(),
      lastSeenAt: prev?.lastSeenAt || now.toISOString(),
    };
    if (report) {
      next.outcome = report.outcome;
      next.winnerIndex = report.winnerIndex;
      next.report = {...report, checkedAt: now.toISOString()};
    }
    out.videos[videoId] = next;
  }
  return out;
}

/** 편집 화면을 열 영상: 롱폼 중 아직 안 읽은 것, 실행 중, 완료됐지만 보고서 미확인, 공개 14일 안에 하루 지난 것. 쇼츠는 읽지 않는다. 새 영상부터. */
export function selectEditScanTargets({store, listed, catalog, now = new Date()}) {
  const byId = new Map((catalog || []).map((v) => [v.videoId, v]));
  const scanned = store?.scanned || {};
  const videos = store?.videos || {};
  const running = new Set((listed || []).filter((x) => x.state === 'running').map((x) => x.videoId));
  const out = [];
  for (const {videoId} of listed || []) {
    const v = byId.get(videoId);
    if (!v || v.format !== 'LONGFORM') continue;
    const last = scanned[videoId]?.at;
    const recent = (now.getTime() - Date.parse(v.publishedAt)) / DAY_MS <= RECENT_DAYS;
    const needsReport = Boolean(videos[videoId]) && !videos[videoId].report && scanned[videoId]?.reportChecked !== true;
    const settledRunning = videos[videoId]?.state === 'completed' && videos[videoId]?.outcome === 'running';
    if (!last || running.has(videoId) || needsReport || settledRunning || (recent && now.getTime() - Date.parse(last) > DAY_MS)) out.push(v);
  }
  return out.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).map((v) => v.videoId);
}

function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), {recursive: true});
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(tmp, path);
}
const readJsonOr = (path, fallback) => { if (!existsSync(path)) return fallback; try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; } };

const listUrl = (tab) => `https://studio.youtube.com/channel/${OUR_CHANNEL_ID}/videos/${tab}`;

/** 목록 탭 하나의 모든 페이지에서 {videoId, state}를 읽는다. 푸터의 "N개 중 a~b"로 전부 읽었는지 확인한다(모자라면 던진다). */
async function readListTab(page, tab) {
  await page.goto(listUrl(tab.key), {waitUntil: 'domcontentloaded'});
  if (page.url().includes('accounts.google.com')) { const e = new Error('Studio-Automation 크롬의 구글 로그인이 풀림'); e.loginNeeded = true; throw e; }
  await page.locator('ytcp-video-row').first().waitFor({timeout: 45000}); // allow-literal: 목록이 뜰 때까지 기다리는 한계
  await page.waitForTimeout(2000); // allow-literal: 행이 다 그려질 때까지
  const seen = new Map();
  let total = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const {rows, footer} = await page.evaluate(() => ({
      footer: (document.querySelector('ytcp-table-footer')?.innerText || '').replace(/\s+/g, ' '),
      rows: [...document.querySelectorAll('ytcp-video-row')].map((r) => ({href: r.querySelector('a[href*="/video/"]')?.getAttribute('href') || '', text: r.innerText})),
    }));
    for (const r of rows) {
      const id = (r.href.match(/\/video\/([A-Za-z0-9_-]{11})\//) || [])[1];
      if (id) seen.set(id, parseTestLabel(r.text));
    }
    const m = footer.match(/(\d+)개 중/);
    if (m) total = Number(m[1]);
    const next = page.getByRole('button', {name: '다음 페이지로 이동'}).first();
    if (!(await next.isVisible().catch(() => false)) || !(await next.isEnabled().catch(() => false))) break;
    await next.click();
    await page.waitForTimeout(PAGE_WAIT_MS);
  }
  if (total !== null && seen.size !== total) throw new Error(`${tab.label} 목록을 ${seen.size}편만 읽음(표시된 전체 ${total}편) — 페이지 넘기기를 확인`);
  return [...seen.entries()].map(([videoId, state]) => ({videoId, state}));
}

/** 편집 화면을 열어 테스트 흔적(제목/썸네일)과 "테스트 보고서 보기" 팝업 내용을 읽는다. */
async function readEditAndReport(page, videoId) {
  await page.goto(`https://studio.youtube.com/video/${videoId}/edit`, {waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(6000); // allow-literal: 편집 화면이 그려질 때까지
  const lines = (await page.evaluate(() => document.body.innerText)).split('\n').filter((l) => l.trim());
  const kind = kindFromEditLines(lines);
  let report = null;
  const reportBtn = page.getByRole('button', {name: /테스트 보고서 보기|View test report/i}).first();
  if (await reportBtn.isVisible().catch(() => false)) {
    await reportBtn.click();
    await page.waitForTimeout(3000); // allow-literal: 보고서 팝업이 그려질 때까지
    const dialogText = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll('tp-yt-paper-dialog, [role="dialog"], ytcp-dialog')]
        .map((el) => ({rect: el.getBoundingClientRect(), text: (el.innerText || '').trim()}))
        .filter((d) => d.rect.width > 200 && d.rect.height > 100 && d.text.length > 20);
      return dialogs.length ? dialogs[dialogs.length - 1].text : '';
    });
    if (dialogText) report = parseReportDialog(dialogText);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600); // allow-literal: 팝업 닫힘 대기
  }
  return {kind, report};
}

export async function collectAbTests({now = new Date(), limit = SCAN_LIMIT} = {}) {
  const chrome = await setupStudioChrome({launchIfDown: true});
  if (!chrome.supported || chrome.login !== 'logged-in') {
    throw new Error(`Studio-Automation 크롬에 채널 소유 계정 로그인이 필요함 (상태: ${chrome.login || chrome.error || chrome.reason})`);
  }
  const release = acquireLock();
  let browser = null, page = null;
  const result = {listed: 0, running: 0, completed: 0, scanned: 0, scanPending: 0};
  try {
    browser = await chromium.connectOverCDP(`http://localhost:${STUDIO_PORT}`);
    page = await browser.contexts()[0].newPage();
    await page.setViewportSize({width: 1700, height: 1000});
    let store = readJsonOr(abTestsPath, {schemaVersion: 1, videos: {}});
    const observed = [];
    for (const tab of LIST_TABS) observed.push(...await readListTab(page, tab));
    result.listed = observed.length;
    store = mergeAbTests(store, observed, now);
    // 롱폼 편집 화면을 열어 과거 테스트 흔적을 읽는다(목록 표시는 시간이 지나면 사라진다). 한 번에 일부씩, 읽은 것은 다시 안 읽는다.
    const catalog = readJsonOr(join(projectDir, 'data', 'youtube', 'catalog.json'), {videos: []}).videos || [];
    const targets = selectEditScanTargets({store, listed: observed, catalog, now});
    result.scanPending = Math.max(0, targets.length - limit);
    for (const id of targets.slice(0, limit)) {
      store = applyEditScan(store, id, await readEditAndReport(page, id), now);
      result.scanned++;
      store.updatedAt = now.toISOString();
      writeJsonAtomic(abTestsPath, store); // 영상마다 저장해 중간에 멈춰도 잃지 않는다
    }
    store.schemaVersion = 1;
    store.channelId = OUR_CHANNEL_ID;
    store.updatedAt = now.toISOString();
    writeJsonAtomic(abTestsPath, store);
    for (const v of Object.values(store.videos)) result[v.state] = (result[v.state] || 0) + 1;
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    release();
  }
  return result;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFile)) {
  const limit = process.argv.includes('--all') ? Infinity : SCAN_LIMIT;
  collectAbTests({limit}).then((r) => console.log(JSON.stringify(r, null, 2))).catch((e) => { console.error(e.message); process.exitCode = 1; });
}
