'use strict';

const fs = require('node:fs');

/**
 * Split a CSV line respecting double-quoted fields.
 * @param {string} line
 * @returns {string[]}
 */
function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/**
 * Normalize header to camelCase key.
 * lender_code / Lender Code / lenderCode → lenderCode
 * @param {string} header
 * @returns {string}
 */
function normalizeHeader(header) {
  const raw = String(header || '')
    .replace(/^\uFEFF/, '')
    .trim();
  if (!raw) return '';
  const snake = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s\-]+/g, '_')
    .toLowerCase();
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Parse a flat CSV file into { headers, rows } where each row is
 * { lineNumber, values: Record<string,string> }.
 * @param {string} filePath
 * @returns {{ headers: string[], rows: Array<{ lineNumber: number, values: Record<string, string> }> }}
 */
function parseCsvFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l, idx, arr) => {
    if (l.trim() === '' && idx === arr.length - 1) return false;
    return true;
  });

  if (lines.length === 0) {
    throw new Error('CSV is empty');
  }

  const headerCells = splitCsvLine(lines[0]).map((h) => normalizeHeader(h));
  if (headerCells.every((h) => !h)) {
    throw new Error('CSV header row is empty');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = splitCsvLine(line);
    /** @type {Record<string, string>} */
    const values = {};
    for (let c = 0; c < headerCells.length; c += 1) {
      const key = headerCells[c];
      if (!key) continue;
      values[key] = cells[c] !== undefined ? String(cells[c]).trim() : '';
    }
    rows.push({ lineNumber: i + 1, values });
  }

  return { headers: headerCells.filter(Boolean), rows };
}

/**
 * Write a simple errors CSV (lineNumber,error,...original columns).
 * @param {string} filePath
 * @param {string[]} headers
 * @param {Array<{ lineNumber: number, error: string, values: Record<string, string> }>} errors
 */
function writeErrorsCsv(filePath, headers, errors) {
  const cols = ['lineNumber', 'error', ...headers];
  const escape = (v) => {
    const s = String(v ?? '');
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [cols.join(',')];
  for (const err of errors) {
    const row = [
      err.lineNumber,
      err.error,
      ...headers.map((h) => err.values[h] ?? ''),
    ].map(escape);
    lines.push(row.join(','));
  }
  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

module.exports = {
  splitCsvLine,
  normalizeHeader,
  parseCsvFile,
  writeErrorsCsv,
};
