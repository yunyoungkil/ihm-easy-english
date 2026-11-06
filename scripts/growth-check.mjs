// 채널 성장 점검 (channel-growth 스킬 루프 A의 1단계).
//
// 인터넷이나 유료 API를 쓰지 않고, 저장소 안의 파일만 읽어서
// "지금 성장 루프 어디가 막혀 있는지"를 한 장으로 보여준다.
//
//   1) 업로드 대기열: 다 만들었는데 아직 'published'가 아닌 패키지
//      - 예약 시각이 이미 지났는데 상태가 그대로면 "실제로는 공개됐는데 동기화가 안 된 것"일 가능성이 높다
//        (knowledge/production-rules.md "업로드 후 대시보드 자동 동기화가 안 될 때" 참고)
//   2) 발행 간격: 최근 14일/28일 공개 수, 마지막 공개 후 며칠 지났는지
//   3) 성과 리뷰 밀린 것: 48시간 판정(evaluations-48h.json), 7일·28일 REVIEW.md 실제 칸
//
// 숫자(조회수·CTR)는 여기서 다루지 않는다. 숫자는 반드시 대시보드 /api/sync 직후 값으로 본다.
//
// 사용법:
//   node scripts/growth-check.mjs                 # 오늘 기준, 화면 출력
//   node scripts/growth-check.mjs --save          # knowledge/growth/check-YYYY-MM-DD.md 로도 저장
//   node scripts/growth-check.mjs --today=2026-11-06 --json

import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

const DAY = 24 * 60 * 60 * 1000;
const today = args.today ? new Date(`${args.today}T23:59:59+09:00`) : new Date();
const ymd = (d) => new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10); // KST
const daysSince = (iso) => Math.floor((today - new Date(iso)) / DAY);

// 채널 전략: 롱폼 2일 간격(주 2~3회). CLAUDE.md "채널 핵심 성장 & 수익화 플라이휠 원칙" 3번.
const TARGET_GAP_DAYS = 2;
const WARN_GAP_DAYS = 4;

const readJson = (path, fallback) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
};

// ---- 데이터 모으기 -------------------------------------------------------
const packagesDir = join(projectDir, 'output', 'upload-packages');
const videosDir = join(projectDir, 'videos');
const videoFolders = existsSync(videosDir) ? readdirSync(videosDir) : [];

const evaluations = readJson(join(projectDir, 'data', 'youtube', 'evaluations-48h.json'), {evaluations: []});
const evaluatedIds = new Set((evaluations.evaluations || []).map((e) => e.videoId).filter(Boolean));
const evaluatedContent = new Set((evaluations.evaluations || []).map((e) => e.contentId).filter(Boolean));

// 패키지 폴더 이름(ep11-gonna-longform)과 제작 폴더(videos/ep11-longform-faceless)는 이름이 다를 수 있어
// 앞의 에피소드 번호(ep11)로 짝을 찾는다.
const epKey = (name) => (name.match(/^(s\d+-)?ep\d+/) || [null])[0];
const findVideoFolder = (pkg) => {
  if (videoFolders.includes(pkg)) return pkg;
  const key = epKey(pkg);
  return key ? videoFolders.find((v) => epKey(v) === key) : undefined;
};

// REVIEW.md의 "## 실제" 칸에 실제 숫자가 들어갔는지
const reviewFilled = (folder) => {
  if (!folder) return false;
  const path = join(videosDir, folder, 'REVIEW.md');
  if (!existsSync(path)) return false;
  const text = readFileSync(path, 'utf8');
  const section = text.split(/^## /m).find((s) => s.startsWith('실제'));
  if (!section) return false;
  const line = section.split('\n').find((l) => l.includes('조회수'));
  return Boolean(line && /\d/.test(line.split(':').slice(1).join(':')));
};

const packages = (existsSync(packagesDir) ? readdirSync(packagesDir, {withFileTypes: true}) : [])
  .filter((d) => d.isDirectory() && existsSync(join(packagesDir, d.name, 'status.json')))
  .map((d) => {
    const status = readJson(join(packagesDir, d.name, 'status.json'), {});
    const folder = findVideoFolder(d.name);
    return {
      name: d.name,
      kind: /shorts/.test(d.name) ? '쇼츠' : '롱폼',
      status: status.status || '(없음)',
      scheduledFor: status.scheduledFor || null,
      publishedAt: status.publishedAt || null,
      videoId: status.videoId || null,
      videoFolder: folder || null,
      has48h: evaluatedIds.has(status.videoId) || evaluatedContent.has(d.name),
      reviewFilled: reviewFilled(folder),
    };
  });

// ---- 1) 업로드 대기열 ------------------------------------------------------
const backlog = packages
  .filter((p) => p.status !== 'published')
  .map((p) => {
    let note;
    if (p.scheduledFor && new Date(p.scheduledFor) < today) {
      note = `예약 시각(${ymd(new Date(p.scheduledFor))})이 지났는데 상태가 그대로 — 실제 공개 여부 확인 후 동기화`;
    } else if (p.scheduledFor) {
      note = `${ymd(new Date(p.scheduledFor))} 공개 예약`;
    } else {
      note = '공개 일정 미정';
    }
    return {...p, note};
  });

// ---- 2) 발행 간격 ----------------------------------------------------------
const published = packages
  .filter((p) => p.status === 'published' && p.publishedAt)
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
const longform = published.filter((p) => p.kind === '롱폼');
const inLast = (list, days) => list.filter((p) => daysSince(p.publishedAt) < days).length;
const lastLong = longform[0];
const gapDays = lastLong ? daysSince(lastLong.publishedAt) : null;
const cadence = {
  last14: inLast(published, 14),
  last28: inLast(published, 28),
  long14: inLast(longform, 14),
  long28: inLast(longform, 28),
  target28: Math.floor(28 / TARGET_GAP_DAYS),
  lastLongform: lastLong ? {name: lastLong.name, date: ymd(new Date(lastLong.publishedAt))} : null,
  gapDays,
  verdict:
    gapDays === null ? '공개된 롱폼 없음' : gapDays > WARN_GAP_DAYS ? '발행 공백 — 목표 간격(2일)을 넘김' : '목표 간격 안',
};

// ---- 3) 성과 리뷰 밀린 것 ---------------------------------------------------
const reviews = published.map((p) => {
  const age = daysSince(p.publishedAt);
  const due = [];
  if (age >= 2 && !p.has48h) due.push('48시간 판정');
  if (age >= 7 && !p.reviewFilled) due.push(age >= 28 ? '28일 리뷰' : '7일 리뷰');
  return {name: p.name, kind: p.kind, published: ymd(new Date(p.publishedAt)), age, due, videoFolder: p.videoFolder};
});
const reviewsDue = reviews.filter((r) => r.due.length);

// ---- 출력 -----------------------------------------------------------------
const result = {generatedFor: ymd(today), backlog, cadence, reviewsDue, totals: {packages: packages.length, published: published.length}};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const lines = [];
  lines.push(`# 성장 점검 — ${result.generatedFor}`, '');
  lines.push('> 파일 기준 점검입니다. 조회수·CTR 같은 숫자는 대시보드 `/api/sync` 직후 값으로 따로 확인합니다.', '');

  lines.push(`## 1. 업로드 대기열 (${backlog.length}개)`, '');
  if (!backlog.length) lines.push('- 없음', '');
  else {
    lines.push('| 패키지 | 상태 | 확인할 것 |', '| --- | --- | --- |');
    for (const b of backlog) lines.push(`| ${b.name} | ${b.status} | ${b.note} |`);
    lines.push('');
  }

  lines.push('## 2. 발행 간격', '');
  lines.push(`- 최근 14일 공개: ${cadence.last14}개 (롱폼 ${cadence.long14}개)`);
  lines.push(`- 최근 28일 공개: ${cadence.last28}개 (롱폼 ${cadence.long28}개, 목표 롱폼 약 ${cadence.target28}개)`);
  if (cadence.lastLongform) {
    lines.push(`- 마지막 롱폼 공개: ${cadence.lastLongform.date} (${cadence.lastLongform.name}), ${cadence.gapDays}일 전`);
  }
  lines.push(`- 판정: ${cadence.verdict}`, '');

  lines.push(`## 3. 밀린 성과 리뷰 (${reviewsDue.length}개)`, '');
  if (!reviewsDue.length) lines.push('- 없음', '');
  else {
    lines.push('| 영상 | 공개일 | 경과 | 밀린 것 |', '| --- | --- | --- | --- |');
    for (const r of reviewsDue) lines.push(`| ${r.name} | ${r.published} | ${r.age}일 | ${r.due.join(', ')} |`);
    lines.push('');
  }

  const text = lines.join('\n');
  console.log(text);

  if (args.save) {
    const outDir = join(projectDir, 'knowledge', 'growth');
    mkdirSync(outDir, {recursive: true});
    const outPath = join(outDir, `check-${result.generatedFor}.md`);
    writeFileSync(outPath, `${text}\n`);
    console.error(`\n저장: ${outPath}`);
  }
}
