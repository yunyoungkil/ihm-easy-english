# 블로그 대표 그림 1장 설계 (tech.d40m.com)

2026-11-25 · Claude Opus 5.5(opus-expert) · 설계만, 코드는 바꾸지 않았다. [번호]는 맨 아래 출처.

## 결론 5줄

1. 그림은 **블로거 자체 저장소**에 올린다. 블로거 API에는 그림 올리기가 없지만[1], "이메일로 글 보내기"에 그림을 붙이면 블로거가 보관한다[4]. 무료이고 저장 용량을 안 쓰며 주소가 만료되지 않는다[2][3].
2. 블로거에 올린 그림은 검색·공유 때 보이는 대표 그림으로 자동으로 잡힌다(실측). 다른 사이트에 둔 그림도 잡히는지는 확인하지 못했다.
3. 그림 설계도는 글 쓰는 Opus가 같은 호출에서 함께 쓰고, 그림 3장을 만든 뒤 Opus가 한 번 더 보고 1장을 고른다. 추가 비용 0원.
4. 코드는 안전선만 막는다(브랜드·나이 낱말, 워터마크 문장, 크기, 같은 그림 반복, 쿠팡 그림 주소). 구도·빛·렌즈·화풍은 글마다 AI가 정한다.
5. 그림이 실패한 날은 게시를 미루고 초안을 둔다. 다음 실행은 그림부터 하고, 3번 연속 실패하면 멈추고 브리핑에 알린다.

## 사용자가 정할 것

1. **그림 올리는 길** (권고: 가)
   - 가. 이메일 올리기: 블로거 설정에서 "이메일로 게시"를 **임시글로 저장**으로 켜고, 프로그램에 "내 이름으로 메일 보내기" 권한을 한 번 허락한다. 브라우저 없이 돈다. 권한 범위가 넓어 허락 열쇠는 이 PC에 따로 둔다.
   - 나. 블로거 글쓰기 화면 자동 누르기: 할 일은 없지만 화면이 바뀌면 깨지고, 그림 고르기 창을 다룰 수 있는지 확인하지 못했다.
   - 다. 새 그림 사이트(클라우드플레어, `img.d40m.com`): 무료, 새 계정과 가비아 기록 1개 필요. 대표 그림으로 잡히는지 모른다.
   - 권하지 않음: 구글 드라이브 공개 링크, GitHub Pages(상업 사이트 운영 금지 문구[7]), 그림을 글 속에 통째로 넣기.
2. **그림이 실패한 날**: 미루기(권고) / 그림 없이 올리고 나중에 붙이기.
3. **테마에 "큰 미리보기 허용" 한 줄**: 구글 디스커버 큰 그림 조건[8]. 권고는 넣기(대화 중 AI가 브라우저로 넣고 사용자가 확인).

---

## A. 그림을 어디에 올리나

- 사실: Posts 메서드는 list·get·search·insert·delete·getByPath·patch·update·publish·revert이고 올리기는 없다. `images[].url` 칸을 써 넣을 수 있는지는 문서에 없다[1]. 편집기로 올린 그림은 저장 용량에 안 들어가고 압축될 수 있으며[2], `blogger.googleusercontent.com` 주소는 만료되지 않는다[3]. 이메일 게시는 제목·본문이 글이 되고 "그림은 메일에 첨부", 임시글 저장 가능, 주소를 아는 누구나 올릴 수 있다는 경고가 있다[4].
- 실측(11/25): blogger.googleblog.com 글의 `og:image`는 본문 첫 그림 주소에 `=w1200-h630-p-k-no-nu`를 붙인 값이고, 피드 썸네일도 같은 그림이다. 우리 소개 페이지(Contempo)는 그림이 없어 구조화 데이터 `image`가 블로거 기본 그림(`U2hvZWJveA`, 1200×348)이다. 홈에는 `og:image`·robots 메타가 없다.
- 다안: 무료 사이트당 파일 2만 개·파일당 25MiB[5], 하위 도메인은 CNAME만으로 붙는다[6]. 약관은 그림 위주 전송에 유료 서비스를 쓰라며 "Developer Platform"을 예로 든다(무료 Pages 해당 여부 모름)[9]. 네임서버가 가비아(실측)라 R2에 우리 도메인을 붙이려면 이전이 필요해 뺐다.
- 속도: 가장 큰 그림은 지연 로딩하지 말고 `fetchpriority="high"`, 다른 주소 그림은 연결 비용이 든다[10]. 세 안 모두 다른 주소라 차이는 작다(가설).
- 정리: 대표 그림 자동 인식은 가·나만 확인됨, 무인 실행은 가·다가 강하고 나가 약함, 비용은 셋 다 0원.

## B. 대표 그림으로 잡히게

- 자리: 대가 문구 문단 바로 다음(본문 첫 그림, 기존 첫 문단 검사 유지).
- 크기: AI 스튜디오 16:9는 1376×768(실측, 641KB). 디스커버는 가로 1200 이상·16:9·30만 화소 초과·`max-image-preview:large`·글자 많은 그림과 로고 피하기[8], 기사 구조화 데이터는 5만 화소 이상[11], 네이버는 150×150 초과·5,000바이트 이상·3:1 이하·문서마다 고유한 그림[12]. 블로거가 1200×630으로 잘라 위아래 합 약 6%가 빠질 수 있다(계산).
- alt: 그 글의 문제 순간을 한국어 한 문장으로. 낱말 나열·"사진" 머리말·브랜드명 금지, 금지어·AI 티 검사 대상[13].
- 속성: `width="1200" height="670"`, `fetchpriority="high"`, `decoding="async"`, `loading="lazy"` 없음.

## C. 누가 언제 만드나

- 흐름(무인 월·수·금 02:00, 1시간 한도): 글쓰기 Opus(초안 + `heroImage`) → 글 점검·쿠팡 링크 → 설계도 점검 → 그림 3장(`generate-aistudio-image.mjs --aspect 16:9 --prompt-file`) → 파일 점검 → 고르기 Opus → 올리기 → 게시 → 실제 페이지 확인.
- 이유: 떨어질 초안에 그림 한도를 안 쓴다. 미리 만들기(ii)는 글과 장면이 어긋나고, 대화 중 만들기(iii)는 첫 글(Task 12)에만.
- `heroImage` 칸 채택. 장점은 호출이 안 늘고 출처를 읽은 쪽이 장면을 정하며 칸마다 점검된다는 것. 단점은 형식 실패 증가, 결과를 못 봄, 글마다 비슷해질 위험. 보완: 최근 설계도 5개를 지시문에 넣고, 고르기 Opus가 3장을 다 떨어뜨리면 고칠 점을 처음 지시문에 합쳐 새로 뽑는다(최대 2바퀴 6장, 이어 고치지 않음).
- 칸: `{moment, subject, setting, light, lens, angle, texture, medium, avoid[], alt}`. 빈칸만 강제, 값은 자유.
- 고르기: `claude.exe -p --model claude-opus-5-5 --restricted --tools Read,Write --allowedTools "Read(output/blog/images/**),Write(output/blog/images/**)"` → `verdict.json`.
- 실패: 로그아웃·한도·시간 초과·올리기 실패는 `image-deferred`. 초안·후보를 두고 큐는 그대로, 다음 실행은 초안이 있으면 글쓰기를 건너뛴다. 3회 연속이면 일시 정지.
- 비용: claude.exe는 구독으로 돈다(5시간 한도 응답 기록) → 0원, 글당 Opus 2~3회. AI 스튜디오 그림은 하루 11장에도 안 막혔다(실측). 주 3편 최대 18장.

## D. 점검

- 코드(설계도): 빈칸, `alt`·`moment` 금지어(`findBannedTerms`), 나이 낱말(노인·중년·60대·elderly·senior 등), 글감의 브랜드 낱말. 워터마크 문장은 코드가 붙인다.
- 코드(파일): 가로 1200 이상, 16:9±3%, 5,000바이트 이상, 올리기용 JPEG 품질 85. 9×8 흑백 dHash로 이전 그림과 해밍 거리 10 이하면 뺀다(가설 숫자).
- 코드(HTML): 첫 그림 자리, `alt`·`width`·`height`, `lazy` 없음, `coupangcdn.com` 0개. `--ref`는 `output/blog/images/**`만.
- 코드(게시 뒤): `og:image`에 올린 그림 주소가 들었는지, 구조화 데이터 `image`가 `U2hvZWJveA`가 아닌지. 헤드리스로 1280·400px 캡처, 그림 `naturalWidth>0`.
- 눈(고르기 Opus, 네 모서리 2배 조각 포함): 문제 장면인가, 로고·상표·특정 제품 모양 닮음, 워터마크·별 로고, 글자 깨짐, 손·얼굴, 정중앙·정면·고른 조명 같은 평균 구도, 1200×630으로 잘려도 핵심이 남는가.
- 사람(0번 13항): 첫 글은 대화에서 브라우저로 연다. 무인 글은 다음 브리핑이 캡처를 연다(`blog-status` "눈 확인 대기 N장").

## E. 구현 작업 (sonnet-worker, 결정 1 = 가)

1. `.gitignore`: `.gmail-send-oauth-token.json`, `output/blog/images/`.
2. `google-auth.mjs`: `GMAIL_SEND_SCOPE`, 따로 쓰는 토큰, `getGmailAccessToken`, 명령 `login-gmail`. 게시 주소는 `.env` `BLOGGER_TECH_POST_EMAIL`.
3. 새 `scripts/blog/hero-image.mjs`: `validateHeroBrief`, `composeHeroPrompt`, `generateCandidates`, `probeImage`·`dHash`·`hamming`·`cornerCrops`·`encodeForUpload`(ffmpeg), `runPicker`, 기록 `output/blog/images/<topicId>/hero.json`.
4. 새 `scripts/blog/blogger-image-upload.mjs`: 첨부 메일 만들기·Gmail API 보내기, `posts.list?status=draft`에서 제목 표식으로 찾기(시간 제한 반복), `<img src>`를 `/w1200/` 주소로.
5. `publish-post.mjs`: `renderPostHtml(draft,{productLink,hero})` 그림 자리, `draftPostId`면 patch 뒤 publish, `verifyLive`에 게시 뒤 검사(경고).
6. `check-post.mjs`: 모든 글 `heroImage` 필수, `checkRenderedHtml`에 D절 HTML 규칙.
7. `prompts/tech-post.md` 6·8절과 `write-tech-post.mjs` `buildWriterPrompt`(최근 설계도 5개).
8. `tech-run.mjs`: C절 순서, `image-deferred`, 초안 재사용, preview는 로컬 그림, `appendPost`에 `hero{url,hash,promptFile}`.
9. `blog-status.mjs`: 미룬 횟수·눈 확인 대기.
10. 새 `scripts/tests/blog-hero-image.test.mjs`(`package.json` `test` 목록에 추가), 기존 `blog-tech-run`·`blog-write-publish`·`blog-check-post`·`blog-google-auth` 테스트 수정. 기준 숫자에 `// allow-literal: <이유>`.

확인: `node --test scripts/tests/blog-hero-image.test.mjs` → `npm test`(`# fail 0`) → 대화에서 `node scripts/blog/tech-run.mjs --preview --force-day` 후 브라우저 1280/400px → 사용자 허락 뒤 이메일 시험 1번(임시글만). 나·다로 정하면 4번만 바뀐다. 추가 그림은 `heroImage`를 `images[]`로 넓혀 같은 단계를 돌린다(지금은 안 만든다).

## 확인하지 못한 것

- 이메일 게시가 지금 동작하는지, 첨부가 어느 주소·크기로 들어가는지, 그 임시글을 API로 고쳐 게시할 수 있는지.
- 외부 주소 그림이 `og:image`·구조화 데이터로 잡히는지, `images[]`를 써 넣을 수 있는지.
- 블로거가 `fetchpriority`·`width`·`height`를 남기는지, Contempo가 본문 그림을 지연 로딩하는지, "맞춤 robots 헤더"에 `max-image-preview`가 있는지.
- 02:00 무인 실행에서 자동화 크롬·AI 스튜디오 로그인이 살아 있는지(Task 13 3단계에 그림 포함).
- 네이버 이미지 전용 안내(`seo-basic-image`는 없는 페이지), 메일 권한 추가 때 확인 안 된 앱 경고, 클라우드플레어 조항의 무료 Pages 해당 여부, 블로거 그림 올리기 창 구조.

## 출처

[1] developers.google.com/blogger/docs/3.0/reference/posts · [2] support.google.com/blogger/answer/41641 · [3] support.google.com/blogger/answer/13656070 · [4] support.google.com/blogger/answer/41452 · [5] developers.cloudflare.com/pages/platform/limits/ · [6] developers.cloudflare.com/pages/configuration/custom-domains/ · [7] docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits · [8] developers.google.com/search/docs/appearance/google-discover · [9] cloudflare.com/service-specific-terms-application-services/ · [10] web.dev/articles/optimize-lcp · [11] developers.google.com/search/docs/appearance/structured-data/article · [12] searchadvisor.naver.com/guide/markup-content · [13] developers.google.com/search/docs/appearance/google-images (모두 https, 2026-11-25 읽음)
