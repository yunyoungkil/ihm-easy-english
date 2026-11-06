import { existsSync, readdirSync, statSync, watch } from 'node:fs';
import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { join, resolve, basename, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Extract a zip file into a target directory using PowerShell / tar
 */
export async function extractZip(zipPath, targetDir) {
  await mkdir(targetDir, { recursive: true });
  // 파일 이름을 명령 문자열에 끼워 넣지 않는다. PowerShell은 곡선 따옴표(’)도 따옴표로 읽어서,
  // Downloads에 받은 zip의 이름만으로 명령이 실행될 수 있었다. 경로는 환경 변수로만 넘긴다.
  try {
    await execFileAsync('powershell', [
      '-NoProfile', '-NonInteractive', '-Command',
      'Expand-Archive -LiteralPath $env:INGEST_ZIP_PATH -DestinationPath $env:INGEST_TARGET_DIR -Force',
    ], { env: { ...process.env, INGEST_ZIP_PATH: zipPath, INGEST_TARGET_DIR: targetDir } });
    return true;
  } catch (err) {
    // Fallback to tar if powershell failed
    try {
      await execFileAsync('tar', ['-xf', zipPath, '-C', targetDir]);
      return true;
    } catch (tarErr) {
      throw new Error(`압축 해제 실패: ${err.message} (tar: ${tarErr.message})`);
    }
  }
}

/**
 * Check if a folder or its immediate children contain '표 데이터.csv'
 */
export async function findStudioCsvInDir(dir) {
  if (!existsSync(dir)) return null;
  const directPath = join(dir, '표 데이터.csv');
  if (existsSync(directPath)) return dir;

  // Check 1 level subdirectories
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPath = join(dir, entry.name, '표 데이터.csv');
      if (existsSync(subPath)) return join(dir, entry.name);
    }
  }
  return null;
}

/**
 * Ingest a zip file from Downloads into imports/youtube-studio
 */
export async function ingestZipFile(zipPath, studioExportDir) {
  const fileName = basename(zipPath);
  if (!fileName.endsWith('.zip')) return null;

  // Ignore incomplete browser downloads
  if (fileName.includes('.crdownload') || fileName.includes('.tmp')) return null;

  const tempExtractDir = join(studioExportDir, '.temp-extract-' + Date.now());
  try {
    await extractZip(zipPath, tempExtractDir);
    const validDataDir = await findStudioCsvInDir(tempExtractDir);
    if (!validDataDir) {
      // Not a studio export zip
      await rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
      return null;
    }

    // Determine final folder name from zip name or subfolder
    let folderName = fileName.replace(/\.zip$/i, '');
    // If the zip was generic (e.g. '표 데이터.zip') but extracted folder has content name
    if (validDataDir !== tempExtractDir) {
      const subName = basename(validDataDir);
      if (subName.startsWith('콘텐츠')) {
        folderName = subName;
      }
    }

    const finalTargetDir = join(studioExportDir, folderName);
    await mkdir(finalTargetDir, { recursive: true });

    // Copy CSV files to final target dir
    const files = readdirSync(validDataDir);
    let copiedCount = 0;
    for (const f of files) {
      if (f.endsWith('.csv') || f.endsWith('.txt')) {
        await copyFile(join(validDataDir, f), join(finalTargetDir, f));
        copiedCount++;
      }
    }

    // Clean up temporary extraction directory
    await rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});

    if (copiedCount > 0) {
      console.log(`[Auto-Ingest] ✅ 다운로드 폴더에서 YouTube Studio CSV 자동 수집 완료: ${folderName}`);
      return { folderName, finalTargetDir, originalZip: zipPath };
    }
  } catch (err) {
    console.error(`[Auto-Ingest] ❌ ZIP 수집 실패 (${fileName}):`, err.message);
    await rm(tempExtractDir, { recursive: true, force: true }).catch(() => {});
  }
  return null;
}

/**
 * Scan Downloads directory for existing or newly downloaded Studio ZIP files
 */
export async function scanDownloadsDirectory(downloadsDir, studioExportDir) {
  if (!existsSync(downloadsDir) || !existsSync(studioExportDir)) return [];
  const entries = readdirSync(downloadsDir);
  const ingested = [];

  for (const entry of entries) {
    if (!entry.endsWith('.zip')) continue;
    // Check if zip name matches YouTube Studio patterns
    const isStudioZip = entry.startsWith('콘텐츠 ') || entry.startsWith('표 데이터') || entry.includes('_2026-');
    if (!isStudioZip) continue;

    const fullPath = join(downloadsDir, entry);
    try {
      const stats = statSync(fullPath);
      // Ignore if file was modified more than 7 days ago unless forced
      if (Date.now() - stats.mtimeMs > 7 * 86400000) continue;

      const res = await ingestZipFile(fullPath, studioExportDir);
      if (res) ingested.push(res);
    } catch {}
  }
  return ingested;
}

/**
 * Start real-time file watcher on Downloads and imports/youtube-studio
 */
export function startStudioWatcher({
  downloadsDir = join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads'),
  studioExportDir,
  onIngest = () => {},
}) {
  if (!studioExportDir) throw new Error('studioExportDir is required');

  let debounceTimer = null;
  const processedFiles = new Set();

  const handleFileChange = (dir, filename) => {
    if (!filename) return;
    const isZip = filename.endsWith('.zip');
    const isCsv = filename.endsWith('.csv');
    if (!isZip && !isCsv) return;
    if (filename.includes('.crdownload') || filename.includes('.tmp')) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const fullPath = join(dir, filename);
        if (!existsSync(fullPath)) return;

        if (isZip && dir === downloadsDir) {
          const isStudioPattern = filename.startsWith('콘텐츠 ') || filename.startsWith('표 데이터') || filename.includes('_2026-');
          if (isStudioPattern && !processedFiles.has(fullPath)) {
            processedFiles.add(fullPath);
            const res = await ingestZipFile(fullPath, studioExportDir);
            if (res) {
              onIngest({ type: 'zip-ingested', ...res });
            }
          }
        } else if (dir === studioExportDir) {
          onIngest({ type: 'studio-folder-changed', filename });
        }
      } catch (err) {
        console.error('[Auto-Ingest Watcher] Error:', err.message);
      }
    }, 1000);
  };

  const watchers = [];

  // 1. Watch Downloads folder
  if (existsSync(downloadsDir)) {
    try {
      const w1 = watch(downloadsDir, (eventType, filename) => {
        handleFileChange(downloadsDir, filename);
      });
      watchers.push(w1);
      console.log(`[Auto-Ingest] 👁️ 다운로드 폴더 실시간 감시 시작: ${downloadsDir}`);
    } catch (err) {
      console.warn(`[Auto-Ingest] 다운로드 폴더 감시 실패: ${err.message}`);
    }
  }

  // 2. Watch imports/youtube-studio folder
  if (existsSync(studioExportDir)) {
    try {
      const w2 = watch(studioExportDir, { recursive: true }, (eventType, filename) => {
        if (filename && !filename.startsWith('.temp')) {
          handleFileChange(studioExportDir, filename);
        }
      });
      watchers.push(w2);
      console.log(`[Auto-Ingest] 👁️ Studio 가져오기 폴더 실시간 감시 시작: ${studioExportDir}`);
    } catch (err) {
      console.warn(`[Auto-Ingest] Studio 폴더 감시 실패: ${err.message}`);
    }
  }

  // Initial scan of downloads directory on startup
  scanDownloadsDirectory(downloadsDir, studioExportDir).then((ingested) => {
    if (ingested.length > 0) {
      onIngest({ type: 'initial-scan', count: ingested.length, items: ingested });
    }
  }).catch(() => {});

  return {
    stop: () => watchers.forEach(w => { try { w.close(); } catch {} }),
    scanNow: () => scanDownloadsDirectory(downloadsDir, studioExportDir),
  };
}
