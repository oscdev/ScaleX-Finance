/** Normalize Strapi v5 REST / CM loan-application rows for admin UI. */

export function extractAppLeadId(
  row: Record<string, unknown> | null | undefined
): number | null {
  if (!row) return null;
  const raw = row.leadId ?? row.lead_id;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    return parseInt(raw, 10);
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rel = raw as Record<string, unknown>;
    const id = rel.id;
    if (typeof id === 'number' && Number.isFinite(id)) return id;
    if (typeof id === 'string' && /^\d+$/.test(id.trim())) {
      return parseInt(id, 10);
    }
  }
  return null;
}

export function normalizeLoanAppRow(
  row: Record<string, unknown>
): Record<string, unknown> {
  const attrs = (row.attributes as Record<string, unknown>) || row;
  const leadId = extractAppLeadId(attrs) ?? extractAppLeadId(row);
  return {
    ...attrs,
    id: row.id ?? attrs.id,
    documentId: row.documentId ?? attrs.documentId,
    leadId: leadId ?? attrs.leadId ?? row.leadId,
  };
}

/** Accept row when leadId matches, or when result came from a leadId filter and FK is absent. */
export function acceptLoanAppForLead(
  app: Record<string, unknown>,
  expectedLeadId: number | null,
  fromLeadIdFilter: boolean
): boolean {
  if (expectedLeadId == null) return true;
  const appLeadId = extractAppLeadId(app);
  if (appLeadId === expectedLeadId) return true;
  if (fromLeadIdFilter && appLeadId == null) return true;
  return false;
}

export function finalizeLoanAppRow(
  app: Record<string, unknown>,
  expectedLeadId: number | null
): Record<string, unknown> {
  const leadId = extractAppLeadId(app) ?? expectedLeadId;
  return leadId != null ? { ...app, leadId } : app;
}
