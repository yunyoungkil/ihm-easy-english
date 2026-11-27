import {existsSync} from 'node:fs';
import {readdir, readFile, stat} from 'node:fs/promises';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const AGENTS_MAX_LINES = 190;
export const AGENTS_MAX_BYTES = 22000;
export const SKILL_MAX_LINES = 260;
export const DEFAULT_CLEANUP_INTERVAL_DAYS = 14;
export const MISTAKE_CAP = 10;

/** AGENTS.md "## 1." 절(실수 정원표)에서 번호 행 수를 센다. 절이 없으면 null. */
export function countMistakeRows(agentsText) {
  const lines = String(agentsText || '').split(/\r?\n/);
  const startIdx = lines.findIndex((l) => /^##\s*1\.\s/.test(l));
  if (startIdx < 0) return null;
  let n = 0;
  for (let i = startIdx + 1; i < lines.length && !/^##\s/.test(lines[i]); i += 1) {
    if (/^\|\s*\d+\s*\|/.test(lines[i])) n += 1;
  }
  return n;
}
export const PROJECT_SKILLS = Object.freeze([
  'episode-planning',
  'blind-review',
  'publish-wrapup',
  'performance-settlement',
  'wiki-maintenance',
  'slop-rewrite',
]);
/**
 * 밖에서 받아 온 스킬(원본을 고치지 않는다). 양쪽 폴더 일치만 보고 줄 수 상한·링크 점검에서는 뺀다.
 * 그 밖의 스킬 폴더는 새로 만든 7번째 스킬까지 전부 줄 수·링크를 본다(2026-11-27 재검수: 위 6개 이름만 봤다).
 * ui-ux-pro-max(2026-11-11 설치)는 SKILL.md가 292줄이라 빼지 않으면 그날부터 규칙 문서 커밋이 전부 막힌다.
 */
export const EXTERNAL_SKILLS = Object.freeze(['ui-ux-pro-max']);

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
  // 양쪽 스킬 폴더를 실제로 훑는다(2026-11-27 감사: 이름 6개만 고정해 새 스킬은 안 봤고, 필수 스킬이 양쪽에서 다 지워져도 넘어갔다).
  const listSkillDirs = async (side) => {
    const dir = resolve(projectDir, side, 'skills');
    if (!existsSync(dir)) return [];
    return (await readdir(dir, {withFileTypes: true})).filter((e) => e.isDirectory()).map((e) => e.name);
  };
  const aNames = new Set(await listSkillDirs('.agents'));
  const cNames = new Set(await listSkillDirs('.claude'));
  const allSkills = [...new Set([...aNames, ...cNames])].sort();
  const ownSkills = allSkills.filter((skill) => !EXTERNAL_SKILLS.includes(skill));
  // 링크를 검사하는 문서: knowledge/ 전부 + 루트 규칙 2개 + 밖에서 받아 온 것을 뺀 스킬 문서 전부(2026-11-27 감사: 규칙·스킬 안 링크는 안 봤다).
  const rootDocs = ['AGENTS.md', 'CLAUDE.md'].map((f) => resolve(projectDir, f)).filter((f) => existsSync(f));
  const skillDocs = [];
  for (const side of ['.agents', '.claude']) {
    for (const skill of ownSkills) skillDocs.push(...await walkMarkdown(resolve(projectDir, side, 'skills', skill)));
  }
  const linkDocs = [...files, ...rootDocs, ...skillDocs];
  const brokenLinks = [];
  const edges = new Map();
  const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;

  for (const file of linkDocs) {
    const text = await readFile(file, 'utf8');
    const out = [];
    for (const match of text.matchAll(markdownLink)) {
      const target = match[1].split('#')[0].trim();
      if (!target || /^(https?:|mailto:|file:|conversation:)/i.test(target)) continue;
      const absolute = resolve(dirname(file), decodeURIComponent(target));
      try {
        const info = await stat(absolute);
        if (!info.isFile()) brokenLinks.push({file: toPosix(relative(projectDir, file)), target});
        else out.push(absolute);
      } catch {
        brokenLinks.push({file: toPosix(relative(projectDir, file)), target});
      }
    }
    edges.set(file, out);
  }

  // 핵심 문서는 목차(knowledge/index.md)나 AGENTS.md에서 출발해 핵심 문서 링크만 따라가서 닿아야 한다.
  // 예전에는 일지·인수인계 같은 아무 문서에서 링크 하나만 있어도 통과했다(2026-11-27 감사: 목차에 없는 결정 문서 5건이 0건으로 보고됨).
  const relK = (file) => toPosix(relative(knowledgeDir, file));
  const inKnowledge = (file) => !relK(file).startsWith('..');
  const roots = [resolve(knowledgeDir, 'index.md'), resolve(projectDir, 'AGENTS.md')].filter((f) => existsSync(f));
  const reached = new Set(roots);
  const queue = [...roots];
  while (queue.length) {
    const cur = queue.shift();
    const canPass = cur === roots[0] || cur === roots[1] || (inKnowledge(cur) && (isCoreDoc(relK(cur)) || IGNORED_CORE_ORPHANS.has(relK(cur))));
    if (!canPass) continue;
    for (const next of edges.get(cur) || []) {
      if (reached.has(next)) continue;
      reached.add(next);
      if (next.endsWith('.md')) queue.push(next);
    }
  }
  const coreOrphans = files
    .filter((file) => isCoreDoc(relK(file)) && !reached.has(file))
    .map(relK)
    .sort();

  const agentsPath = resolve(projectDir, 'AGENTS.md');
  let agentsLines = 0;
  let agentsBytes = 0;
  let agentsText = '';
  if (existsSync(agentsPath)) {
    agentsText = await readFile(agentsPath, 'utf8');
    agentsLines = agentsText.split(/\r?\n/).length;
    agentsBytes = Buffer.byteLength(agentsText, 'utf8');
  }

  const skillIssues = [];
  for (const skill of PROJECT_SKILLS) {
    if (!aNames.has(skill) && !cNames.has(skill)) skillIssues.push(`필수 스킬 ${skill}: .agents/skills와 .claude/skills 양쪽 모두에 없다`);
  }
  for (const skill of allSkills) {
    const aDir = resolve(projectDir, '.agents', 'skills', skill);
    const cDir = resolve(projectDir, '.claude', 'skills', skill);
    const aHas = existsSync(join(aDir, 'SKILL.md'));
    const cHas = existsSync(join(cDir, 'SKILL.md'));
    if (!aHas && !cHas) continue;
    if (aHas !== cHas) {
      skillIssues.push(`스킬 ${skill}: .agents/skills와 .claude/skills 중 한쪽에만 있다(양쪽 AI가 같은 스킬을 쓰게 맞춘다)`);
      continue;
    }
    const aFiles = await walkAllFiles(aDir);
    const cFiles = await walkAllFiles(cDir);
    if (!EXTERNAL_SKILLS.includes(skill)) {
      const aSkillLines = (aFiles.get('SKILL.md') || '').split(/\r?\n/).length;
      if (aSkillLines > SKILL_MAX_LINES) {
        skillIssues.push(`스킬 ${skill}/SKILL.md가 ${aSkillLines}줄이다(상한 ${SKILL_MAX_LINES}줄)`);
      }
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

  const mistakes = countMistakeRows(agentsText);
  if (mistakes == null && agentsText) warnings.push('AGENTS.md에서 실수 정원표(## 1. 실수 제자리 배치)를 찾지 못했습니다.');

  const blocking = [];
  if (mistakes != null && mistakes > MISTAKE_CAP) {
    blocking.push(`AGENTS.md 실수 정원표가 ${mistakes}개다(정원 ${MISTAKE_CAP}개) — 가장 오래된 것을 자동 검사로 올리거나 보관함으로 옮긴다(wiki-maintenance, 사용자 확인 후)`);
  }
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
    blocking.push(`목차(knowledge/index.md·AGENTS.md)에서 이어지지 않는 핵심 문서 ${coreOrphans.length}건: ${coreOrphans.slice(0, 6).join(', ')}`);
  }
  blocking.push(...skillIssues);

  return {
    ok: blocking.length === 0,
    markdownFiles: files.length,
    agents: {lines: agentsLines, maxLines: AGENTS_MAX_LINES, bytes: agentsBytes, maxBytes: AGENTS_MAX_BYTES, mistakes, mistakeCap: MISTAKE_CAP},
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
