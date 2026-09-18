/**
 * Suite error / warning logger — file + console (no request bodies / PII blobs).
 * Path: Automation-Testing/reports/errors/suite-errors_YYYY-MM-DD.log
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPORTS_DIR } from '../paths.js';

const ERRORS_DIR = path.join(REPORTS_DIR, 'errors');
const STACK_MAX = 4000;

function utcDayStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function truncateStack(stack) {
  if (!stack) return undefined;
  const s = String(stack);
  return s.length > STACK_MAX ? `${s.slice(0, STACK_MAX)}…` : s;
}

/**
 * @param {object} entry
 * @param {'error'|'warn'} [entry.level]
 * @param {string} [entry.route]
 * @param {string} [entry.method]
 * @param {number} [entry.status]
 * @param {string} [entry.message]
 * @param {string} [entry.code]
 * @param {string} [entry.stack]
 * @param {string} [entry.product]
 * @param {string} [entry.runId]
 */
export function logSuiteError(entry = {}) {
  const level = entry.level === 'warn' ? 'warn' : 'error';
  const row = {
    timestamp: new Date().toISOString(),
    level,
    route: entry.route || undefined,
    method: entry.method || undefined,
    status: entry.status != null ? Number(entry.status) : undefined,
    message: entry.message ? String(entry.message).slice(0, 2000) : 'Unknown error',
    code: entry.code || undefined,
    product: entry.product || undefined,
    runId: entry.runId || undefined,
    stack: truncateStack(entry.stack),
  };

  const line = JSON.stringify(row);
  try {
    fs.mkdirSync(ERRORS_DIR, { recursive: true });
    const file = path.join(ERRORS_DIR, `suite-errors_${utcDayStamp()}.log`);
    fs.appendFileSync(file, `${line}\n`, 'utf8');
  } catch (writeErr) {
    console.error('[SUITE] failed to write error log file:', writeErr?.message || writeErr);
  }

  const prefix = `[SUITE] ${level.toUpperCase()} ${row.status ?? ''} ${row.method || ''} ${row.route || ''}`.trim();
  if (level === 'warn') {
    console.warn(prefix, row.message, row.code || '');
  } else {
    console.error(prefix, row.message, row.code || '');
    if (row.stack) console.error(row.stack);
  }

  return row;
}

export function logSuiteHttpError(req, err, status, extra = {}) {
  return logSuiteError({
    level: status >= 500 ? 'error' : 'warn',
    route: req?.originalUrl || req?.url || extra.route,
    method: req?.method,
    status,
    message: err?.message || String(err) || 'Request failed',
    code: err?.code || extra.code,
    stack: err?.stack,
    product: extra.product,
    runId: extra.runId,
  });
}

export { ERRORS_DIR };
