'use strict';

const path = require('node:path');
const { randomUUID } = require('node:crypto');

const CHUNK_SIZE = 500;

const LOAN_TYPE_ALIASES = {
  pl: 'PL',
  'personal loan': 'PL',
  personalloan: 'PL',
  bl: 'BL',
  'business loan': 'BL',
  businessloan: 'BL',
  hl: 'HL',
  'home loan': 'HL',
  homeloan: 'HL',
  lap: 'LAP',
  'loan against property': 'LAP',
  loanagainstproperty: 'LAP',
};

function newDocumentId() {
  return randomUUID().replace(/-/g, '');
}

/**
 * @param {string} raw
 * @returns {boolean|null}
 */
function parseBoolean(raw) {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(v)) return true;
  if (['false', '0', 'no', 'n'].includes(v)) return false;
  return null;
}

/**
 * @param {string} raw
 * @returns {string|null}
 */
function normalizeLoanType(raw) {
  const key = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!key) return null;
  if (LOAN_TYPE_ALIASES[key]) return LOAN_TYPE_ALIASES[key];
  const compact = key.replace(/\s+/g, '');
  return LOAN_TYPE_ALIASES[compact] || null;
}

/**
 * @param {Record<string, string>} values
 * @param {number} lineNumber
 * @param {Set<string>} lenderCodes
 * @param {Set<string>} seenKeys
 */
function validateRow(values, lineNumber, lenderCodes, seenKeys) {
  const lenderCode = String(values.lenderCode ?? '').trim();
  if (!lenderCode) {
    return { ok: false, error: 'lenderCode is required' };
  }
  if (!lenderCodes.has(lenderCode)) {
    return {
      ok: false,
      error: `lenderCode "${lenderCode}" not found in lenders_catalog`,
    };
  }

  const loanType = normalizeLoanType(values.loanType);
  if (!loanType) {
    return {
      ok: false,
      error: `loanType must be PL|BL|HL|LAP (got "${values.loanType ?? ''}")`,
    };
  }

  const coversRaw = values.coversAllPincodes;
  if (coversRaw === undefined || String(coversRaw).trim() === '') {
    return { ok: false, error: 'coversAllPincodes is required' };
  }
  const coversAllPincodes = parseBoolean(coversRaw);
  if (coversAllPincodes === null) {
    return {
      ok: false,
      error: `coversAllPincodes must be true/false (got "${coversRaw}")`,
    };
  }

  let isActive = true;
  if (values.isActive !== undefined && String(values.isActive).trim() !== '') {
    const parsed = parseBoolean(values.isActive);
    if (parsed === null) {
      return {
        ok: false,
        error: `isActive must be true/false (got "${values.isActive}")`,
      };
    }
    isActive = parsed;
  }

  const zipRaw = String(values.zipCode ?? '').trim();
  /** @type {number|null} */
  let zipCode = null;

  if (coversAllPincodes) {
    if (zipRaw !== '') {
      return {
        ok: false,
        error: 'zipCode must be empty when coversAllPincodes=true',
      };
    }
  } else {
    if (!/^\d{6}$/.test(zipRaw)) {
      return {
        ok: false,
        error: `zipCode must be a 6-digit PIN when coversAllPincodes=false (got "${zipRaw}")`,
      };
    }
    zipCode = Number(zipRaw);
  }

  const dedupeKey = coversAllPincodes
    ? `all|${lenderCode}|${loanType}`
    : `zip|${lenderCode}|${zipCode}|${loanType}`;
  if (seenKeys.has(dedupeKey)) {
    return {
      ok: false,
      error: `duplicate key in CSV for ${dedupeKey}`,
    };
  }
  seenKeys.add(dedupeKey);

  return {
    ok: true,
    row: {
      lineNumber,
      lenderCode,
      loanType,
      zipCode,
      coversAllPincodes,
      isActive,
    },
  };
}

/**
 * @param {import('pg').PoolClient} client
 * @param {object} row
 * @returns {Promise<'inserted'|'updated'>}
 */
async function upsertOne(client, row) {
  if (row.coversAllPincodes) {
    const existing = await client.query(
      `SELECT id FROM zip_codes_to_lenders
       WHERE lender_code = $1
         AND loan_type = $2
         AND covers_all_pincodes = true
         AND zip_code IS NULL
       LIMIT 1`,
      [row.lenderCode, row.loanType]
    );
    if (existing.rowCount > 0) {
      await client.query(
        `UPDATE zip_codes_to_lenders
         SET covers_all_pincodes = $1,
             is_active = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [true, row.isActive, existing.rows[0].id]
      );
      return 'updated';
    }
    await client.query(
      `INSERT INTO zip_codes_to_lenders (
         document_id, lender_code, loan_type, zip_code,
         covers_all_pincodes, is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, NULL, true, $4, NOW(), NOW())`,
      [newDocumentId(), row.lenderCode, row.loanType, row.isActive]
    );
    return 'inserted';
  }

  const existing = await client.query(
    `SELECT id FROM zip_codes_to_lenders
     WHERE lender_code = $1
       AND zip_code = $2
       AND loan_type = $3
     LIMIT 1`,
    [row.lenderCode, row.zipCode, row.loanType]
  );
  if (existing.rowCount > 0) {
    await client.query(
      `UPDATE zip_codes_to_lenders
       SET covers_all_pincodes = $1,
           is_active = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [false, row.isActive, existing.rows[0].id]
    );
    return 'updated';
  }
  await client.query(
    `INSERT INTO zip_codes_to_lenders (
       document_id, lender_code, loan_type, zip_code,
       covers_all_pincodes, is_active, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, false, $5, NOW(), NOW())`,
    [newDocumentId(), row.lenderCode, row.loanType, row.zipCode, row.isActive]
  );
  return 'inserted';
}

/**
 * @param {object} ctx
 */
async function processFile(ctx) {
  const {
    pool,
    headers,
    rows,
    fileName,
    dryRun,
    logger,
    logsDir,
    stamp,
    writeErrorsCsv,
  } = ctx;

  const lenderRes = await pool.query(
    `SELECT lender_code FROM lenders_catalog WHERE lender_code IS NOT NULL`
  );
  const lenderCodes = new Set(lenderRes.rows.map((r) => r.lender_code));

  const seenKeys = new Set();
  /** @type {object[]} */
  const valid = [];
  /** @type {Array<{ lineNumber: number, error: string, values: Record<string, string> }>} */
  const rejected = [];

  for (const { lineNumber, values } of rows) {
    const result = validateRow(values, lineNumber, lenderCodes, seenKeys);
    if (!result.ok) {
      rejected.push({ lineNumber, error: result.error, values });
      logger.warn(`Row ${lineNumber} rejected — ${result.error}`);
      continue;
    }
    valid.push(result.row);
  }

  let inserted = 0;
  let updated = 0;

  if (!dryRun && valid.length > 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < valid.length; i += CHUNK_SIZE) {
        const chunk = valid.slice(i, i + CHUNK_SIZE);
        for (const row of chunk) {
          const action = await upsertOne(client, row);
          if (action === 'inserted') inserted += 1;
          else updated += 1;
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } else if (dryRun) {
    logger.info(
      `Dry run — skipped database writes for ${valid.length} valid row(s)`
    );
  }

  if (rejected.length > 0) {
    const errPath = path.join(
      logsDir,
      `${path.basename(fileName, path.extname(fileName))}_${stamp}_errors.csv`
    );
    writeErrorsCsv(errPath, headers, rejected);
    logger.info(
      `Wrote ${rejected.length} rejected row(s) to ${path.basename(errPath)}`
    );
  }

  return {
    rowCount: rows.length,
    valid: valid.length,
    rejected: rejected.length,
    inserted: dryRun ? 0 : inserted,
    updated: dryRun ? 0 : updated,
    dryRun,
    moveToProcessed: true,
  };
}

module.exports = {
  name: 'zipcodes',
  table: 'zip_codes_to_lenders',
  requiredHeaders: ['lenderCode', 'loanType', 'coversAllPincodes'],
  processFile,
  // exported for unit-style reuse / tests
  validateRow,
  normalizeLoanType,
  parseBoolean,
};
