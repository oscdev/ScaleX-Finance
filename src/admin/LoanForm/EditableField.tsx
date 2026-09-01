import { useState, type CSSProperties } from 'react';
import { Typography } from '@strapi/design-system';

const controlStyle: CSSProperties = {
    fontSize: '13px',
    border: '1px solid #4945ff',
    borderRadius: '4px',
    padding: '2px 6px',
    outline: 'none',
    flex: 1,
    minWidth: '80px',
};

export type EditableFieldOption = { value: string; label: string };

export const EditableField = ({
    value,
    displayValue,
    onSave,
    canEdit = true,
    type = 'text',
    options,
}: {
    value: string;
    displayValue?: string;
    onSave: (val: string | boolean) => Promise<void>;
    canEdit?: boolean;
    type?: 'text' | 'number' | 'boolean' | 'select';
    options?: EditableFieldOption[];
}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);

    const display = displayValue ?? value;

    const doSave = async () => {
        setSaving(true);
        try {
            const saveVal = type === 'boolean' ? draft === 'true' : draft;
            await onSave(saveVal);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    if (!canEdit) {
        return <Typography variant="pi" textColor="neutral800">{display || 'N/A'}</Typography>;
    }

    if (editing) {
        return (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {type === 'boolean' ? (
                    <select
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        autoComplete="off"
                        style={controlStyle}
                    >
                        <option value="">Select</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                ) : type === 'select' ? (
                    <select
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        autoComplete="off"
                        style={controlStyle}
                    >
                        <option value="">Select</option>
                        {(options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={type}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        autoComplete="off"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') doSave();
                            if (e.key === 'Escape') setEditing(false);
                        }}
                        style={controlStyle}
                    />
                )}
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
                    onClick={() => setEditing(false)}
                    style={{ fontSize: '11px', background: '#f0f0f3', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}
                >
                    ✕
                </button>
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
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#4945ff', opacity: 0.45, lineHeight: 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.45' }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        </div>
    );
};
