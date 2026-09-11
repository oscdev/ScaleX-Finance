import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_DIR } from './paths.js';

export const MAX_CSV_ROWS = 5;
export const MAX_DEFAULT_ROWS = 25;

export function loadProducts() {
  return JSON.parse(fs.readFileSync(path.join(CONFIG_DIR, 'products.json'), 'utf8')).products;
}

export function getProduct(productId) {
  const p = loadProducts().find((x) => x.id === productId);
  if (!p) throw new Error(`Unknown product: ${productId}`);
  return p;
}

export function loadCustomer(productId) {
  const file = path.join(CONFIG_DIR, 'customers', `${productId}.json`);
  if (!fs.existsSync(file)) throw new Error(`Missing customer config: ${file}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Stamp identity fields so repeat Live Runs do not collide in Strapi. */
export function uniquifyCustomer(customer, rowNumber = 1, stamp = Date.now()) {
  const n = Math.max(1, Number(rowNumber) || 1);
  const time7 = String(stamp).slice(-7).padStart(7, '0');
  const row2 = String(n).padStart(2, '0');
  const mobile = `9${time7}${row2}`.slice(0, 10);
  const aadhar = `2${time7}${row2}00`.replace(/\D/g, '').slice(0, 12).padEnd(12, '0');
  const panDigits = String((Number(time7) + n) % 10000).padStart(4, '0');
  const baseName = String(customer.fullName || 'Suite User').trim();
  const tagged = baseName.toUpperCase().startsWith('[SUITE-TEST]')
    ? baseName
    : `[SUITE-TEST] ${baseName}`;
  const emailSrc = String(customer.email || 'suite@test.com');
  const [localRaw, domainRaw] = emailSrc.split('@');
  const emailLocal = (localRaw || 'suite').replace(/[^a-zA-Z0-9.+-]/g, '') || 'suite';
  const domain = domainRaw || 'gmail.com';
  return {
    ...customer,
    fullName: `${tagged} ${time7}${row2}`,
    email: `${emailLocal}+suite${time7}${row2}@${domain}`,
    mobile,
    mobileNumber: mobile,
    aadharCard: aadhar,
    panCard: `ABCDE${panDigits}A`,
  };
}

/** Unique [SUITE-TEST] tagged customer for Live Run (does not mutate file on disk). */
export function buildUniqueCustomer(productId) {
  const base = loadCustomer(productId);
  const stamp = Date.now().toString().slice(-10);
  const fullName = `[SUITE-TEST] ${base.fullName || 'Suite User'} ${stamp}`;
  const emailLocal = (base.email || 'suite@test.com').split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  const time9 = Date.now().toString().slice(-9).padStart(9, '0');
  const mobile = `9${time9}`.slice(0, 10);
  const aadhar = `2${time9}00`.replace(/\D/g, '').slice(0, 12).padEnd(12, '0');
  const panDigits = String(Number(stamp.slice(0, 8)) % 10000).padStart(4, '0');
  return {
    ...base,
    fullName,
    email: `${emailLocal}+suite${stamp}@gmail.com`,
    mobile,
    aadharCard: aadhar,
    panCard: `ABCDE${panDigits}A`,
  };
}

export function buildLeadPayload(customer, product) {
  const referral = process.env.SUITE_ADVISOR_REFERRAL_ID || undefined;
  return {
    fullName: customer.fullName,
    email: customer.email,
    mobileNumber: customer.mobile || customer.mobileNumber,
    requiredAmount: Number(customer.loanAmount || customer.requiredAmount || 500000),
    pinCode: String(customer.pincode || customer.pinCode || ''),
    selectedProduct: product.loanType,
    aadharCard: customer.aadharCard,
    panCard: customer.panCard,
    employmentType: customer.employmentType || (product.id === 'business-loan' ? 'Self Employed' : 'Salaried'),
    leadType: product.loanType,
    getEmailNotification: false,
    ...(referral ? { advisorReferralId: String(referral) } : {}),
  };
}

function runningLoansValue(customer) {
  if (Array.isArray(customer.runningLoans)) return customer.runningLoans;
  return [];
}

function plFormData(customer, documentStubs) {
  const hasOther = customer.hasOtherIncome === true || customer.hasOtherIncome === 'true';
  const income = {
    companyName: customer.companyName || 'Company',
    designation: customer.designation || 'Employee',
    companyAddress: customer.companyAddress || 'Mumbai',
    netSalary: String(customer.netSalary || customer.monthlyIncome || '85000'),
    salaryMode: customer.salaryMode || 'Account Transfer',
    jobStability: String(customer.jobStability || '24'),
    pfDeducted: customer.pfDeducted === true || customer.pfDeducted === 'true',
    hasOtherIncome: hasOther,
  };
  if (hasOther) {
    income.otherIncomeSource = customer.otherIncomeSource || 'Rent';
    income.otherIncomeAmount = String(customer.otherIncomeAmount || '5000');
  }
  return {
    personalDetails: {
      dob: customer.dob || '1990-05-15',
      maritalStatus: customer.maritalStatus || 'Married',
      spouseName: customer.spouseName || '',
      motherName: customer.motherName || 'Mother',
      alternateNumber: customer.alternateNumber || customer.mobile,
      dependents: customer.dependents || '0',
    },
    addressDetails: {
      line1: customer.addressLine1 || 'Address line 1',
      line2: customer.addressLine2 || '',
      landmark: customer.landmark || 'Landmark',
      state: customer.state || 'Maharashtra',
      district: customer.district || 'Nagpur',
      city: customer.city || 'Nagpur',
      residenceType: customer.residenceType || 'Owned',
    },
    incomeDetails: income,
    otherDetails: { runningLoans: runningLoansValue(customer) },
    documents: documentStubs || [],
    pdfPasswords: {},
  };
}

function blFormData(customer, documentStubs) {
  const regProofs = customer.regProofs || ['Shop Registration Certificate'];
  const regDocs = regProofs.map((proof) => {
    const slug = String(proof)
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    return {
      key: `regProof_${slug || 'Unknown'}`,
      name: proof,
      status: 'uploaded',
    };
  });
  const extra = (documentStubs || []).filter((d) => !String(d.key || '').startsWith('regProof_'));
  // Live Run CSV / customer.turnover is absolute ₹; form_data stores Lakh (UI contract).
  const turnoverInr = Number(customer.turnover != null && customer.turnover !== '' ? customer.turnover : 5000000);
  const turnoverLakh =
    Number.isFinite(turnoverInr) && turnoverInr > 0 ? Math.round(turnoverInr / 100000) : 50;
  return {
    businessDetails: {
      name: customer.businessName || `${customer.fullName} Business`,
      premises: customer.premises || 'Owned',
      type: customer.businessType || 'Proprietorship',
      turnover: turnoverLakh,
      age: Number(customer.businessAge || customer.age || 5),
      regProofs,
      auditedBooks:
        customer.auditedBooks === true || customer.auditedBooks === 'true'
          ? true
          : customer.auditedBooks === false || customer.auditedBooks === 'false'
            ? false
            : customer.auditedBooks,
      address: customer.businessAddress || customer.addressLine1 || 'Business Address',
    },
    personalDetails: {
      dob: customer.dob || '1985-03-20',
      maritalStatus: customer.maritalStatus || 'Married',
      spouseName: customer.spouseName || '',
      motherName: customer.motherName || 'Mother',
      alternateNumber: customer.alternateNumber || customer.mobile,
    },
    addressDetails: {
      line1: customer.addressLine1 || 'Address line 1',
      line2: customer.addressLine2 || '',
      landmark: customer.landmark || 'Landmark',
      state: customer.state || 'Maharashtra',
      district: customer.district || 'Nagpur',
      city: customer.city || 'Nagpur',
      residenceType: customer.residenceType || 'Owned',
    },
    otherDetails: { runningLoans: runningLoansValue(customer) },
    documents: [...regDocs, ...extra],
    regProofDocuments: regProofs.map((proof) => ({
      proofType: proof,
      key: regDocs.find((d) => d.name === proof)?.key,
    })),
    pdfPasswords: {},
  };
}

export function buildDocumentStubs(uploads) {
  return (uploads || [])
    .filter((u) => u.exists !== false)
    .map((u) => ({
      key: u.field,
      name: u.file,
      status: 'uploaded',
    }));
}

export function buildLoanAppPayload(customer, product, leadId, mediaFields, documentStubs) {
  const stubs = documentStubs || buildDocumentStubs([]);
  const form_data =
    product.id === 'business-loan' ? blFormData(customer, stubs) : plFormData(customer, stubs);
  return {
    leadId: Number(leadId),
    loanType: product.loanType,
    loanAmount: Number(customer.loanAmount || 500000),
    applicantName: customer.fullName,
    email: customer.email,
    phone: customer.mobile || customer.mobileNumber,
    aadharNumber: customer.aadharCard,
    panNumber: customer.panCard,
    form_data,
    declarationAccepted: true,
    ...mediaFields,
  };
}
