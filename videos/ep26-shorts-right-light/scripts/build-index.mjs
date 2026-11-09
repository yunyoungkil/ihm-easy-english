#!/usr/bin/env node
// EP26 쇼츠의 index.html을 만든다. 실제 음성 길이로 시각을 계산해 화면 시각과 소리를 맞춘다.
// 이 편만의 코너: 도로 표지판 문장 카드에서 두 단어를 가려 두고 소리만 먼저 들려준다(BRIEF.md).
//
// EP24·25 쇼츠와 일부러 다르게 한 것(2026-11-09, 세 편 성과를 견주기 위해):
//   - 입 그림을 위아래 두 칸에 나란히 두고 한쪽을 흐리게 하는 장면을 쓰지 않는다. 큰 카드 하나에 그림을 한 장씩
//     나레이션 줄마다 바꿔 끼우고, 지금 설명하는 단어를 위의 표지판 문장에서 같이 빛낸다.
//   - 뱃지는 카드 오른쪽 위가 아니라 아래 가운데에 둔다.
// 같게 둔 것: 글꼴, 자막 상자, 마지막 5초 안내(롱폼 썸네일, "20쌍 전체 영상", 손 그림). 쇼츠→롱폼 숫자를 견주려면
// 안내가 같아야 한다.
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

// 원어민 소리는 파일마다 음량 차이가 커서 최고 음량을 나레이션에 가깝게 맞춘다(EP24·25와 같은 기준).
const NATIVE_PEAK_DB = -4;
const nativeGain = (file) => r3(Math.min(3.9, 10 ** ((NATIVE_PEAK_DB - maxDb(file)) / 20)));

const NATIVE = {
  dial: 'assets/voice/dial_01_right_light.wav',
  right: 'assets/voice/m_w01_right.wav',
  light: 'assets/voice/m_w02_light.wav',
};
const gains = Object.fromEntries(Object.entries(NATIVE).map(([k, f]) => [k, nativeGain(f)]));
const lens = Object.fromEntries(Object.entries(NATIVE).map(([k, f]) => [k, probe(f)]));
// 원어민 문장 안에서 right·light가 시작하는 곳(파일 기준 초). 50ms 소리 크기로 쟀다(2026-11-09).
// 롱폼의 dial_01_right_light.words.json은 앞에 여백이 붙은 다른 파일 기준이라 쓰지 않는다(light 끝이 파일 길이보다 길다).
const DIAL_RIGHT = 0.62;
const DIAL_LIGHT = 1.84;

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
// 나레이션 조각 끝에 0.2초 여백이 이미 있어 줄 사이는 짧게 둔다. 45초 안에 넣기 위해서다(BRIEF.md, 31~45초 쇼츠의
// 평균 시청률 중앙값 77%, 46~60초 55%).
const GAP = 0.08;
const AFTER_VOICE = -0.08;

// 1) 문장 퀴즈: 가린 두 단어를 소리로만 듣는다
native('d1', 'dial', 0.1);
voice('v1', 1, 0.3);
voice('v2', 2, GAP);
native('d2', 'dial', 0.2);
T.th = r3(t);
t += THINK;
// 2) 정답: 서로 다른 소리
voice('v3', 3);
voice('v4', 4, GAP);
T.v4Split = r3(T.v4 + 1.66); // n04 안에서 "뒤는"이 시작하는 곳(원본 11.315초 - 조각 시작 9.63초)
voice('v5', 5, 0.2);
// 3) 혀끝
voice('v6', 6, GAP);
voice('v7', 7, GAP);
native('wR', 'right', AFTER_VOICE);
voice('v8', 8, 0.2);
native('wL', 'light', AFTER_VOICE);
// 4) 문장 다시 듣기
voice('v9', 9, 0.2);
native('d3', 'dial', AFTER_VOICE);
// 5) 마지막 안내
T.cta = r3(t + 0.1);
voice('v10', 10, 0.25);
t += 0.6;
const TOTAL = r3(t);
T.total = TOTAL;

const SFX = {pop: 'assets/sfx/pop.mp3', tick: 'assets/sfx/click-soft.mp3', whoosh: 'assets/sfx/whoosh.mp3'};
[0, 1, 2].forEach((i) => sfx(`tick${i + 1}`, SFX.tick, T.th + i * 0.43, 0.3));
sfx('pop1', SFX.pop, T.v3, 0.32);
sfx('whoosh', SFX.whoosh, T.cta, 0.3);

const audioTags = audio
  .map((a) => `    <audio id="${a.id}" src="${a.src}" data-start="${a.start}" data-duration="${a.dur}" data-track-index="${a.track}" data-volume="${a.volume}"${a.group ? ' data-audio-group="voiceover"' : ''}></audio>`)
  .join('\n');

// 단어마다 다른 앞 글자만 강조한다(r 노랑, l 하늘). 나머지는 그대로 둔다.
const RIGHT = '<span class="hr">r</span>ight';
const LIGHT = '<span class="hl">l</span>ight';
const cap = (id, lines, cls = '') => `<div id="${id}" class="cap ${cls} hidden">${lines.map((l) => `<span class="ln">${l}</span>`).join('')}</div>`;
// 가림판은 퀴즈 동안 단어를 일부러 덮는다(겹침 검사에서 의도한 겹침으로 표시).
const slot = (n, word) => `<span id="s${n}" class="slot" data-layout-allow-occlusion data-layout-allow-overlap><span id="w${n}" class="word hidden" data-layout-allow-occlusion>${word.replace(/class="(hr|hl)"/, 'class="$1" data-layout-allow-occlusion')}</span><span id="glow${n}" class="glow g${n} hidden"></span><span id="mask${n}" class="mask" data-layout-allow-overflow data-layout-allow-overlap><span id="mq${n}" class="mq hidden" data-layout-allow-overlap>?</span></span></span>`;
const chip = (id, word, extra) => `<div id="${id}" class="chip hidden"><span class="w">${word}</span>${extra}</div>`;
const badge = (id, text) => `<div class="badgeRow"><div id="${id}" class="badge hidden">${text}</div></div>`;

const html = `<!DOCTYPE html>
<html lang="ko" data-resolution="portrait">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>라이트 두 번</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face{font-family:'Noto Sans KR';src:url('assets/fonts/NotoSansKR-subset.ttf') format('truetype');font-weight:100 900;font-display:block}
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#F4EFE6}
    #root{position:relative;width:100%;height:100%;overflow:hidden;background:#F4EFE6;color:#111111;font-family:'Noto Sans KR',sans-serif}
    .hidden{opacity:0}

    .pill{position:absolute;top:232px;height:78px;left:60px;width:960px;display:flex;align-items:center;justify-content:center;white-space:nowrap;font-size:42px;font-weight:900}
    .pillBox{display:flex;align-items:center;height:78px;padding:0 40px;background:#FFFFFF;border:5px solid #111111;border-radius:999px;box-shadow:6px 6px 0 #111111;white-space:nowrap;flex-shrink:0}

    /* 도로 표지판 문장 카드 */
    #sign{position:absolute;left:60px;top:330px;width:960px;height:380px;background:#1D6B42;border:6px solid #111111;border-radius:30px;box-shadow:10px 10px 0 #111111;transform-origin:center center}
    .signIn{position:absolute;inset:16px;border:5px solid #FFFFFF;border-radius:18px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
    .sl{font-family:'Archivo Black',sans-serif;font-size:78px;line-height:1.1;color:#FFFFFF;white-space:nowrap;font-variant-ligatures:none}
    .slot{position:relative;display:inline-block}
    .word{position:relative;z-index:1}
    .hr,.hl{color:#111111;border-radius:10px;padding:0 6px}
    .hr{background:#F5C518}
    .hl{background:#7DD3FC}
    .mask{position:absolute;z-index:2;left:-8px;right:-8px;top:2px;bottom:2px;background:#F5C518;border:5px solid #111111;border-radius:14px;display:flex;align-items:center;justify-content:center;transform-origin:right center}
    .mq{font-family:'Archivo Black',sans-serif;font-size:66px;line-height:1;color:#111111}
    .glow{position:absolute;z-index:0;left:-16px;right:-16px;top:-6px;bottom:-6px;border-radius:16px;border:7px solid #F5C518}
    .g2{border-color:#7DD3FC}

    /* 그림 카드: 나레이션 줄마다 그림 한 장 */
    #pic{position:absolute;left:60px;top:750px;width:960px;height:610px;background:#FFFFFF;border:6px solid #111111;border-radius:30px;box-shadow:10px 10px 0 #111111;overflow:hidden}
    .pane{position:absolute;inset:0}
    .pane img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
    .chip{position:absolute;left:20px;top:18px;height:112px;padding:0 30px;display:flex;align-items:center;gap:22px;background:#FFFFFF;border:5px solid #111111;border-radius:22px;box-shadow:5px 5px 0 #111111;font-family:'Archivo Black',sans-serif;font-size:76px;line-height:1;color:#111111;white-space:nowrap;font-variant-ligatures:none;transform-origin:left center}
    .ko{font-family:'Noto Sans KR',sans-serif;font-size:46px;font-weight:900;color:#3A3A3A}
    .ipa{font-family:Inter,sans-serif;font-size:44px;font-weight:700;color:#3A3A3A}
    .badgeRow{position:absolute;left:0;right:0;bottom:22px;display:flex;justify-content:center}
    .badge{height:96px;padding:0 34px;display:flex;align-items:center;background:#F5C518;border:5px solid #111111;border-radius:999px;box-shadow:5px 5px 0 #111111;font-size:46px;font-weight:900;white-space:nowrap}
    #bT{background:#7DD3FC}
    .tip{position:absolute;width:170px;height:170px;border-radius:50%;border:9px solid #F5C518}
    #tipF{left:324px;top:225px}
    #tipT{left:278px;top:170px;border-color:#7DD3FC}
    .kr{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:40px;font-size:120px;font-weight:900;white-space:nowrap}
    .kr b{background-image:linear-gradient(#F5C518,#F5C518);background-repeat:no-repeat;background-position:0 88%;background-size:100% 30%;font-weight:900}
    .eq{color:#8A8A8A}

    #bigQ{position:absolute;left:340px;top:855px;width:400px;height:400px;border-radius:50%;background:#F5C518;border:9px solid #111111;box-shadow:12px 12px 0 #111111;display:flex;align-items:center;justify-content:center;font-family:'Archivo Black',sans-serif;font-size:250px;line-height:1;color:#111111}

    .cap{position:absolute;left:60px;width:960px;top:1398px;display:flex;flex-direction:column;align-items:center;justify-content:center;height:198px;padding:12px 24px;background:#FFFFFF;border:5px solid #111111;border-radius:30px;box-shadow:7px 7px 0 #111111;font-size:58px;font-weight:800;line-height:1.26;text-align:center}
    .cap.sm{font-size:54px}
    .ln{display:block;white-space:nowrap}
    #think{position:absolute;left:60px;width:960px;top:1398px;height:198px;display:flex;align-items:center;justify-content:center;gap:44px}
    .td{width:56px;height:56px;border-radius:50%;background:#111111}

    /* 마지막 5초 (EP24·25 쇼츠와 같다) */
    #cta{position:absolute;inset:0}
    #thumb{position:absolute;left:110px;top:262px;width:860px;height:484px;border:6px solid #111111;border-radius:26px;box-shadow:10px 10px 0 #111111;overflow:hidden;background:#FFFFFF;transform-origin:center center}
    #thumb img{width:100%;height:100%;object-fit:cover;display:block}
    #ctaPill{position:absolute;left:60px;width:960px;top:790px;display:flex;justify-content:center}
    #ctaPillBox{height:104px;padding:0 48px;display:flex;align-items:center;background:#F5C518;border:6px solid #111111;border-radius:999px;box-shadow:7px 7px 0 #111111;font-size:60px;font-weight:900;white-space:nowrap}
    #cap10{top:926px;height:236px;font-size:52px;line-height:1.22}
    #arrow{position:absolute;left:310px;top:1176px;width:460px;height:460px;transform-origin:50% 90%}
    #arrow img{width:100%;height:100%;display:block}
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
    <div id="pill1" class="pill"><div class="pillBox">가려진 두 단어</div></div>
    <div id="pill2" class="pill hidden"><div class="pillBox">서로 다른 소리</div></div>
    <div id="pill3" class="pill hidden"><div class="pillBox">차이는 혀끝</div></div>
    <div id="pill4" class="pill hidden"><div class="pillBox">다시 들어 보기</div></div>

    <div id="sign"><div class="signIn">
      <div class="sl">Turn ${slot(1, RIGHT)}</div>
      <div class="sl">at the traffic ${slot(2, LIGHT)}</div>
    </div></div>

    <div id="bigQ" class="hidden">?</div>

    <div id="pic" class="hidden">
      <div id="pCar" class="pane hidden"><img src="assets/images/panels/car_right.jpg" alt="사거리에서 오른쪽으로 도는 차">${chip('chipCar', RIGHT, '<span class="ko">오른쪽</span>').replace(' hidden', '')}</div>
      <div id="pLight" class="pane hidden"><img src="assets/images/panels/traffic_light.jpg" alt="신호등">${chip('chipLight', LIGHT, '<span class="ko">신호등</span>').replace(' hidden', '')}</div>
      <div id="pKr" class="pane hidden"><div class="kr"><span><b>라</b>이트</span><span class="eq">=</span><span><b>라</b>이트</span></div></div>
      <div id="pFree" class="pane hidden"><img src="assets/images/panels/tongue_free.jpg" alt="혀끝이 입천장에 닿지 않은 입 안 옆모습"><div id="tipF" class="tip hidden"></div>${chip('chipR', RIGHT, '<span class="ipa">[raɪt]</span>')}${badge('bF', '허공 0%')}</div>
      <div id="pTouch" class="pane hidden"><img src="assets/images/panels/tongue_touch.jpg" alt="혀끝이 윗니 뒤 잇몸에 닿은 입 안 옆모습"><div id="tipT" class="tip hidden"></div>${chip('chipL', LIGHT, '<span class="ipa">[laɪt]</span>')}${badge('bT', '잇몸 100%')}</div>
    </div>

    <div id="think" class="hidden"><div class="td" id="d1dot"></div><div class="td" id="d2dot"></div><div class="td" id="d3dot"></div></div>

    ${cap('cap1', ['길을 알려 줄 때 쓰는 문장인데,', '라이트가 두 번 나옵니다.'])}
    ${cap('cap2', ['앞의 라이트와 뒤의 라이트,', '같은 소리일까요?'])}
    ${cap('cap3', ['서로 다른 소리입니다.'])}
    ${cap('cap4', ['앞은 오른쪽이고,', '뒤는 신호등이거든요.'])}
    ${cap('cap5', ['우리말에는 리을 소리가 하나뿐이라,', '둘이 똑같이 들리기 쉽습니다.'], 'sm')}
    ${cap('cap6', ['차이는 혀끝에 있습니다.'])}
    ${cap('cap7', ['혀끝을 입천장에 대지 않고', '띄워 두면 오른쪽입니다.'])}
    ${cap('cap8', ['혀끝을 윗니 뒤 잇몸에 붙이면', '신호등입니다.'])}
    ${cap('cap9', ['이제 문장을 다시 들어 보세요.'])}

    <div id="cta" class="hidden">
      <div id="thumb"><img src="assets/images/longform_thumb.jpg" alt="Right와 Light 전체 영상 썸네일"></div>
      <div id="ctaPill"><div id="ctaPillBox">20쌍 전체 영상</div></div>
      ${cap('cap10', ['짝단어 스무 쌍으로 더 연습하고', '싶으시면, 화면 아래 링크에', '전체 영상이 있습니다.']).replace('cap  hidden', 'cap')}
      <div id="arrow"><img src="assets/images/cta_hand.png" alt="아래를 가리키는 손"></div>
    </div>

    <audio id="bgm" src="assets/bgm/track.mp3" data-start="0" data-duration="${TOTAL}" data-track-index="4" data-volume="0.06" data-fade-out="1"></audio>
${audioTags}
  </div>
  <script>
    const T = ${JSON.stringify(T)};
    const DR = ${DIAL_RIGHT};
    const DL = ${DIAL_LIGHT};
    const tl = gsap.timeline({paused: true});
    const show = (sel, at, duration = 0.18) => tl.to(sel, {opacity: 1, duration, ease: 'power2.out'}, at);
    const hide = (sel, at, duration = 0.14) => tl.to(sel, {opacity: 0, duration, ease: 'power2.in'}, at);
    const swap = (from, to, at) => {
      hide(from, at, 0.2);
      show(to, at, 0.24);
    };
    const pulse = (sel, at, scale = 1.16) => {
      tl.to(sel, {scale, duration: 0.11, ease: 'power2.out'}, at);
      tl.to(sel, {scale: 1, duration: 0.26, ease: 'back.out(3)'}, at + 0.11);
    };
    // fromTo는 시작값과 끝값에 같은 속성을 모두 적는다. 한쪽에만 적으면 렌더러가 끝까지 갔다가 되돌아올 때
    // 값이 남는다(EP25 쇼츠 pool 칸이 비어 나온 일, 2026-11-09).
    const popIn = (sel, at, from = 0.6) => tl.fromTo(sel, {opacity: 0, scale: from}, {opacity: 1, scale: 1, duration: 0.26, ease: 'back.out(2.2)', immediateRender: false}, at);
    const caption = (n) => {
      show('#cap' + n, T['v' + n] - 0.02, 0.12);
      hide('#cap' + n, T['v' + n + 'End'] - 0.14, 0.1);
    };
    const hearSentence = (key, scale) => {
      pulse('#s1', T[key] + DR, scale);
      pulse('#s2', T[key] + DL, scale);
    };

    // 1) 문장 퀴즈: 가린 두 단어
    tl.fromTo('#sign', {scale: 0.94}, {scale: 1, duration: 0.26, ease: 'back.out(2)'}, 0);
    // 첫 화면부터 큰 물음표를 둔다. 표지판만 있으면 처음 6초 동안 화면 아래가 비어 넘기기 쉽다(2026-11-09 스냅샷).
    popIn('#bigQ', 0.12, 0.3);
    hearSentence('d1', 1.1);
    caption(1);
    pulse('#s1', T.v1 + 2.65, 1.1); // "두 번"
    pulse('#s2', T.v1 + 2.95, 1.1);
    caption(2);
    pulse('#s1', T.v2 + 0.6, 1.1); // "앞의 라이트"
    pulse('#s2', T.v2 + 1.8, 1.1); // "뒤의 라이트"
    show('#mq1,#mq2', T.v2 + 2.1, 0.12); // "같은 소리일까요?"
    pulse('#bigQ', T.v2 + 2.15, 1.12);
    hearSentence('d2', 1.1);
    pulse('#bigQ', T.d2 + 0.02, 1.08);
    show('#think', T.th, 0.1);
    ['#d1dot', '#d2dot', '#d3dot'].forEach((d, i) => tl.to(d, {opacity: 0.16, scale: 0.7, duration: 0.14, ease: 'power2.in'}, T.th + (i + 1) * 0.43 - 0.14));
    hide('#think', T.th + 1.24, 0.06);
    tl.set(['#d1dot', '#d2dot', '#d3dot'], {opacity: 1, scale: 1}, T.th + 1.3);

    // 2) 정답: 가림이 벗겨지고 서로 다른 단어가 드러난다
    caption(3);
    hide('#bigQ', T.v3 - 0.06, 0.12);
    // 가린 단어는 정답 전까지 아예 숨긴다. 가림판만 두면 l의 하늘색 상자가 가림판 아래로 삐져나와 답이 비쳤다
    // (2026-11-09 렌더 1차본 0.3초 화면).
    tl.set('#w1,#w2', {opacity: 1}, T.v3 - 0.01);
    tl.to('#mask1', {scaleX: 0, duration: 0.22, ease: 'power2.in'}, T.v3);
    tl.to('#mask2', {scaleX: 0, duration: 0.22, ease: 'power2.in'}, T.v3 + 0.14);
    pulse('#s1', T.v3 + 0.24, 1.14);
    pulse('#s2', T.v3 + 0.38, 1.14);
    swap('#pill1', '#pill2', T.v3);

    caption(4);
    show('#pic', T.v4 - 0.04, 0.16);
    tl.fromTo('#pic', {y: 40}, {y: 0, duration: 0.3, ease: 'back.out(1.8)'}, T.v4 - 0.04);
    show('#pCar', T.v4 - 0.04, 0.01);
    show('#glow1', T.v4, 0.14);
    pulse('#chipCar', T.v4 + 0.3, 1.08);
    swap('#pCar', '#pLight', T.v4Split);
    hide('#glow1', T.v4Split, 0.14);
    show('#glow2', T.v4Split, 0.14);
    pulse('#chipLight', T.v4Split + 0.25, 1.08);

    caption(5);
    swap('#pLight', '#pKr', T.v5);
    hide('#glow2', T.v5, 0.14);
    pulse('#pKr .kr', T.v5 + 2.55, 1.06); // "둘이 똑같이"

    // 3) 혀끝: 한 장씩
    caption(6);
    swap('#pill2', '#pill3', T.v6);
    swap('#pKr', '#pFree', T.v6);
    popIn('#tipF', T.v6 + 0.45, 0.5); // "혀끝에"
    caption(7);
    show('#glow1', T.v7, 0.14);
    popIn('#bF', T.v7 + 2.9); // "띄워 두면"
    show('#chipR', T.wR - 0.1, 0.12);
    pulse('#chipR', T.wR + 0.02);
    pulse('#s1', T.wR + 0.02, 1.12);
    caption(8);
    swap('#pFree', '#pTouch', T.v8);
    hide('#glow1', T.v8, 0.14);
    show('#glow2', T.v8, 0.14);
    popIn('#tipT', T.v8 + 0.25, 0.5);
    popIn('#bT', T.v8 + 1.2); // "잇몸에 붙이면"
    show('#chipL', T.wL - 0.1, 0.12);
    pulse('#chipL', T.wL + 0.02);
    pulse('#s2', T.wL + 0.02, 1.12);

    // 4) 문장 다시 듣기: 표지판을 가운데로 내리고, 소리에 맞춰 두 단어가 튄다
    caption(9);
    hide('#pic', T.v9 - 0.04, 0.2);
    hide('#glow2', T.v9, 0.14);
    swap('#pill3', '#pill4', T.v9);
    tl.to('#sign', {y: 380, duration: 0.42, ease: 'power2.inOut'}, T.v9 + 0.05);
    show('#glow1', T.d3 + DR - 0.04, 0.08);
    hide('#glow1', T.d3 + DR + 0.5, 0.12);
    show('#glow2', T.d3 + DL - 0.04, 0.08);
    hide('#glow2', T.d3 + DL + 0.5, 0.12);
    hearSentence('d3', 1.18);

    // 5) 마지막 안내 (EP24·25 쇼츠와 같다)
    hide('#sign,#pill4', T.cta, 0.2);
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

// 유튜브 업로드용 한국어 자막. 문제를 내는 동안(d1·d2)에는 원어민 문장을 적지 않는다(정답이 보이기 때문).
const NARRATION = {
  v1: '길을 알려 줄 때 쓰는 문장인데, 라이트가 두 번 나옵니다.',
  v2: '앞의 라이트와 뒤의 라이트, 같은 소리일까요?',
  v3: '서로 다른 소리입니다.',
  v4: '앞은 오른쪽이고, 뒤는 신호등이거든요.',
  v5: '우리말에는 리을 소리가 하나뿐이라, 둘이 똑같이 들리기 쉽습니다.',
  v6: '차이는 혀끝에 있습니다.',
  v7: '혀끝을 입천장에 대지 않고 띄워 두면 오른쪽입니다.',
  v8: '혀끝을 윗니 뒤 잇몸에 붙이면 신호등입니다.',
  v9: '이제 문장을 다시 들어 보세요.',
  v10: '짝단어 스무 쌍으로 더 연습하고 싶으시면, 화면 아래 링크에 전체 영상이 있습니다.',
};
const SPOKEN = {wR: 'right', wL: 'light', d3: 'Turn right at the traffic light.'};
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

// 배경음 더킹: 나레이션·원어민 소리(voiceover 묶음)가 나올 때 배경음을 낮춘다. EP24·25와 같은 세기 0.8.
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
