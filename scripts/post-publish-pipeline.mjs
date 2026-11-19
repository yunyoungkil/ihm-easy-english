#!/usr/bin/env node
// 공개 후 자동 사후 관리 파이프라인 (2026-11-20, AGENTS.md "자동화 우선 원칙").
// 
// 사람이 유튜브 스튜디오에 들어가 수작업하지 않아도,
// 영상이 공개되거나 예약 상태가 되었을 때 다음 3대 작업을 자동으로 검사하고 실행한다:
//   1. 재생목록 감사 및 자동 교정 (롱폼/쇼츠 오분류 즉시 제거, 누락 영상 자동 수납)
//   2. 고정 댓글 자동 게시 (pinned-comment.txt가 있는 신규 공개 영상에 자동 댓글 게시)
//   3. 쇼츠 관련 동영상 자동 연결 (롱폼이 공개된 쇼츠에 Studio 브라우저 자동화로 관련 동영상 매핑)
//
// 실행 결과를 data/youtube/after-publish-done.json에 기록하여 중복 실행을 방지하고
// 아침 시작 브리핑에서 한 줄로 완료 결과를 보고한다.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  const packages = (catalog?.videos || []).filter((v) => {
    // 공개 상태이거나 공개 시각이 지난 영상
    const isPublic = v.privacyStatus === 'public';
    const isScheduledPast = v.scheduledPublishAt && new Date(v.scheduledPublishAt) <= now;
    return isPublic || isScheduledPast;
  });

  for (const v of packages) {
    // 이미 채널 댓글이 있거나 doneMap에 등록되어 있으면 생략
    const hasOwnerComment = (v.comments || []).some((c) => (c.author || '').includes('이해하면쉬운영어'));
    const isRecorded = Object.keys(doneMap).some((k) => k.includes(v.videoId) && doneMap[k]);

    // status.json 검사
    const epFolder = (v.videoFolder || '').toLowerCase();
    const pkgDir = join(pkgRoot, epFolder);
    const statusFile = join(pkgDir, 'status.json');
    const status = readJsonSafe(statusFile, null);
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
              videoId: v.videoId,
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
          posted.push({ videoId: v.videoId, commentId: resData.id, title: v.title });

          if (status) {
            status.pinnedCommentPending = false;
            status.pinnedCommentAt = new Date().toISOString();
            status.pinnedCommentId = resData.id;
            writeFileSync(statusFile, JSON.stringify(status, null, 2), 'utf8');
          }

          const epTag = epFolder.toUpperCase();
          doneMap[`${epTag}:pinned`] = new Date().toISOString().slice(0, 10);
          writeFileSync(donePath, JSON.stringify(doneMap, null, 2), 'utf8');
        }
      } catch (err) {
        console.warn(`[PostPublish] 고정 댓글 등록 실패 (${v.videoId}):`, err.message);
      }
    }
  }

  return { ok: true, posted };
}

/** 3. 쇼츠 관련 동영상 자동 연결 (Studio Playwright 브라우저 컨트롤) */
export async function linkShortsRelatedVideos({
  projectDir: dir = projectDir,
  catalog,
  now = new Date(),
}) {
  const donePath = join(dir, 'data', 'youtube', 'after-publish-done.json');
  const doneMap = readJsonSafe(donePath, {});
  const linked = [];

  const videos = catalog?.videos || [];
  const shorts = videos.filter((v) => v.format === 'SHORTS');
  const longs = videos.filter((v) => v.format === 'LONGFORM' && (v.privacyStatus === 'public' || (v.scheduledPublishAt && new Date(v.scheduledPublishAt) <= now)));

  // 관련 동영상 연결이 필요한 쇼츠 탐색: 같은 에피소드 롱폼이 이미 공개된 경우
  const candidates = [];
  for (const s of shorts) {
    const epMatch = s.title.match(/EP\s*(\d+)/i) || (s.videoFolder || '').match(/ep(\d+)/i);
    if (!epMatch) continue;
    const epNum = epMatch[1];
    const longCompanion = longs.find((l) => (l.videoFolder || '').includes(`ep${epNum}`) || l.title.includes(`EP${epNum}`));
    const key = `EP${epNum}-shorts:related`;
    if (longCompanion && !doneMap[key]) {
      candidates.push({ short: s, companionLong: longCompanion, key });
    }
  }

  if (!candidates.length) return { ok: true, linked: [] };

  try {
    const { chromium } = await import('playwright');
    const { setupStudioChrome, STUDIO_PORT } = await import('./setup-studio-chrome.mjs');
    const chrome = await setupStudioChrome({ launchIfDown: true });
    if (!chrome.supported || chrome.login !== 'logged-in') {
      return { ok: false, reason: `studio-chrome-not-logged-in (${chrome.login || 'unknown'})` };
    }

    const browser = await chromium.connectOverCDP(`http://localhost:${STUDIO_PORT}`);
    const page = await browser.contexts()[0].newPage();

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

    await page.close();
    writeFileSync(donePath, JSON.stringify(doneMap, null, 2), 'utf8');
  } catch (err) {
    console.warn('[PostPublish] 스튜디오 자동화 실행 실패:', err.message);
    return { ok: false, error: err.message, linked };
  }

  return { ok: true, linked };
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
