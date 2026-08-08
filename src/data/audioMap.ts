/**
 * EP7 narration, synthesised by scripts/generate-tts.mjs in the channel voice
 * (see scripts/tts-config.mjs). Flat names because the generator writes them,
 * unlike the hand-named EP6 recordings below.
 */
export const AUDIO_FILES_EP07: Record<number, string> = {
  1: "ep07_scene01.wav",
  2: "ep07_scene02.wav",
  3: "ep07_scene03.wav",
  4: "ep07_scene04.wav",
  5: "ep07_scene05.wav",
  6: "ep07_scene06.wav",
  7: "ep07_scene07.wav",
  8: "ep07_scene08.wav",
  9: "ep07_scene09.wav",
  10: "ep07_scene10.wav",
  11: "ep07_scene11.wav",
};

/** EP8 narration, synthesised by scripts/generate-tts.mjs. */
export const AUDIO_FILES_EP08: Record<number, string> = {
  1: "ep08_scene01.wav",
  2: "ep08_scene02.wav",
  3: "ep08_scene03.wav",
  4: "ep08_scene04.wav",
  5: "ep08_scene05.wav",
  6: "ep08_scene06.wav",
  7: "ep08_scene07.wav",
  8: "ep08_scene08.wav",
  9: "ep08_scene09.wav",
  10: "ep08_scene10.wav",
  11: "ep08_scene11.wav",
  12: "ep08_scene12.wav",
};

/**
 * EP9 narration. Scene 11 is the end screen — silent by design, so it has no
 * entry here and falls back to the script's 8s duration.
 */
export const AUDIO_FILES_EP09: Record<number, string> = {
  1: "ep09_scene01.wav",
  2: "ep09_scene02.wav",
  3: "ep09_scene03.wav",
  4: "ep09_scene04.wav",
  5: "ep09_scene05.wav",
  6: "ep09_scene06.wav",
  7: "ep09_scene07.wav",
  8: "ep09_scene08.wav",
  9: "ep09_scene09.wav",
  10: "ep09_scene10.wav",
};

/**
 * EP10 narration — the season finale. Scene 9 is the end screen: silent, so
 * no entry here and it falls back to the script's 8s duration.
 */
export const AUDIO_FILES_EP10: Record<number, string> = {
  1: "ep10_scene01.wav",
  2: "ep10_scene02.wav",
  3: "ep10_scene03.wav",
  4: "ep10_scene04.wav",
  5: "ep10_scene05.wav",
  6: "ep10_scene06.wav",
  7: "ep10_scene07.wav",
  8: "ep10_scene08.wav",
};

export const AUDIO_FILES: Record<number, string> = {
  1: "ep06_Scene 1. 즉시 퀴즈 (000~040).wav",
  2: "ep06_Scene 2. 인사 + SEO 키워드 (040~115).wav",
  3: "ep06_Scene 3. 패턴 확인 — 직접 맞혀보기 (115~200).wav",
  4: "ep06_Scene 4. 규칙 정리 + 중간 예고 (200~235).wav",
  5: "ep06_Scene 5. 왜 그럴까 — 어원 (235~320).wav",
  6: "ep06_Scene 6. 강세 이동 직접 확인 (320~420).wav",
  7: "ep06_Scene 7. 실생활 연결 (420~505).wav",
  8: "ep06_Scene 8. 예외 공개 (505~600).wav",
  9: "ep06_Scene 9. 실전 적용 (600~645).wav",
  10: "ep06_Scene 10. 요약 + SEO 키워드 (645~720).wav",
  11: "ep06_Scene 11. 다음 편 예고 + 채널명 (720~750).wav",
};
