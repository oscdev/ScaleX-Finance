/**
 * Actions allowed on the admin notification bell.
 * Pipeline: summary only (no per-lender / per-criterion / BUREAU_STARTED).
 */
export const BELL_ACTION_ALLOWLIST: string[] = [
  // Pipeline summaries
  'PL_ELIGIBILITY_RUN_COMPLETE',
  'BL_ELIGIBILITY_RUN_COMPLETE',
  'PL_SCORE_RUN_DONE',
  'BL_SCORE_RUN_DONE',
  'AI_MATCH_GENERATED',
  'BUREAU_EXTRACT_COMPLETED',
  'BUREAU_EXTRACT_FAILED',

  // Lead / loan
  'LEAD_CREATED',
  'LEAD_ADVISOR_ASSIGNED',
  'LEAD_STATUS_CHANGED',
  'LEAD_REMARK_ADDED',
  'LEAD_SUBMISSION_SUCCESS',
  'LEAD_SUBMISSION_FAILURE',
  'LOAN_APP_SUBMITTED',
  'LOAN_APP_SUBMIT_FAILED',
  'LOAN_STATUS_CHANGED',
  'LOAN_ASSIGNMENT_CHANGED',

  // Email
  'EMAIL_DISPATCHED',
  'EMAIL_FAILED',
  'EMAIL_SKIPPED',

  // Auth (Users & Auth)
  'ADVISOR_LOGIN_SUCCESS',
  'ADVISOR_LOGIN_FAILURE',
  'ADVISOR_REGISTRATION_SUCCESS',
  'ADVISOR_REGISTRATION_FAILURE',
  'ADVISOR_APPROVED',
  'ADMIN_USER_CREATED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
];

/** Friendly bell badge labels for pipeline summary actions. */
export const BELL_ACTION_LABELS: Record<string, string> = {
  PL_ELIGIBILITY_RUN_COMPLETE: 'Eligibility Created',
  BL_ELIGIBILITY_RUN_COMPLETE: 'Eligibility Created',
  PL_SCORE_RUN_DONE: 'Scoring Created',
  BL_SCORE_RUN_DONE: 'Scoring Created',
  AI_MATCH_GENERATED: 'AI Match generated',
  LEAD_ADVISOR_ASSIGNED: 'Advisor Assigned',
  LOAN_ASSIGNMENT_CHANGED: 'Assignment Changed',
  BUREAU_EXTRACT_COMPLETED: 'Bureau Extracted',
  BUREAU_EXTRACT_FAILED: 'Bureau Extract Failed',
};

export function bellActionLabel(action: string | undefined | null): string {
  const key = String(action || '');
  return BELL_ACTION_LABELS[key] || key || 'Event';
}
