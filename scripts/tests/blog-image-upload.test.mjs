import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSubject, parseBloggerImageUrl, buildImageUrl, sendHeroEmail,
  findDraftBySubject, deleteDraft, uploadHeroViaEmail,
} from '../blog/blogger-image-upload.mjs';

const FAKE_TO = 'test.secret@blogger.com';
const BASE = 'https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgabc123';
const URL_S320 = `${BASE}/s320/hero-test.jpg`;

test('makeSubject: HERO-<topicId>-<epoch ms> 형식', () => {
  assert.equal(makeSubject('topic-a', 1234567890), 'HERO-topic-a-1234567890');
  assert.equal(makeSubject('t', new Date(5000)), 'HERO-t-5000');
});

test('parseBloggerImageUrl / buildImageUrl 왕복', () => {
  const parsed = parseBloggerImageUrl(URL_S320);
  assert.deepEqual(parsed, {base: BASE, fileName: 'hero-test.jpg'});
  assert.equal(buildImageUrl(parsed.base, parsed.fileName, 's1600'), `${BASE}/s1600/hero-test.jpg`);
  assert.equal(buildImageUrl(parsed.base, parsed.fileName, 'og'), `${BASE}/w1200-h630-p-k-no-nu/hero-test.jpg`);
  assert.equal(buildImageUrl(parsed.base, parsed.fileName, 'w1200'), `${BASE}/w1200/hero-test.jpg`);
  // 다른 크기 접미사 주소도 같은 기준으로 나뉜다
  assert.deepEqual(parseBloggerImageUrl(`${BASE}/w1200-h630-p-k-no-nu/hero-test.jpg`), parsed);
  assert.throws(() => buildImageUrl(BASE, 'a.jpg', 'huge'));
});

test('parseBloggerImageUrl: 형식이 다르면 null', () => {
  assert.equal(parseBloggerImageUrl('https://example.com/a/s320/x.jpg'), null);
  assert.equal(parseBloggerImageUrl(`${BASE}/hero-test.jpg`), null);
  assert.equal(parseBloggerImageUrl(''), null);
  assert.equal(parseBloggerImageUrl(undefined), null);
});

// ---- 임시 글 찾기 ----------------------------------------------------------
const listResponse = (items) => ({ok: true, status: 200, json: async () => ({items})});

test('findDraftBySubject: 처음엔 비었다가 둘째 조회에서 나타난다', async () => {
  let calls = 0;
  const sleeps = [];
  const fetchImpl = async (url, opts) => {
    calls += 1;
    assert.match(url, /status=draft/);
    assert.match(url, /fetchImages=true/);
    assert.equal(opts.headers.Authorization, 'Bearer tok');
    return calls === 1
      ? listResponse([])
      : listResponse([{id: 'p1', title: 'HERO-a-1', images: [{url: URL_S320}]}]);
  };
  const r = await findDraftBySubject({
    blogId: 'b1', subject: 'HERO-a-1', token: 'tok', fetchImpl, sleep: async (ms) => { sleeps.push(ms); },
    intervalMs: 10, timeoutMs: 100,
  });
  assert.deepEqual(r, {ok: true, draftPostId: 'p1', imageUrl: URL_S320, base: BASE, fileName: 'hero-test.jpg'});
  assert.equal(calls, 2);
  assert.deepEqual(sleeps, [10]);
});

test('findDraftBySubject: 제한 시간이 지나면 draft-timeout', async () => {
  let calls = 0;
  const r = await findDraftBySubject({
    blogId: 'b1', subject: 'HERO-a-1', token: 'tok',
    fetchImpl: async () => { calls += 1; return listResponse([{id: 'x', title: '다른 글', images: []}]); },
    sleep: async () => {}, intervalMs: 10, timeoutMs: 30,
  });
  assert.deepEqual(r, {ok: false, error: 'draft-timeout'});
  assert.equal(calls, 4); // 0, 10, 20, 30에서 조회
});

test('findDraftBySubject: 그림 없는 임시 글은 draft-no-image와 글 번호', async () => {
  const r = await findDraftBySubject({
    blogId: 'b1', subject: 'HERO-a-1', token: 'tok',
    fetchImpl: async () => listResponse([{id: 'p9', title: 'HERO-a-1', content: '<p>글만</p>'}]),
    sleep: async () => {}, intervalMs: 10, timeoutMs: 100,
  });
  assert.deepEqual(r, {ok: false, error: 'draft-no-image', draftPostId: 'p9'});
});

test('findDraftBySubject: 조회 오류·실패 응답은 다음 주기에 다시 시도', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) throw new Error('network');
    if (calls === 2) return {ok: false, status: 500, json: async () => ({})};
    return listResponse([{id: 'p2', title: 'HERO-a-1', images: [{url: URL_S320}]}]);
  };
  const r = await findDraftBySubject({
    blogId: 'b1', subject: 'HERO-a-1', token: 'tok', fetchImpl, sleep: async () => {}, intervalMs: 10, timeoutMs: 100,
  });
  assert.equal(r.ok, true);
  assert.equal(calls, 3);
});

// ---- 임시 글 삭제 ----------------------------------------------------------
test('deleteDraft: 204면 ok, 그 밖은 실패, 던지지 않는다', async () => {
  let seen;
  const ok = await deleteDraft({
    blogId: 'b1', draftPostId: 'p1', token: 'tok',
    fetchImpl: async (url, opts) => { seen = {url, method: opts.method}; return {status: 204}; },
  });
  assert.deepEqual(ok, {ok: true});
  assert.equal(seen.method, 'DELETE');
  assert.match(seen.url, /blogs\/b1\/posts\/p1$/);
  const bad = await deleteDraft({blogId: 'b1', draftPostId: 'p1', token: 'tok', fetchImpl: async () => ({status: 403})});
  assert.deepEqual(bad, {ok: false, error: 'delete-status-403'});
  const thrown = await deleteDraft({blogId: 'b1', draftPostId: 'p1', token: 'tok', fetchImpl: async () => { throw new Error('boom'); }});
  assert.equal(thrown.ok, false);
});

// ---- uploadHeroViaEmail ----------------------------------------------------
const makeDeps = (overrides = {}) => {
  const calls = [];
  const deps = {
    now: () => 1000,
    sendHeroEmail: async (a) => { calls.push(['send', a.subject, a.to]); return {ok: true}; },
    findDraftBySubject: async (a) => {
      calls.push(['find', a.subject]);
      return {ok: true, draftPostId: 'p1', imageUrl: URL_S320, base: BASE, fileName: 'hero-test.jpg'};
    },
    deleteDraft: async (a) => { calls.push(['delete', a.draftPostId]); return {ok: true}; },
    ...overrides,
  };
  return {deps, calls};
};
const baseArgs = {imagePath: 'x/hero-test.jpg', topicId: 'tp', blogId: 'b1', token: 'tok', postEmail: FAKE_TO};

test('uploadHeroViaEmail: 성공 흐름은 보내기 -> 찾기 -> 삭제 순서', async () => {
  const {deps, calls} = makeDeps();
  const r = await uploadHeroViaEmail({...baseArgs, deps});
  assert.deepEqual(calls, [['send', 'HERO-tp-1000', FAKE_TO], ['find', 'HERO-tp-1000'], ['delete', 'p1']]);
  assert.deepEqual(r, {
    ok: true, base: BASE, fileName: 'hero-test.jpg', draftDeleted: true,
    urls: {s1600: `${BASE}/s1600/hero-test.jpg`, og: `${BASE}/w1200-h630-p-k-no-nu/hero-test.jpg`},
  });
});

test('uploadHeroViaEmail: 삭제가 실패해도 그림 주소는 돌려주고 draftDeleted=false', async () => {
  const {deps} = makeDeps({deleteDraft: async () => ({ok: false, error: 'delete-status-500'})});
  const r = await uploadHeroViaEmail({...baseArgs, deps});
  assert.equal(r.ok, true);
  assert.equal(r.draftDeleted, false);
});

test('uploadHeroViaEmail: 찾기 시간 초과면 stage=find, 지울 글이 없어 삭제하지 않는다', async () => {
  const {deps, calls} = makeDeps({findDraftBySubject: async () => ({ok: false, error: 'draft-timeout'})});
  const r = await uploadHeroViaEmail({...baseArgs, deps});
  assert.deepEqual(r, {ok: false, stage: 'find', error: 'draft-timeout', draftPostId: null, draftDeleted: false});
  assert.deepEqual(calls.map((c) => c[0]), ['send']);
});

test('uploadHeroViaEmail: 그림 없는 임시 글이 남았으면 삭제를 시도한다', async () => {
  const {deps, calls} = makeDeps({findDraftBySubject: async () => ({ok: false, error: 'draft-no-image', draftPostId: 'p9'})});
  const r = await uploadHeroViaEmail({...baseArgs, deps});
  assert.deepEqual(r, {ok: false, stage: 'find', error: 'draft-no-image', draftPostId: 'p9', draftDeleted: true});
  assert.deepEqual(calls.at(-1), ['delete', 'p9']);
});

test('uploadHeroViaEmail: 보내기 실패면 stage=send, 찾기·삭제를 부르지 않고 주소를 드러내지 않는다', async () => {
  const {deps, calls} = makeDeps({
    sendHeroEmail: async () => ({ok: false, error: 'attach-failed', detail: `could not reach ${FAKE_TO}`}),
  });
  const r = await uploadHeroViaEmail({...baseArgs, deps});
  assert.equal(r.ok, false);
  assert.equal(r.stage, 'send');
  assert.equal(r.error, 'attach-failed');
  assert.ok(!JSON.stringify(r).includes(FAKE_TO));
  assert.deepEqual(calls, []);
});

test('uploadHeroViaEmail: 필수 인자가 빠지면 stage=args', async () => {
  const {deps, calls} = makeDeps();
  const r = await uploadHeroViaEmail({...baseArgs, postEmail: null, deps});
  assert.deepEqual(r, {ok: false, stage: 'args', error: 'missing-postEmail'});
  assert.deepEqual(calls, []);
});

// ---- sendHeroEmail (가짜 크롬) ----------------------------------------------
const makeFakeBrowser = ({url = 'https://mail.google.com/mail/u/1/?view=cm', fileInputs = 1, bodyText = '', attachShows = true, clickThrows = false} = {}) => {
  const log = {goto: null, files: null, clicked: false, pageClosed: false, browserClosed: false, newPages: 0};
  const page = {
    setViewportSize: async () => {},
    goto: async (u) => { log.goto = u; },
    waitForTimeout: async () => {},
    url: () => url,
    locator: (sel) => {
      assert.equal(sel, 'input[type=file]');
      return {
        count: async () => fileInputs,
        first: () => ({setInputFiles: async (f) => { log.files = f; }}),
      };
    },
    innerText: async () => (attachShows && log.files ? `${bodyText} ${String(log.files).split(/[\\/]/).pop()} 보내기` : bodyText),
    getByRole: (role, opts) => {
      assert.equal(role, 'button');
      assert.ok(opts.name.test('보내기'));
      return {first: () => ({click: async () => { if (clickThrows) throw new Error(`click failed for ${FAKE_TO}`); log.clicked = true; }})};
    },
    close: async () => { log.pageClosed = true; },
  };
  const browser = {
    contexts: () => [{newPage: async () => { log.newPages += 1; return page; }}],
    close: async () => { log.browserClosed = true; },
  };
  return {connect: async () => browser, log};
};
const sendArgs = {imagePath: 'C:/tmp/hero-test.jpg', subject: 'HERO-tp-1000', to: FAKE_TO, loadWaitMs: 0, attachTimeoutMs: 2000, sendWaitMs: 0};

test('sendHeroEmail: 성공하면 작성 창 주소에 제목·받는 주소가 들어가고 보내기를 누른 뒤 페이지만 닫는다', async () => {
  const {connect, log} = makeFakeBrowser();
  const r = await sendHeroEmail({...sendArgs, accountIndex: 1, connect});
  assert.deepEqual(r, {ok: true});
  assert.match(log.goto, /^https:\/\/mail\.google\.com\/mail\/u\/1\/\?view=cm&fs=1&to=/);
  assert.ok(log.goto.includes(encodeURIComponent(FAKE_TO)));
  assert.ok(log.goto.includes('su=HERO-tp-1000'));
  assert.equal(log.files, 'C:/tmp/hero-test.jpg');
  assert.equal(log.clicked, true);
  assert.equal(log.pageClosed, true);
  assert.equal(log.newPages, 1);
});

test('sendHeroEmail: 로그인 안 됐으면(accounts.google.com) gmail-not-ready, 보내지 않는다', async () => {
  const {connect, log} = makeFakeBrowser({url: 'https://accounts.google.com/v3/signin'});
  const r = await sendHeroEmail({...sendArgs, connect});
  assert.deepEqual(r, {ok: false, error: 'gmail-not-ready'});
  assert.equal(log.clicked, false);
  assert.equal(log.pageClosed, true);
});

test('sendHeroEmail: 첨부 입력칸이 없으면 gmail-not-ready', async () => {
  const {connect} = makeFakeBrowser({fileInputs: 0});
  const r = await sendHeroEmail({...sendArgs, connect});
  assert.deepEqual(r, {ok: false, error: 'gmail-not-ready'});
});

test('sendHeroEmail: 첨부 이름이 화면에 안 나타나면 attach-failed, 보내지 않는다', async () => {
  const {connect, log} = makeFakeBrowser({attachShows: false});
  const r = await sendHeroEmail({...sendArgs, attachTimeoutMs: 3000, connect});
  assert.deepEqual(r, {ok: false, error: 'attach-failed'});
  assert.equal(log.clicked, false);
});

test('sendHeroEmail: 보내기 단추에서 예외가 나면 send-failed이고 오류 문구에 주소가 없다', async () => {
  const {connect, log} = makeFakeBrowser({clickThrows: true});
  const r = await sendHeroEmail({...sendArgs, connect});
  assert.equal(r.ok, false);
  assert.equal(r.error, 'send-failed');
  assert.ok(!JSON.stringify(r).includes(FAKE_TO));
  assert.equal(log.pageClosed, true);
});

test('sendHeroEmail: 크롬에 연결하지 못해도 던지지 않고 gmail-not-ready', async () => {
  const r = await sendHeroEmail({...sendArgs, connect: async () => { throw new Error('ECONNREFUSED'); }});
  assert.equal(r.ok, false);
  assert.equal(r.error, 'gmail-not-ready');
});
