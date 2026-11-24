// 블로그(Blogger)·서치 콘솔용 구글 허락 토큰. 유튜브 연동과 같은 OAuth 클라이언트를 쓴다.
// import해도 서버·네트워크는 시작하지 않는다. 로그인은 `node scripts/blog/google-auth.mjs login`만.
import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

export const BLOG_SCOPES = 'https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/webmasters';
export const TOKEN_FILE = '.blogger-oauth-token.json';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const BLOG_ID = '1816781696920932166';
const BLOG_CHECK_URL = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}`;
const EXPIRY_MARGIN_MS = 60_000; // allow-literal: 만료 60초 전부터는 갱신(유튜브 연동과 같은 기준)
const LOGIN_PORT = 3007; // allow-literal: 구글 클라우드에 등록한 리디렉션 주소의 포트
const REDIRECT_URI = `http://localhost:${LOGIN_PORT}/oauth2callback`;
const DEFAULT_EXPIRES_IN_SEC = 3600; // allow-literal: 응답에 expires_in이 없을 때 구글 기본 수명(1시간)

// .env에서 KEY=VALUE만 읽는다(이미 process.env에 있으면 그 값이 우선).
const readEnvFile = async (projectDir) => {
  const file = path.join(projectDir, '.env');
  const out = {};
  if (!existsSync(file)) return out;
  const text = await readFile(file, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
};

const getClient = async (projectDir) => {
  let id = process.env.YOUTUBE_CLIENT_ID;
  let secret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!id || !secret) {
    const env = await readEnvFile(projectDir);
    id = id || env.YOUTUBE_CLIENT_ID;
    secret = secret || env.YOUTUBE_CLIENT_SECRET;
  }
  return {id, secret};
};

const loadToken = async (tokenPath) => {
  if (!existsSync(tokenPath)) return null;
  try {
    return JSON.parse(await readFile(tokenPath, 'utf8'));
  } catch {
    return null;
  }
};

// 이전 토큰과 합쳐 저장해 refresh_token을 지킨다.
const saveToken = async (tokenPath, token, previous, nowMs) => {
  const saved = {
    ...previous,
    ...token,
    refresh_token: token.refresh_token || previous.refresh_token,
    expires_at: nowMs + Number(token.expires_in || DEFAULT_EXPIRES_IN_SEC) * 1000,
  };
  await writeFile(tokenPath, JSON.stringify(saved, null, 2), 'utf8');
  return saved;
};

const tokenRequest = async (fetchImpl, params) => {
  const response = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams(params),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google token request failed');
  return data;
};

// 토큰이 없거나 갱신이 실패하면 null(던지지 않는다). now는 현재 시각(ms)을 돌려주는 함수.
export const getBlogAccessToken = async ({projectDir, fetchImpl = fetch, now = Date.now} = {}) => {
  const tokenPath = path.join(projectDir, TOKEN_FILE);
  const token = await loadToken(tokenPath);
  if (!token) return null;
  const nowMs = now();
  if (token.access_token && token.expires_at > nowMs + EXPIRY_MARGIN_MS) return token.access_token;
  if (!token.refresh_token) return null;
  try {
    const client = await getClient(projectDir);
    if (!client.id || !client.secret) return null;
    const refreshed = await tokenRequest(fetchImpl, {
      client_id: client.id,
      client_secret: client.secret,
      refresh_token: token.refresh_token,
      grant_type: 'refresh_token',
    });
    return (await saveToken(tokenPath, refreshed, token, nowMs)).access_token;
  } catch {
    return null;
  }
};

// ---- login CLI (한 번만, 사용자가 브라우저에서 허락) ----
const login = async (projectDir) => {
  const client = await getClient(projectDir);
  if (!client.id || !client.secret) {
    console.error('YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET이 없습니다(.env 확인).');
    process.exitCode = 1;
    return;
  }
  const state = crypto.randomBytes(16).toString('hex');
  const authUrl = `${AUTH_URL}?${new URLSearchParams({
    client_id: client.id,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: BLOG_SCOPES,
    access_type: 'offline',
    prompt: 'select_account consent',
    state,
  })}`;

  await new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      if (url.pathname !== '/oauth2callback') { res.writeHead(404); res.end(); return; }
      const reply = (status, text) => {
        res.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8'});
        res.end(text, () => server.close(resolve));
      };
      if (url.searchParams.get('state') !== state || !url.searchParams.get('code')) {
        console.error('허락 응답이 올바르지 않습니다(state 불일치 또는 code 없음). 저장하지 않았습니다.');
        process.exitCode = 1;
        reply(400, '허락 응답이 올바르지 않습니다. 터미널을 확인하세요.');
        return;
      }
      try {
        const token = await tokenRequest(fetch, {
          code: url.searchParams.get('code'),
          client_id: client.id,
          client_secret: client.secret,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        });
        const check = await fetch(BLOG_CHECK_URL, {headers: {Authorization: `Bearer ${token.access_token}`}});
        if (check.status !== 200) { // allow-literal: HTTP 성공 코드
          console.error(`블로그 확인 실패(HTTP ${check.status}). 블로그 주인 구글 계정이 아닐 수 있습니다. 저장하지 않았습니다.`);
          process.exitCode = 1;
          reply(200, '블로그 확인에 실패했습니다. 다른 계정으로 다시 시도하세요. 저장하지 않았습니다.');
          return;
        }
        await saveToken(path.join(projectDir, TOKEN_FILE), token, {}, Date.now());
        console.log('토큰을 저장했습니다.');
        reply(200, '완료되었습니다. 이 창을 닫아도 됩니다.');
      } catch (err) {
        console.error(`토큰 받기 실패: ${err.message}`);
        process.exitCode = 1;
        reply(500, '실패했습니다. 터미널을 확인하세요.');
      }
    });
    server.listen(LOGIN_PORT, () => {
      console.log('아래 주소를 브라우저에서 열어 블로그 주인 계정으로 허락하세요.');
      console.log(authUrl);
    });
  });
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'login') await login(process.cwd());
  else console.log('사용법: node scripts/blog/google-auth.mjs login');
}
