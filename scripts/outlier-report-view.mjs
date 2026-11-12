// 합친 아웃라이어 리포트를 사람이 보는 화면(HTML)으로 그린다(2026-11-12).
// 대시보드 서버가 /outlier-reports, /outlier-report/<영상ID> 로 보여 준다. 읽기 전용.
// 댓글·자막·제목은 외부에서 온 글자라서 전부 escapeHtml을 거친다(시험이 확인).

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const mmss = (sec) => {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const num = (n) => (n == null ? '측정 전' : Number(n).toLocaleString('ko-KR'));

const STYLE = `
:root{--bg:#f7f7f5;--card:#fff;--ink:#1d1d1f;--sub:#5f6368;--line:#e3e3e0;--ok:#127a3a;--bad:#b42318;--na:#8a8a8a;--accent:#b8860b}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--card:#1e1e1e;--ink:#ececec;--sub:#a5a5a5;--line:#333;--ok:#4cc27a;--bad:#ff7a6e;--na:#888;--accent:#f5c518}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 system-ui,-apple-system,"Noto Sans KR",sans-serif}
main{max-width:980px;margin:0 auto;padding:16px}a{color:var(--accent)}
h1{font-size:20px;margin:8px 0}h2{font-size:17px;margin:28px 0 8px;border-bottom:1px solid var(--line);padding-bottom:4px}
.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin:8px 0}
.meta{color:var(--sub);font-size:13px}.q{color:var(--sub);font-size:13px;margin-top:4px}
.ok{color:var(--ok)}.bad{color:var(--bad)}.na{color:var(--na)}
.moment{display:grid;grid-template-columns:minmax(0,1fr);gap:6px}.moment img{width:auto;max-width:100%;height:auto;border-radius:6px;border:1px solid var(--line)}
.t{font-weight:700;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;font-size:14px;display:block;overflow-x:auto}code{font-size:13px;background:var(--line);padding:1px 4px;border-radius:4px}td,th{border-bottom:1px solid var(--line);padding:6px 4px;text-align:left;vertical-align:top}
.thumb{max-width:360px;width:100%;border-radius:8px}
.list a{display:grid;grid-template-columns:160px minmax(0,1fr);gap:12px;text-decoration:none;color:inherit}
.list img{width:160px;border-radius:6px}
@media (max-width:600px){.list a{grid-template-columns:96px minmax(0,1fr)}.list img{width:96px}}
`;

const badge = (flag) => (flag === true ? '<span class="ok">✓ 원문 확인</span>'
  : flag === false ? '<span class="bad">✗ 원문에 없음</span>'
    : '<span class="na">– 대조할 원문 없음</span>');
const quote = (text, flag) => (String(text ?? '').trim() ? `<div class="q">“${escapeHtml(text)}” ${badge(flag)}</div>` : '');

const page = (title, body, {refreshSeconds = 0} = {}) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${refreshSeconds ? `<meta http-equiv="refresh" content="${Number(refreshSeconds)}">` : ''}<title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;

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

export function renderReportPage(report, {framesPending = 0, hasSheet = false} = {}) {
  const a = report.analysis || {};
  const m = report.meta || {};
  const id = escapeHtml(report.videoId);
  const yt = (t) => `https://www.youtube.com/watch?v=${encodeURIComponent(report.videoId)}&t=${Math.floor(Number(t) || 0)}s`;
  const frameByT = new Map((report.frames || []).map((f) => [f.t, f.file]));
  const parts = [];
  parts.push(`<p><a href="/outlier-reports">← 리포트 목록</a> · <a href="/visual-library">연출 자료집</a> · <a href="/">대시보드</a></p>`);
  parts.push(`<h1>${escapeHtml(m.title)}</h1>`);
  parts.push(`<div class="meta">${escapeHtml(m.channelTitle)} · 구독자 ${num(report.subscriberCount)} · 조회수 ${num(m.viewCount)} · 구독자 대비 ${report.viewsPerSubscriber ?? '측정 전'}배 · 채널 평소 대비 ${report.outlierRatio == null ? '측정 전' : `${Math.round(report.outlierRatio * 10) / 10}배`} · 길이 ${m.durationSeconds ?? '?'}초</div>`);
  const src = report.sources || {};
  parts.push(`<div class="meta">분석 ${escapeHtml(String(report.analyzedAt || '').slice(0, 10))} · ${escapeHtml(report.model || '')} · 화면은 처음 ${report.windowSeconds}초 · 자막 ${src.transcript?.ok ? '있음' : `없음(${escapeHtml(src.transcript?.error || '')})`} · 댓글 ${src.comments?.count ?? 0}개 · 인용 확인 ${report.quoteCheck?.verified ?? 0}/${report.quoteCheck?.checked ?? 0}</div>`);
  parts.push(`<p><a href="https://www.youtube.com/watch?v=${encodeURIComponent(report.videoId)}" target="_blank" rel="noopener">유튜브에서 보기</a></p>`);
  if (hasSheet) parts.push(`<div class="card">📝 <a href="/transform-sheet/${id}"><b>이 영상을 우리 콘텐츠로 바꾼 변형 시트 보기</b></a> — 경쟁과 우리를 좌우로 비교하고, 바꾼 이유와 다른 영상에서 가져온 것을 적어 두었다.</div>`);
  if (framesPending > 0) parts.push(`<div class="card"><b>캡처 ${Number(framesPending)}장을 이 PC에서 만드는 중입니다.</b> 캡처는 깃에 올리지 않아 PC마다 처음 한 번 만듭니다(1편에 30초~2분). 이 화면은 25초마다 스스로 새로고침합니다.</div>`);

  const c = a.click || {};
  parts.push('<h2>1. 클릭 — 제목과 썸네일</h2><div class="card">');
  if (m.thumbnail) parts.push(`<img class="thumb" src="${escapeHtml(m.thumbnail)}" alt="썸네일">`);
  parts.push(`<p><b>제목</b>: ${escapeHtml(c.titleDevice)}</p>${quote(c.titleQuote, c.titleQuoteVerified)}`);
  parts.push(`<p><b>썸네일 글자</b>: ${escapeHtml(c.thumbnailText || '없음')} (${escapeHtml(c.thumbnailWordCount ?? '?')}단어)</p><p><b>썸네일 모습</b>: ${escapeHtml(c.thumbnailVisual)}</p><p><b>제목과 관계</b>: ${escapeHtml(c.thumbnailVsTitle)}</p></div>`);

  const o = a.opening || {};
  parts.push(`<h2>2. 첫 15초</h2><div class="card"><p>${escapeHtml(o.first15s)}</p>${quote(o.quote, o.quoteVerified)}<p><b>계속 볼 이유</b>: ${escapeHtml(o.reasonToKeepWatching)}</p></div>`);

  const p = report.pacing || {};
  parts.push(`<h2>3. 화면 연출</h2><p class="meta">처음 ${report.windowSeconds}초 동안 장면 전환 ${p.count ?? 0}번 · 1분에 ${p.perMinute ?? 0}번 · 전환 사이 간격 중앙값 ${p.medianGapSeconds == null ? '측정 전' : `${p.medianGapSeconds}초`} (출처: ${escapeHtml(p.source || '코드 계산')}). 아래는 AI가 적은 화면 변화 ${(a.visualMoments || []).length}개다. 캡처는 그 시각부터 1초 간격 3장이고, AI가 말한 시각은 몇 초 어긋날 수 있다.${report.framesError ? ` 캡처 실패: ${escapeHtml(report.framesError)}` : ''}</p>`);
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
  return page(m.title || report.videoId, parts.join('\n'), {refreshSeconds: framesPending > 0 ? 25 : 0});
}

/**
 * 연출 자료집 페이지(2026-11-12): 모든 리포트의 화면 변화를 캡처 띠와 함께 평소 대비 배수 큰 순으로 깐다.
 * 대시보드 탭은 6개로 두기로 한 결정(2026-11-11)이 있어 탭이 아니라 따로 열리는 페이지로 만들었다.
 * 검색은 주소의 ?q= 로 서버가 거른다(화면 스크립트 없음).
 */
export function renderVisualLibraryPage(entries = [], {query = '', reports = 0, pendingReports = 0} = {}) {
  const words = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = entries.filter((e) => {
    const hay = `${e.what || ''} ${e.purpose || ''} ${e.title || ''}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const tiles = shown.slice(0, 150).map((e) => {
    const img = !e.frame ? ''
      : e.frameReady ? `<a href="/outlier-report/${encodeURIComponent(e.videoId)}"><img loading="lazy" src="/${escapeHtml(e.frame.replace('data/youtube/', ''))}" alt="${mmss(e.t)} 화면"></a>`
        : '<div class="meta">⏳ 이 PC에서 캡처 만드는 중</div>';
    const ratio = e.outlierRatio == null ? '측정 전' : `${Math.round(e.outlierRatio)}배`;
    return `<div class="card moment">${img}<div><span class="t">${mmss(e.t)}</span> ${escapeHtml(e.what)}</div><div class="q">${escapeHtml(e.purpose)}</div><div class="meta">${escapeHtml(e.channelTitle)} · 평소의 ${ratio} · <a href="/outlier-report/${encodeURIComponent(e.videoId)}">리포트</a></div></div>`;
  });
  const body = [
    '<p><a href="/">← 대시보드</a> · <a href="/outlier-reports">경쟁 영상 리포트 목록</a></p>',
    `<h1>연출 자료집</h1>`,
    `<p class="meta">경쟁 영상 ${reports}편 · 화면 변화 ${entries.length}개. 잘된 경쟁 영상이 화면을 어떻게 바꿨는지 1초 간격 3장 캡처로 본다. 구조만 배우고 그림·문구·남의 영상은 따라 하지 않는다. AI가 적은 시각은 몇 초 어긋날 수 있어 캡처 띠로 직접 확인한다. 매일 루프가 하루 2편씩 늘린다.${pendingReports ? ` 지금 이 PC에서 ${Number(pendingReports)}편의 캡처를 만드는 중이라 25초마다 새로고침한다.` : ''}</p>`,
    `<form method="get" action="/visual-library"><input type="search" name="q" value="${escapeHtml(query)}" placeholder="검색: 비교, X 표시, 정답, 자막…" style="width:100%;max-width:420px;padding:8px 10px;border-radius:8px;border:1px solid var(--line);background:var(--card);color:var(--ink)"></form>`,
    `<p class="meta">${shown.length}개${shown.length > 150 ? ' (앞 150개만 표시)' : ''}</p>`,
    tiles.join('\n') || `<p class="meta">${entries.length ? '검색어에 맞는 화면 변화가 없습니다.' : '아직 리포트가 없습니다. 매일 루프가 하루 2편씩 만듭니다.'}</p>`,
  ];
  return page('연출 자료집', body.join('\n'), {refreshSeconds: pendingReports ? 25 : 0});
}

// ---- 변형 시트(2026-11-12): 경쟁 영상과 우리가 만들 영상을 같은 행에서 좌우로 비교한다 ----
const SHEET_CSS = `<style>
.sheet-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin:8px 0}
.sheet-col{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 12px}
.sheet-col.ours{border-color:var(--accent)}
.sheet-col h4{margin:0 0 6px;font-size:12px;color:var(--sub);text-transform:none}
.sheet-col .imgs{display:flex;flex-wrap:nowrap;gap:8px;margin:6px 0;align-items:flex-start}
.sheet-col img{width:auto;min-width:0;max-width:100%;max-height:300px;height:auto;border-radius:6px;border:1px solid var(--line);display:block}
.sheet-why{grid-column:1/-1;font-size:13px;color:var(--sub);padding:0 4px 6px}
.sheet-label{font-weight:700;margin:18px 0 0}
.warn{border:1px solid var(--bad);color:var(--bad);border-radius:10px;padding:8px 12px;margin:10px 0;font-size:14px}
.timeline{position:relative;height:26px;background:var(--card);border:1px solid var(--line);border-radius:6px;margin:4px 0 2px}
.tick{position:absolute;top:3px;bottom:3px;width:3px;border-radius:2px;transform:translateX(-1px)}
.tick.comp{background:var(--sub)}.tick.ours{background:var(--accent)}
.tl-label{font-size:13px;color:var(--sub);margin-top:8px}
.bar{display:flex;height:14px;border-radius:7px;overflow:hidden;border:1px solid var(--line);max-width:420px}
.bar span:first-child{background:var(--accent)}.bar span:last-child{background:var(--line)}
@media (max-width:700px){.sheet-row{grid-template-columns:minmax(0,1fr)}}
</style>`;
const STAGE_KO = {draft: '초안', approved: '승인', published: '공개', measured: '성적 입력됨'};

/** 컷 리듬: 경쟁 컷 시각(ffmpeg가 잰 값)과 우리 컷 계획을 같은 시간 막대로 보여 준다. */
function cutRhythm(row, report) {
  const plan = row.ours?.cutPlan;
  const times = report?.pacing?.times;
  const compDur = Number(report?.windowSeconds) || Number(report?.meta?.durationSeconds) || 0;
  const bar = (list, dur, cls) => `<div class="timeline">${list.map((t) => `<span class="tick ${cls}" style="left:${Math.min(100, (Number(t) / dur) * 100)}%"></span>`).join('')}</div>`;
  const parts = ['<div class="sheet-label">컷 리듬</div>'];
  if (Array.isArray(times) && compDur > 0) parts.push(`<div class="tl-label">경쟁 ${times.length}번 (1분에 ${report.pacing.perMinute ?? '측정 전'}번 · ${compDur}초 안)</div>${bar(times, compDur, 'comp')}`);
  else parts.push('<div class="tl-label">경쟁 컷 시각: 측정 전(캡처 채우기를 돌리면 생긴다)</div>');
  if (plan?.times?.length) {
    const perMin = Math.round((plan.times.length / Number(plan.durationSeconds)) * 600) / 10;
    parts.push(`<div class="tl-label">우리 계획 ${plan.times.length}번 (1분에 ${perMin}번 · ${Number(plan.durationSeconds)}초 안)</div>${bar(plan.times, Number(plan.durationSeconds), 'ours')}`);
  }
  return parts.join('');
}

export function renderTransformSheetPage(sheet, report, problems = []) {
  const id = encodeURIComponent(sheet.sourceVideoId);
  const frameByT = new Map((report?.frames || []).map((f) => [String(f.t), f.file]));
  const competitorImg = (token) => {
    if (token === 'thumbnail') return report?.meta?.thumbnail ? `<img src="${escapeHtml(report.meta.thumbnail)}" alt="경쟁 썸네일">` : '';
    const m = String(token).match(/^frame:(.+)$/);
    const file = m && frameByT.get(m[1]);
    return file ? `<img loading="lazy" src="/outlier-frames/${id}/${escapeHtml(file)}" alt="${escapeHtml(m[1])}초 화면">` : '';
  };
  const oursImg = (rel) => (rel ? `<img loading="lazy" src="/transform-images/${id}/${escapeHtml(String(rel).split('/').pop())}" alt="우리 쪽 시안">` : '');
  const stage = sheet.status === 'published' && sheet.outcome?.views7d != null ? 'measured' : sheet.status;
  const share = sheet.identityShare || {ours: 0, competitor: 0};
  const parts = [
    '<p><a href="/transform-sheets">← 변형 시트 목록</a> · <a href="/outlier-report/' + id + '">경쟁 영상 리포트</a> · <a href="/">대시보드</a></p>',
    SHEET_CSS,
    `<h1>변형 시트: ${escapeHtml(sheet.topic)}</h1>`,
    `<div class="meta">경쟁 영상: ${escapeHtml(report?.meta?.title || sheet.sourceVideoId)} (${escapeHtml(report?.meta?.channelTitle || '')}, 평소의 ${report?.outlierRatio == null ? '측정 전' : Math.round(report.outlierRatio) + '배'}) · 형식 ${escapeHtml(sheet.format)} · 상태 ${escapeHtml(STAGE_KO[stage] || stage)}</div>`,
    `<p>정체성 비율 <b>경쟁 ${Number(share.competitor)}% · 우리 ${Number(share.ours)}%</b> — ${escapeHtml(share.reason)}</p><div class="bar"><span style="width:${Number(share.ours)}%"></span><span style="width:${Number(share.competitor)}%"></span></div>`,
  ];
  for (const p of problems) parts.push(`<div class="warn">⚠ ${escapeHtml(p)}</div>`);
  parts.push('<div class="sheet-row" style="margin-top:18px"><div class="sheet-col"><b>경쟁 콘텐츠(이미 출시)</b></div><div class="sheet-col ours"><b>우리가 만들 콘텐츠</b></div></div>');
  for (const r of sheet.rows || []) {
    const comp = (r.competitor?.images || []).map(competitorImg).join('');
    const ours = oursImg(r.ours?.image) + (r.ours?.images || []).map(oursImg).join('');
    parts.push(`<div class="sheet-label">${escapeHtml(ROW_LABELS_VIEW[r.key] || r.key)}</div>
<div class="sheet-row">
  <div class="sheet-col"><h4>경쟁</h4>${comp ? `<div class="imgs">${comp}</div>` : ''}<div>${escapeHtml(r.competitor?.text)}</div>${r.competitor?.quote ? `<div class="q">“${escapeHtml(r.competitor.quote)}”</div>` : ''}</div>
  <div class="sheet-col ours"><h4>우리</h4>${ours ? `<div class="imgs">${ours}</div>` : ''}<div>${escapeHtml(r.ours?.text)}</div></div>
  <div class="sheet-why">왜 바꿨나: ${escapeHtml(r.why)}</div>
</div>${r.key === 'visual' ? cutRhythm(r, report) : ''}`);
  }
  parts.push('<h2>다른 경쟁 영상에서 가져온 것</h2>');
  for (const b of sheet.borrowed || []) parts.push(`<div class="card"><b>${escapeHtml(b.what)}</b> <a href="/outlier-report/${encodeURIComponent(b.fromVideoId)}">(${escapeHtml(b.fromVideoId)})</a><div>가져와도 되는 이유: ${escapeHtml(b.reason)}</div><div class="q">근거: ${escapeHtml(b.evidence)}</div></div>`);
  parts.push('<h2>안 맞아서 뺀 것</h2>');
  if (!(sheet.rejected || []).length) parts.push('<p class="meta">없음</p>');
  for (const r of sheet.rejected || []) parts.push(`<div class="card"><b>${escapeHtml(r.what)}</b> <a href="/outlier-report/${encodeURIComponent(r.fromVideoId)}">(${escapeHtml(r.fromVideoId)})</a><div>뺀 이유: ${escapeHtml(r.reason)}</div></div>`);
  if (sheet.pending?.length) {
    parts.push('<h2>대본 전에 확인할 것</h2>');
    for (const t of sheet.pending) parts.push(`<div class="card">${escapeHtml(t)}</div>`);
  }
  if (sheet.outcome) parts.push(`<h2>성적</h2><div class="card">${escapeHtml(JSON.stringify(sheet.outcome))}</div>`);
  return page(`변형 시트 ${sheet.topic}`, parts.join('\n'));
}

const ROW_LABELS_VIEW = {title: '제목', thumbnail: '썸네일', opening: '첫 15초', flow: '전개', visual: '화면 연출', reaction: '시청자 반응 지점', ending: '끝맺음'};

export function renderTransformSheetIndex(items = []) {
  const cards = items.map(({sheet, report}) => {
    const stage = sheet.status === 'published' && sheet.outcome?.views7d != null ? 'measured' : sheet.status;
    return `<div class="card"><a href="/transform-sheet/${encodeURIComponent(sheet.sourceVideoId)}"><b>${escapeHtml(sheet.topic)}</b></a><div class="meta">${escapeHtml(STAGE_KO[stage] || stage)} · ${escapeHtml(sheet.format)} · 경쟁 영상: ${escapeHtml(report?.meta?.title || sheet.sourceVideoId)}</div></div>`;
  });
  return page('변형 시트', `<p><a href="/">← 대시보드</a> · <a href="/outlier-reports">경쟁 영상 리포트</a></p><h1>변형 시트 ${items.length}장</h1><p class="meta">경쟁 영상 리포트를 우리 콘텐츠로 바꾼 한 장. 좌우로 비교하고, 다른 경쟁 영상에서 가져온 것과 뺀 것을 이유와 함께 남긴다. 실패·기각도 데이터로 쌓는다.</p>${cards.join('\n') || '<p class="meta">아직 없음</p>'}`);
}

export function renderReportIndex(reports = []) {
  const sorted = [...reports].sort((a, b) => (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0));
  const items = sorted.map((r) => `<div class="card"><a href="/outlier-report/${encodeURIComponent(r.videoId)}">${r.meta?.thumbnail ? `<img src="${escapeHtml(r.meta.thumbnail)}" alt="">` : '<span></span>'}<span><b>${escapeHtml(r.meta?.title)}</b><br><span class="meta">${escapeHtml(r.meta?.channelTitle)} · 채널 평소 대비 ${r.outlierRatio == null ? '측정 전' : `${Math.round(r.outlierRatio * 10) / 10}배`} · 장면 전환 ${r.pacing?.count ?? 0}번 · AI가 적은 화면 변화 ${(r.analysis?.visualMoments || []).length}개 · 캡처 ${(r.frames || []).length}장 · 인용 확인 ${r.quoteCheck?.verified ?? 0}/${r.quoteCheck?.checked ?? 0} · 분석 ${escapeHtml(String(r.analyzedAt || '').slice(0, 10))}</span></span></a></div>`);
  return page('아웃라이어 리포트', `<p><a href="/">← 대시보드</a> · <a href="/visual-library">연출 자료집</a> · <a href="/next-input">다음 기획 입력</a></p><h1>아웃라이어 리포트 ${sorted.length}편</h1><p class="meta">경쟁 영상 한 편을 제목·썸네일·화면·자막·댓글로 한 번에 관찰한 기록. 채널 평소 대비 배수가 큰 영상부터.</p><div class="list">${items.join('\n') || '<p class="meta">아직 없음</p>'}</div>`);
}
