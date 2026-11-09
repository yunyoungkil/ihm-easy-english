#!/usr/bin/env node
// EP29 쇼츠의 index.html을 만든다. 실제 음성 길이로 시각을 계산해 화면 시각과 소리를 맞춘다.
// 이 편만의 코너: 이미 아는 인사말 "Thank you very much"에서 시작해, 그 very를 과일 berry와 두 줄로 나란히 놓고 비교한다.
// 줄마다 왼쪽 그림이 뜻 그림에서 입 모양 그림으로 바뀐다(설명 방식이 EP24~28 쇼츠와 다르다). 마지막에 인사말을 다시 들려준다.
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

const NATIVE = {
  hello: 'assets/voice/thank_you_very_much.wav',
  berry: 'assets/voice/m_w05_berry.wav',
  very: 'assets/voice/m_w06_very.wav',
};
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

// 나레이션 조각 끝에 0.2초 여백이 이미 있어 줄 사이는 짧게 둔다(BRIEF.md, 45초 이내).
const GAP = 0.08;
const AFTER_VOICE = -0.08;

// 1) 이미 아는 인사말부터
native('h1', 'hello', 0.1);
voice('v1', 1, 0.1);
// 2) 과일 berry와 나란히
voice('v2', 2, GAP);
voice('v3', 3, GAP);
// 3) 입 모양
voice('v4', 4, GAP);
native('wb', 'berry', AFTER_VOICE);
voice('v5', 5, GAP);
native('wv', 'very', AFTER_VOICE);
voice('v6', 6, GAP);
// 4) 인사를 다시
voice('v7', 7, GAP);
native('h2', 'hello', AFTER_VOICE);
// 5) 마지막 안내
T.cta = r3(t + 0.1);
voice('v8', 8, 0.25);
t += 0.6;
const TOTAL = r3(t);
T.total = TOTAL;

const SFX = {pop: 'assets/sfx/pop.mp3', tick: 'assets/sfx/click-soft.mp3', whoosh: 'assets/sfx/whoosh.mp3'};
sfx('pop1', SFX.pop, T.v3 + 0.05, 0.3);
sfx('tick1', SFX.tick, T.v4 + 0.05, 0.22);
sfx('tick2', SFX.tick, T.v5 + 0.05, 0.22);
sfx('pop2', SFX.pop, T.v6 + 0.1, 0.3);
sfx('whoosh', SFX.whoosh, T.cta, 0.3);

const audioTags = audio
  .map((a) => `    <audio id="${a.id}" src="${a.src}" data-start="${a.start}" data-duration="${a.dur}" data-track-index="${a.track}" data-volume="${a.volume}"${a.group ? ' data-audio-group="voiceover"' : ''}></audio>`)
  .join('\n');

// b(두 입술 닫기)는 노랑, v(윗니가 아랫입술에 살짝)는 하늘색. EP28 쇼츠의 p(노랑)·f(하늘)와 같은 자리끼리 같은 색이다.
const BERRY = '<span class="hb">b</span>erry';
const VERY = '<span class="hv">v</span>ery';
const cap = (id, lines, cls = '') => `<div id="${id}" class="cap ${cls} hidden">${lines.map((l) => `<span class="ln">${l}</span>`).join('')}</div>`;

const html = `<!DOCTYPE html>
<html lang="ko" data-resolution="portrait">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>땡큐 베리 머치</title>
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
    .hb{color:#111111;background:#F5C518;border-radius:10px;padding:0 6px}
    .hv{color:#111111;background:#7DD3FC;border-radius:10px;padding:0 6px}

    /* 1) 인사말 */
    #giftPic{position:absolute;left:30px;right:30px;top:24px;height:470px;width:auto;object-fit:contain}
    #hello{position:absolute;left:30px;right:30px;top:520px;height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px}
    #helloEn{font-family:'Archivo Black',sans-serif;font-size:62px;line-height:1.05;white-space:nowrap;font-variant-ligatures:none}
    #helloKo{font-size:50px;font-weight:900;color:#3A3A3A;white-space:nowrap}

    /* 2) 두 줄 비교 */
    .row{position:absolute;left:24px;right:24px;height:420px;display:flex;align-items:center;gap:26px;padding:0 20px}
    #rowA{top:12px;border-bottom:4px dashed #D8D2C4}
    #rowB{top:444px}
    .rp{position:relative;flex:0 0 430px;height:340px}
    .rp img,.rp .bgimg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
    .rp .bgimg{background-size:contain;background-repeat:no-repeat;background-position:center}
    .rt{position:relative;flex:1;height:340px}
    .rt > div{position:absolute;inset:0;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:14px}
    .ko{font-size:120px;font-weight:900;line-height:1;white-space:nowrap}
    .tag{font-size:42px;font-weight:900;color:#3A3A3A;white-space:nowrap}
    .en{font-family:'Archivo Black',sans-serif;font-size:116px;line-height:1;white-space:nowrap;font-variant-ligatures:none}
    .ipa{font-family:Inter,sans-serif;font-size:44px;font-weight:700;color:#3A3A3A}
    .bd{display:inline-flex;align-items:center;height:80px;padding:0 28px;background:#F5C518;border:5px solid #111111;border-radius:999px;box-shadow:5px 5px 0 #111111;font-size:40px;font-weight:900;white-space:nowrap}
    .bd.sky{background:#7DD3FC}
    .touch{position:absolute;width:150px;height:96px;border:12px solid #F5C518;border-radius:50%}
    #tA{left:140px;top:120px}
    #tB{left:140px;top:128px;border-color:#7DD3FC}
    #neq{position:absolute;left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:#FFFFFF;border:8px solid #111111;box-shadow:7px 7px 0 #111111;z-index:3}
    /* ≠는 한글 글꼴에 없어서 막대로 그린다 */
    #neq i{position:absolute;left:34px;width:82px;height:13px;border-radius:7px;background:#111111}
    #neq i:nth-child(1){top:48px}
    #neq i:nth-child(2){top:88px}
    #neq i:nth-child(3){left:20px;top:68px;width:110px;transform:rotate(-58deg)}

    .cap{position:absolute;left:60px;width:960px;top:1398px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:198px;padding:12px 24px;background:#FFFFFF;border:5px solid #111111;border-radius:30px;box-shadow:7px 7px 0 #111111;font-size:58px;font-weight:800;line-height:1.26;text-align:center}
    .cap.sm{font-size:52px}
    .ln{display:block;white-space:nowrap}

    /* 마지막 5초 (EP24~26 쇼츠와 같다) */
    #cta{position:absolute;inset:0}
    #thumb{position:absolute;left:110px;top:262px;width:860px;height:484px;border:6px solid #111111;border-radius:26px;box-shadow:10px 10px 0 #111111;overflow:hidden;background:#FFFFFF;transform-origin:center center}
    #thumb img{width:100%;height:100%;object-fit:cover;display:block}
    #ctaPill{position:absolute;left:60px;width:960px;top:790px;display:flex;justify-content:center}
    #ctaPillBox{height:104px;padding:0 48px;display:flex;align-items:center;background:#F5C518;border:6px solid #111111;border-radius:999px;box-shadow:7px 7px 0 #111111;font-size:60px;font-weight:900;white-space:nowrap}
    #cap8{top:926px;height:236px;font-size:52px;line-height:1.22}
    #arrow{position:absolute;left:310px;top:1176px;width:460px;height:460px;transform-origin:50% 90%}
    #arrow img{width:100%;height:100%;display:block}
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
    <div id="pill1" class="pill"><div class="pillBox">땡큐 베리 머치</div></div>
    <div id="pill2" class="pill hidden"><div class="pillBox">베리 = 베리?</div></div>
    <div id="pill3" class="pill hidden"><div class="pillBox">입술이 닿는 곳</div></div>
    <div id="pill4" class="pill hidden"><div class="pillBox">인사 다시 듣기</div></div>

    <div id="bubble" class="card">
      <img id="giftPic" src="assets/images/panels/gift.jpg" alt="선물을 건네고 받는 두 손">
      <div id="hello"><div id="helloEn">Thank you ${VERY} much</div><div id="helloKo">땡큐 베리 머치</div></div>
    </div>

    <div id="rows" class="card hidden">
      <div id="rowA" class="row">
        <div class="rp"><img id="pBerry" src="assets/images/panels/berries.jpg" alt="베리 바구니"><img id="mBerry" class="hidden" src="assets/images/panels/lips_close.jpg" alt="두 입술을 붙인 모양"><div id="tA" class="touch hidden"></div></div>
        <div class="rt">
          <div id="koA"><span class="ko">베리</span><span class="tag">과일</span></div>
          <div id="enA" class="hidden"><span class="en">${BERRY}</span><span class="ipa">[ˈbɛri]</span><span id="bdA" class="bd hidden">입술 붙였다 떼기</span></div>
        </div>
      </div>
      <div id="rowB" class="row">
        <div class="rp"><div id="pVery" class="bgimg" style="background-image:url(assets/images/panels/gift.jpg)"></div><img id="mVery" class="hidden" src="assets/images/panels/lips_touch.jpg" alt="윗니가 아랫입술에 살짝 닿은 모양"><div id="tB" class="touch hidden"></div></div>
        <div class="rt">
          <div id="koB"><span class="ko">베리</span><span class="tag">땡큐 베리 머치</span></div>
          <div id="enB" class="hidden"><span class="en">${VERY}</span><span class="ipa">[ˈvɛri]</span><span id="bdB" class="bd sky hidden">윗니 살짝</span></div>
        </div>
      </div>
      <div id="neq" class="hidden"><i></i><i></i><i></i></div>
    </div>

    ${cap('cap1', ['학교에서 누구나 배운 영어 인사,', '땡큐 베리 머치.'], 'sm')}
    ${cap('cap2', ['여기서 베리를 과일 베리랑', '같은 소리로 읽고 계셨나요?'], 'sm')}
    ${cap('cap3', ['둘은 첫소리부터 다릅니다.'])}
    ${cap('cap4', ['과일 베리는 두 입술을', '붙였다가 떼면서 시작합니다.'], 'sm')}
    ${cap('cap5', ['베리 머치의 베리는 윗니를', '아랫입술에 살짝 대고 시작하고요.'], 'sm')}
    ${cap('cap6', ['입술이 닿는 곳이 달라서,', '처음 나오는 소리가 달라집니다.'], 'sm')}
    ${cap('cap7', ['이제 인사를 다시 들어 보세요.'])}

    <div id="cta" class="hidden">
      <div id="thumb"><img src="assets/images/longform_thumb.jpg" alt="B와 V 전체 영상 썸네일"></div>
      <div id="ctaPill"><div id="ctaPillBox">24쌍 전체 영상</div></div>
      ${cap('cap8', ['비와 브이 짝단어 스물네 쌍은', '화면 아래 링크의 전체 영상에서', '반복해 들을 수 있습니다.']).replace('cap  hidden', 'cap')}
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
    // 사라지는 쪽이 거의 사라진 뒤에 나타나는 쪽을 켠다(글자가 겹쳐 보이는 것을 막는다)
    const swap = (from, to, at) => {
      hide(from, at, 0.14);
      show(to, at + 0.1, 0.2);
    };

    // 1) 인사말: 소리가 나오는 순간 very가 튄다
    tl.fromTo('#bubble', {scale: 0.94}, {scale: 1, duration: 0.26, ease: 'back.out(2)'}, 0);
    pulse('#helloEn .hv', T.h1 + 0.5, 1.3);
    caption(1);
    // 아래 반응 시각은 whisper 단어 시각(줄 시작 기준)에 맞췄다(2026-11-09).
    pulse('#helloEn .hv', T.v1 + 2.45, 1.25); // "땡큐 베리 머치"의 베리 2.4초

    // 2) 과일 berry와 나란히: 둘 다 한글로는 "베리"
    caption(2);
    swap('#bubble', '#rows', T.v2 - 0.04);
    tl.fromTo('#rows', {y: 36}, {y: 0, duration: 0.3, ease: 'back.out(1.8)'}, T.v2 - 0.04);
    swap('#pill1', '#pill2', T.v2 - 0.04);
    pulse('#koB .ko', T.v2 + 0.8, 1.08); // "여기서 베리를"(인사말의 베리) 0.7초
    pulse('#koA .ko', T.v2 + 1.9, 1.08); // "과일 베리랑" 1.9초

    // 3) 영어 철자로 바뀌고 ≠가 붙는다
    caption(3);
    swap('#koA', '#enA', T.v3);
    swap('#koB', '#enB', T.v3 + 0.12);
    popIn('#neq', T.v3 + 0.3, 0.4);

    // 4) 입 모양: 줄마다 왼쪽 그림이 입 모양으로 바뀐다
    caption(4);
    swap('#pill2', '#pill3', T.v4);
    hide('#neq', T.v4, 0.14);
    swap('#pBerry', '#mBerry', T.v4);
    popIn('#bdA', T.v4 + 1.5); // "두 입술을 붙였다가" 1.4초
    pulse('#enA .hb', T.wb + 0.02, 1.3);
    caption(5);
    swap('#pVery', '#mVery', T.v5);
    pulse('#enB .en', T.v5 + 1.35, 1.05); // "베리는" 1.3초
    pulse('#mVery', T.v5 + 2.3, 1.04); // "윗니를" 2.2초
    popIn('#bdB', T.v5 + 3.75); // "살짝" 3.75초
    pulse('#enB .hv', T.wv + 0.02, 1.3);

    // 5) 닿는 곳이 다르다: 두 입 모양에 동그라미
    caption(6);
    popIn('#tA', T.v6 + 0.6, 0.5); // "닿는" 0.66초
    popIn('#tB', T.v6 + 0.95, 0.5); // "곳이" 0.9초

    // 6) 인사를 다시 듣는다
    show('#cap7', T.v7 - 0.02, 0.12);
    hide('#cap7', T.h2End, 0.1); // 줄이 짧아(1.4초) 인사말이 나오는 동안 같이 둔다
    swap('#rows', '#bubble', T.v7 - 0.04);
    swap('#pill3', '#pill4', T.v7 - 0.04);
    pulse('#helloEn .hv', T.h2 + 0.5, 1.3);

    // 7) 마지막 5초: 롱폼 안내 (EP24~26 쇼츠와 같다)
    hide('#bubble,#pill4', T.cta, 0.2);
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

// 유튜브 업로드용 한국어 자막. 인사말 원어민 소리는 영어 그대로 적는다.
const NARRATION = {
  v1: '학교에서 누구나 배운 영어 인사, 땡큐 베리 머치.',
  v2: '여기서 베리를 과일 베리랑 같은 소리로 읽고 계셨나요?',
  v3: '둘은 첫소리부터 다릅니다.',
  v4: '과일 베리는 두 입술을 붙였다가 떼면서 시작합니다.',
  v5: '베리 머치의 베리는 윗니를 아랫입술에 살짝 대고 시작하고요.',
  v6: '입술이 닿는 곳이 달라서, 처음 나오는 소리가 달라집니다.',
  v7: '이제 인사를 다시 들어 보세요.',
  v8: '비와 브이 짝단어 스물네 쌍은 화면 아래 링크의 전체 영상에서 반복해 들을 수 있습니다.',
};
const SPOKEN = {h1: 'Thank you very much.', wb: 'berry', wv: 'very', h2: 'Thank you very much.'};
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
