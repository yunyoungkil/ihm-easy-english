// 국내 실시간 트렌드 수집기(scripts/korean-trends.mjs) 전 분기 테스트 (2026-11-19).
import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
  collectKoreanTrends,
  decodeXmlEntities,
  parseGoogleTrendsRss,
  parseYoutubePopularKr,
} from '../korean-trends.mjs';
import {renderKoreanTrends, renderNextEpisodeInput} from '../next-episode-input.mjs';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:ht="https://trends.google.com/trending/rss" version="2.0"><channel>
  <item>
    <title>Wicked</title>
    <ht:approx_traffic>5000+</ht:approx_traffic>
    <pubDate>Thu, 19 Nov 2026 06:00:00 +0000</pubDate>
    <ht:news_item>
      <ht:news_item_title>영화 &quot;위키드&quot; 한국 박스오피스 1위 &amp; 흥행</ht:news_item_title>
      <ht:news_item_source>한국경제</ht:news_item_source>
      <ht:news_item_url>https://example.com/1</ht:news_item_url>
    </ht:news_item>
  </item>
</channel></rss>`;

const SAMPLE_YT = {
  items: [
    {
      id: 'LOLXD85SThc',
      snippet: {
        title: 'Do you know (2026 Version)',
        channelId: 'UC123',
        channelTitle: 'SOMEDAY - Topic',
        publishedAt: '2026-11-17T09:04:44Z',
        categoryId: '10',
      },
      statistics: {viewCount: '197747'},
    },
    {
      id: 'NO_VIEWS_01',
      snippet: {
        title: '조회수 없는 테스트',
        channelId: 'UC456',
        channelTitle: '채널B',
        publishedAt: '2026-11-18T00:00:00Z',
        categoryId: '24',
      },
      statistics: {},
    },
  ],
};

test('parseGoogleTrendsRss: XML 엔티티·보도 근거·ISO 시각을 정확히 파싱하고 빈 XML은 빈 배열', () => {
  assert.equal(decodeXmlEntities('<![CDATA[A &amp; &quot;B&quot;]]>'), 'A & "B"');
  const items = parseGoogleTrendsRss(SAMPLE_RSS);
  assert.equal(items.length, 1);
  assert.equal(items[0].keyword, 'Wicked');
  assert.equal(items[0].approxTraffic, '5000+');
  assert.equal(items[0].publishedAt, '2026-11-19T06:00:00.000Z');
  assert.equal(items[0].newsItems[0].title, '영화 "위키드" 한국 박스오피스 1위 & 흥행');
  assert.equal(items[0].newsItems[0].source, '한국경제');
  assert.deepEqual(parseGoogleTrendsRss(''), []);
});

test('parseYoutubePopularKr: 조회수 결측은 0이 아니라 null로 보존한다', () => {
  const items = parseYoutubePopularKr(SAMPLE_YT);
  assert.equal(items.length, 2);
  assert.equal(items[0].viewCount, 197747);
  assert.equal(items[1].viewCount, null, '결측 조회수를 0으로 꾸며내지 않는다');
});

test('collectKoreanTrends: 정상·부분 실패(이전 유지)·키 없음·전체 실패(기존 보존) 전 분기', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kr-trends-'));
  const file = join(dir, 'korean-trends.json');
  try {
    // 1) 정상 분기: 두 소스 모두 성공
    const okFetch = async (url) => {
      if (String(url).includes('trends.google.com')) return {ok: true, status: 200, text: async () => SAMPLE_RSS};
      return {ok: true, status: 200, json: async () => SAMPLE_YT};
    };
    const r1 = await collectKoreanTrends({now: new Date('2026-11-19T01:00:00Z'), fetchImpl: okFetch, apiKey: 'KEY', path: file});
    assert.equal(r1.ok, true);
    assert.equal(r1.googleTrendsCount, 1);
    assert.equal(r1.youtubePopularCount, 2);

    // 2) 부분 실패 분기: YouTube API 503 실패, Google Trends 성공 -> 이전 YouTube 항목 보존 + stale:true
    const partialFetch = async (url) => {
      if (String(url).includes('trends.google.com')) return {ok: true, status: 200, text: async () => SAMPLE_RSS};
      return {ok: false, status: 503, json: async () => ({error: {message: 'Service Unavailable'}})};
    };
    const r2 = await collectKoreanTrends({now: new Date('2026-11-20T01:00:00Z'), fetchImpl: partialFetch, apiKey: 'KEY', path: file});
    assert.equal(r2.ok, true);
    assert.equal(r2.sources.googleTrendsKr.ok, true);
    assert.equal(r2.sources.youtubePopularKr.ok, false);
    assert.equal(r2.sources.youtubePopularKr.stale, true);
    const saved2 = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(saved2.youtubePopular.length, 2, '실패한 소스의 이전 정상 항목을 유지한다');

    // 3) API 키 없음 분기: Google Trends만으로 성공, YouTube 사유 기록
    const r3 = await collectKoreanTrends({now: new Date('2026-11-21T01:00:00Z'), fetchImpl: okFetch, apiKey: null, path: file});
    assert.equal(r3.ok, true);
    assert.equal(r3.sources.youtubePopularKr.error, 'YOUTUBE_API_KEY 없음');

    // 4) 전체 실패 분기: 둘 다 실패 -> ok:false이고 디스크 기존 정상 파일을 덮어쓰지 않는다
    const failFetch = async () => { throw new Error('network down'); };
    const beforeFail = readFileSync(file, 'utf8');
    const r4 = await collectKoreanTrends({now: new Date('2026-11-22T01:00:00Z'), fetchImpl: failFetch, apiKey: 'KEY', path: file});
    assert.equal(r4.ok, false);
    assert.equal(readFileSync(file, 'utf8'), beforeFail, '전체 실패 시 기존 정상 데이터를 덮어쓰지 않는다');
  } finally {
    rmSync(dir, {recursive: true, force: true});
  }
});

test('renderKoreanTrends & renderNextEpisodeInput: 13절에 한국 내 관심 근거와 수집 상태를 표시하고 빈 데이터는 수집 전으로 표시', () => {
  const emptyLines = renderKoreanTrends(null).join('\n');
  assert.ok(emptyLines.includes('국내 실시간 트렌드 수집 전'));

  const store = {
    schemaVersion: 1,
    region: 'KR',
    collectedAt: '2026-11-19T08:00:00.000Z',
    sources: {
      googleTrendsKr: {ok: true, count: 1, stale: false, error: null},
      youtubePopularKr: {ok: true, count: 2, stale: false, error: null},
    },
    googleTrends: parseGoogleTrendsRss(SAMPLE_RSS),
    youtubePopular: parseYoutubePopularKr(SAMPLE_YT),
  };
  const md = renderNextEpisodeInput({generatedAt: '2026-11-19T08:05:00.000Z', koreanTrends: store});
  assert.ok(md.includes('## 13. 국내 실시간 트렌드'));
  assert.ok(md.includes('Wicked'));
  assert.ok(md.includes('한국경제'));
  assert.ok(md.includes('Do you know (2026 Version)'));
  assert.ok(md.includes('조회 미상'));
});
