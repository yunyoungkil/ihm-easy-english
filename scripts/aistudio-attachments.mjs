// Google AI Studio 자동화(그림 generate-aistudio-image.mjs, 영상 generate-aistudio-video.mjs)가 같이 쓰는 도우미(2026-11-21).
// 참고 그림 여러 장 첨부, 첫·끝 장면 안내 문장, 지시문 기록 파일(<결과>.prompt.json) 저장을 맡는다.
//
// 화면 확인(2026-11-21): 두 화면 모두 프롬프트 칸 옆에 button[aria-label="Insert images, videos, or files"] 하나가 있고
// 누르면 메뉴에 "Upload files"가 뜬다. 숨은 input[type=file]은 하나(multiple, image/* video/*).
// Omni 화면에는 첫 장면·끝 장면 전용 칸이 없다 → 첨부 순서(첫 장면이 1번, 끝 장면이 마지막)와 지시문 문장으로 알려 준다.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp'];
export const VIDEO_EXT = ['mp4', 'mov', 'webm'];
export const TAKE_STATUSES = ['candidate', 'chosen', 'rejected'];

const INSERT_BUTTON = 'button[aria-label="Insert images, videos, or files"]';
const UPLOAD_MENU = '.cdk-overlay-container [role="menuitem"]:has-text("Upload"), .cdk-overlay-container button:has-text("Upload")';

function extOf(path) {
  const m = String(path).match(/\.([A-Za-z0-9]+)$/);
  return m ? m[1].toLowerCase() : '';
}

/** 첨부할 참고 파일이 있고 허용된 확장자인지 확인한다. 통과하면 path를 그대로 돌려준다. */
export function checkRefFile(path, allowedExt, flag) {
  if (!path || !existsSync(resolve(path))) throw new Error(`${flag} 파일을 찾지 못했습니다: ${path}`);
  if (!allowedExt.includes(extOf(path))) throw new Error(`${flag} 파일 형식은 ${allowedExt.join(', ')} 중 하나여야 합니다: ${path}`);
  return path;
}

/** --prompt 또는 --prompt-file 중 하나로 지시문을 받는다. 빈 결과는 호출한 쪽이 "--prompt가 필요합니다"로 막는다. */
export function readPromptArgs({ prompt, promptFile }) {
  if (prompt && promptFile) throw new Error('--prompt와 --prompt-file은 하나만 줄 수 있습니다');
  if (promptFile) {
    if (!existsSync(resolve(promptFile))) throw new Error(`--prompt-file 파일을 찾지 못했습니다: ${promptFile}`);
    return readFileSync(resolve(promptFile), 'utf8').trim();
  }
  return prompt || '';
}

/** 첨부 순서: 첫 장면 → 참고들(준 순서대로) → 끝 장면. 빈 값은 뺀다. */
export function orderAttachments({ first = '', refs = [], last = '' } = {}) {
  const list = [];
  if (first) list.push({ path: first, role: 'first' });
  for (const p of refs) if (p) list.push({ path: p, role: 'ref' });
  if (last) list.push({ path: last, role: 'last' });
  return list;
}

/** 첫·끝 장면이 있으면 그 사실을 알리는 영어 한 줄. 번호는 1부터 세는 첨부 순서다. */
export function framePromptPrefix(attachments) {
  const n = attachments.length;
  const hasFirst = attachments.some((a) => a.role === 'first');
  const hasLast = attachments.some((a) => a.role === 'last');
  if (!hasFirst && !hasLast) return '';
  let line;
  if (hasFirst && hasLast) line = `Attached image 1 is the opening frame and attached image ${n} is the final frame; animate from the first to the last.`;
  else if (hasFirst) line = 'Attached image 1 is the opening frame of the video.';
  else line = `Attached image ${n} is the final frame of the video.`;
  if (attachments.some((a) => a.role === 'ref')) line += ' Other attached files are references.';
  return line;
}

export function composePrompt(prefix, prompt) {
  return prefix ? `${prefix}\n\n${prompt}` : prompt;
}

export function sha256Prefix(filePath) {
  return createHash('sha256').update(readFileSync(resolve(filePath))).digest('hex').slice(0, 16);
}

function relPosix(path, cwd) {
  return relative(cwd, resolve(cwd, path)).replace(/\\/g, '/');
}

/** 노드 계보 인자 검증(--parent, --changed-var, --status). 셋 다 비어 있으면 null을 돌려준다. */
export function parseLineageArgs({ parent = '', changedVar = '', status = '' } = {}) {
  const cleanParent = parent ? checkRefFile(parent, [...IMAGE_EXT, ...VIDEO_EXT], '--parent') : '';
  const cleanVar = String(changedVar || '').trim();
  const cleanStatus = String(status || '').trim();
  if (cleanStatus && !TAKE_STATUSES.includes(cleanStatus)) {
    throw new Error(`--status는 ${TAKE_STATUSES.join(', ')} 중 하나여야 합니다`);
  }
  if (!cleanParent && !cleanVar && !cleanStatus) return null;
  return {
    parent: cleanParent || null,
    changedVar: cleanVar || null,
    status: cleanStatus || 'candidate',
  };
}

/** 지시문 기록(순수 함수). attachments 각 항목의 sha256이 이미 들어 있으면 그대로 쓰고 없으면 null. */
export function buildPromptRecord({ tool, model, prompt, promptFile = null, attachments = [], settings = {}, output = {}, lineage = null, cwd = process.cwd(), now = new Date() }) {
  const rec = {
    tool,
    model,
    createdAt: now.toISOString(),
    prompt,
    promptFile: promptFile ? relPosix(promptFile, cwd) : null,
    attachments: attachments.map((a, i) => ({
      order: i + 1,
      role: a.role,
      path: relPosix(a.path, cwd),
      sha256: a.sha256 ?? null,
    })),
    settings,
    output: { ...output, file: relPosix(output.file, cwd) },
  };
  if (lineage && (lineage.parent || lineage.changedVar || lineage.status)) {
    rec.lineage = {
      parent: lineage.parent ? relPosix(lineage.parent, cwd) : null,
      parentSha256: lineage.parent ? (lineage.parentSha256 ?? null) : null,
      changedVar: lineage.changedVar || null,
      status: lineage.status || 'candidate',
    };
  }
  return rec;
}

/** 폴더 아래의 *.prompt.json을 모아 앵커→파생 노드 계보 트리를 만든다. */
export function readLineageTree(dir, cwd = process.cwd()) {
  const absDir = resolve(dir);
  if (!existsSync(absDir)) throw new Error(`계보 폴더를 찾지 못했습니다: ${dir}`);
  const recordFiles = [];
  const walk = (d) => {
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('.prompt.json')) recordFiles.push(full);
    }
  };
  walk(absDir);
  recordFiles.sort();

  const nodes = [];
  const byOutput = new Map();
  for (const rf of recordFiles) {
    const raw = JSON.parse(readFileSync(rf, 'utf8'));
    const file = raw?.output?.file || relPosix(rf.replace(/\.prompt\.json$/, ''), cwd);
    const node = {
      file,
      recordFile: relPosix(rf, cwd),
      tool: raw.tool || null,
      model: raw.model || null,
      createdAt: raw.createdAt || null,
      parent: raw.lineage?.parent || null,
      changedVar: raw.lineage?.changedVar || null,
      status: raw.lineage?.status || 'candidate',
      children: [],
    };
    nodes.push(node);
    byOutput.set(file, node);
  }
  const roots = [];
  for (const node of nodes) {
    const p = node.parent && byOutput.get(node.parent);
    if (p && p !== node) p.children.push(node);
    else roots.push(node);
  }
  return { nodes, roots };
}

export function recordPathFor(file) {
  return `${file}.prompt.json`;
}

export function writePromptRecord(file, record) {
  const path = recordPathFor(file);
  writeFileSync(path, JSON.stringify(record, null, 2) + '\n');
  return path;
}

/** 첨부를 한 장씩 순서대로 올린다(순서가 중요하다). 브라우저 동작이라 단위 테스트는 하지 않는다. */
export async function attachFiles(page, attachments, { insertButton = INSERT_BUTTON } = {}) {
  for (const { path } of attachments) {
    const abs = resolve(path);
    await page.locator(insertButton).first().click();
    await page.waitForTimeout(800);
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null),
      page.locator(UPLOAD_MENU).first().click().catch(() => {}),
    ]);
    if (chooser) {
      await chooser.setFiles(abs);
    } else {
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count()) await fileInput.setInputFiles(abs);
      else throw new Error('이미지 업로드 입력칸을 찾지 못했습니다');
    }
    // 메뉴가 남아 있으면 닫는다
    if (await page.locator('.cdk-overlay-container [role="menuitem"]').count()) await page.keyboard.press('Escape');
    await page.waitForTimeout(VIDEO_EXT.includes(extOf(path)) ? 6000 : 2500);
  }
}
