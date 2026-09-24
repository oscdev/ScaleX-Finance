import type { Core } from '@strapi/strapi';
import { logEvent } from '../activity/log-event';

export const EMAIL_SKIP_REASONS = {
  GLOBALLY_DISABLED: 'Emails are globally disabled',
  NO_SUPER_ADMIN: 'No active Super Admin with email',
  NO_ADVISOR_ID: 'No advisor session id or lead referral',
  ADVISOR_NO_EMAIL: 'Advisor has no email address',
  LEAD_NO_EMAIL: 'Lead has no email address',
} as const;

export type EmailSkipReason =
  (typeof EMAIL_SKIP_REASONS)[keyof typeof EMAIL_SKIP_REASONS];

type LeadRef = {
  id?: number | string | null;
  fullName?: string | null;
};

type EmailAuditBase = {
  lead: LeadRef;
  description: string;
  loanApplicationId?: number | string | null;
  role?: 'admin' | 'advisor' | 'applicant';
  extraMeta?: Record<string, unknown>;
};

type EmailDispatchedParams = EmailAuditBase & {
  to: string;
  subject: string;
  template: string;
};

type EmailFailedParams = EmailAuditBase & {
  error: string;
  to?: string;
  subject?: string;
  template?: string;
  includeSmtpEnv?: boolean;
};

type EmailSkippedParams = EmailAuditBase & {
  skipReason: EmailSkipReason | string;
  model?: string;
};

/** EMAIL_* activity-log rows for outbound mail outcomes. */
export async function logEmailDispatched(
  strapi: Core.Strapi,
  params: EmailDispatchedParams
): Promise<void> {
  const { lead, to, subject, template, description, extraMeta = {} } = params;
  await logEvent(strapi, {
    action: 'EMAIL_DISPATCHED',
    description,
    severity: 'info',
    model: 'email-service',
    category: 'EMAIL',
    leadId: lead.id,
    leadName: lead.fullName,
    metadata: {
      leadId: lead.id,
      leadName: lead.fullName,
      template,
      recipient: to,
      status: 'success',
      subject,
      ...extraMeta,
    },
  });
}

export async function logEmailFailed(
  strapi: Core.Strapi,
  params: EmailFailedParams
): Promise<void> {
  const {
    lead,
    error,
    description,
    to,
    subject,
    template,
    includeSmtpEnv = false,
    extraMeta = {},
  } = params;

  await logEvent(strapi, {
    action: 'EMAIL_FAILED',
    description,
    severity: 'error',
    model: 'email-service',
    category: 'EMAIL',
    leadId: lead.id,
    leadName: lead.fullName,
    metadata: {
      leadId: lead.id,
      leadName: lead.fullName,
      ...(template != null ? { template } : {}),
      ...(to != null ? { recipient: to } : {}),
      ...(subject != null ? { subject } : {}),
      status: 'failure',
      error,
      ...(includeSmtpEnv
        ? {
            smtpHost: process.env.SMTP_HOST || null,
            smtpPort: process.env.SMTP_PORT
              ? Number(process.env.SMTP_PORT)
              : null,
          }
        : {}),
      ...extraMeta,
    },
  });
}

export async function logEmailSkipped(
  strapi: Core.Strapi,
  params: EmailSkippedParams
): Promise<void> {
  const {
    lead,
    skipReason,
    description,
    loanApplicationId,
    role,
    model = 'email-service',
    extraMeta = {},
  } = params;

  await logEvent(strapi, {
    action: 'EMAIL_SKIPPED',
    description,
    severity: 'info',
    model,
    category: 'EMAIL',
    leadId: lead.id,
    leadName: lead.fullName,
    metadata: {
      leadId: lead.id,
      leadName: lead.fullName,
      ...(loanApplicationId != null ? { loanApplicationId } : {}),
      ...(role != null ? { role } : {}),
      status: 'skipped',
      skipReason,
      ...extraMeta,
    },
  });
}
