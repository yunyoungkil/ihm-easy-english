#!/usr/bin/env node
// EP27 쇼츠의 index.html을 만든다. 실제 음성 길이로 시각을 계산해 화면 시각과 소리를 맞춘다.
// 이 편만의 코너: 끝 글자 s 하나가 단어마다 다른 색(스 빨강·즈 파랑·이즈 초록)으로 바뀌고, 마지막에 "바로 앞 글자"에 표시가 붙는다.
// 처음에 "도그스"라는 틀린 읽기를 보여 주고 빨간 X로 지운다(실패 먼저 보여 주기).
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
  dogs: 'assets/voice/m_w07_dogs.wav',
  cats: 'assets/voice/m_w01_cats.wav',
  buses: 'assets/voice/m_w13_buses.wav',
};
const gains = Object.fromEntries(Object.entries(NATIVE).map(([k, f]) => [k, nativeGain(f)]));
const lens = Object.fromEntries(Object.entries(NATIVE).map(([k, f]) => [k, probe(f)]));

// 이 편 나레이션은 EP24~26·28·29 쇼츠보다 약 2dB 크고 순간 최고값이 +1.3dBFS라(2026-11-09 측정: -16.7 LUFS, 다른 편 -17.7~-19.7)
// 렌더에서 찢어질 수 있어 0.79배(-2dB)로 맞춘다.
const NARRATION_VOLUME = 0.79;
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
  audio.push({id: key, src, start: r3(t), dur: r3(d), volume: NARRATION_VOLUME, group: true, track: audio.length % 2 ? 1 : 6});
  T[key] = r3(t);
  T[`${key}End`] = r3(t + d);
  t += d;
};
const sfx = (key, file, at, volume) => audio.push({id: key, src: file, start: r3(at), dur: r3(probe(file)), volume, group: false, track: 3});

// 나레이션 조각 끝에 0.2초 여백이 이미 있어 줄 사이는 짧게 둔다. 45초 안에 넣기 위해서다(BRIEF.md).
const GAP = 0.08;
const AFTER_VOICE = -0.08;

// 1) 틀린 읽기 → 진짜 소리 → 단어 세 개
voice('v1', 1, 0.1);
voice('v2', 2, GAP);
native('wd', 'dogs', AFTER_VOICE);
voice('v3', 3, GAP);
native('wc', 'cats', AFTER_VOICE);
voice('v4', 4, GAP);
native('wb', 'buses', AFTER_VOICE);
// 2) 왜 갈리나: 세 단어를 한 줄씩
voice('v5', 5, GAP);
voice('v6', 6, GAP);
voice('v7', 7, GAP);
voice('v8', 8, GAP);
voice('v9', 9, GAP);
// 3) 마지막 안내
T.cta = r3(t + 0.1);
voice('v10', 10, 0.25);
t += 0.6;
const TOTAL = r3(t);
T.total = TOTAL;

const SFX = {pop: 'assets/sfx/pop.mp3', tick: 'assets/sfx/click-soft.mp3', whoosh: 'assets/sfx/whoosh.mp3'};
sfx('pop1', SFX.pop, T.v2 + 0.05, 0.3);
sfx('pop2', SFX.pop, T.v3 + 0.05, 0.22);
sfx('pop3', SFX.pop, T.v4 + 0.05, 0.22);
sfx('tick1', SFX.tick, T.v6 + 0.45, 0.25);
sfx('tick2', SFX.tick, T.v6 + 0.95, 0.25);
sfx('tick3', SFX.tick, T.v6 + 1.35, 0.25);
sfx('whoosh', SFX.whoosh, T.cta, 0.3);

const audioTags = audio
  .map((a) => `    <audio id="${a.id}" src="${a.src}" data-start="${a.start}" data-duration="${a.dur}" data-track-index="${a.track}" data-volume="${a.volume}"${a.group ? ' data-audio-group="voiceover"' : ''}></audio>`)
  .join('\n');

const cap = (id, lines, cls = '') => `<div id="${id}" class="cap ${cls} hidden">${lines.map((l) => `<span class="ln">${l}</span>`).join('')}</div>`;
// 끝소리 색: 스 빨강, 즈 파랑, 이즈 초록(CLAUDE.md 접미사 강조 원칙과 같은 색)
const eng = (id, stem, suf, kind, badge) => `<div id="${id}" class="ew hidden"><span class="word"><span class="stem">${stem}</span><span class="suf ${kind}">${suf}</span></span><span class="bd bg-${kind}">${badge}</span></div>`;
const row = (id, stem, pre, suf, kind, label) => `<div id="${id}" class="row"><span class="rw"><span class="stem">${stem}<span class="pre" id="${id}pre">${pre}</span></span><span class="suf ${kind}">${suf}</span></span><span id="${id}b" class="rb bg-${kind} hidden">${label}</span><div id="${id}ring" class="rring hidden"></div></div>`;

const html = `<!DOCTYPE html>
<html lang="ko" data-resolution="portrait">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1080, height=1920">
  <title>끝에 붙는 s</title>
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

    /* 1) 그림 + 단어 */
    .pics{position:absolute;left:30px;right:30px;top:24px;height:470px}
    .pic{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;display:block}
    .wzone{position:absolute;left:0;right:0;top:520px;height:330px}
    .wrong{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:150px;font-weight:900;white-space:nowrap}
    .xmark{position:absolute;left:50%;top:50%;width:420px;height:300px;margin:-150px 0 0 -210px}
    .xmark i{position:absolute;left:0;top:50%;width:100%;height:22px;margin-top:-11px;border-radius:11px;background:#DC2626;transform-origin:center center}
    .xmark i:nth-child(1){transform:rotate(30deg)}
    .xmark i:nth-child(2){transform:rotate(-30deg)}
    .ew{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:40px;white-space:nowrap}
    .word{font-family:'Archivo Black',sans-serif;font-size:150px;line-height:1;white-space:nowrap;font-variant-ligatures:none}
    .stem{color:#111111}
    .suf{display:inline-block}
    .suf.s{color:#DC2626}.suf.z{color:#2563EB}.suf.iz{color:#059669}
    .bd{display:flex;align-items:center;height:104px;padding:0 36px;border:5px solid #111111;border-radius:999px;box-shadow:5px 5px 0 #111111;color:#FFFFFF;font-size:60px;font-weight:900;white-space:nowrap}
    .bg-s{background:#DC2626}.bg-z{background:#2563EB}.bg-iz{background:#059669}

    /* 2) 세 단어 한 줄씩 */
    .row{position:absolute;left:24px;right:24px;height:262px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;border-bottom:4px dashed #D8D2C4}
    #r1{top:20px}#r2{top:300px}#r3{top:580px;border-bottom:0}
    .rw{font-family:'Archivo Black',sans-serif;font-size:140px;line-height:1;white-space:nowrap;font-variant-ligatures:none}
    .pre{background-image:linear-gradient(#F5C518,#F5C518);background-repeat:no-repeat;background-position:0 100%;background-size:0% 100%;border-radius:12px;padding:0 4px}
    .rb{display:flex;align-items:center;height:96px;padding:0 32px;border:5px solid #111111;border-radius:999px;box-shadow:5px 5px 0 #111111;color:#FFFFFF;font-size:50px;font-weight:900;white-space:nowrap}
    .rring{position:absolute;left:-6px;right:-6px;top:6px;bottom:6px;border:12px solid #F5C518;border-radius:26px}

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
    #cap10{top:926px;height:236px;font-size:52px;line-height:1.22}
    #arrow{position:absolute;left:310px;top:1176px;width:460px;height:460px;transform-origin:50% 90%}
    #arrow img{width:100%;height:100%;display:block}
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${TOTAL}" data-width="1080" data-height="1920">
    <div id="pill1" class="pill"><div class="pillBox">끝에 붙는 s</div></div>
    <div id="pill2" class="pill hidden"><div class="pillBox">같은 s, 세 가지 소리</div></div>
    <div id="pill3" class="pill hidden"><div class="pillBox">바로 앞 소리가 정한다</div></div>

    <div id="wcard" class="card">
      <div class="pics">
        <img id="pD" class="pic" src="assets/images/panels/dogs2.jpg" alt="강아지 두 마리">
        <img id="pC" class="pic hidden" src="assets/images/panels/cats2.jpg" alt="고양이 두 마리">
        <img id="pB" class="pic hidden" src="assets/images/panels/buses2.jpg" alt="버스 두 대">
      </div>
      <div class="wzone">
        <div id="wrong" class="wrong hidden"><span>도그스</span><span id="xmark" class="xmark"><i id="x1"></i><i id="x2"></i></span></div>
        ${eng('ewD', 'dog', 's', 'z', '즈')}
        ${eng('ewC', 'cat', 's', 's', '스')}
        ${eng('ewB', 'bus', 'es', 'iz', '이즈')}
      </div>
    </div>

    <div id="rows" class="card hidden">
      ${row('r1', 'ca', 't', 's', 's', '바람만')}
      ${row('r2', 'do', 'g', 's', 'z', '목 울림')}
      ${row('r3', 'bu', 's', 'es', 'iz', '한 박자 더')}
    </div>

    ${cap('cap1', ['강아지 두 마리, 끝에 붙은 에스를', '그냥 스로 읽으면 도그스가 됩니다.'], 'sm')}
    ${cap('cap2', ['그런데 실제로는', '도그즈에 가깝게 들립니다.'])}
    ${cap('cap3', ['고양이 두 마리는 캣츠,', '여기서는 스가 맞습니다.'])}
    ${cap('cap4', ['버스 두 대는 버시즈,', '아예 한 박자가 더 붙고요.'])}
    ${cap('cap5', ['같은 에스인데', '왜 이렇게 갈릴까요?'])}
    ${cap('cap6', ['바로 앞 소리를', '보면 됩니다.'])}
    ${cap('cap7', ['캣의 트처럼 바람만 나가는', '소리 뒤에는 스가 붙습니다.'])}
    ${cap('cap8', ['도그의 그처럼 목이 울리는', '소리 뒤에는 즈가 붙고요.'])}
    ${cap('cap9', ['버스처럼 원래 스 소리로', '끝나는 단어라면,', '이즈로 한 박자가 더 붙습니다.'], 'sm3')}

    <div id="cta" class="hidden">
      <div id="thumb"><img src="assets/images/longform_thumb.jpg" alt="영어 -S 끝소리 전체 영상 썸네일"></div>
      <div id="ctaPill"><div id="ctaPillBox">24단어 전체 영상</div></div>
      ${cap('cap10', ['끝소리 세 가지를 스물네 단어로', '반복해 듣는 전체 영상은', '화면 아래 링크에 있습니다.']).replace('cap  hidden', 'cap')}
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
    const swap = (from, to, at) => {
      hide(from, at, 0.2);
      show(to, at, 0.24);
    };

    // 1) 강아지: 틀린 읽기 → 진짜 소리
    tl.fromTo('#wcard', {scale: 0.94}, {scale: 1, duration: 0.26, ease: 'back.out(2)'}, 0);
    caption(1);
    show('#wrong', T.v1 + 0.5, 0.2);
    // 아래 반응 시각은 whisper 단어 시각(줄 시작 기준)에 맞췄다(2026-11-09).
    pulse('#pD', T.v1 + 0.75, 1.05); // "두 마리" 0.68초
    pulse('#wrong', T.v1 + 2.6, 1.06);
    // "도그스"를 다 말한 뒤(4.3~4.9초)에 지운다
    tl.fromTo('#x1', {scaleX: 0}, {scaleX: 1, duration: 0.18, ease: 'power2.out', immediateRender: false}, T.v1 + 4.9);
    tl.fromTo('#x2', {scaleX: 0}, {scaleX: 1, duration: 0.18, ease: 'power2.out', immediateRender: false}, T.v1 + 5.08);
    caption(2);
    hide('#wrong', T.v2 - 0.02, 0.14);
    show('#ewD', T.v2 + 0.12, 0.2);
    pulse('#pD', T.v2 + 1.4, 1.05);
    pulse('#ewD .suf', T.wd + 0.02, 1.3);

    // 2) 고양이, 버스
    caption(3);
    swap('#pD', '#pC', T.v3);
    hide('#ewD', T.v3 - 0.02, 0.14);
    show('#ewC', T.v3 + 0.12, 0.2);
    pulse('#pC', T.v3 + 0.5, 1.05); // "두 마리" 0.45초
    pulse('#ewC .word', T.v3 + 1.3, 1.06); // "캣츠" 1.2초
    pulse('#ewC .suf', T.v3 + 2.95, 1.25); // "스가 맞습니다" 2.9초
    pulse('#ewC .suf', T.wc + 0.02, 1.3);
    caption(4);
    swap('#pC', '#pB', T.v4);
    hide('#ewC', T.v4 - 0.02, 0.14);
    show('#ewB', T.v4 + 0.12, 0.2);
    pulse('#pB', T.v4 + 0.45, 1.05); // "두 대" 0.4초
    pulse('#ewB .word', T.v4 + 1.25, 1.06); // "버시즈" 1.1초
    pulse('#ewB .suf', T.wb + 0.02, 1.3);

    // 3) 같은 s인데 왜: 세 단어를 한 줄씩 보여 준다
    caption(5);
    hide('#wcard', T.v5 - 0.04, 0.18);
    show('#rows', T.v5 + 0.02, 0.2);
    tl.fromTo('#rows', {y: 36}, {y: 0, duration: 0.3, ease: 'back.out(1.8)'}, T.v5 + 0.02);
    swap('#pill1', '#pill2', T.v5);

    // 4) 바로 앞 글자에 노란 표시가 차례로 붙는다
    caption(6);
    swap('#pill2', '#pill3', T.v6);
    ['r1pre', 'r2pre', 'r3pre'].forEach((id, i) => {
      tl.fromTo('#' + id, {backgroundSize: '0% 100%'}, {backgroundSize: '100% 100%', duration: 0.3, ease: 'power2.out', immediateRender: false}, T.v6 + 0.45 + i * 0.45);
    });

    // 5) 줄마다 뱃지: 바람만 / 목 울림 / 한 박자 더
    const BADGES = [['r1', 'v7'], ['r2', 'v8'], ['r3', 'v9']];
    BADGES.forEach(([id, key], i) => {
      caption(key.slice(1));
      if (i > 0) hide('#' + BADGES[i - 1][0] + 'ring', T[key] - 0.02, 0.12);
      show('#' + id + 'ring', T[key], 0.14);
      popIn('#' + id + 'b', T[key] + 0.12);
      pulse('#' + id + ' .rw', T[key] + 1.7, 1.05);
      pulse('#' + id + 'b', T[key] + 2.8, 1.1);
    });

    // 6) 마지막 5초: 롱폼 안내 (EP24~26 쇼츠와 같다)
    hide('#rows,#pill3', T.cta, 0.2);
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

// 유튜브 업로드용 한국어 자막. 원어민 단어(dogs·cats·buses)는 나레이션이 이미 설명한 뒤에 나오므로 그대로 적는다.
const NARRATION = {
  v1: '강아지 두 마리, 끝에 붙은 에스를 그냥 스로 읽으면 도그스가 됩니다.',
  v2: '그런데 실제로는 도그즈에 가깝게 들립니다.',
  v3: '고양이 두 마리는 캣츠, 여기서는 스가 맞습니다.',
  v4: '버스 두 대는 버시즈, 아예 한 박자가 더 붙고요.',
  v5: '같은 에스인데 왜 이렇게 갈릴까요?',
  v6: '바로 앞 소리를 보면 됩니다.',
  v7: '캣의 트처럼 바람만 나가는 소리 뒤에는 스가 붙습니다.',
  v8: '도그의 그처럼 목이 울리는 소리 뒤에는 즈가 붙고요.',
  v9: '버스처럼 원래 스 소리로 끝나는 단어라면, 이즈로 한 박자가 더 붙습니다.',
  v10: '끝소리 세 가지를 스물네 단어로 반복해 듣는 전체 영상은 화면 아래 링크에 있습니다.',
};
const SPOKEN = {wd: 'dogs', wc: 'cats', wb: 'buses'};
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
