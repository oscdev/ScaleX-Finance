/**
 * Default Live Run pool cursor (one row per no-file Start).
 */

import fs from 'node:fs';
import path from 'node:path';
import { getDocHashRingPath } from './paths.js';

function loadRing() {
  const ringPath = getDocHashRingPath();
  if (!fs.existsSync(ringPath)) return { defaultIndex: {} };
  try {
    const data = JSON.parse(fs.readFileSync(ringPath, 'utf8'));
    return {
      defaultIndex:
        data?.defaultIndex && typeof data.defaultIndex === 'object' ? data.defaultIndex : {},
    };
  } catch {
    return { defaultIndex: {} };
  }
}

function saveRing(data) {
  const ringPath = getDocHashRingPath();
  fs.mkdirSync(path.dirname(ringPath), { recursive: true });
  fs.writeFileSync(ringPath, `${JSON.stringify(data, null, 2)}\n`);
}

/** Next row among the default CSV pool (one lead per no-file Start). */
export function takeNextDefaultRow(rows, productId) {
  if (!Array.isArray(rows) || !rows.length) {
    throw new Error('Default CSV has no data rows');
  }
  const data = loadRing();
  const prev = Number(data.defaultIndex?.[productId] || 0);
  const index = prev % rows.length;
  data.defaultIndex = { ...(data.defaultIndex || {}), [productId]: index + 1 };
  saveRing(data);
  const row = rows[index];
  return [{ ...row, rowNumber: row.rowNumber || index + 1 }];
}
