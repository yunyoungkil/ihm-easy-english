async function testImageGen() {
  console.log('🧪 Testing 1-Click AI Image Generation API...');
  const res = await fetch('http://localhost:3001/api/ab-simulator/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Clean vertical visual artwork for English pronunciation education: glowing 3D yellow neon letter Q in center, dark cyber-hud deep navy ambient background, 4k ultra-high resolution',
      format: 'SHORTS',
      engine: 'flux'
    })
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Failed: ${err.error || res.status}`);
  }

  const data = await res.json();
  console.log(`✅ AI Image Generated Successfully!`);
  console.log(`🚀 Engine: ${data.engine}`);
  console.log(`🖼️ Image Data URL length: ${data.imageUrl?.length || 0} characters`);
  if (!data.imageUrl?.startsWith('data:image/')) {
    throw new Error('Image data URL invalid');
  }
  console.log('🎉 1-Click Image Generator is 100% OPERATIONAL!');
}

testImageGen().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
