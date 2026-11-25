import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {
  AGE_WORDS,
  BRAND_WORDS,
  HERO_FIELDS,
  HERO_MIN_BYTES,
  HERO_MIN_WIDTH,
  WATERMARK_LINE,
  checkCandidateFile,
  composeHeroPrompt,
  cornerCrops,
  dHash,
  encodeForUpload,
  generateCandidates,
  hamming,
  heroDir,
  isDuplicateOfRecent,
  probeImage,
  readHeroRecord,
  runPicker,
  validateHeroBrief,
  writeHeroRecord,
} from '../blog/hero-image.mjs';

const VALID_BRIEF = {
  moment: 'a commuter taps a transit card on a gate reader and nothing happens while people queue behind',
  subject: 'a plain unbranded transit card held against a gate reader',
  setting: 'a subway fare gate in early evening',
  light: 'low warm sodium light from the side with deep shadow',
  lens: '85mm telephoto compressing the queue',
  angle: 'low angle from beside the reader',
  texture: 'worn plastic, brushed steel, grit',
  medium: 'documentary film photograph with visible grain',
  avoid: ['readable text on the reader screen', 'logos on the card'],
  alt: '교통카드가 단말기에 안 찍혀 뒤에 줄이 선 순간.',
};
const TOPIC = {title: '교통카드가 단말기에서 안 찍힐 때 확인 순서', productHint: null};
const ids = (res) => res.problems.map((p) => p.id);

async function withTmp(fn) {
  const dir = await mkdtemp(path.join(tmpdir(), 'hero-test-'));
  try { return await fn(dir); } finally { await rm(dir, {recursive: true, force: true}); }
}

test('HERO_FIELDS는 설계의 열 칸이고 유효한 설계도는 통과한다', () => {
  assert.deepEqual(HERO_FIELDS, ['moment', 'subject', 'setting', 'light', 'lens', 'angle', 'texture', 'medium', 'avoid', 'alt']);
  assert.ok(AGE_WORDS.includes('elderly') && BRAND_WORDS.includes('다이슨'));
  assert.deepEqual(validateHeroBrief(VALID_BRIEF, {topic: TOPIC}), {ok: true, problems: []});
});

test('validateHeroBrief: 빈칸(문자열 칸, avoid 빈 배열, 설계도 없음)은 brief-field-missing', () => {
  const blank = validateHeroBrief({...VALID_BRIEF, light: '  ', avoid: []}, {topic: TOPIC});
  assert.deepEqual(ids(blank), ['brief-field-missing']);
  assert.match(blank.problems[0].text, /light/);
  assert.match(blank.problems[0].text, /avoid/);

  const none = validateHeroBrief(undefined, {topic: TOPIC});
  assert.equal(none.ok, false);
  assert.deepEqual(ids(none), ['brief-field-missing']);
  for (const f of HERO_FIELDS) assert.match(none.problems[0].text, new RegExp(f));

  assert.equal(validateHeroBrief({...VALID_BRIEF, avoid: ['ok', 3]}).ok, false);
});

test('validateHeroBrief: 구도·빛·렌즈·화풍은 값을 가리지 않는다', () => {
  const other = {...VALID_BRIEF, light: 'flat overcast', lens: '24mm wide', angle: 'dead center frontal', medium: 'watercolor'};
  assert.deepEqual(validateHeroBrief(other, {topic: TOPIC}), {ok: true, problems: []});
});

test('validateHeroBrief: alt·moment의 금지어는 brief-banned-term', () => {
  const inAlt = validateHeroBrief({...VALID_BRIEF, alt: '유성음 때문에 단말기가 안 읽히는 순간이다.'}, {topic: TOPIC});
  assert.deepEqual(ids(inAlt), ['brief-banned-term']);
  const inMoment = validateHeroBrief({...VALID_BRIEF, moment: '유성음 때문에 reader fails'}, {topic: TOPIC});
  assert.deepEqual(ids(inMoment), ['brief-banned-term']);
});

test('validateHeroBrief: 나이 낱말은 brief-age-word', () => {
  for (const subject of ['an elderly person with a card', 'a 60대 man with a card', 'an old man with a card', 'a person aged 45 세 with a card']) {
    assert.deepEqual(ids(validateHeroBrief({...VALID_BRIEF, subject}, {topic: TOPIC})), ['brief-age-word'], subject);
  }
  assert.deepEqual(ids(validateHeroBrief({...VALID_BRIEF, alt: '할머니가 교통카드를 찍었는데 반응이 없는 순간.'}, {topic: TOPIC})), ['brief-age-word']);
  // 세대·세트 같은 낱말은 나이가 아니다
  assert.equal(validateHeroBrief({...VALID_BRIEF, subject: 'a 3세대 reader and a set of cards'}, {topic: TOPIC}).ok, true);
});

test('validateHeroBrief: 브랜드 낱말은 brief-brand-word, 글감에도 나온 낱말은 표시한다', () => {
  const res = validateHeroBrief({...VALID_BRIEF, subject: 'a Dyson vacuum next to a LG fridge'}, {topic: {title: '다이슨 V8 빨간불 깜빡임', productHint: null}});
  assert.deepEqual(ids(res), ['brief-brand-word']);
  assert.match(res.problems[0].text, /Dyson/);
  assert.match(res.problems[0].text, /LG/);
  const koBrand = validateHeroBrief({...VALID_BRIEF, subject: '다이슨 청소기 본체'}, {topic: {title: '다이슨 V8 빨간불 깜빡임', productHint: null}});
  assert.deepEqual(ids(koBrand), ['brief-brand-word']);
  assert.match(koBrand.problems[0].text, /다이슨\(글감에도 나옴\)/);

  assert.deepEqual(ids(validateHeroBrief({...VALID_BRIEF, setting: '티머니 충전소 앞'}, {topic: TOPIC})), ['brief-brand-word']);
  // 영문 낱말 안에 들어 있는 글자는 브랜드가 아니다
  assert.equal(validateHeroBrief({...VALID_BRIEF, subject: 'an algorithm poster is not a brand'}, {topic: TOPIC}).ok, true);
});

test('validateHeroBrief: alt 형식(머리말, 마침표, 글자 수, 한국어)', () => {
  for (const alt of [
    '사진 속 교통카드가 단말기에 안 찍히는 순간.',
    '이미지로 본 교통카드가 단말기에 안 찍히는 순간.',
    '교통카드가 단말기에 안 찍힌다. 뒤에 줄이 섰다.',
    '교통카드가 단말기에 안 찍히는 순간',
    '짧은 문장.',
    `${'가'.repeat(80)}.`,
    'A transit card fails at the gate reader.',
  ]) {
    assert.deepEqual(ids(validateHeroBrief({...VALID_BRIEF, alt}, {topic: TOPIC})), ['brief-alt-form'], alt);
  }
});

test('composeHeroPrompt: 칸 값이 문장에 그대로 들어가고 브랜드·워터마크 금지 문장이 붙는다', () => {
  const prompt = composeHeroPrompt(VALID_BRIEF);
  for (const f of ['moment', 'subject', 'setting', 'light', 'lens', 'angle', 'texture', 'medium']) {
    assert.ok(prompt.includes(VALID_BRIEF[f]), `${f} 값이 지시문에 있어야 한다`);
  }
  for (const a of VALID_BRIEF.avoid) assert.ok(prompt.includes(a));
  assert.ok(prompt.includes('no brand names, no logos, no text or letters in the image') || prompt.includes('No brand names, no logos, no text or letters in the image'));
  assert.ok(prompt.includes('generic unbranded objects'));
  assert.ok(prompt.trim().endsWith(WATERMARK_LINE));
  assert.equal(WATERMARK_LINE, 'No watermark, no AI logos, no Gemini logo or sparkle icons, clean corners without stamps or overlays, ultra-clean edges.');
  assert.ok(!prompt.includes('..'));

  const other = composeHeroPrompt({...VALID_BRIEF, light: 'flat overcast', medium: 'ink drawing'});
  assert.ok(other.includes('flat overcast') && other.includes('ink drawing'));
  assert.ok(!other.includes(VALID_BRIEF.light));
});

test('checkCandidateFile: 가로·비율·바이트 문제를 각각 잡는다', () => {
  assert.deepEqual(checkCandidateFile({width: 1376, height: 768, bytes: 641000}), []);
  assert.deepEqual(checkCandidateFile({width: 1200, height: 675, bytes: HERO_MIN_BYTES}), []);
  assert.deepEqual(checkCandidateFile({width: HERO_MIN_WIDTH - 1, height: 670, bytes: 90000}).map((p) => p.id), ['file-too-narrow']);
  assert.deepEqual(checkCandidateFile({width: 1376, height: 1376, bytes: 90000}).map((p) => p.id), ['file-ratio']);
  assert.deepEqual(checkCandidateFile({width: 1376, height: 768, bytes: HERO_MIN_BYTES - 1}).map((p) => p.id), ['file-too-small']);
  assert.deepEqual(checkCandidateFile({width: 320, height: 320, bytes: 10}).map((p) => p.id), ['file-too-narrow', 'file-ratio', 'file-too-small']);
});

test('hamming·isDuplicateOfRecent', () => {
  assert.equal(hamming('0000000000000000', '0000000000000000'), 0);
  assert.equal(hamming('0000000000000000', '000000000000000f'), 4);
  assert.equal(hamming('ffffffffffffffff', '0000000000000000'), 64);
  assert.throws(() => hamming('00', '0000'));

});

test('isDuplicateOfRecent: 거리 10 이하는 겹침, 11부터는 아님, 비교 대상이 없으면 아님', () => {
  const base = '0000000000000000';
  const dist10 = '00000000000003ff'; // 비트 10개
  const dist11 = '00000000000007ff'; // 비트 11개
  assert.equal(hamming(base, dist10), 10);
  assert.equal(hamming(base, dist11), 11);
  assert.equal(isDuplicateOfRecent(base, [dist10]), true);
  assert.equal(isDuplicateOfRecent(base, [dist11]), false);
  assert.equal(isDuplicateOfRecent(base, [dist11], 11), true);
  assert.equal(isDuplicateOfRecent(base, []), false);
});

test('generateCandidates: 지시문을 파일로 쓰고 순서대로 실행하며 실패는 ok:false로 돌려준다', async () => {
  await withTmp(async (projectDir) => {
    const calls = [];
    let running = 0;
    let maxRunning = 0;
    const runImage = async ({promptFile, output, aspect}) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      calls.push({promptFile, output, aspect});
      await new Promise((r) => setTimeout(r, 5));
      running -= 1;
      if (output.endsWith('cand-2.png')) return {ok: false, error: '한도 소진'};
      if (output.endsWith('cand-3.png')) throw new Error('크롬 연결 실패');
      await writeFile(output, 'png');
      return {ok: true};
    };
    const res = await generateCandidates({brief: VALID_BRIEF, topicId: 't-1', projectDir, runImage});
    const dir = heroDir('t-1', projectDir);
    assert.equal(maxRunning, 1);
    assert.equal(calls.length, 3);
    assert.ok(calls.every((c) => c.aspect === '16:9'));
    assert.deepEqual(res.map((r) => [path.basename(r.path), r.ok]), [['cand-1.png', true], ['cand-2.png', false], ['cand-3.png', false]]);
    assert.equal(res[1].error, '한도 소진');
    assert.match(res[2].error, /크롬 연결 실패/);
    assert.equal(path.dirname(res[0].path), dir);
    const written = await readFile(path.join(dir, 'prompt-1.txt'), 'utf8');
    assert.ok(written.includes(VALID_BRIEF.moment) && written.includes(WATERMARK_LINE));
    assert.ok(existsSync(path.join(dir, 'prompt-3.txt')));
  });
});

test('generateCandidates: runImage가 ok여도 파일이 없으면 실패, count를 지킨다', async () => {
  await withTmp(async (projectDir) => {
    const res = await generateCandidates({brief: VALID_BRIEF, topicId: 't-2', count: 2, projectDir, runImage: async () => ({ok: true})});
    assert.equal(res.length, 2);
    assert.ok(res.every((r) => r.ok === false && /만들어지지 않았/.test(r.error)));
  });
});

function pickerFixture(projectDir, topicId = 't-3') {
  const dir = heroDir(topicId, projectDir);
  const candidates = ['cand-1.png', 'cand-2.png', 'cand-3.png'].map((n) => ({path: path.join(dir, n), ok: true}));
  const cropCorners = async (file) => ['tl', 'tr', 'bl', 'br'].map((c) => path.join(dir, 'corners', `${path.basename(file, '.png')}-corner-${c}.png`));
  return {dir, candidates, cropCorners};
}

test('runPicker: verdict.json이 정상이면 고른 후보의 경로와 verdict를 돌려주고 프롬프트에 후보·모서리·기준이 들어 있다', async () => {
  await withTmp(async (projectDir) => {
    const {dir, candidates, cropCorners} = pickerFixture(projectDir);
    let seenPrompt = '';
    const runClaude = async ({prompt, verdictPath}) => {
      seenPrompt = prompt;
      await writeFile(verdictPath, JSON.stringify({chosen: 'cand-2.png', reasons: ['2번이 문제 장면'], fixes: []}));
      return {ok: true};
    };
    const res = await runPicker({topicId: 't-3', candidates, projectDir, runClaude, cropCorners});
    assert.equal(res.chosen, path.join(dir, 'cand-2.png'));
    assert.deepEqual(res.verdict.reasons, ['2번이 문제 장면']);
    assert.ok(seenPrompt.includes('output/blog/images/t-3/cand-1.png'));
    assert.ok(seenPrompt.includes('output/blog/images/t-3/corners/cand-3-corner-br.png'));
    assert.ok(seenPrompt.includes('output/blog/images/t-3/verdict.json'));
    for (const word of ['워터마크', '로고', '글자', '평균 구도', '1200x630']) assert.ok(seenPrompt.includes(word), word);
  });
});

test('runPicker: 모두 떨어뜨리면 chosen null과 고칠 점을 돌려준다', async () => {
  await withTmp(async (projectDir) => {
    const {candidates, cropCorners} = pickerFixture(projectDir);
    const runClaude = async ({verdictPath}) => {
      await writeFile(verdictPath, JSON.stringify({chosen: null, reasons: ['전부 로고 닮음'], fixes: ['카드 모양을 더 평범하게']}));
      return {ok: true};
    };
    const res = await runPicker({topicId: 't-3', candidates, projectDir, runClaude, cropCorners});
    assert.equal(res.chosen, null);
    assert.deepEqual(res.verdict.fixes, ['카드 모양을 더 평범하게']);
  });
});

test('runPicker: verdict 형식 불량, 없는 후보 이름, 파일 없음, 실행 실패는 모두 chosen null', async () => {
  const bad = [
    ['깨진 JSON', async ({verdictPath}) => { await writeFile(verdictPath, '{oops'); return {ok: true}; }],
    ['후보에 없는 이름', async ({verdictPath}) => { await writeFile(verdictPath, JSON.stringify({chosen: 'cand-9.png', reasons: [], fixes: []})); return {ok: true}; }],
    ['reasons가 배열이 아님', async ({verdictPath}) => { await writeFile(verdictPath, JSON.stringify({chosen: 'cand-1.png', reasons: 'x', fixes: []})); return {ok: true}; }],
    ['chosen 칸 없음', async ({verdictPath}) => { await writeFile(verdictPath, JSON.stringify({reasons: [], fixes: []})); return {ok: true}; }],
    ['파일을 안 씀', async () => ({ok: true})],
    ['실행 실패', async () => ({ok: false, error: '5시간 한도'})],
    ['예외', async () => { throw new Error('spawn 실패'); }],
  ];
  for (const [name, runClaude] of bad) {
    await withTmp(async (projectDir) => {
      const {candidates, cropCorners} = pickerFixture(projectDir);
      const res = await runPicker({topicId: 't-3', candidates, projectDir, runClaude, cropCorners});
      assert.equal(res.chosen, null, name);
      assert.equal(res.verdict.chosen, null, name);
      assert.ok(res.verdict.reasons.length > 0, name);
    });
  }
});

test('runPicker: 후보가 없거나 모서리 조각을 못 만들면 Opus를 부르지 않는다', async () => {
  await withTmp(async (projectDir) => {
    const {candidates, cropCorners} = pickerFixture(projectDir);
    let called = 0;
    const runClaude = async () => { called += 1; return {ok: true}; };
    const none = await runPicker({topicId: 't-3', candidates: [{path: candidates[0].path, ok: false}], projectDir, runClaude, cropCorners});
    assert.equal(none.chosen, null);
    const noCorners = await runPicker({topicId: 't-3', candidates, projectDir, runClaude, cropCorners: async () => { throw new Error('ffmpeg 없음'); }});
    assert.equal(noCorners.chosen, null);
    assert.match(noCorners.verdict.reasons[0], /모서리/);
    assert.equal(called, 0);
  });
});

test('writeHeroRecord·readHeroRecord: hero.json을 쓰고 읽고, 없으면 null', async () => {
  await withTmp(async (projectDir) => {
    const dir = heroDir('t-4', projectDir);
    assert.equal(await readHeroRecord(dir), null);
    const record = {url: 'https://blogger.googleusercontent.com/img/a/x/s1600/h.jpg', hash: '0f0f0f0f0f0f0f0f', promptFile: 'prompt-2.txt'};
    await writeHeroRecord(dir, record);
    assert.deepEqual(await readHeroRecord(dir), record);
  });
});

// ---- 실제 ffmpeg/ffprobe(PATH에 있다) ---------------------------------------------------------

function makeSample(file, source) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', source, '-frames:v', '1', file]);
}

test('실제 ffmpeg: probeImage·dHash·encodeForUpload·cornerCrops (320x180)', async () => {
  await withTmp(async (dir) => {
    const a = path.join(dir, 'a.png');
    const flat = path.join(dir, 'flat.png');
    makeSample(a, 'testsrc2=size=320x180');
    makeSample(flat, 'color=c=white:size=320x180');

    const probe = await probeImage(a);
    assert.equal(probe.width, 320);
    assert.equal(probe.height, 180);
    assert.ok(probe.bytes > 0);

    const hashA = await dHash(a);
    assert.match(hashA, /^[0-9a-f]{16}$/);
    assert.equal(hamming(hashA, await dHash(a)), 0);
    assert.ok(hamming(hashA, await dHash(flat)) > 10);

    const jpg = path.join(dir, 'out', 'a.jpg');
    assert.equal(await encodeForUpload(a, jpg), jpg);
    const jprobe = await probeImage(jpg);
    assert.deepEqual([jprobe.width, jprobe.height], [320, 180]);
    const head = await readFile(jpg);
    assert.equal(head[0], 0xff);
    assert.equal(head[1], 0xd8);

    const crops = await cornerCrops(a, path.join(dir, 'corners'));
    assert.equal(crops.length, 4);
    for (const c of crops) {
      const p = await probeImage(c);
      assert.deepEqual([p.width, p.height], [160, 88]); // 가로세로 25%(80x44)의 2배
    }
    assert.equal(new Set(crops).size, 4);
  });
});

test('실제 ffmpeg: 그림 파일이 아니면 probeImage가 던진다', async () => {
  await withTmp(async (dir) => {
    const bad = path.join(dir, 'bad.png');
    await mkdir(dir, {recursive: true});
    await writeFile(bad, 'not an image');
    await assert.rejects(() => probeImage(bad));
  });
});
