/**
 * Stage CSV Upload PDFs in a temp dir and resolve CSV filename columns.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { uploadCsvPath } from './paths.js';

export const CSV_DOCS_PAIR_ERROR =
  'CSV and Documents must be attached together. Leave both empty to run one lead from the default pool.';

export const DOC_COLUMN_MAP = {
  aadhaar_front: { field: 'aadharCardFront', multi: false },
  aadhaar_back: { field: 'aadharCardBack', multi: false },
  pan: { field: 'panCard', multi: false },
  cibil: { field: 'cibilReport', multi: false },
  bank_statement: { field: 'bankStatement', multi: false },
  salary_slip: { field: 'salarySlips', multi: true },
  proprietorship: { field: 'proprietorshipDoc', multi: false },
  itr_year1: { field: 'itrYear1', multi: false },
  business_reg_proof: { field: 'businessRegProofDoc', multi: true },
  audited_books_doc: { field: 'auditedBooksDoc', multi: false },
};

export function requiredDocColumns(productId, customer) {
  if (productId === 'business-loan') {
    const cols = [
      'aadhaar_front',
      'aadhaar_back',
      'pan',
      'cibil',
      'bank_statement',
      'proprietorship',
      'itr_year1',
      'business_reg_proof',
    ];
    if (customer?.auditedBooks === true) cols.push('audited_books_doc');
    return cols;
  }
  return ['aadhaar_front', 'aadhaar_back', 'pan', 'cibil', 'bank_statement', 'salary_slip'];
}

export function sanitizeUploadBasename(originalName) {
  const base = path.basename(String(originalName || 'document.pdf')).replace(/^\.+/, '');
  const cleaned = base.replace(/[^\w.\- ()]/g, '_').replace(/\s+/g, ' ').trim();
  return cleaned || 'document.pdf';
}

function uniqueDestName(dir, basename) {
  const ext = path.extname(basename);
  const stem = path.basename(basename, ext);
  let name = basename;
  let n = 2;
  while (fs.existsSync(path.join(dir, name))) {
    name = `${stem}_${n}${ext}`;
    n += 1;
  }
  return name;
}

/** Stage PDFs in os.tmpdir; persist the CSV under documents/upload/{product}/live-run.csv. */
export function saveUploadedLiveRunFiles({ productId, csvBuffer, csvOriginalName, pdfFiles }) {
  const docsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scalex-live-run-'));
  try {
    if (productId && csvBuffer != null) {
      const csvPath = uploadCsvPath(productId);
      fs.mkdirSync(path.dirname(csvPath), { recursive: true });
      fs.writeFileSync(csvPath, csvBuffer);
    }
    const saved = [];
    for (const file of pdfFiles || []) {
      const original = sanitizeUploadBasename(file.originalname || file.name || 'document.pdf');
      const destName = uniqueDestName(docsDir, original);
      const destPath = path.join(docsDir, destName);
      fs.writeFileSync(destPath, file.buffer);
      saved.push({ original, destName, destPath });
    }
    return {
      csvOriginalName: csvOriginalName || 'live-run.csv',
      docsDir,
      saved,
    };
  } catch (err) {
    fs.rmSync(docsDir, { recursive: true, force: true });
    throw err;
  }
}

export function removeStagedLiveRunFiles(docsDir) {
  if (!docsDir) return;
  try {
    fs.rmSync(docsDir, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}

export function assertSafeDocBasename(raw, rowNumber, column) {
  const value = String(raw || '').trim();
  if (!value) {
    throw new Error(`CSV row ${rowNumber}: ${column} is required (PDF filename)`);
  }
  if (value.includes('..') || /[/\\]/.test(value) || path.isAbsolute(value)) {
    throw new Error(
      `CSV row ${rowNumber}: ${column} must be a filename only (not a path): ${value}`
    );
  }
  return path.basename(value);
}

function resolveNamedPdf(docsDir, basename, rowNumber, column) {
  const filePath = path.join(docsDir, basename);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `CSV row ${rowNumber}: ${column} file "${basename}" was not found in ${docsDir}`
    );
  }
  return filePath;
}

export function resolveRowDocumentUploads({ product, row, docsDir }) {
  const cols = requiredDocColumns(product.id, row._customer || null);
  const uploads = [];

  for (const col of cols) {
    const spec = DOC_COLUMN_MAP[col];
    const cell = String(row[col] ?? '').trim();
    const names = (spec.multi ? cell.split('|') : [cell])
      .map((v) => v.trim())
      .filter(Boolean);
    if (!names.length) {
      throw new Error(`CSV row ${row.rowNumber}: ${col} is required (PDF filename)`);
    }
    if (col === 'business_reg_proof') {
      const proofs = row._customer?.regProofs;
      if (Array.isArray(proofs) && proofs.length && names.length < proofs.length) {
        throw new Error(
          `CSV row ${row.rowNumber}: business_reg_proof needs ${proofs.length} file(s) (pipe-separated) to match regProofs`
        );
      }
    }
    for (const name of names) {
      const basename = assertSafeDocBasename(name, row.rowNumber, col);
      const filePath = resolveNamedPdf(docsDir, basename, row.rowNumber, col);
      uploads.push({
        field: spec.field,
        file: path.basename(filePath),
        multi: spec.multi,
        filePath,
        exists: true,
      });
    }
  }
  return uploads;
}
