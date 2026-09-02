// Stage-1 "제작 우선순위 결정" (knowledge/VIDEO_WORKFLOW.md) as a dashboard AI call:
// synthesizes 5 ranked topic candidates from the four data assets the channel already
// accumulates (market-demand.json, content-opportunity.json, audience-dna.json,
// success-patterns.json), each candidate required to cite which data backed it — so a
// candidate list is never presented without a traceable reason (VIDEO_WORKFLOW.md's
// "감으로 정하지 않는다" rule enforced at the schema level, not just by convention).

export async function generateTopicCandidates({
  geminiKey,
  marketDemand,
  contentOpportunity,
  audienceDna = [],
  successPatterns = [],
}) {
  if (!geminiKey) {
    throw new Error('Gemini API 키(GEMINI_API_KEY)가 설정되지 않았습니다.');
  }
  if (!marketDemand && !contentOpportunity) {
    throw new Error(
      'market-demand.json과 content-opportunity.json이 모두 없습니다. ' +
      '먼저 npm run market-demand && npm run content-opportunity를 실행하세요.'
    );
  }

  const marketDemandBlock = marketDemand?.byKeyword?.length
    ? `[경쟁사 시장 수요 데이터 — market-demand.json, 일반 검색 키워드 기준]:
${[...marketDemand.byKeyword]
  .sort((a, b) => (b.opportunityScore ?? 0) - (a.opportunityScore ?? 0))
  .slice(0, 8)
  .map((k) => {
    const patterns = (k.titlePatterns || []).slice(0, 4).map((p) => p.word).join(', ');
    const topOutlier = (k.topOutliers || [])[0];
    return `- "${k.keyword}" (opportunityScore ${k.opportunityScore ?? '?'}, 신뢰도 ${k.confidence || '?'})` +
      (patterns ? ` — 반복 훅 단어: ${patterns}` : '') +
      (topOutlier ? ` — 대표 아웃라이어: "${topOutlier.title}"` : '');
  })
  .join('\n')}
`
    : '[경쟁사 시장 수요 데이터 없음 — market-demand.json 없음, 이 축은 반영되지 않았습니다]\n';

  const contentOpportunityBlock = contentOpportunity?.byRule?.length || contentOpportunity?.byRole?.length
    ? `[우리 채널 자체 성과 데이터 — content-opportunity.json, fitScore 50=평균, 높을수록 유지율 좋음]:
${(contentOpportunity.byRule || [])
  .slice()
  .sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1))
  .map((r) => `- 시즌1 규칙 "${r.rule}": fitScore ${Math.round(r.fitScore ?? 0)} (영상 ${r.videoCount}개)`)
  .join('\n')}
${(contentOpportunity.byRole || [])
  .slice()
  .sort((a, b) => (b.fitScore ?? -1) - (a.fitScore ?? -1))
  .map((r) => `- 포맷/역할 "${r.role}": fitScore ${Math.round(r.fitScore ?? 0)} (영상 ${r.videoCount}개)`)
  .join('\n')}
`
    : '[우리 채널 자체 성과 데이터 없음 — content-opportunity.json 없음, 이 축은 반영되지 않았습니다]\n';

  const audienceDnaBlock = audienceDna.length
    ? `[누적된 시청자 실제 언어·미해결 고통점 DB — audience-dna.json, 후보의 angleOrHook에 최대한 활용할 것]:
${audienceDna.slice(0, 8).map((d) => `- (${d.occurrences}회 반복 확인) [${d.type}] ${d.text}`).join('\n')}
`
    : '';

  const successPatternsBlock = successPatterns.length
    ? `[우리 채널 검증된 성공 패턴 DB — success-patterns.json, Q1 영상에서 실제로 먹혔던 후킹/비유]:
${successPatterns.slice(0, 8).map((p) => `- (${p.title}, CTR ${p.ctr}%) 후킹: ${p.reusableHook || '기록 없음'} / 비유: ${p.reusableAnalogy || '기록 없음'}`).join('\n')}
`
    : '';

  const prompt = `당신은 대한민국 최고 수준의 유튜브 콘텐츠 기획 & 데이터 전략가입니다.
영어 교육 채널 '이해하면 쉬운영어'(3060 성인 & 왕초보 영어 타겟)의 **다음 영상 소재**를 아래 데이터에 근거해서만 추천합니다.

[채널 핵심 브랜드 철학 & 페르소나 — angleOrHook·rationale에 반드시 반영할 것]:
- 톤앤매너: 가식 없는 솔직 담백한 실전 학습 파트너. ("기초가 전혀 없어도 괜찮습니다. 당신이 영어를 못했던 게 아니라 소리 나는 원리를 몰랐을 뿐입니다. 무작정 외우지 마세요.")
- 선생님처럼 훈계하는 말투, 자극적인 낚시성 과장, 어려운 음성학 용어 절대 금지.
- 독점 3단계 도파민 공식: 1) 게으른 혀의 소리 지름길(원리 발견) → 2) 패턴 확장(카타르시스) → 3) 반전 꿀팁(미세한 차이).

${marketDemandBlock}
${contentOpportunityBlock}
${audienceDnaBlock}${successPatternsBlock}
[중요한 판단 원칙]:
- market-demand(경쟁사 검색 키워드)와 content-opportunity(우리 채널 내부 포맷/규칙)는 축이 다르다 — 점수를 곱하지 말고, 후보마다 어느 쪽이 근거인지 각각 판단할 것.
- 감으로 소재를 정하지 말 것. 모든 후보의 rationale은 dataSourceRefs에 인용한 구체적 수치/문구에서 나와야 한다.
- 위 데이터 중 없는 축이 있으면 해당 축은 근거로 쓰지 말 것(지어내지 말 것).

정확히 5개의 소재 후보를 아래 JSON 스키마로만 응답하세요. 백틱(\`\`\`json)으로 감싸서 출력하세요.

{
  "candidates": [
    {
      "rank": 1,
      "topic": "짧은 소재 제목",
      "angleOrHook": "이 소재를 어떤 각도/훅으로 풀지 한 문장",
      "targetAudience": "이 소재에 가장 적합한 구체적 타겟 시청자층 한 문장 (채널 기본값 '3060 성인 & 왕초보'를 그대로 반복하지 말고, 이 소재라면 실제로 누가 가장 반응할지 audienceDna/소재 성격에 맞춰 구체화 — 예: '발음 원리를 처음 배우는 알파벳 입문자', '기초는 아는데 듣기만 안 되는 중급 학습자')",
      "suggestedBadge": "썸네일 상단에 들어갈 짧은 포인트 뱃지 문구, 이모지 1개+한글 2~5단어 (예: '⚡ 소리 비밀 반전', '🔥 필수 핵심 족보', '⏱️ 10초 완성') — 이 소재의 angleOrHook에 맞는 새 문구를 지을 것, 예시를 그대로 복사하지 말 것",
      "rationale": "왜 지금 이 소재인가 — dataSourceRefs를 구체적으로 인용한 한 문장",
      "dataSourceRefs": [
        {"source": "marketDemand", "detail": "인용한 키워드/수치"},
        {"source": "contentOpportunity", "detail": "인용한 규칙/역할/fitScore"},
        {"source": "audienceDna", "detail": "인용한 고통점/질문"},
        {"source": "successPatterns", "detail": "인용한 성공 후킹/비유"}
      ],
      "suggestedFormat": "LONGFORM 또는 SHORTS 중 하나",
      "score": 0
    }
  ],
  "summaryNote": "5개 선정 시 데이터 소스별 반영 여부를 요약한 한 문장 (예: audience-dna는 데이터 부족으로 1건만 반영)"
}`;

  const models = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-3.7-flash'];
  let lastError = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${model} error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Gemini 반환 데이터가 비어 있습니다.');

      const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/) || [null, rawText];
      const parsed = JSON.parse(jsonMatch[1].trim());
      parsed.generatedAt = new Date().toISOString();
      return parsed;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`아이디어 후보 생성 실패: ${lastError?.message}`);
}
