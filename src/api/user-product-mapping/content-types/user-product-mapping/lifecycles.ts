import { normalizeLoanTypeCode } from '../../../../utils/loan-type';

/** Store known loan titles as PL | BL | HL | LAP. Leave other product titles unchanged. */
function coerceProductOnData(data?: Record<string, unknown>) {
  if (!data || data.product == null) return;
  const raw = String(data.product).trim();
  if (!raw) return;
  const code = normalizeLoanTypeCode(raw);
  if (code) data.product = code;
}

export default {
  async beforeCreate(event: { params?: { data?: Record<string, unknown> } }) {
    coerceProductOnData(event.params?.data);
  },

  async beforeUpdate(event: { params?: { data?: Record<string, unknown> } }) {
    coerceProductOnData(event.params?.data);
  },
};
