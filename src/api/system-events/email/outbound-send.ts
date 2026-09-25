import type { Core } from '@strapi/strapi';
import { loanTypeLabel, normalizeLoanTypeCode } from '../../../utils/loan-type';
import { getEmailTemplate } from './template-loader';
import {
  EMAIL_SKIP_REASONS,
  logEmailDispatched,
  logEmailFailed,
  logEmailSkipped,
  type EmailAuditRole,
} from './email-audit';

type LeadRecord = {
  id?: number | string;
  fullName?: string | null;
  email?: string | null;
  requiredAmount?: string | number | null;
  selectedProduct?: string | null;
  advisorReferralId?: string | number | null;
  parentAdvisorId?: string | number | null;
  mobileNumber?: string | null;
  pinCode?: string | null;
};

type LoanApplicationRecord = {
  id?: number | string;
  leadId?: number | string | null;
  applicantName?: string | null;
  loanType?: string | null;
  loanAmount?: string | number | null;
  email?: string | null;
  phone?: string | null;
  form_data?: Record<string, unknown> | null;
  assignedStaffId?: string | number | null;
  assignedBankerId?: string | number | null;
};

export type OnLoanApplicationCreatedParams = {
  loanApplication: LoanApplicationRecord;
  leadId?: number | string | null;
  notifyingAdvisorId?: number | string | null;
};

export type OnLeadAdvisorAssignedParams = {
  leadId: number | string;
  field: 'advisorReferralId' | 'parentAdvisorId';
  newAdvisorKey: string;
};

export type OnLoanStaffBankerAssignedParams = {
  loanApplicationId: number | string;
  /** Set when staff id changed to a non-empty value */
  staffId?: string | null;
  /** Set when banker id changed to a non-empty value */
  bankerId?: string | null;
};

export type OnLeadStatusChangedParams = {
  leadId: number | string;
  oldStatus: string;
  newStatus: string;
};

export type OnAdvisorRegistrationSubmittedParams = {
  advisor: {
    id?: number | string;
    fullName?: string | null;
    email?: string | null;
    phoneNumber?: string | null;
    state?: string | null;
    district?: string | null;
    pinCode?: string | null;
    specialization?: string | null;
  };
};

type RecipientRoleLabel =
  | 'Super Admin'
  | 'Advisor'
  | 'Parent Advisor'
  | 'Staff'
  | 'Banker';

export type OnRegistrationWelcomeParams = {
  to: string;
  recipientName: string;
  recipientRole: RecipientRoleLabel;
  auditRole: EmailAuditRole;
  actionUrl: string;
  actionLabel: string;
  welcomeMessage?: string;
  lead?: LeadRecord;
};

type SendEmailParams = {
  to: string;
  subject: string;
  template: string;
  htmlData: Record<string, unknown>;
  lead: LeadRecord;
  successDescription: string;
  failureDescription: string;
  extraMeta?: Record<string, unknown>;
};

type AdminRecipient = {
  id: number | string;
  email: string;
  name: string;
};

/** Same needles as classifyAdminRoleKind in src/index.ts — Super Admin only. */
function isSuperAdminRoles(
  roles: Array<{ code?: string; name?: string }> | null | undefined
): boolean {
  const list = roles || [];
  const codes = list.map((r) => String(r.code || '').toLowerCase());
  const names = list.map((r) => String(r.name || '').toLowerCase());
  const hit = (needle: string) =>
    codes.some((c) => c.includes(needle)) || names.some((n) => n.includes(needle));

  if (hit('strapi-advisor') || hit('advisor')) return false;
  if (hit('banker')) return false;
  if (hit('staff')) return false;
  if (hit('super-admin') || hit('super admin') || hit('strapi-super-admin')) return true;
  return list.length === 0;
}

async function findGlobalSetting(strapi: Core.Strapi) {
  const published = await strapi.db
    .query('api::global-setting.global-setting')
    .findOne({
      where: { publishedAt: { $notNull: true } },
      orderBy: { updatedAt: 'desc' },
    });
  if (published) return published;
  return strapi.db.query('api::global-setting.global-setting').findOne({
    orderBy: { updatedAt: 'desc' },
  });
}

export async function isEmailsEnabled(strapi: Core.Strapi): Promise<boolean> {
  try {
    const globalSetting = await findGlobalSetting(strapi);
    if (globalSetting && globalSetting.emailsIsEnabled === false) {
      return false;
    }
  } catch {
    // Proceed with default true if global settings fail to load
  }
  return true;
}

async function listActiveAdminRecipients(
  strapi: Core.Strapi
): Promise<AdminRecipient[]> {
  const users = await strapi.db.query('admin::user').findMany({
    where: { isActive: true },
    select: ['id', 'firstname', 'lastname', 'email'],
    populate: { roles: { select: ['code', 'name'] } },
    limit: 500,
  });

  const seen = new Set<string>();
  const out: AdminRecipient[] = [];

  for (const user of users || []) {
    const email = String(user.email || '')
      .trim()
      .toLowerCase();
    if (!email || seen.has(email)) continue;
    if (!isSuperAdminRoles(user.roles)) continue;
    seen.add(email);
    const name =
      [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || 'Admin';
    out.push({ id: user.id, email: String(user.email).trim(), name });
  }

  return out;
}

/** SMTP send only; activity audit via email-audit helpers. */
async function sendEmail(
  strapi: Core.Strapi,
  params: SendEmailParams
): Promise<void> {
  const {
    to,
    subject,
    template,
    htmlData,
    lead,
    successDescription,
    failureDescription,
    extraMeta = {},
  } = params;

  try {
    const html = getEmailTemplate(template, htmlData);
    await strapi.plugins['email'].services.email.send({
      to,
      subject,
      html,
    });
    await logEmailDispatched(strapi, {
      lead,
      to,
      subject,
      template,
      description: successDescription,
      extraMeta,
    });
  } catch (emailError: unknown) {
    const message =
      emailError instanceof Error ? emailError.message : String(emailError);
    await logEmailFailed(strapi, {
      lead,
      to,
      subject,
      template,
      error: message,
      description: failureDescription,
      includeSmtpEnv: true,
      extraMeta,
    });
  }
}

/** Body display: PL (Personal Loan) */
function formatProductTypeDisplay(raw?: string | null): string {
  const code = normalizeLoanTypeCode(raw);
  if (code) return `${code} (${loanTypeLabel(code)})`;
  const fallback = String(raw ?? '').trim();
  return fallback || 'TBD';
}

/** Subject only: PL / BL / HL / LAP */
function formatProductTypeCode(raw?: string | null): string {
  const code = normalizeLoanTypeCode(raw);
  if (code) return code;
  const fallback = String(raw ?? '').trim();
  return fallback || 'TBD';
}

function formatAmountDisplay(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return 'N/A';
  const n =
    typeof raw === 'number'
      ? raw
      : Number(String(raw).replace(/,/g, '').trim());
  if (!Number.isFinite(n)) {
    const s = String(raw).trim();
    return s || 'N/A';
  }
  return n.toLocaleString('en-IN');
}

function formatCityPinDisplay(
  lead: LeadRecord,
  loanApplication: LoanApplicationRecord
): string {
  const address =
    loanApplication.form_data &&
    typeof loanApplication.form_data === 'object' &&
    loanApplication.form_data.addressDetails &&
    typeof loanApplication.form_data.addressDetails === 'object'
      ? (loanApplication.form_data.addressDetails as Record<string, unknown>)
      : null;

  const city = String(address?.city ?? address?.district ?? '').trim();
  const pin = String(lead.pinCode ?? '').trim();

  if (city && pin) return `${city}, ${pin}`;
  if (city) return city;
  if (pin) return pin;
  return 'N/A';
}

function buildLoanNotifyHtmlData(
  lead: LeadRecord,
  loanApplication: LoanApplicationRecord
) {
  const productType = formatProductTypeDisplay(
    loanApplication.loanType || lead.selectedProduct
  );
  const applicantName =
    loanApplication.applicantName || lead.fullName || 'Applicant';

  return {
    leadName: lead.fullName || loanApplication.applicantName || 'Lead',
    applicantName,
    amount: formatAmountDisplay(
      loanApplication.loanAmount ?? lead.requiredAmount
    ),
    productType,
    mobile: loanApplication.phone || lead.mobileNumber || 'N/A',
    city: formatCityPinDisplay(lead, loanApplication),
    leadId: lead.id ?? loanApplication.leadId ?? '',
  };
}

function buildLoanNotifySubject(
  lead: LeadRecord,
  loanApplication: LoanApplicationRecord,
  htmlData: ReturnType<typeof buildLoanNotifyHtmlData>
): string {
  const subjectProduct = formatProductTypeCode(
    loanApplication.loanType || lead.selectedProduct
  );
  return `New Loan Application for ${subjectProduct} : ${htmlData.applicantName}`;
}

async function resolveAdvisorForEmail(
  strapi: Core.Strapi,
  key: string | number
): Promise<{ id: number | string; email: string; fullName: string } | null> {
  const trimmed = String(key ?? '').trim();
  if (!trimmed) return null;

  let advisor = await strapi.db.query('api::advisor.advisor').findOne({
    where: { id: trimmed },
  });
  if (!advisor) {
    advisor = await strapi.db.query('api::advisor.advisor').findOne({
      where: { advisorId: trimmed },
    });
  }
  if (!advisor) return null;

  const email = String(advisor.email || '').trim();
  if (!email) return null;

  return {
    id: advisor.id,
    email,
    fullName: String(advisor.fullName || '').trim() || 'Advisor',
  };
}

async function resolveAdminUserForEmail(
  strapi: Core.Strapi,
  adminUserId: string | number
): Promise<AdminRecipient | null> {
  const trimmed = String(adminUserId ?? '').trim();
  if (!trimmed) return null;

  const user = await strapi.db.query('admin::user').findOne({
    where: { id: trimmed },
    select: ['id', 'firstname', 'lastname', 'email', 'isActive'],
  });
  if (!user || user.isActive === false) return null;

  const email = String(user.email || '').trim();
  if (!email) return null;

  const name =
    [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || 'User';
  return { id: user.id, email, name };
}

async function findLatestLoanAppForLead(
  strapi: Core.Strapi,
  leadId: number | string
): Promise<LoanApplicationRecord | null> {
  try {
    const found = await strapi.db
      .query('api::loan-application.loan-application')
      .findOne({
        where: { leadId },
        orderBy: { id: 'desc' },
      });
    return (found as LoanApplicationRecord) || null;
  } catch {
    return null;
  }
}

async function sendLoanApplicationTemplate(
  strapi: Core.Strapi,
  params: {
    lead: LeadRecord;
    loanApplication: LoanApplicationRecord;
    to: string;
    recipientName: string;
    recipientRole: RecipientRoleLabel;
    auditRole: EmailAuditRole;
    successDescription: string;
    failureDescription: string;
    extraMeta?: Record<string, unknown>;
  }
): Promise<void> {
  const {
    lead,
    loanApplication,
    to,
    recipientName,
    recipientRole,
    auditRole,
    successDescription,
    failureDescription,
    extraMeta = {},
  } = params;

  const htmlData = buildLoanNotifyHtmlData(lead, loanApplication);
  const subject = buildLoanNotifySubject(lead, loanApplication, htmlData);

  await sendEmail(strapi, {
    to,
    subject,
    template: 'loan-application',
    htmlData: {
      ...htmlData,
      recipientName,
      recipientRole,
    },
    lead,
    successDescription,
    failureDescription,
    extraMeta: {
      loanApplicationId: loanApplication.id ?? null,
      role: auditRole,
      ...extraMeta,
    },
  });
}

async function ensureEmailsOrSkip(
  strapi: Core.Strapi,
  lead: LeadRecord,
  loanApplicationId?: number | string | null
): Promise<boolean> {
  const emailsEnabled = await isEmailsEnabled(strapi);
  if (emailsEnabled) return true;

  const leadLabel = lead.fullName || String(lead.id ?? '');
  await logEmailSkipped(strapi, {
    lead,
    skipReason: EMAIL_SKIP_REASONS.GLOBALLY_DISABLED,
    description: `Emails are globally disabled. Bypassed loan-application emails for ${leadLabel}.`,
    loanApplicationId: loanApplicationId ?? null,
    model: 'global-setting',
  });
  return false;
}

/**
 * Loan-application create email side-effects (Super Admins + advisor).
 * Advisor: notifyingAdvisorId (session) first, else lead.advisorReferralId.
 */
export async function onLoanApplicationCreated(
  strapi: Core.Strapi,
  params: OnLoanApplicationCreatedParams
): Promise<void> {
  const { loanApplication, notifyingAdvisorId } = params;
  const leadId = params.leadId ?? loanApplication.leadId ?? null;

  let lead: LeadRecord = {
    id: leadId ?? undefined,
    fullName: loanApplication.applicantName,
  };

  if (leadId != null && leadId !== '') {
    try {
      const found = await strapi.db.query('api::lead.lead').findOne({
        where: { id: leadId },
      });
      if (found) lead = found as LeadRecord;
    } catch {
      // use loan-app fallbacks
    }
  }

  const leadLabel =
    lead.fullName || loanApplication.applicantName || String(leadId ?? '');

  if (!(await ensureEmailsOrSkip(strapi, lead, loanApplication.id))) {
    return;
  }

  try {
    const admins = await listActiveAdminRecipients(strapi);
    if (!admins.length) {
      await logEmailSkipped(strapi, {
        lead,
        skipReason: EMAIL_SKIP_REASONS.NO_SUPER_ADMIN,
        description: `No active Super Admin emails found for loan application ${loanApplication.id}.`,
        loanApplicationId: loanApplication.id,
        role: 'admin',
      });
    } else {
      for (const admin of admins) {
        await sendLoanApplicationTemplate(strapi, {
          lead,
          loanApplication,
          to: admin.email,
          recipientName: admin.name,
          recipientRole: 'Super Admin',
          auditRole: 'admin',
          successDescription: `Admin loan-application email dispatched to ${admin.email}`,
          failureDescription: `CRITICAL: Admin loan-application email failed for ${admin.email}`,
          extraMeta: { adminUserId: admin.id },
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmailFailed(strapi, {
      lead,
      error: message,
      description: `CRITICAL: Admin recipient lookup failed for loan application ${loanApplication.id}`,
      extraMeta: {
        loanApplicationId: loanApplication.id,
        role: 'admin',
      },
    });
  }

  const advisorKey =
    notifyingAdvisorId != null && String(notifyingAdvisorId).trim() !== ''
      ? notifyingAdvisorId
      : lead.advisorReferralId;

  if (advisorKey == null || String(advisorKey).trim() === '') {
    await logEmailSkipped(strapi, {
      lead,
      skipReason: EMAIL_SKIP_REASONS.NO_ADVISOR_ID,
      description: `No advisor to email for loan application ${loanApplication.id} (no session id or referral).`,
      loanApplicationId: loanApplication.id,
      role: 'advisor',
    });
    return;
  }

  try {
    const advisor = await resolveAdvisorForEmail(strapi, advisorKey);
    if (advisor) {
      await sendLoanApplicationTemplate(strapi, {
        lead,
        loanApplication,
        to: advisor.email,
        recipientName: advisor.fullName,
        recipientRole: 'Advisor',
        auditRole: 'advisor',
        successDescription: `Advisor loan-application email dispatched to ${advisor.email}`,
        failureDescription: `CRITICAL: Advisor loan-application email failed for lead ${leadLabel}`,
        extraMeta: { advisorId: advisor.id },
      });
    } else {
      await logEmailSkipped(strapi, {
        lead,
        skipReason: EMAIL_SKIP_REASONS.ADVISOR_NO_EMAIL,
        description: `Advisor ${advisorKey} has no email for loan application ${loanApplication.id}.`,
        loanApplicationId: loanApplication.id,
        role: 'advisor',
        extraMeta: { advisorId: advisorKey },
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmailFailed(strapi, {
      lead,
      error: message,
      description: `CRITICAL: Advisor loan-application email failed for lead ${leadLabel}`,
      extraMeta: {
        loanApplicationId: loanApplication.id,
        advisorId: advisorKey,
        role: 'advisor',
      },
    });
  }
}

/**
 * Lead View / lead PUT: Advisor or Parent Advisor assigned (non-empty change).
 */
export async function onLeadAdvisorAssigned(
  strapi: Core.Strapi,
  params: OnLeadAdvisorAssignedParams
): Promise<void> {
  const { leadId, field, newAdvisorKey } = params;
  const key = String(newAdvisorKey ?? '').trim();
  if (!key) return;

  let lead: LeadRecord = { id: leadId };
  try {
    const found = await strapi.db.query('api::lead.lead').findOne({
      where: { id: leadId },
    });
    if (found) lead = found as LeadRecord;
  } catch {
    // proceed with id-only lead
  }

  const loanApplication =
    (await findLatestLoanAppForLead(strapi, leadId)) || {
      leadId,
      applicantName: lead.fullName,
    };

  if (!(await ensureEmailsOrSkip(strapi, lead, loanApplication.id))) {
    return;
  }

  const isParent = field === 'parentAdvisorId';
  const recipientRole: RecipientRoleLabel = isParent
    ? 'Parent Advisor'
    : 'Advisor';
  const auditRole: EmailAuditRole = isParent ? 'parent_advisor' : 'advisor';

  try {
    const advisor = await resolveAdvisorForEmail(strapi, key);
    if (!advisor) {
      await logEmailSkipped(strapi, {
        lead,
        skipReason: EMAIL_SKIP_REASONS.ADVISOR_NO_EMAIL,
        description: `${recipientRole} ${key} has no email for lead ${leadId}.`,
        loanApplicationId: loanApplication.id,
        role: auditRole,
        extraMeta: { advisorId: key, field },
      });
      return;
    }

    await sendLoanApplicationTemplate(strapi, {
      lead,
      loanApplication,
      to: advisor.email,
      recipientName: advisor.fullName,
      recipientRole,
      auditRole,
      successDescription: `${recipientRole} assignment email dispatched to ${advisor.email}`,
      failureDescription: `CRITICAL: ${recipientRole} assignment email failed for ${advisor.email}`,
      extraMeta: { advisorId: advisor.id, field },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmailFailed(strapi, {
      lead,
      error: message,
      description: `CRITICAL: ${recipientRole} assignment email failed for lead ${leadId}`,
      extraMeta: {
        loanApplicationId: loanApplication.id,
        advisorId: key,
        field,
        role: auditRole,
      },
    });
  }
}

/**
 * Lead View Update: Staff and/or Banker newly assigned on a loan application.
 */
export async function onLoanStaffBankerAssigned(
  strapi: Core.Strapi,
  params: OnLoanStaffBankerAssignedParams
): Promise<void> {
  const staffId = String(params.staffId ?? '').trim();
  const bankerId = String(params.bankerId ?? '').trim();
  if (!staffId && !bankerId) return;

  let loanApplication: LoanApplicationRecord = {
    id: params.loanApplicationId,
  };
  try {
    const found = await strapi.db
      .query('api::loan-application.loan-application')
      .findOne({ where: { id: params.loanApplicationId } });
    if (found) loanApplication = found as LoanApplicationRecord;
  } catch {
    // use id-only
  }

  const leadId = loanApplication.leadId ?? null;
  let lead: LeadRecord = {
    id: leadId ?? undefined,
    fullName: loanApplication.applicantName,
  };
  if (leadId != null && leadId !== '') {
    try {
      const found = await strapi.db.query('api::lead.lead').findOne({
        where: { id: leadId },
      });
      if (found) lead = found as LeadRecord;
    } catch {
      // fallbacks
    }
  }

  if (!(await ensureEmailsOrSkip(strapi, lead, loanApplication.id))) {
    return;
  }

  const sendToAdmin = async (
    adminUserId: string,
    recipientRole: 'Staff' | 'Banker',
    auditRole: 'staff' | 'banker'
  ) => {
    try {
      const user = await resolveAdminUserForEmail(strapi, adminUserId);
      if (!user) {
        await logEmailSkipped(strapi, {
          lead,
          skipReason: EMAIL_SKIP_REASONS.ASSIGNEE_NO_EMAIL,
          description: `${recipientRole} ${adminUserId} has no email for loan application ${loanApplication.id}.`,
          loanApplicationId: loanApplication.id,
          role: auditRole,
          extraMeta: { adminUserId },
        });
        return;
      }

      await sendLoanApplicationTemplate(strapi, {
        lead,
        loanApplication,
        to: user.email,
        recipientName: user.name,
        recipientRole,
        auditRole,
        successDescription: `${recipientRole} assignment email dispatched to ${user.email}`,
        failureDescription: `CRITICAL: ${recipientRole} assignment email failed for ${user.email}`,
        extraMeta: { adminUserId: user.id },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await logEmailFailed(strapi, {
        lead,
        error: message,
        description: `CRITICAL: ${recipientRole} assignment email failed for loan application ${loanApplication.id}`,
        extraMeta: {
          loanApplicationId: loanApplication.id,
          adminUserId,
          role: auditRole,
        },
      });
    }
  };

  if (staffId) {
    await sendToAdmin(staffId, 'Staff', 'staff');
  }
  if (bankerId) {
    await sendToAdmin(bankerId, 'Banker', 'banker');
  }
}

function formatLeadStatusLabel(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '—';
  const map: Record<string, string> = {
    NEW: 'NEW',
    UNDER_PROCESS: 'UNDER PROCESS',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DISBURSED: 'DISBURSED',
  };
  return map[s] || s.replace(/_/g, ' ');
}

async function sendNamedTemplate(
  strapi: Core.Strapi,
  params: {
    lead: LeadRecord;
    to: string;
    subject: string;
    template: string;
    htmlData: Record<string, unknown>;
    successDescription: string;
    failureDescription: string;
    extraMeta?: Record<string, unknown>;
    loanApplicationId?: number | string | null;
  }
): Promise<void> {
  const {
    lead,
    to,
    subject,
    template,
    htmlData,
    successDescription,
    failureDescription,
    extraMeta = {},
    loanApplicationId,
  } = params;

  await sendEmail(strapi, {
    to,
    subject,
    template,
    htmlData,
    lead,
    successDescription,
    failureDescription,
    extraMeta: {
      ...(loanApplicationId != null ? { loanApplicationId } : {}),
      ...extraMeta,
    },
  });
}

/**
 * Lead View status change — email every assigned Advisor / Parent / Staff / Banker.
 */
export async function onLeadStatusChanged(
  strapi: Core.Strapi,
  params: OnLeadStatusChangedParams
): Promise<void> {
  const { leadId, oldStatus, newStatus } = params;
  if (!String(newStatus || '').trim()) return;
  if (String(oldStatus || '') === String(newStatus || '')) return;

  let lead: LeadRecord = { id: leadId };
  try {
    const found = await strapi.db.query('api::lead.lead').findOne({
      where: { id: leadId },
    });
    if (found) lead = found as LeadRecord;
  } catch {
    // id-only
  }

  const loanApp = await findLatestLoanAppForLead(strapi, leadId);
  if (!(await ensureEmailsOrSkip(strapi, lead, loanApp?.id))) {
    return;
  }

  const productType = formatProductTypeDisplay(
    loanApp?.loanType || lead.selectedProduct
  );
  const subject = `Lead Status Updated: ${lead.fullName || leadId} → ${formatLeadStatusLabel(newStatus)}`;
  const baseHtml = {
    leadName: lead.fullName || 'Lead',
    leadId: String(lead.id ?? leadId),
    productType,
    oldStatus: formatLeadStatusLabel(oldStatus),
    newStatus: formatLeadStatusLabel(newStatus),
  };

  type Target = {
    to: string;
    recipientName: string;
    recipientRole: RecipientRoleLabel;
    auditRole: EmailAuditRole;
    extraMeta?: Record<string, unknown>;
  };
  const targets: Target[] = [];
  const seen = new Set<string>();

  const pushUnique = (t: Target) => {
    const key = t.to.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    targets.push(t);
  };

  for (const [field, roleLabel, auditRole] of [
    ['advisorReferralId', 'Advisor', 'advisor'],
    ['parentAdvisorId', 'Parent Advisor', 'parent_advisor'],
  ] as const) {
    const key = String(lead[field] ?? '').trim();
    if (!key) continue;
    try {
      const advisor = await resolveAdvisorForEmail(strapi, key);
      if (advisor) {
        pushUnique({
          to: advisor.email,
          recipientName: advisor.fullName,
          recipientRole: roleLabel,
          auditRole,
          extraMeta: { advisorId: advisor.id, field },
        });
      } else {
        await logEmailSkipped(strapi, {
          lead,
          skipReason: EMAIL_SKIP_REASONS.ADVISOR_NO_EMAIL,
          description: `${roleLabel} ${key} has no email for lead status update ${leadId}.`,
          role: auditRole,
          extraMeta: { advisorId: key, field },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await logEmailFailed(strapi, {
        lead,
        error: message,
        description: `CRITICAL: ${roleLabel} lookup failed for lead status update ${leadId}`,
        extraMeta: { role: auditRole, field },
      });
    }
  }

  for (const [idVal, roleLabel, auditRole] of [
    [loanApp?.assignedStaffId, 'Staff', 'staff'],
    [loanApp?.assignedBankerId, 'Banker', 'banker'],
  ] as const) {
    const adminId = String(idVal ?? '').trim();
    if (!adminId) continue;
    try {
      const user = await resolveAdminUserForEmail(strapi, adminId);
      if (user) {
        pushUnique({
          to: user.email,
          recipientName: user.name,
          recipientRole: roleLabel,
          auditRole,
          extraMeta: { adminUserId: user.id },
        });
      } else {
        await logEmailSkipped(strapi, {
          lead,
          skipReason: EMAIL_SKIP_REASONS.ASSIGNEE_NO_EMAIL,
          description: `${roleLabel} ${adminId} has no email for lead status update ${leadId}.`,
          loanApplicationId: loanApp?.id,
          role: auditRole,
          extraMeta: { adminUserId: adminId },
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await logEmailFailed(strapi, {
        lead,
        error: message,
        description: `CRITICAL: ${roleLabel} lookup failed for lead status update ${leadId}`,
        extraMeta: { role: auditRole, adminUserId: adminId },
      });
    }
  }

  for (const t of targets) {
    await sendNamedTemplate(strapi, {
      lead,
      to: t.to,
      subject,
      template: 'lead-status-update',
      htmlData: {
        ...baseHtml,
        recipientName: t.recipientName,
        recipientRole: t.recipientRole,
      },
      successDescription: `Lead status email dispatched to ${t.to} (${t.recipientRole})`,
      failureDescription: `CRITICAL: Lead status email failed for ${t.to}`,
      loanApplicationId: loanApp?.id,
      extraMeta: { role: t.auditRole, ...t.extraMeta },
    });
  }
}

/**
 * Advisor onboarding form submitted — notify applicant + Super Admins.
 */
export async function onAdvisorRegistrationSubmitted(
  strapi: Core.Strapi,
  params: OnAdvisorRegistrationSubmittedParams
): Promise<void> {
  const advisor = params.advisor || {};
  const lead: LeadRecord = {
    fullName: advisor.fullName,
    email: advisor.email,
  };

  if (!(await ensureEmailsOrSkip(strapi, lead))) {
    return;
  }

  const location = [advisor.district, advisor.state, advisor.pinCode]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(', ') || 'N/A';

  const shared = {
    advisorName: advisor.fullName || 'Advisor',
    email: advisor.email || 'N/A',
    mobile: advisor.phoneNumber || 'N/A',
    location,
    specialization: advisor.specialization || 'N/A',
  };

  const applicantEmail = String(advisor.email || '').trim();
  if (applicantEmail) {
    await sendNamedTemplate(strapi, {
      lead,
      to: applicantEmail,
      subject: 'We received your ScaleX advisor application',
      template: 'advisor-registration',
      htmlData: {
        ...shared,
        recipientName: advisor.fullName || 'Advisor',
        recipientRole: 'Advisor',
        headline: 'Application received',
        introText:
          'Thank you for applying to become a ScaleX Finance advisor. Our team will review your registration and notify you once a decision is made.',
      },
      successDescription: `Advisor registration confirmation dispatched to ${applicantEmail}`,
      failureDescription: `CRITICAL: Advisor registration confirmation failed for ${applicantEmail}`,
      extraMeta: { role: 'advisor', advisorId: advisor.id },
    });
  } else {
    await logEmailSkipped(strapi, {
      lead,
      skipReason: EMAIL_SKIP_REASONS.ADVISOR_NO_EMAIL,
      description: 'Advisor registration has no applicant email.',
      role: 'advisor',
      extraMeta: { advisorId: advisor.id },
    });
  }

  try {
    const admins = await listActiveAdminRecipients(strapi);
    if (!admins.length) {
      await logEmailSkipped(strapi, {
        lead,
        skipReason: EMAIL_SKIP_REASONS.NO_SUPER_ADMIN,
        description: `No Super Admin to notify for advisor registration ${advisor.email || advisor.id}.`,
        role: 'admin',
      });
    } else {
      for (const admin of admins) {
        await sendNamedTemplate(strapi, {
          lead,
          to: admin.email,
          subject: `New Advisor Registration: ${advisor.fullName || advisor.email || 'Applicant'}`,
          template: 'advisor-registration',
          htmlData: {
            ...shared,
            recipientName: admin.name,
            recipientRole: 'Super Admin',
            headline: 'New registration pending review',
            introText:
              'A new advisor has submitted a registration application. Please review it in the Advisors content manager.',
          },
          successDescription: `Advisor registration admin email dispatched to ${admin.email}`,
          failureDescription: `CRITICAL: Advisor registration admin email failed for ${admin.email}`,
          extraMeta: { role: 'admin', adminUserId: admin.id, advisorId: advisor.id },
        });
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await logEmailFailed(strapi, {
      lead,
      error: message,
      description: 'CRITICAL: Admin notify failed for advisor registration',
      extraMeta: { role: 'admin', advisorId: advisor.id },
    });
  }
}

/**
 * Welcome / invite email (advisor approved or Staff/Banker invite).
 */
export async function onRegistrationWelcome(
  strapi: Core.Strapi,
  params: OnRegistrationWelcomeParams
): Promise<void> {
  const to = String(params.to || '').trim();
  if (!to || !params.actionUrl) return;

  const lead: LeadRecord = params.lead || {
    fullName: params.recipientName,
    email: to,
  };

  if (!(await ensureEmailsOrSkip(strapi, lead))) {
    return;
  }

  const welcomeMessage =
    params.welcomeMessage ||
    `Your ${params.recipientRole} account on ScaleX Finance is ready. Use the button below to continue.`;

  await sendNamedTemplate(strapi, {
    lead,
    to,
    subject: 'Welcome to ScaleX Finance',
    template: 'registration-welcome',
    htmlData: {
      recipientName: params.recipientName || 'User',
      recipientRole: params.recipientRole,
      welcomeMessage,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel || 'Continue',
    },
    successDescription: `Welcome email dispatched to ${to} (${params.recipientRole})`,
    failureDescription: `CRITICAL: Welcome email failed for ${to}`,
    extraMeta: { role: params.auditRole },
  });
}
