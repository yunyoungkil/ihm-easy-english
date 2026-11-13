// 실제 데이터 대조 테스트 (2026-11-12).
// 다른 테스트는 코드를 쓴 쪽이 만든 가짜 데이터로 돈다. 그러면 코드가 없는 칸을 읽어도 가짜 데이터가 같은 칸을 갖고 있어
// 통과한다(2026-11-11 D+7 순환: 카탈로그에 없는 `views`를 읽어 조회수가 늘 0이었는데 테스트 199개는 통과).
// 여기서는 저장소에 있는 실제 파일(data/youtube/*.json, output/upload-packages, videos/*/BRIEF.md)을 그대로 넣는다.
// 데이터가 매일 바뀌므로 "정확히 몇 회"가 아니라 "코드와 데이터가 서로 맞물리는가"만 본다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEpisodeOutcomes} from '../planning-outcome.mjs';

const projectDir = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const dataDir = join(projectDir, 'data', 'youtube');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, ''));
const has = (name) => existsSync(join(dataDir, name));

const catalogVideos = () => {
  const c = readJson(join(dataDir, 'catalog.json'));
  return Array.isArray(c?.videos) ? c.videos : (Array.isArray(c) ? c : []);
};

test('카탈로그: 코드가 읽는 칸이 실제로 있다 (statistics.viewCount, format, publishedAt)', {skip: !has('catalog.json') && '카탈로그 없음'}, () => {
  const videos = catalogVideos();
  assert.ok(videos.length > 0, '카탈로그가 비어 있음');
  const bad = videos.filter((v) => !v.videoId || !v.publishedAt
    || !['LONGFORM', 'SHORTS'].includes(v.format)
    || !Number.isFinite(Number(v.statistics?.viewCount)));
  assert.deepEqual(bad.map((v) => v.videoId), [], '칸이 빠진 영상');
  // 조회수 칸은 statistics.viewCount 하나뿐이다. 이걸 모르고 v.views를 읽으면 늘 0이 된다.
  assert.ok(videos.every((v) => !('views' in v) && !('viewCount' in v)), '카탈로그 맨 위에 views/viewCount 칸이 생김 — 읽는 코드를 다시 확인');
});

test('7일 판정: 실제 데이터로 돌리면 공개된 편이 나오고, 조회수는 카탈로그 값과 같다', {skip: !has('catalog.json') && '카탈로그 없음'}, () => {
  const outcomes = loadEpisodeOutcomes(projectDir);
  const byId = new Map(catalogVideos().map((v) => [v.videoId, v]));
  const published = outcomes.filter((o) => o.verdict !== 'pending' || o.title);
  assert.ok(published.length > 0, '공개된 편이 하나도 판정 대상에 안 들어옴 — 패키지 videoId와 카탈로그가 안 맞물림');
  for (const o of published) {
    assert.equal(o.views, Number(byId.get(o.videoId)?.statistics?.viewCount), `${o.label}: 판정의 조회수가 카탈로그와 다름`);
  }
  // 조회수가 있는 편이 하나라도 있으면 전부 0일 수 없다(읽는 칸이 틀렸을 때의 증상)
  if (published.some((o) => Number(byId.get(o.videoId)?.statistics?.viewCount) > 0)) {
    assert.ok(published.some((o) => o.views > 0), '모든 편의 조회수가 0 — 읽는 칸이 틀림');
  }
});

test('7일 조회 저장소: 값이 숫자이고 형식 이름이 맞다', {skip: !has('views-7d.json') && 'views-7d.json 없음'}, () => {
  const store = readJson(join(dataDir, 'views-7d.json')).videos || {};
  const bad = Object.entries(store).filter(([, v]) => !Number.isFinite(Number(v.views7d)) || Number(v.views7d) < 0
    || !['LONGFORM', 'SHORTS'].includes(v.format) || !v.startDate || !v.endDate);
  assert.deepEqual(bad.map(([id]) => id), []);
});

test('경쟁 채널 상태: 황금 광산·차단은 실제 판정(BRIEF 기획 근거 + 7일 판정)이 있어야 한다', {skip: !has('market-demand.json') && 'market-demand.json 없음'}, () => {
  // 2026-11-11 커밋 a99fc13이 "EP24 7일 성과 1.8배로 황금 광산 승격"을 손으로 적었다(그때 EP24는 공개 2일째).
  const channels = readJson(join(dataDir, 'market-demand.json')).trackedChannels || [];
  const outcomes = loadEpisodeOutcomes(projectDir);
  const judgedFor = (channelId, verdicts) => outcomes.some((o) => verdicts.includes(o.verdict)
    && (o.sources?.competitors || []).some((c) => c.channelId === channelId));
  for (const ch of channels) {
    if (ch.status === 'gold_mine') assert.ok(judgedFor(ch.channelId, ['worked']), `${ch.channelTitle}: 황금 광산인데 "통함" 판정을 받은 편이 없음 (${ch.statusReason})`);
    if (ch.status === 'blocked') assert.ok(judgedFor(ch.channelId, ['failed']), `${ch.channelTitle}: 차단인데 "안 통함" 판정을 받은 편이 없음 (${ch.statusReason})`);
    if (ch.status === 'graduated') {
      assert.ok(ch.exhaustion && ch.exhaustion.totalOutliers > 0 && ch.exhaustion.uncoveredCount === 0,
        `${ch.channelTitle}: 졸업인데 소재 소진 계산 결과가 없음 (${ch.statusReason})`);
    }
  }
});

test('통한 요소 기록: 항목마다 실제 공개 영상과 "통함" 판정이 있다', {skip: !has('success-patterns.json') && 'success-patterns.json 없음'}, () => {
  const entries = readJson(join(dataDir, 'success-patterns.json')).entries || [];
  const ids = new Set(catalogVideos().map((v) => v.videoId));
  const worked = new Set(loadEpisodeOutcomes(projectDir).filter((o) => o.verdict === 'worked').map((o) => o.videoId));
  for (const e of entries) {
    assert.ok(ids.has(e.videoId), `${e.id}: 카탈로그에 없는 영상`);
    assert.ok(worked.has(e.videoId), `${e.id}: 지금 판정이 "통함"이 아닌데 통한 요소 기록에 있음`);
    assert.ok(['가설', '확정'].includes(e.status), `${e.id}: 상태가 가설/확정이 아님(${e.status})`);
  }
});

test('업로드 패키지: 영상 ID가 적힌 패키지는 카탈로그에 그 영상이 있다', {skip: !has('catalog.json') && '카탈로그 없음'}, () => {
  const ids = new Set(catalogVideos().map((v) => v.videoId));
  const dir = join(projectDir, 'output', 'upload-packages');
  const missing = [];
  for (const d of existsSync(dir) ? readdirSync(dir, {withFileTypes: true}) : []) {
    if (!d.isDirectory()) continue;
    for (const name of ['status.json', 'shorts-status.json']) {
      const p = join(dir, d.name, name);
      if (!existsSync(p)) continue;
      const s = readJson(p);
      if (s.videoId && !ids.has(s.videoId)) missing.push(`${d.name}(${s.videoId}, ${s.status})`);
    }
  }
  assert.deepEqual(missing, [], '카탈로그에 없는 영상 ID — 지운 영상이거나 다른 채널, 또는 동기화 전');
});
