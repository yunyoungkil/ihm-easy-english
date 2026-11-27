import {existsSync} from 'node:fs';
import {readdir, readFile, stat} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const AGENTS_MAX_LINES = 190;
export const AGENTS_MAX_BYTES = 22000;
export const SKILL_MAX_LINES = 260;
export const DEFAULT_CLEANUP_INTERVAL_DAYS = 14;
export const PROJECT_SKILLS = Object.freeze([
  'episode-planning',
  'blind-review',
  'publish-wrapup',
  'performance-settlement',
  'wiki-maintenance',
  'slop-rewrite',
]);

const NON_CORE_PREFIXES = [
  'legacy/', 'logs/', 'handoff/', 'meetings/', 'audits/', 'growth/', 'episodes/', 'templates/',
];
const IGNORED_CORE_ORPHANS = new Set(['index.md', 'now.md', 'README.md', 'log.md', 'current-status.md']);

const toPosix = (p) => String(p).replace(/\\/g, '/');

const isCoreDoc = (relPosix) => {
  if (IGNORED_CORE_ORPHANS.has(relPosix)) return false;
  if (NON_CORE_PREFIXES.some((prefix) => relPosix.startsWith(prefix))) return false;
  if (/^competitor-channels-.*\.md$/i.test(relPosix)) return false;
  return true;
};

async function walkMarkdown(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, {withFileTypes: true});
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walkMarkdown(full));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

async function walkAllFiles(dir, base = dir) {
  if (!existsSync(dir)) return new Map();
  const out = new Map();
  const entries = await readdir(dir, {withFileTypes: true});
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [k, v] of await walkAllFiles(full, base)) out.set(k, v);
    } else if (entry.isFile()) {
      out.set(toPosix(relative(base, full)), await readFile(full, 'utf8'));
    }
  }
  return out;
}

/**
 * 1차 자동 유지 핵심 거버넌스 점검(2026-11-27):
 * - 잠금 ① AGENTS.md 190줄·22KB 이하
 * - 잠금 ② 프로젝트 스킬 SKILL.md 260줄 이하 및 .agents/skills ↔ .claude/skills 일치
 * - 잠금 ④ knowledge/ 깨진 링크 0건 및 핵심 문서의 knowledge/index.md 연결
 * - 주기 정리 신호: knowledge/wiki-maintenance-state.json 기준 경과 일수
 */
export async function auditGovernance(projectDir = resolve(import.meta.dirname, '..'), {now = new Date()} = {}) {
  const knowledgeDir = resolve(projectDir, 'knowledge');
  const files = await walkMarkdown(knowledgeDir);
  const inbound = new Map(files.map((file) => [file, 0]));
  const brokenLinks = [];
  const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(markdownLink)) {
      const target = match[1].split('#')[0].trim();
      if (!target || /^(https?:|mailto:|file:|conversation:)/i.test(target)) continue;
      const absolute = resolve(dirname(file), decodeURIComponent(target));
      try {
        const info = await stat(absolute);
        if (!info.isFile()) brokenLinks.push({file: toPosix(relative(projectDir, file)), target});
        if (inbound.has(absolute)) inbound.set(absolute, inbound.get(absolute) + 1);
      } catch {
        brokenLinks.push({file: toPosix(relative(projectDir, file)), target});
      }
    }
  }

  const coreOrphans = [...inbound]
    .filter(([file, count]) => count === 0 && isCoreDoc(toPosix(relative(knowledgeDir, file))))
    .map(([file]) => toPosix(relative(knowledgeDir, file)))
    .sort();

  const agentsPath = resolve(projectDir, 'AGENTS.md');
  let agentsLines = 0;
  let agentsBytes = 0;
  if (existsSync(agentsPath)) {
    const agentsText = await readFile(agentsPath, 'utf8');
    agentsLines = agentsText.split(/\r?\n/).length;
    agentsBytes = Buffer.byteLength(agentsText, 'utf8');
  }

  const skillIssues = [];
  for (const skill of PROJECT_SKILLS) {
    const aDir = resolve(projectDir, '.agents', 'skills', skill);
    const cDir = resolve(projectDir, '.claude', 'skills', skill);
    const aHas = existsSync(join(aDir, 'SKILL.md'));
    const cHas = existsSync(join(cDir, 'SKILL.md'));
    if (!aHas && !cHas) continue;
    if (aHas !== cHas) {
      skillIssues.push(`스킬 ${skill}: .agents/skills와 .claude/skills 중 한쪽에만 존재한다`);
      continue;
    }
    const aFiles = await walkAllFiles(aDir);
    const cFiles = await walkAllFiles(cDir);
    const aSkillLines = (aFiles.get('SKILL.md') || '').split(/\r?\n/).length;
    if (aSkillLines > SKILL_MAX_LINES) {
      skillIssues.push(`스킬 ${skill}/SKILL.md가 ${aSkillLines}줄이다(상한 ${SKILL_MAX_LINES}줄)`);
    }
    const allKeys = new Set([...aFiles.keys(), ...cFiles.keys()]);
    for (const rel of allKeys) {
      const av = (aFiles.get(rel) ?? '').replace(/\r\n/g, '\n');
      const cv = (cFiles.get(rel) ?? '').replace(/\r\n/g, '\n');
      if (av !== cv) {
        skillIssues.push(`스킬 ${skill}/${rel}: .agents/skills와 .claude/skills 내용이 다르다`);
      }
    }
  }

  const warnings = [];
  const nowPath = resolve(knowledgeDir, 'now.md');
  if (existsSync(nowPath)) {
    const lineCount = (await readFile(nowPath, 'utf8')).split(/\r?\n/).length;
    if (lineCount > 80) warnings.push(`now.md가 ${lineCount}줄입니다. 현재 업무만 남기고 줄이세요.`);
  }

  let cleanup = {lastCleanedAt: null, intervalDays: DEFAULT_CLEANUP_INTERVAL_DAYS, daysSince: null, due: false};
  const statePath = resolve(knowledgeDir, 'wiki-maintenance-state.json');
  if (existsSync(statePath)) {
    try {
      const st = JSON.parse(await readFile(statePath, 'utf8'));
      const intervalDays = Number(st.intervalDays) || DEFAULT_CLEANUP_INTERVAL_DAYS;
      const ts = st.lastCleanedAt ? Date.parse(`${st.lastCleanedAt}T00:00:00Z`) : NaN;
      const daysSince = Number.isFinite(ts) ? Math.floor((now.getTime() - ts) / 86400000) : null;
      cleanup = {lastCleanedAt: st.lastCleanedAt || null, intervalDays, daysSince, due: daysSince != null && daysSince >= intervalDays};
    } catch {
      warnings.push('knowledge/wiki-maintenance-state.json 형식이 잘못되었습니다.');
    }
  }

  const blocking = [];
  if (agentsLines > AGENTS_MAX_LINES) {
    blocking.push(`AGENTS.md가 ${agentsLines}줄이다(상한 ${AGENTS_MAX_LINES}줄) — 상세 절차는 스킬·지도로 옮기고 실수는 3갈래 배치·정원 10개 교체제를 따른다`);
  }
  if (agentsBytes > AGENTS_MAX_BYTES) {
    blocking.push(`AGENTS.md가 ${agentsBytes}바이트다(상한 ${AGENTS_MAX_BYTES}바이트) — 뒷부분 잘림 방지를 위해 얇은 지도로 유지한다`);
  }
  if (brokenLinks.length) {
    blocking.push(`knowledge/ 깨진 링크 ${brokenLinks.length}건: ${brokenLinks.slice(0, 5).map((b) => `${b.file} -> ${b.target}`).join(', ')}`);
  }
  if (coreOrphans.length) {
    blocking.push(`knowledge/index.md에서 빠진 핵심 문서 ${coreOrphans.length}건: ${coreOrphans.slice(0, 6).join(', ')}`);
  }
  blocking.push(...skillIssues);

  return {
    ok: blocking.length === 0,
    markdownFiles: files.length,
    agents: {lines: agentsLines, maxLines: AGENTS_MAX_LINES, bytes: agentsBytes, maxBytes: AGENTS_MAX_BYTES},
    brokenLinks,
    coreOrphans,
    skillIssues,
    cleanup,
    blocking,
    warnings,
  };
}

/** 시작 브리핑용 1줄 건강 알림: 정상이면 null(생략), 이상이나 주기 정리 시점이면 1줄 반환. */
export function wikiHealthLine(report) {
  if (!report) return null;
  const parts = [];
  if (report.blocking?.length) {
    parts.push(`거버넌스 이상 ${report.blocking.length}건(${report.blocking[0]})`);
  } else if (report.agents && report.agents.lines >= Math.floor(report.agents.maxLines * 0.9)) {
    parts.push(`AGENTS.md ${report.agents.lines}/${report.agents.maxLines}줄(상한 임박)`);
  }
  if (report.cleanup?.due) {
    parts.push(`지침·위키 주기 정리 도래(마지막 정리 ${report.cleanup.lastCleanedAt}, ${report.cleanup.daysSince}일 경과 — wiki-maintenance 스킬로 정리 초안 작성)`);
  }
  if (report.warnings?.length) parts.push(report.warnings[0]);
  return parts.length ? `지침·위키 건강: ${parts.join(' / ')}` : null;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = await auditGovernance(resolve(import.meta.dirname, '..'));
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}
