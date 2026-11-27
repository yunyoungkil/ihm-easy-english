// PC 2대 자료·대화 공유(scripts/pc-sync.mjs, 2026-11-24): 무엇을 나르는지, 어느 쪽이 이기는지, 대화 사본에 무엇이 남는지.
// 가짜 대화 줄은 실제 파일의 칸 이름을 그대로 쓴다(클로드 코드 jsonl: type·message.content·tool_use·tool_result·isSidechain·timestamp,
// 안티그래비티 transcript.jsonl: type·content·created_at·tool_calls[].name/args·media[].uri).
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, utimesSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import test from 'node:test';
import {
  SYNC_ROOTS,
  claudeProjectKey,
  envKeys,
  exportChats,
  findMyDrive,
  mergeEnvText,
  planCopies,
  renderChatIndex,
  shouldSyncFile,
  slimAntigravityTranscript,
  slimClaudeTranscript,
  syncFiles,
  syncSecrets,
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

test('exportChats: jsonl 파일을 줄 단위로 스트리밍해 클로드·안티그래비티 사본과 목록을 만들고 깨진 줄은 건너뛴다', async () => {
  const base = mkdtempSync(join(tmpdir(), 'pc-sync-chats-'));
  const project = join(base, 'my-proj');
  const remote = join(base, 'drive');
  const claudeHome = join(base, '.claude');
  const geminiHome = join(base, '.gemini');

  const claudeDir = join(claudeHome, 'projects', claudeProjectKey(project));
  mkdirSync(claudeDir, {recursive: true});
  writeFileSync(join(claudeDir, 'sess-1.jsonl'), [
    JSON.stringify({type: 'user', timestamp: '2026-11-24T06:00:00.000Z', isSidechain: false, message: {role: 'user', content: '집 PC 첫 테스트'}}),
    '{깨진 마지막 줄',
    JSON.stringify({type: 'assistant', timestamp: '2026-11-24T06:00:05.000Z', isSidechain: false, message: {role: 'assistant', content: [{type: 'text', text: '스트리밍 완료'}]}}),
  ].join('\n'));

  const agDir = join(geminiHome, 'antigravity', 'brain', 'ag-1', '.system_generated', 'logs');
  mkdirSync(agDir, {recursive: true});
  writeFileSync(join(agDir, 'transcript.jsonl'), [
    JSON.stringify({type: 'USER_INPUT', created_at: '2026-11-24T07:00:00Z', content: '<USER_REQUEST>\nmy-proj 대화\n</USER_REQUEST>'}),
    JSON.stringify({type: 'PLANNER_RESPONSE', created_at: '2026-11-24T07:00:05Z', content: '확인했습니다.'}),
  ].join('\n'));

  const count = await exportChats({remoteRoot: remote, pc: 'HOME-PC', project, claudeHome, geminiHome});
  assert.equal(count, 2);
  const indexMd = readFileSync(join(remote, 'chats', 'INDEX-HOME-PC.md'), 'utf8');
  assert.ok(indexMd.includes('집 PC 첫 테스트'));
  assert.ok(indexMd.includes('my-proj 대화'));
  assert.ok(readFileSync(join(remote, 'chats', 'claude', 'HOME-PC', '2026-11-24-sess-1.md'), 'utf8').includes('스트리밍 완료'));
});

// ---------- 비밀 파일 공유(2026-11-27) ----------
// 가짜 값은 SECRET_VALUE_* 로만 쓰고, 로그·결과 어디에도 값이 나오지 않는지 확인한다. 실제 드라이브·실제 .env는 쓰지 않는다.

const setTime = (p, sec) => utimesSync(p, new Date(sec * 1000), new Date(sec * 1000));
function secretsSetup() {
  const base = mkdtempSync(join(tmpdir(), 'pc-secrets-'));
  const project = join(base, 'project');
  const remote = join(base, 'drive');
  const backupDir = join(base, 'backup');
  mkdirSync(project, {recursive: true});
  mkdirSync(join(remote, 'secrets'), {recursive: true});
  return {project, remote, backupDir, rpath: (n) => join(remote, 'secrets', n), lpath: (n) => join(project, n)};
}

test('SYNC_ROOTS: 블로그 대표 그림 폴더도 나른다', () => {
  assert.ok(SYNC_ROOTS.some((r) => r.rel === 'output/blog/images' && r.mediaOnly === false));
});

test('mergeEnvText: 한쪽에만 있는 키는 양쪽 모두 살고, 주석·빈 줄은 로컬 것을 유지한다', () => {
  const local = '# 로컬 주석\nBLOGGER_TECH_POST_EMAIL=SECRET_VALUE_123\n\nONLY_LOCAL=a\n';
  const remote = '# 드라이브 주석\nBLOGGER_TECH_POST_EMAIL=SECRET_VALUE_123\nONLY_REMOTE=b\n';
  const m = mergeEnvText(local, remote, {localNewer: true});
  assert.equal(m.text, '# 로컬 주석\nBLOGGER_TECH_POST_EMAIL=SECRET_VALUE_123\n\nONLY_LOCAL=a\nONLY_REMOTE=b\n');
  assert.deepEqual(m.receivedKeys, ['ONLY_REMOTE']);
  assert.deepEqual(m.sentKeys, ['ONLY_LOCAL']);
  assert.deepEqual(envKeys(m.text).sort(), ['BLOGGER_TECH_POST_EMAIL', 'ONLY_LOCAL', 'ONLY_REMOTE']);
});

test('mergeEnvText: 같은 키에 값이 다르면 파일이 더 최근인 쪽 값', () => {
  const local = 'K=local-value\nL=1\n';
  const remote = 'K=remote-value\nL=1\n';
  const localWins = mergeEnvText(local, remote, {localNewer: true});
  assert.equal(localWins.text, local);
  assert.deepEqual(localWins.sentKeys, ['K']);
  assert.deepEqual(localWins.receivedKeys, []);
  const remoteWins = mergeEnvText(local, remote, {localNewer: false});
  assert.equal(remoteWins.text, 'K=remote-value\nL=1\n');
  assert.deepEqual(remoteWins.receivedKeys, ['K']);
  assert.deepEqual(remoteWins.sentKeys, []);
});

test('mergeEnvText: 줄바꿈이 CRLF인 로컬은 CRLF를 유지하고, 같은 키 값이 같으면 바뀐 키가 없다', () => {
  const m = mergeEnvText('A=1\r\nB=2\r\n', 'A=1\nB=2\nC=3\n', {localNewer: true});
  assert.equal(m.text, 'A=1\r\nB=2\r\nC=3\r\n');
  const same = mergeEnvText('A=1\nB=2\n', 'B=2\nA=1\n', {localNewer: true});
  assert.deepEqual(same.receivedKeys, []);
  assert.deepEqual(same.sentKeys, []);
  assert.equal(same.text, 'A=1\nB=2\n');
});

test('syncSecrets: .env 합치기 — 양쪽 키 합집합이 되고, 값은 로그·결과에 나오지 않으며, 덮어쓰기 전 백업이 남는다', async () => {
  const t = secretsSetup();
  writeFileSync(t.lpath('.env'), '# local\nSHARED=SECRET_VALUE_123\nLOCAL_ONLY=SECRET_VALUE_L\n');
  writeFileSync(t.rpath('.env'), 'SHARED=SECRET_VALUE_123\nREMOTE_ONLY=SECRET_VALUE_R\n');
  setTime(t.lpath('.env'), 2_000_000);
  setTime(t.rpath('.env'), 1_000_000);
  const logs = [];
  const r = await syncSecrets({project: t.project, remoteRoot: t.remote, backupDir: t.backupDir, log: (m) => logs.push(m)});
  const local = readFileSync(t.lpath('.env'), 'utf8');
  const remote = readFileSync(t.rpath('.env'), 'utf8');
  assert.deepEqual(envKeys(local).sort(), ['LOCAL_ONLY', 'REMOTE_ONLY', 'SHARED']);
  assert.deepEqual(envKeys(remote).sort(), ['LOCAL_ONLY', 'REMOTE_ONLY', 'SHARED']);
  assert.ok(local.startsWith('# local\n'), '로컬 주석 유지');
  assert.deepEqual(r.envReceivedKeys, ['REMOTE_ONLY']);
  assert.deepEqual(r.envSentKeys, ['LOCAL_ONLY']);
  assert.equal(r.errors.length, 0);
  const backups = readdirSync(t.backupDir).filter((f) => f.startsWith('.env.'));
  assert.equal(backups.length, 1);
  assert.ok(readFileSync(join(t.backupDir, backups[0]), 'utf8').includes('LOCAL_ONLY=SECRET_VALUE_L'), '백업은 덮어쓰기 전 로컬 내용');
  const out = logs.join('\n') + JSON.stringify(r);
  assert.ok(!out.includes('SECRET_VALUE'), '값이 로그·결과에 들어가면 안 된다');
  assert.ok(out.includes('REMOTE_ONLY') && out.includes('LOCAL_ONLY'), '키 이름은 남긴다');
});

test('syncSecrets: .env 같은 키 다른 값은 더 최근 파일 값이 양쪽에 남는다', async () => {
  const t = secretsSetup();
  writeFileSync(t.lpath('.env'), 'K=old-local\n');
  writeFileSync(t.rpath('.env'), 'K=new-remote\nZ=1\n');
  setTime(t.lpath('.env'), 1_000_000);
  setTime(t.rpath('.env'), 2_000_000);
  await syncSecrets({project: t.project, remoteRoot: t.remote, backupDir: t.backupDir});
  assert.equal(readFileSync(t.lpath('.env'), 'utf8'), 'K=new-remote\nZ=1\n');
  assert.equal(readFileSync(t.rpath('.env'), 'utf8'), 'K=new-remote\nZ=1\n');
});

test('syncSecrets: .env 변화가 없으면 아무것도 쓰지 않는다(수정 시각·백업·결과 그대로)', async () => {
  const t = secretsSetup();
  writeFileSync(t.lpath('.env'), 'A=1\n# c\nB=2\n');
  writeFileSync(t.rpath('.env'), 'B=2\nA=1\n'); // 순서·주석만 다르다
  setTime(t.lpath('.env'), 1_000_000);
  setTime(t.rpath('.env'), 1_000_500);
  const lBefore = statSync(t.lpath('.env')).mtimeMs;
  const rBefore = statSync(t.rpath('.env')).mtimeMs;
  const r = await syncSecrets({project: t.project, remoteRoot: t.remote, backupDir: t.backupDir});
  assert.equal(statSync(t.lpath('.env')).mtimeMs, lBefore);
  assert.equal(statSync(t.rpath('.env')).mtimeMs, rBefore);
  assert.deepEqual([r.received, r.sent, r.envReceivedKeys, r.envSentKeys, r.errors], [[], [], [], [], []]);
  assert.equal(existsSync(t.backupDir), false, '바꾼 게 없으면 백업도 없다');
});

test('syncSecrets: 한쪽에만 있는 .env·토큰은 없는 쪽으로 복사된다', async () => {
  const t = secretsSetup();
  writeFileSync(t.lpath('.env'), 'A=SECRET_VALUE_123\n');
  writeFileSync(t.rpath('.blogger-oauth-token.json'), '{"refresh_token":"SECRET_VALUE_123"}');
  const logs = [];
  const r = await syncSecrets({project: t.project, remoteRoot: t.remote, backupDir: t.backupDir, log: (m) => logs.push(m)});
  assert.equal(readFileSync(t.rpath('.env'), 'utf8'), 'A=SECRET_VALUE_123\n');
  assert.equal(readFileSync(t.lpath('.blogger-oauth-token.json'), 'utf8'), '{"refresh_token":"SECRET_VALUE_123"}');
  assert.deepEqual(r.sent, ['.env']);
  assert.deepEqual(r.received, ['.blogger-oauth-token.json']);
  assert.ok(!(logs.join('\n') + JSON.stringify(r)).includes('SECRET_VALUE'));
});

test('syncSecrets: 토큰은 더 새로운 쪽이 이기고, 로컬을 덮어쓰기 전에 백업한다', async () => {
  const t = secretsSetup();
  writeFileSync(t.lpath('.youtube-oauth-token.json'), '{"v":"local-old"}');
  writeFileSync(t.rpath('.youtube-oauth-token.json'), '{"v":"remote-new"}');
  writeFileSync(t.lpath('.blogger-oauth-token.json'), '{"v":"local-new"}');
  writeFileSync(t.rpath('.blogger-oauth-token.json'), '{"v":"remote-old"}');
  setTime(t.lpath('.youtube-oauth-token.json'), 1_000_000);
  setTime(t.rpath('.youtube-oauth-token.json'), 2_000_000);
  setTime(t.lpath('.blogger-oauth-token.json'), 2_000_000);
  setTime(t.rpath('.blogger-oauth-token.json'), 1_000_000);
  const r = await syncSecrets({project: t.project, remoteRoot: t.remote, backupDir: t.backupDir});
  assert.equal(readFileSync(t.lpath('.youtube-oauth-token.json'), 'utf8'), '{"v":"remote-new"}');
  assert.equal(readFileSync(t.rpath('.blogger-oauth-token.json'), 'utf8'), '{"v":"local-new"}');
  assert.deepEqual(r.received, ['.youtube-oauth-token.json']);
  assert.deepEqual(r.sent, ['.blogger-oauth-token.json']);
  const backups = readdirSync(t.backupDir);
  assert.equal(backups.length, 1);
  assert.ok(backups[0].startsWith('.youtube-oauth-token.json.'));
  assert.equal(readFileSync(join(t.backupDir, backups[0]), 'utf8'), '{"v":"local-old"}');
});

test('syncSecrets: 깨진 JSON 토큰은 더 새로워도 복사하지 않고 알린다(값은 안 나온다)', async () => {
  const t = secretsSetup();
  writeFileSync(t.lpath('.youtube-oauth-token.json'), '{"v":"local-good"}');
  writeFileSync(t.rpath('.youtube-oauth-token.json'), '{"v":"SECRET_VALUE_123", broken');
  setTime(t.lpath('.youtube-oauth-token.json'), 1_000_000);
  setTime(t.rpath('.youtube-oauth-token.json'), 2_000_000);
  writeFileSync(t.rpath('.blogger-oauth-token.json'), '{{SECRET_VALUE_123'); // 로컬에 없는 쪽도 깨졌으면 복사 안 함
  const logs = [];
  const r = await syncSecrets({project: t.project, remoteRoot: t.remote, backupDir: t.backupDir, log: (m) => logs.push(m)});
  assert.equal(readFileSync(t.lpath('.youtube-oauth-token.json'), 'utf8'), '{"v":"local-good"}');
  assert.equal(existsSync(t.lpath('.blogger-oauth-token.json')), false);
  assert.deepEqual(r.skippedInvalid.sort(), ['.blogger-oauth-token.json', '.youtube-oauth-token.json']);
  assert.deepEqual(r.received, []);
  assert.ok(!(logs.join('\n') + JSON.stringify(r)).includes('SECRET_VALUE'));
});

test('syncSecrets: 백업은 파일마다 최근 5개만 남긴다', async () => {
  const t = secretsSetup();
  mkdirSync(t.backupDir, {recursive: true});
  for (let i = 1; i <= 6; i++) writeFileSync(join(t.backupDir, `.youtube-oauth-token.json.2026-01-0${i}T00-00-00-000Z`), '{}');
  writeFileSync(t.lpath('.youtube-oauth-token.json'), '{"v":"old"}');
  writeFileSync(t.rpath('.youtube-oauth-token.json'), '{"v":"new"}');
  setTime(t.lpath('.youtube-oauth-token.json'), 1_000_000);
  setTime(t.rpath('.youtube-oauth-token.json'), 2_000_000);
  await syncSecrets({project: t.project, remoteRoot: t.remote, backupDir: t.backupDir});
  const left = readdirSync(t.backupDir).filter((f) => f.startsWith('.youtube-oauth-token.json.'));
  assert.equal(left.length, 5);
  assert.ok(!left.includes('.youtube-oauth-token.json.2026-01-01T00-00-00-000Z'), '가장 오래된 것부터 지운다');
});
