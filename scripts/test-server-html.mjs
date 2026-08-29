(async () => {
  try {
    const res = await fetch('http://localhost:3001');
    const html = await res.text();
    console.log('HTTP Status:', res.status);
    console.log('tab-matrix in HTML:', html.includes('tab-matrix'));
    console.log('tab-ab-simulator in HTML:', html.includes('tab-ab-simulator'));
    console.log('HTML Length:', html.length);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
})();
