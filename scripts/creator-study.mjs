// 대표님 1:1 발음 과외방 데이터 관리 모듈 (2026-11-26 확정)
// 결정 문서: knowledge/decisions/2026-11-26-creator-study-and-voice-loop.md
// 원칙:
//  - 기존 비교 시트 승인 관문(Gate 1)과 제작 워크플로우를 절대 막지 않는다(완전 분리·선택).
//  - 데이터는 data/youtube/creator-study/<sheetId>.json 에 별도 저장한다.
//  - 대본 수정·질문·핵심 단어 체감·시청자 질문 10가지 반응은 대표님 개인 학습용이며,
//    슬로건에 따라 알짜 재료만 선택적으로 다음 기획 입력(next-episode-input.md)과 대본에 녹인다.

import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
export const DEFAULT_STUDY_DIR = join(ROOT_DIR, 'data', 'youtube', 'creator-study');

export const WORD_STATUSES = Object.freeze(['unseen', 'got_it', 'still_fuzzy']);
export const SAFE_SHEET_ID_RE = /^[\w-]{3,60}$/;

const cleanText = (v, max = 2000) => String(v ?? '').trim().slice(0, max);

/** 한국어·영어 문장을 읽기 좋은 문장 단위로 나눈다(따옴표·말줄임표 보호). */
export function splitIntoSentences(text) {
  const raw = String(text ?? '').trim();
  if (!raw) return [];
  const paragraphs = raw.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const para of paragraphs) {
    // 마침표·물음표·느낌표(닫는 따옴표 포함) 뒤 공백에서 분리
    const parts = para
      .split(/(?<=[.?!…]["'”’)]?)\s+(?=\S)/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) out.push(...parts);
    else out.push(para);
  }
  return out;
}

/** 컷의 원어민 영어 발화 목록을 깔끔한 문자열 배열로 정규화한다. */
export function extractCutEnglish(cut) {
  const v = cut?.voiceEn;
  if (!v) return [];
  const arr = Array.isArray(v) ? v : [v];
  return arr
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') return String(item.text || item.word || item.en || '').trim();
      return '';
    })
    .filter(Boolean);
}

/** 빈 학습 데이터 틀을 만든다. */
export function createEmptyStudy(sheetId) {
  return {
    schemaVersion: 1,
    sheetId: String(sheetId || ''),
    updatedAt: null,
    scriptEdits: {},
    lineQuestions: [],
    freeQuestions: [],
    focusWords: [],
    viewerQuestions: [],
  };
}

/** 학습 JSON을 정규화해 깨진 필드를 안전하게 보정한다. */
export function normalizeStudy(sheetId, raw = null) {
  const base = createEmptyStudy(sheetId);
  if (!raw || typeof raw !== 'object') return base;

  const scriptEdits = {};
  if (raw.scriptEdits && typeof raw.scriptEdits === 'object') {
    for (const [k, v] of Object.entries(raw.scriptEdits)) {
      if (!/^\d+$/.test(String(k))) continue;
      const t = cleanText(v, 4000);
      if (t) scriptEdits[String(k)] = t;
    }
  }

  const normalizeThread = (arr) => (Array.isArray(arr) ? arr : [])
    .map((t) => {
      if (!t || typeof t !== 'object') return null;
      const role = t.role === 'teacher' ? 'teacher' : 'student';
      const text = cleanText(t.text, 4000);
      if (!text) return null;
      return {role, text, createdAt: t.createdAt ? String(t.createdAt) : null};
    })
    .filter(Boolean)
    .slice(-16);

  const normalizeQ = (item, idx, prefix) => {
    if (!item || typeof item !== 'object') return null;
    const question = cleanText(item.question, 1000);
    if (!question) return null;
    const out = {
      id: cleanText(item.id, 60) || `${prefix}-${idx + 1}`,
      question,
      answer: cleanText(item.answer, 4000),
      thread: normalizeThread(item.thread),
      resolved: Boolean(item.resolved),
      createdAt: item.createdAt ? String(item.createdAt) : null,
    };
    if (prefix === 'lq') {
      out.cutIndex = Number.isInteger(Number(item.cutIndex)) ? Number(item.cutIndex) : 0;
      out.sentenceIndex = Number.isInteger(Number(item.sentenceIndex)) ? Number(item.sentenceIndex) : 0;
      out.excerpt = cleanText(item.excerpt, 160);
    }
    return out;
  };

  const lineQuestions = (Array.isArray(raw.lineQuestions) ? raw.lineQuestions : [])
    .map((x, i) => normalizeQ(x, i, 'lq'))
    .filter(Boolean);
  const freeQuestions = (Array.isArray(raw.freeQuestions) ? raw.freeQuestions : [])
    .map((x, i) => normalizeQ(x, i, 'fq'))
    .filter(Boolean);

  const focusWords = (Array.isArray(raw.focusWords) ? raw.focusWords : [])
    .map((w) => {
      if (!w || typeof w !== 'object') return null;
      const word = cleanText(w.word, 120);
      if (!word) return null;
      const status = WORD_STATUSES.includes(w.status) ? w.status : 'unseen';
      return {
        word,
        phoneticHint: cleanText(w.phoneticHint, 160),
        mouthTip: cleanText(w.mouthTip, 400),
        status,
        note: cleanText(w.note, 400),
      };
    })
    .filter(Boolean);

  const viewerQuestions = (Array.isArray(raw.viewerQuestions) ? raw.viewerQuestions : [])
    .map((vq, idx) => {
      if (!vq || typeof vq !== 'object') return null;
      const q = cleanText(vq.q, 400);
      if (!q) return null;
      return {
        id: cleanText(vq.id, 60) || `vq-${idx + 1}`,
        q,
        source: cleanText(vq.source, 120),
        teacherAnswer: cleanText(vq.teacherAnswer, 1200),
        curious: Boolean(vq.curious),
        guess: cleanText(vq.guess, 500),
        guessFeedback: cleanText(vq.guessFeedback, 2000),
        thread: normalizeThread(vq.thread),
        revealed: Boolean(vq.revealed),
      };
    })
    .filter(Boolean)
    .slice(0, 10);

  return {
    schemaVersion: 1,
    sheetId: String(sheetId || raw.sheetId || ''),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : null,
    scriptEdits,
    lineQuestions,
    freeQuestions,
    focusWords,
    viewerQuestions,
  };
}

export function studyFilePath(sheetId, studyDir = DEFAULT_STUDY_DIR) {
  if (!SAFE_SHEET_ID_RE.test(String(sheetId || ''))) {
    throw new Error('시트 ID 형식이 올바르지 않습니다.');
  }
  return join(studyDir, `${sheetId}.json`);
}

export function loadCreatorStudy(sheetId, studyDir = DEFAULT_STUDY_DIR) {
  try {
    const file = studyFilePath(sheetId, studyDir);
    if (!existsSync(file)) return createEmptyStudy(sheetId);
    const parsed = JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
    return normalizeStudy(sheetId, parsed);
  } catch {
    return createEmptyStudy(sheetId);
  }
}

export function saveCreatorStudy(sheetId, data, studyDir = DEFAULT_STUDY_DIR, now = new Date()) {
  const file = studyFilePath(sheetId, studyDir);
  mkdirSync(dirname(file), {recursive: true});
  const normalized = normalizeStudy(sheetId, data);
  normalized.updatedAt = now.toISOString();
  writeFileSync(file, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
  return normalized;
}

export function loadAllCreatorStudies(studyDir = DEFAULT_STUDY_DIR) {
  if (!existsSync(studyDir)) return [];
  const out = [];
  for (const f of readdirSync(studyDir)) {
    if (!f.endsWith('.json')) continue;
    const sid = f.slice(0, -5);
    if (!SAFE_SHEET_ID_RE.test(sid)) continue;
    out.push(loadCreatorStudy(sid, studyDir));
  }
  return out;
}

/**
 * 비교 시트의 컷 대본 + 원어민 영어를 시청자가 실제로 듣는 순서대로 문장 블록화한다.
 * 기존 시트 컷 대본은 수정하지 않고, 대표님 수정본이 있으면 표시·되돌리기 정보와 함께 반환한다.
 */
export function buildViewerScriptBlocks(sheet, study = null) {
  const visual = (sheet?.rows || []).find((r) => r.key === 'visual');
  const cuts = visual?.ours?.cutPlan?.cuts || [];
  const edits = study?.scriptEdits || {};
  return cuts.map((cut, cutIndex) => {
    const originalNarration = String(cut?.narration || '').trim();
    const edited = edits[String(cutIndex)];
    const currentNarration = edited !== undefined && edited !== '' ? edited : originalNarration;
    const isEdited = Boolean(edited !== undefined && edited !== '' && edited !== originalNarration);
    const english = extractCutEnglish(cut);
    const sentences = splitIntoSentences(currentNarration);
    return {
      cutIndex,
      t: Number(cut?.t ?? 0),
      english,
      originalNarration,
      currentNarration,
      isEdited,
      sentences,
    };
  });
}

/**
 * 이번 편 핵심 단어 3~5개 목록을 반환한다.
 * 저장된 focusWords(입모양 과외 포함)가 있으면 우선 쓰고, 없으면 시트의 voiceEn에서 자동 추출한다.
 */
export function resolveFocusWords(sheet, study = null, {maxWords = 5} = {}) {
  const saved = Array.isArray(study?.focusWords) ? study.focusWords : [];
  if (saved.length) return saved;
  const visual = (sheet?.rows || []).find((r) => r.key === 'visual');
  const cuts = visual?.ours?.cutPlan?.cuts || [];
  const seen = new Set();
  const auto = [];
  for (const cut of cuts) {
    for (const en of extractCutEnglish(cut)) {
      const key = en.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      auto.push({
        word: en,
        phoneticHint: '',
        mouthTip: '소리 버튼을 먼저 듣고, 천천히 한 번 따라 말해 보세요. 막히거나 헷갈리면 아래 버튼을 눌러 두세요.',
        status: 'unseen',
        note: '',
      });
      if (auto.length >= maxWords) return auto;
    }
  }
  return auto;
}

/**
 * 다른 편에서 대표님이 '아직 헷갈려요'로 남긴 단어 또는 '나도 궁금해' 체크한 질문을
 * 시작 30초 복습 카드로 최대 maxItems개(기본 2개)만 가볍게 뽑아 온다.
 */
export function collectReviewItems(currentSheetId, allStudies = [], {maxItems = 2} = {}) {
  const candidates = [];
  const others = [...allStudies]
    .filter((s) => s && s.sheetId && s.sheetId !== currentSheetId)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  for (const st of others) {
    for (const w of st.focusWords || []) {
      if (w.status === 'still_fuzzy') {
        candidates.push({
          kind: 'word',
          sheetId: st.sheetId,
          word: w.word,
          phoneticHint: w.phoneticHint || '',
          mouthTip: w.mouthTip || '',
          note: w.note || '',
          updatedAt: st.updatedAt || '',
        });
      }
    }
  }
  for (const st of others) {
    for (const vq of st.viewerQuestions || []) {
      if (vq.curious && !vq.revealed) {
        candidates.push({
          kind: 'question',
          sheetId: st.sheetId,
          questionId: vq.id,
          q: vq.q,
          teacherAnswer: vq.teacherAnswer || '',
          updatedAt: st.updatedAt || '',
        });
      }
    }
  }
  return candidates.slice(0, maxItems);
}

/**
 * draft 시트에서 대표님이 노션 느낌 편집기로 고친 문장을 실제 컷 대본(narration)에 반영한다.
 * 승인/공개된 시트는 안전을 위해 차단한다.
 */
export function applyStudyEditsToSheet(sheet, study) {
  if (!sheet || typeof sheet !== 'object') throw new Error('비교 시트가 없습니다.');
  if (sheet.status !== 'draft') {
    throw new Error('이미 승인되거나 공개된 시트의 대본은 여기서 덮어쓸 수 없습니다(초안 시트만 가능).');
  }
  const edits = study?.scriptEdits || {};
  const next = JSON.parse(JSON.stringify(sheet));
  const visual = (next.rows || []).find((r) => r.key === 'visual');
  const cuts = visual?.ours?.cutPlan?.cuts || [];
  let appliedCount = 0;
  for (const [key, val] of Object.entries(edits)) {
    const idx = Number(key);
    if (!Number.isInteger(idx) || idx < 0 || idx >= cuts.length) continue;
    const text = cleanText(val, 4000);
    if (!text || text === String(cuts[idx].narration || '').trim()) continue;
    cuts[idx].narration = text;
    appliedCount += 1;
  }
  return {sheet: next, appliedCount};
}

/**
 * 과외방 학습 기록에 부분 업데이트(patch)를 안전하게 적용한다.
 */
export function patchCreatorStudy(current, patch = {}) {
  const next = normalizeStudy(current.sheetId, current);

  if (patch.action === 'set_cut_edit') {
    const idx = String(Number(patch.cutIndex));
    if (!/^\d+$/.test(idx)) throw new Error('컷 번호가 올바르지 않습니다.');
    const text = cleanText(patch.text, 4000);
    const orig = cleanText(patch.originalText, 4000);
    if (!text || (orig && text === orig)) {
      delete next.scriptEdits[idx];
    } else {
      next.scriptEdits[idx] = text;
    }
    return next;
  }

  if (patch.action === 'reset_cut_edit') {
    const idx = String(Number(patch.cutIndex));
    delete next.scriptEdits[idx];
    return next;
  }

  if (patch.action === 'add_line_question') {
    const question = cleanText(patch.question, 1000);
    if (!question) throw new Error('질문 내용을 입력해 주세요.');
    next.lineQuestions.push({
      id: cleanText(patch.id, 60) || `lq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cutIndex: Number.isInteger(Number(patch.cutIndex)) ? Number(patch.cutIndex) : 0,
      sentenceIndex: Number.isInteger(Number(patch.sentenceIndex)) ? Number(patch.sentenceIndex) : 0,
      excerpt: cleanText(patch.excerpt, 160),
      question,
      answer: cleanText(patch.answer, 2000),
      thread: [],
      resolved: false,
      createdAt: new Date().toISOString(),
    });
    return next;
  }

  if (patch.action === 'delete_line_question') {
    const id = cleanText(patch.id, 60);
    next.lineQuestions = next.lineQuestions.filter((q) => q.id !== id);
    return next;
  }

  if (patch.action === 'toggle_line_question_resolved') {
    const id = cleanText(patch.id, 60);
    const target = next.lineQuestions.find((q) => q.id === id);
    if (target) target.resolved = !target.resolved;
    return next;
  }

  if (patch.action === 'add_free_question') {
    const question = cleanText(patch.question, 1000);
    if (!question) throw new Error('질문 내용을 입력해 주세요.');
    next.freeQuestions.push({
      id: cleanText(patch.id, 60) || `fq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      question,
      answer: cleanText(patch.answer, 4000),
      thread: [],
      resolved: false,
      createdAt: new Date().toISOString(),
    });
    return next;
  }

  if (patch.action === 'set_question_answer') {
    const id = cleanText(patch.id, 60);
    const list = patch.kind === 'line' ? next.lineQuestions : next.freeQuestions;
    const target = list.find((q) => q.id === id);
    if (!target) throw new Error('답변할 질문을 찾지 못했습니다.');
    target.answer = cleanText(patch.answer, 4000);
    return next;
  }

  if (patch.action === 'append_question_thread') {
    const id = cleanText(patch.id, 60);
    const studentText = cleanText(patch.question, 1000);
    const teacherText = cleanText(patch.answer, 4000);
    if (!studentText) throw new Error('꼬리 질문을 입력해 주세요.');
    const list = patch.kind === 'line'
      ? next.lineQuestions
      : (patch.kind === 'viewer' ? next.viewerQuestions : next.freeQuestions);
    const target = list.find((q) => q.id === id);
    if (!target) throw new Error('이어서 물어볼 질문을 찾지 못했습니다.');
    if (!Array.isArray(target.thread)) target.thread = [];
    const nowIso = new Date().toISOString();
    target.thread.push({role: 'student', text: studentText, createdAt: nowIso});
    if (teacherText) target.thread.push({role: 'teacher', text: teacherText, createdAt: nowIso});
    return next;
  }

  if (patch.action === 'delete_free_question') {
    const id = cleanText(patch.id, 60);
    next.freeQuestions = next.freeQuestions.filter((q) => q.id !== id);
    return next;
  }

  if (patch.action === 'update_question_thread_turn') {
    const id = cleanText(patch.id, 60);
    const turnIndex = Number(patch.turnIndex);
    const text = cleanText(patch.text, 4000);
    const list = patch.kind === 'line'
      ? next.lineQuestions
      : (patch.kind === 'viewer' ? next.viewerQuestions : next.freeQuestions);
    const target = list.find((q) => q.id === id);
    if (!target) throw new Error('대화를 찾지 못했습니다.');
    if (Array.isArray(target.thread) && turnIndex >= 0 && turnIndex < target.thread.length) {
      target.thread[turnIndex].text = text;
    }
    return next;
  }

  if (patch.action === 'delete_question_thread_pair') {
    const id = cleanText(patch.id, 60);
    const studentIdx = Number(patch.studentIndex);
    const list = patch.kind === 'line'
      ? next.lineQuestions
      : (patch.kind === 'viewer' ? next.viewerQuestions : next.freeQuestions);
    const target = list.find((q) => q.id === id);
    if (!target) throw new Error('대화를 찾지 못했습니다.');
    if (Array.isArray(target.thread) && studentIdx >= 0 && studentIdx < target.thread.length) {
      // student 발언과 그 바로 뒤따르는 teacher 답변(있으면)을 한 세트로 함께 삭제
      let deleteCount = 1;
      if (studentIdx + 1 < target.thread.length && target.thread[studentIdx + 1].role === 'teacher') {
        deleteCount = 2;
      }
      target.thread.splice(studentIdx, deleteCount);
    }
    return next;
  }

  if (patch.action === 'toggle_free_question_resolved') {
    const id = cleanText(patch.id, 60);
    const target = next.freeQuestions.find((q) => q.id === id);
    if (target) target.resolved = !target.resolved;
    return next;
  }

  if (patch.action === 'update_focus_word') {
    const word = cleanText(patch.word, 120);
    if (!word) throw new Error('단어가 비어 있습니다.');
    const status = WORD_STATUSES.includes(patch.status) ? patch.status : undefined;
    let target = next.focusWords.find((w) => w.word.toLowerCase() === word.toLowerCase());
    if (!target) {
      target = {
        word,
        phoneticHint: cleanText(patch.phoneticHint, 160),
        mouthTip: cleanText(patch.mouthTip, 400),
        status: status || 'unseen',
        note: '',
      };
      next.focusWords.push(target);
    }
    if (status) target.status = status;
    if (patch.note !== undefined) target.note = cleanText(patch.note, 400);
    return next;
  }

  if (patch.action === 'update_viewer_question') {
    const id = cleanText(patch.id, 60);
    const target = next.viewerQuestions.find((vq) => vq.id === id);
    if (!target) throw new Error('해당 질문을 찾지 못했습니다.');
    if (patch.curious !== undefined) target.curious = Boolean(patch.curious);
    if (patch.guess !== undefined) target.guess = cleanText(patch.guess, 500);
    if (patch.guessFeedback !== undefined) target.guessFeedback = cleanText(patch.guessFeedback, 2000);
    if (patch.revealed !== undefined) target.revealed = Boolean(patch.revealed);
    return next;
  }

  if (patch.action === 'add_viewer_question') {
    const q = cleanText(patch.q, 400);
    if (!q) throw new Error('질문을 입력해 주세요.');
    if (next.viewerQuestions.length >= 10) throw new Error('시청자 질문은 최대 10개까지입니다.');
    next.viewerQuestions.push({
      id: `vq-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      q,
      source: cleanText(patch.source, 120) || '대표님 직접 추가',
      teacherAnswer: cleanText(patch.teacherAnswer, 1200),
      curious: true,
      guess: cleanText(patch.guess, 500),
      revealed: false,
    });
    return next;
  }

  throw new Error(`알 수 없는 학습 저장 요청입니다: ${String(patch.action || '')}`);
}

/**
 * 다음 기획 입력(next-episode-input.md)용 비차단 요약.
 * 대표님이 1번 학생으로 배우며 남긴 막힘·궁금증·말투 중 알짜 재료를 정리한다.
 */
export function summarizeCreatorStudy(studyDir = DEFAULT_STUDY_DIR) {
  const all = loadAllCreatorStudies(studyDir)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  const fuzzyWords = [];
  const curiousQuestions = [];
  const openQuestions = [];
  const recentEdits = [];

  for (const st of all) {
    for (const w of st.focusWords || []) {
      if (w.status === 'still_fuzzy') {
        fuzzyWords.push({sheetId: st.sheetId, word: w.word, note: w.note || ''});
      }
    }
    for (const vq of st.viewerQuestions || []) {
      if (vq.curious) {
        curiousQuestions.push({sheetId: st.sheetId, q: vq.q, guess: vq.guess || ''});
      }
    }
    for (const lq of [...(st.lineQuestions || []), ...(st.freeQuestions || [])]) {
      if (!lq.resolved) {
        openQuestions.push({sheetId: st.sheetId, question: lq.question, hasAnswer: Boolean(lq.answer)});
      }
    }
    for (const [cutIdx, text] of Object.entries(st.scriptEdits || {})) {
      if (recentEdits.length < 6) {
        recentEdits.push({sheetId: st.sheetId, cutIndex: Number(cutIdx), text: String(text).slice(0, 120)});
      }
    }
  }

  return {
    totalFiles: all.length,
    fuzzyWords: fuzzyWords.slice(0, 10),
    curiousQuestions: curiousQuestions.slice(0, 10),
    openQuestions: openQuestions.slice(0, 10),
    recentEdits,
  };
}
