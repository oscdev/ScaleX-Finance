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

                // TRY A: Direct ID fetch from Content Manager
                const res = await fetch(`/content-manager/collection-types/api::loan-application.loan-application/${leadId}?populate=*`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    const obj = data.data || data;
                    // console.log('[Dashboard] Successful Loan App direct fetch:', obj);
                    setLoanApp(obj);
                    return;
                }

                // TRY B: Search by leadId, Email or Phone matching the Lead
                if (lead) {
                    const lId = lead.id || lead.documentId;
                    const searchQuery = `/api/loan-applications?filters[$or][0][leadId][$eq]=${lId}&filters[$or][1][email][$eq]=${lead.email}&filters[$or][2][phone][$eq]=${lead.mobileNumber}&populate=*`;
                    const searchRes = await fetch(searchQuery);
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        const found = searchData.data?.[0]?.attributes || searchData.data?.[0];
                        if (found) {
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
                            { label: 'Aadhar Card', val: loanApp?.aadharNumber || loanApp?.adharNumber || loanApp?.aadhar_number || lead.aadharCard || lead.adharCard || 'N/A' },
                            { label: 'Pan Card', val: loanApp?.panNumber || loanApp?.pan_number || lead.panCard || 'N/A' },
                            { label: 'Pin Code', val: lead.pinCode || lead.pincode || 'N/A' },
                            { label: 'Employment Type', val: lead.employmentType || lead.occupation || 'N/A' },
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

            {/* Step-wise Application Details */}
            {loanApp ? (
                <>
                    {/* 1. Business Info (If Business Loan) */}
                    {(lead.selectedProduct === 'Business Loan' || loanApp.loanType === 'Business Loan') && (
                        <Box marginBottom={6}>
                            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Step 1: Business Details</Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    {[
                                        { label: 'Business Name', val: loanApp.businessDetails?.name || loanApp.businessName || 'N/A' },
                                        { label: 'Premises', val: loanApp.businessDetails?.premises || 'N/A' },
                                        { label: 'Type', val: loanApp.businessDetails?.type || 'N/A' },
                                        { label: 'Turnover', val: loanApp.businessDetails?.turnover || 'N/A' },
                                        { label: 'Age', val: loanApp.businessDetails?.age || 'N/A' },
                                        { label: 'Reg Proof', val: loanApp.businessDetails?.regProof || 'N/A' }
                                    ].map((d, i) => (
                                        <Box key={i}>
                                            <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                            <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                        </Box>
                                    ))}
                                </div>
                                <Box marginTop={4}>
                                    <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">Business Address</Typography>
                                    <Typography variant="pi" textColor="neutral800">{loanApp.businessDetails?.address || 'N/A'}</Typography>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* 2. Personal Info */}
                    <Box marginBottom={6}>
                        <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Step: Personal Details</Typography>
                        <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                {[
                                    { label: 'Full Name', val: loanApp.personalDetails?.name || loanApp.applicantName || lead.fullName || 'N/A' },
                                    { label: 'DOB', val: loanApp.personalDetails?.dob || 'N/A' },
                                    { label: 'Marital Status', val: loanApp.personalDetails?.maritalStatus || 'N/A' },
                                    { label: 'Mother Name', val: loanApp.personalDetails?.motherName || 'N/A' },
                                    { label: 'Spouse Name', val: loanApp.personalDetails?.spouseName || 'N/A' },
                                    { label: 'Alternate Phone', val: loanApp.personalDetails?.alternateNumber || 'N/A' },
                                    { label: 'Dependents', val: loanApp.personalDetails?.dependents || 'N/A' }
                                ].map((d, i) => (
                                    <Box key={i}>
                                        <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                        <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                    </Box>
                                ))}
                            </div>
                        </Box>
                    </Box>

                    {/* 3. Address Info */}
                    <Box marginBottom={6}>
                        <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Step: Address Details</Typography>
                        <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '16px' }}>
                                <Typography variant="pi"><span style={{ fontWeight: 600 }}>Line 1:</span> {loanApp.addressDetails?.line1 || 'N/A'}</Typography>
                                <Typography variant="pi"><span style={{ fontWeight: 600 }}>Line 2:</span> {loanApp.addressDetails?.line2 || 'N/A'}</Typography>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                {[
                                    { label: 'City', val: loanApp.addressDetails?.city || lead.city || 'N/A' },
                                    { label: 'District', val: loanApp.addressDetails?.district || 'N/A' },
                                    { label: 'State', val: loanApp.addressDetails?.state || 'N/A' },
                                    { label: 'Pincode', val: lead.pincode || lead.pinCode || 'N/A' },
                                    { label: 'Residence Type', val: loanApp.addressDetails?.residenceType || 'N/A' }
                                ].map((d, i) => (
                                    <Box key={i}>
                                        <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                        <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                    </Box>
                                ))}
                            </div>
                        </Box>
                    </Box>

                    {/* 4. Property (For LAP/Home Loan) */}
                    {(lead.selectedProduct === 'LAP' || lead.selectedProduct === 'Home Loan') && (
                        <Box marginBottom={6}>
                            <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Step: Property Details</Typography>
                            <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                    {[
                                        { label: 'Property Type', val: loanApp.propertyDetails?.type || 'N/A' },
                                        { label: 'Current Status', val: loanApp.propertyDetails?.status || 'N/A' },
                                        { label: 'Value', val: loanApp.propertyDetails?.value || 'N/A' },
                                        { label: 'Property Pincode', val: loanApp.addressDetails?.propertyAddressPincode || 'N/A' }
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

                    {/* 5. Income Info */}
                    <Box marginBottom={6}>
                        <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Step: Income Details</Typography>
                        <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                                {[
                                    { label: 'Company', val: loanApp.incomeDetails?.companyName || 'N/A' },
                                    { label: 'Designation', val: loanApp.incomeDetails?.designation || 'N/A' },
                                    { label: 'Salary (Net)', val: loanApp.incomeDetails?.netSalary ? `₹ ${loanApp.incomeDetails.netSalary.toLocaleString()}` : 'N/A' },
                                    { label: 'Salary Mode', val: loanApp.incomeDetails?.salaryMode || 'N/A' },
                                    { label: 'Job Stability', val: loanApp.incomeDetails?.jobStability || 'N/A' }
                                ].map((d, i) => (
                                    <Box key={i}>
                                        <Typography variant="pi" textColor="neutral600" display="block" fontWeight="bold">{d.label}</Typography>
                                        <Typography variant="pi" textColor="neutral800">{d.val}</Typography>
                                    </Box>
                                ))}
                            </div>
                        </Box>
                    </Box>

                    {/* 6. Running Loans */}
                    <Box marginBottom={6}>
                        <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Step: Running Loans</Typography>
                        <Box background="neutral0" padding={4} shadow="filterShadow" borderRadius="8px">
                            {loanApp.otherDetails?.runningLoans?.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#f6f6f9', textAlign: 'left' }}>
                                            <th style={{ padding: '8px' }}>Type</th>
                                            <th style={{ padding: '8px' }}>Bank</th>
                                            <th style={{ padding: '8px' }}>Amount</th>
                                            <th style={{ padding: '8px' }}>EMI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loanApp.otherDetails.runningLoans.map((l: any, i: number) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f1f1f1' }}>
                                                <td style={{ padding: '8px' }}>{l.type}</td>
                                                <td style={{ padding: '8px' }}>{l.bank}</td>
                                                <td style={{ padding: '8px' }}>{l.amount}</td>
                                                <td style={{ padding: '8px' }}>{l.emi}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <Typography variant="pi" textColor="neutral600">No running loans reported.</Typography>
                            )}
                        </Box>
                    </Box>
                </>
            ) : (
                <Box padding={8} background="neutral0" shadow="filterShadow" borderRadius="8px" marginBottom={6} textAlign="center">
                    <Typography variant="pi" textColor="neutral600">Application not fully submitted yet. Only Lead details available.</Typography>
                </Box>
            )}

            {/* Document Details Table */}
            <Box marginBottom={6}>
                <Typography variant="delta" fontWeight="bold" textColor="primary600" marginBottom={2} display="block">Step: Document Details</Typography>
                <Box background="neutral0" shadow="filterShadow" borderRadius="8px" overflow="hidden">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f6f6f9', textAlign: 'left', borderBottom: '1px solid #dcdce4' }}>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Document Name</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Type</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Password</Typography></th>
                                <th style={{ padding: '12px' }}><Typography variant="pi" fontWeight="bold">Action</Typography></th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const docs: any[] = [];
                                if (loanApp?.documents) {
                                    const dMap = loanApp.documents;
                                    const pdfPw = dMap.pdfPasswords || {};

                                    const addDoc = (val: any, label: string) => {
                                        if (!val) return;
                                        const items = Array.isArray(val) ? val : [val];
                                        items.forEach((id: any) => {
                                            docs.push({ id, label, pw: pdfPw[label] || 'N/A' });
                                        });
                                    };

                                    addDoc(dMap.proprietorshipDoc, 'Proprietorship');
                                    addDoc(dMap.panCard, 'Applicant PAN');
                                    addDoc(dMap.aadharCardFront, 'Aadhar Front');
                                    addDoc(dMap.aadharCardBack, 'Aadhar Back');
                                    addDoc(dMap.bankStatement, 'Bank Statement');
                                    addDoc(dMap.salarySlips, 'Salary Slips');
                                    addDoc(dMap.coAppPan, 'Co-App PAN');
                                    addDoc(dMap.otherDocs, 'Other Docs');
                                }

                                if (docs.length === 0) return <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>No documents uploaded.</td></tr>;

                                return docs.map((doc, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f6f6f9' }}>
                                        <td style={{ padding: '12px' }}><Typography variant="pi">{doc.label}</Typography></td>
                                        <td style={{ padding: '12px' }}><Typography variant="pi">{(doc.label === 'Applicant PAN' || doc.label === 'Aadhar Front') ? 'Identity' : 'Supporting'}</Typography></td>
                                        <td style={{ padding: '12px' }}><Typography variant="pi" textColor="danger600">{doc.pw}</Typography></td>
                                        <td style={{ padding: '12px' }}>
                                            <Typography variant="pi">ID: {doc.id}</Typography>
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
                <Typography variant="delta" fontWeight="bold" marginBottom={4} display="block">Process Journey (Audit Trail)</Typography>
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

                    {/* History Entries */}
                    {Array.isArray(lead.remarks) && lead.remarks.map((entry: any, i: number) => (
                        <Box key={i} marginBottom={6} position="relative">
                            <Box position="absolute" left="-23px" top="0" width="14px" height="14px" background="success600" borderRadius="50%" style={{ border: '3px solid white' }} />
                            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr' }}>
                                <Typography variant="pi" fontWeight="bold" textColor="success700">
                                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}
                                </Typography>
                                <Box>
                                    <Typography variant="pi" fontWeight="bold" display="block">STATUS UPDATE: {entry.status}</Typography>
                                    <Typography variant="pi" textColor="neutral800" fontWeight="bold" display="block" marginTop={1}>{entry.text}</Typography>
                                    <Typography variant="pi" textColor="neutral500">Author: {entry.author || 'N/A'}</Typography>
                                </Box>
                            </div>
                        </Box>
                    ))}
                </Box>
            </Box>
        </Box>
    );
};
