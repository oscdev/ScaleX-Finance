import { strapiPublicApi } from './strapi';

export type PlSubmissionForm = 'lead' | 'loan-application';

export type PlSubmissionEvent =
  | 'LEAD_SUBMIT_SUCCESS'
  | 'LEAD_SUBMIT_ERROR'
  | 'LOAN_APP_SUBMIT_SUCCESS'
  | 'LOAN_APP_SUBMIT_ERROR'
  | 'VALIDATION_ERROR'
  | 'CLIENT_ERROR';

const FILE_FIELD_NAMES = new Set([
  'proprietorshipDoc',
  'panCard',
  'cibilReport',
  'aadharCardFront',
  'aadharCardBack',
  'businessRegProofDoc',
  'bankStatement',
  'propertyPapers',
  'coAppPan',
  'coAppAadharFront',
  'coAppAadharBack',
  'salarySlips',
  'otherDocs',
]);

/** Strip File blobs before sending to audit API. */
export function sanitizeClientFields(
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!data) return null;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val instanceof File) {
      out[key] = { fileName: val.name, size: val.size };
      continue;
    }
    if (Array.isArray(val) && val.length > 0 && val[0] instanceof File) {
      out[key] = val.map((f: File) => ({ fileName: f.name, size: f.size }));
      continue;
    }
    if (FILE_FIELD_NAMES.has(key) && val) {
      out[key] = Array.isArray(val) ? `[${val.length} file(s)]` : '[file]';
      continue;
    }
    if (key === 'addedDocs' && Array.isArray(val)) {
      out[key] = val.map((doc: Record<string, unknown>) => ({
        id: doc.id,
        name: doc.name,
        format: doc.format,
        status: doc.status,
      }));
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = sanitizeClientFields(val as Record<string, unknown>);
      continue;
    }
    out[key] = val;
  }
  return out;
}

export const logPlSubmission = async (params: {
  form: PlSubmissionForm;
  event: PlSubmissionEvent;
  leadId?: number | string | null;
  leadName?: string | null;
  fields?: Record<string, unknown> | null;
  errors?: unknown;
}) => {
  try {
    await fetch(strapiPublicApi('/api/pl-submission-audit/log'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...params,
        fields: params.fields ? sanitizeClientFields(params.fields) : null,
      }),
    });
  } catch {
    // never block UI
  }
};
