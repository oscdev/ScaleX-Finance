import React from 'react';
export const dynamic = 'force-dynamic';
import ProductSelection from './ProductSelection';
import { strapiInternalApi } from '@/lib/strapi';

async function getProductsData() {
    try {
        const res = await fetch(strapiInternalApi('/api/products?populate=*'), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error("Failed to fetch products data");
            return null;
        }

        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error:", error);
        return null;
    }
}

async function getProductPageData() {
    try {
        const res = await fetch(strapiInternalApi('/api/product-page?populate=*'), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error("Failed to fetch product-page data");
            return null;
        }

        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error:", error);
        return null;
    }
}

export default async function Products() {
    const products = await getProductsData();
    const productPageResponse = await getProductPageData();

    // With Strapi v5, sometimes data comes directly or under attributes
    let pageInfo: any = {};
    if (productPageResponse) {
        pageInfo = productPageResponse.attributes || productPageResponse;
    }

    const heroTitle = pageInfo.heroTitle || 'Our Products';
    const heroSubtitle = pageInfo.heroSubtitle || 'Explore the intelligent tools driving ScaleX Finance.';

    const buttonConfig = {
        backLabel: pageInfo.backButtonLabel || 'Back',
        backLink: pageInfo.backButtonLink || '/',
        continueLabel: pageInfo.continueButtonLabel || 'Continue',
        continueLink: pageInfo.continueButtonLink || '/lead-form'
    };

    return (
        <>
            <section className="hero-section" style={{ padding: '6rem 0 4rem 0' }}>
                <div className="container animate-fade-in">
                    <h1 className="hero-title" style={{ fontSize: '3rem' }}>{heroTitle}</h1>
                    <p className="hero-subtitle delay-100">{heroSubtitle}</p>
                </div>
            </section>

            <ProductSelection products={products || []} buttonConfig={buttonConfig} />
        </>
    );
}
