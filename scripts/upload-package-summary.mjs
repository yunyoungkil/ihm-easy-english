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

// 쇼츠 패키지를 같은 번호의 단편 롱폼 카드에 쇼츠 탭('shorts-a', 'shorts-b' …)으로 붙인다.
// 같은 번호 카드가 둘이면 패키지 인스펙터가 번호로 찾다가 엉뚱한 카드를 열기 때문이다.
// 붙일 롱폼이 없으면 "EP31 쇼츠"처럼 따로 카드를 만든다.
export const attachShortsPackages = (episodes, shortsPackages = []) => {
  for (const {episode, track} of shortsPackages) {
    const target = episodes.find((e) => e.season === '단편' && e.episode === episode && e.tracks?.longform);
    if (!target) {
      episodes.push({season: '단편', episode: `${episode} 쇼츠`, tracks: {longform: track}});
      continue;
    }
    let n = 0;
    while (target.tracks[`shorts-${String.fromCharCode(97 + n)}`]) n += 1;
    target.tracks[`shorts-${String.fromCharCode(97 + n)}`] = track;
  }
  return episodes;
};
