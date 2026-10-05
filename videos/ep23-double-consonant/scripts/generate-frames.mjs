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

// Helper to format whisper sync lines
function buildWhisperCalls(wordsKey) {
  const words = loadWords(wordsKey);
  if (!words || words.length === 0) return '';
  
  // Group words into natural sentence chunks
  const chunks = [];
  let curChunk = [];
  let curStart = 0;
  
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (curChunk.length === 0) curStart = w.from;
    curChunk.push(w.word);
    
    // Break on punctuation or after 6~8 words
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
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 24px; padding: 4cqh 6cqw; text-align: center;
  }
  .hero-word {
    font-family: 'Archivo Black', sans-serif; font-size: 8.5cqw; line-height: 1; letter-spacing: 0.04em;
  }
  .highlight-red {
    color: #EF4444; border-bottom: 8px solid #EF4444; padding-bottom: 2px;
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
    </div>
    <div class="rule-capsule" id="ruleCapsule">
      ✨ 같은 자음 두 개는 딱 한 번만 소리 난다!
    </div>
  </div>

  <div class="caption-pill" id="capPill"></div>

  <audio id="v01" src="assets/voice/01_f01_hook.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="0" data-duration="21.04"></audio>
  <audio id="v01_word" src="assets/voice/en_coffee.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="22.04" data-duration="0.85"></audio>
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
    // Pulse coffee card when word plays at 22.04s
    tl.to("#wordCard", { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1 }, 22.04);
    tl.call(function() { cap("Coffee. (한 번만 툭!)"); }, null, 22.04);

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
  const hoppingStart = 47.68;
  const hoppingRepInt = 3.94; // 0.94 + 3.0

  let audioTags = `  <audio id="v02" src="assets/voice/02_f02_principle.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="0" data-duration="26.12"></audio>\n`;
  let dotsTimelineCode = '';

  for (let r = 0; r < 6; r++) {
    const t = hopingStart + r * hopingRepInt;
    audioTags += `  <audio id="v_hoping_${r}" src="assets/voice/en_hoping.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="${t.toFixed(2)}" data-duration="0.51"></audio>\n`;
    dotsTimelineCode += `    tl.call(function() { activateDot('hopingDots', ${r}); cap('hoping (P 1개 = 앞 모음 길게 / 장모음)'); }, null, ${t.toFixed(2)});\n`;
  }
  for (let r = 0; r < 6; r++) {
    const t = hoppingStart + r * hoppingRepInt;
    audioTags += `  <audio id="v_hopping_${r}" src="assets/voice/en_hopping.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="${t.toFixed(2)}" data-duration="0.94"></audio>\n`;
    dotsTimelineCode += `    tl.call(function() { activateDot('hoppingDots', ${r}); cap('hopping (P 2개 = 앞 모음 짧게 / 단모음)'); }, null, ${t.toFixed(2)});\n`;
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
    background: #FFFFFF; border: 3px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 22px; padding: 3cqh 3cqw; display: flex; flex-direction: column; align-items: center;
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
    border-radius: 16px; padding: 2cqh 2.4cqw; text-align: center;
  }
  .word-row.active {
    border-color: #F59E0B; box-shadow: 4px 4px 0px #F59E0B; background: #FFFFFF;
  }
  .word-row .en {
    font-family: 'Archivo Black', sans-serif; font-size: 4cqw; line-height: 1; letter-spacing: 0.02em;
  }
  .word-row .kr {
    font-size: 1.35cqw; font-weight: 800; color: #7A7365; margin-top: 1cqh;
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

    <!-- Right: Hoping vs Hopping -->
    <div class="panel-card" id="rightPanel">
      <div class="compare-box">
        <div class="word-row" id="rowHoping">
          <div class="en">ho<span class="highlight-p">p</span>ing</div>
          <div class="kr">장모음 [호우핑] (p 1개 ➔ 모음 길게)</div>
          <div class="repeat-dots" id="hopingDots">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>

        <div class="word-row" id="rowHopping">
          <div class="en">ho<span class="highlight-p">pp</span>ing</div>
          <div class="kr">단모음 [하핑] (p 2개 ➔ 앞 모음 짧게!)</div>
          <div class="repeat-dots" id="hoppingDots">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
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
function generateDrillFrame(frameConfig, targetConsonant, actionTip) {
  const introDur = getDur(frameConfig.intro);
  const whisperCode = buildWhisperCalls(frameConfig.intro);
  
  let curT = introDur + 1.5;
  let audioTags = `  <audio id="v_intro" src="assets/voice/${frameConfig.intro}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="0" data-duration="${introDur.toFixed(2)}"></audio>\n`;
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
      audioTags += `  <audio id="${tagId}" src="assets/voice/${item.key}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="${repStart.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>\n`;
      stageCode += `    tl.call(function() { activateRepDot(${r}); pulseCard(); cap("${item.label}"); }, null, ${repStart.toFixed(2)});\n`;
      
      curT += dur;
      if (r < item.reps - 1) {
        curT += frameConfig.repInterval;
      }
    }

    if (i < items.length - 1) {
      curT += frameConfig.itemInterval;
    }
  }

  // Items metadata for client JS
  const itemsJson = JSON.stringify(items.map(it => ({
    label: it.label,
    type: it.type,
    sub: it.sub || (it.type === 'sentence' ? '실전 대화 문장' : targetConsonant.toUpperCase() + ' 단어'),
    reps: it.reps,
    voice: it.voice === 'female' ? '👧 Kore (여성)' : '👦 Puck (남성)'
  })));

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
    border-radius: 28px; padding: 4.5cqh 5cqw; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 2cqh;
  }
  .voice-pill {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 999px;
    padding: 0.6cqh 1.8cqw; font-size: 1.1cqw; font-weight: 900; color: #7A7365;
  }
  .main-text {
    font-family: 'Archivo Black', sans-serif; font-size: 6.5cqw; line-height: 1.1;
    letter-spacing: 0.02em; color: #111111;
  }
  .main-text.sentence {
    font-size: 3.8cqw; line-height: 1.25;
  }
  .sub-note {
    font-size: 1.5cqw; font-weight: 800; color: #7A7365;
  }
  .highlight-letter {
    color: #EF4444; border-bottom: 6px solid #EF4444; padding-bottom: 2px;
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
    <span class="tip-badge">${targetConsonant.toUpperCase()} 사운드</span>
    <span>${actionTip}</span>
  </div>

  <div class="stage">
    <div class="hero-card" id="heroCard">
      <div class="voice-pill" id="voicePill">👦 Puck (남성)</div>
      <div class="main-text" id="mainText">CO<span class="highlight-letter">FF</span>EE</div>
      <div class="sub-note" id="subNote">소리는 딱 한 번!</div>
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

    function highlightText(label, type) {
      if (type === "sentence") return label;
      var regex = new RegExp("(" + target + target + ")", "gi");
      return label.replace(regex, '<span class="highlight-letter">$1</span>');
    }

    function showItem(idx) {
      var item = items[idx];
      var voiceEl = document.getElementById("voicePill");
      var textEl = document.getElementById("mainText");
      var subEl = document.getElementById("subNote");
      var dotsEl = document.getElementById("dotsContainer");

      voiceEl.textContent = item.voice;
      textEl.innerHTML = highlightText(item.label, item.type);
      if (item.type === "sentence") {
        textEl.className = "main-text sentence";
      } else {
        textEl.className = "main-text";
      }
      subEl.textContent = item.sub;

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

// Generate F03~F08
generateDrillFrame(framesConfig[2], "ff", "아랫입술을 두 번 물지 않고 바람을 한 번만!");
generateDrillFrame(framesConfig[3], "ll", "혀끝을 윗니 뒤에 딱 한 번만 대고 소리 내기!");
generateDrillFrame(framesConfig[4], "ss", "소리를 길게 끌지 않고 한 번에 시원하게 툭!");
generateDrillFrame(framesConfig[5], "pp", "두 번 터뜨리지 말고 가볍게 한 번만 닫았다 열기!");
generateDrillFrame(framesConfig[6], "nn", "두 단어가 만나는 경계에서는 소리가 이어져 살짝 깁니다");
generateDrillFrame(framesConfig[7], "tt", "모음 사이 tt는 트가 아니라 부드러운 'ㄹ' (Flap T)");

// -------------------------------------------------------------
// 9. F09 Cafe Dialogue (with f09_cafe_scene.mp4)
// -------------------------------------------------------------
{
  const frameConfig = framesConfig[8];
  const introDur = getDur(frameConfig.intro);
  const whisperCode = buildWhisperCalls(frameConfig.intro);
  let curT = introDur + 1.5;
  let audioTags = `  <audio id="v_intro" src="assets/voice/${frameConfig.intro}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="0" data-duration="${introDur.toFixed(2)}"></audio>\n`;
  let stageCode = '';

  const items = frameConfig.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dur = getDur(item.key);
    const itemStart = curT;

    stageCode += `    tl.call(function() { showDialogue(${i}); }, null, ${itemStart.toFixed(2)});\n`;

    for (let r = 0; r < item.reps; r++) {
      const repStart = curT;
      const tagId = `v_cafe_${i}_${r}`;
      audioTags += `  <audio id="${tagId}" src="assets/voice/${item.key}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="${repStart.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>\n`;
      stageCode += `    tl.call(function() { activateDialogueDot(${r}); pulseDialogue(); cap("${item.label}"); }, null, ${repStart.toFixed(2)});\n`;

      curT += dur;
      if (r < item.reps - 1) curT += frameConfig.repInterval;
    }
    if (i < items.length - 1) curT += frameConfig.itemInterval;
  }

  const dialoguesJson = JSON.stringify(items.map(it => ({
    text: it.label,
    reps: it.reps,
    speaker: it.voice === 'female' ? '👩 손님 (Kore)' : '👦 바리스타 (Puck)',
    side: it.voice === 'female' ? 'left' : 'right'
  })));

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
  /* Background Video Frame */
  .video-stage {
    position: absolute; left: 50%; top: 48%; transform: translate(-50%, -50%);
    width: 86cqw; height: 68cqh; border: 3.5px solid #111111; box-shadow: 7px 7px 0px #111111;
    border-radius: 24px; overflow: hidden; background: #000000; z-index: 5;
  }
  .video-stage video {
    width: 100%; height: 100%; object-fit: cover; opacity: 0.75;
  }
  .dialogue-overlay {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    justify-content: center; align-items: center; padding: 4cqh 5cqw; z-index: 10;
  }
  .dialogue-card {
    background: rgba(255, 255, 255, 0.96); border: 3px solid #111111; box-shadow: 5px 5px 0px #111111;
    border-radius: 22px; padding: 3.5cqh 4.5cqw; max-width: 90%; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 1.8cqh;
  }
  .speaker-badge {
    background: #F59E0B; border: 2px solid #111111; border-radius: 999px;
    padding: 0.6cqh 1.8cqw; font-size: 1.15cqw; font-weight: 900; color: #111111;
  }
  .sentence-text {
    font-family: 'Archivo Black', sans-serif; font-size: 3.8cqw; line-height: 1.25; color: #111111;
  }
  .repeat-dots {
    display: flex; gap: 0.8cqw; justify-content: center; align-items: center;
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

<div id="root" data-composition-id="09-cafe-dialogue" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    ☕ 카페 실전 회화: 일상 대화 속 겹자음 소리 듣기
  </div>

  <div class="video-stage">
    <video id="cafeVideo" src="assets/videos/f09_cafe_scene.mp4" data-start="0" data-duration="129.46" data-hf-media-start-basis="local" autoplay loop muted playsinline></video></video>
    <div class="dialogue-overlay">
      <div class="dialogue-card" id="dialogueCard">
        <div class="speaker-badge" id="speakerBadge">👩 손님 (Kore)</div>
        <div class="sentence-text" id="sentenceText">Two coffees, please.</div>
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

    function showDialogue(idx) {
      var item = dialogues[idx];
      document.getElementById("speakerBadge").textContent = item.speaker;
      document.getElementById("sentenceText").textContent = item.text;

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
// 10. F10 Shuffle Drill
// -------------------------------------------------------------
{
  const frameConfig = framesConfig[9];
  const introDur = getDur(frameConfig.intro);
  const whisperCode = buildWhisperCalls(frameConfig.intro);
  let curT = introDur + 1.5;
  let audioTags = `  <audio id="v_intro" src="assets/voice/${frameConfig.intro}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="0" data-duration="${introDur.toFixed(2)}"></audio>\n`;
  let stageCode = '';

  const items = frameConfig.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dur = getDur(item.key);
    const itemStart = curT;

    stageCode += `    tl.call(function() { showShuffleWord(${i}); }, null, ${itemStart.toFixed(2)});\n`;

    for (let r = 0; r < item.reps; r++) {
      const repStart = curT;
      const tagId = `v_shuf_${i}_${r}`;
      audioTags += `  <audio id="${tagId}" src="assets/voice/${item.key}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="${repStart.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>\n`;
      stageCode += `    tl.call(function() { activateShufDot(${r}); pulseShuf(); cap("${item.label}"); }, null, ${repStart.toFixed(2)});\n`;

      curT += dur;
      if (r < item.reps - 1) curT += frameConfig.repInterval;
    }
    if (i < items.length - 1) curT += frameConfig.itemInterval;
  }

  const wordsJson = JSON.stringify(items.map((it, idx) => ({
    label: it.label,
    num: idx + 1
  })));

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
    width: 70cqw; display: flex; flex-direction: column; align-items: center; z-index: 5;
  }
  .deck-card {
    background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 5cqh 6cqw; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 2.2cqh;
  }
  .badge-counter {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 999px;
    padding: 0.5cqh 1.8cqw; font-size: 1.1cqw; font-weight: 900; color: #7A7365;
  }
  .word-display {
    font-family: 'Archivo Black', sans-serif; font-size: 7.5cqw; line-height: 1; letter-spacing: 0.03em;
  }
  .repeat-dots { display: flex; gap: 1cqw; justify-content: center; }
  .dot {
    width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #E5E0D8;
    border: 2.5px solid #111111;
  }
  .dot.active { background: #F59E0B; transform: scale(1.3); }

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
    <div class="deck-card" id="deckCard">
      <div class="badge-counter" id="badgeCounter">단어 01 / 29</div>
      <div class="word-display" id="wordDisplay">COFFEE</div>
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

    function showShuffleWord(idx) {
      var item = words[idx];
      document.getElementById("badgeCounter").textContent = "단어 " + (item.num < 10 ? "0" + item.num : item.num) + " / 29";
      document.getElementById("wordDisplay").textContent = item.label;
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

  <audio id="v11" src="assets/voice/11_f11_summary.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="0" data-duration="19.20"></audio>
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

    // YouTube Endscreen keep-out: Clear center at 19.2s
    tl.to("#boardStage", { opacity: 0, duration: 0.5 }, 19.2);
    tl.to("#commentBox", { y: 50, duration: 0.5 }, 19.2);

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
// 12. F12 Encore Review
// -------------------------------------------------------------
{
  const frameConfig = framesConfig[11];
  const introDur = getDur(frameConfig.intro);
  const whisperCode = buildWhisperCalls(frameConfig.intro);
  let curT = introDur + 1.5;
  let audioTags = `  <audio id="v_intro" src="assets/voice/${frameConfig.intro}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="0" data-duration="${introDur.toFixed(2)}"></audio>\n`;
  let stageCode = '';

  const items = frameConfig.items;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const dur = getDur(item.key);
    const itemStart = curT;

    stageCode += `    tl.call(function() { showEncoreWord(${i}); }, null, ${itemStart.toFixed(2)});\n`;

    for (let r = 0; r < item.reps; r++) {
      const repStart = curT;
      const tagId = `v_enc_${i}_${r}`;
      audioTags += `  <audio id="${tagId}" src="assets/voice/${item.key}.wav" data-audio-group="voiceover" data-hf-media-start-basis="local" data-hf-media-start-basis="local" data-start="${repStart.toFixed(2)}" data-duration="${dur.toFixed(2)}"></audio>\n`;
      stageCode += `    tl.call(function() { activateEncDot(${r}); pulseEnc(); cap("${item.label}"); }, null, ${repStart.toFixed(2)});\n`;

      curT += dur;
      if (r < item.reps - 1) curT += frameConfig.repInterval;
    }
    if (i < items.length - 1) curT += frameConfig.itemInterval;
  }

  const wordsJson = JSON.stringify(items.map((it, idx) => ({
    label: it.label,
    num: idx + 1
  })));

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
    width: 70cqw; display: flex; flex-direction: column; align-items: center; z-index: 5;
  }
  .encore-card {
    background: #FFFFFF; border: 3.5px solid #111111; box-shadow: 6px 6px 0px #111111;
    border-radius: 28px; padding: 5cqh 6cqw; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 2.2cqh;
  }
  .badge-counter {
    background: #FAF7F2; border: 2px solid #111111; border-radius: 999px;
    padding: 0.5cqh 1.8cqw; font-size: 1.1cqw; font-weight: 900; color: #7A7365;
  }
  .word-display {
    font-family: 'Archivo Black', sans-serif; font-size: 7.5cqw; line-height: 1; letter-spacing: 0.03em;
  }
  .repeat-dots { display: flex; gap: 1cqw; justify-content: center; }
  .dot {
    width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #E5E0D8;
    border: 2.5px solid #111111;
  }
  .dot.active { background: #F59E0B; transform: scale(1.3); }

  .caption-pill {
    position: absolute; bottom: 3.5cqh; left: 50%; transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.98); border: 2.5px solid #111111; box-shadow: 4px 4px 0px #111111;
    border-radius: 36px; padding: 1.1cqh 2.6cqw; font-size: 1.5cqw; font-weight: 800;
    color: #111111; text-align: center; max-width: 86cqw; z-index: 50; opacity: 0;
  }
  audio { display: none; }
</style>

<div id="root" data-composition-id="12-encore-review" data-width="1920" data-height="1080">
  <div class="eyebrow-pill" id="eyebrow">
    ☕ 앵콜 총복습: 편안하게 틀어두고 귀에 새겨보세요
  </div>

  <div class="stage">
    <div class="encore-card" id="encoreCard">
      <div class="badge-counter" id="badgeCounter">단어 01 / 29</div>
      <div class="word-display" id="wordDisplay">COFFEE</div>
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

    function showEncoreWord(idx) {
      var item = words[idx];
      document.getElementById("badgeCounter").textContent = "단어 " + (item.num < 10 ? "0" + item.num : item.num) + " / 29";
      document.getElementById("wordDisplay").textContent = item.label;
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

    window.__timelines = window.__timelines || {};
    window.__timelines["12-encore-review"] = tl;
    tl.seek(0);
  })();
</script>
</template>
`;
  fs.writeFileSync(path.join(outDir, '12-encore-review.html'), html);
}

console.log("All 12 frame HTML compositions generated successfully in compositions/frames!");
