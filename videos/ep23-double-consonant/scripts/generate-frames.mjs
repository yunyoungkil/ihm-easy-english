import fs from 'fs';
import path from 'path';

const ttsPath = path.resolve('videos/ep23-double-consonant/.tts-results.json');
const tts = JSON.parse(fs.readFileSync(ttsPath, 'utf8'));

const timelinePath = path.resolve('videos/ep23-double-consonant/.calculated-timeline.json');
const timelineData = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));

function getDur(key) {
  if (!tts[key]) {
    throw new Error(`Missing audio duration for key: ${key}`);
  }
  return tts[key].duration_s;
}

function loadWords(key) {
  const p = path.resolve(`videos/ep23-double-consonant/assets/voice/${key}.words.json`);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  return [];
}

const framesConfig = timelineData.config;

// Comprehensive dictionary with syllable division, Korean pronunciation, meaning, and tips
const DICTIONARY = {
  coffee: { syllables: "cof · fee", pron: "커 · 피", kr: "커피", tip: "💡 f가 두 개여도 소리는 [f] 딱 한 번!" },
  offer: { syllables: "of · fer", pron: "오 · 퍼", kr: "제안하다, 권하다", tip: "💡 아랫입술 한 번 물고 바람 툭 빼기" },
  office: { syllables: "of · fice", pron: "오 · 피스", kr: "사무실", tip: "💡 f 소리는 길게 끌지 않고 한 번에" },
  different: { syllables: "dif · fer · ent", pron: "디 · 퍼 · 런트", kr: "다른, 차이가 나는", tip: "💡 f 두 개를 한 번만 깔끔하게" },
  effort: { syllables: "ef · fort", pron: "에 · 포트", kr: "노력, 수고", tip: "💡 입술 두 번 움직이지 않고 한 번만" },
  staff: { syllables: "staff", pron: "스태프", kr: "직원, 스테프", tip: "💡 끝에 ff가 와도 소리는 딱 한 번" },

  hello: { syllables: "hel · lo", pron: "헬 · 로우", kr: "안녕하세요, 안녕", tip: "💡 혀끝을 윗니 뒤에 딱 한 번 대기" },
  yellow: { syllables: "yel · low", pron: "옐 · 로우", kr: "노란색", tip: "💡 l이 두 개여도 소리는 한 번" },
  call: { syllables: "call", pron: "콜", kr: "부르다, 전화하다", tip: "💡 혀끝 한 번만 차며 가볍게 끝내기" },
  really: { syllables: "real · ly", pron: "리 · 얼리", kr: "정말로, 진짜로", tip: "💡 혀가 두 번 닿지 않고 한 번만 툭" },
  tall: { syllables: "tall", pron: "톨", kr: "키가 큰", tip: "💡 ll 소리는 길게 끌지 않고 한 번에" },
  all: { syllables: "all", pron: "올", kr: "모든, 전부", tip: "💡 혀끝을 딱 한 번만 위 앞니 뒤에" },

  class: { syllables: "class", pron: "클래스", kr: "수업, 학급", tip: "💡 s 소리를 끌지 않고 한 번에 시원하게" },
  dress: { syllables: "dress", pron: "드레스", kr: "드레스, 원피스", tip: "💡 ss 두 개여도 한 번에 툭" },
  glass: { syllables: "glass", pron: "글래스", kr: "유리잔, 컵", tip: "💡 끝에 ss가 와도 소리는 한 번" },
  press: { syllables: "press", pron: "프레스", kr: "누르다, 언론", tip: "💡 바람 한 번만 시원하게 툭 빼기" },
  lesson: { syllables: "les · son", pron: "레 · 슨", kr: "수업, 교훈", tip: "💡 s 두 개를 한 번에 부드럽게" },
  miss: { syllables: "miss", pron: "미스", kr: "놓치다, 그리워하다", tip: "💡 소리를 길게 끌지 않고 한 번에" },

  happy: { syllables: "hap · py", pron: "해 · 피", kr: "행복한, 기쁜", tip: "💡 두 번 터뜨리지 않고 가볍게 한 번만!" },
  apple: { syllables: "ap · ple", pron: "애 · 플", kr: "사과", tip: "💡 입술 한 번만 닫았다 열기" },
  happen: { syllables: "hap · pen", pron: "해 · 픈", kr: "일어나다, 생기다", tip: "💡 p 두 개여도 입술은 한 번만" },
  supply: { syllables: "sup · ply", pron: "서 · 플라이", kr: "공급하다, 보급품", tip: "💡 입술 한 번 가볍게 붙였다 떼기" },
  hopping: { syllables: "hop · ping", pron: "하 · 핑", kr: "깡충깡충 뛰는", tip: "💡 p 2개 ➔ 앞 모음 짧게! [하 · 핑]" },
  hoping: { syllables: "ho · ping", pron: "호우 · 핑", kr: "바라는, 희망하는", tip: "💡 p 1개 ➔ 앞 모음 길게! [호우 · 핑]" },

  unnamed: { syllables: "un · named", pron: "언 · 네임드", kr: "이름 없는, 미상의", tip: "💡 un + named ➔ 두 단어가 만나 소리 연장" },
  midday: { syllables: "mid · day", pron: "미드 · 데이", kr: "정오, 한낮", tip: "💡 mid + day ➔ 두 단어가 만나 소리 연장" },

  letter: { syllables: "let · ter", pron: "레 · 러", kr: "편지, 글자", tip: "💡 모음 사이 tt ➔ 부드러운 'ㄹ' (Flap T)" },
  butter: { syllables: "but · ter", pron: "버 · 러", kr: "버터", tip: "💡 모음 사이 tt ➔ 부드러운 'ㄹ' (Flap T)" },
  better: { syllables: "bet · ter", pron: "베 · 러", kr: "더 좋은", tip: "💡 모음 사이 tt ➔ 부드러운 'ㄹ' (Flap T)" },
  little: { syllables: "lit · tle", pron: "리 · 를", kr: "작은, 어린", tip: "💡 모음 사이 tt ➔ 부드러운 'ㄹ' (Flap T)" },

  // Sentences
  en_s01_two_coffees: { kr: "커피 두 잔 주세요.", tip: "💡 cof · fee [커 · 피] ➔ f 소리는 딱 한 번!" },
  en_s02_hows_it_going: { kr: "안녕, 어떻게 지내?", tip: "💡 hel · lo [헬 · 로우] ➔ l 소리는 딱 한 번!" },
  en_s03_class_at_ten: { kr: "나 10시에 수업 있어.", tip: "💡 class [클래스] ➔ s 소리는 끌지 않고 한 번에!" },
  en_s04_happy_birthday: { kr: "생일 축하해!", tip: "💡 hap · py [해 · 피] ➔ p 소리는 딱 한 번!" },
  en_s05_want_coffee: { kr: "커피 한잔할래?", tip: "💡 cof · fee [커 · 피] ➔ f 소리는 딱 한 번!" },
  en_s06_office_close: { kr: "사무실이 카페랑 가까워.", tip: "💡 of · fice [오 · 피스] ➔ f 소리는 딱 한 번!" },
  en_s07_coffee_after_class: { kr: "수업 끝나고 커피 마시자.", tip: "💡 cof · fee · class ➔ ff · ss 한 번씩!" }
};

// Helper to format whisper sync lines
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
    
    if (w.word.endsWith('.') || w.word.endsWith('?') || w.word.endsWith('!') || curChunk.length >= 7) {
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
    code += `    tl.call(function() { cap("${escaped}"); }, null, ${c.start.toFixed(2)});\n`;
  }
  return code;
}

const outDir = path.resolve('videos/ep23-double-consonant/compositions/frames');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// -------------------------------------------------------------
// 1. F01 Hook
// -------------------------------------------------------------
{
  const dur = timelineData.frames[0].duration;
  const whisperCode = buildWhisperCalls('01_f01_hook');
  const html = `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Gaegu:wght@700&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 7cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 2.4cqw; font-size: 1.3cqw; font-weight: 900;
    color: #111111; display: flex; align-items: center; gap: 0.8cqw; z-index: 10;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    display: flex; flex-direction: column; align-items: center; gap: 3.5cqh; z-index: 5;
  }
  .word-card {
    background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 4.5cqh 6cqw; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 2.4cqh;
  }
  .hero-word {
    font-family: 'Archivo Black', sans-serif; font-size: 8.5cqw; line-height: 1.15; letter-spacing: 0.04em;
    padding-bottom: 0.8cqh;
  }
  .meaning-box {
    font-size: 2.2cqw; font-weight: 900; color: #111111; background: #FAF7F2;
    border: 2px solid #111111; border-radius: 12px; padding: 0.6cqh 2.2cqw;
    box-shadow: 2px 2px 0px #111111;
  }
  .highlight-red {
    color: #EF4444; border-bottom: 8px solid #EF4444; padding-bottom: 4px;
  }
  .rule-capsule {
    background: #F59E0B; border: 3px solid #111111; box-shadow: 5px 5px 0px #111111;
    border-radius: 999px; padding: 1.4cqh 3.6cqw; font-size: 2.2cqw; font-weight: 900;
    color: #111111; opacity: 0; transform: scale(0.85);
  }
  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="01-hook" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    <span>😳</span>
    <span>스펠링은 2개인데, 소리도 2번일까?</span>
  </div>

  <div class="stage">
    <div class="word-card" id="wordCard">
      <div class="hero-word">CO<span class="highlight-red">FF</span>EE</div>
      <div class="meaning-box">커피</div>
    </div>
    <div class="rule-capsule" id="ruleCapsule">
      ✨ 같은 자음 두 개는 딱 한 번만 소리 난다!
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="v01" src="assets/voice/01_f01_hook.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="21.04"></audio>
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(text) { pill.textContent = text; gsap.set(pill, { opacity: 1 }); }

    tl.fromTo("#eyebrow", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }, 0.2);
    tl.fromTo("#wordCard", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.4)" }, 0.5);

${whisperCode}

    // Reveal rule capsule at 7.6s ("아닙니다. 원어민은 딱 한 번만 소리 냅니다")
    tl.to("#ruleCapsule", { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.8)" }, 7.6);

    window.__timelines = window.__timelines || {};
    window.__timelines["01-hook"] = tl;
    tl.seek(0);
  })();
</script>
</template>
`;
  fs.writeFileSync(path.join(outDir, '01-hook.html'), html);
}

// -------------------------------------------------------------
// 2. F02 Principle
// -------------------------------------------------------------
{
  const whisperCode = buildWhisperCalls('02_f02_principle');
  const hopingStart = 27.62;
  const hopingRepInt = 3.51; // 0.51 + 3.0
  const hoppingStart = 38.15;
  const hoppingRepInt = 3.94; // 0.94 + 3.0

  let audioTags = `  <audio id="v02" src="assets/voice/02_f02_principle.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="26.12"></audio>\n`;
  let dotsTimelineCode = '';

  for (let r = 0; r < 3; r++) {
    const t = hopingStart + r * hopingRepInt;
    audioTags += `  <audio id="v_hoping_${r}" src="assets/voice/en_hoping.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${t.toFixed(2)}" data-duration="0.51"></audio>\n`;
    dotsTimelineCode += `    tl.call(function() { activateDot('hopingDots', ${r}); cap('ho · ping [호우 · 핑] (장모음)'); }, null, ${t.toFixed(2)});\n`;
  }
  for (let r = 0; r < 3; r++) {
    const t = hoppingStart + r * hoppingRepInt;
    audioTags += `  <audio id="v_hopping_${r}" src="assets/voice/en_hopping.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${t.toFixed(2)}" data-duration="0.94"></audio>\n`;
    dotsTimelineCode += `    tl.call(function() { activateDot('hoppingDots', ${r}); cap('hop · ping [하 · 핑] (단모음)'); }, null, ${t.toFixed(2)});\n`;
  }

  const html = `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Gaegu:wght@700&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; z-index: 10;
  }
  .grid-stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; display: grid; grid-template-columns: 1fr 1fr; gap: 3cqw; z-index: 5;
  }
  .panel-card {
    background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 24px; padding: 3cqh 3cqw; display: flex; flex-direction: column; align-items: center;
  }
  .img-box {
    width: 100%; height: 42cqh; border: 2.5px solid #111111; border-radius: 14px;
    overflow: hidden; background: #FAF7F2; margin-bottom: 2cqh;
  }
  .img-box img { width: 100%; height: 100%; object-fit: contain; }
  .diagram-desc {
    font-size: 1.4cqw; font-weight: 800; text-align: center; color: #111111; line-height: 1.4;
  }
  .compare-box {
    width: 100%; display: flex; flex-direction: column; gap: 2.2cqh; justify-content: center; height: 100%;
  }
  .word-row {
    background: #FAF7F2; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 18px; padding: 2.2cqh 2.4cqw; text-align: center;
  }
  .word-row.active {
    border-color: #F59E0B; box-shadow: 4px 4px 0px #F59E0B; background: #FFFFFF;
  }
  .word-row .en {
    font-family: 'Archivo Black', sans-serif; font-size: 4cqw; line-height: 1; letter-spacing: 0.02em;
  }
  .word-row .meaning {
    font-size: 1.6cqw; font-weight: 900; color: #111111; margin-top: 0.8cqh;
  }
  .word-row .kr {
    font-size: 1.25cqw; font-weight: 800; color: #7A7365; margin-top: 0.4cqh;
  }
  .highlight-p { color: #EF4444; }
  .repeat-dots { display: flex; gap: 0.7cqw; justify-content: center; margin-top: 1.4cqh; }
  .dot {
    width: 1.1cqw; height: 1.1cqw; border-radius: 50%; background: #E5E0D8;
    border: 2px solid #111111;
  }
  .dot.active { background: #F59E0B; transform: scale(1.2); }

  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="02-principle" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    💡 원리: 두 번째 자음은 소리가 아니라 앞 모음을 짧게 읽으라는 신호!
  </div>

  <div class="grid-stage">
    <!-- Left: Vocal Tract Anatomical Diagram -->
    <div class="panel-card" id="leftPanel">
      <div class="img-box">
        <img src="assets/images/f02_vocal_tract.jpg" alt="구강 조음 단면도">
      </div>
      <div class="diagram-desc">
        자음 = 공기를 <span style="color:#EF4444;">한 번</span> 막았다 여는 소리<br>
        <span style="font-size:1.15cqw; color:#7A7365;">두 번 움직일 필요 없이 한 번만 툭!</span>
      </div>
    </div>

    <!-- Right: Hoping vs Hopping with Meanings -->
    <div class="panel-card" id="rightPanel">
      <div class="compare-box">
        <div class="word-row" id="rowHoping">
          <div class="en">ho · <span class="highlight-p">p</span>ing</div>
          <div class="meaning">[호우 · 핑] · 바라다, 희망하다</div>
          <div class="kr">💡 장모음 (p 1개 ➔ 앞 모음 길게)</div>
          <div class="repeat-dots" id="hopingDots">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>

        <div class="word-row" id="rowHopping">
          <div class="en">hop · <span class="highlight-p">p</span>ing</div>
          <div class="meaning">[하 · 핑] · 깡충깡충 뛰다</div>
          <div class="kr">💡 단모음 (p 2개 ➔ 앞 모음 짧게!)</div>
          <div class="repeat-dots" id="hoppingDots">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

${audioTags}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(text) { pill.textContent = text; gsap.set(pill, { opacity: 1 }); }

    function activateDot(containerId, index) {
      var dots = document.querySelectorAll("#" + containerId + " .dot");
      dots.forEach(function(d, i) {
        if (i <= index) d.classList.add("active");
      });
      if (containerId === "hopingDots") {
        document.getElementById("rowHoping").classList.add("active");
        document.getElementById("rowHopping").classList.remove("active");
      } else {
        document.getElementById("rowHopping").classList.add("active");
        document.getElementById("rowHoping").classList.remove("active");
      }
    }

    tl.fromTo("#eyebrow", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.2);
    tl.fromTo("#leftPanel", { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "back.out(1.4)" }, 0.4);
    tl.fromTo("#rightPanel", { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: "back.out(1.4)" }, 0.6);

${whisperCode}
${dotsTimelineCode}

    window.__timelines = window.__timelines || {};
    window.__timelines["02-principle"] = tl;
    tl.seek(0);
  })();
</script>
</template>
`;
  fs.writeFileSync(path.join(outDir, '02-principle.html'), html);
}

// -------------------------------------------------------------
// Helper to generate Drills (F03, F04, F05, F06, F07, F08)
// -------------------------------------------------------------
function generateDrillFrame(frameConfig, targetConsonant, actionTip, introCardData, badgeLabel) {
  const introDur = getDur(frameConfig.intro);
  const whisperCode = buildWhisperCalls(frameConfig.intro);
  
  let curT = introDur + 1.5;
  let audioTags = `  <audio id="v_intro" src="assets/voice/${frameConfig.intro}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${introDur.toFixed(2)}"></audio>\n`;
  let stageCode = '';

  const items = frameConfig.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dur = getDur(item.key);
    const itemStart = curT;

    // Trigger word card update
    stageCode += `    tl.call(function() { showItem(${i}); }, null, ${itemStart.toFixed(2)});\n`;

    for (let r = 0; r < item.reps; r++) {
      const repStart = curT;
      const tagId = `v_${item.key}_${r}`;
      audioTags += `  <audio id="${tagId}" src="assets/voice/${item.key}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${repStart.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>\n`;
      
      const cleanKey = item.key.replace('en_', '');
      const dictEntry = DICTIONARY[cleanKey] || DICTIONARY[item.key] || { syllables: item.label, pron: "", kr: "", tip: "" };
      const capText = item.type === 'sentence'
        ? `${item.label} (${dictEntry.kr})`
        : `${dictEntry.syllables || item.label} [${dictEntry.pron || dictEntry.kr}]`;
      
      stageCode += `    tl.call(function() { activateRepDot(${r}); pulseCard(); cap("${capText.replace(/"/g, '\\"')}"); }, null, ${repStart.toFixed(2)});\n`;
      
      curT += dur;
      if (r < item.reps - 1) {
        curT += frameConfig.repInterval;
      }
    }

    if (i < items.length - 1) {
      curT += frameConfig.itemInterval;
    }
  }

  // Items metadata for client JS with accurate Korean meanings and syllables
  const itemsJson = JSON.stringify(items.map(it => {
    const cleanKey = it.key.replace('en_', '');
    const dict = DICTIONARY[cleanKey] || DICTIONARY[it.key] || { syllables: it.label, pron: "", kr: "", tip: "" };
    return {
      label: it.label,
      syllables: dict.syllables || it.label,
      pron: dict.pron || "",
      meaning: dict.kr,
      tip: dict.tip,
      type: it.type,
      reps: it.reps
    };
  }));

  const eyebrowBadge = badgeLabel || `${targetConsonant.toUpperCase()} 사운드`;

  const html = `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Gaegu:wght@700&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; display: flex; align-items: center; gap: 0.8cqw; z-index: 10;
  }
  .tip-badge {
    background: #F59E0B; border: 1.5px solid #111111; border-radius: 999px;
    padding: 0.2cqh 0.8cqw; font-size: 0.95cqw; font-weight: 900;
  }

  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 82cqw; display: flex; flex-direction: column; align-items: center; z-index: 5;
  }
  .hero-card {
    background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 4.8cqh 5cqw; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.4cqh;
  }
  .main-text {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.15;
    letter-spacing: 0.02em; color: #111111; padding-bottom: 1.2cqh; margin-bottom: 0.5cqh;
  }
  .main-text.sentence {
    font-size: 3.8cqw; line-height: 1.25; padding-bottom: 0.8cqh; margin-bottom: 0.3cqh;
  }
  .meaning-badge {
    font-size: 2.2cqw; font-weight: 900; color: #111111; background: #FAF7F2;
    border: 2.5px solid #111111; border-radius: 14px; padding: 0.7cqh 2.4cqw;
    box-shadow: 3px 3px 0px #111111;
  }
  .sub-note {
    font-size: 1.35cqw; font-weight: 800; color: #7A7365;
  }
  .highlight-letter {
    color: #EF4444; border-bottom: 6px solid #EF4444; padding-bottom: 2px; display: inline-block;
  }

  .repeat-dots {
    display: flex; gap: 0.8cqw; justify-content: center; align-items: center; margin-top: 1cqh;
  }
  .repeat-dot {
    width: 1.3cqw; height: 1.3cqw; border-radius: 50%; background: #E5E0D8;
    border: 2.5px solid #111111;
  }
  .repeat-dot.active {
    background: #F59E0B; transform: scale(1.3); box-shadow: 2px 2px 0px #111111;
  }

  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="${frameConfig.id}" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    <span class="tip-badge">${eyebrowBadge}</span>
    <span>${actionTip}</span>
  </div>

  <div class="stage">
    <!-- Clean Elevated Card: No voice badge, generous spacing for underline and meaning -->
    <div class="hero-card" id="heroCard">
      <div class="main-text" id="mainText">${introCardData.title}</div>
      <div class="meaning-badge" id="meaningBadge">${introCardData.meaning}</div>
      <div class="sub-note" id="subNote">${introCardData.sub}</div>
      <div class="repeat-dots" id="dotsContainer"></div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

${audioTags}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(text) { pill.textContent = text; gsap.set(pill, { opacity: 1 }); }

    var items = ${itemsJson};
    var target = "${targetConsonant.toLowerCase()}";

    function highlightText(label) {
      var targets = target.split('|');
      var patterns = [];
      targets.forEach(function(t) {
        if (t.length >= 2) {
          patterns.push(t[0] + "\\\\s*·\\\\s*" + t[1]);
          patterns.push(t);
        } else {
          patterns.push(t);
        }
      });
      var regex = new RegExp("(" + patterns.join("|") + ")", "gi");
      return label.replace(regex, '<span class="highlight-letter">$1</span>');
    }

    function showItem(idx) {
      var item = items[idx];
      var textEl = document.getElementById("mainText");
      var meaningEl = document.getElementById("meaningBadge");
      var subEl = document.getElementById("subNote");
      var dotsEl = document.getElementById("dotsContainer");

      if (item.type === "sentence") {
        textEl.innerHTML = highlightText(item.label);
        textEl.className = "main-text sentence";
        meaningEl.textContent = item.meaning;
      } else {
        textEl.innerHTML = highlightText(item.syllables || item.label);
        textEl.className = "main-text";
        if (item.pron) {
          meaningEl.textContent = "[" + item.pron + "] · " + item.meaning;
        } else {
          meaningEl.textContent = item.meaning;
        }
      }
      subEl.textContent = item.tip;

      dotsEl.innerHTML = "";
      for (var r = 0; r < item.reps; r++) {
        var d = document.createElement("div");
        d.className = "repeat-dot";
        dotsEl.appendChild(d);
      }
      gsap.fromTo("#heroCard", { scale: 0.96 }, { scale: 1, duration: 0.35, ease: "back.out(1.5)" });
    }

    function activateRepDot(repIndex) {
      var dots = document.querySelectorAll("#dotsContainer .repeat-dot");
      dots.forEach(function(d, i) {
        if (i <= repIndex) d.classList.add("active");
      });
    }

    function pulseCard() {
      gsap.fromTo("#heroCard", { scale: 1 }, { scale: 1.03, duration: 0.18, yoyo: true, repeat: 1 });
    }

    tl.fromTo("#eyebrow", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.2);

${whisperCode}
${stageCode}

    window.__timelines = window.__timelines || {};
    window.__timelines["${frameConfig.id}"] = tl;
    tl.seek(0);
  })();
</script>
</template>
`;
  fs.writeFileSync(path.join(outDir, `${frameConfig.id}.html`), html);
}

// Generate F03~F08 with accurate Intro Cards
generateDrillFrame(framesConfig[2], "ff", "아랫입술을 두 번 물지 않고 바람을 한 번만!", {
  title: `<span style="color:#EF4444;">FF</span> [f] 사운드`,
  meaning: `f가 두 개여도 소리는 딱 한 번!`,
  sub: `잠시 후 단어 6개 + 실전 문장 집중 반복 듣기가 시작됩니다`
});

generateDrillFrame(framesConfig[3], "ll", "혀끝을 윗니 뒤에 딱 한 번만 대고 소리 내기!", {
  title: `<span style="color:#EF4444;">LL</span> [l] 사운드`,
  meaning: `혀끝을 윗니 뒤에 딱 한 번만 대기`,
  sub: `잠시 후 단어 6개 + 실전 문장 집중 반복 듣기가 시작됩니다`
});

generateDrillFrame(framesConfig[4], "ss", "소리를 길게 끌지 않고 한 번에 시원하게 툭!", {
  title: `<span style="color:#EF4444;">SS</span> [s] 사운드`,
  meaning: `소리를 끌지 않고 한 번에 시원하게 툭!`,
  sub: `잠시 후 단어 6개 + 실전 문장 집중 반복 듣기가 시작됩니다`
});

generateDrillFrame(framesConfig[5], "pp", "두 번 터뜨리지 말고 가볍게 한 번만 닫았다 열기!", {
  title: `<span style="color:#EF4444;">PP</span> [p] 사운드`,
  meaning: `두 번 터뜨리지 않고 가볍게 한 번만 닫았다 열기`,
  sub: `잠시 후 단어 5개 + 실전 문장 집중 반복 듣기가 시작됩니다`
});

generateDrillFrame(framesConfig[6], "nn|dd", "두 단어가 만나는 경계에서는 소리가 이어져 살짝 깁니다", {
  title: `예외 ① 단어 경계의 결합`,
  meaning: `앞뒤 단어가 만나 자음이 겹치면 소리가 살짝 연장`,
  sub: `un + named / mid + day 두 단어 비교 듣기`
}, "경계 결합");

generateDrillFrame(framesConfig[7], "tt", "모음 사이 tt는 트가 아니라 부드러운 'ㄹ' (Flap T)", {
  title: `예외 ② 모음 사이 TT`,
  meaning: `미국 영어에서는 '트' 대신 부드러운 'ㄹ' (Flap T)`,
  sub: `letter, butter, better, little 4개 단어 반복 듣기`
}, "FLAP T");

// -------------------------------------------------------------
// 9. F09 Cafe Dialogue (with f09_cafe_scene.mp4 and meanings)
// -------------------------------------------------------------
{
  const frameConfig = framesConfig[8];
  const introDur = getDur(frameConfig.intro);
  const whisperCode = buildWhisperCalls(frameConfig.intro);
  const totalDur = timelineData.frames[8].duration;
  let curT = introDur + 1.5;
  let audioTags = `  <audio id="v_intro" src="assets/voice/${frameConfig.intro}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${introDur.toFixed(2)}"></audio>\n`;
  let stageCode = '';

  const items = frameConfig.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dur = getDur(item.key);
    const itemStart = curT;

    stageCode += `    tl.call(function() { showDialogue(${i}); }, null, ${itemStart.toFixed(2)});\n`;

    const dict = DICTIONARY[item.key] || { kr: "", tip: "" };

    for (let r = 0; r < item.reps; r++) {
      const repStart = curT;
      const tagId = `v_cafe_${i}_${r}`;
      audioTags += `  <audio id="${tagId}" src="assets/voice/${item.key}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${repStart.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>\n`;
      stageCode += `    tl.call(function() { activateDialogueDot(${r}); pulseDialogue(); cap("${item.label} (${dict.kr})"); }, null, ${repStart.toFixed(2)});\n`;

      curT += dur;
      if (r < item.reps - 1) curT += frameConfig.repInterval;
    }
    if (i < items.length - 1) curT += frameConfig.itemInterval;
  }

  const dialoguesJson = JSON.stringify(items.map(it => {
    const dict = DICTIONARY[it.key] || { kr: "", tip: "" };
    return {
      text: it.label,
      meaning: dict.kr,
      tip: dict.tip,
      reps: it.reps,
      speaker: it.voice === 'female' ? '👩 손님' : '👦 바리스타'
    };
  }));

  const html = `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Gaegu:wght@700&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; z-index: 20;
  }
  .video-stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; height: 68cqh; border: 3.5px solid #111111; box-shadow: 7px 7px 0px #111111;
    border-radius: 24px; overflow: hidden; background: #000000; z-index: 5;
  }
  .video-stage video {
    width: 100%; height: 100%; object-fit: cover; opacity: 0.75;
    transform: scale(1.15); transform-origin: 15% 15%;
  }
  .dialogue-overlay {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    justify-content: center; align-items: center; padding: 4cqh 5cqw; z-index: 10;
  }
  .dialogue-card {
    background: rgba(255, 255, 255, 0.97); border: 3px solid #111111; box-shadow: 5px 5px 0px #111111;
    border-radius: 24px; padding: 3.8cqh 4.5cqw; max-width: 90%; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 2cqh;
  }
  .speaker-badge {
    background: #F59E0B; border: 2px solid #111111; border-radius: 999px;
    padding: 0.6cqh 1.8cqw; font-size: 1.2cqw; font-weight: 900; color: #111111;
  }
  .sentence-text {
    font-family: 'Archivo Black', sans-serif; font-size: 3.8cqw; line-height: 1.25; color: #111111;
    padding-bottom: 0.4cqh;
  }
  .sentence-meaning {
    font-size: 2.2cqw; font-weight: 900; color: #111111; background: #FAF7F2;
    border: 2px solid #111111; border-radius: 12px; padding: 0.6cqh 2.2cqw;
    box-shadow: 2.5px 2.5px 0px #111111;
  }
  .sentence-tip {
    font-size: 1.3cqw; font-weight: 800; color: #7A7365;
  }
  .repeat-dots {
    display: flex; gap: 0.8cqw; justify-content: center; align-items: center; margin-top: 0.5cqh;
  }
  .repeat-dot {
    width: 1.3cqw; height: 1.3cqw; border-radius: 50%; background: #E5E0D8;
    border: 2.5px solid #111111;
  }
  .repeat-dot.active {
    background: #F59E0B; transform: scale(1.3); box-shadow: 2px 2px 0px #111111;
  }
  .highlight-letter {
    color: #EF4444; border-bottom: 5px solid #EF4444; padding-bottom: 2px;
  }
  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="09-cafe-dialogue" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    ☕ 카페 실전 회화: 일상 대화 속 겹자음 소리 듣기
  </div>

  <div class="video-stage">
    <video id="cafeVideo" src="assets/videos/f09_cafe_scene.mp4" data-start="0" data-duration="${totalDur.toFixed(2)}" data-hf-media-start-basis="local" data-layout-allow-overflow autoplay loop muted playsinline></video>
    <div class="dialogue-overlay">
      <!-- Intro State during narration, NO hardcoded 'Two coffees' -->
      <div class="dialogue-card" id="dialogueCard">
        <div class="speaker-badge" id="speakerBadge">☕ 실전 카페 대화</div>
        <div class="sentence-text" id="sentenceText">친구와의 2인 실전 대화</div>
        <div class="sentence-meaning" id="sentenceMeaning">문장 속에서 자연스럽게 흘러가는 소리를 들어보세요</div>
        <div class="sentence-tip" id="sentenceTip">잠시 후 손님과 바리스타의 대화가 시작됩니다 (문장당 3회 반복)</div>
        <div class="repeat-dots" id="dialogueDots"></div>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

${audioTags}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(text) { pill.textContent = text; gsap.set(pill, { opacity: 1 }); }

    var dialogues = ${dialoguesJson};

    function highlightDialogue(text) {
      return text.replace(/(ff|ll|ss|pp|tt|dd|nn)/gi, '<span class="highlight-letter">$1</span>');
    }

    function showDialogue(idx) {
      var item = dialogues[idx];
      document.getElementById("speakerBadge").textContent = item.speaker;
      document.getElementById("sentenceText").innerHTML = highlightDialogue(item.text);
      document.getElementById("sentenceMeaning").textContent = item.meaning;
      document.getElementById("sentenceTip").textContent = item.tip;

      var dotsEl = document.getElementById("dialogueDots");
      dotsEl.innerHTML = "";
      for (var r = 0; r < item.reps; r++) {
        var d = document.createElement("div");
        d.className = "repeat-dot";
        dotsEl.appendChild(d);
      }
      gsap.fromTo("#dialogueCard", { scale: 0.94, opacity: 0.8 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(1.5)" });
    }

    function activateDialogueDot(repIndex) {
      var dots = document.querySelectorAll("#dialogueDots .repeat-dot");
      dots.forEach(function(d, i) {
        if (i <= repIndex) d.classList.add("active");
      });
    }

    function pulseDialogue() {
      gsap.fromTo("#dialogueCard", { scale: 1 }, { scale: 1.025, duration: 0.18, yoyo: true, repeat: 1 });
    }

    tl.fromTo("#eyebrow", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.2);

${whisperCode}
${stageCode}

    window.__timelines = window.__timelines || {};
    window.__timelines["09-cafe-dialogue"] = tl;
    tl.seek(0);
  })();
</script>
</template>
`;
  fs.writeFileSync(path.join(outDir, '09-cafe-dialogue.html'), html);
}

// -------------------------------------------------------------
// 10. F10 Shuffle Drill (with meanings)
// -------------------------------------------------------------
{
  const frameConfig = framesConfig[9];
  const introDur = getDur(frameConfig.intro);
  const whisperCode = buildWhisperCalls(frameConfig.intro);
  let curT = introDur + 1.5;
  let audioTags = `  <audio id="v_intro" src="assets/voice/${frameConfig.intro}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${introDur.toFixed(2)}"></audio>\n`;
  let stageCode = '';

  const items = frameConfig.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dur = getDur(item.key);
    const itemStart = curT;

    stageCode += `    tl.call(function() { showShuffleWord(${i}); }, null, ${itemStart.toFixed(2)});\n`;

    const cleanKey = item.key.replace('en_', '');
    const dict = DICTIONARY[cleanKey] || DICTIONARY[item.key] || { syllables: item.label, pron: "", kr: "", tip: "" };
    const capText = `${dict.syllables || item.label} [${dict.pron || dict.kr}]`;

    for (let r = 0; r < item.reps; r++) {
      const repStart = curT;
      const tagId = `v_shuf_${i}_${r}`;
      audioTags += `  <audio id="${tagId}" src="assets/voice/${item.key}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${repStart.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>\n`;
      stageCode += `    tl.call(function() { activateShufDot(${r}); pulseShuf(); cap("${capText.replace(/"/g, '\\"')}"); }, null, ${repStart.toFixed(2)});\n`;

      curT += dur;
      if (r < item.reps - 1) curT += frameConfig.repInterval;
    }
    if (i < items.length - 1) curT += frameConfig.itemInterval;
  }

  const wordsJson = JSON.stringify(items.map((it, idx) => {
    const cleanKey = it.key.replace('en_', '');
    const dict = DICTIONARY[cleanKey] || DICTIONARY[it.key] || { syllables: it.label, pron: "", kr: "", tip: "" };
    return {
      label: it.label,
      syllables: dict.syllables || it.label,
      pron: dict.pron || "",
      meaning: dict.kr,
      num: idx + 1
    };
  }));

  const html = `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Gaegu:wght@700&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; z-index: 10;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 72cqw; display: flex; flex-direction: column; align-items: center; z-index: 5;
  }
  .deck-card {
    background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 4.8cqh 5cqw; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.4cqh;
  }
  .badge-counter {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 999px;
    padding: 0.5cqh 1.8cqw; font-size: 1.15cqw; font-weight: 900; color: #7A7365;
  }
  .word-display {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.15; letter-spacing: 0.02em;
    padding-bottom: 1.2cqh; margin-bottom: 0.6cqh;
  }
  .meaning-display {
    font-size: 2.2cqw; font-weight: 900; color: #111111; background: #FAF7F2;
    border: 2.5px solid #111111; border-radius: 14px; padding: 0.7cqh 2.4cqw;
    box-shadow: 3px 3px 0px #111111;
  }
  .repeat-dots { display: flex; gap: 1cqw; justify-content: center; margin-top: 0.5cqh; }
  .dot {
    width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #E5E0D8;
    border: 2.5px solid #111111;
  }
  .dot.active { background: #F59E0B; transform: scale(1.3); }

  .highlight-letter {
    color: #EF4444; border-bottom: 6px solid #EF4444; padding-bottom: 2px; display: inline-block;
  }

  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="10-shuffle-drill" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    ⚡ 섞어 듣기: 무작위 29개 단어 귀로 즉각 반응하기!
  </div>

  <div class="stage">
    <!-- Intro State during narration, NO hardcoded 'COFFEE' -->
    <div class="deck-card" id="deckCard">
      <div class="badge-counter" id="badgeCounter">⚡ 섞어 듣기 훈련</div>
      <div class="word-display" id="wordDisplay">29단어 셔플</div>
      <div class="meaning-display" id="meaningDisplay">자음이 두 개라도 한 번에 소리 나는지 귀로 확인!</div>
      <div class="repeat-dots">
        <span class="dot" id="dot0"></span>
        <span class="dot" id="dot1"></span>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

${audioTags}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(text) { pill.textContent = text; gsap.set(pill, { opacity: 1 }); }

    var words = ${wordsJson};

    function highlightWord(label) {
      var targets = ["ff", "ll", "ss", "pp", "tt", "nn", "dd"];
      var patterns = [];
      targets.forEach(function(t) {
        patterns.push(t[0] + "\\\\s*·\\\\s*" + t[1]);
        patterns.push(t);
      });
      var re = new RegExp("(" + patterns.join("|") + ")", "gi");
      return label.replace(re, '<span class="highlight-letter">$1</span>');
    }

    function showShuffleWord(idx) {
      var item = words[idx];
      document.getElementById("badgeCounter").textContent = "단어 " + (item.num < 10 ? "0" + item.num : item.num) + " / 29";
      document.getElementById("wordDisplay").innerHTML = highlightWord(item.syllables || item.label);
      if (item.pron) {
        document.getElementById("meaningDisplay").textContent = "[" + item.pron + "] · " + item.meaning;
      } else {
        document.getElementById("meaningDisplay").textContent = item.meaning;
      }
      document.getElementById("dot0").className = "dot";
      document.getElementById("dot1").className = "dot";
      gsap.fromTo("#deckCard", { scale: 0.95, rotation: (idx % 2 === 0 ? 1 : -1) }, { scale: 1, rotation: 0, duration: 0.25, ease: "back.out(1.5)" });
    }

    function activateShufDot(repIdx) {
      if (repIdx === 0) document.getElementById("dot0").classList.add("active");
      if (repIdx === 1) document.getElementById("dot1").classList.add("active");
    }

    function pulseShuf() {
      gsap.fromTo("#deckCard", { scale: 1 }, { scale: 1.03, duration: 0.16, yoyo: true, repeat: 1 });
    }

    tl.fromTo("#eyebrow", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.2);

${whisperCode}
${stageCode}

    window.__timelines = window.__timelines || {};
    window.__timelines["10-shuffle-drill"] = tl;
    tl.seek(0);
  })();
</script>
</template>
`;
  fs.writeFileSync(path.join(outDir, '10-shuffle-drill.html'), html);
}

// -------------------------------------------------------------
// 11. F11 Summary
// -------------------------------------------------------------
{
  const whisperCode = buildWhisperCalls('11_f11_summary');
  const html = `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Gaegu:wght@700&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; z-index: 10;
  }
  .board-stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; display: grid; grid-template-columns: 1fr 1fr; gap: 2.5cqw; z-index: 5;
  }
  .summary-card {
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 5px 5px 0px #111111;
    border-radius: 20px; padding: 3cqh 3cqw; display: flex; flex-direction: column; gap: 1.2cqh;
  }
  .card-tag {
    font-size: 1.1cqw; font-weight: 900; color: #F59E0B;
  }
  .card-title {
    font-size: 1.8cqw; font-weight: 900; color: #111111;
  }
  .card-desc {
    font-size: 1.25cqw; font-weight: 700; color: #7A7365; line-height: 1.4;
  }
  .comment-box {
    position: absolute; bottom: 12cqh; left: 50%; transform: translateX(-50%);
    background: #FAF7F2; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 18px; padding: 1.6cqh 3cqw; font-size: 1.35cqw; font-weight: 800;
    color: #111111; text-align: center; z-index: 15;
  }
  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="11-summary" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    📋 오늘 배운 핵심 원리 1장 요약
  </div>

  <div class="board-stage" id="boardStage">
    <div class="summary-card">
      <div class="card-tag">원칙 1</div>
      <div class="card-title">같은 자음 둘 ➔ 소리 하나</div>
      <div class="card-desc">coffee, hello, happy 대부분의 단어는 딱 한 번만 툭!</div>
    </div>
    <div class="summary-card">
      <div class="card-tag">원칙 2</div>
      <div class="card-title">두 번째 자음 = 앞 모음 단축</div>
      <div class="card-desc">hoping [호우핑] vs hopping [하핑] 모음 길이 신호</div>
    </div>
    <div class="summary-card">
      <div class="card-tag">예외 1</div>
      <div class="card-title">단어 경계의 결합</div>
      <div class="card-desc">un+named, mid+day 두 단어가 만날 땐 자음 연장</div>
    </div>
    <div class="summary-card">
      <div class="card-tag">예외 2</div>
      <div class="card-title">모음 사이 tt = Flap T</div>
      <div class="card-desc">better, letter, butter 부드러운 'ㄹ' 소리로 전환</div>
    </div>
  </div>

  <div class="comment-box" id="commentBox">
    💬 오늘 들었던 단어 중 가장 의외였던 발음은 무엇이었나요? 댓글로 남겨주세요!
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="v11" src="assets/voice/11_f11_summary.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="19.20"></audio>
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(text) { pill.textContent = text; gsap.set(pill, { opacity: 1 }); }

    tl.fromTo("#eyebrow", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.2);
    tl.fromTo(".summary-card", { y: 20, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.15, duration: 0.5, ease: "back.out(1.4)" }, 0.4);
    tl.fromTo("#commentBox", { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.5)" }, 14.0);

${whisperCode}

    // Keep summary board visible throughout F11 until transition
    tl.to(["#boardStage", "#commentBox"], { opacity: 0, duration: 0.5 }, 23.5);

    window.__timelines = window.__timelines || {};
    window.__timelines["11-summary"] = tl;
    tl.seek(0);
  })();
</script>
</template>
`;
  fs.writeFileSync(path.join(outDir, '11-summary.html'), html);
}

// -------------------------------------------------------------
// 12. F12 Encore Review (with meanings)
// -------------------------------------------------------------
{
  const frameConfig = framesConfig[11];
  const introDur = getDur(frameConfig.intro);
  const whisperCode = buildWhisperCalls(frameConfig.intro);
  let curT = introDur + 1.5;
  let audioTags = `  <audio id="v_intro" src="assets/voice/${frameConfig.intro}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="0" data-duration="${introDur.toFixed(2)}"></audio>\n`;
  let stageCode = '';

  const items = frameConfig.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dur = getDur(item.key);
    const itemStart = curT;

    stageCode += `    tl.call(function() { showEncoreWord(${i}); }, null, ${itemStart.toFixed(2)});\n`;

    const cleanKey = item.key.replace('en_', '');
    const dict = DICTIONARY[cleanKey] || DICTIONARY[item.key] || { syllables: item.label, pron: "", kr: "", tip: "" };
    const capText = `${dict.syllables || item.label} [${dict.pron || dict.kr}]`;

    for (let r = 0; r < item.reps; r++) {
      const repStart = curT;
      const tagId = `v_enc_${i}_${r}`;
      audioTags += `  <audio id="${tagId}" src="assets/voice/${item.key}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-start="${repStart.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>\n`;
      stageCode += `    tl.call(function() { activateEncDot(${r}); pulseEnc(); cap("${capText.replace(/"/g, '\\"')}"); }, null, ${repStart.toFixed(2)});\n`;

      curT += dur;
      if (r < item.reps - 1) curT += frameConfig.repInterval;
    }
    if (i < items.length - 1) curT += frameConfig.itemInterval;
  }

  const wordsJson = JSON.stringify(items.map((it, idx) => {
    const cleanKey = it.key.replace('en_', '');
    const dict = DICTIONARY[cleanKey] || DICTIONARY[it.key] || { syllables: it.label, pron: "", kr: "", tip: "" };
    return {
      label: it.label,
      syllables: dict.syllables || it.label,
      pron: dict.pron || "",
      meaning: dict.kr,
      num: idx + 1
    };
  }));

  const html = `<template>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Gaegu:wght@700&family=Noto+Sans+KR:wght@400;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  #root {
    position: relative; width: 1920px; height: 1080px; overflow: hidden;
    background: #F4EFE6; color: #111111; font-family: 'Noto Sans KR', sans-serif;
    container-type: size;
  }
  .eyebrow-pill {
    position: absolute; top: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 0.9cqh 2.4cqw; font-size: 1.25cqw; font-weight: 900;
    color: #111111; z-index: 10;
  }
  .stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 72cqw; display: flex; flex-direction: column; align-items: center; z-index: 5;
  }
  .encore-card {
    background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 4.8cqh 5cqw; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2.4cqh;
  }
  .badge-counter {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 999px;
    padding: 0.5cqh 1.8cqw; font-size: 1.15cqw; font-weight: 900; color: #7A7365;
  }
  .word-display {
    font-family: 'Archivo Black', sans-serif; font-size: 6.8cqw; line-height: 1.15; letter-spacing: 0.02em;
    padding-bottom: 1.2cqh; margin-bottom: 0.6cqh;
  }
  .meaning-display {
    font-size: 2.2cqw; font-weight: 900; color: #111111; background: #FAF7F2;
    border: 2.5px solid #111111; border-radius: 14px; padding: 0.7cqh 2.4cqw;
    box-shadow: 3px 3px 0px #111111;
  }
  .repeat-dots { display: flex; gap: 1cqw; justify-content: center; margin-top: 0.5cqh; }
  .dot {
    width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #E5E0D8;
    border: 2.5px solid #111111;
  }
  .dot.active { background: #F59E0B; transform: scale(1.3); }

  .highlight-letter {
    color: #EF4444; border-bottom: 6px solid #EF4444; padding-bottom: 2px; display: inline-block;
  }

  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }

  /* YouTube End Screen (10.0s Dedicated Stage) */
  .endscreen-stage {
    position: absolute; inset: 0; z-index: 30; opacity: 0; pointer-events: none;
  }
  .end-brand {
    position: absolute; left: 5cqw; top: 5.5cqh; display: flex; align-items: center; gap: 1cqw;
  }
  .end-brand-pill {
    background: #111111; color: #FFFFFF; font-weight: 900; font-size: 1.15cqw;
    padding: 0.6cqh 1.8cqw; border-radius: 999px;
  }
  .end-brand-sub {
    font-size: 1.1cqw; font-weight: 800; color: #7A7365;
  }
  .end-header {
    position: absolute; top: 5.5cqh; left: 50%; transform: translateX(-50%);
    text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.8cqh;
  }
  .end-header-badge {
    background: #F59E0B; border: 2.5px solid #111111; box-shadow: 3px 3px 0px #111111;
    border-radius: 999px; padding: 0.6cqh 2.2cqw; font-size: 1.2cqw; font-weight: 900; color: #111111;
  }
  .end-header-title {
    font-family: 'Archivo Black', sans-serif; font-size: 2.2cqw; color: #111111; letter-spacing: 0.01em;
  }
  .end-cards-grid {
    position: absolute; top: 22cqh; left: 50%; transform: translateX(-50%);
    width: 82cqw; display: grid; grid-template-columns: 1fr 1fr; gap: 3.5cqw;
  }
  .end-card-box {
    background: #FFFFFF; border: 3px dashed #111111; border-radius: 24px;
    box-shadow: 6px 6px 0px #111111; height: 50cqh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 1.8cqh; text-align: center; padding: 2cqh 3cqw;
  }
  .end-card-badge {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 999px;
    padding: 0.5cqh 1.8cqw; font-size: 1.1cqw; font-weight: 900; color: #7A7365;
  }
  .end-card-title {
    font-size: 1.8cqw; font-weight: 900; color: #111111; line-height: 1.3;
  }
  .end-card-cta {
    font-size: 1.2cqw; font-weight: 800; color: #EF4444; background: #FFF5F5;
    border: 1.5px solid #EF4444; border-radius: 8px; padding: 0.4cqh 1.2cqw;
  }
  .end-bottom-bar {
    position: absolute; bottom: 6cqh; left: 50%; transform: translateX(-50%);
    background: #FFFFFF; border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 999px; padding: 1cqh 3cqw; font-size: 1.35cqw; font-weight: 900;
    color: #111111; display: flex; align-items: center; gap: 0.8cqw;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="12-encore-review" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    ☕ 앵콜 총복습: 편안하게 틀어두고 귀에 새겨보세요
  </div>

  <div class="stage">
    <!-- Intro State during narration, NO hardcoded 'COFFEE' -->
    <div class="encore-card" id="encoreCard">
      <div class="badge-counter" id="badgeCounter">☕ 총복습 앵콜</div>
      <div class="word-display" id="wordDisplay">29단어 총정리</div>
      <div class="meaning-display" id="meaningDisplay">틀어두고 편안하게 귀로 새겨보세요</div>
      <div class="repeat-dots">
        <span class="dot" id="dot0"></span>
        <span class="dot" id="dot1"></span>
      </div>
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <!-- YouTube End Screen (10.0s Dedicated Stage) -->
  <div class="endscreen-stage" id="endscreenStage">
    <!-- Safe Top-Left Brand Wordmark -->
    <div class="end-brand" id="endBrand">
      <span class="end-brand-pill">이해하면 쉬운영어</span>
      <span class="end-brand-sub">원리를 알면 영어가 들립니다</span>
    </div>

    <!-- Top Message Banner -->
    <div class="end-header" id="endHeader">
      <div class="end-header-badge">✨ 29개 단어 집중 훈련 완주를 축하합니다!</div>
      <div class="end-header-title">함께 들으면 귀가 더 빨리 열리는 추천 영상</div>
    </div>

    <!-- YouTube Endscreen Guide Zones (16:9 Aspect Ratio) -->
    <div class="end-cards-grid">
      <div class="end-card-box">
        <div class="end-card-badge">🎬 추천 영상</div>
        <div class="end-card-title">모음 뒤 R 소리의 비밀</div>
        <div class="end-card-cta">▶️ 클릭하여 바로 시청하기</div>
      </div>

      <div class="end-card-box">
        <div class="end-card-badge">📺 지난 강의 몰아보기</div>
        <div class="end-card-title">왕초보 필수 파닉스 재생목록</div>
        <div class="end-card-cta">▶️ 전체 영상 이어보기</div>
      </div>
    </div>

    <!-- Bottom Subscribe Bar -->
    <div class="end-bottom-bar">
      <span>🔔 도움이 되셨다면 구독과 좋아요 부탁드립니다!</span>
    </div>
  </div>

${audioTags}
</div>

<script>
  (function () {
    var tl = gsap.timeline({ paused: true });
    var pill = document.getElementById("capPill");
    function cap(text) { pill.textContent = text; gsap.set(pill, { opacity: 1 }); }

    var words = ${wordsJson};

    function highlightWord(label) {
      var targets = ["ff", "ll", "ss", "pp", "tt", "nn", "dd"];
      var patterns = [];
      targets.forEach(function(t) {
        patterns.push(t[0] + "\\\\s*·\\\\s*" + t[1]);
        patterns.push(t);
      });
      var re = new RegExp("(" + patterns.join("|") + ")", "gi");
      return label.replace(re, '<span class="highlight-letter">$1</span>');
    }

    function showEncoreWord(idx) {
      var item = words[idx];
      document.getElementById("badgeCounter").textContent = "단어 " + (item.num < 10 ? "0" + item.num : item.num) + " / 29";
      document.getElementById("wordDisplay").innerHTML = highlightWord(item.syllables || item.label);
      if (item.pron) {
        document.getElementById("meaningDisplay").textContent = "[" + item.pron + "] · " + item.meaning;
      } else {
        document.getElementById("meaningDisplay").textContent = item.meaning;
      }
      document.getElementById("dot0").className = "dot";
      document.getElementById("dot1").className = "dot";
      gsap.fromTo("#encoreCard", { scale: 0.95 }, { scale: 1, duration: 0.25, ease: "back.out(1.5)" });
    }

    function activateEncDot(repIdx) {
      if (repIdx === 0) document.getElementById("dot0").classList.add("active");
      if (repIdx === 1) document.getElementById("dot1").classList.add("active");
    }

    function pulseEnc() {
      gsap.fromTo("#encoreCard", { scale: 1 }, { scale: 1.03, duration: 0.16, yoyo: true, repeat: 1 });
    }

    tl.fromTo("#eyebrow", { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, 0.2);

${whisperCode}
${stageCode}

    // YouTube Endscreen 10.0s: starts at ${curT.toFixed(2)}s, runs for 10s until frame end (${(curT + frameConfig.endPad).toFixed(2)}s)
    var endStart = ${curT.toFixed(2)};
    tl.to(["#eyebrow", "#encoreCard", "#capPill"], { opacity: 0, duration: 0.5, ease: "power2.in" }, endStart);
    tl.fromTo("#endscreenStage", { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.4)" }, endStart + 0.3);

    window.__timelines = window.__timelines || {};
    window.__timelines["12-encore-review"] = tl;
    tl.seek(0);
  })();
</script>
</template>
`;
  fs.writeFileSync(path.join(outDir, '12-encore-review.html'), html);
}

console.log("All 12 frame HTML compositions regenerated with accurate Korean meanings and clean intro states!");
