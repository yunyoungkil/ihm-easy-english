#!/usr/bin/env node
// EP29 쇼츠 재료 준비: 나레이션을 줄별로 자르고, 원어민 단어·인사말, 글꼴·배경음·효과음·손 그림·롱폼 썸네일을 가져오고,
// 마커 그림을 위아래로 자른다. 여러 번 돌려도 같은 결과가 나온다.
//
// 나레이션 줄 경계는 소리 크기(쉼 -38dB 0.25초)로 찾았다(2026-11-09).
//
// 2026-11-09: 사용자가 이 폴더에 넣은 `m_w06_very.wav`는 롱폼 파일이 아니라 새로 만든 "Thank you very much."(1.52초,
// whisper 확인)였다. 이름만 틀린 것이라 `thank_you_very_much.wav`로 바꿔 두었고, 진짜 `m_w06_very`는 롱폼에서 다시 복사한다.
import {copyFileSync, existsSync, mkdirSync, renameSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const videos = join(root, '..');
const at = (...p) => join(root, ...p);
const ffmpeg = (args, label) => {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args]);
  if (r.status !== 0) throw new Error(`${label}: ${r.stderr}`);
};
const copy = (from, to) => {
  mkdirSync(dirname(to), {recursive: true});
  copyFileSync(from, to);
};
const durationOf = (file) => +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {encoding: 'utf8'}).stdout.trim();

// 0) 이름이 바뀐 인사말 파일 정리: 롱폼 very는 0.81초, 사용자가 만든 인사말은 1.52초다.
const misnamed = at('assets/voice/m_w06_very.wav');
const greeting = at('assets/voice/thank_you_very_much.wav');
if (!existsSync(greeting) && existsSync(misnamed) && durationOf(misnamed) > 1.2) renameSync(misnamed, greeting);
if (!existsSync(greeting)) throw new Error('thank_you_very_much.wav가 없다');

// 1) 나레이션 8줄 (SCRIPT.md 나레이션 블록 순서)
const LINES = [
  ['n01', 0.0, 3.1], // 학교에서 누구나 배운 영어 인사, 땡큐 베리 머치.
  ['n02', 4.09, 7.97], // 여기서 베리를 과일 베리랑 같은 소리로 읽고 계셨나요?
  ['n03', 8.96, 10.65], // 둘은 첫소리부터 다릅니다.
  ['n04', 11.41, 15.38], // 과일 베리는 두 입술을 붙였다가 떼면서 시작합니다.
  ['n05', 16.01, 20.93], // 베리 머치의 베리는 윗니를 아랫입술에 살짝 대고 시작하고요.
  ['n06', 21.58, 24.69], // 입술이 닿는 곳이 달라서, 처음 나오는 소리가 달라집니다.
  ['n07', 25.52, 26.77], // 이제 인사를 다시 들어 보세요.
  ['n08', 27.42, 34.44], // 비와 브이 짝단어 스물네 쌍은 화면 아래 링크의 전체 영상에서 반복해 들을 수 있습니다.
];
const LEAD = 0.05;
const TAIL = 0.2;
const FADE = 0.05;
for (const [id, a, b] of LINES) {
  const start = Math.max(0, a - LEAD);
  const dur = b + TAIL - start;
  ffmpeg(['-ss', start.toFixed(3), '-t', dur.toFixed(3), '-i', at('assets/voice/narration_all.wav'), '-af', `afade=t=out:st=${(dur - FADE).toFixed(3)}:d=${FADE}`, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', at('assets/voice', `${id}.wav`)], id);
}

// 2) 원어민 단어: 롱폼의 같은 남성 음성(berry, very)
const longformVoice = join(videos, 'ep29-b-vs-v', 'assets', 'voice');
for (const name of ['m_w05_berry', 'm_w06_very']) copy(join(longformVoice, `${name}.wav`), at('assets/voice', `${name}.wav`));

// 3) EP24~26 쇼츠와 같은 글꼴·배경음·효과음·손 그림
const ep24 = join(videos, 'ep24-shorts-sheep-ship', 'assets');
copy(join(ep24, 'fonts', 'NotoSansKR-subset.ttf'), at('assets/fonts/NotoSansKR-subset.ttf'));
copy(join(ep24, 'bgm', 'track.mp3'), at('assets/bgm/track.mp3'));
for (const s of ['pop', 'click-soft', 'whoosh']) copy(join(ep24, 'sfx', `${s}.mp3`), at('assets/sfx', `${s}.mp3`));
copy(join(ep24, 'images', 'cta_hand.png'), at('assets/images/cta_hand.png'));

// 4) 롱폼 썸네일(마지막 5초 안내 카드)
ffmpeg(['-i', join(root, '..', '..', 'output', 'upload-packages', 'ep29-b-vs-v', 'thumbnail.jpg'), '-vf', 'scale=860:-2', '-q:v', '3', at('assets/images/longform_thumb.jpg')], 'longform thumb');

// 5) 마커 그림 자르기. 베리·선물 그림은 460~581줄이, 입 모양은 423~571줄이 비어 있어 512에서 갈라도 획이 안 잘린다.
//    입 모양 그림은 EP28 쇼츠와 같은 파일이다(두 입술 닫기 b·p, 윗니 살짝 v·f가 같은 자리).
mkdirSync(at('assets/images/panels'), {recursive: true});
const crop = (src, spec, out) => ffmpeg(['-i', at('assets/images', src), '-vf', `crop=${spec}`, '-q:v', '2', at('assets/images/panels', out)], out);
crop('pair_berries_thanks.jpg', '396:418:314:62', 'berries.jpg');
crop('pair_berries_thanks.jpg', '727:401:150:562', 'gift.jpg');
crop('lips_close_touch.jpg', '809:334:107:108', 'lips_close.jpg');
crop('lips_close_touch.jpg', '799:386:112:552', 'lips_touch.jpg');
console.log('done');
