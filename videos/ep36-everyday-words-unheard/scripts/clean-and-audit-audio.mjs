import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const ASSETS = join(EP_DIR, 'assets');

const KO_FILES = [
  {id: 'c00', text: '방금 세 단어, 몇 개나 들리셨어요? 초콜릿, 카메라, 스테이크. 다 아는 단어인데 막상 원어민이 툭 던지면 멍해지죠. 우리가 평소에 한국말처럼 쓰는 발음이랑 영어 소리가 아예 다르게 생겨서 그래요.'},
  {id: 'c01a', text: '본격적으로 들어가기 전에, 자막 끄고 딱 세 문장만 먼저 들어 볼게요. 오늘 나올 일곱 단어가 그대로 들어가 있습니다.'},
  {id: 'c01b', text: '좀 훅 지나갔죠? 지금 다 안 들려도 상관없어요. 영상 끝무렵에 속도 하나 안 바꾸고 이 세 문장 그대로 다시 틀어 드릴게요. 지금 몇 단어쯤 잡혔는지만 머릿속에 살짝 담아 두면 됩니다.'},
  {id: 'c02a', text: '제일 만만한 초콜릿부터 들어 볼게요. 우리가 편의점이나 마트에서 뭐라고 해요? "초콜릿 하나 사 올게." 초, 콜, 릿. 세 글자로 또박또박 말하잖아요. 철자도 길고, 입에도 세 박자가 딱 붙어 있죠. 근데 원어민은 가운데 콜을 거의 안 읽어요. 들어 볼까요?'},
  {id: 'c02b', text: '초클릿, 딱 두 박자. 앞에 초만 세게 찍고 뒤는 그냥 흘려 넘겨서 초클릿으로 끝나요. 사진 찍을 때 맨날 쓰는 카메라도 비슷한 일이 생깁니다. 한글로는 카, 메, 라 세 글자인데, 원어민 소리는 어떨까요?'},
  {id: 'c02c', text: '캠러. 방금 메 어디 갔지 싶죠? 가운데 약한 글자를 건너뛰고 앞뒤를 붙여서 진짜 두 박자밖에 안 남아요.'},
  {id: 'c03a', text: '미드에서 의자나 옷 얘기할 때 정말 자주 나오는 컴퍼터블. 한글로 쓰면 컴, 퍼, 터, 블 네 글자죠. 입도 네 번이나 움직여야 돼요. 막상 들어 보면 가운데 퍼가 쏙 빠지고 컴프터블처럼 짧아집니다.'},
  {id: 'c03b', text: '입에선 벌써 끝났는데 내 머릿속엔 네 글자가 남아 있으니까 자꾸 놓치게 되죠. 앞에 힘이 들어가면 바로 뒤 글자는 빠진다, 일단 이것만 기억하면 돼요.'},
  {id: 'c04', text: '방금은 글자가 빠진 거였죠. 반대로 한국어가 글자를 억지로 늘려 놓은 단어도 있어요. 글자 보기 전에 소리 먼저 하나 들어 보실래요?'},
  {id: 'c05a', text: '방금 이거 무슨 단어인 줄 아셨어요? 스테이크예요. 스, 테, 이, 크, 한글로 세면 네 글자잖아요. 근데 영어에선 딱 한 박자. 스테익!'},
  {id: 'c05b', text: '왜 이렇게 짧아지냐면요, 우리말은 자음 혼자서는 글자를 못 쓰잖아요. 그래서 스, 크 뒤에 억지로 으를 붙여서 네 덩어리로 읽는데, 영어엔 그 으가 없거든요. 앞에 에스는 소리 대신 이 사이로 바람만 쓰 하고 스치고, 끝의 케이도 입안에서 툭 막고 끝납니다. 원어민이 혀가 빨라서가 아니에요. 우린 네 번 끊어 읽을 걸 저쪽은 숨 한 번에 끝내니까 당연히 안 들릴 수밖에 없어요.'},
  {id: 'c06a', text: '이제 남은 세 단어는 아예 얘기가 달라요. 우리가 평소에 "복숭아 알레르기 있어" 이런 말 자주 하잖아요. 사실 알레르기는 영어 발음이 아니라 독일어에서 온 말이에요. 미드나 유튜브에서 원어민이 말할 땐 아예 딴소리가 납니다.'},
  {id: 'c06b', text: '앨러지! 알, 레, 르, 기랑 앨러지. 소리가 아예 다른 단어처럼 들리죠. 약국에서 매일 보는 비타민도 미국 영어에선 첫 글자부터 바뀝니다. 우린 그냥 다 비타민이라고 하고 영국 쪽도 비슷하게 읽긴 해요. 미국 드라마나 일상 대화에선요?'},
  {id: 'c06c', text: '바이러민! 앞을 바이로 확 열고 가운데 티까지 부드럽게 굴립니다. 머릿속엔 비타민만 들어 있는데 영상에서 "테이크 유어 바이러민" 하면 무슨 낯선 약 이름인가 싶죠.'},
  {id: 'c07a', text: '마지막으로 하나만 직접 맞혀 볼까요? 호텔 조식에서 자주 보는 뷔페. 이것도 영어 소리가 아니라 프랑스어 발음이 그대로 들어왔어요. 그럼 미국 원어민은 이 단어를 어떻게 읽을까요? 잠깐, 입 밖으로 한 번만 말해 보세요.'},
  {id: 'c07b', text: '버페이! 앞에 힘을 빼고 뒤에 페이를 올려서 버페이. 뷔페랑은 소리가 아예 다르죠. 이제 드라마나 여행 영상에서 버페이 나오면 낯설지 않을 텐데요.'},
  {id: 'c08', text: '그럼 처음에 들었던 그 세 문장, 속도 그대로 다시 틀어 드릴게요. 아까보다 몇 단어 더 들리는지 직접 한 번 세어 볼까요?'},
  {id: 'c09a', text: '어떠세요, 아까보단 귀에 걸리는 단어가 꽤 늘었죠? 자막 켜고 바로 확인해 볼게요.'},
  {id: 'c09b', text: '첫 문장에 캠러, 초클릿, 컴프터블.'},
  {id: 'c09c', text: '둘째 문장에 스테익.'},
  {id: 'c09d', text: '마지막 문장에 버페이, 앨러지, 바이러민까지. 속도 하나도 안 줄였는데, 가운데 빠지고 한 박자로 줄고 애초에 발음이 다르다는 것만 알아도 귀가 다르게 열립니다.'},
  {id: 'c10', text: '오늘 나온 일곱 단어, 화면에 한 번에 띄워 둘게요. 외우려고 애쓰실 필요 없고, 필요할 때 잠깐 멈춰 놓고 캡처해 두셔도 됩니다. 일곱 개 중에 제일 "이게 이 소리였어?" 싶었던 단어 하나만 댓글에 남겨 주세요.'},
];

const EN_FILES = [
  {id: 'chocolate', phrase: 'chocolate /ˈtʃɑːklət/'},
  {id: 'camera', phrase: 'camera /ˈkæmrə/'},
  {id: 'comfortable', phrase: 'comfortable /ˈkʌmftɚbəl/'},
  {id: 'steak', phrase: 'steak /steɪk/'},
  {id: 'allergy', phrase: 'allergy /ˈælɚdʒi/'},
  {id: 'vitamin', phrase: 'vitamin /ˈvaɪt̬əmɪn/'},
  {id: 'buffet', phrase: 'buffet /bəˈfeɪ/'},
  {id: 'sent1', phrase: 'Grab your camera — this chocolate is great, and this chair is so comfortable.'},
  {id: 'sent2', phrase: 'We ordered a steak at the hotel.'},
  {id: 'sent3', phrase: 'Check the buffet for your allergy, and take your vitamin.'},
];

const CLEAN_FILTER =
  'silenceremove=start_periods=1:start_threshold=-45dB:detection=peak,' +
  'areverse,' +
  'silenceremove=start_periods=1:start_threshold=-50dB:detection=peak,' +
  'areverse,' +
  'loudnorm=I=-16:TP=-1.5:LRA=11';

function probe(file) {
  const raw = execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'stream=sample_rate,channels,codec_name', '-show_entries', 'format=duration', '-of', 'json', file],
    {encoding: 'utf8'},
  );
  const data = JSON.parse(raw);
  const st = data.streams?.[0] ?? {};
  return {
    duration: +Number(data.format.duration).toFixed(3),
    sampleRate: Number(st.sample_rate),
    channels: Number(st.channels),
    codec: st.codec_name,
  };
}

function measureVolume(file) {
  const r = spawnSync('ffmpeg', ['-i', file, '-af', 'volumedetect', '-f', 'null', '-'], {encoding: 'utf8'});
  const txt = `${r.stdout || ''}\n${r.stderr || ''}`;
  const mean = txt.match(/mean_volume:\s*([-\d.]+)\s*dB/)?.[1];
  const max = txt.match(/max_volume:\s*([-\d.]+)\s*dB/)?.[1];
  return {
    meanDb: mean !== undefined ? Number(mean) : null,
    maxDb: max !== undefined ? Number(max) : null,
  };
}

function cleanWav(src, dst) {
  mkdirSync(dirname(dst), {recursive: true});
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', CLEAN_FILTER, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', dst]);
}

mkdirSync(join(ASSETS, 'voice-clean'), {recursive: true});
mkdirSync(join(ASSETS, 'voice-en-clean'), {recursive: true});

const koMap = {};
for (const item of KO_FILES) {
  const src = join(ASSETS, 'voice', `${item.id}.wav`);
  const dst = join(ASSETS, 'voice-clean', `${item.id}.wav`);
  if (!existsSync(src)) throw new Error(`Missing raw voice: ${src}`);
  cleanWav(src, dst);
  const cleanProbe = probe(dst);
  const vol = measureVolume(dst);
  koMap[item.id] = {id: item.id, text: item.text, file: `assets/voice-clean/${item.id}.wav`, ...cleanProbe, ...vol};
}

const enMap = {};
for (const item of EN_FILES) {
  const src = join(ASSETS, 'voice-en', `${item.id}.wav`);
  const dst = join(ASSETS, 'voice-en-clean', `${item.id}.wav`);
  if (!existsSync(src)) throw new Error(`Missing raw voice-en: ${src}`);
  cleanWav(src, dst);
  const cleanProbe = probe(dst);
  const vol = measureVolume(dst);
  enMap[item.id] = {id: item.id, phrase: item.phrase, file: `assets/voice-en-clean/${item.id}.wav`, ...cleanProbe, ...vol};
}

const sfxMap = {};
for (const name of ['slash-cut', 'hydraulic-snap', 'quiz-countdown', 'reveal-chime', 'card-flip']) {
  const p = join(ASSETS, 'sfx', `${name}.wav`);
  sfxMap[name] = {id: name, file: `assets/sfx/${name}.wav`, ...probe(p), ...measureVolume(p)};
}

const r3 = (x) => Math.round(x * 1000) / 1000;

// Build deterministic zero-overlap scene-by-scene audio schedule
const SCENE_RECIPES = [
  {
    id: 'scene-00',
    title: '실물 세 단어 직격 도입',
    steps: [
      {gap: 0.35},
      {kind: 'en', key: 'chocolate', tag: 'hook-choc'},
      {gap: 0.45},
      {kind: 'en', key: 'camera', tag: 'hook-cam'},
      {gap: 0.45},
      {kind: 'en', key: 'steak', tag: 'hook-steak'},
      {gap: 0.55},
      {kind: 'ko', key: 'c00'},
      {gap: 0.65},
    ],
  },
  {
    id: 'scene-01',
    title: 'Before 자막 OFF 세 문장 블라인드 듣기',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c01a'},
      {gap: 0.65},
      {kind: 'en', key: 'sent1', tag: 'before-s1'},
      {gap: 0.75},
      {kind: 'en', key: 'sent2', tag: 'before-s2'},
      {gap: 0.75},
      {kind: 'en', key: 'sent3', tag: 'before-s3'},
      {gap: 0.85},
      {kind: 'ko', key: 'c01b'},
      {gap: 0.7},
    ],
  },
  {
    id: 'scene-02',
    title: '심층 해부 1 chocolate & camera',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c02a'},
      {gap: 0.4},
      {kind: 'en', key: 'chocolate', tag: 'choc-1', sfxBefore: 'slash-cut'},
      {gap: 0.55},
      {kind: 'en', key: 'chocolate', tag: 'choc-2'},
      {gap: 0.55},
      {kind: 'ko', key: 'c02b'},
      {gap: 0.4},
      {kind: 'en', key: 'camera', tag: 'cam-1', sfxBefore: 'slash-cut'},
      {gap: 0.55},
      {kind: 'en', key: 'camera', tag: 'cam-2'},
      {gap: 0.55},
      {kind: 'ko', key: 'c02c'},
      {gap: 0.7},
    ],
  },
  {
    id: 'scene-03',
    title: '심층 해부 2 comfortable',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c03a'},
      {gap: 0.4},
      {kind: 'en', key: 'comfortable', tag: 'comf-1', sfxBefore: 'slash-cut'},
      {gap: 0.55},
      {kind: 'en', key: 'comfortable', tag: 'comf-2'},
      {gap: 0.55},
      {kind: 'ko', key: 'c03b'},
      {gap: 0.7},
    ],
  },
  {
    id: 'scene-04',
    title: '짧은 반전 전환',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c04'},
      {gap: 0.65},
    ],
  },
  {
    id: 'scene-05',
    title: '소리 먼저 퀴즈형 심층 해부 3 steak',
    steps: [
      {gap: 0.35},
      {kind: 'en', key: 'steak', tag: 'steak-blind'},
      {gap: 1.2},
      {kind: 'ko', key: 'c05a'},
      {gap: 0.35},
      {kind: 'en', key: 'steak', tag: 'steak-1', sfxBefore: 'hydraulic-snap'},
      {gap: 0.55},
      {kind: 'en', key: 'steak', tag: 'steak-2'},
      {gap: 0.55},
      {kind: 'ko', key: 'c05b'},
      {gap: 0.75},
    ],
  },
  {
    id: 'scene-06',
    title: '묶음 대비 심층 해부 4 allergy & vitamin',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c06a'},
      {gap: 0.4},
      {kind: 'en', key: 'allergy', tag: 'allergy-1', sfxBefore: 'card-flip'},
      {gap: 0.55},
      {kind: 'en', key: 'allergy', tag: 'allergy-2'},
      {gap: 0.55},
      {kind: 'ko', key: 'c06b'},
      {gap: 0.4},
      {kind: 'en', key: 'vitamin', tag: 'vitamin-1', sfxBefore: 'card-flip'},
      {gap: 0.55},
      {kind: 'en', key: 'vitamin', tag: 'vitamin-2'},
      {gap: 0.55},
      {kind: 'ko', key: 'c06c'},
      {gap: 0.75},
    ],
  },
  {
    id: 'scene-07',
    title: '깜짝 퀴즈 5 buffet',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c07a'},
      {gap: 0.25},
      {kind: 'window', dur: 2.0, sfx: 'quiz-countdown', tag: 'buffet-window'},
      {gap: 0.25},
      {kind: 'en', key: 'buffet', tag: 'buffet-1', sfxBefore: 'reveal-chime'},
      {gap: 0.55},
      {kind: 'en', key: 'buffet', tag: 'buffet-2'},
      {gap: 0.55},
      {kind: 'ko', key: 'c07b'},
      {gap: 0.75},
    ],
  },
  {
    id: 'scene-08',
    title: 'After 자막 OFF 세 문장 재청취',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c08'},
      {gap: 0.65},
      {kind: 'en', key: 'sent1', tag: 'after-s1'},
      {gap: 0.75},
      {kind: 'en', key: 'sent2', tag: 'after-s2'},
      {gap: 0.75},
      {kind: 'en', key: 'sent3', tag: 'after-s3'},
      {gap: 0.9},
    ],
  },
  {
    id: 'scene-09',
    title: '자막 ON 일곱 단어 하이라이트 확인',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c09a'},
      {gap: 0.45},
      {kind: 'en', key: 'sent1', tag: 'check-s1', sfxBefore: 'reveal-chime'},
      {gap: 0.45},
      {kind: 'ko', key: 'c09b'},
      {gap: 0.45},
      {kind: 'en', key: 'sent2', tag: 'check-s2'},
      {gap: 0.45},
      {kind: 'ko', key: 'c09c'},
      {gap: 0.45},
      {kind: 'en', key: 'sent3', tag: 'check-s3'},
      {gap: 0.45},
      {kind: 'ko', key: 'c09d'},
      {gap: 0.75},
    ],
  },
  {
    id: 'scene-10',
    title: '일곱 단어 한 장 요약표 & 엔드스크린',
    steps: [
      {gap: 0.3},
      {kind: 'ko', key: 'c10'},
      {gap: 3.5},
      {kind: 'window', dur: 9.0, tag: 'endscreen'},
    ],
  },
];

let cursor = 0;
const scenes = [];
const audioCues = [];
let cueIdx = 0;

for (const rec of SCENE_RECIPES) {
  const start = r3(cursor);
  const events = {};
  const sceneCues = [];
  let local = 0;

  for (const st of rec.steps) {
    if (st.gap) {
      local += st.gap;
      continue;
    }
    if (st.kind === 'window') {
      const wStart = r3(start + local);
      const wLocal = r3(local);
      events[st.tag] = {localStart: wLocal, localEnd: r3(local + st.dur), globalStart: wStart, dur: st.dur};
      if (st.sfx) {
        const sfx = sfxMap[st.sfx];
        const cue = {id: `sfx-${++cueIdx}-${st.sfx}`, kind: 'sfx', file: sfx.file, start: wStart, duration: sfx.duration, volume: 0.48};
        audioCues.push(cue);
        sceneCues.push(cue);
      }
      local += st.dur;
      continue;
    }
    if (st.sfxBefore) {
      const sfx = sfxMap[st.sfxBefore];
      const sfxStart = r3(Math.max(start, start + local - 0.14));
      const cue = {id: `sfx-${++cueIdx}-${st.sfxBefore}`, kind: 'sfx', file: sfx.file, start: sfxStart, duration: sfx.duration, volume: 0.42};
      audioCues.push(cue);
      sceneCues.push(cue);
    }
    const map = st.kind === 'ko' ? koMap : enMap;
    const info = map[st.key];
    const gStart = r3(start + local);
    const lStart = r3(local);
    const cue = {
      id: `${st.kind}-${++cueIdx}-${st.key}`,
      kind: st.kind,
      key: st.key,
      tag: st.tag || st.key,
      file: info.file,
      text: info.text || info.phrase,
      start: gStart,
      localStart: lStart,
      duration: info.duration,
      end: r3(gStart + info.duration),
      localEnd: r3(lStart + info.duration),
      volume: 1.0,
    };
    audioCues.push(cue);
    sceneCues.push(cue);
    events[cue.tag] = {localStart: lStart, localEnd: cue.localEnd, globalStart: gStart, dur: info.duration};
    local += info.duration;
  }

  const duration = r3(local);
  cursor = r3(start + duration);
  scenes.push({
    id: rec.id,
    title: rec.title,
    start,
    duration,
    end: cursor,
    events,
    cues: sceneCues,
  });
}

const totalDuration = r3(cursor);
const bgmPath = join(ASSETS, 'bgm', 'track.mp3');
const bgmFullPath = join(ASSETS, 'bgm', 'track-full.mp3');
let bgm = null;
if (existsSync(bgmPath)) {
  const srcProbe = probe(bgmPath);
  // Build one seamless full-length BGM track matching totalDuration so HyperFrames carve.mjs ducks cleanly across the whole episode
  const loops = Math.max(1, Math.ceil((totalDuration + 4) / Math.max(10, srcProbe.duration - 2)));
  if (loops === 1) {
    execFileSync('ffmpeg', [
      '-y', '-v', 'error', '-i', bgmPath,
      '-af', `atrim=0:${totalDuration},afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0, totalDuration - 2.5)}:d=2.5`,
      '-c:a', 'libmp3lame', '-b:a', '192k', bgmFullPath,
    ]);
  } else {
    const inputs = [];
    for (let i = 0; i < loops; i++) inputs.push('-i', bgmPath);
    const chains = [];
    let prev = '[0:a]';
    for (let i = 1; i < loops; i++) {
      const next = `[a${i}]`;
      chains.push(`${prev}[${i}:a]acrossfade=d=2.0:c1=tri:c2=tri${next}`);
      prev = next;
    }
    chains.push(`${prev}atrim=0:${totalDuration},afade=t=in:st=0:d=1.2,afade=t=out:st=${Math.max(0, totalDuration - 2.5)}:d=2.5[outa]`);
    execFileSync('ffmpeg', [
      '-y', '-v', 'error', ...inputs,
      '-filter_complex', chains.join(';'),
      '-map', '[outa]', '-c:a', 'libmp3lame', '-b:a', '192k', bgmFullPath,
    ]);
  }
  bgm = {file: 'assets/bgm/track-full.mp3', sourceDuration: srcProbe.duration, ...probe(bgmFullPath), ...measureVolume(bgmFullPath)};
}

const out = {
  generatedAt: new Date().toISOString(),
  totalDuration,
  totalMinutes: `${Math.floor(totalDuration / 60)}:${String(Math.round(totalDuration % 60)).padStart(2, '0')}`,
  koCount: Object.keys(koMap).length,
  enCount: Object.keys(enMap).length,
  bgm,
  scenes,
  audioCues,
};

const outPath = join(ASSETS, 'audio-timeline.json');
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`AUDIO CLEAN & TIMELINE BUILT: ${outPath}`);
console.log(`Total Duration: ${totalDuration}s (${out.totalMinutes}), Scenes: ${scenes.length}, Audio cues: ${audioCues.length}`);
for (const sc of scenes) {
  console.log(`  ${sc.id}: ${sc.start.toFixed(2)}s ~ ${sc.end.toFixed(2)}s (${sc.duration.toFixed(2)}s) — ${sc.title}`);
}
