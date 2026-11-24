// 업로드 패키지 상태 파일(status.json·shorts-status.json)을 유튜브 값으로 맞추는 계산(2026-11-24 사용자 "막자").
// 예전에는 대시보드가 5분마다 확인할 때마다 바뀐 게 없어도 lastSyncedAt을 새로 적었다. 그래서 대시보드를 켠 PC마다
// 의미 없는 변경이 생겼고, 집 PC 새벽 루프의 데이터 커밋과 부딪혀 다음 날 git pull이 멈출 수 있었다
// (2026-11-24 노트북에서 상태 파일 7개가 시각 한 줄만 바뀐 채 남아 있었다).
// 이제 실제 상태(아래 칸)가 바뀔 때만 파일에 쓰고, 그때만 lastSyncedAt을 새로 적는다. 확인 간격은 서버가 메모리로 센다.

export const STATUS_FIELDS = ['videoId', 'status', 'publishedAt', 'publishedAtSource', 'scheduledFor'];

/**
 * @param statusData 지금 파일 내용
 * @param videoId 찾아낸 영상 ID(없으면 null)
 * @param ytVideo videos.list 결과 한 개(part=status,snippet), 없으면 null
 * @returns {{updated: object, changed: boolean}} 바뀐 게 없으면 updated는 statusData 그대로
 */
export function applyYouTubeStatus(statusData, {videoId = null, ytVideo = null, now = new Date()} = {}) {
  const next = {...statusData};
  if (videoId) next.videoId = videoId;
  const ytStatus = ytVideo?.status || null;
  if (ytStatus) {
    if (ytStatus.privacyStatus === 'public') {
      next.status = 'published';
      next.publishedAt = ytVideo.snippet?.publishedAt || next.publishedAt || now.toISOString();
      if (ytVideo.snippet?.publishedAt) next.publishedAtSource = 'youtube';
    } else if (ytStatus.privacyStatus === 'private' && ytStatus.publishAt) {
      next.status = 'scheduled';
      next.scheduledFor = ytStatus.publishAt;
    }
  }
  const changed = STATUS_FIELDS.some((k) => next[k] !== statusData[k]);
  if (!changed) return {updated: statusData, changed: false};
  next.lastSyncedAt = now.toISOString();
  return {updated: next, changed: true};
}
