import { factories } from '@strapi/strapi';
import { logEvent, type LogEventParams } from '../activity/log-event';
import { listByLead, listEvents, listForLead } from '../activity/queries';
import {
  logEmailDispatched,
  logEmailFailed,
  logEmailSkipped,
} from '../email/email-audit';
import {
  isEmailsEnabled,
  onAdvisorRegistrationSubmitted,
  onLeadAdvisorAssigned,
  onLeadStatusChanged,
  onLoanApplicationCreated,
  onLoanStaffBankerAssigned,
  onRegistrationWelcome,
  type OnAdvisorRegistrationSubmittedParams,
  type OnLeadAdvisorAssignedParams,
  type OnLeadStatusChangedParams,
  type OnLoanApplicationCreatedParams,
  type OnLoanStaffBankerAssignedParams,
  type OnRegistrationWelcomeParams,
} from '../email/outbound-send';
import { logEventDeduped } from '../notifications/bell-dedupe';
import { listForBell } from '../notifications/list-for-bell';
import { listActiveCriteriaLenderCodes } from '../notifications/active-lenders';
import {
  resolveAccessibleLeadIds,
  resolveAdminUserFromAuthHeader,
  type BellLeadScope,
} from '../notifications/role-scope';

/**
 * Strapi facade for system-events:
 * - Activity logs → activity/*
 * - Notifications (bell dedupe / role scope) → notifications/*
 * - Email → email/*
 */
export default factories.createCoreService(
  'api::system-events.activity-log' as any,
  ({ strapi }) => ({
    async log(params: LogEventParams) {
      return logEvent(strapi, params);
    },

    async logEvent(params: LogEventParams) {
      return logEvent(strapi, params);
    },

    async logEventDeduped(params: LogEventParams, windowMs?: number) {
      return logEventDeduped(strapi, params, windowMs);
    },

    listByLead: (opts?: Parameters<typeof listByLead>[1]) =>
      listByLead(strapi, opts),

    listForLead: (
      leadId: number,
      opts?: Parameters<typeof listForLead>[2]
    ) => listForLead(strapi, leadId, opts),

    listEvents: (opts?: Parameters<typeof listEvents>[1]) =>
      listEvents(strapi, opts),

    listForBell: (scope: BellLeadScope, opts?: { limit?: number }) =>
      listForBell(strapi, scope, opts),

    listActiveCriteriaLenderCodes: (
      loanType?: string | null,
      leadId?: number | null
    ) => listActiveCriteriaLenderCodes(strapi, loanType, leadId),

    resolveAccessibleLeadIds: (
      adminUser: Parameters<typeof resolveAccessibleLeadIds>[1]
    ) => resolveAccessibleLeadIds(strapi, adminUser),

    resolveAdminUserFromAuthHeader: (authorization?: string) =>
      resolveAdminUserFromAuthHeader(strapi, authorization),

    isEmailsEnabled: () => isEmailsEnabled(strapi),

    onLoanApplicationCreated: (params: OnLoanApplicationCreatedParams) =>
      onLoanApplicationCreated(strapi, params),

    onLeadAdvisorAssigned: (params: OnLeadAdvisorAssignedParams) =>
      onLeadAdvisorAssigned(strapi, params),

    onLoanStaffBankerAssigned: (params: OnLoanStaffBankerAssignedParams) =>
      onLoanStaffBankerAssigned(strapi, params),

    onLeadStatusChanged: (params: OnLeadStatusChangedParams) =>
      onLeadStatusChanged(strapi, params),

    onAdvisorRegistrationSubmitted: (
      params: OnAdvisorRegistrationSubmittedParams
    ) => onAdvisorRegistrationSubmitted(strapi, params),

    onRegistrationWelcome: (params: OnRegistrationWelcomeParams) =>
      onRegistrationWelcome(strapi, params),

    logEmailDispatched: (params: Parameters<typeof logEmailDispatched>[1]) =>
      logEmailDispatched(strapi, params),

    logEmailFailed: (params: Parameters<typeof logEmailFailed>[1]) =>
      logEmailFailed(strapi, params),

    logEmailSkipped: (params: Parameters<typeof logEmailSkipped>[1]) =>
      logEmailSkipped(strapi, params),
  })
);
