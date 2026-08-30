async function testPhotoSources() {
  const curatedPortraits = [
    // Surprised / Shocked reaction
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    // Teacher / Confident pointing
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
    // Student studying / Confused
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    // Asian female confident / smiling
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=80',
    // Asian male focused
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&auto=format&fit=crop&q=80',
  ];

  for (const url of curatedPortraits) {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('Status for', url.slice(0, 60), ':', res.status);
  }
}

testPhotoSources().catch(console.error);
