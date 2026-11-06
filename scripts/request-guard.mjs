// 대시보드 서버는 내 컴퓨터(127.0.0.1)에서만 열리지만, 브라우저를 거치면 내가 방문한 다른
// 웹사이트도 이 주소로 요청을 보낼 수 있다(유료 Gemini 호출, 데이터 삭제, 로그아웃 등).
// 브라우저가 자동으로 붙이는 Host·Origin·Sec-Fetch-Site 헤더를 보고 그런 요청만 막는다.
// 터미널 스크립트(scripts/test-*.mjs, curl)는 이 헤더를 안 보내므로 영향이 없다.

// 구글 로그인에서 돌아올 때처럼 다른 사이트에서 "주소창으로 이동"해 들어오는 경로만 예외로 둔다.
const CROSS_SITE_ENTRY_PATHS = new Set(['/', '/auth', '/oauth2callback']);

export const getRequestBlockReason = ({headers, method, pathname, port}) => {
  const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);

  const host = String(headers.host || '').toLowerCase();
  if (host && !allowedHosts.has(host)) return 'host';

  const origin = headers.origin;
  if (origin && !(origin.startsWith('http://') && allowedHosts.has(origin.slice('http://'.length).toLowerCase()))) {
    return 'origin';
  }

  const site = headers['sec-fetch-site'];
  if (!site || site === 'same-origin' || site === 'none') return null;
  const isEntryNavigation = method === 'GET' && headers['sec-fetch-mode'] === 'navigate' && CROSS_SITE_ENTRY_PATHS.has(pathname);
  return isEntryNavigation ? null : 'cross-site';
};
