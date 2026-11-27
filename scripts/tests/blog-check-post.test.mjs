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
const VALID_HERO_BRIEF = {
  moment: 'a hand holds a vacuum charger plug while the indicator light stays dark',
  subject: 'an unbranded cordless vacuum charger plug in a hand',
  setting: 'a narrow hallway outlet at night',
  light: 'single phone flashlight from below',
  lens: '50mm close',
  angle: 'over the shoulder',
  texture: 'matte plastic, dusty baseboard',
  medium: 'documentary photograph',
  avoid: ['readable text', 'logos'],
  alt: '충전기를 꽂았는데 표시등이 켜지지 않아 들여다보는 순간.',
};

function makeValidDraft(overrides = {}) {
  return {
    topicId: 'topic-1',
    title: '무선 청소기 충전 불량 확인 방법',
    labels: ['청소기', '충전'],
    notUsedNote: VALID_NOT_USED,
    description: '무선 청소기가 충전되지 않으면 어댑터 연결 상태부터 확인합니다.',
    bodyHtml: `<p>${VALID_NOT_USED}</p><p>${VALID_STEP}</p>`,
    steps: [
      {
        text: VALID_STEP,
        source: {url: VALID_SOURCE_URL, quote: '어댑터가 콘센트에 단단히 꽂혔는지 확인하세요.'},
      },
    ],
    sources: [{url: VALID_SOURCE_URL, title: '제조사 고객지원 안내'}],
    product: null,
    heroImage: VALID_HERO_BRIEF,
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

test('검색 설명: 비었거나 150바이트를 넘거나 대가 문구가 들어가면 탈락한다', async () => {
  assert.ok(problemIds(await checkTechPost(makeValidDraft({description: ''}), okDeps())).includes('no-description'));
  // 11/27 실제로 블로거가 거절한 문구(UTF-8 154바이트)
  const tooLong = '가전 디지털 기기가 갑자기 안 될 때 제조사 공식 안내로 확인한 점검 순서와 사기 전에 맞춰 볼 규격을 정리합니다.';
  assert.ok(problemIds(await checkTechPost(makeValidDraft({description: tooLong}), okDeps())).includes('description-too-long'));
  assert.ok(problemIds(await checkTechPost(makeValidDraft({description: DISCLOSURE.slice(0, 40)}), okDeps())).includes('description-disclosure'));
  // 11/27 실제로 저장된 문구(130바이트)는 통과
  const ok = await checkTechPost(makeValidDraft({description: '가전 기기가 갑자기 안 될 때 제조사 공식 안내로 확인한 점검 순서와 사기 전 규격을 정리합니다.'}), okDeps());
  assert.deepEqual(ok, {ok: true, problems: []});
});

test('검색 설명도 AI 티 검사에 들어간다', async () => {
  let seen = '';
  await checkTechPost(makeValidDraft(), okDeps({runSlop: async ({bodyHtml}) => { seen = bodyHtml; return {ok: true}; }}));
  assert.ok(seen.includes('어댑터 연결 상태부터 확인합니다.'));
});

test('쿠팡 상품 조건(mustHave)이 없으면 탈락하고, 있으면 통과한다', async () => {
  const noMust = await checkTechPost(makeValidDraft({product: {query: '라이트닝 HDMI', why: '유선으로 연결합니다.'}}), okDeps());
  assert.ok(problemIds(noMust).includes('product-no-must-have'));

  const blankMust = await checkTechPost(makeValidDraft({product: {query: '라이트닝 HDMI', mustHave: ['  ']}}), okDeps());
  assert.ok(problemIds(blankMust).includes('product-no-must-have'));

  const withMust = await checkTechPost(
    makeValidDraft({product: {query: '라이트닝 HDMI', mustHave: ['케이블|젠더'], mustNotHave: ['무선']}}),
    okDeps(),
  );
  assert.equal(problemIds(withMust).includes('product-no-must-have'), false);
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

test('출처 페이지 텍스트에 인용문이 없으면 source-quote-mismatch', async () => {
  const draft = makeValidDraft({
    steps: [
      {
        text: VALID_STEP,
        source: {url: VALID_SOURCE_URL, quote: '이 문장은 출처 페이지에 없습니다.'},
      },
    ],
  });
  const res = await checkTechPost(
    draft,
    okDeps({
      fetchImpl: async () => ({
        status: 200,
        text: async () => '<html><body><p>다른 내용만 있는 공식 고객지원 페이지입니다.</p></body></html>',
      }),
    }),
  );
  assert.equal(res.ok, false);
  assert.deepEqual(problemIds(res), ['source-quote-mismatch']);
});

test('출처 페이지 텍스트에 인용문이 따옴표 차이(“ ” vs ")가 있어도 정규화 후 통과한다', async () => {
  const draft = makeValidDraft({
    steps: [
      {
        text: VALID_STEP,
        source: {url: VALID_SOURCE_URL, quote: '“어댑터가 콘센트에 단단히 꽂혔는지” 확인하세요.'},
      },
    ],
  });
  const res = await checkTechPost(
    draft,
    okDeps({
      fetchImpl: async () => ({
        status: 200,
        text: async () => '<html><body><p>"어댑터가 콘센트에 단단히 꽂혔는지" 확인하세요.</p></body></html>',
      }),
    }),
  );
  assert.equal(res.ok, true);
  assert.deepEqual(problemIds(res), []);
});

test('출처 페이지의 링크 태그 때문에 생기는 공백 차이("기기 가" vs "기기가")는 인용문 대조를 통과한다', async () => {
  const quote = 'AirPlay 호환 기기가 켜져 있고 서로 가까이 있는지 확인합니다.';
  const draft = makeValidDraft({
    steps: [{text: VALID_STEP, source: {url: VALID_SOURCE_URL, quote}}],
  });
  const res = await checkTechPost(
    draft,
    okDeps({
      fetchImpl: async () => ({
        status: 200,
        text: async () =>
          '<html><body><p><a href="https://support.example.com/airplay">AirPlay 호환 기기</a>가 켜져 있고 서로 가까이 있는지 확인합니다.</p></body></html>',
      }),
    }),
  );
  assert.equal(res.ok, true);
  assert.deepEqual(problemIds(res), []);

  // 같은 페이지에 없는 다른 문장은 여전히 막힌다
  const bad = makeValidDraft({
    steps: [{text: VALID_STEP, source: {url: VALID_SOURCE_URL, quote: '페이지에 전혀 없는 다른 문장입니다.'}}],
  });
  const badRes = await checkTechPost(
    bad,
    okDeps({
      fetchImpl: async () => ({
        status: 200,
        text: async () =>
          '<html><body><p><a href="https://support.example.com/airplay">AirPlay 호환 기기</a>가 켜져 있고 서로 가까이 있는지 확인합니다.</p></body></html>',
      }),
    }),
  );
  assert.deepEqual(problemIds(badRes), ['source-quote-mismatch']);
});

test('필수 안내 문구 속 "써 보" 부정문은 experience-claim이 아니고, 본문 다른 곳의 "직접 써 보니"는 여전히 걸린다', async () => {
  const note = '이 글은 제품을 직접 써 보고 쓴 글이 아니며, 애플과 삼성전자 공식 안내를 정리했습니다.';
  const clean = makeValidDraft({
    notUsedNote: note,
    bodyHtml: `<p>${note}</p><p>${VALID_STEP}</p>`,
  });
  const cleanRes = await checkTechPost(clean, okDeps());
  assert.ok(!problemIds(cleanRes).includes('experience-claim'));
  assert.deepEqual(problemIds(cleanRes), []);

  const claim = makeValidDraft({
    notUsedNote: note,
    bodyHtml: `<p>${note}</p><p>${VALID_STEP} 직접 써 보니 편했습니다.</p>`,
  });
  const claimRes = await checkTechPost(claim, okDeps());
  assert.deepEqual(problemIds(claimRes), ['experience-claim']);
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

test('heroImage가 없으면 hero-brief-field-missing, 안전선을 어기면 hero-brief-… 로 막힌다', async () => {
  const noHero = await checkTechPost(makeValidDraft({heroImage: undefined}), okDeps());
  assert.equal(noHero.ok, false);
  assert.deepEqual(problemIds(noHero), ['hero-brief-field-missing']);

  const brand = await checkTechPost(
    makeValidDraft({heroImage: {...VALID_HERO_BRIEF, subject: 'a Dyson vacuum charger plug'}}),
    okDeps(),
  );
  assert.deepEqual(problemIds(brand), ['hero-brief-brand-word']);

  const age = await checkTechPost(
    makeValidDraft({heroImage: {...VALID_HERO_BRIEF, subject: 'an elderly person holding a plug'}}),
    okDeps(),
  );
  assert.deepEqual(problemIds(age), ['hero-brief-age-word']);

  const alt = await checkTechPost(
    makeValidDraft({heroImage: {...VALID_HERO_BRIEF, alt: '사진: 충전기 표시등이 꺼진 순간.'}}),
    okDeps(),
  );
  assert.deepEqual(problemIds(alt), ['hero-brief-alt-form']);
});

const HERO_URL = 'https://blogger.googleusercontent.com/img/a/AVvXsExample/s1600/hero.jpg';
const heroImg = (attrs = `src="${HERO_URL}" alt="충전기를 꽂았지만 불이 안 들어오는 순간" width="1200" height="670" fetchpriority="high" decoding="async"`) => `<img ${attrs}>`;

test('checkRenderedHtml: hero가 없으면 그림이 없어도 예전과 같이 통과한다', () => {
  assert.deepEqual(checkRenderedHtml(`<p>${DISCLOSURE}</p><p>본문</p>`), []);
  assert.deepEqual(checkRenderedHtml(`<p>${DISCLOSURE}</p><p>본문</p>`, {}), []);
  // hero 없이는 그림 속성도 보지 않는다
  assert.deepEqual(checkRenderedHtml(`<p>${DISCLOSURE}</p><p><img src="https://x.test/a.jpg" loading="lazy"></p>`), []);
});

test('checkRenderedHtml: hero가 있으면 첫 그림 자리·주소·속성·lazy·쿠팡 그림 주소를 본다', () => {
  const hero = {url: HERO_URL};
  const ok = `<p>${DISCLOSURE}</p><p>${heroImg()}</p><p>본문</p>`;
  assert.deepEqual(checkRenderedHtml(ok, {hero}), []);

  assert.deepEqual(checkRenderedHtml(`<p>${DISCLOSURE}</p><p>본문</p>`, {hero}).map((p) => p.id), ['hero-img-missing']);

  const wrongHost = `<p>${DISCLOSURE}</p><p>${heroImg(`src="https://cdn.example.com/a.jpg" alt="설명" width="1200" height="670" fetchpriority="high"`)}</p>`;
  assert.deepEqual(checkRenderedHtml(wrongHost, {hero}).map((p) => p.id), ['hero-img-src']);

  const noAttrs = `<p>${DISCLOSURE}</p><p>${heroImg(`src="${HERO_URL}" fetchpriority="high"`)}</p>`;
  assert.deepEqual(checkRenderedHtml(noAttrs, {hero}).map((p) => p.id), ['hero-img-attrs']);

  const emptyAlt = `<p>${DISCLOSURE}</p><p>${heroImg(`src="${HERO_URL}" alt="" width="1200" height="670" fetchpriority="high"`)}</p>`;
  assert.deepEqual(checkRenderedHtml(emptyAlt, {hero}).map((p) => p.id), ['hero-img-attrs']);

  const lazy = `<p>${DISCLOSURE}</p><p>${heroImg(`src="${HERO_URL}" alt="설명" width="1200" height="670" loading="lazy" fetchpriority="high"`)}</p>`;
  assert.deepEqual(checkRenderedHtml(lazy, {hero}).map((p) => p.id), ['hero-img-lazy']);

  const noPriority = `<p>${DISCLOSURE}</p><p>${heroImg(`src="${HERO_URL}" alt="설명" width="1200" height="670"`)}</p>`;
  assert.deepEqual(checkRenderedHtml(noPriority, {hero}).map((p) => p.id), ['hero-img-priority']);

  const coupangImg = `<p>${DISCLOSURE}</p><p>${heroImg()}</p><p><img src="https://thumbnail6.coupangcdn.com/x.jpg" alt="상품"></p>`;
  assert.deepEqual(checkRenderedHtml(coupangImg, {hero}).map((p) => p.id), ['hero-coupangcdn']);

  // 대가 문구가 첫 문단이어야 하는 규칙은 hero가 있어도 그대로
  const imgFirst = `<p>${heroImg()}</p><p>${DISCLOSURE}</p>`;
  assert.deepEqual(checkRenderedHtml(imgFirst, {hero}).map((p) => p.id), ['disclosure-missing']);
});
