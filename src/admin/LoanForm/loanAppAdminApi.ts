import { getToken } from '../LeadViewDashboard/useLeadViewDashboard';
import type { LoanAppRecord, LoanFormData } from './useLoanFormSave';
import { normalizeLoanAppRow } from './loanAppRowUtils';

const LOAN_APP_UID = 'api::loan-application.loan-application';

export const loanAppAuthHeaders = (): Record<string, string> => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

function cmErrorMessage(body: Record<string, unknown>, fallback: string): string {
    const err = body?.error as Record<string, unknown> | undefined;
    const details = err?.details as { errors?: Array<{ message?: string }> } | undefined;
    if (Array.isArray(details?.errors) && details.errors.length) {
        return details.errors.map((e) => e.message).filter(Boolean).join('; ');
    }
    return (
        (typeof err?.message === 'string' && err.message) ||
        (typeof body?.message === 'string' && body.message) ||
        fallback
    );
}

/** CM reserves top-level `status` for draft/published — not loan-app.status enum. */
function cmPayloadWithoutReservedStatus(fields: Record<string, unknown>): Record<string, unknown> {
    const { status: _reserved, ...rest } = fields;
    return rest;
}

export function resolveLoanAppCmId(loanApp: LoanAppRecord): string {
    const docId = loanApp.documentId;
    if (docId && String(docId).trim()) return String(docId);
    const id = loanApp.id;
    if (id != null && String(id).trim()) return String(id);
    throw new Error('Loan application record id is missing — reload the page and try again.');
}

/** Resolve Strapi documentId (required for CM PUT) when only numeric id is known. */
export async function resolveLoanAppDocumentId(loanApp: LoanAppRecord): Promise<LoanAppRecord> {
    if (loanApp.documentId) return loanApp;

    const leadId = Number(loanApp.leadId);
    if (Number.isFinite(leadId) && leadId > 0) {
        const byLead = await fetchLoanAppByLeadId(leadId);
        if (byLead?.documentId) {
            return normalizeLoanAppRow({ ...loanApp, ...byLead }) as LoanAppRecord;
        }
    }

    const headers = loanAppAuthHeaders();
    if (loanApp.id != null) {
        const res = await fetch(
            `/content-manager/collection-types/${LOAN_APP_UID}?filters[id][$eq]=${loanApp.id}&pageSize=1`,
            { headers }
        );
        if (res.ok) {
            const data = await res.json();
            const found = data.results?.[0] || data.data?.[0];
            if (found) {
                return normalizeLoanAppRow({ ...loanApp, ...found }) as LoanAppRecord;
            }
        }
    }

    return loanApp;
}

/** Persist loan-application fields via Content Manager (admin JWT). */
export async function putLoanAppFields(
    loanApp: LoanAppRecord,
    fields: Record<string, unknown>
): Promise<LoanAppRecord> {
    const ready = await resolveLoanAppDocumentId(loanApp);
    const cmId = resolveLoanAppCmId(ready);
    const body = cmPayloadWithoutReservedStatus(fields);
    const res = await fetch(`/content-manager/collection-types/${LOAN_APP_UID}/${cmId}`, {
        method: 'PUT',
        headers: loanAppAuthHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(cmErrorMessage(body, `Save failed (${res.status})`));
    }
    const json = await res.json().catch(() => ({}));
    const row = (json?.data ?? json) as Record<string, unknown>;
    return normalizeLoanAppRow({ ...ready, ...row, documentId: row.documentId ?? cmId }) as LoanAppRecord;
}

export type LeadStubForLoanApp = {
    id?: number | string;
    documentId?: string;
    leadId?: number | string;
    fullName?: string;
    selectedProduct?: string;
    email?: string;
    mobileNumber?: string;
    panCard?: string;
    aadharCard?: string;
    requiredAmount?: number | string;
};

export async function fetchLoanAppByLeadId(numericLeadId: number): Promise<LoanAppRecord | null> {
    const headers = loanAppAuthHeaders();
    const cmRes = await fetch(
        `/content-manager/collection-types/${LOAN_APP_UID}?filters[leadId][$eq]=${numericLeadId}&pageSize=1`,
        { headers }
    );
    if (cmRes.ok) {
        const data = await cmRes.json();
        const found = data.results?.[0] || data.data?.[0];
        if (found) {
            const row = normalizeLoanAppRow(found) as LoanAppRecord;
            if (Number(row.leadId) === numericLeadId) return row;
        }
    }

    const pubRes = await fetch(`/api/loan-applications?filters[leadId][$eq]=${numericLeadId}&pagination[pageSize]=1`);
    if (pubRes.ok) {
        const pubData = await pubRes.json();
        const item = pubData.data?.[0];
        if (item) {
            const attrs = (item.attributes as Record<string, unknown>) || item;
            const row = normalizeLoanAppRow({
                ...attrs,
                id: item.id ?? attrs.id,
                documentId: item.documentId ?? attrs.documentId,
            }) as LoanAppRecord;
            if (Number(row.leadId) === numericLeadId) {
                return resolveLoanAppDocumentId(row);
            }
        }
    }

    return null;
}

/** Load existing loan-app for lead or create a stub row for admin entry. */
export async function ensureLoanAppForLead(
    lead: LeadStubForLoanApp,
    numericLeadId: number,
    existing?: LoanAppRecord | null
): Promise<LoanAppRecord> {
    let app = existing ?? null;
    if (app) {
        app = await resolveLoanAppDocumentId(app);
    } else {
        app = await fetchLoanAppByLeadId(numericLeadId);
    }
    if (app) return app;

    // Do not send loan-app `status` here — CM treats top-level status as draft/published.
    // Schema default (`Pending`) applies on create.
    const payload: Record<string, unknown> = {
        leadId: numericLeadId,
        loanType: lead.selectedProduct || 'Personal Loan',
        applicantName: lead.fullName || 'Applicant',
        email: lead.email || '',
        phone: lead.mobileNumber || '',
        panNumber: lead.panCard || '',
        aadharNumber: lead.aadharCard || '',
        declarationAccepted: false,
        form_data: {},
    };
    if (lead.requiredAmount != null && lead.requiredAmount !== '') {
        payload.loanAmount = lead.requiredAmount;
    }

    const res = await fetch(`/content-manager/collection-types/${LOAN_APP_UID}`, {
        method: 'POST',
        headers: loanAppAuthHeaders(),
        body: JSON.stringify(cmPayloadWithoutReservedStatus(payload)),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const existingAfterFail = await fetchLoanAppByLeadId(numericLeadId);
        if (existingAfterFail) return existingAfterFail;
        throw new Error(cmErrorMessage(body, `Could not create loan application (${res.status})`));
    }
    const json = await res.json().catch(() => ({}));
    const row = (json?.data ?? json) as Record<string, unknown>;
    return normalizeLoanAppRow(row) as LoanAppRecord;
}

export type SaveLoanFormFieldOpts = {
    clearDeclarationUntilSubmit?: boolean;
};

export async function saveLoanFormFieldAdmin(
    loanApp: LoanAppRecord,
    section: string,
    fieldKey: string,
    value: unknown,
    updatedFormData: LoanFormData,
    opts?: SaveLoanFormFieldOpts
): Promise<LoanAppRecord> {
    const fields: Record<string, unknown> = { form_data: updatedFormData };
    if (opts?.clearDeclarationUntilSubmit) fields.declarationAccepted = false;
    return putLoanAppFields(loanApp, fields);
}
