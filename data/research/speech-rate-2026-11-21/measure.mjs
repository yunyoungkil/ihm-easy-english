// 쇼츠 말 빠르기 재기(2026-11-21). 유튜브 한국어 자막(vtt)의 글자 수 ÷ 말한 구간 길이.
// 사용: node data/research/speech-rate-2026-11-21/measure.mjs <list.json> <vtt 폴더> <결과.json>
//   list.json: [{id, who: 'competitor'|'ours', channel, title, views, ratio, dur, publishedAt}]
//   vtt 폴더: yt-dlp --write-auto-subs --write-subs --sub-langs "ko-orig,ko" --sub-format vtt 로 받은 <id>.ko-orig.vtt / <id>.ko.vtt
// 재는 값:
//   hangul  = 자막의 한글 음절 수(겹쳐 나오는 자동 자막 줄은 한 번만 셈, [음악] 같은 괄호 글은 뺌)
//   engSyl  = 영어 낱말의 모음 덩어리 수(음절 어림)
//   span    = 첫 자막 시작 ~ 마지막 자막 끝(초). 말 사이 쉼도 들어간다(시청자가 듣는 속도).
//   rate    = (hangul + engSyl) / span, rateKo = hangul / span
// 한계: 자동 자막은 받아쓰기라 글자가 조금 틀릴 수 있다. 노래·영어만 말하는 영상은 한글이 적어 따로 센다(hangul < 30).
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function parseVtt(raw) {
  const cues = [];
  for (const block of raw.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/);
    const ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) continue;
    const [a, b] = lines[ti].split('-->').map((s) => s.trim().split(' ')[0]);
    const sec = (t) => { const p = t.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    const text = lines.slice(ti + 1).map((l) => l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\[[^\]]*\]/g, '').trim()).filter(Boolean);
    cues.push({ start: sec(a), end: sec(b), lines: text });
  }
  return cues;
}

/** 겹쳐 나오는 자동 자막 줄은 처음 나온 한 번만 센다. */
export function newLines(cues) {
  const out = [];
  let last = '';
  for (const c of cues) {
    for (const t of c.lines) {
      if (t === last) continue;
      if (out.length && out[out.length - 1].text.endsWith(t)) continue;
      last = t;
      out.push({ text: t, start: c.start, end: c.end });
    }
  }
  return out;
}

export function countSyllables(text) {
  const hangul = (text.match(/[가-힣]/g) || []).length;
  const engSyl = (text.match(/[A-Za-z]+/g) || []).reduce((n, w) => n + Math.max(1, (w.match(/[aeiouy]+/gi) || []).length), 0);
  return { hangul, engSyl };
}

export function measure(raw) {
  const lines = newLines(parseVtt(raw));
  if (!lines.length) return null;
  const text = lines.map((l) => l.text).join(' ');
  const { hangul, engSyl } = countSyllables(text);
  const span = Math.max(...lines.map((l) => l.end)) - Math.min(...lines.map((l) => l.start));
  if (!(span > 0)) return null;
  return { hangul, engSyl, span: +span.toFixed(2), rate: +((hangul + engSyl) / span).toFixed(2), rateKo: +(hangul / span).toFixed(2) };
}

const quart = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const q = (p) => { const i = (s.length - 1) * p; const lo = Math.floor(i); return +(s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo)).toFixed(2); };
  return s.length ? { n: s.length, q1: q(0.25), median: q(0.5), q3: q(0.75), min: s[0], max: s[s.length - 1] } : { n: 0 };
};

const isCli = process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('measure.mjs');
if (isCli) {
  const [listPath, vttDir, outPath] = process.argv.slice(2);
  const list = JSON.parse(readFileSync(listPath, 'utf8'));
  const files = readdirSync(vttDir);
  const rows = [];
  for (const v of list) {
    const pick = [`${v.id}.ko-orig.vtt`, `${v.id}.ko.vtt`].find((f) => files.includes(f));
    if (!pick) { rows.push({ ...v, captions: null }); continue; }
    const m = measure(readFileSync(join(vttDir, pick), 'utf8'));
    rows.push({ ...v, captions: pick.includes('ko-orig') ? 'auto' : 'uploaded', ...(m || {}) });
  }
  const speaking = (r) => r.rate != null && r.hangul >= 30;
  const group = (pred) => quart(rows.filter((r) => pred(r) && speaking(r)).map((r) => r.rate));
  const summary = {
    competitorSpeaking: group((r) => r.who === 'competitor'),
    oursSpeaking: group((r) => r.who === 'ours'),
    oursSince20261101: group((r) => r.who === 'ours' && r.publishedAt >= '2026-11-01'),
    competitorNoCaptions: rows.filter((r) => r.who === 'competitor' && r.captions === null).length,
    competitorLittleKorean: rows.filter((r) => r.who === 'competitor' && r.rate != null && r.hangul < 30).length,
    oursNoCaptions: rows.filter((r) => r.who === 'ours' && r.captions === null).length,
    oursLittleKorean: rows.filter((r) => r.who === 'ours' && r.rate != null && r.hangul < 30).length,
  };
  if (existsSync(outPath)) { /* 덮어쓴다 */ }
  writeFileSync(outPath, JSON.stringify({ computedAt: new Date().toISOString(), method: '자막 (한글 음절 + 영어 음절 어림) ÷ 첫 자막 시작~마지막 자막 끝, 한글 30자 미만은 말 빠르기 집계에서 뺌', summary, rows }, null, 1) + '\n');
  console.log(JSON.stringify(summary, null, 1));
}
