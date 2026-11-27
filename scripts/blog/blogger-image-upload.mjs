// 블로그 대표 그림을 "이메일로 올려" 블로거 그림 주소를 얻는 모듈.
//
// 왜 이메일인가: 블로거 API(v3)에는 그림 파일을 올리는 기능이 없다. 글 본문에 그림 주소를 넣을 수는 있지만
//   그 주소를 만들어 줄 곳이 없다. 대신 블로거 설정의 "이메일을 임시 글로 저장"을 켜 두면, 게시용 주소로 보낸
//   메일의 첨부 그림이 블로거 서버에 올라가고 그 그림 주소가 임시 글에 붙는다.
// 시험 근거(2026-11-26, tech.d40m.com): 메일 제목=임시 글 제목, 1분 안에 임시 글 생성, API 임시 글 목록
//   (status=draft&fetchImages=true)의 images[].url에 `.../s320/<파일>` 주소가 들어 있다. 크기 접미사를
//   `/s1600/`(원본 크기) 또는 `/w1200-h630-p-k-no-nu/`(1200x630)로 바꿔 쓸 수 있고, 임시 글을 DELETE(204)해도
//   그림 주소는 계속 열린다.
// 흐름: 지메일 작성 창에서 그림을 첨부해 보냄 -> 임시 글 찾기 -> 그림 주소 읽기 -> 임시 글 삭제.
//
// 지메일 화면이 바뀌면 고칠 곳(sendHeroEmail 안의 클릭 지점 4개):
//   1) 작성 창 주소: https://mail.google.com/mail/u/<계정번호>/?view=cm&fs=1&to=&su=&body=
//   2) 첨부 입력칸: `input[type=file]` 중 첫 번째에 setInputFiles
//   3) 첨부 확인: 화면 글(innerText)에 파일 이름이 나타나는지
//   4) 보내기 단추: getByRole('button', {name: /^(보내기|Send)/}) 첫 번째
// 대안: 화면 조작 대신 지메일 API의 보내기 권한(gmail.send)을 받아 같은 메일을 API로 보낼 수도 있다
//   (그러면 크롬 로그인 상태에 기대지 않는다). 지금은 추가 허락 없이 되는 화면 방식을 쓴다.
//
// 게시용 주소(BLOGGER_TECH_POST_EMAIL)는 비밀이다. 이 파일은 그 값을 출력·로그·오류 문구에 쓰지 않는다
// (오류 문구에서는 `[게시용 주소]`로 바꾼다).
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

const BLOGGER_API = 'https://www.googleapis.com/blogger/v3';
const DEFAULT_CDP_URL = 'http://127.0.0.1:9222'; // allow-literal: 자동화용 크롬의 디버그 포트(2026-11-26 시험)
const DEFAULT_ACCOUNT_INDEX = 1; // allow-literal: 시험한 지메일 계정 번호(/u/1), GMAIL_ACCOUNT_INDEX로 바꾼다
const GMAIL_LOAD_WAIT_MS = 7000; // allow-literal: 작성 창이 뜰 때까지 기다린 시간(시험값)
const ATTACH_TIMEOUT_MS = 30000; // allow-literal: 첨부 이름이 화면에 나타날 때까지 최대 대기
const ATTACH_POLL_MS = 1000; // allow-literal: 첨부 확인 주기
const COMPOSE_READY_MS = 30000; // allow-literal: 작성 창 첨부 칸을 더 기다리는 최대 시간(2026-11-27 시험: 7초로 부족한 때가 있었음)
const SEND_WAIT_MS = 5000; // allow-literal: 보내기 단추를 누른 뒤 기다린 시간(시험값)
const SEND_CONFIRM_MS = 60000; // allow-literal: "메시지 전송됨"이 뜰 때까지 최대 대기(2026-11-26 실측: 약 4.5초, 첫 글 시험에서 5초 만에 창을 닫아 메일이 안 나간 일이 있었음)
const SENT_TEXT = /메시지 전송됨|메일을 보냈습니다|Message sent/;
const DRAFT_TIMEOUT_MS = 120000; // allow-literal: 임시 글이 생길 때까지 최대 대기(시험에서는 1분 안)
const DRAFT_INTERVAL_MS = 5000; // allow-literal: 임시 글 조회 주기
const ATTACH_NAME_PREFIX = 15; // allow-literal: 지메일이 긴 파일 이름을 줄여 보여 줄 때를 위한 비교 길이
const REDACTED = '[게시용 주소]';

const SIZE_SEGMENTS = {
  s1600: 's1600', // allow-literal: 원본 크기(시험: 1376x768)
  og: 'w1200-h630-p-k-no-nu', // allow-literal: 공유 미리보기용 1200x630(시험)
  w1200: 'w1200', // allow-literal: 가로 1200
};

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const redact = (text, secret) => {
  const s = String(text ?? '');
  return secret ? s.split(secret).join(REDACTED) : s;
};

/** 메일 제목 표식. 임시 글 제목이 이 값이 되므로 글을 찾는 열쇠다. */
export const makeSubject = (topicId, now = Date.now()) => {
  const ms = now instanceof Date ? now.getTime() : Number(now);
  return `HERO-${topicId}-${ms}`;
};

/** 블로거 그림 주소를 {base, fileName}으로 나눈다. 형식이 다르면 null. */
export const parseBloggerImageUrl = (url) => {
  const m = String(url ?? '').match(/^(https:\/\/[^/]*googleusercontent\.com\/.+)\/[sw]\d+[^/]*\/([^/?#]+)$/);
  if (!m) return null;
  return {base: m[1], fileName: m[2]};
};

/** 기준 주소·파일 이름·크기 이름('s1600' | 'og' | 'w1200')으로 그림 주소를 만든다. */
export const buildImageUrl = (base, fileName, size) => {
  const segment = SIZE_SEGMENTS[size];
  if (!segment) throw new Error(`알 수 없는 크기: ${size}`);
  return `${base}/${segment}/${fileName}`;
};

/** 프로젝트 .env(또는 process.env)에서 게시용 주소를 읽는다. 없으면 null. 값은 어디에도 출력하지 않는다. */
export const loadPostEmail = async (projectDir) => {
  if (process.env.BLOGGER_TECH_POST_EMAIL) return process.env.BLOGGER_TECH_POST_EMAIL;
  const file = path.join(projectDir, '.env');
  if (!existsSync(file)) return null;
  const text = await readFile(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*BLOGGER_TECH_POST_EMAIL\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let value = m[1];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value || null;
  }
  return null;
};

const defaultConnect = async () => {
  const mod = await import('playwright-core');
  const chromium = mod.chromium ?? mod.default?.chromium;
  return chromium.connectOverCDP(process.env.CHROME_CDP_URL || DEFAULT_CDP_URL);
};

/**
 * 지메일 작성 창으로 그림 1장을 첨부해 게시용 주소에 보낸다. 던지지 않고 {ok, error}를 돌려준다.
 * error: 'gmail-not-ready'(로그인 안 됨·작성 창 없음) | 'attach-failed' | 'send-failed'
 * connect: () => 브라우저(Playwright Browser 모양). 기본은 CDP로 열려 있는 크롬에 연결.
 */
export const sendHeroEmail = async ({
  imagePath,
  subject,
  to,
  accountIndex = Number(process.env.GMAIL_ACCOUNT_INDEX) || DEFAULT_ACCOUNT_INDEX,
  connect = defaultConnect,
  loadWaitMs = GMAIL_LOAD_WAIT_MS,
  attachTimeoutMs = ATTACH_TIMEOUT_MS,
  sendWaitMs = SEND_WAIT_MS,
  sendConfirmMs = SEND_CONFIRM_MS,
  composeReadyMs = COMPOSE_READY_MS,
}) => {
  let browser;
  let page;
  let stage = 'gmail-not-ready';
  try {
    browser = await connect();
    const context = browser.contexts()[0];
    if (!context) return {ok: false, error: 'gmail-not-ready'};
    page = await context.newPage(); // 이 페이지만 쓰고 닫는다. 다른 탭은 건드리지 않는다.
    await page.setViewportSize({width: 1300, height: 900}); // allow-literal: 작성 창이 잘리지 않는 화면 크기(시험값)
    const composeUrl = `https://mail.google.com/mail/u/${accountIndex}/?view=cm&fs=1`
      + `&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent('블로그 대표 그림')}`;
    await page.goto(composeUrl, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(loadWaitMs);
    const url = page.url();
    if (url.includes('accounts.google.com') || !url.includes('mail.google.com')) {
      return {ok: false, error: 'gmail-not-ready'};
    }
    const fileInput = page.locator('input[type=file]').first();
    // 그림을 만든 직후처럼 크롬이 바쁘면 작성 창이 늦게 뜬다(2026-11-27 노트북 시험: 7초 판정에서 gmail-not-ready, 다시 열면 정상).
    // 첨부 칸이 생길 때까지 조금 더 기다린다.
    let readyWaited = 0;
    while ((await page.locator('input[type=file]').count()) === 0 && readyWaited < composeReadyMs) {
      await page.waitForTimeout(ATTACH_POLL_MS);
      readyWaited += ATTACH_POLL_MS;
    }
    if ((await page.locator('input[type=file]').count()) === 0) return {ok: false, error: 'gmail-not-ready', detail: `작성 창 첨부 칸 없음(${loadWaitMs + readyWaited}ms 대기, ${new URL(page.url()).pathname})`};

    stage = 'attach-failed';
    await fileInput.setInputFiles(imagePath);
    const fileName = path.basename(imagePath);
    const needle = fileName.length > ATTACH_NAME_PREFIX ? fileName.slice(0, ATTACH_NAME_PREFIX) : fileName;
    let attached = false;
    for (let waited = 0; waited <= attachTimeoutMs; waited += ATTACH_POLL_MS) {
      const body = String(await page.innerText('body')).replace(/\s+/g, ' ');
      if (body.includes(needle)) { attached = true; break; }
      await page.waitForTimeout(ATTACH_POLL_MS);
    }
    if (!attached) return {ok: false, error: 'attach-failed'};

    stage = 'send-failed';
    await page.getByRole('button', {name: /^(보내기|Send)/}).first().click();
    await page.waitForTimeout(sendWaitMs);
    // 보냈다는 표시가 뜰 때까지 기다린다. 표시 전에 창을 닫으면 메일이 취소될 수 있다.
    if (sendConfirmMs > 0) {
      let confirmed = false;
      for (let waited = 0; waited <= sendConfirmMs; waited += ATTACH_POLL_MS) {
        const body = String(await page.innerText('body'));
        if (SENT_TEXT.test(body)) { confirmed = true; break; }
        await page.waitForTimeout(ATTACH_POLL_MS);
      }
      if (!confirmed) return {ok: false, error: 'send-failed', detail: 'sent-not-confirmed'};
    }
    return {ok: true};
  } catch (err) {
    return {ok: false, error: stage, detail: redact(err?.message, to)};
  } finally {
    try { if (page) await page.close(); } catch { /* 이미 닫힘 */ }
    try { if (browser) await browser.close(); } catch { /* close()는 연결만 끊는다 */ }
  }
};

const imagesOf = (post) => {
  const urls = (post.images ?? []).map((img) => img?.url).filter(Boolean);
  if (urls.length) return urls;
  const fromBody = [...String(post.content ?? '').matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  return fromBody;
};

/**
 * 임시 글 목록에서 제목이 subject인 글을 제한 시간까지 반복해서 찾는다.
 * 성공: {ok:true, draftPostId, imageUrl, base, fileName}
 * 실패: {ok:false, error:'draft-timeout'} | {ok:false, error:'draft-no-image', draftPostId}
 */
export const findDraftBySubject = async ({
  blogId,
  subject,
  token,
  timeoutMs = DRAFT_TIMEOUT_MS,
  intervalMs = DRAFT_INTERVAL_MS,
  fetchImpl = fetch,
  sleep = defaultSleep,
}) => {
  const endpoint = `${BLOGGER_API}/blogs/${encodeURIComponent(blogId)}/posts?status=draft&fetchBodies=true&fetchImages=true`;
  for (let waited = 0; ; waited += intervalMs) {
    try {
      const res = await fetchImpl(endpoint, {headers: {Authorization: `Bearer ${token}`}});
      if (res.ok) {
        const data = await res.json();
        const post = (data.items ?? []).find((p) => String(p.title ?? '').trim() === subject);
        if (post) {
          const imageUrl = imagesOf(post)[0];
          const parsed = imageUrl ? parseBloggerImageUrl(imageUrl) : null;
          if (!parsed) return {ok: false, error: 'draft-no-image', draftPostId: post.id};
          return {ok: true, draftPostId: post.id, imageUrl, base: parsed.base, fileName: parsed.fileName};
        }
      }
    } catch {
      // 네트워크 오류는 다음 주기에 다시 시도한다.
    }
    if (waited >= timeoutMs) return {ok: false, error: 'draft-timeout'};
    await sleep(intervalMs);
  }
};

/** 임시 글을 지운다. 204면 {ok:true}. 던지지 않는다. */
export const deleteDraft = async ({blogId, draftPostId, token, fetchImpl = fetch}) => {
  try {
    const res = await fetchImpl(
      `${BLOGGER_API}/blogs/${encodeURIComponent(blogId)}/posts/${encodeURIComponent(draftPostId)}`,
      {method: 'DELETE', headers: {Authorization: `Bearer ${token}`}},
    );
    if (res.status === 204) return {ok: true}; // allow-literal: 블로거 삭제 성공 응답 코드
    return {ok: false, error: `delete-status-${res.status}`};
  } catch (err) {
    return {ok: false, error: 'delete-failed', detail: String(err?.message ?? err)};
  }
};

/**
 * 그림 1장을 이메일로 올려 그림 주소를 얻는다(보내기 -> 찾기 -> 임시 글 삭제).
 * 성공: {ok:true, base, fileName, urls:{s1600, og}, draftDeleted}
 * 실패: {ok:false, stage:'args'|'send'|'find'|'parse', error, ...}
 * postEmail은 호출하는 쪽이 loadPostEmail로 읽어 넘긴다(이 함수는 .env를 읽지 않는다).
 * deps(테스트용): sendHeroEmail, findDraftBySubject, deleteDraft, now, connect, fetchImpl, sleep, timeoutMs, intervalMs
 */
export const uploadHeroViaEmail = async ({imagePath, topicId, blogId, token, postEmail, accountIndex, deps = {}}) => {
  const missing = Object.entries({imagePath, topicId, blogId, token, postEmail}).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) return {ok: false, stage: 'args', error: `missing-${missing.join(',')}`};

  const send = deps.sendHeroEmail ?? sendHeroEmail;
  const find = deps.findDraftBySubject ?? findDraftBySubject;
  const remove = deps.deleteDraft ?? deleteDraft;
  const subject = makeSubject(topicId, (deps.now ?? Date.now)());
  const net = {fetchImpl: deps.fetchImpl, sleep: deps.sleep};

  const sent = await send({imagePath, subject, to: postEmail, accountIndex, connect: deps.connect});
  if (!sent.ok) return {ok: false, stage: 'send', error: sent.error, detail: redact(sent.detail, postEmail)};

  const found = await find({
    blogId, subject, token, timeoutMs: deps.timeoutMs, intervalMs: deps.intervalMs,
    ...(net.fetchImpl ? {fetchImpl: net.fetchImpl} : {}), ...(net.sleep ? {sleep: net.sleep} : {}),
  });
  if (!found.ok) {
    let draftDeleted = false;
    if (found.draftPostId) {
      draftDeleted = (await remove({blogId, draftPostId: found.draftPostId, token, fetchImpl: net.fetchImpl})).ok;
    }
    return {ok: false, stage: 'find', error: found.error, draftPostId: found.draftPostId ?? null, draftDeleted};
  }

  const deleted = await remove({blogId, draftPostId: found.draftPostId, token, fetchImpl: net.fetchImpl});
  return {
    ok: true,
    base: found.base,
    fileName: found.fileName,
    urls: {
      s1600: buildImageUrl(found.base, found.fileName, 's1600'),
      og: buildImageUrl(found.base, found.fileName, 'og'),
    },
    draftDeleted: deleted.ok,
  };
};
