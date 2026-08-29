import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const projectDir = dirname(dirname(fileURLToPath(import.meta.url)));
const serverCode = readFileSync(join(projectDir, 'scripts', 'youtube-analytics-server.mjs'), 'utf8');

const htmlStart = serverCode.indexOf('const pageHtml = `<!doctype html>');
const htmlEnd = serverCode.indexOf('</html>`;', htmlStart);
const rawTemplate = serverCode.slice(htmlStart, htmlEnd + 9);

console.log('Template length in source:', rawTemplate.length);

// Look for ${ in the raw template
const regex = /\$\{([^}]+)\}/g;
let match;
const interpolated = [];
while ((match = regex.exec(rawTemplate)) !== null) {
  interpolated.push(match[0]);
}

console.log('Interpolated expressions inside pageHtml:', interpolated);
