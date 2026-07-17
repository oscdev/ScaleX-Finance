import type { ApplicantProfile, ConnectionFailure } from './types';
import { PlErr } from './error-codes';

const JOB_STABILITY_MONTHS: Record<string, number> = {
  'less than 6 months': 3,
  '< 6 months': 3,
  '6 months': 6,
  '6 months - 1 year': 9,
  '1 year': 12,
  '1-2 years': 18,
  '2 years': 24,
  '2-3 years': 30,
  '3 years': 36,
  '3+ years': 42,
  'more than 3 years': 48,
};

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseDob(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // dd/mm/yyyy
  const m1 = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (m1) {
    const d = new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function ageFromDob(dob: Date, asOf = new Date()): number {
  let age = asOf.getFullYear() - dob.getFullYear();
  const m = asOf.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < dob.getDate())) age -= 1;
  return age;
}

function mapJobStability(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  if (JOB_STABILITY_MONTHS[key] != null) return JOB_STABILITY_MONTHS[key];
  const n = toNum(raw.replace(/[^0-9.]/g, ''));
  if (n == null) return null;
  if (/year/i.test(raw)) return Math.round(n * 12);
  return Math.round(n);
}

function parsePaymentMonth(token: string): Date | null {
  // "MM/YYYY: value" or "MMM-YY"
  const m = /(\d{1,2})[\/\-](\d{4})/.exec(token);
  if (m) return new Date(Number(m[2]), Number(m[1]) - 1, 1);
  return null;
}

function isDpdValue(v: string): boolean {
  const t = v.trim().toUpperCase();
  if (!t || t === 'STD' || t === 'XXX' || t === '0' || t === 'OK' || t === 'NEW') return false;
  if (/^SMA/i.test(t) || /^SUB/i.test(t) || /^DBT/i.test(t) || /^LSS/i.test(t)) return true;
  const n = Number(t);
  return Number.isFinite(n) && n > 0;
}

function dpdDaysFromValue(v: string): number {
  const n = Number(String(v).replace(/[^\d.]/g, ''));
  if (Number.isFinite(n) && n > 0) return n;
  if (/SMA/i.test(v)) return 30;
  if (/SUB/i.test(v)) return 90;
  if (/DBT|LSS/i.test(v)) return 180;
  return 1;
}

function deriveDpd(openAccounts: any[], asOf = new Date()) {
  const cut3 = new Date(asOf);
  cut3.setMonth(cut3.getMonth() - 3);
  const cut6 = new Date(asOf);
  cut6.setMonth(cut6.getMonth() - 6);
  const cut12 = new Date(asOf);
  cut12.setMonth(cut12.getMonth() - 12);

  let c3 = 0;
  let c6 = 0;
  let c12 = 0;
  let maxDays = 0;

  for (const acct of openAccounts || []) {
    const hist = acct.payment_history || acct.paymentHistory || [];
    const entries = Array.isArray(hist) ? hist : [];
    for (const entry of entries) {
      const str = typeof entry === 'string' ? entry : String(entry?.status || entry?.value || '');
      const parts = str.split(':');
      const period = parts[0]?.trim() || '';
      const status = (parts[1] ?? parts[0] ?? '').trim();
      const when = parsePaymentMonth(period) || parsePaymentMonth(str);
      if (!when || !isDpdValue(status)) continue;
      const days = dpdDaysFromValue(status);
      if (days > maxDays) maxDays = days;
      if (when >= cut12) c12 += 1;
      if (when >= cut6) c6 += 1;
      if (when >= cut3) c3 += 1;
    }
  }

  return {
    dpdCount3m: c3,
    dpdCount6m: c6,
    dpdCount12m: c12,
    maxDpdDays: maxDays,
  };
}

function parseEnquiryDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  return parseDob(raw) || (() => {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  })();
}

function deriveEnquiries(enquiries: any[], asOf = new Date()) {
  const cut1 = new Date(asOf);
  cut1.setMonth(cut1.getMonth() - 1);
  const cut3 = new Date(asOf);
  cut3.setMonth(cut3.getMonth() - 3);
  let e1 = 0;
  let e3 = 0;
  const members: string[] = [];
  for (const e of enquiries || []) {
    const member = String(e.member_name || e.memberName || e.member || '').trim();
    const when = parseEnquiryDate(e.date_of_enquiry || e.dateOfEnquiry || e.date);
    if (!when) {
      e3 += 1;
      continue;
    }
    if (when >= cut3) {
      e3 += 1;
      if (member) members.push(member);
    }
    if (when >= cut1) e1 += 1;
  }
  return { enquiries1m: e1, enquiries3m: e3, enquiryMembers: members };
}

function isCreditCard(accountType: string): boolean {
  return /credit\s*card/i.test(String(accountType || '').trim());
}

function deriveFoirEmi(openAccounts: any[]): number {
  if (!Array.isArray(openAccounts)) return 0;
  return openAccounts.reduce((sum: number, a: any) => {
    const type = String(a.account_type || a.accountType || '');
    if (isCreditCard(type)) return sum;
    return sum + (toNum(a.emi_amount ?? a.emiAmount) || 0);
  }, 0);
}

function deriveCcUtil(openAccounts: any[]) {
  let ccOutstanding = 0;
  let ccLimit = 0;
  for (const a of openAccounts || []) {
    const type = String(a.account_type || a.accountType || '');
    if (!isCreditCard(type)) continue;
    const limit = toNum(a.credit_limit ?? a.creditLimit) || 0;
    const balance = toNum(a.current_balance ?? a.currentBalance) || 0;
    const totalCreditCardUtilize = limit - balance;
    ccOutstanding += totalCreditCardUtilize;
    ccLimit += limit;
  }
  const ccUtil = ccLimit > 0 ? ccOutstanding / ccLimit : null;
  return { ccOutstanding, ccLimit, ccUtil };
}

/** Standard reducing-balance EMI. */
export function estimateEmi(principal: number, annualRatePct: number, tenureMonths: number): number {
  if (!principal || principal <= 0 || !tenureMonths || tenureMonths <= 0) return 0;
  if (!annualRatePct || annualRatePct <= 0) return principal / tenureMonths;
  const r = annualRatePct / 12 / 100;
  const n = tenureMonths;
  const pow = Math.pow(1 + r, n);
  return (principal * r * pow) / (pow - 1);
}

export async function buildApplicantProfile(
  strapi: any,
  leadId: number,
  connectionFailures: ConnectionFailure[]
): Promise<ApplicantProfile> {
  let lead: any = null;
  try {
    lead = await strapi.db.query('api::lead.lead').findOne({ where: { id: leadId } });
  } catch (err: any) {
    connectionFailures.push({
      code: PlErr.CONN_LEAD,
      target: 'api::lead.lead',
      reason: err?.message || String(err),
      step: 0,
    });
    throw err;
  }
  if (!lead) {
    const e: any = new Error(`Lead ${leadId} not found`);
    e.plCode = PlErr.LEAD_NOT_FOUND;
    e.httpStatus = 404;
    throw e;
  }

  let loan: any = null;
  try {
    loan = await strapi.db.query('api::loan-application.loan-application').findOne({
      where: { leadId },
      orderBy: { id: 'desc' },
    });
  } catch (err: any) {
    connectionFailures.push({
      code: PlErr.CONN_LOAN_APP,
      target: 'api::loan-application.loan-application',
      reason: err?.message || String(err),
      step: 0,
    });
  }

  let summary: any = null;
  try {
    summary = await strapi.db
      .query('api::bureau-data-extraction.cibil-report-summary')
      .findOne({ where: { leadId }, orderBy: { id: 'desc' } });
  } catch (err: any) {
    connectionFailures.push({
      code: PlErr.CONN_BUREAU,
      target: 'api::bureau-data-extraction.cibil-report-summary',
      reason: err?.message || String(err),
      step: 0,
    });
  }

  const form = (loan?.form_data || loan?.formData || {}) as any;
  const personal = form.personalDetails || {};
  const income = form.incomeDetails || {};
  const cibilData = (summary?.cibilData || summary?.cibil_data || {}) as any;
  const salary = (summary?.salarySlipData || summary?.salary_slip_data || {}) as any;

  const openAccounts = cibilData.open_accounts || cibilData.openAccounts || [];
  const enquiries = cibilData.enquiries || [];

  const dobRaw = personal.dob != null && String(personal.dob).trim() !== '' ? personal.dob : null;
  const dobDate = parseDob(dobRaw);
  const age = dobDate ? ageFromDob(dobDate) : null;

  const netMonthlyIncome = toNum(income.netSalary);

  // FOIR: sum EMI from non–credit-card open accounts (CC → step 9 CC utilization)
  const existingTotalEmi = deriveFoirEmi(openAccounts);

  const requestedAmount = toNum(lead.requiredAmount ?? lead.required_amount);
  const tenureMonths = toNum(form.loanDetails?.tenureMonths) || toNum(form.tenureMonths) || 36;

  const dpd = deriveDpd(openAccounts);
  const enq = deriveEnquiries(enquiries);
  const cc = deriveCcUtil(openAccounts);

  const isFirstTimeBorrower =
    !Array.isArray(openAccounts) ||
    openAccounts.length === 0 ||
    (toNum(cibilData.active_unsecured_loan_count ?? cibilData.activeUnsecuredLoanCount) === 0 &&
      openAccounts.length === 0);

  let pfDeducted: boolean | null = null;
  if (salary.is_pf_deducted != null || salary.isPfDeducted != null) {
    pfDeducted = Boolean(salary.is_pf_deducted ?? salary.isPfDeducted);
  }

  return {
    leadId,
    pinCode: lead.pinCode != null ? String(lead.pinCode).trim() : null,
    requestedAmount,
    netMonthlyIncome,
    salaryMode: income.salaryMode != null ? String(income.salaryMode) : null,
    employmentMonths: mapJobStability(income.jobStability),
    dob: dobRaw,
    age,
    cibilScore: toNum(cibilData.cibil_score ?? cibilData.cibilScore),
    isFirstTimeBorrower,
    pfDeducted,
    existingTotalEmi,
    proposedEmi: null,
    tenureMonths,
    dpdCount3m: dpd.dpdCount3m,
    dpdCount6m: dpd.dpdCount6m,
    dpdCount12m: dpd.dpdCount12m,
    maxDpdDays: dpd.maxDpdDays,
    enquiries1m: enq.enquiries1m,
    enquiries3m: enq.enquiries3m,
    enquiryMembers: enq.enquiryMembers,
    ccOutstanding: cc.ccOutstanding,
    ccLimit: cc.ccLimit,
    ccUtil: cc.ccUtil,
    activeUnsecured: toNum(
      cibilData.active_unsecured_loan_count ?? cibilData.activeUnsecuredLoanCount
    ),
    hasBureau: !!summary,
  };
}
