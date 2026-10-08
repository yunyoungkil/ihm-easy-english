import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep24-long-short-i');
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

// 20 Minimal Pairs Dictionary
const DICTIONARY = {
  // Group 1
  p01: {
    w1: { id: "w01", word: "sheep", ipa: "[ʃiːp]", kr: "양", tip: "웃듯이 입꼬리를 팽팽하게!", sound: "이-", m: "m_w01_sheep", f: "f_w01_sheep" },
    w2: { id: "w02", word: "ship", ipa: "[ʃɪp]", kr: "배", tip: "멍때리듯 입에 힘을 툭 빼고 짧게!", sound: "이/에", m: "m_w02_ship", f: "f_w02_ship" }
  },
  p02: {
    w1: { id: "w03", word: "feet", ipa: "[fiːt]", kr: "발들", tip: "입꼬리를 당기며 팽팽하게 '피-트'", sound: "이-", m: "m_w03_feet", f: "f_w03_feet" },
    w2: { id: "w04", word: "fit", ipa: "[fɪt]", kr: "딱 맞는", tip: "힘 빼고 가볍게 툭 '핏'", sound: "이/에", m: "m_w04_fit", f: "f_w04_fit" }
  },
  p03: {
    w1: { id: "w05", word: "seat", ipa: "[siːt]", kr: "좌석", tip: "입꼬리를 길게 당기며 '시-트'", sound: "이-", m: "m_w05_seat", f: "f_w05_seat" },
    w2: { id: "w06", word: "sit", ipa: "[sɪt]", kr: "앉다", tip: "턱에 힘을 풀고 가볍게 '싯'", sound: "이/에", m: "m_w06_sit", f: "f_w06_sit" }
  },
  p04: {
    w1: { id: "w07", word: "heel", ipa: "[hiːl]", kr: "발뒤꿈치", tip: "입꼬리를 팽팽하게 '히-얼'", sound: "이-", m: "m_w07_heel", f: "f_w07_heel" },
    w2: { id: "w08", word: "hill", ipa: "[hɪl]", kr: "언덕", tip: "입술에 힘 풀고 '힐'", sound: "이/에", m: "m_w08_hill", f: "f_w08_hill" }
  },
  p05: {
    w1: { id: "w09", word: "peel", ipa: "[piːl]", kr: "껍질을 벗기다", tip: "입꼬리를 시원하게 '피-얼'", sound: "이-", m: "m_w09_peel", f: "f_w09_peel" },
    w2: { id: "w10", word: "pill", ipa: "[pɪl]", kr: "알약", tip: "힘 빼고 툭 떨어뜨리며 '필'", sound: "이/에", m: "m_w10_pill", f: "f_w10_pill" }
  },

  // Group 2
  p06: {
    w1: { id: "w11", word: "meat", ipa: "[miːt]", kr: "고기", tip: "입꼬리를 팽팽하게 당겨 '미-트'", sound: "이-", m: "m_w11_meat", f: "f_w11_meat" },
    w2: { id: "w12", word: "mitt", ipa: "[mɪt]", kr: "글러브/장갑", tip: "입술 힘 풀고 툭 '밋'", sound: "이/에", m: "m_w12_mitt", f: "f_w12_mitt" }
  },
  p07: {
    w1: { id: "w13", word: "peach", ipa: "[piːtʃ]", kr: "복숭아", tip: "입꼬리를 활짝 당기며 '피-치'", sound: "이-", m: "m_w13_peach", f: "f_w13_peach" },
    w2: { id: "w14", word: "pitch", ipa: "[pɪtʃ]", kr: "던지다/음높이", tip: "힘 빼고 짧게 끊어 '핏치'", sound: "이/에", m: "m_w14_pitch", f: "f_w14_pitch" }
  },
  p08: {
    w1: { id: "w15", word: "beat", ipa: "[biːt]", kr: "때리다/비트", tip: "입꼬리를 단단히 당겨 '비-트'", sound: "이-", m: "m_w15_beat", f: "f_w15_beat" },
    w2: { id: "w16", word: "bit", ipa: "[bɪt]", kr: "조각/약간", tip: "입에 힘 빼고 가볍게 '빗'", sound: "이/에", m: "m_w16_bit", f: "f_w16_bit" }
  },
  p09: {
    w1: { id: "w17", word: "heat", ipa: "[hiːt]", kr: "열기/더위", tip: "입꼬리를 팽팽히 '히-트'", sound: "이-", m: "m_w17_heat", f: "f_w17_heat" },
    w2: { id: "w18", word: "hit", ipa: "[hɪt]", kr: "치다/타격", tip: "힘 빼고 툭 '힛'", sound: "이/에", m: "m_w18_hit", f: "f_w18_hit" }
  },
  p10: {
    w1: { id: "w19", word: "cheap", ipa: "[tʃiːp]", kr: "저렴한/싼", tip: "입꼬리를 옆으로 '치-프'", sound: "이-", m: "m_w19_cheap", f: "f_w19_cheap" },
    w2: { id: "w20", word: "chip", ipa: "[tʃɪp]", kr: "조각/칩", tip: "입술 힘 풀고 툭 '칩'", sound: "이/에", m: "m_w20_chip", f: "f_w20_chip" }
  },

  // Group 3
  p11: {
    w1: { id: "w21", word: "sleep", ipa: "[sliːp]", kr: "자다/수면", tip: "입꼬리 당겨 편안하게 '슬리-프'", sound: "이-", m: "m_w21_sleep", f: "f_w21_sleep" },
    w2: { id: "w22", word: "slip", ipa: "[slɪp]", kr: "미끄러지다", tip: "힘 빼고 가볍게 툭 '슬립'", sound: "이/에", m: "m_w22_slip", f: "f_w22_slip" }
  },
  p12: {
    w1: { id: "w23", word: "feel", ipa: "[fiːl]", kr: "느끼다/기분", tip: "입꼬리를 팽팽하게 '피-얼'", sound: "이-", m: "m_w23_feel", f: "f_w23_feel" },
    w2: { id: "w24", word: "fill", ipa: "[fɪl]", kr: "채우다", tip: "입술 힘 풀고 '필'", sound: "이/에", m: "m_w24_fill", f: "f_w24_fill" }
  },
  p13: {
    w1: { id: "w25", word: "reach", ipa: "[riːtʃ]", kr: "도달하다/닿다", tip: "입꼬리를 길게 '리-치'", sound: "이-", m: "m_w25_reach", f: "f_w25_reach" },
    w2: { id: "w26", word: "rich", ipa: "[rɪtʃ]", kr: "부유한", tip: "입에 힘 빼고 '릿치'", sound: "이/에", m: "m_w26_rich", f: "f_w26_rich" }
  },
  p14: {
    w1: { id: "w27", word: "leave", ipa: "[liːv]", kr: "떠나다/남기다", tip: "입꼬리를 팽팽하게 '리-브'", sound: "이-", m: "m_w27_leave", f: "f_w27_leave" },
    w2: { id: "w28", word: "live", ipa: "[lɪv]", kr: "살다/거주하다", tip: "힘 빼고 툭 '립'", sound: "이/에", m: "m_w28_live", f: "f_w28_live" }
  },
  p15: {
    w1: { id: "w29", word: "seek", ipa: "[siːk]", kr: "찾다/추구하다", tip: "입꼬리를 팽팽히 '시-크'", sound: "이-", m: "m_w29_seek", f: "f_w29_seek" },
    w2: { id: "w30", word: "sick", ipa: "[sɪk]", kr: "아픈/병든", tip: "입술 힘 풀고 '식'", sound: "이/에", m: "m_w30_sick", f: "f_w30_sick" }
  },

  // Group 4
  p16: {
    w1: { id: "w31", word: "lead", ipa: "[liːd]", kr: "이끌다/선도하다", tip: "입꼬리 당겨 시원하게 '리-드'", sound: "이-", m: "m_w31_lead", f: "f_w31_lead" },
    w2: { id: "w32", word: "lid", ipa: "[lɪd]", kr: "뚜껑", tip: "힘 빼고 툭 '릿'", sound: "이/에", m: "m_w32_lid", f: "f_w32_lid" }
  },
  p17: {
    w1: { id: "w33", word: "teen", ipa: "[tiːn]", kr: "십대", tip: "입꼬리를 팽팽히 '티-인'", sound: "이-", m: "m_w33_teen", f: "f_w33_teen" },
    w2: { id: "w34", word: "tin", ipa: "[tɪn]", kr: "양철/캔", tip: "입술 힘 풀고 '틴'", sound: "이/에", m: "m_w34_tin", f: "f_w34_tin" }
  },
  p18: {
    w1: { id: "w35", word: "deed", ipa: "[diːd]", kr: "행위/업적", tip: "입꼬리를 팽팽하게 '디-드'", sound: "이-", m: "m_w35_deed", f: "f_w35_deed" },
    w2: { id: "w36", word: "did", ipa: "[dɪd]", kr: "했다 (do 과거)", tip: "힘 빼고 가볍게 '딧'", sound: "이/에", m: "m_w36_did", f: "f_w36_did" }
  },
  p19: {
    w1: { id: "w37", word: "steel", ipa: "[stiːl]", kr: "강철", tip: "입꼬리를 단단히 '스티-얼'", sound: "이-", m: "m_w37_steel", f: "f_w37_steel" },
    w2: { id: "w38", word: "still", ipa: "[stɪl]", kr: "여전히/가만히", tip: "입술 힘 풀고 '스틸'", sound: "이/에", m: "m_w38_still", f: "f_w38_still" }
  },
  p20: {
    w1: { id: "w39", word: "beach", ipa: "[biːtʃ]", kr: "해변", tip: "입꼬리를 환하게 '비-치' (주의!)", sound: "이-", m: "m_w39_beach", f: "f_w39_beach" },
    w2: { id: "w40", word: "bitch", ipa: "[bɪtʃ]", kr: "암캐 (비속어 주의)", tip: "⚠️ 욕으로 오해받지 않게 짧고 툭!", sound: "이/에", m: "m_w40_bitch", f: "f_w40_bitch" }
  }
};

const DIALOGUES = [
  {
    id: "dial_01",
    en: "Please take a seat and sit down.",
    kr: "좌석에 앉아 주세요.",
    audio: "dial_01_seat_sit",
    pair: ["seat", "sit"],
    tips: "seat [siːt] ➔ 입꼬리 당김 | sit [sɪt] ➔ 힘 빼고 툭"
  },
  {
    id: "dial_02",
    en: "I feel like I should fill the cup.",
    kr: "컵을 채워야 할 것 같아요.",
    audio: "dial_02_feel_fill",
    pair: ["feel", "fill"],
    tips: "feel [fiːl] ➔ 팽팽하게 | fill [fɪl] ➔ 턱 힘 빼기"
  },
  {
    id: "dial_03",
    en: "Did you sleep well, or did you slip?",
    kr: "잘 잤어요, 아니면 미끄러졌나요?",
    audio: "dial_03_sleep_slip",
    pair: ["sleep", "slip"],
    tips: "sleep [sliːp] ➔ 입꼬리 팽팽 | slip [slɪp] ➔ 가볍게 툭"
  },
  {
    id: "dial_04",
    en: "We can reach that rich neighborhood.",
    kr: "우리는 그 부유한 동네에 갈 수 있어요.",
    audio: "dial_04_reach_rich",
    pair: ["reach", "rich"],
    tips: "reach [riːtʃ] ➔ 입꼬리 당김 | rich [rɪtʃ] ➔ 힘 풀고 짧게"
  },
  {
    id: "dial_05",
    en: "Don't leave the house where you live.",
    kr: "당신이 살고 있는 집을 떠나지 마세요.",
    audio: "dial_05_leave_live",
    pair: ["leave", "live"],
    tips: "leave [liːv] ➔ 팽팽하게 | live [lɪv] ➔ 멍때리듯 가볍게"
  },
  {
    id: "dial_06",
    en: "I ate some meat with a baseball mitt.",
    kr: "야구 글러브를 끼고 고기를 먹었어요.",
    audio: "dial_06_meat_mitt",
    pair: ["meat", "mitt"],
    tips: "meat [miːt] ➔ 팽팽한 '미-트' | mitt [mɪt] ➔ 짧은 '밋'"
  },
  {
    id: "dial_07",
    en: "Let's walk along the beach together.",
    kr: "우리 함께 해변을 따라 걸어요.",
    audio: "dial_07_beach",
    pair: ["beach"],
    tips: "beach [biːtʃ] ➔ 입꼬리 활짝 당겨야 오해 없음!"
  }
];

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

// -------------------------------------------------------------
// Frame 1: Hook (01-hook.html)
// -------------------------------------------------------------
function genFrame01() {
  const dur = getDur('01_f01_hook');
  const whisperCode = buildWhisperCalls('01_f01_hook');

  return `<template>
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
    width: 86cqw; display: flex; gap: 3cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .compare-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 4.5cqh 3cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.2cqh;
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
  .meaning-text {
    font-size: 2.2cqw; font-weight: 800; color: #4B5563;
  }
  .status-badge {
    font-size: 1.6cqw; font-weight: 900; padding: 0.8cqh 2cqw; border-radius: 16px;
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
    <span>Sheep vs Ship, 둘 다 똑같이 '쉽'으로 읽으셨나요?</span>
  </div>

  <div class="stage">
    <!-- Left Card: SHEEP -->
    <div class="compare-card" id="cardLeft">
      <div class="card-label label-tense">[iː] 장모음 · TENSE</div>
      <div class="word-text" style="color:#059669;">SHEEP</div>
      <div class="meaning-text">양 🐑 · [ʃiːp]</div>
      <div class="status-badge badge-key" id="leftBadge">웃듯이 입꼬리 팽팽하게!</div>
    </div>

    <!-- Right Card: SHIP -->
    <div class="compare-card" id="cardRight">
      <div class="card-label label-lax">[ɪ] 단모음 · LAX</div>
      <div class="word-text" style="color:#D97706;">SHIP</div>
      <div class="meaning-text">배 🚢 · [ʃɪp]</div>
      <div class="status-badge badge-error" id="rightBadge">둘 다 '쉽'? ❌ 소리가 다릅니다</div>
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
      document.getElementById("rightBadge").innerText = "멍때리듯 입에 힘 툭 빼기!";
    }, null, 14.5);

${whisperCode}
    tl.call(function() { cap(""); }, null, ${dur.toFixed(2)});

    window.__timelines = window.__timelines || {};
    window.__timelines["01-hook"] = tl;
    tl.seek(0);
  })();
</script>
</template>`;
}

// -------------------------------------------------------------
// Frame 2: Principle (02-principle.html)
// -------------------------------------------------------------
function genFrame02() {
  const dur = getDur('02_f02_principle');
  const whisperCode = buildWhisperCalls('02_f02_principle');

  return `<template>
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
    padding: 0.4cqh 1.2cqw; border-radius: 999px; font-size: 1.1cqw; font-weight: 900;
    border: 1.5px solid #111111;
  }
  .rule-desc {
    font-size: 1.3cqw; font-weight: 700; color: #4B5563; line-height: 1.5;
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
    <span>길이가 아니라 '입술과 턱의 긴장도'가 결정합니다</span>
  </div>

  <div class="stage">
    <div class="visual-box" id="visualBox">
      <img src="assets/images/f02_vocal_tract_comparison.jpg" alt="구강 조음 단면도 비교" class="visual-img">
    </div>

    <div class="desc-box">
      <!-- Rule 1: Tense [i:] -->
      <div class="rule-card" id="cardTense">
        <div class="rule-header">
          <span class="rule-title" style="color:#059669;">① [iː] 웃듯이 입꼬리 당김</span>
          <span class="rule-badge" style="background:#D1FAE5; color:#065F46;">TENSE 긴장모음</span>
        </div>
        <div class="rule-desc">
          입꼬리를 양옆으로 팽팽하게 당기며 내는 소리입니다.<br>
          소리에 단단한 텐션이 들어가 선명하게 울립니다.
        </div>
      </div>

      <!-- Rule 2: Lax [I] -->
      <div class="rule-card" id="cardLax">
        <div class="rule-header">
          <span class="rule-title" style="color:#D97706;">② [ɪ] 멍때리듯 힘 빼기</span>
          <span class="rule-badge" style="background:#FEF3C7; color:#92400E;">LAX 이완모음</span>
        </div>
        <div class="rule-desc">
          턱과 입술에 힘을 툭 풀고 내는 소리입니다.<br>
          살짝 '에' 소리가 섞인 듯 가볍고 편안하게 흘러나옵니다.
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
</template>`;
}

// -------------------------------------------------------------
// Generator for Drill Frames (F03, F04, F05, F06)
// -------------------------------------------------------------
function genDrillFrame(frameId, groupTitle, pairKeys, eyebrowTip) {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  pairKeys.forEach((pKey, pIdx) => {
    const pair = DICTIONARY[pKey];

    // Word 1: [i:]
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

    audioTags.push(`<audio id="a_${w1.id}_0" src="assets/voice/${w1.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 1 });
    curTime += w1_m_dur + 0.65;

    audioTags.push(`<audio id="a_${w1.id}_1" src="assets/voice/${w1.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 2 });
    curTime += w1_f_dur + 0.65;

    audioTags.push(`<audio id="a_${w1.id}_2" src="assets/voice/${w1.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w1_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "left", dotIdx: 3 });
    curTime += w1_m_dur + 0.9;

    // Word 2: [I]
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
    curTime += w2_m_dur + 0.65;

    audioTags.push(`<audio id="a_${w2.id}_1" src="assets/voice/${w2.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "right", dotIdx: 2 });
    curTime += w2_f_dur + 0.65;

    audioTags.push(`<audio id="a_${w2.id}_2" src="assets/voice/${w2.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${w2_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", target: "right", dotIdx: 3 });
    curTime += w2_m_dur + 1.1;
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
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.2cqh;
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
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; letter-spacing: 0.02em;
    color: #111111; line-height: 1.1;
  }
  .meaning-badge {
    font-size: 2cqw; font-weight: 900; color: #111111; background: #FAF7F2;
    border: 2px solid #111111; border-radius: 14px; padding: 0.6cqh 2cqw;
    box-shadow: 2px 2px 0px #111111;
  }
  .tip-pill {
    font-size: 1.25cqw; font-weight: 800; color: #4B5563;
  }
  .repeat-dots {
    display: flex; gap: 0.8cqw; justify-content: center; align-items: center; margin-top: 0.5cqh;
  }
  .repeat-dot {
    width: 1.3cqw; height: 1.3cqw; border-radius: 50%; background: #E5E0D8;
    border: 2px solid #111111;
  }
  .repeat-dot.active {
    background: #F59E0B; box-shadow: 2px 2px 0px #111111;
  }
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
    <span class="tip-badge">${groupTitle}</span>
    <span>${eyebrowTip}</span>
  </div>

  <div class="stage">
    <!-- Left: Tense [i:] -->
    <div class="drill-card" id="cardLeft">
      <div class="card-label label-tense">[iː] TENSE · 입꼬리 당김</div>
      <div class="word-text" id="leftWord" style="color:#059669;">-</div>
      <div class="meaning-badge" id="leftMeaning">-</div>
      <div class="tip-pill" id="leftTip">-</div>
      <div class="repeat-dots">
        <div class="repeat-dot" id="dot_l_1"></div>
        <div class="repeat-dot" id="dot_l_2"></div>
        <div class="repeat-dot" id="dot_l_3"></div>
      </div>
    </div>

    <!-- Right: Lax [I] -->
    <div class="drill-card" id="cardRight">
      <div class="card-label label-lax">[ɪ] LAX · 입에 힘 뺌</div>
      <div class="word-text" id="rightWord" style="color:#D97706;">-</div>
      <div class="meaning-badge" id="rightMeaning">-</div>
      <div class="tip-pill" id="rightTip">-</div>
      <div class="repeat-dots">
        <div class="repeat-dot" id="dot_r_1"></div>
        <div class="repeat-dot" id="dot_r_2"></div>
        <div class="repeat-dot" id="dot_r_3"></div>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill">남녀 원어민 3회 반복 듣기 드릴 (●●● 순차 점등)</div>

  ${audioTags.join('\n  ')}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    function setPair(p, activeSide) {
      document.getElementById("leftWord").innerText = p.w1.word;
      document.getElementById("leftMeaning").innerText = p.w1.kr + " · " + p.w1.ipa;
      document.getElementById("leftTip").innerText = p.w1.tip;

      document.getElementById("rightWord").innerText = p.w2.word;
      document.getElementById("rightMeaning").innerText = p.w2.kr + " · " + p.w2.ipa;
      document.getElementById("rightTip").innerText = p.w2.tip;

      var cardL = document.getElementById("cardLeft");
      var cardR = document.getElementById("cardRight");
      cardL.classList.remove("active", "active-left");
      cardR.classList.remove("active", "active-right");

      if (activeSide === "left") {
        cardL.classList.add("active", "active-left");
        document.getElementById("capPill").innerText = "📢 [iː] 웃듯이 입꼬리 팽팽하게! " + p.w1.word;
      } else {
        cardR.classList.add("active", "active-right");
        document.getElementById("capPill").innerText = "📢 [ɪ] 멍때리듯 입에 힘 빼고 툭! " + p.w2.word;
      }

      for (var i = 1; i <= 3; i++) {
        document.getElementById("dot_l_" + i).classList.remove("active");
        document.getElementById("dot_r_" + i).classList.remove("active");
      }
    }

    function setDot(target, dotIdx) {
      var prefix = target === "left" ? "dot_l_" : "dot_r_";
      for (var i = 1; i <= 3; i++) {
        var d = document.getElementById(prefix + i);
        if (i <= dotIdx) d.classList.add("active");
        else d.classList.remove("active");
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

// -------------------------------------------------------------
// Frame 7: Dialogue (07-dialogue.html)
// -------------------------------------------------------------
function genFrame07() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  DIALOGUES.forEach((d, idx) => {
    const dur = getDur(d.audio);

    for (let rep = 1; rep <= 3; rep++) {
      audioTags.push(`<audio id="a_${d.id}_${rep}" src="assets/voice/${d.audio}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);
      animEvents.push({
        time: curTime,
        dIdx: idx,
        rep: rep,
        data: d
      });
      curTime += dur + (rep === 3 ? 1.4 : 0.85);
    }
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    animScriptCode += `  tl.call(function() {
    setDialogue(${JSON.stringify(e.data)}, ${e.rep});
  }, null, ${e.time.toFixed(2)});\n`;
  });

  return {
    duration: totalDur,
    html: `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #1E232A; color: #FFFFFF; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .video-bg {
    position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.45;
    filter: saturate(1.2) contrast(1.1);
  }
  .overlay-vignette {
    position: absolute; inset: 0;
    background: radial-gradient(circle at center, rgba(14, 18, 27, 0.4) 0%, rgba(14, 18, 27, 0.85) 100%);
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
    width: 82cqw; display: flex; flex-direction: column; align-items: center; z-index: 5;
  }
  .dialogue-card {
    background: rgba(255, 255, 255, 0.96); color: #111111; border: 4px solid #111111;
    box-shadow: 8px 8px 0px #111111; border-radius: 28px; padding: 5cqh 4cqw;
    width: 100%; text-align: center; display: flex; flex-direction: column; gap: 2.5cqh;
  }
  .sentence-en {
    font-size: 3.2cqw; font-weight: 900; line-height: 1.35; letter-spacing: -0.01em;
  }
  .sentence-kr {
    font-size: 2cqw; font-weight: 800; color: #4B5563;
  }
  .key-tip {
    font-size: 1.4cqw; font-weight: 900; color: #1E232A; background: #FEF08A;
    border: 2px solid #111111; border-radius: 14px; padding: 0.8cqh 2cqw;
    display: inline-block; box-shadow: 3px 3px 0px #111111;
  }
  .repeat-dots {
    display: flex; gap: 0.8cqw; justify-content: center; align-items: center; margin-top: 1cqh;
  }
  .repeat-dot {
    width: 1.3cqw; height: 1.3cqw; border-radius: 50%; background: #E5E0D8;
    border: 2px solid #111111;
  }
  .repeat-dot.active {
    background: #F59E0B; box-shadow: 2px 2px 0px #111111;
  }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 1;
  }
  .hl-tense { color: #059669; border-bottom: 5px solid #059669; }
  .hl-lax { color: #B45309; border-bottom: 5px solid #B45309; }
  audio { display: none; }
</style>

<div id="root" data-composition-id="07-dialogue" data-width="1920" data-height="1080">
  <video id="cafeVideo" class="video-bg" src="assets/videos/f07_coffee_ambience.mp4" autoplay loop muted playsinline data-start="0" data-duration="${totalDur.toFixed(2)}" data-hf-media-start-basis="local"></video>
  <div class="overlay-vignette"></div>

  <div class="eyebrow-pill">
    <span class="tip-badge">실전 문장 대화</span>
    <span>한 문장 속에 담긴 짝단어 동시 구별 훈련 (3회 청취)</span>
  </div>

  <div class="stage">
    <div class="dialogue-card" id="dialogueCard">
      <div class="sentence-en" id="sentenceEn">-</div>
      <div class="sentence-kr" id="sentenceKr">-</div>
      <div>
        <span class="key-tip" id="keyTip">-</span>
      </div>
      <div class="repeat-dots">
        <div class="repeat-dot" id="dot_1"></div>
        <div class="repeat-dot" id="dot_2"></div>
        <div class="repeat-dot" id="dot_3"></div>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill">실전 카페 대화 7문장 집중 청취</div>

  ${audioTags.join('\n  ')}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    function setDialogue(d, rep) {
      var formattedEn = d.en;
      if (d.pair && d.pair.length >= 2) {
        var reTense = new RegExp("\\\\b(" + d.pair[0] + ")\\\\b", "gi");
        var reLax = new RegExp("\\\\b(" + d.pair[1] + ")\\\\b", "gi");
        formattedEn = formattedEn.replace(reTense, '<span class="hl-tense">$1</span>');
        formattedEn = formattedEn.replace(reLax, '<span class="hl-lax">$1</span>');
      } else if (d.pair && d.pair.length === 1) {
        var reTense = new RegExp("\\\\b(" + d.pair[0] + ")\\\\b", "gi");
        formattedEn = formattedEn.replace(reTense, '<span class="hl-tense">$1</span>');
      }

      document.getElementById("sentenceEn").innerHTML = formattedEn;
      document.getElementById("sentenceKr").innerText = d.kr;
      document.getElementById("keyTip").innerText = d.tips;
      document.getElementById("capPill").innerText = "🎧 " + rep + "회차 청취: " + d.en;

      for (var i = 1; i <= 3; i++) {
        var dot = document.getElementById("dot_" + i);
        if (i <= rep) dot.classList.add("active");
        else dot.classList.remove("active");
      }
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

// -------------------------------------------------------------
// Frame 8: Shuffle Drill (08-shuffle.html)
// -------------------------------------------------------------
function genFrame08() {
  const allWordKeys = [];
  for (let i = 1; i <= 20; i++) {
    const k = i < 10 ? `p0${i}` : `p${i}`;
    allWordKeys.push({ pairKey: k, wordTarget: "w1" });
    allWordKeys.push({ pairKey: k, wordTarget: "w2" });
  }

  const seedWords = [...allWordKeys].sort((a, b) => {
    const hashA = (a.pairKey + a.wordTarget).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const hashB = (b.pairKey + b.wordTarget).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return (hashA % 17) - (hashB % 17);
  });

  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  seedWords.forEach((item, idx) => {
    const pair = DICTIONARY[item.pairKey];
    const w = item.wordTarget === "w1" ? pair.w1 : pair.w2;
    const voiceKey = (idx % 2 === 0) ? w.m : w.f;
    const dur = getDur(voiceKey);

    audioTags.push(`<audio id="a_shuf_${idx}" src="assets/voice/${voiceKey}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);

    animEvents.push({
      time: curTime,
      type: "blind",
      num: idx + 1,
      total: seedWords.length
    });

    // 1.8s thinking pause after sound ends
    const revealTime = curTime + dur + 1.8;
    animEvents.push({
      time: revealTime,
      type: "reveal",
      word: w.word,
      ipa: w.ipa,
      kr: w.kr,
      tip: w.tip,
      isTense: item.wordTarget === "w1"
    });

    // 2.4s reveal display time to digest answer before next word
    curTime = revealTime + 2.4;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "blind") {
      animScriptCode += `  tl.call(function() {
    setBlind(${e.num}, ${e.total});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "reveal") {
      animScriptCode += `  tl.call(function() {
    setReveal(${JSON.stringify(e)});
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
    background: #8B5CF6; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1cqw; font-weight: 900;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 70cqw; display: flex; flex-direction: column; align-items: center; z-index: 5;
  }
  .shuffle-card {
    background: #FFFFFF; border: 4px solid #111111; box-shadow: 8px 8px 0px #111111;
    border-radius: 32px; padding: 5cqh 4cqw; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.5cqh;
  }
  .count-badge {
    font-size: 1.4cqw; font-weight: 900; background: #FAF7F2; border: 2px solid #111111;
    border-radius: 999px; padding: 0.4cqh 1.6cqw;
  }
  .word-display {
    font-family: 'Archivo Black', sans-serif; font-size: 7.2cqw; line-height: 1.1;
    letter-spacing: 0.02em; min-height: 12cqh; display: flex; align-items: center; justify-content: center;
  }
  .info-badge {
    font-size: 2.2cqw; font-weight: 900; padding: 0.6cqh 2.4cqw; border-radius: 16px;
    border: 2.5px solid #111111; box-shadow: 3px 3px 0px #111111;
  }
  .badge-tense { background: #D1FAE5; color: #065F46; }
  .badge-lax { background: #FEF3C7; color: #92400E; }
  .badge-blind { background: #E5E7EB; color: #374151; }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 1;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="08-shuffle" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span class="tip-badge">실전 귀 훈련</span>
    <span>40개 단어 무작위 덱 셔플: 소리를 듣고 어떤 단어인지 맞춰보세요!</span>
  </div>

  <div class="stage">
    <div class="shuffle-card" id="shuffleCard">
      <div class="count-badge" id="countBadge">1 / 40</div>
      <div class="word-display" id="wordDisplay">❓ 들리는 소리는?</div>
      <div class="info-badge badge-blind" id="infoBadge">🤔 소리를 듣고 맞춰보세요 (잠시 후 정답 공개)</div>
    </div>
  </div>

  <div class="caption-pill" id="capPill">소리를 듣고 입꼬리 당김 [iː]인지 힘 뺀 [ɪ]인지 맞춰보세요!</div>

  ${audioTags.join('\n  ')}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    function setBlind(num, total) {
      document.getElementById("countBadge").innerText = num + " / " + total;
      document.getElementById("wordDisplay").innerText = "❓ 소리 듣는 중...";
      document.getElementById("wordDisplay").style.color = "#6B7280";
      var b = document.getElementById("infoBadge");
      b.className = "info-badge badge-blind";
      b.innerText = "🤔 귀에 집중해 보세요! (2초 후 정답 공개)";
      document.getElementById("capPill").innerText = "문제 " + num + "번: [iː] 입꼬리 당김 vs [ɪ] 힘 뺌 중 어떤 소리일까요?";
    }

    function setReveal(e) {
      document.getElementById("wordDisplay").innerText = e.word;
      document.getElementById("wordDisplay").style.color = e.isTense ? "#059669" : "#D97706";
      var b = document.getElementById("infoBadge");
      if (e.isTense) {
        b.className = "info-badge badge-tense";
        b.innerText = "정답: [iː] 웃듯이 입꼬리 당김! · " + e.kr + " · " + e.ipa;
        document.getElementById("capPill").innerText = "정답: " + e.word + " [iː] ➔ " + e.tip;
      } else {
        b.className = "info-badge badge-lax";
        b.innerText = "정답: [ɪ] 멍때리듯 힘 빼기! · " + e.kr + " · " + e.ipa;
        document.getElementById("capPill").innerText = "정답: " + e.word + " [ɪ] ➔ " + e.tip;
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

// -------------------------------------------------------------
// Frame 9: Summary Cheat Sheet (09-summary.html)
// -------------------------------------------------------------
function genFrame09() {
  const dur = getDur('03_f09_summary');
  const whisperCode = buildWhisperCalls('03_f09_summary');

  return `<template>
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
    width: 86cqw; display: flex; gap: 3.5cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .cheat-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 4cqh 3cqw; display: flex; flex-direction: column; gap: 2cqh;
  }
  .card-header {
    display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E5E7EB;
    padding-bottom: 1.5cqh;
  }
  .header-title { font-size: 2cqw; font-weight: 900; }
  .badge-pill {
    font-size: 1.1cqw; font-weight: 900; padding: 0.4cqh 1.2cqw; border-radius: 999px;
    border: 1.5px solid #111111;
  }
  .point-list {
    display: flex; flex-direction: column; gap: 1.2cqh; font-size: 1.35cqw; font-weight: 700; color: #374151;
  }
  .point-item { display: flex; gap: 0.8cqw; align-items: flex-start; }
  .sample-words {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 14px; padding: 1.5cqh;
    font-size: 1.3cqw; font-weight: 800; color: #111111; text-align: center;
  }
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
    <span class="tip-badge">📸 치트시트</span>
    <span>스마트폰 캡처용 1장 요약: 입꼬리 당김 vs 입에 힘 뺌</span>
  </div>

  <div class="stage">
    <!-- Left Cheat Card: Tense [i:] -->
    <div class="cheat-card" style="border-color:#059669; background:#F0FDF4;">
      <div class="card-header">
        <span class="header-title" style="color:#059669;">[iː] 장모음 · TENSE</span>
        <span class="badge-pill" style="background:#D1FAE5; color:#065F46;">웃듯이 입꼬리 당김</span>
      </div>
      <div class="point-list">
        <div class="point-item"><span>✨</span><span>입술을 양옆으로 활짝 팽팽하게 당기기</span></div>
        <div class="point-item"><span>✨</span><span>소리가 단단하고 텐션 있게 뿜어져 나옴</span></div>
        <div class="point-item"><span>✨</span><span>직관 발음: '이-' (길이가 아닌 긴장감)</span></div>
      </div>
      <div class="sample-words">
        대표 짝단어: <strong>sheep · feet · seat · feel · peach</strong>
      </div>
    </div>

    <!-- Right Cheat Card: Lax [I] -->
    <div class="cheat-card" style="border-color:#D97706; background:#FFFBEB;">
      <div class="card-header">
        <span class="header-title" style="color:#D97706;">[ɪ] 단모음 · LAX</span>
        <span class="badge-pill" style="background:#FEF3C7; color:#92400E;">멍때리듯 힘 빼기</span>
      </div>
      <div class="point-list">
        <div class="point-item"><span>✨</span><span>턱과 입술의 힘을 툭 빼고 편안하게</span></div>
        <div class="point-item"><span>✨</span><span>살짝 '에' 소리가 섞인 듯 툭 떨어짐</span></div>
        <div class="point-item"><span>✨</span><span>직관 발음: '이/에' (가볍고 편안하게)</span></div>
      </div>
      <div class="sample-words">
        대표 짝단어: <strong>ship · fit · sit · fill · pitch</strong>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="v_host" src="assets/voice/03_f09_summary.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${dur.toFixed(2)}"></audio>
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
</template>`;
}

// -------------------------------------------------------------
// Frame 10: Encore Review + End Screen (10-encore.html)
// -------------------------------------------------------------
function genFrame10() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  for (let i = 1; i <= 20; i++) {
    const k = i < 10 ? `p0${i}` : `p${i}`;
    const pair = DICTIONARY[k];

    const dur1 = getDur(pair.w1.m);
    audioTags.push(`<audio id="a_enc_${i}_1" src="assets/voice/${pair.w1.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur1.toFixed(2)}"></audio>`);
    animEvents.push({
      time: curTime,
      type: "highlight",
      num: i,
      side: "left",
      w1: pair.w1.word,
      w2: pair.w2.word,
      pair: pair
    });
    curTime += dur1 + 0.45;

    const dur2 = getDur(pair.w2.f);
    audioTags.push(`<audio id="a_enc_${i}_2" src="assets/voice/${pair.w2.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur2.toFixed(2)}"></audio>`);
    animEvents.push({
      time: curTime,
      type: "highlight",
      num: i,
      side: "right",
      w1: pair.w1.word,
      w2: pair.w2.word,
      pair: pair
    });
    curTime += dur2 + 0.65;
  }

  const endScreenStartTime = curTime + 0.5;
  const totalDur = endScreenStartTime + 10.0;

  let animScriptCode = '';
  animEvents.forEach(e => {
    animScriptCode += `  tl.call(function() {
    setEncorePair(${JSON.stringify(e.pair)}, "${e.side}", ${e.num});
  }, null, ${e.time.toFixed(2)});\n`;
  });

  animScriptCode += `  tl.call(function() {
    showEndScreen();
  }, null, ${endScreenStartTime.toFixed(2)});\n`;

  return {
    duration: totalDur,
    endScreenStart: endScreenStartTime,
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
    background: #3B82F6; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1cqw; font-weight: 900;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 84cqw; display: flex; gap: 3.5cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .encore-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 5cqh 3cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqh;
  }
  .encore-card.active-left { border-color: #059669; box-shadow: 10px 10px 0px #111111; }
  .encore-card.active-right { border-color: #D97706; box-shadow: 10px 10px 0px #111111; }
  .card-label {
    font-size: 1.2cqw; font-weight: 900; padding: 0.5cqh 1.6cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.1; letter-spacing: 0.02em;
  }
  .meaning-text {
    font-size: 2.2cqw; font-weight: 900; color: #4B5563;
  }

  .endscreen-container {
    position: absolute; inset: 0; background: #F4EFE6; display: none; z-index: 100;
    flex-direction: column; justify-content: space-between; padding: 6cqh 6cqw;
  }
  .endscreen-header {
    text-align: center; font-size: 2.2cqw; font-weight: 900; color: #111111;
  }
  .endscreen-guides {
    display: flex; justify-content: space-between; align-items: center; width: 100%;
  }
  .guide-card {
    width: 44cqw; height: 46cqh; border: 3px dashed #9CA3AF; border-radius: 20px;
    background: rgba(255, 255, 255, 0.6); display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1.5cqh; color: #6B7280; font-size: 1.4cqw; font-weight: 800;
  }
  .endscreen-sub {
    width: 100%; text-align: center; font-size: 1.4cqw; font-weight: 800; color: #4B5563;
  }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 1;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="10-encore" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrowPill">
    <span class="tip-badge">앵콜 총복습</span>
    <span id="encoreCounter">20쌍 연속 총복습 (1 / 20)</span>
  </div>

  <div class="stage" id="stageDrill">
    <div class="encore-card" id="cardL">
      <div class="card-label" style="background:#D1FAE5; color:#065F46;">[iː] 입꼬리 당김</div>
      <div class="word-text" id="wL" style="color:#059669;">-</div>
      <div class="meaning-text" id="mL">-</div>
    </div>

    <div class="encore-card" id="cardR">
      <div class="card-label" style="background:#FEF3C7; color:#92400E;">[ɪ] 입에 힘 뺌</div>
      <div class="word-text" id="wR" style="color:#D97706;">-</div>
      <div class="meaning-text" id="mR">-</div>
    </div>
  </div>

  <div class="endscreen-container" id="endScreen">
    <div class="endscreen-header">
      오늘 20쌍 완주를 축하합니다! 다음 추천 영상으로 계속 훈련해 보세요.
    </div>
    <div class="endscreen-guides">
      <div class="guide-card">
        <span style="font-size:2.5cqw;">📺</span>
        <span>추천 영상 (EP23 자음 규칙 / 발음 원리)</span>
      </div>
      <div class="guide-card">
        <span style="font-size:2.5cqw;">📋</span>
        <span>[이해하면 쉬운영어] 전체 재생목록</span>
      </div>
    </div>
    <div class="endscreen-sub">
      채널 구독과 좋아요는 다음 영상 제작에 큰 힘이 됩니다. 😊
    </div>
  </div>

  <div class="caption-pill" id="capPill">20쌍 무한 앵콜 총복습이 진행 중입니다</div>

  ${audioTags.join('\n  ')}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    function setEncorePair(p, side, num) {
      document.getElementById("encoreCounter").innerText = "20쌍 연속 총복습 (" + num + " / 20)";
      document.getElementById("wL").innerText = p.w1.word;
      document.getElementById("mL").innerText = p.w1.kr;
      document.getElementById("wR").innerText = p.w2.word;
      document.getElementById("mR").innerText = p.w2.kr;

      var cardL = document.getElementById("cardL");
      var cardR = document.getElementById("cardR");
      cardL.classList.remove("active-left", "active-right");
      cardR.classList.remove("active-left", "active-right");

      if (side === "left") {
        cardL.classList.add("active-left");
        document.getElementById("capPill").innerText = "🎧 [iː] " + p.w1.word + " (" + p.w1.kr + ")";
      } else {
        cardR.classList.add("active-right");
        document.getElementById("capPill").innerText = "🎧 [ɪ] " + p.w2.word + " (" + p.w2.kr + ")";
      }
    }

    function showEndScreen() {
      document.getElementById("eyebrowPill").style.display = "none";
      document.getElementById("stageDrill").style.display = "none";
      document.getElementById("capPill").style.display = "none";
      var es = document.getElementById("endScreen");
      es.style.display = "flex";
      gsap.from(es, { opacity: 0, duration: 0.5 });
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

// -------------------------------------------------------------
// Main Generator Execution
// -------------------------------------------------------------
async function run() {
  const framesDir = path.join(projectDir, 'compositions/frames');
  if (!fs.existsSync(framesDir)) {
    fs.mkdirSync(framesDir, { recursive: true });
  }

  console.log("Generating frames for EP24...");

  // Frame 1
  const f01Dur = getDur('01_f01_hook') + 1.0;
  fs.writeFileSync(path.join(framesDir, '01-hook.html'), genFrame01(), 'utf8');
  console.log(`✓ 01-hook.html: ${f01Dur.toFixed(2)}s`);

  // Frame 2
  const f02Dur = getDur('02_f02_principle') + 1.0;
  fs.writeFileSync(path.join(framesDir, '02-principle.html'), genFrame02(), 'utf8');
  console.log(`✓ 02-principle.html: ${f02Dur.toFixed(2)}s`);

  // Frame 3 (Group 1: p01 ~ p05)
  const f03 = genDrillFrame("03-group1", "Group 1: 일상 사물 & 동물", ["p01", "p02", "p03", "p04", "p05"], "sheep vs ship, feet vs fit, seat vs sit 등 5쌍 3회 반복 듣기");
  fs.writeFileSync(path.join(framesDir, '03-group1.html'), f03.html, 'utf8');
  console.log(`✓ 03-group1.html: ${f03.duration.toFixed(2)}s`);

  // Frame 4 (Group 2: p06 ~ p10)
  const f04 = genDrillFrame("04-group2", "Group 2: 음식 & 동작", ["p06", "p07", "p08", "p09", "p10"], "meat vs mitt, peach vs pitch, cheap vs chip 등 5쌍 3회 반복 듣기");
  fs.writeFileSync(path.join(framesDir, '04-group2.html'), f04.html, 'utf8');
  console.log(`✓ 04-group2.html: ${f04.duration.toFixed(2)}s`);

  // Frame 5 (Group 3: p11 ~ p15)
  const f05 = genDrillFrame("05-group3", "Group 3: 감각 & 상태", ["p11", "p12", "p13", "p14", "p15"], "sleep vs slip, feel vs fill, reach vs rich 등 5쌍 3회 반복 듣기");
  fs.writeFileSync(path.join(framesDir, '05-group3.html'), f05.html, 'utf8');
  console.log(`✓ 05-group3.html: ${f05.duration.toFixed(2)}s`);

  // Frame 6 (Group 4: p16 ~ p20)
  const f06 = genDrillFrame("06-group4", "Group 4: 추상 & 주의 단어", ["p16", "p17", "p18", "p19", "p20"], "lead vs lid, teen vs tin, beach vs bitch (주의!) 등 5쌍 3회 반복 듣기");
  fs.writeFileSync(path.join(framesDir, '06-group4.html'), f06.html, 'utf8');
  console.log(`✓ 06-group4.html: ${f06.duration.toFixed(2)}s`);

  // Frame 7 (Dialogue 7 sentences)
  const f07 = genFrame07();
  fs.writeFileSync(path.join(framesDir, '07-dialogue.html'), f07.html, 'utf8');
  console.log(`✓ 07-dialogue.html: ${f07.duration.toFixed(2)}s`);

  // Frame 8 (Shuffle 40 words)
  const f08 = genFrame08();
  fs.writeFileSync(path.join(framesDir, '08-shuffle.html'), f08.html, 'utf8');
  console.log(`✓ 08-shuffle.html: ${f08.duration.toFixed(2)}s`);

  // Frame 9 (Cheat Sheet)
  const f09Dur = getDur('03_f09_summary') + 1.0;
  fs.writeFileSync(path.join(framesDir, '09-summary.html'), genFrame09(), 'utf8');
  console.log(`✓ 09-summary.html: ${f09Dur.toFixed(2)}s`);

  // Frame 10 (Encore + End Screen)
  const f10 = genFrame10();
  fs.writeFileSync(path.join(framesDir, '10-encore.html'), f10.html, 'utf8');
  console.log(`✓ 10-encore.html: ${f10.duration.toFixed(2)}s (EndScreen starts at ${f10.endScreenStart.toFixed(2)}s)`);

  // Master Timeline Assembly
  const scenes = [
    { id: "01-hook", src: "compositions/frames/01-hook.html", duration: f01Dur },
    { id: "02-principle", src: "compositions/frames/02-principle.html", duration: f02Dur },
    { id: "03-group1", src: "compositions/frames/03-group1.html", duration: f03.duration },
    { id: "04-group2", src: "compositions/frames/04-group2.html", duration: f04.duration },
    { id: "05-group3", src: "compositions/frames/05-group3.html", duration: f05.duration },
    { id: "06-group4", src: "compositions/frames/06-group4.html", duration: f06.duration },
    { id: "07-dialogue", src: "compositions/frames/07-dialogue.html", duration: f07.duration },
    { id: "08-shuffle", src: "compositions/frames/08-shuffle.html", duration: f08.duration },
    { id: "09-summary", src: "compositions/frames/09-summary.html", duration: f09Dur },
    { id: "10-encore", src: "compositions/frames/10-encore.html", duration: f10.duration }
  ];

  let cumulative = 0;
  const sceneDivs = scenes.map(s => {
    const start = cumulative;
    cumulative += s.duration;
    return `      <div id="scene-${s.id}" class="scene" data-composition-id="${s.id}" data-composition-src="${s.src}" data-start="${start.toFixed(2)}" data-duration="${s.duration.toFixed(2)}" data-track-index="0"></div>`;
  });

  const totalRuntime = cumulative;
  console.log(`\n==========================================`);
  console.log(`Total Master Runtime: ${totalRuntime.toFixed(2)}s (${(totalRuntime / 60).toFixed(2)}분)`);
  console.log(`==========================================`);

  const rootIndexHtml = `<!DOCTYPE html>
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
    <div id="root" data-composition-id="main" data-start="0" data-duration="${totalRuntime.toFixed(2)}" data-width="1920" data-height="1080">
${sceneDivs.join('\n')}
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

  fs.writeFileSync(path.join(projectDir, 'index.html'), rootIndexHtml, 'utf8');
  console.log("✓ Updated root index.html with exact timecodes!");
}

run().catch(err => {
  console.error("Error generating frames:", err);
  process.exit(1);
});
