#!/usr/bin/env node
// EP28 쇼츠의 index.html을 만든다. 실제 음성 길이로 시각을 계산해 화면 시각과 소리를 맞춘다.
// 이 편만의 코너: "세어 보기 퀴즈". 원어민 단어를 빠르게 이어 들려주고 칸을 하나씩 채우며 "프라이팬이 몇 번인지" 세게 한다.
// 퀴즈를 두 번 낸다(프라이팬 → 아이돌 팬). 원리 설명은 퀴즈 사이에 끼운다.
// EP27·29 쇼츠는 반전형이고 이 편만 퀴즈형이다(2026-11-09 사용자 결정, 유형 비교용).
// 공통 바탕(글꼴, 자막 상자, 마지막 5초 안내)은 EP24~26 쇼츠와 같고 장면 구성은 이 파일에서 새로 짰다.
// 다 만든 뒤 배경음 더킹(carve)을 자동으로 다시 건다(EP24에서 다시 만들 때 더킹이 빠졌던 일 때문, 2026-11-07).
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const probe = (file) => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(root, file)], {encoding: 'utf8'}).stdout.trim();
const maxDb = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', join(root, file), '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  return +/max_volume: (-?[\d.]+) dB/.exec(r.stderr)[1];
};
const r3 = (n) => Math.round(n * 1000) / 1000;

// 원어민 소리는 파일마다 음량 차이가 커서 최고 음량을 나레이션에 가깝게 맞춘다(EP24~26과 같은 기준).
const NATIVE_PEAK_DB = -4;
const nativeGain = (file) => r3(Math.min(3.9, 10 ** ((NATIVE_PEAK_DB - maxDb(file)) / 20)));

const NATIVE = {fan: 'assets/voice/m_w01_fan.wav', pan: 'assets/voice/m_w02_pan.wav'};
const gains = Object.fromEntries(Object.entries(NATIVE).map(([k, f]) => [k, nativeGain(f)]));
const lens = Object.fromEntries(Object.entries(NATIVE).map(([k, f]) => [k, probe(f)]));

const audio = [];
const T = {};
let t = 0;
const native = (key, w, gap = 0) => {
  t += gap;
  audio.push({id: key, src: NATIVE[w], start: r3(t), dur: r3(lens[w]), volume: gains[w], group: true, track: audio.length % 2 ? 2 : 5});
  T[key] = r3(t);
  T[`${key}End`] = r3(t + lens[w]);
  t += lens[w];
};
const voice = (key, n, gap = 0) => {
  const src = `assets/voice/n${String(n).padStart(2, '0')}.wav`;
  const d = probe(src);
  t += gap;
  audio.push({id: key, src, start: r3(t), dur: r3(d), volume: 1, group: true, track: audio.length % 2 ? 1 : 6});
  T[key] = r3(t);
  T[`${key}End`] = r3(t + d);
  t += d;
};
const sfx = (key, file, at, volume) => audio.push({id: key, src: file, start: r3(at), dur: r3(probe(file)), volume, group: false, track: 3});

const THINK = 1.3;
const GAP = 0.08;
const AFTER_VOICE = -0.08;
const COUNT_GAP = 0.3; // 세어 보기에서 단어 사이 쉼. 이보다 길면 세는 게 아니라 하나씩 듣는 것이 된다.

const ROUND1 = ['fan', 'pan', 'fan', 'fan', 'pan']; // 프라이팬(pan)은 2번째, 5번째
const ROUND2 = ['pan', 'pan', 'fan', 'pan']; // 아이돌 팬(fan)은 3번째

// 1) 같은 글자 "팬"
voice('v1', 1, 0.1);
// 2) 첫 문제: 프라이팬은 몇 번?
voice('v2', 2, GAP);
ROUND1.forEach((w, i) => native(`a${i + 1}`, w, i === 0 ? 0.3 : COUNT_GAP));
T.th1 = r3(t + 0.05);
t += THINK;
voice('v3', 3, 0.05);
// 3) 원리: 입 모양
voice('v4', 4, GAP);
native('mp', 'pan', AFTER_VOICE);
voice('v5', 5, GAP);
native('mf', 'fan', AFTER_VOICE);
// 4) 두 번째 문제: 아이돌 팬은 몇 번?
voice('v6', 6, 0.1);
voice('v7', 7, GAP);
ROUND2.forEach((w, i) => native(`b${i + 1}`, w, i === 0 ? 0.3 : COUNT_GAP));
T.th2 = r3(t + 0.05);
t += THINK;
voice('v8', 8, 0.05);
// 5) 마지막 안내
T.cta = r3(t + 0.1);
voice('v9', 9, 0.25);
t += 0.6;
const TOTAL = r3(t);
T.total = TOTAL;

const SFX = {pop: 'assets/sfx/pop.mp3', tick: 'assets/sfx/click-soft.mp3', whoosh: 'assets/sfx/whoosh.mp3'};
for (const [k, th] of [['t1', T.th1], ['t2', T.th2]]) [0, 1, 2].forEach((i) => sfx(`${k}_${i + 1}`, SFX.tick, th + i * 0.4, 0.3));
sfx('pop1', SFX.pop, T.v3, 0.32);
sfx('pop2', SFX.pop, T.v8, 0.32);
sfx('whoosh', SFX.whoosh, T.cta, 0.3);

const audioTags = audio
  .map((a) => `    <audio id="${a.id}" src="${a.src}" data-start="${a.start}" data-duration="${a.dur}" data-track-index="${a.track}" data-volume="${a.volume}"${a.group ? ' data-audio-group="voiceover"' : ''}></audio>`)
  .join('\n');

// f는 하늘색, p는 노랑(윗니·입술 자리가 다른 두 소리를 색으로 구분)
const FAN = '<span class="hf">f</span>an';
const PAN = '<span class="hp">p</span>an';
const cap = (id, lines, cls = '') => `<div id="${id}" class="cap ${cls} hidden">${lines.map((l) => `<span class="ln">${l}</span>`).join('')}</div>`;
// 칸 하나: ?가 소리에 맞춰 켜졌다가, 정답을 알려 줄 때 그림과 철자로 뒤집힌다.
const slot = (id, w, style) => `<div id="${id}" class="slot" style="${style}"><div id="${id}q" class="sq hidden">?</div><div id="${id}f" class="sf hidden"><div class="bg" style="background-image:url(assets/images/panels/${w === 'fan' ? 'lightstick' : 'pan'}.jpg)"></div><b>${w === 'fan' ? FAN : PAN}</b></div><div id="${id}r" class="sring hidden"></div></div>`;
// 칸 위치는 칸 수에 맞춰 가로로 고르게 놓는다(카드 안쪽 폭 948에서 양옆 24씩 비움).
const round = (id, list) => {
  const w = list.length === 5 ? 160 : 200;
  const gap = (900 - w * list.length) / (list.length - 1);
  return `<div id="${id}" class="slots hidden">${list.map((word, i) => slot(`${id}${i + 1}`, word, `width:${w}px;left:${r3(24 + i * (w + gap))}px`)).join('')}</div>`;
};
const think = (id) => `<div id="${id}" class="think hidden"><div class="td"></div><div class="td"></div><div class="td"></div></div>`;

const html = `<!DOCTYPE html>
<html lang="ko" data-resolution="portrait">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>팬, 팬, 팬</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face{font-family:'Noto Sans KR';src:url('assets/fonts/NotoSansKR-subset.ttf') format('truetype');font-weight:100 900;font-display:block}
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#F4EFE6}
    #root{position:relative;width:100%;height:100%;overflow:hidden;background:#F4EFE6;color:#111111;font-family:'Noto Sans KR',sans-serif}
    .hidden{opacity:0}

    .pill{position:absolute;top:232px;height:78px;left:60px;width:960px;display:flex;align-items:center;justify-content:center;white-space:nowrap;font-size:42px;font-weight:900}
    .pillBox{display:flex;align-items:center;height:78px;padding:0 40px;background:#FFFFFF;border:5px solid #111111;border-radius:999px;box-shadow:6px 6px 0 #111111;white-space:nowrap;flex-shrink:0}

    .card{position:absolute;left:60px;top:332px;width:960px;height:880px;background:#FFFFFF;border:6px solid #111111;border-radius:30px;box-shadow:10px 10px 0 #111111;overflow:hidden;transform-origin:center center}
    .hf{color:#111111;background:#7DD3FC;border-radius:10px;padding:0 6px}
    .hp{color:#111111;background:#F5C518;border-radius:10px;padding:0 6px}

    /* 1) 같은 글자 팬 */
    #intro .pic{position:absolute;object-fit:contain}
    #introL{left:40px;top:150px;width:250px;height:600px}
    #introP{right:30px;top:270px;width:330px;height:360px}
    #bubble{position:absolute;left:50%;top:50%;width:230px;height:230px;margin:-115px 0 0 -115px;border-radius:50%;background:#F5C518;border:8px solid #111111;box-shadow:9px 9px 0 #111111;display:flex;align-items:center;justify-content:center;font-size:120px;font-weight:900;line-height:1}
    .lab{position:absolute;font-size:50px;font-weight:900;white-space:nowrap}
    #labL{left:40px;width:250px;text-align:center;top:770px}
    #labP{right:30px;width:330px;text-align:center;top:770px}

    /* 2) 세어 보기 */
    #quiz{padding:0}
    .ref{position:absolute;top:30px;width:450px;height:210px;display:flex;align-items:center;gap:18px;padding:14px 18px;border:5px solid #DDD6C6;border-radius:24px;font-size:44px;font-weight:900;white-space:nowrap}
    #refA{left:20px}#refB{right:20px}
    .ref .bg{flex:0 0 190px;height:170px;background-size:contain;background-repeat:no-repeat;background-position:center}
    .refring{position:absolute;inset:-9px;border:12px solid #F5C518;border-radius:30px}
    .slots{position:absolute;left:0;right:0;top:300px;height:520px}
    .slot{position:absolute;top:0;height:470px;border:5px solid #111111;border-radius:22px;background:#FBF8F1}
    .sq{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;font-size:110px;line-height:1}
    .sf{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#FFFFFF;border-radius:18px}
    .sf .bg{width:140px;height:250px;background-size:contain;background-repeat:no-repeat;background-position:center}
    .sf b{font-family:'Archivo Black',sans-serif;font-size:50px;line-height:1;white-space:nowrap;font-variant-ligatures:none}
    .sring{position:absolute;inset:-10px;border:12px solid #F5C518;border-radius:28px}
    .think{position:absolute;left:60px;width:960px;top:1398px;height:198px;display:flex;align-items:center;justify-content:center;gap:44px}
    .td{width:56px;height:56px;border-radius:50%;background:#111111}

    /* 3) 입 모양 */
    #mouth .mi{position:absolute;left:40px;right:40px;top:40px;height:520px;width:auto}
    #mouth .mi img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
    .chip{position:absolute;left:30px;top:604px;height:112px;padding:0 30px;display:flex;align-items:center;gap:22px;background:#FFFFFF;border:5px solid #111111;border-radius:22px;box-shadow:5px 5px 0 #111111;font-family:'Archivo Black',sans-serif;font-size:76px;line-height:1;white-space:nowrap;font-variant-ligatures:none;transform-origin:left center}
    .ipa{font-family:Inter,sans-serif;font-size:44px;font-weight:700;color:#3A3A3A}
    #chipF{left:auto;right:30px}
    .badge{position:absolute;left:30px;right:30px;top:744px;height:96px;display:flex;align-items:center;justify-content:center;background:#F5C518;border:5px solid #111111;border-radius:999px;box-shadow:5px 5px 0 #111111;font-size:46px;font-weight:900;white-space:nowrap}
    .badge.sky{background:#7DD3FC}

    .cap{position:absolute;left:60px;width:960px;top:1398px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:198px;padding:12px 24px;background:#FFFFFF;border:5px solid #111111;border-radius:30px;box-shadow:7px 7px 0 #111111;font-size:58px;font-weight:800;line-height:1.26;text-align:center}
    .cap.sm{font-size:52px}
    .cap.sm3{font-size:46px;line-height:1.22}
    .ln{display:block;white-space:nowrap}

    /* 마지막 5초 (EP24~26 쇼츠와 같다) */
    #cta{position:absolute;inset:0}
    #thumb{position:absolute;left:110px;top:262px;width:860px;height:484px;border:6px solid #111111;border-radius:26px;box-shadow:10px 10px 0 #111111;overflow:hidden;background:#FFFFFF;transform-origin:center center}
    #thumb img{width:100%;height:100%;object-fit:cover;display:block}
    #ctaPill{position:absolute;left:60px;width:960px;top:790px;display:flex;justify-content:center}
    #ctaPillBox{height:104px;padding:0 48px;display:flex;align-items:center;background:#F5C518;border:6px solid #111111;border-radius:999px;box-shadow:7px 7px 0 #111111;font-size:60px;font-weight:900;white-space:nowrap}
    #cap9{top:926px;height:236px;font-size:52px;line-height:1.22}
    #arrow{position:absolute;left:310px;top:1176px;width:460px;height:460px;transform-origin:50% 90%}
    #arrow img{width:100%;height:100%;display:block}
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
    <div id="pill1" class="pill"><div class="pillBox">한글로는 똑같은 팬</div></div>
    <div id="pill2" class="pill hidden"><div class="pillBox">프라이팬은 몇 번?</div></div>
    <div id="pill3" class="pill hidden"><div class="pillBox">입 모양이 다릅니다</div></div>
    <div id="pill4" class="pill hidden"><div class="pillBox">이번엔 아이돌 팬</div></div>

    <div id="intro" class="card">
      <img id="introL" class="pic" src="assets/images/panels/lightstick.jpg" alt="응원봉">
      <img id="introP" class="pic" src="assets/images/panels/pan.jpg" alt="프라이팬">
      <div id="labL" class="lab">아이돌 팬</div><div id="labP" class="lab">프라이팬</div>
      <div id="bubble">팬</div>
    </div>

    <div id="quiz" class="card hidden">
      <div id="refA" class="ref"><div class="bg" style="background-image:url(assets/images/panels/lightstick.jpg)"></div><span>아이돌 팬</span><div id="refAring" class="refring hidden"></div></div>
      <div id="refB" class="ref"><div class="bg" style="background-image:url(assets/images/panels/pan.jpg)"></div><span>프라이팬</span><div id="refBring" class="refring hidden"></div></div>
      ${round('qa', ROUND1)}
      ${round('qb', ROUND2)}
    </div>

    <div id="mouth" class="card hidden">
      <div class="mi"><img id="mC" src="assets/images/panels/lips_close.jpg" alt="두 입술을 붙인 모양"><img id="mT" class="hidden" src="assets/images/panels/lips_touch.jpg" alt="윗니가 아랫입술에 살짝 닿은 모양"></div>
      <div id="chipP" class="chip hidden"><span class="cw">${PAN}</span><span class="ipa">[pæn]</span></div>
      <div id="chipF" class="chip hidden"><span class="cw">${FAN}</span><span class="ipa">[fæn]</span></div>
      <div id="bP" class="badge hidden">입술 붙였다 팡</div>
      <div id="bF" class="badge sky hidden">윗니 살짝, 바람 슥</div>
    </div>

    ${think('think1')}
    ${think('think2')}

    ${cap('cap1', ['아이돌 팬도 팬, 프라이팬도 팬,', '한글로는 똑같이 적습니다.'], 'sm')}
    ${cap('cap2', ['다섯 번 들려 드릴 테니,', '프라이팬이 몇 번인지 세어 보세요.'], 'sm')}
    ${cap('cap3', ['정답은 두 번입니다.'])}
    ${cap('cap4', ['프라이팬은 두 입술을 붙였다가', '팡 하고 떼면서 시작합니다.'], 'sm')}
    ${cap('cap5', ['아이돌 팬은 윗니를 아랫입술에', '살짝 대고, 바람을 흘려보내면서', '시작하고요.'], 'sm3')}
    ${cap('cap6', ['이번엔 네 번입니다.'])}
    ${cap('cap7', ['아이돌 팬은 몇 번일까요?'])}
    ${cap('cap8', ['한 번이었습니다.'])}

    <div id="cta" class="hidden">
      <div id="thumb"><img src="assets/images/longform_thumb.jpg" alt="F와 P 전체 영상 썸네일"></div>
      <div id="ctaPill"><div id="ctaPillBox">24쌍 전체 영상</div></div>
      ${cap('cap9', ['짝단어 스물네 쌍을', '반복해 듣는 전체 영상은', '화면 아래 링크에 있습니다.']).replace('cap  hidden', 'cap')}
      <div id="arrow"><img src="assets/images/cta_hand.png" alt="아래를 가리키는 손"></div>
    </div>

    <audio id="bgm" src="assets/bgm/track.mp3" data-start="0" data-duration="${TOTAL}" data-track-index="4" data-volume="0.06" data-fade-out="1"></audio>
${audioTags}
  </div>
  <script>
    const T = ${JSON.stringify(T)};
    const ROUND1 = ${JSON.stringify(ROUND1)};
    const ROUND2 = ${JSON.stringify(ROUND2)};
    const tl = gsap.timeline({paused: true});
    const show = (sel, at, duration = 0.18) => tl.to(sel, {opacity: 1, duration, ease: 'power2.out'}, at);
    const hide = (sel, at, duration = 0.14) => tl.to(sel, {opacity: 0, duration, ease: 'power2.in'}, at);
    const pulse = (sel, at, scale = 1.16) => {
      tl.to(sel, {scale, duration: 0.11, ease: 'power2.out'}, at);
      tl.to(sel, {scale: 1, duration: 0.26, ease: 'back.out(3)'}, at + 0.11);
    };
    // fromTo는 시작값과 끝값에 같은 속성을 모두 적는다(EP25 쇼츠에서 되감기 때 요소가 투명하게 남은 일, 2026-11-09).
    const popIn = (sel, at, from = 0.6) => tl.fromTo(sel, {opacity: 0, scale: from}, {opacity: 1, scale: 1, duration: 0.26, ease: 'back.out(2.2)', immediateRender: false}, at);
    const caption = (n) => {
      show('#cap' + n, T['v' + n] - 0.02, 0.12);
      hide('#cap' + n, T['v' + n + 'End'] - 0.14, 0.1);
    };
    const swap = (from, to, at) => {
      hide(from, at, 0.2);
      show(to, at, 0.24);
    };
    // 칸마다 소리에 맞춰 ?가 켜지고, 정답에서 그림으로 뒤집힌다
    const runRound = (prefix, words, key, answer) => {
      words.forEach((w, i) => {
        popIn('#' + prefix + (i + 1) + 'q', T[key + (i + 1)] + 0.02, 0.5);
      });
      words.forEach((w, i) => {
        const id = '#' + prefix + (i + 1);
        tl.to(id + 'q', {opacity: 0, duration: 0.12, ease: 'power2.in'}, T[answer] + 0.05 + i * 0.09);
        tl.fromTo(id + 'f', {opacity: 0, scale: 0.8}, {opacity: 1, scale: 1, duration: 0.24, ease: 'back.out(2)', immediateRender: false}, T[answer] + 0.12 + i * 0.09);
      });
    };
    const thinkDots = (id, at) => {
      show('#' + id, at, 0.1);
      [0, 1, 2].forEach((i) => tl.to('#' + id + ' .td:nth-child(' + (i + 1) + ')', {opacity: 0.16, scale: 0.7, duration: 0.14, ease: 'power2.in'}, at + (i + 1) * 0.4 - 0.14));
      hide('#' + id, at + 1.24, 0.06);
    };

    // 1) 같은 글자 "팬"
    tl.fromTo('#intro', {scale: 0.94}, {scale: 1, duration: 0.26, ease: 'back.out(2)'}, 0);
    caption(1);
    // 아래 반응 시각은 whisper 단어 시각(줄 시작 기준)에 맞췄다(2026-11-09).
    pulse('#introL', T.v1 + 0.25, 1.05); // "아이돌 팬도 팬" 0.2초
    pulse('#introP', T.v1 + 2.05, 1.05); // "프라이팬도 팬" 2.0초
    pulse('#bubble', T.v1 + 3.95, 1.14); // "똑같이" 3.9초

    // 2) 첫 문제: 프라이팬이 몇 번인지 세어 보세요
    caption(2);
    swap('#intro', '#quiz', T.v2 - 0.04);
    swap('#pill1', '#pill2', T.v2 - 0.04);
    show('#refBring', T.v2 + 0.1, 0.16);
    show('#qa', T.v2 + 0.1, 0.2);
    runRound('qa', ROUND1, 'a', 'v3');
    thinkDots('think1', T.th1);

    // 정답: 프라이팬 두 번(2번째, 5번째 칸에 동그라미)
    caption(3);
    ROUND1.forEach((w, i) => { if (w === 'pan') popIn('#qa' + (i + 1) + 'r', T.v3 + 0.45 + i * 0.09, 0.9); });

    // 3) 입 모양
    caption(4);
    hide('#quiz', T.v4 - 0.04, 0.18);
    show('#mouth', T.v4, 0.2);
    tl.fromTo('#mouth', {y: 36}, {y: 0, duration: 0.3, ease: 'back.out(1.8)'}, T.v4);
    swap('#pill2', '#pill3', T.v4);
    show('#chipP', T.mp - 0.1, 0.12);
    pulse('#chipP', T.mp + 0.02);
    popIn('#bP', T.v4 + 2.35); // "팡" 2.3초
    caption(5);
    swap('#mC', '#mT', T.v5);
    hide('#bP', T.v5, 0.14);
    show('#chipF', T.mf - 0.1, 0.12);
    pulse('#chipF', T.mf + 0.02);
    popIn('#bF', T.v5 + 2.85); // "살짝" 2.8초
    pulse('#mT', T.v5 + 3.85, 1.04); // "바람을" 3.8초

    // 4) 두 번째 문제: 아이돌 팬은 몇 번인지
    caption(6);
    swap('#mouth', '#quiz', T.v6 - 0.04);
    swap('#pill3', '#pill4', T.v6 - 0.04);
    hide('#qa', T.v6 - 0.04, 0.14);
    hide('#refBring', T.v6, 0.14);
    caption(7);
    show('#refAring', T.v7 + 0.2, 0.16);
    show('#qb', T.v6 + 0.1, 0.2);
    runRound('qb', ROUND2, 'b', 'v8');
    thinkDots('think2', T.th2);

    // 정답: 아이돌 팬 한 번(3번째 칸)
    caption(8);
    ROUND2.forEach((w, i) => { if (w === 'fan') popIn('#qb' + (i + 1) + 'r', T.v8 + 0.45 + i * 0.09, 0.9); });

    // 5) 마지막 5초: 롱폼 안내 (EP24~26 쇼츠와 같다)
    hide('#quiz,#pill4', T.cta, 0.2);
    show('#cta', T.cta + 0.04, 0.12);
    tl.fromTo('#thumb', {scale: 0.86}, {scale: 1, duration: 0.42, ease: 'back.out(1.8)'}, T.cta + 0.04);
    tl.fromTo('#ctaPillBox', {scale: 0.7}, {scale: 1, duration: 0.3, ease: 'back.out(2.2)'}, T.cta + 0.18);
    tl.fromTo('#arrow', {y: -60, opacity: 0, scale: 0.55}, {y: 0, opacity: 1, scale: 1, duration: 0.38, ease: 'back.out(2.2)'}, T.cta + 0.3);
    tl.to('#arrow', {y: 22, duration: 0.42, ease: 'power1.inOut', repeat: 5, yoyo: true}, T.cta + 0.72);
    tl.to('#ctaPillBox', {scale: 1.05, duration: 0.42, ease: 'sine.inOut', repeat: 5, yoyo: true}, T.cta + 0.72);

    window.__timelines['main'] = tl;
  </script>
</body>
</html>
`;
writeFileSync(join(root, 'index.html'), html, 'utf8');

// 유튜브 업로드용 한국어 자막. 문제를 내는 동안(a·b 원어민 소리)에는 철자를 적지 않는다.
const NARRATION = {
  v1: '아이돌 팬도 팬, 프라이팬도 팬, 한글로는 똑같이 적습니다.',
  v2: '다섯 번 들려 드릴 테니, 프라이팬이 몇 번인지 세어 보세요.',
  v3: '정답은 두 번입니다.',
  v4: '프라이팬은 두 입술을 붙였다가 팡 하고 떼면서 시작합니다.',
  v5: '아이돌 팬은 윗니를 아랫입술에 살짝 대고, 바람을 흘려보내면서 시작하고요.',
  v6: '이번엔 네 번입니다.',
  v7: '아이돌 팬은 몇 번일까요?',
  v8: '한 번이었습니다.',
  v9: '짝단어 스물네 쌍을 반복해 듣는 전체 영상은 화면 아래 링크에 있습니다.',
};
const SPOKEN = {mp: 'pan', mf: 'fan'};
const cues = audio
  .filter((a) => NARRATION[a.id] || SPOKEN[a.id])
  .map((a) => ({start: a.start, end: a.start + a.dur - 0.1, text: NARRATION[a.id] || SPOKEN[a.id]}))
  .sort((a, b) => a.start - b.start);
cues.forEach((c, i) => {
  if (cues[i + 1] && c.end > cues[i + 1].start) c.end = cues[i + 1].start;
});
const stamp = (sec) => {
  const ms = Math.round(sec * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};
mkdirSync(join(root, 'subtitles'), {recursive: true});
const NL = String.fromCharCode(10);
writeFileSync(join(root, 'subtitles', 'subtitles-ko.srt'), cues.map((c, i) => [i + 1, `${stamp(c.start)} --> ${stamp(c.end)}`, c.text, ''].join(NL)).join(NL), 'utf8');

// 배경음 더킹: 나레이션·원어민 소리(voiceover 묶음)가 나올 때 배경음을 낮춘다. EP24~26과 같은 세기 0.8.
const carve = join(homedir(), '.claude', 'skills', 'hyperframes-audio', 'scripts', 'carve.mjs');
if (!existsSync(join(root, 'node_modules', '@hyperframes', 'core'))) {
  console.error('⚠ @hyperframes/core가 없어 더킹을 걸지 못했다. 이 폴더에서 npm ci 뒤 다시 실행한다.');
} else if (!existsSync(carve)) {
  console.error(`⚠ ${carve}가 없어 더킹을 걸지 못했다.`);
} else {
  const r = spawnSync(process.execPath, [carve, '--comp', 'index.html', '--bed', 'bgm', '--strength', '0.8'], {cwd: root, encoding: 'utf8'});
  if (r.status !== 0) throw new Error(`carve 실패: ${r.stderr || r.stdout}`);
  console.error('더킹 적용:', (r.stdout.trim().split('\n').pop() || '').trim());
}
console.log(JSON.stringify({total: TOTAL, gains, T}, null, 0));
