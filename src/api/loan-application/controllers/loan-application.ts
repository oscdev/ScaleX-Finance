import { factories } from '@strapi/strapi';
import path from 'path';
import { buildLeadUploadFolderName } from '../utils/lead-upload-folder';
import { syncLeadDocumentsToDisk } from '../services/lead-document-sync';
import { mirrorFileToDisk, reconcileLeadFolder, cleanupFieldDocumentsForLead } from '../services/api-uploads-mirror';
import { isSingleFileDocumentField, combineUploadName, resolveCanonicalDocumentFilename } from '../../../shared/loan-form/document-filenames';
import { cibilCanonicalExistsOnDisk } from '../services/api-uploads-mirror/cibil-disk-bytes';
import {
  appendPlLeadSubmissionLog,
  appendAdminDocumentUploadLog,
  extractErrorMessage,
} from '../../../utils/pl-lead-submission-logger';
import { validateBusinessLoanPayload } from '../utils/validate-business-loan';
import { LOAN_APP_MEDIA_FIELDS } from '../utils/media-fields';

const MEDIA_FIELDS = [...LOAN_APP_MEDIA_FIELDS];

function collectFileIdsWithFields(data: Record<string, unknown>): {
  fileIds: Set<number>;
  fileFieldById: Record<number, string>;
} {
  const fileIds = new Set<number>();
  const fileFieldById: Record<number, string> = {};

  const addId = (id: unknown, field: string) => {
    const parsed = parseInt(String(id), 10);
    if (!parsed) return;
    fileIds.add(parsed);
    fileFieldById[parsed] = field;
  };

  for (const field of MEDIA_FIELDS) {
    if (!data[field]) continue;
    const val = data[field] as unknown;

    if (Array.isArray(val)) {
      val.forEach((id) => addId(id, field));
    } else if (val && typeof val !== 'object') {
      addId(val, field);
    } else if (val && typeof val === 'object' && (val as { id?: unknown }).id) {
      addId((val as { id: unknown }).id, field);
    }
  }

  return { fileIds, fileFieldById };
}

async function resolveLeadName(
  strapi: any,
  leadId: unknown,
  applicantName: string | null | undefined
): Promise<string | null> {
  if (applicantName) return applicantName;
  const id = Number(leadId);
  if (!Number.isFinite(id) || id <= 0) return null;
  try {
    const lead = await strapi.db.query('api::lead.lead').findOne({
      where: { id },
      select: ['fullName'],
    });
    return lead?.fullName ?? null;
  } catch {
    return null;
  }
}

export default factories.createCoreController(
  'api::loan-application.loan-application',
  ({ strapi }) => ({
    async create(ctx: any) {
      const { data } = ctx.request.body ?? {};
      const requestData = (data ?? {}) as Record<string, unknown>;

      if (requestData.loanType === 'Business Loan') {
        const blErrors = validateBusinessLoanPayload(requestData);
        if (blErrors.length > 0) {
          return ctx.badRequest('Business Loan validation failed', { errors: blErrors });
        }
      }

      try {
        let createdRecord: any = null;
        let result: any = null;
        const { fileIds, fileFieldById } = data
          ? collectFileIdsWithFields(data)
          : { fileIds: new Set<number>(), fileFieldById: {} };

        if (data?.id) {
          try {
            const existing = await strapi.db
              .query('api::loan-application.loan-application')
              .findOne({ where: { id: data.id } });

            if (existing) {
              result = await super.create(ctx);
            } else {
              const entry = await strapi.db
                .query('api::loan-application.loan-application')
                .create({ data });
              result = { data: entry };
              createdRecord = entry;
            }
          } catch {
            result = await super.create(ctx);
          }
        } else {
          result = await super.create(ctx);
        }

        if (!createdRecord && result?.data) {
          createdRecord = result.data.attributes || result.data;
          if (!createdRecord.id && result.data.id) {
            createdRecord.id = result.data.id;
          }
        }

        if (createdRecord) {
          try {
            const leadId = data.leadId || createdRecord.leadId || 'Unknown_Lead';
            const applicantName =
              data.applicantName || createdRecord.applicantName || 'Applicant';
            const folderName = buildLeadUploadFolderName(leadId, applicantName);

            if (fileIds.size > 0) {
              let rootFolder = await strapi.db
                .query('plugin::upload.folder')
                .findOne({ where: { name: 'API Uploads', parent: null } });

              const folderService = strapi.plugin('upload').service('folder');

              if (!rootFolder) {
                try {
                  rootFolder = await folderService.create({
                    name: 'API Uploads',
                    parent: null,
                  });
                } catch {
                  rootFolder = await strapi.db
                    .query('plugin::upload.folder')
                    .findOne({ where: { name: 'API Uploads', parent: null } });
                }
              }

              if (rootFolder) {
                let leadFolder = await strapi.db
                  .query('plugin::upload.folder')
                  .findOne({
                    where: { name: folderName, parent: rootFolder.id },
                  });

                if (!leadFolder) {
                  try {
                    leadFolder = await folderService.create({
                      name: folderName,
                      parent: rootFolder.id,
                    });
                  } catch {
                    leadFolder = await strapi.db
                      .query('plugin::upload.folder')
                      .findOne({
                        where: { name: folderName, parent: rootFolder.id },
                      });
                  }
                }

                if (leadFolder) {
                  for (const fileId of fileIds) {
                    try {
                      await strapi.entityService.update(
                        'plugin::upload.file',
                        fileId,
                        {
                          data: {
                            folder: leadFolder.id,
                            folderPath: leadFolder.path,
                          },
                        }
                      );
                    } catch (updateErr) {
                      console.error(
                        `[LoanApp] Failed to link file ${fileId} to folder ${folderName}:`,
                        updateErr
                      );
                    }
                  }

                  console.log(
                    `[LoanApp] Linked ${fileIds.size} file(s) to Media Library folder: API Uploads/${folderName}`
                  );
                }
              }

              await syncLeadDocumentsToDisk(
                strapi,
                leadId,
                applicantName,
                fileIds,
                fileFieldById,
                { loanApplicationId: createdRecord.id }
              );
            }
          } catch (err) {
            console.error('[LoanApp] Error organizing uploaded documents:', err);
          }
        }

        const leadId = requestData.leadId ?? createdRecord?.leadId ?? null;
        const leadName = await resolveLeadName(
          strapi,
          leadId,
          (requestData.applicantName as string) ?? createdRecord?.applicantName
        );
        const loanApplicationId =
          createdRecord?.id ?? result?.data?.id ?? null;

        await appendPlLeadSubmissionLog(strapi, {
          leadId,
          leadName,
          loanApplicationId,
          event: 'LOAN_APP_SUBMIT_SUCCESS',
          form: 'loan-application',
          fields: requestData,
          source: 'api',
        });

        try {
          const logger: any = strapi.service('api::activity-log.activity-log');
          if (logger?.logEvent) {
            await logger.logEvent({
              action: 'LOAN_APP_SUBMITTED',
              description: `Loan application submitted for lead ${leadId}${
                leadName ? ` (${leadName})` : ''
              }`,
              severity: 'info',
              model: 'api::loan-application.loan-application',
              leadId,
              leadName,
              metadata: {
                leadId,
                leadName,
                loanApplicationId,
              },
            });
          }
        } catch {
          // non-fatal
        }

        return result;
      } catch (err: unknown) {
        const leadId =
          (requestData.leadId as number | string | null | undefined) ?? null;
        const leadName = await resolveLeadName(
          strapi,
          leadId,
          requestData.applicantName as string
        );

        await appendPlLeadSubmissionLog(strapi, {
          leadId,
          leadName,
          event: 'LOAN_APP_SUBMIT_ERROR',
          form: 'loan-application',
          fields: requestData,
          errors: extractErrorMessage(err),
          source: 'api',
        });

        try {
          const logger: any = strapi.service('api::activity-log.activity-log');
          if (logger?.logEvent) {
            await logger.logEvent({
              action: 'LOAN_APP_SUBMIT_FAILED',
              description: `Loan application submit failed for lead ${leadId}: ${extractErrorMessage(err)}`,
              severity: 'error',
              model: 'api::loan-application.loan-application',
              leadId,
              leadName,
              metadata: { leadId, leadName },
            });
          }
        } catch {
          // non-fatal
        }
        throw err;
      }
    },

    async prepareDocumentUpload(ctx: any) {
      const { leadId, applicantName, docType, loanApplicationId } = ctx.request.body ?? {};

      if (!leadId || !applicantName || !docType) {
        return ctx.badRequest('leadId, applicantName, and docType are required');
      }

      if (!isSingleFileDocumentField(String(docType))) {
        return ctx.send({ data: { skipped: true, reason: 'multi-file field' } });
      }

      try {
        const folderName = buildLeadUploadFolderName(leadId, applicantName);
        await cleanupFieldDocumentsForLead(strapi, {
          leadFolder: folderName,
          fieldKey: String(docType),
          keepFileIds: [],
          loanApplicationId:
            loanApplicationId != null ? Number(loanApplicationId) : undefined,
        });
        return ctx.send({ data: { ok: true, folderName } });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error('[LoanApp] prepareDocumentUpload failed:', err);
        return ctx.internalServerError(message);
      }
    },

    async syncDocuments(ctx: any) {
      const { leadId, applicantName, fileIds, loanApplicationId, docType } =
        ctx.request.body ?? {};

      if (!leadId || !applicantName || !Array.isArray(fileIds) || !fileIds.length) {
        return ctx.badRequest('leadId, applicantName, and fileIds are required');
      }

      try {
        const numericIds = fileIds.map((id: unknown) => Number(id));
        const fileFieldById: Record<number, string> = {};
        if (docType) {
          numericIds.forEach((id: number) => {
            fileFieldById[id] = String(docType);
          });
        }

        const result = await syncLeadDocumentsToDisk(
          strapi,
          leadId,
          applicantName,
          numericIds,
          fileFieldById,
          {
            loanApplicationId:
              loanApplicationId != null ? Number(loanApplicationId) : undefined,
          }
        );

        const moved = result.results.filter((r) => r.ok);

        const folderName = buildLeadUploadFolderName(leadId, applicantName);

        if (docType && isSingleFileDocumentField(String(docType)) && moved.length > 0) {
          try {
            const exceptDestFilenames = [
              ...new Set(
                moved
                  .map((r) => (r.destPath ? path.basename(r.destPath) : null))
                  .filter((name): name is string => Boolean(name))
              ),
            ];

            if (!exceptDestFilenames.length) {
              for (const fileId of numericIds) {
                const row = await strapi.db.query('plugin::upload.file').findOne({
                  where: { id: fileId },
                  select: ['name', 'ext', 'mime'],
                });
                if (!row) continue;
                const originalName = combineUploadName(row.name, row.ext, row.mime);
                const canonical = resolveCanonicalDocumentFilename(
                  String(docType),
                  originalName,
                  undefined,
                  row.mime
                );
                if (canonical) exceptDestFilenames.push(canonical);
              }
            }

            if (exceptDestFilenames.length) {
              await cleanupFieldDocumentsForLead(strapi, {
                leadFolder: folderName,
                fieldKey: String(docType),
                keepFileIds: numericIds,
                loanApplicationId:
                  loanApplicationId != null ? Number(loanApplicationId) : undefined,
                exceptDestFilenames,
              });
            }
          } catch (cleanupErr: unknown) {
            const msg =
              cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr);
            strapi.log.warn(`[LoanApp] Post-sync field cleanup failed for ${folderName}: ${msg}`);
          }
        }

        try {
          await reconcileLeadFolder(strapi, folderName);
        } catch (reconcileErr: unknown) {
          const msg =
            reconcileErr instanceof Error ? reconcileErr.message : String(reconcileErr);
          strapi.log.warn(`[LoanApp] Post-sync reconcile failed for ${folderName}: ${msg}`);
        }

        const isCibilSync =
          docType === 'cibilReport' ||
          moved.some((r) => r.fieldKey === 'cibilReport');

        if (isCibilSync) {
          const cibilResults =
            docType === 'cibilReport'
              ? moved
              : moved.filter((r) => r.fieldKey === 'cibilReport');

          for (const r of cibilResults) {
            if (await cibilCanonicalExistsOnDisk(folderName)) continue;

            const retry = await mirrorFileToDisk(strapi, r.fileId, {
              fieldKey: 'cibilReport',
              loanApplicationId:
                loanApplicationId != null ? Number(loanApplicationId) : undefined,
            });

            if (!retry.ok) {
              strapi.log.warn(
                `[LoanApp] CIBIL post-sync heal failed for file ${r.fileId}: ${retry.error ?? 'unknown'}`
              );
            }
          }

          if (!(await cibilCanonicalExistsOnDisk(folderName))) {
            strapi.log.error(
              `[LoanApp] cibil_report.pdf still missing on disk after sync for ${folderName}`
            );
          }
        }

        if (docType && moved.length > 0) {
          const fileNames: Record<number, string> = {};
          for (const fileId of numericIds) {
            const row = await strapi.db.query('plugin::upload.file').findOne({
              where: { id: fileId },
              select: ['name'],
            });
            if (row?.name) fileNames[fileId] = String(row.name);
          }

          const lead = await strapi.db.query('api::lead.lead').findOne({
            where: { id: Number(leadId) },
            select: ['fullName', 'selectedProduct'],
          });

          const uploads = moved
            .map((r) => {
              const fieldKey = r.fieldKey ?? String(docType);
              return {
                fieldKey,
                fileName: fileNames[r.fileId] ?? '[uploaded]',
              };
            })
            .filter((u) => u.fieldKey);

          if (uploads.length) {
            await appendAdminDocumentUploadLog(strapi, {
              leadId,
              leadName: (lead?.fullName as string) ?? applicantName,
              loanApplicationId:
                loanApplicationId != null ? Number(loanApplicationId) : undefined,
              loanType: (lead?.selectedProduct as string) ?? undefined,
              uploads,
              source: 'admin',
            });
          }
        }

        return ctx.send({ data: result });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        strapi.log.error('[LoanApp] syncDocuments failed:', err);
        return ctx.internalServerError(message);
      }
    },
  })
);
