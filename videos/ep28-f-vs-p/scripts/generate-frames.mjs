import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep28-f-vs-p');
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

// Whisper caption chunks generator
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

// 24 Minimal Pairs Dictionary (4 Groups of 6 Pairs = 48 Words)
// Rules: Monosyllabic words remain 1 syllable (fan, pan).
// 2-syllable words use middle dot (·) for syllable separation (cof · fee, co · py).
const PAIRS = [
  // Group 1: 기본 단모음 6쌍
  {
    id: "p01", group: "g1",
    f: { id: "w01", word: "fan", syl: "fan", krSyl: "팬", ipa: "[fæn]", kr: "선풍기 / 부채", m: "m_w01_fan", f: "f_w01_fan" },
    p: { id: "w02", word: "pan", syl: "pan", krSyl: "팬", ipa: "[pæn]", kr: "냄비 / 프라이팬", m: "m_w02_pan", f: "f_w02_pan" },
    tip: "윗니 바람 fan vs 두 입술 터짐 pan"
  },
  {
    id: "p02", group: "g1",
    f: { id: "w03", word: "fat", syl: "fat", krSyl: "팻", ipa: "[fæt]", kr: "뚱뚱한 / 기름", m: "m_w03_fat", f: "f_w03_fat" },
    p: { id: "w04", word: "pat", syl: "pat", krSyl: "팻", ipa: "[pæt]", kr: "토닥이다", m: "m_w04_pat", f: "f_w04_pat" },
    tip: "윗니 바람 fat vs 두 입술 터짐 pat"
  },
  {
    id: "p03", group: "g1",
    f: { id: "w05", word: "fig", syl: "fig", krSyl: "픽", ipa: "[fɪɡ]", kr: "무화과", m: "m_w05_fig", f: "f_w05_fig" },
    p: { id: "w06", word: "pig", syl: "pig", krSyl: "픽", ipa: "[pɪɡ]", kr: "돼지", m: "m_w06_pig", f: "f_w06_pig" },
    tip: "윗니 바람 fig vs 두 입술 터짐 pig"
  },
  {
    id: "p04", group: "g1",
    f: { id: "w07", word: "fin", syl: "fin", krSyl: "핀", ipa: "[fɪn]", kr: "지느러미", m: "m_w07_fin", f: "f_w07_fin" },
    p: { id: "w08", word: "pin", syl: "pin", krSyl: "핀", ipa: "[pɪn]", kr: "옷핀 / 핀", m: "m_w08_pin", f: "f_w08_pin" },
    tip: "윗니 바람 fin vs 두 입술 터짐 pin"
  },
  {
    id: "p05", group: "g1",
    f: { id: "w09", word: "fit", syl: "fit", krSyl: "핏", ipa: "[fɪt]", kr: "꼭 맞다 / 건강한", m: "m_w09_fit", f: "f_w09_fit" },
    p: { id: "w10", word: "pit", syl: "pit", krSyl: "핏", ipa: "[pɪt]", kr: "구덩이", m: "m_w10_pit", f: "f_w10_pit" },
    tip: "윗니 바람 fit vs 두 입술 터짐 pit"
  },
  {
    id: "p06", group: "g1",
    f: { id: "w11", word: "fog", syl: "fog", krSyl: "팍", ipa: "[fɔːɡ]", kr: "안개", m: "m_w11_fog", f: "f_w11_fog" },
    p: { id: "w12", word: "pog", syl: "pog", krSyl: "팍", ipa: "[pɔːɡ]", kr: "작은 딱지", m: "m_w12_pog", f: "f_w12_pog" },
    tip: "윗니 바람 fog vs 두 입술 터짐 pog"
  },

  // Group 2: 장모음 & 이중모음 6쌍
  {
    id: "p07", group: "g2",
    f: { id: "w13", word: "feel", syl: "feel", krSyl: "필", ipa: "[fiːl]", kr: "느끼다", m: "m_w13_feel", f: "f_w13_feel" },
    p: { id: "w14", word: "peel", syl: "peel", krSyl: "필", ipa: "[piːl]", kr: "껍질을 벗기다", m: "m_w14_peel", f: "f_w14_peel" },
    tip: "윗니 바람 feel vs 두 입술 터짐 peel"
  },
  {
    id: "p08", group: "g2",
    f: { id: "w15", word: "feet", syl: "feet", krSyl: "핏", ipa: "[fiːt]", kr: "발들 (foot의 복수)", m: "m_w15_feet", f: "f_w15_feet" },
    p: { id: "w16", word: "peat", syl: "peat", krSyl: "핏", ipa: "[piːt]", kr: "이탄 / 토탄", m: "m_w16_peat", f: "f_w16_peat" },
    tip: "윗니 바람 feet vs 두 입술 터짐 peat"
  },
  {
    id: "p09", group: "g2",
    f: { id: "w17", word: "fool", syl: "fool", krSyl: "풀", ipa: "[fuːl]", kr: "바보 / 속이다", m: "m_w17_fool", f: "f_w17_fool" },
    p: { id: "w18", word: "pool", syl: "pool", krSyl: "풀", ipa: "[puːl]", kr: "수영장 / 웅덩이", m: "m_w18_pool", f: "f_w18_pool" },
    tip: "★ 최다 혼동 주의! 바람 fool vs 수영장 pool"
  },
  {
    id: "p10", group: "g2",
    f: { id: "w19", word: "face", syl: "face", krSyl: "페이스", ipa: "[feɪs]", kr: "얼굴 / 마주하다", m: "m_w19_face", f: "f_w19_face" },
    p: { id: "w20", word: "pace", syl: "pace", krSyl: "페이스", ipa: "[peɪs]", kr: "속도 / 보폭", m: "m_w20_pace", f: "f_w20_pace" },
    tip: "윗니 바람 face vs 두 입술 터짐 pace"
  },
  {
    id: "p11", group: "g2",
    f: { id: "w21", word: "fair", syl: "fair", krSyl: "페어", ipa: "[fɛr]", kr: "공정한 / 박람회", m: "m_w21_fair", f: "f_w21_fair" },
    p: { id: "w22", word: "pair", syl: "pair", krSyl: "페어", ipa: "[pɛr]", kr: "한 쌍 / 짝", m: "m_w22_pair", f: "f_w22_pair" },
    tip: "윗니 바람 fair vs 두 입술 터짐 pair"
  },
  {
    id: "p12", group: "g2",
    f: { id: "w23", word: "fast", syl: "fast", krSyl: "패스트", ipa: "[fæst]", kr: "빠른", m: "m_w23_fast", f: "f_w23_fast" },
    p: { id: "w24", word: "past", syl: "past", krSyl: "패스트", ipa: "[pæst]", kr: "과거의 / 지나서", m: "m_w24_past", f: "f_w24_past" },
    tip: "윗니 바람 fast vs 두 입술 터짐 past"
  },

  // Group 3: 실생활 2음절 필수 6쌍 (철자 음절 분리 필수)
  {
    id: "p13", group: "g3",
    f: { id: "w25", word: "cof · fee", syl: "cof · fee", krSyl: "커피", ipa: "[ˈkɔːfi]", kr: "커피", m: "m_w25_coffee", f: "f_w25_coffee" },
    p: { id: "w26", word: "co · py", syl: "co · py", krSyl: "카피", ipa: "[ˈkɑːpi]", kr: "복사", m: "m_w26_copy", f: "f_w26_copy" },
    tip: "윗니 100% cof·fee vs 두 입술 100% co·py"
  },
  {
    id: "p14", group: "g3",
    f: { id: "w27", word: "of · fice", syl: "of · fice", krSyl: "오피스", ipa: "[ˈɔːfɪs]", kr: "사무실", m: "m_w27_office", f: "f_w27_office" },
    p: { id: "w28", word: "op · tion", syl: "op · tion", krSyl: "옵션", ipa: "[ˈɑːpʃn]", kr: "선택지", m: "m_w28_option", f: "f_w28_option" },
    tip: "윗니 100% of·fice vs 두 입술 100% op·tion"
  },
  {
    id: "p15", group: "g3",
    f: { id: "w29", word: "fol · low", syl: "fol · low", krSyl: "팔로우", ipa: "[ˈfɑːloʊ]", kr: "따라가다", m: "m_w29_follow", f: "f_w29_follow" },
    p: { id: "w30", word: "pil · low", syl: "pil · low", krSyl: "필로우", ipa: "[ˈpɪloʊ]", kr: "베개", m: "m_w30_pillow", f: "f_w30_pillow" },
    tip: "윗니 100% fol·low vs 두 입술 100% pil·low"
  },
  {
    id: "p16", group: "g3",
    f: { id: "w31", word: "for · est", syl: "for · est", krSyl: "포레스트", ipa: "[ˈfɔːrɪst]", kr: "숲", m: "m_w31_forest", f: "f_w31_forest" },
    p: { id: "w32", word: "pro · tect", syl: "pro · tect", krSyl: "프로텍트", ipa: "[prəˈtɛkt]", kr: "보호하다", m: "m_w32_protect", f: "f_w32_protect" },
    tip: "윗니 100% for·est vs 두 입술 100% pro·tect"
  },
  {
    id: "p17", group: "g3",
    f: { id: "w33", word: "four · teen", syl: "four · teen", krSyl: "포틴", ipa: "[ˌfɔːrˈtiːn]", kr: "14", m: "m_w33_fourteen", f: "f_w33_fourteen" },
    p: { id: "w34", word: "por · tion", syl: "por · tion", krSyl: "포션", ipa: "[ˈpɔːrʃn]", kr: "일부분 / 몫", m: "m_w34_portion", f: "f_w34_portion" },
    tip: "윗니 100% four·teen vs 두 입술 100% por·tion"
  },
  {
    id: "p18", group: "g3",
    f: { id: "w35", word: "free · dom", syl: "free · dom", krSyl: "프리덤", ipa: "[ˈfriːdəm]", kr: "자유", m: "m_w35_freedom", f: "f_w35_freedom" },
    p: { id: "w36", word: "pres · sure", syl: "pres · sure", krSyl: "프레셔", ipa: "[ˈprɛʃər]", kr: "압박 / 압력", m: "m_w36_pressure", f: "f_w36_pressure" },
    tip: "윗니 100% free·dom vs 두 입술 100% pres·sure"
  },

  // Group 4: 단어 끝소리 6쌍 (받침 ㅂ 왜곡 타파)
  {
    id: "p19", group: "g4",
    f: { id: "w37", word: "leaf", syl: "leaf", krSyl: "리프", ipa: "[liːf]", kr: "나뭇잎", m: "m_w37_leaf", f: "f_w37_leaf" },
    p: { id: "w38", word: "leap", syl: "leap", krSyl: "립", ipa: "[liːp]", kr: "도약하다 / 뛰다", m: "m_w38_leap", f: "f_w38_leap" },
    tip: "바람 새는 끝소리 leaf vs 입술 닫히는 leap"
  },
  {
    id: "p20", group: "g4",
    f: { id: "w39", word: "beef", syl: "beef", krSyl: "비프", ipa: "[biːf]", kr: "소고기", m: "m_w39_beef", f: "f_w39_beef" },
    p: { id: "w40", word: "beep", syl: "beep", krSyl: "빕", ipa: "[biːp]", kr: "삐 소리", m: "m_w40_beep", f: "f_w40_beep" },
    tip: "바람 새는 끝소리 beef vs 입술 닫히는 beep"
  },
  {
    id: "p21", group: "g4",
    f: { id: "w41", word: "cuff", syl: "cuff", krSyl: "커프", ipa: "[kʌf]", kr: "소매 끝동", m: "m_w41_cuff", f: "f_w41_cuff" },
    p: { id: "w42", word: "cup", syl: "cup", krSyl: "컵", ipa: "[kʌp]", kr: "컵", m: "m_w42_cup", f: "f_w42_cup" },
    tip: "바람 새는 끝소리 cuff vs 입술 닫히는 cup"
  },
  {
    id: "p22", group: "g4",
    f: { id: "w43", word: "cliff", syl: "cliff", krSyl: "클리프", ipa: "[klɪf]", kr: "절벽", m: "m_w43_cliff", f: "f_w43_cliff" },
    p: { id: "w44", word: "clip", syl: "clip", krSyl: "클립", ipa: "[klɪp]", kr: "클립 / 고정핀", m: "m_w44_clip", f: "f_w44_clip" },
    tip: "바람 새는 끝소리 cliff vs 입술 닫히는 clip"
  },
  {
    id: "p23", group: "g4",
    f: { id: "w45", word: "chef", syl: "chef", krSyl: "셰프", ipa: "[ʃɛf]", kr: "요리사", m: "m_w45_chef", f: "f_w45_chef" },
    p: { id: "w46", word: "step", syl: "step", krSyl: "스텝", ipa: "[stɛp]", kr: "걸음 / 계단", m: "m_w46_step", f: "f_w46_step" },
    tip: "바람 새는 끝소리 chef vs 입술 닫히는 step"
  },
  {
    id: "p24", group: "g4",
    f: { id: "w47", word: "safe", syl: "safe", krSyl: "세이프", ipa: "[seɪf]", kr: "안전한 / 금고", m: "m_w47_safe", f: "f_w47_safe" },
    p: { id: "w48", word: "tape", syl: "tape", krSyl: "테이프", ipa: "[teɪp]", kr: "테이프", m: "m_w48_tape", f: "f_w48_tape" },
    tip: "바람 새는 끝소리 safe vs 입술 닫히는 tape"
  }
];

// Helper to format neutral stem (#111111) + high-contrast target phoneme (F: coral red, P: sky blue)
function formatPhonemeHtml(word, isF) {
  if (isF) {
    return word.replace(/(f+)/gi, '<span class="target-phoneme phoneme-f">$1</span>');
  } else {
    return word.replace(/(p+)/gi, '<span class="target-phoneme phoneme-p">$1</span>');
  }
}

// Pre-compute formatted HTML for each word
PAIRS.forEach(p => {
  p.f.formatted = formatPhonemeHtml(p.f.syl, true);
  p.p.formatted = formatPhonemeHtml(p.p.syl, false);
});

// 7 Dialogue Sentences with target word highlights & syllable breakdown tips
const DIALOGUES = [
  {
    id: "01",
    en: "I need a cup of hot coffee, not a copy.",
    enHtml: 'I need a cup of hot <span class="hl-f" id="dw_coffee">coffee</span>, not a <span class="hl-p" id="dw_copy">copy</span>.',
    kr: "복사본이 아니라 따뜻한 커피 한 잔이 필요해요.",
    pairBadge: "coffee [f] vs copy [p]",
    sylTip: "💡 coffee (윗니 100% 바람) vs copy (두 입술 100% 터짐)",
    audio: "dial_01",
    targets: [{ word: "coffee", id: "dw_coffee" }, { word: "copy", id: "dw_copy" }]
  },
  {
    id: "02",
    en: "Please turn on the fan and wash the pan.",
    enHtml: 'Please turn on the <span class="hl-f" id="dw_fan">fan</span> and wash the <span class="hl-p" id="dw_pan">pan</span>.',
    kr: "선풍기를 켜고 프라이팬을 씻어 주세요.",
    pairBadge: "fan [f] vs pan [p]",
    sylTip: "💡 fan (윗니 100% 바람) vs pan (두 입술 100% 터짐)",
    audio: "dial_02",
    targets: [{ word: "fan", id: "dw_fan" }, { word: "pan", id: "dw_pan" }]
  },
  {
    id: "03",
    en: "The fast runner did not stop in the past.",
    enHtml: 'The <span class="hl-f" id="dw_fast">fast</span> runner did not stop in the <span class="hl-p" id="dw_past">past</span>.',
    kr: "그 빠른 주자는 과거에 멈추지 않았다.",
    pairBadge: "fast [f] vs past [p]",
    sylTip: "💡 fast (윗니 100% 바람) vs past (두 입술 100% 터짐)",
    audio: "dial_03",
    targets: [{ word: "fast", id: "dw_fast" }, { word: "past", id: "dw_past" }]
  },
  {
    id: "04",
    en: "Do not drink water from the pool, you fool.",
    enHtml: 'Do not drink water from the <span class="hl-p" id="dw_pool">pool</span>, you <span class="hl-f" id="dw_fool">fool</span>.',
    kr: "수영장 물을 마시지 마, 바보야.",
    pairBadge: "fool [f] vs pool [p]",
    sylTip: "💡 fool (윗니 100% 바람) vs pool (두 입술 100% 터짐)",
    audio: "dial_04",
    targets: [{ word: "pool", id: "dw_pool" }, { word: "fool", id: "dw_fool" }]
  },
  {
    id: "05",
    en: "I feel like I want to peel this fresh orange.",
    enHtml: 'I <span class="hl-f" id="dw_feel">feel</span> like I want to <span class="hl-p" id="dw_peel">peel</span> this fresh orange.',
    kr: "이 신선한 오렌지 껍질을 벗기고 싶은 기분이다.",
    pairBadge: "feel [f] vs peel [p]",
    sylTip: "💡 feel (윗니 100% 바람) vs peel (두 입술 100% 터짐)",
    audio: "dial_05",
    targets: [{ word: "feel", id: "dw_feel" }, { word: "peel", id: "dw_peel" }]
  },
  {
    id: "06",
    en: "Keep the office safe and tape the box tight.",
    enHtml: 'Keep the <span class="hl-f" id="dw_office">office</span> <span class="hl-f" id="dw_safe">safe</span> and <span class="hl-p" id="dw_tape">tape</span> the box tight.',
    kr: "사무실을 안전하게 지키고 상자를 테이프로 꽉 붙이세요.",
    pairBadge: "office [f] · safe [f] vs tape [p]",
    sylTip: "💡 office, safe (바람 F) vs tape (입술 터짐 P)",
    audio: "dial_06",
    targets: [{ word: "office", id: "dw_office" }, { word: "safe", id: "dw_safe" }, { word: "tape", id: "dw_tape" }]
  },
  {
    id: "07",
    en: "She has a real passion for high fashion.",
    enHtml: 'She has a real <span class="hl-p" id="dw_passion">passion</span> for high <span class="hl-f" id="dw_fashion">fashion</span>.',
    kr: "그녀는 고급 패션에 대한 진정한 열정을 가지고 있다.",
    pairBadge: "fashion [f] vs passion [p]",
    sylTip: "💡 fashion (윗니 100% 바람) vs passion (두 입술 100% 터짐)",
    audio: "dial_07",
    targets: [{ word: "passion", id: "dw_passion" }, { word: "fashion", id: "dw_fashion" }]
  }
];

const outFramesDir = path.join(projectDir, 'compositions', 'frames');
fs.mkdirSync(outFramesDir, { recursive: true });

// ==========================================
// 1. Frame 01: Hook
// ==========================================
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
    background: #F7F4EE; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .bg-video {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0.22; z-index: 1; filter: saturate(1.1);
    transform: scale(1.05); transform-origin: center center;
  }
  .eyebrow-pill {
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap; flex-shrink: 0;
  }
  .tip-badge {
    background: #EF4444; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 84cqw; display: flex; gap: 3.5cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .compare-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 26px; padding: 4cqh 2.5cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqh;
  }
  .card-f { border-color: #EF4444; background: #FFFDFD; box-shadow: 6px 6px 0px #EF4444; }
  .card-p { border-color: #3B82F6; background: #FDFEFF; box-shadow: 6px 6px 0px #3B82F6; }
  .card-label {
    font-size: 1.25cqw; font-weight: 900; padding: 0.5cqh 1.5cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .label-f { background: #FEE2E2; color: #DC2626; }
  .label-p { background: #DBEAFE; color: #2563EB; }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 5.6cqw; line-height: 1.0;
    letter-spacing: -0.02em; white-space: nowrap; color: #111111;
  }
  .target-phoneme {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .phoneme-f { color: #DC2626; border-color: #DC2626; }
  .phoneme-p { color: #2563EB; border-color: #2563EB; }
  .meaning-text {
    font-size: 2.5cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  .status-badge {
    font-size: 1.2cqw; font-weight: 900; padding: 0.6cqh 1.4cqw; border-radius: 12px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .badge-f { background: #FEE2E2; color: #DC2626; }
  .badge-p { background: #DBEAFE; color: #2563EB; }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="01-hook" data-width="1920" data-height="1080">
  <video id="bgVideoF01" class="bg-video" src="assets/videos/f01_coffee_vs_copy.mp4" autoplay loop muted data-start="0" data-duration="${totalDur.toFixed(2)}" data-hf-media-start-basis="local" data-layout-allow-overflow></video>

  <div class="eyebrow-pill">
    <span class="tip-badge">0.1초 조음 법칙</span>
    <span>Coffee와 Copy, 둘 다 똑같은 '피'가 아닙니다!</span>
  </div>

  <div class="stage">
    <!-- Card 1: coffee [f] -->
    <div class="compare-card card-f">
      <div class="card-label label-f">[f] 윗니 100% 바람 소리</div>
      <div class="word-text">CO<span class="target-phoneme phoneme-f">F</span> · <span class="target-phoneme phoneme-f">F</span>EE</div>
      <div class="meaning-text">커피</div>
      <div class="status-badge badge-f">✓ 윗니가 아랫입술에 살짝 닿음</div>
    </div>

    <!-- Card 2: copy [p] -->
    <div class="compare-card card-p">
      <div class="card-label label-p">[p] 윗니 0% 두 입술 터짐</div>
      <div class="word-text">CO · <span class="target-phoneme phoneme-p">P</span>Y</div>
      <div class="meaning-text">복사</div>
      <div class="status-badge badge-p">✓ 윗니 접촉 0%! 두 입술만 팡 터짐</div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="audioHook" src="assets/voice/01_f01_hook.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${dur.toFixed(2)}"></audio>
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
    window.__timelines["01-hook"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// ==========================================
// 2. Frame 02: Principle
// ==========================================
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
    background: #F7F4EE; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .bg-img {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0.18; z-index: 1; filter: saturate(1.1);
    transform: scale(1.05); transform-origin: center center;
  }
  .eyebrow-pill {
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap; flex-shrink: 0;
  }
  .tip-badge {
    background: #EF4444; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; display: flex; gap: 3.5cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .rule-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 24px; padding: 4cqh 2.6cqw; display: flex; flex-direction: column; gap: 2cqh;
  }
  .rule-card.card-f { border-color: #EF4444; background: #FFFDFD; box-shadow: 8px 8px 0px #EF4444; }
  .rule-card.card-p { border-color: #3B82F6; background: #FDFEFF; box-shadow: 8px 8px 0px #3B82F6; }
  .rule-header {
    display: flex; justify-content: space-between; align-items: center;
  }
  .rule-title {
    font-size: 1.7cqw; font-weight: 900; white-space: nowrap;
  }
  .rule-badge {
    font-size: 1.1cqw; font-weight: 900; padding: 0.4cqh 1.2cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .badge-f { background: #FEE2E2; color: #DC2626; }
  .badge-p { background: #DBEAFE; color: #2563EB; }
  .rule-desc {
    font-size: 1.35cqw; font-weight: 700; color: #374151; line-height: 1.5;
  }
  .rule-formula {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 14px;
    padding: 1.5cqh 1.6cqw; display: flex; flex-direction: column; gap: 0.6cqh;
  }
  .formula-label {
    font-size: 1.1cqw; font-weight: 900; color: #6B7280; white-space: nowrap;
  }
  .formula-content {
    font-size: 1.4cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  .example-pill {
    background: #FFFFFF; border: 2px solid #111111; border-radius: 10px;
    padding: 0.5cqh 1.2cqw; font-size: 1.2cqw; font-weight: 900; display: inline-block;
    white-space: nowrap;
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
  <img class="bg-img" src="assets/images/f02_articulation_f_vs_p.jpg" alt="" />

  <div class="eyebrow-pill">
    <span class="tip-badge">핵심 물리법칙</span>
    <span>입술을 꽉 깨물면 틀립니다! 윗니 접촉 여부가 소리를 결정합니다</span>
  </div>

  <div class="stage">
    <!-- Rule 1: [f] sound -->
    <div class="rule-card card-f" id="cardF">
      <div class="rule-header">
        <span class="rule-title" style="color:#DC2626;">① [f] 바람 새는 소리</span>
        <span class="rule-badge badge-f">윗니 접촉 100%</span>
      </div>
      <div class="rule-desc">
        윗니 끝을 아랫입술 안쪽 살에 살짝 대고, 그 틈으로 바람을 <strong>'쉬익'</strong> 내보내는 소리입니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">조음 원리</span>
        <span class="formula-content">윗니 100% 접촉 ➔ 마찰 바람 소리</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">fan [팬] · coffee [커피] · leaf [리프]</span>
      </div>
    </div>

    <!-- Rule 2: [p] sound -->
    <div class="rule-card card-p" id="cardP">
      <div class="rule-header">
        <span class="rule-title" style="color:#2563EB;">② [p] 입술 터지는 소리</span>
        <span class="rule-badge badge-p">윗니 접촉 0%</span>
      </div>
      <div class="rule-desc">
        윗니가 전혀 닿지 않습니다! 위아래 두 입술만 가볍게 닫았다가 바람을 <strong>'팡'</strong> 터뜨립니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">조음 원리</span>
        <span class="formula-content">윗니 0% (두 입술 100%) ➔ 파열 폭발음</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">pan [팬] · copy [카피] · leap [립]</span>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="audioPrinciple" src="assets/voice/02_f02_principle.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${dur.toFixed(2)}"></audio>
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
    window.__timelines["02-principle"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// ==========================================
// 3~6. Generator for Group Frames (F03, F04, F05, F06)
// 6 Minimal Pairs Drill (F Card vs P Card) with 3-Repeat Dot Indicator (Male -> Female -> Male/Female)
// ==========================================
function generateGroupFrame(frameId, groupNum, groupTitle, pairIds, eyebrowTip, badgeStyle) {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  const pairs = pairIds.map(id => PAIRS.find(p => p.id === id));

  pairs.forEach((pair, pairIdx) => {
    const f_m_dur = getDur(pair.f.m);
    const p_m_dur = getDur(pair.p.m);
    const f_f_dur = getDur(pair.f.f);
    const p_f_dur = getDur(pair.p.f);

    animEvents.push({
      time: curTime,
      type: "focus_pair",
      pair: pair,
      pairIdx: pairIdx,
      totalPairs: pairs.length
    });

    // 3-rep listening for this pair:
    // Rep 1 (Male): F word -> P word
    audioTags.push(`<audio id="a_${pair.id}_f0" src="assets/voice/${pair.f.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${f_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "f", dotIdx: 1 });
    curTime += f_m_dur + 0.35;

    audioTags.push(`<audio id="a_${pair.id}_p0" src="assets/voice/${pair.p.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${p_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "p", dotIdx: 1 });
    curTime += p_m_dur + 0.65;

    // Rep 2 (Female): F word -> P word
    audioTags.push(`<audio id="a_${pair.id}_f1" src="assets/voice/${pair.f.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${f_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "f", dotIdx: 2 });
    curTime += f_f_dur + 0.35;

    audioTags.push(`<audio id="a_${pair.id}_p1" src="assets/voice/${pair.p.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${p_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "p", dotIdx: 2 });
    curTime += p_f_dur + 0.65;

    // Rep 3 (Male or Female): F word -> P word
    audioTags.push(`<audio id="a_${pair.id}_f2" src="assets/voice/${pair.f.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${f_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "f", dotIdx: 3 });
    curTime += f_m_dur + 0.35;

    audioTags.push(`<audio id="a_${pair.id}_p2" src="assets/voice/${pair.p.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${p_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "p", dotIdx: 3 });
    curTime += p_f_dur + 1.1; // transition buffer to next pair
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "focus_pair") {
      animScriptCode += `  tl.call(function() {
    setPair(${JSON.stringify(e.pair)}, ${e.pairIdx + 1}, ${e.totalPairs});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "highlight") {
      animScriptCode += `  tl.call(function() {
    highlightSide("${e.side}", ${e.dotIdx});
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
    background: #F7F4EE; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap; flex-shrink: 0;
  }
  .tip-badge {
    ${badgeStyle} border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.2cqh; z-index: 5;
  }
  .pair-counter-bar {
    display: flex; justify-content: space-between; align-items: center; width: 100%;
  }
  .counter-badge {
    font-size: 1.25cqw; font-weight: 900; color: #4B5563; background: #FFFFFF;
    padding: 0.4cqh 1.5cqw; border-radius: 999px; border: 2px solid #111111;
    white-space: nowrap; flex-shrink: 0;
  }
  .tip-box {
    background: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.4cqh 1.8cqw; font-size: 1.2cqw; font-weight: 900; color: #111111;
    white-space: nowrap; flex-shrink: 0;
  }
  .cards-wrapper {
    display: flex; gap: 3.2cqw; width: 100%; align-items: stretch;
  }
  .pair-card {
    flex: 1; background: #FFFFFF; border: 4px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 26px; padding: 3.6cqh 2.4cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.6cqh;
  }
  .card-f { border-color: #EF4444; }
  .card-p { border-color: #3B82F6; }
  .card-f.active {
    background: #FFF5F5; box-shadow: 10px 10px 0px #EF4444;
  }
  .card-p.active {
    background: #F0F7FF; box-shadow: 10px 10px 0px #3B82F6;
  }
  .card-label {
    font-size: 1.15cqw; font-weight: 900; padding: 0.4cqh 1.3cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .label-f { background: #FEE2E2; color: #DC2626; }
  .label-p { background: #DBEAFE; color: #2563EB; }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 5.2cqw; line-height: 1.0;
    letter-spacing: -0.02em; white-space: nowrap; color: #111111;
  }
  .target-phoneme {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .phoneme-f { color: #DC2626; border-color: #DC2626; }
  .phoneme-p { color: #2563EB; border-color: #2563EB; }
  .ipa-text {
    font-size: 1.7cqw; font-weight: 800; color: #4B5563; white-space: nowrap;
  }
  .meaning-text {
    font-size: 2.2cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  /* Indicator Dots only - 3 Repetitions */
  .dots-wrapper {
    display: flex; gap: 1cqw; justify-content: center; align-items: center; margin-top: 0.5cqh;
  }
  .dot {
    width: 1.4cqw; height: 1.4cqw; border-radius: 50%;
    border: 2.5px solid #111111; background: #E5E7EB;
  }
  .dot.active {
    background: #10B981; transform: scale(1.35); box-shadow: 0 0 10px rgba(16, 185, 129, 0.6);
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="${frameId}" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span class="tip-badge">${groupTitle}</span>
    <span>${eyebrowTip}</span>
  </div>

  <div class="stage">
    <div class="pair-counter-bar">
      <div id="counterBadge" class="counter-badge">1쌍 / 6쌍</div>
      <div id="tipBox" class="tip-box">조음 팁 안내</div>
    </div>

    <div class="cards-wrapper">
      <!-- Left Card: F Word -->
      <div class="pair-card card-f" id="cardF">
        <div class="card-label label-f">[f] 윗니 100% 바람</div>
        <div id="wordF" class="word-text"><span class="target-phoneme phoneme-f">f</span>an</div>
        <div id="ipaF" class="ipa-text">[fæn] · 팬</div>
        <div id="meaningF" class="meaning-text">선풍기 / 부채</div>
      </div>

      <!-- Right Card: P Word -->
      <div class="pair-card card-p" id="cardP">
        <div class="card-label label-p">[p] 윗니 0% 두 입술 터짐</div>
        <div id="wordP" class="word-text"><span class="target-phoneme phoneme-p">p</span>an</div>
        <div id="ipaP" class="ipa-text">[pæn] · 팬</div>
        <div id="meaningP" class="meaning-text">냄비 / 프라이팬</div>
      </div>
    </div>

    <div class="dots-wrapper">
      <div class="dot" id="dot1"></div>
      <div class="dot" id="dot2"></div>
      <div class="dot" id="dot3"></div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>
<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var counterBadge = document.getElementById("counterBadge");
    var tipBox = document.getElementById("tipBox");
    var cardF = document.getElementById("cardF");
    var cardP = document.getElementById("cardP");
    var wordF = document.getElementById("wordF");
    var ipaF = document.getElementById("ipaF");
    var meaningF = document.getElementById("meaningF");
    var wordP = document.getElementById("wordP");
    var ipaP = document.getElementById("ipaP");
    var meaningP = document.getElementById("meaningP");
    var dots = [
      document.getElementById("dot1"),
      document.getElementById("dot2"),
      document.getElementById("dot3")
    ];

    function setPair(pair, idx, total) {
      counterBadge.textContent = "최소대립쌍 " + idx + " / " + total;
      tipBox.textContent = "💡 " + pair.tip;

      wordF.innerHTML = pair.f.formatted;
      ipaF.textContent = pair.f.krSyl + " " + pair.f.ipa;
      meaningF.textContent = pair.f.kr;

      wordP.innerHTML = pair.p.formatted;
      ipaP.textContent = pair.p.krSyl + " " + pair.p.ipa;
      meaningP.textContent = pair.p.kr;

      cardF.classList.remove("active");
      cardP.classList.remove("active");
      dots.forEach(function(d) { d.className = "dot"; });

      gsap.fromTo([cardF, cardP], { scale: 0.96 }, { scale: 1, duration: 0.25, stagger: 0.05, ease: "back.out(1.5)" });
    }

    function highlightSide(side, dotIdx) {
      if (side === "f") {
        cardF.classList.add("active");
        cardP.classList.remove("active");
        gsap.fromTo(wordF, { scale: 1.08 }, { scale: 1, duration: 0.2, ease: "power1.out" });
      } else {
        cardP.classList.add("active");
        cardF.classList.remove("active");
        gsap.fromTo(wordP, { scale: 1.08 }, { scale: 1, duration: 0.2, ease: "power1.out" });
      }

      dots.forEach(function(d, i) {
        if (i < dotIdx) {
          d.className = "dot active";
        } else {
          d.className = "dot";
        }
      });
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

// ==========================================
// 7. Frame 07: Real Conversation Dialogue
// ==========================================
function generateF07() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  DIALOGUES.forEach((d, idx) => {
    const dur = getDur(d.audio);
    const words = loadWords(d.audio);

    animEvents.push({ time: curTime, type: "show_dialogue", dialogue: d, idx: idx + 1, total: DIALOGUES.length });
    audioTags.push(`<audio id="dia_${d.id}" src="assets/voice/${d.audio}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);

    // Target words bounce animation based on Whisper timestamps
    d.targets.forEach(tgt => {
      const wMatch = words.find(w => w.word.toLowerCase().replace(/[^a-z]/g, '') === tgt.word.toLowerCase());
      if (wMatch && wMatch.from !== undefined) {
        animEvents.push({
          time: curTime + wMatch.from,
          type: "bounce_target",
          targetId: tgt.id
        });
      }
    });

    curTime += dur + 1.2;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "show_dialogue") {
      animScriptCode += `  tl.call(function() {
    showDialogue(${JSON.stringify(e.dialogue)});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "bounce_target") {
      animScriptCode += `  tl.call(function() {
    bounceWord("${e.targetId}");
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
    background: #F7F4EE; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .bg-video {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0.25; z-index: 1; filter: saturate(1.1);
    transform: scale(1.05); transform-origin: center center;
  }
  .eyebrow-pill {
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; z-index: 10; display: inline-flex; align-items: center; white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: 86cqw; z-index: 5;
  }
  .dialogue-card {
    background: #FFFFFF; border: 4px solid #111111; box-shadow: 8px 8px 0px #111111;
    border-radius: 28px; padding: 5cqh 4cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 2.2cqh;
  }
  .tag-pill {
    display: inline-block; background: #FAF7F2; border: 2px solid #111111;
    padding: 0.5cqh 1.8cqw; border-radius: 999px; font-size: 1.25cqw; font-weight: 900; color: #111111;
    white-space: nowrap; flex-shrink: 0;
  }
  .sentence-en {
    font-family: 'Archivo Black', sans-serif; font-size: 3.5cqw; line-height: 1.35;
    color: #111111;
  }
  .hl-f {
    color: #DC2626; border-bottom: 5px solid #DC2626; padding-bottom: 2px;
    display: inline-block; background: #FEE2E2; padding-left: 8px; padding-right: 8px; border-radius: 8px;
    transform-origin: center bottom;
  }
  .hl-p {
    color: #2563EB; border-bottom: 5px solid #2563EB; padding-bottom: 2px;
    display: inline-block; background: #DBEAFE; padding-left: 8px; padding-right: 8px; border-radius: 8px;
    transform-origin: center bottom;
  }
  .sentence-kr {
    font-size: 2.1cqw; font-weight: 800; color: #4B5563;
  }
  .syl-tip-box {
    background: #FAF7F2; border: 2.5px solid #111111; box-shadow: 3px 3px 0px #111111;
    border-radius: 14px; padding: 1cqh 2.4cqw; font-size: 1.4cqw; font-weight: 900;
    color: #111111; margin-top: 0.5cqh; white-space: nowrap;
  }
</style>
<div id="root" data-composition-id="07-dialogue" data-width="1920" data-height="1080">
  <video id="bgVideoF07" class="bg-video" src="assets/videos/f07_cafe_ambience.mp4" autoplay loop muted data-start="0" data-duration="${totalDur.toFixed(2)}" data-hf-media-start-basis="local" data-layout-allow-overflow></video>

  <div class="eyebrow-pill">
    <span>💬 실전 회화 문맥 속 F vs P 청취 훈련 (7문장 집중 훈련)</span>
  </div>

  <div class="stage">
    <div class="dialogue-card" id="dialCard">
      <div id="dialTag" class="tag-pill">coffee [f] vs copy [p]</div>
      <div id="dialEn" class="sentence-en">I need a cup of hot coffee, not a copy.</div>
      <div id="dialKr" class="sentence-kr">복사본이 아니라 따뜻한 커피 한 잔이 필요해요.</div>
      <div id="dialSylTip" class="syl-tip-box">💡 coffee (윗니 100% 바람) vs copy (두 입술 100% 터짐)</div>
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

    function bounceWord(targetId) {
      var el = document.getElementById(targetId);
      if (el) {
        gsap.fromTo(el, { scale: 1.2, y: -4 }, { scale: 1, y: 0, duration: 0.35, ease: "elastic.out(1.2, 0.4)" });
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

// ==========================================
// 8. Frame 08: 8-Question Shuffle Quiz
// ==========================================
function generateF08() {
  const quizQuestions = [
    { id: "q1", w: PAIRS.find(p => p.id === "p09").p, isF: false, audioKey: "m_w18_pool", expl: "[p] 두 입술 터지는 소리 (윗니 0%)" },
    { id: "q2", w: PAIRS.find(p => p.id === "p13").f, isF: true, audioKey: "f_w25_coffee", expl: "[f] 윗니 바람 새는 소리 (윗니 100%)" },
    { id: "q3", w: PAIRS.find(p => p.id === "p19").p, isF: false, audioKey: "m_w38_leap", expl: "[p] 입술 닫히는 끝소리 (윗니 0%)" },
    { id: "q4", w: PAIRS.find(p => p.id === "p01").f, isF: true, audioKey: "f_w01_fan", expl: "[f] 윗니 바람 새는 소리 (윗니 100%)" },
    { id: "q5", w: PAIRS.find(p => p.id === "p12").f, isF: true, audioKey: "m_w23_fast", expl: "[f] 윗니 바람 새는 소리 (윗니 100%)" },
    { id: "q6", w: PAIRS.find(p => p.id === "p13").p, isF: false, audioKey: "f_w26_copy", expl: "[p] 두 입술 터지는 소리 (윗니 0%)" },
    { id: "q7", w: PAIRS.find(p => p.id === "p09").f, isF: true, audioKey: "m_w17_fool", expl: "[f] 윗니 바람 새는 소리 (윗니 100%)" },
    { id: "q8", w: PAIRS.find(p => p.id === "p19").f, isF: true, audioKey: "f_w37_leaf", expl: "[f] 바람 새며 끝나는 소리 (윗니 100%)" },
  ];

  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  quizQuestions.forEach((q, idx) => {
    const dur = getDur(q.audioKey);

    // 1. Play audio with blind card
    animEvents.push({ time: curTime, type: "play_blind", idx: idx + 1, total: quizQuestions.length });
    audioTags.push(`<audio id="sq_${idx}" src="assets/voice/${q.audioKey}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);
    curTime += dur;

    // 2. Think time: 1.5s
    curTime += 1.5;

    // 3. Reveal answer
    animEvents.push({ time: curTime, type: "reveal_answer", q: q });

    // 4. Digestion time: 2.2s
    curTime += 2.2;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "play_blind") {
      animScriptCode += `  tl.call(function() {
    setBlind(${e.idx}, ${e.total});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "reveal_answer") {
      animScriptCode += `  tl.call(function() {
    revealAnswer(${JSON.stringify(e.q)});
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
    background: #F7F4EE; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; z-index: 10; display: inline-flex; align-items: center; white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 65cqw; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 5;
  }
  .quiz-card {
    width: 100%; background: #FFFFFF; border: 4px solid #111111; box-shadow: 8px 8px 0px #111111;
    border-radius: 28px; padding: 4.5cqh 3cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.8cqh;
  }
  .quiz-counter {
    font-size: 1.25cqw; font-weight: 900; color: #6B7280; background: #F3F4F6;
    padding: 0.3cqh 1.3cqw; border-radius: 999px; border: 2px solid #111111;
    white-space: nowrap; flex-shrink: 0;
  }
  .question-badge {
    background: #FEF3C7; color: #92400E; border: 2px solid #111111;
    padding: 0.5cqh 1.6cqw; border-radius: 999px; font-size: 1.3cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .blind-box {
    width: 22cqw; height: 10cqh; background: #111111; border-radius: 18px;
    display: flex; align-items: center; justify-content: center;
    color: #FFFFFF; font-family: 'Archivo Black', sans-serif; font-size: 3.8cqw;
    letter-spacing: 0.1em;
  }
  .answer-word {
    font-family: 'Archivo Black', sans-serif; font-size: 6.5cqw; line-height: 1.0;
    white-space: nowrap; display: none; color: #111111;
  }
  .target-phoneme {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .phoneme-f { color: #DC2626; border-color: #DC2626; }
  .phoneme-p { color: #2563EB; border-color: #2563EB; }
  .answer-meta {
    display: none; flex-direction: column; align-items: center; gap: 0.8cqh;
  }
  .answer-ipa {
    font-size: 2cqw; font-weight: 800; color: #4B5563; white-space: nowrap;
  }
  .answer-rule {
    font-size: 1.35cqw; font-weight: 900; padding: 0.5cqh 1.8cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="08-quiz" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span>🎧 0.1초 직관 반응 퀴즈 (원어민 발음을 듣고 F인지 P인지 맞춰보세요!)</span>
  </div>

  <div class="stage">
    <div class="quiz-card" id="quizCard">
      <div id="quizCounter" class="quiz-counter">퀴즈 1 / 8</div>
      <div id="quizBadge" class="question-badge">❓ 원어민 발음을 듣고 소리를 구분해 보세요</div>
      <div id="blindBox" class="blind-box">???</div>
      <div id="answerWord" class="answer-word"><span class="target-phoneme phoneme-p">p</span>ool</div>
      <div id="answerMeta" class="answer-meta">
        <div id="answerIpa" class="answer-ipa">[puːl] · 풀 · 수영장</div>
        <div id="answerRule" class="answer-rule">[p] 두 입술 터지는 소리 (윗니 0%)</div>
      </div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>
<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var quizCounter = document.getElementById("quizCounter");
    var quizBadge = document.getElementById("quizBadge");
    var blindBox = document.getElementById("blindBox");
    var answerWord = document.getElementById("answerWord");
    var answerMeta = document.getElementById("answerMeta");
    var answerIpa = document.getElementById("answerIpa");
    var answerRule = document.getElementById("answerRule");
    var quizCard = document.getElementById("quizCard");

    function setBlind(idx, total) {
      quizCounter.textContent = "퀴즈 " + idx + " / " + total;
      quizBadge.textContent = "❓ 원어민 발음을 듣고 소리를 구분해 보세요";
      quizBadge.style.background = "#FEF3C7";
      quizBadge.style.color = "#92400E";
      blindBox.style.display = "flex";
      answerWord.style.display = "none";
      answerMeta.style.display = "none";
      gsap.fromTo(quizCard, { scale: 0.96 }, { scale: 1, duration: 0.25, ease: "back.out(1.5)" });
    }

    function revealAnswer(q) {
      blindBox.style.display = "none";
      answerWord.style.display = "block";
      answerMeta.style.display = "flex";

      answerWord.innerHTML = q.w.formatted;
      answerIpa.textContent = q.w.krSyl + " " + q.w.ipa + " · " + q.w.kr;
      answerRule.textContent = q.expl;

      var bg = q.isF ? "#FEE2E2" : "#DBEAFE";
      var textCol = q.isF ? "#991B1B" : "#1E40AF";
      answerRule.style.background = bg;
      answerRule.style.color = textCol;

      quizBadge.textContent = "✓ 정답: " + (q.isF ? "[f] 윗니 100%" : "[p] 윗니 0%");
      quizBadge.style.background = "#D1FAE5";
      quizBadge.style.color = "#065F46";

      gsap.fromTo(answerWord, { scale: 0.85 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
    }

${animScriptCode}
    window.__timelines = window.__timelines || {};
    window.__timelines["08-quiz"] = tl;
    tl.seek(0);
  })();
</script>
</template>`
  };
}

// ==========================================
// 9. Frame 09: 1-Page Summary Cheat Sheet
// ==========================================
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
    background: #F7F4EE; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 4.8cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.8cqh 2.2cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .capture-badge {
    background: #10B981; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .stage {
    position: absolute; left: 50%; top: 49%; transform: translate(-50%, -50%);
    width: 90cqw; display: flex; gap: 2.8cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .summary-col {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 22px; padding: 2.4cqh 1.8cqw; display: flex; flex-direction: column; gap: 1.4cqh;
  }
  .col-f { border-color: #EF4444; }
  .col-p { border-color: #3B82F6; }
  .col-header {
    padding: 1.4cqh 1.2cqw; border-radius: 14px; border: 2px solid #111111; text-align: center;
  }
  .header-f { background: #FEE2E2; }
  .header-p { background: #DBEAFE; }
  .col-title {
    font-size: 1.6cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  .col-sub {
    font-size: 1.05cqw; font-weight: 800; color: #4B5563; margin-top: 0.3cqh; white-space: nowrap;
  }
  .word-list {
    display: flex; flex-direction: column; gap: 0.8cqh; margin-top: 0.4cqh;
  }
  .word-row {
    display: flex; justify-content: space-between; align-items: center;
    background: #FAF7F2; border: 1.5px solid #111111; border-radius: 10px;
    padding: 0.7cqh 1.2cqw;
  }
  .word-name {
    font-family: 'Archivo Black', sans-serif; font-size: 1.45cqw; white-space: nowrap; color: #111111;
  }
  .target-phoneme {
    display: inline-block;
    border-bottom-width: 3px;
    border-bottom-style: solid;
    padding-bottom: 1px;
  }
  .phoneme-f { color: #DC2626; border-color: #DC2626; }
  .phoneme-p { color: #2563EB; border-color: #2563EB; }
  .syl-tag {
    font-size: 1.05cqw; font-weight: 900; padding: 0.2cqh 0.8cqw; border-radius: 6px;
    border: 1.5px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .tag-f { background: #FEE2E2; color: #991B1B; }
  .tag-p { background: #DBEAFE; color: #1E40AF; }
  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>
<div id="root" data-composition-id="09-summary" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span class="capture-badge">📱 캡처 추천</span>
    <span>스마트폰 저장용 1장 요약 치트시트 (F vs P 0.1초 조음 법칙)</span>
  </div>

  <div class="stage">
    <!-- Col 1: [f] -->
    <div class="summary-col col-f">
      <div class="col-header header-f">
        <div class="col-title" style="color:#DC2626;">[f] 윗니 100% 바람 소리</div>
        <div class="col-sub">윗니 끝을 아랫입술 안쪽에 살짝 대고 쉬익!</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("fan", true)}</span><span class="syl-tag tag-f">[팬] 선풍기</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("feel", true)}</span><span class="syl-tag tag-f">[필] 느끼다</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("fool", true)}</span><span class="syl-tag tag-f">[풀] 바보</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("fast", true)}</span><span class="syl-tag tag-f">[패스트] 빠른</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("cof · fee", true)}</span><span class="syl-tag tag-f">[커피] 커피</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("of · fice", true)}</span><span class="syl-tag tag-f">[오피스] 사무실</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("leaf", true)}</span><span class="syl-tag tag-f">[리프] 나뭇잎</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("safe", true)}</span><span class="syl-tag tag-f">[세이프] 안전한</span></div>
      </div>
    </div>

    <!-- Col 2: [p] -->
    <div class="summary-col col-p">
      <div class="col-header header-p">
        <div class="col-title" style="color:#2563EB;">[p] 윗니 0% 두 입술 터짐</div>
        <div class="col-sub">윗니 접촉 0%! 두 입술만 가볍게 닫았다가 팡!</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("pan", false)}</span><span class="syl-tag tag-p">[팬] 냄비</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("peel", false)}</span><span class="syl-tag tag-p">[필] 껍질</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("pool", false)}</span><span class="syl-tag tag-p">[풀] 수영장</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("past", false)}</span><span class="syl-tag tag-p">[패스트] 과거</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("co · py", false)}</span><span class="syl-tag tag-p">[카피] 복사</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("op · tion", false)}</span><span class="syl-tag tag-p">[옵션] 선택지</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("leap", false)}</span><span class="syl-tag tag-p">[립] 도약</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("tape", false)}</span><span class="syl-tag tag-p">[테이프] 테이프</span></div>
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

// ==========================================
// 10. Frame 10: 24-Pair Nonstop Encore Drill
// ==========================================
function generateF10() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  PAIRS.forEach((pair, idx) => {
    // Alternate male/female for encore speed
    const isMale = idx % 2 === 0;
    const fKey = isMale ? pair.f.m : pair.f.f;
    const pKey = isMale ? pair.p.m : pair.p.f;

    const fDur = getDur(fKey);
    const pDur = getDur(pKey);

    animEvents.push({
      time: curTime,
      type: "show_encore_pair",
      pair: pair,
      idx: idx + 1,
      total: PAIRS.length
    });

    audioTags.push(`<audio id="en_f_${idx}" src="assets/voice/${fKey}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${fDur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "f" });
    curTime += fDur + 0.3;

    audioTags.push(`<audio id="en_p_${idx}" src="assets/voice/${pKey}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${pDur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "p" });
    curTime += pDur + 0.6;
  });

  const encoreAudioEnd = curTime;
  const endScreenDuration = 10.0;
  const totalDur = encoreAudioEnd + endScreenDuration;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "show_encore_pair") {
      animScriptCode += `  tl.call(function() {
    showEncorePair(${JSON.stringify(e.pair)}, ${e.idx}, ${e.total});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "highlight") {
      animScriptCode += `  tl.call(function() {
    highlightEncore("${e.side}");
  }, null, ${e.time.toFixed(2)});\n`;
    }
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
    background: #F7F4EE; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; z-index: 10; display: inline-flex; align-items: center; white-space: nowrap; flex-shrink: 0;
  }
  .stage {
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: 84cqw; display: flex; flex-direction: column; align-items: center; gap: 2cqh; z-index: 5;
  }
  .encore-counter {
    font-size: 1.3cqw; font-weight: 900; color: #4B5563; background: #FFFFFF;
    padding: 0.4cqh 1.6cqw; border-radius: 999px; border: 2px solid #111111;
    white-space: nowrap; flex-shrink: 0;
  }
  .cards-wrapper {
    display: flex; gap: 3.2cqw; width: 100%; align-items: stretch;
  }
  .encore-card {
    flex: 1; background: #FFFFFF; border: 4px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 26px; padding: 4.5cqh 2.5cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.8cqh;
  }
  .card-f { border-color: #EF4444; }
  .card-p { border-color: #3B82F6; }
  .card-f.active {
    background: #FFF5F5; box-shadow: 10px 10px 0px #EF4444;
  }
  .card-p.active {
    background: #F0F7FF; box-shadow: 10px 10px 0px #3B82F6;
  }
  .encore-word {
    font-family: 'Archivo Black', sans-serif; font-size: 6.2cqw; line-height: 1.0;
    letter-spacing: -0.02em; white-space: nowrap; color: #111111;
  }
  .target-phoneme {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .phoneme-f { color: #DC2626; border-color: #DC2626; }
  .phoneme-p { color: #2563EB; border-color: #2563EB; }
  .encore-ipa {
    font-size: 2.1cqw; font-weight: 800; color: #4B5563; white-space: nowrap;
  }
  .encore-kr {
    font-size: 2.5cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  .end-overlay {
    position: absolute; inset: 0; width: 100%; height: 100%;
    background: #F7F4EE; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 3.5cqh;
    opacity: 0; z-index: 20; pointer-events: none;
  }
  .end-title {
    font-family: 'Archivo Black', sans-serif; font-size: 3.6cqw; color: #111111; text-align: center;
  }
  .end-sub {
    font-size: 1.8cqw; font-weight: 800; color: #4B5563; text-align: center;
  }
  .end-boxes {
    display: flex; gap: 3cqw; margin-top: 2cqh;
  }
  .end-box {
    width: 32cqw; height: 30cqh; background: #FFFFFF; border: 4px solid #111111;
    box-shadow: 6px 6px 0px #111111; border-radius: 20px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.2cqh;
    text-align: center; padding: 2cqh 2cqw;
  }
  .end-box-badge {
    background: #EF4444; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.4cqh 1.2cqw; font-size: 1.1cqw; font-weight: 900;
  }
  .end-box-title {
    font-size: 1.5cqw; font-weight: 900; color: #111111;
  }
  audio { display: none; }
</style>
<div id="root" data-composition-id="10-encore" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span>🎧 24쌍 무한 앵콜 총복습 (오직 귀로만 듣고 0.1초 만에 구별해 보세요!)</span>
  </div>

  <div class="stage" id="encoreStage">
    <div id="encoreCounter" class="encore-counter">앵콜 1 / 24</div>

    <div class="cards-wrapper">
      <div class="encore-card card-f" id="encF">
        <div id="encWordF" class="encore-word"><span class="target-phoneme phoneme-f">f</span>an</div>
        <div id="encIpaF" class="encore-ipa">팬 [fæn]</div>
        <div id="encKrF" class="encore-kr">선풍기 / 부채</div>
      </div>

      <div class="encore-card card-p" id="encP">
        <div id="encWordP" class="encore-word"><span class="target-phoneme phoneme-p">p</span>an</div>
        <div id="encIpaP" class="encore-ipa">팬 [pæn]</div>
        <div id="encKrP" class="encore-kr">냄비 / 프라이팬</div>
      </div>
    </div>
  </div>

  <!-- End Screen Elements Overlay (10s) -->
  <div class="end-overlay" id="endOverlay">
    <div class="end-title">매일 10분, 귀가 뚫리는 쉬운 영어</div>
    <div class="end-sub">구독과 좋아요를 누르시면 다음 발음 훈련 영상을 놓치지 않습니다!</div>
    <div class="end-boxes">
      <div class="end-box">
        <div class="end-box-badge">추천 영상</div>
        <div class="end-box-title">EP27: 단어 끝 -S · -ES 3가지 물리법칙 [s] vs [z] vs [ɪz]</div>
      </div>
      <div class="end-box">
        <div class="end-box-badge" style="background:#2563EB;">구독하기</div>
        <div class="end-box-title">이해하면 쉬운영어 채널 구독하고 실력 완성하기</div>
      </div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>
<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var encoreCounter = document.getElementById("encoreCounter");
    var encF = document.getElementById("encF");
    var encP = document.getElementById("encP");
    var encWordF = document.getElementById("encWordF");
    var encIpaF = document.getElementById("encIpaF");
    var encKrF = document.getElementById("encKrF");
    var encWordP = document.getElementById("encWordP");
    var encIpaP = document.getElementById("encIpaP");
    var encKrP = document.getElementById("encKrP");

    function showEncorePair(pair, idx, total) {
      encoreCounter.textContent = "앵콜 " + idx + " / " + total;
      encWordF.innerHTML = pair.f.formatted;
      encIpaF.textContent = pair.f.krSyl + " " + pair.f.ipa;
      encKrF.textContent = pair.f.kr;

      encWordP.innerHTML = pair.p.formatted;
      encIpaP.textContent = pair.p.krSyl + " " + pair.p.ipa;
      encKrP.textContent = pair.p.kr;

      encF.classList.remove("active");
      encP.classList.remove("active");
      gsap.fromTo([encF, encP], { scale: 0.96 }, { scale: 1, duration: 0.2, stagger: 0.05, ease: "back.out(1.5)" });
    }

    function highlightEncore(side) {
      if (side === "f") {
        encF.classList.add("active");
        encP.classList.remove("active");
        gsap.fromTo(encWordF, { scale: 1.08 }, { scale: 1, duration: 0.18, ease: "power1.out" });
      } else {
        encP.classList.add("active");
        encF.classList.remove("active");
        gsap.fromTo(encWordP, { scale: 1.08 }, { scale: 1, duration: 0.18, ease: "power1.out" });
      }
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

// ==========================================
// Build all 10 Frames & Index & hyperframes.json
// ==========================================
async function main() {
  console.log("=== Generating EP28 HyperFrames Compositions ===");

  const f01 = generateF01();
  const f02 = generateF02();

  // F03: Group 1 (p01 ~ p06)
  const f03 = generateGroupFrame(
    "03-drill1", 1, "Group 1 · 기본 단모음 6쌍",
    ["p01", "p02", "p03", "p04", "p05", "p06"],
    "남·여 3회 교차 집중 듣기 (윗니 바람 F vs 두 입술 터짐 P)",
    "background: #FEE2E2; color: #DC2626;"
  );

  // F04: Group 2 (p07 ~ p12)
  const f04 = generateGroupFrame(
    "04-drill2", 2, "Group 2 · 장모음 & 이중모음 6쌍",
    ["p07", "p08", "p09", "p10", "p11", "p12"],
    "★ 한국인 최다 혼동 주의! (바람 새는 fool vs 수영장 pool)",
    "background: #FEF3C7; color: #92400E;"
  );

  // F05: Group 3 (p13 ~ p18)
  const f05 = generateGroupFrame(
    "05-drill3", 3, "Group 3 · 실생활 2음절 필수 6쌍",
    ["p13", "p14", "p15", "p16", "p17", "p18"],
    "영어 철자 음절 분리 (윗니 100% cof·fee vs 두 입술 100% co·py)",
    "background: #D1FAE5; color: #065F46;"
  );

  // F06: Group 4 (p19 ~ p24)
  const f06 = generateGroupFrame(
    "06-drill4", 4, "Group 4 · 단어 끝소리 6쌍",
    ["p19", "p20", "p21", "p22", "p23", "p24"],
    "받침 'ㅂ' 왜곡 타파! (바람 새는 leaf vs 입술 닫히는 leap)",
    "background: #DBEAFE; color: #1E40AF;"
  );

  const f07 = generateF07();
  const f08 = generateF08();
  const f09 = generateF09();
  const f10 = generateF10();

  const frames = [
    { id: "01-hook", data: f01, file: "01-hook.html" },
    { id: "02-principle", data: f02, file: "02-principle.html" },
    { id: "03-drill1", data: f03, file: "03-drill1.html" },
    { id: "04-drill2", data: f04, file: "04-drill2.html" },
    { id: "05-drill3", data: f05, file: "05-drill3.html" },
    { id: "06-drill4", data: f06, file: "06-drill4.html" },
    { id: "07-dialogue", data: f07, file: "07-dialogue.html" },
    { id: "08-quiz", data: f08, file: "08-quiz.html" },
    { id: "09-summary", data: f09, file: "09-summary.html" },
    { id: "10-encore", data: f10, file: "10-encore.html" },
  ];

  let totalSec = 0;
  frames.forEach(f => {
    fs.writeFileSync(path.join(outFramesDir, f.file), f.data.html, 'utf8');
    totalSec += f.data.duration;
    console.log(`✓ Generated ${f.file} (${f.data.duration.toFixed(1)}s)`);
  });

  const totalMin = (totalSec / 60).toFixed(1);
  const endScreenStartSec = totalSec - f10.endScreenDuration;
  console.log(`\nTotal Timeline Duration: ${totalSec.toFixed(1)}s (~${totalMin} min)`);
  console.log(`End screen start: ${endScreenStartSec.toFixed(2)}s ~ ${totalSec.toFixed(2)}s (${f10.endScreenDuration}s maintain)`);

  // Build index.html (mounting sub-compositions via data-composition-src)
  let startSec = 0;
  const sceneDivs = frames.map((f) => {
    const dur = f.data.duration;
    const div = `      <div id="scene-${f.id}" class="scene" data-composition-id="${f.id}" data-composition-src="compositions/frames/${f.file}" data-start="${startSec.toFixed(2)}" data-duration="${dur.toFixed(2)}" data-track-index="0"></div>`;
    startSec += dur;
    return div;
  }).join('\n');

  const indexHtml = `<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1920, height=1080">
    <title>EP28 - F vs P 0.1초 조음 물리법칙</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #F7F4EE; }
      #root { position: relative; width: 1920px; height: 1080px; overflow: hidden; background: #F7F4EE; }
      .scene { position: absolute; inset: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${totalSec.toFixed(2)}" data-width="1920" data-height="1080">
${sceneDivs}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>`;

  fs.writeFileSync(path.join(projectDir, 'index.html'), indexHtml, 'utf8');
  console.log(`✓ Generated index.html (modular sub-composition mount)`);

  // Build hyperframes.json
  const hyperframesConfig = {
    name: "ep28-f-vs-p",
    fps: 30,
    width: 1920,
    height: 1080,
    output: "out/ep28-f-vs-p.mp4",
    frames: frames.map(f => ({
      id: f.id,
      src: `compositions/frames/${f.file}`,
      duration: Math.round(f.data.duration * 30)
    }))
  };

  fs.writeFileSync(path.join(projectDir, 'hyperframes.json'), JSON.stringify(hyperframesConfig, null, 2), 'utf8');
  console.log(`✓ Generated hyperframes.json`);

  console.log("\nAll EP28 frames and configuration successfully generated!");
}

main().catch(err => {
  console.error("Frame generation failed:", err);
  process.exit(1);
});
