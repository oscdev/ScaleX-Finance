import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { saveLoanFormFieldAdmin, putLoanAppFields } from './loanAppAdminApi';
import {
    getAdminLoanFormSaveBase,
    type AdminLoanFormContextOpts,
} from '../../shared/loan-form/loan-app-submit';

export type LoanFormData = Record<string, Record<string, unknown>> & {
    pdfPasswords?: Record<string, string>;
    docDates?: Record<string, string>;
    docFormats?: Record<string, string>;
};

export type LoanAppRecord = {
    id?: number | string;
    documentId?: string;
    form_data?: LoanFormData | null;
    loanType?: string;
    applicantName?: string;
    leadId?: string | number;
    declarationAccepted?: boolean | null;
};

export const patchFormDataSection = (
    formData: LoanFormData | null | undefined,
    section: string,
    fieldKey: string,
    value: unknown
): LoanFormData => {
    const sectionData: Record<string, unknown> = {
        ...(formData?.[section] || {}),
        [fieldKey]: value,
    };
    if (section === 'addressDetails' && fieldKey === 'state') {
        sectionData.district = '';
    }
    if (section === 'incomeDetails' && fieldKey === 'hasOtherIncome' && value === false) {
        sectionData.otherIncomeSource = '';
        sectionData.otherIncomeAmount = '';
    }
    return {
        ...(formData || {}),
        [section]: sectionData,
    };
};

export type SaveLoanFormDataOpts = {
    clearDeclarationUntilSubmit?: boolean;
} & AdminLoanFormContextOpts;

export const saveLoanFormData = async (
    loanApp: LoanAppRecord,
    section: string,
    fieldKey: string,
    value: unknown,
    opts?: SaveLoanFormDataOpts
): Promise<LoanFormData> => {
    const base = getAdminLoanFormSaveBase(loanApp, {
        leadId: opts?.leadId ?? loanApp.leadId,
        hasSubmitActivity: opts?.hasSubmitActivity,
    });
    const updatedFormData = patchFormDataSection(base, section, fieldKey, value);
    await saveLoanFormFieldAdmin(loanApp, section, fieldKey, value, updatedFormData, opts);
    return updatedFormData;
};

export const saveLoanFormDataBulk = async (
    loanApp: LoanAppRecord,
    formData: LoanFormData,
    extra?: { loanType?: string; clearDeclarationUntilSubmit?: boolean }
): Promise<LoanAppRecord> => {
    const fields: Record<string, unknown> = { form_data: formData };
    if (extra?.loanType) fields.loanType = extra.loanType;
    if (extra?.clearDeclarationUntilSubmit) fields.declarationAccepted = false;
    return putLoanAppFields(loanApp, fields);
};

export const useLoanFormSave = (
    loanApp: LoanAppRecord | null,
    setLoanApp: Dispatch<SetStateAction<LoanAppRecord | null>>
) => {
    const handleSaveLoanFormData = useCallback(
        async (section: string, fieldKey: string, value: unknown) => {
            if (!loanApp) return;
            const updatedFormData = await saveLoanFormData(loanApp, section, fieldKey, value);
            setLoanApp((prev) => (prev ? { ...prev, form_data: updatedFormData } : prev));
        },
        [loanApp, setLoanApp]
    );

    const handleSaveBulk = useCallback(
        async (formData: LoanFormData, extra?: { loanType?: string }) => {
            if (!loanApp) return;
            const saved = await saveLoanFormDataBulk(loanApp, formData, extra);
            setLoanApp((prev) =>
                prev
                    ? {
                          ...prev,
                          ...saved,
                          form_data: formData,
                          ...(extra?.loanType ? { loanType: extra.loanType } : {}),
                      }
                    : prev
            );
        },
        [loanApp, setLoanApp]
    );

    return { handleSaveLoanFormData, handleSaveBulk };
};
