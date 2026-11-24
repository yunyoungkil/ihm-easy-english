// PC 2대 자료·대화 공유(scripts/pc-sync.mjs, 2026-11-24): 무엇을 나르는지, 어느 쪽이 이기는지, 대화 사본에 무엇이 남는지.
// 가짜 대화 줄은 실제 파일의 칸 이름을 그대로 쓴다(클로드 코드 jsonl: type·message.content·tool_use·tool_result·isSidechain·timestamp,
// 안티그래비티 transcript.jsonl: type·content·created_at·tool_calls[].name/args·media[].uri).
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {
  claudeProjectKey,
  findMyDrive,
  planCopies,
  renderChatIndex,
  shouldSyncFile,
  slimAntigravityTranscript,
  slimClaudeTranscript,
  syncFiles,
} from '../pc-sync.mjs';

test('shouldSyncFile: 영상 폴더는 그림·영상·음성과 생성 기록만, git 추적 파일과 캐시는 빼고, 참고 자료 폴더는 전부', () => {
  const tracked = new Set(['videos/ep31/assets/hero.png']);
  const media = {mediaOnly: true, tracked};
  assert.equal(shouldSyncFile('videos/ep35/assets/hero-01.jpg', media), true);
  assert.equal(shouldSyncFile('videos/ep35/assets/voice/03.wav', media), true);
  assert.equal(shouldSyncFile('videos/ep35/assets/voice/03.words.json', media), true, '실측 발화 시각은 음성과 같이 다닌다');
  assert.equal(shouldSyncFile('videos/ep35/assets/c00.mp4.prompt.json', media), true);
  assert.equal(shouldSyncFile('videos/ep35/renders/final.mp4', media), true);
  assert.equal(shouldSyncFile('videos/ep31/assets/hero.png', media), false, 'git이 나르는 파일은 건드리지 않는다');
  assert.equal(shouldSyncFile('videos/ep35/index.html', media), false, '글 파일은 git으로');
  assert.equal(shouldSyncFile('videos/ep35/assets/audio-timings.json', media), false);
  assert.equal(shouldSyncFile('videos/ep35/.thumbnails/a.jpg', media), false, '도구 캐시는 PC마다 다시 생긴다');
  assert.equal(shouldSyncFile('videos/ep35/node_modules/x/a.png', media), false);
  assert.equal(shouldSyncFile('videos/ep35/assets/a.png.pcsync-tmp', media), false, '복사 중 임시 파일');
  assert.equal(shouldSyncFile('public/reference/notes.txt', {mediaOnly: false, tracked}), true);
  assert.equal(shouldSyncFile('public/reference/desktop.ini', {mediaOnly: false, tracked}), false);
});

test('planCopies: 없으면 복사, 2초 넘게 새로우면 복사, 같거나 오래되면 그대로', () => {
  const src = new Map([
    ['a.png', {size: 1, mtimeMs: 10_000}],
    ['b.png', {size: 1, mtimeMs: 20_000}],
    ['c.png', {size: 1, mtimeMs: 30_000}],
    ['d.png', {size: 1, mtimeMs: 40_000}],
  ]);
  const dst = new Map([
    ['b.png', {size: 1, mtimeMs: 15_000}],
    ['c.png', {size: 2, mtimeMs: 29_000}],
    ['d.png', {size: 1, mtimeMs: 50_000}],
  ]);
  assert.deepEqual(planCopies(src, dst), [{rel: 'a.png', reason: 'new'}, {rel: 'b.png', reason: 'newer'}]);
});

test('findMyDrive: 설정 경로 → 스트리밍 가상 드라이브 → 미러링 사용자 폴더 순으로 찾는다', () => {
  const has = (set) => (p) => set.has(p);
  assert.equal(findMyDrive({env: {}, exists: has(new Set(['G:\\내 드라이브'])), home: 'C:\\Users\\u', configPath: 'none'}), 'G:\\내 드라이브');
  assert.equal(findMyDrive({env: {}, exists: has(new Set(['H:\\My Drive'])), home: 'C:\\Users\\u', configPath: 'none'}), 'H:\\My Drive');
  assert.equal(findMyDrive({env: {}, exists: has(new Set([join('C:\\Users\\u', '내 드라이브')])), home: 'C:\\Users\\u', configPath: 'none'}), join('C:\\Users\\u', '내 드라이브'));
  assert.equal(findMyDrive({env: {IHM_PC_SYNC_DRIVE: 'X:\\d'}, exists: has(new Set(['X:\\d', 'G:\\내 드라이브'])), home: 'C:\\Users\\u', configPath: 'none'}), 'X:\\d');
  assert.equal(findMyDrive({env: {}, exists: () => false, home: 'C:\\Users\\u', configPath: 'none'}), null);
});

test('claudeProjectKey: 클로드 코드가 대화 폴더 이름을 만드는 방식(: \\ / . → -)', () => {
  assert.equal(claudeProjectKey('c:\\Users\\yunyo\\.gemini\\antigravity-ide\\scratch\\ihm-easy-english'), 'c--Users-yunyo--gemini-antigravity-ide-scratch-ihm-easy-english');
});

test('slimClaudeTranscript: 사용자 글·질문 창 답·AI 글은 남기고, 생각·도구 출력·하위 에이전트·시스템 알림은 뺀다', () => {
  const entries = [
    {type: 'user', timestamp: '2026-11-24T06:00:00.000Z', isSidechain: false, message: {role: 'user', content: [{type: 'text', text: '썸네일 논의하자 https://example.com/ref <system-reminder>긴 알림</system-reminder>'}, {type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: Buffer.from('jpg').toString('base64')}}]}},
    {type: 'assistant', timestamp: '2026-11-24T06:00:05.000Z', isSidechain: false, message: {role: 'assistant', content: [{type: 'thinking', thinking: '속생각'}, {type: 'text', text: '자료 봤어요.'}, {type: 'tool_use', id: 't1', name: 'Bash', input: {command: 'ls', description: '파일 목록 보기'}}, {type: 'tool_use', id: 't2', name: 'AskUserQuestion', input: {questions: [{question: '어느 안?', options: [{label: 'A'}, {label: 'B'}]}]}}]}},
    {type: 'user', timestamp: '2026-11-24T06:00:06.000Z', isSidechain: false, message: {role: 'user', content: [{type: 'tool_result', tool_use_id: 't1', content: '아주 긴 출력'}]}},
    {type: 'user', timestamp: '2026-11-24T06:01:00.000Z', isSidechain: false, message: {role: 'user', content: [{type: 'tool_result', tool_use_id: 't2', content: 'The user answered: "어느 안?"="B"'}]}},
    {type: 'user', timestamp: '2026-11-24T06:02:00.000Z', isSidechain: true, message: {role: 'user', content: '하위 에이전트 지시'}},
    {type: 'attachment', timestamp: '2026-11-24T06:02:00.000Z', attachment: {type: 'hook_success'}},
  ];
  const r = slimClaudeTranscript(entries, {id: 'abc', pc: 'PC1'});
  assert.equal(r.userTurns, 1);
  assert.ok(r.markdown.includes('https://example.com/ref'), '사용자가 준 링크가 남는다');
  assert.ok(r.markdown.includes('자료 봤어요.'));
  assert.ok(r.markdown.includes('(도구) Bash: 파일 목록 보기'));
  assert.ok(r.markdown.includes('(질문 창) 어느 안? — 보기: A / B'));
  assert.ok(r.markdown.includes('"어느 안?"="B"'), '질문 창 답은 사용자 결정이라 남긴다');
  assert.ok(r.markdown.includes('abc-files/img-1.jpg'), '붙인 그림은 파일로 빼고 자리를 적는다');
  assert.equal(r.images.length, 1);
  for (const gone of ['속생각', '아주 긴 출력', '하위 에이전트 지시', '긴 알림']) assert.ok(!r.markdown.includes(gone), `${gone}은 빠져야 한다`);
  assert.ok(r.markdown.includes('시작 2026-11-24 15:00'), '한국 시간으로 적는다');
});

test('slimAntigravityTranscript: 요청 본문만 남기고 시간·설정 꼬리표는 빼며, AI 글과 도구 한 줄, 붙인 파일 자리를 남긴다', () => {
  const entries = [
    {step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-11-23T12:00:00Z', content: '<USER_REQUEST>\n이 썸네일 사례 봐 줘\n</USER_REQUEST>\n<ADDITIONAL_METADATA>\nThe current local time is: x\n</ADDITIONAL_METADATA>', media: [{mime_type: 'image/jpeg', uri: 'file:///C:/Users/u/.gemini/antigravity/brain/c1/.system_generated/logs/media/step_0_media_0.jpg'}]},
    {step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-11-23T12:00:05Z', thinking: '속생각', content: '두 장 다 대비가 강해요.', tool_calls: [{name: 'run_command', args: {CommandLine: '"git pull"', toolSummary: '"Git pull"'}}]},
    {step_index: 2, source: 'MODEL', type: 'GENERIC', status: 'DONE', created_at: '2026-11-23T12:00:06Z', content: 'Command output: 긴 출력'},
    {step_index: 3, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-11-23T12:00:07Z', tool_calls: [{name: 'view_file', args: {AbsolutePath: '"C:/x/BRIEF.md"'}}]},
  ];
  const r = slimAntigravityTranscript(entries, {id: 'c1', pc: 'PC2'});
  assert.equal(r.userTurns, 1);
  assert.ok(r.markdown.includes('이 썸네일 사례 봐 줘'));
  assert.ok(!r.markdown.includes('ADDITIONAL_METADATA') && !r.markdown.includes('The current local time'));
  assert.ok(r.markdown.includes('두 장 다 대비가 강해요.'));
  assert.ok(r.markdown.includes('(도구) run_command: Git pull'));
  assert.ok(r.markdown.includes('c1-files/step_0_media_0.jpg'));
  assert.ok(!r.markdown.includes('속생각') && !r.markdown.includes('긴 출력'));
  assert.equal(r.media.length, 1);
  assert.equal(r.markdown.split('### AI').length - 1, 1, '이어지는 AI 답은 한 절로 묶는다');
  assert.ok(r.markdown.includes('(도구) view_file: C:/x/BRIEF.md'));
});

test('renderChatIndex: 새 대화부터, 표 칸을 깨는 | 는 이스케이프', () => {
  const md = renderChatIndex([
    {ai: '클로드 코드', start: '2026-11-23T01:00:00Z', userTurns: 3, first: 'a|b', last: 'c', file: 'claude/PC/x.md'},
    {ai: '안티그래비티', start: '2026-11-24T01:00:00Z', userTurns: 5, first: '새것', last: 'd', file: 'antigravity/PC/y.md'},
  ], 'PC');
  assert.ok(md.indexOf('새것') < md.indexOf('a\\|b'));
});

test('syncFiles: PC1이 올린 재료를 PC2가 받고, 추적 파일·글 파일은 오가지 않으며, 늦게 고친 쪽이 이긴다', async () => {
  const base = mkdtempSync(join(tmpdir(), 'pc-sync-'));
  const pc1 = join(base, 'pc1');
  const pc2 = join(base, 'pc2');
  const drive = join(base, 'drive', 'ihm-easy-english-sync');
  const put = (root, rel, body, mtime) => {
    const p = join(root, ...rel.split('/'));
    mkdirSync(join(p, '..'), {recursive: true});
    writeFileSync(p, body);
    if (mtime) utimesSync(p, mtime, mtime);
    return p;
  };
  put(pc1, 'videos/ep35/assets/hero.jpg', 'v1', new Date('2026-11-24T00:00:00Z'));
  put(pc1, 'videos/ep35/assets/voice/01.wav', 'wav');
  put(pc1, 'videos/ep35/SCRIPT.md', '글');
  put(pc1, 'videos/ep31/assets/old.png', 'tracked');
  const tracked = new Set(['videos/ep31/assets/old.png', 'videos/ep35/SCRIPT.md']);

  const up = await syncFiles({direction: 'push', project: pc1, remoteRoot: drive, tracked, minFree: 0});
  assert.equal(up.copied, 2);
  assert.ok(existsSync(join(drive, 'files', 'videos', 'ep35', 'assets', 'hero.jpg')));
  assert.ok(!existsSync(join(drive, 'files', 'videos', 'ep31', 'assets', 'old.png')), '추적 파일은 안 올린다');
  assert.equal(statSync(join(drive, 'files', 'videos', 'ep35', 'assets', 'hero.jpg')).mtime.toISOString(), '2026-11-24T00:00:00.000Z', '수정 시각을 지킨다');

  const down = await syncFiles({direction: 'pull', project: pc2, remoteRoot: drive, tracked, minFree: 0});
  assert.equal(down.copied, 2);
  assert.equal(readFileSync(join(pc2, 'videos', 'ep35', 'assets', 'hero.jpg'), 'utf8'), 'v1');

  // PC2가 같은 그림을 나중에 다시 만들면 그쪽이 이긴다
  put(pc2, 'videos/ep35/assets/hero.jpg', 'v2', new Date('2026-11-24T05:00:00Z'));
  await syncFiles({direction: 'push', project: pc2, remoteRoot: drive, tracked, minFree: 0});
  const again = await syncFiles({direction: 'pull', project: pc1, remoteRoot: drive, tracked, minFree: 0});
  assert.equal(again.copied, 1);
  assert.equal(readFileSync(join(pc1, 'videos', 'ep35', 'assets', 'hero.jpg'), 'utf8'), 'v2');

  // 공간이 모자라면 받지 않고 센다
  put(pc1, 'videos/ep36/assets/new.png', 'x');
  await syncFiles({direction: 'push', project: pc1, remoteRoot: drive, tracked, minFree: 0});
  const full = await syncFiles({direction: 'pull', project: pc2, remoteRoot: drive, tracked, minFree: Number.MAX_SAFE_INTEGER});
  assert.equal(full.copied, 0);
  assert.equal(full.skippedForSpace, 1);
});
