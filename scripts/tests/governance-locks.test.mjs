// 2026-11-27 1차 개편 자동 잠금 4개 + 브리핑 건강 알림 단위 테스트.
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';
import {
  AGENTS_MAX_LINES,
  PROJECT_SKILLS,
  SKILL_MAX_LINES,
  auditGovernance,
  wikiHealthLine,
} from '../lint-knowledge.mjs';
import {BLIND_REVIEW_SINCE, blindReviewProblems} from '../transform-sheet.mjs';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

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

  const report = await auditGovernance(root, {now: new Date('2026-11-20T00:00:00Z')});
  assert.equal(report.ok, true);
  assert.equal(report.cleanup.due, true);
  assert.ok(wikiHealthLine(report).includes('지침·위키 주기 정리 도래'));
});

test('잠금 ③: 새 v4 시트는 백지 눈 5대 잣대 통과(blindReview) 없으면 차단, 잠금 전에 있던 7편만 호환 유지', () => {
  const legacyV4 = {schemaVersion: 4, episodeId: 'ep37-listen-frozen-questions', createdAt: '2026-11-25'};
  assert.deepEqual(blindReviewProblems(legacyV4), [], '잠금 전에 있던 시트는 소급 차단하지 않는다');

  const newMissing = {schemaVersion: 4, episodeId: 'ep38-new', createdAt: `${BLIND_REVIEW_SINCE}T00:00:00Z`};
  assert.ok(blindReviewProblems(newMissing).some((m) => m.includes('백지 눈 검수(blindReview)가 없다')));

  // 2026-11-27 감사에서 찾은 우회: 작성일을 비우기·빼기·다른 형식·앞당기기. 모두 막혀야 한다.
  for (const createdAt of ['', undefined, '11/28/2026', '2026-11-25', '2026-01-01']) {
    const s = {schemaVersion: 4, episodeId: 'ep38-new', createdAt};
    assert.ok(blindReviewProblems(s).length > 0, `작성일 ${JSON.stringify(createdAt)}로 잠금을 피하면 안 된다`);
  }
  assert.ok(blindReviewProblems({schemaVersion: 4}).length > 0, '이름도 날짜도 없는 새 시트도 막는다');

  const newFailed = {
    schemaVersion: 4,
    createdAt: `${BLIND_REVIEW_SINCE}T00:00:00Z`,
    blindReview: {
      reviewedAt: '2026-11-28',
      reviewerModel: 'Gemini 4 Neon',
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
    createdAt: `${BLIND_REVIEW_SINCE}T00:00:00Z`,
    blindReview: {
      reviewedAt: '2026-11-28',
      reviewerModel: 'Gemini 4 Neon',
      checks: {mobileTitleOk: true, thumbOneSecOk: true, synergyOk: true, openingOneMinOk: true, antiSlopVoiceOk: true},
      findings: ['5대 잣대 모두 확인 및 수정 반영'],
      verdict: 'pass',
    },
  };
  assert.deepEqual(blindReviewProblems(newPassed), []);
});

test('프로젝트 전용 스킬 6종이 .agents/skills와 .claude/skills 양쪽에 모두 존재한다', () => {
  assert.ok(PROJECT_SKILLS.includes('blind-review'));
  assert.ok(PROJECT_SKILLS.includes('publish-wrapup'));
  assert.ok(PROJECT_SKILLS.includes('performance-settlement'));
  assert.ok(PROJECT_SKILLS.includes('wiki-maintenance'));
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
