// 변형 시트의 컷 카드 틀(2026-11-12 사용자 제안: 복잡한 그림이 아니면 코드로 만들고 이미지로 변환한다).
// 왜 코드인가: AI 이미지 모델은 "한 글자만 흐리게" 같은 철자 지시를 4번 틀렸다. 글자가 핵심인 카드는 HTML로 그리면 철자·강조를
// 틀릴 수 없고, 같은 틀이 나중에 HyperFrames 컴포지션의 화면으로 그대로 이어진다(재작업 없음). 복잡한 그림·사진 느낌은 계속 AI Studio.
// 카드는 768×1376 세로(쇼츠), 크림 배경 + 굵은 테두리 + 하드 섀도우 + 노란 알약(채널 시그니처 스타일). 렌더는 scripts/render-sheet-cards.mjs.
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 단어에서 사라지는 글자를 [시작, 끝) 위치로 지정하면 앞·사라짐·뒤 조각을 코드가 계산한다. 철자를 따로 쓰지 않는다. */
export function splitWord(word, drop) {
  const w = String(word);
  const [a, b] = drop || [];
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b <= a || b > w.length) throw new Error(`사라지는 글자 범위가 이상하다: ${w} [${a}, ${b}]`);
  return {before: w.slice(0, a), gone: w.slice(a, b), after: w.slice(b)};
}

const CSS = `html{zoom:2}*{box-sizing:border-box;margin:0}
body{width:384px;height:688px;background:#F4EFE6;font-family:"Malgun Gothic","Apple SD Gothic Neo",sans-serif;display:flex;align-items:center;justify-content:center;color:#000}
.card{width:360px;min-height:520px;background:#fff;border:5px solid #000;border-radius:24px;box-shadow:10px 10px 0 #000;padding:28px 12px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}
.word{font:900 56px/1 "Arial Black","Arial",sans-serif;letter-spacing:-1px;display:flex;justify-content:center;align-items:flex-end;gap:2px;white-space:nowrap}
.word.small{font-size:56px}
.gone{position:relative;color:#bdbdbd}
.gone:after{content:"";position:absolute;left:-6px;right:-6px;top:50%;height:8px;background:#e8202a;transform:rotate(-38deg)}
.ko{font:900 72px/1.1 "Malgun Gothic",sans-serif;margin-top:34px}
.ko.small{font-size:64px}
.wrong{color:#e8202a}
.pill{display:inline-block;word-break:keep-all;text-wrap:balance;max-width:330px;margin-top:34px;background:#F5C518;border:4px solid #000;border-radius:44px;box-shadow:5px 5px 0 #000;padding:11px 20px;font:900 23px/1.1 "Malgun Gothic",sans-serif}
.pill.top{margin:0 0 34px}
.badge{display:inline-block;margin-top:26px;background:#e8202a;color:#fff;border:4px solid #000;border-radius:50%;width:68px;height:68px;line-height:58px;font:900 42px "Malgun Gothic",sans-serif;box-shadow:4px 4px 0 #000}
.arrow{font:900 48px/1 sans-serif;margin:18px 0 0}
.rrow{width:100%;display:flex;justify-content:space-between;align-items:center;gap:8px;border-top:3px solid #000;padding:20px 8px;font:900 26px/1.1 "Arial Black","Arial",sans-serif}
.rrow:first-of-type{border-top:0}
.rrow .k{font:900 30px/1.1 "Malgun Gothic",sans-serif}
.say{font:900 40px/1.3 "Malgun Gothic",sans-serif;word-break:keep-all;text-wrap:balance}`;

const pill = (t, cls = '') => (t ? `<div class="pill ${cls}">${esc(t)}</div>` : '');
const wrap = (inner) => `<!doctype html><meta charset="utf-8"><style>${CSS}</style><div class="card">${inner}</div>`;
const dropWord = (c, small = false) => {
  const p = splitWord(c.word, c.drop);
  return `<div class="word${small ? ' small' : ''}"><span>${esc(p.before)}</span><span class="gone">${esc(p.gone)}</span><span>${esc(p.after)}</span></div>`;
};

export const CARD_TEMPLATES = {
  // 질문으로 시작하는 첫 카드: 단어 + 질문 알약
  hook: (c) => wrap(`${pill(c.pill, 'top')}<div class="word">${esc(c.word)}</div><div><span class="badge">?</span></div>`),
  // 한글로 적은 소리 ✗ → 실제에 가까운 소리
  contrast: (c) => wrap(`<div class="word small">${esc(c.word)}</div><div class="ko small wrong">${esc(c.written)} ✗</div><div class="arrow">↓</div><div class="ko">${esc(c.sound)}</div>${pill(c.pill)}`),
  // 어느 한 글자가 흐려지고 빨간 선이 그어지는 카드
  'vowel-drop': (c) => wrap(`${dropWord(c)}<div class="ko">${esc(c.sound)}</div>${pill(c.pill)}`),
  // 한국어에서 이미 하는 줄임 비유
  analogy: (c) => wrap(`${pill(c.pill, 'top')}<div class="say">${esc(c.from)}</div><div class="arrow">↓</div><div class="say wrong2">${esc(c.to)}</div>`),
  // 단어 카드: 한글 표기대로 읽으면 틀림(✗)
  'word-wrong': (c) => wrap(`<div class="word small">${esc(c.word)}</div><div class="ko wrong">${esc(c.written)} ✗</div>${pill(c.pill)}`),
  // 단어 카드: 사라지는 글자 + 줄어든 소리
  'word-drop': (c) => wrap(`${dropWord(c, true)}<div class="ko">${esc(c.sound)}</div>${pill(c.pill)}`),
  // 정리표: 줄마다 단어 → 소리
  recap: (c) => wrap(`${pill(c.pill, 'top')}${(c.rows || []).map((r) => `<div class="rrow"><span>${esc(r.word)}</span><span>→</span><span class="k">${esc(r.sound)}</span></div>`).join('')}`),
  // 퀴즈: 단어만 보여 주고 질문
  quiz: (c) => wrap(`${pill(c.pill, 'top')}<div class="word small">${esc(c.word)}</div><div><span class="badge">?</span></div>`),
  // 마지막 댓글 유도
  cta: (c) => wrap(`<div class="say">${esc(c.text)}</div>${pill(c.pill)}`),
};

export function renderCardHtml(cut) {
  const fn = CARD_TEMPLATES[cut?.template];
  if (!fn) throw new Error(`없는 카드 틀: ${cut?.template}`);
  return fn(cut);
}
