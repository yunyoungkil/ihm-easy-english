import {existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {basename, dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {setupStudioChrome, STUDIO_PORT} from './setup-studio-chrome.mjs';
import {acquireLock} from './studio-export.mjs';
import {OUR_CHANNEL_ID} from './youtube-publisher.mjs';
import {findBannedTerms} from './banned-terms.mjs';
import {selectPackageVideo, shortsPackageEpisode} from './upload-package-summary.mjs';

/**
 * 유튜브 스튜디오 예약 한 줄 명령 (2026-11-16 사용자 결정).
 * 사람이든 Claude든 제미나이든 같은 명령 하나로 영상 1개를 올리고 예약한다. 토큰을 쓰지 않고 돌릴 수 있게 하려는 것이다.
 *
 *   npm run studio-upload -- <패키지 폴더> --schedule "2026-11-18 20:00" --playlist "<재생목록 이름>" [--yes]
 *   npm run studio-upload -- <패키지 폴더> --schedule "2026-11-18 20:00" --no-playlist [--no-subs] [--yes]
 *   npm run studio-upload -- <패키지 폴더> --guide        (UPLOAD-GUIDE.md만 쓴다)
 *
 * --yes가 없으면 점검만 하고 스튜디오에 아무것도 올리지 않는다. 종료 코드: 0 성공, 1 점검·확인 실패, 2 사용법 오류.
 * 자동 실행 금지: 매일 루프·스케줄러·다른 스크립트가 이 파일을 부르지 않는다. 사람이 명령을 칠 때만 돈다.
 * "공개" 라디오와 "저장" 버튼은 절대 누르지 않는다. 마지막 버튼 글자가 정확히 "예약"일 때만 누른다.
 */
const projectDir = join(dirname(fileURLToPath(import.meta.url)), '..');
export const DASHBOARD_SYNC_URL = 'http://localhost:3001/api/sync';
const KST_OFFSET_HOURS = 9; // allow-literal: 한국 표준시는 UTC보다 9시간 빠르다
const MIN_LEAD_MINUTES = 30; // allow-literal: 사용자 결정(2026-11-16) 지금보다 30분 이상 뒤
const MAX_LEAD_DAYS = 60; // allow-literal: 사용자 결정(2026-11-16) 60일 이내
const MAX_TITLE = 100; // allow-literal: 유튜브 제목 한도
const MAX_TAG_CHARS = 500; // allow-literal: 유튜브 태그 한도(스튜디오 화면의 "n/500")
const MAX_DESCRIPTION = 5000; // allow-literal: 유튜브 설명 한도
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024; // allow-literal: 스튜디오 썸네일 파일 한도 2MB
const MINUTE_MS = 60000; // allow-literal: 1분(ms)
const DAY_MS = 86400000; // allow-literal: 하루(ms)

/** 형식별 공식 기본 재생목록 (2026-11-19 사용자 확정) */
export const DEFAULT_PLAYLISTS = {
  shorts: '이해하면 쉬운 영어 | 영어 읽는 법 테스트 시즌1 (30초 퀴즈)',
  longform: '이해하면 쉬운 영어 | 영어 읽는 법 기초 시즌1 (왕초보 영어 읽기)',
};

// ───────────────────────── 순수 함수(화면을 쓰지 않는다) ─────────────────────────

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

/** "2026-11-18 20:00"(한국 시각)을 읽어 스튜디오에 넣을 값과 UTC 시각을 만든다. */
export function parseSchedule(text, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})$/.exec(String(text ?? '').trim());
  if (!m) return {ok: false, error: '예약 시각은 "YYYY-MM-DD HH:mm"(한국 시각) 형식이어야 합니다.'};
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  if (h > 23 || mi > 59) return {ok: false, error: `시각이 올바르지 않습니다: ${text}`};
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) {
    return {ok: false, error: `없는 날짜입니다: ${text}`};
  }
  const utcMs = Date.UTC(y, mo - 1, d, h - KST_OFFSET_HOURS, mi);
  const leadMs = utcMs - now.getTime();
  if (leadMs < MIN_LEAD_MINUTES * MINUTE_MS) return {ok: false, error: `예약 시각은 지금보다 ${MIN_LEAD_MINUTES}분 이상 뒤여야 합니다(받은 값: ${text}).`};
  if (leadMs > MAX_LEAD_DAYS * DAY_MS) return {ok: false, error: `예약 시각은 ${MAX_LEAD_DAYS}일 이내여야 합니다(받은 값: ${text}).`};
  const pad = (n) => String(n).padStart(2, '0');
  return {
    ok: true,
    text: `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${pad(mi)}`,
    y, mo, d, h, mi,
    utcIso: new Date(utcMs).toISOString(),
    dateText: studioDateText({y, mo, d}),
    timeText: studioTimeText({h, mi}),
    confirmRegex: confirmationRegex({y, mo, d, h, mi}),
  };
}

/** 스튜디오 날짜 칸 문구: `2026. 11. 18.` (달·일은 0을 붙이지 않는다). */
export const studioDateText = ({y, mo, d}) => `${y}. ${mo}. ${d}.`;

/** 스튜디오 시간 칸 문구: `오후 8:00`. 0시는 오전 12:00, 12시는 오후 12:00. */
export function studioTimeText({h, mi}) {
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(mi).padStart(2, '0')}`;
}

/** "동영상 예약됨" 창의 문장은 `2026년 11월 18일 20:00에`(2026-11-16 실제 화면). 시의 앞자리 0은 있어도 없어도 맞는 것으로 본다. */
export const confirmationRegex = ({y, mo, d, h, mi}) =>
  new RegExp(`${y}년\\s*${mo}월\\s*${d}일\\s*0?${h}:${String(mi).padStart(2, '0')}`);

export const confirmationMatches = (text, schedule) => confirmationRegex(schedule).test(norm(text));

/** 확인 창에서 영상 ID를 읽는다(`youtube.com/shorts/ID?...`, `youtu.be/ID`, `watch?v=ID`). */
export const videoIdFromText = (text) => /(?:shorts\/|youtu\.be\/|[?&]v=)([A-Za-z0-9_-]{11})/.exec(String(text ?? ''))?.[1] || null;

/**
 * 예약 버튼을 누르기 전 마지막 안전 확인. 하나라도 어긋나면 누르지 않는다.
 * - 마지막 버튼 글자가 정확히 "예약"이어야 한다("게시"=바로 공개, "저장"=비공개 저장이므로 누르면 안 된다).
 * - 화면에서 읽은 날짜·시간이 기대값과 같아야 한다.
 */
export function checkScheduleReadback({doneButtonText, dateRead, timeRead, schedule}) {
  if (norm(doneButtonText) !== '예약') return {ok: false, reason: `마지막 버튼이 "예약"이 아니라 "${norm(doneButtonText)}"입니다. 누르지 않고 멈춥니다.`};
  if (norm(dateRead) !== schedule.dateText) return {ok: false, reason: `날짜 칸이 "${norm(dateRead)}"입니다(기대: "${schedule.dateText}").`};
  if (norm(timeRead) !== schedule.timeText) return {ok: false, reason: `시간 칸이 "${norm(timeRead)}"입니다(기대: "${schedule.timeText}").`};
  return {ok: true};
}

/** 태그 글자 수. 스튜디오는 띄어쓰기가 든 태그에 따옴표 2자를 더하고 쉼표를 센다(EP30: 11개, 131자로 화면과 일치). */
export const tagCharCount = (tags) => tags.reduce((n, t) => n + t.length + (/\s/.test(t) ? 2 : 0), 0) + Math.max(0, tags.length - 1);

export const parseTags = (text) => String(text ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const normalizeTitle = (t) => norm(t);

/** 채널 카탈로그에 같은 제목이 있는지(youtube-publisher의 findExistingUpload와 같은 규칙). */
export function findCatalogDuplicate(title, catalogVideos = []) {
  const candidate = normalizeTitle(title);
  if (!candidate) return null;
  return catalogVideos.find((v) => {
    const t = normalizeTitle(v.title);
    return candidate === t || (candidate.length >= 12 && t.includes(candidate)); // allow-literal: 짧은 조각이 엉뚱한 영상에 걸리지 않게 하는 하한(publisher와 같음)
  }) || null;
}

/**
 * 스튜디오 "카테고리" 이름과 유튜브 API 카테고리 번호(2026-11-16 EP30 편집 화면의 목록 15개를 읽어 정함).
 * 번호는 유튜브 API의 공통 값이고, 27(교육)은 우리 채널 최근 영상의 catalog.json categoryId와 같다.
 */
export const CATEGORIES = Object.freeze({
  '영화/애니메이션': '1', '자동차/교통': '2', 음악: '10', '애완동물/동물': '15', 스포츠: '17', '여행/이벤트': '19', 게임: '20',
  '인물/블로그': '22', 코미디: '23', 엔터테인먼트: '24', '뉴스/정치': '25', '노하우/스타일': '26', 교육: '27', 과학기술: '28', '비영리/사회운동': '29',
});
export const DEFAULT_CATEGORY = '교육';
export const EXPECTED_LANGUAGE_LABEL = '한국어';
export const EXPECTED_LANGUAGE_CODE = 'ko';

/** --category 값(한글 이름 또는 번호)을 {label, id}로 바꾼다. 모르는 값이면 {error}. */
export function resolveCategory(value = DEFAULT_CATEGORY) {
  const v = String(value ?? '').trim();
  if (Object.hasOwn(CATEGORIES, v)) return {label: v, id: CATEGORIES[v]};
  const byId = Object.entries(CATEGORIES).find(([, id]) => id === v);
  if (byId) return {label: byId[0], id: byId[1]};
  return {error: `모르는 카테고리입니다: "${v}". 가능한 값: ${Object.keys(CATEGORIES).join(', ')}`};
}

/** 편집 화면에서 읽은 세 칸이 기대값과 같은지 본다. 다른 칸 목록을 돌려준다. */
export function diffSettings(read, expected) {
  const out = [];
  if (norm(read.category) !== expected.category.label) out.push({key: 'category', label: '카테고리', read: norm(read.category), want: expected.category.label});
  if (norm(read.videoLanguage) !== EXPECTED_LANGUAGE_LABEL) out.push({key: 'videoLanguage', label: '동영상 언어', read: norm(read.videoLanguage), want: EXPECTED_LANGUAGE_LABEL});
  if (norm(read.titleLanguage) !== EXPECTED_LANGUAGE_LABEL) out.push({key: 'titleLanguage', label: '제목 및 설명 언어', read: norm(read.titleLanguage), want: EXPECTED_LANGUAGE_LABEL});
  return out;
}

/**
 * 동기화된 catalog.json의 영상 한 편이 기대한 설정인지 본다(API 값).
 * defaultLanguage = 제목 및 설명 언어. 카탈로그에는 동영상 언어(defaultAudioLanguage) 칸이 없어 화면에서 읽은 값으로 확인한다.
 * 반환: {ok, missing:["빠진 설정 문장", ...]}
 */
export function checkCatalogSettings(video, expectedCategoryId) {
  if (!video) return {ok: false, missing: ['동기화된 카탈로그에 이 영상이 아직 없습니다.']};
  const missing = [];
  if (video.defaultLanguage !== EXPECTED_LANGUAGE_CODE) missing.push(`제목 및 설명 언어(defaultLanguage)가 ${EXPECTED_LANGUAGE_CODE}가 아님(현재 ${video.defaultLanguage ?? '비어 있음'})`);
  if (String(video.categoryId ?? '') !== String(expectedCategoryId)) missing.push(`카테고리(categoryId)가 ${expectedCategoryId}가 아님(현재 ${video.categoryId ?? '비어 있음'})`);
  return {ok: missing.length === 0, missing};
}

export const isShortsPackage = (pkgDir) => Boolean(shortsPackageEpisode(basename(resolve(pkgDir)))) || existsSync(join(pkgDir, 'shorts-status.json'));

/** 패키지의 대시보드 상태 파일 이름(쇼츠는 shorts-status.json, 롱폼은 status.json). */
export const statusFileName = (pkgDir) => (isShortsPackage(pkgDir) ? 'shorts-status.json' : 'status.json');

const readJsonSafe = (path) => {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
};
const readTextSafe = (path) => {
  try { return readFileSync(path, 'utf8'); } catch { return null; }
};

/**
 * 패키지를 점검한다. 화면을 쓰지 않는다. 반환: {plan, checks:[{id,label,ok,detail}], ok}
 * options: {schedule(parseSchedule 결과 또는 null), playlist, noPlaylist, noSubs, catalogVideos(null이면 못 읽음), login}
 */
export function inspectPackage(pkgDir, options = {}) {
  const {schedule = null, playlist = null, noPlaylist = false, noSubs = false, catalogVideos = null, login = null, category = resolveCategory()} = options;
  const checks = [];
  const add = (id, label, ok, detail = '') => checks.push({id, label, ok: Boolean(ok), detail});

  if (!existsSync(pkgDir) || !statSync(pkgDir).isDirectory()) {
    add('package', '패키지 폴더', false, `폴더가 없습니다: ${pkgDir}`);
    return {plan: null, checks, ok: false};
  }
  const files = readdirSync(pkgDir);
  const videoFile = selectPackageVideo(files);
  const title = (readTextSafe(join(pkgDir, 'title.txt')) ?? '').trim();
  const description = (readTextSafe(join(pkgDir, 'description.txt')) ?? '').trim();
  const tagsRaw = (readTextSafe(join(pkgDir, 'tags.txt')) ?? '').trim();
  const tags = parseTags(tagsRaw);
  const pinned = (readTextSafe(join(pkgDir, 'pinned-comment.txt')) ?? '').trim();
  const thumbPath = join(pkgDir, 'thumbnail.jpg');
  const subsPath = join(pkgDir, 'subtitles-ko.srt');
  const hasSubs = existsSync(subsPath);
  const uploadSubs = hasSubs && !noSubs;

  // 필수 결정
  if (!schedule) add('schedule', '예약 시각(--schedule)', false, '--schedule "YYYY-MM-DD HH:mm"(한국 시각)을 꼭 주세요.');
  else if (!schedule.ok) add('schedule', '예약 시각(--schedule)', false, schedule.error);
  else add('schedule', '예약 시각(--schedule)', true, `${schedule.text} 한국 시각 = ${schedule.utcIso}`);

  if (noPlaylist && playlist) add('playlist', '재생목록 결정', false, '--playlist와 --no-playlist를 같이 줄 수 없습니다.');
  else if (!noPlaylist && !playlist) add('playlist', '재생목록 결정', false, '--playlist "<이름>" 또는 --no-playlist 중 하나를 꼭 주세요(재생목록을 빠뜨리는 실수 방지).');
  else add('playlist', '재생목록 결정', true, noPlaylist ? '재생목록 없음(--no-playlist)' : `"${playlist}"`);

  // 설정 두 칸(카테고리·언어)은 예약 뒤 편집 화면에서 설정하고 읽어서 확인한다.
  if (category.error) add('category', '카테고리(--category)', false, category.error);
  else add('category', '카테고리(--category)', true, `${category.label}(${category.id}) — 예약 뒤 편집 화면에서 설정·확인`);
  add('languages', '언어 두 칸', true, `동영상 언어·제목 및 설명 언어 둘 다 ${EXPECTED_LANGUAGE_LABEL}(${EXPECTED_LANGUAGE_CODE}) — 예약 뒤 편집 화면에서 설정, 동기화 뒤 API 값으로 확인`);

  // 파일
  add('video', '영상 mp4', Boolean(videoFile), videoFile || '패키지에 mp4가 없습니다.');
  add('title', 'title.txt', Boolean(title), title ? `${title.length}자` : '없거나 비어 있습니다.');
  add('description', 'description.txt', Boolean(description), description ? `${description.length}자` : '없거나 비어 있습니다.');
  add('tags', 'tags.txt', tags.length > 0, tags.length ? `${tags.length}개` : '없거나 비어 있습니다.');
  const thumbBytes = existsSync(thumbPath) ? statSync(thumbPath).size : 0;
  add('thumbnail', 'thumbnail.jpg', thumbBytes > 0 && thumbBytes <= MAX_THUMBNAIL_BYTES,
    thumbBytes === 0 ? '없습니다.' : thumbBytes > MAX_THUMBNAIL_BYTES ? `${thumbBytes}바이트로 2MB를 넘습니다.` : `${thumbBytes}바이트`);

  // 길이 상한
  const tagChars = tagCharCount(tags);
  const limitProblems = [];
  if (title.length > MAX_TITLE) limitProblems.push(`제목 ${title.length}자(최대 ${MAX_TITLE})`);
  if (tagChars > MAX_TAG_CHARS) limitProblems.push(`태그 ${tagChars}자(최대 ${MAX_TAG_CHARS})`);
  if (description.length > MAX_DESCRIPTION) limitProblems.push(`설명 ${description.length}자(최대 ${MAX_DESCRIPTION})`);
  if (/[<>]/.test(title) || /[<>]/.test(description)) limitProblems.push('제목·설명에 < 또는 > 가 있습니다(유튜브가 거절합니다)');
  add('limits', '길이 상한', limitProblems.length === 0, limitProblems.join(', ') || `제목 ${title.length}/${MAX_TITLE}, 태그 ${tagChars}/${MAX_TAG_CHARS}, 설명 ${description.length}/${MAX_DESCRIPTION}`);

  // 금지어(video 점검과 같은 단일 목록)
  const hits = [['제목', title], ['설명', description], ['태그', tagsRaw], ['고정 댓글', pinned]]
    .flatMap(([where, text]) => findBannedTerms(text).map((h) => `${where}: ${h.term}`));
  add('banned', '금지어 검사', hits.length === 0, hits.length ? hits.join(', ') : '없음(제목·설명·태그·고정 댓글)');

  // 중복 위험
  const statusFile = statusFileName(pkgDir);
  const hasStatusJson = existsSync(join(pkgDir, 'status.json'));
  const state = readJsonSafe(join(pkgDir, statusFile));
  const stateVideoId = state?.videoId || (hasStatusJson ? readJsonSafe(join(pkgDir, 'status.json'))?.videoId : null) || null;
  add('not-uploaded', '이미 올렸는지', !stateVideoId, stateVideoId ? `${statusFile}에 이미 영상 ID(${stateVideoId})가 있습니다 — 이미 올림.` : `${statusFile}에 영상 ID 없음`);
  add('no-status-json', 'status.json 없음', !hasStatusJson, hasStatusJson ? 'status.json이 있으면 자동 업로드 대기열 대상이라 중복 위험이 있어 거절합니다.' : '없음');
  if (catalogVideos === null) add('catalog-dup', '채널 카탈로그 중복', false, 'data/youtube/catalog.json을 읽지 못했습니다.');
  else {
    const dup = findCatalogDuplicate(title, catalogVideos);
    add('catalog-dup', '채널 카탈로그 중복', !dup, dup ? `같은 제목이 이미 채널에 있습니다(영상 ID ${dup.videoId}).` : '같은 제목 없음');
  }

  if (login !== null) add('login', 'Studio 크롬 로그인', login === 'logged-in', login === 'logged-in' ? '로그인됨' : `상태: ${login}. npm run studio-chrome으로 크롬을 켜고 채널 소유 계정으로 로그인하세요.`);

  const plan = {
    pkgDir,
    pkgName: basename(resolve(pkgDir)),
    kind: isShortsPackage(pkgDir) ? 'shorts' : 'longform',
    statusFile,
    videoPath: videoFile ? join(pkgDir, videoFile) : null,
    title, description, tags,
    thumbnailPath: thumbBytes ? thumbPath : null,
    subsPath: uploadSubs ? subsPath : null,
    subsNote: !hasSubs ? '자막 파일 없음' : noSubs ? '자막 파일이 있지만 --no-subs로 끔' : 'subtitles-ko.srt를 예약 뒤 올림',
    playlist: noPlaylist ? null : playlist,
    scheduleText: schedule?.ok ? schedule.text : null,
    category: category.error ? null : category,
  };
  return {plan, checks, ok: checks.every((c) => c.ok)};
}

/** 점검 표를 글로 만든다. */
export function formatChecks(checks) {
  return checks.map((c) => `${c.ok ? '통과' : '실패'}  ${c.label}${c.detail ? ` — ${c.detail}` : ''}`).join('\n');
}

export function formatPlan(plan) {
  const rel = (p) => (p ? basename(p) : '(없음)');
  return [
    `패키지: ${plan.pkgName} (${plan.kind === 'shorts' ? '쇼츠' : '롱폼'})`,
    `영상 파일: ${rel(plan.videoPath)}`,
    `제목: ${plan.title}`,
    `설명: ${plan.description.length}자, 태그: ${plan.tags.length}개`,
    `썸네일: ${rel(plan.thumbnailPath)}`,
    `자막: ${plan.subsNote}`,
    `재생목록: ${plan.playlist ? `"${plan.playlist}"` : '없음'}`,
    `카테고리: ${plan.category ? `${plan.category.label}(${plan.category.id})` : '(올바르지 않음)'}, 동영상 언어·제목 및 설명 언어: ${EXPECTED_LANGUAGE_LABEL}`,
    `예약 시각(한국): ${plan.scheduleText || '(정해지지 않음)'}`,
  ].join('\n');
}

/** 스튜디오 예약이 끝난 뒤 대시보드 동기화 결과를 판정한다(같은 시각인지). */
export const scheduledForMatches = (scheduledFor, schedule) => {
  const ms = Date.parse(scheduledFor || '');
  return Number.isFinite(ms) && ms === Date.parse(schedule.utcIso);
};

export const USAGE = [
  '사용: npm run studio-upload -- <패키지 폴더> --schedule "YYYY-MM-DD HH:mm" (--playlist "<이름>" | --no-playlist) [--category 교육] [--no-subs] [--yes]',
  '      npm run studio-upload -- <패키지 폴더> --guide [--schedule "..."] [--playlist "..."]',
  '--yes가 없으면 점검만 합니다. 시각은 한국 시각입니다.',
].join('\n');

export function parseArgs(argv) {
  const out = {pkg: null, schedule: null, playlist: null, noPlaylist: false, noSubs: false, yes: false, guide: false, category: null, errors: []};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--yes') out.yes = true;
    else if (a === '--guide') out.guide = true;
    else if (a === '--no-playlist') out.noPlaylist = true;
    else if (a === '--no-subs') out.noSubs = true;
    else if (a === '--schedule' || a === '--playlist' || a === '--category') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) out.errors.push(`${a} 뒤에 값이 필요합니다.`);
      else { out[a.slice(2)] = v; i += 1; }
    } else if (a.startsWith('--')) out.errors.push(`알 수 없는 옵션: ${a}`);
    else if (out.pkg === null) out.pkg = a;
    else out.errors.push(`패키지 폴더는 한 번에 1개만 받습니다(받은 값: ${out.pkg}, ${a}).`);
  }
  if (!out.pkg) out.errors.push('패키지 폴더를 적어 주세요.');
  if (out.guide && out.yes) out.errors.push('--guide와 --yes는 같이 쓸 수 없습니다.');
  return out;
}

/** 같은 한 줄 명령을 만든다. 빈 값은 "정해야 함" 표시로 둔다. */
export function buildCommand(pkgRel, {scheduleText, playlist, noPlaylist, noSubs, yes, category} = {}) {
  const parts = ['npm run studio-upload --', pkgRel];
  parts.push(`--schedule "${scheduleText || '<정해야 함: YYYY-MM-DD HH:mm>'}"`);
  parts.push(noPlaylist ? '--no-playlist' : `--playlist "${playlist || '<정해야 함: 재생목록 이름>'}"`);
  if (category && category !== DEFAULT_CATEGORY) parts.push(`--category "${category}"`);
  if (noSubs) parts.push('--no-subs');
  if (yes) parts.push('--yes');
  return parts.join(' ');
}

/** UPLOAD-GUIDE.md 내용. 세 방법 모두 같은 한 줄 명령을 쓴다. */
export function buildGuide({pkgRel, plan, scheduleText, playlist, noPlaylist, noSubs}) {
  const need = (v, label) => v || `<미정> (${label} — 정해야 함)`;
  const cmdDry = buildCommand(pkgRel, {scheduleText, playlist, noPlaylist, noSubs, category: plan.category?.label});
  const cmdYes = buildCommand(pkgRel, {scheduleText, playlist, noPlaylist, noSubs, yes: true, category: plan.category?.label});
  const playlistText = noPlaylist ? '재생목록 없음' : need(playlist, '재생목록 이름');
  const categoryLabel = plan.category?.label || DEFAULT_CATEGORY;
  const categoryId = plan.category?.id || CATEGORIES[DEFAULT_CATEGORY];
  return `# 업로드 가이드 — ${plan.pkgName}

이 편을 스튜디오에 예약하는 방법은 3가지입니다. **셋 다 같은 한 줄 명령**을 씁니다. 영상 mp4는 깃에 올라가지 않으므로 이 PC(영상이 있는 PC)에서 실행하세요.

정해야 할 것 두 가지: 예약 시각(한국 시각), 재생목록(이름 또는 없음). 아래 \`<미정>\`이 남아 있으면 먼저 정하세요.

- 예약 시각: ${need(scheduleText, '예약 시각')}
- 재생목록: ${playlistText}
- 자막: ${plan.subsNote}
- 카테고리: ${categoryLabel}, 동영상 언어: ${EXPECTED_LANGUAGE_LABEL}, 제목 및 설명 언어: ${EXPECTED_LANGUAGE_LABEL}

## 가) 내가 직접 스튜디오에서 (체크리스트)

스튜디오 주소: https://studio.youtube.com → 만들기 → 동영상 업로드

- [ ] 영상 파일: \`${plan.videoPath ? basename(plan.videoPath) : '(mp4 없음)'}\`
- [ ] 제목(그대로 붙여넣기):
\`\`\`
${plan.title}
\`\`\`
- [ ] 설명(그대로 붙여넣기):
\`\`\`
${plan.description}
\`\`\`
- [ ] 썸네일: \`thumbnail.jpg\`
- [ ] "아동용이 아닙니다" 선택
- [ ] 더보기 → 태그(그대로 붙여넣기):
\`\`\`
${plan.tags.join(', ')}
\`\`\`
- [ ] 더보기에서 **동영상 언어: 한국어**, **카테고리: ${categoryLabel}**
- [ ] **제목 및 설명 언어: 한국어** (업로드 화면에는 이 칸이 없을 수 있습니다. 예약 뒤 영상 편집 화면의 "자세히 보기"에서 고르고 "저장")
- [ ] 재생목록: ${playlistText}
- [ ] 다음 → 다음 → 다음 → 공개 상태에서 **"예약"**(공개·저장 아님) → 날짜·시간: ${need(scheduleText, '예약 시각')}
- [ ] 예약 확인 창에 날짜·시간이 맞는지 보고 닫기
- [ ] 자막: 영상 → 언어 → 한국어 "수동 업로드" → 타이밍 포함 → \`subtitles-ko.srt\` → "자막 수정"을 열어 "게시"${plan.subsPath ? '' : ' (이 편은 자막을 올리지 않기로 함)'}

## 나) 제미나이(Antigravity)에게 시키기

아래 코드 블록 하나를 그대로 붙여넣으세요.

\`\`\`
git pull 한 뒤 다음 명령을 실행하고, 출력 전체와 종료 코드를 그대로 보고해.
${cmdYes}
다른 파일은 고치지 마. 실패하면 멈추고 어디서 실패했는지만 적어.
\`\`\`

## 다) Claude에게 시키기

\`${cmdYes}\`

먼저 점검만 보려면 \`--yes\`를 뺀 명령: \`${cmdDry}\`

## 끝난 뒤 확인

세 방법 모두 끝난 뒤 확인은 Claude가 합니다. 대시보드에서 동기화한 뒤 \`${plan.statusFile}\`의 \`scheduledFor\`가 예약 시각(UTC${scheduleText ? ` ${new Date(Date.parse(`${scheduleText.replace(' ', 'T')}:00+09:00`)).toISOString()}` : ''})과 같은지 보고, 같은 동기화의 \`data/youtube/catalog.json\`에서 그 영상의 \`defaultLanguage\`가 \`ko\`(제목 및 설명 언어)이고 \`categoryId\`가 \`${categoryId}\`(${categoryLabel})인지 봅니다. 재생목록은 API에 없어 스튜디오 화면에서 확인합니다.
`;
}

// ───────────────────────── 스튜디오 조작(실제 화면) ─────────────────────────

class StepError extends Error {}

const log = (msg) => console.log(msg);
const step = async (name, fn) => {
  try {
    const r = await fn();
    log(`  [완료] ${name}`);
    return r;
  } catch (err) {
    throw new StepError(`${name} 단계에서 실패: ${String(err.message).split('\n')[0]}`);
  }
};

/** 재생목록 대화상자를 연다. 업로드 대화상자와 편집 화면 모두 같은 부품(ytcp-video-metadata-playlists)이다. */
export async function openPlaylistDialog(page) {
  const box = page.locator('ytcp-video-metadata-playlists').first();
  await box.scrollIntoViewIfNeeded();
  await box.locator('ytcp-dropdown-trigger, #trigger, .dropdown-trigger').first().click();
  const dlg = page.locator('ytcp-playlist-dialog');
  await dlg.locator('label.ytcp-checkbox-label').first().waitFor({state: 'visible', timeout: 15000}); // allow-literal: 대기 15초
  return dlg;
}

/** 재생목록 대화상자에 보이는 목록 이름을 읽는다(2026-11-16 EP30 편집 화면에서 읽어 확인). */
export const readPlaylistNames = async (dlg) => (await dlg.locator('label.ytcp-checkbox-label').allInnerTexts()).map(norm).filter(Boolean);

/**
 * 재생목록 하나를 체크하고 완료를 누른다.
 * 실제 업로드에서 처음 시험됨: 목록 열기와 이름 읽기는 EP30 편집 화면에서 확인했지만, 체크 클릭과 "완료"는
 * 사용자가 EP30 재생목록을 직접 정하는 중이라 눌러 보지 못했다.
 */
export async function choosePlaylist(page, name) {
  const dlg = await openPlaylistDialog(page);
  const names = await readPlaylistNames(dlg);
  if (!names.includes(norm(name))) throw new Error(`재생목록 "${name}"이 목록에 없습니다. 있는 것: ${names.join(' / ') || '(없음)'}`);
  const labels = dlg.locator('label.ytcp-checkbox-label');
  let chosen = null;
  for (let i = 0; i < (await labels.count()); i += 1) {
    if (norm(await labels.nth(i).innerText()) === norm(name)) { chosen = labels.nth(i); break; }
  }
  if (!chosen) throw new Error(`재생목록 "${name}"과 이름이 정확히 같은 줄을 찾지 못했습니다.`);
  const box = chosen.locator('[role="checkbox"]').first();
  if ((await box.getAttribute('aria-checked')) !== 'true') await chosen.click();
  await page.waitForTimeout(500); // allow-literal: 체크 반영 대기
  if ((await box.getAttribute('aria-checked')) !== 'true') throw new Error(`재생목록 "${name}" 체크가 켜지지 않았습니다.`);
  await dlg.getByRole('button', {name: '완료'}).click();
  await page.locator('ytcp-playlist-dialog').waitFor({state: 'hidden', timeout: 15000}); // allow-literal: 대기 15초
  const shown = norm(await page.locator('ytcp-video-metadata-playlists').first().innerText());
  if (!shown.includes(norm(name))) throw new Error(`화면의 재생목록 칸에 "${name}"이 보이지 않습니다(칸 내용: ${shown}).`);
}

/**
 * 영상의 한국어 자막을 올린다: 언어 화면 → 수동 업로드 → 타이밍 포함 → 파일 → 자막 수정 → 게시.
 * 2026-11-16 EP30(Ng6amm9qFrI)에서 직접 확인한 순서다. 업로드만 하면 초안이라 "게시"까지 눌러야 한다.
 */
export async function uploadSubtitles(page, videoId, srtPath) {
  await page.goto(`https://studio.youtube.com/video/${videoId}/translations`, {waitUntil: 'domcontentloaded'});
  const manual = page.getByRole('button', {name: '수동 업로드'}).first();
  await manual.waitFor({state: 'visible', timeout: 45000}); // allow-literal: 대기 45초
  await manual.click();
  const radio = page.locator('tp-yt-paper-radio-button', {hasText: '타이밍 포함'}).first();
  await radio.waitFor({state: 'visible', timeout: 15000}); // allow-literal: 대기 15초
  if ((await radio.getAttribute('aria-checked')) !== 'true') await radio.click();
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', {timeout: 15000}), // allow-literal: 대기 15초
    page.getByRole('button', {name: '계속'}).first().click(),
  ]);
  await chooser.setFiles(srtPath);
  await page.getByText('한국어 자막이 업로드됨').first().waitFor({timeout: 45000}); // allow-literal: 대기 45초
  await page.getByRole('button', {name: '자막 수정'}).first().click();
  await page.locator('textarea').first().waitFor({state: 'visible', timeout: 30000}); // allow-literal: 대기 30초
  await page.getByRole('button', {name: '게시', exact: true}).first().click();
  await page.getByText('한국어 자막이 게시되었습니다').first().waitFor({timeout: 45000}); // allow-literal: 대기 45초
}

/** 업로드 화면에서 예약 확정까지 한다. 반환: {videoId, confirmText} */
export async function scheduleInStudio(page, plan, schedule) {
  const dlg = page.locator('ytcp-uploads-dialog');
  await step('업로드 화면 열기', async () => {
    await page.goto(`https://studio.youtube.com/channel/${OUR_CHANNEL_ID}/videos/upload?d=ud`, {waitUntil: 'domcontentloaded'});
    if (page.url().includes('accounts.google.com')) throw new Error('구글 로그인이 풀렸습니다(Studio-Automation 크롬에서 다시 로그인).');
    await page.locator('input[type="file"]').first().waitFor({state: 'attached', timeout: 45000}); // allow-literal: 대기 45초
  });
  await step('영상 파일 붙이기', async () => {
    await page.locator('input[type="file"]').first().setInputFiles(plan.videoPath);
    await dlg.locator('#title-textarea #textbox').waitFor({state: 'visible', timeout: 120000}); // allow-literal: 대기 2분
  });
  await step('제목·설명 입력', async () => {
    const titleBox = dlg.locator('#title-textarea #textbox');
    await titleBox.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText(plan.title);
    const descBox = dlg.locator('#description-textarea #textbox');
    await descBox.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.insertText(plan.description);
    await page.waitForTimeout(500);
    if (norm(await titleBox.innerText()) !== norm(plan.title)) throw new Error('제목 칸의 글이 title.txt와 다릅니다.');
    if (norm(await descBox.innerText()) !== norm(plan.description)) throw new Error('설명 칸의 글이 description.txt와 다릅니다.');
  });
  await step('썸네일 올리기', async () => {
    await dlg.locator('input#file-loader, input[type="file"][accept*="image"]').first().setInputFiles(plan.thumbnailPath);
    await page.waitForTimeout(4000); // allow-literal: 2026-11-16 시험에서 쓴 썸네일 반영 대기
  });
  await step('아동용 아님 선택 확인', async () => {
    // 실제 업로드에서 처음 시험됨: name 값(VIDEO_MADE_FOR_KIDS_NOT_MFK)은 스튜디오의 알려진 표시이고, 글자로도 한 번 더 찾는다.
    let radio = dlg.locator('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]').first();
    if ((await radio.count()) === 0) radio = dlg.locator('tp-yt-paper-radio-button', {hasText: '아동용이 아닙니다'}).first();
    await radio.scrollIntoViewIfNeeded();
    if ((await radio.getAttribute('aria-checked')) !== 'true') await radio.click();
    await page.waitForTimeout(500);
    if ((await radio.getAttribute('aria-checked')) !== 'true') throw new Error('"아동용이 아닙니다"가 선택되지 않았습니다.');
  });
  await step('더보기 열고 태그 입력', async () => {
    const more = dlg.locator('ytcp-button#toggle-button, #toggle-button').first();
    await more.scrollIntoViewIfNeeded();
    await more.click();
    const tagInput = dlg.locator('#tags-container input#text-input, ytcp-form-input-container#tags-container input').first();
    await tagInput.waitFor({state: 'visible', timeout: 15000}); // allow-literal: 대기 15초
    await tagInput.scrollIntoViewIfNeeded();
    await tagInput.click();
    await page.keyboard.insertText(plan.tags.join(', '));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    const chips = (await dlg.locator('#tags-container ytcp-chip, #chip-bar ytcp-chip').allInnerTexts()).map(norm).filter(Boolean);
    const expected = new Set(plan.tags.map((t) => t.toLowerCase()));
    if (chips.length !== expected.size) throw new Error(`태그 칩이 ${chips.length}개입니다(기대: ${expected.size}개).`);
  });
  await step('영상 언어 한국어 확인', async () => {
    const text = norm(await dlg.innerText());
    if (!/동영상 언어\s*한국어/.test(text)) throw new Error('"동영상 언어"가 한국어로 보이지 않습니다.');
  });
  await step('AI 사용 여부(변형되었거나 생성된 콘텐츠) 확인', async () => {
    const alteredRadio = dlg.locator('tp-yt-paper-radio-button[name="VIDEO_HAS_ALTERED_CONTENT_YES"]').first();
    if (await alteredRadio.isVisible().catch(() => false)) {
      if ((await alteredRadio.getAttribute('aria-checked')) !== 'true') {
        await alteredRadio.click();
        await page.waitForTimeout(500);
      }
    }
  });
  if (plan.playlist) await step(`재생목록 "${plan.playlist}" 선택`, () => choosePlaylist(page, plan.playlist));
  await step('다음 3번', async () => {
    const next = dlg.locator('#next-button');
    for (let i = 0; i < 3; i += 1) {
      await next.click();
      await page.waitForTimeout(2500); // allow-literal: 2026-11-16 시험에서 쓴 화면 넘김 대기
    }
  });
  await step('예약 펼치고 날짜·시간 입력', async () => {
    await dlg.locator('#second-container-expand-button').click();
    await page.waitForTimeout(1500); // allow-literal: 2026-11-16 시험에서 쓴 펼침 대기
    await dlg.locator('#datepicker-trigger').click();
    await page.waitForTimeout(1000); // allow-literal: 날짜 선택 창 열림 대기
    const dateInput = page.locator('ytcp-date-picker tp-yt-paper-input input, ytcp-date-picker input').first();
    await dateInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(schedule.dateText);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000); // allow-literal: 날짜 반영 대기
    const timeInput = dlg.locator('ytcp-form-input-container#time-of-day-container input');
    await timeInput.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(schedule.timeText);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000); // allow-literal: 시간 반영 대기
  });
  await step('읽어서 확인(날짜·시간·버튼 글자)', async () => {
    const check = checkScheduleReadback({
      doneButtonText: await dlg.locator('#done-button').innerText(),
      dateRead: await dlg.locator('#datepicker-trigger').innerText(),
      timeRead: await dlg.locator('ytcp-form-input-container#time-of-day-container input').inputValue(),
      schedule,
    });
    if (!check.ok) throw new Error(check.reason);
  });
  const confirm = await step('"예약" 누르고 확인 창 보기', async () => {
    await dlg.locator('#done-button').click(); // 위 확인에서 글자가 정확히 "예약"임을 이미 확인했다.
    const win = page.locator('ytcp-dialog, tp-yt-paper-dialog').filter({hasText: '동영상 예약됨'}).first();
    await win.waitFor({state: 'visible', timeout: 120000}); // allow-literal: 대기 2분
    const text = norm(await win.innerText());
    if (!confirmationMatches(text, schedule)) throw new Error(`확인 창에 기대한 날짜·시각(${schedule.text})이 없습니다. 창 내용: ${text.slice(0, 160)}`);
    return {text, videoId: videoIdFromText(text)};
  });
  await page.getByRole('button', {name: '닫기'}).first().click({timeout: 5000}).catch(() => {}); // allow-literal: 닫기 실패는 무시
  return {videoId: confirm.videoId, confirmText: confirm.text};
}

/**
 * 편집 화면(https://studio.youtube.com/video/<ID>/edit)의 "자세히 보기" 안에 있는 세 칸의 선택자(2026-11-16 EP30에서 읽어 확인):
 *   카테고리: ytcp-form-select#category / 동영상 언어: ytcp-form-language-input#language-input /
 *   제목 및 설명 언어: "제목 및 설명 언어"가 든 다른 ytcp-form-language-input. 목록 줄은 tp-yt-paper-item(선택된 줄은 aria-selected).
 */
const settingBoxes = (page) => ({
  category: page.locator('ytcp-form-select#category'),
  videoLanguage: page.locator('ytcp-form-language-input#language-input'),
  titleLanguage: page.locator('ytcp-form-language-input').filter({hasText: '제목 및 설명 언어'}).first(),
});

/** 편집 화면을 열고 "자세히 보기"를 펼친다(이미 펼쳐져 있으면 누르지 않는다). */
export async function openEditSettings(page, videoId) {
  await page.goto(`https://studio.youtube.com/video/${videoId}/edit`, {waitUntil: 'domcontentloaded'});
  if (page.url().includes('accounts.google.com')) throw new Error('구글 로그인이 풀렸습니다.');
  await page.locator('ytcp-video-metadata-playlists').first().waitFor({timeout: 45000}); // allow-literal: 대기 45초
  const box = settingBoxes(page);
  if (!(await box.category.isVisible().catch(() => false))) {
    await page.locator('#toggle-button').first().click();
  }
  await box.category.waitFor({state: 'visible', timeout: 15000}); // allow-literal: 대기 15초
  await box.category.scrollIntoViewIfNeeded();
}

/** 세 칸의 현재 값을 읽는다(글자 앞의 칸 이름은 뗀다). */
export async function readVideoSettings(page) {
  const box = settingBoxes(page);
  const text = async (loc, label) => norm(await loc.innerText()).replace(new RegExp(`^${label}\\s*`), '');
  return {
    category: await text(box.category, '카테고리'),
    videoLanguage: await text(box.videoLanguage, '동영상 언어'),
    titleLanguage: await text(box.titleLanguage, '제목 및 설명 언어'),
  };
}

/** 편집 화면의 "공개 상태" 칸 글자(예: 예약됨). */
export const readVisibilityLabel = async (page) => /공개 상태\s+(\S+)/.exec(norm(await page.locator('body').innerText()))?.[1] || null;

/** 목록형 칸에서 이름이 정확히 같은 줄을 고른다. */
async function selectDropdownValue(page, boxLocator, label) {
  await boxLocator.scrollIntoViewIfNeeded();
  await boxLocator.locator('ytcp-dropdown-trigger, #trigger').first().click();
  const items = page.locator('tp-yt-paper-item:visible');
  await items.first().waitFor({state: 'visible', timeout: 15000}); // allow-literal: 대기 15초
  const texts = (await items.allInnerTexts()).map(norm);
  const index = texts.indexOf(label);
  if (index < 0) throw new Error(`목록에 "${label}"이 없습니다.`);
  await items.nth(index).click();
  await page.waitForTimeout(800); // allow-literal: 선택 반영 대기
}

/**
 * 카테고리·동영상 언어·제목 및 설명 언어를 읽어 보고, 다른 칸만 고쳐 저장한 뒤 다시 열어 읽어서 확인한다.
 * 실제 업로드에서 처음 시험됨: 값 읽기와 목록 열기는 EP30에서 확인했지만(저장은 하지 않음), 목록 줄 클릭과 "저장"은 사용자가 EP30을 직접 고치는 중이라 눌러 보지 못했다.
 * 안전: 공개 상태가 "예약됨"이 아니면 저장하지 않고 멈춘다. 저장 뒤에도 "예약됨"이어야 한다(예약 시각은 마지막 API 확인이 본다).
 */
export async function ensureVideoSettings(page, videoId, expected) {
  await openEditSettings(page, videoId);
  const before = await readVideoSettings(page);
  const result = {before, changed: [], after: before};
  if (diffSettings(before, expected).length === 0) return result;
  const visibility = await readVisibilityLabel(page);
  if (visibility !== '예약됨') throw new Error(`공개 상태가 "${visibility}"입니다(기대: 예약됨). 설정을 저장하지 않고 멈춥니다.`);
  const box = settingBoxes(page);
  const pick = {
    category: [box.category, expected.category.label],
    videoLanguage: [box.videoLanguage, EXPECTED_LANGUAGE_LABEL],
    titleLanguage: [box.titleLanguage, EXPECTED_LANGUAGE_LABEL],
  };
  for (const d of diffSettings(before, expected)) {
    // 동영상 언어를 바꾸면 제목 및 설명 언어가 따라 바뀔 수 있어 칸마다 다시 읽고 필요할 때만 고른다.
    if (!diffSettings(await readVideoSettings(page), expected).some((x) => x.key === d.key)) continue;
    await selectDropdownValue(page, ...pick[d.key]);
    result.changed.push(d.label);
  }
  const picked = diffSettings(await readVideoSettings(page), expected);
  if (picked.length) throw new Error(`선택 뒤에도 값이 다릅니다: ${picked.map((d) => `${d.label}="${d.read}"`).join(', ')}. 저장하지 않았습니다.`);
  await page.locator('ytcp-button#save').first().click();
  await page.waitForTimeout(3000); // allow-literal: 저장 요청이 시작될 때까지 대기
  await page.waitForFunction(() => document.querySelector('ytcp-button#save')?.hasAttribute('disabled'), null, {timeout: 30000}); // allow-literal: 저장이 끝나 버튼이 다시 꺼질 때까지 최대 30초
  await openEditSettings(page, videoId); // 다시 열어 저장된 값을 읽는다
  result.after = await readVideoSettings(page);
  const remaining = diffSettings(result.after, expected);
  if (remaining.length) throw new Error(`저장 뒤 다시 열어도 값이 다릅니다: ${remaining.map((d) => `${d.label}="${d.read}"`).join(', ')}`);
  const visibilityAfter = await readVisibilityLabel(page);
  if (visibilityAfter !== '예약됨') throw new Error(`저장 뒤 공개 상태가 "${visibilityAfter}"입니다(기대: 예약됨). 스튜디오에서 바로 확인하세요.`);
  return result;
}

const readCatalogVideo = (videoId) => (readJsonSafe(join(projectDir, 'data', 'youtube', 'catalog.json'))?.videos || []).find((x) => x.videoId === videoId) || null;

/**
 * 대시보드 동기화를 부르고 API 값으로 끝 검증을 한다(최대 3번).
 * ① 예약 시각이 기대와 같은지(쇼츠 shorts-status.json, 롱폼 catalog.json) ② catalog.json의 defaultLanguage가 ko이고 categoryId가 기대값인지.
 * 재생목록은 API에 없어 화면에서 읽은 값으로 확인한다(choosePlaylist).
 */
export async function syncAndVerify({plan, schedule, videoId, expectedCategoryId = CATEGORIES[DEFAULT_CATEGORY], fetchFn = fetch, sleepMs = 20000, catalogVideoFn = readCatalogVideo}) { // allow-literal: 재시도 간격 20초
  let lastReason = '';
  let missing = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) { // allow-literal: 최대 3번 시도
    try {
      const res = await fetchFn(DASHBOARD_SYNC_URL, {method: 'POST', signal: AbortSignal.timeout(240000)}); // allow-literal: 동기화는 오래 걸릴 수 있어 4분
      if (!res.ok) { lastReason = `대시보드 동기화 응답 ${res.status}`; }
      else {
        const found = readRecordedSchedule(plan, videoId);
        const settings = checkCatalogSettings(catalogVideoFn(videoId), expectedCategoryId);
        const scheduleOk = scheduledForMatches(found.scheduledFor, schedule);
        if (scheduleOk && settings.ok) return {ok: true, scheduledFor: found.scheduledFor, source: found.source, missing: []};
        missing = settings.missing;
        lastReason = [
          scheduleOk ? null : `${found.source}의 예약 시각이 ${found.scheduledFor || '(없음)'}입니다(기대: ${schedule.utcIso}).`,
          ...(settings.ok ? [] : settings.missing.map((m) => `빠진 설정: ${m}`)),
        ].filter(Boolean).join(' / ');
      }
    } catch (err) {
      if (attempt === 1 && /fetch failed|ECONNREFUSED/.test(`${err.message} ${err.cause?.code || ''}`)) {
        return {ok: false, dashboardDown: true, reason: '대시보드가 꺼져 있어 동기화 못 함', missing: []};
      }
      lastReason = `동기화 호출 실패: ${err.message}`;
    }
    if (attempt < 3 && sleepMs > 0) await new Promise((r) => setTimeout(r, sleepMs)); // allow-literal: 최대 3번 시도
  }
  return {ok: false, reason: lastReason, missing};
}

/** 대시보드가 기록한 예약 시각을 읽는다. 쇼츠는 shorts-status.json, 롱폼은 동기화된 카탈로그. */
export function readRecordedSchedule(plan, videoId) {
  if (plan.kind === 'shorts') {
    const s = readJsonSafe(join(plan.pkgDir, plan.statusFile));
    return {source: plan.statusFile, scheduledFor: s?.scheduledFor || null, videoId: s?.videoId || null};
  }
  const catalog = readJsonSafe(join(projectDir, 'data', 'youtube', 'catalog.json'));
  const v = (catalog?.videos || []).find((x) => x.videoId === videoId);
  return {source: 'data/youtube/catalog.json', scheduledFor: v?.scheduledPublishAt || null, videoId: v?.videoId || null};
}

async function runWithStudio(plan, schedule) {
  const release = acquireLock();
  let browser = null;
  let page = null;
  const summary = {videoId: null, scheduled: false, subs: null, subsError: null, settings: null, settingsError: null};
  try {
    browser = await chromium.connectOverCDP(`http://localhost:${STUDIO_PORT}`);
    // 사용자가 쓰던 스튜디오 탭을 건드리지 않게 항상 새 탭에서 한다.
    page = await browser.contexts()[0].newPage();
    await page.setViewportSize({width: 1600, height: 1000}); // allow-literal: 스튜디오 수집 스크립트와 같은 화면 크기
    log('스튜디오 조작을 시작합니다.');
    const done = await scheduleInStudio(page, plan, schedule);
    summary.scheduled = true;
    summary.videoId = done.videoId;
    log(`  예약 확인 창: ${done.confirmText.slice(0, 140)}`);
    if (!done.videoId) throw new StepError('예약은 됐지만 확인 창에서 영상 ID를 읽지 못했습니다. 스튜디오에서 직접 확인하세요.');
    try {
      const settings = await ensureVideoSettings(page, done.videoId, {category: plan.category});
      summary.settings = settings;
      log(`  [완료] 카테고리·언어 확인: 카테고리 "${settings.after.category}", 동영상 언어 "${settings.after.videoLanguage}", 제목 및 설명 언어 "${settings.after.titleLanguage}"${settings.changed.length ? ` (고친 칸: ${settings.changed.join(', ')})` : ' (고칠 칸 없음)'}`);
    } catch (err) {
      summary.settingsError = String(err.message).split('\n')[0];
    }
    if (plan.subsPath) {
      try {
        await uploadSubtitles(page, done.videoId, plan.subsPath);
        summary.subs = 'ok';
        log('  [완료] 한국어 자막 올리고 게시');
      } catch (err) {
        summary.subs = 'failed';
        summary.subsError = String(err.message).split('\n')[0];
      }
    }
    try {
      const tokenPath = join(projectDir, '.youtube-oauth-token.json');
      if (existsSync(tokenPath)) {
        const token = JSON.parse(await readFile(tokenPath, 'utf8'));
        if (token?.access_token) {
          await fetch('https://www.googleapis.com/youtube/v3/videos?part=status', {
            method: 'PUT',
            headers: {'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json'},
            body: JSON.stringify({id: done.videoId, status: {privacyStatus: 'private', publishAt: schedule.utcIso, embeddable: true, publicStatsViewable: true, license: 'youtube', selfDeclaredMadeForKids: false, containsSyntheticMedia: true}}),
          });
          log('  [완료] AI 사용 여부(변형되었거나 생성된 콘텐츠: true) API 반영');

          const targetPlaylistName = plan.playlist || DEFAULT_PLAYLISTS[plan.kind];
          if (targetPlaylistName) {
            const catalogPath = join(projectDir, 'data', 'youtube', 'catalog.json');
            const catalog = existsSync(catalogPath) ? JSON.parse(await readFile(catalogPath, 'utf8')) : null;
            const targetPl = (catalog?.playlists || []).find((p) => norm(p.title) === norm(targetPlaylistName));
            if (targetPl?.playlistId) {
              await fetch('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
                method: 'POST',
                headers: {'Authorization': `Bearer ${token.access_token}`, 'Content-Type': 'application/json'},
                body: JSON.stringify({snippet: {playlistId: targetPl.playlistId, resourceId: {kind: 'youtube#video', videoId: done.videoId}}}),
              });
              log(`  [완료] 재생목록 "${targetPlaylistName}" API 추가 완료`);
            }
          }
        }
      }
    } catch (err) {
      log(`  [경고] AI 표시/재생목록 API 보완 건너뜀: ${err.message}`);
    }
  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {}); // CDP 연결만 끊고 크롬은 둔다
    release();
  }
  return summary;
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.errors.length) {
    console.error(args.errors.join('\n'));
    console.error(USAGE);
    return 2;
  }
  const pkgDir = resolve(args.pkg);
  const schedule = args.schedule ? parseSchedule(args.schedule) : null;

  if (args.guide) {
    if (schedule && !schedule.ok) console.warn(`예약 시각을 쓰지 않았습니다: ${schedule.error}`);
    if (!existsSync(pkgDir)) { console.error(`패키지 폴더가 없습니다: ${pkgDir}`); return 2; }
    const guideCategory = resolveCategory(args.category ?? undefined);
    if (guideCategory.error) { console.error(guideCategory.error); return 2; }
    const {plan} = inspectPackage(pkgDir, {schedule, playlist: args.playlist, noPlaylist: args.noPlaylist, noSubs: args.noSubs, catalogVideos: [], category: guideCategory});
    const text = buildGuide({
      pkgRel: relative(projectDir, pkgDir).split('\\').join('/'),
      plan,
      scheduleText: schedule?.ok ? schedule.text : null,
      playlist: args.playlist,
      noPlaylist: args.noPlaylist,
      noSubs: args.noSubs,
    });
    mkdirSync(pkgDir, {recursive: true});
    writeFileSync(join(pkgDir, 'UPLOAD-GUIDE.md'), text);
    console.log(`UPLOAD-GUIDE.md를 썼습니다: ${join(pkgDir, 'UPLOAD-GUIDE.md')}`);
    return 0;
  }

  const catalog = readJsonSafe(join(projectDir, 'data', 'youtube', 'catalog.json'));
  const chrome = await setupStudioChrome({launchIfDown: true});
  const login = chrome.supported === false ? `지원 안 됨(${chrome.reason || chrome.error})` : (chrome.login || 'unknown');
  const result = inspectPackage(pkgDir, {
    schedule, playlist: args.playlist, noPlaylist: args.noPlaylist, noSubs: args.noSubs, category: resolveCategory(args.category ?? undefined),
    catalogVideos: catalog ? (catalog.videos || []) : null, login,
  });
  console.log(result.plan ? formatPlan(result.plan) : `패키지: ${pkgDir}`);
  console.log('\n[점검]');
  console.log(formatChecks(result.checks));
  if (!result.ok) {
    console.log('\n점검 실패. 아무것도 올리지 않았습니다.');
    return 1;
  }
  if (!args.yes) {
    console.log('\n점검만 했습니다(올리지 않음). 실제로 예약하려면 같은 명령 끝에 --yes를 붙이세요.');
    return 0;
  }

  let summary;
  try {
    summary = await runWithStudio(result.plan, schedule);
  } catch (err) {
    console.error(`\n실패: ${err.message}`);
    console.error('스튜디오 화면은 그대로 두었습니다. 공개·저장 버튼은 누르지 않았습니다.');
    return 1;
  }

  const sync = await syncAndVerify({plan: result.plan, schedule, videoId: summary.videoId, expectedCategoryId: result.plan.category.id});
  const url = `https://youtu.be/${summary.videoId}`;
  console.log(`\n스튜디오 예약 완료: ${url} (${schedule.text} 한국 시각)`);
  let code = 0;
  if (summary.subs === 'failed') { console.error(`자막 단계 실패: ${summary.subsError} (영상 예약은 끝났음, 자막만 스튜디오에서 직접 올리세요)`); code = 1; }
  if (summary.settingsError) { console.error(`카테고리·언어 단계 실패: ${summary.settingsError} (영상 예약은 끝났음. 스튜디오 편집 화면에서 카테고리와 두 언어 칸을 직접 확인하세요)`); code = 1; }
  if (!sync.ok) {
    if (sync.missing?.length) console.error(`빠진 설정 목록:\n${sync.missing.map((m) => `  - ${m}`).join('\n')}`);
    console.error(`대시보드 확인 실패: ${sync.reason}${sync.dashboardDown ? ' (스튜디오 예약은 끝났음. 대시보드를 켠 뒤 동기화하면 기록됩니다)' : ''}`);
    code = 1;
  } else console.log(`대시보드 기록 확인: ${sync.source}의 예약 시각 ${sync.scheduledFor}`);
  if (code === 0) console.log(`성공: 영상 ID ${summary.videoId}, 주소 ${url}, 예약 ${schedule.text}(${schedule.utcIso})`);
  return code;
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFile)) {
  main(process.argv.slice(2)).then((code) => process.exit(code)).catch((err) => { console.error(err); process.exit(1); });
}
