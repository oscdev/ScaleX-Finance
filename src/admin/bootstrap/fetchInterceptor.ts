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
            getemailnotification: 'NOTIFICATIONS',
            remarks: 'REMARKS',
            locale: 'LOCALE',
            documentid: 'DOC ID',
        };

        if (
            url.includes('/content-manager/content-types') ||
            url.includes('api::lead.lead/configuration')
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

                if (
                    url.includes('api::lead.lead/configuration') &&
                    json?.data?.contentType?.layouts?.list
                ) {
                    const currentList = json.data.contentType.layouts.list;
                    if (currentList.length <= 5) {
                        json.data.contentType.layouts.list = customDefaultSequence;
                        modified = true;
                    }
                }

                if (url.includes('/content-manager/content-types') && json?.data) {
                    const data = Array.isArray(json.data) ? json.data : [json.data];
                    const leadCT = data.find((ct: any) => ct.uid === 'api::lead.lead');

                    if (leadCT) {
                        if (leadCT.layouts && leadCT.layouts.list) {
                            leadCT.layouts.list = customDefaultSequence.filter(
                                (f) => f !== 'publishedAt' && f !== 'locale'
                            );
                            modified = true;
                        }

                        if (leadCT.metadatas) {
                            Object.keys(leadCT.metadatas).forEach((field) => {
                                const cleanKey = field.toLowerCase();

                                if (field === 'publishedAt' || field === 'locale') {
                                    if (!leadCT.metadatas[field].list) leadCT.metadatas[field].list = {};
                                    leadCT.metadatas[field].list.visible = false;
                                    modified = true;
                                    return;
                                }

                                if (labelMap[cleanKey]) {
                                    if (!leadCT.metadatas[field].list) leadCT.metadatas[field].list = {};
                                    leadCT.metadatas[field].list.label = labelMap[cleanKey];

                                    if (!leadCT.metadatas[field].edit) leadCT.metadatas[field].edit = {};
                                    leadCT.metadatas[field].edit.label = labelMap[cleanKey];
                                    modified = true;
                                }
                            });
                        }
                    }
                }

                if (url.includes('/content-manager/content-types/api::lead.lead/configuration')) {
                    if (json?.data) {
                        const conf = json.data;
                        if (conf.layouts && conf.layouts.list) {
                            conf.layouts.list = customDefaultSequence.filter(
                                (f) => f !== 'publishedAt' && f !== 'locale'
                            );
                            modified = true;
                        }
                        if (conf.metadatas) {
                            ['publishedAt', 'locale'].forEach((ghost) => {
                                if (conf.metadatas[ghost]) {
                                    if (!conf.metadatas[ghost].list) conf.metadatas[ghost].list = {};
                                    conf.metadatas[ghost].list.visible = false;
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
