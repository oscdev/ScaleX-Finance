import { useState } from 'react';
import { Typography } from '@strapi/design-system';
import type { FormFieldDef } from '../../shared/loan-form/types';
import { formatFieldDisplayValue } from '../../shared/loan-form/field-schema';
import { FormFieldControl, type FormFieldValue } from './FormFieldControl';

export const SchemaEditableField = ({
    def,
    value,
    displayValue,
    onSave,
    canEdit = true,
    formData,
    onSectionPatch,
}: {
    def: FormFieldDef;
    value: FormFieldValue;
    displayValue?: string;
    onSave: (val: FormFieldValue) => Promise<void>;
    canEdit?: boolean;
    formData?: Record<string, Record<string, unknown>> | null;
    onSectionPatch?: (section: string, patch: Record<string, unknown>) => void;
}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<FormFieldValue>(value);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    const display =
        displayValue ??
        (formatFieldDisplayValue(value, def.widget) ||
            (value === '' || value === null || value === undefined ? '' : String(value)));

    const doSave = async () => {
        setSaving(true);
        setSaveError('');
        try {
            await onSave(draft);
            setEditing(false);
        } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (!canEdit) {
        return <Typography variant="pi" textColor="neutral800">{display || 'N/A'}</Typography>;
    }

    const isWideWidget = def.widget === 'checkboxGroup' || def.widget === 'textarea';

    if (editing) {
        return (
            <div style={{ display: 'flex', flexDirection: isWideWidget ? 'column' : 'row', gap: '4px', alignItems: isWideWidget ? 'stretch' : 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <FormFieldControl
                        def={def}
                        value={draft}
                        onChange={setDraft}
                        formData={formData}
                        onSectionPatch={onSectionPatch}
                    />
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        type="button"
                        onClick={doSave}
                        disabled={saving}
                        style={{ fontSize: '11px', background: '#4945ff', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}
                    >
                        {saving ? '…' : '✓'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setDraft(value); setEditing(false); }}
                        style={{ fontSize: '11px', background: '#f0f0f3', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                    </div>
                    {saveError ? (
                        <span style={{ fontSize: '10px', color: '#d02b20', maxWidth: '160px', textAlign: 'right' }}>
                            {saveError}
                        </span>
                    ) : null}
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Typography variant="pi" textColor="neutral800">{display || 'N/A'}</Typography>
            <button
                type="button"
                onClick={() => { setDraft(value); setEditing(true); }}
                title="Edit field"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#4945ff', opacity: 0.45, lineHeight: 1, flexShrink: 0 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45'; }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        </div>
    );
};
