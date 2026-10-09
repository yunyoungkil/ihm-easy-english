import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep27-s-ending');
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

// 24 Words Dictionary (4 Groups of 6 Words)
// Syllable rule: monosyllabic words keep original form (cats, dogs),
// multisyllabic words have syllable dot (bu · ses, wat · ches, hou · ses)
const WORDS = {
  // Group 1: [s] Sound (Voiceless ending -> [s])
  w01: { id: "w01", word: "cats", stem: "cat", s: "s", syl: "cats", krSyl: "캣츠", ipa: "[kæts]", kr: "고양이들", group: "g1", sound: "s", soundName: "[s] 무성음 (떨림 0%)", tip: "t(무성음) 뒤: 성대 안 떨리는 가벼운 [s]", m: "m_w01_cats", f: "f_w01_cats" },
  w02: { id: "w02", word: "cups", stem: "cup", s: "s", syl: "cups", krSyl: "컵스", ipa: "[kʌps]", kr: "컵들", group: "g1", sound: "s", soundName: "[s] 무성음 (떨림 0%)", tip: "p(무성음) 뒤: 입술 닫았다 터지는 [s]", m: "m_w02_cups", f: "f_w02_cups" },
  w03: { id: "w03", word: "books", stem: "book", s: "s", syl: "books", krSyl: "북스", ipa: "[bʊks]", kr: "책들", group: "g1", sound: "s", soundName: "[s] 무성음 (떨림 0%)", tip: "k(무성음) 뒤: 혀 뒤쪽 막았다 터지는 [s]", m: "m_w03_books", f: "f_w03_books" },
  w04: { id: "w04", word: "laughs", stem: "laugh", s: "s", syl: "laughs", krSyl: "래프스", ipa: "[læfs]", kr: "웃는다", group: "g1", sound: "s", soundName: "[s] 무성음 (떨림 0%)", tip: "gh=[f](무성음) 뒤: 윗니+입술 마찰 [s]", m: "m_w04_laughs", f: "f_w04_laughs" },
  w05: { id: "w05", word: "stops", stem: "stop", s: "s", syl: "stops", krSyl: "스탑스", ipa: "[stɑːps]", kr: "멈춘다", group: "g1", sound: "s", soundName: "[s] 무성음 (떨림 0%)", tip: "p(무성음) 뒤: 단단하게 끊기는 [s]", m: "m_w05_stops", f: "f_w05_stops" },
  w06: { id: "w06", word: "sleeps", stem: "sleep", s: "s", syl: "sleeps", krSyl: "슬립스", ipa: "[sliːps]", kr: "잔다", group: "g1", sound: "s", soundName: "[s] 무성음 (떨림 0%)", tip: "p(무성음) 뒤: 깔끔하게 새는 [s]", m: "m_w06_sleeps", f: "f_w06_sleeps" },

  // Group 2: [z] Sound (Voiced ending -> [z])
  w07: { id: "w07", word: "dogs", stem: "dog", s: "s", syl: "dogs", krSyl: "도그즈", ipa: "[dɔːɡz]", kr: "개들", group: "g2", sound: "z", soundName: "[z] 유성음 (떨림 100%)", tip: "g(유성음) 뒤: 성대가 울리며 부드러운 [z]", m: "m_w07_dogs", f: "f_w07_dogs" },
  w08: { id: "w08", word: "plays", stem: "play", s: "s", syl: "plays", krSyl: "플레이즈", ipa: "[pleɪz]", kr: "논다 / 연주한다", group: "g2", sound: "z", soundName: "[z] 유성음 (떨림 100%)", tip: "모음(유성음) 뒤: 성대 진동 100% 이어지는 [z]", m: "m_w08_plays", f: "f_w08_plays" },
  w09: { id: "w09", word: "pens", stem: "pen", s: "s", syl: "pens", krSyl: "펜즈", ipa: "[pɛnz]", kr: "펜들", group: "g2", sound: "z", soundName: "[z] 유성음 (떨림 100%)", tip: "n(비음/유성음) 콧소리 울림 그대로 [z]", m: "m_w09_pens", f: "f_w09_pens" },
  w10: { id: "w10", word: "calls", stem: "call", s: "s", syl: "calls", krSyl: "콜즈", ipa: "[kɔːlz]", kr: "부른다 / 전화한다", group: "g2", sound: "z", soundName: "[z] 유성음 (떨림 100%)", tip: "l(유성음) 잇몸 울림 타고 나오는 [z]", m: "m_w10_calls", f: "f_w10_calls" },
  w11: { id: "w11", word: "loves", stem: "love", s: "s", syl: "loves", krSyl: "러브즈", ipa: "[lʌvz]", kr: "사랑한다", group: "g2", sound: "z", soundName: "[z] 유성음 (떨림 100%)", tip: "v(유성음) 입술 진동과 함께 울리는 [z]", m: "m_w11_loves", f: "f_w11_loves" },
  w12: { id: "w12", word: "dreams", stem: "dream", s: "s", syl: "dreams", krSyl: "드림즈", ipa: "[driːmz]", kr: "꿈꾼다 / 꿈들", group: "g2", sound: "z", soundName: "[z] 유성음 (떨림 100%)", tip: "m(비음/유성음) 입술 닫고 울리는 [z]", m: "m_w12_dreams", f: "f_w12_dreams" },

  // Group 3: [ɪz] Cushion Vowel (+1 Syllable)
  w13: { id: "w13", word: "bu · ses", stem: "bu · ", s: "ses", syl: "bu · ses", krSyl: "버시즈", ipa: "[ˈbʌsɪz]", kr: "버스들", group: "g3", sound: "iz", soundName: "[ɪz] 쿠션 모음 (+1음절)", tip: "s 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w13_buses", f: "f_w13_buses" },
  w14: { id: "w14", word: "wat · ches", stem: "wat · ", s: "ches", syl: "wat · ches", krSyl: "와치즈", ipa: "[ˈwɑːtʃɪz]", kr: "지켜본다 / 시계들", group: "g3", sound: "iz", soundName: "[ɪz] 쿠션 모음 (+1음절)", tip: "ch 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w14_watches", f: "f_w14_watches" },
  w15: { id: "w15", word: "box · es", stem: "box · ", s: "es", syl: "box · es", krSyl: "박시즈", ipa: "[ˈbɑːksɪz]", kr: "상자들", group: "g3", sound: "iz", soundName: "[ɪz] 쿠션 모음 (+1음절)", tip: "x([ks]) 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w15_boxes", f: "f_w15_boxes" },
  w16: { id: "w16", word: "clas · ses", stem: "clas · ", s: "ses", syl: "clas · ses", krSyl: "클래시즈", ipa: "[ˈklæsɪz]", kr: "수업들", group: "g3", sound: "iz", soundName: "[ɪz] 쿠션 모음 (+1음절)", tip: "ss 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w16_classes", f: "f_w16_classes" },
  w17: { id: "w17", word: "chan · ges", stem: "chan · ", s: "ges", syl: "chan · ges", krSyl: "체인지즈", ipa: "[ˈtʃeɪndʒɪz]", kr: "변화들 / 바꾼다", group: "g3", sound: "iz", soundName: "[ɪz] 쿠션 모음 (+1음절)", tip: "ge([dʒ]) 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w17_changes", f: "f_w17_changes" },
  w18: { id: "w18", word: "wish · es", stem: "wish · ", s: "es", syl: "wish · es", krSyl: "위시즈", ipa: "[ˈwɪʃɪz]", kr: "소원들 / 바란다", group: "g3", sound: "iz", soundName: "[ɪz] 쿠션 모음 (+1음절)", tip: "sh 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w18_wishes", f: "f_w18_wishes" },

  // Group 4: [ɪz] Special Exceptions & Function Words
  w19: { id: "w19", word: "hou · ses", stem: "hou · ", s: "ses", syl: "hou · ses", krSyl: "하우지즈", ipa: "[ˈhaʊzɪz]", kr: "집들 (특수 예외!)", group: "g4", sound: "iz-ex", soundName: "[ɪz] 어간 유성음화 특수 예외", tip: "단수 house[s] ➔ 복수형은 어간까지 유성음화 [zɪz]!", m: "m_w19_houses", f: "f_w19_houses" },
  w20: { id: "w20", word: "pri · zes", stem: "pri · ", s: "zes", syl: "pri · zes", krSyl: "프라이즈즈", ipa: "[ˈpraɪzɪz]", kr: "상들", group: "g4", sound: "iz-ex", soundName: "[ɪz] 치찰음 쿠션", tip: "z 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w20_prizes", f: "f_w20_prizes" },
  w21: { id: "w21", word: "is", stem: "i", s: "s", syl: "is", krSyl: "이즈", ipa: "[ɪz]", kr: "~이다 (기능어)", group: "g4", sound: "z", soundName: "[z] 기능어 필수 울림", tip: "is의 s는 무조건 성대 울리는 [z]!", m: "m_w21_is", f: "f_w21_is" },
  w22: { id: "w22", word: "was", stem: "wa", s: "s", syl: "was", krSyl: "워즈", ipa: "[wɑːz]", kr: "~였다 (기능어)", group: "g4", sound: "z", soundName: "[z] 기능어 필수 울림", tip: "was의 s도 모음 뒤 유성음 [z]!", m: "m_w22_was", f: "f_w22_was" },
  w23: { id: "w23", word: "has", stem: "ha", s: "s", syl: "has", krSyl: "해즈", ipa: "[hæz]", kr: "가지고 있다 (기능어)", group: "g4", sound: "z", soundName: "[z] 기능어 필수 울림", tip: "has의 s도 성대 울리는 [z]!", m: "m_w23_has", f: "f_w23_has" },
  w24: { id: "w24", word: "does", stem: "doe", s: "s", syl: "does", krSyl: "더즈", ipa: "[dʌz]", kr: "한다 (기능어)", group: "g4", sound: "z", soundName: "[z] 기능어 필수 울림", tip: "does의 s도 부드러운 유성음 [z]!", m: "m_w24_does", f: "f_w24_does" }
};

// Helper to format word with neutral stem + highlighted -S suffix
function formatWordHtml(w) {
  const cls = w.sound === 's' ? 's-s' : (w.sound === 'z' ? 's-z' : (w.sound === 'iz' ? 's-iz' : 's-ex'));
  return `<span class="word-stem">${w.stem}</span><span class="word-s ${cls}">${w.s}</span>`;
}

// 7 Dialogue Sentences with target word highlights & syllable breakdown tips
const DIALOGUES = [
  {
    id: "01",
    en: "Cats and dogs are great pets.",
    enHtml: '<span class="hl-s">Cats</span> and <span class="hl-z">dogs</span> are great <span class="hl-s">pets</span>.',
    kr: "고양이와 개는 훌륭한 반려동물입니다.",
    pairBadge: "Cats [s] vs dogs [z] vs pets [s]",
    sylTip: "💡 무성음 t 뒤 [s] vs 유성음 g 뒤 [z] 대비!",
    audio: "dial_01",
    targetWords: ["Cats", "dogs", "pets"]
  },
  {
    id: "02",
    en: "She plays games and calls him.",
    enHtml: 'She <span class="hl-z">plays</span> games and <span class="hl-z">calls</span> him.',
    kr: "그녀는 게임을 하고 그에게 전화를 건다.",
    pairBadge: "plays [z] & calls [z]",
    sylTip: "💡 모음과 l(유성음) 뒤 부드러운 [z] 울림!",
    audio: "dial_02",
    targetWords: ["plays", "calls"]
  },
  {
    id: "03",
    en: "He watches the buses stop.",
    enHtml: 'He <span class="hl-iz">watches</span> the <span class="hl-iz">buses</span> stop.',
    kr: "그는 버스들이 멈추는 것을 본다.",
    pairBadge: "watches [ɪz] & buses [ɪz]",
    sylTip: "💡 ch, s 치찰음 뒤 쿠션 모음 [ɪz]로 음절 증가!",
    audio: "dial_03",
    targetWords: ["watches", "buses"]
  },
  {
    id: "04",
    en: "Open the boxes and see the changes.",
    enHtml: 'Open the <span class="hl-iz">boxes</span> and see the <span class="hl-iz">changes</span>.',
    kr: "상자들을 열고 변화들을 살펴보세요.",
    pairBadge: "boxes [ɪz] & changes [ɪz]",
    sylTip: "💡 x와 ge 치찰음 뒤 쿠션 모음 [ɪz]!",
    audio: "dial_04",
    targetWords: ["boxes", "changes"]
  },
  {
    id: "05",
    en: "She loves books and laughs a lot.",
    enHtml: 'She <span class="hl-z">loves</span> <span class="hl-s">books</span> and <span class="hl-s">laughs</span> a lot.',
    kr: "그녀는 책을 좋아하고 많이 웃는다.",
    pairBadge: "loves [z] vs books [s] & laughs [s]",
    sylTip: "💡 v(유성음) 뒤 [z] vs k, gh(무성음) 뒤 [s]!",
    audio: "dial_05",
    targetWords: ["loves", "books", "laughs"]
  },
  {
    id: "06",
    en: "The old houses had many rooms.",
    enHtml: 'The old <span class="hl-ex">houses</span> had many <span class="hl-z">rooms</span>.',
    kr: "그 오래된 집들은 방이 많았다.",
    pairBadge: "houses [zɪz] 특수 예외 & rooms [z]",
    sylTip: "💡 house[s] 복수형은 어간까지 울려 [haʊzɪz]!",
    audio: "dial_06",
    targetWords: ["houses", "rooms"]
  },
  {
    id: "07",
    en: "He has two pens and does his best.",
    enHtml: 'He <span class="hl-z">has</span> two <span class="hl-z">pens</span> and <span class="hl-z">does</span> his best.',
    kr: "그는 펜 두 자루를 가지고 최선을 다한다.",
    pairBadge: "has [z] & pens [z] & does [z]",
    sylTip: "💡 필수 기능어 has, does의 S는 무조건 [z] 울림!",
    audio: "dial_07",
    targetWords: ["has", "pens", "does"]
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
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap;
  }
  .tip-badge {
    background: #EF4444; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 90cqw; display: flex; gap: 2.4cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .compare-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 26px; padding: 3.5cqh 1.6cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.8cqh;
  }
  .card-label {
    font-size: 1.1cqw; font-weight: 900; padding: 0.4cqh 1.2cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .label-s { background: #FEE2E2; color: #991B1B; }
  .label-z { background: #DBEAFE; color: #1E40AF; }
  .label-iz { background: #D1FAE5; color: #065F46; }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 4.1cqw; line-height: 1.0;
    letter-spacing: -0.02em; white-space: nowrap;
  }
  .word-stem { color: #111111; }
  .word-s {
    display: inline-block;
    border-bottom-width: 5px;
    border-bottom-style: solid;
    padding-bottom: 2px;
  }
  .word-s.s-s { color: #DC2626; border-color: #DC2626; }
  .word-s.s-z { color: #2563EB; border-color: #2563EB; }
  .word-s.s-iz { color: #059669; border-color: #059669; }
  .syl-pill {
    font-family: 'Noto Sans KR', sans-serif; font-size: 1.55cqw; font-weight: 900;
    padding: 0.4cqh 1.2cqw; border-radius: 12px; border: 2px solid #111111;
    box-shadow: 2px 2px 0px #111111; white-space: nowrap;
  }
  .pill-s { background: #FEE2E2; color: #991B1B; }
  .pill-z { background: #DBEAFE; color: #1E40AF; }
  .pill-iz { background: #D1FAE5; color: #065F46; }
  .meaning-text {
    font-size: 1.8cqw; font-weight: 800; color: #4B5563; white-space: nowrap;
  }
  .status-badge {
    font-size: 1.15cqw; font-weight: 900; padding: 0.6cqh 1.4cqw; border-radius: 12px;
    border: 2px solid #111111; white-space: nowrap;
  }
  .badge-warn { background: #FEF3C7; color: #92400E; }
  .badge-correct { background: #D1FAE5; color: #065F46; }
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
    <span class="tip-badge">충격 진실</span>
    <span>단어 끝 S, 전부 '스'로 읽으면 원어민은 전혀 못 알아듣습니다!</span>
  </div>

  <div class="stage">
    <!-- Card 1: cats [s] -->
    <div class="compare-card">
      <div class="card-label label-s">[s] 무성음 (떨림 0%)</div>
      <div class="word-text">${formatWordHtml(WORDS.w01)}</div>
      <div class="syl-pill pill-s">${WORDS.w01.krSyl} ${WORDS.w01.ipa}</div>
      <div class="meaning-text">${WORDS.w01.kr}</div>
      <div class="status-badge badge-correct">✓ 가볍게 새는 [s]</div>
    </div>

    <!-- Card 2: dogs [z] -->
    <div class="compare-card">
      <div class="card-label label-z">[z] 유성음 (떨림 100%)</div>
      <div class="word-text">${formatWordHtml(WORDS.w07)}</div>
      <div class="syl-pill pill-z">${WORDS.w07.krSyl} ${WORDS.w07.ipa}</div>
      <div class="meaning-text">${WORDS.w07.kr}</div>
      <div class="status-badge badge-warn">⚠️ 독스 ➔ [도그즈] 성대 울림!</div>
    </div>

    <!-- Card 3: bu · ses [ɪz] -->
    <div class="compare-card">
      <div class="card-label label-iz">[ɪz] 쿠션 모음 (+1음절)</div>
      <div class="word-text">${formatWordHtml(WORDS.w13)}</div>
      <div class="syl-pill pill-iz">${WORDS.w13.krSyl} ${WORDS.w13.ipa}</div>
      <div class="meaning-text">${WORDS.w13.kr}</div>
      <div class="status-badge badge-correct">✓ 혀 꼬임 방지 [버시즈]!</div>
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
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap;
  }
  .tip-badge {
    background: #2563EB; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 90cqw; display: flex; gap: 2.5cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .rule-card {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 24px; padding: 3.5cqh 2.2cqw; display: flex; flex-direction: column; gap: 1.6cqh;
  }
  .rule-card.active-s { border-color: #DC2626; background: #FEF2F2; box-shadow: 8px 8px 0px #DC2626; }
  .rule-card.active-z { border-color: #2563EB; background: #EFF6FF; box-shadow: 8px 8px 0px #2563EB; }
  .rule-card.active-iz { border-color: #059669; background: #F0FDF4; box-shadow: 8px 8px 0px #059669; }
  .rule-header {
    display: flex; justify-content: space-between; align-items: center;
  }
  .rule-title {
    font-size: 1.6cqw; font-weight: 900;
  }
  .rule-badge {
    font-size: 1cqw; font-weight: 900; padding: 0.4cqh 1.1cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .badge-s { background: #FEE2E2; color: #991B1B; }
  .badge-z { background: #DBEAFE; color: #1E40AF; }
  .badge-iz { background: #D1FAE5; color: #065F46; }
  .rule-desc {
    font-size: 1.25cqw; font-weight: 700; color: #374151; line-height: 1.5;
  }
  .rule-formula {
    background: #FFFFFF; border: 2px solid #111111; border-radius: 14px;
    padding: 1.2cqh 1.4cqw; display: flex; flex-direction: column; gap: 0.6cqh;
  }
  .formula-label {
    font-size: 1.05cqw; font-weight: 900; color: #6B7280;
  }
  .formula-content {
    font-size: 1.3cqw; font-weight: 900; color: #111111;
  }
  .example-pill {
    background: #F3F4F6; border: 1.5px solid #111111; border-radius: 8px;
    padding: 0.3cqh 0.8cqw; font-size: 1.1cqw; font-weight: 900; display: inline-block;
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
    <span class="tip-badge">조음 물리법칙</span>
    <span>목청에 손을 대보세요! 떨림 유무가 끝소리를 결정합니다</span>
  </div>

  <div class="stage">
    <!-- Rule 1: [s] sound -->
    <div class="rule-card" id="cardS">
      <div class="rule-header">
        <span class="rule-title" style="color:#DC2626;">① [s] 무성음</span>
        <span class="rule-badge badge-s">목청 떨림 0%</span>
      </div>
      <div class="rule-desc">
        목청이 안 떨리는 가벼운 소리 뒤에서는 똑같이 성대가 안 떨리는 <strong>'스'</strong>로 끝납니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">끝소리 조건</span>
        <span class="formula-content">p, t, k, f, θ 뒤</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">cats [캣츠] · cups [컵스] · books [북스]</span>
      </div>
    </div>

    <!-- Rule 2: [z] sound -->
    <div class="rule-card" id="cardZ">
      <div class="rule-header">
        <span class="rule-title" style="color:#2563EB;">② [z] 유성음</span>
        <span class="rule-badge badge-z">목청 떨림 100%</span>
      </div>
      <div class="rule-desc">
        목청이 부르르 울리는 유성음 뒤에서는 부드러운 <strong>'즈'</strong> 소리가 자연스럽게 납니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">끝소리 조건</span>
        <span class="formula-content">모음 및 b, d, g, v, m, n, l, r 뒤</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">dogs [도그즈] · plays [플레이즈] · pens [펜즈]</span>
      </div>
    </div>

    <!-- Rule 3: [ɪz] sound -->
    <div class="rule-card" id="cardIz">
      <div class="rule-header">
        <span class="rule-title" style="color:#059669;">③ [ɪz] 치찰음 쿠션</span>
        <span class="rule-badge badge-iz">음절 +1 증가</span>
      </div>
      <div class="rule-desc">
        이미 입안에서 바람 소리가 나는 단어는 혀가 꼬이지 않게 쿠션 모음을 넣어 <strong>'이즈'</strong>로 늘어납니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">끝소리 조건</span>
        <span class="formula-content">s, z, sh, ch, x, ge 뒤</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">bu · ses [버시즈] · wat · ches [와치즈]</span>
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

    tl.call(function() {
      document.getElementById("cardS").className = "rule-card active-s";
    }, null, 5.0);

    tl.call(function() {
      document.getElementById("cardS").className = "rule-card";
      document.getElementById("cardZ").className = "rule-card active-z";
    }, null, 16.0);

    tl.call(function() {
      document.getElementById("cardZ").className = "rule-card";
      document.getElementById("cardIz").className = "rule-card active-iz";
    }, null, 27.5);

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

// 3~6. Generator for Group Frames (F03, F04, F05, F06) with 6-Word Drill & 6-Repeat Dot Indicator
function generateGroupFrame(frameId, groupNum, groupTitle, wordKeys, eyebrowTip, badgeStyle) {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  wordKeys.forEach((wKey, wIdx) => {
    const w = WORDS[wKey];
    const m_dur = getDur(w.m);
    const f_dur = getDur(w.f);

    animEvents.push({
      time: curTime,
      type: "focus_word",
      word: w,
      wIdx: wIdx,
      totalWords: wordKeys.length
    });

    // 6-rep listening: Male -> Female -> Male -> Female -> Male -> Female
    // Rep 1 (Male)
    audioTags.push(`<audio id="a_${w.id}_0" src="assets/voice/${w.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", dotIdx: 1 });
    curTime += m_dur + 0.55;

    // Rep 2 (Female)
    audioTags.push(`<audio id="a_${w.id}_1" src="assets/voice/${w.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", dotIdx: 2 });
    curTime += f_dur + 0.55;

    // Rep 3 (Male)
    audioTags.push(`<audio id="a_${w.id}_2" src="assets/voice/${w.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", dotIdx: 3 });
    curTime += m_dur + 0.55;

    // Rep 4 (Female)
    audioTags.push(`<audio id="a_${w.id}_3" src="assets/voice/${w.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", dotIdx: 4 });
    curTime += f_dur + 0.55;

    // Rep 5 (Male)
    audioTags.push(`<audio id="a_${w.id}_4" src="assets/voice/${w.m}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${m_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", dotIdx: 5 });
    curTime += m_dur + 0.55;

    // Rep 6 (Female)
    audioTags.push(`<audio id="a_${w.id}_5" src="assets/voice/${w.f}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${f_dur.toFixed(2)}"></audio>`);
    animEvents.push({ time: curTime, type: "dot", dotIdx: 6 });
    curTime += f_dur + 0.95;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "focus_word") {
      animScriptCode += `  tl.call(function() {
    setWord(${JSON.stringify(e.word)}, ${e.wIdx + 1}, ${e.totalWords});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "dot") {
      animScriptCode += `  tl.call(function() {
    setDot(${e.dotIdx});
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
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap;
  }
  .tip-badge {
    ${badgeStyle} border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 65cqw; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 5;
  }
  .drill-card {
    width: 100%; background: #FFFFFF; border: 4px solid #111111; box-shadow: 8px 8px 0px #111111;
    border-radius: 28px; padding: 4cqh 3cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.8cqh;
  }
  .card-top {
    display: flex; justify-content: space-between; align-items: center; width: 100%;
  }
  .word-counter {
    font-size: 1.2cqw; font-weight: 900; color: #6B7280; background: #F3F4F6;
    padding: 0.3cqh 1.2cqw; border-radius: 999px; border: 2px solid #111111;
    white-space: nowrap; flex-shrink: 0;
  }
  .card-label {
    font-size: 1.25cqw; font-weight: 900; padding: 0.5cqh 1.5cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.0;
    letter-spacing: -0.02em; white-space: nowrap;
  }
  .word-stem { color: #111111; }
  .word-s {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .word-s.s-s { color: #DC2626; border-color: #DC2626; }
  .word-s.s-z { color: #2563EB; border-color: #2563EB; }
  .word-s.s-iz { color: #059669; border-color: #059669; }
  .word-s.s-ex { color: #D97706; border-color: #D97706; }
  .ipa-text {
    font-size: 2.2cqw; font-weight: 800; color: #4B5563; white-space: nowrap;
  }
  .meaning-text {
    font-size: 2.8cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  .tip-box {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 14px;
    padding: 0.8cqh 2cqw; font-size: 1.35cqw; font-weight: 800; color: #111111;
    white-space: nowrap;
  }
  /* Indicator Dots only - clean, no extra meta text */
  .dots-wrapper {
    display: flex; gap: 0.8cqw; justify-content: center; align-items: center; margin-top: 0.8cqh;
  }
  .dot {
    width: 1.2cqw; height: 1.2cqw; border-radius: 50%;
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
    <div class="drill-card" id="drillCard">
      <div class="card-top">
        <div id="wordCounter" class="word-counter">단어 1 / 6</div>
        <div id="cardLabel" class="card-label">로딩 중</div>
      </div>
      <div id="wordText" class="word-text">cats</div>
      <div id="ipaText" class="ipa-text">[kæts]</div>
      <div id="meaningText" class="meaning-text">고양이들</div>
      <div id="tipBox" class="tip-box">조음 팁 안내</div>
      <div class="dots-wrapper">
        <div class="dot" id="dot1"></div>
        <div class="dot" id="dot2"></div>
        <div class="dot" id="dot3"></div>
        <div class="dot" id="dot4"></div>
        <div class="dot" id="dot5"></div>
        <div class="dot" id="dot6"></div>
      </div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>
<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var wordCounter = document.getElementById("wordCounter");
    var cardLabel = document.getElementById("cardLabel");
    var wordText = document.getElementById("wordText");
    var ipaText = document.getElementById("ipaText");
    var meaningText = document.getElementById("meaningText");
    var tipBox = document.getElementById("tipBox");
    var drillCard = document.getElementById("drillCard");
    var dots = [
      document.getElementById("dot1"),
      document.getElementById("dot2"),
      document.getElementById("dot3"),
      document.getElementById("dot4"),
      document.getElementById("dot5"),
      document.getElementById("dot6")
    ];

    function setWord(w, idx, total) {
      wordCounter.textContent = "단어 " + idx + " / " + total;
      cardLabel.textContent = w.soundName;
      var bg = "#FEE2E2", textCol = "#991B1B";
      if (w.sound === "z") { bg = "#DBEAFE"; textCol = "#1E40AF"; }
      else if (w.sound === "iz") { bg = "#D1FAE5"; textCol = "#065F46"; }
      else if (w.sound === "iz-ex") { bg = "#FEF3C7"; textCol = "#92400E"; }
      cardLabel.style.background = bg;
      cardLabel.style.color = textCol;

      var cls = w.sound === "s" ? "s-s" : (w.sound === "z" ? "s-z" : (w.sound === "iz" ? "s-iz" : "s-ex"));
      wordText.innerHTML = '<span class="word-stem">' + w.stem + '</span><span class="word-s ' + cls + '">' + w.s + '</span>';
      ipaText.textContent = w.krSyl + " " + w.ipa;
      meaningText.textContent = w.kr;
      tipBox.textContent = "💡 " + w.tip;

      dots.forEach(function(d) { d.className = "dot"; });
      gsap.fromTo(drillCard, { scale: 0.97 }, { scale: 1, duration: 0.25, ease: "back.out(1.5)" });
    }

    function setDot(dotIdx) {
      dots.forEach(function(d, i) {
        if (i < dotIdx) {
          d.className = "dot active";
        } else {
          d.className = "dot";
        }
      });
      gsap.fromTo(wordText, { scale: 1.05 }, { scale: 1, duration: 0.18, ease: "power1.out" });
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

// 7. Frame 07: Real Conversation Dialogue
function generateF07() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  DIALOGUES.forEach((d, idx) => {
    const dur = getDur(d.audio);
    animEvents.push({ time: curTime, dialogue: d, idx: idx + 1, total: DIALOGUES.length });
    audioTags.push(`<audio id="dia_${d.id}" src="assets/voice/${d.audio}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);
    curTime += dur + 1.2;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    animScriptCode += `  tl.call(function() {
    showDialogue(${JSON.stringify(e.dialogue)});
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
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .bg-video {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    object-fit: cover; opacity: 0.28; z-index: 1; filter: saturate(1.2);
    transform: scale(1.05); transform-origin: center center;
  }
  .eyebrow-pill {
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; z-index: 10; display: inline-flex; align-items: center; white-space: nowrap;
  }
  .eyebrow-pill span { white-space: nowrap; }
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
    white-space: nowrap; flex-shrink: 0;
  }
  .sentence-en {
    font-family: 'Archivo Black', sans-serif; font-size: 3.6cqw; line-height: 1.35;
    color: #111111;
  }
  .hl-s {
    color: #991B1B; border-bottom: 5px solid #DC2626; padding-bottom: 2px;
    display: inline-block; background: #FEE2E2; padding-left: 6px; padding-right: 6px; border-radius: 6px;
  }
  .hl-z {
    color: #1E40AF; border-bottom: 5px solid #2563EB; padding-bottom: 2px;
    display: inline-block; background: #DBEAFE; padding-left: 6px; padding-right: 6px; border-radius: 6px;
  }
  .hl-iz {
    color: #065F46; border-bottom: 5px solid #059669; padding-bottom: 2px;
    display: inline-block; background: #D1FAE5; padding-left: 6px; padding-right: 6px; border-radius: 6px;
  }
  .hl-ex {
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
  <video id="bgVideo" class="bg-video" src="assets/videos/f07_dialogue_ambience.mp4" autoplay loop muted data-start="0" data-duration="${totalDur.toFixed(2)}" data-hf-media-start-basis="local" data-layout-allow-overflow></video>

  <div class="eyebrow-pill">
    <span>💬 실전 회화 문맥 속 -S · -ES 발음 청취 (7문장 집중 훈련)</span>
  </div>

  <div class="stage">
    <div class="dialogue-card" id="dialCard">
      <div id="dialTag" class="tag-pill">Cats [s] vs dogs [z]</div>
      <div id="dialEn" class="sentence-en"><span class="hl-s">Cats</span> and <span class="hl-z">dogs</span> are great <span class="hl-s">pets</span>.</div>
      <div id="dialKr" class="sentence-kr">고양이와 개는 훌륭한 반려동물입니다.</div>
      <div id="dialSylTip" class="syl-tip-box">💡 무성음 t 뒤 [s] vs 유성음 g 뒤 [z] 대비!</div>
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

// 8. Frame 08: 24-Word Shuffle Quiz
function generateF08() {
  const allWordKeys = Object.keys(WORDS);
  const quizItems = allWordKeys.map(k => WORDS[k]);

  // Deterministic shuffle
  for (let i = quizItems.length - 1; i > 0; i--) {
    const j = (i * 7 + 11) % (i + 1);
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
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; z-index: 10; display: inline-flex; align-items: center; white-space: nowrap;
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
    white-space: nowrap; display: none;
  }
  .word-stem { color: #111111; }
  .word-s {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .word-s.s-s { color: #DC2626; border-color: #DC2626; }
  .word-s.s-z { color: #2563EB; border-color: #2563EB; }
  .word-s.s-iz { color: #059669; border-color: #059669; }
  .word-s.s-ex { color: #D97706; border-color: #D97706; }
  .answer-meta {
    display: none; flex-direction: column; align-items: center; gap: 0.8cqh;
  }
  .answer-ipa {
    font-size: 2cqw; font-weight: 800; color: #4B5563; white-space: nowrap;
  }
  .answer-rule {
    font-size: 1.35cqw; font-weight: 900; padding: 0.5cqh 1.8cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="08-shuffle" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span>🎧 24단어 무작위 덱 셔플 귀 훈련 (끝소리가 [s], [z], [ɪz] 중 무엇일까요?)</span>
  </div>

  <div class="stage">
    <div class="quiz-card" id="quizCard">
      <div id="quizCounter" class="quiz-counter">퀴즈 1 / 24</div>
      <div id="quizBadge" class="question-badge">❓ 원어민 발음을 듣고 끝소리를 맞혀보세요</div>
      <div id="blindBox" class="blind-box">???</div>
      <div id="answerWord" class="answer-word">cats</div>
      <div id="answerMeta" class="answer-meta">
        <div id="answerIpa" class="answer-ipa">캣츠 [kæts]</div>
        <div id="answerRule" class="answer-rule">[s] 무성음 종결</div>
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
      quizBadge.textContent = "❓ 원어민 발음을 듣고 끝소리를 맞혀보세요";
      quizBadge.style.background = "#FEF3C7";
      quizBadge.style.color = "#92400E";
      blindBox.style.display = "flex";
      answerWord.style.display = "none";
      answerMeta.style.display = "none";
      gsap.fromTo(quizCard, { scale: 0.96 }, { scale: 1, duration: 0.25, ease: "back.out(1.5)" });
    }

    function revealAnswer(w) {
      blindBox.style.display = "none";
      answerWord.style.display = "block";
      answerMeta.style.display = "flex";

      var cls = w.sound === "s" ? "s-s" : (w.sound === "z" ? "s-z" : (w.sound === "iz" ? "s-iz" : "s-ex"));
      answerWord.innerHTML = '<span class="word-stem">' + w.stem + '</span><span class="word-s ' + cls + '">' + w.s + '</span>';
      answerIpa.textContent = w.krSyl + " " + w.ipa + " · " + w.kr;
      answerRule.textContent = w.soundName;

      var bg = "#FEE2E2", textCol = "#991B1B";
      if (w.sound === "z") { bg = "#DBEAFE"; textCol = "#1E40AF"; }
      else if (w.sound === "iz") { bg = "#D1FAE5"; textCol = "#065F46"; }
      else if (w.sound === "iz-ex") { bg = "#FEF3C7"; textCol = "#92400E"; }
      answerRule.style.background = bg;
      answerRule.style.color = textCol;

      quizBadge.textContent = "💡 " + w.tip;
      quizBadge.style.background = "#D1FAE5";
      quizBadge.style.color = "#065F46";

      gsap.fromTo(answerWord, { scale: 0.85 }, { scale: 1, duration: 0.35, ease: "back.out(2)" });
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

// 9. Frame 09: 1-Page Summary Cheat Sheet
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
    position: absolute; top: 4.8cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.8cqh 2.2cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; display: inline-flex; align-items: center; gap: 0.8cqw; z-index: 10;
    white-space: nowrap;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .capture-badge {
    background: #10B981; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .stage {
    position: absolute; left: 50%; top: 49%; transform: translate(-50%, -50%);
    width: 92cqw; display: flex; gap: 1.6cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .summary-col {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 5px 5px 0px #111111;
    border-radius: 20px; padding: 2.2cqh 1.3cqw; display: flex; flex-direction: column; gap: 1.2cqh;
  }
  .col-header {
    padding: 1.2cqh 1cqw; border-radius: 12px; border: 2px solid #111111; text-align: center;
  }
  .header-s { background: #FEE2E2; }
  .header-z { background: #DBEAFE; }
  .header-iz { background: #D1FAE5; }
  .header-ex { background: #FEF3C7; }
  .col-title {
    font-size: 1.35cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  .col-sub {
    font-size: 0.95cqw; font-weight: 800; color: #4B5563; margin-top: 0.2cqh; white-space: nowrap;
  }
  .word-list {
    display: flex; flex-direction: column; gap: 0.9cqh; margin-top: 0.5cqh;
  }
  .word-row {
    display: flex; justify-content: space-between; align-items: center;
    background: #FAF7F2; border: 1.5px solid #111111; border-radius: 10px;
    padding: 0.8cqh 1cqw;
  }
  .word-name {
    font-family: 'Archivo Black', sans-serif; font-size: 1.45cqw; color: #111111; white-space: nowrap;
  }
  .word-stem { color: #111111; }
  .word-s {
    display: inline-block;
    border-bottom-width: 3px;
    border-bottom-style: solid;
    padding-bottom: 1px;
  }
  .word-s.s-s { color: #DC2626; border-color: #DC2626; }
  .word-s.s-z { color: #2563EB; border-color: #2563EB; }
  .word-s.s-iz { color: #059669; border-color: #059669; }
  .word-s.s-ex { color: #D97706; border-color: #D97706; }
  .syl-tag {
    font-size: 1.05cqw; font-weight: 900; padding: 0.2cqh 0.7cqw; border-radius: 6px;
    border: 1.5px solid #111111; white-space: nowrap;
  }
  .tag-s { background: #FEE2E2; color: #991B1B; }
  .tag-z { background: #DBEAFE; color: #1E40AF; }
  .tag-iz { background: #D1FAE5; color: #065F46; }
  .tag-ex { background: #FEF3C7; color: #92400E; }
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
    <span>스마트폰 저장용 1장 요약 치트시트 (-S · -ES 발음 완전정복)</span>
  </div>

  <div class="stage">
    <!-- Col 1: [s] -->
    <div class="summary-col">
      <div class="col-header header-s">
        <div class="col-title">[s] 무성음 뒤</div>
        <div class="col-sub">목청 떨림 0% · 터지는 소리</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w01)}</span><span class="syl-tag tag-s">[캣츠]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w02)}</span><span class="syl-tag tag-s">[컵스]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w03)}</span><span class="syl-tag tag-s">[북스]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w04)}</span><span class="syl-tag tag-s">[래프스]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w05)}</span><span class="syl-tag tag-s">[스탑스]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w06)}</span><span class="syl-tag tag-s">[슬립스]</span></div>
      </div>
    </div>

    <!-- Col 2: [z] -->
    <div class="summary-col">
      <div class="col-header header-z">
        <div class="col-title">[z] 유성음 뒤</div>
        <div class="col-sub">목청 떨림 100% · 울리는 소리</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w07)}</span><span class="syl-tag tag-z">[도그즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w08)}</span><span class="syl-tag tag-z">[플레이즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w09)}</span><span class="syl-tag tag-z">[펜즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w10)}</span><span class="syl-tag tag-z">[콜즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w11)}</span><span class="syl-tag tag-z">[러브즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w12)}</span><span class="syl-tag tag-z">[드림즈]</span></div>
      </div>
    </div>

    <!-- Col 3: [ɪz] -->
    <div class="summary-col">
      <div class="col-header header-iz">
        <div class="col-title">[ɪz] 치찰음 뒤</div>
        <div class="col-sub">쿠션 모음 투입 · 음절 +1</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w13)}</span><span class="syl-tag tag-iz">[버시즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w14)}</span><span class="syl-tag tag-iz">[와치즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w15)}</span><span class="syl-tag tag-iz">[박시즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w16)}</span><span class="syl-tag tag-iz">[클래시즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w17)}</span><span class="syl-tag tag-iz">[체인지즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w18)}</span><span class="syl-tag tag-iz">[위시즈]</span></div>
      </div>
    </div>

    <!-- Col 4: Special Exceptions & Function Words -->
    <div class="summary-col">
      <div class="col-header header-ex">
        <div class="col-title">[ɪz] 예외 & 기능어</div>
        <div class="col-sub">어간 유성음화 / 필수 울림</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w19)}</span><span class="syl-tag tag-ex">[하우지즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w20)}</span><span class="syl-tag tag-ex">[프라이즈즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w21)}</span><span class="syl-tag tag-z">[이즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w22)}</span><span class="syl-tag tag-z">[워즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w23)}</span><span class="syl-tag tag-z">[해즈]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w24)}</span><span class="syl-tag tag-z">[더즈]</span></div>
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

// 10. Frame 10: 24-Word Encore & End Screen
function generateF10() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];
  const allWordKeys = Object.keys(WORDS);

  allWordKeys.forEach((wKey, idx) => {
    const w = WORDS[wKey];
    // Alternate male / female
    const isMale = idx % 2 === 0;
    const voiceKey = isMale ? w.m : w.f;
    const dur = getDur(voiceKey);

    animEvents.push({ time: curTime, word: w, idx: idx + 1, total: allWordKeys.length });
    audioTags.push(`<audio id="enc_${w.id}" src="assets/voice/${voiceKey}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);
    curTime += dur + 0.55;
  });

  const encoreAudioEnd = curTime;
  const endScreenDuration = 10.0;
  const totalDur = encoreAudioEnd + endScreenDuration;

  let animScriptCode = '';
  animEvents.forEach(e => {
    animScriptCode += `  tl.call(function() {
    setEncoreWord(${JSON.stringify(e.word)}, ${e.idx}, ${e.total});
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
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; z-index: 10; display: inline-flex; align-items: center; white-space: nowrap;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 65cqw; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 5;
  }
  .encore-card {
    width: 100%; background: #FFFFFF; border: 4px solid #111111; box-shadow: 8px 8px 0px #111111;
    border-radius: 28px; padding: 5cqh 4cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2cqh;
  }
  .encore-counter {
    font-size: 1.25cqw; font-weight: 900; color: #6B7280; background: #F3F4F6;
    padding: 0.4cqh 1.4cqw; border-radius: 999px; border: 2px solid #111111;
    white-space: nowrap; flex-shrink: 0;
  }
  .card-label {
    font-size: 1.3cqw; font-weight: 900; padding: 0.6cqh 1.8cqw; border-radius: 999px;
    border: 2px solid #111111; white-space: nowrap; flex-shrink: 0;
  }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 7cqw; line-height: 1.0;
    letter-spacing: -0.02em; white-space: nowrap;
  }
  .word-stem { color: #111111; }
  .word-s {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .word-s.s-s { color: #DC2626; border-color: #DC2626; }
  .word-s.s-z { color: #2563EB; border-color: #2563EB; }
  .word-s.s-iz { color: #059669; border-color: #059669; }
  .word-s.s-ex { color: #D97706; border-color: #D97706; }
  .ipa-text {
    font-size: 2.2cqw; font-weight: 800; color: #4B5563; white-space: nowrap;
  }
  .meaning-text {
    font-size: 2.8cqw; font-weight: 900; color: #111111; white-space: nowrap;
  }
  .end-overlay {
    position: absolute; inset: 0; width: 100%; height: 100%;
    background: #F4EFE6; display: flex; flex-direction: column;
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
    <span>🔁 24단어 논스톱 앵콜 총복습 (자막 없이 귀로만 소리를 캐치해 보세요)</span>
  </div>

  <div class="stage" id="encoreStage">
    <div class="encore-card">
      <div id="encCounter" class="encore-counter">1 / 24</div>
      <div id="encLabel" class="card-label">[s] 무성음</div>
      <div id="encWord" class="word-text">cats</div>
      <div id="encIpa" class="ipa-text">캣츠 [kæts]</div>
      <div id="encMeaning" class="meaning-text">고양이들</div>
    </div>
  </div>

  <!-- End Screen Elements Overlay (10s) -->
  <div class="end-overlay" id="endOverlay">
    <div class="end-title">매일 10분, 귀가 뚫리는 쉬운 영어</div>
    <div class="end-sub">구독과 좋아요를 누르시면 다음 발음 훈련 영상을 놓치지 않습니다!</div>
    <div class="end-boxes">
      <div class="end-box">
        <div class="end-box-badge">추천 영상</div>
        <div class="end-box-title">EP22: -ED 과거형 끝소리 3가지 물리법칙 [t] vs [d] vs [ɪd]</div>
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

    var encCounter = document.getElementById("encCounter");
    var encLabel = document.getElementById("encLabel");
    var encWord = document.getElementById("encWord");
    var encIpa = document.getElementById("encIpa");
    var encMeaning = document.getElementById("encMeaning");

    function setEncoreWord(w, idx, total) {
      encCounter.textContent = idx + " / " + total;
      encLabel.textContent = w.soundName;

      var cls = w.sound === "s" ? "s-s" : (w.sound === "z" ? "s-z" : (w.sound === "iz" ? "s-iz" : "s-ex"));
      encWord.innerHTML = '<span class="word-stem">' + w.stem + '</span><span class="word-s ' + cls + '">' + w.s + '</span>';
      encIpa.textContent = w.krSyl + " " + w.ipa;
      encMeaning.textContent = w.kr;

      var bg = "#FEE2E2", textCol = "#991B1B";
      if (w.sound === "z") { bg = "#DBEAFE"; textCol = "#1E40AF"; }
      else if (w.sound === "iz") { bg = "#D1FAE5"; textCol = "#065F46"; }
      else if (w.sound === "iz-ex") { bg = "#FEF3C7"; textCol = "#92400E"; }
      encLabel.style.background = bg;
      encLabel.style.color = textCol;
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
console.log("Generating 10 frames for EP27 (-S · -ES Ending Rules)...");

const f01 = generateF01();
fs.writeFileSync(path.join(outFramesDir, "01-hook.html"), f01.html, "utf8");

const f02 = generateF02();
fs.writeFileSync(path.join(outFramesDir, "02-principle.html"), f02.html, "utf8");

const f03 = generateGroupFrame("03-group1", 1, "Group 1: [s] 사운드", ["w01", "w02", "w03", "w04", "w05", "w06"], "무성음 뒤: 성대 떨림 0% · 가볍게 새는 [s]", "background:#EF4444; color:#FFFFFF;");
fs.writeFileSync(path.join(outFramesDir, "03-group1.html"), f03.html, "utf8");

const f04 = generateGroupFrame("04-group2", 2, "Group 2: [z] 사운드", ["w07", "w08", "w09", "w10", "w11", "w12"], "유성음 뒤: 성대 떨림 100% · 울리는 [z]", "background:#2563EB; color:#FFFFFF;");
fs.writeFileSync(path.join(outFramesDir, "04-group2.html"), f04.html, "utf8");

const f05 = generateGroupFrame("05-group3", 3, "Group 3: [ɪz] 사운드", ["w13", "w14", "w15", "w16", "w17", "w18"], "치찰음 뒤: 혀 꼬임 방지 쿠션 모음 투입 · 음절 +1", "background:#059669; color:#FFFFFF;");
fs.writeFileSync(path.join(outFramesDir, "05-group3.html"), f05.html, "utf8");

const f06 = generateGroupFrame("06-group4", 4, "Group 4: [ɪz] 예외 & 기능어", ["w19", "w20", "w21", "w22", "w23", "w24"], "어간 유성음화 특수 예외 & 필수 기능어 울림 [z]", "background:#D97706; color:#FFFFFF;");
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
  { id: "01-hook", file: "01-hook.html", duration: f01.duration, title: "-S, 다 '스'로 읽으셨죠? 3가지 끝소리 차이" },
  { id: "02-principle", file: "02-principle.html", duration: f02.duration, title: "조음 물리법칙 ([s] vs [z] vs [ɪz] 쿠션 원리)" },
  { id: "03-group1", file: "03-group1.html", duration: f03.duration, title: "Group 1: [s] 무성음 6단어 (cats, cups, books...)" },
  { id: "04-group2", file: "04-group2.html", duration: f04.duration, title: "Group 2: [z] 유성음 6단어 (dogs, plays, pens...)" },
  { id: "05-group3", file: "05-group3.html", duration: f05.duration, title: "Group 3: [ɪz] 쿠션 모음 6단어 (bu · ses, wat · ches...)" },
  { id: "06-group4", file: "06-group4.html", duration: f06.duration, title: "Group 4: [ɪz] 특수 예외 & 기능어 6단어 (hou · ses, pri · zes, is...)" },
  { id: "07-dialogue", file: "07-dialogue.html", duration: f07.duration, title: "실전 대화 7문장 (-S 문맥 청취 & 타겟 단어 대비)" },
  { id: "08-shuffle", file: "08-shuffle.html", duration: f08.duration, title: "24단어 무작위 덱 셔플 귀 훈련 (실전 퀴즈)" },
  { id: "09-summary", file: "09-summary.html", duration: f09.duration, title: "스마트폰 캡처용 1장 요약 치트시트" },
  { id: "10-encore", file: "10-encore.html", duration: f10.duration, title: "24단어 무한 앵콜 총복습 & 엔드스크린 10초" }
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

console.log(`\n=== EP27 Timeline Assembled ===`);
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
