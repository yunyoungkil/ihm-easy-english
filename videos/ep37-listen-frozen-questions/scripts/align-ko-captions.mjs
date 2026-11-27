// EP37 긴 한국어 해설 덩어리(2줄 이상 / 6초 이상)의 실제 발화 시각을 로컬 whisper.cpp로 실측해
// 문장·어절 단위로 assets/ko-caption-align.json에 저장한다.
// 사용: node videos/ep37-listen-frozen-questions/scripts/align-ko-captions.mjs
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = resolve(HERE, '..');
const REPO_ROOT = resolve(EP_DIR, '..', '..');
const ASSETS = join(EP_DIR, 'assets');
const CLEAN_DIR = join(ASSETS, 'voice-ko-clean');
const WHISPER_BIN = join(REPO_ROOT, '.whisper', 'main.exe');
const WHISPER_MODEL = join(REPO_ROOT, '.whisper', 'ggml-small.bin');
const SCRATCH = join(EP_DIR, '.align-scratch');

function splitCaptionSegments(txt) {
  const parts = txt.trim().split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);
  const segs = [];
  for (const p of parts) {
    if (p.length <= 40) {
      segs.push(p);
    } else {
      const commaIdx = p.indexOf(',', Math.floor(p.length * 0.32));
      const cutAt = commaIdx > 0 && commaIdx < p.length * 0.72
        ? commaIdx + 1
        : p.indexOf(' ', Math.floor(p.length * 0.48));
      if (cutAt > 0) {
        segs.push(p.slice(0, cutAt).trim());
        segs.push(p.slice(cutAt).trim());
      } else {
        segs.push(p);
      }
    }
  }
  return segs;
}

function normKo(s) {
  return String(s || '').replace(/[^가-힣0-9a-zA-Z]/g, '').toLowerCase();
}

function makeSilence16k(pathOut, sec) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=16000:cl=mono', '-t', String(sec), '-c:a', 'pcm_s16le', pathOut]);
}

// Whisper 토큰(또는 세그먼트) 리스트에서 각 정규화 글자의 발화 시각을 만든 뒤,
// 스크립트 문장 경계(정규화 글자 누적 위치)와 정렬해 각 자막 블록의 실측 start/end를 계산한다.
function alignSegmentsToWhisper(segs, chunkDur, wTokens) {
  // 1. 정규화된 Whisper 글자별 타임스탬프 배열 구축
  const charTimes = [];
  for (const tk of wTokens) {
    const clean = normKo(tk.text);
    if (!clean.length) continue;
    const t0 = Math.max(0, Math.min(chunkDur, tk.t0));
    const t1 = Math.max(t0, Math.min(chunkDur, tk.t1));
    for (let i = 0; i < clean.length; i += 1) {
      const frac = (i + 0.5) / clean.length;
      charTimes.push({ch: clean[i], t: t0 + (t1 - t0) * frac, t0, t1});
    }
  }
  const scriptNorms = segs.map((s) => normKo(s));
  const scriptFull = scriptNorms.join('');
  if (charTimes.length < 4 || !scriptFull.length) {
    // 폴백: 글자 수 비례
    const tot = segs.reduce((a, x) => a + x.length, 0) || 1;
    let cur = 0;
    return segs.map((s) => {
      const d = chunkDur * (s.length / tot);
      const out = {start: +cur.toFixed(3), end: +(cur + d).toFixed(3), text: s};
      cur += d;
      return out;
    });
  }

  // 2. 세그먼트 경계(정규화 글자 인덱스)마다 Whisper 글자열에서 최적 대응 위치 찾기 (국소 바이그램 슬라이딩 매칭)
  const wStr = charTimes.map((x) => x.ch).join('');
  const ratio = wStr.length / scriptFull.length;
  const boundaries = [0]; // 각 세그먼트 끝 시점(초)
  let accScript = 0;
  let lastWIdx = 0;

  for (let si = 0; si < segs.length - 1; si += 1) {
    accScript += scriptNorms[si].length;
    const expectedW = Math.round(accScript * ratio);
    // 스크립트 경계 앞 6글자 + 뒤 6글자로 Whisper 쪽에서 가장 잘 맞는 위치 탐색
    const leftProbe = scriptFull.slice(Math.max(0, accScript - 6), accScript);
    const rightProbe = scriptFull.slice(accScript, Math.min(scriptFull.length, accScript + 6));
    const winLo = Math.max(lastWIdx + 1, Math.floor(expectedW - Math.max(12, wStr.length * 0.14)));
    const winHi = Math.min(wStr.length - 1, Math.ceil(expectedW + Math.max(12, wStr.length * 0.14)));

    let bestPos = Math.max(lastWIdx + 1, Math.min(wStr.length - 1, expectedW));
    let bestScore = -1e9;
    for (let pos = winLo; pos <= winHi; pos += 1) {
      let score = 0;
      const wLeft = wStr.slice(Math.max(0, pos - leftProbe.length), pos);
      const wRight = wStr.slice(pos, Math.min(wStr.length, pos + rightProbe.length));
      // 2-gram 일치 점수
      for (let k = 0; k < leftProbe.length - 1; k += 1) {
        if (wLeft.includes(leftProbe.slice(k, k + 2))) score += 3;
      }
      for (let k = 0; k < rightProbe.length - 1; k += 1) {
        if (wRight.includes(rightProbe.slice(k, k + 2))) score += 3;
      }
      // 경계 직전/직후 무음 간격 보너스 (실제 문장 사이 숨 쉼 지점 선호!)
      const gapBefore = pos > 0 && pos < charTimes.length ? (charTimes[pos].t0 - charTimes[pos - 1].t1) : 0;
      if (gapBefore >= 0.12) score += Math.min(6, gapBefore * 12);
      // 기대 위치와의 거리 약한 페널티
      score -= Math.abs(pos - expectedW) * 0.18;
      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }
    lastWIdx = bestPos;
    const prevEnd = charTimes[Math.max(0, bestPos - 1)].t1;
    const nextStart = charTimes[Math.min(charTimes.length - 1, bestPos)].t0;
    const cutT = nextStart > prevEnd ? (prevEnd + nextStart) / 2 : nextStart;
    boundaries.push(cutT);
  }
  boundaries.push(chunkDur);

  // 3. 단조 증가 및 최소 길이(0.45초) 보장
  const out = [];
  for (let i = 0; i < segs.length; i += 1) {
    let s = i === 0 ? 0 : out[i - 1].end;
    let e = i === segs.length - 1 ? chunkDur : Math.max(s + 0.45, Math.min(chunkDur - 0.45 * (segs.length - 1 - i), boundaries[i + 1]));
    out.push({start: +s.toFixed(3), end: +e.toFixed(3), text: segs[i]});
  }
  return out;
}

const tl = JSON.parse(readFileSync(join(ASSETS, 'timeline.json'), 'utf8'));
const koEvents = tl.events.filter((e) => e.kind === 'ko' && e.id.startsWith('k'));
const targets = [];
for (const ev of koEvents) {
  const segs = splitCaptionSegments(ev.text);
  const dur = +(ev.end - ev.t).toFixed(3);
  if (segs.length >= 2 && dur >= 5.0) {
    targets.push({id: ev.id, dur, text: ev.text, segs, wav: join(CLEAN_DIR, `${ev.id}.wav`)});
  }
}
console.log(`정밀 정렬 대상: ${targets.length}개 한국어 해설 덩어리 (총 ${targets.reduce((a, x) => a + x.segs.length, 0)}줄)`);

rmSync(SCRATCH, {recursive: true, force: true});
mkdirSync(SCRATCH, {recursive: true});
const GAP_SEC = 2.0;
const silPath = join(SCRATCH, 'sil2s.wav');
makeSilence16k(silPath, GAP_SEC);

// 20개씩 묶어 Whisper -ojf(토큰 타임스탬프) 고속 배치 실행
const BATCH = 20;
const alignedMap = {};
let maxShiftSec = 0;
let sumShiftSec = 0;
let shiftCount = 0;

for (let bi = 0; bi < targets.length; bi += BATCH) {
  const batch = targets.slice(bi, bi + BATCH);
  const listPath = join(SCRATCH, `batch_${bi}.txt`);
  const catWav = join(SCRATCH, `batch_${bi}.wav`);
  const outPrefix = join(SCRATCH, `batch_${bi}_out`);
  const lines = [];
  const offsets = [];
  let curOff = 0;

  for (let i = 0; i < batch.length; i += 1) {
    const item = batch[i];
    const w16 = join(SCRATCH, `${item.id}_16k.wav`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', item.wav, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', w16]);
    const durStr = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', w16], {encoding: 'utf8'}).trim();
    const realDur = Number(durStr);
    offsets.push({item, start: curOff, end: curOff + realDur, realDur});
    lines.push(`file '${w16.replace(/\\/g, '/')}'`);
    curOff += realDur;
    if (i < batch.length - 1) {
      lines.push(`file '${silPath.replace(/\\/g, '/')}'`);
      curOff += GAP_SEC;
    }
  }
  writeFileSync(listPath, lines.join('\n') + '\n', 'utf8');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', listPath, '-c:a', 'pcm_s16le', catWav]);

  console.log(`Whisper 배치 ${Math.floor(bi / BATCH) + 1}/${Math.ceil(targets.length / BATCH)} (${batch.length}개, ${curOff.toFixed(1)}초)...`);
  execFileSync(WHISPER_BIN, ['-m', WHISPER_MODEL, '-f', catWav, '-l', 'ko', '-t', '8', '-ojf', '-of', outPrefix], {stdio: 'pipe'});
  const json = JSON.parse(readFileSync(`${outPrefix}.json`, 'utf8'));

  // 모든 토큰 추출 (배치 전체 절대 초 기준)
  const allTokens = [];
  for (const seg of json.transcription || []) {
    if (Array.isArray(seg.tokens) && seg.tokens.length) {
      for (const tk of seg.tokens) {
        if (!tk.text || tk.text.startsWith('[_')) continue;
        const t0 = (tk.offsets?.from ?? seg.offsets?.from ?? 0) / 1000;
        const t1 = (tk.offsets?.to ?? seg.offsets?.to ?? t0 * 1000) / 1000;
        allTokens.push({text: tk.text, t0, t1});
      }
    } else if (seg.text) {
      allTokens.push({
        text: seg.text,
        t0: (seg.offsets?.from ?? 0) / 1000,
        t1: (seg.offsets?.to ?? 0) / 1000,
      });
    }
  }

  for (const slot of offsets) {
    const localTokens = allTokens
      .filter((tk) => tk.t0 >= slot.start - 0.35 && tk.t1 <= slot.end + 0.35)
      .map((tk) => ({text: tk.text, t0: tk.t0 - slot.start, t1: tk.t1 - slot.start}));
    const aligned = alignSegmentsToWhisper(slot.item.segs, slot.item.dur, localTokens);
    alignedMap[slot.item.id] = aligned;

    // 기존 글자수 비례와 최대 차이 계측
    const tot = slot.item.segs.reduce((a, x) => a + x.length, 0) || 1;
    let pCur = 0;
    for (let k = 0; k < aligned.length - 1; k += 1) {
      pCur += slot.item.dur * (slot.item.segs[k].length / tot);
      const diff = Math.abs(aligned[k].end - pCur);
      if (diff > maxShiftSec) maxShiftSec = diff;
      sumShiftSec += diff;
      shiftCount += 1;
    }
  }
}

rmSync(SCRATCH, {recursive: true, force: true});
const outPath = join(ASSETS, 'ko-caption-align.json');
writeFileSync(outPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  count: Object.keys(alignedMap).length,
  maxShiftSec: +maxShiftSec.toFixed(3),
  avgShiftSec: +(sumShiftSec / Math.max(1, shiftCount)).toFixed(3),
  chunks: alignedMap,
}, null, 2) + '\n', 'utf8');
console.log(`자막 정밀 정렬 완료: ${outPath} (${Object.keys(alignedMap).length}덩어리, 비례 추정 대비 평균 보정 ${(sumShiftSec / Math.max(1, shiftCount)).toFixed(2)}초, 최대 보정 ${maxShiftSec.toFixed(2)}초)`);
