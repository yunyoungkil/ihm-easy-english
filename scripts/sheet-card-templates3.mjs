// 비교 시트 3안(Gemini · Antigravity 독자 설계, 2026-11-16) 쇼츠 컷 카드 틀(768×1376).
// 1·2안 템플릿을 참고하지 않고 w8g6-e9yLP4(실시간 음성인식 타이머 + 관문 통과 게임)에서 직접 도출한 Arcade Speech-Gate HUD 스타일.
// 불변 규칙: 위 훅 띠(y 0..200) + 아래 정보 띠(y 1156..1376) 항상 포함, 최소 글자 34px, 우측 버튼 자리(y>560, x>628) 및 하단 안전선(y>1238) 비움.

export const CARD3 = Object.freeze({
  width: 768,
  height: 1376,
  minFontPx: 34,
  topBandHeight: 200,
  bottomBandTop: 1156,
  safeTop: 200,
  safeBottom: 1238,
  safeRightX: 628,
});

export const CARD3_TEMPLATES = Object.freeze([
  'gate-quiz',
  'gate-pass',
  'vowel-xray',
  'mic-turn',
  'all-clear',
  'outro-cta',
]);

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const formatHookLine = (line) =>
  esc(line).replace(/\*\*([^*]+)\*\*/g, '<span class="hkl">$1</span>');

const splitWordCluster = (word, clusterLen = 3) => {
  const s = String(word || '');
  const n = Math.max(0, Math.min(s.length, Number(clusterLen) || 3));
  return { head: s.slice(0, n), tail: s.slice(n) };
};

const renderWordSplit = (word, clusterLen = 3) => {
  const { head, tail } = splitWordCluster(word, clusterLen);
  return `<span class="whead">${esc(head)}</span><span class="wtail">${esc(tail)}</span>`;
};

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:768px;height:1376px;overflow:hidden}
body{
  position:relative;
  background:radial-gradient(circle at 50% 42%,#172554 0%,#0f172a 58%,#070b14 100%);
  font-family:"Noto Sans KR","Malgun Gothic",system-ui,sans-serif;
  color:#f8fafc;
}
.grid-bg{
  position:absolute;left:0;top:200px;width:768px;height:956px;
  background-image:
    linear-gradient(rgba(56,189,248,0.07) 2px,transparent 2px),
    linear-gradient(90deg,rgba(56,189,248,0.07) 2px,transparent 2px);
  background-size:48px 48px;
  pointer-events:none;
}
.hook-band{
  position:absolute;left:0;top:0;width:768px;height:200px;
  background:#090d16;
  border-bottom:4px solid #38bdf8;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:6px;padding:12px 24px;
}
.hk{
  display:flex;align-items:center;justify-content:center;
  width:100%;max-width:700px;
}
.hkt{
  font-size:58px;font-weight:900;line-height:1.15;
  letter-spacing:-1.5px;color:#ffffff;white-space:nowrap;
}
.hkl{
  color:#facc15;
  background:rgba(250,204,21,0.14);
  padding:0 12px;border-radius:12px;
}
.stage{
  position:absolute;left:0;top:208px;width:768px;height:940px;
  padding:14px 32px;
}
.hud-top{
  display:flex;align-items:center;justify-content:space-between;
  gap:14px;width:704px;margin-bottom:18px;
}
.pill-rec{
  display:inline-flex;align-items:center;gap:10px;
  background:#450a0a;border:3px solid #ef4444;color:#fecaca;
  padding:10px 20px;border-radius:999px;font-size:36px;font-weight:900;
  white-space:nowrap;
}
.pill-stage{
  display:inline-flex;align-items:center;gap:10px;
  background:#0c4a6e;border:3px solid #38bdf8;color:#e0f2fe;
  padding:10px 22px;border-radius:999px;font-size:36px;font-weight:900;
  white-space:nowrap;
}
.pill-ok{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  background:#064e3b;border:3px solid #10b981;color:#a7f3d0;
  padding:10px 22px;border-radius:999px;font-size:36px;font-weight:900;
  white-space:nowrap;
}
.safe-col{
  width:588px;
  display:flex;flex-direction:column;gap:16px;
}
.tiles{
  display:flex;align-items:center;justify-content:center;gap:12px;
  width:704px;
}
.ktile{
  flex:1;max-width:136px;height:152px;
  background:#1e293b;border:4px solid #ef4444;border-radius:20px;
  box-shadow:0 8px 0 #7f1d1d;
  display:flex;align-items:center;justify-content:center;
  font-size:70px;font-weight:900;color:#ffffff;
}
.q-box{
  width:588px;background:#111c33;border:4px solid #38bdf8;border-radius:28px;
  padding:36px 26px;display:flex;flex-direction:column;gap:26px;
  box-shadow:0 12px 28px rgba(0,0,0,0.45);
}
.q-ask{
  font-size:44px;font-weight:900;line-height:1.25;color:#ffffff;
  word-break:keep-all;text-wrap:balance;
}
.choices{
  display:flex;gap:16px;width:100%;
}
.choice-a,.choice-b{
  flex:1;height:138px;border-radius:22px;
  display:flex;align-items:center;justify-content:center;
  font-size:54px;font-weight:900;white-space:nowrap;
}
.choice-a{
  background:#facc15;color:#090d16;border:4px solid #fef08a;
  box-shadow:0 8px 0 #ca8a04;
}
.choice-b{
  background:#1e293b;color:#f87171;border:4px solid #ef4444;
  box-shadow:0 8px 0 #7f1d1d;
}
.tip-gold{
  display:inline-flex;align-items:center;justify-content:center;
  background:rgba(250,204,21,0.14);border:3px solid #facc15;color:#fde047;
  border-radius:18px;padding:12px 16px;font-size:35px;font-weight:800;
  word-break:keep-all;text-align:center;
}
.pic-wrap{
  width:410px;height:410px;margin:0 auto 14px;
  background:#f4efe6;border:6px solid #e2e8f0;border-radius:32px;
  box-shadow:0 16px 36px rgba(0,0,0,0.5);overflow:hidden;
  display:flex;align-items:center;justify-content:center;
}
.pic-wrap.sm{width:380px;height:380px;margin:0 auto 18px;}
.pic-wrap img{width:100%;height:100%;object-fit:cover;display:block;}
.wrong-strip{
  display:flex;align-items:center;justify-content:space-between;
  background:#450a0a;border:3px solid #ef4444;border-radius:18px;
  padding:12px 20px;font-size:36px;font-weight:900;color:#fecaca;
}
.pass-gate{
  width:588px;background:#052e23;border:5px solid #10b981;border-radius:28px;
  padding:20px 22px;box-shadow:0 10px 0 #064e3b;
  display:flex;flex-direction:column;align-items:center;gap:10px;
}
.word-lg{
  font-size:108px;font-weight:900;line-height:1.05;letter-spacing:-3px;
  white-space:nowrap;
}
.whead{
  background:#facc15;color:#090d16;padding:2px 12px;border-radius:16px;
  margin-right:4px;display:inline-block;
}
.wtail{color:#ffffff;}
.gate-badge{
  font-size:40px;font-weight:900;color:#34d399;
}
.xray-row{
  display:flex;align-items:center;justify-content:center;gap:8px;
  width:704px;margin:10px 0 22px;
}
.xchar{
  height:112px;padding:0 16px;border-radius:18px;
  display:flex;align-items:center;justify-content:center;
  font-size:50px;font-weight:900;background:#1e293b;border:3px solid #475569;color:#fff;
}
.xkill{
  height:112px;padding:0 16px;border-radius:18px;position:relative;
  display:flex;align-items:center;justify-content:center;
  font-size:50px;font-weight:900;background:#7f1d1d;border:4px solid #ef4444;color:#fca5a5;
  text-decoration:line-through;text-decoration-thickness:6px;
}
.cluster-merge{
  width:588px;background:#111c33;border:4px solid #facc15;border-radius:26px;
  padding:20px;display:flex;flex-direction:column;align-items:center;gap:14px;
}
.cchips{display:flex;align-items:center;gap:12px;}
.cchip{
  background:#facc15;color:#090d16;font-size:54px;font-weight:900;
  padding:8px 24px;border-radius:16px;line-height:1;
}
.mic-gate{
  width:588px;background:#0f172a;border:5px solid #facc15;border-radius:28px;
  padding:20px 22px;box-shadow:0 0 28px rgba(250,204,21,0.25);
  display:flex;flex-direction:column;align-items:center;gap:14px;
}
.eq-bars{
  display:flex;align-items:flex-end;justify-content:center;gap:12px;height:44px;
}
.eq-bars span{
  width:14px;background:#38bdf8;border-radius:8px;display:block;
}
.recap-list{
  width:588px;display:flex;flex-direction:column;gap:22px;margin-top:12px;
}
.recap-item{
  background:#111c33;border:3px solid #10b981;border-radius:24px;
  padding:26px 24px;display:flex;align-items:center;justify-content:space-between;
}
.recap-word{font-size:60px;font-weight:900;letter-spacing:-1px;}
.recap-tag{
  background:#064e3b;border:2px solid #10b981;color:#a7f3d0;
  padding:10px 20px;border-radius:14px;font-size:36px;font-weight:900;
  white-space:nowrap;
}
.cta-card{
  width:588px;background:#111c33;border:4px solid #facc15;border-radius:28px;
  padding:42px 24px;display:flex;flex-direction:column;align-items:center;gap:28px;
  text-align:center;
}
.mini-grid{
  display:grid;grid-template-columns:1fr 1fr;gap:12px;width:704px;margin-bottom:22px;
}
.mini-chip{
  background:#064e3b;border:3px solid #10b981;border-radius:18px;
  padding:14px 18px;font-size:40px;font-weight:900;color:#ffffff;text-align:center;
}
.bottom-band{
  position:absolute;left:0;top:1156px;width:768px;height:220px;
  background:#090d16;border-top:4px solid rgba(56,189,248,0.6);
  padding:8px 32px;
}
.bot-sub{
  width:588px;height:66px;
  background:#1e293b;border:2px solid #38bdf8;border-radius:16px;
  display:flex;align-items:center;padding:0 20px;
  font-size:38px;font-weight:800;color:#f8fafc;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.dots{
  position:absolute;left:32px;top:92px;
  display:flex;align-items:center;gap:14px;
}
.dots span{
  width:54px;height:14px;border-radius:999px;background:#334155;display:block;
}
.dots span.done{background:#10b981;}
.dots span.now{background:#facc15;width:82px;}
`;

function renderBottom(bottom = {}) {
  const total = Math.max(1, Number(bottom.total) || 4);
  const done = Math.max(0, Number(bottom.done) || 0);
  const current = Number(bottom.current ?? -1);
  const text = bottom.subtitle || bottom.speaker || '';
  const dotEls = Array.from({ length: total }, (_, i) => {
    const cls = i === current ? 'now' : i < done ? 'done' : '';
    return `<span class="${cls}"></span>`;
  }).join('');
  return `<div class="bottom-band">
    <div class="bot-sub">${esc(text)}</div>
    <div class="dots">${dotEls}</div>
  </div>`;
}

function renderGateQuiz(cut) {
  const syl = cut.syl || ['스', '트', '레', '스'];
  const opts = cut.options || ['1박자?', `${syl.length}박자?`];
  return `
    <div class="hud-top">
      <div class="pill-rec">🎙️ 00:01</div>
      <div class="pill-stage">발음 관문 퀴즈</div>
    </div>
    <div class="tiles">${syl.map((s) => `<div class="ktile">${esc(s)}</div>`).join('')}</div>
    <div style="height:26px"></div>
    <div class="q-box">
      <div class="q-ask">${esc(cut.question || `한글 ${syl.length}글자, 영어로 몇 박자일까요?`)}</div>
      <div class="choices">
        <div class="choice-a">${esc(opts[0])}</div>
        <div class="choice-b">${esc(opts[1])}</div>
      </div>
      <div class="tip-gold">${esc(cut.hint || '소리로 맞혀 관문을 뚫어보세요!')}</div>
    </div>
  `;
}

function renderGatePass(cut) {
  const stageNum = Number(cut.stage || 1);
  const total = Number(cut.stageTotal || 4);
  const syl = (cut.syl || []).join('·');
  return `
    <div class="hud-top">
      <div class="pill-stage">STAGE ${stageNum}/${total}</div>
      <div class="pill-ok">✓ 관문 돌파</div>
    </div>
    <div class="pic-wrap"><img src="${cut.picData}" alt=""></div>
    <div class="safe-col">
      <div class="wrong-strip"><span>✗ ${esc(syl)}</span><span>${(cut.syl || []).length}박자 막힘</span></div>
      <div class="pass-gate">
        <div class="word-lg">${renderWordSplit(cut.word, cut.clusterLen || 3)}</div>
        <div class="gate-badge">✓ ${esc(cut.badge || '딱 1박자 통과!')}</div>
      </div>
    </div>
  `;
}

function renderVowelXray(cut) {
  const parts = cut.xrayParts || ['스', 'ㅡ', '트', 'ㅡ', '레', 'ㅡ', '스'];
  const letters = cut.clusterLetters || ['s', 't', 'r'];
  return `
    <div class="hud-top">
      <div class="pill-stage">원리 X-RAY</div>
      <div class="pill-rec">으 모음 삭제</div>
    </div>
    <div class="xray-row">
      ${parts.map((p) => `<div class="${p === 'ㅡ' ? 'xkill' : 'xchar'}">${esc(p)}</div>`).join('')}
    </div>
    <div class="safe-col">
      <div class="cluster-merge">
        <div style="font-size:38px;font-weight:900;color:#fde047">숨은 'ㅡ' 빼고 한 번에 묶기!</div>
        <div class="cchips">${letters.map((c) => `<div class="cchip">${esc(c)}</div>`).join('<span style="font-size:46px;font-weight:900">+</span>')}</div>
      </div>
      <div class="pass-gate">
        <div class="word-lg">${renderWordSplit(cut.word || 'stress', cut.clusterLen || 3)}</div>
        <div class="gate-badge">✓ 한 숨에 딱 1박자!</div>
      </div>
    </div>
  `;
}

function renderMicTurn(cut) {
  const bars = [20, 34, 42, 28, 44, 32, 22, 38, 26];
  return `
    <div class="hud-top">
      <div class="pill-rec">🎙️ REC · ${esc(cut.timer || '00:02')}</div>
      <div class="pill-stage">${esc(cut.stageLabel || '내 차례')}</div>
    </div>
    <div class="pic-wrap sm"><img src="${cut.picData}" alt=""></div>
    <div class="mic-gate">
      <div class="word-lg">${renderWordSplit(cut.word, cut.clusterLen || 3)}</div>
      <div class="eq-bars">${bars.map((h) => `<span style="height:${h}px"></span>`).join('')}</div>
      <div class="tip-gold" style="width:100%;justify-content:center">${esc(cut.guide || '① 으 빼고 → ② 한 숨에 말하기!')}</div>
    </div>
  `;
}

function renderAllClear(cut) {
  const rows = cut.rows || [];
  return `
    <div class="hud-top">
      <div class="pill-ok">🏆 STAGE 4/4 올클리어!</div>
      <div class="pill-stage">한 숨 총정리</div>
    </div>
    <div class="recap-list">
      ${rows
        .map(
          (r) => `<div class="recap-item">
        <div class="recap-word">${renderWordSplit(r.word, r.clusterLen || 3)}</div>
        <div class="recap-tag">✓ 1박자</div>
      </div>`
        )
        .join('')}
    </div>
  `;
}

function renderOutroCta(cut) {
  const words = cut.words || ['stress', 'screen', 'spray', 'strike'];
  return `
    <div class="hud-top">
      <div class="pill-ok">✓ 4개 관문 클리어</div>
      <div class="pill-stage">다음 챌린지</div>
    </div>
    <div class="mini-grid">
      ${words.map((w) => `<div class="mini-chip">${renderWordSplit(w, 3)}</div>`).join('')}
    </div>
    <div class="cta-card">
      <div style="font-size:42px;font-weight:900;color:#ffffff;word-break:keep-all">${esc(cut.ctaTitle || '헷갈리는 1박자 단어')}</div>
      <div style="font-size:50px;font-weight:900;color:#facc15;word-break:keep-all">${esc(cut.ctaAsk || '댓글로 남겨 주세요!')}</div>
      <div class="pill-ok" style="font-size:40px;padding:14px 28px">👇 다음 편에 바로 다룰게요</div>
    </div>
  `;
}

const RENDERERS = {
  'gate-quiz': renderGateQuiz,
  'gate-pass': renderGatePass,
  'vowel-xray': renderVowelXray,
  'mic-turn': renderMicTurn,
  'all-clear': renderAllClear,
  'outro-cta': renderOutroCta,
};

export function renderCard3Html(cut, plan3 = {}) {
  const fn = RENDERERS[cut?.template];
  if (!fn) throw new Error(`알 수 없는 3안 카드 틀: ${cut?.template}`);
  const hookLines = Array.isArray(plan3.hook) ? plan3.hook : ['한글은 4~5글자', '영어는 **딱 1박자**'];
  const hookHtml = hookLines
    .map((line) => `<div class="hk"><span class="hkt">${formatHookLine(line)}</span></div>`)
    .join('');

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<style>${CSS}</style>
</head>
<body>
  <div class="grid-bg"></div>
  <div class="hook-band">${hookHtml}</div>
  <div class="stage">${fn(cut)}</div>
  ${renderBottom(cut.bottom)}
</body>
</html>`;
}
