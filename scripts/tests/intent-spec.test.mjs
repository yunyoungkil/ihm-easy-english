// 의도 명세 (2026-11-12). 코드를 만든 쪽이 아니라 "사용자가 정한 말"에서 가져온 합격 기준이다.
// 이 파일은 만든 쪽(특히 다른 AI)이 합격하려고 고치지 않는다. 의도 자체가 바뀌면 사용자 확인을 받고,
// 어느 결정에서 나온 기준인지(출처)를 같이 고친다. 출처는 각 테스트 이름 뒤 [ ] 안에 적었다.
// 실제 파일(data/youtube, output/upload-packages)과 서버 코드를 그대로 읽는다. 가짜 데이터는 쓰지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEpisodeOutcomes} from '../planning-outcome.mjs';
import {weeklyComparison} from '../growth-rules.mjs';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const dataDir = join(projectDir, 'data', 'youtube');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
const server = readFileSync(join(projectDir, 'scripts', 'youtube-analytics-server.mjs'), 'utf8');
const serverLines = server.split(/\r?\n/);
const has = (name) => existsSync(join(dataDir, name));
const catalogVideos = () => {
  const c = readJson(join(dataDir, 'catalog.json'));
  return Array.isArray(c?.videos) ? c.videos : (Array.isArray(c) ? c : []);
};

test('대시보드는 6개 현황 탭만 가진다 [2026-11-11 탭 압축·대청소 결정]', () => {
  const tabs = [...new Set([...server.matchAll(/data-tab="(tab-[a-z-]+)"/g)].map((m) => m[1]))].sort();
  assert.deepEqual(tabs, ['tab-ab-simulator', 'tab-benchmark', 'tab-demand', 'tab-episodes', 'tab-overview', 'tab-studio'],
    '탭이 늘거나 줄었다 — 사용자 확인 없이 탭을 바꾸지 않는다');
});

test('데이터를 바꾸는 서버 통로는 허용 목록 안에서만 늘린다 [자동화 우선 원칙 2026-11-11: 사람이 관리하는 입력 UI 금지]', () => {
  // 허용 이유: 승인 관문(schedule/*), 자동 루프가 부르는 통로(sync, market-demand/run, insights/analyze, scripts/analyze,
  // idea-board/history/register), 사용자가 직접 비우는 삭제(market-demand/delete*), 스튜디오 파일 읽기(studio-scan).
  const allowed = new Set([
    '/api/sync', '/api/studio-scan', '/api/insights/analyze', '/api/scripts/analyze', '/api/idea-board/history/register',
    '/api/market-demand/run', '/api/market-demand/delete', '/api/market-demand/delete-channel', '/api/market-demand/delete-video',
    '/api/schedule/approve-thumbnail', '/api/schedule/comment-done', '/api/schedule/resolve', '/api/schedule/rules', '/api/schedule/upload-now',
    '/api/transform-sheet-pick', // 썸네일 시안 고르기 = 사용자 승인 관문(2026-11-12 사용자 제안)
  ]);
  const posts = new Set();
  for (const line of serverLines) {
    if (!/req\.method === 'POST'|method: 'POST'/.test(line) || !/url\.pathname === '/.test(line)) continue;
    const m = line.match(/url\.pathname === '(\/api\/[^']+)'/);
    if (m) posts.add(m[1]);
  }
  const extra = [...posts].filter((p) => !allowed.has(p));
  assert.deepEqual(extra, [], `새 데이터 변경 통로가 생겼다: ${extra.join(', ')} — 사람이 눌러야 하는 관리 기능이면 사용자 확인이 먼저다. 확인을 받았다면 이 허용 목록과 이유를 같이 고친다`);
});

test('화면에 보이는 값에 지어낸 영상·무작위 숫자·남의 사진을 쓰지 않는다 [2026-11-11 시뮬레이터 대청소: 없는 채널·unsplash·Math.random 조회수]', () => {
  const bad = serverLines.map((line, i) => ({line, no: i + 1}))
    .filter(({line}) => /unsplash|picsum|placeholder\.com|lorem ipsum|발음의 신/i.test(line)
      || (/Math\.random\(\)/.test(line) && !/grad-|id|key|uid|nonce/i.test(line)));
  assert.deepEqual(bad.map((b) => `${b.no}: ${b.line.trim().slice(0, 90)}`), []);
});

test('업로드는 decideNextUpload를 거친 뒤에만 실행된다 [AGENTS.md 대시보드 규칙 5: 우회 경로 금지]', () => {
  const calls = serverLines.map((l, i) => (l.includes('processQueueItem(') && !/^\s*(async\s+)?function\s/.test(l) ? i : -1)).filter((i) => i >= 0);
  assert.ok(calls.length >= 1, '업로드 호출을 찾지 못함 — 이 검사가 코드와 어긋남');
  for (const i of calls) {
    const before = serverLines.slice(Math.max(0, i - 40), i).join('\n');
    assert.match(before, /decideNextUpload\(/, `${i + 1}행의 업로드 호출 앞 40줄 안에 decideNextUpload가 없음`);
  }
});

test('공개 전·예약 영상은 판정하지 않는다 [2026-11-11: EP27이 공개 전에 조회 0회로 판정될 뻔함]', {skip: !has('catalog.json') && '카탈로그 없음'}, () => {
  const now = new Date();
  const notLive = new Set(catalogVideos()
    .filter((v) => (v.privacyStatus && v.privacyStatus !== 'public') || new Date(v.publishedAt) > now)
    .map((v) => v.videoId));
  const judged = loadEpisodeOutcomes(projectDir, now).filter((o) => notLive.has(o.videoId) && o.verdict !== 'pending');
  assert.deepEqual(judged.map((o) => `${o.label}:${o.verdict}`), []);
});

// 2026-11-12 수리: 이 시험은 서버 코드를 읽지 않고 시험 안에서 규칙을 따로 계산해서, 서버의 쇼츠 판정 기준을
// 60초에서 600초로 바꿔도 통과했다(일부러 망가뜨려 확인). 의도(쇼츠 판정은 format만)는 그대로이고, 감시하는 대상만
// "시험이 흉내 낸 규칙"에서 "서버가 실제로 쓰는 판정 함수(scripts/video-format.mjs)"로 바꿨다.
// 그 함수가 서버 파일 밖으로 나온 것은 제미나이 코드 시험 B1(knowledge/gemini-build-test.md)의 결과다.
test('쇼츠/롱폼 판정 함수는 실제 카탈로그의 format을 그대로 낸다 [AGENTS.md 대시보드 규칙 4: 쇼츠 판정은 format만]', {skip: !has('catalog.json') && '카탈로그 없음'}, async () => {
  const {resolveVideoFormat} = await import('../video-format.mjs');
  const videos = catalogVideos();
  assert.ok(videos.length >= 10, `카탈로그 영상이 ${videos.length}편뿐`);
  // 서버가 동기화 때 만드는 것과 같은 입력: 공개된 쇼츠 영상의 ID 목록
  const shortsIds = new Set(videos.filter((v) => v.privacyStatus === 'public' && v.format === 'SHORTS').map((v) => v.videoId));
  const differs = videos.filter((v) => resolveVideoFormat(v, shortsIds) !== v.format);
  assert.deepEqual(differs.map((v) => `${v.videoId}(${v.format},${v.privacyStatus},${v.durationSeconds}s)`), [], '판정 함수가 카탈로그 format과 다른 값을 냄');
  // 60초를 넘는 공개 쇼츠가 실제로 있어야 이 시험이 "길이만 보는 구현"을 잡을 수 있다
  const longShorts = videos.filter((v) => v.privacyStatus === 'public' && v.format === 'SHORTS' && Number(v.durationSeconds) > 60);
  assert.ok(longShorts.length > 0, '60초 넘는 공개 쇼츠가 카탈로그에 없어 길이만 보는 구현을 못 잡는다');
  for (const v of longShorts) assert.equal(resolveVideoFormat(v, shortsIds), 'SHORTS');
});

test('서버는 쇼츠 판정을 직접 하지 않고 판정 함수를 거친다 [AGENTS.md 대시보드 규칙 4: 길이 60초 규칙으로 새로 판정하지 않는다]', () => {
  assert.match(server, /from\s+['"]\.\/video-format\.mjs['"]/, '서버가 scripts/video-format.mjs를 불러 쓰지 않음');
  // 화면 코드에 원본 함수를 그대로 끼워 넣는 한 줄(clientVideoFormatSource)만 예외. 함수 본문을 서버에 새로 쓰면 실패한다.
  const serverWithoutInjection = serverLines.filter((line) => !/^const clientVideoFormatSource = `const resolveVideoFormat = \$\{resolveVideoFormat\.toString\(\)\};`;\s*$/.test(line.trim())).join('\n');
  assert.doesNotMatch(serverWithoutInjection, /(?:const|function)\s+resolveVideoFormat\b/, '서버 파일에 판정 함수가 다시 정의됨');
  // 서버 파일 안에서 영상 길이를 60(또는 180)초와 직접 비교하면 판정 함수를 우회한 것이다.
  // (2026-11-12: 예전에 있던 3곳은 판정 함수 하나로 합쳐 예외 목록이 비었다. 새로 생기면 실패한다.)
  const unknown = serverLines.map((line) => line.trim())
    .filter((line) => /(?:duration\w*|seconds)\s*(?:<=?|>=?)\s*(?:60|180)\b/.test(line) && !/^\/\//.test(line));
  assert.deepEqual(unknown.map((line) => line.slice(0, 100)), [], '서버에 길이로 쇼츠를 직접 판정하는 줄이 새로 생겼다 — 판정 함수를 거쳐야 한다');
});

test('전체 관제의 "최근 7일"은 실제 일별 데이터의 7일 합과 같다 [2026-11-09 브리핑 개편: 최근 7일 vs 지난주]', {skip: !has('analytics-latest.json') && '분석 데이터 없음'}, () => {
  const daily = readJson(join(dataDir, 'analytics-latest.json')).daily || [];
  assert.ok(daily.length >= 14, `일별 데이터가 ${daily.length}일뿐 — 지난주와 비교하려면 14일이 필요`);
  const weekly = weeklyComparison(daily);
  const days = daily.map((d) => d.day).sort();
  assert.equal(weekly.current.end, days.at(-1), '"최근 7일"의 마지막 날이 데이터의 마지막 날이 아님');
  const inRange = (d, a, b) => d.day >= a && d.day <= b;
  const sum = (a, b, key) => daily.filter((d) => inRange(d, a, b)).reduce((n, d) => n + Number(d[key] || 0), 0);
  assert.equal(weekly.current.views, sum(weekly.current.start, weekly.current.end, 'views'), '최근 7일 조회수가 일별 합과 다름');
  assert.equal(weekly.previous.views, sum(weekly.previous.start, weekly.previous.end, 'views'), '지난주 조회수가 일별 합과 다름');
  const span = (a, b) => (new Date(b) - new Date(a)) / 86400000 + 1;
  assert.equal(span(weekly.current.start, weekly.current.end), 7);
  assert.equal(span(weekly.previous.start, weekly.previous.end), 7);
});

test('실제로 만든 에피소드(EP22~)는 모두 소재 이력에 있다 [2026-11-11 스킬 되먹임 루프: 같은 소재를 다시 고르지 않게]', {skip: !has('idea-board-history.json') && '소재 이력 없음'}, () => {
  const slugs = new Set((readJson(join(dataDir, 'idea-board-history.json')).entries || []).map((e) => e.episodeSlug).filter(Boolean));
  const dir = join(projectDir, 'output', 'upload-packages');
  const missing = readdirSync(dir, {withFileTypes: true})
    .filter((d) => d.isDirectory() && /^ep(\d+)-/.test(d.name) && !d.name.includes('-shorts-') && Number(d.name.match(/^ep(\d+)/)[1]) >= 22)
    .map((d) => d.name.replace(/-longform$/, ''))
    .filter((slug) => existsSync(join(dir, slug, 'status.json')) || existsSync(join(dir, `${slug}-longform`, 'status.json')))
    .filter((slug) => !slugs.has(slug));
  assert.deepEqual(missing, [], '소재 이력에 없는 에피소드 — 스킬 01 "소재 이력 등록"을 한다');
});

test('새 에피소드의 BRIEF.md에는 기획 근거 칸이 있다 [2026-11-11 스킬 01: EP30부터 필수]', () => {
  const videosDir = join(projectDir, 'videos');
  const missing = readdirSync(videosDir, {withFileTypes: true})
    .filter((d) => d.isDirectory() && /^ep(\d+)-/.test(d.name) && Number(d.name.match(/^ep(\d+)/)[1]) >= 30)
    .filter((d) => !/^##\s+기획 근거\s*$/m.test(existsSync(join(videosDir, d.name, 'BRIEF.md')) ? readFileSync(join(videosDir, d.name, 'BRIEF.md'), 'utf8') : ''))
    .map((d) => d.name);
  assert.deepEqual(missing, [], 'BRIEF.md에 "## 기획 근거" 칸이 없음 — 이게 없으면 경쟁 채널 판정이 근거 없이 돈다');
});

test('새 에피소드의 기획 근거는 다음 기획 입력 파일을 인용한다 [2026-11-12 사용자: 모은 데이터는 대시보드 꾸미기가 아니라 기획에 쓰인다, EP30부터]', async () => {
  const {parsePlanningSources} = await import('../planning-outcome.mjs');
  const videosDir = join(projectDir, 'videos');
  const missing = readdirSync(videosDir, {withFileTypes: true})
    .filter((d) => d.isDirectory() && /^ep(\d+)-/.test(d.name) && Number(d.name.match(/^ep(\d+)/)[1]) >= 30)
    .filter((d) => existsSync(join(videosDir, d.name, 'BRIEF.md')))
    .filter((d) => !parsePlanningSources(readFileSync(join(videosDir, d.name, 'BRIEF.md'), 'utf8'))?.inputRef)
    .map((d) => d.name);
  assert.deepEqual(missing, [], 'BRIEF.md 기획 근거에 "- 다음 기획 입력:" 줄이 없음 — data/youtube/next-episode-input.md에서 출발해 쓴 항목을 적는다');
});

test('경쟁 영상 소재를 쓰는 새 에피소드는 변형 시트를 가리키고, 시트는 규칙을 통과한다 [2026-11-12 사용자: 소재만 가져오고 이유는 안 옮겼다, EP30부터]', async () => {
  const {parsePlanningSources} = await import('../planning-outcome.mjs');
  const {loadSheets, validateSheet, sheetImageExists} = await import('../transform-sheet.mjs');
  const videosDir = join(projectDir, 'videos');
  const sheets = new Map(loadSheets().map((s) => [s.sourceVideoId, s]));
  const problems = [];
  for (const d of readdirSync(videosDir, {withFileTypes: true})) {
    if (!d.isDirectory() || !/^ep(\d+)-/.test(d.name) || Number(d.name.match(/^ep(\d+)/)[1]) < 30) continue;
    const brief = join(videosDir, d.name, 'BRIEF.md');
    if (!existsSync(brief)) continue;
    const src = parsePlanningSources(readFileSync(brief, 'utf8'));
    if (!src || src.competitors.length === 0) continue; // 경쟁 영상 근거가 없는 편은 시트가 필요 없다
    if (!src.transformSheet) { problems.push(d.name + ': 경쟁 영상을 근거로 쓰는데 "- 변형 시트:" 줄이 없다'); continue; }
    const sheet = sheets.get(src.transformSheet);
    if (!sheet) { problems.push(d.name + ': 가리킨 변형 시트(' + src.transformSheet + ')가 없다'); continue; }
    for (const p of validateSheet(sheet, {imageExists: sheetImageExists, competitorPacing: (await import('../outlier-report.mjs')).loadReports().find((r) => r.videoId === sheet.sourceVideoId)?.pacing})) problems.push(d.name + ' 시트: ' + p);
  }
  assert.deepEqual(problems, []);
});

test('저장된 변형 시트는 모두 규칙(다른 경쟁 영상에서 가져옴, 이유·근거, 뺀 이유, 이미지 파일)을 통과한다 [2026-11-12]', async () => {
  const {loadSheets, validateSheet, sheetImageExists} = await import('../transform-sheet.mjs');
  const {loadReports} = await import('../outlier-report.mjs');
  const pacing = new Map(loadReports().map((r) => [r.videoId, r.pacing]));
  const bad = loadSheets().flatMap((s) => validateSheet(s, {imageExists: sheetImageExists, competitorPacing: pacing.get(s.sourceVideoId)}).map((p) => s.sourceVideoId + ': ' + p));
  assert.deepEqual(bad, []);
});

test('다음 기획 입력 파일은 실제 데이터로 만들어지고, 시청자 고민에 AI 추측을 섞지 않는다 [2026-11-12 사용자: 데이터를 기획에 써먹는다]', {skip: !has('catalog.json') && '카탈로그 없음'}, async () => {
  const {buildFromProject, renderNextEpisodeInput} = await import('../next-episode-input.mjs');
  const input = buildFromProject(projectDir);
  const md = renderNextEpisodeInput(input);
  assert.doesNotMatch(md, /undefined|NaN|\[object Object\]/, '입력 파일에 빈 값이 그대로 찍힘');
  for (const heading of ['## 1. 실험 결과', '## 2. 우리 영상 비교', '## 5. 경쟁 영상 시청자의 고민과 질문']) assert.ok(md.includes(heading), `${heading} 절이 없음`);
  const dna = readJson(join(dataDir, 'audience-dna.json')).entries || [];
  const aiOnly = dna.filter((e) => ['painPoint', 'question'].includes(e.type) && !(e.sources || []).some((s) => s.sourceType === 'outlierComment')).length;
  assert.equal(input.audience.excludedAiGuesses, aiOnly, '시청자 댓글 출처 없이 대본 분석 AI 추측만 있는 항목 수와 걸러낸 수가 다름');
  const listed = [...input.audience.painPoint, ...input.audience.question];
  for (const item of listed) {
    const entry = dna.find((e) => e.text === item.text);
    assert.ok(entry?.sources?.some((s) => s.sourceType === 'outlierComment'), `시청자 댓글 출처가 없는 항목이 고민 순위에 들어감: ${item.text.slice(0, 40)}`);
  }
});

test('경쟁 영상을 분석하는 프롬프트에 검증 안 된 우리 철학·미리 정한 분류 목록이 없다 [2026-11-12 사용자: 틀에 맞춰 쓰면 영상이 발전하지 않는다]', async () => {
  const BANNED = ['도파민', '게으른 혀', 'Epiphany', '상식 파괴형', '공감 유발형', '손실 회피형', '직관 퀴즈형', '3단계 공식', '이해하면 쉬운영어만의'];
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    sent.push(String(init?.body || ''));
    return {ok: false, status: 400, json: async () => ({error: {message: '시험용 가짜 응답'}})};
  };
  const realWarn = console.warn;
  console.warn = () => {};
  try {
    const meta = {title: '제목', channelTitle: '경쟁 채널', viewCount: 1000, likeCount: 10, commentCount: 5};
    const {analyzeScriptWithGemini} = await import('../analyze-competitor-script.mjs');
    await analyzeScriptWithGemini(meta, {fullText: '자막 내용'}, 'test-key');
    const {analyzeCommentsWithGemini} = await import('../analyze-outlier-comments.mjs');
    await analyzeCommentsWithGemini(meta, [{text: '댓글', likeCount: 1}], 'test-key').catch(() => null);
    const {buildReportPrompt} = await import('../outlier-report.mjs');
    sent.push(buildReportPrompt({meta, transcriptLines: [{start: 0, text: '자막'}], comments: [{text: '댓글'}], windowSeconds: 60}));
  } finally {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
  }
  assert.ok(sent.length >= 3, `가로챈 프롬프트가 ${sent.length}개뿐 — 분석 함수가 Gemini를 부르지 않았다`);
  const hits = sent.flatMap((body, i) => BANNED.filter((w) => body.includes(w)).map((w) => `${i}번째 프롬프트: ${w}`));
  assert.deepEqual(hits, [], '분석 프롬프트에 우리 틀이 들어 있다 — AGENTS.md "AI 분석 프롬프트에 검증 안 된 우리 틀을 넣지 않는다"');
});

test('대시보드 추이 그래프는 실제 값을 그린다 — 나머지 연산 같은 가짜 곡선 금지 [AGENTS.md 확인 규칙 3: 화면 숫자를 지어내지 않는다]', () => {
  const fake = serverLines.map((line) => line.trim())
    .filter((line) => /generateSparklineSvg\(/.test(line) && /%\s*\d/.test(line) && !/^\/\//.test(line));
  assert.deepEqual(fake, [], '추이 그래프 값을 나머지 연산(%)으로 만들고 있다 — 실제 데이터 칸에서 계산한다');
});
