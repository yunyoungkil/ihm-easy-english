import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function testGeminiImagen() {
  let geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey && existsSync('.env')) {
    const text = await readFile('.env', 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    }
    geminiKey = process.env.GEMINI_API_KEY;
  }

  console.log('Testing Gemini Imagen with key:', geminiKey ? 'Present' : 'Missing');

  // Test imagen-3.0-generate-002
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${geminiKey}`;
  const prompt = "An expressive 45-year-old Korean adult student looking surprised and pointing at a bright chalkboard with English pronunciation in a warm modern cozy studio, cinematic lighting, 8k, photorealistic";

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          outputOptions: { mimeType: "image/jpeg" }
        }
      })
    });
    console.log('Imagen-3 status:', res.status);
    const data = await res.json();
    if (data.predictions && data.predictions[0]?.bytesBase64Encoded) {
      console.log('✅ Google Imagen 3 successfully generated image! Base64 length:', data.predictions[0].bytesBase64Encoded.length);
      return;
    } else {
      console.log('Imagen response:', JSON.stringify(data).slice(0, 300));
    }
  } catch (err) {
    console.error('Imagen-3 error:', err);
  }
}

testGeminiImagen().catch(console.error);
