// 영상 하나가 쇼츠('SHORTS')인지 롱폼('LONGFORM')인지 판정한다.
// 유튜브 쇼츠는 최대 3분이라 길이(60초 이하)만으로는 61~180초 쇼츠를 가려내지 못한다.
// 공개 영상은 채널의 쇼츠 전용 재생목록(UC…→UUSH…) ID 집합(shortsIds)을 기준으로 판정하고,
// 목록이 없거나(null) 예약·비공개 등 공개 상태가 아니면 길이(1~60초)로 대신 판정한다.

/**
 * 영상 메타데이터와 채널 쇼츠 ID 집합을 바탕으로 형식을 판정한다.
 * @param {{videoId?: string, privacyStatus?: string|null, durationSeconds?: number|string|null}} video
 * @param {Set<string>|null|undefined} shortsIds
 * @returns {'SHORTS'|'LONGFORM'}
 */
export const resolveVideoFormat = (video, shortsIds) => {
  if (shortsIds && video.privacyStatus === 'public') return shortsIds.has(video.videoId) ? 'SHORTS' : 'LONGFORM';
  const seconds = Number(video.durationSeconds || 0);
  return seconds > 0 && seconds <= 60 ? 'SHORTS' : 'LONGFORM';
};

