import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Repo root (parent of frontend/). */
export function getRepoRoot(): string {
  const fromFrontend = path.resolve(process.cwd(), '..');
  if (fs.existsSync(path.join(fromFrontend, 'Data-Import-Manager'))) {
    return fromFrontend;
  }
  if (fs.existsSync(path.join(process.cwd(), 'Data-Import-Manager'))) {
    return process.cwd();
  }
  return fromFrontend;
}

export function getManagerRoot(): string {
  return path.join(getRepoRoot(), 'Data-Import-Manager');
}

export function getDatasetRoot(datasetDir: string): string {
  return path.join(getManagerRoot(), datasetDir);
}

type JobResult = {
  ok: boolean;
  exitCode?: number;
  error?: string;
  [key: string]: unknown;
};

/**
 * Run Data-Import-Manager/run-job.js with root Node (uses root pg + .env).
 */
export function runDimJob(args: string[]): Promise<JobResult> {
  const repoRoot = getRepoRoot();
  const script = path.join(repoRoot, 'Data-Import-Manager', 'run-job.js');

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: repoRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => {
      stdout += String(c);
    });
    child.stderr.on('data', (c) => {
      stderr += String(c);
    });
    child.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });
    child.on('close', (code) => {
      const text = stdout.trim() || stderr.trim();
      try {
        const parsed = JSON.parse(text) as JobResult;
        resolve(parsed);
      } catch {
        resolve({
          ok: code === 0,
          exitCode: code ?? 1,
          error: text || `run-job exited with code ${code}`,
        });
      }
    });
  });
}

export function safeLogName(name: string): string | null {
  const base = path.basename(String(name || ''));
  if (!base || base.includes('..')) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  return base;
}

/** Static path map kept in sync with Data-Import-Manager/lib/importers-registry.js */
export const DATASET_DIRS: Record<string, string> = {
  zipcodes: 'table/zipcodes',
};

export function resolveLogsDir(importerName: string): string {
  const rel = DATASET_DIRS[importerName] || DATASET_DIRS.zipcodes;
  return path.join(getDatasetRoot(rel), 'logs');
}

export function resolveUploadDir(importerName: string): string {
  const rel = DATASET_DIRS[importerName] || DATASET_DIRS.zipcodes;
  return path.join(getDatasetRoot(rel), 'upload');
}
