import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISCLOSURE,
  EXPERIENCE_PATTERNS,
  RESET_PATTERNS,
  RISKY_STEP_PATTERNS,
  checkRenderedHtml,
  checkTechPost,
} from '../blog/check-post.mjs';

const VALID_NOT_USED = '이 글은 제품을 직접 써 보지 않고 제조사 안내와 사용자 질문을 정리했습니다.';
const VALID_STEP = '어댑터 연결 상태를 먼저 확인합니다.';
const VALID_SOURCE_URL = 'https://example.com/guide';

function makeValidDraft(overrides = {}) {
  return {
    topicId: 'topic-1',
    title: '무선 청소기 충전 불량 확인 방법',
    labels: ['청소기', '충전'],
    notUsedNote: VALID_NOT_USED,
    bodyHtml: `<p>${VALID_NOT_USED}</p><p>${VALID_STEP}</p>`,
    steps: [
      {
        text: VALID_STEP,
        source: {url: VALID_SOURCE_URL, quote: '어댑터가 콘센트에 단단히 꽂혔는지 확인하세요.'},
      },
    ],
    sources: [{url: VALID_SOURCE_URL, title: '제조사 고객지원 안내'}],
    product: null,
    ...overrides,
  };
}

const okDeps = (overrides = {}) => ({
  posts: [],
  fetchImpl: async () => ({status: 200}),
  runSlop: async () => ({ok: true}),
  ...overrides,
});

const problemIds = (res) => res.problems.map((p) => p.id);

test('유효한 초안은 통과한다', async () => {
  assert.ok(Array.isArray(EXPERIENCE_PATTERNS) && EXPERIENCE_PATTERNS.length > 0);
  assert.ok(Array.isArray(RISKY_STEP_PATTERNS) && RISKY_STEP_PATTERNS.length > 0);
  assert.ok(Array.isArray(RESET_PATTERNS) && RESET_PATTERNS.length > 0);
  assert.equal(
    DISCLOSURE,
    '이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
  );

  const res = await checkTechPost(makeValidDraft(), okDeps());
  assert.deepEqual(res, {ok: true, problems: []});
});

test('써 본 척 표현("직접 써 보니 편했다")은 experience-claim', async () => {
  const draft = makeValidDraft({
    bodyHtml: `<p>${VALID_NOT_USED}</p><p>${VALID_STEP} 직접 써 보니 편했다.</p>`,
  });
  const res = await checkTechPost(draft, okDeps());
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['experience-claim']);
});

test('위험 단계("뒷판을 분해해 배터리를 교체")는 서비스센터 안내 없으면 risky-step, 있으면 통과', async () => {
  const risky = '뒷판을 분해해 배터리를 교체';
  const badDraft = makeValidDraft({
    bodyHtml: `<p>${VALID_NOT_USED}</p><p>${risky}</p>`,
    steps: [{text: risky, source: {url: VALID_SOURCE_URL, quote: 'Service manual'}}],
  });
  const badRes = await checkTechPost(badDraft, okDeps());
  assert.equal(badRes.ok, false);
  assert.deepEqual(problemIds(badRes), ['risky-step']);

  const safeStep = '뒷판을 분해해 배터리를 교체해야 할 때는 제조사 서비스센터로 문의하세요.';
  const goodDraft = makeValidDraft({
    bodyHtml: `<p>${VALID_NOT_USED}</p><p>${safeStep}</p>`,
    steps: [{text: safeStep, source: {url: VALID_SOURCE_URL, quote: 'Contact service center'}}],
  });
  const goodRes = await checkTechPost(goodDraft, okDeps());
  assert.deepEqual(goodRes, {ok: true, problems: []});
});

test('초기화 단계("공장 초기화") 앞에 백업 없으면 reset-without-backup, 앞에 백업 있으면 통과', async () => {
  const resetStep = '공장 초기화를 진행합니다.';
  const badDraft = makeValidDraft({
    bodyHtml: `<p>${VALID_NOT_USED}</p><p>${resetStep}</p>`,
    steps: [{text: resetStep, source: {url: VALID_SOURCE_URL, quote: 'Run factory reset'}}],
  });
  const badRes = await checkTechPost(badDraft, okDeps());
  assert.equal(badRes.ok, false);
  assert.deepEqual(problemIds(badRes), ['reset-without-backup']);

  const withBackup = '중요한 데이터를 백업한 뒤 공장 초기화를 진행합니다.';
  const goodDraft = makeValidDraft({
    bodyHtml: `<p>${VALID_NOT_USED}</p><p>${withBackup}</p>`,
    steps: [{text: withBackup, source: {url: VALID_SOURCE_URL, quote: 'Backup before reset'}}],
  });
  const goodRes = await checkTechPost(goodDraft, okDeps());
  assert.deepEqual(goodRes, {ok: true, problems: []});
});

test('빈 sources는 no-sources', async () => {
  const draft = makeValidDraft({sources: []});
  const res = await checkTechPost(draft, okDeps());
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['no-sources']);
});

test('단계 source.quote가 비어 있으면 step-without-source', async () => {
  const draft = makeValidDraft({
    steps: [{text: VALID_STEP, source: {url: VALID_SOURCE_URL, quote: ''}}],
  });
  const res = await checkTechPost(draft, okDeps());
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['step-without-source']);
});

test('단계 text가 bodyHtml 본문 글자에 없으면 step-not-in-body', async () => {
  const draft = makeValidDraft({
    steps: [{text: '본문에 없는 다른 단계입니다.', source: {url: VALID_SOURCE_URL, quote: 'Some quote'}}],
  });
  const res = await checkTechPost(draft, okDeps());
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['step-not-in-body']);
});

test('출처 fetchImpl이 403을 반환하면 source-unreachable (GET + User-Agent 사용)', async () => {
  const seen = [];
  const res = await checkTechPost(
    makeValidDraft(),
    okDeps({
      fetchImpl: async (url, init) => {
        seen.push({url, init});
        return {status: 403};
      },
    }),
  );
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['source-unreachable']);
  assert.equal(seen[0].init?.method, 'GET');
  assert.ok(seen[0].init?.headers?.['User-Agent']);
});

test('runSlop이 {ok: false}면 slop', async () => {
  const res = await checkTechPost(makeValidDraft(), okDeps({runSlop: async () => ({ok: false})}));
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['slop']);
});

test('runSlop이 {missing: true}면 slop-checker-missing이고 통과하지 않는다', async () => {
  const res = await checkTechPost(makeValidDraft(), okDeps({runSlop: async () => ({missing: true})}));
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['slop-checker-missing']);
});

test('금지어가 있으면 banned-term', async () => {
  const draft = makeValidDraft({
    bodyHtml: `<p>${VALID_NOT_USED}</p><p>${VALID_STEP} 유성음 설명은 빼세요.</p>`,
  });
  const res = await checkTechPost(draft, okDeps());
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['banned-term']);
});

test('posts에 같은 topicId가 있으면 duplicate-topic', async () => {
  const res = await checkTechPost(
    makeValidDraft(),
    okDeps({posts: [{topicId: 'topic-1', date: '2026-11-24', title: '이전 글'}]}),
  );
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['duplicate-topic']);
});

test('notUsedNote가 비어 있거나 bodyHtml에 없으면 no-not-used-note', async () => {
  const emptyRes = await checkTechPost(makeValidDraft({notUsedNote: ''}), okDeps());
  assert.equal(emptyRes.ok, false);
  assert.deepEqual(problemIds(emptyRes), ['no-not-used-note']);

  const missingRes = await checkTechPost(
    makeValidDraft({notUsedNote: '본문에 빠진 안내 문장입니다.'}),
    okDeps(),
  );
  assert.equal(missingRes.ok, false);
  assert.deepEqual(problemIds(missingRes), ['no-not-used-note']);
});

test('checkRenderedHtml: 첫 <p> 대가 문구 및 쿠팡 링크 rel=sponsored 검사', () => {
  const okHtml = `<p>${DISCLOSURE}</p><p>안내 본문</p><a href="https://link.coupang.com/a/x" rel="sponsored nofollow">상품 보기</a>`;
  assert.deepEqual(checkRenderedHtml(okHtml), []);

  const missingDisclosure = `<p>다른 첫 문단</p><p>${DISCLOSURE}</p>`;
  assert.deepEqual(
    checkRenderedHtml(missingDisclosure).map((p) => p.id),
    ['disclosure-missing'],
  );

  const missingRel = `<p>${DISCLOSURE}</p><a href="https://link.coupang.com/a/x">상품 보기</a>`;
  assert.deepEqual(
    checkRenderedHtml(missingRel).map((p) => p.id),
    ['link-not-sponsored'],
  );

  const nonSponsoredRel = `<p>${DISCLOSURE}</p><a href="https://link.coupang.com/a/x" rel="nofollow">상품 보기</a>`;
  assert.deepEqual(
    checkRenderedHtml(nonSponsoredRel).map((p) => p.id),
    ['link-not-sponsored'],
  );
});
