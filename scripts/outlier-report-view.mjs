// 합친 아웃라이어 리포트를 사람이 보는 화면(HTML)으로 그린다(2026-11-12).
// 대시보드 서버가 /outlier-reports, /outlier-report/<영상ID> 로 보여 준다. 읽기 전용.
// 댓글·자막·제목은 외부에서 온 글자라서 전부 escapeHtml을 거친다(시험이 확인).

import { fullScript, hangulSyllables, voiceBudget } from './transform-sheet.mjs';
import { formatRatioLabel, ratioTier } from './peer-ratio.mjs';
import { CREDIT_KO, ANALYSIS_LABELS, EYE_LABELS, TAG_LABELS } from './packaging-cases.mjs';
import { CREATOR_STUDY_CSS, renderCreatorStudySection } from './creator-study-view.mjs';

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
.thumbbox{display:flex;flex-wrap:nowrap;gap:14px;overflow:auto;max-height:80vh;padding:12px 6px 16px;border:1px solid var(--line);border-radius:12px;margin:10px 0;background:rgba(0,0,0,0.04)}.pick{display:flex;flex-direction:column;gap:6px;flex:0 0 auto;padding:8px;border-radius:12px;background:var(--card);border:1px solid var(--line);cursor:pointer;transition:transform 0.2s,border-color 0.2s}.pick:hover{transform:translateY(-2px);border-color:var(--accent)}.pick.is-rec{border:2px solid #f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.16)}.pick-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:24px}.pick-meta{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:var(--sub)}.pick-rec-badge{background:#f59e0b;color:#111827;font-size:11px;font-weight:900;padding:2px 8px;border-radius:999px}.pick img.real{width:200px;height:355px;object-fit:cover;display:block;border-radius:8px;border:1px solid var(--line);box-shadow:0 4px 12px rgba(0,0,0,0.12)}.pick img.real.wide{width:320px;height:180px}.pick input{width:20px;height:20px;margin:0;accent-color:var(--accent);cursor:pointer;flex:none}.titles label{display:flex;gap:10px;align-items:flex-start;padding:8px 12px;cursor:pointer;border-radius:8px;border:1px solid var(--line);margin:6px 0;background:var(--card);transition:background 0.15s,border-color 0.15s}.titles label:hover{border-color:var(--accent);background:var(--card-hover)}.titles input{width:20px;height:20px;flex:0 0 auto;accent-color:var(--accent);margin-top:2px}.thumb{max-width:380px;width:100%;border-radius:10px;border:1px solid var(--line);box-shadow:0 4px 14px rgba(0,0,0,0.15)}
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
  const studioFoldsBadge = report.studioFolds != null ? ` · <span class="pill-badge" style="background:rgba(139,92,246,0.14);color:var(--accent-purple);border-color:rgba(139,92,246,0.4);font-weight:700">유튜브 조사 ${Number(report.studioFolds)}배</span>` : '';
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

  if (a.whyOutlierVsChannel || (report.channelPeers || []).length) {
    parts.push('<h2>같은 채널 평소 영상 대조</h2><div class="card">');
    if (a.whyOutlierVsChannel) parts.push(`<p><b>평소 영상 대비 핵심 차이</b>: ${escapeHtml(a.whyOutlierVsChannel)}</p>`);
    if ((report.channelPeers || []).length) {
      parts.push('<p class="meta" style="margin-bottom:6px">대조군(같은 채널·같은 형식 평소 영상)</p><ul>'
        + report.channelPeers.map((cp) => `<li>${escapeHtml(cp.title)} <span class="meta">(조회수 ${num(cp.viewCount)} · 길이 ${cp.durationSeconds ?? '?'}초${cp.publishedAt ? ` · ${escapeHtml(cp.publishedAt)}` : ''})</span></li>`).join('')
        + '</ul>');
    }
    parts.push('</div>');
  }

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
.sheet-col .imgs{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0;align-items:flex-start}
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
.film.ours-grid{display:grid;grid-template-columns:repeat(var(--cols,13),190px);grid-template-rows:repeat(var(--rows,4),minmax(0,auto));grid-auto-flow:column;gap:12px;overflow-x:auto;padding:8px 4px 16px;align-items:start}
.film.ours-grid.wide{grid-template-columns:repeat(var(--cols,13),290px)}
.cut-card{margin:0;display:flex;flex-direction:column;background:var(--card);border:1px solid var(--line);border-radius:10px;padding:8px;box-shadow:0 2px 6px rgba(0,0,0,0.05);box-sizing:border-box;width:190px}
.cut-card.wide{width:290px}
.cut-card.p1{border-color:rgba(148,163,184,0.4)}
.cut-card.p2{border-color:rgba(56,189,248,0.45)}
.cut-card.p4{border-color:rgba(0,210,211,0.6);background:rgba(0,210,211,0.03)}
.cut-card .vtag{font-size:11px;font-weight:800;margin-bottom:5px;padding:2px 6px;border-radius:4px;display:inline-block;align-self:flex-start}
.cut-card img{width:172px;height:306px;object-fit:cover;border-radius:6px;border:1px solid var(--line);display:block}
.cut-card.wide img{width:272px;height:153px}
.cut-card figcaption{font-size:11.5px;font-weight:700;margin-top:6px;text-align:center}
.cut-card .say{width:100%;box-sizing:border-box;margin:6px 0 0;font-size:12.5px;line-height:1.45;text-align:left;white-space:normal;word-break:keep-all;color:var(--ink);background:rgba(255,255,255,0.03);padding:6px 8px;border-radius:6px;border:1px solid rgba(255,255,255,0.05)}
.cut-card .say.motion{font-size:11.5px;background:transparent;border:none;padding:4px 0 0}
.cut-card .say.bottom{font-size:11px;opacity:0.85;padding:2px 0 0;background:transparent;border:none}
.budget-pill{display:inline-block;margin-top:4px;font-size:11px;font-weight:700;padding:2px 7px;border-radius:999px;font-variant-numeric:tabular-nums;align-self:center}
.budget-ok{background:var(--ok-bg);color:var(--ok);border:1px solid rgba(52,211,153,0.35)}
.budget-warn{background:rgba(245,158,11,0.14);color:var(--accent-amber);border:1px solid rgba(245,158,11,0.35)}
.budget-over{background:var(--bad-bg);color:var(--bad);border:1px solid rgba(248,113,113,0.45)}
.ref-card-wrap{display:flex;gap:14px;align-items:flex-start}
.ref-thumb{width:84px;height:112px;object-fit:cover;border-radius:8px;border:1px solid var(--line);flex-shrink:0;display:block}
.ref-thumb.wide{width:160px;height:90px}
.outcome-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0}
.outcome-cell{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.outcome-cell .olabel{font-size:11.5px;color:var(--sub);font-weight:600}
.outcome-cell .oval{font-size:20px;font-weight:800;color:var(--ink);margin-top:4px;font-variant-numeric:tabular-nums}
.ai-rec-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid rgba(245,158,11,0.22)}
.ai-pick-btn{appearance:none;border:1px solid #d97706;background:#f59e0b;color:#111827;font-size:12.5px;font-weight:800;padding:6px 13px;border-radius:8px;cursor:pointer;transition:opacity .15s}
.ai-pick-btn:hover{opacity:0.9}
.ai-pick-btn:disabled{opacity:0.55;cursor:default}
.sheet-idx-card{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.sheet-idx-left{display:flex;gap:14px;align-items:center;min-width:0;flex:1}
.sheet-idx-thumb{width:64px;height:112px;object-fit:cover;border-radius:8px;border:1px solid var(--line);flex-shrink:0;display:block}
.sheet-idx-thumb.wide{width:128px;height:72px}
.sheet-idx-thumb.placeholder{display:flex;align-items:center;justify-content:center;background:rgba(148,163,184,0.1);color:var(--sub);font-size:11px;font-weight:700;text-align:center}
@media (max-width:600px){.ref-card-wrap{flex-direction:column}.ref-thumb{width:100%;height:160px}}
.fullscript div{padding:4px 0;border-bottom:1px solid var(--line-subtle)}
.pkg{white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere;margin:6px 0 10px;font:inherit;font-size:13.5px;background:rgba(0,0,0,0.03);padding:10px 12px;border-radius:8px;border:1px solid var(--line)}
.film.ours figure{border-color:rgba(56,189,248,0.3)}
.film.ours img{border-color:var(--accent)}
.bar{display:flex;height:16px;border-radius:8px;overflow:hidden;border:1px solid var(--line);max-width:460px;margin:8px 0}
.bar span:first-child{background:var(--accent)}.bar span:last-child{background:var(--line)}
@media (max-width:700px){.sheet-row{grid-template-columns:minmax(0,1fr)}}
.toc{position:sticky;top:0;z-index:30;display:flex;gap:6px;overflow-x:auto;padding:8px 0;margin:12px 0 14px;background:var(--bg);border-bottom:1px solid var(--line);scrollbar-width:thin}
.toc a{flex:0 0 auto;display:inline-flex;align-items:center;min-height:36px;padding:0 13px;border-radius:999px;border:1px solid var(--line);background:var(--card);color:var(--sub);font-size:12.5px;font-weight:700;white-space:nowrap}
.toc a:hover,.toc a:focus-visible{border-color:var(--accent);color:var(--accent);text-decoration:none}
.toc a.go{border-color:var(--ok);color:var(--ok)}.toc a.stop{border-color:var(--bad);color:var(--bad)}
main [id]{scroll-margin-top:64px}
.approve-zone{border:1px solid var(--line);border-radius:14px;padding:0 16px 10px;margin:4px 0 26px}
.approve-zone>h2{margin-top:16px}
.approve-status{display:flex;flex-wrap:wrap;gap:6px 16px;align-items:center;font-size:13.5px;margin:4px 0 6px}
.fold{border:1px solid var(--line);border-radius:10px;margin:8px 0;background:var(--card)}
.fold>summary{cursor:pointer;display:flex;align-items:center;flex-wrap:wrap;gap:4px 8px;min-height:44px;padding:8px 14px;font-size:13.5px;font-weight:700;color:var(--ink);list-style:none}
.fold>summary::-webkit-details-marker{display:none}
.fold>summary::before{content:'▸';display:inline-block;color:var(--accent);transition:transform .15s}
.fold[open]>summary::before{transform:rotate(90deg)}
.fold>summary:focus-visible{outline:2px solid var(--accent);outline-offset:-2px;border-radius:10px}
.fold>.fold-body{padding:2px 14px 12px}
.sheet-why .fold{background:transparent;margin:10px 0 0}
.sheet-why .fold>summary{padding:6px 10px;min-height:40px}
.ev{margin-top:6px}
.cut-card>.say>.clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden}
.cut-card:has(details[open])>.say>.clamp{display:inline;-webkit-line-clamp:unset}
.cut-more>summary{cursor:pointer;margin-top:4px;padding:6px 2px;font-size:12px;font-weight:700;color:var(--accent)}
.cut-more>summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px;border-radius:4px}
@media (max-width:600px){.thumbbox{flex-wrap:wrap;justify-content:center;max-height:none;overflow:visible}.approve-zone{padding:0 10px 8px}}
@media (prefers-reduced-motion:reduce){.fold>summary::before{transition:none}}
</style>`;
const STAGE_KO = { draft: '초안', approved: '승인', published: '공개', measured: '성적 입력됨' };

/** 접는 칸(2026-11-25 화면 정리): 긴 글은 지우지 않고 접어 두고, 접힌 줄에 무엇이 들었는지 데이터에서 센 숫자를 보여 준다.
 * summary는 이미 이스케이프된 HTML을 받는다. */
const fold = (summary, body, { id = '', cls = '' } = {}) => `<details class="fold${cls ? ` ${cls}` : ''}"${id ? ` id="${id}"` : ''}><summary>${summary}</summary><div class="fold-body">${body}</div></details>`;
const textSize = (text) => {
  const s = String(text ?? '');
  return `${s ? s.split('\n').length : 0}줄 · ${s.length.toLocaleString('ko-KR')}자`;
};

/** 경쟁 영상의 설명글·태그(리포트에 저장된 값 그대로). 오래된 리포트는 아직 저장 전이라고 밝힌다. */
function packageCompetitor(report) {
  const m = report?.meta;
  if (!m || m.description === undefined) return '<div class="meta">설명글·태그: 이 리포트에는 아직 저장 전</div>';
  return `${fold(`설명글 보기 <span class="meta">— ${textSize(m.description)}</span>`, `<pre class="pkg">${escapeHtml(m.description || '(없음)')}</pre>`)}<h4>태그</h4><div>${(m.tags || []).length ? escapeHtml(m.tags.join(', ')) : '태그 없음(이 영상은 태그를 달지 않았다)'}</div>`;
}
function packageOurs(ours) {
  const checks = ours?.tagCheck || [];
  return `${fold(`설명글 보기 <span class="meta">— ${textSize(ours?.description)}</span>`, `<pre class="pkg">${escapeHtml(ours?.description || '')}</pre>`)}<h4>태그 (${(ours?.tags || []).length}개)</h4><div>${escapeHtml((ours?.tags || []).join(', '))}</div>${checks.length ? fold(`태그를 유튜브 검색창에 쳐 본 결과 <span class="meta">— ${checks.length}개</span>`, checks.map((c) => `<div class="meta"><b>${escapeHtml(c.tag)}</b> — ${escapeHtml(c.verdict)}: ${escapeHtml(c.reason)}${(c.top || []).length ? ` (위쪽 결과: ${c.top.map((t) => '“' + escapeHtml(t) + '”').join(', ')})` : ''}</div>`).join('')) : ''}${fold(`고정 댓글 보기 <span class="meta">— ${textSize(ours?.pinnedComment)}</span>`, `<pre class="pkg">${escapeHtml(ours?.pinnedComment || '')}</pre>`)}`;
}

/** 컷 리듬: 경쟁 컷 시각(ffmpeg가 잰 값)과 우리 컷 계획을 같은 시간 막대로 보여 준다.
 * 2026-11-25 화면 정리: 우리 컷 카드는 대본 네 줄만 보이고 나머지(영어 소리·연출 메모)는 "더 보기"로 접는다.
 * 카드들이 가장 긴 카드 높이로 늘어나지 않게 하고(align-items:start), 경쟁 화면 이미지와 전체 대본은 접어 둔다. */
function cutRhythm(row, report, oursUrl = (x) => x, ver = (x) => x, refs = [], { isWide = false } = {}) {
  const plan = row.ours?.cutPlan;
  const times = report?.pacing?.times;
  const compDur = Number(report?.windowSeconds) || Number(report?.meta?.durationSeconds) || 0;
  const bar = (list, dur, cls) => `<div class="timeline">${list.map((t) => `<span class="tick ${cls}" style="left:${Math.min(100, (Number(t) / dur) * 100)}%"></span>`).join('')}</div>`;
  const parts = ['<div class="sheet-label" id="sec-cuts">컷 리듬</div>'];
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
  // 경쟁 이미지 줄은 접어 둔다(위 시간 막대가 비교를 맡는다). 펼치면 예전과 같은 줄이 그대로 나온다.
  const compStrips = [];
  let compShots = 0;
  if (Array.isArray(times) && times.length) { compShots += times.length; compStrips.push(`<div class="tl-label">경쟁 컷 이미지</div><div class="film comp">${times.map((t, i) => fig(ver(`/outlier-frames/${id}/cut-${String(i).padStart(2, '0')}.jpg`), t)).join('')}</div>`); }
  // 경쟁 영상의 저장된 화면 캡처를 초 순서로 보여 준다(2026-11-16 사용자: 비교 시트에 경쟁 비주얼 컷이 하나도 없다). 컷 시각 감지가 실패한 영상(w8g6 등)도 캡처는 있다. 원본과 가져온 출처 영상 모두.
  for (const r of refs.filter((x) => x.frames && x.frames.length)) { compShots += r.frames.length; compStrips.push(`<div class="tl-label">경쟁 화면 캡처 — ${escapeHtml(r.label)} · ${r.frames.length}장(저장된 캡처를 초 순서로)</div><div class="film comp">${r.frames.map((fr) => fig(ver(`/outlier-frames/${encodeURIComponent(r.videoId)}/${escapeHtml(fr.file)}`), fr.t)).join('')}</div>`); }
  // 레거시 v3(cutPlan2) 시트 호환용 2D 그리드. v4 단일 최적안 시트는 1줄로 출력한다.
  const plan2 = row.ours?.cutPlan2;
  const bottomText = (b) => (typeof b === 'string' ? b : b?.subtitle || b?.speaker || '');
  const cutBudgetHtml = (targetPlan, idx) => {
    const cuts = targetPlan?.cuts;
    const c = cuts?.[idx];
    if (!c) return '';
    const start = Number(c.t);
    const nextT = idx + 1 < cuts.length ? Number(cuts[idx + 1]?.t) : Number(targetPlan?.durationSeconds);
    const dur = Number.isFinite(start) && Number.isFinite(nextT) ? nextT - start : null;
    const hasVoice = Boolean(String(c.narration || '').trim() || (Array.isArray(c.voiceEn) && c.voiceEn.length) || Number(c.window) > 0);
    if (!hasVoice && !(dur != null && dur > 0)) return '';
    const need = hasVoice ? voiceBudget(c) : 0;
    const durStr = dur != null && dur > 0 ? `${Math.round(dur * 10) / 10}초` : '—';
    if (!hasVoice) return `<span class="budget-pill budget-ok" title="무나레이션 컷 길이">⏱ 컷 ${durStr}</span>`;
    const needStr = `${Math.round(need * 10) / 10}초`;
    const cls = dur != null && dur > 0
      ? (need > dur + 0.01 ? 'budget-over' : (need >= dur * 0.85 ? 'budget-warn' : 'budget-ok'))
      : 'budget-ok';
    return `<span class="budget-pill ${cls}" title="예상 음성 길이(음성 예산) / 컷 길이">🎙 ${needStr} / ${durStr}</span>`;
  };
  // 카드 글: 대본은 네 줄까지 보이고(CSS가 자른다), 나머지는 "더 보기" 안에 둔다. 펼치면 대본도 끝까지 보인다(.cut-card:has(details[open])).
  // 네 줄을 넘을지는 글자 수로 어림한다(넓은 카드 한 줄 약 18자, 좁은 카드 약 12자).
  const clampChars = isWide ? 70 : 45;
  const cutText = (narration, extras = []) => {
    const text = String(narration || '');
    const narHtml = text ? `<div class="say"><span class="clamp"><b>대본:</b> ${escapeHtml(text).replace(/\n/g, '<br>')}</span></div>` : '';
    const more = extras.filter((e) => e.html);
    const longNar = text.length > clampChars || text.split('\n').length > 4;
    const labels = [...(longNar ? [`대본 전체 ${text.length.toLocaleString('ko-KR')}자`] : []), ...more.map((e) => e.label)];
    if (!labels.length) return narHtml;
    return `${narHtml}<details class="cut-more"><summary>더 보기 · ${labels.join(' · ')}</summary>${more.map((e) => e.html).join('')}</details>`;
  };

  const hasP2 = Boolean(plan2?.cuts?.length);
  const rowCount = 1 + (hasP2 ? 1 : 0);

  const gridCards = [];
  const wideCls = isWide ? ' wide' : '';
  (plan?.cuts || []).forEach((c, idx) => {
    // 단일 최적안(v4 슬로건 시트)이면 AI 최적안 1줄로 깔끔하게 출력
    if (!hasP2) {
      const b1 = bottomText(c.bottom);
      const en = Array.isArray(c.voiceEn) ? c.voiceEn : [];
      gridCards.push(`<figure class="cut-card p4${wideCls}"><span class="vtag" style="background:#00D2D3;color:#000">🚀 AI 최적안 · 컷 ${idx + 1}</span><a href="${oursUrl(c.image)}" target="_blank" rel="noopener"><img loading="lazy" src="${oursUrl(c.image)}" alt="${escapeHtml(c.t)}초 컷"></a><figcaption>${escapeHtml(c.t)}초</figcaption>${cutBudgetHtml(plan, idx)}${cutText(c.narration, [
        { label: `영어 소리 ${en.length}개`, html: en.length ? `<div class="say en"><b>영어 소리:</b> ${en.map((x) => escapeHtml(x)).join(' / ')}</div>` : '' },
        { label: '연출 메모', html: c.motion ? `<div class="say motion" style="color:var(--sub)"><b>연출/모션:</b> ${escapeHtml(c.motion)}</div>` : '' },
        { label: '하단 글', html: b1 ? `<div class="say bottom" style="color:var(--sub)"><b>하단:</b> ${escapeHtml(b1)}</div>` : '' },
      ])}</figure>`);
      return;
    }
    // 레거시 1·2안 대조 카드
    gridCards.push(`<figure class="cut-card p1${wideCls}"><span class="vtag" style="background:var(--sub);color:#fff">1안 (경쟁 베이스)</span><a href="${oursUrl(c.image)}" target="_blank" rel="noopener"><img loading="lazy" src="${oursUrl(c.image)}" alt="${escapeHtml(c.t)}초 컷 1안"></a><figcaption>${escapeHtml(c.t)}초</figcaption>${cutBudgetHtml(plan, idx)}${cutText(c.narration)}</figure>`);

    const c2 = plan2?.cuts?.[idx];
    const nar2 = c2 ? (c2.narration ?? c.narration) : '';
    const b2 = bottomText(c2?.bottom);
    if (c2) {
      gridCards.push(`<figure class="cut-card p2${wideCls}"><span class="vtag" style="background:var(--accent);color:#fff">2안 (개선 시안)</span><a href="${oursUrl(c2.image)}" target="_blank" rel="noopener"><img loading="lazy" src="${oursUrl(c2.image)}" alt="${escapeHtml(c2.t)}초 컷 2안"></a><figcaption>${escapeHtml(c2.t)}초</figcaption>${cutBudgetHtml(plan2, idx)}${cutText(nar2, [
        { label: '움직임', html: c2.motion ? `<div class="say motion" style="color:var(--sub)"><b>움직임:</b> ${escapeHtml(c2.motion)}</div>` : '' },
        { label: '하단 띠', html: b2 ? `<div class="say bottom" style="color:var(--sub)"><b>하단 띠:</b> ${escapeHtml(b2)}</div>` : '' },
      ])}</figure>`);
    } else {
      gridCards.push(`<figure class="cut-card p2${wideCls}"><div class="meta" style="margin:auto">2안 컷 없음</div></figure>`);
    }
  });

  if (Array.isArray(plan?.cuts) && plan.cuts.length) {
    const label = hasP2 ? '우리 컷 이미지 + 대본 (1안·2안 컷 시간대별 1:1 대조)' : '우리 컷 이미지 + 대본 (AI 주도 최적안 1안)';
    parts.push(`<div class="tl-label">${label} — 옆으로 넘겨 본다. 카드의 "더 보기"를 누르면 그 컷의 대본 전체·영어 소리·연출이 펼쳐진다</div><div class="film ours-grid${wideCls}" style="--cols:${plan.cuts.length};--rows:${rowCount}">${gridCards.join('')}</div>`);
  }
  if (compStrips.length) parts.push(`<details class="fold" id="sec-comp-shots"><summary>경쟁 화면 이미지 보기 <span class="meta">— ${compStrips.length}줄 · ${compShots}장</span></summary><div class="fold-body">${compStrips.join('')}</div></details>`);
  const script = fullScript(plan);
  if (script.lines.length) {
    const en = (plan?.cuts || []).flatMap((c) => (Array.isArray(c.voiceEn) ? c.voiceEn : []));
    const enNote = en.length ? ` · 영어 소리 ${en.length}번(서로 다른 문장 ${new Set(en.map((x) => String(x).trim())).size}개)` : '';
    parts.push(`<details class="fold" id="sec-script"><summary>전체 대본 보기 <span class="meta">— 컷 대본 ${script.lines.length}개를 이은 글(음성에 그대로 넣는 글) · 한글 ${hangulSyllables(script.text).toLocaleString('ko-KR')}자${enNote}</span></summary><div class="fold-body"><div class="card fullscript">${script.lines.map((l) => `<div><span class="meta">${escapeHtml(l.t)}초</span> ${escapeHtml(l.text)}</div>`).join('')}</div></div></details>`);
  }
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

export function renderOutcomeCard(outcome) {
  if (!outcome || typeof outcome !== 'object') return '';
  const cells = [];
  if (outcome.views7d != null) cells.push({ label: '공개 7일 조회수', val: `${num(outcome.views7d)}회` });
  if (outcome.watchSeconds7d != null) cells.push({ label: '7일 평균 시청 시간', val: `${Math.round(Number(outcome.watchSeconds7d))}초` });
  if (outcome.subs7d != null) cells.push({ label: '7일 구독 전환', val: `${Number(outcome.subs7d) >= 0 ? '+' : ''}${num(outcome.subs7d)}명` });
  if (outcome.stayedToWatch != null) cells.push({ label: '계속 시청함 (쇼츠)', val: `${Number(outcome.stayedToWatch).toFixed(1)}%` });
  if (outcome.impressions7d != null) cells.push({ label: '7일 노출수', val: `${num(outcome.impressions7d)}회` });
  if (outcome.ctr7d != null) cells.push({ label: '7일 노출 클릭률(CTR)', val: `${Number(outcome.ctr7d).toFixed(2)}%` });
  if (!cells.length) return '<div class="card meta">정산 지표가 아직 입력되지 않았습니다.</div>';
  return `<div class="outcome-grid">${cells.map((c) => `<div class="outcome-cell"><div class="olabel">${escapeHtml(c.label)}</div><div class="oval">${escapeHtml(c.val)}</div></div>`).join('')}</div>`;
}

export function renderTransformSheetPage(sheet, report, problems = [], { assetVersion = '', refReports = [], blockers = null, warnings = null, cases = null, study = null, reviewItems = [] } = {}) {
  const sid = String(sheet.episodeId || sheet.sourceVideoId || '');
  const id = encodeURIComponent(sid);
  const srcId = sheet.sourceVideoId ? encodeURIComponent(sheet.sourceVideoId) : '';
  const ver = (url) => (assetVersion ? `${url}?v=${encodeURIComponent(assetVersion)}` : url);
  const refById = new Map((refReports || []).map((x) => [x.videoId, x]));
  const frameByT = new Map((report?.frames || []).map((f) => [String(f.t), f.file]));
  const blockerList = Array.isArray(blockers) ? blockers : (problems || []);
  const warningList = Array.isArray(warnings) ? warnings : [];
  const isWide = sheet.format === 'LONGFORM';
  const compThumbStyle = (wide) => (wide
    ? 'width:152px;height:86px;object-fit:cover;object-position:center;flex:none;border-radius:6px;border:1px solid var(--line)'
    : 'width:104px;height:186px;object-fit:cover;object-position:center;flex:none;border-radius:6px;border:1px solid var(--line)');
  const competitorImg = (token) => {
    if (token === 'thumbnail') {
      const reportWide = report?.meta?.durationSeconds != null ? Number(report.meta.durationSeconds) > 180 : isWide;
      return report?.meta?.thumbnail ? `<img style="${compThumbStyle(reportWide)}" src="${escapeHtml(report.meta.thumbnail)}" alt="경쟁 썸네일">` : '';
    }
    const tm = String(token).match(/^thumb:(.+)$/);
    if (tm) {
      const rr = refById.get(tm[1]);
      const rrWide = rr?.isLongform != null ? Boolean(rr.isLongform) : isWide;
      return rr?.thumbnail ? `<img loading="lazy" style="${compThumbStyle(rrWide)}" src="${escapeHtml(rr.thumbnail)}" title="${escapeHtml(rr.label)}" alt="경쟁 썸네일">` : '';
    }
    const m = String(token).match(/^frame:(.+)$/);
    const file = m && frameByT.get(m[1]);
    return file && srcId ? `<img loading="lazy" src="${ver(`/outlier-frames/${srcId}/${escapeHtml(file)}`)}" alt="${escapeHtml(m[1])}초 화면">` : '';
  };
  const oursUrl = (rel) => ver(`/transform-images/${id}/${escapeHtml(String(rel).replace(/^images\/[^/]+\//, ''))}`);
  const oursImg = (rel) => (rel ? `<img loading="lazy" src="${oursUrl(rel)}" alt="우리 쪽 시안">` : '');
  const stage = sheet.status === 'published' && sheet.outcome?.views7d != null ? 'measured' : sheet.status;
  const share = sheet.identityShare || { ours: 0, competitor: 0 };
  const studioFoldsMeta = report?.studioFolds != null
    ? ` · <span class="pill-badge" style="background:rgba(139,92,246,0.14);color:var(--accent-purple);border-color:rgba(139,92,246,0.4);font-weight:700">📡 유튜브 조사 ${Number(report.studioFolds)}배</span>`
    : '';
  const createdMeta = sheet.createdAt ? ` · <span>작성: ${escapeHtml(sheet.createdAt)}</span>` : '';
  const isDraft = sheet.status === 'draft';
  // 화면 순서(2026-11-25 사용자: 세로로 한참 내려야 한다): 머리 → 막는 문제 → 구간 목차 → 승인에 필요한 것(AI 추천·제목·썸네일 고르기·승인 버튼)
  // → 시험 변수 → 나머지 칸 비교 → 근거 자료(접힘). 정보는 지우지 않고 접는다. 승인을 막는 문제는 접지 않는다.
  const toc = [];
  const parts = [
    '<p><a href="/transform-sheets">← 비교 시트 목록</a>' + (srcId ? ' · <a href="/outlier-report/' + srcId + '">근거 보기(경쟁 영상 리포트)</a>' : ' · <a href="/outlier-reports">근거(리포트 목록)</a>') + ' · <a href="/">대시보드</a></p>',
    SHEET_CSS,
    CREATOR_STUDY_CSS,
    `<h1>비교 시트: ${escapeHtml(sheet.topic)}</h1>`,
    `<div class="meta" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 12px"><span class="pill-badge">${escapeHtml(sheet.format)}</span>${sheet.episodeId ? ` · <span class="pill-badge" style="background:rgba(0,210,211,0.12);color:#00D2D3;border-color:rgba(0,210,211,0.35)">에피소드: ${escapeHtml(sheet.episodeId)}</span>` : ''}${report || sheet.sourceVideoId ? ` · <span>기준 영상: <b>${escapeHtml(report?.meta?.title || sheet.sourceVideoId)}</b></span> · <span>${escapeHtml(report?.meta?.channelTitle || '')}</span> · <span style="color:var(--accent-amber);font-weight:700">평소의 ${formatRatioLabel(report)}</span>${studioFoldsMeta}` : ` · <span>다중 명작 융합 (${(sheet.references || []).length}편)</span>`} · <span class="pill-badge" style="background:rgba(52,211,153,0.12);color:var(--ok);border-color:rgba(52,211,153,0.3)">상태: ${escapeHtml(STAGE_KO[stage] || stage)}</span>${createdMeta}</div>`,
    (sheet.rows || []).some((x) => x.origin) ? (() => { const o = { competitor: 0, mixed: 0, ours: 0 }; for (const x of sheet.rows || []) if (o[x.origin] !== undefined) o[x.origin] += 1; const n = o.competitor + o.mixed + o.ours || 1; return `<p>행별 출처 <b>경쟁 구조 ${o.competitor} · 섞음 ${o.mixed} · 우리가 새로 만듦 ${o.ours}</b> (총 ${n}행) — 사람이 정한 비율이 아니라 아래 각 행에 적은 출처를 센 값이다.</p><div class="bar"><span style="width:${(o.ours / n) * 100}%"></span><span style="width:${(o.mixed / n) * 100}%;background:var(--accent-amber)"></span><span style="width:${(o.competitor / n) * 100}%"></span></div>`; })() : `<p>정체성 비율 <b>경쟁 ${Number(share.competitor)}% · 우리 ${Number(share.ours)}%</b> — ${escapeHtml(share.reason)}</p><div class="bar"><span style="width:${Number(share.ours)}%"></span><span style="width:${Number(share.competitor)}%"></span></div>`,
  ];
  for (const p of blockerList) parts.push(`<div class="warn">⛔ [승인 차단] ${escapeHtml(p)}</div>`);
  for (const w of warningList) parts.push(`<div class="card" style="border-left:3px solid #d97706;background:rgba(245,158,11,0.12);color:#92400e;margin:6px 0;padding:10px 14px;font-size:13.5px;font-weight:600">💡 [참고 경고 · 승인 가능] ${escapeHtml(w)}</div>`);
  const tocAt = parts.length;
  parts.push('');

  const aiRec = sheet.aiRecommendation && typeof sheet.aiRecommendation === 'object' ? sheet.aiRecommendation : null;
  const picks = new Set(sheet.thumbnailPicks || []);
  const titlePicks = new Set(sheet.titlePicks || []);
  const pickTitle = isWide ? '실제 유튜브 롱폼 목록 크기(16:9, 가로 320px)' : '실제 유튜브 쇼츠 목록 크기(가로 200px)';
  const pickLabelOf = (rel, idx) => {
    const m = String(rel).match(/thumb-([A-Za-z0-9]+)\.(?:jpg|png)$/i);
    return m ? `${m[1].toUpperCase()}안` : `시안 ${idx + 1}`;
  };
  const pickRow = (list) => `<div class="thumbbox">${list.map((rel, idx) => { const isRec = aiRec?.thumbnail === rel; return `<label class="pick${isRec ? ' is-rec' : ''}"><span class="pick-head"><span class="pick-meta"><span>${escapeHtml(pickLabelOf(rel, idx))}</span>${isRec ? '<span class="pick-rec-badge">★ AI 추천</span>' : ''}</span><input type="checkbox" data-pick="${escapeHtml(rel)}"${picks.has(rel) ? ' checked' : ''}></span><img class="real${isWide ? ' wide' : ''}" title="${pickTitle}" loading="lazy" src="${oursUrl(rel)}" alt="우리 쪽 시안"></label>`; }).join('')}</div>`;
  // 사례집 사례(case:<id>)는 첫 그림과 사례집 링크를 같이 보여 준다(그림은 /transform-images/packaging-cases/ 로 나간다)
  const caseById = new Map((Array.isArray(cases) ? cases : []).map((c) => [c?.id, c]));
  const caseBit = (source) => {
    const m = String(source || '').match(/^case:(.+)$/);
    if (!m) return '';
    const first = caseById.get(m[1])?.images?.[0];
    const img = first ? `<br><a href="/packaging-cases#${encodeURIComponent(m[1])}"><img loading="lazy" style="max-width:200px;border-radius:6px;border:1px solid var(--line)" src="/transform-images/packaging-cases/${escapeHtml(String(first).replace('images/packaging-cases/', ''))}" alt="${escapeHtml(m[1])}"></a>` : '';
    return `${img}<br><a href="/packaging-cases#${encodeURIComponent(m[1])}">사례집 ${escapeHtml(m[1])}</a>`;
  };
  const ul = (items) => `<ul style="margin:4px 0 0 18px;padding:0">${items.join('')}</ul>`;
  /** 칸 하나(경쟁 | 우리 | 왜 바꿨나). 제목·썸네일 칸은 "승인에 필요한 것" 안에서, 나머지는 그 아래에서 같은 함수로 그린다. */
  const rowHtml = (r) => {
    const comp = (r.competitor?.images || []).map(competitorImg).join('');
    const thumbs = r.key === 'thumbnail' ? [r.ours?.image, ...(r.ours?.images || [])].filter(Boolean) : [];
    const thumbs2 = r.key === 'thumbnail' ? (r.ours?.images2 || []).filter(Boolean) : [];
    const titleBox = r.key === 'title' && (r.ours?.titles || []).length
      ? `<div class="titles"><b>제목 후보 (고르기)</b>${r.ours.titles.map((t) => `<label><input type="checkbox" data-pick-title="${escapeHtml(t)}"${titlePicks.has(t) ? ' checked' : ''}><span>${escapeHtml(t)}${aiRec?.title === t ? ' <span class="pill-badge" style="background:rgba(245,158,11,0.22);color:#b45309;border:1px solid #f59e0b;font-weight:800;margin-left:4px">★ AI 추천</span>' : ''}</span></label>`).join('')}</div>`
      : '';
    const ours = r.key === 'thumbnail' ? '' : oursImg(r.ours?.image) + (r.ours?.images || []).map(oursImg).join('');
    // 근거 칸(왜 눌렸나 2026-11-24, 만드는 법·눈이 가는 순서·일 나누기 2026-11-25)은 접어 두고, 접힌 줄에 개수를 보여 준다.
    const clickWhy = Array.isArray(r.clickWhy) ? r.clickWhy : [];
    const craft = Array.isArray(r.craft) ? r.craft : [];
    const eyeOrder = Array.isArray(r.eyeOrder) ? r.eyeOrder : [];
    const pairing = Array.isArray(r.pairing) ? r.pairing : [];
    const evBody = (clickWhy.length ? `<div class="ev"><b>왜 눌렸나 (참고한 문구 → 누른 이유)</b>${ul(clickWhy.map((e) => `<li>“${escapeHtml(e?.sourceText)}” <span class="meta">(${escapeHtml(e?.source)})</span> → ${escapeHtml(e?.mechanism)} <span class="meta">· 적용: ${escapeHtml((e?.appliedTo || []).join(', '))}</span></li>`))}</div>` : '')
      + (craft.length ? `<div class="ev"><b>만드는 법 근거 (가져온 곳 → 가져온 것)</b>${ul(craft.map((e) => `<li><span class="meta">${escapeHtml(e?.source)}</span> → ${escapeHtml(e?.took)} <span class="meta">· 적용: ${escapeHtml((e?.appliedTo || []).join(', '))}</span>${caseBit(e?.source)}</li>`))}</div>` : '')
      + (eyeOrder.length ? `<div class="ev"><b>눈이 가는 순서 (처음 → 두 번째 / 줄인 것)</b>${ul(eyeOrder.map((e) => `<li><span class="meta">${escapeHtml(e?.candidate)}</span> ${escapeHtml(e?.first)} → ${escapeHtml(e?.second)} <span class="meta">/ 줄임: ${escapeHtml(e?.shrink)}</span></li>`))}</div>` : '')
      + (pairing.length ? `<div class="ev"><b>제목과 썸네일의 일 나누기</b>${ul(pairing.map((e) => `<li><span class="meta">${escapeHtml(e?.title)} + ${escapeHtml(e?.thumb)}</span> 썸네일: ${escapeHtml(e?.thumbDoes)} / 제목: ${escapeHtml(e?.titleDoes)}</li>`))}</div>` : '');
    const evCounts = [clickWhy.length ? `왜 눌렸나 ${clickWhy.length}개` : '', craft.length ? `만드는 법 ${craft.length}개` : '', eyeOrder.length ? `눈이 가는 순서 ${eyeOrder.length}개` : '', pairing.length ? `일 나누기 ${pairing.length}개` : ''].filter(Boolean);
    const evFold = evBody ? fold(`근거 펼치기 <span class="meta">— ${evCounts.join(' · ')}</span>`, evBody) : '';
    const label = `${escapeHtml(ROW_LABELS_VIEW[r.key] || r.key)}${r.key === 'title' && titleBox ? ' — 고르기' : ''}${r.key === 'thumbnail' && thumbs.length ? ' — 고르기' : ''}`;
    // 썸네일 칸은 우리 시안(고르기) 그림이 먼저 보이고, 200px·흑백 확인(있을 때)과 경쟁 썸네일·설명·근거가 그 아래에 온다.
    const preview200Html = r.key === 'thumbnail' && r.ours?.preview200
      ? fold('📱 200px 작은 화면 · 흑백 대비 확인', `<img loading="lazy" src="${oursUrl(r.ours.preview200)}" alt="200px 작은 화면·흑백 미리보기" style="max-width:100%;height:auto;border-radius:8px;border:1px solid var(--line);display:block">`)
      : '';
    const picksHtml = `${thumbs.length ? `${thumbs2.length ? '<div class="tl-label">1안 (처음 만든 시안, 위)</div>' : ''}${pickRow(thumbs)}` : ''}${thumbs2.length ? `<div class="tl-label">2안 (같은 칸 아래, 1안과 1:1 비교)</div>${pickRow(thumbs2)}` : ''}${preview200Html}`;
    return `<div class="sheet-label" id="row-${escapeHtml(r.key)}">${label}</div>${picksHtml}
<div class="sheet-row">
  <div class="sheet-col"><h4>경쟁</h4>${comp ? `<div class="imgs">${comp}</div>` : ''}<div>${escapeHtml(r.competitor?.text)}</div>${r.key === 'package' ? packageCompetitor(report) : ''}${r.competitor?.quote ? `<div class="q">“${escapeHtml(r.competitor.quote)}”</div>` : ''}</div>
  <div class="sheet-col ours"><h4>우리</h4>${ours ? `<div class="imgs">${ours}</div>` : ''}<div>${escapeHtml(r.ours?.text)}</div>${titleBox}${r.key === 'package' ? packageOurs(r.ours) : ''}</div>
  <div class="sheet-why">${r.origin ? `출처: <b>${{ competitor: '경쟁 구조를 가져옴', mixed: '섞음', ours: '우리가 새로 만듦' }[r.origin] || escapeHtml(r.origin)}</b> — ${escapeHtml(r.originReason || '')}<br>` : ''}왜 바꿨나: ${escapeHtml(r.why)}${evFold}</div>
</div>${r.key === 'visual' ? cutRhythm(r, report, oursUrl, ver, refReports, { isWide }) : ''}`;
  };

  // ── 승인에 필요한 것: AI 추천 → 제목 고르기 → 썸네일 고르기 → 승인 버튼 ──
  const pickRows = (sheet.rows || []).filter((r) => r.key === 'title' || r.key === 'thumbnail');
  const titleCands = pickRows.find((r) => r.key === 'title')?.ours?.titles || [];
  const thumbRowData = pickRows.find((r) => r.key === 'thumbnail');
  const thumbCands = thumbRowData ? [thumbRowData.ours?.image, ...(thumbRowData.ours?.images || []), ...(thumbRowData.ours?.images2 || [])].filter(Boolean) : [];
  toc.push({ href: '#sec-approve', label: isDraft ? '승인 준비' : '고른 제목·썸네일', cls: isDraft ? (blockerList.length ? 'stop' : 'go') : '' });
  parts.push(`<section id="sec-approve" class="approve-zone"><h2>${isDraft ? '승인에 필요한 것' : '고른 제목·썸네일'}</h2>`);
  const statusBits = [
    isDraft ? `<span>막는 문제 <b class="${blockerList.length ? 'bad' : 'ok'}">${blockerList.length}건</b></span>` : '',
    thumbCands.length ? `<span>고른 썸네일 <b id="cnt-thumb">${thumbCands.filter((x) => picks.has(x)).length}</b> / ${thumbCands.length}개</span>` : '',
    titleCands.length ? `<span>고른 제목 <b id="cnt-title">${titleCands.filter((x) => titlePicks.has(x)).length}</b> / ${titleCands.length}개</span>` : '',
    isDraft ? '<span class="meta">썸네일·제목을 고른 뒤 이 칸 맨 아래 승인 버튼을 누른다</span>' : '',
  ].filter(Boolean);
  if (statusBits.length) parts.push(`<div class="approve-status">${statusBits.join('')}</div>`);
  if (aiRec) {
    const titleChosen = Boolean(aiRec.title && titlePicks.has(aiRec.title));
    const thumbChosen = Boolean(aiRec.thumbnail && picks.has(aiRec.thumbnail));
    const bothChosen = titleChosen && thumbChosen;
    const thumbPreview = aiRec.thumbnail ? `<img src="${oursUrl(aiRec.thumbnail)}" alt="AI 추천 썸네일" style="${isWide ? 'width:192px;height:108px;object-fit:cover' : 'width:84px;height:auto'};border-radius:10px;border:2px solid #f59e0b;box-shadow:0 4px 12px rgba(0,0,0,0.22);flex-shrink:0">` : '';
    parts.push(`<div class="card" style="border-left:3px solid #f59e0b;background:linear-gradient(135deg,rgba(245,158,11,0.1),rgba(250,204,21,0.04));margin:12px 0"><div style="font-size:14.5px;font-weight:800;color:#d97706;margin-bottom:8px">🎯 AI 추천 조합 (1순위 제목 · 썸네일)</div><div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap">${thumbPreview}<div class="meta" style="color:var(--ink);line-height:1.7;flex:1;min-width:min(240px,100%)"><div><b>추천 제목:</b> ${escapeHtml(aiRec.title || '')}</div><div><b>추천 썸네일:</b> ${escapeHtml(aiRec.thumbnailLabel || aiRec.thumbnail || '')}</div><div><b>추천 이유:</b> ${escapeHtml(aiRec.reason || '')}</div>${aiRec.alternative ? `<div style="margin-top:4px;color:var(--sub)"><b>차선 조합:</b> ${escapeHtml(aiRec.alternative)}</div>` : ''}<div class="ai-rec-actions"><span id="ai-rec-status" class="meta" style="font-weight:700">현재 선택: <span class="${titleChosen ? 'ok' : 'na'}">${titleChosen ? '✓ 추천 제목 선택됨' : '추천 제목 미선택'}</span> <span class="${thumbChosen ? 'ok' : 'na'}">${thumbChosen ? '✓ 추천 썸네일 선택됨' : '추천 썸네일 미선택'}</span></span>${aiRec.title || aiRec.thumbnail ? `<button type="button" id="btn-apply-ai-rec" class="ai-pick-btn" data-rec-title="${escapeHtml(aiRec.title || '')}" data-rec-thumb="${escapeHtml(aiRec.thumbnail || '')}"${bothChosen ? ' disabled' : ''}>${bothChosen ? '✓ 추천 조합 선택 완료' : '✨ 추천 조합 한 번에 선택'}</button>` : ''}</div></div></div></div>`);
  }
  for (const r of pickRows) {
    toc.push({ href: `#row-${r.key}`, label: ROW_LABELS_VIEW[r.key] || r.key });
    parts.push(rowHtml(r));
  }
  if (isDraft) {
    const canApproveNow = blockerList.length === 0;
    const approveNote = canApproveNow
      ? '필수 항목을 모두 통과했습니다. 제목과 썸네일을 고른 뒤 승인할 수 있습니다.'
      : `필수 보완 항목 ${blockerList.length}건을 해결해야 승인할 수 있습니다.`;
    toc.push({ href: '#sheet-approve-bar', label: '✅ 승인 버튼', cls: canApproveNow ? 'go' : 'stop' });
    parts.push(`<div class="card" id="sheet-approve-bar" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;border-left:3px solid ${canApproveNow ? 'var(--ok)' : 'var(--bad)'};background:${canApproveNow ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)'};margin:12px 0"><div><div style="font-size:14.5px;font-weight:800;color:${canApproveNow ? 'var(--ok)' : 'var(--bad)'}">🔒 비교 시트 승인 관문</div><div class="meta" id="sheet-approve-msg" style="margin-top:4px;color:var(--ink)">${escapeHtml(approveNote)}</div></div><button type="button" id="btn-approve-sheet" class="ai-pick-btn" style="background:${canApproveNow ? 'var(--ok)' : 'rgba(148,163,184,0.25)'};color:${canApproveNow ? '#06281e' : 'var(--sub)'};border:none;padding:9px 16px;font-weight:800;border-radius:8px;cursor:${canApproveNow ? 'pointer' : 'not-allowed'}"${canApproveNow ? '' : ' disabled'}>${canApproveNow ? '✅ 이 비교 시트 승인하기' : '🔒 필수 항목 해결 후 승인 가능'}</button></div>`);
  }
  parts.push('</section>');

  // ── 이번에 시험하는 것과 기록 카드(짧아서 펼쳐 둔다) ──
  if ((sheet.testVariables || []).length) {
    toc.push({ href: '#sec-tests', label: '시험 변수' });
    parts.push('<h2 id="sec-tests">이번에 시험하는 변수</h2>');
    for (const v of sheet.testVariables) parts.push(`<div class="card" style="border-left:3px solid var(--accent);background:linear-gradient(135deg,rgba(56,189,248,0.06),rgba(168,85,247,0.06))"><div style="font-size:14.5px"><b>🧪 ${escapeHtml(v.variable)}</b> · <span class="pill-badge">보는 지표: ${escapeHtml(v.measure)}</span></div><div class="q" style="margin-top:8px"><b>왜 이렇게 될 것 같은가(가설)</b>: ${escapeHtml(v.hypothesis)}</div></div>`);
  }
  if (sheet.trendRef && typeof sheet.trendRef === 'object') {
    const tr = sheet.trendRef;
    const shiftHtml = tr.scheduleShift?.requested
      ? `<div style="margin-top:6px;padding:6px 10px;border-radius:8px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.35)"><b>📅 예약 순서 조정 요청:</b> ${escapeHtml(tr.scheduleShift.reason || '')}${Array.isArray(tr.scheduleShift.pushedBack) && tr.scheduleShift.pushedBack.length ? ` (뒤로 밀리는 예약편: ${escapeHtml(tr.scheduleShift.pushedBack.join(', '))})` : ''}</div>`
      : '';
    parts.push(`<div class="card" style="border-left:3px solid #a855f7;background:linear-gradient(135deg,rgba(168,85,247,0.08),rgba(56,189,248,0.04));margin:12px 0"><div style="font-size:14.5px;font-weight:800;color:#a855f7;margin-bottom:6px">📡 트렌드 검토 기록 · <span class="pill-badge">${tr.used ? '화제 활용' : '화제 미활용'}</span></div><div class="meta" style="color:var(--ink);line-height:1.7">${tr.used ? `<div><b>화제:</b> ${escapeHtml(tr.topic || '')} (${escapeHtml(tr.source || '')} · ${escapeHtml(tr.sourceDate || '')})</div><div><b>3060 영어 녹인 방식:</b> ${escapeHtml(tr.howIntegrated || '')}</div>` : ''}<div><b>이유:</b> ${escapeHtml(tr.reason || '')}</div>${shiftHtml}</div></div>`);
  }
  if (sheet.clipRights && typeof sheet.clipRights === 'object') {
    const cr = sheet.clipRights;
    const pathLabels = {shorts_remix: '쇼츠 리믹스', cc_by: '공식 원작자 CC BY', official_guideline: '공식 2차 창작 가이드라인', written_permission: '서면 허락', legal_citation: '법적 인용 예외 검토'};
    const clipsHtml = cr.usesExternalClip
      ? (cr.clips || []).map((c, idx) => `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)"><b>클립 #${idx + 1} (${escapeHtml(pathLabels[c.pathway] || c.pathway || '미지정')})</b> · 구간 ${escapeHtml(c.segment || '미상')} · <span style="word-break:break-all">${escapeHtml(c.sourceUrl || '')}</span><div><b>범위/변형:</b> ${escapeHtml(c.scope || '')} / ${escapeHtml(c.transformBasis || '')}</div>${c.permissionEmail ? `<div><b>허락 메일:</b> ${escapeHtml(c.permissionEmail.status || '')}${c.permissionEmail.threadId ? ` (스레드 ${escapeHtml(c.permissionEmail.threadId)})` : ''}</div>` : ''}</div>`).join('')
      : '<div>외부 원본 클립 미사용 — 자체 비주얼·음성 제작 (권리·재사용 심사 리스크 없음)</div>';
    parts.push(`<div class="card" style="border-left:3px solid #10b981;background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(56,189,248,0.04));margin:12px 0"><div style="font-size:14.5px;font-weight:800;color:#10b981;margin-bottom:6px">🛡️ 원본 클립 권리 기록 · <span class="pill-badge">${cr.usesExternalClip ? `외부 클립 ${(cr.clips || []).length}건` : '자체 제작'}</span></div><div class="meta" style="color:var(--ink);line-height:1.7">${clipsHtml}</div></div>`);
  }

  // ── 나머지 칸 비교(첫 15초·전개·화면 연출·반응·끝맺음·설명글) ──
  const restRows = (sheet.rows || []).filter((r) => r.key !== 'title' && r.key !== 'thumbnail');
  if (restRows.length) {
    parts.push('<h2 id="sec-rows">영상 내용 — 경쟁과 우리 비교</h2>');
    for (const r of restRows) {
      toc.push({ href: `#row-${r.key}`, label: TOC_SHORT[r.key] || ROW_LABELS_VIEW[r.key] || r.key });
      if (r.key === 'visual' && r.ours?.cutPlan) toc.push({ href: '#sec-cuts', label: '컷 리듬' });
      parts.push(rowHtml(r));
    }
  }

  // ── 대표님 1:1 발음 과외방 (개인 학습 전용 · 기존 승인/제작과 분리, 2026-11-26) ──
  toc.push({ href: '#sec-study-room', label: '🎓 1:1 과외방' });
  parts.push(renderCreatorStudySection(sheet, study, reviewItems));

  // ── 근거 자료: 전부 접어 두고 접힌 줄에 개수를 보여 준다 ──
  const evidence = [];
  if (sheet.selfCritique && typeof sheet.selfCritique === 'object') {
    const sc = sheet.selfCritique;
    evidence.push(fold('🧠 AI 자체 비평 (제출 전 슬로건 검수) <span class="meta">— 템플릿 탈피 · 직전 편 대비 진화 · 명작 융합 3가지</span>', `<div class="meta" style="color:var(--ink);line-height:1.7"><div><b>① 템플릿 탈피:</b> ${escapeHtml(sc.antiTemplate || '')}</div><div><b>② 직전 편 대비 진화:</b> ${escapeHtml(sc.evolutionFromPrev || '')}</div><div><b>③ 명작 융합 검증:</b> ${escapeHtml(sc.fusionCheck || '')}</div></div>`, { id: 'sec-critique' }));
  }
  if (Array.isArray(sheet.references) && sheet.references.length) {
    const cards = sheet.references.map((ref) => {
      const rr = refById.get(ref.videoId);
      const refWide = rr?.isLongform != null ? Boolean(rr.isLongform) : isWide;
      const refThumb = rr?.thumbnail
        ? `<a href="/outlier-report/${encodeURIComponent(ref.videoId)}"><img class="ref-thumb${refWide ? ' wide' : ''}" loading="lazy" src="${escapeHtml(rr.thumbnail)}" alt="${escapeHtml(rr.label || ref.videoId)}"></a>`
        : '';
      const refMetaBadges = rr
        ? `<div class="meta" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:4px"><span>${escapeHtml(rr.label || '')}</span>${rr.ratioLabel ? ` · <span style="color:var(--accent-amber);font-weight:700">평소의 ${escapeHtml(rr.ratioLabel)}</span>` : ''}${rr.studioFolds != null ? ` · <span class="pill-badge" style="background:rgba(139,92,246,0.14);color:var(--accent-purple);border-color:rgba(139,92,246,0.4);font-weight:700">유튜브 조사 ${Number(rr.studioFolds)}배</span>` : ''}</div>`
        : '';
      return `<div class="card" style="border-left:3px solid #00D2D3;background:rgba(0,210,211,0.04)"><div class="ref-card-wrap">${refThumb}<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><b><span class="pill-badge" style="margin-right:6px">${escapeHtml(ref.role || '참고')}</span> ${escapeHtml(ref.what)}</b> <a class="pill-badge" href="/outlier-report/${encodeURIComponent(ref.videoId)}">출처: ${escapeHtml(ref.videoId)} ↗</a></div>${refMetaBadges}<div style="margin-top:8px"><b>채택·융합 이유</b>: ${escapeHtml(ref.reason)}</div><div class="q">근거: ${escapeHtml(ref.evidence)}</div>${(ref.appliedTo || []).length ? `<div class="q" style="border-left-color:#00D2D3"><b>적용한 곳</b>: ${ref.appliedTo.map((x) => escapeHtml(x)).join(' · ')}</div>` : ''}${evidenceHtml(ref)}</div></div></div>`;
    });
    const applied = sheet.references.reduce((a, x) => a + (x.appliedTo || []).length, 0);
    evidence.push(fold(`🎬 융합한 명작 레퍼런스 (다중 벤치마킹) <span class="meta">— ${sheet.references.length}편 · 적용한 곳 ${applied}군데</span>`, cards.join(''), { id: 'sec-refs' }));
  }
  if ((sheet.borrowed || []).length || (sheet.sourceApplied || []).length) {
    const cards = [
      ...(sheet.borrowed || []).map((b) => `<div class="card" style="border-left:3px solid var(--ok);background:rgba(52,211,153,0.03)"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><b><span style="color:var(--ok)">✓</span> ${escapeHtml(b.what)}</b> <a class="pill-badge" href="/outlier-report/${encodeURIComponent(b.fromVideoId)}">출처: ${escapeHtml(b.fromVideoId)} ↗</a></div><div style="margin-top:8px"><b>가져와도 되는 이유</b>: ${escapeHtml(b.reason)}</div><div class="q">근거: ${escapeHtml(b.evidence)}</div>${(b.appliedTo || []).length ? `<div class="q" style="border-left-color:var(--ok)"><b>적용한 곳</b>: ${b.appliedTo.map((x) => escapeHtml(x)).join(' · ')}</div>` : ''}${evidenceHtml(b)}</div>`),
      ...(sheet.sourceApplied || []).map((b) => `<div class="card" style="border-left:3px solid var(--ok);background:rgba(52,211,153,0.03)"><b><span style="color:var(--ok)">✓</span> 원본에서 가져온 것: ${escapeHtml(b.what)}</b><div style="margin-top:8px"><b>가져온 이유</b>: ${escapeHtml(b.reason)}</div><div class="q" style="border-left-color:var(--ok)"><b>적용한 곳</b>: ${(b.appliedTo || []).map((x) => escapeHtml(x)).join(' · ')}</div></div>`),
    ];
    evidence.push(fold(`다른 경쟁 영상에서 가져온 것 <span class="meta">— ${cards.length}개</span>`, cards.join(''), { id: 'sec-borrowed' }));
  }
  const rejected = sheet.rejected || [];
  evidence.push(fold(`안 맞아서 뺀 것 <span class="meta">— ${rejected.length ? `${rejected.length}개` : '없음'}</span>`, rejected.length ? rejected.map((r) => `<div class="card" style="border-left:3px solid var(--bad);background:rgba(248,113,113,0.03)"><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px"><b><span style="color:var(--bad)">✗</span> ${escapeHtml(r.what)}</b> <a class="pill-badge" href="/outlier-report/${encodeURIComponent(r.fromVideoId)}">출처: ${escapeHtml(r.fromVideoId)} ↗</a></div><div style="margin-top:8px"><b>뺀 이유</b>: ${escapeHtml(r.reason)}</div></div>`).join('') : '<p class="meta">없음</p>', { id: 'sec-rejected' }));
  if (Array.isArray(sheet.glossary) && sheet.glossary.length) {
    evidence.push(fold(`용어 풀이 (경쟁 영상의 전문용어 → 쉬운 말) <span class="meta">— ${sheet.glossary.length}개</span>`, sheet.glossary.map((g) => `<div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap"><b style="color:var(--bad)">${escapeHtml(g.term)}</b> <span style="color:var(--sub)">➔</span> <b style="color:var(--ok)">${escapeHtml(g.plain)}</b></div>`).join(''), { id: 'sec-glossary' }));
  }
  if (sheet.pending?.length) {
    evidence.push(fold(`대본 전에 확인할 것 <span class="meta">— ${sheet.pending.length}개</span>`, sheet.pending.map((t) => `<div class="card" style="border-left:3px solid var(--accent-amber);background:rgba(245,158,11,0.04)">${escapeHtml(t)}</div>`).join(''), { id: 'sec-pending' }));
  }
  toc.push({ href: '#sec-evidence', label: '근거 자료' });
  parts.push(`<h2 id="sec-evidence">근거 자료 <span class="meta" style="font-weight:600">— 눌러서 펼친다</span></h2>${evidence.join('')}`);
  parts.push(`<script>(function(){
  var sid=${JSON.stringify(sid)};
  function syncCounts(){
    var ct=document.getElementById('cnt-title');
    if(ct)ct.textContent=String(document.querySelectorAll('input[data-pick-title]:checked').length);
    var ch=document.getElementById('cnt-thumb');
    if(ch)ch.textContent=String(document.querySelectorAll('input[data-pick]:checked').length);
  }
  function openTarget(){
    var id=location.hash.slice(1);
    var el=id?document.getElementById(id):null;
    if(el&&el.tagName==='DETAILS')el.open=true;
  }
  window.addEventListener('hashchange',openTarget);
  openTarget();
  function syncAiRecUi(){
    syncCounts();
    var btn=document.getElementById('btn-apply-ai-rec');
    var st=document.getElementById('ai-rec-status');
    if(!btn&&!st)return;
    var rt=btn?btn.dataset.recTitle:'';
    var rh=btn?btn.dataset.recThumb:'';
    var tEl=rt?Array.prototype.find.call(document.querySelectorAll('input[data-pick-title]'),function(el){return el.dataset.pickTitle===rt;}):null;
    var hEl=rh?Array.prototype.find.call(document.querySelectorAll('input[data-pick]'),function(el){return el.dataset.pick===rh;}):null;
    var tOk=Boolean(tEl&&tEl.checked);
    var hOk=Boolean(hEl&&hEl.checked);
    if(st){
      st.innerHTML='현재 선택: <span class="'+(tOk?'ok':'na')+'">'+(tOk?'✓ 추천 제목 선택됨':'추천 제목 미선택')+'</span> <span class="'+(hOk?'ok':'na')+'">'+(hOk?'✓ 추천 썸네일 선택됨':'추천 썸네일 미선택')+'</span>';
    }
    if(btn){
      var both=tOk&&hOk;
      btn.disabled=both;
      btn.textContent=both?'✓ 추천 조합 선택 완료':'✨ 추천 조합 한 번에 선택';
    }
  }
  function postPick(kind,val,picked){
    return fetch('/api/transform-sheet-pick',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoId:sid,kind:kind,image:val,picked:picked})});
  }
  document.addEventListener('change',function(e){
    var t=e.target;
    if(!t||!t.dataset||(!t.dataset.pick&&!t.dataset.pickTitle))return;
    postPick(t.dataset.pickTitle?'title':'thumbnail',t.dataset.pick||t.dataset.pickTitle,t.checked).then(function(r){
      if(!r.ok){t.checked=!t.checked;alert('저장하지 못했습니다');}
      syncAiRecUi();
    }).catch(function(){t.checked=!t.checked;alert('저장하지 못했습니다');syncAiRecUi();});
  });
  var recBtn=document.getElementById('btn-apply-ai-rec');
  if(recBtn){
    recBtn.addEventListener('click',function(){
      var rt=recBtn.dataset.recTitle;
      var rh=recBtn.dataset.recThumb;
      var ops=[];
      var tEl=rt?Array.prototype.find.call(document.querySelectorAll('input[data-pick-title]'),function(el){return el.dataset.pickTitle===rt;}):null;
      var hEl=rh?Array.prototype.find.call(document.querySelectorAll('input[data-pick]'),function(el){return el.dataset.pick===rh;}):null;
      if(tEl&&!tEl.checked) ops.push({kind:'title',val:rt,el:tEl});
      if(hEl&&!hEl.checked) ops.push({kind:'thumbnail',val:rh,el:hEl});
      if(!ops.length){syncAiRecUi();return;}
      recBtn.disabled=true;
      recBtn.textContent='⏳ 저장 중...';
      Promise.all(ops.map(function(op){
        return postPick(op.kind,op.val,true).then(function(r){if(!r.ok)throw new Error('fail');op.el.checked=true;});
      })).then(function(){syncAiRecUi();}).catch(function(){alert('추천 조합 저장 중 오류가 발생했습니다');syncAiRecUi();});
    });
  }
  var approveBtn=document.getElementById('btn-approve-sheet');
  if(approveBtn){
    approveBtn.addEventListener('click',function(){
      if(approveBtn.disabled)return;
      if(!confirm('이 비교 시트를 승인(approved) 상태로 확정할까요?'))return;
      approveBtn.disabled=true;
      approveBtn.textContent='⏳ 승인 확인 중...';
      fetch('/api/transform-sheet-approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoId:sid})})
        .then(function(r){return r.json().then(function(d){return {ok:r.ok,data:d};});})
        .then(function(res){
          if(!res.ok){
            var lines=(res.data&&res.data.blockers&&res.data.blockers.length)?'\\n- '+res.data.blockers.join('\\n- '):'';
            alert((res.data&&res.data.error||'승인할 수 없습니다')+lines);
            approveBtn.disabled=false;
            approveBtn.textContent='✅ 이 비교 시트 승인하기';
            return;
          }
          location.reload();
        })
        .catch(function(){
          alert('승인 요청 중 오류가 발생했습니다');
          approveBtn.disabled=false;
          approveBtn.textContent='✅ 이 비교 시트 승인하기';
        });
    });
  }
})();</script>`);
  if ((sheet.results || []).length) {
    toc.push({ href: '#sec-results', label: '결과 기록' });
    parts.push('<h2 id="sec-results">결과 기록 (공개 7일 뒤 자동)</h2>');
    for (const r of sheet.results) parts.push(`<div class="card"><b>${escapeHtml(r.videoId)}</b> · ${escapeHtml(r.summary)}</div>`);
  }
  if (sheet.outcome) {
    toc.push({ href: '#sec-outcome', label: '성적' });
    parts.push(`<h2 id="sec-outcome">성적 (공개 7일 정산)</h2>${renderOutcomeCard(sheet.outcome)}`);
  }
  // 구간 목차: 화면 위에 붙어 있어서 어디서든 원하는 칸으로 바로 간다. 접힌 칸으로 가면 펼쳐 준다(openTarget).
  parts[tocAt] = `<nav class="toc" aria-label="구간 바로 가기">${toc.map((t) => `<a href="${t.href}"${t.cls ? ` class="${t.cls}"` : ''}>${escapeHtml(t.label)}</a>`).join('')}</nav>`;
  return page(`비교 시트 ${sheet.topic}`, parts.join('\n'));
}

const TOC_SHORT = { opening: '첫 15초', flow: '전개', visual: '화면 연출', reaction: '반응 지점', ending: '끝맺음', package: '설명글·태그·댓글' };
const ROW_LABELS_VIEW ={ title: '제목', thumbnail: '썸네일', opening: '첫 15초', flow: '전개', visual: '화면 연출', reaction: '시청자 반응 지점', ending: '끝맺음', package: '설명글·태그·고정 댓글' };

export function renderTransformSheetIndex(items = []) {
  const sorted = [...items].sort((a, b) => String(b.sheet?.createdAt || '').localeCompare(String(a.sheet?.createdAt || '')));
  const pickCover = (sheet) => {
    const thumbRow = (sheet.rows || []).find((r) => r.key === 'thumbnail')?.ours || {};
    return (sheet.thumbnailPicks || [])[0]
      || sheet.aiRecommendation?.thumbnail
      || thumbRow.image
      || (thumbRow.images || [])[0]
      || '';
  };
  const cards = sorted.map(({ sheet, report }) => {
    const sid = sheet.episodeId || sheet.sourceVideoId;
    const encSid = encodeURIComponent(sid);
    const stage = sheet.status === 'published' && sheet.outcome?.views7d != null ? 'measured' : sheet.status;
    const cover = pickCover(sheet);
    const coverSrc = cover ? `/transform-images/${encSid}/${escapeHtml(String(cover).replace(/^images\/[^/]+\//, ''))}` : '';
    const isWide = sheet.format === 'LONGFORM';
    const thumbHtml = coverSrc
      ? `<a href="/transform-sheet/${encSid}"><img class="sheet-idx-thumb${isWide ? ' wide' : ''}" loading="lazy" src="${coverSrc}" alt="${escapeHtml(sheet.topic)}"></a>`
      : `<div class="sheet-idx-thumb${isWide ? ' wide' : ''} placeholder">시안 없음</div>`;
    const tPicks = (sheet.titlePicks || []).length;
    const hPicks = (sheet.thumbnailPicks || []).length;
    const pickSummary = (tPicks || hPicks)
      ? `<span class="ok">✓ 제목 ${tPicks} · 썸네일 ${hPicks} 선택</span>`
      : (sheet.aiRecommendation ? `<span class="pill-badge" style="background:rgba(245,158,11,0.16);color:var(--accent-amber);border-color:rgba(245,158,11,0.4)">🎯 AI 추천 있음</span>` : '');
    const outcomeBadge = sheet.outcome?.views7d != null
      ? `<span class="pill-badge" style="background:var(--ok-bg);color:var(--ok);border-color:rgba(52,211,153,0.35)">7일 조회 ${num(sheet.outcome.views7d)}회${sheet.outcome.stayedToWatch != null ? ` · 계속 시청 ${Number(sheet.outcome.stayedToWatch).toFixed(1)}%` : ''}</span>`
      : '';
    return `<div class="card sheet-idx-card"><div class="sheet-idx-left">${thumbHtml}<div style="min-width:0;flex:1"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px"><span class="pill-badge">${escapeHtml(STAGE_KO[stage] || stage)}</span><span class="pill-badge" style="background:rgba(255,255,255,0.05);color:var(--sub);border-color:var(--line)">${escapeHtml(sheet.format)}</span>${sheet.createdAt ? `<span class="meta">${escapeHtml(sheet.createdAt)}</span>` : ''}${pickSummary}${outcomeBadge}</div><a href="/transform-sheet/${encSid}" style="display:block"><b style="font-size:16px">${escapeHtml(sheet.topic)}</b></a><div class="meta" style="margin-top:4px">${report?.meta?.title ? `기준: ${escapeHtml(report.meta.title)}` : (sheet.references?.length ? `다중 명작 ${sheet.references.length}편 융합` : escapeHtml(sid))}${sheet.references?.length && report?.meta?.title ? ` · 명작 ${sheet.references.length}편 융합` : ''}</div></div></div></div>`;
  });
  return page('비교 시트', `${SHEET_CSS}<p><a href="/">← 대시보드</a> · <a href="/outlier-reports">근거(경쟁 영상 리포트 목록)</a> · <a href="/packaging-cases">썸네일·제목 사례집</a></p><h1>비교 시트 ${sorted.length}장</h1><p class="meta">경쟁 영상 리포트를 우리 콘텐츠로 바꾼 한 장. 좌우로 비교하고, 다른 경쟁 영상에서 가져온 것과 뺀 것을 이유와 함께 남긴다. 실패·기각도 데이터로 쌓는다.</p>${cards.join('\n') || '<p class="meta">아직 없음</p>'}`);
}

/** 썸네일·문구·제목 사례집 화면(2026-11-25). 읽기 전용. 활성 사례 전부 → 보관 사례. 글자는 전부 escapeHtml을 거친다. */
const CASE_IMG = (rel) => `/transform-images/packaging-cases/${escapeHtml(String(rel).replace('images/packaging-cases/', ''))}`;
export function renderPackagingCasesPage(lib, { recentIds = new Set() } = {}) {
  const cases = Array.isArray(lib?.cases) ? lib.cases : [];
  const active = cases.filter((c) => c.status !== 'archived');
  const archived = cases.filter((c) => c.status === 'archived');
  const row = (label, value) => `<tr><th style="width:150px;white-space:nowrap">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`;
  const card = (c) => {
    const a = c.analysis || {};
    const nm = c.numbers || {};
    const imgs = [...(c.images || []).map((p) => ({ p, cap: '썸네일' })), ...(c.contrast?.image ? [{ p: c.contrast.image, cap: '같은 채널 평소(대조)' }] : [])];
    const imgHtml = imgs.map(({ p, cap }) => `<figure style="margin:0"><img loading="lazy" style="max-width:320px;max-height:240px;border-radius:8px;border:1px solid var(--line)" src="${CASE_IMG(p)}" alt="${escapeHtml(c.id)}"><figcaption class="meta">${escapeHtml(cap)}</figcaption></figure>`).join('');
    const x = nm.xMedian != null ? `배수 x${escapeHtml(Number(nm.xMedian).toFixed(1))}` : '배수 측정 전';
    const tags = Object.entries(TAG_LABELS).map(([f, ko]) => `${ko}: ${(c.tags?.[f] || []).join(', ')}`).join(' / ');
    const rows = [
      row('제목', c.title), row('썸네일 글자', c.thumbText),
      ...(c.variants ? [row('기본 등록본과 다른 점', c.variants)] : []),
      row('숫자', `조회수 ${num(nm.views)} · 구독자 ${num(nm.subs)} · 채널 중앙값 ${num(nm.channelMedian)} · ${nm.xMedian != null ? `x${Number(nm.xMedian).toFixed(1)}` : '배수 측정 전'} · 확인일 ${nm.checkedAt || ''}${nm.note ? ` · ${nm.note}` : ''}`),
      row('누구 덕', `${CREDIT_KO[c.credit] || c.credit} — ${c.creditWhy || ''}`),
      ...Object.entries(ANALYSIS_LABELS).slice(0, 3).map(([f, ko]) => row(ko, a[f])),
      ...(a.eyeOrder ? [row('눈이 가는 순서', Object.entries(EYE_LABELS).map(([f, ko]) => `${ko}: ${a.eyeOrder[f] ?? ''}`).join(' / '))] : []),
      ...Object.entries(ANALYSIS_LABELS).slice(3).map(([f, ko]) => row(ko, a[f])),
      row('우리에게 옮길 원리', c.transfer), row('옮기지 못하는 것', c.notTransferable),
      row('만들 때 볼 자료', (c.makeWith || []).join(', ')), row('태그', tags),
      ...(c.contrast ? [row('대조(같은 채널 평소)', `${c.contrast.title} · 조회수 ${num(c.contrast.views)} · ${c.contrast.xMedian != null ? `x${Number(c.contrast.xMedian).toFixed(1)}` : '배수 측정 전'} · 다른 점: ${c.contrast.diff}`)] : []),
      ...(c.usedIn?.length ? [row('쓴 곳', c.usedIn.map((u) => `${u.episodeId}(${u.appliedTo})`).join(', '))] : []),
    ];
    return `<div class="card" id="${escapeHtml(c.id)}"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b style="font-size:16px">${escapeHtml(c.id)}</b><span class="meta">${escapeHtml(c.genre)} · ${escapeHtml(c.format)} · ${escapeHtml(c.channel)} · ${x}</span>${recentIds.has?.(c.id) ? '<span class="ok">최근 시트에 사용</span>' : ''}</div><div style="display:flex;gap:12px;flex-wrap:wrap;margin:10px 0">${imgHtml}</div><table>${rows.join('')}</table><div class="meta">넣은 사람·날짜: ${escapeHtml(c.addedBy)}, ${escapeHtml(c.addedAt)} · 출처: ${escapeHtml(c.source)} · 영상 ID: ${escapeHtml(c.videoId)}</div></div>`;
  };
  return page('썸네일·제목 사례집', `<p><a href="/">← 대시보드</a> · <a href="/transform-sheets">비교 시트</a></p><h1>썸네일·제목 사례집 (활성 ${active.length}개, 보관 ${archived.length}개)</h1><p class="meta">여러 분야에서 잘된 썸네일·문구·제목을 분석해 쌓은 곳. 비교 시트는 여기서 고른 사례를 만드는 법 근거(case:…)로 든다. 읽기 전용.</p>${active.map(card).join('') || '<p class="meta">아직 없음</p>'}${archived.length ? `<h2>보관한 사례</h2>${archived.map(card).join('')}` : ''}`);
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
      ? `<span class="pill-badge" style="background:rgba(139,92,246,0.14);color:var(--accent-purple);border-color:rgba(139,92,246,0.45);font-weight:700">📡 스튜디오 조사${r.studioFolds != null ? ` ${Number(r.studioFolds)}배` : ''}</span>`
      : (r.studioFolds != null ? `<span class="pill-badge" style="background:rgba(139,92,246,0.14);color:var(--accent-purple);border-color:rgba(139,92,246,0.4);font-weight:700">유튜브 조사 ${Number(r.studioFolds)}배</span>` : '');
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
