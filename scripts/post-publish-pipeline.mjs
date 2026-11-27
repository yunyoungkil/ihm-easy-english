#!/usr/bin/env node
// 공개 후 자동 사후 관리 파이프라인 (2026-11-20, knowledge/youtube-operations.md 2절 4항 "자동화 우선 원칙").
// 
// 사람이 유튜브 스튜디오에 들어가 수작업하지 않아도,
// 영상이 공개되거나 예약 상태가 되었을 때 다음 3대 작업을 자동으로 검사하고 실행한다:
//   1. 재생목록 감사 및 자동 교정 (롱폼/쇼츠 오분류 즉시 제거, 누락 영상 자동 수납)
//   2. 고정 댓글 자동 게시 (pinned-comment.txt가 있는 신규 공개 영상에 자동 댓글 게시)
//   3. 쇼츠 관련 동영상 자동 연결 (롱폼이 공개된 쇼츠에 Studio 브라우저 자동화로 관련 동영상 매핑)
//
// 실행 결과를 data/youtube/after-publish-done.json에 기록하여 중복 실행을 방지하고
// 아침 시작 브리핑에서 한 줄로 완료 결과를 보고한다.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBannedTerms } from './banned-terms.mjs';

const __filename = fileURLToPath(import.meta.url);
const projectDir = dirname(dirname(__filename));

export const PLAYLIST_IDS = {
  LONGFORM: 'PLdTWj5v6v8zE',       // 이해하면 쉬운 영어 | 영어 읽는 법 기초 시즌1 (왕초보 영어 읽기)
  SHORTS_QUIZ: 'PLCbnHG8SDRes',    // 이해하면 쉬운 영어 | 영어 읽는 법 테스트 시즌1 (30초 퀴즈)
  PHONICS_AZ: 'PLDd1UzqQ4j3k',     // 이해하면 쉬운 영어 | 알파벳 파닉스 기초 A-Z (50대 왕초보)
  SENTENCES: 'PLezeewHeB6dg',      // 원어민이 매일 쓰는 초급 영어 20문장
};

const DAY_MS = 24 * 60 * 60 * 1000;

function readJsonSafe(filePath, fallback = {}) {
  try {
    return existsSync(filePath) ? JSON.parse(readFileSync(filePath, 'utf8')) : fallback;
  } catch {
    return fallback;
  }
}

/** OAuth Access Token 획득 및 필요시 refresh */
export async function getYouTubeAccessToken(dir = projectDir, fetchFn = globalThis.fetch) {
  const tokenPath = join(dir, '.youtube-oauth-token.json');
  if (!existsSync(tokenPath)) return null;

  const envPath = join(dir, '.env');
  let env = {};
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, 'utf8').split('\n');
    for (const l of lines) {
      const match = l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        let val = (match[2] || '').trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[match[1]] = val;
      }
    }
  }

  const tokenData = readJsonSafe(tokenPath, null);
  if (!tokenData) return null;

  // 만료 1분 전까지 유효하면 재사용
  if (tokenData.access_token && tokenData.expires_at > Date.now() + 60_000) {
    return tokenData.access_token;
  }

  const clientId = process.env.YOUTUBE_CLIENT_ID || env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret || !tokenData.refresh_token) {
    return tokenData.access_token || null;
  }

  try {
    const res = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: tokenData.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const refreshed = await res.json();
    if (refreshed.access_token) {
      const updated = {
        ...tokenData,
        ...refreshed,
        refresh_token: refreshed.refresh_token || tokenData.refresh_token,
        expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
      };
      writeFileSync(tokenPath, JSON.stringify(updated, null, 2), 'utf8');
      return updated.access_token;
    }
  } catch (err) {
    console.warn('[PostPublish] 토큰 갱신 실패:', err.message);
  }

  return tokenData.access_token || null;
}

/** 1. 재생목록 감사 및 오분류/누락 자동 교정 */
export async function auditAndFixPlaylists({
  accessToken,
  catalog,
  fetchFn = globalThis.fetch,
}) {
  if (!accessToken) return { ok: false, reason: 'no-token' };

  const actions = { removed: [], added: [] };
  const getItems = async (playlistId) => {
    const items = [];
    let pageToken = '';
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const res = await fetchFn(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      if (data.items) items.push(...data.items);
      pageToken = data.nextPageToken;
    } while (pageToken);
    return items;
  };

  const videos = catalog?.videos || [];

  // A. 롱폼 재생목록 (PLdTWj5v6v8zE) 점검
  try {
    const longItems = await getItems(PLAYLIST_IDS.LONGFORM);
    for (const it of longItems) {
      const vId = it.contentDetails?.videoId;
      const v = videos.find((x) => x.videoId === vId);
      // 쇼츠가 롱폼 목록에 잘못 들어가 있으면 삭제
      if (v && v.format === 'SHORTS') {
        const delRes = await fetchFn(`https://www.googleapis.com/youtube/v3/playlistItems?id=${it.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (delRes.ok || delRes.status === 204) {
          actions.removed.push({ playlistId: PLAYLIST_IDS.LONGFORM, videoId: vId, title: v.title });
        }
      }
    }

    // 누락된 롱폼 자동 수납 (20문장 롱폼 제외)
    const longItemVideoIds = new Set(longItems.map((i) => i.contentDetails?.videoId));
    const eligibleLongs = videos.filter((v) =>
      v.format === 'LONGFORM' &&
      v.videoId !== 'Ha_7wdnFNmo' &&
      v.videoId !== 'f4wkmIvplCc' &&
      !longItemVideoIds.has(v.videoId)
    );

    for (const v of eligibleLongs) {
      const insRes = await fetchFn('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippet: {
            playlistId: PLAYLIST_IDS.LONGFORM,
            resourceId: { kind: 'youtube#video', videoId: v.videoId },
          },
        }),
      });
      if (insRes.ok) {
        actions.added.push({ playlistId: PLAYLIST_IDS.LONGFORM, videoId: v.videoId, title: v.title });
      }
    }
  } catch (err) {
    console.warn('[PostPublish] 롱폼 재생목록 감사 중 오류:', err.message);
  }

  // B. 쇼츠 퀴즈 재생목록 (PLCbnHG8SDRes) 점검
  try {
    const quizItems = await getItems(PLAYLIST_IDS.SHORTS_QUIZ);
    const quizItemVideoIds = new Set(quizItems.map((i) => i.contentDetails?.videoId));
    const eligibleQuizShorts = videos.filter((v) =>
      v.format === 'SHORTS' &&
      v.title.includes('시즌1') &&
      !quizItemVideoIds.has(v.videoId)
    );

    for (const v of eligibleQuizShorts) {
      const insRes = await fetchFn('https://www.googleapis.com/youtube/v3/playlistItems?part=snippet', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snippet: {
            playlistId: PLAYLIST_IDS.SHORTS_QUIZ,
            resourceId: { kind: 'youtube#video', videoId: v.videoId },
          },
        }),
      });
      if (insRes.ok) {
        actions.added.push({ playlistId: PLAYLIST_IDS.SHORTS_QUIZ, videoId: v.videoId, title: v.title });
      }
    }
  } catch (err) {
    console.warn('[PostPublish] 쇼츠 재생목록 감사 중 오류:', err.message);
  }

  return { ok: true, actions };
}

// 끝낸 일 기록(after-publish-done.json) 키. 브리핑(growth-rules.mjs afterPublishTasks)이 읽는 형식과 같아야 한다.
// 2026-11-23: 폴더 이름을 대문자로 쓴 'EP27-SHORTS-DOGS-CATS:pinned'를 적어 브리핑이 고정 댓글을 계속 할 일로 띄웠다.
export function pinnedDoneKey(folder = '') {
  const shorts = /^ep(\d+)-shorts-/i.exec(folder);
  if (shorts) return `EP${shorts[1]}-shorts:pinned`;
  const long = /^ep(\d+)/i.exec(folder);
  return long ? `EP${long[1]}-long:pinned` : null;
}

/** 2. 누락된 고정 댓글 자동 게시 */
export async function postPendingPinnedComments({
  accessToken,
  projectDir: dir = projectDir,
  catalog,
  fetchFn = globalThis.fetch,
  now = new Date(),
}) {
  if (!accessToken) return { ok: false, reason: 'no-token' };

  const pkgRoot = join(dir, 'output', 'upload-packages');
  if (!existsSync(pkgRoot)) return { ok: true, posted: [] };

  const donePath = join(dir, 'data', 'youtube', 'after-publish-done.json');
  const doneMap = readJsonSafe(donePath, {});
  const posted = [];

  // 1. 패키지 디렉토리들에서 videoId 매핑 맵 생성
  const pkgDirs = existsSync(pkgRoot) ? readdirSync(pkgRoot) : [];
  const pkgByVideoId = new Map();
  for (const d of pkgDirs) {
    const dirPath = join(pkgRoot, d);
    try {
      if (!statSync(dirPath).isDirectory()) continue;
    } catch {
      continue;
    }
    let vid = null;
    let sFile = null;
    let sData = null;
    const sf = join(dirPath, 'status.json');
    const ssf = join(dirPath, 'shorts-status.json');
    if (existsSync(sf)) {
      sFile = sf;
      sData = readJsonSafe(sf, null);
      if (sData?.videoId) vid = sData.videoId;
    }
    if (!vid && existsSync(ssf)) {
      sFile = ssf;
      sData = readJsonSafe(ssf, null);
      if (sData?.videoId) vid = sData.videoId;
    }
    if (vid) {
      pkgByVideoId.set(vid, { pkgDir: dirPath, statusFile: sFile, status: sData, epFolder: d });
    }
  }

  const packages = (catalog?.videos || []).filter((v) => {
    // 공개 상태이거나 공개 시각이 지난 영상
    const isPublic = v.privacyStatus === 'public';
    const isScheduledPast = v.scheduledPublishAt && new Date(v.scheduledPublishAt) <= now;
    return isPublic || isScheduledPast;
  });

  for (const v of packages) {
    const vid = v.videoId;
    if (!vid) continue;

    // 이미 채널 댓글이 있거나 doneMap에 등록되어 있으면 생략
    const hasOwnerComment = (v.comments || []).some((c) => (c.author || '').includes('이해하면쉬운영어'));

    const pkgInfo = pkgByVideoId.get(vid);
    const epFolder = pkgInfo ? pkgInfo.epFolder : (v.videoFolder || '').toLowerCase();
    const doneKey = pinnedDoneKey(epFolder) || `${vid}:pinned`;
    const isRecorded = Boolean(doneMap[doneKey]);
    const pkgDir = pkgInfo ? pkgInfo.pkgDir : join(pkgRoot, epFolder);
    const statusFile = pkgInfo ? pkgInfo.statusFile : join(pkgDir, 'status.json');
    const status = pkgInfo ? pkgInfo.status : readJsonSafe(statusFile, null);
    const commentTxtFile = join(pkgDir, 'pinned-comment.txt');

    const needsComment = status?.pinnedCommentPending === true || (!hasOwnerComment && !isRecorded && existsSync(commentTxtFile));

    if (needsComment && existsSync(commentTxtFile)) {
      const text = readFileSync(commentTxtFile, 'utf8').trim();
      if (!text) continue;

      try {
        const res = await fetchFn('https://www.googleapis.com/youtube/v3/commentThreads?part=snippet', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              videoId: vid,
              topLevelComment: {
                snippet: {
                  textOriginal: text,
                },
              },
            },
          }),
        });

        if (res.ok) {
          const resData = await res.json();
          posted.push({ videoId: vid, commentId: resData.id, title: v.title });

          if (status && statusFile) {
            status.pinnedCommentPending = false;
            status.pinnedCommentAt = new Date().toISOString();
            status.pinnedCommentId = resData.id;
            writeFileSync(statusFile, JSON.stringify(status, null, 2), 'utf8');
          }

          doneMap[doneKey] = new Date().toISOString().slice(0, 10);
          writeFileSync(donePath, JSON.stringify(doneMap, null, 2), 'utf8');
        }
      } catch (err) {
        console.warn(`[PostPublish] 고정 댓글 등록 실패 (${vid}):`, err.message);
      }
    }
  }

  return { ok: true, posted };
}

/**
 * 스튜디오 전용 크롬(포트 9223)에 붙어 새 탭을 연다 (2026-11-23).
 * 2026-11-23 원인: setupStudioChrome은 "지금 열린 탭 주소"로만 로그인을 판단한다. 크롬이 떠 있어도
 * youtube.com 탭만 있으면 login:'unknown'이 나오는데, 예전 코드는 'logged-in'이 아니면 전부 건너뛰어
 * 커뮤니티 글이 한 번도 올라가지 않았다. 실제로는 프로필이 로그인돼 있어 studio.youtube.com으로 가면 스튜디오에 남는다.
 * 그래서 'unknown'이면 스튜디오로 직접 가 본 뒤 주소로 다시 판정한다.
 * setupFn·connectFn을 주입하면 테스트에서 실제 브라우저 없이 확인할 수 있다.
 */
export async function connectStudio({ setupFn, connectFn, probeWaitMs = 4000 } = {}) {
  const studio = await import('./setup-studio-chrome.mjs');
  const { STUDIO_PORT, STUDIO_URL, judgeStudioLogin } = studio;
  const setup = setupFn || studio.setupStudioChrome;

  const chrome = await setup({ launchIfDown: true });
  if (!chrome?.supported) return { ok: false, reason: 'studio-chrome-unsupported' };
  if (chrome.login === 'login-needed') return { ok: false, reason: 'studio-login-needed' };

  let connect = connectFn;
  if (!connect) {
    const { chromium } = await import('playwright');
    connect = (url) => chromium.connectOverCDP(url);
  }
  const browser = await connect(`http://localhost:${STUDIO_PORT}`);
  const page = await browser.contexts()[0].newPage();

  if (chrome.login === 'unknown') {
    try {
      await page.goto(STUDIO_URL, { waitUntil: 'domcontentloaded' });
      await new Promise((resolve) => setTimeout(resolve, probeWaitMs));
      const result = judgeStudioLogin([page.url()]);
      if (result !== 'logged-in') {
        await page.close().catch(() => {});
        return { ok: false, reason: `studio-login-${result}` };
      }
    } catch (err) {
      await page.close().catch(() => {});
      return { ok: false, reason: 'studio-login-probe-failed', error: err.message };
    }
  }
  return { ok: true, browser, page };
}

/**
 * output/upload-packages 폴더에서 폴더별 videoId를 읽는다 (2026-11-23).
 * dir은 업로드 패키지 폴더 자체이거나, 그 위의 프로젝트 폴더다(둘 다 받는다).
 * 쇼츠: ep28-shorts-fan-pan 같은 폴더의 shorts-status.json, 롱폼: ep28-f-vs-p 같은 폴더의 status.json.
 * videoId가 없는 폴더(아직 업로드 전)는 뺀다.
 */
export function readPackageVideoIds(dir = projectDir) {
  const nested = join(dir, 'output', 'upload-packages');
  const root = existsSync(nested) ? nested : dir;
  if (!existsSync(root)) return [];
  const out = [];
  for (const d of readdirSync(root, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const folder = d.name;
    const shorts = /^ep(\d+)-shorts-/i.exec(folder);
    const long = shorts ? null : /^ep(\d+)/i.exec(folder);
    const m = shorts || long;
    if (!m) continue;
    const statusFile = join(root, folder, shorts ? 'shorts-status.json' : 'status.json');
    const videoId = readJsonSafe(statusFile, null)?.videoId;
    if (!videoId) continue;
    out.push({ folder, videoId, kind: shorts ? 'shorts' : 'long', ep: m[1] });
  }
  return out;
}

/**
 * 관련 동영상을 달아야 할 쇼츠 목록 (2026-11-23).
 * 예전에는 제목의 "EP28"이나 catalog의 videoFolder로 짝을 찾았는데, 실제 catalog 제목에는 EP가 없고
 * videoFolder 칸도 없어서 한 번도 짝이 맞지 않았다. 지금은 패키지 폴더의 videoId로 에피소드 번호를 잇는다.
 * 롱폼은 공개됐거나 예약 시각이 지난 것만 짝으로 삼는다. 이미 끝낸 키(done)는 뺀다.
 */
export function findRelatedCandidates({ catalog, packages = [], done = {}, now = new Date() } = {}) {
  const videos = catalog?.videos || [];
  const shortsPkg = new Map(packages.filter((p) => p.kind === 'shorts').map((p) => [p.videoId, p]));
  const longEpByVideoId = new Map(packages.filter((p) => p.kind === 'long').map((p) => [p.videoId, p.ep]));

  const longs = videos.filter((v) => {
    if (v.format !== 'LONGFORM' || !longEpByVideoId.has(v.videoId)) return false;
    return v.privacyStatus === 'public' || Boolean(v.scheduledPublishAt && new Date(v.scheduledPublishAt) <= now);
  });

  const candidates = [];
  for (const s of videos) {
    if (s.format !== 'SHORTS') continue;
    const pkg = shortsPkg.get(s.videoId);
    if (!pkg) continue;
    const key = `EP${pkg.ep}-shorts:related`;
    if (done[key]) continue;
    const companionLong = longs.find((l) => longEpByVideoId.get(l.videoId) === pkg.ep);
    if (!companionLong) continue;
    candidates.push({ short: s, companionLong, key });
  }
  return candidates;
}

/** 3. 쇼츠 관련 동영상 자동 연결 (Studio Playwright 브라우저 컨트롤) */
export async function linkShortsRelatedVideos({
  projectDir: dir = projectDir,
  catalog,
  now = new Date(),
  connect = connectStudio,
} = {}) {
  const donePath = join(dir, 'data', 'youtube', 'after-publish-done.json');
  const doneMap = readJsonSafe(donePath, {});
  const linked = [];

  // 관련 동영상 연결이 필요한 쇼츠 탐색: 같은 에피소드 롱폼이 이미 공개된 경우
  const candidates = findRelatedCandidates({
    catalog,
    packages: readPackageVideoIds(dir),
    done: doneMap,
    now,
  });

  if (!candidates.length) return { ok: true, linked: [] };

  let page = null;
  try {
    const conn = await connect();
    if (!conn.ok) {
      return { ok: false, reason: conn.reason || 'studio-connect-failed', linked };
    }
    page = conn.page;

    for (const item of candidates) {
      try {
        await page.goto(`https://studio.youtube.com/video/${item.short.videoId}/edit`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3500);

        const trigger = page.locator('ytcp-dropdown-trigger').filter({ hasText: '관련 동영상' });
        const triggerText = await trigger.innerText().catch(() => '');

        // 이미 관련 동영상이 지정되어 있으면 doneMap에 바로 기록
        if (triggerText.includes(item.companionLong.title.slice(0, 15))) {
          doneMap[item.key] = new Date().toISOString().slice(0, 10);
          linked.push({ shortId: item.short.videoId, longId: item.companionLong.videoId, status: 'already-linked' });
          continue;
        }

        // 트리거 클릭하여 '특정 동영상 선택' 팝업 오픈
        await trigger.click();
        await page.waitForTimeout(2500);

        const dialog = page.locator('ytcp-dialog').filter({ hasText: '특정 동영상 선택' });
        const card = dialog.locator('ytcp-entity-card').filter({ hasText: item.companionLong.title.slice(0, 12) }).first();

        if (await card.isVisible({ timeout: 4000 }).catch(() => false)) {
          await card.click();
          await page.waitForTimeout(2000);

          const saveBtn = page.locator('#save-button, ytcp-button#save').first();
          if (await saveBtn.isEnabled().catch(() => false)) {
            await saveBtn.click();
            await page.waitForTimeout(3000);
            doneMap[item.key] = new Date().toISOString().slice(0, 10);
            linked.push({ shortId: item.short.videoId, longId: item.companionLong.videoId, status: 'linked-and-saved' });
          }
        }
      } catch (err) {
        console.warn(`[PostPublish] 쇼츠 관련 동영상 연결 실패 (${item.short.videoId}):`, err.message);
      }
    }

    writeFileSync(donePath, JSON.stringify(doneMap, null, 2), 'utf8');
  } catch (err) {
    console.warn('[PostPublish] 스튜디오 자동화 실행 실패:', err.message);
    return { ok: false, error: err.message, linked };
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return { ok: true, linked };
}

/** 글 앞부분(공백을 하나로 줄인 n글자). 중복 게시 확인과 게시 확인에 같이 쓴다. */
export function contentSnippet(content, n = 20) {
  return String(content ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
}

export const COMMUNITY_POST_FORMATS = ['text', 'quiz', 'text-poll', 'image-poll', 'image'];

const COMMUNITY_LIMITS = {
  quizOptionMax: 80, // allow-literal: YouTube 공식 퀴즈 답변 글자 수 제한
  quizExplanationMax: 500, // allow-literal: YouTube 공식 퀴즈 해설 글자 수 제한
  textPollOptionMax: 65, // allow-literal: YouTube 공식 텍스트 설문 보기 글자 수 제한
  imagePollCaptionMax: 36, // allow-literal: YouTube 공식 이미지 설문 보기 글자 수 제한
  minOptions: 2, // allow-literal: YouTube 설문/퀴즈 최소 보기 수
  maxOptions: 4, // allow-literal: YouTube 설문/퀴즈 최대 보기 수
  maxImages: 10, // allow-literal: YouTube 이미지 게시물 최대 이미지 수
};

function resolvePostAssetPath(dir, assetPath) {
  if (!assetPath) return '';
  return isAbsolute(assetPath) ? assetPath : join(dir, assetPath);
}

function collectCommunityPostTexts(postData) {
  const parts = [String(postData?.content ?? '')];
  if (postData?.explanation) parts.push(String(postData.explanation));
  if (Array.isArray(postData?.options)) {
    for (const opt of postData.options) {
      if (typeof opt === 'string') parts.push(opt);
      else if (opt && typeof opt.label === 'string') parts.push(opt.label);
    }
  }
  return parts.join('\n');
}

/**
 * 커뮤니티 글을 지금 올리면 안 되는 이유 (2026-11-23, 2026-11-24 확장). 없으면 null.
 * - 이미 올린 글·보관·이관 글, 독립 보관함 미승인(approved !== true)
 * - 시청자에게 보이면 안 되는 내부 에피소드 번호(EP27), 금지어 (본문·보기·해설 전체 검사)
 * - 형식별 필수 조건(quiz·text-poll·image-poll·image 보기 수·글자 수·이미지 파일 존재)
 * - 본 영상이 이미 나온 뒤의 예습 퀴즈("곧 공개될 본 영상"이 거짓말이 된다)
 * - 목표 시각에서 24시간 넘게 지난 글(늦게 올리면 시기가 맞지 않는다)
 */
export function communityPostBlockReason(
  postData,
  { now = new Date(), catalog, projectDir: dir = null, requireApproved = false } = {},
) {
  if (postData?.status === 'posted') return 'already-posted';
  if (postData?.status === 'scheduled') return 'already-scheduled';
  if (postData?.status === 'archived') return 'archived';
  if (postData?.status === 'migrated') return 'migrated';
  if (requireApproved && postData?.approved !== true) return 'unapproved';

  const allText = collectCommunityPostTexts(postData);
  if (/\bEP\s*\d+/i.test(allText)) return 'internal-episode-number';
  if (findBannedTerms(allText).length > 0) return 'banned-terms';

  const format = postData?.format || 'text';
  if (!COMMUNITY_POST_FORMATS.includes(format)) return 'unsupported-format';

  if (format === 'quiz') {
    const opts = postData?.options;
    if (
      !Array.isArray(opts) ||
      opts.length < COMMUNITY_LIMITS.minOptions ||
      opts.length > COMMUNITY_LIMITS.maxOptions ||
      opts.some((o) => typeof o !== 'string' || !o.trim() || o.trim().length > COMMUNITY_LIMITS.quizOptionMax)
    ) {
      return 'invalid-quiz-options';
    }
    if (
      !Number.isInteger(postData?.correctIndex) ||
      postData.correctIndex < 0 ||
      postData.correctIndex >= opts.length
    ) {
      return 'invalid-quiz-correct-index';
    }
    if (
      postData?.explanation != null &&
      (typeof postData.explanation !== 'string' || postData.explanation.trim().length > COMMUNITY_LIMITS.quizExplanationMax)
    ) {
      return 'quiz-explanation-too-long';
    }
  } else if (format === 'text-poll') {
    const opts = postData?.options;
    if (
      !Array.isArray(opts) ||
      opts.length < COMMUNITY_LIMITS.minOptions ||
      opts.length > COMMUNITY_LIMITS.maxOptions ||
      opts.some((o) => typeof o !== 'string' || !o.trim() || o.trim().length > COMMUNITY_LIMITS.textPollOptionMax)
    ) {
      return 'invalid-poll-options';
    }
  } else if (format === 'image-poll') {
    const opts = postData?.options;
    if (
      !Array.isArray(opts) ||
      opts.length < COMMUNITY_LIMITS.minOptions ||
      opts.length > COMMUNITY_LIMITS.maxOptions ||
      opts.some(
        (o) =>
          !o ||
          typeof o.image !== 'string' ||
          !o.image.trim() ||
          (o.label != null && (typeof o.label !== 'string' || o.label.trim().length > COMMUNITY_LIMITS.imagePollCaptionMax)),
      )
    ) {
      return 'invalid-image-poll-options';
    }
    if (dir && opts.some((o) => !existsSync(resolvePostAssetPath(dir, o.image)))) {
      return 'missing-image-file';
    }
  } else if (format === 'image') {
    const imgs = postData?.images;
    if (
      !Array.isArray(imgs) ||
      imgs.length < 1 ||
      imgs.length > COMMUNITY_LIMITS.maxImages ||
      imgs.some((img) => typeof img !== 'string' || !img.trim())
    ) {
      return 'invalid-images';
    }
    if (dir && imgs.some((img) => !existsSync(resolvePostAssetPath(dir, img)))) {
      return 'missing-image-file';
    }
  }

  if (postData?.type === 'pre-quiz') {
    const scheduled = postData.companionVideoScheduledAt ? new Date(postData.companionVideoScheduledAt) : null;
    const scheduledOut = scheduled && !Number.isNaN(scheduled.getTime()) && scheduled <= now;
    const companion = postData.companionVideoId
      ? (catalog?.videos || []).find((v) => v.videoId === postData.companionVideoId)
      : null;
    if (scheduledOut || companion?.privacyStatus === 'public') return 'pre-quiz-after-video';
  }

  if (postData?.targetPublishDate) {
    const target = new Date(postData.targetPublishDate);
    if (!Number.isNaN(target.getTime()) && now - target > DAY_MS) return 'expired';
  }
  return null;
}

const COMMUNITY_URL = 'https://www.youtube.com/channel/UCwNrEdm2jYAtUlfHVvH3WQw/posts';

const normalizeText = (s) => String(s ?? '').replace(/\s+/g, ' ');

/**
 * 독립 커뮤니티 보관함(data/youtube/community-posts.json)과
 * 기존 업로드 패키지(output/upload-packages/<folder>/community-post.json)에서
 * 게시 후보 목록을 불러온다.
 */
export function loadCommunityPostItems(dir = projectDir) {
  const items = [];
  const standalonePath = join(dir, 'data', 'youtube', 'community-posts.json');
  if (existsSync(standalonePath)) {
    const queue = readJsonSafe(standalonePath, null);
    for (const postData of queue?.posts || []) {
      if (!postData || !postData.id || !postData.content) continue;
      if (postData.status === 'posted' || postData.status === 'scheduled' || postData.status === 'archived' || postData.status === 'migrated') continue;
      items.push({
        id: postData.id,
        episodeId: postData.id,
        key: `${postData.id}:community-post`,
        source: 'standalone',
        requireApproved: true,
        standalonePath,
        postData,
      });
    }
  }

  const pkgRoot = join(dir, 'output', 'upload-packages');
  if (existsSync(pkgRoot)) {
    const folders = readdirSync(pkgRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const f of folders) {
      const postFile = join(pkgRoot, f, 'community-post.json');
      if (!existsSync(postFile)) continue;

      const postData = readJsonSafe(postFile, null);
      if (!postData || !postData.content) continue;
      if (postData.status === 'posted' || postData.status === 'scheduled' || postData.status === 'archived' || postData.status === 'migrated') continue;

      const episodeId = postData.episodeId || f;
      items.push({
        id: episodeId,
        episodeId,
        key: `${episodeId}:community-post`,
        source: 'package',
        requireApproved: false,
        standalonePath: null,
        postData,
      });
    }
  }

  return items;
}

function markStandalonePostPublished(standalonePath, postId, status, now) {
  if (!standalonePath || !existsSync(standalonePath)) return;
  const queue = readJsonSafe(standalonePath, null);
  if (!queue || !Array.isArray(queue.posts)) return;
  const target = queue.posts.find((p) => p.id === postId);
  if (!target) return;
  target.status = 'posted';
  target.postedAt = now.toISOString();
  target.postedMode = status;
  queue.updatedAt = now.toISOString();
  writeFileSync(standalonePath, JSON.stringify(queue, null, 2), 'utf8');
}

async function clickModeButton(dialog, page, buttonName) {
  const modeBtn = dialog.getByRole('button', { name: buttonName, exact: true }).first();
  if (!(await modeBtn.isVisible().catch(() => false))) {
    await dialog.locator('#placeholder-area').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
  }
  await modeBtn.click();
  await page.waitForTimeout(800);
}

async function fillYouTubeTextbox(box, value) {
  await box.click({ force: true });
  await box.fill(String(value ?? ''), { force: true });
}

/**
 * 유튜브 게시물 작성기(ytd-backstage-post-dialog-renderer)에 형식별로 내용을 채운다.
 * 2026-11-24 실제 한국어 작성 화면 접근성 라벨 기준(quiz / text-poll / image-poll / image / text).
 */
export async function fillCommunityPostComposer(page, dialog, postData, { projectDir: dir = projectDir } = {}) {
  const format = postData?.format || 'text';

  if (format === 'text') {
    await dialog.locator('#placeholder-area').first().click({ force: true });
    await page.waitForTimeout(1000);

    const imgCancel = dialog.locator('#image-preview-container button').first();
    if (await imgCancel.isVisible().catch(() => false)) {
      await imgCancel.click({ force: true });
      await page.waitForTimeout(500);
    }

    const editor = dialog.locator('#contenteditable-root').first();
    if (!(await editor.isVisible().catch(() => false))) return { ok: false, reason: 'editor-not-found' };
    await editor.click({ force: true });
    await editor.pressSequentially(postData.content);
    await page.waitForTimeout(800);
    return { ok: true };
  }

  if (format === 'quiz') {
    await clickModeButton(dialog, page, '퀴즈 추가');
    const editor = dialog.locator('#contenteditable-root').first();
    if (!(await editor.isVisible().catch(() => false))) return { ok: false, reason: 'editor-not-found' };
    await editor.click({ force: true });
    await editor.pressSequentially(postData.content);
    await page.waitForTimeout(400);

    const options = postData.options || [];
    for (let i = 2; i < options.length; i += 1) {
      await dialog.getByRole('button', { name: '답변 추가', exact: true }).first().click();
      await page.waitForTimeout(300);
    }

    for (let i = 0; i < options.length; i += 1) {
      const box = dialog.getByPlaceholder(`답변 ${i + 1}`, { exact: true }).first();
      await fillYouTubeTextbox(box, options[i]);
      await page.waitForTimeout(200);
    }

    if (postData.correctIndex > 0) {
      const markBtn = dialog.getByRole('button', { name: '정답으로 표시', exact: true }).nth(postData.correctIndex - 1);
      await markBtn.click({ force: true });
      await page.waitForTimeout(300);
    }

    if (postData.explanation) {
      const expBox = dialog.getByPlaceholder('설명 추가(선택사항)', { exact: true }).first();
      if (await expBox.isVisible().catch(() => false)) {
        await fillYouTubeTextbox(expBox, postData.explanation);
        await page.waitForTimeout(200);
      }
    }

    await page.waitForTimeout(500);
    return { ok: true };
  }

  if (format === 'text-poll') {
    await clickModeButton(dialog, page, '텍스트 설문조사 추가');
    const editor = dialog.locator('#contenteditable-root').first();
    if (!(await editor.isVisible().catch(() => false))) return { ok: false, reason: 'editor-not-found' };
    await editor.click({ force: true });
    await editor.pressSequentially(postData.content);
    await page.waitForTimeout(400);

    const options = postData.options || [];
    for (let i = 2; i < options.length; i += 1) {
      await dialog.getByRole('button', { name: '다른 옵션 추가', exact: true }).first().click();
      await page.waitForTimeout(300);
    }

    for (let i = 0; i < options.length; i += 1) {
      const box = dialog.getByPlaceholder('옵션 추가', { exact: true }).nth(i);
      await fillYouTubeTextbox(box, options[i]);
      await page.waitForTimeout(200);
    }

    await page.waitForTimeout(500);
    return { ok: true };
  }

  if (format === 'image-poll') {
    await clickModeButton(dialog, page, '이미지 설문조사 추가');
    const editor = dialog.locator('#contenteditable-root').first();
    if (!(await editor.isVisible().catch(() => false))) return { ok: false, reason: 'editor-not-found' };
    await editor.click({ force: true });
    await editor.pressSequentially(postData.content);
    await page.waitForTimeout(400);

    const options = postData.options || [];
    for (let i = 2; i < options.length; i += 1) {
      await dialog.getByRole('button', { name: '옵션 추가', exact: true }).first().click();
      await page.waitForTimeout(300);
    }

    for (let i = 0; i < options.length; i += 1) {
      const absImg = resolvePostAssetPath(dir, options[i].image);
      const fileInputs = dialog.locator('input[type="file"]');
      if ((await fileInputs.count()) > i) {
        await fileInputs.nth(i).setInputFiles(absImg);
      } else {
        const optionRow = dialog.locator('ytd-backstage-image-poll-option-renderer, ytd-poll-choice-renderer').nth(i);
        const uploadTrigger = optionRow.locator('button').first();
        const [chooser] = await Promise.all([
          page.waitForEvent('filechooser', { timeout: 5000 }),
          uploadTrigger.click({ force: true }),
        ]);
        await chooser.setFiles(absImg);
      }
      await page.waitForTimeout(1500);

      if (options[i].label) {
        const box = dialog.getByPlaceholder(`옵션 ${i + 1}`, { exact: true }).first();
        await fillYouTubeTextbox(box, options[i].label);
        await page.waitForTimeout(200);
      }
    }

    await page.waitForTimeout(800);
    return { ok: true };
  }

  if (format === 'image') {
    await clickModeButton(dialog, page, '이미지 추가');
    const absImages = (postData.images || []).map((img) => resolvePostAssetPath(dir, img));
    const fileInput = dialog.locator('input[type="file"]').first();
    if ((await fileInput.count()) > 0) {
      await fileInput.setInputFiles(absImages);
    } else {
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        dialog.getByRole('button', { name: '컴퓨터에서 선택', exact: true }).first().click(),
      ]);
      await chooser.setFiles(absImages);
    }
    await page.waitForTimeout(2500);

    const editor = dialog.locator('#contenteditable-root').first();
    if (!(await editor.isVisible().catch(() => false))) return { ok: false, reason: 'editor-not-found' };
    await editor.click({ force: true });
    await editor.pressSequentially(postData.content);
    await page.waitForTimeout(800);
    return { ok: true };
  }

  return { ok: false, reason: 'unsupported-format' };
}

/** 4. 커뮤니티 게시물 자동 관리 (독립 보관함 + 기존 업로드 패키지 통합) */
export async function manageCommunityPosts({
  projectDir: dir = projectDir,
  catalog,
  now = new Date(),
  dryRun = false,
  connect = connectStudio,
} = {}) {
  const items = loadCommunityPostItems(dir);
  if (items.length === 0) return { ok: true, posted: [], pending: [], blocked: [] };

  const donePath = join(dir, 'data', 'youtube', 'after-publish-done.json');
  const doneMap = readJsonSafe(donePath, {});
  const posted = [];
  const pending = [];
  const blocked = [];
  let page = null;

  try {
    // 1단계: 올릴 글 고르기 (브라우저 없이)
    const work = [];
    for (const item of items) {
      const { episodeId, key, postData, requireApproved } = item;
      if (doneMap[key]) continue;

      // 발행 시각 판정: targetPublishDate가 지났거나 없으면 발행 대상
      const isDue = !postData.targetPublishDate || new Date(postData.targetPublishDate) <= now;
      if (!isDue) {
        pending.push({
          episodeId,
          format: postData.format || 'text',
          targetPublishDate: postData.targetPublishDate,
        });
        continue;
      }

      const reason = communityPostBlockReason(postData, {
        now,
        catalog,
        projectDir: dir,
        requireApproved,
      });
      if (reason) {
        blocked.push({ episodeId, reason });
        continue;
      }

      if (dryRun) {
        posted.push({ episodeId, format: postData.format || 'text', status: 'dry-run-ready' });
        continue;
      }
      work.push(item);
    }

    // 2단계: 스튜디오 브라우저로 커뮤니티(게시물) 탭에 게시 (할 일이 있을 때만 한 번 연결)
    if (work.length > 0) {
      const conn = await connect();
      if (!conn.ok) {
        for (const w of work) pending.push({ episodeId: w.episodeId, reason: conn.reason || 'studio-connect-failed' });
      } else {
        page = conn.page;
        for (const w of work) {
          const { episodeId, key, postData, source, standalonePath } = w;
          const snippet = contentSnippet(postData.content);
          const record = (status) => {
            doneMap[key] = now.toISOString().slice(0, 10);
            writeFileSync(donePath, JSON.stringify(doneMap, null, 2), 'utf8');
            if (source === 'standalone') {
              markStandalonePostPublished(standalonePath, episodeId, status, now);
            }
            posted.push({ episodeId, format: postData.format || 'text', status });
          };
          const bodyHas = async () => normalizeText(await page.locator('body').innerText().catch(() => '')).includes(snippet);
          // '최신순'은 탭(role=tab)이 아니라 글자 칩이다(2026-11-24 실제 화면 확인). 기본 '인기순'에서는 새 글이 안 보일 수 있다.
          const showLatest = async () => {
            await page.getByText('최신순', { exact: true }).first().click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(2000);
          };

          try {
            await page.goto(COMMUNITY_URL, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);

            const dialog = page.locator('ytd-backstage-post-dialog-renderer').first();
            if (!(await dialog.isVisible().catch(() => false))) {
              pending.push({ episodeId, reason: 'composer-not-found' });
              continue;
            }

            // 이미 같은 글이 올라가 있으면 다시 쓰지 않는다(전에 올렸는데 기록만 빠진 경우)
            await showLatest();
            if (await bodyHas()) {
              record('already-on-page');
              continue;
            }

            const filled = await fillCommunityPostComposer(page, dialog, postData, { projectDir: dir });
            if (!filled.ok) {
              pending.push({ episodeId, reason: filled.reason || 'compose-failed' });
              continue;
            }

            // 작성창에는 이름이 "게시"인 버튼이 둘이라 보이고 눌리는 쪽을 골라야 한다
            const buttons = dialog.getByRole('button', { name: '게시', exact: true });
            const count = await buttons.count();
            let postBtn = null;
            for (let i = 0; i < count; i += 1) {
              const b = buttons.nth(i);
              if ((await b.isVisible().catch(() => false)) && (await b.isEnabled().catch(() => false))) {
                postBtn = b;
                break;
              }
            }
            if (!postBtn) {
              pending.push({ episodeId, reason: 'post-button-not-found' });
              continue;
            }
            await postBtn.click();
            await page.waitForTimeout(3000);

            // 눌렀다고 올라간 것이 아니다. 새로 고쳐 글이 실제로 보일 때만 끝낸 일로 적는다.
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
            await showLatest();

            if (await bodyHas()) {
              record('published');
            } else {
              pending.push({ episodeId, reason: 'not-confirmed' });
            }
          } catch (postErr) {
            console.warn(`[PostPublish] 커뮤니티 게시물 발행 실패 (${episodeId}):`, postErr.message);
            pending.push({ episodeId, error: postErr.message });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[PostPublish] 커뮤니티 게시물 관리 중 오류:', err.message);
    return { ok: false, error: err.message, posted, pending, blocked };
  } finally {
    if (page) await page.close().catch(() => {});
  }

  return { ok: true, posted, pending, blocked };
}

/** 통합 사후 관리 파이프라인 단일 진입점 */
export async function runPostPublishPipeline({
  projectDir: dir = projectDir,
  now = new Date(),
  fetchFn = globalThis.fetch,
} = {}) {
  const catalog = readJsonSafe(join(dir, 'data', 'youtube', 'catalog.json'), { videos: [] });
  const accessToken = await getYouTubeAccessToken(dir, fetchFn);

  const results = {
    at: now.toISOString(),
    playlists: { ok: false },
    pinnedComments: { ok: false },
    relatedVideos: { ok: false },
  };

  // 1. 재생목록 교정
  if (accessToken) {
    results.playlists = await auditAndFixPlaylists({ accessToken, catalog, fetchFn });
  }

  // 2. 고정 댓글 자동 게시
  if (accessToken) {
    results.pinnedComments = await postPendingPinnedComments({ accessToken, projectDir: dir, catalog, fetchFn, now });
  }

  // 3. 쇼츠 관련 동영상 자동 연결
  results.relatedVideos = await linkShortsRelatedVideos({ projectDir: dir, catalog, now });

  // 4. 커뮤니티 예습/복습 게시물 자동 관리
  results.communityPosts = await manageCommunityPosts({ projectDir: dir, catalog, now });

  return results;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log('[PostPublish] 사후 관리 파이프라인 실행 중...');
  runPostPublishPipeline({ now: new Date() })
    .then((r) => {
      console.log('[PostPublish] 완료 결과:\n', JSON.stringify(r, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('[PostPublish] 오류:', err);
      process.exit(1);
    });
}
