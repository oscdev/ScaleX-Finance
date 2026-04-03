import React from 'react';
export const dynamic = 'force-dynamic';
import { strapiInternalApi, withStrapiPublicUrl } from '@/lib/strapi';
import './AboutUs.css';

async function getAboutUsPageData() {
    try {
        const res = await fetch(strapiInternalApi(`/api/about-us-page?populate=*&timestamp=${Date.now()}`), {
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            // console.error("Failed to fetch about-us-page data");
            return null;
        }

        const json = await res.json();
        return json.data;
    } catch (error) {
        // console.error("Fetch error about-us-page:", error);
        return null;
    }
}

function parseBlocks(richtext: any) {
    if (!richtext) return null;
    if (typeof richtext === 'string') {
        return <div dangerouslySetInnerHTML={{ __html: richtext }} />;
    }
    return <pre>{JSON.stringify(richtext, null, 2)}</pre>;
}

export default async function AboutUsPage() {
    const pageResponse = await getAboutUsPageData();

    // Handle Strapi mapping
    let pageInfo: any = {};
    if (pageResponse) {
        // Handle Strapi v4 (attributes) and v5 (flat)
        pageInfo = pageResponse.attributes || pageResponse;
    }

    const heroTitle = pageInfo.heroTitle || 'ScaleX Finance';
    const heroSubtitle = pageInfo.heroSubtitle || 'Innovation. Transparency. Growth.';
    const missionTitle = pageInfo.missionTitle || 'Our Mission';
    const missionContent = pageInfo.missionContent || 'To empower financial advisors with modern tools.';
    const visionTitle = pageInfo.visionTitle || 'Our Vision';
    const visionContent = pageInfo.visionContent || 'To create a world where every business has access to fair credit.';

    let bannerUrl = null;
    const bannerObj = pageInfo.heroBanner?.data?.attributes || pageInfo.heroBanner;
    if (bannerObj?.url) {
        bannerUrl = withStrapiPublicUrl(bannerObj.url);
    }

    return (
        <main className="about-us-main">
            {/* Hero Section */}
            <section className="about-us-hero">
                <div className="container animate-fade-in text-center">
                    <h1 className="about-us-title">
                        {heroTitle}
                    </h1>
                    <p className="about-us-subtitle">
                        {heroSubtitle}
                    </p>
                </div>

                {/* Decorative Elements */}
                <div className="about-us-blob"></div>
            </section>

            {/* Mission & Vision Cards */}
            <section className="mv-section">
                <div className="container">
                    <div className="mv-grid">
                        <div className="card mv-card animate-fade-in delay-100">
                            <div className="mv-icon">🎯</div>
                            <h3 className="mv-title" style={{ color: 'var(--primary)' }}>{missionTitle}</h3>
                            <p className="mv-content">{missionContent}</p>
                        </div>

                        <div className="card mv-card animate-fade-in delay-200">
                            <div className="mv-icon">🔭</div>
                            <h3 className="mv-title" style={{ color: 'var(--secondary)' }}>{visionTitle}</h3>
                            <p className="mv-content">{visionContent}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Section */}
            <section className="content-section">
                <div className="container">
                    <div className="content-container">
                        {bannerUrl && (
                            <img
                                src={bannerUrl}
                                alt="About Us Banner"
                                className="about-us-banner"
                            />
                        )}

                        <div className="rich-text about-us-rich-text animate-fade-in delay-300">
                            {pageInfo.content ? parseBlocks(pageInfo.content) : (
                                <p className="content-placeholder">
                                    Main content will appear here once published in Strapi.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
