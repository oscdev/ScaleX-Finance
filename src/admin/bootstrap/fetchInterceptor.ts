export const installFetchInterceptor = () => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url || '';
        
        // --- Token Capture Strategy ---
        const options = args[1] || {};
        const headers = options.headers || {};
        let token = '';
        if (headers instanceof Headers) {
            token = headers.get('Authorization') || '';
        } else if (typeof headers === 'object') {
            token = (headers as any)['Authorization'] || (headers as any)['authorization'] || '';
        }
        if (token && token.startsWith('Bearer ')) {
            const prevToken = (window as any)._strapi_last_token;
            (window as any)._strapi_last_token = token;
            // A changed token means a new user just logged in. Re-sync session role
            // state so stale data from a previous login is cleared and the correct
            // role/assignment data is set before the next leads fetch runs.
            if (token !== prevToken) {
                (window as any)._syncSessionRole?.();
                // Reset caches so the new user's role gets a fresh prefetch
                (window as any)._advisors_loaded = false;
                (window as any).advisorMap = {};
                (window as any)._assignedLeadIds = null; // invalidate staff/banker lead ID cache
            }
        }
        // ------------------------------

        // ── Role-scoped lead filtering ────────────────────────────────────────
        // Inject row-level filters for the leads list based on who is logged in:
        //   advisor → advisorReferralId OR parentAdvisorId match (direct lead fields)
        //   staff   → two-step: look up loan_applications.assignedStaffId = adminUserId,
        //              collect the leadId values, then filter leads by id IN [...]
        //   banker  → same two-step via loan_applications.assignedBankerId
        //   admin   → no filter (sees all)
        // Guard flags prevent re-entry when the interceptor itself fires sub-fetches.
        if (
            url.includes('/content-manager/collection-types/api::lead.lead') &&
            !url.includes('configuration') &&
            !url.includes('_leads_filtered=1')   // our own re-fetch marker
        ) {
            const roleReady: Promise<void> = (window as any)._sessionRoleReady ?? Promise.resolve();
            await Promise.race([roleReady, new Promise<void>(r => setTimeout(r, 5000))]);

            const role = sessionStorage.getItem('strapiUserRole') || 'admin';
            const sep = url.includes('?') ? '&' : '?';

            if (role === 'advisor') {
                const advisorId = sessionStorage.getItem('strapiAdvisorId');
                const advisorCode = sessionStorage.getItem('strapiAdvisorCode');
                if (advisorId) {
                    let filteredUrl = url + sep +
                        `filters[$or][0][advisorReferralId][$eq]=${encodeURIComponent(advisorId)}`;
                    if (advisorCode) {
                        filteredUrl += `&filters[$or][1][parentAdvisorId][$eq]=${encodeURIComponent(advisorCode)}`;
                    }
                    filteredUrl += '&_leads_filtered=1';
                    const newArgs = [...args] as Parameters<typeof originalFetch>;
                    newArgs[0] = filteredUrl;
                    return originalFetch(...newArgs);
                }

            } else if (role === 'staff' || role === 'banker') {
                const adminUserId = sessionStorage.getItem('strapiAdminUserId');
                if (adminUserId) {
                    const filterKey = role === 'staff' ? 'assignedStaffId' : 'assignedBankerId';

                    // ── Step 1: resolve assigned leadIds (cached per session) ──────
                    let leadIds: number[] = (window as any)._assignedLeadIds;
                    if (leadIds == null) {
                        try {
                            const loanRes = await originalFetch(
                                `/api/loan-applications?filters[${filterKey}][$eq]=${adminUserId}&fields[0]=leadId&pagination[pageSize]=500`
                            );
                            if (loanRes.ok) {
                                const loanData = await loanRes.json();
                                const items: any[] = loanData.data || [];
                                leadIds = items
                                    .map((item: any) => Number((item.attributes || item).leadId))
                                    .filter((id) => !isNaN(id) && id > 0);
                            } else {
                                leadIds = [];
                            }
                        } catch {
                            leadIds = [];
                        }
                        (window as any)._assignedLeadIds = leadIds;
                    }

                    // ── Step 2: filter leads list by the resolved IDs ─────────────
                    if (leadIds.length === 0) {
                        // No assigned leads — return an empty CM-format response
                        return new Response(
                            JSON.stringify({ results: [], pagination: { total: 0, page: 1, pageSize: 10, pageCount: 0 } }),
                            { status: 200, headers: { 'Content-Type': 'application/json' } }
                        );
                    }

                    const idFilter = leadIds
                        .map((id, idx) => `filters[id][$in][${idx}]=${id}`)
                        .join('&');
                    const filteredUrl = url + sep + idFilter + '&_leads_filtered=1';
                    const newArgs = [...args] as Parameters<typeof originalFetch>;
                    newArgs[0] = filteredUrl;
                    return originalFetch(...newArgs);
                }
            }
            // admin: fall through with no filter
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Staff / Banker loan-application filtering ─────────────────────────
        // Staff only see loan apps where assignedStaffId = their admin user ID.
        // Bankers only see loan apps where assignedBankerId = their admin user ID.
        // Admin sees all — no filter injected.
        if (
            url.includes('/content-manager/collection-types/api::loan-application.loan-application') &&
            !url.includes('configuration') &&
            !url.includes('filters[assignedStaffId]') &&
            !url.includes('filters[assignedBankerId]') &&
            !url.includes('filters[leadId]') &&
            !url.includes('filters[id]')
        ) {
            const roleReady: Promise<void> = (window as any)._sessionRoleReady ?? Promise.resolve();
            await Promise.race([roleReady, new Promise<void>(r => setTimeout(r, 5000))]);

            const role = sessionStorage.getItem('strapiUserRole');
            const adminUserId = sessionStorage.getItem('strapiAdminUserId');

            if (adminUserId && (role === 'staff' || role === 'banker')) {
                const filterKey = role === 'staff' ? 'assignedStaffId' : 'assignedBankerId';
                const sep = url.includes('?') ? '&' : '?';
                const filteredUrl = url + sep + `filters[${filterKey}][$eq]=${encodeURIComponent(adminUserId)}`;
                const newArgs = [...args] as Parameters<typeof originalFetch>;
                newArgs[0] = filteredUrl;
                return originalFetch(...newArgs);
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        const response = await originalFetch(...args);

        const labelMap: Record<string, string> = {
            id: 'ID',
            fullname: 'CUSTOMER INFO',
            selectedproduct: 'PRODUCT',
            requiredamount: 'AMOUNT',
            advisorreferralid: 'ADVISOR',
            createdAt: 'ADDED',
            updatedAt: 'UPDATED',
            leadstatus: 'STATUS',
            mobilenumber: 'MOBILE',
            email: 'EMAIL',
            pancard: 'PAN CARD',
            aadharcard: 'AADHAR CARD',
            propertytype: 'PROPERTY TYPE',
            propertystatus: 'PROPERTY STATUS',
            propertyvalue: 'PROPERTY VALUE',
            employmenttype: 'EMPLOYMENT TYPE',
            leadtype: 'LEAD TYPE',
            pincode: 'PIN CODE',
            getemailnotification: 'EMAIL NOTIFICATIONS',
            getEmailNotification: 'EMAIL NOTIFICATIONS',
            remarks: 'REMARKS',
            locale: 'LOCALE',
            documentid: 'DOC ID',
        };

        const advisorLabelMap: Record<string, string> = {
            advisorid: 'ADVISOR CODE',
            createdat: 'JOINING DATE',
            fullname: 'ADVISOR NAME',
            phonenumber: 'MOBILE',
            email: 'EMAIL',
            emailverified: 'EMAIL VERIFY STATUS',
            earnings: 'EARNINGS',
            advisorstatus: 'ADVISOR STATUS',
            password: 'PASSWORD',
            state: 'STATE',
            district: 'DISTRICT',
            pincode: 'PIN CODE',
            license: 'LICENSE',
            pannumber: 'PAN NUMBER',
            bankaccountnumber: 'BANK ACCOUNT',
            ifsccode: 'IFSC CODE',
            bankname: 'BANK NAME',
            specialization: 'SPECIALIZATION',
        };

        const advisorSequence = [
            'advisorId',
            'createdAt',
            'fullName',
            'phoneNumber',
            'email',
            'emailVerified',
            'earnings',
            'advisorStatus',
        ];

        if (
            url.includes('/content-manager/content-types') ||
            url.includes('/content-manager/components') ||
            url.includes('configuration')
        ) {
            const clonedResponse = response.clone();
            try {
                const json = await clonedResponse.json();

                // Admin sees the ADVISOR column; all other roles do not.
                const _role = sessionStorage.getItem('strapiUserRole') || 'admin';
                const customDefaultSequence = _role === 'admin'
                    ? ['id', 'fullName', 'mobileNumber', 'email', 'selectedProduct', 'requiredAmount', 'advisorReferralId', 'updatedAt', 'createdAt', 'leadStatus']
                    : ['id', 'fullName', 'mobileNumber', 'email', 'selectedProduct', 'requiredAmount', 'updatedAt', 'createdAt', 'leadStatus'];

                let modified = false;

                // 1. Intercept the standard configuration endpoint
                if (url.includes('configuration') && url.includes('api::lead.lead')) {
                    if (json?.data) {
                        const target = json.data.contentType || json.data;
                        if (target.layouts && target.layouts.list) {
                            target.layouts.list = customDefaultSequence;
                            modified = true;
                        }
                        if (target.metadatas) {
                            Object.keys(target.metadatas).forEach(f => {
                                const cleanKey = f.toLowerCase();
                                if (labelMap[cleanKey]) {
                                    if (!target.metadatas[f].list) target.metadatas[f].list = { visible: true };
                                    target.metadatas[f].list.label = labelMap[cleanKey];
                                    
                                    if (!target.metadatas[f].edit) target.metadatas[f].edit = { label: labelMap[cleanKey] };
                                    target.metadatas[f].edit.label = labelMap[cleanKey];
                                    modified = true;
                                }
                            });
                             // Force visibility for our mandatory sequence specifically
                             customDefaultSequence.forEach(f => {
                                 if (target.metadatas[f]) {
                                     if (!target.metadatas[f].list) target.metadatas[f].list = {};
                                     target.metadatas[f].list.visible = true;
                                     modified = true;
                                 }
                             });
                             // Force hide Locale if it exists
                             if (target.metadatas.locale && target.metadatas.locale.list) {
                                 target.metadatas.locale.list.visible = false;
                                 modified = true;
                             }
                        }
                    }
                }

                // 2. Intercept the broad content-types listing (used for setting selection defaults)
                if (url.includes('/content-manager/content-types') && json?.data) {
                    const data = Array.isArray(json.data) ? json.data : [json.data];
                    const leadCT = data.find((ct: any) => ct.uid === 'api::lead.lead');

                    if (leadCT) {
                        if (leadCT.layouts && leadCT.layouts.list) {
                            leadCT.layouts.list = customDefaultSequence;
                            modified = true;
                        }
                        if (leadCT.metadatas) {
                             customDefaultSequence.forEach(f => {
                                 if (leadCT.metadatas[f]) {
                                     if (!leadCT.metadatas[f].list) leadCT.metadatas[f].list = {};
                                     leadCT.metadatas[f].list.visible = true;
                                     const cleanKey = f.toLowerCase();
                                     if (labelMap[cleanKey]) {
                                         leadCT.metadatas[f].list.label = labelMap[cleanKey];
                                     }
                                     modified = true;
                                 }
                             });
                             if (leadCT.metadatas.locale) leadCT.metadatas.locale.list.visible = false;
                        }
                    }

                    // Advisor content type
                    const advisorCT = data.find((ct: any) => ct.uid === 'api::advisor.advisor');
                    if (advisorCT) {
                        if (advisorCT.layouts && advisorCT.layouts.list) {
                            advisorCT.layouts.list = advisorSequence;
                            modified = true;
                        }
                        if (advisorCT.metadatas) {
                            advisorSequence.forEach(f => {
                                if (advisorCT.metadatas[f]) {
                                    if (!advisorCT.metadatas[f].list) advisorCT.metadatas[f].list = {};
                                    advisorCT.metadatas[f].list.visible = true;
                                    const cleanKey = f.toLowerCase();
                                    if (advisorLabelMap[cleanKey]) {
                                        advisorCT.metadatas[f].list.label = advisorLabelMap[cleanKey];
                                    }
                                    modified = true;
                                }
                            });
                        }
                    }
                }

                // 3. Intercept advisor configuration endpoint
                if (url.includes('configuration') && url.includes('api::advisor.advisor')) {
                    if (json?.data) {
                        const target = json.data.contentType || json.data;
                        if (target.layouts && target.layouts.list) {
                            target.layouts.list = advisorSequence;
                            modified = true;
                        }
                        if (target.metadatas) {
                            Object.keys(target.metadatas).forEach(f => {
                                const cleanKey = f.toLowerCase();
                                if (advisorLabelMap[cleanKey]) {
                                    if (!target.metadatas[f].list) target.metadatas[f].list = { visible: true };
                                    target.metadatas[f].list.label = advisorLabelMap[cleanKey];
                                    if (!target.metadatas[f].edit) target.metadatas[f].edit = {};
                                    target.metadatas[f].edit.label = advisorLabelMap[cleanKey];
                                    modified = true;
                                }
                            });
                            advisorSequence.forEach(f => {
                                if (target.metadatas[f]) {
                                    if (!target.metadatas[f].list) target.metadatas[f].list = {};
                                    target.metadatas[f].list.visible = true;
                                    modified = true;
                                }
                            });
                        }
                    }
                }

                if (modified) {
                    return new Response(JSON.stringify(json), {
                        status: 200,
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
            } catch (e) {}
        }
        return response;
    };
};
