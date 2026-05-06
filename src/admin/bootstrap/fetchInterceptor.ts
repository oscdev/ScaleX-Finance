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
            (window as any)._strapi_last_token = token;
        }
        // ------------------------------

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

                const customDefaultSequence = [
                    'id',
                    'fullName',
                    'mobileNumber',
                    'email',
                    'selectedProduct',
                    'requiredAmount',
                    'advisorReferralId',
                    'updatedAt',
                    'createdAt',
                    'leadStatus',
                ];

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
