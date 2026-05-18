import { useEffect, useState } from 'react';
import { Box, Typography } from '@strapi/design-system';

// ─── Tree Definition ─────────────────────────────────────────────────────────

const SECTION_TREE = [
    {
        key: 'personalInfo',
        label: 'Lead Details',
        fields: [
            { key: 'fullName', label: 'Full Name' },
            { key: 'mobileNumber', label: 'Mobile Number' },
            { key: 'email', label: 'Email' },
            { key: 'requiredAmount', label: 'Loan Requirement' },
            { key: 'aadharCard', label: 'Aadhar Card' },
            { key: 'panCard', label: 'Pan Card' },
            { key: 'pinCode', label: 'Pin Code' },
            { key: 'leadType', label: 'Lead Type' },
            { key: 'employmentType', label: 'Employment Type' },
            { key: 'advisorReferralId', label: 'Advisor Referral ID' },
            { key: 'parentAdvisorId', label: 'Parent Advisor ID' },
            { key: 'getEmailNotification', label: 'Email Notifications' },
        ],
    },
    {
        key: 'personalDetails',
        label: 'Personal Details',
        fields: [
            { key: 'dob', label: 'Date of Birth' },
            { key: 'maritalStatus', label: 'Marital Status' },
            { key: 'spouseName', label: 'Spouse Name' },
            { key: 'motherName', label: 'Mother Name' },
            { key: 'alternateNumber', label: 'Alternate Number' },
            { key: 'dependents', label: 'Dependents' },
        ],
    },
    {
        key: 'addressDetails',
        label: 'Residence Details',
        fields: [
            { key: 'line1', label: 'Address Line 1' },
            { key: 'line2', label: 'Address Line 2' },
            { key: 'landmark', label: 'Landmark' },
            { key: 'state', label: 'State' },
            { key: 'district', label: 'District' },
            { key: 'city', label: 'City' },
            { key: 'residenceType', label: 'Residence Type' },
        ],
    },
    {
        key: 'propertyDetails',
        label: 'Property Details',
        fields: [
            { key: 'type', label: 'Property Type' },
            { key: 'status', label: 'Property Status' },
            { key: 'value', label: 'Property Value' },
            { key: 'propertyAddressPincode', label: 'Property Address Pincode' },
        ],
    },
    {
        key: 'incomeDetails',
        label: 'Income Details',
        fields: [
            { key: 'companyName', label: 'Company Name' },
            { key: 'designation', label: 'Designation' },
            { key: 'companyAddress', label: 'Company Address' },
            { key: 'netSalary', label: 'Net Salary' },
            { key: 'salaryMode', label: 'Salary Mode' },
        ],
    },
    {
        key: 'businessInfo',
        label: 'Business Details',
        fields: [
            { key: 'name', label: 'Business Name' },
            { key: 'premises', label: 'Business Premises' },
            { key: 'type', label: 'Business Type' },
            { key: 'turnover', label: 'Annual Turnover' },
            { key: 'age', label: 'Business Age' },
            { key: 'regProof', label: 'Business Reg Proof' },
            { key: 'address', label: 'Business Address' },
        ],
    },
    {
        key: 'runningLoans',
        label: 'Running Loans',
        fields: [
            { key: 'bank', label: 'Bank Name' },
            { key: 'loanType', label: 'Loan Type' },
            { key: 'amount', label: 'Loan Amount' },
            { key: 'emi', label: 'EMI' },
            { key: 'outstanding', label: 'Outstanding Amount' },
        ],
    },
    {
        key: 'documentDetails',
        label: 'Document Details',
        fields: [
            { key: 'panCard', label: 'PAN Card' },
            { key: 'aadharCardFront', label: 'Aadhar Card Front' },
            { key: 'aadharCardBack', label: 'Aadhar Card Back' },
            { key: 'proprietorshipDoc', label: 'Proprietorship Doc' },
            { key: 'businessRegProofDoc', label: 'Business Reg Proof' },
            { key: 'bankStatement', label: '6 Month Bank Statement' },
            { key: 'salarySlips', label: 'Salary Slip' },
            { key: 'propertyPapers', label: 'Property Papers' },
            { key: 'coAppPan', label: 'Co-App PAN' },
            { key: 'coAppAadharFront', label: 'Co-App Aadhar Front' },
            { key: 'coAppAadharBack', label: 'Co-App Aadhar Back' },
            { key: 'otherDocs', label: 'Other Documents' },
            { key: 'password', label: 'Password' },
            { key: 'status', label: 'Upload Status' },
            { key: 'addDocument', label: 'Add Document' },
            { key: 'viewDocument', label: 'View Document' },
        ],
    },
    {
        key: 'assignmentStatus',
        label: 'Assignment & Status',
        fields: [
            { key: 'leadStatus', label: 'Lead Status' },
            { key: 'remarks', label: 'Remarks' },
            { key: 'assignStaff', label: 'Assign Staff' },
            { key: 'assignBanker', label: 'Assign Banker' },
        ],
    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldPerm = { view: boolean; edit: boolean };
type SectionPerm = {
    add: boolean;
    edit: boolean;
    view: boolean;
    delete: boolean;
    fields: Record<string, FieldPerm>;
};
type PermsMap = Record<string, SectionPerm>;

const defaultFieldPerm = (): FieldPerm => ({ view: false, edit: false });

const defaultSectionPerm = (section: typeof SECTION_TREE[0]): SectionPerm => ({
    add: false,
    edit: false,
    view: false,
    delete: false,
    fields: Object.fromEntries(section.fields.map((f) => [f.key, defaultFieldPerm()])),
});

const defaultPerms = (): PermsMap =>
    Object.fromEntries(SECTION_TREE.map((s) => [s.key, defaultSectionPerm(s)]));

const SECTION_PERMS = [
    { key: 'edit' as const, label: 'EDIT', color: '#16a34a' },
    { key: 'view' as const, label: 'VIEW', color: '#2563eb' },
];

const FIELD_PERMS = [
    { key: 'edit' as const, label: 'EDIT', color: '#16a34a' },
    { key: 'view' as const, label: 'VIEW', color: '#2563eb' },
];

const API_BASE = '/admin/loan-app-permissions';
const getToken = () => {
    const t: string = (window as any)._strapi_last_token || '';
    return t.startsWith('Bearer ') ? t.slice(7).trim() : t;
};

// ─── Checkbox ─────────────────────────────────────────────────────────────────

const CB = ({ checked, color, onChange }: { checked: boolean; color: string; onChange: () => void }) => (
    <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: '16px', height: '16px', accentColor: color, cursor: 'pointer' }}
    />
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const LoanAppPermissions = ({ roleId, roleName }: { roleId: number; roleName: string }) => {
    const [perms, setPerms] = useState<PermsMap>(defaultPerms());
    const [recordId, setRecordId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    // ── Load existing permissions ──────────────────────────────────────────────
    useEffect(() => {
        const token = getToken();
        if (!token || !roleId) return;
        fetch(`${API_BASE}?roleId=${roleId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((data) => {
                const results: any[] = data.data || [];
                if (results.length > 0) {
                    const rec = results[0];
                    setRecordId(rec.id);
                    if (rec.permissions) {
                        const base = defaultPerms();
                        Object.entries(rec.permissions).forEach(([sk, sv]: [string, any]) => {
                            if (base[sk]) {
                                base[sk] = {
                                    add: sv.add ?? base[sk].add,
                                    edit: sv.edit ?? base[sk].edit,
                                    view: sv.view ?? base[sk].view,
                                    delete: sv.delete ?? base[sk].delete,
                                    fields: { ...base[sk].fields, ...(sv.fields || {}) },
                                };
                            }
                        });
                        setPerms(base);
                    }
                }
            })
            .catch(() => {});
    }, [roleId]);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setIsSaving(true);
        setSaveError('');
        const token = getToken();
        // Always POST — server upserts by roleId (avoids stale recordId / PUT body-parse issues)
        const body = JSON.stringify({ id: recordId, roleId, roleName, permissions: perms });
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };
        try {
            const res = await fetch(API_BASE, { method: 'POST', headers, body });
            const resData = await res.json().catch(() => ({}));
            if (res.ok) {
                setRecordId(resData.data?.id ?? recordId);
                setSaved(true);
            } else {
                const msg = resData?.error || resData?.message || res.statusText;
                const detail = resData?.received ? ` | received: ${resData.received}` : '';
                setSaveError(`Save failed (${res.status}): ${msg}${detail}`);
            }
        } catch (e: any) {
            setSaveError(`Save error: ${e?.message || 'Network error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        const onSave = () => handleSave();
        window.addEventListener('scalex:save-permissions', onSave);
        return () => window.removeEventListener('scalex:save-permissions', onSave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [perms, recordId, roleId]);

    // ── Toggles ───────────────────────────────────────────────────────────────
    const toggleSection = (sk: string, perm: 'add' | 'edit' | 'view') => {
        setPerms((prev) => {
            const next = { ...prev };
            const newVal = !next[sk][perm];
            next[sk] = { ...next[sk], [perm]: newVal };
            if (perm === 'edit' || perm === 'view') {
                const fields = { ...next[sk].fields };
                Object.keys(fields).forEach((fk) => {
                    fields[fk] = { ...fields[fk], [perm]: newVal };
                });
                next[sk] = { ...next[sk], fields };
            }
            return next;
        });
        setSaved(false); setSaveError('');
    };

    const toggleField = (sk: string, fk: string, perm: 'view' | 'edit') => {
        setPerms((prev) => {
            const next = { ...prev };
            const newVal = !next[sk].fields?.[fk]?.[perm];
            const fields = { ...next[sk].fields };
            fields[fk] = { ...fields[fk], [perm]: newVal };
            next[sk] = { ...next[sk], fields };
            // Enabling a field auto-enables the section level too
            if (newVal && !next[sk][perm]) {
                next[sk] = { ...next[sk], [perm]: true };
            }
            return next;
        });
        setSaved(false); setSaveError('');
    };

    const toggleAll = (perm: 'add' | 'edit' | 'view') => {
        const allOn = SECTION_TREE.every((s) => perms[s.key]?.[perm]);
        setPerms((prev) => {
            const next = { ...prev };
            SECTION_TREE.forEach((s) => {
                next[s.key] = { ...next[s.key], [perm]: !allOn };
                if (perm === 'edit' || perm === 'view') {
                    const fields = { ...next[s.key].fields };
                    Object.keys(fields).forEach((fk) => {
                        fields[fk] = { ...fields[fk], [perm]: !allOn };
                    });
                    next[s.key] = { ...next[s.key], fields };
                }
            });
            return next;
        });
        setSaved(false); setSaveError('');
    };

    const toggleExpand = (sk: string) =>
        setExpanded((prev) => ({ ...prev, [sk]: !prev[sk] }));

    // ── Column widths ─────────────────────────────────────────────────────────
    const COL = '100px';

    return (
        <Box padding={6}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <Box>
                    <Typography variant="delta" fontWeight="bold">
                        Loan Application — Permissions
                    </Typography>
                    <Typography variant="pi" textColor="neutral600" display="block" marginTop={1}>
                        Configure access per section and field for role: <strong>{roleName}</strong>
                    </Typography>
                    <Typography variant="pi" textColor="neutral500" display="block" marginTop={1}>
                        Use the <strong>Save</strong> button at the top of the page to save these permissions.
                    </Typography>
                </Box>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {(saved || isSaving || saveError) && (
                        <Typography variant="pi" style={{
                            color: saveError ? '#dc2626' : isSaving ? '#8e8ea9' : '#16a34a',
                            fontWeight: 600,
                        }}>
                            {isSaving ? 'Saving…' : saveError || '✓ Saved'}
                        </Typography>
                    )}
                </div>
            </div>

            {/* Table */}
            <Box background="neutral0" shadow="filterShadow" borderRadius="8px" style={{ overflow: 'hidden', border: '1px solid #dcdce4' }}>

                {/* Column headers */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `1fr ${COL} ${COL}`,
                    background: '#f0f0f9',
                    borderBottom: '2px solid #dcdce4',
                    padding: '10px 16px',
                    alignItems: 'center',
                }}>
                    <Typography variant="sigma" textColor="neutral600">SECTION / FIELD</Typography>
                    {SECTION_PERMS.map((p) => (
                        <div key={p.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <Typography variant="sigma" style={{ color: p.color }}>{p.label}</Typography>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', color: '#8e8ea9' }} title={`Toggle all ${p.label}`}>
                                <CB
                                    checked={SECTION_TREE.every((s) => perms[s.key]?.[p.key])}
                                    color={p.color}
                                    onChange={() => toggleAll(p.key)}
                                />
                                All
                            </label>
                        </div>
                    ))}
                </div>

                {/* Section rows */}
                {SECTION_TREE.map((section, si) => {
                    const sp = perms[section.key] || defaultSectionPerm(section);
                    const isOpen = !!expanded[section.key];

                    return (
                        <div key={section.key}>
                            {/* Section row */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: `1fr ${COL} ${COL}`,
                                    padding: '12px 16px',
                                    borderBottom: isOpen ? 'none' : (si < SECTION_TREE.length - 1 ? '1px solid #f0f0f0' : 'none'),
                                    alignItems: 'center',
                                    background: si % 2 === 0 ? '#ffffff' : '#fafafa',
                                    cursor: 'pointer',
                                }}
                            >
                                {/* Expand + label */}
                                <div
                                    onClick={() => toggleExpand(section.key)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}
                                >
                                    <span style={{ fontSize: '13px', color: '#4945ff', fontWeight: 700, width: '14px', display: 'inline-block', textAlign: 'center' }}>
                                        {isOpen ? '▼' : '▶'}
                                    </span>
                                    <Typography variant="omega" fontWeight="bold">
                                        {section.label}
                                    </Typography>
                                    <Typography variant="pi" textColor="neutral400">
                                        ({section.fields.length} fields)
                                    </Typography>
                                </div>
                                {SECTION_PERMS.map((p) => (
                                    <div key={p.key} style={{ display: 'flex', justifyContent: 'center' }}>
                                        <CB
                                            checked={sp[p.key]}
                                            color={p.color}
                                            onChange={() => toggleSection(section.key, p.key)}
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Field rows */}
                            {isOpen && (
                                <div style={{ background: '#f8f8fc', borderBottom: si < SECTION_TREE.length - 1 ? '1px solid #e8e8f0' : 'none' }}>
                                    {/* Field sub-header */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: `1fr ${COL} ${COL}`,
                                        padding: '6px 16px 6px 40px',
                                        borderBottom: '1px solid #e8e8f0',
                                        background: '#efeffa',
                                    }}>
                                        <Typography variant="pi" textColor="neutral500" fontWeight="bold">FIELD NAME</Typography>
                                        {FIELD_PERMS.map((p) => (
                                            <Typography key={p.key} variant="pi" style={{ color: p.color, fontWeight: 700, textAlign: 'center' }}>
                                                {p.label}
                                            </Typography>
                                        ))}
                                    </div>
                                    {section.fields.map((field, fi) => {
                                        const fp = sp.fields?.[field.key] || defaultFieldPerm();
                                        return (
                                            <div
                                                key={field.key}
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: `1fr ${COL} ${COL}`,
                                                    padding: '8px 16px 8px 40px',
                                                    borderBottom: fi < section.fields.length - 1 ? '1px solid #ebebeb' : 'none',
                                                    alignItems: 'center',
                                                    background: fi % 2 === 0 ? '#f8f8fc' : '#f3f3f9',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ color: '#c0c0d0', fontSize: '12px' }}>└</span>
                                                    <Typography variant="pi" textColor="neutral700">{field.label}</Typography>
                                                </div>
                                                {/* EDIT */}
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <CB
                                                        checked={fp.edit}
                                                        color="#16a34a"
                                                        onChange={() => toggleField(section.key, field.key, 'edit')}
                                                    />
                                                </div>
                                                {/* VIEW */}
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <CB
                                                        checked={fp.view}
                                                        color="#2563eb"
                                                        onChange={() => toggleField(section.key, field.key, 'view')}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </Box>
        </Box>
    );
};
