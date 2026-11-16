// 비교 시트 3안 썸네일 6장(thumb-A3.jpg ~ thumb-F3.jpg, Gemini · Antigravity 독자 설계, 2026-11-16).
// 1·2안 썸네일을 참고하지 않고 w8g6-e9yLP4의 음성인식 타이머·관문 통과(막힘✗ vs 통과✓)·스테이지 진행감에서 도출.
// 200px 축소 기준 자동 검증: 가장 큰 글자 >= 28px(768px 기준 108px), 모든 글자 >= 14px(768px 기준 54px), 전체 단어 수 <= 5단어, 화면 넘침 없음.
// 사용: node scripts/sheet-thumbs3.mjs <원본 영상ID>

import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sheetsDir} from './transform-sheet.mjs';
import {openRenderBrowser} from './render-sheet-cards.mjs';

const W = 768;
const H = 1376;

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const uri = (dir, name) =>
  `data:image/jpeg;base64,${readFileSync(join(dir, name)).toString('base64')}`;

const MIC_SVG = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fecaca" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3" fill="#ef4444"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>`;
const ARROW_DOWN_SVG = `<svg width="96" height="96" viewBox="0 0 24 24" fill="none"><path d="M12 3v16m0 0l-6-6m6 6l6-6" stroke="#facc15" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CHECK_SVG = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#10b981"/><path d="M7.5 12.5l3 3 6-6.5" stroke="#052e23" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CROSS_SVG = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#ef4444"/><path d="M8.5 8.5l7 7M15.5 8.5l-7 7" stroke="#450a0a" stroke-width="3" stroke-linecap="round"/></svg>`;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:768px;height:1376px;overflow:hidden}
body{
  position:relative;
  background:radial-gradient(circle at 50% 45%,#1e3a8a 0%,#0f172a 56%,#070b14 100%);
  font-family:"Noto Sans KR","Malgun Gothic",system-ui,sans-serif;
  font-weight:900;color:#ffffff;
}
.grid{
  position:absolute;inset:0;
  background-image:
    linear-gradient(rgba(56,189,248,0.08) 2px,transparent 2px),
    linear-gradient(90deg,rgba(56,189,248,0.08) 2px,transparent 2px);
  background-size:52px 52px;
}
.top-hud{
  position:absolute;left:0;top:0;width:768px;height:280px;
  background:#090d16;border-bottom:6px solid #38bdf8;
  display:flex;align-items:center;justify-content:center;gap:18px;padding:0 24px;
}
.card{
  position:absolute;left:42px;width:684px;
  border-radius:36px;display:flex;align-items:center;justify-content:center;
  padding:24px;
}
.red-gate{
  background:#450a0a;border:8px solid #ef4444;box-shadow:0 14px 0 #7f1d1d;
}
.green-gate{
  background:#052e23;border:8px solid #10b981;box-shadow:0 14px 0 #064e3b;
}
.gold-gate{
  background:#111c33;border:8px solid #facc15;box-shadow:0 14px 0 #854d0e;
}
.y{color:#facc15}
.r{color:#f87171}
.g{color:#34d399}
.cluster{
  background:#facc15;color:#090d16;padding:4px 16px;border-radius:20px;margin-right:6px;display:inline-block;
}
.art-frame{
  position:absolute;left:104px;width:560px;height:560px;
  background:#f4efe6;border:10px solid #e2e8f0;border-radius:42px;
  box-shadow:0 24px 48px rgba(0,0,0,0.6);overflow:hidden;
}
.art-frame img{width:100%;height:100%;object-fit:cover;display:block}
.tile-2x2{
  position:absolute;width:326px;height:440px;
  background:#111c33;border:6px solid #10b981;border-radius:28px;
  box-shadow:0 10px 0 #064e3b;overflow:hidden;
  display:flex;flex-direction:column;align-items:center;justify-content:space-between;
  padding:14px 14px 18px;
}
.tile-2x2 img{
  width:290px;height:290px;border-radius:20px;object-fit:cover;background:#f4efe6;border:4px solid #e2e8f0;
}
`;

export const THUMBS3 = {
  // A3: w8g6 실시간 마이크 타이머 + 빨간 막힘 게이트(스트레스 4박자) -> 초록 통과 게이트(STRESS 1박자)
  A: () => `
    <div class="grid"></div>
    <div class="top-hud">
      ${MIC_SVG}
      <div style="font-size:112px;letter-spacing:-2px;color:#fecaca">00:01</div>
    </div>
    <div class="card red-gate" style="top:325px;height:280px;flex-direction:column;gap:12px">
      <div style="font-size:116px;line-height:1">스트레스</div>
      <div style="display:flex;align-items:center;gap:14px;font-size:76px;color:#fca5a5">${CROSS_SVG}<span>4박자</span></div>
    </div>
    <div style="position:absolute;left:0;top:630px;width:768px;display:flex;justify-content:center">${ARROW_DOWN_SVG}</div>
    <div class="card green-gate" style="top:745px;height:480px;flex-direction:column;gap:22px">
      <div style="font-size:152px;line-height:1;letter-spacing:-4px"><span class="cluster">STR</span>ESS</div>
      <div style="display:flex;align-items:center;gap:16px;font-size:108px;color:#34d399">${CHECK_SVG}<span>1박자</span></div>
    </div>
  `,

  // B3: 숨은 'ㅡ' 빼고 한 숨에 묶기 (X-Ray)
  B: () => `
    <div class="grid"></div>
    <div class="top-hud" style="gap:20px">
      <div style="font-size:132px;background:#7f1d1d;border:6px solid #ef4444;color:#fca5a5;padding:6px 26px;border-radius:24px;text-decoration:line-through;text-decoration-thickness:10px">으</div>
      <div style="font-size:132px">빼면</div>
    </div>
    <div class="card gold-gate" style="top:350px;height:480px;flex-direction:column;gap:28px">
      <svg width="540" height="120" viewBox="0 0 540 120" fill="none">
        <rect x="6" y="14" width="128" height="92" rx="20" fill="#7f1d1d" stroke="#ef4444" stroke-width="6"/>
        <line x1="36" y1="60" x2="104" y2="60" stroke="#fca5a5" stroke-width="14" stroke-linecap="round"/>
        <line x1="24" y1="96" x2="116" y2="24" stroke="#ef4444" stroke-width="10" stroke-linecap="round"/>
        <rect x="166" y="14" width="128" height="92" rx="20" fill="#7f1d1d" stroke="#ef4444" stroke-width="6"/>
        <line x1="196" y1="60" x2="264" y2="60" stroke="#fca5a5" stroke-width="14" stroke-linecap="round"/>
        <line x1="184" y1="96" x2="276" y2="24" stroke="#ef4444" stroke-width="10" stroke-linecap="round"/>
        <path d="M322 60h42m0 0l-18-18m18 18l-18 18" stroke="#facc15" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="386" y="10" width="146" height="100" rx="22" fill="#facc15"/>
        <path d="M416 60h86" stroke="#090d16" stroke-width="16" stroke-linecap="round"/>
      </svg>
      <div style="font-size:132px;line-height:1;letter-spacing:-4px;white-space:nowrap"><span class="cluster">STR</span>ESS</div>
    </div>
    <div class="card green-gate" style="top:900px;height:310px;gap:20px">
      ${CHECK_SVG}
      <div style="font-size:132px;color:#34d399">1박자!</div>
    </div>
  `,

  // C3: 관문 퀴즈 호기심형 (몇 박자?)
  C: () => `
    <div class="grid"></div>
    <div class="top-hud">
      <div style="font-size:148px;color:#facc15;letter-spacing:-3px">몇 박자?</div>
    </div>
    <div class="card gold-gate" style="top:340px;height:370px">
      <div style="font-size:164px;line-height:1;letter-spacing:-4px"><span class="cluster">STR</span>IKE</div>
    </div>
    <div style="position:absolute;left:42px;top:770px;width:684px;height:420px;display:flex;gap:24px">
      <div style="flex:1;background:#450a0a;border:8px solid #ef4444;box-shadow:0 14px 0 #7f1d1d;border-radius:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px">
        ${CROSS_SVG}
        <div style="font-size:96px;color:#fca5a5">5박자</div>
      </div>
      <div style="flex:1;background:#052e23;border:8px solid #10b981;box-shadow:0 14px 0 #064e3b;border-radius:36px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px">
        ${CHECK_SVG}
        <div style="font-size:104px;color:#34d399">1박자?</div>
      </div>
    </div>
  `,

  // D3: 캐릭터 감정 일러스트(pic-stress.jpg) 집중형
  D: (dir) => `
    <div class="grid"></div>
    <div class="top-hud">
      <div style="font-size:102px;letter-spacing:-2px">스트레스 <span class="r">4글자?</span></div>
    </div>
    <div class="art-frame" style="top:330px">
      <img src="${uri(dir, 'pic-stress.jpg')}" alt="">
    </div>
    <div class="card green-gate" style="top:950px;height:280px;gap:18px">
      ${CHECK_SVG}
      <div style="font-size:132px;color:#34d399">딱 1박자!</div>
    </div>
  `,

  // E3: 볼링 스트라이크 역동 일러스트(pic-strike.jpg) 집중형
  E: (dir) => `
    <div class="grid"></div>
    <div class="top-hud" style="border-bottom-color:#facc15">
      <div style="font-size:144px;letter-spacing:-4px;white-space:nowrap"><span class="cluster">STR</span>IKE</div>
    </div>
    <div class="art-frame" style="top:330px;border-color:#facc15">
      <img src="${uri(dir, 'pic-strike.jpg')}" alt="">
    </div>
    <div style="position:absolute;left:42px;top:950px;width:684px;height:280px;display:flex;gap:20px">
      <div style="flex:1;background:#450a0a;border:8px solid #ef4444;border-radius:32px;display:flex;align-items:center;justify-content:center;font-size:84px;color:#fca5a5;text-decoration:line-through;text-decoration-thickness:8px">5글자</div>
      <div style="flex:1.2;background:#052e23;border:8px solid #10b981;border-radius:32px;display:flex;align-items:center;justify-content:center;font-size:112px;color:#34d399">1박자!</div>
    </div>
  `,

  // F3: 4단계 올클리어 일러스트 2×2 그리드형
  F: (dir) => {
    const items = [
      { word: 'STRESS', file: 'pic-stress.jpg' },
      { word: 'SCREEN', file: 'pic-screen.jpg' },
      { word: 'SPRAY', file: 'pic-spray.jpg' },
      { word: 'STRIKE', file: 'pic-strike.jpg' },
    ];
    return `
      <div class="grid"></div>
      <div class="top-hud" style="height:240px;border-bottom-color:#10b981">
        ${CHECK_SVG}
        <div style="font-size:142px;color:#facc15;letter-spacing:-3px">한박자!</div>
      </div>
      ${items
        .map(
          (it, idx) => `
        <div class="tile-2x2" style="left:${42 + (idx % 2) * 358}px;top:${286 + Math.floor(idx / 2) * 476}px">
          <img src="${uri(dir, it.file)}" alt="">
          <div style="font-size:66px;line-height:1;letter-spacing:-2px"><span class="cluster" style="padding:2px 10px;border-radius:12px">${esc(it.word.slice(0, 3))}</span>${esc(it.word.slice(3))}</div>
        </div>`
        )
        .join('')}
    `;
  },
};

export async function renderSheetThumbs3(videoId, { keys = Object.keys(THUMBS3) } = {}) {
  const dir = join(sheetsDir, 'images', videoId);
  if (!existsSync(dir)) throw new Error(`이미지 폴더가 없다: ${dir}`);
  mkdirSync(dir, { recursive: true });
  const {browser, page} = await openRenderBrowser();
  const made = [];
  const problems = [];
  try {
    await page.setViewportSize({ width: W, height: H });
    for (const k of keys) {
      await page.setContent(`<!doctype html><meta charset="utf-8"><style>${CSS}</style>${THUMBS3[k](dir)}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const info = await page.evaluate(() => {
        const out = { fonts: [], words: 0, overflow: false, texts: [] };
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
          out.fonts.push(fs);
          out.texts.push(txt);
        }
        // 전체 보이는 텍스트를 공백 기준으로 단어 수 측정 (split-span 단어는 하나로 붙도록 block 기준 집계)
        const blockTexts = [];
        document.querySelectorAll('div').forEach((d) => {
          if (d.children.length === 0 || [...d.children].every((c) => c.tagName === 'SPAN')) {
            const t = d.innerText.replace(/\s+/g, ' ').trim();
            if (t) blockTexts.push(t);
          }
        });
        out.words = blockTexts.join(' ').trim().split(/\s+/).filter(Boolean).length;
        return out;
      });
      const maxFont = Math.max(...info.fonts);
      const minFont = Math.min(...info.fonts);
      const scale = 200 / W;
      if (info.overflow) problems.push(`${k}3: 화면 넘침`);
      if (maxFont * scale < 28) problems.push(`${k}3: 200px에서 가장 큰 글자가 ${Math.round(maxFont * scale)}px(28px 필요)`);
      if (minFont * scale < 14) problems.push(`${k}3: 200px에서 가장 작은 글자가 ${Math.round(minFont * scale)}px(14px 필요)`);
      if (info.words > 5) problems.push(`${k}3: 글자가 ${info.words}단어(5단어 이하)`);
      const out = join(dir, `thumb-${k}3.jpg`);
      await page.screenshot({ path: out, type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: W, height: H } });
      made.push(`images/${videoId}/thumb-${k}3.jpg`);
    }
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return { made, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const videoId = process.argv.slice(2).find((a) => !a.startsWith('-'));
    const { made, problems } = await renderSheetThumbs3(videoId);
    console.log(`3안 썸네일 ${made.length}장을 만들었습니다.`);
    if (problems.length) {
      console.log(`점검에 걸린 것 ${problems.length}개:`);
      for (const p of problems) console.log(`- ${p}`);
      process.exitCode = 2;
    } else {
      console.log('점검: 200px 크기에서 모든 글자가 14px 이상, 최대 28px 이상, 5단어 이하, 넘침 없음');
    }
  } catch (err) {
    console.error(`실패: ${err.message}`);
    process.exitCode = 1;
  }
}
