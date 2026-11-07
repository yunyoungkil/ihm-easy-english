---
workflow: faceless-explainer
flow: automation
storyboard: yes
message: "한 문장 안의 두 '라이트'는 혀끝이 닿는지로 갈리는 다른 소리다"
destination: youtube-shorts
aspect: 1080x1920
language: ko
audience: "한국에서 영어를 배운 3060 성인 학습자"
length: 45초 이내
angle: quiz
---

# BRIEF — ep26-shorts-right-light

## 기본 정보

- **제목**: '라이트'가 두 번 나오는 문장, 소리가 같을까요? #영어발음 #shorts
- **제목을 바꾼 이유**: 처음 시안은 "이 문장에 '라이트'가 두 번 나옵니다"였는데, 사흘 앞서 나가는 EP25 쇼츠("이 네 단어, ...입니다")와 앞부분 틀이 겹쳤다(2026-11-07 사용자 승인).
- **공개**: 2026-11-17(화) 20:00 KST, 사용자 승인(2026-11-07).
- **형식**: 문장 퀴즈 (`knowledge/content-formats.md` Track A)
- **후보 문서**: `videos/ep26-r-vs-l/SHORTS.md` S1

## 이 쇼츠에만 있는 코너

문장에서 두 단어를 가려 두고 소리만 먼저 들려준 뒤, 두 단어가 같은 소리인지 묻는다. 단어가 아니라 문장 안에서 듣는다.

## 근거

- 길이: 쇼츠 45개(조회수 200회 이상, 2026-11-06 API 실측) 중 31~45초는 평균 시청률 중앙값 77%, 46~60초는 55%다.
- 시청자 고민: `data/youtube/audience-dna.json`에 경쟁 영상 댓글에서 뽑은 R과 L 고민이 있다("R과 L이 연속으로 겹칠 때 혀가 물리적으로 꼬여..."). World 영상에서 나온 고민이라 이 쇼츠의 단어와 같지는 않고, 혀끝 위치가 궁금하다는 근거로만 쓴다.
- 사실 확인: 단어 맨 앞의 L은 혀끝이 윗니 뒤 잇몸에 닿고, R은 혀끝이 닿지 않는다. 단어 끝의 L은 안 닿기도 해서 맨 앞 L만 다룬다. 출처: https://koreascience.kr/article/JAKO200115637241334.page?lang=en , https://teflcourse.net/blog/how-to-teach-the-correct-pronunciation-of-l-r-v-and-f-ittt-tefl-blog
- 문구: 롱폼의 "강하게 탁 때리며"는 쓰지 않고 "붙이면"으로 쓴다. 근거는 "닿는다"까지이고 세기는 확인되지 않았다.

## 연결

- **롱폼**: `Right와 Light, 둘 다 '라이트'로 읽으셨나요? | 영어 R L 20쌍 반복 듣기` (11/16 공개 예정, 링크 미정)
- **눌리는 링크**: 스튜디오의 "관련 동영상"에 위 롱폼을 지정한다. 쇼츠의 설명란과 댓글 링크는 눌리지 않는다.
- **마지막 5초 안내**: 말, 아래를 가리키는 손 그림(`cta_hand`), 롱폼 썸네일을 함께 넣는다. 유튜브 공식 블로그의 권장 사항이고 효과 수치는 없다(https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/). 공개 뒤 롱폼 유입 경로 `SHORTS_CONTENT_LINKS`로 확인한다.
- **조건**: EP26이 11/16까지 올라가야 지정할 수 있다. 고급 기능 권한이 필요하다(https://support.google.com/youtube/answer/14075157).

## 사람이 만든 흔적

넣지 않는다. 이유: 실제 시청자 댓글 7개 중 이 주제를 다룬 것이 없고, 나레이션은 사용자가 직접 생성하기로 했다(2026-11-07).

## 화면과 음성

- **스타일 제안**: 도로 표지판처럼 보이는 문장 카드. 다른 두 쇼츠와 구분하기 위한 이 편만의 구성이다. 그림은 흰 카드 안에 넣는다.
- **아바타**: 쓰지 않는다.
- **원어민 음성**: 단어는 남성 음성으로 통일한다. 후보 문서의 남녀 교차는 목소리 차이가 소리 차이처럼 들릴 수 있어 바꿨다. 문장은 `dial_01_right_light`를 그대로 쓴다.
- **업로드**: `status.json`을 `ready_to_upload`로 두지 않고 스튜디오에서 직접 예약한다.
