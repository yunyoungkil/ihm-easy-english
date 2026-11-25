import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {TECH_SUB_ID, signCoupang, searchProducts, deeplink} from '../blog/coupang-partners.mjs';

const FAKE_ENV = {
  COUPANG_PARTNERS_ACCESS_KEY: 'test-access-key',
  COUPANG_PARTNERS_SECRET_KEY: 'test-secret-key',
};

const FIXED_NOW = new Date('2026-11-25T05:30:00.000Z');
const EXPECTED_SIGNED_DATE = '261125T053000Z';

const fakeResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test('TECH_SUB_ID는 techd40m이다', () => {
  assert.equal(TECH_SUB_ID, 'techd40m');
});

test('signCoupang은 고정 시각과 키로 결정적인 CEA HMAC-SHA256 헤더를 만든다', () => {
  const method = 'get';
  const reqPath = '/v2/providers/affiliate_open_api/apis/openapi/products/search';
  const query = 'keyword=usb&limit=5&subId=techd40m';

  const header1 = signCoupang({
    method,
    path: reqPath,
    query,
    accessKey: FAKE_ENV.COUPANG_PARTNERS_ACCESS_KEY,
    secretKey: FAKE_ENV.COUPANG_PARTNERS_SECRET_KEY,
    now: FIXED_NOW,
  });
  const header2 = signCoupang({
    method,
    path: reqPath,
    query,
    accessKey: FAKE_ENV.COUPANG_PARTNERS_ACCESS_KEY,
    secretKey: FAKE_ENV.COUPANG_PARTNERS_SECRET_KEY,
    now: FIXED_NOW.getTime(),
  });

  const expectedMessage = `${EXPECTED_SIGNED_DATE}GET${reqPath}${query}`;
  const expectedSig = crypto
    .createHmac('sha256', FAKE_ENV.COUPANG_PARTNERS_SECRET_KEY)
    .update(expectedMessage)
    .digest('hex');
  const expectedHeader = `CEA algorithm=HmacSHA256, access-key=test-access-key, signed-date=${EXPECTED_SIGNED_DATE}, signature=${expectedSig}`;

  assert.equal(header1, expectedHeader);
  assert.equal(header2, expectedHeader);
  assert.match(header1, /, signature=[0-9a-f]{64}$/);
});

test('searchProducts는 Authorization 헤더·subId·인코딩된 keyword/limit을 보내고 상품 목록을 매핑한다', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = {url, init};
    return fakeResponse(200, {
      rCode: '0',
      rMessage: '',
      data: {
        productData: [
          {
            productId: 12345,
            productName: '멀티탭 4구',
            productPrice: 12900,
            productImage: 'https://img.example/1.jpg',
            productUrl: 'https://link.coupang.com/a/abc123',
            categoryName: '가전',
          },
          {
            productId: 67890,
            productName: '개별 스위치 멀티탭',
            productPrice: 18500,
            productUrl: 'https://link.coupang.com/a/def456',
          },
        ],
      },
    });
  };

  const items = await searchProducts('멀티탭', {
    limit: 5,
    fetchImpl,
    env: FAKE_ENV,
    now: FIXED_NOW,
  });

  const parsed = new URL(seen.url);
  assert.equal(parsed.origin, 'https://api-gateway.coupang.com');
  assert.equal(parsed.pathname, '/v2/providers/affiliate_open_api/apis/openapi/products/search');
  assert.equal(parsed.searchParams.get('keyword'), '멀티탭');
  assert.equal(parsed.searchParams.get('limit'), '5');
  assert.equal(parsed.searchParams.get('subId'), 'techd40m');
  assert.equal(seen.init.method, 'GET');
  assert.match(seen.init.headers.Authorization, /^CEA algorithm=HmacSHA256, access-key=test-access-key, signed-date=261125T053000Z, signature=[0-9a-f]{64}$/);

  assert.deepEqual(items, [
    {
      productId: 12345,
      productName: '멀티탭 4구',
      productUrl: 'https://link.coupang.com/a/abc123',
      productPrice: 12900,
    },
    {
      productId: 67890,
      productName: '개별 스위치 멀티탭',
      productUrl: 'https://link.coupang.com/a/def456',
      productPrice: 18500,
    },
  ]);
});

test('searchProducts는 401/403에 auth, 429에 rate-limit, 500 또는 0 아닌 rCode에 http 에러를 던진다', async () => {
  await assert.rejects(
    () => searchProducts('멀티탭', {fetchImpl: async () => fakeResponse(401, {}), env: FAKE_ENV}),
    (err) => err instanceof Error && err.code === 'auth',
  );
  await assert.rejects(
    () => searchProducts('멀티탭', {fetchImpl: async () => fakeResponse(403, {}), env: FAKE_ENV}),
    (err) => err instanceof Error && err.code === 'auth',
  );
  await assert.rejects(
    () => searchProducts('멀티탭', {fetchImpl: async () => fakeResponse(429, {}), env: FAKE_ENV}),
    (err) => err instanceof Error && err.code === 'rate-limit',
  );
  await assert.rejects(
    () => searchProducts('멀티탭', {fetchImpl: async () => fakeResponse(500, {}), env: FAKE_ENV}),
    (err) => err instanceof Error && err.code === 'http',
  );
  await assert.rejects(
    () => searchProducts('멀티탭', {fetchImpl: async () => fakeResponse(200, {rCode: '-1', rMessage: 'ERR'}), env: FAKE_ENV}),
    (err) => err instanceof Error && err.code === 'http',
  );
});

test('키가 없으면 auth 에러를 던지고 .env 파일에서 키를 읽을 수 있다', async () => {
  await assert.rejects(
    () => searchProducts('멀티탭', {
      fetchImpl: async () => fakeResponse(200, {rCode: '0', data: {productData: []}}),
      env: {COUPANG_PARTNERS_ACCESS_KEY: '', COUPANG_PARTNERS_SECRET_KEY: ''},
    }),
    (err) => err instanceof Error && err.code === 'auth',
  );

  const dir = await mkdtemp(path.join(tmpdir(), 'coupang-env-'));
  const prevAccess = process.env.COUPANG_PARTNERS_ACCESS_KEY;
  const prevSecret = process.env.COUPANG_PARTNERS_SECRET_KEY;
  delete process.env.COUPANG_PARTNERS_ACCESS_KEY;
  delete process.env.COUPANG_PARTNERS_SECRET_KEY;
  try {
    await writeFile(
      path.join(dir, '.env'),
      'COUPANG_PARTNERS_ACCESS_KEY=file-access\nCOUPANG_PARTNERS_SECRET_KEY=file-secret\n',
      'utf8',
    );
    let authHeader = '';
    await searchProducts('충전기', {
      projectDir: dir,
      fetchImpl: async (_url, init) => {
        authHeader = init.headers.Authorization;
        return fakeResponse(200, {rCode: '0', data: {productData: []}});
      },
    });
    assert.match(authHeader, /access-key=file-access/);
  } finally {
    if (prevAccess === undefined) delete process.env.COUPANG_PARTNERS_ACCESS_KEY;
    else process.env.COUPANG_PARTNERS_ACCESS_KEY = prevAccess;
    if (prevSecret === undefined) delete process.env.COUPANG_PARTNERS_SECRET_KEY;
    else process.env.COUPANG_PARTNERS_SECRET_KEY = prevSecret;
    await rm(dir, {recursive: true, force: true});
  }
});

test('deeplink는 POST JSON {coupangUrls, subId}를 보내고 단축 URL 목록을 매핑한다', async () => {
  let seen;
  const fetchImpl = async (url, init) => {
    seen = {url, init};
    return fakeResponse(200, {
      rCode: '0',
      rMessage: '',
      data: [
        {
          originalUrl: 'https://www.coupang.com/vp/products/123',
          shortenUrl: 'https://link.coupang.com/re/AFFSDP?lptag=AF123',
          landingUrl: 'https://link.coupang.com/a/xyz',
        },
      ],
    });
  };

  const links = await deeplink(['https://www.coupang.com/vp/products/123'], {
    fetchImpl,
    env: FAKE_ENV,
    now: FIXED_NOW,
  });

  assert.equal(seen.url, 'https://api-gateway.coupang.com/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink');
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers['Content-Type'], 'application/json');
  assert.match(seen.init.headers.Authorization, /^CEA algorithm=HmacSHA256, access-key=test-access-key, signed-date=261125T053000Z, signature=[0-9a-f]{64}$/);
  assert.deepEqual(JSON.parse(seen.init.body), {
    coupangUrls: ['https://www.coupang.com/vp/products/123'],
    subId: 'techd40m',
  });
  assert.deepEqual(links, [
    {
      originalUrl: 'https://www.coupang.com/vp/products/123',
      shortenUrl: 'https://link.coupang.com/re/AFFSDP?lptag=AF123',
    },
  ]);
});

test('deeplink는 401에 auth, 429에 rate-limit 에러를 던진다', async () => {
  await assert.rejects(
    () => deeplink(['https://www.coupang.com/vp/products/1'], {fetchImpl: async () => fakeResponse(401, {}), env: FAKE_ENV}),
    (err) => err instanceof Error && err.code === 'auth',
  );
  await assert.rejects(
    () => deeplink(['https://www.coupang.com/vp/products/1'], {fetchImpl: async () => fakeResponse(429, {}), env: FAKE_ENV}),
    (err) => err instanceof Error && err.code === 'rate-limit',
  );
});
