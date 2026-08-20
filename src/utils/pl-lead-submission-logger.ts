import { appendModuleLog, resetModuleLeadLog } from './code-file-logger';

export const PL_LEAD_SUBMISSION_MODULE = 'pl-lead-submission';

export type PlSubmissionForm = 'lead' | 'loan-application';

export type PlSubmissionEvent =
  | 'LEAD_SUBMIT_SUCCESS'
  | 'LEAD_SUBMIT_ERROR'
  | 'LOAN_APP_SUBMIT_SUCCESS'
  | 'LOAN_APP_SUBMIT_ERROR'
  | 'VALIDATION_ERROR'
  | 'CLIENT_ERROR';

const MEDIA_FIELDS = new Set([
  'panCard',
  'cibilReport',
  'aadharCardFront',
  'aadharCardBack',
  'proprietorshipDoc',
  'businessRegProofDoc',
  'bankStatement',
  'salarySlips',
  'coAppPan',
  'coAppAadharFront',
  'coAppAadharBack',
  'propertyPapers',
  'otherDocs',
  'itrYear1',
  'itrYear2',
  'itrYear3',
  'auditedBooksDoc',
]);

const PAN_KEYS = new Set(['panCard', 'panNumber']);
const AADHAAR_KEYS = new Set(['aadharCard', 'aadharNumber']);

function maskPan(value: string): string {
  const v = String(value).trim().toUpperCase();
  if (v.length < 5) return '****';
  return `${v.slice(0, 5)}****${v.slice(-1)}`;
}

function maskAadhaar(value: string): string {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `********${digits.slice(-4)}`;
}

function isFileLike(val: unknown): boolean {
  if (!val || typeof val !== 'object') return false;
  if (typeof File !== 'undefined' && val instanceof File) return true;
  const o = val as Record<string, unknown>;
  return typeof o.name === 'string' && typeof o.size === 'number';
}

function sanitizeMediaValue(field: string, val: unknown): unknown {
  if (val == null) return val;
  if (isFileLike(val)) {
    const f = val as File;
    return { field, fileName: f.name, size: f.size };
  }
  if (Array.isArray(val)) {
    const ids = val
      .map((item) => {
        if (typeof item === 'number' || typeof item === 'string') return item;
        if (item && typeof item === 'object' && (item as { id?: unknown }).id != null) {
          return (item as { id: unknown }).id;
        }
        if (isFileLike(item)) {
          const f = item as File;
          return { fileName: f.name, size: f.size };
        }
        return null;
      })
      .filter((x) => x != null);
    return { field, fileIds: ids };
  }
  if (typeof val === 'number' || typeof val === 'string') {
    return { field, fileId: val };
  }
  if (typeof val === 'object' && (val as { id?: unknown }).id != null) {
    return { field, fileId: (val as { id: unknown }).id };
  }
  return { field, present: true };
}

function sanitizeValue(key: string, val: unknown): unknown {
  if (val == null) return val;

  if (key === 'pdfPasswords' && typeof val === 'object' && !Array.isArray(val)) {
    return { keys: Object.keys(val as Record<string, unknown>) };
  }

  if (PAN_KEYS.has(key) && typeof val === 'string') {
    return maskPan(val);
  }
  if (AADHAAR_KEYS.has(key) && typeof val === 'string') {
    return maskAadhaar(val);
  }

  if (MEDIA_FIELDS.has(key)) {
    return sanitizeMediaValue(key, val);
  }

  if (isFileLike(val)) {
    const f = val as File;
    return { fileName: f.name, size: f.size };
  }

  if (Array.isArray(val)) {
    return val.map((item, i) =>
      typeof item === 'object' && item !== null && !isFileLike(item)
        ? sanitizeSubmissionFields(item as Record<string, unknown>)
        : isFileLike(item)
          ? sanitizeValue(String(i), item)
          : item
    );
  }

  if (typeof val === 'object') {
    return sanitizeSubmissionFields(val as Record<string, unknown>);
  }

  return val;
}

/** Deep clone + redact PII and file blobs for disk logs. */
export function sanitizeSubmissionFields(
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    out[key] = sanitizeValue(key, val);
  }
  return out;
}

export interface PlLeadSubmissionLogInput {
  leadId?: number | string | null;
  leadName?: string | null;
  event: PlSubmissionEvent;
  form: PlSubmissionForm;
  fields?: Record<string, unknown> | null;
  errors?: unknown;
  source?: string;
  loanApplicationId?: number | string | null;
}

export async function appendPlLeadSubmissionLog(
  strapi: any,
  input: PlLeadSubmissionLogInput
): Promise<void> {
  try {
    const line = JSON.stringify({
      timestamp: new Date().toISOString(),
      event: input.event,
      form: input.form,
      source: input.source ?? 'api',
      leadId: input.leadId ?? null,
      leadName: input.leadName ?? null,
      loanApplicationId: input.loanApplicationId ?? null,
      fields: sanitizeSubmissionFields(input.fields ?? null),
      errors: input.errors ?? null,
    });
    const leadCtx = { leadId: input.leadId, leadName: input.leadName };
    if (
      input.event === 'LEAD_SUBMIT_SUCCESS' ||
      input.event === 'LEAD_SUBMIT_ERROR'
    ) {
      resetModuleLeadLog(PL_LEAD_SUBMISSION_MODULE, leadCtx);
    }
    await appendModuleLog(PL_LEAD_SUBMISSION_MODULE, line, strapi, leadCtx);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    strapi?.log?.warn?.(`[pl-lead-submission] Failed to write log: ${message}`);
  }
}

export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>;
    if (typeof e.message === 'string') return e.message;
    if (e.error && typeof e.error === 'object') {
      const inner = e.error as Record<string, unknown>;
      if (typeof inner.message === 'string') return inner.message;
    }
  }
  return String(err);
}
