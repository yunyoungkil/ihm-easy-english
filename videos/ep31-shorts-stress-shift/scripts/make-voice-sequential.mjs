import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateAiStudioSpeech} from '../../../scripts/generate-aistudio-speech.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, '..', 'assets');

const KO_STYLE =
  'Warm, clear Korean adult English teacher speaking to 30-60s learners. Finish each sentence crisply and briskly. Do not stretch, drag or trail off on the final syllable.';

const JOBS = [
  {voice: 'Gero', style: KO_STYLE, text: '선물도 발표도 똑같이 씁니다.', output: join(BASE, 'voice', 'c00.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '앞은 이름, 뒤는 행동입니다.', output: join(BASE, 'voice', 'c01.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '앞을 세게 읽으면 선물.', output: join(BASE, 'voice', 'c02.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '뒤를 세게 읽으면 발표.', output: join(BASE, 'voice', 'c03.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '둘째는 더 확실합니다.', output: join(BASE, 'voice', 'c05.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '앞에 힘주면 음반, 기록.', output: join(BASE, 'voice', 'c06.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '뒤에 힘주면 녹음하다.', output: join(BASE, 'voice', 'c07.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '마지막 퀴즈, 무슨 뜻일까요?', output: join(BASE, 'voice', 'c09.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '뒤가 세죠? 정답은 반대하다.', output: join(BASE, 'voice', 'c10.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '다섯 단어 더 고정 댓글에 있어요.', output: join(BASE, 'voice', 'c11.wav')},
  {
    voice: 'Olin',
    style:
      'Clear General American English native pronunciation of the NOUN meaning a gift, with strong stress strictly on the FIRST syllable: PRE-zent (/ˈprɛz.ənt/). Single word only, crisp ending.',
    text: 'present',
    output: join(BASE, 'voice-en', 'present-noun.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Clear General American English native pronunciation of the VERB meaning to give a presentation, with strong stress strictly on the SECOND syllable: pri-ZENT (/prɪˈzɛnt/). Single word only, crisp ending.',
    text: 'present',
    output: join(BASE, 'voice-en', 'present-verb.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Clear General American English native pronunciation of the NOUN meaning a vinyl disc or achievement, with strong stress strictly on the FIRST syllable: RE-kerd (/ˈrɛk.ərd/). Single word only, crisp ending.',
    text: 'record',
    output: join(BASE, 'voice-en', 'record-noun.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Clear General American English native pronunciation of the VERB meaning to capture audio, with strong stress strictly on the SECOND syllable: ri-KORD (/rɪˈkɔːrd/). Single word only, crisp ending.',
    text: 'record',
    output: join(BASE, 'voice-en', 'record-verb.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Clear General American English native pronunciation of the NOUN meaning a physical thing, with strong stress strictly on the FIRST syllable: OB-jekt (/ˈɑːb.dʒɛkt/). Single word only, crisp ending.',
    text: 'object',
    output: join(BASE, 'voice-en', 'object-noun.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Clear General American English native pronunciation of the VERB meaning to protest in court, with strong stress strictly on the SECOND syllable: uhb-JEKT (/əbˈdʒɛkt/). Single word only, crisp ending.',
    text: 'object',
    output: join(BASE, 'voice-en', 'object-verb.wav'),
  },
];

let created = 0;
for (const job of JOBS) {
  if (existsSync(job.output)) {
    console.log(`SKIP (exists): ${job.output}`);
    continue;
  }
  const t0 = Date.now();
  const res = await generateAiStudioSpeech(job);
  created++;
  console.log(`OK (${((Date.now() - t0) / 1000).toFixed(1)}s): ${res.file} (${res.bytes} bytes, ${res.voice})`);
  await new Promise((r) => setTimeout(r, 4000));
}
console.log(`DONE. Newly created: ${created}`);
