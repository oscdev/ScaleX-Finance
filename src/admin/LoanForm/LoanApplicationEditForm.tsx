import { useEffect, useState, useCallback } from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import { getToken } from '../LeadViewDashboard/useLeadViewDashboard';
import { LoanFormSections } from './LoanFormSections';
import { useSectionPermissions } from './useSectionPermissions';
import { saveLoanFormData, type LoanAppRecord } from './useLoanFormSave';
import { getAppSteps } from '../../shared/loan-form/field-schema';
import {
    getAdminLoanFormDisplayData,
    isStaleLoanFormPrefill,
} from '../../shared/loan-form/loan-app-submit';
import { normalizeLoanAppRow } from './loanAppRowUtils';
import type { FormFieldValue } from './FormFieldControl';

const authHeaders = (): Record<string, string> => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

const fetchCmRecord = async (uid: string, id: string) => {
    const headers = authHeaders();
    const isNumeric = /^\d+$/.test(id);
    if (!isNumeric) {
        const res = await fetch(`/content-manager/collection-types/${uid}/${id}`, { headers });
        if (res.ok) {
            const json = await res.json();
            return json?.data ?? json;
        }
    }
    const searchRes = await fetch(
        `/content-manager/collection-types/${uid}?pageSize=10&page=1&filters[id][$eq]=${id}`,
        { headers }
    );
    if (searchRes.ok) {
        const searchData = await searchRes.json();
        const results = searchData.results || searchData.data || [];
        if (results.length > 0) return results[0];
    }
    return null;
};

export const LoanApplicationEditForm = ({ documentId }: { documentId: string }) => {
    const [loanApp, setLoanApp] = useState<LoanAppRecord | null>(null);
    const [lead, setLead] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [hasLoanSubmitActivity, setHasLoanSubmitActivity] = useState(false);
    const { canView, canViewField, canEditField } = useSectionPermissions();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError('');
            try {
                const loanRaw = await fetchCmRecord('api::loan-application.loan-application', documentId);
                if (!loanRaw) {
                    setError('Loan application not found.');
                    setLoading(false);
                    return;
                }
                const loanObj = normalizeLoanAppRow(loanRaw as Record<string, unknown>) as LoanAppRecord;
                setLoanApp(loanObj);

                const parentId =
                    loanObj.leadId ||
                    (loanRaw as { lead?: { id?: unknown; documentId?: unknown } }).lead?.id ||
                    (loanRaw as { lead?: { documentId?: unknown } }).lead?.documentId;
                if (parentId) {
                    const leadObj = await fetchCmRecord('api::lead.lead', String(parentId));
                    if (leadObj) setLead(leadObj);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load loan application.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [documentId]);

    useEffect(() => {
        const leadId = loanApp?.leadId;
        if (!leadId) {
            setHasLoanSubmitActivity(false);
            return;
        }
        const loadSubmitActivity = async () => {
            try {
                const res = await fetch(`/api/activity-logs/by-lead/${leadId}`);
                if (!res.ok) {
                    setHasLoanSubmitActivity(false);
                    return;
                }
                const data = await res.json();
                const entries = data.data || [];
                setHasLoanSubmitActivity(
                    entries.some((e: { action?: string }) => e.action === 'LOAN_APP_SUBMITTED')
                );
            } catch {
                setHasLoanSubmitActivity(false);
            }
        };
        loadSubmitActivity();
    }, [loanApp?.leadId]);

    const loanType = String(loanApp?.loanType || lead?.selectedProduct || 'Personal Loan');
    const occupation = String(lead?.employmentType || '');

    const handleSaveLoanFormData = useCallback(
        async (section: string, fieldKey: string, value: FormFieldValue) => {
            if (!loanApp) return;
            try {
                const clearDeclaration = !hasLoanSubmitActivity;
                const updatedFormData = await saveLoanFormData(loanApp, section, fieldKey, value, {
                    clearDeclarationUntilSubmit: clearDeclaration,
                    leadId: loanApp.leadId,
                    hasSubmitActivity: hasLoanSubmitActivity,
                });
                setLoanApp((prev) =>
                    prev
                        ? {
                              ...prev,
                              form_data: updatedFormData,
                              ...(clearDeclaration ? { declarationAccepted: false } : {}),
                          }
                        : prev
                );
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Save failed.');
            }
        },
        [loanApp, hasLoanSubmitActivity]
    );

    const backToList = () => {
        window.location.href = '/admin/content-manager/collection-types/api::loan-application.loan-application';
    };

    if (loading) {
        return <Box padding={8}>Loading loan application…</Box>;
    }

    if (!loanApp) {
        return <Box padding={8}><Typography textColor="danger600">{error || 'Loan application not found.'}</Typography></Box>;
    }

    const steps = getAppSteps(loanType, occupation);
    const displayOpts = { leadId: loanApp.leadId, hasSubmitActivity: hasLoanSubmitActivity };
    const loanFormDisplayData = getAdminLoanFormDisplayData(loanApp, displayOpts);
    const stalePrefill = isStaleLoanFormPrefill(loanApp, displayOpts);

    return (
        <Box padding={6} style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
                <div>
                    <Typography variant="alpha" fontWeight="bold">
                        {loanApp.applicantName || 'Loan Application'}
                    </Typography>
                    <Typography variant="pi" textColor="neutral600">
                        {loanType} · Lead {String(loanApp.leadId || lead?.id || '—')}
                    </Typography>
                </div>
                <Button variant="tertiary" onClick={backToList}>Back to list</Button>
            </Flex>

            {error && (
                <Box padding={3} marginBottom={3} background="danger100" borderRadius="4px">
                    <Typography textColor="danger600">{error}</Typography>
                </Box>
            )}

            {(!hasLoanSubmitActivity || stalePrefill) && (
                <Box padding={3} marginBottom={3} background="warning100" borderRadius="4px">
                    <Typography textColor="warning700">
                        {stalePrefill
                            ? 'Pre-filled loan data from automation is hidden. Staff can enter or update fields below.'
                            : 'Loan application not submitted from the frontend yet. Staff can enter or update fields below.'}
                    </Typography>
                </Box>
            )}

            <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
            <LoanFormSections
                loanType={loanType}
                occupation={occupation}
                formData={loanFormDisplayData}
                mode="inline"
                canView={canView}
                canViewField={canViewField}
                canEditField={canEditField}
                onSaveField={handleSaveLoanFormData}
            />

            {steps.includes('Docs') && canView('documentDetails') && (
                <Box marginBottom={4}>
                    <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">
                        Documents
                    </Typography>
                    <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                        <Typography variant="pi" textColor="neutral600">
                            Document uploads are managed from the Lead View dashboard. Open this record via Lead View for full document management.
                        </Typography>
                    </Box>
                </Box>
            )}
            </form>
        </Box>
    );
};
