// Catches narration that the TTS will mangle, before any paid call goes out.
//
// The failure this exists for: `"TION 강세의 비밀..."` came back with "비밀"
// slurred into "빌밀". A bare suffix is not a word, so the model tries to read
// it letter-ish and bleeds into whatever follows. Real English words are fine —
// the model knows NATION and MISSION — so only *fragments* are rejected.

/** Suffix fragments that are never words on their own. */
export const SUFFIX_REPLACEMENTS = Object.freeze({
  TION: "션",
  TURE: "처",
  IC: "익",
  // SION is genuinely ambiguous — "션" after a consonant, "전" after a vowel
  // (see the -SION rule EP7 teaches). A script has to say which it means, so
  // there is no automatic answer here.
  SION: null,
});

/**
 * Whole English words the TTS reads correctly. Anything uppercase that is not
 * on this list is treated as a fragment.
 *
 * Add a word here only after hearing the generated audio — the point of the
 * list is that each entry has been verified, not merely assumed.
 */
export const VERIFIED_WORDS = new Set([
  "INFORM", "INFORMATION", "NATION", "ATTENTION", "EDUCATE", "EDUCATION",
  "COMMUNICATE", "COMMUNICATION", "TRANSLATE", "TRANSLATION", "STATION",
  "VACATION", "IMAGINATION", "QUESTION", "OBSERVATION", "CONGRATULATION",
  "DECISION", "TELEVISION", "DISCUSSION", "MISSION", "TENSION", "CONFUSION",
  "EXPANSION", "CONCLUSION", "PICTURE", "NATURE", "FUTURE", "CELEBRATE",
  "CELEBRATION", "SUGGESTION", "DIGESTION", "HERO", "HEROIC", "EP",
  "SOCIAL",
]);

/** Runs of 2+ uppercase letters, and hyphen-chained letters like `A-C-T`. */
const UPPERCASE_RUN = /\b[A-Z]{2,}\b/g;
const HYPHEN_CHAIN = /\b(?:[A-Za-z]-){1,}[A-Za-z]\b/g;

const SENTENCE_BOUNDARY = /[.,!?]/;

/**
 * Korean particles that attach straight onto the preceding noun.
 *
 * The boundary this module inserts exists to stop the model running a
 * fragment into the next word — but "TION을" is a noun plus its object
 * particle, and cutting it ("션,을") is broken Korean that the model reads
 * *worse*. A particle, or a plain space, is already a boundary.
 */
const PARTICLE_HEADS = new Set([
  "을", "를", "이", "가", "은", "는", "의", "에", "와", "과",
  "도", "만", "로", "부", "까", "라", "으", "한", "처", "밖",
]);

/** Does this Hangul syllable end in a consonant? */
const hasBatchim = (syllable) => {
  const code = syllable.codePointAt(0) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0;
};

/**
 * Korean particles alternate on whether the noun ends in a consonant, so
 * swapping the noun ("TION" -> "익") can strand the wrong form: "익가" instead
 * of "익이". The pairing is mechanical, so fix it rather than emit broken
 * Korean for the narrator to read.
 */
const PARTICLE_AFTER_CONSONANT = { 가: "이", 를: "을", 는: "은", 와: "과", 로: "으로" };
const PARTICLE_AFTER_VOWEL = { 이: "가", 을: "를", 은: "는", 과: "와" };

const agreeParticle = (replacement, rest) => {
  const next = rest[0];
  if (!next) {
    return rest;
  }
  const table = hasBatchim(replacement.at(-1))
    ? PARTICLE_AFTER_CONSONANT
    : PARTICLE_AFTER_VOWEL;
  const corrected = table[next];
  return corrected ? corrected + rest.slice(1) : rest;
};

/** True when a comma after the replacement would help rather than hurt. */
const needsBoundaryAfter = (rest) => {
  if (rest.length === 0) {
    return false;
  }
  const next = rest[0];
  // Already separated, already punctuated, or a particle riding on the noun.
  if (/\s/.test(next) || SENTENCE_BOUNDARY.test(next) || PARTICLE_HEADS.has(next)) {
    return false;
  }
  // A fragment jammed straight against another word is the real run-on risk.
  return /[가-힣A-Za-z]/.test(next);
};

/**
 * Everything wrong with one narration string.
 * Empty array means it is safe to send.
 */
export function lintNarration(text) {
  const problems = [];
  const seen = new Set();

  for (const match of (text ?? "").matchAll(HYPHEN_CHAIN)) {
    problems.push({
      kind: "letter-chain",
      token: match[0],
      index: match.index,
      // A spelled-out chain has no single Korean reading; the script has to
      // write what the narrator should actually say.
      replacement: null,
      reason: "알파벳을 하이픈으로 나열하면 TTS가 글자마다 끊어 읽습니다.",
    });
  }

  for (const match of (text ?? "").matchAll(UPPERCASE_RUN)) {
    const token = match[0];
    if (VERIFIED_WORDS.has(token) || seen.has(match.index)) {
      continue;
    }
    seen.add(match.index);
    problems.push({
      kind: "bare-suffix",
      token,
      index: match.index,
      replacement: SUFFIX_REPLACEMENTS[token] ?? null,
      reason:
        SUFFIX_REPLACEMENTS[token] === null
          ? `${token}은 문맥에 따라 읽는 법이 달라 자동 치환할 수 없습니다.`
          : token in SUFFIX_REPLACEMENTS
            ? `${token}은 단어가 아니라 접미사라 TTS가 뒤 단어를 오염시킵니다.`
            : `${token}은 검증된 영어 단어 목록에 없습니다.`,
    });
  }

  return problems.sort((a, b) => a.index - b.index);
}

/**
 * Replaces what can be replaced and reports what cannot.
 *
 * A replaced fragment also gets a sentence boundary next to it: the Korean
 * that goes in ("션") is still a syllable rather than a word, and without a
 * comma the model runs it into the following word.
 */
export function fixNarration(text) {
  const problems = lintNarration(text);
  const fixable = problems.filter((p) => p.replacement);
  const remaining = problems.filter((p) => !p.replacement);

  let out = text;
  // Right to left, so earlier indices stay valid as the string changes.
  for (const problem of [...fixable].reverse()) {
    const before = out.slice(0, problem.index);
    const after = out.slice(problem.index + problem.token.length);
    const tail = agreeParticle(problem.replacement, after);
    out =
      before +
      problem.replacement +
      (needsBoundaryAfter(tail) ? "," : "") +
      tail;
  }

  return { text: out.replace(/\s+/g, " ").trim(), fixed: fixable, remaining };
}

/** Formats findings for the terminal. */
export function formatProblems(label, problems) {
  return problems
    .map(
      (p) =>
        `  ${label}: "${p.token}" — ${p.reason}` +
        (p.replacement ? ` → "${p.replacement}" 로 치환 가능` : " (직접 고쳐야 함)"),
    )
    .join("\n");
}
