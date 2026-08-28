import {readFile} from 'node:fs/promises';

const env = Object.fromEntries((await readFile(new URL('../.env', import.meta.url), 'utf8'))
  .split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]));

const url = new URL('https://www.googleapis.com/youtube/v3/commentThreads');
url.search = new URLSearchParams({part: 'snippet', videoId: '5MiM1tIpQQk', maxResults: '10', textFormat: 'plainText', key: env.YOUTUBE_API_KEY});
const response = await fetch(url);
const data = await response.json();
console.log(JSON.stringify({
  ok: response.ok,
  status: response.status,
  count: data.items?.length || 0,
  error: data.error ? {
    code: data.error.code,
    message: data.error.message,
    status: data.error.status,
    reason: data.error.errors?.[0]?.reason,
  } : null,
}, null, 2));
