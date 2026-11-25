// 쿠팡 블로그(tech.d40m.com) 글마다 대표 그림 1장을 만들고 점검하는 모듈.
// 설계: docs/superpowers/plans/2026-11-25-blog-hero-image-design.md (B·C·D절)
//
// 하는 일
//  1) 글쓰기 AI가 초안에 적은 그림 설계도(heroImage)를 점검한다(validateHeroBrief).
//  2) 설계도를 영어 지시문으로 풀어(composeHeroPrompt) AI Studio로 후보 그림 N장을 만든다(generateCandidates).
//  3) 파일 점검(크기·비율·바이트), 이전 그림과 겹침 점검(dHash), 모서리 확대 조각, 올리기용 JPEG 변환을 한다.
//  4) 고르기용 Opus가 후보와 모서리 조각을 직접 보고 verdict.json을 쓰게 한다(runPicker).
//
// 코드가 정하지 않는 것: 구도, 빛, 렌즈, 질감, 화풍.
//  이 값들은 글마다 AI가 정한다. 코드는 칸이 비었는지, 브랜드·나이 낱말·금지어가 섞였는지,
//  워터마크 금지 문장과 파일 크기 같은 안전선만 막는다.
//  특정 구도나 화풍을 코드에 못 박으면 AI는 그쪽으로만 생각하고 모든 글의 그림이 같은 틀이 된다
//  (AGENTS.md "하드코딩 vs AI 자율" 절, EP37 썸네일이 AI 평균값이 된 사례).
//  이 파일은 check-post.mjs·write-tech-post.mjs를 정적으로 불러오지 않는다(순환 방지).
import {execFile, spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, readFile, rm, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {promisify} from 'node:util';
import {findBannedTerms} from '../banned-terms.mjs';

const execFileAsync = promisify(execFile);
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_SCRIPT = path.join(MODULE_DIR, '..', 'generate-aistudio-image.mjs');

export const HERO_FIELDS = ['moment', 'subject', 'setting', 'light', 'lens', 'angle', 'texture', 'medium', 'avoid', 'alt'];

export const WATERMARK_LINE =
  'No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.';

const NO_BRAND_LINE =
  'No brand names, no logos, no text or letters in the image, no recognizable product branding, generic unbranded objects.';

// 파일 안전선(설계 B·D절)
export const HERO_MIN_WIDTH = 1200; // allow-literal: 디스커버 큰 그림 조건(가로 1200 이상, 설계 B절)
export const HERO_RATIO_TOLERANCE = 0.03; // allow-literal: 16:9에서 허용하는 비율 오차(설계 D절)
export const HERO_MIN_BYTES = 5000; // allow-literal: 네이버 최소 파일 크기 5,000바이트(설계 B절)
const HERO_RATIO = 16 / 9; // allow-literal: 그림 가로세로 비율 16:9
const DUPLICATE_MAX_DISTANCE = 10; // allow-literal: 설계 D절 가설 숫자(해밍 거리 10 이하면 같은 그림으로 본다)

// ffmpeg mjpeg의 -qscale:v는 libjpeg 품질(0~100)과 단위가 달라 정확한 환산식이 없다.
// 2026-11-26 이 PC(ffmpeg 9.0)에서 -qscale:v 1~8로 만든 JPEG의 양자화 표(DQT)를 libjpeg 품질 85 표
// (기본 밝기 표 x 30%)와 칸마다 비교했더니 차이 합이 q3=456, q4=361, q5=396으로 q4가 가장 가까웠다.
// 직접 행렬을 넣는 길(-intra_matrix)은 ffmpeg가 각 칸 4 미만을 거부해 품질 85 표(최소 3)를 못 넣는다.
// 그래서 "품질 85에 가장 가까운 값"으로 4를 쓴다.
const JPEG_QSCALE = 4; // allow-literal: libjpeg 품질 85와 양자화 표가 가장 가까운 ffmpeg -qscale:v 값(2026-11-26 실측)
const IMAGE_TIMEOUT_MS = 600_000; // allow-literal: 그림 한 장 최대 대기 시간(10분)
const PICKER_TIMEOUT_MS = 600_000; // allow-literal: 고르기 Opus 최대 대기 시간(10분)
const PICKER_MODEL = 'claude-opus-5-5';
const CORNER_FRACTION = 0.25; // allow-literal: 모서리 조각은 가로세로 25%(설계 D절)
const CORNER_ZOOM = 2; // allow-literal: 모서리 조각 확대 배수(설계 D절)
const DHASH_WIDTH = 9; // allow-literal: dHash 가로 9칸(옆 칸과 비교해 8비트)
const DHASH_HEIGHT = 8; // allow-literal: dHash 세로 8줄
const ALT_MIN_CHARS = 10; // allow-literal: alt 한 문장 최소 글자 수(설계 B절)
const ALT_MAX_CHARS = 80; // allow-literal: alt 한 문장 최대 글자 수(설계 B절)

// ---- 설계도 점검 -------------------------------------------------------------------------

export const AGE_WORDS = [
  '노인', '중년', '노년', '할아버지', '할머니', '아저씨', '아줌마', '어르신', '청년', '십대', '이십대', '삼십대', '사십대', '오십대', '육십대',
  'elderly', 'senior', 'old man', 'old woman', 'middle-aged', 'middle aged', 'old-aged',
];
const AGE_REGEXES = [
  /[2-9]0\s*대/,
  /\d+\s*세(?![가-힣])/,
  /\d+\s*살(?![가-힣])/,
  /\b\d+[- ]?years?[- ]old\b/i,
  /\b(?:in his|in her|in their) (?:twenties|thirties|forties|fifties|sixties|seventies)\b/i,
];

export const BRAND_WORDS = [
  '삼성', '엘지', 'LG', '애플', '아이폰', '아이패드', '맥북', '에어팟', '갤럭시', '맥세이프', '쿠진아트', '레노버', '다이슨',
  '쿠팡', '다이소', 'T머니', '티머니', '샤오미', '소니', '필립스', '파나소닉', '로보락', '로지텍', '쿠쿠', '위닉스', '구글',
  '마이크로소프트', '닌텐도',
  'Samsung', 'Apple', 'iPhone', 'iPad', 'MacBook', 'AirPods', 'Galaxy', 'MagSafe', 'Cuisinart', 'Lenovo', 'Dyson',
  'Coupang', 'Daiso', 'Xiaomi', 'Sony', 'Philips', 'Panasonic', 'Roborock', 'Anker', 'Logitech', 'Google', 'Microsoft', 'Nintendo',
];

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function brandRegex(word) {
  // 순수 영문 낱말은 앞뒤가 영문·숫자가 아닐 때만(LG전자는 잡고 algorithm은 안 잡는다), 한글이 섞이면 포함 여부.
  if (/^[A-Za-z0-9]+$/.test(word)) return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(word)}(?![A-Za-z0-9])`, 'i');
  return new RegExp(escapeRegExp(word), 'i');
}
const BRAND_REGEXES = BRAND_WORDS.map((word) => ({word, re: brandRegex(word)}));

const isText = (v) => typeof v === 'string' && v.trim().length > 0;

function fieldText(brief, field) {
  const v = brief?.[field];
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(' ');
  return typeof v === 'string' ? v : '';
}

/**
 * 그림 설계도 점검. 칸이 채워졌는지와 안전선(금지어·나이·브랜드·alt 형식)만 본다.
 * 구도·빛·렌즈·화풍의 값은 정하지 않는다.
 * @returns {{ok:boolean, problems:{id:string,text:string}[]}}
 */
export function validateHeroBrief(brief, {topic = {}} = {}) {
  const problems = [];
  const obj = brief && typeof brief === 'object' && !Array.isArray(brief) ? brief : {};

  const missing = [];
  for (const field of HERO_FIELDS) {
    const v = obj[field];
    if (field === 'avoid') {
      if (!Array.isArray(v) || v.length === 0 || !v.every(isText)) missing.push(field);
    } else if (!isText(v)) {
      missing.push(field);
    }
  }
  if (missing.length) {
    problems.push({id: 'brief-field-missing', text: `그림 설계도에 비었거나 형식이 틀린 칸이 있습니다: ${missing.join(', ')}`});
  }

  const bannedFields = [];
  for (const field of ['alt', 'moment']) {
    const hits = findBannedTerms(fieldText(obj, field));
    if (hits.length) bannedFields.push(`${field}: ${[...new Set(hits.map((h) => h.term))].join(', ')}`);
  }
  if (bannedFields.length) {
    problems.push({id: 'brief-banned-term', text: `그림 설계도에 금지어가 있습니다(${bannedFields.join(' / ')})`});
  }

  const allText = HERO_FIELDS.map((f) => fieldText(obj, f)).join('\n');
  const lowerAll = allText.toLowerCase();
  const ageHits = [
    ...AGE_WORDS.filter((w) => lowerAll.includes(w.toLowerCase())),
    ...AGE_REGEXES.map((re) => allText.match(re)?.[0]).filter(Boolean),
  ];
  if (ageHits.length) {
    problems.push({id: 'brief-age-word', text: `그림 설계도에 나이를 드러내는 낱말이 있습니다: ${[...new Set(ageHits.map((s) => s.trim()))].join(', ')}`});
  }

  const topicText = `${topic?.title || ''} ${topic?.productHint || ''}`;
  const brandHits = BRAND_REGEXES.filter(({re}) => re.test(allText)).map(({word, re}) => (re.test(topicText) ? `${word}(글감에도 나옴)` : word));
  if (brandHits.length) {
    problems.push({id: 'brief-brand-word', text: `그림 설계도에 브랜드 낱말이 있습니다. 브랜드 없는 일반 물체로 바꾸세요: ${brandHits.join(', ')}`});
  }

  const alt = isText(obj.alt) ? obj.alt.trim() : '';
  if (alt) {
    const altProblems = [];
    if (/^(?:사진|이미지|그림)/.test(alt)) altProblems.push('"사진·이미지·그림"으로 시작하면 안 됩니다');
    if (!/[가-힣]/.test(alt)) altProblems.push('한국어여야 합니다');
    const sentenceEnds = alt.match(/[.!?](?=\s|$)/g) || [];
    if (sentenceEnds.length !== 1 || !/[.!?]$/.test(alt)) altProblems.push('마침표로 끝나는 문장 하나여야 합니다');
    if ([...alt].length < ALT_MIN_CHARS || [...alt].length > ALT_MAX_CHARS) {
      altProblems.push(`마침표 포함 ${ALT_MIN_CHARS}~${ALT_MAX_CHARS}자여야 합니다(현재 ${[...alt].length}자)`);
    }
    if (altProblems.length) problems.push({id: 'brief-alt-form', text: `alt 형식 문제: ${altProblems.join(', ')}`});
  }

  return {ok: problems.length === 0, problems};
}

// ---- 지시문 만들기 --------------------------------------------------------------------------

const trimEnd = (s) => String(s).trim().replace(/[.\s]+$/, '');

/** 설계도를 영어 지시문으로 풀어 쓴다. 칸 값은 그대로 문장에 들어가고 코드는 구도·화풍을 더하지 않는다. */
export function composeHeroPrompt(brief) {
  const avoid = (Array.isArray(brief?.avoid) ? brief.avoid : []).map(trimEnd).filter(Boolean);
  const lines = [
    `Create one image whose whole story is this single moment: ${trimEnd(brief.moment)}.`,
    `The subject is ${trimEnd(brief.subject)}, set in ${trimEnd(brief.setting)}.`,
    `The light: ${trimEnd(brief.light)}. It is shot with ${trimEnd(brief.lens)}, from ${trimEnd(brief.angle)}.`,
    `The surfaces feel like ${trimEnd(brief.texture)}. The medium and rendering: ${trimEnd(brief.medium)}.`,
    'Aspect ratio 16:9, with the key subject kept away from the extreme top and bottom edges so a 1200x630 crop keeps the story.',
  ];
  if (avoid.length) lines.push(`In this scene, avoid: ${avoid.join('; ')}.`);
  lines.push(NO_BRAND_LINE, WATERMARK_LINE);
  return lines.join('\n');
}

// ---- 경로·기록 ------------------------------------------------------------------------------

export function heroDir(topicId, projectDir = process.cwd()) {
  return path.join(projectDir, 'output', 'blog', 'images', String(topicId));
}

export async function writeHeroRecord(dir, record) {
  await mkdir(dir, {recursive: true});
  await writeFile(path.join(dir, 'hero.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
}

export async function readHeroRecord(dir) {
  try {
    return JSON.parse(await readFile(path.join(dir, 'hero.json'), 'utf8'));
  } catch {
    return null;
  }
}

// ---- 후보 만들기 ----------------------------------------------------------------------------

async function defaultRunImage({promptFile, output, aspect, cwd = process.cwd()}) {
  try {
    await execFileAsync(
      process.execPath,
      [IMAGE_SCRIPT, '--prompt-file', promptFile, '--output', output, '--aspect', aspect],
      {cwd, timeout: IMAGE_TIMEOUT_MS, windowsHide: true, maxBuffer: 10 * 1024 * 1024}, // allow-literal: 자식 프로세스 출력 버퍼 10MB
    );
    return {ok: true};
  } catch (err) {
    const tail = String(err.stderr || err.stdout || '').trim().split(/\r?\n/).slice(-3).join(' | ');
    return {ok: false, error: `${err.killed ? '제한 시간 초과: ' : ''}${tail || err.message}`};
  }
}

/** 지시문을 파일로 쓰고 후보 그림 N장을 하나씩 순서대로 만든다(동시 실행 없음). */
export async function generateCandidates({
  brief,
  topicId,
  count = 3, // allow-literal: 설계 C절 후보 3장
  projectDir = process.cwd(),
  outDir = heroDir(topicId, projectDir),
  runImage = defaultRunImage,
} = {}) {
  await mkdir(outDir, {recursive: true});
  const prompt = composeHeroPrompt(brief);
  const results = [];
  for (let n = 1; n <= count; n += 1) {
    const promptFile = path.join(outDir, `prompt-${n}.txt`);
    const output = path.join(outDir, `cand-${n}.png`);
    await writeFile(promptFile, `${prompt}\n`, 'utf8');
    await rm(output, {force: true});
    try {
      const res = await runImage({promptFile, output, aspect: '16:9', cwd: projectDir});
      if (res?.ok === false) {
        results.push({path: output, ok: false, error: res.error || '그림 만들기 실패'});
      } else if (!existsSync(output)) {
        results.push({path: output, ok: false, error: '그림 파일이 만들어지지 않았습니다.'});
      } else {
        results.push({path: output, ok: true});
      }
    } catch (err) {
      results.push({path: output, ok: false, error: err.message});
    }
  }
  return results;
}

// ---- 파일 도구(ffmpeg/ffprobe, 실행 함수를 주입할 수 있다) ----------------------------------

const defaultExec = (file, args, opts = {}) => execFileAsync(file, args, {windowsHide: true, maxBuffer: 10 * 1024 * 1024, ...opts}); // allow-literal: 출력 버퍼 10MB

export async function probeImage(file, {exec = defaultExec} = {}) {
  const {stdout} = await exec('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', file,
  ], {encoding: 'utf8'});
  const stream = JSON.parse(String(stdout)).streams?.[0];
  if (!stream?.width || !stream?.height) throw new Error(`그림 크기를 읽지 못했습니다: ${file}`);
  const {size} = await stat(file);
  return {width: Number(stream.width), height: Number(stream.height), bytes: size};
}

/** 9x8 흑백으로 줄여 옆 칸과 비교한 64비트를 16자리 16진 문자열로 돌려준다. */
export async function dHash(file, {exec = defaultExec} = {}) {
  const {stdout} = await exec('ffmpeg', [
    '-v', 'error', '-i', file, '-vf', `scale=${DHASH_WIDTH}:${DHASH_HEIGHT}:flags=area,format=gray`,
    '-frames:v', '1', '-f', 'rawvideo', 'pipe:1',
  ], {encoding: 'buffer'});
  const px = Buffer.from(stdout);
  if (px.length < DHASH_WIDTH * DHASH_HEIGHT) throw new Error(`dHash용 픽셀을 읽지 못했습니다(${px.length}바이트): ${file}`);
  let bits = '';
  for (let y = 0; y < DHASH_HEIGHT; y += 1) {
    for (let x = 0; x < DHASH_WIDTH - 1; x += 1) {
      bits += px[y * DHASH_WIDTH + x] < px[y * DHASH_WIDTH + x + 1] ? '1' : '0';
    }
  }
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16); // allow-literal: 비트 4개를 16진 글자 하나로
  return hex;
}

export function hamming(a, b) {
  const x = String(a);
  const y = String(b);
  if (x.length !== y.length) throw new Error('해시 길이가 다릅니다.');
  let dist = 0;
  for (let i = 0; i < x.length; i += 1) {
    let v = parseInt(x[i], 16) ^ parseInt(y[i], 16);
    while (v) { dist += v & 1; v >>= 1; }
  }
  return dist;
}

export function isDuplicateOfRecent(hash, recentHashes = [], maxDistance = DUPLICATE_MAX_DISTANCE) {
  return recentHashes.some((h) => hamming(hash, h) <= maxDistance);
}

/** 네 모서리를 가로세로 25% 조각으로 잘라 2배로 키운 PNG 4개의 경로를 돌려준다. */
export async function cornerCrops(file, outDir, {exec = defaultExec, probe = probeImage} = {}) {
  await mkdir(outDir, {recursive: true});
  const {width, height} = await probe(file, {exec});
  const even = (n) => Math.max(2, Math.floor(n / 2) * 2); // allow-literal: 짝수 크기로 맞춤
  const w = even(width * CORNER_FRACTION);
  const h = even(height * CORNER_FRACTION);
  const base = path.basename(file, path.extname(file));
  const corners = [
    ['tl', 0, 0], ['tr', width - w, 0], ['bl', 0, height - h], ['br', width - w, height - h],
  ];
  const outs = [];
  for (const [name, x, y] of corners) {
    const out = path.join(outDir, `${base}-corner-${name}.png`);
    await exec('ffmpeg', [
      '-y', '-v', 'error', '-i', file,
      '-vf', `crop=${w}:${h}:${x}:${y},scale=${w * CORNER_ZOOM}:${h * CORNER_ZOOM}:flags=lanczos`,
      '-frames:v', '1', out,
    ]);
    outs.push(out);
  }
  return outs;
}

/** 올리기용 JPEG로 바꾼다(libjpeg 품질 85에 가장 가까운 값, 위 JPEG_QSCALE 주석 참고). */
export async function encodeForUpload(src, dest, {exec = defaultExec} = {}) {
  await mkdir(path.dirname(dest), {recursive: true});
  await exec('ffmpeg', ['-y', '-v', 'error', '-i', src, '-frames:v', '1', '-qscale:v', String(JPEG_QSCALE), dest]);
  return dest;
}

/** 그림 파일 점검: 가로, 16:9 비율, 바이트 수. */
export function checkCandidateFile(probe) {
  const problems = [];
  const {width, height, bytes} = probe || {};
  if (!(width >= HERO_MIN_WIDTH)) {
    problems.push({id: 'file-too-narrow', text: `가로가 ${HERO_MIN_WIDTH}px 미만입니다(${width ?? '알 수 없음'}).`});
  }
  if (!(width > 0) || !(height > 0) || Math.abs(width / height - HERO_RATIO) / HERO_RATIO > HERO_RATIO_TOLERANCE) {
    problems.push({id: 'file-ratio', text: `가로세로 비율이 16:9에서 ${HERO_RATIO_TOLERANCE * 100}% 넘게 벗어났습니다(${width}x${height}).`});
  }
  if (!(bytes >= HERO_MIN_BYTES)) {
    problems.push({id: 'file-too-small', text: `파일이 ${HERO_MIN_BYTES}바이트 미만입니다(${bytes ?? '알 수 없음'}).`});
  }
  return problems;
}

// ---- 고르기(Opus가 눈으로 본다) ---------------------------------------------------------------

async function defaultRunClaude({prompt, cwd = process.cwd(), timeoutMs = PICKER_TIMEOUT_MS, exe} = {}) {
  // write-tech-post.mjs는 check-post.mjs를 불러오므로 정적으로 가져오면 순환이 생긴다. 호출할 때만 불러온다.
  const claudeExe = exe || (await import('./write-tech-post.mjs')).resolveClaudeExe();
  if (!claudeExe) return {ok: false, error: 'claude 실행 파일을 찾을 수 없습니다.'};
  const args = [
    '-p',
    '--model', PICKER_MODEL,
    '--restricted',
    '--tools', 'Read,Write',
    '--allowedTools', 'Read(output/blog/images/**),Write(output/blog/images/**)',
    '--permission-mode', 'dontAsk',
    '--permission-prompts', 'none',
    '--output-format', 'json',
    '--no-session-persistence',
    '--strict-mcp-config',
    prompt,
  ];
  return new Promise((resolve) => {
    let settled = false;
    let stderr = '';
    const child = spawn(claudeExe, args, {cwd, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true});
    const finish = (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(res);
    };
    const timer = setTimeout(() => {
      try { child.kill('SIGTERM'); } catch { /* ignore */ }
      finish({ok: false, error: `고르기 제한 시간(${timeoutMs}ms)을 초과했습니다.`});
    }, timeoutMs);
    child.stdout?.on?.('data', () => {}); // 출력은 쓰지 않지만 버퍼가 차지 않게 비운다
    child.stderr?.on?.('data', (c) => { stderr += String(c); });
    child.on('error', (err) => finish({ok: false, error: `실행 오류: ${err.message}`}));
    child.on('close', (code) => finish(code === 0 ? {ok: true} : {ok: false, error: `claude 종료 코드 ${code}${stderr ? `: ${stderr.trim()}` : ''}`}));
  });
}

const rel = (projectDir, p) => path.relative(projectDir, p).split(path.sep).join('/');

function pickerPrompt({topicId, items, verdictRel}) {
  const list = items
    .map((it) => `- ${it.name}: ${it.rel}\n  네 모서리 2배 확대(왼쪽 위, 오른쪽 위, 왼쪽 아래, 오른쪽 아래): ${it.corners.join(', ')}`)
    .join('\n');
  return [
    '당신은 블로그 대표 그림 후보를 고르는 검수자다. Read 도구로 아래 후보 그림과 모서리 확대 조각을 직접 열어 눈으로 본다. 파일 이름만 보고 판단하지 않는다.',
    '',
    `글 ID: ${topicId}`,
    '후보:',
    list,
    '',
    '볼 것(하나라도 걸리면 그 후보는 떨어뜨린다):',
    '1. 글이 다루는 문제 장면이 맞는가(일반적인 가전 사진이 아니라 그 문제의 순간).',
    '2. 로고, 상표, 특정 제품 모양을 닮은 물체가 있는가.',
    '3. 워터마크, 별 모양 로고, 도장 같은 표시가 있는가(모서리 확대 조각 4개를 모두 본다).',
    '4. 글자나 숫자가 그려졌고 깨져 보이는가.',
    '5. 손가락 수·뒤틀림, 얼굴 일그러짐이 있는가.',
    '6. 정중앙·정면·고르게 퍼진 조명 같은 AI 평균 구도로 보이는가.',
    '7. 1200x630으로 위아래가 잘려도 핵심 장면이 남는가.',
    '',
    `결과는 Write 도구로 정확히 "${verdictRel}" 경로에 순수 JSON 하나만 저장한다(코드 펜스·설명 없이):`,
    '{"chosen": "cand-2.png" 또는 모두 떨어지면 null, "reasons": ["후보별로 고른 이유와 떨어뜨린 이유"], "fixes": ["모두 떨어졌을 때 다음 지시문에 합칠 고칠 점. 고른 경우 빈 배열"]}',
    'chosen에는 위 후보 이름만 쓴다. 이 파일 외에는 아무것도 쓰지 않는다.',
  ].join('\n');
}

const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * 후보와 모서리 조각을 Opus가 직접 보고 하나 고르게 한다.
 * @returns {{chosen: string|null, verdict: object}} chosen은 고른 후보의 파일 경로(없으면 null)
 */
export async function runPicker({
  topicId,
  candidates = [],
  projectDir = process.cwd(),
  runClaude = defaultRunClaude,
  cropCorners = cornerCrops,
} = {}) {
  const dir = heroDir(topicId, projectDir);
  const verdictPath = path.join(dir, 'verdict.json');
  const fail = (reason) => ({chosen: null, verdict: {chosen: null, reasons: [reason], fixes: []}});

  const usable = candidates.map((c) => (typeof c === 'string' ? {path: c, ok: true} : c)).filter((c) => c?.ok !== false && c?.path);
  if (!usable.length) return fail('고를 수 있는 후보 그림이 없습니다.');

  const items = [];
  try {
    for (const c of usable) {
      const corners = await cropCorners(c.path, path.join(dir, 'corners'));
      items.push({name: path.basename(c.path), full: c.path, rel: rel(projectDir, c.path), corners: corners.map((p) => rel(projectDir, p))});
    }
  } catch (err) {
    return fail(`모서리 조각을 만들지 못해 확인할 수 없습니다: ${err.message}`);
  }

  await mkdir(dir, {recursive: true});
  await rm(verdictPath, {force: true});
  const prompt = pickerPrompt({topicId, items, verdictRel: rel(projectDir, verdictPath)});

  let run;
  try {
    run = await runClaude({prompt, cwd: projectDir, verdictPath});
  } catch (err) {
    return fail(`고르기 실행 오류: ${err.message}`);
  }
  if (run?.ok === false) return fail(`고르기 실행 실패: ${run.error || '알 수 없음'}`);

  let verdict;
  try {
    verdict = JSON.parse(await readFile(verdictPath, 'utf8'));
  } catch (err) {
    return fail(`verdict.json을 읽지 못했습니다(${err.code || err.message}).`);
  }

  const names = items.map((it) => it.name);
  const valid = verdict && typeof verdict === 'object' && !Array.isArray(verdict)
    && (verdict.chosen === null || names.includes(verdict.chosen))
    && isStringArray(verdict.reasons) && isStringArray(verdict.fixes);
  if (!valid) return fail('verdict.json 형식이 맞지 않습니다.');

  const chosenItem = items.find((it) => it.name === verdict.chosen);
  return {chosen: chosenItem ? chosenItem.full : null, verdict};
}
