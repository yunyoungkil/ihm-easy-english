import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const serverCode = readFileSync(join(projectDir, 'scripts', 'youtube-analytics-server.mjs'), 'utf8');

const scriptMatch = serverCode.match(/<script>([\s\S]*?)<\/script>/);
const jsCode = scriptMatch[1];

try {
  const script = new vm.Script(jsCode, { filename: 'client-script.js', lineOffset: 1597 });
  console.log('No error in vm.Script');
} catch (err) {
  console.error('ERROR IN vm.Script:');
  console.error(err.stack);
}
