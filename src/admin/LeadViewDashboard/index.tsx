import { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Flex, Badge, Textarea } from '@strapi/design-system';
import { useFetchClient } from '@strapi/admin/strapi-admin';
import {
    LEAD_STATUS_OPTIONS,
    DOC_LABELS,
    getAppSteps,
    useLeadViewDashboard,
    mergeFolderDocuments,
    handleDocView,
    resolveNumericLeadId,
    getAdminLoanFormDisplayData,
} from './useLeadViewDashboard';
import { LoanFormSections } from '../LoanForm/LoanFormSections';
import { LeadInfoSummary } from '../LoanForm/LeadInfoSummary';
import { buildLeadUploadFolderName } from '../../api/loan-application/utils/lead-upload-folder';
import { renameFileForDocumentField } from '../../shared/loan-form/document-filenames';
import { styles, fileFormatBox, fileFormatText, bubbleStyle, logTextStyle } from './styles';

const SearchableDropdown = ({
    label,
    options,
    value,
    onChange,
    disabled = false,
}: {
    label: string;
    options: any[];
    value: number | null;
    onChange: (id: number | null) => void;
    disabled?: boolean;
}) => {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = options.find((u) => u.id === value);
    const filtered = options.filter((u) => {
        const name = `${u.firstname || ''} ${u.lastname || ''}`.toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || (u.email || '').toLowerCase().includes(q) || String(u.id).includes(q);
    });

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', width: '100%' }}>
            <Typography variant="pi" display="block" marginBottom={1} style={{ color: '#2563eb', fontWeight: 600 }}>
                {label}
            </Typography>
            <div
                onClick={() => { if (!disabled) { setOpen((o) => !o); setSearch(''); } }}
                style={{
                    border: '1px solid #dcdce4',
                    borderRadius: '4px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: disabled ? '#f6f6f9' : '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '4px',
                    opacity: disabled ? 0.6 : 1,
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                    {selected
                        ? <span>({selected.id}) {`${selected.firstname} ${selected.lastname || ''}`.trim()} <span style={{ color: '#8e8ea9', fontSize: '11px' }}>{selected.email}</span></span>
                        : <span style={{ color: '#8e8ea9' }}>Select...</span>}
                </span>
                <span style={{ fontSize: '10px', color: '#8e8ea9' }}>▼</span>
            </div>
            {open && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: '#fff',
                    border: '1px solid #dcdce4',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    maxHeight: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        style={{
                            border: 'none',
                            borderBottom: '1px solid #dcdce4',
                            padding: '6px 10px',
                            fontSize: '12px',
                            outline: 'none',
                            flexShrink: 0,
                        }}
                    />
                    <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
                        {value !== null && (
                            <div
                                onClick={() => { onChange(null); setOpen(false); }}
                                style={{ padding: '6px 10px', fontSize: '12px', color: '#8e8ea9', cursor: 'pointer' }}
                            >
                                — Clear selection
                            </div>
                        )}
                        {filtered.length === 0 ? (
                            <div style={{ padding: '8px 10px', fontSize: '12px', color: '#8e8ea9' }}>No results</div>
                        ) : (
                            filtered.map((u) => (
                                <div
                                    key={u.id}
                                    onClick={() => { onChange(u.id); setOpen(false); }}
                                    style={{
                                        padding: '6px 10px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        background: u.id === value ? '#f0f0ff' : 'transparent',
                                        fontWeight: u.id === value ? 'bold' : 'normal',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5ff')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = u.id === value ? '#f0f0ff' : 'transparent')}
                                >
                                    <span style={{ color: '#64748b', fontWeight: 700, marginRight: '4px' }}>({u.id})</span>
                                    {`${u.firstname} ${u.lastname || ''}`.trim()}
                                    <span style={{ color: '#8e8ea9', marginLeft: '6px', fontSize: '11px' }}>{u.email}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const EditableField = ({
    value,
    displayValue,
    onSave,
    canEdit = true,
    type = 'text',
}: {
    value: string;
    displayValue?: string;
    onSave: (val: string | boolean) => Promise<void>;
    canEdit?: boolean;
    type?: 'text' | 'number' | 'boolean';
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
        }
        finally { setSaving(false); }
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
                        style={{ fontSize: '13px', border: '1px solid #4945ff', borderRadius: '4px', padding: '2px 6px', outline: 'none', flex: 1, minWidth: '80px' }}
                    >
                        <option value="">Select</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                    </select>
                ) : (
                    <input
                        type={type}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') doSave();
                            if (e.key === 'Escape') setEditing(false);
                        }}
                        style={{ fontSize: '13px', border: '1px solid #4945ff', borderRadius: '4px', padding: '2px 6px', outline: 'none', flex: 1, minWidth: '80px' }}
                    />
                )}
                <button onClick={doSave} disabled={saving}
                    style={{ fontSize: '11px', background: '#4945ff', color: '#fff', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}>
                    {saving ? '…' : '✓'}
                </button>
                <button onClick={() => setEditing(false)}
                    style={{ fontSize: '11px', background: '#f0f0f3', border: 'none', borderRadius: '3px', padding: '2px 6px', cursor: 'pointer' }}>
                    ✕
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Typography variant="pi" textColor="neutral800">{display || 'N/A'}</Typography>
            <button
                onClick={() => { setDraft(value); setEditing(true); }}
                title="Edit field"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#4945ff', opacity: 0.45, lineHeight: 1 }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.45')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
        </div>
    );
};


const AddDocumentRow = ({
    loanApp,
    leadId,
    leadName,
    onUploaded,
    ensureLoanAppReady,
    canEdit = true,
}: {
    loanApp: any;
    leadId: string | number;
    leadName: string;
    onUploaded: () => Promise<void>;
    ensureLoanAppReady: () => Promise<any>;
    canEdit?: boolean;
}) => {
    const { get, post } = useFetchClient();
    const [open, setOpen] = useState(false);
    const [docType, setDocType] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [password, setPassword] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    const [error, setError] = useState('');

    if (!canEdit) return null;

    const reset = () => { setOpen(false); setDocType(''); setFile(null); setPassword(''); setError(''); setUploadStatus(''); };

    const getOrCreateFolder = async (name: string, parentId: number | null): Promise<number> => {
        const parentFilter = parentId
            ? `&filters[parent][id][$eq]=${parentId}`
            : `&filters[parent][id][$null]=true`;
        const res = await get(`/upload/folders?filters[name][$eq]=${encodeURIComponent(name)}${parentFilter}`);
        const raw = res?.data;
        // Strapi may return { data: [...] } (paginated) or a direct array
        const folders: any[] = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        const existing = folders.find((f: any) => f.name === name);
        if (existing?.id) return Number(existing.id);

        const postRes = await post('/upload/folders', { name, parent: parentId ?? null });
        const created = postRes?.data;
        // Strapi may return { data: { id } } or { id } directly
        const newId = created?.data?.id ?? created?.id;
        return Number(newId);
    };

    const handleUpload = async () => {
        if (!docType || !file) { setError('Select a document type and file.'); return; }
        setUploading(true);
        setError('');
        try {
            const app = (await ensureLoanAppReady()) ?? loanApp;
            if (!app?.id && !app?.documentId) {
                setError('Could not create or load loan application for this lead.');
                return;
            }
            const refId = String(app.id ?? app.documentId);
            const loanDocId = app.documentId || refId;
            const numericLeadId = typeof leadId === 'number' ? leadId : (parseInt(String(leadId)) || leadId);
            const applicantName = app.applicantName || leadName || 'Applicant';
            const folderName = buildLeadUploadFolderName(numericLeadId, applicantName);

            setUploadStatus('Preparing folder…');
            const rootFolderId = await getOrCreateFolder('API Uploads', null);
            const leadFolderId = await getOrCreateFolder(folderName, rootFolderId);

            if (docType) {
                setUploadStatus('Archiving prior file…');
                await fetch('/api/loan-applications/prepare-document-upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        leadId: numericLeadId,
                        applicantName,
                        docType,
                        loanApplicationId: app.id,
                    }),
                });
            }

            setUploadStatus('Uploading file…');
            const uploadFile =
                file && docType
                    ? renameFileForDocumentField(file, docType)
                    : file;
            const form = new FormData();
            form.append('files', uploadFile!);
            form.append('fileInfo', JSON.stringify({ folder: leadFolderId }));
            form.append('ref', 'api::loan-application.loan-application');
            form.append('refId', refId);
            form.append('field', docType);
            const uploadRes = await post('/upload', form);
            const uploadData = uploadRes?.data;
            const uploadedFiles = Array.isArray(uploadData)
                ? uploadData
                : uploadData
                  ? [uploadData]
                  : [];
            const fileIds = uploadedFiles
                .map((f: { id?: number }) => Number(f.id))
                .filter((id: number) => Number.isFinite(id));

            if (fileIds.length) {
                setUploadStatus('Syncing to disk…');
                const syncRes = await fetch('/api/loan-applications/sync-documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        leadId: numericLeadId,
                        applicantName,
                        fileIds,
                        loanApplicationId: app.id,
                        docType,
                    }),
                });
                const syncBody = await syncRes.json().catch(() => ({}));
                if (!syncRes.ok) {
                    const msg =
                        syncBody?.error?.message ||
                        syncBody?.message ||
                        `Sync to disk failed (${syncRes.status})`;
                    throw new Error(msg);
                }
                const results = syncBody?.data?.results ?? [];
                const moved = results.filter((r: { ok?: boolean }) => r.ok).length;
                if (moved === 0) {
                    const detail = results
                        .map((r: { error?: string }) => r.error)
                        .filter(Boolean)
                        .join('; ');
                    throw new Error(
                        detail
                            ? `File uploaded but could not be moved to api_uploads folder: ${detail}`
                            : 'File uploaded but could not be moved to api_uploads folder'
                    );
                }
            }

            if (password) {
                const updatedFormData = {
                    ...(app.form_data || {}),
                    pdfPasswords: { ...(app.form_data?.pdfPasswords || {}), [docType]: password },
                };
                await fetch(`/api/loan-applications/${loanDocId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: { form_data: updatedFormData } }),
                });
            }
            reset();
            await onUploaded();
        } catch (e: any) {
            const msg = e?.message || 'Upload failed. Please try again.';
            setError(msg);
        } finally {
            setUploading(false);
            setUploadStatus('');
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1.5px dashed #4945ff', borderRadius: '6px', padding: '6px 14px', cursor: 'pointer', color: '#4945ff', fontSize: '13px', fontWeight: 600 }}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Document
            </button>
        );
    }

    return (
        <div style={{ marginTop: '10px', background: '#f6f6f9', border: '1px solid #dcdce4', borderRadius: '8px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#666' }}>Document Type</label>
                    <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value)}
                        style={{ fontSize: '13px', border: '1px solid #dcdce4', borderRadius: '4px', padding: '4px 8px', background: '#fff' }}
                    >
                        <option value="">— select —</option>
                        {Object.entries(DOC_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#666' }}>File</label>
                    <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        style={{ fontSize: '12px' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#666' }}>Password (optional)</label>
                    <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="PDF password"
                        style={{ fontSize: '13px', border: '1px solid #dcdce4', borderRadius: '4px', padding: '4px 8px', background: '#fff' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        style={{ fontSize: '12px', background: '#4945ff', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 14px', cursor: 'pointer', fontWeight: 600 }}
                    >
                        {uploading ? (uploadStatus || 'Uploading…') : 'Upload'}
                    </button>
                    <button
                        onClick={reset}
                        style={{ fontSize: '12px', background: '#f0f0f3', border: 'none', borderRadius: '4px', padding: '5px 14px', cursor: 'pointer' }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
            {error && <div style={{ marginTop: '8px', fontSize: '12px', color: '#d02b20' }}>{error}</div>}
        </div>
    );
};

export const LeadDetailDashboard = ({ leadId }: { leadId: string }) => {
    const {
        lead,
        loanApp,
        isLoading,
        status,
        setStatus,
        newRemark,
        setNewRemark,
        newBankerRemark,
        setNewBankerRemark,
        isUpdating,
        currentUser,
        errorLogs,
        handleUpdateStatus,
        isSavingParentId,
        handleSaveParentAdvisorId,
        remarks,
        bankerRemarks,
        isBankerUser,
        statusHistory,
        staffList,
        bankerList,
        selectedStaffId,
        setSelectedStaffId,
        selectedBankerId,
        setSelectedBankerId,
        sectionPerms,
        handleSaveLeadField,
        handleSaveLoanFormData,
        handleSaveRunningLoan,
        handleSaveDocPassword,
        refetchLoanApp,
        hasLoanSubmitActivity,
        ensureLoanAppReady,
        folderFiles,
    } = useLeadViewDashboard(leadId);

    // All document types now live under the unified 'documentDetails' section
    const DOC_SECTION_MAP: Record<string, string> = {
        panCard:             'documentDetails',
        aadharCardFront:     'documentDetails',
        aadharCardBack:      'documentDetails',
        cibilReport:         'documentDetails',
        proprietorshipDoc:   'documentDetails',
        businessRegProofDoc: 'documentDetails',
        bankStatement:       'documentDetails',
        salarySlips:         'documentDetails',
        propertyPapers:      'documentDetails',
        coAppPan:            'documentDetails',
        coAppAadharFront:    'documentDetails',
        coAppAadharBack:     'documentDetails',
        otherDocs:           'documentDetails',
        itrYear1:            'documentDetails',
        itrYear2:            'documentDetails',
        itrYear3:            'documentDetails',
        auditedBooksDoc:     'documentDetails',
    };

    // Section renders if section-level view=true OR any individual field has view=true
    const canView = (section: string): boolean => {
        const sp = sectionPerms[section];
        if (!sp) return true;
        if (sp.view) return true;
        return Object.values(sp.fields || {}).some((fp: any) => fp?.view === true);
    };
    // Section edit icon shows if section-level edit=true OR any individual field has edit=true
    const canEdit = (section: string): boolean => {
        const sp = sectionPerms[section];
        if (!sp) return true;
        if (sp.edit || sp.add) return true;
        return Object.values(sp.fields || {}).some((fp: any) => fp?.edit === true);
    };
    // Field visible: if any field in the section is explicitly view=true → field-level filtering applies.
    // Otherwise fall back to section-level view.
    const canViewField = (section: string, field: string): boolean => {
        const sp = sectionPerms[section];
        if (!sp) return true;
        const fields = sp.fields;
        const anyFieldEnabled = !!fields && Object.values(fields).some((fp: any) => fp?.view === true);
        if (anyFieldEnabled) return fields?.[field]?.view === true;
        return sp.view === true;
    };
    // Field editable: if any field in section is explicitly edit=true → field-level filtering applies.
    // A field cannot be edited if it isn't visible.
    const canEditField = (section: string, field: string): boolean => {
        if (!canViewField(section, field)) return false;
        const sp = sectionPerms[section];
        if (!sp) return true;
        const fields = sp.fields;
        const anyFieldEditable = !!fields && Object.values(fields).some((fp: any) => fp?.edit === true);
        if (anyFieldEditable) return fields?.[field]?.edit === true;
        return sp.edit === true || sp.add === true;
    };

    useEffect(() => {
        const root = document.getElementById('custom-dashboard-root');
        if (root) root.scrollTop = 0;
    }, [leadId]);

    const userRoles: string[] = (currentUser?.roles || []).map((r: any) => r.code as string);
    const isAdvisorUser  = userRoles.includes('strapi-advisor');
    const isBankerOnly   = isBankerUser() && !userRoles.includes('strapi-editor') && !userRoles.includes('strapi-super-admin');
    const isAdvisorOnly  = isAdvisorUser && !isBankerUser() && !userRoles.includes('strapi-editor') && !userRoles.includes('strapi-super-admin');

    // Box 1: advisor_admin_staff_remark — visible to advisor, staff, admin (not banker-only)
    const canViewAdvisorBox = !isBankerOnly;
    // Box 2: banker_admin_staff_remark — visible to banker, staff, admin (not advisor-only)
    const canViewBankerBox  = !isAdvisorOnly;

    if (isLoading) {
        return <Box padding={8} background="neutral100">Loading Lead Detail Dashboard...</Box>;
    }

    if (!lead) {
        return (
            <Box padding={8} background="danger100">
                <Typography variant="beta">Lead not found (ID: {leadId})</Typography>
                <Box marginTop={4} padding={4} background="neutral0" hasRadius shadow="filterShadow">
                    <Typography variant="delta">Debug Trace:</Typography>
                    {errorLogs.map((log, i) => (
                        <Typography
                            key={i}
                            variant="pi"
                            textColor="danger700"
                            display="block"
                            style={logTextStyle}
                        >
                            • {log}
                        </Typography>
                    ))}
                </Box>
            </Box>
        );
    }

    const productType = lead.selectedProduct || loanApp?.loanType || 'Personal Loan';
    const numericLeadId = resolveNumericLeadId(lead, leadId);
    const appSteps = getAppSteps(productType, lead.employmentType || '');
    const loanFormDisplayData = loanApp
        ? getAdminLoanFormDisplayData(loanApp, {
              leadId: numericLeadId,
              hasSubmitActivity: hasLoanSubmitActivity,
          })
        : null;

    const currentStatusColor =
        LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.color || 'neutral';
    const currentStatusLabel =
        LEAD_STATUS_OPTIONS.find((o) => o.value === status)?.label || status;

    const allDocs = mergeFolderDocuments(loanApp, folderFiles);
    const docs = allDocs.filter((doc) => {
        const section = DOC_SECTION_MAP[doc.label];
        if (!section) return true;
        return canViewField(section, doc.label);
    });

    return (
        <Box padding={6} background="neutral100" style={styles.rootBox}>
            {/* Header / Breadcrumbs */}
            <Flex justifyContent="space-between" alignItems="center" marginBottom={4}>
                <Flex gap={2} alignItems="center">
                    <Button
                        variant="ghost"
                        size="S"
                        onClick={() => window.open('/admin/content-manager/collection-types/api::lead.lead', '_self')}
                        style={{ padding: '0 4px' }}
                    >
                        <Typography variant="pi" textColor="primary600" fontWeight="bold">← BACK TO LEADS</Typography>
                    </Button>
                    <span>/</span>
                    <Typography variant="pi" textColor="neutral600">{productType}</Typography>
                    <span>/</span>
                    <Typography variant="pi" fontWeight="bold">Lead View</Typography>
                </Flex>
            </Flex>

            <LeadInfoSummary
                lead={lead}
                leadIdDisplay={numericLeadId}
                productType={productType}
                currentStatusLabel={currentStatusLabel}
                currentStatusColor={currentStatusColor}
                canView={canView}
                canEdit={canEdit}
                canViewField={canViewField}
                canEditField={canEditField}
                onSaveLeadField={handleSaveLeadField}
                onNavigateToLead={(leadKey) => {
                    sessionStorage.setItem('currentLeadId', leadKey);
                    window.location.reload();
                }}
            />

            {/* Management & History — 3 equal columns */}
            <div style={{ display: 'grid', gridTemplateColumns: (() => { const cols = (canView('assignmentStatus') ? 1 : 0) + (canViewAdvisorBox && canViewField('assignmentStatus', 'advisorConversationHistory') ? 1 : 0) + (canViewBankerBox && canViewField('assignmentStatus', 'bankerConversationHistory') ? 1 : 0); return Array(cols || 1).fill('1fr').join(' '); })(), gap: '16px', marginBottom: '24px', alignItems: 'stretch' }}>
                {/* Status Update Form */}
                {canView('assignmentStatus') ? <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <Typography variant="delta" fontWeight="bold" marginBottom={4} display="block">
                        Lead Management
                    </Typography>

                    <Box padding={3} background="neutral150" borderRadius="4px" marginBottom={4}>
                        <Typography variant="pi">Current Status: </Typography>
                        <Badge variant={currentStatusColor as any} marginLeft={2}>{currentStatusLabel}</Badge>
                    </Box>

                    {canViewField('assignmentStatus', 'leadStatus') && <Box marginBottom={4}>
                        <Typography
                            variant="pi"
                            fontWeight="bold"
                            textColor="primary600"
                            display="block"
                            marginBottom={1}
                        >
                            UPDATE LEAD STATUS *
                        </Typography>
                        <Flex gap={2}>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={!canEditField('assignmentStatus', 'leadStatus')}
                                style={styles.statusSelect}
                            >
                                {LEAD_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Flex>
                    </Box>}


                    {(canViewField('assignmentStatus', 'assignStaff') || canViewField('assignmentStatus', 'assignBanker')) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                            {canViewField('assignmentStatus', 'assignStaff') && <Box>
                                <Typography variant="pi" fontWeight="bold" textColor="primary600" display="block" marginBottom={1}>
                                    ASSIGN STAFF
                                </Typography>
                                <SearchableDropdown
                                    label=""
                                    options={staffList}
                                    value={selectedStaffId}
                                    onChange={setSelectedStaffId}
                                    disabled={!canEditField('assignmentStatus', 'assignStaff')}
                                />
                            </Box>}
                            {canViewField('assignmentStatus', 'assignBanker') && <Box>
                                <Typography variant="pi" fontWeight="bold" textColor="primary600" display="block" marginBottom={1}>
                                    ASSIGN BANKER
                                </Typography>
                                <SearchableDropdown
                                    label=""
                                    options={bankerList}
                                    value={selectedBankerId}
                                    onChange={setSelectedBankerId}
                                    disabled={!canEditField('assignmentStatus', 'assignBanker')}
                                />
                            </Box>}
                        </div>
                    )}

                    <Button
                        onClick={async () => { await handleUpdateStatus(); await handleSaveParentAdvisorId(); }}
                        loading={isUpdating || isSavingParentId}
                        disabled={!canEdit('assignmentStatus')}
                        variant="default"
                        size="L"
                    >
                        Update
                    </Button>
                </Box> : null}

                {/* Advisor Conversation History */}
                {canView('assignmentStatus') && canViewAdvisorBox && canViewField('assignmentStatus', 'advisorConversationHistory') && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Box background="neutral0" shadow="filterShadow" borderRadius="8px" style={styles.conversationBox}>
                    <Box padding={3} background="neutral700" style={styles.historyHeaderBox}>
                        <Typography variant="pi" fontWeight="bold" textColor="neutral0">
                            Advisor Conversation History
                        </Typography>
                    </Box>
                    <Box padding={4} style={styles.historyScroll}>
                        {remarks.length === 0 ? (
                            <Box padding={8} textAlign="center">
                                <Typography variant="pi" textColor="neutral500">
                                    No conversation history available.
                                </Typography>
                            </Box>
                        ) : (
                            <Flex direction="column" alignItems="stretch" gap={4}>
                                {remarks.map((entry: any, index: number) => {
                                    const isMine =
                                        currentUser &&
                                        entry.author &&
                                        entry.author.includes(currentUser.firstname) &&
                                        entry.author.includes(currentUser.lastname || '');

                                    return (
                                        <Box
                                            key={index}
                                            maxWidth="70%"
                                            style={{
                                                ...styles.remarkContainer,
                                                alignSelf: isMine ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            <Flex
                                                justifyContent={isMine ? 'flex-end' : 'flex-start'}
                                                marginBottom={1}
                                                gap={2}
                                                alignItems="center"
                                            >
                                                {!isMine && (
                                                    <Box
                                                        background="neutral200"
                                                        color="neutral800"
                                                        padding={1}
                                                        borderRadius="4px"
                                                        style={styles.authorBadge}
                                                    >
                                                        {entry.author?.[0] || 'U'}
                                                    </Box>
                                                )}
                                                <Box>
                                                    <Typography
                                                        variant="pi"
                                                        textColor="neutral800"
                                                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                        display="block"
                                                    >
                                                        {entry.author}
                                                    </Typography>
                                                    {entry.role && (
                                                        <Typography
                                                            variant="pi"
                                                            textColor="neutral500"
                                                            style={{ fontSize: '10px' }}
                                                            display="block"
                                                        >
                                                            {entry.role}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                {isMine && (
                                                    <Box
                                                        background="primary600"
                                                        color="white"
                                                        padding={1}
                                                        borderRadius="4px"
                                                        style={styles.authorBadge}
                                                    >
                                                        You
                                                    </Box>
                                                )}
                                            </Flex>

                                            <Box
                                                background={isMine ? 'primary600' : 'neutral0'}
                                                color={isMine ? 'white' : 'neutral800'}
                                                padding={3}
                                                borderRadius="12px"
                                                shadow="filterShadow"
                                                style={bubbleStyle(isMine)}
                                            >
                                                <Typography
                                                    variant="pi"
                                                    textColor={isMine ? 'neutral0' : 'neutral800'}
                                                    style={styles.messageText}
                                                >
                                                    {entry.message}
                                                </Typography>

                                                <Flex justifyContent="flex-end" marginTop={2} gap={4}>
                                                    <Typography
                                                        variant="pi"
                                                        textColor={isMine ? 'neutral200' : 'neutral500'}
                                                        style={styles.messageTimestamp}
                                                    >
                                                        {entry.timestamp
                                                            ? new Date(entry.timestamp).toLocaleString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                            })
                                                            : ''}
                                                    </Typography>
                                                </Flex>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Flex>
                        )}
                    </Box>
                </Box>
                {canViewField('assignmentStatus', 'advisorRemark') && <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <Typography variant="pi" fontWeight="bold" textColor="primary600" display="block" marginBottom={1}>
                        Advisor Remark
                    </Typography>
                    <Textarea
                        placeholder="Enter remarks here... (Enter to send, Shift+Enter for new line)"
                        value={newRemark}
                        onChange={(e: any) => setNewRemark(e.target.value)}
                        disabled={!canEditField('assignmentStatus', 'advisorRemark')}
                        onKeyDown={async (e: any) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                await handleUpdateStatus();
                                await handleSaveParentAdvisorId();
                            }
                        }}
                    />
                </Box>}
                </div>}

                {/* Banker Conversation History — Banker / Admin / Staff */}
                {canView('assignmentStatus') && canViewBankerBox && canViewField('assignmentStatus', 'bankerConversationHistory') && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Box background="neutral0" shadow="filterShadow" borderRadius="8px" style={styles.conversationBox}>
                    <Box padding={3} background="neutral700" style={styles.historyHeaderBox}>
                        <Typography variant="pi" fontWeight="bold" textColor="neutral0">
                            Banker Conversation History
                        </Typography>
                    </Box>
                    <Box padding={4} style={styles.historyScroll}>
                        {bankerRemarks.length === 0 ? (
                            <Box padding={8} textAlign="center">
                                <Typography variant="pi" textColor="neutral500">
                                    No conversation history available.
                                </Typography>
                            </Box>
                        ) : (
                            <Flex direction="column" alignItems="stretch" gap={4}>
                                {bankerRemarks.map((entry: any, index: number) => {
                                    const isMine =
                                        currentUser &&
                                        entry.author &&
                                        entry.author.includes(currentUser.firstname) &&
                                        entry.author.includes(currentUser.lastname || '');

                                    return (
                                        <Box
                                            key={index}
                                            maxWidth="70%"
                                            style={{
                                                ...styles.remarkContainer,
                                                alignSelf: isMine ? 'flex-end' : 'flex-start',
                                            }}
                                        >
                                            <Flex
                                                justifyContent={isMine ? 'flex-end' : 'flex-start'}
                                                marginBottom={1}
                                                gap={2}
                                                alignItems="center"
                                            >
                                                {!isMine && (
                                                    <Box
                                                        background="neutral200"
                                                        color="neutral800"
                                                        padding={1}
                                                        borderRadius="4px"
                                                        style={styles.authorBadge}
                                                    >
                                                        {entry.author?.[0] || 'U'}
                                                    </Box>
                                                )}
                                                <Box>
                                                    <Typography
                                                        variant="pi"
                                                        textColor="neutral800"
                                                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                                                        display="block"
                                                    >
                                                        {entry.author}
                                                    </Typography>
                                                    {entry.role && (
                                                        <Typography
                                                            variant="pi"
                                                            textColor="neutral500"
                                                            style={{ fontSize: '10px' }}
                                                            display="block"
                                                        >
                                                            {entry.role}
                                                        </Typography>
                                                    )}
                                                </Box>
                                                {isMine && (
                                                    <Box
                                                        background="primary600"
                                                        color="white"
                                                        padding={1}
                                                        borderRadius="4px"
                                                        style={styles.authorBadge}
                                                    >
                                                        You
                                                    </Box>
                                                )}
                                            </Flex>

                                            <Box
                                                background={isMine ? 'primary600' : 'neutral0'}
                                                color={isMine ? 'white' : 'neutral800'}
                                                padding={3}
                                                borderRadius="12px"
                                                shadow="filterShadow"
                                                style={bubbleStyle(isMine)}
                                            >
                                                <Typography
                                                    variant="pi"
                                                    textColor={isMine ? 'neutral0' : 'neutral800'}
                                                    style={styles.messageText}
                                                >
                                                    {entry.message}
                                                </Typography>

                                                <Flex justifyContent="flex-end" marginTop={2} gap={4}>
                                                    <Typography
                                                        variant="pi"
                                                        textColor={isMine ? 'neutral200' : 'neutral500'}
                                                        style={styles.messageTimestamp}
                                                    >
                                                        {entry.timestamp
                                                            ? new Date(entry.timestamp).toLocaleString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                                day: '2-digit',
                                                                month: '2-digit',
                                                            })
                                                            : ''}
                                                    </Typography>
                                                </Flex>
                                            </Box>
                                        </Box>
                                    );
                                })}
                            </Flex>
                        )}
                    </Box>
                </Box>
                {canViewBankerBox && canViewField('assignmentStatus', 'bankerRemark') && <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <Typography variant="pi" fontWeight="bold" textColor="primary600" display="block" marginBottom={1}>
                        Banker Remark
                    </Typography>
                    <Textarea
                        placeholder="Enter banker remarks here... (Enter to send, Shift+Enter for new line)"
                        value={newBankerRemark}
                        onChange={(e: any) => setNewBankerRemark(e.target.value)}
                        disabled={!canEditField('assignmentStatus', 'bankerRemark')}
                        onKeyDown={async (e: any) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                await handleUpdateStatus();
                                await handleSaveParentAdvisorId();
                            }
                        }}
                    />
                </Box>}
                </div>}
            </div>

            {/* Step-wise Application Details */}
            <LoanFormSections
                loanType={productType}
                occupation={lead.employmentType || ''}
                formData={loanFormDisplayData}
                mode="inline"
                canView={canView}
                canViewField={canViewField}
                canEditField={canEditField}
                onSaveField={handleSaveLoanFormData}
            />

            {/* Document Details Table */}
            {canView('documentDetails') && <Box marginBottom={6}>
                <Flex justifyContent="space-between" alignItems="center" marginBottom={2}>
                    <Typography variant="delta" fontWeight="bold" textColor="primary600">
                        Document Details
                    </Typography>
                    {canViewField('documentDetails', 'addDocument') && (
                        <AddDocumentRow
                            loanApp={loanApp}
                            leadId={lead?.id ?? leadId}
                            leadName={lead?.fullName || ''}
                            onUploaded={refetchLoanApp}
                            ensureLoanAppReady={ensureLoanAppReady}
                            canEdit={canEdit('documentDetails')}
                        />
                    )}
                </Flex>
                <Box background="neutral0" shadow="filterShadow" borderRadius="8px" overflow="hidden">
                    <table style={styles.docTable}>
                        <thead>
                            <tr style={styles.docHeadRow}>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">Document ID</Typography></th>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">File Format</Typography></th>
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">Document Type</Typography></th>
                                {canViewField('documentDetails', 'password') && <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">Password</Typography></th>}
                                <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">Date</Typography></th>
                                {canViewField('documentDetails', 'status') && <th style={styles.docCell}><Typography variant="pi" fontWeight="bold">status</Typography></th>}
                                {canViewField('documentDetails', 'viewDocument') && <th style={styles.docCellCenter}><Typography variant="pi" fontWeight="bold">view</Typography></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {docs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}>
                                        <Typography variant="pi">No documents uploaded.</Typography>
                                    </td>
                                </tr>
                            ) : (
                                docs.map((doc, idx) => (
                                    <tr key={idx} style={styles.docRow}>
                                        <td style={styles.docCell}>
                                            <Typography variant="pi" textColor="neutral600">{doc.id}</Typography>
                                        </td>
                                        <td style={styles.docCell}>
                                            <div style={fileFormatBox(doc.ext)}>
                                                <Typography variant="pi" fontWeight="bold" style={fileFormatText(doc.ext)}>{doc.ext}</Typography>
                                            </div>
                                        </td>
                                        <td style={styles.docCell}>
                                            <Typography variant="pi" fontWeight="bold">{doc.type}</Typography>
                                        </td>
                                        {canViewField('documentDetails', 'password') && <td style={styles.docCell}>
                                            <EditableField
                                                value={doc.pw}
                                                onSave={(v) => handleSaveDocPassword(doc.label, String(v))}
                                                canEdit={canEditField('documentDetails', 'password')}
                                            />
                                        </td>}
                                        <td style={styles.docCell}>
                                            <Typography variant="pi" textColor="neutral600">{doc.date}</Typography>
                                        </td>
                                        {canViewField('documentDetails', 'status') && <td style={styles.docCell}>
                                            <div style={styles.uploadedBadge}>UPLOADED</div>
                                        </td>}
                                        {canViewField('documentDetails', 'viewDocument') && <td style={styles.docCellCenter}>
                                            <div
                                                onClick={(e) => handleDocView(e, doc.url, doc.pw)}
                                                style={styles.viewButton}
                                                title="View Document"
                                            >
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={styles.viewButtonIcon}
                                                >
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                                <span style={{ color: '#ffffff' }}>View</span>
                                            </div>
                                        </td>}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </Box>
            </Box>}

            {/* Journey Timeline */}
            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                <Typography variant="delta" fontWeight="bold" marginBottom={4} display="block">
                    Process Journey
                </Typography>
                <Box paddingLeft={4} style={styles.timelineBorder}>
                    {/* Initial Entry */}
                    <Box marginBottom={6} position="relative">
                        <Box
                            position="absolute"
                            left="-23px"
                            top="0"
                            width="14px"
                            height="14px"
                            background="primary600"
                            borderRadius="50%"
                            style={styles.timelineDotInitial}
                        />
                        <div style={styles.timelineGrid}>
                            <Typography variant="pi" fontWeight="bold" textColor="primary700">
                                {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                            </Typography>
                            <Box>
                                <Typography variant="pi" fontWeight="bold" display="block">LEAD GENERATED</Typography>
                                <Typography variant="pi" textColor="neutral600">
                                    Initial lead captured via Frontend Form
                                </Typography>
                            </Box>
                        </div>
                    </Box>

                    {/* Status change history — one entry per change */}
                    {statusHistory.map((entry: any, i: number) => {
                        const newStatus: string = entry.metadata?.newStatus || '';
                        const oldStatus: string = entry.metadata?.oldStatus || '';
                        const dotColor: Record<string, string> = {
                            NEW: '#4945FF',
                            UNDER_PROCESS: '#9736E8',
                            APPROVED: '#328048',
                            REJECTED: '#D02B20',
                            DISBURSED: '#D9822B',
                        };
                        const color = dotColor[newStatus] || '#666';
                        const isLast = i === statusHistory.length - 1;
                        return (
                            <Box key={i} marginBottom={6} position="relative">
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: '-23px',
                                        top: '0',
                                        width: '14px',
                                        height: '14px',
                                        background: color,
                                        borderRadius: '50%',
                                        border: isLast ? '2px solid #fff' : undefined,
                                        boxShadow: isLast ? `0 0 0 2px ${color}` : undefined,
                                    }}
                                />
                                <div style={styles.timelineGrid}>
                                    <Typography variant="pi" fontWeight="bold" style={{ color }}>
                                        {new Date(entry.createdAt).toLocaleString()}
                                    </Typography>
                                    <Box>
                                        <Typography variant="pi" fontWeight="bold" display="block">
                                            STATUS CHANGED → {newStatus.replace('_', ' ')}
                                        </Typography>
                                        <Typography variant="pi" textColor="neutral600">
                                            {oldStatus.replace('_', ' ')} → {newStatus.replace('_', ' ')}
                                        </Typography>
                                    </Box>
                                </div>
                            </Box>
                        );
                    })}

                    {/* Fallback: current status when no history entries exist yet */}
                    {statusHistory.length === 0 && lead.leadStatus && lead.leadStatus !== 'NEW' && (
                        <Box marginBottom={6} position="relative">
                            <div style={{
                                position: 'absolute', left: '-23px', top: '0',
                                width: '14px', height: '14px', background: '#328048', borderRadius: '50%',
                            }} />
                            <div style={styles.timelineGrid}>
                                <Typography variant="pi" fontWeight="bold" textColor="success700">
                                    {lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : 'N/A'}
                                </Typography>
                                <Box>
                                    <Typography variant="pi" fontWeight="bold" display="block">
                                        CURRENT STATUS: {lead.leadStatus.replace('_', ' ')}
                                    </Typography>
                                </Box>
                            </div>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
};
