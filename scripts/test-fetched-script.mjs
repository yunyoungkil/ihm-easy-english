import vm from 'vm';

(async () => {
  const res = await fetch('http://localhost:3001');
  const html = await res.text();
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    console.error('No script tag found in fetched HTML!');
    return;
  }
  
  try {
    const script = new vm.Script(scriptMatch[1], { filename: 'fetched-client-script.js' });
    console.log('✅ Fetched script parsed 100% cleanly in vm.Script!');
  } catch (err) {
    console.error('❌ ERROR IN FETCHED SCRIPT:');
    console.error(err.stack);
  }
})();
