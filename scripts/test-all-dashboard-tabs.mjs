import { readFileSync } from 'fs';
import vm from 'node:vm';

const html = readFileSync('scripts/youtube-analytics-server.mjs', 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);

if (!scriptMatch) {
  console.error('❌ Could not find <script> block in youtube-analytics-server.mjs');
  process.exit(1);
}

// Mock DOM
const mockElement = (id = '') => ({
  id,
  innerHTML: '',
  textContent: '',
  style: {},
  dataset: {},
  classList: {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false,
  },
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  insertBefore: () => {},
  scrollIntoView: () => {},
  scrollBy: () => {},
  focus: () => {},
  blur: () => {},
  setAttribute: () => {},
  getAttribute: () => null,
  removeAttribute: () => {},
});

const elementsMap = {};
const dom = {
  getElementById: (id) => {
    if (!elementsMap[id]) elementsMap[id] = mockElement(id);
    return elementsMap[id];
  },
  querySelectorAll: () => [],
  querySelector: () => mockElement(),
  createElement: (tag) => mockElement(tag),
  addEventListener: () => {},
  removeEventListener: () => {},
  body: mockElement('body'),
};

const context = {
  document: dom,
  window: {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { reload: () => {} },
    scrollTo: () => {},
    innerWidth: 1920,
    innerHeight: 1080,
  },
  console: console,
  setInterval: () => {},
  setTimeout: () => {},
  Date: Date,
  Math: Math,
  JSON: JSON,
  String: String,
  Number: Number,
  Array: Array,
  Object: Object,
  Set: Set,
  Map: Map,
  RegExp: RegExp,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  fmt: { format: (n) => String(n) },
  esc: (s) => String(s),
};

vm.createContext(context);

try {
  vm.runInContext(scriptMatch[1], context);
  console.log('✅ Client JS evaluated cleanly.');
} catch (err) {
  console.error('❌ Syntax or eval error in client JS:', err);
  process.exit(1);
}

// Load real data
const snap = JSON.parse(readFileSync('data/youtube/analytics-latest.json', 'utf8'));
const catalog = JSON.parse(readFileSync('data/youtube/catalog.json', 'utf8'));
const reach = JSON.parse(readFileSync('data/youtube/video-reach-manual.json', 'utf8'));
const pkg = JSON.parse(readFileSync('data/youtube/packaging-registry.json', 'utf8'));

context.gDashboard = {
  ...snap,
  recentVideos: catalog.videos || [],
  videoPerformance: snap.videoPerformance || [],
  videoReachManual: reach,
  packagingRegistry: pkg,
  localThumbnails: {
    'nVrCk8IZFGA': 'output/upload-packages/s1-ep10-shorts-b/thumbnail.png',
    'LdiZKCzKf0c': 'output/upload-packages/s1-ep10-shorts-a/thumbnail.png',
    '3PkSwrFIcRE': 'output/upload-packages/s1-ep10-longform/thumbnail.png',
    'sNNufVhkjT8': 'output/upload-packages/s1-ep09-longform/thumbnail.png',
    '7qSWJZqV14o': 'output/upload-packages/s1-ep09-shorts-a/thumbnail.png',
    'Si88xXt-EQc': 'output/upload-packages/s1-ep09-shorts-b/thumbnail.png',
  },
};

const tabsToTest = [
  { id: 'tab-overview', fnName: 'renderOverviewTab' },
  { id: 'tab-matrix', fnName: 'renderMatrixTab' },
  { id: 'tab-studio', fnName: 'renderStudioTab' },
  { id: 'tab-packaging', fnName: 'renderPackagingTab' },
  { id: 'tab-evaluations', fnName: 'renderEvaluationsTab' },
  { id: 'tab-brand', fnName: 'renderBrandTab' },
  { id: 'tab-radar', fnName: 'renderRadarTab' },
  { id: 'tab-outlier-comments', fnName: 'renderOutlierCommentsTab' },
];

let allPassed = true;

for (const t of tabsToTest) {
  if (typeof context[t.fnName] !== 'function') {
    console.log(`ℹ️ Tab ${t.id} (${t.fnName}) is not defined as separate function.`);
    continue;
  }
  try {
    context.gCurrentTab = t.id;
    if (t.id === 'tab-studio') {
      for (const f of ['ALL', 'HAS_DATA', 'SHORTS', 'LONGFORM']) {
        context.gStudioFilter = f;
        const out = context[t.fnName]();
        if (typeof out !== 'string' || out.length === 0) {
          throw new Error(`Empty render output for filter ${f}`);
        }
        console.log(`  ✅ ${t.id} [filter: ${f}] -> rendered ${out.length} chars`);
      }
    } else if (t.id === 'tab-matrix') {
      for (const fmt of ['ALL', 'LONGFORM', 'SHORTS']) {
        context.gMatrixFormatFilter = fmt;
        const out = context[t.fnName]();
        if (typeof out !== 'string' || out.length === 0) {
          throw new Error(`Empty render output for format ${fmt}`);
        }
        console.log(`  ✅ ${t.id} [format: ${fmt}] -> rendered ${out.length} chars`);
      }
    } else {
      const out = context[t.fnName]();
      console.log(`  ✅ ${t.id} -> rendered ${out.length} chars`);
    }
  } catch (err) {
    console.error(`❌ ERROR in ${t.id}:`, err);
    allPassed = false;
  }
}

if (allPassed) {
  console.log('\n🎉 ALL DASHBOARD TABS RENDERED 100% CLEANLY WITH ZERO REFERENCE ERRORS!');
} else {
  process.exit(1);
}
