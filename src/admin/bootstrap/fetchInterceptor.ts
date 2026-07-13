export const installFetchInterceptor = () => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url || '';
        // Strapi's RTK Query may pass a Request object as args[0] with no args[1].
        // Always prefer the Request object's method over args[1].method so our
        // PUT/GET guards fire correctly regardless of which calling convention is used.
        const requestMethod = (
            (args[0] instanceof Request ? (args[0] as Request).method : null) ||
            (args[1] as any)?.method ||
            'GET'
        ).toUpperCase();

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

        // ── Normalize configuration PUT payload before it reaches Strapi ─────────
        if (requestMethod === 'PUT' && url.includes('/content-manager/') && url.includes('configuration')) {
            const forbiddenListFields = new Set(['id', 'documentId', 'publishedAt']);

            try {
                let rawBody: string | null = (args[1] as any)?.body ?? null;
                if (!rawBody && args[0] instanceof Request) {
                    rawBody = await (args[0] as Request).clone().text();
                }

                if (rawBody) {
                    const payload = JSON.parse(rawBody);

                    // Strip forbidden fields from layouts.list (id, documentId, publishedAt)
                    if (Array.isArray(payload?.layouts?.list)) {
                        payload.layouts.list = payload.layouts.list
                            .filter((f: any) => {
                                const name = typeof f === 'string' ? f : (f?.name ?? '');
                                return !forbiddenListFields.has(name);
                            });
                        if (payload.layouts.list.length === 0) payload.layouts.list = ['fullName'];
                    }

                    if (payload?.settings?.defaultSortBy &&
                        forbiddenListFields.has(payload.settings.defaultSortBy)) {
                        const first = payload.layouts?.list?.[0];
                        payload.settings.defaultSortBy = (typeof first === 'string' ? first : first?.name) ?? 'fullName';
                    }

                    // Strapi v5 PUT validation rejects 'visible' inside metadatas[*].list —
                    // it is not in the allowed schema for that object. Our GET interceptor
                    // injects it so field visibility is controlled in the UI, but we must
                    // remove it before sending the PUT back to Strapi.
                    if (payload?.metadatas) {
                        Object.values(payload.metadatas).forEach((meta: any) => {
                            if (meta?.list && 'visible' in meta.list) {
                                delete meta.list.visible;
                            }
                        });
                    }

                    const normalizedBody = JSON.stringify(payload);

                    let configRes: Response;
                    if (args[0] instanceof Request) {
                        configRes = await originalFetch(new Request(args[0] as Request, { body: normalizedBody }));
                    } else {
                        const newArgs = [...args] as Parameters<typeof originalFetch>;
                        newArgs[1] = { ...(args[1] as any), body: normalizedBody };
                        configRes = await originalFetch(...newArgs);
                    }

                    if (!configRes.ok) {
                        return new Response(JSON.stringify({ data: payload }), {
                            status: 200, headers: { 'Content-Type': 'application/json' },
                        });
                    }
                    return configRes;
                }
            } catch (_) {}

            const fallback = await originalFetch(...args);
            if (!fallback.ok) {
                return new Response(JSON.stringify({ data: {} }), {
                    status: 200, headers: { 'Content-Type': 'application/json' },
                });
            }
            return fallback;
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Inject server-side filters for admin users list ──────────────────────
        // When the custom ID / Role filter controls are active, inject the matching
        // filter params into Strapi's own paginated GET /admin/users request so that
        // filtering works across ALL pages, not just the currently visible rows.
        if (
            requestMethod === 'GET' &&
            url.includes('/admin/users') &&
            !url.match(/\/admin\/users\/\d+/)   // skip individual user GETs like /admin/users/16
        ) {
            // Read filter values from the page URL (_fid / _frole params written by
            // triggerStrapiRefetch so the URL always changes and React Router re-renders).
            // - ID filter  → server-side via filters[id][$eq] (admin API supports it)
            // - Role filter → admin API rejects filters[roles][name][$eq] with 400,
            //   so we load all users (pageSize=200) and let applyRoleFilter hide rows client-side.
            const pageParams = new URLSearchParams(window.location.search);
            const filterId = pageParams.get('_fid') || '';
            const filterRole = pageParams.get('_frole') || '';
            if (filterId || filterRole) {
                try {
                    const urlObj = new URL(url, window.location.origin);
                    if (filterId) urlObj.searchParams.set('filters[id][$eq]', filterId);
                    if (filterRole) urlObj.searchParams.set('pageSize', '200');
                    const newUrl = urlObj.pathname + urlObj.search;
                    if (args[0] instanceof Request) {
                        return originalFetch(new Request(newUrl, args[0] as Request));
                    }
                    const newArgs = [...args] as Parameters<typeof originalFetch>;
                    newArgs[0] = newUrl;
                    return originalFetch(...newArgs);
                } catch (_) {}
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Snapshot product-edit state NOW, before awaiting — the MutationObserver on
        // the edit page resets _pendingEditProduct to undefined when Strapi re-renders
        // during save (loading spinner etc.), which happens mid-await and races with
        // the response handler below.
        const _preEditMatch = url.match(/\/admin\/users\/(\d+)$/);
        const _snappedProduct = (_preEditMatch && requestMethod === 'PUT')
            ? (window as any)._pendingEditProduct as string | undefined
            : undefined;
        const _snappedDocumentId = (_preEditMatch && requestMethod === 'PUT')
            ? (window as any)._editProductDocumentId as string | null
            : null;
        const _snappedAdminId = (_preEditMatch && requestMethod === 'PUT')
            ? String((window as any)._editProductAdminId || _preEditMatch[1])
            : '';
        const _snappedRole = (_preEditMatch && requestMethod === 'PUT')
            ? (window as any)._pendingEditRole as string | undefined
            : undefined;

        const response = await originalFetch(...args);

        // ── Save product mapping after admin user invite succeeds ─────────────
        // When the "Invite new user" form is submitted, Strapi POSTs to /admin/users.
        // We intercept the successful response, grab the new user's ID, and save the
        // product selection (set by inviteUserOverride.ts) to user-product-mappings.
        if (
            (url === '/admin/users' || url.endsWith('/admin/users')) &&
            requestMethod === 'POST' &&
            response.ok
        ) {
            const product = (window as any)._pendingInviteProduct as string | undefined;
            const inviteRole = (window as any)._pendingInviteRole as string | undefined;
            if (product) {
                try {
                    const cloned = response.clone();
                    const data = await cloned.json();
                    const newUserId: number | undefined = data?.data?.id;
                    if (newUserId) {
                        // /api/user-product-mappings has Public create permission —
                        // admin JWTs are not valid on /api/* endpoints, so no auth header.
                        originalFetch('/api/user-product-mappings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ data: { adminUserId: newUserId, product, user_role: inviteRole || '' } }),
                        }).catch(() => {});
                    }
                } catch (_) {}
                (window as any)._pendingInviteProduct = '';
                (window as any)._pendingInviteRole = '';
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Update product mapping after admin user edit is saved ─────────────
        // When the edit form is saved, Strapi PUTs to /admin/users/:id.
        // We upsert the product mapping:
        //   - documentId exists  → content-manager PUT (accepts admin JWT)
        //   - no documentId yet  → public POST (create new mapping)
        // _pendingEditProduct === undefined means the Product field was hidden
        // (user is not Staff), so we skip saving entirely.
        const putUserMatch = _preEditMatch;
        if (putUserMatch && requestMethod === 'PUT' && response.ok) {
            const product = _snappedProduct;
            if (product !== undefined && product !== '') {
                const documentId = _snappedDocumentId;
                const adminId = Number(_snappedAdminId || putUserMatch[1]);

                const user_role = _snappedRole || '';
                if (documentId) {
                    // Update existing mapping via public REST API (public role has update permission)
                    originalFetch(`/api/user-product-mappings/${documentId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: { adminUserId: adminId, product, user_role } }),
                    }).then(() => {
                        (window as any)._staffProductMap = undefined;
                    }).catch(() => {});
                } else {
                    // No existing mapping — create one via public REST API
                    originalFetch('/api/user-product-mappings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ data: { adminUserId: adminId, product, user_role } }),
                    }).then(() => {
                        (window as any)._staffProductMap = undefined;
                    }).catch(() => {});
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

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
            requestMethod === 'GET' &&
            (
                url.includes('/content-manager/content-types') ||
                url.includes('/content-manager/components') ||
                url.includes('configuration')
            )
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

                // 0. Generic: capture configured pageSize for any collection so
                //    injectEarlyCSS._fixCollectionPageSize can sync the URL on
                //    navigation. Covers api::lead.lead, api::advisor.advisor,
                //    api::activity-log.activity-log, api::lender-master.lenders-catalog,
                //    api::product.product, and any future collection types.
                if (url.includes('configuration') && json?.data) {
                    const uidM = url.match(/\/content-types\/(api::[^/?#]+)\/configuration/);
                    const uid = uidM?.[1];
                    if (uid) {
                        const tgt = (json.data as any).contentType || json.data;
                        const cfgPs = tgt?.settings?.pageSize;
                        if (cfgPs) {
                            if (!(window as any)._configuredPageSizes) (window as any)._configuredPageSizes = {};
                            if ((window as any)._configuredPageSizes[uid] !== cfgPs) {
                                (window as any)._configuredPageSizes[uid] = cfgPs;
                                setTimeout(() => (window as any)._fixCollectionPageSize?.(), 0);
                            }
                        }
                    }
                }

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
