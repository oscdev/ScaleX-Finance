import { Box, Typography } from '@strapi/design-system';
import type { FormFieldDef } from '../../shared/loan-form/types';
import {
    getFieldsForFunnel,
    getSectionsForFunnel,
    readFormFieldValue,
    FIELD_OPTIONS,
} from '../../shared/loan-form/field-schema';
import { FormFieldControl, type FormFieldValue } from './FormFieldControl';
import { SchemaEditableField } from './SchemaEditableField';
import { styles } from '../LeadViewDashboard/styles';

export type LoanFormSectionsProps = {
    loanType: string;
    occupation: string;
    formData: Record<string, Record<string, unknown>> | null | undefined;
    mode: 'edit' | 'inline';
    canView: (section: string) => boolean;
    canViewField: (section: string, field: string) => boolean;
    canEditField: (section: string, field: string) => boolean;
    onSaveField: (section: string, fieldKey: string, value: FormFieldValue) => Promise<void>;
    onDraftChange?: (section: string, fieldKey: string, value: FormFieldValue) => void;
    onSectionPatch?: (section: string, patch: Record<string, unknown>) => void;
};

const RunningLoansSection = ({
    formData,
    mode,
    canViewField,
    canEditField,
    onSaveField,
    onDraftChange,
}: Pick<
    LoanFormSectionsProps,
    'formData' | 'mode' | 'canViewField' | 'canEditField' | 'onSaveField' | 'onDraftChange'
>) => {
    const loans = (formData?.otherDetails?.runningLoans as Record<string, unknown>[]) || [];
    const columns = [
        { field: 'type', fk: 'loanType', label: 'Loan Type', widget: 'select' as const, options: FIELD_OPTIONS.runningLoanType },
        { field: 'bank', fk: 'bank', label: 'Bank Name', widget: 'text' as const },
        { field: 'amount', fk: 'amount', label: 'Loan Amount', widget: 'text' as const },
        { field: 'emi', fk: 'emi', label: 'EMI amount', widget: 'text' as const },
        { field: 'paidEmi', fk: 'outstanding', label: 'No of Paid EMI', widget: 'text' as const },
    ].filter((c) => canViewField('runningLoans', c.fk));

    if (!columns.length) return null;

    const saveRunning = async (index: number, field: string, fk: string, value: FormFieldValue) => {
        const runningLoans = [...loans];
        runningLoans[index] = { ...runningLoans[index], [field]: value };
        await onSaveField('otherDetails', 'runningLoans', runningLoans);
    };

    return (
        <Box marginBottom={4}>
            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">
                Running Loan (If Any)
            </Typography>
            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                {loans.length > 0 ? (
                    <table style={styles.loansTable}>
                        <thead>
                            <tr style={styles.loansHeadRow}>
                                {columns.map((c) => (
                                    <th key={c.field} style={styles.loansCell}>{c.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loans.map((row, i) => (
                                <tr key={i} style={styles.loansRow}>
                                    {columns.map((c) => {
                                        const val = row[c.field];
                                        const def: FormFieldDef = {
                                            section: 'otherDetails',
                                            permissionSection: 'runningLoans',
                                            key: c.field,
                                            label: c.label,
                                            widget: c.widget,
                                            options: c.options,
                                            funnelStep: 'Other',
                                        };
                                        const editable = canEditField('runningLoans', c.fk);
                                        if (mode === 'edit') {
                                            return (
                                                <td key={c.field} style={styles.loansCell}>
                                                    <FormFieldControl
                                                        def={def}
                                                        value={val as FormFieldValue}
                                                        disabled={!editable}
                                                        onChange={(v) => {
                                                            const nextLoans = loans.map((r, idx) => (
                                                                idx === i ? { ...r, [c.field]: v } : r
                                                            ));
                                                            onDraftChange?.('otherDetails', 'runningLoans', nextLoans);
                                                        }}
                                                    />
                                                </td>
                                            );
                                        }
                                        return (
                                            <td key={c.field} style={styles.loansCell}>
                                                <SchemaEditableField
                                                    def={def}
                                                    value={val as FormFieldValue}
                                                    canEdit={editable}
                                                    onSave={(v) => saveRunning(i, c.field, c.fk, v)}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <Typography variant="pi" textColor="neutral600">No running loans reported.</Typography>
                )}
            </Box>
        </Box>
    );
};

export const LoanFormSections = ({
    loanType,
    occupation,
    formData,
    mode,
    canView,
    canViewField,
    canEditField,
    onSaveField,
    onDraftChange,
    onSectionPatch,
}: LoanFormSectionsProps) => {
    const ctx = { loanType, occupation };
    const sections = getSectionsForFunnel(ctx);
    const fields = getFieldsForFunnel(ctx, formData, { ignoreShowWhen: true });

    const fieldsBySection = sections.map((sec) => ({
        ...sec,
        fields: fields.filter((f) => f.section === sec.formDataSection),
    }));

    const handleChange = (def: FormFieldDef, value: FormFieldValue) => {
        if (mode === 'edit') {
            onDraftChange?.(def.section, def.key, value);
            return;
        }
        void onSaveField(def.section, def.key, value);
    };

    return (
        <>
            {fieldsBySection.map((sec) => {
                if (!canView(sec.permissionSection)) return null;
                // Other step fields live in RunningLoansSection; skip the empty shell.
                if (sec.fields.length === 0 && sec.formDataSection === 'otherDetails') return null;
                const isAddress = sec.formDataSection === 'addressDetails';
                const gridFields = sec.fields.filter((f) => f.key !== 'address' && f.key !== 'propertyAddressPincode');
                const fullWidth = sec.fields.filter((f) => f.key === 'address' || f.key === 'propertyAddressPincode');

                return (
                    <Box key={sec.step} marginBottom={4}>
                        <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">
                            {sec.title}
                        </Typography>
                        <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                            <div style={isAddress ? styles.fourColGridTight : styles.fourColGridTight}>
                                {gridFields.filter((f) => canViewField(f.permissionSection, f.key)).map((def) => {
                                    const value = readFormFieldValue(formData, def.section, def.key);
                                    const editable = canEditField(def.permissionSection, def.key);
                                    return (
                                        <Box key={`${def.section}-${def.key}`}>
                                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold" marginBottom={1}>
                                                {def.label}
                                            </Typography>
                                            {mode === 'edit' ? (
                                                <FormFieldControl
                                                    def={def}
                                                    value={value as FormFieldValue}
                                                    disabled={!editable}
                                                    formData={formData}
                                                    onChange={(v) => handleChange(def, v)}
                                                    onSectionPatch={onSectionPatch}
                                                />
                                            ) : (
                                                <SchemaEditableField
                                                    def={def}
                                                    value={value as FormFieldValue}
                                                    canEdit={editable}
                                                    formData={formData}
                                                    onSave={(v) => onSaveField(def.section, def.key, v)}
                                                    onSectionPatch={onSectionPatch}
                                                />
                                            )}
                                        </Box>
                                    );
                                })}
                            </div>
                            {fullWidth.filter((f) => canViewField(f.permissionSection, f.key)).map((def) => {
                                const value = readFormFieldValue(formData, def.section, def.key);
                                const editable = canEditField(def.permissionSection, def.key);
                                return (
                                    <Box key={`${def.section}-${def.key}`} marginTop={2}>
                                        <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold" marginBottom={1}>
                                            {def.label}
                                        </Typography>
                                        {mode === 'edit' ? (
                                            <FormFieldControl
                                                def={def}
                                                value={value as FormFieldValue}
                                                disabled={!editable}
                                                formData={formData}
                                                onChange={(v) => handleChange(def, v)}
                                                onSectionPatch={onSectionPatch}
                                            />
                                        ) : (
                                            <SchemaEditableField
                                                def={def}
                                                value={value as FormFieldValue}
                                                canEdit={editable}
                                                formData={formData}
                                                onSave={(v) => onSaveField(def.section, def.key, v)}
                                                onSectionPatch={onSectionPatch}
                                            />
                                        )}
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                );
            })}

            {canView('runningLoans') && (
                <RunningLoansSection
                    formData={formData}
                    mode={mode}
                    canViewField={canViewField}
                    canEditField={canEditField}
                    onSaveField={onSaveField}
                    onDraftChange={onDraftChange}
                />
            )}
        </>
    );
};
