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
  const ytOps = read('knowledge/youtube-operations.md');
  assert.ok(agents.includes('knowledge/playbooks/comparison-sheet-playbook.md'));
  assert.ok(agents.includes('knowledge/youtube-operations.md'));
  // 쇼츠 위 훅 띠·아래 정보 띠는 사용자가 정한 불변 규칙(2026-11-16). 둘 다 항상 읽는 문서와 유튜브 허브에 있어야 한다.
  // (2026-11-27 1차 개편 때 '또는' 조건으로 느슨해지고 아래 띠가 빠졌던 것을 되돌림)
  for (const [name, text] of [['AGENTS.md', agents], ['youtube-operations.md', ytOps]]) {
    assert.ok(text.includes('쇼츠 상단 0.5초 훅'), `${name}에 쇼츠 상단 0.5초 훅이 없다`);
    assert.ok(text.includes('아래 정보 띠'), `${name}에 쇼츠 아래 정보 띠가 없다`);
  }
  // 블로그와 공유하는 공통 안전선과 음성 예산이 고정 안전선 목록에 있어야 한다(2026-11-27 감사에서 빠진 것 확인)
  for (const phrase of ['경험·일화 날조 금지', '저작권 준수', '음성 예산 일치', '애드센스 계정 보호']) {
    assert.ok(agents.includes(phrase), `AGENTS.md 고정 안전선에 "${phrase}"가 없다`);
  }
  // 안티그래비티는 렌더 뒤 패키지 복사 훅이 없다 — 직접 복사 안내가 유튜브 허브에 있어야 한다
  assert.ok(ytOps.includes('안티그래비티는 렌더 뒤') && ytOps.includes('ALLOW_BANNED_TERMS'));
  // 사후 마무리 스킬은 상태 파일을 손으로 고치지 않는다(production-rules "4번째 원인")
  for (const side of ['.claude', '.agents']) {
    const wrap = read(`${side}/skills/publish-wrapup/SKILL.md`);
    assert.ok(wrap.includes('손으로 고치지 않는다') && wrap.includes('`status.json`을 만들지 않는다'), `${side} publish-wrapup에 상태 파일 금지 문구가 없다`);
  }
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
