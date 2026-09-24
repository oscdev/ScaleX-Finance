import type { Core } from '@strapi/strapi';
import { getEmailTemplate } from './template-loader';
import {
  EMAIL_SKIP_REASONS,
  logEmailDispatched,
  logEmailFailed,
  logEmailSkipped,
} from './email-audit';

type LeadRecord = {
  id?: number | string;
  fullName?: string | null;
  email?: string | null;
  requiredAmount?: string | number | null;
  selectedProduct?: string | null;
  advisorReferralId?: string | number | null;
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
};

export type OnLoanApplicationCreatedParams = {
  loanApplication: LoanApplicationRecord;
  leadId?: number | string | null;
  notifyingAdvisorId?: number | string | null;
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

function buildLoanNotifyHtmlData(
  lead: LeadRecord,
  loanApplication: LoanApplicationRecord
) {
  return {
    leadName: lead.fullName || loanApplication.applicantName || 'Lead',
    applicantName: loanApplication.applicantName || lead.fullName || 'Applicant',
    amount: loanApplication.loanAmount ?? lead.requiredAmount ?? 'N/A',
    productType: loanApplication.loanType || lead.selectedProduct || 'TBD',
    mobile: loanApplication.phone || lead.mobileNumber || 'N/A',
    city: lead.pinCode || 'N/A',
    leadId: lead.id ?? loanApplication.leadId ?? '',
    loanApplicationId: loanApplication.id ?? '',
  };
}

/**
 * Loan-application create email side-effects (Super Admins + advisor + applicant).
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
  const emailsEnabled = await isEmailsEnabled(strapi);

  if (!emailsEnabled) {
    await logEmailSkipped(strapi, {
      lead,
      skipReason: EMAIL_SKIP_REASONS.GLOBALLY_DISABLED,
      description: `Emails are globally disabled. Bypassed loan-application emails for ${leadLabel}.`,
      loanApplicationId: loanApplication.id,
      model: 'global-setting',
    });
    return;
  }

  const htmlData = buildLoanNotifyHtmlData(lead, loanApplication);
  const subjectName = htmlData.applicantName || htmlData.leadName;
  const subject = `New Loan Application: ${subjectName}`;

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
        await sendEmail(strapi, {
          to: admin.email,
          subject,
          template: 'loan-application',
          htmlData: {
            ...htmlData,
            recipientName: admin.name,
          },
          lead,
          successDescription: `Admin loan-application email dispatched to ${admin.email}`,
          failureDescription: `CRITICAL: Admin loan-application email failed for ${admin.email}`,
          extraMeta: {
            loanApplicationId: loanApplication.id,
            adminUserId: admin.id,
            role: 'admin',
          },
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
  } else {
    try {
      const advisor = await strapi.db.query('api::advisor.advisor').findOne({
        where: { id: advisorKey },
      });

      if (advisor?.email) {
        await sendEmail(strapi, {
          to: advisor.email,
          subject,
          template: 'loan-application',
          htmlData: {
            ...htmlData,
            recipientName: advisor.fullName || 'Advisor',
          },
          lead,
          successDescription: `Advisor loan-application email dispatched to ${advisor.email}`,
          failureDescription: `CRITICAL: Advisor loan-application email failed for lead ${leadLabel}`,
          extraMeta: {
            loanApplicationId: loanApplication.id,
            advisorId: advisor.id,
            role: 'advisor',
          },
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

  const applicantEmail = String(lead.email || loanApplication.email || '').trim();
  if (!applicantEmail) {
    await logEmailSkipped(strapi, {
      lead,
      skipReason: EMAIL_SKIP_REASONS.LEAD_NO_EMAIL,
      description: `No applicant email for loan application ${loanApplication.id}.`,
      loanApplicationId: loanApplication.id,
      role: 'applicant',
    });
  } else {
    await sendEmail(strapi, {
      to: applicantEmail,
      subject,
      template: 'loan-application',
      htmlData: {
        ...htmlData,
        recipientName: String(htmlData.applicantName || 'Applicant'),
      },
      lead,
      successDescription: `Applicant loan-application email dispatched to ${applicantEmail}`,
      failureDescription: `CRITICAL: Applicant loan-application email failed for ${applicantEmail}`,
      extraMeta: {
        loanApplicationId: loanApplication.id,
        role: 'applicant',
      },
    });
  }
}
