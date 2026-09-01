import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Typography } from '@strapi/design-system';

export type SearchableOption = {
    value: string;
    label: string;
    /** Extra text included in search (email, id, etc.) */
    searchText?: string;
};

const panelStyle = (compact: boolean): CSSProperties => ({
    position: 'absolute',
    top: '100%',
    left: 0,
    ...(compact ? { right: 'auto', minWidth: 260, maxWidth: 320 } : { right: 0 }),
    zIndex: 9999,
    background: '#fff',
    border: '1px solid #dcdce4',
    borderRadius: '4px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
    maxHeight: '220px',
    display: 'flex',
    flexDirection: 'column',
    marginTop: '2px',
});

const filterOptions = (options: SearchableOption[], query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
        const hay = `${opt.label} ${opt.value} ${opt.searchText || ''}`.toLowerCase();
        return hay.includes(q);
    });
};

export const SearchableEditableField = ({
    value,
    displayValue,
    options,
    onSave,
    canEdit = true,
    onDraftSelect,
    allowEmpty = false,
    emptyLabel = 'None',
    compact = false,
}: {
    value: string;
    displayValue?: string;
    options: SearchableOption[];
    onSave: (val: string) => Promise<void>;
    canEdit?: boolean;
    /** Fires when user picks an option in the dropdown (before save). */
    onDraftSelect?: (opt: SearchableOption | null) => void;
    allowEmpty?: boolean;
    emptyLabel?: string;
    compact?: boolean;
}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(true);
    const [saving, setSaving] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const display = displayValue ?? (options.find((o) => o.value === value)?.label || value);

    useEffect(() => {
        if (!editing) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [editing]);

    const startEdit = () => {
        setDraft(value);
        setSearch('');
        setOpen(true);
        setEditing(true);
    };

    const pickOption = (opt: SearchableOption | null) => {
        const next = opt?.value ?? '';
        setDraft(next);
        onDraftSelect?.(opt);
        setOpen(false);
    };

    const doSave = async () => {
        setSaving(true);
        try {
            await onSave(draft);
            setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const filtered = filterOptions(options, search);
    const selectedOpt = options.find((o) => o.value === draft);

    const triggerLabel = compact
        ? (displayValue ?? selectedOpt?.label.split(' — ')[0] ?? (draft ? `#${draft}` : 'Select…'))
        : (selectedOpt?.label || (draft ? draft : 'Select…'));

    if (!canEdit) {
        return (
            <Typography variant={compact ? 'pi' : 'omega'} textColor="neutral800">
                {display || 'N/A'}
            </Typography>
        );
    }

    if (editing) {
        return (
            <div
                ref={ref}
                style={{
                    position: 'relative',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    width: compact ? 'auto' : undefined,
                    flex: compact ? '0 0 auto' : 1,
                    minWidth: compact ? undefined : 200,
                }}
            >
                <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                    <div
                        onClick={() => setOpen((o) => !o)}
                        style={{
                            width: compact ? 'auto' : undefined,
                            maxWidth: compact ? 88 : undefined,
                            minWidth: compact ? 56 : undefined,
                            flex: compact ? '0 0 auto' : 1,
                            border: '1px solid #4945ff',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            background: '#fff',
                            minHeight: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '4px',
                        }}
                    >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {triggerLabel}
                        </span>
                        <span style={{ fontSize: '10px', color: '#8e8ea9', flexShrink: 0 }}>▼</span>
                    </div>
                    <button type="button" onClick={doSave} disabled={saving}
                        style={{ fontSize: '11px', background: '#4945ff', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}>
                        {saving ? '…' : '✓'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)}
                        style={{ fontSize: '11px', background: '#f0f0f3', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}>
                        ✕
                    </button>
                </div>
                {open && (
                    <div style={panelStyle(compact)}>
                        <input
                            autoFocus
                            autoComplete="off"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search…"
                            style={{
                                border: 'none',
                                borderBottom: '1px solid #dcdce4',
                                padding: '6px 10px',
                                fontSize: '12px',
                                outline: 'none',
                            }}
                        />
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            {allowEmpty && (
                                <div
                                    onClick={() => pickOption(null)}
                                    style={{ padding: '6px 10px', fontSize: '12px', color: '#8e8ea9', cursor: 'pointer' }}
                                >
                                    — {emptyLabel}
                                </div>
                            )}
                            {filtered.length === 0 ? (
                                <div style={{ padding: '8px 10px', fontSize: '12px', color: '#8e8ea9' }}>No results</div>
                            ) : (
                                filtered.map((opt) => (
                                    <div
                                        key={opt.value}
                                        onClick={() => pickOption(opt)}
                                        style={{
                                            padding: '6px 10px',
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            background: opt.value === draft ? '#f0f0ff' : 'transparent',
                                            fontWeight: opt.value === draft ? 600 : 400,
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5ff'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = opt.value === draft ? '#f0f0ff' : 'transparent'; }}
                                    >
                                        {opt.label}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', width: compact ? 'auto' : undefined }}>
            <Typography variant={compact ? 'pi' : 'omega'} textColor="neutral800">{display || 'N/A'}</Typography>
            <button
                type="button"
                onClick={startEdit}
                title="Edit"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#4945ff', opacity: 0.45, lineHeight: 1 }}
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
