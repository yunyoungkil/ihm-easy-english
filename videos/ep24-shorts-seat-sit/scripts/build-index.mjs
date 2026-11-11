#!/usr/bin/env node
// EP24 두 번째 쇼츠(seat·sit, 반전형)의 index.html과 자막을 만든다. 실제 음성 길이로 시각을 계산한다.
// 다시 만들면 carve.mjs(배경음 더킹)도 다시 돌려야 한다.
// 이 쇼츠에만 있는 코너: 소리 길이 막대 — 막대 길이는 이 쇼츠가 틀어 주는 파일의 소리 부분 실측값(FACT-CHECK.md).
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
// 소리 부분 길이: 첫 무음이 시작되는 시각(-38dB, 0.05초). 앞쪽 무음은 없다(0초부터 소리).
const voicedLen = (file) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', join(root, file), '-af', 'silencedetect=noise=-38dB:d=0.05', '-f', 'null', '-'], {encoding: 'utf8'});
  const m = /silence_start: ([\d.]+)/.exec(r.stderr);
  return m ? +m[1] : probe(file);
};
const r3 = (n) => Math.round(n * 1000) / 1000;
const r2s = (n) => (Math.round(n * 100) / 100).toFixed(2);

const NATIVE_PEAK_DB = -4;
const nativeGain = (file) => r3(Math.min(3.9, 10 ** ((NATIVE_PEAK_DB - maxDb(file)) / 20)));

const WORDS = {seat: 'assets/voice/m_w05_seat.wav', sit: 'assets/voice/m_w06_sit.wav'};
const gains = Object.fromEntries(Object.entries(WORDS).map(([k, f]) => [k, nativeGain(f)]));
const lens = Object.fromEntries(Object.entries(WORDS).map(([k, f]) => [k, probe(f)]));
const voiced = Object.fromEntries(Object.entries(WORDS).map(([k, f]) => [k, voicedLen(f)]));

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

const AFTER_VOICE = -0.08;
const AFTER_WORD = -0.1;

// 1. 훅: 0초부터 seat 소리 + 글자가 늘어난다
word('w0', 'seat', 0.15);
voice('v1', 1, 0.25);
// 2. 소리 길이 막대: seat, 쉼, sit
T.bars = r3(t + 0.1);
word('wBarSeat', 'seat', 0.35);
word('wBarSit', 'sit', 0.6);
// 3. 반전
voice('v2', 2, 0.25);
// 4. t 앞에서 끊김
voice('v3', 3, 0.1);
// 5. 입 모양
voice('v4', 4, 0.1);
T.faces = r3(T.v4 + 1.66); // "입 모양입니다" 시작(13.47 - 11.77 = 1.70초, 0.04초 먼저)
voice('v5', 5, 0.1);
word('wSeat', 'seat', AFTER_VOICE);
voice('v6', 6, 0.2);
word('wSit', 'sit', AFTER_VOICE);
word('wSeat2', 'seat', 0.35);
word('wSit2', 'sit', 0.25);
// 6. 마지막 안내
T.cta = r3(t + 0.2);
voice('v7', 7, 0.4);
t += 1.2;
const TOTAL = r3(t);
T.total = TOTAL;

const SFX = {pop: 'assets/sfx/pop.mp3', click: 'assets/sfx/click-soft.mp3', whoosh: 'assets/sfx/whoosh.mp3'};
sfx('popBars', SFX.click, T.bars, 0.25);
sfx('popReveal', SFX.pop, T.v2 + 2.3, 0.3);
sfx('whooshFaces', SFX.whoosh, T.faces - 0.05, 0.22);
sfx('whooshCta', SFX.whoosh, T.cta, 0.3);

const audioTags = audio
  .map((a) => `      <audio id="${a.id}" src="${a.src}" data-start="${a.start}" data-duration="${a.dur}" data-track-index="${a.track}" data-volume="${a.volume}"${a.group ? ' data-audio-group="voiceover"' : ''}></audio>`)
  .join('\n');

// 막대: 두 소리 중 긴 쪽을 680px로 두고 비례
const BAR_MAX = 600; // 숫자 "0.30초"가 카드 안에 여유 있게 들어가도록(680이면 테두리에 닿음)
const longest = Math.max(voiced.seat, voiced.sit);
const barW = {seat: Math.round((voiced.seat / longest) * BAR_MAX), sit: Math.round((voiced.sit / longest) * BAR_MAX)};

const HAND = 'assets/images/cta_hand.png';
const hasHand = existsSync(join(root, HAND));
const pointer = hasHand
  ? `<div id="arrow"><img src="${HAND}" alt="아래를 가리키는 손"></div>`
  : `<svg id="arrow" viewBox="0 0 260 450" aria-hidden="true"><path d="M86 8 H174 V270 H252 L130 442 L8 270 H86 Z" fill="#F5C518" stroke="#111111" stroke-width="12" stroke-linejoin="round"/></svg>`;
const pointerCss = hasHand
  ? '#arrow{position:absolute;left:300px;top:1134px;width:480px;height:480px;transform-origin:50% 90%}#arrow img{width:100%;height:100%;display:block}'
  : '#arrow{position:absolute;left:410px;top:1148px;width:260px;height:450px}';

const v = (s) => `<span class="vw">${s}</span>`;
const chip = (id, html, extra = '') => `<div id="${id}" class="chip hidden"><span class="w">${html}</span>${extra}</div>`;
const cap = (id, l1, l2) => `<div id="${id}" class="cap hidden"><span class="ln">${l1}</span>${l2 ? `<span class="ln">${l2}</span>` : ''}</div>`;
const mark = (id, s) => `<span id="${id}" class="mark">${s}</span>`;

const html = `<!DOCTYPE html>
<html lang="ko" data-resolution="portrait">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>seat과 sit</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face{font-family:'Noto Sans KR';src:url('assets/fonts/NotoSansKR-subset.ttf') format('truetype');font-weight:100 900;font-display:block}
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#F4EFE6}
    #root{position:relative;width:100%;height:100%;overflow:hidden;background:#F4EFE6;color:#111111;font-family:'Noto Sans KR',sans-serif}
    .hidden{opacity:0}

    .pill{position:absolute;top:232px;height:78px;left:60px;width:960px;display:flex;align-items:center;justify-content:center}
    .pillBox{display:flex;align-items:center;height:78px;padding:0 40px;background:#FFFFFF;border:5px solid #111111;border-radius:999px;box-shadow:6px 6px 0 #111111;white-space:nowrap;flex-shrink:0;font-size:42px;font-weight:900}

    .card{position:absolute;left:60px;width:960px;background:#FFFFFF;border:6px solid #111111;border-radius:30px;box-shadow:10px 10px 0 #111111;overflow:hidden}
    #boardCard{top:320px;height:960px}
    #boardCard img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
    #stretch{position:absolute;left:80px;right:80px;top:280px;padding:24px 0;border-radius:24px;background:rgba(22,58,34,0.82);display:flex;justify-content:center;font-family:'Archivo Black',Inter,sans-serif;font-size:120px;line-height:1;color:#FFFFFF;white-space:nowrap;font-variant-ligatures:none;letter-spacing:2px}
    #stretch .e{display:inline-block;overflow:hidden;width:0}

    #barCard{top:320px;height:960px;padding:70px 60px}
    .barRow{position:absolute;left:60px;right:60px;height:300px}
    #rowSeat{top:110px}
    #rowSit{top:520px}
    .barWord{font-family:'Archivo Black',Inter,sans-serif;font-size:96px;line-height:1;white-space:nowrap;font-variant-ligatures:none}
    .barTrack{position:absolute;left:0;top:130px;width:${BAR_MAX + 10}px;height:96px;border:5px solid #111111;border-radius:18px;background:#FFFFFF}
    .bar{position:absolute;left:0;top:0;height:100%;width:0;border-radius:12px}
    #barSeat{background:#F5C518}
    #barSit{background:#7CC8F5}
    .sec{position:absolute;left:${BAR_MAX + 34}px;top:146px;font-family:Inter,sans-serif;font-size:56px;font-weight:900;white-space:nowrap}

    #clipCard{top:320px;height:960px}
    #clipWord{position:absolute;left:0;width:100%;top:300px;display:flex;justify-content:center;align-items:flex-end;font-family:'Archivo Black',Inter,sans-serif;font-size:190px;line-height:1;white-space:nowrap;font-variant-ligatures:none}
    #clipWord .eaWrap{position:relative;display:inline-block}
    #eaLine{position:absolute;left:0;bottom:-34px;height:22px;width:100%;background:#FF0000;border-radius:11px;transform-origin:left center}
    #tLetter{display:inline-block;transform-origin:50% 100%}
    #cutLine{position:absolute;top:250px;height:330px;width:10px;background:#111111;border-radius:5px;left:0}
    #clipNote{position:absolute;left:0;width:100%;top:690px;display:flex;justify-content:center}
    #clipNote .pillBox{background:#F5C518}

    .half{position:absolute;left:60px;width:960px;height:510px;background:#FFFFFF;border:6px solid #111111;border-radius:30px;box-shadow:10px 10px 0 #111111;overflow:hidden}
    #cardA{top:320px}
    #cardB{top:856px}
    .half img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
    .ring{position:absolute;inset:0;border:14px solid #F5C518;border-radius:24px}
    .chip{position:absolute;left:20px;top:18px;height:112px;padding:0 30px;display:flex;align-items:center;gap:22px;background:#FFFFFF;border:5px solid #111111;border-radius:22px;box-shadow:5px 5px 0 #111111;font-family:'Archivo Black',Inter,sans-serif;font-size:76px;line-height:1;color:#111111;white-space:nowrap;font-variant-ligatures:none;transform-origin:left center}
    .w{display:block}
    .vw{color:#FF0000}
    .ipa{font-family:Inter,sans-serif;font-size:44px;font-weight:700;color:#3A3A3A}
    .badge{position:absolute;right:20px;top:26px;height:96px;padding:0 30px;display:flex;align-items:center;background:#F5C518;border:5px solid #111111;border-radius:999px;box-shadow:5px 5px 0 #111111;font-size:44px;font-weight:900;white-space:nowrap}

    .cap{position:absolute;left:60px;width:960px;top:1398px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:198px;padding:12px 24px;background:#FFFFFF;border:5px solid #111111;border-radius:30px;box-shadow:7px 7px 0 #111111;font-size:58px;font-weight:800;line-height:1.26;text-align:center}
    .ln{display:block;white-space:nowrap}
    .mark{background-image:linear-gradient(#F5C518,#F5C518);background-repeat:no-repeat;background-position:0 88%;background-size:0% 42%;padding:0 6px}

    #cta{position:absolute;inset:0}
    #thumb{position:absolute;left:110px;top:262px;width:860px;height:480px;border:6px solid #111111;border-radius:26px;box-shadow:10px 10px 0 #111111;overflow:hidden;background:#FFFFFF;transform-origin:center center}
    #thumb img{width:100%;height:100%;display:block}
    #ctaPill{position:absolute;left:60px;width:960px;top:786px;display:flex;justify-content:center}
    #ctaPillBox{height:104px;padding:0 48px;display:flex;align-items:center;background:#F5C518;border:6px solid #111111;border-radius:999px;box-shadow:7px 7px 0 #111111;font-size:60px;font-weight:900;white-space:nowrap}
    #cap7{top:922px}
    ${pointerCss}
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
    <div id="pillQ" class="pill"><div class="pillBox">길게 끌면 갈릴까?</div></div>
    <div id="pillWhy" class="pill hidden"><div class="pillBox">소리가 갈리는 이유</div></div>

    <div id="boardCard" class="card">
      <img src="assets/images/classroom_board.jpg" alt="교실 칠판">
      <div id="stretch"><span>S</span><span>E</span><span class="e" id="e1">E</span><span class="e" id="e2">E</span><span class="e" id="e3">E</span><span class="e" id="e4">E</span><span class="e" id="e5">E</span><span>A</span><span>T</span></div>
    </div>

    <div id="barCard" class="card hidden">
      <div id="rowSeat" class="barRow"><div class="barWord">s${v('ea')}t</div><div class="barTrack"><div id="barSeat" class="bar"></div></div><div id="secSeat" class="sec hidden">${r2s(voiced.seat)}초</div></div>
      <div id="rowSit" class="barRow"><div class="barWord">s${v('i')}t</div><div class="barTrack"><div id="barSit" class="bar"></div></div><div id="secSit" class="sec hidden">${r2s(voiced.sit)}초</div></div>
    </div>

    <div id="clipCard" class="card hidden">
      <div id="clipWord"><span>s</span><span class="eaWrap">${v('ea')}<span id="eaLine"></span></span><span id="tLetter">t</span></div>
      <div id="clipNote"><div class="pillBox">t 앞에서 짧게 끊김</div></div>
    </div>

    <div id="cardA" class="half hidden">
      <img src="assets/images/panels/face_smile.jpg" alt="입꼬리를 옆으로 당긴 얼굴">
      <div id="ringA" class="ring hidden"></div>
      ${chip('chipA', `s${v('ea')}t`, '<span class="ipa">[siːt]</span>')}
      <div id="badgeA" class="badge hidden">입꼬리 당김</div>
    </div>
    <div id="cardB" class="half hidden">
      <img src="assets/images/panels/face_relaxed.jpg" alt="힘을 빼고 턱을 내린 얼굴">
      <div id="ringB" class="ring hidden"></div>
      ${chip('chipB', `s${v('i')}t`, '<span class="ipa">[sɪt]</span>')}
      <div id="badgeB" class="badge hidden">힘 뺌</div>
    </div>

    ${cap('cap1', '학창 시절에, 긴 소리는', '길게 끌어 읽으라고 배우셨죠?')}
    ${cap('cap2', '그런데 방금 들으신 두 소리,', `길이는 ${mark('m2', '거의 같습니다')}.`)}
    ${cap('cap3', '뒤에 티 소리가 오면,', '긴 소리도 짧게 끊기거든요.')}
    ${cap('cap4', '그럼 무엇이 다를까요?', `${mark('m4', '입 모양')}입니다.`)}
    ${cap('cap5', '웃듯이 입꼬리를 옆으로 당기면,', '이 소리가 나고요.')}
    ${cap('cap6', '힘을 툭 빼고 턱을 살짝 내리면,', '이 소리가 납니다.')}

    <div id="cta" class="hidden">
      <div id="thumb"><img src="assets/images/longform_thumb.jpg" alt="Sheep과 Ship 전체 영상 썸네일"></div>
      <div id="ctaPill"><div id="ctaPillBox">20쌍 전체 영상</div></div>
      ${cap('cap7', '이런 짝단어 스무 쌍을, 화면 아래', '링크에서 이어서 들어 보세요.').replace('cap hidden', 'cap')}
      ${pointer}
    </div>

    <audio id="bgm" src="assets/bgm/track.mp3" data-start="0" data-duration="${TOTAL}" data-track-index="4" data-volume="0.06" data-fade-out="1"></audio>
${audioTags}
  </div>
  <script>
    const T = ${JSON.stringify(T)};
    const VOICED = ${JSON.stringify(voiced)};
    const BAR = ${JSON.stringify(barW)};
    const tl = gsap.timeline({paused: true});
    const show = (sel, at, duration = 0.18) => tl.to(sel, {opacity: 1, duration, ease: 'power2.out'}, at);
    const hide = (sel, at, duration = 0.14) => tl.to(sel, {opacity: 0, duration, ease: 'power2.in'}, at);
    const dim = (sel, at, opacity) => tl.to(sel, {opacity, duration: 0.2, ease: 'power2.out'}, at);
    const pulse = (sel, at, scale = 1.16) => {
      tl.to(sel, {scale, duration: 0.11, ease: 'power2.out'}, at);
      tl.to(sel, {scale: 1, duration: 0.26, ease: 'back.out(3)'}, at + 0.11);
    };
    const caption = (n) => {
      show('#cap' + n, T['v' + n] - 0.02, 0.12);
      hide('#cap' + n, T['v' + n + 'End'] - 0.14, 0.1);
    };

    // 1. 훅: seat 소리와 함께 E가 하나씩 늘어난다(0초부터 움직임)
    ['#e1', '#e2', '#e3', '#e4', '#e5'].forEach((e, i) => tl.fromTo(e, {width: 0}, {width: 82, duration: 0.16, ease: 'power1.out', immediateRender: false}, 0.05 + i * 0.13));
    tl.fromTo('#stretch', {scaleX: 0.92}, {scaleX: 1.04, duration: 0.8, ease: 'power1.out', immediateRender: false}, 0.05);
    caption(1);
    pulse('#stretch', T.v1 + 2.0, 1.06);

    // 2. 소리 길이 막대: 소리가 나는 동안 실제 소리 길이만큼 자란다
    hide('#boardCard', T.bars - 0.2, 0.18);
    show('#barCard', T.bars - 0.05, 0.16);
    tl.fromTo('#barSeat', {width: 0}, {width: BAR.seat, duration: VOICED.seat, ease: 'none', immediateRender: false}, T.wBarSeat);
    tl.fromTo('#barSit', {width: 0}, {width: BAR.sit, duration: VOICED.sit, ease: 'none', immediateRender: false}, T.wBarSit);

    // 3. 반전: 길이 숫자, "거의 같습니다"
    caption(2);
    show('#secSeat,#secSit', T.v2 + 2.25, 0.14);
    pulse('#secSeat', T.v2 + 2.3, 1.2);
    pulse('#secSit', T.v2 + 2.3, 1.2);
    tl.to('#m2', {backgroundSize: '100% 42%', duration: 0.34, ease: 'power2.out'}, T.v2 + 2.7); // '거의 같습니다' 발화(단어 시각 기준)

    // 4. t 앞에서 짧게 끊김
    hide('#barCard', T.v3 - 0.12, 0.14);
    show('#clipCard', T.v3 - 0.04, 0.14);
    caption(3);
    tl.fromTo('#eaLine', {scaleX: 1.9}, {scaleX: 1, duration: 0.5, ease: 'power3.in', immediateRender: false}, T.v3 + 2.1);
    pulse('#tLetter', T.v3 + 2.55, 1.22);

    // 5. 입 모양
    caption(4);
    tl.to('#m4', {backgroundSize: '100% 42%', duration: 0.34, ease: 'power2.out'}, T.faces + 0.1);
    hide('#clipCard', T.faces - 0.1, 0.14);
    hide('#pillQ', T.faces - 0.1, 0.12);
    show('#pillWhy', T.faces, 0.14);
    show('#cardA,#cardB', T.faces, 0.2);
    caption(5);
    show('#ringA', T.v5, 0.14);
    dim('#cardB', T.v5, 0.32);
    show('#chipA', T.v5 + 0.05, 0.14);
    tl.fromTo('#badgeA', {opacity: 0, scale: 0.9}, {opacity: 1, scale: 1, duration: 0.26, ease: 'power3.out', immediateRender: false}, T.v5 + 0.1);
    pulse('#chipA', T.wSeat + 0.02);
    caption(6);
    hide('#ringA', T.v6, 0.14);
    dim('#cardA', T.v6, 0.32);
    dim('#cardB', T.v6, 1);
    show('#ringB', T.v6, 0.14);
    show('#chipB', T.v6 + 0.05, 0.14);
    tl.fromTo('#badgeB', {opacity: 0, scale: 0.9}, {opacity: 1, scale: 1, duration: 0.26, ease: 'power3.out', immediateRender: false}, T.v6 + 0.1);
    tl.to('#cardB', {scale: 1.03, duration: 0.12, ease: 'power2.out'}, T.v6 + 1.7); // "턱을 살짝 내리면" — 3초 넘는 정지 방지
    tl.to('#cardB', {scale: 1, duration: 0.3, ease: 'back.out(3)'}, T.v6 + 1.82);
    pulse('#chipB', T.wSit + 0.02);
    // 두 단어 연달아
    hide('#ringB', T.wSeat2 - 0.1, 0.12);
    dim('#cardA', T.wSeat2 - 0.1, 1);
    pulse('#chipA', T.wSeat2 + 0.02);
    pulse('#chipB', T.wSit2 + 0.02);

    // 6. 마지막 5초: 롱폼 안내
    hide('#cardA,#cardB,#pillWhy', T.cta, 0.2);
    show('#cta', T.cta + 0.04, 0.12);
    tl.fromTo('#thumb', {scale: 0.86}, {scale: 1, duration: 0.42, ease: 'power3.out'}, T.cta + 0.04);
    tl.fromTo('#ctaPillBox', {scale: 0.7}, {scale: 1, duration: 0.3, ease: 'power3.out'}, T.cta + 0.18);
    tl.fromTo('#arrow', {y: -60, opacity: 0, scale: 0.55}, {y: 0, opacity: 1, scale: 1, duration: 0.38, ease: 'power3.out'}, T.cta + 0.3);
    tl.to('#arrow', {y: ${hasHand ? 22 : 36}, duration: 0.42, ease: 'power1.inOut', repeat: 5, yoyo: true}, T.cta + 0.72);
    tl.to('#ctaPillBox', {scale: 1.05, duration: 0.42, ease: 'sine.inOut', repeat: 5, yoyo: true}, T.cta + 0.72);

    window.__timelines['main'] = tl;
  </script>
</body>
</html>
`;
writeFileSync(join(root, 'index.html'), html, 'utf8');

// 유튜브 업로드용 한국어 자막
const NARRATION = {
  v1: '학창 시절에, 긴 소리는 길게 끌어 읽으라고 배우셨죠?',
  v2: '그런데 방금 들으신 두 소리, 길이는 거의 같습니다.',
  v3: '뒤에 티 소리가 오면, 긴 소리도 짧게 끊기거든요.',
  v4: '그럼 무엇이 다를까요? 입 모양입니다.',
  v5: '웃듯이 입꼬리를 옆으로 당기면, 이 소리가 나고요.',
  v6: '힘을 툭 빼고 턱을 살짝 내리면, 이 소리가 납니다.',
  v7: '이런 짝단어 스무 쌍을, 화면 아래 링크에서 이어서 들어 보세요.',
};
const SPOKEN = {w0: 'seat', wBarSeat: 'seat', wBarSit: 'sit', wSeat: 'seat', wSit: 'sit', wSeat2: 'seat', wSit2: 'sit'};
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
console.log(JSON.stringify({total: TOTAL, gains, voiced, barW, T}, null, 0));
