import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {
  appendRun,
  readPause,
  readPosts,
  readQueue,
  readRuns,
  writePause,
} from '../blog/blog-store.mjs';
import {DISCLOSURE} from '../blog/check-post.mjs';
import {
  MAX_CONSECUTIVE_REJECTS,
  WRITING_WEEKDAYS,
  pickMatchingProduct,
  runTechOnce,
} from '../blog/tech-run.mjs';

const HOME_HOST = 'PC-HOME';
const OTHER_HOST = 'PC-LAPTOP';
const KST_WED_2AM = new Date('2026-11-24T17:00:00Z'); // KST 2026-11-25 02:00 (수)
const KST_THU_10AM = new Date('2026-11-26T01:00:00Z'); // KST 2026-11-26 10:00 (목)

async function withProject(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'blog-tech-run-'));
  const blogDir = path.join(dir, 'data', 'blog');
  await mkdir(blogDir, {recursive: true});
  await writeFile(
    path.join(blogDir, 'blogs.json'),
    JSON.stringify({tech: {blogId: '6595948324958151051', url: 'https://tech.d40m.com/'}}),
    'utf8',
  );
  try {
    await fn(dir, blogDir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
}

function makeTopic(topicId = 'dyson-v8-red-blink') {
  return {
    topicId,
    title: '다이슨 V8 빨간불 깜빡임 확인 순서',
    kind: 'fix',
    searchQuery: '다이슨 V8 빨간불 깜빡임 공식 지원',
    sourceHints: ['https://www.dyson.co.kr/support'],
    productHint: '다이슨 V8 호환 어댑터 26.1V',
    cluster: '큰 가전 설치 전 확인',
  };
}

const DEFAULT_PRODUCT = {query: '다이슨 V8 어댑터', mustHave: ['어댑터'], why: '교체용 확인', required: false};

function makeDraft(topicId = 'dyson-v8-red-blink', product = DEFAULT_PRODUCT) {
  return {
    topicId,
    title: '다이슨 V8 빨간불 깜빡임 확인 순서',
    labels: ['가전', '무선청소기'],
    notUsedNote: '이 글은 직접 써 보지 않고 제조사 공식 안내를 정리했습니다.',
    description: '다이슨 V8 빨간불이 깜빡이면 충전 어댑터 연결부터 확인합니다.',
    bodyHtml: '<p>이 글은 직접 써 보지 않고 제조사 공식 안내를 정리했습니다.</p><p>충전 어댑터를 콘센트에 다시 연결합니다.</p>',
    steps: [
      {
        text: '충전 어댑터를 콘센트에 다시 연결합니다.',
        source: {url: 'https://www.dyson.co.kr/support', quote: '어댑터 연결을 확인하세요.'},
      },
    ],
    sources: [{url: 'https://www.dyson.co.kr/support', title: '다이슨 공식 지원'}],
    product,
  };
}

const FAKE_HERO = {
  url: 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXs/s1600/hero.jpg',
  alt: '교통카드가 안 찍혀 당황한 순간',
  width: 1200,
  height: 670,
  hash: '0f0f0f0f0f0f0f0f',
  brief: {moment: '개찰구 앞에서 카드가 안 찍힘'},
};

function makeBaseDeps(overrides = {}) {
  const calls = {
    runWriter: 0,
    searchProducts: 0,
    deeplink: 0,
    publishToBlogger: 0,
    publishDraft: 0,
    applyPostSettings: 0,
    applyPostSettingsArgs: [],
    publishToBloggerArgs: [],
    verifyLive: 0,
    syncBlogData: 0,
    gitPull: 0,
    listTodayLivePosts: 0,
    syncBlogDataArgs: [],
    writePause: 0,
    produceHero: 0,
  };
  const deps = {
    getBlogAccessToken: async () => 'tok-valid',
    resolveClaudeExe: () => 'C:\\fake\\claude.exe',
    buildWriterPrompt: async (topic, {draftPath}) => `PROMPT:${topic.topicId}:${draftPath}`,
    runWriter: async () => {
      calls.runWriter += 1;
      return {ok: true, draft: makeDraft()};
    },
    searchProducts: async () => {
      calls.searchProducts += 1;
      return [{productId: 900, productName: '다이슨 V8 어댑터 호환형', productUrl: 'https://www.coupang.com/vp/900'}];
    },
    deeplink: async (urls) => {
      calls.deeplink += 1;
      return urls.map((u) => ({originalUrl: u, shortenUrl: 'https://link.coupang.com/a/short'}));
    },
    produceHero: async () => {
      calls.produceHero += 1;
      return {ok: true, hero: {...FAKE_HERO}};
    },
    checkTechPost: async () => ({ok: true, problems: []}),
    publishToBlogger: async (args) => {
      calls.publishToBlogger += 1;
      calls.publishToBloggerArgs.push(args);
      return {postId: 'post-101', url: 'https://tech.d40m.com/'};
    },
    applyPostSettings: async (args) => {
      calls.applyPostSettings += 1;
      calls.applyPostSettingsArgs.push(args);
      return {ok: true};
    },
    publishDraft: async ({postId}) => {
      calls.publishDraft += 1;
      const slug = calls.applyPostSettingsArgs.at(-1)?.permalink || 'blog-post';
      return {postId, url: `https://tech.d40m.com/2026/11/${slug}.html`};
    },
    verifyLive: async () => {
      calls.verifyLive += 1;
      return {ok: true, problems: []};
    },
    syncBlogData: async (args) => {
      calls.syncBlogData += 1;
      calls.syncBlogDataArgs.push(args);
      return {committed: 3, pushed: true};
    },
    collectSearchConsole: async () => {
      calls.collectSearchConsole = (calls.collectSearchConsole || 0) + 1;
      return {};
    },
    gitPull: async () => {
      calls.gitPull += 1;
      return {ok: true};
    },
    listTodayLivePosts: async () => {
      calls.listTodayLivePosts += 1;
      return [];
    },
    hostname: () => HOME_HOST,
    ...overrides,
  };
  return {deps, calls};
}

test('상수: WRITING_WEEKDAYS는 월·수·금([1,3,5]), MAX_CONSECUTIVE_REJECTS는 3', () => {
  assert.deepEqual(WRITING_WEEKDAYS, [1, 3, 5]);
  assert.equal(MAX_CONSECUTIVE_REJECTS, 3);
});

test('pickMatchingProduct: query 핵심 낱말이 모두 들어간 첫 후보를 고르고, 없으면 null', () => {
  const candidates = [
    {productId: 1, productName: '다이슨 V10 충전 어댑터', productUrl: 'https://www.coupang.com/vp/1'},
    {productId: 2, productName: '아트뮤 다이슨 v8 호환 충전기 어댑터 26.1v 780mA', productUrl: 'https://www.coupang.com/vp/2'},
    {productId: 3, productName: '다이슨 V8 호환 어댑터 26.1V 정품형', productUrl: 'https://www.coupang.com/vp/3'},
  ];
  assert.equal(pickMatchingProduct(candidates, '다이슨 V8 호환 어댑터 26.1V')?.productId, 2);
  assert.equal(pickMatchingProduct(candidates, '다이슨 V8 정품 거치대'), null);
  assert.equal(pickMatchingProduct([], '다이슨 V8'), null);
  assert.equal(pickMatchingProduct(candidates, '   '), null);
});

test('pickMatchingProduct: mustHave·mustNotHave로 본문과 같은 종류만 고른다(11/27 실제 후보)', () => {
  // data/blog/drafts/iphone-samsung-tv-mirroring-not-working.json의 실제 후보 이름 그대로
  const candidates = [
    {productId: 8609330249, productName: '넥스트유 미라칸 hdmi 4k 동글 미러링 송신기 블랙, 단일상품, 1개'},
    {productId: 8948358136, productName: '쿠오 무선 초강력 벽뚫기 HDMI 미러링 디스플레이 송수신기세트'},
    {productId: 7612618848, productName: '호후 아이폰미러링 케이블 티비연결 라이트닝 이젠더 HMG-L007-2PP, 1개, 화이트'},
    {productId: 7343113562, productName: '구스페리 C타입 to HDMI 4K UHD 60Hz Ver2.0 미러링 케이블'},
  ];
  // 예전 방식(검색어만): 무선 송신기가 뽑혔다
  assert.equal(pickMatchingProduct(candidates, 'HDMI 미러링')?.productId, 8609330249);
  // 유선이라는 조건을 주면 유선 제품만
  const wired = {query: '미러링', mustHave: ['케이블|젠더'], mustNotHave: ['무선', '동글', '송신기']};
  assert.equal(pickMatchingProduct(candidates, wired)?.productId, 7612618848);
  // 띄어쓰기가 달라도 맞춘다(상품명 "아이폰미러링" ↔ 조건 "아이폰 미러링")
  assert.equal(pickMatchingProduct(candidates, {query: '아이폰 미러링', mustHave: ['라이트닝|8핀']})?.productId, 7612618848);
  // 조건을 만족하는 후보가 없으면 null
  assert.equal(pickMatchingProduct(candidates, {query: 'HDMI', mustHave: ['애플'], mustNotHave: []}), null);
});

test('1) 멈춤 상태이면 outcome=paused이고 글쓰기를 부르지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writePause(blogDir, '연속 실패', KST_WED_2AM);
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'paused');
    assert.equal(res.date, '2026-11-25');
    assert.equal(calls.runWriter, 0);
    assert.equal(calls.publishToBlogger, 0);
    const runs = await readRuns(blogDir);
    assert.equal(runs.at(-1).outcome, 'paused');
  });
});

test('2) UTC 17:00(한국 수요일 02:00)은 글쓰기 요일을 통과하고 한국 날짜 2026-11-25로 기록한다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(res.date, '2026-11-25');
    assert.equal(calls.runWriter, 1);
    const posts = await readPosts(blogDir);
    assert.equal(posts[0].date, '2026-11-25');
  });
});

test('3) 글 쓰는 요일이 아니면 outcome=not-writing-day (forceDay=true면 진행)', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();

    const skipped = await runTechOnce({projectDir, now: KST_THU_10AM, deps});
    assert.equal(skipped.outcome, 'not-writing-day');
    assert.equal(calls.runWriter, 0);

    const forced = await runTechOnce({projectDir, now: KST_THU_10AM, forceDay: true, deps});
    assert.equal(forced.outcome, 'published');
    assert.equal(calls.runWriter, 1);
  });
});

test('4) 오늘(한국 날짜) 게시 기록이 이미 있으면 outcome=already-posted-today', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic('t2')]));
    await writeFile(
      path.join(blogDir, 'tech-posts.json'),
      JSON.stringify([{date: '2026-11-25', topicId: 't1', title: '먼저 올린 글', url: 'u', postId: 'p'}]),
    );
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'already-posted-today');
    assert.equal(calls.runWriter, 0);
    assert.equal(calls.publishToBlogger, 0);
  });
});

test('5) 대기열이 비어 있으면 outcome=queue-empty', async () => {
  await withProject(async (projectDir) => {
    const {deps, calls} = makeBaseDeps();
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'queue-empty');
    assert.equal(calls.runWriter, 0);
  });
});

test('6) 토큰이 null이면 outcome=auth-failed이고 게시 0번', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({getBlogAccessToken: async () => null});

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'auth-failed');
    assert.equal(calls.publishToBlogger, 0);
    assert.equal(calls.runWriter, 0);
  });
});

test('7) runWriter 실패면 outcome=writer-failed이고 앞선 2번의 rejected 뒤에도 멈춤을 쓰지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(
      path.join(blogDir, 'tech-runs.json'),
      JSON.stringify([
        {date: '2026-11-20', startedAt: '2026-11-20T00:00:00Z', outcome: 'rejected', topicId: 'a'},
        {date: '2026-11-23', startedAt: '2026-11-23T00:00:00Z', outcome: 'rejected', topicId: 'b'},
      ]),
    );
    const {deps, calls} = makeBaseDeps({
      runWriter: async () => ({ok: false, error: '시간 초과'}),
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'writer-failed');
    assert.equal(calls.publishToBlogger, 0);
    assert.equal((await readPause(blogDir)).paused, false);
  });
});

test('8) 점검 실패 3번 연속(앞선 2번 + 중간 deferred/writer-failed + 이번)이면 writePause 호출', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(
      path.join(blogDir, 'tech-runs.json'),
      JSON.stringify([
        {date: '2026-11-18', startedAt: '2026-11-18T00:00:00Z', outcome: 'rejected', topicId: 'a'},
        {date: '2026-11-20', startedAt: '2026-11-20T00:00:00Z', outcome: 'rejected', topicId: 'b'},
        {date: '2026-11-22', startedAt: '2026-11-22T00:00:00Z', outcome: 'deferred', topicId: 'c'},
        {date: '2026-11-23', startedAt: '2026-11-23T00:00:00Z', outcome: 'writer-failed', topicId: 'c'},
      ]),
    );
    const {deps, calls} = makeBaseDeps({
      checkTechPost: async () => ({ok: false, problems: [{id: 'slop', text: 'AI 티 검출'}]}),
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'rejected');
    assert.equal(calls.publishToBlogger, 0);
    const pause = await readPause(blogDir);
    assert.equal(pause.paused, true);
    assert.ok(pause.reason.includes('AI 티 검출'));
  });
});

test('8-1) 첫 초안이 탈락해도 고쳐 쓴 두 번째 초안이 통과하면 게시되고 rewrites·firstReasons가 남는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const prompts = [];
    let checks = 0;
    const {deps, calls} = makeBaseDeps({
      runWriter: async ({prompt}) => {
        calls.runWriter += 1;
        prompts.push(prompt);
        return {ok: true, draft: makeDraft()};
      },
      checkTechPost: async () => {
        checks += 1;
        return checks === 1
          ? {ok: false, problems: [{id: 'experience-claim', text: '써 본 척 표현이 포함됐습니다: 써 보'}]}
          : {ok: true, problems: []};
      },
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(res.rewrites, 1);
    assert.deepEqual(res.firstReasons, ['써 본 척 표현이 포함됐습니다: 써 보']);
    assert.equal(calls.runWriter, 2);
    assert.equal(calls.publishToBlogger, 1);
    assert.ok(prompts[1].startsWith(prompts[0]));
    assert.match(prompts[1], /점검에서 탈락했다/);
    assert.match(prompts[1], /- 써 본 척 표현이 포함됐습니다: 써 보/);
    // 다시 쓰기는 새 조사 없이 앞 초안을 고친다(조사부터 다시 하면 10분 한도 초과, 2026-11-27 실제 시험)
    assert.match(prompts[1], /웹 검색·새 조사는 하지 마라/);
    assert.ok(prompts[1].includes(JSON.stringify(makeDraft(), null, 2)), '앞 초안 전체가 프롬프트에 들어가야 한다');
    const runs = await readRuns(blogDir);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].rewrites, 1);
  });
});

test('8-2) 고쳐 써도 두 번째 점검까지 탈락하면 rejected 한 줄만 기록하고 글쓰기는 2번만 부른다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({
      runWriter: async () => {
        calls.runWriter += 1;
        return {ok: true, draft: makeDraft()};
      },
      checkTechPost: async () => ({ok: false, problems: [{id: 'slop', text: 'AI 티 검출'}]}),
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'rejected');
    assert.equal(res.rewrites, 1);
    assert.deepEqual(res.firstReasons, ['AI 티 검출']);
    assert.deepEqual(res.reasons, ['AI 티 검출']);
    assert.equal(calls.runWriter, 2);
    assert.equal(calls.publishToBlogger, 0);
    const runs = await readRuns(blogDir);
    assert.equal(runs.length, 1);
    assert.equal(runs[0].outcome, 'rejected');
  });
});

test('8-3) 앞 실행의 image-deferred로 이어받은 초안이 탈락하면 고쳐 쓰지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await mkdir(path.join(blogDir, 'drafts'), {recursive: true});
    await writeFile(path.join(blogDir, 'drafts', 'dyson-v8-red-blink.json'), JSON.stringify(makeDraft()));
    await appendRun(blogDir, {date: '2026-11-25', startedAt: 'x', outcome: 'image-deferred', topicId: 'dyson-v8-red-blink'});
    const {deps, calls} = makeBaseDeps({
      checkTechPost: async () => ({ok: false, problems: [{id: 'slop', text: 'AI 티 검출'}]}),
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'rejected');
    assert.equal(res.rewrites, undefined);
    assert.equal(calls.runWriter, 0);
  });
});

test('9) 앞선 2번 rejected 뒤에 deferred만 나면 멈춤을 쓰지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(
      path.join(blogDir, 'tech-runs.json'),
      JSON.stringify([
        {date: '2026-11-18', startedAt: '2026-11-18T00:00:00Z', outcome: 'rejected', topicId: 'a'},
        {date: '2026-11-20', startedAt: '2026-11-20T00:00:00Z', outcome: 'rejected', topicId: 'b'},
      ]),
    );
    const {deps} = makeBaseDeps({
      runWriter: async () => ({
        ok: true,
        draft: makeDraft('dyson-v8-red-blink', {query: '다이슨 V8 어댑터 26.1V', mustHave: ['어댑터'], why: '교체용', required: true}),
      }),
      searchProducts: async () => [
        {productId: 9, productName: '다이슨 V8 호환 어댑터 26.1V', productUrl: 'https://www.coupang.com/vp/9'},
      ],
      deeplink: async () => {
        throw new Error('rate-limit');
      },
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'deferred');
    assert.equal((await readPause(blogDir)).paused, false);
    assert.equal((await readQueue(blogDir)).length, 1);
  });
});

test('10) 필수 상품 링크 실패(맞는 후보 없음/deeplink 오류)면 deferred이고 대기열 그대로; required=false여도 링크를 못 만들면 deferred(모든 글에 쿠팡 링크 1개 이상)', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps: noMatchDeps, calls: noMatchCalls} = makeBaseDeps({
      runWriter: async () => ({
        ok: true,
        draft: makeDraft('dyson-v8-red-blink', {query: '다이슨 V8 어댑터 26.1V', mustHave: ['어댑터'], why: '교체용', required: true}),
      }),
      searchProducts: async () => [
        {productId: 10, productName: '전혀 무관한 청소기 거치대', productUrl: 'https://www.coupang.com/vp/10'},
      ],
    });

    const deferred = await runTechOnce({projectDir, now: KST_WED_2AM, deps: noMatchDeps});
    assert.equal(deferred.outcome, 'deferred');
    assert.equal(noMatchCalls.publishToBlogger, 0);
    assert.equal((await readQueue(blogDir)).length, 1);

    const {deps: optionalDeps, calls: optionalCalls} = makeBaseDeps({
      runWriter: async () => ({
        ok: true,
        draft: makeDraft('dyson-v8-red-blink', {query: '다이슨 V8 어댑터 26.1V', mustHave: ['어댑터'], why: '보조', required: false}),
      }),
      searchProducts: async () => {
        throw new Error('API error');
      },
    });
    const stillDeferred = await runTechOnce({projectDir, now: KST_WED_2AM, deps: optionalDeps});
    assert.equal(stillDeferred.outcome, 'deferred');
    assert.equal(optionalCalls.publishToBlogger, 0);
    assert.equal((await readPosts(blogDir)).length, 0);

    const {deps: nullDeps, calls: nullCalls} = makeBaseDeps({
      runWriter: async () => ({ok: true, draft: makeDraft('dyson-v8-red-blink', null)}),
    });
    const nullProduct = await runTechOnce({projectDir, now: KST_WED_2AM, deps: nullDeps});
    assert.equal(nullProduct.outcome, 'deferred');
    assert.match(nullProduct.reasons[0], /쿠팡 링크가 1개 이상 필요/);
    assert.equal(nullCalls.publishToBlogger, 0);
    assert.equal((await readQueue(blogDir)).length, 1);
  });
});

test('10-1) 무인 실행에서 링크 때문에 미룬 글감은 대기열 맨 뒤로 간다(빼지 않음), 미리보기는 순서를 안 바꾼다', async () => {
  await withProject(async (projectDir, blogDir) => {
    const queueFile = path.join(blogDir, 'tech-queue.json');
    await writeFile(queueFile, JSON.stringify([makeTopic('a-topic'), makeTopic('b-topic')]));
    const noLink = () => makeBaseDeps({
      runWriter: async () => ({ok: true, draft: makeDraft('a-topic', null)}),
    }).deps;

    const preview = await runTechOnce({projectDir, now: KST_WED_2AM, mode: 'preview', deps: noLink()});
    assert.equal(preview.outcome, 'deferred');
    assert.deepEqual((await readQueue(blogDir)).map((t) => t.topicId), ['a-topic', 'b-topic']);

    const auto = await runTechOnce({projectDir, now: KST_WED_2AM, deps: noLink()});
    assert.equal(auto.outcome, 'deferred');
    assert.equal(auto.topicId, 'a-topic');
    assert.deepEqual((await readQueue(blogDir)).map((t) => t.topicId), ['b-topic', 'a-topic']);
    assert.equal((await readPause(blogDir)).paused, false);
  });
});

test('10-2) info 글감은 쿠팡 링크 없이도 게시된다(productUrl null)', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([{...makeTopic('dyson-v8-red-blink'), kind: 'info', productHint: null}]));
    const {deps, calls} = makeBaseDeps({
      runWriter: async () => ({ok: true, draft: makeDraft('dyson-v8-red-blink', null)}),
    });
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(calls.publishToBlogger, 1);
    assert.equal((await readPosts(blogDir))[0].productUrl, null);
  });
});

test('10-3) 그림 단계가 실패하면 image-deferred, 게시·큐 이동 없음, 3번 연속이면 멈춤', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({
      produceHero: async () => ({ok: false, stage: 'pick', reasons: ['그림 만들기 실패: 로그아웃']}),
    });
    const first = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(first.outcome, 'image-deferred');
    assert.match(first.reasons[0], /로그아웃/);
    assert.equal(calls.publishToBlogger, 0);
    assert.equal((await readQueue(blogDir)).length, 1);
    assert.equal((await readPause(blogDir)).paused, false);

    for (let i = 0; i < 2; i += 1) {
      const again = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
      assert.equal(again.outcome, 'image-deferred');
    }
    assert.equal((await readPause(blogDir)).paused, true);
  });
});

test('10-4) 이전 실행이 image-deferred였고 초안 파일이 남아 있으면 글쓰기를 건너뛰고 그림부터 다시 한다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await mkdir(path.join(blogDir, 'drafts'), {recursive: true});
    await writeFile(path.join(blogDir, 'drafts', 'dyson-v8-red-blink.json'), JSON.stringify(makeDraft()));
    await appendRun(blogDir, {date: '2026-11-25', startedAt: 'x', outcome: 'image-deferred', topicId: 'dyson-v8-red-blink'});
    const {deps, calls} = makeBaseDeps();
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(calls.runWriter, 0);
    assert.equal(calls.produceHero, 1);
    assert.equal(calls.publishToBlogger, 1);
  });
});

test('10-5) 게시 글에 대표 그림이 들어가고 기록에 hero가 남는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    let publishedHtml = '';
    const {deps} = makeBaseDeps({
      publishToBlogger: async ({html, blogId, title}) => {
        publishedHtml = html;
        return {postId: 'p1', url: `https://tech.d40m.com/${blogId}/${encodeURIComponent(title)}.html`};
      },
    });
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.ok(publishedHtml.includes(`<img src="${FAKE_HERO.url}"`));
    const post = (await readPosts(blogDir))[0];
    assert.equal(post.hero.url, FAKE_HERO.url);
    assert.equal(post.hero.hash, FAKE_HERO.hash);
    assert.deepEqual(post.hero.brief, FAKE_HERO.brief);
  });
});

test('11) 정상 auto 흐름: 후보 저장·상품 선택·딥링크·게시·appendPost·shiftQueue·syncBlogData 1회씩', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic(), makeTopic('next-topic')]));
    const {deps, calls} = makeBaseDeps({
      runWriter: async () => {
        calls.runWriter += 1;
        return {
          ok: true,
          draft: makeDraft('dyson-v8-red-blink', {
            query: '다이슨 V8 어댑터 26.1V',
            why: '규격 맞는 어댑터 확인',
            required: true,
          }),
        };
      },
      searchProducts: async (_q, opts) => {
        calls.searchProducts += 1;
        assert.equal(opts.limit, 10);
        return [
          {productId: 101, productName: '타사 충전기', productUrl: 'https://www.coupang.com/vp/101'},
          {productId: 202, productName: '다이슨 V8 정격 호환 어댑터 26.1V', productUrl: 'https://www.coupang.com/vp/202'},
        ];
      },
      deeplink: async (urls) => {
        calls.deeplink += 1;
        assert.deepEqual(urls, ['https://www.coupang.com/vp/202']);
        return [{originalUrl: urls[0], shortenUrl: 'https://link.coupang.com/a/matched202'}];
      },
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(calls.publishToBlogger, 1);
    // 임시 글로 만들고 → 주소·검색 설명 넣고 → 게시(2026-11-27)
    assert.equal(calls.publishToBloggerArgs[0].isDraft, true);
    assert.equal(calls.applyPostSettings, 1);
    assert.deepEqual(
      {permalink: calls.applyPostSettingsArgs[0].permalink, description: calls.applyPostSettingsArgs[0].description, postId: calls.applyPostSettingsArgs[0].postId},
      {permalink: 'dyson-v8-red-blink', description: '다이슨 V8 빨간불이 깜빡이면 충전 어댑터 연결부터 확인합니다.', postId: 'post-101'},
    );
    assert.equal(calls.publishDraft, 1);
    assert.equal(res.url, 'https://tech.d40m.com/2026/11/dyson-v8-red-blink.html');
    assert.equal(res.reasons, undefined);
    assert.equal(calls.verifyLive, 1);
    assert.equal(calls.deeplink, 1);
    assert.equal(calls.syncBlogData, 1);

    const posts = await readPosts(blogDir);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].topicId, 'dyson-v8-red-blink');
    assert.equal(posts[0].productUrl, 'https://link.coupang.com/a/matched202');
    assert.equal(posts[0].cluster, '큰 가전 설치 전 확인'); // 같은 갈래 링크 후보를 고르는 데 쓴다(2026-11-27)
    assert.equal(calls.collectSearchConsole, 1); // 무인 실행마다 서치 콘솔 실적·색인 수집(2026-11-27)

    const queue = await readQueue(blogDir);
    assert.deepEqual(queue.map((t) => t.topicId), ['next-topic']);

    const savedDraft = JSON.parse(
      await readFile(path.join(blogDir, 'drafts', 'dyson-v8-red-blink.json'), 'utf8'),
    );
    assert.equal(savedDraft.product.chosenProductId, 202);
    assert.equal(savedDraft.product.candidates.length, 2);
  });
});

test('11b) searchProducts 결과 주소가 이미 https://link.coupang.com/이면 deeplink 호출을 생략한다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({
      runWriter: async () => ({
        ok: true,
        draft: makeDraft('dyson-v8-red-blink', {query: '다이슨 V8 어댑터', why: '교체', required: true}),
      }),
      searchProducts: async () => [
        {productId: 303, productName: '다이슨 V8 호환 어댑터', productUrl: 'https://link.coupang.com/a/alreadyShort'},
      ],
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(calls.deeplink, 0);
    assert.equal((await readPosts(blogDir))[0].productUrl, 'https://link.coupang.com/a/alreadyShort');
  });
});

test('12) preview 모드: publishToBlogger/syncBlogData 0번, output/blog/preview/<topicId>.html 생성, outcome=preview', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, mode: 'preview', deps});
    assert.equal(res.outcome, 'preview');
    assert.equal(calls.publishToBlogger, 0);
    assert.equal(calls.syncBlogData, 0);
    assert.equal((await readQueue(blogDir)).length, 1);
    assert.equal((await readPosts(blogDir)).length, 0);

    const previewFile = path.join(projectDir, 'output', 'blog', 'preview', 'dyson-v8-red-blink.html');
    assert.equal(existsSync(previewFile), true);
    const html = await readFile(previewFile, 'utf8');
    assert.ok(html.includes(DISCLOSURE));
  });
});

test('13) publish-draft 모드: 글쓰기를 건너뛰고 지정한 초안 파일을 점검·게시한다', async () => {
  await withProject(async (projectDir, blogDir) => {
    const draftRel = 'data/blog/drafts/ready-post.json';
    const draftAbs = path.join(projectDir, draftRel);
    await mkdir(path.dirname(draftAbs), {recursive: true});
    await writeFile(draftAbs, JSON.stringify(makeDraft('ready-post')), 'utf8');
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic('ready-post')]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({
      projectDir,
      now: KST_WED_2AM,
      mode: 'publish-draft',
      draftPath: draftRel,
      deps,
    });
    assert.equal(res.outcome, 'published');
    assert.equal(calls.runWriter, 0);
    assert.equal(calls.publishToBlogger, 1);
    assert.equal(calls.syncBlogData, 1);
    assert.equal((await readQueue(blogDir)).length, 0);
    assert.equal((await readPosts(blogDir))[0].topicId, 'ready-post');
  });
});

// ---- 2026-11-27: PC 2대 무인 실행(켜져 있는 PC가 실행) ----

const OTHER_PC_TODAY = {date: '2026-11-25', startedAt: '2026-11-24T17:00:00Z', outcome: 'published', topicId: 'x', host: OTHER_HOST};

test('14) 오늘 다른 PC(host)가 이미 돌았으면 other-pc-ran으로 쉰다: 글쓰기·올리기 0번, 받기는 1번', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(path.join(blogDir, 'tech-runs.json'), JSON.stringify([OTHER_PC_TODAY]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'other-pc-ran');
    assert.equal(res.otherHost, OTHER_HOST);
    assert.equal(res.host, HOME_HOST);
    assert.equal(calls.gitPull, 1);
    assert.equal(calls.runWriter, 0);
    assert.equal(calls.publishToBlogger, 0);
    assert.equal(calls.syncBlogData, 0);
  });
});

test('14-1) 같은 PC가 오늘 남긴 기록, host 없는 옛 기록, 다른 날 다른 PC 기록은 쉬는 이유가 아니다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(
      path.join(blogDir, 'tech-runs.json'),
      JSON.stringify([
        {date: '2026-11-25', startedAt: '2026-11-24T16:00:00Z', outcome: 'deferred', topicId: 'a', host: HOME_HOST},
        {date: '2026-11-25', startedAt: '2026-11-24T16:30:00Z', outcome: 'deferred', topicId: 'a'},
        {...OTHER_PC_TODAY, date: '2026-11-23'},
      ]),
    );
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(calls.runWriter, 1);
  });
});

test('14-2) preview 모드는 다른 PC 기록이 있어도 쉬지 않고 받기도 하지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await writeFile(path.join(blogDir, 'tech-runs.json'), JSON.stringify([OTHER_PC_TODAY]));
    const {deps, calls} = makeBaseDeps();

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, mode: 'preview', deps});
    assert.equal(res.outcome, 'preview');
    assert.equal(calls.gitPull, 0);
    assert.equal(calls.syncBlogData, 0);
  });
});

test('15) 올리기 직전 블로거에 오늘 글이 이미 있으면 already-posted-today로 끝내고 publishToBlogger는 0번', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    let liveArgs = null;
    const {deps, calls} = makeBaseDeps({
      listTodayLivePosts: async (args) => {
        calls.listTodayLivePosts += 1;
        liveArgs = args;
        return [{id: '1', title: '다른 PC가 올린 글', url: 'https://tech.d40m.com/x.html'}];
      },
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'already-posted-today');
    assert.deepEqual(res.reasons, ['블로거에 오늘 올라간 글이 이미 있습니다: 다른 PC가 올린 글']);
    assert.equal(calls.publishToBlogger, 0);
    assert.equal(calls.listTodayLivePosts, 1);
    assert.deepEqual(liveArgs, {token: 'tok-valid', blogId: '6595948324958151051', date: '2026-11-25'});
    assert.equal(calls.syncBlogData, 1, '이 결과도 올린다');
    assert.equal((await readPosts(blogDir)).length, 0);
    assert.equal((await readQueue(blogDir)).length, 1, '대기열은 그대로');
  });
});

test('15-1) 블로거 확인이 실패하면 게시를 멈추지 않고 liveCheckFailed만 남긴다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({
      listTodayLivePosts: async () => {
        calls.listTodayLivePosts += 1;
        throw new Error('Blogger 글 목록 조회 실패(HTTP 500)');
      },
    });

    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(res.liveCheckFailed, true);
    assert.equal(calls.publishToBlogger, 1);
    assert.equal((await readRuns(blogDir)).at(-1).liveCheckFailed, true);
  });
});

test('15-2) preview·publish-draft 모드는 블로거 오늘 글 확인을 하지 않는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    const draftRel = 'data/blog/drafts/ready-post.json';
    const draftAbs = path.join(projectDir, draftRel);
    await mkdir(path.dirname(draftAbs), {recursive: true});
    await writeFile(draftAbs, JSON.stringify(makeDraft('ready-post')), 'utf8');
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic('ready-post')]));
    const {deps, calls} = makeBaseDeps();

    assert.equal((await runTechOnce({projectDir, now: KST_WED_2AM, mode: 'preview', deps})).outcome, 'preview');
    assert.equal(
      (await runTechOnce({projectDir, now: KST_WED_2AM, mode: 'publish-draft', draftPath: draftRel, deps})).outcome,
      'published',
    );
    assert.equal(calls.listTodayLivePosts, 0);
  });
});

test('16) auto 모드는 rejected·deferred·published 결과를 각각 한 번씩 올리고, 모든 기록에 host가 있다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));

    const rejected = makeBaseDeps({checkTechPost: async () => ({ok: false, problems: [{id: 'slop', text: 'AI 티 검출'}]})});
    const r1 = await runTechOnce({projectDir, now: KST_WED_2AM, deps: rejected.deps});
    assert.equal(r1.outcome, 'rejected');
    assert.equal(rejected.calls.syncBlogData, 1);
    assert.deepEqual(rejected.calls.syncBlogDataArgs[0], {projectDir, now: KST_WED_2AM, outcome: 'rejected', host: HOME_HOST});

    const deferred = makeBaseDeps({runWriter: async () => ({ok: true, draft: makeDraft('dyson-v8-red-blink', null)})});
    const r2 = await runTechOnce({projectDir, now: KST_WED_2AM, deps: deferred.deps});
    assert.equal(r2.outcome, 'deferred');
    assert.equal(deferred.calls.syncBlogData, 1);

    const published = makeBaseDeps();
    const r3 = await runTechOnce({projectDir, now: KST_WED_2AM, deps: published.deps});
    assert.equal(r3.outcome, 'published');
    assert.equal(published.calls.syncBlogData, 1);

    const runs = await readRuns(blogDir);
    assert.deepEqual(runs.map((r) => r.outcome), ['rejected', 'deferred', 'published']);
    assert.ok(runs.every((r) => r.host === HOME_HOST));
  });
});

test('16-1) 대기열 비어 있음·쉬는 날·멈춤 결과도 auto에서는 올리고 host가 붙는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    const queueEmpty = makeBaseDeps();
    const q = await runTechOnce({projectDir, now: KST_WED_2AM, deps: queueEmpty.deps});
    assert.equal(q.outcome, 'queue-empty');
    assert.equal(queueEmpty.calls.syncBlogData, 1);

    const notDay = makeBaseDeps();
    const n = await runTechOnce({projectDir, now: KST_THU_10AM, deps: notDay.deps});
    assert.equal(n.outcome, 'not-writing-day');
    assert.equal(notDay.calls.syncBlogData, 1);

    await writePause(blogDir, '연속 실패', KST_WED_2AM);
    const paused = makeBaseDeps();
    const p = await runTechOnce({projectDir, now: KST_WED_2AM, deps: paused.deps});
    assert.equal(p.outcome, 'paused');
    assert.equal(paused.calls.syncBlogData, 1);
    assert.ok((await readRuns(blogDir)).every((r) => r.host === HOME_HOST));
  });
});

test('16-2) preview 모드는 올리지 않고, 기록에는 host가 붙는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps();
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, mode: 'preview', deps});
    assert.equal(res.outcome, 'preview');
    assert.equal(res.host, HOME_HOST);
    assert.equal(calls.syncBlogData, 0);
  });
});

test('16-3) 올리기가 실패해도 결과는 그대로이고 반환값에만 syncError가 붙는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps} = makeBaseDeps({
      syncBlogData: async () => {
        throw new Error('푸시 실패');
      },
    });
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(res.syncError, '푸시 실패');
    assert.equal('syncError' in (await readRuns(blogDir)).at(-1), false);
  });
});

test('17) 시작할 때 받기가 실패해도 계속 진행하고 기록에 pullFailed가 남는다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({
      gitPull: async () => {
        calls.gitPull += 1;
        return {ok: false, error: '네트워크 없음'};
      },
    });
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(res.pullFailed, true);
    assert.equal(calls.gitPull, 1);
    assert.equal((await readRuns(blogDir)).at(-1).pullFailed, true);
  });
});

test('17-1) 받기가 예외를 던져도 계속 진행하고, 받기에 성공하면 pullFailed가 없다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const thrown = makeBaseDeps({
      gitPull: async () => {
        throw new Error('git 없음');
      },
    });
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps: thrown.deps});
    assert.equal(res.outcome, 'published');
    assert.equal(res.pullFailed, true);

    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    await rm(path.join(blogDir, 'tech-posts.json'), {force: true});
    await rm(path.join(blogDir, 'tech-runs.json'), {force: true});
    const ok = makeBaseDeps();
    const res2 = await runTechOnce({projectDir, now: KST_WED_2AM, deps: ok.deps});
    assert.equal(res2.outcome, 'published');
    assert.equal('pullFailed' in res2, false);
  });
});

test('11-1) 주소·검색 설명 넣기가 실패해도 게시하고 경고만 남긴다', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic()]));
    const {deps, calls} = makeBaseDeps({
      applyPostSettings: async () => {
        throw new Error('이 블로그 편집 화면을 여는 구글 계정을 자동화용 크롬에서 찾지 못했습니다(로그인 필요).');
      },
    });
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(calls.publishDraft, 1);
    assert.equal(res.url, 'https://tech.d40m.com/2026/11/blog-post.html');
    assert.ok(res.reasons.some((r) => r.includes('글 주소·검색 설명을 넣지 못했습니다')));
    assert.ok(res.reasons.some((r) => r.includes('정한 이름(dyson-v8-red-blink)과 다릅니다')));
    const post = (await readPosts(blogDir))[0];
    assert.equal(post.description, '다이슨 V8 빨간불이 깜빡이면 충전 어댑터 연결부터 확인합니다.');
  });
});

test('11-2) --allow-second-today·--topic: 오늘 글이 있어도 손으로 고른 주제를 올린다(무인 기본값은 그대로 막음)', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic('first-topic'), makeTopic()]));
    await writeFile(path.join(blogDir, 'tech-posts.json'), JSON.stringify([{date: '2026-11-25', topicId: 'old', title: '오늘 먼저 올린 글', url: 'u', postId: 'p'}]));
    const blocked = await runTechOnce({projectDir, now: KST_WED_2AM, deps: makeBaseDeps().deps});
    assert.equal(blocked.outcome, 'already-posted-today');

    const {deps, calls} = makeBaseDeps({listTodayLivePosts: async () => [{id: '1', title: '오늘 먼저 올린 글'}]});
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps, allowSecondToday: true, topicPick: 'dyson-v8-red-blink'});
    assert.equal(res.outcome, 'published');
    assert.equal(res.topicId, 'dyson-v8-red-blink');
    assert.equal(calls.publishDraft, 1);
    assert.deepEqual((await readQueue(blogDir)).map((t) => t.topicId), ['first-topic']);

    const missing = await runTechOnce({projectDir, now: KST_WED_2AM, deps: makeBaseDeps().deps, allowSecondToday: true, topicPick: 'nope'});
    assert.equal(missing.outcome, 'topic-not-in-queue');
  });
});

test('서치 콘솔 수집이 실패해도 게시 결과는 그대로이고 searchConsoleError만 남는다(2026-11-27)', async () => {
  await withProject(async (projectDir, blogDir) => {
    await writeFile(path.join(blogDir, 'tech-queue.json'), JSON.stringify([makeTopic(), makeTopic('next-topic')]));
    const {deps, calls} = makeBaseDeps({
      collectSearchConsole: async () => { throw new Error('서치 콘솔 응답 오류(403)'); },
    });
    const res = await runTechOnce({projectDir, now: KST_WED_2AM, deps});
    assert.equal(res.outcome, 'published');
    assert.equal(res.searchConsoleError, '서치 콘솔 응답 오류(403)');
    assert.equal(calls.syncBlogData, 1);
  });
});
