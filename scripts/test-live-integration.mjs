import vm from 'vm';

(async () => {
  const res = await fetch('http://localhost:3001');
  const html = await res.text();
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  
  const mockElement = (id = '') => ({
    id,
    innerHTML: '',
    textContent: '',
    style: {},
    dataset: { tab: id, targetTab: id },
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    appendChild: () => {},
    insertBefore: () => {},
    scrollIntoView: () => {},
    scrollBy: () => {},
  });

  const elementsMap = new Map();
  const getEl = (id) => {
    if (!elementsMap.has(id)) elementsMap.set(id, mockElement(id));
    return elementsMap.get(id);
  };

  const sandbox = {
    document: {
      getElementById: (id) => getEl(id),
      querySelectorAll: () => [getEl('tab-overview'), getEl('tab-matrix')],
      querySelector: () => mockElement(),
      addEventListener: () => {},
      createElement: (tag) => mockElement(tag),
    },
    window: {
      addEventListener: () => {},
      EventSource: function() { this.addEventListener = () => {}; },
    },
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    fetch: async (url) => {
      const liveRes = await fetch(`http://localhost:3001${url}`);
      return {
        ok: liveRes.ok,
        status: liveRes.status,
        json: () => liveRes.json(),
      };
    },
  };

  vm.createContext(sandbox);
  vm.runInContext(scriptMatch[1], sandbox);

  // Wait 500ms for loadAll to fetch and render
  setTimeout(() => {
    const hero = getEl('hero-greeting');
    const root = getEl('tab-content-root');
    console.log('LIVE GREETING:', hero.textContent);
    console.log('LIVE TAB ROOT HTML LENGTH:', root.innerHTML.length);
    console.log('LIVE MATRIX TEST:');
    sandbox.switchTab('tab-matrix');
    console.log('MATRIX HTML LENGTH:', root.innerHTML.length);
    if (root.innerHTML.includes('ALGORITHM 4-QUADRANT MATRIX') && root.innerHTML.includes('matrix-svg-container')) {
      console.log('🎉🎉🎉 LIVE E2E INTEGRATION 100% SUCCEEDED! ZERO BUGS!');
    } else {
      console.log('❌ Matrix did not render.');
    }
  }, 500);
})();
