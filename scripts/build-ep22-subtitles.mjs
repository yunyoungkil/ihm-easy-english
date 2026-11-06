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

const WORDS = {
  w01: { id: "w01", word: "walked", stem: "walk", ed: "ed", syl: "walked", krSyl: "웍트", ipa: "[wɔːkt]", kr: "걸었다", soundName: "[t] 무성음", tip: "k(무성음) 뒤: 목청 떨림 없이 가볍게 [t]", m: "m_w01_walked", f: "f_w01_walked" },
  w02: { id: "w02", word: "stopped", stem: "stop", ed: "ped", syl: "stopped", krSyl: "스탑트", ipa: "[stɑːpt]", kr: "멈췄다", soundName: "[t] 무성음", tip: "p(무성음) 뒤: 입술 닫았다 터뜨리는 [t]", m: "m_w02_stopped", f: "f_w02_stopped" },
  w03: { id: "w03", word: "laughed", stem: "laugh", ed: "ed", syl: "laughed", krSyl: "래프트", ipa: "[læft]", kr: "웃었다", soundName: "[t] 무성음", tip: "gh가 [f] 소리라 무성음 [t]로 종결", m: "m_w03_laughed", f: "f_w03_laughed" },
  w04: { id: "w04", word: "washed", stem: "wash", ed: "ed", syl: "washed", krSyl: "와쉬트", ipa: "[wɑːʃt]", kr: "씻었다", soundName: "[t] 무성음", tip: "sh(무성음) 뒤: 바람 새듯 깔끔한 [t]", m: "m_w04_washed", f: "f_w04_washed" },
  w05: { id: "w05", word: "watched", stem: "watch", ed: "ed", syl: "watched", krSyl: "와취트", ipa: "[wɑːtʃt]", kr: "지켜봤다", soundName: "[t] 무성음", tip: "ch(무성음) 뒤: 딱 끊어지는 단단한 [t]", m: "m_w05_watched", f: "f_w05_watched" },
  w06: { id: "w06", word: "kissed", stem: "kiss", ed: "ed", syl: "kissed", krSyl: "키스트", ipa: "[kɪst]", kr: "입맞췄다", soundName: "[t] 무성음", tip: "s(무성음) 마찰 후 혀끝 가볍게 [t]", m: "m_w06_kissed", f: "f_w06_kissed" },

  w07: { id: "w07", word: "played", stem: "play", ed: "ed", syl: "played", krSyl: "플레이드", ipa: "[pleɪd]", kr: "놀았다 / 연주했다", soundName: "[d] 유성음", tip: "모음(유성음) 뒤: 성대가 울리며 부드러운 [d]", m: "m_w07_played", f: "f_w07_played" },
  w08: { id: "w08", word: "called", stem: "call", ed: "ed", syl: "called", krSyl: "콜드", ipa: "[kɔːld]", kr: "불렀다 / 전화했다", soundName: "[d] 유성음", tip: "l(유성음) 잇몸 울림 후 이어지는 [d]", m: "m_w08_called", f: "f_w08_called" },
  w09: { id: "w09", word: "loved", stem: "lov", ed: "ed", syl: "loved", krSyl: "러브드", ipa: "[lʌvd]", kr: "사랑했다", soundName: "[d] 유성음", tip: "v(유성음) 목청 떨림 그대로 [d]", m: "m_w09_loved", f: "f_w09_loved" },
  w10: { id: "w10", word: "o · pened", stem: "o · pen", ed: "ed", syl: "o · pened", krSyl: "오픈드", ipa: "[ˈoʊpənd]", kr: "열었다", soundName: "[d] 유성음", tip: "2음절: n(비음/유성음) 울림과 함께 [d]", m: "m_w10_opened", f: "f_w10_opened" },
  w11: { id: "w11", word: "cleaned", stem: "clean", ed: "ed", syl: "cleaned", krSyl: "클린드", ipa: "[kliːnd]", kr: "청소했다", soundName: "[d] 유성음", tip: "n(비음/유성음) 뒤 부드럽게 감기는 [d]", m: "m_w11_cleaned", f: "f_w11_cleaned" },
  w12: { id: "w12", word: "lived", stem: "liv", ed: "ed", syl: "lived", krSyl: "리브드", ipa: "[lɪvd]", kr: "살았다", soundName: "[d] 유성음", tip: "v(유성음) 입술 마찰과 성대 울림 [d]", m: "m_w12_lived", f: "f_w12_lived" },

  w13: { id: "w13", word: "wan · ted", stem: "wan · ", ed: "ted", syl: "wan · ted", krSyl: "원티드", ipa: "[ˈwɑːntɪd]", kr: "원했다", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "t 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w13_wanted", f: "f_w13_wanted" },
  w14: { id: "w14", word: "star · ted", stem: "star · ", ed: "ted", syl: "star · ted", krSyl: "스타티드", ipa: "[ˈstɑːrtɪd]", kr: "시작했다", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "t 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w14_started", f: "f_w14_started" },
  w15: { id: "w15", word: "wai · ted", stem: "wai · ", ed: "ted", syl: "wai · ted", krSyl: "웨이티드", ipa: "[ˈweɪtɪd]", kr: "기다렸다", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "t 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w15_waited", f: "f_w15_waited" },
  w16: { id: "w16", word: "nee · ded", stem: "nee · ", ed: "ded", syl: "nee · ded", krSyl: "니디드", ipa: "[ˈniːdɪd]", kr: "필요했다", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "d 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w16_needed", f: "f_w16_needed" },
  w17: { id: "w17", word: "de · ci · ded", stem: "de · ci · ", ed: "ded", syl: "de · ci · ded", krSyl: "디사이디드", ipa: "[dɪˈsaɪdɪd]", kr: "결심했다", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "d 뒤 쿠션 모음 [ɪ] 투입! (2음절 ➔ 3음절)", m: "m_w17_decided", f: "f_w17_decided" },
  w18: { id: "w18", word: "en · ded", stem: "en · ", ed: "ded", syl: "en · ded", krSyl: "엔디드", ipa: "[ˈɛndɪd]", kr: "끝났다", soundName: "[ɪd] 쿠션 모음 (+1음절)", tip: "d 뒤 쿠션 모음 [ɪ] 투입! (1음절 ➔ 2음절)", m: "m_w18_ended", f: "f_w18_ended" },

  w19: { id: "w19", word: "na · ked", stem: "na · ", ed: "ked", syl: "na · ked", krSyl: "네이키드", ipa: "[ˈneɪkɪd]", kr: "벌거벗은 (형용사)", soundName: "[ɪd] 형용사 특수 예외", tip: "동사 과거형이 아닌 형용사로 [ɪd] 고정!", m: "m_w19_naked", f: "f_w19_naked" },
  w20: { id: "w20", word: "wic · ked", stem: "wic · ", ed: "ked", syl: "wic · ked", krSyl: "위키드", ipa: "[ˈwɪkɪd]", kr: "사악한 (형용사)", soundName: "[ɪd] 형용사 특수 예외", tip: "k 뒤지만 순수 형용사 예외로 [ɪd] 발음!", m: "m_w20_wicked", f: "f_w20_wicked" },
  w21: { id: "w21", word: "bles · sed", stem: "bles · ", ed: "sed", syl: "bles · sed", krSyl: "블레시드", ipa: "[ˈblɛsɪd]", kr: "축복받은 (형용사)", soundName: "[ɪd] 형용사 특수 예외", tip: "형용사일 때 2음절 [블레시드]로 발음!", m: "m_w21_blessed", f: "f_w21_blessed" },
  w22: { id: "w22", word: "croo · ked", stem: "croo · ", ed: "ked", syl: "croo · ked", krSyl: "크루키드", ipa: "[ˈkrʊkɪd]", kr: "비뚤어진 (형용사)", soundName: "[ɪd] 형용사 특수 예외", tip: "k 뒤지만 순수 형용사 예외로 [ɪd] 발음!", m: "m_w22_crooked", f: "f_w22_crooked" },
  w23: { id: "w23", word: "helped", stem: "help", ed: "ed", syl: "helped", krSyl: "헬프트", ipa: "[hɛlpt]", kr: "도왔다 (보너스 복습)", soundName: "[t] 무성음 복습", tip: "p(무성음) 뒤 단단하게 끝나는 [t] 복습", m: "m_w23_helped", f: "f_w23_helped" },
  w24: { id: "w24", word: "closed", stem: "clos", ed: "ed", syl: "closed", krSyl: "클로즈드", ipa: "[kloʊzd]", kr: "닫았다 (보너스 복습)", soundName: "[d] 유성음 복습", tip: "z(유성음) 뒤 부드럽게 이어지는 [d] 복습", m: "m_w24_closed", f: "f_w24_closed" }
};

const DIALOGUES = [
  { id: "01", en: "I walked home and stopped by the store.", kr: "집에 걸어가다가 가게에 들렀어요.", audio: "dial_01" },
  { id: "02", en: "She called me and played the song.", kr: "그녀는 내게 전화해서 노래를 틀어주었다.", audio: "dial_02" },
  { id: "03", en: "We waited because we wanted to see him.", kr: "우리는 그를 보고 싶어서 기다렸다.", audio: "dial_03" },
  { id: "04", en: "They decided to stay and cleaned the room.", kr: "그들은 머물기로 결심하고 방을 청소했다.", audio: "dial_04" },
  { id: "05", en: "He laughed when he watched the movie.", kr: "그는 영화를 보며 웃었다.", audio: "dial_05" },
  { id: "06", en: "I needed help, so she opened the door.", kr: "내가 도움이 필요해서 그녀가 문을 열어주었다.", audio: "dial_06" },
  { id: "07", en: "The movie ended and everyone cheered.", kr: "영화가 끝나자 모두가 환호했다.", audio: "dial_07" }
];

const subtitles = [];

function addSub(start, end, text) {
  if (end <= start) return;
  subtitles.push({ start, end, text });
}

// 1. F01: Hook (start: 0.00)
const f01Start = 0.00;
addSub(f01Start + 0.37, f01Start + 6.42, "솔직히 과거형 단어 뒤에 붙은 -ED, 우리 다 그냥 '드'로 읽고 있었잖아요.");
addSub(f01Start + 6.70, f01Start + 16.80, "그런데 외국인 앞에서 워크드, 원티드라고 발음하면 왜 어색하게 들리고, 미드에서는 왜 -ED 소리가 거의 안 들릴까요?");
addSub(f01Start + 17.10, f01Start + 23.50, "-ED의 끝소리는 하나가 아니라 세 가지 완전히 다른 소리로 갈리기 때문입니다.");
addSub(f01Start + 23.80, f01Start + 30.50, "오늘 딱 24개 단어로 평생 헷갈리던 과거형 발음의 원리를 완벽하게 귀 뚫어 드리겠습니다.");

// 2. F02: Principle (start: 31.24)
const f02Start = 31.24;
addSub(f02Start + 0.46, f02Start + 6.30, "-ED 발음의 비밀은 딱 하나, 목청에 손을 대보면 바로 알 수 있습니다.");
addSub(f02Start + 6.60, f02Start + 13.50, "목청이 떨리지 않는 가벼운 소리 뒤에서는 똑같이 목이 안 떨리는 [t]('트') 소리로 끝납니다.");
addSub(f02Start + 13.80, f02Start + 19.50, "반대로 목청이 부르르 울리는 유성음 뒤에서는 부드러운 [d]('드') 소리가 납니다.");
addSub(f02Start + 19.80, f02Start + 26.50, "그리고 이미 [t]나 [d]로 끝나는 단어는 혀가 꼬이지 않게 쿠션 모음을 넣어 [ɪd]('이디')로 음절을 하나 늘려줍니다.");
addSub(f02Start + 26.80, f02Start + 32.80, "[t], [d], [ɪd], 이 세 가지 소리 규칙을 기억하고 바로 소리 연습 시작하겠습니다.");

// Helper for group frames
function buildGroupSubs(frameStart, wordKeys, groupRuleName) {
  let curTime = 0.5;
  wordKeys.forEach((wKey, idx) => {
    const w = WORDS[wKey];
    const m_dur = getDur(w.m);
    const f_dur = getDur(w.f);
    const wordStart = frameStart + curTime;

    // 6 reps
    curTime += m_dur + 0.55;
    curTime += f_dur + 0.55;
    curTime += m_dur + 0.55;
    curTime += f_dur + 0.55;
    curTime += m_dur + 0.55;
    curTime += f_dur + 0.95;

    const wordEnd = frameStart + curTime - 0.2;
    addSub(wordStart, wordEnd, `${w.word} [${w.krSyl}] · ${w.kr} (${groupRuleName})`);
  });
}

// 3. F03: Group 1 (start: 65.04)
buildGroupSubs(65.04, ["w01", "w02", "w03", "w04", "w05", "w06"], "규칙 ① 무성음 뒤 [t]");

// 4. F04: Group 2 (start: 118.87)
buildGroupSubs(118.87, ["w07", "w08", "w09", "w10", "w11", "w12"], "규칙 ② 유성음 뒤 [d]");

// 5. F05: Group 3 (start: 169.97)
buildGroupSubs(169.97, ["w13", "w14", "w15", "w16", "w17", "w18"], "규칙 ③ 쿠션 모음 [ɪd] +1음절");

// 6. F06: Group 4 (start: 222.09)
buildGroupSubs(222.09, ["w19", "w20", "w21", "w22", "w23", "w24"], "규칙 ④ 형용사 특수 예외 및 복습");

// 7. F07: Dialogue (start: 273.19)
const f07Start = 273.19;
let f07CurTime = 0.5;
DIALOGUES.forEach((d, idx) => {
  const dur = getDur(d.audio);
  const sentenceStart = f07Start + f07CurTime;

  // Rep 1
  f07CurTime += dur + 0.85;
  // Rep 2
  f07CurTime += dur + 1.3;

  const sentenceEnd = f07Start + f07CurTime - 0.2;
  addSub(sentenceStart, sentenceEnd, `${d.en}\n(${d.kr})`);
});

// 8. F08: Shuffle Quiz (start: 318.54)
const f08Start = 318.54;
const allWordKeys = Object.keys(WORDS);
const quizItems = allWordKeys.map(k => WORDS[k]);
for (let i = quizItems.length - 1; i > 0; i--) {
  const j = (i * 7 + 11) % (i + 1);
  [quizItems[i], quizItems[j]] = [quizItems[j], quizItems[i]];
}

let f08CurTime = 0.5;
quizItems.forEach((w, idx) => {
  const dur = getDur(w.m);
  const qStart = f08Start + f08CurTime;
  f08CurTime += dur;
  f08CurTime += 1.8;
  const thinkEnd = f08Start + f08CurTime;

  // Question phase
  addSub(qStart, thinkEnd, `Q${idx + 1}. 소리를 듣고 맞춰보세요 👂 [t] vs [d] vs [ɪd]?`);

  // Reveal phase
  const revStart = thinkEnd;
  f08CurTime += 2.4;
  const revEnd = f08Start + f08CurTime;
  addSub(revStart, revEnd, `정답: ${w.word} [${w.krSyl}] · ${w.kr} (${w.soundName})`);
});

// 9. F09: Summary (start: 438.61)
const f09Start = 438.61;
addSub(f09Start + 0.33, f09Start + 4.74, "수고하셨습니다. 오늘 연습한 과거형 -ED의 핵심 요약표입니다.");
addSub(f09Start + 4.88, f09Start + 12.20, "목청이 안 떨리면 [t], 목청이 떨리면 [d], [t]나 [d] 뒤에서는 음절이 늘어나는 [ɪd]입니다.");
addSub(f09Start + 12.50, f09Start + 20.40, "여기에 형용사 특수 단어들까지, 지금 화면을 스마트폰으로 캡처해 두시고 헷갈릴 때마다 꺼내서 소리 내어 확인해 보세요.");

// 10. F10: Encore & End Screen (start: 460.05)
const f10Start = 460.05;
let f10CurTime = 0.5;
allWordKeys.forEach((wKey, idx) => {
  const w = WORDS[wKey];
  const isMale = idx % 2 === 0;
  const voiceKey = isMale ? w.m : w.f;
  const dur = getDur(voiceKey);

  const wordStart = f10Start + f10CurTime;
  f10CurTime += dur + 0.55;
  const wordEnd = f10Start + f10CurTime;

  addSub(wordStart, wordEnd, `${w.word} [${w.krSyl}] · ${w.kr}`);
});

// End Screen (492.87 ~ 502.87)
addSub(492.87, 502.87, "다음 추천 영상도 이어서 시청해 보세요! 구독과 좋아요는 큰 힘이 됩니다.");

// Helper formatting functions
function formatSrtTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

function formatVttTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

// Generate SRT
let srtContent = '';
subtitles.forEach((s, idx) => {
  srtContent += `${idx + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}\n\n`;
});

// Generate VTT
let vttContent = 'WEBVTT\n\n';
subtitles.forEach((s, idx) => {
  vttContent += `${idx + 1}\n${formatVttTime(s.start)} --> ${formatVttTime(s.end)}\n${s.text}\n\n`;
});

// Save directories
const uploadPkgDir = path.resolve('output/upload-packages/ep22-ed-ending');
const subDir = path.join(uploadPkgDir, 'subtitles');
fs.mkdirSync(subDir, { recursive: true });

// Output paths
const srtPathSub = path.join(subDir, 'subtitles-ko.srt');
const vttPathSub = path.join(subDir, 'subtitles-ko.vtt');
const srtPathRoot = path.join(uploadPkgDir, 'subtitles-ko.srt');

fs.writeFileSync(srtPathSub, srtContent.trim() + '\n', 'utf8');
fs.writeFileSync(vttPathSub, vttContent.trim() + '\n', 'utf8');
fs.writeFileSync(srtPathRoot, srtContent.trim() + '\n', 'utf8');

console.log(`✅ Generated ${subtitles.length} subtitle cues!`);
console.log(`- ${srtPathSub}`);
console.log(`- ${vttPathSub}`);
console.log(`- ${srtPathRoot}`);
