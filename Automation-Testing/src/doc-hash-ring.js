/**
 * Default Live Run pool cursor (one row per no-file Start).
 */

import fs from 'node:fs';
import path from 'node:path';
import { DOC_HASH_RING_PATH } from './paths.js';

function loadRing() {
  if (!fs.existsSync(DOC_HASH_RING_PATH)) return { defaultIndex: {} };
  try {
    const data = JSON.parse(fs.readFileSync(DOC_HASH_RING_PATH, 'utf8'));
    return {
      defaultIndex:
        data?.defaultIndex && typeof data.defaultIndex === 'object' ? data.defaultIndex : {},
    };
  } catch {
    return { defaultIndex: {} };
  }
}

function saveRing(data) {
  fs.mkdirSync(path.dirname(DOC_HASH_RING_PATH), { recursive: true });
  fs.writeFileSync(DOC_HASH_RING_PATH, `${JSON.stringify(data, null, 2)}\n`);
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
