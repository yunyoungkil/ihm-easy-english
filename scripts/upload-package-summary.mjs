// 업로드 패키지 폴더를 대시보드 목록으로 옮길 때 쓰는 작은 규칙들.
// 자동 업로드(youtube-publisher.mjs)와 대시보드(youtube-analytics-server.mjs)가 같은 영상 파일을 고르게 한다.

const isMp4 = (name) => /\.mp4$/i.test(name);

// 검색어로 지은 영상 파일(SEO)을 generic video.mp4보다 먼저 고른다. 없으면 null.
export const selectPackageVideo = (files = []) =>
  files.find((f) => isMp4(f) && f.toLowerCase() !== 'video.mp4') || files.find(isMp4) || null;

// 쇼츠 패키지 폴더(예: ep24-shorts-sheep-ship)면 붙일 롱폼 번호(EP24)를, 아니면 null을 돌려준다.
// 쇼츠 패키지에는 status.json을 두지 않는다. 있으면 자동 업로드 대기열이 롱폼 자리를 쇼츠에 내준다.
export const shortsPackageEpisode = (folderName = '') => {
  const m = /^ep(\d+)-shorts-/i.exec(folderName);
  return m ? `EP${m[1]}` : null;
};

// 대시보드가 패키지 상태를 읽고 유튜브와 맞춰 저장할 파일. 쇼츠는 status.json 대신 대시보드만 읽는
// shorts-status.json을 쓴다(자동 업로드 대기열·업로드 횟수 계산은 status.json만 읽으므로 섞이지 않는다).
// 쇼츠는 파일이 없어도 packaged로 시작해 유튜브 업로드 목록에서 제목으로 찾아보게 한다.
export const packageStatusSource = (folderName = '') =>
  shortsPackageEpisode(folderName)
    ? {file: 'shorts-status.json', fallback: {status: 'packaged'}}
    : {file: 'status.json', fallback: {}};

// 쇼츠 패키지를 독립된 카드로 등록하면서, 같은 번호의 롱폼 카드에도 연계 정보(tracks['shorts-a'…])를 연결한다.
// 롱폼이 없어도 쇼츠 카드는 독립적으로 생성되며, 롱폼 카드가 있으면 상호 연결(relatedShorts / parentEpisode)된다.
export const attachShortsPackages = (episodes, shortsPackages = []) => {
  for (const {episode, track} of shortsPackages) {
    // 1. 해당 번호의 롱폼 카드가 있으면 쇼츠 트랙을 연계 등록
    const target = episodes.find((e) => e.season === '단편' && e.episode === episode && e.tracks?.longform);
    if (target) {
      let n = 0;
      while (target.tracks[`shorts-${String.fromCharCode(97 + n)}`]) n += 1;
      target.tracks[`shorts-${String.fromCharCode(97 + n)}`] = track;
      target.relatedShorts = target.relatedShorts || [];
      target.relatedShorts.push(track.contentId);
    }

    // 2. 쇼츠 자체를 독립된 카드로 episodes 목록에 추가 (대시보드에서 롱폼과 분리 표시)
    episodes.push({
      season: '쇼츠',
      episode: `${episode} 쇼츠`,
      parentEpisode: episode,
      kind: 'shorts',
      tracks: {
        longform: track,
        shorts: track,
      },
    });
  }
  return episodes;
};

// 대시보드 카드에 보일 패키지 상태 글. 날짜는 한국 시간으로 계산해 서버 PC의 시간대와 상관없이 같다.
// plannedFor는 쇼츠 패키지의 shorts-status.json에 적는 공개 예정일이다(아직 스튜디오에 예약하기 전).
const KST_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const kstParts = (iso) => {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const d = new Date(at + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return {md: `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${KST_DAYS[d.getUTCDay()]})`, hm: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`};
};

export const packageStatusLabel = (status = {}) => {
  const when = kstParts(status.scheduledFor);
  if (status.status === 'scheduled' && status.scheduledFor) return when ? `예약 · ${when.md} ${when.hm}` : '예약됨';
  if (status.status === 'ready_to_upload' && status.scheduledFor) return when ? `업로드 대기 · 예약 권장: ${when.md} ${when.hm} KST` : '업로드 대기';
  if (status.status === 'published') return '공개됨';
  const planned = kstParts(status.plannedFor);
  return planned ? `패키징 완료 · 예정 ${planned.md} ${planned.hm}` : '패키징 완료';
};
