import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { generateAiThumbnailImage } from './ab-simulator.mjs';

dotenv.config();

const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error('Error: GEMINI_API_KEY not found in .env');
  process.exit(1);
}

const outDir = path.resolve('output/upload-packages/ep23-double-consonant');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  console.log('=== [EP23] 4안 썸네일 생성 시작 ===');
  console.log('옵션 4: 초효율성형 - 겹자음 29단어 / 18분 만에 마스터');

  // 1. 메인 썸네일 (Thumbnail D / thumbnail.jpg)
  console.log('\n1. 메인 썸네일 (16:9 와이드 바스트샷) 생성 중...');
  const mainRes = await generateAiThumbnailImage({
    topic: '영어 겹자음 더블 자음 29단어 발음 규칙',
    title: '철자 2개 겹치는 영어 단어, 오늘 이 영상 하나로 평생 고민 끝냅니다 | 영어 파닉스 발음',
    thumbnailHeadline: '겹자음 29단어',
    variantKey: 'D',
    format: 'LONGFORM',
    geminiKey: GEMINI_KEY,
    visualConcept: 'The hero makes a confident thumbs-up gesture with a bright smile next to a neat stack of word cards. The anchor line says "COFFEE" or "DOUBLE" in crisp white letters with black outline. The yellow pill capsule says "겹자음 29단어".',
    closeUp: false,
  });

  if (mainRes && mainRes.url) {
    console.log('메인 썸네일 생성 성공:', mainRes.url);
    const mainFilePath = path.join(outDir, 'thumbnail-d.jpg');
    const mainDefaultPath = path.join(outDir, 'thumbnail.jpg');
    // tempThumbDir에서 복사
    const tempFile = path.resolve(mainRes.url.replace(/^\//, ''));
    if (fs.existsSync(tempFile)) {
      fs.copyFileSync(tempFile, mainFilePath);
      fs.copyFileSync(tempFile, mainDefaultPath);
      console.log('저장 완료:', mainFilePath, mainDefaultPath);
    }
  } else {
    console.error('메인 썸네일 생성 결과 없음');
  }

  // 2. 모바일 전용 클로즈업 썸네일 (thumbnail-close-up.jpg)
  console.log('\n2. 모바일 전용 클로즈업 썸네일 (얼굴 45% 점유) 생성 중...');
  const closeUpRes = await generateAiThumbnailImage({
    topic: '영어 겹자음 더블 자음 29단어 발음 규칙',
    title: '철자 2개 겹치는 영어 단어, 오늘 이 영상 하나로 평생 고민 끝냅니다 | 영어 파닉스 발음',
    thumbnailHeadline: '겹자음 29단어',
    variantKey: 'D',
    format: 'LONGFORM',
    geminiKey: GEMINI_KEY,
    visualConcept: 'Extreme close-up on the hero\'s expressive face (eyes wide with confident discovery, smiling directly toward the text). Face fills 45% of the frame.',
    closeUp: true,
  });

  if (closeUpRes && closeUpRes.url) {
    console.log('클로즈업 썸네일 생성 성공:', closeUpRes.url);
    const closeUpFilePath = path.join(outDir, 'thumbnail-close-up.jpg');
    const tempFile = path.resolve(closeUpRes.url.replace(/^\//, ''));
    if (fs.existsSync(tempFile)) {
      fs.copyFileSync(tempFile, closeUpFilePath);
      console.log('저장 완료:', closeUpFilePath);
    }
  } else {
    console.error('클로즈업 썸네일 생성 결과 없음');
  }

  console.log('\n=== [EP23] 썸네일 생성 완료 ===');
}

run().catch((err) => {
  console.error('오류 발생:', err);
  process.exit(1);
});
