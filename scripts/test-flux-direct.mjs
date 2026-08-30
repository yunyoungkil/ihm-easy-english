async function testFlux() {
  const visualPrompt = "An expressive 45-year-old Korean adult student looking surprised and pointing at a bright chalkboard with English pronunciation in a warm modern cozy studio, cinematic lighting, 8k, photorealistic";
  const fluxUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=1280&height=720&model=flux&nologo=true&enhance=true`;
  console.log('Fetching:', fluxUrl);
  const start = Date.now();
  try {
    const res = await fetch(fluxUrl);
    console.log('Status:', res.status, 'Time:', (Date.now() - start) + 'ms');
    const ab = await res.arrayBuffer();
    console.log('Bytes received:', ab.byteLength);
  } catch (err) {
    console.error('Error fetching Flux:', err);
  }
}

testFlux().catch(console.error);
