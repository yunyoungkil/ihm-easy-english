import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep29-b-vs-v');
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

// 24 B vs V Pairs Dictionary (4 Groups of 6 Pairs = 48 Words)
// Rules: Monosyllabic words remain 1 syllable (best, vest).
// 2-syllable words use middle dot (·) for syllable separation (ber · ry, ve · ry).
const PAIRS = [
  // Group 1: 1단계 기본 단모음 6쌍
  {
    id: "p01", group: "g1",
    b: { id: "w01", word: "best", syl: "best", krSyl: "베스트", ipa: "[bɛst]", kr: "최고의 / 가장 좋은", m: "m_w01_best", f: "f_w01_best" },
    v: { id: "w02", word: "vest", syl: "vest", krSyl: "베스트", ipa: "[vɛst]", kr: "조끼", m: "m_w02_vest", f: "f_w02_vest" },
    tip: "두 입술 터짐 best vs 윗니 물고 진동 vest"
  },
  {
    id: "p02", group: "g1",
    b: { id: "w03", word: "ban", syl: "ban", krSyl: "밴", ipa: "[bæn]", kr: "금지하다 / 금지령", m: "m_w03_ban", f: "f_w03_ban" },
    v: { id: "w04", word: "van", syl: "van", krSyl: "밴", ipa: "[væn]", kr: "승합차 / 밴", m: "m_w04_van", f: "f_w04_van" },
    tip: "두 입술 터짐 ban vs 윗니 물고 진동 van"
  },
  {
    id: "p03", group: "g1",
    b: { id: "w05", word: "ber · ry", syl: "ber · ry", krSyl: "베리", ipa: "[ˈbɛri]", kr: "딸기류 열매", m: "m_w05_berry", f: "f_w05_berry" },
    v: { id: "w06", word: "ve · ry", syl: "ve · ry", krSyl: "베리", ipa: "[ˈvɛri]", kr: "매우 / 대단히", m: "m_w06_very", f: "f_w06_very" },
    tip: "★ 최다 혼동 주의! 딸기 ber·ry vs 매우 ve·ry"
  },
  {
    id: "p04", group: "g1",
    b: { id: "w07", word: "bat", syl: "bat", krSyl: "배트", ipa: "[bæt]", kr: "야구방망이 / 박쥐", m: "m_w07_bat", f: "f_w07_bat" },
    v: { id: "w08", word: "vat", syl: "vat", krSyl: "배트", ipa: "[væt]", kr: "대형 통 / 수조", m: "m_w08_vat", f: "f_w08_vat" },
    tip: "두 입술 터짐 bat vs 윗니 물고 진동 vat"
  },
  {
    id: "p05", group: "g1",
    b: { id: "w09", word: "bet", syl: "bet", krSyl: "베트", ipa: "[bɛt]", kr: "내기하다 / 장담하다", m: "m_w09_bet", f: "f_w09_bet" },
    v: { id: "w10", word: "vet", syl: "vet", krSyl: "베트", ipa: "[vɛt]", kr: "수의사", m: "m_w10_vet", f: "f_w10_vet" },
    tip: "두 입술 터짐 bet vs 윗니 물고 진동 vet"
  },
  {
    id: "p06", group: "g1",
    b: { id: "w11", word: "boat", syl: "boat", krSyl: "보트", ipa: "[boʊt]", kr: "배 / 보트", m: "m_w11_boat", f: "f_w11_boat" },
    v: { id: "w12", word: "vote", syl: "vote", krSyl: "보트", ipa: "[voʊt]", kr: "투표하다 / 투표", m: "m_w12_vote", f: "f_w12_vote" },
    tip: "두 입술 터짐 boat vs 윗니 물고 진동 vote"
  },

  // Group 2: 2단계 패턴 확장 6쌍 (장모음 & 이중모음)
  {
    id: "p07", group: "g2",
    b: { id: "w13", word: "base", syl: "base", krSyl: "베이스", ipa: "[beɪs]", kr: "기초 / 토대 / 받침", m: "m_w13_base", f: "f_w13_base" },
    v: { id: "w14", word: "vase", syl: "vase", krSyl: "베이스", ipa: "[veɪs]", kr: "꽃병 / 화병", m: "m_w14_vase", f: "f_w14_vase" },
    tip: "두 입술 터짐 base vs 윗니 물고 진동 vase"
  },
  {
    id: "p08", group: "g2",
    b: { id: "w15", word: "bile", syl: "bile", krSyl: "바일", ipa: "[baɪl]", kr: "담즙 / 분노", m: "m_w15_bile", f: "f_w15_bile" },
    v: { id: "w16", word: "vile", syl: "vile", krSyl: "바일", ipa: "[vaɪl]", kr: "사악한 / 비열한", m: "m_w16_vile", f: "f_w16_vile" },
    tip: "두 입술 터짐 bile vs 윗니 물고 진동 vile"
  },
  {
    id: "p09", group: "g2",
    b: { id: "w17", word: "bolt", syl: "bolt", krSyl: "볼트", ipa: "[boʊlt]", kr: "빗장 / 볼트 / 번개", m: "m_w17_bolt", f: "f_w17_bolt" },
    v: { id: "w18", word: "volt", syl: "volt", krSyl: "볼트", ipa: "[voʊlt]", kr: "전압 단위 (볼트)", m: "m_w18_volt", f: "f_w18_volt" },
    tip: "두 입술 터짐 bolt vs 윗니 물고 진동 volt"
  },
  {
    id: "p10", group: "g2",
    b: { id: "w19", word: "bow", syl: "bow", krSyl: "바우", ipa: "[baʊ]", kr: "고개 숙여 인사하다", m: "m_w19_bow", f: "f_w19_bow" },
    v: { id: "w20", word: "vow", syl: "vow", krSyl: "바우", ipa: "[vaʊ]", kr: "맹세하다 / 서약", m: "m_w20_vow", f: "f_w20_vow" },
    tip: "두 입술 터짐 bow vs 윗니 물고 진동 vow"
  },
  {
    id: "p11", group: "g2",
    b: { id: "w21", word: "bale", syl: "bale", krSyl: "베일", ipa: "[beɪl]", kr: "짚더미 / 보석금", m: "m_w21_bale", f: "f_w21_bale" },
    v: { id: "w22", word: "veil", syl: "veil", krSyl: "베일", ipa: "[veɪl]", kr: "면사포 / 베일", m: "m_w22_veil", f: "f_w22_veil" },
    tip: "두 입술 터짐 bale vs 윗니 물고 진동 veil"
  },
  {
    id: "p12", group: "g2",
    b: { id: "w23", word: "bane", syl: "bane", krSyl: "베인", ipa: "[beɪn]", kr: "골칫거리 / 파멸의 원인", m: "m_w23_bane", f: "f_w23_bane" },
    v: { id: "w24", word: "vane", syl: "vane", krSyl: "베인", ipa: "[veɪn]", kr: "풍향계 / 날개", m: "m_w24_vane", f: "f_w24_vane" },
    tip: "두 입술 터짐 bane vs 윗니 물고 진동 vane"
  },

  // Group 3: 3단계 심화 짝단어 6쌍
  {
    id: "p13", group: "g3",
    b: { id: "w25", word: "bick · er", syl: "bick · er", krSyl: "비커", ipa: "[ˈbɪkər]", kr: "말다툼하다", m: "m_w25_bicker", f: "f_w25_bicker" },
    v: { id: "w26", word: "vick · er", syl: "vick · er", krSyl: "비커", ipa: "[ˈvɪkər]", kr: "보좌목사 / 성직자", m: "m_w26_vicker", f: "f_w26_vicker" },
    tip: "두 입술 100% bick·er vs 윗니 100% vick·er"
  },
  {
    id: "p14", group: "g3",
    b: { id: "w27", word: "bind", syl: "bind", krSyl: "바인드", ipa: "[baɪnd]", kr: "묶다 / 결속하다", m: "m_w27_bind", f: "f_w27_bind" },
    v: { id: "w28", word: "vine", syl: "vine", krSyl: "바인", ipa: "[vaɪn]", kr: "포도나무 / 덩굴", m: "m_w28_vine", f: "f_w28_vine" },
    tip: "두 입술 터짐 bind vs 윗니 물고 진동 vine"
  },
  {
    id: "p15", group: "g3",
    b: { id: "w29", word: "bribe", syl: "bribe", krSyl: "브라이브", ipa: "[braɪb]", kr: "뇌물을 주다", m: "m_w29_bribe", f: "f_w29_bribe" },
    v: { id: "w30", word: "vibe", syl: "vibe", krSyl: "바이브", ipa: "[vaɪb]", kr: "분위기 / 느낌", m: "m_w30_vibe", f: "f_w30_vibe" },
    tip: "두 입술 bribe vs 윗니 vibe"
  },
  {
    id: "p16", group: "g3",
    b: { id: "w31", word: "curb", syl: "curb", krSyl: "커브", ipa: "[kɜːrb]", kr: "도로 턱 / 억제하다", m: "m_w31_curb", f: "f_w31_curb" },
    v: { id: "w32", word: "curve", syl: "curve", krSyl: "커브", ipa: "[kɜːrv]", kr: "곡선 / 굽이지다", m: "m_w32_curve", f: "f_w32_curve" },
    tip: "★ 최다 혼동 주의! 도로 턱 curb vs 곡선 curve"
  },
  {
    id: "p17", group: "g3",
    b: { id: "w33", word: "rib", syl: "rib", krSyl: "립", ipa: "[rɪb]", kr: "갈비뼈 / 갈비", m: "m_w33_rib", f: "f_w33_rib" },
    v: { id: "w34", word: "rive", syl: "rive", krSyl: "라이브", ipa: "[raɪv]", kr: "쪼개다 / 찢다", m: "m_w34_rive", f: "f_w34_rive" },
    tip: "두 입술 닫힘 rib vs 윗니 물기 rive"
  },
  {
    id: "p18", group: "g3",
    b: { id: "w35", word: "lobe", syl: "lobe", krSyl: "로브", ipa: "[loʊb]", kr: "귓불 / 엽", m: "m_w35_lobe", f: "f_w35_lobe" },
    v: { id: "w36", word: "love", syl: "love", krSyl: "러브", ipa: "[lʌv]", kr: "사랑하다 / 사랑", m: "m_w36_love", f: "f_w36_love" },
    tip: "두 입술 닫힘 lobe vs 윗니 물기 love"
  },

  // Group 4: 4단계 어말 & 어중 6쌍 (받침 ㅂ 왜곡 타파)
  {
    id: "p19", group: "g4",
    b: { id: "w37", word: "cab", syl: "cab", krSyl: "캡", ipa: "[kæb]", kr: "택시", m: "m_w37_cab", f: "f_w37_cab" },
    v: { id: "w38", word: "calve", syl: "calve", krSyl: "캐브", ipa: "[kæv]", kr: "새끼를 낳다", m: "m_w38_calve", f: "f_w38_calve" },
    tip: "끝소리 입술 닫힘 cab vs 윗니 진동 calve"
  },
  {
    id: "p20", group: "g4",
    b: { id: "w39", word: "dub", syl: "dub", krSyl: "덥", ipa: "[dʌb]", kr: "별명을 붙이다 / 더빙하다", m: "m_w39_dub", f: "f_w39_dub" },
    v: { id: "w40", word: "dove", syl: "dove", krSyl: "더브", ipa: "[dʌv]", kr: "비둘기", m: "m_w40_dove", f: "f_w40_dove" },
    tip: "끝소리 입술 닫힘 dub vs 윗니 진동 dove"
  },
  {
    id: "p21", group: "g4",
    b: { id: "w41", word: "rob", syl: "rob", krSyl: "랍", ipa: "[rɑːb]", kr: "털다 / 강탈하다", m: "m_w41_rob", f: "f_w41_rob" },
    v: { id: "w42", word: "rove", syl: "rove", krSyl: "로우브", ipa: "[roʊv]", kr: "방랑하다 / 헤매다", m: "m_w42_rove", f: "f_w42_rove" },
    tip: "끝소리 입술 닫힘 rob vs 윗니 진동 rove"
  },
  {
    id: "p22", group: "g4",
    b: { id: "w43", word: "mar · ble", syl: "mar · ble", krSyl: "마블", ipa: "[ˈmɑːrbl]", kr: "대리석 / 구슬", m: "m_w43_marble", f: "f_w43_marble" },
    v: { id: "w44", word: "mar · vel", syl: "mar · vel", krSyl: "마블", ipa: "[ˈmɑːrvl]", kr: "경이로움 / 감탄하다", m: "m_w44_marvel", f: "f_w44_marvel" },
    tip: "두 입술 100% mar·ble vs 윗니 100% mar·vel"
  },
  {
    id: "p23", group: "g4",
    b: { id: "w45", word: "hab · it", syl: "hab · it", krSyl: "해빗", ipa: "[ˈhæbɪt]", kr: "습관 / 버릇", m: "m_w45_habit", f: "f_w45_habit" },
    v: { id: "w46", word: "have it", syl: "have it", krSyl: "해빗", ipa: "[hæv ɪt]", kr: "그것을 가지다", m: "m_w46_have_it", f: "f_w46_have_it" },
    tip: "두 입술 hab·it vs 윗니 물기 have it"
  },
  {
    id: "p24", group: "g4",
    b: { id: "w47", word: "rib · bon", syl: "rib · bon", krSyl: "리본", ipa: "[ˈrɪbən]", kr: "리본 / 띠", m: "m_w47_ribbon", f: "f_w47_ribbon" },
    v: { id: "w48", word: "riv · en", syl: "riv · en", krSyl: "리븐", ipa: "[ˈrɪvn]", kr: "찢겨진 / 갈라진", m: "m_w48_riven", f: "f_w48_riven" },
    tip: "두 입술 rib·bon vs 윗니 물기 riv·en"
  }
];

// Helper to format neutral stem (#111111) + high-contrast target phoneme (B: coral red, V: royal blue)
function formatPhonemeHtml(word, isB) {
  if (isB) {
    return word.replace(/(b+)/gi, '<span class="target-phoneme phoneme-b">$1</span>');
  } else {
    return word.replace(/(v+)/gi, '<span class="target-phoneme phoneme-v">$1</span>');
  }
}

// Pre-compute formatted HTML for each word
PAIRS.forEach(p => {
  p.b.formatted = formatPhonemeHtml(p.b.syl, true);
  p.v.formatted = formatPhonemeHtml(p.v.syl, false);
});

// 7 Dialogue Sentences with target word highlights & syllable breakdown tips
const DIALOGUES = [
  {
    id: "01",
    en: "Is this the best vest you have?",
    enHtml: 'Is this the <span class="hl-b" id="dw_best">best</span> <span class="hl-v" id="dw_vest">vest</span> you have?',
    kr: "이게 당신이 가진 가장 좋은 조끼인가요?",
    pairBadge: "best [b] vs vest [v]",
    sylTip: "💡 best (두 입술 팡 터짐) vs vest (윗니 진동 마찰)",
    audio: "dial_01",
    targets: [{ word: "best", id: "dw_best" }, { word: "vest", id: "dw_vest" }]
  },
  {
    id: "02",
    en: "Yes, you can take the van without a ban.",
    enHtml: 'Yes, you can take the <span class="hl-v" id="dw_van">van</span> without a <span class="hl-b" id="dw_ban">ban</span>.',
    kr: "네, 금지 조치 없이 그 승합차를 타실 수 있습니다.",
    pairBadge: "van [v] vs ban [b]",
    sylTip: "💡 van (윗니 진동 마찰) vs ban (두 입술 팡 터짐)",
    audio: "dial_02",
    targets: [{ word: "van", id: "dw_van" }, { word: "ban", id: "dw_ban" }]
  },
  {
    id: "03",
    en: "I like this berry very much.",
    enHtml: 'I like this <span class="hl-b" id="dw_berry">berry</span> <span class="hl-v" id="dw_very">very</span> much.',
    kr: "나는 이 베리를 매우 좋아해요.",
    pairBadge: "berry [b] vs very [v]",
    sylTip: "💡 berry (두 입술 팡 터짐) vs very (윗니 진동 마찰)",
    audio: "dial_03",
    targets: [{ word: "berry", id: "dw_berry" }, { word: "very", id: "dw_very" }]
  },
  {
    id: "04",
    en: "Did you take the boat to cast your vote?",
    enHtml: 'Did you take the <span class="hl-b" id="dw_boat">boat</span> to cast your <span class="hl-v" id="dw_vote">vote</span>?',
    kr: "투표하기 위해 배를 타셨나요?",
    pairBadge: "boat [b] vs vote [v]",
    sylTip: "💡 boat (두 입술 팡 터짐) vs vote (윗니 진동 마찰)",
    audio: "dial_04",
    targets: [{ word: "boat", id: "dw_boat" }, { word: "vote", id: "dw_vote" }]
  },
  {
    id: "05",
    en: "Put the flower in a base or a vase?",
    enHtml: 'Put the flower in a <span class="hl-b" id="dw_base">base</span> or a <span class="hl-v" id="dw_vase">vase</span>?',
    kr: "꽃을 받침대에 꽂을까요, 아니면 꽃병에 꽂을까요?",
    pairBadge: "base [b] vs vase [v]",
    sylTip: "💡 base (두 입술 팡 터짐) vs vase (윗니 진동 마찰)",
    audio: "dial_05",
    targets: [{ word: "base", id: "dw_base" }, { word: "vase", id: "dw_vase" }]
  },
  {
    id: "06",
    en: "Check the bolt and the high volt line.",
    enHtml: 'Check the <span class="hl-b" id="dw_bolt">bolt</span> and the high <span class="hl-v" id="dw_volt">volt</span> line.',
    kr: "볼트 빗장과 고전압 전선을 확인하세요.",
    pairBadge: "bolt [b] vs volt [v]",
    sylTip: "💡 bolt (두 입술 팡 터짐) vs volt (윗니 진동 마찰)",
    audio: "dial_06",
    targets: [{ word: "bolt", id: "dw_bolt" }, { word: "volt", id: "dw_volt" }]
  },
  {
    id: "07",
    en: "She made a solemn vow with a gentle bow.",
    enHtml: 'She made a solemn <span class="hl-v" id="dw_vow">vow</span> with a gentle <span class="hl-b" id="dw_bow">bow</span>.',
    kr: "그녀는 정중한 인사와 함께 엄숙한 맹세를 했다.",
    pairBadge: "vow [v] vs bow [b]",
    sylTip: "💡 vow (윗니 진동 마찰) vs bow (두 입술 팡 터짐)",
    audio: "dial_07",
    targets: [{ word: "vow", id: "dw_vow" }, { word: "bow", id: "dw_bow" }]
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
  .card-b { border-color: #EF4444; background: #FFFDFD; box-shadow: 6px 6px 0px #EF4444; }
  .card-v { border-color: #3B82F6; background: #FDFEFF; box-shadow: 6px 6px 0px #3B82F6; }
  .card-label {
    font-size: 1.25cqw; font-weight: 900; padding: 0.5cqh 1.5cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .label-b { background: #FEE2E2; color: #DC2626; }
  .label-v { background: #DBEAFE; color: #2563EB; }
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
  .phoneme-b { color: #DC2626; border-color: #DC2626; }
  .phoneme-v { color: #2563EB; border-color: #2563EB; }
  .meaning-text {
    font-size: 2.5cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  .status-badge {
    font-size: 1.2cqw; font-weight: 900; padding: 0.6cqh 1.4cqw; border-radius: 12px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .badge-b { background: #FEE2E2; color: #DC2626; }
  .badge-v { background: #DBEAFE; color: #2563EB; }
  .caption-pill {
    position: absolute; bottom: 3.8cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.55cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="01-hook" data-width="1920" data-height="1080">
  <video id="bgVideoF01" class="bg-video" src="assets/videos/f01_best_vs_vest.mp4" autoplay loop muted data-start="0" data-duration="${totalDur.toFixed(2)}" data-hf-media-start-basis="local" data-layout-allow-overflow></video>

  <div class="eyebrow-pill">
    <span class="tip-badge">0.1초 소리 법칙</span>
    <span>Best와 Vest, 둘 다 똑같은 '베스트'가 아닙니다!</span>
  </div>

  <div class="stage">
    <!-- Card 1: best [b] -->
    <div class="compare-card card-b">
      <div class="card-label label-b">[b] 윗니 0% 두 입술 터짐</div>
      <div class="word-text"><span class="target-phoneme phoneme-b">B</span>EST</div>
      <div class="meaning-text">최고의 / 가장 좋은</div>
      <div class="status-badge badge-b">✓ 윗니 접촉 0%! 두 입술만 팡 터짐</div>
    </div>

    <!-- Card 2: vest [v] -->
    <div class="compare-card card-v">
      <div class="card-label label-v">[v] 윗니 100% 윗니 물고 진동</div>
      <div class="word-text"><span class="target-phoneme phoneme-v">V</span>EST</div>
      <div class="meaning-text">조끼</div>
      <div class="status-badge badge-v">✓ 윗니가 아랫입술 살짝 물고 진동</div>
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
  .rule-card.card-b { border-color: #EF4444; background: #FFFDFD; box-shadow: 8px 8px 0px #EF4444; }
  .rule-card.card-v { border-color: #3B82F6; background: #FDFEFF; box-shadow: 8px 8px 0px #3B82F6; }
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
  .badge-b { background: #FEE2E2; color: #DC2626; }
  .badge-v { background: #DBEAFE; color: #2563EB; }
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
  <img class="bg-img" src="assets/images/f02_articulation.jpg" alt="" />

  <div class="eyebrow-pill">
    <span class="tip-badge">핵심 소리 원리</span>
    <span>입술을 꽉 깨물면 틀립니다! 윗니 접촉 여부가 소리를 결정합니다</span>
  </div>

  <div class="stage">
    <!-- Rule 1: [b] sound -->
    <div class="rule-card card-b" id="cardB">
      <div class="rule-header">
        <span class="rule-title" style="color:#DC2626;">① [b] 입술 터지는 소리</span>
        <span class="rule-badge badge-b">윗니 접촉 0%</span>
      </div>
      <div class="rule-desc">
        윗니가 전혀 닿지 않습니다! 위아래 두 입술만 가볍게 닫았다가 공기를 <strong>'팡'</strong> 터뜨립니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">소리 원리</span>
        <span class="formula-content">윗니 0% (두 입술 100%) ➔ 파열 폭발음</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">best [베스트] · ban [밴] · ber·ry [베리]</span>
      </div>
    </div>

    <!-- Rule 2: [v] sound -->
    <div class="rule-card card-v" id="cardV">
      <div class="rule-header">
        <span class="rule-title" style="color:#2563EB;">② [v] 윗니 진동 소리</span>
        <span class="rule-badge badge-v">윗니 접촉 100%</span>
      </div>
      <div class="rule-desc">
        윗니 끝을 아랫입술 안쪽 살에 살짝 대고, 성대를 <strong>'부르르'</strong> 떨며 바람을 밀어냅니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">소리 원리</span>
        <span class="formula-content">윗니 100% 접촉 ➔ 성대 진동 마찰음</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">vest [베스트] · van [밴] · ve·ry [베리]</span>
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
// 6 Pairs Drill (B Card vs V Card) with 3-Repeat Dot Indicator (Male -> Female -> Male/Female)
// ==========================================
function generateGroupFrame(frameId, groupNum, groupTitle, pairIds, eyebrowTip, badgeStyle) {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  const pairs = pairIds.map(id => PAIRS.find(p => p.id === id));

  pairs.forEach((pair, pairIdx) => {
    const b_m_dur = getDur(pair.b.m);
    const v_m_dur = getDur(pair.v.m);
    const b_f_dur = getDur(pair.b.f);
    const v_f_dur = getDur(pair.v.f);

    animEvents.push({
      time: curTime,
      type: "focus_pair",
      pair: pair,
      pairIdx: pairIdx,
      totalPairs: pairs.length
    });

    // 3-rep listening for this pair:
    // Rep 1 (Male): B word -> V word
    audioTags.push(`<audio id="a_${pair.id}_b0" src="assets/voice/${pair.b.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${b_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "b", dotIdx: 1 });
    curTime += b_m_dur + 0.35;

    audioTags.push(`<audio id="a_${pair.id}_v0" src="assets/voice/${pair.v.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${v_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "v", dotIdx: 1 });
    curTime += v_m_dur + 0.65;

    // Rep 2 (Female): B word -> V word
    audioTags.push(`<audio id="a_${pair.id}_b1" src="assets/voice/${pair.b.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${b_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "b", dotIdx: 2 });
    curTime += b_f_dur + 0.35;

    audioTags.push(`<audio id="a_${pair.id}_v1" src="assets/voice/${pair.v.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${v_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "v", dotIdx: 2 });
    curTime += v_f_dur + 0.65;

    // Rep 3 (Male or Female): B word -> V word
    audioTags.push(`<audio id="a_${pair.id}_b2" src="assets/voice/${pair.b.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${b_m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "b", dotIdx: 3 });
    curTime += b_m_dur + 0.35;

    audioTags.push(`<audio id="a_${pair.id}_v2" src="assets/voice/${pair.v.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${v_f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "v", dotIdx: 3 });
    curTime += v_f_dur + 1.1; // Interval between pairs
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
    position: absolute; top: 4.8cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.8cqh 2.2cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap; flex-shrink: 0;
  }
  .tip-badge {
    border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0; ${badgeStyle}
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 51%; transform: translate(-50%, -50%);
    width: 86cqw; display: flex; flex-direction: column; gap: 2.2cqh; z-index: 5;
  }
  .pair-counter-bar {
    display: flex; justify-content: space-between; align-items: center; width: 100%;
  }
  .counter-badge {
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 3px 3px 0px #111111;
    padding: 0.6cqh 1.5cqw; border-radius: 999px; font-size: 1.2cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .tip-box {
    background: #FAF7F2; border: 2.5px solid #111111; box-shadow: 3px 3px 0px #111111;
    padding: 0.6cqh 1.8cqw; border-radius: 12px; font-size: 1.2cqw; font-weight: 800;
    color: #111111; white-space: nowrap; flex-shrink: 0;
  }
  .cards-wrapper {
    display: flex; gap: 3.2cqw; width: 100%; align-items: stretch;
  }
  .pair-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 26px; padding: 3.5cqh 2.5cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.6cqh;
  }
  .card-b { border-color: #EF4444; }
  .card-v { border-color: #3B82F6; }
  .card-b.active {
    background: #FFF5F5; box-shadow: 10px 10px 0px #EF4444; transform: translateY(-4px) scale(1.02);
  }
  .card-v.active {
    background: #F0F7FF; box-shadow: 10px 10px 0px #3B82F6; transform: translateY(-4px) scale(1.02);
  }
  .card-label {
    font-size: 1.25cqw; font-weight: 900; padding: 0.5cqh 1.4cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .label-b { background: #FEE2E2; color: #DC2626; }
  .label-v { background: #DBEAFE; color: #2563EB; }
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
  .phoneme-b { color: #DC2626; border-color: #DC2626; }
  .phoneme-v { color: #2563EB; border-color: #2563EB; }
  .ipa-text {
    font-size: 2cqw; font-weight: 800; color: #4B5563; white-space: nowrap;
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
      <div id="counterBadge" class="counter-badge">짝단어 1 / 6</div>
      <div id="tipBox" class="tip-box">소리 팁 안내</div>
    </div>

    <div class="cards-wrapper">
      <!-- Left Card: B Word -->
      <div class="pair-card card-b" id="cardB">
        <div class="card-label label-b">[b] 윗니 0% 두 입술 터짐</div>
        <div id="wordB" class="word-text"><span class="target-phoneme phoneme-b">b</span>est</div>
        <div id="ipaB" class="ipa-text">[bɛst] · 베스트</div>
        <div id="meaningB" class="meaning-text">최고의 / 가장 좋은</div>
      </div>

      <!-- Right Card: V Word -->
      <div class="pair-card card-v" id="cardV">
        <div class="card-label label-v">[v] 윗니 100% 윗니 물고 진동</div>
        <div id="wordV" class="word-text"><span class="target-phoneme phoneme-v">v</span>est</div>
        <div id="ipaV" class="ipa-text">[vɛst] · 베스트</div>
        <div id="meaningV" class="meaning-text">조끼</div>
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
    var cardB = document.getElementById("cardB");
    var cardV = document.getElementById("cardV");
    var wordB = document.getElementById("wordB");
    var ipaB = document.getElementById("ipaB");
    var meaningB = document.getElementById("meaningB");
    var wordV = document.getElementById("wordV");
    var ipaV = document.getElementById("ipaV");
    var meaningV = document.getElementById("meaningV");
    var dots = [
      document.getElementById("dot1"),
      document.getElementById("dot2"),
      document.getElementById("dot3")
    ];

    function setPair(pair, idx, total) {
      counterBadge.textContent = "짝단어 " + idx + " / " + total;
      tipBox.textContent = "💡 " + pair.tip;

      wordB.innerHTML = pair.b.formatted;
      ipaB.textContent = pair.b.krSyl + " " + pair.b.ipa;
      meaningB.textContent = pair.b.kr;

      wordV.innerHTML = pair.v.formatted;
      ipaV.textContent = pair.v.krSyl + " " + pair.v.ipa;
      meaningV.textContent = pair.v.kr;

      cardB.classList.remove("active");
      cardV.classList.remove("active");
      dots.forEach(function(d) { d.className = "dot"; });

      gsap.fromTo([cardB, cardV], { scale: 0.96 }, { scale: 1, duration: 0.25, stagger: 0.05, ease: "back.out(1.5)" });
    }

    function highlightSide(side, dotIdx) {
      if (side === "b") {
        cardB.classList.add("active");
        cardV.classList.remove("active");
        gsap.fromTo(wordB, { scale: 1.08 }, { scale: 1, duration: 0.2, ease: "power1.out" });
      } else {
        cardV.classList.add("active");
        cardB.classList.remove("active");
        gsap.fromTo(wordV, { scale: 1.08 }, { scale: 1, duration: 0.2, ease: "power1.out" });
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
  .hl-b {
    color: #DC2626; border-bottom: 5px solid #DC2626; padding-bottom: 2px;
    display: inline-block; background: #FEE2E2; padding-left: 8px; padding-right: 8px; border-radius: 8px;
    transform-origin: center bottom;
  }
  .hl-v {
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
    <span>💬 실전 회화 문맥 속 B vs V 청취 훈련 (7문장 집중 훈련)</span>
  </div>

  <div class="stage">
    <div class="dialogue-card" id="dialCard">
      <div id="dialTag" class="tag-pill">best [b] vs vest [v]</div>
      <div id="dialEn" class="sentence-en">Is this the best vest you have?</div>
      <div id="dialKr" class="sentence-kr">이게 당신이 가진 가장 좋은 조끼인가요?</div>
      <div id="dialSylTip" class="syl-tip-box">💡 best (두 입술 팡 터짐) vs vest (윗니 진동 마찰)</div>
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
    { id: "q1", w: PAIRS.find(p => p.id === "p01").v, isB: false, audioKey: "m_w02_vest", expl: "[v] 윗니 물고 진동하는 소리 (윗니 100%)" },
    { id: "q2", w: PAIRS.find(p => p.id === "p03").b, isB: true, audioKey: "f_w05_berry", expl: "[b] 두 입술 터지는 소리 (윗니 0%)" },
    { id: "q3", w: PAIRS.find(p => p.id === "p02").v, isB: false, audioKey: "m_w04_van", expl: "[v] 윗니 물고 진동하는 소리 (윗니 100%)" },
    { id: "q4", w: PAIRS.find(p => p.id === "p06").b, isB: true, audioKey: "f_w11_boat", expl: "[b] 두 입술 터지는 소리 (윗니 0%)" },
    { id: "q5", w: PAIRS.find(p => p.id === "p07").v, isB: false, audioKey: "m_w14_vase", expl: "[v] 윗니 물고 진동하는 소리 (윗니 100%)" },
    { id: "q6", w: PAIRS.find(p => p.id === "p16").v, isB: false, audioKey: "f_w32_curve", expl: "[v] 윗니 물고 끝나는 소리 (윗니 100%)" },
    { id: "q7", w: PAIRS.find(p => p.id === "p18").v, isB: false, audioKey: "m_w36_love", expl: "[v] 윗니 물고 끝나는 소리 (윗니 100%)" },
    { id: "q8", w: PAIRS.find(p => p.id === "p23").b, isB: true, audioKey: "f_w45_habit", expl: "[b] 두 입술 닫히는 소리 (윗니 0%)" },
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
  .phoneme-b { color: #DC2626; border-color: #DC2626; }
  .phoneme-v { color: #2563EB; border-color: #2563EB; }
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
    <span>🎧 0.1초 직관 반응 퀴즈 (원어민 발음을 듣고 B인지 V인지 맞춰보세요!)</span>
  </div>

  <div class="stage">
    <div class="quiz-card" id="quizCard">
      <div id="quizCounter" class="quiz-counter">퀴즈 1 / 8</div>
      <div id="quizBadge" class="question-badge">❓ 원어민 발음을 듣고 소리를 구분해 보세요</div>
      <div id="blindBox" class="blind-box">???</div>
      <div id="answerWord" class="answer-word"><span class="target-phoneme phoneme-v">v</span>est</div>
      <div id="answerMeta" class="answer-meta">
        <div id="answerIpa" class="answer-ipa">[vɛst] · 베스트 · 조끼</div>
        <div id="answerRule" class="answer-rule">[v] 윗니 물고 진동하는 소리 (윗니 100%)</div>
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

      var bg = q.isB ? "#FEE2E2" : "#DBEAFE";
      var textCol = q.isB ? "#991B1B" : "#1E40AF";
      answerRule.style.background = bg;
      answerRule.style.color = textCol;

      quizBadge.textContent = "✓ 정답: " + (q.isB ? "[b] 윗니 0% 두 입술 터짐" : "[v] 윗니 100% 윗니 물고 진동");
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
    color: #111111; z-index: 10; display: inline-flex; align-items: center; white-space: nowrap; flex-shrink: 0;
  }
  .stage {
    position: absolute; left: 50%; top: 49%; transform: translate(-50%, -50%);
    width: 86cqw; display: flex; gap: 3.5cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .summary-col {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 24px; padding: 3cqh 2.2cqw; display: flex; flex-direction: column; gap: 1.5cqh;
  }
  .col-b { border-color: #EF4444; }
  .col-v { border-color: #3B82F6; }
  .col-header {
    display: flex; justify-content: space-between; align-items: center; padding-bottom: 1cqh;
    border-bottom: 2px dashed #E5E7EB;
  }
  .col-title {
    font-size: 1.6cqw; font-weight: 900; white-space: nowrap;
  }
  .col-badge {
    font-size: 1.05cqw; font-weight: 900; padding: 0.4cqh 1.2cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .badge-b { background: #FEE2E2; color: #DC2626; }
  .badge-v { background: #DBEAFE; color: #2563EB; }
  .words-list {
    display: flex; flex-direction: column; gap: 1cqh;
  }
  .word-row {
    display: flex; justify-content: space-between; align-items: center;
    background: #FAF7F2; border: 2px solid #111111; border-radius: 12px;
    padding: 0.8cqh 1.4cqw;
  }
  .word-name {
    font-family: 'Archivo Black', sans-serif; font-size: 1.6cqw; color: #111111; white-space: nowrap;
  }
  .target-phoneme {
    display: inline-block; border-bottom: 3px solid; padding-bottom: 1px;
  }
  .phoneme-b { color: #DC2626; border-color: #DC2626; }
  .phoneme-v { color: #2563EB; border-color: #2563EB; }
  .syl-tag {
    font-size: 1.1cqw; font-weight: 800; white-space: nowrap;
  }
  .tag-b { color: #DC2626; }
  .tag-v { color: #2563EB; }
  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1cqh 2.4cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="09-summary" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span>📋 B vs V 0.1초 소리 구별 요약표 (캡처해서 보관하세요!)</span>
  </div>

  <div class="stage">
    <!-- Col B -->
    <div class="summary-col col-b">
      <div class="col-header">
        <span class="col-title" style="color:#DC2626;">[b] 윗니 0% 두 입술 터짐</span>
        <span class="col-badge badge-b">파열 폭발음</span>
      </div>
      <div class="words-list">
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("best", true)}</span><span class="syl-tag tag-b">[베스트] 최고</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("ban", true)}</span><span class="syl-tag tag-b">[밴] 금지</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("ber · ry", true)}</span><span class="syl-tag tag-b">[베리] 딸기류</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("boat", true)}</span><span class="syl-tag tag-b">[보트] 배</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("base", true)}</span><span class="syl-tag tag-b">[베이스] 기초</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("curb", true)}</span><span class="syl-tag tag-b">[커브] 도로 턱</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("mar · ble", true)}</span><span class="syl-tag tag-b">[마블] 대리석</span></div>
      </div>
    </div>

    <!-- Col V -->
    <div class="summary-col col-v">
      <div class="col-header">
        <span class="col-title" style="color:#2563EB;">[v] 윗니 100% 윗니 물고 진동</span>
        <span class="col-badge badge-v">성대 진동 마찰음</span>
      </div>
      <div class="words-list">
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("vest", false)}</span><span class="syl-tag tag-v">[베스트] 조끼</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("van", false)}</span><span class="syl-tag tag-v">[밴] 승합차</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("ve · ry", false)}</span><span class="syl-tag tag-v">[베리] 매우</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("vote", false)}</span><span class="syl-tag tag-v">[보트] 투표</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("vase", false)}</span><span class="syl-tag tag-v">[베이스] 꽃병</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("curve", false)}</span><span class="syl-tag tag-v">[커브] 곡선</span></div>
        <div class="word-row"><span class="word-name">${formatPhonemeHtml("mar · vel", false)}</span><span class="syl-tag tag-v">[마블] 경이로움</span></div>
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
    const bKey = isMale ? pair.b.m : pair.b.f;
    const vKey = isMale ? pair.v.m : pair.v.f;

    const bDur = getDur(bKey);
    const vDur = getDur(vKey);

    animEvents.push({
      time: curTime,
      type: "show_encore_pair",
      pair: pair,
      idx: idx + 1,
      total: PAIRS.length
    });

    audioTags.push(`<audio id="en_b_${idx}" src="assets/voice/${bKey}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${bDur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "b" });
    curTime += bDur + 0.3;

    audioTags.push(`<audio id="en_v_${idx}" src="assets/voice/${vKey}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${vDur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "highlight", side: "v" });
    curTime += vDur + 0.6;
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
  .card-b { border-color: #EF4444; }
  .card-v { border-color: #3B82F6; }
  .card-b.active {
    background: #FFF5F5; box-shadow: 10px 10px 0px #EF4444;
  }
  .card-v.active {
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
  .phoneme-b { color: #DC2626; border-color: #DC2626; }
  .phoneme-v { color: #2563EB; border-color: #2563EB; }
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
      <div class="encore-card card-b" id="encB">
        <div id="encWordB" class="encore-word"><span class="target-phoneme phoneme-b">b</span>est</div>
        <div id="encIpaB" class="encore-ipa">베스트 [bɛst]</div>
        <div id="encKrB" class="encore-kr">최고의 / 가장 좋은</div>
      </div>

      <div class="encore-card card-v" id="encV">
        <div id="encWordV" class="encore-word"><span class="target-phoneme phoneme-v">v</span>est</div>
        <div id="encIpaV" class="encore-ipa">베스트 [vɛst]</div>
        <div id="encKrV" class="encore-kr">조끼</div>
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
        <div class="end-box-title">EP28: F vs P 0.1초 조음 물리법칙 [f] vs [p]</div>
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
    var encB = document.getElementById("encB");
    var encV = document.getElementById("encV");
    var encWordB = document.getElementById("encWordB");
    var encIpaB = document.getElementById("encIpaB");
    var encKrB = document.getElementById("encKrB");
    var encWordV = document.getElementById("encWordV");
    var encIpaV = document.getElementById("encIpaV");
    var encKrV = document.getElementById("encKrV");

    function showEncorePair(pair, idx, total) {
      encoreCounter.textContent = "앵콜 " + idx + " / " + total;
      encWordB.innerHTML = pair.b.formatted;
      encIpaB.textContent = pair.b.krSyl + " " + pair.b.ipa;
      encKrB.textContent = pair.b.kr;

      encWordV.innerHTML = pair.v.formatted;
      encIpaV.textContent = pair.v.krSyl + " " + pair.v.ipa;
      encKrV.textContent = pair.v.kr;

      encB.classList.remove("active");
      encV.classList.remove("active");
      gsap.fromTo([encB, encV], { scale: 0.96 }, { scale: 1, duration: 0.2, stagger: 0.05, ease: "back.out(1.5)" });
    }

    function highlightEncore(side) {
      if (side === "b") {
        encB.classList.add("active");
        encV.classList.remove("active");
        gsap.fromTo(encWordB, { scale: 1.08 }, { scale: 1, duration: 0.18, ease: "power1.out" });
      } else {
        encV.classList.add("active");
        encB.classList.remove("active");
        gsap.fromTo(encWordV, { scale: 1.08 }, { scale: 1, duration: 0.18, ease: "power1.out" });
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
  console.log("=== Generating EP29 HyperFrames Compositions ===");

  const f01 = generateF01();
  const f02 = generateF02();

  // F03: Group 1 (p01 ~ p06)
  const f03 = generateGroupFrame(
    "03-drill1", 1, "1단계 · 기본 단모음 6쌍",
    ["p01", "p02", "p03", "p04", "p05", "p06"],
    "남·여 3회 교차 집중 듣기 (두 입술 터짐 B vs 윗니 진동 V)",
    "background: #FEE2E2; color: #DC2626;"
  );

  // F04: Group 2 (p07 ~ p12)
  const f04 = generateGroupFrame(
    "04-drill2", 2, "2단계 · 패턴 확장 6쌍",
    ["p07", "p08", "p09", "p10", "p11", "p12"],
    "장모음 & 이중모음 소리 (두 입술 터짐 B vs 윗니 진동 V)",
    "background: #FEF3C7; color: #92400E;"
  );

  // F05: Group 3 (p13 ~ p18)
  const f05 = generateGroupFrame(
    "05-drill3", 3, "3단계 · 심화 짝단어 6쌍",
    ["p13", "p14", "p15", "p16", "p17", "p18"],
    "★ 도로 턱 curb vs 곡선 curve 혼동 주의!",
    "background: #D1FAE5; color: #065F46;"
  );

  // F06: Group 4 (p19 ~ p24)
  const f06 = generateGroupFrame(
    "06-drill4", 4, "4단계 · 어말 & 어중 6쌍",
    ["p19", "p20", "p21", "p22", "p23", "p24"],
    "받침 'ㅂ' 왜곡 타파! (입술 닫힘 cab vs 윗니 진동 calve)",
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
    <title>EP29 - B vs V 0.1초 소리 원리</title>
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
    name: "ep29-b-vs-v",
    fps: 30,
    width: 1920,
    height: 1080,
    output: "out/ep29-b-vs-v.mp4",
    frames: frames.map(f => ({
      id: f.id,
      src: `compositions/frames/${f.file}`,
      duration: Math.round(f.data.duration * 30)
    }))
  };

  fs.writeFileSync(path.join(projectDir, 'hyperframes.json'), JSON.stringify(hyperframesConfig, null, 2), 'utf8');
  console.log(`✓ Generated hyperframes.json`);

  console.log("\nAll EP29 frames and configuration successfully generated!");
}

main().catch(err => {
  console.error("Frame generation failed:", err);
  process.exit(1);
});
