import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_DIR, PACKAGE_ROOT } from './paths.js';

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

/** Unique [SUITE-TEST] tagged customer for Live Run (does not mutate file on disk). */
export function buildUniqueCustomer(productId) {
  const base = loadCustomer(productId);
  const stamp = Date.now().toString().slice(-8);
  const fullName = `[SUITE-TEST] ${base.fullName || 'Suite User'} ${stamp}`;
  const emailLocal = (base.email || 'suite@test.com').split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
  return {
    ...base,
    fullName,
    email: `${emailLocal}+suite${stamp}@gmail.com`,
    mobile: `9${stamp.padStart(9, '0').slice(0, 9)}`,
    aadharCard: base.aadharCard || '123456789012',
    panCard: base.panCard || 'ABCDE1234F',
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

function plFormData(customer) {
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
    incomeDetails: {
      companyName: customer.companyName || 'Company',
      designation: customer.designation || 'Employee',
      companyAddress: customer.companyAddress || 'Mumbai',
      netSalary: String(customer.netSalary || customer.monthlyIncome || '85000'),
      salaryMode: customer.salaryMode || 'Account Transfer',
      jobStability: String(customer.jobStability || '24'),
      pfDeducted: customer.pfDeducted === true || customer.pfDeducted === 'true',
      hasOtherIncome: false,
    },
    otherDetails: { runningLoans: customer.runningLoans || 'None' },
    documents: [],
    pdfPasswords: {},
  };
}

function blFormData(customer) {
  const regProofs = customer.regProofs || ['Shop Registration Certificate'];
  const docs = regProofs.map((proof) => {
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
  return {
    businessDetails: {
      name: customer.businessName || `${customer.fullName} Business`,
      premises: customer.premises || 'Owned',
      type: customer.businessType || 'Proprietorship',
      turnover: Number(customer.turnover || 50),
      age: Number(customer.businessAge || customer.age || 5),
      regProofs,
      auditedBooks: customer.auditedBooks !== false,
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
    otherDetails: { runningLoans: customer.runningLoans || 'None' },
    documents: docs,
    regProofDocuments: regProofs.map((proof) => ({
      proofType: proof,
      key: docs.find((d) => d.name === proof)?.key,
    })),
    pdfPasswords: {},
  };
}

export function buildLoanAppPayload(customer, product, leadId, mediaFields) {
  const form_data =
    product.id === 'business-loan' ? blFormData(customer) : plFormData(customer);
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
    status: 'Pending',
    ...mediaFields,
  };
}

export function resolveDocumentUploads(product) {
  const dir = path.join(PACKAGE_ROOT, product.documentsDir || `documents/${product.id}`);
  const results = [];
  for (const row of product.documentFieldMap || []) {
    const filePath = path.join(dir, row.file);
    results.push({
      field: row.field,
      file: row.file,
      multi: Boolean(row.multi),
      filePath,
      exists: fs.existsSync(filePath),
    });
  }
  return results;
}
