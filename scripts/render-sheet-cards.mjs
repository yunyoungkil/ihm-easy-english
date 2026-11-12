// 비교 시트의 컷 카드를 이미지(PNG)로 만든다(2026-11-12). 카드 틀은 scripts/sheet-card-templates.mjs.
// 시트의 rows[visual].ours.cutPlan.cuts[]마다 한 장씩 768×1376 PNG를 만들어 각 컷의 image 경로에 저장한다.
// 자동화용 크롬(포트 9222)에 붙어서 HTML을 화면에 그린 뒤 캡처한다. 복잡한 그림·썸네일은 scripts/generate-aistudio-image.mjs.
// 사용: node scripts/render-sheet-cards.mjs <원본 영상ID>
import {chromium} from 'playwright-core';
import {mkdirSync, readFileSync, existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderCardHtml} from './sheet-card-templates.mjs';
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
      await page.setContent(renderCardHtml(cut));
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const made = await renderSheetCards(process.argv[2]);
    console.log(`컷 카드 ${made.length}장을 만들었습니다.`);
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
