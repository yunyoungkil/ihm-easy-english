// 비교 시트 — 경쟁 영상 리포트를 우리 콘텐츠로 바꾸는 한 장(2026-11-12 사용자 설계).
// 문제: 경쟁 영상의 소재만 가져오고 제목·썸네일·훅·구성·화면의 "이유"는 옮기지 않았다(EP22~29 기획 15건 중 14건에 근거 기록 없음).
// 그래서 리포트 안에서 경쟁 쪽과 우리 쪽을 같은 행으로 나란히 놓고, 바꾼 이유를 항목마다 적는다.
//
// 저장: data/youtube/transform-sheets/<원본 영상ID>.json (깃에 올림), 우리 쪽 이미지는 images/<원본 영상ID>/ (깃에 올림 — 우리가 만든 그림)
// 원칙(사용자 결정):
//  - 경쟁 영상 한 편만 보지 않는다: 다른 잘된 리포트에서 가져온 것(borrowed)이 있어야 하고, 가져온 것마다 이유·근거를 적는다.
//  - 안 맞아서 뺀 것(rejected)도 이유와 함께 남긴다. 실패·기각도 데이터다.
//  - 우리 정체성은 고정하지 않는다: 시트마다 우리/경쟁 비율을 근거와 함께 정한다(확정 판정이 쌓이기 전에는 경쟁 쪽을 크게).
//  - 우리 쪽은 출시 수준 이미지로 만든다(경쟁은 이미 출시된 영상이라 비교가 같아야 한다).
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {findBannedTerms} from './banned-terms.mjs';

export const ROW_KEYS = Object.freeze(['title', 'thumbnail', 'opening', 'flow', 'visual', 'reaction', 'ending']);
export const ROW_LABELS = Object.freeze({
  title: '제목', thumbnail: '썸네일', opening: '첫 15초', flow: '전개', visual: '화면 연출', reaction: '시청자 반응 지점', ending: '끝맺음', package: '설명글·태그·고정 댓글',
});
/** 완성형(schemaVersion 2) 시트는 업로드 문구 칸까지 있어야 한다. */
export const rowKeysFor = (sheet) => (Number(sheet?.schemaVersion) >= 2 ? [...ROW_KEYS, 'package'] : ROW_KEYS);
export const MIN_TAGS = 8;

/** 설명글·태그·고정 댓글 칸: 셋 다 있고, 금지어가 없고, 대본이 "고정 댓글"을 약속하면 고정 댓글이 실제로 있어야 한다. */
function packageProblems(pkg, plan) {
  const out = [];
  if (!filled(pkg?.description)) out.push('설명글·태그·고정 댓글: 설명글이 없다');
  if (!Array.isArray(pkg?.tags) || pkg.tags.filter(filled).length < MIN_TAGS) out.push(`설명글·태그·고정 댓글: 태그가 ${MIN_TAGS}개 미만이다`);
  if (!filled(pkg?.pinnedComment)) out.push((plan?.cuts || []).some((c) => String(c.narration || '').includes('고정 댓글')) ? '설명글·태그·고정 댓글: 대본이 "고정 댓글에 있어요"라고 약속했는데 고정 댓글 내용이 없다' : '설명글·태그·고정 댓글: 고정 댓글이 없다');
  // 태그는 유튜브 검색창에 직접 쳐 본 것만 쓴다(2026-11-13 사용자): 검색 결과가 우리 영상과 뜻이 안 맞으면 뺀다.
  const checks = new Map((pkg?.tagCheck || []).map((c) => [c.tag, c]));
  for (const tag of (pkg?.tags || []).filter(filled)) {
    const c = checks.get(tag);
    if (!c || !filled(c.verdict)) out.push(`설명글·태그·고정 댓글: 태그 "${tag}"를 유튜브 검색창에서 확인한 기록(tagCheck)이 없다`);
    else if (c.verdict === '안 맞음') out.push(`설명글·태그·고정 댓글: 태그 "${tag}"는 검색 결과가 우리 영상과 안 맞는다(${c.reason || ''}) — 뺀다`);
  }
  for (const [name, text] of [['설명글', pkg?.description], ['태그', (pkg?.tags || []).join(' ')], ['고정 댓글', pkg?.pinnedComment]]) {
    const hits = findBannedTerms(String(text || ''));
    if (hits.length) out.push(`설명글·태그·고정 댓글: ${name}에 금지어(${hits.map((h) => h.term).join(', ')})가 있다`);
  }
  return out;
}
export const STATUSES = Object.freeze(['draft', 'approved', 'published']);

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const sheetsDir = join(projectDir, 'data', 'youtube', 'transform-sheets');

const filled = (v) => typeof v === 'string' && v.trim().length > 0;

/** 다른 경쟁 영상(원본이 아닌 영상)에서 가져온 것의 출처 영상 ID 목록. */
export function borrowedSources(sheet) {
  return [...new Set((sheet?.borrowed || []).map((b) => b.fromVideoId).filter((id) => filled(id) && id !== sheet.sourceVideoId))];
}

export function sheetStage(sheet) {
  if (sheet?.status === 'published' && sheet.outcome && sheet.outcome.views7d != null) return 'measured';
  return sheet?.status || 'draft';
}

/** 규칙을 어긴 곳을 문장으로 돌려준다. 빈 배열이면 통과. imageExists로 우리 쪽 이미지 파일 존재를 확인한다. */
export const MIN_CUT_SHARE = 0.5; // 우리 컷 수는 경쟁(1분당)의 절반 이상(2026-11-12 사용자: 그만큼은 아니더라도 조금은 맞춘다)

export const RHYTHM_MIN_CV = 0.15; // 컷 간격의 변동(표준편차÷평균)이 이보다 작으면 "전부 일정"
const RHYTHM_MIN_CUTS = 6;

/** 컷 시각 목록: cuts([{t,...}])가 있으면 거기서, 없으면 예전 형식 times에서. */
export function cutTimes(plan) {
  if (Array.isArray(plan?.cuts) && plan.cuts.length) return plan.cuts.map((c) => Number(c.t));
  return Array.isArray(plan?.times) ? plan.times.map(Number) : [];
}

/** 컷 간격이 거의 일정하면 문제를 문장으로(2026-11-12 사용자: 우리 컷은 전부 일정해서 리듬감이 없다). 컷이 적으면 보지 않는다. */
export function rhythmProblem(times) {
  if (!Array.isArray(times) || times.length < RHYTHM_MIN_CUTS) return null;
  const gaps = times.slice(1).map((t, k) => t - times[k]);
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
  if (mean > 0 && sd / mean < RHYTHM_MIN_CV) return `화면 연출: 컷 간격이 거의 일정하다(평균 ${Math.round(mean * 10) / 10}초, 변동 ${Math.round((sd / mean) * 100)}%) — 긴 컷과 짧은 컷이 섞인 리듬이 없다`;
  return null;
}

export const MAX_SYLLABLES_PER_SECOND = 7; // 쇼츠 낭독이 숨 가쁘지 않은 한도(한글 글자 수 ÷ 컷 길이). 이 이상이면 컷 이미지가 지나간 뒤에도 말이 남는다.
export const hangulSyllables = (text) => (String(text || '').match(/[가-힣]/g) || []).length;

/** 컷마다 길이(초): 다음 컷 시각까지, 마지막 컷은 영상 끝까지. */
export function cutDurations(plan) {
  const cuts = plan?.cuts || [];
  return cuts.map((c, i) => (i + 1 < cuts.length ? Number(cuts[i + 1].t) : Number(plan.durationSeconds)) - Number(c.t));
}

/** 전체 대본은 따로 쓰지 않고 컷 대본을 순서대로 이어서 만든다(컷 대본과 전체 대본이 어긋날 수 없다). */
export function fullScript(plan) {
  const lines = (plan?.cuts || []).filter((c) => filled(c.narration)).map((c) => ({t: Number(c.t), text: String(c.narration).trim()}));
  return {lines, text: lines.map((l) => l.text).join('\n')};
}

/** 대본 규칙(schemaVersion 2부터, 2026-11-13 사용자: 다음 비교 시트는 완성형으로 한 번에): 컷마다 대본, 영어로 시작 금지(TTS가 억양을 바꾼다), 컷 길이에 맞는 분량. */
function scriptProblems(plan) {
  const out = [];
  const durs = cutDurations(plan);
  (plan?.cuts || []).forEach((c, i) => {
    if (!filled(c.narration)) { out.push(`대본: ${c.t}초 컷에 대본(narration)이 없다`); return; }
    const text = String(c.narration).trim();
    if (/^[A-Za-z]/.test(text)) out.push(`대본: ${c.t}초 컷이 영어로 시작한다 — 한글 독음으로 쓴다(AI 음성이 억양을 바꾼다)`);
    const rate = hangulSyllables(text) / durs[i];
    if (durs[i] > 0 && rate > MAX_SYLLABLES_PER_SECOND) out.push(`대본: ${c.t}초 컷 대본이 너무 길다(1초에 ${Math.round(rate * 10) / 10}글자, 한도 ${MAX_SYLLABLES_PER_SECOND})`);
  });
  return out;
}

/** 컷 계획: {durationSeconds, cuts:[{t, template, image,...}] 또는 times:[초...]}. 시간 순서·길이 안, 컷마다 이미지, 리듬, 경쟁 컷 수의 절반 이상. */
function cutPlanProblems(plan, competitorPacing, imageExists, needScript = false) {
  const t = cutTimes(plan);
  if (!plan || !t.length || !(Number(plan.durationSeconds) > 0)) return ['화면 연출: 우리 쪽 컷 계획(몇 초에 장면이 바뀌는지)이 없다'];
  const out = [];
  if (t.some((x, i) => !Number.isFinite(x) || x < 0 || (i > 0 && x <= t[i - 1]))) out.push('화면 연출: 컷 계획이 시간 순서가 아니다');
  if (t.some((x) => x > Number(plan.durationSeconds))) out.push('화면 연출: 컷 계획이 영상 길이를 넘는다');
  for (const c of plan.cuts || []) {
    if (!filled(c.image)) out.push(`화면 연출: ${c.t}초 컷에 컷 이미지가 없다(글자로만 적은 컷 금지)`);
    else if (!imageExists(c.image)) out.push(`화면 연출: ${c.t}초 컷 이미지 파일이 없다(${c.image})`);
  }
  if (!out.length) {
    const r = rhythmProblem(t);
    if (r) out.push(r);
  }
  if (needScript && !out.length) out.push(...scriptProblems(plan));
  const comp = Number(competitorPacing?.perMinute);
  if (!out.length && Number.isFinite(comp) && comp > 0) {
    const ours = (t.length / Number(plan.durationSeconds)) * 60;
    if (ours < comp * MIN_CUT_SHARE) out.push(`화면 연출: 우리 컷이 1분에 ${Math.round(ours * 10) / 10}번으로 경쟁(${comp}번)의 절반 미만이다`);
  }
  return out;
}

export function validateSheet(sheet, {imageExists = () => true, competitorPacing = null} = {}) {
  const problems = [];
  if (!filled(sheet?.sourceVideoId)) problems.push('원본 경쟁 영상 ID가 없다');
  if (!filled(sheet?.topic)) problems.push('우리 소재가 없다');
  if (!STATUSES.includes(sheet?.status)) problems.push(`상태가 ${STATUSES.join('/')} 중 하나가 아니다`);

  const share = sheet?.identityShare;
  if (!share || Number(share.ours) + Number(share.competitor) !== 100) problems.push('정체성 비율(우리+경쟁)의 합이 100이 아니다');
  if (!filled(share?.reason)) problems.push('정체성 비율의 근거가 없다');

  for (const key of rowKeysFor(sheet)) {
    const r = (sheet?.rows || []).find((x) => x.key === key);
    if (!r) { problems.push(`항목 ${key}(${ROW_LABELS[key]})이 없다`); continue; }
    if (key === 'package') {
      problems.push(...packageProblems(r.ours, (sheet.rows || []).find((x) => x.key === 'visual')?.ours?.cutPlan));
      if (!filled(r.why)) problems.push(`${ROW_LABELS[key]}: 바꾼 이유가 없다`);
      continue;
    }
    if (!filled(r.competitor?.text)) problems.push(`${ROW_LABELS[key]}: 경쟁 쪽 내용이 비어 있다`);
    if (!filled(r.ours?.text)) problems.push(`${ROW_LABELS[key]}: 우리 쪽 내용이 비어 있다`);
    if (!filled(r.why)) problems.push(`${ROW_LABELS[key]}: 바꾼 이유가 없다`);
    if (key === 'visual') problems.push(...cutPlanProblems(r.ours?.cutPlan, competitorPacing, imageExists, Number(sheet?.schemaVersion) >= 2));
    for (const img of [r.ours?.image, ...(r.ours?.images || [])].filter(filled)) {
      if (!imageExists(img)) problems.push(`${ROW_LABELS[key]}: 우리 쪽 이미지 파일이 없다(${img})`);
    }
  }

  if (!borrowedSources(sheet).length) problems.push('다른 경쟁 영상에서 가져온 것이 하나도 없다 — 영상 한 편만 보고 만들면 안 된다');
  for (const b of sheet?.borrowed || []) {
    if (!filled(b.fromVideoId) || b.fromVideoId === sheet.sourceVideoId) problems.push(`가져온 것(${String(b.what).slice(0, 20)})의 출처가 원본이거나 비어 있다 — 다른 경쟁 영상이어야 한다`);
    if (!filled(b.reason)) problems.push(`가져온 것(${String(b.what).slice(0, 20)})에 가져와도 되는 이유가 없다`);
    if (!filled(b.evidence)) problems.push(`가져온 것(${String(b.what).slice(0, 20)})에 근거(출처·표본 수)가 없다`);
  }
  for (const r of sheet?.rejected || []) {
    if (!filled(r.reason)) problems.push(`뺀 것(${String(r.what).slice(0, 20)})에 뺀 이유가 없다`);
  }
  problems.push(...experimentProblems(sheet), ...evidenceProblems(sheet));
  return problems;
}

/** 3판(schemaVersion 3, 2026-11-13 사용자: 규칙은 기본값이고 컨셉은 시험한다): 이번에 시험하는 변수와 용어 풀이 칸. */
export function experimentProblems(sheet) {
  const out = [];
  if (Number(sheet?.schemaVersion) < 3) return out;
  const vars = sheet?.testVariables;
  if (!Array.isArray(vars) || vars.length < 1 || vars.length > 2) {
    out.push('시험 변수(testVariables)가 1~2개 있어야 한다 — 한 번에 많이 바꾸면 무엇이 효과였는지 알 수 없다. 나머지는 기본값(knowledge/rule-tiers.md)');
  } else {
    for (const v of vars) {
      if (!filled(v?.variable) || !filled(v?.hypothesis) || !filled(v?.measure)) out.push('시험 변수에는 variable(무엇을 시험하나), hypothesis(왜 그럴 것 같은지, 근거 포함), measure(어느 지표로 볼지)가 모두 있어야 한다');
    }
  }
  if (!Array.isArray(sheet?.glossary)) {
    out.push('용어 풀이(glossary) 칸이 없다 — 경쟁 영상에 전문용어가 없으면 빈 배열로 둔다');
  } else {
    for (const g of sheet.glossary) {
      if (!filled(g?.term) || !filled(g?.plain)) out.push('용어 풀이에는 term(경쟁 쪽 용어)과 plain(쉬운 말)이 모두 있어야 한다');
    }
  }
  return out;
}

/** 근거 기록(borrowed[].evidenceLog, 2026-11-13): 결과가 쌓이는 칸. 비어 있어도 되고, 있으면 날짜·영상·지표·값·결과가 모두 있어야 한다. */
export const EVIDENCE_METRICS = Object.freeze(['views7d', 'watchSeconds7d', 'subs7d']);
export const EVIDENCE_RESULTS = Object.freeze(['갱신 기준 초과', '기준선 위, 편차 안(갱신 아님)', '기준선 이하', '기준선 없음']);
export function evidenceProblems(sheet) {
  const out = [];
  for (const b of sheet?.borrowed || []) {
    for (const e of b.evidenceLog || []) {
      const where = `가져온 것(${String(b.what).slice(0, 20)})의 근거 기록`;
      if (!filled(e?.date) || !filled(e?.videoId)) out.push(`${where}에 날짜나 영상 ID가 없다`);
      else if (!EVIDENCE_METRICS.includes(e.metric)) out.push(`${where}의 지표(${e.metric})가 ${EVIDENCE_METRICS.join('/')} 중 하나가 아니다`);
      else if (!Number.isFinite(Number(e.value)) && e.value !== null) out.push(`${where}의 값이 숫자가 아니다`);
      else if (!EVIDENCE_RESULTS.includes(e.result)) out.push(`${where}의 결과(${e.result})가 정해진 말이 아니다`);
    }
  }
  return out;
}

export function loadSheets(dir = sheetsDir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return JSON.parse(readFileSync(join(dir, f), 'utf8').replace(/^﻿/, '')); } catch { return null; }
  }).filter(Boolean);
}

export const sheetImageExists = (rel) => existsSync(join(sheetsDir, rel));

/** 제목 후보 선택: 시트의 제목 줄 `ours.titles`에 있는 문장만 고를 수 있다. */
export function setTitlePick(sheet, title, picked) {
  const allowed = ((sheet.rows || []).find((r) => r.key === 'title')?.ours?.titles || []).filter(Boolean);
  if (!allowed.includes(title)) throw new Error('이 시트의 제목 후보가 아닙니다');
  const now = new Set(sheet.titlePicks || []);
  if (picked) now.add(title); else now.delete(title);
  return {...sheet, titlePicks: allowed.filter((x) => now.has(x))};
}

/** 썸네일 시안 선택(체크박스) 저장: 시트의 썸네일 줄에 실제로 있는 이미지만 고를 수 있다. 사용자 승인 지점이라 사람이 누른 값만 기록한다. */
export function setThumbnailPick(sheet, image, picked) {
  const row = (sheet.rows || []).find((r) => r.key === 'thumbnail');
  const allowed = [row?.ours?.image, ...(row?.ours?.images || [])].filter(Boolean);
  if (!allowed.includes(image)) throw new Error('이 시트의 썸네일 시안이 아닙니다');
  const now = new Set(sheet.thumbnailPicks || []);
  if (picked) now.add(image); else now.delete(image);
  return {...sheet, thumbnailPicks: allowed.filter((x) => now.has(x))};
}
