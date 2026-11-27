// 2026-11-27 1차 개편 자동 잠금 4개 + 브리핑 건강 알림 단위 테스트.
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {existsSync} from 'node:fs';
import {
  AGENTS_MAX_LINES,
  EXTERNAL_SKILLS,
  MISTAKE_CAP,
  PROJECT_SKILLS,
  SKILL_MAX_LINES,
  auditGovernance,
  wikiHealthLine,
} from '../lint-knowledge.mjs';
import {BLIND_REVIEW_LEGACY_SHEETS, blindReviewProblems} from '../transform-sheet.mjs';

const LOCK_DAY = '2026-11-28T00:00:00Z';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** 시험용 저장소에 필수 스킬 6종을 양쪽에 같은 내용으로 만든다. */
const seedSkills = (root) => {
  for (const side of ['.agents', '.claude']) {
    for (const skill of PROJECT_SKILLS) {
      mkdirSync(join(root, side, 'skills', skill), {recursive: true});
      writeFileSync(join(root, side, 'skills', skill, 'SKILL.md'), `# ${skill}\n`);
    }
  }
};

test('현재 저장소 거버넌스 상태가 자동 잠금 4개 기준을 모두 통과한다', async () => {
  const report = await auditGovernance(projectDir, {now: new Date('2026-11-27T12:00:00Z')});
  assert.equal(report.ok, true, `거버넌스 실패: ${report.blocking.join(' / ')}`);
  assert.ok(report.agents.lines <= AGENTS_MAX_LINES, `AGENTS.md ${report.agents.lines}줄`);
  assert.equal(report.brokenLinks.length, 0);
  assert.equal(report.coreOrphans.length, 0);
  assert.equal(report.skillIssues.length, 0);
  assert.equal(wikiHealthLine(report), null, '정상이면 브리핑 건강 알림은 생략(null)된다');
});

test('잠금 ①②④: AGENTS.md 초과, 스킬 불일치·초과, 깨진 링크, 핵심 고아 문서를 모두 차단한다', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gov-lock-'));
  mkdirSync(join(root, 'knowledge', 'logs'), {recursive: true});
  mkdirSync(join(root, '.agents', 'skills', 'blind-review'), {recursive: true});
  mkdirSync(join(root, '.claude', 'skills', 'blind-review'), {recursive: true});

  writeFileSync(join(root, 'AGENTS.md'), Array.from({length: AGENTS_MAX_LINES + 5}, (_, i) => `line ${i}`).join('\n'));
  writeFileSync(join(root, 'knowledge', 'index.md'), '# Index\n- [깨진링크](missing.md)\n');
  writeFileSync(join(root, 'knowledge', 'unlinked-core.md'), '# Core\n');
  writeFileSync(join(root, 'knowledge', 'logs', '2026-11.md'), '# Log\n'); // 일지는 고아 제외
  writeFileSync(join(root, '.agents', 'skills', 'blind-review', 'SKILL.md'), Array.from({length: SKILL_MAX_LINES + 3}, (_, i) => `s ${i}`).join('\n'));
  writeFileSync(join(root, '.claude', 'skills', 'blind-review', 'SKILL.md'), '# different\n');

  const report = await auditGovernance(root);
  assert.equal(report.ok, false);
  assert.ok(report.blocking.some((m) => m.includes('AGENTS.md가')));
  assert.ok(report.blocking.some((m) => m.includes('깨진 링크')));
  assert.ok(report.blocking.some((m) => m.includes('unlinked-core.md')));
  assert.ok(!report.coreOrphans.includes('logs/2026-11.md'), '날짜 일지는 핵심 고아 문서로 잡지 않는다');
  assert.ok(report.blocking.some((m) => m.includes('SKILL.md가')));
  assert.ok(report.blocking.some((m) => m.includes('내용이 다르다')));
  assert.ok(wikiHealthLine(report).includes('거버넌스 이상'));
});

test('주기 정리 알림: 마지막 정리일로부터 14일 이상 지나면 브리핑 건강 줄에 정리 신호가 뜬다', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gov-cleanup-'));
  mkdirSync(join(root, 'knowledge'), {recursive: true});
  writeFileSync(join(root, 'AGENTS.md'), '# Slim\n');
  writeFileSync(join(root, 'knowledge', 'index.md'), '# Index\n');
  writeFileSync(join(root, 'knowledge', 'wiki-maintenance-state.json'), JSON.stringify({lastCleanedAt: '2026-11-01', intervalDays: 14}));
  seedSkills(root);

  const report = await auditGovernance(root, {now: new Date('2026-11-20T00:00:00Z')});
  assert.equal(report.ok, true);
  assert.equal(report.cleanup.due, true);
  assert.ok(wikiHealthLine(report).includes('지침·위키 주기 정리 도래'));
});

test('잠금 ③: 새 v4 시트는 백지 눈 5대 잣대 통과(blindReview) 없으면 차단, 잠금 전에 있던 7편만 호환 유지', () => {
  const legacyV4 = {schemaVersion: 4, episodeId: 'ep37-listen-frozen-questions', createdAt: '2026-11-25'};
  assert.deepEqual(blindReviewProblems(legacyV4), [], '잠금 전에 있던 시트는 소급 차단하지 않는다');

  assert.equal(BLIND_REVIEW_LEGACY_SHEETS.length, 7, '예외는 잠금 전에 있던 EP31~37 7편뿐');
  const newMissing = {schemaVersion: 4, episodeId: 'ep38-new', createdAt: LOCK_DAY};
  assert.ok(blindReviewProblems(newMissing).some((m) => m.includes('백지 눈 검수(blindReview)가 없다')));

  // 2026-11-27 감사에서 찾은 우회: 작성일을 비우기·빼기·다른 형식·앞당기기. 모두 막혀야 한다.
  for (const createdAt of ['', undefined, '11/28/2026', '2026-11-25', '2026-01-01']) {
    const s = {schemaVersion: 4, episodeId: 'ep38-new', createdAt};
    assert.ok(blindReviewProblems(s).length > 0, `작성일 ${JSON.stringify(createdAt)}로 잠금을 피하면 안 된다`);
  }
  assert.ok(blindReviewProblems({schemaVersion: 4}).length > 0, '이름도 날짜도 없는 새 시트도 막는다');

  const newFailed = {
    schemaVersion: 4,
    createdAt: LOCK_DAY,
    blindReview: {
      reviewedAt: '2026-11-28',
      reviewerModel: 'Gemini 4 Neon',
      reviewContext: '안티그래비티 새 대화',
      checks: {mobileTitleOk: true, thumbOneSecOk: false, synergyOk: true, openingOneMinOk: true, antiSlopVoiceOk: true},
      findings: ['썸네일 문구 수정 필요'],
      verdict: 'needs_fix',
    },
  };
  const failMsgs = blindReviewProblems(newFailed);
  assert.ok(failMsgs.some((m) => m.includes('thumbOneSecOk')));
  assert.ok(failMsgs.some((m) => m.includes('verdict')));

  const newPassed = {
    schemaVersion: 4,
    createdAt: LOCK_DAY,
    blindReview: {
      reviewedAt: '2026-11-28',
      reviewerModel: 'Gemini 4 Neon',
      reviewContext: '안티그래비티 새 대화',
      checks: {mobileTitleOk: true, thumbOneSecOk: true, synergyOk: true, openingOneMinOk: true, antiSlopVoiceOk: true},
      findings: ['5대 잣대 모두 확인 및 수정 반영'],
      verdict: 'pass',
    },
  };
  assert.deepEqual(blindReviewProblems(newPassed), []);

  // 2026-11-27 재검수: 어떻게 분리해 점검했는지(reviewContext)가 비면 통과 기록이어도 막는다(초안 대화의 자가 통과 방지).
  for (const reviewContext of [undefined, '', '  ']) {
    const selfPass = structuredClone(newPassed);
    selfPass.blindReview.reviewContext = reviewContext;
    assert.ok(blindReviewProblems(selfPass).some((m) => m.includes('reviewContext')), `reviewContext ${JSON.stringify(reviewContext)}`);
  }
});

test('프로젝트 전용 스킬 6종이 .agents/skills와 .claude/skills 양쪽에 실제 파일로 있다 [2026-11-27 감사: 이름 목록만 보던 테스트]', () => {
  assert.equal(PROJECT_SKILLS.length, 6);
  for (const skill of PROJECT_SKILLS) {
    for (const side of ['.agents', '.claude']) {
      assert.ok(existsSync(join(projectDir, side, 'skills', skill, 'SKILL.md')), `${side}/skills/${skill}/SKILL.md가 없다`);
    }
  }
});

test('잠금 ②④ 보강: 한쪽에만 있는 새 스킬, 양쪽에서 다 지운 필수 스킬, 일지에서만 이어진 핵심 문서, 규칙·스킬 안 깨진 링크, 실수 정원 초과를 막는다 [2026-11-27 감사]', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gov-lock2-'));
  mkdirSync(join(root, 'knowledge', 'logs'), {recursive: true});
  seedSkills(root);
  // 필수 스킬 하나를 양쪽에서 모두 지운 상태
  for (const side of ['.agents', '.claude']) writeFileSync(join(root, side, 'skills', 'publish-wrapup', 'SKILL.md'), '');
  const {rmSync} = await import('node:fs');
  for (const side of ['.agents', '.claude']) rmSync(join(root, side, 'skills', 'publish-wrapup'), {recursive: true, force: true});
  // 한쪽에만 만든 새 스킬
  mkdirSync(join(root, '.claude', 'skills', 'new-skill'), {recursive: true});
  writeFileSync(join(root, '.claude', 'skills', 'new-skill', 'SKILL.md'), '# new\n');
  // 스킬 안 깨진 링크
  writeFileSync(join(root, '.claude', 'skills', 'blind-review', 'SKILL.md'), '# b\n[없는 문서](../../../knowledge/nope.md)\n');
  writeFileSync(join(root, '.agents', 'skills', 'blind-review', 'SKILL.md'), '# b\n[없는 문서](../../../knowledge/nope.md)\n');
  // 실수 정원 11개 + 규칙 안 깨진 링크
  const rows = Array.from({length: MISTAKE_CAP + 1}, (_, k) => `| ${k + 1} | 2026-11-27 | 규칙 ${k + 1} |`).join('\n');
  writeFileSync(join(root, 'AGENTS.md'), `# A\n[없음](knowledge/gone.md)\n## 1. 실수 제자리 배치\n| # | 날짜 | 규칙 |\n|---|---|---|\n${rows}\n## 2. 다음\n`);
  writeFileSync(join(root, 'knowledge', 'index.md'), '# Index\n');
  writeFileSync(join(root, 'knowledge', 'only-from-log.md'), '# 핵심\n');
  writeFileSync(join(root, 'knowledge', 'logs', '2026-11.md'), '# Log\n[핵심](../only-from-log.md)\n');

  const report = await auditGovernance(root);
  assert.equal(report.ok, false);
  const has = (part) => report.blocking.some((m) => m.includes(part));
  assert.ok(has('필수 스킬 publish-wrapup'), '양쪽에서 다 지운 필수 스킬');
  assert.ok(has('스킬 new-skill'), '한쪽에만 있는 새 스킬');
  assert.ok(report.brokenLinks.some((b) => b.file === 'AGENTS.md'), 'AGENTS.md 안 깨진 링크');
  assert.ok(report.brokenLinks.some((b) => b.file.startsWith('.claude/skills/blind-review')), '스킬 안 깨진 링크');
  assert.ok(report.coreOrphans.includes('only-from-log.md'), '일지에서만 이어진 핵심 문서는 목차에서 빠진 것으로 본다');
  assert.ok(has('실수 정원표가 11개'), '실수 정원 초과');
});

test('잠금 ② 확장: 6개 밖의 새 스킬도 줄 수 상한·깨진 링크를 보고, 밖에서 받아 온 스킬만 뺀다 [2026-11-27 재검수: 이름 6개만 봤다]', async () => {
  const root = mkdtempSync(join(tmpdir(), 'gov-lock3-'));
  mkdirSync(join(root, 'knowledge'), {recursive: true});
  writeFileSync(join(root, 'AGENTS.md'), '# A\n');
  writeFileSync(join(root, 'knowledge', 'index.md'), '# Index\n');
  seedSkills(root);
  const tooLong = Array.from({length: SKILL_MAX_LINES + 5}, (_, i) => `s ${i}`).join('\n');
  for (const side of ['.agents', '.claude']) {
    // 7번째로 새로 만든 스킬: 상한 초과 + 깨진 링크
    mkdirSync(join(root, side, 'skills', 'seventh-skill'), {recursive: true});
    writeFileSync(join(root, side, 'skills', 'seventh-skill', 'SKILL.md'), `${tooLong}\n[없는 문서](../../../knowledge/nope.md)\n`);
    // 밖에서 받아 온 스킬: 길어도·링크가 깨져도 막지 않는다(양쪽 일치만 본다)
    mkdirSync(join(root, side, 'skills', EXTERNAL_SKILLS[0]), {recursive: true});
    writeFileSync(join(root, side, 'skills', EXTERNAL_SKILLS[0], 'SKILL.md'), `${tooLong}\n[외부](../../../nowhere.md)\n`);
  }
  const report = await auditGovernance(root);
  assert.equal(report.ok, false);
  assert.ok(report.blocking.some((m) => m.includes('seventh-skill/SKILL.md가')), '새 스킬 줄 수 상한');
  assert.ok(report.brokenLinks.some((b) => b.file.startsWith('.claude/skills/seventh-skill')), '새 스킬 안 깨진 링크');
  assert.ok(!report.blocking.some((m) => m.includes(`${EXTERNAL_SKILLS[0]}/SKILL.md가`)), '밖에서 받아 온 스킬은 줄 수로 막지 않는다');
  assert.ok(!report.brokenLinks.some((b) => b.file.includes(EXTERNAL_SKILLS[0])), '밖에서 받아 온 스킬은 링크로 막지 않는다');
});

test('잠금 ③ 화면: 백지 눈 검수 결과가 승인 화면에 다섯 기준·소견·검수 모델과 함께 보인다', async () => {
  const {renderBlindReviewCard} = await import('../outlier-report-view.mjs');
  const html = renderBlindReviewCard({
    reviewedAt: '2026-11-28',
    reviewerModel: '시험 모델',
    checks: {mobileTitleOk: true, thumbOneSecOk: false, synergyOk: true, openingOneMinOk: true, antiSlopVoiceOk: true},
    findings: ['썸네일 글자가 두 덩어리로 갈린다'],
    verdict: 'needs_fix',
  });
  assert.ok(html.includes('고칠 것 있음'));
  assert.ok(html.includes('썸네일 글자가 두 덩어리로 갈린다'));
  assert.ok(html.includes('시험 모델'));
  assert.ok(html.includes('✗'));
});
