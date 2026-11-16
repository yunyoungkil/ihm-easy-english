import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  parseSchedule, studioDateText, studioTimeText, confirmationMatches, videoIdFromText, checkScheduleReadback,
  inspectPackage, parseArgs, buildGuide, buildCommand, tagCharCount, parseTags, scheduledForMatches, syncAndVerify,
  findCatalogDuplicate, resolveCategory, diffSettings, checkCatalogSettings, CATEGORIES,
} from '../studio-upload.mjs';

// 시험용 "지금": 2026-11-16 15:00 한국 시각 = 06:00 UTC (EP30 예약을 실제로 한 날)
const NOW = new Date('2026-11-16T06:00:00Z');
const okSchedule = () => parseSchedule('2026-11-18 20:00', NOW);
// 실제 catalog.json의 칸 이름(defaultLanguage, categoryId)을 그대로 쓴 시험용 영상
const okCatalogVideo = {videoId: 'Ng6amm9qFrI', defaultLanguage: 'ko', categoryId: '27'};

const makePackage = (name = 'ep99-shorts-test', extra = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'studio-upload-test-'));
  const dir = join(root, name);
  mkdirSync(dir);
  writeFileSync(join(dir, 'Test_Video_English_Pronunciation_Shorts.mp4'), 'x');
  writeFileSync(join(dir, 'title.txt'), '시험용 제목입니다 영어 발음 테스트 (아는 단어 5개)\n');
  writeFileSync(join(dir, 'description.txt'), '시험용 설명입니다.\n#영어발음\n');
  writeFileSync(join(dir, 'tags.txt'), 'chocolate 발음, 영어발음, 이해하면쉬운영어\n');
  writeFileSync(join(dir, 'thumbnail.jpg'), 'jpg');
  writeFileSync(join(dir, 'subtitles-ko.srt'), '1\n00:00:00,000 --> 00:00:02,000\n안녕\n');
  for (const [file, content] of Object.entries(extra)) writeFileSync(join(dir, file), content);
  return dir;
};
const run = (dir, opts = {}) => inspectPackage(dir, {
  schedule: okSchedule(), playlist: '시험 재생목록', catalogVideos: [], login: 'logged-in', ...opts,
});
const failedIds = (r) => r.checks.filter((c) => !c.ok).map((c) => c.id);

test('예약 시각: 한국 시각을 UTC로 바꾼다 (20:00 KST = 11:00Z, EP30 실제 값)', () => {
  const s = okSchedule();
  assert.equal(s.ok, true);
  assert.equal(s.utcIso, '2026-11-18T11:00:00.000Z');
  assert.equal(s.dateText, '2026. 11. 18.');
  assert.equal(s.timeText, '오후 8:00');
});

test('예약 시각: 형식 오류·없는 날짜·과거·30분 미만·60일 초과를 거절한다', () => {
  assert.equal(parseSchedule('2026/11/18 20:00', NOW).ok, false);
  assert.equal(parseSchedule('2026-11-18', NOW).ok, false);
  assert.equal(parseSchedule('2026-02-30 20:00', NOW).ok, false);
  assert.equal(parseSchedule('2026-11-18 24:00', NOW).ok, false);
  assert.equal(parseSchedule('2026-11-15 20:00', NOW).ok, false, '과거');
  assert.equal(parseSchedule('2026-11-16 15:20', NOW).ok, false, '지금보다 20분 뒤');
  assert.equal(parseSchedule('2026-11-16 15:30', NOW).ok, true, '정확히 30분 뒤는 통과');
});

test('예약 시각: 60일을 넘으면 거절한다', () => {
  // NOW(2026-11-16 15:00 KST) + 60일 = 2027-01-15 15:00 KST
  assert.equal(parseSchedule('2027-01-15 15:00', NOW).ok, true);
  assert.equal(parseSchedule('2027-01-15 15:01', NOW).ok, false);
  assert.equal(parseSchedule('2027-03-01 20:00', NOW).ok, false);
});

test('스튜디오 날짜 문구는 달·일에 0을 붙이지 않는다', () => {
  assert.equal(studioDateText({y: 2026, mo: 12, d: 5}), '2026. 12. 5.');
  assert.equal(studioDateText({y: 2026, mo: 11, d: 18}), '2026. 11. 18.');
});

test('스튜디오 시간 문구: 오전 12시·오후 12시 경계', () => {
  assert.equal(studioTimeText({h: 0, mi: 0}), '오전 12:00');
  assert.equal(studioTimeText({h: 0, mi: 5}), '오전 12:05');
  assert.equal(studioTimeText({h: 1, mi: 30}), '오전 1:30');
  assert.equal(studioTimeText({h: 11, mi: 59}), '오전 11:59');
  assert.equal(studioTimeText({h: 12, mi: 0}), '오후 12:00');
  assert.equal(studioTimeText({h: 13, mi: 15}), '오후 1:15');
  assert.equal(studioTimeText({h: 20, mi: 0}), '오후 8:00');
  assert.equal(studioTimeText({h: 23, mi: 45}), '오후 11:45');
});

test('확인 창 문구: 실제 화면 문장(2026-11-16)에서 날짜·시각을 알아보고 다른 시각은 거절한다', () => {
  const s = okSchedule();
  const real = '동영상 예약됨 2026년 11월 18일 20:00에 동영상이 공개 상태로 설정됩니다. 동영상 링크 https://youtube.com/shorts/Ng6amm9qFrI?feature=share 닫기';
  assert.equal(confirmationMatches(real, s), true);
  assert.equal(confirmationMatches(real.replace('20:00', '19:00'), s), false);
  assert.equal(confirmationMatches(real.replace('18일', '19일'), s), false);
  assert.equal(confirmationMatches('동영상 저장됨', s), false);
  const nine = parseSchedule('2026-11-20 09:00', NOW);
  assert.equal(confirmationMatches('2026년 11월 20일 9:00에', nine), true);
  assert.equal(confirmationMatches('2026년 11월 20일 09:00에', nine), true);
  assert.equal(videoIdFromText(real), 'Ng6amm9qFrI');
  assert.equal(videoIdFromText('https://youtu.be/abcdefghijk'), 'abcdefghijk');
  assert.equal(videoIdFromText('링크 없음'), null);
});

test('안전 확인: 버튼 글자가 "예약"이 아니면(게시·저장) 누르지 않는다', () => {
  const s = okSchedule();
  const base = {doneButtonText: '예약', dateRead: '2026. 11. 18.', timeRead: '오후 8:00', schedule: s};
  assert.equal(checkScheduleReadback(base).ok, true);
  assert.equal(checkScheduleReadback({...base, doneButtonText: ' 예약 \n'}).ok, true, '공백은 무시');
  assert.equal(checkScheduleReadback({...base, doneButtonText: '게시'}).ok, false);
  assert.equal(checkScheduleReadback({...base, doneButtonText: '저장'}).ok, false);
  assert.equal(checkScheduleReadback({...base, doneButtonText: '완료'}).ok, false);
});

test('안전 확인: 읽은 날짜·시간이 다르면 멈춘다', () => {
  const s = okSchedule();
  const base = {doneButtonText: '예약', dateRead: '2026. 11. 18.', timeRead: '오후 8:00', schedule: s};
  assert.equal(checkScheduleReadback({...base, dateRead: '2026. 11. 19.'}).ok, false);
  assert.equal(checkScheduleReadback({...base, timeRead: '오전 8:00'}).ok, false);
  assert.equal(checkScheduleReadback({...base, timeRead: ''}).ok, false);
  assert.match(checkScheduleReadback({...base, timeRead: '오전 8:00'}).reason, /시간 칸/);
});

test('태그 글자 수: 실제 EP30 태그 11개는 스튜디오 화면의 131자와 같다', () => {
  const real = readFileSync(new URL('../../output/upload-packages/ep30-shorts-chocolate/tags.txt', import.meta.url), 'utf8');
  assert.equal(parseTags(real).length, 11);
  assert.equal(tagCharCount(parseTags(real)), 131);
});

test('점검: 정상 패키지는 모두 통과한다', () => {
  const r = run(makePackage());
  assert.deepEqual(failedIds(r), []);
  assert.equal(r.ok, true);
  assert.equal(r.plan.kind, 'shorts');
  assert.equal(r.plan.statusFile, 'shorts-status.json');
  assert.equal(r.plan.tags.length, 3);
  assert.ok(r.plan.subsPath);
});

test('점검: 필수 결정(예약 시각, 재생목록 또는 --no-playlist)이 빠지면 거절한다', () => {
  const dir = makePackage();
  assert.ok(failedIds(run(dir, {schedule: null})).includes('schedule'));
  assert.ok(failedIds(run(dir, {playlist: null, noPlaylist: false})).includes('playlist'));
  assert.deepEqual(failedIds(run(dir, {playlist: null, noPlaylist: true})), []);
  assert.ok(failedIds(run(dir, {playlist: 'x', noPlaylist: true})).includes('playlist'), '둘 다 주면 거절');
  assert.ok(failedIds(run(dir, {schedule: parseSchedule('2020-01-01 10:00', NOW)})).includes('schedule'));
});

test('점검: 파일이 빠지면 거절한다', () => {
  const dir = makePackage('ep98-shorts-empty');
  const empty = mkdtempSync(join(tmpdir(), 'studio-upload-empty-'));
  const r = inspectPackage(empty, {schedule: okSchedule(), playlist: 'x', catalogVideos: [], login: 'logged-in'});
  assert.deepEqual(failedIds(r).filter((id) => ['video', 'title', 'description', 'tags', 'thumbnail'].includes(id)).sort(), ['description', 'tags', 'thumbnail', 'title', 'video']);
  assert.equal(inspectPackage(join(dir, 'nope'), {}).ok, false);
});

test('점검: status.json이 있으면 거절한다(자동 업로드 대기열 중복 위험)', () => {
  const r = run(makePackage('ep97-shorts-x', {'status.json': '{}'}));
  assert.ok(failedIds(r).includes('no-status-json'));
});

test('점검: shorts-status.json에 영상 ID가 이미 있으면 거절한다(이미 올림)', () => {
  const r = run(makePackage('ep96-shorts-x', {'shorts-status.json': JSON.stringify({status: 'scheduled', videoId: 'Ng6amm9qFrI', scheduledFor: '2026-11-18T11:00:00Z'})}));
  assert.ok(failedIds(r).includes('not-uploaded'));
  const fresh = run(makePackage('ep95-shorts-x', {'shorts-status.json': JSON.stringify({status: 'packaged'})}));
  assert.equal(failedIds(fresh).includes('not-uploaded'), false);
});

test('점검: 채널 카탈로그에 같은 제목이 있으면 거절하고, 카탈로그를 못 읽어도 거절한다', () => {
  const dir = makePackage();
  const title = readFileSync(join(dir, 'title.txt'), 'utf8').trim();
  assert.ok(failedIds(run(dir, {catalogVideos: [{videoId: 'AAAAAAAAAAA', title}]})).includes('catalog-dup'));
  assert.ok(failedIds(run(dir, {catalogVideos: [{videoId: 'AAAAAAAAAAA', title: `  ${title}  `}]})).includes('catalog-dup'), '공백 차이는 같은 제목');
  assert.equal(failedIds(run(dir, {catalogVideos: [{videoId: 'AAAAAAAAAAA', title: '전혀 다른 제목'}]})).includes('catalog-dup'), false);
  assert.ok(failedIds(run(dir, {catalogVideos: null})).includes('catalog-dup'));
  assert.equal(findCatalogDuplicate('', [{title: ''}]), null);
});

test('점검: 길이 상한(제목 100자, 태그 500자, 설명 5000자)과 꺾쇠 괄호', () => {
  assert.ok(failedIds(run(makePackage('ep94-shorts-a', {'title.txt': '가'.repeat(101)}))).includes('limits'));
  assert.equal(failedIds(run(makePackage('ep94-shorts-b', {'title.txt': '가'.repeat(100)}))).includes('limits'), false);
  assert.ok(failedIds(run(makePackage('ep94-shorts-c', {'description.txt': '가'.repeat(5001)}))).includes('limits'));
  assert.ok(failedIds(run(makePackage('ep94-shorts-d', {'tags.txt': Array.from({length: 60}, (_, i) => `tag${i}abcdef`).join(',')}))).includes('limits'));
  assert.ok(failedIds(run(makePackage('ep94-shorts-e', {'description.txt': '이건 <나쁜> 설명'}))).includes('limits'));
});

test('점검: 금지어가 있으면 거절한다', () => {
  assert.ok(failedIds(run(makePackage('ep93-shorts-a', {'title.txt': '듣기 드릴 영어 발음'}))).includes('banned'));
  assert.ok(failedIds(run(makePackage('ep93-shorts-b', {'description.txt': '미니멀 페어 연습'}))).includes('banned'));
  assert.equal(failedIds(run(makePackage('ep93-shorts-c', {'description.txt': '들려드릴 말씀이 있어요'}))).includes('banned'), false);
});

test('점검: 로그인이 안 돼 있으면 거절한다', () => {
  const dir = makePackage();
  assert.ok(failedIds(run(dir, {login: 'login-needed'})).includes('login'));
  assert.ok(failedIds(run(dir, {login: 'unknown'})).includes('login'));
  assert.equal(failedIds(run(dir, {login: 'logged-in'})).includes('login'), false);
});

test('점검: --no-subs면 자막을 올리지 않고, 자막 파일이 없어도 통과한다', () => {
  const dir = makePackage();
  assert.equal(run(dir, {noSubs: true}).plan.subsPath, null);
  assert.match(run(dir, {noSubs: true}).plan.subsNote, /--no-subs/);
});

test('옵션 읽기: 사용법 오류를 잡는다', () => {
  assert.deepEqual(parseArgs(['out/pkg', '--schedule', '2026-11-18 20:00', '--playlist', '목록', '--yes']).errors, []);
  assert.ok(parseArgs([]).errors.length);
  assert.ok(parseArgs(['a', 'b']).errors.length);
  assert.ok(parseArgs(['a', '--wat']).errors.length);
  assert.ok(parseArgs(['a', '--schedule']).errors.length);
  assert.ok(parseArgs(['a', '--guide', '--yes']).errors.length);
  const a = parseArgs(['pkg', '--no-playlist', '--no-subs']);
  assert.equal(a.noPlaylist, true);
  assert.equal(a.noSubs, true);
  assert.equal(a.yes, false, '--yes가 없으면 점검만');
});

test('가이드: 세 방법이 모두 같은 한 줄 명령을 쓰고, 제미나이용 코드 블록에 --yes가 있다', () => {
  const dir = makePackage();
  const plan = run(dir).plan;
  const text = buildGuide({pkgRel: 'output/upload-packages/ep99-shorts-test', plan, scheduleText: '2026-11-18 20:00', playlist: '시험 재생목록', noPlaylist: false, noSubs: false});
  const cmd = 'npm run studio-upload -- output/upload-packages/ep99-shorts-test --schedule "2026-11-18 20:00" --playlist "시험 재생목록" --yes';
  assert.match(text, /## 가\) 내가 직접/);
  assert.match(text, /## 나\) 제미나이/);
  assert.match(text, /## 다\) Claude/);
  assert.equal(text.split(cmd).length - 1, 2, '제미나이 블록과 Claude 줄에 같은 명령');
  const block = /## 나\) 제미나이[^]*?```\n([^]*?)```/.exec(text)[1];
  assert.ok(block.includes(cmd), '코드 블록 안에 명령');
  assert.match(block, /git pull/);
  assert.match(block, /다른 파일은 고치지 마/);
  assert.match(block, /종료 코드/);
  assert.match(text, /scheduledFor/);
  assert.ok(text.includes(plan.title) && text.includes('thumbnail.jpg'));
  assert.ok(text.includes('2026-11-18T11:00:00.000Z'));
});

test('가이드: 시각·재생목록이 없으면 <미정>과 "정해야 함"을 표시한다', () => {
  const plan = run(makePackage()).plan;
  const text = buildGuide({pkgRel: 'output/upload-packages/x', plan, scheduleText: null, playlist: null, noPlaylist: false, noSubs: false});
  assert.match(text, /<미정>[^\n]*정해야 함/);
  assert.match(text, /--schedule "<정해야 함/);
  assert.match(text, /--playlist "<정해야 함/);
  assert.match(buildCommand('p', {noPlaylist: true, scheduleText: '2026-11-18 20:00'}), /--no-playlist/);
});

test('대시보드 확인: 예약 시각이 같은지 비교하고, 꺼져 있으면 성공 처리하지 않는다', async () => {
  const s = okSchedule();
  assert.equal(scheduledForMatches('2026-11-18T11:00:00Z', s), true);
  assert.equal(scheduledForMatches('2026-11-18T11:00:00.000Z', s), true);
  assert.equal(scheduledForMatches('2026-11-18T10:00:00Z', s), false);
  assert.equal(scheduledForMatches(null, s), false);
  const plan = run(makePackage('ep92-shorts-sync')).plan;
  const down = await syncAndVerify({plan, schedule: s, videoId: 'x', sleepMs: 0, catalogVideoFn: () => okCatalogVideo, fetchFn: async () => { const e = new TypeError('fetch failed'); e.cause = {code: 'ECONNREFUSED'}; throw e; }});
  assert.equal(down.ok, false);
  assert.equal(down.dashboardDown, true);
  assert.match(down.reason, /꺼져 있어 동기화 못 함/);
});

test('대시보드 확인: 동기화 뒤 shorts-status.json의 scheduledFor가 같아야 성공이다', async () => {
  const s = okSchedule();
  const dir = makePackage('ep91-shorts-sync');
  const plan = run(dir).plan;
  // 동기화가 파일을 쓰는 것을 흉내 낸다
  const fetchOk = (scheduledFor) => async () => {
    writeFileSync(join(dir, 'shorts-status.json'), JSON.stringify({status: 'scheduled', videoId: 'Ng6amm9qFrI', scheduledFor}));
    return {ok: true, status: 200};
  };
  const good = await syncAndVerify({plan, schedule: s, videoId: 'Ng6amm9qFrI', sleepMs: 0, catalogVideoFn: () => okCatalogVideo, fetchFn: fetchOk('2026-11-18T11:00:00Z')});
  assert.equal(good.ok, true);
  const bad = await syncAndVerify({plan, schedule: s, videoId: 'Ng6amm9qFrI', sleepMs: 0, catalogVideoFn: () => okCatalogVideo, fetchFn: fetchOk('2026-11-18T10:00:00Z')});
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /shorts-status\.json/);
  assert.equal(existsSync(join(dir, 'status.json')), false);
});

test('카테고리: 기본은 교육(27), 한글 이름과 번호 둘 다 받고 모르는 값은 거절한다', () => {
  assert.deepEqual(resolveCategory(), {label: '교육', id: '27'});
  assert.deepEqual(resolveCategory('교육'), {label: '교육', id: '27'});
  assert.deepEqual(resolveCategory('27'), {label: '교육', id: '27'});
  assert.deepEqual(resolveCategory('게임'), {label: '게임', id: '20'});
  assert.ok(resolveCategory('없는것').error);
  assert.equal(Object.keys(CATEGORIES).length, 15);
});

test('실제 catalog.json 최근 영상의 categoryId는 교육 번호와 같다(번호표 확인)', () => {
  const catalog = JSON.parse(readFileSync(new URL('../../data/youtube/catalog.json', import.meta.url), 'utf8'));
  const withCat = catalog.videos.filter((v) => v.categoryId).slice(0, 5);
  assert.ok(withCat.length > 0);
  for (const v of withCat) assert.equal(String(v.categoryId), CATEGORIES['교육']);
});

test('설정 판정: 편집 화면에서 읽은 세 칸이 기대와 같으면 통과, 다르면 어느 칸인지 알려 준다', () => {
  const expected = {category: resolveCategory('교육')};
  const good = {category: '교육', videoLanguage: '한국어', titleLanguage: '한국어'};
  assert.deepEqual(diffSettings(good, expected), []);
  assert.deepEqual(diffSettings({...good, titleLanguage: ''}, expected).map((d) => d.key), ['titleLanguage']);
  assert.deepEqual(diffSettings({...good, videoLanguage: '영어'}, expected).map((d) => d.key), ['videoLanguage']);
  assert.deepEqual(diffSettings({...good, category: '엔터테인먼트'}, expected).map((d) => d.key), ['category']);
  assert.equal(diffSettings({category: '', videoLanguage: '', titleLanguage: ''}, expected).length, 3);
});

test('API 값 판정: defaultLanguage가 ko이고 categoryId가 기대값이어야 한다(EP30 동기화 직후 null이었던 사례)', () => {
  assert.equal(checkCatalogSettings({defaultLanguage: 'ko', categoryId: '27'}, '27').ok, true);
  const noLang = checkCatalogSettings({defaultLanguage: null, categoryId: '27'}, '27');
  assert.equal(noLang.ok, false);
  assert.match(noLang.missing[0], /제목 및 설명 언어/);
  assert.match(noLang.missing[0], /비어 있음/);
  const wrongCat = checkCatalogSettings({defaultLanguage: 'ko', categoryId: '24'}, '27');
  assert.equal(wrongCat.ok, false);
  assert.match(wrongCat.missing[0], /카테고리/);
  assert.equal(checkCatalogSettings({defaultLanguage: 'en', categoryId: 27}, 27).missing.length, 1);
  assert.equal(checkCatalogSettings(null, '27').ok, false);
});

test('끝 검증: 동기화 뒤 카탈로그에 언어·카테고리가 빠져 있으면 실패하고 빠진 설정 목록을 돌려준다', async () => {
  const dir = makePackage('ep90-shorts-settings');
  const plan = run(dir).plan;
  const fetchOk = async () => {
    writeFileSync(join(dir, 'shorts-status.json'), JSON.stringify({status: 'scheduled', videoId: 'Ng6amm9qFrI', scheduledFor: '2026-11-18T11:00:00Z'}));
    return {ok: true, status: 200};
  };
  const s = okSchedule();
  const missingLang = await syncAndVerify({plan, schedule: s, videoId: 'Ng6amm9qFrI', sleepMs: 0, fetchFn: fetchOk, catalogVideoFn: () => ({videoId: 'Ng6amm9qFrI', defaultLanguage: null, categoryId: '27'})});
  assert.equal(missingLang.ok, false);
  assert.equal(missingLang.missing.length, 1);
  assert.match(missingLang.reason, /빠진 설정/);
  const bothMissing = await syncAndVerify({plan, schedule: s, videoId: 'Ng6amm9qFrI', sleepMs: 0, fetchFn: fetchOk, catalogVideoFn: () => ({videoId: 'Ng6amm9qFrI', defaultLanguage: null, categoryId: '24'})});
  assert.equal(bothMissing.missing.length, 2);
  const good = await syncAndVerify({plan, schedule: s, videoId: 'Ng6amm9qFrI', sleepMs: 0, fetchFn: fetchOk, catalogVideoFn: () => okCatalogVideo});
  assert.equal(good.ok, true);
  const gamePick = await syncAndVerify({plan, schedule: s, videoId: 'Ng6amm9qFrI', expectedCategoryId: '20', sleepMs: 0, fetchFn: fetchOk, catalogVideoFn: () => okCatalogVideo});
  assert.equal(gamePick.ok, false, '게임(20)을 기대했는데 27이면 실패');
});

test('점검 표와 옵션: 카테고리·언어 줄이 있고, --category를 받으며, 잘못된 값은 점검에서 거절한다', () => {
  const dir = makePackage('ep89-shorts-cat');
  const ok = run(dir);
  assert.ok(ok.checks.find((c) => c.id === 'category' && c.ok && /교육[(]27[)]/.test(c.detail)));
  assert.ok(ok.checks.find((c) => c.id === 'languages' && c.ok && /한국어/.test(c.detail)));
  assert.deepEqual(ok.plan.category, {label: '교육', id: '27'});
  assert.ok(failedIds(run(dir, {category: resolveCategory('없는것')})).includes('category'));
  assert.equal(parseArgs(['p', '--category', '게임']).category, '게임');
  assert.ok(parseArgs(['p', '--category']).errors.length);
});

test('가이드: 사용자 직접 체크리스트에 카테고리와 두 언어 칸이 있고, 끝 확인에 API 칸이 적힌다', () => {
  const plan = run(makePackage('ep88-shorts-guide')).plan;
  const text = buildGuide({pkgRel: 'output/upload-packages/x', plan, scheduleText: '2026-11-18 20:00', playlist: '목록', noPlaylist: false, noSubs: false});
  assert.match(text, /카테고리: 교육/);
  assert.match(text, /동영상 언어: 한국어/);
  assert.match(text, /제목 및 설명 언어: 한국어/);
  assert.match(text, /defaultLanguage/);
  assert.match(text, /categoryId/);
  assert.ok(!text.includes('--category'), '기본 교육이면 명령에 --category를 붙이지 않는다');
  const game = run(makePackage('ep87-shorts-guide'), {category: resolveCategory('게임')}).plan;
  const gameText = buildGuide({pkgRel: 'p', plan: game, scheduleText: '2026-11-18 20:00', playlist: '목록', noPlaylist: false, noSubs: false});
  assert.match(gameText, /--category "게임"/);
});
