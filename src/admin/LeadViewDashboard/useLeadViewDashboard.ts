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

    // Build a lookup from form_data.documents by doc name (handles old display-name keyed records)
    const pwByDocName: Record<string, string> = {};
    (loanApp.form_data?.documents || []).forEach((d: any) => {
        if (d.name && d.password && d.password !== 'No') pwByDocName[d.name] = d.password;
    });

    // Known field keys and display names — used to detect user-defined otherDocs names
    const knownPwKeys = new Set([...Object.keys(DOC_LABELS), ...Object.values(DOC_LABELS)]);

    const findPw = (label: string): string => {
        // 1. New format: stored by field key (e.g. "panCard")
        if (pdfPw[label]) return pdfPw[label];
        // 2. Old format: stored by standard display name (e.g. "Pan Card")
        const stdName = DOC_LABELS[label] || label;
        if (pdfPw[stdName]) return pdfPw[stdName];
        // 3. Fallback: match against form_data.documents by standard display name
        if (pwByDocName[stdName]) return pwByDocName[stdName];
        // 4. otherDocs: scan pdfPw for any user-defined key (non-standard)
        if (label === 'otherDocs') {
            const unknownKey = Object.keys(pdfPw).find(k => !knownPwKeys.has(k) && pdfPw[k]);
            if (unknownKey) return pdfPw[unknownKey];
        }
        return '';
    };

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
                    pw: findPw(label),
                    date: fileDate,
                });
            }
        });
    };

    Object.keys(DOC_LABELS).forEach((key) => addDoc(loanApp[key], key));
    return docs;
};

export const openDocWithPasswordCheck = (url: string | null, pw: string) => {
    if (!url) return;
    const fullUrl = url.startsWith('http')
        ? url
        : `${
              window.location.host === '127.0.0.1:1337' || window.location.port === '1337'
                  ? 'http://localhost:1337'
                  : window.location.origin
          }${url}`;

    if (!pw || pw.trim() === '') {
        window.open(fullUrl, '_blank');
        return;
    }

    // Build a lightweight inline modal for password verification
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;
        align-items:center;justify-content:center;z-index:99999;
        backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background:#fff;border-radius:12px;padding:28px 28px 22px;width:360px;max-width:90vw;
        box-shadow:0 20px 60px rgba(0,0,0,0.25);font-family:sans-serif;
    `;
    modal.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <span style="font-size:22px;">🔒</span>
            <strong style="font-size:15px;color:#111827;">Password Required</strong>
        </div>
        <p style="font-size:13px;color:#374151;margin:0 0 14px;line-height:1.5;">
            This document is password protected.<br/>Enter the password to open it.
        </p>
        <input id="doc-pw-input" type="password" placeholder="Enter document password"
            style="width:100%;box-sizing:border-box;padding:8px 10px;font-size:13px;
                   border:1.5px solid #d1d5db;border-radius:6px;outline:none;margin-bottom:6px;"/>
        <p id="doc-pw-error" style="color:#ef4444;font-size:12px;margin:0 0 12px;min-height:16px;"></p>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
            <button id="doc-pw-cancel"
                style="padding:7px 16px;border:1px solid #d1d5db;background:#f9fafb;border-radius:6px;
                       cursor:pointer;font-size:13px;">Cancel</button>
            <button id="doc-pw-open"
                style="padding:7px 18px;background:#4945ff;color:#fff;border:none;border-radius:6px;
                       cursor:pointer;font-size:13px;font-weight:600;">Open Document</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = modal.querySelector('#doc-pw-input') as HTMLInputElement;
    const errorEl = modal.querySelector('#doc-pw-error') as HTMLElement;
    const cancelBtn = modal.querySelector('#doc-pw-cancel') as HTMLButtonElement;
    const openBtn = modal.querySelector('#doc-pw-open') as HTMLButtonElement;

    setTimeout(() => input?.focus(), 50);

    const close = () => document.body.removeChild(overlay);

    const verify = () => {
        if (input.value === pw) {
            close();
            window.open(fullUrl, '_blank');
        } else {
            errorEl.textContent = 'Incorrect password. Please try again.';
            input.style.borderColor = '#ef4444';
            input.value = '';
            setTimeout(() => input?.focus(), 50);
        }
    };

    cancelBtn.addEventListener('click', close);
    openBtn.addEventListener('click', verify);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') verify(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
};

export const handleDocView = (e: ReactMouseEvent, url: string | null, pw: string) => {
    e.preventDefault();
    openDocWithPasswordCheck(url, pw);
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

export const getToken = () => {
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

export type SectionPerms = Record<string, { add: boolean; view: boolean; edit: boolean; delete: boolean; fields?: Record<string, { view: boolean; edit: boolean }> }>;

const allSectionsAllowed = (): SectionPerms => {
    const full = { add: true, edit: true, view: true, delete: true };
    return {
        personalInfo:     full,
        personalDetails:  full,
        addressDetails:   full,
        propertyDetails:  full,
        incomeDetails:    full,
        businessInfo:     full,
        runningLoans:     full,
        documentDetails:  full,
        assignmentStatus: full,
    };
};

export const useLeadViewDashboard = (leadId: string) => {
    const [lead, setLead] = useState<any>(null);
    const [loanApp, setLoanApp] = useState<any>(null);
    const [advisor, setAdvisor] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [status, setStatus] = useState('');
    const [newRemark, setNewRemark] = useState('');
    const [newBankerRemark, setNewBankerRemark] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [errorLogs, setErrorLogs] = useState<string[]>([]);
    const [parentAdvisorIdVal, setParentAdvisorIdVal] = useState('');
    const [isSavingParentId, setIsSavingParentId] = useState(false);
    const [parentAdvisor, setParentAdvisor] = useState<any>(null);
    const [remarks, setRemarks] = useState<any[]>([]);
    const [bankerRemarks, setBankerRemarks] = useState<any[]>([]);
    const [statusHistory, setStatusHistory] = useState<any[]>([]);
    const [sectionPerms, setSectionPerms] = useState<SectionPerms>(allSectionsAllowed());

    // Staff / Banker assignment
    const [staffList, setStaffList] = useState<any[]>([]);
    const [bankerList, setBankerList] = useState<any[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
    const [selectedBankerId, setSelectedBankerId] = useState<number | null>(null);

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

    // 3a. Sync parentAdvisorId input from fetched lead
    useEffect(() => {
        setParentAdvisorIdVal(lead?.parentAdvisorId || '');
    }, [lead?.parentAdvisorId]);

    // 3b-extra. Sync staff/banker from loanApp once loaded
    useEffect(() => {
        if (!loanApp) return;
        setSelectedStaffId(loanApp.assignedStaffId ?? null);
        setSelectedBankerId(loanApp.assignedBankerId ?? null);
    }, [loanApp?.assignedStaffId, loanApp?.assignedBankerId]);

    // Fetch staff and bankers for this lead's product via a server-side route
    // accessible to all authenticated roles (not just admins).
    useEffect(() => {
        if (!lead) return;
        const fetchProductUsers = async () => {
            try {
                const token = getToken();
                if (!token) return;

                const product: string = lead.selectedProduct || loanApp?.loanType || '';
                if (!product) return;

                const res = await fetch(
                    `/admin/product-users?product=${encodeURIComponent(product)}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (!res.ok) return;

                const data = await res.json();
                setStaffList(data.staff || []);
                setBankerList(data.bankers || []);
            } catch (e) {}
        };
        fetchProductUsers();
    }, [lead?.selectedProduct, loanApp?.loanType]);

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

    // 3b. Fetch Parent Advisor details by advisorId field (e.g. "ADV47")
    useEffect(() => {
        const fetchParentAdvisor = async () => {
            if (!lead?.parentAdvisorId) return;
            try {
                const res = await fetch(
                    `/api/advisors?filters[id][$eq]=${encodeURIComponent(lead.parentAdvisorId)}`
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.data?.length > 0) {
                        setParentAdvisor(data.data[0].attributes || data.data[0]);
                    } else {
                        setParentAdvisor(null);
                    }
                }
            } catch (e) {
                // swallow
            }
        };
        fetchParentAdvisor();
    }, [lead?.parentAdvisorId]);

    // 4. Fetch logged-in admin user info + section permissions for their role
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const token = getToken();
                if (!token) return;
                const res = await fetch('/admin/users/me', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const user = data.data || data;
                setCurrentUser(user);

                const roles: any[] = user.roles || [];
                // Super Admins always get full access — skip permission fetch
                if (roles.some((r: any) => r.code === 'strapi-super-admin')) return;

                const roleId = roles[0]?.id;
                if (!roleId) return;

                // Use public REST API — no CM access needed, works for all admin roles
                // Fetch all records and filter client-side to avoid Strapi v5 filter syntax issues
                const denied: SectionPerms = {} as SectionPerms;
                const denyAll = () => {
                    Object.keys(allSectionsAllowed()).forEach((k) => {
                        denied[k] = { add: false, view: false, edit: false, delete: false };
                    });
                    setSectionPerms(denied);
                };
                const permRes = await fetch('/api/loan-app-section-permissions?pagination[pageSize]=100');
                if (!permRes.ok) { denyAll(); return; }
                const permData = await permRes.json();
                // Strapi v5 public API returns { data: [...] }
                const allRecords: any[] = permData.data || [];
                const record = allRecords.find((r: any) => Number(r.roleId) === roleId);
                if (record && record.permissions) {
                    setSectionPerms({ ...allSectionsAllowed(), ...record.permissions });
                } else {
                    denyAll();
                }
            } catch (e) {
                // swallow
            }
        };
        fetchMe();
    }, []);

    // Helper: resolve numeric lead id from lead object or leadId string
    const resolveNumericId = () => {
        const rawId = lead?.id ?? null;
        return (
            (rawId !== null && /^\d+$/.test(String(rawId)) ? parseInt(String(rawId)) : null) ||
            (!isNaN(parseInt(leadId)) && /^\d+$/.test(leadId) ? parseInt(leadId) : null)
        );
    };

    // Helper: fetch the single remark row for this lead via public API
    const fetchRemarkRow = async (numericId: number) => {
        const res = await fetch(
            `/api/lead-remarks?filters[leadId][$eq]=${numericId}&pagination[pageSize]=1`
        );
        if (!res.ok) return null;
        const data = await res.json();
        // Strapi v5 public API: flat objects inside data[]
        const row = (data.data || [])[0];
        return row || null;
    };

    // 5a. Load status history from activity log
    useEffect(() => {
        const loadStatusHistory = async () => {
            const numericId = resolveNumericId();
            if (!numericId) return;
            try {
                const res = await fetch(
                    `/api/activity-logs?filters[action][$eq]=LEAD_STATUS_CHANGED&sort=createdAt:asc&pagination[pageSize]=200`
                );
                if (!res.ok) return;
                const data = await res.json();
                const entries = (data.data || []).filter(
                    (e: any) => e.metadata?.leadId === numericId
                );
                setStatusHistory(entries);
            } catch (e) {
                // swallow
            }
        };
        if (lead) loadStatusHistory();
    }, [lead?.id, leadId]);

    // Helper: is the current user a banker?
    const isBankerUser = (): boolean => {
        const roles: any[] = currentUser?.roles || [];
        return roles.some((r: any) => r.code === 'bankers-mosko0d4');
    };

    // 5. Load remarks for display
    useEffect(() => {
        const loadRemarks = async () => {
            if (!lead) return;
            const numericId = resolveNumericId();
            if (!numericId) return;
            try {
                const row = await fetchRemarkRow(numericId);
                if (row) {
                    const advisorArr = row.advisor_admin_staff_remark;
                    setRemarks(Array.isArray(advisorArr) ? advisorArr : []);
                    const bankerArr = row.banker_admin_staff_remark;
                    setBankerRemarks(Array.isArray(bankerArr) ? bankerArr : []);
                } else {
                    setRemarks([]);
                    setBankerRemarks([]);
                }
            } catch (e) {
                // swallow
            }
        };
        loadRemarks();
    }, [lead?.id, leadId]);

    const handleUpdateStatus = async () => {
        if (!status) return;
        setIsUpdating(true);
        try {
            const roleName =
                Array.isArray(currentUser?.roles) && currentUser.roles.length > 0
                    ? currentUser.roles[0].name
                    : 'Admin';
            const authorName = currentUser
                ? `${currentUser.firstname} ${currentUser.lastname || ''}`.trim()
                : 'System';
            const cleanStatus = status.trim();

            // 1. Update lead status
            const statusRes = await fetch(`/api/leads/${lead.documentId || leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { leadStatus: cleanStatus } }),
            });
            if (!statusRes.ok) {
                console.error('[Remarks] Status update failed');
                return;
            }

            // 2. Upsert remark row — append to both JSON arrays in a single call
            if (newRemark.trim() || newBankerRemark.trim()) {
                const numericId = resolveNumericId();
                const baseEntry = {
                    author: authorName,
                    role: roleName,
                    timestamp: new Date().toISOString(),
                    lead_id: numericId,
                };

                const existingRow = await fetchRemarkRow(numericId!);
                const payload: Record<string, any> = { leadId: numericId };

                let updatedAdvisorArr: any[] | null = null;
                let updatedBankerArr: any[] | null = null;

                if (newRemark.trim()) {
                    const existingArr = existingRow ? (existingRow.advisor_admin_staff_remark ?? []) : [];
                    updatedAdvisorArr = [...(Array.isArray(existingArr) ? existingArr : []), { ...baseEntry, message: newRemark.trim() }];
                    payload.advisor_admin_staff_remark = updatedAdvisorArr;
                }

                if (newBankerRemark.trim()) {
                    const existingArr = existingRow ? (existingRow.banker_admin_staff_remark ?? []) : [];
                    updatedBankerArr = [...(Array.isArray(existingArr) ? existingArr : []), { ...baseEntry, message: newBankerRemark.trim() }];
                    payload.banker_admin_staff_remark = updatedBankerArr;
                }

                if (existingRow) {
                    const rowDocId = existingRow.documentId || String(existingRow.id);
                    await fetch(`/api/lead-remarks/${rowDocId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: payload }),
                    });
                } else {
                    await fetch('/api/lead-remarks', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: payload }),
                    });
                }

                if (updatedAdvisorArr) setRemarks(updatedAdvisorArr);
                if (updatedBankerArr) setBankerRemarks(updatedBankerArr);
            }

            // Optimistically append to status history for immediate display
            const oldStatus = lead?.leadStatus || '';
            if (oldStatus !== cleanStatus) {
                setStatusHistory((prev) => [
                    ...prev,
                    {
                        metadata: { leadId: resolveNumericId(), oldStatus, newStatus: cleanStatus },
                        createdAt: new Date().toISOString(),
                        _optimistic: true,
                    },
                ]);
            }

            setNewRemark('');
            setNewBankerRemark('');
            setLead((prev: any) => ({ ...prev, leadStatus: cleanStatus }));
        } catch (err: any) {
            // swallow
        } finally {
            setIsUpdating(false);
        }
    };


    const handleSaveParentAdvisorId = async () => {
        setIsSavingParentId(true);
        try {
            const leadDocId = lead?.documentId || leadId;
            const leadRes = await fetch(`/api/leads/${leadDocId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: {
                        parentAdvisorId: parentAdvisorIdVal,
                    },
                }),
            });
            if (leadRes.ok) {
                setLead((prev: any) => ({
                    ...prev,
                    parentAdvisorId: parentAdvisorIdVal,
                }));
            }

            if (loanApp?.documentId || loanApp?.id) {
                const loanDocId = loanApp.documentId || String(loanApp.id);
                const loanRes = await fetch(`/api/loan-applications/${loanDocId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        data: {
                            assignedStaffId: selectedStaffId ?? null,
                            assignedBankerId: selectedBankerId ?? null,
                        },
                    }),
                });
                if (loanRes.ok) {
                    setLoanApp((prev: any) => ({
                        ...prev,
                        assignedStaffId: selectedStaffId,
                        assignedBankerId: selectedBankerId,
                    }));
                }
            }
        } catch (e) {
            // swallow
        } finally {
            setIsSavingParentId(false);
        }
    };

    const handleSaveLeadField = async (key: string, value: string) => {
        try {
            const res = await fetch(`/api/leads/${lead?.documentId || leadId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { [key]: value } }),
            });
            if (res.ok) setLead((prev: any) => ({ ...prev, [key]: value }));
        } catch (e) {}
    };

    const handleSaveLoanFormData = async (section: string, fieldKey: string, value: string) => {
        if (!loanApp) return;
        try {
            const updatedFormData = {
                ...loanApp.form_data,
                [section]: { ...(loanApp.form_data?.[section] || {}), [fieldKey]: value },
            };
            const loanDocId = loanApp.documentId || String(loanApp.id);
            const res = await fetch(`/api/loan-applications/${loanDocId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { form_data: updatedFormData } }),
            });
            if (res.ok) setLoanApp((prev: any) => ({ ...prev, form_data: updatedFormData }));
        } catch (e) {}
    };

    const handleSaveRunningLoan = async (index: number, field: string, value: string) => {
        if (!loanApp) return;
        try {
            const runningLoans = [...(loanApp.form_data?.otherDetails?.runningLoans || [])];
            runningLoans[index] = { ...runningLoans[index], [field]: value };
            const updatedFormData = {
                ...loanApp.form_data,
                otherDetails: { ...(loanApp.form_data?.otherDetails || {}), runningLoans },
            };
            const loanDocId = loanApp.documentId || String(loanApp.id);
            const res = await fetch(`/api/loan-applications/${loanDocId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { form_data: updatedFormData } }),
            });
            if (res.ok) setLoanApp((prev: any) => ({ ...prev, form_data: updatedFormData }));
        } catch (e) {}
    };

    const handleSaveDocPassword = async (docKey: string, password: string) => {
        if (!loanApp) return;
        try {
            const updatedFormData = {
                ...loanApp.form_data,
                pdfPasswords: { ...(loanApp.form_data?.pdfPasswords || {}), [docKey]: password },
            };
            const loanDocId = loanApp.documentId || String(loanApp.id);
            const res = await fetch(`/api/loan-applications/${loanDocId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { form_data: updatedFormData } }),
            });
            if (res.ok) setLoanApp((prev: any) => ({ ...prev, form_data: updatedFormData }));
        } catch (e) {}
    };

    const handleSaveDocDate = async (fileId: string | number, date: string) => {
        if (!loanApp) return;
        try {
            const updatedFormData = {
                ...loanApp.form_data,
                docDates: { ...(loanApp.form_data?.docDates || {}), [String(fileId)]: date },
            };
            const loanDocId = loanApp.documentId || String(loanApp.id);
            const res = await fetch(`/api/loan-applications/${loanDocId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { form_data: updatedFormData } }),
            });
            if (res.ok) setLoanApp((prev: any) => ({ ...prev, form_data: updatedFormData }));
        } catch (e) {}
    };

    const handleSaveDocFormat = async (fileId: string | number, format: string) => {
        if (!loanApp) return;
        try {
            const updatedFormData = {
                ...loanApp.form_data,
                docFormats: { ...(loanApp.form_data?.docFormats || {}), [String(fileId)]: format.toUpperCase() },
            };
            const loanDocId = loanApp.documentId || String(loanApp.id);
            const res = await fetch(`/api/loan-applications/${loanDocId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { form_data: updatedFormData } }),
            });
            if (res.ok) setLoanApp((prev: any) => ({ ...prev, form_data: updatedFormData }));
        } catch (e) {}
    };

    const refetchLoanApp = async () => {
        if (!lead) return;
        try {
            const numericLId = lead.leadId || lead.id;
            const res = await fetch(`/api/loan-applications?filters[leadId][$eq]=${numericLId}&populate=*`);
            if (res.ok) {
                const data = await res.json();
                const items = data.data || [];
                if (items.length > 0) {
                    const found = items[0].attributes || items[0];
                    setLoanApp({ ...found, id: items[0].id });
                }
            }
        } catch (e) {}
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
        newBankerRemark,
        setNewBankerRemark,
        isUpdating,
        currentUser,
        errorLogs,
        handleUpdateStatus,
        parentAdvisorIdVal,
        setParentAdvisorIdVal,
        isSavingParentId,
        handleSaveParentAdvisorId,
        parentAdvisor,
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
        handleSaveDocDate,
        handleSaveDocFormat,
        refetchLoanApp,
    };
};
