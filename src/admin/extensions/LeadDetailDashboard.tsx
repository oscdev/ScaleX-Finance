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

                // TRY 1: Content Manager API (Direct ID)
                addLog('Trying Content Manager Direct ID...');
                const cmRes = await fetch(`/content-manager/collection-types/api::lead.lead/${leadId}`, { headers });
                if (cmRes.ok) {
                    const data = await cmRes.json();
                    const obj = data.data || data;
                    if (obj && (obj.id || obj.documentId)) {
                        addLog('Success: Found via Content Manager');
                        setLead(obj);
                        if (obj.status) setStatus(obj.status);
                        return;
                    }
                }
                addLog(`CM Direct ID failed: ${cmRes.status}`);

                // TRY 2: Public API (Direct ID)
                addLog('Trying Public API Direct ID...');
                const publicRes = await fetch(`/api/leads/${leadId}?populate=*`);
                if (publicRes.ok) {
                    const data = await publicRes.json();
                    const obj = data.data?.attributes || data.data || data;
                    if (obj && (obj.id || obj.documentId)) {
                        addLog('Success: Found via Public API');
                        setLead(obj);
                        if (obj.status) setStatus(obj.status);
                        return;
                    }
                }
                addLog(`Public API failed: ${publicRes.status}`);

                // TRY 3: Search by ID (Filters)
                addLog('Trying Filtered Search...');
                const searchRes = await fetch(`/api/leads?filters[id][$eq]=${leadId}&populate=*`);
                if (searchRes.ok) {
                    const data = await searchRes.json();
                    const items = data.data || [];
                    if (items.length > 0) {
                        const obj = items[0].attributes || items[0];
                        addLog('Success: Found via Filtered Search');
                        setLead({ ...obj, id: items[0].id });
                        if (obj.status) setStatus(obj.status);
                        return;
                    }
                }
                addLog(`Filtered Search failed: ${searchRes.status}`);

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

                // TRY A: Direct ID fetch from Content Manager
                const res = await fetch(`/content-manager/collection-types/api::loan-application.loan-application/${leadId}?populate=*`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    const obj = data.data || data;
                    // console.log('[Dashboard] Successful Loan App direct fetch:', obj);
                    setLoanApp(obj);
                    return;
                }

                // TRY B: Search by Email or Phone matching the Lead
                if (lead && (lead.email || lead.mobileNumber)) {
                    // console.log('[Dashboard] Direct ID fetch failed, searching by Email/Phone...');
                    const searchQuery = `/api/loan-applications?filters[$or][0][email][$eq]=${lead.email}&filters[$or][1][phone][$eq]=${lead.mobileNumber}&populate=*`;
                    const searchRes = await fetch(searchQuery);
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        const found = searchData.data?.[0]?.attributes || searchData.data?.[0];
                        if (found) {
                            // console.log('[Dashboard] Found Loan App via Search:', found);
                            setLoanApp({ ...found, id: searchData.data[0].id });
                            return;
                        }
                    }
                }

                // TRY C: Public API fallback
                const pubRes = await fetch(`/api/loan-applications/${leadId}?populate=*`);
                if (pubRes.ok) {
                    const pubData = await pubRes.json();
                    const found = pubData.data?.attributes || pubData.data || pubData;
                    // console.log('[Dashboard] Found via Public API ID fallback:', found);
                    setLoanApp(found);
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
            alert('Please select a status');
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
                alert('Lead status and remarks updated successfully');
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
                alert(`Update failed: ${errorData.error?.message || 'Check console for errors'}`);
            }
        } catch (err: any) {
            alert(`Error updating lead: ${err.message}`);
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

    const currentStatusColor = LEAD_STATUS_OPTIONS.find(o => o.value === status)?.color || 'neutral';
    const currentStatusLabel = LEAD_STATUS_OPTIONS.find(o => o.value === status)?.label || status;

    return (
        <Box padding={6} background="neutral100" style={{ minHeight: '100vh' }}>
            {/* Header / Breadcrumbs */}
            <Flex gap={2} marginBottom={4}>
                <Typography variant="pi" textColor="neutral600">Dashboard</Typography>
                <span>/</span>
                <Typography variant="pi" textColor="neutral600">{lead.selectedProduct || 'Loan'}</Typography>
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
                    { label: 'Product', val: lead.selectedProduct || 'N/A', icon: '📄', bg: 'neutral200' },
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
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Lead Details</Typography>
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Loan Requirement', val: loanApp?.loanAmount ? `₹ ${loanApp.loanAmount.toLocaleString()}` : (lead.requiredAmount ? `₹ ${lead.requiredAmount.toLocaleString()}` : 'N/A') },
                            { label: 'Customer Full Name', val: lead.fullName || 'N/A' },
                            { label: 'Customer Mobile', val: lead.mobileNumber || 'N/A' },
                            { label: 'Customer Email', val: lead.email || 'N/A' },
                            { label: 'Aadhar Card', val: loanApp?.adharNumber || loanApp?.adhar_number || 'N/A' },
                            { label: 'Pan Card', val: loanApp?.panNumber || loanApp?.pan_number || 'N/A' },
                            { label: 'Pin Code', val: lead.pinCode || lead.pincode || 'N/A' },
                            {
                                label: 'Get Email Notifications?',
                                val: (loanApp?.emailNotifications === true || loanApp?.email_notifications === true || loanApp?.emailNotifications === 't') ? 'Yes' :
                                    (loanApp?.emailNotifications === false || loanApp?.email_notifications === false || loanApp?.emailNotifications === 'f') ? 'No' : 'N/A'
                            }
                        ].map((d, i) => (
                            <Box key={i} marginBottom={2}>
                                <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                            </Box>
                        ))}
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
                        {Array.isArray(lead.remarks) && lead.remarks.length > 0 ? (
                            <Flex direction="column" alignItems="stretch" gap={4}>
                                {lead.remarks.map((entry: any, index: number) => {
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
                        ) : (
                            <Box padding={8} textAlign="center">
                                <Typography variant="pi" textColor="neutral500">No conversation history available.</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>
            </div>

            {/* 1. Business Details */}
            <Box marginBottom={6}>
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">1. Business Details</Typography>
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Business Name', val: loanApp?.businessName || 'N/A' }
                        ].map((d, i) => (
                            <Box key={i}>
                                <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                            </Box>
                        ))}
                    </div>
                </Box>
            </Box>

            {/* 2. Client Details */}
            <Box marginBottom={6}>
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">2. Client Details</Typography>
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Applicant Name', val: loanApp?.applicantName || 'N/A' },
                            { label: 'Mobile Number', val: loanApp?.phone || lead.mobileNumber || 'N/A' },
                            { label: 'Email Address', val: loanApp?.email || lead.email || 'N/A' },
                            { label: 'Pan Card', val: loanApp?.panNumber || lead.panCard || 'N/A' },
                            { label: 'Aadhar Card', val: loanApp?.adharNumber || 'N/A' },
                            { label: 'Employment Type', val: lead.employmentType || 'N/A' },
                            { label: 'Monthly Income', val: lead.monthlyIncome ? `₹ ${lead.monthlyIncome.toLocaleString()}` : 'N/A' },
                            { label: 'Credit Score', val: lead.creditScore || 'N/A' },
                            { label: 'Pin Code', val: lead.pinCode || lead.pincode || 'N/A' }
                        ].map((d, i) => (
                            <Box key={i} marginBottom={2}>
                                <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                            </Box>
                        ))}
                    </div>
                </Box>
            </Box>

            {/* 3. Address */}
            <Box marginBottom={6}>
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">3. Address</Typography>
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'City', val: lead.city || 'N/A' },
                            { label: 'Pin Code', val: lead.pinCode || lead.pincode || 'N/A' }
                        ].map((d, i) => (
                            <Box key={i}>
                                <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                            </Box>
                        ))}
                    </div>
                </Box>
            </Box>

            {/* 4. Other Details */}
            <Box marginBottom={6}>
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">4. Other Details</Typography>
                <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Tenure', val: loanApp?.tenureMonths?.replace('Months_', '') ? `${loanApp.tenureMonths.replace('Months_', '')} Months` : 'N/A' },
                            { label: 'Has Collateral', val: loanApp?.hasCollateral ? 'Yes' : 'No' },
                            { label: 'Collateral Type', val: loanApp?.collateralType || 'N/A' },
                            { label: 'Collateral Value', val: loanApp?.collateralValue ? `₹ ${loanApp.collateralValue.toLocaleString()}` : 'N/A' },
                            { label: 'Existing Loans', val: lead.existingLoans ? `₹ ${lead.existingLoans.toLocaleString()}` : 'N/A' },
                            { label: 'Email Notifications', val: loanApp?.emailNotifications ? 'Enabled' : 'Disabled' }
                        ].map((d, i) => (
                            <Box key={i}>
                                <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                            </Box>
                        ))}
                    </div>
                </Box>
            </Box>

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
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Date</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">View</Typography></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const docs: any[] = [];
                                const addDocs = (list: any, type: string) => {
                                    if (!list) return;
                                    const array = Array.isArray(list) ? list : [list];
                                    array.forEach(d => {
                                        if (d && (d.url || d.attributes?.url)) {
                                            docs.push({ ...d, type });
                                        }
                                    });
                                };
                                addDocs(loanApp?.gstReturns, 'GST Returns');
                                addDocs(loanApp?.bankStatements, 'Bank Statements');
                                addDocs(loanApp?.itReturns, 'IT Returns');
                                addDocs(loanApp?.otherDocs, 'Other Document');

                                if (docs.length === 0) return <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>No documents uploaded.</td></tr>;

                                return docs.map((doc, idx) => {
                                    const fileUrl = doc.url || doc.attributes?.url;
                                    const fileName = doc.name || doc.attributes?.name || 'document';
                                    const fileExt = doc.ext || doc.attributes?.ext || '.pdf';
                                    const fileDate = doc.createdAt || doc.attributes?.createdAt || '';

                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f6f6f9' }}>
                                            <td style={{ padding: '12px' }}><Typography variant="pi">{doc.id}</Typography></td>
                                            <td style={{ padding: '12px' }}>
                                                {fileExt.includes('pdf') ? '📄' : '🖼️'}
                                            </td>
                                            <td style={{ padding: '12px' }}><Typography variant="pi">{doc.type}</Typography></td>
                                            <td style={{ padding: '12px' }}>
                                                <Typography variant="pi">{fileDate ? new Date(fileDate).toLocaleDateString() : 'N/A'}</Typography>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <a href={fileUrl} target="_blank" download={fileName} style={{ display: 'inline-flex', padding: '6px', background: '#4945ff', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
                                                    ⬇️
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </Box>
            </Box>

            {/* Journey Timeline */}
            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                <Typography variant="delta" fontWeight="bold" marginBottom={4} display="block">Process Journey</Typography>
                <Box paddingLeft={4} style={{ borderLeft: '2px solid #e2e8f0' }}>
                    <Box marginBottom={6} position="relative">
                        <Box position="absolute" left="-23px" top="0" width="12px" height="12px" background="primary600" borderRadius="50%" style={{ border: '2px solid white' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr' }}>
                            <Typography variant="pi" fontWeight="bold" textColor="primary600">
                                {lead.createdAt ? new Date(lead.createdAt).toLocaleString() : 'N/A'}
                            </Typography>
                            <Box>
                                <Typography variant="pi" fontWeight="bold" display="block">LEAD OBTAINED</Typography>
                                <Typography variant="pi" textColor="neutral600">System captured initial lead data</Typography>
                            </Box>
                        </div>
                    </Box>
                    <Box marginBottom={6} position="relative">
                        <Box position="absolute" left="-23px" top="0" width="12px" height="12px" background="primary600" borderRadius="50%" style={{ border: '2px solid white' }} />
                        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr' }}>
                            <Typography variant="pi" fontWeight="bold" textColor="primary600">
                                {lead.updatedAt ? new Date(lead.updatedAt).toLocaleString() : 'N/A'}
                            </Typography>
                            <Box>
                                <Typography variant="pi" fontWeight="bold" display="block">{currentStatusLabel}</Typography>
                                <Typography variant="pi" textColor="neutral600">Latest status update recorded</Typography>
                            </Box>
                        </div>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};
