// 블로거 임시 글에 글 주소(맞춤 퍼머링크)와 검색 설명을 넣는다. 자동화용 크롬(포트 9222)으로 편집 화면을 조작한다.
//
// 왜 화면 조작인가(2026-11-27 확인):
//   - Blogger API v3 글 자료에는 검색 설명·맞춤 주소 칸이 없다(공식 discovery 문서의 Post 필드 확인).
//   - 한글 제목으로 올리면 주소가 blog-post.html, tv.html처럼 뜻 없게 만들어지고, 게시 뒤에는 주소를 바꿀 수 없다.
//   - 검색 설명이 없으면 검색 결과·공유 미리보기 설명이 본문 첫 줄(공정위 대가 문구)로 채워진다.
// 그래서 API로 임시 글을 만든 뒤 이 단계에서 두 칸을 채우고 Ctrl+S로 저장, 그다음 API로 게시한다.
// 이 단계가 실패해도 게시는 막지 않는다(부르는 쪽이 경고만 남긴다).
import {spawn} from 'node:child_process';

const DEBUG_PORT = 9222; // allow-literal: 자동화용 크롬 원격 조종 포트(generate-aistudio-image.mjs와 같음)
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PROFILE_DIR = 'C:\\Users\\yunyo\\AppData\\Local\\Google\\Chrome\\AutomationProfile';
const MAX_ACCOUNT_INDEX = 4; // allow-literal: 한 크롬에 로그인된 구글 계정 순번(u/0~u/4)을 차례로 본다
const EDITOR_LOAD_MS = 10000; // allow-literal: 편집 화면이 다 뜨기까지 기다리는 시간(11/27 실측 7~9초)
const STEP_MS = 800; // allow-literal: 칸을 연 뒤 화면이 따라오기를 기다리는 시간
const SAVE_WAIT_MS = 15000; // allow-literal: Ctrl+S 뒤 "변경사항이 저장되었습니다." 표시를 기다리는 한도

/** 블로거 검색 설명 한도. 화면은 "150자"라고 쓰지만 서버는 UTF-8 150바이트로 잰다(11/27 오류 응답 [150,154]로 확인). */
export const SEARCH_DESCRIPTION_MAX_BYTES = 150; // allow-literal: 블로거 서버 검색 설명 한도(UTF-8 바이트)
export const PERMALINK_MAX_CHARS = 60; // allow-literal: 주소가 너무 길어지지 않게 자르는 길이(블로거 입력 한도 8,000자와 무관한 우리 기준)

/** topicId 같은 영어 이름을 블로거 주소로 쓸 수 있는 모양(소문자·숫자·하이픈)으로 바꾼다. 쓸 글자가 없으면 ''. */
export function toPermalinkSlug(text) {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= PERMALINK_MAX_CHARS) return slug;
  const cut = slug.slice(0, PERMALINK_MAX_CHARS);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, '');
}

export const utf8Bytes = (text) => Buffer.byteLength(String(text || ''), 'utf8');

async function chromeUp(fetchImpl) {
  try {
    return (await fetchImpl(`http://127.0.0.1:${DEBUG_PORT}/json/version`)).ok;
  } catch {
    return false;
  }
}

async function ensureChrome(fetchImpl) {
  if (await chromeUp(fetchImpl)) return;
  spawn(
    CHROME_PATH,
    [`--remote-debugging-port=${DEBUG_PORT}`, '--remote-allow-origins=*', `--user-data-dir=${PROFILE_DIR}`, '--no-first-run', '--no-default-browser-check', 'about:blank'],
    {detached: true, stdio: 'ignore'},
  ).unref();
  for (let i = 0; i < 30; i += 1) { // allow-literal: 0.5초씩 최대 15초 기다림
    await new Promise((r) => setTimeout(r, 500)); // allow-literal: 크롬 켜짐 확인 간격(ms)
    if (await chromeUp(fetchImpl)) return;
  }
  throw new Error('자동화용 크롬을 켜지 못했습니다');
}

/** 이 블로그를 가진 구글 계정 순번을 찾아 편집 화면을 연다. 못 찾으면 던진다. */
async function openEditor(page, blogId, postId) {
  for (let au = 0; au <= MAX_ACCOUNT_INDEX; au += 1) {
    await page.goto(`https://www.blogger.com/u/${au}/blog/post/edit/${blogId}/${postId}`, {waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(EDITOR_LOAD_MS);
    if (page.url().includes(`/${blogId}/${postId}`) && (await page.getByText('퍼머링크', {exact: true}).count()) > 0) {
      return au;
    }
  }
  throw new Error('이 블로그 편집 화면을 여는 구글 계정을 자동화용 크롬에서 찾지 못했습니다(로그인 필요).');
}

/**
 * 임시 글(postId)에 맞춤 주소와 검색 설명을 넣고 저장한다.
 * 돌려주는 값: {ok: true, accountIndex} 또는 던짐. 저장 결과 확인(주소가 실제로 바뀌었는지)은 부르는 쪽이 API로 한다.
 */
export async function applyPostSettings({blogId, postId, permalink, description, fetchImpl = fetch} = {}) {
  if (!blogId || !postId) throw new Error('blogId·postId가 필요합니다.');
  const slug = toPermalinkSlug(permalink);
  const desc = String(description || '').trim();
  if (!slug && !desc) throw new Error('넣을 주소·검색 설명이 없습니다.');
  if (desc && utf8Bytes(desc) > SEARCH_DESCRIPTION_MAX_BYTES) {
    throw new Error(`검색 설명이 ${utf8Bytes(desc)}바이트라 블로거 한도 ${SEARCH_DESCRIPTION_MAX_BYTES}바이트를 넘습니다.`);
  }

  await ensureChrome(fetchImpl);
  const {chromium} = await import('playwright');
  const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
  const page = await browser.contexts()[0].newPage();
  try {
    await page.setViewportSize({width: 1500, height: 1000}); // allow-literal: 오른쪽 글 설정 칸이 보이는 폭
    const accountIndex = await openEditor(page, blogId, postId);

    if (slug) {
      await page.getByText('퍼머링크', {exact: true}).first().click();
      await page.waitForTimeout(STEP_MS);
      await page.getByRole('radio', {name: '맞춤 퍼머링크'}).click();
      await page.waitForTimeout(STEP_MS);
      const input = page.getByLabel('맞춤 퍼머링크 입력');
      await input.click();
      await input.fill(slug);
      // 블로거가 주소를 쓸 수 있는지 서버에 묻는 동안 기다린다(바로 Tab을 누르면 저장이 안 된 사례, 11/27).
      await page.waitForTimeout(STEP_MS * 2);
      await input.press('Tab');
      await page.waitForTimeout(STEP_MS * 2);
    }
    if (desc) {
      await page.getByText('검색 설명', {exact: true}).first().click();
      await page.waitForTimeout(STEP_MS);
      await page.getByLabel('검색 설명 입력').fill(desc);
      await page.waitForTimeout(STEP_MS);
    }

    // 자동 저장은 칸을 바꿔도 돌지 않았다(11/27 시험). Ctrl+S가 임시 글을 저장한다.
    // "저장되었습니다" 표시는 처음부터 떠 있어 믿을 수 없다(11/27: 표시를 보고 닫았더니 주소가 안 남음).
    // 저장 뒤 충분히 기다리고, 편집 화면을 다시 열어 값이 실제로 남았는지 읽어서 확인한다.
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(SAVE_WAIT_MS / 2);
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.waitForTimeout(EDITOR_LOAD_MS);
    const saved = {};
    if (slug) {
      await page.getByText('퍼머링크', {exact: true}).first().click();
      await page.waitForTimeout(STEP_MS);
      saved.slug = await page.getByLabel('맞춤 퍼머링크 입력').inputValue().catch(() => '');
    }
    if (desc) {
      await page.getByText('검색 설명', {exact: true}).first().click();
      await page.waitForTimeout(STEP_MS);
      saved.description = await page.getByLabel('검색 설명 입력').inputValue().catch(() => '');
    }
    // 같은 주소를 쓰는 글(휴지통 포함)이 있으면 블로거가 뒤에 _숫자를 붙인다. 앞부분이 같으면 저장된 것으로 본다.
    if (slug && !String(saved.slug || '').startsWith(slug)) {
      throw new Error(`글 주소가 저장되지 않았습니다(넣은 값 ${slug}, 남은 값 ${saved.slug || '없음'}).`);
    }
    if (desc && String(saved.description || '').trim() !== desc) {
      throw new Error('검색 설명이 저장되지 않았습니다.');
    }
    return {ok: true, accountIndex, slug: saved.slug ?? slug, description: desc};
  } finally {
    await page.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
