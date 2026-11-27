// EP37 비교 시트(schemaVersion 4)를 만든다. 컷 계획·설명란 시간표는 SCRIPT.md 추정 시간표(estimate-timeline.mjs)에서 자동으로 계산한다.
// 사용: node videos/ep37-listen-frozen-questions/scripts/build-sheet.mjs   (쓰고 나서 validateSheet 결과를 출력)
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateSheet, sheetsDir} from '../../../scripts/transform-sheet.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const EP = 'ep37-listen-frozen-questions';
const IMG = `images/${EP}`;
const tl = JSON.parse(execFileSync(process.execPath, [join(HERE, 'estimate-timeline.mjs'), '--json'], {encoding: 'utf8'}));
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const markT = (pred) => tl.marks.find((m) => pred(m.title))?.t;

// ── 컷 계획: 대본 제목(##·###) 시각마다 화면이 바뀐다 ──────────────────
const chOf = (title) => Number((title.match(/^(\d)장/) || [])[1]) || null;
let curCh = null;
const cuts = [];
const push = (t, template, image, motion) => cuts.push({t, template, image: `${IMG}/cuts/${image}.jpg`, motion});
const hidden = (c) => (c === 1 ? 'cut-03-q-hidden' : `cut-2${c}-ch${c}-hidden`);
const titleImg = (c) => (c === 1 ? 'cut-02-ch1-title' : `cut-1${c}-ch${c}-title`);
for (let i = 0; i < tl.marks.length; i += 1) {
  const m = tl.marks[i];
  const next = tl.marks[i + 1]?.t ?? tl.totalSeconds;
  const T = m.title;
  if (m.level === 2) {
    const c = chOf(T);
    if (T === '여는 장') push(m.t, 'ear-only-open', 'cut-00-open', '인사·로고 없이 원어민 질문 하나, 글자 없이 파형만');
    else if (c) { curCh = c; push(m.t, 'chapter-title', titleImg(c), `${c}장 표지 — 노선 색 띠, 장면 그림 천천히 확대`); }
    else if (T === '1부 정리') { curCh = null; push(m.t, 'summary-card', 'cut-09-summary', '다섯 장 규칙 한 장(캡처용)'); }
    else if (T === '2부 몰아 듣기') push(m.t, 'part2-listen', 'cut-07-part2', '2부 1회차 — 영어 + 뜻 + 대답, 진행 막대');
    else if (T === '끝') push(m.t, 'end-screen', 'cut-08-end', '마지막 질문 → 엔드 화면 9초(가운데 비움)');
    continue;
  }
  if (T.startsWith('00-B')) { push(m.t, 'signal-legend', 'cut-01-signals', '신호음 세 가지 약속(띵·뽁·종)'); continue; }
  if (T.startsWith('2부 2회차')) { push(m.t, 'part2-english-only', 'cut-07-part2', '2부 2회차 — 영어만'); continue; }
  if (!curCh) continue;
  if (/^q\d\d/.test(T)) {
    push(m.t, 'question-ear-first', hidden(curCh), `${T} — 첫 듣기는 글자 숨김·파형만`);
    const span = next - m.t;
    if (T.startsWith('q01')) {
      push(Math.round(m.t + span * 0.55), 'two-words-corner', 'cut-05-two-words', '고유 코너: 작은 말이 지워지고 두 단어만 남음');
      push(Math.round(m.t + span * 0.8), 'question-reveal', 'cut-04-q-reveal', '다시 듣기 — 글자 크기 = 소리 세기, 뜻·한글 소리');
    } else if (T.startsWith('q13')) {
      push(Math.round(m.t + span * 0.6), 'question-reveal', 'cut-06-ch3-reveal', '다시 듣기 — 섞이는 두 단어만 장 색으로');
    }
  } else if (T.includes('넓히기')) push(m.t, 'pattern-extend', hidden(curCh), `${T} — 이미 아는 말에 같은 소리`);
  else if (T.includes('이어 듣기')) push(m.t, 'chain-listen', hidden(curCh), `${T} — 질문 → 따라 말하기 신호 → 대답`);
}
// 컷마다 그 구간의 대본(한국어 낭독)과 영어 소리를 붙인다. SCRIPT.md에서 자동으로 가져와 둘이 어긋나지 않게 한다
// (2026-11-25 사용자: "나레이션 대본은 어디 있어? 시트에 없는데?" — 시트 승인은 대본까지 한 번에 보는 자리다).
const attachScript = () => cuts.forEach((c, i) => {
  const end = cuts[i + 1]?.t ?? Infinity;
  const inCut = tl.items.filter((x) => x.t >= c.t && x.t < end);
  const ko = inCut.filter((x) => x.ko).map((x) => x.ko);
  const en = inCut.filter((x) => x.en).map((x) => x.text);
  if (ko.length) c.narration = ko.join('\n');
  if (en.length) c.voiceEn = en;
});
const endT = tl.totalSeconds - 9;
if (cuts.at(-1).t < endT) push(endT, 'end-screen', 'cut-08-end', '엔드 화면 9초 — 가운데 비움');
attachScript();

// ── 설명란 시간표 ─────────────────────────────────────────────
const chapters = [
  ['여는 장', '여는 장: 몇 단어 들리세요?'],
  ['1장', '1장 길·지하철: 작은 말은 원래 작다'],
  ['2장', '2장 우리 가게: 끝소리가 다음 모음에 붙는다'],
  ['3장', "3장 처음 만난 사람: 드·트 뒤의 '유'가 섞인다"],
  ['4장', "4장 여행지: 모음 사이의 '트'가 구른다"],
  ['5장', '5장 친한 사이: 질문 앞머리가 사라진다'],
  ['1부 정리', '1부 정리'],
  ['2부 몰아 듣기', '2부 몰아 듣기 ① 우리말 뜻과 함께'],
  ['2부 2회차', '2부 몰아 듣기 ② 영어만'],
];
const toc = chapters.map(([k, label]) => `${fmt(markT((t) => t.startsWith(k)) ?? 0)} ${label}`).join('\n');

const qa = readFileSync(join(ROOT, 'videos', EP, 'SCRIPT.md'), 'utf8');
const rows2 = [...qa.matchAll(/^\| (\d\d) \| ([^|]+)\| ([^|]+)\| ([^|]+)\|/gm)].map((m) => ({n: Number(m[1]), q: m[2].trim(), ko: m[3].trim(), a: m[4].trim()}));
const sounds = Object.fromEntries([...readFileSync(join(ROOT, 'videos', EP, 'QUESTIONS-DRAFT.md'), 'utf8').matchAll(/^\| q(\d\d) \|[^|]*\|[^|]*\|[^|]*\|[^|]*\| ([^|]+)\|/gm)].map((m) => [Number(m[1]), m[2].trim()]));
const chName = ['', '길·지하철', '우리 가게', '처음 만난 사람', '여행지', '친한 사이'];
const pinned = ['질문 서른 개와 대답 (영어 · 우리말 뜻 · 들을 곳)', ''].concat(rows2.flatMap((r) => [
  ...(r.n % 6 === 1 ? [`[${Math.ceil(r.n / 6)}장 ${chName[Math.ceil(r.n / 6)]}]`] : []),
  `${r.n}. ${r.q} — ${r.ko} / ${r.a}${sounds[r.n] ? ` (${sounds[r.n].replace(/\(.*?\)/g, '').trim()})` : ''}`,
  ...(r.n % 6 === 0 ? [''] : []),
])).concat(['어느 장 질문이 제일 안 들리셨는지 장 이름 하나만 남겨 주세요.']).join('\n');

const thumbs = ['A', 'B', 'C'].map((k) => `${IMG}/thumb-${k}.jpg`);
const mins = Math.round(tl.totalSeconds / 60);
// 제목 3안은 썸네일 3안과 짝으로 일을 나눈다(pairing, 2026-11-27 v5 백지 눈 수정: 기호 1개 이하·36~42자 압축·답 스포일러 및 동어반복 해소).
// 1안↔A, 2안↔B, 3안↔C.
const titles = [
  '외국인이 영어로 말 걸면 머리가 하얘지는 이유 (틀어 두고 듣는 질문 30개)',
  '다 아는 단어인데 외국인 말만 안 들리는 이유 (생활 질문 30개 듣기)',
  '영어 백날 틀어 놔도 안 들리던 이유, 들을 곳부터 짚어 주는 법',
];
const cutIdx = (img) => cuts.findIndex((c) => c.image.endsWith(`${img}.jpg`));
const existingPath = join(sheetsDir, `${EP}.json`);
const prevSheet = existsSync(existingPath) ? JSON.parse(readFileSync(existingPath, 'utf8')) : null;

const sheet = {
  schemaVersion: 4,
  episodeId: EP,
  sourceVideoId: '_VUMngGcI6U',
  createdAt: '2026-11-25',
  status: prevSheet?.status === 'approved' ? 'approved' : 'draft',
  format: 'LONGFORM',
  topic: `외국인이 영어로 물으면 머리가 하얘지는 순간 — 다 아는 단어로 된 생활 질문 서른 개를 장소 다섯 장 × 소리 규칙 다섯 가지(작아지고·붙고·섞이고·구르고·빠진다)로 귀로 푸는 틀어 놓고 듣는 롱폼(1부 배우며 듣기 + 2부 몰아 듣기, 약 ${mins}분 추정)`,
  audienceBridge: '서울역 개찰구·가게 계산대·아파트 엘리베이터에서 외국인이 영어로 말을 거는 국내 장면(구체적 앵커) + "다 아는 단어인데 왜 한 덩어리로 들릴까?"라는 단 한 개의 빈틈',
  seriesPremise: '연재 가능 — 롱폼 갈래 ② "틀어 놓고 듣는 영상" 1편(생활 질문 서른 개). 7일 결과가 기준을 넘으면 2편 후보 B "숫자만 나오면 머리가 하얘진다(가격·시간·나이)" 또는 대답 편(pitch-log.json). 갈래 ①(EP36)과 7일 비교로 다음 갈래를 정한다',
  trendRef: {
    used: false,
    reason: 'next-episode-input.md 13절(2026-11-24 수집: 유튜브 BIGBANG 「GiiiRIP」·GTA6·멸망전·어벤져스 예고편, 구글 트렌드 챔피언스리그·시그널2·추성훈 은퇴전 등)과 14절을 검토했다. 음악·게임·스포츠·드라마 화제는 "외국인 질문에 얼어붙는 국내 3060"이라는 이번 편의 장면과 연결 고리가 없고, 억지로 예문에 넣으면 1장(길)·2장(가게)의 실제 국내 장면이 흐려진다. 이번 편은 갈래 ② 형식 자체를 재는 첫 시험이라 변수를 늘리지 않는다.',
    blend: '미사용 — 순수 본질(국내 생활 장면)만',
  },
  clipRights: {usesExternalClip: false},
  blindReview: {
    reviewedAt: '2026-11-27',
    reviewerModel: 'Gemini 4 Neon',
    reviewContext: '안티그래비티 새 대화 (초안과 분리된 백지 눈 검수 → 수정 반영 후 재확인)',
    checks: {
      mobileTitleOk: true,
      thumbOneSecOk: true,
      synergyOk: true,
      openingOneMinOk: true,
      antiSlopVoiceOk: true,
    },
    findings: [
      '제목: 대표 1안 기호 2종(|, [ ])·목차체를 정리하고 3안 모두 36~42자로 압축, 모바일 앞 핵심과 썸네일 짝 시너지 확보',
      '썸네일 실물(v5): A안 상단 영어 띠 노란 밑줄 스포일러 제거 및 하단 "들린 건 두 덩어리" → "왜 하나도 안 들리지?" 교체, B안 퀴즈·답 노출 모순 제거("눈엔 7단어인데"), C안 취소선 오류 삭제·덩어리 3개로 압축·시트 문구 일치',
      '도입: 00-B 메타 예고·5개 장 목차 낭독·1장 초반 이론을 압축해 1장 진입을 1:48 → 1:16으로 32초 단축',
      '대본·AI 티: "들어 볼게요" 14회(볼게요 20회) → 1회, "~묻습니다" 11회 → 0회, "~거든요" 10회 → 0회로 축소, q05 반말 오류("응, 가요." → "네, 가요.")·q13/q18 번역 불일치·낭독문 가운뎃점·명사 종결 수정, 5장 반말 전환 예고 추가 (영어 77개 음성 미변경)',
    ],
    verdict: 'pass',
  },
  selfCritique: {
    antiTemplate: 'AI 평균값 버전("생활영어 질문 30개 몰아 듣기" 카드 나열, 몬스터잉글리쉬 eTPdrIDHyig 1.84배·반응 0)과 검색 상위를 차지한 "왕초보 100문장·500문장 흘려듣기(한글 발음 포함)"(2026-11-25 유튜브 검색 실측)를 피했다. 문장 수로 겨루지 않고 장마다 "왜"가 하나씩 있다(작아지고 → 붙고 → 섞이고 → 구르고 → 빠진다, 마지막 장 반전). 2026-11-27 백지 눈 검수에서 잡힌 기계적 진행 멘트("들어 볼게요" 14회·"~묻습니다" 11회·"~거든요" 10회)와 초반 설명서 늘어짐을 전면 정리했다.',
    evolutionFromPrev: '직전 듣기 롱폼 EP22~29는 낱말 짝 24쌍 10칸 고정 틀(7~10분, 90일 클릭률 0~0.74%)이었고, EP36은 보면서 배우는 7단어 해부였다. 이번 편은 화면 없이 소리만으로 이해되는 구조(신호음 세 가지 약속, 첫 듣기 땐 글자 숨김, 귀 시험 다섯 문항), 한 질문을 다섯 번 듣되 간격이 몇 초 → 몇 분 → 수십 분으로 벌어지는 반복, 장마다 서울 지하철 노선 색으로 지금 위치를 알려 주는 화면을 처음 쓴다.',
    fusionCheck: '① 밀가루쌤영어 xaTAV--wNxg의 "지하철에서 외국인이 말 걸 때" 국내 장면 → 1장·썸네일 A·제목 1안 ② 들려야 말하는 영어 _VUMngGcI6U의 질문-대답 짝 묶음과 "[1시간 30분 흘려듣기]" 쓰는 법 표시 → 30쌍 구성·제목 1안 괄호 표시·썸네일 C ③ 영어식 사고 4LShGRVrbuQ의 "같은 내용을 자막 있이 → 없이 두 번" → 2부 1회차(뜻 포함)·2회차(영어만) ④ 우리 롱폼 최고 ROks87qezuU 첫 30초 뼈대(구체적 충돌 → 왜 → 단순한 원리 약속)를 눈이 아니라 귀로 바꿔 여는 장. 겉모습(강사 얼굴·두 원어민 수다·"틀어만 놔도 입에 붙어요" 약속)은 가져오지 않았다(rejected).',
  },
  aiRecommendation: {
    title: titles[0],
    thumbnail: thumbs[0],
    thumbnailLabel: 'A안 (외국인 어깨 너머 살짝 내려다보는 30대 당황 클로즈업 + 균등 흰색 질문 띠 "How do I get to Seoul Station?" + "아는 단어 7개인데 / 왜 하나도 안 들리지?")',
    reason: '사례집에서 썸네일 덕이 가장 분명한 사례(코리아원정대 30.8배: 한 장소·한 순간·실사 클로즈업 얼굴)와 스모킹건(6.3배: 두 사람이 마주 선 순간)의 원리를 하이 앵글 밀착 구도로 옮겼다. v5 백지 눈 수정에서 상단 영어 띠의 답 밑줄 스포일러와 하단 해설 용어("들린 건 두 덩어리")를 걷어 내고 3060 속마음("왜 하나도 안 들리지?")으로 궁금증을 열어 뒀다. 제목 1안(42자)은 기호를 하나로 줄여 앞 23자에 감정·이유 빈칸을 두고 뒤 괄호로 쓰는 법(틀어 두고 듣는 질문 30개)을 짝지었다.',
    alternative: `소리 크기 대비를 시험하려면 B안(밤 지하철 옆모습·이어폰 + "눈엔 7단어인데" + 작은 말/큰 말 대비 + "${mins}분 틀어 두고 듣기") + 제목 2안(39자). 흘려듣기 회의론 시청자를 겨누려면 C안(따뜻한 머스터드 종이 위 서울 일상 인화 사진 콜라주 + "${mins}분 틀어 두기 · 질문 30개" + "그냥 틀면 안 들려요 / 딱 5가지만 알고 듣기") + 제목 3안(36자).`,
  },
  testVariables: [{
    variable: `롱폼 갈래 ② "틀어 놓고 듣는 영상" 형식 자체 — 약 ${mins}분, 화면 없이 소리로 이해(신호음 약속·첫 듣기 글자 숨김), 생활 질문 30 + 대답 30, 들을 곳 먼저 → 듣기 → 확인 → 왜 → 다시 듣기, 2부 몰아 듣기 2회`,
    hypothesis: '경쟁 듣기 폭발작(_VUMngGcI6U 21.9배, 4LShGRVrbuQ 19.78배)은 모두 문장 묶음을 길게 틀어 두는 모양이고, 우리 롱폼 시청 시간은 "관련 동영상" 유입에서 가장 길게 나온다(analytics 90일 145회·428분). 같은 "긴 듣기" 모양에 "왜 안 들리는지" 해설을 더하면 7일 노출 클릭률이 롱폼 중앙값 3.37% 이상, 평균 시청 시간이 롱폼 중앙값 117초를 넘을 것이다(작은 표본 가설, 설계서 7-2절).',
    measure: '공개 7일 노출 클릭률(ctr7d)·노출수·30초 시점 남은 비율·평균 시청 시간(watchSeconds7d)·구독(subs7d) — EP36(갈래 ①)과 ROks87qezuU, 롱폼 기준선(baselines.json)과 비교. 기록만: 곡선 뒤쪽 평평함(틀어 둔 사람), 2부 구간 다시 보기, 장별 이탈, 유입 경로',
  }],
  glossary: [
    {term: '연음 (linking)', plain: '앞 단어 끝소리가 뒤 단어 모음으로 넘어가 붙는 것 — 본편에선 "붙는다"'},
    {term: '플랩·탄설음 (flap)', plain: '모음 사이의 t가 혀로 톡 치는 리을 비슷한 소리로 바뀌는 것 — 본편에선 "구른다"'},
    {term: '구개음화 (yod coalescence)', plain: 'd·t 뒤에 you가 오면 쥬·츄로 섞이는 것 — 본편에선 "섞인다"'},
    {term: '기능어 약화 (weak forms)', plain: 'to·the·can 같은 작은 말이 어 소리로 짧아지는 것 — 본편에선 "작은 말은 원래 작다"'},
    {term: '생략 (ellipsis)', plain: '질문 앞머리 Do you·Are you·Have you를 빼고 묻는 것 — 본편에선 "앞머리가 빠진다"'},
  ],
  references: [
    {videoId: 'xaTAV--wNxg', role: '국내 장면 앵커 · 포장', what: '"외국인이 지하철에서 말 걸 때" — 3060이 국내에서 실제로 겪는 장면을 맨 앞에 두고 문장 수로 끝을 보여 주는 제목·썸네일', reason: '우리 고민("머리가 하얘짐")이 일어나는 자리가 바로 이 장면이다. 말하기 쪽인 원본과 달리 우리는 "왜 안 들리는지"를 푼다', evidence: '밀가루쌤영어, 평소 대비 13.92배(스튜디오 배수 19), 조회 289,800 (리포트 click.titleQuoteVerified)', appliedTo: ['title:1', 'thumb:A', `cut:${cutIdx('cut-02-ch1-title')}`]},
    {videoId: '_VUMngGcI6U', role: '구성 · 포장(틀어 두기 표시)', what: '질문에 바로 쓰는 대답 묶음 + "[1시간 30분 흘려듣기]"로 쓰는 법을 먼저 알리는 제목', reason: '질문마다 대답 하나를 붙여 "대답 40문장" 수요를 채우고, 제목 괄호 표시는 효과 약속 없이 쓰는 법만 알린다', evidence: '들려야 말하는 영어, 평소 대비 21.9배, 조회 130,236 (리포트, 한글 비율 0.88 — 초보에겐 해설이 몸통)', appliedTo: ['title:1', 'thumb:C', 'row:flow']},
    {videoId: '4LShGRVrbuQ', role: '2부 구조', what: '같은 내용을 자막 보며 → 자막 없이 두 번 실은 구조(설명란 챕터)', reason: '2부 1회차(우리말 뜻과 함께)·2회차(영어만)로 같은 질문을 다른 일을 하며 다시 듣게 한다. 두 AI 목소리 수다는 가져오지 않는다', evidence: '영어식 사고, 평소 대비 19.78배, 조회 408,049, 댓글 "Ai 팟캐스트가 아니라서 너무 도움되고 좋아요!"', appliedTo: ['row:flow', `cut:${cutIdx('cut-07-part2')}`, 'thumb:C']},
    {videoId: 'ROks87qezuU', role: '첫 30초 뼈대(우리 롱폼 최고)', what: '구체적 충돌 → 왜 → 단순한 원리 약속', reason: '눈으로 보는 철자 충돌을 귀로 듣는 질문 충돌로 바꿔 여는 장에 쓴다', evidence: '우리 롱폼 노출 2,049·클릭률 4.44%·30초 시점 73.9% (next-episode-input.md 2절, 작은 표본 가설)', appliedTo: ['row:opening', `cut:${cutIdx('cut-00-open')}`]},
    {videoId: '_qitwNPW4zA', role: '포장 대안(흘려듣기 회의론)', what: '"영어듣기 1000시간 해도 안 들리는 이유: 흘려듣기의 함정" — 해 봤는데 안 된 사람의 실패에 이름 붙이기', reason: '시청자 말 "백날 틀어놔도 안 늚"(audience-dna)과 같은 고민이라 제목 3안·썸네일 C의 대안 축으로 쓴다', evidence: '영어 귀뚫기 : 리스닝 반복학습, 평소 대비 5.35배, 조회 36,183 (market-demand.json)', appliedTo: ['title:3', 'thumb:C']},
  ],
  rejected: [
    {what: '두 AI 목소리로 수다 떠는 팟캐스트 흉내', fromVideoId: '4LShGRVrbuQ', reason: '같은 영상 댓글이 "AI 팟캐스트가 아니라서 좋다"고 했다. AI 음성을 사람인 척하지 않는다(설명란에 AI 음성 사용 명시, 유튜브 AI 표시 예).'},
    {what: '"틀어만 놔도 입에 붙어요" 같은 효과 약속', fromVideoId: '_VUMngGcI6U', reason: '연구 근거(Vandergrift & Tafaghodtari 2010)는 들을 곳을 알고 들을 때의 효과다. 그냥 틀어 두기만으로 된다고 말하면 거짓이 된다. 2부만 "틀어 두셔도 된다"고 쓰는 법으로 말한다.'},
    {what: '강사 얼굴 썸네일·토킹헤드', fromVideoId: '_VUMngGcI6U', reason: '우리 채널은 얼굴을 쓰지 않는다. 대신 국내 장면 사진(A)·소리 그림(B)·출퇴근 사물(C)로 서로 다른 끌림을 시험한다.'},
    {what: '설명 없는 낱말·문장 카드 몰아 듣기', fromVideoId: 'eTPdrIDHyig', reason: '"식당 영어 70개 몰아듣기 19분 | 틀어만 두세요"는 평소 대비 1.84배·반응 0 — 설명 없는 나열이 평균값이다.'},
  ],
  rows: [
    {
      key: 'title', origin: 'mixed',
      originReason: '장면(xaTAV--wNxg)과 시청자 말 "머리가 하얘짐"(audience-dna) + 쓰는 법 표시(_VUMngGcI6U)를 1안에, 자기 발견 호기심(Z6VDb7biKCw)을 2안에, 흘려듣기 회의론(_qitwNPW4zA·audience-dna)을 3안에 썼다. 2026-11-27 v5 백지 눈 수정: 기호 2종(|, [ ]) 겹침을 없애 36~42자로 압축하고, B안+2안 답 스포일러와 C안+3안 동어반복을 해소했다.',
      competitor: {text: 'xaTAV--wNxg: "외국인이 지하철에서 말 걸 때, 이 영어 10문장이면 끝" / _VUMngGcI6U: "[1시간 30분 흘려듣기] 영어 대답 40문장이면 충분합니다. 60대도 질문에 바로 대답 나와요" / _qitwNPW4zA: "[중급영어리스닝] 영어듣기 1000시간 해도 안 들리는 이유 : 흘려듣기의 함정"', quote: '외국인이 지하철에서 말 걸 때, 이 영어 10문장이면 끝'},
      ours: {text: '장면·소리 대비·회의론 — 서로 다른 끌림 장치 3안(36~42자, 기호 1개 이하, 모바일 앞 핵심 배치), 썸네일 A·B·C와 답 스포일러·중복 없이 짝지음.', titles},
      clickWhy: [
        {source: 'xaTAV--wNxg', sourceText: '외국인이 지하철에서 말 걸 때, 이 영어 10문장이면 끝', mechanism: '국내에서 실제로 겪는 장면을 맨 앞에 두어 "나도 그랬다"를 건드렸다.', appliedTo: ['title:1']},
        {source: '_VUMngGcI6U', sourceText: '[1시간 30분 흘려듣기] 영어 대답 40문장이면 충분합니다. 60대도 질문에 바로 대답 나와요', mechanism: '쓰는 법 표시가 "틀어 둘 거리"임을 알렸다. 기호 겹침 없이 괄호 하나로 (틀어 두고 듣는 질문 30개)를 1·2안에 붙였다.', appliedTo: ['title:1', 'title:2']},
        {source: 'case:ytn-assault-news', sourceText: '무차별 폭행에 의식불명… / 아들 결혼 앞두고 쓰러져', mechanism: '무슨 일인지는 분명히 말하고 왜 그랬는지는 비워 뒀다. 1·2안 모두 현상("머리가 하얘진다"·"외국인 말만 안 들린다")은 말하고 이유는 영상 안에 남긴다.', appliedTo: ['title:1', 'title:2']},
        {source: 'Z6VDb7biKCw', sourceText: '이러니 안 들리지.. 😅 | 영어축약발음', mechanism: '단어를 몰라서가 아니라는 자기 발견 호기심을 건드린다. B안의 크기 대비 그래픽과 겹치지 않게 답을 말하지 않고 이유만 비워 뒀다.', appliedTo: ['title:2']},
        {source: '_qitwNPW4zA', sourceText: '[중급영어리스닝] 영어듣기 1000시간 해도 안 들리는 이유 : 흘려듣기의 함정', mechanism: '해 봤는데 안 된 사람의 실패("1000시간 해도 안 들림")에 이름을 붙여 "내 얘기"로 누르게 했다. C안의 "5가지·질문 30개"와 겹치지 않게 해법 방향만 짚는다.', appliedTo: ['title:3']},
      ],
      pairing: [
        {title: 'title:1', thumb: 'thumb:A', thumbDoes: '질문을 받고 얼어붙은 얼굴 + 균등 흰색 질문 띠 + "아는 단어 7개인데 / 왜 하나도 안 들리지?" 속마음 의문', titleDoes: '그 느낌에 시청자 말("머리가 하얘지는 이유")로 이름을 붙이고 이유를 비워 둔다 + (틀어 두고 듣는 질문 30개)'},
        {title: 'title:2', thumb: 'thumb:B', thumbDoes: '"눈엔 7단어인데" + 작은 말/큰 말 크기 대비 그래픽 + 분수 칩', titleDoes: '"다 아는 단어인데 외국인 말만 안 들리는 이유"로 답 스포일러 없이 호기심을 받아 침 + (생활 질문 30개 듣기)'},
        {title: 'title:3', thumb: 'thumb:C', thumbDoes: `"${mins}분 틀어 두기 · 질문 30개" + "그냥 틀면 안 들려요" + "딱 5가지만 알고 듣기" + 서울 일상 인화 사진 콜라주`, titleDoes: '흘려듣기 실패 경험("영어 백날 틀어 놔도 안 들리던 이유")에 이름을 붙이고 동어반복 없이 해법 방향("들을 곳부터 짚어 주는 법")을 약속한다'},
      ],
      why: '우리 실패 제목("원어민이 F와 P를 0.1초 만에 구별하는 법 | F vs P 24쌍 반복 듣기")은 소리 이름·숙제 같은 "반복 듣기"·장면 없음이 문제였다. v5에서는 기호 2종 겹침·답 스포일러·동어반복을 걷어 내고 세 제목 모두 36~42자로 눌러 썼다.',
    },
    {
      key: 'thumbnail', origin: 'mixed',
      originReason: '2026-11-27 v5 백지 눈 수정: A안 상단 영어 띠 노란 밑줄 스포일러와 하단 해설 용어("들린 건 두 덩어리")를 속마음 의문("왜 하나도 안 들리지?")으로 교체, B안 "몇 단어 들리세요?" 퀴즈·답 동시 노출 모순 해소("눈엔 7단어인데"), C안 취소선 위치 오류 삭제·글자 덩어리 4→3개 압축·시트 문구 일치. 200px·흑백 미리보기 raw/thumb-check-200px.jpg.',
      competitor: {text: 'xaTAV--wNxg: 지하철 안 외국인·한국인이 노선도를 보는 사진 + 강사, "외국인이 갑자기 말 걸 때 10문장" / _VUMngGcI6U: 강사 상반신 + "1시간 30분 연속 재생 · 영어 대답 40문장 · 틀어만 놔도 입에 붙어요" / 4LShGRVrbuQ: 원어민 두 사람 + "6시간 연속 듣기 · 그냥 틀어두세요 영어가 귀에 꽂혀요"', images: ['thumb:xaTAV--wNxg', 'thumb:_VUMngGcI6U', 'thumb:4LShGRVrbuQ']},
      ours: {
        text: `서로 다른 끌림 장치·구도·글자체 3장(1280×720, 사진은 AI 스튜디오 Nano Banana 2.1, 그래픽 층·구글 폰트는 코드 합성): A 장면·대결(외국인 어깨 너머 하이 앵글 30대 당황 클로즈업 + 균등 흰색 질문 띠 "How do I get to Seoul Station?" + "아는 단어 7개인데 / 왜 하나도 안 들리지?") / B 소리 그림(밤 지하철 옆모습·이어폰 + "눈엔 7단어인데" + 작은 말/초대형 GET·SEOUL STATION 대비 + "${mins}분 틀어 두고 듣기" 칩) / C 에디토리얼 콜라주(따뜻한 머스터드 종이 바탕 + 서울 지하철·카페·공항 인화 사진 3장·이어폰 + "${mins}분 틀어 두기 · 질문 30개" + "그냥 틀면 안 들려요" + "딱 5가지만 알고 듣기"). 오른쪽 아래(재생 시간 자리)는 모두 비웠다.`,
        images: thumbs,
        preview200: `${IMG}/raw/thumb-check-200px.jpg`,
      },
      clickWhy: [
        {source: 'case:korea-expedition-france', sourceText: '“새벽 1시 반에 이러고 나간다고?!” / 경찰도 포기한 프랑스에서 온 20대 여성들! / 팩 붙이고 한국 편의점 갔다가…', mechanism: '한 장소·한 순간의 실사 클로즈업 얼굴이 감정을 먼저 주고, 속마음 한 줄이 상황을 알렸다(같은 채널 덜 된 영상은 0.03배, 글자 덩어리 넷).', appliedTo: ['thumb:A']},
        {source: 'case:smokinggun-sageon', sourceText: '범인의 거짓말을 뒤집었다! / 한편의 드라마 같은 수사', mechanism: '설명하는 사람의 반응이 아니라 사건 속 두 사람이 마주 선 순간을 한 화면에 세워 긴장을 만들었다(같은 채널 반응 얼굴 판은 0.62배).', appliedTo: ['thumb:A']},
        {source: 'case:english-podcast-class', sourceText: "ENGLISH PODCAST / EPISODE : 01 / WHAT'S STOPPING YOU FROM SPEAKING?", mechanism: '시청자 자신의 문제를 짚는 짧은 문구와 밝은 갈래 표시로 눌렀다(같은 시리즈 인생 조언 판은 0.51배).', appliedTo: ['thumb:B', 'thumb:C']},
        {source: 'Z6VDb7biKCw', sourceText: '이러니 안 들리지.. 😅 | 영어축약발음', mechanism: `"내가 알던 소리와 다르다"는 자기 발견 호기심. B안은 "눈엔 7단어인데"와 작은 말/큰 말 크기 대비로 차이를 눈으로 먼저 겪게 하고 ${mins}분 듣기 용도를 함께 알린다.`, appliedTo: ['thumb:B']},
        {source: 'case:english-thinking-6hours', sourceText: '6시간 연속 듣기 / 미국 원어민 · 호주 원어민 / 그냥 틀어두세요 / 영어가 귀에 꽂혀요', mechanism: '긴 길이를 앞세우고 실제 한국 생활 장면 조각을 모아 무엇을 듣는지 보여 줬다(같은 두 사람의 18분 판은 0.58배). 무균 3D 소품 대신 실제 서울 현장 인화 사진 콜라주로 옮기고 효과 약속은 뺐다.', appliedTo: ['thumb:C']},
      ],
      craft: [
        {source: 'case:smokinggun-sageon', took: '두 사람을 한 화면에 마주 세워 대결 구도를 인물 배치로 만든다: 왼쪽 흐린 외국인 어깨·옆턱, 오른쪽 크게 잡은 당황한 30대 얼굴', appliedTo: ['thumb:A']},
        {source: 'case:korea-expedition-france', took: '한 장소·한 순간·실사 클로즈업 얼굴 하나 + 균등 흰색 질문 오디오 띠(답 밑줄 스포일러 제거): 평면 말풍선을 그래픽 층으로 교체', appliedTo: ['thumb:A']},
        {source: 'knowledge/video-effects-toolbox-2026-11-23.md#15 POV 숏', took: '외국인 어깨 너머 살짝 내려다보는 하이 앵글(12°)로 위축·당황한 순간을 카메라 각도로 표현', appliedTo: ['thumb:A']},
        {source: 'knowledge/ai-craft-research-2026-11-21.md#AI 티가 나는 곳', took: '눈높이 정면·트렌치코트 클리셰·기본 고딕 1종을 벗어나 혼합 조명·피부 질감·사진 콜라주 컷아웃 층과 오디오 화살표 그래픽을 분리 합성', appliedTo: ['thumb:A', 'thumb:B', 'thumb:C']},
        {source: 'knowledge/video-effects-toolbox-2026-11-23.md#14 익스트림 클로즈업', took: '귀 모공만 과하게 확대하던 v3 대신 밤 지하철 창가 옆모습+이어폰 밀착 클로즈업으로 부담을 줄이고 출퇴근 듣기 분위기를 살렸다', appliedTo: ['thumb:B']},
        {source: 'case:english-podcast-class', took: '짧은 대비 훅("눈엔 7단어인데")과 밝은 따뜻한 머스터드 종이 바탕(C안)', appliedTo: ['thumb:B', 'thumb:C']},
        {source: 'case:english-thinking-6hours', took: `긴 길이 칩("${mins}분 틀어 두기 · 질문 30개")과 실제 서울 생활 현장(지하철·카페·공항) 인화 사진 콜라주 + 무선 이어폰으로 "무엇을 듣는지" 생생하게 보여 준다`, appliedTo: ['thumb:C']},
        {source: 'case:listen-speak-answers40', took: '글자 덩어리를 3개로 압축하고 "그냥 틀면 안 들려요 / 딱 5가지만 알고 듣기"로 호기심 빈칸을 걸었다', appliedTo: ['thumb:C']},
        {source: 'public/fonts/google/manifest.json', took: '구글 폰트 공용 서랍 역할별 적용: A안 Gothic A1 Black + Black Han Sans + Barlow Condensed(임팩트·긴장), B안 Gothic A1 Black + Archivo Black + Outfit(영문 강약 극대화), C안 Do Hyeon + Black Han Sans + Gothic A1 Black(에디토리얼·명확한 칩)', appliedTo: ['thumb:A', 'thumb:B', 'thumb:C']},
      ],
      eyeOrder: [
        {candidate: 'thumb:A', first: '당황해 얼어붙은 30대 얼굴(오른쪽)', second: '노란 강조 "왜 하나도 안 들리지?" → 균등 흰색 질문 띠(How do I get to Seoul Station?)', shrink: '윗줄 "아는 단어 7개인데"로 압축, 답 밑줄 스포일러 제거, 배경·외국인 어깨는 흐리게, 재생 시간 자리 비움'},
        {candidate: 'thumb:B', first: '노란 초대형 Archivo Black "GET"과 사운드 파동', second: `옆모습·흰 이어폰(오른쪽) → "눈엔 7단어인데" + "${mins}분 틀어 두고 듣기"`, shrink: 'how do I·to·?는 작되 밝은 회백색으로 올려 200px에서도 읽히게 하고 인물과 안전 여백 확보'},
        {candidate: 'thumb:C', first: `빨간 스탬프 칩 "${mins}분 틀어 두기 · 질문 30개" → 굵은 "딱 5가지만 알고 듣기"`, second: '오른쪽 서울 현장 인화 사진 3장 + 이어폰', shrink: '잘린 취소선을 깔끔한 빨간 밑줄로 교체하고 하단 바를 위 칩으로 합쳐 3덩어리로 압축'},
      ],
      why: '첫 시험이라 끌림 장치를 셋으로 나눠 유튜브 썸네일 시험에 건다(11/13 사용자 결정, EP36도 3안). v4 검수 뒤 2026-11-27 백지 눈 검수에서 잡힌 답 스포일러·퀴즈 모순·취소선 오류를 해소해 v5로 올렸다.',
    },
    {
      key: 'opening', origin: 'mixed',
      originReason: 'ROks87qezuU(30초 73.9%)의 충돌 → 왜 → 원리 약속 뼈대를 귀로 바꾸고, _VUMngGcI6U 첫 문장("누가 영어로 어디야라고 물으면…")은 베끼지 않았다. 2026-11-27 백지 눈 수정: 00-B 설명서·목차 낭독을 줄여 1장 진입을 1:48 → 1:16으로 앞당겼다.',
      competitor: {text: '_VUMngGcI6U: "누가 영어로 어디야라고 물으면 대답 바로 나오세요… 그건 단어를 몰라서가 아니고요…" (안심시키는 반전 문장) / ROks87qezuU: 철자 카드 세 장을 띄우며 읽고 "왜 지워 버렸을까요?"'},
      ours: {text: '0:00 인사·로고 없이 원어민 질문 "How do I get to Seoul Station?" 자연 속도, 글자 없이 파형만 → "몇 단어나 들리셨어요? … 일곱 개 다 아는 단어인데 귀에 남은 건 아마 두 덩어리뿐일 거예요." → 신호음 세 가지(띵·뽁·종) 30초 안쪽 간결 안내 → 1:16 곧바로 1장 진입.', images: [`${IMG}/cuts/cut-00-open.jpg`, `${IMG}/cuts/cut-01-signals.jpg`]},
      why: '틀어 두는 사람은 화면을 안 본다. 그래서 충돌을 눈이 아니라 귀로 겪게 하고, 긴 목차 소개 없이 신호음 약속만 짧게 짚고 바로 1장 첫 질문으로 들어간다. 안심시키는 반전 문장("단어를 몰라서가 아니에요")은 브랜드 규칙상 쓰지 않는다.',
    },
    {
      key: 'flow', origin: 'mixed',
      originReason: '2부 두 번 듣기는 4LShGRVrbuQ, 질문-대답 짝은 _VUMngGcI6U에서 원리만. 장 구성·원리 다섯·문항 모양 섞기·넓히기는 우리 설계(설계서 3절) + 독립 비평가 구조 제안 3건.',
      competitor: {text: '_VUMngGcI6U: 1시간 30분 상황별 대답 묶음(설명 많음, 댓글 "쪼매 길어요") / 4LShGRVrbuQ: 같은 10편을 자막 있이·없이 6시간', quote: '[1시간 30분 흘려듣기] 영어 대답 40문장이면 충분합니다'},
      ours: {text: `${toc.replace(/\n/g, ' · ')} (추정 합계 ${fmt(tl.totalSeconds)}). 장마다 원리 하나(작아지고 → 붙고 → 섞이고 → 구르고 → 빠진다), 문항 모양 섞기(1장 깊게·빠르게·빠르게·깊게·귀 시험·빠르게 / 2장 귀 시험으로 시작 / 장마다 순서 다름), 깊게 짚는 문항은 끊어 읽기 시연과 원어민 속도를 나란히, 장 끝 "이미 아는 말" 넓히기(커몬·홀돈·나이스 투 미츄·게라웃·갓 잇?) → 질문·따라 말하기·대답 이어 듣기.`},
      why: `한 질문을 다섯 번 듣되(첫 듣기 → 다시 듣기 → 장 끝 → 2부 ① → 2부 ②) 간격이 벌어지고 할 일이 매번 달라 EP22~29의 "같은 낱말 6번 연달아"와 다르다. 장마다 5분 안팎이라 어디서 멈춰도 그 장은 끝난다(경쟁 댓글 "쪼매 길어요" 대응). 설계 40분 → 대본 실측 추정 약 ${mins}분: 시간을 채우려 같은 소리를 더 반복하지 않았다(수익 정책의 반복 콘텐츠 위험).`,
    },
  {
      key: 'visual', origin: 'ours',
      originReason: '소리가 주인공인 시네마틱 오디오-에디토리얼 화면(2026-11-25 밤 컷 시안 18장 전면 개편): 단색 PPT 슬라이드와 기본 고딕 1종을 벗어나 1~5장 모두 서로 다른 카메라 구도·조명의 실사 장면 5장(scene-ch1~5-v2-bg.jpg)과 구글 폰트 공용 서랍(Black Han Sans·Gothic A1 Black·IBM Plex Sans KR·Do Hyeon·Archivo Black·Outfit)을 적용했다. 2026-11-27 백지 눈 수정: cut-01-signals 3장 표기("처음 만난 사람")·cut-06-ch3-reveal 번역("막 이사 오셨어요?") 대본 일치.',
      competitor: {text: '_VUMngGcI6U: 강사 상반신 + 자막 카드 / 4LShGRVrbuQ: 원어민 두 사람 정지 화면에 가까움 / eTPdrIDHyig: 문장 카드 나열'},
      ours: {
        text: `화면 시안 ${new Set(cuts.map((c) => c.image)).size}장(1920×1080, 1~5장 시네마틱 실사 5장 + 구글 폰트 역할별 합성, 글자 넘침 0건 · 직접 열어 확인). 초반 1분 16초(서울역 실사 위 3중 발광 파형 → 글래스 신호음 타임라인 카드) → 1~5장 각기 다른 구도 실사 표지(노선 색 띠·반투명 장 번호) → 첫 듣기(노선 색 발광 파형·글자 숨김) → 다시 듣기(사운드 스테이지 카드 위 Archivo Black/Outfit 소리 크기 대비) → 고유 코너 "두 단어만 남기기"(빨간 사선 취소선·명도 확보) → 1부 정리(지하철 노선도 모티브 5단 카드) → 2부(심야 오디오 라운지·진행 막대) → 엔드 화면 9초 가운데 비움. 글자: 본문 보조 52px 이상, 진행 표시 38px, 워드마크 34px(불변 하한 34px). 실사 영상(Omni)은 ${mins}분 렌더 부담 때문에 넣지 않고 실사 배경 미세 줌·파형 모션으로 움직임을 만든다.`,
        images: [`${IMG}/cuts/cut-00-open.jpg`, `${IMG}/cuts/cut-01-signals.jpg`, `${IMG}/cuts/cut-04-q-reveal.jpg`, `${IMG}/cuts/cut-05-two-words.jpg`, `${IMG}/cuts/cut-09-summary.jpg`],
        cutPlan: {durationSeconds: tl.totalSeconds, rhythm: `대본 제목마다 화면 전환, 추정 ${cuts.length}컷 / ${fmt(tl.totalSeconds)} — 질문 안에서도 첫 듣기(파형) → 다시 듣기(글자)로 바뀐다(시안은 대표 문항만)`, cuts},
      },
      why: '휴대폰 시청 84~86%, 처음 2분은 화면을 보고 계속 들을지 결정한다(가설). 이전 시안의 단색 PPT 슬라이드 느낌과 빈 2~5장 자리를 해소하고, 썸네일과 같은 시네마틱·에디토리얼 급으로 끌어올렸다.',
    },
    {
      key: 'reaction', origin: 'ours',
      originReason: '귀 시험 다섯 문항(힌트 없이 듣기 → "무슨 뜻이었을까요?" 고정 신호 → 뜻 공개), 따라 말하기 신호음, 끝 질문 — 우리 설계 + 독립 비평가 제안(고정 신호 문장).',
      competitor: {text: '_VUMngGcI6U: "\'한 번 더\'가 나오면 큰 소리로 따라 하기" 약속 / 4LShGRVrbuQ: 댓글 "번역은 따로 없는건가요?"'},
      ours: {text: '① 귀 시험 5문항(q05·q07·q17·q20·q27) — 같은 한마디 "무슨 뜻이었을까요?"가 퀴즈 차례라는 소리 신호, 마지막 시험 전 "힌트 없이 가는 건 이게 마지막입니다" ② 장 끝 따라 말하기(뽁 신호, 입속으로도 OK) ③ 끝: "다섯 장 가운데 어느 장이 제일 안 들리셨어요? 장 이름 하나만" — 다음 기획 근거로 쓴다(08 인사이트).'},
      why: '화면 없이 듣는 사람도 참여할 수 있게 참여 방식을 소리 신호에 묶었다. 경쟁 댓글 "번역은 없나요"는 2부 1회차 뜻과 한국어 자막으로 푼다.',
    },
    {
      key: 'ending', origin: 'ours',
      originReason: '구독·좋아요 하드 CTA 없이, 고정 댓글 문장표 안내와 장 이름 하나를 묻는 넛지로 닫는다.',
      competitor: {text: '_VUMngGcI6U: 끝까지 대답 묶음 후 채널 안내'},
      ours: {text: '2부 2회차 끝 → "오늘 들으신 질문 서른 개와 대답은 고정 댓글에 영어, 뜻, 소리까지 적어 두었어요 … 어느 장이 제일 안 들리셨어요?" → 엔드 화면 9초(가운데 비움, 끝 화면은 공개 때 ROks87qezuU 또는 재생목록, 12/07 뒤 EP36으로).', images: [`${IMG}/cuts/cut-08-end.jpg`]},
      why: '틀어 둔 사람은 자동 재생으로 다음 영상이 이어지므로 끝 화면 자리는 같은 갈래·롱폼 최고작으로 둔다.',
    },
    {
      key: 'package', origin: 'ours',
      originReason: '2026-11-25 유튜브 검색(지역 KR, 한국어) 실측 11개 태그 중 맞는 10개. 시간표는 대본 추정이라 음성 실측 뒤 다시 맞춘다.',
      ours: {
        text: '설명란에 장 시간표·2부 시작 시각·AI 음성 사용 명시, 고정 댓글에 질문·대답 30쌍 전체(영어·뜻·들을 곳).',
        description: `외국인이 영어로 길을 묻거나 계산대에서 말을 걸면, 다 아는 단어인데도 머리가 하얘질 때가 있죠. 이 영상은 그런 생활 질문 서른 개를 장소 다섯 곳과 소리 규칙 다섯 가지로 하나씩 풀어 봅니다.\n\n1부에서는 질문마다 어디를 들어야 하는지 먼저 짚고, 원어민 속도로 듣고, 왜 그렇게 들리는지 확인한 뒤 다시 듣습니다. 2부는 질문과 대답 서른 쌍을 두 번 이어서 들려 드려요. 첫 번째는 우리말 뜻과 함께, 두 번째는 영어만 나옵니다. 2부는 틀어 두고 들으셔도 됩니다.\n\n질문과 대답 전체 문장은 고정 댓글에 있습니다.\n\n[시간별 목차]\n${toc}\n\n이 영상의 한국어 해설과 영어 음성은 AI 음성으로 만들었습니다.`,
        tags: ['영어 듣기', '생활영어 질문', '외국인 영어 질문', '영어 듣기 연습', '원어민 영어 질문', '영어 회화 듣기', '지하철 영어', '기초 영어 듣기', '영어 리스닝', '영어 질문 대답'],
        tagCheck: [
          {tag: '영어 듣기', verdict: '맞음', reason: '생활영어 회화 듣기·리스닝 강의가 상위', top: ['왕초보 생활영어 회화 100문장 듣기｜하루 일상 영어… (한글 발음 포함)', '영어가 자막없이 들리는 리스닝 강의 공짜로 풉니다?']},
          {tag: '생활영어 질문', verdict: '맞음', reason: '질문 패턴·질문+대답 이어 듣기가 상위', top: ['영어회화 기초 100문장 | 이 10개 질문 패턴으로 말문이 트입니다', '무조건 듣게 되는 영어 질문 + 대답 이어듣기 #1 (1-5강)']},
          {tag: '영어 흘려듣기', verdict: '안 맞음', reason: '상위 5개 중 2개가 뽀로로·아기 영어동요(어린이 대상)라 3060 생활 질문과 뜻이 갈린다 — 태그에서 뺌', top: ['뽀로로 영어 흘려듣기 (영어 자막)…', '0-3세 아기 영어동요 20곡｜화면 없이 듣는 영어 흘려듣기…']},
          {tag: '외국인 영어 질문', verdict: '맞음', reason: '원어민이 자주 쓰는 질문 패턴 강의가 상위', top: ['원어민들이 정말 자주 쓰는 영어 질문 패턴 무조건 외우세요', 'A2-B1 원어민이 입에 달고사는 영어 질문과 답변 I wh_ , Did you? , Have you?']},
          {tag: '영어 듣기 연습', verdict: '맞음', reason: '영어 듣기 공부법·생활영어 흘려듣기 통합본이 상위', top: ["영어듣기 방법! 10분 뒤 여러분의 '영어 리스닝' 관점이 완전히 바뀝니다…", '왕초보 영어회화는 이 500문장이면 끝납니다…']},
          {tag: '원어민 영어 질문', verdict: '맞음', reason: '원어민 일상 질문 패턴이 상위', top: ['원어민들이 입에 달고 사는 영어 질문 패턴ㅣ일상 회화 표현 문장', '원어민이 밥먹듯이 쓰는 일상회화 질문 20개']},
          {tag: '영어 회화 듣기', verdict: '맞음', reason: '생활영어 100문장 듣기류가 상위 전부', top: ['왕초보 생활영어 회화 100문장 듣기…', '영어회화 300문장 틀어놓고 듣기만 하세요…']},
          {tag: '지하철 영어', verdict: '맞음', reason: '지하철에서 외국인 길 안내 영어가 상위 — 1장과 바로 맞음', top: ['지하철에서 외국인을 만났을 때 쓰는 초간단 영어회화 | 길 안내 영어 50문장', '[평생 써먹는 여행영어] 택시, 버스, 지하철 영어회화 핵심 10문장']},
          {tag: '기초 영어 듣기', verdict: '맞음', reason: '왕초보 생활영어 듣기가 상위 전부', top: ['#44 생활영어 100문장 1시간 흘려 듣기…', '왕초보 영어회화 100문장 듣기 루틴…']},
          {tag: '영어 리스닝', verdict: '맞음', reason: '리스닝 강의·생활영어 듣기가 상위', top: ['영어가 자막없이 들리는 리스닝 강의 공짜로 풉니다?', '왕초보도 외계어같던 영어가 한국어로 들립니다…']},
          {tag: '영어 질문 대답', verdict: '맞음', reason: '질문에 대답하는 법·질문+대답 강의가 상위', top: ['영어 질문 받으면 이렇게 대답하세요 | 왕초보 영어회화 100문장…', '무조건 듣게 되는 영어 질문 + 대답 #1강…']},
        ],
        pinnedComment: pinned,
      },
      why: '검색 상위가 "100문장·500문장 흘려듣기(한글 발음 포함)"로 꽉 차 있어 문장 수로 겨루면 묻힌다. 설명란 첫 줄은 장면과 "왜"로, 태그는 실제 검색어로. 고정 댓글의 들을 곳(한글 소리)은 영어 음성 77개 청취와 대조해 확정했다.',
    },
  ],
  pending: [
    'Gate 1 승인 및 2026-11-27 백지 눈 검수·수정 완료(영어 77개·신호음 3종·장 전환 배경음 완료)',
    '다음: generate-ko-batch.mjs로 한국어 161덩어리(131+30, Gero) 생성·정제·검수',
    '실측 길이로 시간표·썸네일 분수 칩 갱신 → 장별 마스터 믹스 + HyperFrames 1920×1080 30fps 조립 → 콘택트시트 → Gate 2 렌더 승인(목표 11/30 밤)',
  ],
  thumbnailPicks: prevSheet?.thumbnailPicks?.length ? prevSheet.thumbnailPicks : [thumbs[0]],
  titlePicks: prevSheet?.status === 'approved' ? [titles[0]] : [],
  ...(prevSheet?.approvedAt ? {approvedAt: prevSheet.approvedAt} : {}),
};

const out = join(sheetsDir, `${EP}.json`);
writeFileSync(out, `${JSON.stringify(sheet, null, 2)}\n`);
const problems = validateSheet(sheet, {imageExists: (p) => existsSync(join(sheetsDir, p))});
console.log(`시트 저장: ${out}`);
console.log(`컷 ${cuts.length}개, 추정 길이 ${fmt(tl.totalSeconds)}`);
console.log(problems.length ? `검사 문제 ${problems.length}건\n- ${problems.join('\n- ')}` : '검사 문제 0건');
