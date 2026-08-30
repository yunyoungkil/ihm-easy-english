async function testPollinationsModels() {
  const visualPrompt = "An expressive 45-year-old Korean adult student looking surprised and pointing at a bright chalkboard with English pronunciation in a warm modern cozy studio, cinematic lighting, 8k, photorealistic";
  
  const testUrls = [
    `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000000)}`,
    `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=1280&height=720&model=turbo&nologo=true&seed=${Math.floor(Math.random()*1000000)}`,
  ];

  for (const url of testUrls) {
    console.log('Testing:', url.slice(0, 100) + '...');
    const start = Date.now();
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://pollinations.ai/'
        }
      });
      console.log('Status:', res.status, 'Time:', (Date.now() - start) + 'ms');
      const ab = await res.arrayBuffer();
      console.log('Bytes received:', ab.byteLength);
    } catch (err) {
      console.error('Error:', err.message);
    }
  }
}

testPollinationsModels().catch(console.error);
