// 합친 아웃라이어 리포트를 사람이 보는 화면(HTML)으로 그린다(2026-11-12).
// 대시보드 서버가 /outlier-reports, /outlier-report/<영상ID> 로 보여 준다. 읽기 전용.
// 댓글·자막·제목은 외부에서 온 글자라서 전부 escapeHtml을 거친다(시험이 확인).

import { fullScript } from './transform-sheet.mjs';
import { formatRatioLabel, ratioTier } from './peer-ratio.mjs';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
/** 컷 수 라벨. 0개(또는 값 없음)는 감지가 실패했을 수 있다(2026-11-15 감사 D: 영화 장면 3개인 영상 _xfBa82OAaw가 0개로 잡혔다). */
export function cutCountLabel(pacing) {
  const n = Number(pacing?.count);
  return Number.isFinite(n) && n > 0 ? `${n}번` : '0번(감지 실패 가능)';
}
const mmss = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const num = (n) => (n == null ? '측정 전' : Number(n).toLocaleString('ko-KR'));

const STYLE = `
:root{--bg:#0b0f19;--card:#111827;--card-hover:#162032;--ink:#f8fafc;--sub:#94a3b8;--line:rgba(255,255,255,0.08);--line-subtle:rgba(255,255,255,0.04);--ok:#34d399;--ok-bg:rgba(52,211,153,0.12);--bad:#f87171;--bad-bg:rgba(248,113,113,0.12);--na:#94a3b8;--accent:#38bdf8;--accent-glow:rgba(56,189,248,0.15);--accent-amber:#f59e0b;--accent-purple:#a855f7}
@media (prefers-color-scheme:light){:root{--bg:#f8fafc;--card:#ffffff;--card-hover:#f1f5f9;--ink:#0f172a;--sub:#64748b;--line:#e2e8f0;--line-subtle:#edf2f7;--ok:#059669;--ok-bg:rgba(5,150,105,0.1);--bad:#dc2626;--bad-bg:rgba(220,38,38,0.1);--na:#64748b;--accent:#0284c7;--accent-glow:rgba(2,132,199,0.1);--accent-amber:#d97706;--accent-purple:#9333ea}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14.5px/1.65 -apple-system,BlinkMacSystemFont,"Pretendard","Noto Sans KR",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1120px;margin:0 auto;padding:24px 20px 60px}a{color:var(--accent);text-decoration:none;transition:color 0.15s,opacity 0.15s}a:hover{color:var(--ink);text-decoration:underline}
h1{font-size:23px;font-weight:800;letter-spacing:-0.5px;margin:12px 0 16px;line-height:1.3}h2{font-size:17px;font-weight:700;margin:32px 0 12px;border-left:4px solid var(--accent);padding-left:10px;line-height:1.4}h3{font-size:14.5px;font-weight:700;margin:18px 0 8px;color:var(--sub)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;margin:10px 0;box-shadow:0 2px 8px rgba(0,0,0,0.06);transition:border-color 0.2s,box-shadow 0.2s}
.meta{color:var(--sub);font-size:13px;line-height:1.55}.q{background:rgba(255,255,255,0.03);border-left:3px solid var(--accent);padding:8px 12px;border-radius:0 8px 8px 0;margin:8px 0;font-size:13.5px;color:var(--ink);line-height:1.5}
.ok{color:var(--ok);background:var(--ok-bg);padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block}.bad{color:var(--bad);background:var(--bad-bg);padding:2px 8px;border-radius:6px;font-size:12px;font-weight:600;display:inline-block}.na{color:var(--na);padding:2px 8px;border-radius:6px;font-size:12px}
.moment{display:grid;grid-template-columns:minmax(0,1fr);gap:10px}.moment img{width:auto;max-width:100%;height:auto;border-radius:8px;border:1px solid var(--line)}
.t{font-weight:700;font-variant-numeric:tabular-nums;color:var(--accent);background:var(--accent-glow);padding:2px 6px;border-radius:4px;font-size:12.5px}
table{width:100%;border-collapse:collapse;font-size:13.5px;display:table;border-radius:8px;overflow:hidden;border:1px solid var(--line);margin:10px 0}code{font-size:12.5px;background:var(--line);padding:2px 5px;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}th{background:rgba(255,255,255,0.04);font-weight:700;color:var(--sub);border-bottom:1px solid var(--line);padding:10px 12px;text-align:left}td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}tr:last-child td{border-bottom:none}
.thumbbox{display:flex;flex-wrap:nowrap;gap:14px;overflow:auto;max-height:80vh;padding:12px 6px 16px;border:1px solid var(--line);border-radius:12px;margin:10px 0;background:rgba(0,0,0,0.04)}.pick{position:relative;flex:0 0 auto;transition:transform 0.2s}.pick:hover{transform:translateY(-2px)}.pick img.real{width:200px;height:355px;object-fit:cover;display:block;border-radius:10px;border:1px solid var(--line);box-shadow:0 4px 12px rgba(0,0,0,0.12)}.pick input{position:absolute;top:6px;right:6px;width:24px;height:24px;accent-color:var(--accent);cursor:pointer}.titles label{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;cursor:pointer;border-radius:8px;border:1px solid var(--line);margin:6px 0;background:var(--card);transition:background 0.15s,border-color 0.15s}.titles label:hover{border-color:var(--accent);background:var(--card-hover)}.titles input{width:20px;height:20px;flex:0 0 auto;accent-color:var(--accent);margin-top:2px}.thumb{max-width:380px;width:100%;border-radius:10px;border:1px solid var(--line);box-shadow:0 4px 14px rgba(0,0,0,0.15)}
.list{display:flex;flex-direction:column;gap:10px}.list a{display:grid;grid-template-columns:180px minmax(0,1fr);gap:16px;text-decoration:none;color:inherit;align-items:center}.list img{width:180px;border-radius:8px;border:1px solid var(--line)}
@media (max-width:600px){.list a{grid-template-columns:100px minmax(0,1fr)}.list img{width:100px}}
main > p:first-child{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:0 0 20px;padding-bottom:14px;border-bottom:1px solid var(--line);color:var(--sub);font-size:13px}
main > p:first-child a{display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:20px;background:var(--card);border:1px solid var(--line);color:var(--sub);font-weight:600;font-size:12.5px;transition:all 0.2s ease}
main > p:first-child a:hover{background:var(--accent-glow);border-color:var(--accent);color:var(--accent);text-decoration:none;transform:translateY(-1px)}
.btn-cta{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:var(--accent);color:#000!important;font-weight:700;font-size:13px;text-decoration:none;transition:opacity 0.2s}.btn-cta:hover{opacity:0.9;text-decoration:none}
.search-form{display:flex;gap:10px;max-width:540px;margin:16px 0}
.search-input{flex:1;padding:10px 14px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:14px;outline:none;transition:border-color 0.2s}
.search-input:focus{border-color:var(--accent)}
.search-btn{padding:10px 18px;border-radius:8px;border:none;background:var(--accent);color:#000;font-weight:700;font-size:13px;cursor:pointer}
.visual-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;margin-top:16px}
.visual-tile{display:flex;flex-direction:column;gap:10px;margin:0;padding:12px;overflow:hidden}
.visual-tile img{width:100%;height:180px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block}
.visual-body{display:flex;flex-direction:column;gap:6px;flex:1}
.btn-link{display:inline-block;color:var(--accent);font-weight:600;font-size:12.5px}
`;

const badge = (flag) => (flag === true ? '<span class="ok">✓ 원문 확인</span>'
  : flag === false ? '<span class="bad">✗ 원문에 없음</span>'
    : '<span class="na">– 대조할 원문 없음</span>');
const quote = (text, flag) => (String(text ?? '').trim() ? `<div class="q">“${escapeHtml(text)}” ${badge(flag)}</div>` : '');

const page = (title, body, { refreshSeconds = 0 } = {}) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refreshSeconds ? `<meta http-equiv="refresh" content="${Number(refreshSeconds)}">` : ''}<title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;

// 마크다운 한 줄 안의 꾸밈: 이미 이스케이프된 글자에만 적용한다.
const inlineMd = (escaped) => escaped
  .replace(/`([^`]+)`/g, '<code>$1</code>')
  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  .replace(/http:\/\/localhost:3001(\/[\w\-/]+)/g, '<a href="$1">$1</a>');

/** 다음 기획 입력처럼 코드가 만든 마크다운을 읽기 전용 화면으로 그린다. 표·목록·제목·굵게·코드만 다룬다. */
export function renderMarkdownPage(title, markdown = '') {
  const lines = String(markdown).replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i += 1; continue; }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) { out.push(`<h${heading[1].length}>${inlineMd(escapeHtml(heading[2]))}</h${heading[1].length}>`); i += 1; continue; }
    if (line.trim().startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i += 1; }
      const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => inlineMd(escapeHtml(c.trim())));
      const body = rows.filter((r, n) => !(n === 1 && /^[\s|:-]+$/.test(r)));
      out.push(`<table><tr>${cells(body[0]).map((c) => `<th>${c}</th>`).join('')}</tr>${body.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`);
      continue;
    }
    if (/^\s*(-|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items = [];
      while (i < lines.length && /^\s*(-|\d+\.)\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*(-|\d+\.)\s+/, '')); i += 1; }
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}>${items.map((it) => `<li>${inlineMd(escapeHtml(it))}</li>`).join('')}</${tag}>`);
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*\||\s*(-|\d+\.)\s)/.test(lines[i])) { para.push(lines[i]); i += 1; }
    out.push(`<p>${para.map((p) => inlineMd(escapeHtml(p))).join('<br>')}</p>`);
  }
  return page(title, `<p><a href="/">← 대시보드</a></p>${out.join('\n')}`);
}

export function renderReportPage(report, { framesPending = 0, hasSheet = false, sheetLinks = [] } = {}) {
  const a = report.analysis || {};
  const m = report.meta || {};
  const id = escapeHtml(report.videoId);
  const yt = (t) => `https://www.youtube.com/watch?v=${encodeURIComponent(report.videoId)}&t=${Math.floor(Number(t) || 0)}s`;
  const frameByT = new Map((report.frames || []).map((f) => [f.t, f.file]));
  const parts = [];
  parts.push(`<p><a href="/outlier-reports">← 리포트 목록</a> · <a href="/visual-library">연출 자료집</a> · <a href="/">대시보드</a></p>`);
  parts.push(`<h1>${escapeHtml(m.title)}</h1>`);
  const studioFoldsBadge = report.studioFolds != null ? ` · <span class="pill-badge" style="background:rgba(139,92,246,0.14);color:#c4b5fd;border-color:rgba(139,92,246,0.35)">유튜브 조사 ${Number(report.studioFolds)}배</span>` : '';
  parts.push(`<div class="meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 10px"><span class="pill-badge">${escapeHtml(m.channelTitle)}</span> · <span>구독자 ${num(report.subscriberCount)}</span> · <span>조회수 ${num(m.viewCount)}</span> · <span>구독자 대비 ${report.viewsPerSubscriber ?? '측정 전'}배</span> · <span style="color:var(--accent-amber);font-weight:700">채널 평소 대비 ${formatRatioLabel(report)}</span>${studioFoldsBadge} · <span>길이 ${m.durationSeconds ?? '?'}초</span></div>`);
  const src = report.sources || {};
  parts.push(`<div class="meta" style="font-size:12px;opacity:0.85">분석 ${escapeHtml(String(report.analyzedAt || '').slice(0, 10))} · ${escapeHtml(report.model || '')} · 화면은 처음 ${report.windowSeconds}초 · 자막 ${src.transcript?.ok ? '있음' : `없음(${escapeHtml(src.transcript?.error || '')})`} · 댓글 ${src.comments?.count ?? 0}개 · 인용 확인 ${report.quoteCheck?.verified ?? 0}/${report.quoteCheck?.checked ?? 0}</div>`);
  const teaches = a.teachesAdultEnglishSounds;
  const teachesText = teaches === true ? '예' : teaches === false ? '아니오 — 이 영상의 댓글은 시청자 고민 데이터에서 뺌' : '미판정';
  parts.push(`<div class="meta" style="margin-top:4px">성인에게 영어 소리를 가르치는 원본 영상인가: <b>${teachesText}</b>${a.teachesAdultEnglishSoundsReason ? ` (${escapeHtml(a.teachesAdultEnglishSoundsReason)})` : ''}</div>`);
  parts.push(`<p style="margin:14px 0"><a class="btn-cta" href="https://www.youtube.com/watch?v=${encodeURIComponent(report.videoId)}" target="_blank" rel="noopener">🎬 유튜브에서 보기 ↗</a></p>`);
  if (hasSheet) parts.push(`<div class="card" style="background:linear-gradient(135deg,rgba(56,189,248,0.08),rgba(168,85,247,0.08));border:1.5px solid var(--accent);padding:14px 18px">📝 <a href="/transform-sheet/${id}"><b>이 영상을 우리 콘텐츠로 바꾼 비교 시트 보기</b></a> — 경쟁과 우리를 좌우로 비교하고, 바꾼 이유와 다른 영상에서 가져온 것을 적어 두었다.</div>`);
  for (const l of sheetLinks.filter((x) => x.role === 'borrowed')) parts.push(`<div class="card" style="background:rgba(168,85,247,0.08);border:1.5px solid #a855f7;padding:14px 18px">📝 이 영상에서 가져온 것이 비교 시트에 쓰였다: <a href="/transform-sheet/${escapeHtml(l.sheetId)}"><b>${escapeHtml(l.topic)}</b></a> (${escapeHtml(STAGE_KO[l.status] || l.status)}) — 시트의 "가져온 것"에서 이 영상의 어떤 점을 왜 가져왔는지 볼 수 있다.</div>`);
  if (framesPending > 0) parts.push(`<div class="card" style="border-color:var(--accent-amber);background:rgba(245,158,11,0.08)"><b>캡처 ${Number(framesPending)}장을 이 PC에서 만드는 중입니다.</b> 캡처는 깃에 올리지 않아 PC마다 처음 한 번 만듭니다(1편에 30초~2분). 이 화면은 25초마다 스스로 새로고침합니다.</div>`);

  const c = a.click || {};
  parts.push('<h2>1. 클릭 — 제목과 썸네일</h2><div class="card">');
  if (m.thumbnail) parts.push(`<img class="thumb" src="${escapeHtml(m.thumbnail)}" alt="썸네일">`);
  parts.push(`<p><b>제목</b>: ${escapeHtml(c.titleDevice)}</p>${quote(c.titleQuote, c.titleQuoteVerified)}`);
  parts.push(`<p><b>썸네일 글자</b>: ${escapeHtml(c.thumbnailText || '없음')} (${escapeHtml(c.thumbnailWordCount ?? '?')}단어)</p><p><b>썸네일 모습</b>: ${escapeHtml(c.thumbnailVisual)}</p><p><b>제목과 관계</b>: ${escapeHtml(c.thumbnailVsTitle)}</p></div>`);

  const o = a.opening || {};
  parts.push(`<h2>2. 첫 15초</h2><div class="card"><p>${escapeHtml(o.first15s)}</p>${quote(o.quote, o.quoteVerified)}<p><b>계속 볼 이유</b>: ${escapeHtml(o.reasonToKeepWatching)}</p></div>`);

  if (a.first3s) parts.push(`<div class="card"><b>처음 3초</b>: ${escapeHtml(a.first3s.what)}${quote(a.first3s.quote, a.first3s.quoteVerified)}</div>`);

  const p = report.pacing || {};
  parts.push(`<h2>3. 화면 연출</h2><p class="meta">처음 ${report.windowSeconds}초 동안 장면 전환 ${cutCountLabel(p)} · 1분에 ${p.perMinute ?? 0}번 · 전환 사이 간격 중앙값 ${p.medianGapSeconds == null ? '측정 전' : `${p.medianGapSeconds}초`} (출처: ${escapeHtml(p.source || '코드 계산')}). 아래는 AI가 적은 화면 변화 ${(a.visualMoments || []).length}개다. 캡처는 그 시각부터 1초 간격 3장이고, AI가 말한 시각은 몇 초 어긋날 수 있다.${report.framesError ? ` 캡처 실패: ${escapeHtml(report.framesError)}` : ''}</p>`);
  for (const mo of a.visualMoments || []) {
    const file = frameByT.get(mo.t);
    parts.push(`<div class="card moment"><div><a class="t" href="${yt(mo.t)}" target="_blank" rel="noopener">${mmss(mo.t)}</a> ${escapeHtml(mo.what)}</div>${file ? `<img loading="lazy" src="/outlier-frames/${id}/${escapeHtml(file)}" alt="${mmss(mo.t)} 화면">` : ''}<div class="q">${escapeHtml(mo.purpose)}</div></div>`);
  }

  parts.push('<h2>4. 전개</h2><table><tr><th>구간</th><th>한 일</th></tr>');
  for (const f of a.flow || []) parts.push(`<tr><td>${mmss(f.start)}~${mmss(f.end)}</td><td>${escapeHtml(f.what)}${quote(f.quote, f.quoteVerified)}</td></tr>`);
  parts.push('</table>');
  const e = a.ending || {};
  parts.push(`<div class="card"><b>끝부분</b>: ${escapeHtml(e.what)}${quote(e.quote, e.quoteVerified)}</div>`);

  const vr = a.viewerReaction || {};
  const list = (title, items, field) => {
    parts.push(`<h3>${title}</h3>`);
    if (!items?.length) { parts.push('<p class="meta">없음</p>'); return; }
    for (const it of items) parts.push(`<div class="card">${escapeHtml(it[field])}${quote(it.quote, it.quoteVerified)}</div>`);
  };
  parts.push('<h2>5. 시청자 반응 (댓글)</h2>');
  list('공감·감탄', vr.resonated, 'point');
  list('시청자가 털어놓은 어려움', vr.painPoints, 'pain');
  list('남은 질문·아쉬움', vr.unanswered, 'question');
  list('시청자가 쓴 표현', vr.vocabulary, 'expression');

  parts.push('<h2>6. 장면과 반응의 연결</h2>');
  if (!(a.links || []).length) parts.push('<p class="meta">없음</p>');
  for (const l of a.links || []) parts.push(`<div class="card"><b>${escapeHtml(l.cause)}</b> → ${escapeHtml(l.reaction)}${quote(l.quote, l.quoteVerified)}</div>`);

  const u = a.forUs || {};
  parts.push(`<h2>7. 우리 채널에</h2><div class="card"><p><b>가져올 점</b>: ${escapeHtml(u.adopt)}</p><p><b>다르게 할 점</b>: ${escapeHtml(u.differentiate)}</p></div>`);
  parts.push(extraObservationsHtml(a));
  return page(m.title || report.videoId, parts.join('\n'), { refreshSeconds: framesPending > 0 ? 25 : 0 });
}

const NEW_FIELDS = ['first3s', 'infoCount', 'captionStyle', 'audio', 'storytelling'];
const yesNo = (v) => (v === true ? '있음' : v === false ? '없음' : '확인 불가');
const orUnknown = (v) => (v ? escapeHtml(v) : '확인 불가');
const storyLine = (it) => (it ? `<div>${it.t != null ? `<span class="t">${mmss(it.t)}</span> ` : ''}${escapeHtml(it.what)}${quote(it.quote, it.quoteVerified)}</div>` : '<div class="na">확인 불가</div>');
const storyList = (label, items) => `<p><b>${label}</b></p>${items == null ? '<div class="na">확인 불가</div>' : items.length ? items.map(storyLine).join('') : '<div class="meta">없음</div>'}`;

/** 새 관찰 5칸(첫 3초·정보 개수·자막 모양·소리·이야기 기법). 칸이 아예 없는 옛 리포트는 그렇다고 밝히고, 값이 null이면 확인 불가로 쓴다. */
export function extraObservationsHtml(a = {}) {
  const h = '<h2>8. 더 자세히 본 것 (정보 개수·자막 모양·소리·이야기 기법)</h2>';
  if (NEW_FIELDS.every((k) => a[k] === undefined)) return `${h}<p class="meta">이 리포트는 새 항목 도입 전에 만들어져 이 칸이 없다.</p>`;
  const out = [h];
  const ic = a.infoCount;
  out.push(`<div class="card"><b>정보 개수(AI 추정)</b>: ${ic ? `${ic.count == null ? '확인 불가' : `${escapeHtml(ic.count)}개`} — ${orUnknown(ic.description)}` : '확인 불가'}</div>`);
  const cs = a.captionStyle;
  out.push(`<div class="card"><b>자막 모양</b>${cs ? `<div>위치: ${orUnknown(cs.position)} · 크기: ${orUnknown(cs.size)} · 강조 색: ${orUnknown(cs.highlightColor)} · 강조 방식: ${orUnknown(cs.highlightMethod)}</div><div>한 번에 보이는 글자: ${orUnknown(cs.textAmount)} · 바뀌는 시점: ${orUnknown(cs.changeTiming)}</div>` : ': 확인 불가'}</div>`);
  const au = a.audio;
  out.push(`<div class="card"><b>소리</b>${au ? `<div>배경음악: ${yesNo(au.hasMusic)} · 분위기: ${orUnknown(au.mood)} · 빠르기: ${orUnknown(au.tempo)}</div><div>효과음: ${yesNo(au.hasSoundEffects)} · 쓰임: ${orUnknown(au.soundEffectUse)}</div><div>말과 음악의 비중: ${orUnknown(au.voiceVsMusic)}</div>` : ': 확인 불가'}</div>`);
  const st = a.storytelling;
  out.push('<h3>이야기 기법</h3>');
  if (!st) out.push('<p class="na">확인 불가</p>');
  else {
    out.push(`<div class="card"><p><b>훅</b>${st.hook?.type ? ` (${escapeHtml(st.hook.type)})` : ''}</p>${storyLine(st.hook)}`);
    out.push(`<p><b>궁금증을 연 곳 / 푼 곳</b></p>${st.curiosity ? `${storyLine(st.curiosity.opened)}${storyLine(st.curiosity.resolved)}` : '<div class="na">확인 불가</div>'}`);
    out.push(`<p><b>앞뒤 인과</b>: ${st.causality ? `${st.causality.connected == null ? '' : st.causality.connected ? '이어짐 — ' : '나열 — '}${orUnknown(st.causality.summary)}` : '확인 불가'}</p>${(st.causality?.examples || []).map(storyLine).join('')}`);
    out.push(storyList('끝까지 열어 둔 궁금증', st.openLoops), storyList('같은 틀을 깨는 지점', st.patternBreaks), storyList('시청자에게 시킨 행동', st.viewerActions), storyList('증거·근거를 보여 준 방식', st.evidence));
    out.push(`<p><b>끝에서 약속을 회수한 방식</b></p>${storyLine(st.payoff)}</div>`);
  }
  return out.join('\n');
}

/**
 * 연출 자료집 페이지(2026-11-12): 모든 리포트의 화면 변화를 캡처 띠와 함께 평소 대비 배수 큰 순으로 깐다.
 * 대시보드 탭은 6개로 두기로 한 결정(2026-11-11)이 있어 탭이 아니라 따로 열리는 페이지로 만들었다.
 * 검색은 주소의 ?q= 로 서버가 거른다(화면 스크립트 없음).
 */
export function renderVisualLibraryPage(entries = [], { query = '', reports = 0, pendingReports = 0 } = {}) {
  const words = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = entries.filter((e) => {
    const hay = `${e.what || ''} ${e.purpose || ''} ${e.title || ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const tiles = shown.slice(0, 150).map((e) => {
    const img = !e.frame ? ''
      : e.frameReady ? `<a href="/outlier-report/${encodeURIComponent(e.videoId)}"><img loading="lazy" src="/${escapeHtml(e.frame.replace('data/youtube/', ''))}" alt="${mmss(e.t)} 화면"></a>`
        : '<div class="meta" style="padding:40px 0;text-align:center;background:rgba(255,255,255,0.02);border-radius:8px">⏳ 이 PC에서 캡처 만드는 중</div>';
  const ratio = formatRatioLabel(e);
  const studioPart = e.studioFolds != null ? ` · 유튜브 조사 ${Number(e.studioFolds)}배` : '';
  return `<div class="card visual-tile">${img}<div class="visual-body"><div><span class="t">${mmss(e.t)}</span> ${escapeHtml(e.what)}</div><div class="q">${escapeHtml(e.purpose)}</div><div class="meta" style="margin-top:auto">${escapeHtml(e.channelTitle)} · 평소의 ${ratio}${studioPart} · <a class="btn-link" href="/outlier-report/${encodeURIComponent(e.videoId)}">리포트</a></div></div></div>`;
});
const body = [
  '<p><a href="/">← 대시보드</a> · <a href="/outlier-reports">경쟁 영상 리포트 목록</a></p>',
  `<h1>📸 연출 자료집</h1>`,
  `<p class="meta">경쟁 영상 ${reports}편 · 화면 변화 ${entries.length}개. 잘된 경쟁 영상이 화면을 어떻게 바꿨는지 1초 간격 3장 캡처로 본다. 구조만 배우고 그림·문구·남의 영상은 따라 하지 않는다. AI가 적은 시각은 몇 초 어긋날 수 있어 캡처 띠로 직접 확인한다. 매일 루프가 하루 2편씩 늘린다.${pendingReports ? ` 지금 이 PC에서 ${Number(pendingReports)}편의 캡처를 만드는 중이라 25초마다 새로고침한다.` : ''}</p>`,
  `<form method="get" action="/visual-library" class="search-form"><input type="search" name="q" value="${escapeHtml(query)}" placeholder="검색: 비교, X 표시, 정답, 자막…" class="search-input"><button type="submit" class="search-btn">검색</button></form>`,
  `<p class="meta" style="margin-top:14px;font-weight:600">${shown.length}개${shown.length > 150 ? ' (앞 150개만 표시)' : ''}</p>`,
  tiles.length ? `<div class="visual-grid">${tiles.join('\n')}</div>` : `<p class="meta">${entries.length ? '검색어에 맞는 화면 변화가 없습니다.' : '아직 리포트가 없습니다. 매일 루프가 하루 2편씩 만듭니다.'}</p>`,
];
return page('연출 자료집', body.join('\n'), { refreshSeconds: pendingReports ? 25 : 0 });
}

// ---- 비교 시트(2026-11-12): 경쟁 영상과 우리가 만들 영상을 같은 행에서 좌우로 비교한다 ----
const SHEET_CSS = `<style>
.sheet-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;margin:12px 0}
.sheet-col{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px 18px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
.sheet-col.ours{border-color:var(--accent);background:linear-gradient(180deg, rgba(56,189,248,0.04) 0%, rgba(56,189,248,0) 100%)}
.sheet-col h4{margin:0 0 8px;font-size:12px;font-weight:700;color:var(--sub);letter-spacing:0.5px;text-transform:uppercase}
.sheet-col .imgs{display:flex;flex-wrap:nowrap;gap:10px;margin:8px 0;align-items:flex-start;overflow-x:auto}
.sheet-col img{width:auto;min-width:0;max-width:100%;max-height:300px;height:auto;border-radius:8px;border:1px solid var(--line);display:block}
.sheet-why{grid-column:1/-1;font-size:13.5px;color:var(--ink);background:rgba(245,158,11,0.08);border-left:3px solid var(--accent-amber);border-radius:0 8px 8px 0;padding:12px 16px;margin:2px 0 10px;line-height:1.55}
.sheet-label{font-weight:800;font-size:15px;margin:24px 0 6px;color:var(--ink);display:flex;align-items:center;gap:6px}
.warn{border:1px solid var(--bad);background:var(--bad-bg);color:var(--bad);border-radius:10px;padding:10px 14px;margin:12px 0;font-size:13.5px}
.timeline{position:relative;height:28px;background:var(--card);border:1px solid var(--line);border-radius:8px;margin:6px 0 4px;overflow:hidden}
.tick{position:absolute;top:3px;bottom:3px;width:3px;border-radius:2px;transform:translateX(-1px)}
.tick.comp{background:var(--sub)}.tick.ours{background:var(--accent);box-shadow:0 0 6px var(--accent)}
.tl-label{font-size:13px;font-weight:600;color:var(--sub);margin-top:10px}
.film{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:12px;padding:8px 2px 16px}
.film figure{margin:0;flex:0 0 auto;text-align:center;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px;box-shadow:0 2px 6px rgba(0,0,0,0.05)}
.film img{height:300px;width:auto;border-radius:6px;border:1px solid var(--line);display:block}
.film figcaption{font-size:11.5px;font-weight:700;color:var(--accent);margin-top:6px}
.film figure .say{width:167px;margin:6px auto 0;font-size:13px;line-height:1.45;text-align:left;white-space:normal;word-break:keep-all;color:var(--ink);background:rgba(255,255,255,0.03);padding:6px 8px;border-radius:6px}
.film.ours-grid{display:grid;grid-template-columns:repeat(var(--cols,13),190px);grid-template-rows:repeat(var(--rows,4),minmax(0,auto));grid-auto-flow:column;gap:12px;overflow-x:auto;padding:8px 4px 16px;align-items:stretch}
.cut-card{margin:0;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px;box-shadow:0 2px 6px rgba(0,0,0,0.05);box-sizing:border-box;width:190px}
.cut-card.p1{border-color:rgba(148,163,184,0.4)}
.cut-card.p2{border-color:rgba(56,189,248,0.45)}
.cut-card.p3{border-color:rgba(192,132,252,0.5);background:rgba(168,85,247,0.02)}
.cut-card.p4{border-color:rgba(0,210,211,0.6);background:rgba(0,210,211,0.03)}
.cut-card .vtag{font-size:11px;font-weight:800;margin-bottom:5px;padding:2px 6px;border-radius:4px;display:inline-block;align-self:flex-start}
.cut-card img{width:172px;height:306px;object-fit:cover;border-radius:6px;border:1px solid var(--line);display:block}
.cut-card figcaption{font-size:11.5px;font-weight:700;margin-top:6px;text-align:center}
.cut-card .say{width:100%;box-sizing:border-box;margin:6px 0 0;font-size:12.5px;line-height:1.45;text-align:left;white-space:normal;word-break:keep-all;color:var(--ink);background:rgba(255,255,255,0.03);padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.05)}
.cut-card .say.motion{font-size:11.5px;background:transparent;border:none;padding:4px 0 0}
.cut-card .say.bottom{font-size:11px;opacity:0.85;padding:2px 0 0;background:transparent;border:none}
.fullscript div{padding:4px 0;border-bottom:1px solid var(--line-subtle)}
.pkg{white-space:pre-wrap;word-break:keep-all;margin:6px 0 10px;font:inherit;font-size:13.5px;background:rgba(0,0,0,0.03);padding:10px 12px;border-radius:8px;border:1px solid var(--line)}
.film.ours figure{border-color:rgba(56,189,248,0.3)}
.film.ours img{border-color:var(--accent)}
.bar{display:flex;height:16px;border-radius:8px;overflow:hidden;border:1px solid var(--line);max-width:460px;margin:8px 0}
.bar span:first-child{background:var(--accent)}.bar span:last-child{background:var(--line)}
@media (max-width:700px){.sheet-row{grid-template-columns:minmax(0,1fr)}}
</style>`;
const STAGE_KO = { draft: '초안', approved: '승인', published: '공개', measured: '성적 입력됨' };

/** 경쟁 영상의 설명글·태그(리포트에 저장된 값 그대로). 오래된 리포트는 아직 저장 전이라고 밝힌다. */
function packageCompetitor(report) {
  const m = report?.meta;
  if (!m || m.description === undefined) return '<div class="meta">설명글·태그: 이 리포트에는 아직 저장 전</div>';
  return `<h4>설명글</h4><pre class="pkg">${escapeHtml(m.description || '(없음)')}</pre><h4>태그</h4><div>${(m.tags || []).length ? escapeHtml(m.tags.join(', ')) : '태그 없음(이 영상은 태그를 달지 않았다)'}</div>`;
}
function packageOurs(ours) {
  return `<h4>설명글</h4><pre class="pkg">${escapeHtml(ours?.description || '')}</pre><h4>태그 (${(ours?.tags || []).length}개)</h4><div>${escapeHtml((ours?.tags || []).join(', '))}</div>${(ours?.tagCheck || []).length ? `<h4>태그를 유튜브 검색창에 쳐 본 결과</h4>${ours.tagCheck.map((c) => `<div class="meta"><b>${escapeHtml(c.tag)}</b> — ${escapeHtml(c.verdict)}: ${escapeHtml(c.reason)}${(c.top || []).length ? ` (위쪽 결과: ${c.top.map((t) => '“' + escapeHtml(t) + '”').join(', ')})` : ''}</div>`).join('')}` : ''}<h4>고정 댓글</h4><pre class="pkg">${escapeHtml(ours?.pinnedComment || '')}</pre>`;
}

/** 컷 리듬: 경쟁 컷 시각(ffmpeg가 잰 값)과 우리 컷 계획을 같은 시간 막대로 보여 준다. */
function cutRhythm(row, report, oursUrl = (x) => x, ver = (x) => x, refs = []) {
  const plan = row.ours?.cutPlan;
  const times = report?.pacing?.times;
  const compDur = Number(report?.windowSeconds) || Number(report?.meta?.durationSeconds) || 0;
  const bar = (list, dur, cls) => `<div class="timeline">${list.map((t) => `<span class="tick ${cls}" style="left:${Math.min(100, (Number(t) / dur) * 100)}%"></span>`).join('')}</div>`;
  const parts = ['<div class="sheet-label">컷 리듬</div>'];
  if (Array.isArray(times) && compDur > 0) parts.push(`<div class="tl-label">경쟁 ${cutCountLabel({ count: times.length })} (1분에 ${report.pacing.perMinute ?? '측정 전'}번 · ${compDur}초 안)</div>${bar(times, compDur, 'comp')}`);
  else parts.push('<div class="tl-label">경쟁 컷 시각: 측정 전(캡처 채우기를 돌리면 생긴다)</div>');
  const ourTimes = Array.isArray(plan?.cuts) && plan.cuts.length ? plan.cuts.map((c) => Number(c.t)) : (plan?.times || []);
  if (ourTimes.length) {
    const perMin = Math.round((ourTimes.length / Number(plan.durationSeconds)) * 600) / 10;
    parts.push(`<div class="tl-label">우리 계획 ${ourTimes.length}번 (1분에 ${perMin}번 · ${Number(plan.durationSeconds)}초 안)${plan.rhythm ? ` — ${escapeHtml(plan.rhythm)}` : ''}</div>${bar(ourTimes, Number(plan.durationSeconds), 'ours')}`);
  }
  // 경쟁 영상별 화면 변화(AI가 캡처를 보고 적은 시각). 컷 감지(ffmpeg)가 0번인 영상도 화면 안에서는 계속 바뀌므로 같은 시간 축으로 보여 준다(2026-11-16).
  for (const r of refs.filter((x) => x.frames && x.frames.length && x.moments && x.moments.length && x.duration > 0)) { const gaps = r.moments.slice(1).map((x, i) => x - r.moments[i]); const mean = gaps.reduce((a, b) => a + b, 0) / (gaps.length || 1); const cv = mean ? Math.sqrt(gaps.reduce((a, b) => a + (b - mean) ** 2, 0) / gaps.length) / mean : 0; parts.push(`<div class="tl-label">경쟁 화면 변화 — ${escapeHtml(r.label)}: ${r.moments.length}번 (1분에 ${Math.round((r.moments.length / r.duration) * 600) / 10}번 · 간격 변동 ${Math.round(cv * 100) / 100} · 컷 감지 ${r.cutCount}번 · AI가 적은 시각이라 ±1초)</div>${bar(r.moments, r.duration, 'comp')}`); }
  // 컷을 글자가 아니라 이미지로: 컷마다 한 장, 시간 순서(2026-11-12 사용자). 경쟁은 영상에서 뽑은 프레임, 우리는 코드로 그린 카드.
  const id = encodeURIComponent(report?.videoId || '');
  const fig = (src, t) => `<figure><a href="${src}" target="_blank" rel="noopener"><img loading="lazy" src="${src}" alt="${escapeHtml(t)}초 컷"></a><figcaption>${escapeHtml(t)}초</figcaption></figure>`;
  if (Array.isArray(times) && times.length) parts.push(`<div class="tl-label">경쟁 컷 이미지</div><div class="film comp">${times.map((t, i) => fig(ver(`/outlier-frames/${id}/cut-${String(i).padStart(2, '0')}.jpg`), t)).join('')}</div>`);
  // 경쟁 영상의 저장된 화면 캡처를 초 순서로 보여 준다(2026-11-16 사용자: 비교 시트에 경쟁 비주얼 컷이 하나도 없다). 컷 시각 감지가 실패한 영상(w8g6 등)도 캡처는 있다. 원본과 가져온 출처 영상 모두.
  for (const r of refs.filter((x) => x.frames && x.frames.length)) parts.push(`<div class="tl-label">경쟁 화면 캡처 — ${escapeHtml(r.label)} · ${r.frames.length}장(저장된 캡처를 초 순서로)</div><div class="film comp">${r.frames.map((fr) => fig(ver(`/outlier-frames/${encodeURIComponent(r.videoId)}/${escapeHtml(fr.file)}`), fr.t)).join('')}</div>`);
  // 1안 아래에 2안·3안·4안을 2D 그리드로 배치하여, 모든 컷에서 1·2·3·4안의 수평 시작선과 높이가 칼같이 일치하도록 한다(2026-11-17 정렬 일치).
  const plan2 = row.ours?.cutPlan2;
  const plan3 = row.ours?.cutPlan3;
  const plan4 = row.ours?.cutPlan4;
  const bottomText = (b) => (typeof b === 'string' ? b : b?.subtitle || b?.speaker || '');

  const hasP2 = Boolean(plan2?.cuts?.length);
  const hasP3 = Boolean(plan3?.cuts?.length);
  const hasP4 = Boolean(plan4?.cuts?.length);
  const hasMultiPlans = hasP2 || hasP3 || hasP4;
  const rowCount = 1 + (hasP2 ? 1 : 0) + (hasP3 ? 1 : 0) + (hasP4 ? 1 : 0);

  const gridCards = [];
  (plan?.cuts || []).forEach((c, idx) => {
    // 단일 최적안(v4 슬로건 시트)이면 불필요한 '1안(경쟁 베이스)' 라벨 없이 AI 최적안 1줄로 깔끔하게 출력
    if (!hasMultiPlans) {
      const b1 = bottomText(c.bottom);
      gridCards.push(`<figure class="cut-card p4"><span class="vtag" style="background:#00D2D3;color:#000">🚀 AI 최적안 · 컷 ${idx + 1}</span><a href="${oursUrl(c.image)}" target="_blank" rel="noopener"><img loading="lazy" src="${oursUrl(c.image)}" alt="${escapeHtml(c.t)}초 컷"></a><figcaption>${escapeHtml(c.t)}초</figcaption>${c.narration ? `<div class="say"><b>대본:</b> ${escapeHtml(c.narration)}</div>` : ''}${c.motion ? `<div class="say motion" style="color:var(--sub)"><b>연출/모션:</b> ${escapeHtml(c.motion)}</div>` : ''}${b1 ? `<div class="say bottom" style="color:var(--sub)"><b>하단:</b> ${escapeHtml(b1)}</div>` : ''}</figure>`);
      return;
    }
    // 레거시 1~4안 대조 카드
    gridCards.push(`<figure class="cut-card p1"><span class="vtag" style="background:var(--sub);color:#fff">1안 (경쟁 베이스)</span><a href="${oursUrl(c.image)}" target="_blank" rel="noopener"><img loading="lazy" src="${oursUrl(c.image)}" alt="${escapeHtml(c.t)}초 컷 1안"></a><figcaption>${escapeHtml(c.t)}초</figcaption>${c.narration ? `<div class="say"><b>대본:</b> ${escapeHtml(c.narration)}</div>` : ''}</figure>`);

    // 2안 카드
    if (hasP2) {
      const c2 = plan2?.cuts?.[idx];
      const nar2 = c2 ? (c2.narration ?? c.narration) : '';
      const b2 = bottomText(c2?.bottom);
      if (c2) {
        gridCards.push(`<figure class="cut-card p2"><span class="vtag" style="background:var(--accent);color:#fff">2안 (개선 시안)</span><a href="${oursUrl(c2.image)}" target="_blank" rel="noopener"><img loading="lazy" src="${oursUrl(c2.image)}" alt="${escapeHtml(c2.t)}초 컷 2안"></a><figcaption>${escapeHtml(c2.t)}초</figcaption>${nar2 ? `<div class="say"><b>대본:</b> ${escapeHtml(nar2)}</div>` : ''}${c2.motion ? `<div class="say motion" style="color:var(--sub)"><b>움직임:</b> ${escapeHtml(c2.motion)}</div>` : ''}${b2 ? `<div class="say bottom" style="color:var(--sub)"><b>하단 띠:</b> ${escapeHtml(b2)}</div>` : ''}</figure>`);
      } else {
        gridCards.push('<figure class="cut-card p2"><div class="meta" style="margin:auto">2안 컷 없음</div></figure>');
      }
    }

    // 3안 카드
    if (hasP3) {
      const c3 = plan3?.cuts?.[idx];
      const b3 = bottomText(c3?.bottom);
      if (c3) {
        gridCards.push(`<figure class="cut-card p3"><span class="vtag" style="background:#c084fc;color:#fff">3안 · Gemini 독자 설계</span><a href="${oursUrl(c3.image)}" target="_blank" rel="noopener"><img loading="lazy" src="${oursUrl(c3.image)}" alt="${escapeHtml(c3.t)}초 컷 3안"></a><figcaption style="color:#c084fc">${escapeHtml(c3.t)}초</figcaption>${c3.narration ? `<div class="say" style="color:#c084fc"><b>3안 대본:</b> ${escapeHtml(c3.narration)}</div>` : ''}${c3.motion ? `<div class="say motion" style="color:#c084fc"><b>움직임:</b> ${escapeHtml(c3.motion)}</div>` : ''}${b3 ? `<div class="say bottom" style="color:#c084fc"><b>하단 띠:</b> ${escapeHtml(b3)}</div>` : ''}</figure>`);
      } else {
        gridCards.push('<figure class="cut-card p3"><div class="meta" style="margin:auto">3안 컷 없음</div></figure>');
      }
    }

    // 4안 카드
    if (hasP4) {
      const c4 = plan4?.cuts?.[idx];
      const b4 = bottomText(c4?.bottom);
      if (c4) {
        gridCards.push(`<figure class="cut-card p4"><span class="vtag" style="background:#00D2D3;color:#000">4안 · 비주얼 전면 개방</span><a href="${oursUrl(c4.image)}" target="_blank" rel="noopener"><img loading="lazy" src="${oursUrl(c4.image)}" alt="${escapeHtml(c4.t)}초 컷 4안"></a><figcaption style="color:#00D2D3">${escapeHtml(c4.t)}초</figcaption>${c4.narration ? `<div class="say" style="color:#00D2D3;font-weight:700"><b>4안 대본:</b> ${escapeHtml(c4.narration)}</div>` : ''}${c4.motion ? `<div class="say motion" style="color:#00D2D3"><b>연출/모션:</b> ${escapeHtml(c4.motion)}</div>` : ''}${b4 ? `<div class="say bottom" style="color:#00D2D3"><b>하단 띠:</b> ${escapeHtml(b4)}</div>` : ''}</figure>`);
      } else {
        gridCards.push('<figure class="cut-card p4"><div class="meta" style="margin:auto">4안 컷 없음</div></figure>');
      }
    }
  });

  if (plan3?.cuts?.length) {
    parts.push(`<div class="card" style="border-left:3px solid #c084fc;background:rgba(168,85,247,0.06);margin:10px 0 6px"><b style="color:#c084fc">🤖 3안 — Gemini (Antigravity) 독자 설계 (내가 직접 만듦 · 1·2안 미참고)</b>${plan3.designNote ? `<div class="meta" style="margin-top:4px;color:var(--ink)">${escapeHtml(plan3.designNote)}</div>` : ''}</div>`);
  }
  if (plan4?.cuts?.length) {
    parts.push(`<div class="card" style="border-left:3px solid #00D2D3;background:rgba(0,210,211,0.06);margin:10px 0 6px"><b style="color:#00D2D3">🚀 4안 — 비주얼 전면 개방 & 다각도 벤치마킹 융합 (슬로건 구현)</b>${plan4.designNote ? `<div class="meta" style="margin-top:4px;color:var(--ink)">${escapeHtml(plan4.designNote)}</div>` : ''}</div>`);
  }
  if (Array.isArray(plan?.cuts) && plan.cuts.length) {
    const label = hasMultiPlans ? '우리 컷 이미지 + 대본 (열: 컷 시간대별 1:1 대조 · 행: 1안~4안 수평선 및 높이 완벽 일치)' : '우리 컷 이미지 + 대본 (AI 주도 최적안 1안)';
    parts.push(`<div class="tl-label">${label}</div><div class="film ours-grid" style="--cols:${plan.cuts.length};--rows:${rowCount}">${gridCards.join('')}</div>`);
  }
  const script = fullScript(plan);
  if (script.lines.length) parts.push(`<div class="sheet-label">전체 대본 (컷 대본을 이은 것 — 음성에 그대로 넣는 글)</div><div class="card fullscript">${script.lines.map((l) => `<div><span class="meta">${escapeHtml(l.t)}초</span> ${escapeHtml(l.text)}</div>`).join('')}</div>`);
  const script3 = plan3?.cuts?.length ? fullScript(plan3) : { lines: [] };
  if (script3.lines.length) parts.push(`<div class="sheet-label" style="color:#c084fc">3안 전체 대본 — Gemini (Antigravity 독자 설계)</div><div class="card fullscript" style="border-left:3px solid #c084fc">${script3.lines.map((l) => `<div><span class="meta">${escapeHtml(l.t)}초</span> ${escapeHtml(l.text)}</div>`).join('')}</div>`);
  const script4 = plan4?.cuts?.length ? fullScript(plan4) : { lines: [] };
  if (script4.lines.length) parts.push(`<div class="sheet-label" style="color:#00D2D3">4안 전체 대본 — 비주얼 전면 개방 & 슬로건 구현</div><div class="card fullscript" style="border-left:3px solid #00D2D3">${script4.lines.map((l) => `<div><span class="meta">${escapeHtml(l.t)}초</span> ${escapeHtml(l.text)}</div>`).join('')}</div>`);
  return parts.join('');
}

/** assetVersion: 그림 파일의 수정 시각. 주소 끝에 ?v=를 붙여 그림을 다시 만들면 브라우저가 옛 파일(캐시)을 쓰지 않게 한다. */
const METRIC_NAMES = { views7d: '조회수', watchSeconds7d: '평균 시청 시간', subs7d: '구독 수', stayedToWatch: '계속 시청함(%)' };
/** 가져온 것에 쌓인 근거 기록(영상이 나온 뒤 결과가 더해진다). 없으면 아직 시험 전이라고 밝힌다. */
export function evidenceHtml(b) {
  const log = b?.evidenceLog || [];
  if (!log.length) return '<div class="q">결과 기록: 아직 시험 전(공개 7일 뒤 자동으로 더해진다)</div>';
  return `<div class="q">결과 기록 ${log.length}건<ul>${log.map((e) => `<li>${escapeHtml(e.date)} · ${escapeHtml(e.videoId)} · ${escapeHtml(METRIC_NAMES[e.metric] || e.metric)} ${escapeHtml(e.value)}${e.approxNote ? `(${escapeHtml(e.approxNote)})` : ''} → ${escapeHtml(e.result)}${e.baselineResult ? ` · 기준선 판정: ${escapeHtml(e.baselineResult)}` : ''}${e.usual != null ? ` · 평소 ${escapeHtml(e.usual)}(${escapeHtml(e.usualN)}편, ${e.lengthAdjusted ? '길이 보정' : '길이 보정 없음'})` : ''}${e.lowSample ? ` · ※ 표본 작음(조회 ${escapeHtml(e.views)}회)` : ''}${(e.variables || []).length ? ` (시험 변수: ${escapeHtml(e.variables.join(', '))})` : ''}</li>`).join('')}</ul></div>`;
}

export function renderTransformSheetPage(sheet, report, problems = [], { assetVersion = '', refReports = [] } = {}) {
  const sid = String(sheet.episodeId || sheet.sourceVideoId || '');
  const id = encodeURIComponent(sid);
  const srcId = sheet.sourceVideoId ? encodeURIComponent(sheet.sourceVideoId) : '';
  const ver = (url) => (assetVersion ? `${url}?v=${encodeURIComponent(assetVersion)}` : url);
  const frameByT = new Map((report?.frames || []).map((f) => [String(f.t), f.file]));
  const competitorImg = (token) => {
    if (token === 'thumbnail') return report?.meta?.thumbnail ? `<img style="width:104px;height:186px;object-fit:cover;object-position:center;flex:none;border-radius:6px;border:1px solid var(--line)" src="${escapeHtml(report.meta.thumbnail)}" alt="경쟁 썸네일">` : '';
    const tm = String(token).match(/^thumb:(.+)$/);
    if (tm) { const rr = refReports.find((x) => x.videoId === tm[1]); return rr?.thumbnail ? `<img loading="lazy" style="width:104px;height:186px;object-fit:cover;object-position:center;flex:none;border-radius:6px;border:1px solid var(--line)" src="${escapeHtml(rr.thumbnail)}" title="${escapeHtml(rr.label)}" alt="경쟁 썸네일">` : ''; }
    const m = String(token).match(/^frame:(.+)$/);
    const file = m && frameByT.get(m[1]);
    return file && srcId ? `<img loading="lazy" src="${ver(`/outlier-frames/${srcId}/${escapeHtml(file)}`)}" alt="${escapeHtml(m[1])}초 화면">` : '';
  };
  const oursUrl = (rel) => ver(`/transform-images/${id}/${escapeHtml(String(rel).replace(/^images\/[^/]+\//, ''))}`);
  const oursImg = (rel) => (rel ? `<img loading="lazy" src="${oursUrl(rel)}" alt="우리 쪽 시안">` : '');
  const stage = sheet.status === 'published' && sheet.outcome?.views7d != null ? 'measured' : sheet.status;
  const share = sheet.identityShare || { ours: 0, competitor: 0 };
  const parts = [
    '<p><a href="/transform-sheets">← 비교 시트 목록</a>' + (srcId ? ' · <a href="/outlier-report/' + srcId + '">근거 보기(경쟁 영상 리포트)</a>' : ' · <a href="/outlier-reports">근거(리포트 목록)</a>') + ' · <a href="/">대시보드</a></p>',
    SHEET_CSS,
    `<h1>비교 시트: ${escapeHtml(sheet.topic)}</h1>`,
    `<div class="meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 12px"><span class="pill-badge">${escapeHtml(sheet.format)}</span>${sheet.episodeId ? ` · <span class="pill-badge" style="background:rgba(0,210,211,0.12);color:#00D2D3;border-color:rgba(0,210,211,0.35)">에피소드: ${escapeHtml(sheet.episodeId)}</span>` : ''}${report || sheet.sourceVideoId ? ` · <span>기준 영상: <b>${escapeHtml(report?.meta?.title || sheet.sourceVideoId)}</b></span> · <span>${escapeHtml(report?.meta?.channelTitle || '')}</span> · <span style="color:var(--accent-amber);font-weight:700">평소의 ${formatRatioLabel(report)}</span>` : ` · <span>다중 명작 융합 (${(sheet.references || []).length}편)</span>`} · <span class="pill-badge" style="background:rgba(52,211,153,0.12);color:var(--ok);border-color:rgba(52,211,153,0.3)">상태: ${escapeHtml(STAGE_KO[stage] || stage)}</span></div>`,
    (sheet.rows || []).some((x) => x.origin) ? (() => { const o = { competitor: 0, mixed: 0, ours: 0 }; for (const x of sheet.rows || []) if (o[x.origin] !== undefined) o[x.origin] += 1; const n = o.competitor + o.mixed + o.ours || 1; return `<p>행별 출처 <b>경쟁 구조 ${o.competitor} · 섞음 ${o.mixed} · 우리가 새로 만듦 ${o.ours}</b> (총 ${n}행) — 사람이 정한 비율이 아니라 아래 각 행에 적은 출처를 센 값이다.</p><div class="bar"><span style="width:${(o.ours / n) * 100}%"></span><span style="width:${(o.mixed / n) * 100}%;background:var(--accent-amber)"></span><span style="width:${(o.competitor / n) * 100}%"></span></div>`; })() : `<p>정체성 비율 <b>경쟁 ${Number(share.competitor)}% · 우리 ${Number(share.ours)}%</b> — ${escapeHtml(share.reason)}</p><div class="bar"><span style="width:${Number(share.ours)}%"></span><span style="width:${Number(share.competitor)}%"></span></div>`,
  ];
  for (const p of problems) parts.push(`<div class="warn">⚠ ${escapeHtml(p)}</div>`);
  if (sheet.selfCritique && typeof sheet.selfCritique === 'object') {
    const sc = sheet.selfCritique;
    parts.push(`<div class="card" style="border-left:3px solid #00D2D3;background:linear-gradient(135deg,rgba(0,210,211,0.08),rgba(56,189,248,0.05));margin:12px 0"><div style="font-size:14.5px;font-weight:800;color:#00D2D3;margin-bottom:6px">🧠 AI 자체 비평 (제출 전 슬로건 검수)</div><div class="meta" style="color:var(--ink);line-height:1.7"><div><b>① 템플릿 탈피:</b> ${escapeHtml(sc.antiTemplate || '')}</div><div><b>② 직전 편 대비 진화:</b> ${escapeHtml(sc.evolutionFromPrev || '')}</div><div><b>③ 명작 융합 검증:</b> ${escapeHtml(sc.fusionCheck || '')}</div></div></div>`);
  }
  const aiRec = sheet.aiRecommendation && typeof sheet.aiRecommendation === 'object' ? sheet.aiRecommendation : null;
  if (aiRec) {
    const thumbPreview = aiRec.thumbnail ? `<img src="${oursUrl(aiRec.thumbnail)}" alt="AI 추천 썸네일" style="width:84px;height:auto;border-radius:10px;border:2px solid #f59e0b;box-shadow:0 4px 12px rgba(0,0,0,0.22);flex-shrink:0">` : '';
    parts.push(`<div class="card" style="border-left:3px solid #f59e0b;background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(250,204,21,0.04));margin:12px 0"><div style="font-size:14.5px;font-weight:800;color:#d97706;margin-bottom:8px">🎯 AI 추천 조합 (1순위 제목 · 썸네일)</div><div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">${thumbPreview}<div class="meta" style="color:var(--ink);line-height:1.7;flex:1;min-width:240px"><div><b>추천 제목:</b> ${escapeHtml(aiRec.title || '')}</div><div><b>추천 썸네일:</b> ${escapeHtml(aiRec.thumbnailLabel || aiRec.thumbnail || '')}</div><div><b>추천 이유:</b> ${escapeHtml(aiRec.reason || '')}</div>${aiRec.alternative ? `<div style="margin-top:4px;color:var(--sub)"><b>차선 조합:</b> ${escapeHtml(aiRec.alternative)}</div>` : ''}</div></div></div>`);
  }
  if ((sheet.testVariables || []).length) {
    parts.push('<h2>이번에 시험하는 변수</h2>');
    for (const v of sheet.testVariables) parts.push(`<div class="card" style="border-left:3px solid var(--accent);background:linear-gradient(135deg,rgba(56,189,248,0.06),rgba(168,85,247,0.06))"><div style="font-size:14.5px"><b>🧪 ${escapeHtml(v.variable)}</b> · <span class="pill-badge">보는 지표: ${escapeHtml(v.measure)}</span></div><div class="q" style="margin-top:8px"><b>왜 이렇게 될 것 같은가(가설)</b>: ${escapeHtml(v.hypothesis)}</div></div>`);
  }
  parts.push('<div class="sheet-row" style="margin-top:20px;font-size:14px"><div class="sheet-col" style="background:rgba(255,255,255,0.03)"><b style="color:var(--sub)">🏛️ 경쟁 콘텐츠 (이미 출시)</b></div><div class="sheet-col ours"><b style="color:var(--accent)">🚀 우리가 만들 콘텐츠 (새 제작안)</b></div></div>');
  for (const r of sheet.rows || []) {
    const comp = (r.competitor?.images || []).map(competitorImg).join('');
    const picks = new Set(sheet.thumbnailPicks || []);
    const titlePicks = new Set(sheet.titlePicks || []);
    const thumbs = r.key === 'thumbnail' ? [r.ours?.image, ...(r.ours?.images || [])].filter(Boolean) : [];
    const thumbs2 = r.key === 'thumbnail' ? (r.ours?.images2 || []).filter(Boolean) : [];
    const thumbs3 = r.key === 'thumbnail' ? (r.ours?.images3 || []).filter(Boolean) : [];
    const pickRow = (list) => `<div class="thumbbox">${list.map((rel) => { const isRec = aiRec?.thumbnail === rel; return `<label class="pick" style="${isRec ? 'outline:3px solid #f59e0b;border-radius:10px' : ''}"><img class="real" title="실제 유튜브 쇼츠 목록 크기(가로 200px)" loading="lazy" src="${oursUrl(rel)}" alt="우리 쪽 시안">${isRec ? '<span style="position:absolute;top:8px;left:8px;background:#f59e0b;color:#111827;font-size:11px;font-weight:900;padding:3px 8px;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,0.35)">★ AI 추천</span>' : ''}<input type="checkbox" data-pick="${escapeHtml(rel)}"${picks.has(rel) ? ' checked' : ''}></label>`; }).join('')}</div>`;
    const titleBox = r.key === 'title' && (r.ours?.titles || []).length
      ? `<div class="titles"><b>제목 후보 (고르기)</b>${r.ours.titles.map((t) => `<label><input type="checkbox" data-pick-title="${escapeHtml(t)}"${titlePicks.has(t) ? ' checked' : ''}><span>${escapeHtml(t)}${aiRec?.title === t ? ' <span class="pill-badge" style="background:rgba(245,158,11,0.22);color:#b45309;border:1px solid #f59e0b;font-weight:800;margin-left:4px">★ AI 추천</span>' : ''}</span></label>`).join('')}</div>`
      : '';
    const ours = r.key === 'thumbnail' ? '' : oursImg(r.ours?.image) + (r.ours?.images || []).map(oursImg).join('');
    parts.push(`<div class="sheet-label">${escapeHtml(ROW_LABELS_VIEW[r.key] || r.key)}</div>
<div class="sheet-row">
  <div class="sheet-col"><h4>경쟁</h4>${comp ? `<div class="imgs">${comp}</div>` : ''}<div>${escapeHtml(r.competitor?.text)}</div>${r.key === 'package' ? packageCompetitor(report) : ''}${r.competitor?.quote ? `<div class="q">“${escapeHtml(r.competitor.quote)}”</div>` : ''}</div>
  <div class="sheet-col ours"><h4>우리</h4>${ours ? `<div class="imgs">${ours}</div>` : ''}<div>${escapeHtml(r.ours?.text)}</div>${titleBox}${r.key === 'package' ? packageOurs(r.ours) : ''}</div>
  <div class="sheet-why">${r.origin ? `출처: <b>${{ competitor: '경쟁 구조를 가져옴', mixed: '섞음', ours: '우리가 새로 만듦' }[r.origin] || escapeHtml(r.origin)}</b> — ${escapeHtml(r.originReason || '')}<br>` : ''}왜 바꿨나: ${escapeHtml(r.why)}</div>
</div>${thumbs.length ? `${thumbs2.length || thumbs3.length ? '<div class="tl-label">1안 (처음 만든 시안, 위)</div>' : ''}${pickRow(thumbs)}` : ''}${thumbs2.length ? `<div class="tl-label">2안 (같은 칸 아래, 1안과 1:1 비교)</div>${pickRow(thumbs2)}` : ''}${thumbs3.length ? `<div class="tl-label" style="color:#c084fc;font-weight:800">3안 — Gemini (Antigravity) 독자 설계 시안 (내가 만듦 · 1·2안 미참고, 2안 아래 1:1 비교)</div>${pickRow(thumbs3)}` : ''}${r.key === 'visual' ? cutRhythm(r, report, oursUrl, ver, refReports) : ''}`);
  }
  if (Array.isArray(sheet.references) && sheet.references.length) {
    parts.push('<h2>🎬 융합한 명작 레퍼런스 (다중 벤치마킹)</h2>');
    for (const ref of sheet.references) {
      parts.push(`<div class="card" style="border-left:3px solid #00D2D3;background:rgba(0,210,211,0.04)"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><b><span class="pill-badge" style="margin-right:6px">${escapeHtml(ref.role || '참고')}</span> ${escapeHtml(ref.what)}</b> <a class="pill-badge" href="/outlier-report/${encodeURIComponent(ref.videoId)}">출처: ${escapeHtml(ref.videoId)} ↗</a></div><div style="margin-top:8px"><b>채택·융합 이유</b>: ${escapeHtml(ref.reason)}</div><div class="q">근거: ${escapeHtml(ref.evidence)}</div>${(ref.appliedTo || []).length ? `<div class="q" style="border-left-color:#00D2D3"><b>적용한 곳</b>: ${ref.appliedTo.map((x) => escapeHtml(x)).join(' · ')}</div>` : ''}</div>`);
    }
  }
  if ((sheet.borrowed || []).length || (sheet.sourceApplied || []).length) {
    parts.push('<h2>다른 경쟁 영상에서 가져온 것</h2>');
    for (const b of sheet.borrowed || []) parts.push(`<div class="card" style="border-left:3px solid var(--ok);background:rgba(52,211,153,0.03)"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><b><span style="color:var(--ok)">✓</span> ${escapeHtml(b.what)}</b> <a class="pill-badge" href="/outlier-report/${encodeURIComponent(b.fromVideoId)}">출처: ${escapeHtml(b.fromVideoId)} ↗</a></div><div style="margin-top:8px"><b>가져와도 되는 이유</b>: ${escapeHtml(b.reason)}</div><div class="q">근거: ${escapeHtml(b.evidence)}</div>${(b.appliedTo || []).length ? `<div class="q" style="border-left-color:var(--ok)"><b>적용한 곳</b>: ${b.appliedTo.map((x) => escapeHtml(x)).join(' · ')}</div>` : ''}${evidenceHtml(b)}</div>`);
    for (const b of sheet.sourceApplied || []) parts.push(`<div class="card" style="border-left:3px solid var(--ok);background:rgba(52,211,153,0.03)"><b><span style="color:var(--ok)">✓</span> 원본에서 가져온 것: ${escapeHtml(b.what)}</b><div style="margin-top:8px"><b>가져온 이유</b>: ${escapeHtml(b.reason)}</div><div class="q" style="border-left-color:var(--ok)"><b>적용한 곳</b>: ${(b.appliedTo || []).map((x) => escapeHtml(x)).join(' · ')}</div></div>`);
  }
  parts.push('<h2>안 맞아서 뺀 것</h2>');
  if (!(sheet.rejected || []).length) parts.push('<p class="meta">없음</p>');
  for (const r of sheet.rejected || []) parts.push(`<div class="card" style="border-left:3px solid var(--bad);background:rgba(248,113,113,0.03)"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><b><span style="color:var(--bad)">✗</span> ${escapeHtml(r.what)}</b> <a class="pill-badge" href="/outlier-report/${encodeURIComponent(r.fromVideoId)}">출처: ${escapeHtml(r.fromVideoId)} ↗</a></div><div style="margin-top:8px"><b>뺀 이유</b>: ${escapeHtml(r.reason)}</div></div>`);
  if (Array.isArray(sheet.glossary) && sheet.glossary.length) {
    parts.push('<h2>용어 풀이 (경쟁 영상의 전문용어 → 쉬운 말)</h2>');
    for (const g of sheet.glossary) parts.push(`<div class="card" style="display:flex;align-items:center;gap:12px"><b style="color:var(--bad)">${escapeHtml(g.term)}</b> <span style="color:var(--sub)">➔</span> <b style="color:var(--ok)">${escapeHtml(g.plain)}</b></div>`);
  }
  if (sheet.pending?.length) {
    parts.push('<h2>대본 전에 확인할 것</h2>');
    for (const t of sheet.pending) parts.push(`<div class="card" style="border-left:3px solid var(--accent-amber);background:rgba(245,158,11,0.04)">${escapeHtml(t)}</div>`);
  }
  parts.push(`<script>document.addEventListener('change',function(e){var t=e.target;if(!t||!t.dataset||(!t.dataset.pick&&!t.dataset.pickTitle))return;fetch('/api/transform-sheet-pick',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoId:${JSON.stringify(sid)},kind:t.dataset.pickTitle?'title':'thumbnail',image:t.dataset.pick||t.dataset.pickTitle,picked:t.checked})}).then(function(r){if(!r.ok){t.checked=!t.checked;alert('저장하지 못했습니다');}}).catch(function(){t.checked=!t.checked;alert('저장하지 못했습니다');});});</script>`);
  if ((sheet.results || []).length) {
    parts.push('<h2>결과 기록 (공개 7일 뒤 자동)</h2>');
    for (const r of sheet.results) parts.push(`<div class="card"><b>${escapeHtml(r.videoId)}</b> · ${escapeHtml(r.summary)}</div>`);
  }
  if (sheet.outcome) parts.push(`<h2>성적</h2><div class="card">${escapeHtml(JSON.stringify(sheet.outcome))}</div>`);
  return page(`비교 시트 ${sheet.topic}`, parts.join('\n'));
}

const ROW_LABELS_VIEW = { title: '제목', thumbnail: '썸네일', opening: '첫 15초', flow: '전개', visual: '화면 연출', reaction: '시청자 반응 지점', ending: '끝맺음', package: '설명글·태그·고정 댓글' };

export function renderTransformSheetIndex(items = []) {
  const cards = items.map(({ sheet, report }) => {
    const sid = sheet.episodeId || sheet.sourceVideoId;
    const stage = sheet.status === 'published' && sheet.outcome?.views7d != null ? 'measured' : sheet.status;
    return `<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><a href="/transform-sheet/${encodeURIComponent(sid)}"><b style="font-size:16px">${escapeHtml(sheet.topic)}</b></a><div class="meta" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="pill-badge">${escapeHtml(STAGE_KO[stage] || stage)}</span> · <span class="pill-badge" style="background:rgba(255,255,255,0.05);color:var(--sub);border-color:var(--line)">${escapeHtml(sheet.format)}</span> · <span>${report?.meta?.title ? `기준: ${escapeHtml(report.meta.title)}` : (sheet.references?.length ? `다중 명작 ${sheet.references.length}편 융합` : escapeHtml(sid))}</span></div></div>`;
  });
  return page('비교 시트', `<p><a href="/">← 대시보드</a> · <a href="/outlier-reports">근거(경쟁 영상 리포트 목록)</a></p><h1>비교 시트 ${items.length}장</h1><p class="meta">경쟁 영상 리포트를 우리 콘텐츠로 바꾼 한 장. 좌우로 비교하고, 다른 경쟁 영상에서 가져온 것과 뺀 것을 이유와 함께 남긴다. 실패·기각도 데이터로 쌓는다.</p>${cards.join('\n') || '<p class="meta">아직 없음</p>'}`);
}

const SHEET_ROLE_KO = { source: '원본', borrowed: '가져온 출처' };
/** 이 영상이 쓰인 비교 시트를 글자 배지로 보여 준다(2026-11-16 사용자: 시트를 만들었는데 목록에서 연결 표시가 없어 찾기 힘들다). 카드 전체가 링크라 안쪽에 링크를 또 넣지 않는다. */
export function sheetBadgeHtml(links = []) {
  if (!links || !links.length) return '';
  return links.map((l) => `<span class="pill-badge" style="background:rgba(168,85,247,0.22);color:var(--ink);font-weight:700;border:1px solid #a855f7" title="${escapeHtml(l.topic)}">📝 비교 시트 · ${escapeHtml(SHEET_ROLE_KO[l.role] || l.role)} · ${escapeHtml(STAGE_KO[l.status] || l.status)}</span>`).join(' ');
}

export function renderReportIndex(reports = [], { links = new Map() } = {}) {
  const linked = (r) => (links.get(r.videoId) || []).length > 0;
  const sorted = [...reports].sort((a, b) => Number(linked(b)) - Number(linked(a)) || ratioTier(a) - ratioTier(b) || (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0));
  const linkedCount = sorted.filter(linked).length;
  const researchCount = sorted.filter((r) => r.source === 'studio-research').length;
  const legacyCount = sorted.length - researchCount;
  const v2Count = sorted.filter((r) => r.ratioMethod === 'peer-median-views-v2').length;
  const oldRatioCount = sorted.length - v2Count;
  const filterCss = `<style>
.rep-filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:14px 0 16px;padding:12px 14px;background:var(--card);border:1px solid var(--line);border-radius:12px}
.rep-filter-group{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.rep-filter-label{font-size:12px;font-weight:700;color:var(--sub);margin-right:2px}
.rep-fbtn{appearance:none;border:1px solid var(--line);background:rgba(255,255,255,0.03);color:var(--ink);font-size:12.5px;font-weight:600;padding:5px 11px;border-radius:999px;cursor:pointer;transition:background .15s,border-color .15s}
.rep-fbtn:hover{border-color:var(--accent)}
.rep-fbtn.active{background:var(--accent);color:#fff;border-color:var(--accent);font-weight:800}
.rep-fbtn.research.active{background:#8b5cf6;color:#fff;border-color:#8b5cf6}
.rep-divider{width:1px;height:20px;background:var(--line);margin:0 4px}
.rep-count{margin-left:auto;font-size:12.5px;color:var(--sub);font-weight:700}
</style>`;
  const items = sorted.map((r) => {
    const isResearch = r.source === 'studio-research';
    const isV2 = r.ratioMethod === 'peer-median-views-v2';
    const isLinked = linked(r);
    const srcBadge = isResearch
      ? `<span class="pill-badge" style="background:rgba(139,92,246,0.18);color:#c4b5fd;border-color:rgba(139,92,246,0.45);font-weight:700">📡 스튜디오 조사${r.studioFolds != null ? ` ${Number(r.studioFolds)}배` : ''}</span>`
      : (r.studioFolds != null ? `<span class="pill-badge" style="background:rgba(139,92,246,0.14);color:#c4b5fd;border-color:rgba(139,92,246,0.35)">유튜브 조사 ${Number(r.studioFolds)}배</span>` : '');
    const fmtBadge = r.format ? `<span class="pill-badge" style="background:rgba(56,189,248,0.12);color:var(--accent);border-color:rgba(56,189,248,0.35)">${escapeHtml(r.format)}</span>` : '';
    return `<div class="card report-item" data-source="${isResearch ? 'research' : 'legacy'}" data-ratio="${isV2 ? 'v2' : 'old'}" data-linked="${isLinked ? '1' : '0'}" style="padding:14px"><a href="/outlier-report/${encodeURIComponent(r.videoId)}">${r.meta?.thumbnail ? `<img src="${escapeHtml(r.meta.thumbnail)}" alt="">` : '<span></span>'}<span><b style="font-size:15px">${escapeHtml(r.meta?.title)}</b><br><span class="meta" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px"><span class="pill-badge">${escapeHtml(r.meta?.channelTitle)}</span>${fmtBadge}${sheetBadgeHtml(links.get(r.videoId))}${srcBadge ? ` ${srcBadge}` : ''} · <span style="color:var(--accent-amber);font-weight:700">채널 평소 대비 ${formatRatioLabel(r)}</span> · <span>장면 전환 ${cutCountLabel(r.pacing)}</span> · <span>AI 화면 변화 ${(r.analysis?.visualMoments || []).length}개</span> · <span>캡처 ${(r.frames || []).length}장</span> · <span>인용 확인 ${r.quoteCheck?.verified ?? 0}/${r.quoteCheck?.checked ?? 0}</span> · <span>분석 ${escapeHtml(String(r.analyzedAt || '').slice(0, 10))}</span></span></span></a></div>`;
  });
  const filterBar = `<div class="rep-filters" id="rep-filter-bar">
  <div class="rep-filter-group" role="group" aria-label="출처 필터">
    <span class="rep-filter-label">출처</span>
    <button type="button" class="rep-fbtn active" data-filter-source="all">전체 (${sorted.length})</button>
    <button type="button" class="rep-fbtn research" data-filter-source="research">📡 스튜디오 조사 (${researchCount})</button>
    <button type="button" class="rep-fbtn" data-filter-source="legacy">기존 목록 (${legacyCount})</button>
    <button type="button" class="rep-fbtn" data-filter-source="linked">📝 시트 연결 (${linkedCount})</button>
  </div>
  <span class="rep-divider" aria-hidden="true"></span>
  <div class="rep-filter-group" role="group" aria-label="배수 방식 필터">
    <span class="rep-filter-label">배수</span>
    <button type="button" class="rep-fbtn active" data-filter-ratio="all">전체</button>
    <button type="button" class="rep-fbtn" data-filter-ratio="v2">새 배수 v2 (${v2Count})</button>
    <button type="button" class="rep-fbtn" data-filter-ratio="old">옛 방식 (${oldRatioCount})</button>
  </div>
  <span class="rep-count" id="rep-visible-count">표시 중: ${sorted.length} / ${sorted.length}편</span>
</div>`;
  const filterScript = `<script>(function(){
  var src='all', rat='all';
  var items=Array.prototype.slice.call(document.querySelectorAll('.report-item'));
  var emptyEl=document.getElementById('rep-empty-msg');
  var countEl=document.getElementById('rep-visible-count');
  function apply(){
    var shown=0;
    items.forEach(function(el){
      var okSrc=src==='all'||(src==='linked'?el.dataset.linked==='1':el.dataset.source===src);
      var okRat=rat==='all'||el.dataset.ratio===rat;
      var show=okSrc&&okRat;
      el.style.display=show?'':'none';
      if(show) shown++;
    });
    if(countEl) countEl.textContent='표시 중: '+shown+' / '+items.length+'편';
    if(emptyEl) emptyEl.style.display=shown===0&&items.length>0?'block':'none';
  }
  document.addEventListener('click',function(e){
    var btn=e.target&&e.target.closest?e.target.closest('.rep-fbtn'):null;
    if(!btn)return;
    if(btn.dataset.filterSource){
      src=btn.dataset.filterSource;
      document.querySelectorAll('[data-filter-source]').forEach(function(b){b.classList.toggle('active',b===btn);});
      apply();
    } else if(btn.dataset.filterRatio){
      rat=btn.dataset.filterRatio;
      document.querySelectorAll('[data-filter-ratio]').forEach(function(b){b.classList.toggle('active',b===btn);});
      apply();
    }
  });
})();</script>`;
  return page('아웃라이어 리포트', `${filterCss}<p><a href="/">← 대시보드</a> · <a href="/visual-library">연출 자료집</a> · <a href="/next-input">다음 기획 입력</a></p><h1>아웃라이어 리포트 ${sorted.length}편</h1><p class="meta">📝 비교 시트에 쓰인 영상 ${linkedCount}편은 맨 위에 보라색 배지와 함께 모여 있다(원본 = 시트의 출발 영상, 가져온 출처 = 다른 영상에서 가져온 것의 출처). <a href="/transform-sheets">비교 시트 목록 →</a></p><p class="meta">경쟁 영상 한 편을 제목·썸네일·화면·자막·댓글로 한 번에 관찰한 기록. 채널 평소 대비 배수가 큰 영상부터.</p>${filterBar}<div class="list">${items.join('\n') || '<p class="meta">아직 없음</p>'}</div><p class="meta" id="rep-empty-msg" style="display:none;padding:24px 0;text-align:center">선택한 조건에 맞는 리포트가 아직 없습니다.</p>${filterScript}`);
}
