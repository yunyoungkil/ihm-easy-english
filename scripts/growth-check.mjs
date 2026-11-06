// 채널 성장 점검 (episode-planning 스킬 Phase 0의 1단계).
//
// 인터넷이나 유료 API를 쓰지 않고, 저장소 안의 파일만 읽어서
// "지금 성장 루프 어디가 막혀 있는지"를 한 장으로 보여준다.
//
// 공개 여부와 공개일은 data/youtube/catalog.json(대시보드 동기화 결과)을 기준으로 삼는다.
// status.json은 패키지를 만들 때 적은 값이라 늦거나 틀릴 수 있다.
//
//   1) 업로드 대기열: 다 만들었는데 유튜브에 아직 공개되지 않은 패키지
//   2) 발행 간격: 최근 14일/28일 롱폼·쇼츠 공개 수, 마지막 공개 후 며칠 지났는지
//   3) 성과 리뷰 밀린 것: 7일·28일 REVIEW.md 실제 칸, 아직 판정 대기인 48시간 판정
//
//   4) 형식 배분과 표본: 마지막 동기화 값으로 scripts/growth-rules.mjs의 규칙을 판정한다
//
// 보고용 숫자(조회수·CTR)는 여기서 다루지 않는다. 숫자는 반드시 대시보드 /api/sync 직후 값으로 본다.
//
// 사용법:
//   node scripts/growth-check.mjs                 # 오늘 기준, 화면 출력
//   node scripts/growth-check.mjs --save          # knowledge/growth/check-YYYY-MM-DD.md 로도 저장
//   node scripts/growth-check.mjs --today=2026-11-06 --json

import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {decideFormatPriority, decideSampleSize, latestImpressions} from './growth-rules.mjs';
import {loadPublishRules} from './youtube-publisher.mjs';

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

// 발행 간격 기준은 대시보드 자동 예약 규칙과 같은 값을 쓴다(2026-11-06 사용자 결정: 월·목 주 2회).
// 대시보드에서 바꾼 값(data/youtube/publish-rules.json)이 있으면 그걸, 없으면 youtube-publisher.mjs 기본값을 읽는다.
const publishRules = await loadPublishRules(join(projectDir, 'data', 'youtube', 'publish-rules.json'));
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const allowedDays = [...new Set(publishRules.allowedDaysOfWeek || [])].sort((a, b) => a - b);
const usesWeekdays = publishRules.scheduleMode === 'daysOfWeek' && allowedDays.length > 0;
// 요일 방식이면 허용 요일 사이 가장 긴 간격(월·목이면 목→월 4일)을, 아니면 최소 간격 일수를 공백 기준으로 쓴다.
const TARGET_GAP_DAYS = usesWeekdays
  ? Math.max(...allowedDays.map((d, i) => (i + 1 < allowedDays.length ? allowedDays[i + 1] - d : 7 - d + allowedDays[0])))
  : Number(publishRules.minIntervalDays) || 3;
const PER_WEEK = usesWeekdays
  ? Math.min(allowedDays.length, Number(publishRules.maxUploadsPerWeek) || allowedDays.length)
  : Number(publishRules.maxUploadsPerWeek) || Math.floor(7 / TARGET_GAP_DAYS);
const RULE_LABEL = usesWeekdays
  ? `${allowedDays.map((d) => DAY_NAMES[d]).join('·')} 주 ${PER_WEEK}회`
  : `${TARGET_GAP_DAYS}일 간격`;

const readJson = (path, fallback) => {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch (err) {
    console.error(`⚠️ ${path} 읽기 실패: ${err.message}`);
    return fallback;
  }
};

// ---- 데이터 모으기 -------------------------------------------------------
const packagesDir = join(projectDir, 'output', 'upload-packages');
const videosDir = join(projectDir, 'videos');
const videoFolders = existsSync(videosDir) ? readdirSync(videosDir) : [];

const evaluations = readJson(join(projectDir, 'data', 'youtube', 'evaluations-48h.json'), {evaluations: []});
// evaluate-48h는 content/ 아래 등록된 영상만 다룬다. 항목이 없다고 밀린 게 아니므로, 판정 대기 중인 항목만 본다.
const waiting48hIds = new Set((evaluations.evaluations || []).filter((e) => /^waiting/.test(e.decisionStatus || '')).map((e) => e.videoId));

const catalog = readJson(join(projectDir, 'data', 'youtube', 'catalog.json'), {videos: []});
const catalogVideos = catalog.videos || [];
const catalogById = new Map(catalogVideos.map((v) => [v.videoId, v]));
const isPublic = (v) => v?.privacyStatus === 'public';
const formatOf = (v) => v.format || (Number(v.durationSeconds || 0) <= 60 ? 'SHORTS' : 'LONGFORM');

// 패키지 폴더 이름(ep11-gonna-longform)과 제작 폴더(videos/ep11-longform-faceless)는 이름이 다를 수 있어
// 앞의 에피소드 번호(ep11)로 짝을 찾는다.
const epKey = (name) => (name.match(/^(s\d+-)?ep\d+/) || [null])[0];
const findVideoFolder = (pkg) => {
  if (videoFolders.includes(pkg)) return pkg;
  const key = epKey(pkg);
  return key ? videoFolders.find((v) => epKey(v) === key) : undefined;
};

// REVIEW.md가 있는지, "## 실제" 칸이 공개 후 며칠 차까지 적혔는지.
// "데이터 없음"은 적은 것으로 보고, "(미기록)" 같은 괄호 안내문은 안 적은 것으로 본다.
const reviewState = (folder) => {
  const path = folder ? join(videosDir, folder, 'REVIEW.md') : null;
  if (!path || !existsSync(path)) return {exists: false, reviewedDays: 0};
  const section = readFileSync(path, 'utf8').split(/^## /m).find((s) => s.startsWith('실제')) || '';
  const field = (label) => (section.split('\n').find((l) => l.includes(label)) || '').split(':').slice(1).join(':').trim();
  const numbers = field('조회수');
  if (!numbers || /^\(|미기록/.test(numbers)) return {exists: true, reviewedDays: 0};
  return {exists: true, reviewedDays: Number((field('공개 후 경과').match(/\d+/) || [])[0]) || 7};
};

const packages = (existsSync(packagesDir) ? readdirSync(packagesDir, {withFileTypes: true}) : [])
  .filter((d) => d.isDirectory() && existsSync(join(packagesDir, d.name, 'status.json')))
  .map((d) => {
    const status = readJson(join(packagesDir, d.name, 'status.json'), {});
    const folder = findVideoFolder(d.name);
    const live = catalogById.get(status.videoId);
    return {
      name: d.name,
      kind: /shorts/.test(d.name) ? '쇼츠' : '롱폼',
      status: status.status || '(없음)',
      isPublished: isPublic(live) || status.status === 'published',
      scheduledFor: status.scheduledFor || null,
      recommendedPublishAt: status.recommendedPublishAt || null,
      publishedAt: live?.publishedAt || status.publishedAt || null,
      videoId: status.videoId || null,
      videoFolder: folder || null,
      waiting48h: waiting48hIds.has(status.videoId),
      review: reviewState(folder),
    };
  });

// ---- 1) 업로드 대기열 ------------------------------------------------------
const backlog = packages
  .filter((p) => !p.isPublished)
  .map((p) => {
    const planned = p.scheduledFor || p.recommendedPublishAt;
    let note;
    if (planned && new Date(planned) < today) {
      note = `잡아 둔 일정(${ymd(new Date(planned))})이 지났는데 아직 공개 안 됨 — 일정 다시 잡기`;
    } else if (planned) {
      note = `${ymd(new Date(planned))} 공개 예정`;
    } else {
      note = '공개 일정 미정';
    }
    return {...p, note};
  });

// ---- 2) 발행 간격 ----------------------------------------------------------
const liveVideos = catalogVideos
  .filter((v) => isPublic(v) && v.publishedAt && new Date(v.publishedAt) <= today)
  .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
const liveLong = liveVideos.filter((v) => formatOf(v) === 'LONGFORM');
const liveShorts = liveVideos.filter((v) => formatOf(v) === 'SHORTS');
const inLast = (list, days) => list.filter((v) => daysSince(v.publishedAt) < days).length;
const lastSummary = (v) => (v ? {title: v.title, date: ymd(new Date(v.publishedAt)), gapDays: daysSince(v.publishedAt)} : null);
const gapDays = liveLong[0] ? daysSince(liveLong[0].publishedAt) : null;
const cadence = {
  long14: inLast(liveLong, 14),
  long28: inLast(liveLong, 28),
  shorts14: inLast(liveShorts, 14),
  shorts28: inLast(liveShorts, 28),
  target28: PER_WEEK * 4,
  rule: RULE_LABEL,
  maxGapDays: TARGET_GAP_DAYS,
  lastLongform: lastSummary(liveLong[0]),
  lastShort: lastSummary(liveShorts[0]),
  gapDays,
  verdict:
    gapDays === null
      ? '공개된 롱폼 없음'
      : gapDays > TARGET_GAP_DAYS
        ? `발행 공백 — 공개 규칙(${RULE_LABEL}, 최대 ${TARGET_GAP_DAYS}일 간격)을 넘김`
        : `공개 규칙(${RULE_LABEL}) 안`,
};

// ---- 3) 성과 리뷰 밀린 것 ---------------------------------------------------
// REVIEW.md 작성은 EP23부터 시작했으므로, 파일이 없는 옛 영상은 밀린 일로 세지 않고 개수만 따로 알린다.
const published = packages.filter((p) => p.isPublished && p.publishedAt && new Date(p.publishedAt) <= today);
const noReviewFile = published.filter((p) => !p.review.exists).map((p) => p.name);
const reviews = published.map((p) => {
  const age = daysSince(p.publishedAt);
  const due = [];
  if (age >= 2 && p.waiting48h) due.push('48시간 판정');
  if (p.review.exists) {
    if (age >= 28 && p.review.reviewedDays < 28) due.push('28일 리뷰');
    else if (age >= 7 && p.review.reviewedDays < 7) due.push('7일 리뷰');
  }
  return {name: p.name, kind: p.kind, published: ymd(new Date(p.publishedAt)), age, due, videoFolder: p.videoFolder};
});
const reviewsDue = reviews.filter((r) => r.due.length);

// ---- 4) 형식 배분과 표본 -----------------------------------------------------
const analytics = readJson(join(projectDir, 'data', 'youtube', 'analytics-latest.json'), {});
const formatPriority = {
  ...decideFormatPriority({contentTypes: analytics.contentTypes, publishedLast14: {shorts: cadence.shorts14, longform: cadence.long14}}),
  range: analytics.range || null,
};
const reach = readJson(join(projectDir, 'data', 'youtube', 'video-reach-manual.json'), {videos: {}});
const sample = decideSampleSize(liveLong.slice(0, 3).map((v) => latestImpressions(reach.videos?.[v.videoId])));

// ---- 출력 -----------------------------------------------------------------
const result = {generatedFor: ymd(today), catalogSyncedAt: catalog.syncedAt || null, backlog, cadence, reviewsDue, noReviewFile, formatPriority, sample, totals: {packages: packages.length, published: published.length}};

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const lines = [];
  lines.push(`# 성장 점검 — ${result.generatedFor}`, '');
  lines.push(`> 파일 기준 점검입니다(마지막 동기화: ${result.catalogSyncedAt ? ymd(new Date(result.catalogSyncedAt)) : '없음'}). 조회수·CTR 같은 숫자는 대시보드 \`/api/sync\` 직후 값으로 따로 확인합니다.`, '');

  lines.push(`## 1. 업로드 대기열 (${backlog.length}개)`, '');
  if (!backlog.length) lines.push('- 없음', '');
  else {
    lines.push('| 패키지 | 상태 | 확인할 것 |', '| --- | --- | --- |');
    for (const b of backlog) lines.push(`| ${b.name} | ${b.status} | ${b.note} |`);
    lines.push('');
  }

  lines.push('## 2. 발행 간격', '');
  lines.push(`- 최근 14일 공개: 롱폼 ${cadence.long14}개, 쇼츠 ${cadence.shorts14}개`);
  lines.push(`- 최근 28일 공개: 롱폼 ${cadence.long28}개 (목표 약 ${cadence.target28}개, ${cadence.rule}), 쇼츠 ${cadence.shorts28}개`);
  if (cadence.lastLongform) {
    lines.push(`- 마지막 롱폼 공개: ${cadence.lastLongform.date}, ${cadence.lastLongform.gapDays}일 전 (${cadence.lastLongform.title})`);
  }
  if (cadence.lastShort) {
    lines.push(`- 마지막 쇼츠 공개: ${cadence.lastShort.date}, ${cadence.lastShort.gapDays}일 전 (${cadence.lastShort.title})`);
  }
  lines.push(`- 판정: ${cadence.verdict}`, '');

  lines.push(`## 3. 밀린 성과 리뷰 (${reviewsDue.length}개)`, '');
  if (!reviewsDue.length) lines.push('- 없음', '');
  else {
    lines.push('| 영상 | 공개일 | 경과 | 밀린 것 |', '| --- | --- | --- | --- |');
    for (const r of reviewsDue) lines.push(`| ${r.name} | ${r.published} | ${r.age}일 | ${r.due.join(', ')} |`);
    lines.push('');
  }
  if (noReviewFile.length) lines.push(`- REVIEW.md 없는 옛 영상 ${noReviewFile.length}개는 밀린 일로 세지 않았습니다.`, '');

  lines.push('## 4. 형식 배분과 표본', '');
  if (formatPriority.shares) {
    const rangeLabel = formatPriority.range ? `, ${formatPriority.range.startDate}~${formatPriority.range.endDate}` : '';
    lines.push(`- 조회 비중(마지막 동기화${rangeLabel}): 쇼츠 ${formatPriority.shares.shorts}%, 롱폼 ${formatPriority.shares.longform}%`);
  }
  lines.push(`- 형식 판정: ${formatPriority.verdict}`);
  lines.push(
    sample.median == null
      ? '- 최근 롱폼 3편 노출 기록 없음 — 작은 표본 규칙 적용 (썸네일 메인 1장, 필수 점검만, 중단 신호는 참고)'
      : `- 최근 롱폼 ${sample.count}편 노출 중앙값: ${sample.median}회${sample.small ? ' — 작은 표본 규칙 적용 (썸네일 메인 1장, 필수 점검만, 중단 신호는 참고)' : ''}`,
    '',
  );

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
