import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep25-pool-pull');
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

// 20 Minimal Pairs Dictionary for [uː] vs [ʊ] with SYLLABLE NOTATION (syl)
const DICTIONARY = {
  // Group 1: 핵심 명사 & 동사
  p01: {
    w1: { id: "w01", word: "pool", ipa: "[puːl]", syl: "푸 · 울", kr: "수영장", tip: "촛불 불듯 입술을 둥글게 모으기!", m: "m_w01_pool", f: "f_w01_pool" },
    w2: { id: "w02", word: "pull", ipa: "[pʊl]", syl: "풀", kr: "당기다", tip: "멍때리듯 입술에 힘 툭 빼고 가볍게!", m: "m_w02_pull", f: "f_w02_pull" }
  },
  p02: {
    w1: { id: "w03", word: "fool", ipa: "[fuːl]", syl: "푸 · 울", kr: "바보", tip: "입술을 팽팽하게 모아 '푸-울'", m: "m_w03_fool", f: "f_w03_fool" },
    w2: { id: "w04", word: "full", ipa: "[fʊl]", syl: "풀", kr: "가득 찬/배부른", tip: "턱에 힘 풀고 가볍게 '풀'", m: "m_w04_full", f: "f_w04_full" }
  },
  p03: {
    w1: { id: "w05", word: "Luke", ipa: "[luːk]", syl: "루 · 크", kr: "루크(이름)", tip: "입술을 둥글게 앞으로 '루-크'", m: "m_w05_Luke", f: "f_w05_Luke" },
    w2: { id: "w06", word: "look", ipa: "[lʊk]", syl: "룩", kr: "보다", tip: "힘 빼고 편안하게 툭 '룩'", m: "m_w06_look", f: "f_w06_look" }
  },
  p04: {
    w1: { id: "w07", word: "suit", ipa: "[suːt]", syl: "수 · 트", kr: "정장/어울리다", tip: "입술을 모으며 팽팽하게 '수-트'", m: "m_w07_suit", f: "f_w07_suit" },
    w2: { id: "w08", word: "soot", ipa: "[sʊt]", syl: "숫", kr: "그을음", tip: "턱에 힘 풀고 가볍게 '숫'", m: "m_w08_soot", f: "f_w08_soot" }
  },
  p05: {
    w1: { id: "w09", word: "kook", ipa: "[kuːk]", syl: "쿠 · 크", kr: "괴짜", tip: "입술을 좁게 모아 '쿠-크'", m: "m_w09_kook", f: "f_w09_kook" },
    w2: { id: "w10", word: "cook", ipa: "[kʊk]", syl: "쿡", kr: "요리사/요리하다", tip: "힘 빼고 툭 떨어뜨리며 '쿡'", m: "m_w10_cook", f: "f_w10_cook" }
  },

  // Group 2: 조동사 & 과거형
  p06: {
    w1: { id: "w11", word: "cooed", ipa: "[kuːd]", syl: "쿠 · 드", kr: "속삭였다", tip: "입술 모아 부드럽게 '쿠-드'", m: "m_w11_cooed", f: "f_w11_cooed" },
    w2: { id: "w12", word: "could", ipa: "[kʊd]", syl: "쿧", kr: "할 수 있었다", tip: "힘 빼고 편안하게 '쿧'", m: "m_w12_could", f: "f_w12_could" }
  },
  p07: {
    w1: { id: "w13", word: "shooed", ipa: "[ʃuːd]", syl: "슈 · 드", kr: "쫓아냈다", tip: "입술을 앞으로 쭉 '슈-드'", m: "m_w13_shooed", f: "f_w13_shooed" },
    w2: { id: "w14", word: "should", ipa: "[ʃʊd]", syl: "슏", kr: "해야 한다", tip: "턱 힘 빼고 가볍게 '슏'", m: "m_w14_should", f: "f_w14_should" }
  },
  p08: {
    w1: { id: "w15", word: "wooed", ipa: "[wuːd]", syl: "우 · 드", kr: "마음을 얻었다", tip: "입술 둥글게 모아 '우-드'", m: "m_w15_wooed", f: "f_w15_wooed" },
    w2: { id: "w16", word: "wood", ipa: "[wʊd]", syl: "욷", kr: "나무", tip: "입술 힘 풀고 툭 '욷'", m: "m_w16_wood", f: "f_w16_wood" }
  },
  p09: {
    w1: { id: "w17", word: "stewed", ipa: "[stuːd]", syl: "스튜 · 드", kr: "스튜를 끓였다", tip: "입술 모아 단단하게 '스튜-드'", m: "m_w17_stewed", f: "f_w17_stewed" },
    w2: { id: "w18", word: "stood", ipa: "[stʊd]", syl: "스툳", kr: "일어섰다", tip: "힘 빼고 툭 '스툳'", m: "m_w18_stood", f: "f_w18_stood" }
  },
  p10: {
    w1: { id: "w19", word: "who'd", ipa: "[huːd]", syl: "후 · 드", kr: "누가 하겠어", tip: "입술 모아 숨 뱉으며 '후-드'", m: "m_w19_whod", f: "f_w19_whod" },
    w2: { id: "w20", word: "hood", ipa: "[hʊd]", syl: "흗", kr: "모자/후드", tip: "입에 힘 빼고 가볍게 '흗'", m: "m_w20_hood", f: "f_w20_hood" }
  },

  // Group 3: 불규칙 과거 & 동작
  p11: {
    w1: { id: "w21", word: "shoot", ipa: "[ʃuːt]", syl: "슈 · 트", kr: "쏘다/슛", tip: "입술을 앞으로 모아 '슈-트'", m: "m_w21_shoot", f: "f_w21_shoot" },
    w2: { id: "w22", word: "shook", ipa: "[ʃʊk]", syl: "슠", kr: "흔들었다", tip: "턱 힘 빼고 짧게 툭 '슠'", m: "m_w22_shook", f: "f_w22_shook" }
  },
  p12: {
    w1: { id: "w23", word: "toot", ipa: "[tuːt]", syl: "투 · 트", kr: "경적을 울리다", tip: "입술 좁게 모아 '투-트'", m: "m_w23_toot", f: "f_w23_toot" },
    w2: { id: "w24", word: "took", ipa: "[tʊk]", syl: "툮", kr: "가져갔다/걸렸다", tip: "힘 빼고 가볍게 '툮'", m: "m_w24_took", f: "f_w24_took" }
  },
  p13: {
    w1: { id: "w25", word: "booed", ipa: "[buːd]", syl: "부 · 드", kr: "야유했다", tip: "입술 모아 둥글게 '부-드'", m: "m_w25_booed", f: "f_w25_booed" },
    w2: { id: "w26", word: "bull", ipa: "[bʊl]", syl: "불", kr: "황소", tip: "입술 힘 풀고 '불'", m: "m_w26_bull", f: "f_w26_bull" }
  },
  p14: {
    w1: { id: "w27", word: "rood", ipa: "[ruːd]", syl: "루 · 드", kr: "십자가", tip: "혀 말며 입술 모아 '루-드'", m: "m_w27_rood", f: "f_w27_rood" },
    w2: { id: "w28", word: "rook", ipa: "[rʊk]", syl: "룩", kr: "체스 말", tip: "힘 빼고 툭 '룩'", m: "m_w28_rook", f: "f_w28_rook" }
  },
  p15: {
    w1: { id: "w29", word: "coop", ipa: "[kuːp]", syl: "쿠 · 프", kr: "가두다/닭장", tip: "입술 모아 앞으로 '쿠-프'", m: "m_w29_coop", f: "f_w29_coop" },
    w2: { id: "w30", word: "crook", ipa: "[krʊk]", syl: "크룩", kr: "사기꾼/구부러진 것", tip: "힘 빼고 가볍게 '크룩'", m: "m_w30_crook", f: "f_w30_crook" }
  },

  // Group 4: 일상 최다 혼동 실생활
  p16: {
    w1: { id: "w31", word: "food", ipa: "[fuːd]", syl: "푸 · 드", kr: "음식", tip: "입술을 앞으로 모아 '푸-드'", m: "m_w31_food", f: "f_w31_food" },
    w2: { id: "w32", word: "foot", ipa: "[fʊt]", syl: "풋", kr: "발", tip: "턱 힘 빼고 가볍게 툭 '풋'", m: "m_w32_foot", f: "f_w32_foot" }
  },
  p17: {
    w1: { id: "w33", word: "boot", ipa: "[buːt]", syl: "부 · 트", kr: "부츠", tip: "입술 모아 단단하게 '부-트'", m: "m_w33_boot", f: "f_w33_boot" },
    w2: { id: "w34", word: "book", ipa: "[bʊk]", syl: "북", kr: "책", tip: "힘 풀고 편안하게 '북'", m: "m_w34_book", f: "f_w34_book" }
  },
  p18: {
    w1: { id: "w35", word: "goose", ipa: "[guːs]", syl: "구 · 스", kr: "거위", tip: "목구멍 열고 모으며 '구-스'", m: "m_w35_goose", f: "f_w35_goose" },
    w2: { id: "w36", word: "good", ipa: "[gʊd]", syl: "굳", kr: "좋은", tip: "힘 빼고 가볍게 '굳'", m: "m_w36_good", f: "f_w36_good" }
  },
  p19: {
    w1: { id: "w37", word: "cool", ipa: "[kuːl]", syl: "쿠 · 얼", kr: "시원한/멋진", tip: "입술 둥글게 '쿠-얼'", m: "m_w37_cool", f: "f_w37_cool" },
    w2: { id: "w38", word: "wool", ipa: "[wʊl]", syl: "울", kr: "양모/울", tip: "힘 빼고 편안하게 '울'", m: "m_w38_wool", f: "f_w38_wool" }
  },
  p20: {
    w1: { id: "w39", word: "room", ipa: "[ruːm]", syl: "루 · 음", kr: "방/공간", tip: "입술 모아 깊게 '루-음'", m: "m_w39_room", f: "f_w39_room" },
    w2: { id: "w40", word: "rook", ipa: "[rʊk]", syl: "룩", kr: "체스 룩/성채", tip: "턱 힘 빼고 툭 '룩'", m: "m_w40_rook2", f: "f_w40_rook2" }
  }
};

// 7 Minimal Pair Dialogue Sentences with word highlights & syllable breakdown tips
const DIALOGUES = [
  {
    id: "01",
    en: "Pull the door, don't push it.",
    enHtml: '<span class="hl-lax">Pull</span> the door, don\'t <span class="hl-lax">push</span> it.',
    kr: "문을 당기세요, 밀지 말고요.",
    pairBadge: "pull vs push",
    sylTip: "💡 pull [풀] · push [푸쉬] ➔ 둘 다 턱에 힘 빼고 가볍게!",
    m: "m_dial_01_pull_push",
    f: "f_dial_01_pull_push"
  },
  {
    id: "02",
    en: "Don't be a fool, I'm already full.",
    enHtml: 'Don\'t be a <span class="hl-tense">fool</span>, I\'m already <span class="hl-lax">full</span>.',
    kr: "바보같이 굴지 마, 나 이미 배불러.",
    pairBadge: "fool vs full",
    sylTip: "💡 fool [푸 · 울] (입술 모음) vs full [풀] (힘 빼기)",
    m: "m_dial_02_full_fool",
    f: "f_dial_02_full_fool"
  },
  {
    id: "03",
    en: "Look at Luke over there by the window.",
    enHtml: '<span class="hl-lax">Look</span> at <span class="hl-tense">Luke</span> over there by the window.',
    kr: "창가 쪽에 있는 루크 좀 봐봐.",
    pairBadge: "look vs Luke",
    sylTip: "💡 Look [룩] (툭 떨어짐) vs Luke [루 · 크] (입술 모음)",
    m: "m_dial_03_look_Luke",
    f: "f_dial_03_look_Luke"
  },
  {
    id: "04",
    en: "He stood there in the kitchen and stewed.",
    enHtml: 'He <span class="hl-lax">stood</span> there in the kitchen and <span class="hl-tense">stewed</span>.',
    kr: "그는 부엌에 서서 스튜를 끓였다.",
    pairBadge: "stood vs stewed",
    sylTip: "💡 stood [스툳] (가볍게) vs stewed [스튜 · 드] (입술 모음)",
    m: "m_dial_04_stood_stewed",
    f: "f_dial_04_stood_stewed"
  },
  {
    id: "05",
    en: "Who'd wear a heavy hood today?",
    enHtml: '<span class="hl-tense">Who\'d</span> wear a heavy <span class="hl-lax">hood</span> today?',
    kr: "누가 오늘같이 더운 날 무거운 후드를 입겠어?",
    pairBadge: "Who'd vs hood",
    sylTip: "💡 Who\'d [후 · 드] (단단하게) vs hood [흗] (가볍게)",
    m: "m_dial_05_whod_hood",
    f: "f_dial_05_whod_hood"
  },
  {
    id: "06",
    en: "He took off his boots and shook his head.",
    enHtml: 'He <span class="hl-lax">took</span> off his <span class="hl-tense">boots</span> and <span class="hl-lax">shook</span> his head.',
    kr: "그는 부츠를 벗고 고개를 절레절레 흔들었다.",
    pairBadge: "took / boots / shook",
    sylTip: "💡 took [툮] · shook [슠] (단모음) vs boots [부 · 트] (장모음)",
    m: "m_dial_06_boots_shook",
    f: "f_dial_06_boots_shook"
  },
  {
    id: "07",
    en: "Good food always puts me in a good mood.",
    enHtml: '<span class="hl-lax">Good</span> <span class="hl-tense">food</span> always puts me in a <span class="hl-lax">good</span> <span class="hl-tense">mood</span>.',
    kr: "좋은 음식은 언제나 기분을 좋게 만들어 줘.",
    pairBadge: "food vs mood vs good",
    sylTip: "💡 Good [굳] (이완) vs food [푸 · 드] · mood [무 · 드] (긴장)",
    m: "m_dial_07_food_mood",
    f: "f_dial_07_food_mood"
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
  .label-tense { background: #D1FAE5; color: #065F46; }
  .label-lax { background: #FEF3C7; color: #92400E; }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 6.2cqw; letter-spacing: 0.02em;
    color: #111111; line-height: 1.1;
  }
  .syl-pill {
    font-family: 'Noto Sans KR', sans-serif; font-size: 1.8cqw; font-weight: 900;
    padding: 0.4cqh 1.4cqw; border-radius: 12px; border: 2px solid #111111;
    box-shadow: 2px 2px 0px #111111; display: inline-flex; align-items: center; gap: 0.4cqw;
  }
  .syl-pill.tense { background: #A7F3D0; color: #064E3B; }
  .syl-pill.lax { background: #FEF08A; color: #78350F; }
  .meaning-text {
    font-size: 2cqw; font-weight: 800; color: #4B5563;
  }
  .status-badge {
    font-size: 1.5cqw; font-weight: 900; padding: 0.7cqh 1.8cqw; border-radius: 16px;
    border: 2.5px solid #111111; box-shadow: 3px 3px 0px #111111;
  }
  .badge-error { background: #FEE2E2; color: #991B1B; }
  .badge-key { background: #FEF08A; color: #854D0E; }
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
    <span class="tip-badge">핵심 딜레마</span>
    <span>Pool vs Pull, 둘 다 똑같이 '풀'로 읽으셨나요?</span>
  </div>

  <div class="stage">
    <!-- Left Card: POOL -->
    <div class="compare-card" id="cardLeft">
      <div class="card-label label-tense">[uː] 장모음 · TENSE</div>
      <div class="word-text" style="color:#059669;">POOL</div>
      <div class="syl-pill tense">[puːl] · [푸 · 울]</div>
      <div class="meaning-text">수영장 🏊</div>
      <div class="status-badge badge-key" id="leftBadge">촛불 불듯 입술 둥글게 모으기!</div>
    </div>

    <!-- Right Card: PULL -->
    <div class="compare-card" id="cardRight">
      <div class="card-label label-lax">[ʊ] 단모음 · LAX</div>
      <div class="word-text" style="color:#D97706;">PULL</div>
      <div class="syl-pill lax">[pʊl] · [풀]</div>
      <div class="meaning-text">당기다 🚪</div>
      <div class="status-badge badge-error" id="rightBadge">둘 다 '풀'? ❌ 소리가 다릅니다</div>
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
      document.getElementById("rightBadge").innerText = "멍때리듯 입술 힘 툭 빼기!";
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
    background: #10B981; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1cqw; font-weight: 900;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 88cqw; display: flex; gap: 3.5cqw; align-items: center; justify-content: center; z-index: 5;
  }
  .visual-box {
    flex: 1.1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
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
  .rule-card.active-tense { border-color: #059669; background: #F0FDF4; }
  .rule-card.active-lax { border-color: #D97706; background: #FFFBEB; }
  .rule-header {
    display: flex; justify-content: space-between; align-items: center;
  }
  .rule-title {
    font-size: 1.8cqw; font-weight: 900; color: #111111;
  }
  .rule-badge {
    font-size: 1.1cqw; font-weight: 900; padding: 0.4cqh 1.2cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .rule-desc {
    font-size: 1.25cqw; font-weight: 700; color: #4B5563; line-height: 1.45;
  }
  .syl-example {
    margin-top: 0.5cqh; font-size: 1.2cqw; font-weight: 900; color: #111111;
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
    <span>길이가 아니라 '입술 모양과 근육 긴장도'가 결정합니다</span>
  </div>

  <div class="stage">
    <div class="visual-box" id="visualBox">
      <img src="assets/images/f02_vocal_tract_comparison.jpg" alt="구강 조음 단면도 비교" class="visual-img">
    </div>

    <div class="desc-box">
      <!-- Rule 1: Tense [u:] -->
      <div class="rule-card" id="cardTense">
        <div class="rule-header">
          <span class="rule-title" style="color:#059669;">① [uː] 촛불 불듯 입술 모으기</span>
          <span class="rule-badge" style="background:#D1FAE5; color:#065F46;">TENSE 긴장모음</span>
        </div>
        <div class="rule-desc">
          입술을 좁고 둥글게 앞으로 모아 2박자 호흡으로 울리는 소리.<br>
          <span class="syl-example">예: pool [puːl] ➔ <b>[푸 · 울]</b> · fool [fuːl] ➔ <b>[푸 · 울]</b></span>
        </div>
      </div>

      <!-- Rule 2: Lax [I] -->
      <div class="rule-card" id="cardLax">
        <div class="rule-header">
          <span class="rule-title" style="color:#D97706;">② [ʊ] 멍때리듯 힘 빼기</span>
          <span class="rule-badge" style="background:#FEF3C7; color:#92400E;">LAX 이완모음</span>
        </div>
        <div class="rule-desc">
          입술과 턱에 힘을 풀고 1박자로 가볍게 툭 떨어지는 소리.<br>
          <span class="syl-example">예: pull [pʊl] ➔ <b>[풀]</b> · full [fʊl] ➔ <b>[풀]</b></span>
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

    tl.from("#visualBox", { x: -30, opacity: 0, duration: 0.6, ease: "power2.out" }, 0.2);
    tl.from("#cardTense", { x: 30, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.4);
    tl.from("#cardLax", { x: 30, opacity: 0, duration: 0.5, ease: "power2.out" }, 0.6);

    tl.call(function() {
      document.getElementById("cardTense").classList.add("active-tense");
    }, null, 2.5);

    tl.call(function() {
      document.getElementById("cardTense").classList.remove("active-tense");
      document.getElementById("cardLax").classList.add("active-lax");
    }, null, 10.5);

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
    
    // Word 1: [uː] (Tense)
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

    // Word 2: [ʊ] (Lax)
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
  .drill-card.active-left { border-color: #059669; }
  .drill-card.active-right { border-color: #D97706; }
  .card-label {
    font-size: 1.25cqw; font-weight: 900; padding: 0.6cqh 1.8cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .label-tense { background: #D1FAE5; color: #065F46; }
  .label-lax { background: #FEF3C7; color: #92400E; }
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
  .syl-pill.tense { background: #A7F3D0; color: #064E3B; }
  .syl-pill.lax { background: #FEF08A; color: #78350F; }
  .kr-pill {
    background: #F3F4F6; border: 2px solid #111111; border-radius: 12px;
    padding: 0.4cqh 1.3cqw; font-size: 1.4cqw; font-weight: 800; color: #111111;
  }
  .action-tip {
    font-size: 1.25cqw; font-weight: 800; color: #374151; min-height: 2.5cqh;
  }
  .dots-row {
    display: flex; gap: 0.8cqw; margin-top: 0.8cqh;
  }
  .dot {
    width: 1.2cqw; height: 1.2cqw; border-radius: 50%;
    background: #E5E7EB; border: 2px solid #111111;
  }
  .dot.active-tense { background: #10B981; }
  .dot.active-lax { background: #F59E0B; }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 1;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="${frameId}" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span>${groupTitle}</span>
    <span class="tip-badge">${eyebrowTip || "6회 집중 듣기 드릴"}</span>
  </div>

  <div class="stage">
    <!-- Left Card: Tense [uː] -->
    <div id="cardLeft" class="drill-card active-left">
      <div class="card-label label-tense">[uː] 촛불 불듯 입술 모으기</div>
      <div id="w1_word" class="word-en">pool</div>
      <div class="ipa-box">
        <span id="w1_ipa" class="ipa-text">[puːl]</span>
        <span id="w1_syl" class="syl-pill tense">[푸 · 울]</span>
        <span id="w1_kr" class="kr-pill">수영장</span>
      </div>
      <div id="w1_tip" class="action-tip">촛불 불듯 입술을 둥글게 모으기!</div>
      <div class="dots-row">
        <div id="dot_l_1" class="dot"></div>
        <div id="dot_l_2" class="dot"></div>
        <div id="dot_l_3" class="dot"></div>
        <div id="dot_l_4" class="dot"></div>
        <div id="dot_l_5" class="dot"></div>
        <div id="dot_l_6" class="dot"></div>
      </div>
    </div>

    <!-- Right Card: Lax [ʊ] -->
    <div id="cardRight" class="drill-card">
      <div class="card-label label-lax">[ʊ] 멍때리듯 턱 힘 빼기</div>
      <div id="w2_word" class="word-en">pull</div>
      <div class="ipa-box">
        <span id="w2_ipa" class="ipa-text">[pʊl]</span>
        <span id="w2_syl" class="syl-pill lax">[풀]</span>
        <span id="w2_kr" class="kr-pill">당기다</span>
      </div>
      <div id="w2_tip" class="action-tip">멍때리듯 입술에 힘 툭 빼고 가볍게!</div>
      <div class="dots-row">
        <div id="dot_r_1" class="dot"></div>
        <div id="dot_r_2" class="dot"></div>
        <div id="dot_r_3" class="dot"></div>
        <div id="dot_r_4" class="dot"></div>
        <div id="dot_r_5" class="dot"></div>
        <div id="dot_r_6" class="dot"></div>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill">📢 [uː] 입술 모으기 vs [ʊ] 턱 힘 빼기 6회 반복 듣기</div>

  <!-- Audio elements -->
  ${audioTags.join("\n  ")}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var cardLeft = document.getElementById("cardLeft");
    var cardRight = document.getElementById("cardRight");
    var w1_word = document.getElementById("w1_word");
    var w1_ipa = document.getElementById("w1_ipa");
    var w1_syl = document.getElementById("w1_syl");
    var w1_kr = document.getElementById("w1_kr");
    var w1_tip = document.getElementById("w1_tip");
    var w2_word = document.getElementById("w2_word");
    var w2_ipa = document.getElementById("w2_ipa");
    var w2_syl = document.getElementById("w2_syl");
    var w2_kr = document.getElementById("w2_kr");
    var w2_tip = document.getElementById("w2_tip");
    var capPill = document.getElementById("capPill");

    function setPair(p, side) {
      w1_word.textContent = p.w1.word;
      w1_ipa.textContent = p.w1.ipa;
      w1_syl.textContent = "[" + p.w1.syl + "]";
      w1_kr.textContent = p.w1.kr;
      w1_tip.textContent = p.w1.tip;

      w2_word.textContent = p.w2.word;
      w2_ipa.textContent = p.w2.ipa;
      w2_syl.textContent = "[" + p.w2.syl + "]";
      w2_kr.textContent = p.w2.kr;
      w2_tip.textContent = p.w2.tip;

      cardLeft.className = "drill-card";
      cardRight.className = "drill-card";

      if (side === "left") {
        cardLeft.className = "drill-card active active-left";
        capPill.innerText = "📢 [uː] 촛불 불듯 입술 모으기! " + p.w1.word + " [" + p.w1.syl + "]";
      } else {
        cardRight.className = "drill-card active active-right";
        capPill.innerText = "📢 [ʊ] 멍때리듯 입술 힘 툭 빼기! " + p.w2.word + " [" + p.w2.syl + "]";
      }

      for (var i = 1; i <= 6; i++) {
        document.getElementById("dot_l_" + i).className = "dot";
        document.getElementById("dot_r_" + i).className = "dot";
      }
    }

    function setDot(side, dotIdx) {
      var prefix = side === "left" ? "dot_l_" : "dot_r_";
      var activeClass = side === "left" ? "dot active-tense" : "dot active-lax";
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
    const durM = getDur(d.m);
    const durF = getDur(d.f);

    animEvents.push({
      time: curTime,
      type: "show_dialogue",
      item: d
    });

    // 1st play: Male
    audioTags.push(`<audio id="dial_${d.id}_m" src="assets/voice/${d.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${durM.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "pulse_words" });
    curTime += durM + 0.8;

    // 2nd play: Female
    audioTags.push(`<audio id="dial_${d.id}_f" src="assets/voice/${d.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${durF.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "pulse_words" });
    curTime += durF + 1.2;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "show_dialogue") {
      animScriptCode += `  tl.call(function() {
    showDialogue(${JSON.stringify(e.item)});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "pulse_words") {
      animScriptCode += `  tl.fromTo(".hl-tense, .hl-lax", { scale: 1.18 }, { scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, ${e.time.toFixed(2)});\n`;
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
    object-fit: cover; opacity: 0.35; z-index: 1; filter: saturate(1.2);
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
    display: inline-block; background: #FEF3C7; border: 2px solid #111111;
    padding: 0.5cqh 1.8cqw; border-radius: 999px; font-size: 1.25cqw; font-weight: 900; color: #92400E;
  }
  .sentence-en {
    font-family: 'Archivo Black', sans-serif; font-size: 3.6cqw; line-height: 1.35;
    color: #111111;
  }
  .hl-tense {
    color: #065F46; border-bottom: 5px solid #059669; padding-bottom: 2px;
    display: inline-block; background: #D1FAE5; padding-left: 6px; padding-right: 6px; border-radius: 6px;
  }
  .hl-lax {
    color: #92400E; border-bottom: 5px solid #D97706; padding-bottom: 2px;
    display: inline-block; background: #FEF3C7; padding-left: 6px; padding-right: 6px; border-radius: 6px;
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
  <video id="bgVideo" class="bg-video" src="assets/videos/f07_dialogue_ambience.mp4" autoplay loop muted data-start="0" data-duration="${totalDur.toFixed(2)}" data-hf-media-start-basis="local"></video>

  <div class="eyebrow-pill">
    <span>☕ 실전 짝단어 문장 리스닝 (7문장 2회 반복 훈련)</span>
  </div>

  <div class="stage">
    <div class="dialogue-card" id="dialCard">
      <div id="dialTag" class="tag-pill">pull vs push</div>
      <div id="dialEn" class="sentence-en"><span class="hl-lax">Pull</span> the door, don't <span class="hl-lax">push</span> it.</div>
      <div id="dialKr" class="sentence-kr">문을 당기세요, 밀지 말고요.</div>
      <div id="dialSylTip" class="syl-tip-box">💡 pull [풀] · push [푸쉬] ➔ 둘 다 턱에 힘 빼고 가볍게!</div>
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

// 8. Frame 08: Shuffle Drill with SYLLABLE NOTATION
function generateF08() {
  const allWordKeys = Object.keys(DICTIONARY);
  const quizItems = [];
  allWordKeys.forEach(pKey => {
    const p = DICTIONARY[pKey];
    quizItems.push({ ...p.w1, type: "tense", label: "[uː] 촛불 입술 모으기" });
    quizItems.push({ ...p.w2, type: "lax", label: "[ʊ] 멍때리듯 턱 힘 빼기" });
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
    font-size: 2cqw; font-weight: 900; padding: 0.8cqh 2.2cqw; border-radius: 999px;
    border: 2.5px solid #111111;
  }
  .badge-tense { background: #D1FAE5; color: #065F46; }
  .badge-lax { background: #FEF3C7; color: #92400E; }
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
      if (w.type === "tense") {
        quizBadge.textContent = w.label;
        quizBadge.className = "quiz-badge badge-tense";
      } else {
        quizBadge.textContent = w.label;
        quizBadge.className = "quiz-badge badge-lax";
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

// 9. Frame 09: Summary Cheat Sheet with SYLLABLE BREAKDOWN
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
  .header-tense { background: #D1FAE5; color: #065F46; }
  .header-lax { background: #FEF3C7; color: #92400E; }
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
    font-weight: 900; color: #065F46; background: #E6F4EA; padding: 0.2cqh 0.8cqw;
    border-radius: 6px; font-size: 1.15cqw;
  }
  .syl-tag.lax { color: #92400E; background: #FEF3C7; }
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
    <!-- Tense [uː] -->
    <div class="summary-col">
      <div class="col-header header-tense">
        <div class="col-title">[uː] TENSE 긴장모음</div>
        <div class="col-sub">촛불 불듯 입술 모아 2박자 호흡</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">pool (수영장)</span><span class="syl-tag">[puːl] [푸 · 울]</span></div>
        <div class="word-row"><span class="word-name">fool (바보)</span><span class="syl-tag">[fuːl] [푸 · 울]</span></div>
        <div class="word-row"><span class="word-name">Luke (루크)</span><span class="syl-tag">[luːk] [루 · 크]</span></div>
        <div class="word-row"><span class="word-name">suit (정장)</span><span class="syl-tag">[suːt] [수 · 트]</span></div>
        <div class="word-row"><span class="word-name">food (음식)</span><span class="syl-tag">[fuːd] [푸 · 드]</span></div>
      </div>
    </div>

    <!-- Lax [ʊ] -->
    <div class="summary-col">
      <div class="col-header header-lax">
        <div class="col-title">[ʊ] LAX 이완모음</div>
        <div class="col-sub">멍때리듯 입술·턱 힘 빼고 1박자</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">pull (당기다)</span><span class="syl-tag lax">[pʊl] [풀]</span></div>
        <div class="word-row"><span class="word-name">full (배부른)</span><span class="syl-tag lax">[fʊl] [풀]</span></div>
        <div class="word-row"><span class="word-name">look (보다)</span><span class="syl-tag lax">[lʊk] [룩]</span></div>
        <div class="word-row"><span class="word-name">soot (그을음)</span><span class="syl-tag lax">[sʊt] [숫]</span></div>
        <div class="word-row"><span class="word-name">foot (발)</span><span class="syl-tag lax">[fʊt] [풋]</span></div>
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

// 10. Frame 10: Encore & End Screen with SYLLABLE BREAKDOWN
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
  .label-tense { background: #D1FAE5; color: #065F46; }
  .label-lax { background: #FEF3C7; color: #92400E; }
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
      <div class="card-label label-tense">[uː] TENSE</div>
      <div id="encW1" class="word-text">pool</div>
      <div id="encIpa1" class="ipa-text">[puːl] · [푸 · 울] 수영장</div>
    </div>
    <div class="encore-card">
      <div class="card-label label-lax">[ʊ] LAX</div>
      <div id="encW2" class="word-text">pull</div>
      <div id="encIpa2" class="ipa-text">[pʊl] · [풀] 당기다</div>
    </div>
  </div>

  <div id="endOverlay" class="end-screen-overlay" data-layout-allow-overlap>
    <div class="end-header">오늘도 20쌍 완주를 축하합니다! 👏</div>
    <div class="end-boxes">
      <div class="guide-box">
        <span>🎬 추천 영상</span>
        <span style="font-size: 1cqw;">(EP24 Sheep vs Ship)</span>
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
console.log("Generating 10 frames for EP25 with word highlights & syllable notation...");

const f01 = generateF01();
fs.writeFileSync(path.join(outFramesDir, "01-hook.html"), f01.html, "utf8");

const f02 = generateF02();
fs.writeFileSync(path.join(outFramesDir, "02-principle.html"), f02.html, "utf8");

const f03 = generateGroupFrame("03-group1", 1, "Group 1: 핵심 명사 & 동사 5쌍", ["p01", "p02", "p03", "p04", "p05"], "촛불 입술 모으기 vs 멍때리기 6회 드릴");
fs.writeFileSync(path.join(outFramesDir, "03-group1.html"), f03.html, "utf8");

const f04 = generateGroupFrame("04-group2", 2, "Group 2: 조동사 & 과거형 5쌍", ["p06", "p07", "p08", "p09", "p10"], "조동사·과거형 6회 집중 드릴");
fs.writeFileSync(path.join(outFramesDir, "04-group2.html"), f04.html, "utf8");

const f05 = generateGroupFrame("05-group3", 3, "Group 3: 불규칙 과거 & 동작 5쌍", ["p11", "p12", "p13", "p14", "p15"], "불규칙 동사 6회 집중 드릴");
fs.writeFileSync(path.join(outFramesDir, "05-group3.html"), f05.html, "utf8");

const f06 = generateGroupFrame("06-group4", 4, "Group 4: 일상 최다 혼동 실생활 5쌍", ["p16", "p17", "p18", "p19", "p20"], "일상 최다 빈출 6회 집중 드릴");
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
  { id: "01-hook", file: "01-hook.html", duration: f01.duration, title: "Pool vs Pull, 둘 다 똑같이 '풀'?" },
  { id: "02-principle", file: "02-principle.html", duration: f02.duration, title: "[uː] vs [ʊ] 입술 모양 1초 차이 조음 원리" },
  { id: "03-group1", file: "03-group1.html", duration: f03.duration, title: "Group 1: 핵심 명사 & 동사 5쌍 (pool vs pull, fool vs full...)" },
  { id: "04-group2", file: "04-group2.html", duration: f04.duration, title: "Group 2: 조동사 & 과거형 5쌍 (cooed vs could, shooed vs should...)" },
  { id: "05-group3", file: "05-group3.html", duration: f05.duration, title: "Group 3: 불규칙 과거 & 동작 5쌍 (shoot vs shook, toot vs took...)" },
  { id: "06-group4", file: "06-group4.html", duration: f06.duration, title: "Group 4: 일상 최다 혼동 실생활 5쌍 (food vs foot, boot vs book...)" },
  { id: "07-dialogue", file: "07-dialogue.html", duration: f07.duration, title: "실전 짝단어 문장 대화 7문장" },
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

console.log(`\n=== EP25 Timeline Assembled ===`);
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
console.log("✓ Successfully generated 10 frame HTML files and root index.html with syllable notation & dialogue highlights!");
