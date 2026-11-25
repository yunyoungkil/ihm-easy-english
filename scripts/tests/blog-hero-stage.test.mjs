import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

import {HERO_CANDIDATES_PER_ROUND, HERO_ROUNDS, produceHero, summarizeBrief} from '../blog/hero-stage.mjs';

const BRIEF = {
  moment: '개찰구 앞에서 교통카드가 안 찍혀 멈춘 순간',
  subject: 'generic card holder on a phone back',
  setting: 'subway gate, morning rush',
  light: 'cool fluorescent mixed with warm exit sign',
  lens: '35mm, low angle',
  angle: 'low three-quarter',
  texture: 'matte plastic, worn sleeve',
  medium: 'documentary photo',
  avoid: ['brand logos'],
  alt: '개찰구 앞에서 교통카드가 안 찍혀 멈춘 순간.',
};

async function withTmp(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'hero-stage-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, {recursive: true, force: true});
  }
}

function makeDeps(overrides = {}) {
  const calls = {generate: 0, pick: 0, upload: 0, records: []};
  const deps = {
    heroDir: (topicId, projectDir) => path.join(projectDir, 'output', 'blog', 'images', topicId),
    readHeroRecord: async () => null,
    writeHeroRecord: async (_dir, record) => {
      calls.records.push(record);
    },
    generateCandidates: async ({count}) => {
      calls.generate += 1;
      return Array.from({length: count}, (_, i) => ({path: `/fake/cand-${i + 1}.png`, ok: true}));
    },
    probeImage: async () => ({width: 1376, height: 768, bytes: 600000}),
    checkCandidateFile: () => [],
    dHash: async () => '00ff00ff00ff00ff',
    isDuplicateOfRecent: () => false,
    runPicker: async ({candidates}) => {
      calls.pick += 1;
      return {chosen: candidates[0].path, verdict: {chosen: 'cand-1.png', reasons: [], fixes: []}};
    },
    encodeForUpload: async () => {},
    loadPostEmail: () => 'test.secret@blogger.com',
    uploadHeroViaEmail: async () => {
      calls.upload += 1;
      return {
        ok: true,
        base: 'https://blogger.googleusercontent.com/img/b/X',
        fileName: 'cand-1.jpg',
        urls: {s1600: 'https://blogger.googleusercontent.com/img/b/X/s1600/cand-1.jpg', og: 'https://blogger.googleusercontent.com/img/b/X/w1200-h630-p-k-no-nu/cand-1.jpg'},
      };
    },
    ...overrides,
  };
  return {deps, calls};
}

const run = (dir, deps, extra = {}) =>
  produceHero({draft: {heroImage: BRIEF}, topicId: 't1', mode: 'auto', projectDir: dir, blogId: 'b', token: 'tok', deps, ...extra});

test('summarizeBrief는 moment·angle·light·lens·medium만 남긴다', () => {
  assert.deepEqual(summarizeBrief(BRIEF), {
    moment: BRIEF.moment,
    angle: BRIEF.angle,
    light: BRIEF.light,
    lens: BRIEF.lens,
    medium: BRIEF.medium,
  });
});

test('heroImage 칸이 없으면 brief 단계에서 실패한다', async () => {
  await withTmp(async (dir) => {
    const {deps} = makeDeps();
    const res = await produceHero({draft: {}, topicId: 't1', projectDir: dir, deps});
    assert.equal(res.ok, false);
    assert.equal(res.stage, 'brief');
  });
});

test('정상 흐름: 후보 3장 → 고르기 → 올리기, 본문용 주소(s1600)와 기록 저장', async () => {
  await withTmp(async (dir) => {
    const {deps, calls} = makeDeps();
    const res = await run(dir, deps);
    assert.equal(res.ok, true);
    assert.equal(calls.generate, 1);
    assert.equal(calls.pick, 1);
    assert.equal(calls.upload, 1);
    assert.match(res.hero.url, /\/s1600\/cand-1\.jpg$/);
    assert.equal(res.hero.alt, BRIEF.alt);
    assert.equal(res.hero.hash, '00ff00ff00ff00ff');
    assert.equal(calls.records.at(-1).urls.s1600, res.hero.url);
    assert.equal(HERO_CANDIDATES_PER_ROUND, 3);
  });
});

test('이미 올린 기록이 있으면 그림을 다시 만들지 않고 그 주소를 쓴다', async () => {
  await withTmp(async (dir) => {
    const {deps, calls} = makeDeps({
      readHeroRecord: async () => ({urls: {s1600: 'https://blogger.googleusercontent.com/img/b/Y/s1600/h.jpg'}, hash: 'aaaaaaaaaaaaaaaa'}),
    });
    const res = await run(dir, deps);
    assert.equal(res.ok, true);
    assert.equal(calls.generate, 0);
    assert.equal(calls.upload, 0);
    assert.equal(res.hero.hash, 'aaaaaaaaaaaaaaaa');
  });
});

test('후보 생성이 전부 실패하면(로그아웃·한도) 한 바퀴만 시도하고 실패를 돌려준다', async () => {
  await withTmp(async (dir) => {
    const {deps, calls} = makeDeps({
      generateCandidates: async ({count}) => {
        return Array.from({length: count}, () => ({path: '', ok: false, error: 'aistudio-login'}));
      },
    });
    const res = await run(dir, deps);
    assert.equal(res.ok, false);
    assert.equal(res.stage, 'pick');
    assert.match(res.reasons.join(' '), /aistudio-login/);
    assert.equal(calls.pick, 0);
    assert.equal(calls.upload, 0);
  });
});

test('고르기에서 모두 탈락하면 고칠 점을 avoid에 합쳐 2바퀴까지 다시 뽑는다', async () => {
  await withTmp(async (dir) => {
    const seenBriefs = [];
    const {deps, calls} = makeDeps({
      generateCandidates: async ({brief, count}) => {
        seenBriefs.push(brief);
        return Array.from({length: count}, (_, i) => ({path: `/fake/c${i}.png`, ok: true}));
      },
      runPicker: async () => ({chosen: null, verdict: {chosen: null, reasons: ['로고가 보임'], fixes: ['no visible logos on the gate']}}),
    });
    const res = await run(dir, deps);
    assert.equal(res.ok, false);
    assert.equal(seenBriefs.length, HERO_ROUNDS);
    assert.ok(seenBriefs[1].avoid.includes('no visible logos on the gate'));
    assert.ok(!seenBriefs[0].avoid.includes('no visible logos on the gate'));
    assert.equal(calls.upload, 0);
    assert.match(res.reasons.join(' '), /로고가 보임/);
  });
});

test('파일 점검 문제와 이전 그림과의 중복 후보는 고르기에 넘기지 않는다', async () => {
  await withTmp(async (dir) => {
    let picked = [];
    const {deps} = makeDeps({
      checkCandidateFile: (probe) => (probe.width < 1200 ? [{id: 'file-too-narrow', text: '가로가 1200보다 작습니다.'}] : []),
      probeImage: async (file) => (file.endsWith('cand-1.png') ? {width: 800, height: 450, bytes: 90000} : {width: 1376, height: 768, bytes: 600000}),
      isDuplicateOfRecent: (_hash) => false,
      runPicker: async ({candidates}) => {
        picked = candidates.map((c) => c.path);
        return {chosen: candidates[0].path, verdict: {chosen: 'x', reasons: [], fixes: []}};
      },
    });
    const res = await run(dir, deps);
    assert.equal(res.ok, true);
    assert.ok(!picked.includes('/fake/cand-1.png'));
    assert.equal(picked.length, 2);
  });
});

test('올리기가 실패하면 upload 단계 실패를 돌려주고 기록에 고른 그림은 남는다', async () => {
  await withTmp(async (dir) => {
    const {deps, calls} = makeDeps({
      uploadHeroViaEmail: async () => ({ok: false, stage: 'find', error: 'draft-timeout'}),
    });
    const res = await run(dir, deps);
    assert.equal(res.ok, false);
    assert.equal(res.stage, 'upload');
    assert.match(res.reasons[0], /find\/draft-timeout/);
    assert.equal(calls.records.at(-1).chosen, '/fake/cand-1.png');
    assert.equal(calls.records.at(-1).urls, undefined);
  });
});

test('게시용 주소(.env)가 없으면 올리지 않고 upload 단계 실패', async () => {
  await withTmp(async (dir) => {
    const {deps, calls} = makeDeps({loadPostEmail: () => null});
    const res = await run(dir, deps);
    assert.equal(res.ok, false);
    assert.equal(res.stage, 'upload');
    assert.equal(calls.upload, 0);
  });
});

test('preview 모드는 올리지 않고 로컬 jpg 주소(file://)를 돌려준다', async () => {
  await withTmp(async (dir) => {
    const {deps, calls} = makeDeps();
    const res = await run(dir, deps, {mode: 'preview'});
    assert.equal(res.ok, true);
    assert.equal(res.local, true);
    assert.match(res.hero.url, /^file:\/\//);
    assert.equal(calls.upload, 0);
  });
});

test('기록에 남은 고른 그림 파일이 있으면 다시 만들지 않고 올리기만 한다', async () => {
  await withTmp(async (dir) => {
    const chosenFile = path.join(dir, 'cand-2.png');
    await writeFile(chosenFile, 'x');
    const {deps, calls} = makeDeps({readHeroRecord: async () => ({chosen: chosenFile})});
    const res = await run(dir, deps);
    assert.equal(res.ok, true);
    assert.equal(calls.generate, 0);
    assert.equal(calls.pick, 0);
    assert.equal(calls.upload, 1);
  });
});
