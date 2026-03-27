import React from 'react';
export const dynamic = 'force-dynamic';
import AdvisorForm from './AdvisorForm';
import { strapiInternalApi } from '@/lib/strapi';

async function getAdvisorPageData() {
    try {
        const res = await fetch(strapiInternalApi('/api/advisor-registration-page?populate=*'), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error("Failed to fetch advisor-registration-page data");
            return null;
        }

        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error:", error);
        return null;
    }
}

export default async function AdvisorRegistrationPage() {
    const pageResponse = await getAdvisorPageData();

    // Handle Strapi v4 vs v5 attributes wrapper
    let pageInfo: any = {};
    if (pageResponse) {
        pageInfo = pageResponse.attributes || pageResponse;
    }

    return (
        <AdvisorForm pageInfo={pageInfo} />
    );
}
