// 제작 중간 자동 안전 관문(scripts/production-gate.mjs), 비교 시트 승인 잠금(transform-sheet.mjs),
// 안티그래비티(.agents/hooks.json)·클로드 코드(.claude/settings.json) 공통 훅 검증 테스트 (2026-11-24).
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {
  ALLOW_BANNED_TERMS,
  ALLOW_RENDER_GATE,
  ALLOW_VOICE_GATE,
  runTasteCheck,
  checkBgmDucking,
  checkRenderGate,
  checkShortsTopHook,
  checkVoiceGate,
  findProjectDirFromOutput,
  findSmallFonts,
  isVoiceCommand,
  parseHookInput,
  runHook,
} from '../production-gate.mjs';
import {ROW_KEYS, approveSheet, classifySheetProblems} from '../transform-sheet.mjs';
import {renderTransformSheetPage} from '../outlier-report-view.mjs';
import {generateAiStudioSpeech} from '../generate-aistudio-speech.mjs';
import {runHook as runSyncRenderHook} from '../sync-render-to-package.mjs';

// makeValidSheet은 일부러 1판(최소 형식) 시트다. "새 시트는 4판" 검사(2026-11-27 재검수)에는 4판 전 시트로 알려 준다.
const PRE_V4_FIXTURE = ['ep36-shorts-sample'];

const makeValidSheet = (overrides = {}) => {
  const row = (key, extra = {}) => ({key, competitor: {text: '경쟁'}, ours: {text: '우리'}, why: '바꾼 이유', ...extra});
  return {
    schemaVersion: 1,
    sourceVideoId: 'AAAAAAAAAAA',
    episodeId: 'ep36-shorts-sample',
    status: 'draft',
    format: 'SHORTS',
    topic: '테스트 소재',
    identityShare: {ours: 40, competitor: 60, reason: '초기 시험 근거'},
    rows: ROW_KEYS.map((k) => {
      if (k === 'title') return row(k, {ours: {text: '제목', titles: ['후보 제목 1']}});
      if (k === 'thumbnail') return row(k, {ours: {text: '썸네일', image: 'images/x/t1.png'}});
      if (k === 'visual') return row(k, {ours: {text: '화면', cutPlan: {durationSeconds: 40, times: [0, 2, 5.5, 9, 14, 17, 21, 27]}}});
      return row(k);
    }),
    borrowed: [{fromVideoId: 'BBBBBBBBBBB', what: '훅 구조', reason: '시선 고정', evidence: '표본 1편(가설)'}],
    rejected: [{fromVideoId: 'CCCCCCCCCCC', what: '전문 설명', reason: '어려워서 제외'}],
    titlePicks: ['후보 제목 1'],
    thumbnailPicks: ['images/x/t1.png'],
    ...overrides,
  };
};

const makeTempWorkspace = ({slug = 'ep36-shorts-sample', files = {}, sheet = null} = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'prod-gate-'));
  const projectDir = join(root, 'videos', slug);
  const sheetsDir = join(root, 'data', 'youtube', 'transform-sheets');
  mkdirSync(projectDir, {recursive: true});
  mkdirSync(sheetsDir, {recursive: true});
  for (const [rel, content] of Object.entries(files)) {
    const full = join(projectDir, rel);
    mkdirSync(dirname(full), {recursive: true});
    writeFileSync(full, content, 'utf8');
  }
  if (sheet) {
    writeFileSync(join(sheetsDir, `${slug}.json`), JSON.stringify(sheet, null, 2), 'utf8');
  }
  return {root, projectDir, sheetsDir};
};

const LONG_FACT_CHECK = '# 팩트 체크\n\n' + 'Cambridge Dictionary 기준 발음과 예문을 모두 확인했습니다. '.repeat(4);

test('classifySheetProblems & approveSheet: 1층 차단 항목이 있으면 승인을 막고, 2~3층 참고 경고만 있으면 승인한다', () => {
  const broken = makeValidSheet({borrowed: []});
  const clsBroken = classifySheetProblems(broken, {imageExists: () => true});
  assert.ok(clsBroken.blockers.length > 0);
  assert.throws(() => approveSheet(broken, {imageExists: () => true}), /비교 시트 승인 차단/);

  // 컷 간격이 완전히 일정해도(2~3층 참고 경고) 승인은 가능하다.
  const evenCuts = makeValidSheet();
  evenCuts.rows = evenCuts.rows.map((r) => (r.key === 'visual'
    ? {...r, ours: {text: '화면', cutPlan: {durationSeconds: 30, times: [0, 5, 10, 15, 20, 25]}}}
    : r));
  const clsEven = classifySheetProblems(evenCuts, {imageExists: () => true, preV4Sheets: PRE_V4_FIXTURE});
  assert.equal(clsEven.blockers.length, 0);
  assert.ok(clsEven.warnings.some((w) => w.includes('컷 간격이 거의 일정하다')));
  const approved = approveSheet(evenCuts, {imageExists: () => true, preV4Sheets: PRE_V4_FIXTURE});
  assert.equal(approved.sheet.status, 'approved');
  assert.ok(approved.sheet.approvedAt);
  assert.ok(approved.warnings.length >= 1);

  // 제목·썸네일 후보가 있는데 고르지 않았으면 승인을 막는다.
  const noPicks = makeValidSheet({titlePicks: [], thumbnailPicks: []});
  assert.throws(() => approveSheet(noPicks, {imageExists: () => true, preV4Sheets: PRE_V4_FIXTURE}), /제목 후보|썸네일 시안/);
});

test('새 비교 시트는 4판이어야 한다: 판 번호를 빼거나 낮추면 승인 화면·승인·음성 관문이 모두 막는다 [2026-11-27 재검수: 4판 잠금이 통째로 꺼졌다]', () => {
  for (const schemaVersion of [undefined, 1, 3, '3']) {
    const s = makeValidSheet({schemaVersion});
    const cls = classifySheetProblems(s, {imageExists: () => true});
    assert.ok(cls.blockers.some((b) => b.includes('4판(schemaVersion 4)')), `판 번호 ${JSON.stringify(schemaVersion)}`);
    assert.throws(() => approveSheet(s, {imageExists: () => true}), (err) => err.blockers.some((b) => b.includes('4판(schemaVersion 4)')));
  }
  // 4판 전에 있던 시트(이름 목록)는 그대로 둔다
  assert.equal(classifySheetProblems(makeValidSheet({episodeId: undefined, sourceVideoId: 'SbQVBQoRciA'}), {imageExists: () => true}).blockers.some((b) => b.includes('4판(schemaVersion 4)')), false);

  // 손으로 status를 approved로 바꾼 3판 시트도 음성 관문에서 막힌다
  const w = makeTempWorkspace({
    files: {'FACT-CHECK.md': LONG_FACT_CHECK, 'SCRIPT.md': '```text\n오늘 단어를 세 글자로 줄여서 들어 보세요.\n```'},
    sheet: makeValidSheet({status: 'approved', schemaVersion: 3}),
  });
  try {
    const r = checkVoiceGate({projectDir: w.projectDir, text: '세 글자로 줄여서 들어 보세요.', sheetsRoot: w.sheetsDir, imageExists: () => true, skipSlop: true});
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('4판(schemaVersion 4)')), r.blockers.join('; '));
  } finally { rmSync(w.root, {recursive: true, force: true}); }
});

test('renderTransformSheetPage: 차단 항목과 참고 경고를 분리하고 승인 버튼 잠금 상태를 표시한다', () => {
  const s = makeValidSheet();
  const lockedHtml = renderTransformSheetPage(s, null, [], {blockers: ['금지어 발견'], warnings: ['컷 간격 일정']});
  assert.match(lockedHtml, /\[승인 차단\] 금지어 발견/);
  assert.match(lockedHtml, /\[참고 경고 · 승인 가능\] 컷 간격 일정/);
  assert.match(lockedHtml, /id="btn-approve-sheet"[^>]*disabled/);

  const unlockedHtml = renderTransformSheetPage(s, null, [], {blockers: [], warnings: ['컷 간격 일정']});
  assert.match(unlockedHtml, /이 비교 시트 승인하기/);
  assert.doesNotMatch(unlockedHtml, /id="btn-approve-sheet"[^>]*disabled/);
});

test('문턱 1(음성 직전): FACT-CHECK 누락, 미승인 시트, 금지어, 아라비아 숫자 입말을 모두 차단한다', () => {
  // 1) FACT-CHECK.md 없음 + 시트 없음
  const w1 = makeTempWorkspace({files: {'SCRIPT.md': '```text\n안녕하세요.\n```'}});
  try {
    const r = checkVoiceGate({projectDir: w1.projectDir, sheetsRoot: w1.sheetsDir, skipSlop: true});
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('FACT-CHECK.md')));
    assert.ok(r.blockers.some((b) => b.includes('비교 시트')));
  } finally { rmSync(w1.root, {recursive: true, force: true}); }

  // 2) 시트가 draft 상태면 차단
  const w2 = makeTempWorkspace({
    files: {'FACT-CHECK.md': LONG_FACT_CHECK, 'SCRIPT.md': '```text\n오늘 단어를 같이 들어 볼까요?\n```'},
    sheet: makeValidSheet({status: 'draft'}),
  });
  try {
    const r = checkVoiceGate({projectDir: w2.projectDir, sheetsRoot: w2.sheetsDir, imageExists: () => true, skipSlop: true, preV4Sheets: PRE_V4_FIXTURE});
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes("'draft'")));
  } finally { rmSync(w2.root, {recursive: true, force: true}); }

  // 3) 승인 시트 + FACT-CHECK + 자연스러운 대본이면 통과
  const w3 = makeTempWorkspace({
    files: {'FACT-CHECK.md': LONG_FACT_CHECK, 'SCRIPT.md': '```text\n오늘 단어를 세 글자로 줄여서 들어 보세요.\n```'},
    sheet: makeValidSheet({status: 'approved'}),
  });
  try {
    const okRes = checkVoiceGate({projectDir: w3.projectDir, text: '세 글자로 줄여서 들어 보세요.', sheetsRoot: w3.sheetsDir, imageExists: () => true, skipSlop: true, preV4Sheets: PRE_V4_FIXTURE});
    assert.equal(okRes.ok, true, okRes.blockers.join('; '));

    // 입력 문장에 금지어나 아라비아 숫자 입말이 있으면 차단
    const badText = checkVoiceGate({projectDir: w3.projectDir, text: '유성음이라서 4글자로 읽습니다.', sheetsRoot: w3.sheetsDir, imageExists: () => true, skipSlop: true, preV4Sheets: PRE_V4_FIXTURE});
    assert.equal(badText.ok, false);
    assert.ok(badText.blockers.some((b) => b.includes('금지어')));
    assert.ok(badText.blockers.some((b) => b.includes('아라비아 숫자 입말')));
  } finally { rmSync(w3.root, {recursive: true, force: true}); }
});

test('generateAiStudioSpeech 내부 내장 관문: FACT-CHECK 없는 videos/ 폴더 출력은 브라우저를 열기 전에 즉시 차단한다', async () => {
  const w = makeTempWorkspace({slug: 'ep37-shorts-no-fact'});
  try {
    await assert.rejects(
      () => generateAiStudioSpeech({text: '안녕하세요.', output: join(w.projectDir, 'assets', 'voice', 'n01.wav')}),
      /음성 제작 안전 관문 차단/,
    );
  } finally { rmSync(w.root, {recursive: true, force: true}); }
});

test('문턱 2(렌더링 직전): 34px 미만 글자, 배경음 더킹 누락, 금지어, 빈 쇼츠 화면을 차단한다', async () => {
  assert.equal(findSmallFonts('<style>.a{font-size:28px}.b{font-size:48px}</style>').length, 1);
  assert.equal(findSmallFonts('<style>.a{font-size:28px /* allow-small-font: 예외 */}</style>').length, 0);
  assert.ok(checkBgmDucking('<audio id="v1" data-audio-group="voiceover"></audio><audio id="bgm" src="assets/bgm/t.mp3"></audio>'));
  assert.equal(checkBgmDucking('<audio id="v1" data-audio-group="voiceover"></audio><audio id="bgm" src="assets/bgm/t.mp3" data-fx-carve="{}"></audio>'), null);
  assert.ok(checkShortsTopHook('<div data-width="1080" data-height="1920"><body><div></div></body></div>'));

  const wBad = makeTempWorkspace({
    files: {
      'hyperframes.json': '{}',
      'FACT-CHECK.md': LONG_FACT_CHECK,
      'index.html': '<html><style>.sub{font-size:24px}</style><body><div data-width="1080" data-height="1920">유성음 6회 드릴</div><audio id="v1" data-audio-group="voiceover"></audio><audio id="bgm" src="assets/bgm/a.mp3"></audio></body></html>',
    },
  });
  try {
    const res = await checkRenderGate({projectDir: wBad.projectDir, runLayoutCheck: false});
    assert.equal(res.ok, false);
    assert.ok(res.blockers.some((b) => b.includes('금지어')));
    assert.ok(res.blockers.some((b) => b.includes('34px 미만')));
    assert.ok(res.blockers.some((b) => b.includes('더킹')));
  } finally { rmSync(wBad.root, {recursive: true, force: true}); }

  const wGood = makeTempWorkspace({
    files: {
      'hyperframes.json': '{}',
      'FACT-CHECK.md': LONG_FACT_CHECK,
      'index.html': '<html><style>.sub{font-size:48px}</style><body><div data-width="1080" data-height="1920">영어 발음 핵심 훅</div><audio id="v1" data-audio-group="voiceover"></audio><audio id="bgm" src="assets/bgm/a.mp3" data-fx-carve="{}"></audio></body></html>',
    },
  });
  try {
    const res = await checkRenderGate({
      projectDir: wGood.projectDir,
      runLayoutCheck: true,
      layoutChecker: async () => ({times: [0.5], issues: []}),
    });
    assert.equal(res.ok, true, res.blockers.join('; '));

    // 레이아웃 검사기가 깨짐을 잡으면 렌더링 차단
    const resLayoutFail = await checkRenderGate({
      projectDir: wGood.projectDir,
      runLayoutCheck: true,
      layoutChecker: async () => ({times: [0.5], issues: [{time: 0.5, kind: 'text-overflow', text: '넘침'}]}),
    });
    assert.equal(resLayoutFail.ok, false);
    assert.ok(resLayoutFail.blockers.some((b) => b.includes('화면 글자 깨짐')));
  } finally { rmSync(wGood.root, {recursive: true, force: true}); }
});

test('양쪽 AI 훅 규격(안티그래비티 JSON decision & 클로드 코드 exit 2)이 동일하게 차단·허용한다', async () => {
  const w = makeTempWorkspace({
    files: {
      'hyperframes.json': '{}',
      'index.html': '<html><style>.a{font-size:20px}</style><body><div>테스트</div></body></html>',
    },
  });
  try {
    assert.equal(isVoiceCommand('node scripts/generate-aistudio-speech.mjs --output videos/ep36/a.wav'), true);
    assert.equal(findProjectDirFromOutput('videos/ep36-shorts-sample/assets/voice/n01.wav', w.root), w.projectDir);

    // 1) 안티그래비티 PreToolUse 차단: exit 0 + JSON { decision: "deny", reason }
    const agyOut = [];
    const agyPayload = JSON.stringify({
      hookEventName: 'PreToolUse',
      cwd: w.root,
      toolCall: {id: 't1', name: 'run_command', args: {CommandLine: `npx hyperframes render videos/ep36-shorts-sample`}},
    });
    assert.equal(parseHookInput(agyPayload).format, 'antigravity');
    const agyCode = await runHook(agyPayload, {sheetsRoot: w.sheetsDir, runLayoutCheck: false, out: (s) => agyOut.push(s)});
    assert.equal(agyCode, 0);
    const agyJson = JSON.parse(agyOut[0]);
    assert.equal(agyJson.decision, 'deny');
    assert.match(agyJson.reason, /34px 미만/);

    // 2) 클로드 코드 PreToolUse 차단: exit 2 + stderr 메시지
    const claudeErr = [];
    const claudePayload = JSON.stringify({
      tool_name: 'Bash',
      cwd: w.root,
      tool_input: {command: `npx hyperframes render videos/ep36-shorts-sample`},
    });
    const claudeCode = await runHook(claudePayload, {sheetsRoot: w.sheetsDir, runLayoutCheck: false, errOut: (s) => claudeErr.push(s)});
    assert.equal(claudeCode, 2);
    assert.match(claudeErr[0], /34px 미만/);

    // 3) 무관한 명령은 양쪽 모두 즉시 허용
    const agyAllowOut = [];
    await runHook(JSON.stringify({hookEventName: 'PreToolUse', cwd: w.root, toolCall: {name: 'run_command', args: {CommandLine: 'git status'}}}), {out: (s) => agyAllowOut.push(s)});
    assert.equal(JSON.parse(agyAllowOut[0]).decision, 'allow');

    // 4) 명시적 예외 표시(ALLOW_RENDER_GATE=1 / ALLOW_VOICE_GATE=1)는 통과
    const bypassOut = [];
    await runHook(JSON.stringify({hookEventName: 'PreToolUse', cwd: w.root, toolCall: {name: 'run_command', args: {CommandLine: `${ALLOW_RENDER_GATE}=1 npx hyperframes render videos/ep36-shorts-sample`}}}), {out: (s) => bypassOut.push(s)});
    assert.equal(JSON.parse(bypassOut[0]).decision, 'allow');
    const bypassVoice = [];
    await runHook(JSON.stringify({hookEventName: 'PreToolUse', cwd: w.root, toolCall: {name: 'run_command', args: {CommandLine: `${ALLOW_VOICE_GATE}=1 node scripts/generate-aistudio-speech.mjs --text "안녕" --output videos/ep36-shorts-sample/a.wav`}}}), {out: (s) => bypassVoice.push(s)});
    assert.equal(JSON.parse(bypassVoice[0]).decision, 'allow');

    // 5) 금지어 예외 표시(ALLOW_BANNED_TERMS)는 금지어 검사만 건너뛴다 — 34px 위반은 그대로 막는다 [2026-11-27 재검수: 렌더 관문 전체가 꺼졌다]
    const bannedOnlyOut = [];
    await runHook(JSON.stringify({hookEventName: 'PreToolUse', cwd: w.root, toolCall: {name: 'run_command', args: {CommandLine: `${ALLOW_BANNED_TERMS}=1 npx hyperframes render videos/ep36-shorts-sample`}}}), {sheetsRoot: w.sheetsDir, runLayoutCheck: false, out: (s) => bannedOnlyOut.push(s)});
    const bannedOnly = JSON.parse(bannedOnlyOut[0]);
    assert.equal(bannedOnly.decision, 'deny');
    assert.match(bannedOnly.reason, /34px 미만/);
    // 음성 명령에 붙인 금지어 예외 표시는 음성 관문을 건너뛰게 하지 않는다(렌더 전용 표시)
    const voiceBannedOut = [];
    await runHook(JSON.stringify({hookEventName: 'PreToolUse', cwd: w.root, toolCall: {name: 'run_command', args: {CommandLine: `${ALLOW_BANNED_TERMS}=1 node scripts/generate-aistudio-speech.mjs --text "안녕" --output videos/ep36-shorts-sample/a.wav`}}}), {sheetsRoot: w.sheetsDir, skipSlop: true, out: (s) => voiceBannedOut.push(s)});
    assert.equal(JSON.parse(voiceBannedOut[0]).decision, 'deny');
  } finally { rmSync(w.root, {recursive: true, force: true}); }
});

test('렌더 관문: 금지어 예외(skipBannedTerms)는 금지어 검사 하나만 건너뛴다 [2026-11-27 재검수]', async () => {
  const w = makeTempWorkspace({files: {
    'hyperframes.json': '{}',
    'FACT-CHECK.md': LONG_FACT_CHECK,
    'index.html': '<html><style>.a{font-size:40px}</style><body><div class="a">드릴 연습</div></body></html>',
  }});
  try {
    const normal = await checkRenderGate({projectDir: w.projectDir, runLayoutCheck: false});
    assert.ok(normal.blockers.some((b) => b.startsWith('금지어')), normal.blockers.join('; '));
    const skipped = await checkRenderGate({projectDir: w.projectDir, runLayoutCheck: false, skipBannedTerms: true});
    assert.ok(!skipped.blockers.some((b) => b.startsWith('금지어')), skipped.blockers.join('; '));
    assert.ok(skipped.notes.some((n) => n.includes('금지어 검사는 사용자 예외')));
  } finally { rmSync(w.root, {recursive: true, force: true}); }
});

test('음성 관문: 대표님 취향 검사는 참고 경고로만 돌고(막지 않음), 취향 파일이 없는 PC는 안내만 남긴다 [2026-11-27 재검수]', () => {
  const dir = mkdtempSync(join(tmpdir(), 'taste-'));
  try {
    const script = join(dir, 'SCRIPT.md');
    writeFileSync(script, '첫째, 스트레스.');
    const tasteFile = join(dir, 'writing-taste.md');
    writeFileSync(tasteFile, '# 취향');
    const tasteScript = join(dir, 'check_taste.py');
    writeFileSync(tasteScript, '# 시험용 자리');
    const none = runTasteCheck(script, {tasteFile: join(dir, 'none.md'), tasteScript, run: () => { throw new Error('부르면 안 된다'); }});
    assert.deepEqual(none.warnings, []);
    assert.match(none.note, /취향 파일이 없어/);
    const pass = runTasteCheck(script, {tasteFile, tasteScript, run: () => ''});
    assert.deepEqual(pass.warnings, []);
    assert.match(pass.note, /통과/);
    const found = Object.assign(new Error('exit 1'), {stdout: `${script}:3:1  [W-02 규칙] 번호를 매겨 나열하지 않는다  "첫째, 스트레스."\n규칙 1 · 경향 0`});
    const hit = runTasteCheck(script, {tasteFile, tasteScript, run: () => { throw found; }});
    assert.equal(hit.warnings.length, 1);
    assert.match(hit.warnings[0], /^대표님 취향\(참고\): 줄 3 \[W-02/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('음성 관문: 승인된 옛 시트를 복사해 새 폴더 이름으로 두고 안 이름을 안 바꾸면 막는다 [2026-11-27 재검수: 잠금 3개가 꺼지고 승인 상태째 지나갔다]', () => {
  const w = makeTempWorkspace({
    slug: 'ep38-copied-sheet',
    files: {'FACT-CHECK.md': LONG_FACT_CHECK, 'SCRIPT.md': '```text\n오늘 단어를 세 글자로 줄여서 들어 보세요.\n```'},
    sheet: makeValidSheet({status: 'approved', episodeId: 'ep35-shorts-ghost-letters'}),
  });
  try {
    const r = checkVoiceGate({projectDir: w.projectDir, text: '세 글자로 줄여서 들어 보세요.', sheetsRoot: w.sheetsDir, imageExists: () => true, skipSlop: true});
    assert.equal(r.ok, false);
    assert.ok(r.blockers.some((b) => b.includes('시트 파일 이름(ep38-copied-sheet)') && b.includes('ep35-shorts-ghost-letters')), r.blockers.join('; '));
  } finally { rmSync(w.root, {recursive: true, force: true}); }
});

test('안티그래비티(.agents/hooks.json)와 클로드 코드(.claude/settings.json) 모두 production-gate와 sync-render를 연결한다', () => {
  const agy = JSON.parse(readFileSync(new URL('../../.agents/hooks.json', import.meta.url), 'utf8'));
  const claude = JSON.parse(readFileSync(new URL('../../.claude/settings.json', import.meta.url), 'utf8'));
  assert.match(agy['production-gate'].PreToolUse[0].hooks[0].command, /production-gate\.mjs --hook/);
  assert.equal(agy['production-gate'].PreToolUse[0].matcher, 'run_command');
  assert.match(agy['sync-render-to-package'].PostToolUse[0].hooks[0].command, /sync-render-to-package\.mjs --hook/);
  assert.ok(claude.hooks.PreToolUse.some((g) => g.hooks.some((h) => h.command.includes('production-gate.mjs'))));
  assert.ok(claude.hooks.PostToolUse.some((g) => g.hooks.some((h) => h.command.includes('sync-render-to-package.mjs'))));

  // sync-render-to-package 훅이 안티그래비티 PostToolUse 페이로드에서 오류 없이 동작한다
  const code = runSyncRenderHook(JSON.stringify({hookEventName: 'PostToolUse', toolCall: {name: 'run_command', args: {CommandLine: 'git status'}}}));
  assert.equal(code, 0);
});
