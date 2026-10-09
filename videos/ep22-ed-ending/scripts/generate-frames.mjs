import fs from 'fs';
import path from 'path';

const projectDir = path.resolve('videos/ep22-ed-ending');
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
// Syllable rule: monosyllabic words keep original form (walked, stopped),
// multisyllabic words have syllable dot (wan · ted, star · ted, na · ked)
const WORDS = {
  // Group 1: [t] Sound (Voiceless ending -> [t])
  w01: { id: "w01", word: "walked", stem: "walk", ed: "ed", syl: "walked", krSyl: "웍트", ipa: "[wɔːkt]", kr: "걸었다", group: "g1", sound: "t", soundName: "[t] 무성음 (떨림 0%)", tip: "k(무성음) 뒤: 목청 떨림 없이 가볍게 [t]", m: "m_w01_walked", f: "f_w01_walked" },
  w02: { id: "w02", word: "stopped", stem: "stop", ed: "ped", syl: "stopped", krSyl: "스탑트", ipa: "[stɑːpt]", kr: "멈췄다", group: "g1", sound: "t", soundName: "[t] 무성음 (떨림 0%)", tip: "p(무성음) 뒤: 입술 닫았다 터뜨리는 [t]", m: "m_w02_stopped", f: "f_w02_stopped" },
  w03: { id: "w03", word: "laughed", stem: "laugh", ed: "ed", syl: "laughed", krSyl: "래프트", ipa: "[læft]", kr: "웃었다", group: "g1", sound: "t", soundName: "[t] 무성음 (떨림 0%)", tip: "gh가 [f] 소리라 무성음 [t]로 종결", m: "m_w03_laughed", f: "f_w03_laughed" },
  w04: { id: "w04", word: "washed", stem: "wash", ed: "ed", syl: "washed", krSyl: "와쉬트", ipa: "[wɑːʃt]", kr: "씻었다", group: "g1", sound: "t", soundName: "[t] 무성음 (떨림 0%)", tip: "sh(무성음) 뒤: 바람 새듯 깔끔한 [t]", m: "m_w04_washed", f: "f_w04_washed" },
  w05: { id: "w05", word: "watched", stem: "watch", ed: "ed", syl: "watched", krSyl: "와취트", ipa: "[wɑːtʃt]", kr: "지켜봤다", group: "g1", sound: "t", soundName: "[t] 무성음 (떨림 0%)", tip: "ch(무성음) 뒤: 딱 끊어지는 단단한 [t]", m: "m_w05_watched", f: "f_w05_watched" },
  w06: { id: "w06", word: "kissed", stem: "kiss", ed: "ed", syl: "kissed", krSyl: "키스트", ipa: "[kɪst]", kr: "입맞췄다", group: "g1", sound: "t", soundName: "[t] 무성음 (떨림 0%)", tip: "s(무성음) 마찰 후 혀끝 가볍게 [t]", m: "m_w06_kissed", f: "f_w06_kissed" },

  // Group 2: [d] Sound (Voiced ending -> [d])
  w07: { id: "w07", word: "played", stem: "play", ed: "ed", syl: "played", krSyl: "플레이드", ipa: "[pleɪd]", kr: "놀았다 / 연주했다", group: "g2", sound: "d", soundName: "[d] 유성음 (떨림 100%)", tip: "모음(유성음) 뒤: 성대가 울리며 부드러운 [d]", m: "m_w07_played", f: "f_w07_played" },
  w08: { id: "w08", word: "called", stem: "call", ed: "ed", syl: "called", krSyl: "콜드", ipa: "[kɔːld]", kr: "불렀다 / 전화했다", group: "g2", sound: "d", soundName: "[d] 유성음 (떨림 100%)", tip: "l(유성음) 잇몸 울림 후 이어지는 [d]", m: "m_w08_called", f: "f_w08_called" },
  w09: { id: "w09", word: "loved", stem: "lov", ed: "ed", syl: "loved", krSyl: "러브드", ipa: "[lʌvd]", kr: "사랑했다", group: "g2", sound: "d", soundName: "[d] 유성음 (떨림 100%)", tip: "v(유성음) 목청 떨림 그대로 [d]", m: "m_w09_loved", f: "f_w09_loved" },
  w10: { id: "w10", word: "o · pened", stem: "o · pen", ed: "ed", syl: "o · pened", krSyl: "오픈드", ipa: "[ˈoʊpənd]", kr: "열었다", group: "g2", sound: "d", soundName: "[d] 유성음 (떨림 100%)", tip: "2음절: n(비음/유성음) 울림과 함께 [d]", m: "m_w10_opened", f: "f_w10_opened" },
  w11: { id: "w11", word: "cleaned", stem: "clean", ed: "ed", syl: "cleaned", krSyl: "클린드", ipa: "[kliːnd]", kr: "청소했다", group: "g2", sound: "d", soundName: "[d] 유성음 (떨림 100%)", tip: "n(비음/유성음) 뒤 부드럽게 감기는 [d]", m: "m_w11_cleaned", f: "f_w11_cleaned" },
  w12: { id: "w12", word: "lived", stem: "liv", ed: "ed", syl: "lived", krSyl: "리브드", ipa: "[lɪvd]", kr: "살았다", group: "g2", sound: "d", soundName: "[d] 유성음 (떨림 100%)", tip: "v(유성음) 입술 마찰과 성대 울림 [d]", m: "m_w12_lived", f: "f_w12_lived" },

  // Group 3: [ɪd] Cushion Vowel (+1 Syllable)
  w13: { id: "w13", word: "wan · ted", stem: "wan · ", ed: "ted", syl: "wan · ted", krSyl: "원티드", ipa: "[ˈwɑːntɪd]", kr: "원했다", group: "g3", sound: "id", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "t 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w13_wanted", f: "f_w13_wanted" },
  w14: { id: "w14", word: "star · ted", stem: "star · ", ed: "ted", syl: "star · ted", krSyl: "스타티드", ipa: "[ˈstɑːrtɪd]", kr: "시작했다", group: "g3", sound: "id", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "t 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w14_started", f: "f_w14_started" },
  w15: { id: "w15", word: "wai · ted", stem: "wai · ", ed: "ted", syl: "wai · ted", krSyl: "웨이티드", ipa: "[ˈweɪtɪd]", kr: "기다렸다", group: "g3", sound: "id", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "t 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w15_waited", f: "f_w15_waited" },
  w16: { id: "w16", word: "nee · ded", stem: "nee · ", ed: "ded", syl: "nee · ded", krSyl: "니디드", ipa: "[ˈniːdɪd]", kr: "필요했다", group: "g3", sound: "id", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "d 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w16_needed", f: "f_w16_needed" },
  w17: { id: "w17", word: "de · ci · ded", stem: "de · ci · ", ed: "ded", syl: "de · ci · ded", krSyl: "디사이디드", ipa: "[dɪˈsaɪdɪd]", kr: "결심했다", group: "g3", sound: "id", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "d 뒤 쿠션 모음 [ɪ] 투입! (2음절 ➔ 3음절)", m: "m_w17_decided", f: "f_w17_decided" },
  w18: { id: "w18", word: "en · ded", stem: "en · ", ed: "ded", syl: "en · ded", krSyl: "엔디드", ipa: "[ˈɛndɪd]", kr: "끝났다", group: "g3", sound: "id", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "d 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w18_ended", f: "f_w18_ended" },

  // Group 4: [ɪd] Adjective Exceptions & Bonus Review
  w19: { id: "w19", word: "na · ked", stem: "na · ", ed: "ked", syl: "na · ked", krSyl: "네이키드", ipa: "[ˈneɪkɪd]", kr: "벌거벗은 (형용사)", group: "g4", sound: "id-ex", soundName: "[ɪd] 형용사 특수 예외", tip: "동사 과거형이 아닌 형용사로 [ɪd] 고정!", m: "m_w19_naked", f: "f_w19_naked" },
  w20: { id: "w20", word: "wic · ked", stem: "wic · ", ed: "ked", syl: "wic · ked", krSyl: "위키드", ipa: "[ˈwɪkɪd]", kr: "사악한 (형용사)", group: "g4", sound: "id-ex", soundName: "[ɪd] 형용사 특수 예외", tip: "k 뒤지만 순수 형용사 예외로 [ɪd] 발음!", m: "m_w20_wicked", f: "f_w20_wicked" },
  w21: { id: "w21", word: "bles · sed", stem: "bles · ", ed: "sed", syl: "bles · sed", krSyl: "블레시드", ipa: "[ˈblɛsɪd]", kr: "축복받은 (형용사)", group: "g4", sound: "id-ex", soundName: "[ɪd] 형용사 특수 예외", tip: "형용사일 때 2음절 [블레시드]로 발음!", m: "m_w21_blessed", f: "f_w21_blessed" },
  w22: { id: "w22", word: "croo · ked", stem: "croo · ", ed: "ked", syl: "croo · ked", krSyl: "크루키드", ipa: "[ˈkrʊkɪd]", kr: "비뚤어진 (형용사)", group: "g4", sound: "id-ex", soundName: "[ɪd] 형용사 특수 예외", tip: "k 뒤지만 순수 형용사 예외로 [ɪd] 발음!", m: "m_w22_crooked", f: "f_w22_crooked" },
  w23: { id: "w23", word: "helped", stem: "help", ed: "ed", syl: "helped", krSyl: "헬프트", ipa: "[hɛlpt]", kr: "도왔다 (보너스 복습)", group: "g4", sound: "t", soundName: "[t] 무성음 복습", tip: "p(무성음) 뒤 단단하게 끝나는 [t] 복습", m: "m_w23_helped", f: "f_w23_helped" },
  w24: { id: "w24", word: "closed", stem: "clos", ed: "ed", syl: "closed", krSyl: "클로즈드", ipa: "[kloʊzd]", kr: "닫았다 (보너스 복습)", group: "g4", sound: "d", soundName: "[d] 유성음 복습", tip: "z(유성음) 뒤 부드럽게 이어지는 [d] 복습", m: "m_w24_closed", f: "f_w24_closed" }
};

// Helper to format word with neutral stem + highlighted -ED suffix
function formatWordHtml(w) {
  const cls = w.sound === 't' ? 'ed-t' : (w.sound === 'd' ? 'ed-d' : (w.sound === 'id' ? 'ed-id' : 'ed-ex'));
  return `<span class="word-stem">${w.stem}</span><span class="word-ed ${cls}">${w.ed}</span>`;
}

// 7 Dialogue Sentences with target word highlights & syllable breakdown tips
const DIALOGUES = [
  {
    id: "01",
    en: "I walked home and stopped by the store.",
    enHtml: 'I <span class="hl-t">walked</span> home and <span class="hl-t">stopped</span> by the store.',
    kr: "집에 걸어가다가 가게에 들렀어요.",
    pairBadge: "walked [t] & stopped [t]",
    sylTip: "💡 둘 다 무성음(k, p) 뒤라 목청 안 떨리는 [t]!",
    audio: "dial_01",
    targetWords: ["walked", "stopped"]
  },
  {
    id: "02",
    en: "She called me and played the song.",
    enHtml: 'She <span class="hl-d">called</span> me and <span class="hl-d">played</span> the song.',
    kr: "그녀는 내게 전화해서 노래를 틀어주었다.",
    pairBadge: "called [d] & played [d]",
    sylTip: "💡 l과 모음(유성음) 뒤라 부드러운 [d] 울림!",
    audio: "dial_02",
    targetWords: ["called", "played"]
  },
  {
    id: "03",
    en: "We waited because we wanted to see him.",
    enHtml: 'We <span class="hl-id">waited</span> because we <span class="hl-id">wanted</span> to see him.',
    kr: "우리는 그를 보고 싶어서 기다렸다.",
    pairBadge: "wai · ted [ɪd] & wan · ted [ɪd]",
    sylTip: "💡 t 뒤라 쿠션 모음 투입! 2음절 [ɪd]!",
    audio: "dial_03",
    targetWords: ["waited", "wanted"]
  },
  {
    id: "04",
    en: "They decided to stay and cleaned the room.",
    enHtml: 'They <span class="hl-id">decided</span> to stay and <span class="hl-d">cleaned</span> the room.',
    kr: "그들은 머물기로 결심하고 방을 청소했다.",
    pairBadge: "de · ci · ded [ɪd] vs cleaned [d]",
    sylTip: "💡 d 뒤 [ɪd](3음절) vs n 뒤 [d](1음절) 대조!",
    audio: "dial_04",
    targetWords: ["decided", "cleaned"]
  },
  {
    id: "05",
    en: "He laughed when he watched the movie.",
    enHtml: 'He <span class="hl-t">laughed</span> when he <span class="hl-t">watched</span> the movie.',
    kr: "그는 영화를 보며 웃었다.",
    pairBadge: "laughed [t] & watched [t]",
    sylTip: "💡 f 소리와 ch 뒤라 똑같이 가벼운 [t] 종결!",
    audio: "dial_05",
    targetWords: ["laughed", "watched"]
  },
  {
    id: "06",
    en: "I needed help, so she opened the door.",
    enHtml: 'I <span class="hl-id">needed</span> help, so she <span class="hl-d">opened</span> the door.',
    kr: "내가 도움이 필요해서 그녀가 문을 열어주었다.",
    pairBadge: "nee · ded [ɪd] vs o · pened [d]",
    sylTip: "💡 d 뒤 [ɪd](2음절) vs n 뒤 [d](2음절) 대조!",
    audio: "dial_06",
    targetWords: ["needed", "opened"]
  },
  {
    id: "07",
    en: "The movie ended and everyone cheered.",
    enHtml: 'The movie <span class="hl-id">ended</span> and everyone <span class="hl-d">cheered</span>.',
    kr: "영화가 끝나자 모두가 환호했다.",
    pairBadge: "en · ded [ɪd] vs cheered [d]",
    sylTip: "💡 d 뒤 [ɪd](2음절) vs r(유성음) 뒤 [d] 울림!",
    audio: "dial_07",
    targetWords: ["ended", "cheered"]
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
  .label-t { background: #FEE2E2; color: #991B1B; }
  .label-d { background: #DBEAFE; color: #1E40AF; }
  .label-id { background: #D1FAE5; color: #065F46; }
  .word-text {
    font-family: 'Archivo Black', sans-serif; font-size: 4.1cqw; line-height: 1.0;
    letter-spacing: -0.02em; white-space: nowrap;
  }
  .word-stem { color: #111111; }
  .word-ed {
    display: inline-block;
    border-bottom-width: 5px;
    border-bottom-style: solid;
    padding-bottom: 2px;
  }
  .word-ed.ed-t { color: #DC2626; border-color: #DC2626; }
  .word-ed.ed-d { color: #2563EB; border-color: #2563EB; }
  .word-ed.ed-id { color: #059669; border-color: #059669; }
  .syl-pill {
    font-family: 'Noto Sans KR', sans-serif; font-size: 1.55cqw; font-weight: 900;
    padding: 0.4cqh 1.2cqw; border-radius: 12px; border: 2px solid #111111;
    box-shadow: 2px 2px 0px #111111; white-space: nowrap;
  }
  .pill-t { background: #FEE2E2; color: #991B1B; }
  .pill-d { background: #DBEAFE; color: #1E40AF; }
  .pill-id { background: #D1FAE5; color: #065F46; }
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
    <span class="tip-badge">오답 경고</span>
    <span>-ED, 다 '드'로 읽으셨죠? 끝소리 3개가 완전히 다릅니다!</span>
  </div>

  <div class="stage">
    <!-- Card 1: WALKED [t] -->
    <div class="compare-card" id="cardWalked">
      <div class="card-label label-t">규칙 ① 무성음 뒤 [t]</div>
      <div class="word-text"><span class="word-stem">WALK</span><span class="word-ed ed-t">ED</span></div>
      <div class="syl-pill pill-t">[wɔːkt] · [웍트]</div>
      <div class="meaning-text">걸었다 🚶</div>
      <div class="status-badge badge-warn" id="badgeWalked">워크드? ❌ 1음절 [웍트]</div>
    </div>

    <!-- Card 2: PLAYED [d] -->
    <div class="compare-card" id="cardPlayed">
      <div class="card-label label-d">규칙 ② 유성음 뒤 [d]</div>
      <div class="word-text"><span class="word-stem">PLAY</span><span class="word-ed ed-d">ED</span></div>
      <div class="syl-pill pill-d">[pleɪd] · [플레이드]</div>
      <div class="meaning-text">놀았다 🎮</div>
      <div class="status-badge badge-warn" id="badgePlayed">플레-이-드? ❌ 1음절 [d]</div>
    </div>

    <!-- Card 3: WANTED [ɪd] -->
    <div class="compare-card" id="cardWanted">
      <div class="card-label label-id">규칙 ③ t/d 뒤 쿠션 [ɪd]</div>
      <div class="word-text"><span class="word-stem">WAN · </span><span class="word-ed ed-id">TED</span></div>
      <div class="syl-pill pill-id">[ˈwɑːntɪd] · [원티드]</div>
      <div class="meaning-text">원했다 🎯</div>
      <div class="status-badge badge-correct" id="badgeWanted">쿠션 모음으로 +1음절 추가!</div>
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

    tl.from("#cardWalked", { y: 40, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0.2);
    tl.from("#cardPlayed", { y: 40, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0.4);
    tl.from("#cardWanted", { y: 40, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0.6);

    tl.to("#badgeWalked", { scale: 1.1, repeat: 1, yoyo: true, duration: 0.3 }, 5.5);
    tl.to("#badgePlayed", { scale: 1.1, repeat: 1, yoyo: true, duration: 0.3 }, 8.5);
    tl.to("#badgeWanted", { scale: 1.1, repeat: 1, yoyo: true, duration: 0.3 }, 15.0);

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

// 2. Frame 02: Principle (Vocal Cord Vibration Law)
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
  .rule-card.active-t { border-color: #DC2626; background: #FEF2F2; box-shadow: 8px 8px 0px #DC2626; }
  .rule-card.active-d { border-color: #2563EB; background: #EFF6FF; box-shadow: 8px 8px 0px #2563EB; }
  .rule-card.active-id { border-color: #059669; background: #F0FDF4; box-shadow: 8px 8px 0px #059669; }
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
  .badge-t { background: #FEE2E2; color: #991B1B; }
  .badge-d { background: #DBEAFE; color: #1E40AF; }
  .badge-id { background: #D1FAE5; color: #065F46; }
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
    <span>목청에 손을 대보세요! 떨림 유무가 소리를 결정합니다</span>
  </div>

  <div class="stage">
    <!-- Rule 1: [t] sound -->
    <div class="rule-card" id="cardT">
      <div class="rule-header">
        <span class="rule-title" style="color:#DC2626;">① [t] 무성음</span>
        <span class="rule-badge badge-t">목청 떨림 0%</span>
      </div>
      <div class="rule-desc">
        목청이 안 떨리는 가벼운 소리 뒤에서는 똑같이 성대가 안 떨리는 <strong>'트'</strong>로 끝납니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">끝소리 조건</span>
        <span class="formula-content">p, k, f, s, sh, ch 뒤</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">walked [웍트] · stopped [스탑트]</span>
      </div>
    </div>

    <!-- Rule 2: [d] sound -->
    <div class="rule-card" id="cardD">
      <div class="rule-header">
        <span class="rule-title" style="color:#2563EB;">② [d] 유성음</span>
        <span class="rule-badge badge-d">목청 떨림 100%</span>
      </div>
      <div class="rule-desc">
        목청이 부르르 울리는 유성음 뒤에서는 부드러운 <strong>'드'</strong> 소리가 자연스럽게 납니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">끝소리 조건</span>
        <span class="formula-content">모음 및 b, g, v, z, m, n, l, r 뒤</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">played [플레이드] · loved [러브드]</span>
      </div>
    </div>

    <!-- Rule 3: [ɪd] sound -->
    <div class="rule-card" id="cardId">
      <div class="rule-header">
        <span class="rule-title" style="color:#059669;">③ [ɪd] 쿠션 모음</span>
        <span class="rule-badge badge-id">혀 꼬임 방지 (+1음절)</span>
      </div>
      <div class="rule-desc">
        이미 트나 드로 끝나는 단어는 혀가 꼬이지 않게 쿠션 모음을 넣어 <strong>'이디'</strong>로 음절이 늘어납니다.
      </div>
      <div class="rule-formula">
        <span class="formula-label">끝소리 조건</span>
        <span class="formula-content">t 또는 d로 끝나는 단어 뒤</span>
      </div>
      <div style="margin-top:auto;">
        <span class="example-pill">wan · ted [원티드] · nee · ded [니디드]</span>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="v_principle" src="assets/voice/02_f02_principle.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${dur.toFixed(2)}"></audio>
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

    tl.from("#cardT", { y: 40, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0.2);
    tl.from("#cardD", { y: 40, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0.4);
    tl.from("#cardId", { y: 40, opacity: 0, duration: 0.5, ease: "back.out(1.5)" }, 0.6);

    tl.call(function() {
      document.getElementById("cardT").className = "rule-card active-t";
    }, null, 5.0);

    tl.call(function() {
      document.getElementById("cardT").className = "rule-card";
      document.getElementById("cardD").className = "rule-card active-d";
    }, null, 12.0);

    tl.call(function() {
      document.getElementById("cardD").className = "rule-card";
      document.getElementById("cardId").className = "rule-card active-id";
    }, null, 19.5);

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

// 3~6. Generator for Group Frames (F03, F04, F05, F06) with 6-Word Drill & 6-Repeat Indicator
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
    border-radius: 999px; padding: 0.9cqh 2.2cqw; font-size: 1.3cqw; font-weight: 900;
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
    width: 72cqw; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 5;
  }
  .drill-card {
    width: 100%; background: #FFFFFF; border: 4px solid #111111; box-shadow: 8px 8px 0px #111111;
    border-radius: 32px; padding: 5cqh 4cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.2cqh;
    position: relative;
  }
  .card-top-bar {
    display: flex; justify-content: space-between; align-items: center; width: 100%;
  }
  .step-counter {
    font-size: 1.25cqw; font-weight: 900; color: #6B7280; background: #F3F4F6;
    padding: 0.4cqh 1.4cqw; border-radius: 999px; border: 2px solid #111111;
  }
  .sound-rule-badge {
    font-size: 1.25cqw; font-weight: 900; padding: 0.5cqh 1.6cqw; border-radius: 999px;
    border: 2px solid #111111;
  }
  .word-en {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.0;
    letter-spacing: -0.02em; margin-top: 0.8cqh; white-space: nowrap;
  }
  .word-stem { color: #111111; }
  .word-ed {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .word-ed.ed-t { color: #DC2626; border-color: #DC2626; }
  .word-ed.ed-d { color: #2563EB; border-color: #2563EB; }
  .word-ed.ed-id { color: #059669; border-color: #059669; }
  .word-ed.ed-ex { color: #D97706; border-color: #D97706; }
  .ipa-box {
    display: flex; align-items: center; gap: 1.2cqw; margin-top: 0.4cqh;
  }
  .ipa-text {
    font-size: 2.2cqw; font-weight: 900; color: #4B5563;
  }
  .syl-pill {
    font-family: 'Noto Sans KR', sans-serif; font-size: 1.8cqw; font-weight: 900;
    padding: 0.4cqh 1.4cqw; border-radius: 12px; border: 2px solid #111111;
    box-shadow: 2px 2px 0px #111111;
  }
  .kr-pill {
    background: #F3F4F6; border: 2px solid #111111; border-radius: 14px;
    padding: 0.6cqh 1.8cqw; font-size: 1.7cqw; font-weight: 800; color: #111111;
  }
  .tip-box {
    font-size: 1.35cqw; font-weight: 800; color: #374151; min-height: 3.5cqh;
    display: flex; align-items: center; justify-content: center;
  }
  .dots-box {
    display: flex; gap: 0.8cqw; margin-top: 1cqh; align-items: center; justify-content: center;
  }
  .dot {
    width: 1.3cqw; height: 1.3cqw; border-radius: 50%;
    background: #E5E7EB; border: 2.5px solid #111111;
  }
  .dot.active { background: #111111; transform: scale(1.15); }
  audio { display: none; }
</style>

<div id="root" data-composition-id="${frameId}" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span class="tip-badge">${groupTitle}</span>
    <span>${eyebrowTip}</span>
  </div>

  <div class="stage">
    <div id="drillCard" class="drill-card">
      <div class="card-top-bar">
        <span id="stepCounter" class="step-counter">단어 1 / 6</span>
        <span id="soundBadge" class="sound-rule-badge" style="background:#FEE2E2; color:#991B1B;">[t] 무성음</span>
      </div>

      <div id="wordEn" class="word-en"><span class="word-stem">walk</span><span class="word-ed ed-t">ed</span></div>

      <div class="ipa-box">
        <span id="ipaText" class="ipa-text">[wɔːkt]</span>
        <span id="sylPill" class="syl-pill" style="background:#FEE2E2; color:#991B1B;">[웍트]</span>
      </div>

      <div id="krText" class="kr-pill">걸었다</div>
      <div id="tipText" class="tip-box">💡 k(무성음) 뒤: 목청 떨림 없이 가볍게 [t]</div>

      <div class="dots-box">
        <div id="dot_1" class="dot"></div>
        <div id="dot_2" class="dot"></div>
        <div id="dot_3" class="dot"></div>
        <div id="dot_4" class="dot"></div>
        <div id="dot_5" class="dot"></div>
        <div id="dot_6" class="dot"></div>
      </div>
    </div>
  </div>

  ${audioTags.join("\n  ")}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });

    var stepCounter = document.getElementById("stepCounter");
    var soundBadge = document.getElementById("soundBadge");
    var wordEn = document.getElementById("wordEn");
    var ipaText = document.getElementById("ipaText");
    var sylPill = document.getElementById("sylPill");
    var krText = document.getElementById("krText");
    var tipText = document.getElementById("tipText");
    var drillCard = document.getElementById("drillCard");

    function formatWord(w) {
      var cls = w.sound === 't' ? 'ed-t' : (w.sound === 'd' ? 'ed-d' : (w.sound === 'id' ? 'ed-id' : 'ed-ex'));
      return '<span class="word-stem">' + w.stem + '</span><span class="word-ed ' + cls + '">' + w.ed + '</span>';
    }

    function setWord(w, idx, total) {
      stepCounter.textContent = "단어 " + idx + " / " + total;
      wordEn.innerHTML = formatWord(w);
      ipaText.textContent = w.ipa;
      sylPill.textContent = "[" + w.krSyl + "]";
      krText.textContent = w.kr;
      tipText.textContent = "💡 " + w.tip;
      soundBadge.textContent = w.soundName;

      var bg = "#FEE2E2";
      var textCol = "#991B1B";
      if (w.sound === "d") {
        bg = "#DBEAFE"; textCol = "#1E40AF";
      } else if (w.sound === "id") {
        bg = "#D1FAE5"; textCol = "#065F46";
      } else if (w.sound === "id-ex") {
        bg = "#FEF3C7"; textCol = "#92400E";
      }

      soundBadge.style.background = bg;
      soundBadge.style.color = textCol;
      sylPill.style.background = bg;
      sylPill.style.color = textCol;

      gsap.fromTo(drillCard, { scale: 0.98 }, { scale: 1, duration: 0.3, ease: "back.out(1.5)" });

      for (var i = 1; i <= 6; i++) {
        document.getElementById("dot_" + i).className = "dot";
      }
    }

    function setDot(dotIdx) {
      for (var i = 1; i <= 6; i++) {
        var el = document.getElementById("dot_" + i);
        if (i <= dotIdx) {
          el.className = "dot active";
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

// 7. Frame 07: Dialogue with Target Word Bounce & Clean Ambience Video
function generateF07() {
  let curTime = 0.5;
  const audioTags = [];
  const animEvents = [];

  DIALOGUES.forEach((d) => {
    const dur = getDur(d.audio);
    const words = loadWords(d.audio);

    animEvents.push({
      time: curTime,
      type: "show_dialogue",
      item: d
    });

    // 1st play (Male or Female Native)
    audioTags.push(`<audio id="dial_${d.id}_1" src="assets/voice/${d.audio}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);

    // Target word whisper timestamps bounce
    d.targetWords.forEach(tw => {
      const wMatch = words.find(w => w.word.toLowerCase().replace(/[^a-z]/g, '') === tw.toLowerCase().replace(/[^a-z]/g, ''));
      if (wMatch && wMatch.from !== undefined) {
        animEvents.push({
          time: curTime + wMatch.from,
          type: "pulse_target_word"
        });
      }
    });

    curTime += dur + 0.85;

    // 2nd play (Retention listening)
    audioTags.push(`<audio id="dial_${d.id}_2" src="assets/voice/${d.audio}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${curTime.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>`);
    d.targetWords.forEach(tw => {
      const wMatch = words.find(w => w.word.toLowerCase().replace(/[^a-z]/g, '') === tw.toLowerCase().replace(/[^a-z]/g, ''));
      if (wMatch && wMatch.from !== undefined) {
        animEvents.push({
          time: curTime + wMatch.from,
          type: "pulse_target_word"
        });
      }
    });

    curTime += dur + 1.3;
  });

  const totalDur = curTime + 0.5;

  let animScriptCode = '';
  animEvents.forEach(e => {
    if (e.type === "show_dialogue") {
      animScriptCode += `  tl.call(function() {
    showDialogue(${JSON.stringify(e.item)});
  }, null, ${e.time.toFixed(2)});\n`;
    } else if (e.type === "pulse_target_word") {
      animScriptCode += `  tl.fromTo(".hl-t, .hl-d, .hl-id", { scale: 1.18 }, { scale: 1, duration: 0.3, ease: "back.out(2)", immediateRender: false }, ${e.time.toFixed(2)});\n`;
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
  }
  .sentence-en {
    font-family: 'Archivo Black', sans-serif; font-size: 3.6cqw; line-height: 1.35;
    color: #111111;
  }
  .hl-t {
    color: #991B1B; border-bottom: 5px solid #DC2626; padding-bottom: 2px;
    display: inline-block; background: #FEE2E2; padding-left: 6px; padding-right: 6px; border-radius: 6px;
  }
  .hl-d {
    color: #1E40AF; border-bottom: 5px solid #2563EB; padding-bottom: 2px;
    display: inline-block; background: #DBEAFE; padding-left: 6px; padding-right: 6px; border-radius: 6px;
  }
  .hl-id {
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
    <span>💬 실전 회화 문맥 속 -ED 발음 청취 (7문장 집중 훈련)</span>
  </div>

  <div class="stage">
    <div class="dialogue-card" id="dialCard">
      <div id="dialTag" class="tag-pill">walked [t] & stopped [t]</div>
      <div id="dialEn" class="sentence-en">I <span class="hl-t">walked</span> home and <span class="hl-t">stopped</span> by the store.</div>
      <div id="dialKr" class="sentence-kr">집에 걸어가다가 가게에 들렀어요.</div>
      <div id="dialSylTip" class="syl-tip-box">💡 둘 다 무성음 뒤라 목청 안 떨리는 [t]!</div>
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
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    width: 64cqw; z-index: 5;
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
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.0;
    letter-spacing: -0.02em; min-height: 8cqh; white-space: nowrap;
  }
  .word-stem { color: #111111; }
  .word-ed {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .word-ed.ed-t { color: #DC2626; border-color: #DC2626; }
  .word-ed.ed-d { color: #2563EB; border-color: #2563EB; }
  .word-ed.ed-id { color: #059669; border-color: #059669; }
  .word-ed.ed-ex { color: #D97706; border-color: #D97706; }
  .quiz-word.blind { color: #6B7280; }
  .quiz-badge {
    font-size: 1.8cqw; font-weight: 900; padding: 0.8cqh 2.2cqw; border-radius: 999px;
    border: 2.5px solid #111111;
  }
  .badge-t { background: #FEE2E2; color: #991B1B; }
  .badge-d { background: #DBEAFE; color: #1E40AF; }
  .badge-id { background: #D1FAE5; color: #065F46; }
  .badge-id-ex { background: #FEF3C7; color: #92400E; }
  .badge-blind { background: #E5E7EB; color: #374151; }
  .quiz-kr {
    font-size: 2.2cqw; font-weight: 800; color: #4B5563; min-height: 3cqh;
  }
</style>
<div id="root" data-composition-id="08-shuffle" data-width="1920" data-height="1080">
  <div class="eyebrow-pill">
    <span>⚡ 24단어 무작위 덱 셔플 귀 훈련 (실전 반응 퀴즈)</span>
  </div>

  <div class="stage">
    <div id="quizCard" class="quiz-card">
      <div id="quizCounter" class="quiz-counter">Q 1 / 24</div>
      <div id="quizWord" class="quiz-word blind">???</div>
      <div id="quizBadge" class="quiz-badge badge-blind">소리를 듣고 맞춰보세요 [t] vs [d] vs [ɪd]?</div>
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

    function formatWord(w) {
      var cls = w.sound === 't' ? 'ed-t' : (w.sound === 'd' ? 'ed-d' : (w.sound === 'id' ? 'ed-id' : 'ed-ex'));
      return '<span class="word-stem">' + w.stem + '</span><span class="word-ed ' + cls + '">' + w.ed + '</span>';
    }

    function setBlind(idx, total) {
      quizCounter.textContent = "Q " + idx + " / " + total;
      quizWord.textContent = "???";
      quizWord.className = "quiz-word blind";
      quizBadge.textContent = "소리를 듣고 맞춰보세요 👂 [t] vs [d] vs [ɪd]?";
      quizBadge.className = "quiz-badge badge-blind";
      quizKr.textContent = "";
    }

    function revealAnswer(w) {
      quizWord.innerHTML = formatWord(w);
      quizWord.className = "quiz-word";
      quizKr.textContent = w.ipa + " · [" + w.krSyl + "] · " + w.kr;

      if (w.sound === "t") {
        quizBadge.textContent = "정답: " + w.soundName;
        quizBadge.className = "quiz-badge badge-t";
      } else if (w.sound === "d") {
        quizBadge.textContent = "정답: " + w.soundName;
        quizBadge.className = "quiz-badge badge-d";
      } else if (w.sound === "id") {
        quizBadge.textContent = "정답: " + w.soundName;
        quizBadge.className = "quiz-badge badge-id";
      } else {
        quizBadge.textContent = "정답: " + w.soundName;
        quizBadge.className = "quiz-badge badge-id-ex";
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

// 9. Frame 09: Summary Cheat Sheet (4 Columns)
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
    position: absolute; top: 4.5cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; z-index: 10; display: inline-flex; align-items: center; gap: 0.8cqw;
    white-space: nowrap;
  }
  .capture-badge {
    background: #EF4444; color: #FFFFFF; border: 2px solid #111111; border-radius: 999px;
    padding: 0.3cqh 0.9cqw; font-size: 1.05cqw; font-weight: 900;
    white-space: nowrap; flex-shrink: 0;
  }
  .eyebrow-pill span { white-space: nowrap; }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 92cqw; display: flex; gap: 1.8cqw; align-items: stretch; justify-content: center; z-index: 5;
  }
  .summary-col {
    flex: 1; background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 5px 5px 0px #111111;
    border-radius: 22px; padding: 2.5cqh 1.8cqw; display: flex; flex-direction: column; gap: 1.2cqh;
  }
  .col-header {
    padding: 0.8cqh 1.2cqw; border-radius: 12px; border: 2px solid #111111; text-align: center;
  }
  .header-t { background: #FEE2E2; color: #991B1B; }
  .header-d { background: #DBEAFE; color: #1E40AF; }
  .header-id { background: #D1FAE5; color: #065F46; }
  .header-ex { background: #FEF3C7; color: #92400E; }
  .col-title { font-size: 1.5cqw; font-weight: 900; }
  .col-sub { font-size: 1.05cqw; font-weight: 800; margin-top: 0.3cqh; }
  .word-list {
    display: flex; flex-direction: column; gap: 0.6cqh; font-size: 1.1cqw; font-weight: 800;
  }
  .word-row {
    display: flex; justify-content: space-between; align-items: center; padding: 0.5cqh 1cqw;
    background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB; white-space: nowrap;
  }
  .word-name { font-weight: 900; white-space: nowrap; }
  .word-stem { color: #111111; }
  .word-ed {
    display: inline-block;
    border-bottom-width: 3px;
    border-bottom-style: solid;
    padding-bottom: 1px;
    font-weight: 900;
  }
  .word-ed.ed-t { color: #DC2626; border-color: #DC2626; }
  .word-ed.ed-d { color: #2563EB; border-color: #2563EB; }
  .word-ed.ed-id { color: #059669; border-color: #059669; }
  .word-ed.ed-ex { color: #D97706; border-color: #D97706; }
  .syl-tag {
    font-weight: 900; padding: 0.2cqh 0.6cqw; border-radius: 6px; font-size: 1cqw; white-space: nowrap; flex-shrink: 0;
  }
  .tag-t { background: #FEE2E2; color: #991B1B; }
  .tag-d { background: #DBEAFE; color: #1E40AF; }
  .tag-id { background: #D1FAE5; color: #065F46; }
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
    <span>스마트폰 저장용 1장 요약 치트시트 (-ED 발음 완전정복)</span>
  </div>

  <div class="stage">
    <!-- Col 1: [t] -->
    <div class="summary-col">
      <div class="col-header header-t">
        <div class="col-title">[t] 무성음 뒤</div>
        <div class="col-sub">목청 떨림 0% · 터지는 소리</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w01)}</span><span class="syl-tag tag-t">[웍트]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w02)}</span><span class="syl-tag tag-t">[스탑트]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w03)}</span><span class="syl-tag tag-t">[래프트]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w04)}</span><span class="syl-tag tag-t">[와쉬트]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w05)}</span><span class="syl-tag tag-t">[와취트]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w06)}</span><span class="syl-tag tag-t">[키스트]</span></div>
      </div>
    </div>

    <!-- Col 2: [d] -->
    <div class="summary-col">
      <div class="col-header header-d">
        <div class="col-title">[d] 유성음 뒤</div>
        <div class="col-sub">목청 떨림 100% · 울리는 소리</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w07)}</span><span class="syl-tag tag-d">[플레이드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w08)}</span><span class="syl-tag tag-d">[콜드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w09)}</span><span class="syl-tag tag-d">[러브드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w10)}</span><span class="syl-tag tag-d">[오픈드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w11)}</span><span class="syl-tag tag-d">[클린드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w12)}</span><span class="syl-tag tag-d">[리브드]</span></div>
      </div>
    </div>

    <!-- Col 3: [ɪd] -->
    <div class="summary-col">
      <div class="col-header header-id">
        <div class="col-title">[ɪd] t / d 뒤</div>
        <div class="col-sub">쿠션 모음 투입 · 음절 +1</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w13)}</span><span class="syl-tag tag-id">[원티드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w14)}</span><span class="syl-tag tag-id">[스타티드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w15)}</span><span class="syl-tag tag-id">[웨이티드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w16)}</span><span class="syl-tag tag-id">[니디드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w17)}</span><span class="syl-tag tag-id">[디사이디드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w18)}</span><span class="syl-tag tag-id">[엔디드]</span></div>
      </div>
    </div>

    <!-- Col 4: Adjective Exceptions -->
    <div class="summary-col">
      <div class="col-header header-ex">
        <div class="col-title">[ɪd] 형용사 예외</div>
        <div class="col-sub">순수 형용사일 때 2음절</div>
      </div>
      <div class="word-list">
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w19)}</span><span class="syl-tag tag-ex">[네이키드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w20)}</span><span class="syl-tag tag-ex">[위키드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w21)}</span><span class="syl-tag tag-ex">[블레시드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w22)}</span><span class="syl-tag tag-ex">[크루키드]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w23)}</span><span class="syl-tag tag-t">[헬프트]</span></div>
        <div class="word-row"><span class="word-name">${formatWordHtml(WORDS.w24)}</span><span class="syl-tag tag-d">[클로즈드]</span></div>
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
  .word-ed {
    display: inline-block;
    border-bottom-width: 6px;
    border-bottom-style: solid;
    padding-bottom: 3px;
  }
  .word-ed.ed-t { color: #DC2626; border-color: #DC2626; }
  .word-ed.ed-d { color: #2563EB; border-color: #2563EB; }
  .word-ed.ed-id { color: #059669; border-color: #059669; }
  .word-ed.ed-ex { color: #D97706; border-color: #D97706; }
  .ipa-text {
    font-size: 2.2cqw; font-weight: 900; color: #4B5563; white-space: nowrap;
  }
  .end-screen-overlay {
    position: absolute; inset: 0; width: 100%; height: 100%;
    background: rgba(244, 239, 230, 0.98); z-index: 40;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    opacity: 0; pointer-events: none;
  }
  .end-header {
    font-family: 'Archivo Black', sans-serif; font-size: 3.6cqw; color: #111111; margin-bottom: 4cqh;
    white-space: nowrap;
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
    <span>🔁 24단어 무한 앵콜 총복습</span>
  </div>

  <div id="encoreStage" class="stage">
    <div class="encore-card">
      <div id="encCounter" class="encore-counter">복습 1 / 24</div>
      <div id="encLabel" class="card-label" style="background:#FEE2E2; color:#991B1B;">[t] 무성음</div>
      <div id="encWord" class="word-text"><span class="word-stem">walk</span><span class="word-ed ed-t">ed</span></div>
      <div id="encIpa" class="ipa-text">[wɔːkt] · [웍트] 걸었다</div>
    </div>
  </div>

  <div id="endOverlay" class="end-screen-overlay" data-layout-allow-overlap>
    <div class="end-header">오늘도 24단어 완주를 축하합니다! 👏</div>
    <div class="end-boxes">
      <div class="guide-box">
        <span>🎬 추천 영상</span>
        <span style="font-size: 1cqw;">(EP26 Right vs Light)</span>
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

    var encCounter = document.getElementById("encCounter");
    var encLabel = document.getElementById("encLabel");
    var encWord = document.getElementById("encWord");
    var encIpa = document.getElementById("encIpa");

    function formatWord(w) {
      var cls = w.sound === 't' ? 'ed-t' : (w.sound === 'd' ? 'ed-d' : (w.sound === 'id' ? 'ed-id' : 'ed-ex'));
      return '<span class="word-stem">' + w.stem + '</span><span class="word-ed ' + cls + '">' + w.ed + '</span>';
    }

    function setEncoreWord(w, idx, total) {
      encCounter.textContent = "복습 " + idx + " / " + total;
      encLabel.textContent = w.soundName;
      encWord.innerHTML = formatWord(w);
      encIpa.textContent = w.ipa + " · [" + w.krSyl + "] " + w.kr;

      var bg = "#FEE2E2";
      var textCol = "#991B1B";
      if (w.sound === "d") {
        bg = "#DBEAFE"; textCol = "#1E40AF";
      } else if (w.sound === "id") {
        bg = "#D1FAE5"; textCol = "#065F46";
      } else if (w.sound === "id-ex") {
        bg = "#FEF3C7"; textCol = "#92400E";
      }

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
console.log("Generating 10 frames for EP22 with English syllable division & natural Korean readings...");

const f01 = generateF01();
fs.writeFileSync(path.join(outFramesDir, "01-hook.html"), f01.html, "utf8");

const f02 = generateF02();
fs.writeFileSync(path.join(outFramesDir, "02-principle.html"), f02.html, "utf8");

const f03 = generateGroupFrame("03-group1", 1, "Group 1: [t] 사운드", ["w01", "w02", "w03", "w04", "w05", "w06"], "무성음 뒤: 성대 떨림 0% · 가볍게 터지는 [t]", "background:#EF4444; color:#FFFFFF;");
fs.writeFileSync(path.join(outFramesDir, "03-group1.html"), f03.html, "utf8");

const f04 = generateGroupFrame("04-group2", 2, "Group 2: [d] 사운드", ["w07", "w08", "w09", "w10", "w11", "w12"], "유성음 뒤: 성대 떨림 100% · 부드러운 [d]", "background:#2563EB; color:#FFFFFF;");
fs.writeFileSync(path.join(outFramesDir, "04-group2.html"), f04.html, "utf8");

const f05 = generateGroupFrame("05-group3", 3, "Group 3: [ɪd] 사운드", ["w13", "w14", "w15", "w16", "w17", "w18"], "t / d 뒤: 혀 꼬임 방지 쿠션 모음 투입 · 음절 +1", "background:#059669; color:#FFFFFF;");
fs.writeFileSync(path.join(outFramesDir, "05-group3.html"), f05.html, "utf8");

const f06 = generateGroupFrame("06-group4", 4, "Group 4: [ɪd] 형용사", ["w19", "w20", "w21", "w22", "w23", "w24"], "형용사 특수 예외: 순수 형용사일 때 2음절 [ɪd]", "background:#D97706; color:#FFFFFF;");
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
  { id: "01-hook", file: "01-hook.html", duration: f01.duration, title: "-ED, 다 '드'로 읽으셨죠? 3가지 끝소리 차이" },
  { id: "02-principle", file: "02-principle.html", duration: f02.duration, title: "조음 물리법칙 ([t] vs [d] vs [ɪd] 쿠션 원리)" },
  { id: "03-group1", file: "03-group1.html", duration: f03.duration, title: "Group 1: [t] 무성음 6단어 (walked, stopped, laughed...)" },
  { id: "04-group2", file: "04-group2.html", duration: f04.duration, title: "Group 2: [d] 유성음 6단어 (played, called, loved...)" },
  { id: "05-group3", file: "05-group3.html", duration: f05.duration, title: "Group 3: [ɪd] 쿠션 모음 6단어 (wan · ted, star · ted...)" },
  { id: "06-group4", file: "06-group4.html", duration: f06.duration, title: "Group 4: [ɪd] 형용사 예외 & 보너스 6단어 (na · ked, wic · ked...)" },
  { id: "07-dialogue", file: "07-dialogue.html", duration: f07.duration, title: "실전 대화 7문장 (-ED 문맥 청취 & Whisper 바운스)" },
  { id: "08-shuffle", file: "08-shuffle.html", duration: f08.duration, title: "24단어 무작위 덱 셔플 귀 훈련 (실전 퀴즈)" },
  { id: "09-summary", file: "09-summary.html", duration: f09.duration, title: "스마트폰 캡처용 1장 요약 치트시트" },
  { id: "10-encore", file: "10-encore.html", duration: f10.duration, title: "24단어 무한 앵콜 총복습 & 다음 영상 추천" }
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

console.log(`\n=== EP22 Timeline Assembled ===`);
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
