/**
 * Express router for /lender-pincode-tester (mounted on suite :4100).
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './db.js';
import { normalizeLoanTypeCode, isPlOrBl } from './loan-type.js';

const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');

const CRITERIA_TABLE = {
  PL: 'lenders_criteria_pl',
  BL: 'lenders_criteria_bl',
};

/**
 * @returns {import('express').Router}
 */
export function createLenderPincodeTesterRouter() {
  const router = express.Router();

  router.get('/api/products', async (_req, res) => {
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT id, title, is_active AS "isActive"
         FROM products
         WHERE COALESCE(is_active, true) = true
         ORDER BY title ASC`
      );
      const products = rows.map((r) => {
        const loanType = normalizeLoanTypeCode(r.title);
        return {
          id: r.id,
          title: r.title,
          loanType,
          supported: isPlOrBl(loanType),
        };
      });
      return res.json({ products });
    } catch (err) {
      console.error('[lender-pincode-tester] products', err?.message || err);
      return res.status(500).json({ error: 'Failed to load products' });
    }
  });

  router.get('/api/lenders', async (req, res) => {
    const loanType = normalizeLoanTypeCode(req.query.loanType);
    if (!isPlOrBl(loanType)) {
      return res.status(400).json({
        error: 'loanType must be PL or BL',
        lenders: [],
      });
    }
    const table = CRITERIA_TABLE[loanType];
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT c.lender_code AS "lenderCode",
                COALESCE(cat.lender_name, c.lender_code) AS "lenderName"
         FROM ${table} c
         LEFT JOIN lenders_catalog cat
           ON cat.lender_code = c.lender_code
         WHERE c.is_active = true
           AND (cat.id IS NULL OR cat.is_active = true)
         ORDER BY COALESCE(cat.lender_name, c.lender_code) ASC, c.lender_code ASC`
      );
      return res.json({ loanType, lenders: rows });
    } catch (err) {
      console.error('[lender-pincode-tester] lenders', err?.message || err);
      return res.status(500).json({ error: 'Failed to load lenders', lenders: [] });
    }
  });

  router.get('/api/check', async (req, res) => {
    const loanType = normalizeLoanTypeCode(req.query.loanType);
    const lenderCode = String(req.query.lenderCode ?? '').trim();
    const zipRaw = String(req.query.zipCode ?? '').trim();

    if (!isPlOrBl(loanType)) {
      return res.status(400).json({
        available: false,
        message: 'Select Personal Loan or Business Loan as Product Type.',
      });
    }
    if (!lenderCode) {
      return res.status(400).json({
        available: false,
        message: 'Select a lender.',
      });
    }
    if (!/^\d+$/.test(zipRaw)) {
      return res.status(400).json({
        available: false,
        message: 'Zip code must be an integer (digits only).',
      });
    }

    const zipCode = Number(zipRaw);
    try {
      const pool = getPool();
      const { rows } = await pool.query(
        `SELECT id, lender_code AS "lenderCode", loan_type AS "loanType",
                zip_code AS "zipCode", covers_all_pincodes AS "coversAllPincodes",
                is_active AS "isActive"
         FROM zip_codes_to_lenders
         WHERE lender_code = $1
           AND loan_type = $2
           AND is_active = true
           AND (covers_all_pincodes = true OR zip_code = $3)
         LIMIT 5`,
        [lenderCode, loanType, zipCode]
      );

      if (rows.length === 0) {
        return res.json({
          available: false,
          message: `Not available — pincode ${zipCode} is not covered for lender ${lenderCode} (${loanType}).`,
          loanType,
          lenderCode,
          zipCode,
          matches: [],
        });
      }

      const nationwide = rows.some((r) => r.coversAllPincodes === true);
      return res.json({
        available: true,
        message: nationwide
          ? `Available — lender ${lenderCode} covers all pincodes for ${loanType}.`
          : `Available — pincode ${zipCode} is covered for lender ${lenderCode} (${loanType}).`,
        loanType,
        lenderCode,
        zipCode,
        matches: rows,
      });
    } catch (err) {
      console.error('[lender-pincode-tester] check', err?.message || err);
      return res.status(500).json({
        available: false,
        message: 'Failed to check pincode coverage.',
      });
    }
  });

  router.get('/', (_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  router.use(express.static(PUBLIC_DIR, { index: false }));

  return router;
}
