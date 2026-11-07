# 팩트 체크 — ep26-shorts-right-light

확인일: 2026-11-07. 수정안은 같은 날 사용자가 승인했고 `SCRIPT.md`에 반영했다. 줄 번호는 나레이션 블록 기준이고, 표의 "주장"은 수정 전 문장이다.

## 대본

| 위치 | 주장 | 판정 | 근거 | 조치 |
|---|---|---|---|---|
| 1줄 | 길을 알려 줄 때 쓰는 문장 | 확인됨 | [ESL Gold] "turn left/right at the traffic light" | 유지 |
| 1줄 | 라이트가 두 번 나온다 | 확인됨 | [표기법] right와 light 모두 라이트. 롱폼 제목도 같다. | 유지 |
| 2~3줄 | 두 라이트는 다른 소리 | 확인됨 | [사전] `raɪt`, `laɪt` | 유지 |
| 4줄 | 앞은 오른쪽, 뒤는 신호등 | 확인됨 | [사전] 문장 안의 traffic light가 신호등이다. | 유지 |
| 5줄 | 한글로 둘 다 라이트라고 적다 보니 같게 들린다 | **일부 확인** | [Yu·Jamieson 1993] 한국어가 두 소리를 한 범주로 묶고 표기도 구분하지 않아 못 들을 수 있다고 설명한다. 원인은 적는 법만이 아니다. | 소리 범주로 고쳐 교체 |
| 5줄 교체문 | 우리말에 리을 소리가 하나뿐이라 똑같이 들리기 쉽다 | 확인됨 | [Kim 2007] "single liquid phoneme". [Yu·Jamieson 1993] 같은 범주. 다만 [Kim 2007]은 한국인도 차이를 어느 정도 느낀다고 보고한다. | "쉽습니다"로 단정 피함 |
| 6~7줄 | 혀끝을 입천장에 대지 않으면 R | 확인됨 | [Ahn 2001] r은 잇몸에 닿지 않고 뒤쪽(velum)에만 닿았다. | "혀끝"으로 한정 |
| 8줄 | 혀끝을 윗니 뒤 잇몸에 붙이면 L | 확인됨 | [Ahn 2001] clear l은 40회 모두 잇몸에 닿았다. | 단어 맨 앞 L만 다룸 |
| 10줄 | 짝단어 스무 쌍 | 일부 확인 | 롱폼 음성 파일 40개, 20쌍. 그중 run·learn은 R과 L 외에 모음도 다르다. | 쇼츠 문구 유지, 완성된 롱폼은 사용자 결정으로 재렌더링하지 않음 |

## 화면과 프롬프트

| 위치 | 주장 | 판정 | 근거 | 조치 |
|---|---|---|---|---|
| 화면 | right `raɪt`, light `laɪt` | 확인됨 | [사전] 사전에 따라 `ɹaɪt`로도 적는다. | 유지 |
| 뱃지 | `허공 0%`, `잇몸 100%` | 일부 확인 | [Ahn 2001] 맨 앞 L과 맞다. 숫자는 비유이고 단어 끝 L에는 맞지 않는다. | 맨 앞 L에만 사용 |
| 프롬프트 1 | 우회전하는 차, 우측 통행, 가로형 신호등 | 확인 안 됨 (시청자에게 말하지 않음) | 가로형이 흔하다는 자료를 찾아보지 않았다. 화면 글자나 나레이션에 나오지 않는다. | 유지 |
| 프롬프트 2 | R은 혀끝이 떠 있고, L은 잇몸에 닿음 | 확인됨 | [Ahn 2001] | 생성 후 그림 대조 필요 |

## 운영 정보

| 위치 | 주장 | 판정 | 근거 | 조치 |
|---|---|---|---|---|
| BRIEF | 쇼츠 길이별 평균 시청률 | 확인됨 | YouTube Analytics API 2026-11-07 재측정 | 유지 |
| BRIEF | 경쟁 영상 댓글의 R·L 고민 | 확인됨 | `data/youtube/audience-dna.json` 원문 | World 고민이라 참고만 |
| BRIEF | 롱폼 제목 | 확인됨 | `title.txt` | 유지 |
| BRIEF | 롱폼 11/16 공개 예정 | 일부 확인 | 월·목 규칙. 아직 업로드 전이다. | 사용자가 올려야 성립 |
| BRIEF | 설명란·댓글 링크, 관련 동영상 조건 | 확인됨 | [Tubefilter], [고객센터] | 유지 |
| 장면 13 | 마지막 5초에 말, 손 그림, 썸네일로 링크를 안내한다 | 확인됨 | [YouTube 블로그] 권장 사항이다. 효과 수치는 없어 클릭이 는다고 말할 수 없다. | 적용, 공개 후 유입 경로로 확인 |

## 음성 파일 (제가 들을 수 없어 사용자 청취 필요)

| 파일 | whisper | 실제 소리 길이 | 판정 |
|---|---|---|---|
| `dial_01_right_light` | Turn right at the traffic light. | 1.89초 | 내용 일치 |
| `m_w01_right` | Right | 0.41초 | 내용 일치 |
| `m_w02_light` | Light | 0.44초 | 내용 일치 |

whisper가 맞게 적어도 R과 L이 또렷하게 다르게 들리는지는 알 수 없다. 이 쇼츠의 전제이므로 사용자가 듣고 확인한다.

**나레이션 (2026-11-07 받은 파일)**: 대본 문장은 모두 있다. "라이트"가 영어 Right로, "리을"이 "리얼"로 인식돼, 한글 그대로 읽었는지 사용자가 듣고 판단한다.

**1차 그림 (2026-11-07)**: `pair_right_light`는 차가 꺾는 모습이 아니고 신호등에 왼쪽 화살표 칸이 있다. `tongue_free_touch` 아래 칸은 혀가 잇몸이 아니라 윗니 뒤쪽에 닿아 8줄 설명과 어긋난다(판정: 틀림). 프롬프트를 고쳤고 다시 만든다.

## 출처

- [사전]: https://api.dictionaryapi.dev/
- [표기법]: https://korean.go.kr/kornorms/regltn/regltnView.do?regltn_code=0003 (조항을 단어에 적용한 것은 Claude다)
- [ESL Gold]: https://eslgold.com/speaking-4/giving_directions/
- [Yu·Jamieson 1993]: https://jcaa.caa-aca.ca/index.php/jcaa/article/view/797
- [Kim 2007]: https://icphs2007.de/conference/Papers/1257/index.html
- [Ahn 2001]: https://koreascience.kr/article/JAKO200115637241334.page?lang=en
- [Tubefilter]: https://tubefilter.com/2023/08/10/youtube-shorts-comments-spam/
- [고객센터]: https://support.google.com/youtube/answer/14075157?hl=en
- [YouTube 블로그]: https://blog.youtube/creator-and-artist-stories/youtube-related-videos-traffic-guide/
