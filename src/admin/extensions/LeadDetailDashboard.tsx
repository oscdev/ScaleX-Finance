import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Divider,
    Flex,
    Badge,
    Textarea
} from '@strapi/design-system';

const LEAD_STATUS_OPTIONS = [
    { label: '1 - NEW', value: 'NEW', color: 'primary' },
    { label: '2 - UNDER-PROCESS', value: 'UNDER_PROCESS', color: 'secondary' },
    { label: '3 - APPROVED', value: 'APPROVED', color: 'success' },
    { label: '4 - REJECTED', value: 'REJECTED', color: 'danger' },
    { label: '5 - DISBURSED', value: 'DISBURSED', color: 'warning' }
];

const PRODUCT_CONFIG: Record<string, { leadFields: any[] }> = {
    'Personal Loan': {
        leadFields: [
            { label: 'Loan Requirement', key: 'requiredAmount', type: 'currency' },
            { label: 'Full Name', key: 'fullName' },
            { label: 'Mobile Number', key: 'mobileNumber' },
            { label: 'Email', key: 'email' },
            { label: 'Aadhar Card', key: 'aadharCard' },
            { label: 'Pan Card', key: 'panCard' },
            { label: 'Pin Code', key: 'pinCode' }
        ]
    },
    'Business Loan': {
        leadFields: [
            { label: 'Loan Requirement', key: 'requiredAmount', type: 'currency' },
            { label: 'Full Name', key: 'fullName' },
            { label: 'Mobile Number', key: 'mobileNumber' },
            { label: 'Email', key: 'email' },
            { label: 'Aadhar Card', key: 'aadharCard' },
            { label: 'Pan Card', key: 'panCard' },
            { label: 'Pin Code', key: 'pinCode' }
        ]
    },
    'Home Loan': {
        leadFields: [
            { label: 'Lead Type', key: 'leadType' },
            { label: 'Loan Requirement', key: 'requiredAmount', type: 'currency' },
            { label: 'Full Name', key: 'fullName' },
            { label: 'Mobile Number', key: 'mobileNumber' },
            { label: 'Email', key: 'email' },
            { label: 'Aadhar Card', key: 'aadharCard' },
            { label: 'Pan Card', key: 'panCard' },
            { label: 'Pin Code', key: 'pinCode' },
            { label: 'Employment Type', key: 'employmentType' }
        ]
    },
    'LAP': {
        leadFields: [
            { label: 'Loan Requirement', key: 'requiredAmount', type: 'currency' },
            { label: 'Full Name', key: 'fullName' },
            { label: 'Mobile Number', key: 'mobileNumber' },
            { label: 'Property Type', key: 'propertyType' },
            { label: 'Property Status', key: 'propertyStatus' },
            { label: 'Property Value', key: 'propertyValue', type: 'currency' },
            { label: 'Email', key: 'email' },
            { label: 'Aadhar Card', key: 'aadharCard' },
            { label: 'Pan Card', key: 'panCard' },
            { label: 'Pin Code', key: 'pinCode' },
            { label: 'Employment Type', key: 'employmentType' }
        ]
    },
    'LAP (Loan Against Property)': {
        leadFields: [
            { label: 'Loan Requirement', key: 'requiredAmount', type: 'currency' },
            { label: 'Full Name', key: 'fullName' },
            { label: 'Mobile Number', key: 'mobileNumber' },
            { label: 'Property Type', key: 'propertyType' },
            { label: 'Property Status', key: 'propertyStatus' },
            { label: 'Property Value', key: 'propertyValue', type: 'currency' },
            { label: 'Email', key: 'email' },
            { label: 'Aadhar Card', key: 'aadharCard' },
            { label: 'Pan Card', key: 'panCard' },
            { label: 'Pin Code', key: 'pinCode' },
            { label: 'Employment Type', key: 'employmentType' }
        ]
    }
};

const getAppSteps = (loanType: string, occupation: string) => {
    const isSelfEmployed = occupation === 'Self Employed';
    const isLAP = loanType === 'LAP' || loanType === 'LAP (Loan Against Property)';

    if (isSelfEmployed && loanType === 'Home Loan') {
        return ['Business', 'Personal', 'Residence', 'Property', 'Other', 'Docs'];
    }

    if (isSelfEmployed && isLAP) {
        return ['Business', 'Personal', 'Residence', 'Other', 'Docs'];
    }

    switch (loanType) {
        case 'Business Loan':
            return ['Business', 'Personal', 'Residence', 'Other', 'Docs'];
        case 'LAP':
        case 'LAP (Loan Against Property)':
            return ['Personal', 'Residence', 'Income', 'Other', 'Docs'];
        case 'Home Loan':
            return ['Personal', 'Residence', 'Property', 'Income', 'Other', 'Docs'];
        case 'Personal Loan':
        default:
            return ['Personal', 'Residence', 'Income', 'Other', 'Docs'];
    }
};

export const LeadDetailDashboard = ({ leadId }: { leadId: string }) => {
    const [lead, setLead] = useState<any>(null);
    const [loanApp, setLoanApp] = useState<any>(null);
    const [advisor, setAdvisor] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [newRemark, setNewRemark] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [errorLogs, setErrorLogs] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const logs: string[] = [];
            const addLog = (msg: string) => {
                // console.log(`[Dashboard] ${msg}`);
                logs.push(msg);
                setErrorLogs([...logs]);
            };

            addLog(`Starting fetch for Lead ID: ${leadId}`);
            setIsLoading(true);

            try {
                const getToken = () => {
                    if (typeof window === 'undefined') return '';
                    const sessionT = window.sessionStorage.getItem('jwtToken');
                    const localT = window.localStorage.getItem('jwtToken');
                    const getCookie = (name: string) => {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop()?.split(';').shift();
                        return null;
                    };
                    const cookieT = getCookie('jwtToken');
                    return (sessionT || localT || cookieT || '')?.replace(/"/g, '');
                };
                const token = getToken();
                const headers = {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                };

                // STEP 0: Priority - Content Manager API (Direct ID)
                addLog('Trying Content Manager (Lead)...');
                const cmLeadRes = await fetch(`/content-manager/collection-types/api::lead.lead/${leadId}`, { headers });
                if (cmLeadRes.ok) {
                    const data = await cmLeadRes.json();
                    const obj = data.data || data;
                    if (obj && (obj.id || obj.documentId)) {
                        addLog('Found via Content Manager (Lead).');
                        setLead({ ...obj, id: obj.id || leadId });
                        if (obj.status) setStatus(obj.status);
                        return;
                    }
                }

                addLog('Trying Content Manager (Loan App)...');
                const cmLoanRes = await fetch(`/content-manager/collection-types/api::loan-application.loan-application/${leadId}`, { headers });
                if (cmLoanRes.ok) {
                    const loanData = await cmLoanRes.json();
                    const loanObj = loanData.data || loanData;
                    if (loanObj && loanObj.id) {
                        addLog('Found via Content Manager (Loan App).');
                        setLoanApp({ ...loanObj });
                        if (loanObj.leadId) {
                            addLog(`Fetching parent Lead (ID: ${loanObj.leadId})...`);
                            const cmPLeadRes = await fetch(`/content-manager/collection-types/api::lead.lead/${loanObj.leadId}`, { headers });
                            if (cmPLeadRes.ok) {
                                const pLeadData = await cmPLeadRes.json();
                                const pLeadObj = pLeadData.data || pLeadData;
                                setLead({ ...pLeadObj, id: pLeadObj.id || loanObj.leadId });
                                if (pLeadObj.status) setStatus(pLeadObj.status);
                                return;
                            }
                        } else {
                            addLog('Found Loan App but no leadId reference.');
                            setLead({
                                fullName: loanObj.applicantName,
                                email: loanObj.email,
                                mobileNumber: loanObj.phone,
                                selectedProduct: loanObj.loanType,
                                requiredAmount: loanObj.loanAmount,
                                isVirtual: true
                            });
                            return;
                        }
                    }
                }

                // FALLBACK: Public REST API (Search)
                addLog('Falling back to Filtered Search...');
                const searchRes = await fetch(`/api/leads?filters[id][$eq]=${leadId}&populate=*`);
                if (searchRes.ok) {
                    const data = await searchRes.json();
                    const items = data.data || [];
                    if (items.length > 0) {
                        const obj = items[0].attributes || items[0];
                        addLog('Found via Public Filtered Search');
                        setLead({ ...obj, id: items[0].id });
                        if (obj.status) setStatus(obj.status);
                        return;
                    }
                }

                addLog('Failed to find matching record at all.');
            } catch (err: any) {
                addLog(`Fatal Error: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        if (leadId) fetchData();
    }, [leadId]);

    // Fetch Loan Application separately once Lead is found
    useEffect(() => {
        const fetchLoan = async () => {
            if (!leadId) return;
            try {
                const getToken = () => {
                    if (typeof window === 'undefined') return '';
                    const sessionT = window.sessionStorage.getItem('jwtToken');
                    const localT = window.localStorage.getItem('jwtToken');

                    const getCookie = (name: string) => {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop()?.split(';').shift();
                        return null;
                    };
                    const cookieT = getCookie('jwtToken');

                    return (sessionT || localT || cookieT || '')?.replace(/"/g, '');
                };
                const token = getToken();
                const headers = {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                };

                // TRY A: Public API (Primary strategy because it correctly populates deep Media URLs via populate=*)
                const numericLId = lead?.id || (!isNaN(parseInt(leadId)) ? parseInt(leadId) : null);
                if (numericLId) {
                    const pubRes = await fetch(`/api/loan-applications?filters[leadId][$eq]=${numericLId}&populate=*`);
                    if (pubRes.ok) {
                        const pubData = await pubRes.json();
                        const items = pubData.data || [];
                        if (items.length > 0) {
                            const found = items[0].attributes || items[0];
                            // console.log('[Dashboard] Found via Public API:', found);
                            setLoanApp({ ...found, id: items[0].id });
                            return; // Exit if successful
                        }
                    }
                }

                // TRY B: Direct ID fetch from Content Manager (If ID is internal ID of loan-app)
                const res = await fetch(`/content-manager/collection-types/api::loan-application.loan-application/${leadId}?populate=*`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    const obj = data.data || data;
                    if (obj && obj.id) {
                        setLoanApp(obj);
                        return;
                    }
                }

                // TRY C: Search by Lead ID, Email or Phone using Content Manager API (Fallback)
                if (lead) {
                    const lId = lead.id || lead.documentId;
                    const cmSearchQuery = `/content-manager/collection-types/api::loan-application.loan-application?filters[$or][0][leadId][$eq]=${lId}&filters[$or][1][email][$eq]=${lead.email}&filters[$or][2][phone][$eq]=${lead.mobileNumber}&populate=*`;

                    const cmSearchRes = await fetch(cmSearchQuery, { headers });
                    if (cmSearchRes.ok) {
                        const cmSearchData = await cmSearchRes.json();
                        const found = cmSearchData.results?.[0] || cmSearchData.data?.[0];
                        if (found) {
                            setLoanApp(found);
                            return;
                        }
                    }
                }
            } catch (e) {
                // console.error('[Dashboard] Loan fetch error:', e);
            }
        };
        if (lead) fetchLoan();
    }, [leadId, lead]);

    // Fetch Advisor details
    useEffect(() => {
        const fetchAdvisor = async () => {
            if (!lead?.advisorReferralId) return;
            try {
                const res = await fetch(`/api/advisors?filters[id][$eq]=${lead.advisorReferralId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.data?.length > 0) {
                        const adv = data.data[0].attributes || data.data[0];
                        setAdvisor(adv);
                    }
                }
            } catch (e) {
                // console.error('[Dashboard] Advisor fetch error:', e);
            }
        };
        if (lead) fetchAdvisor();
    }, [lead]);

    // Fetch logged-in admin user info
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const getToken = () => {
                    if (typeof window === 'undefined') return '';
                    const sessionT = window.sessionStorage.getItem('jwtToken');
                    const localT = window.localStorage.getItem('jwtToken');
                    const getCookie = (name: string) => {
                        const value = `; ${document.cookie}`;
                        const parts = value.split(`; ${name}=`);
                        if (parts.length === 2) return parts.pop()?.split(';').shift();
                        return null;
                    };
                    const cookieT = getCookie('jwtToken');
                    return (sessionT || localT || cookieT || '')?.replace(/"/g, '');
                };
                const token = getToken();
                if (!token) return;

                const res = await fetch('/admin/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data.data || data);
                }
            } catch (e) {
                // console.error('[Dashboard] User fetch error:', e);
            }
        };
        fetchMe();
    }, []);

    const handleUpdateStatus = async () => {
        if (!status) {
            // alert('Please select a status');
            return;
        }

        setIsUpdating(true);
        try {
            // 1. Get current remarks history
            const currentRemarks = Array.isArray(lead.remarks) ? lead.remarks : [];

            // 2. Prepare new entry with actual Author name and Role
            let authorName = 'System';
            if (currentUser) {
                const roleName = Array.isArray(currentUser.roles) && currentUser.roles.length > 0
                    ? currentUser.roles[0].name
                    : 'Admin';
                authorName = `${currentUser.firstname} ${currentUser.lastname || ''} (${roleName})`;
            }

            const newEntry = {
                text: newRemark || `Status changed to ${status}`,
                status: status,
                timestamp: new Date().toISOString(),
                author: authorName.trim()
            };

            const updatedRemarks = [...currentRemarks, newEntry];

            // 3. Update Lead via Content Manager API (to bypass Forbidden / Permission issues)
            const getToken = () => {
                if (typeof window === 'undefined') return '';
                const sessionT = window.sessionStorage.getItem('jwtToken');
                const localT = window.localStorage.getItem('jwtToken');

                const getCookie = (name: string) => {
                    const value = `; ${document.cookie}`;
                    const parts = value.split(`; ${name}=`);
                    if (parts.length === 2) return parts.pop()?.split(';').shift();
                    return null;
                };
                const cookieT = getCookie('jwtToken');

                return (sessionT || localT || cookieT || '')?.replace(/"/g, '');
            };
            const token = getToken();
            const headers = {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            };

            const cleanStatus = status.trim();
            const payload = {
                data: {
                    status: cleanStatus,
                    remarks: updatedRemarks
                }
            };

            // Log the payload for debugging (visible in browser console)
            console.log('[Dashboard] Updating lead via Public API with payload:', payload);

            const res = await fetch(`/api/leads/${lead.documentId || leadId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                // alert('Lead status and remarks updated successfully');
                setNewRemark(''); // Clear the box

                // 4. Refresh lead data to show new history
                const refreshRes = await fetch(`/content-manager/collection-types/api::lead.lead/${lead.documentId || lead.id || leadId}`, {
                    headers: headers
                });
                if (refreshRes.ok) {
                    const freshData = await refreshRes.json();
                    setLead(freshData.data || freshData);
                }
            } else {
                const errorData = await res.json();
                console.error('[Dashboard] Update failed with details:', JSON.stringify(errorData, null, 2));
                // alert(`Update failed: ${errorData.error?.message || 'Check console for errors'}`);
            }
        } catch (err: any) {
            // alert(`Error updating lead: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    if (isLoading) return <Box padding={8} background="neutral100">Loading Lead Detail Dashboard...</Box>;

    if (!lead) return (
        <Box padding={8} background="danger100">
            <Typography variant="beta">Lead not found (ID: {leadId})</Typography>
            <Box marginTop={4} padding={4} background="neutral0" hasRadius shadow="filterShadow">
                <Typography variant="delta">Debug Trace:</Typography>
                {errorLogs.map((log, i) => (
                    <Typography key={i} variant="pi" textColor="danger700" display="block" style={{ marginTop: '4px' }}>
                        • {log}
                    </Typography>
                ))}
            </Box>
        </Box>
    );

    const productType = lead.selectedProduct || (loanApp?.loanType) || 'Personal Loan';
    const config = PRODUCT_CONFIG[productType] || PRODUCT_CONFIG['Personal Loan'];
    const appSteps = getAppSteps(productType, lead.employmentType || '');

    const currentStatusColor = LEAD_STATUS_OPTIONS.find(o => o.value === status)?.color || 'neutral';
    const currentStatusLabel = LEAD_STATUS_OPTIONS.find(o => o.value === status)?.label || status;

    return (
        <Box padding={6} background="neutral100" style={{ minHeight: '100vh' }}>
            {/* Header / Breadcrumbs */}
            <Flex gap={2} marginBottom={4}>
                <Typography variant="pi" textColor="neutral600">Dashboard</Typography>
                <span>/</span>
                <Typography variant="pi" textColor="neutral600">{productType}</Typography>
                <span>/</span>
                <Typography variant="pi" fontWeight="bold">Lead View</Typography>
            </Flex>

            {/* Top Identity Card */}
            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px" marginBottom={4}>
                <Flex gap={4}>
                    <Box padding={2} background="success100" borderRadius="50%" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        👤
                    </Box>
                    <Box>
                        <Typography variant="beta" fontWeight="bold">{lead.fullName || 'N/A'}</Typography>
                        <Typography variant="pi" textColor="neutral600" marginLeft={2}>- #{leadId}</Typography>
                    </Box>
                </Flex>
            </Box>

            {/* Metric Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Product', val: productType, icon: '📄', bg: 'neutral200' },
                    { label: 'Required Amount', val: lead.requiredAmount ? `₹ ${lead.requiredAmount.toLocaleString()}` : '₹ 0.00', icon: '₹', bg: 'success100', color: 'success700' },
                    { label: 'Advisor', val: advisor ? advisor.fullName : 'N/A', sub: `Referral ID: ${lead.advisorReferralId || 'N/A'}`, icon: '👤', bg: 'primary100' },
                    { label: 'Lead Status', val: currentStatusLabel, icon: '⚙️', bg: 'neutral200', isBadge: true }
                ].map((m, i) => (
                    <Box key={i} background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                        <Flex gap={3}>
                            <Box padding={3} background={m.bg} borderRadius="8px">{m.icon}</Box>
                            <Box>
                                <Typography variant="pi" textColor="neutral600" display="block">{m.label}</Typography>
                                {m.isBadge ? (
                                    <Badge variant={currentStatusColor as any}>{m.val}</Badge>
                                ) : (
                                    <>
                                        <Typography variant="delta" fontWeight="bold" textColor={(m as any).color || 'neutral800'}>{m.val}</Typography>
                                        {(m as any).sub && <Typography variant="pi" display="block" textColor="neutral600">{(m as any).sub}</Typography>}
                                    </>
                                )}
                            </Box>
                        </Flex>
                    </Box>
                ))}
            </div>

            {/* Lead Details Info Row */}
            <Box marginBottom={6}>
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Lead Details :</Typography>
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {config.leadFields.map((f, i) => {
                            let val = lead[f.key] || 'N/A';
                            if (f.type === 'currency' && val !== 'N/A') {
                                val = `₹ ${val.toLocaleString()}`;
                            }
                            return (
                                <Box key={i} marginBottom={2}>
                                    <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{f.label}</Typography>
                                    <Typography variant="pi" textColor="neutral800">{val}</Typography>
                                </Box>
                            );
                        })}
                        <Box marginBottom={2}>
                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">Get Email Notifications?</Typography>
                            <Typography variant="pi" textColor="neutral800">{String(lead.getEmailNotification) === 'true' ? 'Yes' : 'No'}</Typography>
                        </Box>
                    </div>
                </Box>
            </Box>

            {/* Management & History Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                {/* Status Update Form */}
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <Typography variant="delta" fontWeight="bold" marginBottom={4} display="block">Lead Management</Typography>

                    <Box padding={3} background="neutral150" borderRadius="4px" marginBottom={4}>
                        <Typography variant="pi">Current Status: </Typography>
                        <Badge variant={currentStatusColor as any} marginLeft={2}>{currentStatusLabel}</Badge>
                    </Box>

                    <Box marginBottom={4}>
                        <Typography variant="pi" fontWeight="bold" textColor="primary600" display="block" marginBottom={1}>UPDATE LEAD STATUS *</Typography>
                        <Flex gap={2}>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #dcdce4' }}
                            >
                                {LEAD_STATUS_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </Flex>
                    </Box>

                    <Box marginBottom={4}>
                        <Typography variant="pi" fontWeight="bold" textColor="primary600" display="block" marginBottom={1}>Lead Remark *</Typography>
                        <Textarea
                            placeholder="Enter remarks here..."
                            value={newRemark}
                            onChange={(e: any) => setNewRemark(e.target.value)}
                        />
                    </Box>

                    <Button onClick={handleUpdateStatus} loading={isUpdating} variant="default" size="L">Update Status</Button>
                </Box>

                {/* Conversation History */}
                <Box background="neutral0" shadow="filterShadow" borderRadius="8px" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box padding={3} background="neutral700" style={{ borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                        <Typography variant="pi" fontWeight="bold" textColor="neutral0">Conversation History</Typography>
                    </Box>
                    <Box padding={4} style={{ flex: 1, background: '#f6f7f9', maxHeight: '400px', overflowY: 'auto' }}>
                        {(() => {
                            if (!Array.isArray(lead.remarks)) return <Box padding={8} textAlign="center"><Typography variant="pi" textColor="neutral500">No conversation history available.</Typography></Box>;
                            
                            const validRemarks = lead.remarks.filter((entry: any) => {
                                if (!entry.text || entry.text.trim() === '') return false;
                                if (entry.text === `Status changed to ${entry.status}`) return false;
                                return true;
                            });

                            if (validRemarks.length === 0) return <Box padding={8} textAlign="center"><Typography variant="pi" textColor="neutral500">No conversation history available.</Typography></Box>;

                            return (
                                <Flex direction="column" alignItems="stretch" gap={4}>
                                    {validRemarks.map((entry: any, index: number) => {
                                        const isMine = currentUser && entry.author && entry.author.includes(currentUser.firstname) && entry.author.includes(currentUser.lastname || '');

                                        return (
                                            <Box
                                                key={index}
                                                maxWidth="70%"
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    width: 'fit-content',
                                                    alignSelf: isMine ? 'flex-end' : 'flex-start'
                                                }}
                                            >
                                                <Flex justifyContent={isMine ? 'flex-end' : 'flex-start'} marginBottom={1} gap={2}>
                                                    {!isMine && (
                                                        <Box background="neutral200" color="neutral800" padding={1} borderRadius="4px" style={{ fontSize: '10px', fontWeight: 'bold' }}>
                                                            {entry.author?.[0] || 'U'}
                                                        </Box>
                                                    )}
                                                    <Typography variant="pi" textColor="neutral600" style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                                        {entry.author}
                                                    </Typography>
                                                    {isMine && (
                                                        <Box background="primary600" color="white" padding={1} borderRadius="4px" style={{ fontSize: '10px', fontWeight: 'bold' }}>
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
                                                    style={{
                                                        borderBottomRightRadius: isMine ? '0px' : '12px',
                                                        borderBottomLeftRadius: isMine ? '12px' : '0px',
                                                        border: isMine ? 'none' : '1px solid #eaeaef'
                                                    }}
                                                >
                                                    <Typography variant="pi" textColor={isMine ? 'neutral0' : 'neutral800'} style={{ wordBreak: 'break-word' }}>
                                                        {entry.text}
                                                    </Typography>

                                                    <Flex justifyContent="flex-end" marginTop={2} gap={4}>
                                                        <Typography variant="pi" textColor={isMine ? 'neutral200' : 'neutral500'} style={{ fontSize: '9px' }}>
                                                            {new Date(entry.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                                                        </Typography>
                                                    </Flex>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Flex>
                            );
                        })()}
                    </Box>
                </Box>
            </div>

            {/* Step-wise Application Details */}
            {loanApp ? (
                <>
                    {/* 1. Business Info */}
                    {(appSteps.includes('Business')) && (
                        <Box marginBottom={4}>
                            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Business Details</Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {[
                                        { label: 'Business Name', val: loanApp.form_data?.businessDetails?.name || 'N/A' },
                                        { label: 'Business Premises', val: loanApp.form_data?.businessDetails?.premises || 'N/A' },
                                        { label: 'Business Type', val: loanApp.form_data?.businessDetails?.type || 'N/A' },
                                        { label: 'Annual Turnover', val: loanApp.form_data?.businessDetails?.turnover || 'N/A' },
                                        { label: 'Business Age', val: loanApp.form_data?.businessDetails?.age || 'N/A' },
                                        { label: 'Business Registration Proof', val: loanApp.form_data?.businessDetails?.regProof || 'N/A' }
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                                <Box marginTop={2}>
                                    <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">Business Address</Typography>
                                    <Typography variant="pi" textColor="neutral800">{loanApp.form_data?.businessDetails?.address || 'N/A'}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* 2. Personal Info */}
                    {(appSteps.includes('Personal')) && (
                        <Box marginBottom={4}>
                            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Personal Details</Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {[
                                        { label: 'Date of Birth', val: loanApp.form_data?.personalDetails?.dob || 'N/A' },
                                        { label: 'Marital Status', val: loanApp.form_data?.personalDetails?.maritalStatus || 'N/A' },
                                        { label: 'Spouse Name', val: loanApp.form_data?.personalDetails?.spouseName || 'N/A' },
                                        { label: 'Mother Name', val: loanApp.form_data?.personalDetails?.motherName || 'N/A' },
                                        { label: 'Alternate Number', val: loanApp.form_data?.personalDetails?.alternateNumber || 'N/A' },
                                        ...(productType !== 'Business Loan' ? [{ label: 'Dependent', val: loanApp.form_data?.personalDetails?.dependents || 'N/A' }] : [])
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                            </Box>
                        </Box>
                    )}

                    {/* 3. Address Info */}
                    {(appSteps.includes('Residence')) && (
                        <Box marginBottom={4}>
                            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Residence Details</Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {[
                                        { label: 'Address Line 1', val: loanApp.form_data?.addressDetails?.line1 || 'N/A' },
                                        { label: 'Address Line 2', val: loanApp.form_data?.addressDetails?.line2 || 'N/A' },
                                        { label: 'Landmark', val: loanApp.form_data?.addressDetails?.landmark || 'N/A' },
                                        { label: 'State', val: loanApp.form_data?.addressDetails?.state || 'N/A' },
                                        { label: 'District', val: loanApp.form_data?.addressDetails?.district || 'N/A' },
                                        { label: 'City', val: loanApp.form_data?.addressDetails?.city || 'N/A' },
                                        { label: 'Residence Type', val: loanApp.form_data?.addressDetails?.residenceType || 'N/A' }
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                            </Box>
                        </Box>
                    )}

                    {/* 4. Property Info */}
                    {(appSteps.includes('Property')) && (
                        <Box marginBottom={4}>
                            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Property Details</Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {[
                                        { label: 'Property Type', val: loanApp.form_data?.propertyDetails?.type || 'N/A' },
                                        { label: 'Property Current Status', val: loanApp.form_data?.propertyDetails?.status || 'N/A' },
                                        { label: 'Property Value', val: loanApp.form_data?.propertyDetails?.value || 'N/A' }
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                                <Box marginTop={2}>
                                    <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">Property Address With Pincode</Typography>
                                    <Typography variant="pi" textColor="neutral800">{loanApp.form_data?.addressDetails?.propertyAddressPincode || 'N/A'}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* 5. Income Info */}
                    {(appSteps.includes('Income')) && (
                        <Box marginBottom={4}>
                            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Income Details</Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                                    {[
                                        { label: 'Company Name', val: loanApp.form_data?.incomeDetails?.companyName || 'N/A' },
                                        { label: 'Designation', val: loanApp.form_data?.incomeDetails?.designation || 'N/A' },
                                        { label: 'Company Address', val: loanApp.form_data?.incomeDetails?.companyAddress || 'N/A' },
                                        { label: 'Net Salary (Per Month)', val: loanApp.form_data?.incomeDetails?.netSalary ? `₹ ${parseInt(loanApp.form_data.incomeDetails.netSalary).toLocaleString()}` : 'N/A' },
                                        { label: 'Salary Mode', val: loanApp.form_data?.incomeDetails?.salaryMode || 'N/A' },
                                        { label: 'Current Job Stability', val: loanApp.form_data?.incomeDetails?.jobStability || 'N/A' }
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                            </Box>
                        </Box>
                    )}

                    {/* 6. Running Loans */}
                    {(appSteps.includes('Other')) && (
                        <Box marginBottom={4}>
                            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Running Loan (If Any)</Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                {loanApp.form_data?.otherDetails?.runningLoans?.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: '#f6f6f9', textAlign: 'left' }}>
                                                <th style={{ padding: '8px' }}>Loan Type</th>
                                                <th style={{ padding: '8px' }}>Bank Name</th>
                                                <th style={{ padding: '8px' }}>Loan Amount</th>
                                                <th style={{ padding: '8px' }}>EMI amount</th>
                                                <th style={{ padding: '8px' }}>No of Paid EMI</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {loanApp.form_data.otherDetails.runningLoans.map((l: any, i: number) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                                    <td style={{ padding: '8px' }}>{l.type}</td>
                                                    <td style={{ padding: '8px' }}>{l.bank}</td>
                                                    <td style={{ padding: '8px' }}>{l.amount}</td>
                                                    <td style={{ padding: '8px' }}>{l.emi}</td>
                                                    <td style={{ padding: '8px' }}>{l.paidEmi}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <Typography variant="pi" textColor="neutral600">No running loans reported.</Typography>
                                )}
                            </Box>
                        </Box>
                    )}
                </>
            ) : (
                <Box padding={8} background="neutral0" shadow="filterShadow" borderRadius="8px" marginBottom={6} textAlign="center">
                    <Typography variant="pi" textColor="neutral600">Application not fully submitted yet. Only Lead details available.</Typography>
                </Box>
            )}

            {/* Document Details Table */}
            <Box marginBottom={6}>
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Document Details</Typography>
                <Box background="neutral0" shadow="filterShadow" borderRadius="8px" overflow="hidden">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f6f6f9', textAlign: 'left', borderBottom: '1px solid #dcdce4' }}>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Document ID</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">File Format</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Document Type</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Password</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Date</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">status</Typography></th>
                                <th style={{ padding: '12px', textAlign: 'center' }}><Typography variant="pi" fontWeight="bold">view</Typography></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const docs: any[] = [];
                                const docLabels: Record<string, string> = {
                                    proprietorshipDoc: 'Proprietorship Doc',
                                    panCard: 'Pan Card',
                                    aadharCardFront: 'Aadhar Card Front',
                                    aadharCardBack: 'Aadhar Card Back',
                                    bankStatement: '6 Month Bank Statement',
                                    salarySlips: 'Salary Slip',
                                    coAppPan: 'Co-App PAN',
                                    otherDocs: 'Other Documents',
                                    propertyPapers: 'Property Papers',
                                    coAppAadharFront: 'Co-App Aadhar Front',
                                    coAppAadharBack: 'Co-App Aadhar Back',
                                    businessRegProofDoc: 'Business Reg Proof'
                                };

                                if (loanApp) {
                                    const dMap = loanApp;
                                    const pdfPw = loanApp.form_data?.pdfPasswords || {};
                                    let salaryCounter = 1;
                                    let otherCounter = 1;

                                    const addDoc = (val: any, label: string) => {
                                        if (!val) return;

                                        // Unpack Strapi's data wrapper if present
                                        let rawItems = val.data !== undefined ? val.data : val;
                                        if (!rawItems) return;

                                        const items = Array.isArray(rawItems) ? rawItems : [rawItems];

                                        items.forEach((item: any) => {
                                            if (!item) return;

                                            // Handle case where item might have an 'attributes' property
                                            const attr = item.attributes || item;
                                            const fileId = item.id || (typeof item === 'number' || typeof item === 'string' ? item : null);
                                            const fileName = attr.name || label;
                                            const fileUrl = attr.url || null;
                                            const fileExt = attr.ext ? attr.ext.replace('.', '').toUpperCase() : fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
                                            const fileDate = attr.createdAt ? new Date(attr.createdAt).toISOString().replace('T', ' ').substring(0, 19) : new Date().toISOString().replace('T', ' ').substring(0, 19);

                                            let displayType = docLabels[label] || label;
                                            if (label === 'salarySlips') { displayType = `Salary Slip ${salaryCounter++}`; }
                                            if (label === 'otherDocs') { displayType = `Other Document ${otherCounter++}`; }

                                            if (fileId) {
                                                docs.push({ id: fileId, label, type: displayType, ext: fileExt.length > 4 ? fileExt.substring(0, 3) : fileExt, url: fileUrl, pw: pdfPw[label] || '', date: fileDate });
                                            }
                                        });
                                    };

                                    Object.keys(docLabels).forEach(key => {
                                        addDoc((dMap as any)[key], key);
                                    });
                                }

                                if (docs.length === 0) return <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center' }}><Typography variant="pi">No documents uploaded.</Typography></td></tr>;

                                const handleViewClick = (e: React.MouseEvent, url: string, pw: string) => {
                                    e.preventDefault();
                                    if (!url) {
                                        // alert("Document URL is still processing or unavailable.");
                                        return;
                                    }
                                    const fullUrl = url.startsWith('http') ? url : `${window.location.host === '127.0.0.1:1337' || window.location.port === '1337' ? 'http://localhost:1337' : window.location.origin}${url}`;

                                    if (pw && pw.trim() !== '') {
                                        const input = window.prompt("This document is password protected. Please enter the password:");
                                        if (input === pw) {
                                            window.open(fullUrl, '_blank');
                                        } else if (input !== null) {
                                            // alert("Incorrect password!");
                                        }
                                    } else {
                                        window.open(fullUrl, '_blank');
                                    }
                                };

                                return docs.map((doc, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f6f6f9' }}>
                                        <td style={{ padding: '12px' }}><Typography variant="pi" textColor="neutral600">{doc.id}</Typography></td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '34px', borderRadius: '3px', background: doc.ext === 'PDF' ? '#fee2e2' : '#f1f5f9', border: '1px solid', borderColor: doc.ext === 'PDF' ? '#fca5a5' : '#cbd5e1' }}>
                                                <Typography variant="pi" fontWeight="bold" style={{ fontSize: '9px', color: doc.ext === 'PDF' ? '#dc2626' : '#475569' }}>{doc.ext}</Typography>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">{doc.type}</Typography></td>
                                        <td style={{ padding: '12px' }}><Typography variant="pi" textColor="neutral800">{doc.pw}</Typography></td>
                                        <td style={{ padding: '12px' }}><Typography variant="pi" textColor="neutral600" size="S">{doc.date}</Typography></td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ background: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: '12px', display: 'inline-block', fontSize: '10px', fontWeight: 'bold' }}>UPLOADED</div>
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <div
                                                onClick={(e) => handleViewClick(e, doc.url, doc.pw)}
                                                style={{
                                                    background: '#1e293b',
                                                    color: '#ffffff',
                                                    borderRadius: '4px',
                                                    padding: '6px 12px',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    justifyContent: 'center',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    border: 'none',
                                                    minWidth: '70px',
                                                    transition: 'opacity 0.2s'
                                                }}
                                                title="View Document"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                                    <polyline points="21 15 16 10 5 21"></polyline>
                                                </svg>
                                                <span style={{ color: '#ffffff' }}>View</span>
                                            </div>
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </Box>
            </Box>

            {/* Journey Timeline - Audit Trail from Remarks */}
            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                <Typography variant="delta" fontWeight="bold" marginBottom={4} display="block">Process Journey</Typography>
                <Box paddingLeft={4} style={{ borderLeft: '2px solid #2563eb' }}>
                    {/* Initial Entry */}
                    <Box marginBottom={6} position="relative">
                        <Box position="absolute" left="-23px" top="0" width="14px" height="14px" background="primary600" borderRadius="50%" style={{ border: '3px solid white' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr' }}>
                            <Typography variant="pi" fontWeight="bold" textColor="primary700">
                                {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                            </Typography>
                            <Box>
                                <Typography variant="pi" fontWeight="bold" display="block">LEAD GENERATED</Typography>
                                <Typography variant="pi" textColor="neutral600">Initial lead captured via Frontend Form</Typography>
                            </Box>
                        </div>
                    </Box>

                    {/* History Entries (Strictly Status Changes only) */}
                    {(() => {
                        if (!Array.isArray(lead.remarks)) return null;

                        const validJourney: any[] = [];
                        let previousStatus = null; // Track consecutive changes

                        lead.remarks.forEach((entry: any) => {
                            // Only push to Process Journey if it represents a new status transition
                            if (entry.status && entry.status !== previousStatus) {
                                validJourney.push(entry);
                                previousStatus = entry.status;
                            }
                        });

                        return validJourney.map((entry: any, i: number) => (
                            <Box key={i} marginBottom={6} position="relative">
                                <Box position="absolute" left="-23px" top="0" width="14px" height="14px" background="success600" borderRadius="50%" style={{ border: '3px solid white' }} />
                                <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr' }}>
                                    <Typography variant="pi" fontWeight="bold" textColor="success700">
                                        {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                                    </Typography>
                                    <Box>
                                        <Typography variant="pi" fontWeight="bold" display="block">STATUS UPDATE: {entry.status}</Typography>
                                        <Typography variant="pi" textColor="neutral500" marginTop={1} display="block">Author: {entry.author || 'N/A'}</Typography>
                                    </Box>
                                </div>
                            </Box>
                        ));
                    })()}
                </Box>
            </Box>
        </Box>
    );
};
