import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Flex, Badge } from '@strapi/design-system';
import { getToken, PRODUCT_CONFIG, PRODUCT_OPTIONS } from '../LeadViewDashboard/useLeadViewDashboard';
import { styles } from '../LeadViewDashboard/styles';
import { EditableField } from './EditableField';
import { SearchableEditableField, type SearchableOption } from './SearchableEditableField';

type AdvisorListItem = { id: number; fullName?: string; email?: string };

type LeadListItem = {
    id: number;
    documentId?: string;
    fullName?: string;
    email?: string;
    mobileNumber?: string;
};

type LeadRecord = Record<string, unknown> & {
    id?: number | string;
    documentId?: string;
    leadId?: number | string;
    fullName?: string;
    selectedProduct?: string;
    requiredAmount?: number | string;
    advisorReferralId?: string;
    parentAdvisorId?: string;
    getEmailNotification?: boolean | string;
};

export type LeadInfoSummaryProps = {
    lead: LeadRecord;
    leadIdDisplay: string | number;
    productType: string;
    currentStatusLabel: string;
    currentStatusColor: string;
    canView: (section: string) => boolean;
    canEdit: (section: string) => boolean;
    canViewField: (section: string, field: string) => boolean;
    canEditField: (section: string, field: string) => boolean;
    onSaveLeadField: (key: string, value: string | boolean) => Promise<void>;
    onNavigateToLead?: (leadKey: string) => void;
};

const authHeaders = (): Record<string, string> => {
    const token = getToken();
    return {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const LeadInfoSummary = ({
    lead,
    leadIdDisplay,
    productType,
    currentStatusLabel,
    currentStatusColor,
    canView,
    canEdit,
    canViewField,
    canEditField,
    onSaveLeadField,
    onNavigateToLead,
}: LeadInfoSummaryProps) => {
    const [advisors, setAdvisors] = useState<AdvisorListItem[]>([]);
    const [leads, setLeads] = useState<LeadListItem[]>([]);
    const [previewName, setPreviewName] = useState<string | null>(null);

    useEffect(() => {
        setPreviewName(null);
    }, [lead.fullName, leadIdDisplay, lead.documentId]);

    useEffect(() => {
        const fetchAdvisors = async () => {
            try {
                const res = await fetch('/admin/advisors-list', { headers: authHeaders() });
                if (!res.ok) return;
                const data = await res.json();
                setAdvisors(data.data || []);
            } catch {
                setAdvisors([]);
            }
        };
        fetchAdvisors();
    }, []);

    useEffect(() => {
        const fetchLeads = async () => {
            try {
                const res = await fetch(
                    '/content-manager/collection-types/api::lead.lead?pageSize=200&sort=id:DESC',
                    { headers: authHeaders() }
                );
                if (!res.ok) return;
                const data = await res.json();
                const rows: LeadListItem[] = (data.results || data.data || []).map((row: LeadListItem) => row);
                setLeads(rows);
            } catch {
                setLeads([]);
            }
        };
        fetchLeads();
    }, []);

    const leadRouteKey = String(lead.documentId || lead.id || '');

    const leadOptions: SearchableOption[] = useMemo(
        () => leads.map((l) => ({
            value: String(l.documentId || l.id),
            label: `#${l.id} — ${l.fullName || 'Unnamed'}`,
            searchText: `${l.id} ${l.fullName || ''} ${l.email || ''} ${l.mobileNumber || ''}`,
        })),
        [leads]
    );

    const advisorOptions: SearchableOption[] = useMemo(
        () => advisors.map((a) => ({
            value: String(a.id),
            label: a.fullName ? `${a.fullName} (${a.id})` : `Advisor ${a.id}`,
            searchText: `${a.id} ${a.fullName || ''} ${a.email || ''}`,
        })),
        [advisors]
    );

    const productOptions = useMemo(
        () => PRODUCT_OPTIONS.map((p) => ({ value: p, label: p })),
        []
    );

    const advisorById = useMemo(() => {
        const map = new Map<string, AdvisorListItem>();
        advisors.forEach((a) => map.set(String(a.id), a));
        return map;
    }, [advisors]);

    const advisor = lead.advisorReferralId ? advisorById.get(String(lead.advisorReferralId)) : undefined;
    const parentAdvisor = lead.parentAdvisorId ? advisorById.get(String(lead.parentAdvisorId)) : undefined;

    const displayName = previewName ?? lead.fullName ?? 'N/A';

    const config = PRODUCT_CONFIG[productType] || PRODUCT_CONFIG['Personal Loan'];
    const requiredAmount = lead.requiredAmount;
    const requiredAmountNum = typeof requiredAmount === 'number'
        ? requiredAmount
        : parseFloat(String(requiredAmount || '0')) || 0;

    const canEditPersonal = canEdit('personalInfo');

    const metrics = [
        {
            label: 'Product',
            val: productType,
            rawVal: String(lead.selectedProduct || productType),
            editKey: 'selectedProduct',
            editType: 'select' as const,
            options: productOptions,
            icon: '📄',
            bg: 'neutral200',
        },
        {
            label: 'Required Amount',
            val: requiredAmount ? `₹ ${requiredAmountNum.toLocaleString()}` : '',
            rawVal: String(requiredAmount ?? ''),
            editKey: 'requiredAmount',
            editType: 'number' as const,
            icon: '₹',
            bg: 'success100',
        },
        {
            label: 'Advisor',
            val: advisor?.fullName || lead.advisorReferralId || 'N/A',
            rawVal: String(lead.advisorReferralId || ''),
            editKey: 'advisorReferralId',
            searchable: true,
            searchOptions: advisorOptions,
            sub: lead.advisorReferralId ? `Referral ID: ${lead.advisorReferralId}` : undefined,
            icon: '👤',
            bg: 'primary100',
        },
        {
            label: 'Parent Advisor',
            val: parentAdvisor?.fullName || (lead.parentAdvisorId ? String(lead.parentAdvisorId) : 'N/A'),
            rawVal: String(lead.parentAdvisorId || ''),
            editKey: 'parentAdvisorId',
            searchable: true,
            searchOptions: advisorOptions,
            allowEmpty: true,
            sub: lead.parentAdvisorId ? `Advisor ID: ${lead.parentAdvisorId}` : undefined,
            icon: '🔗',
            bg: 'warning100',
        },
        {
            label: 'Lead Status',
            val: currentStatusLabel,
            icon: '⚙️',
            bg: 'neutral200',
            isBadge: true,
        },
    ];

    return (
        <>
            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px" marginBottom={4}>
                <Flex gap={4} alignItems="flex-start">
                    <Box padding={2} background="success100" borderRadius="50%" style={styles.identityIcon}>
                        👤
                    </Box>
                    <Box style={{ flex: 1 }}>
                        <Typography
                            variant="alpha"
                            fontWeight="bold"
                            textColor="neutral800"
                            style={{ fontSize: '1.75rem', lineHeight: 1.2, marginBottom: '6px' }}
                        >
                            {displayName}
                        </Typography>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <Typography variant="pi" textColor="neutral600" fontWeight="bold">
                                Lead ID:
                            </Typography>
                            <SearchableEditableField
                                value={leadRouteKey}
                                displayValue={`#${leadIdDisplay}`}
                                options={leadOptions}
                                canEdit={canEditPersonal}
                                compact
                                onDraftSelect={(opt) => {
                                    if (!opt) return;
                                    const idPart = opt.label.split(' — ')[0]?.replace('#', '') || '';
                                    const namePart = opt.label.split(' — ')[1];
                                    if (namePart) setPreviewName(namePart);
                                    else {
                                        const found = leads.find((l) => String(l.documentId || l.id) === opt.value);
                                        setPreviewName(found?.fullName || null);
                                    }
                                }}
                                onSave={async (val) => {
                                    if (val && val !== leadRouteKey && onNavigateToLead) {
                                        onNavigateToLead(val);
                                    }
                                }}
                            />
                        </div>
                    </Box>
                </Flex>
            </Box>

            <div style={styles.metricGrid}>
                {metrics.map((m, i) => (
                    <Box key={i} background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                        <Flex gap={3}>
                            <Box padding={3} background={m.bg as 'neutral200' | 'success100' | 'primary100' | 'warning100'} borderRadius="8px">{m.icon}</Box>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="pi" textColor="neutral600" display="block">{m.label}</Typography>
                                {(m as { isBadge?: boolean }).isBadge ? (
                                    <Badge variant={currentStatusColor as 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'neutral'}>{m.val}</Badge>
                                ) : (m as { searchable?: boolean }).searchable ? (
                                    <>
                                        <SearchableEditableField
                                            value={(m as { rawVal: string }).rawVal}
                                            displayValue={m.val}
                                            options={(m as { searchOptions: SearchableOption[] }).searchOptions}
                                            allowEmpty={(m as { allowEmpty?: boolean }).allowEmpty}
                                            onSave={(v) => onSaveLeadField((m as { editKey: string }).editKey, v)}
                                            canEdit={canEditPersonal && canEditField('personalInfo', (m as { editKey: string }).editKey)}
                                        />
                                        {(m as { sub?: string }).sub && (
                                            <Typography variant="pi" display="block" textColor="neutral600">
                                                {(m as { sub?: string }).sub}
                                            </Typography>
                                        )}
                                    </>
                                ) : (m as { editKey?: string }).editKey ? (
                                    <>
                                        <EditableField
                                            value={(m as { rawVal: string }).rawVal}
                                            displayValue={m.val}
                                            onSave={(v) => onSaveLeadField((m as { editKey: string }).editKey, v)}
                                            canEdit={canEditPersonal && canEditField('personalInfo', (m as { editKey: string }).editKey)}
                                            type={(m as { editType?: 'text' | 'number' | 'select' }).editType || 'text'}
                                            options={(m as { options?: { value: string; label: string }[] }).options}
                                        />
                                        {(m as { sub?: string }).sub && (
                                            <Typography variant="pi" display="block" textColor="neutral600">
                                                {(m as { sub?: string }).sub}
                                            </Typography>
                                        )}
                                    </>
                                ) : (
                                    <Typography variant="pi" textColor="neutral800">{m.val}</Typography>
                                )}
                            </Box>
                        </Flex>
                    </Box>
                ))}
            </div>

            {canView('personalInfo') && (
                <Box marginBottom={6}>
                    <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">
                        Lead Details :
                    </Typography>
                    <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                        <div style={styles.fourColGrid}>
                            {config.leadFields
                                .filter((f: { key: string }) => canViewField('personalInfo', f.key))
                                .map((f: { label: string; key: string; type?: string }, i: number) => {
                                    const rawVal = lead[f.key];
                                    const rawStr = rawVal === null || rawVal === undefined ? '' : String(rawVal);
                                    let displayVal = rawStr || 'N/A';
                                    if (f.type === 'currency' && rawStr) {
                                        displayVal = `₹ ${Number(rawStr).toLocaleString()}`;
                                    }
                                    return (
                                        <Box key={i} marginBottom={2}>
                                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">
                                                {f.label}
                                            </Typography>
                                            <EditableField
                                                value={rawStr}
                                                displayValue={displayVal !== rawStr ? displayVal : undefined}
                                                onSave={(v) => onSaveLeadField(f.key, v)}
                                                canEdit={canEditField('personalInfo', f.key)}
                                                type={f.type === 'currency' ? 'number' : 'text'}
                                            />
                                        </Box>
                                    );
                                })}
                            {canViewField('personalInfo', 'getEmailNotification') && (
                                <Box marginBottom={2}>
                                    <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">
                                        Get Email Notifications?
                                    </Typography>
                                    {canEditField('personalInfo', 'getEmailNotification') ? (
                                        <button
                                            type="button"
                                            onClick={() => onSaveLeadField(
                                                'getEmailNotification',
                                                String(lead.getEmailNotification) === 'true' ? 'false' : 'true'
                                            )}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '12px',
                                                background: String(lead.getEmailNotification) === 'true' ? '#dcfce7' : '#f1f5f9',
                                                color: String(lead.getEmailNotification) === 'true' ? '#166534' : '#64748b',
                                            }}
                                        >
                                            <span style={{ fontSize: '10px' }}>{String(lead.getEmailNotification) === 'true' ? '●' : '○'}</span>
                                            {String(lead.getEmailNotification) === 'true' ? 'Yes' : 'No'}
                                        </button>
                                    ) : (
                                        <Typography variant="pi" textColor="neutral800">
                                            {String(lead.getEmailNotification) === 'true' ? 'Yes' : 'No'}
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </div>
                    </Box>
                </Box>
            )}
        </>
    );
};
