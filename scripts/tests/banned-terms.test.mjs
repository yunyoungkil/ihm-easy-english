// 렌더링 전 금지어 검사. 2026-11-06 점검에서 EP24~29 영상 안에 금지어가 남아 있는 것을 렌더링 뒤에야 발견해서 추가했다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {findBannedTerms} from '../banned-terms.mjs';
import {findRenderProject, maskInvisible, scanProject} from '../check-banned-terms.mjs';

const makeProject = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'hf-project-'));
  for (const [name, content] of Object.entries({'hyperframes.json': '{}', ...files})) {
    mkdirSync(dirname(join(dir, name)), {recursive: true});
    writeFileSync(join(dir, name), content);
  }
  return dir;
};

const runHook = (command, cwd) =>
  spawnSync(process.execPath, ['scripts/check-banned-terms.mjs', '--hook'], {
    input: JSON.stringify({tool_name: 'Bash', tool_input: {command}, cwd}),
    encoding: 'utf8',
  });

for (const text of [
  '촛불 입술 모으기 vs 멍때리기 6회 드릴',
  '남녀 원어민 3회 반복 듣기 드릴',
  '영어 드릴',
  '드릴 1: 단모음',
  '조음 물리법칙',
  '[s] 무성음 (떨림 0%)',
  '[z] 유성음 (떨림 100%)',
  '[ɪz] 쿠션 모음 (+1음절)',
  '치찰음 뒤',
  '성대 진동 마찰음',
  '최소대립쌍 1 / 6',
  'TENSE 긴장모음',
  'LAX 이완모음',
  'beach vs bitch',
  'VOCAL TRACT ANATOMY',
  'Retroflex / Bunched',
  'Bilabial Plosive',
  'Labiodental Fricative',
  'VOWEL ARTICULATION',
  'pool [푸 · 울]',
  '멍때리듯 턱 힘 빼기',
  '턱에 힘 빼면 끝',
  '(●●● 순차 점등)',
  '남·여 3회 교차 집중 듣기',
  '남·여 교차 6회 반복',
  'TTS 3회',
]) {
  test(`금지어를 잡는다: ${text}`, () => {
    assert.notEqual(findBannedTerms(text).length, 0);
  });
}

for (const text of [
  '남녀 목소리로 세 번씩 들려드릴 테니까',
  '오늘 내용을 정리해 드릴게요',
  '알려 드릴 수 있습니다',
  '보여 드릴 단어입니다',
  '<span class="hl-tense">',
  'please relax',
  '혀 꼬임 방지 쿠션',
  'cof · fee [커피]',
  'sheep [쉽]',
  '입꼬리 당김 vs 힘 뺌',
  '성대 떨림 100% vs 0%',
  '소리 팁',
  '윗니 0% vs 100%',
]) {
  test(`금지어가 아닌 말은 넘긴다: ${text}`, () => {
    assert.deepEqual(findBannedTerms(text), []);
  });
}

test('찾은 글자를 원래 표기 그대로 돌려준다', () => {
  assert.deepEqual(findBannedTerms('beach vs Bitch').map((hit) => hit.term), ['Bitch']);
});

test('화면에 보이는 글자만 남기고 줄 번호는 유지한다', () => {
  const html = [
    '<!-- 6회 드릴 주석 -->',
    '<title>조음</title>',
    '<style>.a { content: "유성음"; }</style>',
    '<div class="drill" data-note="무성음">치찰음</div>',
    '<script>',
    '// 파열음 코드 주석',
    'const label = "최소대립쌍 " + idx; // 긴장모음',
    '</script>',
  ].join('\n');
  const masked = maskInvisible(html);
  assert.equal(masked.split('\n').length, 8);
  assert.deepEqual(findBannedTerms(masked).map((hit) => hit.term), ['치찰음', '최소대립']);
  assert.match(masked.split('\n')[3], /치찰음/);
  assert.match(masked.split('\n')[6], /최소대립/);
});

test('프레임 글자, 대본 낭독문, 그림 프롬프트에서 금지어를 찾고 줄 번호를 알려 준다', () => {
  const dir = makeProject({
    'compositions/frames/01-hook.html': '<div>\n<!-- 드릴 1 -->\n<span class="hl-tense">6회 드릴</span>\n</div>',
    'SCRIPT.md': '# 드릴 구성 메모\n\n```text\n성대가 울리는 유성음 뒤에서는\n```\n',
    'prompts/visual-prompts.md': '# 메모 Bilabial 설명\n\n```text\n/p/ SOUND (Bilabial Plosive)\n```\n',
    'index.html': '<div>소리 팁</div>',
  });
  const hits = scanProject(dir).map((hit) => `${hit.file.replaceAll('\\', '/')}:${hit.line}:${hit.term}`);
  rmSync(dir, {recursive: true, force: true});
  assert.deepEqual(hits.sort(), [
    'SCRIPT.md:4:유성음',
    'compositions/frames/01-hook.html:3:드릴',
    'prompts/visual-prompts.md:4:Bilabial',
    'prompts/visual-prompts.md:4:Plosive',
  ]);
});

test('글자 블록이 없는 대본은 파일 전체를 검사한다', () => {
  const dir = makeProject({'SCRIPT.md': '나레이션: 조음 원리를 봅니다\n'});
  const hits = scanProject(dir).map((hit) => hit.term);
  rmSync(dir, {recursive: true, force: true});
  assert.deepEqual(hits, ['조음']);
});

test('렌더 명령에서 프로젝트 폴더를 찾는다', () => {
  const root = mkdtempSync(join(tmpdir(), 'hf-root-'));
  const project = join(root, 'videos', 'ep99');
  mkdirSync(project, {recursive: true});
  writeFileSync(join(project, 'hyperframes.json'), '{}');
  for (const command of [
    'npx hyperframes render videos/ep99',
    'npx hyperframes render "videos/ep99" --quality high',
    'npx hyperframes render --output=a.mp4 videos/ep99',
    'npx hyperframes render --output a.mp4 videos/ep99',
    'hyperframes render videos/ep99',
    'cd videos/ep99 && npx hyperframes render',
    "$env:A='1'; npx hyperframes render videos/ep99",
    'FOO=1 npx hyperframes render videos/ep99',
    'npm test && npx hyperframes@0.8.29 render videos/ep99',
  ]) {
    assert.equal(findRenderProject(command, root), project, command);
  }
  assert.equal(findRenderProject('npx hyperframes render', project), project);
  rmSync(root, {recursive: true, force: true});
});

test('Git Bash 형식의 작업 폴더에서도 프로젝트를 찾는다', {skip: process.platform !== 'win32'}, () => {
  const root = mkdtempSync(join(tmpdir(), 'hf-root-'));
  const project = join(root, 'videos', 'ep99');
  mkdirSync(project, {recursive: true});
  writeFileSync(join(project, 'hyperframes.json'), '{}');
  const gitBashRoot = root.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
  assert.equal(findRenderProject('npx hyperframes render videos/ep99', gitBashRoot), project);
  rmSync(root, {recursive: true, force: true});
});

test('렌더가 아닌 명령은 렌더로 보지 않는다', () => {
  const root = mkdtempSync(join(tmpdir(), 'hf-root-'));
  const project = join(root, 'videos', 'ep99');
  mkdirSync(project, {recursive: true});
  writeFileSync(join(project, 'hyperframes.json'), '{}');
  for (const command of [
    'grep -n "hyperframes render" videos/ep99/TASKS.md',
    'echo npx hyperframes render videos/ep99',
    'npx hyperframes check videos/ep99',
    'git log --grep="hyperframes render"',
    'ls videos/ep99',
  ]) {
    assert.equal(findRenderProject(command, root), null, command);
  }
  rmSync(root, {recursive: true, force: true});
});

test('훅: 금지어가 있으면 렌더를 막고 위치를 알려 준다', () => {
  const dir = makeProject({'compositions/frames/02.html': '<div>[z] 유성음</div>'});
  const result = runHook('npx hyperframes render .', dir);
  rmSync(dir, {recursive: true, force: true});
  assert.equal(result.status, 2);
  assert.match(result.stderr, /유성음/);
  assert.match(result.stderr, /compositions[\\/]frames[\\/]02\.html:1/);
});

test('훅: 금지어가 없으면 렌더를 막지 않는다', () => {
  const dir = makeProject({'compositions/frames/02.html': '<div>성대 떨림 100%</div>'});
  const result = runHook('npx hyperframes render .', dir);
  rmSync(dir, {recursive: true, force: true});
  assert.equal(result.status, 0);
});

test('훅: 사용자가 승인해 ALLOW_BANNED_TERMS를 붙이면 막지 않는다', () => {
  const dir = makeProject({'compositions/frames/02.html': '<div>[z] 유성음</div>'});
  const result = runHook('ALLOW_BANNED_TERMS=1 npx hyperframes render .', dir);
  rmSync(dir, {recursive: true, force: true});
  assert.equal(result.status, 0);
});

test('훅: 렌더가 아닌 명령은 그대로 통과한다', () => {
  const result = runHook('git status', process.cwd());
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
});

test('훅: 입력이 깨져도 다른 명령을 막지 않는다', () => {
  const result = spawnSync(process.execPath, ['scripts/check-banned-terms.mjs', '--hook'], {input: 'not json', encoding: 'utf8'});
  assert.equal(result.status, 0);
});
