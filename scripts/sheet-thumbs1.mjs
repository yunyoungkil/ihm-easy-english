// 비교 시트 1안 썸네일 중 낱말이 들어간 3장(C·D·F)을 다시 만든다(2026-11-16: "마디" → "박자"로 낱말을 바꿨을 때 1안도 같은 낱말로 맞추려고).
// 1안은 위·아래 띠가 없어 쇼츠 규칙(위 훅 띠·아래 정보 띠)을 어기므로 비교용으로만 남긴다. 기준안은 2안(scripts/sheet-thumbs2.mjs).
// 사용: node scripts/sheet-thumbs1.mjs <원본 영상ID>   (자동화용 크롬 9222에 붙는다)
import {chromium} from 'playwright-core';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sheetsDir} from './transform-sheet.mjs';

const CSS = `html{zoom:2}*{box-sizing:border-box;margin:0}
body{width:384px;height:688px;background:#F4EFE6;font-family:"Malgun Gothic",sans-serif;color:#000;display:flex;align-items:center;justify-content:center}
.wrap{width:352px;display:flex;flex-direction:column;align-items:center;gap:16px}
.pill{background:#F5C518;border:4px solid #000;border-radius:44px;box-shadow:5px 5px 0 #000;padding:12px 24px;font:900 36px/1.1 "Malgun Gothic",sans-serif;white-space:nowrap}
.hl{background:#ff9f43;border-radius:8px;padding:0 6px}
.word{background:#F5C518;border:5px solid #000;border-radius:18px;box-shadow:7px 7px 0 #000;padding:6px 26px}.word span{font:900 56px/1 "Arial Black",Arial,sans-serif}
.cell{position:relative}.cell img{width:100%;aspect-ratio:1;object-fit:cover;border:4px solid #000;border-radius:14px;box-shadow:4px 4px 0 #000}
.cell span{position:absolute;left:8px;bottom:8px;background:#F5C518;border:3px solid #000;border-radius:10px;padding:2px 10px;font:900 24px/1.2 "Arial Black",Arial,sans-serif}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:340px}
.yellow{background:#fff;border:5px solid #000;border-radius:18px;box-shadow:7px 7px 0 #000;padding:12px 24px}.big{font:900 76px/1 "Arial Black",Arial,sans-serif;letter-spacing:-2px}`;
const uri = (dir, name) => `data:image/jpeg;base64,${readFileSync(join(dir, name)).toString('base64')}`;
const WORDS = ['stress', 'screen', 'spray', 'strike'];

export async function renderSheetThumbs1(videoId) {
  const dir = join(sheetsDir, 'images', videoId);
  const designs = {
    C: `<body><div class="wrap"><div class="pill" style="font-size:44px">Q. 몇 박자?</div>${WORDS.map((w) => `<div class="word"><span><span class="hl">${w.slice(0, 3)}</span>${w.slice(3)}</span></div>`).join('')}</div></body>`,
    D: `<body style="background:#F4EFE6 url(${uri(dir, 'thumb-D-base.jpg')}) center/cover;position:relative;overflow:hidden"><div style="position:absolute;top:56px;left:0;right:0;display:flex;flex-direction:column;align-items:center;gap:16px"><div class="yellow"><span class="big">stress</span></div><div class="pill">한 박자?</div></div></body>`,
    F: `<body><div class="wrap"><div class="pill" style="font-size:44px">몇 박자?</div><div class="grid">${WORDS.map((w) => `<div class="cell"><img src="${uri(dir, `pic-${w}.jpg`)}"><span>${w}</span></div>`).join('')}</div></div></body>`,
  };
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.contexts()[0].newPage();
  const made = [];
  try {
    await page.setViewportSize({width: 768, height: 1376});
    for (const [k, html] of Object.entries(designs)) {
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${html}`);
      await page.waitForTimeout(400);
      await page.screenshot({path: join(dir, `thumb-${k}.jpg`), type: 'jpeg', quality: 92});
      made.push(k);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return made;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    console.log(`1안 썸네일 ${(await renderSheetThumbs1(process.argv[2])).join('·')}를 다시 만들었습니다.`);
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
