import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ROOT = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..');
export const REPORTS_DIR = path.join(PACKAGE_ROOT, 'reports');
export const FIXTURES_DIR = path.join(PACKAGE_ROOT, 'fixtures');
export const PUBLIC_DIR = path.join(PACKAGE_ROOT, 'public');
export const CONFIG_DIR = path.join(PACKAGE_ROOT, 'config');
