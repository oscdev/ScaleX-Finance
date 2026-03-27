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

    const heroTitle = pageInfo.heroTitle || 'Apply for a Loan';
    const heroSubtitle = pageInfo.heroSubtitle || 'Please fill out the details below to proceed.';

    return (
        <>
            <section className="hero-section" style={{ padding: '6rem 0 4rem 0' }}>
                <div className="container animate-fade-in">
                    <h1 className="hero-title" style={{ fontSize: '3rem' }}>{heroTitle}</h1>
                    <p className="hero-subtitle delay-100">{heroSubtitle}</p>
                </div>
            </section>

            <LeadForm pageInfo={pageInfo} />
        </>
    );
}
