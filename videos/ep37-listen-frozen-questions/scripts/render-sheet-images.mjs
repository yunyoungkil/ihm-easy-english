// EP37 비교 시트용 썸네일 3안(1280×720)과 화면 시안 컷(1920×1080)을 코드로 찍는다.
// 배경 사진은 AI 스튜디오(Nano Banana 2.1)로 만든 raw/*.jpg, 글자는 전부 여기서 얹는다(그림 속 글자 금지).
// 사용: node videos/ep37-listen-frozen-questions/scripts/render-sheet-images.mjs
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const OUT = join(ROOT, 'data', 'youtube', 'transform-sheets', 'images', 'ep37-listen-frozen-questions');
const RAW = join(OUT, 'raw');
mkdirSync(join(OUT, 'cuts'), {recursive: true});

const font = readFileSync(join(ROOT, 'videos', 'ep36-everyday-words-unheard', 'assets', 'fonts', 'NotoSansKR-VF.ttf')).toString('base64');
const gfont = (f) => readFileSync(join(ROOT, 'public', 'fonts', 'google', f)).toString('base64');
const GF = {
  blackHan: gfont('BlackHanSans-Regular.ttf'),
  gothicA1: gfont('GothicA1-Black.ttf'),
  doHyeon: gfont('DoHyeon-Regular.ttf'),
  ibmBold: gfont('IBMPlexSansKR-Bold.ttf'),
  archivoBlack: gfont('ArchivoBlack-Regular.ttf'),
  barlowCond: gfont('BarlowCondensed-ExtraBold.ttf'),
  outfit: gfont('Outfit-VF.ttf'),
};
const img = (f) => `data:image/jpeg;base64,${readFileSync(join(RAW, f)).toString('base64')}`;

// 장마다 서울 지하철 노선 색에서 따온 표지 색(어두운 바탕에서 읽히게 밝힌 값)
export const CH = {
  1: {name: '길에서', rule: '작은 말은 원래 작다', color: '#4C8DF6'},
  2: {name: '가게에서', rule: '끝소리가 다음 모음에 붙는다', color: '#2EB872'},
  3: {name: '처음 만난 사람', rule: '드·트 뒤의 유가 섞인다', color: '#F28C28'},
  4: {name: '여행지에서', rule: '모음 사이의 트가 구른다', color: '#3BB4E5'},
  5: {name: '친한 사이', rule: '질문 앞머리가 사라진다', color: '#A97BE8'},
};

const base = (w, h) => `@font-face{font-family:'K';src:url(data:font/ttf;base64,${font}) format('truetype');font-weight:100 900}
@font-face{font-family:'BlackHan';src:url(data:font/ttf;base64,${GF.blackHan}) format('truetype');font-weight:400}
@font-face{font-family:'GothicA1';src:url(data:font/ttf;base64,${GF.gothicA1}) format('truetype');font-weight:900}
@font-face{font-family:'DoHyeon';src:url(data:font/ttf;base64,${GF.doHyeon}) format('truetype');font-weight:400}
@font-face{font-family:'IBMBold';src:url(data:font/ttf;base64,${GF.ibmBold}) format('truetype');font-weight:700}
@font-face{font-family:'ArchivoBlack';src:url(data:font/ttf;base64,${GF.archivoBlack}) format('truetype');font-weight:400}
@font-face{font-family:'BarlowCond';src:url(data:font/ttf;base64,${GF.barlowCond}) format('truetype');font-weight:800}
@font-face{font-family:'Outfit';src:url(data:font/ttf;base64,${GF.outfit}) format('truetype');font-weight:100 900}
*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:'K',sans-serif;background:#0F1521;color:#F4F1EA;-webkit-font-smoothing:antialiased}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.nw{white-space:nowrap}`;

const page = (w, h, css, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${base(w, h)}${css}</style></head><body>${body}</body></html>`;

// 파형(소리 덩어리 모양). 고정 값이라 매번 같은 그림이 나온다.
const wave = (w, h, color, bars = 64, seed = 7) => {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const bw = w / bars;
  let out = '';
  for (let i = 0; i < bars; i += 1) {
    const env = Math.sin((i / bars) * Math.PI) ** 0.6;
    const bh = Math.max(6, h * env * (0.25 + 0.75 * rnd()));
    out += `<rect x="${(i * bw + bw * 0.2).toFixed(1)}" y="${((h - bh) / 2).toFixed(1)}" width="${(bw * 0.6).toFixed(1)}" height="${bh.toFixed(1)}" rx="${(bw * 0.3).toFixed(1)}" fill="${color}"/>`;
  }
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${out}</svg>`;
};

// ── 썸네일 3안 (1280×720) — v4(2026-11-25 밤 검수 개편: 그래픽 층·구글 폰트 역할 분리·200px 대비·제목 시너지 정렬) ───────────
// 사례집(data/youtube/packaging-cases.json) + 제작 자료(AI 티 빼기·영상 효과 14·15번) + 구글 폰트 서랍(public/fonts/google/).
// 이전 판: raw/thumb-?-v2-ai-average.jpg, raw/thumb-?-v3.jpg, raw/thumb-v3-review.txt.
const TL = JSON.parse(execFileSync(process.execPath, [join(HERE, 'estimate-timeline.mjs'), '--json'], {encoding: 'utf8'}));
const MINUTES = Math.round(TL.totalSeconds / 60); // 추정 길이(음성 실측 뒤 다시 찍으면 실제 값으로 바뀐다)
const stroke = (px, c = '#070B14') => `-webkit-text-stroke:${px}px ${c};paint-order:stroke fill`;
const THUMBS = {
  // A 장면·대결(v5 백지 눈 수정): 위쪽 영어 띠 노란 밑줄 스포일러 제거(균등 흰색) + 아래 카피 속마음 호기심 빈칸("아는 단어 7개인데 / 왜 하나도 안 들리지?").
  A: page(1280, 720, `
.low{position:absolute;left:0;right:0;bottom:0;height:340px;background:linear-gradient(0deg,rgba(6,10,18,.95) 0%,rgba(6,10,18,.72) 56%,rgba(6,10,18,0) 100%)}
.tl{position:absolute;left:0;top:0;width:780px;height:220px;background:radial-gradient(ellipse at 24% 20%,rgba(6,10,18,.82) 0%,rgba(6,10,18,0) 74%)}
.voice-bar{position:absolute;left:36px;top:38px;display:inline-flex;align-items:center;gap:14px;background:rgba(10,15,26,.94);border:3px solid rgba(255,210,26,.85);border-radius:18px;padding:13px 26px;box-shadow:0 12px 28px rgba(0,0,0,.6);transform:rotate(-1.5deg)}
.voice-txt{font-family:'BarlowCond',sans-serif;font-size:48px;font-weight:800;color:#F8FAFC;letter-spacing:.4px;line-height:1}
.arrow-wrap{position:absolute;left:678px;top:64px;pointer-events:none;filter:drop-shadow(0 3px 6px rgba(0,0,0,.92)) drop-shadow(0 0 10px rgba(0,0,0,.75))}
.h1{position:absolute;left:44px;bottom:172px;font-family:'GothicA1',sans-serif;font-size:66px;font-weight:900;color:#F8FAFC;letter-spacing:-2px;${stroke(11)};text-shadow:0 6px 18px rgba(0,0,0,.6)}
.h2{position:absolute;left:38px;bottom:34px;font-family:'BlackHan',sans-serif;font-size:112px;font-weight:400;color:#FFD21A;letter-spacing:-3.5px;line-height:1;transform:rotate(-1deg);${stroke(14)};text-shadow:0 10px 26px rgba(0,0,0,.74)}`,
  `<img class="bg" src="${img('thumb-a-v4-bg.jpg')}" style="object-position:56% 32%"><div class="tl"></div><div class="low"></div>
<div class="voice-bar"><svg width="34" height="34" viewBox="0 0 34 34" fill="none"><rect x="2" y="13" width="5" height="8" rx="2.5" fill="#FFD21A"/><rect x="10" y="6" width="5" height="22" rx="2.5" fill="#FFD21A"/><rect x="18" y="2" width="5" height="30" rx="2.5" fill="#FFD21A"/><rect x="26" y="10" width="5" height="14" rx="2.5" fill="#FFD21A"/></svg><div class="voice-txt nw">How do I get to Seoul Station?</div></div>
<svg class="arrow-wrap" width="96" height="82" viewBox="0 0 96 82" fill="none"><path d="M8 14 C38 14, 62 28, 82 56" stroke="#FFD21A" stroke-width="7" stroke-linecap="round" stroke-dasharray="10 10"/><path d="M63 56 L84 60 L82 38" stroke="#FFD21A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>
<div class="h1 nw">아는 단어 7개인데</div><div class="h2 nw">왜 하나도 안 들리지?</div>`),

  // B 소리 그림(v5 백지 눈 수정): "몇 단어 들리세요?" 퀴즈·답 노출 모순 해소 → "눈엔 7단어인데" + 강약 대비 그래픽 + 실측 추정 분수 칩.
  B: page(1280, 720, `
.scrim{position:absolute;left:0;top:0;bottom:0;width:860px;background:linear-gradient(90deg,rgba(7,12,24,.82) 0%,rgba(7,12,24,.55) 72%,rgba(7,12,24,0) 100%)}
.w{position:absolute;left:28px;top:220px;opacity:.24}
.q{position:absolute;left:50px;top:46px;font-family:'GothicA1',sans-serif;font-size:74px;font-weight:900;color:#F8FAFC;letter-spacing:-2.5px;${stroke(9)}}
.l1{position:absolute;left:52px;top:186px;display:flex;align-items:baseline;gap:20px}
.l2{position:absolute;left:52px;top:384px;display:flex;align-items:baseline;gap:14px}
.sm{font-family:'Outfit',sans-serif;font-size:48px;font-weight:700;color:#CBD5E1;letter-spacing:-.5px;${stroke(6)}}
.get{font-family:'ArchivoBlack',sans-serif;font-size:178px;font-weight:400;color:#FFD21A;letter-spacing:-4px;line-height:.95;${stroke(12)};text-shadow:0 10px 26px rgba(0,0,0,.6)}
.ss{font-family:'ArchivoBlack',sans-serif;font-size:80px;font-weight:400;color:#F8FAFC;letter-spacing:-2px;line-height:1;${stroke(10)};text-shadow:0 8px 20px rgba(0,0,0,.55)}
.beam{position:absolute;left:1084px;top:292px;pointer-events:none;filter:drop-shadow(0 0 10px rgba(255,210,26,.55))}
.dur{position:absolute;left:52px;bottom:48px;display:inline-flex;align-items:center;gap:12px;background:rgba(10,16,30,.88);border:2.5px solid rgba(255,210,26,.78);border-radius:999px;padding:10px 24px;font-family:'DoHyeon',sans-serif;font-size:38px;color:#FFD21A;letter-spacing:-.5px;box-shadow:0 8px 20px rgba(0,0,0,.45)}
.dot{width:14px;height:14px;border-radius:50%;background:#EF4444;box-shadow:0 0 0 4px rgba(239,68,68,.28)}`,
  `<img class="bg" src="${img('thumb-b-v4-bg.jpg')}" style="object-position:60% 50%"><div class="scrim"></div>
<div class="w">${wave(790, 290, '#60A5FA', 58, 11)}</div>
<div class="q nw">눈엔 7단어인데</div>
<div class="l1"><span class="sm nw">how do I</span><span class="get nw">GET</span><span class="sm nw">to</span></div>
<div class="l2"><span class="ss nw">SEOUL STATION</span><span class="sm nw">?</span></div>
<svg class="beam" width="92" height="110" viewBox="0 0 92 110" fill="none"><path d="M30 28 C12 42, 12 68, 30 82" stroke="#FFD21A" stroke-width="5" stroke-linecap="round" opacity=".9"/><path d="M16 14 C-6 36, -6 74, 16 96" stroke="#FFD21A" stroke-width="4" stroke-linecap="round" opacity=".55"/></svg>
<div class="dur nw"><span class="dot"></span>${MINUTES}분 틀어 두고 듣기</div>`),

  // C 에디토리얼 콜라주(v5 백지 눈 수정): 취소선 오류 삭제 + 글자 덩어리 4→3개로 압축 + 시트와 문구 100% 일치("딱 5가지만 알고 듣기").
  C: page(1280, 720, `
.chip{position:absolute;left:48px;top:56px;background:#C81E37;color:#FFFDF8;font-family:'DoHyeon',sans-serif;font-size:44px;padding:10px 26px;border-radius:12px;letter-spacing:-.5px;transform:rotate(-1.5deg);box-shadow:5px 7px 0 #141B2D}
.prob{position:absolute;left:50px;top:186px;font-family:'GothicA1',sans-serif;font-size:54px;font-weight:900;color:#141B2D;letter-spacing:-2px}
.prob-ul{position:absolute;left:50px;top:248px;width:448px;height:10px;pointer-events:none}
.h1{position:absolute;left:46px;top:292px;font-family:'BlackHan',sans-serif;font-size:126px;color:#0E1422;letter-spacing:-4px;line-height:1}
.hl-mark{display:inline-block;background:#FFFDF5;padding:0 14px 2px;border-radius:10px;box-shadow:5px 6px 0 #141B2D;color:#C81E37}
.h2{position:absolute;left:46px;top:438px;font-family:'BlackHan',sans-serif;font-size:118px;color:#0E1422;letter-spacing:-4px;line-height:1}
.ed-arrow{position:absolute;left:508px;top:482px;pointer-events:none}`,
  `<img class="bg" src="${img('thumb-c-v4-bg.jpg')}" style="object-position:54% 50%">
<div class="chip nw">${MINUTES}분 틀어 두기 · 질문 30개</div>
<div class="prob nw">그냥 틀면 안 들려요</div>
<svg class="prob-ul" viewBox="0 0 448 10" fill="none"><path d="M4 6 C140 2, 300 9, 444 4" stroke="#C81E37" stroke-width="7" stroke-linecap="round"/></svg>
<div class="h1 nw">딱 <span class="hl-mark">5가지</span>만</div>
<div class="h2 nw">알고 듣기</div>
<svg class="ed-arrow" width="124" height="62" viewBox="0 0 124 62" fill="none"><path d="M8 46 C42 54, 80 42, 112 16" stroke="#141B2D" stroke-width="6" stroke-linecap="round"/><path d="M94 14 L115 14 L111 35" stroke="#141B2D" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`),
};

// ── 화면 시안 컷 (1920×1080) — 2026-11-25 전면 개편: 시네마틱 오디오-에디토리얼 + 1~5장 실사 + 구글 폰트 역할 분리 ──
const MARK = `<div style="position:absolute;left:64px;top:44px;font-family:'DoHyeon',sans-serif;font-size:34px;letter-spacing:-.5px;opacity:.92;display:flex;align-items:center;gap:10px" class="nw"><span style="width:10px;height:10px;border-radius:50%;background:#FFD21A;display:inline-block"></span><span>이해하면 <span style="color:#FFD21A">쉬운영어</span></span></div>`;
const prog = (ch, n, part = '1부') => `<div style="position:absolute;right:64px;top:38px;display:flex;gap:14px;align-items:center;background:rgba(9,14,26,.74);border:1.5px solid rgba(255,255,255,.14);border-radius:999px;padding:8px 22px 8px 18px;font-family:'IBMBold',sans-serif;font-size:34px;box-shadow:0 8px 24px rgba(0,0,0,.35)" class="nw"><span style="opacity:.72">${part}</span><span style="background:${CH[ch].color};color:#080D18;font-family:'DoHyeon',sans-serif;border-radius:999px;padding:3px 18px;font-size:32px">${ch}장 ${CH[ch].name}</span><span style="font-family:'Outfit',sans-serif;font-weight:700;color:#F8FAFC">${n}/6</span></div>`;
const sceneBg = (ch, {blur = 2, dark = 0.56} = {}) => `<img class="bg" src="${img(`scene-ch${ch}-v2-bg.jpg`)}" style="filter:blur(${blur}px) brightness(${dark}) saturate(.92);transform:scale(1.04)"><div class="bg" style="background:radial-gradient(ellipse at 50% 45%, rgba(8,13,24,.18) 0%, rgba(7,11,20,.78) 100%)"></div>`;
const glowWave = (w, h, color, bars = 72, seed = 7) => `<div style="position:relative;width:${w}px;height:${h}px">
  <div style="position:absolute;inset:0;opacity:.34;filter:blur(10px)">${wave(w, h, color, bars, seed)}</div>
  <div style="position:absolute;inset:0">${wave(w, h, color, bars, seed)}</div>
</div>`;

const CUTS = {
  // 0:00 첫 30초 — 서울역 실사 위 입체 발광 파형(단색 PPT 탈피)
  'cut-00-open': page(1920, 1080, `.tag{position:absolute;left:50%;top:150px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:12px;background:rgba(10,16,28,.82);border:2px solid rgba(255,210,26,.6);border-radius:999px;padding:10px 28px;font-family:'DoHyeon',sans-serif;font-size:36px;color:#FFD21A;letter-spacing:.5px}
.dot{width:14px;height:14px;border-radius:50%;background:#EF4444;box-shadow:0 0 0 6px rgba(239,68,68,.28)}
.w{position:absolute;left:0;right:0;top:290px;display:flex;justify-content:center}
.c{position:absolute;left:0;right:0;top:790px;text-align:center;font-family:'IBMBold',sans-serif;font-size:56px;color:#F8FAFC;letter-spacing:-1px;text-shadow:0 4px 18px rgba(0,0,0,.65)}`,
  `${sceneBg(1, {blur: 4, dark: 0.44})}<div class="tag nw"><span class="dot"></span>EAR ONLY · 첫 듣기</div><div class="w">${glowWave(1460, 420, '#FFD21A', 84, 5)}</div><div class="c nw">화면을 보지 말고, 귀로만 들어 보세요</div>`),

  // 듣는 법 — 신호음 세 가지(글래스 타임라인 카드 3장, 단색 동그라미 PPT 탈피)
  'cut-01-signals': page(1920, 1080, `.bg-grad{position:absolute;inset:0;background:radial-gradient(circle at 82% 20%, rgba(76,141,246,.22), transparent 46%),radial-gradient(circle at 15% 85%, rgba(255,210,26,.14), transparent 48%),linear-gradient(145deg,#0B1120 0%,#10192D 100%)}
.t{position:absolute;left:180px;top:128px;font-family:'BlackHan',sans-serif;font-size:84px;color:#F8FAFC;letter-spacing:-2px}
.sub{position:absolute;left:184px;top:224px;font-family:'IBMBold',sans-serif;font-size:38px;color:#94A3B8}
.rail{position:absolute;left:242px;top:365px;width:4px;height:520px;background:linear-gradient(180deg,#FFD21A 0%,#F8FAFC 50%,#4C8DF6 100%);opacity:.45}
.card{position:absolute;left:180px;right:180px;height:168px;display:flex;align-items:center;gap:42px;padding:0 42px;background:rgba(15,23,42,.72);border:1.5px solid rgba(255,255,255,.12);border-radius:24px;box-shadow:0 14px 36px rgba(0,0,0,.35)}
.ic{width:116px;height:116px;border-radius:26px;display:flex;align-items:center;justify-content:center;font-family:'BlackHan',sans-serif;font-size:56px;color:#0A0F1C;flex:none;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.txt{display:flex;flex-direction:column;gap:6px}
.main{font-family:'GothicA1',sans-serif;font-size:54px;font-weight:900;color:#F8FAFC;letter-spacing:-1.5px}
.hint{font-family:'IBMBold',sans-serif;font-size:36px;color:#94A3B8}`,
  `<div class="bg-grad"></div>${MARK}<div class="t nw">소리 신호 세 가지</div><div class="sub nw">화면을 안 보셔도, 이 소리만 따라오시면 됩니다</div><div class="rail"></div>
<div class="card" style="top:312px;border-left:8px solid #FFD21A"><div class="ic" style="background:#FFD21A">띵</div><div class="txt"><span class="main nw">영어가 나옵니다</span><span class="hint nw">처음 들을 땐 일부러 글자를 숨겨 둡니다</span></div></div>
<div class="card" style="top:514px;border-left:8px solid #F8FAFC"><div class="ic" style="background:#F8FAFC">뽁</div><div class="txt"><span class="main nw">따라 말할 차례</span><span class="hint nw">지하철에서는 입속으로만 따라 하셔도 OK</span></div></div>
<div class="card" style="top:716px;border-left:8px solid #4C8DF6"><div class="ic" style="background:#4C8DF6">종</div><div class="txt"><span class="main nw">장이 바뀝니다</span><span class="hint nw">길 · 가게 · 처음 만난 사람 · 여행지 · 친한 사이</span></div></div>`),

  // 장 바뀜 — 1장 표지
  'cut-02-ch1-title': page(1920, 1080, `.scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,11,20,.88) 0%,rgba(7,11,20,.58) 54%,rgba(7,11,20,.15) 100%)}
.ghost{position:absolute;right:90px;bottom:24px;font-family:'ArchivoBlack',sans-serif;font-size:380px;line-height:1;color:${CH[1].color};opacity:.16}
.chip{position:absolute;left:130px;top:250px;background:${CH[1].color};color:#080D18;font-family:'DoHyeon',sans-serif;font-size:48px;padding:8px 28px;border-radius:14px}
.h{position:absolute;left:126px;top:356px;font-family:'BlackHan',sans-serif;font-size:176px;color:#F8FAFC;letter-spacing:-5px;line-height:1;text-shadow:0 12px 30px rgba(0,0,0,.5)}
.line{position:absolute;left:130px;top:594px;width:180px;height:10px;border-radius:5px;background:${CH[1].color}}
.r{position:absolute;left:130px;top:640px;font-family:'IBMBold',sans-serif;font-size:60px;color:#E2E8F0;letter-spacing:-1.5px}`,
  `${sceneBg(1, {blur: 1, dark: 0.72})}<div class="scrim"></div><div class="ghost nw">01</div>${MARK}<div class="chip nw">CHAPTER 01</div><div class="h nw">길에서</div><div class="line"></div><div class="r nw">작은 말은 원래 작다 — 크게 들리는 두 군데만</div>`),

  // 첫 듣기 — 영어 글자 숨김
  'cut-03-q-hidden': page(1920, 1080, `.w{position:absolute;left:0;right:0;top:320px;display:flex;justify-content:center}
.c{position:absolute;left:0;right:0;top:770px;text-align:center;font-family:'IBMBold',sans-serif;font-size:56px;color:#E2E8F0;text-shadow:0 4px 16px rgba(0,0,0,.65)}`,
  `${sceneBg(1, {blur: 3, dark: 0.48})}${MARK}${prog(1, 1)}<div class="w">${glowWave(1320, 360, CH[1].color, 72, 13)}</div><div class="c nw">귀로만 먼저 들어 보세요</div>`),

  // 다시 듣기 — 사운드 스테이지 카드 + Archivo Black / Outfit 대비
  'cut-04-q-reveal': page(1920, 1080, `.stage{position:absolute;left:120px;right:120px;top:210px;bottom:140px;background:rgba(9,14,26,.78);border:1.5px solid rgba(255,255,255,.14);border-top:6px solid ${CH[1].color};border-radius:30px;box-shadow:0 24px 60px rgba(0,0,0,.52);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:40px}
.s{display:flex;justify-content:center;align-items:baseline;gap:26px}
.sm{font-family:'Outfit',sans-serif;font-size:58px;font-weight:600;color:#CBD5E1}
.big{font-family:'ArchivoBlack',sans-serif;font-size:132px;letter-spacing:-3px;line-height:1;color:#F8FAFC}
.m{font-family:'GothicA1',sans-serif;font-size:74px;font-weight:900;color:#F8FAFC;letter-spacing:-2px}
.k{font-family:'IBMBold',sans-serif;font-size:48px;color:#FFD21A;background:rgba(255,210,26,.12);border:1.5px solid rgba(255,210,26,.4);padding:10px 30px;border-radius:999px}`,
  `${sceneBg(1, {blur: 3, dark: 0.56})}${MARK}${prog(1, 1)}<div class="stage">
<div class="s"><span class="sm nw">how do I</span><span class="big nw" style="color:#FFD21A">get</span><span class="sm nw">to</span><span class="big nw">Seoul Station?</span></div>
<div class="m nw">서울역 어떻게 가요?</div><div class="k nw">[겟 · 서울 스테이션] 두 군데만 크게</div></div>`),

  // 고유 코너 — 두 단어만 남기기(명도 확보 + 선명한 빨간 사선 취소선)
  'cut-05-two-words': page(1920, 1080, `.stage{position:absolute;left:120px;right:120px;top:190px;bottom:140px;background:rgba(9,14,26,.82);border:1.5px solid rgba(255,255,255,.16);border-top:6px solid #FFD21A;border-radius:30px;box-shadow:0 24px 60px rgba(0,0,0,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;padding:40px}
.badge{background:#FFD21A;color:#080D18;font-family:'DoHyeon',sans-serif;font-size:46px;padding:8px 30px;border-radius:999px}
.s{display:flex;justify-content:center;align-items:baseline;gap:28px}
.gone{position:relative;font-family:'Outfit',sans-serif;font-size:58px;font-weight:600;color:#94A3B8}
.gone:after{content:'';position:absolute;left:-6px;right:-6px;top:52%;height:6px;background:#EF4444;border-radius:3px;transform:rotate(-5deg)}
.big{font-family:'ArchivoBlack',sans-serif;font-size:132px;letter-spacing:-3px;line-height:1;color:#F8FAFC}
.m{font-family:'GothicA1',sans-serif;font-size:66px;font-weight:900;color:#F8FAFC;letter-spacing:-2px}`,
  `${sceneBg(1, {blur: 4, dark: 0.52})}${MARK}${prog(1, 1)}<div class="stage"><div class="badge nw">고유 코너 · 두 단어만 남기기</div>
<div class="s"><span class="gone nw">how do I</span><span class="big nw" style="color:#FFD21A">get</span><span class="gone nw">to</span><span class="big nw">Seoul Station?</span></div>
<div class="m nw">이것만 들어도 뜻이 바로 통합니다</div></div>`),

  // 3장 — 섞이는 소리(디쥬) 다시 듣기(3장 실사 + 노선 색)
  'cut-06-ch3-reveal': page(1920, 1080, `.stage{position:absolute;left:120px;right:120px;top:210px;bottom:140px;background:rgba(9,14,26,.78);border:1.5px solid rgba(255,255,255,.14);border-top:6px solid ${CH[3].color};border-radius:30px;box-shadow:0 24px 60px rgba(0,0,0,.52);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;padding:40px}
.s{display:flex;justify-content:center;align-items:baseline;gap:30px}
.sm{font-family:'Outfit',sans-serif;font-size:62px;font-weight:600;color:#CBD5E1}
.big{font-family:'ArchivoBlack',sans-serif;font-size:144px;letter-spacing:-3px;line-height:1;color:#F8FAFC}
.mix{font-family:'ArchivoBlack',sans-serif;font-size:144px;color:${CH[3].color};letter-spacing:-3px;line-height:1}
.m{font-family:'GothicA1',sans-serif;font-size:74px;font-weight:900;color:#F8FAFC;letter-spacing:-2px}
.k{font-family:'IBMBold',sans-serif;font-size:48px;color:${CH[3].color};background:rgba(242,140,40,.14);border:1.5px solid rgba(242,140,40,.45);padding:10px 30px;border-radius:999px}`,
  `${sceneBg(3, {blur: 3, dark: 0.56})}${MARK}${prog(3, 1)}<div class="stage">
<div class="s"><span class="mix nw">Did you</span><span class="sm nw">just</span><span class="big nw">move in?</span></div>
<div class="m nw">막 이사 오셨어요?</div><div class="k nw">[디쥬] 드 + 유 → 쥬</div></div>`),

  // 2부 몰아 듣기 — 심야 오디오 라운지(단색 PPT 탈피)
  'cut-07-part2': page(1920, 1080, `.bg-lounge{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 35%, rgba(46,184,114,.2), transparent 55%),radial-gradient(ellipse at 20% 85%, rgba(76,141,246,.16), transparent 50%),linear-gradient(180deg,#0A101E 0%,#0E1729 100%)}
.pill{position:absolute;right:64px;top:38px;background:rgba(15,23,42,.82);border:1.5px solid rgba(255,255,255,.16);border-radius:999px;padding:10px 26px;font-family:'DoHyeon',sans-serif;font-size:36px;color:#FFD21A}
.stage{position:absolute;left:140px;right:140px;top:200px;bottom:190px;background:rgba(15,23,42,.62);border:1.5px solid rgba(255,255,255,.12);border-radius:32px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;box-shadow:0 24px 60px rgba(0,0,0,.45)}
.q{font-family:'ArchivoBlack',sans-serif;font-size:112px;color:#F8FAFC;letter-spacing:-2px;line-height:1}
.m{font-family:'IBMBold',sans-serif;font-size:66px;color:#CBD5E1;letter-spacing:-1.5px}
.a{font-family:'Outfit',sans-serif;font-size:84px;font-weight:800;color:${CH[2].color};letter-spacing:-1px}
.w{position:absolute;left:140px;right:140px;bottom:112px;opacity:.22;display:flex;justify-content:center}
.bar{position:absolute;left:140px;right:140px;bottom:76px;height:14px;border-radius:7px;background:rgba(255,255,255,.12);overflow:hidden}
.bar i{position:absolute;left:0;top:0;bottom:0;width:27%;border-radius:7px;background:linear-gradient(90deg,#FFD21A,${CH[2].color})}`,
  `<div class="bg-lounge"></div>${MARK}<div class="pill nw">2부 1회차 · 8 / 30</div>
<div class="stage"><div class="q nw">Can I pay by card?</div><div class="m nw">카드로 계산해도 돼요?</div><div class="a nw">Sure, go ahead.</div></div>
<div class="w">${wave(1560, 56, '#94A3B8', 96, 21)}</div><div class="bar"><i></i></div>`),

  // 끝 — 엔드 화면 9초, 중앙 비움
  'cut-08-end': page(1920, 1080, `.bg-end{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%, rgba(76,141,246,.14), transparent 60%),#0A101E}
.n{position:absolute;left:0;right:0;top:52px;text-align:center;font-family:'IBMBold',sans-serif;font-size:40px;color:#94A3B8}`,
  `<div class="bg-end"></div>${MARK}<div class="n nw">(엔드 화면 자리 — 가운데 비움)</div>`),

  // 1부 정리 — 지하철 환승 노선도 모티브 5단 캡처 카드
  'cut-09-summary': page(1920, 1080, `.bg-sum{position:absolute;inset:0;background:radial-gradient(circle at 85% 15%, rgba(169,123,232,.18), transparent 44%),radial-gradient(circle at 12% 88%, rgba(76,141,246,.18), transparent 44%),linear-gradient(145deg,#0A101E 0%,#101A2E 100%)}
.t{position:absolute;left:160px;top:110px;font-family:'BlackHan',sans-serif;font-size:80px;color:#F8FAFC;letter-spacing:-2px}
.sub{position:absolute;right:160px;top:138px;font-family:'DoHyeon',sans-serif;font-size:38px;color:#FFD21A;background:rgba(255,210,26,.12);border:1.5px solid rgba(255,210,26,.45);padding:6px 22px;border-radius:999px}
.rail{position:absolute;left:222px;top:276px;width:6px;height:660px;background:linear-gradient(180deg,${CH[1].color},${CH[2].color},${CH[3].color},${CH[4].color},${CH[5].color});border-radius:3px}
.row{position:absolute;left:160px;right:160px;height:122px;display:flex;align-items:center;gap:34px;padding:0 34px;background:rgba(15,23,42,.74);border:1.5px solid rgba(255,255,255,.11);border-radius:20px;box-shadow:0 10px 26px rgba(0,0,0,.32)}
.dot{width:118px;border-radius:14px;padding:8px 0;text-align:center;font-family:'DoHyeon',sans-serif;font-size:44px;color:#080D18;flex:none}
.name{font-family:'GothicA1',sans-serif;font-size:48px;font-weight:900;color:#F8FAFC;min-width:290px}
.rule{font-family:'IBMBold',sans-serif;font-size:46px;color:#CBD5E1}`,
  `<div class="bg-sum"></div>${MARK}<div class="t nw">다섯 장, 다섯 가지 소리</div><div class="sub nw">캡처용 요약</div><div class="rail"></div>${[1, 2, 3, 4, 5].map((c, i) => `<div class="row" style="top:${236 + i * 150}px;border-left:7px solid ${CH[c].color}"><div class="dot nw" style="background:${CH[c].color}">${c}장</div><span class="name nw">${CH[c].name}</span><span class="rule nw">${CH[c].rule}</span></div>`).join('')}`),
};

// 2~5장 표지와 첫 듣기 화면 — 2~5장 실제 시네마틱 사진 + 고유 노선 색
for (const c of [2, 3, 4, 5]) {
  CUTS[`cut-1${c}-ch${c}-title`] = page(1920, 1080, `.scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,11,20,.88) 0%,rgba(7,11,20,.58) 54%,rgba(7,11,20,.15) 100%)}
.ghost{position:absolute;right:90px;bottom:24px;font-family:'ArchivoBlack',sans-serif;font-size:380px;line-height:1;color:${CH[c].color};opacity:.16}
.chip{position:absolute;left:130px;top:250px;background:${CH[c].color};color:#080D18;font-family:'DoHyeon',sans-serif;font-size:48px;padding:8px 28px;border-radius:14px}
.h{position:absolute;left:126px;top:356px;font-family:'BlackHan',sans-serif;font-size:170px;color:#F8FAFC;letter-spacing:-5px;line-height:1;text-shadow:0 12px 30px rgba(0,0,0,.5)}
.line{position:absolute;left:130px;top:594px;width:180px;height:10px;border-radius:5px;background:${CH[c].color}}
.r{position:absolute;left:130px;top:640px;font-family:'IBMBold',sans-serif;font-size:60px;color:#E2E8F0;letter-spacing:-1.5px}`,
  `${sceneBg(c, {blur: 1, dark: 0.72})}<div class="scrim"></div><div class="ghost nw">0${c}</div>${MARK}<div class="chip nw">CHAPTER 0${c}</div><div class="h nw">${CH[c].name}</div><div class="line"></div><div class="r nw">${CH[c].rule}</div>`);
  CUTS[`cut-2${c}-ch${c}-hidden`] = page(1920, 1080, `.w{position:absolute;left:0;right:0;top:320px;display:flex;justify-content:center}
.c{position:absolute;left:0;right:0;top:770px;text-align:center;font-family:'IBMBold',sans-serif;font-size:56px;color:#E2E8F0;text-shadow:0 4px 16px rgba(0,0,0,.65)}`,
  `${sceneBg(c, {blur: 3, dark: 0.48})}${MARK}${prog(c, 1)}<div class="w">${glowWave(1320, 360, CH[c].color, 72, 13 + c)}</div><div class="c nw">귀로만 먼저 들어 보세요</div>`);
}

const browser = await chromium.launch();
const shot = async (html, w, h, file, type) => {
  const p = await browser.newPage({viewport: {width: w, height: h}});
  await p.setContent(html, {waitUntil: 'load'});
  await p.evaluate(() => document.fonts.ready);
  // 글자 넘침 검사: nowrap 요소가 화면 밖으로 나가면 알린다
  const over = await p.evaluate(([W, H]) => [...document.querySelectorAll('.nw')].filter((e) => {
    const r = e.getBoundingClientRect();
    return r.left < 0 || r.right > W || r.top < 0 || r.bottom > H;
  }).map((e) => e.textContent.trim().slice(0, 30)), [w, h]);
  await p.screenshot({path: file, type, ...(type === 'jpeg' ? {quality: 88} : {})});
  await p.close();
  return over;
};
const problems = [];
for (const [k, html] of Object.entries(THUMBS)) {
  const over = await shot(html, 1280, 720, join(OUT, `thumb-${k}.jpg`), 'jpeg');
  if (over.length) problems.push(`thumb-${k}: 넘침 ${over.join(' / ')}`);
}
for (const [k, html] of Object.entries(CUTS)) {
  const over = await shot(html, 1920, 1080, join(OUT, 'cuts', `${k}.jpg`), 'jpeg');
  if (over.length) problems.push(`${k}: 넘침 ${over.join(' / ')}`);
}
// 200px 폭·흑백 미리보기(썸네일 세 장 나란히)
const strip = page(1420, 460, `body{background:#fff;color:#111}.r{display:flex;gap:24px;padding:20px}.c{text-align:center;font-size:20px;font-weight:700}`,
  `<div class="r">${['A', 'B', 'C'].map((k) => `<div class="c"><img src="data:image/jpeg;base64,${readFileSync(join(OUT, `thumb-${k}.jpg`)).toString('base64')}" width="200"><div>${k} 200px</div></div>`).join('')}
${['A', 'B', 'C'].map((k) => `<div class="c"><img src="data:image/jpeg;base64,${readFileSync(join(OUT, `thumb-${k}.jpg`)).toString('base64')}" width="200" style="filter:grayscale(1)"><div>${k} 흑백</div></div>`).join('')}</div>`);
await shot(strip, 1420, 220, join(OUT, 'raw', 'thumb-check-200px.jpg'), 'jpeg');
await browser.close();
console.log(problems.length ? `문제 ${problems.length}건\n${problems.join('\n')}` : '넘침 0건');
console.log(`썸네일 3장 + 화면 시안 ${Object.keys(CUTS).length}장 → ${OUT}`);
