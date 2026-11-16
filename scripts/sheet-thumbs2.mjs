// 비교 시트 2안 썸네일 6장(1안 A~F와 같은 칸에서 1:1 비교). 설계서(opus-expert, 2026-11-16) 5절.
// 공통: 위 검은 띠(y 0~360)에 짧은 글 하나(110~150px), 가운데에 큰 물건 하나, 글자는 y 1030 위에만, 강조는 색이 아니라 밝기(#111 바탕 + #F5C518 글자) 차이로.
// 만든 직후 200px 폭 미리보기 기준을 코드로 잰다: 가장 큰 글자 28px 이상·모든 글자 14px 이상(= 768px 기준 108px·54px), 글자 5단어 이하, 글자 아래 끝 y 1030 위.
// 사용: node scripts/sheet-thumbs2.mjs <원본 영상ID>   (자동화용 크롬 9222에 붙는다)
import {chromium} from 'playwright-core';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sheetsDir} from './transform-sheet.mjs';

const W = 768;
const H = 1376;
const CSS = `*{box-sizing:border-box;margin:0}html,body{width:768px;height:1376px}
body{position:relative;overflow:hidden;background:#F4EFE6;font-family:"Noto Sans KR","Malgun Gothic",sans-serif;font-weight:900;color:#111}
.top{position:absolute;left:0;top:0;width:768px;height:360px;background:#111;display:flex;align-items:center;justify-content:center;color:#fff;line-height:1.05;white-space:nowrap;letter-spacing:-2px}
.y{color:#F5C518}
.rev{background:#111;color:#F5C518;padding:0 8px;border-radius:12px}
.ybox{position:absolute;display:flex;align-items:center;justify-content:center;background:#F5C518;border:10px solid #000;border-radius:28px;box-shadow:12px 12px 0 #000;line-height:1;white-space:nowrap;letter-spacing:-3px}
.tile{position:absolute;display:flex;align-items:center;justify-content:center;background:#fff;border:8px solid #000;border-radius:24px;box-shadow:6px 6px 0 #000;line-height:1;width:150px;height:160px;font-size:100px}
.red{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#D7141A;color:#fff;border:8px solid #000;line-height:1;white-space:nowrap}
.pic{position:absolute;object-fit:cover;border:10px solid #000;border-radius:28px;box-shadow:12px 12px 0 #000;background:#F4EFE6}
.row{position:absolute;left:64px;width:640px;height:150px;display:flex;align-items:center;justify-content:center;background:#fff;border:8px solid #000;border-radius:26px;box-shadow:8px 8px 0 #000;font-size:108px;line-height:1;white-space:nowrap}`;

const uri = (dir, name) => `data:image/jpeg;base64,${readFileSync(join(dir, name)).toString('base64')}`;
const rev = (w) => `<span class="rev">${w.slice(0, 3)}</span>${w.slice(3)}`;

export const THUMBS2 = {
  // A 칸 대비: 한글 칸 4개 → 노란 stress + 빨간 원 "1". 가운데 영역(y 400~1300)을 꽉 채운다
  A: () => `<div class="top" style="font-size:130px">몇 칸?</div>${['스', '트', '레', '스'].map((s, i) => `<div class="tile" style="left:${57 + i * 165}px;top:470px;width:156px;height:200px;font-size:120px">${s}</div>`).join('')}<div style="position:absolute;left:0;width:768px;top:700px;text-align:center;font-size:120px;line-height:1">↓</div><div class="ybox" style="left:44px;top:860px;width:680px;height:340px;font-size:210px">${rev('stress')}</div><div class="red" style="left:556px;top:780px;width:170px;height:170px;font-size:120px">1</div>`,
  // B 으 빼기: 금지 표시 안 큰 "으" + 노란 stress
  B: () => `<div class="top" style="font-size:110px">빼면 <span class="y">&nbsp;들려요</span></div><div class="red" style="left:114px;top:420px;width:540px;height:540px;font-size:470px;background:#fff;color:#D7141A;border-color:#D7141A;border-width:24px">으<span style="position:absolute;left:30px;right:30px;top:50%;height:34px;background:#000;transform:rotate(-40deg)"></span></div><div class="ybox" style="left:64px;top:1000px;width:640px;height:230px;font-size:150px">${rev('stress')}</div>`,
  // C 단어 4개: 줄마다 자음 연속 부분 반전
  C: () => `<div class="top" style="font-size:140px;color:#F5C518">몇 마디?</div>${['stress', 'screen', 'spray', 'strike'].map((w, i) => `<div class="row" style="top:${400 + i * 220}px;height:200px;font-size:132px">${rev(w)}</div>`).join('')}`,
  // D 캐릭터: 얼굴을 크게, 위쪽 말풍선 안 stress
  D: (dir) => `<div style="position:absolute;left:0;top:0;width:768px;height:1376px;overflow:hidden"><img src="${uri(dir, 'thumb-D-base.jpg')}" style="position:absolute;left:-90px;top:-210px;width:950px;height:auto" alt=""></div><div class="top" style="font-size:140px">한 마디?</div><div style="position:absolute;left:40px;top:392px;width:600px;height:260px;background:#fff;border:10px solid #000;border-radius:64px;box-shadow:10px 10px 0 #000;display:flex;align-items:center;justify-content:center;font-size:190px;line-height:1;letter-spacing:-3px">stress</div><div style="position:absolute;left:330px;top:640px;width:64px;height:64px;background:#fff;border-right:10px solid #000;border-bottom:10px solid #000;transform:rotate(45deg)"></div>`,
  // E 뜻 그림: 위 띠에 흰 stress + 큰 그림 + 빨간 원 "1마디"
  E: (dir) => `<div class="top" style="font-size:160px">stress</div><img class="pic" src="${uri(dir, 'pic-stress.jpg')}" style="left:44px;top:420px;width:680px;height:680px" alt=""><div class="red" style="left:500px;top:1060px;width:220px;height:220px;font-size:80px">1마디</div>`,
  // F 그림 4장: 2×2, 이름표 없음, 가운데 영역을 꽉 채운다
  F: (dir) => `<div class="top" style="font-size:120px">전부 <span class="y">&nbsp;한 마디?</span></div>${['stress', 'screen', 'spray', 'strike'].map((w, i) => `<img class="pic" src="${uri(dir, `pic-${w}.jpg`)}" style="left:${36 + (i % 2) * 350}px;top:${400 + Math.floor(i / 2) * 450}px;width:340px;height:430px;border-width:8px;border-radius:22px" alt="">`).join('')}`,
};

/** 6장을 만들고 200px 미리보기 기준을 잰다. 돌려주는 값: {made, problems} */
export async function renderSheetThumbs2(videoId, {keys = Object.keys(THUMBS2)} = {}) {
  const dir = join(sheetsDir, 'images', videoId);
  if (!existsSync(dir)) throw new Error(`이미지 폴더가 없다: ${dir}`);
  mkdirSync(dir, {recursive: true});
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await browser.contexts()[0].newPage();
  const made = [];
  const problems = [];
  try {
    await page.setViewportSize({width: W, height: H});
    for (const k of keys) {
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${THUMBS2[k](dir)}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const info = await page.evaluate(({limitBottom}) => {
        const out = {fonts: [], words: 0, bottom: 0, overflow: false, texts: []};
        const de = document.documentElement;
        out.overflow = de.scrollHeight > 1376 || de.scrollWidth > 768;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        while (walker.nextNode()) {
          const n = walker.currentNode;
          const txt = n.textContent.trim();
          if (!txt) continue;
          const el = n.parentElement;
          if (seen.has(el)) continue;
          seen.add(el);
          const fs = parseFloat(getComputedStyle(el).fontSize);
          const r = el.getBoundingClientRect();
          out.fonts.push(fs);
          // 글자 수(5단어 이하)는 위 띠 문구와 동그라미 문구만 센다. 단어 줄·한글 칸·그림은 내용이라 세지 않는다.
          if (el.closest('.top') || el.closest('.red')) out.words += txt.split(/\s+/).length;
          out.bottom = Math.max(out.bottom, r.bottom);
          out.texts.push(txt);
        }
        return out;
      }, {limitBottom: 1030});
      const maxFont = Math.max(...info.fonts);
      const minFont = Math.min(...info.fonts);
      const scale = 200 / W;
      if (info.overflow) problems.push(`${k}2: 화면 넘침`);
      if (maxFont * scale < 28) problems.push(`${k}2: 200px에서 가장 큰 글자가 ${Math.round(maxFont * scale)}px(28px 필요)`);
      if (minFont * scale < 14) problems.push(`${k}2: 200px에서 가장 작은 글자가 ${Math.round(minFont * scale)}px(14px 필요)`);
      if (info.words > 5) problems.push(`${k}2: 글자가 ${info.words}단어(5단어 이하)`);
      const out = join(dir, `thumb-${k}2.jpg`);
      await page.screenshot({path: out, type: 'jpeg', quality: 92, clip: {x: 0, y: 0, width: W, height: H}});
      made.push(`images/${videoId}/thumb-${k}2.jpg`);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return {made, problems};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const {made, problems} = await renderSheetThumbs2(process.argv[2]);
    console.log(`2안 썸네일 ${made.length}장을 만들었습니다.`);
    if (problems.length) { console.log('점검에 걸린 것:'); for (const p of problems) console.log(`- ${p}`); process.exitCode = 2; } else console.log('점검: 200px 글자 크기·단어 수·넘침 모두 통과');
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
