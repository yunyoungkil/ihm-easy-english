// 변형 시트 — 경쟁 영상 리포트를 우리 콘텐츠로 바꾸는 한 장(2026-11-12 사용자 설계).
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

export const ROW_KEYS = Object.freeze(['title', 'thumbnail', 'opening', 'flow', 'visual', 'reaction', 'ending']);
export const ROW_LABELS = Object.freeze({
  title: '제목', thumbnail: '썸네일', opening: '첫 15초', flow: '전개', visual: '화면 연출', reaction: '시청자 반응 지점', ending: '끝맺음',
});
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
export function validateSheet(sheet, {imageExists = () => true} = {}) {
  const problems = [];
  if (!filled(sheet?.sourceVideoId)) problems.push('원본 경쟁 영상 ID가 없다');
  if (!filled(sheet?.topic)) problems.push('우리 소재가 없다');
  if (!STATUSES.includes(sheet?.status)) problems.push(`상태가 ${STATUSES.join('/')} 중 하나가 아니다`);

  const share = sheet?.identityShare;
  if (!share || Number(share.ours) + Number(share.competitor) !== 100) problems.push('정체성 비율(우리+경쟁)의 합이 100이 아니다');
  if (!filled(share?.reason)) problems.push('정체성 비율의 근거가 없다');

  for (const key of ROW_KEYS) {
    const r = (sheet?.rows || []).find((x) => x.key === key);
    if (!r) { problems.push(`항목 ${key}(${ROW_LABELS[key]})이 없다`); continue; }
    if (!filled(r.competitor?.text)) problems.push(`${ROW_LABELS[key]}: 경쟁 쪽 내용이 비어 있다`);
    if (!filled(r.ours?.text)) problems.push(`${ROW_LABELS[key]}: 우리 쪽 내용이 비어 있다`);
    if (!filled(r.why)) problems.push(`${ROW_LABELS[key]}: 바꾼 이유가 없다`);
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
  return problems;
}

export function loadSheets(dir = sheetsDir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    try { return JSON.parse(readFileSync(join(dir, f), 'utf8').replace(/^﻿/, '')); } catch { return null; }
  }).filter(Boolean);
}

export const sheetImageExists = (rel) => existsSync(join(sheetsDir, rel));
