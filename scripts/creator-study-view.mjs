// 대표님 1:1 발음 과외방 HTML / CSS / 클라이언트 스크립트 렌더러 (2026-11-26)
// 비교 시트(scripts/outlier-report-view.mjs) 아래에 독립 섹션으로 붙는다.
// 기존 승인 관문과 제작 흐름을 건드리지 않으며, 400px 모바일에서도 가로 넘침 없이 동작한다.

import {buildViewerScriptBlocks, resolveFocusWords} from './creator-study.mjs';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export const CREATOR_STUDY_CSS = `<style>
.study-room{margin:28px 0 32px;padding:22px 20px 24px;border-radius:16px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(56,189,248,0.045),rgba(168,85,247,0.025) 45%,transparent 100%)}
.study-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid var(--line)}
.study-head h2{margin:0;border-left:4px solid #10b981;padding-left:10px;font-size:18px}
.study-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;font-size:11.5px;font-weight:700;background:rgba(16,185,129,0.14);color:var(--ok);border:1px solid rgba(16,185,129,0.32)}
.study-sub{font-size:13.5px;color:var(--sub);margin:6px 0 0;line-height:1.6}
.study-block-title{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:24px 0 10px}
.study-block-title h3{margin:0;font-size:15.5px;color:var(--ink);font-weight:800}
.study-review-box{background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.3);border-left:4px solid var(--accent-amber);border-radius:12px;padding:14px 16px;margin:0 0 18px}
.study-review-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:10px}
.study-review-item{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
.study-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin:8px 0 14px;padding:10px 12px;border-radius:10px;background:var(--card);border:1px solid var(--line)}
.study-seg{display:inline-flex;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.study-seg button{appearance:none;border:none;background:transparent;color:var(--sub);padding:6px 12px;font-size:12.5px;font-weight:700;cursor:pointer;transition:background .15s,color .15s}
.study-seg button.active{background:var(--accent-glow);color:var(--accent)}
.study-btn{appearance:none;border:1px solid var(--line);background:var(--card);color:var(--ink);font-size:12.5px;font-weight:700;padding:6px 11px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:border-color .15s,background .15s,color .15s}
.study-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--card-hover)}
.study-btn:disabled{opacity:0.5;cursor:default}
.study-btn.primary{background:var(--accent);color:#06131f;border-color:var(--accent)}
.study-btn.primary:hover{opacity:0.92;color:#06131f}
.study-btn.ok-active{background:var(--ok-bg);border-color:var(--ok);color:var(--ok)}
.study-btn.warn-active{background:rgba(245,158,11,0.16);border-color:var(--accent-amber);color:var(--accent-amber)}
.study-btn.purple-active{background:rgba(168,85,247,0.16);border-color:var(--accent-purple);color:var(--accent-purple)}
.notion-doc{max-width:780px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
.notion-cut{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px 12px;transition:border-color .2s}
.notion-cut.is-edited{border-color:rgba(16,185,129,0.45)}
.notion-cut-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px;padding-bottom:8px;border-bottom:1px dashed var(--line)}
.en-strip{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 12px;padding:8px 10px;border-radius:10px;background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.24)}
.en-strip-label{font-size:11.5px;font-weight:800;color:var(--accent);margin-right:2px}
.en-chip{display:inline-flex;align-items:center;gap:4px;background:var(--card);border:1px solid rgba(56,189,248,0.38);border-radius:999px;padding:4px 10px;font-size:13px;font-weight:700;color:var(--ink)}
.en-chip button{appearance:none;border:none;background:transparent;color:var(--accent);cursor:pointer;padding:0 3px;font-size:13px;font-weight:800;line-height:1}
.en-chip button:hover{color:var(--ink)}
.notion-lines{display:flex;flex-direction:column;gap:8px}
.notion-line{position:relative;padding:11px 14px;border-radius:10px;border-left:3px solid transparent;background:transparent;transition:background .16s ease,border-color .16s ease,transform .12s ease}
.notion-line:hover,.notion-line:focus-within,.notion-line.is-editing{background:rgba(56,189,248,0.085);border-left-color:var(--accent)}
.notion-line-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.notion-text{flex:1;min-width:0;font-size:16px;line-height:1.88;letter-spacing:-0.01em;color:var(--ink);word-break:keep-all;cursor:text}
.notion-actions{display:flex;gap:4px;flex-shrink:0;opacity:0;transition:opacity .15s ease;padding-top:3px}
.notion-line:hover .notion-actions,.notion-line:focus-within .notion-actions,.notion-line.is-editing .notion-actions{opacity:1}
@media (hover:none){.notion-actions{opacity:0.85}}
.notion-mini-btn{appearance:none;border:1px solid var(--line);background:var(--card);color:var(--sub);font-size:11.5px;font-weight:700;padding:4px 8px;border-radius:6px;cursor:pointer;white-space:nowrap}
.notion-mini-btn:hover{border-color:var(--accent);color:var(--accent)}
.notion-editor-box{margin-top:8px;display:none;flex-direction:column;gap:8px}
.notion-line.is-editing .notion-editor-box{display:flex}
.notion-line.is-editing .notion-text{display:none}
.study-textarea,.study-input{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:9px;background:var(--bg);color:var(--ink);font:inherit;font-size:14.5px;line-height:1.65;padding:10px 12px;resize:vertical;outline:none;transition:border-color .15s}
.study-textarea:focus,.study-input:focus{border-color:var(--accent)}
.notion-q-inline{margin-top:8px;padding:10px 12px;border-radius:9px;background:rgba(168,85,247,0.07);border:1px solid rgba(168,85,247,0.28);display:none;flex-direction:column;gap:8px}
.notion-q-inline.open{display:flex}
.notion-q-bubble{margin-top:8px;padding:9px 12px;border-radius:9px;background:rgba(168,85,247,0.08);border-left:3px solid var(--accent-purple);font-size:13.5px;line-height:1.6}
.study-words-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px;margin:10px 0}
.study-word-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.study-word-card.st-got{border-color:rgba(52,211,153,0.45)}
.study-word-card.st-fuzzy{border-color:rgba(245,158,11,0.55);background:rgba(245,158,11,0.04)}
.study-word-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap}
.study-word-en{font-size:17px;font-weight:800;color:var(--ink);letter-spacing:-0.01em}
.study-word-tip{font-size:13.5px;line-height:1.6;color:var(--ink);background:rgba(56,189,248,0.06);border-left:3px solid var(--accent);padding:8px 10px;border-radius:0 8px 8px 0}
.study-q-list{display:flex;flex-direction:column;gap:10px;margin:10px 0}
.study-q-card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;transition:border-color .15s}
.study-q-card.is-curious{border-color:rgba(168,85,247,0.5);background:rgba(168,85,247,0.04)}
.study-q-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap}
.study-q-head-main{display:flex;align-items:flex-start;flex:1 1 280px;min-width:min(260px,100%)}
.study-q-num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:999px;background:var(--accent-glow);color:var(--accent);font-size:12px;font-weight:800;flex:none;margin-right:8px;margin-top:1px}
.study-q-title{font-size:15px;font-weight:700;color:var(--ink);line-height:1.55;flex:1;min-width:0;word-break:keep-all}
.study-teacher-box{display:none;padding:11px 14px;border-radius:10px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.28);font-size:14px;line-height:1.7;color:var(--ink)}
.study-teacher-box.open{display:block}
.study-toast{position:fixed;bottom:20px;right:20px;z-index:80;background:#0f172a;color:#f8fafc;border:1px solid rgba(56,189,248,0.45);padding:9px 14px;border-radius:10px;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,0.3);opacity:0;pointer-events:none;transition:opacity .2s}
.study-toast.show{opacity:1}
@media (max-width:600px){
  .study-room{padding:14px 12px 18px}
  .notion-cut{padding:12px 10px}
  .notion-line{padding:10px 8px}
  .notion-line-row{flex-direction:column;gap:6px}
  .notion-text{font-size:15.5px}
}
</style>`;

export function renderCreatorStudySection(sheet, study, reviewItems = []) {
  const sid = String(sheet?.episodeId || sheet?.sourceVideoId || '');
  const isDraft = sheet?.status === 'draft';
  const blocks = buildViewerScriptBlocks(sheet, study);
  const focusWords = resolveFocusWords(sheet, study);
  const lineQuestions = Array.isArray(study?.lineQuestions) ? study.lineQuestions : [];
  const freeQuestions = Array.isArray(study?.freeQuestions) ? study.freeQuestions : [];
  const viewerQuestions = Array.isArray(study?.viewerQuestions) ? study.viewerQuestions : [];
  const editedCount = Object.keys(study?.scriptEdits || {}).length;

  const qByCutSent = new Map();
  for (const lq of lineQuestions) {
    const key = `${lq.cutIndex}:${lq.sentenceIndex ?? 0}`;
    if (!qByCutSent.has(key)) qByCutSent.set(key, []);
    qByCutSent.get(key).push(lq);
  }

  // 0단: 시작 30초 지난 편 복습 카드 (최대 2개)
  const reviewHtml = (reviewItems || []).length
    ? `<div class="study-review-box" id="study-review-box">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <b style="font-size:14.5px;color:var(--accent-amber)">⏱ 시작 30초 — 지난 편에서 헷갈렸던 것 복습 (${reviewItems.length}개)</b>
          <span class="meta">밀리지 않고 1~2개만 가볍게 띄워 드려요. 넘겨도 됩니다.</span>
        </div>
        <div class="study-review-grid">
          ${reviewItems.map((it, idx) => it.kind === 'word'
            ? `<div class="study-review-item" data-review-card="${idx}">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
                  <b style="font-size:15.5px">${escapeHtml(it.word)}</b>
                  <span class="meta">${escapeHtml(it.sheetId)}</span>
                </div>
                ${it.phoneticHint ? `<div class="meta">소리 힌트: <b>${escapeHtml(it.phoneticHint)}</b></div>` : ''}
                ${it.mouthTip ? `<div style="font-size:13px;line-height:1.55">${escapeHtml(it.mouthTip)}</div>` : ''}
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:auto">
                  <button type="button" class="study-btn" data-speak="${escapeHtml(it.word)}" data-rate="0.95">🔊 듣기</button>
                  <button type="button" class="study-btn" data-speak="${escapeHtml(it.word)}" data-rate="0.72">🐢 천천히</button>
                  <button type="button" class="study-btn ok-active" data-review-done="word" data-target-sheet="${escapeHtml(it.sheetId)}" data-word="${escapeHtml(it.word)}">✅ 이제 알겠어요</button>
                </div>
              </div>`
            : `<div class="study-review-item" data-review-card="${idx}">
                <div class="meta">${escapeHtml(it.sheetId)} · 지난 편 궁금증</div>
                <b style="font-size:14px;line-height:1.5">${escapeHtml(it.q)}</b>
                ${it.teacherAnswer ? `<div style="font-size:13px;line-height:1.55;color:var(--sub)">${escapeHtml(it.teacherAnswer)}</div>` : ''}
                <div style="margin-top:auto">
                  <button type="button" class="study-btn ok-active" data-review-done="question" data-target-sheet="${escapeHtml(it.sheetId)}" data-qid="${escapeHtml(it.questionId)}">✅ 확인했어요</button>
                </div>
              </div>`).join('')}
        </div>
      </div>`
    : '';

  // 1단: 시청자 순서대로 읽고 고치는 노션 느낌 편집기
  const cutBlocksHtml = blocks.length
    ? blocks.map((b) => {
        const enHtml = b.english.length
          ? `<div class="en-strip"><span class="en-strip-label">🎧 원어민 영어 소리</span>${b.english.map((w) => `<span class="en-chip"><span>${escapeHtml(w)}</span><button type="button" title="보통 속도로 듣기" data-speak="${escapeHtml(w)}" data-rate="0.95">🔊</button><button type="button" title="천천히 듣기" data-speak="${escapeHtml(w)}" data-rate="0.72">🐢</button></span>`).join('')}</div>`
          : '';
        const sentenceLines = b.sentences.length ? b.sentences : [b.currentNarration];
        const sentencesHtml = sentenceLines.map((sent, sIdx) => {
          const attached = qByCutSent.get(`${b.cutIndex}:${sIdx}`) || [];
          const bubbles = attached.map((lq) => `<div class="notion-q-bubble" data-lq-id="${escapeHtml(lq.id)}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div><b>❓ 내 질문:</b> ${escapeHtml(lq.question)}</div><button type="button" class="notion-mini-btn" data-del-lq="${escapeHtml(lq.id)}">삭제</button></div>${lq.answer ? `<div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--line)"><b>👩‍🏫 선생님 답:</b> ${escapeHtml(lq.answer)}</div>` : '<div class="meta" style="margin-top:4px">선생님 설명 대기 중 — 대화에서 “과외방 질문 답해 줘”라고 하면 쉬운 설명을 채워 드려요.</div>'}</div>`).join('');
          return `<div class="notion-line" data-cut="${b.cutIndex}" data-sent="${sIdx}">
            <div class="notion-line-row">
              <div class="notion-text" data-open-edit="1" title="눌러서 바로 고치기">${escapeHtml(sent)}</div>
              <div class="notion-actions">
                <button type="button" class="notion-mini-btn" data-open-edit="1">✏️ 고치기</button>
                <button type="button" class="notion-mini-btn" data-open-q="1">❓ 질문</button>
              </div>
            </div>
            <div class="notion-editor-box">
              <textarea class="study-textarea" rows="2" data-edit-input="1">${escapeHtml(sent)}</textarea>
              <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
                <button type="button" class="study-btn primary" data-save-edit="1">저장</button>
                <button type="button" class="study-btn" data-cancel-edit="1">취소</button>
                <span class="meta">문장 끝에서 Ctrl+Enter로 바로 저장</span>
              </div>
            </div>
            <div class="notion-q-inline" data-q-box="1">
              <textarea class="study-textarea" rows="2" placeholder="이 문장에서 이해 안 되는 점, 말이 어려운 부분, 왜 이렇게 읽는지 편하게 적어 주세요." data-q-input="1"></textarea>
              <div style="display:flex;gap:6px;align-items:center">
                <button type="button" class="study-btn primary" data-save-q="1">질문 남기기</button>
                <button type="button" class="study-btn" data-cancel-q="1">닫기</button>
              </div>
            </div>
            <div class="notion-q-bubbles">${bubbles}</div>
          </div>`;
        }).join('');

        return `<article class="notion-cut${b.isEdited ? ' is-edited' : ''}" data-cut-card="${b.cutIndex}" data-original="${escapeHtml(b.originalNarration)}">
          <div class="notion-cut-head">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span class="t">${escapeHtml(b.t)}초 · ${b.cutIndex + 1}번 장면</span>
              ${b.isEdited ? '<span class="ok">수정됨</span>' : ''}
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              ${b.isEdited ? `<button type="button" class="notion-mini-btn" data-reset-cut="${b.cutIndex}">↩ 원래 문장으로</button>` : ''}
            </div>
          </div>
          ${enHtml}
          <div class="notion-lines">${sentencesHtml}</div>
        </article>`;
      }).join('')
    : '<div class="card meta">이 비교 시트에는 아직 컷 대본이 없습니다.</div>';

  // 2단: 핵심 단어 3~5개 1:1 입모양 과외
  const wordsHtml = focusWords.length
    ? `<div class="study-words-grid">${focusWords.map((w) => {
        const cls = w.status === 'got_it' ? ' st-got' : w.status === 'still_fuzzy' ? ' st-fuzzy' : '';
        return `<div class="study-word-card${cls}" data-word-card="${escapeHtml(w.word)}" data-phonetic="${escapeHtml(w.phoneticHint || '')}" data-tip="${escapeHtml(w.mouthTip || '')}">
          <div class="study-word-top">
            <div>
              <div class="study-word-en">${escapeHtml(w.word)}</div>
              ${w.phoneticHint ? `<div class="meta" style="margin-top:2px">${escapeHtml(w.phoneticHint)}</div>` : ''}
            </div>
            <div style="display:flex;gap:5px">
              <button type="button" class="study-btn" data-speak="${escapeHtml(w.word)}" data-rate="0.95">🔊 듣기</button>
              <button type="button" class="study-btn" data-speak="${escapeHtml(w.word)}" data-rate="0.72">🐢 천천히</button>
            </div>
          </div>
          ${w.mouthTip ? `<div class="study-word-tip"><b>👩‍🏫 입·혀 한 줄 과외:</b> ${escapeHtml(w.mouthTip)}</div>` : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="study-btn${w.status === 'got_it' ? ' ok-active' : ''}" data-word-status="got_it">😊 이해됐어요</button>
            <button type="button" class="study-btn${w.status === 'still_fuzzy' ? ' warn-active' : ''}" data-word-status="still_fuzzy">🤔 아직 헷갈려요</button>
          </div>
          <input type="text" class="study-input" style="font-size:13px;padding:7px 10px" placeholder="따라 해 본 느낌 한 줄 (예: 혀가 꼬임 / 이렇게 하니 됨 — 안 써도 OK)" value="${escapeHtml(w.note || '')}" data-word-note="1">
        </div>`;
      }).join('')}</div>`
    : '<div class="card meta">이 시트에는 아직 영어 핵심 단어가 등록되어 있지 않습니다.</div>';

  // 2단 하단: 내가 막힌 질문 모음 + 자유 질문칸
  const allAskedHtml = [
    ...lineQuestions.map((q) => `<div class="card" style="padding:12px 14px;border-left:3px solid var(--accent-purple)" data-q-summary="line" data-id="${escapeHtml(q.id)}">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <span class="meta">${Number(q.cutIndex) + 1}번 장면 · “${escapeHtml((q.excerpt || '').slice(0, 48))}”</span>
        <div style="display:flex;gap:6px">
          <button type="button" class="notion-mini-btn" data-toggle-resolved="line" data-id="${escapeHtml(q.id)}">${q.resolved ? '✓ 알겠어요(완료)' : '아직 궁금'}</button>
          <button type="button" class="notion-mini-btn" data-del-lq="${escapeHtml(q.id)}">삭제</button>
        </div>
      </div>
      <div style="margin-top:6px;font-weight:700">❓ ${escapeHtml(q.question)}</div>
      ${q.answer ? `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(16,185,129,0.08);font-size:13.5px;line-height:1.6"><b>👩‍🏫 선생님 설명:</b> ${escapeHtml(q.answer)}</div>` : ''}
    </div>`),
    ...freeQuestions.map((q) => `<div class="card" style="padding:12px 14px;border-left:3px solid var(--accent)" data-q-summary="free" data-id="${escapeHtml(q.id)}">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <span class="meta">자유 질문</span>
        <div style="display:flex;gap:6px">
          <button type="button" class="notion-mini-btn" data-toggle-resolved="free" data-id="${escapeHtml(q.id)}">${q.resolved ? '✓ 알겠어요(완료)' : '아직 궁금'}</button>
          <button type="button" class="notion-mini-btn" data-del-fq="${escapeHtml(q.id)}">삭제</button>
        </div>
      </div>
      <div style="margin-top:6px;font-weight:700">❓ ${escapeHtml(q.question)}</div>
      ${q.answer ? `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(16,185,129,0.08);font-size:13.5px;line-height:1.6"><b>👩‍🏫 선생님 설명:</b> ${escapeHtml(q.answer)}</div>` : ''}
    </div>`),
  ].join('');

  // 3단: 시청자 질문 10가지 (선생님 설명 기본 숨김!)
  const viewerQHtml = viewerQuestions.length
    ? `<div class="study-q-list">${viewerQuestions.map((vq, idx) => `<div class="study-q-card${vq.curious ? ' is-curious' : ''}" data-vq-id="${escapeHtml(vq.id)}">
        <div class="study-q-head">
          <div class="study-q-head-main">
            <span class="study-q-num">${idx + 1}</span>
            <div class="study-q-title">${escapeHtml(vq.q)}${vq.source ? ` <span class="meta" style="font-weight:500">· ${escapeHtml(vq.source)}</span>` : ''}</div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button type="button" class="study-btn${vq.curious ? ' purple-active' : ''}" data-vq-curious="1">${vq.curious ? '🙋 나도 궁금함 ✓' : '🙋 나도 궁금해'}</button>
            <button type="button" class="study-btn" data-vq-reveal="1">${vq.revealed ? '👩‍🏫 설명 접기' : '👩‍🏫 선생님 설명 보기'}</button>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="text" class="study-input" style="flex:1;min-width:min(220px,100%);font-size:13.5px;padding:8px 11px" placeholder="내 생각엔 ~ 아닐까? (기초라 몰라도 비워 둬도 괜찮아요!)" value="${escapeHtml(vq.guess || '')}" data-vq-guess="1">
          <button type="button" class="study-btn" data-vq-save-guess="1">적어 두기</button>
        </div>
        <div class="study-teacher-box${vq.revealed ? ' open' : ''}" data-vq-answer="1">
          <b>👩‍🏫 선생님 1:1 설명:</b> ${escapeHtml(vq.teacherAnswer || '아직 설명이 채워지지 않았습니다. 대화에서 “시청자 질문 설명 채워 줘”라고 말씀해 주세요.')}
        </div>
      </div>`).join('')}</div>`
    : '<div class="card meta">이 비교 시트에는 아직 시청자 질문 10가지가 생성되지 않았습니다. 아래에서 궁금한 질문을 직접 추가하거나, 대화에서 “이 편 과외방 질문 10개 채워 줘”라고 말씀해 주세요.</div>';

  const addVqHtml = viewerQuestions.length < 10
    ? `<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
        <input type="text" id="study-new-vq-input" class="study-input" style="flex:1;min-width:min(240px,100%)" placeholder="시청자가 궁금해할 것 같은 질문 직접 추가하기 (최대 10개)">
        <button type="button" id="btn-add-vq" class="study-btn">+ 질문 추가</button>
      </div>`
    : '';

  const clientScript = `<script>(function(){
  var sid=${JSON.stringify(sid)};
  var toastEl=document.getElementById('study-toast');
  var toastTimer=null;
  function showToast(msg){
    if(!toastEl)return;
    toastEl.textContent=msg;
    toastEl.classList.add('show');
    if(toastTimer)clearTimeout(toastTimer);
    toastTimer=setTimeout(function(){toastEl.classList.remove('show');},2200);
  }
  function postStudy(payload){
    payload.videoId=sid;
    return fetch('/api/creator-study',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'저장 실패');return d;});});
  }
  function speakEn(text,rate){
    if(!('speechSynthesis' in window)){showToast('이 브라우저에서는 음성 재생을 지원하지 않습니다');return;}
    try{
      window.speechSynthesis.cancel();
      var u=new SpeechSynthesisUtterance(String(text||''));
      u.lang='en-US';
      u.rate=Number(rate)||0.95;
      var voices=window.speechSynthesis.getVoices()||[];
      var picked=voices.find(function(v){return /^en-US/i.test(v.lang)&&/Google|Natural|Samantha|Aria|Jenny/i.test(v.name);})
        ||voices.find(function(v){return /^en-US/i.test(v.lang);})
        ||voices.find(function(v){return /^en/i.test(v.lang);});
      if(picked)u.voice=picked;
      window.speechSynthesis.speak(u);
      showToast('🔊 '+text+(Number(rate)<0.85?' (천천히)':''));
    }catch(e){showToast('소리 재생 중 오류가 났습니다');}
  }
  function collectCutText(cutCard){
    var nodes=cutCard.querySelectorAll('.notion-line .notion-text');
    var list=[];
    for(var i=0;i<nodes.length;i++){
      var t=(nodes[i].textContent||'').trim();
      if(t)list.push(t);
    }
    return list.join(' ');
  }
  function updateEditBadge(){
    var cnt=document.querySelectorAll('.notion-cut.is-edited').length;
    var el=document.getElementById('study-edit-count');
    if(el)el.textContent=String(cnt);
    var applyBtn=document.getElementById('btn-apply-study-script');
    if(applyBtn)applyBtn.disabled=(cnt===0);
  }

  var root=document.getElementById('sec-study-room');
  if(!root)return;

  // 보기 전환: 한 문장씩 vs 컷(문단) 단위
  var modeBtns=root.querySelectorAll('[data-view-mode]');
  for(var i=0;i<modeBtns.length;i++){
    modeBtns[i].addEventListener('click',function(){
      var mode=this.getAttribute('data-view-mode');
      for(var j=0;j<modeBtns.length;j++)modeBtns[j].classList.toggle('active',modeBtns[j]===this);
      var doc=document.getElementById('study-notion-doc');
      if(!doc)return;
      var lines=doc.querySelectorAll('.notion-line');
      for(var k=0;k<lines.length;k++){
        lines[k].style.padding=(mode==='compact')?'6px 10px':'';
      }
      var groups=doc.querySelectorAll('.notion-lines');
      for(var g=0;g<groups.length;g++){
        groups[g].style.gap=(mode==='compact')?'2px':'';
      }
    });
  }

  root.addEventListener('click',function(e){
    var btn=e.target.closest('button, .notion-text');
    if(!btn)return;

    // 1. 영어 소리 즉시 재생
    if(btn.hasAttribute('data-speak')){
      speakEn(btn.getAttribute('data-speak'),btn.getAttribute('data-rate'));
      return;
    }

    // 2. 지난 편 복습 완료
    if(btn.hasAttribute('data-review-done')){
      var kind=btn.getAttribute('data-review-done');
      var targetSheet=btn.getAttribute('data-target-sheet');
      var card=btn.closest('[data-review-card]');
      var payload=kind==='word'
        ? {targetSheetId:targetSheet,action:'update_focus_word',word:btn.getAttribute('data-word'),status:'got_it'}
        : {targetSheetId:targetSheet,action:'update_viewer_question',id:btn.getAttribute('data-qid'),revealed:true,curious:false};
      btn.disabled=true;
      postStudy(payload).then(function(){
        if(card)card.remove();
        showToast('✅ 복습 완료로 표시했습니다');
        var box=document.getElementById('study-review-box');
        if(box&&!box.querySelector('[data-review-card]'))box.remove();
      }).catch(function(err){btn.disabled=false;alert(err.message);});
      return;
    }

    // 3. 노션 문장 편집 열기
    if(btn.hasAttribute('data-open-edit')){
      var line=btn.closest('.notion-line');
      if(!line)return;
      line.classList.add('is-editing');
      var ta=line.querySelector('[data-edit-input]');
      if(ta){ta.value=(line.querySelector('.notion-text').textContent||'').trim();ta.focus();}
      return;
    }

    // 4. 문장 편집 취소
    if(btn.hasAttribute('data-cancel-edit')){
      var line=btn.closest('.notion-line');
      if(line)line.classList.remove('is-editing');
      return;
    }

    // 5. 문장 편집 저장
    if(btn.hasAttribute('data-save-edit')){
      var line=btn.closest('.notion-line');
      var cutCard=btn.closest('.notion-cut');
      if(!line||!cutCard)return;
      var ta=line.querySelector('[data-edit-input]');
      var nextSent=(ta.value||'').trim();
      if(!nextSent){alert('문장이 비어 있습니다.');return;}
      line.querySelector('.notion-text').textContent=nextSent;
      line.classList.remove('is-editing');
      var fullText=collectCutText(cutCard);
      var orig=cutCard.getAttribute('data-original')||'';
      var cutIdx=Number(cutCard.getAttribute('data-cut-card'));
      postStudy({action:'set_cut_edit',cutIndex:cutIdx,text:fullText,originalText:orig}).then(function(){
        var changed=fullText!==orig;
        cutCard.classList.toggle('is-edited',changed);
        updateEditBadge();
        showToast('💾 고친 문장을 저장했습니다');
      }).catch(function(err){alert(err.message);});
      return;
    }

    // 6. 컷 원문 복구
    if(btn.hasAttribute('data-reset-cut')){
      var cutIdx=Number(btn.getAttribute('data-reset-cut'));
      if(!confirm('이 장면의 문장을 원래 대본으로 되돌릴까요?'))return;
      postStudy({action:'reset_cut_edit',cutIndex:cutIdx}).then(function(){
        location.reload();
      }).catch(function(err){alert(err.message);});
      return;
    }

    // 7. 인라인 질문 창 열기/닫기/저장
    if(btn.hasAttribute('data-open-q')){
      var line=btn.closest('.notion-line');
      var box=line&&line.querySelector('[data-q-box]');
      if(box){box.classList.toggle('open');var ta=box.querySelector('[data-q-input]');if(box.classList.contains('open')&&ta)ta.focus();}
      return;
    }
    if(btn.hasAttribute('data-cancel-q')){
      var box=btn.closest('[data-q-box]');
      if(box)box.classList.remove('open');
      return;
    }
    if(btn.hasAttribute('data-save-q')){
      var line=btn.closest('.notion-line');
      var box=btn.closest('[data-q-box]');
      var ta=box&&box.querySelector('[data-q-input]');
      var qText=(ta&&ta.value||'').trim();
      if(!qText){alert('질문을 입력해 주세요.');return;}
      var cutIdx=Number(line.getAttribute('data-cut'));
      var sentIdx=Number(line.getAttribute('data-sent'));
      var excerpt=(line.querySelector('.notion-text').textContent||'').trim().slice(0,120);
      btn.disabled=true;
      postStudy({action:'add_line_question',cutIndex:cutIdx,sentenceIndex:sentIdx,excerpt:excerpt,question:qText}).then(function(){
        location.reload();
      }).catch(function(err){btn.disabled=false;alert(err.message);});
      return;
    }

    // 8. 질문 삭제 / 해결 토글
    if(btn.hasAttribute('data-del-lq')){
      postStudy({action:'delete_line_question',id:btn.getAttribute('data-del-lq')}).then(function(){location.reload();}).catch(function(err){alert(err.message);});
      return;
    }
    if(btn.hasAttribute('data-del-fq')){
      postStudy({action:'delete_free_question',id:btn.getAttribute('data-del-fq')}).then(function(){location.reload();}).catch(function(err){alert(err.message);});
      return;
    }
    if(btn.hasAttribute('data-toggle-resolved')){
      var kind=btn.getAttribute('data-toggle-resolved');
      var action=kind==='line'?'toggle_line_question_resolved':'toggle_free_question_resolved';
      postStudy({action:action,id:btn.getAttribute('data-id')}).then(function(){location.reload();}).catch(function(err){alert(err.message);});
      return;
    }

    // 9. 핵심 단어 상태 버튼
    if(btn.hasAttribute('data-word-status')){
      var card=btn.closest('[data-word-card]');
      var st=btn.getAttribute('data-word-status');
      var word=card.getAttribute('data-word-card');
      var noteEl=card.querySelector('[data-word-note]');
      postStudy({
        action:'update_focus_word',
        word:word,
        phoneticHint:card.getAttribute('data-phonetic')||'',
        mouthTip:card.getAttribute('data-tip')||'',
        status:st,
        note:noteEl?noteEl.value:''
      }).then(function(){
        card.classList.toggle('st-got',st==='got_it');
        card.classList.toggle('st-fuzzy',st==='still_fuzzy');
        var gotBtn=card.querySelector('[data-word-status="got_it"]');
        var fuzBtn=card.querySelector('[data-word-status="still_fuzzy"]');
        if(gotBtn)gotBtn.classList.toggle('ok-active',st==='got_it');
        if(fuzBtn)fuzBtn.classList.toggle('warn-active',st==='still_fuzzy');
        showToast(st==='got_it'?'😊 이해 완료로 저장했습니다':'🤔 다음 편 30초 복습에 담아 두었습니다');
      }).catch(function(err){alert(err.message);});
      return;
    }

    // 10. 시청자 질문 10가지: 나도 궁금해 / 설명 보기 / 내 추측 저장
    if(btn.hasAttribute('data-vq-curious')){
      var qCard=btn.closest('[data-vq-id]');
      var nextCurious=!qCard.classList.contains('is-curious');
      postStudy({action:'update_viewer_question',id:qCard.getAttribute('data-vq-id'),curious:nextCurious}).then(function(){
        qCard.classList.toggle('is-curious',nextCurious);
        btn.classList.toggle('purple-active',nextCurious);
        btn.textContent=nextCurious?'🙋 나도 궁금함 ✓':'🙋 나도 궁금해';
        showToast(nextCurious?'🙋 궁금한 질문으로 표시했습니다':'표시를 해제했습니다');
      }).catch(function(err){alert(err.message);});
      return;
    }
    if(btn.hasAttribute('data-vq-reveal')){
      var qCard=btn.closest('[data-vq-id]');
      var ansBox=qCard.querySelector('[data-vq-answer]');
      var nextOpen=!ansBox.classList.contains('open');
      ansBox.classList.toggle('open',nextOpen);
      btn.textContent=nextOpen?'👩‍🏫 설명 접기':'👩‍🏫 선생님 설명 보기';
      postStudy({action:'update_viewer_question',id:qCard.getAttribute('data-vq-id'),revealed:nextOpen}).catch(function(){});
      return;
    }
    if(btn.hasAttribute('data-vq-save-guess')){
      var qCard=btn.closest('[data-vq-id]');
      var inp=qCard.querySelector('[data-vq-guess]');
      postStudy({action:'update_viewer_question',id:qCard.getAttribute('data-vq-id'),guess:inp?inp.value:''}).then(function(){
        showToast('📝 내 생각을 저장했습니다');
      }).catch(function(err){alert(err.message);});
      return;
    }
  });

  // Ctrl+Enter로 문장 수정 즉시 저장
  root.addEventListener('keydown',function(e){
    if(e.target&&e.target.hasAttribute('data-edit-input')&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'){
      var line=e.target.closest('.notion-line');
      var saveBtn=line&&line.querySelector('[data-save-edit]');
      if(saveBtn)saveBtn.click();
    }
  });

  // 핵심 단어 느낌 메모 포커스 아웃 자동 저장
  root.addEventListener('change',function(e){
    var t=e.target;
    if(t&&t.hasAttribute('data-word-note')){
      var card=t.closest('[data-word-card]');
      if(!card)return;
      var st=card.classList.contains('st-got')?'got_it':(card.classList.contains('st-fuzzy')?'still_fuzzy':'unseen');
      postStudy({
        action:'update_focus_word',
        word:card.getAttribute('data-word-card'),
        phoneticHint:card.getAttribute('data-phonetic')||'',
        mouthTip:card.getAttribute('data-tip')||'',
        status:st,
        note:t.value
      }).then(function(){showToast('💾 단어 느낌 메모를 저장했습니다');}).catch(function(){});
    }
  });

  // 자유 질문 등록
  var freeBtn=document.getElementById('btn-add-free-q');
  if(freeBtn){
    freeBtn.addEventListener('click',function(){
      var ta=document.getElementById('study-free-q-input');
      var qText=(ta&&ta.value||'').trim();
      if(!qText){alert('궁금한 내용을 입력해 주세요.');return;}
      freeBtn.disabled=true;
      postStudy({action:'add_free_question',question:qText}).then(function(){location.reload();}).catch(function(err){freeBtn.disabled=false;alert(err.message);});
    });
  }

  // 시청자 질문 직접 추가
  var addVqBtn=document.getElementById('btn-add-vq');
  if(addVqBtn){
    addVqBtn.addEventListener('click',function(){
      var inp=document.getElementById('study-new-vq-input');
      var qText=(inp&&inp.value||'').trim();
      if(!qText){alert('질문을 입력해 주세요.');return;}
      addVqBtn.disabled=true;
      postStudy({action:'add_viewer_question',q:qText}).then(function(){location.reload();}).catch(function(err){addVqBtn.disabled=false;alert(err.message);});
    });
  }

  // draft 시트 대본에 고친 문장 반영
  var applyBtn=document.getElementById('btn-apply-study-script');
  if(applyBtn){
    applyBtn.addEventListener('click',function(){
      if(!confirm('과외방에서 고친 문장들을 이 초안 시트의 실제 컷 대본에 반영할까요?'))return;
      applyBtn.disabled=true;
      fetch('/api/creator-study-apply-script',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({videoId:sid})})
        .then(function(r){return r.json().then(function(d){if(!r.ok)throw new Error(d.error||'반영 실패');return d;});})
        .then(function(d){alert(d.appliedCount+'개 장면의 대본에 반영했습니다.');location.reload();})
        .catch(function(err){applyBtn.disabled=false;alert(err.message);});
    });
  }
})();</script>`;

  return `<section id="sec-study-room" class="study-room">
    <div class="study-head">
      <div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <h2>🎓 대표님 1:1 발음 과외방</h2>
          <span class="study-badge">개인 학습 전용 · 승인 무관</span>
        </div>
        <p class="study-sub">강사처럼 고칠 필요 없이, <b>1번 학생</b>으로 소리 듣고 막히는 곳만 편하게 표시하세요. 바쁜 날은 건너뛰어도 제작 흐름에 전혀 지장이 없습니다.</p>
      </div>
    </div>
    ${reviewHtml}
    <div class="study-block-title">
      <h3>1단계 · 시청자 순서대로 듣고 읽으며 고치기 (노션 느낌)</h3>
      <span class="meta">문장에 마우스를 올리면 색이 바뀌며 고치기·질문 버튼이 나타납니다</span>
    </div>
    <div class="study-toolbar">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div class="study-seg">
          <button type="button" class="active" data-view-mode="spacious">한 문장씩 넓게</button>
          <button type="button" data-view-mode="compact">조금 촘촘하게</button>
        </div>
        <span class="meta">수정된 장면 <b id="study-edit-count">${editedCount}</b>곳</span>
      </div>
      <div>
        ${isDraft
          ? `<button type="button" id="btn-apply-study-script" class="study-btn primary"${editedCount ? '' : ' disabled'}>✨ 고친 문장 초안 대본에 반영</button>`
          : '<span class="meta">이미 승인된 시트 — 여기 수정은 내 학습·다음 편 말투 참고로만 안전하게 저장됩니다</span>'}
      </div>
    </div>
    <div class="notion-doc" id="study-notion-doc">${cutBlocksHtml}</div>

    <div class="study-block-title" style="margin-top:30px">
      <h3>2단계 · 핵심 단어 1:1 입모양 과외 (소리 듣고 딱 한 번 따라 하기)</h3>
      <span class="meta">‘아직 헷갈려요’를 누르면 다음 편 열 때 30초 복습으로 슬쩍 떠요</span>
    </div>
    ${wordsHtml}

    <div class="study-block-title" style="margin-top:26px">
      <h3>내가 막힌 부분 질문칸 (${lineQuestions.length + freeQuestions.length}개)</h3>
      <span class="meta">대본 문장에 단 질문과 자유 질문이 한곳에 모입니다</span>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <textarea id="study-free-q-input" class="study-textarea" rows="2" style="flex:1;min-width:min(260px,100%)" placeholder="이번 편을 보면서 이해가 안 되거나 궁금한 점을 편하게 적어 주세요."></textarea>
      <button type="button" id="btn-add-free-q" class="study-btn primary" style="align-self:flex-start">❓ 질문 남기기</button>
    </div>
    ${allAskedHtml || '<div class="meta" style="padding:4px 2px">아직 남긴 질문이 없습니다. 위 대본 문장에 마우스를 올려 <b>❓ 질문</b>을 누르거나 여기 자유롭게 적어 보세요.</div>'}

    <div class="study-block-title" style="margin-top:30px">
      <h3>3단계 · 시청자가 궁금해할 질문 10가지 (설명 기본 숨김)</h3>
      <span class="meta">정답을 맞히지 않아도 됩니다. 궁금한 것에 체크하거나 감이 오는 1~2개만 편하게 찍어 본 뒤 선생님 설명을 열어 보세요.</span>
    </div>
    ${viewerQHtml}
    ${addVqHtml}
    <div id="study-toast" class="study-toast" aria-live="polite"></div>
  </section>${clientScript}`;
}
