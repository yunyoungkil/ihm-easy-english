import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {getBlogAccessToken, BLOG_SCOPES} from '../blog/google-auth.mjs';

process.env.YOUTUBE_CLIENT_ID = 'test-id';
process.env.YOUTUBE_CLIENT_SECRET = 'test-secret';

const NOW = 1_700_000_000_000; // 테스트용 고정 시각(ms)
const MARGIN = 60_000; // allow-literal: 토큰 만료 여유(60초), 구현과 같은 기준값

const makeDir = async (token) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'blog-auth-'));
  if (token) await writeFile(path.join(dir, '.blogger-oauth-token.json'), JSON.stringify(token), 'utf8');
  await writeFile(path.join(dir, '.env'), 'YOUTUBE_CLIENT_ID=test-id\nYOUTUBE_CLIENT_SECRET=test-secret\n', 'utf8');
  return dir;
};

const fakeResponse = (status, body) => ({ok: status >= 200 && status < 300, status, json: async () => body});

test('BLOG_SCOPES는 blogger와 webmasters 두 범위다', () => {
  assert.equal(BLOG_SCOPES, 'https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/webmasters');
});

test('만료 60초보다 더 남은 토큰은 갱신 없이 그대로 돌려준다', async () => {
  const dir = await makeDir({access_token: 'live', refresh_token: 'r', expires_at: NOW + MARGIN + 1000});
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return fakeResponse(200, {}); };
  try {
    const t = await getBlogAccessToken({projectDir: dir, fetchImpl, now: () => NOW});
    assert.equal(t, 'live');
    assert.equal(calls, 0);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test('만료된 토큰은 refresh_token으로 갱신해 저장하고 새 토큰을 돌려준다', async () => {
  const dir = await makeDir({access_token: 'old', refresh_token: 'keep-me', expires_at: NOW - 1000});
  let seen;
  const fetchImpl = async (url, init) => {
    seen = {url, body: String(init.body)};
    return fakeResponse(200, {access_token: 'fresh', expires_in: 3600});
  };
  try {
    const t = await getBlogAccessToken({projectDir: dir, fetchImpl, now: () => NOW});
    assert.equal(t, 'fresh');
    assert.equal(seen.url, 'https://oauth2.googleapis.com/token');
    assert.match(seen.body, /grant_type=refresh_token/);
    assert.match(seen.body, /client_id=test-id/);
    const saved = JSON.parse(await readFile(path.join(dir, '.blogger-oauth-token.json'), 'utf8'));
    assert.equal(saved.access_token, 'fresh');
    assert.equal(saved.refresh_token, 'keep-me');
    assert.equal(saved.expires_at, NOW + 3600 * 1000);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test('갱신 응답이 400이면 null', async () => {
  const dir = await makeDir({access_token: 'old', refresh_token: 'r', expires_at: NOW - 1000});
  const fetchImpl = async () => fakeResponse(400, {error: 'invalid_grant'});
  try {
    assert.equal(await getBlogAccessToken({projectDir: dir, fetchImpl, now: () => NOW}), null);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test('갱신 중 fetch가 던져도 null', async () => {
  const dir = await makeDir({access_token: 'old', refresh_token: 'r', expires_at: NOW - 1000});
  const fetchImpl = async () => { throw new Error('network down'); };
  try {
    assert.equal(await getBlogAccessToken({projectDir: dir, fetchImpl, now: () => NOW}), null);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test('refresh_token 없이 만료됐으면 null', async () => {
  const dir = await makeDir({access_token: 'old', expires_at: NOW - 1000});
  const fetchImpl = async () => fakeResponse(200, {access_token: 'x'});
  try {
    assert.equal(await getBlogAccessToken({projectDir: dir, fetchImpl, now: () => NOW}), null);
  } finally { await rm(dir, {recursive: true, force: true}); }
});

test('토큰 파일이 없으면 null', async () => {
  const dir = await makeDir(null);
  const fetchImpl = async () => fakeResponse(200, {});
  try {
    assert.equal(await getBlogAccessToken({projectDir: dir, fetchImpl, now: () => NOW}), null);
  } finally { await rm(dir, {recursive: true, force: true}); }
});
