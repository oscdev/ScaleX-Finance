import { handleLeadAdminChangeLog } from '../../../loan-application/services/admin-change-log';
import { normalizeLoanTypeCode } from '../../../../utils/loan-type';

function coerceSelectedProductOnData(data?: Record<string, unknown>) {
  if (!data) return;
  const raw =
    (data.selectedProduct as string | undefined) ??
    (data.selected_product as string | undefined);
  if (raw == null || String(raw).trim() === '') return;
  const code = normalizeLoanTypeCode(String(raw));
  if (code) {
    data.selectedProduct = code;
  }
}

export default {
  async beforeCreate(event: { params?: { data?: Record<string, unknown> } }) {
    coerceSelectedProductOnData(event.params?.data);
  },

  async beforeUpdate(event: {
    params?: { where?: Record<string, unknown>; data?: Record<string, unknown> };
    state?: { adminChangePrev?: Record<string, unknown> };
  }) {
    coerceSelectedProductOnData(event.params?.data);
    event.state = event.state || {};
    const where = event.params?.where ?? {};
    const documentId = where.documentId;
    const numericId = where.id;

    let existing: Record<string, unknown> | null = null;
    if (documentId != null) {
      existing = (await strapi.db.query('api::lead.lead').findOne({
        where: { documentId },
      })) as Record<string, unknown> | null;
    }
    if (!existing && numericId != null) {
      existing = (await strapi.db.query('api::lead.lead').findOne({
        where: { id: Number(numericId) },
      })) as Record<string, unknown> | null;
    }
    if (existing) {
      event.state.adminChangePrev = { ...existing };
    }
  },

  async afterUpdate(event: {
    params?: { data?: Record<string, unknown> };
    result?: Record<string, unknown>;
    state?: { adminChangePrev?: Record<string, unknown> };
  }) {
    await handleLeadAdminChangeLog(strapi, event);
  },
};
