import type { Core } from '@strapi/strapi';
import { isEmptyValue } from '../../../shared/loan-form/loan-app-submit';
import { LOAN_APP_MEDIA_FIELDS } from '../utils/media-fields';
import { resolveMediaFileId } from './lead-document-sync';
import {
  appendAdminChangeLog,
  appendAdminDocumentUploadLog,
} from '../../../utils/pl-lead-submission-logger';

const SKIP_KEYS = new Set([
  'updatedAt',
  'updatedBy',
  'createdAt',
  'createdBy',
  'publishedAt',
  'locale',
]);

type LifecycleEvent = {
  params?: { data?: Record<string, unknown>; where?: Record<string, unknown> };
  result?: Record<string, unknown>;
  state?: { adminChangePrev?: Record<string, unknown> };
};

function valuesEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function diffFormDataLeaves(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const sectionKeys = new Set([
    ...Object.keys(prev || {}),
    ...Object.keys(next),
  ]);

  for (const section of sectionKeys) {
    const prevSection = (prev?.[section] ?? {}) as Record<string, unknown>;
    const nextSection = (next[section] ?? {}) as Record<string, unknown>;
    const fieldKeys = new Set([
      ...Object.keys(prevSection),
      ...Object.keys(nextSection),
    ]);
    const sectionDiff: Record<string, unknown> = {};

    for (const field of fieldKeys) {
      if (!valuesEqual(prevSection[field], nextSection[field])) {
        sectionDiff[field] = nextSection[field];
      }
    }

    if (Object.keys(sectionDiff).length) {
      out[section] = sectionDiff;
    }
  }

  return out;
}

/** Keep only keys whose values differ from the pre-update snapshot. */
export function diffAdminChangedFields(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, nextVal] of Object.entries(next)) {
    const prevVal = prev?.[key];
    if (key === 'form_data' && nextVal && typeof nextVal === 'object' && !Array.isArray(nextVal)) {
      const formDiff = diffFormDataLeaves(
        prevVal as Record<string, unknown> | null | undefined,
        nextVal as Record<string, unknown>
      );
      if (Object.keys(formDiff).length) {
        out.form_data = formDiff;
      }
      continue;
    }
    if (!valuesEqual(prevVal, nextVal)) {
      out[key] = nextVal;
    }
  }

  return out;
}

/** Drop diff leaves whose new value is empty — avoids logging mass field clears. */
export function filterMeaningfulAdminDiff(
  diff: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(diff)) {
    if (key === 'form_data' && val && typeof val === 'object' && !Array.isArray(val)) {
      const sectionOut: Record<string, unknown> = {};
      for (const [section, sectionVal] of Object.entries(val as Record<string, unknown>)) {
        if (Array.isArray(sectionVal)) {
          if (!isEmptyValue(sectionVal)) {
            sectionOut[section] = sectionVal;
          }
          continue;
        }
        if (sectionVal && typeof sectionVal === 'object') {
          const fieldOut: Record<string, unknown> = {};
          for (const [field, fieldVal] of Object.entries(
            sectionVal as Record<string, unknown>
          )) {
            if (!isEmptyValue(fieldVal)) {
              fieldOut[field] = fieldVal;
            }
          }
          if (Object.keys(fieldOut).length) {
            sectionOut[section] = fieldOut;
          }
          continue;
        }
        if (!isEmptyValue(sectionVal)) {
          sectionOut[section] = sectionVal;
        }
      }
      if (Object.keys(sectionOut).length) {
        out.form_data = sectionOut;
      }
      continue;
    }
    if (!isEmptyValue(val)) {
      out[key] = val;
    }
  }

  return out;
}

function meaningfulKeys(data: Record<string, unknown>): string[] {
  return Object.keys(data).filter((k) => !SKIP_KEYS.has(k));
}

function isMediaOnlyLoanAppUpdate(data: Record<string, unknown>): boolean {
  const keys = meaningfulKeys(data);
  if (!keys.length) return true;
  return keys.every((k) =>
    (LOAN_APP_MEDIA_FIELDS as readonly string[]).includes(k)
  );
}

function asId(value: unknown): string | number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') return value;
  return null;
}

/** Resolve loan-application row from Strapi v5 lifecycle where/result (id or documentId). */
export async function findLoanAppFromLifecycleEvent(
  strapi: Core.Strapi,
  event: LifecycleEvent
): Promise<Record<string, unknown> | null> {
  const where = event.params?.where ?? {};
  const result = event.result ?? {};
  const documentId = asId(where.documentId) ?? asId(result.documentId);
  const numericId = asId(where.id) ?? asId(result.id);

  if (documentId != null) {
    const byDoc = await strapi.db
      .query('api::loan-application.loan-application')
      .findOne({ where: { documentId } });
    if (byDoc) return byDoc as Record<string, unknown>;
  }

  if (numericId != null && (typeof numericId === 'number' || /^\d+$/.test(String(numericId)))) {
    const byId = await strapi.db
      .query('api::loan-application.loan-application')
      .findOne({ where: { id: Number(numericId) } });
    if (byId) return byId as Record<string, unknown>;
  }

  return null;
}

async function findLeadById(
  strapi: Core.Strapi,
  leadId: string | number
): Promise<Record<string, unknown> | null> {
  const id = Number(leadId);
  if (!Number.isFinite(id)) return null;
  const lead = await strapi.db.query('api::lead.lead').findOne({ where: { id } });
  return (lead as Record<string, unknown>) ?? null;
}

async function resolveUploadFileNames(
  strapi: Core.Strapi,
  fileIds: number[]
): Promise<Record<number, string>> {
  const names: Record<number, string> = {};
  for (const fileId of fileIds) {
    if (!fileId) continue;
    try {
      const file = await strapi.db.query('plugin::upload.file').findOne({
        where: { id: fileId },
        select: ['name'],
      });
      if (file?.name) {
        names[fileId] = String(file.name);
      }
    } catch {
      // non-fatal
    }
  }
  return names;
}

function diffChangedMediaFields(
  prev: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>,
  updateData?: Record<string, unknown>
): Array<{ fieldKey: string; fileId: number }> {
  const changed: Array<{ fieldKey: string; fileId: number }> = [];

  for (const field of LOAN_APP_MEDIA_FIELDS) {
    const inUpdate =
      updateData != null &&
      Object.prototype.hasOwnProperty.call(updateData, field);
    if (updateData && !inUpdate) continue;

    const prevId = resolveMediaFileId(prev?.[field]);
    const nextRaw = inUpdate ? updateData![field] : next[field];
    const nextId = resolveMediaFileId(nextRaw) ?? resolveMediaFileId(next[field]);

    if (nextId != null && nextId !== prevId) {
      changed.push({ fieldKey: field, fileId: nextId });
    }
  }

  return changed;
}

async function handleMediaOnlyAdminChangeLog(
  strapi: Core.Strapi,
  event: LifecycleEvent
): Promise<void> {
  const data = event.params?.data;
  if (!data || typeof data !== 'object') return;

  const existing = await findLoanAppFromLifecycleEvent(strapi, event);
  const result = event.result ?? {};
  const nextRecord = { ...(existing ?? {}), ...result, ...data };

  const leadId =
    existing?.leadId ??
    existing?.lead_id ??
    result.leadId ??
    result.lead_id ??
    data.leadId ??
    data.lead_id;
  if (leadId == null) return;

  const loanApplicationId =
    existing?.id ?? result.id ?? asId(event.params?.where?.id) ?? null;

  const loanType =
    (existing?.loanType as string) ??
    (existing?.loan_type as string) ??
    (result.loanType as string) ??
    (data.loanType as string) ??
    null;

  const lead = await findLeadById(strapi, leadId as string | number);
  const leadName =
    (lead?.fullName as string) ??
    (existing?.applicantName as string) ??
    (result.applicantName as string) ??
    null;
  const productHint =
    (lead?.selectedProduct as string) ?? loanType ?? null;

  const mediaChanges = diffChangedMediaFields(
    event.state?.adminChangePrev,
    nextRecord,
    data
  );
  if (!mediaChanges.length) return;

  const fileNames = await resolveUploadFileNames(
    strapi,
    mediaChanges.map((c) => c.fileId)
  );

  await appendAdminDocumentUploadLog(strapi, {
    leadId: leadId as string | number,
    leadName,
    loanApplicationId: loanApplicationId as string | number | null,
    loanType: productHint,
    uploads: mediaChanges.map((c) => ({
      fieldKey: c.fieldKey,
      fileName: fileNames[c.fileId] ?? '[uploaded]',
    })),
    source: 'admin',
  });
}

export async function handleLoanAppAdminChangeLog(
  strapi: Core.Strapi,
  event: LifecycleEvent
): Promise<void> {
  const data = event.params?.data;
  if (!data || typeof data !== 'object') return;
  if (isMediaOnlyLoanAppUpdate(data)) {
    await handleMediaOnlyAdminChangeLog(strapi, event);
    return;
  }

  const result = event.result ?? {};
  const existing = await findLoanAppFromLifecycleEvent(strapi, event);

  const leadId =
    existing?.leadId ??
    existing?.lead_id ??
    result.leadId ??
    result.lead_id ??
    data.leadId ??
    data.lead_id;
  if (leadId == null) return;

  const loanApplicationId =
    existing?.id ?? result.id ?? asId(event.params?.where?.id) ?? null;

  const loanType =
    (existing?.loanType as string) ??
    (existing?.loan_type as string) ??
    (result.loanType as string) ??
    (data.loanType as string) ??
    null;

  const lead = await findLeadById(strapi, leadId as string | number);
  const leadName =
    (lead?.fullName as string) ??
    (existing?.applicantName as string) ??
    (result.applicantName as string) ??
    (data.applicantName as string) ??
    null;
  const productHint =
    (lead?.selectedProduct as string) ?? loanType ?? null;

  const changedFields: Record<string, unknown> = {};
  for (const key of meaningfulKeys(data)) {
    changedFields[key] = data[key];
  }
  if (!Object.keys(changedFields).length) return;

  const prev = event.state?.adminChangePrev;
  const diffed = filterMeaningfulAdminDiff(
    diffAdminChangedFields(prev, changedFields)
  );
  if (!Object.keys(diffed).length) return;

  await appendAdminChangeLog(strapi, {
    leadId: leadId as string | number,
    leadName,
    loanApplicationId: loanApplicationId as string | number | null,
    loanType: productHint,
    entity: 'loan-application',
    changedFields: diffed,
    source: 'admin',
  });
}

export async function handleLeadAdminChangeLog(
  strapi: Core.Strapi,
  event: {
    params?: { data?: Record<string, unknown> };
    result?: Record<string, unknown>;
    state?: { adminChangePrev?: Record<string, unknown> };
  }
): Promise<void> {
  const data = event.params?.data;
  if (!data || typeof data !== 'object') return;

  const changedFields: Record<string, unknown> = {};
  for (const key of meaningfulKeys(data)) {
    changedFields[key] = data[key];
  }
  if (!Object.keys(changedFields).length) return;

  const diffed = filterMeaningfulAdminDiff(
    diffAdminChangedFields(event.state?.adminChangePrev, changedFields)
  );
  if (!Object.keys(diffed).length) return;

  const result = event.result ?? {};
  const rawLeadId = result.id ?? data.id;
  if (rawLeadId == null) return;
  const leadId: string | number =
    typeof rawLeadId === 'number' || typeof rawLeadId === 'string'
      ? rawLeadId
      : String(rawLeadId);

  let leadName =
    (data.fullName as string) ?? (result.fullName as string) ?? null;
  let loanType =
    (data.selectedProduct as string) ??
    (result.selectedProduct as string) ??
    null;

  if (!leadName || !loanType) {
    const lead = await findLeadById(strapi, leadId);
    if (!leadName) leadName = (lead?.fullName as string) ?? null;
    if (!loanType) loanType = (lead?.selectedProduct as string) ?? null;
  }

  await appendAdminChangeLog(strapi, {
    leadId,
    leadName,
    loanType,
    entity: 'lead',
    changedFields: diffed,
    source: 'admin',
  });
}
