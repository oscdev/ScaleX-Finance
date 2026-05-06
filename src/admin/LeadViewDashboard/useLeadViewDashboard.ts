import { useState, useEffect, MouseEvent as ReactMouseEvent } from 'react';

export const LEAD_STATUS_OPTIONS = [
    { label: '1 - NEW', value: 'NEW', color: 'primary' },
    { label: '2 - UNDER-PROCESS', value: 'UNDER_PROCESS', color: 'secondary' },
    { label: '3 - APPROVED', value: 'APPROVED', color: 'success' },
    { label: '4 - REJECTED', value: 'REJECTED', color: 'danger' },
    { label: '5 - DISBURSED', value: 'DISBURSED', color: 'warning' },
];

export const PRODUCT_CONFIG: Record<string, { leadFields: any[] }> = {
    'Personal Loan': {
        leadFields: [
            { label: 'Loan Requirement', key: 'requiredAmount', type: 'currency' },
            { label: 'Full Name', key: 'fullName' },
            { label: 'Mobile Number', key: 'mobileNumber' },
            { label: 'Email', key: 'email' },
            { label: 'Aadhar Card', key: 'aadharCard' },
            { label: 'Pan Card', key: 'panCard' },
            { label: 'Pin Code', key: 'pinCode' },
        ],
    },
    'Business Loan': {
        leadFields: [
            { label: 'Loan Requirement', key: 'requiredAmount', type: 'currency' },
            { label: 'Full Name', key: 'fullName' },
            { label: 'Mobile Number', key: 'mobileNumber' },
            { label: 'Email', key: 'email' },
            { label: 'Aadhar Card', key: 'aadharCard' },
            { label: 'Pan Card', key: 'panCard' },
            { label: 'Pin Code', key: 'pinCode' },
        ],
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
            { label: 'Employment Type', key: 'employmentType' },
        ],
    },
    LAP: {
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
            { label: 'Employment Type', key: 'employmentType' },
        ],
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
            { label: 'Employment Type', key: 'employmentType' },
        ],
    },
};

export const DOC_LABELS: Record<string, string> = {
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
    businessRegProofDoc: 'Business Reg Proof',
};

export interface DocumentEntry {
    id: any;
    label: string;
    type: string;
    ext: string;
    url: string | null;
    pw: string;
    date: string;
}

export const buildDocuments = (loanApp: any): DocumentEntry[] => {
    if (!loanApp) return [];
    const docs: DocumentEntry[] = [];
    const pdfPw = loanApp.form_data?.pdfPasswords || {};
    let salaryCounter = 1;
    let otherCounter = 1;

    const addDoc = (val: any, label: string) => {
        if (!val) return;
        const rawItems = val.data !== undefined ? val.data : val;
        if (!rawItems) return;

        const items = Array.isArray(rawItems) ? rawItems : [rawItems];

        items.forEach((item: any) => {
            if (!item) return;
            const attr = item.attributes || item;
            const fileId =
                item.id ||
                (typeof item === 'number' || typeof item === 'string' ? item : null);
            const fileName = attr.name || label;
            const fileUrl = attr.url || null;
            const fileExt = attr.ext
                ? attr.ext.replace('.', '').toUpperCase()
                : fileName.split('.').pop()?.toUpperCase() || 'UNKNOWN';
            const fileDate = attr.createdAt
                ? new Date(attr.createdAt).toISOString().replace('T', ' ').substring(0, 19)
                : new Date().toISOString().replace('T', ' ').substring(0, 19);

            let displayType = DOC_LABELS[label] || label;
            if (label === 'salarySlips') displayType = `Salary Slip ${salaryCounter++}`;
            if (label === 'otherDocs') displayType = `Other Document ${otherCounter++}`;

            if (fileId) {
                docs.push({
                    id: fileId,
                    label,
                    type: displayType,
                    ext: fileExt.length > 4 ? fileExt.substring(0, 3) : fileExt,
                    url: fileUrl,
                    pw: pdfPw[label] || '',
                    date: fileDate,
                });
            }
        });
    };

    Object.keys(DOC_LABELS).forEach((key) => addDoc(loanApp[key], key));
    return docs;
};

export const handleDocView = (e: ReactMouseEvent, url: string | null, pw: string) => {
    e.preventDefault();
    if (!url) return;
    const fullUrl = url.startsWith('http')
        ? url
        : `${
              window.location.host === '127.0.0.1:1337' || window.location.port === '1337'
                  ? 'http://localhost:1337'
                  : window.location.origin
          }${url}`;

    if (pw && pw.trim() !== '') {
        const input = window.prompt(
            'This document is password protected. Please enter the password:'
        );
        if (input === pw) {
            window.open(fullUrl, '_blank');
        }
    } else {
        window.open(fullUrl, '_blank');
    }
};

export const getAppSteps = (loanType: string, occupation: string) => {
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

const getToken = () => {
    if (typeof window === 'undefined') return '';
    try {
        // 1. Priority: Globally captured token from fetch interceptor
        const captured = (window as any)._strapi_last_token;
        if (captured && typeof captured === 'string') {
            return captured.replace('Bearer ', '').trim();
        }

        // 2. Standard Strapi keys
        const sessionT = window.sessionStorage.getItem('jwtToken');
        const localT = window.localStorage.getItem('jwtToken');
        if (sessionT || localT) return (sessionT || localT || '')?.replace(/"/g, '');

        // 3. Fallback: Scan storage for JWT prefix 'ey'
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key) {
                const val = window.localStorage.getItem(key);
                if (val && (val.startsWith('ey') || (val.startsWith('"ey') && val.endsWith('"')))) {
                    return val.replace(/^"|"$/g, '');
                }
            }
        }
        for (let i = 0; i < window.sessionStorage.length; i++) {
            const key = window.sessionStorage.key(i);
            if (key) {
                const val = window.sessionStorage.getItem(key);
                if (val && (val.startsWith('ey') || (val.startsWith('"ey') && val.endsWith('"')))) {
                    return val.replace(/^"|"$/g, '');
                }
            }
        }
    } catch (e) {}
    return '';
};

const authHeaders = (): Record<string, string> => {
    const token = getToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const useLeadViewDashboard = (leadId: string) => {
    const [lead, setLead] = useState<any>(null);
    const [loanApp, setLoanApp] = useState<any>(null);
    const [advisor, setAdvisor] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [newRemark, setNewRemark] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [errorLogs, setErrorLogs] = useState<string[]>([]);

    // 1. Fetch Lead
    useEffect(() => {
        const fetchData = async () => {
            const logs: string[] = [];
            const addLog = (msg: string) => {
                logs.push(msg);
                setErrorLogs([...logs]);
            };

            addLog(`Starting fetch for Lead ID: ${leadId}`);
            setIsLoading(true);

            try {
                const headers = authHeaders();
                const idNum = parseInt(leadId);
                const isNumeric = !isNaN(idNum) && /^\d+$/.test(leadId);

                // Helper to try fetching by ID or searching by ID filter
                const fetchWithFallback = async (uid: string, id: string) => {
                    const isIdNumeric = !isNaN(parseInt(id)) && /^\d+$/.test(id);

                    // 1. Try direct fetch from Content Manager ONLY if it's NOT numeric (likely a Document ID)
                    if (!isIdNumeric) {
                        try {
                            const res = await fetch(`/content-manager/collection-types/${uid}/${id}`, { headers });
                            if (res.ok) {
                                const json = await res.json();
                                // Strapi v5 CM wraps single-record responses in { data: {...} }
                                return json?.data ?? json;
                            }
                        } catch (e) {}
                    }

                    // 2. Fallback: Search Content Manager list (works for numerical IDs in Strapi 5)
                    try {
                        // In Strapi 5 CM, filters usually follow this structure
                        const searchRes = await fetch(
                            `/content-manager/collection-types/${uid}?pageSize=10&page=1&filters[id][$eq]=${id}`,
                            { headers }
                        );
                        if (searchRes.ok) {
                            const searchData = await searchRes.json();
                            const results = searchData.results || searchData.data || [];
                            if (results.length > 0) return results[0];
                        }
                    } catch (e) {}

                    // 3. Last resort: Try simple query param (some versions of Strapi CM support this)
                    try {
                        const qRes = await fetch(`/content-manager/collection-types/${uid}?id=${id}`, { headers });
                        if (qRes.ok) {
                            const qData = await qRes.json();
                            const results = qData.results || qData.data || [];
                            if (results.length > 0) return results[0];
                        }
                    } catch (e) {}

                    return null;
                };

                addLog('Searching for Lead...');
                const leadObj = await fetchWithFallback('api::lead.lead', leadId);
                if (leadObj) {
                    addLog('Found Lead.');
                    setLead({ ...leadObj, id: leadObj.id || leadId });
                    if (leadObj.leadStatus) setStatus(leadObj.leadStatus);
                    setIsLoading(false);
                    return;
                }

                addLog('Searching for Loan Application...');
                const loanObj = await fetchWithFallback('api::loan-application.loan-application', leadId);
                if (loanObj) {
                    addLog('Found Loan App.');
                    setLoanApp({ ...loanObj });
                    
                    const parentId = loanObj.leadId || (loanObj.lead && (loanObj.lead.id || loanObj.lead.documentId));
                    if (parentId) {
                        addLog(`Fetching parent Lead (ID: ${parentId})...`);
                        const pLeadObj = await fetchWithFallback('api::lead.lead', String(parentId));
                        if (pLeadObj) {
                            setLead({ ...pLeadObj, id: pLeadObj.id || parentId });
                            if (pLeadObj.leadStatus) setStatus(pLeadObj.leadStatus);
                            setIsLoading(false);
                            return;
                        }
                    } else {
                        addLog('Found Loan App but no parent lead reference.');
                        setLead({
                            fullName: loanObj.applicantName || loanObj.fullName || 'N/A',
                            id: 'N/A',
                            selectedProduct: loanObj.loanType
                        });
                        setIsLoading(false);
                        return;
                    }
                } else {
                    addLog('Record not found in Leads or Loan Applications.');
                }
            } catch (err: any) {
                addLog(`Initial fetch error: ${err.message}`);
            }

            // Final fallback to public API if content-manager fails
            if (!lead && !loanApp) {
                try {
                    addLog('Falling back to Filtered Search...');
                    const searchRes = await fetch(
                        `/api/leads?filters[id][$eq]=${leadId}&populate=*`
                    );
                    if (searchRes.ok) {
                        const data = await searchRes.json();
                        const items = data.data || [];
                        if (items.length > 0) {
                            const obj = items[0].attributes || items[0];
                            addLog('Found via Public Filtered Search');
                            setLead({ ...obj, id: items[0].id });
                            if (obj.leadStatus) setStatus(obj.leadStatus);
                        }
                    }
                } catch (err: any) {
                    addLog(`Fallback error: ${err.message}`);
                }
            }

            setIsLoading(false);
        };

        if (leadId) fetchData();
    }, [leadId]);

    // 2. Fetch Loan Application separately once Lead is found
    useEffect(() => {
        const fetchLoan = async () => {
            if (!leadId || !lead) return;
            try {
                const headers = authHeaders();

                // lead.id may be a numeric integer OR a documentId string depending on how the
                // lead was fetched (Strapi v5 CM single-record returns {data:{...}} which
                // fetchWithFallback might not unwrap). Extract only the actual numeric ID.
                const rawId = lead?.id ?? null;
                const numericLId =
                    (rawId !== null && /^\d+$/.test(String(rawId)) ? parseInt(String(rawId)) : null) ||
                    (!isNaN(parseInt(leadId)) && /^\d+$/.test(leadId) ? parseInt(leadId) : null);

                // 1. Public API filter by numeric leadId field
                if (numericLId) {
                    const pubRes = await fetch(
                        `/api/loan-applications?filters[leadId][$eq]=${numericLId}&populate=*`
                    );
                    if (pubRes.ok) {
                        const pubData = await pubRes.json();
                        const items = pubData.data || [];
                        if (items.length > 0) {
                            const found = items[0].attributes || items[0];
                            setLoanApp({ ...found, id: items[0].id });
                            return;
                        }
                    }
                }

                // 2. CM search by leadId (numeric) and optionally by email/phone.
                // NOTE: we intentionally skip the direct /loan-application/${leadId} fetch because
                // leadId here is the LEAD's documentId — it is not a loan-application documentId.
                // Only include email/phone filters when those fields are actually populated.
                const orFilters: string[] = [];
                if (numericLId) orFilters.push(`filters[$or][0][leadId][$eq]=${numericLId}`);
                if (lead.email) orFilters.push(`filters[$or][1][email][$eq]=${encodeURIComponent(lead.email)}`);
                if (lead.mobileNumber) orFilters.push(`filters[$or][2][phone][$eq]=${encodeURIComponent(lead.mobileNumber)}`);

                if (orFilters.length > 0) {
                    const cmSearchQuery = `/content-manager/collection-types/api::loan-application.loan-application?${orFilters.join('&')}&populate=*`;
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
                // swallow
            }
        };
        if (lead) fetchLoan();
    }, [leadId, lead]);

    // 3. Fetch Advisor details
    useEffect(() => {
        const fetchAdvisor = async () => {
            if (!lead?.advisorReferralId) return;
            try {
                const res = await fetch(
                    `/api/advisors?filters[id][$eq]=${lead.advisorReferralId}`
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.data?.length > 0) {
                        const adv = data.data[0].attributes || data.data[0];
                        setAdvisor(adv);
                    }
                }
            } catch (e) {
                // swallow
            }
        };
        if (lead) fetchAdvisor();
    }, [lead]);

    // 4. Fetch logged-in admin user info
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const res = await fetch('/admin/users/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data.data || data);
                }
            } catch (e) {
                // swallow
            }
        };
        fetchMe();
    }, []);

    const handleUpdateStatus = async () => {
        if (!status) return;

        setIsUpdating(true);
        try {
            const currentRemarks = Array.isArray(lead.remarks) ? lead.remarks : [];

            let authorName = 'System';
            if (currentUser) {
                const roleName =
                    Array.isArray(currentUser.roles) && currentUser.roles.length > 0
                        ? currentUser.roles[0].name
                        : 'Admin';
                authorName = `${currentUser.firstname} ${currentUser.lastname || ''} (${roleName})`;
            }

            const newEntry = {
                text: newRemark || `Status changed to ${status}`,
                status: status,
                timestamp: new Date().toISOString(),
                author: authorName.trim(),
            };

            const updatedRemarks = [...currentRemarks, newEntry];

            const cleanStatus = status.trim();
            const payload = {
                data: {
                    leadStatus: cleanStatus,
                    remarks: updatedRemarks,
                },
            };

            console.log('[Dashboard] Updating lead via Public API with payload:', payload);

            const res = await fetch(`/api/leads/${lead.documentId || leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setNewRemark('');

                const refreshRes = await fetch(
                    `/content-manager/collection-types/api::lead.lead/${lead.documentId || lead.id || leadId}`,
                    { headers: authHeaders() }
                );
                if (refreshRes.ok) {
                    const freshData = await refreshRes.json();
                    setLead(freshData.data || freshData);
                }
            } else {
                const errorData = await res.json();
                console.error(
                    '[Dashboard] Update failed with details:',
                    JSON.stringify(errorData, null, 2)
                );
            }
        } catch (err: any) {
            // swallow
        } finally {
            setIsUpdating(false);
        }
    };

    return {
        lead,
        loanApp,
        advisor,
        isLoading,
        status,
        setStatus,
        newRemark,
        setNewRemark,
        isUpdating,
        currentUser,
        errorLogs,
        handleUpdateStatus,
    };
};
