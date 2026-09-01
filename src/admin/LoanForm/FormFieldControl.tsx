import type { CSSProperties } from 'react';
import type { FormFieldDef } from '../../shared/loan-form/types';
import { INDIA_STATES_DISTRICTS } from '../../shared/loan-form/india-states-districts';

const inputStyle: CSSProperties = {
    fontSize: '13px',
    border: '1px solid #dcdce4',
    borderRadius: '4px',
    padding: '6px 10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
};

const disabledStyle: CSSProperties = {
    ...inputStyle,
    background: '#f6f6f9',
    cursor: 'not-allowed',
    opacity: 0.7,
};

export type FormFieldValue = unknown;

export interface FormFieldControlProps {
    def: FormFieldDef;
    value: FormFieldValue;
    onChange: (value: FormFieldValue) => void;
    disabled?: boolean;
    formData?: Record<string, Record<string, unknown>> | null;
    /** When state changes, clear district */
    onSectionPatch?: (section: string, patch: Record<string, unknown>) => void;
}

const toStr = (v: FormFieldValue): string => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'true' : 'false';
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
};

const YesNoRadio = ({
    name,
    value,
    onChange,
    disabled,
}: {
    name: string;
    value: FormFieldValue;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {(['Yes', 'No'] as const).map((label) => {
            const boolVal = label === 'Yes';
            const checked = value === boolVal;
            return (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                    <input
                        type="radio"
                        name={name}
                        checked={checked}
                        disabled={disabled}
                        autoComplete="off"
                        onChange={() => onChange(boolVal)}
                    />
                    {label}
                </label>
            );
        })}
    </div>
);

export const FormFieldControl = ({
    def,
    value,
    onChange,
    disabled = false,
    formData,
    onSectionPatch,
}: FormFieldControlProps) => {
    const style = disabled ? disabledStyle : inputStyle;

    switch (def.widget) {
        case 'select':
        case 'stateSelect':
            return (
                <select
                    value={toStr(value)}
                    disabled={disabled}
                    autoComplete="off"
                    onChange={(e) => {
                        const next = e.target.value;
                        onChange(next);
                        if (def.widget === 'stateSelect' && onSectionPatch) {
                            onSectionPatch(def.section, { district: '' });
                        }
                    }}
                    style={style}
                >
                    <option value="">Select</option>
                    {(def.widget === 'stateSelect'
                        ? INDIA_STATES_DISTRICTS.map((s) => s.state)
                        : def.options || []
                    ).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            );

        case 'districtSelect': {
            const state = String(formData?.addressDetails?.state || '');
            const districts = INDIA_STATES_DISTRICTS.find((s) => s.state === state)?.districts || [];
            return (
                <select
                    value={toStr(value)}
                    disabled={disabled || !state}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                    style={style}
                >
                    <option value="">{state ? 'Select district' : 'Select state first'}</option>
                    {districts.map((d) => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            );
        }

        case 'radio':
            return (
                <YesNoRadio
                    name={`${def.section}-${def.key}`}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                />
            );

        case 'checkbox':
            return (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={value === true}
                        disabled={disabled}
                        autoComplete="off"
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    {def.label}
                </label>
            );

        case 'checkboxGroup': {
            const selected: string[] = Array.isArray(value)
                ? value.filter((x): x is string => typeof x === 'string')
                : [];
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                    {(def.options || []).map((opt) => {
                        const checked = selected.includes(opt);
                        return (
                            <label
                                key={opt}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '12px',
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={disabled}
                                    autoComplete="off"
                                    onChange={(e) => {
                                        const next = e.target.checked
                                            ? [...selected, opt]
                                            : selected.filter((x) => x !== opt);
                                        onChange(next);
                                    }}
                                />
                                {opt}
                            </label>
                        );
                    })}
                </div>
            );
        }

        case 'date':
            return (
                <input
                    type="date"
                    value={toStr(value)}
                    disabled={disabled}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                    style={style}
                />
            );

        case 'number':
            return (
                <input
                    type="number"
                    value={toStr(value)}
                    disabled={disabled}
                    placeholder={def.placeholder}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                    style={style}
                />
            );

        case 'textarea':
            return (
                <textarea
                    value={toStr(value)}
                    disabled={disabled}
                    placeholder={def.placeholder}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    style={{ ...style, resize: 'vertical' }}
                />
            );

        case 'text':
        default:
            return (
                <input
                    type="text"
                    value={toStr(value)}
                    disabled={disabled}
                    placeholder={def.placeholder}
                    autoComplete="off"
                    onChange={(e) => onChange(e.target.value)}
                    style={style}
                />
            );
    }
};
