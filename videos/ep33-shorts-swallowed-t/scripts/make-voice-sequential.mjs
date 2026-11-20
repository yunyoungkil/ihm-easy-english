import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {generateAiStudioSpeech} from '../../../scripts/generate-aistudio-speech.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = join(HERE, '..', 'assets');

const KO_STYLE =
  'Warm, clear Korean adult English teacher speaking to 30-60s learners. Finish each sentence crisply and briskly. Do not stretch, drag or trail off on the final syllable.';

const JOBS = [
  {voice: 'Gero', style: KO_STYLE, text: "버튼, 원어민은 '트'를 안 읽습니다.", output: join(BASE, 'voice', 'c00.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '티 뒤에 엔이 오면 코로 넘깁니다.', output: join(BASE, 'voice', 'c01.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '첫째, 버튼.', output: join(BASE, 'voice', 'c02.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '입을 막고 코로 뺍니다.', output: join(BASE, 'voice', 'c03.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '둘째, 커튼.', output: join(BASE, 'voice', 'c04.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '트 없이 코로 넘깁니다.', output: join(BASE, 'voice', 'c05.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '셋째, 마운틴.', output: join(BASE, 'voice', 'c06.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '티가 쏙 숨어 버리죠.', output: join(BASE, 'voice', 'c07.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '마지막, 직접 말해 보세요!', output: join(BASE, 'voice', 'c09.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '임포턴트 대신 이렇게요.', output: join(BASE, 'voice', 'c10.wav')},
  {voice: 'Gero', style: KO_STYLE, text: '보너스 네 단어는 고정 댓글에 있어요.', output: join(BASE, 'voice', 'c11.wav')},
  {
    voice: 'Olin',
    style:
      'Natural casual General American English pronunciation of the single word "button" with a clear glottal stop and syllabic nasal [ˈbʌʔn̩] (swallowed t, NO released t sound, sounding like buh-n). Single word only, crisp natural delivery.',
    text: 'button',
    output: join(BASE, 'voice-en', 'button.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Natural casual General American English pronunciation of the single word "curtain" with a clear glottal stop and syllabic nasal [ˈkɝːʔn̩] (swallowed t, NO released t sound, sounding like cur-n). Single word only, crisp natural delivery.',
    text: 'curtain',
    output: join(BASE, 'voice-en', 'curtain.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Natural casual General American English pronunciation of the single word "mountain" with a clear glottal stop and syllabic nasal [ˈmaʊnʔn̩] (swallowed t, NO released t sound, sounding like moun-n). Single word only, crisp natural delivery.',
    text: 'mountain',
    output: join(BASE, 'voice-en', 'mountain.wav'),
  },
  {
    voice: 'Olin',
    style:
      'Natural casual General American English pronunciation of the single word "important" with a clear glottal stop and syllabic nasal [ɪmˈpɔːrʔn̩] (swallowed middle t, soft unreleased ending, sounding like im-por-n). Single word only, crisp natural delivery.',
    text: 'important',
    output: join(BASE, 'voice-en', 'important.wav'),
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
