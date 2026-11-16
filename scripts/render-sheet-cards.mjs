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
import {sheetsDir} from './transform-sheet.mjs';

const DEBUG_PORT = 9222;

export async function renderSheetCards(videoId) {
  const sheetPath = join(sheetsDir, `${videoId}.json`);
  if (!existsSync(sheetPath)) throw new Error(`비교 시트가 없다: ${videoId}`);
  const sheet = JSON.parse(readFileSync(sheetPath, 'utf8'));
  const cuts = sheet.rows?.find((r) => r.key === 'visual')?.ours?.cutPlan?.cuts || [];
  if (!cuts.length) throw new Error('시트에 컷 계획(cuts)이 없다');
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const page = await browser.contexts()[0].newPage();
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
 * 2안 컷 카드(rows[visual].ours.cutPlan2)를 768×1376 실제 크기로 만들고, 만든 직후 코드로 잰다(2026-11-16 설계서 7절):
 * 넘침(화면·카드), 최소 글자 크기(CARD2.minFontPx), 위 훅 띠 글자 폭, 아래·위 띠 안전 자리. 위반이 있으면 이미지는 만들되 목록을 돌려준다.
 */
export async function renderSheetCards2(videoId, {onlyIndexes = null} = {}) {
  const sheetPath = join(sheetsDir, `${videoId}.json`);
  if (!existsSync(sheetPath)) throw new Error(`비교 시트가 없다: ${videoId}`);
  const sheet = JSON.parse(readFileSync(sheetPath, 'utf8'));
  const plan2 = sheet.rows?.find((r) => r.key === 'visual')?.ours?.cutPlan2;
  if (!plan2?.cuts?.length) throw new Error('시트에 2안 컷 계획(cutPlan2)이 없다');
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const page = await browser.contexts()[0].newPage();
  const made = [];
  const problems = [];
  try {
    await page.setViewportSize({width: CARD2.width, height: CARD2.height});
    for (const [idx, cut] of plan2.cuts.entries()) {
      if (onlyIndexes && !onlyIndexes.includes(idx)) continue;
      if (!cut.image) throw new Error(`2안 ${cut.t}초 컷에 image 경로가 없다`);
      let picData = '';
      if (cut.pic) {
        const picPath = join(sheetsDir, cut.pic);
        if (!existsSync(picPath)) throw new Error(`2안 ${cut.t}초 컷 그림이 없다: ${cut.pic}`);
        picData = `data:image/${cut.pic.endsWith('.png') ? 'png' : 'jpeg'};base64,${readFileSync(picPath).toString('base64')}`;
      }
      await page.setContent(renderCard2Html({...cut, picData}, plan2));
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
          const label = n.textContent.trim().slice(0, 12);
          if (fs < minFont) out.push('글자가 작다(' + fs + 'px < ' + minFont + 'px): ' + label);
          const hk = el.closest('.hk');
          if (hk) { const w = hk.querySelector('.hkt').getBoundingClientRect().width; if (w > 640) out.push('훅 줄이 너무 길다(' + Math.round(w) + 'px): ' + label); }
          const inBand = r.top >= botTop || r.bottom <= topH;
          if (!inBand && (r.top < safeTop || r.bottom > safeBottom)) out.push('가림 자리를 침범: ' + label);
          if (!hk && r.top > 560 && r.top < safeBottom && r.right > safeRightX + 8) out.push('오른쪽 버튼 줄(x>' + safeRightX + ')을 침범: ' + label + ' (오른쪽 끝 ' + Math.round(r.right) + ')');
          if (r.bottom > safeBottom && r.top >= botTop && !el.closest('.dots')) out.push('아래 띠 맨 아래(y>' + safeBottom + ')에 글자: ' + label);
        }
        return out;
      }, {W: CARD2.width, H: CARD2.height, minFont: CARD2.minFontPx, topH: CARD2.topBandHeight, botTop: CARD2.bottomBandTop, safeTop: CARD2.safeTop, safeBottom: CARD2.safeBottom, safeRightX: CARD2.safeRightX});
      for (const m of found) problems.push(idx + '번 컷(' + cut.t + '초, ' + cut.template + '): ' + m);
      const out = join(sheetsDir, cut.image);
      mkdirSync(dirname(out), {recursive: true});
      await page.screenshot({path: out, type: 'png', clip: {x: 0, y: 0, width: CARD2.width, height: CARD2.height}});
      made.push(cut.image);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return {made, problems};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    if (process.argv.includes('--v2')) {
      const {made, problems} = await renderSheetCards2(process.argv[2]);
      console.log(`2안 컷 카드 ${made.length}장을 만들었습니다.`);
      if (problems.length) { console.log(`점검에 걸린 것 ${problems.length}개:`); for (const p of problems) console.log(`- ${p}`); process.exitCode = 2; }
      else console.log('점검: 넘침·최소 글자·훅 폭·가림 자리 모두 통과');
    } else {
      const made = await renderSheetCards(process.argv[2]);
      console.log(`컷 카드 ${made.length}장을 만들었습니다.`);
    }
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
