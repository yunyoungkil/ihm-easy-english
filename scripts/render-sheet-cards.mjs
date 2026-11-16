// 비교 시트의 컷 카드를 이미지(PNG)로 만든다(2026-11-12). 카드 틀은 scripts/sheet-card-templates.mjs.
// 시트의 rows[visual].ours.cutPlan.cuts[]마다 한 장씩 768×1376 PNG를 만들어 각 컷의 image 경로에 저장한다.
// 자동화용 크롬(포트 9222)에 붙어서 HTML을 화면에 그린 뒤 캡처한다. 복잡한 그림·썸네일은 scripts/generate-aistudio-image.mjs.
// 사용: node scripts/render-sheet-cards.mjs <원본 영상ID>
import {chromium} from 'playwright-core';
import {mkdirSync, readFileSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderCardHtml} from './sheet-card-templates.mjs';
import {renderCard2Html, CARD2} from './sheet-card-templates2.mjs';
import {renderCard3Html, CARD3} from './sheet-card-templates3.mjs';
import {sheetsDir} from './transform-sheet.mjs';

const DEBUG_PORT = 9222;

/** 포트 9222 크롬에 먼저 붙고, 닫혀 있으면 로컬 Chrome/Chromium을 헤드리스로 열어 렌더한다. */
export async function openRenderBrowser() {
  try {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${DEBUG_PORT}`);
    const page = await browser.contexts()[0].newPage();
    return {browser, page};
  } catch {
    let browser;
    try {
      browser = await chromium.launch({channel: 'chrome', headless: true});
    } catch {
      browser = await chromium.launch({headless: true});
    }
    const page = await browser.newPage();
    return {browser, page};
  }
}

export async function renderSheetCards(videoId) {
  const sheetPath = join(sheetsDir, `${videoId}.json`);
  if (!existsSync(sheetPath)) throw new Error(`비교 시트가 없다: ${videoId}`);
  const sheet = JSON.parse(readFileSync(sheetPath, 'utf8'));
  const cuts = sheet.rows?.find((r) => r.key === 'visual')?.ours?.cutPlan?.cuts || [];
  if (!cuts.length) throw new Error('시트에 컷 계획(cuts)이 없다');
  const {browser, page} = await openRenderBrowser();
  const made = [];
  try {
    await page.setViewportSize({width: 768, height: 1376});
    for (const cut of cuts) {
      if (!cut.image) throw new Error(`${cut.t}초 컷에 image 경로가 없다`);
      // 그림이 필요한 카드(cut.pic)는 파일을 읽어 data 주소로 넣는다(setContent 화면은 파일 경로를 못 읽는다)
      let picData = '';
      if (cut.pic) {
        const picPath = join(sheetsDir, cut.pic);
        if (!existsSync(picPath)) throw new Error(`${cut.t}초 컷 그림이 없다: ${cut.pic}`);
        picData = `data:image/${cut.pic.endsWith('.png') ? 'png' : 'jpeg'};base64,${readFileSync(picPath).toString('base64')}`;
      }
      await page.setContent(renderCardHtml({...cut, picData}));
      await page.waitForTimeout(150);
      const out = join(sheetsDir, cut.image);
      mkdirSync(dirname(out), {recursive: true});
      await page.screenshot({path: out, type: 'png'});
      made.push(cut.image);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return made;
}

/**
 * 2안·3안 컷 카드(cutPlan2 / cutPlan3)를 768×1376 실제 크기로 만들고, 만든 직후 코드로 잰다:
 * 넘침(화면·카드), 최소 글자 크기(minFontPx), 위 훅 띠 글자 폭, 아래·위 띠 안전 자리. 위반이 있으면 이미지는 만들되 목록을 돌려준다.
 */
async function renderVersionedSheetCards(videoId, {planKey, label, renderHtml, cardMetrics, onlyIndexes = null}) {
  const sheetPath = join(sheetsDir, `${videoId}.json`);
  if (!existsSync(sheetPath)) throw new Error(`비교 시트가 없다: ${videoId}`);
  const sheet = JSON.parse(readFileSync(sheetPath, 'utf8'));
  const plan = sheet.rows?.find((r) => r.key === 'visual')?.ours?.[planKey];
  if (!plan?.cuts?.length) throw new Error(`시트에 ${label} 컷 계획(${planKey})이 없다`);
  const {browser, page} = await openRenderBrowser();
  const made = [];
  const problems = [];
  try {
    await page.setViewportSize({width: cardMetrics.width, height: cardMetrics.height});
    for (const [idx, cut] of plan.cuts.entries()) {
      if (onlyIndexes && !onlyIndexes.includes(idx)) continue;
      if (!cut.image) throw new Error(`${label} ${cut.t}초 컷에 image 경로가 없다`);
      let picData = '';
      if (cut.pic) {
        const picPath = join(sheetsDir, cut.pic);
        if (!existsSync(picPath)) throw new Error(`${label} ${cut.t}초 컷 그림이 없다: ${cut.pic}`);
        picData = `data:image/${cut.pic.endsWith('.png') ? 'png' : 'jpeg'};base64,${readFileSync(picPath).toString('base64')}`;
      }
      await page.setContent(renderHtml({...cut, picData}, plan));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);
      const found = await page.evaluate(({W, H, minFont, topH, botTop, safeTop, safeBottom, safeRightX}) => {
        const out = [];
        const de = document.documentElement;
        if (de.scrollHeight > H || de.scrollWidth > W) out.push('화면 넘침(' + de.scrollWidth + '×' + de.scrollHeight + ')');
        const card = document.querySelector('.card');
        if (card && (card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1)) out.push('카드 안 넘침(' + card.scrollWidth + '×' + card.scrollHeight + ' > ' + card.clientWidth + '×' + card.clientHeight + ')');
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        while (walker.nextNode()) {
          const n = walker.currentNode;
          if (!n.textContent.trim()) continue;
          const el = n.parentElement;
          if (seen.has(el)) continue;
          seen.add(el);
          const fs = parseFloat(getComputedStyle(el).fontSize);
          const r = el.getBoundingClientRect();
          const txtLabel = n.textContent.trim().slice(0, 12);
          if (fs < minFont) out.push('글자가 작다(' + fs + 'px < ' + minFont + 'px): ' + txtLabel);
          const hk = el.closest('.hk');
          if (hk) { const w = hk.querySelector('.hkt').getBoundingClientRect().width; if (w > 640) out.push('훅 줄이 너무 길다(' + Math.round(w) + 'px): ' + txtLabel); }
          const inBand = r.top >= botTop || r.bottom <= topH;
          if (!inBand && (r.top < safeTop || r.bottom > safeBottom)) out.push('가림 자리를 침범: ' + txtLabel);
          if (!hk && r.top > 560 && r.top < safeBottom && r.right > safeRightX + 8) out.push('오른쪽 버튼 줄(x>' + safeRightX + ')을 침범: ' + txtLabel + ' (오른쪽 끝 ' + Math.round(r.right) + ')');
          if (r.bottom > safeBottom && r.top >= botTop && !el.closest('.dots')) out.push('아래 띠 맨 아래(y>' + safeBottom + ')에 글자: ' + txtLabel);
        }
        return out;
      }, {W: cardMetrics.width, H: cardMetrics.height, minFont: cardMetrics.minFontPx, topH: cardMetrics.topBandHeight, botTop: cardMetrics.bottomBandTop, safeTop: cardMetrics.safeTop, safeBottom: cardMetrics.safeBottom, safeRightX: cardMetrics.safeRightX});
      for (const m of found) problems.push(idx + '번 컷(' + cut.t + '초, ' + cut.template + '): ' + m);
      const out = join(sheetsDir, cut.image);
      mkdirSync(dirname(out), {recursive: true});
      await page.screenshot({path: out, type: 'png', clip: {x: 0, y: 0, width: cardMetrics.width, height: cardMetrics.height}});
      made.push(cut.image);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return {made, problems};
}

export async function renderSheetCards2(videoId, opts = {}) {
  return renderVersionedSheetCards(videoId, {
    planKey: 'cutPlan2',
    label: '2안',
    renderHtml: renderCard2Html,
    cardMetrics: CARD2,
    ...opts,
  });
}

export async function renderSheetCards3(videoId, opts = {}) {
  return renderVersionedSheetCards(videoId, {
    planKey: 'cutPlan3',
    label: '3안',
    renderHtml: renderCard3Html,
    cardMetrics: CARD3,
    ...opts,
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const videoId = process.argv.slice(2).find((a) => !a.startsWith('-'));
    const isV3 = process.argv.includes('--v3');
    const isV2 = process.argv.includes('--v2');
    if (isV3 || isV2) {
      const label = isV3 ? '3안' : '2안';
      const {made, problems} = isV3 ? await renderSheetCards3(videoId) : await renderSheetCards2(videoId);
      console.log(`${label} 컷 카드 ${made.length}장을 만들었습니다.`);
      if (problems.length) { console.log(`점검에 걸린 것 ${problems.length}개:`); for (const p of problems) console.log(`- ${p}`); process.exitCode = 2; }
      else console.log('점검: 넘침·최소 글자·훅 폭·가림 자리 모두 통과');
    } else {
      const made = await renderSheetCards(videoId);
      console.log(`컷 카드 ${made.length}장을 만들었습니다.`);
    }
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
