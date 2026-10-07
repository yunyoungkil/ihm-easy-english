import fs from 'fs';
import path from 'path';

const ttsPath = path.resolve('videos/ep23-double-consonant/.tts-results.json');
const tts = JSON.parse(fs.readFileSync(ttsPath, 'utf8'));

function getDur(key) {
  if (!tts[key]) {
    throw new Error(`Missing audio duration for key: ${key}`);
  }
  return tts[key].duration_s;
}

const frames = [
  {
    id: "01-hook",
    title: "F01 훅: coffee와 hello, 소리는 딱 한 번",
    intro: "01_f01_hook",
    items: [],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 2.0
  },
  {
    id: "02-principle",
    title: "F02 핵심 원리: 자음 조음과 앞 모음 단축 신호",
    intro: "02_f02_principle",
    items: [
      { key: "en_hoping", reps: 3, label: "hoping", sub: "장모음 (p 1개)", type: "word", voice: "male" },
      { key: "en_hopping", reps: 3, label: "hopping", sub: "단모음 (p 2개)", type: "word", voice: "female" }
    ],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "03-ff-words",
    title: "F03 ff 단어 반복 듣기: 입술은 한 번만",
    intro: "03_f03_intro_ff",
    items: [
      { key: "en_coffee", reps: 3, label: "coffee", type: "word", voice: "male" },
      { key: "en_offer", reps: 3, label: "offer", type: "word", voice: "male" },
      { key: "en_office", reps: 3, label: "office", type: "word", voice: "female" },
      { key: "en_different", reps: 3, label: "different", type: "word", voice: "male" },
      { key: "en_effort", reps: 3, label: "effort", type: "word", voice: "female" },
      { key: "en_staff", reps: 3, label: "staff", type: "word", voice: "male" },
      { key: "en_s01_two_coffees", reps: 3, label: "Two coffees, please.", type: "sentence", voice: "female" }
    ],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "04-ll-words",
    title: "F04 ll 단어 반복 듣기: 혀끝은 한 번만",
    intro: "04_f04_intro_ll",
    items: [
      { key: "en_hello", reps: 3, label: "hello", type: "word", voice: "female" },
      { key: "en_yellow", reps: 3, label: "yellow", type: "word", voice: "male" },
      { key: "en_call", reps: 3, label: "call", type: "word", voice: "female" },
      { key: "en_really", reps: 3, label: "really", type: "word", voice: "male" },
      { key: "en_tall", reps: 3, label: "tall", type: "word", voice: "female" },
      { key: "en_all", reps: 3, label: "all", type: "word", voice: "male" },
      { key: "en_s02_hows_it_going", reps: 3, label: "Hello, how's it going?", type: "sentence", voice: "female" }
    ],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "05-ss-words",
    title: "F05 ss 단어 반복 듣기: 길게 끌지 말고 한 번에",
    intro: "05_f05_intro_ss",
    items: [
      { key: "en_class", reps: 3, label: "class", type: "word", voice: "male" },
      { key: "en_dress", reps: 3, label: "dress", type: "word", voice: "female" },
      { key: "en_glass", reps: 3, label: "glass", type: "word", voice: "male" },
      { key: "en_press", reps: 3, label: "press", type: "word", voice: "female" },
      { key: "en_lesson", reps: 3, label: "lesson", type: "word", voice: "male" },
      { key: "en_miss", reps: 3, label: "miss", type: "word", voice: "female" },
      { key: "en_s03_class_at_ten", reps: 3, label: "I have class at ten.", type: "sentence", voice: "male" }
    ],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "06-pp-words",
    title: "F06 pp 단어 반복 듣기: 가볍게 한 번만 툭",
    intro: "06_f06_intro_pp",
    items: [
      { key: "en_happy", reps: 3, label: "happy", type: "word", voice: "female" },
      { key: "en_apple", reps: 3, label: "apple", type: "word", voice: "male" },
      { key: "en_happen", reps: 3, label: "happen", type: "word", voice: "female" },
      { key: "en_supply", reps: 3, label: "supply", type: "word", voice: "male" },
      { key: "en_hopping", reps: 3, label: "hopping", type: "word", voice: "female" },
      { key: "en_s04_happy_birthday", reps: 3, label: "Happy birthday!", type: "sentence", voice: "female" }
    ],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "07-boundary-exceptions",
    title: "F07 예외 ① 단어 경계: 두 단어가 만날 때",
    intro: "07_f07_exception_boundary",
    items: [
      { key: "en_unnamed", reps: 3, label: "unnamed", sub: "un + named (자음 연장)", type: "word", voice: "male" },
      { key: "en_midday", reps: 3, label: "midday", sub: "mid + day (자음 연장)", type: "word", voice: "female" }
    ],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "08-flap-tt-exceptions",
    title: "F08 예외 ② 모음 사이 tt: 부드러운 'ㄹ' (Flap T)",
    intro: "08_f08_exception_flap_tt",
    items: [
      { key: "en_letter", reps: 3, label: "letter", sub: "레러 (Flap T)", type: "word", voice: "male" },
      { key: "en_butter", reps: 3, label: "butter", sub: "버러 (Flap T)", type: "word", voice: "female" },
      { key: "en_better", reps: 3, label: "better", sub: "베러 (Flap T)", type: "word", voice: "male" },
      { key: "en_little", reps: 3, label: "little", sub: "리를 (Flap T)", type: "word", voice: "female" }
    ],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "09-cafe-dialogue",
    title: "F09 카페 실전 대화 7문장",
    intro: "09_f09_intro_scene",
    items: [
      { key: "en_s02_hows_it_going", reps: 3, label: "Hello, how's it going?", type: "sentence", voice: "female" },
      { key: "en_s01_two_coffees", reps: 3, label: "Two coffees, please.", type: "sentence", voice: "female" },
      { key: "en_s05_want_coffee", reps: 3, label: "Do you want a coffee?", type: "sentence", voice: "female" },
      { key: "en_s06_office_close", reps: 3, label: "The office is close to the cafe.", type: "sentence", voice: "male" },
      { key: "en_s03_class_at_ten", reps: 3, label: "I have class at ten.", type: "sentence", voice: "male" },
      { key: "en_s07_coffee_after_class", reps: 3, label: "Let's get coffee after class.", type: "sentence", voice: "male" },
      { key: "en_s04_happy_birthday", reps: 3, label: "Happy birthday!", type: "sentence", voice: "female" }
    ],
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "10-shuffle-drill",
    title: "F10 무작위 셔플 섞어 듣기 (29개 단어)",
    intro: "10_f10_intro_shuffle",
    items: [
      "en_coffee", "en_happy", "en_class", "en_butter", "en_hello", "en_different",
      "en_letter", "en_apple", "en_yellow", "en_dress", "en_offer", "en_better",
      "en_call", "en_office", "en_glass", "en_happen", "en_really", "en_effort",
      "en_press", "en_little", "en_tall", "en_staff", "en_lesson", "en_supply",
      "en_all", "en_hopping", "en_miss", "en_unnamed", "en_midday"
    ].map(k => ({ key: k, reps: 2, label: k.replace('en_', ''), type: "word" })),
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 3.0
  },
  {
    id: "11-summary",
    title: "F11 오늘 규칙 한 장 정리 & 댓글 질문",
    intro: "11_f11_summary",
    items: [],
    repInterval: 0,
    itemInterval: 0,
    endPad: 5.0
  },
  {
    id: "12-encore-review",
    title: "F12 처음부터 끝까지 한 번 더 앵콜",
    intro: "12_f12_intro_encore",
    items: [
      "en_coffee", "en_offer", "en_office", "en_different", "en_effort", "en_staff",
      "en_hello", "en_yellow", "en_call", "en_really", "en_tall", "en_all",
      "en_class", "en_dress", "en_glass", "en_press", "en_lesson", "en_miss",
      "en_happy", "en_apple", "en_happen", "en_supply", "en_hopping",
      "en_unnamed", "en_midday", "en_letter", "en_butter", "en_better", "en_little"
    ].map(k => ({ key: k, reps: 2, label: k.replace('en_', ''), type: "word" })),
    repInterval: 3.0,
    itemInterval: 3.0,
    endPad: 10.0
  }
];

let globalTime = 0;
const results = [];

for (const frame of frames) {
  const introDur = getDur(frame.intro);
  let frameDur = introDur;
  
  if (frame.items.length > 0) {
    frameDur += 1.5; // gap between intro narration and first word/sentence
    for (let i = 0; i < frame.items.length; i++) {
      const item = frame.items[i];
      const itemDur = getDur(item.key);
      const totalItemDuration = (itemDur * item.reps) + (frame.repInterval * (item.reps - 1));
      frameDur += totalItemDuration;
      if (i < frame.items.length - 1) {
        frameDur += frame.itemInterval;
      }
    }
  }
  
  frameDur += frame.endPad;
  frameDur = Math.round(frameDur * 100) / 100;
  
  results.push({
    id: frame.id,
    title: frame.title,
    start: Math.round(globalTime * 100) / 100,
    duration: frameDur,
    introDur: introDur,
    itemsCount: frame.items.length
  });
  
  globalTime += frameDur;
}

globalTime = Math.round(globalTime * 100) / 100;

console.log("=== EP23 12-FRAME TIMELINE CALCULATION ===");
console.table(results);
const totalMinutes = Math.floor(globalTime / 60);
const totalSeconds = Math.round(globalTime % 60);
console.log(`TOTAL DURATION: ${globalTime}s (${totalMinutes}분 ${totalSeconds}초)`);

fs.writeFileSync(
  path.resolve('videos/ep23-double-consonant/.calculated-timeline.json'),
  JSON.stringify({ totalDuration: globalTime, frames: results, config: frames }, null, 2)
);

const indexPath = path.resolve('videos/ep23-double-consonant/index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

indexHtml = indexHtml.replace(
  /(<div[^>]+id="root"[^>]+data-duration=")[^"]*(")/,
  `$1${globalTime}$2`
);

for (const f of results) {
  const sceneRegex = new RegExp(`(<div[^>]+id="scene-${f.id}"[^>]+data-start=")[^"]*("[^>]+data-duration=")[^"]*(")`);
  indexHtml = indexHtml.replace(sceneRegex, `$1${f.start}$2${f.duration}$3`);
}
fs.writeFileSync(indexPath, indexHtml);
console.log("Updated index.html scene timings successfully!");
