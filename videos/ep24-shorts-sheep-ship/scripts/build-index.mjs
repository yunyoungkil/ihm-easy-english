#!/usr/bin/env node
// EP24 쇼츠의 index.html을 만든다. 실제 음성 길이로 시각을 계산해 화면 시각과 소리를 맞춘다.
// 다시 만들면 carve.mjs(배경음 더킹)도 다시 돌려야 한다.
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const probe = (file) => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', join(root, file)], {encoding: 'utf8'}).stdout.trim();
const maxDb = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', join(root, file), '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  return +/max_volume: (-?[\d.]+) dB/.exec(r.stderr)[1];
};
const r3 = (n) => Math.round(n * 1000) / 1000;

// 원어민 단어는 파일마다 음량 차이가 커서(최대 약 10dB) 최고 음량을 나레이션에 가깝게 맞춘다.
const NATIVE_PEAK_DB = -4;
const nativeGain = (file) => r3(Math.min(3.9, 10 ** ((NATIVE_PEAK_DB - maxDb(file)) / 20)));

const WORDS = {
  sheep: 'assets/voice/m_w01_sheep.wav',
  ship: 'assets/voice/m_w02_ship.wav',
  seat: 'assets/voice/m_w05_seat.wav',
  sit: 'assets/voice/m_w06_sit.wav',
  feel: 'assets/voice/f_w23_feel.wav',
  fill: 'assets/voice/f_w24_fill.wav',
};
const gains = Object.fromEntries(Object.entries(WORDS).map(([k, f]) => [k, nativeGain(f)]));
const lens = Object.fromEntries(Object.entries(WORDS).map(([k, f]) => [k, probe(f)]));

const audio = [];
const T = {};
let t = 0;
const word = (key, w, gap = 0) => {
  t += gap;
  audio.push({id: key, src: WORDS[w], start: r3(t), dur: r3(lens[w]), volume: gains[w], group: true, track: audio.length % 2 ? 2 : 5});
  T[key] = r3(t);
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
const AFTER_VOICE = -0.08;
const AFTER_WORD = -0.1;
const BETWEEN_QUESTIONS = 0.2;

// 첫 번째 문제: sheep
word('c1a', 'sheep');
voice('v1', 1, AFTER_WORD);
word('c1b', 'sheep', AFTER_VOICE);
T.th1 = r3(t);
t += THINK;
voice('v2', 2);
voice('v3', 3, AFTER_VOICE);
word('c1c', 'sheep', AFTER_VOICE);
word('c1d', 'ship', AFTER_WORD);
t += BETWEEN_QUESTIONS;
// 두 번째 문제: sit
T.q2 = r3(t);
word('c2a', 'sit');
voice('v4', 4, AFTER_WORD);
word('c2b', 'sit', AFTER_VOICE);
T.th2 = r3(t);
t += THINK;
voice('v5', 5);
word('c2c', 'seat', AFTER_VOICE);
word('c2d', 'sit', AFTER_WORD);
t += BETWEEN_QUESTIONS;
// 세 번째 문제: fill (여성 음성)
T.q3 = r3(t);
word('c3a', 'fill');
voice('v6', 6, AFTER_WORD);
word('c3b', 'fill', AFTER_VOICE);
T.th3 = r3(t);
t += THINK;
voice('v7', 7);
word('c3c', 'feel', AFTER_VOICE);
word('c3d', 'fill', AFTER_WORD);
t += BETWEEN_QUESTIONS;
// 입 모양
voice('v8', 8);
voice('v9', 9, AFTER_VOICE);
word('c4a', 'sheep', AFTER_VOICE);
voice('v10', 10, AFTER_WORD);
word('c4b', 'ship', AFTER_VOICE);
// 마지막 안내
T.cta = r3(t);
voice('v11', 11, 0.3);
t += 1.2;
const TOTAL = r3(t);
T.total = TOTAL;

const SFX = {pop: 'assets/sfx/pop.mp3', tick: 'assets/sfx/click-soft.mp3', whoosh: 'assets/sfx/whoosh.mp3'};
[['th1', 'v2'], ['th2', 'v5'], ['th3', 'v7']].forEach(([th, reveal], q) => {
  [0, 1, 2].forEach((i) => sfx(`tick${q + 1}${i + 1}`, SFX.tick, T[th] + i * 0.43, 0.3));
  sfx(`pop${q + 1}`, SFX.pop, T[reveal], 0.32);
});
sfx('whoosh', SFX.whoosh, T.cta, 0.3);

const audioTags = audio
  .map((a) => `      <audio id="${a.id}" src="${a.src}" data-start="${a.start}" data-duration="${a.dur}" data-track-index="${a.track}" data-volume="${a.volume}"${a.group ? ' data-audio-group="voiceover"' : ''}></audio>`)
  .join('\n');

// 마지막 장면 포인터: 손 그림이 있으면 그림을 쓰고, 없으면 화면 가운데 화살표를 쓴다.
const HAND = 'assets/images/cta_hand.png';
const hasHand = existsSync(join(root, HAND));
const pointer = hasHand
  ? `<div id="arrow"><img src="${HAND}" alt="아래를 가리키는 손"></div>`
  : `<svg id="arrow" viewBox="0 0 260 450" aria-hidden="true"><path d="M86 8 H174 V270 H252 L130 442 L8 270 H86 Z" fill="#F5C518" stroke="#111111" stroke-width="12" stroke-linejoin="round"/></svg>`;
const pointerCss = hasHand
  ? '#arrow{position:absolute;left:300px;top:1134px;width:480px;height:480px;transform-origin:50% 90%}#arrow img{width:100%;height:100%;display:block}'
  : '#arrow{position:absolute;left:410px;top:1148px;width:260px;height:450px}';

const word2 = (id, text, extra = '') => `<div id="${id}" class="chip hidden"><span class="w">${text}</span>${extra}</div>`;
const v = (s) => `<span class="vw">${s}</span>`;
const cap = (id, l1, l2) => `<div id="${id}" class="cap hidden"><span class="ln">${l1}</span>${l2 ? `<span class="ln">${l2}</span>` : ''}</div>`;
const mark = (id, s) => `<span id="${id}" class="mark">${s}</span>`;

const html = `<!DOCTYPE html>
<html lang="ko" data-resolution="portrait">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>양일까 배일까</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face{font-family:'Noto Sans KR';src:url('assets/fonts/NotoSansKR-subset.ttf') format('truetype');font-weight:100 900;font-display:block}
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#F4EFE6}
    #root{position:relative;width:100%;height:100%;overflow:hidden;background:#F4EFE6;color:#111111;font-family:'Noto Sans KR',sans-serif}
    .hidden{opacity:0}
    .abs{position:absolute}

    #pillQ,#pillWhy{position:absolute;top:232px;height:78px;left:60px;width:960px;display:flex;align-items:center;justify-content:center;gap:22px;white-space:nowrap;font-size:42px;font-weight:900}
    .pillBox{display:flex;align-items:center;gap:22px;height:78px;padding:0 36px;background:#FFFFFF;border:5px solid #111111;border-radius:999px;box-shadow:6px 6px 0 #111111;white-space:nowrap;flex-shrink:0}
    .pd{width:24px;height:24px;border-radius:50%;border:4px solid #111111;background:#FFFFFF;position:relative;overflow:hidden}
    .pd i{position:absolute;inset:0;background:#F5C518;display:block}

    .card{position:absolute;left:60px;width:960px;height:510px;background:#FFFFFF;border:6px solid #111111;border-radius:30px;box-shadow:10px 10px 0 #111111;overflow:hidden}
    #cardA{top:332px}
    #cardB{top:868px}
    .card img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
    .ring{position:absolute;inset:0;border:14px solid #F5C518;border-radius:24px}

    .chip{position:absolute;left:20px;top:18px;height:112px;padding:0 30px;display:flex;align-items:center;gap:22px;background:#FFFFFF;border:5px solid #111111;border-radius:22px;box-shadow:5px 5px 0 #111111;font-family:'Archivo Black',sans-serif;font-size:76px;line-height:1;color:#111111;white-space:nowrap;font-variant-ligatures:none;transform-origin:left center}
    .chip.kr{font-family:'Noto Sans KR',sans-serif;font-weight:900}
    .w{display:block}
    .vw{color:#FF0000}
    .ipa{font-family:Inter,sans-serif;font-size:44px;font-weight:700;color:#3A3A3A}
    .badge{position:absolute;right:20px;top:26px;height:96px;padding:0 30px;display:flex;align-items:center;background:#F5C518;border:5px solid #111111;border-radius:999px;box-shadow:5px 5px 0 #111111;font-size:44px;font-weight:900;white-space:nowrap}

    #qBadge{position:absolute;left:806px;top:760px;width:180px;height:180px;border-radius:50%;background:#F5C518;border:7px solid #111111;box-shadow:7px 7px 0 #111111;display:flex;align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;font-size:112px;line-height:1;color:#111111}

    .cap{position:absolute;left:60px;width:960px;top:1398px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;height:198px;padding:12px 24px;background:#FFFFFF;border:5px solid #111111;border-radius:30px;box-shadow:7px 7px 0 #111111;font-size:60px;font-weight:800;line-height:1.26;text-align:center}
    .ln{display:block;white-space:nowrap}
    .mark{background-image:linear-gradient(#F5C518,#F5C518);background-repeat:no-repeat;background-position:0 88%;background-size:0% 42%;padding:0 6px}

    #think{position:absolute;left:60px;width:960px;top:1398px;height:198px;display:flex;align-items:center;justify-content:center;gap:44px}
    .td{width:56px;height:56px;border-radius:50%;background:#111111}

    #neBadge{position:absolute;left:806px;top:760px;width:180px;height:180px;border-radius:50%;background:#111111;border:7px solid #111111;box-shadow:7px 7px 0 #F5C518;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;font-weight:900;font-size:110px;line-height:1;color:#F5C518}

    #cta{position:absolute;inset:0}
    #thumb{position:absolute;left:110px;top:262px;width:860px;height:480px;border:6px solid #111111;border-radius:26px;box-shadow:10px 10px 0 #111111;overflow:hidden;background:#FFFFFF;transform-origin:center center}
    #thumb img{width:100%;height:100%;display:block}
    #ctaPill{position:absolute;left:60px;width:960px;top:786px;display:flex;justify-content:center}
    #ctaPillBox{height:104px;padding:0 48px;display:flex;align-items:center;background:#F5C518;border:6px solid #111111;border-radius:999px;box-shadow:7px 7px 0 #111111;font-size:60px;font-weight:900;white-space:nowrap}
    #cap11{top:922px}
    ${pointerCss}
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
    <div id="pillQ"><div class="pillBox"><span>소리만 듣고 맞혀 보세요</span><span class="pd"><i id="p1"></i></span><span class="pd"><i id="p2" class="hidden"></i></span><span class="pd"><i id="p3" class="hidden"></i></span></div></div>
    <div id="pillWhy" class="hidden"><div class="pillBox"><span>소리가 갈리는 이유</span></div></div>

    <div id="cardA" class="card">
      <img id="a1" src="assets/images/panels/sheep.jpg" alt="양">
      <img id="a2" class="hidden" src="assets/images/panels/seat.jpg" alt="빈 좌석">
      <img id="a3" class="hidden" src="assets/images/panels/feel.jpg" alt="스웨터를 만지는 손">
      <img id="a4" class="hidden" src="assets/images/panels/mouth_smile.jpg" alt="입꼬리를 당긴 입">
      <div id="ringA" class="ring hidden"></div>
      <div id="kA" class="chip kr hidden">쉽</div>
      ${word2('chipA1', `sh${v('ee')}p`)}
      ${word2('chipA2', `s${v('ea')}t`)}
      ${word2('chipA3', `f${v('ee')}l`)}
      ${word2('chipA4', `sh${v('ee')}p`, '<span class="ipa">[ʃiːp]</span>')}
      <div id="badgeA" class="badge hidden">입꼬리 당김</div>
    </div>

    <div id="cardB" class="card">
      <img id="b1" src="assets/images/panels/ship.jpg" alt="배">
      <img id="b2" class="hidden" src="assets/images/panels/sit.jpg" alt="의자에 앉는 사람">
      <img id="b3" class="hidden" src="assets/images/panels/fill.jpg" alt="컵에 물을 채우는 물병">
      <img id="b4" class="hidden" src="assets/images/panels/mouth_relaxed.jpg" alt="힘을 뺀 입">
      <div id="ringB" class="ring hidden"></div>
      <div id="kB" class="chip kr hidden">쉽</div>
      ${word2('chipB1', `sh${v('i')}p`)}
      ${word2('chipB2', `s${v('i')}t`)}
      ${word2('chipB3', `f${v('i')}ll`)}
      ${word2('chipB4', `sh${v('i')}p`, '<span class="ipa">[ʃɪp]</span>')}
      <div id="badgeB" class="badge hidden">힘 뺌</div>
    </div>

    <div id="qBadge">?</div>
    <div id="neBadge" class="hidden">≠</div>

    <div id="think" class="hidden"><div class="td" id="d1"></div><div class="td" id="d2"></div><div class="td" id="d3"></div></div>

    ${cap('cap1', '방금 들으신 단어,', '양일까요, 배일까요?')}
    ${cap('cap2', `정답은 ${mark('m2', '양')}입니다.`)}
    ${cap('cap3', '흔히 둘 다 쉽이라고 읽지만,', '소리는 이렇게 다릅니다.')}
    ${cap('cap4', '이번엔 자리일까요,', '앉는다는 말일까요?')}
    ${cap('cap5', `${mark('m5', '앉는다는 말')}이었습니다.`)}
    ${cap('cap6', '마지막입니다. 느낀다는 말일까요,', '채운다는 말일까요?')}
    ${cap('cap7', `${mark('m7', '채운다는 말')}입니다.`)}
    ${cap('cap8', '길이보다 입과 혀 모양이', '더 크게 다릅니다.')}
    ${cap('cap9', '웃듯이 입꼬리를 옆으로 당기면', '소리가 이렇게 나고요.')}
    ${cap('cap10', '힘을 툭 빼고 턱을 살짝 내리면', '소리가 이렇게 납니다.')}

    <div id="cta" class="hidden">
      <div id="thumb"><img src="assets/images/longform_thumb.jpg" alt="Sheep과 Ship 전체 영상 썸네일"></div>
      <div id="ctaPill"><div id="ctaPillBox">20쌍 전체 영상</div></div>
      ${cap('cap11', '이런 짝단어 스무 쌍을 화면 아래', '링크에서 반복해 들어 보세요.').replace('cap hidden', 'cap')}
      ${pointer}
    </div>

    <audio id="bgm" src="assets/bgm/track.mp3" data-start="0" data-duration="${TOTAL}" data-track-index="4" data-volume="0.06" data-fade-out="1"></audio>
${audioTags}
  </div>
  <script>
    const T = ${JSON.stringify(T)};
    const tl = gsap.timeline({paused: true});
    const show = (sel, at, duration = 0.18) => tl.to(sel, {opacity: 1, duration, ease: 'power2.out'}, at);
    const hide = (sel, at, duration = 0.14) => tl.to(sel, {opacity: 0, duration, ease: 'power2.in'}, at);
    const dim = (sel, at, opacity) => tl.to(sel, {opacity, duration: 0.2, ease: 'power2.out'}, at);
    const pulse = (sel, at, scale = 1.16) => {
      tl.to(sel, {scale, duration: 0.11, ease: 'power2.out'}, at);
      tl.to(sel, {scale: 1, duration: 0.26, ease: 'back.out(3)'}, at + 0.11);
    };
    const swapImages = (from, to, at) => {
      hide('#a' + from + ',#b' + from, at, 0.22);
      show('#a' + to + ',#b' + to, at, 0.22);
    };
    const caption = (n, sel) => {
      show(sel || '#cap' + n, T['v' + n] - 0.02, 0.12);
      hide(sel || '#cap' + n, T['v' + n + 'End'] - 0.14, 0.1);
    };
    const think = (at) => {
      show('#think', at, 0.1);
      ['#d1', '#d2', '#d3'].forEach((d, i) => tl.to(d, {opacity: 0.16, scale: 0.7, duration: 0.14, ease: 'power2.in'}, at + (i + 1) * 0.43 - 0.14));
      hide('#think', at + 1.24, 0.06);
      tl.set(['#d1', '#d2', '#d3'], {opacity: 1, scale: 1}, at + 1.3);
    };
    const questionIn = (at) => tl.fromTo('#qBadge', {scale: 0.2, opacity: 0}, {scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.4)', immediateRender: false}, at);
    const reveal = (winnerRing, loser, at, markSel) => {
      tl.to('#qBadge', {scale: 0.2, opacity: 0, duration: 0.14, ease: 'power2.in'}, at - 0.02);
      show(winnerRing, at, 0.12);
      dim(loser, at, 0.22);
      tl.to(markSel, {backgroundSize: '100% 42%', duration: 0.34, ease: 'power2.out'}, at + 0.1);
    };
    const pairBack = (winnerRing, loser, at) => {
      hide(winnerRing, at, 0.14);
      dim(loser, at, 1);
    };
    const wordPop = (sel, at) => pulse(sel, at + 0.02);
    const spot = (sel, at) => pulse(sel, at, 1.03);

    // 첫 번째 문제
    tl.fromTo('#qBadge', {scale: 0.94}, {scale: 1, duration: 0.2, ease: 'power2.out'}, 0);
    caption(1);
    spot('#cardA', T.v1 + 1.0);
    spot('#cardB', T.v1 + 1.72);
    pulse('#qBadge', T.c1b, 1.12);
    think(T.th1);
    caption(2);
    reveal('#ringA', '#cardB', T.v2, '#m2');
    caption(3);
    pairBack('#ringA', '#cardB', T.v3);
    show('#kA,#kB', T.v3 + 0.05, 0.14);
    tl.fromTo('#neBadge', {scale: 0.2, opacity: 0}, {scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.4)', immediateRender: false}, T.v3 + 2.2);
    hide('#kA,#kB,#neBadge', T.c1c - 0.08, 0.08);
    show('#chipA1,#chipB1', T.c1c - 0.04, 0.1);
    wordPop('#chipA1', T.c1c);
    wordPop('#chipB1', T.c1d);

    // 두 번째 문제
    hide('#chipA1,#chipB1', T.q2 - 0.1, 0.12);
    swapImages(1, 2, T.q2 - 0.08);
    show('#p2', T.q2 - 0.08, 0.14);
    questionIn(T.q2 - 0.02);
    caption(4);
    spot('#cardA', T.v4 + 0.66);
    spot('#cardB', T.v4 + 1.52);
    pulse('#qBadge', T.c2b, 1.12);
    think(T.th2);
    caption(5);
    reveal('#ringB', '#cardA', T.v5, '#m5');
    pairBack('#ringB', '#cardA', T.c2c - 0.05);
    show('#chipA2,#chipB2', T.c2c - 0.04, 0.1);
    wordPop('#chipA2', T.c2c);
    wordPop('#chipB2', T.c2d);

    // 세 번째 문제
    hide('#chipA2,#chipB2', T.q3 - 0.1, 0.12);
    swapImages(2, 3, T.q3 - 0.08);
    show('#p3', T.q3 - 0.08, 0.14);
    questionIn(T.q3 - 0.02);
    caption(6);
    spot('#cardA', T.v6 + 1.34);
    spot('#cardB', T.v6 + 2.5);
    pulse('#qBadge', T.c3b, 1.12);
    think(T.th3);
    caption(7);
    reveal('#ringB', '#cardA', T.v7, '#m7');
    pairBack('#ringB', '#cardA', T.c3c - 0.05);
    show('#chipA3,#chipB3', T.c3c - 0.04, 0.1);
    wordPop('#chipA3', T.c3c);
    wordPop('#chipB3', T.c3d);

    // 입 모양
    hide('#chipA3,#chipB3', T.v8 - 0.08, 0.12);
    swapImages(3, 4, T.v8 - 0.06);
    hide('#pillQ', T.v8 - 0.06, 0.12);
    show('#pillWhy', T.v8 + 0.04, 0.14);
    caption(8);
    caption(9);
    show('#ringA', T.v9, 0.14);
    dim('#cardB', T.v9, 0.32);
    show('#chipA4', T.v9 + 0.05, 0.14);
    tl.fromTo('#badgeA', {opacity: 0, scale: 0.6}, {opacity: 1, scale: 1, duration: 0.26, ease: 'back.out(2.2)', immediateRender: false}, T.v9 + 0.1);
    pulse('#chipA4', T.c4a + 0.02);
    hide('#ringA', T.v10, 0.14);
    dim('#cardA', T.v10, 0.32);
    dim('#cardB', T.v10, 1);
    caption(10);
    show('#ringB', T.v10, 0.14);
    show('#chipB4', T.v10 + 0.05, 0.14);
    tl.fromTo('#badgeB', {opacity: 0, scale: 0.6}, {opacity: 1, scale: 1, duration: 0.26, ease: 'back.out(2.2)', immediateRender: false}, T.v10 + 0.1);
    pulse('#chipB4', T.c4b + 0.02);

    // 마지막 5초: 롱폼 안내
    hide('#cardA,#cardB,#pillWhy', T.cta, 0.2);
    show('#cta', T.cta + 0.04, 0.12);
    tl.fromTo('#thumb', {scale: 0.86}, {scale: 1, duration: 0.42, ease: 'back.out(1.8)'}, T.cta + 0.04);
    tl.fromTo('#ctaPillBox', {scale: 0.7}, {scale: 1, duration: 0.3, ease: 'back.out(2.2)'}, T.cta + 0.18);
    tl.fromTo('#arrow', {y: -60, opacity: 0, scale: 0.55}, {y: 0, opacity: 1, scale: 1, duration: 0.38, ease: 'back.out(2.2)'}, T.cta + 0.3);
    tl.to('#arrow', {y: ${hasHand ? 22 : 36}, duration: 0.42, ease: 'power1.inOut', repeat: 5, yoyo: true}, T.cta + 0.72);
    tl.to('#ctaPillBox', {scale: 1.05, duration: 0.42, ease: 'sine.inOut', repeat: 5, yoyo: true}, T.cta + 0.72);

    window.__timelines['main'] = tl;
  </script>
</body>
</html>
`;
writeFileSync(join(root, 'index.html'), html, 'utf8');

// 유튜브 업로드용 한국어 자막. 문제를 내는 동안에는 정답 단어를 적지 않는다.
const NARRATION = {
  v1: '방금 들으신 단어, 양일까요, 배일까요?',
  v2: '정답은 양입니다.',
  v3: '흔히 둘 다 쉽이라고 읽지만, 소리는 이렇게 다릅니다.',
  v4: '이번엔 자리일까요, 앉는다는 말일까요?',
  v5: '앉는다는 말이었습니다.',
  v6: '마지막입니다. 느낀다는 말일까요, 채운다는 말일까요?',
  v7: '채운다는 말입니다.',
  v8: '길이보다 입과 혀 모양이 더 크게 다릅니다.',
  v9: '웃듯이 입꼬리를 옆으로 당기면 소리가 이렇게 나고요.',
  v10: '힘을 툭 빼고 턱을 살짝 내리면 소리가 이렇게 납니다.',
  v11: '이런 짝단어 스무 쌍을 화면 아래 링크에서 반복해 들어 보세요.',
};
const SPOKEN_AFTER_REVEAL = {c1c: 'sheep', c1d: 'ship', c2c: 'seat', c2d: 'sit', c3c: 'feel', c3d: 'fill', c4a: 'sheep', c4b: 'ship'};
const cues = audio
  .filter((a) => NARRATION[a.id] || SPOKEN_AFTER_REVEAL[a.id])
  .map((a) => ({start: a.start, end: a.start + a.dur - 0.1, text: NARRATION[a.id] || SPOKEN_AFTER_REVEAL[a.id]}))
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
console.log(JSON.stringify({total: TOTAL, gains, T}, null, 0));
