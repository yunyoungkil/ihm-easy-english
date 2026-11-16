// 비교 시트 2안 쇼츠 카드 틀(2026-11-16). 설계서: opus-expert 검토(위 훅 띠 + 가운데 카드 + 아래 정보 띠, 모바일 글자 크기 기준).
// 1안(sheet-card-templates.mjs)은 크림색 한 장이라 위·아래 띠가 없고 카드가 화면을 넘쳤다. 2안은 768×1376 실제 크기(zoom 없음)로 짜고,
// 렌더할 때 넘침·최소 글자 크기·띠 밝기를 코드로 잰다(scripts/render-sheet-cards.mjs의 renderSheetCards2).
//
// 규칙(사용자 불변, AGENTS.md): 쇼츠에는 위 훅 띠와 아래 정보 띠가 항상 들어간다. 위 띠 = 영상 내내 고정하는 훅 2줄,
// 아래 띠 = 낭독 자막 + 진행 점(경쟁 쇼츠가 하단에 넣는 자막·진행 표시를 응용).
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const CARD2 = Object.freeze({
  width: 768, height: 1376,
  topBandHeight: 296, bottomBandTop: 1076,
  minFontPx: 34, // 휴대폰(폭 390pt)에서 17pt 이상(1px = 0.51pt)
  hookFontPx: 60,
  safeTop: 130, safeBottom: 1210, safeRightX: 634, // 유튜브 화면 위·아래 아이콘과 오른쪽 버튼 줄을 피하는 자리(눈대중, 설계서 8절 참고)
});

/** "**강조**" 표기를 노란 글자로 바꾼다. */
export function markup(text, cls = 'hl') {
  return String(text ?? '').split('**').map((p, i) => (i % 2 ? `<span class="${cls}">${esc(p)}</span>` : esc(p))).join('');
}

const CSS = `*{box-sizing:border-box;margin:0}
html,body{width:768px;height:1376px}
body{position:relative;overflow:hidden;background:#F4EFE6;font-family:"Noto Sans KR","Malgun Gothic",sans-serif;font-weight:900;color:#111}
.top{position:absolute;left:0;top:0;width:768px;height:296px;background:#111}
.hk{position:absolute;left:0;width:768px;text-align:center;font-size:60px;line-height:76px;color:#fff;white-space:nowrap;letter-spacing:-1px}
.hkt{display:inline-block}.hk.l1{top:138px}.hk.l2{top:214px}
.hl{color:#F5C518}
.bot{position:absolute;left:0;top:1076px;width:768px;height:300px;background:#111}
.sub{position:absolute;left:134px;width:500px;top:1100px;min-height:52px;text-align:center;color:#fff;font-size:44px;line-height:52px;font-weight:800;word-break:keep-all}
.sub .sp{display:inline-flex;align-items:center;gap:12px;color:#F5C518}
.dots{position:absolute;left:0;width:768px;top:1224px;display:flex;justify-content:center;gap:28px}
.dots span{width:24px;height:24px;border-radius:50%;border:3px solid #9E9E9E;background:transparent}
.dots span.done{background:#fff;border-color:#fff}.dots span.cur{background:#F5C518;border-color:#F5C518}
.card{position:absolute;left:28px;top:312px;width:712px;height:740px;background:#fff;border:8px solid #000;border-radius:36px;box-shadow:12px 12px 0 #000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 28px}
.pic2{width:240px;height:240px;object-fit:cover;border:6px solid #000;border-radius:20px;background:#F4EFE6;flex:none}
.pic2.big{width:340px;height:340px}
.tiles{display:flex;gap:10px;margin-top:16px}
.tile{width:88px;height:100px;display:flex;align-items:center;justify-content:center;border:5px solid #000;border-radius:16px;background:#fff;box-shadow:4px 4px 0 #000;font-size:60px;line-height:1}
.arrow2{font-size:40px;line-height:1;margin:6px 0}
.ybox{display:inline-flex;align-items:center;justify-content:center;background:#F5C518;border:8px solid #000;border-radius:22px;box-shadow:8px 8px 0 #000;padding:0 28px;height:136px;font-size:104px;line-height:1;letter-spacing:-2px;white-space:nowrap}
.rev{background:#111;color:#F5C518;padding:0 8px;border-radius:10px}
.pill2{display:inline-flex;align-items:center;height:76px;padding:0 34px;background:#F5C518;border:5px solid #000;border-radius:40px;font-size:48px;line-height:1;white-space:nowrap;margin-top:18px}
.jm{display:flex;gap:4px;margin:10px 0}
.jm span{width:60px;height:104px;display:flex;align-items:center;justify-content:center;border:5px solid #000;border-radius:14px;background:#fff;font-size:60px;line-height:1}
.jm span.gone{background:#FDE2E3;border-color:#D7141A;color:#D7141A;position:relative}
.jm span.gone:after{content:"";position:absolute;left:-4px;right:-4px;top:50%;height:10px;background:#D7141A;transform:rotate(-24deg)}
.wordbig{line-height:1;white-space:nowrap;letter-spacing:-2px}
.choices{display:flex;gap:18px}
.choice{display:flex;align-items:center;justify-content:center;background:#fff;border:6px solid #000;border-radius:20px;box-shadow:5px 5px 0 #000;line-height:1}
.turn{display:flex;align-items:center;gap:14px;width:500px;margin-top:22px}
.turn .bar{flex:1;height:20px;border-radius:10px;background:#DDD;overflow:hidden}.turn .bar i{display:block;height:100%;width:100%;background:#111}
.row2{display:flex;align-items:center;justify-content:space-between;width:500px;height:140px;border-top:4px solid #111}
.row2:first-of-type{border-top:0}
.row2 .w{font-size:80px;line-height:1;white-space:nowrap}
.row2 .n{font-size:60px;line-height:1;color:#757575;display:flex;align-items:center;gap:12px;white-space:nowrap}
.row2 .o{display:inline-flex;align-items:center;justify-content:center;width:76px;height:76px;border-radius:50%;background:#F5C518;color:#111;font-size:56px;border:5px solid #000}
.wbox{width:360px;height:100px;display:flex;align-items:center;justify-content:center;background:#fff;border:6px solid #000;border-radius:18px;box-shadow:5px 5px 0 #000;font-size:60px;line-height:1;margin-top:14px}`;

const SPEAKER = '<svg width="48" height="48" viewBox="0 0 24 24" fill="#F5C518"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
const MIC = '<svg width="40" height="40" viewBox="0 0 24 24" fill="#111"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z"/></svg>';

const wordHtml = (word, hl) => {
  const w = String(word);
  if (!Array.isArray(hl)) return esc(w);
  const [a, b] = hl;
  return `${esc(w.slice(0, a))}<span class="rev">${esc(w.slice(a, b))}</span>${esc(w.slice(b))}`;
};
const pill2 = (t) => (t ? `<div class="pill2">${esc(t)}</div>` : '');
const tiles = (syl) => `<div class="tiles">${(syl || []).map((s) => `<span class="tile">${esc(s)}</span>`).join('')}</div>`;
const picTag = (c, big = false) => `<img class="pic2${big ? ' big' : ''}" src="${esc(c.picData || '')}" alt="">`;

/** 카드 안(가운데 흰 카드)에 들어가는 내용. 틀 이름은 1안과 같고 설계가 다르다. */
export const INNER2 = {
  // 훅 컷: 큰 단어 + 고르기 칸
  hook: (c) => `<div class="wordbig" style="font-size:150px">${esc(c.word)}</div><div class="choices" style="margin-top:90px">${(c.choices || ['1', '2', '3', '4']).map((n) => `<span class="choice" style="width:112px;height:112px;font-size:64px">${esc(n)}</span>`).join('')}</div>`,
  // 그림 + 한글 칸 + 영어 한 칸
  'pic-count': (c) => `${picTag(c)}${tiles(c.syl)}<div class="arrow2">↓</div><div class="ybox">${wordHtml(c.word, c.hl)}</div>${pill2(c.pill)}`,
  // 으 칸 지우기
  'eu-flip': (c) => `<div style="font-size:120px;line-height:1;white-space:nowrap">${esc(c.written)}</div><div class="jm">${(c.jamo || []).map((j) => (String(j).startsWith('!') ? `<span class="gone">${esc(String(j).slice(1))}</span>` : `<span>${esc(j)}</span>`)).join('')}</div><div class="arrow2" style="font-size:44px">↓</div><div class="ybox" style="font-size:120px;height:150px">${wordHtml(c.word, c.hl)}</div>`,
  // 따라 말하기: 알약 + 큰 그림 + 단어 + 내 차례 막대
  'pic-say': (c) => `${pill2(c.pill).replace('margin-top:18px', '')}<img class="pic2 big" style="margin-top:14px" src="${esc(c.picData || '')}" alt=""><div class="wordbig" style="font-size:132px;margin-top:14px">${esc(c.word)}</div><div class="turn">${MIC}<div class="bar"><i></i></div></div>`,
  // 퀴즈: 한글 칸 + 영어 단어 + 고르기 칸(함정으로 한글 글자 수 5를 같이 둔다)
  quiz: (c) => `${tiles(c.syl).replace('margin-top:16px', '')}<div class="wordbig" style="font-size:150px;margin-top:24px">${esc(c.word)}</div><div class="choices" style="margin-top:36px">${(c.choices || ['1', '3', '5']).map((n) => `<span class="choice" style="width:120px;height:120px;font-size:72px">${esc(n)}</span>`).join('')}</div>`,
  // 정리: 단어 4줄과 "글자 수 → 1"
  recap: (c) => `${pill2(c.pill).replace('margin-top:18px', 'margin-bottom:14px')}${(c.rows || []).map((r) => `<div class="row2"><span class="w">${esc(r.word)}</span><span class="n">${esc(r.n)} → <span class="o">1</span></span></div>`).join('')}`,
  // 끝: 질문 + 단어 칸 + 알약
  cta: (c) => `<div style="font-size:72px;line-height:1;white-space:nowrap">${esc(c.title || '어려운 단어는?')}</div><div style="margin-top:8px">${(c.words || []).map((w) => `<div class="wbox">${esc(w)}</div>`).join('')}</div>${pill2(c.pill)}`,
};

/** 아래 띠: 낭독 자막 한 줄(영어 소리만 나오는 컷은 스피커 + 단어) + 진행 점 4개. */
function bottomHtml(cut) {
  const b = cut.bottom || {};
  const sub = b.speaker ? `<span class="sp">${SPEAKER}<span>${esc(b.speaker)}</span></span>` : esc(b.subtitle || '');
  const n = Number(b.total) || 4;
  const done = Number(b.done) || 0;
  const cur = Number.isInteger(b.current) ? b.current : -1;
  const dots = Array.from({length: n}, (_, i) => `<span class="${i === cur ? 'cur' : i < done ? 'done' : ''}"></span>`).join('');
  return `<div class="bot"></div><div class="sub">${sub}</div><div class="dots">${dots}</div>`;
}

/** 2안 컷 카드 HTML. plan2.hook = [첫째 줄, 둘째 줄] ("**강조**" 표기). */
export function renderCard2Html(cut, plan2) {
  const fn = INNER2[cut?.template];
  if (!fn) throw new Error(`없는 2안 카드 틀: ${cut?.template}`);
  const hook = plan2?.hook || [];
  if (hook.length < 1 || hook.length > 2) throw new Error('2안 위 띠(hook)는 1~2줄이어야 한다');
  const top = `<div class="top"></div>${hook.map((l, i) => `<div class="hk l${i + 1}"><span class="hkt">${markup(l)}</span></div>`).join('')}`;
  return `<!doctype html><meta charset="utf-8"><style>${CSS}</style>${top}<div class="card">${fn(cut)}</div>${bottomHtml(cut)}`;
}
