// 연출 자료집 요약(2026-11-16 사용자: 연출 자료집을 만들어 놓고 화면을 설계할 때 안 봤다). 화면 연출을 정하기 전에 이걸 먼저 돌린다.
// 사용: npm run visual-summary  → 자료집 전체를 종류별로 세고, 그림·실사가 쓰인 장면은 전부 보여 준다.
// 종류는 장면 설명 글의 낱말로 센 값이라 거친 분류다(글자로 센 것이지 화면을 다시 본 것이 아니다). 근거로 쓸 때는 캡처를 직접 연다.
import {readdirSync, readFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildVisualLibrary} from './outlier-report.mjs';

export const VISUAL_KINDS = Object.freeze({
  '사람(진행자·출연자)이 나옴': /진행자|출연자|남성|여성|코미디언|인물|얼굴|강사|선생|사람|아나운서|패널/,
  '글자 표·목록·하이라이트': /표|체크|하이라이트|형광|목록|리스트|칸/,
  '그림·일러스트·캐릭터': /일러스트|캐릭터|애니메이션|그림|만화|스티커|이모지|삽화/,
  '실사 사진·실제 사물': /사진|실사|사물|제품|물건/,
  'AR·게임·특수 효과': /AR|게임|필터|폭죽|효과/,
  '영화·드라마 클립': /영화|드라마|클립/,
  '시청자가 말할 시간(카운트다운)': /카운트|하나 둘 셋|따라|발음할 시간/,
  '도해·입 모양·화살표': /도해|다이어그램|입 모양|입모양|구강|화살표/,
});
export const PICTURE_PATTERN = /일러스트|캐릭터|애니메이션|그림|만화|스티커|이모지|삽화|사진|실사/;

/** 자료집 항목을 종류별로 센다: {종류: {entries, videos}} */
export function summarizeLibrary(library = []) {
  const out = {};
  for (const [kind, re] of Object.entries(VISUAL_KINDS)) {
    const hit = library.filter((e) => re.test(`${e.what} ${e.purpose || ''}`));
    out[kind] = {entries: hit.length, videos: new Set(hit.map((e) => e.videoId)).size};
  }
  return out;
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dir = join(here, '..', 'data', 'youtube', 'outlier-reports');
  const reports = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  const lib = buildVisualLibrary(reports);
  console.log(`연출 자료집 ${lib.length}개 장면 · 영상 ${new Set(lib.map((e) => e.videoId)).size}편`);
  for (const [k, v] of Object.entries(summarizeLibrary(lib))) console.log(`${k.padEnd(28)} 장면 ${String(v.entries).padStart(3)}개 · 영상 ${v.videos}편`);
  console.log('\n그림·실사가 쓰인 장면(전부):');
  for (const e of lib.filter((x) => PICTURE_PATTERN.test(`${x.what} ${x.purpose || ''}`))) {
    const ratio = e.outlierRatio == null ? '측정 전' : `${Math.round(e.outlierRatio)}배`;
    console.log(`- [${e.channelTitle} · ${ratio}] ${e.t}초: ${e.what.slice(0, 100)} | http://localhost:3001/outlier-report/${e.videoId}`);
  }
}
