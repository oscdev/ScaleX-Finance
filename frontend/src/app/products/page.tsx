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

async function getStaffProductNames(staffId: string): Promise<string[]> {
    try {
        const res = await fetch(
            strapiInternalApi(`/api/staff-product-mappings?filters[adminUserId][$eq]=${staffId}&pagination[pageSize]=100`),
            { cache: 'no-store' }
        );
        if (!res.ok) return [];
        const json = await res.json();
        const results: any[] = json.data || [];
        return results.map((r: any) => r.attributes?.product || r.product).filter(Boolean);
    } catch {
        return [];
    }
}

export default async function Products(props: { searchParams: Promise<{ staffId?: string }> }) {
    const searchParams = await props.searchParams;
    const staffId = searchParams?.staffId;

    const products = await getProductsData();
    const productPageResponse = await getProductPageData();

    let filteredProducts = products || [];
    if (staffId) {
        const mappedNames = await getStaffProductNames(staffId);
        if (mappedNames.length > 0) {
            filteredProducts = filteredProducts.filter((p: any) => {
                const title = p.attributes?.title || p.title || '';
                return mappedNames.some(
                    (name) => name.trim().toLowerCase() === title.trim().toLowerCase()
                );
            });
        }
    }

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
            <section className="hero-section hero-section-products">
                <div className="container animate-fade-in">
                    <h1 className="hero-title hero-title-products">{heroTitle}</h1>
                    <p className="hero-subtitle delay-100">{heroSubtitle}</p>
                </div>
            </section>

            <ProductSelection products={filteredProducts} buttonConfig={buttonConfig} />
        </>
    );
}
