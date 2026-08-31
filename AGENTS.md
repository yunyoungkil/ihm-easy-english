# 이해하면 쉬운영어

**새 제작(롱폼·쇼츠·썸네일 전부)은 HyperFrames로 한다.** `CLAUDE.md`가 문서화한 Remotion 파이프라인은
2026-08-26부터 신규 제작에 쓰지 않는다 — EP6~EP10 재렌더가 필요할 때만 참고하는 보존 문서다. 상세 근거는
[HyperFrames 전면 전환 결정](knowledge/decisions/2026-08-26-hyperframes-full-migration.md) 참고.
새 작업은 HyperFrames의 `/hyperframes` 스킬 진입점부터 시작한다.

이 파일의 나머지 내용은 `CLAUDE.md`와 100% 동일했다(859줄 전체 복사, 2026-08-25에 발견해 정리함).
`CLAUDE.md`가 여전히 그 Remotion 파이프라인 자체의 기술 문서 원본이다(위 이유로 지금은 레거시 참고용).

**제작 진행 상태·우선순위는 [`knowledge/`](knowledge/index.md)가 유일한 원본이다.**
`knowledge/now.md`부터 읽을 것.

## 채널 핵심 성장 & 수익화 플라이휠 원칙 (모든 대화 공통 적용)

> 이 섹션은 `CLAUDE.md`의 "모든 대화 공통 적용" 섹션과 내용을 동일하게 유지한다 — 어느 에이전트로
> 대화를 시작하든 같은 원칙을 보게 하기 위해서다. 한쪽을 고치면 반드시 다른 쪽도 같이 고칠 것.

이 채널의 모든 개발·기획·AI 기능은 아래 **'성장 & 자산화 플라이휠'**을 강화하는 방향으로 일관되게 사고하고 제안한다:
1. **경쟁사 결핍 추출**: 경쟁사 대본을 단순 복제하지 않고, 댓글/반응에서 **시청자의 미해결 질문·고통(Pain Point)**만 추출하여 DB화한다.
2. **우리 채널 브랜드 렌즈**: 추출한 소재를 3060 성인 학습자 맞춤 직관 비유, 큰 글씨 비주얼 카드, 3회 반복 낭독 포맷으로 재해석한다.
3. **HyperFrames 초고속 제작**: 1인 제작 시간을 80% 단축하여 주 1~2회 롱폼 + 2~3회 쇼츠의 꾸준한 공급을 달성한다.
4. **우리 채널 데이터 자산화**: 4사분면 진단 및 시청 지속률 피드백을 통해 검증된 **'성공 비유 족보'**를 누적하고, AI 프롬프트에 자동 환류시킨다.
5. **다단계 수익화 연계**: 단순 조회수 수익을 넘어 **3060 맞춤 실물/전자책 교재, 유료 멤버십 챌린지, 자체 카카오톡 구독자 DB**로 연결한다.
(상세: [`knowledge/channel-strategy.md`](knowledge/channel-strategy.md) 및 [`knowledge/decisions/2026-08-30-ai-features-enhancement-plan.md`](knowledge/decisions/2026-08-30-ai-features-enhancement-plan.md). 4~5단계가 요구하는 `audience-dna.json`/`success-patterns.json` 누적·환류 루프는 2026-08-31 구현 완료 — `scripts/youtube-analytics-server.mjs`의 🧬 Knowledge DB 탭과 write/read 훅 참고.)


## 채널 고유 페르소나 & 대본 작성 화법 (Brand Persona)
모든 대본 작성 및 기획 시 [`knowledge/brand-persona.md`](knowledge/brand-persona.md)의 원칙을 100% 준수한다:
1. **페르소나**: 가식 없는 솔직 담백한 실전 학습 파트너 (*"기초가 전혀 없어도 괜찮습니다. 당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다. 무작정 외우지 마세요."*)
2. **도파민 3단계 공식**: ① 게으른 혀의 소리 지름길 (원리 발견) ➔ ② 패턴 확장 (다른 단어에도 통하네? 아싸!) ➔ ③ 반전 꿀팁 (근데 이건 왜 다르지? 딱 요 차이!)
3. **비주얼 & 감성**: 하루 일하고 지친 시청자에게 주는 '세련된 지적 휴식 & 힐링(Rest & Recharge)' Cyber-HUD 룩.

## 대시보드 및 클라이언트 스크립트 개발 절대 규칙 (Client Script Integrity)
`scripts/youtube-analytics-server.mjs` 등 인라인 클라이언트 스크립트를 포함하는 서버 코드를 수정할 때:
1. **문자열 주입 시 무조건 `${JSON.stringify(변수)}` 사용**: 수동 이스케이프(`\'`, `\n`, `\"`) 금지 (따옴표/개행 문법 오류로 인한 대시보드 영구 로딩 멈춤 방지).
2. **코드 수정 후 반드시 자동 검증 실행**: `node scripts/test-client-syntax.mjs` 를 실행하여 브라우저 가상 환경에서 10개 탭 전체 렌더링에 0개의 에러가 발생함을 100% 확인한 후 응답한다.
(상세: [`knowledge/decisions/2026-08-30-preventing-embedded-client-js-syntax-errors.md`](knowledge/decisions/2026-08-30-preventing-embedded-client-js-syntax-errors.md))


