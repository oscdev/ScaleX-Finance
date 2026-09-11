/**
 * Parse Live Run CSV (required fields + document filename columns).
 * Resolves PDFs by basename in the same folder as the CSV. Max 5 rows for CSV Upload;
 * default Start reads up to 25 pool rows then runs one.
 */

import {
  MAX_CSV_ROWS,
  MAX_DEFAULT_ROWS,
  getProduct,
  loadCustomer,
  buildLeadPayload,
  buildLoanAppPayload,
  buildDocumentStubs,
  uniquifyCustomer,
} from './live-payloads.js';
import {
  getLeadRequiredErrors,
  getLoanAppFormRequiredErrors,
  getRequiredDocFileErrors,
  assertRequired,
} from './validate-required.js';
import { resolveRowDocumentUploads } from './live-run-docs.js';

const HEADER_ALIASES = {
  fullname: 'fullName',
  email: 'email',
  mobile: 'mobileNumber',
  mobilenumber: 'mobileNumber',
  requiredamount: 'requiredAmount',
  loanamount: 'requiredAmount',
  pincode: 'pinCode',
  aadharcard: 'aadharCard',
  pancard: 'panCard',
  employmenttype: 'employmentType',
  dob: 'dob',
  maritalstatus: 'maritalStatus',
  mothername: 'motherName',
  line1: 'line1',
  addressline1: 'line1',
  landmark: 'landmark',
  state: 'state',
  district: 'district',
  city: 'city',
  residencetype: 'residenceType',
  companyname: 'companyName',
  designation: 'designation',
  netsalary: 'netSalary',
  salarymode: 'salaryMode',
  jobstability: 'jobStability',
  pfdeducted: 'pfDeducted',
  hasotherincome: 'hasOtherIncome',
  otherincomesource: 'otherIncomeSource',
  otherincomeamount: 'otherIncomeAmount',
  runningloans: 'runningLoans',
  runningloan: 'runningLoans',
  companyaddress: 'companyAddress',
  businessname: 'businessName',
  premises: 'premises',
  businesstype: 'businessType',
  turnover: 'turnover',
  age: 'age',
  businessage: 'age',
  regproofs: 'regProofs',
  auditedbooks: 'auditedBooks',
  businessaddress: 'businessAddress',
  spousename: 'spouseName',
  alternatenumber: 'alternateNumber',
  dependents: 'dependents',
  line2: 'line2',
  addressline2: 'line2',
  aadhaarfront: 'aadhaar_front',
  aadhaarback: 'aadhaar_back',
  pan: 'pan',
  cibil: 'cibil',
  cibilreport: 'cibil',
  bankstatement: 'bank_statement',
  salaryslip: 'salary_slip',
  proprietorship: 'proprietorship',
  itryear1: 'itr_year1',
  businessregproof: 'business_reg_proof',
  auditedbooksdoc: 'audited_books_doc',
};

const LEAD_HEADERS = [
  'fullName',
  'email',
  'mobileNumber',
  'requiredAmount',
  'pinCode',
  'aadharCard',
  'panCard',
  'employmentType',
];

const PERSONAL_RES_HEADERS = [
  'dob',
  'maritalStatus',
  'motherName',
  'line1',
  'landmark',
  'state',
  'district',
  'city',
  'residenceType',
];

const PL_INCOME_HEADERS = [
  'companyName',
  'designation',
  'netSalary',
  'salaryMode',
  'jobStability',
  'pfDeducted',
  'hasOtherIncome',
];

const BL_BIZ_HEADERS = [
  'businessName',
  'premises',
  'businessType',
  'turnover',
  'age',
  'regProofs',
  'auditedBooks',
  'businessAddress',
];

function headerKey(raw) {
  const key = String(raw || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/[\s_-]+/g, '')
    .toLowerCase();
  return HEADER_ALIASES[key] || null;
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function splitCsvRows(text) {
  return String(text || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));
}

function parseBool(value) {
  const s = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(s)) return true;
  if (['false', 'no', 'n', '0'].includes(s)) return false;
  return null;
}

function parseRegProofs(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value || '')
    .split('|')
    .map((v) => v.trim())
    .filter(Boolean);
}

const RUNNING_LOAN_TYPES = new Set([
  'Personal Loan',
  'Business Loan',
  'Home Loan',
  'Loan Against Property',
  'Credit Card',
  'Auto Loan',
  'Bike Loan',
  'Consumer Loan',
  'Gold Loan',
  'Education Loan',
  'Over Draft',
  'Other',
]);

function parseRunningLoans(raw, rowNumber) {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`CSV row ${rowNumber}: runningLoans must be a JSON array`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`CSV row ${rowNumber}: runningLoans must be a JSON array`);
  }
  return parsed.map((loan, i) => {
    const type = String(loan?.type || '').trim();
    const bank = String(loan?.bank || '').trim();
    const amount = String(loan?.amount ?? '').trim();
    const emi = String(loan?.emi ?? '').trim();
    const paidEmi = String(loan?.paidEmi ?? '').trim();
    if (!type || !bank || !amount || !emi || !paidEmi) {
      throw new Error(
        `CSV row ${rowNumber}: runningLoans[${i}] needs type, bank, amount, emi, paidEmi`
      );
    }
    if (!RUNNING_LOAN_TYPES.has(type)) {
      throw new Error(`CSV row ${rowNumber}: runningLoans[${i}] type "${type}" is not a valid loan type`);
    }
    return {
      id: String(loan?.id || i + 1),
      type,
      bank,
      amount,
      emi,
      paidEmi,
    };
  });
}

function requiredHeaders(productId) {
  if (productId === 'business-loan') {
    return [...LEAD_HEADERS, ...PERSONAL_RES_HEADERS, ...BL_BIZ_HEADERS];
  }
  return [...LEAD_HEADERS, ...PERSONAL_RES_HEADERS, ...PL_INCOME_HEADERS];
}

function requiredDocHeaders(productId) {
  if (productId === 'business-loan') {
    return [
      'aadhaar_front',
      'aadhaar_back',
      'pan',
      'cibil',
      'bank_statement',
      'proprietorship',
      'itr_year1',
      'business_reg_proof',
    ];
  }
  return ['aadhaar_front', 'aadhaar_back', 'pan', 'cibil', 'bank_statement', 'salary_slip'];
}

export function customerFromCsvRow(product, row, opts = {}) {
  const fillOptional = opts.fillOptional === true;
  const base = fillOptional ? loadCustomer(product.id) : {};
  let fullName = String(row.fullName || '').trim();
  if (fullName && !fullName.toUpperCase().startsWith('[SUITE-TEST]')) {
    fullName = `[SUITE-TEST] ${fullName}`;
  }
  const hasOther = parseBool(row.hasOtherIncome);
  const customer = {
    ...base,
    fullName,
    email: String(row.email || '').trim(),
    mobile: String(row.mobileNumber || '').replace(/\D/g, ''),
    mobileNumber: String(row.mobileNumber || '').replace(/\D/g, ''),
    loanAmount: Number(row.requiredAmount),
    requiredAmount: Number(row.requiredAmount),
    pincode: String(row.pinCode || '').replace(/\D/g, ''),
    pinCode: String(row.pinCode || '').replace(/\D/g, ''),
    aadharCard: String(row.aadharCard || '').replace(/\s/g, ''),
    panCard: String(row.panCard || '').toUpperCase().trim(),
    employmentType: String(row.employmentType || '').trim(),
    dob: String(row.dob || '').trim(),
    maritalStatus: String(row.maritalStatus || '').trim(),
    motherName: String(row.motherName || '').trim(),
    addressLine1: String(row.line1 || '').trim(),
    landmark: String(row.landmark || '').trim(),
    state: String(row.state || '').trim(),
    district: String(row.district || '').trim(),
    city: String(row.city || '').trim(),
    residenceType: String(row.residenceType || '').trim(),
  };

  const setOptional = (csvKey, destKey) => {
    if (row[csvKey] != null && String(row[csvKey]).trim() !== '') {
      customer[destKey] = String(row[csvKey]).trim();
      return;
    }
    if (fillOptional && base[destKey] != null) customer[destKey] = base[destKey];
  };
  setOptional('spouseName', 'spouseName');
  if (String(customer.maritalStatus || '').toLowerCase() === 'single') {
    customer.spouseName = '';
  }
  setOptional('alternateNumber', 'alternateNumber');
  setOptional('dependents', 'dependents');
  setOptional('line2', 'addressLine2');
  setOptional('companyAddress', 'companyAddress');
  customer.runningLoans = parseRunningLoans(row.runningLoans, row.rowNumber);

  if (product.id === 'business-loan') {
    const audited = parseBool(row.auditedBooks);
    customer.businessName = String(row.businessName || '').trim();
    customer.premises = String(row.premises || '').trim();
    customer.businessType = String(row.businessType || '').trim();
    customer.turnover = Number(row.turnover); // absolute ₹; converted to Lakh in blFormData
    customer.businessAge = Number(row.age);
    customer.age = Number(row.age);
    customer.regProofs = parseRegProofs(row.regProofs);
    customer.auditedBooks = audited;
    customer.businessAddress = String(row.businessAddress || '').trim();
  } else {
    customer.companyName = String(row.companyName || '').trim();
    customer.designation = String(row.designation || '').trim();
    customer.netSalary = String(row.netSalary || '').trim();
    customer.salaryMode = String(row.salaryMode || '').trim();
    customer.jobStability = String(row.jobStability || '').trim();
    customer.pfDeducted = parseBool(row.pfDeducted);
    customer.hasOtherIncome = hasOther;
    if (hasOther === true) {
      customer.otherIncomeSource = String(row.otherIncomeSource || '').trim()
        || (fillOptional ? base.otherIncomeSource || 'Rent' : '');
      customer.otherIncomeAmount = String(row.otherIncomeAmount || '').trim()
        || (fillOptional ? String(base.otherIncomeAmount || '5000') : '');
    }
  }

  return customer;
}

function assertUniqueIdentities(rows) {
  const seen = {
    email: new Map(),
    mobile: new Map(),
    pan: new Map(),
    aadhaar: new Map(),
  };
  for (const row of rows) {
    const email = String(row.email || '').trim().toLowerCase();
    const mobile = String(row.mobileNumber || '').replace(/\D/g, '');
    const pan = String(row.panCard || '').toUpperCase().trim();
    const aadhaar = String(row.aadharCard || '').replace(/\D/g, '');
    const pairs = [
      ['email', email],
      ['mobile', mobile],
      ['pan', pan],
      ['aadhaar', aadhaar],
    ];
    for (const [kind, value] of pairs) {
      if (!value) continue;
      const prev = seen[kind].get(value);
      if (prev) {
        throw new Error(
          `CSV identity not unique: ${kind} "${value}" is used on rows ${prev} and ${row.rowNumber}`
        );
      }
      seen[kind].set(value, row.rowNumber);
    }
  }
}

/**
 * Parse CSV text, validate columns/identity, and resolve PDFs in docsDir.
 * Throws before any Strapi POST.
 *
 * @param {string} csvText
 * @param {string} productId
 * @param {{ docsDir: string, maxRows?: number, uniquify?: boolean, fillOptional?: boolean }} opts
 */
export function parseAndPreflightLiveRunCsv(csvText, productId, opts = {}) {
  const product = getProduct(productId);
  const docsDir = opts.docsDir;
  if (!docsDir) {
    throw new Error('Live Run CSV requires a product document folder');
  }
  const maxRows = opts.maxRows == null ? MAX_CSV_ROWS : opts.maxRows;
  const lines = splitCsvRows(csvText);
  if (lines.length < 2) {
    throw new Error('CSV must include a header row and at least one data row');
  }

  const headers = parseCsvLine(lines[0]).map(headerKey);

  const needed = [...requiredHeaders(product.id), ...requiredDocHeaders(product.id)];
  const missing = needed.filter((h) => !headers.includes(h));
  if (missing.length) {
    throw new Error(`CSV missing required column(s) for ${product.label}: ${missing.join(', ')}`);
  }

  const dataLines = lines.slice(1);
  if (dataLines.length > maxRows) {
    throw new Error(
      `CSV has ${dataLines.length} data rows; max is ${maxRows}${
        maxRows === MAX_CSV_ROWS ? ' for CSV Upload' : ''
      }`
    );
  }

  const parsed = dataLines.map((line, i) => {
    const cells = parseCsvLine(line);
    const row = { rowNumber: i + 1 };
    headers.forEach((h, idx) => {
      if (h) row[h] = cells[idx] ?? '';
    });
    if (product.id === 'personal-loan' && parseBool(row.hasOtherIncome) === true) {
      if (!String(row.otherIncomeSource || '').trim() || !String(row.otherIncomeAmount || '').trim()) {
        if (!opts.fillOptional) {
          throw new Error(
            `CSV row ${row.rowNumber}: otherIncomeSource and otherIncomeAmount are required when hasOtherIncome is Yes`
          );
        }
      }
    }
    return row;
  });

  assertUniqueIdentities(parsed);

  const stamp = Date.now();
  return parsed.map((row) => {
    let customer = customerFromCsvRow(product, row, { fillOptional: opts.fillOptional === true });
    if (opts.uniquify) customer = uniquifyCustomer(customer, row.rowNumber, stamp);
    if (customer.auditedBooks === true && !String(row.audited_books_doc || '').trim()) {
      throw new Error(
        `CSV row ${row.rowNumber}: audited_books_doc is required when auditedBooks is Yes`
      );
    }
    const uploads = resolveRowDocumentUploads({
      product,
      row: { ...row, _customer: customer },
      docsDir,
    });
    const leadPayload = buildLeadPayload(customer, product);
    assertRequired(getLeadRequiredErrors(leadPayload), `lead (CSV row ${row.rowNumber})`);
    const preflightApp = buildLoanAppPayload(customer, product, 1, {}, buildDocumentStubs(uploads));
    assertRequired(
      getLoanAppFormRequiredErrors(preflightApp),
      `loan-application (CSV row ${row.rowNumber})`
    );
    assertRequired(getRequiredDocFileErrors(uploads), `documents (CSV row ${row.rowNumber})`);
    return {
      rowNumber: row.rowNumber,
      customer,
      uploads,
    };
  });
}

