---
workflow: faceless-explainer
flow: automation
storyboard: yes
message: "sheep과 ship은 한글로 똑같이 '쉽'이지만, 입 모양이 달라 소리가 갈린다"
destination: youtube-shorts
aspect: 1080x1920
language: ko
audience: "한국에서 영어를 배운 3060 성인 학습자"
length: 45초 이내
angle: quiz
---

# BRIEF — ep24-shorts-sheep-ship

## 기본 정보

- **제목**: 양일까 배일까? sheep과 ship, 소리만 듣고 맞혀 보세요 #영어발음 #shorts
- **공개**: 2026-11-10(화) 20:00 KST, 사용자 승인(2026-11-07).
- **형식**: 퀴즈 (`knowledge/content-formats.md` Track A)
- **후보 문서**: `videos/ep24-long-short-i/SHORTS.md` S1

## 이 쇼츠에만 있는 코너

그림 두 장 중 하나를 소리만 듣고 고르는 세 문제. 양과 배처럼 뜻이 전혀 다른 그림을 놓아, 글자를 몰라도 풀 수 있다.

## 근거

- 길이: 쇼츠 45개(조회수 200회 이상, 2026-11-06 API 실측) 중 31~45초는 평균 시청률 중앙값 77%, 46~60초는 55%다. 시청 시간은 두 구간 모두 약 30초라 45초 안에 끝낸다.
- 문제 수: 4문제 55초 쇼츠(8/31)의 평균 시청률은 37%였다. 1편뿐이라 가설로만 본다. 45초를 넘으면 세 번째 문제부터 뺀다.
- 사실 확인: 후보 문서의 주의 사항대로 "길이가 아닙니다"라고 단정하지 않고 "길이보다 입과 혀 모양이 더 크게 다릅니다"로 쓴다. "입꼬리 당김"은 검색 요약으로만 확인돼, 원문으로 확인한 "턱을 살짝 내린다"를 함께 말한다. 전체 판정은 `FACT-CHECK.md`. 입과 턱 설명 출처는 https://pronunciationstudio.com/english-vowel-length/ , https://new.scielo.br/j/ides/a/BqB9PC3SdS5gwJhS53xR84q/?lang=en

## 연결

- **롱폼**: `Sheep과 Ship, 둘 다 '쉽'으로 읽으셨나요? | 영어 모음 20쌍 반복 듣기` (https://youtu.be/--Ajwp-UvIk, 11/9 밤 11시 공개)
- **눌리는 링크**: 스튜디오의 "관련 동영상"에 위 롱폼을 지정한다. 쇼츠의 설명란과 댓글 링크는 눌리지 않는다.
- **마지막 5초 안내**: 말, 아래를 가리키는 손 그림(`cta_hand`), 롱폼 썸네일을 함께 넣는다. 유튜브 공식 블로그의 권장 사항이고 효과 수치는 없다(https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/). 공개 뒤 롱폼 유입 경로 `SHORTS_CONTENT_LINKS`로 확인한다.
- **설정 시점**: 관련 동영상은 공개나 일부 공개 영상만 고를 수 있어 11/9 밤 11시 이후에 지정한다. 고급 기능 권한이 필요하다(https://support.google.com/youtube/answer/14075157).

## 사람이 만든 흔적

넣지 않는다. 이유: 실제 시청자 댓글 7개 중 이 주제를 다룬 것이 없고, 나레이션은 사용자가 직접 생성하기로 했다(2026-11-07).

## 화면과 음성

- **스타일 제안**: 웜크림 네오브루탈리즘(옵션 1). 흰 카드 안에 그림을 넣어 그림을 다시 만들지 않고도 배경색을 바꿀 수 있다.
- **아바타**: 쓰지 않는다.
- **원어민 음성**: 한 문제 안에서는 같은 목소리를 쓴다. 후보 문서의 남녀 교차는 목소리로 답을 맞힐 수 있어 바꿨다. 첫째·둘째 문제는 남성, 셋째 문제는 여성이다. 남성 `m_w24_fill`은 실제 소리가 0.16초뿐이라 썼다가 바꿨다.
- **업로드**: `status.json`을 `ready_to_upload`로 두지 않고 스튜디오에서 직접 예약한다.
