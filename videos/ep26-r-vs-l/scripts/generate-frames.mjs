import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep26-r-vs-l');
const ttsPath = path.join(projectDir, '.tts-results.json');
const tts = JSON.parse(fs.readFileSync(ttsPath, 'utf8'));

function getDur(key) {
  if (!tts[key]) {
    throw new Error(`Missing audio duration for key: ${key}`);
  }
  return tts[key].duration_s;
}

function loadWords(key) {
  const p = path.join(projectDir, `assets/voice/${key}.words.json`);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return [];
}

// Helper to build whisper caption calls
function buildWhisperCalls(wordsKey) {
  const words = loadWords(wordsKey);
  if (!words || words.length === 0) return '';
  
  const chunks = [];
  let curChunk = [];
  let curStart = 0;
  
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.from === null || w.from === undefined || isNaN(w.from)) continue;
    if (curChunk.length === 0) curStart = w.from;
    curChunk.push(w.word);
    
    if (w.word.endsWith('.') || w.word.endsWith('?') || w.word.endsWith('!') || curChunk.length >= 8) {
      chunks.push({ start: curStart, text: curChunk.join(' ') });
      curChunk = [];
    }
  }
  if (curChunk.length > 0) {
    chunks.push({ start: curStart, text: curChunk.join(' ') });
  }

  let code = '';
  for (const c of chunks) {
    const escaped = c.text.replace(/"/g, '\\"');
    code += `  tl.call(function() { cap("${escaped}"); }, null, ${c.start.toFixed(2)});\n`;
  }
  return code;
}

// 20 Minimal Pairs Dictionary: English word syllable division (e.g. ri · ver) & natural Korean pronunciation
const DICTIONARY = {
  // Group 1: 핵심 빈출 5쌍 (1음절 단어)
  p01: {
    w1: { id: "w01", word: "right", ipa: "[raɪt]", syl: "롸이트", kr: "오른쪽 / 알맞은", tip: "혀 양옆 어금니 밀착! 혀끝 허공 0%", m: "m_w01_right", f: "f_w01_right" },
    w2: { id: "w02", word: "light", ipa: "[laɪt]", syl: "라이트", kr: "빛 / 전등 / 가벼운", tip: "윗니 바로 뒤 잇몸을 강하게 '탁!'", m: "m_w02_light", f: "f_w02_light" }
  },
  p02: {
    w1: { id: "w03", word: "red", ipa: "[rɛd]", syl: "뤠드", kr: "빨간색", tip: "입술 약간 모으며 혀끝 허공 유지", m: "m_w03_red", f: "f_w03_red" },
    w2: { id: "w04", word: "led", ipa: "[lɛd]", syl: "레드", kr: "이끌었다 (lead 과거)", tip: "잇몸을 확실하게 튕겨내며 '레드'", m: "m_w04_led", f: "f_w04_led" }
  },
  p03: {
    w1: { id: "w05", word: "rain", ipa: "[reɪn]", syl: "뤠인", kr: "비 / 비가 오다", tip: "혀끝 입천장 접촉 절대 금지!", m: "m_w05_rain", f: "f_w05_rain" },
    w2: { id: "w06", word: "lane", ipa: "[leɪn]", syl: "레인", kr: "차선 / 골목길", tip: "혀끝을 잇몸에 꾹 눌렀다 떼기", m: "m_w06_lane", f: "f_w06_lane" }
  },
  p04: {
    w1: { id: "w07", word: "row", ipa: "[roʊ]", syl: "로우", kr: "줄 / 노를 젓다", tip: "허공에서 울리는 깊은 소리", m: "m_w07_row", f: "f_w07_row" },
    w2: { id: "w08", word: "low", ipa: "[loʊ]", syl: "로우", kr: "낮은", tip: "잇몸 튕기며 시원하게 '로우'", m: "m_w08_low", f: "f_w08_low" }
  },
  p05: {
    w1: { id: "w09", word: "raw", ipa: "[rɔː]", syl: "롸", kr: "날것의 / 가공 안 된", tip: "혀끝 띄우고 턱 열며 '롸'", m: "m_w09_raw", f: "f_w09_raw" },
    w2: { id: "w10", word: "law", ipa: "[lɔː]", syl: "라", kr: "법 / 법칙", tip: "잇몸 찍고 입 열며 '라'", m: "m_w10_law", f: "f_w10_law" }
  },

  // Group 2: 필수 동사 5쌍 (1음절 단어)
  p06: {
    w1: { id: "w11", word: "run", ipa: "[rʌn]", syl: "뤈", kr: "달리다", tip: "혀끝 허공 띄우고 깊게 '뤈'", m: "m_w11_run", f: "f_w11_run" },
    w2: { id: "w12", word: "learn", ipa: "[lɜːrn]", syl: "런", kr: "배우다", tip: "잇몸 접촉 후 혀 굴려 마무리", m: "m_w12_learn", f: "f_w12_learn" }
  },
  p07: {
    w1: { id: "w13", word: "read", ipa: "[riːd]", syl: "뤼드", kr: "읽다", tip: "입천장 닿지 않고 길게 '뤼드'", m: "m_w13_read", f: "f_w13_read" },
    w2: { id: "w14", word: "lead", ipa: "[liːd]", syl: "리드", kr: "이끌다 / 안내하다", tip: "윗니 뒤 잇몸을 확실하게 탁!", m: "m_w14_lead", f: "f_w14_lead" }
  },
  p08: {
    w1: { id: "w15", word: "ride", ipa: "[raɪd]", syl: "롸이드", kr: "타다 / 타기", tip: "허공에 뜬 혀끝으로 '롸이드'", m: "m_w15_ride", f: "f_w15_ride" },
    w2: { id: "w16", word: "lied", ipa: "[laɪd]", syl: "라이드", kr: "거짓말했다 (lie 과거)", tip: "잇몸 치며 시원하게 '라이드'", m: "m_w16_lied", f: "f_w16_lied" }
  },
  p09: {
    w1: { id: "w17", word: "race", ipa: "[reɪs]", syl: "뤠이스", kr: "경주 / 달리기", tip: "허공 유지하며 팽팽하게 '뤠이스'", m: "m_w17_race", f: "f_w17_race" },
    w2: { id: "w18", word: "lace", ipa: "[leɪs]", syl: "레이스", kr: "끈 / 레이스", tip: "잇몸 딱 찍고 출발하는 '레이스'", m: "m_w18_lace", f: "f_w18_lace" }
  },
  p10: {
    w1: { id: "w19", word: "ring", ipa: "[rɪŋ]", syl: "륑", kr: "반지 / 울리다", tip: "혀끝 닿지 않고 울리는 '륑'", m: "m_w19_ring", f: "f_w19_ring" },
    w2: { id: "w20", word: "ling", ipa: "[lɪŋ]", syl: "링", kr: "물고기 링 / 링", tip: "잇몸 튕기며 또렷하게 '링'", m: "m_w20_ling", f: "f_w20_ling" }
  },

  // Group 3: 일상 명사 5쌍 (river/liver는 2음절 영어 음절 분리!)
  p11: {
    w1: { id: "w21", word: "ri · ver", ipa: "[ˈrɪvər]", syl: "리버", kr: "강", tip: "2음절: 입천장 닿지 않는 허공 시작!", m: "m_w21_river", f: "f_w21_river" },
    w2: { id: "w22", word: "li · ver", ipa: "[ˈlɪvər]", syl: "리버", kr: "간 (신체 장기)", tip: "2음절: 윗니 뒤 잇몸 확실한 접촉!", m: "m_w22_liver", f: "f_w22_liver" }
  },
  p12: {
    w1: { id: "w23", word: "rock", ipa: "[rɑːk]", syl: "롹", kr: "바위 / 록음악", tip: "혀 굴리지 말고 허공 숟가락!", m: "m_w23_rock", f: "f_w23_rock" },
    w2: { id: "w24", word: "lock", ipa: "[lɑːk]", syl: "락", kr: "자물쇠 / 잠그다", tip: "잇몸 딱 때리는 선명한 락!", m: "m_w24_lock", f: "f_w24_lock" }
  },
  p13: {
    w1: { id: "w25", word: "road", ipa: "[roʊd]", syl: "로드", kr: "도로 / 길", tip: "입술 모으고 혀끝 허공!", m: "m_w25_road", f: "f_w25_road" },
    w2: { id: "w26", word: "load", ipa: "[loʊd]", syl: "로드", kr: "짐 / 싣다", tip: "윗니 뒤 잇몸 치고 출발!", m: "m_w26_load", f: "f_w26_load" }
  },
  p14: {
    w1: { id: "w27", word: "room", ipa: "[ruːm]", syl: "룸", kr: "방 / 공간", tip: "입술 둥글게 모으고 혀끝 허공!", m: "m_w27_room", f: "f_w27_room" },
    w2: { id: "w28", word: "loom", ipa: "[luːm]", syl: "룸", kr: "베틀 / 나타나다", tip: "잇몸을 강하게 누르고 떼기!", m: "m_w28_loom", f: "f_w28_loom" }
  },
  p15: {
    w1: { id: "w29", word: "root", ipa: "[ruːt]", syl: "루트", kr: "뿌리 / 근원", tip: "허공에서 뿜는 깊은 울림!", m: "m_w29_root", f: "f_w29_root" },
    w2: { id: "w30", word: "loot", ipa: "[luːt]", syl: "루트", kr: "전리품 / 약탈품", tip: "잇몸 찍고 터뜨리기!", m: "m_w30_loot", f: "f_w30_loot" }
  },

  // Group 4: 자음군(Blends) 5쌍 (1음절 단어)
  p16: {
    w1: { id: "w31", word: "pray", ipa: "[preɪ]", syl: "프레이", kr: "기도하다", tip: "P 다음 혀끝이 허공에 뜸!", m: "m_w31_pray", f: "f_w31_pray" },
    w2: { id: "w32", word: "play", ipa: "[pleɪ]", syl: "플레이", kr: "놀다 / 연주하다", tip: "P 다음 혀끝이 잇몸에 바로 닿음!", m: "m_w32_play", f: "f_w32_play" }
  },
  p17: {
    w1: { id: "w33", word: "crown", ipa: "[kraʊn]", syl: "크라운", kr: "왕관", tip: "K 터지고 혀끝 허공 유지!", m: "m_w33_crown", f: "f_w33_crown" },
    w2: { id: "w34", word: "clown", ipa: "[klaʊn]", syl: "클라운", kr: "광대", tip: "K 터지자마자 잇몸 접촉!", m: "m_w34_clown", f: "f_w34_clown" }
  },
  p18: {
    w1: { id: "w35", word: "grow", ipa: "[ɡroʊ]", syl: "그로우", kr: "자라다 / 기르다", tip: "G 소리 후 혀끝 허공 울림!", m: "m_w35_grow", f: "f_w35_grow" },
    w2: { id: "w36", word: "glow", ipa: "[ɡloʊ]", syl: "글로우", kr: "빛나다 / 열기", tip: "G 소리 후 잇몸 밀착!", m: "m_w36_glow", f: "f_w36_glow" }
  },
  p19: {
    w1: { id: "w37", word: "fry", ipa: "[fraɪ]", syl: "프라이", kr: "튀기다 / 프라이", tip: "F 입술 마찰 후 혀끝 허공!", m: "m_w37_fry", f: "f_w37_fry" },
    w2: { id: "w38", word: "fly", ipa: "[flaɪ]", syl: "플라이", kr: "날다 / 파리", tip: "F 마찰 후 혀끝 잇몸 밀착!", m: "m_w38_fly", f: "f_w38_fly" }
  },
  p20: {
    w1: { id: "w39", word: "grass", ipa: "[ɡræs]", syl: "그래스", kr: "잔디 / 풀", tip: "G 뒤에 혀끝 닿지 않는 허공!", m: "m_w39_grass", f: "f_w39_grass" },
    w2: { id: "w40", word: "glass", ipa: "[ɡlæs]", syl: "글래스", kr: "유리 / 잔", tip: "G 뒤에 혀끝 잇몸 완벽 접촉!", m: "m_w40_glass", f: "f_w40_glass" }
  }
};

// 7 Minimal Pair Dialogue Sentences with word highlights & syllable breakdown tips
const DIALOGUES = [
  {
    id: "01",
    en: "Turn right at the traffic light.",
    enHtml: 'Turn <span class="hl-r">right</span> at the traffic <span class="hl-l">light</span>.',
    kr: "신호등에서 오른쪽으로 도세요.",
    pairBadge: "right vs light",
    sylTip: "💡 right (허공 0%) vs light (잇몸 접촉 100%)",
    audio: "dial_01_right_light"
  },
  {
    id: "02",
    en: "He prays every night before he plays.",
    enHtml: 'He <span class="hl-r">prays</span> every night before he <span class="hl-l">plays</span>.',
    kr: "그는 놀기 전에 매일 밤 기도한다.",
    pairBadge: "prays vs plays",
    sylTip: "💡 pray (허공 울림) vs play (잇몸 밀착)",
    audio: "dial_02_pray_play"
  },
  {
    id: "03",
    en: "We ran across the road with a heavy load.",
    enHtml: 'We ran across the <span class="hl-r">road</span> with a heavy <span class="hl-l">load</span>.',
    kr: "우리는 무거운 짐을 지고 도로를 건넜다.",
    pairBadge: "road vs load",
    sylTip: "💡 road (허공) vs load (잇몸 접촉)",
    audio: "dial_03_road_load"
  },
  {
    id: "04",
    en: "Did you read about who will lead the team?",
    enHtml: 'Did you <span class="hl-r">read</span> about who will <span class="hl-l">lead</span> the team?',
    kr: "누가 팀을 이끌지 읽어보셨나요?",
    pairBadge: "read vs lead",
    sylTip: "💡 read (허공 0%) vs lead (잇몸 탁!)",
    audio: "dial_04_read_lead"
  },
  {
    id: "05",
    en: "Please lock the door behind that big rock.",
    enHtml: 'Please <span class="hl-l">lock</span> the door behind that big <span class="hl-r">rock</span>.',
    kr: "저 큰 바위 뒤에 있는 문을 잠가주세요.",
    pairBadge: "lock vs rock",
    sylTip: "💡 rock (허공 숟가락) vs lock (잇몸 때리기)",
    audio: "dial_05_lock_rock"
  },
  {
    id: "06",
    en: "The clown wore a shiny gold crown.",
    enHtml: 'The <span class="hl-l">clown</span> wore a shiny gold <span class="hl-r">crown</span>.',
    kr: "광대는 반짝이는 금관을 쓰고 있었다.",
    pairBadge: "clown vs crown",
    sylTip: "💡 crown (허공 유지) vs clown (잇몸 접촉)",
    audio: "dial_06_clown_crown"
  },
  {
    id: "07",
    en: "Look at the green grass through the clean glass.",
    enHtml: 'Look at the green <span class="hl-r">grass</span> through the clean <span class="hl-l">glass</span>.',
    kr: "깨끗한 유리창 너머로 초록 잔디를 보세요.",
    pairBadge: "grass vs glass",
    sylTip: "💡 grass (허공) vs glass (잇몸 완벽 접촉)",
    audio: "dial_07_grass_glass"
  }
];

const outFramesDir = path.join(projectDir, 'compositions', 'frames');
fs.mkdirSync(outFramesDir, { recursive: true });

// 1. Frame 01: Hook
function generateF01() {
  const dur = getDur("01_f01_hook");
  const totalDur = dur + 1.0;
  const whisperCode = buildWhisperCalls("01_f01_hook");

  return {
    duration: totalDur,
    html: `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 2.6cqw; font-size: 1.35cqw; font-weight: 900;
    color: #111111; display: flex; align-items: center; gap: 0.8cqw; z-index: 10;
  }
  .tip-badge {
    background: #EF4444; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1cqw; font-weight: 900;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; display: flex; gap: 3cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .compare-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 4.5cqh 3cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqh;
  }
  .card-label {
    font-size: 1.2cqw; font-weight: 900; padding: 0.5cqh 1.6cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .label-r { background: #DBEAFE; color: #1E40AF; }
  .label-l { background: #D1FAE5; color: #065F46; }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 7.2cqw; line-height: 1.0;
    color: #111111; letter-spacing: -0.02em;
  }
  .syl-pill {
    font-family: 'Noto Sans KR', sans-serif; font-size: 1.8cqw; font-weight: 900;
    padding: 0.5cqh 1.4cqw; border-radius: 12px; border: 2px solid #111111;
    box-shadow: 2px 2px 0px #111111;
  }
  .syl-pill.pill-r { background: #BFDBFE; color: #1E3A8A; }
  .syl-pill.pill-l { background: #A7F3D0; color: #064E3B; }
  .meaning-text {
    font-size: 2.2cqw; font-weight: 800; color: #4B5563;
  }
  .status-badge {
    font-size: 1.3cqw; font-weight: 900; padding: 0.8cqh 1.8cqw; border-radius: 12px;
    border: 2px solid #111111;
  }
  .badge-key { background: #DBEAFE; color: #1E40AF; }
  .badge-error { background: #FEE2E2; color: #991B1B; }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="01-hook" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span class="tip-badge">오답 경고</span>
    <span>한국인이 둘 다 '라이트'로 읽는 치명적인 이유</span>
  </div>

  <div class="stage">
    <!-- Left Card: RIGHT -->
    <div class="compare-card" id="cardLeft">
      <div class="card-label label-r">[r] 허공 숟가락 · 접촉 0%</div>
      <div class="word-text" style="color:#2563EB;">RIGHT</div>
      <div class="syl-pill pill-r">[raɪt] · [롸이트]</div>
      <div class="meaning-text">오른쪽 / 알맞은 👉</div>
      <div class="status-badge badge-key" id="leftBadge">입천장 접촉 0%! 허공 울림</div>
    </div>

    <!-- Right Card: LIGHT -->
    <div class="compare-card" id="cardRight">
      <div class="card-label label-l">[l] 윗니 뒤 잇몸 · 접촉 100%</div>
      <div class="word-text" style="color:#059669;">LIGHT</div>
      <div class="syl-pill pill-l">[laɪt] · [라이트]</div>
      <div class="meaning-text">빛 / 전등 / 가벼운 💡</div>
      <div class="status-badge badge-error" id="rightBadge">둘 다 '라이트'? ❌ 소리가 다릅니다</div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="v_host" src="assets/voice/01_f01_hook.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${dur.toFixed(2)}"></audio>
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(t) {
      if (!t) {
        gsap.to(pill, { opacity: 0, duration: 0.15, overwrite: "auto" });
      } else {
        pill.innerText = t;
        gsap.to(pill, { opacity: 1, duration: 0.15, overwrite: "auto" });
      }
    }

    tl.from("#cardLeft", { y: 40, opacity: 0, duration: 0.6, ease: "back.out(1.5)" }, 0.2);
    tl.from("#cardRight", { y: 40, opacity: 0, duration: 0.6, ease: "back.out(1.5)" }, 0.4);

    tl.to("#rightBadge", { scale: 1.1, repeat: 1, yoyo: true, duration: 0.3 }, 2.5);
    tl.call(function() {
      document.getElementById("rightBadge").className = "status-badge badge-key";
      document.getElementById("rightBadge").style.background = "#D1FAE5";
      document.getElementById("rightBadge").style.color = "#065F46";
      document.getElementById("rightBadge").innerText = "윗니 뒤 잇몸을 강하게 '탁!'";
    }, null, 14.5);

${whisperCode}
    tl.call(function() { cap(""); }, null, ${dur.toFixed(2)});

    window.__timelines = window.__timelines || {};
    window.__timelines["01-hook"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// 2. Frame 02: Principle
function generateF02() {
  const dur = getDur("02_f02_principle");
  const totalDur = dur + 1.0;
  const whisperCode = buildWhisperCalls("02_f02_principle");

  return {
    duration: totalDur,
    html: `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 2.6cqw; font-size: 1.35cqw; font-weight: 900;
    color: #111111; display: flex; align-items: center; gap: 0.8cqw; z-index: 10;
  }
  .tip-badge {
    background: #2563EB; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1cqw; font-weight: 900;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 88cqw; display: flex; gap: 3.5cqw; align-items: center; justify-content: center; z-index: 5;
  }
  .visual-box {
    flex: 1.15; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 2cqh; display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .visual-img {
    width: 100%; height: auto; max-height: 52cqh; object-fit: contain; border-radius: 18px;
    border: 2px solid #111111;
  }
  .desc-box {
    flex: 1; display: flex; flex-direction: column; gap: 2cqh;
  }
  .rule-card {
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 20px; padding: 2.4cqh 2.2cqw; display: flex; flex-direction: column; gap: 0.8cqh;
  }
  .rule-card.active-r { border-color: #2563EB; background: #EFF6FF; }
  .rule-card.active-l { border-color: #059669; background: #F0FDF4; }
  .rule-header {
    display: flex; justify-content: space-between; align-items: center;
  }
  .rule-title {
    font-size: 1.7cqw; font-weight: 900; color: #111111;
  }
  .rule-badge {
    font-size: 1.05cqw; font-weight: 900; padding: 0.4cqh 1.2cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .rule-desc {
    font-size: 1.2cqw; font-weight: 700; color: #4B5563; line-height: 1.45;
  }
  .syl-example {
    margin-top: 0.5cqh; font-size: 1.15cqw; font-weight: 900; color: #111111;
    background: #FFFFFF; padding: 0.4cqh 1cqw; border-radius: 8px; border: 1.5px solid #111111;
    display: inline-block;
  }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="02-principle" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span class="tip-badge">핵심 원리</span>
    <span>혀를 굴리지 마세요! '혀끝의 접촉 여부'가 결정합니다</span>
  </div>

  <div class="stage">
    <div class="visual-box" id="visualBox">
      <img src="assets/images/f02_vocal_tract_rl.jpg" alt="구강 조음 단면도 비교" class="visual-img">
    </div>

    <div class="desc-box">
      <!-- Rule 1: [r] sound -->
      <div class="rule-card" id="cardR">
        <div class="rule-header">
          <span class="rule-title" style="color:#2563EB;">① [r] 혀끝 허공 숟가락</span>
          <span class="rule-badge" style="background:#DBEAFE; color:#1E40AF;">접촉 0% · 허공 울림</span>
        </div>
        <div class="rule-desc">
          혀 양옆을 윗어금니에 대고, 혀끝은 허공에 띄워 입천장에 절대 닿지 않게 소리냅니다.
        </div>
        <div>
          <span class="syl-example">💡 right [롸이트] · red [뤠드] · rain [뤠인]</span>
        </div>
      </div>

      <!-- Rule 2: [l] sound -->
      <div class="rule-card" id="cardL">
        <div class="rule-header">
          <span class="rule-title" style="color:#059669;">② [l] 윗니 뒤 잇몸 접촉</span>
          <span class="rule-badge" style="background:#D1FAE5; color:#065F46;">접촉 100% · '탁' 튕김</span>
        </div>
        <div class="rule-desc">
          혀끝으로 윗니 바로 뒤 딱딱한 잇몸을 강하게 누른 뒤 '탁' 튕기며 소리냅니다.
        </div>
        <div>
          <span class="syl-example">💡 light [라이트] · led [레드] · lane [레인]</span>
        </div>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="v_host" src="assets/voice/02_f02_principle.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${dur.toFixed(2)}"></audio>
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(t) {
      if (!t) {
        gsap.to(pill, { opacity: 0, duration: 0.15, overwrite: "auto" });
      } else {
        pill.innerText = t;
        gsap.to(pill, { opacity: 1, duration: 0.15, overwrite: "auto" });
      }
    }

    tl.from("#visualBox", { x: -40, opacity: 0, duration: 0.6, ease: "power2.out" }, 0.2);
    tl.from("#cardR", { x: 40, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.4);
    tl.from("#cardL", { x: 40, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.6);

    tl.call(function() {
      document.getElementById("cardR").className = "rule-card active-r";
      document.getElementById("cardL").className = "rule-card";
    }, null, 6.0);

    tl.call(function() {
      document.getElementById("cardR").className = "rule-card";
      document.getElementById("cardL").className = "rule-card active-l";
    }, null, 21.0);

${whisperCode}
    tl.call(function() { cap(""); }, null, ${dur.toFixed(2)});

    window.__timelines = window.__timelines || {};
    window.__timelines["02-principle"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// 3~6. Generator for Group Frames (F03, F04, F05, F06) with Syllable Badges
function generateGroupFrame(frameId, groupNum, groupTitle, pairKeys, eyebrowTip) {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  pairKeys.forEach((pKey, pIdx) => {
    const pair = DICTIONARY[pKey];
    
    // Word 1: [r]
    const w1 = pair.w1;
    const w1_m_dur = getDur(w1.m);
    const w1_f_dur = getDur(w1.f);

    animEvents.push({
      time: curTime,
      type: "focus_word",
      pIdx: pIdx,
      wordTarget: "w1",
      pairKey: pKey,
      activeSide: "left",
      rep: 0
    });

    // 6-rep listening: Male -> Female -> Male -> Female -> Male -> Female
    audioTags.push(`<audio id="a_${w1.id}_0" src="assets/voice/${w1.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 1 });
    curTime += w1_m_dur + 0.55;

    audioTags.push(`<audio id="a_${w1.id}_1" src="assets/voice/${w1.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 2 });
    curTime += w1_f_dur + 0.55;

    audioTags.push(`<audio id="a_${w1.id}_2" src="assets/voice/${w1.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 3 });
    curTime += w1_m_dur + 0.55;

    audioTags.push(`<audio id="a_${w1.id}_3" src="assets/voice/${w1.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 4 });
    curTime += w1_f_dur + 0.55;

    audioTags.push(`<audio id="a_${w1.id}_4" src="assets/voice/${w1.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 5 });
    curTime += w1_m_dur + 0.55;

    audioTags.push(`<audio id="a_${w1.id}_5" src="assets/voice/${w1.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 6 });
    curTime += w1_f_dur + 0.85;

    // Word 2: [l]
    const w2 = pair.w2;
    const w2_m_dur = getDur(w2.m);
    const w2_f_dur = getDur(w2.f);

    animEvents.push({
      time: curTime,
      type: "focus_word",
      pIdx: pIdx,
      wordTarget: "w2",
      pairKey: pKey,
      activeSide: "right",
      rep: 0
    });

    audioTags.push(`<audio id="a_${w2.id}_0" src="assets/voice/${w2.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "right", dotIdx: 1 });
    curTime += w2_m_dur + 0.55;

    audioTags.push(`<audio id="a_${w2.id}_1" src="assets/voice/${w2.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "right", dotIdx: 2 });
    curTime += w2_f_dur + 0.55;

    audioTags.push(`<audio id="a_${w2.id}_2" src="assets/voice/${w2.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "right", dotIdx: 3 });
    curTime += w2_m_dur + 0.55;

    audioTags.push(`<audio id="a_${w2.id}_3" src="assets/voice/${w2.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "right", dotIdx: 4 });
    curTime += w2_f_dur + 0.55;

    audioTags.push(`<audio id="a_${w2.id}_4" src="assets/voice/${w2.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "right", dotIdx: 5 });
    curTime += w2_m_dur + 0.55;

    audioTags.push(`<audio id="a_${w2.id}_5" src="assets/voice/${w2.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "right", dotIdx: 6 });
    curTime += w2_f_dur + 1.1;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "focus_word") {
      const p = DICTIONARY[e.pairKey];
      animScriptCode += `  tl.call(function() {
    setPair(${JSON.stringify(p)}, "${e.activeSide}");
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "dot") {
      animScriptCode += `  tl.call(function() {
    setDot("${e.target}", ${e.dotIdx});
  }, null, ${e.time.toFixed(2)});\n`;
    }
  });

  return {
    duration: totalDur,
    html: `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 2.6cqw; font-size: 1.35cqw; font-weight: 900;
    color: #111111; display: flex; align-items: center; gap: 0.8cqw; z-index: 10;
  }
  .tip-badge {
    background: #F59E0B; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1cqw; font-weight: 900;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; display: flex; gap: 3.5cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .drill-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 4.5cqh 3cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.8cqh;
    position: relative;
  }
  .drill-card.active {
    box-shadow: 10px 10px 0px #111111;
  }
  .drill-card.active-left { border-color: #2563EB; }
  .drill-card.active-right { border-color: #059669; }
  .card-label {
    font-size: 1.25cqw; font-weight: 900; padding: 0.6cqh 1.8cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .label-r { background: #DBEAFE; color: #1E40AF; }
  .label-l { background: #D1FAE5; color: #065F46; }
  .word-en {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.0;
    color: #111111; letter-spacing: -0.02em; margin-top: 0.5cqh;
  }
  .ipa-box {
    display: flex; align-items: center; gap: 0.8cqw; margin-top: 0.3cqh;
  }
  .ipa-text {
    font-size: 2cqw; font-weight: 900; color: #4B5563;
  }
  .syl-pill {
    font-family: 'Noto Sans KR', sans-serif; font-size: 1.7cqw; font-weight: 900;
    padding: 0.4cqh 1.3cqw; border-radius: 12px; border: 2px solid #111111;
    box-shadow: 2px 2px 0px #111111;
  }
  .syl-pill.pill-r { background: #BFDBFE; color: #1E3A8A; }
  .syl-pill.pill-l { background: #A7F3D0; color: #064E3B; }
  .kr-pill {
    background: #F3F4F6; border: 2px solid #111111; border-radius: 12px;
    padding: 0.4cqh 1.3cqw; font-size: 1.4cqw; font-weight: 800; color: #111111;
  }
  .tip-box {
    font-size: 1.25cqw; font-weight: 800; color: #374151; min-height: 3.5cqh;
    display: flex; align-items: center; justify-content: center;
  }
  .dots-box {
    display: flex; gap: 0.6cqw; margin-top: 0.8cqh;
  }
  .dot {
    width: 1.1cqw; height: 1.1cqw; border-radius: 50%;
    background: #E5E7EB; border: 2px solid #111111;
  }
  .dot.active-r { background: #2563EB; }
  .dot.active-l { background: #059669; }
  audio { display: none; }
</style>

<div id="root" data-composition-id="${frameId}" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span class="tip-badge">${groupTitle}</span>
    <span>${eyebrowTip}</span>
  </div>

  <div class="stage">
    <!-- Left Card: [r] -->
    <div id="card_l" class="drill-card">
      <div class="card-label label-r">[r] 허공 숟가락 (접촉 0%)</div>
      <div id="word_l" class="word-en" style="color:#2563EB;">---</div>
      <div class="ipa-box">
        <span id="ipa_l" class="ipa-text">[---]</span>
        <span id="syl_l" class="syl-pill pill-r">[---]</span>
      </div>
      <div id="kr_l" class="kr-pill">---</div>
      <div id="tip_l" class="tip-box">---</div>
      <div class="dots-box">
        <div id="dot_l_1" class="dot"></div>
        <div id="dot_l_2" class="dot"></div>
        <div id="dot_l_3" class="dot"></div>
        <div id="dot_l_4" class="dot"></div>
        <div id="dot_l_5" class="dot"></div>
        <div id="dot_l_6" class="dot"></div>
      </div>
    </div>

    <!-- Right Card: [l] -->
    <div id="card_r" class="drill-card">
      <div class="card-label label-l">[l] 윗니 뒤 잇몸 (접촉 100%)</div>
      <div id="word_r" class="word-en" style="color:#059669;">---</div>
      <div class="ipa-box">
        <span id="ipa_r" class="ipa-text">[---]</span>
        <span id="syl_r" class="syl-pill pill-l">[---]</span>
      </div>
      <div id="kr_r" class="kr-pill">---</div>
      <div id="tip_r" class="tip-box">---</div>
      <div class="dots-box">
        <div id="dot_r_1" class="dot"></div>
        <div id="dot_r_2" class="dot"></div>
        <div id="dot_r_3" class="dot"></div>
        <div id="dot_r_4" class="dot"></div>
        <div id="dot_r_5" class="dot"></div>
        <div id="dot_r_6" class="dot"></div>
      </div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var cardL = document.getElementById("card_l");
    var cardR = document.getElementById("card_r");
    var wordL = document.getElementById("word_l");
    var wordR = document.getElementById("word_r");
    var ipaL = document.getElementById("ipa_l");
    var ipaR = document.getElementById("ipa_r");
    var sylL = document.getElementById("syl_l");
    var sylR = document.getElementById("syl_r");
    var krL = document.getElementById("kr_l");
    var krR = document.getElementById("kr_r");
    var tipL = document.getElementById("tip_l");
    var tipR = document.getElementById("tip_r");

    function setPair(p, activeSide) {
      wordL.textContent = p.w1.word;
      ipaL.textContent = p.w1.ipa;
      sylL.textContent = "[" + p.w1.syl + "]";
      krL.textContent = p.w1.kr;
      tipL.textContent = "💡 " + p.w1.tip;

      wordR.textContent = p.w2.word;
      ipaR.textContent = p.w2.ipa;
      sylR.textContent = "[" + p.w2.syl + "]";
      krR.textContent = p.w2.kr;
      tipR.textContent = "💡 " + p.w2.tip;

      if (activeSide === "left") {
        cardL.className = "drill-card active active-left";
        cardR.className = "drill-card";
        gsap.fromTo(wordL, { scale: 1.15 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
      } else {
        cardL.className = "drill-card";
        cardR.className = "drill-card active-right";
        gsap.fromTo(wordR, { scale: 1.15 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
      }

      for (var i = 1; i <= 6; i++) {
        document.getElementById("dot_l_" + i).className = "dot";
        document.getElementById("dot_r_" + i).className = "dot";
      }
    }

    function setDot(side, dotIdx) {
      var prefix = side === "left" ? "dot_l_" : "dot_r_";
      var activeClass = side === "left" ? "dot active-r" : "dot active-l";
      for (var i = 1; i <= 6; i++) {
        var el = document.getElementById(prefix + i);
        if (i <= dotIdx) {
          el.className = activeClass;
        } else {
          el.className = "dot";
        }
      }
    }

${animScriptCode}
    window.__timelines = window.__timelines || {};
    window.__timelines["${frameId}"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// 7. Frame 07: Dialogue with WORD HIGHLIGHTS & SYLLABLE TIP BOX
function generateF07() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  DIALOGUES.forEach((d) => {
    const dur = getDur(d.audio);

    animEvents.push({
      time: curTime,
      type: "show_dialogue",
      item: d
    });

    // 1st play
    audioTags.push(`<audio id="dial_${d.id}_1" src="assets/voice/${d.audio}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "pulse_words" });
    curTime += dur + 0.9;

    // 2nd play (repetition for retention)
    audioTags.push(`<audio id="dial_${d.id}_2" src="assets/voice/${d.audio}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "pulse_words" });
    curTime += dur + 1.4;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "show_dialogue") {
      animScriptCode += `  tl.call(function() {
    showDialogue(${JSON.stringify(e.item)});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "pulse_words") {
      animScriptCode += `  tl.fromTo(".hl-r, .hl-l", { scale: 1.18 }, { scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, ${e.time.toFixed(2)});\n`;
    }
  });

  return {
    duration: totalDur,
    html: `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .bg-video {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0.32; z-index: 1; filter: saturate(1.2);
    transform: scale(1.05); transform-origin: center center;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 2.6cqw; font-size: 1.35cqw; font-weight: 900;
    color: #111111; z-index: 10;
  }
  .stage {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: 84cqw; z-index: 5;
  }
  .dialogue-card {
    background: #FFFFFF; border: 4px solid #111111; box-shadow: 8px 8px 0px #111111;
    border-radius: 28px; padding: 5cqh 4cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 2.2cqh;
  }
  .tag-pill {
    display: inline-block; background: #DBEAFE; border: 2px solid #111111;
    padding: 0.5cqh 1.8cqw; border-radius: 999px; font-size: 1.25cqw; font-weight: 900; color: #1E40AF;
  }
  .sentence-en {
    font-family: 'Archivo Black', sans-serif; font-size: 3.6cqw; line-height: 1.35;
    color: #111111;
  }
  .hl-r {
    color: #1E40AF; border-bottom: 5px solid #2563EB; padding-bottom: 2px;
    display: inline-block; background: #DBEAFE; padding-left: 6px; padding-right: 6px; border-radius: 6px;
  }
  .hl-l {
    color: #065F46; border-bottom: 5px solid #059669; padding-bottom: 2px;
    display: inline-block; background: #D1FAE5; padding-left: 6px; padding-right: 6px; border-radius: 6px;
  }
  .sentence-kr {
    font-size: 2.1cqw; font-weight: 800; color: #4B5563;
  }
  .syl-tip-box {
    background: #FAF7F2; border: 2.5px solid #111111; box-shadow: 3px 3px 0px #111111;
    border-radius: 14px; padding: 1cqh 2.4cqw; font-size: 1.4cqw; font-weight: 900;
    color: #111111; margin-top: 0.5cqh;
  }
</style>
<div id="root" data-composition-id="07-dialogue" data-width="1920" data-height="1080">
  <video id="bgVideo" class="bg-video" src="assets/videos/f07_dialogue_ambience.mp4" autoplay loop muted data-start="0" data-duration="${totalDur.toFixed(2)}" data-hf-media-start-basis="local" data-layout-allow-overflow></video>

  <div class="eyebrow-pill">
    <span>☕ 실전 짝단어 문장 리스닝 (7문장 집중 훈련)</span>
  </div>

  <div class="stage">
    <div class="dialogue-card" id="dialCard">
      <div id="dialTag" class="tag-pill">right vs light</div>
      <div id="dialEn" class="sentence-en">Turn <span class="hl-r">right</span> at the traffic <span class="hl-l">light</span>.</div>
      <div id="dialKr" class="sentence-kr">신호등에서 오른쪽으로 도세요.</div>
      <div id="dialSylTip" class="syl-tip-box">💡 right (허공 0%) vs light (잇몸 접촉 100%)</div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>
<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var dialTag = document.getElementById("dialTag");
    var dialEn = document.getElementById("dialEn");
    var dialKr = document.getElementById("dialKr");
    var dialSylTip = document.getElementById("dialSylTip");
    var dialCard = document.getElementById("dialCard");

    function showDialogue(d) {
      dialTag.textContent = d.pairBadge;
      dialEn.innerHTML = d.enHtml;
      dialKr.textContent = d.kr;
      dialSylTip.textContent = d.sylTip;
      gsap.fromTo(dialCard, { scale: 0.96 }, { scale: 1, duration: 0.3, ease: "back.out(1.5)" });
    }

${animScriptCode}
    window.__timelines = window.__timelines || {};
    window.__timelines["07-dialogue"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// 8. Frame 08: Shuffle Drill
function generateF08() {
  const allWordKeys = Object.keys(DICTIONARY);
  const quizItems = [];
  allWordKeys.forEach(pKey => {
    const p = DICTIONARY[pKey];
    quizItems.push({ ...p.w1, type: "r", label: "[r] 허공 숟가락 (접촉 0%)" });
    quizItems.push({ ...p.w2, type: "l", label: "[l] 윗니 뒤 잇몸 (접촉 100%)" });
  });

  // Deterministic shuffle
  for (let i = quizItems.length - 1; i > 0; i--) {
    const j = (i * 7 + 13) % (i + 1);
    [quizItems[i], quizItems[j]] = [quizItems[j], quizItems[i]];
  }

  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  quizItems.forEach((w, idx) => {
    const dur = getDur(w.m);

    // 1. Audio plays while showing blind card
    animEvents.push({ time: curTime, type: "play_blind", item: w, idx: idx + 1 });
    audioTags.push(`<audio id="sq_${idx}" src="assets/voice/${w.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);
    curTime += dur;

    // 2. Think time: 1.8 seconds (blind card remains)
    curTime += 1.8;

    // 3. Reveal answer
    animEvents.push({ time: curTime, type: "reveal_answer", item: w });

    // 4. Digestion time: 2.4 seconds
    curTime += 2.4;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "play_blind") {
      animScriptCode += `  tl.call(function() {
    setBlind(${e.idx}, ${quizItems.length});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "reveal_answer") {
      animScriptCode += `  tl.call(function() {
    revealAnswer(${JSON.stringify(e.item)});
  }, null, ${e.time.toFixed(2)});\n`;
    }
  });

  return {
    duration: totalDur,
    html: `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 2.6cqw; font-size: 1.35cqw; font-weight: 900;
    color: #111111; z-index: 10;
  }
  .stage {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: 60cqw; z-index: 5;
  }
  .quiz-card {
    background: #FFFFFF; border: 4px solid #111111; box-shadow: 8px 8px 0px #111111;
    border-radius: 28px; padding: 6cqh 4cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.2cqh;
  }
  .quiz-counter {
    font-size: 1.3cqw; font-weight: 900; color: #6B7280; background: #F3F4F6;
    padding: 0.4cqh 1.4cqw; border-radius: 999px; border: 2px solid #111111;
  }
  .quiz-word {
    font-family: 'Archivo Black', sans-serif; font-size: 7cqw; line-height: 1.0;
    color: #111111; letter-spacing: -0.02em; min-height: 8cqh;
  }
  .quiz-word.blind { color: #6B7280; }
  .quiz-badge {
    font-size: 1.8cqw; font-weight: 900; padding: 0.8cqh 2.2cqw; border-radius: 999px;
    border: 2.5px solid #111111;
  }
  .badge-r { background: #DBEAFE; color: #1E40AF; }
  .badge-l { background: #D1FAE5; color: #065F46; }
  .badge-blind { background: #E5E7EB; color: #374151; }
  .quiz-kr {
    font-size: 2.2cqw; font-weight: 800; color: #4B5563; min-height: 3cqh;
  }
</style>
<div id="root" data-composition-id="08-shuffle" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span>⚡ 40단어 무작위 덱 셔플 귀 훈련 (실전 반응 퀴즈)</span>
  </div>

  <div class="stage">
    <div id="quizCard" class="quiz-card">
      <div id="quizCounter" class="quiz-counter">Q 1 / 40</div>
      <div id="quizWord" class="quiz-word blind">???</div>
      <div id="quizBadge" class="quiz-badge badge-blind">소리를 듣고 맞춰보세요</div>
      <div id="quizKr" class="quiz-kr"></div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>
<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var quizCounter = document.getElementById("quizCounter");
    var quizWord = document.getElementById("quizWord");
    var quizBadge = document.getElementById("quizBadge");
    var quizKr = document.getElementById("quizKr");

    function setBlind(idx, total) {
      quizCounter.textContent = "Q " + idx + " / " + total;
      quizWord.textContent = "???";
      quizWord.className = "quiz-word blind";
      quizBadge.textContent = "소리를 듣고 맞춰보세요 👂";
      quizBadge.className = "quiz-badge badge-blind";
      quizKr.textContent = "";
    }

    function revealAnswer(w) {
      quizWord.textContent = w.word;
      quizWord.className = "quiz-word";
      quizKr.textContent = w.ipa + " · [" + w.syl + "] · " + w.kr;
      if (w.type === "r") {
        quizBadge.textContent = w.label;
        quizBadge.className = "quiz-badge badge-r";
      } else {
        quizBadge.textContent = w.label;
        quizBadge.className = "quiz-badge badge-l";
      }
    }

${animScriptCode}
    window.__timelines = window.__timelines || {};
    window.__timelines["08-shuffle"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// 9. Frame 09: Summary Cheat Sheet
function generateF09() {
  const dur = getDur("03_f09_summary");
  const totalDur = dur + 1.0;
  const whisperCode = buildWhisperCalls("03_f09_summary");

  return {
    duration: totalDur,
    html: `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 2.8cqw; font-size: 1.35cqw; font-weight: 900;
    color: #111111; z-index: 10; display: flex; align-items: center; gap: 0.8cqw;
  }
  .capture-badge {
    background: #EF4444; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1cqw; font-weight: 900;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 88cqw; display: flex; gap: 3cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .summary-col {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 24px; padding: 3cqh 2.5cqw; display: flex; flex-direction: column; gap: 1.5cqh;
  }
  .col-header {
    padding: 1cqh 1.8cqw; border-radius: 14px; border: 2.5px solid #111111; text-align: center;
  }
  .header-r { background: #DBEAFE; color: #1E40AF; }
  .header-l { background: #D1FAE5; color: #065F46; }
  .col-title { font-size: 2cqw; font-weight: 900; }
  .col-sub { font-size: 1.2cqw; font-weight: 800; margin-top: 0.4cqh; }
  .word-list {
    display: flex; flex-direction: column; gap: 0.8cqh; font-size: 1.3cqw; font-weight: 800;
  }
  .word-row {
    display: flex; justify-content: space-between; align-items: center; padding: 0.6cqh 1.2cqw;
    background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;
  }
  .word-name { font-weight: 900; }
  .syl-tag {
    font-weight: 900; color: #1E40AF; background: #DBEAFE; padding: 0.2cqh 0.8cqw;
    border-radius: 6px; font-size: 1.15cqw;
  }
  .syl-tag.l-tag { color: #065F46; background: #D1FAE5; }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>
<div id="root" data-composition-id="09-summary" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span class="capture-badge">📱 캡처 추천</span>
    <span>스마트폰 저장용 1장 요약 치트시트</span>
  </div>

  <div class="stage">
    <!-- [r] Col -->
    <div class="summary-col">
      <div class="col-header header-r">
        <div class="col-title">[r] 허공 숟가락 소리</div>
        <div class="col-sub">혀끝 입천장 접촉 0%! 오목한 허공 울림</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">right (오른쪽)</span><span class="syl-tag">[raɪt] [롸이트]</span></div>
        <div class="word-row"><span class="word-name">red (빨간색)</span><span class="syl-tag">[rɛd] [뤠드]</span></div>
        <div class="word-row"><span class="word-name">rain (비)</span><span class="syl-tag">[reɪn] [뤠인]</span></div>
        <div class="word-row"><span class="word-name">run (달리다)</span><span class="syl-tag">[rʌn] [뤈]</span></div>
        <div class="word-row"><span class="word-name">read (읽다)</span><span class="syl-tag">[riːd] [뤼드]</span></div>
        <div class="word-row"><span class="word-name">ri · ver (강)</span><span class="syl-tag">[ˈrɪvər] [리버]</span></div>
        <div class="word-row"><span class="word-name">rock (바위)</span><span class="syl-tag">[rɑːk] [롹]</span></div>
        <div class="word-row"><span class="word-name">pray (기도하다)</span><span class="syl-tag">[preɪ] [프레이]</span></div>
        <div class="word-row"><span class="word-name">crown (왕관)</span><span class="syl-tag">[kraʊn] [크라운]</span></div>
        <div class="word-row"><span class="word-name">grass (잔디)</span><span class="syl-tag">[ɡræs] [그래스]</span></div>
      </div>
    </div>

    <!-- [l] Col -->
    <div class="summary-col">
      <div class="col-header header-l">
        <div class="col-title">[l] 윗니 뒤 잇몸 접촉 소리</div>
        <div class="col-sub">혀끝으로 윗니 뒤 잇몸을 강하게 '탁!'</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">light (빛/전등)</span><span class="syl-tag l-tag">[laɪt] [라이트]</span></div>
        <div class="word-row"><span class="word-name">led (이끌었다)</span><span class="syl-tag l-tag">[lɛd] [레드]</span></div>
        <div class="word-row"><span class="word-name">lane (차선)</span><span class="syl-tag l-tag">[leɪn] [레인]</span></div>
        <div class="word-row"><span class="word-name">learn (배우다)</span><span class="syl-tag l-tag">[lɜːrn] [런]</span></div>
        <div class="word-row"><span class="word-name">lead (이끌다)</span><span class="syl-tag l-tag">[liːd] [리드]</span></div>
        <div class="word-row"><span class="word-name">li · ver (간)</span><span class="syl-tag l-tag">[ˈlɪvər] [리버]</span></div>
        <div class="word-row"><span class="word-name">lock (자물쇠)</span><span class="syl-tag l-tag">[lɑːk] [락]</span></div>
        <div class="word-row"><span class="word-name">play (놀다)</span><span class="syl-tag l-tag">[pleɪ] [플레이]</span></div>
        <div class="word-row"><span class="word-name">clown (광대)</span><span class="syl-tag l-tag">[klaʊn] [클라운]</span></div>
        <div class="word-row"><span class="word-name">glass (유리)</span><span class="syl-tag l-tag">[ɡlæs] [글래스]</span></div>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="audioSummary" src="assets/voice/03_f09_summary.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${dur.toFixed(2)}"></audio>
</div>
<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(t) {
      if (!t) {
        gsap.to(pill, { opacity: 0, duration: 0.15, overwrite: "auto" });
      } else {
        pill.innerText = t;
        gsap.to(pill, { opacity: 1, duration: 0.15, overwrite: "auto" });
      }
    }

${whisperCode}
    tl.call(function() { cap(""); }, null, ${dur.toFixed(2)});

    window.__timelines = window.__timelines || {};
    window.__timelines["09-summary"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// 10. Frame 10: Encore & End Screen
function generateF10() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];
  const allPairKeys = Object.keys(DICTIONARY);

  allPairKeys.forEach(pKey => {
    const p = DICTIONARY[pKey];
    const w1 = p.w1;
    const w2 = p.w2;
    const w1_dur = getDur(w1.m);
    const w2_dur = getDur(w2.f);

    animEvents.push({ time: curTime, pair: p });
    audioTags.push(`<audio id="enc_${w1.id}" src="assets/voice/${w1.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_dur.toFixed(2)}"></audio>`);
    curTime += w1_dur + 0.4;

    audioTags.push(`<audio id="enc_${w2.id}" src="assets/voice/${w2.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_dur.toFixed(2)}"></audio>`);
    curTime += w2_dur + 0.6;
  });

  const encoreAudioEnd = curTime;
  const endScreenDuration = 10.0; // YouTube standard end-screen keepout
  const totalDur = encoreAudioEnd + endScreenDuration;

  let animScriptCode = '';
  animEvents.forEach(e => {
    animScriptCode += `  tl.call(function() {
    setEncorePair(${JSON.stringify(e.pair)});
  }, null, ${e.time.toFixed(2)});\n`;
  });

  animScriptCode += `  tl.to("#encoreStage", { opacity: 0, duration: 0.4 }, ${encoreAudioEnd.toFixed(2)});\n`;
  animScriptCode += `  tl.to("#endOverlay", { opacity: 1, duration: 0.5 }, ${encoreAudioEnd.toFixed(2)});\n`;

  return {
    duration: totalDur,
    encoreAudioEnd,
    endScreenDuration,
    html: `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 2.6cqw; font-size: 1.35cqw; font-weight: 900;
    color: #111111; z-index: 10;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; display: flex; gap: 3.5cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .encore-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 5cqh 3cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqh;
  }
  .card-label {
    font-size: 1.25cqw; font-weight: 900; padding: 0.6cqh 1.8cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .label-r { background: #DBEAFE; color: #1E40AF; }
  .label-l { background: #D1FAE5; color: #065F46; }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.0;
    color: #111111; letter-spacing: -0.02em;
  }
  .ipa-text {
    font-size: 2.2cqw; font-weight: 900; color: #4B5563;
  }
  .end-screen-overlay {
    position: absolute; inset: 0; width: 100%; height: 100%;
    background: rgba(244, 239, 230, 0.98); z-index: 40;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
  }
  .end-header {
    font-family: 'Archivo Black', sans-serif; font-size: 3.6cqw; color: #111111; margin-bottom: 4cqh;
  }
  .end-boxes {
    display: flex; gap: 4cqw; align-items: center; justify-content: center;
  }
  .guide-box {
    width: 25cqw; height: 14cqw; border: 3.5px dashed #111111; border-radius: 20px;
    background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-size: 1.4cqw; font-weight: 900; color: #4B5563; gap: 1cqh;
  }
  .sub-circle {
    width: 14cqw; height: 14cqw; border: 3.5px dashed #EF4444; border-radius: 50%;
    background: #FFFFFF; display: flex; align-items: center; justify-content: center;
    font-size: 1.4cqw; font-weight: 900; color: #EF4444;
  }
</style>
<div id="root" data-composition-id="10-encore" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span>🔁 20쌍 무한 앵콜 총복습</span>
  </div>

  <div id="encoreStage" class="stage">
    <div class="encore-card">
      <div class="card-label label-r">[r] 허공 0%</div>
      <div id="encW1" class="word-text" style="color:#2563EB;">right</div>
      <div id="encIpa1" class="ipa-text">[raɪt] · [롸이트] 오른쪽</div>
    </div>
    <div class="encore-card">
      <div class="card-label label-l">[l] 잇몸 100%</div>
      <div id="encW2" class="word-text" style="color:#059669;">light</div>
      <div id="encIpa2" class="ipa-text">[laɪt] · [라이트] 빛/전등</div>
    </div>
  </div>

  <div id="endOverlay" class="end-screen-overlay" data-layout-allow-overlap>
    <div class="end-header">오늘도 20쌍 완주를 축하합니다! 👏</div>
    <div class="end-boxes">
      <div class="guide-box">
        <span>🎬 추천 영상</span>
        <span style="font-size: 1cqw;">(EP25 Pool vs Pull)</span>
      </div>
      <div class="sub-circle">
        <span>구독하기</span>
      </div>
      <div class="guide-box">
        <span>📋 재생목록</span>
        <span style="font-size: 1cqw;">([이해하면 쉬운영어] 정주행)</span>
      </div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>
<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var encW1 = document.getElementById("encW1");
    var encIpa1 = document.getElementById("encIpa1");
    var encW2 = document.getElementById("encW2");
    var encIpa2 = document.getElementById("encIpa2");

    function setEncorePair(p) {
      encW1.textContent = p.w1.word;
      encIpa1.textContent = p.w1.ipa + " · [" + p.w1.syl + "] " + p.w1.kr;
      encW2.textContent = p.w2.word;
      encIpa2.textContent = p.w2.ipa + " · [" + p.w2.syl + "] " + p.w2.kr;
    }

${animScriptCode}
    window.__timelines = window.__timelines || {};
    window.__timelines["10-encore"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// Generate all frames
console.log("Generating 10 frames for EP26 with English syllable division & natural Korean readings...");

const f01 = generateF01();
fs.writeFileSync(path.join(outFramesDir, "01-hook.html"), f01.html, "utf8");

const f02 = generateF02();
fs.writeFileSync(path.join(outFramesDir, "02-principle.html"), f02.html, "utf8");

const f03 = generateGroupFrame("03-group1", 1, "Group 1: 핵심 빈출 5쌍", ["p01", "p02", "p03", "p04", "p05"], "혀끝 허공 0% vs 윗니 뒤 잇몸 100% 6회 드릴");
fs.writeFileSync(path.join(outFramesDir, "03-group1.html"), f03.html, "utf8");

const f04 = generateGroupFrame("04-group2", 2, "Group 2: 필수 동사 5쌍", ["p06", "p07", "p08", "p09", "p10"], "필수 동작·동사 6회 집중 드릴");
fs.writeFileSync(path.join(outFramesDir, "04-group2.html"), f04.html, "utf8");

const f05 = generateGroupFrame("05-group3", 3, "Group 3: 일상 명사 5쌍", ["p11", "p12", "p13", "p14", "p15"], "일상 사물·명사 6회 집중 드릴 (ri · ver vs li · ver 음절 분리)");
fs.writeFileSync(path.join(outFramesDir, "05-group3.html"), f05.html, "utf8");

const f06 = generateGroupFrame("06-group4", 4, "Group 4: 자음군(Blends) 고난도 5쌍", ["p16", "p17", "p18", "p19", "p20"], "한국인 최다 혼동 자음군 6회 집중 드릴");
fs.writeFileSync(path.join(outFramesDir, "06-group4.html"), f06.html, "utf8");

const f07 = generateF07();
fs.writeFileSync(path.join(outFramesDir, "07-dialogue.html"), f07.html, "utf8");

const f08 = generateF08();
fs.writeFileSync(path.join(outFramesDir, "08-shuffle.html"), f08.html, "utf8");

const f09 = generateF09();
fs.writeFileSync(path.join(outFramesDir, "09-summary.html"), f09.html, "utf8");

const f10 = generateF10();
fs.writeFileSync(path.join(outFramesDir, "10-encore.html"), f10.html, "utf8");

// Generate root index.html
const frameList = [
  { id: "01-hook", file: "01-hook.html", duration: f01.duration, title: "Right vs Light, 둘 다 '라이트'?" },
  { id: "02-principle", file: "02-principle.html", duration: f02.duration, title: "[r] vs [l] 혀끝 접촉 물리법칙 조음 원리" },
  { id: "03-group1", file: "03-group1.html", duration: f03.duration, title: "Group 1: 핵심 빈출 5쌍 (Right/Light, Red/Led, Rain/Lane...)" },
  { id: "04-group2", file: "04-group2.html", duration: f04.duration, title: "Group 2: 필수 동사 5쌍 (Run/Learn, Read/Lead, Ride/Lied...)" },
  { id: "05-group3", file: "05-group3.html", duration: f05.duration, title: "Group 3: 일상 명사 5쌍 (ri · ver / li · ver, Rock/Lock, Road/Load...)" },
  { id: "06-group4", file: "06-group4.html", duration: f06.duration, title: "Group 4: 자음군(Blends) 5쌍 (Pray/Play, Crown/Clown, Grow/Glow...)" },
  { id: "07-dialogue", file: "07-dialogue.html", duration: f07.duration, title: "실전 대화 문장 7문장 (R/L 문맥 청취)" },
  { id: "08-shuffle", file: "08-shuffle.html", duration: f08.duration, title: "40단어 무작위 덱 셔플 귀 훈련 (실전 퀴즈)" },
  { id: "09-summary", file: "09-summary.html", duration: f09.duration, title: "스마트폰 캡처용 1장 요약 치트시트" },
  { id: "10-encore", file: "10-encore.html", duration: f10.duration, title: "20쌍 무한 앵콜 총복습 & 다음 추천 영상" }
];

let cumulativeTime = 0;
const compDivs = [];
const compIncludes = [];

frameList.forEach((f, idx) => {
  const start = cumulativeTime;
  cumulativeTime += f.duration;
  compDivs.push(`      <div id="scene-${f.id}" class="scene" data-composition-id="${f.id}" data-composition-src="compositions/frames/${f.file}" data-start="${start.toFixed(2)}" data-duration="${f.duration.toFixed(2)}" data-track-index="0"></div>`);
  compIncludes.push(`  <!-- Frame ${idx + 1}: ${f.title} (${start.toFixed(2)}s ~ ${cumulativeTime.toFixed(2)}s, ${f.duration.toFixed(2)}s) -->`);
});

const totalTimelineSec = cumulativeTime;
const endScreenStartSec = totalTimelineSec - f10.endScreenDuration;

console.log(`\n=== EP26 Timeline Assembled ===`);
console.log(`Total duration: ${totalTimelineSec.toFixed(2)}s (${Math.floor(totalTimelineSec / 60)}m ${(totalTimelineSec % 60).toFixed(1)}s)`);
console.log(`End screen start: ${endScreenStartSec.toFixed(2)}s ~ ${totalTimelineSec.toFixed(2)}s (${f10.endScreenDuration}s maintain)`);

const rootHtml = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #F4EFE6; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #F4EFE6; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${totalTimelineSec.toFixed(2)}" data-width="1920" data-height="1080">
${compDivs.join("\n")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

fs.writeFileSync(path.join(projectDir, "index.html"), rootHtml, "utf8");
console.log("✓ Successfully generated 10 frame HTML files and root index.html with English syllable division!");
