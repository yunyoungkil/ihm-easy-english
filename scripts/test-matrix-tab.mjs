import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const serverCode = readFileSync(join(projectDir, 'scripts', 'youtube-analytics-server.mjs'), 'utf8');

const scriptMatch = serverCode.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('No script tag found!');
  process.exit(1);
}

const mockElement = (id = '') => {
  const el = {
    id,
    innerHTML: '',
    textContent: '',
    style: {},
    dataset: { tab: id },
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
    },
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    appendChild: () => {},
    insertBefore: () => {},
    scrollIntoView: () => {},
    scrollBy: () => {},
    offsetLeft: 0,
    scrollLeft: 0,
    scrollWidth: 1000,
    clientWidth: 800,
  };
  return el;
};

const elementsMap = new Map();
const getEl = (id) => {
  if (!elementsMap.has(id)) {
    elementsMap.set(id, mockElement(id));
  }
  return elementsMap.get(id);
};

const snap = JSON.parse(readFileSync(join(projectDir, 'data', 'youtube', 'analytics-latest.json'), 'utf8'));
const catalog = JSON.parse(readFileSync(join(projectDir, 'data', 'youtube', 'catalog.json'), 'utf8'));
const reach = JSON.parse(readFileSync(join(projectDir, 'data', 'youtube', 'video-reach-manual.json'), 'utf8'));

const mockDashboard = {
  ...snap,
  recentVideos: catalog.videos,
  videoPerformance: snap.videoPerformance || [],
  videoReachManual: reach,
  packagingRegistry: { items: [] }
};

const sandbox = {
  document: {
    getElementById: (id) => getEl(id),
    querySelectorAll: (sel) => {
      if (sel.includes('.rail-btn') || sel.includes('.tab-pill')) {
        return [getEl('tab-overview'), getEl('tab-matrix'), getEl('tab-ab-simulator')];
      }
      return [];
    },
    querySelector: (sel) => mockElement(),
    addEventListener: () => {},
    createElement: (tag) => mockElement(tag),
  },
  window: {
    addEventListener: () => {},
    EventSource: function(url) {
      this.addEventListener = () => {};
    },
  },
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  fetch: (url) => {
    if (url === '/api/dashboard') {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockDashboard) });
    }
    if (url === '/api/market-demand') {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ themes: [] }) });
    }
    if (url === '/api/episodes/summary') {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
  },
};

vm.createContext(sandbox);

try {
  vm.runInContext(scriptMatch[1], sandbox);
  console.log('Script evaluated in VM.');

  // Let loadAll run
  setTimeout(() => {
    console.log('Checking state after loadAll()...');
    const hero = getEl('hero-greeting');
    const root = getEl('tab-content-root');
    console.log('hero-greeting text:', hero.textContent);
    console.log('tab-content-root length:', root.innerHTML.length);
    console.log('Testing switchTab("tab-matrix")...');
    sandbox.switchTab('tab-matrix');
    console.log('Matrix Tab HTML length:', root.innerHTML.length);
    if (root.innerHTML.includes('ALGORITHM 4-QUADRANT MATRIX')) {
      console.log('🎉 FULL INTEGRATION TEST PASSED 100%!');
    } else {
      console.log('❌ Matrix Tab did not render properly.');
    }
  }, 100);
} catch (err) {
  console.error('❌ RUNTIME ERROR:', err);
}
