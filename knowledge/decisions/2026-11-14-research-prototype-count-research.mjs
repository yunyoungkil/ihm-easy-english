// 시제품(2026-11-14, 읽기 전용): 스튜디오 "조사" 목록을 스크롤 끝까지 내려 네 목록(롱폼/쇼츠 x 실적 우수/최근 업로드)의 개수·영상 ID를 센다.
// 구현할 때 참고만 한다(설계: knowledge/decisions/2026-11-14-research-source-design-draft.md). 아래 import 경로는 이 PC의 절대 경로라 다른 PC에서는 프로젝트 상대 경로로 바꿔야 한다.
// 실행 예: node <이 파일> <저장할 json 경로>. Studio-Automation 크롬(포트 9223)이 떠 있고 로그인돼 있어야 한다.
// 읽기 전용: 스튜디오 "조사" 목록을 스크롤 끝까지 내려 네 가지(롱폼/쇼츠 x 실적 우수/최근 업로드)의 개수와 영상 ID를 센다.
// 누르는 것은 목록을 바꾸는 칩과 드롭다운뿐이고, "제목 패턴 분석"과 다른 버튼은 누르지 않는다.
import {writeFileSync, readFileSync} from 'node:fs';
import {chromium} from 'file:///C:/Users/yunyo/Downloads/project/node_modules/playwright-core/index.mjs';
import {STUDIO_PORT} from 'file:///C:/Users/yunyo/Downloads/project/scripts/setup-studio-chrome.mjs';
import {OUR_CHANNEL_ID} from 'file:///C:/Users/yunyo/Downloads/project/scripts/youtube-publisher.mjs';

const out = process.argv[2];
const RE = /영어|영단어|english|발음|파닉스|phonics|단어|회화|듣기|리스닝|스피킹|문법|원어민|미드|읽는/i;
const browser = await chromium.connectOverCDP(`http://localhost:${STUDIO_PORT}`);
const page = await browser.contexts()[0].newPage();
await page.setViewportSize({width: 1600, height: 1000});
await page.goto(`https://studio.youtube.com/channel/${OUR_CHANNEL_ID}/analytics/hub_research`, {waitUntil: 'domcontentloaded'});
await page.waitForTimeout(6000);

const extract = () => page.evaluate(() => {
  const rows = new Map();
  for (const a of document.querySelectorAll('a[href*="watch?v="], a[href*="/shorts/"]')) {
    const m = a.href.match(/(?:watch\?v=|\/shorts\/)([A-Za-z0-9_-]{11})/);
    if (!m) continue;
    let el = a;
    for (let i = 0; i < 8 && el && !/조회수/.test(el.innerText || ''); i++) el = el.parentElement;
    if (!el || !/조회수/.test(el.innerText || '')) continue;
    const text = el.innerText.replace(/\s+/g, ' ').trim();
    if (!rows.has(m[1]) || text.length < rows.get(m[1]).text.length) rows.set(m[1], {id: m[1], href: a.href, text});
  }
  return [...rows.values()];
});

async function scrollAll() {
  let last = -1, same = 0;
  for (let i = 0; i < 80 && same < 4; i++) {
    await page.mouse.move(800, 600);
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(1300);
    const n = (await extract()).length;
    if (n === last) same++; else { same = 0; last = n; }
  }
  return last;
}

const parse = (r) => {
  const t = r.text;
  const ratio = Number((t.match(/(\d+(?:\.\d+)?)배/) || [])[1]);
  const sub = t.match(/구독자\s*([\d.]+)\s*(천|만|억)?\s*명/);
  const subs = sub ? Number(sub[1]) * ({천: 1e3, 만: 1e4, 억: 1e8}[sub[2]] || 1) : null;
  return {id: r.id, href: r.href, ratio: Number.isFinite(ratio) ? ratio : null, subs, relevant: RE.test(t), text: t.slice(0, 200)};
};

const result = {};
const combos = [
  {type: '동영상', feed: '실적 우수'},
  {type: '동영상', feed: '최근 업로드'},
  {type: 'Shorts', feed: '실적 우수'},
  {type: 'Shorts', feed: '최근 업로드'},
];
for (const c of combos) {
  const key = `${c.type}|${c.feed}`;
  try {
    // 종류 선택(드롭다운): 현재 칩 글자가 "동영상" 또는 "Shorts"
    const typeChip = page.locator('ytcp-chip').filter({hasText: /^\s*(동영상|Shorts)\s*$/}).first();
    const cur = (await typeChip.innerText()).trim();
    if (cur !== c.type) {
      await typeChip.click();
      await page.waitForTimeout(800);
      await page.getByText(c.type, {exact: true}).last().click();
      await page.waitForTimeout(4000);
    }
    await page.locator('ytcp-chip').filter({hasText: new RegExp(c.feed)}).first().click();
    await page.waitForTimeout(4000);
    const n = await scrollAll();
    const rows = (await extract()).map(parse);
    result[key] = {url: page.url(), count: rows.length, rows};
    console.log(key, 'count', rows.length, 'url', decodeURIComponent(page.url()).slice(-140));
  } catch (e) {
    result[key] = {error: String(e.message).slice(0, 200)};
    console.log(key, 'ERROR', String(e.message).slice(0, 200));
  }
}
writeFileSync(out, JSON.stringify(result, null, 1), 'utf8');
await page.close();
await browser.close().catch(() => {});
