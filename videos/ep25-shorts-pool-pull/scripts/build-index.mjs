#!/usr/bin/env node
// EP25 쇼츠의 index.html을 만든다. 실제 음성 길이로 시각을 계산해 화면 시각과 소리를 맞춘다.
// 이 편만의 코너: 네 칸의 "풀"이 원어민 소리와 함께 하나씩 pool·pull·fool·full로 뒤집힌다(BRIEF.md).
// 공통 바탕(글꼴, 자막 상자, 마지막 5초 안내)은 EP24 쇼츠와 같고, 장면 구성은 이 파일에서 새로 짰다.
// 다 만든 뒤 배경음 더킹(carve)을 자동으로 다시 건다. EP24에서 다시 만들 때 더킹이 빠졌던 일 때문이다(2026-11-07).
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

// 원어민 단어는 파일마다 음량 차이가 커서 최고 음량을 나레이션에 가깝게 맞춘다(EP24와 같은 기준).
const NATIVE_PEAK_DB = -4;
const nativeGain = (file) => r3(Math.min(3.9, 10 ** ((NATIVE_PEAK_DB - maxDb(file)) / 20)));

const WORDS = {
  pool: 'assets/voice/m_w01_pool.wav',
  pull: 'assets/voice/m_w02_pull.wav',
  fool: 'assets/voice/f_w03_fool.wav',
  full: 'assets/voice/f_w04_full.wav',
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
const FLIP_GAP = 0.4;

// 1) 네 칸 뒤집기
voice('v1', 1);
word('w1', 'pool', 0.25);
word('w2', 'pull', FLIP_GAP);
word('w3', 'fool', FLIP_GAP);
word('w4', 'full', FLIP_GAP);
voice('v2', 2, 0.35);
// 2) 입 모양: v3 앞부분("수영장과 잡아당기다")은 위 두 칸, 뒷부분("이 둘은…")에서 입술 그림으로 넘어간다.
voice('v3', 3, 0.1);
T.v3Split = r3(T.v3 + 1.98); // n03 안에서 "이 둘은"이 시작하는 곳(원본 7.785초 - 조각 시작 5.80초)
voice('v4', 4, 0.15);
word('w5', 'pool', AFTER_VOICE);
voice('v5', 5, 0.25);
word('w6', 'pull', AFTER_VOICE);
voice('v6', 6, 0.25);
word('w7', 'fool', AFTER_VOICE);
word('w8', 'full', 0.25);
// 3) 귀로만 맞히기 (정답 full)
voice('v7', 7, 0.3);
word('w9', 'full', AFTER_VOICE);
voice('v8', 8, 0.2);
word('w10', 'full', AFTER_VOICE);
T.th = r3(t);
t += THINK;
voice('v9', 9);
word('w11', 'full', AFTER_VOICE);
// 4) 마지막 안내
T.cta = r3(t);
voice('v10', 10, 0.3);
t += 1.2;
const TOTAL = r3(t);
T.total = TOTAL;

const SFX = {pop: 'assets/sfx/pop.mp3', tick: 'assets/sfx/click-soft.mp3', whoosh: 'assets/sfx/whoosh.mp3'};
['w1', 'w2', 'w3', 'w4'].forEach((k, i) => sfx(`flip${i + 1}`, SFX.tick, T[k] - 0.06, 0.22));
[0, 1, 2].forEach((i) => sfx(`tick${i + 1}`, SFX.tick, T.th + i * 0.43, 0.3));
sfx('pop1', SFX.pop, T.v9, 0.32);
sfx('whoosh', SFX.whoosh, T.cta, 0.3);

const audioTags = audio
  .map((a) => `    <audio id="${a.id}" src="${a.src}" data-start="${a.start}" data-duration="${a.dur}" data-track-index="${a.track}" data-volume="${a.volume}"${a.group ? ' data-audio-group="voiceover"' : ''}></audio>`)
  .join('\n');

const v = (s) => `<span class="vw">${s}</span>`;
const SPELL = {pool: `p${v('oo')}l`, pull: `p${v('u')}ll`, fool: `f${v('oo')}l`, full: `f${v('u')}ll`};
const IPA = {pool: '[puːl]', pull: '[pʊl]', fool: '[fuːl]', full: '[fʊl]'};
const cap = (id, l1, l2) => `<div id="${id}" class="cap hidden"><span class="ln">${l1}</span>${l2 ? `<span class="ln">${l2}</span>` : ''}</div>`;
const mark = (id, s) => `<span id="${id}" class="mark">${s}</span>`;
const gridCard = (n, w, alt) => `
    <div id="g${n}" class="gcard">
      <div id="gf${n}" class="face front"><span class="pul">풀</span></div>
      <div id="gb${n}" class="face back hidden"><img src="assets/images/panels/${w}.jpg" alt="${alt}"><div class="gchip">${SPELL[w]}</div></div>
      <div id="gr${n}" class="ring hidden"></div>
    </div>`;
const chip = (id, w) => `<div id="${id}" class="chip hidden"><span class="w">${SPELL[w]}</span><span class="ipa">${IPA[w]}</span></div>`;

const html = `<!DOCTYPE html>
<html lang="ko" data-resolution="portrait">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>전부 풀</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face{font-family:'Noto Sans KR';src:url('assets/fonts/NotoSansKR-subset.ttf') format('truetype');font-weight:100 900;font-display:block}
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#F4EFE6}
    #root{position:relative;width:100%;height:100%;overflow:hidden;background:#F4EFE6;color:#111111;font-family:'Noto Sans KR',sans-serif}
    .hidden{opacity:0}

    .pill{position:absolute;top:232px;height:78px;left:60px;width:960px;display:flex;align-items:center;justify-content:center;white-space:nowrap;font-size:42px;font-weight:900}
    .pillBox{display:flex;align-items:center;height:78px;padding:0 40px;background:#FFFFFF;border:5px solid #111111;border-radius:999px;box-shadow:6px 6px 0 #111111;white-space:nowrap;flex-shrink:0}
    .pillBox b{color:#111111;background:#F5C518;border-radius:10px;padding:0 10px;margin-left:10px}

    /* 1) 네 칸 */
    .gcard{position:absolute;width:465px;height:500px}
    #g1{left:60px;top:332px}#g2{left:555px;top:332px}#g3{left:60px;top:862px}#g4{left:555px;top:862px}
    .face{position:absolute;inset:0;background:#FFFFFF;border:6px solid #111111;border-radius:28px;box-shadow:9px 9px 0 #111111;overflow:hidden}
    .front{display:flex;align-items:center;justify-content:center}
    .pul{font-size:250px;font-weight:900;line-height:1;color:#111111;background-image:linear-gradient(#F5C518,#F5C518);background-repeat:no-repeat;background-position:0 86%;background-size:100% 26%;padding:0 18px}
    .back img{position:absolute;left:0;right:0;top:30px;margin:0 auto;width:440px;height:440px;object-fit:contain;display:block}
    .gchip{position:absolute;left:16px;top:14px;height:92px;padding:0 22px;display:flex;align-items:center;background:#FFFFFF;border:5px solid #111111;border-radius:18px;box-shadow:4px 4px 0 #111111;font-family:'Archivo Black',sans-serif;font-size:62px;line-height:1;white-space:nowrap;font-variant-ligatures:none}
    .ring{position:absolute;inset:0;border:14px solid #F5C518;border-radius:24px}

    /* 2) 입술, 3) 귀로만 맞히기: 위아래 큰 카드 */
    .card{position:absolute;left:60px;width:960px;height:510px;background:#FFFFFF;border:6px solid #111111;border-radius:30px;box-shadow:10px 10px 0 #111111;overflow:hidden}
    .top{top:332px}.bottom{top:868px}
    .card img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
    .chip{position:absolute;left:20px;top:18px;height:112px;padding:0 30px;display:flex;align-items:center;gap:22px;background:#FFFFFF;border:5px solid #111111;border-radius:22px;box-shadow:5px 5px 0 #111111;font-family:'Archivo Black',sans-serif;font-size:76px;line-height:1;color:#111111;white-space:nowrap;font-variant-ligatures:none;transform-origin:left center}
    .w{display:block}
    .vw{color:#FF0000}
    .ipa{font-family:Inter,sans-serif;font-size:44px;font-weight:700;color:#3A3A3A}
    .badge{position:absolute;right:20px;top:26px;height:96px;padding:0 30px;display:flex;align-items:center;background:#F5C518;border:5px solid #111111;border-radius:999px;box-shadow:5px 5px 0 #111111;font-size:44px;font-weight:900;white-space:nowrap}

    #bigQ{position:absolute;left:340px;top:700px;width:400px;height:400px;border-radius:50%;background:#F5C518;border:9px solid #111111;box-shadow:12px 12px 0 #111111;display:flex;align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;font-size:250px;line-height:1;color:#111111}
    #qBadge{position:absolute;left:806px;top:760px;width:180px;height:180px;border-radius:50%;background:#F5C518;border:7px solid #111111;box-shadow:7px 7px 0 #111111;display:flex;align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;font-size:112px;line-height:1;color:#111111}

    .cap{position:absolute;left:60px;width:960px;top:1398px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:198px;padding:12px 24px;background:#FFFFFF;border:5px solid #111111;border-radius:30px;box-shadow:7px 7px 0 #111111;font-size:58px;font-weight:800;line-height:1.26;text-align:center}
    .ln{display:block;white-space:nowrap}
    .mark{background-image:linear-gradient(#F5C518,#F5C518);background-repeat:no-repeat;background-position:0 88%;background-size:0% 42%;padding:0 6px}
    #think{position:absolute;left:60px;width:960px;top:1398px;height:198px;display:flex;align-items:center;justify-content:center;gap:44px}
    .td{width:56px;height:56px;border-radius:50%;background:#111111}

    /* 4) 마지막 5초 */
    #cta{position:absolute;inset:0}
    #thumb{position:absolute;left:110px;top:262px;width:860px;height:484px;border:6px solid #111111;border-radius:26px;box-shadow:10px 10px 0 #111111;overflow:hidden;background:#FFFFFF;transform-origin:center center}
    #thumb img{width:100%;height:100%;object-fit:cover;display:block}
    #ctaPill{position:absolute;left:60px;width:960px;top:790px;display:flex;justify-content:center}
    #ctaPillBox{height:104px;padding:0 48px;display:flex;align-items:center;background:#F5C518;border:6px solid #111111;border-radius:999px;box-shadow:7px 7px 0 #111111;font-size:60px;font-weight:900;white-space:nowrap}
    #cap10{top:926px}
    #arrow{position:absolute;left:300px;top:1138px;width:480px;height:480px;transform-origin:50% 90%}
    #arrow img{width:100%;height:100%;display:block}
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
    <div id="pill1" class="pill"><div class="pillBox">한글로는 전부<b>풀</b></div></div>
    <div id="pill2" class="pill hidden"><div class="pillBox">소리가 갈리는 이유</div></div>
    <div id="pill3" class="pill hidden"><div class="pillBox">귀로만 맞혀 보세요</div></div>

    <div id="grid">${gridCard(1, 'pool', '수영장')}${gridCard(2, 'pull', '문을 당기는 손')}${gridCard(3, 'fool', '광대 모자')}${gridCard(4, 'full', '가득 찬 물컵')}
    </div>

    <div id="lips" class="hidden">
      <div id="cardA" class="card top"><img src="assets/images/panels/lips_round.jpg" alt="촛불 끄듯 동그랗게 모은 입술">
        <div id="ringA" class="ring hidden"></div>${chip('chipA1', 'pool')}${chip('chipA2', 'fool')}<div id="badgeA" class="badge hidden">입술 모으기</div></div>
      <div id="cardB" class="card bottom"><img src="assets/images/panels/lips_relaxed.jpg" alt="힘을 뺀 입술">
        <div id="ringB" class="ring hidden"></div>${chip('chipB1', 'pull')}${chip('chipB2', 'full')}<div id="badgeB" class="badge hidden">힘 뺌</div></div>
    </div>

    <div id="bigQ" class="hidden">?</div>
    <div id="quiz" class="hidden">
      <div id="qA" class="card top"><img src="assets/images/panels/quiz_fool.jpg" alt="광대 모자"></div>
      <div id="qB" class="card bottom"><img src="assets/images/panels/quiz_full.jpg" alt="가득 찬 물컵"><div id="ringQ" class="ring hidden"></div>${chip('chipQ', 'full')}</div>
      <div id="qBadge">?</div>
    </div>
    <div id="think" class="hidden"><div class="td" id="d1"></div><div class="td" id="d2"></div><div class="td" id="d3"></div></div>

    ${cap('cap1', '한글로 쓰면 전부 풀입니다.')}
    ${cap('cap2', '그런데 영어로 들으면', '네 단어가 다 다릅니다.')}
    ${cap('cap3', '수영장과 잡아당기다,', '이 둘은 입 모양에서 갈립니다.')}
    ${cap('cap4', '촛불 끄듯이', '입술을 동그랗게 모아 보세요.')}
    ${cap('cap5', '이번엔 입술 힘을 툭 빼고', '턱을 살짝 내려 보세요.')}
    ${cap('cap6', '바보와 배부르다는 말도', '이렇게 갈립니다.')}
    ${cap('cap7', '마지막으로 귀로만 맞혀 보세요.')}
    ${cap('cap8', '바보일까요,', '배부르다는 말일까요?')}
    ${cap('cap9', `${mark('m9', '배부르다는 말')}이었습니다.`)}

    <div id="cta" class="hidden">
      <div id="thumb"><img src="assets/images/longform_thumb.jpg" alt="Pool과 Pull 전체 영상 썸네일"></div>
      <div id="ctaPill"><div id="ctaPillBox">20쌍 전체 영상</div></div>
      ${cap('cap10', '소리가 갈리는 단어 스무 쌍은', '화면 아래 링크에 모아 두었습니다.').replace('cap hidden', 'cap')}
      <div id="arrow"><img src="assets/images/cta_hand.png" alt="아래를 가리키는 손"></div>
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
    const caption = (n) => {
      show('#cap' + n, T['v' + n] - 0.02, 0.12);
      hide('#cap' + n, T['v' + n + 'End'] - 0.14, 0.1);
    };
    // 카드 뒤집기: 앞면을 옆으로 접고(scaleX 0) 뒷면을 펼친다. 소리보다 조금 먼저 시작해 소리와 함께 열린다.
    const flip = (n, at) => {
      tl.to('#gf' + n, {scaleX: 0, duration: 0.13, ease: 'power2.in'}, at - 0.16);
      tl.set('#gf' + n, {opacity: 0}, at - 0.03);
      // opacity를 fromTo의 시작값에만 넣으면 렌더러가 영상 끝까지 갔다가 되돌아올 때 뒷면이 투명한 채로 남는다
      // (2026-11-09 스냅샷에서 pool 칸이 비어 나옴). 보이기는 set으로 따로 걸어 되감기에도 정확히 되돌아가게 한다.
      tl.set('#gb' + n, {opacity: 1}, at - 0.03);
      tl.fromTo('#gb' + n, {scaleX: 0}, {scaleX: 1, duration: 0.2, ease: 'back.out(1.8)', immediateRender: false}, at - 0.03);
    };

    // 1) 네 칸 뒤집기
    tl.fromTo('#grid .front', {scale: 0.92}, {scale: 1, duration: 0.24, ease: 'back.out(2)', stagger: 0.06}, 0);
    caption(1);
    pulse('#pill1 b', T.v1End - 0.5, 1.2);
    flip(1, T.w1);
    flip(2, T.w2);
    flip(3, T.w3);
    flip(4, T.w4);
    caption(2);
    pulse('#g1', T.v2 + 1.6, 1.04);
    pulse('#g2', T.v2 + 1.75, 1.04);
    pulse('#g3', T.v2 + 1.9, 1.04);
    pulse('#g4', T.v2 + 2.05, 1.04);

    // 2) 입 모양
    caption(3);
    show('#gr1', T.v3 + 0.05, 0.14);
    show('#gr2', T.v3 + 0.75, 0.14);
    dim('#g3,#g4', T.v3 + 0.05, 0.3);
    hide('#grid,#pill1', T.v3Split - 0.12, 0.18);
    show('#pill2', T.v3Split + 0.02, 0.16);
    show('#lips', T.v3Split + 0.04, 0.2);
    tl.fromTo('#cardA,#cardB', {y: 40}, {y: 0, duration: 0.3, ease: 'back.out(1.8)', stagger: 0.08}, T.v3Split + 0.04);

    caption(4);
    show('#ringA', T.v4, 0.14);
    dim('#cardB', T.v4, 0.32);
    tl.fromTo('#badgeA', {opacity: 0, scale: 0.6}, {opacity: 1, scale: 1, duration: 0.26, ease: 'back.out(2.2)', immediateRender: false}, T.v4 + 0.1);
    show('#chipA1', T.w5 - 0.1, 0.12);
    pulse('#chipA1', T.w5 + 0.02);

    caption(5);
    hide('#ringA', T.v5, 0.14);
    dim('#cardA', T.v5, 0.32);
    dim('#cardB', T.v5, 1);
    show('#ringB', T.v5, 0.14);
    tl.fromTo('#badgeB', {opacity: 0, scale: 0.6}, {opacity: 1, scale: 1, duration: 0.26, ease: 'back.out(2.2)', immediateRender: false}, T.v5 + 0.1);
    show('#chipB1', T.w6 - 0.1, 0.12);
    pulse('#chipB1', T.w6 + 0.02);

    // 바보와 배부르다: 같은 입 모양 카드에 fool, full이 들어간다
    caption(6);
    hide('#ringB', T.v6, 0.14);
    dim('#cardA', T.v6, 1);
    hide('#chipA1,#chipB1', T.v6 + 0.1, 0.12);
    show('#chipA2,#chipB2', T.v6 + 0.24, 0.14);
    show('#ringA', T.w7 - 0.04, 0.1);
    pulse('#chipA2', T.w7 + 0.02);
    hide('#ringA', T.w8 - 0.12, 0.1);
    show('#ringB', T.w8 - 0.04, 0.1);
    pulse('#chipB2', T.w8 + 0.02);

    // 3) 귀로만 맞히기: 글자를 치우고 큰 물음표
    hide('#lips,#pill2', T.v7 - 0.08, 0.16);
    show('#pill3', T.v7 + 0.04, 0.16);
    caption(7);
    tl.fromTo('#bigQ', {scale: 0.3, opacity: 0}, {scale: 1, opacity: 1, duration: 0.34, ease: 'back.out(2.4)', immediateRender: false}, T.v7 + 0.04);
    pulse('#bigQ', T.w9 + 0.02, 1.1);
    hide('#bigQ', T.v8 - 0.08, 0.12);
    show('#quiz', T.v8 - 0.02, 0.16);
    tl.fromTo('#qBadge', {scale: 0.2}, {scale: 1, duration: 0.3, ease: 'back.out(2.4)'}, T.v8);
    caption(8);
    pulse('#qA', T.v8 + 0.35, 1.03);
    pulse('#qB', T.v8 + 1.05, 1.03);
    pulse('#qBadge', T.w10 + 0.02, 1.12);
    show('#think', T.th, 0.1);
    ['#d1', '#d2', '#d3'].forEach((d, i) => tl.to(d, {opacity: 0.16, scale: 0.7, duration: 0.14, ease: 'power2.in'}, T.th + (i + 1) * 0.43 - 0.14));
    hide('#think', T.th + 1.24, 0.06);
    tl.set(['#d1', '#d2', '#d3'], {opacity: 1, scale: 1}, T.th + 1.3);

    // 정답: 배부르다(full)
    caption(9);
    tl.to('#qBadge', {scale: 0.2, opacity: 0, duration: 0.14, ease: 'power2.in'}, T.v9 - 0.02);
    show('#ringQ', T.v9, 0.12);
    dim('#qA', T.v9, 0.22);
    tl.to('#m9', {backgroundSize: '100% 42%', duration: 0.34, ease: 'power2.out'}, T.v9 + 0.1);
    tl.to('#qB', {scale: 1.04, duration: 0.24, ease: 'back.out(2)'}, T.v9 + 0.05);
    show('#chipQ', T.w11 - 0.1, 0.12);
    pulse('#chipQ', T.w11 + 0.02);

    // 4) 마지막 5초: 롱폼 안내
    hide('#quiz,#pill3', T.cta, 0.2);
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

// 유튜브 업로드용 한국어 자막. 문제를 내는 동안(w9·w10)에는 정답 단어를 적지 않는다.
const NARRATION = {
  v1: '한글로 쓰면 전부 풀입니다.',
  v2: '그런데 영어로 들으면 네 단어가 다 다릅니다.',
  v3: '수영장과 잡아당기다, 이 둘은 입 모양에서 갈립니다.',
  v4: '촛불 끄듯이 입술을 동그랗게 모아 보세요.',
  v5: '이번엔 입술 힘을 툭 빼고 턱을 살짝 내려 보세요.',
  v6: '바보와 배부르다는 말도 이렇게 갈립니다.',
  v7: '마지막으로 귀로만 맞혀 보세요.',
  v8: '바보일까요, 배부르다는 말일까요?',
  v9: '배부르다는 말이었습니다.',
  v10: '소리가 갈리는 단어 스무 쌍은 화면 아래 링크에 모아 두었습니다.',
};
const SPOKEN = {w1: 'pool', w2: 'pull', w3: 'fool', w4: 'full', w5: 'pool', w6: 'pull', w7: 'fool', w8: 'full', w11: 'full'};
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

// 배경음 더킹: 나레이션·원어민 소리(voiceover 묶음)가 나올 때 배경음을 낮춘다. EP24와 같은 세기 0.8.
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
