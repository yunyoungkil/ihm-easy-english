// 비교 시트 지침이 사라지거나 규칙·검사와 어긋나지 않게 지킨다(2026-11-16 사용자: 중요한 내용을 다음 대화에 자동으로 적용되게 남겨라).
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const PLAYBOOK = 'knowledge/playbooks/comparison-sheet-playbook.md';

test('비교 시트 지침 문서가 있고 핵심 절(전제·사용자 원칙·실수·절차·도구·필드·함정)이 있다', () => {
  assert.ok(existsSync(new URL(`../../${PLAYBOOK}`, import.meta.url)));
  const t = read(PLAYBOOK);
  for (const h of ['## 0. 왜 하는 일인가', '## 1. 사용자가 한 말의 뜻', '## 2. 내 실수 목록', '## 3. 비교 시트·쇼츠 제작 절차', '## 4. 도구·명령', '## 5. 시트 필드와 코드 검사', '## 6. 기술 함정']) assert.ok(t.includes(h), `${h} 절이 없다`);
  assert.ok(existsSync(new URL('../../knowledge/playbooks/2026-11-16-shorts-2an-design-spec.md', import.meta.url)), '쇼츠 2안 설계서가 있다');
});

test('항상 읽는 규칙 문서(AGENTS.md)와 스킬 문서가 지침 문서를 가리키고 불변 규칙을 담는다', () => {
  const agents = read('AGENTS.md');
  assert.ok(agents.includes('knowledge/playbooks/comparison-sheet-playbook.md'));
  assert.ok(agents.includes('쇼츠 화면에는 위 훅 띠와 아래 정보 띠가 항상 들어간다'));
  assert.ok(agents.includes('화면에 보이는 것을 바꿨으면 브라우저로 직접 열어 보고'));
  assert.ok(agents.includes('appliedTo') && agents.includes('origin'));
  assert.ok(read('.claude/skills/episode-planning/references/01-topic-and-data.md').includes('comparison-sheet-playbook.md'));
  assert.ok(read('knowledge/composition-rules.md').includes('위 훅 띠·아래 정보 띠'));
});

test('지침이 말하는 코드 검사가 실제로 있다(문서와 코드가 어긋나지 않게)', async () => {
  const m = await import('../transform-sheet.mjs');
  for (const name of ['appliedProblems', 'plan2Problems', 'voiceBudget', 'sheetOrigins', 'sheetLinksByVideo']) assert.equal(typeof m[name], 'function', `${name} 함수가 없다`);
  for (const f of ['scripts/sheet-card-templates2.mjs', 'scripts/sheet-thumbs2.mjs', 'scripts/visual-library-summary.mjs']) assert.ok(existsSync(new URL(`../../${f}`, import.meta.url)), `${f}가 없다`);
  const pkg = JSON.parse(read('package.json'));
  assert.ok(pkg.scripts['visual-summary'], 'npm run visual-summary가 없다');
});
