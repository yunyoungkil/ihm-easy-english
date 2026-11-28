// EP38 비교 시트(4판, 롱폼) 조립. 컷 시각은 대본 길이로 계산(초당 한글 4.2자 + 영어 단어 1.2초 + 쉼).
import fs from 'node:fs';
import path from 'node:path';
const repo = 'c:/Users/yunyo/.gemini/antigravity-ide/scratch/ihm-easy-english';
const ID = 'ep38-long-words-beats';
const IMG = `images/${ID}`;
const hangul = (s) => (String(s).match(/[가-힣]/g) || []).length;

// [이미지, 틀, 움직임, 대본, 영어 음성, 쉼(초), 화면 여유(초)]
const C = [
  ['cut-00-hook', 'label-stall', '펜 끝이 INSTRUCTIONS를 왼쪽부터 한 글자씩 짚고, 짚은 글자만 노랗게 켜지다 다섯째 글자에서 멈춘다(펜 사각 소리 5번, 멈춘 뒤 0.6초 정적). 뒷글자는 흐린 회색.', '상자 뒷면 보시면 이런 영어 단어 꼭 하나씩 있잖아요. 알파벳은 다 아는 글자인데, 막상 읽으려고 하면 어디서 끊어야 할지 몰라서 입이 그냥 멈춰 버리죠. 세어 보면 글자가 열두 개나 되거든요.', [], 0, 2],
  ['cut-01-three-claps', 'beat-dots', '사진이 어두워지며 라벨 카드가 앞으로 뜬다. 첫 문장 뒤 원어민 instructions 한 번 → 단어 아래 박자 점 세 개가 손뼉 소리 세 번에 맞춰 하나씩 켜짐. 글자는 아직 접지 않는다(셋째 장에서 접음). 둘째 문장부터는 점이 켜진 채로.', '근데 이 단어, 소리 내서 읽어 보면 손뼉 세 번이면 끝납니다. 손뼉 한 번에 소리 한 덩어리씩, 이걸 오늘은 그냥 쉽게 박자라고 부를게요. 오늘은 긴 단어를 몇 박자로 끊는지만 같이 해 볼 거고요, 덩어리마다 정확한 소리는 원어민 소리로 들려 드릴게요.', ['instructions'], 0, 1],
  ['cut-02-quiz', 'split-quiz', '검정·종이색 반반 화면이 가운데서 갈라지며 열린다. 글자 수 칩만 보이고 박자 칸은 물음표. 3초 동안 칩의 물음표가 천천히 깜빡.', '자, 하나만 먼저 맞혀 보세요. 왼쪽은 아홉 글자, 오른쪽은 여섯 글자인데요. 손뼉을 더 많이 치는 쪽은 어느 쪽일까요?', [], 3, 0.5],
  ['cut-03-quiz-answer', 'split-answer', 'banana 아래 점 셋이 먼저(원어민 음성에 맞춰), 그다음 "그럼 왼쪽은" 뒤 strengths 원어민 음성과 함께 빨간 점 하나가 "툭" 떨어진다.', '오른쪽 바나나는 아마 바로 나오실 거예요. 영어로도 손뼉 세 번이죠. 그럼 왼쪽은 어떨까요? 네, 딱 한 번. 글자는 아홉 개나 써 놨는데 박자는 하나예요.', ['banana', 'strengths'], 0, 0.5],
  ['cut-04-idea', 'idea-loop', 'IDEA 한 단어만 크게. 원어민 음성 뒤 점 세 개가 켜지고 빨간 손글씨 물음표가 그려진다. 뒤 두 문장 동안 STRENGTHS(9)·BANANA(6)·IDEA(4) 칩이 글자 수 순서와 박자 수 순서로 한 번씩 자리를 바꾼다(따로 노는 것을 눈으로).', '반대로 이번 건 글자가 네 개밖에 없습니다. 근데 손뼉은 세 번이에요. 좀 이상하죠? 우리가 긴 단어 앞에서 자꾸 멈추는 게, 알파벳을 한 글자씩 눈으로 따라가다 보니까 끝이 안 보여서 그런 건데, 이렇게 글자 수랑 손뼉 수가 안 맞는 단어가 은근히 많아요. 이 단어는 이따가 다시 꺼내 볼게요.', ['idea'], 0, 1],
  ['cut-05-vowels', 'vowel-strip', '흐린 마트 진열대 위로 모음 띠(A·E·I·O·U + 손글씨 y)가 내려와 화면 위쪽에 붙는다. 작은 걸음 표시가 왼쪽 위에 들어온다.', '그럼 박자는 어떻게 세느냐. 박자마다 모음이 꼭 하나씩 들어가 있거든요. 그래서 처음 보는 단어가 나오면 모음부터 찾습니다. 화면 위에 있는 이 다섯 글자가 영어 모음이고요, 단어 맨 끝에 오는 와이도 모음처럼 쳐 줘요.', [], 0, 1],
  ['cut-06-strawberry', 'marker-circle', '빨간 마커가 A → E → Y 순서로 동그라미를 직접 그린다(선 그리기 0.4초씩, 사각 펜 소리). 손글씨 "1·2·3"이 따라 붙는다.', '마트에서 많이 보는 딸기 과자 봉지, 여기 적힌 이 단어도 열 글자예요. 모음에 동그라미를 한번 쳐 볼게요. 하나, 둘, 셋. 들어 보면 손뼉도 딱 세 번 칩니다.', ['strawberry'], 0, 0.5],
  ['cut-07-toothpaste', 'marker-group', 'OO를 동그라미 하나로 크게 묶고, A에 동그라미, 끝 E에는 마커로 쓱 긋는 줄. "몇 개 남죠?" 뒤 2초 비운 뒤 점 두 개.', '이번엔 욕실에 있는 치약이요. 이것도 열 글자인데, 여기 보시면 모음 두 개가 나란히 붙어 있죠? 이렇게 붙어 있으면 따로 세지 않고 동그라미 하나로 같이 묶어 줍니다. 이걸 모음 덩어리라고 할게요. 그리고 맨 끝에 붙은 알파벳 이는 보통 소리가 안 나거든요. 이건 빼고 세는 거고요. 동그라미 몇 개 남았죠? 두 개.', ['toothpaste'], 2, 0.5],
  ['cut-08-stress', 'stack-rise', 'STRAW / BER / RY 세 줄이 쌓인 채로, 원어민 음성의 힘주는 순간에 STRAW 줄만 노란 띠와 함께 1.18배로 솟는다(천천히 1회 → 보통 1회).', '박자를 셌으면 그다음은 진짜 간단해요. 그중에 하나만 세게 읽어요. 나머지는 힘 빼고 작게. 들어 보시면 맨 앞 덩어리만 쑥 올라가고, 뒤는 작게 따라붙죠.', ['strawberry', 'strawberry'], 0, 0.5],
  ['cut-09-instructions-count', 'marker-box', '첫 장면의 그 상자로 돌아온다. I·U에 빨간 동그라미, 끝 TION은 파란 네모로 묶음 → 점 셋.', '이제 처음에 막혔던 그 상자 단어로 돌아가 볼게요. 맨 끝 에스는 박자랑 상관없으니까 놔두고, 그 앞에 네 글자 보이시죠? 이 네 글자 묶음, 이게 대부분 션이라고 읽힙니다. 이 소리는 저희 채널 다른 영상에서도 한 번 다뤘었고요. 그래서 이건 네모 하나로 묶고, 앞에 모음 동그라미 두 개까지 합치면 박자는 셋이 됩니다.', [], 0, 0.5],
  ['cut-10-instructions-stress', 'stack-guess', '열두 글자가 IN / STRUC / TIONS 세 줄로 접히며 쌓인다(셋째 장의 핵심 장면). 3초 동안 어느 줄도 솟지 않고 기다렸다가, 원어민 음성에 맞춰 STRUC만 솟는다. 오른쪽에 요령 카드.', '세 박자 중에 어디를 세게 읽을까요? 가운데. 사실 힘주는 자리는 단어마다 달라서 규칙 하나로 다 맞히긴 어려운데요, 그래도 잘 맞는 게 하나 있어요. 끝에 션이 붙은 단어는 그 바로 앞 박자에 힘이 갑니다.', ['instructions'], 3, 0.5],
  ['cut-11-conditioner', 'stack-and-guess', '린스 병 위 CON / DI / TION / ER 쌓기(DI 솟음) → 오른쪽 VACATION 카드의 빈 점 세 개와 물음표, 3초 뒤 CA가 노랗게.', '린스 통에 있는 이 단어도 한번 볼까요? 박자는 넷인데, 역시 션 바로 앞이 세게 나오죠. 이 단어는요? 네, 여기도 션 바로 앞입니다. 그래도 처음 보는 단어는 휴대폰 사전에서 스피커 버튼 한두 번 눌러서 어디가 세게 나오는지 들어 보세요.', ['conditioner', 'vacation'], 3, 0.5],
  ['cut-12-ingredients', 'flex-split', '과자 봉지 뒷면. 동그라미 셋을 친 뒤, IE를 묶은 동그라미가 가운데서 "쩍" 갈라져 두 개가 된다 → IN · GRE · DI · ENTS.', '이번엔 과자 봉지 뒷면에 꼭 있는 단어예요. 원재료라는 뜻이죠. 모음에 동그라미를 치면 셋이 나옵니다. 뒤쪽에 모음 두 개가 붙어 있어서 아까 한 대로 하나로 묶었거든요. 근데 이걸 손뼉 세 번에 맞춰 읽어 보면 입에 잘 안 붙어요. 그럴 땐 묶었던 모음을 다시 떼어 봅니다. 여기 붙어 있던 이 두 개를요. 들어 보시면 손뼉이 네 번이죠?', ['ingredients'], 0, 0.5],
  ['cut-13-idea-again', 'loop-close', '첫째 장의 IDEA가 다시 등장해 원어민 음성에 맞춰 I · DE · A로 갈라진다(첫째 장 물음표가 지워짐). "I · DEA(두 박자) ✗ → I · DE · A(세 박자) ✓" 손글씨 표시.', '아까 네 글자에 손뼉 세 번이던 그 단어도 똑같아요. 붙어 있는 모음을 떼서 따로 읽는 거죠.', ['idea'], 0, 0.5],
  ['cut-13b-research', 'research-card', '종이색 카드에 "단어 1만 5천 개" 숫자가 먼저 뜨고, 막대 하나가 절반쯤까지만 차오른다("흔히 가르치는 끊기 규칙 → 두 박자 단어에서 절반쯤"). 마지막 두 마디에 맞춰 IDEA 카드의 모음이 두 번 바뀌는 손글씨 표시. 아래 작은 출처 글씨.', '사실 미국에서 단어 1만 5천 개쯤을 놓고 조사한 연구가 있는데요, 흔히 가르치는 단어 끊는 규칙 하나가 두 박자 단어에서 절반쯤만 맞더래요. 그러니까 어색하면 모음 하나 바꿔서 한 번 더, 그래도 어색하면 또 한 번.', [], 0, 0.5],
  ['cut-14-basket', 'basket-grid', '세제·영양제·로션·약국 네 장면이 2×2로 한꺼번에 깔렸다가 하나씩 앞으로 나온다. 가운데 노란 칩.', '자, 이제 직접 한번 해 보세요. 단어가 하나씩 나오면 모음에 동그라미부터. 3초씩 드릴게요.', [], 0, 0.5],
  ['cut-15-detergent', 'basket-reveal', '세제 통 라벨 DETERGENT, 3초 비움 → 동그라미 셋 → de · TER · gent + 원어민 음성 → 나레이션 → 따라 읽기 2초(화면 아래 "따라 읽기" 점 2개가 차례로 켜짐).', '세제 통 단어였어요. 박자 셋, 가운데가 세게 나옵니다. 한번 따라 읽어 보세요.', ['detergent'], 5, 0.5],
  ['cut-15b-supplement', 'basket-reveal', '영양제 통 라벨 SUPPLEMENT, 3초 비움 → 동그라미 셋 → SUP · ple · ment + 원어민 음성 → 나레이션 → 따라 읽기 2초. 세제 카드와 나란히 작게 놓아 힘주는 자리가 다른 것을 보여 줌.', '영양제 통 라벨. 이것도 박자는 셋인데요, 이번엔 맨 앞이 세게 나와요. 방금 세제랑 힘주는 자리가 다르죠?', ['supplement'], 5, 0.5],
  ['cut-15c-moisturizer', 'basket-reveal', '로션 병 MOISTURIZER, 3초 비움 → OI를 동그라미 하나로 묶고 U·I·E 동그라미, 모두 넷 → MOIS · tur · iz · er + 원어민 음성 → 나레이션 → 따라 읽기 2초.', '이번엔 로션 병. 앞쪽에 붙어 있는 모음 두 개는 하나로 묶으니까, 동그라미는 모두 네 개예요. 제일 세게 나오는 건 맨 앞 덩어리고요.', ['moisturizer'], 5, 0.5],
  ['cut-16-pharmacy', 'basket-reveal-last', '저녁 약국 간판 자리에 PHARMACY, 3초 비움 → 동그라미 셋 → PHAR · ma · cy.', '마지막은 약국 간판이에요. 박자 셋. 끝에 붙은 와이도 한 박자로 쳐 줘요.', ['pharmacy'], 3, 0.5],
  ['cut-17-return', 'loop-return', '첫 장면과 같은 상자. 이번엔 펜이 글자를 짚지 않고, 원어민 음성에 맞춰 박자 점 세 개만 빨갛게 켜진다(첫 장면과 나란히 놓이는 대비).', '처음에 펜이 다섯째 글자에서 멈췄던 단어죠. 이번엔 글자를 짚지 말고, 박자로만 같이 읽어 볼게요.', ['instructions'], 0, 1],
  ['cut-18-refrigerator', 'honest-exception', 'REFRIGERATOR 한 단어, 점 다섯이 하나씩. 과장 없이 담백한 정지 화면.', '근데 긴 단어라고 다 박자가 적은 건 아닙니다. 냉장고는 열두 글자에 박자가 다섯 개나 되거든요. 그래도 글자 열두 개를 하나하나 따라가는 것보다는 손뼉 다섯 번이 훨씬 낫잖아요.', ['refrigerator'], 0, 0.5],
  ['cut-19-one-page', 'one-page', '한 장 정리 카드(종이색, 앞 화면과 같은 무드) — 4초 무음(멈춰서 캡처할 수 있게) 뒤 댓글 질문 낭독.', '집에 영어가 적힌 라벨 하나만 골라서 동그라미부터 쳐 보세요. 몇 박자 나왔는지 단어랑 같이 댓글로 남겨 주시면, 다음 영상 만들 때 참고하겠습니다.', [], 4, 0],
  ['cut-20-end', 'end-screen', '엔드 화면 10초 — 끝 화면 두 칸 자리만 비워 둠.', '', [], 10, 0],
];
let t = 0;
const cuts = C.map(([img, template, motion, narration, voiceEn, pause, pad]) => {
  const d = hangul(narration) / 4.2 + voiceEn.length * 1.2 + pause + pad;
  const cut = { t: Math.round(t), template, image: `${IMG}/cuts/${img}.jpg`, motion };
  if (narration) cut.narration = narration;
  if (voiceEn.length) cut.voiceEn = voiceEn;
  t += d;
  return cut;
});
const duration = Math.round(t);
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const at = (i) => mmss(cuts[i].t);

const titles = [
  '긴 영어 단어, 여태 한 글자씩 읽으셨나요? | 영어 단어 읽는법',
  '알파벳은 다 아는데, 영양제 통 영어는 왜 안 읽힐까요? | 영어 단어 읽는법',
  '글자가 많으면 더 오래 읽어야 할까요? | 영어 단어 읽는법 왕초보',
];
const thumbs = [`${IMG}/thumb-A.jpg`, `${IMG}/thumb-B.jpg`, `${IMG}/thumb-C.jpg`];

const sheet = {
  schemaVersion: 4,
  episodeId: ID,
  sourceVideoId: 'J28QuPqOCyM',
  createdAt: '2026-11-28',
  status: 'draft',
  format: 'LONGFORM',
  topic: '긴 영어 단어 앞에서 입이 굳는 이유 — 철자는 열 글자가 넘어도 박자는 서너 개뿐 (모음 덩어리 세기 · 힘주는 박자 하나 · 어색하면 모음 바꿔 보기)',
  audienceBridge: '영양제 통·과자 봉지 뒷면·약 상자에 적힌 instructions·ingredients·supplement 같은 긴 단어 앞에서 한 글자씩 더듬다 멈추는 순간 + "알파벳은 다 아는데 왜 긴 단어만 보면 입이 굳을까?" 빈틈 하나',
  seriesPremise: '연재 가능("긴 단어 박자로 읽기" 1편 생활 라벨 → 2편 뉴스·안내 방송 단어 → 3편 병원·서류 단어). 갈래 ① 보면서 배우는 영상 2편째(EP36 다음).',
  trendRef: { used: false, blend: '순수 본질(트렌드 미채택)', reason: 'next-episode-input.md 13절(2026-11-28 재생성: 어벤져스 둠스데이 예고편·BIGBANG·T1·멸망전, 구글 트렌드 연예·스포츠)과 14절을 검토했다. 화제가 "생활 라벨 속 긴 영어 단어 읽기"와 연결 고리가 없고, 억지로 넣으면 국내 생활 장면(마트·욕실·약국)이 흐려진다. 14절 소형 폭발 중 맞는 것은 연예 클립이 아니라 9988영어(구독 1.36만, 읽기 원리) 쪽이라 그 원리를 썼다.' },
  clipRights: { usesExternalClip: false },
  blindReview: JSON.parse(fs.readFileSync(new URL('./ep38-blind.json', import.meta.url), 'utf8')),
  selfCritique: {
    antiTemplate: 'AI 평균값 버전("영어 읽기 규칙 5가지 총정리" 목록 카드, 칠판에 규칙 나열)과 검색 상위를 차지한 "파닉스 총정리·50분 정주행"(2026-11-28 유튜브 검색 실측: 영어 읽는법·영어 단어 읽는법 상위 8편 대부분 총정리형)을 피했다. 규칙을 나열하지 않고 한 단어(instructions)에서 막혔다가 같은 단어로 돌아오는 고리 하나로 묶었고, 셋째 걸음은 "규칙이 절반쯤만 맞는다"는 연구를 정직하게 보여 주며 모음을 바꿔 보게 한다. 대본은 독립 비평가 지적 5가지(박자 정의·알파벳 이름 낭독·중반 맞히기 틈·요약 문장·단정 표현)를 반영한 v2. v3(2026-11-28)는 사용자 지적("번역체, 책을 쓰는 것 같다")과 Gemini 검수로 나레이션을 다시 썼다 — v2는 대본 전에 실제 강사 말 덩어리(next-episode-input 18절)와 대표님 말하기 결 카드를 읽는 단계를 건너뛰어 "~요" 67%(강사 25%)·말버릇 3.7(26.1)/100문장이었다. v3는 9988영어·봄날영어학교 받아쓰기 원문을 옆에 두고 다시 써 해요체 36.7%·합쇼체 18.4%·말버릇 16.3/100문장(check-narration --compare, 크게 벗어난 항목 없음).',
    evolutionFromPrev: '직전 롱폼 EP36(매일 쓰는 단어, 듣기 Before/After)·EP37(30분 틀어 두고 듣기)과 달리 이번 편은 "읽기"가 주제라 귀가 아니라 눈으로 따라가는 화면이 주인공이다. EP36의 자막 OFF 듣기 장치를 반복하지 않고, 처음 막힌 단어로 돌아와 "박자 점만 켜지는" 대비로 끝낸다. 화면 무드도 EP37의 어두운 시네마틱에서 밝은 종이색 라벨 에디토리얼로 바꿨고, 글꼴도 EP37에서 안 쓴 Barlow Condensed(박자 쌓기)·Caveat(마커 숫자)를 골랐다.',
    fusionCheck: '9988영어 J28QuPqOCyM(113.2배) 실제 캡처 6장을 직접 열어 "americano · 모음(뭉치) = 1박자"를 초록 칠판에 천천히 손글씨로 쓰는 속도를 확인했고, 그 속도만 가져와 생활 라벨 위 마커 동그라미로 바꿨다. 봄날영어학교 fX8UnVuhtxU 썸네일의 un|believ|able 덩어리 상자와 핀터레스트 "DIS / CON / NECT" 박자 쌓기 포스터(2026-11-28 격리 브라우저 확인)를 합쳐 썸네일 A·컷 8·10의 쌓기 글자로 만들었다. 다른 분야 사례(1분요리 뚝딱이형 "인간사료" 상황 이름, 프리미어 27 전후 화살표, SNL 클립 핵심 낱말 비우기)는 썸네일 B·A·C에 하나씩 나눠 적용했다.',
  },
  aiRecommendation: {
    title: titles[0],
    thumbnail: thumbs[0],
    thumbnailLabel: 'A안 (첫 장면 상자 사진 위 읽다 멈춘 INSTR·흐린 UCTIONS + 오른쪽 IN / STRUC / TIONS 박자 쌓기, STRUC 노랑 + 왼쪽 아래 검정 띠 "12글자인데 / 손뼉 세 번")',
    reason: '우리 롱폼 가운데 노출 2,148회로 클릭률 4.28%가 나온 유일한 읽기 편(ROks87qezuU)의 "여태 ~ 읽으셨나요?"(내가 해 온 읽기를 뒤집는 질문)를 제목 1안에 쓰고, 검색어 "영어 단어 읽는법"(유튜브 자동 완성·검색 결과 확인)을 뒤에 붙였다. 썸네일 A는 제목이 묻는 "한 글자씩"의 결과(12글자 → 손뼉 세 번)를 한 장의 전후로 보여 줘 제목과 겹치지 않는다(프리미어 27 전후 화살표 원리). 작은 표본이라 세 쌍을 모두 유튜브 테스트에 건다.',
    alternative: '생활 장면 앵커를 시험하려면 B안(영양제 병 + SUPPLEMENT + 시청자 질문 "어디서 끊어 읽어요?") + 제목 2안. 퀴즈 호기심을 시험하려면 C안(STRENGTHS 9글자 vs BANANA 6글자, "손뼉이 더 많은 쪽은?", 답 없음) + 제목 3안.',
  },
  testVariables: [
    { variable: '포장 — 생활 라벨 앵커 + "내가 해 온 읽기 뒤집기" 제목(약속형 제목 대신)', hypothesis: '같은 읽기 소재라도 우리 약속형 제목("혀의 지름길" 7일 4회, "-sion 하나만 알면 100개" 6회)은 실패했고 "여태 스펠링 다 읽으셨나요?"(ROks87qezuU)만 노출 2,148회·클릭률 4.28%가 나왔다(각 1편, 작은 표본 가설). 경쟁 9988영어 J28QuPqOCyM(113.2배)도 썸네일에 "간판 메뉴"라는 생활 쓰임새를 내세웠다. 그래서 생활 라벨 앵커 + 뒤집기 질문이면 최근 두 소리 구별 롱폼(0.74~1.41%)보다 클릭률이 롱폼 중앙값 3.37% 이상으로 오를 것이다.', measure: '공개 7일 노출 클릭률(ctr7d)·노출수(impressions7d)·7일 조회(views7d) — 세 쌍 A/B 결과는 노출이 모자라면 "가설"로만 기록' },
    { variable: '화면 — 박자 쌓기 글자(Barlow Condensed) + 라벨 위 마커 동그라미 손글씨 속도(밝은 종이색 에디토리얼)', hypothesis: '9988영어 댓글 상위가 "또박또박 천천히 짚어 주는 속도"를 칭찬했고(좋아요 195·114·75, 9988 댓글 분석), 우리 롱폼 가장 큰 이탈은 대부분 첫 5~10초에 있다(10절, 45편 중앙값 5.5초). 첫 장면에서 펜이 짚다 멈추는 동작이 시청자 자신의 막힘을 보여 주면 30초 뒤 남은 비율이 ROks87qezuU(73.9%)에 가까울 것이다.', measure: '30초 뒤 남은 비율·평균 시청 시간(watchSeconds7d)·장별 이탈 구간(retention) — 컷 시각과 맞춰 본다' },
  ],
  glossary: [
    { term: '음절 (syllable)', plain: '박자 — 손뼉 한 번에 소리 한 번' },
    { term: '강세 (stress)', plain: '힘주는 박자 — 세게 읽는 박자 하나' },
    { term: '모음 결합·이중 모음 (vowel team)', plain: '모음 덩어리 — 나란히 붙은 모음을 동그라미 하나로 묶은 것' },
    { term: '모음 바꿔 읽기 (flexing)', plain: '어색하면 모음 소리를 바꿔서 한 번 더 읽어 보기' },
    { term: '초성·받침 (9988영어)', plain: '본편에서는 한글 자모에 1:1로 대지 않는다(채널 규칙) — 박자와 모음만 쓴다' },
  ],
  references: [
    { videoId: 'J28QuPqOCyM', role: '토픽·원리·화면 템포', what: '"모음(뭉치) = 1박자" 원리와, 초록 칠판에 한 단어(americano)를 천천히 손글씨로 쓰며 짚어 가는 속도', reason: '3060 댓글이 칭찬한 것은 화려한 연출이 아니라 "또박또박 천천히 짚어 주는 속도"였다(9988 댓글 분석 2026-11-11, 상위 댓글 70대 시청자). 우리 첫째 걸음과 원리가 같아 그대로 쓰되, 칠판 대신 생활 라벨 위 마커로 바꿔 "내 장바구니 단어"로 옮겼다.', evidence: '9988영어(구독 1.36만), 56.7만 회, 평소 대비 113.2배(outlier-reports/J28QuPqOCyM.json click.titleQuoteVerified) · 캡처 6장 직접 확인 · 댓글 미해결 질문 1위 "긴 단어는 어떻게 끊어 읽나요"', appliedTo: ['cut:6', 'cut:7', 'thumb:A', 'title:3'] },
    { videoId: 'duUjpyC60Xs', role: '시리즈 축', what: '1편이 터진 뒤 "2편(카멜레온 모음 & 자음뭉치)"으로 같은 원리를 넓혀 34일 만에 7.7배', reason: '읽기 원리는 한 편으로 끝나지 않고 연재로 수요가 이어진다는 근거. 우리도 라벨 → 뉴스·안내 방송 → 서류로 넓히는 시리즈 축을 잡았다.', evidence: '9988영어, 3.9만 회, 평소 대비 7.7배(market-demand.json topOutliersByFormat.long, 2026-11-27)', appliedTo: ['cut:19'] },
    { videoId: 'fX8UnVuhtxU', role: '썸네일·화면 장치', what: '썸네일에 un | believ | able을 덩어리 상자로 갈라 보여 주고 "덩어리철자 배우면 긴 영어도 척척 읽어요"', reason: '긴 단어를 덩어리로 가르는 그림 자체가 썸네일의 주인공이 될 수 있다는 근거. 다만 상자 아래 한글 발음(언 빌리~v 어블)은 우리 규칙(한글 억지 쪼개기 금지)에 걸려 빼고, 덩어리를 세로로 쌓는 핀터레스트 포스터 방식과 합쳤다.', evidence: '봄날영어학교(구독 10.7만), 6.4만 회, 평소 대비 3.0배(market-demand.json, 2026-11-27) · 썸네일 직접 확인(hqdefault)', appliedTo: ['thumb:A', 'cut:8', 'cut:10'] },
    { videoId: 'ROks87qezuU', role: '포장(우리 실측)', what: '"여태 스펠링 다 읽으셨나요?" — 시청자가 해 온 읽기 습관을 뒤집는 질문형 제목', reason: '우리 읽기 소재 롱폼 가운데 노출이 1,000회를 넘고 클릭률이 4%를 넘은 유일한 편. 같은 소재의 약속형 제목은 노출 69회에서 멈췄다(AcNSDMpkR_A).', evidence: '우리 채널, 노출 2,148회·클릭률 4.28%(스튜디오 90일 2026-08-29~11-27), 90일 조회 195회·구독 7명(/api/sync 2026-11-28), 1편이라 가설', appliedTo: ['title:1'] },
    { videoId: 'VpMMfsT2NBA', role: '생활 앵커', what: '"영어 간판 읽기 / 영어 표지판 읽기 / 생활에 꼭 필요한 영어 읽는 법" — 생활 속 단어 하나(Caution)를 크게', reason: '3060에게 읽기가 필요한 자리는 교과서가 아니라 생활 속 표지·라벨이라는 근거. 간판은 이미 이 채널이 차지해서 우리는 영양제·과자 봉지·욕실 라벨로 옮겼다.', evidence: '본즈 기초 영어(구독 28.4만), 18.5만 회, 평소 대비 4.2배(market-demand.json, 2026-11-27)', appliedTo: ['title:2', 'thumb:B', 'cut:14'] },
  ],
  rejected: [
    { what: '썸네일 문구 "영어 간판 메뉴 읽는법"을 그대로', fromVideoId: 'J28QuPqOCyM', reason: '"간판 읽기"는 9988영어·본즈 기초 영어가 같은 문구로 여러 편 차지했다(본즈 간판 4편 8.9만~18.5만 회). 같은 말로 겨루면 묻힌다 → 생활 라벨로 장소를 옮김.' },
    { what: '칠판 손글씨만으로 화면 전체를 채우기', fromVideoId: 'J28QuPqOCyM', reason: '속도는 가져오되, 칠판만 보이는 정지 화면은 우리 강점(생활 장면·글자 움직임)을 버린다. 손글씨는 라벨 위 마커 동그라미로만 쓴다.' },
    { what: '덩어리 아래 한글 발음 적기("언 빌리~v 어블")', fromVideoId: 'fX8UnVuhtxU', reason: '채널 규칙(한글 발음 억지 쪼개기 금지). 박자 점과 원어민 음성으로 대신한다.' },
    { what: '영어 소리를 한글 초성·받침에 1:1로 대기', fromVideoId: 'J28QuPqOCyM', reason: '채널 규칙(한글 자음 1:1 억지 대입 금지). 박자·모음만으로 설명한다.' },
    { what: '잘못 끊어 읽으면 생기는 엉뚱한 뜻을 캐릭터로 보여 주기', fromVideoId: '1pdnyUemyRM', reason: '재미는 있지만 긴 생활 단어는 잘못 끊으면 민망하거나 엉뚱한 낱말이 생길 위험이 있고, 이번 편의 한 줄(글자 말고 박자)에서 벗어난다.' },
  ],
  rows: [
    {
      key: 'title', origin: 'mixed',
      originReason: '1안은 우리 실측(ROks87qezuU "여태 ~ 읽으셨나요?") + 실제 검색어, 2안은 본즈 기초 영어 생활 앵커를 우리 장소(영양제 통)로 옮기고 9988영어 본편 첫머리의 실제 강사 말("알파벳을 알아도 어떻게 읽을지 애매할 때가 많습니다", 받아쓰기 원문 2026-11-28)을 입말로 앞에 뒀다(댓글 원문에는 "알파벳 다 아는데" 표현이 없음 — AI 댓글 분석이 만든 예상 질문이라 근거로 쓰지 않음), 3안은 9988영어 "이렇게 쉽다고?"처럼 질문 하나로 퀴즈(글자 수 vs 박자)의 답을 비워 뒀다. v2의 2·3안("뜻 말고 소리부터", "글자 말고 박자로")은 "A 말고 B" 틀과 약속형 띠지 문구라 바꿨다(2026-11-28 사용자 지적·Gemini 검수). 검색어는 2026-11-28 유튜브 자동 완성(영어 읽는법 왕초보·영어 단어 읽는법)과 검색 결과로 확인.',
      competitor: { text: 'J28QuPqOCyM: "이렇게 쉽다고? 영어 읽는 법 (박자.초성.받침)" / fX8UnVuhtxU: "긴 단어를 쉽고 빠르게 읽는법 덩어리철자 공부 | 왕기초 영어 단어 읽기 수업 | 봄날영어학교" / VpMMfsT2NBA: "영어 간판 읽기 / 영어 표지판 읽기 / 생활에 꼭 필요한 영어 읽는 법 / 기초 영어 파닉스"', quote: '이렇게 쉽다고? 영어 읽는 법 (박자.초성.받침)' },
      ours: { text: '뒤집기 질문 · 생활 장소 속 시청자 말 · 퀴즈 질문 — 서로 다른 끌림 장치 3안. 세 안 모두 검색어(영어 단어 읽는법 / 영어 읽는법)를 뒤쪽에 둔다. 우리 채널 검색 유입 1위는 "영단어"(203회, 3절)라 "영어 단어"를 앞쪽 낱말로 둔다.', titles },
      clickWhy: [
        { source: 'ROks87qezuU', sourceText: '여태 스펠링 다 읽으셨나요? K, B, W 소리 안 나는 진짜 이유 | 묵음 파닉스', mechanism: '"여태"가 내가 오래 해 온 습관을 건드리고, 질문이라 답을 확인하고 싶게 만들었다(우리 읽기 편 유일한 4%대 클릭률, 1편 가설).', appliedTo: ['title:1'] },
        { source: 'VpMMfsT2NBA', sourceText: '영어 간판 읽기 / 영어 표지판 읽기 / 생활에 꼭 필요한 영어 읽는 법 / 기초 영어 파닉스', mechanism: '공부 이름 대신 "내가 매일 보는 곳"을 제목에 둬서, 영어 공부 생각이 없던 사람도 "나 저거 못 읽는데"로 멈춘다. 2안은 영양제 통을 그 자리에 넣었다.', appliedTo: ['title:2'] },
        { source: 'J28QuPqOCyM', sourceText: '이렇게 쉽다고? 영어 읽는 법 (박자.초성.받침)', mechanism: '첫 마디를 질문으로 열고 답은 영상에 남겨 뒀다. 3안 "글자가 많으면 더 오래 읽어야 할까요?"도 누구나 "그렇겠지"라고 답할 질문을 던지고, 아니라는 답(9글자 1박자)은 썸네일 C의 퀴즈와 본편에 남긴다.', appliedTo: ['title:3'] },
      ],
      pairing: [
        { title: 'title:1', thumb: 'thumb:A', thumbDoes: '읽다 멈춘 INSTR + 오른쪽 IN / STRUC / TIONS 쌓기 = "12글자인데 손뼉 세 번"의 결과를 한 장에', titleDoes: '"여태 한 글자씩 읽으셨나요?"로 시청자 습관을 묻고 이유는 비워 둔다 + 검색어' },
        { title: 'title:2', thumb: 'thumb:B', thumbDoes: '영양제 병 사진 + 크게 세운 SUPPLEMENT(모음 동그라미 셋) + 시청자 질문 "어디서 끊어 읽어요?"', titleDoes: '"알파벳은 다 아는데 왜 안 읽힐까요?"로 이유를 묻고, 썸네일은 "어디서 끊느냐"를 물어 둘이 같은 말을 반복하지 않는다' },
        { title: 'title:3', thumb: 'thumb:C', thumbDoes: 'STRENGTHS 9글자 vs BANANA 6글자 + "손뼉이 더 많은 쪽은?" — 답 없음', titleDoes: '"글자가 많으면 더 오래 읽어야 할까요?"로 누구나 할 짐작을 꺼내고, 짐작이 틀린다는 답(9글자 1박자)은 말하지 않는다' },
      ],
      why: '우리 실패 제목("영어 노베이스도 첫날부터 단어가 술술 읽히는 혀의 지름길", 7일 4회)은 약속만 크고 장면·질문이 없었다. 세 안 모두 사람이 실제로 할 법한 질문으로 쓰고(약속·대구 없음), 장면(한 글자씩 읽는 나 / 영양제 통) 또는 짐작(글자가 많으면 오래)을 앞에 뒀다.',
    },
    {
      key: 'thumbnail', origin: 'mixed',
      originReason: 'A는 봄날영어학교 덩어리 상자 + 핀터레스트 박자 쌓기 포스터 + 프리미어 27 전후 원리, B는 9988영어·본즈의 생활 쓰임새 앵커와 9988 댓글 미해결 질문 1위("긴 단어는 어떻게 끊어 읽나요")를 짧은 입말 질문으로, C는 SNL 클립(핵심 낱말 비우기)을 우리 소재로 옮겼다. v2의 B("라벨 울렁증", 병에 평평하게 얹은 SUPPLEMENT)는 억지 조어·200px에서 안 읽힘으로 다시 만들었다(Gemini 검수 2026-11-28). 사진은 AI 스튜디오 Nano Banana 2.1(글자 없이), 글자·동그라미는 코드 합성. 200px·흑백 미리보기 raw/thumb-check-200px.jpg.',
      competitor: { text: 'J28QuPqOCyM: 나이테 나무 바탕 + 흰 글씨 "영어 간판 메뉴 읽는법"(5단어) / fX8UnVuhtxU: un | believ | able 덩어리 상자 + 한글 발음 + "덩어리철자 배우면 긴 영어도 척척 읽어요" + 강사 / VpMMfsT2NBA: "영어 표지판 읽기" + 큰 Caution + "주의하세요"', images: ['thumb:J28QuPqOCyM', 'thumb:fX8UnVuhtxU', 'thumb:VpMMfsT2NBA'] },
      ours: { text: '서로 다른 끌림 장치·구도 3장(1280×720): A 전후 한 장(왼쪽 상자 사진 위 읽다 멈춘 INSTR·흐린 UCTIONS → 오른쪽 IN / STRUC / TIONS 쌓기, 왼쪽 아래 검정 띠 한 덩어리 "12글자인데 / 손뼉 세 번" — 오른쪽 포스터와 같은 띠 결) / B 생활 장면 + 질문(오른쪽 영양제 병 사진, 왼쪽 어두운 자리에 크게 세운 SUPPLEMENT와 모음 동그라미 셋, 노란 "어디서 / 끊어 읽어요?") / C 맞대기 퀴즈(짙은 남색 바탕 위아래: 위 흰 STRENGTHS 9글자 vs BANANA 6글자, 아래 가로 빨간 띠에 흰 "손뼉이 더 많은 쪽은?", 답 없음 — A의 좌우 반반·종이색·검정 띠·노랑과 다른 틀과 색). 오른쪽 아래(재생 시간 자리)는 모두 비웠다. 글꼴: 영어 Barlow Condensed ExtraBold, 한글 Gothic A1 Black(공용 서랍).', images: thumbs, preview200: `${IMG}/raw/thumb-check-200px.jpg` },
      clickWhy: [
        { source: 'fX8UnVuhtxU', sourceText: 'un believ able / 언 빌리~v 어블 / 덩어리철자 배우면 긴 영어도 척척 읽어요', mechanism: '긴 단어가 덩어리로 갈라지는 그림 하나로 "이렇게 하면 되는구나"를 1초에 보여 줬다.', appliedTo: ['thumb:A'] },
        { source: 'case:premiere27-eddie', sourceText: '프리미어 27 / 이번에 업데이트 / 안하면 후회하는 이유', mechanism: '바뀌기 전과 후를 한 장에 나란히 놓아 "무엇이 달라지길래?"를 켰다.', appliedTo: ['thumb:A'] },
        { source: 'J28QuPqOCyM', sourceText: '영어 간판 메뉴 읽는법', mechanism: '공부 이름 대신 생활 쓰임새(간판·메뉴)를 내세워 "나도 필요하다"를 건드렸다.', appliedTo: ['thumb:B'] },
        { source: 'case:snl-tutor-clip', sourceText: '과외 제자 만났다가 / 여친 앞에서 동공 지진 / (직진 시작)', mechanism: '무엇이 일어났는지 핵심을 비워 두고 보는 사람이 채우게 했다.', appliedTo: ['thumb:C'] },
      ],
      craft: [
        { source: 'case:premiere27-eddie', took: '전후를 한 장에: 왼쪽은 읽다 멈춘 사진(전), 오른쪽은 박자 쌓기 글자(후). 화살표 대신 화면 가르기', appliedTo: ['thumb:A'] },
        { source: 'knowledge/ai-craft-research-2026-11-21.md#썸네일', took: '사진 층(실사 상자·펜)과 그래픽 층(쌓기 글자)을 반반으로 나눠 200px에서 글자가 사진에 묻히지 않게', appliedTo: ['thumb:A', 'thumb:C'] },
        { source: 'knowledge/ai-craft-research-2026-11-21.md#썸네일', took: '글자를 둥근 병 라벨에 얹지 않고(평평하게 떠 보이는 합성 티) 사진 왼쪽 어두운 자리에 크게 따로 세워 200px에서도 SUPPLEMENT가 읽히게', appliedTo: ['thumb:B'] },
        { source: 'knowledge/video-effects-toolbox-2026-11-23.md#B 앵글·숏 크기', took: '영양제 병을 식탁 높이(85mm)에서 잡아 물건이 주인공인 정물 클로즈업', appliedTo: ['thumb:B'] },
        { source: 'case:snl-tutor-clip', took: '답(박자 수)을 비우고 질문만 크게, 두 단어를 맞대기로 세움', appliedTo: ['thumb:C'] },
      ],
      eyeOrder: [
        { candidate: 'thumb:A', first: '노란 띠의 STRUC(오른쪽 가운데, 가장 큰 글자)', second: '왼쪽 아래 검정 띠 "12글자인데 / 손뼉 세 번"', shrink: '사진 속 INSTRUCTIONS는 작고 기울게, 뒷글자는 흐리게. 재생 시간 자리 비움' },
        { candidate: 'thumb:B', first: '왼쪽 위 큰 흰 글자 SUPPLEMENT(빨간 동그라미 셋)', second: '아래 노란 "어디서 / 끊어 읽어요?" → 오른쪽 영양제 병', shrink: '병 라벨은 비워 두고(글자 합성 안 함) 배경 식탁은 흐리게' },
        { candidate: 'thumb:C', first: '양쪽 큰 영어 단어 STRENGTHS · BANANA', second: '아래 빨간 띠 위 흰 "손뼉이 더 많은 쪽은?"', shrink: '글자 수 칩만 작게, 답(박자 점)은 뺌' },
      ],
      why: '첫 읽기 편 시험이라 끌림 장치를 셋으로 나눠 유튜브 썸네일 시험에 건다(작은 표본 규칙, 2026-11-13 사용자 결정). A의 한글은 사진 위 테두리 글씨 대신 검정 띠 한 덩어리로 묶어 200px에서도 대비가 서게 했다. 백지 눈 검수(2026-11-28)에서 B의 붙여 넣은 카드(빈 라벨 목업처럼 보임)와 A·C의 같은 좌우 반반 틀을 지적받아, C는 위아래 + 가로 띠 틀로 바꿨다. Gemini 검수(2026-11-28)에서 B의 억지 조어("라벨 울렁증")·병에 평평하게 뜬 글자·200px에서 안 읽힘, A의 왼쪽 테두리 글씨가 오른쪽 포스터와 결이 따로 노는 것, C의 "박자"가 영상 안 낱말이라 처음 보는 사람에게 낯선 것을 지적받아 B를 다시 만들고 A의 글씨를 검정 띠 한 덩어리로, C의 질문을 "손뼉"으로 바꿨다.',
    },
    {
      key: 'opening', origin: 'mixed',
      originReason: 'ROks87qezuU(30초 73.9%)의 "철자 카드 → 왜?" 뼈대와 9988영어의 "단어 하나를 천천히 써 보는" 시작을, 시청자 자신의 막힘(펜이 짚다 멈춤)으로 바꿨다.',
      competitor: { text: 'J28QuPqOCyM: "반갑습니다. 영어 읽기 할만 하세요. 우선 영어 단어 하나 적어 볼게요." — 칠판에 a부터 천천히 / ROks87qezuU: 철자 카드 세 장을 띄우며 "왜 지워 버렸을까요?"' },
      ours: { text: `0:00 인사·로고 없이 상자 뒷면 INSTRUCTIONS를 펜이 한 글자씩 짚다 다섯째 글자에서 멈춤 → "세어 보면 글자가 열두 개나 되거든요" → ${at(1)} 원어민 소리 + 박자 점 세 개("손뼉 세 번이면 끝납니다") → 박자를 한 줄로 풀고, 이 영상이 무엇을 하는지(발음을 다 외우는 게 아니라 긴 단어를 몇 박자로 끊어 보는 눈, 정확한 소리는 원어민 음성으로 확인) 기대치를 한 번 말함 → ${at(2)} 바로 글자 수 착시 퀴즈. 첫 1분 안에 시청자가 직접 맞혀 보는 틈이 한 번 있다.`, images: [`${IMG}/cuts/cut-00-hook.jpg`, `${IMG}/cuts/cut-01-three-claps.jpg`] },
      why: '롱폼 가장 큰 이탈은 대부분 첫 5~10초(45편 중앙값 5.5초, 10절)라, 설명보다 "나도 이래" 장면을 먼저 두고 답(세 박자)을 소리로 바로 들려준다. 그러나 "어떻게"는 셋째 장(3분대)까지 비워 둔다.',
    },
    {
      key: 'flow', origin: 'mixed',
      originReason: '9988영어 "모음(뭉치) = 1박자"와 영국문화원 5단계(모음 찾기 → 나누기 → 힘 → 이어 말하기), Kearns 연구의 모음 바꿔 읽기를 세 걸음으로 묶은 것은 우리 설계. 독립 비평가 지적으로 -tion을 셋째 장으로 옮겨 첫 단어가 중간에 풀리게 했다.',
      competitor: { text: 'J28QuPqOCyM: 규칙 4가지(박자·초성·받침 등)를 칠판에 차례로 / fX8UnVuhtxU: 덩어리 철자 목록을 차례로', quote: '이렇게 쉽다고? 영어 읽는 법 (박자.초성.받침)' },
      ours: { text: `0:00 막힌 첫 단어 · ${at(2)} 글자 수 착시 퀴즈(strengths·banana·idea) · ${at(5)} 첫째 걸음 모음 덩어리 세기(strawberry·toothpaste) · ${at(8)} 둘째 걸음 힘주는 박자 하나(strawberry → 첫 단어 instructions가 여기서 풀림 → conditioner → vacation 맞히기) · ${at(12)} 셋째 걸음 어색하면 모음 바꿔 보기(ingredients → 첫째 장 idea 고리 닫힘 → 연구 한 줄) · ${at(15)} 장바구니 직접 읽기(detergent·supplement·moisturizer·pharmacy, 단어마다 3초 + 따라 읽기 2초, 단어마다 컷 하나) · ${at(20)} 첫 단어로 돌아가기 · 냉장고 정직한 예외 · 한 장 정리 · 끝 화면 (추정 합계 ${mmss(duration)}).` },
      why: `고리 두 개(첫 단어 instructions, 퀴즈의 idea)를 열어 두고 각각 ${at(9)}·${at(13)}에 닫아 중반 이탈을 줄인다. 맞혀 볼 틈은 ${at(2)}·${at(10)}·${at(11)}·${at(16)}~${at(19)}(여덟 번). 규칙을 나열하지 않고 한 단어로 들어갔다 같은 단어로 나온다. 시간을 채우려고 같은 소리를 더 반복하지 않았다(대본 추정 ${mmss(duration)}).`,
    },
    {
      key: 'visual', origin: 'ours',
      originReason: '생활 라벨 에디토리얼(밝은 종이색 #F4EFE6 · 잉크 검정 · 마커 빨강 · 힘주는 박자 노랑). 장면 사진 9장(AI 스튜디오, 글자 없음) 위에 영어 철자·동그라미·박자 쌓기는 코드로 그렸다(AI 그림은 철자를 틀린다). 참고: 핀터레스트 "syllable typography poster"·"product label typography editorial"·"chalkboard handwriting lettering video"(2026-11-28 격리 브라우저 화면 확인), 연출 자료집 959장면 요약(실사 26장면·글자 표 351장면).',
      competitor: { text: '연출 자료집(959장면·69편) 가운데 읽기 강의형은 글자 표·목록(351장면)과 칠판 손글씨가 대부분이고 실사 생활 사진은 26장면(7편)뿐이다. J28QuPqOCyM 캡처 6장: 나무 제목 화면 → 초록 칠판에 a·americano·"모음(뭉치) = 1박자"를 천천히 손글씨, 화면 전환 거의 없음.' },
      ours: {
        text: `컷 시안 ${cuts.length}장(1280×720, 직접 열어 확인·글자 넘침 0건). 생활 장면 사진(상자·마트·욕실·과자 봉지·세제·영양제·로션·약국) → 그 위 라벨 카드에서 마커가 동그라미를 "그리는" 움직임 → 박자 쌓기 글자가 접히고 힘주는 줄만 솟는 움직임이 번갈아 나온다. 자막 44px(1280 기준, 1920 환산 66px), 영어 단어 96px 이상, 걸음 표시 30px(1920 환산 45px). 마트 사진 옆 봉지에 AI가 지어낸 글자가 있어 블러로 눌렀다.`,
        images: cuts.slice(0, 6).map((c) => c.image),
        cutPlan: { durationSeconds: duration, rhythm: `대본 길이로 잡은 ${cuts.length}컷 / ${mmss(duration)} — 컷 안에서도 동그라미 그리기·쌓기·솟기가 1~3초마다 바뀐다. 짧은 컷(쉼 3초 퀴즈)과 긴 설명 컷(30~40초)이 섞인다.`, cuts },
      },
      why: 'EP37의 어두운 시네마틱과 겹치지 않게 밝은 종이색으로 바꿨고, 읽기 영상이라 글자 움직임이 학습 그 자체가 되게 했다(동그라미 수 = 박자 수가 화면에서 바로 보인다).',
    },
    {
      key: 'reaction', origin: 'ours',
      originReason: '맞혀 볼 틈 여섯 번(퀴즈·힘 위치 두 번·장바구니 네 단어)과 끝 질문은 우리 설계 + 독립 비평가 제안(중반 맞히기 틈).',
      competitor: { text: 'J28QuPqOCyM 댓글: "70대 할머니인데 어른들이 배워도 이해가 돼요"(좋아요 195), 미해결 질문 "긴 단어는 어떻게 끊어 읽나요?"' },
      ours: { text: `① ${at(2)} 글자 수 착시 퀴즈(3초) ② ${at(10)}·${at(11)} "어디에 힘이 갈까요?"(3초씩) ③ ${at(16)}~${at(19)} 장바구니 네 단어(3초씩) ④ 끝: "집에 있는 영어 라벨 하나 골라서 몇 박자였는지 단어랑 같이 댓글에" — 시청자가 고른 단어를 다음 편(뉴스·안내 방송 단어) 근거로 쓴다(08 인사이트).` },
      why: '보면서 배우는 영상이라 손을 쓰게(동그라미 세기) 만들고, 댓글 질문도 "느낌"이 아니라 단어 하나라 답하기 쉽다.',
    },
    {
      key: 'ending', origin: 'ours',
      originReason: '구독·좋아요 하드 CTA 없이, 첫 단어로 돌아와 박자 점만 켜지는 대비 + 냉장고 정직한 예외 + 행동 하나로 닫는다.',
      competitor: { text: 'J28QuPqOCyM: 규칙 정리 뒤 다음 편 예고' },
      ours: { text: `${at(20)} 첫 장면과 같은 상자, 펜 없이 박자 점 세 개 → 냉장고 12글자 5박자(과장 금지) → 한 장 정리 4초(나레이션 없음) → 댓글 질문 → 끝 화면 10초(가운데 두 칸 비움: 왼쪽 ROks87qezuU 묵음 편, 오른쪽 EP36 또는 구독).`, images: [`${IMG}/cuts/cut-17-return.jpg`, `${IMG}/cuts/cut-20-end.jpg`] },
      why: '"긴 단어는 다 박자가 적다"고 과장하지 않아야 다음에 다섯 박자 단어를 만나도 믿음이 남는다. 끝 화면은 같은 읽기 소재 최고작(ROks87qezuU)으로 잇는다.',
    },
    {
      key: 'package', origin: 'ours',
      originReason: '2026-11-28 유튜브 검색(격리 브라우저, 한국어) 실측 12개 태그 중 맞는 10개. 시간표는 대본 추정이라 음성 실측 뒤 다시 맞춘다.',
      ours: {
        text: '설명란에 장 시간표·AI 음성 사용 명시, 고정 댓글에 오늘 단어 열네 개의 박자·힘주는 자리.',
        description: `영양제 통이나 과자 봉지 뒷면, 상자에 적힌 긴 영어 단어. 알파벳은 다 아는데 막상 읽으려면 어디서 끊어야 할지 몰라 입이 멈추죠. 이 영상은 긴 단어를 박자로 끊어 읽는 법을 세 걸음으로 보여 드립니다.\n\n모음 덩어리에 동그라미를 치고, 그중 힘주는 박자 하나를 찾고, 어색하면 모음 소리를 바꿔서 다시 읽어 봅니다. 마지막에는 세제·영양제·로션·약국 단어를 직접 읽어 봐요.\n\n오늘 나온 단어의 박자와 힘주는 자리는 고정 댓글에 적어 뒀어요.\n\n[시간별 목차]\n0:00 상자 뒷면에서 멈춘 입\n${at(2)} 글자 수 착시 퀴즈\n${at(5)} 첫째 걸음: 모음 덩어리 세기\n${at(8)} 둘째 걸음: 힘주는 박자 하나\n${at(12)} 셋째 걸음: 어색하면 모음 바꿔 보기\n${at(15)} 장바구니 직접 읽기\n${at(20)} 처음 그 단어로\n\n참고: British Council LearnEnglish "An easy way to work out how to pronounce new words" / Kearns, D. M. (2020). Does English Have Useful Syllable Division Patterns? Reading Research Quarterly.\n\n이 영상의 한국어 해설과 영어 음성은 AI 음성으로 만들었습니다.`,
        tags: ['영어 읽는법', '영어 단어 읽는법', '영어 읽는법 왕초보', '영어 음절 세는 법', '영어 강세', '긴 영어 단어 읽기', '기초 영어 발음', '영어 발음 규칙', '영어 단어 읽기', '영어 읽기'],
        tagCheck: [],
        pinnedComment: '오늘 나온 단어 (글자 수 → 박자 수 · 힘주는 박자는 대문자)\n\nstrengths 9 → 1\nbanana 6 → 3 · ba-NA-na\nidea 4 → 3 · i-DE-a\nstrawberry 10 → 3 · STRAW-ber-ry\ntoothpaste 10 → 2 · TOOTH-paste\ninstructions 12 → 3 · in-STRUC-tions\nconditioner 11 → 4 · con-DI-tion-er\nvacation 8 → 3 · va-CA-tion\ningredients 11 → 4 · in-GRE-di-ents\ndetergent 9 → 3 · de-TER-gent\nsupplement 10 → 3 · SUP-ple-ment (영양제)\nmoisturizer 11 → 4 · MOIS-tur-iz-er\npharmacy 8 → 3 · PHAR-ma-cy\nrefrigerator 12 → 5 · re-FRIG-er-a-tor\n\n집에 있는 영어 라벨 하나 골라서 몇 박자였는지 단어랑 같이 남겨 주세요.',
      },
      why: '검색 상위가 "파닉스 총정리·정주행"으로 꽉 차 있어 규칙 개수로 겨루면 묻힌다. 설명란 첫 줄은 생활 장면으로, 태그는 실제 검색어로. 고정 댓글은 사전(CMU) 대조값만 적었다(FACT-CHECK.md 1절).',
    },
  ],
  pending: [
    'Gate 1 승인 뒤: 한국어 해설·영어 음성 생성 → 실측 길이로 컷 시각·설명란 시간표 다시 맞춤',
    '음성 청취: supplement(명사, 앞 박자)·ingredients(4박자)·conditioner(4박자) 힘주는 자리 확인(FACT-CHECK.md 4절)',
    '컷 그림: 중반(5~17컷) 흐린 사진 + 가운데 카드 틀 반복은 HyperFrames 제작 때 컷마다 움직임(동그라미 그리기·쌓기·솟기·쪼개기)을 다르게 해 단조로움을 푼다(Gemini 검수 지적, 시트 미리보기 그림은 정지 화면)',
    '짝 쇼츠: 글자 수 착시 퀴즈 한 판 또는 긴 라벨 단어 하나 3초 읽기(BRIEF.md 쇼츠 세트 후보) — 롱폼 대본 확정 뒤 쇼츠 썸네일 프롬프트와 함께',
  ],
  thumbnailPicks: [],
  titlePicks: [],
};

// 태그 검사 기록(유튜브 검색 결과 상위 제목으로 판정)
const tc1 = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const tc2 = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const tc = { ...tc1, ...tc2 };
const pkg = sheet.rows.find((r) => r.key === 'package').ours;
pkg.tagCheck = pkg.tags.map((tag) => ({ tag, verdict: '맞음', checkedAt: '2026-11-28', reason: `유튜브 검색 상위: ${(tc[tag] || []).slice(0, 3).join(' / ').slice(0, 160)}` }));
fs.writeFileSync(path.join(repo, 'data/youtube/transform-sheets', ID + '.json'), JSON.stringify(sheet, null, 2) + '\n');
console.log('cuts', cuts.length, 'duration', mmss(duration));
cuts.forEach((c) => console.log(mmss(c.t), c.template));
