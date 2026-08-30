// Using native global fetch

async function runTests() {
  console.log('🧪 Starting A/B Simulator & AI CTR Predictor E2E Test...');
  const baseUrl = 'http://localhost:3001';

  // 1. Test Server Health & HTML delivery
  console.log('\n[Step 1] Testing Server Health & HTML delivery...');
  const resHome = await fetch(baseUrl);
  if (!resHome.ok) throw new Error(`Server returned ${resHome.status}`);
  const html = await resHome.text();
  console.log(`✅ Server responded with status ${resHome.status} (${html.length} bytes)`);
  if (!html.includes('tab-ab-simulator') || !html.includes('A/B 피드 시뮬레이터')) {
    throw new Error('A/B Simulator markup missing from home response');
  }
  console.log('✅ A/B Simulator frontend components verified in HTML.');

  // 2. Test Longform (16:9) AI CTR Evaluation
  console.log('\n[Step 2] Testing Longform (16:9) AI CTR Evaluation API...');
  const longformPayload = {
    topic: "30초 만에 Want vs Won't 발음 완벽 구분법",
    targetAudience: "3060 성인 & 왕초보 영어 학습자",
    format: "LONGFORM",
    variants: [
      {
        id: "A",
        title: "30초 만에 'Want' vs 'Won't' #발음 완벽 구분! (이 원리 모르면 평생 안 들림)",
        thumbnailCopy: "WANT vs WON'T 입모양 공식",
        badge: "1초 구분",
        imageUrl: "https://i.ytimg.com/vi/t_wVvVyqdbg/mqdefault.jpg"
      },
      {
        id: "B",
        title: "원어민이 'Want' 발음할 때 절대 입술 안 모으는 진짜 이유 #영어발음",
        thumbnailCopy: "원어민 비밀 입술 모양",
        badge: "비법 공개",
        imageUrl: "https://i.ytimg.com/vi/5MiM1tIpQQk/mqdefault.jpg"
      },
      {
        id: "C",
        title: "영어 'Want'와 'Won't'가 똑같이 들렸던 이유? 딱 1가지만 기억하세요",
        thumbnailCopy: "귀가 뚫리는 1가지 법칙",
        badge: "귀 뚫림",
        imageUrl: "https://i.ytimg.com/vi/WZFLgtzV_80/mqdefault.jpg"
      }
    ]
  };

  const resLong = await fetch(`${baseUrl}/api/ab-simulator/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(longformPayload)
  });

  if (!resLong.ok) {
    const errData = await resLong.json();
    throw new Error(`Longform eval failed: ${errData.error || resLong.status}`);
  }

  const dataLong = await resLong.json();
  console.log('✅ Longform AI CTR Diagnosis Completed!');
  console.log(`🏆 Best Variant: 시안 ${dataLong.evaluation.bestVariant}`);
  console.log(`💬 Overall Verdict: ${dataLong.evaluation.overallVerdict}`);
  console.log(`🎯 Predicted CTR for Best: ${dataLong.evaluation.variantsEvaluation?.[0]?.predictedCtrRange || 'N/A'}`);
  console.log(`👓 3060 Legibility Score: ${dataLong.evaluation.variantsEvaluation?.[0]?.seniorLegibilityScore || 0}점`);
  console.log(`⚡ AI Suggested Titles count: ${dataLong.evaluation.aiTitleSuggestions?.length || 0}`);
  
  if (dataLong.evaluation.aiImagePrompts?.[0]) {
    const p = dataLong.evaluation.aiImagePrompts[0];
    console.log(`🖼️ AI Image Prompt (16:9): ${p.midjourneyPrompt}`);
    console.log(`✍️ Korean Overlay Copy: ${p.koreanOverlayCopy || 'N/A'}`);
  }

  // 3. Test Shorts (9:16) AI CTR Evaluation with Q 발음 topic
  console.log('\n[Step 3] Testing Shorts (9:16) AI CTR Evaluation API...');
  const shortsPayload = {
    topic: "영포자를 위한 1분 영어: Q는 어떻게 읽을까요?",
    targetAudience: "3060 성인 & 왕초보 영어 학습자",
    format: "SHORTS",
    variants: [
      {
        id: "A",
        title: "영포자를 위한 1분 영어: Q는 어떻게 읽을까요? #영어발음 #Shorts",
        thumbnailCopy: "Q는 어떻게 읽을까요?",
        badge: "1분 완성",
        imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=720&q=80"
      },
      {
        id: "B",
        title: "원어민이 알파벳 Q 발음할 때 입술 모으는 이유? #Shorts",
        thumbnailCopy: "Q 발음 입술 비밀",
        badge: "비법 공개",
        imageUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=720&q=80"
      },
      {
        id: "C",
        title: "Q를 ‘큐’라고만 읽으면 틀립니다! 딱 10초 발음 공식 #Shorts",
        thumbnailCopy: "10초 발음 공식",
        badge: "10초 컷",
        imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=720&q=80"
      }
    ]
  };

  const resShort = await fetch(`${baseUrl}/api/ab-simulator/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(shortsPayload)
  });

  if (!resShort.ok) {
    const errData = await resShort.json();
    throw new Error(`Shorts eval failed: ${errData.error || resShort.status}`);
  }

  const dataShort = await resShort.json();
  console.log('✅ Shorts (9:16) AI CTR Diagnosis Completed!');
  console.log(`🏆 Best Variant: 시안 ${dataShort.evaluation.bestVariant}`);
  console.log(`💬 Overall Verdict: ${dataShort.evaluation.overallVerdict}`);
  console.log(`🎯 Predicted CTR: ${dataShort.evaluation.variantsEvaluation?.[0]?.predictedCtrRange || 'N/A'}`);
  console.log(`👓 3060 Legibility: ${dataShort.evaluation.variantsEvaluation?.[0]?.seniorLegibilityScore || 0}점`);
  console.log(`⚡ AI Suggested Titles count: ${dataShort.evaluation.aiTitleSuggestions?.length || 0}`);
  
  if (dataShort.evaluation.aiImagePrompts?.[0]) {
    const p = dataShort.evaluation.aiImagePrompts[0];
    console.log(`🖼️ AI Image Prompt (9:16): ${p.midjourneyPrompt}`);
    console.log(`✍️ Korean Overlay Copy: ${p.koreanOverlayCopy || 'N/A'}`);
  }

  console.log('\n🎉 ALL E2E TESTS PASSED SUCCESSFULLY! 100% OPERATIONAL!');
}

runTests().catch(err => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
