// 대표 그림 단계(설계: docs/superpowers/plans/2026-11-25-blog-hero-image-design.md C절).
// 순서: 후보 N장 만들기 → 파일 점검(크기·비율·이전 그림과 중복) → 고르기(Opus가 직접 보고) → JPEG로 바꾸기 → 블로거에 이메일로 올리기.
// 구도·빛·렌즈·화풍은 여기서 정하지 않는다(하드코딩 금지). 코드는 안전선만 막고, 실패하면 이유를 돌려준다.
// tech-run.mjs는 이 함수가 {ok:false}를 돌려주면 그 날 게시를 미루고(`image-deferred`) 초안·후보를 그대로 둔다.
import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

import * as heroImage from './hero-image.mjs';
import * as bloggerUpload from './blogger-image-upload.mjs';

export const HERO_ROUNDS = 2; // allow-literal: 설계 C절 최대 2바퀴(후보 6장)
export const HERO_CANDIDATES_PER_ROUND = 3; // allow-literal: 설계 C절 후보 3장
export const HERO_DISPLAY_WIDTH = 1200; // allow-literal: 설계 B절 본문 표시 크기
export const HERO_DISPLAY_HEIGHT = 670; // allow-literal: 설계 B절 16:9 비율 표시 크기

const BRIEF_KEYS_FOR_RECENT = ['moment', 'angle', 'light', 'lens', 'medium'];

/** 최근 글에 기억해 둘 설계도 요약(글쓰기 지시문에 "겹치지 않게"로 쓰인다). */
export function summarizeBrief(brief = {}) {
  const out = {};
  for (const key of BRIEF_KEYS_FOR_RECENT) {
    if (brief[key]) out[key] = String(brief[key]);
  }
  return out;
}

/**
 * 대표 그림 1장을 만들어 (게시 모드면) 블로거에 올리고 본문에 넣을 값을 돌려준다.
 * @returns {Promise<{ok:true, hero:{url,alt,width,height,hash,brief}, local?:boolean} | {ok:false, stage:string, reasons:string[]}>}
 */
export async function produceHero({
  draft,
  topicId,
  mode = 'auto',
  projectDir,
  blogId,
  token,
  recentHashes = [],
  deps = {},
}) {
  const h = {...heroImage, ...bloggerUpload, ...deps};
  const brief = draft?.heroImage;
  if (!brief) return {ok: false, stage: 'brief', reasons: ['초안에 heroImage 칸이 없습니다.']};

  const dir = h.heroDir(topicId, projectDir);
  await mkdir(dir, {recursive: true});
  const record = (await h.readHeroRecord(dir)) || {};
  const alt = String(brief.alt || '');
  const base = {alt, width: HERO_DISPLAY_WIDTH, height: HERO_DISPLAY_HEIGHT};
  const brief5 = summarizeBrief(brief);

  // 이미 올린 그림이 있으면(앞선 실행이 올린 뒤 게시에서 멈춘 경우) 그대로 쓴다.
  if (mode !== 'preview' && record.urls?.s1600 && record.hash) {
    return {ok: true, hero: {...base, url: record.urls.s1600, hash: record.hash, brief: brief5}};
  }

  const reasons = [];
  let chosen = record.chosen && existsSync(record.chosen) ? record.chosen : null;
  let currentBrief = brief;

  for (let round = 1; !chosen && round <= HERO_ROUNDS; round += 1) {
    const candidates = await h.generateCandidates({
      brief: currentBrief,
      topicId,
      count: HERO_CANDIDATES_PER_ROUND,
      projectDir,
      outDir: dir,
    });
    const usable = [];
    for (const c of candidates) {
      if (!c.ok) {
        reasons.push(`그림 만들기 실패: ${c.error || '알 수 없음'}`);
        continue;
      }
      const probe = await h.probeImage(c.path);
      const fileProblems = h.checkCandidateFile(probe);
      if (fileProblems.length) {
        reasons.push(...fileProblems.map((p) => p.text || p.id));
        continue;
      }
      const hash = await h.dHash(c.path);
      if (h.isDuplicateOfRecent(hash, recentHashes)) {
        reasons.push('이전 글의 그림과 너무 비슷해서 뺐습니다.');
        continue;
      }
      usable.push(c);
    }
    if (usable.length === 0) {
      // 만들기 자체가 막힌(로그아웃·한도) 경우 같은 바퀴를 되풀이하지 않는다.
      if (candidates.every((c) => !c.ok)) break;
      continue;
    }
    const pick = await h.runPicker({topicId, candidates: usable, projectDir});
    if (pick?.chosen) {
      chosen = pick.chosen;
      break;
    }
    reasons.push(...(pick?.verdict?.reasons || ['고르기에서 모두 탈락했습니다.']));
    const fixes = pick?.verdict?.fixes || [];
    currentBrief = {...currentBrief, avoid: [...(currentBrief.avoid || []), ...fixes]};
  }

  if (!chosen) {
    return {ok: false, stage: 'pick', reasons: reasons.length ? reasons : ['쓸 수 있는 그림을 만들지 못했습니다.']};
  }

  // 고른 그림이 이미 .jpg여도 같은 파일을 덮어쓰지 않게 올리기용 파일을 따로 둔다(2026-11-26 첫 글에서 같은 파일을 다시 인코딩한 일이 있었음)
  const jpg = chosen.replace(/\.[^./\\]+$/, '') + '-upload.jpg';
  await h.encodeForUpload(chosen, jpg);
  const hash = await h.dHash(chosen);
  await h.writeHeroRecord(dir, {...record, chosen, jpg, hash, brief: brief5});

  if (mode === 'preview') {
    return {ok: true, local: true, hero: {...base, url: pathToFileURL(jpg).href, hash, brief: brief5}};
  }

  const postEmail = h.loadPostEmail(projectDir);
  if (!postEmail) {
    return {ok: false, stage: 'upload', reasons: ['.env에 BLOGGER_TECH_POST_EMAIL이 없습니다.']};
  }
  const up = await h.uploadHeroViaEmail({imagePath: jpg, topicId, blogId, token, postEmail});
  if (!up?.ok) {
    return {ok: false, stage: 'upload', reasons: [`그림 올리기 실패(${up?.stage || '?'}/${up?.error || '?'}${up?.detail ? `/${up.detail}` : ''})`]};
  }
  await h.writeHeroRecord(dir, {
    ...record,
    chosen,
    jpg,
    hash,
    brief: brief5,
    urls: up.urls,
    base: up.base,
    fileName: up.fileName,
  });
  return {ok: true, hero: {...base, url: up.urls.s1600, hash, brief: brief5}};
}
