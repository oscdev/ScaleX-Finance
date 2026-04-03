import React from 'react';
export const dynamic = 'force-dynamic';
import LeadForm from './LeadForm';

import { strapiInternalApi } from '@/lib/strapi';

async function getLeadFormPageData() {
    try {
        const res = await fetch(strapiInternalApi('/api/lead-form-page?populate=*'), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error("Failed to fetch lead-form-page data");
            return null;
        }

        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error:", error);
        return null;
    }
}

export default async function LeadFormPage() {
    const pageResponse = await getLeadFormPageData();

    // Handle Strapi v4 vs v5 attributes wrapper
    let pageInfo: any = {};
    if (pageResponse) {
        pageInfo = pageResponse.attributes || pageResponse;
    }

    return (
        <div style={{ paddingTop: '5rem' }}>
            <LeadForm pageInfo={pageInfo} />
        </div>
    );
}
