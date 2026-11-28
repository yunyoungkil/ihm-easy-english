// EP38 시트용 썸네일 3장 + 컷 카드를 HTML로 그려 격리 크롬으로 찍는다.
// 글자 표기: [ab] = 모음 동그라미(묶음), {abcd} = 네모 묶음(tion), ~e~ = 소리 안 남(흐린 줄), <abcde> = 불 켜진 글자(첫 장면)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const repo = 'c:/Users/yunyo/.gemini/antigravity-ide/scratch/ihm-easy-english';
const require = createRequire(path.join(repo, 'package.json'));
const { chromium } = require('playwright');
const OUT = path.join(repo, 'data/youtube/transform-sheets/images/ep38-long-words-beats');
const IMG = path.join(repo, 'videos/ep38-long-words-beats/assets/images');
const FONT = (f) => 'file:///' + path.join(repo, 'public/fonts/google', f).replace(/\\/g, '/');
const bg = (name) => {
  for (const ext of ['.jpg', '.png']) { const p = path.join(IMG, name + ext); if (fs.existsSync(p)) return 'file:///' + p.replace(/\\/g, '/'); }
  return null;
};
fs.mkdirSync(path.join(OUT, 'cuts'), { recursive: true });

const css = `
@font-face{font-family:'Barlow C';src:url('${FONT('BarlowCondensed-ExtraBold.ttf')}');font-weight:800}
@font-face{font-family:'Barlow C';src:url('${FONT('BarlowCondensed-Bold.ttf')}');font-weight:700}
@font-face{font-family:'GothicA1';src:url('${FONT('GothicA1-Black.ttf')}');font-weight:900}
@font-face{font-family:'Plex KR';src:url('${FONT('IBMPlexSansKR-Bold.ttf')}');font-weight:700}
@font-face{font-family:'Plex KR';src:url('${FONT('IBMPlexSansKR-Medium.ttf')}');font-weight:500}
@font-face{font-family:'Caveat';src:url('${FONT('Caveat-VF.ttf')}')}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000}
.f{position:relative;overflow:hidden;background:#F4EFE6;color:#151515}
.photo{position:absolute;inset:0;background-size:cover;background-position:center}
.ko{font-family:'GothicA1';font-weight:900;letter-spacing:-0.02em}
.body{font-family:'Plex KR';font-weight:700}
.en{font-family:'Barlow C';font-weight:800;letter-spacing:0.01em;text-transform:uppercase}
.mk{font-family:'Caveat';font-weight:700;color:#E8452C}
.word{display:inline-flex;align-items:flex-end;white-space:nowrap}
.word span{position:relative;display:inline-block}
.word .c::after{content:'';position:absolute;left:-10%;right:-10%;top:4%;bottom:-2%;border:0.075em solid #E8452C;border-radius:50%;transform:rotate(-5deg)}
.word .b::after{content:'';position:absolute;left:-4%;right:-4%;top:2%;bottom:-4%;border:0.07em solid #2F6FDB;border-radius:0.12em;transform:rotate(-1.5deg)}
.word .m{opacity:.28}
.word .m::after{content:'';position:absolute;left:-8%;right:-8%;top:52%;height:0.07em;background:#151515;transform:rotate(-12deg)}
.word .dim{opacity:.22}
.word .lit{color:#151515;text-shadow:0 0 .25em rgba(255,212,59,.95)}
.stack{display:flex;flex-direction:column;align-items:flex-start;line-height:.86}
.stack .s{font-family:'Barlow C';font-weight:800;text-transform:uppercase;color:#151515;padding:0 .08em}
.stack .s.hi{background:#FFD43B}
.chip{display:inline-block;font-family:'Plex KR';font-weight:700;background:#151515;color:#F4EFE6;border-radius:999px;padding:.18em .7em;white-space:nowrap}
.dots{display:inline-flex;gap:.35em}
.dots i{display:inline-block;width:1em;height:1em;border-radius:50%;background:#151515}
.dots i.o{background:transparent;border:.12em solid #151515}
.dots i.h{background:#E8452C}
.sub{position:absolute;left:0;right:0;bottom:0;padding:22px 60px 26px;background:linear-gradient(transparent,rgba(0,0,0,.72));color:#fff;font-family:'Plex KR';font-weight:700;font-size:44px;line-height:1.3;text-align:center;white-space:nowrap}
.step{position:absolute;left:44px;top:36px;font-family:'Plex KR';font-weight:700;font-size:30px;background:#F4EFE6;color:#151515;border:3px solid #151515;border-radius:999px;padding:4px 20px}
.card{position:absolute;background:#F4EFE6;border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.35)}
.src{position:absolute;right:28px;bottom:110px;font-family:'Plex KR';font-weight:500;font-size:20px;color:#fff;opacity:.85}
`;

// 글자 표기 → span
function word(spec, size, extra = '') {
  let html = '', mode = null, buf = '';
  const flush = (cls) => { for (const ch of buf) html += `<span class="${cls}">${ch}</span>`; buf = ''; };
  const open = { '[': 'c', '{': 'b', '~': 'm', '<': 'lit', '^': 'dim' }, close = { ']': 'c', '}': 'b', '~': 'm', '>': 'lit', '^': 'dim' };
  let group = '';
  for (const ch of spec) {
    if (mode === null && open[ch] !== undefined) { flush(''); mode = open[ch]; group = ''; continue; }
    if (mode !== null && close[ch] === mode) { html += `<span class="${mode}">${group}</span>`; mode = null; continue; }
    if (mode !== null) group += ch; else buf += ch;
  }
  flush('');
  // 불 켜짐 뒤 글자는 흐리게
  return `<span class="word en ${extra}" style="font-size:${size}px">${html}</span>`;
}
const stack = (parts, hi, size) => `<div class="stack">${parts.map((p, i) => `<div class="s ${i === hi ? 'hi' : ''}" style="font-size:${i === hi ? size * 1.18 : size}px">${p}</div>`).join('')}</div>`;
const dots = (n, size, cls = '') => `<span class="dots" style="font-size:${size}px">${Array.from({ length: n }, () => `<i class="${cls}"></i>`).join('')}</span>`;
const photo = (name, extra = '') => { const u = bg(name); return u ? `<div class="photo" style="background-image:url('${u}');${extra}"></div>` : `<div class="photo" style="background:#cfc6b8;${extra}"></div>`; };

const W = 1280, H = 720;
const frames = [];
const add = (file, inner, w = W, h = H) => frames.push({ file, html: `<div class="f" style="width:${w}px;height:${h}px">${inner}</div>`, w, h });

// ---------- 썸네일 ----------
// A: 박자 쌓기 포스터 + 첫 장면 사진
add('thumb-A.jpg', `
${photo('hook-box', 'filter:saturate(.9) brightness(.92);width:620px')}
<div style="position:absolute;left:0;top:0;width:640px;height:720px;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,0) 58%,rgba(0,0,0,.62) 100%)"></div>
<div style="position:absolute;left:300px;top:370px;transform:translate(-50%,-50%) rotate(-21deg)">${word('<INSTR>^UCTIONS^', 50, '')}</div>
<div style="position:absolute;left:640px;top:0;right:0;bottom:0;background:#F4EFE6"></div>
<div style="position:absolute;left:672px;top:58px">${stack(['in', 'struc', 'tions'], 1, 168)}</div>
<div style="position:absolute;left:40px;top:34px" class="ko"><span style="font-size:66px;color:#fff;-webkit-text-stroke:2px #151515;paint-order:stroke;text-shadow:0 4px 0 #151515">12글자인데</span></div>
<div style="position:absolute;left:40px;top:560px" class="ko"><span style="font-size:96px;color:#FFD43B;-webkit-text-stroke:3px #151515;paint-order:stroke;text-shadow:0 5px 0 #151515">손뼉 세 번</span></div>
`);
// B: 영양제 통 사진 + 상황 이름 한 낱말
add('thumb-B.jpg', `
${photo('table-supplement', 'filter:saturate(1.05)')}
<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.15) 55%,rgba(0,0,0,0) 100%)"></div>
<div class="card" style="left:700px;top:150px;width:520px;padding:34px 30px;transform:rotate(-3deg)">${word('S[U]PPL[E]M[E]NT', 104)}<div style="margin-top:22px">${dots(3, 40, 'h')}</div></div>
<div style="position:absolute;left:46px;top:70px" class="ko"><span style="font-size:58px;color:#fff">영양제 뒷면 영어</span></div>
<div style="position:absolute;left:40px;top:420px" class="ko"><span style="font-size:150px;color:#fff;-webkit-text-stroke:4px #151515;paint-order:stroke;text-shadow:0 6px 0 #151515;white-space:nowrap">라벨 울렁증</span></div>
`);
// C: 글자 수 착시 대결 (답 없음)
add('thumb-C.jpg', `
<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div style="position:absolute;left:0;top:0;width:640px;height:720px;background:#151515"></div>
<div style="position:absolute;left:44px;top:130px;color:#F4EFE6">${word('STRENGTHS', 128)}</div>
<div style="position:absolute;left:66px;top:300px"><span class="chip" style="font-size:40px;background:#F4EFE6;color:#151515">9글자</span></div>
<div style="position:absolute;left:700px;top:130px">${word('BANANA', 128)}</div>
<div style="position:absolute;left:706px;top:300px"><span class="chip" style="font-size:40px">6글자</span></div>
<div style="position:absolute;left:0;right:0;top:450px;text-align:center" class="ko"><span style="font-size:112px;color:#FFD43B;-webkit-text-stroke:4px #151515;paint-order:stroke;text-shadow:0 6px 0 #151515">박자가 더 많은 쪽은?</span></div>
`);

// ---------- 컷 카드 (16:9, 시트 미리보기) ----------
const cut = (file, inner) => add('cuts/' + file, inner);
cut('cut-00-hook.jpg', `${photo('hook-box')}
<div style="position:absolute;left:640px;top:360px;transform:translate(-50%,-50%) rotate(-21deg)">${word('<INSTR>^UCTIONS^', 66)}</div>
<div class="sub">알파벳은 다 아는데, 막상 읽으려면 입이 멈춰요</div>`);
cut('cut-01-three-claps.jpg', `${photo('hook-box', 'filter:brightness(.75)')}
<div class="card" style="left:240px;top:150px;width:800px;padding:40px 50px;text-align:center">${word('INSTRUCTIONS', 120)}<div style="margin-top:30px">${dots(3, 56)}</div></div>
<div class="sub">손뼉 한 번에 소리 한 번 — 이걸 박자라고 부를게요</div>`);
cut('cut-02-quiz.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div><div style="position:absolute;left:0;top:0;width:640px;height:720px;background:#151515"></div>
<div style="position:absolute;left:70px;top:150px;color:#F4EFE6">${word('STRENGTHS', 130)}</div><div style="position:absolute;left:76px;top:320px"><span class="chip" style="font-size:36px;background:#F4EFE6;color:#151515">글자 9 · 박자 ?</span></div>
<div style="position:absolute;left:720px;top:150px">${word('BANANA', 130)}</div><div style="position:absolute;left:726px;top:320px"><span class="chip" style="font-size:36px">글자 6 · 박자 ?</span></div>
<div class="sub">두 단어 가운데 박자가 더 많은 쪽은?</div>`);
cut('cut-03-quiz-answer.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div><div style="position:absolute;left:0;top:0;width:640px;height:720px;background:#151515"></div>
<div style="position:absolute;left:70px;top:150px;color:#F4EFE6">${word('STRENGTHS', 130)}</div><div style="position:absolute;left:76px;top:330px;color:#F4EFE6">${dots(1, 60, 'h')}</div>
<div style="position:absolute;left:720px;top:150px">${word('BANANA', 130)}</div><div style="position:absolute;left:726px;top:330px">${dots(3, 60)}</div>
<div class="sub">아홉 글자를 다 써 놓고 박자는 하나</div>`);
cut('cut-04-idea.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div style="position:absolute;left:0;right:0;top:170px;text-align:center">${word('IDEA', 220)}</div>
<div style="position:absolute;left:0;right:0;top:430px;text-align:center"><span class="chip" style="font-size:40px">글자 4</span> &nbsp; ${dots(3, 50)} <span class="mk" style="font-size:80px">?</span></div>
<div class="sub">네 글자에 박자는 셋 — 이 단어는 뒤에서 다시</div>`);
cut('cut-05-vowels.jpg', `${photo('mart-strawberry', 'filter:blur(7px) brightness(.95);transform:scale(1.05)')}
<div class="step">첫째 걸음 · 모음 덩어리 세기</div>
<div class="card" style="left:320px;top:120px;width:640px;padding:18px 30px;text-align:center">${word('A·E·I·O·U', 96)} <span class="mk" style="font-size:70px">+ y</span></div>
<div class="sub">박자마다 모음 소리가 꼭 하나씩 들어 있어요</div>`);
cut('cut-06-strawberry.jpg', `${photo('mart-strawberry', 'filter:blur(7px) brightness(.8);transform:scale(1.05)')}
<div class="step">첫째 걸음 · 모음 덩어리 세기</div>
<div class="card" style="left:190px;top:190px;width:900px;padding:40px 40px;text-align:center">${word('STR[A]WB[E]RR[Y]', 130)}<div style="margin-top:26px"><span class="mk" style="font-size:64px">1 · 2 · 3</span></div></div>
<div class="sub">동그라미 셋에 손뼉도 셋</div>`);
cut('cut-07-toothpaste.jpg', `${photo('bath-toothpaste', 'filter:brightness(.82)')}
<div class="step">첫째 걸음 · 모음 덩어리 세기</div>
<div class="card" style="left:170px;top:190px;width:940px;padding:40px 40px;text-align:center">${word('T[OO]THP[A]ST~E~', 128)}<div style="margin-top:26px">${dots(2, 52)}</div></div>
<div class="sub">붙은 모음은 하나로, 맨 끝의 e는 빼요 → 박자 둘</div>`);
cut('cut-08-stress.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div class="step" style="background:#FFD43B">둘째 걸음 · 힘주는 박자 하나</div>
<div style="position:absolute;left:420px;top:110px">${stack(['straw', 'ber', 'ry'], 0, 150)}</div>
<div class="sub">하나만 세게, 나머지는 작게</div>`);
cut('cut-09-instructions-count.jpg', `${photo('hook-box', 'filter:brightness(.7)')}
<div class="card" style="left:150px;top:180px;width:980px;padding:40px 40px;text-align:center">${word('[I]NSTR[U]C{TION}S', 124)}<div style="margin-top:24px">${dots(3, 52)}</div></div>
<div class="sub">끝에 붙은 네 글자는 대부분 '션' 소리 — 박자 셋</div>`);
cut('cut-10-instructions-stress.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div class="step" style="background:#FFD43B">둘째 걸음 · 힘주는 박자 하나</div>
<div style="position:absolute;left:150px;top:120px">${stack(['in', 'struc', 'tions'], 1, 140)}</div>
<div class="card" style="left:690px;top:230px;width:520px;padding:28px 30px"><div class="body" style="font-size:40px;line-height:1.4">'션' 묶음이 붙으면<br><span style="background:#FFD43B">바로 앞 박자</span>에 힘</div></div>
<div class="sub">세 박자 가운데 어디에 힘이 갈까요?</div>`);
cut('cut-11-conditioner.jpg', `${photo('bath-conditioner', 'filter:brightness(.8)')}
<div class="card" style="left:120px;top:110px;width:520px;padding:30px 40px">${stack(['con', 'di', 'tion', 'er'], 1, 96)}</div>
<div class="card" style="left:700px;top:200px;width:460px;padding:30px 36px;text-align:center">${word('VACATION', 96)}<div style="margin-top:20px">${dots(3, 40, 'o')} <span class="mk" style="font-size:64px">?</span></div></div>
<div class="sub">그럼 이 단어는 어디에 힘이 갈까요?</div>`);
cut('cut-12-ingredients.jpg', `${photo('snack-back', 'filter:brightness(.78)')}
<div class="step" style="background:#E8452C;color:#fff;border-color:#E8452C">셋째 걸음 · 어색하면 모음 바꿔 보기</div>
<div class="card" style="left:120px;top:170px;width:1040px;padding:34px 30px;text-align:center">${word('[I]NGR[E]D[IE]NTS', 112)}<div style="margin-top:22px"><span class="mk" style="font-size:56px">셋? → 넷</span> &nbsp; <span class="en" style="font-size:72px">in · <span style="background:#FFD43B">GRE</span> · di · ents</span></div></div>
<div class="sub">붙어 있던 두 모음이 따로 소리를 냈어요</div>`);
cut('cut-13-idea-again.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div style="position:absolute;left:0;right:0;top:150px;text-align:center"><span class="en" style="font-size:200px;font-family:'Barlow C';font-weight:800">I · <span style="background:#FFD43B">DE</span> · A</span></div>
<div class="src" style="color:#151515">Kearns, Reading Research Quarterly (2020) · 소개: dyslexiahelp.umich.edu</div>
<div class="sub">한 번에 안 맞으면 모음 하나만 바꿔서 한 번 더</div>`);
cut('cut-14-basket.jpg', `<div style="position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr">
${['laundry-detergent', 'table-supplement', 'vanity-lotion', 'street-pharmacy'].map((n) => `<div style="position:relative">${photo(n)}</div>`).join('')}</div>
<div style="position:absolute;left:0;right:0;top:300px;text-align:center"><span class="chip" style="font-size:44px;background:#FFD43B;color:#151515">동그라미부터 세 보세요 · 3초</span></div>
<div class="sub">이제 직접 해 볼게요</div>`);
cut('cut-15-detergent.jpg', `${photo('laundry-detergent', 'filter:brightness(.8)')}
<div class="card" style="left:200px;top:170px;width:880px;padding:36px 40px;text-align:center">${word('D[E]T[E]RG[E]NT', 124)}<div style="margin-top:20px"><span class="en" style="font-size:72px">de · <span style="background:#FFD43B">TER</span> · gent</span></div></div>
<div class="sub">박자 셋, 가운데에 힘</div>`);
cut('cut-16-pharmacy.jpg', `${photo('street-pharmacy', 'filter:brightness(.85)')}
<div class="card" style="left:260px;top:160px;width:760px;padding:36px 40px;text-align:center">${word('PH[A]RM[A]C[Y]', 124)}<div style="margin-top:20px"><span class="en" style="font-size:72px"><span style="background:#FFD43B">PHAR</span> · ma · cy</span></div></div>
<div class="sub">끝의 y도 한 박자를 맡아요</div>`);
cut('cut-17-return.jpg', `${photo('hook-box', 'filter:brightness(.7)')}
<div class="card" style="left:240px;top:170px;width:800px;padding:40px 50px;text-align:center">${word('INSTRUCTIONS', 120)}<div style="margin-top:30px">${dots(3, 56, 'h')}</div></div>
<div class="sub">처음에 입이 멈췄던 이 단어, 이제는 어떻게 보이세요?</div>`);
cut('cut-18-refrigerator.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div style="position:absolute;left:0;right:0;top:170px;text-align:center">${word('REFRIGERATOR', 150)}</div>
<div style="position:absolute;left:0;right:0;top:380px;text-align:center"><span class="chip" style="font-size:40px">글자 12</span> &nbsp; ${dots(5, 50)}</div>
<div class="sub">긴 단어가 다 박자가 적은 건 아니에요 — 그래도 다섯 번</div>`);
cut('cut-19-one-page.jpg', `<div style="position:absolute;inset:0;background:#151515"></div>
<div class="card" style="left:200px;top:80px;width:880px;padding:46px 56px">
<div class="body" style="font-size:52px;line-height:1.7">① 모음 덩어리에 동그라미<br>② <span style="background:#FFD43B">힘주는 박자</span> 하나<br>③ 어색하면 모음 바꿔 보기</div></div>`);
cut('cut-20-end.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div style="position:absolute;left:60px;top:60px;width:500px;height:280px;border:4px dashed #b8ad9c;border-radius:16px"></div>
<div style="position:absolute;right:60px;top:60px;width:500px;height:280px;border:4px dashed #b8ad9c;border-radius:16px"></div>
<div style="position:absolute;left:0;right:0;bottom:60px;text-align:center" class="body"><span style="font-size:40px">집에 있는 영어 라벨 하나, 동그라미부터</span></div>`);

// ---------- 백지 눈 검수 반영(2026-11-28): 같은 파일 이름은 나중 정의가 이긴다 ----------
add('thumb-B.jpg', `
${photo('table-supplement', 'filter:saturate(1.05)')}
<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.62) 0%,rgba(0,0,0,.25) 34%,rgba(0,0,0,0) 50%)"></div>
<div style="position:absolute;left:792px;top:425px;transform:translate(-50%,-50%)">${word('S[U]PPL[E]M[E]NT', 48)}</div>
<div style="position:absolute;left:40px;top:30px" class="ko"><span style="font-size:150px;color:#fff;-webkit-text-stroke:4px #151515;paint-order:stroke;text-shadow:0 6px 0 #151515;white-space:nowrap">라벨 울렁증</span></div>
`);
add('thumb-C.jpg', `
<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div style="position:absolute;left:60px;top:80px">${word('STRENGTHS', 128)}</div>
<div style="position:absolute;left:66px;top:262px"><span class="chip" style="font-size:40px">9글자</span></div>
<div style="position:absolute;left:640px;top:250px;transform:translateX(-50%)" class="mk"><span style="font-size:80px">vs</span></div>
<div style="position:absolute;right:70px;top:80px">${word('BANANA', 128)}</div>
<div style="position:absolute;right:76px;top:262px"><span class="chip" style="font-size:40px">6글자</span></div>
<div style="position:absolute;left:0;right:0;top:410px;height:210px;background:#151515"></div>
<div style="position:absolute;left:0;right:0;top:440px;text-align:center" class="ko"><span style="font-size:112px;color:#FFD43B;white-space:nowrap">박자가 더 많은 쪽은?</span></div>
`);
add('cuts/cut-13-idea-again.jpg', `<div style="position:absolute;inset:0;background:#F4EFE6"></div>
<div style="position:absolute;left:0;right:0;top:70px;text-align:center"><span class="en" style="font-size:150px;font-family:'Barlow C';font-weight:800;opacity:.45">I · DEA</span> <span class="mk" style="font-size:120px">✗</span></div>
<div style="position:absolute;left:0;right:0;top:270px;text-align:center"><span class="en" style="font-size:170px;font-family:'Barlow C';font-weight:800">I · <span style="background:#FFD43B">DE</span> · A</span> <span class="mk" style="font-size:120px;color:#2E8B57">✓</span></div>
<div class="src" style="color:#151515">Kearns, Reading Research Quarterly (2020) · 소개: dyslexiahelp.umich.edu</div>
<div class="sub">한 번에 안 맞으면 모음을 떼어서 한 번 더</div>`);
{ const seen = new Map(); frames.forEach((fr, i) => seen.set(fr.file, i)); const keep = frames.filter((fr, i) => seen.get(fr.file) === i); frames.length = 0; frames.push(...keep); }
// ---------- 찍기 ----------
const only = process.argv.slice(2);
const ctx = await chromium.launchPersistentContext(path.join(process.env.TEMP || '.', 'ep38-cards-profile'), { channel: 'chrome', headless: true });
const page = ctx.pages()[0] || await ctx.newPage();
for (const fr of frames) {
  if (only.length && !only.some((o) => fr.file.includes(o))) continue;
  await page.setViewportSize({ width: fr.w, height: fr.h });
  const tmpHtml = path.join(process.env.TEMP || '.', 'ep38-card.html');
  fs.writeFileSync(tmpHtml, `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${fr.html}</body></html>`);
  await page.goto('file:///' + tmpHtml.split(path.sep).join('/'), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  // 넘침 점검: 화면 밖으로 나간 글자
  const over = await page.evaluate(() => { const r = []; document.querySelectorAll('.word,.stack,.chip,.sub,.ko,.body,.card').forEach((e) => { const b = e.getBoundingClientRect(); if (b.right > innerWidth + 1 || b.bottom > innerHeight + 1 || b.left < -1) r.push(e.className + ' ' + Math.round(b.right) + 'x' + Math.round(b.bottom)); }); return r; });
  const out = path.join(OUT, fr.file);
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  console.log(fr.file, over.length ? 'OVERFLOW ' + over.join('; ') : 'ok');
}
await ctx.close();
