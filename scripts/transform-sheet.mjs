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
import {USUAL_RESULTS} from './baseline.mjs';

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
/** 행마다 이 칸이 어디서 왔는지: competitor = 경쟁 영상의 구조를 가져옴, mixed = 섞음, ours = 우리가 새로 만듦 */
export const ORIGINS = Object.freeze(['competitor', 'mixed', 'ours']);
export const usesRowOrigins = (sheet) => (sheet?.rows || []).some((r) => r && r.origin !== undefined);
/** 행 출처를 센다(사람이 비율을 정하지 않는다). total은 출처가 적힌 행 수 */
export function sheetOrigins(sheet) {
  const out = {competitor: 0, mixed: 0, ours: 0, total: 0};
  for (const r of sheet?.rows || []) if (ORIGINS.includes(r?.origin)) { out[r.origin] += 1; out.total += 1; }
  return out;
}
/** 시트 식별자: v4 다중 레퍼런스 시트는 episodeId(예: ep31-shorts-stress), 기존 시트는 sourceVideoId를 쓴다. */
export const sheetIdOf = (sheet) => String(sheet?.episodeId || sheet?.sourceVideoId || '').trim();
export const isSloganV4 = (sheet) => Number(sheet?.schemaVersion) >= 4;

/**
 * 가져온 것이 "어디에 쓰였는지"(appliedTo)를 적게 한다(2026-11-16 사용자: 근거로 가져왔으면 썸네일·화면·제목에 꼭 적용해야지, 보여주기식이면 쓸모없다).
 * 표기: cut:N(컷 번호, 0부터), thumb:A 또는 thumb:1(썸네일 시안), title:N(제목 후보 번호, 1부터), row:key(행). 실제로 있는 것만 통과한다.
 */
export function appliedProblems(sheet) {
  const out = [];
  if (!usesRowOrigins(sheet) && !isSloganV4(sheet)) return out;
  const cuts = (sheet.rows || []).find((r) => r.key === 'visual')?.ours?.cutPlan?.cuts || [];
  const thumbRow = (sheet.rows || []).find((r) => r.key === 'thumbnail')?.ours || {};
  const thumbs = [thumbRow.image, ...(thumbRow.images || [])].filter(Boolean);
  const titles = (sheet.rows || []).find((r) => r.key === 'title')?.ours?.titles || [];
  const check = (token, where) => {
    const m = String(token).match(/^(cut|thumb|title|row):(.+)$/);
    if (!m) return out.push(`${where}: 적용한 곳 "${token}"의 형식이 cut:N / thumb:A / title:N / row:key가 아니다`);
    const [, kind, v] = m;
    if (kind === 'cut' && !(Number.isInteger(Number(v)) && Number(v) >= 0 && Number(v) < cuts.length)) out.push(`${where}: 컷 ${v}번은 없다(컷 ${cuts.length}개)`);
    if (kind === 'thumb') {
      const idx = Number(v);
      const matchByName = thumbs.some((p) => p.endsWith(`thumb-${v}.jpg`) || p.endsWith(`thumb-${v}.png`) || p.endsWith(`/${v}`));
      const matchByIdx = Number.isInteger(idx) && idx >= 1 && idx <= thumbs.length;
      if (!matchByName && !matchByIdx) out.push(`${where}: 썸네일 시안 ${v}가 없다`);
    }
    if (kind === 'title' && !(Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= titles.length)) out.push(`${where}: 제목 후보 ${v}번은 없다`);
    if (kind === 'row' && !(sheet.rows || []).some((r) => r.key === v)) out.push(`${where}: 행 ${v}이 없다`);
  };
  const items = [
    ...(sheet.borrowed || []).map((b) => [`가져온 것(${String(b.what).slice(0, 18)})`, b.appliedTo]),
    ...(sheet.sourceApplied || []).map((b) => [`원본에서 가져온 것(${String(b.what).slice(0, 18)})`, b.appliedTo]),
    ...(sheet.references || []).map((r) => [`명작 레퍼런스(${String(r.what || r.role || r.videoId).slice(0, 18)})`, r.appliedTo]),
  ];
  for (const [where, applied] of items) {
    if (!Array.isArray(applied) || !applied.length) out.push(`${where}: 어디에 적용했는지(appliedTo)가 없다 — 보여주기식으로 가져오면 안 된다`);
    else applied.forEach((tk) => check(tk, where));
  }
  return out;
}

/** Korean Skills 구어체 입말 규칙(2026-11-17 사용자 확정): 나레이션에서 '4글자·5글자·1박자' 같은 아라비아 숫자 표기를 막는다. */
export const SPOKEN_DIGIT_RE = /\d+\s*(글자|박자|마디|개|번|가지|명|초)/g;
export function spokenKoreanProblems(plan) {
  const out = [];
  (plan?.cuts || []).forEach((c, i) => {
    const text = String(c?.narration || '').trim();
    if (!text) return;
    const where = `대본 ${i}번 컷(${c.t}초)`;
    const digitHits = text.match(SPOKEN_DIGIT_RE);
    if (digitHits) out.push(`${where}: 나레이션에 아라비아 숫자 입말(${digitHits.join(', ')}) 금지 — '네 글자', '다섯 글자', '한 박자'처럼 고유어 입말로 적는다`);
    if (/^[A-Za-z]/.test(text)) out.push(`${where}: 나레이션이 영어로 시작한다 — 한글로 자연스럽게 시작한다`);
    const banned = findBannedTerms(text);
    if (banned.length) out.push(`${where}: 금지어(${banned.map((h) => h.term).join(', ')})가 있다`);
  });
  return out;
}

/** v4(슬로건 업그레이드) AI 자체 비평(Self-Critique) 필수 검사(2026-11-19). */
export function selfCritiqueProblems(sheet) {
  const out = [];
  if (!isSloganV4(sheet)) return out;
  const sc = sheet?.selfCritique;
  if (!sc || typeof sc !== 'object') {
    out.push('AI 자체 비평(selfCritique)이 없다 — 제출 전 템플릿 탈피·진화·융합 점검이 필수다');
    return out;
  }
  if (!filled(sc.antiTemplate)) out.push('AI 자체 비평: antiTemplate(AI 템플릿 냄새 탈피 근거)이 비어 있다');
  if (!filled(sc.evolutionFromPrev)) out.push('AI 자체 비평: evolutionFromPrev(직전 편 대비 진화 지점)이 비어 있다');
  if (!filled(sc.fusionCheck)) out.push('AI 자체 비평: fusionCheck(명작 장치 융합 검증)이 비어 있다');
  return out;
}

/** AI 1순위 제목·썸네일 추천 조합(aiRecommendation, 2026-11-20 사용자 요청) 검사. 기존 시트 호환을 위해 필드가 있을 때만 검사한다. */
export function aiRecommendationProblems(sheet, {imageExists = null} = {}) {
  const out = [];
  const rec = sheet?.aiRecommendation;
  if (rec === undefined || rec === null) return out;
  if (typeof rec !== 'object') return ['AI 추천 조합(aiRecommendation)은 객체여야 한다'];
  if (!filled(rec.title)) out.push('AI 추천 조합: 추천 제목(title)이 비어 있다');
  if (!filled(rec.thumbnail)) out.push('AI 추천 조합: 추천 썸네일(thumbnail)이 비어 있다');
  if (!filled(rec.reason)) out.push('AI 추천 조합: 추천 이유(reason)가 비어 있다');
  const titles = ((sheet.rows || []).find((r) => r.key === 'title')?.ours?.titles || []).filter(Boolean);
  if (filled(rec.title) && titles.length && !titles.includes(rec.title)) {
    out.push('AI 추천 조합: 추천 제목이 제목 후보(ours.titles) 안에 없다');
  }
  const tRow = (sheet.rows || []).find((r) => r.key === 'thumbnail');
  const allowedThumbs = [tRow?.ours?.image, ...(tRow?.ours?.images || []), ...(tRow?.ours?.images2 || []), ...(tRow?.ours?.images3 || [])].filter(Boolean);
  if (filled(rec.thumbnail) && allowedThumbs.length && !allowedThumbs.includes(rec.thumbnail)) {
    out.push(`AI 추천 조합: 추천 썸네일(${rec.thumbnail})이 썸네일 후보 목록에 없다`);
  }
  if (filled(rec.thumbnail) && imageExists && !imageExists(rec.thumbnail)) {
    out.push(`AI 추천 조합: 추천 썸네일 파일이 없다(${rec.thumbnail})`);
  }
  return out;
}

/**
 * 트렌드 검토 기록(trendRef, 2026-11-23 확정) 검사.
 * 기존 시트 호환을 위해 필드가 있을 때(또는 requireTrendRef=true) 검사한다.
 * 화제 사용을 강제하지 않고, 검토 여부와 사용·미사용 근거가 비어 있지 않은지만 본다.
 */
export function trendRefProblems(sheet, {requireTrendRef = false} = {}) {
  const out = [];
  const tr = sheet?.trendRef;
  if (tr === undefined || tr === null) {
    if (requireTrendRef) out.push('트렌드 검토 기록(trendRef)이 없다 — 13·14절 화제를 살핀 결과와 이유를 남긴다');
    return out;
  }
  if (typeof tr !== 'object') return ['트렌드 검토 기록(trendRef)은 객체여야 한다'];
  if (typeof tr.used !== 'boolean') out.push('트렌드 검토 기록: 화제 활용 여부(used: true/false)가 없다');
  if (!filled(tr.reason)) out.push('트렌드 검토 기록: 활용 또는 미활용 이유(reason)가 비어 있다');
  if (tr.used === true) {
    if (!filled(tr.topic)) out.push('트렌드 검토 기록: 어떤 화제인지(topic)가 비어 있다');
    if (!filled(tr.source)) out.push('트렌드 검토 기록: 출처(source: 13절/14절/웹 등)가 비어 있다');
    if (!filled(tr.sourceDate)) out.push('트렌드 검토 기록: 확인 날짜(sourceDate)가 비어 있다');
    if (!filled(tr.howIntegrated)) out.push('트렌드 검토 기록: 3060 영어 정체성에 녹인 방식(howIntegrated)이 비어 있다');
  }
  if (tr.scheduleShift?.requested === true && !filled(tr.scheduleShift?.reason)) {
    out.push('트렌드 검토 기록: 예약 순서 조정(scheduleShift)을 요청했지만 이유(reason)가 비어 있다');
  }
  return out;
}

/** 화제 원본 클립 권리 경로(2026-11-23 확정): 기본 자체 제작 외 3경로 모두 개방하되 증빙·근거 누락 시 차단. */
export const CLIP_RIGHTS_PATHWAYS = Object.freeze([
  'shorts_remix',       // 유튜브 쇼츠 리믹스 (허용 원본)
  'cc_by',              // 공식 원작자 채널 CC BY (3대 안전 조건 필수)
  'official_guideline', // 수익화 허용 공식 2차 창작 가이드라인
  'written_permission', // 서면 허락 (범위·구간·수익화 명시)
  'legal_citation',     // 불가피한 경우 법적 인용 예외 검토 (제28조·제35조의5·동일성유지권·YPP 리스크)
]);
export const PERMISSION_EMAIL_STATUSES = Object.freeze(['draft', 'sent', 'approved', 'denied']);

/**
 * 외부 원본 클립 권리 기록(clipRights, 2026-11-23 확정) 하드 가드레일 검사.
 * - 컷 계획(cutPlan.cuts[])에 externalClip: true가 있는데 clipRights 기록이 없거나 usesExternalClip!==true면 차단.
 * - clipRights.usesExternalClip === true이면 clips[]마다 URL·경로·범위·구간·변형 근거 및 경로별 필수 증빙이 있어야 통과.
 */
export function clipRightsProblems(sheet) {
  const out = [];
  const plan = (sheet?.rows || []).find((r) => r.key === 'visual')?.ours?.cutPlan;
  const externalCuts = (plan?.cuts || []).filter((c) => c?.externalClip === true);
  const cr = sheet?.clipRights;

  if (externalCuts.length > 0 && (!cr || cr.usesExternalClip !== true)) {
    out.push(`원본 클립 권리 기록(clipRights) 누락: 컷 계획에 외부 원본 클립 ${externalCuts.length}건이 있으나 권리 기록이 없다 — 증빙 없이 사용 불가`);
    return out;
  }
  if (cr === undefined || cr === null) return out;
  if (typeof cr !== 'object') return ['원본 클립 권리 기록(clipRights)은 객체여야 한다'];
  if (typeof cr.usesExternalClip !== 'boolean') {
    out.push('원본 클립 권리 기록: 외부 클립 사용 여부(usesExternalClip: true/false)가 없다');
    return out;
  }
  if (cr.usesExternalClip === false) return out;

  if (!Array.isArray(cr.clips) || cr.clips.length === 0) {
    out.push('원본 클립 권리 기록: usesExternalClip이 true인데 clips 목록이 비어 있다');
    return out;
  }

  const dur = Number(plan?.durationSeconds);
  cr.clips.forEach((clip, idx) => {
    const label = `원본 클립 #${idx + 1}`;
    if (!clip || typeof clip !== 'object') {
      out.push(`${label}: 클립 권리 객체가 비어 있다`);
      return;
    }
    if (!filled(clip.sourceUrl)) out.push(`${label}: 원본 URL(sourceUrl)이 없다`);
    if (!CLIP_RIGHTS_PATHWAYS.includes(clip.pathway)) {
      out.push(`${label}: 권리 경로(pathway)가 ${CLIP_RIGHTS_PATHWAYS.join('/')} 중 하나가 아니다`);
    }
    if (!filled(clip.scope)) out.push(`${label}: 허락·근거 범위(scope)가 없다`);
    if (!filled(clip.segment)) out.push(`${label}: 사용 구간(segment, 예: 0:12~0:16)이 없다`);
    if (!filled(clip.transformBasis)) out.push(`${label}: 우리 영어 해설이 주(主)가 되는 변형 근거(transformBasis)가 없다`);

    if (clip.pathway === 'shorts_remix') {
      if (sheet?.format === 'SHORTS' && Number.isFinite(dur) && dur > 60) {
        out.push(`${label}: 60초 초과 쇼츠(${dur}초)에 리믹스·권리 주장 클립을 쓰면 차단·수익 불가 위험이 크다 — 60초 이하로 줄이거나 자체 제작으로 전환`);
      }
      if (clip.officialChannelConfirmed !== true) {
        out.push(`${label}(쇼츠 리믹스): 원본이 불법 재업로드가 아닌 원작자 공식 채널인지 확인(officialChannelConfirmed: true)이 필요하다`);
      }
      if (clip.youtubeOnlyAcknowledged !== true) {
        out.push(`${label}(쇼츠 리믹스): 유튜브 내부 전용(타 플랫폼 재배포 금지) 및 원본 삭제 시 연동 삭제 위험 확인(youtubeOnlyAcknowledged: true)이 필요하다`);
      }
    }
    if (clip.pathway === 'cc_by') {
      const cc = clip.ccProof;
      if (!cc || typeof cc !== 'object') {
        out.push(`${label}(CC BY): 3대 안전 증빙(ccProof)이 없다`);
      } else {
        if (cc.officialChannelConfirmed !== true) out.push(`${label}(CC BY): 원작자 본인 공식 채널 확인(officialChannelConfirmed: true)이 없다 — 가짜 CC 차단`);
        if (!filled(cc.capturePath)) out.push(`${label}(CC BY): CC 표시 화면 캡처 경로(capturePath)가 없다`);
        if (!filled(cc.capturedAt)) out.push(`${label}(CC BY): CC 확인 날짜(capturedAt)가 없다`);
        if (!filled(cc.attributionText)) out.push(`${label}(CC BY): 설명글 출처 표기 문구(attributionText)가 없다`);
      }
    }
    if (clip.pathway === 'official_guideline') {
      if (!filled(clip.guidelineUrl)) out.push(`${label}(공식 가이드라인): 원문 가이드라인 URL(guidelineUrl)이 없다`);
      if (!filled(clip.checkedAt)) out.push(`${label}(공식 가이드라인): 확인 날짜(checkedAt)가 없다`);
    }
    if (clip.pathway === 'written_permission') {
      const pm = clip.permissionContact || clip.permissionEmail;
      if (!pm || typeof pm !== 'object' || !PERMISSION_EMAIL_STATUSES.includes(pm.status)) {
        out.push(`${label}(서면 허락): 허락 요청 상태(permissionContact/permissionEmail.status: ${PERMISSION_EMAIL_STATUSES.join('/')})가 없다`);
      } else if (pm.status !== 'approved') {
        out.push(`${label}(서면 허락): 허락 회신이 확정(approved)되지 않았다(현재: ${pm.status}) — 승인 전 사용 차단`);
      }
    }
    if (clip.pathway === 'legal_citation') {
      const rev = clip.citationReview;
      if (!rev || typeof rev !== 'object') {
        out.push(`${label}(법적 인용 예외): 사전 검토 기록(citationReview)이 없다`);
      } else {
        if (!filled(rev.primaryOursCheck)) out.push(`${label}(법적 인용 예외): 제28조 주·종 관계 검토(primaryOursCheck)가 비어 있다`);
        if (!filled(rev.fairUseFourFactors)) out.push(`${label}(법적 인용 예외): 제35조의5 공정이용 4요소 검토(fairUseFourFactors)가 비어 있다`);
        if (!filled(rev.integrityCheck)) out.push(`${label}(법적 인용 예외): 동일성유지권(원본 맥락 왜곡 없음, integrityCheck) 검토가 비어 있다`);
        if (rev.noEvasionTricksConfirmed !== true) out.push(`${label}(법적 인용 예외): 자동 매칭 회피용 변형(배속·좌우반전·순서 비틀기) 미사용 확인(noEvasionTricksConfirmed: true)이 필요하다`);
        if (rev.yppRiskAcknowledged !== true) out.push(`${label}(법적 인용 예외): Content ID·YPP 재사용 심사 리스크 확인(yppRiskAcknowledged: true)이 필요하다`);
      }
    }
  });
  return out;
}

/** v4(슬로건 업그레이드) 쇼츠 단일 최적안(cutPlan) 검사: 물리 가드레일(0.5초 상단 훅 존재·음성 예산·모션·입말)만 강제하고 9자 제한·전 컷 하단 띠 강제는 푼다. */
export function v4ShortsProblems(sheet, {imageExists = null} = {}) {
  const out = [];
  if (!isSloganV4(sheet) || sheet?.format !== 'SHORTS') return out;
  const plan = (sheet.rows || []).find((r) => r.key === 'visual')?.ours?.cutPlan;
  if (!plan || !Array.isArray(plan.cuts) || !plan.cuts.length) return out;
  const hook = plan.hook;
  if (!Array.isArray(hook) || hook.length < 1 || hook.length > 2 || hook.some((l) => !filled(l))) {
    out.push('화면 연출(v4 최적안): 상단 0.5초 훅 글자(hook) 1~2줄은 필수 가드레일이다(형태·길이는 자율)');
  }
  if (!filled(plan.hookWhy)) out.push('화면 연출(v4 최적안): 상단 훅 근거(hookWhy)가 없다');
  const times = plan.cuts.map((c) => Number(c.t));
  plan.cuts.forEach((c, i) => {
    const where = `화면 연출(v4) ${i}번 컷(${c.t}초)`;
    if (!filled(c.image)) out.push(`${where}: 컷 이미지가 없다`);
    else if (imageExists && !imageExists(c.image)) out.push(`${where}: 이미지 파일이 없다(${c.image})`);
    if (!filled(c.motion)) out.push(`${where}: 연출·모션 메모(motion)가 없다`);
    if (!filled(c.narration) && !(Array.isArray(c.voiceEn) && c.voiceEn.length)) out.push(`${where}: 한국어 낭독도 영어 소리도 없다`);
    const dur = (i + 1 < times.length ? times[i + 1] : Number(plan.durationSeconds)) - times[i];
    const need = voiceBudget(c);
    if (Number.isFinite(dur) && need > dur + 0.001) out.push(`${where}: 음성 예산 ${Math.round(need * 100) / 100}초가 컷 길이 ${Math.round(dur * 100) / 100}초를 넘는다`);
  });
  out.push(...spokenKoreanProblems(plan));
  return out;
}
/**
 * 쇼츠 2안(cutPlan2) 검사(2026-11-16): 위 훅 띠 + 아래 정보 띠가 항상 있어야 하고(사용자 불변 규칙), 컷마다 낭독이 컷 길이에 들어가야 한다.
 * 음성 예산 = 한국어 음절 ÷ 4.3(EP30 중앙값 4.34에서 잡은 가설) + 영어 단어 소리 0.9초씩(측정 전 가정, 단어 사이 0.2초) + 따라 말하기 창 + 여유 0.35초.
 * 음성이 나오면 words.json 실측으로 이 값을 바꾼다.
 */
export const KO_SYLLABLES_PER_SECOND = 4.3;
export const EN_WORD_SECONDS = 0.9;
export const EN_GAP_SECONDS = 0.2;
export const VOICE_MARGIN_SECONDS = 0.35;
export const HOOK_MAX_CHARS = 9;
export function voiceBudget(cut) {
  const ko = hangulSyllables(cut?.narration) / KO_SYLLABLES_PER_SECOND;
  const n = Array.isArray(cut?.voiceEn) ? cut.voiceEn.length : 0;
  const en = n * EN_WORD_SECONDS + Math.max(0, n - 1) * EN_GAP_SECONDS;
  return ko + en + (Number(cut?.window) || 0) + VOICE_MARGIN_SECONDS;
}
function shortsPlanProblems(sheet, {planKey, label, requiredMsg = null, imageExists = null} = {}) {
  const out = [];
  if (!usesRowOrigins(sheet) || sheet?.format !== 'SHORTS') return out;
  const visual = (sheet.rows || []).find((r) => r.key === 'visual');
  const plan = visual?.ours?.[planKey];
  if (!plan || !Array.isArray(plan.cuts) || !plan.cuts.length) {
    return requiredMsg ? [requiredMsg] : [];
  }
  const hook = plan.hook;
  if (!Array.isArray(hook) || hook.length < 1 || hook.length > 2 || hook.some((l) => !filled(l))) out.push(`화면 연출 ${label}: 위 훅 띠(hook)는 1~2줄이어야 한다`);
  else for (const l of hook) if (String(l).replace(/\*\*/g, '').length > HOOK_MAX_CHARS + 1) out.push(`화면 연출 ${label}: 훅 줄 "${l}"이 ${HOOK_MAX_CHARS}자(쉼표·따옴표 1자 여유)보다 길다 — 모바일에서 한 줄에 안 들어간다`);
  if (!filled(plan.hookWhy)) out.push(`화면 연출 ${label}: 훅을 그렇게 정한 근거(hookWhy: 경쟁 쇼츠 훅 분석)가 없다`);
  const times = plan.cuts.map((c) => Number(c.t));
  plan.cuts.forEach((c, i) => {
    const where = `화면 연출 ${label} ${i}번 컷(${c.t}초)`;
    if (!filled(c.image)) out.push(`${where}: 이미지가 없다`);
    else if (imageExists && !imageExists(c.image)) out.push(`${where}: 이미지 파일이 없다(${c.image})`);
    const b = c.bottom || {};
    if (!filled(b.subtitle) && !filled(b.speaker)) out.push(`${where}: 아래 정보 띠(bottom.subtitle 또는 speaker)가 없다 — 쇼츠는 아래 띠가 항상 있어야 한다`);
    if (!filled(c.motion)) out.push(`${where}: 움직임 메모(motion)가 없다`);
    if (!filled(c.narration) && !(Array.isArray(c.voiceEn) && c.voiceEn.length)) out.push(`${where}: 한국어 낭독도 영어 소리도 없다`);
    if (/^[A-Za-z]/.test(String(c.narration || '').trim())) out.push(`${where}: 낭독이 영어로 시작한다(AI 음성 억양)`);
    const dur = (i + 1 < times.length ? times[i + 1] : Number(plan.durationSeconds)) - times[i];
    const need = voiceBudget(c);
    if (Number.isFinite(dur) && need > dur + 0.001) out.push(`${where}: 음성 예산 ${Math.round(need * 100) / 100}초가 컷 길이 ${Math.round(dur * 100) / 100}초를 넘는다(한국어 ${hangulSyllables(c.narration)}음절, 영어 ${(c.voiceEn || []).length}개, 따라 말하기 ${c.window || 0}초)`);
  });
  if (times.some((x, i) => !Number.isFinite(x) || (i > 0 && x <= times[i - 1]))) out.push(`화면 연출 ${label}: 컷 시각이 시간 순서가 아니다`);
  return out;
}
export function plan2Problems(sheet, {imageExists = null} = {}) {
  if (isSloganV4(sheet)) return [];
  return shortsPlanProblems(sheet, {
    planKey: 'cutPlan2',
    label: '2안',
    requiredMsg: '화면 연출: 쇼츠는 위 훅 띠·아래 정보 띠가 있는 2안(cutPlan2)이 있어야 한다(사용자 불변 규칙)',
    imageExists,
  });
}
export function plan3Problems(sheet, {imageExists = null} = {}) {
  if (isSloganV4(sheet)) return [];
  return shortsPlanProblems(sheet, {planKey: 'cutPlan3', label: '3안', imageExists});
}
export const STATUSES = Object.freeze(['draft', 'approved', 'published']);

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
export const sheetsDir = join(projectDir, 'data', 'youtube', 'transform-sheets');

const filled = (v) => typeof v === 'string' && v.trim().length > 0;

/** 다른 경쟁 영상(원본이 아닌 영상)에서 가져온 것의 출처 영상 ID 목록(v4 references 포함). */
export function borrowedSources(sheet) {
  const fromBorrowed = (sheet?.borrowed || []).map((b) => b.fromVideoId).filter((id) => filled(id) && id !== sheet.sourceVideoId);
  const fromRefs = (sheet?.references || []).map((r) => r.videoId).filter((id) => filled(id) && id !== sheet.sourceVideoId);
  return [...new Set([...fromBorrowed, ...fromRefs])];
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
  const v4 = isSloganV4(sheet);
  if (v4) {
    if (!filled(sheet?.episodeId) && !filled(sheet?.sourceVideoId)) problems.push('에피소드 ID(episodeId) 또는 원본 경쟁 영상 ID(sourceVideoId)가 없다');
  } else if (!filled(sheet?.sourceVideoId)) {
    problems.push('원본 경쟁 영상 ID가 없다');
  }
  if (!filled(sheet?.topic)) problems.push('우리 소재가 없다');
  if (!STATUSES.includes(sheet?.status)) problems.push(`상태가 ${STATUSES.join('/')} 중 하나가 아니다`);

  // 정체성 비율(2026-11-16 사용자: 사람이 정한 70:30은 근거 없는 숫자였다). 행마다 출처(origin)와 이유를 적은 시트는 그 표를 세어 비율을 보여 주고,
  // 예전 시트(행 출처 없음)는 예전 칸을 그대로 검사한다.
  if (usesRowOrigins(sheet) || v4) {
    for (const key of rowKeysFor(sheet)) {
      const r = (sheet?.rows || []).find((x) => x.key === key);
      if (!r) continue; // 행이 없다는 문제는 아래에서 따로 알린다
      if (!ORIGINS.includes(r.origin)) problems.push(`${ROW_LABELS[key]}: 출처(origin)가 ${ORIGINS.join('/')} 중 하나가 아니다`);
      else if (!filled(r.originReason)) problems.push(`${ROW_LABELS[key]}: 출처를 그렇게 본 이유(originReason)가 없다`);
    }
  } else {
    const share = sheet?.identityShare;
    if (!share || Number(share.ours) + Number(share.competitor) !== 100) problems.push('정체성 비율(우리+경쟁)의 합이 100이 아니다');
    if (!filled(share?.reason)) problems.push('정체성 비율의 근거가 없다');
  }

  for (const key of rowKeysFor(sheet)) {
    const r = (sheet?.rows || []).find((x) => x.key === key);
    if (!r) { problems.push(`항목 ${key}(${ROW_LABELS[key]})이 없다`); continue; }
    if (key === 'package') {
      problems.push(...packageProblems(r.ours, (sheet.rows || []).find((x) => x.key === 'visual')?.ours?.cutPlan));
      if (!filled(r.why)) problems.push(`${ROW_LABELS[key]}: 바꾼 이유가 없다`);
      continue;
    }
    if (!(v4 && r.origin === 'ours') && !filled(r.competitor?.text)) problems.push(`${ROW_LABELS[key]}: 경쟁 쪽 내용이 비어 있다`);
    if (!filled(r.ours?.text)) problems.push(`${ROW_LABELS[key]}: 우리 쪽 내용이 비어 있다`);
    if (!filled(r.why)) problems.push(`${ROW_LABELS[key]}: 바꾼 이유가 없다`);
    if (key === 'visual') problems.push(...cutPlanProblems(r.ours?.cutPlan, competitorPacing, imageExists, Number(sheet?.schemaVersion) >= 2 && !v4));
    for (const img of [r.ours?.image, ...(r.ours?.images || []), ...(r.ours?.images3 || [])].filter(filled)) {
      if (!imageExists(img)) problems.push(`${ROW_LABELS[key]}: 우리 쪽 이미지 파일이 없다(${img})`);
    }
  }

  const refCount = (sheet?.references || []).filter((r) => filled(r?.videoId)).length;
  if (v4) {
    if (refCount === 0 && !borrowedSources(sheet).length) problems.push('융합할 명작 레퍼런스(references 또는 borrowed)가 하나도 없다');
    for (const ref of sheet?.references || []) {
      const label = `명작 레퍼런스(${String(ref?.what || ref?.role || ref?.videoId || '').slice(0, 20)})`;
      if (!filled(ref?.videoId)) problems.push(`${label}: videoId가 없다`);
      if (!filled(ref?.role)) problems.push(`${label}: 역할(role: 훅/비주얼/템포/포장 등)이 없다`);
      if (!filled(ref?.what)) problems.push(`${label}: 무엇을 흡수했는지(what)가 없다`);
      if (!filled(ref?.reason)) problems.push(`${label}: 채택 이유(reason)가 없다`);
      if (!filled(ref?.evidence)) problems.push(`${label}: 근거(evidence)가 없다`);
    }
  } else if (!borrowedSources(sheet).length) {
    problems.push('다른 경쟁 영상에서 가져온 것이 하나도 없다 — 영상 한 편만 보고 만들면 안 된다');
  }
  for (const b of sheet?.borrowed || []) {
    if (!filled(b.fromVideoId) || b.fromVideoId === sheet.sourceVideoId) problems.push(`가져온 것(${String(b.what).slice(0, 20)})의 출처가 원본이거나 비어 있다 — 다른 경쟁 영상이어야 한다`);
    if (!filled(b.reason)) problems.push(`가져온 것(${String(b.what).slice(0, 20)})에 가져와도 되는 이유가 없다`);
    if (!filled(b.evidence)) problems.push(`가져온 것(${String(b.what).slice(0, 20)})에 근거(출처·표본 수)가 없다`);
  }
  for (const r of sheet?.rejected || []) {
    if (!filled(r.reason)) problems.push(`뺀 것(${String(r.what).slice(0, 20)})에 뺀 이유가 없다`);
  }
  problems.push(
    ...experimentProblems(sheet),
    ...evidenceProblems(sheet),
    ...appliedProblems(sheet),
    ...selfCritiqueProblems(sheet),
    ...aiRecommendationProblems(sheet, {imageExists}),
    ...trendRefProblems(sheet),
    ...clipRightsProblems(sheet),
    ...v4ShortsProblems(sheet, {imageExists}),
    ...plan2Problems(sheet),
    ...plan3Problems(sheet, {imageExists}),
  );
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
export const EVIDENCE_METRICS = Object.freeze(['views7d', 'watchSeconds7d', 'subs7d', 'impressions7d', 'ctr7d', 'stayedToWatch']); // stayedToWatch: 쇼츠 계속 시청함(2026-11-15, 스타일 시험 1차 지표)
// result = 평소 대비 판정(1단계, 시트의 이김·짐은 이걸로 읽는다), baselineResult = 기준선 판정(2단계, 옆 칸). 2026-11-13 사용자 결정.
// 옛 기록(result에 기준선 판정이 들어 있던 것)도 통과시키려고 두 말 목록을 모두 허용한다.
export const BASELINE_RESULTS = Object.freeze(['갱신 기준 초과', '기준선 위, 편차 안(갱신 아님)', '기준선 이하', '기준선 없음']);
export const EVIDENCE_RESULTS = Object.freeze([...USUAL_RESULTS, ...BASELINE_RESULTS]);
export function evidenceProblems(sheet) {
  const out = [];
  const groups = [
    ...(sheet?.borrowed || []).map((b) => [`가져온 것(${String(b.what).slice(0, 20)})의 근거 기록`, b.evidenceLog || []]),
    ...(sheet?.references || []).map((r) => [`명작 레퍼런스(${String(r.what || r.role || r.videoId).slice(0, 20)})의 근거 기록`, r.evidenceLog || []]),
  ];
  for (const [where, log] of groups) {
    for (const e of log) {
      if (!filled(e?.date) || !filled(e?.videoId)) out.push(`${where}에 날짜나 영상 ID가 없다`);
      else if (!EVIDENCE_METRICS.includes(e.metric)) out.push(`${where}의 지표(${e.metric})가 ${EVIDENCE_METRICS.join('/')} 중 하나가 아니다`);
      else if (!Number.isFinite(Number(e.value)) && e.value !== null) out.push(`${where}의 값이 숫자가 아니다`);
      else if (!EVIDENCE_RESULTS.includes(e.result)) out.push(`${where}의 결과(${e.result})가 정해진 말이 아니다`);
      else if (e.baselineResult !== undefined && !BASELINE_RESULTS.includes(e.baselineResult)) out.push(`${where}의 기준선 판정(${e.baselineResult})이 정해진 말이 아니다`);
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
  const allowed = [row?.ours?.image, ...(row?.ours?.images || []), ...(row?.ours?.images2 || []), ...(row?.ours?.images3 || [])].filter(Boolean);
  if (!allowed.includes(image)) throw new Error('이 시트의 썸네일 시안이 아닙니다');
  const now = new Set(sheet.thumbnailPicks || []);
  if (picked) now.add(image); else now.delete(image);
  return {...sheet, thumbnailPicks: allowed.filter((x) => now.has(x))};
}

/**
 * 영상 ID마다 이 영상이 어느 비교 시트에 쓰였는지(2026-11-16 사용자: 시트를 만들었는데 리포트 목록·키워드 풀에서 연결 표시가 없어 찾기 힘들다).
 * role: 'source' = 시트의 원본 경쟁 영상, 'borrowed' = 다른 영상에서 가져온 것의 출처. 같은 시트에서 둘 다면 source만 남긴다.
 */
export function sheetLinksByVideo(sheets) {
  const map = new Map();
  const add = (videoId, sheet, role) => {
    const sid = sheetIdOf(sheet);
    if (!filled(videoId) || !filled(sid)) return;
    const list = map.get(videoId) || [];
    if (list.some((x) => x.sheetId === sid)) return;
    list.push({sheetId: sid, topic: sheet.topic, status: sheet.status, role});
    map.set(videoId, list);
  };
  for (const sheet of sheets || []) {
    if (filled(sheet.sourceVideoId)) add(sheet.sourceVideoId, sheet, 'source');
    for (const id of borrowedSources(sheet)) add(id, sheet, 'borrowed');
  }
  return map;
}

export const REF_BIAS_WINDOW = 3; // allow-literal: 직전 3편 시트 대조(가설)
export const REF_BIAS_MIN_REPEATS = 2; // allow-literal: 직전 3편 중 2편 이상 중복 시 비차단 참고 경고(가설)

/**
 * 레퍼런스 반복 편향 비차단 경고(2026-11-22): validateSheet() 차단 에러와 분리한다(하드코딩·창작 제약 금지).
 * 직전 window편 시트 중 minRepeats편 이상에 이미 쓰인 references[].videoId(또는 borrowed[].fromVideoId)가
 * 이번 시트에도 들어 있으면 참고 경고 목록을 돌려준다.
 */
export function referenceBiasWarnings(sheet, allSheets = [], {window = REF_BIAS_WINDOW, minRepeats = REF_BIAS_MIN_REPEATS} = {}) {
  const sid = sheetIdOf(sheet);
  const refsOf = (s) => [...new Set([
    ...(s?.references || []).map((r) => r?.videoId),
    ...(s?.borrowed || []).map((b) => b?.fromVideoId),
  ].filter(filled))];
  const curRefs = refsOf(sheet);
  if (!curRefs.length) return [];
  const ordered = [...(allSheets || [])]
    .filter((s) => s && sheetIdOf(s))
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || sheetIdOf(a).localeCompare(sheetIdOf(b)));
  const curIdx = sid ? ordered.findIndex((s) => sheetIdOf(s) === sid) : -1;
  const prev = (curIdx >= 0 ? ordered.slice(0, curIdx) : ordered.filter((s) => sheetIdOf(s) !== sid)).slice(-window);
  if (prev.length < minRepeats) return [];
  const warnings = [];
  for (const vid of curRefs) {
    const hits = prev.filter((p) => refsOf(p).includes(vid));
    if (hits.length >= minRepeats) {
      const hitIds = hits.map((h) => sheetIdOf(h));
      warnings.push({
        videoId: vid,
        count: hits.length,
        window: prev.length,
        sheets: hitIds,
        message: `참고 경고: 레퍼런스 ${vid}가 직전 ${prev.length}편 중 ${hits.length}편(${hitIds.join(', ')})과 겹친다 — 습관적 반복이 아닌지 점검(비차단)`,
      });
    }
  }
  return warnings;
}
