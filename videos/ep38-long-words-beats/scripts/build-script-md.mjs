// SCRIPT.md를 build-sheet.mjs의 컷 목록(C)과 만들어진 시트의 컷 시각으로 다시 만든다.
// 나레이션은 build-sheet.mjs 한 곳에서만 고치고, 시트 → 이 스크립트 순서로 돌려 둘이 어긋나지 않게 한다.
import fs from 'node:fs';
import path from 'node:path';
const repo = 'c:/Users/yunyo/.gemini/antigravity-ide/scratch/ihm-easy-english';
const dir = path.join(repo, 'videos/ep38-long-words-beats');
const src = fs.readFileSync(path.join(dir, 'scripts/build-sheet.mjs'), 'utf8');
const a = src.indexOf('const C = [');
const b = src.indexOf('];', a);
const C = eval(src.slice(a + 10, b + 1));
const sheet = JSON.parse(fs.readFileSync(path.join(repo, 'data/youtube/transform-sheets/ep38-long-words-beats.json'), 'utf8'));
const plan = sheet.rows.find((r) => r.key === 'visual').ours.cutPlan;
const mm = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const H = {
  'cut-00-hook': '## 0. 여는 장면 — 상자 뒷면에서 멈춘 입',
  'cut-02-quiz': '## 1. 글자 수 착시 퀴즈',
  'cut-05-vowels': '## 2. 첫째 걸음 · 모음 덩어리 세기',
  'cut-08-stress': '## 3. 둘째 걸음 · 힘주는 박자 하나 — 그리고 처음 그 단어',
  'cut-12-ingredients': '## 4. 셋째 걸음 · 어색하면 모음 바꿔 보기',
  'cut-14-basket': '## 5. 장바구니 직접 읽기',
  'cut-17-return': '## 6. 처음 단어로 돌아가기 + 한 장',
};
let o = '# EP38 통대본 v3.1 — 긴 영어 단어, 박자로 끊어 읽기\n\n';
o += '> 한 편 전체 대본. `나:` = 한국어 해설(AI 음성), `[EN: …]` = 원어민 영어 음성, `[화면: …]` = 시각 흐름(영어 음성이 나오는 자리도 여기 적음), `[쉼 N초]` = 시청자가 먼저 세 보거나 따라 읽는 틈. 사실은 `FACT-CHECK.md`에서 확인한 것만 쓴다.\n';
o += '> **이 파일은 `scripts/build-script-md.mjs`가 `scripts/build-sheet.mjs`의 컷 목록으로 만든다 — 나레이션은 build-sheet.mjs에서 고치고 시트 → 이 파일 순서로 다시 만든다.**\n';
o += `> 시각은 대본 길이 추정(초당 한글 4.2자 + 영어 단어 1.2초 + 쉼), 합계 약 ${mm(plan.durationSeconds)}. 음성 실측 뒤 다시 맞춘다.\n`;
o += '> v2 → v3 (2026-11-28): 사용자 지적("번역체, 책을 쓰는 것 같다")·Gemini 검수. 실제 강사 받아쓰기(9988영어 J28QuPqOCyM·봄날영어학교 fX8UnVuhtxU)와 대표님 말하기 결 카드를 옆에 두고 다시 씀. 끝맺음 섞기·이음말·번역투 삭제·기대치 한 줄·치약 사실 바로잡음·장바구니 컷 셋으로.\n';
o += '> v3 → v3.1 (2026-11-28): 백지 눈 섞어 맞히기에서 v3 단락 6개가 모두 AI로 골라짐("말만 덧입히고 문단을 정리 한 줄로 닫는 짜임은 그대로"). 말을 더하지 않고 짜임만 바꿈 — 문단 끝 정리 한 줄·"~면 됩니다" 마무리 삭제, 컷 1 "A가 아니고 B" 틀 삭제, 컷 9 "끝의 네 글자"(실제로는 TION 뒤에 S) 바로잡음, 연구 문장을 새 컷 13b로 나눔.\n\n';
C.forEach(([img, , motion, narr, en, pause], i) => {
  if (H[img]) o += `${H[img]}\n\n`;
  o += `### 컷 ${i} · ${mm(plan.cuts[i].t)} · ${img}\n\n[화면: ${motion}]\n\n`;
  if (narr) o += `나: ${narr}\n\n`;
  if (en.length) o += `[EN: ${en.join(' / ')}]\n\n`;
  if (pause) o += `[쉼 ${pause}초]\n\n`;
});
fs.writeFileSync(path.join(dir, 'SCRIPT.md'), o);
console.log('SCRIPT.md', C.length, 'cuts', mm(plan.durationSeconds));
