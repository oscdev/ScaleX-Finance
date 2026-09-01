import {
  appendModuleLog,
  resetModuleLeadLog,
  resolveLoanTypeForLead,
  resolveLoanTypeHint,
  submissionLogModule,
  mergeAdminUpdateLogLine,
} from './code-file-logger';
import { ALL_FORM_FIELDS, FORM_SECTIONS } from '../shared/loan-form/field-schema';
import { isEmptyValue } from '../shared/loan-form/loan-app-submit';

/** @deprecated Prefer submissionLogModule(loanType) — default PL path. */
export const PL_LEAD_SUBMISSION_MODULE = 'personal-loan/pl-lead-submission';

export type PlSubmissionForm = 'lead' | 'loan-application';

export type PlSubmissionEvent =
  | 'LEAD_SUBMIT_SUCCESS'
  | 'LEAD_SUBMIT_ERROR'
  | 'LOAN_APP_SUBMIT_SUCCESS'
  | 'LOAN_APP_SUBMIT_ERROR'
  | 'VALIDATION_ERROR'
  | 'CLIENT_ERROR'
  | 'ADMIN_UPDATE';

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

function loanTypeFromFields(
  fields: Record<string, unknown> | null | undefined
): string | null {
  if (!fields || typeof fields !== 'object') return null;
  return resolveLoanTypeHint(
    fields.loanType as string | undefined,
    fields.selectedProduct as string | undefined,
    (fields as { product?: string }).product
  );
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
  /** Explicit loan type / product; else derived from fields (default PL). */
  loanType?: string | null;
}

export async function appendPlLeadSubmissionLog(
  strapi: any,
  input: PlLeadSubmissionLogInput
): Promise<void> {
  try {
    let loanType = resolveLoanTypeHint(
      input.loanType,
      loanTypeFromFields(input.fields)
    );
    if (!loanType && input.leadId != null) {
      loanType = await resolveLoanTypeForLead(strapi, input.leadId, {
        loanApplicationId:
          input.loanApplicationId != null
            ? Number(input.loanApplicationId)
            : undefined,
      });
    }
    const moduleName = submissionLogModule(loanType);
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
      resetModuleLeadLog(moduleName, leadCtx);
    }
    await appendModuleLog(moduleName, line, strapi, leadCtx);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    strapi?.log?.warn?.(`[lead-submission] Failed to write log: ${message}`);
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

export interface AdminChangeLogInput {
  leadId: number | string;
  leadName?: string | null;
  loanApplicationId?: number | string | null;
  loanType?: string | null;
  entity: 'lead' | 'loan-application';
  changedFields: Record<string, unknown>;
  source?: string;
}

const SECTION_TITLE_BY_KEY = new Map(
  FORM_SECTIONS.map((s) => [s.formDataSection, s.title])
);

const FIELD_LABEL_BY_SECTION_KEY = new Map(
  ALL_FORM_FIELDS.map((f) => [`${f.section}.${f.key}`, f.label])
);

const FORM_DATA_META_TITLES: Record<string, string> = {
  pdfPasswords: 'Documents',
  docDates: 'Documents',
  docFormats: 'Documents',
  documents: 'Documents',
  regProofDocuments: 'Documents',
};

function resolveSectionTitle(sectionKey: string): string {
  return (
    FORM_DATA_META_TITLES[sectionKey] ??
    SECTION_TITLE_BY_KEY.get(sectionKey as (typeof FORM_SECTIONS)[number]['formDataSection']) ??
    sectionKey
  );
}

function resolveFieldLabel(sectionKey: string, fieldKey: string): string {
  return FIELD_LABEL_BY_SECTION_KEY.get(`${sectionKey}.${fieldKey}`) ?? fieldKey;
}

function sanitizeAdminLogValue(key: string, val: unknown): unknown {
  return sanitizeValue(key, val);
}

function flattenFormDataChanges(
  formData: Record<string, unknown>,
  timestamp: string,
  out: AdminUpdateEntry[]
): void {
  for (const [sectionKey, sectionVal] of Object.entries(formData)) {
    const formName = resolveSectionTitle(sectionKey);

    if (Array.isArray(sectionVal)) {
      if (!isEmptyValue(sectionVal)) {
        out.push({
          timestamp,
          form: formName,
          field: sectionKey,
          value: `[${sectionVal.length} items]`,
        });
      }
      continue;
    }

    if (sectionVal == null || typeof sectionVal !== 'object') {
      if (!isEmptyValue(sectionVal)) {
        out.push({
          timestamp,
          form: formName,
          field: sectionKey,
          value: sanitizeAdminLogValue(sectionKey, sectionVal),
        });
      }
      continue;
    }

    for (const [fieldKey, fieldVal] of Object.entries(sectionVal as Record<string, unknown>)) {
      if (isEmptyValue(fieldVal)) continue;
      out.push({
        timestamp,
        form: formName,
        field: resolveFieldLabel(sectionKey, fieldKey),
        value: sanitizeAdminLogValue(fieldKey, fieldVal),
      });
    }
  }
}

export type AdminUpdateEntry = {
  timestamp: string;
  form: string;
  field: string;
  value: unknown;
};

/** Display labels for loan-app media fields (aligned with Lead View DOC_LABELS). */
export const MEDIA_FIELD_LABELS: Record<string, string> = {
  proprietorshipDoc: 'Business Type',
  panCard: 'Pan Card',
  cibilReport: 'CIBIL Report',
  aadharCardFront: 'Aadhar Card Front',
  aadharCardBack: 'Aadhar Card Back',
  bankStatement: 'Bank Statement',
  salarySlips: 'Salary Slip',
  coAppPan: 'Co-App PAN',
  otherDocs: 'Other Documents',
  propertyPapers: 'Property Papers',
  coAppAadharFront: 'Co-App Aadhar Front',
  coAppAadharBack: 'Co-App Aadhar Back',
  businessRegProofDoc: 'Business Reg Proof',
  itrYear1: 'ITR (1st Year)',
  itrYear2: 'ITR (2nd Year)',
  itrYear3: 'ITR (3rd Year)',
  auditedBooksDoc: 'Audited Books',
};

export const DOCUMENT_DETAILS_FORM = 'Document Details';

/** Build ADMIN_UPDATE rows for media / document uploads. */
export function buildMediaFieldUpdateEntries(
  timestamp: string,
  uploads: Array<{ fieldKey: string; fileName: string }>
): AdminUpdateEntry[] {
  return uploads
    .filter((u) => u.fieldKey && !isEmptyValue(u.fileName))
    .map((u) => ({
      timestamp,
      form: DOCUMENT_DETAILS_FORM,
      field: MEDIA_FIELD_LABELS[u.fieldKey] ?? u.fieldKey,
      value: u.fileName,
    }));
}

/** Append Document Details upload rows to the product-scoped submission log. */
export async function appendAdminDocumentUploadLog(
  strapi: any,
  input: {
    leadId: number | string;
    leadName?: string | null;
    loanApplicationId?: number | string | null;
    loanType?: string | null;
    uploads: Array<{ fieldKey: string; fileName: string }>;
    source?: string;
  }
): Promise<void> {
  try {
    const loanType = await resolveLoanTypeForLead(strapi, input.leadId, {
      loanApplicationId:
        input.loanApplicationId != null
          ? Number(input.loanApplicationId)
          : undefined,
      loanType: input.loanType,
    });
    const moduleName = submissionLogModule(loanType);
    const timestamp = new Date().toISOString();
    const updates = buildMediaFieldUpdateEntries(timestamp, input.uploads);
    if (!updates.length) return;

    const leadCtx = { leadId: input.leadId, leadName: input.leadName };
    await mergeAdminUpdateLogLine(
      moduleName,
      {
        timestamp,
        leadId: input.leadId,
        leadName: input.leadName,
        loanApplicationId: input.loanApplicationId,
        source: input.source ?? 'admin',
        updates,
      },
      strapi,
      leadCtx
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    strapi?.log?.warn?.(`[admin-change-log] Failed to write document log: ${message}`);
  }
}

/** Build update entries for a single admin save (non-empty values only). */
export function buildAdminUpdateEntries(
  timestamp: string,
  input: Pick<
    AdminChangeLogInput,
    'entity' | 'changedFields' | 'leadId' | 'leadName' | 'loanApplicationId' | 'source'
  >
): AdminUpdateEntry[] {
  const entries: AdminUpdateEntry[] = [];

  for (const [key, val] of Object.entries(input.changedFields)) {
    if (key === 'form_data' && val && typeof val === 'object' && !Array.isArray(val)) {
      flattenFormDataChanges(val as Record<string, unknown>, timestamp, entries);
      continue;
    }

    if (isEmptyValue(val)) continue;

    entries.push({
      timestamp,
      form: input.entity,
      field: key,
      value: sanitizeAdminLogValue(key, val),
    });
  }

  return entries;
}

/** Append admin CM / Lead View edits to the product-scoped submission log (no reset). */
export async function appendAdminChangeLog(
  strapi: any,
  input: AdminChangeLogInput
): Promise<void> {
  try {
    const loanType = await resolveLoanTypeForLead(strapi, input.leadId, {
      loanApplicationId:
        input.loanApplicationId != null
          ? Number(input.loanApplicationId)
          : undefined,
      loanType: input.loanType,
    });
    const moduleName = submissionLogModule(loanType);
    const timestamp = new Date().toISOString();
    const updates = buildAdminUpdateEntries(timestamp, input);
    if (!updates.length) return;

    const leadCtx = { leadId: input.leadId, leadName: input.leadName };
    await mergeAdminUpdateLogLine(
      moduleName,
      {
        timestamp,
        leadId: input.leadId,
        leadName: input.leadName,
        loanApplicationId: input.loanApplicationId,
        source: input.source ?? 'admin',
        updates,
      },
      strapi,
      leadCtx
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    strapi?.log?.warn?.(`[admin-change-log] Failed to write log: ${message}`);
  }
}
