async function testEndpoint() {
  try {
    const res = await fetch('http://localhost:3001/api/ab-simulator/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantKey: 'A',
        title: "-sion은 '션'일까 '전'일까? 99%가 모르는 영어 발음의 숨겨진 과학적 원리",
        thumbnailCopy: '',
        badge: '',
        topic: "-sion은 '션'일까 '전'일까?",
        format: 'LONGFORM',
        engine: 'flux'
      })
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Response (first 300 chars):', text.slice(0, 300));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testEndpoint().catch(console.error);
