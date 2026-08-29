import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const serverCode = readFileSync(join(projectDir, 'scripts', 'youtube-analytics-server.mjs'), 'utf8');

const scriptMatch = serverCode.match(/<script>([\s\S]*?)<\/script>/);
const jsCode = scriptMatch[1];

// Split script into chunks/lines and test evaluate each function definition
const lines = jsCode.split('\n');
console.log('Total script lines:', lines.length);

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
    querySelectorAll: () => [],
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
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }),
};

vm.createContext(sandbox);

try {
  vm.runInContext(jsCode, sandbox);
  console.log('✅ Entire script executed synchronously without throwing!');
} catch (err) {
  console.error('❌ Script execution error:', err);
}
