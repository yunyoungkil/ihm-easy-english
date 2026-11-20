import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EP_DIR = join(HERE, '..');
const ROOT = resolve(EP_DIR, '..', '..');

const sheet = JSON.parse(readFileSync(join(ROOT, 'data/youtube/transform-sheets/ep33-shorts-swallowed-t.json'), 'utf8'));
const timings = JSON.parse(readFileSync(join(EP_DIR, 'assets/audio-timings.json'), 'utf8'));

const PKG_DIR = join(ROOT, 'output/upload-packages/ep33-shorts-swallowed-t');
mkdirSync(PKG_DIR, {recursive: true});

const mp4Src = join(EP_DIR, 'renders/ep33-shorts-swallowed-t_2026-11-20_21-25-14.mp4');
const videoFile = 'English_Pronunciation_Swallowed_T_Button_Curtain_Mountain_Important_Shorts.mp4';
copyFileSync(mp4Src, join(PKG_DIR, videoFile));

const thumbSrc = join(ROOT, 'data/youtube/transform-sheets/images/ep33-shorts-swallowed-t/thumb-A.jpg');
const thumbDst = join(PKG_DIR, 'thumbnail.jpg');
copyFileSync(thumbSrc, thumbDst);
const thumbSha = createHash('sha256').update(readFileSync(thumbDst)).digest('hex');

const pkgRow = sheet.rows.find((r) => r.key === 'package').ours;
const title = sheet.titlePicks[0];
const description = pkgRow.description;
const tags = pkgRow.tags;
const pinnedComment = pkgRow.pinnedComment;

writeFileSync(join(PKG_DIR, 'title.txt'), title + '\n', 'utf8');
writeFileSync(join(PKG_DIR, 'description.txt'), description + '\n', 'utf8');
writeFileSync(join(PKG_DIR, 'tags.txt'), tags.join(', ') + '\n', 'utf8');
writeFileSync(join(PKG_DIR, 'pinned-comment.txt'), pinnedComment + '\n', 'utf8');

const nowIso = new Date().toISOString();
writeFileSync(
  join(PKG_DIR, 'sheet-thumbnail-approval.json'),
  JSON.stringify(
    {
      sheetId: sheet.sourceVideoId,
      file: 'thumbnail.jpg',
      sha256: thumbSha,
      approvedAt: nowIso,
      source: 'sheet-approved',
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(PKG_DIR, 'metadata.json'),
  JSON.stringify(
    {
      episodeId: 'ep33-shorts-swallowed-t',
      format: 'shorts',
      videoFile,
      title,
      categoryId: '27',
      defaultLanguage: 'ko',
      defaultAudioLanguage: 'ko',
      containsSyntheticMedia: true,
      playlistId: 'PLCbnHG8SDRes',
      playlistTitle: '이해하면 쉬운 영어 | 영어 읽는 법 테스트 시즌1 (30초 퀴즈)',
      plannedPublishAt: '2026-12-08T20:00:00+09:00',
      plannedPublishAtUtc: '2026-12-08T11:00:00Z',
      tagsCount: tags.length,
      thumbnailApprovalFile: 'sheet-thumbnail-approval.json',
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(PKG_DIR, 'shorts-status.json'),
  JSON.stringify(
    {
      status: 'ready',
      episodeId: 'ep33-shorts-swallowed-t',
      format: 'shorts',
      createdAt: nowIso,
      scheduledFor: '2026-12-08T11:00:00Z',
      containsSyntheticMedia: true,
      playlistId: 'PLCbnHG8SDRes',
      playlistTitle: '이해하면 쉬운 영어 | 영어 읽는 법 테스트 시즌1 (30초 퀴즈)',
      categoryId: '27',
      language: 'ko',
    },
    null,
    2,
  ) + '\n',
);

writeFileSync(
  join(PKG_DIR, 'community-post.json'),
  JSON.stringify(
    {
      episodeId: 'ep33-shorts-swallowed-t',
      targetPublishDate: '2026-12-08T09:00:00Z',
      content:
        '오늘 저녁 여덟 시, 원어민이 가운데 \'트\'를 아예 안 읽고 코로 넘기는 영어 단어 네 가지를 공개합니다!\n\n먼저 가볍게 예습 퀴즈 하나 풀어 보실까요?\n미국 원어민이 엘리베이터에서 "Press the button."이라고 말할 때, button은 어떻게 들릴까요?\n\n1) 버튼 (트 소리를 또렷하게)\n2) 버·은 (입을 잠깐 막고 코로 넘김)\n3) 버던 (드 소리로 바꿈)\n\n정답과 실전 발음은 오늘 저녁 여덟 시 쇼츠에서 바로 확인해 보세요!',
    },
    null,
    2,
  ) + '\n',
);

// Build exact millisecond-synced Korean SRT from audio-timings.json
const KO_TEXT = {
  c00: "버튼, 원어민은 '트'를 안 읽습니다.",
  c01: '티 뒤에 엔이 오면 코로 넘깁니다.',
  c02: '첫째, 버튼.',
  c03: '입을 막고 코로 뺍니다.',
  c04: '둘째, 커튼.',
  c05: '트 없이 코로 넘깁니다.',
  c06: '셋째, 마운틴.',
  c07: '티가 쏙 숨어 버리죠.',
  c09: '마지막, 직접 말해 보세요!',
  c10: '임포턴트 대신 이렇게요.',
  c11: '보너스 네 단어는 고정 댓글에 있어요.',
};

function fmtSrt(sec) {
  const ms = Math.round(sec * 1000);
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  const r = String(ms % 1000).padStart(3, '0');
  return `${h}:${m}:${s},${r}`;
}

const srtEntries = [];
for (const c of timings.cuts) {
  if (c.ko) {
    const st = c.t + c.ko.offset;
    srtEntries.push({start: st, end: st + c.ko.duration, text: KO_TEXT[c.ko.id]});
  }
  if (c.cut === 8 && c.en.length === 3) {
    const st = c.t + c.en[0].offset;
    const enEnd = c.t + c.en[2].offset + c.en[2].duration;
    srtEntries.push({start: st, end: enEnd, text: 'button / curtain / mountain'});
  } else {
    for (const e of c.en) {
      const st = c.t + e.offset;
      srtEntries.push({start: st, end: st + e.duration, text: e.id});
    }
  }
}

const srtBody =
  srtEntries.map((e, i) => `${i + 1}\n${fmtSrt(e.start)} --> ${fmtSrt(e.end)}\n${e.text}`).join('\n\n') + '\n';
writeFileSync(join(PKG_DIR, 'subtitles-ko.srt'), srtBody, 'utf8');

console.log(`PACKAGE BUILT: ${PKG_DIR} (srt=${srtEntries.length} cues, thumbSha=${thumbSha.slice(0, 12)})`);
