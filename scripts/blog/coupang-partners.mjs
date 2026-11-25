// 쿠팡 파트너스 Open API 클라이언트 (상품 검색·딥링크 변환).
// 공식 문서:
//   - https://partners.coupang.com/#affiliate/ws/tools/open-api
//   - https://developers.coupangcorp.com/
// 기본 도메인: https://api-gateway.coupang.com
// 엔드포인트:
//   - 상품 검색: GET /v2/providers/affiliate_open_api/apis/openapi/products/search?keyword=...&limit=...&subId=...
//   - 딥링크:   POST /v2/providers/affiliate_open_api/apis/openapi/v1/deeplink  JSON {coupangUrls, subId}
// HMAC-SHA256 서명 규칙:
//   - signedDate: UTC `yyMMddTHHmmssZ` (예: `261125T053000Z`)
//   - message: `${signedDate}${METHOD}${path}${query}` (query 앞 `?` 제외)
//   - Authorization: `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${hex}`
// subId: `techd40m` (영문·숫자만 사용).
// 호출 한도/오류 처리: 429 -> `.code = 'rate-limit'`, 401/403 또는 키 누락 -> `.code = 'auth'`, 그 외 HTTP 오류 또는 `rCode !== '0'` -> `.code = 'http'`.

import crypto from 'node:crypto';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const TECH_SUB_ID = 'techd40m';

const BASE_URL = 'https://api-gateway.coupang.com';
const SEARCH_PATH = '/v2/providers/affiliate_open_api/apis/openapi/products/search';
const DEEPLINK_PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';

const DEFAULT_SEARCH_LIMIT = 10; // allow-literal: 기본 상품 검색 개수
const SELFTEST_LIMIT = 5; // allow-literal: selftest 1회 호출 검색 개수
const HTTP_UNAUTHORIZED = 401; // allow-literal: 인증 실패 HTTP 상태 코드
const HTTP_FORBIDDEN = 403; // allow-literal: 권한 없음 HTTP 상태 코드
const HTTP_TOO_MANY_REQUESTS = 429; // allow-literal: 호출 한도 초과 HTTP 상태 코드
const PAD_WIDTH = 2; // allow-literal: UTC 날짜/시간 두 자리 0 채움
const YEAR_SUFFIX_LEN = -2; // allow-literal: UTC 연도 뒤 2자리 추출
const MONTH_OFFSET = 1; // allow-literal: JS Date 월(0~11) 보정

// .env에서 KEY=VALUE만 읽는다(env/process.env 값이 우선).
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
      value = value.slice(1, -1); // allow-literal: 양끝 따옴표 한 쌍 제거
    }
    out[m[1]] = value;
  }
  return out;
};

const makeError = (code, message, status) => {
  const err = new Error(message);
  err.code = code;
  if (status !== undefined) err.status = status;
  return err;
};

const resolveKeys = async ({env, projectDir = process.cwd()} = {}) => {
  let accessKey = env?.COUPANG_PARTNERS_ACCESS_KEY ?? process.env.COUPANG_PARTNERS_ACCESS_KEY;
  let secretKey = env?.COUPANG_PARTNERS_SECRET_KEY ?? process.env.COUPANG_PARTNERS_SECRET_KEY;
  if (accessKey === undefined || secretKey === undefined) {
    const fileEnv = await readEnvFile(projectDir);
    accessKey = accessKey ?? fileEnv.COUPANG_PARTNERS_ACCESS_KEY;
    secretKey = secretKey ?? fileEnv.COUPANG_PARTNERS_SECRET_KEY;
  }
  if (!accessKey || !secretKey) {
    throw makeError('auth', 'COUPANG_PARTNERS_ACCESS_KEY / COUPANG_PARTNERS_SECRET_KEY가 없습니다.');
  }
  return {accessKey, secretKey};
};

const pad2 = (n) => String(n).padStart(PAD_WIDTH, '0');

const formatSignedDate = (now) => {
  const raw = typeof now === 'function' ? now() : (now ?? Date.now());
  const date = raw instanceof Date ? raw : new Date(raw);
  const yy = String(date.getUTCFullYear()).slice(YEAR_SUFFIX_LEN);
  const MM = pad2(date.getUTCMonth() + MONTH_OFFSET);
  const dd = pad2(date.getUTCDate());
  const HH = pad2(date.getUTCHours());
  const mm = pad2(date.getUTCMinutes());
  const ss = pad2(date.getUTCSeconds());
  return `${yy}${MM}${dd}T${HH}${mm}${ss}Z`;
};

export const signCoupang = ({method, path: reqPath, query = '', accessKey, secretKey, now} = {}) => {
  const signedDate = formatSignedDate(now);
  const cleanQuery = String(query || '').replace(/^\?/, '');
  const message = `${signedDate}${String(method || 'GET').toUpperCase()}${reqPath}${cleanQuery}`;
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${signedDate}, signature=${signature}`;
};

const requestCoupang = async ({method, path: reqPath, query = '', body, fetchImpl = fetch, env, projectDir, now}) => {
  const {accessKey, secretKey} = await resolveKeys({env, projectDir});
  const authorization = signCoupang({method, path: reqPath, query, accessKey, secretKey, now});
  const url = query ? `${BASE_URL}${reqPath}?${query}` : `${BASE_URL}${reqPath}`;
  const headers = {Authorization: authorization};
  const init = {method, headers};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  const response = await fetchImpl(url, init);
  if (response.status === HTTP_UNAUTHORIZED || response.status === HTTP_FORBIDDEN) {
    throw makeError('auth', `쿠팡 파트너스 인증 실패(HTTP ${response.status})`, response.status);
  }
  if (response.status === HTTP_TOO_MANY_REQUESTS) {
    throw makeError('rate-limit', `쿠팡 파트너스 호출 한도 초과(HTTP ${response.status})`, response.status);
  }
  if (!response.ok) {
    throw makeError('http', `쿠팡 파트너스 HTTP 오류(${response.status})`, response.status);
  }

  const payload = await response.json();
  if (String(payload?.rCode) !== '0') {
    throw makeError('http', payload?.rMessage || `쿠팡 파트너스 API 오류(rCode=${payload?.rCode})`, response.status);
  }
  return payload;
};

export const searchProducts = async (
  keyword,
  {limit = DEFAULT_SEARCH_LIMIT, subId = TECH_SUB_ID, fetchImpl = fetch, env, projectDir, now} = {},
) => {
  const query = new URLSearchParams({
    keyword: String(keyword),
    limit: String(limit),
    subId: String(subId),
  }).toString();
  const payload = await requestCoupang({method: 'GET', path: SEARCH_PATH, query, fetchImpl, env, projectDir, now});
  const list = Array.isArray(payload?.data?.productData) ? payload.data.productData : [];
  return list.map((p) => ({
    productId: p.productId,
    productName: p.productName,
    productUrl: p.productUrl,
    productPrice: p.productPrice,
  }));
};

export const deeplink = async (
  urls,
  {subId = TECH_SUB_ID, fetchImpl = fetch, env, projectDir, now} = {},
) => {
  const payload = await requestCoupang({
    method: 'POST',
    path: DEEPLINK_PATH,
    body: {coupangUrls: urls, subId: String(subId)},
    fetchImpl,
    env,
    projectDir,
    now,
  });
  const list = Array.isArray(payload?.data) ? payload.data : [];
  return list.map((item) => ({
    originalUrl: item.originalUrl,
    shortenUrl: item.shortenUrl,
  }));
};

const selftest = async () => {
  try {
    const items = await searchProducts('멀티탭', {limit: SELFTEST_LIMIT});
    const firstUrl = items[0]?.productUrl || '';
    let firstHost = '';
    if (firstUrl) {
      try {
        firstHost = new URL(firstUrl).host;
      } catch {
        firstHost = '';
      }
    }
    const startsWithLinkCoupang = firstUrl.startsWith('https://link.coupang.com/');
    console.log(`productCount=${items.length}`);
    console.log(`firstHost=${firstHost}`);
    console.log(`startsWithLinkCoupang=${startsWithLinkCoupang}`);
    if (items.length === 0 || !startsWithLinkCoupang) { // allow-literal: 최소 1건 및 단축 링크 확인
      process.exitCode = 1; // allow-literal: selftest 실패 종료 코드
    }
  } catch (err) {
    console.error(`selftest failed (${err.code || 'error'}): ${err.message}`);
    process.exitCode = 1; // allow-literal: selftest 실패 종료 코드
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === 'selftest') await selftest();
  else console.log('사용법: node scripts/blog/coupang-partners.mjs selftest');
}
