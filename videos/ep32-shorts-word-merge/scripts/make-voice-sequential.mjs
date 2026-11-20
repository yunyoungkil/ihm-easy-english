import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateAiStudioSpeech} from '../../../scripts/generate-aistudio-speech.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, '..', 'assets');

const KO_STYLE =
  'Warm, clear Korean adult English teacher speaking to 30-60s learners. Finish each sentence crisply and briskly. Do not stretch, drag or trail off on the final syllable.';

const JOBS = [
  {voice: 'Gero', style: KO_STYLE, text: '분명 아는 단어인데, 왜 안 들릴까요?', output: join(BASE, 'voice', 'c00.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '입이 바쁘면 두 단어를 합칩니다.', output: join(BASE, 'voice', 'c01.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '첫째, 이 두 단어.', output: join(BASE, 'voice', 'c02.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '하나로 쏙 합쳐집니다.', output: join(BASE, 'voice', 'c03.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '둘째, 이 두 단어.', output: join(BASE, 'voice', 'c04.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '바로 녹아 붙습니다.', output: join(BASE, 'voice', 'c05.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '셋째, 이 표현.', output: join(BASE, 'voice', 'c06.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '끝이 빠져 스르르 붙죠.', output: join(BASE, 'voice', 'c07.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '퀴즈, 어떻게 들릴까요?', output: join(BASE, 'voice', 'c09.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '정답은 바로 이 두 단어!', output: join(BASE, 'voice', 'c10.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '다섯 개 더 고정 댓글에 있어요.', output: join(BASE, 'voice', 'c11.wav')},
  {
    voice: 'Olin',
    style:
      'Clear, slightly careful General American English pronunciation of two separate words "give me" (/ɡɪv miː/), enunciating the v sound clearly. Two words only, crisp ending.',
    text: 'give me',
    output: join(BASE, 'voice-en', 'give-me.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Natural casual General American English spoken reduction "gimme" (/ˈɡɪm.i/), as in everyday conversation. Crisp, clear, single reduced phrase only.',
    text: 'gimme',
    output: join(BASE, 'voice-en', 'gimme.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Clear, slightly careful General American English pronunciation of two separate words "let me" (/lɛt miː/), with distinct separation. Two words only, crisp ending.',
    text: 'let me',
    output: join(BASE, 'voice-en', 'let-me.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Natural casual General American English spoken reduction "lemme" (/ˈlɛm.i/), as in everyday conversation. Crisp, clear, single reduced phrase only.',
    text: 'lemme',
    output: join(BASE, 'voice-en', 'lemme.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Clear, slightly careful General American English pronunciation of two separate words "kind of" (/kaɪnd ʌv/), enunciating the final consonant clearly. Two words only, crisp ending.',
    text: 'kind of',
    output: join(BASE, 'voice-en', 'kind-of.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Natural casual General American English spoken reduction "kinda" (/ˈkaɪn.də/), as in everyday conversation. Crisp, clear, single reduced phrase only.',
    text: 'kinda',
    output: join(BASE, 'voice-en', 'kinda.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Natural casual General American English spoken reduction "outta" (/ˈaʊɾə/) for "out of", with a soft American flap t sound. Crisp, clear, single reduced phrase only.',
    text: 'outta',
    output: join(BASE, 'voice-en', 'outta.wav'),
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
  await new Promise((r) => setTimeout(r, 3500));
}
console.log(`DONE. Newly created: ${created}`);
