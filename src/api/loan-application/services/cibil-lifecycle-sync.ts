import type { Core } from '@strapi/strapi';
import {
  linkFilesToLeadUploadFolder,
  resolveMediaFileId,
  syncLeadDocumentsToDisk,
} from './lead-document-sync';
import { maybeQueueBureauAfterLeadSync } from './api-uploads-mirror/cibil-hook';
import { LOAN_APP_MEDIA_FIELDS } from '../utils/media-fields';

const LOAN_APP_UID = 'api::loan-application.loan-application';

/** Fallback when lifecycle event.state does not persist between before/afterUpdate. */
const prevCibilCache = new Map<string, number | null>();

function loanAppCacheKey(where: Record<string, unknown>): string | null {
  if (where.documentId != null) return `doc:${where.documentId}`;
  if (where.id != null) return `id:${where.id}`;
  return null;
}

type LifecycleEvent = {
  params?: {
    where?: Record<string, unknown>;
    data?: Record<string, unknown>;
  };
  result?: { id?: number; documentId?: string };
};

export function resolveLoanAppWhere(
  event: LifecycleEvent
): Record<string, unknown> {
  const where = event.params?.where;
  if (where && (where.id != null || where.documentId != null)) {
    return where;
  }
  const result = event.result;
  if (result?.documentId) return { documentId: result.documentId };
  if (result?.id != null) return { id: result.id };
  return {};
}

export function cibilReportInUpdateData(
  data?: Record<string, unknown> | null
): boolean {
  if (!data) return false;
  return Object.prototype.hasOwnProperty.call(data, 'cibilReport');
}

export function mediaFieldsInUpdateData(
  data?: Record<string, unknown> | null
): string[] {
  if (!data) return [];
  return LOAN_APP_MEDIA_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(data, field)
  );
}

function isPublicLoanAppCreate(strapi: Core.Strapi): boolean {
  const ctx = (strapi as Core.Strapi & { requestContext?: { get?: () => any } })
    .requestContext?.get?.();
  if (!ctx?.request) return false;
  const method = String(ctx.request.method || '').toUpperCase();
  const path = String(ctx.request.path || ctx.request.url || '');
  return method === 'POST' && path.includes('/api/loan-applications');
}

function collectMediaFromValue(
  val: unknown,
  field: string,
  fileIds: number[],
  fileFieldById: Record<number, string>
): void {
  if (val == null) return;
  if (Array.isArray(val)) {
    for (const item of val) {
      const id = resolveMediaFileId(item);
      if (id) {
        fileIds.push(id);
        fileFieldById[id] = field;
      }
    }
    return;
  }
  const id = resolveMediaFileId(val);
  if (id) {
    fileIds.push(id);
    fileFieldById[id] = field;
  }
}

function collectMediaFromRecord(
  record: Record<string, unknown>
): { fileIds: number[]; fileFieldById: Record<number, string> } {
  const fileIds: number[] = [];
  const fileFieldById: Record<number, string> = {};

  for (const field of LOAN_APP_MEDIA_FIELDS) {
    collectMediaFromValue(record[field], field, fileIds, fileFieldById);
  }

  return { fileIds, fileFieldById };
}

function mergeMediaFromUpdateData(
  data: Record<string, unknown>,
  fileIds: number[],
  fileFieldById: Record<number, string>
): void {
  for (const field of mediaFieldsInUpdateData(data)) {
    collectMediaFromValue(data[field], field, fileIds, fileFieldById);
  }
}

async function loadLoanApplication(
  strapi: Core.Strapi,
  where: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  let id = where.id as number | undefined;

  if (id == null && where.documentId) {
    const row = await strapi.db.query(LOAN_APP_UID).findOne({
      where: { documentId: where.documentId },
      select: ['id'],
    });
    id = row?.id;
  }

  if (id == null) {
    const row = await strapi.db.query(LOAN_APP_UID).findOne({ where });
    id = row?.id;
  }

  if (id == null) return null;

  const populate = Object.fromEntries(
    LOAN_APP_MEDIA_FIELDS.map((field) => [field, true])
  );

  const record = await strapi.entityService.findOne(LOAN_APP_UID, id, {
    populate,
  });

  return (record as Record<string, unknown> | null) ?? null;
}

export async function resolveCibilFileIdFromMorph(
  strapi: Core.Strapi,
  loanAppId: number
): Promise<number | null> {
  try {
    const knex = strapi.db.connection;
    const hasTable = await knex.schema.hasTable('files_related_mph');
    if (!hasTable) return null;

    const row = await knex('files_related_mph')
      .where({
        related_id: loanAppId,
        related_type: LOAN_APP_UID,
        field: 'cibilReport',
      })
      .orderBy('id', 'desc')
      .first();

    const fileId = row?.file_id;
    if (fileId == null) return null;
    const parsed = Number(fileId);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

async function resolveApplicantName(
  strapi: Core.Strapi,
  leadId: number | string,
  applicantName: string
): Promise<string> {
  if (applicantName.trim()) return applicantName.trim();
  try {
    const lead = await strapi.db.query('api::lead.lead').findOne({
      where: { id: leadId },
      select: ['fullName'],
    });
    return String(lead?.fullName ?? '').trim();
  } catch {
    return '';
  }
}

export async function capturePrevCibilFileId(
  strapi: Core.Strapi,
  event: LifecycleEvent
): Promise<number | null> {
  const where = resolveLoanAppWhere(event);
  if (!where.id && !where.documentId) return null;

  const record = await loadLoanApplication(strapi, where);
  if (!record) return null;

  const fromRecord = resolveMediaFileId(record.cibilReport);
  let prev = fromRecord;
  if (!prev) {
    const id = Number(record.id);
    if (Number.isFinite(id)) {
      prev = await resolveCibilFileIdFromMorph(strapi, id);
    }
  }

  const cacheKey = loanAppCacheKey(where);
  if (cacheKey) prevCibilCache.set(cacheKey, prev);

  return prev;
}

export async function handleCibilLifecycleSync(
  strapi: Core.Strapi,
  event: LifecycleEvent,
  opts: { isCreate: boolean; prevCibilFileId?: number | null }
): Promise<void> {
  if (opts.isCreate && isPublicLoanAppCreate(strapi)) {
    return;
  }

  if (!opts.isCreate) {
    const changed = mediaFieldsInUpdateData(event.params?.data);
    if (!changed.length) return;
  }

  const where = resolveLoanAppWhere(event);
  if (!where.id && !where.documentId) {
    strapi.log.warn('[LoanApp Docs] skipped:no-where');
    return;
  }

  const cacheKey = loanAppCacheKey(where);
  const prevCibilFileId =
    opts.prevCibilFileId ??
    (cacheKey ? (prevCibilCache.get(cacheKey) ?? null) : null);
  if (cacheKey) prevCibilCache.delete(cacheKey);

  setImmediate(async () => {
    try {
      const record = await loadLoanApplication(strapi, where);
      if (!record) {
        strapi.log.warn('[LoanApp Docs] skipped:record-not-found');
        return;
      }

      const leadId = record.leadId;
      if (leadId == null || String(leadId).trim() === '') {
        strapi.log.warn('[LoanApp Docs] skipped:missing-leadId');
        return;
      }

      const applicantName = await resolveApplicantName(
        strapi,
        leadId as number | string,
        String(record.applicantName ?? '')
      );
      if (!applicantName) {
        strapi.log.warn('[LoanApp Docs] skipped:missing-applicantName');
        return;
      }

      const { fileIds, fileFieldById } = collectMediaFromRecord(record);

      if (event.params?.data) {
        mergeMediaFromUpdateData(event.params.data, fileIds, fileFieldById);
      }

      const loanAppId = Number(record.id);
      if (Number.isFinite(loanAppId) && !fileIds.some((id) => fileFieldById[id] === 'cibilReport')) {
        const morphCibilId = await resolveCibilFileIdFromMorph(strapi, loanAppId);
        if (morphCibilId && !fileIds.includes(morphCibilId)) {
          fileIds.push(morphCibilId);
          fileFieldById[morphCibilId] = 'cibilReport';
        }
      }

      const uniqueFileIds = [...new Set(fileIds)];
      if (!uniqueFileIds.length) {
        strapi.log.info('[LoanApp Docs] skipped:no-media');
        return;
      }

      const cibilFileId = uniqueFileIds.find(
        (id) => fileFieldById[id] === 'cibilReport'
      );

      strapi.log.info(
        `[LoanApp Docs] scheduled sync loanApp=${record.id} leadId=${leadId} files=${uniqueFileIds.length}`
      );

      await linkFilesToLeadUploadFolder(
        strapi,
        leadId as number | string,
        applicantName,
        uniqueFileIds
      );

      const syncResult = await syncLeadDocumentsToDisk(
        strapi,
        leadId as number | string,
        applicantName,
        uniqueFileIds,
        fileFieldById,
        {
          loanApplicationId: Number.isFinite(loanAppId) ? loanAppId : undefined,
        }
      );

      const cibilSynced = syncResult.results.some(
        (r) => r.ok && r.fieldKey === 'cibilReport'
      );

      if (cibilFileId && !cibilSynced) {
        strapi.log.info(
          `[LoanApp Docs] queueing bureau extraction (cibil mirror incomplete, fileId=${cibilFileId})`
        );
        await maybeQueueBureauAfterLeadSync(
          strapi,
          leadId as number | string,
          applicantName,
          'cibilReport',
          Number.isFinite(loanAppId) ? loanAppId : undefined
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      strapi.log.error(`[LoanApp Docs] failed: ${message}`);
    }
  });
}
