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
table{width:100%;border-collapse:collapse;font-size:14px}td,th{border-bottom:1px solid var(--line);padding:6px 4px;text-align:left;vertical-align:top}
.thumb{max-width:360px;width:100%;border-radius:8px}
.list a{display:grid;grid-template-columns:160px minmax(0,1fr);gap:12px;text-decoration:none;color:inherit}
.list img{width:160px;border-radius:6px}
@media (max-width:600px){.list a{grid-template-columns:96px minmax(0,1fr)}.list img{width:96px}}
`;

const badge = (flag) => (flag === true ? '<span class="ok">✓ 원문 확인</span>'
  : flag === false ? '<span class="bad">✗ 원문에 없음</span>'
    : '<span class="na">– 대조할 원문 없음</span>');
const quote = (text, flag) => (String(text ?? '').trim() ? `<div class="q">“${escapeHtml(text)}” ${badge(flag)}</div>` : '');

const page = (title, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;

export function renderReportPage(report) {
  const a = report.analysis || {};
  const m = report.meta || {};
  const id = escapeHtml(report.videoId);
  const yt = (t) => `https://www.youtube.com/watch?v=${encodeURIComponent(report.videoId)}&t=${Math.floor(Number(t) || 0)}s`;
  const frameByT = new Map((report.frames || []).map((f) => [f.t, f.file]));
  const parts = [];
  parts.push(`<p><a href="/outlier-reports">← 리포트 목록</a></p>`);
  parts.push(`<h1>${escapeHtml(m.title)}</h1>`);
  parts.push(`<div class="meta">${escapeHtml(m.channelTitle)} · 구독자 ${num(report.subscriberCount)} · 조회수 ${num(m.viewCount)} · 구독자 대비 ${report.viewsPerSubscriber ?? '측정 전'}배 · 채널 평소 대비 ${report.outlierRatio == null ? '측정 전' : `${Math.round(report.outlierRatio * 10) / 10}배`} · 길이 ${m.durationSeconds ?? '?'}초</div>`);
  const src = report.sources || {};
  parts.push(`<div class="meta">분석 ${escapeHtml(String(report.analyzedAt || '').slice(0, 10))} · ${escapeHtml(report.model || '')} · 화면은 처음 ${report.windowSeconds}초 · 자막 ${src.transcript?.ok ? '있음' : `없음(${escapeHtml(src.transcript?.error || '')})`} · 댓글 ${src.comments?.count ?? 0}개 · 인용 확인 ${report.quoteCheck?.verified ?? 0}/${report.quoteCheck?.checked ?? 0}</div>`);
  parts.push(`<p><a href="https://www.youtube.com/watch?v=${encodeURIComponent(report.videoId)}" target="_blank" rel="noopener">유튜브에서 보기</a></p>`);

  const c = a.click || {};
  parts.push('<h2>1. 클릭 — 제목과 썸네일</h2><div class="card">');
  if (m.thumbnail) parts.push(`<img class="thumb" src="${escapeHtml(m.thumbnail)}" alt="썸네일">`);
  parts.push(`<p><b>제목</b>: ${escapeHtml(c.titleDevice)}</p>${quote(c.titleQuote, c.titleQuoteVerified)}`);
  parts.push(`<p><b>썸네일 글자</b>: ${escapeHtml(c.thumbnailText || '없음')} (${escapeHtml(c.thumbnailWordCount ?? '?')}단어)</p><p><b>썸네일 모습</b>: ${escapeHtml(c.thumbnailVisual)}</p><p><b>제목과 관계</b>: ${escapeHtml(c.thumbnailVsTitle)}</p></div>`);

  const o = a.opening || {};
  parts.push(`<h2>2. 첫 15초</h2><div class="card"><p>${escapeHtml(o.first15s)}</p>${quote(o.quote, o.quoteVerified)}<p><b>계속 볼 이유</b>: ${escapeHtml(o.reasonToKeepWatching)}</p></div>`);

  const p = report.pacing || {};
  parts.push(`<h2>3. 화면 연출</h2><p class="meta">처음 ${report.windowSeconds}초 동안 장면 전환 ${p.count ?? 0}번 · 1분에 ${p.perMinute ?? 0}번 · 전환 사이 간격 중앙값 ${p.medianGapSeconds == null ? '측정 전' : `${p.medianGapSeconds}초`} (출처: ${escapeHtml(p.source || '코드 계산')}). 아래는 AI가 적은 화면 변화 ${(a.visualMoments || []).length}개다. 캡처는 그 시각부터 1초 간격 3장이고, AI가 말한 시각은 1~2초 어긋날 수 있다.${report.framesError ? ` 캡처 실패: ${escapeHtml(report.framesError)}` : ''}</p>`);
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
  list('남은 질문·아쉬움', vr.unanswered, 'question');
  list('시청자가 쓴 표현', vr.vocabulary, 'expression');

  parts.push('<h2>6. 장면과 반응의 연결</h2>');
  if (!(a.links || []).length) parts.push('<p class="meta">없음</p>');
  for (const l of a.links || []) parts.push(`<div class="card"><b>${escapeHtml(l.cause)}</b> → ${escapeHtml(l.reaction)}${quote(l.quote, l.quoteVerified)}</div>`);

  const u = a.forUs || {};
  parts.push(`<h2>7. 우리 채널에</h2><div class="card"><p><b>가져올 점</b>: ${escapeHtml(u.adopt)}</p><p><b>다르게 할 점</b>: ${escapeHtml(u.differentiate)}</p></div>`);
  return page(m.title || report.videoId, parts.join('\n'));
}

export function renderReportIndex(reports = []) {
  const sorted = [...reports].sort((a, b) => (b.outlierRatio ?? 0) - (a.outlierRatio ?? 0));
  const items = sorted.map((r) => `<div class="card"><a href="/outlier-report/${encodeURIComponent(r.videoId)}">${r.meta?.thumbnail ? `<img src="${escapeHtml(r.meta.thumbnail)}" alt="">` : '<span></span>'}<span><b>${escapeHtml(r.meta?.title)}</b><br><span class="meta">${escapeHtml(r.meta?.channelTitle)} · 채널 평소 대비 ${r.outlierRatio == null ? '측정 전' : `${Math.round(r.outlierRatio * 10) / 10}배`} · 장면 전환 ${r.pacing?.count ?? 0}번 · AI가 적은 화면 변화 ${(r.analysis?.visualMoments || []).length}개 · 캡처 ${(r.frames || []).length}장 · 인용 확인 ${r.quoteCheck?.verified ?? 0}/${r.quoteCheck?.checked ?? 0} · 분석 ${escapeHtml(String(r.analyzedAt || '').slice(0, 10))}</span></span></a></div>`);
  return page('아웃라이어 리포트', `<h1>아웃라이어 리포트 ${sorted.length}편</h1><p class="meta">경쟁 영상 한 편을 제목·썸네일·화면·자막·댓글로 한 번에 관찰한 기록. 채널 평소 대비 배수가 큰 영상부터.</p><div class="list">${items.join('\n') || '<p class="meta">아직 없음</p>'}</div>`);
}
