export const installFetchInterceptor = () => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url || '';
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
                                     leadCT.metadatas[f].list.visible = true; // Auto-select it
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
