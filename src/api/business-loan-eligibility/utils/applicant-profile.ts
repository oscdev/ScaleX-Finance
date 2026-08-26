import type { BlApplicantProfile, ConnectionFailure, WriteOffAccount } from './types';
import { BlErr } from './error-codes';

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function parseDob(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
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

function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

function parsePaymentMonth(token: string): Date | null {
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

/** One delay-event cell per (open account, calendar month); same month on two accounts = two events. */
function derivePaymentHistoryMonths(openAccounts: any[], asOf = new Date()) {
  const cut12 = new Date(asOf.getFullYear(), asOf.getMonth() - 11, 1);
  const byAccountMonth = new Map<string, { monthKey: string; dpdDays: number }>();
  const byMonth = new Map<string, number>();

  const accounts = openAccounts || [];
  for (let acctIdx = 0; acctIdx < accounts.length; acctIdx++) {
    const acct = accounts[acctIdx];
    const hist = acct.payment_history || acct.paymentHistory || [];
    const entries = Array.isArray(hist) ? hist : [];
    for (const entry of entries) {
      const str = typeof entry === 'string' ? entry : String(entry?.status || entry?.value || '');
      const parts = str.split(':');
      const period = parts[0]?.trim() || '';
      const status = (parts[1] ?? parts[0] ?? '').trim();
      const when = parsePaymentMonth(period) || parsePaymentMonth(str);
      if (!when) continue;
      if (when < cut12 || when > asOf) continue;

      const days = isDpdValue(status) ? dpdDaysFromValue(status) : 0;
      const monthKey = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}`;
      const eventKey = `${acctIdx}:${monthKey}`;
      const prevEvent = byAccountMonth.get(eventKey);
      if (prevEvent == null || days > prevEvent.dpdDays) {
        byAccountMonth.set(eventKey, { monthKey, dpdDays: days });
      }
      const prevMonth = byMonth.get(monthKey);
      if (prevMonth == null || days > prevMonth) byMonth.set(monthKey, days);
    }
  }

  const sortNewestFirst = (
    a: { monthKey: string; dpdDays: number },
    b: { monthKey: string; dpdDays: number }
  ) => (a.monthKey < b.monthKey ? 1 : a.monthKey > b.monthKey ? -1 : 0);

  const paymentHistoryMonths = Array.from(byAccountMonth.values()).sort(sortNewestFirst);
  const uniqueMonths = Array.from(byMonth.entries())
    .map(([monthKey, dpdDays]) => ({ monthKey, dpdDays }))
    .sort(sortNewestFirst);

  let maxDpdDays = 0;
  for (const m of uniqueMonths) {
    if (m.dpdDays > maxDpdDays) maxDpdDays = m.dpdDays;
  }

  return {
    paymentHistoryMonths,
    latestPaymentMonth: uniqueMonths.length ? uniqueMonths[0] : null,
    maxDpdDays: uniqueMonths.length ? maxDpdDays : null,
  };
}

function parseEnquiryDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  return (
    parseDob(raw) ||
    (() => {
      const d = new Date(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    })()
  );
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
    ccOutstanding += limit - balance;
    ccLimit += limit;
  }
  const ccUtil = ccLimit > 0 ? ccOutstanding / ccLimit : null;
  return { ccOutstanding, ccLimit, ccUtil };
}

function truthyYes(raw: unknown): boolean | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'boolean') return raw;
  const s = String(raw).trim().toLowerCase();
  if (s === 'yes' || s === 'true' || s === '1') return true;
  if (s === 'no' || s === 'false' || s === '0') return false;
  return Boolean(raw);
}

function deriveWriteOffAccounts(
  openAccounts: any[],
  applicationDate: Date | null
): WriteOffAccount[] {
  const asOf = applicationDate || new Date();
  const out: WriteOffAccount[] = [];
  for (const a of openAccounts || []) {
    const total = toNum(a.written_off_amount_total ?? a.writtenOffAmountTotal);
    const principal = toNum(a.written_off_amount_principal ?? a.writtenOffAmountPrincipal);
    const hasWo =
      (total != null && total > 0) || (principal != null && principal > 0);
    if (!hasWo) continue;

    const startRaw = a.payment_start_date ?? a.paymentStartDate ?? null;
    const startDate = startRaw != null ? parseEnquiryDate(String(startRaw)) : null;
    let monthsSinceStart: number | null = null;
    if (startDate) {
      monthsSinceStart = monthsBetween(startDate, asOf);
    }

    out.push({
      paymentStartDate: startRaw != null ? String(startRaw) : null,
      writtenOffAmount: (total != null && total > 0 ? total : principal) || 0,
      monthsSinceStart,
    });
  }
  return out;
}

export async function buildBlApplicantProfile(
  strapi: any,
  leadId: number,
  connectionFailures: ConnectionFailure[]
): Promise<BlApplicantProfile> {
  let lead: any = null;
  try {
    lead = await strapi.db.query('api::lead.lead').findOne({ where: { id: leadId } });
  } catch (err: any) {
    connectionFailures.push({
      code: BlErr.CONN_LEAD,
      target: 'api::lead.lead',
      reason: err?.message || String(err),
      step: 0,
    });
    throw err;
  }
  if (!lead) {
    const e: any = new Error(`Lead ${leadId} not found`);
    e.plCode = BlErr.LEAD_NOT_FOUND;
    e.blCode = BlErr.LEAD_NOT_FOUND;
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
      code: BlErr.CONN_LOAN_APP,
      target: 'api::loan-application.loan-application',
      reason: err?.message || String(err),
      step: 0,
    });
  }

  const hasLoanApp = !!loan;

  let summary: any = null;
  try {
    summary = await strapi.db
      .query('api::bureau-data-extraction.cibil-report-summary')
      .findOne({ where: { leadId }, orderBy: { id: 'desc' } });
  } catch (err: any) {
    connectionFailures.push({
      code: BlErr.CONN_BUREAU,
      target: 'api::bureau-data-extraction.cibil-report-summary',
      reason: err?.message || String(err),
      step: 0,
    });
  }

  const form = (loan?.form_data || loan?.formData || {}) as any;
  const personal = form.personalDetails || {};
  const business = form.businessDetails || {};
  const cibilData = (summary?.cibilData || summary?.cibil_data || {}) as any;

  const openAccounts = cibilData.open_accounts || cibilData.openAccounts || [];
  const enquiries = cibilData.enquiries || [];

  const applicationDateRaw = loan?.createdAt || loan?.created_at || null;
  const applicationDate = applicationDateRaw ? new Date(applicationDateRaw) : null;
  const asOf =
    applicationDate && !Number.isNaN(applicationDate.getTime()) ? applicationDate : new Date();

  const dobRaw = personal.dob != null && String(personal.dob).trim() !== '' ? personal.dob : null;
  const dobDate = parseDob(dobRaw);
  const age = dobDate ? ageFromDob(dobDate, asOf) : null;

  const entityType =
    business.type != null && String(business.type).trim() !== ''
      ? String(business.type).trim()
      : null;
  const turnoverLakh = toNum(business.turnover);
  const annualTurnoverInr =
    turnoverLakh != null ? turnoverLakh * 100000 : null;
  const businessVintageYears = toNum(business.age);
  const auditedBooks = truthyYes(business.auditedBooks);

  const existingTotalEmi = deriveFoirEmi(openAccounts);
  const requestedAmount = toNum(lead.requiredAmount ?? lead.required_amount);
  const loanAmount = toNum(loan?.loanAmount ?? loan?.loan_amount);
  const loanType =
    loan?.loanType != null
      ? String(loan.loanType)
      : loan?.loan_type != null
        ? String(loan.loan_type)
        : lead.selectedProduct != null
          ? String(lead.selectedProduct)
          : null;

  const dpd = derivePaymentHistoryMonths(openAccounts, asOf);
  const enq = deriveEnquiries(enquiries, asOf);
  const cc = deriveCcUtil(openAccounts);
  const writeOffAccounts = deriveWriteOffAccounts(openAccounts, asOf);

  const cibilScore = toNum(cibilData.cibil_score ?? cibilData.cibilScore);
  const isFirstTimeBorrower =
    cibilScore === -1 ||
    cibilScore === 0 ||
    cibilScore === 1 ||
    !Array.isArray(openAccounts) ||
    openAccounts.length === 0;

  return {
    leadId,
    fullName: lead.fullName != null ? String(lead.fullName).trim() : null,
    pinCode: lead.pinCode != null ? String(lead.pinCode).trim() : null,
    requestedAmount,
    loanAmount,
    loanType,
    applicationDate: applicationDate && !Number.isNaN(applicationDate.getTime()) ? applicationDate : null,
    entityType,
    turnoverLakh,
    annualTurnoverInr,
    businessVintageYears,
    auditedBooks,
    dob: dobRaw,
    age,
    cibilScore,
    isFirstTimeBorrower,
    existingTotalEmi,
    paymentHistoryMonths: dpd.paymentHistoryMonths,
    latestPaymentMonth: dpd.latestPaymentMonth,
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
    writeOffAccounts,
    hasBureau: !!summary,
    hasLoanApp,
  };
}
