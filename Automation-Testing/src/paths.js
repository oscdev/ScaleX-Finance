import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..');
export const REPORTS_DIR = path.join(PACKAGE_ROOT, 'reports');
export const FIXTURES_DIR = path.join(PACKAGE_ROOT, 'fixtures');
export const PUBLIC_DIR = path.join(PACKAGE_ROOT, 'public');
export const CONFIG_DIR = path.join(PACKAGE_ROOT, 'config');
export const DOCUMENTS_DIR = path.join(PACKAGE_ROOT, 'documents');
export const UPLOAD_DIR = path.join(DOCUMENTS_DIR, 'upload');
export const DOC_HASH_RING_PATH = path.join(UPLOAD_DIR, '.last-doc-hashes.json');

function assertProductId(productId) {
  if (!['personal-loan', 'business-loan'].includes(productId)) {
    throw new Error('product must be personal-loan or business-loan');
  }
  return productId;
}

export function defaultProductDir(productId) {
  return path.join(DOCUMENTS_DIR, 'default', assertProductId(productId));
}

export function defaultCsvPath(productId) {
  return path.join(defaultProductDir(productId), `sample-default-${productId}.csv`);
}

export function defaultExampleCsvPath(productId) {
  return path.join(defaultProductDir(productId), 'live-run.example.csv');
}

export function uploadProductDir(productId) {
  return path.join(UPLOAD_DIR, assertProductId(productId));
}

export function uploadCsvPath(productId) {
  return path.join(uploadProductDir(productId), 'live-run.csv');
}

export function reportProductDir(productId) {
  return path.join(REPORTS_DIR, 'runs', assertProductId(productId));
}

/** Remove files in the product report folder (directory itself is kept). */
export function clearReportProductDir(productId) {
  const dir = reportProductDir(productId);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
  return dir;
}

export function reportArtifactNames({ rowCount = 1, csvRowNumber } = {}) {
  const multi = Number(rowCount) > 1;
  const n = Number(csvRowNumber) || 1;
  if (multi) {
    return {
      reportFile: `report-row-${n}.html`,
      runFile: `run-row-${n}.json`,
      eventsFile: `events-row-${n}.json`,
    };
  }
  return {
    reportFile: 'report.html',
    runFile: 'run.json',
    eventsFile: 'events.json',
  };
}
